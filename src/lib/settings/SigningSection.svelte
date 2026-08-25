<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import { describeOrigin, describeSigningFormat, describeSigningProblem } from './describe';
	import { settings } from './store.svelte';

	/**
	 * Commit signing: `commit.gpgsign`, read from and written to git's own
	 * configuration (FEAT-019).
	 *
	 * It sits under **You** rather than under Behaviour, and that placement is
	 * the decision this section records. Behaviour holds Spagitty's own
	 * preferences; this is git's, in the file every other tool reads. A second
	 * switch in the preferences file would disagree with this one the first time
	 * someone ran `git config commit.gpgsign` in a terminal.
	 *
	 * It shares the identity's scope chip, because it is the same choice — a
	 * signing preference is usually global and sometimes overridden for one
	 * repository, exactly like an email address.
	 *
	 * The section says whether a signature would actually happen, not only
	 * whether it was asked for. A missing signing program or an ssh format with
	 * no key are both knowable now, and finding out at the point of commit is
	 * the whole point of saying it here.
	 */

	const signing = $derived(settings.signing);

	/** What the chosen scope holds, which is what the chip is showing. */
	const inScope = $derived.by(() => {
		if (signing === null) return null;
		return settings.scope === 'local' ? signing.local : signing.global;
	});

	/**
	 * Signing is on in effect, but not because of the file being edited.
	 *
	 * The same confusion the identity fields are shaped around: turning the chip
	 * off here would look like it worked and change nothing.
	 */
	const overridden = $derived.by(() => {
		if (signing === null) return null;
		if (settings.scope === 'global' && signing.origin === 'local') {
			return 'This repository sets its own, so changing the global value will not change what it commits with.';
		}
		if (signing.origin === 'system' || signing.origin === 'environment') {
			return 'Something outside both of these files is winning, so a change here will not take effect.';
		}
		return null;
	});
</script>

<section class="section">
	<header class="row">
		<h2 class="heading">Signing</h2>
		<span class="note">Whether your commits carry a cryptographic signature.</span>
	</header>

	{#if signing === null}
		<p class="note">Reading the git configuration…</p>
	{:else}
		<div class="row">
			<Chip
				active={signing.enabled}
				disabled={settings.busy}
				onclick={() => settings.setSigning(!signing.enabled)}
				title="Writes commit.gpgsign in the scope chosen above"
			>
				{signing.enabled ? 'on' : 'off'}
			</Chip>
			<div class="text">
				<div>Sign my commits</div>
				<div class="note">
					Commits are made with <span class="mono">--gpg-sign</span>, through
					{describeSigningFormat(signing.format)}.
				</div>
			</div>
		</div>

		<p class="note under">
			In effect: <span class="mono">commit.gpgsign = {signing.enabled}</span> — {describeOrigin(
				signing.origin
			)}
		</p>

		{#if overridden}
			<p class="note under warn">{overridden}</p>
		{/if}

		{#if signing.problem}
			<p class="note under warn">{describeSigningProblem(signing.problem)}</p>
		{/if}

		{#if signing.key}
			<p class="note under">
				Key: <span class="mono">{signing.key}</span> (<span class="mono">user.signingkey</span>)
			</p>
		{:else if signing.format === 'openPgp'}
			<p class="note under">
				No <span class="mono">user.signingkey</span> is set. GPG will look for a key matching your
				committer address, which is how git behaves without one.
			</p>
		{/if}

		<div class="row">
			<span class="note">
				{settings.scope === 'local' ? 'This repository' : 'Your global configuration'} holds
				{#if inScope === null}
					nothing, so the value above comes from somewhere else
				{:else}
					<span class="mono">{inScope}</span>
				{/if}
			</span>
			<Btn
				disabled={settings.busy || inScope === null}
				title="Remove commit.gpgsign from this file, letting the next one up decide"
				onclick={() => settings.clearSigning()}
			>
				Clear
			</Btn>
		</div>

		<p class="note">
			Written with <span class="mono">git config {settings.scope === 'local'
				? '--local'
				: '--global'} commit.gpgsign</span>, so it is the same switch your own
			<span class="mono">git</span> reads. Turning it off writes
			<span class="mono">false</span> rather than removing the key — in a repository whose global
			setting is on, that is the difference between "not here" and "ask again".
		</p>

		<p class="note">
			Spagitty does not create, import or store signing keys. It uses the program git is already
			configured with, so a passphrase prompt is the one you have configured — and a signer that
			cannot ask fails rather than hanging.
		</p>
	{/if}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 640px;
	}

	.heading {
		margin: 0;
		font-size: var(--fs-ui);
		font-weight: inherit;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.text {
		min-width: 0;
	}

	.under {
		margin: -4px 0 4px 0;
	}

	.warn {
		color: var(--ink);
	}

	p {
		margin: 0;
	}
</style>
