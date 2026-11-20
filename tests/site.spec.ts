import { expect, test } from '@playwright/test';

const base = '/s235038-gta6-tw-guide/';
const release = `${base}guides/release-platforms/`;
const spoiler = `${base}guides/chapter-1-plumbing/`;

test('homepage, article and 404 fit the viewport with their production assets', async ({ page }, testInfo) => {
  const failedAssets: string[] = [];
  const scriptErrors: string[] = [];
  const assetTypes = new Set<string>();

  page.on('pageerror', (error) => scriptErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (['script', 'stylesheet', 'image'].includes(request.resourceType())) {
      failedAssets.push(`${request.url()} (${request.failure()?.errorText})`);
    }
  });
  page.on('response', (response) => {
    const type = response.request().resourceType();
    if (['script', 'stylesheet', 'image'].includes(type)) {
      if (!response.ok()) failedAssets.push(`${response.url()} (HTTP ${response.status()})`);
      else assetTypes.add(type);
    }
  });

  for (const route of [base, release, `${base}missing-guide/`]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(route.endsWith('missing-guide/') ? 404 : 200);
    await expect(page.locator('main h1')).toBeVisible();

    const size = await page.evaluate(() => ({ width: window.innerWidth, content: document.documentElement.scrollWidth }));
    expect(size.width).toBe(testInfo.project.use.viewport?.width);
    expect(size.content).toBeLessThanOrEqual(size.width + 1);
  }

  await expect(page.locator('main').getByRole('link', { name: /首頁/ }).first()).toBeVisible();
  await page.locator('main').getByRole('link', { name: /首頁/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`${base}$`));
  expect([...assetTypes]).toEqual(expect.arrayContaining(['script', 'stylesheet']));
  expect(failedAssets).toEqual([]);
  expect(scriptErrors).toEqual([]);
});

test('instant query, category and tag filters update the cards and empty state', async ({ page }) => {
  await page.goto(base);
  const cards = page.locator('[data-guide-card]');
  const visibleCards = page.locator('[data-guide-card]:visible');
  const releaseCard = cards.filter({ has: page.locator(`a[href="${release}"]`) });
  const query = page.locator('#guide-query');
  const category = page.locator('#guide-category');
  const tag = page.locator('#guide-tag');
  const baseline = await visibleCards.count();
  expect(baseline).toBeGreaterThanOrEqual(4);

  await query.fill('GTA6');
  await expect(releaseCard).toBeVisible();
  await expect(releaseCard.locator('mark').first()).toHaveText(/GTA\s*6/i);
  await expect(page).toHaveURL(/\?q=GTA6/);
  await page.reload();
  await expect(query).toHaveValue('GTA6');
  await expect(releaseCard.locator('mark').first()).toHaveText(/GTA\s*6/i);
  await query.fill('UTC+8');
  await expect(releaseCard.locator('[data-match-preview] mark').first()).toHaveText('UTC+8');
  await query.fill('完全找不到的測試關鍵字xyz');
  await expect(visibleCards).toHaveCount(0);
  await expect(page.locator('[data-no-results]')).toBeVisible();
  await query.fill('');
  await expect(visibleCards).toHaveCount(baseline);
  await expect(releaseCard.locator('mark')).toHaveCount(0);

  const categoryValue = await releaseCard.getAttribute('data-category');
  expect(categoryValue).toBeTruthy();
  await category.selectOption(categoryValue!);
  await expect(releaseCard).toBeVisible();
  expect(await visibleCards.count()).toBeLessThan(baseline);
  expect(await visibleCards.evaluateAll((nodes) => nodes.every((node) => node.getAttribute('data-category') === document.querySelector<HTMLSelectElement>('#guide-category')?.value))).toBe(true);
  await category.selectOption({ index: 0 });

  const tagValues = await tag.locator('option').evaluateAll((options) => options.slice(1).map((option) => (option as HTMLOptionElement).value));
  expect(tagValues.length).toBeGreaterThan(0);
  const selectedTag = tagValues.find((value) => value === '平台') ?? tagValues[0];
  await tag.selectOption(selectedTag);
  const tagged = await visibleCards.count();
  expect(tagged).toBeGreaterThan(0);
  expect(tagged).toBeLessThan(baseline);
  await expect(page.locator('[data-search-status]')).toContainText(String(tagged));
  await page.locator('[data-clear-filters]').click();
  await expect(visibleCards).toHaveCount(baseline);
  await expect(tag).toHaveValue('');
});

test('favorites and reading progress stay in sync after refresh and navigation', async ({ page }) => {
  await page.goto(base);
  const bookmark = page.locator('[data-guide-card] [data-save="release-platforms"]');
  const filter = page.locator('[data-saved-filter]');
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await filter.click();
  await expect(page.locator('[data-guide-card]:visible')).toHaveCount(1);
  await page.reload();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');

  await page.locator(`[data-guide-card] a[href="${release}"]`).click();
  await expect(page).toHaveURL(new RegExp(`${release}$`));
  const articleBookmark = page.locator('main [data-save="release-platforms"]');
  const progress = page.locator('[data-progress="release-platforms"]');
  await expect(articleBookmark).toHaveAttribute('aria-pressed', 'true');
  await progress.click();
  await page.reload();
  await expect(progress).toHaveAttribute('aria-pressed', 'true');
  await articleBookmark.click();
  await page.goto(base);
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-progress-count]')).toContainText('已讀 1 篇');
  await expect(page.locator('[data-player-library]')).toBeVisible();
  await expect(page.locator('[data-player-read]')).toHaveText('1');
  await expect(page.locator('[data-player-saved]')).toHaveText('0');
  const progressFilter = page.locator('#guide-progress');
  await progressFilter.selectOption('read');
  await expect(page.locator('[data-guide-card]:visible')).toHaveCount(1);
  await expect(page.locator('[data-guide-card][data-id="release-platforms"] [data-guide-read]')).toBeVisible();
  await page.reload();
  await expect(progressFilter).toHaveValue('read');
  await expect(page.locator('[data-guide-card]:visible')).toHaveCount(1);
  await progressFilter.selectOption('unread');
  await expect(bookmark).toBeHidden();
  await progressFilter.selectOption('');
  await filter.click();
  await expect(page.locator('[data-no-results]')).toBeVisible();
});

test('spoiler preferences persist and article spoilers can be revealed intentionally', async ({ page }) => {
  await page.goto(base);
  await page.getByRole('link', { name: '無劇透入口' }).click();
  await expect(page).toHaveURL(/#start$/);
  await expect(page.getByRole('heading', { name: '新手必讀' })).toBeVisible();
  const toggle = page.locator('[data-spoiler-toggle]');
  const spoilerCard = page.locator('[data-guide-card][data-id="chapter-1-plumbing"]');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(spoilerCard).toBeHidden();
  await toggle.click();
  await expect(spoilerCard).toBeVisible();
  const safeFilter = page.locator('[data-spoiler-filter]');
  await safeFilter.click();
  await expect(safeFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(spoilerCard).toBeHidden();
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(safeFilter).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-clear-filters]').click();
  await expect(spoilerCard).toBeVisible();
  await page.goto(spoiler);
  const body = page.locator('[data-spoiler-body]');
  await expect(body).toBeVisible();
  await toggle.click();
  await expect(body).toBeHidden();
  await expect(page.locator('[data-spoiler-gate]')).toBeVisible();
  await page.locator('[data-spoiler-reveal]').click();
  await expect(body).toBeVisible();
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(body).toBeHidden();
});
