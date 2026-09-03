<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	import Btn from '$lib/ui/Btn.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import { AGENT_CAPABILITIES, AGENT_ROLES } from '../options';
	import { availabilityLabel, PROVIDER_LABELS } from '../describe';
	import type { AgentCapability, AgentRole, AgentStatus } from '../types';

	/**
	 * One agent, in Farm settings (FEAT-073).
	 *
	 * Detection and configuration are shown as two separate things, because
	 * they are: the top line is a fact about the machine that nobody edits, and
	 * everything under it is the user's. Merging them would make "not installed"
	 * look like a setting somebody chose.
	 */
	interface Props {
		agent: AgentStatus;
		onsave: (agent: AgentStatus['definition']) => void;
		onremove: (id: string) => void;
	}

	let { agent, onsave, onremove }: Props = $props();

	const definition = $derived(agent.definition);
	const available = $derived(agent.availability.state === 'available');

	function toggleCapability(capability: AgentCapability): void {
		const has = definition.capabilities.includes(capability);
		onsave({
			...definition,
			capabilities: has
				? definition.capabilities.filter((entry) => entry !== capability)
				: [...definition.capabilities, capability]
		});
	}
</script>

<article class="card" class:off={!definition.enabled}>
	<header class="head">
		<span class="name">{definition.displayName}</span>
		<Chip title={PROVIDER_LABELS[definition.provider]}>{PROVIDER_LABELS[definition.provider]}</Chip>
		<span class="state" class:available class:broken={agent.availability.state === 'broken'}>
			{availabilityLabel(agent.availability)}
		</span>
	</header>

	<p class="note path mono">{definition.executable}</p>

	<div class="line">
		<span class="note label">Role</span>
		<div class="chips">
			{#each AGENT_ROLES as role (role.id)}
				<Chip
					active={definition.role === role.id}
					onclick={() => onsave({ ...definition, role: role.id as AgentRole })}
				>
					{role.label}
				</Chip>
			{/each}
		</div>
	</div>

	<div class="line">
		<span class="note label">Good at</span>
		<div class="chips">
			{#each AGENT_CAPABILITIES as capability (capability.id)}
				<Chip
					active={definition.capabilities.includes(capability.id)}
					onclick={() => toggleCapability(capability.id)}
				>
					{capability.label}
				</Chip>
			{/each}
		</div>
	</div>

	<footer class="foot">
		<Btn onclick={() => onsave({ ...definition, enabled: !definition.enabled })}>
			{definition.enabled ? 'Switch off' : 'Switch on'}
		</Btn>
		<Btn danger onclick={() => onremove(definition.id)}>Forget</Btn>
	</footer>
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 7px;
		padding: 10px 12px;
		border: 1px solid var(--soft);
		border-radius: var(--r-panel);
		background-color: var(--surface-veil);
	}

	/* A switched-off agent is still configured, and still readable. Dimmed
	   rather than hidden, so turning it back on is where turning it off was. */
	.off {
		opacity: 0.6;
	}

	.head {
		display: flex;
		align-items: baseline;
		gap: 8px;
		flex-wrap: wrap;
	}

	.name {
		font-weight: 600;
	}

	.state {
		font-size: var(--fs-mono);
		color: var(--muted);
		margin-left: auto;
	}

	.state.available {
		color: var(--ok);
	}

	.state.broken {
		color: var(--warn);
	}

	.path {
		margin: 0;
		font-size: var(--fs-mono);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.line {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.label {
		flex: none;
		width: 5rem;
		font-size: var(--fs-mono);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.foot {
		display: flex;
		gap: 6px;
		margin-top: 2px;
	}
</style>
