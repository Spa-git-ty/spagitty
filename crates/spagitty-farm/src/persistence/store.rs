// SPDX-License-Identifier: GPL-3.0-or-later

//! The farm on disk.
//!
//! # Why this is JSON files and not SQLite
//!
//! The plan recommends SQLite, for transactional updates, crash recovery,
//! history and querying. Three of those four are real needs and the fourth is
//! not, at this size — a farm has a dozen tasks and a few hundred events, and
//! the "query" is "show me all of them".
//!
//! Against that: SQLite is a C library, a licence to review in `deny.toml`, a
//! build-time dependency on every platform Spagitty ships to, and a schema
//! migration story for a desktop application that currently has none. The rest
//! of Spagitty's own state — recent repositories, settings, identity profiles —
//! is JSON in the config directory, and a farm that needed a database beside
//! them would be the only thing in the product that did.
//!
//! So: JSON, with the three needs met directly.
//!
//! * **Transactional** — every write goes to a temporary file and is renamed
//!   over the target. `rename` within a directory is atomic on every filesystem
//!   Spagitty supports, so a farm is never half-written, and a crash mid-write
//!   leaves the previous state intact rather than a truncated file.
//! * **Crash recovery** — the farm is written after every state change, so what
//!   is on disk is what was true at the last transition. [`crate::service`]
//!   reconciles it against the worktrees at startup.
//! * **History** — events are appended to a separate log file, one JSON object
//!   per line, which is a format that cannot be corrupted by a crash in the
//!   middle of an append: the partial last line is dropped on read.
//!
//! If a farm ever grows to the size where this hurts, the answer is a `Store`
//! trait with a second implementation — and the shape here is already that
//! trait's shape.
//!
//! # Where
//!
//! Inside the repository, under the same excluded directory as the worktrees,
//! so a repository carries its own farm and deleting the repository deletes it.
//! It is *not* committed: `.spagitty/` is added to `.git/info/exclude`.

use std::path::{Path, PathBuf};

use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::error::Result;
use crate::model::{Farm, FarmEvent};
use crate::workspace::worktree::FARM_DIR;

/// How many events are kept.
///
/// Two thousand. A farm's activity list is read by scrolling, not searching,
/// and the file is trimmed on write rather than growing until somebody notices
/// a repository with a hundred-megabyte log in it.
pub const MAX_EVENTS: usize = 2_000;

const FARM_FILE: &str = "farm.json";
const EVENTS_FILE: &str = "events.jsonl";
const REGISTRY_FILE: &str = "agents.json";

/// The directory a repository's farm state lives in.
pub fn directory(repo: &Path) -> PathBuf {
    repo.join(FARM_DIR).join("farm")
}

pub fn farm_path(repo: &Path) -> PathBuf {
    directory(repo).join(FARM_FILE)
}

pub fn events_path(repo: &Path) -> PathBuf {
    directory(repo).join(EVENTS_FILE)
}

/// The agent registry.
///
/// Per repository rather than per machine, deliberately. Which agents exist is
/// a fact about the machine and is re-detected; which of them this project
/// should use, with which capabilities and which extra flags, is a fact about
/// the project.
pub fn registry_path(repo: &Path) -> PathBuf {
    directory(repo).join(REGISTRY_FILE)
}

/// Read the saved farm, or nothing.
///
/// A file that does not parse reads as no farm rather than as an error — the
/// same treatment `settings.json` and `repositories.json` get, and for the same
/// reason: a hand-edited or truncated file must not stop the application
/// starting. The farm is recoverable from the worktrees and branches, which are
/// the authoritative record anyway.
pub fn load_farm(repo: &Path) -> Option<Farm> {
    read_json(&farm_path(repo))
}

pub fn save_farm(repo: &Path, farm: &Farm) -> Result<()> {
    write_json(&farm_path(repo), farm)
}

/// Forget the farm, leaving its events and worktrees alone.
pub fn clear_farm(repo: &Path) {
    let _ = std::fs::remove_file(farm_path(repo));
}

pub fn load_registry<T: DeserializeOwned>(repo: &Path) -> Option<T> {
    read_json(&registry_path(repo))
}

pub fn save_registry<T: Serialize>(repo: &Path, registry: &T) -> Result<()> {
    write_json(&registry_path(repo), registry)
}

/// Append one event.
///
/// Transcript lines are not stored: they are already in the run's own log file,
/// there are thousands of them, and they would push everything else out of the
/// bounded history within one agent run.
pub fn append_event(repo: &Path, event: &FarmEvent) -> Result<()> {
    if event.is_transcript() {
        return Ok(());
    }
    let path = events_path(repo);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let line = serde_json::to_string(event)?;

    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)?;
    writeln!(file, "{line}")?;
    Ok(())
}

