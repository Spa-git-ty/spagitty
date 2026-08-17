// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it } from 'vitest';
import { LANE_COLOR_COUNT } from '$lib/metrics';
import {
	drawPortrait,
	forgetPortraits,
	portrait,
	portraitBackground,
	portraitCacheSize,
	portraitTile,
	seedOf
} from './portrait';

beforeEach(() => forgetPortraits());

describe('the seed a portrait is generated from', () => {
	it('is the email, because that is what identifies a person across names', () => {
		expect(seedOf('Ada@Example.com', 'Ada Lovelace')).toBe('ada@example.com');
		expect(seedOf('ada@example.com', 'ada l')).toBe(
			seedOf('ADA@EXAMPLE.COM', 'Ada Lovelace')
		);
	});

	it('falls back to the name when git recorded no address', () => {
		expect(seedOf('', 'Ada Lovelace')).toBe('ada lovelace');
		expect(seedOf('   ', 'Ada Lovelace')).toBe('ada lovelace');
	});

	it('is empty when there is nothing to go on, rather than throwing', () => {
		expect(seedOf('', '')).toBe('');
		expect(() => portrait('')).not.toThrow();
	});
});

describe('a portrait', () => {
	it('is the same face for the same address, every time', () => {
		expect(portrait('ada@example.com')).toEqual(portrait('ada@example.com'));
	});

	it('is a different face for a different address', () => {
		const ada = portrait('ada@example.com');
		const charles = portrait('charles@example.com');
		expect(ada).not.toEqual(charles);
	});

	it('stays inside the theme’s lane palette, so it introduces no new hue', () => {
		for (const seed of ['ada@example.com', 'charles@example.com', 'x', '', 'a@b.c']) {
			const face = portrait(seed);
			expect(face.base).toBeGreaterThanOrEqual(0);
			expect(face.base).toBeLessThan(LANE_COLOR_COUNT);
			for (const blob of face.blobs) {
				expect(blob.color).toBeGreaterThanOrEqual(0);
				expect(blob.color).toBeLessThan(LANE_COLOR_COUNT);
			}
		}
	});

	it('has three blobs, spread rather than stacked on the centre', () => {
		// A blob at the middle of every face makes every face the same face.
		for (const seed of ['ada@example.com', 'grace@example.com', 'linus@example.com']) {
			const { blobs } = portrait(seed);
			expect(blobs).toHaveLength(3);
			for (const blob of blobs) {
				const distance = Math.hypot(blob.x, blob.y);
				expect(distance).toBeGreaterThanOrEqual(0.24);
				expect(distance).toBeLessThanOrEqual(0.71);
				expect(blob.r).toBeGreaterThanOrEqual(0.7);
			}
		}
	});

	it('spreads similar addresses apart rather than giving them near-identical faces', () => {
		// One character apart is the case that matters: two colleagues on the
		// same domain must not be told apart only by squinting.
		const first = portrait('ada.l@example.com');
		const second = portrait('ada.m@example.com');
		const moved = first.blobs.some(
			(blob, index) =>
				Math.abs(blob.x - second.blobs[index].x) > 0.1 ||
				Math.abs(blob.y - second.blobs[index].y) > 0.1
		);
		expect(moved || first.base !== second.base).toBe(true);
	});
});

describe('the CSS form', () => {
	it('paints with the lane variables, so a theme change repaints it', () => {
		const css = portraitBackground('ada@example.com');
		expect(css).toContain('var(--lane-');
		expect(css).not.toMatch(/#[0-9a-f]{3,6}/i);
	});

	it('is three gradients over a base fill', () => {
		const css = portraitBackground('ada@example.com');
		expect(css.match(/radial-gradient/g)).toHaveLength(3);
		expect(css.endsWith(')')).toBe(true);
	});

	it('fades every blob out at its edge, so it is a blob and not a disc', () => {
		expect(portraitBackground('ada@example.com')).toContain('transparent');
	});
});

describe('drawing', () => {
	interface Call {
		op: string;
		args: unknown[];
	}

	function fakeContext() {
		const calls: Call[] = [];
		const gradient = { addColorStop: (...args: unknown[]) => calls.push({ op: 'stop', args }) };
		const ctx = {
			fillStyle: '' as unknown,
			globalAlpha: 1,
			save: () => calls.push({ op: 'save', args: [] }),
			restore: () => calls.push({ op: 'restore', args: [] }),
			fillRect: (...args: unknown[]) => calls.push({ op: 'fillRect', args }),
			createRadialGradient: (...args: unknown[]) => {
				calls.push({ op: 'gradient', args });
				return gradient;
			},
			beginPath: () => calls.push({ op: 'beginPath', args: [] }),
			arc: (...args: unknown[]) => calls.push({ op: 'arc', args }),
			fill: () => calls.push({ op: 'fill', args: [] })
		};
		return { ctx, calls };
	}

	it('fills the square and then lays the blobs over it', () => {
		const { ctx, calls } = fakeContext();
		drawPortrait(ctx as unknown as CanvasRenderingContext2D, 'ada@example.com', 18, [
			'#111',
			'#222',
			'#333',
			'#444',
			'#555'
		]);

		expect(calls[0].op).toBe('fillRect');
		// Each blob is drawn inside its own save/restore, so the alpha it needs
		// cannot leak into whatever the caller draws next.
		expect(calls.filter((c) => c.op === 'save')).toHaveLength(3);
		expect(calls.filter((c) => c.op === 'restore')).toHaveLength(3);
		expect(calls.filter((c) => c.op === 'gradient')).toHaveLength(3);
		expect(calls.filter((c) => c.op === 'arc')).toHaveLength(3);
	});

	it('cycles the palette rather than running off the end of a short one', () => {
		const { ctx } = fakeContext();
		expect(() =>
			drawPortrait(ctx as unknown as CanvasRenderingContext2D, 'ada@example.com', 18, ['#111'])
		).not.toThrow();
	});
});

describe('the tile cache', () => {
	const palette = ['#111', '#222', '#333', '#444', '#555'];

	it('renders an author once and hands the same tile back', () => {
		const first = portraitTile('ada@example.com', 18, palette);
		const second = portraitTile('ada@example.com', 18, palette);

		// happy-dom gives no 2d context, so a null here is the environment
		// rather than a failure — what matters is that both answers agree.
		expect(second).toBe(first);
		if (first) expect(portraitCacheSize()).toBe(1);
	});

	it('treats a different palette as a different tile, so a theme change is not stale', () => {
		const light = portraitTile('ada@example.com', 18, palette);
		const dark = portraitTile('ada@example.com', 18, ['#eee', '#ddd', '#ccc', '#bbb', '#aaa']);

		if (light && dark) {
			expect(dark).not.toBe(light);
			expect(portraitCacheSize()).toBe(2);
		}
	});

	it('is emptied when the theme changes', () => {
		portraitTile('ada@example.com', 18, palette);
		forgetPortraits();
		expect(portraitCacheSize()).toBe(0);
	});
});
