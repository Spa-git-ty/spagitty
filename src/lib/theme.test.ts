// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from './theme.svelte';
import { DEFAULT_FAMILY, paletteOf, properties } from './themes';

const MODE_KEY = 'gitlord.theme';
const FAMILY_KEY = 'gitlord.theme.family';

function stubStorage(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial));
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k)
	});
	return store;
}

function stubPrefersDark(dark: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: dark && query.includes('dark'),
		media: query
	}));
}

/** What the root element is actually carrying. */
function property(name: string): string {
	return document.documentElement.style.getPropertyValue(name);
}

beforeEach(() => {
	stubStorage();
	stubPrefersDark(false);
	theme.setFamily(DEFAULT_FAMILY);
	theme.setMode('light');
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('applying', () => {
	it('writes the mode onto the root element, which is what the stylesheet keys off', () => {
		theme.setMode('dark');
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
		expect(theme.mode).toBe('dark');
		expect(theme.isDark).toBe(true);

		theme.setMode('light');
		expect(document.documentElement.getAttribute('data-theme')).toBe('light');
		expect(theme.isDark).toBe(false);
	});

	it('writes every token of the chosen palette', () => {
		// A token left unset would keep whatever the previous theme put there,
		// which is how half a theme ends up on screen.
		theme.setFamily('gruvbox');
		theme.setMode('dark');

		for (const [name, value] of Object.entries(properties(paletteOf('gruvbox', 'dark')))) {
			expect(property(name), name).toBe(value);
		}
	});

	it('replaces every token when the family changes', () => {
		theme.setFamily('dracula');
		theme.setFamily('tokyo-night');

		expect(property('--bg')).toBe(paletteOf('tokyo-night', 'light').bg);
		expect(property('--lane-1')).toBe(paletteOf('tokyo-night', 'light').lanes[0]);
	});

	it('toggles the mode and leaves the family alone', () => {
		theme.setFamily('gruvbox');

		theme.toggle();
		expect(theme.mode).toBe('dark');
		expect(theme.family).toBe('gruvbox');

		theme.toggle();
		expect(theme.mode).toBe('light');
	});

	it('names what is on, family and mode, because both repaint the lane canvas', () => {
		// The canvas resolves its colours from the stylesheet and repaints when
		// this changes. A boolean could not say the family moved.
		theme.setFamily('dracula');
		theme.setMode('dark');
		expect(theme.id).toBe('dracula-dark');

		theme.setFamily('gruvbox');
		expect(theme.id).toBe('gruvbox-dark');
	});

	it('says what the family calls the variant, not just light or dark', () => {
		theme.setFamily('catppuccin');
		theme.setMode('dark');
		expect(theme.variant.name).toBe('Mocha');

		theme.setMode('light');
		expect(theme.variant.name).toBe('Latte');
	});

	it('persists both halves of the choice', () => {
		const store = stubStorage();

		theme.setFamily('tokyo-night');
		theme.setMode('dark');

		expect(store.get(FAMILY_KEY)).toBe('tokyo-night');
		expect(store.get(MODE_KEY)).toBe('dark');
	});
});

describe('init', () => {
	it('restores a stored family and mode', () => {
		stubStorage({ [FAMILY_KEY]: 'gruvbox', [MODE_KEY]: 'dark' });
		stubPrefersDark(false);

		theme.init();

		expect(theme.family).toBe('gruvbox');
		expect(theme.mode).toBe('dark');
	});

	it('still honours a mode stored before families existed', () => {
		// The key has not changed, so an existing install keeps its light or
		// dark and gains the default family rather than losing its setting.
		stubStorage({ [MODE_KEY]: 'dark' });
		stubPrefersDark(false);

		theme.init();

		expect(theme.mode).toBe('dark');
		expect(theme.family).toBe(DEFAULT_FAMILY);
	});

	it('prefers the stored mode over the OS preference', () => {
		stubStorage({ [MODE_KEY]: 'light' });
		stubPrefersDark(true);

		theme.init();

		expect(theme.mode).toBe('light');
	});

	it('falls back to the OS preference when nothing is stored', () => {
		stubStorage();
		stubPrefersDark(true);

		theme.init();

		expect(theme.mode).toBe('dark');
		expect(theme.family).toBe(DEFAULT_FAMILY);
	});

	it('ignores a stored mode that is not a mode', () => {
		stubStorage({ [MODE_KEY]: 'solarized' });
		stubPrefersDark(true);

		theme.init();

		expect(theme.mode).toBe('dark');
	});

	it('ignores a stored family that is not a family', () => {
		// The file invites hand-editing, and a typo must not leave the window
		// with no colours at all.
		stubStorage({ [FAMILY_KEY]: 'solarized', [MODE_KEY]: 'light' });

		theme.init();

		expect(theme.family).toBe(DEFAULT_FAMILY);
		expect(property('--bg')).toBe(paletteOf(DEFAULT_FAMILY, 'light').bg);
	});

	it('survives storage being unreadable', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('denied');
			},
			setItem: () => {
				throw new Error('denied');
			}
		});
		stubPrefersDark(true);

		expect(() => theme.init()).not.toThrow();
		expect(theme.mode).toBe('dark');
		expect(theme.family).toBe(DEFAULT_FAMILY);
	});

	it('defaults to light where the OS preference cannot be read', () => {
		stubStorage();
		vi.stubGlobal('matchMedia', undefined);

		theme.init();

		expect(theme.mode).toBe('light');
	});
});
