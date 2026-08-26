// SPDX-License-Identifier: GPL-3.0-or-later
import type { Action } from 'svelte/action';

/**
 * The lens under a pane of thick glass.
 *
 * Real thick glass does not merely frost what is behind it — it *bends* it.
 * The backdrop is pushed outward toward the rim, hardest in the band where the
 * shoulder curves away, and the colour splits a little where the bend is
 * sharpest. Without that, a pane is a translucent rectangle no matter how well
 * it is tinted.
 *
 * Every published web recreation of the effect does this with
 * `backdrop-filter: url(#filter)` — an SVG displacement map applied to the
 * pane's own backdrop. **That does not work here.** WebKitGTK parses the
 * declaration and renders nothing for it: `CSS.supports` answers yes,
 * `getComputedStyle` hands the value back, and the pane comes out pixel for
 * pixel identical to one with no filter at all. WebKit restricts
 * `backdrop-filter` to the built-in filter functions on purpose, to keep it on
 * the GPU, and there is a W3C issue open asking for an interoperable way to do
 * this (w3c/svgwg#1142). A probe that only checks whether the value parses
 * comes back true and is wrong.
 *
 * So the filter goes on the other side of the glass.
 *
 * `filter: url(#filter)` — the ordinary one, not the backdrop one — is fully
 * supported: `feImage` (data URIs *and* same-document element references),
 * `feDisplacementMap`, `feComposite`, `feGaussianBlur`, `feColorMatrix` all
 * render. So rather than displacing the pane's backdrop, this displaces the
 * *application*, in a ring the exact shape of the pane's rim. The pane then
 * sits on top carrying only its tint and its edge, and the light bending
 * around it is real: it is the actual commit list, actually displaced.
 *
 * Two consequences fall out of that, and they are not optional:
 *
 * 1. **The pane loses its own `backdrop-filter`.** A filter on an ancestor
 *    makes it a backdrop root, and WebKit stops sampling through it. The frost
 *    therefore moves *into* this filter — blurred, saturated, and clipped to
 *    the pane's own footprint — which is what `--blur-thick` used to do. The
 *    action switches the pane's `backdrop-filter` off itself.
 *
 * 2. **The pane must not be inside what it filters.** A menu is mounted by
 *    whichever component raised it, which is usually deep inside `.main`, so
 *    the action moves it out. Svelte 5 detaches with `node.remove()` rather
 *    than `parent.removeChild(node)`, so a node that has been moved is still
 *    torn down correctly.
 *
 *    It moves into a host of its own and **not** straight into `document.body`:
 *    `body > div { height: 100% }` in `app.css` sizes the shell, and a menu
 *    appended to the body becomes a `body > div` and is stretched to the full
 *    height of the window. The host absorbs that rule — it is meant to be
 *    window-sized — and the panes inside it are no longer body children.
 *
 * Panes register with a shared filter rather than each building their own:
 * a menu can be open over a dialog, and one filter over the window that knows
 * about both is both cheaper and correct at the overlap.
 */

interface LiquidGlassOptions {
	/** Width of the refracting band, in pixels — the glass's thickness. */
	depth?: number;
	/** How hard the band pushes the backdrop outward, in pixels. */
	strength?: number;
	/** RGB split at the rim, in displacement pixels. */
	chromaticAberration?: number;
	/** The frost inside the pane — what `--blur-thick` was doing. */
	blur?: number;
	/** Saturation of the frost, as a multiplier. */
	saturate?: number;
}

interface Pane {
	node: HTMLElement;
	options: Required<LiquidGlassOptions>;
}

const DEFAULTS: Required<LiquidGlassOptions> = {
	depth: 18,
	strength: 14,
	chromaticAberration: 2,
	blur: 13,
	saturate: 2
};

const FILTER_ID = 'liquid-glass-lens';

