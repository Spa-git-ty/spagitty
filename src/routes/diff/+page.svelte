<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { page } from '$app/state';
	import ScreenStub from '$lib/ui/ScreenStub.svelte';

	const commit = $derived(page.url.searchParams.get('commit'));
</script>

<ScreenStub
	title={commit ? `Diff · ${commit.slice(0, 7)}` : 'Diff'}
	purpose="Full-window takeover showing one commit's changes, hunk by hunk."
	parts={[
		'Header: ← Graph, Diff · <sha>, file and line counts, unified/split toggle',
		'210px file list with status glyphs and per-file +n −m',
		'Diff pane; split view labels its columns before / after',
		'Footer: Prev file / Next file, 1 of 4',
		'j / k jumps between hunks. Esc goes back to the graph.'
	]}
/>
