// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The half of the lens that needs a document (FEAT-057).
 *
 * `liquidGlassMaps.test.ts` covers the arithmetic. What is left here is the
 * behaviour that is not arithmetic at all, and every one of these is a way the
 * effect can take the interface down with it rather than merely look wrong:
 *
 * - **It must do nothing outside the application.** Every component test in
 *   this repository mounts a component with no shell around it. If the action
 *   reached for a filter target that is not there, or moved the node it is on,
 *   those tests would be testing a different DOM than the one that ships.
 * - **It must put the filter on the window and not on the pane.** WebKitGTK
 *   renders nothing for `backdrop-filter: url(...)`, which is the whole reason
 *   this module exists; a pane that kept its own frost would blur twice through
 *   a backdrop root that no longer resolves.
 * - **It must let go.** A filtered element is a composited layer and a
 *   containing block for its fixed descendants. Leaving an identity filter in
 *   place after the last pane closes pays for both, forever.
 *
 * The module keeps one filter for the whole window in module state, so each
 * test imports it fresh — `vi.resetModules()` and a dynamic import — rather
 * than inheriting the registry the previous test left behind.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** happy-dom has no layout, so every box would otherwise measure zero. */
function sized(node: HTMLElement, box: { x: number; y: number; w: number; h: number }) {
	node.getBoundingClientRect = () =>
		({
			left: box.x,
			top: box.y,
			right: box.x + box.w,
			bottom: box.y + box.h,
			width: box.w,
			height: box.h,
			x: box.x,
			y: box.y,
			toJSON: () => ({})
		}) as DOMRect;
}

/** A fresh copy of the module, with the window-wide registry empty. */
async function load() {
	vi.resetModules();
	return (await import('./liquidGlass')).liquidGlass;
}

/** The shell the action looks for, or nothing at all. */
function shell(withLens: boolean) {
	const app = document.createElement('div');
	app.className = 'app';
	document.body.appendChild(app);
	if (!withLens) return { app, lens: null };

	const lens = document.createElement('div');
	lens.className = 'lens';
	sized(lens, { x: 0, y: 0, w: 800, h: 600 });
	app.appendChild(lens);
	return { app, lens };
}

function pane(parent: HTMLElement, box = { x: 100, y: 50, w: 240, h: 180 }) {
	const node = document.createElement('div');
	node.className = 'menu';
	sized(node, box);
	parent.appendChild(node);
	return node;
}

/** The action schedules on a frame; this is how a test gets to the other side. */
function paint() {
	return new Promise((resolve) => requestAnimationFrame(resolve));
}

beforeEach(() => {
	// happy-dom ships neither observer, and the action wires both.
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		}
	);
	window.devicePixelRatio = 2;
});

afterEach(() => {
	document.body.innerHTML = '';
	vi.unstubAllGlobals();
});

describe('outside the application', () => {
	it('does nothing at all when there is no shell to refract', async () => {
		const liquidGlass = await load();
		const node = pane(document.body);

		const handle = liquidGlass(node, undefined);
		await paint();

		// The pane keeps the plain blur its stylesheet gives it, keeps its
		// place in the tree, and nothing is added to the document.
		expect(node.style.backdropFilter).toBe('');
		expect(node.parentElement).toBe(document.body);
		expect(document.querySelector('.liquid-glass-stage')).toBeNull();
		expect(document.querySelector('svg')).toBeNull();
		expect(handle?.destroy).toBeUndefined();
	});

	it('does not go looking for a lens that is outside the window either', async () => {
		const liquidGlass = await load();
		shell(false);
		const node = pane(document.body);

		liquidGlass(node, undefined);
		await paint();

		expect(document.querySelector('svg')).toBeNull();
	});
});

