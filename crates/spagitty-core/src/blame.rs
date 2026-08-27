// SPDX-License-Identifier: GPL-3.0-or-later

//! Who last touched each line.
//!
//! Read from `git blame --line-porcelain` rather than computed here, and that
//! is a documented exception to the `shell.rs` rule rather than a shortcut:
//! `gix::blame` 0.16 — the newest published version — panics on an ordinary
//! history shape, a file blamed at a merge commit whose history contains an
//! intervening commit that left the file alone. The exception, its reason and
//! its end condition are recorded on `shell::blame`.
//!
//! What this module owns is the part git does not do: deciding what is worth
//! blaming at all, and turning the porcelain stream into rows.
//!
//! A refusal is reported rather than returned as nothing. A binary file, a path
//! that is not in that revision, and a directory each come back saying which —
//! an empty list would read as a file nobody has ever touched, which is a
//! different and much stranger claim.

use serde::Serialize;

use std::path::Path;

use crate::error::{Error, Result};
use crate::shell;

/// How far into a blob we look for a NUL byte before calling it binary. Git's
/// own rule, so the same files are called binary here as everywhere else in the
/// application.
const BINARY_SNIFF_BYTES: usize = 8000;

/// Above this, blaming is refused rather than attempted. Blame reads every
/// revision of the file it walks through, so the cost is the file size times
/// the depth of its history.
const MAX_BLOB_BYTES: usize = 4 * 1024 * 1024;

/// One line of the file, and the commit that last changed it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlameLine {
    /// 1-based line number in the blamed file.
    pub line: u32,
    pub text: String,
    pub commit: String,
    pub short: String,
    pub summary: String,
    pub author_name: String,
    /// Author time, seconds since the unix epoch.
    pub time: i64,
    /// Where this line lived before, when the commit that introduced it also
    /// renamed the file. `None` for the overwhelmingly common case.
    pub source_path: Option<String>,
}

/// Why there is nothing to blame.
///
/// Not an error: these are ordinary states of ordinary files, and the strip
/// says which one rather than failing the screen around it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum NotBlamable {
    Binary,
    TooLarge,
    /// No such path in that revision, or the path is a directory or submodule.
    NotAFile,
    /// A file with no lines has nothing to attribute.
    Empty,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Blame {
    pub path: String,
    /// The revision blamed, resolved to a full id.
    pub revision: String,
    pub lines: Vec<BlameLine>,
    /// Set when `lines` is empty for a reason worth stating.
    pub refused: Option<NotBlamable>,
}

/// Blame `path` as of `revision`.
///
/// `revision` is anything `git rev-parse` would take — a branch name, a tag, a
/// short id, `HEAD`. An empty string means `HEAD`.
pub fn file(repo: &gix::Repository, path: &str, revision: &str) -> Result<Blame> {
    let spec = if revision.trim().is_empty() {
        "HEAD"
    } else {
        revision.trim()
    };

    // Peeled, because an annotated tag resolves to the tag object and a blame
    // is about the commit it points at.
    let suspect = repo
        .rev_parse_single(spec)
        .map_err(|_| Error::UnknownCommit(spec.to_string()))?
        .object()
        .map_err(|_| Error::UnknownCommit(spec.to_string()))?
        .peel_to_commit()
        .map_err(|_| Error::UnknownCommit(spec.to_string()))?
        .id;

    let blamed = Blame {
        path: path.to_string(),
        revision: suspect.to_string(),
        lines: Vec::new(),
        refused: None,
    };

    // Read the blob first. Refusing a binary or oversized file here costs one
    // lookup; discovering it inside the blame walk costs the whole walk.
    let Some(contents) = blob_at(repo, suspect, path)? else {
        return Ok(Blame {
            refused: Some(NotBlamable::NotAFile),
            ..blamed
        });
    };
    if is_binary(&contents) {
        return Ok(Blame {
            refused: Some(NotBlamable::Binary),
            ..blamed
        });
    }
    if contents.len() > MAX_BLOB_BYTES {
        return Ok(Blame {
            refused: Some(NotBlamable::TooLarge),
            ..blamed
        });
    }
    let text = String::from_utf8_lossy(&contents).into_owned();
    let lines: Vec<&str> = split_lines(&text);
    if lines.is_empty() {
        return Ok(Blame {
            refused: Some(NotBlamable::Empty),
            ..blamed
        });
    }

    let porcelain = shell::blame(workdir(repo)?, spec, path)?;

    Ok(Blame {
        lines: parse(&porcelain, path),
        ..blamed
    })
}

