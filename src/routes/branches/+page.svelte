<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import ScreenStub from '$lib/ui/ScreenStub.svelte';
</script>

<ScreenStub
	title="Branches"
	purpose="See every branch, how far it has drifted, and act on it."
	parts={[
		'Filter field and chips: mine, origin, upstream, merged, stale',
		'Columns: branch | ahead / behind | last change | actions',
		'Merged branches render dashed with Delete',
		'Footer offers to remove the merged ones in one go'
	]}
/>
