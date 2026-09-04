// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Syntax highlighter tests (FEAT-064).
 */

import { describe, expect, it } from 'vitest';
import { detectLanguage, escapeHtml, highlightLine, tokenize } from './highlight';

describe('detectLanguage', () => {
	it('detects common file extensions correctly', () => {
		expect(detectLanguage('src/main.rs')).toBe('rust');
		expect(detectLanguage('src/app.ts')).toBe('typescript');
		expect(detectLanguage('component.svelte')).toBe('typescript');
		expect(detectLanguage('script.py')).toBe('python');
		expect(detectLanguage('server.go')).toBe('go');
		expect(detectLanguage('main.cpp')).toBe('cpp');
		expect(detectLanguage('query.sql')).toBe('sql');
		expect(detectLanguage('config.toml')).toBe('toml');
		expect(detectLanguage('package.json')).toBe('json');
		expect(detectLanguage('deploy.yaml')).toBe('yaml');
		expect(detectLanguage('script.sh')).toBe('shell');
		expect(detectLanguage('README.txt')).toBe('plain');
		expect(detectLanguage(null)).toBe('plain');
	});
});

describe('escapeHtml', () => {
	it('escapes dangerous HTML characters', () => {
		expect(escapeHtml('<script>alert("xss") & \'test\'</script>')).toBe(
			'&lt;script&gt;alert(&quot;xss&quot;) &amp; &#39;test&#39;&lt;/script&gt;'
		);
	});
});

describe('tokenize', () => {
	it('tokenizes Rust keywords, types, and functions', () => {
		const tokens = tokenize('pub fn calculate_total(count: i32) -> Result<Total, Error> {', 'rust');
		expect(tokens).toEqual([
			{ type: 'keyword', text: 'pub' },
			{ type: 'plain', text: ' ' },
			{ type: 'keyword', text: 'fn' },
			{ type: 'plain', text: ' ' },
			{ type: 'fn', text: 'calculate_total' },
			{ type: 'punctuation', text: '(' },
			{ type: 'plain', text: 'count' },
			{ type: 'operator', text: ':' },
			{ type: 'plain', text: ' ' },
			{ type: 'plain', text: 'i32' },
			{ type: 'punctuation', text: ')' },
			{ type: 'plain', text: ' ' },
			{ type: 'operator', text: '->' },
			{ type: 'plain', text: ' ' },
			{ type: 'type', text: 'Result' },
			{ type: 'operator', text: '<' },
			{ type: 'type', text: 'Total' },
			{ type: 'punctuation', text: ',' },
			{ type: 'plain', text: ' ' },
			{ type: 'type', text: 'Error' },
			{ type: 'operator', text: '>' },
			{ type: 'plain', text: ' ' },
			{ type: 'punctuation', text: '{' }
		]);
	});

	it('tokenizes strings and numbers', () => {
		const tokens = tokenize('const msg = "hello world" + 42;', 'typescript');
		expect(tokens).toContainEqual({ type: 'keyword', text: 'const' });
		expect(tokens).toContainEqual({ type: 'string', text: '"hello world"' });
		expect(tokens).toContainEqual({ type: 'number', text: '42' });
	});

	it('tokenizes line comments', () => {
		const tokens = tokenize('let x = 1; // comment here', 'typescript');
		expect(tokens).toContainEqual({ type: 'comment', text: '// comment here' });
	});

	it('tokenizes python hash comments', () => {
		const tokens = tokenize('def run(): # start execution', 'python');
		expect(tokens).toContainEqual({ type: 'keyword', text: 'def' });
		expect(tokens).toContainEqual({ type: 'comment', text: '# start execution' });
	});

	it('gracefully handles empty and plain strings', () => {
		expect(tokenize('', 'rust')).toEqual([{ type: 'plain', text: '' }]);
		expect(tokenize('plain text line', 'plain')).toEqual([{ type: 'plain', text: 'plain text line' }]);
	});
});

describe('highlightLine', () => {
	it('wraps tokens into semantic HTML spans', () => {
		const html = highlightLine('let mut value = 100;', 'rust');
		expect(html).toContain('<span class="tok-keyword">let</span>');
		expect(html).toContain('<span class="tok-keyword">mut</span>');
		expect(html).toContain('<span class="tok-number">100</span>');
	});
});
