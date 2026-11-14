# Inglorious

Painel independente de gestão e acompanhamento do clã Inglorious (`#2RVQ9YGRY`).

## Stack

- Next.js 15 / React 19 / TypeScript
- Supabase com acesso exclusivamente pelo servidor
- Vercel para hospedagem, sem implantação autorizada nesta etapa

## Desenvolvimento local

1. Instale Node.js 20.19 ou 22.
2. Copie `.env.example` para `.env.local`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente local.
4. Execute `npm install` e `npm run dev`.

A chave `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta em variáveis `NEXT_PUBLIC_*` nem enviada ao navegador.

## Estado

- Projeto Next.js inicial criado na branch `work/initial-implementation`.
- Banco Supabase independente provisionado.
- Regras de pontuação do código atual do Ghost Hunt portadas, com elegibilidade adaptada ao Telegram e aos cargos do Inglorious.
- Nenhuma informação de jogadores foi importada.
- Nenhuma implantação, publicação, domínio ou integração com o Ghost Hunt foi realizada.
