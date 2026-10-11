# Planet Crafter planner

Pick what you want to build in [The Planet Crafter](https://store.steampowered.com/app/1284190/The_Planet_Crafter/)
and see the raw resources it takes, expanded all the way down through every component.

Your plan is kept in your browser. Game data lives in Postgres.

## Stack

Next.js 16 (App Router, Cache Components) · Tailwind 4 · shadcn/ui · Prisma 7 + PostgreSQL · pino

## Run locally

Needs Node 24, pnpm and a Postgres database.

    cp .env.example .env        # then set DATABASE_URL
    pnpm install
    pnpm db:migrate             # create tables
    pnpm db:seed                # load prisma/data/items.json
    pnpm dev

`pnpm verify` checks the totals against an independent expansion of the seed data; it should print `MATCH`.

## Updating game data

After a game update, see [scripts/extract/README.md](scripts/extract/README.md).

## Layout

| Path | What |
|---|---|
| `app/page.tsx` | The page; loads the catalog per request |
| `components/planner/` | Plan list, search, totals |
| `lib/plan.ts` | Recipe expansion (pure) |
| `lib/catalog.ts` | Cached catalog query (`catalog` tag, for revalidating after data edits) |
| `lib/plan-store.ts` | Plan in localStorage |
| `prisma/` | Schema, migrations, seed and seed data |

Game data © Miju Games; this is an unofficial fan tool.
