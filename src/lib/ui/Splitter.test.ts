// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, press, render } from '../../testing/mount';
import Splitter from './Splitter.svelte';
import { DETAIL_W, RAIL_W } from '../metrics';
import { DETAIL_MIN, panels, RAIL_MAX, RAIL_MIN } from '../panels.svelte';

/** The splitter measures the `.app` element, which does not lay out in happy-dom. */
function mountInApp(panel: 'rail' | 'detail', bounds = { left: 0, right: 1280 }) {
	const view = render(Splitter, { panel, label: `Resize the ${panel}` });
	const app = document.createElement('div');
	app.className = 'app';
	app.getBoundingClientRect = () =>
		({ left: bounds.left, right: bounds.right }) as DOMRect;

	const splitter = view.get('.splitter');
	view.target.removeChild(splitter);
	app.appendChild(splitter);
	view.target.appendChild(app);

	return { view, splitter };
}

/** happy-dom has no PointerEvent, and pointer capture is a no-op on an element. */
function pointer(type: string, clientX: number): Event {
	const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button: 0 });
	Object.defineProperty(event, 'pointerId', { value: 1 });
	return event;
}

function drag(element: HTMLElement, type: string, clientX: number) {
	element.setPointerCapture = () => {};
	element.releasePointerCapture = () => {};
	element.dispatchEvent(pointer(type, clientX));
	flushSync();
}

beforeEach(() => {
	vi.stubGlobal('localStorage', {
		getItem: () => null,
		setItem: () => {},
		removeItem: () => {}
	});
	panels.reset();
});

describe('accessibility', () => {
	it('is a focusable separator reporting its own width', () => {
		const { view, splitter } = mountInApp('rail');

		expect(splitter.getAttribute('role')).toBe('separator');
		expect(splitter.getAttribute('aria-orientation')).toBe('vertical');
		expect(splitter.getAttribute('aria-label')).toBe('Resize the rail');
		expect(splitter.getAttribute('tabindex')).toBe('0');
		expect(splitter.getAttribute('aria-valuenow')).toBe(String(RAIL_W));

		view.destroy();
	});

	it('updates the reported width as the panel changes', () => {
		const { view, splitter } = mountInApp('rail');
		panels.setRail(240);
		flushSync();
		expect(splitter.getAttribute('aria-valuenow')).toBe('240');
		view.destroy();
	});
});

describe('dragging', () => {
	it('does nothing until a drag has started', () => {
		const { view, splitter } = mountInApp('rail');
		drag(splitter, 'pointermove', 300);
		expect(panels.rail).toBe(RAIL_W);
		view.destroy();
	});

	it('widens the rail as the pointer moves right', () => {
		const { view, splitter } = mountInApp('rail');

		drag(splitter, 'pointerdown', RAIL_W);
		drag(splitter, 'pointermove', 240);

		expect(panels.rail).toBe(240);
		view.destroy();
	});

	it('widens the detail panel as the pointer moves left', () => {
		// It is on the right edge, so its width is measured from there.
		const { view, splitter } = mountInApp('detail', { left: 0, right: 1280 });

		drag(splitter, 'pointerdown', 1280 - DETAIL_W);
		drag(splitter, 'pointermove', 1280 - 320);

		expect(panels.detail).toBe(320);
		view.destroy();
	});

	it('clamps rather than letting a panel be dragged to uselessness', () => {
		const { view, splitter } = mountInApp('rail');

		drag(splitter, 'pointerdown', RAIL_W);
		drag(splitter, 'pointermove', 5000);
		expect(panels.rail).toBe(RAIL_MAX);

		drag(splitter, 'pointermove', -500);
		expect(panels.rail).toBe(RAIL_MIN);
		view.destroy();
	});

	it('ignores a drag with a button other than the left one', () => {
		const { view, splitter } = mountInApp('rail');
		splitter.setPointerCapture = () => {};

		const event = new MouseEvent('pointerdown', { bubbles: true, clientX: 100, button: 2 });
		Object.defineProperty(event, 'pointerId', { value: 1 });
		splitter.dispatchEvent(event);
		flushSync();

		drag(splitter, 'pointermove', 300);
		expect(panels.rail).toBe(RAIL_W);
		view.destroy();
	});

	it('writes storage once, when the drag ends', () => {
		const setItem = vi.fn();
		vi.stubGlobal('localStorage', { getItem: () => null, setItem, removeItem: () => {} });

		const { view, splitter } = mountInApp('rail');
		drag(splitter, 'pointerdown', RAIL_W);
		drag(splitter, 'pointermove', 200);
		drag(splitter, 'pointermove', 210);
		expect(setItem).not.toHaveBeenCalled();

		drag(splitter, 'pointerup', 210);
		expect(setItem).toHaveBeenCalledTimes(1);
		view.destroy();
	});

	it('stops tracking after the drag ends', () => {
		const { view, splitter } = mountInApp('rail');
		drag(splitter, 'pointerdown', RAIL_W);
		drag(splitter, 'pointermove', 200);
		drag(splitter, 'pointerup', 200);

		drag(splitter, 'pointermove', 320);
		expect(panels.rail).toBe(200);
		view.destroy();
	});
});

describe('keyboard', () => {
	it('resizes with the arrow keys', () => {
		const { view, splitter } = mountInApp('rail');

		press(splitter, 'ArrowRight');
		expect(panels.rail).toBe(RAIL_W + 8);

		press(splitter, 'ArrowLeft');
		expect(panels.rail).toBe(RAIL_W);
		view.destroy();
	});

	it('takes a bigger step with shift', () => {
		const { view, splitter } = mountInApp('rail');
		press(splitter, 'ArrowRight', { shiftKey: true });
		expect(panels.rail).toBe(RAIL_W + 32);
		view.destroy();
	});

	it('moves the detail panel the way the pointer would', () => {
		// Right arrow on the right-hand splitter makes the panel narrower.
		const { view, splitter } = mountInApp('detail');
		press(splitter, 'ArrowRight');
		expect(panels.detail).toBe(DETAIL_W - 8);
		view.destroy();
	});

	it('resets with Home', () => {
		const { view, splitter } = mountInApp('rail');
		panels.setRail(300);
		press(splitter, 'Home');
		expect(panels.rail).toBe(RAIL_W);
		view.destroy();
	});

	it('ignores keys it does not handle', () => {
		const { view, splitter } = mountInApp('rail');
		const event = press(splitter, 'a');
		expect(panels.rail).toBe(RAIL_W);
		expect(event.defaultPrevented).toBe(false);
		view.destroy();
	});

	it('clamps at the minimum', () => {
		const { view, splitter } = mountInApp('detail');
		for (let i = 0; i < 100; i++) press(splitter, 'ArrowRight', { shiftKey: true });
		expect(panels.detail).toBe(DETAIL_MIN);
		view.destroy();
	});
});

describe('double-click', () => {
	it('resets the panel', () => {
		const { view, splitter } = mountInApp('rail');
		panels.setRail(300);

		splitter.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		flushSync();

		expect(panels.rail).toBe(RAIL_W);
		view.destroy();
	});
});
