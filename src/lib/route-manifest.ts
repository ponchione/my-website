import { STATIC_ROUTE_PATHS } from '@/lib/site-config';

export function buildKnownRoutePaths(postSlugs: string[]) {
  return [...STATIC_ROUTE_PATHS, ...postSlugs.map((slug) => `/blog/${slug}`)];
}
