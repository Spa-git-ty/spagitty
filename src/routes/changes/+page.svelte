<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import ScreenStub from '$lib/ui/ScreenStub.svelte';
</script>

<ScreenStub
	title="Commit"
	purpose="Stage what you mean to commit, write the message, commit."
	parts={[
		'Message box: subject line, divider, body',
		'250px column: Staged (solid rows) and Unstaged (dashed rows), glyphs + ~ − ?',
		'Hunk pane with stage hunk / unstage hunk chips',
		'Footer: nothing is committed until you press the button'
	]}
/>
