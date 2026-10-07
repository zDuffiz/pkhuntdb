import React, { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowRight, BookOpen, Calculator, ChevronDown, ClipboardList, Crosshair, ExternalLink, Home, Map as MapIcon, MapPin, Moon, Radio, RotateCcw, ScrollText, Search, Sun, Swords, X } from 'lucide-react'
import liveGif from '../assets/Emote-animado-explodindo-a-cabeça.gif'
import discordGif from '../assets/Dançando animado.gif'
import { captureRates, loadPokemon, moveDex, pokemonFallback, technicalMoves, type CaptureEntry, type Move, type MoveDexEntry, type Pokemon, type TechnicalMove } from './data'
import { clanMissions, clanNames, type ClanMission } from './mission-data'
import regionCatalog from './region-data.json'
import RaidPlanner from './RaidPlanner'
import { getSuperEffectiveTypes, getTypeMatchups } from './type-chart'
import './styles.css'
import './image-overrides.css'
import './detail-overrides.css'
import './matchup-overrides.css'
import './pokedex-overrides.css'
import './tm-overrides.css'
import './theme-overrides.css'
import './joy-theme.css'
import './missions.css'
import './home.css'
import './color-mode.css'
import './world.css'
import './raids.css'
import './visual-system.css'

type WorldRegion = {
  id: string
  name: string
  biome: string
  biomeLabel: string
  generation: number
  level: number
  tier: number
  levelRange: string
  exp: number
  types: string[]
  archetype: string
  stage: 'region' | 'elite' | 'mega'
  spawns: { name: string; weight: number }[]
}

type EasiestCaptureRecommendation = {
  pokemonName: string
  hardness: number
  mapId: string
  mapName: string
  levelRange: string
  spawnChance: number
}

const worldRegions = regionCatalog as WorldRegion[]
const worldAppearancesByPokemon = new Map<string, { map: WorldRegion; chance: number }[]>()
for (const map of worldRegions) {
  const totalWeight = map.spawns.reduce((total, spawn) => total + spawn.weight, 0) || 1
  for (const spawn of map.spawns) {
    const appearances = worldAppearancesByPokemon.get(spawn.name) ?? []
    appearances.push({ map, chance: spawn.weight / totalWeight })
    worldAppearancesByPokemon.set(spawn.name, appearances)
  }
}
const captureHardnessByName = new Map(captureRates.map((entry) => [entry.name, entry.hardness]))
const captureBallPower = { 'Poké Ball': 4, 'Great Ball': 7, 'Ultra Ball': 13 } as const
const captureRarityDivisors = { Comum: 1, Incomum: 10, Raro: 26, 'Épico': 39, Prismático: 90, Mítico: 174, Astral: 283 } as const
const captureWeatherMultiplier = 2.5
const captureWeatherByType: Record<string, string> = { Water: 'Chuva', Fire: 'Sol forte', Electric: 'Tempestade elétrica', Ice: 'Nevasca', Rock: 'Tempestade de areia', Ground: 'Tempestade de areia', Steel: 'Tempestade de areia', Ghost: 'Neblina', Dark: 'Neblina' }
const captureLevelPenaltyPoints = [[0.24, 0.98], [0.3, 0.96], [0.5, 0.83], [0.6, 0.7], [0.75, 0.42], [0.8, 0.3], [0.9, 0]] as const
const getCaptureLevelPenalty = (teamToTargetRatio: number) => {
  if (teamToTargetRatio >= 0.9) return 0
  if (teamToTargetRatio <= 0.24) return 0.98
  const upperIndex = captureLevelPenaltyPoints.findIndex(([ratio]) => teamToTargetRatio <= ratio)
  const [upperRatio, upperPenalty] = captureLevelPenaltyPoints[upperIndex]
  const [lowerRatio, lowerPenalty] = captureLevelPenaltyPoints[upperIndex - 1]
  const progress = (teamToTargetRatio - lowerRatio) / (upperRatio - lowerRatio)
  return lowerPenalty + (upperPenalty - lowerPenalty) * progress
}

const tms = technicalMoves
const moveCategoryLabels: Record<TechnicalMove['attackCategory'], string> = { physical: 'Físico', special: 'Ataque Especial', status: 'Status', unknown: 'Categoria indisponível' }
const moveRangeLabels: Record<string, string> = { 'Área': 'Área', 'Só em si': 'Só em si', 'Alvo único': 'Alvo Único', Time: 'Time', Aposentado: 'Aposentado' }
const moveRangeClasses: Record<string, string> = { 'Área': 'area', 'Só em si': 'self', 'Alvo único': 'single', Time: 'team', Aposentado: 'retired' }
const moveMetadataByName = new Map(tms.map((move) => [move.name, move]))
const typeLabels: Record<string, string> = { Normal: 'Normal', Fire: 'Fogo', Water: 'Água', Electric: 'Elétrico', Grass: 'Planta', Ice: 'Gelo', Fighting: 'Lutador', Poison: 'Veneno', Ground: 'Terra', Flying: 'Voador', Psychic: 'Psíquico', Bug: 'Inseto', Rock: 'Pedra', Ghost: 'Fantasma', Dragon: 'Dragão', Dark: 'Sombrio', Steel: 'Aço', Fairy: 'Fada' }
const typeLabel = (type: string) => typeLabels[type] ?? type
const typeListLabel = (types: string) => types.split(' / ').map(typeLabel).join(' / ')

function App() { return <Atlas /> }

