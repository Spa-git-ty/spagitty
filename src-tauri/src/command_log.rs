// SPDX-License-Identifier: GPL-3.0-or-later

//! Pushing executed `git` commands to the webview.
//!
//! `gitlord-core` records what it spawns and knows nothing about windows or
//! events. This is the adapter: one observer, registered at startup, that
//! forwards each entry as a Tauri event so the panel updates while an operation
//! is still running rather than after the user thinks to refresh.
//!
//! The event is a notification, not the record. `commands::git_commands` reads
//! the buffer, so a dropped event costs latency and nothing else — which is why
//! the emit result is discarded here exactly as it is in the workers.

use gitlord_core::record::{self, Executed};
use tauri::{AppHandle, Emitter};

/// One executed command. The payload is the entry itself.
pub const EXECUTED_EVENT: &str = "git-command";

/// Start forwarding executions to `app`.
///
/// Called once from `run`'s setup. The handler runs on whichever thread spawned
/// git — inside the operation the user is waiting for — so it does no work
/// beyond the emit.
pub fn forward_to(app: AppHandle) {
    record::observe(Box::new(move |entry: &Executed| {
        let _ = app.emit(EXECUTED_EVENT, entry);
    }));
}
