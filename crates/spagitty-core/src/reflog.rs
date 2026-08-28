// SPDX-License-Identifier: GPL-3.0-or-later

//! Where a ref has been (FEAT-050).
//!
//! Every other screen answers "what does history look like". This one answers
//! "what did I just do to it", which is a different question and the only one
//! that helps after a rewrite goes wrong. `git reset --hard` on the wrong
//! commit, a rebase that dropped something, a branch deleted a minute too soon:
//! none of those are visible in the graph afterwards, and all of them are one
//! line in a reflog.
//!
//! It became worth building when FEAT-015 and FEAT-016 made rewriting history
//! an ordinary thing to do from inside Spagitty. A client that can rewrite and
//! cannot show you the way back is a client that raises the stakes without
//! raising the floor.
//!
//! # Read with `gix`, in-process
//!
//! A reflog is an append-only text file per ref under `.git/logs/`, and `gix`
//! parses it. Nothing here shells out, which keeps it on the reading side of
//! the boundary in [`crate::shell`]. Recovering *from* an entry is a write and
//! goes through the usual places — a branch created at it, a checkout, a reset.

use serde::Serialize;

use crate::error::{Error, Result};
use crate::graph::short_id;

/// The most entries this reads for one ref.
///
/// A reflog on a busy repository runs to thousands of lines, and the ones worth
/// looking at after a mistake are always the newest. The cap is reported rather
/// than silently applied.
pub const MAX_ENTRIES: usize = 500;

/// One move of one ref.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReflogEntry {
    /// Position from the newest, counting from 0 — the `n` in `HEAD@{n}`.
    ///
    /// The whole point of the screen is that this number is what you type at a
    /// terminal, so it is carried rather than derived on the way out.
    pub index: usize,
    /// The revision this entry names: `HEAD@{3}`, `main@{0}`.
    pub revision: String,
    /// Where the ref pointed before this move. All zeroes for the first entry
    /// of a ref that was just created.
    pub before: String,
    pub before_short: String,
    /// Where it pointed after.
    pub after: String,
    pub after_short: String,
    /// True when this entry created the ref — there is nothing before it.
    pub created: bool,
    /// Who moved it.
    pub author_name: String,
    /// Unix seconds.
    pub time: i64,
    /// git's own description: `commit: subject`, `rebase (finish): …`.
    pub message: String,
    /// The word before the colon, which is what the operation was called.
    ///
    /// Split out because it is what a reader scans for — `reset`, `rebase`,
    /// `merge` — and matching on a prefix in the screen would put git's message
    /// format in two places.
    pub operation: String,
}

/// Which ref's history to read.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReflogQuery {
    /// A full ref name, or empty for `HEAD`.
    ///
    /// `HEAD`'s log is the one that answers "what did I just do", because it
    /// records every checkout as well as every move of whatever was checked
    /// out. A branch's own log answers "what happened to this branch".
    pub reference: String,
    /// How many to read, capped at [`MAX_ENTRIES`].
    pub limit: usize,
}

/// The result of a read, including whether it was cut short.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Reflog {
    /// The ref this is the log of, as it should be shown: `HEAD`, `main`.
    pub reference: String,
    /// Newest first. That is the order a reflog is read in and the order
    /// `@{n}` counts in, and reversing it would put the two out of step.
    pub entries: Vec<ReflogEntry>,
    /// True when there were more than the limit.
    pub truncated: bool,
    /// False when this ref has no reflog at all — a repository with
    /// `core.logAllRefUpdates` off, or a ref that has never moved.
    pub exists: bool,
}

/// Every ref that has a reflog worth offering, `HEAD` first.
///
/// Local branches only. A remote-tracking ref does have a log, but what it
/// records is fetches rather than anything the user did, and it is not where
/// anybody looks after a mistake.
pub fn logged_refs(repo: &gix::Repository) -> Vec<String> {
    let mut names = vec!["HEAD".to_string()];

    let Ok(platform) = repo.references() else {
        return names;
    };
    let Ok(branches) = platform.prefixed("refs/heads/") else {
        return names;
    };

    let mut locals: Vec<String> = branches
        .flatten()
        .filter(|reference| reference.log_exists())
        .map(|reference| reference.name().shorten().to_string())
        .collect();
    locals.sort();
    names.extend(locals);
    names
}

