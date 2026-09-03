// SPDX-License-Identifier: GPL-3.0-or-later

//! Deciding what happens next.
//!
//! The graph says what *could* run, the router says who would do it, and the
//! scheduler puts the two together with the farm's own limits. All three are
//! pure functions over data — see [`scheduler`] for why that is worth insisting
//! on.

pub mod dependency;
pub mod planner;
pub mod router;
pub mod scheduler;

pub use dependency::{ancestors, validate, Graph};
pub use router::{Record, Scoreboard};
pub use scheduler::{decide, Decision};