/**
 * What gets bent: everything in the window except the panes doing the bending.
 *
 * Deliberately `.lens` and not `.app`. A filter clips to its region and the
 * region is the border box, so filtering `.app` — which carries the window's
 * own outline and drop shadow, drawn *outside* that box — would cut the
 * window's edge off for exactly as long as a menu was open. Growing the region
 * past the box is worse: the displacement maps then stop covering it, and
 * `feDisplacementMap` over a map that isn't there produces colour-fringed
 * rubbish in the uncovered band.
 *
 * `.lens` is inset inside `.app` and carries no shadow of its own, so the
 * region can be exactly its box and nothing is clipped that anyone can see.
 */
const TARGET = '.lens';

/** Every pane currently asking for a lens, in mount order. */
const panes = new Set<Pane>();

let host: SVGSVGElement | null = null;
let target: HTMLElement | null = null;
/** Where portaled panes live. See note 2 above. */
let stage: HTMLElement | null = null;
/** Coalesces the rebuilds that a resize or a reposition fire in bursts. */
let frame = 0;

/**
 * A map, as a data URI.
 *
 * The scale factor is the whole subtlety here, and getting it wrong is what
 * puts the refraction ring up and to the left of the pane it belongs to.
 *
 * WebKit rasterises an `feImage` source at the size of the filter subregion
 * measured in *user* units, and then blits that raster one-for-one into a
 * filter surface that is running at *device* resolution. On a desktop at a
 * scale factor of 1 the two agree and a map authored in CSS pixels lands
 * exactly. On a scaled desktop — 1.36 here, and most desktops are scaled
 * somehow — every coordinate inside the map is read as a device pixel, and the
 * whole map arrives shrunk by one over the scale factor.
 *
 * Neither a `viewBox` nor a device-sized `width`/`height` fixes that, because
 * neither is what WebKit is measuring; both were tried. What does fix it is to
 * pre-multiply the contents. Everything inside is authored in CSS pixels — the
 * same coordinates `getBoundingClientRect` reports, which is what keeps the
 * rest of this file readable — and one transform scales the lot by the device
 * pixel ratio on the way out.
 */
function svgDataUri(width: number, height: number, body: string): string {
	const dpr = window.devicePixelRatio || 1;
	return (
		'data:image/svg+xml;utf8,' +
		encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
				`viewBox="0 0 ${width} ${height}">` +
				`<g transform="scale(${dpr})">${body}</g>` +
				`</svg>`
		)
	);
}

/**
 * Where a pane sits in the filtered element's own coordinates.
 *
 * Every rect is expressed relative to the border box of the element the filter
 * is on, not to the viewport — which is the space the maps are placed in.
 */
function geometry(pane: Pane, origin: DOMRect) {
	const box = pane.node.getBoundingClientRect();
	const radius = parseFloat(getComputedStyle(pane.node).borderTopLeftRadius) || 0;
	// A band wider than a quarter of the pane stops being a shoulder and starts
	// being the whole pane, which reads as a smear rather than as an edge.
	const depth = Math.max(
		2,
		Math.min(pane.options.depth, Math.floor(box.width / 4), Math.floor(box.height / 4))
	);
	return {
		x: box.left - origin.left,
		y: box.top - origin.top,
		w: box.width,
		h: box.height,
		radius,
		depth
	};
}

/**
 * One axis of the displacement map.
 *
 * `#808080` means "displace nothing", so the whole window starts neutral and
 * only the bands inside each pane's rim carry a value. On the horizontal map
 * the red channel ramps down toward the left edge and up toward the right, so
 * the backdrop is pushed *outward* on both sides rather than sliding across;
 * the vertical map does the same to green.
 *
 * The two are built separately and added together in the filter itself, which
 * is what makes the corners right: at the top-left, the horizontal map says
 * "push left" and the vertical says "push up", and the sum is a diagonal push
 * out through the corner. Doing it in one image would need a blend mode inside
 * a `feImage` source, which is a great deal more faith than this needs.
 */
