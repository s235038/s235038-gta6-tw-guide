import { getCollection, type CollectionEntry } from 'astro:content'

export const categories = [
  { id: 'news', label: '最新資訊', description: '上市日期、對應平台與官方公告' },
  { id: 'beginner', label: '新手入門', description: '購買、下載與第一次遊玩前的準備' },
  { id: 'missions', label: '主線任務', description: '任務順序、流程與卡關解法' },
  { id: 'money', label: '賺錢與資源', description: '整理可以重複驗證的資源取得方式' },
  { id: 'vehicles', label: '載具與交通', description: '整理交通方式與載具入手條件' },
  { id: 'map', label: '地圖與地點', description: '罪惡市與雷歐奈達的地區索引' },
  { id: 'collectibles', label: '收集品與完成度', description: '期待實測確認的位置、條件與清單' },
  { id: 'faq', label: '常見問題', description: '給台灣玩家的上市與購買常見問答' },
] as const

export const statusLabels = {
  official: '官方已確認',
  tested: '媒體實測',
  community: '玩家提供・待覆核',
  unconfirmed: '尚未確認',
} as const

const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')

export const paths = {
  home: base,
  guides: `${base}#guides`,
  article: (id: string) => `${base}guides/${encodeURIComponent(id)}/`,
  asset: (file: string) => `${base}${file}`,
}

export async function listGuides() {
  return (await getCollection('guides')).sort((first, second) =>
    second.data.updated.localeCompare(first.data.updated) ||
    first.data.published.localeCompare(second.data.published) ||
    first.id.localeCompare(second.id)
  )
}

export function guidePreview(guide: CollectionEntry<'guides'>) {
  const { title, description, tags, keywords, category, level } = guide.data
  const label = categories.find(item => item.id === category)?.label
  const body = guide.body
    ?.replace(/!?\[([^\]\n]+)\]\([^\n)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#*`_~]/g, '')
  return [title, description, ...tags, ...keywords, label, level, body].join(' ').replace(/\s+/g, ' ').trim()
}

export function dateLabel(date: string) {
  return date.replaceAll('-', '/')
}
