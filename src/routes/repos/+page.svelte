<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { repo } from '$lib/repo.svelte';
	import Btn from '$lib/ui/Btn.svelte';
	import ScreenStub from '$lib/ui/ScreenStub.svelte';
</script>

<ScreenStub
	title="Your repositories"
	purpose="Every repository you work in, and which ones need attention."
	parts={[
		'300px cards in a wrapping grid: name, state chip, path + branch, status chips',
		'Idle repositories render as dashed cards with a one-line status',
		'Repositories are read straight from disk. Nothing is uploaded anywhere.'
	]}
>
	{#snippet actions()}
		<Btn primary onclick={() => repo.choose()}>Open repository…</Btn>
	{/snippet}
</ScreenStub>
