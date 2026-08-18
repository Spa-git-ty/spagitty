<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import RequestDetail from '$lib/requests/RequestDetail.svelte';
	import RequestRow from '$lib/requests/RequestRow.svelte';
	import { requests } from '$lib/requests/store.svelte';
	import Btn from '$lib/ui/Btn.svelte';

	/**
	 * What is waiting on you, above what is waiting on everyone else.
	 *
	 * **GitLumiere talks to no hosting service**, and nothing here does either: no
	 * HTTP client is linked into this application, in either language. The
	 * layout and the empty state are real; the data is FEAT-017.
	 *
	 * The empty state is the screen rather than a placeholder. "No account is
	 * connected" tells the user the screen works and the account does not,
	 * which is more useful than "not built yet".
	 */
	const needingYou = $derived(requests.needingYou);
	const waiting = $derived(requests.waitingOnOthers);
</script>

<div class="screen">
	<header class="head">
		<div class="left">
			<span class="title">Pull requests</span>
			{#if requests.connected && requests.all.length > 0}
				<span class="note">
					{needingYou.length} waiting on you · {waiting.length} on others
				</span>
			{/if}
		</div>
	</header>

	<div class="body">
		<div class="lists">
			{#if requests.error}
				<p class="note error">{requests.error}</p>
			{:else if !requests.connected}
				<div class="empty">
					<p class="note">No account is connected.</p>
					<p class="note">
						GitLumiere reads pull requests from whichever service hosts your
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
			<RequestDetail />
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
		border-bottom: 1.5px solid var(--soft);
		flex: none;
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

</style>
