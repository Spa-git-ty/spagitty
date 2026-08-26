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

export const DEFAULTS: GlassOptions = {
	depth: 18,
	strength: 14,
	chromaticAberration: 2,
	blur: 13,
	saturate: 2
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
 * The scale factor is the whole subtlety here, and getting it wrong is what
 * puts the refraction ring up and to the left of the pane it belongs to.
 *
 * WebKit rasterises an `feImage` source at the size of the filter subregion
 * measured in *user* units, and then blits that raster one-for-one into a
 * filter surface running at *device* resolution. At a scale factor of 1 the two
 * agree and a map authored in CSS pixels lands exactly. On a scaled desktop —
 * and most desktops are scaled somehow — every coordinate inside the map is
 * read as a device pixel, and the whole map arrives shrunk by one over the
 * scale factor.
 *
 * Neither a `viewBox` nor a device-sized `width`/`height` fixes that, because
 * neither is what WebKit is measuring; both were tried. What does fix it is to
 * pre-multiply the contents: everything inside is authored in CSS pixels — the
 * same coordinates `getBoundingClientRect` reports — and one transform scales
 * the lot by the device pixel ratio on the way out.
 */
export function svgDataUri(width: number, height: number, body: string, dpr: number): string {
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
	rects: PaneRect[],
	dpr: number
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
			bands.join(''),
		dpr
	);
}

/** The panes' footprints, as a white-on-nothing alpha mask for the frost. */
export function shapeMask(
	width: number,
	height: number,
	rects: PaneRect[],
	dpr: number
): string {
	const shapes = rects
		.map(
			(r) =>
				`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.radius}" ry="${r.radius}" fill="#ffffff"/>`
		)
		.join('');
	return svgDataUri(width, height, shapes, dpr);
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
	width: number;
	height: number;
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
 */
export function filterMarkup({
	width,
	height,
	mapX,
	mapY,
	shape,
	material
}: FilterSources): string {
	const { strength, chromaticAberration: ca, blur, saturate } = material;
	return (
		`<filter id="${FILTER_ID}" x="0" y="0" width="${width}" height="${height}" ` +
		`filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
		`<feImage href="${mapX}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="mapX"/>` +
		`<feImage href="${mapY}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="mapY"/>` +
		`<feImage href="${shape}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="shape"/>` +
		// Sum of the two axes, with the doubled neutral taken back out:
		// 0.5 + 0.5 - 0.5 is 0.5, so anywhere both maps are neutral stays
		// neutral, and a full push on one axis survives at full strength.
		`<feComposite in="mapX" in2="mapY" operator="arithmetic" k1="0" k2="1" k3="1" k4="-0.5" result="map"/>` +
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
		`</filter>`
	);
}
