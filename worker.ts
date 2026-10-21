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
const PRIMARY_HOST = 'ponchione.dev'
// Hosts that permanently redirect to the primary domain. workers.dev and preview URLs
// keep serving the site so deployments can still be checked before they go live.
const REDIRECT_HOSTS = new Set(['www.ponchione.dev', 'mitchellponchione.com', 'www.mitchellponchione.com'])

// Nuxt fingerprints its build output, so those files never change (except the build
// manifest, which says which build is current). The map's textures keep their names
// between rebuilds, so they're only cached for a day.
function cachePolicy(pathname: string) {
  if (pathname.startsWith('/_nuxt/builds/')) return null
  if (pathname.startsWith('/_nuxt/')) return 'public, max-age=31536000, immutable'
  if (pathname.startsWith('/realm/')) return 'public, max-age=86400, stale-while-revalidate=604800'
  return null
}

// Response.redirect() has immutable headers, so redirects are built here to carry the
// security headers too.
function redirect(url: URL, status: number) {
  return new Response(null, { status, headers: { Location: url.href, ...SECURITY_HEADERS } })
}

type Environment = {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

export default {
  async fetch(request: Request, environment: Environment): Promise<Response> {
    const url = new URL(request.url)

    if (REDIRECT_HOSTS.has(url.hostname)) {
      url.protocol = 'https:'
      url.hostname = PRIMARY_HOST
      url.port = ''
      return redirect(url, 301)
    }

    if (url.protocol === 'http:') {
      url.protocol = 'https:'
      return redirect(url, 308)
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
