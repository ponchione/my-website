import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import ProjectListing from '~/components/ProjectListing.vue'
import type { PersonalProject } from '~/types'

const project: PersonalProject = {
  id: 1,
  name: 'Example project',
  description: 'Example description',
  last_pushed_at: '2026-07-30T22:30:00Z',
  tags: ['TypeScript'],
  status: 'In Progress',
  github_url: 'https://github.com/example/project',
}

describe('ProjectListing', () => {
  it('renders the last push as a semantic UTC date', async () => {
    const wrapper = await mountSuspended(ProjectListing, {
      props: { project },
      global: { stubs: { UiBadge: true } },
    })
    const time = wrapper.get('time')

    expect(wrapper.text()).toContain('Last pushed: Jul 30, 2026')
    expect(wrapper.text()).not.toContain('Last updated')
    expect(time.attributes('datetime')).toBe(project.last_pushed_at)
  })
})
