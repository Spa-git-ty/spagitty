// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DETAIL_MAX,
	DETAIL_MIN,
	panels,
	RAIL_COLLAPSED_W,
	RAIL_MAX,
	RAIL_MIN
} from './panels.svelte';
import { DETAIL_W, RAIL_W } from './metrics';

const KEY = 'gitlord.panels';

function stubStorage(initial: Record<string, string> = {}) {
	const store = new Map(Object.entries(initial));
	vi.stubGlobal('localStorage', {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k)
	});
	return store;
}

function cssVar(name: string): string {
	return document.documentElement.style.getPropertyValue(name);
}

beforeEach(() => {
	stubStorage();
	panels.reset();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('defaults', () => {
	it('starts at the widths the design specifies', () => {
		expect(panels.rail).toBe(RAIL_W);
		expect(panels.detail).toBe(DETAIL_W);
	});
});

describe('clamping', () => {
	it('will not let a panel be dragged to uselessness', () => {
		panels.setRail(0);
		expect(panels.rail).toBe(RAIL_MIN);

		panels.setDetail(-500);
		expect(panels.detail).toBe(DETAIL_MIN);
	});

	it('will not let a panel eat the window', () => {
		panels.setRail(10_000);
		expect(panels.rail).toBe(RAIL_MAX);

		panels.setDetail(10_000);
		expect(panels.detail).toBe(DETAIL_MAX);
	});

	it('passes a width inside the range through, rounded to a whole pixel', () => {
		panels.setRail(220.6);
		expect(panels.rail).toBe(221);

		panels.setDetail(300.2);
		expect(panels.detail).toBe(300);
	});
});

describe('publishing', () => {
	it('writes the widths as the same custom properties the stylesheet reads', () => {
		panels.setRail(200);
		panels.setDetail(300);

		expect(cssVar('--rail-w')).toBe('200px');
		expect(cssVar('--detail-w')).toBe('300px');
	});

	it('publishes the clamped value, not the requested one', () => {
		panels.setRail(10_000);
		expect(cssVar('--rail-w')).toBe(`${RAIL_MAX}px`);
	});
});

describe('persistence', () => {
	it('does not write storage on every pixel of a drag', () => {
		const store = stubStorage();
		panels.setRail(200);
		panels.setRail(201);
		expect(store.has(KEY)).toBe(false);

		panels.commit();
		expect(store.has(KEY)).toBe(true);
	});

	it('restores stored widths', () => {
		stubStorage({ [KEY]: JSON.stringify({ rail: 210, detail: 330 }) });

		panels.init();

		expect(panels.rail).toBe(210);
		expect(panels.detail).toBe(330);
		expect(cssVar('--rail-w')).toBe('210px');
	});

	it('clamps stored widths, so a file edited by hand cannot break the layout', () => {
		stubStorage({ [KEY]: JSON.stringify({ rail: 9000, detail: 1 }) });

		panels.init();

		expect(panels.rail).toBe(RAIL_MAX);
		expect(panels.detail).toBe(DETAIL_MIN);
	});

	it('ignores a partial record', () => {
		stubStorage({ [KEY]: JSON.stringify({ rail: 210 }) });

		panels.init();

		expect(panels.rail).toBe(210);
		expect(panels.detail).toBe(DETAIL_W);
	});

	it('ignores values of the wrong type', () => {
		stubStorage({ [KEY]: JSON.stringify({ rail: 'wide', detail: null }) });

		panels.init();

		expect(panels.rail).toBe(RAIL_W);
		expect(panels.detail).toBe(DETAIL_W);
	});

	it('survives corrupt storage', () => {
		stubStorage({ [KEY]: 'not json' });

		expect(() => panels.init()).not.toThrow();
		expect(panels.rail).toBe(RAIL_W);
	});

	it('publishes the defaults even when nothing is stored', () => {
		stubStorage();
		panels.init();
		expect(cssVar('--rail-w')).toBe(`${RAIL_W}px`);
	});
});

describe('reset', () => {
	it('returns to the design widths and stores that', () => {
		const store = stubStorage();
		panels.setRail(300);
		panels.reset();

		expect(panels.rail).toBe(RAIL_W);
		expect(cssVar('--rail-w')).toBe(`${RAIL_W}px`);
		expect(JSON.parse(store.get(KEY) as string)).toEqual({
			rail: RAIL_W,
			detail: DETAIL_W,
			railCollapsed: false
		});
	});
});

describe('collapsing the rail', () => {
	it('narrows the variable every other panel lays itself out against', () => {
		stubStorage();
		panels.setRail(300);

		panels.toggleRail();

		expect(panels.railCollapsed).toBe(true);
		expect(cssVar('--rail-w')).toBe(`${RAIL_COLLAPSED_W}px`);
	});

	it('gives back the width that was dragged, not the default', () => {
		stubStorage();
		panels.setRail(300);
		panels.toggleRail();

		panels.toggleRail();

		expect(panels.railCollapsed).toBe(false);
		expect(panels.rail).toBe(300);
		expect(cssVar('--rail-w')).toBe('300px');
	});

	it('survives a restart', () => {
		const store = stubStorage();
		panels.toggleRail();

		// What a restart actually reads: the stored layout carries the flag…
		expect(JSON.parse(store.get(KEY) as string).railCollapsed).toBe(true);

		// …and `init` puts it back, which is the half a fresh process runs.
		panels.init();

		expect(panels.railCollapsed).toBe(true);
		expect(cssVar('--rail-w')).toBe(`${RAIL_COLLAPSED_W}px`);
	});

	it('is undone by a reset, since a collapsed rail is not a design width', () => {
		stubStorage();
		panels.toggleRail();

		panels.reset();

		expect(panels.railCollapsed).toBe(false);
		expect(cssVar('--rail-w')).toBe(`${RAIL_W}px`);
	});
});
