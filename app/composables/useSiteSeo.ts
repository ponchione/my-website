import { DEFAULT_DESCRIPTION, SITE_URL } from '~/utils/site'

// The map with the career towns marked, as every page's preview image when linked,
// unless the page brings its own (1200×630).
const MAP_PREVIEW = { path: '/og-image.jpg', alt: 'A relief map of Pennsylvania with the towns of Mitchell Ponchione\'s career marked' }

export function useSiteSeo(title: string, path: string, description = DEFAULT_DESCRIPTION, preview = MAP_PREVIEW) {
  const canonical = new URL(path, SITE_URL).toString()
  const image = new URL(preview.path, SITE_URL).toString()

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
    ogImageAlt: preview.alt,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
    twitterImageAlt: preview.alt,
  })
}
