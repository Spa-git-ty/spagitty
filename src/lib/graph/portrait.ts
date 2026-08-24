// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Author portraits, computed from the email.
 *
 * GitKraken shows a fetched picture on every node. Spagitty shows a generated
 * one, and that is a decision rather than a shortcut — the same one
 * [`./avatar`] records for initials, and it survived being asked again when the
 * heads got bigger:
 *
 * - A fetch is a request per distinct author on the app's most
 *   performance-sensitive surface.
 * - Gravatar identifies the person from the hash, so asking for a picture hands
 *   the repository's committer list to a third party.
 * - A repository is frequently opened with no network, and a graph whose faces
 *   appear only sometimes is worse than one whose faces are always there.
 *
 * So the face is a function of the email: the same address gives the same
 * portrait on every machine, every launch, offline, for ever.
 *
 * # The shape of a portrait
 *
 * Boring Avatars' *marble*, rebuilt rather than depended on: a base fill with
 * three soft blobs over it, every number — position, radius, colour — taken
 * from the hash. Rebuilt because the library ships React components and a
 * palette, and what is wanted here is six numbers and the theme's own lane
 * colours.
 *
 * # One geometry, two renderers
 *
 * [`portrait`] answers *what* the face is. The graph draws it to a canvas
 * ([`./portraitCanvas`], via `lanes.ts`) and the author column paints it with
 * CSS gradients ([`portraitBackground`]). Both read the same description, so a
 * face on a lane and the same author's face beside the message cannot drift
 * apart — which is the whole reason the description is a value rather than a
 * drawing routine.
 */

import { LANE_COLOR_COUNT, laneColorVar } from '$lib/metrics';

/** One soft blob, in units of the portrait's radius (-1 … 1 from the centre). */
export interface Blob {
	x: number;
	y: number;
	/** Radius, also relative: 1 is the whole portrait. */
	r: number;
	/** Index into the lane colour cycle. */
	color: number;
}

export interface Portrait {
	/** The fill behind the blobs. */
	base: number;
	blobs: Blob[];
}

/**
 * FNV-1a, the same hash [`./avatar`] uses, so an author's colour and face come
 * from one number rather than two that disagree about who is similar to whom.
 */
function hash(text: string): number {
	let value = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		value ^= text.charCodeAt(i);
		value = (value + (value << 1) + (value << 4) + (value << 7) + (value << 8) + (value << 24)) >>> 0;
	}
	return value;
}

/**
 * The identity a portrait is generated from.
 *
 * The email, because it is what git actually keys a person by — the same person
 * commits as "Ada", "ada l" and "Ada Lovelace" over a career, and all three are
 * one face if the address is the same. The name is the fallback for the commits
 * that carry no email, which git allows.
 */
export function seedOf(email: string, name = ''): string {
	const address = email.trim().toLowerCase();
	return address || name.trim().toLowerCase();
}

/** Pull `bits` bits out of the hash at `offset`, as a fraction of 0…1. */
function slice(value: number, offset: number, bits: number): number {
	const mask = (1 << bits) - 1;
	return ((value >>> offset) & mask) / (mask + 1);
}

/**
 * The portrait for a seed.
 *
 * Three blobs, because two read as a gradient and four as noise at 18 pixels.
 * They are spread over the disc rather than centred — a blob at the middle of
 * every face makes every face the same face — and each is at least half the
 * portrait wide, so it survives being drawn at node size.
 *
 * The base colour and each blob's colour are stepped through the lane cycle by
 * different amounts, so two authors landing on the same base still differ.
 */
export function portrait(seed: string): Portrait {
	const value = hash(seed);
	const base = value % LANE_COLOR_COUNT;

	const blobs: Blob[] = [0, 1, 2].map((index) => {
		const angle = slice(value, index * 7, 7) * Math.PI * 2;
		const distance = 0.25 + slice(value, index * 5 + 3, 5) * 0.45;

		return {
			x: Math.cos(angle) * distance,
			y: Math.sin(angle) * distance,
			r: 0.7 + slice(value, index * 6 + 11, 6) * 0.55,
			color: (base + 1 + index + (value >>> (index * 3 + 2))) % LANE_COLOR_COUNT
		};
	});

	return { base, blobs };
}

