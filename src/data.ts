import catalog from './pokemon-data.json'
import tmCatalog from './tm-data.json'
import captureCatalog from './capture-data.json'

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

export type CaptureEntry = {
  name: string
  hardness: number
  range: string
  recommendedBall: string
}

export type MoveDexEntry = TechnicalMove & {
  learnedByLevel: number
  learnedByTm: boolean
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
export const captureRates = captureCatalog as CaptureEntry[]

const moveDexMap = new Map<string, MoveDexEntry>(technicalMoves.map((move) => [move.name, { ...move, learnedByLevel: 0, learnedByTm: true }]))
for (const entry of catalog as Pokemon[]) {
  for (const move of entry.levelMoves) {
    const existing = moveDexMap.get(move.name)
    if (existing) {
      existing.learnedByLevel += 1
      continue
    }
    moveDexMap.set(move.name, {
      id: `LEVEL-${moveDexMap.size + 1}`,
      name: move.name,
      type: move.type,
      power: move.power,
      cooldown: move.cooldown,
      category: move.power === null ? 'Status' : 'Dano',
      attackCategory: move.power === null ? 'status' : 'special',
      range: 'Alvo único',
      isArea: false,
      chest: '—',
      learnedByLevel: 1,
      learnedByTm: false,
    })
  }
}
export const moveDex = [...moveDexMap.values()]
