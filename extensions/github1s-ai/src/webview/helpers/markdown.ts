import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false });

const LANGUAGE_ALIASES: Record<string, string> = {
	bash: 'shellscript',
	'c#': 'csharp',
	'c++': 'cpp',
	cs: 'csharp',
	js: 'javascript',
	jsx: 'javascriptreact',
	md: 'markdown',
	py: 'python',
	rs: 'rust',
	sh: 'shellscript',
	shell: 'shellscript',
	text: 'plaintext',
	txt: 'plaintext',
	ts: 'typescript',
	tsx: 'typescriptreact',
	yml: 'yaml',
	zsh: 'shellscript',
};

const LANGUAGE_LABELS: Record<string, string> = {
	bash: 'Shell',
	'c#': 'C#',
	'c++': 'C++',
	cpp: 'C++',
	cs: 'C#',
	csharp: 'C#',
	css: 'CSS',
	diff: 'Diff',
	go: 'Go',
	html: 'HTML',
	java: 'Java',
	javascript: 'JavaScript',
	javascriptreact: 'JSX',
	js: 'JavaScript',
	jsx: 'JSX',
	json: 'JSON',
	markdown: 'Markdown',
	md: 'Markdown',
	python: 'Python',
	py: 'Python',
	plaintext: 'Code',
	rust: 'Rust',
	scss: 'SCSS',
	shellscript: 'Shell',
	sql: 'SQL',
	text: 'Code',
	ts: 'TypeScript',
	tsx: 'TSX',
	typescript: 'TypeScript',
	typescriptreact: 'TSX',
	txt: 'Code',
	xml: 'XML',
	yaml: 'YAML',
	yml: 'YAML',
};

const isSafeLink = (value: string): boolean => {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
};

markdown.validateLink = isSafeLink;
markdown.renderer.rules.link_open = (tokens, index, options, _environment, self) => {
	const hrefValue = tokens[index].attrGet('href');
	const href = typeof hrefValue === 'string' ? hrefValue : undefined;
	if (href && isSafeLink(href)) {
		tokens[index].attrSet('target', '_blank');
		tokens[index].attrSet('rel', 'noopener noreferrer');
	}
	return self.renderToken(tokens, index, options);
};

markdown.renderer.rules.fence = (tokens, index) => renderCodeBlock(tokens[index].content, tokens[index].info);
markdown.renderer.rules.code_block = (tokens, index) => renderCodeBlock(tokens[index].content);

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
	if (!(node instanceof HTMLAnchorElement)) return;
	const href = node.getAttribute('href');
	if (!href || !isSafeLink(href)) {
		node.removeAttribute('href');
		node.removeAttribute('target');
		node.removeAttribute('rel');
		return;
	}
	node.setAttribute('target', '_blank');
	node.setAttribute('rel', 'noopener noreferrer');
});

export const renderMarkdown = (source: string): string =>
	DOMPurify.sanitize(markdown.render(source), {
		USE_PROFILES: { html: true },
		FORBID_TAGS: ['style', 'form', 'input'],
	});

const renderCodeBlock = (source: string, info = ''): string => {
	const requestedLanguage = info.trim().split(/\s+/u)[0]?.toLowerCase() ?? '';
	const languageId = (LANGUAGE_ALIASES[requestedLanguage] ?? requestedLanguage) || 'plaintext';
	const label = LANGUAGE_LABELS[requestedLanguage] ?? requestedLanguage;

	return `<div class="code-block">
	<div class="code-block-header">
		<span class="code-language">${markdown.utils.escapeHtml(label || 'Code')}</span>
		<button class="code-copy" type="button" data-copy-code aria-label="Copy code">Copy</button>
	</div>
	<pre><code data-code-language="${markdown.utils.escapeHtml(languageId)}">${markdown.utils.escapeHtml(source)}</code></pre>
</div>`;
};
