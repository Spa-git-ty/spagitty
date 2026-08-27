// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The arithmetic behind the lens (FEAT-057).
 *
 * Everything here is a pure function of numbers and strings: given where the
 * panes are, it returns the displacement maps, the alpha mask and the filter
 * that bends the application around them. Nothing in this file touches the
 * document, and that is the point — the geometry is where this effect is wrong
 * or right, and a rule you can only check by opening a window on one machine is
 * a rule nobody checks.
 *
 * `liquidGlass.ts` owns the DOM: it measures the panes, keeps the registry, and
 * hands the numbers here.
 */

/** The material of a pane of glass. */
export interface GlassOptions {
	/** Width of the refracting band, in pixels — the glass's thickness. */
	depth: number;
	/** How hard the band pushes the backdrop outward, in pixels. */
	strength: number;
	/** RGB split at the rim, in displacement pixels. */
	chromaticAberration: number;
	/** The frost inside the pane. */
	blur: number;
	/** Saturation of the frost, as a multiplier. */
	saturate: number;
}

/**
 * Where a pane sits in the filtered element's own coordinates, and how wide its
 * shoulder is. Every value is in CSS pixels, relative to the border box of the
 * element the filter is on — never to the viewport.
 */
export interface PaneRect {
	x: number;
	y: number;
	w: number;
	h: number;
	radius: number;
	depth: number;
}

/**
 * The material, settled by the author at the window (TASK-020).
 *
 * Every number here was chosen by eye against the running application, on
 * sliders wired to this object, rather than reasoned about — which is the only
 * way to choose them. They are recorded exactly as they were left.
 *
 * The shape of the choice is worth keeping, because it is not what the effect
 * was built expecting. It is much quieter glass: a third of the shoulder, less
 * than half the push, no colour split at the rim at all, and a frost that
 * suggests rather than obscures. `saturate: 0` drains the colour from what is
 * behind the pane entirely, so the frost reads as grey light rather than as a
 * tint of the commit list underneath it.
 *
 * Taken together that is glass as a material the interface is made of, not as
 * an effect the interface performs.
 */
export const DEFAULTS: GlassOptions = {
	depth: 7,
	strength: 6,
	chromaticAberration: 0,
	blur: 10,
	saturate: 0
};

export const FILTER_ID = 'liquid-glass-lens';

/**
 * How wide the shoulder may actually be on a pane of this size.
 *
 * A band wider than a quarter of the pane stops being a shoulder and starts
 * being the whole pane, which reads as a smear rather than as an edge. Below
 * two pixels there is nothing to ramp across and the bend becomes a step, so
 * that is the floor even when the pane is tiny — a pane that small has no
 * readable rim either way, and a floor keeps the maps well-formed.
 */
export function bandDepth(requested: number, width: number, height: number): number {
	return Math.max(2, Math.min(requested, Math.floor(width / 4), Math.floor(height / 4)));
}

/**
 * A map, as a data URI.
 *
 * Everything inside is authored in CSS pixels — the same coordinates
 * `getBoundingClientRect` reports — and the `viewBox` says so. Each map is then
 * stretched onto the filter region by `preserveAspectRatio="none"`, so the
 * numbers here never have to know what a device pixel is.
 *
 * They used to. Every coordinate was pre-multiplied by the device pixel ratio,
 * to compensate for WebKit rasterising an `feImage` at the size of a filter
 * subregion that was itself written in the wrong units. Fixing the region
 * (BUG-017) removed the thing being compensated for, and the compensation with
 * it: the map is now measured against the region, and the region is a fraction
 * of the pane's own box.
 */
export function svgDataUri(width: number, height: number, body: string): string {
	return (
		'data:image/svg+xml;utf8,' +
		encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
				`viewBox="0 0 ${width} ${height}">` +
				body +
				`</svg>`
		)
	);
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
 * is what makes the corners right: at the top-left the horizontal map says
 * "push left" and the vertical says "push up", and the sum is a diagonal push
 * out through the corner. Doing it in one image would need a blend mode inside
 * an `feImage` source, which is a great deal more faith than this needs.
 */
