import { writeFile } from 'node:fs/promises'
import { load } from 'cheerio'

const sourceUrl = 'https://malpkhuntools.netlify.app/'
const response = await fetch(sourceUrl)
if (!response.ok) throw new Error(`Falha ao consultar ${sourceUrl}: ${response.status}`)

const $ = load(await response.text())
const marker = 'const TASK_RECOMMENDATIONS = '
const sourceScript = $('script').toArray()
  .map((script) => $(script).html() ?? '')
  .find((script) => script.includes(marker))
if (!sourceScript) throw new Error('Payload TASK_RECOMMENDATIONS não encontrado na página fonte')

const start = sourceScript.indexOf(marker) + marker.length
const end = sourceScript.indexOf(';', start)
if (end < start) throw new Error('Não foi possível delimitar o payload TASK_RECOMMENDATIONS')

const recommendations = JSON.parse(sourceScript.slice(start, end))
const entries = Object.values(recommendations)
const summary = entries.reduce((counts, entry) => {
  counts[entry.kind] = (counts[entry.kind] ?? 0) + 1
  counts.routes += entry.targets?.length ?? 0
  return counts
}, { routes: 0 })
const count = Object.keys(recommendations).length

if (count !== 198) throw new Error(`Esperadas 198 recomendações, encontradas ${count}`)
if (summary.capture !== 36 || summary.multi !== 90 || summary.weak !== 68 || summary.none !== 4) {
  throw new Error(`Categorias incompletas: ${JSON.stringify(summary)}`)
}
if (summary.routes !== 162) throw new Error(`Esperadas 162 rotas por Pokémon, encontradas ${summary.routes}`)

await writeFile('src/mission-recommendations.json', `${JSON.stringify(recommendations, null, 2)}\n`)
console.log(`Sincronizadas ${count} recomendações: ${summary.capture} capturas, ${summary.routes} rotas por Pokémon e ${summary.weak} hunts elementais (${summary.none} sem fraqueza aplicável).`)