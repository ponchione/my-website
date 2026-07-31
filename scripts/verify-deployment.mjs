import assert from 'node:assert/strict'

const secureBaseUrl = new URL(process.env.DEPLOYMENT_URL ?? 'https://www.mitchellponchione.com')
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

const secureResponse = await fetch(secureBaseUrl, { redirect: 'manual' })
const hsts = secureResponse.headers.get('strict-transport-security') ?? ''
const maxAge = Number(/(?:^|;)\s*max-age=(\d+)/i.exec(hsts)?.[1])

assert.ok(secureResponse.ok, `${secureBaseUrl.href} should return a successful response`)
assert.ok(Number.isFinite(maxAge) && maxAge >= 31_536_000, 'HTTPS responses should set HSTS for at least one year')
assert.doesNotMatch(hsts, /includeSubDomains/i, 'HSTS should not include unverified subdomains')

console.log('Production HTTPS redirect and HSTS verification passed.')
