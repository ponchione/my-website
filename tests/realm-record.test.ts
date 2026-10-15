import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RealmRecord from '~/components/realm/RealmRecord.vue'
import type { Holding } from '~/utils/realm/career'

const holding: Holding = {
  id: 'post-1',
  town: 'pittsburgh',
  fips: '42003',
  kind: 'post',
  title: 'Engineer',
  institution: 'Example Company',
  url: 'https://example.com',
  start: 'January 2020',
  end: 'Present',
  duties: ['Built useful things.'],
  projects: [{ name: 'A Grand Project', duties: ['Shipped it.'] }],
  skills: ['Vue', 'Go'],
}

// An open record listens on the whole document, so each test's record has to close.
enableAutoUnmount(afterEach)

const mount = (props: Partial<InstanceType<typeof RealmRecord>['$props']> = {}) => mountSuspended(RealmRecord, {
  props: { holding, index: 0, total: 1, paintPlate: vi.fn(), ...props },
})

describe('RealmRecord', () => {
  it('shows the whole record', async () => {
    const paintPlate = vi.fn()
    const wrapper = await mount({ paintPlate })
    const text = wrapper.text()

    for (const expected of ['Engineer', 'Example Company', 'Pittsburgh, Allegheny County', 'January 2020 – Present', 'Built useful things.', 'A Grand Project', 'Shipped it.', 'Vue', 'Go']) {
      expect(text).toContain(expected)
    }
    expect(wrapper.get('a.record-institution').attributes('href')).toBe('https://example.com')
    expect(wrapper.get('[role="dialog"]').attributes('aria-labelledby')).toBe('realm-event-title')
    expect(paintPlate).toHaveBeenCalledOnce()
  })

  it('pages through a town\'s records only when there are several', async () => {
    const single = await mount()
    expect(single.text()).not.toContain('Turn to the next record')

    const several = await mount({ index: 1, total: 2 })
    expect(several.text()).toContain('2 of 2')
    await several.get('.realm-event-option-primary').trigger('click')
    expect(several.emitted('next')).toHaveLength(1)

    await several.get('.realm-event-close').trigger('click')
    expect(several.emitted('close')).toHaveLength(1)
  })

  it('keeps Tab and Shift+Tab inside the record while it is open', async () => {
    const wrapper = await mountSuspended(RealmRecord, {
      props: { holding, index: 0, total: 2, paintPlate: vi.fn() },
      attachTo: document.body,
    })
    const controls = [...wrapper.get('[role="dialog"]').element.querySelectorAll<HTMLElement>('a[href], button')]
    expect(controls.length).toBeGreaterThan(2)
    const [first, middle, last] = [controls[0]!, controls[1]!, controls.at(-1)!]
    const tab = (shiftKey = false) => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
      document.activeElement!.dispatchEvent(event)
      return event
    }

    last.focus()
    tab()
    expect(document.activeElement).toBe(first)
    tab(true)
    expect(document.activeElement).toBe(last)
    // In between, Tab moves the usual way.
    middle.focus()
    expect(tab().defaultPrevented).toBe(false)
    expect(tab(true).defaultPrevented).toBe(false)
  })

  it('says so when a post has nothing written yet', async () => {
    const wrapper = await mount({ holding: { ...holding, duties: [], projects: [], skills: [] } })
    expect(wrapper.text()).toContain('This chapter is still being written.')
    expect(wrapper.find('.record-deeds').exists()).toBe(false)
  })
})