function Atlas() {
  const [view, setView] = useState<'home' | 'pokemon' | 'tms' | 'tm-compatible' | 'captures' | 'movedex' | 'missions' | 'calculator' | 'world' | 'raids' | 'detail'>('home')
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => window.localStorage.getItem('pkhuntdb-color-mode-v2') === 'light' ? 'light' : 'dark')
  const [calculatorResetVersion, setCalculatorResetVersion] = useState(0)
  const [comparisonResetVersion, setComparisonResetVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Pokemon>(pokemonFallback[0])
  const [pokemon, setPokemon] = useState<Pokemon[]>(pokemonFallback)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [eggGroupFilter, setEggGroupFilter] = useState('Todos os grupos')
  const [pokemonTypeFilter, setPokemonTypeFilter] = useState('Todos os elementos')
  const [statSort, setStatSort] = useState('Nenhum')
  const [tmType, setTmType] = useState('Todos os tipos')
  const [tmRange, setTmRange] = useState('Todos os alcances')
  const [tmCategory, setTmCategory] = useState('Todas as categorias')
  const [tmSort, setTmSort] = useState<{ key: 'power' | 'cooldown'; direction: 'asc' | 'desc' } | null>(null)
  const [selectedTm, setSelectedTm] = useState<TechnicalMove | null>(null)
  const [worldFocusMapId, setWorldFocusMapId] = useState<string | null>(null)
  const [captureRange, setCaptureRange] = useState('Todas as faixas')
  const [captureType, setCaptureType] = useState('Todos os tipos')
  const [captureSort, setCaptureSort] = useState('Nome (A-Z)')
  const [captureSubTab, setCaptureSubTab] = useState<'rates' | 'calculator'>('rates')
  const [moveSource, setMoveSource] = useState('Todas as origens')

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode
    window.localStorage.setItem('pkhuntdb-color-mode-v2', colorMode)
  }, [colorMode])

  useEffect(() => {
    loadPokemon().then((entries) => {
      setPokemon(entries)
      setSelected(entries[0])
      setStatus('ready')
    }).catch(() => setStatus('error'))
  }, [])

  const filteredPokemon = useMemo(() => [...pokemon]
    .filter((entry) => eggGroupFilter === 'Todos os grupos' || (eggGroupFilter === 'Sem grupo' ? !entry.eggGroup : entry.eggGroup.split(',').map((group) => group.trim()).includes(eggGroupFilter)))
    .filter((entry) => pokemonTypeFilter === 'Todos os elementos' || entry.type.split(' / ').includes(pokemonTypeFilter))
    .filter((entry) => `${entry.name} ${entry.type} ${entry.eggGroup} ${entry.region}`.toLowerCase().includes(query.toLowerCase()))
    .sort((first, second) => {
      const baseOrder = () => first.id - second.id
      if (statSort === 'Status total') {
        const firstTotal = Object.values(first.stats).reduce((total, value) => total + value, 0)
        const secondTotal = Object.values(second.stats).reduce((total, value) => total + value, 0)
        return secondTotal - firstTotal || baseOrder()
      }
      if (statSort === 'HP') return second.stats.hp - first.stats.hp || baseOrder()
      if (statSort === 'Ataque') return second.stats.attack - first.stats.attack || baseOrder()
      if (statSort === 'Defesa') return second.stats.defense - first.stats.defense || baseOrder()
      if (statSort === 'Ataque Especial') return second.stats.specialAttack - first.stats.specialAttack || baseOrder()
      if (statSort === 'Defesa Especial') return second.stats.specialDefense - first.stats.specialDefense || baseOrder()
      if (statSort === 'Speed') return second.stats.speed - first.stats.speed || baseOrder()
      return baseOrder()
    }), [pokemon, query, eggGroupFilter, pokemonTypeFilter, statSort])
  const filteredTms = useMemo(() => {
    const entries = [...tms]
      .filter((entry) => tmType === 'Todos os tipos' || entry.type === tmType)
      .filter((entry) => tmRange === 'Todos os alcances' || entry.range === tmRange)
      .filter((entry) => tmCategory === 'Todas as categorias' || entry.attackCategory === tmCategory)
      .filter((entry) => `${entry.id} ${entry.name} ${entry.type} ${moveCategoryLabels[entry.attackCategory]} ${entry.range ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    if (!tmSort) return entries.sort((first, second) => first.name.localeCompare(second.name))
    return entries.sort((first, second) => {
      const firstValue = tmSort.key === 'power' ? first.power : Number.parseInt(first.cooldown ?? '', 10)
      const secondValue = tmSort.key === 'power' ? second.power : Number.parseInt(second.cooldown ?? '', 10)
      if (firstValue == null && secondValue == null) return 0
      if (firstValue == null || Number.isNaN(firstValue)) return 1
      if (secondValue == null || Number.isNaN(secondValue)) return -1
      const difference = firstValue - secondValue
      return tmSort.direction === 'desc' ? -difference : difference
    })
  }, [query, tmCategory, tmRange, tmSort, tmType])
  const compatiblePokemon = useMemo(() => {
    if (!selectedTm) return []
    const name = normalizeMoveName(selectedTm.name)
    return pokemon.filter((entry) => entry.hasMoveset && (
      entry.levelMoves.some((move) => normalizeMoveName(move.name) === name)
      || entry.tmMoves.some((move) => normalizeMoveName(move.name) === name)
      || entry.type.split(' / ').some((type) => type.toLowerCase() === selectedTm.type.toLowerCase())
    )).sort((first, second) => first.name.localeCompare(second.name))
  }, [pokemon, selectedTm])
  const filteredCaptures = useMemo(() => [...captureRates]
    .filter((entry) => captureRange === 'Todas as faixas' || entry.range === captureRange)
    .filter((entry) => captureType === 'Todos os tipos' || pokemon.find((item) => item.name === entry.name)?.type.split(' / ').includes(captureType))
    .filter((entry) => `${entry.name} ${entry.range} ${entry.recommendedBall}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => captureSort === 'Dureza (menor)' ? a.hardness - b.hardness : captureSort === 'Dureza (maior)' ? b.hardness - a.hardness : a.name.localeCompare(b.name)), [captureRange, captureSort, captureType, pokemon, query])
  const filteredMoveDex = useMemo(() => [...moveDex]
    .filter((entry) => moveSource === 'Todas as origens' || (moveSource === 'Por nível' ? entry.learnedByLevel > 0 : entry.learnedByTm))
    .filter((entry) => `${entry.name} ${entry.type}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [moveSource, query])
  const captureRanges = [...new Set(captureRates.map((entry) => entry.range))]
  const captureTypes = [...new Set(pokemon.flatMap((entry) => entry.type.split(' / ')))].sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)))
  const eggGroups = [...new Set(pokemon.flatMap((entry) => entry.eggGroup.split(',').map((group) => group.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b))

  function changeView(nextView: typeof view) {
    setQuery('')
    setWorldFocusMapId(null)
    setView(nextView)
  }

  function openPokemon(entry: Pokemon) {
    setSelected(entry)
    changeView('detail')
  }

  function openRecommendedMap(mapId: string) {
    if (!worldRegions.some((entry) => entry.id === mapId)) return
    setQuery('')
    setWorldFocusMapId(mapId)
    setView('world')
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button type="button" className="brand brand-home" aria-label="Ir para Início" onClick={() => changeView('home')}><span className="brand-mark"><BookOpen size={30} strokeWidth={2.4} /><img src="https://img.pokemondb.net/sprites/home/normal/pikachu.png" alt="" /></span><span>PK HUNT<br /><b>DATABASE</b></span></button>
        <p className="eyebrow">GUIA DO TREINADOR</p>
        <nav>
          <button aria-label="Início" className={view === 'home' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('home')}><Home size={18} /> <span>Início</span></button>
          <button aria-label="Pokedex" className={view === 'pokemon' || view === 'detail' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('pokemon')}><BookOpen size={18} /> <span>Pokedex</span> <strong>{pokemon.length}</strong></button>
          <button aria-label="TMs" className={view === 'tms' || view === 'tm-compatible' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('tms')}><ScrollText size={18} /> <span>TMs</span> <strong>{tms.length}</strong></button>
          <div className="nav-group">
            <button aria-label="Capturas" aria-expanded={view === 'captures'} className={view === 'captures' ? 'nav-item active' : 'nav-item'} onClick={() => { setCaptureSubTab('rates'); changeView('captures') }}><Crosshair size={18} /> <span>Capturas</span> <strong>{captureRates.length}</strong><ChevronDown className={view === 'captures' ? 'nav-chevron expanded' : 'nav-chevron'} size={16} aria-hidden="true" /></button>
            {view === 'captures' && <div className="nav-submenu" role="group" aria-label="Menu de Capturas">
              <button type="button" className={captureSubTab === 'rates' ? 'nav-subitem active' : 'nav-subitem'} aria-current={captureSubTab === 'rates' ? 'page' : undefined} title="Taxas de Captura" onClick={() => { setQuery(''); setCaptureSubTab('rates') }}><Crosshair size={15} /><span>Taxas de Captura</span></button>
              <button type="button" className={captureSubTab === 'calculator' ? 'nav-subitem active' : 'nav-subitem'} aria-current={captureSubTab === 'calculator' ? 'page' : undefined} title="Calculadora de Captura" onClick={() => { setQuery(''); setCaptureSubTab('calculator') }}><Calculator size={15} /><span>Calculadora de Captura</span></button>
            </div>}
          </div>
          <button aria-label="Mundo" className={view === 'world' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('world')}><MapIcon size={18} /> <span>Mundo</span> <strong>{worldRegions.length}</strong></button>
          <button aria-label="MoveDex" hidden className={view === 'movedex' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('movedex')}><Swords size={18} /> <span>MoveDex</span> <strong>{moveDex.length}</strong></button>
          <button aria-label="Missões" className={view === 'missions' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('missions')}><ClipboardList size={18} /> <span>Missões</span> <strong>{clanMissions.length}</strong></button>
          <button aria-label="RAIDS" className={view === 'raids' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('raids')}><Swords size={18} /> <span>RAIDS</span> <strong>74</strong></button>
          <button aria-label="Calculadora" className={view === 'calculator' ? 'nav-item active' : 'nav-item'} onClick={() => changeView('calculator')}><Calculator size={18} /> <span>Calculadora</span> <strong>6</strong></button>
        </nav>
      </aside>

      <section className={view === 'raids' ? 'content raids-view' : 'content'}>
        <header className="topbar"><div>{view !== 'home' && <p className="kicker">PK HUNT DATABASE / CENTRAL DE TREINADORES</p>}<h1>{view === 'home' ? 'Início' : view === 'detail' ? selected.name : view === 'pokemon' ? 'Sua Pokédex' : view === 'tms' ? 'Golpes & TMs' : view === 'tm-compatible' ? 'Pokémon compatíveis' : view === 'captures' ? captureSubTab === 'calculator' ? 'Calculadora de Captura' : 'Taxas de Captura' : view === 'world' ? 'Mundo' : view === 'calculator' ? 'Calculadora de Status' : view === 'missions' ? 'Missões de Clã' : 'MoveDex'}</h1></div><div className="creator-showcase"><img className="creator-gif" src={discordGif} alt="" aria-hidden="true" /><div className="creator-credit"><span>Criado por:</span><a className="creator-link" href="https://discord.com/users/337805709561561088" target="_blank" rel="noreferrer" aria-label="Abrir o perfil Discord de zDuffi">zDuffi<ExternalLink size={13} /></a></div></div><div className="topbar-actions"><div className="live-showcase"><img className="live-gif" src={liveGif} alt="" aria-hidden="true" /><a className="live-link" href="https://www.twitch.tv/zduffi" target="_blank" rel="noreferrer"><Radio size={16} /> <span>LIVE NA TWITCH</span><ExternalLink size={13} /></a></div><div className="theme-switch" role="group" aria-label="Modo de cores"><button type="button" aria-label="Modo claro" title="Modo claro" aria-pressed={colorMode === 'light'} onClick={() => setColorMode('light')}><Sun size={17} /><span>Claro</span></button><button type="button" aria-label="Modo escuro" title="Modo escuro" aria-pressed={colorMode === 'dark'} onClick={() => setColorMode('dark')}><Moon size={17} /><span>Escuro</span></button></div>{view !== 'home' && <div className="version">{view === 'captures' ? captureRates.length : view === 'movedex' ? moveDex.length : view === 'missions' ? clanMissions.length : view === 'calculator' ? '6' : view === 'world' ? worldRegions.length : status === 'ready' ? '747' : '...'} {view === 'calculator' ? 'ATRIBUTOS' : view === 'world' ? 'MAPAS' : 'REGISTROS'} <span>WIKI</span></div>}</div></header>
        {view === 'raids' ? <RaidPlanner pokemon={pokemon} status={status} /> : view === 'home' ? <HomeDashboard onNavigate={(destination) => {
          if (destination === 'capture-calculator') {
            setCaptureSubTab('calculator')
            changeView('captures')
          } else changeView(destination)
        }} counts={{ pokemon: pokemon.length, missions: clanMissions.length, tms: tms.length, captures: captureRates.length, world: worldRegions.length }} /> : view === 'detail' ? <PokemonDetail selected={selected} onBack={() => changeView('pokemon')} /> : view === 'tm-compatible' ? <CompatiblePokemonScreen move={selectedTm} entries={compatiblePokemon} onBack={() => setView('tms')} onSelect={openPokemon} /> : view === 'calculator' ? <>
          <div className="calculator-reset-toolbar"><button type="button" className="calculator-reset-button" onClick={() => setCalculatorResetVersion((version) => version + 1)}><RotateCcw size={15} aria-hidden="true" /><span>Resetar calculadora</span></button></div>
          <PokemonCalculator entries={pokemon} resetVersion={calculatorResetVersion} />
          <div className="calculator-reset-toolbar comparison-reset-toolbar"><button type="button" className="calculator-reset-button" onClick={() => setComparisonResetVersion((version) => version + 1)}><RotateCcw size={15} aria-hidden="true" /><span>Resetar comparação</span></button></div>
          <PokemonComparison entries={pokemon} resetVersion={comparisonResetVersion} />
        </> : view === 'world' ? <WorldAtlas entries={worldRegions} focusMapId={worldFocusMapId} /> : <>
          {(view !== 'captures' || captureSubTab === 'rates') && <div className="toolbar">
            <label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'pokemon' ? 'Encontre um Pokémon, tipo ou região...' : view === 'tms' ? 'Qual golpe você procura?' : view === 'captures' ? 'Pesquise uma espécie ou Ball...' : 'Pesquise um golpe, tipo ou categoria...'} /></label>
            {view === 'pokemon' ? <>
              <select aria-label="Filtrar por Egg Group" value={eggGroupFilter} onChange={(event) => setEggGroupFilter(event.target.value)}>
                <option value="Todos os grupos">Egg Group</option>
                {eggGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                <option>Sem grupo</option>
              </select>
              <select aria-label="Filtrar por elemento" value={pokemonTypeFilter} onChange={(event) => setPokemonTypeFilter(event.target.value)}><option value="Todos os elementos">Todos elementos</option>{captureTypes.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select>
              <select aria-label="Priorizar status" value={statSort} onChange={(event) => setStatSort(event.target.value)}><option value="Nenhum">Priorizar status</option><option value="Status total">Status total (maior)</option><option value="HP">HP (maior)</option><option value="Ataque">Ataque (maior)</option><option value="Defesa">Defesa (maior)</option><option value="Ataque Especial">Ataque Especial (maior)</option><option value="Defesa Especial">Defesa Especial (maior)</option><option value="Speed">Speed (maior)</option></select>
              <button type="button" className="pokedex-reset-button" onClick={() => { setQuery(''); setEggGroupFilter('Todos os grupos'); setPokemonTypeFilter('Todos os elementos'); setStatSort('Nenhum') }}><RotateCcw size={15} aria-hidden="true" /><span>Reset filtros</span></button>
            </> : view === 'tms' ? <>
              <select aria-label="Filtrar TMs por tipo" value={tmType} onChange={(event) => setTmType(event.target.value)}><option>Todos os tipos</option>{[...new Set(tms.map((item) => item.type))].sort().map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select>
              <select aria-label="Filtrar TMs por alcance" value={tmRange} onChange={(event) => setTmRange(event.target.value)}><option>Todos os alcances</option>{Object.entries(moveRangeLabels).map(([range, label]) => <option key={range} value={range}>{label}</option>)}</select>
              <select aria-label="Filtrar TMs por categoria" value={tmCategory} onChange={(event) => setTmCategory(event.target.value)}><option value="Todas as categorias">Todas as categorias</option>{(['physical', 'special', 'status'] as const).map((category) => <option key={category} value={category}>{moveCategoryLabels[category]}</option>)}</select>
            </> : view === 'captures' ? <>
              <select aria-label="Filtrar por faixa" value={captureRange} onChange={(event) => setCaptureRange(event.target.value)}><option>Todas as faixas</option>{captureRanges.map((item) => <option key={item}>{item}</option>)}</select>
              <select aria-label="Filtrar capturas por tipo" value={captureType} onChange={(event) => setCaptureType(event.target.value)}><option>Todos os tipos</option>{captureTypes.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select>
              <select aria-label="Ordenar capturas" value={captureSort} onChange={(event) => setCaptureSort(event.target.value)}><option>Nome (A-Z)</option><option>Dureza (menor)</option><option>Dureza (maior)</option></select>
            </> : <>
              <select aria-label="Filtrar origem do golpe" value={moveSource} onChange={(event) => setMoveSource(event.target.value)}><option>Todas as origens</option><option>Por nível</option><option>Por TM</option></select>
            </>}
          </div>}
          {view === 'captures' && captureSubTab === 'calculator' ? <CaptureCalculator entries={captureRates} pokemon={pokemon} /> : view === 'pokemon' ? <PokemonList entries={filteredPokemon} selected={selected} status={status} statSort={statSort} onSelect={openPokemon} /> : view === 'tms' ? <TmTable items={filteredTms} sort={tmSort} onSort={(key) => setTmSort((current) => current?.key === key ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' } : { key, direction: 'desc' })} onSelectMove={(move) => { setSelectedTm(move); setView('tm-compatible') }} /> : view === 'captures' ? <CaptureTable items={filteredCaptures} pokemon={pokemon} sort={captureSort} onSort={setCaptureSort} /> : view === 'missions' ? <MissionBoard items={clanMissions} pokemon={pokemon} onOpenMap={openRecommendedMap} /> : <MoveDexTable items={filteredMoveDex} />}
        </>}
      </section>
    </main>
  )
}

type HomeDestination = 'pokemon' | 'missions' | 'calculator' | 'tms' | 'captures' | 'world'
type HomeShortcutDestination = HomeDestination | 'capture-calculator'
type HomeCounts = Pick<Record<HomeDestination, number>, 'pokemon' | 'missions' | 'tms' | 'captures' | 'world'>

function HomeDashboard({ onNavigate, counts }: { onNavigate: (destination: HomeShortcutDestination) => void; counts: HomeCounts }) {
  const shortcuts = [
    { destination: 'pokemon', label: 'Pokédex', detail: `${counts.pokemon} espécies`, icon: BookOpen, tone: 'pokedex' },
    { destination: 'missions', label: 'Missões', detail: `${counts.missions} missões de clã`, icon: ClipboardList, tone: 'missions' },
    { destination: 'calculator', label: 'Calculadora', detail: '6 atributos', icon: Calculator, tone: 'calculator' },
    { destination: 'tms', label: 'TMs', detail: `${counts.tms} golpes`, icon: ScrollText, tone: 'tms' },
    { destination: 'captures', label: 'Capturas', detail: `${counts.captures} espécies`, icon: Crosshair, tone: 'captures' },
    { destination: 'capture-calculator', label: 'Calculadora de Captura', detail: 'Chance e média esperada', icon: Calculator, tone: 'capture-calculator' },
    { destination: 'world', label: 'Mundo', detail: `${counts.world} mapas`, icon: MapIcon, tone: 'world' },
  ] as const

  return <section className="home-screen" aria-label="Navegação principal">
    <div className="home-shortcuts">{shortcuts.map((shortcut) => {
      const Icon = shortcut.icon
      return <button type="button" className={`home-shortcut home-shortcut-${shortcut.tone}`} key={shortcut.destination} onClick={() => onNavigate(shortcut.destination)}>
        <span className="home-shortcut-icon"><Icon size={22} /></span>
        <span className="home-shortcut-copy"><strong>{shortcut.label}</strong><small>{shortcut.detail}</small></span>
        <ArrowRight className="home-shortcut-arrow" size={18} />
      </button>
    })}</div>
  </section>
}

function WorldAtlas({ entries, focusMapId }: { entries: WorldRegion[]; focusMapId: string | null }) {
  const focusedMap = entries.find((entry) => entry.id === focusMapId)
  const [query, setQuery] = useState(focusedMap?.name ?? '')
  const [focusedMapFilter, setFocusedMapFilter] = useState(focusMapId)
  const [selectedBiome, setSelectedBiome] = useState(focusedMap?.biomeLabel ?? 'Todos os biomas')
  const [selectedStage, setSelectedStage] = useState('Todos os estágios')
  const [biomeQueries, setBiomeQueries] = useState<Record<string, string>>({})
  const [biomeFloorFilters, setBiomeFloorFilters] = useState<Record<string, string>>({})
  useEffect(() => {
    if (focusMapId) document.getElementById(`world-map-${focusMapId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusMapId])
  const normalizedQuery = query.trim().toLowerCase()
  const biomes = [...new Set(entries.map((entry) => entry.biomeLabel))]
  const getFloorLabel = (entry: WorldRegion) => {
    const floorKey = entry.id.split('_')[1]
    if (/^\d+$/.test(floorKey ?? '')) return `Andar ${Number(floorKey)}`
    if (floorKey === 'kalos') return 'Kalos'
    if (floorKey === 'elite') return 'Elite'
    if (floorKey === 'mega') return 'Domínio Mega'
    return 'Outros'
  }
  const visibleEntries = entries.filter((entry) => {
    const stageLabel = entry.stage === 'mega' ? 'Domínio Mega' : entry.stage === 'elite' ? 'Elite' : 'Região'
    const matchesQuery = (!focusedMapFilter || entry.id === focusedMapFilter) && `${entry.id} ${entry.name} ${entry.types.join(' ')} ${entry.levelRange} ${entry.spawns.map((spawn) => spawn.name).join(' ')}`.toLowerCase().includes(normalizedQuery)
    return (selectedBiome === 'Todos os biomas' || entry.biomeLabel === selectedBiome)
      && (selectedStage === 'Todos os estágios' || stageLabel === selectedStage)
      && matchesQuery
  })
  const groups = biomes.map((biomeLabel) => ({
    biomeLabel,
    entries: visibleEntries.filter((entry) => entry.biomeLabel === biomeLabel),
  })).filter((group) => group.entries.length > 0)
  const formatChance = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 })

  return <section className="world-atlas">
    <div className="world-controls">
      <label className="world-search"><Search size={18} /><input aria-label="Buscar mapas ou Pokémon" value={query} onChange={(event) => { setQuery(event.target.value); setFocusedMapFilter(null) }} placeholder="Buscar mapa ou Pokémon..." /></label>
      <select aria-label="Filtrar mapas por bioma" value={selectedBiome} onChange={(event) => setSelectedBiome(event.target.value)}>
        <option>Todos os biomas</option>
        {biomes.map((biome) => <option key={biome}>{biome}</option>)}
      </select>
      <select aria-label="Filtrar mapas por estágio" value={selectedStage} onChange={(event) => setSelectedStage(event.target.value)}>
        <option>Todos os estágios</option><option>Região</option><option>Elite</option><option>Domínio Mega</option>
      </select>
      <span className="world-count">{visibleEntries.length} de {entries.length} mapas</span>
    </div>
    <p className="world-note">Chance calculada pelos pesos de spawn publicados para cada mapa.</p>
    {groups.length ? <div className="world-biomes">{groups.map((group) => {
      const biomeQuery = (biomeQueries[group.biomeLabel] ?? '').trim().toLowerCase()
      const biomeFloor = biomeFloorFilters[group.biomeLabel] ?? 'Todos os andares'
      const floorOptions = [...new Set(group.entries.map(getFloorLabel))].sort((first, second) => {
        const firstNumber = Number(first.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER)
        const secondNumber = Number(second.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER)
        return firstNumber - secondNumber || first.localeCompare(second)
      })
      const biomeEntries = group.entries.filter((entry) => {
        const matchesFloor = biomeFloor === 'Todos os andares' || getFloorLabel(entry) === biomeFloor
        const matchesQuery = `${entry.id} ${entry.name} ${entry.types.join(' ')} ${entry.levelRange} ${entry.spawns.map((spawn) => spawn.name).join(' ')}`.toLowerCase().includes(biomeQuery)
        return matchesFloor && matchesQuery
      })
      return <details className={`world-biome world-biome-${group.entries[0].biome}`} key={group.biomeLabel} open={selectedBiome !== 'Todos os biomas' || normalizedQuery.length > 0}>
      <summary><span><strong>{group.biomeLabel}</strong></span><b>{biomeEntries.length}</b></summary>
      <div className="world-biome-header">
        <label className="world-biome-search"><Search size={17} /><input aria-label={`Pesquisar em ${group.biomeLabel}`} value={biomeQueries[group.biomeLabel] ?? ''} onChange={(event) => setBiomeQueries((current) => ({ ...current, [group.biomeLabel]: event.target.value }))} placeholder="Pesquisar mapa, Pokémon ou andar..." /></label>
        <select aria-label={`Filtrar ${group.biomeLabel} por andar`} value={biomeFloor} onChange={(event) => setBiomeFloorFilters((current) => ({ ...current, [group.biomeLabel]: event.target.value }))}>
          <option>Todos os andares</option>
          {floorOptions.map((floor) => <option key={floor}>{floor}</option>)}
        </select>
      </div>
      {biomeEntries.length ? <div className="world-map-list">{biomeEntries.map((entry) => {
        const totalWeight = entry.spawns.reduce((total, spawn) => total + spawn.weight, 0)
        const stageLabel = entry.stage === 'mega' ? 'Domínio Mega' : entry.stage === 'elite' ? 'Elite' : 'Região'
        return <article className={`world-map world-map-${entry.biome}${entry.id === focusedMapFilter ? ' world-map-focused' : ''}`} id={`world-map-${entry.id}`} key={entry.id}>
          <header className="world-map-heading"><div><span className="world-map-id">{entry.id}</span><h3>{entry.name}</h3></div><span className={`world-stage world-stage-${entry.stage}`}>{stageLabel}</span></header>
          <p className="world-map-types">{typeListLabel(entry.types.join(' / '))}</p>
          <div className="world-spawns" aria-label={`Pokémon e chances em ${entry.name}`}>
            {entry.spawns.map((spawn) => {
              const chance = spawn.weight / totalWeight
              const hardness = captureHardnessByName.get(spawn.name)
              return <div className="world-spawn" key={spawn.name}>
                <div className="world-spawn-identity"><strong>{spawn.name}</strong><small className="world-capture-hardness">Dureza {hardness ?? 'N/D'}</small></div><span className="world-chance-track"><i style={{ width: `${chance * 100}%` }} /></span><b>{formatChance.format(chance)}</b>
              </div>
            })}
          </div>
        </article>
      })}</div> : <p className="world-empty">Nenhum mapa encontrado nesse bioma com esses filtros.</p>}
    </details>})}</div> : <p className="world-empty">Nenhum mapa encontrado com esses filtros.</p>}
  </section>
}

