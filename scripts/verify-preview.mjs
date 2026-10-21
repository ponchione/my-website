import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from '@playwright/test'

// `npm run preview:worker` serves the generated site through worker.ts over HTTPS, with
// a self-signed certificate. Playwright's own Chromium is used unless CHROME_PATH names
// another browser.
const baseUrl = process.env.PREVIEW_URL ?? 'https://localhost:4173'
const executablePath = process.env.CHROME_PATH || undefined
// The home page is the realm map; the navigation, theme toggle and skip link are on the
// other pages.
const sitePage = `${baseUrl}/about`
const screenshotDirectory = new URL('../artifacts/nuxt-port/nuxt-output/', import.meta.url)

const routes = [
  { path: '/', title: 'Mitchell Ponchione', screenshot: 'about' },
  { path: '/work-history', title: 'Work History — Mitchell Ponchione', screenshot: 'work-history' },
  { path: '/projects', title: 'Projects — Mitchell Ponchione', screenshot: 'projects' },
  { path: '/blog', title: 'Blog — Mitchell Ponchione', screenshot: 'blog-index' },
  { path: '/blog/agency_in_an_AI_world', title: 'Agency in an AI World — Mitchell Ponchione', screenshot: 'blog-agency_in_an_AI_world' },
  { path: '/blog/micro_business_architecture', title: 'Micro Business Architecture — The New MBA — Mitchell Ponchione', screenshot: 'blog-micro_business_architecture' },
  { path: '/blog/software_goes_to_zero', title: 'Software Goes to Zero — Mitchell Ponchione', screenshot: 'blog-software_goes_to_zero' },
]

function newContext(browser, options) {
  return browser.newContext({ ignoreHTTPSErrors: true, ...options })
}

async function waitForSettledPage(page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(550)
}

async function verifyAccessibility(page, path) {
  const results = await new AxeBuilder({ page }).analyze()
  const violations = results.violations.map(violation => `${violation.id}: ${violation.help}`)
  assert.deepEqual(violations, [], `${path} accessibility violations: ${violations.join('; ')}`)
}

async function verifyDirectRoutes(browser) {
  const context = await newContext(browser, { viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))

  for (const route of routes) {
    const directResponse = await context.request.get(`${baseUrl}${route.path}`, { maxRedirects: 0 })
    assert.equal(directResponse.status(), 200, `${route.path} should not redirect to a different URL shape`)
    const response = await page.goto(`${baseUrl}${route.path}`)
    await waitForSettledPage(page)
    assert.equal(response?.status(), 200, `${route.path} should load directly with status 200`)
    assert.equal(await page.title(), route.title, `${route.path} title`)
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      `https://ponchione.dev${route.path}`,
      `${route.path} canonical URL`,
    )
    assert.ok((await page.locator('main').innerText()).trim().length > 30, `${route.path} should render useful content`)
    await verifyAccessibility(page, route.path)
  }

  const missingUrl = `${baseUrl}/definitely-not-a-route`
  const rawResponse = await context.request.get(missingUrl)
  const rawHtml = await rawResponse.text()
  assert.equal(rawResponse.status(), 404, 'unknown raw requests should return 404')
  assert.match(rawHtml, /<title>Not Found — Mitchell Ponchione<\/title>/)
  assert.match(rawHtml, /<meta[^>]+name="robots"[^>]+content="noindex, follow"/i)
  assert.match(rawHtml, /This page doesn&#39;t exist — but the rest of the site does\./)
  assert.doesNotMatch(rawHtml, /<link[^>]+rel="canonical"/i)

  const response = await page.goto(missingUrl)
  await waitForSettledPage(page)
  assert.equal(response?.status(), 404, 'unknown direct routes should return 404')
  assert.equal(await page.title(), 'Not Found — Mitchell Ponchione')
  await page.getByText("This page doesn't exist — but the rest of the site does.").waitFor()
  await verifyAccessibility(page, '/definitely-not-a-route')
  assert.deepEqual(errors, [], `browser page errors: ${errors.join('; ')}`)
  await context.close()
}

async function verifyJavaScriptDisabledFallback(browser) {
  const context = await newContext(browser, {
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: false,
  })
  const page = await context.newPage()
  const response = await page.goto(`${baseUrl}/javascript-disabled-missing-route`)

  assert.equal(response?.status(), 404)
  assert.equal(await page.title(), 'Not Found — Mitchell Ponchione')
  await page.getByText("This page doesn't exist — but the rest of the site does.").waitFor()
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, follow')
  await context.close()
}

