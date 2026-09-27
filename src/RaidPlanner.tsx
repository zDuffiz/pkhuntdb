import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Pokemon } from './data'
import { technicalMoves } from './data'
import { getTypeMatchups } from './type-chart'

type RaidBoss = { name: string; type: string; generation: number; kind: 'Lendário' | 'Mega' }
type RaidStatus = 'loading' | 'ready' | 'error'
type DamageCandidate = {
  pokemon: Pokemon
  moveName: string
  moveType: string
  category: 'physical' | 'special'
  power: number
  effectiveness: number
  stab: boolean
  score: number
}

const legendaryRaidBosses: RaidBoss[] = [
  { name: 'Articuno', type: 'Ice', generation: 1, kind: 'Lendário' },
  { name: 'Zapdos', type: 'Electric', generation: 1, kind: 'Lendário' },
  { name: 'Moltres', type: 'Fire', generation: 1, kind: 'Lendário' },
  { name: 'Mewtwo', type: 'Psychic', generation: 1, kind: 'Lendário' },
  { name: 'Mew', type: 'Psychic', generation: 1, kind: 'Lendário' },
  { name: 'Raikou', type: 'Electric', generation: 2, kind: 'Lendário' },
  { name: 'Entei', type: 'Fire', generation: 2, kind: 'Lendário' },
  { name: 'Suicune', type: 'Ice', generation: 2, kind: 'Lendário' },
  { name: 'Lugia', type: 'Flying', generation: 2, kind: 'Lendário' },
  { name: 'Ho-oh', type: 'Water', generation: 2, kind: 'Lendário' },
  { name: 'Celebi', type: 'Grass', generation: 2, kind: 'Lendário' },
  { name: 'Kyogre', type: 'Ghost', generation: 3, kind: 'Lendário' },
  { name: 'Groudon', type: 'Ghost', generation: 3, kind: 'Lendário' },
  { name: 'Rayquaza', type: 'Ghost', generation: 3, kind: 'Lendário' },
  { name: 'Regirock', type: 'Rock', generation: 3, kind: 'Lendário' },
  { name: 'Regice', type: 'Ice', generation: 3, kind: 'Lendário' },
  { name: 'Registeel', type: 'Steel', generation: 3, kind: 'Lendário' },
  { name: 'Latias', type: 'Dragon', generation: 3, kind: 'Lendário' },
  { name: 'Latios', type: 'Dragon', generation: 3, kind: 'Lendário' },
  { name: 'Jirachi', type: 'Steel', generation: 3, kind: 'Lendário' },
  { name: 'Deoxys', type: 'Psychic', generation: 3, kind: 'Lendário' },
  { name: 'Uxie', type: 'Psychic', generation: 4, kind: 'Lendário' },
  { name: 'Mesprit', type: 'Psychic', generation: 4, kind: 'Lendário' },
  { name: 'Azelf', type: 'Psychic', generation: 4, kind: 'Lendário' },
  { name: 'Dialga', type: 'Steel', generation: 4, kind: 'Lendário' },
  { name: 'Palkia', type: 'Water', generation: 4, kind: 'Lendário' },
  { name: 'Giratina', type: 'Ghost', generation: 4, kind: 'Lendário' },
  { name: 'Heatran', type: 'Fire', generation: 4, kind: 'Lendário' },
  { name: 'Regigigas', type: 'Normal', generation: 4, kind: 'Lendário' },
  { name: 'Cresselia', type: 'Psychic', generation: 4, kind: 'Lendário' },
  { name: 'Phione', type: 'Water', generation: 4, kind: 'Lendário' },
  { name: 'Manaphy', type: 'Water', generation: 4, kind: 'Lendário' },
  { name: 'Darkrai', type: 'Dark', generation: 4, kind: 'Lendário' },
  { name: 'Shaymin', type: 'Grass', generation: 4, kind: 'Lendário' },
  { name: 'Arceus', type: 'Normal', generation: 4, kind: 'Lendário' },
  { name: 'Victini', type: 'Psychic', generation: 5, kind: 'Lendário' },
  { name: 'Cobalion', type: 'Steel', generation: 5, kind: 'Lendário' },
  { name: 'Terrakion', type: 'Rock', generation: 5, kind: 'Lendário' },
  { name: 'Virizion', type: 'Grass', generation: 5, kind: 'Lendário' },
  { name: 'Tornadus', type: 'Flying', generation: 5, kind: 'Lendário' },
  { name: 'Thundurus', type: 'Electric', generation: 5, kind: 'Lendário' },
  { name: 'Landorus', type: 'Ground', generation: 5, kind: 'Lendário' },
  { name: 'Reshiram', type: 'Dragon', generation: 5, kind: 'Lendário' },
  { name: 'Zekrom', type: 'Dragon', generation: 5, kind: 'Lendário' },
  { name: 'Kyurem', type: 'Dragon', generation: 5, kind: 'Lendário' },
  { name: 'Keldeo', type: 'Water', generation: 5, kind: 'Lendário' },
  { name: 'Meloetta', type: 'Normal', generation: 5, kind: 'Lendário' },
  { name: 'Genesect', type: 'Bug', generation: 5, kind: 'Lendário' },
]

