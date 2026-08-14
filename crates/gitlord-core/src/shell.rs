// SPDX-License-Identifier: GPL-3.0-or-later

//! # The `git` binary boundary
//!
//! This module is the **only** place in GitLord that spawns a process. Nothing
//! else in `gitlord-core` shells out; if you need to, add it here.
//!
//! Everything GitLord *reads* — log walking, refs, diffing, blame, status — is
//! done in-process with `gix`. But a specific set of operations is deliberately
//! **not** reimplemented in Rust:
//!
//! | Operation | Why we shell out |
//! |---|---|
//! | **Interactive rebase execution** | The rebase machinery is a stateful protocol (`rebase-merge/`, `done`, `git-rebase-todo`, `ORIG_HEAD`, the reflog trail) that other tools and the user's own `git` expect to find intact. A reimplementation that got the on-disk state subtly wrong would strand people mid-rebase with a repo their CLI can't finish. We *plan* the rebase in Rust (that is the Rebase screen's preview) and hand the todo list to `git rebase -i` to execute. |
//! | **Hooks** | `pre-commit`, `commit-msg`, `pre-push` and friends are arbitrary executables with an environment contract, and users expect the same behavior they get on the CLI. `git` already runs them correctly. |
//! | **LFS** | LFS is a filter/smudge protocol implemented by a separate binary that git invokes via config. Bypassing git means bypassing LFS, and checkouts silently produce pointer files. |
//! | **Submodule recursion** | Recursive init/update/sync spans nested repositories with their own config, URLs and credentials. `git submodule` is the reference implementation. |
//! | **Credential helpers** | Helpers are external programs resolved through config with a documented stdin/stdout protocol, and they are where OS keychain integration already lives. Reimplementing the protocol would mean reimplementing every helper's quirks. |
//! | **Committing** | `pre-commit` and `commit-msg` hooks have to run, and a signed commit goes through the user's configured GPG or SSH program. Writing the commit object ourselves would silently skip both, so a commit made in GitLord would differ from the same commit made on the command line. |
//! | **Staging** | The index is the most-read piece of shared state there is: the user's own `git status`, their prompt, their editor's gutter and their hooks all read it. Writing it ourselves — including through `git apply --cached` for a single hunk — keeps the on-disk format and its locking in git's hands. |
//!
//! The rule of thumb: if the operation *mutates* state that the wider git
//! ecosystem also reads, or if it delegates to something outside the repository,
//! it belongs here. Read-only history questions belong in `gix`.
//!
//! Nothing in this module is called by the Graph screen. It exists now so the
//! boundary is drawn before the screens that need it are built.

use std::path::Path;
use std::process::Command;

use crate::error::{Error, Result};

