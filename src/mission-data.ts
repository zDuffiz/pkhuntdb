import recommendationCatalog from './mission-recommendations.json'

export type MissionRecommendedPokemon = {
  name: string
  weight?: number
  chance: number
  expected: number
  types: string[]
  media?: number
  valid?: boolean
  eff?: number
}

export type MissionTargetRoute = {
  species: string
  required: number
  hunt: string
  regionId: string
  level: number
  spawnCount: number
  chance: number
  expected: number
  types: string[]
}

export type MissionRecommendation = {
  kind: 'capture' | 'multi' | 'weak' | 'none'
  title?: string
  hunt?: string
  regionId?: string
  level?: number
  spawnCount?: number
  chance?: number
  expected?: number
  avgMedia?: number
  pokemon?: MissionRecommendedPokemon[]
  targets?: MissionTargetRoute[]
  singleHunt?: { hunt: string; regionId: string; level: number; spawnCount: number; pokemon: MissionRecommendedPokemon[] }
  message?: string
}

const recommendationsById = recommendationCatalog as Record<string, MissionRecommendation>

export type ClanMission = {
  id: string
  clan: string
  element: string
  name: string
  part: string
  tier: number
  minimumLevel: number | null
  kind: 'Captura' | 'Contrato específico' | 'Fraqueza elemental'
  description: string
  target: number
  gold: number
  experience: number
  tokens: number
  clanPoints: number
  recommendation: MissionRecommendation
}

type ClanConfig = {
  name: string
  element: string
  slug: string
  captureOne: number
  captureTwo: number
  contractTwoA: number
  contractTwoB: number
}

type TargetKey = 'captureOne' | 'captureTwo' | 'contractTwoA' | 'contractTwoB'
type MissionStage = {
  suffix: string
  part: string
  tier: number
  minimumLevel: number | null
  kind: ClanMission['kind']
  target: number | TargetKey
  rewards: [number, number, number, number]
}

const clans: ClanConfig[] = [
  { name: 'Swarmveil', element: 'Inseto / Bug', slug: 'bug', captureOne: 1000, captureTwo: 5000, contractTwoA: 7680, contractTwoB: 5930 },
  { name: 'Nightfall', element: 'Sombrio / Dark', slug: 'dark', captureOne: 175, captureTwo: 875, contractTwoA: 5840, contractTwoB: 4760 },
  { name: 'Drakemoor', element: 'Dragão / Dragon', slug: 'dragon', captureOne: 125, captureTwo: 625, contractTwoA: 7500, contractTwoB: 5090 },
  { name: 'Raibolt', element: 'Elétrico / Electric', slug: 'electric', captureOne: 250, captureTwo: 1250, contractTwoA: 6300, contractTwoB: 5830 },
  { name: 'Sylphery', element: 'Fada / Fairy', slug: 'fairy', captureOne: 1000, captureTwo: 5000, contractTwoA: 5510, contractTwoB: 5830 },
  { name: 'Gardestrike', element: 'Lutador / Fighting', slug: 'fighting', captureOne: 525, captureTwo: 2625, contractTwoA: 5960, contractTwoB: 5930 },
  { name: 'Volcanic', element: 'Fogo / Fire', slug: 'fire', captureOne: 275, captureTwo: 1375, contractTwoA: 6670, contractTwoB: 5830 },
  { name: 'Wingeon', element: 'Voador / Flying', slug: 'flying', captureOne: 1000, captureTwo: 5000, contractTwoA: 6960, contractTwoB: 5830 },
  { name: 'Umbrawisp', element: 'Fantasma / Ghost', slug: 'ghost', captureOne: 275, captureTwo: 1375, contractTwoA: 5840, contractTwoB: 3090 },
  { name: 'Naturia', element: 'Grama / Grass', slug: 'grass', captureOne: 1000, captureTwo: 5000, contractTwoA: 7140, contractTwoB: 6250 },
  { name: 'Orebound', element: 'Terra / Ground', slug: 'ground', captureOne: 300, captureTwo: 1500, contractTwoA: 5000, contractTwoB: 9580 },
  { name: 'Frostbound', element: 'Gelo / Ice', slug: 'ice', captureOne: 250, captureTwo: 1250, contractTwoA: 4580, contractTwoB: 6670 },
  { name: 'Plainkind', element: 'Normal', slug: 'normal', captureOne: 1000, captureTwo: 5000, contractTwoA: 3630, contractTwoB: 4040 },
  { name: 'Malefic', element: 'Veneno / Poison', slug: 'poison', captureOne: 900, captureTwo: 4500, contractTwoA: 3930, contractTwoB: 6670 },
  { name: 'Psycraft', element: 'Psíquico / Psychic', slug: 'psychic', captureOne: 300, captureTwo: 1500, contractTwoA: 7920, contractTwoB: 5000 },
  { name: 'Stonehall', element: 'Pedra / Rock', slug: 'rock', captureOne: 200, captureTwo: 1000, contractTwoA: 5710, contractTwoB: 5830 },
  { name: 'Ironhard', element: 'Aço / Steel', slug: 'steel', captureOne: 200, captureTwo: 1000, contractTwoA: 5960, contractTwoB: 5000 },
  { name: 'Seavell', element: 'Água / Water', slug: 'water', captureOne: 300, captureTwo: 1500, contractTwoA: 8750, contractTwoB: 5960 },
]

