// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import type { Dependency, IdentityValue } from '$lib/types';
import { describeLicense, describeOrigin, describeOverride, matching, undeclared } from './describe';

function value(overrides: Partial<IdentityValue> = {}): IdentityValue {
	return {
		effective: 'Ada Lovelace',
		origin: 'global',
		global: 'Ada Lovelace',
		local: null,
		...overrides
	};
}

function dependency(name: string, license: string | null = 'MIT'): Dependency {
	return { name, version: '1.0.0', license };
}

describe('describeOrigin', () => {
	it('says something specific for every origin', () => {
		const origins = ['unset', 'system', 'global', 'local', 'environment'] as const;
		const sentences = origins.map(describeOrigin);

		expect(new Set(sentences).size).toBe(origins.length);
		for (const sentence of sentences) expect(sentence.length).toBeGreaterThan(0);
	});

	it('names the two files Spagitty does not write', () => {
		// Why the effective value did not change is the question these answer.
		expect(describeOrigin('system')).toContain('does not write');
		expect(describeOrigin('environment')).toContain('does not write');
	});

	it('says an unset identity stops a commit rather than that it is empty', () => {
		expect(describeOrigin('unset')).toContain('refuses to commit');
	});
});

describe('describeOverride', () => {
	it('warns when the global field is being edited and the repository overrides it', () => {
		const warning = describeOverride(value({ origin: 'local', local: 'work' }), 'global');

		expect(warning).toContain('will not change');
	});

	it('says nothing when the repository scope is the one in effect and the one being edited', () => {
		expect(describeOverride(value({ origin: 'local' }), 'local')).toBeNull();
	});

	it('says nothing when the global scope is both in effect and being edited', () => {
		expect(describeOverride(value(), 'global')).toBeNull();
	});

	it('warns about a value coming from outside both writable files, in either scope', () => {
		for (const scope of ['global', 'local'] as const) {
			expect(describeOverride(value({ origin: 'system' }), scope)).toContain(
				'will not take effect'
			);
			expect(describeOverride(value({ origin: 'environment' }), scope)).toContain(
				'will not take effect'
			);
		}
	});

	it('does not warn about an identity nothing sets, which is not an override', () => {
		expect(
			describeOverride(value({ origin: 'unset', effective: null, global: null }), 'global')
		).toBeNull();
	});
});

describe('describeLicense', () => {
	it('passes an SPDX expression through as it is declared', () => {
		expect(describeLicense(dependency('gix', 'MIT OR Apache-2.0'))).toBe('MIT OR Apache-2.0');
	});

	it('says a package declares none rather than showing a blank', () => {
		// An incomplete list that looks complete is the worse failure.
		expect(describeLicense(dependency('mystery', null))).toBe('not declared');
	});
});

describe('undeclared', () => {
	it('counts only the packages with no license at all', () => {
		expect(undeclared([dependency('a'), dependency('b', null), dependency('c', null)])).toBe(2);
	});

	it('is zero for an empty list', () => {
		expect(undeclared([])).toBe(0);
	});
});

describe('matching', () => {
	const all = [dependency('gix', 'MIT OR Apache-2.0'), dependency('serde'), dependency('x', null)];

	it('is every dependency when the filter is empty or blank', () => {
		expect(matching(all, '')).toEqual(all);
		expect(matching(all, '   ')).toEqual(all);
	});

	it('matches on the package name, case insensitively', () => {
		expect(matching(all, 'GIX').map((d) => d.name)).toEqual(['gix']);
	});

	it('matches on the license, which is what an audit asks', () => {
		expect(matching(all, 'apache').map((d) => d.name)).toEqual(['gix']);
	});

	it('finds the packages that declare nothing by the words the screen shows', () => {
		expect(matching(all, 'not declared').map((d) => d.name)).toEqual(['x']);
	});

	it('is empty when nothing matches', () => {
		expect(matching(all, 'nothing-like-this')).toEqual([]);
	});
});
