// SPDX-License-Identifier: GPL-3.0-or-later

//! What the host needs arranged before the webview starts.
//!
//! Nothing here is git or GitLumiere: it is the small set of platform facts that
//! have to be true by the time WebKitGTK builds its first frame.

/// The value GitLumiere wants for `WEBKIT_DISABLE_DMABUF_RENDERER`, given what the
/// environment already says.
///
/// WebKitGTK's DMABuf renderer fails on several Linux driver and compositor
/// combinations — `Failed to create GBM buffer of size 1280x800: Invalid
/// argument` on stderr — and the window then stays blank for the whole session.
/// Disabling the renderer gives up its zero-copy path and repaints through
/// shared memory instead, which is slower and visible.
///
/// An explicit value already in the environment always wins. Someone who sets
/// `0` is asking for the accelerated path on hardware where it works, and this
/// is not the place to argue with them.
fn dmabuf_renderer_setting(existing: Option<&str>) -> Option<&'static str> {
    match existing {
        Some(_) => None,
        None => Some("1"),
    }
}

/// Applies the webview environment for the current process.
///
/// Called as the first thing in `run`, before any thread exists and before the
/// webview reads its environment, because `set_var` is only safe while the
/// process is still single-threaded.
pub fn prepare_webview() {
    if cfg!(target_os = "linux") {
        let existing = std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").ok();
        if let Some(value) = dmabuf_renderer_setting(existing.as_deref()) {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", value);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::dmabuf_renderer_setting;

    #[test]
    fn unset_environment_gets_the_renderer_disabled() {
        assert_eq!(dmabuf_renderer_setting(None), Some("1"));
    }

    #[test]
    fn an_explicit_value_is_left_alone() {
        assert_eq!(dmabuf_renderer_setting(Some("0")), None);
        assert_eq!(dmabuf_renderer_setting(Some("1")), None);
    }

    #[test]
    fn even_an_empty_value_counts_as_a_choice() {
        assert_eq!(dmabuf_renderer_setting(Some("")), None);
    }

    /// The regression this module exists for: on Linux the variable is set for
    /// the process, so a user who launches the binary with a bare environment
    /// still gets a webview that paints. No other test touches this variable,
    /// so the process-wide write is not racing anything.
    #[test]
    #[cfg(target_os = "linux")]
    fn the_process_environment_carries_the_setting() {
        std::env::remove_var("WEBKIT_DISABLE_DMABUF_RENDERER");

        super::prepare_webview();

        assert_eq!(
            std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").as_deref(),
            Ok("1")
        );
    }
}
