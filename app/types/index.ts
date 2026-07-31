export type Resume = {
  experience: WorkExperience[]
  education: Education
}

export type WorkExperience = {
  id: number
  company: string
  location: string
  url: string
  title: string
  startDate: string
  endDate: string
  projects?: WorkProject[]
  responsibilities?: string[]
  skills?: string[]
}

export type WorkProject = {
  id: number
  project: string
  responsibilities: string[]
}

export type Education = {
  id: number
  school: string
  url: string
  level: string
  degree: string
  year: number
}

export type PersonalProject = {
  id: number
  name: string
  description: string
  last_pushed_at: string
  tags: string[]
  status: 'In Progress' | 'Planned' | 'Complete' | 'V1' | 'Deprecated'
  github_url: string
}

export type GitHubRepository = {
  name: string
  full_name: string
  html_url: string
  description: string | null
  pushed_at: string | null
  language: string | null
  topics: string[]
  archived: boolean
}
