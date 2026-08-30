// SPDX-License-Identifier: GPL-3.0-or-later

//! Finding commits.
//!
//! A search is the same revision walk the graph does, with a predicate and
//! without lanes. It is not a second traversal of history and it is not an
//! index: `git log` answers these questions by walking, and so does this.
//!
//! Lanes are deliberately absent. Drawing them over a filtered subset would
//! draw edges between commits that are not parent and child, which is a picture
//! of a history that does not exist.

use std::collections::HashMap;

use gix::ObjectId;
use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};
use crate::graph::{initials, short_id, Flow};
use crate::refs::{RefChip, RefIndex};

/// Rows delivered in one batch. The same size the graph walk uses, for the same
/// reason: a large result paints progressively rather than landing at once.
pub const BATCH: usize = 256;

/// What to look for. Every field is optional and they compose as AND — the
/// chips on the screen are exactly this struct.
///
/// Text matching is a case-insensitive substring, not a regular expression:
/// regexes are explicit non-scope for this pass, and a half-supported regex
/// dialect is worse than none.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Query {
    /// Matched against the author's name and email, the way `git log --author`
    /// looks at `Name <email>`.
    pub author: Option<String>,
    /// Matched against the whole message, subject and body, like `--grep`.
    pub message: Option<String>,
    /// A path the commit changed, like `git log -- <path>`.
    pub path: Option<String>,
    /// Matched against added and removed diff content (FEAT-066).
    pub diff_content: Option<String>,
    /// Commits at or after this time. Seconds since the unix epoch, like
    /// `--since`.
    pub since: Option<i64>,
    /// Commits at or before this time, like `--until`.
    pub until: Option<i64>,
}

impl Query {
    /// True when nothing is being asked, which is the whole of history and
    /// therefore a question the screen refuses rather than answers.
    pub fn is_empty(&self) -> bool {
        self.text(&self.author).is_none()
            && self.text(&self.message).is_none()
            && self.text(&self.path).is_none()
            && self.text(&self.diff_content).is_none()
            && self.since.is_none()
            && self.until.is_none()
    }

    /// A filter that is present but blank is not a filter. Trimming here means
    /// a chip left empty behaves as if it were not there, rather than matching
    /// everything and looking deliberate.
    fn text<'a>(&self, field: &'a Option<String>) -> Option<&'a str> {
        field.as_deref().map(str::trim).filter(|s| !s.is_empty())
    }

    /// Which filter is narrowest, for an empty result to name.
    ///
    /// A path is the most specific thing anyone types here, then a message,
    /// then an author, then a date. Naming one is a guess, and it is a better
    /// guess than "no results".
    pub fn narrowest(&self) -> Option<String> {
        if let Some(diff) = self.text(&self.diff_content) {
            return Some(format!("diff:{diff}"));
        }
        if let Some(path) = self.text(&self.path) {
            return Some(format!("path:{path}"));
        }
        if let Some(message) = self.text(&self.message) {
            return Some(format!("message:{message}"));
        }
        if let Some(author) = self.text(&self.author) {
            return Some(format!("author:{author}"));
        }
        if self.since.is_some() || self.until.is_some() {
            return Some("the date range".to_string());
        }
        None
    }
}

/// One result. The graph's row without its lane — everything that says *which
/// commit this is*, and nothing that claims a shape a filtered list has not
/// got.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRow {
    /// Position in the result list, not in history.
    pub index: usize,
    pub id: String,
    pub short: String,
    pub summary: String,
    pub author_name: String,
    pub author_email: String,
    pub initials: String,
    /// Author time, seconds since the unix epoch.
    pub time: i64,
    pub refs: Vec<RefChip>,
}

