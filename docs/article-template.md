# 攻略文章範本

選一個明確的台灣玩家問題，複製下方內容到 `src/content/guides/你的英文-slug.md`。替換全部提示文字與示意網址後再加入內容集合。

```markdown
---
title: "GTA 6＋台灣玩家會搜尋的具體問題"
description: "一句說明誰在什麼狀況會用到，以及讀完能得到什麼答案。"
category: beginner
tags: ["新手", "主題關鍵字"]
keywords: ["玩家可能搜尋的別稱"]
published: 'YYYY-MM-DD'
updated: 'YYYY-MM-DD'
status: official
level: "先填適用進度或入門難度"
spoiler: false
sources:
  - title: "發佈者｜來源原文標題"
    url: "https://example.com/replace-with-verified-source"
    published: null
    checked: 'YYYY-MM-DD'
    confidence: "高｜官方原始資料，說明支持的範圍"
    type: official
related: ["first-hour"]
---

開頭直接回答玩家問題，補一句適用平台、章節或版本。

## 先確認適用條件

寫出開始狀態、前置條件與平台限制。有查證差異就對應到各平台或版本。

## 操作方法或重點解釋

1. 寫出玩家會看到的介面或起始狀態。
2. 描述下一個可核對的動作及結果。
3. 如果沒有出現預期結果，寫出已查證的排查方式。

## 常見疑問

補上同一問題最常見的例外。仍在查證的資訊用小節直接說明現況。
```

| 欄位 | 編輯方式 |
| --- | --- |
| `title`、`description` | 標題直接對應一個查詢意圖，摘要提供同篇專屬資訊。用台灣介面名稱與自然搜尋詞。 |
| `category`、`tags`、`level` | 分類可用 `news`、`beginner`、`missions`、`money`、`vehicles`、`map`、`collectibles`、`faq`。標籤填讀者會篩選的詞，進度標籤可用「入門」或「第一章」。 |
| `keywords` | 選填，供站內搜尋比對玩家常用別稱。已出現在標題、摘要或標籤的詞可直接沿用。 |
| `published`、`updated` | 填帶引號的 ISO 日期 `YYYY-MM-DD`。保留首次發布日，有實質修改才更新 `updated`。只複查來源時更新該筆 `checked`。 |
| `status` | `official` 官方已確認、`tested` 媒體實測、`community` 玩家提供待複驗、`unconfirmed` 尚未確認。至少有一筆 `sources[].type` 與文章狀態相符。玩家回報先進待辦。 |
| `spoiler` | 有任務答案或劇情發展時設為 `true`。標題、摘要和分享預覽保留適用情境即可。 |
| `sources` | 放至少一筆，填原始標題、HTTPS 網址、發布日期、查核日期、可信程度與來源狀態。沒有公開發布日期填 `null`。只有官方更新日期時，在可信程度中註明。 |
| `related` | 陣列內填現有文章名，省略 `.md`。選能讓玩家接續解決下一個問題的文章。 |

## 上架檢查

- [ ] 標題、摘要、第一段對應同一問題，各篇各自有清楚的使用情境。內容標題從二級小標開始，站內頁面會產生主標題。
- [ ] 來源支持平台、名稱、步驟、數字和結論。使用可追溯的實測資料時補適用版本與驗證範圍。[來源驗證清單](operations.md#來源驗證清單)
- [ ] 查核日符合每筆實際複查日期，來源有改版或與現行版本不符時先複核。
- [ ] `npm run content:check`、`npm run check`、`npm run build` 通過後，檢查站內連結、搜尋結果、手機閱讀、劇透提示與分享預覽。
- [ ] 已存在的攻略沿用同一個檔名與網址。新篇加入適合連過去的舊文，也在新文填相關文章。
