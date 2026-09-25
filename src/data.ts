import catalog from './pokemon-data.json'
import tmCatalog from './tm-data.json'

export type Stats = {
  hp: number
  attack: number
  defense: number
  specialAttack: number
  specialDefense: number
  speed: number
}

export type Move = {
  name: string
  type: string
  power: number | null
  cooldown: string
  level: number | null
}

export type TechnicalMove = {
  id: string
  name: string
  type: string
  power: number | null
  cooldown: string
  category: string
  attackCategory: 'physical' | 'special' | 'status'
  range: string
  isArea: boolean
  chest: string
}

export type Pokemon = {
  id: number
  localId: number
  name: string
  generation: number
  region: string
  type: string
  eggGroup: string
  baseExp: number
  stats: Stats
  form: 'Base' | 'Mega' | 'Forma'
  accent: string
  image: string
  levelMoves: Move[]
  tmMoves: Move[]
}

export async function loadPokemon(): Promise<Pokemon[]> {
  return catalog as Pokemon[]
}

export const pokemonFallback: Pokemon[] = (catalog as Pokemon[]).slice(0, 1)
export const technicalMoves = tmCatalog as TechnicalMove[]
