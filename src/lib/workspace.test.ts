// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_TABS, nameOf, workspace } from './workspace.svelte';

/** A localStorage that a test can read back, since happy-dom's persists. */
function stubStorage() {
	const store = new Map<string, string>();
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => void store.set(key, value),
		removeItem: (key: string) => void store.delete(key),
		clear: () => store.clear()
	});
	return store;
}

const KEY = 'spagitty.workspace';

beforeEach(() => {
	stubStorage();
	workspace.clear();
});

afterEach(() => vi.unstubAllGlobals());

describe('naming a tab', () => {
	it('is the directory, which is what a person calls a repository', () => {
		expect(nameOf('/home/ada/work/spagitty')).toBe('spagitty');
		expect(nameOf('/home/ada/work/spagitty/')).toBe('spagitty');
		expect(nameOf('C:\\work\\spagitty')).toBe('spagitty');
	});

	it('falls back to the whole path when there is no directory to take', () => {
		expect(nameOf('spagitty')).toBe('spagitty');
	});
});

describe('opening', () => {
	it('adds a tab and makes it the active one', () => {
		workspace.opened('/repos/one');

		expect(workspace.tabs.map((tab) => tab.path)).toEqual(['/repos/one']);
		expect(workspace.active).toBe('/repos/one');
		expect(workspace.isActive('/repos/one')).toBe(true);
	});

	it('activates an existing tab rather than opening it twice', () => {
		workspace.opened('/repos/one');
		workspace.opened('/repos/two');
		workspace.opened('/repos/one');

		expect(workspace.tabs).toHaveLength(2);
		expect(workspace.active).toBe('/repos/one');
	});

	it('drops the oldest tab past the cap, never the one being opened', () => {
		for (let i = 0; i < MAX_TABS + 3; i++) workspace.opened(`/repos/${i}`);

		expect(workspace.tabs).toHaveLength(MAX_TABS);
		expect(workspace.active).toBe(`/repos/${MAX_TABS + 2}`);
		expect(workspace.tabs.some((tab) => tab.path === `/repos/${MAX_TABS + 2}`)).toBe(true);
		expect(workspace.tabs.some((tab) => tab.path === '/repos/0')).toBe(false);
	});
});

describe('remembering where a repository was', () => {
	it('gives back the route and the selection', () => {
		workspace.opened('/repos/one');
		workspace.remember('/repos/one', { route: '/branches', selected: 'abc123' });

		expect(workspace.placeOf('/repos/one')).toEqual({
			route: '/branches',
			selected: 'abc123'
		});
	});

	it('has nothing to say about a repository it has not seen', () => {
		expect(workspace.placeOf('/repos/never')).toBeNull();
	});

	it('keeps the place after the tab is closed, so reopening still lands there', () => {
		workspace.opened('/repos/one');
		workspace.opened('/repos/two');
		workspace.remember('/repos/one', { route: '/stash', selected: null });

		workspace.close('/repos/one');

		expect(workspace.placeOf('/repos/one')?.route).toBe('/stash');
	});
});

describe('closing', () => {
	it('hands back the tab to the right of the one closed', () => {
		workspace.opened('/repos/one');
		workspace.opened('/repos/two');
		workspace.opened('/repos/three');
		workspace.opened('/repos/two');

		expect(workspace.close('/repos/two')).toBe('/repos/three');
		expect(workspace.tabs.map((tab) => tab.path)).toEqual(['/repos/one', '/repos/three']);
	});

	it('falls back to the left when the closed tab was the last one', () => {
		workspace.opened('/repos/one');
		workspace.opened('/repos/two');

		expect(workspace.close('/repos/two')).toBe('/repos/one');
	});

	it('leaves nothing active when the last tab goes', () => {
		workspace.opened('/repos/one');

		expect(workspace.close('/repos/one')).toBeNull();
		expect(workspace.tabs).toHaveLength(0);
	});

	it('does not change which tab is showing when an inactive one is closed', () => {
		workspace.opened('/repos/one');
		workspace.opened('/repos/two');

		expect(workspace.close('/repos/one')).toBe('/repos/two');
		expect(workspace.active).toBe('/repos/two');
	});

	it('ignores a path that is not open', () => {
		workspace.opened('/repos/one');
		expect(workspace.close('/repos/never')).toBe('/repos/one');
		expect(workspace.tabs).toHaveLength(1);
	});
});

describe('across a restart', () => {
	it('writes the strip, the active tab and the places', () => {
		const store = stubStorage();
		workspace.opened('/repos/one');
		workspace.remember('/repos/one', { route: '/conflicts', selected: 'abc' });

		const stored = JSON.parse(store.get(KEY) as string);
		expect(stored.tabs).toEqual([{ path: '/repos/one', name: 'one' }]);
		expect(stored.active).toBe('/repos/one');
		expect(stored.places['/repos/one'].route).toBe('/conflicts');
	});

	it('reads them back', () => {
		const store = stubStorage();
		store.set(
			KEY,
			JSON.stringify({
				tabs: [{ path: '/repos/one', name: 'one' }],
				active: '/repos/one',
				places: { '/repos/one': { route: '/stash', selected: null } }
			})
		);

		workspace.init();

		expect(workspace.tabs).toHaveLength(1);
		expect(workspace.active).toBe('/repos/one');
		expect(workspace.placeOf('/repos/one')?.route).toBe('/stash');
	});

	it('refuses an active tab that is not in the strip', () => {
		const store = stubStorage();
		store.set(KEY, JSON.stringify({ tabs: [], active: '/repos/gone' }));

		workspace.init();

		expect(workspace.active).toBeNull();
	});

	it('survives a stored layout that makes no sense', () => {
		const store = stubStorage();
		store.set(KEY, '{ not json');

		expect(() => workspace.init()).not.toThrow();
		expect(workspace.tabs).toHaveLength(0);
	});

	it('discards entries with no path rather than rendering them', () => {
		const store = stubStorage();
		store.set(KEY, JSON.stringify({ tabs: [{ name: 'nameless' }, { path: '/repos/one' }] }));

		workspace.init();

		expect(workspace.tabs.map((tab) => tab.path)).toEqual(['/repos/one']);
		expect(workspace.tabs[0].name).toBe('one');
	});
});
