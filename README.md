# G6 台灣繁體中文攻略資料庫

獨立的 **Grand Theft Auto VI** 非官方繁體中文遊戲攻略與工具網站專案。

> 本專案與 Rockstar Games、Take-Two Interactive 無關；不代表任何官方授權或合作。遊戲內容均須查證來源，並遵守著作權。

## 本專案的目標

- 繁體中文（台灣用語）、手機優先、無劇透的攻略查詢體驗。
- 文章引用官方公告、可信媒體或經驗證的實測來源，標明查證日期與狀態。
- 免費靜態網站，優先使用 Astro、TypeScript 與 GitHub Pages。
- 搜尋、分類、收藏、劇透開關、SEO、可維護的內容集合。

## 目前狀態

V2「G6 台灣攻略資料庫」可從本儲存庫建置。公開狀態以 GitHub Pages 的部署紀錄與實際連線為準。 [目標站址](https://s235038.github.io/s235038-gta6-tw-guide/)

## 官方資料來源

- https://www.rockstargames.com/VI
- https://www.rockstargames.com/tw/newswire/article/39akk424a9oo53/grand-theft-auto-vi-now-available

## 本機開發與驗證

使用 Node.js 24 和 npm。

```sh
npm ci
npm run dev
```

開啟終端顯示的本機位址，加上 `/s235038-gta6-tw-guide/`。建置結果輸出至 `dist/`。

```sh
npm run content:check
npm run check
npm run build
npx playwright install --with-deps chromium webkit
npm test
```

Playwright 使用建置後的靜態檔案，每次更動後先重新建置。首次準備環境時安裝瀏覽器與系統相依套件。

可用 `npm run content:check -- --report-stale` 列出待複查的來源，接著由編輯者開啟原文查證。修訂文章以 Markdown 為主，並保留既有檔名及首次發佈日期。[文章範本與欄位說明](docs/article-template.md)

## GitHub Pages

工作流程位於 `.github/workflows/pages.yml`。需要啟用時，在儲存庫的 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。設定後，推送 `main` 或在 **Actions** 手動執行工作流程。從部署紀錄開啟公開網址，檢查首頁、文章、404、CSS、JS 和分享圖片。[GitHub Pages 設定說明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Astro 的基底路徑為 `/s235038-gta6-tw-guide/`。以 `src/content/guides/first-hour.md` 為例，對應 `/s235038-gta6-tw-guide/guides/first-hour/`。若日後更換網域或儲存庫目錄，核對 Astro 的 `site` 與 `base`、測試、分享資訊及文案連結。

## 編輯與營運

- [首發來源清單](docs/sources.md) 記錄來源標題、日期、可佐證的資訊及可信程度。
- [營運手冊](docs/operations.md) 包含市場樣本、來源驗證、每日優先序與流量指標。
- [攻略待辦](CONTENT_BACKLOG.md) 依台灣玩家需求與搜尋意圖排列。
- [Threads 首週計畫](marketing/threads-plan.md) 附可用貼文、兩版簡介、手機分享圖、回饋表單與流量紀錄表。
