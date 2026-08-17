// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Window controls for our own decorations.
 *
 * The window is created with `decorations: false`, so the platform draws no
 * title bar and GitLumiere draws its own — the 30px bar from the design, with its
 * traffic lights. That means we also own what the platform used to provide:
 * dragging, resizing, and the close/minimize/maximize buttons.
 *
 * Everything here degrades to a no-op outside Tauri, so the UI still runs in a
 * plain browser during frontend work.
 */

import { inTauri } from '$lib/api';

/** Mirrors `ResizeDirection` in @tauri-apps/api, which is a string union. */
export type ResizeEdge =
	| 'North'
	| 'NorthEast'
	| 'East'
	| 'SouthEast'
	| 'South'
	| 'SouthWest'
	| 'West'
	| 'NorthWest';

async function currentWindow() {
	if (!inTauri()) return null;
	const { getCurrentWindow } = await import('@tauri-apps/api/window');
	return getCurrentWindow();
}

export const appWindow = {
	async close(): Promise<void> {
		(await currentWindow())?.close();
	},

	async minimize(): Promise<void> {
		(await currentWindow())?.minimize();
	},

	async toggleMaximize(): Promise<void> {
		(await currentWindow())?.toggleMaximize();
	},

	async isMaximized(): Promise<boolean> {
		return (await currentWindow())?.isMaximized() ?? false;
	},

	/** Begin a move. Used by the title bar's empty space. */
	async startDragging(): Promise<void> {
		(await currentWindow())?.startDragging();
	},

	/**
	 * Begin a resize from one edge or corner. Without decorations the
	 * compositor no longer offers resize edges, so the window supplies its own.
	 */
	async startResize(edge: ResizeEdge): Promise<void> {
		await (await currentWindow())?.startResizeDragging(edge);
	}
};
