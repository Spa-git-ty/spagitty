<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import ScreenStub from '$lib/ui/ScreenStub.svelte';
</script>

<ScreenStub
	title="Stash"
	purpose="Graph-style view of stash entries, each hanging off the commit it was made on."
	parts={[
		'Lane column where each entry hangs off its parent commit',
		'Entries marked with a stash@{n} ref chip',
		'Detail panel: Pop, Apply — keep in stash, Drop',
		'Popping restores the changes to the working copy, ready to commit'
	]}
/>
