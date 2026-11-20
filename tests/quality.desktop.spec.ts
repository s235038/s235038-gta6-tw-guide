import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const base = '/s235038-gta6-tw-guide/';
const canonical = `https://s235038.github.io${base}`;
const release = `${base}guides/release-platforms/`;
const spoiler = `${base}guides/chapter-1-plumbing/`;

test('keyboard can skip to content, focus search and use the spoiler control', async ({ page }) => {
  await page.goto(base);
  await page.keyboard.press('Tab');
  const active = page.locator(':focus');
  await expect(active).toHaveText(/跳至|跳到|跳過/);
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();

  const query = page.locator('#guide-query');
  await query.focus();
  await page.keyboard.type('GTA6');
  await expect(page.locator('[data-search-status]')).not.toBeEmpty();
  const toggle = page.locator('[data-spoiler-toggle]');
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('home and release article pass basic axe WCAG AA checks', async ({ page }) => {
  for (const path of [base, release]) {
    await page.goto(path);
    if (path === base) {
      await page.locator('#guide-query').fill('支援平台');
      await expect(page.locator('[data-guide-card][data-id="release-platforms"] mark').first()).toBeVisible();
    }
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
  }
});

test('the article share button copies the canonical URL', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(release);
  await page.locator('[data-copy]').click();
  await expect(page.locator('[data-copy-status]')).toContainText('已複製');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(`${canonical}guides/release-platforms/`);
});

test('article scroll position persists and can be resumed', async ({ page }) => {
  await page.addInitScript(() => { history.scrollRestoration = 'manual'; });
  await page.goto(release);
  const meter = page.locator('[data-reading-meter]');
  await expect(meter).toHaveAttribute('value', '0');

  const scrollTarget = await page.locator('[data-reading-content]').evaluate((content) => {
    const { top, height } = content.getBoundingClientRect();
    const target = top + scrollY + Math.max(1, height - innerHeight / 2) * 0.55;
    scrollTo({ top: target, behavior: 'instant' });
    return target;
  });
  await expect.poll(async () => Number(await meter.getAttribute('value'))).toBeGreaterThan(25);
  const stored = Number(await meter.getAttribute('value'));
  expect(stored).toBeLessThan(100);

  await page.reload();
  await expect(meter).toHaveAttribute('value', String(stored));
  const resume = page.locator('[data-reading-resume]');
  await expect(resume).toBeVisible();
  await resume.click();
  await expect.poll(() => page.evaluate((target) => Math.abs(scrollY - target), scrollTarget)).toBeLessThan(30);
});

test('blocked browser storage and clipboard expose actionable fallback states', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage disabled'); } });
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
  });
  await page.goto(release);
  const bookmark = page.locator('main [data-save="release-platforms"]');
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-local-status]')).toContainText('無法儲存偏好');
  await page.locator('[data-copy]').click();
  const fallback = page.locator('[data-copy-fallback]');
  await expect(fallback).toBeVisible();
  await expect(fallback).toBeFocused();
  await expect(fallback).toHaveValue(`${canonical}guides/release-platforms/`);
  await expect(page.locator('[data-copy-status]')).toContainText('手動複製');
});