/// Walk history newest first, delivering the commits that match.
///
/// `sink` decides whether to keep going, exactly as the graph walk's does — the
/// caller is what makes a search cancellable, since a query over a large
/// repository has no natural end until history does.
pub fn walk<F>(
    repo: &gix::Repository,
    tips: Vec<ObjectId>,
    refs: &RefIndex,
    query: &Query,
    mut sink: F,
) -> Result<usize>
where
    F: FnMut(SearchRow) -> Flow,
{
    if tips.is_empty() {
        return Err(Error::EmptyRepository);
    }

    let walk = repo
        .rev_walk(tips)
        .sorting(gix::revision::walk::Sorting::ByCommitTime(
            gix::traverse::commit::simple::CommitTimeOrder::NewestFirst,
        ))
        .all()
        .map_err(|e| Error::Walk(e.to_string()))?;

    let author = query.text(&query.author).map(str::to_lowercase);
    let message = query.text(&query.message).map(str::to_lowercase);
    let path = query.text(&query.path).map(str::to_string);
    let diff_content = query.text(&query.diff_content).map(str::to_string);

    let mut matched = 0usize;
    let mut initials_cache: HashMap<String, String> = HashMap::new();

    for info in walk {
        let info = info.map_err(|e| Error::Walk(e.to_string()))?;
        let id = info.id;

        let commit = repo
            .find_commit(id)
            .map_err(|e| Error::Walk(e.to_string()))?;

        // An unparseable signature is not worth dropping a commit over; fall
        // back to the walk's own commit time, which is already known.
        let (author_name, author_email, time) = match commit.author() {
            Ok(sig) => (
                sig.name.to_string(),
                sig.email.to_string(),
                sig.time()
                    .map(|t| t.seconds)
                    .unwrap_or_else(|_| info.commit_time.unwrap_or(0)),
            ),
            Err(_) => (String::new(), String::new(), info.commit_time.unwrap_or(0)),
        };

        if let Some(since) = query.since {
            if time < since {
                continue;
            }
        }
        if let Some(until) = query.until {
            if time > until {
                continue;
            }
        }
        if let Some(wanted) = &author {
            let whole = format!("{author_name} <{author_email}>").to_lowercase();
            if !whole.contains(wanted.as_str()) {
                continue;
            }
        }
        if let Some(wanted) = &message {
            let whole = commit
                .message_raw()
                .map(|m| m.to_string())
                .unwrap_or_default()
                .to_lowercase();
            if !whole.contains(wanted.as_str()) {
                continue;
            }
        }
        if let Some(wanted) = &path {
            if !touches_path(repo, &commit, wanted)? {
                continue;
            }
        }
        if let Some(wanted) = &diff_content {
            if !touches_diff_content(repo, &commit, wanted)? {
                continue;
            }
        }

        let summary = commit
            .message()
            .map(|m| m.summary().to_string())
            .unwrap_or_default();
        let glyph = initials_cache
            .entry(author_name.clone())
            .or_insert_with(|| initials(&author_name))
            .clone();

        let row = SearchRow {
            index: matched,
            id: id.to_string(),
            short: short_id(&id),
            summary,
            author_name,
            author_email,
            initials: glyph,
            time,
            refs: refs.chips_for(&id),
        };

        matched += 1;
        if let Flow::Stop = sink(row) {
            break;
        }
    }

    Ok(matched)
}

/// Did this commit change `path`?
///
/// Git's own rule, which is why merges behave the way `git log -- <path>` makes
/// them behave: a commit whose blob at the path is the same as *any* parent's
/// is TREESAME to that parent, and git simplifies it away rather than listing
/// it. Comparing against the first parent alone would list merges git does not.
fn touches_path(repo: &gix::Repository, commit: &gix::Commit<'_>, path: &str) -> Result<bool> {
    let here = blob_at(repo, commit.id(), path)?;

    let parents: Vec<ObjectId> = commit.parent_ids().map(|id| id.detach()).collect();
    if parents.is_empty() {
        // A root commit introduces everything it has.
        return Ok(here.is_some());
    }

    for parent in parents {
        if blob_at(repo, repo.find_object(parent).map_err(walk_err)?.id(), path)? == here {
            return Ok(false);
        }
    }
    Ok(true)
}