function axisMap(
	axis: 'x' | 'y',
	width: number,
	height: number,
	rects: ReturnType<typeof geometry>[]
): string {
	const low = axis === 'x' ? '#008080' : '#800080';
	const high = axis === 'x' ? '#ff8080' : '#80ff80';
	const gradient = (id: string, from: string, to: string) =>
		`<linearGradient id="${id}" ${
			axis === 'x' ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"'
		}><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient>`;

	const defs: string[] = [gradient('lead', low, '#808080'), gradient('trail', '#808080', high)];
	const bands: string[] = [];
	const clips: string[] = [];

	rects.forEach((r, index) => {
		clips.push(
			`<clipPath id="c${index}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.radius}" ry="${r.radius}"/></clipPath>`
		);
		const lead =
			axis === 'x'
				? `<rect x="${r.x}" y="${r.y}" width="${r.depth}" height="${r.h}" fill="url(#lead)"/>`
				: `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.depth}" fill="url(#lead)"/>`;
		const trail =
			axis === 'x'
				? `<rect x="${r.x + r.w - r.depth}" y="${r.y}" width="${r.depth}" height="${r.h}" fill="url(#trail)"/>`
				: `<rect x="${r.x}" y="${r.y + r.h - r.depth}" width="${r.w}" height="${r.depth}" fill="url(#trail)"/>`;
		// Softened, then clipped: a hard-edged band displaces in a step and the
		// step is visible as a seam. Blurring inside the clip would pull
		// neutral grey in from outside the pane and eat the outermost pixels of
		// the bend, so the blur is on the group and the clip is outside it.
		bands.push(
			`<g clip-path="url(#c${index})"><g filter="blur(${Math.max(1, Math.round(r.depth / 3))}px)">${lead}${trail}</g></g>`
		);
	});

	return svgDataUri(
		width,
		height,
		`<defs>${defs.join('')}${clips.join('')}</defs>` +
			`<rect width="${width}" height="${height}" fill="#808080"/>` +
			bands.join('')
	);
}

/** The panes' footprints, as a white-on-nothing alpha mask for the frost. */
function shapeMask(
	width: number,
	height: number,
	rects: ReturnType<typeof geometry>[]
): string {
	const shapes = rects
		.map(
			(r) =>
				`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.radius}" ry="${r.radius}" fill="#ffffff"/>`
		)
		.join('');
	return svgDataUri(width, height, shapes);
}

function build() {
	frame = 0;
	if (!target) return;

	// Nothing open: take the filter off rather than leave an identity one in
	// place. A filtered element is a composited layer and a containing block
	// for its fixed descendants, and neither is worth paying for while there
	// is nothing to refract.
	if (panes.size === 0) {
		target.style.removeProperty('filter');
		host?.remove();
		host = null;
		return;
	}

	const origin = target.getBoundingClientRect();
	const width = Math.round(origin.width);
	const height = Math.round(origin.height);
	if (width === 0 || height === 0) return;

	const list = [...panes];
	const rects = list.map((pane) => geometry(pane, origin));
	// The thickest pane on screen sets the material. Two panes of different
	// glass at once is a detail nobody will ever see, and one number keeps the
	// filter to a single pass.
	const strongest = list.reduce((a, b) => (b.options.strength > a.options.strength ? b : a));
	const { strength, chromaticAberration: ca, blur, saturate } = strongest.options;

	const mapX = axisMap('x', width, height, rects);
	const mapY = axisMap('y', width, height, rects);
	const shape = shapeMask(width, height, rects);

	const displace = (scale: number, result: string, channel: 'R' | 'G' | 'B') => {
		const matrix =
			channel === 'R'
				? '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'
				: channel === 'G'
					? '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'
					: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0';
		return (
			`<feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>` +
			`<feColorMatrix type="matrix" values="${matrix}" result="${result}"/>`
		);
	};

	if (!host) {
		host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		host.setAttribute('width', '0');
		host.setAttribute('height', '0');
		host.setAttribute('aria-hidden', 'true');
		host.style.position = 'absolute';
		host.style.pointerEvents = 'none';
		document.body.appendChild(host);
	}

	host.innerHTML =
		`<filter id="${FILTER_ID}" x="0" y="0" width="${width}" height="${height}" ` +
		`filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
		`<feImage href="${mapX}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="mapX"/>` +
		`<feImage href="${mapY}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="mapY"/>` +
		`<feImage href="${shape}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="shape"/>` +
		// Sum of the two axes, with the doubled neutral taken back out:
		// 0.5 + 0.5 - 0.5 is 0.5, so anywhere both maps are neutral stays
		// neutral, and a full push on one axis survives at full strength.
		`<feComposite in="mapX" in2="mapY" operator="arithmetic" k1="0" k2="1" k3="1" k4="-0.5" result="map"/>` +
		// Three passes at three scales, one channel kept from each and screened
		// back together: the colour splits where the bend is sharpest, which is
		// the rim, and stays put everywhere else because everywhere else is not
		// displaced at all.
		displace(strength + ca, 'Rr', 'R') +
		displace(strength, 'Gg', 'G') +
		displace(strength - ca, 'Bb', 'B') +
		`<feBlend in="Rr" in2="Gg" mode="screen" result="RG"/>` +
		`<feBlend in="RG" in2="Bb" mode="screen" result="refracted"/>` +
		// The frost the pane can no longer do for itself, clipped to the pane.
		`<feGaussianBlur in="refracted" stdDeviation="${blur}" result="frosted"/>` +
		`<feColorMatrix in="frosted" type="saturate" values="${saturate}" result="rich"/>` +
		`<feComposite in="rich" in2="shape" operator="in" result="pane"/>` +
		`<feMerge><feMergeNode in="refracted"/><feMergeNode in="pane"/></feMerge>` +
		`</filter>`;

	target.style.filter = `url(#${FILTER_ID})`;
}

