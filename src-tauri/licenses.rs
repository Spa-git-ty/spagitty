// SPDX-License-Identifier: GPL-3.0-or-later

//! The dependency license list, generated at build time.
//!
//! GPL-3 asks that a user can see what the binary they are running is made of.
//! Hand-typing that list guarantees it is wrong by the next dependency change,
//! so it is generated from the two sources of truth — `Cargo.lock` by way of
//! `cargo metadata`, and the installed frontend tree reached from the
//! production dependencies of `package.json` — and written into `OUT_DIR` for
//! `src/about.rs` to include.
//!
//! **No new tool is required.** The plan was `cargo-about`; making every machine
//! and every CI runner install a build tool is a cost this can avoid, since
//! `cargo` itself reads the lockfile and the frontend list is read from the
//! installed package manifests.
//!
//! **A list that cannot be generated degrades; it never fails the build.** A
//! checkout with no `node_modules`, an environment where `cargo metadata` cannot
//! run offline, a vendored tree — each produces a shorter list and a note saying
//! what is missing and why. An application that will not build because it could
//! not describe itself is worse than one that admits the gap.
//!
//! Only what is *linked* is listed. `cargo metadata` reports build and
//! development dependencies too, and neither is distributed: `tauri-build` and
//! `tempfile` are not in the binary, and listing them would misdescribe it. The
//! frontend half walks only the production dependencies declared in the root
//! `package.json`, so the bundler and the test runner are reached by no edge
//! and are listed by none.

use std::collections::{BTreeMap, BTreeSet, VecDeque};
use std::path::{Path, PathBuf};
use std::process::Command;

use serde_json::{json, Value};

/// What a dependency is called, what version is linked, and under what terms.
struct Dependency {
    name: String,
    version: String,
    /// `None` when the package declares no SPDX expression. Listed as "not
    /// declared" rather than dropped: an incomplete list that looks complete is
    /// worse than one that admits a gap.
    license: Option<String>,
}

impl Dependency {
    fn to_json(&self) -> Value {
        json!({
            "name": self.name,
            "version": self.version,
            "license": self.license,
        })
    }
}

/// Generate `licenses.json` in `out_dir`.
///
/// Never fails. Every problem becomes a note in the file itself, which is what
/// the About section shows in place of a list it does not have.
pub fn generate(manifest_dir: &Path, out_dir: &Path) {
    let mut notes: Vec<String> = Vec::new();

    let rust = match rust_dependencies(manifest_dir) {
        Ok(found) => found,
        Err(why) => {
            notes.push(format!(
                "The Rust dependency list was not generated: {why}."
            ));
            Vec::new()
        }
    };

    let npm = match npm_dependencies(manifest_dir) {
        Ok(found) => found,
        Err(why) => {
            notes.push(format!("The npm dependency list was not generated: {why}."));
            Vec::new()
        }
    };

    let undeclared = rust
        .iter()
        .chain(npm.iter())
        .filter(|dependency| dependency.license.is_none())
        .count();
    if undeclared > 0 {
        notes.push(format!(
            "{undeclared} package(s) declare no license in their manifest and are listed as \
             not declared."
        ));
    }

    let document = json!({
        "generated": !rust.is_empty() || !npm.is_empty(),
        "notes": notes,
        "rust": rust.iter().map(Dependency::to_json).collect::<Vec<_>>(),
        "npm": npm.iter().map(Dependency::to_json).collect::<Vec<_>>(),
    });

    let text = serde_json::to_string(&document).unwrap_or_else(|_| "{}".into());
    let _ = std::fs::write(out_dir.join("licenses.json"), text);
}

