// SPDX-License-Identifier: GPL-3.0-or-later

//! The remotes a repository knows about (FEAT-049).
//!
//! Fetch, push and pull have worked against existing remotes since FEAT-018.
//! Adding, renaming or removing one meant a terminal — which is a strange gap
//! in a client whose whole premise is that the common operations are on screen.
//!
//! # Reading is `gix`, writing is `git`
//!
//! The same split as everywhere else, and here it has teeth: a remote is
//! configuration, and `git remote add` does more than write two lines of
//! `.git/config`. It sets up the fetch refspec, and `git remote rename` and
//! `remove` move the refs under `refs/remotes/` and rewrite the upstream of
//! every branch that tracked it. Writing the config ourselves would leave a
//! repository that looked right and behaved wrongly.

use serde::Serialize;

use crate::error::Result;
use crate::refs::Host;

/// One configured remote.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Remote {
    pub name: String,
    /// Where it is fetched from.
    pub url: String,
    /// Where it is pushed to, when that is configured separately.
    ///
    /// `None` is the ordinary case and means "the same as `url`". Kept apart
    /// rather than filled in, because a repository with a `pushurl` is one
    /// where the difference matters to whoever set it.
    pub push_url: Option<String>,
    /// Which forge the URL points at, for the same glyph the graph's chips use.
    pub host: Host,
    /// How many refs under `refs/remotes/<name>/` this remote has.
    ///
    /// The one number that says whether a remote has ever been fetched, which
    /// is what distinguishes "added a moment ago" from "gone stale".
    pub refs: usize,
}

/// Every configured remote, in name order.
///
/// Name order rather than config order: config order is an implementation
/// detail of how the file was edited, and a list that reorders itself when
/// somebody runs `git remote add` is a list nobody can scan.
pub fn remotes(repo: &gix::Repository) -> Vec<Remote> {
    let snapshot = repo.config_snapshot();
    let counts = ref_counts(repo);

    let mut remotes: Vec<Remote> = repo
        .remote_names()
        .into_iter()
        .map(|name| {
            let name = name.to_string();
            let url = snapshot
                .string(format!("remote.{name}.url").as_str())
                .map(|value| value.to_string())
                .unwrap_or_default();
            let push_url = snapshot
                .string(format!("remote.{name}.pushurl").as_str())
                .map(|value| value.to_string());

            Remote {
                host: Host::from_url(&url),
                refs: counts.get(&name).copied().unwrap_or(0),
                name,
                url,
                push_url,
            }
        })
        .collect();

    remotes.sort_by(|a, b| a.name.cmp(&b.name));
    remotes
}

/// How many refs each remote has under `refs/remotes/`.
fn ref_counts(repo: &gix::Repository) -> std::collections::HashMap<String, usize> {
    let mut counts = std::collections::HashMap::new();

    let Ok(platform) = repo.references() else {
        return counts;
    };
    let Ok(iter) = platform.prefixed("refs/remotes/") else {
        return counts;
    };

    for reference in iter.flatten() {
        let full = reference.name().as_bstr().to_string();
        // `refs/remotes/origin/main` — the remote is the first segment after
        // the prefix, and a remote name cannot contain a slash.
        if let Some(rest) = full.strip_prefix("refs/remotes/") {
            if let Some((name, _)) = rest.split_once('/') {
                *counts.entry(name.to_string()).or_insert(0) += 1;
            }
        }
    }

    counts
}

/// Add a remote. Nothing is fetched: this only writes the configuration.
pub fn add(repo: &gix::Repository, name: &str, url: &str) -> Result<()> {
    crate::shell::remote_add(crate::repo::workdir(repo)?, name, url)
}

/// Rename a remote, and everything that points at it.
///
/// `git remote rename` moves the refs under `refs/remotes/` and rewrites the
/// upstream of every branch that tracked the old name, which is the whole
/// reason this is not a config edit.
pub fn rename(repo: &gix::Repository, from: &str, to: &str) -> Result<()> {
    crate::shell::remote_rename(crate::repo::workdir(repo)?, from, to)
}

/// Remove a remote, its remote-tracking refs, and the upstreams pointing at it.
pub fn remove(repo: &gix::Repository, name: &str) -> Result<()> {
    crate::shell::remote_remove(crate::repo::workdir(repo)?, name)
}

