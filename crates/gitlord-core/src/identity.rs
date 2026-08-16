// SPDX-License-Identifier: GPL-3.0-or-later

//! Who commits: `user.name` and `user.email`.
//!
//! Reading is a `gix` question — git's configuration cascade, resolved the way
//! git resolves it. Writing goes through the `git` binary, because `.git/config`
//! and `~/.gitconfig` are state the whole ecosystem reads; see the header of
//! [`crate::shell`] for the rule this is an application of.
//!
//! **The scope is always a parameter, never inferred.** Writing to the wrong one
//! is a quiet mistake: a repository-local identity that silently became global
//! is the kind of thing found months later, on somebody else's commits. So both
//! values report which file they came from, and every write names where it goes.

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};
use crate::shell;

/// A configuration file GitLord will write to.
///
/// The two `git config` offers a person by name. System configuration and
/// worktree configuration are readable — see [`Origin`] — but not writable
/// here: one belongs to whoever administers the machine, and the other is a
/// per-worktree override this screen does not ask about.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Scope {
    /// `~/.gitconfig` — the identity used everywhere it is not overridden.
    Global,
    /// `.git/config` — this repository only.
    Local,
}

impl Scope {
    /// The flag `git config` takes for this scope.
    pub fn flag(self) -> &'static str {
        match self {
            Scope::Global => "--global",
            Scope::Local => "--local",
        }
    }
}

/// Which of the identity keys is being read or written.
///
/// An enum rather than a string: this screen edits the two keys it names and
/// nothing else, and a closed set is what makes that true rather than promised.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Key {
    Name,
    Email,
}

impl Key {
    pub fn key(self) -> &'static str {
        match self {
            Key::Name => "user.name",
            Key::Email => "user.email",
        }
    }
}

/// Where the value git would actually use comes from.
///
/// Wider than [`Scope`], because a value can come from somewhere GitLord will
/// not write. Saying "system" out loud is the point: it explains why editing the
/// global field did not change the effective value.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Origin {
    /// Nothing sets it anywhere. Committing will fail until something does.
    Unset,
    /// `/etc/gitconfig` or the file shipped with the git installation.
    System,
    /// `~/.gitconfig` or `~/.config/git/config`.
    Global,
    /// `.git/config`, or this worktree's own configuration.
    Local,
    /// `GIT_CONFIG_*`, `-c` on a command line, or a value gix set itself.
    Environment,
}

/// One identity key, as it stands.
///
/// `effective` is what git would use, and `origin` says which file that came
/// from. `global` and `local` are what each writable scope holds, so the screen
/// can show a repository override next to the global value it hides rather than
/// making the user guess which one they are editing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Value {
    pub effective: Option<String>,
    pub origin: Origin,
    pub global: Option<String>,
    pub local: Option<String>,
}

/// The identity, per key and per scope.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Identity {
    pub name: Value,
    pub email: Value,
    /// False when no repository is open. The local scope is then neither
    /// readable nor writable, and the screen offers the global one alone.
    pub repository: bool,
}

/// Read the identity from a repository's full configuration cascade.
pub fn read(repo: &gix::Repository) -> Identity {
    let snapshot = repo.config_snapshot();
    build(snapshot.plumbing(), true)
}

/// Read the identity with no repository open: system, global and environment.
///
/// Settings does not need an open repository, so this is the ordinary path when
/// GitLord starts with no repository chosen. A configuration that cannot be
/// parsed is reported rather than swallowed — an identity GitLord cannot read
/// is one it must not offer to overwrite.
pub fn read_global() -> Result<Identity> {
    let globals =
        gix::config::File::from_globals().map_err(|error| Error::Config(error.to_string()))?;
    Ok(build(&globals, false))
}

/// Write one key in one scope, or unset it when `value` is blank.
///
/// `dir` is where `git` is run: a repository for [`Scope::Local`], and any
/// directory at all for [`Scope::Global`], which writes to the user's home
/// regardless of where it was invoked.
///
/// Blank clears rather than writes. An empty `user.email` is a *configured*
/// empty email, which git will happily commit with; an unset one falls back to
/// the next scope, which is what a cleared field means. Surrounding whitespace
/// is trimmed because git strips it on the way back out — storing it would make
/// the value that was saved differ from the value that is read.
pub fn write(dir: &Path, scope: Scope, key: Key, value: &str) -> Result<()> {
    let value = value.trim();
    if value.is_empty() {
        shell::unset_config(dir, scope.flag(), key.key())
    } else {
        shell::set_config(dir, scope.flag(), key.key(), value)
    }
}

