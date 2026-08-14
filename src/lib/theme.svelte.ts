// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Theme switching. Light/dark is CSS custom properties only — no component
 * re-render, no stylesheet swap. The flip is a single attribute on <html>.
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'gitlord.theme';

let current = $state<Theme>('light');

function commit(next: Theme) {
	current = next;
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', next);
	}
	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		// Private mode or a locked-down webview; the theme just won't persist.
	}
}

export const theme = {
	get value(): Theme {
		return current;
	},
	get isDark(): boolean {
		return current === 'dark';
	},
	set(next: Theme) {
		commit(next);
	},
	toggle() {
		commit(current === 'dark' ? 'light' : 'dark');
	},
	/** Restore the stored choice, falling back to the OS preference. */
	init() {
		let stored: string | null = null;
		try {
			stored = localStorage.getItem(STORAGE_KEY);
		} catch {
			stored = null;
		}
		if (stored === 'light' || stored === 'dark') {
			commit(stored);
			return;
		}
		const prefersDark =
			typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
		commit(prefersDark ? 'dark' : 'light');
	}
};
