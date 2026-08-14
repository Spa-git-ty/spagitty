// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from './theme.svelte';

const KEY = 'gitlord.theme';

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

beforeEach(() => {
	stubStorage();
	stubPrefersDark(false);
	theme.set('light');
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('set and toggle', () => {
	it('writes the choice onto the root element, which is what actually flips it', () => {
		theme.set('dark');
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
		expect(theme.value).toBe('dark');
		expect(theme.isDark).toBe(true);

		theme.set('light');
		expect(document.documentElement.getAttribute('data-theme')).toBe('light');
		expect(theme.isDark).toBe(false);
	});

	it('toggles between the two', () => {
		theme.set('light');
		theme.toggle();
		expect(theme.value).toBe('dark');
		theme.toggle();
		expect(theme.value).toBe('light');
	});

	it('persists the choice', () => {
		const store = stubStorage();
		theme.set('dark');
		expect(store.get(KEY)).toBe('dark');
	});
});

describe('init', () => {
	it('restores a stored choice', () => {
		stubStorage({ [KEY]: 'dark' });
		stubPrefersDark(false);

		theme.init();

		expect(theme.value).toBe('dark');
	});

	it('prefers the stored choice over the OS preference', () => {
		stubStorage({ [KEY]: 'light' });
		stubPrefersDark(true);

		theme.init();

		expect(theme.value).toBe('light');
	});

	it('falls back to the OS preference when nothing is stored', () => {
		stubStorage();
		stubPrefersDark(true);

		theme.init();

		expect(theme.value).toBe('dark');
	});

	it('ignores a stored value that is not a theme', () => {
		stubStorage({ [KEY]: 'solarized' });
		stubPrefersDark(true);

		theme.init();

		expect(theme.value).toBe('dark');
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
		expect(theme.value).toBe('dark');
	});

	it('defaults to light where the OS preference cannot be read', () => {
		stubStorage();
		vi.stubGlobal('matchMedia', undefined);

		theme.init();

		expect(theme.value).toBe('light');
	});
});