/// Fold a configuration file into the two values the screen shows.
fn build(config: &gix::config::File, repository: bool) -> Identity {
    Identity {
        name: value_of(config, Key::Name),
        email: value_of(config, Key::Email),
        repository,
    }
}

/// Resolve one key the way git does: every occurrence, last one wins.
///
/// `values_with_sections` yields in order of occurrence, and the cascade is
/// assembled in ascending precedence — so walking it and keeping the last of
/// each thing is the same rule `git config --get` applies.
fn value_of(config: &gix::config::File, key: Key) -> Value {
    let mut value = Value {
        effective: None,
        origin: Origin::Unset,
        global: None,
        local: None,
    };

    let Ok(occurrences) = config.values_with_sections::<gix::bstr::BString>(key.key()) else {
        return value;
    };

    for (raw, section) in occurrences {
        let text = raw.to_string();
        let source = section.meta().source;

        match writable(source) {
            Some(Scope::Global) => value.global = Some(text.clone()),
            Some(Scope::Local) => value.local = Some(text.clone()),
            None => {}
        }

        value.origin = origin(source);
        value.effective = Some(text);
    }

    value
}

/// The scope GitLord would write this source's value to, if it writes there at
/// all.
///
/// A worktree's own configuration counts as local: it is inside the repository,
/// and `git config --local` is what an ordinary repository override is. System
/// and environment sources have no scope here — GitLord does not write either.
fn writable(source: gix::config::Source) -> Option<Scope> {
    use gix::config::Source::*;
    match source {
        Local | Worktree => Some(Scope::Local),
        User | Git => Some(Scope::Global),
        GitInstallation | System | Env | EnvOverride | Cli | Api => None,
    }
}

