// SPDX-License-Identifier: GPL-3.0-or-later

//! Git operations for GitLord.
//!
//! Everything here is UI-agnostic: no Tauri, no window handles, no events. The
//! Tauri layer (`src-tauri`) is a thin adapter that calls into this crate and
//! forwards the results.
//!
//! # Where the work happens
//!
//! [`gix`] does the reading — log walking, refs, diffing, blame, status. It is
//! MIT/Apache-2.0, so it links cleanly into a GPL-3 program.
//!
//! A small set of operations is *deliberately not reimplemented* and shells out
//! to the `git` binary instead. That is the entire contents of [`shell`], and it
//! is the only module in this crate that spawns a process. See its header for
//! which operations and why.

pub mod blame;
pub mod branches;
pub mod clone;
pub mod conflicts;
pub mod diff;
pub mod error;
pub mod graph;
pub mod identity;
pub mod ops;
pub mod rebase;
pub mod refs;
pub mod repo;
pub mod search;
pub mod shell;
pub mod stash;
pub mod status;
pub mod work;

/// Repository fixtures, shared by the tests of every module that reads one.
#[cfg(test)]
mod fixture;

/// Re-exported so callers can name gix types (`ThreadSafeRepository` and
/// friends) without depending on gix themselves. There is one gix version in
/// the workspace and this is where it comes from.
pub use gix;

pub use error::{Error, Result};
pub use graph::{GraphRow, LaneEdge, LaneState, ROW_PITCH};
pub use refs::{RefChip, RefIndex, RefKind};
pub use repo::{HeadInfo, RepoInfo};
pub use status::{StatusEntry, WorkingCopy};
