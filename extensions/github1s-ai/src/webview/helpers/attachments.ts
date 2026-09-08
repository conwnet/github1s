import type { ContextAttachmentDescriptor } from '@/common/protocol';

type SetiFileIconColor = 'blue' | 'default' | 'gray' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'yellow';

interface SetiFileIconPresentation {
	readonly glyph: string;
	readonly color: SetiFileIconColor;
}

const SETI_FILE_ICONS = {
	audio: { glyph: '\ue005', color: 'purple' },
	c: { glyph: '\ue00c', color: 'blue' },
	clock: { glyph: '\ue012', color: 'blue' },
	csharp: { glyph: '\ue00b', color: 'blue' },
	config: { glyph: '\ue019', color: 'gray' },
	cpp: { glyph: '\ue01a', color: 'blue' },
	css: { glyph: '\ue01d', color: 'blue' },
	dart: { glyph: '\ue021', color: 'blue' },
	database: { glyph: '\ue022', color: 'pink' },
	default: { glyph: '\ue023', color: 'default' },
	docker: { glyph: '\ue025', color: 'blue' },
	go: { glyph: '\ue03a', color: 'blue' },
	graphql: { glyph: '\ue03e', color: 'pink' },
	html: { glyph: '\ue048', color: 'orange' },
	image: { glyph: '\ue04c', color: 'purple' },
	info: { glyph: '\ue04d', color: 'blue' },
	java: { glyph: '\ue050', color: 'red' },
	javascript: { glyph: '\ue051', color: 'yellow' },
	json: { glyph: '\ue055', color: 'yellow' },
	kotlin: { glyph: '\ue058', color: 'orange' },
	less: { glyph: '\ue059', color: 'blue' },
	license: { glyph: '\ue05a', color: 'yellow' },
	lua: { glyph: '\ue05e', color: 'blue' },
	markdown: { glyph: '\ue060', color: 'blue' },
	notebook: { glyph: '\ue066', color: 'blue' },
	pdf: { glyph: '\ue06d', color: 'red' },
	php: { glyph: '\ue070', color: 'purple' },
	powershell: { glyph: '\ue074', color: 'blue' },
	python: { glyph: '\ue07b', color: 'blue' },
	r: { glyph: '\ue001', color: 'blue' },
	react: { glyph: '\ue07d', color: 'blue' },
	ruby: { glyph: '\ue081', color: 'red' },
	rust: { glyph: '\ue082', color: 'gray' },
	sass: { glyph: '\ue084', color: 'pink' },
	shell: { glyph: '\ue089', color: 'green' },
	svelte: { glyph: '\ue090', color: 'red' },
	swift: { glyph: '\ue092', color: 'orange' },
	terraform: { glyph: '\ue093', color: 'purple' },
	tsconfig: { glyph: '\ue097', color: 'blue' },
	typescript: { glyph: '\ue099', color: 'blue' },
	video: { glyph: '\ue09b', color: 'pink' },
	vue: { glyph: '\ue09d', color: 'green' },
	xml: { glyph: '\ue0a5', color: 'orange' },
	yaml: { glyph: '\ue0a7', color: 'purple' },
	zip: { glyph: '\ue0a9', color: 'gray' },
} as const satisfies Record<string, SetiFileIconPresentation>;

export type SetiFileIcon = keyof typeof SETI_FILE_ICONS;

export const setiFileIconPresentation = (icon: SetiFileIcon): SetiFileIconPresentation => SETI_FILE_ICONS[icon];

const SETI_LANGUAGE_ICONS: Readonly<Record<string, SetiFileIcon>> = {
	c: 'c',
	cpp: 'cpp',
	csharp: 'csharp',
	css: 'css',
	dart: 'dart',
	dockercompose: 'docker',
	dockerfile: 'docker',
	go: 'go',
	graphql: 'graphql',
	html: 'html',
	java: 'java',
	javascript: 'javascript',
	javascriptreact: 'react',
	json: 'json',
	jsonc: 'json',
	jsonl: 'json',
	kotlin: 'kotlin',
	less: 'less',
	lua: 'lua',
	markdown: 'markdown',
	mdx: 'markdown',
	php: 'php',
	powershell: 'powershell',
	python: 'python',
	r: 'r',
	ruby: 'ruby',
	rust: 'rust',
	sass: 'sass',
	scss: 'sass',
	shellscript: 'shell',
	sql: 'database',
	svelte: 'svelte',
	swift: 'swift',
	terraform: 'terraform',
	typescript: 'typescript',
	typescriptreact: 'react',
	vue: 'vue',
	xml: 'xml',
	yaml: 'yaml',
};

