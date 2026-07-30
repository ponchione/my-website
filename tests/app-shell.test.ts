import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import DefaultLayout from '~/layouts/default.vue'

describe('app shell accessibility', () => {
  it('renders a working skip link targeting the main landmark', async () => {
    const wrapper = await mountSuspended(DefaultLayout, {
      slots: { default: '<p>Page content</p>' },
      global: {
        stubs: {
          LayoutMobileHeader: true,
          LayoutMobileFooter: true,
          LayoutSideNav: true,
        },
      },
    })

    const skipLink = wrapper.get('a.skip-link')
    const main = wrapper.get('main')

    expect(skipLink.attributes('href')).toBe('#main-content')
    expect(main.attributes('id')).toBe('main-content')
    expect(main.attributes('tabindex')).toBe('-1')

  })
})
