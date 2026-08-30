// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Multi-identity profiles store tests (FEAT-069).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdentityProfile } from '$lib/types';

vi.mock('$lib/api', () => ({
	identityProfiles: vi.fn(),
	saveIdentityProfile: vi.fn(),
	deleteIdentityProfile: vi.fn(),
	applyIdentityProfile: vi.fn()
}));

import * as api from '$lib/api';
import { profiles } from './store.svelte';

const apiProfiles = vi.mocked(api.identityProfiles);
const apiSave = vi.mocked(api.saveIdentityProfile);
const apiDelete = vi.mocked(api.deleteIdentityProfile);
const apiApply = vi.mocked(api.applyIdentityProfile);

beforeEach(() => {
	vi.clearAllMocks();
	profiles.reset();
});

describe('profiles store', () => {
	it('starts empty', () => {
		expect(profiles.list).toEqual([]);
		expect(profiles.loaded).toBe(false);
		expect(profiles.loading).toBe(false);
		expect(profiles.count).toBe(0);
	});

	it('fetches profiles list', async () => {
		const sample: IdentityProfile = {
			id: 'work',
			name: 'Work Profile',
			authorName: 'Ada Lovelace',
			authorEmail: 'ada@work.invalid',
			signingKey: 'GPG-12345'
		};
		apiProfiles.mockResolvedValueOnce([sample]);

		const result = await profiles.fetch();
		expect(result).toHaveLength(1);
		expect(profiles.list).toEqual([sample]);
		expect(profiles.count).toBe(1);
		expect(profiles.loaded).toBe(true);
	});

	it('saves a profile and refreshes', async () => {
		const sample: IdentityProfile = {
			id: 'personal',
			name: 'Personal',
			authorName: 'Ada Lovelace',
			authorEmail: 'ada@home.invalid',
			signingKey: null
		};
		apiSave.mockResolvedValueOnce();
		apiProfiles.mockResolvedValueOnce([sample]);

		await profiles.save(sample);
		expect(apiSave).toHaveBeenCalledWith(sample);
		expect(apiProfiles).toHaveBeenCalled();
	});

	it('deletes a profile by id', async () => {
		apiDelete.mockResolvedValueOnce();
		apiProfiles.mockResolvedValueOnce([]);

		await profiles.delete('work');
		expect(apiDelete).toHaveBeenCalledWith('work');
		expect(apiProfiles).toHaveBeenCalled();
	});

	it('applies a profile to repository scope', async () => {
		const sample: IdentityProfile = {
			id: 'work',
			name: 'Work Profile',
			authorName: 'Ada Lovelace',
			authorEmail: 'ada@work.invalid',
			signingKey: null
		};
		apiApply.mockResolvedValueOnce({
			name: { effective: 'Ada Lovelace', origin: 'local', global: null, local: 'Ada Lovelace' },
			email: { effective: 'ada@work.invalid', origin: 'local', global: null, local: 'ada@work.invalid' },
			repository: true
		});

		await profiles.apply(sample, false);
		expect(apiApply).toHaveBeenCalledWith(sample, false);
	});
});