const legendaryNames = new Set([...legendaryRaidBosses.map((boss) => boss.name), 'Xerneas', 'Yveltal', 'Zygarde', 'Diancie', 'Hoopa', 'Volcanion'])
const moveByName = new Map(technicalMoves.map((move) => [move.name, move]))
const typeNames: Record<string, string> = {
  Bug: 'Inseto', Dark: 'Sombrio', Dragon: 'Dragão', Electric: 'Elétrico', Fairy: 'Fada',
  Fighting: 'Lutador', Fire: 'Fogo', Flying: 'Voador', Ghost: 'Fantasma', Grass: 'Grama',
  Ground: 'Terra', Ice: 'Gelo', Normal: 'Normal', Poison: 'Veneno', Psychic: 'Psíquico',
  Rock: 'Pedra', Steel: 'Aço', Water: 'Água',
}
const typeColors: Record<string, string> = {
  Bug: '#698a31', Dark: '#59616e', Dragon: '#6556a5', Electric: '#a98516', Fairy: '#bd6688',
  Fighting: '#a64f43', Fire: '#c54d36', Flying: '#557cb9', Ghost: '#725394', Grass: '#49855e',
  Ground: '#987140', Ice: '#42899b', Normal: '#687988', Poison: '#94549b', Psychic: '#b64b7c',
  Rock: '#8e7356', Steel: '#5b7583', Water: '#3975b8',
}
const formatType = (type: string) => type.split(' / ').map((item) => typeNames[item] ?? item).join(' / ')
const formatMultiplier = (value: number) => `×${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`

function findBestAttack(pokemon: Pokemon, bossType: string): DamageCandidate | null {
  const effectivenessByType = new Map<string, number>(getTypeMatchups(bossType).map(({ type, multiplier }) => [type, multiplier]))
  const uniqueMoves = new Map([...pokemon.levelMoves, ...pokemon.tmMoves].map((move) => [move.name, move]))
  let bestAttack: DamageCandidate | null = null

  for (const learnedMove of uniqueMoves.values()) {
    const move = moveByName.get(learnedMove.name)
    if (!move || (move.attackCategory !== 'physical' && move.attackCategory !== 'special') || !move.power || move.range === 'Aposentado') continue

    const cooldown = Number.parseFloat(move.cooldown ?? '')
    if (!Number.isFinite(cooldown) || cooldown <= 0) continue

    const effectiveness = effectivenessByType.get(move.type) ?? 1
    if (effectiveness === 0) continue
    const stab = pokemon.type.split(' / ').includes(move.type)
    const offensiveStat = move.attackCategory === 'physical' ? pokemon.stats.attack : pokemon.stats.specialAttack
    const score = offensiveStat * move.power * effectiveness * (stab ? 1.5 : 1) / cooldown

    if (!bestAttack || score > bestAttack.score) {
      bestAttack = { pokemon, moveName: move.name, moveType: move.type, category: move.attackCategory, power: move.power, effectiveness, stab, score }
    }
  }

  return bestAttack
}

function typeChipStyle(type: string): CSSProperties {
  const color = typeColors[type] ?? '#52647b'
  return { borderColor: color, backgroundColor: `${color}18`, color }
}

