// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, press, render } from '../../testing/mount';
import { LANE_COLUMNS_MIN, ROW_PITCH, laneColumnWidth } from '../metrics';
import type { GraphRow, RefChip } from '$lib/types';

/**
 * A stand-in for the graph store. The real one is driven by Tauri events and is
 * tested separately; here the rows are the input and the DOM is the output.
 */
vi.mock('$lib/graph/store.svelte', async () => await import('../../testing/graph-store.svelte'));

import { calls, control } from '../../testing/graph-store.svelte';
import CommitRows from './CommitRows.svelte';
import LaneCanvas from './LaneCanvas.svelte';

function row(index: number, overrides: Partial<GraphRow> = {}): GraphRow {
	return {
		index,
		id: `${index}`.padStart(40, 'a'),
		short: `${index}`.padStart(7, 'a'),
		summary: `commit ${index}`,
		authorName: 'Ada Lovelace',
		initials: 'AL',
		// One row per day, so every row is a landmark unless a test says otherwise.
		time: 1_700_000_000 - index * 86_400,
		lane: 0,
		color: 0,
		parents: [],
		refs: [],
		edges: [],
		...overrides
	};
}

function chip(name: string, kind: RefChip['kind'] = 'branch', current = false): RefChip {
	return { name, kind, current };
}

