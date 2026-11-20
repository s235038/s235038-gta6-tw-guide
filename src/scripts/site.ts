import { matchExcerpt, normalizeSearch, showMatches } from './search-text'

const STORAGE_KEY = 'g6-guide-preferences-v1'

type Preferences = { saved: string[]; read: string[]; hideSpoilers: boolean }
const defaults: Preferences = { saved: [], read: [], hideSpoilers: true }

function list(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string'))] : []
}

function loadPreferences(): Preferences {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return {
      saved: list(data?.saved),
      read: list(data?.read),
      hideSpoilers: typeof data?.hideSpoilers === 'boolean' ? data.hideSpoilers : true,
    }
  } catch {
    return { ...defaults }
  }
}

let preferences = loadPreferences()
let revealOnce = false
const form = document.querySelector<HTMLFormElement>('[data-guide-search]')
const query = document.querySelector<HTMLInputElement>('#guide-query')
const category = document.querySelector<HTMLSelectElement>('#guide-category')
const tag = document.querySelector<HTMLSelectElement>('#guide-tag')
const progressFilter = document.querySelector<HTMLSelectElement>('#guide-progress')
const savedFilter = document.querySelector<HTMLButtonElement>('[data-saved-filter]')
const safeFilter = document.querySelector<HTMLButtonElement>('[data-spoiler-filter]')
const clearFilters = document.querySelector<HTMLButtonElement>('[data-clear-filters]')
const searchStatus = document.querySelector<HTMLElement>('[data-search-status]')
const noResults = document.querySelector<HTMLElement>('[data-no-results]')
const spoilerCount = document.querySelector<HTMLElement>('[data-spoiler-count]')
const progressCount = document.querySelector<HTMLElement>('[data-progress-count]')
const playerLibrary = document.querySelector<HTMLElement>('[data-player-library]')
const saveButtons = document.querySelectorAll<HTMLButtonElement>('[data-save]')
const progressButtons = document.querySelectorAll<HTMLButtonElement>('[data-progress]')
const spoilerToggles = document.querySelectorAll<HTMLButtonElement>('[data-spoiler-toggle]')
const spoilerGate = document.querySelector<HTMLElement>('[data-spoiler-gate]')
const spoilerBody = document.querySelector<HTMLElement>('[data-spoiler-body]')
const revealButton = document.querySelector<HTMLButtonElement>('[data-spoiler-reveal]')
const localStatus = document.querySelector<HTMLElement>('[data-local-status]')
const relatedSpoilers = document.querySelectorAll<HTMLElement>('[data-related-spoiler]')

const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-guide-card]'), item => ({
  item,
  id: item.dataset.id ?? '',
  category: item.dataset.category,
  tags: list(JSON.parse(item.dataset.tags ?? '[]')),
  source: item.dataset.search ?? '',
  search: normalizeSearch(item.dataset.search ?? ''),
  spoiler: item.dataset.spoiler === 'true',
  readBadge: item.querySelector<HTMLElement>('[data-guide-read]'),
  fields: Array.from(item.querySelectorAll('[data-highlight]'), element => {
    const text = element.textContent ?? ''
    return { element, text, search: normalizeSearch(text) }
  }),
  preview: item.querySelector<HTMLElement>('[data-match-preview]'),
  excerpt: item.querySelector<HTMLElement>('[data-match-excerpt]'),
  highlightKey: '',
}))
let savedOnly = false
let safeOnly = false

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    if (localStatus) {
      localStatus.hidden = false
      localStatus.textContent = '瀏覽器無法儲存偏好，這次的變更只會保留到離開頁面。'
    }
  }
}

function toggleEntry(entries: string[], id: string) {
  return entries.includes(id) ? entries.filter(entry => entry !== id) : [...entries, id]
}

function setText(element: Element | null, text: string) {
  if (element && element.textContent !== text) element.textContent = text
}

function highlightCard(card: typeof cards[number], tokens: string[]) {
  const key = tokens.join(' ')
  if (card.highlightKey === key) return
  card.highlightKey = key
  for (const { element, text } of card.fields) showMatches(element, text, tokens)
  if (!card.preview || !card.excerpt) return
  const missing = tokens.filter(token => !card.fields.some(field => field.search.includes(token)))
  const excerpt = missing.length ? matchExcerpt(card.source, missing) : ''
  card.preview.hidden = !excerpt
  showMatches(card.excerpt, excerpt, missing)
}

