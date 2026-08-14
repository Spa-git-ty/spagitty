// SPDX-License-Identifier: GPL-3.0-or-later

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

    tauri_build::build()
}
