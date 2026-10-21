import { describe, expect, it } from 'vitest'
import resumeData from '~/data/resume.json'
import type { Resume } from '~/types'
import { careerHoldings, educationHoldings, heldTown, heldTowns, journey } from '~/utils/realm/career'
import { countyByFips, locate, mapData } from '~/utils/realm/map-data'

const { experience, education } = resumeData as Resume

describe('the resume on the map', () => {
  it('places every job, with everything the resume says about it', () => {
    for (const job of experience) {
      const holding = careerHoldings.find(candidate => candidate.id === `post-${job.id}`)
      expect(holding, `${job.company} (${job.location}) has no town in career.ts`).toBeDefined()
      expect(holding!.duties).toEqual(job.responsibilities ?? [])
      expect(holding!.projects.flatMap(project => project.duties)).toEqual((job.projects ?? []).flatMap(project => project.responsibilities))
      expect(holding!.skills).toEqual(job.skills ?? [])
      expect(holding!.url).toBe(job.url)
    }
  })

  it('places the degree', () => {
    expect(educationHoldings).toHaveLength(1)
    expect(educationHoldings[0]!.institution).toBe(education.school)
  })

  it('gathers holdings by town, inside a county on the map', () => {
    expect(heldTowns.flatMap(town => town.holdings)).toHaveLength(careerHoldings.length + educationHoldings.length)
    expect(heldTown('pittsburgh')?.holdings.map(holding => holding.institution)).toEqual(['Arcadia.io', 'PNC Bank'])
    for (const town of heldTowns) {
      expect(countyByFips(town.fips), `${town.name}'s county`).toBeDefined()
      for (const coordinate of locate(town.at)) {
        expect(coordinate).toBeGreaterThan(0)
        expect(coordinate).toBeLessThan(1)
      }
    }
  })
})

describe('the guided tour', () => {
  it('walks from the degree through every post in the order each began', () => {
    expect(journey.map(stop => stop.holding.id)).toEqual(['schooling-1', 'post-5', 'post-4', 'post-3', 'post-2', 'post-1', 'post-6'])
    expect(journey.map(stop => stop.year)).toEqual([2016, 2017, 2020, 2021, 2021, 2023, 2026])
  })

  it('says what each step was and how the road got there', () => {
    expect(journey.map(stop => stop.milestone)).toEqual(['Schooling', 'The first post', 'A new post', 'A new post', 'A return', 'A new post', 'The current post'])
    expect(journey[0]!.move).toBe('Where the road begins')
    // Indiana to New Holland is about 265 km, a little south of due east.
    expect(journey[1]!.move).toMatch(/^From Indiana · 2[67]0 km east$/)
    expect(journey[3]!.move).toBe('Stays in Pittsburgh')
    // The Mechanicsburg office is about 80 km west of New Holland.
    expect(journey[5]!.move).toMatch(/^From New Holland · [78]0 km west$/)
  })
})

describe('locate', () => {
  it('maps the corners of the map to the corners of its coordinates', () => {
    const { west, east, south, north } = mapData.bounds
    const [left, top] = locate([west, north])
    const [right, bottom] = locate([east, south])
    expect(left).toBeCloseTo(0)
    expect(top).toBeCloseTo(0)
    expect(right).toBeCloseTo(1)
    expect(bottom).toBeCloseTo(1)
  })

  it('puts a town inside the county it belongs to', () => {
    // Pittsburgh sits near the anchor of Allegheny County's label.
    const pittsburgh = locate(heldTown('pittsburgh')!.at)
    const allegheny = countyByFips('42003')!
    expect(Math.hypot(pittsburgh[0] - allegheny.label[0]!, pittsburgh[1] - allegheny.label[1]!)).toBeLessThan(allegheny.labelRadius * 2)
  })
})
