import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import type { GitHubRepository, PersonalProject } from '~/types'

const CACHE_KEY = 'github-projects:v1'

const localProject: PersonalProject = {
  id: 1,
  name: 'Local display name',
  description: 'Local description',
  last_pushed_at: '2026-01-01T12:00:00Z',
  tags: ['Local tag'],
  status: 'Complete',
  github_url: 'https://github.com/example/project',
}

const liveRepository: GitHubRepository = {
  name: 'project',
  full_name: 'example/project',
  html_url: 'https://github.com/example/project',
  description: 'Live description',
  pushed_at: '2026-07-30T12:00:00Z',
  language: 'TypeScript',
  topics: ['vue'],
  archived: false,
}

type UseGithubProjects = typeof import('~/composables/useGithubProjects')['useGithubProjects']

function projectHarness(useGithubProjects: UseGithubProjects, calls = 1) {
  return defineComponent({
    setup() {
      const first = useGithubProjects([localProject])
      const second = calls > 1 ? useGithubProjects([localProject]) : first

      return { first: first.projects, second: second.projects }
    },
    template: `
      <div>
        <span class="first">{{ first[0].description }}</span>
        <span class="second">{{ second[0].description }}</span>
      </div>
    `,
  })
}

beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.sessionStorage.clear()
})

describe('useGithubProjects', () => {
  it('merges a successful response with one correctly configured unauthenticated request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [liveRepository],
    })
    vi.stubGlobal('fetch', fetchMock)
    const { useGithubProjects } = await import('~/composables/useGithubProjects')
    const wrapper = await mountSuspended(projectHarness(useGithubProjects, 2))

    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.first').text()).toBe('Live description')
    expect(wrapper.find('.second').text()).toBe('Live description')

    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.github.com/users/ponchione/repos?type=owner&sort=updated&direction=desc&per_page=100')
    expect(options.headers).toEqual({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
    })
    expect(options.headers).not.toHaveProperty('Authorization')
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('leaves fallback projects unchanged after a failed request and does not retry on remount', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network unavailable'))
    vi.stubGlobal('fetch', fetchMock)
    const { useGithubProjects } = await import('~/composables/useGithubProjects')
    const harness = projectHarness(useGithubProjects, 2)
    const firstMount = await mountSuspended(harness)

    await flushPromises()
    expect(firstMount.find('.first').text()).toBe('Local description')
    firstMount.unmount()

    const secondMount = await mountSuspended(harness)
    await flushPromises()

    expect(secondMount.find('.first').text()).toBe('Local description')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses fresh session cache data without making a network request', async () => {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      fetchedAt: Date.now(),
      repositories: [liveRepository],
    }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { useGithubProjects } = await import('~/composables/useGithubProjects')
    const wrapper = await mountSuspended(projectHarness(useGithubProjects))

    await flushPromises()

    expect(wrapper.find('.first').text()).toBe('Live description')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['expired', () => JSON.stringify({
      fetchedAt: Date.now() - (15 * 60 * 1000) - 1,
      repositories: [liveRepository],
    })],
    ['malformed', () => JSON.stringify({
      fetchedAt: Date.now(),
      repositories: [{}],
    })],
  ])('ignores %s session cache data', async (_, cacheValue) => {
    window.sessionStorage.setItem(CACHE_KEY, cacheValue())
    const fetchMock = vi.fn().mockRejectedValue(new Error('network unavailable'))
    vi.stubGlobal('fetch', fetchMock)
    const { useGithubProjects } = await import('~/composables/useGithubProjects')
    const wrapper = await mountSuspended(projectHarness(useGithubProjects))

    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.first').text()).toBe('Local description')
  })
})
