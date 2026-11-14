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
4. Execute `npm run dev`.

## Sincronização automática de membros

A rota `GET /api/cron/sync-roster` consulta o roster atual do clã configurado e chama a função protegida `sync_inglorious_clan_roster` no Supabase.

A rota exige o cabeçalho:

```http
Authorization: Bearer <CRON_SECRET>
```

A rotina valida a fotografia completa antes de gravar, não aceita listas vazias ou tags duplicadas e mantém o histórico de entradas, saídas e períodos de permanência no banco independente do Inglorious.

A rota está implementada, mas não foi agendada nem ativada em produção. Nenhum deploy foi realizado.

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

As rotas não estão agendadas. O agendamento será configurado somente após validação completa e autorização para ativar as automações em ambiente publicado.
