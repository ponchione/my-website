const HSTS_POLICY = 'max-age=31536000'
// Sent with every response. The site is never framed and uses no device APIs.
const SECURITY_HEADERS = {
  'Strict-Transport-Security': HSTS_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': 'frame-ancestors \'none\'',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
}

// Nuxt fingerprints its build output, so those files never change (except the build
// manifest, which says which build is current). The map's textures keep their names
// between rebuilds, so they're only cached for a day.
function cachePolicy(pathname: string) {
  if (pathname.startsWith('/_nuxt/builds/')) return null
  if (pathname.startsWith('/_nuxt/')) return 'public, max-age=31536000, immutable'
  if (pathname.startsWith('/realm/')) return 'public, max-age=86400, stale-while-revalidate=604800'
  return null
}

type Environment = {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

export default {
  async fetch(request: Request, environment: Environment): Promise<Response> {
    const url = new URL(request.url)

    if (url.protocol === 'http:') {
      url.protocol = 'https:'
      return Response.redirect(url, 308)
    }

    const assetResponse = await environment.ASSETS.fetch(request)
    const headers = new Headers(assetResponse.headers)
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)
    const cache = assetResponse.ok ? cachePolicy(url.pathname) : null
    if (cache) headers.set('Cache-Control', cache)

    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    })
  },
}
