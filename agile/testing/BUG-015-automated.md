<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-015 — Automated tests

**Item:** [`agile/items/BUG-015-backend-list-disarms-the-safe-renderer.md`](../items/BUG-015-backend-list-disarms-the-safe-renderer.md)
**File:** `src-tauri/src/platform.rs`, `mod tests`.

## The test written for this fix

`a_backend_preference_list_still_takes_the_safe_renderer` — unit, over the pure
`settings` function, no window and no webview:

```rust
for chosen in ["wayland,x11,*", "wayland", "x11,wayland"] {
    let set = settings(true, Some(chosen), None, None);
    assert_eq!(value(&set, "WEBKIT_DISABLE_DMABUF_RENDERER"), Some("1"),
               "with GDK_BACKEND={chosen:?}");
}
```

Three values, each a different way of not being a decision:

| Value | Why it is in the table |
| --- | --- |
| `wayland,x11,*` | the distribution default that produced the report |
| `wayland` | a bare backend that is not `x11` — the fix must not special-case only lists |
| `x11,wayland` | a list whose **first** entry is `x11`, so a fix that parsed the head instead of matching the whole value would fail here |

## It fails without the fix — measured, not asserted

With the condition restored to `backend.is_some()`:

```
test platform::tests::a_backend_preference_list_still_takes_the_safe_renderer ... FAILED
test result: FAILED. 6 passed; 1 failed
```

With the fix in place:

```
test result: ok. 68 passed; 0 failed
```

That is the Amendment 9 obligation for a fix: a test that goes red when the
defect is put back.

## What is held unchanged

`an_explicit_backend_is_never_overridden` asserts `GDK_BACKEND=x11` still has
nothing done to it. It passes in both runs above, which is the point — this fix
narrows one condition and must not take the escape hatch with it.

`a_wayland_session_takes_the_path_that_paints`, `an_x11_session_is_left_where_it_is`,
`an_explicit_renderer_choice_is_left_alone` and
`an_explicit_compositing_choice_is_left_alone` are FEAT-055's rows and are
untouched.

## Recorded run

```
$ cargo test -p spagitty
test result: ok. 68 passed; 0 failed; 0 ignored; 0 measured
```

## Coverage

`settings` is a pure function and every branch of it now has a test: no session,
Wayland with nothing set, an explicit renderer, a bare `x11`, a list, and an
explicit compositing choice. The Amendment 10 floor is not at risk from this
change — it adds four asserted lines and no unasserted ones.

## What is not tested here, and why

That the window actually paints. `settings` is pure precisely so the policy can
be read off a table without a display server; whether the chosen path survives
on a given driver is a measurement, and it lives in the sweep as a manual
ticket. An automated test that launched a window would also violate Amendment 4.
