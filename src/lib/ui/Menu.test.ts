// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The floating menu every right-click in Spagitty opens.
 *
 * The component's own doc comment names what has to be right — closing on an
 * outside click, closing on Escape, arrow-key navigation, not letting a
 * disabled entry be chosen — and its argument for existing is that those are
 * not worth getting subtly different in six places. That argument only holds
 * if they are actually right here, which is what this file checks.
 *
 * The cursor is the part with real state: it steps over separators and
 * headings, skips disabled entries, and wraps. Every one of those is a branch
 * that silently runs the wrong action when it is wrong.
 */

import { describe, expect, it, vi } from 'vitest';
import { click, fire, flushSync, press, render } from '../../testing/mount';
import Menu from './Menu.svelte';
import type { MenuItem } from './menu';
import { isEntry } from './menu';

function entry(id: string, extra: Partial<Extract<MenuItem, { run: unknown }>> = {}): MenuItem {
	return { id, label: id, run: vi.fn(), ...extra };
}

function open(items: MenuItem[], onclose = vi.fn()) {
	const view = render(Menu, { x: 40, y: 60, items, label: 'Commit actions', onclose });
	return { view, onclose };
}

describe('isEntry', () => {
	it('separates entries from separators and headings', () => {
		expect(isEntry(entry('Checkout'))).toBe(true);
		expect(isEntry({ separator: true })).toBe(false);
		expect(isEntry({ heading: 'Branch' })).toBe(false);
	});
});

describe('rendering', () => {
	it('names itself for screen readers, since it has no visible title', () => {
		const { view } = open([entry('Checkout')]);

		const menu = view.get('.menu');
		expect(menu.getAttribute('role')).toBe('menu');
		expect(menu.getAttribute('aria-label')).toBe('Commit actions');

		view.destroy();
	});

	it('renders entries, separators and headings in order', () => {
		const { view } = open([
			{ heading: 'Branch' },
			entry('Checkout'),
			{ separator: true },
			entry('Delete', { danger: true })
		]);

		expect(view.all('.entry').map((element) => element.textContent?.trim())).toEqual([
			'Checkout',
			'Delete'
		]);
		expect(view.all('.heading')).toHaveLength(1);
		expect(view.all('.hr')).toHaveLength(1);

		view.destroy();
	});

	it('marks a destructive entry rather than letting it look ordinary', () => {
		const { view } = open([entry('Checkout'), entry('Delete', { danger: true })]);

		const [checkout, remove] = view.all('.entry');
		expect(checkout.classList.contains('danger')).toBe(false);
		expect(remove.classList.contains('danger')).toBe(true);

		view.destroy();
	});

	/**
	 * The component argues that an entry which cannot run is shown with its
	 * reason rather than hidden, because "a menu whose contents change with
	 * state is one nobody can learn". The reason displaces the note.
	 */
	it('shows a disabled entry with its reason, in place of its note', () => {
		const { view } = open([
			entry('Delete', { disabled: true, reason: 'checked out', note: '⌫' }),
			entry('Checkout', { note: 'double-click' })
		]);

		const [remove, checkout] = view.all('.entry');
		expect(remove.textContent).toContain('checked out');
		expect(remove.textContent).not.toContain('⌫');
		expect((remove as HTMLButtonElement).disabled).toBe(true);
		expect(checkout.textContent).toContain('double-click');

		view.destroy();
	});

	it('shows a disabled entry with no reason as simply disabled', () => {
		const { view } = open([entry('Delete', { disabled: true })]);

		const remove = view.get('.entry') as HTMLButtonElement;
		expect(remove.disabled).toBe(true);
		expect(view.find('.side')).toBeNull();

		view.destroy();
	});
});

describe('choosing', () => {
	it('closes before running, so the action can open a dialog', async () => {
		const order: string[] = [];
		const onclose = vi.fn(() => order.push('closed'));
		const run = vi.fn(() => {
			order.push('ran');
		});

		const { view } = open([{ id: 'Checkout', label: 'Checkout', run }], onclose);
		click(view.get('.entry'));
		await Promise.resolve();

		expect(order).toEqual(['closed', 'ran']);
		view.destroy();
	});

	it('awaits an action that returns a promise', async () => {
		const run = vi.fn(() => Promise.resolve());
		const { view } = open([{ id: 'Push', label: 'Push', run }]);

		click(view.get('.entry'));
		await Promise.resolve();

		expect(run).toHaveBeenCalledTimes(1);
		view.destroy();
	});

	it('refuses to run a disabled entry, and does not close', () => {
		const run = vi.fn();
		const { view, onclose } = open([
			{ id: 'Delete', label: 'Delete', disabled: true, run }
		]);

		// The button is disabled, so drive `choose` the way a stray programmatic
		// click would: the guard inside it is the thing under test.
		view.get('.entry').dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();

		expect(run).not.toHaveBeenCalled();
		expect(onclose).not.toHaveBeenCalled();
		view.destroy();
	});
});

