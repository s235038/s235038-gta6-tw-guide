import { defineConfig, devices } from '@playwright/test';

const publicURL = process.env.G6_PUBLIC_URL;
const baseURL = publicURL || 'http://127.0.0.1:4317/s235038-gta6-tw-guide/';
const desktopAndPublicSpecs = ['*.desktop.spec.ts', '*.public.spec.ts'];

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: publicURL ? undefined : {
    command: 'node tests/serve-dist.mjs',
    url: baseURL,
    reuseExistingServer: false,
  },
  testMatch: publicURL ? '*.public.spec.ts' : undefined,
  projects: publicURL ? [{
    name: 'public-android-chromium-390',
    use: { ...devices['Pixel 7'], viewport: { width: 390, height: 800 }, screen: { width: 390, height: 800 } },
  }] : [
    {
      name: 'desktop-chromium',
      testIgnore: '*.public.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    ...[320, 360].map((width) => ({
      name: `android-chromium-${width}`,
      testIgnore: desktopAndPublicSpecs,
      use: { ...devices['Pixel 7'], viewport: { width, height: 720 }, screen: { width, height: 720 } },
    })),
    ...['iPhone SE (3rd gen)', 'iPhone 13', 'iPhone 15 Pro Max'].map((model) => ({
      name: `iphone-webkit-${devices[model].viewport.width}`,
      testIgnore: desktopAndPublicSpecs,
      use: { ...devices[model] },
    })),
    { name: 'tablet-webkit-768', testIgnore: desktopAndPublicSpecs, use: { ...devices['iPad Mini'] } },
  ],
});
