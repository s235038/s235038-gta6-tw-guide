import { expect, test } from '@playwright/test';

const base = '/s235038-gta6-tw-guide/';
const canonical = `https://s235038.github.io${base}`;
const release = `${base}guides/release-platforms/`;
const spoiler = `${base}guides/chapter-1-plumbing/`;
const missing = `${base}pages-smoke-missing/`;

test('public pages and assets work with mobile search, favorites and spoiler protection', async ({ page, request }) => {
  test.setTimeout(100_000);

  // The Pages API can report success before the result reaches every CDN edge.
  await expect(async () => {
    const responses = await Promise.all([base, release, spoiler, missing].map((path) => request.get(path, { timeout: 7000 })));
    expect(responses.map((response) => response.status())).toEqual([200, 200, 200, 404]);
    for (const response of responses) expect(response.headers()['content-type']).toMatch(/^text\/html/);
    expect(await responses[0].text()).toContain('G6 台灣攻略資料庫');
    expect(await responses[3].text()).toContain('找不到這個頁面');
  }).toPass({ timeout: 60_000, intervals: [1500, 3000, 5000, 8000] });

  const assetTypes = new Set<string>();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    const type = response.request().resourceType();
    if (type !== 'stylesheet' && type !== 'script') return;
    const contentType = response.headers()['content-type'] ?? '';
    if (!response.ok() || !(type === 'stylesheet' ? /text\/css/ : /javascript/).test(contentType)) {
      errors.push(`${response.url()} returned ${response.status()} (${contentType})`);
    } else {
      assetTypes.add(type);
    }
  });

  await page.goto(base);
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', canonical);
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og?.startsWith(canonical)).toBe(true);
  const sharingImage = await request.get(new URL(og!).pathname);
  expect(sharingImage.ok()).toBe(true);
  expect(sharingImage.headers()['content-type']).toMatch(/^image\/png/);

  const releaseCard = page.locator('[data-guide-card][data-id="release-platforms"]');
  const query = page.locator('#guide-query');
  await query.fill('支援平台');
  await expect(releaseCard).toBeVisible();
  await expect(releaseCard.locator('mark').first()).toContainText('支援平台');
  const bookmark = releaseCard.locator('[data-save]');
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await expectMobileWidth();

  await releaseCard.locator(`a[href="${release}"]`).click();
  await expect(page.locator('main article')).toBeVisible();
  await expect(page.locator('#sources a[href^="https://"]').first()).toBeVisible();
  await expect(page.locator('main [data-save]')).toHaveAttribute('aria-pressed', 'true');
  await expectMobileWidth();

  await page.goto(spoiler);
  const body = page.locator('[data-spoiler-body]');
  await expect(body).toBeHidden();
  await page.locator('[data-spoiler-reveal]').click();
  await expect(body).toBeVisible();
  await page.reload();
  await expect(body).toBeHidden();
  await expectMobileWidth();

  expect([...assetTypes]).toEqual(expect.arrayContaining(['stylesheet', 'script']));
  expect(errors).toEqual([]);

  async function expectMobileWidth() {
    const width = await page.evaluate(() => ({ window: innerWidth, document: document.documentElement.scrollWidth }));
    expect(width.window).toBe(390);
    expect(width.document).toBeLessThanOrEqual(width.window + 1);
  }
});
