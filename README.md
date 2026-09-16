# AI Agent Control Plane — MVP scaffold

> Discover, control and audit every AI agent in your company.

This is a first working scaffold for the product described in the
project's planning documents: an agent registry, a deterministic risk
engine, a deterministic policy engine, an activity timeline, incidents,
and a basic evidence view.

## What's here (MVP slice)

- **Agent registry** — manual/seeded agents with owner, model, framework,
  environment, autonomy, permissions and data access.
- **Permission graph** — per-agent view of what tools and data it can reach.
- **Risk engine** (`src/lib/risk-engine.ts`) — deterministic, explainable
  scoring. No LLM in the scoring path, by design (see the project's
  architectural principle: *Claude is not the source of truth*).
- **Policy engine** (`src/lib/policy-engine.ts`) — small JSON rule
  conditions evaluated in code against a proposed action.
- **Activity timeline, Incidents, Evidence** — read views over the same
  Postgres tables that are the actual source of truth.

## What's intentionally NOT here yet

- Authentication / multi-tenant login (single demo org, hardcoded `demo-org`).
- Real discovery integrations (Entra, GitHub, OpenAI, Anthropic APIs).
- Claude-powered risk explanation / report generation.
- Runtime enforcement (the policy engine exists but nothing calls it live
  yet from a real agent — see `policy-engine.ts` for the evaluation API).

These are the natural next milestones per the phased roadmap discussed
for this project.

## Local development

```bash
npm install
cp .env.example .env   # point DATABASE_URL at a local or hosted Postgres
npm run db:push        # create tables from prisma/schema.prisma
npm run db:seed        # populate demo data
npm run dev
```

## Deploying on Railway

1. Attach a **PostgreSQL** plugin to this service in the Railway project.
2. Set this service's `DATABASE_URL` variable to the Postgres plugin's
   reference variable (`${{Postgres.DATABASE_URL}}`).
3. Railway's Railpack builder auto-detects Next.js — no extra config
   needed. `npm run build` runs `prisma generate && next build`.
4. After the first successful deploy, run once (Railway shell or a
   one-off job):
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```
5. Generate a public domain for the service to get a URL.

## Data model

See `prisma/schema.prisma`. Tables: `organizations`, `users`, `agents`,
`tools`, `data_assets`, `agent_permissions`, `agent_data_access`,
`policies`, `policy_evaluations`, `activities`, `risk_assessments`,
`incidents`, `approvals`, `evidence`, `integrations`.
