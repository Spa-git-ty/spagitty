// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The tree must mean the same thing on a case-insensitive filesystem.
 *
 * Linux is case-sensitive; Windows is not, and neither is macOS by default. A
 * repository that only builds on the first is a repository that builds on one
 * of its three targets, and the failure arrives in CI on a Windows runner
 * rather than on the machine the code was written on.
 *
 * BUG-010 is why this exists. `src/lib/ui/Notice.svelte` (the component) sat
 * beside `src/lib/ui/notice.svelte.ts` (the rune store it reads). Importing
 * `$lib/ui/notice.svelte` resolves by trying the path itself and then the same
 * path with each resolvable extension appended — so on Linux it found
 * `notice.svelte.ts`, and on Windows it found `Notice.svelte` first, case
 * folded. The component imported itself, and the Windows build failed with
 * `"notice" is not exported by "src/lib/ui/Notice.svelte"`.
 *
 * Neither check below is about style. Both are about the tree resolving to the
 * same files everywhere it is built.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ROOTS = ['src', 'tools'];

/** Extensions a bare import may have appended to it during resolution. */
const RESOLVABLE = ['.ts', '.js', '.mjs', '.cjs', '.tsx', '.jsx'];

function walk(directory: string, found: string[] = []): string[] {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
			walk(path, found);
		} else {
			found.push(path);
		}
	}
	return found;
}

const FILES = ROOTS.flatMap((root) => walk(join(ROOT, root))).map((path) =>
	relative(ROOT, path).split('\\').join('/')
);

describe('the tree on a case-insensitive filesystem', () => {
	it('has no two files whose paths differ only by case', () => {
		const byFolded = new Map<string, string[]>();
		for (const path of FILES) {
			const folded = path.toLowerCase();
			byFolded.set(folded, [...(byFolded.get(folded) ?? []), path]);
		}

		const collisions = [...byFolded.values()].filter((paths) => paths.length > 1);

		expect(collisions, 'these files are one file on Windows and macOS').toEqual([]);
	});

	it('has no file that shadows another during import resolution', () => {
		// The BUG-010 shape. `a/x.svelte.ts` is reached by importing
		// `a/x.svelte`, so a sibling named `a/X.svelte` answers that import
		// first wherever case is folded — and it is a different file.
		const folded = new Set(FILES.map((path) => path.toLowerCase()));

		const shadowed = FILES.filter((path) =>
			RESOLVABLE.some((extension) => {
				if (!path.endsWith(extension)) return false;
				const withoutExtension = path.slice(0, -extension.length).toLowerCase();
				// Something else already occupies the name this file is reached by.
				return folded.has(withoutExtension);
			})
		);

		expect(
			shadowed,
			'each of these is reached by an import that another file answers first when case is folded'
		).toEqual([]);
	});
});
