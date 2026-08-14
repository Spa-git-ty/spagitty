// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * SPA mode. There is no server: Tauri serves a static bundle from disk, so
 * nothing is rendered ahead of time and routing is entirely client-side.
 */
export const ssr = false;
export const prerender = false;
