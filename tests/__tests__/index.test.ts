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
	expect(await page.title()).toMatch(/.*GitHub1s/);

	// Make sure the VS Code loads
	await page.click('div[role="application"]');

	// Make sure the repo loads
	await page.click('div[role="tab"]');
	// GitHub repo Link available
	await page.$eval('a[title="Home"][aria-label="Home"]', (el) => el.innerHTML);
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
	await page.waitForTimeout(3000);

	const image = await page.screenshot();
	expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
});

// test.jestPlaywrightDebug('should show PR list', async () => {
it.only('should show PR list', async () => {
	// Use a repo without future change to avoid snapshot update
	await page.goto(`${BASE_URL}/xcv58/grocery-delivery-times`);
	console.log(1);

	const ul = await page.waitForSelector(
		'.monaco-action-bar.vertical ul.actions-container[role="toolbar"][aria-label="Active View Switcher"]'
	);
	console.log(ul);
	await page.press('body', 'Control+Shift+G');
	// await page.press('body', 'Control+Shift+P');
	// await page.press('body', 'Control+p');
	await page.press('body', 'Tab');
	await page.press('body', 'Tab');
	await page.press('body', ' ');
	await page.press('body', 'Shift+Tab');
	await page.press('body', ' ');
	await page.waitForTimeout(3000);
	const container = await page.$('[id="workbench.parts.sidebar"]');
	let image = await container?.screenshot();
	expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
	// const image = await page.screenshot();
	// expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);

	// console.log(2);
	// expect(ul).toBeTruthy();
	// const actions = await ul?.$$('li');
	// console.log(3);
	// expect(actions?.length).toBeGreaterThan(4);
	// actions?.forEach(async (action) => {
	// 	const label = await action.getAttribute('aria-label');
	// 	console.log({ label });
	// 	if (label?.startsWith('Source Control')) {
	// 		console.log('click');
	// 		await action.click();
	// 	}
	// });
	// page.waitForTimeout(2000);
	// console.log('after click');
	// await page.click('div[aria-label="Pull Requests Section"]');
	// await page.click('h3[title="Commits"]');
	// console.log(4);
	// await page.waitForSelector(
	// 	'div[role="treeitem"][data-index="1"][data-last-element="false"]'
	// );
	// // await page.click('#list_id_2_1')
	// console.log(5);
	// // const container = await page.$('.tree-explorer-viewlet-tree-view');

	// console.log(6);
	// // await page.click('#list_id_3_1')
	// console.log(7);
	// console.log(container);

	// let image = await container?.screenshot();
	// console.log(8);
	// await page.click(
	// 	'.tree-explorer-viewlet-tree-view div.monaco-list-row[role="treeitem"][data-index="0"][data-last-element="false"]'
	// );
	// console.log(8);
	// await page.waitForSelector('[aria-level="2"]');
	// console.log(9);
	// image = await container?.screenshot();
	// // image = await page.screenshot();
	// expect(image).toMatchImageSnapshot(matchImageSnapshotOptions);
});
