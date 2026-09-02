// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Spagitty's palettes.
 *
 * Four families, each with a light and a dark variant. They are **data**, not
 * stylesheets: eight `:root[data-theme=…]` blocks would be the same eleven
 * tokens written eight times with no way to test them, so the table lives here
 * and `theme.svelte.ts` applies the chosen palette to the root element as
 * custom properties — the same mechanism `panels.svelte.ts` and `metrics.ts`
 * already use for the structural tokens.
 *
 * The keys are the token names in `src/app.css` with the `--` dropped. Nothing
 * else in the application has to learn a new name, and no component carries a
 * colour of its own.
 *
 * **The palettes are the published ones**, not approximations: Catppuccin
 * Latte and Mocha, Dracula and its official light counterpart Alucard, Tokyo
 * Night Day and Tokyo Night, and Gruvbox light and dark. Where a token has no
 * direct equivalent — `line`, `soft`, `stripe`, `selection`, `placeholder` —
 * it is derived from that palette's own foreground and accent at a fixed
 * opacity, so the family stays internally consistent rather than borrowing a
 * neutral from somewhere else.
 */

export type Mode = 'light' | 'dark';

export type FamilyId = 'catppuccin' | 'dracula' | 'tokyo-night' | 'gruvbox';

/**
 * One complete set of colour tokens.
 *
 * Every field is required. A palette that leaves one out would fall through to
 * whatever the previous theme had set, which is how a half-applied theme
 * happens — and it is exactly the kind of thing nobody notices until a screen
 * they rarely open looks wrong.
 */
export interface Palette {
	bg: string;
	panel: string;
	ink: string;
	muted: string;
	line: string;
	soft: string;
	placeholder: string;
	accent: string;
	/** Text on top of a filled accent surface. Contrast-checked against it. */
	onAccent: string;
	/**
	 * What a result means, in this family's own colours.
	 *
	 * Before these existed, anything that had to read as "not routine" borrowed
	 * `lanes[2]` — the graph's third lane, which is red in Latte, pink in
	 * Mocha and cyan in Dracula. A delete button that turns cyan is not a
	 * delete button. Checked against the background at 3:1 like the accent.
	 */
	danger: string;
	warn: string;
	ok: string;
	selection: string;
	stripe: string;
	/** The lane colour cycle. Five, because a sixth lane reuses the first. */
	lanes: [string, string, string, string, string];
}

export interface Variant {
	/** What this family calls it — "Latte", "Mocha", "Alucard". */
	name: string;
	palette: Palette;
}

export interface Family {
	id: FamilyId;
	name: string;
	light: Variant;
	dark: Variant;
}

/** Catppuccin Latte. */
const LATTE: Palette = {
	bg: '#eff1f5',
	panel: '#e6e9ef',
	ink: '#4c4f69',
	muted: 'rgba(76, 79, 105, 0.72)',
	line: 'rgba(76, 79, 105, 0.26)',
	soft: 'rgba(76, 79, 105, 0.12)',
	placeholder: 'rgba(76, 79, 105, 0.3)',
	// The app's accent is the brand amber (#EEB04D) darkened for light
	// surfaces, so the identity runs through the UI as well as the icon.
	accent: '#976317',
	onAccent: '#ffffff',
	danger: '#d20f39',
	// Latte's own yellow is #df8e1d, which sits at 2.3:1 on its background —
	// the same problem its pink and peach have as lane colours. Darkened along
	// its own hue until a warning can be seen on both bg and panel.
	warn: '#bc6a00',
	// Latte's green, darkened for the same reason and to the same shade its
	// fifth lane already uses — one green in this palette, not two.
	ok: '#2e7d1f',
	selection: 'rgba(151, 99, 23, 0.14)',
	stripe: 'rgba(76, 79, 105, 0.05)',
	// Latte's pink, peach and yellow sit at 2.3–2.6:1 on its own background —
	// invisible as a one-pixel lane. Blue, mauve, red and teal are Latte's own;
	// the green is Latte's darkened until it clears 3:1.
	lanes: ['#1e66f5', '#8839ef', '#d20f39', '#179299', '#2e7d1f']
};