describe('keyboard', () => {
	it('moves down and wraps back to the first entry', () => {
		const { view } = open([entry('One'), entry('Two')]);
		const menu = view.get('.menu');

		press(menu, 'ArrowDown');
		expect(view.all('.entry')[0].classList.contains('at')).toBe(true);

		press(menu, 'ArrowDown');
		expect(view.all('.entry')[1].classList.contains('at')).toBe(true);

		press(menu, 'ArrowDown');
		expect(view.all('.entry')[0].classList.contains('at')).toBe(true);

		view.destroy();
	});

	it('moves up, wrapping from the first entry to the last', () => {
		const { view } = open([entry('One'), entry('Two'), entry('Three')]);
		const menu = view.get('.menu');

		press(menu, 'ArrowDown');
		expect(view.all('.entry')[0].classList.contains('at')).toBe(true);

		press(menu, 'ArrowUp');
		expect(view.all('.entry')[2].classList.contains('at')).toBe(true);

		press(menu, 'ArrowUp');
		expect(view.all('.entry')[1].classList.contains('at')).toBe(true);

		view.destroy();
	});

	/**
	 * BUG-008. With nothing selected, `entries[-1]` is `undefined` and
	 * `findIndex` answers `-1` for it. Down happened to work out; up landed on
	 * `usable.length - 2` — the middle entry of three, the first of two — which
	 * is a different wrong answer for every menu length.
	 */
	it('opens at the last entry when the first key pressed is ArrowUp', () => {
		for (const size of [1, 2, 3, 5]) {
			const items = Array.from({ length: size }, (_, i) => entry(`Item ${i}`));
			const { view } = open(items);

			press(view.get('.menu'), 'ArrowUp');

			const at = view.all('.entry').findIndex((e) => e.classList.contains('at'));
			expect(at, `ArrowUp into a ${size}-entry menu landed on ${at}`).toBe(size - 1);

			view.destroy();
		}
	});

	it('opens at the first entry when the first key pressed is ArrowDown', () => {
		for (const size of [1, 2, 3, 5]) {
			const items = Array.from({ length: size }, (_, i) => entry(`Item ${i}`));
			const { view } = open(items);

			press(view.get('.menu'), 'ArrowDown');

			const at = view.all('.entry').findIndex((e) => e.classList.contains('at'));
			expect(at, `ArrowDown into a ${size}-entry menu landed on ${at}`).toBe(0);

			view.destroy();
		}
	});

	it('opens at the last entry that can run, not a disabled one', () => {
		const { view } = open([
			entry('One'),
			entry('Two'),
			entry('Blocked', { disabled: true })
		]);

		press(view.get('.menu'), 'ArrowUp');

		expect(view.all('.entry')[1].classList.contains('at')).toBe(true);
		view.destroy();
	});

	it('steps over separators and headings, which are not entries', () => {
		const { view } = open([
			entry('One'),
			{ separator: true },
			{ heading: 'Danger' },
			entry('Two')
		]);
		const menu = view.get('.menu');

		press(menu, 'ArrowDown');
		press(menu, 'ArrowDown');

		expect(view.all('.entry')[1].classList.contains('at')).toBe(true);
		view.destroy();
	});

	it('skips a disabled entry rather than landing on it', () => {
		const { view } = open([
			entry('One'),
			entry('Blocked', { disabled: true }),
			entry('Three')
		]);
		const menu = view.get('.menu');

		press(menu, 'ArrowDown');
		press(menu, 'ArrowDown');

		const entries = view.all('.entry');
		expect(entries[1].classList.contains('at')).toBe(false);
		expect(entries[2].classList.contains('at')).toBe(true);

		view.destroy();
	});

	it('does nothing at all when every entry is disabled', () => {
		const { view } = open([
			entry('One', { disabled: true }),
			entry('Two', { disabled: true })
		]);
		const menu = view.get('.menu');

		press(menu, 'ArrowDown');
		expect(view.all('.at')).toHaveLength(0);

		view.destroy();
	});

	it('runs the entry under the cursor on Enter and on Space', async () => {
		const first = vi.fn();
		const second = vi.fn();
		const { view } = open([
			{ id: 'One', label: 'One', run: first },
			{ id: 'Two', label: 'Two', run: second }
		]);
		const menu = view.get('.menu');

		press(menu, 'ArrowDown');
		press(menu, 'Enter');
		await Promise.resolve();
		expect(first).toHaveBeenCalledTimes(1);

		const again = open([{ id: 'Two', label: 'Two', run: second }]);
		press(again.view.get('.menu'), 'ArrowDown');
		press(again.view.get('.menu'), ' ');
		await Promise.resolve();
		expect(second).toHaveBeenCalledTimes(1);

		view.destroy();
		again.view.destroy();
	});

	it('ignores Enter before the cursor has moved anywhere', async () => {
		const run = vi.fn();
		const { view, onclose } = open([{ id: 'One', label: 'One', run }]);

		press(view.get('.menu'), 'Enter');
		await Promise.resolve();

		expect(run).not.toHaveBeenCalled();
		expect(onclose).not.toHaveBeenCalled();
		view.destroy();
	});

	it('closes on Escape', () => {
		const { view, onclose } = open([entry('One')]);

		const event = press(view.get('.menu'), 'Escape');
		expect(onclose).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);

		view.destroy();
	});

	it('leaves keys it does not handle to the page', () => {
		const { view, onclose } = open([entry('One')]);

		const event = press(view.get('.menu'), 'a');
		expect(event.defaultPrevented).toBe(false);
		expect(onclose).not.toHaveBeenCalled();

		view.destroy();
	});

	it('follows the pointer, so the cursor and the hover agree', async () => {
		const { view } = open([entry('One'), entry('Two')]);

		view.all('.entry')[1].dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
		flushSync();

		expect(view.all('.entry')[1].classList.contains('at')).toBe(true);
		view.destroy();
	});
});

