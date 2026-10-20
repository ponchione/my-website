import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type { MapModePalette } from './map-modes'

// What the map page lends a game played on its map (`/play`): the game paints the
// counties and pins its armies, and the résumé's colors and towns come back when it
// leaves. Kept free of the game's own code, which the home page doesn't load.

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
}

export const REALM_STAGE: InjectionKey<RealmStage> = Symbol('realm-stage')
