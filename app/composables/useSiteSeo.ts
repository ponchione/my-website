import { DEFAULT_DESCRIPTION, SITE_URL } from '~/utils/site'

export function useSiteSeo(title: string, path: string, description = DEFAULT_DESCRIPTION) {
  const canonical = new URL(path, SITE_URL).toString()

  useHead({
    link: [{ rel: 'canonical', href: canonical }],
  })

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogUrl: canonical,
    twitterCard: 'summary',
    twitterTitle: title,
    twitterDescription: description,
  })
}