/// Did this commit change lines containing `query_str` in any file (FEAT-066)?
fn touches_diff_content(
    repo: &gix::Repository,
    commit: &gix::Commit<'_>,
    query_str: &str,
) -> Result<bool> {
    use gix::object::tree::diff::Change;

    let query_lower = query_str.to_lowercase();
    let current_tree = commit.tree().map_err(walk_err)?;

    let parent_tree = match commit.parent_ids().next() {
        Some(pid) => {
            let parent = repo.find_commit(pid.detach()).map_err(walk_err)?;
            parent.tree().map_err(walk_err)?
        }
        None => repo.empty_tree(),
    };

    let mut changes: Vec<(Option<ObjectId>, Option<ObjectId>)> = Vec::new();

    parent_tree
        .changes()
        .map_err(walk_err)?
        .for_each_to_obtain_tree(&current_tree, |change| {
            let mode = match &change {
                Change::Addition { entry_mode, .. }
                | Change::Deletion { entry_mode, .. }
                | Change::Modification { entry_mode, .. }
                | Change::Rewrite { entry_mode, .. } => *entry_mode,
            };
            if !mode.is_blob_or_symlink() {
                return Ok(std::ops::ControlFlow::Continue(()));
            }

            match change {
                Change::Addition { id, .. } => {
                    changes.push((None, Some(id.detach())));
                }
                Change::Deletion { id, .. } => {
                    changes.push((Some(id.detach()), None));
                }
                Change::Modification {
                    previous_id, id, ..
                } => {
                    changes.push((Some(previous_id.detach()), Some(id.detach())));
                }
                Change::Rewrite { source_id, id, .. } => {
                    changes.push((Some(source_id.detach()), Some(id.detach())));
                }
            }
            Ok::<_, Error>(std::ops::ControlFlow::Continue(()))
        })
        .map_err(walk_err)?;

    let mut found = false;
    for (old_id, new_id) in changes {
        let old_bytes = match old_id {
            Some(id) => match repo.find_object(id) {
                Ok(obj) => Some(obj.data.to_vec()),
                Err(_) => None,
            },
            None => None,
        };
        let new_bytes = match new_id {
            Some(id) => match repo.find_object(id) {
                Ok(obj) => Some(obj.data.to_vec()),
                Err(_) => None,
            },
            None => None,
        };

        let old_text = old_bytes.as_deref().unwrap_or(b"");
        let new_text = new_bytes.as_deref().unwrap_or(b"");

        let old_str = String::from_utf8_lossy(old_text);
        let new_str = String::from_utf8_lossy(new_text);

        for line in new_str.lines() {
            if line.to_lowercase().contains(&query_lower) && !old_str.contains(line) {
                found = true;
                break;
            }
        }
        if found {
            break;
        }
        for line in old_str.lines() {
            if line.to_lowercase().contains(&query_lower) && !new_str.contains(line) {
                found = true;
                break;
            }
        }
        if found {
            break;
        }
    }

    Ok(found)
}

/// The blob id at `path` in the commit `id` points at, or `None` when nothing
/// is there. A directory or a submodule is `None` too: neither is a file whose
/// content could have changed.
fn blob_at(repo: &gix::Repository, id: gix::Id<'_>, path: &str) -> Result<Option<ObjectId>> {
    let commit = repo.find_commit(id.detach()).map_err(walk_err)?;
    let tree = commit.tree().map_err(walk_err)?;

    let entry = tree
        .lookup_entry_by_path(std::path::Path::new(path))
        .map_err(walk_err)?;

    Ok(entry
        .filter(|entry| entry.mode().is_blob_or_symlink())
        .map(|entry| entry.object_id()))
}

