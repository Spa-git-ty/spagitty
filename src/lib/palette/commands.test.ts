// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted, because `vi.mock`'s factory runs before the module body does.
const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

import { registerCommands } from './commands';
import { palette } from './store.svelte';
import { columns } from '../graph/columns.svelte';
import { scale } from '../scale.svelte';

/** The registry is module-global, so each test starts from a known state. */
beforeEach(() => {
	palette.clear();
	goto.mockClear();
	registerCommands();
});

function find(id: string) {
	const command = palette.matches.find((match) => match.command.id === id)?.command;
	if (!command) throw new Error(`no command registered with id ${id}`);
	return command;
}

describe('registerCommands', () => {
	it('registers every command with a unique id', () => {
		const ids = palette.matches.map((match) => match.command.id);
		expect(ids.length).toBeGreaterThan(0);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('is idempotent, so a second call does not duplicate anything', () => {
		const before = palette.matches.length;
		registerCommands();
		expect(palette.matches.length).toBe(before);
	});

	it('groups every command, since the palette renders by heading', () => {
		for (const { command } of palette.matches) {
			expect(command.group).not.toBe('');
		}
	});

	it('navigates when a Go command runs', async () => {
		await find('go.settings').run();
		expect(goto).toHaveBeenCalledWith('/settings');
	});

	it('disables the repository commands with a reason when none is open', () => {
		const fetch = find('repo.fetch');
		expect(fetch.enabled?.()).toBe(false);
		expect(fetch.unavailable?.()).toBe('No repository open');
	});

	it('leaves navigation enabled without a repository', () => {
		const go = find('go.repos');
		expect(go.enabled?.() ?? true).toBe(true);
	});

	it('toggles a column through the palette', () => {
		const before = columns.isShown('sha');
		find('view.column.sha').run();
		expect(columns.isShown('sha')).toBe(!before);
		find('view.column.sha').run();
		expect(columns.isShown('sha')).toBe(before);
	});

	it('offers to clear the author filter only when one is set', () => {
		const clear = find('view.author.clear');
		columns.setAuthor('');
		expect(clear.enabled?.()).toBe(false);

		columns.setAuthor('ada');
		expect(clear.enabled?.()).toBe(true);
		clear.run();
		expect(columns.author).toBe('');
	});

	it('moves the zoom, and resets both dials', () => {
		scale.setZoom(1);
		find('appearance.zoom.in').run();
		expect(scale.zoom).toBeGreaterThan(1);

		find('appearance.text.bigger').run();
		const grown = scale.text;
		expect(grown).toBeGreaterThan(1);

		find('appearance.zoom.reset').run();
		expect(scale.zoom).toBe(1);
		expect(scale.text).toBe(1);
	});

	it('finds a command by its initials, which is the point of the palette', () => {
		palette.setQuery('gtb');
		expect(palette.active?.id).toBe('go.branches');

		// Two commands share the same initials; the shorter title wins the tie,
		// which is what makes the ranking predictable rather than arbitrary.
		palette.setQuery('gts');
		expect(palette.active?.id).toBe('go.search');
	});
});
