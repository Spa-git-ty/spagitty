// SPDX-License-Identifier: GPL-3.0-or-later

//! The graph worker: one thread per open repository that walks history and
//! streams rows to the UI.
//!
//! # Why a thread and not an async task
//!
//! The walk owns a `gix::Repository` and a `LaneState` that only make sense
//! read in order, from the beginning. Lane assignment is inherently sequential:
//! row *n* cannot be computed without having computed row *n-1*. So there is one
//! walker, it lives as long as the repository is open, and it is *resumable*
//! rather than restartable.
//!
//! # Windowing
//!
//! The UI asks for rows with [`GraphCmd::More`]; the worker delivers that many
//! and then blocks inside the walk's sink until asked for more. That is the
//! whole backpressure mechanism — no buffering of a history we were never asked
//! for, and no walking to the end before the first row is painted. Scrolling
//! near the bottom of the loaded window sends another `More`, and the walk picks
//! up exactly where it stopped.
//!
//! Batches of [`BATCH`] rows go out as they are produced, so a large request
//! still paints progressively rather than landing all at once.

use std::path::PathBuf;
use std::sync::mpsc::{Receiver, Sender};
use std::thread::JoinHandle;

use gitlord_core::graph::{self, Flow, GraphRow, BATCH};
use gitlord_core::refs::RefIndex;
use gitlord_core::repo;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const ROWS_EVENT: &str = "graph-rows";
pub const DONE_EVENT: &str = "graph-done";

#[derive(Debug)]
pub enum GraphCmd {
    /// Deliver this many more rows.
    More(usize),
    /// Wind the walk down; the repository is closing.
    Stop,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RowsEvent {
    token: u64,
    rows: Vec<GraphRow>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DoneEvent {
    token: u64,
    total: usize,
    /// True when the walk reached the end of history. False means it stopped
    /// because the repository was closed, and the UI should not treat the row
    /// count as final.
    complete: bool,
    /// Set when the walk failed part-way; the rows already delivered are still
    /// valid.
    error: Option<String>,
}

/// A running walk. Dropping this stops the thread.
pub struct GraphWorker {
    token: u64,
    tx: Sender<GraphCmd>,
    handle: Option<JoinHandle<()>>,
}

impl GraphWorker {
    pub fn token(&self) -> u64 {
        self.token
    }

    /// Ask for more rows. Fails silently if the worker has already finished —
    /// a request that arrives after the end of history is not an error, it just
    /// has nothing to deliver.
    pub fn request(&self, count: usize) {
        let _ = self.tx.send(GraphCmd::More(count));
    }
}

impl Drop for GraphWorker {
    fn drop(&mut self) {
        let _ = self.tx.send(GraphCmd::Stop);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

pub fn spawn(app: AppHandle, path: PathBuf, token: u64) -> GraphWorker {
    let (tx, rx) = std::sync::mpsc::channel();
    let handle = std::thread::Builder::new()
        .name(format!("gitlord-graph-{token}"))
        .spawn(move || run(app, path, token, rx))
        .expect("spawning the graph worker");

    GraphWorker { token, tx, handle: Some(handle) }
}

fn run(app: AppHandle, path: PathBuf, token: u64, rx: Receiver<GraphCmd>) {
    // Wait for the first request before touching the repository at all, so
    // opening a repo the user immediately navigates away from costs nothing.
    // A zero-row request is not a reason to start walking, and starting with a
    // budget of zero would underflow on the first row.
    let mut budget = loop {
        match rx.recv() {
            Ok(GraphCmd::More(n)) if n > 0 => break n,
            Ok(GraphCmd::More(_)) => continue,
            Ok(GraphCmd::Stop) | Err(_) => return,
        }
    };

    let mut total = 0usize;
    let mut batch: Vec<GraphRow> = Vec::with_capacity(BATCH);
    let mut stopped = false;

    let result = (|| -> gitlord_core::Result<usize> {
        let repo = repo::open(&path)?;
        let refs = RefIndex::build(&repo)?;
        let tips = graph::all_tips(&repo)?;

        graph::walk(&repo, tips, &refs, |row| {
            batch.push(row);
            total += 1;

            if batch.len() >= BATCH {
                emit_rows(&app, token, &mut batch);
            }

            budget -= 1;
            if budget == 0 {
                // Show what we have before going to sleep — otherwise the last
                // partial batch of a request would sit in memory, invisible,
                // until the next scroll.
                emit_rows(&app, token, &mut batch);

                loop {
                    match rx.recv() {
                        Ok(GraphCmd::More(n)) if n > 0 => {
                            budget = n;
                            break;
                        }
                        Ok(GraphCmd::More(_)) => continue,
                        Ok(GraphCmd::Stop) | Err(_) => {
                            stopped = true;
                            return Flow::Stop;
                        }
                    }
                }
            }

            Flow::Continue
        })
    })();

    emit_rows(&app, token, &mut batch);

    let error = match result {
        Ok(_) => None,
        Err(e) => Some(e.to_string()),
    };

    let _ = app.emit(
        DONE_EVENT,
        DoneEvent { token, total, complete: !stopped && error.is_none(), error },
    );
}

/// Send whatever is in `batch` and clear it. A no-op when empty.
fn emit_rows(app: &AppHandle, token: u64, batch: &mut Vec<GraphRow>) {
    if batch.is_empty() {
        return;
    }
    let rows = std::mem::take(batch);
    let _ = app.emit(ROWS_EVENT, RowsEvent { token, rows });
}