fn origin(source: gix::config::Source) -> Origin {
    use gix::config::Source::*;
    match source {
        Local | Worktree => Origin::Local,
        User | Git => Origin::Global,
        GitInstallation | System => Origin::System,
        Env | EnvOverride | Cli | Api => Origin::Environment,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    /// A configuration file with a chosen source, so that the cascade can be
    /// assembled in a test without a real `~/.gitconfig` anywhere near it.
    fn layer(source: gix::config::Source, text: &str) -> gix::config::File {
        let mut bytes = text.as_bytes().to_vec();
        gix::config::File::from_bytes_owned(
            &mut bytes,
            gix::config::file::Metadata::from(source),
            Default::default(),
        )
        .expect("a parsable configuration layer")
    }

    /// The layers merged in ascending precedence, the way git assembles them.
    fn cascade(layers: Vec<gix::config::File>) -> gix::config::File {
        let mut merged = gix::config::File::default();
        for layer in layers {
            merged.append(layer).expect("appending a layer");
        }
        merged
    }

    const ADA: &str = "[user]\n\tname = Ada Lovelace\n\temail = ada@example.com\n";

    #[test]
    fn an_identity_set_nowhere_is_unset_rather_than_blank() {
        let identity = build(&cascade(vec![]), false);

        assert_eq!(identity.name.effective, None);
        assert_eq!(identity.name.origin, Origin::Unset);
        assert_eq!(identity.email.origin, Origin::Unset);
        assert!(!identity.repository);
    }

    #[test]
    fn a_global_identity_is_reported_as_global() {
        let identity = build(&cascade(vec![layer(gix::config::Source::User, ADA)]), false);

        assert_eq!(identity.name.effective.as_deref(), Some("Ada Lovelace"));
        assert_eq!(identity.name.origin, Origin::Global);
        assert_eq!(identity.name.global.as_deref(), Some("Ada Lovelace"));
        assert_eq!(identity.name.local, None);
        assert_eq!(identity.email.effective.as_deref(), Some("ada@example.com"));
    }

    #[test]
    fn a_repository_override_wins_and_the_global_value_is_still_reported() {
        // The whole reason both scopes are shown: someone who has set a work
        // address on one repository needs to see that it is what will be
        // committed with, *and* what it is overriding.
        let identity = build(
            &cascade(vec![
                layer(gix::config::Source::User, ADA),
                layer(
                    gix::config::Source::Local,
                    "[user]\n\temail = ada@work.example\n",
                ),
            ]),
            true,
        );

        assert_eq!(
            identity.email.effective.as_deref(),
            Some("ada@work.example")
        );
        assert_eq!(identity.email.origin, Origin::Local);
        assert_eq!(identity.email.local.as_deref(), Some("ada@work.example"));
        assert_eq!(identity.email.global.as_deref(), Some("ada@example.com"));

        // The name was not overridden, so it is still the global one.
        assert_eq!(identity.name.origin, Origin::Global);
        assert_eq!(identity.name.local, None);
    }

    #[test]
    fn a_system_identity_is_named_as_system_rather_than_as_a_scope_we_write() {
        // Editing the global field would not change this value, and a screen
        // that said "global" here would be lying about why.
        let identity = build(
            &cascade(vec![layer(gix::config::Source::System, ADA)]),
            false,
        );

        assert_eq!(identity.name.origin, Origin::System);
        assert_eq!(identity.name.global, None);
        assert_eq!(identity.name.local, None);
        assert_eq!(identity.name.effective.as_deref(), Some("Ada Lovelace"));
    }

    #[test]
    fn an_identity_from_the_environment_says_so() {
        let identity = build(&cascade(vec![layer(gix::config::Source::Env, ADA)]), false);

        assert_eq!(identity.name.origin, Origin::Environment);
        assert_eq!(identity.name.global, None);
    }

    #[test]
    fn the_last_occurrence_in_one_file_wins_the_way_git_config_get_does() {
        let identity = build(
            &cascade(vec![layer(
                gix::config::Source::Local,
                "[user]\n\tname = First\n[user]\n\tname = Second\n",
            )]),
            true,
        );

        assert_eq!(identity.name.effective.as_deref(), Some("Second"));
        assert_eq!(identity.name.local.as_deref(), Some("Second"));
    }

    #[test]
    fn each_scope_maps_to_the_flag_git_config_takes() {
        assert_eq!(Scope::Global.flag(), "--global");
        assert_eq!(Scope::Local.flag(), "--local");
        assert_eq!(Key::Name.key(), "user.name");
        assert_eq!(Key::Email.key(), "user.email");
    }

    #[test]
    fn reading_a_repository_agrees_with_git_config() {
        let fixture = Fixture::woven();
        let identity = read(&fixture.open());

        assert_eq!(
            identity.name.effective.as_deref(),
            Some(fixture.git(&["config", "user.name"]).trim())
        );
        assert_eq!(
            identity.email.effective.as_deref(),
            Some(fixture.git(&["config", "user.email"]).trim())
        );
        assert!(identity.repository);
    }

    #[test]
    fn writing_locally_produces_what_git_config_local_would() {
        let fixture = Fixture::woven();

        write(fixture.path(), Scope::Local, Key::Name, "Grace Hopper").expect("writing a name");

        assert_eq!(
            fixture.git(&["config", "--local", "user.name"]).trim(),
            "Grace Hopper"
        );
        assert_eq!(
            read(&fixture.open()).name.local.as_deref(),
            Some("Grace Hopper")
        );
    }

    #[test]
    fn clearing_a_value_unsets_the_key_rather_than_writing_an_empty_string() {
        // An empty `user.email` is a configured empty email, which git will
        // commit with. Unsetting it falls back to the next scope, which is what
        // clearing a field means.
        let fixture = Fixture::woven();

        write(fixture.path(), Scope::Local, Key::Email, "   ").expect("clearing an email");

        let config = std::fs::read_to_string(fixture.path().join(".git/config")).expect("config");
        assert!(
            !config.contains("email"),
            "the key is gone, not blank: {config}"
        );
        assert_eq!(read(&fixture.open()).email.local, None);
    }

    #[test]
    fn clearing_something_that_was_never_set_is_not_an_error() {
        let fixture = Fixture::empty();
        fixture.git(&["config", "--unset", "user.name"]);

        write(fixture.path(), Scope::Local, Key::Name, "").expect("clearing an absent key");
    }

    #[test]
    fn surrounding_whitespace_is_trimmed_so_what_is_read_back_is_what_was_saved() {
        let fixture = Fixture::woven();

        write(fixture.path(), Scope::Local, Key::Name, "  Grace Hopper  ").expect("writing a name");

        assert_eq!(
            fixture.git(&["config", "--local", "user.name"]).trim(),
            "Grace Hopper"
        );
    }

    #[test]
    fn a_write_touches_only_the_scope_it_was_given() {
        // The quiet mistake this whole module is shaped around: a
        // repository-local identity that silently became a global one.
        let fixture = Fixture::woven();
        let before = std::fs::read_to_string(fixture.path().join(".git/config")).expect("config");

        write(
            fixture.path(),
            Scope::Local,
            Key::Email,
            "grace@example.com",
        )
        .expect("writing");

        let after = std::fs::read_to_string(fixture.path().join(".git/config")).expect("config");
        assert_ne!(before, after, "the local file is the one that changed");
        assert_eq!(
            fixture.git(&["config", "--local", "user.email"]).trim(),
            "grace@example.com"
        );
    }
}