describe('dismissal', () => {
	it('closes on a mousedown outside itself', () => {
		const { view, onclose } = open([entry('One')]);

		fire(document.body, 'mousedown');
		expect(onclose).toHaveBeenCalledTimes(1);

		view.destroy();
	});

	it('closes when the focus lands nowhere, which is what clicking the app does', () => {
		// BUG-018. Focus is the signal that survives whatever the pointer did:
		// the menu takes focus when it is placed, so focus being elsewhere means
		// the user is elsewhere.
		const { view, onclose } = open([entry('One')]);

		view
			.get('.menu')
			.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
		flushSync();

		expect(onclose).toHaveBeenCalledTimes(1);
		view.destroy();
	});

	it('stays open while the focus moves between its own entries', () => {
		const { view, onclose } = open([entry('One'), entry('Two')]);

		const entries = view.all('.entry');
		view
			.get('.menu')
			.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: entries[1] }));
		flushSync();

		expect(onclose).not.toHaveBeenCalled();
		view.destroy();
	});

	it('stays open when the focus lands on the control that opened it', () => {
		// Otherwise this closes the menu and the control's own click reopens it,
		// which is the defect this whole pair exists to prevent.
		const button = document.createElement('button');
		document.body.appendChild(button);
		const onclose = vi.fn();
		const view = render(Menu, {
			x: 40,
			y: 60,
			items: [entry('One')],
			label: 'Commit actions',
			anchor: button,
			onclose
		});

		view
			.get('.menu')
			.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: button }));
		flushSync();

		expect(onclose).not.toHaveBeenCalled();
		view.destroy();
		button.remove();
	});

	it('leaves a mousedown on its anchor alone, so the control can toggle it', () => {
		// BUG-018: a pointer sends `mousedown` then `click`. Closing on the
		// mousedown and reopening on the click meant the control that opened a
		// menu could never close it.
		const button = document.createElement('button');
		document.body.appendChild(button);
		const onclose = vi.fn();
		const view = render(Menu, {
			x: 40,
			y: 60,
			items: [entry('One')],
			label: 'Commit actions',
			anchor: button,
			onclose
		});

		button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		flushSync();

		expect(onclose).not.toHaveBeenCalled();

		// Anywhere else still closes it.
		fire(document.body, 'mousedown');
		expect(onclose).toHaveBeenCalledTimes(1);

		view.destroy();
		button.remove();
	});

	it('stays open on a mousedown inside itself', () => {
		const { view, onclose } = open([entry('One')]);

		view.get('.entry').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		flushSync();

		expect(onclose).not.toHaveBeenCalled();
		view.destroy();
	});

	/** A menu positioned against a window that just changed size is in the wrong place. */
	it('closes when the window resizes', () => {
		const { view, onclose } = open([entry('One')]);

		fire(window, 'resize');
		expect(onclose).toHaveBeenCalledTimes(1);

		view.destroy();
	});
});

describe('placement', () => {
	it('keeps itself inside the window rather than off the right edge', async () => {
		const view = render(Menu, {
			x: window.innerWidth + 500,
			y: window.innerHeight + 500,
			items: [entry('One')],
			label: 'Commit actions',
			onclose: vi.fn()
		});

		// Placement is measured after mount, so it lands a tick later. Until it
		// does the menu carries `.measuring`, which is how it stays invisible
		// rather than jumping across the screen once the box is known.
		expect(view.get('.menu').classList.contains('measuring')).toBe(true);

		await vi.waitFor(() => {
			flushSync();
			expect(view.get('.menu').classList.contains('measuring')).toBe(false);
		});

		const style = view.get('.menu').style;
		expect(Number.parseFloat(style.left)).toBeLessThan(window.innerWidth);
		expect(Number.parseFloat(style.top)).toBeLessThan(window.innerHeight);

		view.destroy();
	});
});