/// Change where a remote points.
pub fn set_url(repo: &gix::Repository, name: &str, url: &str) -> Result<()> {
    crate::shell::remote_set_url(crate::repo::workdir(repo)?, name, url)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    /// A repository with two remotes configured, neither of them fetched.
    fn with_remotes() -> Fixture {
        let fixture = Fixture::woven();
        fixture.git(&[
            "remote",
            "add",
            "origin",
            "https://github.com/maxmya/spagitty.git",
        ]);
        fixture.git(&[
            "remote",
            "add",
            "backup",
            "git@gitlab.com:maxmya/spagitty.git",
        ]);
        fixture
    }

    #[test]
    fn a_repository_with_no_remotes_reports_none() {
        assert!(remotes(&Fixture::woven().open()).is_empty());
    }

    #[test]
    fn every_configured_remote_is_listed_with_its_url() {
        let fixture = with_remotes();

        let found = remotes(&fixture.open());

        assert_eq!(found.len(), 2);
        assert_eq!(found[0].name, "backup");
        assert_eq!(found[1].url, "https://github.com/maxmya/spagitty.git");
    }

    #[test]
    fn they_come_back_in_name_order_rather_than_config_order() {
        // `backup` was added second. A list that reorders itself as the config
        // file is edited is one nobody can scan.
        let fixture = with_remotes();

        let names: Vec<String> = remotes(&fixture.open())
            .into_iter()
            .map(|remote| remote.name)
            .collect();

        assert_eq!(names, vec!["backup", "origin"]);
    }

    #[test]
    fn the_host_is_read_from_the_url() {
        let fixture = with_remotes();
        let found = remotes(&fixture.open());

        assert_eq!(found[0].host, Host::GitLab);
        assert_eq!(found[1].host, Host::GitHub);
    }

    #[test]
    fn a_remote_that_has_never_been_fetched_has_no_refs() {
        // What tells "added a moment ago" from "gone stale".
        let fixture = with_remotes();

        assert!(remotes(&fixture.open())
            .iter()
            .all(|remote| remote.refs == 0));
    }

    #[test]
    fn refs_are_counted_per_remote() {
        let fixture = with_remotes();
        let head = fixture.head();
        fixture.git(&["update-ref", "refs/remotes/origin/main", &head]);
        fixture.git(&["update-ref", "refs/remotes/origin/other", &head]);

        let found = remotes(&fixture.open());

        assert_eq!(found[0].refs, 0, "backup has none");
        assert_eq!(found[1].refs, 2, "origin has two");
    }

    #[test]
    fn a_push_url_is_reported_only_when_it_is_configured() {
        let fixture = with_remotes();
        fixture.git(&[
            "remote",
            "set-url",
            "--push",
            "origin",
            "git@github.com:maxmya/spagitty.git",
        ]);

        let found = remotes(&fixture.open());

        assert!(found[0].push_url.is_none(), "backup has none");
        assert_eq!(
            found[1].push_url.as_deref(),
            Some("git@github.com:maxmya/spagitty.git")
        );
    }

    #[test]
    fn adding_a_remote_configures_it_and_fetches_nothing() {
        let fixture = Fixture::woven();

        add(&fixture.open(), "origin", "https://example.com/repo.git").expect("add");

        let found = remotes(&fixture.open());
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].url, "https://example.com/repo.git");
        assert_eq!(found[0].refs, 0);
        // The fetch refspec is what makes it a remote rather than two lines of
        // config, and it is why this goes through `git`.
        assert!(fixture
            .git(&["config", "--get", "remote.origin.fetch"])
            .contains("refs/remotes/origin/"));
    }

    #[test]
    fn renaming_a_remote_moves_its_refs_with_it() {
        let fixture = with_remotes();
        let head = fixture.head();
        fixture.git(&["update-ref", "refs/remotes/origin/main", &head]);

        rename(&fixture.open(), "origin", "upstream").expect("rename");

        let found = remotes(&fixture.open());
        assert!(found.iter().any(|remote| remote.name == "upstream"));
        assert!(!found.iter().any(|remote| remote.name == "origin"));
        assert!(fixture
            .git(&["show-ref", "refs/remotes/upstream/main"])
            .contains("upstream/main"));
    }

    #[test]
    fn removing_a_remote_takes_its_tracking_refs_with_it() {
        let fixture = with_remotes();
        let head = fixture.head();
        fixture.git(&["update-ref", "refs/remotes/origin/main", &head]);

        remove(&fixture.open(), "origin").expect("remove");

        let found = remotes(&fixture.open());
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].name, "backup");
        assert!(fixture
            .git(&["for-each-ref", "refs/remotes/origin"])
            .is_empty());
    }

    #[test]
    fn a_url_can_be_changed_without_touching_anything_else() {
        let fixture = with_remotes();

        set_url(&fixture.open(), "origin", "https://example.com/moved.git").expect("set-url");

        let found = remotes(&fixture.open());
        assert_eq!(found[1].url, "https://example.com/moved.git");
        assert_eq!(found[1].name, "origin");
    }
}
