export type PokemonType = 'Normal' | 'Fire' | 'Water' | 'Electric' | 'Grass' | 'Ice' | 'Fighting' | 'Poison' | 'Ground' | 'Flying' | 'Psychic' | 'Bug' | 'Rock' | 'Ghost' | 'Dragon' | 'Dark' | 'Steel' | 'Fairy'

type AttackProfile = { superEffective: PokemonType[]; resistant: PokemonType[]; immune: PokemonType[] }

const chart: Record<PokemonType, AttackProfile> = {
  Normal: { superEffective: [], resistant: ['Rock', 'Steel'], immune: ['Ghost'] },
  Fire: { superEffective: ['Grass', 'Ice', 'Bug', 'Steel'], resistant: ['Fire', 'Water', 'Rock', 'Dragon'], immune: [] },
  Water: { superEffective: ['Fire', 'Ground', 'Rock'], resistant: ['Water', 'Grass', 'Dragon'], immune: [] },
  Electric: { superEffective: ['Water', 'Flying'], resistant: ['Electric', 'Grass', 'Dragon'], immune: ['Ground'] },
  Grass: { superEffective: ['Water', 'Ground', 'Rock'], resistant: ['Fire', 'Grass', 'Poison', 'Flying', 'Bug', 'Dragon', 'Steel'], immune: [] },
  Ice: { superEffective: ['Grass', 'Ground', 'Flying', 'Dragon'], resistant: ['Fire', 'Water', 'Ice', 'Steel'], immune: [] },
  Fighting: { superEffective: ['Normal', 'Ice', 'Rock', 'Dark', 'Steel'], resistant: ['Poison', 'Flying', 'Psychic', 'Bug', 'Fairy'], immune: ['Ghost'] },
  Poison: { superEffective: ['Grass', 'Fairy'], resistant: ['Poison', 'Ground', 'Rock', 'Ghost'], immune: ['Steel'] },
  Ground: { superEffective: ['Fire', 'Electric', 'Poison', 'Rock', 'Steel'], resistant: ['Grass', 'Bug'], immune: ['Flying'] },
  Flying: { superEffective: ['Grass', 'Fighting', 'Bug'], resistant: ['Electric', 'Rock', 'Steel'], immune: [] },
  Psychic: { superEffective: ['Fighting', 'Poison'], resistant: ['Psychic', 'Steel'], immune: ['Dark'] },
  Bug: { superEffective: ['Grass', 'Psychic', 'Dark'], resistant: ['Fire', 'Fighting', 'Poison', 'Flying', 'Ghost', 'Steel', 'Fairy'], immune: [] },
  Rock: { superEffective: ['Fire', 'Ice', 'Flying', 'Bug'], resistant: ['Fighting', 'Ground', 'Steel'], immune: [] },
  Ghost: { superEffective: ['Psychic', 'Ghost'], resistant: ['Dark'], immune: ['Normal'] },
  Dragon: { superEffective: ['Dragon'], resistant: ['Steel'], immune: ['Fairy'] },
  Dark: { superEffective: ['Psychic', 'Ghost'], resistant: ['Fighting', 'Dark', 'Fairy'], immune: [] },
  Steel: { superEffective: ['Ice', 'Rock', 'Fairy'], resistant: ['Fire', 'Water', 'Electric', 'Steel'], immune: [] },
  Fairy: { superEffective: ['Fighting', 'Dragon', 'Dark'], resistant: ['Fire', 'Poison', 'Steel'], immune: [] },
}

export type TypeMatchup = { type: PokemonType; multiplier: number }

export function getTypeMatchups(typeString: string): TypeMatchup[] {
  const defendingTypes = typeString.split(' / ') as PokemonType[]
  return (Object.keys(chart) as PokemonType[]).map((attackingType) => {
    const profile = chart[attackingType]
    const multiplier = defendingTypes.reduce((total, defendingType) => {
      if (profile.immune.includes(defendingType)) return 0
      if (profile.superEffective.includes(defendingType)) return total * 2
      if (profile.resistant.includes(defendingType)) return total * 0.5
      return total
    }, 1)
    return { type: attackingType, multiplier }
  })
}
