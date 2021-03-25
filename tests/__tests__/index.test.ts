import { chromium, Browser, Page } from 'playwright';
import {
	toMatchImageSnapshot,
	MatchImageSnapshotOptions,
} from 'jest-image-snapshot';

expect.extend({ toMatchImageSnapshot });

const matchImageSnapshotOptions: MatchImageSnapshotOptions = {
	failureThreshold: 0.1,
	failureThresholdType: 'percent',
	updatePassedSnapshot: true,
};

let browser: Browser;
let page: Page;

const BASE_URL = 'http://localhost:5000';

beforeAll(async () => {
	browser = await chromium.launch();
});

afterAll(async () => {
	await browser.close();
});

beforeEach(async () => {
	page = await browser.newPage();
});

afterEach(async () => {
	await page.close();
});

it('should load successfully', async () => {
	await page.goto(BASE_URL);
	expect(await page.title()).toBe('GitHub1s');

	// Make sure the VS Code loads
	await page.click('div[role="application"]');

	// Make sure the repo loads
	await page.click('div[role="tab"]');
	// GitHub repo Link available
	await page.$eval(
		'a[title="Repository"][aria-label="Repository"]',
		(el) => el.innerHTML
	);
	// File explorer available
	await page.$eval(
		'div[role="tree"][aria-label="Files Explorer"]',
		(el) => el.innerHTML
	);
	const tab = await page.$eval(
		'div[role="tab"]',
		(el: HTMLElement) => el.innerText
	);
	expect(tab).toBe('[Preview] README.md');
	// Title updated based on the repo
	expect(await page.title()).toMatch(
		/\[Preview\] README\.md . conwnet\/github1s . GitHub1s/
	);
	await page.waitForTimeout(5000);

	// README file will be rendered in an iframe
	await page.$eval(
		'iframe.webview.ready[sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads"][src]',
		(el: HTMLElement) => el.innerHTML
	);

	const image = await page.screenshot();
	expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
});

it('should open file correctly', async () => {
	await page.goto(BASE_URL);
	await page.click('[title="~/tsconfig.json"]');
	await page.click('[data-resource-name="tsconfig.json"]');

	const image = await page.screenshot();
	expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
});

it('should show PR list', async () => {
	// Use a repo without future change to avoid snapshot update
	await page.goto(`${BASE_URL}/xcv58/grocery-delivery-times`);
	await page.click('li[title="Source Control (⌃⇧G)"]');
	await page.click('div[aria-label="Pull Requests Section"]');
	await page.waitForSelector(
		'div.monaco-list-row[role="treeitem"][data-index="1"][data-last-element="false"]'
	);
	const container = await page.$('.tree-explorer-viewlet-tree-view');
	let image = await container?.screenshot();
	expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
	await page.click(
		'.tree-explorer-viewlet-tree-view div.monaco-list-row[role="treeitem"][data-index="0"][data-last-element="false"]'
	);
	await page.waitForSelector('[aria-level="2"]');
	image = await container?.screenshot();
	expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
});
