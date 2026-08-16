// SPDX-License-Identifier: GPL-3.0-or-later

//! What this build is, and what it is made of.
//!
//! Both halves of the GPL-3 obligation the About section exists to meet: the
//! exact commit the binary was built from, so its corresponding source can be
//! found, and the license of every dependency linked into it.
//!
//! The list is generated at build time by `../licenses.rs` and included here as
//! text. It is parsed on demand rather than at startup: it is read once, when
//! somebody opens Advanced → About.

use serde::{Deserialize, Serialize};

/// The generated list, as `build.rs` left it.
///
/// A build that could not generate it still produces this file, and the parse
/// below turns anything unreadable into an empty list with a note — which is
/// what the screen shows in place of a list it does not have.
const GENERATED: &str = include_str!(concat!(env!("OUT_DIR"), "/licenses.json"));

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct About {
    pub version: &'static str,
    /// The commit this binary was built from, for the GPL-3 "corresponding
    /// source" obligation.
    pub commit: &'static str,
    pub license: &'static str,
}

pub fn about() -> About {
    About {
        version: env!("CARGO_PKG_VERSION"),
        commit: env!("GITLORD_COMMIT"),
        license: "GPL-3.0-or-later",
    }
}

/// One dependency and the terms it is under.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Dependency {
    pub name: String,
    pub version: String,
    /// `None` where the package declares none. Shown as "not declared" rather
    /// than hidden: a list that looks complete and is not is the worse failure.
    pub license: Option<String>,
}

/// Every dependency in the build, by ecosystem.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Licenses {
    /// False when neither list could be generated. The screen says so instead
    /// of showing an empty list, which would read as "no dependencies".
    pub generated: bool,
    /// What is missing and why, in the words the build script recorded.
    pub notes: Vec<String>,
    pub rust: Vec<Dependency>,
    pub npm: Vec<Dependency>,
}

/// The dependency license list this binary was built with.
pub fn licenses() -> Licenses {
    parse(GENERATED)
}

/// A list that cannot be read is a list that was not generated.
///
/// The alternative is failing the command, which would take the version, the
/// commit and the trademark notice down with it — the parts of About that are
/// an obligation rather than a courtesy.
fn parse(text: &str) -> Licenses {
    serde_json::from_str(text).unwrap_or_else(|error| Licenses {
        generated: false,
        notes: vec![format!(
            "The dependency license list could not be read from this build ({error})."
        )],
        ..Licenses::default()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_build_stamps_in_a_version_a_commit_and_the_license() {
        let about = about();

        assert_eq!(about.version, env!("CARGO_PKG_VERSION"));
        assert_eq!(about.license, "GPL-3.0-or-later");
        assert!(!about.commit.is_empty(), "the commit is always stamped");
    }

    #[test]
    fn this_build_carries_a_generated_list_covering_both_trees() {
        // The list is an obligation, not a nicety: if this fails, the build
        // being tested cannot tell a user what it is made of.
        let licenses = licenses();

        assert!(licenses.generated, "notes: {:?}", licenses.notes);
        assert!(!licenses.rust.is_empty(), "the Rust tree is listed");
        assert!(!licenses.npm.is_empty(), "the npm tree is listed");
    }

    #[test]
    fn the_list_names_the_library_the_reading_is_done_with() {
        // gix is what every read in this application goes through, so its
        // absence would mean the walk found the wrong set of packages.
        let licenses = licenses();

        let gix = licenses
            .rust
            .iter()
            .find(|dependency| dependency.name == "gix")
            .expect("gix is linked into this binary");
        assert_eq!(gix.license.as_deref(), Some("MIT OR Apache-2.0"));
    }

    #[test]
    fn nothing_that_only_builds_the_application_is_listed_as_part_of_it() {
        // `tauri-build` runs in the build script and is not in the binary, so
        // describing it as something the binary is made of would be wrong.
        //
        // `tempfile` is deliberately *not* asserted against, though it is a
        // development dependency of the core: it is also a normal dependency of
        // `gix-odb`, so it really is linked. The list says what is there, not
        // what a manifest happens to mention.
        let names: Vec<String> = licenses()
            .rust
            .iter()
            .map(|dependency| dependency.name.clone())
            .collect();

        for build_only in ["tauri-build", "tauri-winres", "cc"] {
            assert!(!names.iter().any(|name| name == build_only), "{names:?}");
        }
    }

    #[test]
    fn no_development_only_npm_package_is_listed() {
        // Vite, vitest and svelte-check are how the frontend is built and
        // checked; none of them is in what ships.
        let names: Vec<String> = licenses()
            .npm
            .iter()
            .map(|dependency| dependency.name.clone())
            .collect();

        for tool in ["vite", "vitest", "svelte-check", "typescript"] {
            assert!(
                !names.iter().any(|name| name == tool),
                "{tool} in {names:?}"
            );
        }
    }

    #[test]
    fn a_build_that_could_not_generate_the_list_says_so_rather_than_showing_none() {
        let degraded = parse(r#"{"generated": false, "notes": ["cargo metadata failed."]}"#);

        assert!(!degraded.generated);
        assert_eq!(degraded.notes, vec!["cargo metadata failed."]);
        assert!(degraded.rust.is_empty());
    }

    #[test]
    fn a_list_that_cannot_be_read_degrades_instead_of_failing_the_command() {
        // The version, the commit and the trademark notice are in the same
        // section. An unreadable list must not take them down with it.
        for broken in ["", "{", "null", "not json"] {
            let licenses = parse(broken);

            assert!(!licenses.generated, "for {broken:?}");
            assert_eq!(licenses.notes.len(), 1, "for {broken:?}");
        }
    }

    #[test]
    fn a_package_that_declares_no_license_is_listed_as_not_declared() {
        let licenses = parse(r#"{"generated": true, "rust": [{"name": "a", "version": "1"}]}"#);

        assert_eq!(licenses.rust[0].license, None);
        assert_eq!(licenses.rust[0].name, "a");
    }
}
