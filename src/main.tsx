import React, { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BookOpen, Calculator, ClipboardList, Crosshair, ExternalLink, MapPin, Radio, ScrollText, Search, Swords } from 'lucide-react'
import { captureRates, loadPokemon, moveDex, pokemonFallback, technicalMoves, type CaptureEntry, type Move, type MoveDexEntry, type Pokemon } from './data'
import { clanMissions, clanNames, type ClanMission } from './mission-data'
import { getTypeMatchups } from './type-chart'
import './styles.css'
import './image-overrides.css'
import './detail-overrides.css'
import './matchup-overrides.css'
import './pokedex-overrides.css'
import './tm-overrides.css'
import './theme-overrides.css'
import './joy-theme.css'
import './missions.css'

const legacyAreaTms = [
  ['Flash Cannon', 'Steel', 80, '15s', 3, '7,1%'], ['Iron Tail', 'Steel', 90, '18s', 1, '3,6%'],
  ['Bubble', 'Water', 40, '8s', 3, '7,7%'], ['Surf', 'Water', 90, '15s', 3, '2,6%'], ['Muddy Water', 'Water', 90, '30s', 3, '2,6%'], ['Water Spout', 'Water', 150, '30s', 3, '2,6%'],
  ['Twister', 'Dragon', 40, '12s', 3, '13,0%'], ['Dragon Pulse', 'Dragon', 80, '15s', 3, '8,7%'], ['Draco Meteor', 'Dragon', 140, '30s', 3, '4,3%'],
  ['Discharge', 'Electric', 80, '18s', 4, '7,1%'], ['Thunder', 'Electric', 110, '30s', 3, '3,6%'],
  ['Dazzling Gleam', 'Fairy', 80, '15s', 10, '12,5%'], ['Play Rough', 'Fairy', 90, '18s', 1, '6,3%'], ['Moonblast', 'Fairy', 95, '25s', 3, '6,3%'],
  ['Shadow Ball', 'Ghost', 80, '15s', 10, '6,5%'], ['Phantom Force', 'Ghost', 90, '30s', 1, '3,2%'],
  ['Incinerate', 'Fire', 60, '20s', 3, '8,8%'], ['Lava Plume', 'Fire', 80, '18s', 3, '5,9%'], ['Eruption', 'Fire', 150, '30s', 3, '2,9%'],
  ['Powder Snow', 'Ice', 40, '12s', 3, '12,0%'], ['Icy Wind', 'Ice', 55, '12s', 3, '12,0%'], ['Blizzard', 'Ice', 110, '30s', 3, '4,0%'],
  ['Struggle Bug', 'Bug', 50, '11s', 3, '11,1%'], ['Signal Beam', 'Bug', 75, '15s', 3, '7,4%'], ['Bug Buzz', 'Bug', 90, '15s', 4, '3,7%'],
  ['Aura Sphere', 'Fighting', 80, '15s', 3, '3,5%'], ['Cross Chop', 'Fighting', 100, '30s', 1, '1,8%'],
  ['Swift', 'Normal', 60, '11s', 10, '1,9%'], ['Razor Wind', 'Normal', 80, '20s', 4, '1,3%'], ['Hyper Voice', 'Normal', 90, '18s', 3, '0,6%'], ['Boomburst', 'Normal', 140, '30s', 3, '0,6%'], ['Self-Destruct', 'Normal', 200, '120s', 1, '0,6%'],
  ['Rock Slide', 'Rock', 75, '15s', 10, '9,1%'], ['Stone Edge', 'Rock', 100, '30s', 10, '4,5%'],
  ['Razor Leaf', 'Grass', 55, '10s', 10, '7,5%'], ['Seed Bomb', 'Grass', 80, '15s', 3, '5,0%'], ['Frenzy Plant', 'Grass', 150, '30s', 3, '2,5%'],
  ['Psyshock', 'Psychic', 80, '15s', 3, '3,8%'], ['Zen Headbutt', 'Psychic', 80, '15s', 1, '3,8%'], ['Psychic', 'Psychic', 90, '30s', 3, '1,9%'],
  ['Dark Pulse', 'Dark', 80, '15s', 3, '6,7%'], ['Crunch', 'Dark', 80, '15s', 1, '6,7%'], ['Night Daze', 'Dark', 95, '25s', 3, '3,3%'],
  ['Bulldoze', 'Ground', 60, '18s', 1, '8,3%'], ['Magnitude', 'Ground', 71, '18s', 1, '5,6%'], ['Earthquake', 'Ground', 100, '30s', 1, '2,8%'],
  ['Acid', 'Poison', 40, '10s', 10, '7,7%'], ['Sludge Wave', 'Poison', 95, '25s', 3, '2,6%'],
  ['Air Cutter', 'Flying', 60, '18s', 3, '9,1%'], ['Air Slash', 'Flying', 75, '15s', 3, '6,1%'], ['Hurricane', 'Flying', 110, '30s', 3, '3,0%'],
].map(([name, type, power, cooldown, range, chest], index) => ({ id: `TM-A${String(index + 1).padStart(2, '0')}`, name: name as string, type: type as string, category: 'Área', power: String(power), accuracy: `${range} casas`, cooldown: cooldown as string, chest: chest as string }))
const tms = technicalMoves
const typeLabels: Record<string, string> = { Normal: 'Normal', Fire: 'Fogo', Water: 'Água', Electric: 'Elétrico', Grass: 'Planta', Ice: 'Gelo', Fighting: 'Lutador', Poison: 'Veneno', Ground: 'Terra', Flying: 'Voador', Psychic: 'Psíquico', Bug: 'Inseto', Rock: 'Pedra', Ghost: 'Fantasma', Dragon: 'Dragão', Dark: 'Sombrio', Steel: 'Aço', Fairy: 'Fada' }
const typeLabel = (type: string) => typeLabels[type] ?? type
const typeListLabel = (types: string) => types.split(' / ').map(typeLabel).join(' / ')
const attackCategoryLabel = (category: string) => category === 'physical' ? 'FÍSICO' : category === 'special' ? 'ESPECIAL ATAQUE' : 'STATUS'
const attackCategoryIcon = (category: string) => category === 'physical' ? '●' : category === 'special' ? '✦' : '○'
const moveAttackLabel = (category: string) => category === 'physical' ? 'Físico' : category === 'special' ? 'Especial Ataque' : 'Status'

function App() { return <Atlas /> }

