// SPDX-License-Identifier: GPL-3.0-or-later

//! GitLord's Tauri shell.
//!
//! This crate owns the window, the commands, and the background workers
//! (history walking, log searching and filesystem watching). All git logic
//! lives in `gitlord-core`.

mod about;
mod clone_worker;
mod command_log;
mod commands;
mod graph_worker;
mod platform;
mod recents;
mod search_worker;
mod settings;
mod watch;

pub fn run() {
    // Before the builder, because the webview reads its environment as it
    // starts and this process is still single-threaded here.
    platform::prepare_webview();

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
            commands::rebase_run,
            commands::graph_visibility,
            commands::reset,
            commands::revert,
            commands::cherry_pick,
            commands::integrate,
            commands::rebase_onto,
            commands::checkout_detached,
            commands::rename_branch,
            commands::delete_branch,
            commands::create_tag,
            commands::delete_tag,
            commands::stash_action,
            commands::fetch,
            commands::push,
            commands::search_start,
            commands::search_stop,
            commands::blame,
            commands::conflicts,
            commands::conflict_sides,
            commands::stashes,
            commands::stash_push,
            commands::recent_repos,
            commands::forget_repo,
            commands::clone_plan,
            commands::clone_start,
            commands::clone_release,
            commands::metrics,
            commands::about,
            commands::licenses,
            commands::identity,
            commands::set_identity,
            commands::settings,
            commands::set_settings,
            commands::launch_path,
            commands::git_commands,
            commands::clear_git_commands,
        ])
        .setup(|app| {
            // Registered before any command can run, so the first execution of
            // the session is already being forwarded.
            command_log::forward_to(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("starting GitLord");
}
