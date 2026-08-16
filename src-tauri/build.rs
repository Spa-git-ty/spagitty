// SPDX-License-Identifier: GPL-3.0-or-later

mod licenses;

use std::path::PathBuf;

fn main() {
    // GPL-3 wants a build to be able to point at the source it came from. The
    // commit is stamped in here and shown in Settings -> Advanced -> About.
    let sha = std::process::Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".into());
    println!("cargo:rustc-env=GITLORD_COMMIT={sha}");

    // The other half of the same obligation: what this binary is made of. The
    // list is generated from the lockfiles rather than typed, and a build that
    // cannot generate it still builds — see `licenses.rs`.
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").expect("a manifest dir"));
    let out_dir = PathBuf::from(std::env::var("OUT_DIR").expect("an out dir"));
    licenses::generate(&manifest_dir, &out_dir);

    for trigger in licenses::rerun_triggers(&manifest_dir) {
        println!("cargo:rerun-if-changed={}", trigger.display());
    }

    tauri_build::build()
}
