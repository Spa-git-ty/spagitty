// SPDX-License-Identifier: GPL-3.0-or-later

//! Bringing a repository in.
//!
//! Two pure things and no process: where a URL and a parent directory say the
//! clone will land, and what git's progress output means. The clone itself is
//! [`crate::shell::clone_start`], because it needs credential helpers — see the
//! header of [`crate::shell`] for why that is not reimplemented here.
//!
//! The destination is computed *before* anything runs and is what the screen
//! shows. A clone that puts a repository somewhere other than where the user
//! was told is a repository they will not find again.

use std::path::{Path, PathBuf};

use serde::Serialize;

/// Why a clone cannot start.
///
/// Each of these is knowable without touching the network, so the user is told
/// while they are typing rather than after a round trip.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind", content = "detail")]
pub enum Problem {
    /// Nothing has been typed yet. Not an error, just not ready.
    NoUrl,
    /// No repository name can be derived from the URL.
    UnusableUrl,
    /// No parent directory has been chosen yet.
    NoParent,
    /// The chosen parent is not a directory that exists.
    MissingParent(String),
    /// The destination exists and has something in it.
    ///
    /// An existing *empty* directory is fine, because `git clone` allows it.
    /// Matching git's own rule rather than inventing a stricter one is what
    /// makes a Spagitty clone the same as a command-line clone.
    DestinationNotEmpty(String),
}

impl Problem {
    /// The sentence the screen shows. The core owns this text because the
    /// distinctions above are the core's, and a screen paraphrasing them would
    /// be a second, divergent explanation.
    pub fn message(&self) -> String {
        match self {
            Problem::NoUrl => "Paste the address of the repository to clone.".into(),
            Problem::UnusableUrl => {
                "No repository name can be read from that address. It should end in the \
                 repository's name."
                    .into()
            }
            Problem::NoParent => "Choose the folder to clone into.".into(),
            Problem::MissingParent(path) => format!("{path} is not a folder that exists."),
            Problem::DestinationNotEmpty(path) => {
                format!("{path} already exists and is not empty. Nothing has been changed.")
            }
        }
    }
}

/// Where a clone would land, and what is wrong with that.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Plan {
    /// The repository name derived from the URL, as `git clone` would derive it.
    pub name: Option<String>,
    /// The exact path that will be created. `None` while the plan is unusable.
    pub destination: Option<PathBuf>,
    /// True when the destination does not exist yet, so cancelling may remove
    /// it. Decided here, before anything runs, and never re-derived afterwards.
    pub creates_destination: bool,
    pub problem: Option<Problem>,
    /// [`Problem::message`] for `problem`, carried on the wire.
    ///
    /// The distinctions above are the core's, so the sentences explaining them
    /// are too. A screen paraphrasing them would be a second explanation, free
    /// to drift from the rule it is describing.
    pub message: Option<String>,
}

impl Plan {
    pub fn is_runnable(&self) -> bool {
        self.problem.is_none() && self.destination.is_some()
    }

    fn with(
        name: Option<String>,
        destination: Option<PathBuf>,
        creates: bool,
        problem: Option<Problem>,
    ) -> Plan {
        Plan {
            name,
            destination,
            creates_destination: creates,
            message: problem.as_ref().map(Problem::message),
            problem,
        }
    }
}

/// Work out where `url` would be cloned to under `parent`.
///
/// Reads the filesystem — whether the destination exists, and whether it is
/// empty — and writes nothing.
pub fn plan(url: &str, parent: &Path) -> Plan {
    let unusable = |problem: Problem| Plan::with(None, None, false, Some(problem));

    let url = url.trim();
    if url.is_empty() {
        return unusable(Problem::NoUrl);
    }
    let Some(name) = repository_name(url) else {
        return unusable(Problem::UnusableUrl);
    };
    if parent.as_os_str().is_empty() {
        return unusable(Problem::NoParent);
    }
    if !parent.is_dir() {
        return unusable(Problem::MissingParent(parent.display().to_string()));
    }

    let destination = parent.join(&name);
    let exists = destination.exists();
    let occupied = exists && !is_empty_dir(&destination);

    Plan::with(
        Some(name),
        Some(destination.clone()),
        !exists,
        occupied.then(|| Problem::DestinationNotEmpty(destination.display().to_string())),
    )
}

/// The directory name `git clone` would choose for `url`.
///
/// The last path segment with a trailing `.git` removed, which is git's own
/// rule. Trailing slashes are ignored first, so `.../repo.git/` and `.../repo`
/// agree — as they do on the command line.
///
/// `scp`-style addresses (`git@host:owner/repo.git`) end up at the same answer
/// without a special case, because the name is the last segment either way.
pub fn repository_name(url: &str) -> Option<String> {
    let trimmed = url.trim().trim_end_matches('/');
    let last = trimmed
        .rsplit(['/', ':'])
        .find(|segment| !segment.is_empty())?;

    let name = last.strip_suffix(".git").unwrap_or(last);
    // A name that is only dots would escape the parent directory, and a name
    // with a separator in it is not a name.
    if name.is_empty() || name.chars().all(|c| c == '.') || name.contains(['/', '\\']) {
        return None;
    }
    Some(name.to_string())
}

