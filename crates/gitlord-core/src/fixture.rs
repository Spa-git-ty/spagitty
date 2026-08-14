// SPDX-License-Identifier: GPL-3.0-or-later

//! Real repositories for tests.
//!
//! The pure functions in this crate — hunk construction, the lane fold — are
//! tested directly. Everything else answers questions about a repository, and
//! the only honest way to test that is against one.
//!
//! Fixtures are built with the `git` binary rather than with `gix`, on purpose:
//! a fixture built by the same library under test would agree with it by
//! construction, and a bug in how we write refs would produce a repository that
//! only our own reader understands.
//!
//! Every fixture lives in a temporary directory that is removed when the
//! `Fixture` is dropped. Nothing here writes outside it.

use std::path::Path;
use std::process::Command;

use tempfile::TempDir;

pub struct Fixture {
    dir: TempDir,
}

impl Fixture {
    /// An initialised repository with a fixed identity and no commits.
    pub fn empty() -> Self {
        let dir = tempfile::tempdir().expect("temp dir");
        let fixture = Fixture { dir };

        fixture.git(&["init", "-q", "-b", "main"]);
        fixture.git(&["config", "user.name", "Ada Lovelace"]);
        fixture.git(&["config", "user.email", "ada@example.com"]);
        // Signing would prompt, and a fixture must never wait for a human.
        fixture.git(&["config", "commit.gpgsign", "false"]);
        fixture.git(&["config", "gc.auto", "0"]);
        fixture
    }

    /// The repository the screens are exercised against.
    ///
    /// ```text
    /// * Merge feature/split-view   (main, v0.2.0)
    /// |\
    /// | * Start the split view     (feature/split-view)
    /// | * Rewrite line 3
    /// * | Rewrite line 38
    /// |/
    /// * Add notes                  (v0.1.0, annotated)
    /// * Initial import
    /// ```
    ///
    /// Plus a binary file, a dotfile, a deeply nested path and one stash entry.
    ///
    /// The working copy is left **clean**, so tests that check out or switch
    /// branches are not fighting uncommitted changes. [`Fixture::dirty`] is the
    /// same repository with work in progress on top.
    pub fn woven() -> Self {
        let fixture = Self::empty();

        let lines: String = (1..=40).map(|n| format!("line {n}\n")).collect();
        fixture.write("core.txt", &lines);
        fixture.write("notes.md", "alpha\nbeta\n");
        fixture.write(".gitignore", ".cache/\n");
        fixture.write("src/deep/nested/main.rs", "fn main() {}\n");
        fixture.write_bytes("logo.bin", &[0x00, 0x01, 0x02, b'b', b'i', b'n', 0x00]);
        fixture.git(&["add", "-A"]);
        fixture.commit("Initial import");

        fixture.write("notes.md", "alpha\nbeta\nentry 1\n");
        fixture.commit_all("Add notes");
        fixture.git(&["tag", "-a", "v0.1.0", "-m", "First tag"]);

        fixture.git(&["switch", "-q", "-c", "feature/split-view"]);
        fixture.write("core.txt", &lines.replace("line 3\n", "LINE THREE\n"));
        fixture.commit_all("Rewrite line 3");
        fixture.write("split.txt", "split view work\n");
        fixture.git(&["add", "split.txt"]);
        fixture.commit("Start the split view");

        fixture.git(&["switch", "-q", "main"]);
        fixture.write(
            "core.txt",
            &lines.replace("line 38\n", "LINE THIRTY-EIGHT\n"),
        );
        fixture.commit_all("Rewrite line 38");
        fixture.git(&[
            "merge",
            "-q",
            "--no-ff",
            "feature/split-view",
            "-m",
            "Merge feature/split-view",
        ]);
        fixture.git(&["tag", "v0.2.0"]);

        // A branch that is fully contained in main, for "merged" filters.
        fixture.git(&["branch", "merged/already-in-main", "main~1"]);

        fixture.write("notes.md", "alpha\nbeta\nentry 1\nstashed\n");
        fixture.git(&["stash", "push", "-q", "-m", "wip on notes"]);

        fixture
    }