/// The working directory to run `git` in.
///
/// A bare repository has no checkout, and `git blame` wants one. Blaming a bare
/// repository is not something this screen can be asked for, since it has no
/// file list to ask from.
fn workdir(repo: &gix::Repository) -> Result<&Path> {
    repo.workdir()
        .ok_or_else(|| Error::NotStageable("a bare repository has no working copy".into()))
}

/// Turn `--line-porcelain` into rows.
///
/// `--line-porcelain` repeats every header on every line, so this is a loop
/// over lines rather than a state machine over hunks. A line is complete when
/// its content arrives, which porcelain marks with a leading tab.
///
/// Unknown headers are skipped rather than refused: git adds fields over time,
/// and a blame that stops working because a future git said something new would
/// be a poor trade for strictness we do not need.
///
/// `asked_for` is the path the caller blamed. Git's `filename` header names the
/// path *at the commit that introduced the line*, so a line whose filename is
/// not the one we asked about is a line that arrived under another name.
fn parse(porcelain: &str, asked_for: &str) -> Vec<BlameLine> {
    let mut out = Vec::new();
    let mut current = Partial::default();

    for raw in porcelain.lines() {
        if let Some(content) = raw.strip_prefix('\t') {
            if let Some(line) = current.finish(content, asked_for) {
                out.push(line);
            }
            current = Partial::default();
            continue;
        }

        let (key, value) = match raw.split_once(' ') {
            Some(pair) => pair,
            None => (raw, ""),
        };

        match key {
            "author" => current.author_name = Some(value.to_string()),
            "author-time" => current.time = value.parse().ok(),
            "summary" => current.summary = Some(value.to_string()),
            "filename" => current.filename = Some(value.to_string()),
            _ => {
                // A header line, which is "<sha> <orig> <final> [count]".
                if is_object_id(key) {
                    current.commit = Some(key.to_string());
                    current.line = value.split(' ').nth(1).and_then(|n| n.parse().ok());
                }
            }
        }
    }

    out
}

/// One line's headers, accumulated until its content arrives.
#[derive(Default)]
struct Partial {
    commit: Option<String>,
    line: Option<u32>,
    author_name: Option<String>,
    time: Option<i64>,
    summary: Option<String>,
    filename: Option<String>,
}

impl Partial {
    /// A row, or nothing when the headers were incomplete — which would mean
    /// git printed content without a header, and dropping that line is better
    /// than attributing it to whatever came before.
    fn finish(self, text: &str, asked_for: &str) -> Option<BlameLine> {
        let commit = self.commit?;
        Some(BlameLine {
            line: self.line?,
            text: text.to_string(),
            short: commit.chars().take(7).collect(),
            commit,
            summary: self.summary.unwrap_or_default(),
            author_name: self.author_name.unwrap_or_default(),
            time: self.time.unwrap_or(0),
            // Only when the line arrived under another name; the same name is
            // not a rename.
            source_path: self.filename.filter(|name| name != asked_for),
        })
    }
}

fn is_object_id(text: &str) -> bool {
    text.len() == 40 && text.chars().all(|c| c.is_ascii_hexdigit())
}

fn blob_at(repo: &gix::Repository, commit: gix::ObjectId, path: &str) -> Result<Option<Vec<u8>>> {
    let tree = repo
        .find_commit(commit)
        .map_err(|e| Error::UnknownCommit(e.to_string()))?
        .tree()
        .map_err(|e| Error::Diff(e.to_string()))?;

    let entry = tree
        .lookup_entry_by_path(std::path::Path::new(path))
        .map_err(|e| Error::Diff(e.to_string()))?;

    let Some(entry) = entry.filter(|entry| entry.mode().is_blob_or_symlink()) else {
        return Ok(None);
    };

    let object = repo
        .find_object(entry.object_id())
        .map_err(|e| Error::Diff(e.to_string()))?;
    Ok(Some(object.detach().data))
}