/** Catppuccin Mocha. */
const MOCHA: Palette = {
	bg: '#1e1e2e',
	panel: '#181825',
	ink: '#cdd6f4',
	muted: 'rgba(205, 214, 244, 0.6)',
	line: 'rgba(205, 214, 244, 0.24)',
	soft: 'rgba(205, 214, 244, 0.11)',
	placeholder: 'rgba(205, 214, 244, 0.26)',
	accent: '#eeb04d',
	onAccent: '#1e1e2e',
	danger: '#f38ba8',
	warn: '#f9e2af',
	ok: '#a6e3a1',
	selection: 'rgba(238, 176, 77, 0.18)',
	stripe: 'rgba(205, 214, 244, 0.05)',
	lanes: ['#89b4fa', '#cba6f7', '#f5c2e7', '#fab387', '#a6e3a1']
};

/** Dracula's official light counterpart, Alucard. */
const ALUCARD: Palette = {
	bg: '#fffbeb',
	panel: '#f5f2e4',
	ink: '#1f1f1f',
	muted: 'rgba(31, 31, 31, 0.6)',
	line: 'rgba(31, 31, 31, 0.24)',
	soft: 'rgba(31, 31, 31, 0.1)',
	placeholder: 'rgba(31, 31, 31, 0.28)',
	accent: '#976317',
	onAccent: '#fffbeb',
	danger: '#cb3a2a',
	warn: '#a34d14',
	ok: '#14710a',
	selection: 'rgba(151, 99, 23, 0.14)',
	stripe: 'rgba(31, 31, 31, 0.045)',
	lanes: ['#644ac9', '#a3144d', '#cf6a00', '#14710a', '#036a96']
};

/** Dracula. */
const DRACULA: Palette = {
	bg: '#282a36',
	panel: '#21222c',
	ink: '#f8f8f2',
	muted: 'rgba(248, 248, 242, 0.62)',
	line: 'rgba(248, 248, 242, 0.24)',
	soft: 'rgba(248, 248, 242, 0.11)',
	placeholder: 'rgba(248, 248, 242, 0.26)',
	accent: '#eeb04d',
	onAccent: '#282a36',
	danger: '#ff5555',
	warn: '#ffb86c',
	ok: '#50fa7b',
	selection: 'rgba(238, 176, 77, 0.2)',
	stripe: 'rgba(248, 248, 242, 0.05)',
	lanes: ['#bd93f9', '#ff79c6', '#8be9fd', '#f1fa8c', '#50fa7b']
};

/** Tokyo Night Day. */
const TOKYO_DAY: Palette = {
	bg: '#e1e2e7',
	// Lighter than the background, which is Tokyo Night Day's own arrangement —
	// and what keeps its blue foreground readable on a panel.
	panel: '#e9e9ec',
	ink: '#3760bf',
	muted: 'rgba(55, 96, 191, 0.85)',
	line: 'rgba(55, 96, 191, 0.28)',
	soft: 'rgba(55, 96, 191, 0.13)',
	placeholder: 'rgba(55, 96, 191, 0.3)',
	// Tokyo Night Day's own blue is #2e7de9, which is too light to put white
	// text on — a filled primary button fails at 4.0:1. Darkened until it
	// carries text at 5.8:1; the lighter original stays as the first lane.
	accent: '#976317',
	onAccent: '#ffffff',
	danger: '#c64343',
	warn: '#8f5e15',
	ok: '#587539',
	selection: 'rgba(151, 99, 23, 0.16)',
	stripe: 'rgba(55, 96, 191, 0.06)',
	lanes: ['#2e7de9', '#9854f1', '#b15c00', '#007197', '#587539']
};

/** Tokyo Night. */
const TOKYO_NIGHT: Palette = {
	bg: '#1a1b26',
	panel: '#16161e',
	ink: '#c0caf5',
	muted: 'rgba(192, 202, 245, 0.6)',
	line: 'rgba(192, 202, 245, 0.24)',
	soft: 'rgba(192, 202, 245, 0.11)',
	placeholder: 'rgba(192, 202, 245, 0.26)',
	accent: '#eeb04d',
	onAccent: '#1a1b26',
	danger: '#f7768e',
	warn: '#e0af68',
	ok: '#9ece6a',
	selection: 'rgba(238, 176, 77, 0.18)',
	stripe: 'rgba(192, 202, 245, 0.05)',
	lanes: ['#7aa2f7', '#bb9af7', '#7dcfff', '#e0af68', '#9ece6a']
};

