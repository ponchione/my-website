import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from '@playwright/test'

const baseUrl = process.env.PREVIEW_URL ?? 'http://localhost:4173'
const executablePath = process.env.CHROME_PATH ?? '/bin/google-chrome'
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
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
      `https://www.mitchellponchione.com${route.path}`,
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
  const context = await browser.newContext({
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
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

  await page.goto(baseUrl)
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(baseUrl)
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
    await page.locator(`main a[href="${route.path}"]`).click()
    await page.waitForURL(`${baseUrl}${route.path}`)
    await page.waitForFunction(expected => document.title === expected, route.title)
    assert.equal(await page.title(), route.title)
    await page.locator('main').getByRole('link', { name: 'Back to Blog', exact: true }).click()
    await page.waitForURL(`${baseUrl}/blog`)
  }

  await page.goto(baseUrl)
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(baseUrl)
  await waitForSettledPage(page)
  assert.ok(await page.locator('html').evaluate(element => element.classList.contains('dark')), 'dark should be the default')

  await page.locator('aside').getByRole('button', { name: 'Toggle theme' }).click()
  assert.ok(await page.locator('html').evaluate(element => element.classList.contains('light')))
  assert.equal(await page.evaluate(() => localStorage.getItem('nuxt-color-mode')), 'light')
  await page.reload({ waitUntil: 'domcontentloaded' })
  assert.ok(await page.locator('html').evaluate(element => element.classList.contains('light')), 'stored light theme should be applied before hydration')
  await context.close()

  const flashContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
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
  await flashPage.goto(baseUrl)
  await waitForSettledPage(flashPage)
  const classes = await flashPage.evaluate(() => window.__themeClasses)
  assert.ok(classes.includes('light'), 'pre-hydration script should apply light')
  assert.ok(!classes.includes('dark'), `light load should never apply dark: ${classes.join(', ')}`)
  await flashContext.close()
}

async function verifyInteractions(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto(baseUrl)
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

  await page.goto(baseUrl)
  await menuButton.click()
  await page.setViewportSize({ width: 900, height: 844 })
  await dialog.waitFor({ state: 'hidden' })
  await context.close()
}

async function verifyReducedMotion(browser) {
  const context = await browser.newContext({
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
}

async function captureScreenshots(browser) {
  await mkdir(screenshotDirectory, { recursive: true })
  const viewports = [
    { name: 'desktop-1440x900', width: 1440, height: 900 },
    { name: 'mobile-390x844', width: 390, height: 844 },
  ]

  for (const theme of ['dark', 'light']) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
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
        await page.goto(baseUrl)
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
  await captureScreenshots(browser)
  console.log('Preview verification passed; captured 34 Nuxt parity screenshots.')
}
finally {
  await browser.close()
}