/// Lines the way a file viewer counts them: a trailing newline ends the last
/// line rather than starting an empty one.
fn split_lines(text: &str) -> Vec<&str> {
    if text.is_empty() {
        return Vec::new();
    }
    let mut lines: Vec<&str> = text.split('\n').collect();
    if lines.last() == Some(&"") {
        lines.pop();
    }
    lines
}

fn is_binary(data: &[u8]) -> bool {
    data[..data.len().min(BINARY_SNIFF_BYTES)].contains(&0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    /// `git blame --porcelain`'s commit-per-line answer, as `(line, commit)`.
    fn git_blame(fixture: &Fixture, path: &str, revision: &str) -> Vec<(u32, String)> {
        let out = fixture.git(&["blame", "--line-porcelain", revision, "--", path]);

        let mut pairs = Vec::new();
        for line in out.lines() {
            // A porcelain header is "<sha> <orig-line> <final-line> [count]".
            let mut parts = line.split(' ');
            let (Some(sha), Some(_orig), Some(final_line)) =
                (parts.next(), parts.next(), parts.next())
            else {
                continue;
            };
            if sha.len() != 40 || !sha.chars().all(|c| c.is_ascii_hexdigit()) {
                continue;
            }
            let Ok(number) = final_line.parse::<u32>() else {
                continue;
            };
            pairs.push((number, sha.to_string()));
        }
        pairs
    }

    #[test]
    fn every_line_is_attributed_to_the_commit_git_blames_it_on() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        let blame = file(&repo, "core.txt", "HEAD").expect("blame");
        let mine: Vec<(u32, String)> = blame
            .lines
            .iter()
            .map(|line| (line.line, line.commit.clone()))
            .collect();

        assert_eq!(mine, git_blame(&fixture, "core.txt", "HEAD"));
    }

    #[test]
    fn the_text_of_each_line_is_the_file_itself() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        let blame = file(&repo, "notes.md", "HEAD").expect("blame");
        let from_disk = std::fs::read_to_string(fixture.path().join("notes.md")).expect("file");

        assert_eq!(
            blame
                .lines
                .iter()
                .map(|line| line.text.as_str())
                .collect::<Vec<_>>(),
            from_disk.lines().collect::<Vec<_>>()
        );
    }

    #[test]
    fn lines_arrive_in_line_order_rather_than_hunk_order() {
        // gix produces entries per hunk, which is not top-to-bottom, and the
        // strip is read top to bottom.
        let fixture = Fixture::woven();
        let repo = fixture.open();

        let blame = file(&repo, "core.txt", "HEAD").expect("blame");

        assert_eq!(
            blame.lines.iter().map(|l| l.line).collect::<Vec<_>>(),
            (1..=blame.lines.len() as u32).collect::<Vec<_>>()
        );
    }

    #[test]
    fn a_row_carries_who_and_when_and_what_the_commit_said() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        let blame = file(&repo, "core.txt", "HEAD").expect("blame");
        let first = &blame.lines[0];

        assert_eq!(first.author_name, "Ada Lovelace");
        assert_eq!(first.short.len(), 7);
        assert!(!first.summary.is_empty());
        assert!(first.time > 0);
    }

    #[test]
    fn blaming_an_older_revision_answers_for_that_revision() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        let older = file(&repo, "core.txt", "v0.1.0").expect("blame");
        let now = file(&repo, "core.txt", "HEAD").expect("blame");

        assert_eq!(older.revision, fixture.rev("v0.1.0^{commit}"));
        assert_ne!(
            older.lines.iter().map(|l| &l.commit).collect::<Vec<_>>(),
            now.lines.iter().map(|l| &l.commit).collect::<Vec<_>>(),
            "the rewrites happened after v0.1.0"
        );
    }

    #[test]
    fn an_empty_revision_means_head() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        assert_eq!(
            file(&repo, "core.txt", "").expect("blame").revision,
            file(&repo, "core.txt", "HEAD").expect("blame").revision
        );
    }

    #[test]
    fn a_binary_file_says_so_rather_than_rendering_empty() {
        // An empty list would read as a file nobody has ever touched, which is
        // a different and much stranger claim.
        let fixture = Fixture::woven();
        let repo = fixture.open();

        let blame = file(&repo, "logo.bin", "HEAD").expect("blame");

        assert_eq!(blame.refused, Some(NotBlamable::Binary));
        assert!(blame.lines.is_empty());
    }

    #[test]
    fn a_path_that_is_not_in_that_revision_says_so() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        assert_eq!(
            file(&repo, "no/such/file.txt", "HEAD")
                .expect("blame")
                .refused,
            Some(NotBlamable::NotAFile)
        );
        assert_eq!(
            file(&repo, "split.txt", "v0.1.0").expect("blame").refused,
            Some(NotBlamable::NotAFile),
            "it did not exist yet at that tag"
        );
    }

    #[test]
    fn a_directory_is_not_a_file_to_blame() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        assert_eq!(
            file(&repo, "src/deep", "HEAD").expect("blame").refused,
            Some(NotBlamable::NotAFile)
        );
    }

    #[test]
    fn a_file_with_no_lines_has_nothing_to_attribute() {
        let fixture = Fixture::woven();
        fixture.write("hollow.txt", "");
        fixture.git(&["add", "hollow.txt"]);
        fixture.commit("Add an empty file");
        let repo = fixture.open();

        let blame = file(&repo, "hollow.txt", "HEAD").expect("blame");

        assert_eq!(blame.refused, Some(NotBlamable::Empty));
    }

    #[test]
    fn an_unknown_revision_is_an_error_rather_than_a_refusal() {
        // A refusal says "this file cannot be blamed". A revision that does not
        // exist is a different problem, and one the caller got wrong.
        let fixture = Fixture::woven();
        let repo = fixture.open();

        assert!(file(&repo, "core.txt", "no-such-branch").is_err());
    }

    #[test]
    fn a_renamed_file_carries_where_the_line_lived_before() {
        let fixture = Fixture::woven();
        fixture.git(&["mv", "notes.md", "journal.md"]);
        fixture.commit_all("Rename notes to journal");
        let repo = fixture.open();

        let blame = file(&repo, "journal.md", "HEAD").expect("blame");

        assert!(
            blame
                .lines
                .iter()
                .any(|line| line.source_path.as_deref() == Some("notes.md")),
            "the lines that predate the rename came from notes.md"
        );
    }

    #[test]
    fn the_same_filename_is_not_a_rename() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        let blame = file(&repo, "core.txt", "HEAD").expect("blame");

        assert!(blame.lines.iter().all(|line| line.source_path.is_none()));
    }

    #[test]
    fn a_header_the_parser_does_not_know_is_skipped_rather_than_refused() {
        // Git adds fields over time. A blame that stopped working because a
        // future git said something new would be a poor trade for strictness.
        let porcelain = concat!(
            "1111111111111111111111111111111111111111 1 1 1\n",
            "author Ada Lovelace\n",
            "author-time 1700000000\n",
            "some-future-header whatever it says\n",
            "summary A commit\n",
            "filename a.txt\n",
            "\tthe line\n"
        );

        let lines = parse(porcelain, "a.txt");

        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].author_name, "Ada Lovelace");
        assert_eq!(lines[0].text, "the line");
        assert_eq!(lines[0].line, 1);
    }

    #[test]
    fn content_arriving_without_a_header_is_dropped_rather_than_misattributed() {
        let lines = parse("\torphaned content\n", "a.txt");

        assert!(lines.is_empty());
    }

    #[test]
    fn splitting_lines_treats_a_trailing_newline_as_ending_the_last_line() {
        assert_eq!(split_lines(""), Vec::<&str>::new());
        assert_eq!(split_lines("one\n"), vec!["one"]);
        assert_eq!(split_lines("one\ntwo"), vec!["one", "two"]);
        assert_eq!(split_lines("one\n\n"), vec!["one", ""]);
    }

    #[test]
    fn a_nul_byte_after_the_sniff_window_is_still_text() {
        let mut late = vec![b'a'; BINARY_SNIFF_BYTES + 10];
        late[BINARY_SNIFF_BYTES + 5] = 0;

        assert!(!is_binary(&late));
        assert!(is_binary(b"\0start"));
    }
}
