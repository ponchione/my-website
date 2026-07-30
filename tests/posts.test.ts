import { describe, expect, it } from 'vitest'
import { getPostNeighbors, getPostSlug, sortPostsNewestFirst } from '~/utils/posts'

const posts = [
  { stem: 'blog/older_post', date: '2026-01-01', title: 'Older' },
  { stem: 'blog/Newer_Post', date: '2026-03-01', title: 'Newer' },
  { stem: 'blog/middle_post', date: '2026-02-01', title: 'Middle' },
]

describe('blog post utilities', () => {
  it('preserves capitalization and underscores from Content stems', () => {
    expect(getPostSlug(posts[1])).toBe('Newer_Post')
  })

  it('sorts newest first and returns chronological neighbors', () => {
    expect(sortPostsNewestFirst(posts).map(post => post.title)).toEqual(['Newer', 'Middle', 'Older'])

    const neighbors = getPostNeighbors(posts, 'middle_post')
    expect(neighbors.previous?.title).toBe('Older')
    expect(neighbors.next?.title).toBe('Newer')
  })
})
