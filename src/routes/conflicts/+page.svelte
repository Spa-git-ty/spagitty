<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import ScreenStub from '$lib/ui/ScreenStub.svelte';
</script>

<ScreenStub
	title="Merge conflict"
	purpose="Resolve a conflicted file: ours, theirs, or an edited result."
	parts={[
		'Conflict pager chips and Abort merge',
		'Three equal panes: Ours — HEAD, Merged result · editable, Theirs — incoming',
		'Nothing is committed until you finish; the pre-merge state stays in the stash'
	]}
/>