    /// [`Fixture::woven`] with work in progress: one staged change, one
    /// unstaged change and one untracked file.
    pub fn dirty() -> Self {
        let fixture = Self::woven();

        fixture.write("notes.md", "alpha\nbeta\nentry 1\nstaged\n");
        fixture.git(&["add", "notes.md"]);
        fixture.write("core.txt", "unstaged\n");
        fixture.write("untracked.txt", "brand new\n");

        fixture
    }

    /// A repository stopped mid-merge, with one conflicted file.
    ///
    /// Kept separate from [`Fixture::woven`]: a repository in the middle of a
    /// merge is a state the other screens should not be tested against.
    pub fn conflicted() -> Self {
        let fixture = Self::empty();

        fixture.write("shared.txt", "one\ntwo\nthree\n");
        fixture.write("untouched.txt", "calm\n");
        fixture.git(&["add", "-A"]);
        fixture.commit("Base");

        fixture.git(&["switch", "-q", "-c", "theirs"]);
        fixture.write("shared.txt", "one\nTHEIRS\nthree\n");
        fixture.commit_all("Their change");

        fixture.git(&["switch", "-q", "main"]);
        fixture.write("shared.txt", "one\nOURS\nthree\n");
        fixture.commit_all("Our change");

        // Expected to fail: stopping mid-merge is the point of this fixture.
        let _ = Command::new("git")
            .current_dir(fixture.dir.path())
            .args(["merge", "theirs"])
            .env("GIT_TERMINAL_PROMPT", "0")
            .output();

        fixture
    }

    pub fn path(&self) -> &Path {
        self.dir.path()
    }

    /// Run `git` in the fixture, returning stdout. Panics on failure, since a
    /// fixture that did not build is not a test result worth reporting.
    pub fn git(&self, args: &[&str]) -> String {
        let output = Command::new("git")
            .current_dir(self.dir.path())
            .args(args)
            .env("GIT_TERMINAL_PROMPT", "0")
            .env("GIT_CONFIG_NOSYSTEM", "1")
            .env("HOME", self.dir.path())
            .output()
            .unwrap_or_else(|e| panic!("running git {args:?}: {e}"));

        assert!(
            output.status.success(),
            "git {args:?} failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        String::from_utf8_lossy(&output.stdout).into_owned()
    }

    pub fn write(&self, path: &str, contents: &str) {
        self.write_bytes(path, contents.as_bytes());
    }

    pub fn write_bytes(&self, path: &str, contents: &[u8]) {
        let full = self.dir.path().join(path);
        if let Some(parent) = full.parent() {
            std::fs::create_dir_all(parent).expect("fixture directory");
        }
        std::fs::write(full, contents).expect("fixture file");
    }

    pub fn remove(&self, path: &str) {
        std::fs::remove_file(self.dir.path().join(path)).expect("removing a fixture file");
    }

    /// Commit what is staged. Returns the new commit's full id.
    pub fn commit(&self, message: &str) -> String {
        self.git(&["commit", "-q", "-m", message]);
        self.head()
    }

    /// Stage every tracked change and commit. Returns the new commit's full id.
    pub fn commit_all(&self, message: &str) -> String {
        self.git(&["commit", "-q", "-am", message]);
        self.head()
    }

    pub fn head(&self) -> String {
        self.git(&["rev-parse", "HEAD"]).trim().to_string()
    }

    /// Resolve any revision the way `git rev-parse` would.
    pub fn rev(&self, revision: &str) -> String {
        self.git(&["rev-parse", revision]).trim().to_string()
    }

    pub fn open(&self) -> gix::Repository {
        crate::repo::open(self.dir.path()).expect("opening the fixture")
    }
}
