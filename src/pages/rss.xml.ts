import type { APIRoute } from 'astro'
import { listGuides, paths } from '../lib/content'

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
const xml = (value: string) => value.replace(/[&<>"']/g, character => entities[character as keyof typeof entities])

export const GET: APIRoute = async ({ site }) => {
  const home = new URL(paths.home, site).href
  const feed = new URL(paths.asset('rss.xml'), site).href
  const guides = (await listGuides()).filter(guide => !guide.data.spoiler).slice(0, 20)
  const items = guides.map(({ id, data }) => {
    const url = xml(new URL(paths.article(id), site).href)
    return `    <item>
      <title>${xml(data.title)}</title>
      <description>${xml(data.description)}</description>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(data.published).toUTCString()}</pubDate>
    </item>`
  }).join('\n')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>G6 台灣攻略資料庫</title>
    <description>最新 GTA 6 台灣繁體中文無劇透攻略</description>
    <link>${xml(home)}</link>
    <language>zh-TW</language>
    <atom:link href="${xml(feed)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
