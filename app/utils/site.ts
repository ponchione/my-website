export const SITE_URL = 'https://www.mitchellponchione.com'

export const STATIC_ROUTE_PATHS = ['/', '/work-history', '/projects', '/blog'] as const

export const DEFAULT_DESCRIPTION = 'Mitchell Ponchione is a Software Engineer specializing in AI systems, agent orchestration, and building modern web applications.'

export function buildKnownRoutePaths(postSlugs: string[]) {
  return [...STATIC_ROUTE_PATHS, ...postSlugs.map(slug => `/blog/${slug}`)]
}
