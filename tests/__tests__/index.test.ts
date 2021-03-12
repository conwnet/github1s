import { chromium, Browser, Page } from 'playwright';
import {
	toMatchImageSnapshot,
	MatchImageSnapshotOptions,
} from 'jest-image-snapshot';

expect.extend({ toMatchImageSnapshot });

const matchImageSnapshotOptions: MatchImageSnapshotOptions = {
	failureThreshold: 0.1,
	failureThresholdType: 'percent',
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
