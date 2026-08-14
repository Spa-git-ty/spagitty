// SPDX-License-Identifier: GPL-3.0-or-later
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	plugins: [sveltekit()],

	// Tauri expects a fixed port and fails if it is not available.
	clearScreen: false,
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
		watch: {
			// The Rust tree is rebuilt by cargo, not by vite.
			ignored: ['**/src-tauri/**', '**/crates/**', '**/target/**']
		}
	}
});