/// Read a ref's reflog, newest first.
pub fn reflog(repo: &gix::Repository, query: &ReflogQuery) -> Result<Reflog> {
    let name = if query.reference.trim().is_empty() {
        "HEAD".to_string()
    } else {
        query.reference.trim().to_string()
    };
    let limit = query.limit.clamp(1, MAX_ENTRIES);

    let reference = repo
        .find_reference(name.as_str())
        .map_err(|error| Error::Refs(format!("{name}: {error}")))?;

    let shown = reference.name().shorten().to_string();
    let mut platform = reference.log_iter();

    let Some(iter) = platform
        .rev()
        .map_err(|error| Error::Refs(format!("{name}: {error}")))?
    else {
        // No log file. Not an error: a repository can have reflogs turned off,
        // and a ref that has never moved has nothing to say.
        return Ok(Reflog {
            reference: shown,
            entries: Vec::new(),
            truncated: false,
            exists: false,
        });
    };

    let mut entries = Vec::new();
    let mut truncated = false;

    for line in iter {
        let line = line.map_err(|error| Error::Refs(format!("{name}: {error}")))?;

        if entries.len() == limit {
            truncated = true;
            break;
        }

        let index = entries.len();
        let before = line.previous_oid.to_string();
        let after = line.new_oid.to_string();
        let message = line.message.to_string();

        entries.push(ReflogEntry {
            revision: format!("{shown}@{{{index}}}"),
            index,
            created: is_null(&before),
            before_short: short_of(&before),
            after_short: short_of(&after),
            before,
            after,
            author_name: line.signature.name.to_string(),
            time: line.signature.time.seconds,
            operation: operation_of(&message),
            message,
        });
    }

    Ok(Reflog {
        reference: shown,
        entries,
        truncated,
        exists: true,
    })
}

/// The word git puts before the colon: `commit`, `reset`, `rebase (finish)`.
///
/// Only the part before any parenthesis, so `rebase (finish)` and
/// `rebase (pick)` group as one operation — which is how a reader thinks of
/// them, and what makes a column of them scannable.
fn operation_of(message: &str) -> String {
    let head = message.split(':').next().unwrap_or("").trim();
    let word = head.split(" (").next().unwrap_or(head).trim();

    if word.is_empty() {
        "moved".to_string()
    } else {
        word.to_string()
    }
}

fn is_null(id: &str) -> bool {
    id.chars().all(|character| character == '0')
}

