// SPDX-License-Identifier: GPL-3.0-or-later

//! What GitLumiere actually ran.
//!
//! The Settings toggle "Show the git command behind each action" is answered
//! from here. The record is written by [`crate::shell`] — the one module that
//! spawns a process — rather than by the screen that asked for the operation,
//! because a screen can only report the command it *believes* it requested. It
//! would not know that a fetch carries `--prune --progress`, that a force push
//! is `--force-with-lease`, or that a revert of a merge gained `-m 1` on the
//! way down. A record composed anywhere but the spawn site is a claim; this one
//! is evidence.
//!
//! **Reads are absent on purpose.** Almost everything GitLumiere does — walking
//! the log, reading refs, diffing, status — happens in-process with `gix` and
//! has no command line at all. Nothing is synthesised for them: showing a
//! `git log` GitLumiere never ran would teach the user an invocation that does not
//! exist. The panel that renders this says so.
//!
//! # Shape
//!
//! A process-wide ring buffer of the last [`CAPACITY`] executions, plus one
//! optional observer so the Tauri layer can push each entry to the webview as
//! it happens instead of polling. The buffer is the source of truth; the
//! observer is a notification, and losing it costs nothing but latency.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

/// How many executions are kept. Bounded because a session that runs for a week
/// must not grow a buffer for a week; 200 is far more than anyone scrolls, and
/// the oldest entry leaving is not a loss — this is a window on recent work,
/// not an audit trail.
pub const CAPACITY: usize = 200;

/// Failures keep git's own message, truncated. The full text already reached
/// the user through [`crate::Error::Git`]; the log is not a second place to
/// accumulate output.
const STDERR_LIMIT: usize = 500;

/// How one execution ended.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Outcome {
    /// git exited zero.
    Ok,
    /// git exited non-zero. `code` is `None` when a signal killed it.
    #[serde(rename_all = "camelCase")]
    Failed { code: Option<i32>, stderr: String },
    /// The process was spawned and nobody waited for it — a clone, which
    /// reports progress for minutes and is cancellable. Recorded at spawn
    /// because a record that waited for the outcome would appear long after
    /// the user asked what was running.
    Started,
}

/// One `git` execution, as it happened.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Executed {
    /// Monotonic within the process, so a caller can ask for everything after
    /// what it already has without comparing clocks.
    pub seq: u64,
    /// Unix milliseconds, for display only.
    pub at_ms: u64,
    /// The whole command, `git` included, in the order it was spawned.
    /// Credentials are already redacted — see [`redact`].
    pub argv: Vec<String>,
    pub outcome: Outcome,
    /// Wall time. Zero for [`Outcome::Started`], which is not finished.
    pub duration_ms: u64,
}

