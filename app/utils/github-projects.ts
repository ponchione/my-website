import type { GitHubRepository, PersonalProject } from '~/types'

const REPOSITORY_PATH_PATTERN = /^\/([^/]+)\/([^/]+)\/?$/
const REPOSITORY_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/
const FULL_NAME_PATTERN = /^([^/]+)\/([^/]+)$/
const ISO_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/

const TOPIC_ALIASES: Record<string, string> = {
  sqlite: 'SQLite',
  lancedb: 'LanceDB',
  'llama-cpp': 'llama.cpp',
  fastapi: 'FastAPI',
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRepositorySegment(value: string): boolean {
  return value.length > 0 && REPOSITORY_SEGMENT_PATTERN.test(value)
}

function normalizeFullName(value: string): string | null {
  const match = FULL_NAME_PATTERN.exec(value)

  if (!match || !isRepositorySegment(match[1]!) || !isRepositorySegment(match[2]!)) {
    return null
  }

  return `${match[1]}/${match[2]}`.toLowerCase()
}

export function parseGitHubRepositoryKey(value: string): string | null {
  try {
    const url = new URL(value)

    if (
      url.protocol !== 'https:'
      || url.hostname !== 'github.com'
      || url.username
      || url.password
      || url.port
      || url.search
      || url.hash
    ) {
      return null
    }

    const match = REPOSITORY_PATH_PATTERN.exec(url.pathname)
    if (!match) {
      return null
    }

    const owner = match[1]!
    const repository = match[2]!.replace(/\.git$/i, '')

    if (!isRepositorySegment(owner) || !isRepositorySegment(repository)) {
      return null
    }

    return `${owner}/${repository}`.toLowerCase()
  }
  catch {
    return null
  }
}

export function isValidGitHubTimestamp(value: string): boolean {
  const match = ISO_TIMESTAMP_PATTERN.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const offsetHour = Number(match[8] ?? 0)
  const offsetMinute = Number(match[9] ?? 0)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysByMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  return month >= 1
    && month <= 12
    && day >= 1
    && day <= daysByMonth[month - 1]!
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 23
    && offsetMinute <= 59
    && Number.isFinite(Date.parse(value))
}

export function formatGitHubTimestamp(value: string): string {
  return isValidGitHubTimestamp(value) ? dateFormatter.format(new Date(value)) : ''
}

export function normalizeGitHubTags(language: string | null, topics: string[]): string[] {
  const values = [
    language?.trim() ?? '',
    ...topics.map((topic) => {
      const trimmedTopic = topic.trim()
      const normalizedTopic = trimmedTopic.toLowerCase()

      if (!trimmedTopic || normalizedTopic === 'portfolio') {
        return ''
      }

      return TOPIC_ALIASES[normalizedTopic] ?? trimmedTopic.replaceAll('-', ' ')
    }),
  ]
  const seen = new Set<string>()

  return values.filter((value) => {
    if (!value) {
      return false
    }

    const normalizedValue = value.toLowerCase()
    if (seen.has(normalizedValue)) {
      return false
    }

    seen.add(normalizedValue)
    return true
  })
}

export function validateGitHubRepository(value: unknown): GitHubRepository | null {
  if (!isRecord(value)) {
    return null
  }

  const {
    name,
    full_name: fullName,
    html_url: htmlUrl,
    description,
    pushed_at: pushedAt,
    language,
    topics,
    archived,
  } = value

  if (
    typeof name !== 'string'
    || !name.trim()
    || typeof fullName !== 'string'
    || normalizeFullName(fullName) === null
    || typeof htmlUrl !== 'string'
    || (description !== null && typeof description !== 'string')
    || (pushedAt !== null && typeof pushedAt !== 'string')
    || (language !== null && typeof language !== 'string')
    || !Array.isArray(topics)
    || !topics.every(topic => typeof topic === 'string')
    || typeof archived !== 'boolean'
  ) {
    return null
  }

  return {
    name,
    full_name: fullName,
    html_url: htmlUrl,
    description,
    pushed_at: pushedAt,
    language,
    topics,
    archived,
  }
}

export function validateGitHubRepositories(value: unknown): GitHubRepository[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  return value
    .map(validateGitHubRepository)
    .filter((repository): repository is GitHubRepository => repository !== null)
}

function cloneProject(project: PersonalProject): PersonalProject {
  return { ...project, tags: [...project.tags] }
}

function mergeProjectTags(liveTags: string[], localTags: string[]): string[] {
  const seen = new Set<string>()

  return [...liveTags, ...localTags].filter((tag) => {
    const normalizedTag = tag.toLowerCase()
    if (seen.has(normalizedTag)) {
      return false
    }

    seen.add(normalizedTag)
    return true
  })
}

export function resolveGitHubProjects(
  localProjects: readonly PersonalProject[],
  repositories: readonly GitHubRepository[],
): PersonalProject[] {
  const repositoriesByKey = new Map<string, GitHubRepository>()

  for (const repository of repositories) {
    const key = normalizeFullName(repository.full_name)
    if (key && !repositoriesByKey.has(key)) {
      repositoriesByKey.set(key, repository)
    }
  }

  return localProjects.map((localProject) => {
    const project = cloneProject(localProject)
    const localKey = parseGitHubRepositoryKey(localProject.github_url)
    const repository = localKey ? repositoriesByKey.get(localKey) : undefined

    if (!localKey || !repository) {
      return project
    }

    const description = repository.description?.trim()
    if (description) {
      project.description = description
    }

    if (repository.pushed_at && isValidGitHubTimestamp(repository.pushed_at)) {
      project.last_pushed_at = repository.pushed_at
    }

    const tags = normalizeGitHubTags(repository.language, repository.topics)
    if (tags.length > 0) {
      project.tags = mergeProjectTags(tags, localProject.tags)
    }

    const liveKey = parseGitHubRepositoryKey(repository.html_url)
    const fullNameKey = normalizeFullName(repository.full_name)
    if (liveKey === localKey && fullNameKey === localKey) {
      project.github_url = repository.html_url
    }

    return project
  })
}