/**
 * The portrait as a CSS `background` value, for the DOM half of the app.
 *
 * Radial gradients rather than an image: they are painted by the compositor,
 * they cost no bytes, and their colours are `var(--lane-N)` — so a theme change
 * repaints every face with no cache to invalidate and no regeneration.
 *
 * Each blob fades to transparent at its edge, which is what makes it a blob
 * rather than a disc.
 */
export function portraitBackground(seed: string): string {
	const { base, blobs } = portrait(seed);

	const layers = blobs.map((blob) => {
		const x = (0.5 + blob.x / 2) * 100;
		const y = (0.5 + blob.y / 2) * 100;
		const color = `var(${laneColorVar(blob.color)})`;

		return (
			`radial-gradient(circle at ${x.toFixed(1)}% ${y.toFixed(1)}%, ` +
			`color-mix(in srgb, ${color} 72%, transparent) 0%, ` +
			`color-mix(in srgb, ${color} 55%, transparent) ${(blob.r * 40).toFixed(1)}%, ` +
			`transparent ${(blob.r * 75).toFixed(1)}%)`
		);
	});

	return `${layers.join(', ')}, var(${laneColorVar(base)})`;
}

/**
 * Draw a portrait into a square canvas context of `size` pixels.
 *
 * Given resolved colours rather than variable names because a canvas cannot
 * read a custom property — `lanes.ts` already resolves the lane palette once
 * per paint for exactly this reason, and hands the same array here.
 *
 * The caller owns clipping. This fills the whole square; the graph clips it to
 * a circle, and the author column's element is already round.
 */
export function drawPortrait(
	ctx: CanvasRenderingContext2D,
	seed: string,
	size: number,
	colors: string[]
): void {
	const { base, blobs } = portrait(seed);
	const color = (index: number): string => colors[index % colors.length];

	ctx.fillStyle = color(base);
	ctx.fillRect(0, 0, size, size);

	const half = size / 2;
	for (const blob of blobs) {
		const x = half + blob.x * half;
		const y = half + blob.y * half;
		const radius = Math.max(1, blob.r * half);

		// Three stops rather than two: a linear fade from full colour to nothing
		// leaves a visible disc edge at 18 pixels, and the mid stop is what
		// turns it into a blend. The alpha keeps two saturated lane colours from
		// stacking into mud where they overlap.
		const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
		gradient.addColorStop(0, color(blob.color));
		gradient.addColorStop(0.55, color(blob.color));
		gradient.addColorStop(1, 'transparent');

		ctx.save();
		ctx.globalAlpha = 0.72;
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

/**
 * Portraits already drawn, keyed by seed, size and palette.
 *
 * The graph repaints every visible node on every scroll frame; building three
 * radial gradients per node per frame is the cost this cache exists to remove.
 * The palette is part of the key so a theme change produces new faces rather
 * than stale ones, and the old entries fall out with [`forgetPortraits`].
 */
const drawn = new Map<string, HTMLCanvasElement | OffscreenCanvas>();

/** Bounded so a repository with thousands of authors cannot grow it forever. */
const CACHE_LIMIT = 512;

function surface(size: number): HTMLCanvasElement | OffscreenCanvas {
	if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	return canvas;
}

/**
 * A portrait ready to be drawn, at device resolution.
 *
 * `size` is in device pixels — the caller has already multiplied by the device
 * pixel ratio for its canvas, and a face rendered at CSS size and scaled up is
 * the one thing that would make these look cheap.
 */
export function portraitTile(
	seed: string,
	size: number,
	colors: string[]
): HTMLCanvasElement | OffscreenCanvas | null {
	const key = `${seed}|${size}|${colors.join()}`;
	const cached = drawn.get(key);
	if (cached) return cached;

	const tile = surface(size);
	const ctx = tile.getContext('2d') as CanvasRenderingContext2D | null;
	if (!ctx) return null;

	drawPortrait(ctx, seed, size, colors);

	if (drawn.size >= CACHE_LIMIT) {
		// Oldest first: insertion order is scroll order, so the entries that go
		// are the ones furthest from where the user is looking.
		const oldest = drawn.keys().next().value;
		if (oldest !== undefined) drawn.delete(oldest);
	}
	drawn.set(key, tile);
	return tile;
}

/** Drop every rendered portrait. Called when the theme changes. */
export function forgetPortraits(): void {
	drawn.clear();
}

/** How many portraits are held. Exposed for the cache's own test. */
export function portraitCacheSize(): number {
	return drawn.size;
}
