import { readFile, writeFile } from 'node:fs/promises'
import { load } from 'cheerio'

const tmPath = 'src/tm-data.json'
const sourceUrl = 'https://pokemondb.net/move/all'
const rangeUrl = 'https://pokehunt-wiki.gitbook.io/pokehunt-wiki/catalogos/moves.md'
const normalize = (value) => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’]/g, "'")
  .replace(/♀/g, ' female')
  .replace(/♂/g, ' male')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const response = await fetch(sourceUrl, { headers: { 'user-agent': 'PKHuntAtlas/1.0' } })
if (!response.ok) throw new Error(`Falha ao consultar ${sourceUrl}: ${response.status}`)

const $ = load(await response.text())
const categoriesByName = new Map()
$('td.cell-name').each((_, cell) => {
  const row = $(cell).closest('tr')
  const name = $(cell).find('a').first().text().trim()
  const category = row.find('td.cell-icon.text-center').first().attr('data-sort-value')
  if (name && ['physical', 'special', 'status'].includes(category)) categoriesByName.set(normalize(name), category)
})

const rangeResponse = await fetch(rangeUrl)
if (!rangeResponse.ok) throw new Error(`Falha ao consultar ${rangeUrl}: ${rangeResponse.status}`)
const rangesByName = new Map()
const moveStatsByName = new Map()
for (const line of (await rangeResponse.text()).split(/\r?\n/)) {
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
  if (cells.length < 6 || !cells[0].includes('**')) continue
  const name = cells[0].replace(/\*\*/g, '').trim()
  const powerText = cells[2].replace(/\*\*/g, '').trim()
  const cooldown = cells[3].replace(/\*\*/g, '').trim()
  const range = cells[5].replace(/\*\*/g, '').trim()
  const power = powerText === '—' ? null : Number(powerText)
  if (!name || !cooldown || (power !== null && !Number.isFinite(power))) continue
  moveStatsByName.set(normalize(name), { power, cooldown })
  if (['Área', 'Só em si', 'Alvo único', 'Time', 'Aposentado'].includes(range)) rangesByName.set(normalize(name), range)
}

const catalog = JSON.parse(await readFile(tmPath, 'utf8'))
if (catalog.length !== 360) throw new Error(`Esperados 360 golpes, encontrados ${catalog.length}`)
const missing = catalog.filter((move) => !categoriesByName.has(normalize(move.name)) || !rangesByName.has(normalize(move.name)) || !moveStatsByName.has(normalize(move.name))).map(({ name }) => name)
if (missing.length) throw new Error(`Sem categoria, alcance, dano ou cooldown para ${missing.length} golpes: ${missing.join(', ')}`)

const counts = { physical: 0, special: 0, status: 0 }
const ranges = { 'Área': 0, 'Só em si': 0, 'Alvo único': 0, 'Time': 0, 'Aposentado': 0 }
for (const move of catalog) {
  move.attackCategory = categoriesByName.get(normalize(move.name))
  move.range = rangesByName.get(normalize(move.name))
  Object.assign(move, moveStatsByName.get(normalize(move.name)))
  counts[move.attackCategory] += 1
  ranges[move.range] += 1
}

await writeFile(tmPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(JSON.stringify({ moves: catalog.length, withoutDirectDamage: catalog.filter((move) => move.power === null).length, categories: counts, ranges }, null, 2))
