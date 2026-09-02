// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, flushSync, render } from '../../testing/mount';
import type { RepoCounts, RepoInfo } from '$lib/types';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (path: string) => goto(path) }));

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/') } }));

vi.mock('$lib/graph/store.svelte', async () => await import('../../testing/graph-store.svelte'));

// Hoisted, because `vi.mock` factories run before ordinary module scope.
const { appWindow } = vi.hoisted(() => ({
	appWindow: {
		close: vi.fn(),
		minimize: vi.fn(),
		toggleMaximize: vi.fn(),
		isMaximized: vi.fn(() => Promise.resolve(false)),
		startDragging: vi.fn(),
		startResize: vi.fn()
	}
}));
vi.mock('$lib/chrome/window', () => ({ appWindow }));

/** A controllable stand-in for the repo store. */
vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

/** The same, for the branch list the toolbar's dropdown reads (FEAT-045). */
vi.mock('$lib/branches/store.svelte', async () => await import('../../testing/branches-store.svelte'));

import {
	branchRow,
	control as branchControl,
	calls as branchCalls
} from '../../testing/branches-store.svelte';
import { control as repoControl, calls as repoCalls } from '../../testing/repo-store.svelte';
import { control as graphControl } from '../../testing/graph-store.svelte';
import NavRail from './NavRail.svelte';
import ResizeEdges from './ResizeEdges.svelte';
import RepoTabs from './RepoTabs.svelte';
import StatusStrip from './StatusStrip.svelte';
import TitleBar from './TitleBar.svelte';
import Toolbar from './Toolbar.svelte';
import { version } from '$lib/version';
import { workspace } from '$lib/workspace.svelte';

function info(
	branch: string | null = 'main',
	detached = false,
	path = '/repos/fixture'
): RepoInfo {
	return {
		path,
		name: path.split('/').pop() ?? 'fixture',
		bare: false,
		lastFetched: null,
		head: { branch, detached, id: 'a'.repeat(40), short: 'aaaaaaa' }
	};
}

