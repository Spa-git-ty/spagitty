// SPDX-License-Identifier: GPL-3.0-or-later

//! The list of repositories Spagitty has been shown.
//!
//! This is application state, not repository state, so it lives here rather
//! than in `spagitty-core`: it is a record of what the *user* opened, and it
//! belongs to Spagitty's own config directory alongside their other preferences.
//!
//! Spagitty never goes looking for repositories. It remembers what it has been
//! given and nothing else — no filesystem scan, no home-directory crawl, and
//! nothing leaves the machine.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

/// How many paths are kept. Long enough to cover everything anyone moves
/// between in a month, short enough that the file stays readable by hand.
const LIMIT: usize = 50;

const FILE: &str = "repositories.json";

/// The remembered paths, most recently opened first.
///
/// A missing or unreadable file is an empty list rather than an error: this is
/// a convenience, and losing it must never stop the application starting.
pub fn load(app: &AppHandle) -> Vec<PathBuf> {
    let Some(path) = file(app) else {
        return Vec::new();
    };
    let Ok(text) = std::fs::read_to_string(path) else {
        return Vec::new();
    };
    parse(&text)
}

/// Put `repo` at the front, removing any earlier mention of it.
pub fn remember(app: &AppHandle, repo: &Path) {
    save(app, &promoted(load(app), repo));
}

/// Forget one path.
///
/// The repository on disk is not touched. This removes a row from Spagitty's
/// own list and nothing else — the one destructive-sounding action on the
/// screen that is not destructive at all.
pub fn forget(app: &AppHandle, repo: &Path) {
    save(app, &without(load(app), repo));
}

/// A hand-edited file must not stop the application starting, so anything that
/// is not a list of paths reads as no list at all.
fn parse(text: &str) -> Vec<PathBuf> {
    serde_json::from_str(text).unwrap_or_default()
}

/// `repo` first, mentioned once, and no more than [`LIMIT`] entries.
fn promoted(mut paths: Vec<PathBuf>, repo: &Path) -> Vec<PathBuf> {
    paths.retain(|existing| existing != repo);
    paths.insert(0, repo.to_path_buf());
    paths.truncate(LIMIT);
    paths
}

fn without(mut paths: Vec<PathBuf>, repo: &Path) -> Vec<PathBuf> {
    paths.retain(|existing| existing != repo);
    paths
}

fn save(app: &AppHandle, paths: &[PathBuf]) {
    let Some(path) = file(app) else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(text) = serde_json::to_string_pretty(paths) {
        // A failed write costs the list, not the session.
        let _ = std::fs::write(path, text);
    }
}

fn file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|dir| dir.join(FILE))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paths(of: &[&str]) -> Vec<PathBuf> {
        of.iter().map(PathBuf::from).collect()
    }

    #[test]
    fn a_missing_list_reads_as_no_repositories() {
        // The file does not exist until the first repository is opened, and
        // that is the ordinary case rather than an error.
        assert_eq!(parse(""), Vec::<PathBuf>::new());
    }

    #[test]
    fn a_hand_edited_file_that_is_not_a_list_does_not_stop_the_application() {
        // The file sits in the user's config directory and invites editing.
        // Truncated JSON, an object, a list of numbers — none of it may be the
        // reason Spagitty will not start.
        for corrupt in ["{", "{\"repos\": []}", "[1, 2, 3]", "null", "not json"] {
            assert_eq!(parse(corrupt), Vec::<PathBuf>::new(), "for {corrupt:?}");
        }
    }

    #[test]
    fn a_list_of_paths_reads_back_as_it_was_written() {
        let written = serde_json::to_string_pretty(&paths(&["/a", "/b"])).unwrap();

        assert_eq!(parse(&written), paths(&["/a", "/b"]));
    }

    #[test]
    fn opening_a_repository_puts_it_first() {
        let list = promoted(paths(&["/a", "/b"]), Path::new("/c"));

        assert_eq!(list, paths(&["/c", "/a", "/b"]));
    }

    #[test]
    fn reopening_a_repository_moves_it_up_rather_than_listing_it_twice() {
        let list = promoted(paths(&["/a", "/b", "/c"]), Path::new("/c"));

        assert_eq!(list, paths(&["/c", "/a", "/b"]));
    }

    #[test]
    fn the_list_is_capped_and_the_oldest_entry_is_what_falls_off() {
        let full: Vec<PathBuf> = (0..LIMIT).map(|n| PathBuf::from(format!("/{n}"))).collect();
        let oldest = full.last().unwrap().clone();

        let list = promoted(full, Path::new("/new"));

        assert_eq!(list.len(), LIMIT);
        assert_eq!(list[0], PathBuf::from("/new"));
        assert!(!list.contains(&oldest));
    }

    #[test]
    fn forgetting_removes_one_row_and_leaves_the_rest_in_order() {
        let list = without(paths(&["/a", "/b", "/c"]), Path::new("/b"));

        assert_eq!(list, paths(&["/a", "/c"]));
    }

    #[test]
    fn forgetting_something_that_is_not_listed_changes_nothing() {
        let list = without(paths(&["/a", "/b"]), Path::new("/z"));

        assert_eq!(list, paths(&["/a", "/b"]));
    }
}
