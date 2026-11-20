type Span = { start: number; end: number }

const gtaAlias = /gta\s*(?:6|vi)/g
const fold = (value: string) => value.normalize('NFKC').toLowerCase()

export function normalizeSearch(value: string) {
  return fold(value).replace(gtaAlias, 'gta6')
}

function sourcePositions(source: string) {
  let text = ''
  const positions: Span[] = []
  for (const { 0: glyph, index } of source.matchAll(/.\p{M}*/gsu)) {
    const normalized = fold(glyph)
    const position = { start: index, end: index + glyph.length }
    text += normalized
    for (let offset = 0; offset < normalized.length; offset++) positions.push(position)
  }
  let adjustment = 0
  for (const { 0: alias, index } of text.matchAll(gtaAlias)) {
    const start = index + adjustment
    const span = { start: positions[start].start, end: positions[start + alias.length - 1].end }
    positions.splice(start, alias.length, span, span, span, span)
    adjustment += 4 - alias.length
  }
  return { text: text.replace(gtaAlias, 'gta6'), positions }
}

export function matchSpans(source: string, tokens: string[]): Span[] {
  if (tokens.length === 0) return []
  const { text, positions } = sourcePositions(source)
  const matches: Span[] = []
  for (const token of tokens) {
    let index = text.indexOf(token)
    while (index !== -1) {
      matches.push({ start: positions[index].start, end: positions[index + token.length - 1].end })
      index = text.indexOf(token, index + token.length)
    }
  }
  const spans: Span[] = []
  for (const match of matches.sort((a, b) => a.start - b.start)) {
    const previous = spans.at(-1)
    if (previous && previous.end >= match.start) previous.end = Math.max(previous.end, match.end)
    else spans.push(match)
  }
  return spans
}

export function showMatches(element: Element, source: string, tokens: string[]) {
  const matches = matchSpans(source, tokens)
  if (matches.length === 0) {
    element.textContent = source
    return
  }
  const result = document.createDocumentFragment()
  let offset = 0
  for (const { start, end } of matches) {
    if (offset < start) result.append(source.slice(offset, start))
    const mark = document.createElement('mark')
    mark.textContent = source.slice(start, end)
    result.append(mark)
    offset = end
  }
  result.append(source.slice(offset))
  element.replaceChildren(result)
}

export function matchExcerpt(source: string, tokens: string[]) {
  const [match] = matchSpans(source, tokens)
  if (!match) return ''
  const start = Math.max(0, match.start - 26)
  const end = Math.min(source.length, Math.max(start + 96, match.end + 26))
  const excerpt = source.slice(start, end).trim()
  return `${start > 0 ? '…' : ''}${excerpt}${end < source.length ? '…' : ''}`
}
