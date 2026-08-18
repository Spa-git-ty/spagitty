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

import { control as repoControl, calls as repoCalls } from '../../testing/repo-store.svelte';
import { control as graphControl } from '../../testing/graph-store.svelte';
import NavRail from './NavRail.svelte';
import ResizeEdges from './ResizeEdges.svelte';
import TitleBar from './TitleBar.svelte';
import Toolbar from './Toolbar.svelte';
import { version } from '$lib/version';
import { workspace } from '$lib/workspace.svelte';

function info(branch: string | null = 'main', detached = false): RepoInfo {
	return {
		path: '/repos/fixture',
		name: 'fixture',
		bare: false,
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
	vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

describe('TitleBar', () => {
	it('falls back to the product name with no repository open', () => {
		const view = render(TitleBar, {});
		expect(view.get('.name').textContent).toBe('GitLumiere');
		view.destroy();
	});

	it('keeps saying which program this is, whatever is open', () => {
		// FEAT-027: the bar used to show the repository's name and its branch.
		// Both are one row below on the toolbar's pickers, and the repository is
		// also its own tab — three copies of one fact is two too many.
		repoControl.setInfo(info('main'));
		const view = render(TitleBar, {});

		expect(view.get('.name').textContent).toBe('GitLumiere');
		view.destroy();
	});

	it('offers the way back to every repository', () => {
		const view = render(TitleBar, {});

		click(view.get('.all'));

		expect(goto).toHaveBeenCalledWith('/repos');
		view.destroy();
	});

	it('shows the open repositories as tabs, with the active one marked', () => {
		workspace.clear();
		workspace.opened('/repos/fixture');
		workspace.opened('/repos/other');

		const view = render(TitleBar, {});

		const labels = view.all('.tab .label').map((element) => element.textContent);
		expect(labels).toEqual(['fixture', 'other']);
		expect(view.get('.tab.active .label').textContent).toBe('other');

		workspace.clear();
		view.destroy();
	});

	it('states the license and version, which the GPL asks for', () => {
		const view = render(TitleBar, {});
		expect(view.text()).toContain(version.licenseShort);
		expect(view.text()).toContain(`v${version.number}`);
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

describe('Toolbar', () => {
	it('says there is no repository rather than showing an empty picker', () => {
		const view = render(Toolbar, {});
		expect(view.text()).toContain('no repository');
		expect(view.text()).toContain('—');
		view.destroy();
	});

	it('shows the repository and branch once one is open', () => {
		repoControl.setInfo(info('main'));
		const view = render(Toolbar, {});

		expect(view.text()).toContain('fixture');
		expect(view.text()).toContain('main');
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

	it('reaches the repository and branch screens from the pickers', () => {
		const view = render(Toolbar, {});
		const [repositories, branches] = view.all('.field');

		click(repositories);
		expect(goto).toHaveBeenCalledWith('/repos');

		click(branches);
		expect(goto).toHaveBeenCalledWith('/branches');

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
		repoControl.setCounts(counts({ tags: 2, submodules: 0 }));
		const view = render(NavRail, {});
		expect(view.get('.foot').textContent).toContain('Tags 2');
		expect(view.get('.foot').textContent).toContain('Submodules 0');
		view.destroy();
	});

	it('reports the walk as loading until it is complete', () => {
		graphControl.setComplete(false);
		const loading = render(NavRail, {});
		expect(loading.get('.head').textContent).toContain('loading');
		loading.destroy();

		graphControl.setComplete(true);
		const done = render(NavRail, {});
		expect(done.get('.head').textContent).toContain('all');
		done.destroy();
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
