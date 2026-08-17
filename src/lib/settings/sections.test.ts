// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, flushSync, render } from '../../testing/mount';
import type { Identity, IdentityValue, Licenses } from '$lib/types';

vi.mock('$lib/api', () => ({
	inTauri: vi.fn(() => true),
	identity: vi.fn(),
	setIdentity: vi.fn(),
	settings: vi.fn(),
	setSettings: vi.fn(() => Promise.resolve()),
	licenses: vi.fn(),
	about: vi.fn()
}));

import * as api from '$lib/api';
import { theme } from '$lib/theme.svelte';
import { FAMILIES, paletteOf } from '$lib/themes';
import AccountsSection from './AccountsSection.svelte';
import AdvancedSection from './AdvancedSection.svelte';
import AppearanceSection from './AppearanceSection.svelte';
import BehaviourSection from './BehaviourSection.svelte';
import IdentitySection from './IdentitySection.svelte';
import { settings } from './store.svelte';

const identity = vi.mocked(api.identity);
const setIdentity = vi.mocked(api.setIdentity);
const settingsCall = vi.mocked(api.settings);
const setSettings = vi.mocked(api.setSettings);
const licenses = vi.mocked(api.licenses);
const about = vi.mocked(api.about);

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

const LIST: Licenses = {
	generated: true,
	notes: [],
	rust: [
		{ name: 'gix', version: '0.86.0', license: 'MIT OR Apache-2.0' },
		{ name: 'mystery', version: '1.0.0', license: null }
	],
	npm: [{ name: '@tauri-apps/api', version: '2.0.0', license: 'Apache-2.0 OR MIT' }]
};

