// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The option lists the Farm screen's controls are built from (FEAT-073).
 *
 * Data rather than markup, and in one file, because every one of these lists
 * must match a closed set on the Rust side. A checkbox list written inline in a
 * component drifts from the enum it edits the first time the enum gains a
 * member, and the drift is invisible: the missing option is simply not on the
 * screen.
 */

import type { AgentCapability, AgentRole, TaskKind, TaskPriority } from './types';
import { TASK_KIND_LABELS } from './describe';

export const AGENT_CAPABILITIES: { id: AgentCapability; label: string }[] = [
	{ id: 'planning', label: 'Planning' },
	{ id: 'coding', label: 'Coding' },
	{ id: 'review', label: 'Review' },
	{ id: 'testing', label: 'Testing' },
	{ id: 'frontend', label: 'Frontend' },
	{ id: 'backend', label: 'Backend' },
	{ id: 'documentation', label: 'Docs' },
	{ id: 'research', label: 'Research' },
	{ id: 'longContext', label: 'Long context' },
	{ id: 'vision', label: 'Vision' },
	{ id: 'toolUse', label: 'Tools' }
];

export const AGENT_ROLES: { id: AgentRole; label: string }[] = [
	{ id: 'architect', label: 'Architect' },
	{ id: 'backend', label: 'Backend' },
	{ id: 'frontend', label: 'Frontend' },
	{ id: 'reviewer', label: 'Reviewer' },
	{ id: 'tester', label: 'Tester' },
	{ id: 'researcher', label: 'Researcher' },
	{ id: 'general', label: 'General' }
];

export const TASK_KINDS: { id: TaskKind; label: string }[] = (
	Object.keys(TASK_KIND_LABELS) as TaskKind[]
).map((id) => ({ id, label: TASK_KIND_LABELS[id] }));

export const TASK_PRIORITIES: { id: TaskPriority; label: string }[] = [
	{ id: 'high', label: 'High' },
	{ id: 'normal', label: 'Normal' },
	{ id: 'low', label: 'Low' }
];

/**
 * Split a textarea into a list of lines.
 *
 * Used for every multi-value field on the screen — allowed paths, acceptance
 * criteria, verification commands. One function, so the three of them agree
 * about what a blank line means.
 */
export function lines(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/** The inverse, for filling a textarea from a saved task. */
export function text(values: string[]): string {
	return values.join('\n');
}
