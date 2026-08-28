// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from 'vitest';
import { click, render, textSnippet } from '../../testing/mount';
import type { RefChip as Chip_ } from '$lib/types';
import Btn from './Btn.svelte';
import Chip from './Chip.svelte';
import RefChip from './RefChip.svelte';
import ScreenStub from './ScreenStub.svelte';

describe('Btn', () => {
	it('renders its children and calls onclick', () => {
		const onclick = vi.fn();
		const view = render(Btn, { children: textSnippet('Commit'), onclick });

		expect(view.text()).toBe('Commit');
		click(view.get('button'));
		expect(onclick).toHaveBeenCalledTimes(1);

		view.destroy();
	});

	it('does not call onclick while disabled', () => {
		const onclick = vi.fn();
		const view = render(Btn, { children: textSnippet('Push'), onclick, disabled: true });

		const button = view.get('button') as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		button.click();
		expect(onclick).not.toHaveBeenCalled();

		view.destroy();
	});

	it('marks the primary action', () => {
		const plain = render(Btn, { children: textSnippet('Cancel') });
		const primary = render(Btn, { children: textSnippet('Commit'), primary: true });

		expect(plain.get('button').classList.contains('primary')).toBe(false);
		expect(primary.get('button').classList.contains('primary')).toBe(true);

		plain.destroy();
		primary.destroy();
	});

	it('carries a title, which is how unbuilt actions explain themselves', () => {
		const view = render(Btn, { children: textSnippet('Fetch'), title: 'Not built yet' });
		expect(view.get('button').getAttribute('title')).toBe('Not built yet');
		view.destroy();
	});
});

describe('Chip', () => {
	it('is a button when it does something', () => {
		const onclick = vi.fn();
		const view = render(Chip, { children: textSnippet('split'), onclick });

		const element = view.get('.chip');
		expect(element.tagName).toBe('BUTTON');
		click(element);
		expect(onclick).toHaveBeenCalledTimes(1);

		view.destroy();
	});

	it('is a span when it is only a label', () => {
		// A clickable-looking element that does nothing is worse than a label.
		const view = render(Chip, { children: textSnippet('merged') });
		const element = view.get('.chip');

		expect(element.tagName).toBe('SPAN');
		expect(element.getAttribute('role')).toBeNull();

		view.destroy();
	});

	it('shows which chip in a group is selected', () => {
		const off = render(Chip, { children: textSnippet('unified') });
		const on = render(Chip, { children: textSnippet('split'), active: true });

		expect(off.get('.chip').classList.contains('active')).toBe(false);
		expect(on.get('.chip').classList.contains('active')).toBe(true);

		off.destroy();
		on.destroy();
	});
});

/** A chip as the backend now sends one (FEAT-036). */
function chip(over: Partial<Chip_> = {}): Chip_ {
	return {
		name: 'main',
		kind: 'branch',
		current: false,
		local: true,
		remotes: [],
		divergence: null,
		...over
	};
}

describe('RefChip', () => {
	/**
	 * FEAT-033. The chip says how far the branch has drifted from its upstream,
	 * because the person looking at the graph is the person about to push.
	 */
	it('shows how far the branch has drifted, behind then ahead', () => {
		const view = render(RefChip, {
			chip: chip({ divergence: { upstream: 'origin/main', ahead: 2, behind: 3 } })
		});

		expect(view.get('.behind').textContent?.trim()).toBe('↓3');
		expect(view.get('.ahead').textContent?.trim()).toBe('↑2');

		view.destroy();
	});

	it('shows one side only when the drift is one-sided', () => {
		const ahead = render(RefChip, {
			chip: chip({ divergence: { upstream: 'origin/main', ahead: 4, behind: 0 } })
		});
		expect(ahead.all('.behind')).toHaveLength(0);
		expect(ahead.get('.ahead').textContent?.trim()).toBe('↑4');
		ahead.destroy();

		const behind = render(RefChip, {
			chip: chip({ divergence: { upstream: 'origin/main', ahead: 0, behind: 1 } })
		});
		expect(behind.all('.ahead')).toHaveLength(0);
		expect(behind.get('.behind').textContent?.trim()).toBe('↓1');
		behind.destroy();
	});

	it('says nothing at all when the branch is level', () => {
		// `0/0` on every row is noise on every row, and the gutter is the most
		// crowded place in the application.
		const view = render(RefChip, {
			chip: chip({ divergence: { upstream: 'origin/main', ahead: 0, behind: 0 } })
		});

		expect(view.all('.drift')).toHaveLength(0);
		view.destroy();
	});

	it('says nothing when there is no upstream to have drifted from', () => {
		const view = render(RefChip, { chip: chip({ divergence: null }) });

		expect(view.all('.drift')).toHaveLength(0);
		view.destroy();
	});

	it('keeps the whole sentence in the title, so the arrows are never the only telling', () => {
		const view = render(RefChip, {
			chip: chip({ divergence: { upstream: 'origin/main', ahead: 2, behind: 3 } })
		});

		const title = view.get('.ref').getAttribute('title') ?? '';
		expect(title).toContain('main');
		expect(title).toContain('2 ahead of and 3 behind origin/main');
		expect(title).toContain('as of the last fetch');

		view.destroy();
	});

	it('says a level branch is level in the title, even saying nothing on the chip', () => {
		// The chip is silent and the tooltip is not: "level" is worth knowing
		// when you ask, and not worth a mark on every row.
		const view = render(RefChip, {
			chip: chip({ divergence: { upstream: 'origin/main', ahead: 0, behind: 0 } })
		});

		expect(view.get('.ref').getAttribute('title')).toContain('Level with origin/main');
		view.destroy();
	});

	it('marks the current branch with a check', () => {
		const view = render(RefChip, { chip: chip({ current: true }) });
		const element = view.get('.ref');

		expect(element.classList.contains('current')).toBe(true);
		expect(view.text()).toContain('✔');
		expect(view.text()).toContain('main');

		view.destroy();
	});

	it('does not check a branch that is not current', () => {
		const view = render(RefChip, { chip: chip({ name: 'chore/tooling' }) });

		expect(view.text()).not.toContain('✔');
		expect(view.get('.ref').classList.contains('current')).toBe(false);

		view.destroy();
	});

	it('tells a tag from a branch without a label or an icon', () => {
		const tag = render(RefChip, { chip: chip({ name: 'v0.2.0', kind: 'tag', local: false }) });
		const branch = render(RefChip, { chip: chip() });

		expect(tag.get('.ref').classList.contains('tag')).toBe(true);
		expect(branch.get('.ref').classList.contains('tag')).toBe(false);

		tag.destroy();
		branch.destroy();
	});

	it('marks a branch that lives only on a remote', () => {
		const view = render(RefChip, {
			chip: chip({ kind: 'remote', local: false, remotes: [{ name: 'origin', host: 'gitHub' }] })
		});
		expect(view.get('.ref').classList.contains('remote')).toBe(true);
		view.destroy();
	});
});

