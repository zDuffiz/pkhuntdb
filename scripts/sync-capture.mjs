import { writeFile } from 'node:fs/promises'

const sourceUrl = 'https://pokehunt-wiki.gitbook.io/pokehunt-wiki/catalogos/taxas-de-captura.md'
const markdown = await (await fetch(sourceUrl)).text()
const entries = []

for (const line of markdown.split('\n')) {
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
  if (cells.length !== 4 || !cells[0].startsWith('**')) continue

  const name = cells[0].replace(/^\*\*|\*\*$/g, '').trim()
  const hardness = Number(cells[1].replace(/[^0-9]/g, ''))
  if (!name || !Number.isFinite(hardness)) continue

  entries.push({ name, hardness, range: cells[2], recommendedBall: cells[3] })
}

if (entries.length < 500) throw new Error(`Esperadas pelo menos 500 espécies capturáveis, encontradas ${entries.length}`)
await writeFile('src/capture-data.json', `${JSON.stringify(entries, null, 2)}\n`)
console.log(`Sincronizadas ${entries.length} taxas de captura da PokeHunt Wiki`)