impl Executed {
    /// The command as one line, for display and for pasting into a terminal.
    ///
    /// Arguments containing whitespace are quoted, because a commit message
    /// pasted back unquoted becomes several arguments and a different command.
    pub fn line(&self) -> String {
        self.argv
            .iter()
            .map(|argument| {
                if argument.is_empty() || argument.contains(char::is_whitespace) {
                    format!("\"{}\"", argument.replace('"', "\\\""))
                } else {
                    argument.clone()
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    }
}

type Observer = Box<dyn Fn(&Executed) + Send + Sync>;

fn log() -> &'static Mutex<VecDeque<Executed>> {
    static LOG: OnceLock<Mutex<VecDeque<Executed>>> = OnceLock::new();
    LOG.get_or_init(|| Mutex::new(VecDeque::with_capacity(CAPACITY)))
}

fn observer() -> &'static RwLock<Option<Observer>> {
    static OBSERVER: OnceLock<RwLock<Option<Observer>>> = OnceLock::new();
    OBSERVER.get_or_init(|| RwLock::new(None))
}

static NEXT_SEQ: AtomicU64 = AtomicU64::new(1);

/// Register the observer, called for every execution from the thread that ran
/// it. There is one, registered at startup by whoever owns the UI; registering
/// again replaces it. The handler must not block — it runs inside the operation
/// the user is waiting for.
pub fn observe(handler: Observer) {
    if let Ok(mut slot) = observer().write() {
        *slot = Some(handler);
    }
}

/// Record an execution and hand it to the observer.
///
/// `argv` arrives without `git`; it is prepended here so no caller can record a
/// line that does not name the program that ran.
pub(crate) fn push(argv: &[&str], outcome: Outcome, duration_ms: u64) {
    let entry = Executed {
        seq: NEXT_SEQ.fetch_add(1, Ordering::Relaxed),
        at_ms: now_ms(),
        argv: std::iter::once("git".to_string())
            .chain(argv.iter().map(|argument| redact(argument)))
            .collect(),
        outcome: truncate(outcome),
        duration_ms,
    };

    // A poisoned lock means some other thread panicked while recording. That is
    // not a reason to take the application down with it: the log is a
    // convenience, and the operation the user asked for has already run.
    if let Ok(mut entries) = log().lock() {
        while entries.len() >= CAPACITY {
            entries.pop_front();
        }
        entries.push_back(entry.clone());
    }

    if let Ok(slot) = observer().read() {
        if let Some(handler) = slot.as_ref() {
            handler(&entry);
        }
    }
}

/// Everything recorded after `since`, oldest first. `since` of 0 is everything
/// still held.
pub fn recent(since: u64) -> Vec<Executed> {
    log()
        .lock()
        .map(|entries| {
            entries
                .iter()
                .filter(|entry| entry.seq > since)
                .cloned()
                .collect()
        })
        .unwrap_or_default()
}

/// Forget everything recorded so far. The user's action, from the panel.
pub fn clear() {
    if let Ok(mut entries) = log().lock() {
        entries.clear();
    }
}

/// Strip credentials from an argument that is a URL.
///
/// `https://user:token@host/repo.git` is a perfectly ordinary clone URL and the
/// token in it is a live credential. Redaction happens on the way *into* the
/// buffer rather than on the way out to the screen: an entry that never held
/// the secret cannot leak it through a copy button, an export, or a future
/// reader of this module who forgets that display was doing the work.
///
/// Only the userinfo goes. The host and path are what make the line useful, and
/// they are not secret — they are in the repository's own config.
pub fn redact(argument: &str) -> String {
    let Some(separator) = argument.find("://") else {
        // scp-style SSH, `git@host:owner/repo.git`. The part before the `@` is
        // a username, never a secret — the key does the authenticating — so
        // there is nothing here to remove.
        return argument.to_string();
    };

    let (scheme, rest) = argument.split_at(separator + 3);
    let Some(at) = rest.find('@') else {
        return argument.to_string();
    };

    // A `@` after the first `/` belongs to the path, not to userinfo:
    // `https://host/repos/user@example.com` has no credentials in it.
    if rest[..at].contains('/') {
        return argument.to_string();
    }

    let userinfo = &rest[..at];
    let name = userinfo.split(':').next().unwrap_or_default();
    if userinfo.contains(':') {
        format!("{scheme}{name}:***@{}", &rest[at + 1..])
    } else {
        // A bare username with no password is not a credential, but it is also
        // not needed to identify the repository, and some hosts put a token
        // there alone. Kept, since removing it would misreport the command.
        argument.to_string()
    }
}

fn truncate(outcome: Outcome) -> Outcome {
    match outcome {
        Outcome::Failed { code, stderr } if stderr.len() > STDERR_LIMIT => {
            let cut = stderr
                .char_indices()
                .map(|(index, _)| index)
                .take_while(|index| *index <= STDERR_LIMIT)
                .last()
                .unwrap_or(0);
            Outcome::Failed {
                code,
                stderr: format!("{}…", &stderr[..cut]),
            }
        }
        other => other,
    }
}

/// Held by any test that asserts about the recorded buffer.
///
/// The buffer is process-wide by design and capped, so two tests writing to it
/// at once can evict each other's entries — a race that would make every such
/// test intermittently wrong about a feature that is working. Tests that only
/// spawn git without reading the record do not need it.
#[cfg(test)]
pub(crate) fn test_gate() -> std::sync::MutexGuard<'static, ()> {
    static GATE: OnceLock<Mutex<()>> = OnceLock::new();
    GATE.get_or_init(|| Mutex::new(()))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|since| since.as_millis() as u64)
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    use super::test_gate as exclusive;

    #[test]
    fn a_recorded_command_names_git_first() {
        let entry = Executed {
            seq: 1,
            at_ms: 0,
            argv: vec!["git".into(), "reset".into(), "--hard".into()],
            outcome: Outcome::Ok,
            duration_ms: 3,
        };

        assert_eq!(entry.line(), "git reset --hard");
    }

    #[test]
    fn an_argument_with_a_space_is_quoted_so_the_line_can_be_pasted_back() {
        let entry = Executed {
            seq: 1,
            at_ms: 0,
            argv: vec![
                "git".into(),
                "commit".into(),
                "-m".into(),
                "two words".into(),
            ],
            outcome: Outcome::Ok,
            duration_ms: 1,
        };

        assert_eq!(entry.line(), "git commit -m \"two words\"");
    }

    #[test]
    fn an_empty_argument_survives_as_an_empty_quoted_one() {
        let entry = Executed {
            seq: 1,
            at_ms: 0,
            argv: vec!["git".into(), "commit".into(), "-m".into(), String::new()],
            outcome: Outcome::Ok,
            duration_ms: 1,
        };

        assert_eq!(entry.line(), "git commit -m \"\"");
    }

    #[test]
    fn a_password_in_a_clone_url_is_replaced() {
        assert_eq!(
            redact("https://maxmya:ghp_secret@github.com/maxmya/gitlumiere.git"),
            "https://maxmya:***@github.com/maxmya/gitlumiere.git"
        );
    }

    #[test]
    fn a_url_without_credentials_is_left_exactly_as_it_was() {
        for url in [
            "https://github.com/maxmya/gitlumiere.git",
            "git@github.com:maxmya/gitlumiere.git",
            "ssh://git@github.com/maxmya/gitlumiere.git",
            "/home/maxmya/Dev/mywrok/gitlumiere",
            "--force-with-lease",
        ] {
            assert_eq!(redact(url), url, "{url} was altered");
        }
    }

    #[test]
    fn an_at_sign_in_the_path_is_not_mistaken_for_credentials() {
        let url = "https://host/repos/user@example.com/thing.git";
        assert_eq!(redact(url), url);
    }

    #[test]
    fn a_long_stderr_is_cut_rather_than_stored_whole() {
        let outcome = truncate(Outcome::Failed {
            code: Some(128),
            stderr: "x".repeat(2000),
        });

        match outcome {
            Outcome::Failed { stderr, .. } => {
                assert!(stderr.len() <= STDERR_LIMIT + 4, "{} chars", stderr.len());
                assert!(stderr.ends_with('…'), "the cut is visible");
            }
            other => panic!("expected a failure, got {other:?}"),
        }
    }

    #[test]
    fn a_short_stderr_is_kept_whole() {
        let outcome = truncate(Outcome::Failed {
            code: Some(1),
            stderr: "fatal: not a valid object name".into(),
        });

        assert_eq!(
            outcome,
            Outcome::Failed {
                code: Some(1),
                stderr: "fatal: not a valid object name".into()
            }
        );
    }

    #[test]
    fn recording_keeps_the_newest_and_never_repeats_a_sequence_number() {
        // The buffer is process-wide and the test binary is threaded, so this
        // test claims only its own entries: everything it pushed carries a
        // marker no other test uses. What it asserts about the buffer as a
        // whole — the cap — holds no matter who else is writing.
        const MARKER: &str = "cap-test";
        let _gate = exclusive();
        // `fetch_add` hands out this value to the next push, and `recent` is
        // exclusive, so the window starts one below it.
        let before = NEXT_SEQ.load(Ordering::Relaxed).saturating_sub(1);

        for index in 0..CAPACITY + 10 {
            push(&[MARKER, &index.to_string()], Outcome::Ok, 0);
        }

        assert!(
            recent(0).len() <= CAPACITY,
            "the buffer grew past its cap: {}",
            recent(0).len()
        );

        let entries: Vec<Executed> = recent(before)
            .into_iter()
            .filter(|entry| entry.argv.get(1).map(String::as_str) == Some(MARKER))
            .collect();

        let sequences: Vec<u64> = entries.iter().map(|entry| entry.seq).collect();
        let mut sorted = sequences.clone();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sequences, sorted, "entries are ordered and unique");

        let last = entries.last().expect("something was recorded");
        assert_eq!(
            last.argv.last().map(String::as_str),
            Some((CAPACITY + 9).to_string().as_str()),
            "the newest execution is the one that survived"
        );
    }

    #[test]
    fn what_is_recorded_is_what_the_caller_ran_with_git_in_front() {
        let _gate = exclusive();
        // `fetch_add` hands out this value to the next push, and `recent` is
        // exclusive, so the window starts one below it.
        let before = NEXT_SEQ.load(Ordering::Relaxed).saturating_sub(1);
        push(
            &["push", "--force-with-lease", "origin", "main"],
            Outcome::Failed {
                code: Some(1),
                stderr: "rejected".into(),
            },
            17,
        );

        let entry = recent(before)
            .into_iter()
            .find(|entry| entry.argv.get(1).map(String::as_str) == Some("push"))
            .expect("the execution was recorded");

        assert_eq!(entry.line(), "git push --force-with-lease origin main");
        assert_eq!(entry.duration_ms, 17);
        assert!(matches!(
            entry.outcome,
            Outcome::Failed { code: Some(1), .. }
        ));
    }

    #[test]
    fn the_observer_sees_every_execution_as_it_happens() {
        let _gate = exclusive();
        // The one test that registers an observer: there is a single slot, and
        // two tests fighting over it would test the fight rather than the
        // feature. It counts only its own marker, so other threads recording
        // at the same time neither inflate nor break it.
        const MARKER: &str = "observed";
        let seen = std::sync::Arc::new(Mutex::new(Vec::<String>::new()));
        let collected = std::sync::Arc::clone(&seen);

        observe(Box::new(move |entry: &Executed| {
            if entry.argv.get(1).map(String::as_str) == Some(MARKER) {
                collected.lock().expect("the collector").push(entry.line());
            }
        }));

        push(&[MARKER, "one"], Outcome::Ok, 0);
        push(&[MARKER, "two"], Outcome::Started, 0);

        assert_eq!(
            *seen.lock().expect("the collector"),
            vec!["git observed one", "git observed two"]
        );
    }

    #[test]
    fn clearing_drops_everything_recorded_before_it() {
        let _gate = exclusive();
        push(&["status"], Outcome::Ok, 0);
        let mark = NEXT_SEQ.load(Ordering::Relaxed);
        clear();

        // Anything with a sequence below the mark was recorded before the
        // clear and must be gone. Entries above it belong to other tests
        // recording in parallel and are not this test's business.
        let survivors: Vec<Executed> = recent(0)
            .into_iter()
            .filter(|entry| entry.seq < mark)
            .collect();

        assert!(survivors.is_empty(), "survived a clear: {survivors:?}");
    }
}
