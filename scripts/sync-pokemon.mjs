import { mkdir, writeFile } from 'node:fs/promises'

const pages = [
  ['Kanto', 1, 'kanto'], ['Johto', 2, 'johto'], ['Hoenn', 3, 'hoenn'],
  ['Sinnoh', 4, 'sinnoh'], ['Unova', 5, 'unova'], ['Kalos', 6, 'kalos'],
]
const accents = ['#8bcf87', '#ef986c', '#80b9dc', '#e5c95a', '#d59ab6', '#bd9bdb', '#83c8b1', '#d79e72']
const numberFrom = (value) => Number(value.replace(/[^0-9.-]/g, '')) || 0
const normalize = (value) => value.toLowerCase().replace('nidoran female', 'nidoran♀').replace('nidoran male', 'nidoran♂').replace(/\s+/g, ' ').trim()
const baseName = (value) => value.replace(/^Mega /, '').replace(/\s(?:X|Y|Fire|Ice|Water|Sky|Origin|Attack|Defense|Speed|Therian|Resolute|Ash|Galar|Alola|Hisui)$/i, '')
const aliases = { rhyperion: 'rhyperior', flabebe: 'flabébé' }
const imageSlugFor = (name, nationalSlug) => {
  if (!name.startsWith('Mega ')) return nationalSlug
  const megaName = name.replace(/^Mega /, '').toLowerCase().replace(/\s+/g, '-')
  const variant = megaName.match(/^(.*)-(x|y)$/)
  return variant ? `${variant[1]}-mega-${variant[2]}` : `${megaName}-mega`
}
const nationalHtml = await (await fetch('https://pokemondb.net/pokedex/national')).text()
const nationalNumbers = new Map([...nationalHtml.matchAll(/<small>#(\d+)<\/small><br>\s*<a class="ent-name" href="\/pokedex\/([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((match) => [normalize(match[3]), { id: Number(match[1]), slug: match[2] }]))
const movesets = new Map()
const moveCatalog = []
const catalog = []

for (let part = 1; part <= 19; part += 1) {
  const markdown = await (await fetch(`https://pokehunt-wiki.gitbook.io/pokehunt-wiki/catalogos/movesets/parte-${String(part).padStart(2, '0')}.md`)).text()
  let currentName = ''
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^###\s+(.+)$/)
    if (heading) {
      currentName = heading[1].trim()
      if (!movesets.has(normalize(currentName))) movesets.set(normalize(currentName), { levelMoves: [], tmMoves: [] })
      continue
    }
    if (!currentName) continue
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    if (cells.length < 5 || !(/^(?:\d+|TM)$/.test(cells[0])) || !cells[1].includes('**')) continue
    const move = { name: cells[1].replace(/\*\*/g, '').trim(), type: cells[2], power: numberFrom(cells[3]) || null, cooldown: cells[4] }
    movesets.get(normalize(currentName))[cells[0] === 'TM' ? 'tmMoves' : 'levelMoves'].push({ ...move, level: cells[0] === 'TM' ? null : numberFrom(cells[0]) })
  }
}

const movedex = await (await fetch('https://pokehunt-wiki.gitbook.io/pokehunt-wiki/catalogos/moves.md')).text()
const areaMoves = await (await fetch('https://pokehunt-wiki.gitbook.io/pokehunt-wiki/combate/tms-de-area.md')).text()
const moveDatabase = await (await fetch('https://pokemondb.net/move/all')).text()
const moveCategories = new Map([...moveDatabase.matchAll(/<td class="cell-name"><a[^>]*>([^<]+)<\/a><\/td>[\s\S]*?<td class="cell-icon text-center" data-sort-value="(physical|special|status)"/g)].map((match) => [match[1].trim(), match[2]]))
const areaChest = new Map([...areaMoves.matchAll(/^\|\s*\*\*([^|]+)\*\*\s*\|[^|]+\|[^|]+\|[^|]+\|\s*([^|]+)\|$/gm)].map((match) => [match[1].trim(), match[2].trim()]))
for (const line of movedex.split('\n')) {
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
  if (cells.length < 6 || !cells[0].includes('**') || cells[0].includes('Golpe')) continue
  const name = cells[0].replace(/\*\*/g, '').trim()
  const range = cells[5]
  moveCatalog.push({ id: `TM-${String(moveCatalog.length + 1).padStart(3, '0')}`, name, type: cells[1], power: numberFrom(cells[2]) || null, cooldown: cells[3], category: cells[4], attackCategory: moveCategories.get(name) ?? (cells[4].includes('Status') ? 'status' : 'special'), range, isArea: range.includes('Área'), chest: areaChest.get(name) ?? '—' })
}
if (moveCatalog.length !== 360) throw new Error(`Esperados 360 golpes, encontrados ${moveCatalog.length}`)

for (const [region, generation, slug] of pages) {
  const markdown = await (await fetch(`https://pokehunt-wiki.gitbook.io/pokehunt-wiki/catalogos/pokedex/${slug}.md`)).text()
  for (const line of markdown.split('\n')) {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    if (cells.length < 12 || !/^\d+$/.test(cells[0]) || !cells[1].includes('**')) continue
    const localId = numberFrom(cells[0])
    const name = cells[1].replace(/\*\*/g, '').trim()
    const form = name.startsWith('Mega ') ? 'Mega' : /\s(?:Fire|Ice|Water|Sky|Origin|Attack|Defense|Speed|Therian|Resolute|Ash|Galar|Alola|Hisui)$/i.test(name) ? 'Forma' : 'Base'
    const national = nationalNumbers.get(aliases[normalize(baseName(name))] ?? normalize(baseName(name)))
    if (!national) throw new Error(`Número nacional não encontrado para ${name}`)
    const speciesMoves = movesets.get(normalize(name)) ?? { levelMoves: [], tmMoves: [] }
    const imageSlug = imageSlugFor(name, national.slug)
    catalog.push({ id: national.id, localId, name, generation, region, type: cells[3], eggGroup: cells[11], baseExp: numberFrom(cells[10]), stats: { hp: numberFrom(cells[4]), attack: numberFrom(cells[5]), defense: numberFrom(cells[6]), specialAttack: numberFrom(cells[7]), specialDefense: numberFrom(cells[8]), speed: numberFrom(cells[9]) }, form, accent: accents[national.id % accents.length], image: `https://img.pokemondb.net/sprites/home/normal/${imageSlug}.png`, ...speciesMoves })
  }
}

if (catalog.length !== 747) throw new Error(`Esperadas 747 espécies, encontradas ${catalog.length}`)
await mkdir('src', { recursive: true })
await writeFile('src/pokemon-data.json', `${JSON.stringify(catalog, null, 2)}\n`)
await writeFile('src/tm-data.json', `${JSON.stringify(moveCatalog, null, 2)}\n`)
console.log(`Sincronizadas ${catalog.length} espécies da PokeHunt Wiki`)