/// True for a directory with nothing in it. False for anything unreadable,
/// which is treated as occupied — refusing is the safe way to be wrong.
fn is_empty_dir(path: &Path) -> bool {
    match std::fs::read_dir(path) {
        Ok(mut entries) => entries.next().is_none(),
        Err(_) => false,
    }
}

/// One step of git's own progress reporting.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    /// The phase git named: `Receiving objects`, `Resolving deltas`, …
    pub phase: String,
    /// 0–100 where git reported one.
    pub percent: Option<u8>,
    /// The line as git wrote it, minus the `remote: ` prefix and the carriage
    /// return. Shown when there is no percentage, because git's own words beat
    /// anything invented in their place.
    pub line: String,
}

/// Read one line of `git clone --progress` output.
///
/// Returns `None` for a blank line only. Everything else becomes a `Progress` —
/// an unrecognised line still carries git's words, so a change to a format git
/// does not promise degrades to "no percentage" rather than "no progress".
pub fn progress(line: &str) -> Option<Progress> {
    let line = line.trim().trim_start_matches("remote:").trim();
    if line.is_empty() {
        return None;
    }

    let (phase, rest) = match line.split_once(':') {
        Some((phase, rest)) => (phase.trim().to_string(), rest.trim()),
        None => (line.to_string(), ""),
    };

    Some(Progress {
        phase,
        percent: percentage(rest),
        line: line.to_string(),
    })
}

/// The `57%` in `Receiving objects:  57% (123/456), 1.2 MiB`.
///
/// The digits immediately before the first `%`, and nothing else: a count like
/// `(123/456)` is not a percentage and neither is a `101%` that git would never
/// print.
fn percentage(rest: &str) -> Option<u8> {
    let (before, _) = rest.split_once('%')?;

    let backwards: String = before
        .chars()
        .rev()
        .take_while(char::is_ascii_digit)
        .collect();
    let digits: String = backwards.chars().rev().collect();

    digits.parse::<u8>().ok().filter(|percent| *percent <= 100)
}

