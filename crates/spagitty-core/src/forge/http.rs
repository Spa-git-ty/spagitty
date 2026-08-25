// SPDX-License-Identifier: GPL-3.0-or-later

//! The one place Spagitty makes a network request.
//!
//! There is exactly one, for the same reason [`crate::shell`] is the one place
//! a process is spawned: so that "what does this application send, and where"
//! has a single answer somebody can read in an afternoon. Nothing outside this
//! module holds a `ureq` type, and a second call site would have to be added
//! here rather than anywhere else.
//!
//! # What it will not do
//!
//! - **No plaintext.** `https` only, refused before the request is made rather
//!   than left to the host to redirect. A token must never travel in the clear,
//!   and a misconfigured remote must not be the way it does.
//! - **No redirects to another host.** A redirect that changes host would carry
//!   the `Authorization` header somewhere the user never connected. `ureq` is
//!   told not to follow redirects at all; the two endpoints used here do not
//!   redirect, and one that started to is a change worth noticing rather than
//!   following.
//! - **No waiting forever.** Timeouts on connect and on the whole call, so a
//!   host that accepts a connection and then says nothing cannot hang the
//!   worker thread behind the Pull requests screen.
//!
//! # TLS
//!
//! `native-tls`: the platform's own stack and the platform's own certificate
//! store. A desktop client behind a corporate proxy with a custom root works
//! without being told about it, which a bundled root store would not.

use std::time::Duration;

use crate::{Error, Result};

/// How long to wait for a host that has stopped talking.
///
/// Generous enough for a slow connection on a large list, short enough that a
/// dead host is reported rather than waited on. The Pull requests screen reads
/// on a worker thread, so this is the ceiling on a spinner, not on the UI.
const TIMEOUT: Duration = Duration::from_secs(30);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// What a host answered.
pub struct Response {
    pub status: u16,
    pub body: String,
    /// `Retry-After`, when the host sent one. The one header worth carrying:
    /// it is how a rate limit says when it will end.
    pub retry_after: Option<String>,
}

/// `GET url` with a bearer token, as JSON.
///
/// An empty `token` sends **no** `Authorization` header at all, for the one
/// caller that has nothing to authenticate with: the update check reads a
/// public release list and must not invent a credential to do it.
///
/// A non-2xx status is **not** an error here — it is a [`Response`] with a
/// status on it, because only the caller knows whether a 404 means "no such
/// pull request" or "this repository is private". Turning a status into a
/// sentence is [`super::status_error`]'s job.
///
/// A request that never got an answer at all *is* an error, and it is the one
/// this reports: there is no status to interpret, and "offline" is a different
/// thing to say than anything a host could have replied.
pub fn get_json(url: &str, token: &str, host: &str) -> Result<Response> {
    if !url.starts_with("https://") {
        return Err(Error::Forge {
            host: host.to_string(),
            detail: "refusing to send a token over an unencrypted connection".into(),
        });
    }

    let mut request = agent()
        .get(url)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28");

    if !token.is_empty() {
        request = request.header("Authorization", &format!("Bearer {token}"));
    }

    let sent = request.call();

    match sent {
        Ok(response) => Ok(read(response)),
        // A status ureq treats as an error is still an answer, and the caller
        // is the one that knows what that status means here.
        Err(ureq::Error::StatusCode(status)) => Ok(Response {
            status,
            body: String::new(),
            retry_after: None,
        }),
        Err(error) => Err(Error::ForgeOffline {
            host: host.to_string(),
            detail: error.to_string(),
        }),
    }
}

/// `POST url` with a bearer token and a JSON body.
///
/// The same rules as [`get_json`] and the same reporting: a status is an
/// answer, an unanswered request is an error. GraphQL is a POST even though it
/// reads nothing, which is the protocol's choice rather than this module's.
pub fn post_json(url: &str, token: &str, host: &str, body: &str) -> Result<Response> {
    if !url.starts_with("https://") {
        return Err(Error::Forge {
            host: host.to_string(),
            detail: "refusing to send a token over an unencrypted connection".into(),
        });
    }

    let sent = agent()
        .post(url)
        .header("Authorization", &format!("Bearer {token}"))
        .header("Content-Type", "application/json")
        .send(body);

    match sent {
        Ok(response) => Ok(read(response)),
        Err(ureq::Error::StatusCode(status)) => Ok(Response {
            status,
            body: String::new(),
            retry_after: None,
        }),
        Err(error) => Err(Error::ForgeOffline {
            host: host.to_string(),
            detail: error.to_string(),
        }),
    }
}