/// Run `git` in `repo` and return stdout on success.
///
/// `GIT_TERMINAL_PROMPT=0` stops git from blocking on a tty prompt we have no
/// terminal for — credential requests must come back to us as a failure so the
/// UI can ask, rather than hanging the app forever.
fn run(repo: &Path, args: &[&str]) -> Result<String> {
    let output = Command::new("git")
        .current_dir(repo)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()?;

    if !output.status.success() {
        return Err(Error::Git {
            command: args.join(" "),
            stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(),
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// The `git` version on PATH, or an error if there is no usable `git`.
///
/// Called at startup: the operations above have no in-process fallback, so a
/// missing `git` is worth telling the user about before they hit one.
pub fn version(repo: &Path) -> Result<String> {
    Ok(run(repo, &["--version"])?.trim().to_string())
}

/// Run `git` with `input` on its stdin. Used for `git apply`, which is how a
/// single hunk reaches the index.
fn run_with_stdin(repo: &Path, args: &[&str], input: &str) -> Result<String> {
    use std::io::Write;
    use std::process::Stdio;

    let mut child = Command::new("git")
        .current_dir(repo)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    // Dropped at the end of the block, closing stdin; without that, `git apply`
    // waits for more patch forever.
    {
        let mut stdin = child.stdin.take().expect("piped stdin");
        stdin.write_all(input.as_bytes())?;
    }

    let output = child.wait_with_output()?;
    if !output.status.success() {
        return Err(Error::Git {
            command: args.join(" "),
            stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(),
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// `--` before the paths, always: a path that happens to look like an option,
/// or like a revision, is still a path.
fn with_paths<'a>(args: &[&'a str], paths: &'a [String]) -> Vec<&'a str> {
    let mut all: Vec<&str> = args.to_vec();
    all.push("--");
    all.extend(paths.iter().map(String::as_str));
    all
}

/// Stage whole paths. Works for a modification, an addition and a deletion
/// alike, which is why it is `git add` rather than three commands.
pub fn stage(repo: &Path, paths: &[String]) -> Result<()> {
    if paths.is_empty() {
        return Ok(());
    }
    run(repo, &with_paths(&["add"], paths))?;
    Ok(())
}

/// Unstage whole paths: put the index back to what `HEAD` has.
///
/// In a repository with no commits there is no `HEAD` to restore from, and the
/// only way for a path to be staged is for it to be new — so removing the entry
/// is the same operation expressed differently, not a special case bolted on.
///
/// Neither form touches the working tree. The file on disk is left exactly as
/// it is; only the index moves.
pub fn unstage(repo: &Path, paths: &[String]) -> Result<()> {
    if paths.is_empty() {
        return Ok(());
    }

    if run(repo, &["rev-parse", "--verify", "--quiet", "HEAD"]).is_ok() {
        run(repo, &with_paths(&["restore", "--staged"], paths))?;
    } else {
        run(repo, &with_paths(&["rm", "--cached", "--quiet"], paths))?;
    }
    Ok(())
}

/// Apply one hunk's patch to the index, forwards to stage it or in reverse to
/// unstage it.
///
/// `--cached` is what keeps this off the working tree: the file on disk is
/// never touched, so staging part of a file cannot lose the rest of it.
pub fn apply_to_index(repo: &Path, patch: &str, reverse: bool) -> Result<()> {
    let mut args = vec!["apply", "--cached", "--whitespace=nowarn"];
    if reverse {
        args.push("--reverse");
    }
    args.push("-");

    run_with_stdin(repo, &args, patch)?;
    Ok(())
}

/// Commit what is staged.
///
/// Through `git` so that `pre-commit` and `commit-msg` hooks run and a
/// configured signing program is used — a commit made here is the same commit
/// the command line would have made.
pub fn commit(repo: &Path, subject: &str, body: &str, amend: bool) -> Result<String> {
    let mut args = vec!["commit", "-m", subject];
    if !body.trim().is_empty() {
        args.push("-m");
        args.push(body);
    }
    if amend {
        args.push("--amend");
    }

    run(repo, &args)?;
    Ok(run(repo, &["rev-parse", "HEAD"])?.trim().to_string())
}

/// The message of the commit `HEAD` points at, for pre-filling an amend.
pub fn head_message(repo: &Path) -> Result<String> {
    run(repo, &["log", "-1", "--pretty=%B"])
}

// The functions below are stubs deliberately left unimplemented until the
// screens that need them are built, so that the boundary is documented and
// discoverable now rather than being drawn ad hoc later.

/// Execute a planned interactive rebase. The todo list is produced in Rust by
/// the Rebase screen; `git` performs it.
pub fn rebase_interactive(_repo: &Path, _onto: &str, _todo: &str) -> Result<()> {
    unimplemented!("built with the Rebase screen")
}

/// Fetch. Goes through `git` so credential helpers and the OS keychain work.
pub fn fetch(_repo: &Path, _remote: &str) -> Result<String> {
    unimplemented!("built with the toolbar's Fetch action")
}

/// Push. Same reason as [`fetch`], plus `pre-push` hooks.
pub fn push(_repo: &Path, _remote: &str, _refspec: &str) -> Result<String> {
    unimplemented!("built with the toolbar's Push action")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    #[test]
    fn the_git_version_is_reported_from_the_binary_on_path() {
        let fixture = Fixture::empty();
        let version = version(fixture.path()).expect("a git version");

        assert!(version.starts_with("git version"), "unexpected: {version}");
        assert_eq!(version.trim(), version, "the caller gets a clean string");
    }

    #[test]
    fn a_failing_command_carries_gits_own_stderr() {
        // git's message is almost always more useful than anything we would
        // write in its place, so it is what the error holds.
        let fixture = Fixture::empty();

        let error = run(
            fixture.path(),
            &["rev-parse", "--verify", "refs/heads/nope"],
        )
        .unwrap_err();

        match error {
            Error::Git { command, stderr } => {
                assert_eq!(command, "rev-parse --verify refs/heads/nope");
                assert!(
                    !stderr.is_empty(),
                    "git said nothing, which cannot be right"
                );
            }
            other => panic!("expected a Git error, got {other:?}"),
        }
    }
}
