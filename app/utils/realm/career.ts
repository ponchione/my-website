import resumeData from '~/data/resume.json'
import type { Resume } from '~/types'

// Places the resume on the map. Every post and school sits in a town, which has a
// county and a spot for its marker. Remote roles are placed at the office they
// reported to.

export type Town = {
  id: string
  name: string
  // County FIPS code.
  fips: string
  // Longitude and latitude, for the marker.
  at: [number, number]
}

const TOWNS: Town[] = [
  { id: 'new-enterprise', name: 'New Enterprise', fips: '42009', at: [-78.379, 40.171] }, // Bedford County
  { id: 'mechanicsburg', name: 'Mechanicsburg', fips: '42041', at: [-77.009, 40.214] }, // Cumberland County
  { id: 'new-holland', name: 'New Holland', fips: '42071', at: [-76.085, 40.102] }, // Lancaster County
  { id: 'pittsburgh', name: 'Pittsburgh', fips: '42003', at: [-79.996, 40.441] }, // Allegheny County
  { id: 'indiana', name: 'Indiana', fips: '42063', at: [-79.153, 40.622] }, // Indiana County
]

const LOCATION_TOWN: Record<string, string> = {
  'New Enterprise, PA': 'new-enterprise',
  'New Holland, PA': 'new-holland',
  'Pittsburgh, PA': 'pittsburgh',
}

const OFFICE_TOWN: Record<string, { town: string, note: string }> = {
  'Applied Research Associates Inc.': { town: 'mechanicsburg', note: 'Mechanicsburg office · primarily remote' },
}

const SCHOOL_TOWN: Record<string, string> = {
  'Indiana University of Pennsylvania': 'indiana',
}

export type Holding = {
  id: string
  // Town id and its county's FIPS code.
  town: string
  fips: string
  kind: 'post' | 'schooling'
  title: string
  institution: string
  url: string
  detail?: string
  start: string
  end: string
  // The record: what the work was. Posts list duties, projects, or both.
  duties: string[]
  projects: { name: string, duties: string[] }[]
  skills: string[]
}

const { experience, education } = resumeData as Resume
const town = (id: string | undefined) => TOWNS.find(candidate => candidate.id === id)

export const careerHoldings: Holding[] = experience.flatMap((job): Holding[] => {
  const office = OFFICE_TOWN[job.company]
  const place = town(LOCATION_TOWN[job.location] ?? office?.town)
  if (!place) return []
  return [{
    id: `post-${job.id}`,
    town: place.id,
    fips: place.fips,
    kind: 'post',
    title: job.title,
    institution: job.company,
    url: job.url,
    detail: office?.note,
    start: job.startDate,
    end: job.endDate,
    duties: job.responsibilities ?? [],
    projects: (job.projects ?? []).map(project => ({ name: project.project, duties: project.responsibilities })),
    skills: job.skills ?? [],
  }]
})

const school = town(SCHOOL_TOWN[education.school])

export const educationHoldings: Holding[] = school
  ? [{
      id: `schooling-${education.id}`,
      town: school.id,
      fips: school.fips,
      kind: 'schooling',
      title: `${education.level}, ${education.degree}`,
      institution: education.school,
      url: education.url,
      start: '',
      end: String(education.year),
      duties: [],
      projects: [],
      skills: [],
    }]
  : []

const holdings = [...careerHoldings, ...educationHoldings]

export function holdingsIn(fips: string) {
  return holdings.filter(holding => holding.fips === fips)
}

// The towns something happened in, each with its holdings, most recent first.
export type HeldTown = Town & { kind: Holding['kind'], holdings: Holding[] }

export const heldTowns: HeldTown[] = TOWNS.flatMap((place): HeldTown[] => {
  const held = holdings.filter(holding => holding.town === place.id)
  if (!held.length) return []
  return [{ ...place, kind: held.some(holding => holding.kind === 'post') ? 'post' : 'schooling', holdings: held }]
})

export function heldTown(id: string) {
  return heldTowns.find(place => place.id === id)
}

// The post still held, if any; otherwise the most recent.
export const currentPost = careerHoldings.find(holding => holding.end === 'Present') ?? careerHoldings[0]

export const countiesHeld = new Set(holdings.map(holding => holding.fips)).size
