import { writeFile } from 'node:fs/promises'

const sources = [
  { url: 'https://pokehunt-wiki.gitbook.io/pokehunt-wiki/catalogos/regioes.md', stage: 'region', expected: 230 },
  { url: 'https://pokehunt-wiki.gitbook.io/pokehunt-wiki/catalogos/regioes/regioes-fim-de-jogo.md', stage: 'endgame', expected: 100 },
]

const biomeLabels = {
  floresta: 'Florestas',
  planicie: 'Planícies',
  mar: 'Mares',
  cidade: 'Cidades',
  santuario: 'Santuários',
  pantano: 'Pântanos',
  vulcao: 'Vulcões',
  caverna: 'Cavernas',
  montanha: 'Montanhas',
  torre: 'Torres',
}

const parseSpawns = (value, id) => {
  const spawns = [...value.matchAll(/([^,]+?)\s*\((\d+)\)/g)].map(([, name, weight]) => ({
    name: name.trim(),
    weight: Number(weight),
  }))
  const normalizedRoster = (text) => text.replace(/\s/g, '')
  if (!spawns.length || normalizedRoster(spawns.map((spawn) => `${spawn.name} (${spawn.weight})`).join(',')) !== normalizedRoster(value)) {
    throw new Error(`Roster de spawns inválido para ${id}: ${value}`)
  }
  return spawns
}

const catalogs = await Promise.all(sources.map(async ({ url, stage, expected }) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Falha ao consultar ${url}: ${response.status}`)
  const markdown = await response.text()
  const rows = markdown.split(/\r?\n/).filter((line) => /^\|\s+`[^`]+`\s+\|/.test(line))
  const entries = rows.map((line) => {
    const [, id, name, generation, level, tier, levelRange, exp, types, archetype, spawnText] = line.split('|').map((cell) => cell.trim())
    const regionId = id.replaceAll('`', '')
    const biome = regionId.split('_')[0]
    if (!biomeLabels[biome]) throw new Error(`Bioma desconhecido em ${regionId}`)
    return {
      id: regionId,
      name,
      biome,
      biomeLabel: biomeLabels[biome],
      generation: Number(generation),
      level: Number(level),
      tier: Number(tier),
      levelRange,
      exp: Number(exp),
      types: types.split(',').map((type) => type.trim()).filter(Boolean),
      archetype,
      stage: stage === 'region' ? 'region' : regionId.includes('_mega_') ? 'mega' : 'elite',
      spawns: parseSpawns(spawnText, regionId),
    }
  })
  if (entries.length !== expected) throw new Error(`Esperados ${expected} mapas em ${url}, encontrados ${entries.length}`)
  return entries
}))

const regions = catalogs.flat().sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name, 'pt-BR'))
const ids = new Set(regions.map(({ id }) => id))
if (ids.size !== regions.length) throw new Error('IDs de mapa duplicados entre os catálogos')

await writeFile('src/region-data.json', `${JSON.stringify(regions, null, 2)}\n`)
console.log(`Sincronizados ${regions.length} mapas: ${catalogs[0].length} regiões, ${catalogs[1].filter(({ stage }) => stage === 'elite').length} Elite e ${catalogs[1].filter(({ stage }) => stage === 'mega').length} Domínio Mega.`)