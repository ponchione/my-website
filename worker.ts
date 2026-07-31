const HSTS_POLICY = 'max-age=31536000'

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
    headers.set('Strict-Transport-Security', HSTS_POLICY)

    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    })
  },
}