function MissionBoard({ items, pokemon, onOpenMap }: { items: ClanMission[]; pokemon: Pokemon[]; onOpenMap: (mapId: string) => void }) {
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
  const hardnessByName = captureHardnessByName
  const easiestCaptureByElement = useMemo(() => {
    const elements = [...new Set(pokemon.flatMap((entry) => entry.type.split(' / ')))]
    return new Map(elements.map((element) => {
      const candidate = pokemon.flatMap((entry) => {
        if (!entry.type.split(' / ').includes(element)) return []
        const hardness = hardnessByName.get(entry.name)
        const appearances = worldAppearancesByPokemon.get(entry.name)
        if (hardness === undefined || !appearances?.length) return []
        const bestAppearance = [...appearances].sort((first, second) => second.chance - first.chance || first.map.level - second.map.level || first.map.id.localeCompare(second.map.id))[0]
        return [{
          pokemonName: entry.name,
          hardness,
          mapId: bestAppearance.map.id,
          mapName: bestAppearance.map.name,
          levelRange: bestAppearance.map.levelRange,
          spawnChance: bestAppearance.chance,
        }]
      }).sort((first, second) => first.hardness - second.hardness || second.spawnChance - first.spawnChance || first.pokemonName.localeCompare(second.pokemonName))[0] ?? null
      return [element, candidate]
    }))
  }, [pokemon, hardnessByName])
  const selectedElement = elementByClan.get(selectedClan) ?? ''
  const groups = visibleClans.map((clan) => ({
    clan,
    missions: matches.filter((mission) => mission.clan === clan).sort((first, second) => first.tier - second.tier),
  })).filter((group) => group.missions.length > 0)
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

  return <section className="mission-board">
    <MissionFinder pokemon={pokemon} onOpenMap={onOpenMap} />
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
      <div className="mission-list">{group.missions.map((mission) => {
        const elementType = mission.element.split('/').at(-1)?.trim()
        const easiestCapture = elementType ? easiestCaptureByElement.get(elementType) ?? null : null
        return <article className="mission-card" key={mission.id}>
          <div className="mission-card-header" style={{ '--element-color': getElementColor(mission.element) } as React.CSSProperties}><div><span className="mission-part">Parte {mission.part}</span><h3>{mission.name}</h3></div><span className="mission-tier">Tier {mission.tier}</span></div>
          <div className="mission-tags"><span>{mission.kind}</span><span>Nível mín. {mission.minimumLevel ?? '—'}</span><span className="mission-element-chip" style={{ '--element-color': getElementColor(mission.element) } as React.CSSProperties}>{mission.element}</span></div>
          <p className="mission-description">{mission.kind === 'Captura' ? <>Capturar <strong>{formatNumber(mission.target)}</strong> Pokémon do tipo <strong>{mission.element}</strong>.</> : mission.kind === 'Contrato específico' ? <>Derrotar os Pokémon específicos desta etapa até completar <strong>{formatNumber(mission.target)} abates</strong>.</> : <>Derrotar <strong>{formatNumber(mission.target)} Pokémon</strong> fracos ao elemento <strong>{mission.element}</strong>.</>}</p>
          <dl className="mission-rewards"><div><dt>Gold</dt><dd>{formatNumber(mission.gold)}</dd></div><div><dt>XP</dt><dd>{formatNumber(mission.experience)}</dd></div><div><dt>Token</dt><dd>{formatNumber(mission.tokens)}</dd></div><div><dt>Pontos do clã</dt><dd>{formatNumber(mission.clanPoints)}</dd></div></dl>
          <MissionAdvice recommendation={mission.recommendation} hardnessByName={hardnessByName} easiestCapture={easiestCapture} onOpenMap={onOpenMap} />
        </article>
      })}</div>
    </details>)}</div> : <p className="mission-empty">Nenhuma missão encontrada.</p>}
  </section>
}

