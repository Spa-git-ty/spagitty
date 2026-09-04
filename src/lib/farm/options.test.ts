// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Unit tests for Farm options (FEAT-073).
 */

import { describe, expect, it } from 'vitest';
import { TASK_KIND_LABELS } from './describe';
import {
	AGENT_CAPABILITIES,
	AGENT_ROLES,
	lines,
	TASK_KINDS,
	TASK_PRIORITIES,
	text
} from './options';
import type { AgentCapability, AgentRole, TaskKind, TaskPriority } from './types';

describe('lines & text', () => {
	it('splits a textarea string into non-empty trimmed lines', () => {
		expect(lines('')).toEqual([]);
		expect(lines('   \n\t\n  ')).toEqual([]);
		expect(lines('one\ntwo\nthree')).toEqual(['one', 'two', 'three']);
		expect(lines('  first  \n\n  second \n')).toEqual(['first', 'second']);
	});

	it('joins string array with newlines', () => {
		expect(text([])).toBe('');
		expect(text(['a'])).toBe('a');
		expect(text(['a', 'b', 'c'])).toBe('a\nb\nc');
	});

	it('round-trips clean arrays', () => {
		const input = ['src/**', 'tests/**', 'Cargo.toml'];
		expect(lines(text(input))).toEqual(input);
	});
});

describe('options lists', () => {
	it('defines all agent capabilities', () => {
		const expected: AgentCapability[] = [
			'planning',
			'coding',
			'review',
			'testing',
			'frontend',
			'backend',
			'documentation',
			'research',
			'longContext',
			'vision',
			'toolUse'
		];
		expect(AGENT_CAPABILITIES.map((c) => c.id)).toEqual(expected);
		for (const entry of AGENT_CAPABILITIES) {
			expect(entry.label.length).toBeGreaterThan(0);
		}
	});

	it('defines all agent roles', () => {
		const expected: AgentRole[] = [
			'architect',
			'backend',
			'frontend',
			'reviewer',
			'tester',
			'researcher',
			'general'
		];
		expect(AGENT_ROLES.map((r) => r.id)).toEqual(expected);
		for (const entry of AGENT_ROLES) {
			expect(entry.label.length).toBeGreaterThan(0);
		}
	});

	it('defines task kinds matching labels', () => {
		const keys = Object.keys(TASK_KIND_LABELS) as TaskKind[];
		expect(TASK_KINDS.map((k) => k.id)).toEqual(keys);
		for (const item of TASK_KINDS) {
			expect(item.label).toBe(TASK_KIND_LABELS[item.id]);
		}
	});

	it('defines task priorities in expected order', () => {
		const expected: TaskPriority[] = ['high', 'normal', 'low'];
		expect(TASK_PRIORITIES.map((p) => p.id)).toEqual(expected);
	});
});
