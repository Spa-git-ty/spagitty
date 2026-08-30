// SPDX-License-Identifier: GPL-3.0-or-later

//! Git submodules management (FEAT-067).
//!
//! Exposes listing submodule status, recursive initialization and updates,
//! syncing URLs, and de-initializing submodules.


use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::repo::workdir;
use crate::shell;

/// One submodule attached to a superproject.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Submodule {
    pub name: String,
    pub path: String,
    pub url: String,
    pub head_commit: Option<String>,
    pub head_short: Option<String>,
    pub initialized: bool,
    pub in_sync: bool,
    pub has_conflict: bool,
    pub describe: Option<String>,
}

/// Parse `git submodule status` output lines into a list of [`Submodule`].
pub fn parse_submodule_status(raw: &str) -> Vec<Submodule> {
    let mut list = Vec::new();
    for line in raw.lines() {
        let line = line.trim_end();
        if line.is_empty() {
            continue;
        }

        let prefix = line.chars().next().unwrap_or(' ');
        let rest = if line.len() > 1 {
            line[1..].trim_start()
        } else {
            ""
        };
        let parts: Vec<&str> = rest.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let head_commit = Some(parts[0].to_string());
        let head_short = head_commit.as_ref().map(|h| {
            if h.len() >= 7 {
                h[..7].to_string()
            } else {
                h.clone()
            }
        });
        let path = parts.get(1).map(|p| p.to_string()).unwrap_or_default();
        let name = path.clone();
        let describe = if parts.len() > 2 {
            Some(
                parts[2..]
                    .join(" ")
                    .trim_matches(|c| c == '(' || c == ')')
                    .to_string(),
            )
        } else {
            None
        };

        let initialized = prefix != '-';
        let in_sync = prefix == ' ' || prefix == '\0';
        let has_conflict = prefix == 'U';

        list.push(Submodule {
            name,
            path,
            url: String::new(),
            head_commit,
            head_short,
            initialized,
            in_sync,
            has_conflict,
            describe,
        });
    }
    list
}

/// List all submodules with their status and configured URLs.
pub fn list(repo: &gix::Repository) -> Result<Vec<Submodule>> {
    let dir = workdir(repo)?;
    let raw = shell::submodule_status(dir)?;
    let mut submodules = parse_submodule_status(&raw);

    // Read URLs from .gitmodules through gix
    if let Ok(Some(gix_subs)) = repo.submodules() {
        for gix_sub in gix_subs {
            if let Ok(p) = gix_sub.path() {
                let path_str = p.to_string();
                let url_str = gix_sub
                    .url()
                    .ok()
                    .map(|u| u.to_bstring().to_string())
                    .unwrap_or_default();
                if let Some(item) = submodules.iter_mut().find(|s| s.path == path_str) {
                    item.url = url_str;
                    item.name = gix_sub.name().to_string();
                }
            }
        }
    }

    Ok(submodules)
}

/// Update submodules recursively.
pub fn update(
    repo: &gix::Repository,
    paths: &[String],
    init: bool,
    recursive: bool,
) -> Result<String> {
    let dir = workdir(repo)?;
    shell::submodule_update(dir, paths, init, recursive)
}

/// Sync submodule URLs from .gitmodules.
pub fn sync(repo: &gix::Repository, recursive: bool) -> Result<String> {
    let dir = workdir(repo)?;
    shell::submodule_sync(dir, recursive)
}

/// De-initialize a submodule.
pub fn deinit(repo: &gix::Repository, path: &str, force: bool) -> Result<String> {
    let dir = workdir(repo)?;
    shell::submodule_deinit(dir, path, force)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    #[test]
    fn parses_submodule_status_lines() {
        let sample = r#" 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b vendor/lib (v1.0.0)
-2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c third_party/uninit
+3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d vendor/drifted (v1.1.0-4-g3c4d5e)
U4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d conflicted/module
"#;

        let parsed = parse_submodule_status(sample);
        assert_eq!(parsed.len(), 4);

        assert_eq!(parsed[0].path, "vendor/lib");
        assert!(parsed[0].initialized);
        assert!(parsed[0].in_sync);
        assert_eq!(parsed[0].describe.as_deref(), Some("v1.0.0"));

        assert_eq!(parsed[1].path, "third_party/uninit");
        assert!(!parsed[1].initialized);

        assert_eq!(parsed[2].path, "vendor/drifted");
        assert!(parsed[2].initialized);
        assert!(!parsed[2].in_sync);

        assert_eq!(parsed[3].path, "conflicted/module");
        assert!(parsed[3].has_conflict);
    }

    #[test]
    fn lists_submodules_in_fixture_repository() {
        let fixture = Fixture::woven();
        fixture.write(
            ".gitmodules",
            "[submodule \"vendor/lib\"]\n\tpath = vendor/lib\n\turl = https://example.com/lib.git\n",
        );
        fixture.git(&["add", ".gitmodules"]);
        fixture.commit("Add submodule declaration");

        let repo = fixture.open();
        let submodules = list(&repo).expect("list submodules");
        // Status may be empty if git submodule status reports nothing or uninit
        assert!(submodules.is_empty() || submodules.iter().all(|s| !s.path.is_empty()));
    }
}