function MissionFinder({ pokemon, onOpenMap }: { pokemon: Pokemon[]; onOpenMap: (mapId: string) => void }) {
  const [action, setAction] = useState<'capture' | 'defeat'>('defeat')
  const [mode, setMode] = useState<'element' | 'pokemon' | 'weak'>('element')
  const [firstElement, setFirstElement] = useState('Fire')
  const [secondElement, setSecondElement] = useState('')
  const [thirdElement, setThirdElement] = useState('')
  const [pokemonName, setPokemonName] = useState('')
  const typeByName = useMemo(() => new Map(pokemon.map((entry) => [entry.name, entry.type.split(' / ')])), [pokemon])
  const pokemonNames = useMemo(() => [...new Set(pokemon.map((entry) => entry.name))].sort((first, second) => first.localeCompare(second)), [pokemon])
  const elements = Object.keys(typeLabels)
  const singleElementTarget = mode === 'element'
  const singleElementDefeat = action === 'defeat' && singleElementTarget
  const selectedElements = (singleElementTarget ? [firstElement] : [firstElement, secondElement, thirdElement]).filter(Boolean)
  const selectedPokemon = pokemonNames.find((name) => name.toLowerCase() === pokemonName.trim().toLowerCase()) ?? ''
  const pokemonSuggestions = pokemonName.trim() && !selectedPokemon ? pokemonNames.filter((name) => name.toLowerCase().includes(pokemonName.trim().toLowerCase())).slice(0, 8) : []
  const ready = mode === 'pokemon' ? selectedPokemon !== '' : selectedElements.length > 0
  const results = useMemo(() => {
    if (!ready) return []
    const levels = worldRegions.filter((map) => map.stage === 'region').map((map) => map.level).sort((first, second) => first - second)
    const easyMax = levels[Math.floor(levels.length / 2) - 1]
    const ranked = worldRegions.map((map) => {
      const total = map.spawns.reduce((sum, spawn) => sum + spawn.weight, 0)
      const hits = map.spawns.filter((spawn) => {
        if (action === 'capture' && !captureHardnessByName.has(spawn.name)) return false
        if (mode === 'pokemon') return spawn.name === selectedPokemon
        const types = typeByName.get(spawn.name) ?? []
        if (mode === 'weak') return types.length > 0 && selectedElements.every((element) => getTypeMatchups(types.join(' / ')).some((matchup) => matchup.type === element && matchup.multiplier > 1))
        return selectedElements.some((element) => types.includes(element))
      })
      const weight = hits.reduce((sum, spawn) => sum + spawn.weight, 0)
      const hardnessWeight = hits.reduce((sum, spawn) => sum + (captureHardnessByName.get(spawn.name) ?? 0) * spawn.weight, 0)
      return { map, hits, chance: total ? weight / total : 0, averageHardness: weight ? hardnessWeight / weight : 0 }
    }).filter((entry) => entry.chance > 0)
      .filter((entry) => !singleElementDefeat || new Set(entry.hits.map((spawn) => spawn.name)).size >= 3)
      .sort((first, second) => second.chance - first.chance || first.map.level - second.map.level || first.map.name.localeCompare(second.map.name))
    if (action === 'capture' && singleElementTarget) {
      const easiestSpecies = [...new Set(ranked.flatMap((entry) => entry.hits.map((spawn) => spawn.name)))]
        .map((name) => ({ name, hardness: captureHardnessByName.get(name) }))
        .filter((entry): entry is { name: string; hardness: number } => entry.hardness !== undefined)
        .sort((first, second) => first.hardness - second.hardness || first.name.localeCompare(second.name))[0]
      const easiestMap = easiestSpecies ? ranked.flatMap((entry) => {
        const speciesWeight = entry.hits.filter((spawn) => spawn.name === easiestSpecies.name).reduce((sum, spawn) => sum + spawn.weight, 0)
        const total = entry.map.spawns.reduce((sum, spawn) => sum + spawn.weight, 0)
        return speciesWeight ? [{ entry, chance: total ? speciesWeight / total : 0 }] : []
      }).sort((first, second) => second.chance - first.chance || first.entry.map.level - second.entry.map.level)[0] : undefined
      const concentrationRanking = [...ranked].sort((first, second) => second.chance - first.chance || first.averageHardness - second.averageHardness || first.map.level - second.map.level)
      const concentrationMap = concentrationRanking.find((entry) => entry.map.id !== easiestMap?.entry.map.id) ?? concentrationRanking[0]
      return [
        { label: 'Menor dureza', entry: easiestMap?.entry, detail: easiestSpecies && easiestMap ? `${easiestSpecies.name} · Dureza ${easiestSpecies.hardness} · ${formatChance(easiestMap.chance)} de spawn` : '' },
        { label: 'Maior concentração', entry: concentrationMap, detail: concentrationMap ? `Dureza média ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(concentrationMap.averageHardness)} · espécies capturáveis do elemento` : '' },
      ]
    }
    if (action === 'capture') return [{ label: 'Melhor mapa', entry: ranked[0], detail: '' }]
    if (mode === 'pokemon') return ranked.map((entry, index) => ({ label: `Mapa ${index + 1}`, entry, detail: '' }))
    if (singleElementDefeat) return [
      { label: 'Mapa fácil', entry: ranked.find((item) => item.map.stage === 'region' && item.map.level <= easyMax), detail: '' },
      { label: 'Mapa avançado', entry: ranked.find((item) => item.map.stage !== 'region'), detail: '' },
    ]
    return [
      { label: 'Mapa fácil', entry: ranked.find((item) => item.map.stage === 'region' && item.map.level <= easyMax), detail: '' },
      { label: 'Mapa médio', entry: ranked.find((item) => item.map.stage === 'region' && item.map.level > easyMax), detail: '' },
      { label: 'Mapa avançado (Elite +)', entry: ranked.find((item) => item.map.stage !== 'region'), detail: '' },
    ]
  }, [ready, action, mode, selectedPokemon, firstElement, secondElement, thirdElement, typeByName])
  function formatChance(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(value)
  }

  return <section className="mission-finder">
    <h2>Buscar melhor mapa para a missão</h2>
    <div className="mission-finder-fields">
      <label><span>Objetivo</span><select aria-label="Objetivo da missão" value={action} onChange={(event) => { const next = event.target.value as 'capture' | 'defeat'; setAction(next); if (next === 'capture' && mode === 'weak') setMode('element') }}><option value="defeat">Derrotar</option><option value="capture">Capturar</option></select></label>
      <label><span>Alvo</span><select aria-label="Tipo de alvo" value={mode} onChange={(event) => setMode(event.target.value as 'element' | 'pokemon' | 'weak')}><option value="element">Elemento</option>{action === 'defeat' && <option value="weak">Fraco a</option>}<option value="pokemon">Pokémon</option></select></label>
      {mode !== 'pokemon' ? <>
        <label><span>Elemento{singleElementTarget ? '' : ' 1'}</span><select aria-label={singleElementTarget ? 'Elemento da missão' : 'Primeiro elemento'} value={firstElement} onChange={(event) => setFirstElement(event.target.value)}>{elements.map((element) => <option key={element} value={element}>{typeLabel(element)}</option>)}</select></label>
        {!singleElementTarget && <>
          <label><span>Elemento 2 (opcional)</span><select aria-label="Segundo elemento" value={secondElement} onChange={(event) => setSecondElement(event.target.value)}><option value="">Nenhum</option>{elements.filter((element) => element !== firstElement).map((element) => <option key={element} value={element}>{typeLabel(element)}</option>)}</select></label>
          <label><span>Elemento 3 (opcional)</span><select aria-label="Terceiro elemento" value={thirdElement} onChange={(event) => setThirdElement(event.target.value)}><option value="">Nenhum</option>{elements.filter((element) => element !== firstElement && element !== secondElement).map((element) => <option key={element} value={element}>{typeLabel(element)}</option>)}</select></label>
        </>}
      </> : <label><span>Pokémon</span><input type="search" aria-label="Pokémon da missão" autoComplete="off" value={pokemonName} onChange={(event) => setPokemonName(event.target.value)} placeholder="Pesquisar Pokémon..." />{pokemonSuggestions.length > 0 && <div className="mission-finder-suggestions">{pokemonSuggestions.map((name) => <button type="button" key={name} onClick={() => setPokemonName(name)}>{name}</button>)}</div>}</label>}
    </div>
    {!ready ? <p className="mission-empty">Digite e escolha um Pokémon para ver os mapas.</p> : results.some((item) => item.entry) ? <div className="mission-finder-results">{results.map(({ label, entry, detail }) => entry ? <button type="button" className="mission-finder-result" key={label} onClick={() => onOpenMap(entry.map.id)} aria-label={`Abrir ${entry.map.name} no Mundo`}>
      <span className="mission-finder-rank">{label}</span>
      <strong>{entry.map.name}</strong>
      <small>{entry.map.id} · nível {entry.map.level} · {formatChance(entry.chance)} dos spawns</small>
      {detail && <small>{detail}</small>}
      <small>{entry.hits.map((spawn) => spawn.name).join(', ')}</small>
    </button> : <div className="mission-finder-result" key={label}><span className="mission-finder-rank">{label}</span><small>Nenhum mapa nesta faixa.</small></div>)}</div> : <p className="mission-empty">Nenhum mapa encontrado para essa busca.</p>}
  </section>
}

