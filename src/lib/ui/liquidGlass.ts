// SPDX-License-Identifier: GPL-3.0-or-later
import type { Action } from 'svelte/action';
import {
	DEFAULTS,
	FILTER_ID,
	axisMap,
	bandDepth,
	filterMarkup,
	shapeMask,
	thickest,
	type GlassOptions,
	type PaneRect
} from './liquidGlassMaps';

/**
 * The lens under a pane of thick glass (FEAT-057).
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
 *    the action moves it out — and moves it back off again when the pane is
 *    torn down, because whatever moves a node owns putting it away.
 *
 *    That last clause was learned the hard way. It used to say that Svelte 5
 *    detaches with `node.remove()` and therefore does not care which parent a
 *    node ended up in, so a moved node was still torn down correctly. It was
 *    not: the pane stayed on the stage after its component was gone. Because
 *    the registry emptied correctly, the *lens* came off and the *menu* did
 *    not, which reads as a menu that cannot be dismissed with the next one
 *    drawn over it — and reads as anything but a bug in this file (BUG-018).
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
 *
 * The arithmetic — the maps, the mask and the filter itself — is in
 * `liquidGlassMaps.ts`, where it can be read and tested without a window. This
 * file is the part that needs a document: measuring, registering, and keeping
 * the filter in step with panes that move.
 */

interface Pane {
	node: HTMLElement;
	options: GlassOptions;
}

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
 *
 * "Exactly its box" is now written as a fraction of that box rather than as the
 * measured pixel size, because WebKitGTK read the pixel size in the wrong unit
 * and clipped the window to `1 / devicePixelRatio` of itself (BUG-017). The
 * measurement below still exists — the maps are authored against it — but the
 * region no longer depends on it. See the note on `filterMarkup`.
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

/** Where a pane sits in the filtered element's own coordinates. */
function geometry(pane: Pane, origin: DOMRect): PaneRect {
	const box = pane.node.getBoundingClientRect();
	const radius = parseFloat(getComputedStyle(pane.node).borderTopLeftRadius) || 0;
	return {
		x: box.left - origin.left,
		y: box.top - origin.top,
		w: box.width,
		h: box.height,
		radius,
		depth: bandDepth(pane.options.depth, box.width, box.height)
	};
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
	const material = thickest(list.map((pane) => pane.options));

	if (!host) {
		host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		host.setAttribute('width', '0');
		host.setAttribute('height', '0');
		host.setAttribute('aria-hidden', 'true');
		host.style.position = 'absolute';
		host.style.pointerEvents = 'none';
		document.body.appendChild(host);
	}

	host.innerHTML = filterMarkup({
		mapX: axisMap('x', width, height, rects),
		mapY: axisMap('y', width, height, rects),
		shape: shapeMask(width, height, rects),
		material
	});

	target.style.filter = `url(#${FILTER_ID})`;
}

function schedule() {
	if (frame) return;
	frame = requestAnimationFrame(build);
}

export const liquidGlass: Action<HTMLElement, Partial<GlassOptions> | undefined> = (
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
	//
	// Whether the move happened is remembered, because it is what decides who
	// takes the node away again. A pane mounted outside `.lens` — `DialogHost`
	// is — was never moved and is not this action's to remove.
	let portaled = false;
	if (target.contains(node)) {
		portaled = true;
		if (!stage) {
			stage = document.createElement('div');
			stage.className = 'liquid-glass-stage';
			stage.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 50;';
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

			// What moves the node out is what takes it away again (BUG-018).
			//
			// This used to be left to Svelte, on the reasoning that Svelte 5
			// detaches with `node.remove()` and so does not care which parent a
			// node ended up in. Whatever the mechanism, it did not hold: the
			// pane stayed on the stage after the component was gone, and since
			// the registry *was* emptied correctly, the lens came off and the
			// menu did not — a menu that could not be dismissed, with the next
			// one drawn over the top of it.
			//
			// Removing it here is idempotent: if Svelte has already taken the
			// node, this is a no-op, and if it has not, the node goes now.
			if (portaled) node.remove();
			// The stage is this module's, and an empty one is litter.
			if (stage && stage.childElementCount === 0) {
				stage.remove();
				stage = null;
			}

			panes.delete(pane);
			schedule();
		}
	};
};