const SETI_EXTENSION_ICONS: Readonly<Record<string, SetiFileIcon>> = {
	bash: 'shell',
	c: 'c',
	cc: 'cpp',
	cjs: 'javascript',
	cpp: 'cpp',
	cs: 'csharp',
	css: 'css',
	dart: 'dart',
	fish: 'shell',
	gemspec: 'ruby',
	go: 'go',
	gql: 'graphql',
	graphql: 'graphql',
	h: 'c',
	hpp: 'cpp',
	html: 'html',
	htm: 'html',
	ipynb: 'notebook',
	java: 'java',
	js: 'javascript',
	json: 'json',
	json5: 'json',
	jsonc: 'json',
	jsonl: 'json',
	jsx: 'react',
	kt: 'kotlin',
	kts: 'kotlin',
	less: 'less',
	lua: 'lua',
	markdown: 'markdown',
	md: 'markdown',
	mdown: 'markdown',
	mdx: 'markdown',
	mjs: 'javascript',
	php: 'php',
	ps1: 'powershell',
	py: 'python',
	pyi: 'python',
	pyw: 'python',
	r: 'r',
	rake: 'ruby',
	rb: 'ruby',
	rs: 'rust',
	sass: 'sass',
	scss: 'sass',
	sh: 'shell',
	sql: 'database',
	svelte: 'svelte',
	swift: 'swift',
	tf: 'terraform',
	tfvars: 'terraform',
	toml: 'config',
	ts: 'typescript',
	tsx: 'react',
	vue: 'vue',
	xml: 'xml',
	yaml: 'yaml',
	yml: 'yaml',
	zsh: 'shell',
};

const SETI_FILENAME_ICONS: Readonly<Record<string, SetiFileIcon>> = {
	changelog: 'clock',
	'changelog.md': 'clock',
	'compose.yaml': 'docker',
	'compose.yml': 'docker',
	'docker-compose.yaml': 'docker',
	'docker-compose.yml': 'docker',
	dockerfile: 'docker',
	license: 'license',
	'license.md': 'license',
	'license.txt': 'license',
	readme: 'info',
	'readme.md': 'info',
	'readme.txt': 'info',
	'tsconfig.json': 'tsconfig',
};

const AUDIO_EXTENSIONS = new Set(['flac', 'mp3', 'ogg', 'wav']);
const IMAGE_EXTENSIONS = new Set(['avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'tiff', 'webp']);
const VIDEO_EXTENSIONS = new Set(['avi', 'mov', 'mp4', 'mpg', 'ogv', 'webm']);
const ZIP_EXTENSIONS = new Set(['7z', 'bz2', 'gz', 'jar', 'rar', 'tar', 'tgz', 'xz', 'zip']);

interface FileIdentity {
	languageId?: string;
	filename: string;
	extension?: string;
}

export const attachmentSetiIcon = (attachment: ContextAttachmentDescriptor): SetiFileIcon => {
	const file = fileIdentity(attachment);
	if (Object.hasOwn(SETI_FILENAME_ICONS, file.filename)) return SETI_FILENAME_ICONS[file.filename];
	if (file.extension === 'pdf') return 'pdf';
	if (file.extension && AUDIO_EXTENSIONS.has(file.extension)) return 'audio';
	if (file.extension && IMAGE_EXTENSIONS.has(file.extension)) return 'image';
	if (file.extension && VIDEO_EXTENSIONS.has(file.extension)) return 'video';
	if (file.extension && ZIP_EXTENSIONS.has(file.extension)) return 'zip';
	if (file.extension && Object.hasOwn(SETI_EXTENSION_ICONS, file.extension))
		return SETI_EXTENSION_ICONS[file.extension];
	if (file.languageId && Object.hasOwn(SETI_LANGUAGE_ICONS, file.languageId))
		return SETI_LANGUAGE_ICONS[file.languageId];
	return 'default';
};

const fileIdentity = (attachment: ContextAttachmentDescriptor): FileIdentity => {
	const filename = attachment.label.replace(/:\d+(?:-\d+)?$/u, '').toLowerCase();
	const extension = filename.match(/\.([^.]+)$/u)?.[1];
	return {
		filename,
		...(attachment.languageId ? { languageId: attachment.languageId.toLowerCase() } : {}),
		...(extension ? { extension } : {}),
	};
};
