import type { APIRoute } from 'astro'
import { listGuides, paths } from '../lib/content'

export const GET: APIRoute = async ({ site }) => {
  const guides = await listGuides()
  const locations = [
    { path: paths.home, updated: guides[0]?.data.updated },
    ...guides.map(guide => ({ path: paths.article(guide.id), updated: guide.data.updated })),
  ]
  const entries = locations.map(({ path, updated }) => {
    const lastModified = updated ? `<lastmod>${updated}</lastmod>` : ''
    return `  <url><loc>${new URL(path, site)}</loc>${lastModified}</url>`
  }).join('\n')
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  )
}
