import type { GitHubRepository, PersonalProject } from '~/types'
import { resolveGitHubProjects, validateGitHubRepositories, validateGitHubRepository } from '~/utils/github-projects'

const GITHUB_REPOSITORIES_URL = 'https://api.github.com/users/ponchione/repos?type=owner&sort=updated&direction=desc&per_page=100'
const GITHUB_CACHE_KEY = 'github-projects:v1'
const GITHUB_CACHE_TTL_MS = 15 * 60 * 1000
const GITHUB_REQUEST_TIMEOUT_MS = 5_000

type RepositoryCache = {
  fetchedAt: number
  repositories: GitHubRepository[]
}

let repositoryAttempt: Promise<GitHubRepository[] | null> | undefined

function readRepositoryCache(): GitHubRepository[] | null {
  try {
    const storedValue = window.sessionStorage.getItem(GITHUB_CACHE_KEY)
    if (!storedValue) {
      return null
    }

    const parsedValue: unknown = JSON.parse(storedValue)
    if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
      return null
    }

    const cache = parsedValue as Partial<RepositoryCache>
    const age = Date.now() - (cache.fetchedAt ?? Number.NaN)
    if (!Number.isFinite(age) || age < 0 || age >= GITHUB_CACHE_TTL_MS || !Array.isArray(cache.repositories)) {
      return null
    }

    const repositories = cache.repositories.map(validateGitHubRepository)
    if (repositories.some(repository => repository === null)) {
      return null
    }

    return repositories as GitHubRepository[]
  }
  catch {
    return null
  }
}

function writeRepositoryCache(repositories: GitHubRepository[]): void {
  try {
    const cache: RepositoryCache = {
      fetchedAt: Date.now(),
      repositories,
    }

    window.sessionStorage.setItem(GITHUB_CACHE_KEY, JSON.stringify(cache))
  }
  catch {
    // Storage can be unavailable in restricted browser environments.
  }
}

async function requestGitHubRepositories(): Promise<GitHubRepository[] | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(GITHUB_REPOSITORIES_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    const repositories = validateGitHubRepositories(await response.json())
    if (repositories === null) {
      return null
    }

    writeRepositoryCache(repositories)
    return repositories
  }
  catch {
    return null
  }
  finally {
    window.clearTimeout(timeout)
  }
}

function loadGitHubRepositories(): Promise<GitHubRepository[] | null> {
  if (!repositoryAttempt) {
    repositoryAttempt = Promise.resolve(readRepositoryCache() ?? requestGitHubRepositories())
  }

  return repositoryAttempt
}

export function useGithubProjects(localProjects: readonly PersonalProject[]) {
  const projects = ref(localProjects.map(project => ({ ...project, tags: [...project.tags] })))

  onMounted(async () => {
    const repositories = await loadGitHubRepositories()
    if (repositories) {
      projects.value = resolveGitHubProjects(localProjects, repositories)
    }
  })

  return { projects }
}