function MissionAdvice({ recommendation, hardnessByName, easiestCapture, onOpenMap }: { recommendation: ClanMission['recommendation']; hardnessByName: ReadonlyMap<string, number>; easiestCapture: EasiestCaptureRecommendation | null; onOpenMap: (mapId: string) => void }) {
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)
  const formatExpected = (value: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const formatChance = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 }).format(value)
  const summary = recommendation.kind === 'capture' ? 'Mais opções de Mapas' : recommendation.kind === 'multi' ? 'Ver mapa de cada Pokémon' : recommendation.kind === 'weak' ? 'Ver melhor mapa elemental' : 'Ver recomendação'
  const pokemon = recommendation.pokemon ?? []
  const totalChance = pokemon.reduce((total, entry) => total + entry.chance, 0)
  const averageCaptureHardness = totalChance ? pokemon.reduce((total, entry) => total + (hardnessByName.get(entry.name) ?? entry.media ?? 0) * entry.chance, 0) / totalChance : recommendation.avgMedia
  const pokemonRecommendationList = <div className="advice-pokemon-list">{pokemon.map((entry) => <div className="advice-pokemon" key={entry.name}>
    <div><strong>{entry.name}</strong><span>{entry.types.map((type) => typeLabel(type.charAt(0).toUpperCase() + type.slice(1))).join(' / ')}</span></div>
    <span><strong>{formatChance(entry.chance)}</strong> · <strong>{formatExpected(entry.expected)}</strong> / {recommendation.spawnCount} spawns</span>
    {recommendation.kind === 'capture' && (hardnessByName.get(entry.name) ?? entry.media) !== undefined && <strong>Dureza Capturas: {formatNumber(hardnessByName.get(entry.name) ?? entry.media ?? 0)}</strong>}
    {recommendation.kind === 'weak' && entry.eff !== undefined && <strong>Efetividade: ×{entry.eff}</strong>}
  </div>)}</div>

  if (recommendation.kind === 'multi') {
    return <div className="mission-advice mission-advice-inline">
      <div className="mission-advice-content">
        <h4>{recommendation.title ?? 'Recomendação de mapas'}</h4>
        {recommendation.singleHunt ? <button type="button" className="advice-single-map advice-map-card" aria-label={`Abrir ${recommendation.singleHunt.hunt} no Mundo`} onClick={() => onOpenMap(recommendation.singleHunt!.regionId)}><span>Todos os alvos nesta hunt</span><strong>{recommendation.singleHunt.hunt}</strong><small>{recommendation.singleHunt.regionId} · nível {recommendation.singleHunt.level}</small></button> : <p className="advice-route-note">Os alvos ficam melhor distribuídos entre estas hunts:</p>}
        <div className="advice-routes">{recommendation.targets?.map((target) => <button type="button" className="advice-route advice-route-link" aria-label={`Abrir ${target.hunt} no Mundo para ${target.species}`} onClick={() => onOpenMap(target.regionId)} key={`${target.species}-${target.regionId}`}>
          <div><strong>{target.species}</strong><span>{formatNumber(target.required)} abates</span></div>
          <div><strong className="advice-route-map-name">{target.hunt}</strong><small>{target.regionId} · nível {target.level}</small></div>
          <div><span>{formatChance(target.chance)} de chance</span><small>{formatExpected(target.expected)} / {target.spawnCount} spawns</small></div>
        </button>)}</div>
      </div>
    </div>
  }

  if (recommendation.kind === 'weak') {
    return <div className="mission-advice mission-advice-inline">
      <div className="mission-advice-content">
        <h4>{recommendation.title ?? 'Melhor mapa elemental'}</h4>
        <button type="button" className="advice-best-map advice-map-card" aria-label={`Abrir ${recommendation.hunt ?? 'melhor mapa'} no Mundo`} disabled={!recommendation.regionId} onClick={() => recommendation.regionId && onOpenMap(recommendation.regionId)}><div><span>Melhor mapa</span><strong className="advice-best-map-name">{recommendation.hunt}</strong><small>{recommendation.regionId}</small></div><div><strong>Nível {recommendation.level}</strong><strong>{formatChance(recommendation.chance ?? 0)} de chance</strong><small><strong>{formatExpected(recommendation.expected ?? 0)}</strong> / {recommendation.spawnCount} spawns</small></div></button>
        {pokemonRecommendationList}
      </div>
    </div>
  }

  return <>
    {recommendation.kind === 'capture' && <button type="button" className="advice-option-one advice-option-one-link" aria-label={`Abrir ${recommendation.hunt ?? 'mapa'} no Mundo`} disabled={!recommendation.regionId} onClick={() => recommendation.regionId && onOpenMap(recommendation.regionId)}>
      <div><span>Opção 1 · Melhor lugar para captura</span><strong>{recommendation.hunt ?? 'Mapa não disponível'}</strong><small>{recommendation.regionId} · nível {recommendation.level}</small></div>
      <div><strong>{formatChance(recommendation.chance ?? 0)} de chance</strong>{averageCaptureHardness !== undefined && <small>Dureza média: {formatExpected(averageCaptureHardness)}</small>}<small>{formatExpected(recommendation.expected ?? 0)} / {recommendation.spawnCount} spawns</small></div>
    </button>}
    {recommendation.kind === 'capture' && pokemon.length > 0 && <div className="advice-option-one-pokemon"><h4>Pokémon considerados na Opção 1</h4>{pokemonRecommendationList}</div>}
    <details className="mission-advice">
      <summary><MapPin size={15} />{summary}</summary>
      <div className="mission-advice-content">
        <h4>{recommendation.title ?? 'Sem recomendação'}</h4>
        {recommendation.kind === 'none' ? <p className="mission-advice-empty">{recommendation.message}</p> : <>
          {recommendation.kind === 'capture' && easiestCapture && <button type="button" className="advice-easiest-capture advice-option-two advice-easiest-capture-link" aria-label={`Abrir ${easiestCapture.mapName} no Mundo para capturar ${easiestCapture.pokemonName}`} onClick={() => onOpenMap(easiestCapture.mapId)}>
            <div><span>Opção 2 · Pokémon de menor dureza</span><strong>{easiestCapture.pokemonName}</strong><small>Dureza {formatNumber(easiestCapture.hardness)}</small></div>
            <div><span>Mapa com maior spawn</span><strong className="advice-easiest-capture-map-name">{easiestCapture.mapName}</strong><small>{easiestCapture.mapId} · níveis {easiestCapture.levelRange} · {formatChance(easiestCapture.spawnChance)} dos spawns</small></div>
          </button>}
        </>}
      </div>
    </details>
  </>
}

type ComparisonAttribute = 'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed'
type ComparisonProfile = { name: string; level: number | ''; rarity: string; category: string; stars: number; bond: number; nature: string; ivs: Record<ComparisonAttribute, number | ''>; evs: Record<ComparisonAttribute, number | ''> }

