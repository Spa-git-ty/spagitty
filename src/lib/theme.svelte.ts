// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Which palette is on: a family, and light or dark within it.
 *
 * Switching is custom properties only — no component re-render, no stylesheet
 * swap. The chosen palette is written onto `<html>` as inline custom
 * properties, which beat anything in the stylesheet, so `src/app.css` can carry
 * the default family as its boot values and the first paint is already right.
 *
 * The palettes themselves are data in `./themes`. Nothing here knows a colour.
 *
 * This is stored in `localStorage` rather than with the other settings, and
 * deliberately: the theme has to be applied before anything has been read from
 * disk, and the boot path cannot wait on a Tauri command to find out what
 * colour the window is.
 */

import {
	DEFAULT_FAMILY,
	isFamily,
	paletteOf,
	properties,
	variantOf,
	type FamilyId,
	type Mode,
	type Variant
} from './themes';

/** Kept from before the family existed, so an upgrade keeps its light/dark. */
const MODE_KEY = 'gitlumiere.theme';
const FAMILY_KEY = 'gitlumiere.theme.family';

let mode = $state<Mode>('light');
let family = $state<FamilyId>(DEFAULT_FAMILY);

/** Read a key, treating an unreadable store as an unset one. */
function stored(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		// Private mode or a locked-down webview.
		return null;
	}
}

function remember(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// The theme just won't persist. It is not worth failing a paint over.
	}
}

/** Put the current palette on the document. */
function apply(): void {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;

	// Still set, because `app.css` keys its two boot blocks off it and because
	// it is what any future stylesheet rule would need.
	root.setAttribute('data-theme', mode);

	for (const [name, value] of Object.entries(properties(paletteOf(family, mode)))) {
		root.style.setProperty(name, value);
	}
}

function commit(nextFamily: FamilyId, nextMode: Mode): void {
	family = nextFamily;
	mode = nextMode;
	apply();
	remember(FAMILY_KEY, nextFamily);
	remember(MODE_KEY, nextMode);
}

export const theme = {
	get mode(): Mode {
		return mode;
	},
	get family(): FamilyId {
		return family;
	},
	get isDark(): boolean {
		return mode === 'dark';
	},

	/**
	 * What is on, as one string: `"catppuccin-dark"`.
	 *
	 * Read by the lane canvas to know when to repaint. A boolean could not say
	 * that the family changed while the mode did not, which is a repaint too.
	 */
	get id(): string {
		return `${family}-${mode}`;
	},

	/** The current variant, so a screen can say "Mocha" rather than "dark". */
	get variant(): Variant {
		return variantOf(family, mode);
	},

	setMode(next: Mode): void {
		commit(family, next);
	},

	setFamily(next: FamilyId): void {
		commit(next, mode);
	},

	toggle(): void {
		commit(family, mode === 'dark' ? 'light' : 'dark');
	},

	/**
	 * Restore what was chosen last, falling back to the OS preference.
	 *
	 * The OS is consulted for light or dark only, and only when nothing has been
	 * stored. It has no opinion about which family, and a machine preference
	 * that overrode an explicit choice would not be a preference.
	 */
	init(): void {
		const storedFamily = stored(FAMILY_KEY);
		const nextFamily = storedFamily && isFamily(storedFamily) ? storedFamily : DEFAULT_FAMILY;

		const storedMode = stored(MODE_KEY);
		if (storedMode === 'light' || storedMode === 'dark') {
			commit(nextFamily, storedMode);
			return;
		}

		const prefersDark =
			typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
		commit(nextFamily, prefersDark ? 'dark' : 'light');
	}
};
