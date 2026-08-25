// SPDX-License-Identifier: GPL-3.0-or-later

//! Scaffolding for the Tauri layer's own tests.
//!
//! Everything in this crate that touches the application takes an
//! `AppHandle<R>` rather than a concrete handle (TASK-003), so
//! `tauri::test::mock_app` can supply one. What is still missing is the other
//! half of an event test: something to listen with, and something to wait on.
//! Both live here, so no test has to grow its own.
//!
//! The workers emit and never look back — a dropped event costs latency and
//! nothing else, which is exactly why they discard the emit result. Testing
//! them therefore means watching what came out, not what was returned.

use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use serde::de::DeserializeOwned;
use tauri::test::{mock_builder, mock_context, noop_assets, MockRuntime};
use tauri::{App, AppHandle, Listener};
use tempfile::TempDir;

use crate::commands::AppState;

/// How long a test waits for something another thread has to do.
///
/// Generous on purpose: this is the ceiling on a *failure*, not the time a
/// passing test takes, and a shared CI runner walking a repository is slower
/// than a laptop by more than a small factor.
const PATIENCE: Duration = Duration::from_secs(10);

/// How long "and then nothing else happened" waits before believing it.
///
/// Long enough to cover the watcher's quiet period and a walk resuming, short
/// enough that several tests can afford it.
const SETTLE: Duration = Duration::from_millis(400);

/// Point the platform's configuration directories at a temporary one, once for
/// the whole test binary.
///
/// [`crate::recents`] and [`crate::settings`] write through `app_config_dir()`,
/// which resolves against the real user's home even under the mock runtime.
/// Opening a repository in a test must not leave a row in the list of
/// repositories the person running the test has opened.
///
/// The environment is process-wide, so it is set exactly once, inside the
/// lock that initialises the directory, and before any test builds an app.
fn isolated_config() -> &'static TempDir {
    static ISOLATED: OnceLock<TempDir> = OnceLock::new();
    ISOLATED.get_or_init(|| {
        let dir = tempfile::tempdir().expect("a temporary configuration directory");
        // One key per platform's idea of where configuration lives.
        for key in ["HOME", "XDG_CONFIG_HOME", "APPDATA", "LOCALAPPDATA"] {
            std::env::set_var(key, dir.path());
        }
        dir
    })
}

/// An application on the mock runtime, carrying the same state the real one
/// manages.
pub fn app() -> App<MockRuntime> {
    isolated_config();
    mock_builder()
        .manage(AppState::default())
        .build(mock_context(noop_assets()))
        .expect("building the mock application")
}

/// Every payload emitted on one event, in the order they arrived.
///
/// Cloneable, and cheap to clone: each clone reads the same list.
#[derive(Clone)]
pub struct Emitted<T> {
    seen: Arc<Mutex<Vec<T>>>,
}

impl<T: DeserializeOwned + Send + 'static> Emitted<T> {
    /// Start listening. Events emitted before this returns are missed, so
    /// register before starting whatever emits them.
    pub fn on(app: &AppHandle<MockRuntime>, event: &str) -> Self {
        let seen: Arc<Mutex<Vec<T>>> = Arc::new(Mutex::new(Vec::new()));
        let sink = seen.clone();
        let name = event.to_string();

        app.listen(event, move |event| {
            let payload = serde_json::from_str(event.payload())
                .unwrap_or_else(|e| panic!("{name} payload did not parse: {e}"));
            sink.lock().expect("emitted events").push(payload);
        });

        Emitted { seen }
    }
}

impl<T: Clone> Emitted<T> {
    pub fn all(&self) -> Vec<T> {
        self.seen.lock().expect("emitted events").clone()
    }

    pub fn count(&self) -> usize {
        self.seen.lock().expect("emitted events").len()
    }

    /// Wait until at least `n` payloads have arrived, then return all of them.
    /// Panics rather than returning short, so the assertion that follows is
    /// about the content and never about whether the test waited long enough.
    pub fn at_least(&self, n: usize) -> Vec<T> {
        assert!(
            wait_for(|| self.count() >= n),
            "waited {PATIENCE:?} for {n} events and saw {}",
            self.count()
        );
        self.all()
    }

    /// Let things settle and assert nothing more arrived. This is how "and
    /// then it blocked" is stated: the absence of an event, given time to
    /// appear.
    pub fn no_more_than(&self, n: usize) {
        std::thread::sleep(SETTLE);
        assert!(
            self.count() <= n,
            "expected at most {n} events, saw {}",
            self.count()
        );
    }
}

/// Poll until `done` is true or [`PATIENCE`] runs out.
pub fn wait_for(mut done: impl FnMut() -> bool) -> bool {
    let deadline = Instant::now() + PATIENCE;
    while Instant::now() < deadline {
        if done() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(5));
    }
    done()
}

/// Run `f` on another thread and fail if it has not finished within
/// [`PATIENCE`].
///
/// Dropping a worker joins its thread, so a worker that does not wind down
/// hangs the test runner rather than failing it. This turns that into a
/// failure with a name on it.
pub fn finishes_promptly(what: &str, f: impl FnOnce() + Send + 'static) {
    let (tx, rx) = std::sync::mpsc::channel();
    let handle = std::thread::spawn(move || {
        f();
        let _ = tx.send(());
    });

    match rx.recv_timeout(PATIENCE) {
        Ok(()) => {
            handle.join().expect("the thread running the drop");
        }
        Err(_) => panic!("{what} did not finish within {PATIENCE:?}"),
    }
}
