// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tauriWindow = {
	close: vi.fn(),
	minimize: vi.fn(),
	toggleMaximize: vi.fn(),
	isMaximized: vi.fn(() => Promise.resolve(true)),
	startDragging: vi.fn(),
	startResizeDragging: vi.fn(() => Promise.resolve())
};

vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => tauriWindow }));

import { appWindow } from './window';

/** The module decides whether it is inside Tauri by looking at `window`. */
function insideTauri(yes: boolean) {
	vi.stubGlobal('window', yes ? { __TAURI_INTERNALS__: {} } : {});
}

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('outside Tauri', () => {
	beforeEach(() => insideTauri(false));

	it('does nothing rather than throwing, so the UI still runs in a browser', async () => {
		await expect(appWindow.close()).resolves.toBeUndefined();
		await expect(appWindow.minimize()).resolves.toBeUndefined();
		await expect(appWindow.toggleMaximize()).resolves.toBeUndefined();
		await expect(appWindow.startDragging()).resolves.toBeUndefined();
		await expect(appWindow.startResize('North')).resolves.toBeUndefined();

		expect(tauriWindow.close).not.toHaveBeenCalled();
	});

	it('reports a window that is not maximized', async () => {
		expect(await appWindow.isMaximized()).toBe(false);
	});
});

describe('inside Tauri', () => {
	beforeEach(() => insideTauri(true));

	it('forwards each control to the platform window', async () => {
		await appWindow.close();
		await appWindow.minimize();
		await appWindow.toggleMaximize();
		await appWindow.startDragging();

		expect(tauriWindow.close).toHaveBeenCalledTimes(1);
		expect(tauriWindow.minimize).toHaveBeenCalledTimes(1);
		expect(tauriWindow.toggleMaximize).toHaveBeenCalledTimes(1);
		expect(tauriWindow.startDragging).toHaveBeenCalledTimes(1);
	});

	it('passes the edge through for a resize', async () => {
		await appWindow.startResize('SouthEast');
		expect(tauriWindow.startResizeDragging).toHaveBeenCalledWith('SouthEast');
	});

	it('reports the real maximized state', async () => {
		expect(await appWindow.isMaximized()).toBe(true);
	});
});