/** Gruvbox light, hard background. */
const GRUVBOX_LIGHT: Palette = {
	bg: '#fbf1c7',
	panel: '#f2e5bc',
	ink: '#3c3836',
	muted: 'rgba(60, 56, 54, 0.66)',
	line: 'rgba(60, 56, 54, 0.28)',
	soft: 'rgba(60, 56, 54, 0.13)',
	placeholder: 'rgba(60, 56, 54, 0.3)',
	accent: '#976317',
	onAccent: '#fbf1c7',
	danger: '#9d0006',
	warn: '#b57614',
	ok: '#79740e',
	selection: 'rgba(151, 99, 23, 0.14)',
	stripe: 'rgba(60, 56, 54, 0.055)',
	lanes: ['#076678', '#8f3f71', '#af3a03', '#79740e', '#b57614']
};

/** Gruvbox dark, medium background. */
const GRUVBOX_DARK: Palette = {
	bg: '#282828',
	panel: '#1d2021',
	ink: '#ebdbb2',
	muted: 'rgba(235, 219, 178, 0.62)',
	line: 'rgba(235, 219, 178, 0.26)',
	soft: 'rgba(235, 219, 178, 0.12)',
	placeholder: 'rgba(235, 219, 178, 0.28)',
	accent: '#eeb04d',
	onAccent: '#282828',
	danger: '#fb4934',
	warn: '#fabd2f',
	ok: '#b8bb26',
	selection: 'rgba(238, 176, 77, 0.2)',
	stripe: 'rgba(235, 219, 178, 0.05)',
	lanes: ['#83a598', '#d3869b', '#fe8019', '#b8bb26', '#fabd2f']
};

/** In the order Settings shows them, with the default first. */
export const FAMILIES: Family[] = [
	{
		id: 'catppuccin',
		name: 'Catppuccin',
		light: { name: 'Latte', palette: LATTE },
		dark: { name: 'Mocha', palette: MOCHA }
	},
	{
		id: 'dracula',
		name: 'Dracula',
		light: { name: 'Alucard', palette: ALUCARD },
		dark: { name: 'Dracula', palette: DRACULA }
	},
	{
		id: 'tokyo-night',
		name: 'Tokyo Night',
		light: { name: 'Day', palette: TOKYO_DAY },
		dark: { name: 'Night', palette: TOKYO_NIGHT }
	},
	{
		id: 'gruvbox',
		name: 'Gruvbox',
		light: { name: 'Light', palette: GRUVBOX_LIGHT },
		dark: { name: 'Dark', palette: GRUVBOX_DARK }
	}
];

/**
 * What a fresh install opens on.
 *
 * `src/app.css` carries this family's two palettes as its boot values, so the
 * first paint — before any JavaScript has run — is already the default theme
 * rather than a flash of something else.
 */
export const DEFAULT_FAMILY: FamilyId = 'catppuccin';

export function isFamily(value: string): value is FamilyId {
	return FAMILIES.some((family) => family.id === value);
}

export function familyOf(id: FamilyId): Family {
	return FAMILIES.find((family) => family.id === id) ?? FAMILIES[0];
}

/** The variant of `id` for `mode`, name and palette. */
export function variantOf(id: FamilyId, mode: Mode): Variant {
	return familyOf(id)[mode];
}

export function paletteOf(id: FamilyId, mode: Mode): Palette {
	return variantOf(id, mode).palette;
}

/**
 * The palette as CSS custom properties, ready to set on an element.
 *
 * The property names are `src/app.css`'s, and this is the only place the two
 * naming schemes meet — everywhere else reads `var(--bg)` and knows nothing
 * about `Palette`.
 */
export function properties(palette: Palette): Record<string, string> {
	const { lanes, onAccent, ...rest } = palette;

	const tokens: Record<string, string> = { '--on-accent': onAccent };
	for (const [name, value] of Object.entries(rest)) {
		tokens[`--${name}`] = value;
	}
	lanes.forEach((colour, index) => {
		tokens[`--lane-${index + 1}`] = colour;
	});

	return tokens;
}
