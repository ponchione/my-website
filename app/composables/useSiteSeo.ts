import { DEFAULT_DESCRIPTION, SITE_URL } from '~/utils/site'

export function useSiteSeo(title: string, path: string, description = DEFAULT_DESCRIPTION) {
  const canonical = new URL(path, SITE_URL).toString()
  // Every page shares the map as its preview image when linked.
  const image = new URL('/og-image.jpg', SITE_URL).toString()

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
    ogImage: image,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: 'A relief map of Pennsylvania with the towns of Mitchell Ponchione\'s career marked',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
  })
}
