// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The command palette overlay.
 *
 * The store already has its own tests for matching and scoring; what is
 * untested is the overlay that renders them, and the two pieces of logic that
 * live only here:
 *
 * - `parts()`, which splits a title into matched and unmatched runs so the
 *   subsequence can be shown in bold. It merges adjacent runs, and getting that
 *   wrong produces one `<b>` per character.
 * - `reason()`, which decides whether a command is blocked and what it says. A
 *   command that cannot run is shown greyed with its reason rather than hidden,
 *   which is the store's own argument — "a palette whose contents change based
 *   on state is one nobody can learn".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { click, flushSync, press, render } from '../../testing/mount';
import Palette from './Palette.svelte';
import { palette, type Command } from './store.svelte';

function command(id: string, extra: Partial<Command> = {}): Command {
	return { id, title: id, group: 'Graph', run: vi.fn(), ...extra };
}

/** Mount the overlay with `commands` registered and the palette shown. */
function open(commands: Command[], query = '') {
	palette.register(...commands);
	palette.show();
	palette.setQuery(query);

	const view = render(Palette, {});
	flushSync();
	return view;
}

beforeEach(() => {
	palette.clear();
	palette.hide();
	palette.setQuery('');
});

afterEach(() => {
	palette.clear();
	palette.hide();
});

describe('showing and hiding', () => {
	it('renders nothing while closed', () => {
		palette.register(command('graph.refresh', { title: 'Refresh' }));
		const view = render(Palette, {});

		expect(view.find('.panel')).toBeNull();
		view.destroy();
	});

	it('opens onto a field and a list', () => {
		const view = open([command('graph.refresh', { title: 'Refresh' })]);

		expect(view.get('.panel').getAttribute('aria-label')).toBe('Commands');
		expect(view.get('.field')).not.toBeNull();
		expect(view.get('[role="listbox"]')).not.toBeNull();

		view.destroy();
	});

	it('closes on Escape', () => {
		const view = open([command('graph.refresh', { title: 'Refresh' })]);

		press(view.get('.field'), 'Escape');
		flushSync();

		expect(palette.open).toBe(false);
		view.destroy();
	});

	it('closes on a backdrop click but not on a click inside the panel', () => {
		const view = open([command('graph.refresh', { title: 'Refresh' })]);

		click(view.get('.panel'));
		expect(palette.open).toBe(true);

		click(view.get('.backdrop'));
		flushSync();
		expect(palette.open).toBe(false);

		view.destroy();
	});
});

describe('typing', () => {
	it('sends the query to the store', () => {
		const view = open([command('graph.refresh', { title: 'Refresh' })]);

		const field = view.get('.field') as HTMLInputElement;
		field.value = 'ref';
		field.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(palette.query).toBe('ref');
		view.destroy();
	});

	it('says so, in the user’s own words, when nothing matches', () => {
		const view = open([command('graph.refresh', { title: 'Refresh' })], 'zzzzz');

		expect(view.all('.item')).toHaveLength(0);
		expect(view.get('.empty').textContent).toContain('zzzzz');

		view.destroy();
	});
});

describe('highlighting the match', () => {
	/** A merged run, not one `<b>` per character: "Ref" is one bold element. */
	it('bolds a contiguous match as a single run', () => {
		const view = open([command('graph.refresh', { title: 'Refresh' })], 'ref');

		const bolds = view.all('.item b');
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textContent).toBe('Ref');

		view.destroy();
	});

	it('bolds a scattered subsequence as separate runs', () => {
		const view = open([command('graph.cbh', { title: 'Create branch here' })], 'cbh');

		// The highlight keeps the title's own casing, so `cbh` bolds `C`, `b`, `h`.
		const bolds = view.all('.item b');
		expect(bolds.length).toBeGreaterThan(1);
		expect(bolds.map((element) => element.textContent).join('')).toBe('Cbh');

		view.destroy();
	});

	it('leaves the title unbolded when nothing was typed', () => {
		const view = open([command('graph.refresh', { title: 'Refresh' })]);

		expect(view.all('.item b')).toHaveLength(0);
		expect(view.get('.item .title').textContent?.trim()).toBe('Refresh');

		view.destroy();
	});
});

