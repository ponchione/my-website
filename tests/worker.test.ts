import { describe, expect, it, vi } from 'vitest'
import worker from '../worker'

describe('production edge worker', () => {
  it('permanently redirects HTTP while preserving path and query parameters', async () => {
    const assetsFetch = vi.fn()
    const response = await worker.fetch(
      new Request('http://ponchione.dev/blog/post?source=audit'),
      { ASSETS: { fetch: assetsFetch } },
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://ponchione.dev/blog/post?source=audit')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(assetsFetch).not.toHaveBeenCalled()
  })

  it('permanently redirects the old and www domains to the primary domain in one hop', async () => {
    const assetsFetch = vi.fn()
    for (const origin of ['https://www.mitchellponchione.com', 'http://mitchellponchione.com', 'https://www.ponchione.dev']) {
      const response = await worker.fetch(
        new Request(`${origin}/blog/post?source=audit&x=%2F`),
        { ASSETS: { fetch: assetsFetch } },
      )

      expect(response.status).toBe(301)
      expect(response.headers.get('location')).toBe('https://ponchione.dev/blog/post?source=audit&x=%2F')
      expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000')
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    }
    expect(assetsFetch).not.toHaveBeenCalled()
  })

  it('serves preview hosts without redirecting them', async () => {
    const assetsFetch = vi.fn().mockResolvedValue(new Response('page'))
    const response = await worker.fetch(
      new Request('https://my-website.example.workers.dev/about'),
      { ASSETS: { fetch: assetsFetch } },
    )

    expect(response.status).toBe(200)
  })

  it('adds HSTS and the security headers to HTTPS asset responses', async () => {
    const assetsFetch = vi.fn().mockResolvedValue(new Response('page', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }))
    const request = new Request('https://ponchione.dev/')
    const response = await worker.fetch(request, { ASSETS: { fetch: assetsFetch } })

    expect(await response.text()).toBe('page')
    expect(response.headers.get('content-type')).toBe('text/html')
    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('content-security-policy')).toBe('frame-ancestors \'none\'')
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(assetsFetch).toHaveBeenCalledWith(request)
  })

  it('caches fingerprinted build files for good and map textures for a day', async () => {
    const serve = (path: string, status = 200) => worker.fetch(
      new Request(`https://ponchione.dev${path}`),
      { ASSETS: { fetch: vi.fn().mockResolvedValue(new Response('asset', { status, headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } })) } },
    )
    const cacheOf = async (path: string, status?: number) => (await serve(path, status)).headers.get('cache-control')

    expect(await cacheOf('/_nuxt/entry.BVKGSWc-.js')).toBe('public, max-age=31536000, immutable')
    expect(await cacheOf('/realm/height.webp')).toBe('public, max-age=86400, stale-while-revalidate=604800')
    // The build manifest changes with every deploy, pages may change at any time, and a
    // missing file may be published later.
    expect(await cacheOf('/_nuxt/builds/latest.json')).toBe('public, max-age=0, must-revalidate')
    expect(await cacheOf('/about')).toBe('public, max-age=0, must-revalidate')
    expect(await cacheOf('/_nuxt/missing.js', 404)).toBe('public, max-age=0, must-revalidate')
  })
})
