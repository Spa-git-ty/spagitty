// SPDX-License-Identifier: GPL-3.0-or-later

//! The search worker: one thread per query.
//!
//! # Why this is not the graph worker
//!
//! The graph worker is *resumable*: lanes must be computed in order from the
//! beginning, so there is one walk per open repository and it is asked for more
//! rows rather than restarted. A query has no such constraint, and typing in a
//! search field produces a new query on every keystroke. So a search is
//! *restartable*: each query is a fresh thread carrying a token, and starting
//! one cancels the one before it.
//!
//! Cancellation is cooperative. The walk checks a flag once per delivered row
//! and stops; there is no killing of threads, and a query that has already
//! found its last match ends on its own.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;

use serde::Serialize;
use spagitty_core::graph::{all_tips, Flow};
use spagitty_core::refs::RefIndex;
use spagitty_core::repo;
use spagitty_core::search::{self, Query, SearchRow, BATCH};
use tauri::{AppHandle, Emitter, Runtime};

pub const ROWS_EVENT: &str = "search-rows";
pub const DONE_EVENT: &str = "search-done";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RowsEvent {
    token: u64,
    rows: Vec<SearchRow>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DoneEvent {
    token: u64,
    total: usize,
    /// True when the walk reached the end of history. False means it was
    /// cancelled by a newer query, and the count is not the whole answer.
    complete: bool,
    error: Option<String>,
}

/// A running query. Dropping this cancels it and waits for the thread.
pub struct SearchWorker {
    cancelled: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl Drop for SearchWorker {
    fn drop(&mut self) {
        self.cancelled.store(true, Ordering::Relaxed);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

pub fn spawn<R: Runtime>(
    app: AppHandle<R>,
    path: PathBuf,
    query: Query,
    token: u64,
) -> SearchWorker {
    let cancelled = Arc::new(AtomicBool::new(false));
    let flag = cancelled.clone();

    let handle = std::thread::Builder::new()
        .name(format!("spagitty-search-{token}"))
        .spawn(move || run(app, path, query, token, &flag))
        .expect("spawning the search worker");

    SearchWorker {
        cancelled,
        handle: Some(handle),
    }
}

fn run<R: Runtime>(
    app: AppHandle<R>,
    path: PathBuf,
    query: Query,
    token: u64,
    cancelled: &AtomicBool,
) {
    let mut total = 0usize;
    let mut batch: Vec<SearchRow> = Vec::with_capacity(BATCH);

    let result = (|| -> spagitty_core::Result<usize> {
        let repo = repo::open(&path)?;
        let refs = RefIndex::build(&repo)?;
        let tips = all_tips(&repo)?;

        search::walk(&repo, tips, &refs, &query, |row| {
            batch.push(row);
            total += 1;

            if batch.len() >= BATCH {
                emit_rows(&app, token, &mut batch);
            }

            if cancelled.load(Ordering::Relaxed) {
                Flow::Stop
            } else {
                Flow::Continue
            }
        })
    })();

    // A cancelled query's partial batch is dropped rather than emitted: the
    // store has already moved on to a newer token, and rows arriving after the
    // move would be discarded there anyway.
    if cancelled.load(Ordering::Relaxed) {
        return;
    }
    emit_rows(&app, token, &mut batch);

    let error = match result {
        Ok(_) => None,
        Err(e) => Some(e.to_string()),
    };

    let _ = app.emit(
        DONE_EVENT,
        DoneEvent {
            token,
            total,
            complete: error.is_none(),
            error,
        },
    );
}

fn emit_rows<R: Runtime>(app: &AppHandle<R>, token: u64, batch: &mut Vec<SearchRow>) {
    if batch.is_empty() {
        return;
    }
    let rows = std::mem::take(batch);
    let _ = app.emit(ROWS_EVENT, RowsEvent { token, rows });
}
