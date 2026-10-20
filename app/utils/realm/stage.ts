import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { MapPick } from './map-data'
import type { MapModePalette } from './map-modes'

// What the map page lends a game played on its map (`/play`): the game paints the
// counties, pins its armies, takes the map's clicks and marks the county it has
// selected, and the résumé's colors and towns come back when it leaves. Kept free of
// the game's own code, which the home page doesn't load.

export type ArmyBanner = {
  id: string
  at: readonly [number, number] // normalized map coordinates, as markers take them
  house: string
  color: string // CSS color of the house
  men: number
}

export type RealmStage = {
  ready: Readonly<Ref<boolean>>
  palette: ShallowRef<MapModePalette | null> // null: the résumé's map modes
  armies: ShallowRef<ArmyBanner[]>
  selected: ShallowRef<MapPick | null>
  onPick: ShallowRef<((pick: MapPick | null) => void) | null> // a click on the map
}

export const REALM_STAGE: InjectionKey<RealmStage> = Symbol('realm-stage')
