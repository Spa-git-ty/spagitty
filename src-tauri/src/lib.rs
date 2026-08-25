// SPDX-License-Identifier: GPL-3.0-or-later

//! Spagitty's Tauri shell.
//!
//! This crate owns the window, the commands, and the background workers
//! (history walking, log searching and filesystem watching). All git logic
//! lives in `spagitty-core`.

mod about;
mod clone_worker;
mod command_log;
mod commands;
mod graph_worker;
mod network_worker;
mod platform;
mod rebase_worker;
mod recents;
mod search_worker;
mod settings;
#[cfg(test)]
mod testing;
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
            commands::discard,
            commands::discard_hunk,
            commands::commit,
            commands::head_message,
            commands::branches,
            commands::checkout,
            commands::create_branch,
            commands::rebase_todo,
            commands::rebase_preview,
            commands::rebase_run,
            commands::rebase_progress,
            commands::rebase_continue,
            commands::rebase_skip,
            commands::rebase_abort,
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
            commands::pull,
            commands::fetch,
            commands::push,
            commands::search_start,
            commands::search_stop,
            commands::blame,
            commands::conflicts,
            commands::conflict_sides,
            commands::conflict_regions,
            commands::conflict_take,
            commands::conflict_resolve_region,
            commands::conflict_write,
            commands::conflict_resolve,
            commands::conflict_continue,
            commands::conflict_abort,
            commands::remotes,
            commands::remote_add,
            commands::remote_rename,
            commands::remote_remove,
            commands::remote_set_url,
            commands::reflog,
            commands::reflog_refs,
            commands::tags,
            commands::tag_create,
            commands::tag_delete,
            commands::tag_retag,
            commands::network_release,
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
        .expect("starting Spagitty");
}