describe('inside the application', () => {
	it('filters the window, not the pane', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		const node = pane(lens!);

		liquidGlass(node, undefined);
		await paint();

		expect(lens!.style.filter).toBe('url(#liquid-glass-lens)');
		expect(node.style.filter).toBe('');
	});

	it('takes the frost off the pane, because the filter is doing it now', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		const node = pane(lens!);

		liquidGlass(node, undefined);
		await paint();

		expect(node.style.backdropFilter).toBe('none');
		expect(node.style.getPropertyValue('-webkit-backdrop-filter')).toBe('none');
	});

	it('moves a pane out of the subtree it is about to bend', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		const node = pane(lens!);

		liquidGlass(node, undefined);
		await paint();

		const stage = document.querySelector('.liquid-glass-stage');
		expect(node.parentElement).toBe(stage);
		// The stage spans the window and takes no clicks; what is on it does.
		expect(stage?.parentElement).toBe(document.body);
		expect(node.style.pointerEvents).toBe('auto');
	});

	it('leaves a pane that was already outside the lens where it is', async () => {
		// `DialogHost` is mounted beside the shell rather than inside it, so
		// moving it would take it out of the backdrop that centres it.
		const liquidGlass = await load();
		shell(true);
		const node = pane(document.body);

		liquidGlass(node, undefined);
		await paint();

		expect(node.parentElement).toBe(document.body);
		expect(document.querySelector('.liquid-glass-stage')).toBeNull();
	});

	it('builds the filter the maps describe, over the whole element', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		liquidGlass(pane(lens!), undefined);
		await paint();

		const filter = document.querySelector('svg')!.innerHTML;
		expect(filter).toContain('id="liquid-glass-lens"');
		// BUG-017: a fraction of the bounding box, never a pixel length — see
		// the note on `filterMarkup`.
		expect(filter).toContain('width="1" height="1"');
		expect(filter).toContain('filterUnits="objectBoundingBox"');
		// Three sources: both axis maps and the shape mask.
		expect(document.querySelectorAll('feImage')).toHaveLength(3);
	});

	it('authors the maps at the filtered element\'s size, in CSS pixels', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		liquidGlass(pane(lens!), undefined);
		await paint();

		const href = document.querySelector('feImage')!.getAttribute('href')!;
		const map = decodeURIComponent(href.replace('data:image/svg+xml;utf8,', ''));

		// The shell's `.lens` is 800 x 600, and the map says so — the region it
		// is stretched onto is what turns those into device pixels.
		expect(map).toContain('viewBox="0 0 800 600"');
		expect(map).not.toContain('transform="scale');
	});

	it('takes a portaled pane back off the stage when it is torn down', async () => {
		// The action moves a pane out of `.lens` and into a stage of its own. It
		// is Svelte that removes the node afterwards, but nothing asserted that
		// the move left it removable — and a pane left behind is a menu that
		// never disappears, with the next one drawn over it.
		const liquidGlass = await load();
		const { lens } = shell(true);
		const node = pane(lens!);
		const handle = liquidGlass(node, undefined);
		await paint();

		expect(document.querySelectorAll('.liquid-glass-stage > *')).toHaveLength(1);

		handle!.destroy!();
		node.remove();
		await paint();

		expect(document.querySelectorAll('.liquid-glass-stage > *')).toHaveLength(0);
	});

	it('hides its own host from the accessibility tree and from the pointer', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		liquidGlass(pane(lens!), undefined);
		await paint();

		const host = document.querySelector('svg')!;
		expect(host.getAttribute('aria-hidden')).toBe('true');
		expect(host.getAttribute('width')).toBe('0');
		expect((host as SVGSVGElement).style.pointerEvents).toBe('none');
	});
});

describe('two panes at once', () => {
	it('keeps one filter for the window rather than one each', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);

		liquidGlass(pane(lens!), undefined);
		liquidGlass(pane(document.body, { x: 300, y: 200, w: 320, h: 160 }), undefined);
		await paint();

		expect(document.querySelectorAll('svg')).toHaveLength(1);
		expect(document.querySelectorAll('filter')).toHaveLength(1);
	});

	it('gives every open pane a band of its own', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);

		liquidGlass(pane(lens!), undefined);
		liquidGlass(pane(document.body, { x: 300, y: 200, w: 320, h: 160 }), undefined);
		await paint();

		const source = document.querySelector('feImage')!.getAttribute('href')!;
		const map = decodeURIComponent(source.replace('data:image/svg+xml;utf8,', ''));
		expect(map).toContain('id="c0"');
		expect(map).toContain('id="c1"');
	});

	it('lets the thickest pane set the material for the pass', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);

		liquidGlass(pane(lens!), { strength: 6 });
		liquidGlass(pane(document.body, { x: 300, y: 200, w: 320, h: 160 }), { strength: 30 });
		await paint();

		expect(document.querySelector('svg')!.innerHTML).toContain('scale="30"');
	});
});

describe('letting go', () => {
	it('takes the filter off the window when the last pane closes', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		const handle = liquidGlass(pane(lens!), undefined);
		await paint();

		handle!.destroy!();
		await paint();

		expect(lens!.style.filter).toBe('');
		expect(document.querySelector('svg')).toBeNull();
	});

	it('keeps the filter while a second pane is still open', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		const first = liquidGlass(pane(lens!), undefined);
		liquidGlass(pane(document.body, { x: 300, y: 200, w: 320, h: 160 }), undefined);
		await paint();

		first!.destroy!();
		await paint();

		expect(lens!.style.filter).toBe('url(#liquid-glass-lens)');
	});

	it('rebuilds when a pane changes its material', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		const handle = liquidGlass(pane(lens!), { strength: 6 });
		await paint();
		expect(document.querySelector('svg')!.innerHTML).toContain('scale="6"');

		handle!.update!({ strength: 24 });
		await paint();

		expect(document.querySelector('svg')!.innerHTML).toContain('scale="24"');
	});

	it('stops listening to the window when it is torn down', async () => {
		const liquidGlass = await load();
		const { lens } = shell(true);
		const remove = vi.spyOn(window, 'removeEventListener');

		const handle = liquidGlass(pane(lens!), undefined);
		await paint();
		handle!.destroy!();

		expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
		remove.mockRestore();
	});
});

describe('a window with no size', () => {
	it('waits rather than building a filter over nothing', async () => {
		// The first frame after a window is created, and every frame while it is
		// minimised, measures zero. A filter built there covers no pixels and
		// would have to be rebuilt anyway.
		const liquidGlass = await load();
		const { lens } = shell(true);
		sized(lens!, { x: 0, y: 0, w: 0, h: 0 });

		liquidGlass(pane(lens!), undefined);
		await paint();

		expect(lens!.style.filter).toBe('');
		expect(document.querySelector('filter')).toBeNull();
	});
});
