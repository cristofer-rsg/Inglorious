# Inglorious

Aplicação independente para gestão e acompanhamento do clã Inglorious.

## Stack

- Next.js 15 e React 19
- TypeScript
- Supabase independente
- Integração server-side com a API do Clash of Clans

## Configuração local

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Configure as variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase Inglorious.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave secreta do servidor; nunca usar prefixo `NEXT_PUBLIC_`.
   - `CLASH_OF_CLANS_API_TOKEN`: token da API Clash of Clans.
   - `CRON_SECRET`: segredo aleatório usado para proteger as rotas de automação.
   - `CLAN_TAG`: tag do clã.
   - `APP_TIME_ZONE`: fuso horário da aplicação.
   - `ADMIN_USERNAME`: usuário administrativo, configurado somente em variável privada do servidor.
   - `ADMIN_PASSWORD`: senha administrativa forte, configurada somente em variável privada do servidor.
   - `AUTH_RATE_LIMIT_SECRET`: segredo aleatório exclusivo para proteger o identificador das tentativas de login; se ausente, a aplicação usa `CRON_SECRET` como alternativa.
   - `ANALYTICS_HASH_SECRET`: segredo privado para gerar identificadores anônimos de visitantes; se ausente, usa `AUTH_RATE_LIMIT_SECRET` ou `CRON_SECRET`.
4. Execute `npm run dev`.

## Sincronização automática de membros

A rota `GET /api/cron/sync-roster` consulta o roster atual do clã configurado e chama a função protegida `sync_inglorious_clan_roster` no Supabase.

A rota exige o cabeçalho:

```http
Authorization: Bearer <CRON_SECRET>
```

A rotina valida a fotografia completa antes de gravar, não aceita listas vazias ou tags duplicadas e mantém o histórico de entradas, saídas e períodos de permanência no banco independente do Inglorious. As rotinas de guerra, Liga e Raide resolvem os participantes pelo histórico de tags, preservando a pontuação conquistada mesmo quando um jogador deixa o roster atual.

A rota está implementada, mas não foi agendada nem ativada em produção. Nenhum deploy foi realizado.

## Recursos administrativos e análise

- O painel administrativo permite criar, editar e excluir lançamentos manuais. Os registros automáticos ficam protegidos contra edição/exclusão por esse fluxo para preservar a idempotência das sincronizações.
- Guerras, Liga, doações e Jogos do Clã podem receber lançamentos manuais identificados; Raide e Capital permanecem automáticos para evitar duplicidade.
- A aba Desempenho permite selecionar o mês, pesquisar por nome/tag e comparar seis categorias com índice independente de até 600 pontos (100 por categoria), sem alterar o ranking oficial.
- A página inicial destaca novas entradas identificadas pela sincronização, sem confundir o roster inicial de referência com novos membros.
- O histórico mensal possui página pública e rota protegida `GET /api/cron/archive-month`; a rota arquiva o mês anterior somente quando existem dados e não cria temporadas vazias.
- O painel administrativo exporta o histórico de eventos em CSV e apresenta visualizações, visitantes distintos, páginas mais acessadas e tipos de dispositivo nos últimos 30 dias.
- A análise registra somente caminho da página, host de referência, tipo de dispositivo e hash HMAC do visitante. Endereços IP não são armazenados e dados geográficos não são coletados.

## Segurança

- A chave `SUPABASE_SERVICE_ROLE_KEY` e o token do Clash são usados exclusivamente no servidor.
- O cliente web não acessa diretamente as tabelas protegidas.
- Rotas de automação exigem segredo de autorização.
- O projeto não importa dados do Ghost Hunt.

## Rotas de automação implementadas

Todas exigem `Authorization: Bearer <CRON_SECRET>` e são executadas exclusivamente no servidor:

- `GET /api/cron/sync-roster`: sincroniza membros, entradas, saídas e períodos de permanência.
- `GET /api/cron/sync-capital`: coleta o total de contribuições de Capital e registra somente diferenças após o baseline.
- `GET /api/cron/sync-donations`: acumula doações mensais considerando reinícios do contador sazonal.
- `GET /api/cron/sync-clan-games`: observa a conquista Games Champion, detecta automaticamente o início dos Jogos do Clã e atualiza o desempenho.
- `GET /api/cron/sync-raid`: sincroniza ataques do Raide e aplica a pontuação automática de +5 para quem realizou pelo menos cinco ataques, respeitando o limite mensal existente.
- `GET /api/cron/sync-wars`: sincroniza ataques, estrelas, espelhos, penalidades e conclusão das guerras normais.
- `GET /api/cron/sync-league`: percorre as guerras da Liga, sincroniza ataques e pontuação, e verifica o bônus de conclusão dos sete ataques.
- `GET /api/cron/archive-month`: arquiva a classificação do mês anterior quando há atividade registrada.

As rotas não estão agendadas. O agendamento será configurado somente após validação completa e autorização para ativar as automações em ambiente publicado.

## Banco de dados e migrations

O projeto Supabase independente já possui 45 migrations aplicadas no ambiente remoto. Os arquivos SQL históricos ainda não estão versionados nesta branch. Até que o histórico completo seja recuperado e sincronizado, não execute `supabase db reset`, recriação do projeto ou sincronização de schema que possa sobrescrever o banco existente.

## Validação

Execute localmente:

```bash
npm run typecheck
npm test
npm run build
```

A integração contínua executa as três verificações em cada atualização da branch de desenvolvimento. Os testes automatizados cobrem regras de elegibilidade, cálculo de pontuação, proteção contra origem cruzada, calendário do Raide, limites de concorrência das consultas, snapshots mensais sem ambiguidade, períodos com fuso horário e horário de verão e validação estrita dos horários retornados pela API do Clash.

As rotinas de doações, Jogos do Clã, Capital, Raide, Guerras e Liga usam procedimentos transacionais no Supabase para impedir gravações parciais. Os procedimentos de sincronização possuem execução restrita ao papel `service_role`.

Os testes de integração com a API do Clash dependem de um token válido e de dados reais do clã. Não são executados automaticamente no CI para evitar chamadas externas e alterações no banco.
