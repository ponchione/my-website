import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        title: z.string(),
        date: z.string(),
        tags: z.array(z.string()),
        // Not `excerpt`: Nuxt Content overwrites that with the `<!--more-->` excerpt.
        summary: z.string(),
        readingTime: z.string(),
      }),
    }),
  },
})
