import { readFile, writeFile } from 'node:fs/promises'

const canonicalPath = 'src/canonical-catalog.json'
const pokemonPath = 'src/pokemon-data.json'
const tmPath = 'src/tm-data.json'
const normalize = (value) => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[’]/g, "'")
  .replace(/♀/g, ' female')
  .replace(/♂/g, ' male')
  .replace(/\s+/g, ' ')
  .trim()
const titleCase = (value) => value[0].toUpperCase() + value.slice(1)

const canonical = JSON.parse(await readFile(canonicalPath, 'utf8'))
const existingPokemon = JSON.parse(await readFile(pokemonPath, 'utf8'))
if (canonical.audit.partial) throw new Error('O snapshot canônico está marcado como parcial')
if (canonical.pokedex.length !== canonical.audit.pokedex_found) throw new Error('Contagem da Pokédex não confere com a auditoria')
if (canonical.moves.length !== canonical.audit.all_moves_known_from_wiki) throw new Error('Contagem da Movedex não confere com a auditoria')
if (canonical.audit.movesets_found !== canonical.audit.movesets_expected) throw new Error('Movesets incompletos; dados existentes foram preservados')

const existingByName = new Map(existingPokemon.map((entry) => [normalize(entry.name), entry]))
const unmatched = canonical.pokedex.filter((entry) => !existingByName.has(normalize(entry.name)))
if (unmatched.length) throw new Error(`Pokémon sem registro-base para preservar ID/imagem: ${unmatched.map(({ name }) => name).join(', ')}`)

const movesByName = new Map(canonical.moves.map((move) => [normalize(move.name), move]))
const compatibleCountByMove = new Map(canonical.moves.map(({ name }) => [normalize(name), 0]))
let compatibleTmRecords = 0
for (const entry of canonical.pokedex) {
  if (!entry.has_moveset) continue
  const types = new Set(entry.types.map((type) => type.toLowerCase()))
  const explicitTms = new Set(entry.explicit_tms.map(normalize))
  const levelByMove = new Map()
  for (const move of entry.level_moves) {
    const key = normalize(move.name)
    levelByMove.set(key, Math.min(levelByMove.get(key) ?? Number.POSITIVE_INFINITY, move.level))
  }
  for (const move of canonical.moves) {
    const key = normalize(move.name)
    if (levelByMove.has(key) || explicitTms.has(key) || types.has(move.type.toLowerCase())) {
      compatibleCountByMove.set(key, compatibleCountByMove.get(key) + 1)
      compatibleTmRecords += 1
    }
  }
}

const pokemon = canonical.pokedex.map((entry) => {
  const existing = existingByName.get(normalize(entry.name))
  return {
    ...existing,
    localId: entry.local_id,
    name: entry.name,
    generation: entry.generation_number,
    region: titleCase(entry.generation),
    type: entry.types.join(' / '),
    eggGroup: entry.egg_group,
    baseExp: entry.base_exp,
    stats: entry.stats,
    hasMoveset: entry.has_moveset,
    levelMoves: entry.level_moves.map((move) => ({
      name: move.name,
      type: move.type,
      level: move.level,
    })),
    tmMoves: entry.explicit_tms.map((name) => {
      const move = movesByName.get(normalize(name))
      if (!move) throw new Error(`TM específica ausente da Movedex: ${entry.name} / ${name}`)
      return {
      name: move.name,
      type: move.type,
      level: null,
      }
    }),
  }
})

const moves = canonical.moves.map((move, index) => ({
  id: `TM-${String(index + 1).padStart(3, '0')}`,
  name: move.name,
  type: move.type,
  compatibleSpecies: compatibleCountByMove.get(normalize(move.name)) ?? 0,
}))

await writeFile(pokemonPath, `${JSON.stringify(pokemon, null, 2)}\n`)
await writeFile(tmPath, `${JSON.stringify(moves, null, 2)}\n`)
console.log(JSON.stringify({
  species: pokemon.length,
  levelMoves: pokemon.reduce((count, entry) => count + entry.levelMoves.length, 0),
  speciesWithMovesets: pokemon.filter((entry) => entry.levelMoves.length > 0).length,
  compatibleTmRecords,
  tmCatalog: moves.length,
  unmatched: unmatched.length,
}, null, 2))
