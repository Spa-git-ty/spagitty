// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The Settings screen's state.
 *
 * Three unrelated things live behind one screen, and they are kept apart here
 * because they are stored in three different places: the identity is git's own
 * configuration, the toggles are Spagitty's preferences file, and the build
 * identity and license list are compiled in. A failure in one must not blank the
 * others — About in particular, since the license and the commit are an
 * obligation rather than a convenience.
 *
 * Nothing here needs an open repository. Without one the local scope is neither
 * offered nor written, and every other section is unaffected.
 */

import * as api from '../api';
import type { About, Identity, IdentityKey, IdentityScope, Licenses, Settings } from '../types';

export type Section = 'you' | 'accounts' | 'behaviour' | 'appearance' | 'license';

/** The chip index, in the order it is shown. */
export const SECTIONS: { id: Section; label: string }[] = [
	{ id: 'you', label: 'You' },
	{ id: 'accounts', label: 'Accounts' },
	{ id: 'behaviour', label: 'Behaviour' },
	{ id: 'appearance', label: 'Appearance' },
	{ id: 'license', label: 'License' }
];

/**
 * What the toggles are before the first read resolves, and in a plain browser.
 *
 * These mirror `Default for Settings` in `src-tauri/src/settings.rs`, which is
 * the authority: every value the screen shows after `load()` came from there.
 * They exist so the first frame is not blank, not as a second definition.
 */
const DEFAULTS: Settings = {
	signCommits: false,
	confirmHistoryRewrite: true,
	showGitCommands: false
};

function isSection(value: string): value is Section {
	return SECTIONS.some((section) => section.id === value);
}

let section = $state<Section>('you');
let identity = $state<Identity | null>(null);
let scope = $state<IdentityScope>('global');
let drafts = $state<Record<IdentityKey, string>>({ name: '', email: '' });
let stored = $state<Settings>(DEFAULTS);
let licenses = $state<Licenses | null>(null);
let about = $state<About | null>(null);
let loaded = $state(false);
let busy = $state(false);
/** What the last read failed with. */
let error = $state<string | null>(null);
/**
 * What the last write failed with, kept apart from `error`.
 *
 * Every write is followed by a re-read, and a successful re-read clears
 * `error` — so a failure recorded there would be wiped by the very reload that
 * was meant to report it.
 */
let writeError = $state<string | null>(null);

/** The value the chosen scope holds for `key`, which is what the field edits. */
function storedValue(key: IdentityKey): string {
	const value = identity?.[key];
	if (!value) return '';
	return (scope === 'local' ? value.local : value.global) ?? '';
}

/** Put both fields back to what the chosen scope holds. */
function resetDrafts(): void {
	drafts = { name: storedValue('name'), email: storedValue('email') };
}

export const settings = {
	get section(): Section {
		return section;
	},
	get identity(): Identity | null {
		return identity;
	},
	get scope(): IdentityScope {
		return scope;
	},
	get settings(): Settings {
		return stored;
	},
	get licenses(): Licenses | null {
		return licenses;
	},
	get about(): About | null {
		return about;
	},
	get loaded(): boolean {
		return loaded;
	},
	get busy(): boolean {
		return busy;
	},
	get error(): string | null {
		return error;
	},
	get writeError(): string | null {
		return writeError;
	},

	/** False when no repository is open, so the local scope cannot be chosen. */
	get canEditLocally(): boolean {
		return identity?.repository ?? false;
	},

	draft(key: IdentityKey): string {
		return drafts[key];
	},

	/** True when the field differs from what the chosen scope holds. */
	isDirty(key: IdentityKey): boolean {
		return drafts[key].trim() !== storedValue(key).trim();
	},

	show(next: Section): void {
		section = next;
	},

	/** Select a section from a URL fragment, ignoring anything unrecognised. */
	showFromHash(hash: string): void {
		const name = hash.replace(/^#/, '');
		// `advanced` was this section's name until it was renamed to `license`,
		// which is what it had always actually held. A link written before the
		// rename still lands somewhere sane rather than silently doing nothing.
		if (name === 'advanced') {
			section = 'license';
			return;
		}
		if (isSection(name)) section = name;
	},

	/**
	 * Choose which file the fields edit.
	 *
	 * The drafts follow, because a name typed against the global scope must not
	 * be saved into a repository by flipping a chip.
	 */
	setScope(next: IdentityScope): void {
		if (next === 'local' && !this.canEditLocally) return;
		scope = next;
		resetDrafts();
	},

	setDraft(key: IdentityKey, value: string): void {
		drafts = { ...drafts, [key]: value };
	},

	/** Everything the screen shows, read in parallel so one failure is one section. */
	async load(): Promise<void> {
		if (!api.inTauri()) {
			loaded = true;
			return;
		}
		busy = true;
		try {
			const [read, toggles, list, build] = await Promise.allSettled([
				api.identity(),
				api.settings(),
				api.licenses(),
				api.about()
			]);

			if (read.status === 'fulfilled') {
				identity = read.value;
				if (!identity.repository && scope === 'local') scope = 'global';
				resetDrafts();
				error = null;
			} else {
				error = String(read.reason);
			}
			if (toggles.status === 'fulfilled') stored = toggles.value;
			if (list.status === 'fulfilled') licenses = list.value;
			if (build.status === 'fulfilled') about = build.value;

			loaded = true;
		} finally {
			busy = false;
		}
	},

	/**
	 * Write one field to the chosen scope.
	 *
	 * An empty field unsets the key rather than storing an empty string: an
	 * empty `user.email` is a configured empty email, which git will commit
	 * with, while an unset one falls back to the next scope.
	 */
	async save(key: IdentityKey): Promise<void> {
		if (busy) return;
		busy = true;
		writeError = null;
		try {
			identity = await api.setIdentity(scope, key, drafts[key]);
			resetDrafts();
		} catch (e) {
			writeError = String(e);
		} finally {
			busy = false;
		}
	},

	/** Empty a field. Nothing is written until it is saved. */
	clear(key: IdentityKey): void {
		this.setDraft(key, '');
	},

	/**
	 * Flip a toggle and store it.
	 *
	 * Optimistic, and put back if the write fails: a toggle that shows one state
	 * and stored another is worse than one that visibly refuses.
	 */
	async toggle(key: keyof Settings): Promise<void> {
		if (busy) return;
		const previous = stored;
		stored = { ...stored, [key]: !stored[key] };
		busy = true;
		writeError = null;
		try {
			await api.setSettings(stored);
		} catch (e) {
			stored = previous;
			writeError = String(e);
		} finally {
			busy = false;
		}
	},

	clearState(): void {
		section = 'you';
		identity = null;
		scope = 'global';
		drafts = { name: '', email: '' };
		stored = DEFAULTS;
		licenses = null;
		about = null;
		loaded = false;
		busy = false;
		error = null;
		writeError = null;
	}
};