function renderSearch() {
  if (!form) return
  const tokens = [...new Set(normalizeSearch(query?.value ?? '').split(/[\s、，,；;]+/u).filter(Boolean))]
  let visible = 0
  let hiddenSpoilers = 0
  for (const card of cards) {
    const { item, id, category: group, tags, search, spoiler } = card
    const read = preferences.read.includes(id)
    const progressMatches = !progressFilter?.value || (progressFilter.value === 'read') === read
    const matched = progressMatches && (!category?.value || group === category.value) &&
      (!tag?.value || tags.includes(tag.value)) &&
      (!savedOnly || preferences.saved.includes(id)) &&
      tokens.every(token => search.includes(token))
    const protectedCard = spoiler && (preferences.hideSpoilers || safeOnly)
    item.hidden = !matched || protectedCard
    if (!item.hidden) {
      visible++
      highlightCard(card, tokens)
    }
    if (matched && protectedCard) hiddenSpoilers++
  }
  savedFilter?.setAttribute('aria-pressed', String(savedOnly))
  safeFilter?.setAttribute('aria-pressed', String(safeOnly))
  if (clearFilters) {
    clearFilters.hidden = !tokens.length && !category?.value && !tag?.value && !progressFilter?.value && !savedOnly && !safeOnly
  }
  setText(searchStatus, `共 ${visible} 篇攻略`)
  if (spoilerCount) {
    spoilerCount.hidden = hiddenSpoilers === 0
    setText(spoilerCount, `防劇透已隱藏 ${hiddenSpoilers} 篇`)
  }
  if (noResults) {
    noResults.hidden = visible !== 0
    const heading = noResults.querySelector('strong')
    const hint = noResults.querySelector('p')
    if (hiddenSpoilers > 0) {
      setText(heading, '符合條件的攻略含有劇透')
      setText(hint, safeOnly ? '若想查看這些攻略，可取消「只看無劇透」並確認頁首的防劇透設定。' : '若想查看這些攻略，可從頁首關閉防劇透。')
    } else if (savedOnly) {
      setText(heading, '沒有符合條件的收藏')
      setText(hint, '點選文章旁的書籤即可收藏，也可以取消「只看收藏」瀏覽所有攻略。')
    } else if (progressFilter?.value === 'read') {
      setText(heading, '沒有符合條件的已讀攻略')
      setText(hint, '可到文章頁標記為已讀，或調整閱讀進度的篩選選項。')
    } else {
      setText(heading, '找不到符合條件的攻略')
      setText(hint, '可以縮短關鍵字、調整分類或查看其他主題。整理中的攻略會在查證後更新。')
    }
  }
}

function renderPlayerLibrary() {
  if (!playerLibrary) return
  const accessibleCards = cards.filter(card => !card.spoiler || !preferences.hideSpoilers)
  const read = accessibleCards.filter(card => preferences.read.includes(card.id)).length
  const saved = accessibleCards.filter(card => preferences.saved.includes(card.id)).length
  for (const card of cards) {
    if (card.readBadge) card.readBadge.hidden = !preferences.read.includes(card.id)
  }
  setText(playerLibrary.querySelector('[data-player-saved]'), String(saved))
  setText(playerLibrary.querySelector('[data-player-read]'), String(read))
  setText(playerLibrary.querySelector('[data-player-unread]'), String(accessibleCards.length - read))
  playerLibrary.hidden = false
}

function render() {
  for (const button of saveButtons) {
    button.setAttribute('aria-pressed', String(preferences.saved.includes(button.dataset.save ?? '')))
    button.title = button.getAttribute('aria-pressed') === 'true' ? '取消收藏' : '收藏攻略'
  }
  for (const button of progressButtons) {
    button.setAttribute('aria-pressed', String(preferences.read.includes(button.dataset.progress ?? '')))
  }
  if (progressCount) {
    progressCount.hidden = preferences.read.length === 0
    setText(progressCount, `已讀 ${preferences.read.length} 篇`)
  }
  renderPlayerLibrary()
  for (const button of spoilerToggles) {
    button.setAttribute('aria-pressed', String(preferences.hideSpoilers))
    button.title = preferences.hideSpoilers ? '防劇透已開啟' : '防劇透已關閉'
  }
  const protectedArticle = preferences.hideSpoilers && !revealOnce
  if (spoilerGate) spoilerGate.hidden = !protectedArticle
  if (spoilerBody) spoilerBody.hidden = protectedArticle
  for (const item of relatedSpoilers) item.hidden = preferences.hideSpoilers
  renderSearch()
}

