// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The sounds (FEAT-072).
 *
 * There is no way to hear an oscillator from a test runner, and no value in
 * asserting a frequency — retuning a click would then be a test change, which
 * is exactly the kind of test that gets deleted. What is worth holding is the
 * contract around the noise:
 *
 * - `off` builds nothing and schedules nothing;
 * - a host with no audio at all is a no-op rather than a failure;
 * - `subtle` really is quieter than `full`, rather than the same thing twice;
 * - rarity is audible, so a legendary badge is not the common one again.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { play, reset, useContextFactory } from './sound';

interface Scheduled {
	type: OscillatorType;
	frequency: number;
	gain: number;
	start: number;
}

let scheduled: Scheduled[] = [];
let contexts = 0;
let state: AudioContextState = 'running';

/** A context that records what was asked of it instead of making a noise. */
function stub(): AudioContext {
	contexts += 1;
	const ctx = {
		currentTime: 0,
		get state() {
			return state;
		},
		resume: vi.fn(() => {
			state = 'running';
			return Promise.resolve();
		}),
		close: vi.fn(),
		destination: {},
		createOscillator() {
			const entry: Scheduled = { type: 'sine', frequency: 0, gain: 0, start: 0 };
			scheduled.push(entry);
			return {
				set type(value: OscillatorType) {
					entry.type = value;
				},
				frequency: {
					setValueAtTime: (value: number) => {
						entry.frequency = value;
					},
					exponentialRampToValueAtTime: () => {}
				},
				connect: () => {},
				start: (at: number) => {
					entry.start = at;
				},
				stop: () => {}
			};
		},
		createGain() {
			const entry = scheduled.at(-1);
			return {
				gain: {
					setValueAtTime: () => {},
					exponentialRampToValueAtTime: (value: number) => {
						if (entry) entry.gain = Math.max(entry.gain, value);
					}
				},
				connect: () => {}
			};
		}
	};
	return ctx as unknown as AudioContext;
}

beforeEach(() => {
	scheduled = [];
	contexts = 0;
	state = 'running';
	useContextFactory(stub);
});

afterEach(() => {
	reset();
	useContextFactory(() => null);
});

describe('silence', () => {
	it('schedules nothing when the level is off', () => {
		expect(play('commit', 'off')).toBe(false);
		expect(scheduled).toHaveLength(0);
	});

	it('does not even build a context when the level is off', () => {
		play('commit', 'off');
		play('legendary', 'off');

		expect(contexts, 'a silent install must not open an audio device').toBe(0);
	});

	it('is a no-op on a host with no audio', () => {
		useContextFactory(() => null);

		expect(play('commit', 'full')).toBe(false);
	});

	it('is a no-op when the host throws instead of refusing', () => {
		useContextFactory(() => {
			throw new Error('no audio for you');
		});

		expect(play('commit', 'full')).toBe(false);
	});
});

describe('playing', () => {
	it('schedules the cue and says it did', () => {
		expect(play('commit', 'full')).toBe(true);
		expect(scheduled.length).toBeGreaterThan(0);
	});

	it('opens one context however many sounds are played', () => {
		play('commit', 'full');
		play('merge', 'full');
		play('legendary', 'full');

		expect(contexts).toBe(1);
	});

	it('nudges a context an autoplay policy has suspended', () => {
		state = 'suspended';

		expect(play('commit', 'full')).toBe(true);
	});

	it('schedules only after a suspended context has resumed', async () => {
		// The bug this exists for: a suspended context's clock is frozen at
		// zero, so scheduling before the resume laid every tone in a window the
		// clock had already passed by the time it started moving. The very
		// first sound the application tried to make was the one guaranteed not
		// to be heard.
		state = 'suspended';
		play('commit', 'full');

		expect(scheduled, 'nothing may be scheduled against a frozen clock').toHaveLength(0);

		await Promise.resolve();
		await Promise.resolve();

		expect(scheduled.length).toBeGreaterThan(0);
	});

	it('survives a host whose resume returns nothing', async () => {
		// `resume()` is specified to return a promise; an older WebKit does not.
		state = 'suspended';
		useContextFactory(() => {
			const ctx = stub();
			(ctx as unknown as { resume: () => void }).resume = () => undefined;
			return ctx;
		});

		expect(() => play('commit', 'full')).not.toThrow();
	});

	it('is quieter at subtle than at full', () => {
		play('commit', 'subtle');
		const quiet = Math.max(...scheduled.map((entry) => entry.gain));

		scheduled = [];
		play('commit', 'full');
		const loud = Math.max(...scheduled.map((entry) => entry.gain));

		expect(quiet).toBeLessThan(loud);
	});
});

describe('rarity is audible', () => {
	it('makes a legendary badge a bigger sound than a common one', () => {
		play('common', 'full');
		const common = scheduled.length;

		scheduled = [];
		play('legendary', 'full');

		// Recognisable by sound alone means it cannot be the small one again.
		expect(scheduled.length).toBeGreaterThan(common);
	});

	it('gives every rarity a cue of its own', () => {
		const shapes = new Set<string>();
		for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
			scheduled = [];
			play(rarity, 'full');
			shapes.add(scheduled.map((entry) => `${entry.type}:${entry.frequency}`).join('|'));
		}

		expect(shapes.size).toBe(5);
	});
});