/// Whether `next` is worth telling the screen about.
///
/// `git clone --progress` rewrites its line hundreds of times a second, and one
/// event per write would flood the webview to say the same thing. A step is new
/// when the phase changed or the percentage moved; anything else is the same
/// picture drawn again.
pub fn is_new_step(last: Option<&Progress>, next: &Progress) -> bool {
    match last {
        None => true,
        Some(last) => last.phase != next.phase || last.percent != next.percent,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp() -> tempfile::TempDir {
        tempfile::tempdir().expect("temp dir")
    }

    #[test]
    fn the_name_is_the_last_segment_the_way_git_clone_derives_it() {
        for (url, expected) in [
            ("https://example.com/owner/project.git", "project"),
            ("https://example.com/owner/project", "project"),
            ("https://example.com/owner/project.git/", "project"),
            ("git@example.com:owner/project.git", "project"),
            ("ssh://git@example.com:22/owner/project.git", "project"),
            ("/srv/mirrors/project.git", "project"),
            ("file:///srv/mirrors/project", "project"),
            ("project.git", "project"),
        ] {
            assert_eq!(repository_name(url).as_deref(), Some(expected), "for {url}");
        }
    }

    #[test]
    fn a_name_that_would_escape_the_chosen_folder_is_refused() {
        // The destination is `parent.join(name)`, so a name of `..` would put
        // the clone somewhere the user was not shown.
        for url in ["", "   ", "/", "https://example.com/..", "..", "/.git"] {
            assert_eq!(repository_name(url), None, "for {url:?}");
        }
    }

    #[test]
    fn an_empty_address_is_not_ready_rather_than_wrong() {
        let plan = plan("", temp().path());

        assert_eq!(plan.problem, Some(Problem::NoUrl));
        assert!(!plan.is_runnable());
    }

    #[test]
    fn an_address_with_no_name_in_it_says_so() {
        for url in ["/", ".git", "..", "///"] {
            let plan = plan(url, temp().path());

            assert_eq!(plan.problem, Some(Problem::UnusableUrl), "for {url:?}");
        }
    }

    #[test]
    fn a_bare_host_gives_the_host_as_the_name_the_way_git_clone_does() {
        // Not a special case: `git clone https://example.com/` clones into
        // `example.com`. Refusing it here would make Spagitty stricter than the
        // command line for no reason the user could see.
        let parent = temp();
        let plan = plan("https://example.com/", parent.path());

        assert_eq!(plan.name.as_deref(), Some("example.com"));
        assert!(plan.is_runnable());
    }

    #[test]
    fn a_parent_that_is_not_there_is_refused_before_anything_runs() {
        let plan = plan(
            "https://example.com/owner/project.git",
            Path::new("/nowhere/at/all"),
        );

        assert!(matches!(plan.problem, Some(Problem::MissingParent(_))));
    }

    #[test]
    fn no_parent_chosen_yet_is_its_own_state() {
        let plan = plan("https://example.com/owner/project.git", Path::new(""));

        assert_eq!(plan.problem, Some(Problem::NoParent));
    }

    #[test]
    fn the_destination_is_the_exact_path_that_will_be_created() {
        // Criterion 2. A clone that lands somewhere other than what the screen
        // said is a repository the user will not find again.
        let parent = temp();
        let plan = plan("https://example.com/owner/project.git", parent.path());

        assert_eq!(plan.name.as_deref(), Some("project"));
        assert_eq!(plan.destination, Some(parent.path().join("project")));
        assert!(plan.creates_destination);
        assert!(plan.is_runnable());
    }

    #[test]
    fn an_existing_non_empty_destination_is_refused() {
        // Criterion 3.
        let parent = temp();
        std::fs::create_dir(parent.path().join("project")).expect("destination");
        std::fs::write(parent.path().join("project/keep.txt"), "work").expect("a file in it");

        let plan = plan("https://example.com/owner/project.git", parent.path());

        assert!(matches!(
            plan.problem,
            Some(Problem::DestinationNotEmpty(_))
        ));
        assert!(!plan.is_runnable());
        assert!(!plan.creates_destination, "it is already there");
    }

    #[test]
    fn an_existing_empty_destination_is_allowed_because_git_allows_it() {
        let parent = temp();
        std::fs::create_dir(parent.path().join("project")).expect("destination");

        let plan = plan("https://example.com/owner/project.git", parent.path());

        assert_eq!(plan.problem, None);
        assert!(plan.is_runnable());
        assert!(
            !plan.creates_destination,
            "the directory was the user's, so cancelling must not remove it"
        );
    }

    #[test]
    fn every_problem_says_something_specific() {
        let problems = [
            Problem::NoUrl,
            Problem::UnusableUrl,
            Problem::NoParent,
            Problem::MissingParent("/nowhere".into()),
            Problem::DestinationNotEmpty("/tmp/project".into()),
        ];
        let messages: Vec<String> = problems.iter().map(Problem::message).collect();

        assert_eq!(
            messages
                .iter()
                .collect::<std::collections::HashSet<_>>()
                .len(),
            problems.len()
        );
        assert!(messages.iter().all(|message| message.ends_with('.')));
        assert!(messages[4].contains("Nothing has been changed"));
    }

    #[test]
    fn a_progress_line_carries_its_phase_and_its_percentage() {
        let step = progress("Receiving objects:  57% (123/456), 1.20 MiB | 2.00 MiB/s").unwrap();

        assert_eq!(step.phase, "Receiving objects");
        assert_eq!(step.percent, Some(57));
    }

    #[test]
    fn the_remote_prefix_is_gits_own_and_is_not_part_of_the_phase() {
        let step = progress("remote: Counting objects: 100% (24/24), done.").unwrap();

        assert_eq!(step.phase, "Counting objects");
        assert_eq!(step.percent, Some(100));
    }

    #[test]
    fn a_line_with_no_percentage_still_carries_gits_words() {
        // "working…" is worse than whatever git actually said.
        let step = progress("Cloning into 'project'...").unwrap();

        assert_eq!(step.percent, None);
        assert!(step.line.contains("Cloning into"));
    }

    #[test]
    fn the_same_step_reported_again_is_not_worth_an_event() {
        // git rewrites its progress line hundreds of times a second. One event
        // per write would flood the webview to say the same thing.
        let step = progress("Receiving objects:  57% (123/456)").unwrap();
        let again = progress("Receiving objects:  57% (200/456), 1.20 MiB").unwrap();
        let moved = progress("Receiving objects:  58% (260/456)").unwrap();
        let next_phase = progress("Resolving deltas:  57% (1/3)").unwrap();

        assert!(is_new_step(None, &step), "the first step always counts");
        assert!(!is_new_step(Some(&step), &again));
        assert!(is_new_step(Some(&step), &moved));
        assert!(is_new_step(Some(&step), &next_phase));
    }

    #[test]
    fn a_blank_line_is_not_progress() {
        assert_eq!(progress(""), None);
        assert_eq!(progress("   \r"), None);
        assert_eq!(progress("remote:"), None);
    }

    #[test]
    fn a_number_that_is_not_a_percentage_is_not_read_as_one() {
        assert_eq!(
            progress("Receiving objects: 123 objects").unwrap().percent,
            None
        );
        assert_eq!(progress("Unpacking: 101%").unwrap().percent, None);
    }

    #[test]
    fn each_phase_git_reports_during_a_clone_is_recognised() {
        for (line, phase, percent) in [
            (
                "remote: Enumerating objects: 42, done.",
                "Enumerating objects",
                None,
            ),
            (
                "remote: Compressing objects:  80% (8/10)",
                "Compressing objects",
                Some(80),
            ),
            (
                "Receiving objects: 100% (42/42), done.",
                "Receiving objects",
                Some(100),
            ),
            ("Resolving deltas:  33% (1/3)", "Resolving deltas", Some(33)),
            ("Updating files:  50% (5/10)", "Updating files", Some(50)),
        ] {
            let step = progress(line).unwrap_or_else(|| panic!("no progress for {line}"));
            assert_eq!(step.phase, phase, "for {line}");
            assert_eq!(step.percent, percent, "for {line}");
        }
    }
}
