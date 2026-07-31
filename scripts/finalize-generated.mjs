import { copyFile } from 'node:fs/promises'

const renderedNotFoundPage = new URL('../.output/public/404/index.html', import.meta.url)
const staticFallback = new URL('../.output/public/404.html', import.meta.url)

await copyFile(renderedNotFoundPage, staticFallback)

console.log('Installed the prerendered 404 page as the static fallback.')