/// Shorten for showing, and leave the all-zero id alone.
///
/// `0000000` reads as a real commit at a glance. The screen wants a word there,
/// and giving it an empty string is what lets it choose one.
fn short_of(id: &str) -> String {
    if is_null(id) {
        String::new()
    } else {
        gix::ObjectId::from_hex(id.as_bytes())
            .map(|id| short_id(&id))
            .unwrap_or_else(|_| id.chars().take(7).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    fn query(reference: &str) -> ReflogQuery {
        ReflogQuery {
            reference: reference.to_string(),
            limit: MAX_ENTRIES,
        }
    }

    #[test]
    fn head_has_a_log_of_everything_that_moved_it() {
        let fixture = Fixture::woven();

        let log = reflog(&fixture.open(), &query("HEAD")).expect("reflog");

        assert!(log.exists);
        assert!(!log.entries.is_empty());
        assert_eq!(log.reference, "HEAD");
    }

    #[test]
    fn entries_are_newest_first_and_numbered_from_zero() {
        // The order a reflog is read in and the order `@{n}` counts in. Any
        // other order puts the number and the row out of step.
        let fixture = Fixture::woven();

        let log = reflog(&fixture.open(), &query("HEAD")).expect("reflog");

        assert_eq!(log.entries[0].index, 0);
        assert_eq!(log.entries[0].revision, "HEAD@{0}");
        assert!(log.entries[0].time >= log.entries[log.entries.len() - 1].time);
    }

    #[test]
    fn each_entry_says_where_the_ref_moved_from_and_to() {
        let fixture = Fixture::woven();
        let before = fixture.head();
        fixture.write("notes.md", "another line\n");
        fixture.commit_all("One more");
        let after = fixture.head();

        let log = reflog(&fixture.open(), &query("HEAD")).expect("reflog");

        assert_eq!(log.entries[0].before, before);
        assert_eq!(log.entries[0].after, after);
        assert_eq!(log.entries[0].after_short, after[..7]);
    }

    #[test]
    fn the_operation_is_the_word_before_the_colon() {
        let fixture = Fixture::woven();
        fixture.write("notes.md", "another line\n");
        fixture.commit_all("One more");

        let log = reflog(&fixture.open(), &query("HEAD")).expect("reflog");

        assert_eq!(log.entries[0].operation, "commit");
        assert!(log.entries[0].message.contains("One more"));
    }

    #[test]
    fn a_rebase_groups_under_one_operation_however_git_labels_the_step() {
        // `rebase (finish)` and `rebase (pick)` are one thing to a reader, and
        // a column that spelled out every variant would not be scannable.
        assert_eq!(
            operation_of("rebase (finish): returning to refs/heads/x"),
            "rebase"
        );
        assert_eq!(operation_of("rebase (pick): a commit"), "rebase");
        assert_eq!(operation_of("reset: moving to HEAD~1"), "reset");
        assert_eq!(operation_of("checkout: moving from a to b"), "checkout");
    }

    #[test]
    fn a_message_with_no_colon_still_has_a_word_for_what_happened() {
        assert_eq!(operation_of("something odd"), "something odd");
        assert_eq!(operation_of(""), "moved");
    }

    #[test]
    fn the_first_entry_of_a_ref_says_it_was_created() {
        let fixture = Fixture::empty();
        fixture.write("a.txt", "a\n");
        fixture.git(&["add", "-A"]);
        fixture.commit("First");

        let log = reflog(&fixture.open(), &query("HEAD")).expect("reflog");
        let first = log.entries.last().expect("an entry");

        assert!(first.created);
        // Not `0000000`, which reads as a real commit at a glance.
        assert_eq!(first.before_short, "");
    }

    #[test]
    fn a_branch_has_its_own_log_separate_from_head() {
        let fixture = Fixture::woven();

        let head = reflog(&fixture.open(), &query("HEAD")).expect("HEAD reflog");
        let branch = reflog(&fixture.open(), &query("refs/heads/main")).expect("branch reflog");

        assert_eq!(branch.reference, "main");
        // HEAD records checkouts as well, so it has strictly more to say.
        assert!(head.entries.len() >= branch.entries.len());
    }

    #[test]
    fn an_empty_reference_means_head() {
        let fixture = Fixture::woven();

        assert_eq!(
            reflog(&fixture.open(), &query(""))
                .expect("reflog")
                .reference,
            "HEAD"
        );
    }

    #[test]
    fn a_limit_cuts_the_list_and_says_it_did() {
        let fixture = Fixture::woven();

        let log = reflog(
            &fixture.open(),
            &ReflogQuery {
                reference: "HEAD".to_string(),
                limit: 1,
            },
        )
        .expect("reflog");

        assert_eq!(log.entries.len(), 1);
        assert!(log.truncated);
    }

    #[test]
    fn a_reference_that_does_not_exist_is_an_error_naming_it() {
        let fixture = Fixture::woven();

        let error = reflog(&fixture.open(), &query("refs/heads/nope")).unwrap_err();

        assert!(format!("{error}").contains("nope"), "unexpected: {error}");
    }

    #[test]
    fn the_refs_worth_offering_start_with_head_and_then_the_branches() {
        let fixture = Fixture::woven();

        let names = logged_refs(&fixture.open());

        assert_eq!(names[0], "HEAD");
        assert!(names.contains(&"main".to_string()));
        // Remote-tracking refs record fetches, not anything the user did.
        assert!(!names.iter().any(|name| name.starts_with("origin/")));
    }
}
