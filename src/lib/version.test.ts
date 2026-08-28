// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import { version } from './version';

/**
 * These are GPL-3 obligations rather than cosmetics: the license has to be
 * stated, and the build has to be identifiable so a user can obtain the
 * corresponding source. A typo here is a licensing defect, not a display bug.
 */
describe('version', () => {
	it('states the SPDX identifier, which is the authoritative one', () => {
		expect(version.license).toBe('GPL-3.0-or-later');
	});

	it('abbreviates for the title bar without changing which license it is', () => {
		expect(version.licenseShort).toBe('GPL-3.0');
		expect(version.license.startsWith(version.licenseShort)).toBe(true);
		expect(version.licenseShort.length).toBeLessThanOrEqual(8);
	});

	it('carries a semantic version number', () => {
		expect(version.number).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it('marks the commit as unknown until the backend supplies the real one', () => {
		// The fallback has to be visibly a fallback: a plausible-looking wrong
		// SHA would point at source that does not correspond to this build.
		expect(version.commit).toBe('unknown');
	});
});
