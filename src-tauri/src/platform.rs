// SPDX-License-Identifier: GPL-3.0-or-later

//! What the host needs arranged before the webview starts.
//!
//! Nothing here is git or Spagitty: it is the small set of platform facts that
//! have to be true by the time WebKitGTK builds its first frame.
//!
//! # The Linux rendering path (FEAT-055)
//!
//! WebKitGTK can present its frames three ways. Measured on a Wayland session
//! with an NVIDIA driver, driving a real window rather than a `--headless`
//! guess:
//!
//! | session  | DMABuf renderer | result |
//! |----------|-----------------|--------|
//! | Wayland  | on              | `Error 71 (Protocol error) dispatching to Wayland display`, process dies |
//! | XWayland | on              | paints, then **loses its buffer** — the window goes transparent and stays that way |
//! | Wayland  | off             | paints, and keeps painting; repaints through shared memory, on the CPU |
//!
//! Only the last one works, so it is the default, and that is what BUG-004
//! concluded as well. The cost is real and worth stating plainly: every blur,
//! shadow, gradient and scrolled row is rasterized in software, which is why
//! the interface is careful about how many of those it asks for.
//!
//! Both accelerated paths stay reachable for a host whose driver serves them —
//! `WEBKIT_DISABLE_DMABUF_RENDERER=0` for native Wayland, plus `GDK_BACKEND=x11`
//! for XWayland. Every variable here is left alone when the environment already
//! has an opinion, in either direction. A host that has just changed its
//! driver is exactly the case worth retrying.
//!
//! An *opinion* is narrower than a value being present (BUG-015). `GDK_BACKEND`
//! takes a preference list, and several distributions export one by default —
//! `wayland,x11,*` means "try these in order", not "use XWayland". Reading any
//! value as a deliberate request disarmed the safe renderer for every user of
//! those distributions, and the window died with `Error 71` before its first
//! frame. Only a bare `x11` is a decision.

/// One environment variable Spagitty wants set, and the value it wants.
type Setting = (&'static str, &'static str);

/// What the process should export, given what the environment already says.
///
/// Pure, so the policy above can be read off a table in the tests rather than
/// inferred from a running window on one person's machine.
///
/// `wayland` is whether this is a Wayland session — `WAYLAND_DISPLAY` set.
/// `backend`, `dmabuf`, `compositing` and `no_at_bridge` are the current values of
/// `GDK_BACKEND`, `WEBKIT_DISABLE_DMABUF_RENDERER`,
/// `WEBKIT_FORCE_COMPOSITING_MODE` and `NO_AT_BRIDGE`.
fn settings(
    wayland: bool,
    backend: Option<&str>,
    dmabuf: Option<&str>,
    compositing: Option<&str>,
    no_at_bridge: Option<&str>,
) -> Vec<Setting> {
    let mut out = Vec::new();
    // WebKitGTK on Linux has a known deadlock bug with at-spi2: when an AT-SPI
    // registry daemon is running (standard on modern Linux desktop installs),
    // user interactions in the webview trigger synchronous ATK D-Bus queries that
    // deadlock the GTK main thread event loop, causing "Application Not Responding".
    // Disabling the AT-SPI bridge prevents the hang unless explicitly configured.
    if no_at_bridge.is_none() {
        out.push(("NO_AT_BRIDGE", "1"));
    }


    // The whole page on one path rather than WebKitGTK deciding per layer.
    // Harmless on the software renderer and necessary on the accelerated one.
    if compositing.is_none() {
        out.push(("WEBKIT_FORCE_COMPOSITING_MODE", "1"));
    }

    // Not a Wayland session: nothing here applies.
    if !wayland {
        return out;
    }

    // An explicit backend is somebody's decision — but only a decision about
    // *which* path counts as one. A bare `x11` is a deliberate request for
    // XWayland, and takes the renderer decision with it. A preference list
    // like `wayland,x11,*` — what several distributions export by default —
    // is not a choice anyone made; treating it as one silently disarmed the
    // safe renderer below and the window died with `Error 71` before its
    // first frame.
    if backend == Some("x11") {
        return out;
    }

    // The safe path, and the default: a native Wayland surface with the DMABuf
    // renderer off. Slower, and it is what paints.
    if dmabuf.is_none() {
        out.push(("WEBKIT_DISABLE_DMABUF_RENDERER", "1"));
    }

    out
}

