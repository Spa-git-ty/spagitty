// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The confirmation and prompt dialog, store and component together.
 *
 * They are tested in one file because they are one feature: `Dialog.svelte`
 * holds no state of its own — it renders `dialog.question` and calls back into
 * the store — so a component test that mocked the store would assert nothing
 * about what a user gets.
 *
 * What matters here is the promise contract. Every destructive action in
 * GitLumiere reads `if (!(await dialog.confirm(…))) return;`, so a dialog that
 * resolves the wrong way, or fails to resolve at all, either performs an
 * operation the user cancelled or hangs the caller forever.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { click, flushSync, press, render } from '../../testing/mount';
import Dialog from './Dialog.svelte';
import { dialog } from './dialog.svelte';

/** No test may leave a question open: the store is a module-level singleton. */
afterEach(() => {
	dialog.dismiss();
});

const confirmation = {
	title: 'Delete branch',
	body: 'feature/x has commits that are on no other branch.',
	confirmLabel: 'Delete'
};

const naming = {
	title: 'Create a branch',
	body: 'It starts at the selected commit.',
	label: 'Name',
	confirmLabel: 'Create'
};

describe('dialog store — confirmations', () => {
	it('resolves true when accepted', async () => {
		const answer = dialog.confirm(confirmation);
		dialog.accept();
		expect(await answer).toBe(true);
		expect(dialog.question).toBeNull();
	});

	it('resolves false when dismissed', async () => {
		const answer = dialog.confirm(confirmation);
		dialog.dismiss();
		expect(await answer).toBe(false);
		expect(dialog.question).toBeNull();
	});

	it('is never blocked, because there is nothing to type', () => {
		dialog.confirm(confirmation);
		expect(dialog.blocked).toBe(false);
	});

	it('is not dangerous unless it says so', () => {
		dialog.confirm(confirmation);
		expect(dialog.question?.danger).toBe(false);

		dialog.confirm({ ...confirmation, danger: true });
		expect(dialog.question?.danger).toBe(true);
	});
});

describe('dialog store — prompts', () => {
	it('resolves the typed text, trimmed', async () => {
		const answer = dialog.prompt(naming);
		dialog.setDraft('  release/v2  ');
		dialog.accept();
		expect(await answer).toBe('release/v2');
	});

	it('resolves null when dismissed', async () => {
		const answer = dialog.prompt(naming);
		dialog.setDraft('discarded');
		dialog.dismiss();
		expect(await answer).toBeNull();
	});

	it('starts from the given value, and empty without one', () => {
		dialog.prompt({ ...naming, value: 'feature/FEAT-030-rail' });
		expect(dialog.draft).toBe('feature/FEAT-030-rail');

		dialog.dismiss();
		dialog.prompt(naming);
		expect(dialog.draft).toBe('');
	});

	it('blocks on an empty name, and on whitespace alone', () => {
		dialog.prompt(naming);
		expect(dialog.blocked).toBe(true);

		dialog.setDraft('   ');
		expect(dialog.blocked).toBe(true);

		dialog.setDraft('x');
		expect(dialog.blocked).toBe(false);
	});

	it('refuses to accept while blocked, leaving the question open', async () => {
		const answer = dialog.prompt(naming);
		const settled = vi.fn();
		answer.then(settled);

		dialog.accept();
		await Promise.resolve();

		expect(settled).not.toHaveBeenCalled();
		expect(dialog.question).not.toBeNull();
	});

	it('carries the label and placeholder through to the question', () => {
		dialog.prompt({ ...naming, placeholder: 'feature/…' });
		expect(dialog.question?.label).toBe('Name');
		expect(dialog.question?.placeholder).toBe('feature/…');
	});
});