function schedule() {
	if (frame) return;
	frame = requestAnimationFrame(build);
}

export const liquidGlass: Action<HTMLElement, LiquidGlassOptions | undefined> = (
	node,
	options
) => {
	target ??= document.querySelector<HTMLElement>(TARGET);
	// No shell to refract — the component is being rendered somewhere that is
	// not the application, which is a test or a story. The pane keeps the plain
	// blur its stylesheet gives it.
	if (!target) return {};

	// Out of the subtree it is about to bend, and into a host that takes the
	// `body > div` sizing rule so the pane does not. See note 2 at the top.
	if (target.contains(node)) {
		if (!stage) {
			stage = document.createElement('div');
			stage.className = 'liquid-glass-stage';
			stage.style.cssText =
				'position: fixed; inset: 0; pointer-events: none; z-index: 50;';
			document.body.appendChild(stage);
		}
		// The stage does not take clicks; what is on it does.
		node.style.pointerEvents = 'auto';
		stage.appendChild(node);
	}

	// The frost is in the filter now; leaving this on would blur twice, once
	// through a backdrop root that no longer resolves.
	node.style.backdropFilter = 'none';
	node.style.setProperty('-webkit-backdrop-filter', 'none');

	const pane: Pane = { node, options: { ...DEFAULTS, ...options } };
	panes.add(pane);

	// A menu is measured, then moved to keep it inside the window, so its
	// position changes after mount without its size changing — which a resize
	// observer never sees. Watching the style attribute catches the move.
	const resize = new ResizeObserver(schedule);
	resize.observe(node);
	const moved = new MutationObserver(schedule);
	moved.observe(node, { attributes: true, attributeFilter: ['style'] });
	window.addEventListener('resize', schedule);
	// Moving the window to a display at a different scale changes the ratio the
	// maps are authored against, and fires no resize.
	const resolution = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
	resolution.addEventListener('change', schedule);

	schedule();

	return {
		update(next) {
			pane.options = { ...DEFAULTS, ...next };
			schedule();
		},
		destroy() {
			resize.disconnect();
			moved.disconnect();
			window.removeEventListener('resize', schedule);
			resolution.removeEventListener('change', schedule);
			panes.delete(pane);
			schedule();
		}
	};
};
