// SPDX-License-Identifier: GPL-3.0-or-later

// The binary is `gitlord`, never `git-lord`: git treats any `git-foo` on PATH
// as a subcommand, so the hyphenated name would make `git lord` start working
// by accident.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    gitlord_lib::run()
}
