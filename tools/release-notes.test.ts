// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The changelog-section extractor gate 6 and the prerelease workflow run
 * (TASK-025). What matters: the right section comes back without its heading,
 * a missing section and an empty section stay distinguishable, and the lookup
 * never matches a version mentioned anywhere but its own heading.
 */

import { describe, expect, it } from 'vitest';
import { sectionFor } from './release-notes.mjs';

const changelog = `# Changelog

All notable changes to Spagitty.

## [Unreleased]

### Added

- Pull request reviews.

## [0.1.0] - 2026-08-28

### Added

- The application. See [0.1.0].
- A mention of 0.2.0 in prose, which is not a heading.

### Fixed

- The first thing.

## [0.0.1] - 2026-08-01

### Added

- Nothing yet.
`;

describe('sectionFor', () => {
	it('returns a version section without its heading', () => {
		const section = sectionFor(changelog, '0.1.0');
		expect(section).toContain('- The application.');
		expect(section).toContain('- The first thing.');
		expect(section).not.toContain('## [0.1.0]');
	});

	it('stops at the next version heading', () => {
		expect(sectionFor(changelog, '0.1.0')).not.toContain('Nothing yet');
		expect(sectionFor(changelog, 'Unreleased')).not.toContain('The application');
	});

	it('reads the Unreleased section by its literal name', () => {
		expect(sectionFor(changelog, 'Unreleased')).toContain('- Pull request reviews.');
	});

	it('runs the last section to the end of the file', () => {
		expect(sectionFor(changelog, '0.0.1')).toBe('### Added\n\n- Nothing yet.');
	});

	it('answers null for a version with no section', () => {
		expect(sectionFor(changelog, '9.9.9')).toBeNull();
	});

	it('does not mistake a version named in prose for a section', () => {
		expect(sectionFor(changelog, '0.2.0')).toBeNull();
	});

	it('answers the empty string for a section that says nothing', () => {
		const empty = '## [1.0.0] - 2026-01-01\n\n\n## [0.9.0] - 2025-12-01\n\n- Something.\n';
		expect(sectionFor(empty, '1.0.0')).toBe('');
	});

	it('keeps subheadings inside the section', () => {
		expect(sectionFor(changelog, '0.1.0')).toContain('### Fixed');
	});
});