test('sitemap, RSS, breadcrumbs, canonicals, social assets, sources and internal links are consistent', async ({ page, request }) => {
  const sitemap = await request.get(`${base}sitemap.xml`);
  expect(sitemap.ok()).toBe(true);
  const pages = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(pages).toContain(canonical);
  expect(pages).toContain(`${canonical}guides/release-platforms/`);
  expect(pages.length).toBeGreaterThanOrEqual(6);
  expect(new Set(pages).size).toBe(pages.length);

  const robots = await request.get(`${base}robots.txt`);
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`${canonical}sitemap.xml`);

  const rss = await request.get(`${base}rss.xml`);
  expect(rss.ok()).toBe(true);
  const feedURLs = await page.evaluate((content) => {
    const xml = new DOMParser().parseFromString(content, 'application/xml');
    return Array.from(xml.querySelectorAll('rss > channel > item > link'), (link) => link.textContent?.trim() ?? '');
  }, await rss.text());
  expect(feedURLs).toContain(`${canonical}guides/release-platforms/`);
  expect(feedURLs).not.toContain(`https://s235038.github.io${spoiler}`);
  expect(feedURLs.every((url) => pages.includes(url))).toBe(true);

  const titles = new Set<string>();
  const checkedLinks = new Set<string>();
  for (const url of pages) {
    expect(url).toMatch(/^https:\/\/s235038\.github\.io\/s235038-gta6-tw-guide\//);
    expect(url).not.toContain('404');
    const response = await page.goto(new URL(url).pathname);
    expect(response?.ok()).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('lang', /^zh-(?:Hant-)?TW$/);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', url);
    await expect(page.locator('head meta[name="description"]')).toHaveAttribute('content', /\S.{10,}/);
    await expect(page.locator('head meta[property="og:url"]')).toHaveAttribute('content', url);
    await expect(page.locator('head meta[property="og:title"]')).toHaveAttribute('content', /\S.{4,}/);
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
    expect(await page.locator('main h1').count()).toBe(1);
    titles.add(await page.title());

    const image = await page.locator('head meta[property="og:image"]').getAttribute('content');
    expect(image).toMatch(/^https:\/\/s235038\.github\.io\/s235038-gta6-tw-guide\//);
    const ogPath = new URL(image!).pathname;
    if (!checkedLinks.has(ogPath)) {
      const asset = await request.get(ogPath);
      expect(asset.ok()).toBe(true);
      expect(asset.headers()['content-type']).toMatch(/^image\//);
      expect((await asset.body()).byteLength).toBeGreaterThan(1024);
      checkedLinks.add(ogPath);
    }

    if (url.includes('/guides/')) {
      await expect(page.locator('main article')).toBeVisible();
      const structuredData = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.flatMap((script) => {
        const data = JSON.parse(script.textContent ?? 'null');
        return data?.['@graph'] ?? [data];
      }));
      const breadcrumb = structuredData.find((data) => data?.['@type'] === 'BreadcrumbList');
      expect(breadcrumb?.itemListElement?.[0]?.item).toBe(canonical);
      expect(breadcrumb?.itemListElement?.at(-1)?.item).toBe(url);
      const dates = await page.locator('main article time[datetime]').evaluateAll((elements) => elements.map((element) => element.getAttribute('datetime')));
      expect(dates.length).toBeGreaterThanOrEqual(2);
      for (const date of dates) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const sources = page.locator('#sources a[href^="https://"]');
      expect(await sources.count()).toBeGreaterThan(0);
      await expect(page.locator('#sources')).toContainText(/官方|媒體|查證|可信/);
    }
    if (url === canonical) {
      await expect(page.locator('head link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', `${base}rss.xml`);
    }

    const links = await page.getByRole('link', { includeHidden: true }).evaluateAll((anchors) => anchors.map((anchor) => {
      const link = anchor as HTMLAnchorElement;
      return { href: link.href, sameOrigin: link.origin === location.origin };
    }));
    for (const link of links.filter((link) => link.href && link.sameOrigin)) {
      const parsed = new URL(link.href);
      expect(parsed.pathname, `Internal link ${link.href} from ${url}`).toMatch(/^\/s235038-gta6-tw-guide\//);
      if (parsed.pathname === new URL(url).pathname && parsed.hash) {
        const fragment = decodeURIComponent(parsed.hash.slice(1));
        expect(await page.evaluate((id) => Boolean(document.getElementById(id)), fragment), `Fragment ${link.href}`).toBe(true);
      }
      if (!checkedLinks.has(parsed.pathname)) {
        expect((await request.get(parsed.pathname)).ok(), `Internal link ${link.href} from ${url}`).toBe(true);
        checkedLinks.add(parsed.pathname);
      }
    }
  }
  expect(titles.size).toBe(pages.length);
});

test('repository text has no recognizable private credentials', () => {
  const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).toString().split('\0').filter(Boolean);
  expect(paths.length).toBeGreaterThan(0);
  const patterns = [
    /\b(?:gh[pousr]_|github_pat_)[a-z\d_]{20,}\b/i,
    /\bsk-(?:proj-|svcacct-)?[a-z\d_-]{25,}\b/i,
    /\bAKIA[A-Z\d]{16}\b/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ];

  for (const path of paths) {
    const buffer = readFileSync(path);
    if (buffer.includes(0)) continue;
    const text = buffer.toString('utf8');
    expect(patterns.some((pattern) => pattern.test(text)), `Potential private credential in ${path}`).toBe(false);
  }
});
