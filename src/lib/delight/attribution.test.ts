// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Who a commit belongs to (FEAT-072).
 *
 * The agent farm does not exist yet, and this is the one way an agent can earn
 * a reputation in a repository today: it signs its work with a trailer, the
 * same trailer every other tool in the ecosystem reads. Getting this wrong in
 * the generous direction is the failure that matters — crediting a person's
 * commit to a model because the word "claude" appeared in the body would make
 * the agent comparison worthless from the first day.
 */

import { describe, expect, it } from 'vitest';
import { agentFromMessage, isDefaultBranch } from './events';

describe('reading a trailer', () => {
	it('credits the agent a co-author trailer names', () => {
		const found = agentFromMessage(
			'feat: add the thing\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>'
		);

		expect(found?.kind).toBe('claude');
		expect(found?.name).toBe('Claude Opus 5');
	});

	it('reads the trailer however it is cased or spaced', () => {
		expect(agentFromMessage('x\n\nco-authored-by: codex <a@b>')?.kind).toBe('codex');
		expect(agentFromMessage('x\n\n   Co-authored-by:  Gemini <a@b>  ')?.kind).toBe('gemini');
		expect(agentFromMessage('x\n\nCo-Authored-By: GPT-5 <a@b>')?.kind).toBe('gpt');
	});

	it('credits nobody when the trailer names a person', () => {
		expect(agentFromMessage('x\n\nCo-authored-by: Ada Lovelace <ada@example.com>')).toBeNull();
	});

	it('credits nobody for a body that merely mentions a model', () => {
		// The failure that would matter: this is a human commit that talks about
		// an agent, and it must stay a human commit.
		expect(
			agentFromMessage('fix: undo what claude did to the parser\n\nIt was wrong about GPT too.')
		).toBeNull();
	});

	it('takes the first agent when several are credited', () => {
		const found = agentFromMessage(
			'x\n\nCo-authored-by: Ada <ada@example.com>\nCo-authored-by: Claude <a@b>\nCo-authored-by: Codex <c@d>'
		);

		expect(found?.kind).toBe('claude');
	});

	it('survives a message with no trailers at all', () => {
		expect(agentFromMessage('')).toBeNull();
		expect(agentFromMessage('one line')).toBeNull();
	});
});

describe('the default branch', () => {
	it('knows the three names that mean trunk', () => {
		expect(isDefaultBranch('main')).toBe(true);
		expect(isDefaultBranch('master')).toBe(true);
		expect(isDefaultBranch('trunk')).toBe(true);
	});

	it('is not fooled by a branch that starts with one of them', () => {
		expect(isDefaultBranch('mainly-tests')).toBe(false);
		expect(isDefaultBranch('feature/main')).toBe(false);
	});

	it('says no rather than throwing on a detached HEAD', () => {
		expect(isDefaultBranch(null)).toBe(false);
	});
});
