<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import ScreenStub from '$lib/ui/ScreenStub.svelte';
</script>

<ScreenStub
	title="Interactive rebase"
	purpose="Plan a history rewrite, see the result, then apply it."
	parts={[
		'Todo column: drag handle ⠿, action chip pick / squash / reword / drop, short SHA',
		'Result preview: recomputed, nothing executed yet',
		'The reflog keeps the old history for 30 days — Undo restores it',
		'Planned in Rust; executed by the git binary (see shell.rs)'
	]}
/>
