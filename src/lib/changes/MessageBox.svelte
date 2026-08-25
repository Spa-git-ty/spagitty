<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { changes } from '$lib/changes/store.svelte';
	import { describeSigningProblem as signingProblem } from '$lib/settings/describe';
	import Chip from '$lib/ui/Chip.svelte';

	/**
	 * Subject, a divider, then the body — the shape of a commit message rather
	 * than a single box people are expected to remember the convention for.
	 *
	 * The subject counter appears only once the line is long: git's own
	 * convention is 50 characters, and a number that is always on screen reads
	 * as a limit rather than as a warning.
	 *
	 * Signing is said here, before the button, rather than reported after a
	 * failure (FEAT-019). "commit failed" is a bad way to learn that gpg was
	 * never installed, and both of the things that stop a signature happening
	 * are knowable now.
	 */

	const SUBJECT_HINT = 50;

	const subject = $derived(changes.subject);
	const over = $derived(subject.length > SUBJECT_HINT);

	const signing = $derived(changes.signing);

	/**
	 * What this commit will do about a signature, or null to say nothing.
	 *
	 * Silent when signing is off, which is the ordinary case: a note saying
	 * "this will not be signed" on every commit in a repository that never signs
	 * is noise on every commit.
	 */
	const willSign = $derived.by(() => {
		if (signing === null || !signing.enabled) return null;
		if (signing.problem) return { tone: 'warn' as const, text: signingProblem(signing.problem) };
		return {
			tone: 'note' as const,
			text: `This commit will be signed with ${signing.program}.`
		};
	});
</script>

<div class="message">
	<div class="subject-row">
		<input
			class="subject"
			type="text"
			placeholder="Summary of this commit"
			value={subject}
			oninput={(event) => changes.setSubject(event.currentTarget.value)}
			aria-label="Commit subject"
		/>
		{#if over}
			<span class="mono muted count" title="git's convention is {SUBJECT_HINT} characters">
				{subject.length}
			</span>
		{/if}
	</div>

	<div class="hr"></div>

	<textarea
		class="body"
		placeholder="Why, if the summary is not enough"
		value={changes.body}
		oninput={(event) => changes.setBody(event.currentTarget.value)}
		aria-label="Commit body"
	></textarea>

	{#if willSign}
		<div class="note signing" class:warn={willSign.tone === 'warn'}>{willSign.text}</div>
	{/if}

	<div class="row">
		<Chip
			active={changes.amend}
			onclick={() => changes.setAmend(!changes.amend)}
			title="Replace the previous commit instead of adding one"
		>
			amend the previous commit
		</Chip>
		{#if changes.amend}
			<span class="note">This rewrites the last commit rather than adding to history.</span>
		{/if}
	</div>
</div>

<style>
	.message {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px 10px;
		border-bottom: 1.5px solid var(--soft);
	}

	.subject-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.subject,
	.body {
		width: 100%;
		background: transparent;
		border: none;
		color: var(--ink);
		font-family: var(--font-ui);
		font-size: var(--fs-ui);
		padding: 2px 0;
	}

	.subject:focus,
	.body:focus {
		outline: none;
	}

	.subject::placeholder,
	.body::placeholder {
		color: var(--placeholder);
	}

	.body {
		min-height: 52px;
		resize: vertical;
		font-size: var(--fs-secondary);
		line-height: var(--lh-ui);
	}

	.count {
		flex: none;
		color: var(--accent);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* A statement, not an alarm: signing being on is the ordinary case for
	   anyone who signs. The warning colour is kept for the case where it is on
	   and cannot work, which is the one worth interrupting for. */
	.signing {
		border-left: 1.5px solid var(--line);
		padding-left: 6px;
	}

	.signing.warn {
		border-left-color: var(--accent);
		color: var(--ink);
	}
</style>
