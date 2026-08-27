// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The arithmetic under the glass (FEAT-057).
 *
 * The lens is the one effect in Spagitty whose failures are all off-by-a-factor
 * rather than off-by-a-behaviour: a map authored in the wrong units puts the
 * refraction ring up and to the left of the pane it belongs to, and a band
 * wider than the pane turns an edge into a smear. None of that throws, none of
 * it fails a type check, and all of it is visible only to someone with the
 * application open on a display of the right scale.
 *
 * So the numbers are tested here instead. Every function in `liquidGlassMaps`
 * is pure, and what these assert is the arithmetic the comments in that file
 * promise — the device-pixel pre-multiply, the outward push on both rims, the
 * neutral field everywhere else, and the clamp that keeps a shoulder a
 * shoulder.
 */

import { describe, expect, it } from 'vitest';
import {
	DEFAULTS,
	FILTER_ID,
	axisMap,
	bandDepth,
	filterMarkup,
	shapeMask,
	svgDataUri,
	thickest,
	type PaneRect
} from './liquidGlassMaps';

/** A pane, as the DOM half would have measured it. */
function rect(over: Partial<PaneRect> = {}): PaneRect {
	return { x: 100, y: 50, w: 240, h: 180, radius: 12, depth: 18, ...over };
}

/** Data URIs are unreadable until they are not. */
function decode(uri: string): string {
	return decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
}

describe('bandDepth', () => {
	it('gives a big pane the shoulder it asked for', () => {
		expect(bandDepth(18, 400, 300)).toBe(18);
	});

	it('never lets the band past a quarter of the pane, on either axis', () => {
		// A 40px-wide pane: a quarter is 10, so 18 is refused even though the
		// height would allow it. Wider than that and the rim is the pane.
		expect(bandDepth(18, 40, 300)).toBe(10);
		expect(bandDepth(18, 400, 40)).toBe(10);
	});

	it('keeps a floor of two pixels, because one pixel is a step and not a ramp', () => {
		expect(bandDepth(18, 4, 4)).toBe(2);
		expect(bandDepth(0, 400, 300)).toBe(2);
	});
});

describe('svgDataUri', () => {
	it('pre-multiplies the body by the device pixel ratio', () => {
		// WebKit measures the `feImage` subregion in user units and blits the
		// raster into a device-resolution surface, so a map authored in CSS
		// pixels arrives shrunk by 1/dpr unless the contents are scaled first.
		expect(decode(svgDataUri(100, 80, '<rect/>', 2))).toContain('<g transform="scale(2)">');
		expect(decode(svgDataUri(100, 80, '<rect/>', 1))).toContain('<g transform="scale(1)">');
	});

	it('keeps width, height and viewBox in CSS pixels', () => {
		const svg = decode(svgDataUri(100, 80, '', 2));

		expect(svg).toContain('width="100"');
		expect(svg).toContain('height="80"');
		expect(svg).toContain('viewBox="0 0 100 80"');
	});

	it('escapes the markup, so a URI is never truncated at the first "#"', () => {
		// `#` starts a fragment. An unescaped colour in a gradient stop would
		// cut the document off mid-element and the filter would silently render
		// nothing.
		const uri = svgDataUri(10, 10, '<rect fill="#808080"/>', 1);

		expect(uri).not.toContain('#');
		expect(decode(uri)).toContain('#808080');
	});
});

describe('axisMap', () => {
	it('fills the field with neutral grey, so nothing outside a pane moves', () => {
		const svg = decode(axisMap('x', 800, 600, [rect()], 1));

		expect(svg).toContain('<rect width="800" height="600" fill="#808080"/>');
	});

	it('ramps red on the horizontal axis and green on the vertical', () => {
		// The displacement map reads x from R and y from G. An axis that wrote
		// the other channel would push the backdrop sideways when it meant up.
		const across = decode(axisMap('x', 800, 600, [rect()], 1));
		const down = decode(axisMap('y', 800, 600, [rect()], 1));

		expect(across).toContain('stop-color="#008080"');
		expect(across).toContain('stop-color="#ff8080"');
		expect(down).toContain('stop-color="#800080"');
		expect(down).toContain('stop-color="#80ff80"');
	});

	it('runs its gradients along the axis it is for', () => {
		expect(decode(axisMap('x', 800, 600, [rect()], 1))).toContain('x1="0" y1="0" x2="1" y2="0"');
		expect(decode(axisMap('y', 800, 600, [rect()], 1))).toContain('x1="0" y1="0" x2="0" y2="1"');
	});

	it('puts one band at each rim, a band wide, and nothing in between', () => {
		const r = rect({ x: 100, y: 50, w: 240, h: 180, depth: 18 });
		const svg = decode(axisMap('x', 800, 600, [r], 1));

		// Leading band at the left rim.
		expect(svg).toContain('<rect x="100" y="50" width="18" height="180" fill="url(#lead)"/>');
		// Trailing band at the right rim: x + w - depth.
		expect(svg).toContain('<rect x="322" y="50" width="18" height="180" fill="url(#trail)"/>');
	});

	it('clips each band to its own pane, corners included', () => {
		const svg = decode(axisMap('x', 800, 600, [rect({ radius: 14 })], 1));

		expect(svg).toContain('<clipPath id="c0">');
		expect(svg).toContain('rx="14" ry="14"');
		expect(svg).toContain('clip-path="url(#c0)"');
	});

	it('softens the band by a third of its width, and never by nothing', () => {
		// A hard-edged band displaces in a step, and the step is a visible seam.
		expect(decode(axisMap('x', 800, 600, [rect({ depth: 18 })], 1))).toContain('blur(6px)');
		expect(decode(axisMap('x', 800, 600, [rect({ depth: 2 })], 1))).toContain('blur(1px)');
	});

	it('gives every pane its own clip, so two open at once do not share one', () => {
		const svg = decode(axisMap('x', 800, 600, [rect(), rect({ x: 400 })], 1));

		expect(svg).toContain('<clipPath id="c0">');
		expect(svg).toContain('<clipPath id="c1">');
		expect(svg).toContain('clip-path="url(#c1)"');
	});

	it('is a flat neutral field when nothing is open', () => {
		const svg = decode(axisMap('x', 800, 600, [], 1));

		expect(svg).toContain('fill="#808080"');
		expect(svg).not.toContain('url(#lead)');
		expect(svg).not.toContain('clipPath');
	});
});

