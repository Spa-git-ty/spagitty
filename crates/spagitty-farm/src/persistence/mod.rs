// SPDX-License-Identifier: GPL-3.0-or-later

//! The farm, on disk, so a crash is an interruption rather than a loss.

pub mod store;

pub use store::{
    append_event, clear_farm, directory, events_path, farm_path, forget, load_events, load_farm,
    load_registry, save_farm, save_registry, trim_events,
};
