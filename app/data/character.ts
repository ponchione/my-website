// The character sheet in the map's top-left corner. Everything here is a placeholder
// to edit: traits, skill values, house, and the counters. Titles held come from
// resume.json; the Career/Education placements come from app/utils/realm/career.ts.

export type IconName =
  | 'anvil' | 'braces' | 'brain-circuit' | 'castle' | 'chess-knight' | 'coins' | 'compass'
  | 'crosshair' | 'dumbbell' | 'eye' | 'footprints' | 'hammer' | 'handshake' | 'heart'
  | 'hourglass' | 'landmark' | 'map-pin' | 'scroll-text' | 'sigma' | 'swords' | 'telescope'
  | 'book-open' | 'venetian-mask'

export type Trait = {
  name: string
  icon: IconName
  description: string
}

export type Skill = {
  name: 'Diplomacy' | 'Martial' | 'Stewardship' | 'Intrigue' | 'Learning' | 'Prowess'
  icon: IconName
  value: number
  // What the skill means for this character, shown on hover.
  meaning: string
}

export type Arms = {
  field: Tincture
  ordinary?: { kind: Ordinary, tincture: Tincture }
  charge?: { kind: Charge, tincture: Tincture }
}
export type Tincture = 'or' | 'argent' | 'gules' | 'azure' | 'vert' | 'purpure' | 'sable'
export type Ordinary = 'fess' | 'pale' | 'bend' | 'chevron' | 'cross' | 'saltire' | 'chief' | 'bordure'
export type Charge = 'keystone' | 'mullet' | 'roundel' | 'lozenge'

// Azure, a keystone within a bordure Or: Pennsylvania's colors and its symbol.
const houseArms: Arms = {
  field: 'azure',
  ordinary: { kind: 'bordure', tincture: 'or' },
  charge: { kind: 'keystone', tincture: 'or' },
}

export const character = {
  name: 'Mitchell Ponchione',
  epithet: 'the Builder',

  house: {
    name: 'House Ponchione',
    arms: houseArms,
    motto: 'Build things that work well and matter.',
    members: 'Husband and father to a growing family of five.',
  },

  // The banner shows the first two of temperament, then the pursuits.
  traits: {
    temperament: [
      { name: 'Builder', icon: 'hammer', description: 'Happiest with something half-made on the bench.' },
      { name: 'Patient', icon: 'hourglass', description: 'Learned at home, applied at work.' },
      { name: 'Long-Sighted', icon: 'telescope', description: 'Plans in years, not sprints.' },
      { name: 'Family First', icon: 'heart', description: 'Husband and father before anything else.' },
    ],
    pursuits: [
      { name: 'Marksman', icon: 'crosshair', description: 'Competes in action shooting sports.' },
      { name: 'Grand Strategist', icon: 'chess-knight', description: 'Plays grand strategy games with friends.' },
      { name: 'Rucker', icon: 'footprints', description: 'Resets with a loaded pack and a long trail.' },
    ],
    schooling: [
      { name: 'Mathematician', icon: 'sigma', description: 'B.S. in Mathematics, Indiana University of Pennsylvania.' },
    ],
  } satisfies Record<string, Trait[]>,

  skills: [
    { name: 'Diplomacy', icon: 'handshake', value: 12, meaning: 'Working across teams and with the people a system serves.' },
    { name: 'Martial', icon: 'swords', value: 9, meaning: 'Discipline under pressure; the shooting range.' },
    { name: 'Stewardship', icon: 'coins', value: 16, meaning: 'Architecture: running systems that last.' },
    { name: 'Intrigue', icon: 'venetian-mask', value: 11, meaning: 'Debugging and legacy-code archaeology.' },
    { name: 'Learning', icon: 'book-open', value: 17, meaning: 'Mathematics, AI, and picking up new domains fast.' },
    { name: 'Prowess', icon: 'dumbbell', value: 10, meaning: 'Rucking miles and endurance.' },
  ] satisfies Skill[],

  correspondence: [
    { label: 'Send a letter', detail: 'Email', href: 'mailto:mitchell.ponchione@gmail.com', icon: 'scroll-text' },
    { label: 'Propose a pact', detail: 'LinkedIn', href: 'https://www.linkedin.com/in/mitchell-ponchione/', icon: 'handshake' },
    { label: 'Tour the workshop', detail: 'GitHub', href: 'https://github.com/ponchione', icon: 'anvil' },
  ] satisfies { label: string, detail: string, href: string, icon: IconName }[],

  // Counters under the banner. `since` counts whole years up to today.
  counters: {
    craftSince: 2017,
  },
}
