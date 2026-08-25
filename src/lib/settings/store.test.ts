// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Identity, IdentityValue, Licenses, Settings } from '$lib/types';

vi.mock('$lib/api', () => ({
	inTauri: vi.fn(() => true),
	identity: vi.fn(),
	setIdentity: vi.fn(),
	settings: vi.fn(),
	setSettings: vi.fn(() => Promise.resolve()),
	signing: vi.fn(),
	setSigning: vi.fn(),
	clearSigning: vi.fn(),
	licenses: vi.fn(),
	about: vi.fn()
}));

import * as api from '$lib/api';
import { settings } from './store.svelte';

const identity = vi.mocked(api.identity);
const setIdentity = vi.mocked(api.setIdentity);
const settingsCall = vi.mocked(api.settings);
const signingCall = vi.mocked(api.signing);
const setSettings = vi.mocked(api.setSettings);
const licenses = vi.mocked(api.licenses);
const about = vi.mocked(api.about);
const inTauri = vi.mocked(api.inTauri);

function value(overrides: Partial<IdentityValue> = {}): IdentityValue {
	return { effective: null, origin: 'unset', global: null, local: null, ...overrides };
}

function anIdentity(overrides: Partial<Identity> = {}): Identity {
	return {
		name: value({ effective: 'Ada Lovelace', origin: 'global', global: 'Ada Lovelace' }),
		email: value({ effective: 'ada@example.com', origin: 'global', global: 'ada@example.com' }),
		repository: true,
		...overrides
	};
}

const STORED: Settings = {
	confirmHistoryRewrite: true,
	showGitCommands: false, pruneOnFetch: false
};

const LIST: Licenses = {
	generated: true,
	notes: [],
	rust: [{ name: 'gix', version: '0.86.0', license: 'MIT OR Apache-2.0' }],
	npm: [{ name: '@tauri-apps/api', version: '2.0.0', license: 'Apache-2.0 OR MIT' }]
};

beforeEach(() => {
	vi.clearAllMocks();
	settings.clearState();
	inTauri.mockReturnValue(true);
	identity.mockResolvedValue(anIdentity());
	settingsCall.mockResolvedValue(STORED);
	licenses.mockResolvedValue(LIST);
	about.mockResolvedValue({ version: '0.1.0', commit: 'abc1234', license: 'GPL-3.0-or-later' });
});

describe('load', () => {
	it('reads the identity, the toggles, the licenses and the build in one pass', async () => {
		await settings.load();

		expect(settings.identity).toEqual(anIdentity());
		expect(settings.settings).toEqual(STORED);
		expect(settings.licenses).toEqual(LIST);
		expect(settings.about?.commit).toBe('abc1234');
		expect(settings.loaded).toBe(true);
	});

	it('fills the fields from the scope being edited', async () => {
		await settings.load();

		expect(settings.draft('name')).toBe('Ada Lovelace');
		expect(settings.draft('email')).toBe('ada@example.com');
		expect(settings.isDirty('name')).toBe(false);
	});

	it('keeps About when the identity cannot be read, and says what failed', async () => {
		// The license and the commit are an obligation. A git configuration
		// Spagitty cannot parse must not take them off the screen.
		identity.mockRejectedValueOnce('could not read the git configuration: broken');
		await settings.load();

		expect(settings.error).toBe('could not read the git configuration: broken');
		expect(settings.about?.commit).toBe('abc1234');
		expect(settings.licenses).toEqual(LIST);
	});

	it('keeps the identity when the license list cannot be read', async () => {
		licenses.mockRejectedValueOnce('nope');
		await settings.load();

		expect(settings.identity).not.toBeNull();
		expect(settings.licenses).toBeNull();
		expect(settings.error).toBeNull();
	});

	it('asks for nothing outside the Tauri webview', async () => {
		inTauri.mockReturnValue(false);
		await settings.load();

		expect(identity).not.toHaveBeenCalled();
		expect(settings.loaded).toBe(true);
	});

	it('falls back to the global scope when no repository is open', async () => {
		identity.mockResolvedValue(anIdentity({ repository: false }));
		settings.setScope('global');
		await settings.load();

		expect(settings.canEditLocally).toBe(false);
		expect(settings.scope).toBe('global');
	});
});

