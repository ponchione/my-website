import { describe, expect, it } from 'vitest'
import { nextSealed, type Dispatch } from '~/utils/realm/dispatches'

const letter = (path: string, date: string): Dispatch => ({ path, title: path, date, summary: '', readingTime: '1 min read', tags: [] })
// Deliberately out of date order.
const letters = [letter('/blog/middle', '2026-02-01'), letter('/blog/newest', '2026-03-01'), letter('/blog/oldest', '2026-01-01')]

describe('nextSealed', () => {
  it('offers the newest letter still sealed, never the one being read', () => {
    expect(nextSealed(letters, new Set(), '/blog/newest')?.path).toBe('/blog/middle')
    expect(nextSealed(letters, new Set(['/blog/newest']), '/blog/oldest')?.path).toBe('/blog/middle')
  })

  it('offers nothing once every other seal is broken', () => {
    expect(nextSealed(letters, new Set(['/blog/middle', '/blog/oldest']), '/blog/newest')).toBeNull()
  })
})