beforeEach(() => {
	control.reset();
	control.setRows([row(0), row(1), row(2)]);
	vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

describe('CommitRows', () => {
	it('is a listbox of options', () => {
		const view = render(CommitRows, {});

		expect(view.get('.scroller').getAttribute('role')).toBe('listbox');
		expect(view.all('[role="option"]')).toHaveLength(3);

		view.destroy();
	});

	it('sizes the scroll area to the whole history, not to the rows drawn', () => {
		control.setRows(Array.from({ length: 5000 }, (_, i) => row(i)));
		const view = render(CommitRows, {});

		expect(view.get('.sizer').style.height).toBe(`${5000 * ROW_PITCH}px`);
		// Virtualized: only a screenful exists as DOM nodes.
		expect(view.all('.row').length).toBeLessThan(50);

		view.destroy();
	});

	it('positions each row at its own index, not at its position in the batch', () => {
		const view = render(CommitRows, {});
		const rows = view.all('.row');

		expect(rows[1].style.transform).toBe(`translateY(${ROW_PITCH}px)`);
		expect(rows[2].style.transform).toBe(`translateY(${2 * ROW_PITCH}px)`);

		view.destroy();
	});

	it('selects a row on click and opens it on double-click', () => {
		const onopen = vi.fn();
		const view = render(CommitRows, { onopen });

		view.all('.row')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		expect(calls.selected).toEqual([1]);

		view.all('.row')[1].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		flushSync();
		expect(onopen).toHaveBeenCalledWith(row(1).id);

		view.destroy();
	});

	it('marks the selected option for assistive technology as well as visually', () => {
		control.setSelected(1);
		const view = render(CommitRows, {});

		const selected = view.all('.row')[1];
		expect(selected.classList.contains('selected')).toBe(true);
		expect(selected.getAttribute('aria-selected')).toBe('true');
		expect(view.get('.scroller').getAttribute('aria-activedescendant')).toBe('commit-1');

		view.destroy();
	});

	it('moves the selection with the arrow keys', () => {
		const view = render(CommitRows, {});
		const scroller = view.get('.scroller');

		press(scroller, 'ArrowDown');
		expect(calls.selected.at(-1)).toBe(0);

		press(scroller, 'ArrowDown');
		expect(calls.selected.at(-1)).toBe(1);

		press(scroller, 'ArrowUp');
		expect(calls.selected.at(-1)).toBe(0);

		view.destroy();
	});

	it('stops at either end rather than wrapping', () => {
		const view = render(CommitRows, {});
		const scroller = view.get('.scroller');

		press(scroller, 'ArrowUp');
		expect(calls.selected.at(-1)).toBe(0);

		press(scroller, 'End');
		expect(calls.selected.at(-1)).toBe(2);
		press(scroller, 'ArrowDown');
		expect(calls.selected.at(-1)).toBe(2);

		press(scroller, 'Home');
		expect(calls.selected.at(-1)).toBe(0);

		view.destroy();
	});

	it('opens the selected commit with Enter', () => {
		const onopen = vi.fn();
		control.setSelected(2);
		const view = render(CommitRows, { onopen });

		press(view.get('.scroller'), 'Enter');
		expect(onopen).toHaveBeenCalledWith(row(2).id);

		view.destroy();
	});

	it('does nothing on Enter with no selection', () => {
		const onopen = vi.fn();
		const view = render(CommitRows, { onopen });

		press(view.get('.scroller'), 'Enter');
		expect(onopen).not.toHaveBeenCalled();

		view.destroy();
	});

	it('leaves keys it does not handle alone', () => {
		const view = render(CommitRows, {});
		const event = press(view.get('.scroller'), 'x');

		expect(event.defaultPrevented).toBe(false);
		expect(calls.selected).toEqual([]);

		view.destroy();
	});

	it('asks the store for more history as the viewport reaches the end', () => {
		const view = render(CommitRows, {});
		expect(calls.ensured.length).toBeGreaterThan(0);
		view.destroy();
	});

	it('scrolls the selection back into view when it moves off screen', () => {
		control.setRows(Array.from({ length: 100 }, (_, i) => row(i)));
		const view = render(CommitRows, {});
		const scroller = view.get('.scroller');
		// happy-dom lays nothing out, so the viewport has to be declared.
		Object.defineProperty(scroller, 'clientHeight', { value: 10 * ROW_PITCH });
		scroller.scrollTop = 0;

		press(scroller, 'End');
		expect(scroller.scrollTop).toBeGreaterThan(0);

		press(scroller, 'Home');
		expect(scroller.scrollTop).toBe(0);

		view.destroy();
	});

	it('shows at most two ref chips and counts the rest', () => {
		control.setRows([
			row(0, { refs: [chip('main', 'branch', true), chip('origin/main', 'remote'), chip('v1')] })
		]);
		const view = render(CommitRows, {});

		expect(view.all('.refs .ref')).toHaveLength(2);
		const more = view.get('.more');
		expect(more.textContent?.trim()).toBe('+1');
		// The overflow still names every ref, so nothing becomes unreachable.
		expect(more.getAttribute('title')).toBe('main, origin/main, v1');

		view.destroy();
	});

	it('shows no overflow marker when everything fits', () => {
		control.setRows([row(0, { refs: [chip('main', 'branch', true)] })]);
		const view = render(CommitRows, {});
		expect(view.find('.more')).toBeNull();
		view.destroy();
	});

	it('labels only the first row of each day', () => {
		const day = 86_400;
		const base = 1_700_000_000;
		control.setRows([
			row(0, { time: base }),
			row(1, { time: base - 60 }), // same day
			row(2, { time: base - day }) // the day before
		]);
		const view = render(CommitRows, {});
		const times = view.all('.row').map((r) => r.querySelector('.when'));

		expect(times[0]).not.toBeNull();
		expect(times[1]).toBeNull();
		expect(times[2]).not.toBeNull();

		view.destroy();
	});

	it('starts at the design lane width', () => {
		const view = render(CommitRows, {});
		expect(view.get('.lane-space').style.width).toBe(`${laneColumnWidth(LANE_COLUMNS_MIN)}px`);
		view.destroy();
	});

	it('widens the lane column immediately for a deeper history', () => {
		control.setRows([row(0), row(1, { lane: 8, edges: [{ from: 0, to: 8, color: 1 }] })]);
		const view = render(CommitRows, {});

		expect(view.get('.lane-space').style.width).toBe(`${laneColumnWidth(9)}px`);
		view.destroy();
	});

	it('does not narrow the lane column the instant the history does', () => {
		// Shrinking on sight would make the message column jump left and right
		// under the reader's eyes while scrolling.
		vi.useFakeTimers();
		control.setRows([row(0, { lane: 8, edges: [{ from: 0, to: 8, color: 1 }] })]);
		const view = render(CommitRows, {});
		const wide = view.get('.lane-space').style.width;
		expect(wide).toBe(`${laneColumnWidth(9)}px`);

		control.setRows([row(0)]);
		flushSync();
		expect(view.get('.lane-space').style.width).toBe(wide);

		vi.advanceTimersByTime(500);
		flushSync();
		expect(view.get('.lane-space').style.width).toBe(`${laneColumnWidth(LANE_COLUMNS_MIN)}px`);

		view.destroy();
		vi.useRealTimers();
	});
});

describe('LaneCanvas', () => {
	/** happy-dom has no canvas; this is the smallest context the drawing uses. */
	function stubCanvas() {
		const seen: string[] = [];
		const ctx = new Proxy(
			{ canvas: {} },
			{
				get(target: Record<string, unknown>, key: string) {
					if (key === 'canvas') return target.canvas;
					return (...args: unknown[]) => {
						seen.push(key);
						void args;
					};
				},
				set: () => true
			}
		);
		HTMLCanvasElement.prototype.getContext = (() =>
			ctx) as unknown as HTMLCanvasElement['getContext'];
		vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '#123456' }));
		return seen;
	}

	it('sizes its backing store for the device pixel ratio', () => {
		stubCanvas();
		vi.stubGlobal('devicePixelRatio', 2);

		const view = render(LaneCanvas, {
			scrollTop: 0,
			first: 0,
			last: 2,
			width: 150,
			height: 400,
			columns: LANE_COLUMNS_MIN
		});

		const canvas = view.get('canvas') as HTMLCanvasElement;
		expect(canvas.width).toBe(300);
		expect(canvas.height).toBe(800);
		// CSS size stays in CSS pixels, or the column would be twice as wide.
		expect(canvas.style.width).toBe('150px');

		view.destroy();
	});

	it('draws the lanes', () => {
		const seen = stubCanvas();
		vi.stubGlobal('devicePixelRatio', 1);

		const view = render(LaneCanvas, {
			scrollTop: 0,
			first: 0,
			last: 2,
			width: 150,
			height: 400,
			columns: LANE_COLUMNS_MIN
		});

		expect(seen).toContain('clearRect');
		expect(seen).toContain('arc');

		view.destroy();
	});

	it('draws nothing before it has been given a size', () => {
		const seen = stubCanvas();

		const view = render(LaneCanvas, {
			scrollTop: 0,
			first: 0,
			last: 2,
			width: 150,
			height: 0,
			columns: LANE_COLUMNS_MIN
		});

		expect(seen).toHaveLength(0);
		view.destroy();
	});

	it('does not swallow clicks meant for the rows underneath', () => {
		stubCanvas();
		const view = render(LaneCanvas, {
			scrollTop: 0,
			first: 0,
			last: 0,
			width: 150,
			height: 100,
			columns: LANE_COLUMNS_MIN
		});

		expect(view.get('canvas').getAttribute('aria-hidden')).toBe('true');
		view.destroy();
	});
});
