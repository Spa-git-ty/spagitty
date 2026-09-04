// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Lightweight syntax highlighter and language detector for diff views (FEAT-064).
 *
 * Fast, memory-safe, non-blocking tokenization across common programming languages
 * mapped directly to Spagitty's semantic theme palette tokens.
 */

export type TokenType =
	| 'keyword'
	| 'string'
	| 'number'
	| 'comment'
	| 'fn'
	| 'type'
	| 'operator'
	| 'punctuation'
	| 'plain';

export interface Token {
	type: TokenType;
	text: string;
}

function makeMap(words: string[]): Record<string, true> {
	const map: Record<string, true> = {};
	for (const w of words) map[w] = true;
	return map;
}

const KEYWORDS: Record<string, Record<string, true>> = {
	rust: makeMap([
		'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum',
		'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod',
		'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super',
		'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while'
	]),
	typescript: makeMap([
		'abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case', 'catch', 'class',
		'const', 'continue', 'debugger', 'declare', 'default', 'delete', 'do', 'else', 'enum',
		'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if',
		'implements', 'import', 'in', 'infer', 'instanceof', 'interface', 'is', 'keyof',
		'let', 'module', 'namespace', 'never', 'new', 'null', 'number', 'of', 'package',
		'private', 'protected', 'public', 'readonly', 'return', 'set', 'static', 'string',
		'super', 'switch', 'symbol', 'this', 'throw', 'true', 'try', 'type', 'typeof',
		'undefined', 'unknown', 'var', 'void', 'while', 'with', 'yield'
	]),
	javascript: makeMap([
		'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
		'default', 'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for',
		'from', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'of',
		'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
		'undefined', 'var', 'void', 'while', 'with', 'yield'
	]),
	python: makeMap([
		'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
		'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import',
		'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
		'True', 'try', 'while', 'with', 'yield'
	]),
	go: makeMap([
		'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough',
		'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range',
		'return', 'select', 'struct', 'switch', 'type', 'var', 'true', 'false', 'nil'
	]),
	cpp: makeMap([
		'auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'constexpr',
		'continue', 'default', 'delete', 'do', 'double', 'else', 'enum', 'explicit', 'export',
		'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long',
		'mutable', 'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'private',
		'protected', 'public', 'register', 'reinterpret_cast', 'return', 'short', 'signed',
		'sizeof', 'static', 'static_cast', 'struct', 'switch', 'template', 'this',
		'throw', 'true', 'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using',
		'virtual', 'void', 'volatile', 'wchar_t', 'while'
	]),
	sql: makeMap([
		'select', 'from', 'where', 'insert', 'into', 'update', 'delete', 'table', 'create',
		'drop', 'alter', 'index', 'view', 'join', 'left', 'right', 'inner', 'outer', 'on',
		'group', 'by', 'order', 'having', 'limit', 'offset', 'as', 'and', 'or', 'not',
		'null', 'is', 'in', 'between', 'like', 'union', 'all', 'values', 'distinct', 'case',
		'when', 'then', 'else', 'end', 'primary', 'key', 'foreign', 'references'
	])
};

export function detectLanguage(path: string | null | undefined): string {
	if (!path) return 'plain';
	const ext = path.split('.').pop()?.toLowerCase() ?? '';
	switch (ext) {
		case 'rs':
			return 'rust';
		case 'ts':
		case 'mts':
		case 'cts':
		case 'tsx':
			return 'typescript';
		case 'js':
		case 'mjs':
		case 'cjs':
		case 'jsx':
			return 'javascript';
		case 'svelte':
			return 'typescript';
		case 'py':
		case 'pyi':
			return 'python';
		case 'go':
			return 'go';
		case 'c':
		case 'h':
		case 'cpp':
		case 'hpp':
		case 'cc':
		case 'cxx':
			return 'cpp';
		case 'json':
		case 'jsonc':
			return 'json';
		case 'toml':
			return 'toml';
		case 'yaml':
		case 'yml':
			return 'yaml';
		case 'sh':
		case 'bash':
		case 'zsh':
			return 'shell';
		case 'sql':
			return 'sql';
		default:
			return 'plain';
	}
}

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function tokenize(line: string, language: string): Token[] {
	if (!line || language === 'plain' || line.length > 2000) {
		return [{ type: 'plain', text: line }];
	}

	const kwMap = KEYWORDS[language] ?? KEYWORDS.typescript;
	const tokens: Token[] = [];
	let i = 0;
	const len = line.length;

	while (i < len) {
		const char = line[i];
		const next = i + 1 < len ? line[i + 1] : '';

		// 1. Line Comments
		if (
			(char === '/' && next === '/') ||
			(char === '#' && (language === 'python' || language === 'shell' || language === 'yaml' || language === 'toml'))
		) {
			tokens.push({ type: 'comment', text: line.slice(i) });
			break;
		}

		// 2. Strings
		if (char === '"' || char === "'" || char === '`') {
			const quote = char;
			let end = i + 1;
			while (end < len) {
				if (line[end] === '\\') {
					end += 2;
				} else if (line[end] === quote) {
					end++;
					break;
				} else {
					end++;
				}
			}
			tokens.push({ type: 'string', text: line.slice(i, end) });
			i = end;
			continue;
		}

		// 3. Numbers
		if (/\d/.test(char) && (i === 0 || /[\s,([{:;=+\-*/%<>&|!]/.test(line[i - 1]))) {
			let end = i + 1;
			while (end < len && /[0-9a-fA-FxX._]/.test(line[end])) {
				end++;
			}
			tokens.push({ type: 'number', text: line.slice(i, end) });
			i = end;
			continue;
		}

		// 4. Identifiers, Keywords, Types, Functions
		if (/[a-zA-Z_$]/.test(char)) {
			let end = i + 1;
			while (end < len && /[a-zA-Z0-9_$]/.test(line[end])) {
				end++;
			}
			const word = line.slice(i, end);

			// Lookahead for function calls
			let isFn = false;
			let peek = end;
			while (peek < len && line[peek] === ' ') peek++;
			if (peek < len && line[peek] === '(') {
				isFn = true;
			}

			if (kwMap[word] || (language === 'sql' && kwMap[word.toLowerCase()])) {
				tokens.push({ type: 'keyword', text: word });
			} else if (isFn) {
				tokens.push({ type: 'fn', text: word });
			} else if (/^[A-Z][a-zA-Z0-9_]*$/.test(word)) {
				tokens.push({ type: 'type', text: word });
			} else {
				tokens.push({ type: 'plain', text: word });
			}
			i = end;
			continue;
		}

		// 5. Operators
		if (/[=+\-*/%&|^!~<>?:.]/.test(char)) {
			let end = i + 1;
			while (end < len && /[=+\-*/%&|^!~<>?:.]/.test(line[end])) {
				end++;
			}
			tokens.push({ type: 'operator', text: line.slice(i, end) });
			i = end;
			continue;
		}

		// 6. Punctuation
		if (/[{}()[\];,]/.test(char)) {
			tokens.push({ type: 'punctuation', text: char });
			i++;
			continue;
		}

		// 7. Whitespace / Plain
		let end = i + 1;
		while (end < len && /\s/.test(line[end])) {
			end++;
		}
		tokens.push({ type: 'plain', text: line.slice(i, end) });
		i = end;
	}

	return tokens;
}

export function highlightLine(line: string, language: string): string {
	const tokens = tokenize(line, language);
	return tokens
		.map((t) => {
			const safe = escapeHtml(t.text);
			if (t.type === 'plain') return safe;
			return `<span class="tok-${t.type}">${safe}</span>`;
		})
		.join('');
}
