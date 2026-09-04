<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-069 — Implementation plan

**Item:** [`agile/items/FEAT-069-multi-identity-profiles.md`](../items/FEAT-069-multi-identity-profiles.md)

## Approach

Implement identity profile presets allowing fast switching between different author
names, emails, and GPG/SSH signing keys. In `spagitty-core::identity`, define `IdentityProfile`
and `apply_profile` setting local or global configuration. In `src-tauri`, persist
profiles in `profiles.json` and expose IPC commands. In the frontend, add `ProfilesSection`
in Settings (1K), a reactive `profiles` store, and a committer profile indicator with a
quick-switch dropdown in `StatusStrip.svelte`.

## Touched files

- `crates/spagitty-core/src/identity.rs`
- `src-tauri/src/profiles.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src/lib/types.ts`
- `src/lib/api.ts`
- `src/lib/profiles/store.svelte.ts`
- `src/lib/profiles/store.test.ts`
- `src/lib/settings/ProfilesSection.svelte`
- `src/routes/settings/+page.svelte`
- `src/lib/chrome/StatusStrip.svelte`
- `agile/items/FEAT-069-multi-identity-profiles.md`
- `agile/plans/FEAT-069-plan.md`
- `agile/testing/FEAT-069-automated.md`
- `agile/testing/FEAT-069-sweep.md`

## Steps

1. Implement `IdentityProfile` and `apply_profile` in `crates/spagitty-core/src/identity.rs`.
2. Add `src-tauri/src/profiles.rs` persistence and expose Tauri IPC commands.
3. Add `IdentityProfile` TypeScript interface in `src/lib/types.ts` and API functions in `src/lib/api.ts`.
4. Implement `profiles` reactive store and unit tests in `src/lib/profiles/`.
5. Build `ProfilesSection.svelte` in Settings (screen 1K).
6. Integrate active profile indicator and quick-switcher menu into `src/lib/chrome/StatusStrip.svelte`.
7. Validate with Rust cargo tests, Vitest test suite, and record test suite.
