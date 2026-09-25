import { readFile, writeFile } from 'node:fs/promises'

const pokemonPath = 'src/pokemon-data.json'
const tmPath = 'src/tm-data.json'
const headers = { 'user-agent': 'pkhuntdb-data-sync/1.0' }

const normalize = (value) => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[.:'’♀♂]/g, '')
  .replace(/[-_]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const decode = (value) => String(value)
  .replace(/&nbsp;/g, ' ')
  .replace(/&mdash;|&#8212;/g, '—')
  .replace(/&amp;/g, '&')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const textCells = (row) => [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => decode(match[1]))
const numberOrNull = (value) => {
  const number = Number.parseInt(String(value).replace(/[^0-9]/g, ''), 10)
  return Number.isFinite(number) ? number : null
}

function parseTmRows(html) {
  const headingMatch = html.match(/<h3[^>]*>\s*Moves learnt by TM\s*<\/h3>/i)
  if (!headingMatch || headingMatch.index === undefined) return []
  const start = headingMatch.index + headingMatch[0].length
  const nextHeadingOffset = html.slice(start).search(/<h[23][^>]*>/i)
  const section = html.slice(start, nextHeadingOffset >= 0 ? start + nextHeadingOffset : html.length)
  return [...section.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]).flatMap((row) => {
    const moveMatch = row.match(/<a[^>]+href="\/move\/[^"#]+"[^>]*>([^<]+)<\/a>/i)
    if (!moveMatch) return []
    const cells = textCells(row)
    const typeMatch = row.match(/href="\/type\/[^"#]+"[^>]*>([^<]+)</i)
    const categoryMatch = row.match(/(?:alt|title)="(Physical|Special|Status)"/i)
    const name = decode(moveMatch[1])
    const category = categoryMatch?.[1] ?? (cells.find((cell) => /^(Physical|Special|Status)$/i.test(cell)) ?? 'Status')
    return [{
      name,
      type: typeMatch ? decode(typeMatch[1]) : 'Normal',
      power: numberOrNull(cells.find((cell) => /^\d+$/.test(cell)) ?? ''),
      category,
    }]
  })
}

async function fetchPage(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, { headers })
    if (response.ok) return response.text()
    if (attempt === 3) throw new Error(`${response.status} ${url}`)
  }
}

const pokemon = JSON.parse(await readFile(pokemonPath, 'utf8'))
const tmCatalog = JSON.parse(await readFile(tmPath, 'utf8'))
const nationalHtml = await fetchPage('https://pokemondb.net/pokedex/all')
const national = new Map([...nationalHtml.matchAll(/href="\/pokedex\/([^"/]+)"[^>]*>([^<]+)<\/a>/gi)]
  .map((match) => [normalize(match[2]), match[1]]))
const aliases = new Map([
  ['nidoran female', 'nidoran'],
  ['nidoran male', 'nidoran'],
  ['mr mime', 'mr mime'],
  ['mime jr', 'mime jr'],
  ['flabebe', 'flabebe'],
])
const directSlugs = new Map([
  ['nidoran female', 'nidoran-female'],
  ['nidoran male', 'nidoran-male'],
  ['rhyperion', 'rhyperior'],
])

const baseName = (name) => name.replace(/^Mega /, '').replace(/\s(?:X|Y|Fire|Ice|Water|Sky|Origin|Attack|Defense|Speed|Therian|Resolute|Ash|Galar|Alola|Hisui)$/i, '')
const slugFor = (entry) => {
  const direct = directSlugs.get(normalize(entry.name))
  if (direct) return direct
  const base = national.get(aliases.get(normalize(baseName(entry.name))) ?? normalize(baseName(entry.name)))
  if (!base) return null
  if (entry.name.startsWith('Mega ')) {
    const suffix = entry.name.match(/\s(X|Y)$/i)?.[1]
    return `${base}/mega${suffix ? `-${suffix.toLowerCase()}` : ''}`
  }
  return base
}

const urls = new Map()
for (const entry of pokemon) {
  const slug = slugFor(entry)
  if (slug) urls.set(slug, `https://pokemondb.net/pokedex/${slug}`)
}

const results = new Map()
const queue = [...urls.entries()]
async function worker() {
  while (queue.length) {
    const [slug, url] = queue.shift()
    try {
      results.set(slug, parseTmRows(await fetchPage(url)))
    } catch {
      results.set(slug, [])
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))

const catalogByName = new Map(tmCatalog.map((move) => [normalize(move.name), move]))
let speciesChanged = 0
let tmAdded = 0
let catalogAdded = 0
let pagesWithMoves = 0

for (const entry of pokemon) {
  const rows = results.get(slugFor(entry)) ?? []
  if (rows.length) pagesWithMoves += 1
  const existing = new Set([...entry.levelMoves, ...entry.tmMoves].map((move) => normalize(move.name)))
  let changed = false
  for (const move of rows) {
    const key = normalize(move.name)
    if (existing.has(key)) continue
    entry.tmMoves.push({ name: move.name, type: move.type, power: move.power, cooldown: '—', level: null })
    existing.add(key)
    tmAdded += 1
    changed = true
    if (!catalogByName.has(key)) {
      const category = move.category.toLowerCase()
      const technicalMove = {
        id: `TM-${String(tmCatalog.length + catalogAdded + 1).padStart(3, '0')}`,
        name: move.name,
        type: move.type,
        power: move.power,
        cooldown: '—',
        category: move.category,
        attackCategory: category === 'physical' ? 'physical' : category === 'special' ? 'special' : 'status',
        range: 'Alvo único',
        isArea: false,
        chest: '—',
      }
      tmCatalog.push(technicalMove)
      catalogByName.set(key, technicalMove)
      catalogAdded += 1
    }
  }
  if (changed) speciesChanged += 1
}

await writeFile(pokemonPath, `${JSON.stringify(pokemon, null, 2)}\n`)
await writeFile(tmPath, `${JSON.stringify(tmCatalog, null, 2)}\n`)
console.log(JSON.stringify({ species: pokemon.length, pagesWithMoves, speciesChanged, tmAdded, catalogAdded, pages: results.size }, null, 2))