/// Every event, oldest first.
///
/// A line that does not parse is skipped rather than fatal: the last line of a
/// log that was being written when the process died is exactly that case, and
/// losing one event must not lose the other nineteen hundred.
pub fn load_events(repo: &Path) -> Vec<FarmEvent> {
    let Ok(text) = std::fs::read_to_string(events_path(repo)) else {
        return Vec::new();
    };
    let events: Vec<FarmEvent> = text
        .lines()
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect();
    let from = events.len().saturating_sub(MAX_EVENTS);
    events[from..].to_vec()
}

/// Rewrite the log with only the most recent [`MAX_EVENTS`].
///
/// Called when the farm is saved, not on every append: rewriting a file per
/// event would turn an append into a copy of the whole log.
pub fn trim_events(repo: &Path) -> Result<()> {
    let path = events_path(repo);
    let Ok(text) = std::fs::read_to_string(&path) else {
        return Ok(());
    };
    let lines: Vec<&str> = text
        .lines()
        .filter(|line| !line.trim().is_empty())
        .collect();
    if lines.len() <= MAX_EVENTS {
        return Ok(());
    }
    let kept = lines[lines.len() - MAX_EVENTS..].join("\n");
    atomic_write(&path, &format!("{kept}\n"))
}

/// Remove everything the farm wrote for this repository.
///
/// Worktrees are *not* removed here — they are git's, and removing them means
/// asking git. See [`crate::workspace::cleanup`].
pub fn forget(repo: &Path) {
    let _ = std::fs::remove_file(farm_path(repo));
    let _ = std::fs::remove_file(events_path(repo));
}

fn read_json<T: DeserializeOwned>(path: &Path) -> Option<T> {
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    // Pretty rather than compact: this is a file a person may open when they
    // want to know what the farm thinks is happening, and the size difference
    // at a dozen tasks is nothing.
    atomic_write(path, &serde_json::to_string_pretty(value)?)
}

