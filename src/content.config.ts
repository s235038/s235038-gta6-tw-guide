import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const date = z.iso.date()
const verification = z.enum(['official', 'tested', 'community', 'unconfirmed'])

const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '*.md' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.enum(['news', 'beginner', 'missions', 'money', 'vehicles', 'map', 'collectibles', 'faq']),
    tags: z.array(z.string().min(1)).min(1),
    keywords: z.array(z.string().min(1)).default([]),
    published: date,
    updated: date,
    status: verification,
    level: z.string().min(1),
    spoiler: z.boolean(),
    sources: z.array(z.object({
      title: z.string().min(1),
      url: z.url({ protocol: /^https$/ }),
      published: date.nullable(),
      checked: date,
      confidence: z.string().min(1),
      type: verification,
    })).min(1),
    related: z.array(z.string().min(1)),
  }).refine(data => data.published <= data.updated, {
    path: ['updated'], message: '更新日期必須等於或晚於發布日期',
  }).refine(data => data.sources.some(source => source.type === data.status), {
    path: ['sources'], message: '至少一項來源必須支持文章的查證狀態',
  }),
})

export const collections = { guides }
