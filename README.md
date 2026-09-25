# PokeHunt Atlas

Base React + Vite para a database/wiki do PokeHunt.

## Desenvolvimento

1. Instale Node.js LTS: https://nodejs.org/
2. No terminal, execute `npm install`.
3. Execute `npm run dev`.

O catálogo local em `src/pokemon-data.json` contém as 747 espécies sincronizadas da wiki oficial, incluindo formas e os seis status base. Para atualizar os dados quando a wiki mudar, execute `npm run sync:pokemon`.

A fonte planejada para os dados é a [PokeHunt Wiki](https://pokehunt-wiki.gitbook.io/pokehunt-wiki). Os registros exibidos agora são dados iniciais de interface e devem ser substituídos pelos dados conferidos da wiki antes da publicação.
