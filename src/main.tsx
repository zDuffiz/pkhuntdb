import React, { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { loadPokemon, pokemonFallback, technicalMoves, type Move, type Pokemon } from './data'
import { getTypeMatchups } from './type-chart'
import './styles.css'
import './image-overrides.css'
import './detail-overrides.css'
import './matchup-overrides.css'
import './pokedex-overrides.css'
import './tm-overrides.css'
import './theme-overrides.css'
import './joy-theme.css'

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
  const [view, setView] = useState<'pokemon' | 'tms' | 'detail'>('pokemon')
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
  const regions = ['Todas Regiões', ...new Set(pokemon.map((entry) => entry.region))]

  function openPokemon(entry: Pokemon) {
    setSelected(entry)
    setView('detail')
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✦</span><span>PK HUNT<br /><b>DATABASE</b></span></div>
        <p className="eyebrow">GUIA DO TREINADOR</p>
        <nav>
          <button className={view !== 'tms' ? 'nav-item active' : 'nav-item'} onClick={() => setView('pokemon')}><span>◈</span> Pokedex <strong>{pokemon.length}</strong></button>
          <button className={view === 'tms' ? 'nav-item active' : 'nav-item'} onClick={() => setView('tms')}><span>▦</span> TMs <strong>{tms.length}</strong></button>
        </nav>
        <div className="sidebar-foot"><span className="status-dot" /> {status === 'ready' ? 'Dados prontos para explorar' : status === 'error' ? 'Modo offline' : 'Buscando dados da wiki'}<br /><small>Uma jornada PokeHunt</small></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><p className="kicker">PK HUNT DATABASE / CENTRAL DE TREINADORES</p><h1>{view === 'detail' ? selected.name : view === 'pokemon' ? 'Sua Pokédex' : 'Golpes & TMs'}</h1></div><div className="version">{status === 'ready' ? '747' : '...'} ESPÉCIES <span>ATUALIZADO</span></div></header>
        {view === 'detail' ? <PokemonDetail selected={selected} onBack={() => setView('pokemon')} /> : <>
          <div className="toolbar"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'pokemon' ? 'Encontre um Pokémon, tipo ou região...' : 'Qual golpe você procura?'} /></label>{view === 'pokemon' ? <><select aria-label="Filtrar por região" value={region} onChange={(event) => setRegion(event.target.value)}>{regions.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filtrar por forma" value={megaFilter} onChange={(event) => setMegaFilter(event.target.value)}><option>Todas as formas</option><option>Apenas Megas</option></select><select aria-label="Ordenar Pokémon" value={sort} onChange={(event) => setSort(event.target.value)}><option>Nome (A-Z)</option><option>Ordem Pokédex</option></select></> : <><select aria-label="Filtrar TMs por tipo" value={tmType} onChange={(event) => setTmType(event.target.value)}><option>Todos os tipos</option>{[...new Set(tms.map((item) => item.type))].sort().map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}</select><select aria-label="Filtrar TMs por alcance" value={tmRange} onChange={(event) => setTmRange(event.target.value)}><option>Todos os alcances</option><option>Área</option><option>Alvo único</option></select><select aria-label="Ordenar TMs" value={tmSort} onChange={(event) => setTmSort(event.target.value)}><option>Nome (A-Z)</option><option>Poder (maior)</option><option>Recarga (menor)</option></select></>}</div>
          {view === 'pokemon' ? <PokemonList entries={filteredPokemon} selected={selected} status={status} sort={sort} onSelect={openPokemon} /> : <TmTable items={filteredTms} />}
        </>}
      </section>
    </main>
  )
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
  return <div className="move-section"><div className="section-title"><span>{title}</span><i>{number}</i></div>{moves.length ? <div className="move-list">{moves.map((move) => { const details = tms.find((item) => item.name === move.name); const attackCategory = details?.attackCategory ?? (move.power === null ? 'status' : 'special'); const effectCategory = attackCategory === 'status' || move.power === null ? 'Status' : 'Dano'; return <div key={`${move.name}-${move.level}`}><b>{move.level ? `Nível ${move.level}` : 'TM'}</b><span>{move.name}</span><em data-type={move.type}>{typeLabel(move.type)} · {move.power ?? 'STATUS'} · {move.cooldown}</em><small className="move-facts">{attackCategory !== 'status' && <span className={`move-fact attack-${attackCategory}`}>{moveAttackLabel(attackCategory)}</span>}<span className="move-fact">{details?.isArea ? 'Área' : 'Alvo único'}</span><span className={`move-fact effect-${effectCategory.toLowerCase()}`}>{effectCategory}</span></small></div> })}</div> : <p className="empty-moves">A wiki ainda não publicou moveset para esta espécie.</p>}</div>
}

function Stat({ label, value }: { label: string; value: string }) { return <div><small>{label}</small><b>{value}</b></div> }
function TmTable({ items }: { items: typeof tms }) { return <div className="tm-panel"><div className="panel-heading"><span>GOLPES E TMs / {items.length}</span><span className="sort">TIPO ↕</span></div><div className="tm-head"><span>GOLPE</span><span>TIPO</span><span>ATAQUE</span><span>PODER</span><span>RECARGA</span><span>CATEGORIA</span><span>ALCANCE</span></div>{items.map((tm) => <div className="tm-row" key={tm.id}><strong data-type={tm.type}>{tm.name}</strong><span data-type={tm.type} className={`type ${tm.type.toLowerCase()}`}>{typeLabel(tm.type)}</span><span className={`attack-category ${tm.attackCategory}`}><i>{attackCategoryIcon(tm.attackCategory)}</i>{attackCategoryLabel(tm.attackCategory)}</span><span>{tm.power ?? '—'}</span><span>{tm.cooldown}</span><span>{tm.category.replace('Utilitário / Status', 'Utilitário / Estado')}</span><span>{tm.range.replace('Alvo único', 'Alvo único')}</span></div>)}</div> }

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
