import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const notFoundPath = new URL('../.output/public/404.html', import.meta.url)
const html = await readFile(notFoundPath, 'utf8')
const blogIndexPayload = await readFile(new URL('../.output/public/blog/_payload.json', import.meta.url), 'utf8')
const agencyPayload = await readFile(new URL('../.output/public/blog/agency_in_an_AI_world/_payload.json', import.meta.url), 'utf8')
const letterHtml = await readFile(new URL('../.output/public/blog/software_goes_to_zero/index.html', import.meta.url), 'utf8')

assert.match(html, /<title>Not Found — Mitchell Ponchione<\/title>/, '404.html should have a useful title')
assert.match(html, /<meta[^>]+name="robots"[^>]+content="noindex, follow"/i, '404.html should tell crawlers not to index it')
assert.match(html, /This page doesn&#39;t exist — but the rest of the site does\./, '404.html should contain visible fallback text')
assert.match(html, /href="\/"/, '404.html should link back home')
assert.doesNotMatch(html, /<link[^>]+rel="canonical"/i, '404.html should not claim the homepage canonical URL')
assert.doesNotMatch(blogIndexPayload, /Open your LinkedIn feed right now/, 'the blog index payload should not include post bodies')
assert.doesNotMatch(agencyPayload, /I&#39;ve been kicking around an idea|I've been kicking around an idea/, 'article payloads should not include neighboring post bodies')
assert.doesNotMatch(agencyPayload, /Open your LinkedIn feed right now/, 'article payloads should not include neighboring post bodies')
// A shared post link lands on the map with the letter open, and its text is in the page.
assert.match(letterHtml, /<title>Software Goes to Zero — Mitchell Ponchione<\/title>/, 'a letter should have its post\'s title')
assert.match(letterHtml, /<link rel="canonical" href="https:\/\/www\.mitchellponchione\.com\/blog\/software_goes_to_zero">/, 'a letter should be canonical at its own path, not the map\'s')
assert.match(letterHtml, /class="realm"/, 'a letter should open over the map')
assert.match(letterHtml, /Open your LinkedIn feed right now/, 'a letter\'s text should be in the prerendered HTML')

// Keystone is a page over the map, and the home page doesn't load its code.
const playHtml = await readFile(new URL('../.output/public/play/index.html', import.meta.url), 'utf8')
assert.match(playHtml, /<title>Keystone — Mitchell Ponchione<\/title>/, '/play should have the game\'s title')
assert.match(playHtml, /class="realm"/, '/play should open over the map')
const homeHtml = await readFile(new URL('../.output/public/index.html', import.meta.url), 'utf8')
const homeScripts = [...new Set([...homeHtml.matchAll(/(?:src|href)="(\/_nuxt\/[^"]+\.js)"/g)].map(match => match[1]))]
assert.ok(homeScripts.length, 'the home page should load scripts')
for (const script of homeScripts) {
  const code = await readFile(new URL(`../.output/public${script}`, import.meta.url), 'utf8')
  assert.doesNotMatch(code, /The campaign is over/, `the home page should not load Keystone's engine (${script})`)
}

console.log('Generated output verification passed.')
