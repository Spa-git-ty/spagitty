<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { repo } from '$lib/repo.svelte';
	import RequestDetail from '$lib/requests/RequestDetail.svelte';
	import RequestRow from '$lib/requests/RequestRow.svelte';
	import { requests } from '$lib/requests/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import { panels } from '$lib/panels.svelte';
	import Splitter from '$lib/ui/Splitter.svelte';

	/**
	 * What is waiting on you, above what is waiting on everyone else.
	 *
	 * The one screen in Spagitty whose data comes off the network (FEAT-017).
	 * Read once when the repository changes and on demand — not on a timer:
	 * polling a host on a schedule nobody asked for spends somebody's rate
	 * limit while they are not looking at the screen.
	 *
	 * Every failure is the host's own sentence. "Could not load" is useless to
	 * somebody deciding whether to wait or to go and fix something, and offline,
	 * rate limited, refused and no-account are four different decisions.
	 */
	const needingYou = $derived(requests.needingYou);
	const waiting = $derived(requests.waitingOnOthers);

	let generation: number | null = null;
	$effect(() => {
		const current = repo.generation;
		if (repo.info === null) return;
		if (generation === current) return;

		generation = current;
		untrack(() => {
			requests.clear();
			requests.load();
		});
	});

	/** Whether the request detail panel is put away (FEAT-054). */
	const detailHidden = $derived(panels.isHidden('requestsDetail'));
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">Pull requests</span>
			{#if requests.repo}
				<span class="note mono">{requests.repo.owner}/{requests.repo.name}</span>
			{/if}
			{#if requests.connected && requests.all.length > 0}
				<span class="note">
					{needingYou.length} waiting on you · {waiting.length} on others
				</span>
			{/if}
		</div>
		<div class="right">
			{#if requests.loading}<span class="note">Reading…</span>{/if}
			<Btn disabled={requests.loading} onclick={() => requests.load()}>Refresh</Btn>
			<!-- The same put-it-away control the graph's detail panel has. -->
			<button
				class="panel-toggle"
				aria-label={detailHidden ? 'Show the request panel' : 'Hide the request panel'}
				title={detailHidden ? 'Show the request panel' : 'Hide the request panel'}
				aria-pressed={!detailHidden}
				onclick={() => panels.toggleHidden('requestsDetail')}
			>
				<Icon name={detailHidden ? 'chevron-left' : 'chevron-right'} size="1.1em" />
			</button>
		</div>
	</header>

	<div class="body">
		<div class="lists">
			{#if requests.error}
				<!--
					The host's own words. Offline, rate limited, refused and
					"no account for this host" are four different decisions for
					the reader, and the backend already told them apart.
				-->
				<div class="empty">
					<p class="note error">{requests.error}</p>
					<Btn onclick={() => goto('/settings#accounts')}>Settings → Accounts</Btn>
				</div>
			{:else if requests.repo === null}
				<div class="empty">
					<p class="note">This repository is not on a service Spagitty can read.</p>
					<p class="note">
						Pull requests are read from the host the <span class="mono">origin</span>
						remote points at. This repository's remotes do not name one — which is not a
						problem, only nothing to show here.
					</p>
				</div>
			{:else if !requests.connected}
				<div class="empty">
					<p class="note">No account is connected.</p>
					<p class="note">
						Spagitty reads pull requests from whichever service hosts your
						repository, and no service is connected yet. Connect one in Settings →
						Accounts and they appear here.
					</p>
					<Btn primary onclick={() => goto('/settings#accounts')}>
						Settings → Accounts
					</Btn>
				</div>
			{:else if requests.all.length === 0}
				<p class="note">Nothing open. Every pull request on this repository is closed.</p>
			{:else}
				{#if needingYou.length > 0}
					<section class="group">
						<h2 class="note heading">Needs you</h2>
						<ul class="list">
							{#each needingYou as request (request.id)}
								<RequestRow {request} />
							{/each}
						</ul>
					</section>
				{/if}

				{#if waiting.length > 0}
					<section class="group">
						<h2 class="note heading">Waiting on others</h2>
						<ul class="list">
							{#each waiting as request (request.id)}
								<RequestRow {request} waiting />
							{/each}
						</ul>
					</section>
				{/if}
			{/if}
		</div>

		{#if requests.connected && requests.all.length > 0}
			{#if !detailHidden}
				<Splitter panel="requestsDetail" label="Resize the request detail panel" />
				<RequestDetail />
			{/if}
		{/if}
	</div>

</div>

<style>
	.screen {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 12px;
		background-color: var(--chrome-veil);
		background-image: var(--glass-sheen);
		border-bottom: 1px solid color-mix(in srgb, var(--line) 55%, transparent);
		box-shadow:
			var(--glass-rim),
			0 1px 3px color-mix(in srgb, var(--umbra) 7%, transparent);
		position: relative;
		z-index: 1;
		flex: none;
	}

	.right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.left {
		display: flex;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
	}

	.title {
		font-size: var(--fs-title);
	}

	.body {
		flex: 1;
		min-height: 0;
		display: flex;
		min-width: 0;
	}

	.lists {
		flex: 1;
		min-width: 0;
		overflow: auto;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.heading {
		margin: 0 0 6px;
		font-size: var(--fs-secondary);
		font-weight: inherit;
	}

	.list {
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		max-width: 520px;
	}


	.panel-toggle {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: var(--r-button);
		color: var(--muted);
		transition:
			background var(--t-fast) var(--ease),
			color var(--t-fast) var(--ease),
			transform var(--t-fast) var(--spring);
	}

	.panel-toggle:hover {
		background: var(--hover);
		color: var(--accent);
	}

	.panel-toggle:active {
		transform: scale(0.92);
	}
</style>
