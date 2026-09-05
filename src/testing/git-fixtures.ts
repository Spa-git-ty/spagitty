// SPDX-License-Identifier: GPL-3.0-or-later
import type { Tag, Reflog, ReflogEntry } from '$lib/types';
import { control as repoControl } from './repo-store.svelte';
export function tag(name: string, overrides: Partial<Tag> = {}): Tag {
	return {
		name,
		target: 'a'.repeat(40),
		targetShort: 'aaaaaaa',
		annotated: true,
		message: `${name} released`,
		taggerName: 'Ada Lovelace',
		time: 1_800_000_000,
		summary: 'The tagged commit',
		...overrides
	};
}

export function openRepository() {
	repoControl.setInfo({
		path: '/repos/fixture',
		name: 'fixture',
		bare: false,
		head: { branch: 'main', detached: false, id: 'a'.repeat(40), short: 'aaaaaaa' },
		lastFetched: null
	});
}


export function entry(index: number, overrides: Partial<ReflogEntry> = {}): ReflogEntry {
	return {
		index,
		revision: `HEAD@{${index}}`,
		before: 'b'.repeat(40),
		beforeShort: 'bbbbbbb',
		after: 'a'.repeat(40),
		afterShort: 'aaaaaaa',
		created: false,
		authorName: 'Ada Lovelace',
		time: 1_800_000_000 - index,
		message: `commit: change ${index}`,
		operation: 'commit',
		...overrides
	};
}

export function log(overrides: Partial<Reflog> = {}): Reflog {
	return {
		reference: 'HEAD',
		entries: [entry(0), entry(1)],
		truncated: false,
		exists: true,
		...overrides
	};
}

