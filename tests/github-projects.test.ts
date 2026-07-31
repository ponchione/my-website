import { describe, expect, it } from 'vitest'
import type { GitHubRepository, PersonalProject } from '~/types'
import {
  formatGitHubTimestamp,
  isValidGitHubTimestamp,
  normalizeGitHubTags,
  parseGitHubRepositoryKey,
  resolveGitHubProjects,
  validateGitHubRepositories,
} from '~/utils/github-projects'

const localProjects: PersonalProject[] = [
  {
    id: 1,
    name: 'Editorial Alpha',
    description: 'Local alpha description',
    last_pushed_at: '2026-01-01T12:00:00Z',
    tags: ['Local alpha'],
    status: 'V1',
    github_url: 'https://github.com/Example/Alpha',
  },
  {
    id: 2,
    name: 'Editorial Beta',
    description: 'Local beta description',
    last_pushed_at: '2026-02-02T12:00:00Z',
    tags: ['Local beta'],
    status: 'Deprecated',
    github_url: 'https://github.com/example/beta',
  },
]

function repository(overrides: Partial<GitHubRepository> = {}): GitHubRepository {
  return {
    name: 'alpha',
    full_name: 'example/alpha',
    html_url: 'https://github.com/example/alpha',
    description: 'Live alpha description',
    pushed_at: '2026-07-30T22:30:00Z',
    language: 'TypeScript',
    topics: ['vue-js'],
    archived: false,
    ...overrides,
  }
}

describe('GitHub project metadata utilities', () => {
  it('parses only exact GitHub repository URLs', () => {
    expect(parseGitHubRepositoryKey('https://github.com/Example/Alpha.git/')).toBe('example/alpha')

    for (const url of [
      'http://github.com/example/alpha',
      'https://user@github.com/example/alpha',
      'https://github.com:8443/example/alpha',
      'https://github.com/example/alpha?tab=readme',
      'https://github.com/example/alpha#readme',
      'https://github.com/example/alpha/issues',
      'https://notgithub.com/example/alpha',
      'not a URL',
    ]) {
      expect(parseGitHubRepositoryKey(url)).toBeNull()
    }
  })

  it('preserves the allowlist order and ignores repositories that are not configured', () => {
    const repositories = [
      repository({
        name: 'beta',
        full_name: 'EXAMPLE/BETA',
        html_url: 'https://github.com/example/beta',
        description: 'Live beta description',
      }),
      repository({ name: 'extra', full_name: 'example/extra', html_url: 'https://github.com/example/extra' }),
      repository(),
    ]

    const resolved = resolveGitHubProjects(localProjects, repositories)

    expect(resolved.map(project => project.id)).toEqual([1, 2])
    expect(resolved.map(project => project.description)).toEqual([
      'Live alpha description',
      'Live beta description',
    ])
  })

  it('replaces live fields while retaining local display names and statuses', () => {
    const resolved = resolveGitHubProjects(localProjects, [repository()])[0]!

    expect(resolved).toMatchObject({
      id: 1,
      name: 'Editorial Alpha',
      status: 'V1',
      description: 'Live alpha description',
      last_pushed_at: '2026-07-30T22:30:00Z',
      tags: ['TypeScript', 'vue js', 'Local alpha'],
      github_url: 'https://github.com/example/alpha',
    })
    expect(resolved).not.toBe(localProjects[0])
    expect(localProjects[0]!.description).toBe('Local alpha description')
  })

  it.each([
    ['null', null],
    ['blank', '   '],
  ])('keeps the local description when the live description is %s', (_, description) => {
    const resolved = resolveGitHubProjects(localProjects, [repository({ description })])[0]!

    expect(resolved.description).toBe('Local alpha description')
  })

  it.each([null, 'not-a-timestamp', '2026-02-30T12:00:00Z'])(
    'keeps the local timestamp when the live timestamp is %s',
    (pushedAt) => {
      const resolved = resolveGitHubProjects(localProjects, [repository({ pushed_at: pushedAt })])[0]!

      expect(resolved.last_pushed_at).toBe('2026-01-01T12:00:00Z')
    },
  )

  it('keeps local tags when GitHub has no usable language or topics', () => {
    const resolved = resolveGitHubProjects(localProjects, [repository({
      language: null,
      topics: ['', 'portfolio'],
    })])[0]!

    expect(resolved.tags).toEqual(['Local alpha'])
  })

  it('deduplicates tags and applies only the explicit topic aliases', () => {
    expect(normalizeGitHubTags('Python', [
      'python',
      'sqlite',
      'lancedb',
      'llama-cpp',
      'fastapi',
      'vue-js',
      'portfolio',
      '',
      'SQLITE',
    ])).toEqual([
      'Python',
      'SQLite',
      'LanceDB',
      'llama.cpp',
      'FastAPI',
      'vue js',
    ])
  })

  it('leaves only the missing configured repository on its local fallback', () => {
    const resolved = resolveGitHubProjects(localProjects, [repository()])

    expect(resolved[0]!.description).toBe('Live alpha description')
    expect(resolved[1]).toEqual(localProjects[1])
    expect(resolved[1]).not.toBe(localProjects[1])
  })

  it('handles malformed local URLs and response entries without throwing', () => {
    const malformedLocal = [{ ...localProjects[0]!, github_url: 'not a GitHub URL' }]
    const response = [null, {}, repository()]

    expect(() => resolveGitHubProjects(malformedLocal, [repository()])).not.toThrow()
    expect(resolveGitHubProjects(malformedLocal, [repository()])).toEqual(malformedLocal)
    expect(validateGitHubRepositories(response)).toEqual([repository()])
    expect(validateGitHubRepositories({})).toBeNull()
  })

  it('retains a local URL that disagrees with full_name while using other valid metadata', () => {
    const resolved = resolveGitHubProjects(localProjects, [repository({
      html_url: 'https://github.com/example/different',
    })])[0]!

    expect(resolved.github_url).toBe('https://github.com/Example/Alpha')
    expect(resolved.description).toBe('Live alpha description')
    expect(resolved.last_pushed_at).toBe('2026-07-30T22:30:00Z')
    expect(resolved.tags).toEqual(['TypeScript', 'vue js', 'Local alpha'])
  })

  it('keeps curated technologies when GitHub topics are incomplete', () => {
    const localWithTechnologies = [{
      ...localProjects[0]!,
      tags: ['Go', 'Python', 'SQLite', 'llama.cpp'],
    }]
    const resolved = resolveGitHubProjects(localWithTechnologies, [repository({
      language: 'Go',
      topics: [],
    })])[0]!

    expect(resolved.tags).toEqual(['Go', 'Python', 'SQLite', 'llama.cpp'])
  })

  it('validates timestamps and formats their UTC calendar date in English', () => {
    expect(isValidGitHubTimestamp('2026-07-31T23:30:00-02:00')).toBe(true)
    expect(isValidGitHubTimestamp('2026-02-30T12:00:00Z')).toBe(false)
    expect(formatGitHubTimestamp('2026-07-31T23:30:00-02:00')).toBe('Aug 1, 2026')
  })
})