function Atlas() {
  const [view, setView] = useState<'pokemon' | 'tms' | 'captures' | 'movedex' | 'missions' | 'calculator' | 'detail'>('pokemon')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Pokemon>(pokemonFallback[0])
  const [pokemon, setPokemon] = useState<Pokemon[]>(pokemonFallback)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [region, setRegion] = useState('Todas Regiões')
  const [megaFilter, setMegaFilter] = useState('Todas as formas')
  const [sort, setSort] = useState('Ordem A-Z')
  const [tmType, setTmType] = useState('Todos os tipos')
  const [tmRange, setTmRange] = useState('Todos os alcances')
  const [tmSort, setTmSort] = useState('Nome (A-Z)')
  const [captureRange, setCaptureRange] = useState('Todas as faixas')
  const [captureSort, setCaptureSort] = useState('Nome (A-Z)')
  const [moveSource, setMoveSource] = useState('Todas as origens')
  const [moveSort, setMoveSort] = useState('Nome (A-Z)')

  useEffect(() => {
    loadPokemon().then((entries) => {
      setPokemon(entries)
      setSelected(entries[0])
      setStatus('ready')
    }).catch(() => setStatus('error'))
  }, [])

  const filteredPokemon = useMemo(() => [...pokemon]
    .filter((entry) => region === 'Todas Regiões' || entry.region === region)
    .filter((entry) => megaFilter === 'Todas as formas' || entry.form === 'Mega')
    .filter((entry) => `${entry.name} ${entry.type} ${entry.eggGroup} ${entry.region}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'Ordem A-Z' ? a.name.localeCompare(b.name) : a.id - b.id), [pokemon, query, region, megaFilter, sort])
  const filteredTms = useMemo(() => [...tms]
    .filter((entry) => tmType === 'Todos os tipos' || entry.type === tmType)
    .filter((entry) => tmRange === 'Todos os alcances' || (tmRange === 'Área' ? entry.isArea : !entry.isArea))
    .filter((entry) => `${entry.id} ${entry.name} ${entry.type} ${entry.range}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => tmSort === 'Poder (maior)' ? (b.power ?? 0) - (a.power ?? 0) : tmSort === 'Cooldown (menor)' ? Number.parseFloat(a.cooldown) - Number.parseFloat(b.cooldown) : a.name.localeCompare(b.name)), [query, tmRange, tmSort, tmType])
  const filteredCaptures = useMemo(() => [...captureRates]
    .filter((entry) => captureRange === 'Todas as faixas' || entry.range === captureRange)
    .filter((entry) => `${entry.name} ${entry.range} ${entry.recommendedBall}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => captureSort === 'Dureza (menor)' ? a.hardness - b.hardness : captureSort === 'Dureza (maior)' ? b.hardness - a.hardness : a.name.localeCompare(b.name)), [captureRange, captureSort, query])
  const filteredMoveDex = useMemo(() => [...moveDex]
    .filter((entry) => moveSource === 'Todas as origens' || (moveSource === 'Por nível' ? entry.learnedByLevel > 0 : entry.learnedByTm))
    .filter((entry) => `${entry.name} ${entry.type} ${entry.category} ${entry.range}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => moveSort === 'Poder (maior)' ? (b.power ?? 0) - (a.power ?? 0) : moveSort === 'Recarga (menor)' ? Number.parseFloat(a.cooldown) - Number.parseFloat(b.cooldown) : a.name.localeCompare(b.name)), [moveSource, moveSort, query])
  const captureRanges = [...new Set(captureRates.map((entry) => entry.range))]
  const regions = ['Todas Regiões', ...new Set(pokemon.map((entry) => entry.region))]

  function changeView(nextView: typeof view) {
    setQuery('')
    setView(nextView)
  }

  function openPokemon(entry: Pokemon) {
    setSelected(entry)
    changeView('detail')
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><BookOpen size={30} strokeWidth={2.4} /><img src="https://img.pokemondb.net/sprites/home/normal/pikachu.png" alt="" /></span><span>PK HUNT<br /><b>DATABASE</b></span></div>
        <p className="eyebrow">GUIA DO TREINADOR</p>
        <nav>
          <button aria-label="Pokedex" className={view === 'pokemon' || view === 'detail' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('pokemon')}><BookOpen size={18} /> <span>Pokedex</span> <strong>{pokemon.length}</strong></button>
          <button aria-label="TMs" className={view === 'tms' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('tms')}><ScrollText size={18} /> <span>TMs</span> <strong>{tms.length}</strong></button>
          <button aria-label="Capturas" className={view === 'captures' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('captures')}><Crosshair size={18} /> <span>Capturas</span> <strong>{captureRates.length}</strong></button>
          <button aria-label="MoveDex" hidden className={view === 'movedex' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('movedex')}><Swords size={18} /> <span>MoveDex</span> <strong>{moveDex.length}</strong></button>
          <button aria-label="Missões" className={view === 'missions' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('missions')}><ClipboardList size={18} /> <span>Missões</span> <strong>{clanMissions.length}</strong></button>
          <button aria-label="Calculadora" className={view === 'calculator' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('calculator')}><Calculator size={18} /> <span>Calculadora</span> <strong>6</strong></button>
        </nav>
        <div className="sidebar-foot"><span className="status-dot" /> {status === 'ready' ? 'Dados prontos para explorar' : status === 'error' ? 'Modo offline' : 'Buscando dados da wiki'}<br /><small>Uma jornada PokeHunt</small><br /><small>Auditoria, criado por zDuffi</small></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><p className="kicker">PK HUNT DATABASE / CENTRAL DE TREINADORES</p><h1>{view === 'detail' ? selected.name : view === 'pokemon' ? 'Sua Pokédex' : view === 'tms' ? 'Golpes & TMs' : view === 'captures' ? 'Taxas de Captura' : view === 'calculator' ? 'Calculadora de Status' : view === 'missions' ? 'Missões de Clã' : 'MoveDex'}</h1></div><div className="topbar-actions"><a className="live-link" href="https://www.twitch.tv/zduffi" target="_blank" rel="noreferrer"><Radio size={16} /> <span>LIVE NA TWITCH</span><ExternalLink size={13} /></a><div className="version">{view === 'captures' ? captureRates.length : view === 'movedex' ? moveDex.length : view === 'missions' ? clanMissions.length : view === 'calculator' ? '6' : status === 'ready' ? '747' : '...'} {view === 'calculator' ? 'ATRIBUTOS' : 'REGISTROS'} <span>WIKI</span></div></div></header>
        {view === 'detail' ? <PokemonDetail selected={selected} onBack={() => changeView('pokemon')} /> : view === 'calculator' ? <><PokemonCalculator entries={pokemon} /><PokemonComparison entries={pokemon} /></> : <>
          <div className="toolbar"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'pokemon' ? 'Encontre um Pokémon, tipo ou região...' : view === 'tms' ? 'Qual golpe você procura?' : view === 'captures' ? 'Pesquise uma espécie ou Ball...' : 'Pesquise um golpe, tipo ou categoria...'} /></label>{view === 'pokemon' ? <><select aria-label="Filtrar por região" value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filtrar por forma" value={megaFilter} onChange={(event) => setMegaFilter(event.target.value)}><option>Todas as formas</option><option>Apenas Megas</option></select><select aria-label="Ordenar Pokémon" value={sort} onChange={(event) => setSort(event.target.value)}><option>Nome (A-Z)</option><option>Ordem Pokédex</option></select></> : view === 'tms' ? <><select aria-label="Filtrar TMs por tipo" value={tmType} onChange={(event) => setTmType(event.target.value)}><option>Todos os tipos</option>{[...new Set(tms.map((item) => item.type))].sort().map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select><select aria-label="Filtrar TMs por alcance" value={tmRange} onChange={(event) => setTmRange(event.target.value)}><option>Todos os alcances</option><option>Área</option><option>Alvo único</option></select><select aria-label="Ordenar TMs" value={tmSort} onChange={(event) => setTmSort(event.target.value)}><option>Nome (A-Z)</option><option>Poder (maior)</option><option>Recarga (menor)</option></select></> : view === 'captures' ? <><select aria-label="Filtrar por faixa" value={captureRange} onChange={(event) => setCaptureRange(event.target.value)}><option>Todas as faixas</option>{captureRanges.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Ordenar capturas" value={captureSort} onChange={(event) => setCaptureSort(event.target.value)}><option>Nome (A-Z)</option><option>Dureza (menor)</option><option>Dureza (maior)</option></select></> : <><select aria-label="Filtrar origem do golpe" value={moveSource} onChange={(event) => setMoveSource(event.target.value)}><option>Todas as origens</option><option>Por nível</option><option>Por TM</option></select><select aria-label="Ordenar MoveDex" value={moveSort} onChange={(event) => setMoveSort(event.target.value)}><option>Nome (A-Z)</option><option>Poder (maior)</option><option>Recarga (menor)</option></select></>}</div>
          {view === 'pokemon' ? <PokemonList entries={filteredPokemon} selected={selected} status={status} sort={sort} onSelect={openPokemon} /> : view === 'tms' ? <TmTable items={filteredTms} /> : view === 'captures' ? <CaptureTable items={filteredCaptures} pokemon={pokemon} /> : view === 'missions' ? <MissionBoard items={clanMissions} /> : <MoveDexTable items={filteredMoveDex} />}
        </>}
      </section>
    </main>
  )
}