/** Type into a field the way the component listens for it. */
function type(input: HTMLElement, text: string): void {
	(input as HTMLInputElement).value = text;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

beforeEach(async () => {
	vi.clearAllMocks();
	settings.clearState();
	identity.mockResolvedValue(anIdentity());
	settingsCall.mockResolvedValue({
		signCommits: false,
		confirmHistoryRewrite: true,
		showGitCommands: false
	});
	licenses.mockResolvedValue(LIST);
	about.mockResolvedValue({ version: '0.1.0', commit: 'abc1234', license: 'GPL-3.0-or-later' });
	theme.setFamily('catppuccin');
	theme.setMode('light');
});

describe('IdentitySection', () => {
	it('shows each value and which file it is coming from', async () => {
		await settings.load();
		const mounted = render(IdentitySection, {});

		expect(mounted.text()).toContain('Ada Lovelace');
		expect(mounted.text()).toContain('From your global configuration.');

		mounted.destroy();
	});

	it('cannot save until the field differs from what is stored', async () => {
		await settings.load();
		const mounted = render(IdentitySection, {});
		const save = mounted.all('button').find((button) => button.textContent?.includes('Save'));

		expect((save as HTMLButtonElement).disabled).toBe(true);
		type(mounted.get('#identity-name'), 'Grace Hopper');
		expect((save as HTMLButtonElement).disabled).toBe(false);

		mounted.destroy();
	});

	it('writes the field to the scope the chips say is being edited', async () => {
		await settings.load();
		setIdentity.mockResolvedValue(anIdentity());
		const mounted = render(IdentitySection, {});

		type(mounted.get('#identity-email'), 'grace@example.com');
		const save = mounted
			.all('button')
			.filter((button) => button.textContent?.includes('Save'))[1];
		click(save);

		expect(setIdentity).toHaveBeenCalledWith('global', 'email', 'grace@example.com');
		mounted.destroy();
	});

	it('says why the repository scope is not on offer with no repository open', async () => {
		identity.mockResolvedValue(anIdentity({ repository: false }));
		await settings.load();
		const mounted = render(IdentitySection, {});

		expect(mounted.text()).toContain('No repository is open');

		mounted.destroy();
	});

	it('warns that a repository override is what will actually be committed with', async () => {
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
		const mounted = render(IdentitySection, {});

		expect(mounted.text()).toContain('This repository sets its own');

		mounted.destroy();
	});
});

describe('BehaviourSection', () => {
	it('says which item will make each toggle take effect', async () => {
		// A switch that silently does nothing is worse than one that says it is
		// waiting on something.
		await settings.load();
		const mounted = render(BehaviourSection, {});

		expect(mounted.text()).toContain('Persisted, not yet honoured');
		expect(mounted.text()).toContain('FEAT-015');

		mounted.destroy();
	});

	it('stores the whole settings object when a toggle is flipped', async () => {
		await settings.load();
		const mounted = render(BehaviourSection, {});

		click(mounted.all('button.chip')[0]);

		expect(setSettings).toHaveBeenCalledWith({
			signCommits: true,
			confirmHistoryRewrite: true,
			showGitCommands: false
		});
		mounted.destroy();
	});

	it('shows the stored state of every toggle', async () => {
		settingsCall.mockResolvedValue({
			signCommits: true,
			confirmHistoryRewrite: false,
			showGitCommands: true
		});
		await settings.load();
		const mounted = render(BehaviourSection, {});

		expect(mounted.all('button.chip').map((chip) => chip.textContent?.trim())).toEqual([
			'on',
			'off',
			'on'
		]);
		mounted.destroy();
	});
});

describe('AppearanceSection', () => {
	it('marks the mode in use and switches to the other one', () => {
		const mounted = render(AppearanceSection, {});

		const [light, dark] = mounted.all('button.chip');
		expect(light.classList.contains('active')).toBe(true);

		click(dark);
		expect(theme.mode).toBe('dark');

		mounted.destroy();
	});

	it('offers every family, marking the one in use', () => {
		const mounted = render(AppearanceSection, {});

		const families = mounted.all('.family');
		expect(families).toHaveLength(FAMILIES.length);
		expect(families[0].classList.contains('active')).toBe(true);
		expect(mounted.text()).toContain('Gruvbox');

		mounted.destroy();
	});

	it('applies a family when it is chosen', () => {
		const mounted = render(AppearanceSection, {});

		click(mounted.all('.family')[1]);

		expect(theme.family).toBe('dracula');
		expect(document.documentElement.style.getPropertyValue('--bg')).toBe(
			paletteOf('dracula', theme.mode).bg
		);

		mounted.destroy();
	});

	it('names each family the way that family names the variant in use', () => {
		// "Mocha" says more to somebody who chose Catppuccin than "dark" does,
		// and the name follows the mode: Latte and Alucard in light, Mocha and
		// Dracula in dark.
		const light = render(AppearanceSection, {});
		expect(light.text()).toContain('Latte');
		expect(light.text()).toContain('Alucard');
		light.destroy();

		theme.setMode('dark');
		const dark = render(AppearanceSection, {});
		expect(dark.text()).toContain('Mocha');
		expect(dark.text()).not.toContain('Alucard');
		dark.destroy();
	});

	it('shows each family in the mode that is on, not in the other one', () => {
		// A light preview of a theme about to be used in the dark is a preview
		// of something the user will never see.
		theme.setMode('dark');
		const mounted = render(AppearanceSection, {});

		const first = mounted.all('.family')[0].querySelector('.chip-colour') as HTMLElement;
		expect(first.style.background).toBe(paletteOf('catppuccin', 'dark').bg);

		mounted.destroy();
	});
});

describe('AccountsSection', () => {
	it('says no account is connected and which item connects one', () => {
		const mounted = render(AccountsSection, {});

		expect(mounted.text()).toContain('No account is connected');
		expect(mounted.text()).toContain('FEAT-017');

		mounted.destroy();
	});
});

describe('AdvancedSection', () => {
	it('keeps everything the About footer carried', async () => {
		// The GPL-3 obligations predate this screen and must not regress while
		// it is rebuilt.
		await settings.load();
		const mounted = render(AdvancedSection, {});
		const text = mounted.text();

		expect(text).toContain('GitLumiere v0.1.0');
		expect(text).toContain('abc1234');
		expect(text).toContain('GPL-3.0-or-later');
		expect(text).toContain('Software Freedom Conservancy');

		mounted.destroy();
	});

	it('lists both trees and names a package that declares nothing', async () => {
		await settings.load();
		const mounted = render(AdvancedSection, {});
		const text = mounted.text();

		expect(text).toContain('gix');
		expect(text).toContain('@tauri-apps/api');
		expect(text).toContain('not declared');

		mounted.destroy();
	});

	it('filters both lists by package or license', async () => {
		await settings.load();
		const mounted = render(AdvancedSection, {});

		type(mounted.get('input'), 'gix');

		expect(mounted.all('.entry').length).toBe(1);
		expect(mounted.text()).toContain('gix');

		mounted.destroy();
	});

	it('says the list was not generated instead of showing an empty one', async () => {
		// An empty list reads as "no dependencies", which would be a false claim
		// about what the binary is made of.
		licenses.mockResolvedValue({
			generated: false,
			notes: ['The Rust dependency list was not generated: cargo metadata failed.'],
			rust: [],
			npm: []
		});
		await settings.load();
		const mounted = render(AdvancedSection, {});

		expect(mounted.text()).toContain('did not generate a dependency license list');
		expect(mounted.text()).toContain('cargo metadata failed');
		expect(mounted.all('.entry').length).toBe(0);

		mounted.destroy();
	});

	it('still shows the version and the commit when the list is missing', async () => {
		licenses.mockResolvedValue({ generated: false, notes: [], rust: [], npm: [] });
		await settings.load();
		const mounted = render(AdvancedSection, {});

		expect(mounted.text()).toContain('abc1234');
		expect(mounted.text()).toContain('GPL-3.0-or-later');

		mounted.destroy();
	});
});