function PokemonComparison({ entries, resetVersion }: { entries: Pokemon[]; resetVersion: number }) {
  const attributes: Array<{ key: ComparisonAttribute; label: string }> = [{ key: 'hp', label: 'PS' }, { key: 'attack', label: 'Ataque' }, { key: 'defense', label: 'Defesa' }, { key: 'specialAttack', label: 'Ataque Especial' }, { key: 'specialDefense', label: 'Defesa Especial' }, { key: 'speed', label: 'Velocidade' }]
  const rarityMultipliers: Record<string, number> = { Comum: 1, Incomum: 1.03, Raro: 1.06, Épico: 1.1, Prismático: 1.15, Mítico: 1.21, Astral: 1.28, Divino: 1.36 }
  const categoryMultipliers: Record<string, number> = { Nenhuma: 1, Fundador: 1.5, Shiny: 1.45, Gênesis: 1.42 }
  const natureEffects: Record<string, { up: ComparisonAttribute | null; down: ComparisonAttribute | null }> = { '': { up: null, down: null }, Hardy: { up: null, down: null }, Lonely: { up: 'attack', down: 'defense' }, Brave: { up: 'attack', down: 'speed' }, Adamant: { up: 'attack', down: 'specialAttack' }, Naughty: { up: 'attack', down: 'specialDefense' }, Bold: { up: 'defense', down: 'attack' }, Docile: { up: null, down: null }, Relaxed: { up: 'defense', down: 'speed' }, Impish: { up: 'defense', down: 'specialAttack' }, Lax: { up: 'defense', down: 'specialDefense' }, Modest: { up: 'specialAttack', down: 'attack' }, Mild: { up: 'specialAttack', down: 'defense' }, Quiet: { up: 'specialAttack', down: 'speed' }, Bashful: { up: null, down: null }, Rash: { up: 'specialAttack', down: 'specialDefense' }, Calm: { up: 'specialDefense', down: 'attack' }, Gentle: { up: 'specialDefense', down: 'defense' }, Sassy: { up: 'specialDefense', down: 'speed' }, Quirky: { up: null, down: null }, Careful: { up: 'specialDefense', down: 'specialAttack' }, Timid: { up: 'speed', down: 'attack' }, Hasty: { up: 'speed', down: 'defense' }, Jolly: { up: 'speed', down: 'specialAttack' }, Naive: { up: 'speed', down: 'specialDefense' }, Serious: { up: null, down: null } }
  const zeroValues = { hp: '', attack: '', defense: '', specialAttack: '', specialDefense: '', speed: '' } as Record<ComparisonAttribute, number | ''>
  const createProfile = (name: string): ComparisonProfile => ({ name, level: '', rarity: 'Comum', category: 'Nenhuma', stars: 0, bond: 0, nature: '', ivs: { ...zeroValues }, evs: { ...zeroValues } })
  const [profiles, setProfiles] = useState([createProfile(''), createProfile('')])
  const [openComparisonSearch, setOpenComparisonSearch] = useState<number | null>(null)
  useEffect(() => {
    setProfiles([createProfile(''), createProfile('')])
    setOpenComparisonSearch(null)
  }, [resetVersion])
  const selected = profiles.map((profile) => profile.name ? entries.find((entry) => entry.name === profile.name) : undefined)
  const calculate = (profile: ComparisonProfile, entry: Pokemon | undefined) => { const effect = natureEffects[profile.nature]; const level = Number(profile.level) || 0; const bondMultiplier = profile.bond >= 100 ? 1.06 : profile.bond >= 75 ? 1.03 : 1; const multiplier = rarityMultipliers[profile.rarity] * categoryMultipliers[profile.category] * bondMultiplier * (1 + profile.stars * 0.04); return Object.fromEntries(attributes.map(({ key }) => { const base = entry?.stats[key] ?? 0; const core = Math.floor(((2 * base * multiplier + (Number(profile.ivs[key]) || 0) + Math.floor((Number(profile.evs[key]) || 0) / 4)) * level) / 100); const natureMultiplier = key === 'hp' || !effect || effect.up === null ? 1 : effect.up === key ? 1.1 : effect.down === key ? 0.9 : 1; return [key, key === 'hp' ? core + level + 10 : Math.floor((core + 5) * natureMultiplier)] })) as Record<ComparisonAttribute, number> }
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

function PokemonCalculator({ entries, resetVersion }: { entries: Pokemon[]; resetVersion: number }) {
  const [selectedName, setSelectedName] = useState('')
  const [showPokemonSuggestions, setShowPokemonSuggestions] = useState(false)
  const [level, setLevel] = useState<number | ''>('')
  const [rarity, setRarity] = useState('Comum')
  const [seal, setSeal] = useState('Nenhum')
  const [stars, setStars] = useState(0)
  const [bond, setBond] = useState(0)
  const [nature, setNature] = useState('')
  const [ivs, setIvs] = useState<Record<'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed', number | ''>>({ hp: '', attack: '', defense: '', specialAttack: '', specialDefense: '', speed: '' })
  const [evs, setEvs] = useState<Record<'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed', number | ''>>({ hp: '', attack: '', defense: '', specialAttack: '', specialDefense: '', speed: '' })
  useEffect(() => {
    setSelectedName('')
    setShowPokemonSuggestions(false)
    setLevel('')
    setRarity('Comum')
    setSeal('Nenhum')
    setStars(0)
    setBond(0)
    setNature('')
    setIvs({ hp: '', attack: '', defense: '', specialAttack: '', specialDefense: '', speed: '' })
    setEvs({ hp: '', attack: '', defense: '', specialAttack: '', specialDefense: '', speed: '' })
  }, [resetVersion])
  const selected = entries.find((entry) => entry.name === selectedName)
  const pokemonSuggestions = entries.filter((entry) => entry.name.toLowerCase().includes(selectedName.toLowerCase())).slice(0, 8)
  const rarityMultipliers: Record<string, number> = { Comum: 1, Incomum: 1.03, Raro: 1.06, Épico: 1.1, Prismático: 1.15, Mítico: 1.21, Astral: 1.28, Divino: 1.36 }
  const sealMultipliers: Record<string, number> = { Nenhum: 1, Fundador: 1.5, Shiny: 1.45, Gênesis: 1.42 }
  const natureEffects: Record<string, { up: keyof typeof ivs | null; down: keyof typeof ivs | null }> = {
    '': { up: null, down: null },
    Hardy: { up: null, down: null }, Lonely: { up: 'attack', down: 'defense' }, Brave: { up: 'attack', down: 'speed' }, Adamant: { up: 'attack', down: 'specialAttack' }, Naughty: { up: 'attack', down: 'specialDefense' },
    Bold: { up: 'defense', down: 'attack' }, Docile: { up: null, down: null }, Relaxed: { up: 'defense', down: 'speed' }, Impish: { up: 'defense', down: 'specialAttack' }, Lax: { up: 'defense', down: 'specialDefense' },
    Modest: { up: 'specialAttack', down: 'attack' }, Mild: { up: 'specialAttack', down: 'defense' }, Quiet: { up: 'specialAttack', down: 'speed' }, Bashful: { up: null, down: null }, Rash: { up: 'specialAttack', down: 'specialDefense' },
    Calm: { up: 'specialDefense', down: 'attack' }, Gentle: { up: 'specialDefense', down: 'defense' }, Sassy: { up: 'specialDefense', down: 'speed' }, Quirky: { up: null, down: null }, Careful: { up: 'specialDefense', down: 'specialAttack' },
    Timid: { up: 'speed', down: 'attack' }, Hasty: { up: 'speed', down: 'defense' }, Jolly: { up: 'speed', down: 'specialAttack' }, Naive: { up: 'speed', down: 'specialDefense' }, Serious: { up: null, down: null },
  }
  const effect = natureEffects[nature]
  const currentLevel = Number(level) || 0
  const bondMultiplier = bond >= 100 ? 1.06 : bond >= 75 ? 1.03 : 1
  const totalMultiplier = rarityMultipliers[rarity] * sealMultipliers[seal] * bondMultiplier * (1 + stars * 0.04)
  const attributeLabels: Record<keyof typeof ivs, string> = { hp: 'PS', attack: 'Ataque', defense: 'Defesa', specialAttack: 'Ataque Especial', specialDefense: 'Defesa Especial', speed: 'Velocidade' }
  const calculatedStats = Object.keys(attributeLabels).reduce((result, key) => {
    const statKey = key as keyof typeof ivs
    const base = selected?.stats[statKey] ?? 0
    const core = Math.floor(((2 * base * totalMultiplier + (Number(ivs[statKey]) || 0) + Math.floor((Number(evs[statKey]) || 0) / 4)) * currentLevel) / 100)
    const natureMultiplier = statKey === 'hp' || !effect || effect.up === null ? 1 : effect.up === statKey ? 1.1 : effect.down === statKey ? 0.9 : 1
    result[statKey] = statKey === 'hp' ? core + currentLevel + 10 : Math.floor((core + 5) * natureMultiplier)
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

function PokemonList({ entries, selected, status, statSort, onSelect }: { entries: Pokemon[]; selected: Pokemon; status: string; statSort: string; onSelect: (entry: Pokemon) => void }) {
  const sortLabel = statSort === 'Nenhum' ? 'DEX' : `${statSort.toUpperCase()} ↓`
  return <div className="pokedex-list">
    <div className="panel-heading">
      <span>REGISTROS / {entries.length}{status === 'loading' && ' · carregando...'}</span>
      <span className="sort">{sortLabel}</span>
    </div>
    <div className="pokedex-grid">
      {entries.map((entry) => <button className={selected.name === entry.name ? 'pokedex-card selected' : 'pokedex-card'} data-type={entry.type.split(' / ')[0]} key={`${entry.region}-${entry.name}`} onClick={() => onSelect(entry)}>
        <div className="card-top"><span>#{String(entry.id).padStart(3, '0')}</span><span>{entry.region}</span></div>
        <div className="card-image"><img src={entry.image} alt={entry.name} /></div>
        <div className="card-name"><b>{entry.name}</b><span>↗</span></div>
        <div className="card-types">{entry.type.split(' / ').map((type) => <em data-type={type} key={type}>{typeLabel(type)}</em>)}</div>
      </button>)}
    </div>
  </div>
}

const normalizeMoveName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’]/g, "'").replace(/♀/g, ' female').replace(/♂/g, ' male').replace(/\s+/g, ' ').trim()

function compatibleTmsForPokemon(selected: Pokemon): Move[] {
  if (!selected.hasMoveset) return []
  const levelByName = new Map<string, number>()
  for (const move of selected.levelMoves) {
    if (move.level === null) continue
    const key = normalizeMoveName(move.name)
    levelByName.set(key, Math.min(levelByName.get(key) ?? Number.POSITIVE_INFINITY, move.level))
  }
  const explicitTms = new Set(selected.tmMoves.map((move) => normalizeMoveName(move.name)))
  const pokemonTypes = new Set(selected.type.split(' / ').map((type) => type.toLowerCase()))

  return tms.flatMap((move) => {
    const key = normalizeMoveName(move.name)
    const requiredLevel = levelByName.get(key)
    const origins: string[] = []
    if (requiredLevel !== undefined) origins.push('golpe da lista de nível')
    if (explicitTms.has(key)) origins.push('TM indicada na wiki')
    if (pokemonTypes.has(move.type.toLowerCase())) origins.push('TM da tipagem')
    return origins.length ? [{ name: move.name, type: move.type, level: null, origins, requiredLevel: requiredLevel ?? null }] : []
  })
}

function PokemonDetail({ selected, onBack }: { selected: Pokemon; onBack: () => void }) {
  const stats = { HP: selected.stats.hp, ATAQUE: selected.stats.attack, DEFESA: selected.stats.defense, SPA: selected.stats.specialAttack, SPD: selected.stats.specialDefense, SPEED: selected.stats.speed }
  const compatibleTms = compatibleTmsForPokemon(selected)
  return <div className="detail-screen">
    <button className="back-button" onClick={onBack}>← Voltar para Pokedex</button>
    <div className="detail-hero detail-hero-screen" data-type={selected.type.split(' / ')[0]} style={{ '--accent': selected.accent } as React.CSSProperties}>
      <img className="detail-image" src={selected.image} alt={selected.name} />
      <span className="detail-id">#{String(selected.id).padStart(3, '0')} · GERAÇÃO {selected.generation}</span>
      <span className="detail-symbol">◒</span>
      <div><p className="kicker">{selected.region.toUpperCase()} / ESPÉCIE POKÉMON</p><h2>{selected.name}</h2><div className="chips">{selected.type.split(' / ').map((type) => <span data-type={type} key={type}>{typeLabel(type)}</span>)}</div></div>
    </div>
    <div className="detail-columns">
      <section className="detail-block">
        <div className="section-title"><span>STATUS BASE</span></div>
        <PokemonStatsChart stats={selected.stats} type={selected.type.split(' / ')[0]} />
        <div className="section-title move-title"><span>DADOS BASE</span></div>
        <div className="stats"><Stat label="GRUPO-OVO" value={selected.eggGroup || '—'} /><Stat label="FORMA" value={selected.form} /></div>
        <TypeMatchups type={selected.type} />
      </section>
      <section className="detail-block moves-block">
        <MoveSection key={`${selected.name}-level-moves`} title="GOLPES POR NÍVEL" moves={selected.levelMoves} />
        <MoveSection key={`${selected.name}-compatible-tms`} title="TMs QUE APRENDE" moves={compatibleTms} />
      </section>
    </div>
  </div>
}

function PokemonStatsChart({ stats, type }: { stats: Pokemon['stats']; type: string }) {
  const attributes = [
    { key: 'hp', label: 'PS', value: stats.hp },
    { key: 'attack', label: 'Ataque', value: stats.attack },
    { key: 'defense', label: 'Defesa', value: stats.defense },
    { key: 'specialAttack', label: 'Atq. Esp.', value: stats.specialAttack },
    { key: 'specialDefense', label: 'Def. Esp.', value: stats.specialDefense },
    { key: 'speed', label: 'Velocidade', value: stats.speed },
  ]
  const baseTotal = attributes.reduce((sum, attribute) => sum + attribute.value, 0)
  const minimumAtLevel100 = (base: number, key: string) => key === 'hp' ? 2 * base + 110 : Math.floor((2 * base + 5) * 0.9)
  const maximumAtLevel100 = (base: number, key: string) => key === 'hp' ? 2 * base + 204 : Math.floor((2 * base + 99) * 1.1)
  const maximumBase = Math.max(...attributes.map(({ value }) => value), 1)
  const statBand = (value: number) => value < 50 ? 'low' : value < 90 ? 'medium' : 'high'

  return <div className="base-stats-graph" data-type={type} role="table" aria-label={`Status base de ${type}, com intervalos mínimo e máximo no nível 100`}>
    <div className="base-stat-row base-stat-heading" role="row">
      <span role="columnheader">Atributo</span><span role="columnheader">Base</span><span aria-hidden="true" />
      <span role="columnheader">Mín.<small>Lv. 100</small></span><span role="columnheader">Máx.<small>Lv. 100</small></span>
    </div>
    {attributes.map((attribute) => <div className="base-stat-row" role="row" key={attribute.key}>
      <strong className="base-stat-name" role="rowheader">{attribute.label}</strong>
      <b className="base-stat-value" data-band={statBand(attribute.value)} role="cell">{attribute.value}</b>
      <span className="base-stat-track" aria-hidden="true"><i data-band={statBand(attribute.value)} style={{ width: `${attribute.value / maximumBase * 100}%` }} /></span>
      <span className="base-stat-range" role="cell">{minimumAtLevel100(attribute.value, attribute.key)}</span>
      <span className="base-stat-range" role="cell">{maximumAtLevel100(attribute.value, attribute.key)}</span>
    </div>)}
    <div className="base-stat-row base-stat-total" role="row">
      <strong className="base-stat-name" role="rowheader">Total</strong>
      <b className="base-stat-value" role="cell">{baseTotal}</b>
      <span aria-hidden="true" />
      <span className="base-stat-range" role="cell">—</span>
      <span className="base-stat-range" role="cell">—</span>
    </div>
  </div>
}

function TypeMatchups({ type }: { type: string }) {
  const matchups = getTypeMatchups(type)
  const superEffectiveTypes = getSuperEffectiveTypes(type)
  const groups = [
    { title: 'FRAQUEZAS', values: matchups.filter(({ multiplier }) => multiplier > 1) },
    { title: 'RESISTÊNCIAS', values: matchups.filter(({ multiplier }) => multiplier > 0 && multiplier < 1) },
    { title: 'IMUNIDADES', values: matchups.filter(({ multiplier }) => multiplier === 0) },
    { title: 'SUPER EFETIVO CONTRA', values: superEffectiveTypes },
  ]
  return <div className="matchups"><div className="section-title"><span>FRAQUEZAS E RESISTÊNCIAS</span></div>{groups.map((group) => <div className="matchup-group" key={group.title}><small>{group.title}</small><div className="type-pills">{group.values.length ? group.values.map(({ type: attackType, multiplier }) => <span data-type={attackType} className={`type-pill ${group.title.toLowerCase().replaceAll(' ', '-')}`} key={attackType}><b>{typeLabel(attackType)}</b><em>{multiplier === 0.25 ? '×¼' : multiplier === 0.5 ? '×½' : multiplier === 2 ? '×2' : multiplier === 4 ? '×4' : '×0'}</em></span>) : <span className="no-matchup">Nenhuma</span>}</div></div>)}</div>
}

function MoveSection({ title, moves }: { title: string; moves: Move[] }) {
  const [search, setSearch] = useState('')
  const [elementFilter, setElementFilter] = useState('Todos os elementos')
  const [damageFilter, setDamageFilter] = useState('Todos os tipos de dano')
  const [rangeFilter, setRangeFilter] = useState('Todos os alcances')
  const columns: { key: string; label: string }[] = [
    { key: 'level', label: 'Nível' },
    { key: 'name', label: 'Golpe' },
    { key: 'type', label: 'Elemento' },
    { key: 'category', label: 'Tipo de Dano' },
    { key: 'power', label: 'Dano' },
    { key: 'range', label: 'Alcance' },
    { key: 'cooldown', label: 'Recarga' },
  ]
  const originLabels: Record<string, string> = {
    'golpe da lista de nível': 'Aprende por nível',
    'TM indicada na wiki': 'TM específica',
    'TM da tipagem': 'TM do próprio tipo',
  }
  const showMoveMetadata = title === 'GOLPES POR NÍVEL'
  const rangeValue = (move: Move) => moveMetadataByName.get(move.name)?.range ?? 'Indisponível'
  const rangeLabel = (range: string) => range === 'Indisponível' ? 'Alcance indisponível' : moveRangeLabels[range] ?? range
  const availableElements = [...new Set(moves.map((move) => move.type))]
    .sort((first, second) => typeLabel(first).localeCompare(typeLabel(second), 'pt-BR'))
  const availableCategories = [...new Set(moves.map((move) => moveMetadataByName.get(move.name)?.attackCategory ?? 'unknown'))]
    .sort((first, second) => moveCategoryLabels[first].localeCompare(moveCategoryLabels[second], 'pt-BR'))
  const availableRanges = [...new Set(moves.map(rangeValue))]
    .sort((first, second) => rangeLabel(first).localeCompare(rangeLabel(second), 'pt-BR'))
  const normalizedSearch = search.trim().toLowerCase()
  const filteredMoves = moves.filter((move) => {
    const metadata = moveMetadataByName.get(move.name)
    const category = metadata?.attackCategory ?? 'unknown'
    const searchableCategory = moveCategoryLabels[category]
    const range = rangeValue(move)
    const searchableText = `${move.name} ${move.type} ${searchableCategory} ${rangeLabel(range)} ${move.level ?? ''}`.toLowerCase()
    return (elementFilter === 'Todos os elementos' || move.type === elementFilter)
      && (damageFilter === 'Todos os tipos de dano' || category === damageFilter)
      && (rangeFilter === 'Todos os alcances' || range === rangeFilter)
      && searchableText.includes(normalizedSearch)
  })

  return <div className="move-section">
    <div className="section-title"><span>{title}</span></div>
    <div className="move-list source-move-list">
      <div className="move-section-controls">
        <label className="search move-section-search">
          <Search size={15} aria-hidden="true" />
          <input aria-label={`Buscar em ${title.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={title === 'TMs QUE APRENDE' ? 'Buscar TM compatível...' : 'Buscar golpe por nível...'} />
          {search && <button type="button" aria-label={`Limpar busca em ${title.toLowerCase()}`} onClick={() => setSearch('')}><X size={15} /></button>}
        </label>
        <div className="move-section-filters">
          <select className="move-filter-select" aria-label={`Filtrar elemento em ${title.toLowerCase()}`} value={elementFilter} onChange={(event) => setElementFilter(event.target.value)}>
            <option value="Todos os elementos">Todos elementos</option>
            {availableElements.map((element) => <option value={element} key={element}>{typeLabel(element)}</option>)}
          </select>
          <select className="move-filter-select" aria-label={`Filtrar tipo de dano em ${title.toLowerCase()}`} value={damageFilter} onChange={(event) => setDamageFilter(event.target.value)}>
            <option value="Todos os tipos de dano">Todo dano</option>
            {availableCategories.map((category) => <option value={category} key={category}>{moveCategoryLabels[category]}</option>)}
          </select>
          <select className="move-filter-select" aria-label={`Filtrar alcance em ${title.toLowerCase()}`} value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value)}>
            <option value="Todos os alcances">Todos alcances</option>
            {availableRanges.map((range) => <option value={range} key={range}>{rangeLabel(range)}</option>)}
          </select>
        </div>
      </div>
      {filteredMoves.length ? <div className="move-table-scroll"><table className={`source-move-table ${showMoveMetadata ? 'level-move-table' : 'tm-move-table'}`}>
      <thead><tr>{columns.filter(({ key }) => showMoveMetadata || key !== 'level').map(({ key, label }) => <th scope="col" key={key}>{label}</th>)}</tr></thead>
      <tbody>{filteredMoves.map((move) => {
        const metadata = moveMetadataByName.get(move.name)
        const category = metadata?.attackCategory
        const range = metadata?.range
        return <tr key={`${move.name}-${move.level ?? 'tm'}`}>
          {showMoveMetadata && <td><b className={move.level !== null ? 'move-level' : undefined} aria-label={move.level !== null ? `Nível ${move.level}` : 'TM'}>{move.level}</b></td>}
          <td><strong>{move.name}</strong>{showMoveMetadata && (move.origins?.length || move.requiredLevel !== null && move.requiredLevel !== undefined) && <small className="move-facts">{move.origins?.map((origin) => <span className="move-fact" key={origin}>{originLabels[origin] ?? origin}</span>)}{move.requiredLevel !== null && move.requiredLevel !== undefined && <span className="move-fact">Nível {move.requiredLevel}</span>}</small>}</td>
          <td><span className="move-detail move-element" data-type={move.type}>{typeLabel(move.type)}</span></td>
          <td><span className={`move-category move-category-${category ?? 'unknown'}`}>{category ? moveCategoryLabels[category] : 'Categoria indisponível'}</span></td>
          <td><span className={`move-metric move-power ${metadata?.power === null ? 'move-no-power' : ''}`} aria-label={metadata?.power === null ? 'Sem dano direto' : undefined} title={metadata?.power === null ? 'Sem dano direto' : undefined}>{metadata?.power === null ? '—' : metadata?.power !== undefined ? metadata.power : 'Indisponível'}</span></td>
          <td><span className={`move-range move-range-${range ? moveRangeClasses[range] ?? 'unknown' : 'unknown'}`}>{range ? moveRangeLabels[range] ?? range : 'Alcance indisponível'}</span></td>
          <td><span className="move-metric move-cooldown">{metadata?.cooldown ?? 'Indisponível'}</span></td>
        </tr>
      })}</tbody>
    </table></div> : <p className="empty-moves">{moves.length === 0 ? 'A wiki não lista golpes para esta espécie.' : 'Nenhum golpe corresponde à busca e aos filtros.'}</p>}
    </div>
  </div>
}

function Stat({ label, value }: { label: string; value: string }) { return <div><small>{label}</small><b>{value}</b></div> }
function CompatiblePokemonScreen({ move, entries, onBack, onSelect }: { move: TechnicalMove | null; entries: Pokemon[]; onBack: () => void; onSelect: (entry: Pokemon) => void }) {
  return <section className="compatible-pokemon-screen">
    <button type="button" className="back-button" onClick={onBack}>← Voltar para TMs</button>
    <div className="compatible-pokemon-heading"><span>POKÉMON COMPATÍVEIS</span><h2>{move?.name}</h2></div>
    {entries.length ? <div className="compatible-pokemon-grid">{entries.map((entry) => <button type="button" className="compatible-pokemon-card" key={`${entry.region}-${entry.name}`} onClick={() => onSelect(entry)}><img src={entry.image} alt="" /><strong>{entry.name}</strong></button>)}</div> : <p className="empty-moves">Nenhum Pokémon compatível encontrado.</p>}
  </section>
}

function TmTable({ items, sort, onSort, onSelectMove }: { items: typeof tms; sort: { key: 'power' | 'cooldown'; direction: 'asc' | 'desc' } | null; onSort: (key: 'power' | 'cooldown') => void; onSelectMove: (move: TechnicalMove) => void }) {
  return <div className="tm-panel canonical-tm-panel">
    <div className="panel-heading"><span>GOLPES COMPATÍVEIS / {items.length}</span><span className="sort">TIPO ↕</span></div>
    <div className="tm-head canonical-tm-head"><span>GOLPE</span><span>TIPO</span><span>CATEGORIA</span><span>ALCANCE</span><span role="columnheader" aria-sort={sort?.key === 'power' ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" className="tm-sort-button" onClick={() => onSort('power')} aria-label={`Ordenar por dano${sort?.key === 'power' ? sort.direction === 'desc' ? ', decrescente' : ', crescente' : ''}`}>DANO<span aria-hidden="true">{sort?.key === 'power' ? sort.direction === 'desc' ? '↓' : '↑' : '↕'}</span></button></span><span role="columnheader" aria-sort={sort?.key === 'cooldown' ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" className="tm-sort-button" onClick={() => onSort('cooldown')} aria-label={`Ordenar por cooldown${sort?.key === 'cooldown' ? sort.direction === 'desc' ? ', decrescente' : ', crescente' : ''}`}>COOLDOWN<span aria-hidden="true">{sort?.key === 'cooldown' ? sort.direction === 'desc' ? '↓' : '↑' : '↕'}</span></button></span><span>POKÉMON COMPATÍVEIS</span></div>
    {items.map((tm) => <div className="tm-row canonical-tm-row" key={tm.id}>
      <strong data-type={tm.type}>{tm.name}</strong>
      <span data-type={tm.type} className={`type ${tm.type.toLowerCase()}`}>{typeLabel(tm.type)}</span>
      <span className={`move-category move-category-${tm.attackCategory}`}>{moveCategoryLabels[tm.attackCategory]}</span>
      <span className={`move-range move-range-${tm.range ? moveRangeClasses[tm.range] ?? 'unknown' : 'unknown'}`}>{tm.range ? moveRangeLabels[tm.range] ?? tm.range : 'Alcance indisponível'}</span>
      <span className={`move-metric move-power ${tm.power === null ? 'move-no-power' : ''}`}>{tm.power === null ? 'Sem dano' : tm.power ?? 'Indisponível'}</span>
      <span className="move-metric move-cooldown">{tm.cooldown ?? 'Indisponível'}</span>
      <span><button type="button" className="compatible-pokemon-trigger" aria-label={`Ver Pokémon que aprendem ${tm.name}: ${tm.compatibleSpecies} espécies`} onClick={() => onSelectMove(tm)}>{tm.compatibleSpecies} espécies</button></span>
    </div>)}
  </div>
}

function MoveDexTable({ items }: { items: MoveDexEntry[] }) {
  return <div className="tm-panel movedex-panel">
    <div className="panel-heading"><span>GOLPES DISPONÍVEIS / {items.length}</span><span className="sort">NOME A-Z</span></div>
    <div className="tm-head canonical-tm-head"><span>GOLPE</span><span>TIPO</span><span>CATEGORIA</span><span>ALCANCE</span><span>DANO</span><span>COOLDOWN</span><span>POKÉMON COMPATÍVEIS</span></div>
    {items.map((move) => <div className="tm-row canonical-tm-row" key={move.name}>
      <strong data-type={move.type}>{move.name}</strong>
      <span data-type={move.type} className={`type ${move.type.toLowerCase()}`}>{typeLabel(move.type)}</span>
      <span className={`move-category move-category-${move.attackCategory}`}>{moveCategoryLabels[move.attackCategory]}</span>
      <span className={`move-range move-range-${move.range ? moveRangeClasses[move.range] ?? 'unknown' : 'unknown'}`}>{move.range ? moveRangeLabels[move.range] ?? move.range : 'Alcance indisponível'}</span>
      <span className={`move-metric move-power ${move.power === null ? 'move-no-power' : ''}`}>{move.power === null ? 'Sem dano' : move.power ?? 'Indisponível'}</span>
      <span className="move-metric move-cooldown">{move.cooldown ?? 'Indisponível'}</span>
      <span>{move.compatibleSpecies} espécies</span>
    </div>)}
  </div>
}

function CaptureTable({ items, pokemon, sort, onSort }: { items: CaptureEntry[]; pokemon: Pokemon[]; sort: string; onSort: (value: string) => void }) {
  const pokemonByName = new Map(pokemon.map((entry) => [entry.name, entry]))

  return <div className="tm-panel capture-panel">
    <div className="capture-note"><strong>Como ler:</strong> quanto menor a dureza, mais fácil é capturar. A wiki recomenda Ultraball para a tabela de caça. As 8 espécies não capturáveis e os 74 lendários/Megas ficam fora destes registros.</div>
    <div className="panel-heading">
      <span>ESPÉCIES NA TABELA / {items.length}</span>
      <span className="sort">{sort === 'Nome (A-Z)' ? 'NOME A-Z' : sort === 'Dureza (maior)' ? 'DUREZA ↓' : 'DUREZA ↑'}</span>
    </div>
    <div className="tm-head capture-head"><span>ESPÉCIE</span><span>ELEMENTO</span><span><button type="button" className="capture-sort-button" onClick={() => onSort(sort === 'Dureza (maior)' ? 'Dureza (menor)' : 'Dureza (maior)')} aria-label={`Ordenar dureza${sort === 'Dureza (maior)' ? ', do menor para o maior' : ', do maior para o menor'}`}>DUREZA<span aria-hidden="true">{sort === 'Dureza (maior)' ? '↓' : sort === 'Dureza (menor)' ? '↑' : '↕'}</span></button></span><span>FAIXA</span><span>BALL RECOMENDADA</span></div>
    {items.map((entry) => {
      const match = pokemonByName.get(entry.name)
      const elements = match ? match.type.split(' / ').map(typeLabel).join(' e ') : '—'
      const normalizedRange = entry.range.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const rangeTone = normalizedRange.includes('facil') ? 'easy' : normalizedRange.includes('medio') ? 'medium' : normalizedRange.includes('dificil') ? 'hard' : normalizedRange.startsWith('premio') ? 'prize' : normalizedRange.startsWith('durao') ? 'tough' : 'medium'
      return <div className="tm-row capture-row" key={entry.name}><strong>{entry.name}</strong><span className="capture-types">{elements}</span><span className="capture-hardness">{entry.hardness}</span><span className={`capture-range capture-range-${rangeTone}`}>{entry.range}</span><span className="capture-ball">{entry.recommendedBall}</span></div>
    })}
  </div>
}

function getCapturePhaseSuggestion(pokemonName: string) {
  const missionRoutes = clanMissions.flatMap(({ recommendation }) => {
    const routes: { level: number; mapName: string }[] = []
    if (recommendation.regionId && recommendation.level != null && recommendation.pokemon?.some((entry) => entry.name === pokemonName)) {
      routes.push({ level: recommendation.level, mapName: recommendation.hunt ?? recommendation.regionId })
    }
    if (recommendation.singleHunt?.pokemon.some((entry) => entry.name === pokemonName)) {
      routes.push({ level: recommendation.singleHunt.level, mapName: recommendation.singleHunt.hunt })
    }
    recommendation.targets?.filter((entry) => entry.species === pokemonName).forEach((entry) => {
      routes.push({ level: entry.level, mapName: entry.hunt })
    })
    return routes
  }).sort((first, second) => first.level - second.level || first.mapName.localeCompare(second.mapName))
  if (missionRoutes.length) return { ...missionRoutes[0], source: 'Missões' as const }

  const worldPhase = worldRegions
    .filter((entry) => entry.spawns.some((spawn) => spawn.name === pokemonName))
    .sort((first, second) => first.level - second.level || first.name.localeCompare(second.name))[0]
  return worldPhase ? { level: worldPhase.level, mapName: worldPhase.name, source: 'Mundo' as const } : null
}

function CaptureCalculator({ entries, pokemon }: { entries: CaptureEntry[]; pokemon: Pokemon[] }) {
  type Rarity = keyof typeof captureRarityDivisors
  type Ball = keyof typeof captureBallPower
  const [pokemonSearch, setPokemonSearch] = useState('')
  const [showPokemonOptions, setShowPokemonOptions] = useState(false)
  const [rarity, setRarity] = useState<Rarity | ''>('')
  const [ball, setBall] = useState<Ball | ''>('')
  const [favorableWeather, setFavorableWeather] = useState(false)
  const [teamLevel, setTeamLevel] = useState<number | ''>('')
  const [targetLevel, setTargetLevel] = useState<number | ''>('')
  const [partyLevels, setPartyLevels] = useState<Array<number | ''>>(['', '', ''])
  const pokemonPickerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const closeOptionsOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !pokemonPickerRef.current?.contains(event.target)) setShowPokemonOptions(false)
    }
    document.addEventListener('pointerdown', closeOptionsOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOptionsOnOutsideClick)
  }, [])
  const normalizedPokemonSearch = pokemonSearch.trim().toLocaleLowerCase()
  const captureEntry = entries.find((entry) => entry.name.toLocaleLowerCase() === normalizedPokemonSearch)
  const phaseSuggestion = captureEntry ? getCapturePhaseSuggestion(captureEntry.name) : null
  useEffect(() => {
    setTargetLevel(phaseSuggestion?.level ?? '')
  }, [captureEntry?.name, phaseSuggestion?.level])
  const pokemonEntry = captureEntry ? pokemon.find((entry) => entry.name === captureEntry.name) : undefined
  const favoriteWeather = pokemonEntry ? [...new Set(pokemonEntry.type.split(' / ').flatMap((type) => captureWeatherByType[type] ? [captureWeatherByType[type]] : []))] : []
  const matchingPokemon = normalizedPokemonSearch ? entries.filter((entry) => entry.name.toLocaleLowerCase().includes(normalizedPokemonSearch)).slice(0, 8) : entries.slice(0, 8)
  const rarityOptions = Object.keys(captureRarityDivisors) as Rarity[]
  const ballOptions = Object.keys(captureBallPower) as Ball[]
  const teamToTargetRatio = teamLevel !== '' && targetLevel !== '' ? teamLevel / Math.max(1, targetLevel) : null
  const levelPenalty = teamToTargetRatio === null ? 0 : getCaptureLevelPenalty(teamToTargetRatio)
  const hardnessFactor = captureEntry ? (209 / Math.max(1, captureEntry.hardness)) ** 2 : 0
  const weatherMultiplier = favorableWeather ? captureWeatherMultiplier : 1
  const chance = captureEntry && rarity !== '' && ball !== '' && teamToTargetRatio !== null ? Math.min(1, Math.max(0, 0.214 * (captureBallPower[ball] / 13) * hardnessFactor * (1 - levelPenalty) * weatherMultiplier / captureRarityDivisors[rarity])) : null
  const expectedBalls = chance !== null && chance > 0 ? 1 / chance : null
  const percentFormat = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 5 })
  const ballsFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
  const averagePartyLevel = partyLevels.every((level) => level !== '') ? Math.round(partyLevels.reduce((total, level) => total + level, 0) / partyLevels.length) : null

  function updatePartyLevel(index: number, value: string) {
    setPartyLevels((current) => current.map((level, currentIndex) => currentIndex === index ? value === '' ? '' : Math.min(1000, Math.max(1, Number(value) || 1)) : level))
  }

  return <section className="capture-calculator" aria-label="Calculadora de Captura">
    <div className="capture-calculator-note"><strong>Estimativa baseada na wiki.</strong> A fórmula completa não é publicada. O modelo usa a referência de 21,4% (Ultra Ball, Comum, dificuldade mediana, fase 50), força da bola, divisores de raridade e penalidade de nível; dureza recebe uma aproximação quadrática. A wiki usa a média dos três Pokémon ativos contra o nível do alvo, não o nível da conta.</div>
    <div className="capture-calculator-layout">
      <div className="capture-calculator-controls">
        <h2>Dados do encontro</h2>
        <div className="capture-calculator-grid">
          <div className="capture-pokemon-picker" ref={pokemonPickerRef}>
            <label className="capture-calculator-field" htmlFor="capture-pokemon-search"><span>Pokémon</span><input id="capture-pokemon-search" type="text" role="combobox" aria-autocomplete="list" aria-expanded={showPokemonOptions && !captureEntry} aria-controls="capture-pokemon-options" autoComplete="off" placeholder="Digite o nome do Pokémon..." value={pokemonSearch} onFocus={() => setShowPokemonOptions(true)} onChange={(event) => { setPokemonSearch(event.target.value); setShowPokemonOptions(true) }} onKeyDown={(event) => {
              if (event.key === 'Escape') setShowPokemonOptions(false)
              if (event.key === 'Enter' && matchingPokemon.length) { event.preventDefault(); setPokemonSearch(matchingPokemon[0].name); setShowPokemonOptions(false) }
            }} /></label>
            {showPokemonOptions && !captureEntry && <div className="capture-pokemon-options" id="capture-pokemon-options" role="listbox" aria-label="Sugestões de Pokémon">
              {matchingPokemon.length ? matchingPokemon.map((entry) => <button type="button" role="option" aria-selected="false" key={entry.name} onMouseDown={(event) => event.preventDefault()} onClick={() => { setPokemonSearch(entry.name); setShowPokemonOptions(false) }}>{entry.name}</button>) : <span>Nenhum Pokémon encontrado no catálogo capturável.</span>}
            </div>}
          </div>
          <label className="capture-calculator-field"><span>Raridade</span><select value={rarity} onChange={(event) => setRarity(event.target.value as Rarity | '')}><option value="">Selecione a raridade</option>{rarityOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="capture-calculator-field"><span>Pokébola</span><select value={ball} onChange={(event) => setBall(event.target.value as Ball | '')}><option value="">Selecione a Pokébola</option>{ballOptions.map((option) => <option key={option} value={option}>{option} · força {captureBallPower[option]}</option>)}</select></label>
          <label className="capture-calculator-field"><span>Clima</span><select value={favorableWeather ? 'favorable' : 'none'} onChange={(event) => setFavorableWeather(event.target.value === 'favorable')}><option value="none">Sem clima</option><option value="favorable">Com clima</option></select></label>
          <label className="capture-calculator-field"><span>Média do nível do time (3 ativos)</span><input type="number" min="1" max="1000" placeholder="Digite a média" value={teamLevel} onChange={(event) => { const value = event.target.value; setTeamLevel(value === '' ? '' : Math.min(1000, Math.max(1, Number(value)))) }} /></label>
          <label className="capture-calculator-field"><span>Nível da fase/alvo</span><input type="number" min="1" max="1000" placeholder="Digite o nível da fase" value={targetLevel} onChange={(event) => { const value = event.target.value; setTargetLevel(value === '' ? '' : Math.min(1000, Math.max(1, Number(value)))) }} /></label>
          {phaseSuggestion && <small className="capture-phase-suggestion">Fase sugerida: {phaseSuggestion.mapName} · nível {phaseSuggestion.level} ({phaseSuggestion.source})</small>}
          {captureEntry && <small className="capture-weather-hint">Dica para {captureEntry.name}: clima favorável {favoriteWeather.length ? `${favoriteWeather.join(' e ')} pelo tipo` : 'não identificado pelos tipos'}; céu limpo não altera a captura. Se o clima atual coincidir, use “Com clima” (×2,5). <a href="https://pokehunt-wiki.gitbook.io/pokehunt-wiki/mecanicas-centrais/clima" target="_blank" rel="noreferrer">Regras do clima</a>.</small>}
        </div>
        <p className="capture-selected-hardness">Dureza oficial: <strong>{captureEntry?.hardness ?? '—'}</strong> · Faixa: <strong>{captureEntry?.range ?? 'Selecione um Pokémon'}</strong></p>
      </div>
      <div className="capture-calculator-results" aria-live="polite">
        <h2>Resultado estimado</h2>
        <div className="capture-calculator-metric"><span>Chance por arremesso</span><strong>{chance !== null ? percentFormat.format(chance) : '—'}</strong></div>
        <div className="capture-calculator-metric"><span>Média esperada para capturar 1</span><strong>{expectedBalls !== null && Number.isFinite(expectedBalls) ? `~${ballsFormat.format(expectedBalls)} ${expectedBalls === 1 ? 'bola' : 'bolas'}` : '—'}</strong></div>
        <p>Multiplicador de clima aplicado: ×{weatherMultiplier.toFixed(2).replace('.', ',')}</p>
        <p>Tipo do Pokémon: {pokemonEntry ? pokemonEntry.type.split(' / ').map(typeLabel).join(' / ') : captureEntry ? 'indisponível' : 'selecione uma espécie válida'}</p>
        <small>A média usa tentativas independentes com a mesma chance. Use “Com clima” quando a espécie estiver no clima favorito; esse bônus não vale para lendários, Megas, pseudo-lendários e Ditto. Shiny e o piso especial de dificuldade em fases 45+ não são modelados.</small>
      </div>
    </div>
    <section className="capture-party-average" aria-label="Calculadora da média de nível do time">
      <div className="capture-party-average-fields">
        {partyLevels.map((level, index) => <label className="capture-party-average-field" key={index}>
          <span>Pokémon {index + 1}</span>
          <input type="number" min="1" max="1000" placeholder="Nível" aria-label={`Nível do Pokémon ${index + 1}`} value={level} onChange={(event) => updatePartyLevel(index, event.target.value)} />
        </label>)}
      </div>
      <div className="capture-party-average-result">
        <span>Média do time</span>
        <strong>{averagePartyLevel === null ? '—' : averagePartyLevel}</strong>
        <button type="button" disabled={averagePartyLevel === null} onClick={() => { if (averagePartyLevel !== null) setTeamLevel(averagePartyLevel) }}><Calculator size={16} /> Usar média</button>
      </div>
    </section>
    <a className="capture-calculator-source" href="https://pokehunt-wiki.gitbook.io/pokehunt-wiki/captura-e-colecao/captura" target="_blank" rel="noreferrer">Consultar regras de captura na wiki</a>
  </section>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