function MissionBoard({ items }: { items: ClanMission[] }) {
  const [query, setQuery] = useState('')
  const [selectedClan, setSelectedClan] = useState('Todos os clãs')
  const colors: Record<string, string> = { bug: '#567d1f', dark: '#4c4657', dragon: '#6345a7', electric: '#987200', fairy: '#9c3a8a', fighting: '#a34331', fire: '#b54625', flying: '#5375a8', ghost: '#5b4a8c', grass: '#3e7627', ground: '#89632c', ice: '#327880', normal: '#5b626a', poison: '#724087', psychic: '#a63162', rock: '#74612a', steel: '#4d6275', water: '#2b5c9a' }
  const getElementKey = (element: string) => (element.split('/').at(-1) ?? element).trim().toLowerCase()
  const getElementColor = (element: string) => colors[getElementKey(element)] ?? '#173b9b'
  const getElementName = (element: string) => element.split(' / ')[0]
  const normalizedQuery = query.trim().toLowerCase()
  const matches = items.filter((mission) => (selectedClan === 'Todos os clãs' || mission.clan === selectedClan)
    && `${mission.clan} ${mission.element} ${mission.name} ${mission.kind} ${mission.description} ${mission.part}`.toLowerCase().includes(normalizedQuery))
  const visibleClans = selectedClan === 'Todos os clãs' ? clanNames : [selectedClan]
  const elementByClan = new Map(clanNames.map((clan) => [clan, items.find((mission) => mission.clan === clan)?.element ?? '']))
  const hardnessByName = new Map(captureRates.map((entry) => [entry.name, entry.hardness]))
  const selectedElement = elementByClan.get(selectedClan) ?? ''
  const groups = visibleClans.map((clan) => ({
    clan,
    missions: matches.filter((mission) => mission.clan === clan),
  })).filter((group) => group.missions.length > 0)
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

  return <section className="mission-board">
    <div className="mission-controls">
      <label className="mission-search"><Search size={18} /><input aria-label="Buscar missões" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar missão, clã ou elemento..." /></label>
      <label className="mission-filter" style={{ '--element-color': selectedElement ? getElementColor(selectedElement) : '#2764e7' } as React.CSSProperties}>
        <span className="mission-filter-swatch" aria-hidden="true" />
        <select aria-label="Filtrar missões por clã" value={selectedClan} onChange={(event) => setSelectedClan(event.target.value)}>
          <option value="Todos os clãs">Todos os clãs</option>
          {clanNames.map((clan) => {
            const element = elementByClan.get(clan) ?? ''
            return <option key={clan} value={clan} style={{ color: getElementColor(element) }}>{clan} · {element}</option>
          })}
        </select>
      </label>
      <span className="mission-count">{matches.length} de {items.length} missões</span>
    </div>
    {groups.length ? <div className="mission-groups">{groups.map((group) => <details className="mission-group" key={group.clan} open={selectedClan !== 'Todos os clãs' || normalizedQuery.length > 0} style={{ '--element-color': getElementColor(group.missions[0].element) } as React.CSSProperties}>
      <summary><span className="mission-group-title"><strong>Missões de {getElementName(group.missions[0].element)}</strong><span className="mission-group-subline"><span className="mission-element-badge">{group.missions[0].element}</span><span className="mission-clan-name">{group.clan}</span></span></span><span className="mission-group-summary-count">{group.missions.length} missões</span></summary>
      <div className="mission-list">{group.missions.map((mission) => <article className="mission-card" key={mission.id}>
        <div className="mission-card-header" style={{ '--element-color': getElementColor(mission.element) } as React.CSSProperties}><div><span className="mission-part">Parte {mission.part}</span><h3>{mission.name}</h3></div><span className="mission-tier">Tier {mission.tier}</span></div>
        <div className="mission-tags"><span>{mission.kind}</span><span>Nível mín. {mission.minimumLevel ?? '—'}</span><span className="mission-element-chip" style={{ '--element-color': getElementColor(mission.element) } as React.CSSProperties}>{mission.element}</span></div>
        <p className="mission-description">{mission.kind === 'Captura' ? <>Capturar <strong>{formatNumber(mission.target)}</strong> Pokémon do tipo <strong>{mission.element}</strong>.</> : mission.kind === 'Contrato específico' ? <>Derrotar os Pokémon específicos desta etapa até completar <strong>{formatNumber(mission.target)} abates</strong>.</> : <>Derrotar <strong>{formatNumber(mission.target)} Pokémon</strong> fracos ao elemento <strong>{mission.element}</strong>.</>}</p>
        <dl className="mission-rewards"><div><dt>Gold</dt><dd>{formatNumber(mission.gold)}</dd></div><div><dt>XP</dt><dd>{formatNumber(mission.experience)}</dd></div><div><dt>Token</dt><dd>{formatNumber(mission.tokens)}</dd></div><div><dt>Pontos do clã</dt><dd>{formatNumber(mission.clanPoints)}</dd></div></dl>
        <MissionAdvice recommendation={mission.recommendation} hardnessByName={hardnessByName} />
      </article>)}</div>
    </details>)}</div> : <p className="mission-empty">Nenhuma missão encontrada.</p>}
  </section>
}