fn walk_err(e: impl std::fmt::Display) -> Error {
    Error::Walk(e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;
    use crate::graph::all_tips;

    /// Every match, as full ids, in the order the walk produced them.
    fn ids(fixture: &Fixture, query: &Query) -> Vec<String> {
        let repo = fixture.open();
        let refs = RefIndex::build(&repo).expect("refs");
        let tips = all_tips(&repo).expect("tips");

        let mut out = Vec::new();
        walk(&repo, tips, &refs, query, |row| {
            out.push(row.id);
            Flow::Continue
        })
        .expect("walk");
        out
    }

    /// What `git log` says, for the same question asked the other way.
    ///
    /// `--branches --remotes HEAD` and not `--all`, because `--all` includes
    /// `refs/stash` and `graph::all_tips` does not: a stash is not a commit
    /// anyone is looking for in a log search, and the two sides have to be
    /// asked about the same history for the comparison to mean anything.
    fn git_ids(fixture: &Fixture, args: &[&str]) -> Vec<String> {
        let mut full = vec!["log", "--branches", "--remotes", "HEAD", "--format=%H"];
        full.extend_from_slice(args);
        fixture
            .git(&full)
            .lines()
            .map(str::to_string)
            .collect::<Vec<_>>()
    }

    /// Assert two walks found the same commits.
    ///
    /// Compared as sets rather than as sequences. Both orders are "newest
    /// first" — there is a separate test for that — but a fixture builds its
    /// commits inside one second, and two commits sharing a timestamp have no
    /// defined order relative to each other. Asserting the sequence would be
    /// asserting that git and gix break that tie the same way, which neither
    /// promises and which is not what this test is about.
    fn assert_same_commits(mine: &[String], git: &[String], what: &str) {
        let mut mine_sorted = mine.to_vec();
        let mut git_sorted = git.to_vec();
        mine_sorted.sort();
        git_sorted.sort();

        assert_eq!(mine_sorted, git_sorted, "for {what}");
    }

    fn query() -> Query {
        Query::default()
    }

    #[test]
    fn an_author_filter_returns_what_git_log_author_returns() {
        let fixture = Fixture::woven();
        fixture.git(&["config", "user.name", "Grace Hopper"]);
        fixture.git(&["config", "user.email", "grace@example.com"]);
        fixture.write("grace.txt", "hers\n");
        fixture.git(&["add", "grace.txt"]);
        fixture.commit("Grace's commit");

        let mine = ids(
            &fixture,
            &Query {
                author: Some("grace".into()),
                ..query()
            },
        );

        assert_same_commits(
            &mine,
            &git_ids(&fixture, &["-i", "--author=grace"]),
            "author:grace",
        );
        assert_eq!(mine.len(), 1);
    }

    #[test]
    fn a_message_filter_returns_what_git_log_grep_returns() {
        let fixture = Fixture::woven();

        let mine = ids(
            &fixture,
            &Query {
                message: Some("line".into()),
                ..query()
            },
        );

        assert_same_commits(
            &mine,
            &git_ids(&fixture, &["-i", "--fixed-strings", "--grep=line"]),
            "message:line",
        );
        assert!(
            mine.len() >= 2,
            "the fixture has two 'Rewrite line' commits"
        );
    }

    #[test]
    fn a_message_filter_reads_the_body_and_not_only_the_subject() {
        let fixture = Fixture::woven();
        fixture.write("body.txt", "x\n");
        fixture.git(&["add", "body.txt"]);
        fixture.git(&["commit", "-q", "-m", "Subject", "-m", "closes ISSUE-42"]);

        let mine = ids(
            &fixture,
            &Query {
                message: Some("ISSUE-42".into()),
                ..query()
            },
        );

        assert_eq!(mine.len(), 1);
    }

    #[test]
    fn a_path_filter_returns_what_git_log_for_that_path_returns() {
        // The rule is git's own: a commit TREESAME to any parent is simplified
        // away, which is what stops a merge being listed for a change it only
        // carried across. Comparing against the first parent alone would list
        // merges git does not.
        let fixture = Fixture::woven();

        for path in [
            "core.txt",
            "notes.md",
            "split.txt",
            "src/deep/nested/main.rs",
        ] {
            let mine = ids(
                &fixture,
                &Query {
                    path: Some(path.into()),
                    ..query()
                },
            );

            assert_same_commits(&mine, &git_ids(&fixture, &["--", path]), path);
        }
    }

    #[test]
    fn a_path_that_no_commit_touched_returns_nothing_rather_than_everything() {
        let fixture = Fixture::woven();

        let mine = ids(
            &fixture,
            &Query {
                path: Some("never/existed.txt".into()),
                ..query()
            },
        );

        assert!(mine.is_empty());
    }

    #[test]
    fn a_date_range_returns_what_git_log_since_and_until_return() {
        let fixture = Fixture::woven();
        let head_time: i64 = fixture
            .git(&["log", "-1", "--format=%at"])
            .trim()
            .parse()
            .expect("a timestamp");

        let mine = ids(
            &fixture,
            &Query {
                since: Some(head_time),
                ..query()
            },
        );

        assert_same_commits(
            &mine,
            &git_ids(&fixture, &[&format!("--since={head_time}")]),
            "since is inclusive at the boundary, the way git's is",
        );
    }

    #[test]
    fn filters_compose_as_and() {
        let fixture = Fixture::woven();

        let message_only = ids(
            &fixture,
            &Query {
                message: Some("line".into()),
                ..query()
            },
        );
        let with_path = ids(
            &fixture,
            &Query {
                message: Some("line".into()),
                path: Some("core.txt".into()),
                ..query()
            },
        );
        // The two "Rewrite line" commits both touch core.txt, so that pairing
        // does not narrow. notes.md is the one they do not touch.
        let contradictory = ids(
            &fixture,
            &Query {
                message: Some("line".into()),
                path: Some("notes.md".into()),
                ..query()
            },
        );

        for id in &with_path {
            assert!(message_only.contains(id), "AND only ever removes rows");
        }
        assert!(!message_only.is_empty());
        assert!(
            contradictory.is_empty(),
            "two filters no commit satisfies together return nothing, not either one's rows"
        );
    }

    #[test]
    fn matching_ignores_case() {
        let fixture = Fixture::woven();

        assert_eq!(
            ids(
                &fixture,
                &Query {
                    message: Some("REWRITE".into()),
                    ..query()
                }
            ),
            ids(
                &fixture,
                &Query {
                    message: Some("rewrite".into()),
                    ..query()
                }
            )
        );
    }

    #[test]
    fn a_blank_filter_is_not_a_filter() {
        // A chip left empty must behave as if it were not there, rather than
        // matching everything and looking deliberate.
        let fixture = Fixture::woven();

        let blank = Query {
            author: Some("   ".into()),
            message: Some(String::new()),
            ..query()
        };

        assert!(blank.is_empty());
        assert_eq!(ids(&fixture, &blank), ids(&fixture, &query()));
    }

    #[test]
    fn results_are_newest_first_and_numbered_by_position_in_the_result() {
        let fixture = Fixture::woven();
        let repo = fixture.open();
        let refs = RefIndex::build(&repo).expect("refs");
        let tips = all_tips(&repo).expect("tips");

        let mut rows = Vec::new();
        walk(
            &repo,
            tips,
            &refs,
            &Query {
                message: Some("line".into()),
                ..query()
            },
            |row| {
                rows.push(row);
                Flow::Continue
            },
        )
        .expect("walk");

        assert_eq!(
            rows.iter().map(|r| r.index).collect::<Vec<_>>(),
            (0..rows.len()).collect::<Vec<_>>(),
            "index is position in the result, not in history"
        );
        for pair in rows.windows(2) {
            assert!(pair[0].time >= pair[1].time, "newest first");
        }
    }

    #[test]
    fn a_row_carries_what_the_screen_draws() {
        let fixture = Fixture::woven();
        let repo = fixture.open();
        let refs = RefIndex::build(&repo).expect("refs");
        let tips = all_tips(&repo).expect("tips");

        let mut first = None;
        walk(
            &repo,
            tips,
            &refs,
            &Query {
                message: Some("Merge".into()),
                ..query()
            },
            |row| {
                first = Some(row);
                Flow::Stop
            },
        )
        .expect("walk");

        let row = first.expect("a match");
        assert_eq!(row.author_name, "Ada Lovelace");
        assert_eq!(row.author_email, "ada@example.com");
        assert_eq!(row.initials, "AL");
        assert_eq!(row.short.len(), 7);
        assert!(
            row.refs.iter().any(|chip| chip.name == "main"),
            "the merge is main's tip, so it carries main's chip"
        );
    }

    #[test]
    fn the_sink_can_stop_the_walk() {
        // This is what makes a query cancellable: a search over a large
        // repository has no natural end until history does.
        let fixture = Fixture::woven();
        let repo = fixture.open();
        let refs = RefIndex::build(&repo).expect("refs");
        let tips = all_tips(&repo).expect("tips");

        let mut seen = 0;
        let total = walk(&repo, tips, &refs, &query(), |_| {
            seen += 1;
            Flow::Stop
        })
        .expect("walk");

        assert_eq!(seen, 1);
        assert_eq!(total, 1);
    }

    #[test]
    fn a_repository_with_no_commits_is_refused_rather_than_searched() {
        let fixture = Fixture::empty();
        let repo = fixture.open();
        let refs = RefIndex::build(&repo).expect("refs");

        let result = walk(&repo, Vec::new(), &refs, &query(), |_| Flow::Continue);

        assert!(matches!(result, Err(Error::EmptyRepository)));
    }

    #[test]
    fn an_empty_query_says_so() {
        assert!(query().is_empty());
        assert!(!Query {
            message: Some("x".into()),
            ..query()
        }
        .is_empty());
        assert!(!Query {
            since: Some(0),
            ..query()
        }
        .is_empty());
    }

    #[test]
    fn the_narrowest_filter_is_named_for_an_empty_result_to_point_at() {
        assert_eq!(query().narrowest(), None);
        assert_eq!(
            Query {
                author: Some("ada".into()),
                since: Some(1),
                ..query()
            }
            .narrowest(),
            Some("author:ada".to_string()),
            "an author is narrower than a date"
        );
        assert_eq!(
            Query {
                author: Some("ada".into()),
                path: Some("core.txt".into()),
                message: Some("line".into()),
                ..query()
            }
            .narrowest(),
            Some("path:core.txt".to_string()),
            "a path is the most specific thing anyone types"
        );
    }

    #[test]
    fn diff_content_filter_matches_commits_modifying_matching_lines() {
        let fixture = Fixture::woven();
        let repo = fixture.open();
        let refs = RefIndex::build(&repo).expect("refs");
        let tips = all_tips(&repo).expect("tips");

        let mut rows = Vec::new();
        walk(
            &repo,
            tips,
            &refs,
            &Query {
                diff_content: Some("LINE THREE".into()),
                ..query()
            },
            |row| {
                rows.push(row);
                Flow::Continue
            },
        )
        .expect("walk");

        assert!(!rows.is_empty());
        assert!(rows.iter().any(|r| r.summary == "Rewrite line 3"));
    }
}
