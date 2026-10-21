import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import RealmTour from '~/components/realm/RealmTour.vue'
import { journey } from '~/utils/realm/career'

describe('RealmTour', () => {
  it('shows the stop and steps along the road', async () => {
    const first = await mountSuspended(RealmTour, { props: { stops: journey, index: 0 } })
    expect(first.text()).toContain('1 of 7')
    expect(first.text()).toContain('Indiana University of Pennsylvania')
    expect(first.text()).toContain('Indiana, Indiana County · Conferred 2016')
    const [back, next] = first.findAll('.tour-steps button')
    expect(back!.attributes('disabled')).toBeDefined()
    await next!.trigger('click')
    expect(first.emitted('go')).toEqual([[1]])
    await first.findAll('.tour-pip')[4]!.trigger('click')
    expect(first.emitted('go')![1]).toEqual([4])
    await first.get('.tour-option-primary').trigger('click')
    expect(first.emitted('record')).toEqual([[journey[0]!.holding]])

    const last = await mountSuspended(RealmTour, { props: { stops: journey, index: journey.length - 1 } })
    expect(last.get('[aria-current="step"]').attributes('aria-label')).toBe('2026: IT Solutions Architect, New Enterprise Stone & Lime Co., Inc.')
    await last.findAll('.tour-steps button')[1]!.trigger('click')
    expect(last.emitted('close')).toHaveLength(1)
    expect(last.emitted('go')).toBeUndefined()
  })
})
