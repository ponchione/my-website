import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const notFoundPath = new URL('../.output/public/404.html', import.meta.url)
const html = await readFile(notFoundPath, 'utf8')
const blogIndexPayload = await readFile(new URL('../.output/public/blog/_payload.json', import.meta.url), 'utf8')
const agencyPayload = await readFile(new URL('../.output/public/blog/agency_in_an_AI_world/_payload.json', import.meta.url), 'utf8')

assert.match(html, /<title>Not Found — Mitchell Ponchione<\/title>/, '404.html should have a useful title')
assert.match(html, /<meta[^>]+name="robots"[^>]+content="noindex, follow"/i, '404.html should tell crawlers not to index it')
assert.match(html, /This page doesn&#39;t exist — but the rest of the site does\./, '404.html should contain visible fallback text')
assert.match(html, /href="\/"/, '404.html should link back home')
assert.doesNotMatch(html, /<link[^>]+rel="canonical"/i, '404.html should not claim the homepage canonical URL')
assert.doesNotMatch(blogIndexPayload, /Open your LinkedIn feed right now/, 'the blog index payload should not include post bodies')
assert.doesNotMatch(agencyPayload, /I&#39;ve been kicking around an idea|I've been kicking around an idea/, 'article payloads should not include neighboring post bodies')
assert.doesNotMatch(agencyPayload, /Open your LinkedIn feed right now/, 'article payloads should not include neighboring post bodies')

console.log('Generated output verification passed.')
