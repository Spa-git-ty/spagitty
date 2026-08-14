<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as api from '$lib/api';
	import { theme } from '$lib/theme.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import ScreenStub from '$lib/ui/ScreenStub.svelte';
	import { version } from '$lib/version';
	import type { About } from '$lib/types';

	let about = $state<About | null>(null);

	onMount(() => {
		if (api.inTauri()) api.about().then((a) => (about = a));
	});
</script>

<div class="screen">
	<ScreenStub
		title="Settings"
		purpose="Identity, accounts, behaviour, appearance, and the licenses this build is made of."
		parts={[
			'Chip index: You, Accounts, Behaviour, Appearance, Advanced',
			'Toggles: Sign my commits, Ask before rewriting history, Show the git command behind each action',
			'Accounts: connected hosts, ssh key + token in the OS keychain',
			'Advanced → About: this build, its commit, and every dependency license'
		]}
	>
		{#snippet actions()}
			<Chip onclick={() => theme.toggle()}>{theme.isDark ? 'light' : 'dark'} theme</Chip>
		{/snippet}
	</ScreenStub>

	<!--
		The GPL-3 obligations are not deferred until the Settings screen is
		built: the license, and the exact commit this binary was built from, are
		shown from the first commit.
	-->
	<footer class="about note">
		<div>GitLord v{about?.version ?? version.number} · {about?.license ?? version.license}</div>
		<div class="mono">build {about?.commit ?? version.commit}</div>
		<div class="trademark">
			GitLord is not affiliated with, endorsed by, or sponsored by the Git project or the
			Software Freedom Conservancy. Git and the Git logo are trademarks of the Software
			Freedom Conservancy.
		</div>
	</footer>
</div>

<style>
	.screen {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.about {
		flex: none;
		padding: 10px 12px;
		border-top: 1.5px solid var(--soft);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.trademark {
		max-width: 620px;
	}
</style>