describe('shapeMask', () => {
	it('draws each pane as a solid white footprint and nothing else', () => {
		const svg = decode(shapeMask(800, 600, [rect()], 1));

		expect(svg).toContain(
			'<rect x="100" y="50" width="240" height="180" rx="12" ry="12" fill="#ffffff"/>'
		);
		expect(svg).not.toContain('#808080');
	});

	it('is empty when no pane is open, so the frost lands nowhere', () => {
		expect(decode(shapeMask(800, 600, [], 1))).not.toContain('<rect');
	});
});

describe('thickest', () => {
	it('lets the strongest pane on screen set the material', () => {
		const thin = { ...DEFAULTS, strength: 8 };
		const thick = { ...DEFAULTS, strength: 20 };

		expect(thickest([thin, thick])).toBe(thick);
		expect(thickest([thick, thin])).toBe(thick);
	});

	it('keeps the first of two equals, so a menu over a dialog restyles nothing', () => {
		const first = { ...DEFAULTS };
		const second = { ...DEFAULTS };

		expect(thickest([first, second])).toBe(first);
	});
});

describe('filterMarkup', () => {
	const sources = {
		width: 800,
		height: 600,
		mapX: 'x-map',
		mapY: 'y-map',
		shape: 'shape-mask',
		material: DEFAULTS
	};

	it('covers exactly the element it is on, in its own coordinates', () => {
		const filter = filterMarkup(sources);

		expect(filter).toContain(`id="${FILTER_ID}"`);
		expect(filter).toContain('x="0" y="0" width="800" height="600"');
		expect(filter).toContain('filterUnits="userSpaceOnUse"');
	});

	it('adds the two axis maps and takes the doubled neutral back out', () => {
		// 0.5 + 0.5 - 0.5 is 0.5: where both maps are neutral the sum stays
		// neutral, and a full push on one axis survives at full strength. Any
		// other k4 tints the whole window.
		expect(filterMarkup(sources)).toContain(
			'<feComposite in="mapX" in2="mapY" operator="arithmetic" k1="0" k2="1" k3="1" k4="-0.5" result="map"/>'
		);
	});

	it('splits the colour by displacing each channel at its own scale', () => {
		const filter = filterMarkup({
			...sources,
			material: { ...DEFAULTS, strength: 14, chromaticAberration: 2 }
		});

		expect(filter).toContain('scale="16"'); // red, strength + aberration
		expect(filter).toContain('scale="14"'); // green, the strength itself
		expect(filter).toContain('scale="12"'); // blue, strength - aberration
	});

	it('reads x from red and y from green on every pass', () => {
		const passes = filterMarkup(sources).match(/xChannelSelector="R" yChannelSelector="G"/g);

		expect(passes).toHaveLength(3);
	});

	it('clips the frost to the panes and leaves the refraction over everything', () => {
		const filter = filterMarkup({ ...sources, material: { ...DEFAULTS, blur: 13, saturate: 2 } });

		expect(filter).toContain('<feGaussianBlur in="refracted" stdDeviation="13" result="frosted"/>');
		expect(filter).toContain('type="saturate" values="2"');
		expect(filter).toContain('<feComposite in="rich" in2="shape" operator="in" result="pane"/>');
		expect(filter).toContain(
			'<feMerge><feMergeNode in="refracted"/><feMergeNode in="pane"/></feMerge>'
		);
	});

	it('takes its three sources in the order the passes expect them', () => {
		const filter = filterMarkup(sources);

		expect(filter.indexOf('x-map')).toBeLessThan(filter.indexOf('y-map'));
		expect(filter.indexOf('y-map')).toBeLessThan(filter.indexOf('shape-mask'));
	});
});

describe('the defaults', () => {
	it('keeps the aberration well under the strength, or the rim comes apart', () => {
		// The blue pass runs at `strength - chromaticAberration`. At or past the
		// strength it inverts, and the rim reads as a coloured ghost rather than
		// as a split.
		expect(DEFAULTS.chromaticAberration).toBeLessThan(DEFAULTS.strength / 2);
	});
});