/// Applies the webview environment for the current process.
///
/// Called as the first thing in `run`, before any thread exists and before the
/// webview reads its environment, because `set_var` is only safe while the
/// process is still single-threaded.
pub fn prepare_webview() {
    if !cfg!(target_os = "linux") {
        return;
    }

    let wayland = std::env::var("WAYLAND_DISPLAY").is_ok();
    let backend = std::env::var("GDK_BACKEND").ok();
    let dmabuf = std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").ok();
    let compositing = std::env::var("WEBKIT_FORCE_COMPOSITING_MODE").ok();
    let no_at_bridge = std::env::var("NO_AT_BRIDGE").ok();

    for (name, value) in settings(
        wayland,
        backend.as_deref(),
        dmabuf.as_deref(),
        compositing.as_deref(),
        no_at_bridge.as_deref(),
    ) {
        std::env::set_var(name, value);
    }
}

#[cfg(test)]
mod tests {
    use super::settings;

    fn value<'a>(set: &'a [(&str, &str)], name: &str) -> Option<&'a str> {
        set.iter().find(|(key, _)| *key == name).map(|(_, v)| *v)
    }

    /// The default on Wayland: the software path, because it is the only one
    /// measured to keep painting on the driver this was found on.
    #[test]
    fn a_wayland_session_takes_the_path_that_paints() {
        let set = settings(true, None, None, None, None);

        assert_eq!(value(&set, "WEBKIT_DISABLE_DMABUF_RENDERER"), Some("1"));
        assert_eq!(value(&set, "WEBKIT_FORCE_COMPOSITING_MODE"), Some("1"));
        assert_eq!(value(&set, "GDK_BACKEND"), None);
    }

    /// Asking for the accelerated renderer is how a host with a driver that
    /// serves it gets it. Nothing may quietly put the workaround back.
    #[test]
    fn an_explicit_renderer_choice_is_left_alone() {
        for chosen in ["0", "1", ""] {
            let set = settings(true, None, Some(chosen), None, None);
            assert_eq!(
                value(&set, "WEBKIT_DISABLE_DMABUF_RENDERER"),
                None,
                "with {chosen:?} already set"
            );
        }
    }

    /// A chosen backend takes the renderer decision with it: somebody running
    /// `GDK_BACKEND=x11` is trying the XWayland path and must not have the
    /// renderer disabled underneath them.
    #[test]
    fn an_explicit_backend_is_never_overridden() {
        let set = settings(true, Some("x11"), None, None, None);

        assert_eq!(value(&set, "GDK_BACKEND"), None);
        assert_eq!(value(&set, "WEBKIT_DISABLE_DMABUF_RENDERER"), None);
    }

    /// A distribution's default backend *list* is not a decision. It must
    /// leave the safe renderer in place, or the window dies before it paints.
    #[test]
    fn a_backend_preference_list_still_takes_the_safe_renderer() {
        for chosen in ["wayland,x11,*", "wayland", "x11,wayland"] {
            let set = settings(true, Some(chosen), None, None, None);

            assert_eq!(
                value(&set, "WEBKIT_DISABLE_DMABUF_RENDERER"),
                Some("1"),
                "with GDK_BACKEND={chosen:?}"
            );
        }
    }

    /// An X11 session never had the bug, and gets nothing done to it.
    #[test]
    fn an_x11_session_is_left_where_it_is() {
        let set = settings(false, None, None, None, None);

        assert_eq!(value(&set, "WEBKIT_DISABLE_DMABUF_RENDERER"), None);
        assert_eq!(value(&set, "GDK_BACKEND"), None);
        assert_eq!(value(&set, "WEBKIT_FORCE_COMPOSITING_MODE"), Some("1"));
    }

    #[test]
    fn an_explicit_compositing_choice_is_left_alone() {
        let set = settings(false, None, None, Some("0"), None);
        assert_eq!(value(&set, "WEBKIT_FORCE_COMPOSITING_MODE"), None);
    }
    #[test]
    fn at_bridge_is_disabled_by_default_on_linux() {
        let set = settings(true, None, None, None, None);
        assert_eq!(value(&set, "NO_AT_BRIDGE"), Some("1"));
    }

    #[test]
    fn an_explicit_at_bridge_choice_is_left_alone() {
        for chosen in ["0", "1"] {
            let set = settings(true, None, None, None, Some(chosen));
            assert_eq!(value(&set, "NO_AT_BRIDGE"), None);
        }
    }

    /// The process really does export what the policy decided.
    #[test]
    #[cfg(target_os = "linux")]
    fn the_process_environment_carries_the_decision() {
        std::env::remove_var("WEBKIT_FORCE_COMPOSITING_MODE");

        super::prepare_webview();

        assert_eq!(
            std::env::var("WEBKIT_FORCE_COMPOSITING_MODE").as_deref(),
            Ok("1")
        );
    }
}