async function verifyNavigationPrefetch(browser) {
  const context = await newContext(browser, { viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const navigationPayloads = []
  const navigationPayloadPaths = new Set([
    '/work-history/_payload.json',
    '/projects/_payload.json',
    '/blog/_payload.json',
  ])

  page.on('request', (request) => {
    const requestUrl = new URL(request.url())
    if (navigationPayloadPaths.has(requestUrl.pathname)) {
      navigationPayloads.push(requestUrl.pathname)
    }
  })

  await page.goto(sitePage)
  await waitForSettledPage(page)
  assert.deepEqual(navigationPayloads, [], 'persistent navigation should not prefetch route payloads without interaction')

  const blogPayload = page.waitForResponse((response) => {
    const responseUrl = new URL(response.url())
    return responseUrl.pathname === '/blog/_payload.json'
  })
  await page.locator('aside').getByRole('link', { name: 'Blog', exact: true }).hover()
  await blogPayload
  assert.deepEqual(navigationPayloads, ['/blog/_payload.json'])
  await context.close()
}

async function verifyClientNavigation(browser) {
  // Routing, not motion: with motion reduced the letters open at once and the map behind
  // them stops drawing, so slow software-rendered runners can still click them.
  const context = await newContext(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto(sitePage)
  await waitForSettledPage(page)

  const desktopNavigation = page.locator('aside nav')
  for (const route of routes.slice(1, 4)) {
    const label = route.path === '/work-history' ? 'Work History' : route.path.slice(1).replace(/^./, letter => letter.toUpperCase())
    await desktopNavigation.getByRole('link', { name: label, exact: true }).click()
    await page.waitForURL(`${baseUrl}${route.path}`)
    await page.waitForFunction(expected => document.title === expected, route.title)
    assert.equal(await page.title(), route.title)
    assert.equal(await page.evaluate(() => scrollY), 0, `${route.path} should scroll to top`)
  }

  for (const route of routes.slice(4)) {
    await page.locator(`main a.case-letter[href="${route.path}"]`).click()
    await page.waitForURL(`${baseUrl}${route.path}`)
    await page.waitForFunction(expected => document.title === expected, route.title)
    assert.equal(await page.title(), route.title)
    await page.getByRole('dialog').getByRole('button', { name: 'Return to the letter case', exact: true }).click()
    await page.waitForURL(`${baseUrl}/blog`)
    await page.locator('.letter-frame').waitFor({ state: 'detached' })
  }

  await page.goto(sitePage)
  await waitForSettledPage(page)
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Skip to content')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(50)
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content', 'skip link should focus main content')

  const unsafeExternalLinks = await page.locator('a[target="_blank"]').evaluateAll(links => links
    .filter(link => link.getAttribute('rel') !== 'noopener noreferrer')
    .map(link => link.getAttribute('href')))
  assert.deepEqual(unsafeExternalLinks, [])
  await context.close()
}

async function verifyTheme(browser) {
  const context = await newContext(browser, { viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(sitePage)
  await waitForSettledPage(page)
  assert.ok(await page.locator('html').evaluate(element => element.classList.contains('dark')), 'dark should be the default')

  await page.locator('aside').getByRole('button', { name: 'Toggle theme' }).click()
  assert.ok(await page.locator('html').evaluate(element => element.classList.contains('light')))
  assert.equal(await page.evaluate(() => localStorage.getItem('nuxt-color-mode')), 'light')
  await page.reload({ waitUntil: 'domcontentloaded' })
  assert.ok(await page.locator('html').evaluate(element => element.classList.contains('light')), 'stored light theme should be applied before hydration')
  await context.close()

  const flashContext = await newContext(browser, { viewport: { width: 1440, height: 900 } })
  await flashContext.addInitScript(() => {
    localStorage.setItem('nuxt-color-mode', 'light')
    window.__themeClasses = []
    const originalAdd = DOMTokenList.prototype.add
    DOMTokenList.prototype.add = function (...tokens) {
      window.__themeClasses.push(...tokens)
      return originalAdd.apply(this, tokens)
    }
  })
  const flashPage = await flashContext.newPage()
  await flashPage.goto(sitePage)
  await waitForSettledPage(flashPage)
  const classes = await flashPage.evaluate(() => window.__themeClasses)
  assert.ok(classes.includes('light'), 'pre-hydration script should apply light')
  assert.ok(!classes.includes('dark'), `light load should never apply dark: ${classes.join(', ')}`)
  await flashContext.close()
}

async function verifyInteractions(browser) {
  const context = await newContext(browser, { viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto(sitePage)
  await waitForSettledPage(page)
  const menuButton = page.getByRole('button', { name: 'Open menu' })
  await menuButton.click()
  const dialog = page.getByRole('dialog', { name: 'Navigation' })
  await dialog.waitFor()
  assert.ok(await dialog.evaluate((element, activeElement) => element.contains(activeElement), await page.evaluateHandle(() => document.activeElement)))
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Open menu', 'sheet should return focus')

  await menuButton.click()
  await dialog.getByRole('link', { name: 'Projects', exact: true }).click()
  await page.waitForURL(`${baseUrl}/projects`)
  await dialog.waitFor({ state: 'hidden' })

  await page.goto(`${baseUrl}/work-history`)
  await waitForSettledPage(page)
  const workTriggers = page.locator('button[aria-controls^="work-details-"]')
  assert.equal(await workTriggers.first().getAttribute('aria-expanded'), 'true', 'first work entry should start expanded')
  const secondTrigger = workTriggers.nth(1)
  await secondTrigger.focus()
  await page.keyboard.press('Enter')
  assert.equal(await secondTrigger.getAttribute('aria-expanded'), 'true')
  await page.keyboard.press('Space')
  assert.equal(await secondTrigger.getAttribute('aria-expanded'), 'false')

  await page.goto(sitePage)
  await menuButton.click()
  await page.setViewportSize({ width: 900, height: 844 })
  await dialog.waitFor({ state: 'hidden' })
  await context.close()
}

async function verifyReducedMotion(browser) {
  const context = await newContext(browser, {
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto(`${baseUrl}/work-history`)
  await waitForSettledPage(page)
  assert.ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
  const transitionDuration = await page.locator('.motion-transform').first().evaluate(element => getComputedStyle(element).transitionDuration)
  assert.equal(transitionDuration, '0s', 'work expansion transform should have zero duration')

  const secondTrigger = page.locator('button[aria-controls^="work-details-"]').nth(1)
  await secondTrigger.click()
  const runningAnimations = await page.evaluate(() => document.getAnimations()
    .filter(animation => Number(animation.effect?.getTiming().duration) > 0)
    .length)
  assert.equal(runningAnimations, 0, 'reduced motion should not run expansion animations')
  await context.close()

  // With motion reduced the map draws only when something changes.
  const mapContext = await newContext(browser, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await mapContext.addInitScript(() => {
    window.__draws = 0
    for (const gl of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const draw = gl.prototype.drawElements
      gl.prototype.drawElements = function (...args) {
        window.__draws++
        return draw.apply(this, args)
      }
    }
  })
  const mapPage = await mapContext.newPage()
  await mapPage.goto(baseUrl)
  await mapPage.locator('.realm canvas').waitFor()
  await mapPage.waitForFunction(() => window.__draws > 0)
  await mapPage.waitForTimeout(500)
  const drawsOver = async (milliseconds) => {
    const before = await mapPage.evaluate(() => window.__draws)
    await mapPage.waitForTimeout(milliseconds)
    return await mapPage.evaluate(() => window.__draws) - before
  }
  assert.equal(await drawsOver(1000), 0, 'a still map should not be drawn again with motion reduced')
  const box = await mapPage.locator('.realm canvas').boundingBox()
  const beforePan = await mapPage.evaluate(() => window.__draws)
  await mapPage.keyboard.down('d')
  await mapPage.waitForTimeout(400)
  await mapPage.keyboard.up('d')
  const panned = await mapPage.evaluate(() => window.__draws) - beforePan
  assert.ok(panned > 5, `panning with motion reduced should draw the map (${panned} draws)`)
  await mapPage.waitForTimeout(300)
  assert.equal(await drawsOver(1000), 0, 'the map should stop drawing once the pan ends')
  const beforeHover = await mapPage.evaluate(() => window.__draws)
  await mapPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await mapPage.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 40)
  await mapPage.waitForTimeout(300)
  assert.ok(await mapPage.evaluate(() => window.__draws) > beforeHover, 'hovering with motion reduced should draw the map')
  await mapContext.close()
}

// Keystone's county lists: arrow keys on a closed list change its value at once, so a
// list must only act when its button is pressed.
async function verifyKeystoneCountyLists(browser) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await newContext(browser, { viewport, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const campaign = () => page.evaluate(() => JSON.parse(localStorage.getItem('keystone.campaign') ?? 'null')?.state ?? null)
    const size = `${viewport.width}x${viewport.height}`

    await page.goto(`${baseUrl}/play`)
    const prompt = page.getByRole('region', { name: 'Choose where your house begins' })
    await prompt.waitFor()
    const startList = prompt.getByRole('combobox', { name: 'Choose a county from the list' })
    const beginHere = prompt.getByRole('button', { name: 'Begin here' })
    assert.ok(await beginHere.isDisabled(), `${size}: Begin here should wait for a county`)
    await startList.focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)
    assert.ok(await prompt.isVisible(), `${size}: arrow keys alone should not found a house`)
    assert.equal(await campaign(), null, `${size}: arrow keys alone should not begin a campaign`)
    assert.notEqual(await startList.inputValue(), '', `${size}: arrow keys should choose a county in the list`)
    await verifyAccessibility(page, `/play prompt at ${size}`)

    await startList.selectOption({ label: 'Centre' })
    const centre = Number(await startList.inputValue())
    await beginHere.click()
    const houses = page.getByRole('region', { name: 'Your house and its rivals' })
    await houses.waitFor()
    await prompt.waitFor({ state: 'detached' })
    const state = await campaign()
    const seat = state.houses[state.player].seat
    assert.equal(seat, centre, `${size}: Begin here should found the house in Centre`)

    const court = houses.getByRole('button', { name: 'Court' })
    if (await court.isVisible()) await court.click()
    const countyPanel = page.locator('aside.keystone-place')
    const showList = houses.getByRole('combobox', { name: 'Select a county' })
    await showList.focus()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)
    assert.equal(await countyPanel.count(), 0, `${size}: arrow keys alone should not select a county`)
    assert.notEqual(await showList.inputValue(), '', `${size}: arrow keys should choose a county in the house panel's list`)
    await showList.selectOption({ label: 'Centre' })
    await houses.getByRole('button', { name: 'Show', exact: true }).click()
    await page.getByRole('complementary', { name: 'Centre' }).waitFor()

    await countyPanel.getByRole('button', { name: /^Raise levies here/ }).click()
    await houses.getByRole('button', { name: 'Move the army' }).click()
    const move = houses.locator('.keystone-move')
    assert.equal(await move.getAttribute('aria-pressed'), 'true')
    const marchList = houses.getByRole('combobox', { name: 'March to a county' })
    // A county the house holds, so the army can reach it. Orders are only saved with the
    // next month, so the army's own line shows where it goes.
    const army = houses.locator('.keystone-stat-army dd')
    const target = state.owner.findIndex((owner, id) => id !== seat && owner === state.player)
    assert.ok(target > 0, `${size}: the house should hold a second county`)
    await marchList.focus()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)
    assert.equal(await move.getAttribute('aria-pressed'), 'true', `${size}: arrow keys alone should not march`)
    assert.doesNotMatch(await army.innerText(), /, to /, `${size}: arrow keys alone should not order a march`)
    assert.notEqual(await marchList.inputValue(), '', `${size}: arrow keys should choose a county in the march list`)
    await verifyAccessibility(page, `/play march at ${size}`)

    await marchList.selectOption(String(target))
    const targetName = await marchList.locator(`option[value="${target}"]`).innerText()
    await houses.getByRole('button', { name: 'March', exact: true }).click()
    await houses.getByRole('button', { name: 'Move the army' }).waitFor()
    assert.match(await army.innerText(), new RegExp(`, to ${targetName}$`), `${size}: March should send the army to ${targetName}`)
    assert.deepEqual(errors, [], `${size}: /play page errors: ${errors.join('; ')}`)
    await context.close()
  }
}

async function captureScreenshots(browser) {
  await mkdir(screenshotDirectory, { recursive: true })
  const viewports = [
    { name: 'desktop-1440x900', width: 1440, height: 900 },
    { name: 'mobile-390x844', width: 390, height: 844 },
  ]

  for (const theme of ['dark', 'light']) {
    for (const viewport of viewports) {
      const context = await newContext(browser, { viewport, reducedMotion: 'reduce' })
      await context.addInitScript(selectedTheme => localStorage.setItem('nuxt-color-mode', selectedTheme), theme)
      const page = await context.newPage()

      for (const route of [...routes, { path: '/definitely-not-a-route', screenshot: 'not-found' }]) {
        await page.goto(`${baseUrl}${route.path}`)
        await waitForSettledPage(page)
        await page.screenshot({
          path: new URL(`${route.screenshot}--${theme}--${viewport.name}.png`, screenshotDirectory).pathname,
          fullPage: true,
        })
      }

      if (viewport.name.startsWith('mobile')) {
        await page.goto(sitePage)
        await waitForSettledPage(page)
        await page.getByRole('button', { name: 'Open menu' }).click()
        await page.getByRole('dialog', { name: 'Navigation' }).waitFor()
        await page.waitForTimeout(50)
        await page.screenshot({
          path: new URL(`mobile-menu-open--${theme}--${viewport.name}.png`, screenshotDirectory).pathname,
          fullPage: true,
        })
      }
      await context.close()
    }
  }
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  await verifyDirectRoutes(browser)
  await verifyJavaScriptDisabledFallback(browser)
  await verifyNavigationPrefetch(browser)
  await verifyClientNavigation(browser)
  await verifyTheme(browser)
  await verifyInteractions(browser)
  await verifyReducedMotion(browser)
  await verifyKeystoneCountyLists(browser)
  await captureScreenshots(browser)
  console.log('Preview verification passed; captured 34 Nuxt parity screenshots.')
}
finally {
  await browser.close()
}
