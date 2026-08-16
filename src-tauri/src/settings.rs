// SPDX-License-Identifier: GPL-3.0-or-later

//! GitLord's own preferences.
//!
//! Application state rather than repository state, so it lives here beside
//! [`crate::recents`] rather than in `gitlord-core`: none of it is a fact about
//! a repository, and none of it belongs in `.git/config` where every other tool
//! would read it.
//!
//! The identity — `user.name` and `user.email` — is deliberately *not* here. It
//! is git's own configuration, every tool reads it, and it is handled by
//! `gitlord_core::identity` through `git config`.
//!
//! A hand-edited file must not stop the application starting, so anything that
//! does not parse reads as the defaults. That is the same treatment the
//! repository list gets, for the same reason.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const FILE: &str = "settings.json";

/// The behaviour toggles on the Settings screen.
///
/// Every field is optional on the way in and written in full on the way out, so
/// a settings file from an older build gains new keys at their defaults instead
/// of being rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// Sign commits with the configured GPG or SSH program.
    pub sign_commits: bool,
    /// Ask before anything that rewrites history.
    pub confirm_history_rewrite: bool,
    /// Show the `git` command behind each action.
    pub show_git_commands: bool,
}

impl Default for Settings {
    /// Off, except the one that asks first.
    ///
    /// A confirmation defaults to on because the cost of asking is a click and
    /// the cost of not asking is a rewritten history. The other two change what
    /// the application does rather than what it checks, and a preference the
    /// user did not set should not do that.
    fn default() -> Self {
        Settings {
            sign_commits: false,
            confirm_history_rewrite: true,
            show_git_commands: false,
        }
    }
}

/// The stored settings, or the defaults.
pub fn load(app: &AppHandle) -> Settings {
    let Some(path) = file(app) else {
        return Settings::default();
    };
    let Ok(text) = std::fs::read_to_string(path) else {
        return Settings::default();
    };
    parse(&text)
}

/// Write the settings, reporting whether they reached the disk.
///
/// A failed write is worth saying out loud here, unlike the repository list: a
/// toggle that silently did not persist looks exactly like one that did until
/// the next restart.
pub fn save(app: &AppHandle, settings: Settings) -> Result<(), String> {
    let path =
        file(app).ok_or_else(|| "there is no configuration directory to write to".to_string())?;

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let text = serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
    std::fs::write(path, text).map_err(|error| error.to_string())
}

/// Anything that is not a settings object reads as the defaults, and a partial
/// object keeps the keys it does carry.
fn parse(text: &str) -> Settings {
    serde_json::from_str(text).unwrap_or_default()
}

fn file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|dir| dir.join(FILE))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_missing_file_reads_as_the_defaults() {
        // The file does not exist until something is toggled, which is the
        // ordinary case rather than an error.
        assert_eq!(parse(""), Settings::default());
    }

    #[test]
    fn asking_before_a_history_rewrite_is_on_by_default() {
        // The cost of asking is a click. The cost of not asking is a rewritten
        // history, so this is the one that defaults to on.
        assert!(Settings::default().confirm_history_rewrite);
        assert!(!Settings::default().sign_commits);
        assert!(!Settings::default().show_git_commands);
    }

    #[test]
    fn a_hand_edited_file_that_is_not_settings_does_not_stop_the_application() {
        // The file sits in the user's config directory and invites editing.
        for corrupt in ["{", "[]", "null", "not json", "42"] {
            assert_eq!(parse(corrupt), Settings::default(), "for {corrupt:?}");
        }
    }

    #[test]
    fn a_file_from_an_older_build_keeps_what_it_carries_and_defaults_the_rest() {
        let partial = parse(r#"{"signCommits": true}"#);

        assert!(partial.sign_commits);
        assert!(
            partial.confirm_history_rewrite,
            "a key the file predates arrives at its default"
        );
    }

    #[test]
    fn a_key_the_build_does_not_know_is_ignored_rather_than_fatal() {
        // Going back a version must not cost the settings that still apply.
        let settings = parse(r#"{"signCommits": true, "somethingLater": "on"}"#);

        assert!(settings.sign_commits);
    }

    #[test]
    fn settings_read_back_as_they_were_written() {
        let written = Settings {
            sign_commits: true,
            confirm_history_rewrite: false,
            show_git_commands: true,
        };
        let text = serde_json::to_string_pretty(&written).expect("serialising");

        assert_eq!(parse(&text), written);
    }

    #[test]
    fn the_stored_keys_are_the_camel_case_names_the_screen_uses() {
        // The file is meant to be readable by hand, and the frontend types name
        // these keys. A rename on either side has to be a deliberate one.
        let text = serde_json::to_string(&Settings::default()).expect("serialising");

        assert!(text.contains("signCommits"), "{text}");
        assert!(text.contains("confirmHistoryRewrite"), "{text}");
        assert!(text.contains("showGitCommands"), "{text}");
    }
}
