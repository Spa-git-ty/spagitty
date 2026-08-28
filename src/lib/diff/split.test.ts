// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { splitRows } from './split';
import type { DiffLine } from '$lib/types';

function context(n: number, text = `line ${n}`): DiffLine {
	return { origin: 'context', old: n, new: n, text };
}

function removed(n: number, text = `old ${n}`): DiffLine {
	return { origin: 'removed', old: n, new: null, text };
}

function added(n: number, text = `new ${n}`): DiffLine {
	return { origin: 'added', old: null, new: n, text };
}

describe('splitRows', () => {
	it('returns nothing for no lines', () => {
		expect(splitRows([])).toEqual([]);
	});

	it('puts a context line in both columns', () => {
		const line = context(1);
		expect(splitRows([line])).toEqual([{ left: line, right: line }]);
	});

	it('pairs a removal with the addition that replaced it', () => {
		const before = removed(1);
		const after = added(1);
		expect(splitRows([before, after])).toEqual([{ left: before, right: after }]);
	});

	it('pairs runs row by row', () => {
		const lines = [removed(1), removed(2), added(1), added(2)];
		expect(splitRows(lines)).toEqual([
			{ left: lines[0], right: lines[2] },
			{ left: lines[1], right: lines[3] }
		]);
	});

	it('leaves blank cells opposite the tail of the longer run', () => {
		const lines = [removed(1), removed(2), removed(3), added(1)];
		const rows = splitRows(lines);
		expect(rows).toHaveLength(3);
		expect(rows[0]).toEqual({ left: lines[0], right: lines[3] });
		expect(rows[1]).toEqual({ left: lines[1], right: null });
		expect(rows[2]).toEqual({ left: lines[2], right: null });
	});

	it('leaves them on the left when the additions are longer', () => {
		const lines = [removed(1), added(1), added(2)];
		const rows = splitRows(lines);
		expect(rows[1]).toEqual({ left: null, right: lines[2] });
	});

	it('handles a pure addition, which has nothing to pair against', () => {
		const lines = [added(1), added(2)];
		expect(splitRows(lines)).toEqual([
			{ left: null, right: lines[0] },
			{ left: null, right: lines[1] }
		]);
	});

	it('flushes the pending run when context arrives', () => {
		// Without the flush, the second run's removals would pair against the
		// first run's additions and the two columns would drift apart.
		const lines = [removed(1), added(1), context(2), removed(3), added(3)];
		const rows = splitRows(lines);
		expect(rows).toHaveLength(3);
		expect(rows[0]).toEqual({ left: lines[0], right: lines[1] });
		expect(rows[1]).toEqual({ left: lines[2], right: lines[2] });
		expect(rows[2]).toEqual({ left: lines[3], right: lines[4] });
	});

	it('pairs additions with the removals before them, not after', () => {
		// git emits removals first within a run. An implementation that buffered
		// the other way round would pair each addition with the *next* removal.
		const lines = [removed(1, 'gone'), added(1, 'kept')];
		const [row] = splitRows(lines);
		expect(row.left?.text).toBe('gone');
		expect(row.right?.text).toBe('kept');
	});

	it('flushes a run left open at the end of a hunk', () => {
		const lines = [context(1), removed(2)];
		const rows = splitRows(lines);
		expect(rows).toHaveLength(2);
		expect(rows[1]).toEqual({ left: lines[1], right: null });
	});

	it('keeps every input line, in order, on the side it belongs to', () => {
		const lines = [context(1), removed(2), removed(3), added(2), context(4), added(5)];
		const rows = splitRows(lines);

		const left = rows.map((r) => r.left).filter((l): l is DiffLine => l !== null);
		const right = rows.map((r) => r.right).filter((l): l is DiffLine => l !== null);

		expect(left).toEqual(lines.filter((l) => l.origin !== 'added'));
		expect(right).toEqual(lines.filter((l) => l.origin !== 'removed'));
	});
});
