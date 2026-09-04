// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Multi-identity profiles store (FEAT-069).
 *
 * Manages reactive state for user identity profiles and their application
 * to local repositories or global configuration.
 */

import * as api from '../api';
import type { IdentityProfile } from '../types';

let list = $state<IdentityProfile[]>([]);
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);

let seq = 0;

export const profiles = {
	get list(): IdentityProfile[] {
		return list;
	},
	get loaded(): boolean {
		return loaded;
	},
	get loading(): boolean {
		return loading;
	},
	get error(): string | null {
		return error;
	},

	get count(): number {
		return list.length;
	},

	async fetch(): Promise<IdentityProfile[]> {
		const thisSeq = ++seq;
		loading = true;
		error = null;

		try {
			const result = await api.identityProfiles();
			if (thisSeq === seq) {
				list = result;
				loaded = true;
				loading = false;
			}
			return result;
		} catch (err) {
			if (thisSeq === seq) {
				error = err instanceof Error ? err.message : String(err);
				loading = false;
			}
			return [];
		}
	},

	async save(profile: IdentityProfile): Promise<void> {
		try {
			await api.saveIdentityProfile(profile);
			await this.fetch();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			throw err;
		}
	},

	async delete(id: string): Promise<void> {
		try {
			await api.deleteIdentityProfile(id);
			await this.fetch();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			throw err;
		}
	},

	async apply(profile: IdentityProfile, global = false): Promise<void> {
		try {
			await api.applyIdentityProfile(profile, global);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			throw err;
		}
	},

	reset(): void {
		list = [];
		loaded = false;
		loading = false;
		error = null;
		seq = 0;
	}
};
