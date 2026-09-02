// SPDX-License-Identifier: GPL-3.0-or-later

//! User identity profiles management (FEAT-069).

use std::path::PathBuf;

use spagitty_core::identity::IdentityProfile;
use tauri::{AppHandle, Manager, Runtime};

const FILE: &str = "profiles.json";

/// Load all saved identity profiles.
pub fn load<R: Runtime>(app: &AppHandle<R>) -> Vec<IdentityProfile> {
    let Some(path) = file(app) else {
        return Vec::new();
    };
    let Ok(text) = std::fs::read_to_string(path) else {
        return Vec::new();
    };
    serde_json::from_str(&text).unwrap_or_default()
}

/// Save an identity profile (inserts or updates).
pub fn save<R: Runtime>(app: &AppHandle<R>, profile: IdentityProfile) {
    let mut profiles = load(app);
    if let Some(pos) = profiles.iter().position(|p| p.id == profile.id) {
        profiles[pos] = profile;
    } else {
        profiles.push(profile);
    }
    persist(app, &profiles);
}

/// Delete an identity profile by id.
pub fn delete<R: Runtime>(app: &AppHandle<R>, id: &str) {
    let mut profiles = load(app);
    profiles.retain(|p| p.id != id);
    persist(app, &profiles);
}

fn file<R: Runtime>(app: &AppHandle<R>) -> Option<PathBuf> {
    let dir = app.path().app_config_dir().ok()?;
    Some(dir.join(FILE))
}

fn persist<R: Runtime>(app: &AppHandle<R>, profiles: &[IdentityProfile]) {
    let Some(path) = file(app) else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(text) = serde_json::to_string_pretty(profiles) {
        let _ = std::fs::write(path, text);
    }
}
