// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The graph's columns: which are shown, in what order, how wide — per repository.
 *
 * Three columns are on by default — Branch/Tag, Graph, Commit Message — and
 * Author, Date and SHA are available. That split is not arbitrary: the first
 * three answer *what happened*, and the other three answer *who and when*,
 * which most people want on some repositories and not on others. Hence per
 * repository rather than per install.
 *
 * # Why the Graph column is different
 *
 * Every other column has a width the user sets. The Graph column's width is
 * computed from how many lanes are actually on screen (see
 * `laneColumnWidth`), because a lane column narrower than its lanes does not
 * truncate gracefully — it draws commits on top of each other. It is listed
 * here so that it can be reordered and so that the header lines up, but its
 * width is read from the canvas, not from this store.
 *
 * # Where it is kept
 *
 * `localStorage`, keyed by repository path, alongside the panel widths and the
 * theme. This is view state for one person on one machine: putting it in the
 * repository would mean a layout choice arriving in someone else's checkout,
 * and putting it in GitLord's config directory would mean a backend round trip
 * before the first paint of a screen that has to be instant.
 */

export type ColumnId = 'refs' | 'graph' | 'message' | 'author' | 'time' | 'sha';

export interface Column {
	id: ColumnId;
	/** What the header says, and what the header's own menu calls it. */
	label: string;
	/** Current width in CSS pixels. Ignored for `graph` and `message`. */
	width: number;
	/** Below this the column cannot say anything useful. */
	min: number;
	/**
	 * True for the column that takes the leftover width. Exactly one is, and it
	 * is the message: it is the column people read, so it gets what is left.
	 */
	fills?: boolean;
	/** True when the width is computed rather than dragged. */
	computed?: boolean;
	/** True when hiding it would leave a graph that is not a graph. */
	required?: boolean;
}

/** The design's three, then the three the header's menu can add. */
const CATALOGUE: Column[] = [
	{ id: 'refs', label: 'Branch / Tag', width: 186, min: 90 },
	{ id: 'graph', label: 'Graph', width: 150, min: 60, computed: true, required: true },
	{ id: 'message', label: 'Commit Message', width: 0, min: 160, fills: true, required: true },
	{ id: 'author', label: 'Author', width: 150, min: 80 },
	{ id: 'time', label: 'Date / Time', width: 150, min: 90 },
	{ id: 'sha', label: 'SHA', width: 84, min: 60 }
];

const DEFAULT_ORDER: ColumnId[] = ['refs', 'graph', 'message'];

interface Layout {
	/** Shown columns, in the order they are drawn. */
	order: ColumnId[];
	/** Widths for the ones that have a settable width. */
	widths: Partial<Record<ColumnId, number>>;
}

const KEY_PREFIX = 'gitlord.graph.columns:';

let repoKey = $state<string | null>(null);
let order = $state<ColumnId[]>([...DEFAULT_ORDER]);
let widths = $state<Partial<Record<ColumnId, number>>>({});
let author = $state('');

function definition(id: ColumnId): Column {
	// The catalogue is exhaustive and the id type is closed, so this cannot miss
	// — but a stored layout from a future version could name one that has since
	// been removed, and falling back is better than rendering `undefined`.
	return CATALOGUE.find((column) => column.id === id) ?? CATALOGUE[0];
}

function isColumnId(value: string): value is ColumnId {
	return CATALOGUE.some((column) => column.id === value);
}

function persist(): void {
	if (repoKey === null) return;
	const layout: Layout = { order, widths };
	try {
		localStorage.setItem(KEY_PREFIX + repoKey, JSON.stringify(layout));
	} catch {
		// The layout just won't be remembered. Not worth failing a paint over.
	}
}

/**
 * Read a stored layout, discarding anything that no longer makes sense.
 *
 * A layout that has lost the graph or the message column would render as a
 * list of dates, so the required columns are put back rather than the whole
 * layout being thrown away — the user's other choices are still theirs.
 */
function restore(key: string): void {
	let layout: Layout | null = null;
	try {
		const raw = localStorage.getItem(KEY_PREFIX + key);
		layout = raw === null ? null : (JSON.parse(raw) as Layout);
	} catch {
		layout = null;
	}

	if (!layout || !Array.isArray(layout.order)) {
		order = [...DEFAULT_ORDER];
		widths = {};
		return;
	}

	const kept = layout.order.filter(
		(id, index): id is ColumnId =>
			typeof id === 'string' && isColumnId(id) && layout.order.indexOf(id) === index
	);

	for (const column of CATALOGUE) {
		if (column.required && !kept.includes(column.id)) {
			// Back where the default puts it, which keeps the graph left of the
			// message however the rest was arranged.
			kept.splice(Math.min(DEFAULT_ORDER.indexOf(column.id), kept.length), 0, column.id);
		}
	}

	order = kept.length > 0 ? kept : [...DEFAULT_ORDER];
	widths = typeof layout.widths === 'object' && layout.widths !== null ? layout.widths : {};
}

export const columns = {
	/** The shown columns, in draw order, with their current widths. */
	get shown(): Column[] {
		return order.map((id) => ({ ...definition(id), width: widths[id] ?? definition(id).width }));
	},

	/** Everything that could be shown, for the header's menu. */
	get catalogue(): { column: Column; shown: boolean }[] {
		return CATALOGUE.map((column) => ({ column, shown: order.includes(column.id) }));
	},

	/**
	 * The author being filtered on, or the empty string.
	 *
	 * A filter here **dims** rather than removes. Removing rows would leave the
	 * lanes drawing edges between commits that are no longer parent and child,
	 * which is the same reason the Log search screen shows no lanes at all — and
	 * on the graph, the shape is the thing being looked at. Dimming answers
	 * "which of these are mine" without lying about the history.
	 */
	get author(): string {
		return author;
	},

	setAuthor(next: string): void {
		author = next;
	},

	/** Does a row's author match the current filter? True when there is none. */
	matches(name: string): boolean {
		const needle = author.trim().toLowerCase();
		return needle === '' || name.toLowerCase().includes(needle);
	},

	isShown(id: ColumnId): boolean {
		return order.includes(id);
	},

	width(id: ColumnId): number {
		return widths[id] ?? definition(id).width;
	},

	/** Show or hide a column. A required column cannot be hidden. */
	toggle(id: ColumnId): void {
		if (order.includes(id)) {
			if (definition(id).required) return;
			order = order.filter((current) => current !== id);
		} else {
			order = [...order, id];
		}
		persist();
	},

	/** Move the column at `from` so that it sits at `to`. Header drag-and-drop. */
	reorder(from: number, to: number): void {
		if (from === to || from < 0 || from >= order.length) return;
		const next = [...order];
		const [moved] = next.splice(from, 1);
		next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
		order = next;
		persist();
	},

	/** Set a width, clamped to what the column can still say something in. */
	resize(id: ColumnId, next: number): void {
		const column = definition(id);
		if (column.computed || column.fills) return;
		widths = { ...widths, [id]: Math.max(column.min, Math.round(next)) };
		persist();
	},

	/** Back to Branch/Tag, Graph, Commit Message at their design widths. */
	reset(): void {
		order = [...DEFAULT_ORDER];
		widths = {};
		persist();
	},

	/**
	 * Point the store at a repository, loading its layout.
	 *
	 * Called whenever the open repository changes. A null path — no repository —
	 * keeps the last layout on screen rather than flashing back to the default
	 * while the next one opens.
	 */
	open(path: string | null): void {
		if (path === null || path === repoKey) return;
		repoKey = path;
		restore(path);
	}
};
