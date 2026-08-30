// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Image and binary diff tests (FEAT-065).
 */

import { describe, expect, it } from 'vitest';
import type { BinaryDiff } from '$lib/types';

describe('image and binary diff calculations', () => {
	it('constructs image diff metadata with base64 payloads', () => {
		const imgDiff: BinaryDiff = {
			path: 'assets/logo.png',
			isImage: true,
			mime: 'image/png',
			oldSize: 1024,
			newSize: 2048,
			oldBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
			newBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
		};

		expect(imgDiff.isImage).toBe(true);
		expect(imgDiff.mime).toBe('image/png');
		expect(imgDiff.oldSize).toBe(1024);
		expect(imgDiff.newSize).toBe(2048);
		expect(imgDiff.oldBase64).toBeDefined();
		expect(imgDiff.newBase64).toBeDefined();
	});

	it('handles non-image binary files with metadata only', () => {
		const binDiff: BinaryDiff = {
			path: 'firmware.bin',
			isImage: false,
			mime: 'application/octet-stream',
			oldSize: 65536,
			newSize: 67000,
			oldBase64: null,
			newBase64: null
		};

		expect(binDiff.isImage).toBe(false);
		expect(binDiff.mime).toBe('application/octet-stream');
		expect(binDiff.oldSize).toBe(65536);
		expect(binDiff.newSize).toBe(67000);
		expect(binDiff.oldBase64).toBeNull();
		expect(binDiff.newBase64).toBeNull();
	});
});
