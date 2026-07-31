import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import WorkListing from '~/components/WorkListing.vue'
import type { WorkExperience } from '~/types'

const job: WorkExperience = {
  id: 1,
  company: 'Example Company',
  location: 'Remote',
  url: 'https://example.com',
  title: 'Engineer',
  startDate: 'January 2020',
  endDate: 'Present',
  responsibilities: ['Built useful things.'],
  skills: ['Vue'],
}

describe('WorkListing', () => {
  it('uses a native button with no nested interactive controls', async () => {
    const wrapper = await mountSuspended(WorkListing, {
      props: { job },
      global: { stubs: { UiBadge: true } },
    })
    const trigger = wrapper.get('button[aria-controls="work-details-1"]')

    expect(trigger.element.querySelector('a, button, input, select, textarea')).toBeNull()
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Built useful things.')

    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })
})
