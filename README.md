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
    pnpm db:seed                # load prisma/data/items.json (reconciles; `-- --dry-run` to preview)
    pnpm dev

`pnpm verify` checks the totals against an independent expansion of the seed data; it should print `MATCH`.
`pnpm verify-reconcile` checks the seed reconciler on copies of the data (no database).

## Updating game data

After a game update, see [scripts/extract/README.md](scripts/extract/README.md).

## Layout

| Path | What |
|---|---|
| `app/page.tsx` | The page; loads the catalog per request |
| `components/planner/` | Plan list, search, totals |
| `services/<feature>/` | Everything that touches the database, one folder per feature (see below) |
| `services/catalog/` | Game data: zod schemas, cached catalog query (`catalog` tag), totals check |
| `lib/plan.ts` | Recipe expansion (pure, used in the browser too) |
| `lib/plan-store.ts` | Plan in localStorage, validated with the plan schema |
| `prisma/` | Schema, migrations, seed and seed data |

## Services

Server components and server actions call services; there is no API layer, and nothing outside `services/` uses `db`.
Services are split by feature, not by table (an item and its recipe lines change together), and each feature by file:

| File | What | Server only |
|---|---|---|
| `schema.ts` | zod schemas and the types inferred from them | no, the browser imports it |
| `queries.ts`, `mutations.ts` | Reads and writes for the app | yes (`import "server-only"`) |
| `load.ts` | Uncached loaders that take a Prisma client, for scripts run with tsx | no |
| `checks.ts` | The feature's own validation for complex operations (e.g. `verifyTotals`, `checkReconcile`) | no, pure |
| other files | Feature-specific operations, e.g. `catalog/reconcile.ts` for game data imports | as needed |

Game data © Miju Games; this is an unofficial fan tool.
