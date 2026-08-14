<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import ScreenStub from '$lib/ui/ScreenStub.svelte';
</script>

<ScreenStub
	title="Pull requests"
	purpose="What is waiting on you, and what is waiting on everyone else."
	parts={[
		'Needs you: solid rows with review / resolve chips',
		'Waiting on others: dashed rows with approvals, checks, draft status',
		'Detail panel: status chips, file list, merge-style chips',
		'Host-agnostic: the hosting service is a detail, not the vocabulary'
	]}
/>
