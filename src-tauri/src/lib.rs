// SPDX-License-Identifier: GPL-3.0-or-later

//! GitLord's Tauri shell.
//!
//! This crate owns the window, the commands, and the two background workers
//! (history walking and filesystem watching). All git logic lives in
//! `gitlord-core`.

mod commands;
mod graph_worker;
mod watch;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::open_repo,
            commands::close_repo,
            commands::graph_request,
            commands::graph_restart,
            commands::snapshot,
            commands::commit_detail,
            commands::metrics,
            commands::about,
            commands::launch_path,
        ])
        .run(tauri::generate_context!())
        .expect("starting GitLord");
}