/// Write via a temporary file and a rename.
///
/// The temporary file is in the *same directory*, because `rename` is only
/// atomic within a filesystem and a temporary directory may be on another one.
fn atomic_write(path: &Path, contents: &str) -> Result<()> {
    let parent = path.parent().unwrap_or(Path::new("."));
    std::fs::create_dir_all(parent)?;
    let temporary = parent.join(format!(
        ".{}.tmp",
        path.file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| "farm".into())
    ));
    std::fs::write(&temporary, contents)?;
    match std::fs::rename(&temporary, path) {
        Ok(()) => Ok(()),
        Err(error) => {
            // Leaving a stray temporary file behind would make the next write
            // fail in a way that reads as a permissions problem.
            let _ = std::fs::remove_file(&temporary);
            Err(error.into())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{task_id, FarmId, FarmStatus, Goal, GoalId, Task, TaskId, TaskStatus};

    fn farm() -> Farm {
        let mut farm = Farm::new(
            FarmId::new("f1"),
            "/repo",
            Goal::new(GoalId::new("g1"), "Add OAuth", 0),
            1_000,
        );
        farm.tasks.push(Task::new(task_id(1), "Investigate", 1_000));
        farm
    }

    #[test]
    fn a_repository_with_no_farm_loads_nothing() {
        let dir = tempfile::tempdir().unwrap();
        assert!(load_farm(dir.path()).is_none());
        assert!(load_events(dir.path()).is_empty());
    }

    #[test]
    fn a_farm_survives_being_saved_and_loaded() {
        let dir = tempfile::tempdir().unwrap();
        save_farm(dir.path(), &farm()).unwrap();
        let loaded = load_farm(dir.path()).unwrap();
        assert_eq!(loaded, farm());
    }

    #[test]
    fn the_farm_lands_inside_the_excluded_directory() {
        let dir = tempfile::tempdir().unwrap();
        save_farm(dir.path(), &farm()).unwrap();
        assert!(dir.path().join(".spagitty/farm/farm.json").exists());
    }

    #[test]
    fn a_corrupt_farm_reads_as_no_farm_rather_than_stopping_the_application() {
        let dir = tempfile::tempdir().unwrap();
        save_farm(dir.path(), &farm()).unwrap();
        std::fs::write(farm_path(dir.path()), "{ not json").unwrap();
        assert!(load_farm(dir.path()).is_none());
    }

    #[test]
    fn a_write_leaves_no_temporary_file_behind() {
        let dir = tempfile::tempdir().unwrap();
        save_farm(dir.path(), &farm()).unwrap();
        let strays: Vec<_> = std::fs::read_dir(directory(dir.path()))
            .unwrap()
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp"))
            .collect();
        assert!(strays.is_empty(), "{strays:?}");
    }

    #[test]
    fn saving_twice_replaces_rather_than_appends() {
        let dir = tempfile::tempdir().unwrap();
        save_farm(dir.path(), &farm()).unwrap();
        let mut second = farm();
        second.status = FarmStatus::Running;
        save_farm(dir.path(), &second).unwrap();
        assert_eq!(load_farm(dir.path()).unwrap().status, FarmStatus::Running);
    }

    #[test]
    fn events_are_appended_in_order() {
        let dir = tempfile::tempdir().unwrap();
        for number in 1..=3 {
            append_event(
                dir.path(),
                &FarmEvent::TaskCreated {
                    task: task_id(number),
                    title: format!("task {number}"),
                },
            )
            .unwrap();
        }
        let events = load_events(dir.path());
        assert_eq!(events.len(), 3);
        assert_eq!(events[0].task(), Some(&task_id(1)));
        assert_eq!(events[2].task(), Some(&task_id(3)));
    }

    #[test]
    fn transcript_lines_are_not_stored() {
        // One agent run would otherwise push every other event out of history.
        let dir = tempfile::tempdir().unwrap();
        append_event(
            dir.path(),
            &FarmEvent::AgentOutput {
                run: crate::model::RunId::new("r1"),
                task: task_id(1),
                line: "reading files".into(),
            },
        )
        .unwrap();
        assert!(load_events(dir.path()).is_empty());
    }

    #[test]
    fn a_half_written_last_line_does_not_lose_the_log() {
        let dir = tempfile::tempdir().unwrap();
        append_event(
            dir.path(),
            &FarmEvent::TaskCreated {
                task: task_id(1),
                title: "kept".into(),
            },
        )
        .unwrap();
        // What a crash mid-append leaves behind.
        std::fs::write(
            events_path(dir.path()),
            format!(
                "{}\n{{\"kind\":\"taskCr",
                std::fs::read_to_string(events_path(dir.path()))
                    .unwrap()
                    .trim()
            ),
        )
        .unwrap();

        let events = load_events(dir.path());
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn only_the_most_recent_events_are_read() {
        let dir = tempfile::tempdir().unwrap();
        for number in 0..(MAX_EVENTS + 50) {
            append_event(
                dir.path(),
                &FarmEvent::TaskCreated {
                    task: TaskId::new(format!("TASK-{number:05}")),
                    title: String::new(),
                },
            )
            .unwrap();
        }
        let events = load_events(dir.path());
        assert_eq!(events.len(), MAX_EVENTS);
        // The end of the log, not the beginning.
        assert_eq!(
            events.last().unwrap().task(),
            Some(&TaskId::new(format!("TASK-{:05}", MAX_EVENTS + 49)))
        );
    }

    #[test]
    fn trimming_shrinks_the_file_on_disk() {
        let dir = tempfile::tempdir().unwrap();
        for number in 0..(MAX_EVENTS + 100) {
            append_event(
                dir.path(),
                &FarmEvent::TaskCreated {
                    task: TaskId::new(format!("TASK-{number:05}")),
                    title: String::new(),
                },
            )
            .unwrap();
        }
        let before = std::fs::metadata(events_path(dir.path())).unwrap().len();
        trim_events(dir.path()).unwrap();
        let after = std::fs::metadata(events_path(dir.path())).unwrap().len();
        assert!(after < before);
        assert_eq!(load_events(dir.path()).len(), MAX_EVENTS);
    }

    #[test]
    fn trimming_a_short_log_leaves_it_alone() {
        let dir = tempfile::tempdir().unwrap();
        append_event(
            dir.path(),
            &FarmEvent::TaskCreated {
                task: task_id(1),
                title: String::new(),
            },
        )
        .unwrap();
        trim_events(dir.path()).unwrap();
        assert_eq!(load_events(dir.path()).len(), 1);
    }

    #[test]
    fn forgetting_removes_the_farm_and_its_history() {
        let dir = tempfile::tempdir().unwrap();
        save_farm(dir.path(), &farm()).unwrap();
        append_event(
            dir.path(),
            &FarmEvent::FarmStatusChanged {
                status: FarmStatus::Running,
            },
        )
        .unwrap();

        forget(dir.path());
        assert!(load_farm(dir.path()).is_none());
        assert!(load_events(dir.path()).is_empty());
    }

    #[test]
    fn a_farm_saved_mid_run_records_what_was_true_at_the_transition() {
        // The crash-recovery contract: what is on disk is the last transition.
        let dir = tempfile::tempdir().unwrap();
        let mut farm = farm();
        farm.tasks[0].status = TaskStatus::Running;
        farm.tasks[0].worktree = Some("/repo/.spagitty/farm/worktrees/task-0001".into());
        save_farm(dir.path(), &farm).unwrap();

        let loaded = load_farm(dir.path()).unwrap();
        assert_eq!(loaded.tasks[0].status, TaskStatus::Running);
        assert!(loaded.tasks[0].worktree.is_some());
    }
}