function MissionAdvice({ recommendation, hardnessByName }: { recommendation: ClanMission['recommendation']; hardnessByName: ReadonlyMap<string, number> }) {
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)
  const formatExpected = (value: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const formatChance = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 }).format(value)
  const summary = recommendation.kind === 'capture' ? 'Ver melhor mapa e dureza' : recommendation.kind === 'multi' ? 'Ver mapa de cada Pokémon' : recommendation.kind === 'weak' ? 'Ver melhor mapa elemental' : 'Ver recomendação'
  const pokemon = recommendation.pokemon ?? []
  const totalChance = pokemon.reduce((total, entry) => total + entry.chance, 0)
  const averageCaptureHardness = totalChance ? pokemon.reduce((total, entry) => total + (hardnessByName.get(entry.name) ?? entry.media ?? 0) * entry.chance, 0) / totalChance : recommendation.avgMedia

  return <details className="mission-advice">
    <summary><MapPin size={15} />{summary}</summary>
    <div className="mission-advice-content">
      <h4>{recommendation.title ?? 'Sem recomendação'}</h4>
      {recommendation.kind === 'none' ? <p className="mission-advice-empty">{recommendation.message}</p> : recommendation.kind === 'multi' ? <>
        {recommendation.singleHunt ? <div className="advice-single-map"><span>Todos os alvos nesta hunt</span><strong>{recommendation.singleHunt.hunt}</strong><small>{recommendation.singleHunt.regionId} · nível {recommendation.singleHunt.level}</small></div> : <p className="advice-route-note">Os alvos ficam melhor distribuídos entre estas hunts:</p>}
        <div className="advice-routes">{recommendation.targets?.map((target) => <div className="advice-route" key={`${target.species}-${target.regionId}`}>
          <div><strong>{target.species}</strong><span>{formatNumber(target.required)} abates</span></div>
          <div><strong>{target.hunt}</strong><small>{target.regionId} · nível {target.level}</small></div>
          <div><span>{formatChance(target.chance)} de chance</span><small>{formatExpected(target.expected)} / {target.spawnCount} spawns</small></div>
        </div>)}</div>
      </> : <>
        <div className="advice-best-map"><div><span>Melhor mapa</span><strong>{recommendation.hunt}</strong><small>{recommendation.regionId}</small></div><div><strong>Nível {recommendation.level}</strong><strong>{formatChance(recommendation.chance ?? 0)} de chance</strong><small><strong>{formatExpected(recommendation.expected ?? 0)}</strong> / {recommendation.spawnCount} spawns</small></div></div>
        {recommendation.kind === 'capture' && averageCaptureHardness !== undefined && <p className="advice-average-hardness">Dureza média pela aba Capturas: <strong>{formatExpected(averageCaptureHardness)}</strong></p>}
        <div className="advice-pokemon-list">{pokemon.map((entry) => <div className="advice-pokemon" key={entry.name}>
          <div><strong>{entry.name}</strong><span>{entry.types.map((type) => typeLabel(type.charAt(0).toUpperCase() + type.slice(1))).join(' / ')}</span></div>
          <span><strong>{formatChance(entry.chance)}</strong> · <strong>{formatExpected(entry.expected)}</strong> / {recommendation.spawnCount} spawns</span>
          {recommendation.kind === 'capture' && (hardnessByName.get(entry.name) ?? entry.media) !== undefined && <strong>Dureza Capturas: {formatNumber(hardnessByName.get(entry.name) ?? entry.media ?? 0)}</strong>}
          {recommendation.kind === 'weak' && entry.eff !== undefined && <strong>Efetividade: ×{entry.eff}</strong>}
        </div>)}</div>
      </>}
    </div>
  </details>
}

type ComparisonAttribute = 'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed'
type ComparisonProfile = { name: string; level: number; rarity: string; category: string; stars: number; bond: number; nature: string; ivs: Record<ComparisonAttribute, number | ''>; evs: Record<ComparisonAttribute, number | ''> }

