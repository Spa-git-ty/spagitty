// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The two size dials.
 *
 * What can be wrong here is arithmetic and boundaries: a value that walks off
 * the step grid, a clamp that lets a dial past its own limit, a restored value
 * from `localStorage` that is not a number, and a webview that refuses storage
 * altogether. None of those throws — they just quietly produce a window at a
 * size nobody chose, which is why they are asserted rather than eyeballed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROW_PITCH } from '$lib/metrics';
import {
	scale,
	TEXT_MAX,
	TEXT_MIN,
	TEXT_STEP,
	TYPE_BASE,
	ZOOM_MAX,
	ZOOM_MIN,
	ZOOM_STEP
} from '$lib/scale.svelte';

const TEXT_KEY = 'spagitty.scale.text';
const ZOOM_KEY = 'spagitty.scale.zoom';

/** Read a type token back off the document, as a number of pixels. */
function token(name: string): number {
	return Number.parseFloat(document.documentElement.style.getPropertyValue(`--${name}`));
}

beforeEach(() => {
	localStorage.clear();
	scale.reset();
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('bounds', () => {
	it('starts both dials at 100%', () => {
		expect(scale.text).toBe(1);
		expect(scale.zoom).toBe(1);
	});

	it('clamps text to its range rather than trusting the caller', () => {
		scale.setText(5);
		expect(scale.text).toBe(TEXT_MAX);

		scale.setText(0.1);
		expect(scale.text).toBe(TEXT_MIN);
	});

	it('clamps zoom to its range', () => {
		scale.setZoom(99);
		expect(scale.zoom).toBe(ZOOM_MAX);

		scale.setZoom(-1);
		expect(scale.zoom).toBe(ZOOM_MIN);
	});

	it('will not step past the top or the bottom', () => {
		scale.setZoom(ZOOM_MAX);
		scale.zoomIn();
		expect(scale.zoom).toBe(ZOOM_MAX);

		scale.setZoom(ZOOM_MIN);
		scale.zoomOut();
		expect(scale.zoom).toBe(ZOOM_MIN);
	});
});

describe('snapping', () => {
	it('lands a loose value on the nearest step', () => {
		scale.setZoom(1.34);
		expect(scale.zoom).toBeCloseTo(1.3, 10);

		scale.setText(1.13);
		expect(scale.text).toBeCloseTo(1.15, 10);
	});

	/**
	 * The reason `snap` exists: repeated `+= 0.1` on a float walks off the grid,
	 * and 1.0999999999999999 is not a zoom level anybody chose — but it is what
	 * a label would then show.
	 */
	it('keeps stepping on the grid instead of accumulating float error', () => {
		scale.setZoom(ZOOM_MIN);
		for (let step = 0; step < 5; step += 1) scale.zoomIn();

		expect(scale.zoom).toBeCloseTo(ZOOM_MIN + 5 * ZOOM_STEP, 10);
		expect(Number.isInteger(Math.round(scale.zoom / ZOOM_STEP))).toBe(true);
	});

	it('steps back down by the same amount it stepped up', () => {
		scale.setZoom(1.5);
		scale.zoomIn();
		scale.zoomOut();
		expect(scale.zoom).toBeCloseTo(1.5, 10);
	});
});

describe('applying to the document', () => {
	it('writes every type token', () => {
		scale.setZoom(1);
		scale.setText(1);

		for (const [name, base] of Object.entries(TYPE_BASE)) {
			expect(token(name)).toBeCloseTo(base, 2);
		}
	});

	/** Effective type is `base × zoom × text`; the two dials compose. */
	it('multiplies the two dials together', () => {
		scale.setZoom(1.5);
		scale.setText(1.2);

		expect(token('fs-ui')).toBeCloseTo(TYPE_BASE['fs-ui'] * 1.5 * 1.2, 1);
	});

	it('moves the row pitch with both dials, in whole pixels', () => {
		scale.setZoom(1);
		scale.setText(1);
		expect(scale.pitch).toBe(Math.round(ROW_PITCH));

		scale.setZoom(2);
		expect(scale.pitch).toBe(Math.round(ROW_PITCH * 2));
		expect(Number.isInteger(scale.pitch)).toBe(true);
	});

	it('never lets the pitch collapse to nothing', () => {
		scale.setZoom(ZOOM_MIN);
		scale.setText(TEXT_MIN);
		expect(scale.pitch).toBeGreaterThanOrEqual(1);
	});

	it('puts both dials back to 100%', () => {
		scale.setZoom(1.8);
		scale.setText(1.25);

		scale.reset();

		expect(scale.zoom).toBe(1);
		expect(scale.text).toBe(1);
	});
});

describe('persistence', () => {
	it('remembers each dial under its own key', () => {
		scale.setText(1.2);
		scale.setZoom(1.4);

		expect(Number(localStorage.getItem(TEXT_KEY))).toBeCloseTo(1.2, 10);
		expect(Number(localStorage.getItem(ZOOM_KEY))).toBeCloseTo(1.4, 10);
	});

	it('restores what was chosen last', () => {
		localStorage.setItem(TEXT_KEY, '1.15');
		localStorage.setItem(ZOOM_KEY, '1.6');

		scale.init();

		expect(scale.text).toBeCloseTo(1.15, 10);
		expect(scale.zoom).toBeCloseTo(1.6, 10);
	});

	it('falls back to 100% when nothing was stored', () => {
		scale.init();

		expect(scale.text).toBe(1);
		expect(scale.zoom).toBe(1);
	});

	/** A hand-edited or corrupted entry must not become the window's size. */
	it('ignores a stored value that is not a number', () => {
		localStorage.setItem(TEXT_KEY, 'large');
		localStorage.setItem(ZOOM_KEY, 'NaN');

		scale.init();

		expect(scale.text).toBe(1);
		expect(scale.zoom).toBe(1);
	});

	it('clamps a stored value that is out of range', () => {
		localStorage.setItem(TEXT_KEY, '9');
		localStorage.setItem(ZOOM_KEY, '0');

		scale.init();

		expect(scale.text).toBe(TEXT_MAX);
		expect(scale.zoom).toBe(ZOOM_MIN);
	});

	it('boots at 100% when the webview refuses to read storage', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('private mode');
		});

		expect(() => scale.init()).not.toThrow();
		expect(scale.text).toBe(1);
		expect(scale.zoom).toBe(1);
	});

	/** It just will not persist. Not worth failing a paint over. */
	it('still applies the size when the webview refuses to write storage', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota');
		});

		expect(() => scale.setZoom(1.5)).not.toThrow();
		expect(scale.zoom).toBeCloseTo(1.5, 10);
		expect(token('fs-ui')).toBeCloseTo(TYPE_BASE['fs-ui'] * 1.5, 1);
	});
});

describe('the exported range', () => {
	it('is a real range, stepped from the bottom to the top', () => {
		expect(TEXT_MIN).toBeLessThan(TEXT_MAX);
		expect(ZOOM_MIN).toBeLessThan(ZOOM_MAX);
		expect(TEXT_STEP).toBeGreaterThan(0);
		expect(ZOOM_STEP).toBeGreaterThan(0);
	});

	/**
	 * `TYPE_BASE` is a copy of `app.css`'s `--fs-*` declarations, kept so the
	 * first paint has a size before any JavaScript runs. The two must agree, and
	 * the file says this is the one place to change them — so the stylesheet is
	 * read rather than trusted.
	 */
	it('agrees with the stylesheet it duplicates', async () => {
		const css = await import('node:fs').then((fs) =>
			fs.readFileSync('src/app.css', 'utf8')
		);

		for (const [name, base] of Object.entries(TYPE_BASE)) {
			const declared = new RegExp(`--${name}:\\s*([0-9.]+)px`).exec(css);
			expect(declared, `${name} is missing from app.css`).not.toBeNull();
			expect(Number(declared?.[1])).toBeCloseTo(base, 2);
		}
	});
});
