// SPDX-License-Identifier: GPL-3.0-or-later

//! External diff and merge tool management (FEAT-068).
//!
//! Exposes auto-discovery of installed diff and merge tools from `$PATH`,
//! reading/writing git's `diff.tool` and `merge.tool` configuration, and
//! launching external tools detached without blocking Spagitty.

use std::env;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::repo::workdir;
use crate::shell;

/// Known external tool definition.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalToolInfo {
    pub id: String,
    pub name: String,
    pub command: String,
    pub is_installed: bool,
}

/// External tool configuration and discovery status.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalToolsConfig {
    pub diff_tool: Option<String>,
    pub merge_tool: Option<String>,
    pub available_diff_tools: Vec<ExternalToolInfo>,
    pub available_merge_tools: Vec<ExternalToolInfo>,
}

/// Check if a binary command exists on `$PATH`.
pub fn is_command_available(binary: &str) -> bool {
    if let Ok(path_var) = env::var("PATH") {
        for dir in env::split_paths(&path_var) {
            let full_path = dir.join(binary);
            if full_path.is_file() {
                return true;
            }
            #[cfg(windows)]
            {
                let with_exe = dir.join(format!("{binary}.exe"));
                let with_cmd = dir.join(format!("{binary}.cmd"));
                if with_exe.is_file() || with_cmd.is_file() {
                    return true;
                }
            }
        }
    }
    false
}

/// Known diff tools catalogue.
pub fn known_diff_tools() -> Vec<ExternalToolInfo> {
    vec![
        ExternalToolInfo {
            id: "vscode".into(),
            name: "Visual Studio Code".into(),
            command: "code --wait --diff $LOCAL $REMOTE".into(),
            is_installed: is_command_available("code"),
        },
        ExternalToolInfo {
            id: "meld".into(),
            name: "Meld".into(),
            command: "meld $LOCAL $REMOTE".into(),
            is_installed: is_command_available("meld"),
        },
        ExternalToolInfo {
            id: "bcompare".into(),
            name: "Beyond Compare".into(),
            command: "bcompare $LOCAL $REMOTE".into(),
            is_installed: is_command_available("bcompare") || is_command_available("bcomp"),
        },
        ExternalToolInfo {
            id: "kdiff3".into(),
            name: "KDiff3".into(),
            command: "kdiff3 $LOCAL $REMOTE".into(),
            is_installed: is_command_available("kdiff3"),
        },
        ExternalToolInfo {
            id: "sublime".into(),
            name: "Sublime Merge".into(),
            command: "smerge mergetool $LOCAL $REMOTE".into(),
            is_installed: is_command_available("smerge") || is_command_available("subl"),
        },
        ExternalToolInfo {
            id: "vimdiff".into(),
            name: "Vimdiff".into(),
            command: "vimdiff $LOCAL $REMOTE".into(),
            is_installed: is_command_available("vimdiff") || is_command_available("nvim"),
        },
    ]
}

/// Known merge tools catalogue.
pub fn known_merge_tools() -> Vec<ExternalToolInfo> {
    vec![
        ExternalToolInfo {
            id: "vscode".into(),
            name: "Visual Studio Code".into(),
            command: "code --wait --merge $LOCAL $REMOTE $BASE $MERGED".into(),
            is_installed: is_command_available("code"),
        },
        ExternalToolInfo {
            id: "meld".into(),
            name: "Meld".into(),
            command: "meld $LOCAL $BASE $REMOTE -o $MERGED".into(),
            is_installed: is_command_available("meld"),
        },
        ExternalToolInfo {
            id: "bcompare".into(),
            name: "Beyond Compare".into(),
            command: "bcompare $LOCAL $REMOTE $BASE $MERGED".into(),
            is_installed: is_command_available("bcompare") || is_command_available("bcomp"),
        },
        ExternalToolInfo {
            id: "kdiff3".into(),
            name: "KDiff3".into(),
            command: "kdiff3 $BASE $LOCAL $REMOTE -o $MERGED".into(),
            is_installed: is_command_available("kdiff3"),
        },
    ]
}

