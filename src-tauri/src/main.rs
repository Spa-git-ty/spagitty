// SPDX-License-Identifier: GPL-3.0-or-later

// The binary is `gitlumiere`, never `git-lumiere`: git treats any `git-foo` on PATH
// as a subcommand, so the hyphenated name would make `git lumiere` start working
// by accident.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    gitlumiere_lib::run()
}
