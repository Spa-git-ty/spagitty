<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import { untrack } from 'svelte';
	import ActivityDrawer from '$lib/farm/components/ActivityDrawer.svelte';
	import type { RecordedEvent, Task } from '$lib/farm/types';

	/**
	 * A drawer whose events can change after it is mounted.
	 *
	 * The mount helper passes props once, and a plain `.test.ts` cannot hold a
	 * `$state` of its own — so a component that can is the only way to assert
	 * on what the drawer does *while events arrive*, which is the whole
	 * behaviour of Hold. It lives here rather than in `$lib` because it is
	 * scaffolding, and `src/testing/` is outside the coverage denominator.
	 */
	interface Props {
		events: RecordedEvent[];
		tasks?: Task[];
		transcript?: (task: string) => string[];
		/** Called once with a function the test uses to push an event in. */
		register: (push: (event: RecordedEvent) => void) => void;
	}

	let { events: initial, tasks = [], transcript = () => [], register }: Props = $props();

	// `untrack`, because both of these are read once at setup and the compiler
	// is right to ask whether that was meant.
	let events = $state<RecordedEvent[]>(untrack(() => initial));
	untrack(() =>
		register((event) => {
			events = [...events, event];
		})
	);
</script>

<ActivityDrawer {events} {tasks} {transcript} collapsed={false} ontoggle={() => {}} />
