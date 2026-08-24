// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Give the tests a working `localStorage`.
 *
 * Node 22 added its own `localStorage` global, and it is `undefined` unless the
 * process was started with `--localstorage-file`. That binding shadows the one
 * happy-dom installs on the window, so the bare `localStorage` the stores use —
 * the same bare identifier that resolves correctly inside a webview — resolves
 * to nothing under test. Every persistence path then took its catch branch
 * silently, and the one file that used storage without stubbing it first
 * (`scale.test.ts`) failed on `localStorage.clear()`.
 *
 * happy-dom's `Storage` class is real and constructible, so one instance shared
 * between `globalThis` and `window` restores the browser shape. Tests that stub
 * storage with `vi.stubGlobal` still override this, and `vi.spyOn` on
 * `Storage.prototype` still reaches it.
 */
if (!globalThis.localStorage) {
	const storage = new Storage();
	const descriptor = { value: storage, configurable: true, writable: true };
	Object.defineProperty(globalThis, 'localStorage', descriptor);
	Object.defineProperty(window, 'localStorage', descriptor);
}
