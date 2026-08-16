// SPDX-License-Identifier: GPL-3.0-or-later

//! GitLord's Tauri shell.
//!
//! This crate owns the window, the commands, and the background workers
//! (history walking, log searching and filesystem watching). All git logic
//! lives in `gitlord-core`.

mod about;
mod commands;
mod graph_worker;
mod recents;
mod search_worker;
mod settings;
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
            commands::commit_diff,
            commands::file_diff,
            commands::working_copy,
            commands::working_diff,
            commands::stage,
            commands::unstage,
            commands::stage_hunk,
            commands::unstage_hunk,
            commands::commit,
            commands::head_message,
            commands::branches,
            commands::checkout,
            commands::create_branch,
            commands::rebase_todo,
            commands::rebase_preview,
            commands::search_start,
            commands::search_stop,
            commands::blame,
            commands::conflicts,
            commands::conflict_sides,
            commands::stashes,
            commands::stash_push,
            commands::recent_repos,
            commands::forget_repo,
            commands::metrics,
            commands::about,
            commands::licenses,
            commands::identity,
            commands::set_identity,
            commands::settings,
            commands::set_settings,
            commands::launch_path,
        ])
        .run(tauri::generate_context!())
        .expect("starting GitLord");
}