describe('scope', () => {
	it('refuses the local scope when there is no repository to write to', async () => {
		identity.mockResolvedValue(anIdentity({ repository: false }));
		await settings.load();

		settings.setScope('local');

		expect(settings.scope).toBe('global');
	});

	it('refills the fields so a typed value cannot be saved into the other file', async () => {
		// The quiet mistake this screen exists to prevent: a name typed against
		// the global scope landing in a repository because a chip was flipped.
		identity.mockResolvedValue(
			anIdentity({
				email: value({
					effective: 'ada@work.example',
					origin: 'local',
					global: 'ada@example.com',
					local: 'ada@work.example'
				})
			})
		);
		await settings.load();
		settings.setDraft('email', 'typed@example.com');

		settings.setScope('local');

		expect(settings.draft('email')).toBe('ada@work.example');
		expect(settings.isDirty('email')).toBe(false);
	});

	it('shows an empty field for a scope that holds nothing', async () => {
		await settings.load();
		settings.setScope('local');

		expect(settings.draft('name')).toBe('');
	});
});

describe('saving an identity', () => {
	it('writes the field to the chosen scope and takes the result as the new state', async () => {
		await settings.load();
		const written = anIdentity({
			name: value({ effective: 'Grace Hopper', origin: 'global', global: 'Grace Hopper' })
		});
		setIdentity.mockResolvedValueOnce(written);

		settings.setDraft('name', 'Grace Hopper');
		await settings.save('name');

		expect(setIdentity).toHaveBeenCalledWith('global', 'name', 'Grace Hopper');
		expect(settings.identity).toEqual(written);
		expect(settings.draft('name')).toBe('Grace Hopper');
		expect(settings.isDirty('name')).toBe(false);
	});

	it('names the scope the user chose and never the other one', async () => {
		await settings.load();
		setIdentity.mockResolvedValueOnce(anIdentity());
		settings.setScope('local');

		settings.setDraft('email', 'ada@work.example');
		await settings.save('email');

		expect(setIdentity).toHaveBeenCalledWith('local', 'email', 'ada@work.example');
	});

	it('sends the empty string through, which is what unsets the key', async () => {
		await settings.load();
		setIdentity.mockResolvedValueOnce(anIdentity({ email: value() }));

		settings.clear('email');
		await settings.save('email');

		expect(setIdentity).toHaveBeenCalledWith('global', 'email', '');
	});

	it('records a failed write without losing what was typed', async () => {
		await settings.load();
		setIdentity.mockRejectedValueOnce('git config --global failed: read-only file system');

		settings.setDraft('name', 'Grace Hopper');
		await settings.save('name');

		expect(settings.writeError).toContain('read-only file system');
		expect(settings.draft('name')).toBe('Grace Hopper');
	});

	it('does not start a second write while one is running', async () => {
		await settings.load();
		let release!: (identity: Identity) => void;
		setIdentity.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));

		const first = settings.save('name');
		await settings.save('email');
		release(anIdentity());
		await first;

		expect(setIdentity).toHaveBeenCalledTimes(1);
	});
});

describe('behaviour toggles', () => {
	it('flips and stores the whole settings object', async () => {
		await settings.load();

		await settings.toggle('showGitCommands');

		expect(settings.settings.showGitCommands).toBe(true);
		expect(setSettings).toHaveBeenCalledWith({ ...STORED, showGitCommands: true });
	});

	it('puts the switch back when the write fails, and says why', async () => {
		// A toggle showing one state while another is stored is worse than one
		// that visibly refuses.
		await settings.load();
		setSettings.mockRejectedValueOnce('there is no configuration directory to write to');

		await settings.toggle('confirmHistoryRewrite');

		expect(settings.settings.confirmHistoryRewrite).toBe(true);
		expect(settings.writeError).toContain('no configuration directory');
	});

	it('asking before a history rewrite is on before anything is stored', () => {
		expect(settings.settings.confirmHistoryRewrite).toBe(true);
		expect(settings.settings.showGitCommands).toBe(false);
	});
});

describe('sections', () => {
	it('opens on You', () => {
		expect(settings.section).toBe('you');
	});

	it('follows a fragment, which is how Pull requests links to Accounts', () => {
		settings.showFromHash('#accounts');

		expect(settings.section).toBe('accounts');
	});

	it('ignores a fragment that names nothing, rather than blanking the screen', () => {
		settings.show('behaviour');
		settings.showFromHash('#nowhere');

		expect(settings.section).toBe('behaviour');
	});

	it('takes a fragment with no hash character', () => {
		settings.showFromHash('appearance');

		expect(settings.section).toBe('appearance');
	});

	/**
	 * The section was called `advanced` until it was renamed to `license`, which
	 * is what it had always actually held. A link written before the rename has
	 * to keep working — a fragment that silently selects nothing is worse than
	 * one that is simply wrong.
	 */
	it('still accepts the old #advanced fragment', () => {
		settings.showFromHash('#advanced');
		expect(settings.section).toBe('license');

		settings.show('you');
		settings.showFromHash('advanced');
		expect(settings.section).toBe('license');
	});
});
