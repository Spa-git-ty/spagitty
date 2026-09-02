// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The binary file panel (FEAT-065, covered under FEAT-072).
 *
 * A binary diff has no lines to show, so the whole value of the panel is the
 * arithmetic in its header: what it was, what it is, and which direction it
 * moved. Every branch of that arithmetic is a different sentence on screen,
 * which is why they are all tested here rather than sampled.
 */

import { describe, expect, it } from 'vitest';
import { render } from '../../testing/mount';
import type { BinaryDiff as BinaryDiffData } from '$lib/types';
import BinaryDiff from './BinaryDiff.svelte';

function aDiff(overrides: Partial<BinaryDiffData> = {}): BinaryDiffData {
	return {
		path: 'assets/logo.png',
		isImage: false,
		mime: 'application/octet-stream',
		oldSize: 1024,
		newSize: 2048,
		oldBase64: null,
		newBase64: null,
		...overrides
	};
}

/** The delta cell's text, which is the number this panel exists to show. */
function delta(view: ReturnType<typeof render>): string {
	return view.get('.delta .stat-val').textContent?.trim() ?? '';
}

describe('sizes are said in units a person reads', () => {
	it('gives bytes below a kilobyte', () => {
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: 512, newSize: 900 }) });
		expect(view.text()).toContain('512 B');
		view.destroy();
	});

	it('gives kilobytes to one decimal place', () => {
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: 1536, newSize: 1536 }) });
		expect(view.text()).toContain('1.5 KB');
		view.destroy();
	});

	it('gives megabytes to two, because the third place is noise at that size', () => {
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: 5 * 1024 * 1024, newSize: null }) });
		expect(view.text()).toContain('5.00 MB');
		view.destroy();
	});

	it('reads an absent size as nothing rather than leaving the cell blank', () => {
		// A file that did not exist has a size, and it is zero.
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: null, newSize: 100 }) });
		expect(view.all('.stat-val')[0].textContent?.trim()).toBe('0 B');
		view.destroy();
	});
});

describe('the delta says which way the file went', () => {
	it('a new file is its whole size, added', () => {
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: null, newSize: 2048 }) });

		expect(delta(view)).toBe('+2.0 KB');
		expect(view.get('.delta').classList.contains('added')).toBe(true);

		view.destroy();
	});

	it('a deleted file is its whole size, removed', () => {
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: 2048, newSize: null }) });

		expect(delta(view)).toBe('-2.0 KB');
		expect(view.get('.delta').classList.contains('removed')).toBe(true);

		view.destroy();
	});

	it('a file that grew is the difference, not the new size', () => {
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: 1024, newSize: 3072 }) });

		expect(delta(view)).toBe('+2.0 KB');

		view.destroy();
	});

	it('a file that shrank is the difference, as a positive number with a minus', () => {
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: 3072, newSize: 1024 }) });

		expect(delta(view)).toBe('-2.0 KB');
		expect(view.get('.delta').classList.contains('removed')).toBe(true);

		view.destroy();
	});

	it('a file whose bytes changed but whose size did not is neither', () => {
		// The common case for a re-encoded image, and it must not be drawn as
		// an addition just because something happened.
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: 2048, newSize: 2048 }) });

		expect(delta(view)).toBe('0 B');
		expect(view.get('.delta').classList.contains('added')).toBe(false);
		expect(view.get('.delta').classList.contains('removed')).toBe(false);

		view.destroy();
	});

	it('a file with no size on either side claims no change', () => {
		const view = render(BinaryDiff, { diff: aDiff({ oldSize: null, newSize: null }) });

		expect(delta(view)).toBe('0 B');

		view.destroy();
	});
});

describe('what else the panel has to say', () => {
	it('names the file and its type, because neither is guessable from a size', () => {
		const view = render(BinaryDiff, {
			diff: aDiff({ path: 'docs/spec.pdf', mime: 'application/pdf' })
		});

		expect(view.text()).toContain('docs/spec.pdf');
		expect(view.text()).toContain('application/pdf');

		view.destroy();
	});

	it('is labelled for a screen reader, which cannot see the icon', () => {
		const view = render(BinaryDiff, { diff: aDiff() });

		expect(view.get('[aria-label]').getAttribute('aria-label')).toBe('Binary diff metadata');

		view.destroy();
	});
});
