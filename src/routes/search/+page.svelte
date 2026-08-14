<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import ScreenStub from '$lib/ui/ScreenStub.svelte';
</script>

<ScreenStub
	title="Log search"
	purpose="Find commits by author, path, message or date, and see who last touched each line."
	parts={[
		'Query field with removable filter chips: author:, path:, message:, date range',
		'Results as graph-style rows',
		'280px column: file / person / branch lookups and a blame strip',
		'↵ opens the commit · ⌥↵ opens its diff'
	]}
/>
