import type { MarkdownRoot } from '@nuxt/content'

type PostFields = {
  stem: string
  date: string
}

export function getPostSlug(post: Pick<PostFields, 'stem'>): string {
  return post.stem.split('/').at(-1) ?? post.stem
}

export function sortPostsNewestFirst<T extends PostFields>(posts: T[]): T[] {
  return [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostNeighbors<T extends PostFields>(posts: T[], slug: string) {
  const sorted = sortPostsNewestFirst(posts)
  const index = sorted.findIndex(post => getPostSlug(post) === slug)

  return {
    previous: index >= 0 ? sorted[index + 1] ?? null : null,
    next: index > 0 ? sorted[index - 1] ?? null : null,
  }
}

export function formatPostDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

type MarkdownNode = MarkdownRoot['value'][number]

function getBodyText(node: MarkdownNode): string {
  if (typeof node === 'string') return node
  return (node.slice(2) as MarkdownNode[]).map(getBodyText).join(' ')
}

export function getReadingTime(body: MarkdownRoot): string {
  const words = body.value.map(getBodyText).join(' ').trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 225))
  return `${minutes} min read`
}
