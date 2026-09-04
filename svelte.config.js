// SPDX-License-Identifier: GPL-3.0-or-later
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * SPA mode. Tauri serves a static bundle from disk and there is no server to
 * render on, so every route falls back to index.html and routing happens
 * entirely client-side (see src/routes/+layout.ts).
 *
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ fallback: 'index.html', strict: false }),
		alias: { $lib: 'src/lib' },
		// Only the compact, release-ready logo variants are public UI assets.
		// The source previews and fonts alongside them remain out of the bundle.
		files: { assets: 'assets/brand/favicon' }
	}
};

export default config;
