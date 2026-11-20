import type { APIRoute } from 'astro'
import { paths } from '../lib/content'

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: ${paths.home}\nSitemap: ${new URL(paths.asset('sitemap.xml'), site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
