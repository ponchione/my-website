import { describe, expect, it, vi } from 'vitest'
import worker from '../worker'

describe('production edge worker', () => {
  it('permanently redirects HTTP while preserving path and query parameters', async () => {
    const assetsFetch = vi.fn()
    const response = await worker.fetch(
      new Request('http://www.mitchellponchione.com/blog/post?source=audit'),
      { ASSETS: { fetch: assetsFetch } },
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://www.mitchellponchione.com/blog/post?source=audit')
    expect(assetsFetch).not.toHaveBeenCalled()
  })

  it('adds HSTS to HTTPS asset responses', async () => {
    const assetsFetch = vi.fn().mockResolvedValue(new Response('page', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }))
    const request = new Request('https://www.mitchellponchione.com/')
    const response = await worker.fetch(request, { ASSETS: { fetch: assetsFetch } })

    expect(await response.text()).toBe('page')
    expect(response.headers.get('content-type')).toBe('text/html')
    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000')
    expect(assetsFetch).toHaveBeenCalledWith(request)
  })
})