const stages: MissionStage[] = [
  { suffix: '1', part: 'I', tier: 1, minimumLevel: 10, kind: 'Captura', target: 'captureOne', rewards: [29300, 90000, 0, 1] },
  { suffix: '2', part: 'II', tier: 2, minimumLevel: 25, kind: 'Captura', target: 'captureTwo', rewards: [163000, 550000, 1, 3] },
  { suffix: '1a', part: 'I', tier: 1, minimumLevel: null, kind: 'Contrato específico', target: 1000, rewards: [5860, 18000, 0, 1] },
  { suffix: '1b', part: 'I·B', tier: 1, minimumLevel: null, kind: 'Contrato específico', target: 1000, rewards: [5860, 18000, 0, 1] },
  { suffix: '1h', part: 'I½', tier: 1.5, minimumLevel: 12, kind: 'Contrato específico', target: 5000, rewards: [30900, 100000, 0, 1] },
  { suffix: '2a', part: 'II', tier: 2, minimumLevel: 20, kind: 'Contrato específico', target: 'contractTwoA', rewards: [97700, 330000, 0, 2] },
  { suffix: '2b', part: 'II·B', tier: 2, minimumLevel: 20, kind: 'Contrato específico', target: 'contractTwoB', rewards: [97700, 330000, 0, 2] },
  { suffix: '3a', part: 'III', tier: 3, minimumLevel: 32, kind: 'Fraqueza elemental', target: 25000, rewards: [171000, 600000, 1, 4] },
  { suffix: '3b', part: 'III·B', tier: 3, minimumLevel: 32, kind: 'Fraqueza elemental', target: 25000, rewards: [171000, 600000, 1, 4] },
  { suffix: '4', part: 'IV', tier: 4, minimumLevel: 45, kind: 'Fraqueza elemental', target: 150000, rewards: [1070000, 3900000, 3, 8] },
  { suffix: '5', part: 'V', tier: 5, minimumLevel: 60, kind: 'Fraqueza elemental', target: 400000, rewards: [2990000, 11200000, 5, 15] },
]

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

export const clanMissions: ClanMission[] = clans.flatMap((clan) => stages.map((stage) => {
  const target = typeof stage.target === 'number' ? stage.target : clan[stage.target]
  const id = `${stage.kind === 'Captura' ? 'catch' : 'contract'}-${clan.slug}-${stage.suffix}`
  const description = stage.kind === 'Captura'
    ? `Capturar ${formatNumber(target)} Pokémon do tipo ${clan.element}.`
    : stage.kind === 'Contrato específico'
      ? `Derrotar os Pokémon específicos pedidos nesta etapa até completar ${formatNumber(target)} abates totais.`
      : `Derrotar ${formatNumber(target)} Pokémon fracos ao elemento ${clan.element}.`

  return {
    id,
    clan: clan.name,
    element: clan.element,
    name: `${stage.kind === 'Captura' ? 'Captura' : 'Contrato'} ${clan.name} ${stage.part}`,
    part: stage.part,
    tier: stage.tier,
    minimumLevel: stage.minimumLevel,
    kind: stage.kind,
    description,
    target,
    gold: stage.rewards[0],
    experience: stage.rewards[1],
    tokens: stage.rewards[2],
    clanPoints: stage.rewards[3],
    recommendation: recommendationsById[id],
  }
}))

export const clanNames = clans.map(({ name }) => name)