if (form) {
  let pendingQueryCommit = 0
  const syncFilters = () => {
    window.clearTimeout(pendingQueryCommit)
    const params = new URLSearchParams(location.search)
    if (query) query.value = params.get('q') ?? ''
    if (category) category.value = params.get('category') ?? ''
    if (tag) tag.value = params.get('tag') ?? ''
    if (progressFilter) progressFilter.value = params.get('progress') ?? ''
    savedOnly = params.get('saved') === '1'
    safeOnly = params.get('safe') === '1'
    renderSearch()
  }

  function updateResult() {
    window.clearTimeout(pendingQueryCommit)
    const url = new URL(location.href)
    for (const [key, value] of [
      ['q', query?.value.trim() ?? ''],
      ['category', category?.value ?? ''],
      ['tag', tag?.value ?? ''],
      ['progress', progressFilter?.value ?? ''],
      ['saved', savedOnly ? '1' : ''],
      ['safe', safeOnly ? '1' : ''],
    ]) {
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    }
    if (url.search !== location.search) history.replaceState(history.state, '', url)
    renderSearch()
  }

  syncFilters()
  query?.addEventListener('input', () => {
    renderSearch()
    window.clearTimeout(pendingQueryCommit)
    pendingQueryCommit = window.setTimeout(updateResult, 400)
  })
  category?.addEventListener('change', updateResult)
  tag?.addEventListener('change', updateResult)
  progressFilter?.addEventListener('change', updateResult)
  savedFilter?.addEventListener('click', () => {
    savedOnly = !savedOnly
    updateResult()
  })
  safeFilter?.addEventListener('click', () => {
    safeOnly = !safeOnly
    updateResult()
  })
  clearFilters?.addEventListener('click', () => {
    form.reset()
    savedOnly = false
    safeOnly = false
    updateResult()
    query?.focus()
  })
  form.addEventListener('submit', event => {
    event.preventDefault()
    updateResult()
  })
  window.addEventListener('popstate', syncFilters)

  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-library-link]')) {
    link.addEventListener('click', event => {
      if (!query || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (link.pathname !== location.pathname) return
      requestAnimationFrame(() => query.focus({ preventScroll: true }))
    })
  }
}

for (const button of saveButtons) {
  button.addEventListener('click', () => {
    preferences.saved = toggleEntry(preferences.saved, button.dataset.save ?? '')
    persist()
    render()
    if (button.closest('[hidden]')) savedFilter?.focus()
  })
}
for (const button of progressButtons) {
  button.addEventListener('click', () => {
    preferences.read = toggleEntry(preferences.read, button.dataset.progress ?? '')
    persist()
    render()
  })
}
for (const button of spoilerToggles) {
  button.addEventListener('click', () => {
    preferences.hideSpoilers = !preferences.hideSpoilers
    revealOnce = false
    persist()
    render()
  })
}
revealButton?.addEventListener('click', () => {
  revealOnce = true
  render()
  spoilerBody?.focus()
})
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return
  preferences = loadPreferences()
  revealOnce = false
  render()
})

const copyButton = document.querySelector<HTMLButtonElement>('[data-copy]')
const copyStatus = document.querySelector<HTMLElement>('[data-copy-status]')
const manualLink = document.querySelector<HTMLInputElement>('[data-copy-fallback]')
copyButton?.addEventListener('click', async () => {
  const url = document.querySelector<HTMLLinkElement>('link[rel=canonical]')?.href ?? location.href
  try {
    await navigator.clipboard.writeText(url)
    if (manualLink) manualLink.hidden = true
    setText(copyStatus, '已複製文章連結')
  } catch {
    if (manualLink) {
      manualLink.value = url
      manualLink.hidden = false
      manualLink.focus()
      manualLink.select()
    }
    setText(copyStatus, '請選取並手動複製文章連結。')
  }
})

render()