describe('groups', () => {
	it('heads each group once, not once per row', () => {
		const view = open([
			command('a', { title: 'Alpha', group: 'Graph' }),
			command('b', { title: 'Beta', group: 'Graph' }),
			command('c', { title: 'Gamma', group: 'Branch' })
		]);

		const headings = view.all('.group').map((element) => element.textContent);
		expect(headings).toContain('Graph');
		expect(headings).toContain('Branch');
		expect(headings.filter((text) => text === 'Graph')).toHaveLength(1);

		view.destroy();
	});
});

describe('blocked commands', () => {
	it('shows an unavailable command greyed, with its reason, rather than hiding it', () => {
		const view = open([
			command('push', {
				title: 'Push',
				enabled: () => false,
				unavailable: () => 'no upstream'
			})
		]);

		const item = view.get('.item') as HTMLButtonElement;
		expect(item.disabled).toBe(true);
		expect(item.classList.contains('blocked')).toBe(true);
		expect(view.get('.why').textContent).toBe('no upstream');

		view.destroy();
	});

	it('falls back to a plain phrase when no reason is given', () => {
		const view = open([command('push', { title: 'Push', enabled: () => false })]);

		expect(view.get('.why').textContent).toBe('not available right now');
		view.destroy();
	});

	it('falls back when the reason function returns null', () => {
		const view = open([
			command('push', { title: 'Push', enabled: () => false, unavailable: () => null })
		]);

		expect(view.get('.why').textContent).toBe('not available right now');
		view.destroy();
	});

	it('shows the shortcut instead, on a command that can run', () => {
		const view = open([command('find', { title: 'Find', shortcut: 'Ctrl+F' })]);

		expect(view.find('.why')).toBeNull();
		expect(view.get('.item .mono').textContent).toBe('Ctrl+F');

		view.destroy();
	});

	it('shows neither when a runnable command has no shortcut', () => {
		const view = open([command('find', { title: 'Find' })]);

		expect(view.find('.why')).toBeNull();
		expect(view.find('.item .mono')).toBeNull();

		view.destroy();
	});

	it('treats a command with no enabled() as runnable', () => {
		const view = open([command('find', { title: 'Find' })]);

		expect((view.get('.item') as HTMLButtonElement).disabled).toBe(false);
		view.destroy();
	});
});

describe('the cursor', () => {
	it('marks the active row for assistive technology as well as the eye', () => {
		const view = open([
			command('a', { title: 'Alpha' }),
			command('b', { title: 'Beta' })
		]);

		const [first] = view.all('.item');
		expect(first.getAttribute('aria-selected')).toBe('true');
		expect(first.getAttribute('data-active')).toBe('true');
		expect(first.classList.contains('active')).toBe(true);

		view.destroy();
	});

	it('moves down and up with the arrow keys', () => {
		const view = open([
			command('a', { title: 'Alpha' }),
			command('b', { title: 'Beta' })
		]);
		const field = view.get('.field');

		press(field, 'ArrowDown');
		flushSync();
		expect(view.all('.item')[1].getAttribute('aria-selected')).toBe('true');

		press(field, 'ArrowUp');
		flushSync();
		expect(view.all('.item')[0].getAttribute('aria-selected')).toBe('true');

		view.destroy();
	});

	it('follows the pointer', () => {
		const view = open([
			command('a', { title: 'Alpha' }),
			command('b', { title: 'Beta' })
		]);

		view.all('.item')[1].dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
		flushSync();

		expect(palette.cursor).toBe(1);
		view.destroy();
	});

	it('leaves keys it does not handle to the field', () => {
		const view = open([command('a', { title: 'Alpha' })]);

		const event = press(view.get('.field'), 'x');
		expect(event.defaultPrevented).toBe(false);

		view.destroy();
	});
});

describe('running', () => {
	it('runs the active command on Enter', async () => {
		const run = vi.fn();
		const view = open([command('a', { title: 'Alpha', run })]);

		press(view.get('.field'), 'Enter');
		await Promise.resolve();

		expect(run).toHaveBeenCalledTimes(1);
		view.destroy();
	});

	it('runs the clicked command', async () => {
		const run = vi.fn();
		const view = open([command('a', { title: 'Alpha', run })]);

		click(view.get('.item'));
		await Promise.resolve();

		expect(run).toHaveBeenCalledTimes(1);
		view.destroy();
	});
});