/// Read effective external tools configuration.
pub fn get_config(repo: &gix::Repository) -> Result<ExternalToolsConfig> {
    let dir = workdir(repo)?;
    let diff_tool = shell::get_config(dir, "diff.tool")?;
    let merge_tool = shell::get_config(dir, "merge.tool")?;

    Ok(ExternalToolsConfig {
        diff_tool,
        merge_tool,
        available_diff_tools: known_diff_tools(),
        available_merge_tools: known_merge_tools(),
    })
}

/// Read external tools configuration globally without an open repository.
pub fn get_config_global() -> Result<ExternalToolsConfig> {
    let dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let diff_tool = shell::get_config(&dir, "diff.tool")?;
    let merge_tool = shell::get_config(&dir, "merge.tool")?;

    Ok(ExternalToolsConfig {
        diff_tool,
        merge_tool,
        available_diff_tools: known_diff_tools(),
        available_merge_tools: known_merge_tools(),
    })
}

/// Set configured diff or merge tool globally in ~/.gitconfig.
pub fn set_tool_global(tool_type: &str, tool_name: Option<&str>) -> Result<()> {
    let dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let key = match tool_type {
        "diff" => "diff.tool",
        "merge" => "merge.tool",
        other => other,
    };

    match tool_name {
        Some(name) if !name.trim().is_empty() => {
            shell::set_config(&dir, "--global", key, name.trim())?;
        }
        _ => {
            shell::unset_config(&dir, "--global", key)?;
        }
    }
    Ok(())
}


/// Set configured diff or merge tool.
pub fn set_tool(
    repo: &gix::Repository,
    tool_type: &str,
    tool_name: Option<&str>,
    global: bool,
) -> Result<()> {
    let dir = workdir(repo)?;
    let scope = if global { "--global" } else { "--local" };
    let key = match tool_type {
        "diff" => "diff.tool",
        "merge" => "merge.tool",
        other => other,
    };

    match tool_name {
        Some(name) if !name.trim().is_empty() => {
            shell::set_config(dir, scope, key, name.trim())?;
        }
        _ => {
            shell::unset_config(dir, scope, key)?;
        }
    }
    Ok(())
}

/// Launch external diff tool for a path.
pub fn launch_diff(
    repo: &gix::Repository,
    path: &str,
    tool: Option<&str>,
    commit: Option<&str>,
) -> Result<()> {
    let dir = workdir(repo)?;
    shell::launch_difftool(dir, path, tool, commit)
}

/// Launch external merge tool for a conflicted path.
pub fn launch_merge(repo: &gix::Repository, path: &str, tool: Option<&str>) -> Result<()> {
    let dir = workdir(repo)?;
    shell::launch_mergetool(dir, path, tool)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    #[test]
    fn discovers_known_tools_catalogue() {
        let diff_tools = known_diff_tools();
        assert!(!diff_tools.is_empty());
        assert!(diff_tools.iter().any(|t| t.id == "vscode"));
        assert!(diff_tools.iter().any(|t| t.id == "meld"));

        let merge_tools = known_merge_tools();
        assert!(!merge_tools.is_empty());
        assert!(merge_tools.iter().any(|t| t.id == "vscode"));
    }

    #[test]
    fn reads_and_writes_tool_configuration() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        let initial = get_config(&repo).expect("get config");
        assert_eq!(initial.diff_tool, None);

        set_tool(&repo, "diff", Some("meld"), false).expect("set diff tool");
        let updated = get_config(&repo).expect("get updated config");
        assert_eq!(updated.diff_tool.as_deref(), Some("meld"));

        set_tool(&repo, "diff", None, false).expect("clear diff tool");
        let cleared = get_config(&repo).expect("get cleared config");
        assert_eq!(cleared.diff_tool, None);
    }
}
