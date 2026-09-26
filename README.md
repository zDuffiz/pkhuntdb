# PK HUNT DATABASE

Base React + Vite para a database/wiki do PokeHunt.

## Desenvolvimento

1. Instale Node.js LTS: https://nodejs.org/
2. No terminal, execute `npm install`.
3. Execute `npm run dev`.

O catálogo local mantém as 747 entradas da Pokédex, atributos, imagens e os seis status base. Golpes por nível, TMs específicas e a compatibilidade por tipagem seguem o gerador `gerar_catalogo_pkhunt.py`, usando 745 movesets e 360 golpes da Movedex. Abra e Ditto não têm moveset publicado e ficam sem golpes inventados.

Para atualizar o snapshot, execute o gerador com `--site-json src/canonical-catalog.json` e depois rode `npm run sync:pokemon` e `npm run sync:move-categories`. A segunda etapa cruza os 360 nomes do catálogo com a classificação Físico/Especial/Status do Pokémon Database; ela não acrescenta golpes ao catálogo.
