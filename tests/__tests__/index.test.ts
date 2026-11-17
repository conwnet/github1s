import { chromium, Browser, Page } from 'playwright';
import { toMatchImageSnapshot, MatchImageSnapshotOptions } from 'jest-image-snapshot';

jest.setTimeout(60000);
expect.extend({ toMatchImageSnapshot });

const matchImageSnapshotOptions: MatchImageSnapshotOptions = {
	failureThreshold: 0.15,
	failureThresholdType: 'percent',
	updatePassedSnapshot: true,
};

let browser: Browser;
let page: Page;

const BASE_URL = 'http://localhost:8080';

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
	await page.goto(`${BASE_URL}/conwnet/github1s`);
	expect(await page.title()).toMatch(/.*GitHub1s/);

	// Make sure the VS Code loads
	await page.click('div[role="application"]');

	// Make sure the repo loads
	await page.click('div[role="tab"]');
	// GitHub repo Link available
	await page.$eval('div.home-bar', (el) => el.innerHTML);
	// File explorer available
	await page.$eval('div[role="tree"][aria-label="Files Explorer"]', (el) => el.innerHTML);
	const tab = await page.$eval('div[role="tab"] .label-name', (el: HTMLElement) => el.innerText);
	expect(tab).toBe('[Preview] README.md');
	// Title updated based on the repo
	expect(await page.title()).toMatch(/\[Preview\] README\.md . conwnet\/github1s . GitHub1s/);

	// Wait for the README content and its assets inside the nested webview frames.
	const preview = page.frameLocator('iframe.webview.ready').frameLocator('iframe[title="[Preview] README.md"]');
	await preview.getByRole('heading', { name: 'GitHub1s', exact: true }).waitFor();
	await preview.locator('body').evaluate(async () => {
		await document.fonts.ready;
		await Promise.all(Array.from(document.images, (image) => image.decode()));
	});

	const image = await page.screenshot();
	expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
});

it('should open file correctly', async () => {
	await page.goto(`${BASE_URL}/conwnet/github1s`);
	await page.waitForSelector('iframe.webview.ready');
	await page.click('[aria-label="~/tsconfig.json"]');
	await page.click('[data-resource-name="tsconfig.json"]');
	await page.waitForSelector('[role="tab"][aria-selected="true"][data-resource-name="tsconfig.json"]');
	await page.waitForSelector('.monaco-editor[data-uri="github1s:/tsconfig.json"] .view-lines');

	const image = await page.screenshot();
	expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
});

it('should show Commit files', async () => {
	await page.goto(`${BASE_URL}/conwnet/github1s/commit/ecd252fa54de41b1cb622ff5a1f8a1b715d3b621`);
	await page.waitForSelector('.monaco-action-bar.vertical ul.actions-container[aria-label="Active View Switcher"]');
	await page.press('body', 'Control+Shift+G');
	await page.waitForTimeout(6000);

	const container = await page.$('[id="workbench.parts.sidebar"]');
	const image = await container?.screenshot();
	expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
});