/**
 * FEAT-036 — one chip per branch, with where it lives shown as glyphs.
 *
 * The name is the branch's own short name; `origin/main` never appears, because
 * the remote is a mark on the chip rather than a prefix on the name.
 */
describe('RefChip — local and remote marks', () => {
	it('shows one mark for a branch that is only on this machine', () => {
		const view = render(RefChip, { chip: chip() });

		expect(view.all('.mark')).toHaveLength(1);
		expect(view.text()).toContain('main');
		expect(view.text()).not.toContain('origin');

		view.destroy();
	});

	it('shows two marks for a branch that is here and on a remote', () => {
		const view = render(RefChip, {
			chip: chip({ remotes: [{ name: 'origin', host: 'gitHub' }] })
		});

		expect(view.all('.mark')).toHaveLength(2);
		view.destroy();
	});

	it('shows one mark for a branch that is only on a remote', () => {
		const view = render(RefChip, {
			chip: chip({ kind: 'remote', local: false, remotes: [{ name: 'origin', host: 'gitLab' }] })
		});

		expect(view.all('.mark')).toHaveLength(1);
		view.destroy();
	});

	it('shows a mark per remote when a branch is on more than one', () => {
		const view = render(RefChip, {
			chip: chip({
				remotes: [
					{ name: 'fork', host: 'gitHub' },
					{ name: 'origin', host: 'gitHub' }
				]
			})
		});

		expect(view.all('.mark')).toHaveLength(3);
		view.destroy();
	});

	it('gives a tag no marks at all', () => {
		const view = render(RefChip, { chip: chip({ name: 'v0.2.0', kind: 'tag', local: false }) });

		expect(view.all('.mark')).toHaveLength(0);
		view.destroy();
	});

	/** Nothing here is icon-only to anything that cannot see icons. */
	it('says in words what the glyphs say in pictures', () => {
		const view = render(RefChip, {
			chip: chip({ remotes: [{ name: 'origin', host: 'gitHub' }] })
		});

		const title = view.get('.ref').getAttribute('title') ?? '';
		expect(title).toContain('main');
		expect(title).toContain('on this machine');
		expect(title).toContain('on origin');
		expect(title).toContain('GitHub');

		view.destroy();
	});

	it('names an unrecognised host as a remote rather than guessing', () => {
		const view = render(RefChip, {
			chip: chip({ local: false, kind: 'remote', remotes: [{ name: 'backup', host: 'generic' }] })
		});

		const title = view.get('.ref').getAttribute('title') ?? '';
		expect(title).toContain('on backup');
		expect(title).not.toContain('(');

		view.destroy();
	});

	it('hides the marks from assistive technology, since the title carries them', () => {
		const view = render(RefChip, {
			chip: chip({ remotes: [{ name: 'origin', host: 'gitHub' }] })
		});

		expect(view.get('.marks').getAttribute('aria-hidden')).toBe('true');
		view.destroy();
	});

	it('still carries the full name for a tag, which has nowhere else to say it', () => {
		const name = 'v0.2.0-a-tag-name-far-too-long-for-the-gutter';
		const view = render(RefChip, { chip: chip({ name, kind: 'tag', local: false }) });

		expect(view.get('.ref').getAttribute('title')).toBe(name);
		view.destroy();
	});
});

describe('ScreenStub', () => {
	it('states what the screen will be and that it is not built', () => {
		const view = render(ScreenStub, {
			title: 'Branches',
			purpose: 'See every branch, how far it has drifted, and act on it.',
			parts: ['Filter field and chips', 'Columns: branch | ahead / behind']
		});

		expect(view.text()).toContain('Branches');
		expect(view.text()).toContain('how far it has drifted');
		expect(view.all('li')).toHaveLength(2);
		// The honesty is the point of the component.
		expect(view.text()).toContain('Not built yet');

		view.destroy();
	});

	it('renders without any parts', () => {
		const view = render(ScreenStub, { title: 'Clone', purpose: 'Bring a repository in.' });
		expect(view.all('li')).toHaveLength(0);
		view.destroy();
	});

	it('renders an actions snippet when one is given', () => {
		const view = render(ScreenStub, {
			title: 'Your repositories',
			purpose: 'Every repository you work in.',
			actions: textSnippet('Open repository…')
		});
		expect(view.text()).toContain('Open repository…');
		view.destroy();
	});
});
