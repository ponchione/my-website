// Blog posts arrive as dispatches: event pop-ups opened from the banner, unread first.

export type Dispatch = {
  path: string
  title: string
  date: string
  summary: string
  readingTime: string
  tags: string[]
}

// Unread dispatches first, then the rest; newest first within each.
export function dispatchQueue(dispatches: Dispatch[], read: Set<string>) {
  const newestFirst = [...dispatches].sort((a, b) => b.date.localeCompare(a.date))
  return [...newestFirst.filter(d => !read.has(d.path)), ...newestFirst.filter(d => read.has(d.path))]
}

// Grand-strategy dates: day, month, year.
export function formatDispatchDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Which dispatches this visitor has opened. Browser-local and best-effort.
const READ_KEY = 'realm:read-dispatches'

export function loadReadDispatches() {
  try {
    const stored = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')
    return new Set<string>(Array.isArray(stored) ? stored.filter(item => typeof item === 'string') : [])
  }
  catch {
    return new Set<string>()
  }
}

export function saveReadDispatches(read: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...read]))
  }
  catch {
    // Private mode or storage disabled: the seals just stay unbroken.
  }
}
