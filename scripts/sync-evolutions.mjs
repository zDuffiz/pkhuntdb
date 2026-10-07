import { readFile, writeFile } from 'node:fs/promises'

const pokemonPath = 'src/pokemon-data.json'
const evolutionPath = 'src/evolution-data.json'
const speciesUrl = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv'
const aliases = {
  'Castform Fire': 'castform',
  'Castform Ice': 'castform',
  'Castform Water': 'castform',
  "Farfetch'd": 'farfetchd',
  'Nidoran Female': 'nidoran-f',
  'Nidoran Male': 'nidoran-m',
  Rhyperion: 'rhyperior',
}

function parseCsvLine(line) {
  const fields = []
  let field = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"'
        index += 1
      } else quoted = !quoted
    } else if (character === ',' && !quoted) {
      fields.push(field)
      field = ''
    } else field += character
  }

  fields.push(field)
  return fields
}

const pokemon = JSON.parse(await readFile(pokemonPath, 'utf8'))
const response = await fetch(speciesUrl)
if (!response.ok) throw new Error(`Falha ao baixar espécies PokeAPI: ${response.status}`)

const [headerLine, ...dataLines] = (await response.text()).trim().split(/\r?\n/)
const header = parseCsvLine(headerLine)
const column = Object.fromEntries(['id', 'identifier', 'evolves_from_species_id', 'evolution_chain_id'].map((name) => [name, header.indexOf(name)]))
if (Object.values(column).some((index) => index < 0)) throw new Error('CSV de espécies sem colunas de evolução esperadas')

const species = dataLines.map((line) => {
  const fields = parseCsvLine(line)
  return {
    id: Number(fields[column.id]),
    identifier: fields[column.identifier],
    parentId: Number(fields[column.evolves_from_species_id]) || null,
    chainId: Number(fields[column.evolution_chain_id]),
  }
})
const speciesById = new Map(species.map((entry) => [entry.id, entry]))
const speciesIdByName = new Map(species.map((entry) => [entry.identifier, entry.id]))
const localNamesBySpecies = new Map()
const unmatched = []

for (const entry of pokemon) {
  const baseName = entry.name.replace(/^Mega /, '').replace(/ [XY]$/, '')
  const identifier = aliases[entry.name] ?? baseName.toLowerCase().replaceAll(' ', '-').replaceAll('.', '')
  const speciesId = speciesIdByName.get(identifier)
  if (!speciesId) {
    unmatched.push(entry.name)
    continue
  }
  const names = localNamesBySpecies.get(speciesId) ?? []
  names.push(entry.name)
  localNamesBySpecies.set(speciesId, names)
}

if (unmatched.length) throw new Error(`Espécies sem vínculo evolutivo: ${unmatched.join(', ')}`)

const depthBySpecies = new Map()
function getDepth(entry) {
  const cachedDepth = depthBySpecies.get(entry.id)
  if (cachedDepth !== undefined) return cachedDepth
  const parent = entry.parentId ? speciesById.get(entry.parentId) : null
  const depth = parent && parent.chainId === entry.chainId ? getDepth(parent) + 1 : 0
  depthBySpecies.set(entry.id, depth)
  return depth
}

const namesByChain = new Map()
for (const entry of species) {
  const localNames = localNamesBySpecies.get(entry.id)
  if (!localNames) continue
  const stages = namesByChain.get(entry.chainId) ?? new Map()
  const stageNames = stages.get(getDepth(entry)) ?? []
  stageNames.push(...localNames)
  stages.set(getDepth(entry), stageNames)
  namesByChain.set(entry.chainId, stages)
}

const evolutionFamilies = [...namesByChain.values()]
  .map((stages) => [...stages.entries()]
    .sort(([first], [second]) => first - second)
    .map(([, names]) => [...new Set(names)]))

await writeFile(evolutionPath, `${JSON.stringify(evolutionFamilies, null, 2)}\n`)
console.log(JSON.stringify({ species: pokemon.length, families: evolutionFamilies.length, unmatched: unmatched.length }, null, 2))