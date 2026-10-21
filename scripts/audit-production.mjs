import { spawnSync } from 'node:child_process'

// `npm audit` over everything except dev dependencies, failing on any advisory except the
// ones listed here. An advisory belongs here only when no patched release exists and it
// can't reach visitors: the site ships as static files and worker.ts, which imports
// nothing. A listed advisory that stops showing up also fails the check, so its entry
// comes out once a fix lands.
const ACCEPTED = {
  'GHSA-86w9-cpqp-85rv': 'node-forge (every release through 1.4.0, the latest), via nuxt → nitropack → listhen. It only makes the local dev server\'s HTTPS certificate. Upstream: https://github.com/digitalbazaar/forge/issues/1149',
  'GHSA-vfj7-8cjw-p6xm': 'braces (every release through 3.0.3, the latest), via @nuxt/content → micromatch. It only matches this repository\'s own file patterns during the build. Upstream: https://github.com/micromatch/braces/issues/70',
}

const audit = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' })
let report
try {
  report = JSON.parse(audit.stdout)
}
catch {
  console.error(`npm audit didn't return a report:\n${audit.stderr || audit.stdout}`)
  process.exit(1)
}
if (report.error) {
  console.error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`)
  process.exit(1)
}

// Each advisory, once, keyed by its GitHub advisory ID. Packages that are only
// vulnerable through a dependency list that dependency's name instead of an advisory.
const advisories = new Map()
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via) {
    if (typeof via !== 'object') continue
    const id = via.url.split('/').at(-1)
    advisories.set(id, { ...via, id })
  }
}

const unexpected = [...advisories.values()].filter(advisory => !(advisory.id in ACCEPTED))
const stale = Object.keys(ACCEPTED).filter(id => !advisories.has(id))

for (const id of Object.keys(ACCEPTED).filter(id => advisories.has(id))) {
  console.log(`Accepted ${id}: ${ACCEPTED[id]}`)
}
for (const advisory of unexpected) {
  console.error(`${advisory.severity} ${advisory.id} in ${advisory.name} ${advisory.range}: ${advisory.title} (${advisory.url})`)
}
for (const id of stale) {
  console.error(`${id} is accepted in scripts/audit-production.mjs but no longer reported; remove its entry.`)
}

if (unexpected.length || stale.length) process.exit(1)
console.log('Production audit passed.')
