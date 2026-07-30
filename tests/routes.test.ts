import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildKnownRoutePaths } from '~/utils/site'

const expectedSlugs = [
  'agency_in_an_AI_world',
  'micro_business_architecture',
  'software_goes_to_zero',
]

describe('public route contract', () => {
  it('derives every exact blog slug from the Markdown filenames', () => {
    const slugs = readdirSync(resolve(process.cwd(), 'content/blog'))
      .filter(file => file.endsWith('.md'))
      .map(file => file.slice(0, -3))
      .sort()

    expect(slugs).toEqual(expectedSlugs)
    expect(buildKnownRoutePaths(slugs)).toEqual([
      '/',
      '/work-history',
      '/projects',
      '/blog',
      ...expectedSlugs.map(slug => `/blog/${slug}`),
    ])
  })

  it('lists every public route in the sitemap with the canonical domain', () => {
    const sitemap = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8')
    const routes = buildKnownRoutePaths(expectedSlugs)

    for (const route of routes) {
      expect(sitemap).toContain(`<loc>https://www.mitchellponchione.com${route}</loc>`)
    }
  })
})
