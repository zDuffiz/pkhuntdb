import { readFile, writeFile } from 'node:fs/promises'
import vm from 'node:vm'

const pokemonPath = 'src/pokemon-data.json'
const tmPath = 'src/tm-data.json'
const sourceUrl = 'https://pkhunttools.github.io/data/moves-v6.19.1.js'
const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.:'’]/g, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

const response = await fetch(sourceUrl)
if (!response.ok) throw new Error(`Falha ao baixar ${sourceUrl}: ${response.status}`)
const source = await response.text()
const context = {}
context.window = context
vm.runInNewContext(`${source}\nthis.value = PKHuntMovesData`, context)
const cooldowns = new Map(Object.values(context.value).map((move) => [normalize(move.name), move.cooldown]))
const pokemon = JSON.parse(await readFile(pokemonPath, 'utf8'))
const tmCatalog = JSON.parse(await readFile(tmPath, 'utf8'))
let pokemonUpdated = 0
let tmCatalogUpdated = 0
let unresolvedPokemon = 0
let unresolvedCatalog = 0

function fillMove(move) {
  if (move.cooldown && move.cooldown !== '—') return false
  const cooldown = cooldowns.get(normalize(move.name))
  if (!cooldown || cooldown === '—') return false
  move.cooldown = cooldown
  return true
}

for (const entry of pokemon) {
  for (const move of [...entry.levelMoves, ...entry.tmMoves]) {
    if (fillMove(move)) pokemonUpdated += 1
    else if (!move.cooldown || move.cooldown === '—') unresolvedPokemon += 1
  }
}
for (const move of tmCatalog) {
  if (fillMove(move)) tmCatalogUpdated += 1
  else if (!move.cooldown || move.cooldown === '—') unresolvedCatalog += 1
}

await writeFile(pokemonPath, `${JSON.stringify(pokemon, null, 2)}\n`)
await writeFile(tmPath, `${JSON.stringify(tmCatalog, null, 2)}\n`)
console.log(JSON.stringify({ pokemonUpdated, tmCatalogUpdated, unresolvedPokemon, unresolvedCatalog, sourceMoves: cooldowns.size }, null, 2))