export default function RaidPlanner({ pokemon, status }: { pokemon: Pokemon[]; status: RaidStatus }) {
  const [selectedBossName, setSelectedBossName] = useState('')
  const [isBossSuggestionsOpen, setIsBossSuggestionsOpen] = useState(false)
  const [highlightedBossIndex, setHighlightedBossIndex] = useState(-1)
  const megaBosses = useMemo(() => pokemon
    .filter((entry) => entry.form === 'Mega')
    .map((entry) => ({ name: entry.name, type: entry.type, generation: entry.generation, kind: 'Mega' as const }))
    .sort((first, second) => first.name.localeCompare(second.name)), [pokemon])
  const bosses = useMemo(() => [...legendaryRaidBosses, ...megaBosses], [megaBosses])
  const filteredBosses = useMemo(() => {
    const filter = selectedBossName.trim().toLocaleLowerCase()
    return filter ? bosses.filter((boss) => boss.name.toLocaleLowerCase().includes(filter)) : bosses
  }, [bosses, selectedBossName])
  const activeBoss = bosses.find((boss) => boss.name.toLocaleLowerCase() === selectedBossName.trim().toLocaleLowerCase())
  const rankedPokemon = useMemo(() => {
    if (!activeBoss || status !== 'ready') return []
    return pokemon
      .filter((entry) => !legendaryNames.has(entry.name))
      .map((entry) => findBestAttack(entry, activeBoss.type))
      .filter((entry): entry is DamageCandidate => entry !== null)
      .sort((first, second) => second.score - first.score || first.pokemon.name.localeCompare(second.pokemon.name))
  }, [activeBoss, pokemon, status])
  const bestElements = activeBoss
    ? getTypeMatchups(activeBoss.type).filter((entry) => entry.multiplier > 1).sort((first, second) => second.multiplier - first.multiplier || first.type.localeCompare(second.type))
    : []
  const maxScore = rankedPokemon[0]?.score ?? 0
  const tiers = [
    { name: 'SS', range: '90%+ do maior score', min: 0.9, max: Number.POSITIVE_INFINITY },
    { name: 'S', range: '75–90%', min: 0.75, max: 0.9 },
    { name: 'A', range: '60–75%', min: 0.6, max: 0.75 },
  ] as const
  const chooseBoss = (name: string) => {
    setSelectedBossName(name)
    setIsBossSuggestionsOpen(false)
    setHighlightedBossIndex(-1)
  }
  const handleBossKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && filteredBosses.length) {
      event.preventDefault()
      setIsBossSuggestionsOpen(true)
      setHighlightedBossIndex((current) => (current + 1) % filteredBosses.length)
    } else if (event.key === 'ArrowUp' && filteredBosses.length) {
      event.preventDefault()
      setIsBossSuggestionsOpen(true)
      setHighlightedBossIndex((current) => current <= 0 ? filteredBosses.length - 1 : current - 1)
    } else if (event.key === 'Enter') {
      if (highlightedBossIndex >= 0 && filteredBosses[highlightedBossIndex]) {
        event.preventDefault()
        chooseBoss(filteredBosses[highlightedBossIndex].name)
      } else if (filteredBosses.length === 1) {
        event.preventDefault()
        chooseBoss(filteredBosses[0].name)
      } else if (activeBoss) {
        setIsBossSuggestionsOpen(false)
      }
    } else if (event.key === 'Escape') {
      setIsBossSuggestionsOpen(false)
      setHighlightedBossIndex(-1)
    }
  }

  return <div className="raid-screen">
    <header className="raid-screen-heading">
      <div><p className="raid-eyebrow">CATÁLOGO DE BOSSES</p><h1>RAIDS</h1></div>
      <span className="raid-pool-count">48 lendários <b>+</b> {megaBosses.length} Megas</span>
    </header>

    <section className="raid-controls" aria-label="Selecionar boss">
      <div className="raid-boss-field">
        <label htmlFor="raid-boss-input">Boss ativo na janela</label>
        <div className="raid-boss-picker">
          <div className="search raid-boss-search"><Search size={16} aria-hidden="true" /><input id="raid-boss-input" type="text" role="combobox" aria-autocomplete="list" aria-expanded={isBossSuggestionsOpen} aria-controls="raid-boss-suggestions" aria-activedescendant={highlightedBossIndex >= 0 ? `raid-boss-option-${highlightedBossIndex}` : undefined} value={selectedBossName} onFocus={() => setIsBossSuggestionsOpen(true)} onBlur={() => setIsBossSuggestionsOpen(false)} onChange={(event) => { setSelectedBossName(event.target.value); setHighlightedBossIndex(-1); setIsBossSuggestionsOpen(true) }} onKeyDown={handleBossKeyDown} disabled={status === 'loading'} placeholder="Digite o nome do boss..." autoComplete="off" /></div>
          {isBossSuggestionsOpen && <div className="raid-boss-suggestions" id="raid-boss-suggestions" role="listbox" aria-label="Bosses disponíveis">
            {filteredBosses.length ? (['Lendário', 'Mega'] as const).map((kind) => {
              const group = filteredBosses.filter((boss) => boss.kind === kind)
              if (!group.length) return null
              return <div className="raid-boss-suggestion-group" key={kind}>
                <span>{kind === 'Mega' ? `Megas (${group.length})` : `Lendários (${group.length})`}</span>
                {group.map((boss) => {
                  const index = filteredBosses.findIndex((entry) => entry.name === boss.name)
                  return <button type="button" role="option" aria-selected={index === highlightedBossIndex} className="raid-boss-suggestion" id={`raid-boss-option-${index}`} key={boss.name} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseBoss(boss.name)}>
                    <strong>{boss.name}</strong><small>{kind} · {formatType(boss.type)}</small>
                  </button>
                })}
              </div>
            }) : <p className="raid-boss-no-suggestions">Nenhum boss encontrado.</p>}
          </div>}
        </div>
      </div>
      <p className="raid-schedule-note">A agenda varia por dia. Use o boss indicado no lobby.</p>
    </section>

    {!activeBoss ? <p className="raid-empty">Selecione um boss ativo para ver os matchups e as recomendações.</p> : <>
      <section className="raid-boss-summary" aria-label={`Boss selecionado: ${activeBoss.name}`}>
        <div><span className={`raid-boss-kind raid-boss-kind-${activeBoss.kind === 'Mega' ? 'mega' : 'legendary'}`}>{activeBoss.kind}</span><h2>{activeBoss.name}</h2></div>
        <span className="raid-boss-type" style={typeChipStyle(activeBoss.type)}>Elemento {formatType(activeBoss.type)}</span>
      </section>

      <section className="raid-elements-section" aria-labelledby="raid-elements-title">
        <div className="raid-section-heading"><h2 id="raid-elements-title">Melhores elementos</h2><span>contra {activeBoss.name}</span></div>
        <div className="raid-element-list">{bestElements.map((element) => <span className="raid-element-chip" style={typeChipStyle(element.type)} key={element.type}><strong>{formatType(element.type)}</strong><b>{formatMultiplier(element.multiplier)}</b></span>)}</div>
      </section>

      {status !== 'ready' ? <p className="raid-empty">Carregando o roster da Pokédex...</p> : <>
        <div className="raid-tier-heading"><h2>Pokémon de maior dano</h2><span>{rankedPokemon.length} opções sem lendários</span></div>
        <div className="raid-tier-list">{tiers.map((tier) => {
          const candidates = rankedPokemon.filter((entry) => maxScore > 0 && entry.score / maxScore >= tier.min && entry.score / maxScore < tier.max).slice(0, 5)
          return <section className="raid-tier" data-tier={tier.name} key={tier.name}>
            <header className="raid-tier-header"><strong>{tier.name}</strong><span>{tier.range}</span></header>
            <div className="raid-candidate-list">{candidates.length ? candidates.map((candidate) => <article className="raid-candidate" key={candidate.pokemon.name}>
              <img src={candidate.pokemon.image} alt="" loading="lazy" />
              <div className="raid-candidate-info"><strong>{candidate.pokemon.name}</strong><span>{candidate.moveName} · {formatType(candidate.moveType)} · {candidate.power} poder</span></div>
              <div className="raid-candidate-score"><b>{Math.round(candidate.score / maxScore * 100)}%</b><span>{formatMultiplier(candidate.effectiveness)}{candidate.stab ? ' STAB' : ''}</span></div>
            </article>) : <p className="raid-tier-empty">Sem candidatos nesta faixa.</p>}</div>
          </section>
        })}</div>
        <p className="raid-method-note">Estimativa relativa: stat ofensivo × potência × STAB × efetividade ÷ cooldown. Assume mesmo nível; não inclui IVs, nível de TM, selos, Ascensão ou bônus temporários.</p>
      </>}
    </>}
  </div>
}