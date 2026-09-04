// SPDX-License-Identifier: GPL-3.0-or-later

//! Starting an agent, reading it, and stopping it.
//!
//! One thread per running agent, a transcript on disk, and a kill signal for
//! cancellation — the same shape as every other long-running job in Spagitty.
//! See [`process`] for why none of it is async.

pub mod log;
pub mod process;

pub use log::{log_path, tail, TranscriptWriter};
pub use process::{start, Collected, Ended, Session, Sink};
