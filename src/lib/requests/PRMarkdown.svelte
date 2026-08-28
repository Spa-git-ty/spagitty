<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<script lang="ts">
	interface Props {
		markdown: string;
	}

	let { markdown }: Props = $props();

	interface MarkdownBlock {
		type: 'heading' | 'paragraph' | 'code' | 'list' | 'blockquote' | 'hr';
		level?: number;
		content?: string;
		lang?: string;
		items?: Array<{ text: string; checked?: boolean | null }>;
		ordered?: boolean;
	}

	function parseBlocks(raw: string): MarkdownBlock[] {
		if (!raw || !raw.trim()) return [];

		const lines = raw.split(/\r?\n/);
		const blocks: MarkdownBlock[] = [];
		let i = 0;

		while (i < lines.length) {
			const line = lines[i];
			const trimmed = line.trim();

			if (!trimmed) {
				i++;
				continue;
			}

			// Code fence
			if (trimmed.startsWith('```')) {
				const lang = trimmed.slice(3).trim();
				const codeLines: string[] = [];
				i++;
				while (i < lines.length && !lines[i].trim().startsWith('```')) {
					codeLines.push(lines[i]);
					i++;
				}
				if (i < lines.length) i++;
				blocks.push({
					type: 'code',
					lang,
					content: codeLines.join('\n')
				});
				continue;
			}

			// Horizontal rule
			if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
				blocks.push({ type: 'hr' });
				i++;
				continue;
			}

			// Headings
			const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
			if (headingMatch) {
				blocks.push({
					type: 'heading',
					level: headingMatch[1].length,
					content: headingMatch[2]
				});
				i++;
				continue;
			}

			// Blockquote
			if (trimmed.startsWith('>')) {
				const quoteLines: string[] = [];
				while (i < lines.length && lines[i].trim().startsWith('>')) {
					quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
					i++;
				}
				blocks.push({
					type: 'blockquote',
					content: quoteLines.join('\n')
				});
				continue;
			}

			// List items
			const listMatch = trimmed.match(/^([-*]|\d+\.)\s+(.*)$/);
			if (listMatch) {
				const ordered = /^\d+\./.test(listMatch[1]);
				const items: Array<{ text: string; checked?: boolean | null }> = [];

				while (i < lines.length) {
					const currTrim = lines[i].trim();
					const itemMatch = currTrim.match(/^([-*]|\d+\.)\s+(.*)$/);
					if (!itemMatch) break;

					let text = itemMatch[2];
					let checked: boolean | null = null;

					const taskMatch = text.match(/^\[([ xX])\]\s+(.*)$/);
					if (taskMatch) {
						checked = taskMatch[1].toLowerCase() === 'x';
						text = taskMatch[2];
					}

					items.push({ text, checked });
					i++;
				}

				blocks.push({
					type: 'list',
					ordered,
					items
				});
				continue;
			}

			// Paragraph
			const pLines: string[] = [];
			while (
				i < lines.length &&
				lines[i].trim() &&
				!lines[i].trim().startsWith('```') &&
				!lines[i].trim().startsWith('#') &&
				!lines[i].trim().startsWith('>') &&
				!/^([-*]|\d+\.)\s+/.test(lines[i].trim()) &&
				!/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim())
			) {
				pLines.push(lines[i]);
				i++;
			}

			blocks.push({
				type: 'paragraph',
				content: pLines.join(' ')
			});
		}

		return blocks;
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function inlineFormat(text: string): string {
		let out = escapeHtml(text);

		// Inline code: `code`
		out = out.replace(/`([^`]+)`/g, '<code class="inline-code mono">$1</code>');

		// Bold: **text** or __text__
		out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
		out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');

		// Strikethrough: ~~text~~
		out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

		// Italic: *text* or _text_
		out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
		out = out.replace(/_([^_]+)_/g, '<em>$1</em>');

		// Links: [label](url)
		out = out.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer" class="doc-link">$1</a>'
		);

		return out;
	}

	const blocks = $derived(parseBlocks(markdown));
</script>

<div class="markdown-view">
	{#if blocks.length === 0}
		<div class="empty-doc note">
			<p>No description or changelog provided for this pull request.</p>
		</div>
	{:else}
		<article class="doc-content">
			{#each blocks as block}
				{#if block.type === 'heading'}
					{#if block.level === 1}
						<h1 class="doc-h1">{@html inlineFormat(block.content ?? '')}</h1>
					{:else if block.level === 2}
						<h2 class="doc-h2">{@html inlineFormat(block.content ?? '')}</h2>
					{:else if block.level === 3}
						<h3 class="doc-h3">{@html inlineFormat(block.content ?? '')}</h3>
					{:else}
						<h4 class="doc-h4">{@html inlineFormat(block.content ?? '')}</h4>
					{/if}
				{:else if block.type === 'paragraph'}
					<p class="doc-p">{@html inlineFormat(block.content ?? '')}</p>
				{:else if block.type === 'code'}
					<div class="code-block-wrapper">
						{#if block.lang}
							<div class="code-lang mono note">{block.lang}</div>
						{/if}
						<pre class="code-pre mono"><code>{block.content}</code></pre>
					</div>
				{:else if block.type === 'blockquote'}
					<blockquote class="doc-quote">
						{@html inlineFormat(block.content ?? '')}
					</blockquote>
				{:else if block.type === 'list'}
					{#if block.ordered}
						<ol class="doc-ol">
							{#each block.items ?? [] as item}
								<li>{@html inlineFormat(item.text)}</li>
							{/each}
						</ol>
					{:else}
						<ul class="doc-ul">
							{#each block.items ?? [] as item}
								{#if item.checked !== null && item.checked !== undefined}
									<li class="task-item">
										<input type="checkbox" checked={item.checked} disabled />
										<span>{@html inlineFormat(item.text)}</span>
									</li>
								{:else}
									<li>{@html inlineFormat(item.text)}</li>
								{/if}
							{/each}
						</ul>
					{/if}
				{:else if block.type === 'hr'}
					<hr class="doc-hr" />
				{/if}
			{/each}
		</article>
	{/if}
</div>

<style>
	.markdown-view {
		flex: 1;
		min-width: 0;
		height: 100%;
		overflow-y: auto;
		padding: 24px 32px;
		background: var(--bg);
		box-sizing: border-box;
	}

	.empty-doc {
		display: grid;
		place-items: center;
		min-height: 200px;
		color: var(--muted);
	}

	.doc-content {
		max-width: 820px;
		margin: 0 auto;
		color: var(--fg);
		line-height: 1.6;
		font-size: var(--fs-body);
	}

	.doc-h1 {
		font-size: 1.4em;
		font-weight: 700;
		margin: 0 0 16px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--line);
	}

	.doc-h2 {
		font-size: 1.2em;
		font-weight: 600;
		margin: 20px 0 12px;
		padding-bottom: 6px;
		border-bottom: 1px solid var(--line);
	}

	.doc-h3 {
		font-size: 1.05em;
		font-weight: 600;
		margin: 16px 0 8px;
	}

	.doc-h4 {
		font-size: 0.95em;
		font-weight: 600;
		margin: 12px 0 6px;
	}

	.doc-p {
		margin: 0 0 12px;
	}

	.code-block-wrapper {
		margin: 12px 0;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: var(--r-card);
		overflow: hidden;
	}

	.code-lang {
		padding: 4px 10px;
		font-size: var(--fs-secondary);
		background: color-mix(in srgb, var(--line) 40%, transparent);
		border-bottom: 1px solid var(--line);
	}

	.code-pre {
		margin: 0;
		padding: 12px;
		overflow-x: auto;
		font-size: var(--fs-body);
		line-height: 1.45;
	}

	:global(.inline-code) {
		padding: 2px 5px;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: var(--r-input);
		font-size: 0.9em;
	}

	:global(.doc-link) {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.doc-quote {
		margin: 12px 0;
		padding: 8px 14px;
		background: color-mix(in srgb, var(--surface) 60%, transparent);
		border-left: 3px solid var(--accent);
		border-radius: 0 var(--r-card) var(--r-card) 0;
		color: var(--muted);
	}

	.doc-ul,
	.doc-ol {
		margin: 0 0 12px;
		padding-left: 24px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.task-item {
		list-style: none;
		margin-left: -20px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.doc-hr {
		border: none;
		border-top: 1px solid var(--line);
		margin: 20px 0;
	}
</style>