describe('dialog store — one question at a time', () => {
	/**
	 * The contract the store's own doc comment states: a replaced question
	 * settles, because "silently dropping the second would leave its caller
	 * awaiting forever".
	 *
	 * BUG-007 tightened these. They previously asserted only settlement and
	 * falsiness, because `ask()` settled the outgoing question with the
	 * *incoming* one's cancel value and a replaced prompt therefore resolved
	 * `false`. The exact value is now pinned in both directions.
	 */
	it('answers a replaced confirmation with false', async () => {
		const first = dialog.confirm(confirmation);
		dialog.prompt(naming);

		expect(await first).toBe(false);
		expect(dialog.question?.kind).toBe('prompt');
	});

	it('answers a replaced prompt with null', async () => {
		const first = dialog.prompt(naming);
		dialog.confirm(confirmation);

		expect(await first).toBeNull();
		expect(dialog.question?.kind).toBe('confirm');
	});

	it('answers a replaced question the same way whichever kind replaces it', async () => {
		const promptThenPrompt = dialog.prompt(naming);
		dialog.prompt({ ...naming, title: 'Create a tag' });
		expect(await promptThenPrompt).toBeNull();

		dialog.dismiss();

		const confirmThenConfirm = dialog.confirm(confirmation);
		dialog.confirm({ ...confirmation, title: 'Delete tag' });
		expect(await confirmThenConfirm).toBe(false);
	});

	/**
	 * BUG-007's regression test, at the layer the defect actually bit.
	 *
	 * `graph/actions.ts` guards every prompt with `if (name === null) return`.
	 * A replaced prompt resolving `false` passed that guard, so the action ran
	 * on with a boolean where a branch name belongs — creating a branch called
	 * `false`, or failing in whatever way the backend does with a non-string.
	 */
	it('resolves a replaced prompt to something its callers’ null guard catches', async () => {
		const name = dialog.prompt(naming);
		dialog.confirm(confirmation);
		const answer = await name;

		// The exact shape of the guard in graph/actions.ts:84, :99 and :302.
		expect(answer === null).toBe(true);
		expect(typeof answer).not.toBe('boolean');
		expect(typeof answer).not.toBe('string');
	});

	it('ignores accept and dismiss when nothing is being asked', () => {
		expect(dialog.question).toBeNull();
		expect(() => dialog.accept()).not.toThrow();
		expect(() => dialog.dismiss()).not.toThrow();
		expect(dialog.question).toBeNull();
	});
});

describe('Dialog component', () => {
	it('renders nothing until something is asked', () => {
		const view = render(Dialog, {});
		expect(view.find('.panel')).toBeNull();
		view.destroy();
	});

	it('shows a confirmation without a field', () => {
		const view = render(Dialog, {});
		dialog.confirm(confirmation);
		flushSync();

		expect(view.get('.title').textContent).toBe('Delete branch');
		expect(view.get('.body').textContent).toContain('no other branch');
		expect(view.find('input')).toBeNull();

		view.destroy();
	});

	it('shows a prompt with its field, label and placeholder', () => {
		const view = render(Dialog, {});
		dialog.prompt({ ...naming, value: 'main', placeholder: 'branch name' });
		flushSync();

		const field = view.get('input') as HTMLInputElement;
		expect(field.value).toBe('main');
		expect(field.placeholder).toBe('branch name');
		expect(view.get('.field').textContent).toContain('Name');

		view.destroy();
	});

	it('sends typing back to the store', () => {
		const view = render(Dialog, {});
		dialog.prompt(naming);
		flushSync();

		const field = view.get('input') as HTMLInputElement;
		field.value = 'hotfix/BUG-006';
		field.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(dialog.draft).toBe('hotfix/BUG-006');
		view.destroy();
	});

	it('accepts on Enter and dismisses on Escape', async () => {
		const view = render(Dialog, {});

		const accepted = dialog.confirm(confirmation);
		flushSync();
		press(view.get('.panel'), 'Enter');
		expect(await accepted).toBe(true);

		const dismissed = dialog.confirm(confirmation);
		flushSync();
		press(view.get('.panel'), 'Escape');
		expect(await dismissed).toBe(false);

		view.destroy();
	});

	it('dismisses on a backdrop click, but not on a click inside the panel', async () => {
		const view = render(Dialog, {});

		const ignored = dialog.confirm(confirmation);
		flushSync();
		click(view.get('.panel'));
		expect(dialog.question).not.toBeNull();

		click(view.get('.backdrop'));
		expect(await ignored).toBe(false);

		view.destroy();
	});

	it('wires Cancel and the affirmative button', async () => {
		const view = render(Dialog, {});

		const cancelled = dialog.confirm(confirmation);
		flushSync();
		const [cancel, affirm] = view.all('button');
		expect(affirm.textContent?.trim()).toBe('Delete');

		click(cancel);
		expect(await cancelled).toBe(false);

		const accepted = dialog.confirm(confirmation);
		flushSync();
		click(view.all('button')[1]);
		expect(await accepted).toBe(true);

		view.destroy();
	});

	it('disables the affirmative button while a prompt is empty', () => {
		const view = render(Dialog, {});
		dialog.prompt(naming);
		flushSync();

		const affirm = view.all('button')[1] as HTMLButtonElement;
		expect(affirm.disabled).toBe(true);

		dialog.setDraft('release/v2');
		flushSync();
		expect(affirm.disabled).toBe(false);

		view.destroy();
	});

	/**
	 * A destructive confirmation drops the travelling glow. The glow means "this
	 * is the thing to do next", and on a delete it is not — reading the sentence
	 * above it is.
	 */
	it('takes the glow off a dangerous action', () => {
		const view = render(Dialog, {});

		dialog.confirm(confirmation);
		flushSync();
		expect(view.all('button')[1].classList.contains('glow')).toBe(true);

		dialog.confirm({ ...confirmation, danger: true });
		flushSync();
		expect(view.all('button')[1].classList.contains('glow')).toBe(false);

		view.destroy();
	});
});