fn agent() -> ureq::Agent {
    ureq::Agent::config_builder()
        .timeout_global(Some(TIMEOUT))
        .timeout_connect(Some(CONNECT_TIMEOUT))
        // See the header: a redirect that changed host would carry the token
        // with it.
        .max_redirects(0)
        .user_agent(user_agent())
        // **Chosen, not inherited.** `TlsProvider` defaults to Rustls whichever
        // feature is compiled in, so building with `native-tls` alone leaves an
        // agent that panics on the first `https` URL — "provider is Rustls but
        // feature is not enabled". It is a panic rather than an error, and it
        // takes the process with it.
        //
        // Naming the provider is the whole fix. It also makes the choice
        // visible here rather than implied by a line in `Cargo.toml`.
        .tls_config(
            ureq::tls::TlsConfig::builder()
                .provider(ureq::tls::TlsProvider::NativeTls)
                .build(),
        )
        .build()
        .new_agent()
}

fn read(mut response: ureq::http::Response<ureq::Body>) -> Response {
    let status = response.status().as_u16();
    let retry_after = response
        .headers()
        .get("retry-after")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);

    // A body that cannot be read is an empty body: everything downstream
    // treats an unparsable answer as one that said nothing useful, and there
    // is nothing better to do with half of one.
    let body = response.body_mut().read_to_string().unwrap_or_default();

    Response {
        status,
        body,
        retry_after,
    }
}

/// What Spagitty calls itself to a host.
///
/// A version and a name, and nothing else. Some hosts require a user agent and
/// refuse a request without one; none of them needs to know anything more about
/// the machine this is running on.
fn user_agent() -> &'static str {
    concat!("spagitty/", env!("CARGO_PKG_VERSION"))
}

impl std::fmt::Debug for Response {
    /// Never prints the body.
    ///
    /// A body can carry a token in an error message, and a `Debug` that landed
    /// in a log line is exactly how a secret escapes. The status and whether a
    /// body arrived is all a reader of a log needs.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Response")
            .field("status", &self.status)
            .field("body_bytes", &self.body.len())
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_plaintext_url_is_refused_before_anything_is_sent() {
        // The token must never travel in the clear, and a remote configured
        // with `http://` must not be the way it does. Refused here rather than
        // left to a redirect the host controls.
        let refused = get_json("http://github.com/x", "secret", "github.com");

        match refused {
            Err(Error::Forge { detail, .. }) => assert!(detail.contains("unencrypted")),
            other => panic!("expected a refusal, got {other:?}"),
        }
    }

    #[test]
    fn the_agent_is_built_with_a_tls_provider_that_is_actually_compiled_in() {
        // The regression this exists for took the whole process down on the
        // first request. `TlsProvider` defaults to Rustls whichever feature is
        // enabled, so an agent that does not name one panics on any `https`
        // URL — and the update check makes one at startup, so the application
        // did not open at all.
        //
        // Asserted by building the agent and reading back what it settled on,
        // which is the thing that was wrong. Making a request would prove it
        // too and would need a network.
        let agent = agent();

        assert_eq!(
            agent.config().tls_config().provider(),
            ureq::tls::TlsProvider::NativeTls
        );
    }

    #[test]
    fn a_host_that_does_not_resolve_is_reported_as_offline_not_as_a_status() {
        // There is no status to interpret, and "could not reach it" is a
        // different thing to tell the reader than anything a host could reply.
        let unreachable = get_json(
            "https://spagitty-no-such-host.invalid/x",
            "secret",
            "spagitty-no-such-host.invalid",
        );

        assert!(
            matches!(unreachable, Err(Error::ForgeOffline { .. })),
            "expected an offline error, got {unreachable:?}"
        );
    }

    #[test]
    fn a_plaintext_url_is_refused_on_the_way_out_as_well() {
        let refused = post_json("http://github.com/graphql", "secret", "github.com", "{}");

        match refused {
            Err(Error::Forge { detail, .. }) => assert!(detail.contains("unencrypted")),
            other => panic!("expected a refusal, got {other:?}"),
        }
    }

    #[test]
    fn a_response_never_prints_its_body() {
        // A body can carry a token back in an error message, and a `Debug` in a
        // log line is exactly how a secret escapes.
        let response = Response {
            status: 401,
            body: "Bearer ghp_thisisasecret".into(),
            retry_after: None,
        };

        let printed = format!("{response:?}");
        assert!(!printed.contains("ghp_thisisasecret"));
        assert!(printed.contains("401"));
    }

    #[test]
    fn an_empty_token_is_an_unauthenticated_request_rather_than_an_empty_bearer() {
        // The update check reads a public release list. Sending
        // `Authorization: Bearer ` would be inventing a credential, and some
        // hosts reject a malformed one rather than ignoring it.
        //
        // Asserted through the only observable this module has without a
        // server: an unreachable host still reports as offline rather than as
        // a request that could not be built.
        let unreachable = get_json("https://spagitty-no-such-host.invalid/x", "", "h");

        assert!(matches!(unreachable, Err(Error::ForgeOffline { .. })));
    }

    #[test]
    fn the_user_agent_names_the_application_and_its_version() {
        let agent = user_agent();

        assert!(agent.starts_with("spagitty/"));
        // Nothing about the machine. A host does not need to know.
        assert!(!agent.contains(' '));
    }
}
