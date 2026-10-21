import assert from 'node:assert/strict'

const secureBaseUrl = new URL(process.env.DEPLOYMENT_URL ?? 'https://ponchione.dev')
assert.equal(secureBaseUrl.protocol, 'https:', 'DEPLOYMENT_URL must use HTTPS')

const representativePaths = [
  '/',
  '/projects?transport-check=1',
  '/definitely-not-a-route?transport-check=1',
]

for (const path of representativePaths) {
  const expectedUrl = new URL(path, secureBaseUrl)
  const insecureUrl = new URL(expectedUrl)
  insecureUrl.protocol = 'http:'

  const response = await fetch(insecureUrl, { redirect: 'manual' })
  assert.ok([301, 308].includes(response.status), `${insecureUrl.href} should return a permanent redirect`)
  assert.equal(response.headers.get('location'), expectedUrl.href, `${insecureUrl.href} should preserve its path and query`)
}

const oldOrigins = [
  'https://www.ponchione.dev',
  'https://www.mitchellponchione.com',
  'http://www.mitchellponchione.com',
  'https://mitchellponchione.com',
]

for (const origin of oldOrigins) {
  const oldUrl = new URL('/projects?transport-check=1', origin)
  const expectedUrl = new URL(`${oldUrl.pathname}${oldUrl.search}`, secureBaseUrl)
  let url = oldUrl
  for (let hop = 0; url.href !== expectedUrl.href; hop++) {
    assert.ok(hop < 3, `${oldUrl.href} should reach ${expectedUrl.href} within three redirects`)
    const response = await fetch(url, { redirect: 'manual' })
    assert.ok([301, 308].includes(response.status), `${url.href} should return a permanent redirect`)
    url = new URL(response.headers.get('location'), url)
  }
}

const secureResponse = await fetch(secureBaseUrl, { redirect: 'manual' })
const hsts = secureResponse.headers.get('strict-transport-security') ?? ''
const maxAge = Number(/(?:^|;)\s*max-age=(\d+)/i.exec(hsts)?.[1])

assert.ok(secureResponse.ok, `${secureBaseUrl.href} should return a successful response`)
assert.ok(Number.isFinite(maxAge) && maxAge >= 31_536_000, 'HTTPS responses should set HSTS for at least one year')
assert.doesNotMatch(hsts, /includeSubDomains/i, 'HSTS should not include unverified subdomains')

console.log('Production HTTPS redirect and HSTS verification passed.')
