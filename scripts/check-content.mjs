import { readdir, readFile } from 'node:fs/promises'
import { parse } from 'yaml'

const root = new URL('../src/content/guides/', import.meta.url)
const args = process.argv.slice(2)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const asOf = args.find(arg => arg.startsWith('--as-of='))?.slice(8) ?? today
const reportStale = args.includes('--report-stale')
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().startsWith(value)
if (!validDate(asOf)) throw new Error('--as-of 需要有效的 YYYY-MM-DD 日期')

const files = (await readdir(root)).filter(file => file.endsWith('.md')).sort()
const slugs = new Set(files.map(file => file.slice(0, -3)))
const titles = new Set()
const descriptions = new Set()
const errors = []
const overdue = []
const timeSensitive = new Set(['news', 'faq'])

function checkCopy(field, value, used, min, max, fail) {
  if (typeof value !== 'string') {
    fail(`${field} 必須填寫`)
    return
  }
  const key = value.normalize('NFKC').trim()
  const length = [...key].length
  if (length < min || length > max || !/[\p{Script=Han}]/u.test(key)) {
    fail(`${field} 需含中文，並控制在 ${min}–${max} 字元`)
  }
  if (used.has(key)) fail(`${field} 與其他文章重複`)
  used.add(key)
}

for (const file of files) {
  const fail = message => errors.push(`${file} · ${message}`)
  const slug = file.slice(0, -3)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail('檔名需使用小寫英文、數字和連字號')
  const text = (await readFile(new URL(file, root), 'utf8')).replace(/\r\n/g, '\n')
  const frontmatter = /^---\n([\s\S]+?)\n---\n([\s\S]*)$/.exec(text)
  if (!frontmatter) {
    fail('缺少 YAML frontmatter 或 Markdown 內文')
    continue
  }

  let meta
  try {
    meta = parse(frontmatter[1], { maxAliasCount: 0 })
  } catch (error) {
    fail(error.message)
    continue
  }
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    fail('frontmatter 必須是欄位對應值')
    continue
  }

  checkCopy('title', meta.title, titles, 12, 64, fail)
  checkCopy('description', meta.description, descriptions, 20, 135, fail)
  if (!validDate(meta.published) || !validDate(meta.updated) || meta.published > meta.updated || meta.updated > asOf) {
    fail('發布與更新日期必須有效，且依序早於或等於查核基準日')
  }
  if (!Array.isArray(meta.related) || meta.related.some(item => typeof item !== 'string' || !slugs.has(item) || item === slug)) {
    fail('related 需指向其他存在的文章')
  }

  const levels = [...frontmatter[2].matchAll(/^(#{1,6})\s+\S/gm)].map(match => match[1].length)
  if (levels.filter(level => level === 2).length < 2 || levels.some((level, index) => level === 1 || level > (levels[index - 1] ?? 1) + 1)) {
    fail('文章至少要有兩個二級標題，標題層級須循序')
  }

  if (!Array.isArray(meta.sources) || !meta.sources.length) {
    fail('每篇至少需要一個可核對來源')
    continue
  }
  const isVersionGuide = Array.isArray(meta.tags) &&
    meta.tags.some(tag => typeof tag === 'string' && tag.includes('版本'))
  const days = timeSensitive.has(meta.category) || isVersionGuide ? 14 : 60
  const expired = meta.sources.filter(source => {
    if (!source || typeof source !== 'object' || !validDate(source.checked) ||
        (source.published !== null && (!validDate(source.published) || source.published > source.checked)) ||
        source.checked > asOf) {
      fail('來源查核日期或原始發布日期無效')
      return false
    }
    return (Date.parse(asOf) - Date.parse(source.checked)) / 86_400_000 >= days
  }).length
  if (expired) overdue.push(`${slug} · ${expired} 個來源超過 ${days} 天待複查`)
}

if (!files.length) errors.push('找不到攻略文章')
if (reportStale || overdue.length) {
  console.log(`過期來源巡檢 ${asOf} · ${overdue.length} 篇待複查`)
  for (const entry of overdue) console.log(`- ${entry}`)
}
if (errors.length) {
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`已通過 ${files.length} 篇 Markdown、SEO、來源日期與延伸閱讀檢查`)
}
