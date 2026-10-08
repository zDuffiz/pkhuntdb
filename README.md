# PK HUNT DATABASE

Base React + Vite para a database/wiki do PokeHunt.

## Desenvolvimento

1. Instale Node.js LTS: https://nodejs.org/
2. No terminal, execute `npm install`.
3. Execute `npm run dev`.

## Autenticação (Supabase)

Sem credenciais Supabase, o site permanece disponível no modo visitante e os botões de autenticação ficam desativados. Para ativar contas com e-mail/senha, nome de usuário e Google:

1. Crie um projeto no Supabase e copie `.env.example` para `.env`. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL e a chave publicável/anon do projeto. Nunca coloque a `service_role` key em variáveis `VITE_` nem no navegador.
2. Instale e autentique o Supabase CLI local com `npx supabase login`. Liste projetos acessíveis com `npx supabase projects list` e vincule o projeto escolhido com `npx supabase link --project-ref <project-ref>`.
3. No painel do projeto, configure Auth > URL Configuration: use uma URL publicada como Site URL e adicione `http://localhost:5173/pkhuntdb/` e a URL publicada à lista de Redirect URLs.
4. Aplique as migrations com `npx supabase db push` e publique as funções `npx supabase functions deploy login-with-username` e `npx supabase functions deploy request-password-reset`. Ambas usam a chave `service_role` somente no servidor.
5. Para Google, configure o provedor Google em Auth > Providers com as credenciais OAuth do Google. Adicione a URL de callback exibida pelo Supabase no Google Cloud Console e mantenha as URLs local e publicada na lista de redirects autorizados.
6. Reinicie `npm run dev` depois de preencher `.env`. O Supabase mantém a sessão entre visitas até o usuário selecionar “Sair”. Se a confirmação de e-mail estiver habilitada, o cadastro solicita a confirmação antes do primeiro acesso.

Em Auth > Settings no Supabase, defina o comprimento mínimo de senha como 10 e habilite os requisitos de letras maiúsculas, minúsculas, números e símbolos. O formulário já valida esses mesmos critérios antes de enviar o cadastro.

O schema de perfis e nomes de usuário está em `supabase/migrations/20261008000000_profiles.sql`; o login por nome consulta esse perfil e valida a senha pelo Auth do Supabase, sem expor o e-mail associado.

A redefinição aceita e-mail ou nome de usuário; a função `request-password-reset` envia a recuperação sem revelar se uma conta existe e redireciona para o app para cadastrar a nova senha.

## Acesso VIP

O arquivo privado `supabase/functions/_shared/vip-emails.ts` contém somente a lista de e-mails aprovados como VIP. Adicione um e-mail após confirmar a doação e publique a atualização com `npx supabase functions deploy get-membership`. Contas autenticadas fora da lista e visitantes são FREE. A lista não é importada pelo frontend; o endpoint de nível exige JWT e retorna apenas `free` ou `vip` para a própria sessão.

Os níveis `FREE` e `VIP` continuam sendo identificados e exibidos na conta, mas todas as ferramentas estão liberadas temporariamente para todos. Para reativar as restrições futuras, altere `vipAccessRestrictionsEnabled` de `false` para `true` em `src/main.tsx`. As ferramentas selecionadas para VIP são **Missões/Tracker**, **Calculadora de Status** e **Calculadora de Captura**.

O catálogo local mantém as 747 entradas da Pokédex, atributos, imagens e os seis status base. Golpes por nível, TMs específicas e a compatibilidade por tipagem seguem o gerador `gerar_catalogo_pkhunt.py`, usando 745 movesets e 360 golpes da Movedex. Abra e Ditto não têm moveset publicado e ficam sem golpes inventados.

Para atualizar o snapshot, execute o gerador com `--site-json src/canonical-catalog.json` e depois rode `npm run sync:pokemon` e `npm run sync:move-categories`. A segunda etapa cruza os 360 nomes do catálogo com a classificação Físico/Especial/Status do Pokémon Database; ela não acrescenta golpes ao catálogo.