export function axisMap(
	axis: 'x' | 'y',
	width: number,
	height: number,
	rects: PaneRect[]
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
		// step is visible as a seam. Blurring inside the clip would pull neutral
		// grey in from outside the pane and eat the outermost pixels of the
		// bend, so the blur is on the group and the clip is outside it.
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
export function shapeMask(width: number, height: number, rects: PaneRect[]): string {
	const shapes = rects
		.map(
			(r) =>
				`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.radius}" ry="${r.radius}" fill="#ffffff"/>`
		)
		.join('');
	return svgDataUri(width, height, shapes);
}

/**
 * The thickest glass on screen sets the material for everything.
 *
 * Two panes of different glass at once is a detail nobody will ever see, and
 * one number keeps the filter to a single pass. Ties go to the pane that
 * registered first, so a menu opening over a dialog does not restyle it.
 */
export function thickest(list: GlassOptions[]): GlassOptions {
	return list.reduce((a, b) => (b.strength > a.strength ? b : a));
}

/** One displacement pass, keeping a single channel out of it. */
function displace(scale: number, result: string, channel: 'R' | 'G' | 'B'): string {
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
}

/** Everything the filter needs that is not geometry. */
export interface FilterSources {
	mapX: string;
	mapY: string;
	shape: string;
	material: GlassOptions;
}

/**
 * The filter itself, as markup.
 *
 * Three passes at three scales, one channel kept from each and screened back
 * together: the colour splits where the bend is sharpest, which is the rim, and
 * stays put everywhere else because everywhere else is not displaced at all.
 *
 * **The region carries no pixel unit, and that is deliberate (BUG-017).** It
 * used to be written as `filterUnits="userSpaceOnUse"` with the filtered
 * element's measured width and height — CSS pixels, straight from
 * `getBoundingClientRect`. WebKitGTK consumes those user units as *device*
 * pixels, so on any display whose ratio is not 1 the region covered only
 * `1 / devicePixelRatio` of the element and everything outside it was left
 * unpainted: on a 1701×1381 window at a ratio of 1.3636, a `.lens` measuring
 * 1247×1013 got a region 1247×1013 device pixels wide, and the window's right
 * column and bottom went flat `--bg` for as long as a menu was open.
 *
 * A fraction of the object's bounding box cannot be read in the wrong pixels,
 * so `0 0 1 1` in `objectBoundingBox` units is the region — exactly the border
 * box, which is what `.lens` was shaped to allow. The `feImage` primitives
 * carry no subregion of their own for the same reason: absent, each defaults to
 * the filter region, and `preserveAspectRatio="none"` stretches the map onto
 * it. One set of numbers decides the geometry instead of two that can disagree.
 */
export function filterMarkup({
	mapX,
	mapY,
	shape,
	material
}: FilterSources): string {
	const { strength, chromaticAberration: ca, blur, saturate } = material;
	return (
		`<filter id="${FILTER_ID}" x="0" y="0" width="1" height="1" ` +
		`filterUnits="objectBoundingBox" color-interpolation-filters="sRGB">` +
		`<feImage href="${mapX}" preserveAspectRatio="none" result="mapX"/>` +
		`<feImage href="${mapY}" preserveAspectRatio="none" result="mapY"/>` +
		`<feImage href="${shape}" preserveAspectRatio="none" result="shape"/>` +
		// Sum of the two axes, with the doubled neutral taken back out:
		// 0.5 + 0.5 - 0.5 is 0.5, so anywhere both maps are neutral stays
		// neutral, and a full push on one axis survives at full strength.
		`<feComposite in="mapX" in2="mapY" operator="arithmetic" k1="0" k2="1" k3="1" k4="-0.5" result="map"/>` +
		/*
		 * With no colour split there is nothing to split, and three passes at
		 * one scale are one pass (TASK-022).
		 *
		 * The three below run at `strength + ca`, `strength` and
		 * `strength - ca`, each keeping a single channel, and are screened back
		 * together. At `ca = 0` all three scales are equal, so the screen of
		 * their R, G and B is pixel for pixel the undisplaced-channel sum — the
		 * same image one `feDisplacementMap` produces, for three times the work
		 * plus two blends. Every primitive here rasterises the whole window on
		 * the CPU, so this is not a micro-optimisation.
		 */
		(ca === 0
			? `<feDisplacementMap in="SourceGraphic" in2="map" scale="${strength}" xChannelSelector="R" yChannelSelector="G" result="refracted"/>`
			: displace(strength + ca, 'Rr', 'R') +
				displace(strength, 'Gg', 'G') +
				displace(strength - ca, 'Bb', 'B') +
				`<feBlend in="Rr" in2="Gg" mode="screen" result="RG"/>` +
				`<feBlend in="RG" in2="Bb" mode="screen" result="refracted"/>`) +
		// The frost the pane can no longer do for itself, clipped to the pane.
		`<feGaussianBlur in="refracted" stdDeviation="${blur}" result="frosted"/>` +
		`<feColorMatrix in="frosted" type="saturate" values="${saturate}" result="rich"/>` +
		`<feComposite in="rich" in2="shape" operator="in" result="pane"/>` +
		`<feMerge><feMergeNode in="refracted"/><feMergeNode in="pane"/></feMerge>` +
		`</filter>`
	);
}
