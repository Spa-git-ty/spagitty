<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-015 — Plan

**Item:** [`agile/items/BUG-015-backend-list-disarms-the-safe-renderer.md`](../items/BUG-015-backend-list-disarms-the-safe-renderer.md)
**Branch:** `bugfix/BUG-015-backend-list-disarms-renderer`
**Base:** `356142f`, not `dev`. `dev` is 71 commits behind and predates the
module this fixes; the author approved the base with the plan.

## Approach

One condition, in `settings` in `src-tauri/src/platform.rs`:

```diff
-    if backend.is_some() {
+    if backend == Some("x11") {
```

Everything else about FEAT-055's policy is left where it is.

### Why the value and not the presence

`GDK_BACKEND` is a GDK *preference list*: a comma-separated sequence tried in
order, with `*` meaning "then anything". `wayland,x11,*` is what a session
exports when it wants GDK's normal behaviour written down, not when it wants
XWayland. There is no way to tell a list apart from a choice except by reading
it, and `is_some()` does not read it.

Only `x11` alone is unambiguous: a list containing `x11` is a fallback, and a
bare `x11` is a request. Matching that one value keeps the case FEAT-055 wrote
the rule for — a user testing the accelerated XWayland path must not have the
renderer disabled underneath them — and drops the case it never meant to catch.

### Alternatives considered

- **Parse the list and take its first entry.** `wayland,x11,*` would then read
  as `wayland`, which is right, but `x11,wayland` would read as a request for
  XWayland when it is a fallback list like any other. More code, more ways to be
  wrong, and no case it gets right that matching `x11` does not.
- **Ignore `GDK_BACKEND` entirely and always disable the renderer.** Simplest,
  and it takes away the only way to try the accelerated path on a host whose
  driver serves it — the escape hatch FEAT-055 deliberately left open.
- **Set `GDK_BACKEND=wayland` ourselves.** Overriding a variable the session
  owns, to work around not understanding it. It would also break the XWayland
  path for the person who asked for it.

## Files

- `src-tauri/src/platform.rs` — the condition, the module documentation
  paragraph that said "an opinion" without saying how narrow that is, and one
  new test.

## Testing

`a_backend_preference_list_still_takes_the_safe_renderer` — a table of three
values (`wayland,x11,*`, `wayland`, `x11,wayland`), each asserting the safe
renderer survives. It fails without the fix, which is what makes it a regression
test rather than a description.

`an_explicit_backend_is_never_overridden` is unchanged and still passes: the
bare `x11` case is the behaviour being preserved, not the behaviour being
changed, and a fix that broke it would be trading one bug for another.

## Risk

Low, and the risk is in the direction of the safe path: a host that would have
been left accelerated is now put on software rendering. The one behaviour that
could regress — `GDK_BACKEND=x11` — is held by an existing test.

Amendment 9 applies to this area from now on. `Error 71` before the first frame
is BUG-004's failure returning under a different cause; a third appearance is a
CODE ORANGE, not another patch.

## Rollback

Restore `backend.is_some()`. Hosts that export a preference list go back to
dying at the first frame.
