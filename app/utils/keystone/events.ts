// The events that reach the player's house, one every 18–30 months. Each offers two
// choices, and a choice only changes numbers that already exist. The second choice never
// costs gold, so it's always open.
//
// In an effect, gold is in months of the house's development (its base income) and
// levies in men per point of development, so an event weighs the same in 1200 and 1240.
// Development changes the event's county. `{ruler}` and `{county}` fill in the names.

export type Effect = {
  gold?: number
  levies?: number
  development?: number
  martial?: number
  stewardship?: number
  learning?: number
  health?: number
}

export type Choice = { label: string, past: string, effect: Effect }

export type KeystoneEvent = { id: string, title: string, text: string, choices: [Choice, Choice] }

export const EVENTS: KeystoneEvent[] = [
  {
    id: 'winter',
    title: 'A Hard Winter',
    text: 'Snow lies deep in {county}, and the villages there are running short of bread.',
    choices: [
      { label: 'Open the granaries', past: 'opened the granaries to {county}', effect: { gold: -4 } },
      { label: 'Let the villages fend for themselves', past: 'left {county} to the winter', effect: { development: -1 } },
    ],
  },
  {
    id: 'tournament',
    title: 'A Tournament',
    text: 'The knights of {county} ask leave to hold a tournament, at {ruler}\'s expense.',
    choices: [
      { label: 'Host the tournament', past: 'hosted a tournament in {county}', effect: { gold: -3, martial: 1 } },
      { label: 'Forbid it', past: 'forbade a tournament', effect: {} },
    ],
  },
  {
    id: 'scholar',
    title: 'A Wandering Scholar',
    text: 'A scholar from beyond the sea arrives in {county} and seeks a patron.',
    choices: [
      { label: 'Take the scholar in', past: 'took in a scholar', effect: { gold: -3, learning: 1 } },
      { label: 'Send the scholar on', past: 'sent a scholar away', effect: {} },
    ],
  },
  {
    id: 'fever',
    title: 'A Fever',
    text: '{ruler} has fallen ill with a fever. The court physician asks to be paid in advance.',
    choices: [
      { label: 'Pay the physician', past: 'paid a physician to treat a fever', effect: { gold: -2 } },
      { label: 'Rest and pray', past: 'rode out a fever', effect: { health: -2 } },
    ],
  },
  {
    id: 'bandits',
    title: 'Bandits on the Roads',
    text: 'Bandits are robbing travellers on the roads of {county}.',
    choices: [
      { label: 'Pay them to move on', past: 'paid off the bandits of {county}', effect: { gold: -2 } },
      { label: 'Send the levies after them', past: 'hunted down the bandits of {county}', effect: { levies: -15, martial: 1 } },
    ],
  },
  {
    id: 'harvest',
    title: 'A Rich Harvest',
    text: 'The harvest in {county} is the best in living memory.',
    choices: [
      { label: 'Sell the surplus', past: 'sold the harvest of {county}', effect: { gold: 4 } },
      { label: 'Build new mills', past: 'built new mills in {county}', effect: { development: 1 } },
    ],
  },
  {
    id: 'steward',
    title: 'An Able Steward',
    text: 'A steward who kept the accounts of a richer court offers {ruler} his service.',
    choices: [
      { label: 'Hire him', past: 'hired an able steward', effect: { gold: -3, stewardship: 1 } },
      { label: 'Keep the old steward', past: 'kept the old steward', effect: {} },
    ],
  },
  {
    id: 'fall',
    title: 'A Fall While Hunting',
    text: '{ruler} is thrown from a horse while hunting in {county}.',
    choices: [
      { label: 'Rest for a season', past: 'rested a season after a fall', effect: { stewardship: -1 } },
      { label: 'Ride on', past: 'rode on after a fall', effect: { health: -2 } },
    ],
  },
  {
    id: 'volunteers',
    title: 'Volunteers',
    text: 'Young men from {county} come to the keep, asking to serve.',
    choices: [
      { label: 'Enlist them', past: 'enlisted the young men of {county}', effect: { levies: 30 } },
      { label: 'Send them back to the fields', past: 'sent the young men of {county} home', effect: { gold: 2 } },
    ],
  },
  {
    id: 'pestilence',
    title: 'Pestilence',
    text: 'A sickness is spreading through {county}.',
    choices: [
      { label: 'Close the roads', past: 'closed the roads of {county} against a sickness', effect: { gold: -3 } },
      { label: 'Let life go on', past: 'let a sickness run its course in {county}', effect: { levies: -25, health: -1 } },
    ],
  },
  {
    id: 'fair',
    title: 'A Fair',
    text: 'Merchants ask for a charter to hold a yearly fair in {county}.',
    choices: [
      { label: 'Grant the charter', past: 'chartered a fair in {county}', effect: { gold: -2, development: 1 } },
      { label: 'Tax their wares', past: 'taxed the merchants of {county}', effect: { gold: 3 } },
    ],
  },
  {
    id: 'captain',
    title: 'A Grey Captain',
    text: 'An old captain who fought in the eastern wars offers to drill the levies.',
    choices: [
      { label: 'Pay for the drilling', past: 'paid an old captain to drill the levies', effect: { gold: -4, martial: 1 } },
      { label: 'Spare the purse', past: 'turned away an old captain', effect: {} },
    ],
  },
  {
    id: 'physician',
    title: 'A Learned Physician',
    text: 'A physician trained in Salerno passes through {county}.',
    choices: [
      { label: 'Keep the physician at court', past: 'kept a physician at court', effect: { gold: -3, health: 2 } },
      { label: 'Let the physician pass', past: 'let a physician pass by', effect: {} },
    ],
  },
]

export function eventById(id: string): KeystoneEvent {
  const found = EVENTS.find(e => e.id === id)
  if (!found) throw new Error(`No event ${id}`)
  return found
}