function counts(overrides: Partial<RepoCounts> = {}): RepoCounts {
	return {
		commits: null,
		working: null,
		staged: null,
		conflicts: null,
		branches: 4,
		stashes: 2,
		tags: 2,
		submodules: 0,
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	repoControl.reset();
	graphControl.reset();
	branchControl.reset();
	vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

describe('TitleBar', () => {
	it('falls back to the product name with no repository open', () => {
		const view = render(TitleBar, {});
		expect(view.get('.name').textContent).toBe('Spagitty');
		view.destroy();
	});

	it('keeps saying which program this is, whatever is open', () => {
		// FEAT-027: the bar used to show the repository's name and its branch.
		// Both are one row below on the toolbar's pickers, and the repository is
		// also its own tab — three copies of one fact is two too many.
		repoControl.setInfo(info('main'));
		const view = render(TitleBar, {});

		expect(view.get('.name').textContent).toBe('Spagitty');
		view.destroy();
	});

	it('no longer carries the tabs or the way back (FEAT-044)', () => {
		// Both were passengers in the row that has to survive a narrow window,
		// and neither is a window control. The tabs have a row of their own; the
		// way back is screen 1J on the rail.
		workspace.clear();
		workspace.opened('/repos/fixture');

		const view = render(TitleBar, {});

		expect(view.all('.tab').length).toBe(0);
		expect(view.text()).not.toContain('All repositories');

		workspace.clear();
		view.destroy();
	});

	it('no longer states the license and version, which moved (FEAT-043)', () => {
		// They are the least changing facts in the application and they were in
		// the row that names what is open — the one that gives way to tabs as
		// repositories are opened. The strip below has them.
		const view = render(TitleBar, {});

		expect(view.text()).not.toContain(version.licenseShort);
		expect(view.text()).not.toContain(`v${version.number}`);

		view.destroy();
	});

	it('offers all three window controls, since the platform draws none', () => {
		const view = render(TitleBar, {});
		const controls = view.all('.control');

		expect(controls.map((c) => c.getAttribute('aria-label'))).toEqual([
			'Minimize',
			'Maximize',
			'Close'
		]);

		click(controls[0]);
		click(controls[1]);
		click(controls[2]);

		expect(appWindow.minimize).toHaveBeenCalledTimes(1);
		expect(appWindow.toggleMaximize).toHaveBeenCalledTimes(1);
		expect(appWindow.close).toHaveBeenCalledTimes(1);

		view.destroy();
	});

	it('maximizes on a double-click of the bar itself', () => {
		const view = render(TitleBar, {});
		view.get('.titlebar').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		flushSync();

		expect(appWindow.toggleMaximize).toHaveBeenCalledTimes(1);
		view.destroy();
	});

	it('does not maximize when a control is clicked', () => {
		// The controls sit inside the bar, so their clicks have to stop there.
		const view = render(TitleBar, {});
		const dbl = vi.fn();
		view.get('.titlebar').addEventListener('dblclick', dbl);

		click(view.all('.control')[2]);

		expect(appWindow.close).toHaveBeenCalledTimes(1);
		expect(appWindow.toggleMaximize).not.toHaveBeenCalled();
		view.destroy();
	});

	it('is draggable, which is how an undecorated window moves', () => {
		const view = render(TitleBar, {});
		expect(view.get('.titlebar').hasAttribute('data-tauri-drag-region')).toBe(true);
		view.destroy();
	});

	it('carries no shortcut hint, because the one it carried was wrong', () => {
		// It said `⌘K` and opened Log search; the shortcut is `⌘F`, and the
		// notation was macOS's on every platform. A hint nobody can act on is
		// worse than none.
		const view = render(TitleBar, {});

		expect(view.text()).not.toContain('⌘K');

		view.destroy();
	});

	it('carries no theme control, because Settings owns the theme', () => {
		// Two controls for one preference is two things to keep in step.
		const view = render(TitleBar, {});
		const labels = view.all('.chip').map((chip) => chip.textContent?.trim());

		expect(labels).not.toContain('dark');
		expect(labels).not.toContain('light');

		view.destroy();
	});
});

describe('RepoTabs', () => {
	it('shows the open repositories as tabs, with the active one marked', () => {
		workspace.clear();
		workspace.opened('/repos/fixture');
		workspace.opened('/repos/other');

		const view = render(RepoTabs, {});

		const labels = view.all('.tab .label').map((element) => element.textContent);
		expect(labels).toEqual(['fixture', 'other']);
		expect(view.get('.tab.active .label').textContent).toBe('other');

		workspace.clear();
		view.destroy();
	});

	it('is a row of its own, which is where it now lives (FEAT-044)', () => {
		workspace.clear();
		workspace.opened('/repos/fixture');

		const view = render(RepoTabs, {});

		expect(view.all('.tabrow').length).toBe(1);
		expect(view.get('.tabrow .tabs')).toBeTruthy();

		workspace.clear();
		view.destroy();
	});

	it('draws no row at all when nothing is open (FEAT-044)', () => {
		// A band of chrome across the window with nothing in it makes an empty
		// application look broken.
		workspace.clear();

		const view = render(RepoTabs, {});

		expect(view.all('.tabrow').length).toBe(0);
		expect(view.all('.tab').length).toBe(0);

		view.destroy();
	});

	it('closes the repository when the last tab is closed', async () => {
		// BUG-019: `workspace.close` returns the tab to show next, and null when
		// there is none. The caller switched to `next` and did nothing at all
		// when it was null, so closing the last tab took the strip away and left
		// the repository open behind it — the toolbar still naming it, the rail
		// still counting it, the graph still full of its commits.
		workspace.clear();
		workspace.opened('/repos/fixture');
		repoControl.setInfo(info('main', false, '/repos/fixture'));
		repoCalls.closed = 0;

		const view = render(RepoTabs, {});
		view.get('.tab .close').click();
		await Promise.resolve();
		flushSync();

		expect(repoCalls.closed).toBe(1);

		workspace.clear();
		view.destroy();
	});

	it('does not close the repository while another tab is left', async () => {
		// Closing one of several is a switch, not a close.
		workspace.clear();
		workspace.opened('/repos/fixture');
		workspace.opened('/repos/other');
		repoControl.setInfo(info('main', false, '/repos/other'));
		repoCalls.closed = 0;

		const view = render(RepoTabs, {});
		view.all('.tab .close')[1].click();
		await Promise.resolve();
		flushSync();

		expect(repoCalls.closed).toBe(0);

		workspace.clear();
		view.destroy();
	});

	it('keeps the way to open a repository in the row', () => {
		workspace.clear();
		workspace.opened('/repos/fixture');

		const view = render(RepoTabs, {});

		expect(view.get('.add').getAttribute('aria-label')).toBe('Add a repository');

		workspace.clear();
		view.destroy();
	});
});

describe('StatusStrip', () => {
	it('states the license and version, which the GPL asks for (FEAT-043)', () => {
		const view = render(StatusStrip, {});

		expect(view.text()).toContain(version.licenseShort);
		expect(view.text()).toContain(`v${version.number}`);

		view.destroy();
	});

	it('carries the full SPDX identifier where a short one is shown', () => {
		// `GPL-3.0` is the abbreviation that fits; the authoritative identifier
		// is `GPL-3.0-or-later`, and it must be reachable without opening
		// Settings.
		const view = render(StatusStrip, {});

		expect(view.get('.note').getAttribute('title')).toBe(version.license);

		view.destroy();
	});

	it('says nothing else, on purpose', () => {
		// The left end is empty until something genuinely window-wide earns it.
		// A strip filled with second copies of what the rail and toolbar already
		// say is how a status bar becomes noise.
		const view = render(StatusStrip, {});

		expect(view.text().trim()).toBe(`${version.licenseShort} · v${version.number}`);

		view.destroy();
	});
});

describe('TitleBar', () => {
	it('puts the name in the middle of the window, not the middle of the gap', () => {
		// TASK-021: three columns with equal outer ones. Centring the name in
		// the space the window controls leave over would land it visibly left.
		const view = render(TitleBar, {});
		const bar = view.get('.titlebar');
		const children = [...bar.children];

		expect(children).toHaveLength(3);
		expect(children[1].classList.contains('name')).toBe(true);
		expect(children[1].textContent).toBe('Spagitty');
		// The leading column is empty and says nothing to a screen reader.
		expect(children[0].textContent).toBe('');
		expect(children[0].getAttribute('aria-hidden')).toBe('true');

		view.destroy();
	});
});

describe('Toolbar', () => {
	it('says there is no repository, and offers no control that cannot work', () => {
		// FEAT-045: an empty dropdown is worse than an absent one.
		const view = render(Toolbar, {});

		expect(view.text()).toContain('no repository');
		expect(view.all('.field')).toHaveLength(0);
		view.destroy();
	});

	it('reads as a location once a repository is open', () => {
		repoControl.setInfo(info('main'));
		const view = render(Toolbar, {});

		// The name is a name, not a control: nothing to click, nothing to
		// navigate. All repositories is on the rail and in the tabs row.
		expect(view.get('.repo').textContent).toBe('fixture');
		expect(view.get('.repo').tagName).toBe('SPAN');
		expect(view.text()).toContain('›');
		expect(view.get('.field .value').textContent).toBe('main');
		view.destroy();
	});

	it('closes the branch menu when the control that opened it is clicked again', () => {
		// BUG-018. A real pointer sends `mousedown` and then `click`. `Menu`
		// closes on any outside mousedown, and the control reopened
		// unconditionally on the click that followed — so clicking the control
		// to dismiss the menu closed it and opened it again in the same
		// gesture, and it read as a menu that could not be closed at all.
		repoControl.setInfo(info('main'));
		const view = render(Toolbar, {});

		const field = view.get('.field');
		field.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		field.click();
		flushSync();
		expect(view.find('.menu')).not.toBeNull();

		field.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		field.click();
		flushSync();
		expect(view.find('.menu')).toBeNull();

		view.destroy();
	});

	it('keeps the branch menu open when something inside it is pressed', () => {
		repoControl.setInfo(info('main'));
		const view = render(Toolbar, {});

		const field = view.get('.field');
		field.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		field.click();
		flushSync();

		view.get('.menu').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		flushSync();

		expect(view.find('.menu')).not.toBeNull();
		view.destroy();
	});

	it('closes the branch menu on a mousedown anywhere else', () => {
		repoControl.setInfo(info('main'));
		const view = render(Toolbar, {});

		const field = view.get('.field');
		field.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		field.click();
		flushSync();

		document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		flushSync();

		expect(view.find('.menu')).toBeNull();
		view.destroy();
	});

	it('falls back to the short SHA when HEAD is detached', () => {
		repoControl.setInfo(info(null, true));
		const view = render(Toolbar, {});
		expect(view.text()).toContain('aaaaaaa');
		view.destroy();
	});

	it('does not offer to commit, because it cannot', () => {
		// FEAT-028: committing belongs to the Working copy screen, which has the
		// message box, the staged list and its own Commit. The button here could
		// only navigate, and a primary button that says "Commit 3 files" and
		// then does not commit is a button that lies.
		repoControl.setCounts(counts({ working: 10, staged: 3 }));
		const view = render(Toolbar, {});

		expect(view.text()).not.toContain('Commit');
		view.destroy();
	});

	it('says which actions are still not built, and no longer lies about the ones that are', () => {
		const view = render(Toolbar, {});

		for (const label of ['Undo', 'Redo']) {
			const button = view.all('.tool').find((b) => b.textContent?.includes(label));
			expect(button?.getAttribute('title')).toBe('Not built yet');
		}

		// FEAT-022 built these two; the toolbar had gone on claiming otherwise.
		for (const label of ['Fetch', 'Push']) {
			const button = view.all('.tool').find((b) => b.textContent?.includes(label));
			expect(button?.getAttribute('title')).not.toBe('Not built yet');
		}

		view.destroy();
	});

	it('groups the actions rather than running them together', () => {
		const view = render(Toolbar, {});

		// Two dividers for three groups: history, remote, branch.
		expect(view.all('.actions .vr')).toHaveLength(2);
		view.destroy();
	});

	it('navigates from the actions that do exist', () => {
		const view = render(Toolbar, {});

		for (const [label, route] of [
			['Branch', '/branches'],
			['Stash', '/stash'],
			['Rebase', '/rebase']
		] as const) {
			goto.mockClear();
			const button = view.all('.tool').find((b) => b.textContent?.includes(label));
			click(button as HTMLElement);
			expect(goto).toHaveBeenCalledWith(route);
		}

		view.destroy();
	});

	it('opens the branch list in place rather than replacing the screen (FEAT-045)', async () => {
		repoControl.setInfo(info('main'));
		branchControl.setRows([branchRow({ name: 'main', current: true }), branchRow({ name: 'topic' })]);

		const view = render(Toolbar, {});
		click(view.get('.field'));
		flushSync();
		await Promise.resolve();
		flushSync();

		expect(goto).not.toHaveBeenCalledWith('/branches');
		expect(document.body.textContent).toContain('topic');

		view.destroy();
	});

	it('lists local branches and not remote-tracking refs', async () => {
		// A remote ref is not a thing to check out; offering one is how an
		// accidental detached HEAD happens.
		repoControl.setInfo(info('main'));
		branchControl.setRows([
			branchRow({ name: 'main', current: true }),
			branchRow({ name: 'topic' }),
			branchRow({ name: 'origin/topic', kind: 'remote', fullName: 'refs/remotes/origin/topic' })
		]);

		const view = render(Toolbar, {});
		click(view.get('.field'));
		flushSync();
		await Promise.resolve();
		flushSync();

		const labels = [...document.querySelectorAll('.entry')].map((e) => e.textContent ?? '');
		expect(labels.some((label) => label.includes('topic'))).toBe(true);
		expect(labels.some((label) => label.includes('origin/topic'))).toBe(false);

		view.destroy();
	});

	it('shows the branch already checked out, disabled, with its reason', async () => {
		repoControl.setInfo(info('main'));
		branchControl.setRows([branchRow({ name: 'main', current: true }), branchRow({ name: 'topic' })]);

		const view = render(Toolbar, {});
		click(view.get('.field'));
		flushSync();
		await Promise.resolve();
		flushSync();

		const current = [...document.querySelectorAll('.entry')].find((entry) =>
			entry.textContent?.includes('main')
		);
		expect((current as HTMLButtonElement).disabled).toBe(true);
		expect(current?.textContent).toContain('already on it');

		view.destroy();
	});

	it('reads the branch list when the dropdown is opened, and not before', async () => {
		repoControl.setInfo(info('main'));
		branchControl.setUnloaded();

		const view = render(Toolbar, {});
		expect(branchCalls.loads).toBe(0);

		click(view.get('.field'));
		flushSync();
		await Promise.resolve();
		flushSync();

		expect(branchCalls.loads).toBe(1);
		view.destroy();
	});

	it('checks out the branch that was chosen', async () => {
		repoControl.setInfo(info('main'));
		branchControl.setRows([branchRow({ name: 'main', current: true }), branchRow({ name: 'topic' })]);

		const view = render(Toolbar, {});
		click(view.get('.field'));
		flushSync();
		await Promise.resolve();
		flushSync();

		const topic = [...document.querySelectorAll('.entry')].find((entry) =>
			entry.textContent?.includes('topic')
		);
		click(topic as HTMLElement);
		flushSync();
		await Promise.resolve();

		expect(branchCalls.checkedOut).toEqual(['topic']);
		view.destroy();
	});

	it('says why a checkout was refused, where the switch was asked for', async () => {
		repoControl.setInfo(info('main'));
		branchControl.setRows([branchRow({ name: 'main', current: true }), branchRow({ name: 'topic' })]);
		branchControl.failNextCheckout('your local changes would be overwritten');

		const view = render(Toolbar, {});
		click(view.get('.field'));
		flushSync();
		await Promise.resolve();
		flushSync();

		const topic = [...document.querySelectorAll('.entry')].find((entry) =>
			entry.textContent?.includes('topic')
		);
		click(topic as HTMLElement);
		flushSync();
		await Promise.resolve();
		flushSync();

		expect(view.text()).toContain('your local changes would be overwritten');
		view.destroy();
	});
});

describe('NavRail', () => {
	it('marks exactly one item as where you are', () => {
		const view = render(NavRail, {});
		const active = view.all('.item').filter((i) => i.dataset.active === 'true');

		expect(active).toHaveLength(1);
		expect(active[0].textContent).toContain('Graph');
		view.destroy();
	});

	it('shows a dot, not a number, for a count nothing has computed', () => {
		// A wrong count is worse than no count: it is what people use to decide
		// whether a screen is worth opening.
		repoControl.setCounts(counts({ working: null, conflicts: null }));
		const view = render(NavRail, {});

		const working = view.all('.item').find((i) => i.textContent?.includes('Working copy'));
		expect(working?.textContent).toContain('·');
		expect(working?.textContent).not.toMatch(/\d/);

		view.destroy();
	});

	it('names no shortcut on the Log item (FEAT-041)', () => {
		// It said `Ctrl+F` on every platform, in a column of counts. The
		// shortcut is real and unchanged; the palette is where it is listed,
		// with the notation the platform actually uses.
		const view = render(NavRail, {});

		const log = view.all('.item').find((i) => i.textContent?.includes('Log'));
		expect(log?.textContent).not.toMatch(/ctrl|cmd|⌘/i);

		view.destroy();
	});

	it('shows nothing beside a screen that has no count (FEAT-041)', () => {
		// A `·` means "not computed yet". Settings has no count and is not
		// waiting for one, so its dot claimed a number that was never coming —
		// while Pull requests and Rebase, in the same position, showed nothing.
		repoControl.setCounts(counts({ branches: 4 }));
		const view = render(NavRail, {});

		for (const label of ['Settings', 'Pull requests', 'Rebase']) {
			const item = view.all('.item').find((i) => i.textContent?.includes(label));
			expect(item?.textContent?.trim()).toBe(label);
		}

		view.destroy();
	});

	it('shows real counts where they exist', () => {
		repoControl.setCounts(counts({ branches: 4, stashes: 2 }));
		const view = render(NavRail, {});

		const branches = view.all('.item').find((i) => i.textContent?.includes('Branches'));
		expect(branches?.textContent).toContain('4');

		const stash = view.all('.item').find((i) => i.textContent?.includes('Stash'));
		expect(stash?.textContent).toContain('2');

		view.destroy();
	});

	it('shows tag and submodule counts in the footer', () => {
		repoControl.setInfo(info());
		repoControl.setCounts(counts({ tags: 2, submodules: 0 }));
		const view = render(NavRail, {});
		expect(view.get('.foot').textContent).toContain('Tags 2');
		expect(view.get('.foot').textContent).toContain('Submodules 0');
		view.destroy();
	});

	it('gives one clear status while history loads and when the repository is ready', () => {
		repoControl.setInfo(info());
		graphControl.setComplete(false);
		const loading = render(NavRail, {});
		expect(loading.get('.foot').textContent).toContain('Loading history…');
		expect(loading.get('.foot').textContent).not.toContain('walking');
		expect(loading.get('.walk').classList.contains('running')).toBe(true);
		loading.destroy();

		graphControl.setComplete(true);
		const done = render(NavRail, {});
		expect(done.get('.foot').textContent).toContain('Repository ready');
		expect(done.get('.walk').classList.contains('running')).toBe(false);
		done.destroy();
	});

	it('does not show repository status before a repository is open', () => {
		const view = render(NavRail, {});
		expect(view.all('.foot')).toHaveLength(0);
		view.destroy();
	});

	it('navigates to the screen it names', () => {
		const view = render(NavRail, {});
		const branches = view.all('.item').find((i) => i.textContent?.includes('Branches'));
		click(branches as HTMLElement);
		expect(goto).toHaveBeenCalledWith('/branches');
		view.destroy();
	});

	/**
	 * FEAT-030. The rail's filter field duplicated the Log screen's own query
	 * bar and the Ctrl+F shortcut, and it occupied the top slot — which now
	 * carries the action a new user actually needs first.
	 */
	it('has no filter field, and does not reach Log from the rail’s top slot', () => {
		const view = render(NavRail, {});

		expect(view.find('.filter')).toBeNull();
		expect(view.find('.field')).toBeNull();
		expect(view.text()).not.toContain('filter commits');

		view.destroy();
	});

	it('opens the directory picker from the top of the rail', () => {
		const view = render(NavRail, {});

		const open = view.get('.open');
		const button = open.querySelector('button') as HTMLElement;
		expect(button.textContent).toContain('Open repository');

		click(button);
		expect(repoCalls.chosen).toBe(1);

		view.destroy();
	});

	/** It is the first thing a new user needs, so it is painted as the primary action. */
	it('paints Open repository as the rail’s primary action', () => {
		const view = render(NavRail, {});

		const button = view.get('.open button');
		expect(button.classList.contains('primary')).toBe(true);

		view.destroy();
	});

	it('leaves the foot holding the counts alone', () => {
		repoControl.setInfo(info());
		const view = render(NavRail, {});

		const foot = view.get('.foot');
		expect(foot.textContent).toContain('Tags');
		expect(foot.textContent).toContain('Submodules');
		expect(foot.querySelector('button')).toBeNull();

		view.destroy();
	});
});

describe('ResizeEdges', () => {
	it('provides all eight regions an undecorated window needs', () => {
		const view = render(ResizeEdges, {});

		expect(view.all('.edge')).toHaveLength(4);
		expect(view.all('.corner')).toHaveLength(4);
		view.destroy();
	});

	it('starts a resize from the edge that was grabbed', () => {
		const view = render(ResizeEdges, {});
		const north = view.get('.edge.north');

		north.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
		flushSync();

		expect(appWindow.startResize).toHaveBeenCalledWith('North');
		view.destroy();
	});

	it('resizes diagonally from a corner', () => {
		const view = render(ResizeEdges, {});
		view
			.get('.corner.southeast')
			.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
		flushSync();

		expect(appWindow.startResize).toHaveBeenCalledWith('SouthEast');
		view.destroy();
	});

	it('lets a right-click fall through', () => {
		const view = render(ResizeEdges, {});
		view
			.get('.edge.south')
			.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 2 }));
		flushSync();

		expect(appWindow.startResize).not.toHaveBeenCalled();
		view.destroy();
	});

	it('is invisible to assistive technology', () => {
		const view = render(ResizeEdges, {});
		for (const region of [...view.all('.edge'), ...view.all('.corner')]) {
			expect(region.getAttribute('aria-hidden')).toBe('true');
		}
		view.destroy();
	});
});
