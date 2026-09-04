// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The version lives in four places, and gate 6 tags whatever `package.json`
 * says. A manifest that disagrees ships a build stamped with a version nobody
 * released, which is only ever found by hand.
 *
 * The fourth place is new and is the reason this file exists. WiX takes only
 * numeric versions, so `tauri-bundler` refuses a pre-release identifier that
 * is not a number — `0.4.0-alpha` fails the check before WiX is invoked, and
 * the Windows build with it. `bundle.windows.wix.version` overrides the MSI's
 * ProductVersion so the app can carry a real pre-release suffix everywhere
 * else. It is a literal, so nothing but this test keeps it from going stale
 * across a bump and silently stamping the installer with the old version.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const pkg = JSON.parse(read('package.json')) as { version: string };
const tauri = JSON.parse(read('src-tauri/tauri.conf.json')) as {
	version: string;
	bundle: { windows?: { wix?: { version?: string } } };
};

/** The `version` of `[workspace.package]`, and not of any other table. */
function workspaceVersion(cargo: string): string | null {
	const table = cargo.split(/^\[/m).find((section) => section.startsWith('workspace.package]'));
	return table?.match(/^version = "([^"]+)"$/m)?.[1] ?? null;
}

describe('the release version', () => {
	it('is the same in package.json, Cargo.toml and tauri.conf.json', () => {
		expect(workspaceVersion(read('Cargo.toml'))).toBe(pkg.version);
		expect(tauri.version).toBe(pkg.version);
	});

	it('is a semver version, because every lane parses it as one', () => {
		expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
	});
});

describe('the MSI ProductVersion override', () => {
	const wix = tauri.bundle.windows?.wix?.version;

	it('is set, since a pre-release version cannot reach WiX', () => {
		expect(wix).toBeDefined();
	});

	it('is numeric only, in major.minor.patch with an optional build', () => {
		expect(wix).toMatch(/^\d+\.\d+\.\d+(\.\d+)?$/);
	});

	it('tracks the release version it stands in for', () => {
		const [major, minor, patch] = pkg.version.split('-')[0].split('.');
		expect(wix?.split('.').slice(0, 3).join('.')).toBe(`${major}.${minor}.${patch}`);
	});

	it('stays inside the field widths MSI allows', () => {
		const [major, minor, patch, build = '0'] = (wix ?? '').split('.').map(Number);
		expect(major).toBeLessThanOrEqual(255);
		expect(minor).toBeLessThanOrEqual(255);
		expect(patch).toBeLessThanOrEqual(65535);
		expect(build).toBeLessThanOrEqual(65535);
	});
});