function PokemonComparison({ entries }: { entries: Pokemon[] }) {
  const attributes: Array<{ key: ComparisonAttribute; label: string }> = [{ key: 'hp', label: 'PS' }, { key: 'attack', label: 'Ataque' }, { key: 'defense', label: 'Defesa' }, { key: 'specialAttack', label: 'Ataque Especial' }, { key: 'specialDefense', label: 'Defesa Especial' }, { key: 'speed', label: 'Velocidade' }]
  const rarityMultipliers: Record<string, number> = { Comum: 1, Incomum: 1.03, Raro: 1.06, Épico: 1.1, Prismático: 1.15, Mítico: 1.21, Astral: 1.28, Divino: 1.36 }
  const categoryMultipliers: Record<string, number> = { Nenhuma: 1, Fundador: 1.5, Shiny: 1.45, Gênesis: 1.42 }
  const natureEffects: Record<string, { up: ComparisonAttribute | null; down: ComparisonAttribute | null }> = { Hardy: { up: null, down: null }, Lonely: { up: 'attack', down: 'defense' }, Brave: { up: 'attack', down: 'speed' }, Adamant: { up: 'attack', down: 'specialAttack' }, Naughty: { up: 'attack', down: 'specialDefense' }, Bold: { up: 'defense', down: 'attack' }, Docile: { up: null, down: null }, Relaxed: { up: 'defense', down: 'speed' }, Impish: { up: 'defense', down: 'specialAttack' }, Lax: { up: 'defense', down: 'specialDefense' }, Modest: { up: 'specialAttack', down: 'attack' }, Mild: { up: 'specialAttack', down: 'defense' }, Quiet: { up: 'specialAttack', down: 'speed' }, Bashful: { up: null, down: null }, Rash: { up: 'specialAttack', down: 'specialDefense' }, Calm: { up: 'specialDefense', down: 'attack' }, Gentle: { up: 'specialDefense', down: 'defense' }, Sassy: { up: 'specialDefense', down: 'speed' }, Quirky: { up: null, down: null }, Careful: { up: 'specialDefense', down: 'specialAttack' }, Timid: { up: 'speed', down: 'attack' }, Hasty: { up: 'speed', down: 'defense' }, Jolly: { up: 'speed', down: 'specialAttack' }, Naive: { up: 'speed', down: 'specialDefense' }, Serious: { up: null, down: null } }
  const zeroValues = { hp: '', attack: '', defense: '', specialAttack: '', specialDefense: '', speed: '' } as Record<ComparisonAttribute, number | ''>
  const createProfile = (name: string): ComparisonProfile => ({ name, level: 100, rarity: 'Comum', category: 'Nenhuma', stars: 0, bond: 0, nature: 'Hardy', ivs: { ...zeroValues }, evs: { ...zeroValues } })
  const [profiles, setProfiles] = useState([createProfile(entries[0]?.name ?? ''), createProfile(entries[1]?.name ?? entries[0]?.name ?? '')])
  const [openComparisonSearch, setOpenComparisonSearch] = useState<number | null>(null)
  const selected = profiles.map((profile) => entries.find((entry) => entry.name === profile.name) ?? entries[0])
  const calculate = (profile: ComparisonProfile, entry: Pokemon | undefined) => { const effect = natureEffects[profile.nature] ?? natureEffects.Hardy; const bondMultiplier = profile.bond >= 100 ? 1.06 : profile.bond >= 75 ? 1.03 : 1; const multiplier = rarityMultipliers[profile.rarity] * categoryMultipliers[profile.category] * bondMultiplier * (1 + profile.stars * 0.04); return Object.fromEntries(attributes.map(({ key }) => { const base = entry?.stats[key] ?? 0; const core = Math.floor(((2 * base * multiplier + (Number(profile.ivs[key]) || 0) + Math.floor((Number(profile.evs[key]) || 0) / 4)) * profile.level) / 100); const natureMultiplier = key === 'hp' || effect.up === null ? 1 : effect.up === key ? 1.1 : effect.down === key ? 0.9 : 1; return [key, key === 'hp' ? core + profile.level + 10 : Math.floor((core + 5) * natureMultiplier)] })) as Record<ComparisonAttribute, number> }
  const results = profiles.map((profile, index) => calculate(profile, selected[index]))
  const updateProfile = (index: number, patch: Partial<ComparisonProfile>) => setProfiles((current) => current.map((profile, profileIndex) => profileIndex === index ? { ...profile, ...patch } : profile))
  const updateTraining = (index: number, group: 'ivs' | 'evs', key: ComparisonAttribute, value: string) => {
    setProfiles((current) => current.map((profile, profileIndex) => {
      if (profileIndex !== index) return profile
      if (value === '') return { ...profile, [group]: { ...profile[group], [key]: '' } }
      const numericValue = Number(value) || 0
      if (group === 'ivs') return { ...profile, ivs: { ...profile.ivs, [key]: Math.min(31, numericValue) } }
      const used = attributes.reduce((total, item) => item.key === key ? total : total + (Number(profile.evs[item.key]) || 0), 0)
      return { ...profile, evs: { ...profile.evs, [key]: Math.min(252, numericValue, Math.max(0, 510 - used)) } }
    }))
  }
  const profileCard = (profile: ComparisonProfile, index: number) => <article className="comparison-card" key={index}><div className="comparison-title"><span>POKÉMON {index + 1}</span><strong>{selected[index]?.name}</strong></div><label className="comparison-search">Buscar Pokémon<div className="pokemon-autocomplete"><input placeholder="Digite o nome do Pokémon..." value={profile.name} onFocus={() => setOpenComparisonSearch(index)} onChange={(event) => { updateProfile(index, { name: event.target.value }); setOpenComparisonSearch(index) }} onBlur={() => setTimeout(() => setOpenComparisonSearch(null), 120)} />{openComparisonSearch === index && <div className="pokemon-suggestions">{entries.filter((entry) => entry.name.toLowerCase().includes(profile.name.toLowerCase())).slice(0, 8).map((entry) => <button type="button" key={`${index}-${entry.region}-${entry.name}`} onMouseDown={() => { updateProfile(index, { name: entry.name }); setOpenComparisonSearch(null) }}><strong>{entry.name}</strong><small>{entry.region} · {entry.type.split(' / ').map(typeLabel).join(' / ')}</small></button>)}</div>}</div></label><div className="comparison-options"><label>Nível<input type="number" min="1" max="1000" value={profile.level} onChange={(event) => updateProfile(index, { level: Math.min(1000, Math.max(1, Number(event.target.value) || 1)) })} /></label><label>Natureza<select value={profile.nature} onChange={(event) => updateProfile(index, { nature: event.target.value })}>{Object.keys(natureEffects).map((item) => <option key={item}>{item}</option>)}</select></label><label>Raridade<select value={profile.rarity} onChange={(event) => updateProfile(index, { rarity: event.target.value })}>{Object.keys(rarityMultipliers).map((item) => <option key={item}>{item}</option>)}</select></label><label>Categoria<select value={profile.category} onChange={(event) => updateProfile(index, { category: event.target.value })}>{Object.keys(categoryMultipliers).map((item) => <option key={item}>{item}</option>)}</select></label><label>Estrelas<select value={profile.stars} onChange={(event) => updateProfile(index, { stars: Number(event.target.value) })}>{[0, 1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label><label>Laço<select value={profile.bond} onChange={(event) => updateProfile(index, { bond: Number(event.target.value) })}><option value="0">0%</option><option value="25">25%</option><option value="75">75%</option><option value="100">100%</option></select></label></div><div className="comparison-training">{attributes.map(({ key, label }) => <div className="comparison-training-row" key={key}><strong>{label}</strong><label>IV<input type="number" min="0" max="31" value={profile.ivs[key]} onChange={(event) => updateTraining(index, 'ivs', key, event.target.value)} /></label><label>EV<input type="number" min="0" max="252" value={profile.evs[key]} onChange={(event) => updateTraining(index, 'evs', key, event.target.value)} /></label></div>)}</div><div className="comparison-result"><img src={selected[index]?.image} alt={selected[index]?.name} /><div className="comparison-stats">{attributes.map(({ key, label }) => <div key={key}><small>{label}</small><strong>{results[index][key]}</strong></div>)}</div></div></article>
  return <section className="comparison-section"><div className="comparison-section-heading"><div><small>COMPARAÇÃO COMPLETA</small><strong>Dois Pokémon lado a lado</strong></div><span>MESMAS REGRAS DA CALCULADORA</span></div><div className="comparison-grid">{profiles.map(profileCard)}</div></section>
}

function PokemonCalculator({ entries }: { entries: Pokemon[] }) {
  const [selectedName, setSelectedName] = useState(entries[0]?.name ?? '')
  const [showPokemonSuggestions, setShowPokemonSuggestions] = useState(false)
  const [level, setLevel] = useState(100)
  const [rarity, setRarity] = useState('Comum')
  const [seal, setSeal] = useState('Nenhum')
  const [stars, setStars] = useState(0)
  const [bond, setBond] = useState(0)
  const [nature, setNature] = useState('Hardy')
  const [ivs, setIvs] = useState<Record<'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed', number | ''>>({ hp: '', attack: '', defense: '', specialAttack: '', specialDefense: '', speed: '' })
  const [evs, setEvs] = useState<Record<'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed', number | ''>>({ hp: '', attack: '', defense: '', specialAttack: '', specialDefense: '', speed: '' })
  const selected = entries.find((entry) => entry.name === selectedName) ?? entries[0]
  const pokemonSuggestions = entries.filter((entry) => entry.name.toLowerCase().includes(selectedName.toLowerCase())).slice(0, 8)
  const rarityMultipliers: Record<string, number> = { Comum: 1, Incomum: 1.03, Raro: 1.06, Épico: 1.1, Prismático: 1.15, Mítico: 1.21, Astral: 1.28, Divino: 1.36 }
  const sealMultipliers: Record<string, number> = { Nenhum: 1, Fundador: 1.5, Shiny: 1.45, Gênesis: 1.42 }
  const natureEffects: Record<string, { up: keyof typeof ivs | null; down: keyof typeof ivs | null }> = {
    Hardy: { up: null, down: null }, Lonely: { up: 'attack', down: 'defense' }, Brave: { up: 'attack', down: 'speed' }, Adamant: { up: 'attack', down: 'specialAttack' }, Naughty: { up: 'attack', down: 'specialDefense' },
    Bold: { up: 'defense', down: 'attack' }, Docile: { up: null, down: null }, Relaxed: { up: 'defense', down: 'speed' }, Impish: { up: 'defense', down: 'specialAttack' }, Lax: { up: 'defense', down: 'specialDefense' },
    Modest: { up: 'specialAttack', down: 'attack' }, Mild: { up: 'specialAttack', down: 'defense' }, Quiet: { up: 'specialAttack', down: 'speed' }, Bashful: { up: null, down: null }, Rash: { up: 'specialAttack', down: 'specialDefense' },
    Calm: { up: 'specialDefense', down: 'attack' }, Gentle: { up: 'specialDefense', down: 'defense' }, Sassy: { up: 'specialDefense', down: 'speed' }, Quirky: { up: null, down: null }, Careful: { up: 'specialDefense', down: 'specialAttack' },
    Timid: { up: 'speed', down: 'attack' }, Hasty: { up: 'speed', down: 'defense' }, Jolly: { up: 'speed', down: 'specialAttack' }, Naive: { up: 'speed', down: 'specialDefense' }, Serious: { up: null, down: null },
  }
  const effect = natureEffects[nature]
  const bondMultiplier = bond >= 100 ? 1.06 : bond >= 75 ? 1.03 : 1
  const totalMultiplier = rarityMultipliers[rarity] * sealMultipliers[seal] * bondMultiplier * (1 + stars * 0.04)
  const attributeLabels: Record<keyof typeof ivs, string> = { hp: 'PS', attack: 'Ataque', defense: 'Defesa', specialAttack: 'Ataque Especial', specialDefense: 'Defesa Especial', speed: 'Velocidade' }
  const calculatedStats = Object.keys(attributeLabels).reduce((result, key) => {
    const statKey = key as keyof typeof ivs
    const base = selected?.stats[statKey] ?? 0
    const core = Math.floor(((2 * base * totalMultiplier + (Number(ivs[statKey]) || 0) + Math.floor((Number(evs[statKey]) || 0) / 4)) * level) / 100)
    const natureMultiplier = statKey === 'hp' || effect.up === null ? 1 : effect.up === statKey ? 1.1 : effect.down === statKey ? 0.9 : 1
    result[statKey] = statKey === 'hp' ? core + level + 10 : Math.floor((core + 5) * natureMultiplier)
    return result
  }, {} as Record<keyof typeof ivs, number>)
  const updateValue = (group: 'ivs' | 'evs', key: keyof typeof ivs, value: string) => {
    const numericValue = Math.max(0, Number(value) || 0)
    if (group === 'ivs') setIvs((current) => ({ ...current, [key]: value === '' ? '' : Math.min(31, numericValue) }))
    else setEvs((current) => {
      if (value === '') return { ...current, [key]: '' }
      const otherEvs = Object.entries(current).reduce((total, [statKey, statValue]) => statKey === key ? total : total + (Number(statValue) || 0), 0)
      return { ...current, [key]: Math.min(252, numericValue, Math.max(0, 510 - otherEvs)) }
    })
  }
  return <div className="calculator-screen"><div className="calculator-intro"><strong>Calculadora de Status</strong><span>Use a fórmula da wiki para simular um indivíduo completo. Raridade e selos multiplicam os atributos base; IVs, EVs, nível e natureza completam a conta.</span></div><div className="calculator-layout"><section className="calculator-controls"><div className="calculator-field pokemon-search-field"><span>Pokémon</span><div className="pokemon-autocomplete"><input aria-label="Buscar Pokémon" placeholder="Digite o nome do Pokémon..." value={selectedName} onFocus={() => setShowPokemonSuggestions(true)} onChange={(event) => { setSelectedName(event.target.value); setShowPokemonSuggestions(true) }} onBlur={() => setTimeout(() => setShowPokemonSuggestions(false), 120)} />{showPokemonSuggestions && <div className="pokemon-suggestions">{pokemonSuggestions.length ? pokemonSuggestions.map((entry) => <button type="button" key={`${entry.region}-${entry.name}`} onMouseDown={() => { setSelectedName(entry.name); setShowPokemonSuggestions(false) }}><strong>{entry.name}</strong><small>{entry.region} · {entry.type.split(' / ').map(typeLabel).join(' / ')}</small></button>) : <p>Nenhum Pokémon encontrado</p>}</div>}</div></div><div className="calculator-grid"><label className="calculator-field"><span>Nível</span><input type="number" min="1" max="1000" value={level} onChange={(event) => setLevel(Math.min(1000, Math.max(1, Number(event.target.value) || 1)))} /></label><label className="calculator-field"><span>Natureza</span><select value={nature} onChange={(event) => setNature(event.target.value)}>{Object.keys(natureEffects).map((item) => <option key={item}>{item}</option>)}</select></label><label className="calculator-field"><span>Raridade</span><select value={rarity} onChange={(event) => setRarity(event.target.value)}>{Object.keys(rarityMultipliers).map((item) => <option key={item}>{item}</option>)}</select></label><label className="calculator-field"><span>Selo</span><select value={seal} onChange={(event) => setSeal(event.target.value)}>{Object.keys(sealMultipliers).map((item) => <option key={item}>{item}</option>)}</select></label><label className="calculator-field"><span>Estrelas</span><select value={stars} onChange={(event) => setStars(Number(event.target.value))}>{[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="calculator-field"><span>Laço</span><select value={bond} onChange={(event) => setBond(Number(event.target.value))}><option value="0">0%</option><option value="25">25%</option><option value="75">75%</option><option value="100">100%</option></select></label></div><div className="training-heading"><span>Atributo</span><span>IV / DNA</span><span>EV / TREINO</span></div><div className="training-grid">{Object.keys(attributeLabels).map((key) => { const statKey = key as keyof typeof ivs; return <div className="training-row" key={key}><strong>{attributeLabels[statKey]}</strong><label className="training-input"><small>IV</small><input aria-label={`IV ${attributeLabels[statKey]}`} type="number" min="0" max="31" value={ivs[statKey]} onChange={(event) => updateValue('ivs', statKey, event.target.value)} /></label><label className="training-input"><small>EV</small><input aria-label={`EV ${attributeLabels[statKey]}`} type="number" min="0" max="252" value={evs[statKey]} onChange={(event) => updateValue('evs', statKey, event.target.value)} /></label></div> })}</div></section><section className="calculator-results"><div className="result-heading"><div className="result-identity"><img src={selected?.image} alt={selected?.name} /><div><small>{selected?.name}</small><strong>ATRIBUTOS FINAIS</strong></div></div><span>×{totalMultiplier.toFixed(2)}</span></div><div className="result-grid">{Object.keys(attributeLabels).map((key) => { const statKey = key as keyof typeof ivs; return <div className="result-stat" key={key}><small>{attributeLabels[statKey]}</small><strong>{calculatedStats[statKey]}</strong><span style={{ width: `${Math.min(100, calculatedStats[statKey] / 2.55)}%` }} /></div> })}</div><div className="calculator-formula"><b>Camadas aplicadas</b><span>Raridade × Selo × Laço × Estrelas</span><span>{rarity} × {seal} × {bond >= 100 ? 'Laço 100% (+6%)' : bond >= 75 ? 'Laço 75% (+3%)' : 'Laço base'} × {stars} estrelas</span></div></section></div></div>
}

function PokemonList({ entries, selected, status, sort, onSelect }: { entries: Pokemon[]; selected: Pokemon; status: string; sort: string; onSelect: (entry: Pokemon) => void }) {
  return <div className="pokedex-list"><div className="panel-heading"><span>REGISTROS / {entries.length}{status === 'loading' && ' · carregando...'}</span><span className="sort">{sort === 'Ordem A-Z' ? 'A-Z' : 'DEX'} ↕</span></div><div className="pokedex-grid">{entries.map((entry) => <button className={selected.name === entry.name ? 'pokedex-card selected' : 'pokedex-card'} key={`${entry.region}-${entry.name}`} onClick={() => onSelect(entry)}><div className="card-top"><span>#{String(entry.id).padStart(3, '0')}</span><span>{entry.region}</span></div><div className="card-image"><img src={entry.image} alt={entry.name} /></div><div className="card-name"><b>{entry.name}</b><span>↗</span></div><div className="card-types">{entry.type.split(' / ').map((type) => <em data-type={type} key={type}>{typeLabel(type)}</em>)}</div><div className="card-stats" data-type={entry.type.split(' / ')[0]}><span>HP <b>{entry.stats.hp}</b></span><span>ATK <b>{entry.stats.attack}</b></span><span>DEF <b>{entry.stats.defense}</b></span><span>SPA <b>{entry.stats.specialAttack}</b></span><span>SPD <b>{entry.stats.specialDefense}</b></span><span>SPE <b>{entry.stats.speed}</b></span></div></button>)}</div></div>
}

function PokemonDetail({ selected, onBack }: { selected: Pokemon; onBack: () => void }) {
  const stats = { HP: selected.stats.hp, ATAQUE: selected.stats.attack, DEFESA: selected.stats.defense, SPA: selected.stats.specialAttack, SPD: selected.stats.specialDefense, SPEED: selected.stats.speed }
  return <div className="detail-screen"><button className="back-button" onClick={onBack}>← Voltar para Pokedex</button><div className="detail-hero detail-hero-screen" style={{ '--accent': selected.accent } as React.CSSProperties}><img className="detail-image" src={selected.image} alt={selected.name} /><span className="detail-id">#{String(selected.id).padStart(3, '0')} · GERAÇÃO {selected.generation}</span><span className="detail-symbol">◒</span><div><p className="kicker">{selected.region.toUpperCase()} / ESPÉCIE POKÉMON</p><h2>{selected.name}</h2><div className="chips">{selected.type.split(' / ').map((type) => <span data-type={type} key={type}>{typeLabel(type)}</span>)}</div></div></div><div className="detail-columns"><section className="detail-block"><div className="section-title"><span>STATUS BASE</span><i>01</i></div><div className="stats-grid">{Object.entries(stats).map(([label, value]) => <div className="stat-card" key={label}><small>{label}</small><b>{value}</b><span style={{ width: `${Math.min(100, value / 2.55)}%` }} /></div>)}</div><div className="section-title move-title"><span>DADOS BASE</span><i>02</i></div><div className="stats"><Stat label="GRUPO-OVO" value={selected.eggGroup || '—'} /><Stat label="EXP BASE" value={String(selected.baseExp)} /><Stat label="FORMA" value={selected.form} /></div><TypeMatchups type={selected.type} /></section><section className="detail-block moves-block"><MoveSection title="GOLPES POR NÍVEL" number="03" moves={selected.levelMoves} /><MoveSection title="TMs QUE APRENDE" number="04" moves={selected.tmMoves} /></section></div></div>
}

function TypeMatchups({ type }: { type: string }) {
  const matchups = getTypeMatchups(type)
  const groups = [
    { title: 'FRAQUEZAS', values: matchups.filter(({ multiplier }) => multiplier > 1) },
    { title: 'RESISTÊNCIAS', values: matchups.filter(({ multiplier }) => multiplier > 0 && multiplier < 1) },
    { title: 'IMUNIDADES', values: matchups.filter(({ multiplier }) => multiplier === 0) },
  ]
  return <div className="matchups"><div className="section-title"><span>FRAQUEZAS E RESISTÊNCIAS</span><i>03</i></div>{groups.map((group) => <div className="matchup-group" key={group.title}><small>{group.title}</small><div className="type-pills">{group.values.length ? group.values.map(({ type: attackType, multiplier }) => <span data-type={attackType} className={`type-pill ${group.title.toLowerCase()}`} key={attackType}><b>{typeLabel(attackType)}</b><em>{multiplier === 0.25 ? '×¼' : multiplier === 0.5 ? '×½' : multiplier === 2 ? '×2' : multiplier === 4 ? '×4' : '×0'}</em></span>) : <span className="no-matchup">Nenhuma</span>}</div></div>)}</div>
}

function MoveSection({ title, number, moves }: { title: string; number: string; moves: Move[] }) {
  return <div className="move-section"><div className="section-title"><span>{title}</span><i>{number}</i></div>{title === 'TMs QUE APRENDE' && <p className="tm-warning">Aviso: algumas TMs podem não ser ensináveis ao Pokémon, pois ainda não temos 100% das informações disponíveis pelo PokeHunt. Os dados estão sendo baseados na wiki oficial do Pokémon.</p>}{moves.length ? <div className="move-list">{moves.map((move) => { const details = tms.find((item) => item.name === move.name); const attackCategory = details?.attackCategory ?? (move.power === null ? 'status' : 'special'); const effectCategory = attackCategory === 'status' || move.power === null ? 'Status' : 'Dano'; return <div key={`${move.name}-${move.level}`}><b>{move.level ? `Nível ${move.level}` : 'TM'}</b><span>{move.name}</span><em className="move-summary"><span className="move-detail move-element">{typeLabel(move.type)}</span><span className="move-detail move-power">{move.power ?? 'STATUS'}</span><span className="move-detail move-cooldown">{move.cooldown}</span></em><small className="move-facts">{attackCategory !== 'status' && <span className={`move-fact attack-${attackCategory}`}>{moveAttackLabel(attackCategory)}</span>}<span className="move-fact">{details?.isArea ? 'Área' : 'Alvo único'}</span><span className={`move-fact effect-${effectCategory.toLowerCase()}`}>{effectCategory}</span></small></div> })}</div> : <p className="empty-moves">A wiki ainda não publicou moveset para esta espécie.</p>}</div>
}

function Stat({ label, value }: { label: string; value: string }) { return <div><small>{label}</small><b>{value}</b></div> }
function TmTable({ items }: { items: typeof tms }) { return <div className="tm-panel"><div className="panel-heading"><span>GOLPES E TMs / {items.length}</span><span className="sort">TIPO ↕</span></div><div className="tm-head"><span>GOLPE</span><span>TIPO</span><span>ATAQUE</span><span>PODER</span><span>RECARGA</span><span>CATEGORIA</span><span>ALCANCE</span></div>{items.map((tm) => <div className="tm-row" key={tm.id}><strong data-type={tm.type}>{tm.name}</strong><span data-type={tm.type} className={`type ${tm.type.toLowerCase()}`}>{typeLabel(tm.type)}</span><span className={`attack-category ${tm.attackCategory}`}><i>{attackCategoryIcon(tm.attackCategory)}</i>{attackCategoryLabel(tm.attackCategory)}</span><span>{tm.power ?? '—'}</span><span>{tm.cooldown}</span><span>{tm.category.replace('Utilitário / Status', 'Utilitário / Estado')}</span><span>{tm.range.replace('Alvo único', 'Alvo único')}</span></div>)}</div> }

function MoveDexTable({ items }: { items: MoveDexEntry[] }) { return <div className="tm-panel movedex-panel"><div className="capture-note"><strong>MoveDex:</strong> catálogo unificado dos golpes que aparecem nos movesets por nível e no catálogo de TMs do PokeHunt.</div><div className="panel-heading"><span>GOLPES DISPONÍVEIS / {items.length}</span><span className="sort">NOME ↕</span></div><div className="tm-head movedex-head"><span>GOLPE</span><span>TIPO</span><span>ATAQUE</span><span>PODER</span><span>RECARGA</span><span>EFEITO</span><span>ALCANCE</span><span>ORIGEM</span></div>{items.map((move) => <div className="tm-row movedex-row" key={move.name}><strong data-type={move.type}>{move.name}</strong><span data-type={move.type} className="type">{typeLabel(move.type)}</span><span className={`attack-category ${move.attackCategory}`}><i>{attackCategoryIcon(move.attackCategory)}</i>{attackCategoryLabel(move.attackCategory)}</span><span>{move.power ?? '—'}</span><span>{move.cooldown}</span><span>{move.category.replace('Utilitário/Status', 'Status')}</span><span>{move.isArea ? 'Área' : 'Alvo único'}</span><span className="move-source">{move.learnedByLevel && move.learnedByTm ? 'Nível + TM' : move.learnedByTm ? 'TM' : 'Nível'}</span></div>)}</div> }

function CaptureTable({ items, pokemon }: { items: CaptureEntry[]; pokemon: Pokemon[] }) { return <div className="tm-panel capture-panel"><div className="capture-note"><strong>Como ler:</strong> quanto menor a dureza, mais fácil é capturar. A wiki recomenda Ultraball para a tabela de caça. As 8 espécies não capturáveis e os 74 lendários/Megas ficam fora destes registros.</div><div className="panel-heading"><span>ESPÉCIES NA TABELA / {items.length}</span><span className="sort">DUREZA ↕</span></div><div className="tm-head capture-head"><span>ESPÉCIE</span><span>ELEMENTO</span><span>DUREZA</span><span>FAIXA</span><span>BALL RECOMENDADA</span></div>{items.map((entry) => { const match = pokemon.find((item) => item.name === entry.name); const elements = match ? match.type.split(' / ').map(typeLabel).join(' e ') : '—'; return <div className="tm-row capture-row" key={entry.name}><strong>{entry.name}</strong><span className="capture-types">{elements}</span><span className="capture-hardness">{entry.hardness}</span><span className={`capture-range range-${entry.range.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{entry.range}</span><span className="capture-ball">{entry.recommendedBall}</span></div> })}</div> }

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