/// Every crate actually linked into this binary, with its license.
///
/// `--filter-platform` is not an optimisation: without it `cargo metadata`
/// resolves for every platform the tree mentions, which means packages that were
/// never downloaded for this build and a failure under `--offline`.
fn rust_dependencies(manifest_dir: &Path) -> Result<Vec<Dependency>, String> {
    let cargo = std::env::var("CARGO").unwrap_or_else(|_| "cargo".into());
    let target = std::env::var("TARGET").map_err(|_| "TARGET is not set".to_string())?;

    let output = Command::new(cargo)
        .args([
            "metadata",
            "--format-version",
            "1",
            "--locked",
            "--offline",
            "--filter-platform",
            &target,
            "--manifest-path",
        ])
        .arg(manifest_dir.join("Cargo.toml"))
        .output()
        .map_err(|error| format!("cargo metadata could not be run ({error})"))?;

    if !output.status.success() {
        return Err(format!(
            "cargo metadata failed ({})",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    let metadata: Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("cargo metadata was not readable ({error})"))?;

    let members: BTreeSet<&str> = metadata["workspace_members"]
        .as_array()
        .map(|ids| ids.iter().filter_map(Value::as_str).collect())
        .unwrap_or_default();

    let linked = linked_from(&metadata, &members);

    let mut dependencies: Vec<Dependency> = metadata["packages"]
        .as_array()
        .ok_or_else(|| "cargo metadata carried no packages".to_string())?
        .iter()
        .filter(|package| {
            package["id"]
                .as_str()
                .is_some_and(|id| linked.contains(id) && !members.contains(id))
        })
        .map(|package| Dependency {
            name: package["name"].as_str().unwrap_or("unknown").to_string(),
            version: package["version"].as_str().unwrap_or("").to_string(),
            license: package["license"].as_str().map(str::to_string),
        })
        .collect();

    dependencies.sort_by(|a, b| (&a.name, &a.version).cmp(&(&b.name, &b.version)));
    dependencies.dedup_by(|a, b| a.name == b.name && a.version == b.version);
    Ok(dependencies)
}

/// The transitive closure of the workspace's *normal* dependencies.
///
/// A build dependency compiles the program and a development dependency tests
/// it; neither ends up in what is shipped, so neither is described as something
/// the binary is made of.
fn linked_from(metadata: &Value, members: &BTreeSet<&str>) -> BTreeSet<String> {
    let mut normal_deps: BTreeMap<&str, Vec<&str>> = BTreeMap::new();

    for node in metadata["resolve"]["nodes"]
        .as_array()
        .into_iter()
        .flatten()
    {
        let Some(id) = node["id"].as_str() else {
            continue;
        };
        let deps = node["deps"]
            .as_array()
            .into_iter()
            .flatten()
            .filter(|dep| {
                dep["dep_kinds"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .any(|kind| kind["kind"].is_null())
            })
            .filter_map(|dep| dep["pkg"].as_str())
            .collect();
        normal_deps.insert(id, deps);
    }

    let mut linked = BTreeSet::new();
    let mut pending: Vec<&str> = members.iter().copied().collect();
    while let Some(id) = pending.pop() {
        if !linked.insert(id.to_string()) {
            continue;
        }
        if let Some(deps) = normal_deps.get(id) {
            pending.extend(deps.iter().copied());
        }
    }
    linked
}

/// Every JS package that ships in the built frontend, with its license.
///
/// The production tree is what the root `package.json` `dependencies` and
/// `optionalDependencies` reach through the installed `node_modules` tree.
/// Development-only packages — the test runner, the type checker, the bundler —
/// are not part of the closure, exactly as `"dev": true` was refused for the
/// old lockfile. Each package's manifest is read at its installed path, so the
/// list reflects what is actually linked rather than what a lockfile promised.
///
/// Hoisted and nested installs are both resolved: bun (like npm) hoists the
/// common version to the root and nests a conflicting version under the package
/// that needs it, which is Node's own resolution walk.
fn npm_dependencies(manifest_dir: &Path) -> Result<Vec<Dependency>, String> {
    let root = manifest_dir
        .parent()
        .ok_or_else(|| "the project root could not be found".to_string())?;

    let root_manifest = read_manifest(&root.join("package.json"))?;

    let mut resolved: BTreeMap<String, Dependency> = BTreeMap::new();
    let mut visited: BTreeSet<PathBuf> = BTreeSet::new();
    let mut pending: VecDeque<(String, PathBuf)> = dependency_names(&root_manifest)
        .into_iter()
        .map(|name| (name, root.to_owned()))
        .collect();

    while let Some((name, from)) = pending.pop_front() {
        let directory = resolve_in_tree(&from, &name)
            .ok_or_else(|| format!("{name} is not present in the installed tree"))?;
        if !visited.insert(directory.clone()) {
            continue;
        }

        let manifest = read_manifest(&directory.join("package.json"))?;
        let version = manifest["version"].as_str().unwrap_or("").to_string();
        let license = license_from_manifest(&manifest);
        resolved.insert(
            format!("{name}@{version}"),
            Dependency {
                name,
                version,
                license,
            },
        );

        pending.extend(
            dependency_names(&manifest)
                .into_iter()
                .map(|child| (child, directory.clone())),
        );
    }

    let mut dependencies: Vec<Dependency> = resolved.into_values().collect();
    dependencies.sort_by(|a, b| (&a.name, &a.version).cmp(&(&b.name, &b.version)));
    Ok(dependencies)
}

/// The dependencies that ship, by name.
///
/// `optionalDependencies` ship like ordinary ones — a platform-gated package
/// that is present is part of the build — so both objects contribute. What is
/// actually present is decided by the installed tree, never by the ranges: the
/// manifests are the source of version and license.
fn dependency_names(manifest: &Value) -> Vec<String> {
    let mut names: Vec<String> = manifest["dependencies"]
        .as_object()
        .into_iter()
        .flat_map(|dependencies| dependencies.keys().cloned())
        .collect();
    if let Some(optional) = manifest["optionalDependencies"].as_object() {
        names.extend(optional.keys().cloned());
    }
    names
}

/// The directory a package is installed in, reached the way Node resolves it.
///
/// From a package's own directory, its dependencies live in that package's
/// `node_modules`, then in each ancestor's. The walk ascends one directory at a
/// time, which is Node's own rule: a nested conflicting version resolves
/// closest to the package that needs it, a hoisted one at the root
/// `node_modules`.
fn resolve_in_tree(from: &Path, name: &str) -> Option<PathBuf> {
    let mut directory = from.to_path_buf();
    loop {
        let candidate = directory.join("node_modules").join(name);
        if candidate.join("package.json").is_file() {
            return Some(candidate);
        }
        directory = directory.parent()?.to_path_buf();
    }
}

fn read_manifest(path: &Path) -> Result<Value, String> {
    let text =
        std::fs::read_to_string(path).map_err(|error| format!("{} ({error})", path.display()))?;
    serde_json::from_str(&text)
        .map_err(|error| format!("{} was not readable ({error})", path.display()))
}

/// A package's own declaration of what it is licensed under.
///
/// npm has published both `"license": "MIT"` and the older
/// `"license": { "type": "MIT" }`, so both are read.
fn license_from_manifest(manifest: &Value) -> Option<String> {
    manifest["license"]
        .as_str()
        .map(str::to_string)
        .or_else(|| manifest["license"]["type"].as_str().map(str::to_string))
}

/// The files the generated list is derived from. A change to either is a reason
/// to build it again; nothing else is.
pub fn rerun_triggers(manifest_dir: &Path) -> Vec<PathBuf> {
    let root = manifest_dir.parent().map(Path::to_path_buf);
    let mut triggers = vec![manifest_dir.join("Cargo.toml")];
    if let Some(root) = root {
        triggers.push(root.join("Cargo.lock"));
        triggers.push(root.join("bun.lock"));
        triggers.push(root.join("package.json"));
    }
    triggers
}
