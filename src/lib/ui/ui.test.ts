// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from 'vitest';
import { click, render, textSnippet } from '../../testing/mount';
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

describe('RefChip', () => {
	it('marks the current branch with a check', () => {
		const view = render(RefChip, { chip: { name: 'main', kind: 'branch', current: true } });
		const element = view.get('.ref');

		expect(element.classList.contains('current')).toBe(true);
		expect(view.text()).toContain('✔');
		expect(view.text()).toContain('main');

		view.destroy();
	});

	it('does not check a branch that is not current', () => {
		const view = render(RefChip, {
			chip: { name: 'chore/tooling', kind: 'branch', current: false }
		});

		expect(view.text()).not.toContain('✔');
		expect(view.get('.ref').classList.contains('current')).toBe(false);

		view.destroy();
	});

	it('tells a tag from a branch without a label or an icon', () => {
		const tag = render(RefChip, { chip: { name: 'v0.2.0', kind: 'tag', current: false } });
		const branch = render(RefChip, { chip: { name: 'main', kind: 'branch', current: false } });

		expect(tag.get('.ref').classList.contains('tag')).toBe(true);
		expect(branch.get('.ref').classList.contains('tag')).toBe(false);

		tag.destroy();
		branch.destroy();
	});

	it('marks a remote', () => {
		const view = render(RefChip, {
			chip: { name: 'origin/main', kind: 'remote', current: false }
		});
		expect(view.get('.ref').classList.contains('remote')).toBe(true);
		view.destroy();
	});

	it('carries the full name as a title, since the chip elides', () => {
		const name = 'feature/a-branch-name-far-too-long-for-the-gutter';
		const view = render(RefChip, { chip: { name, kind: 'branch', current: false } });
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
