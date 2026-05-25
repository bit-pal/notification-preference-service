# Notification Preferences Service

Single source of truth for user notification preferences: defaults, per-user overrides, global regional policies, and quiet hours.

## Stack

- TypeScript, Node.js, Express
- PostgreSQL
- Vitest + Supertest

## Quick start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) or a local PostgreSQL instance

### Database

```bash
docker compose up -d
cp .env.example .env
```

### Install and run

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

`npm run seed` applies default preferences and global policies (safe to re-run). `npm run dev` and `npm start` also seed on startup.

API listens on `http://localhost:3000`.

### Production build

```bash
npm run build
npm start
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/:id/preferences` | Current effective preferences (defaults + overrides) and quiet hours |
| POST | `/users/:id/preferences` | Update channel toggles and/or quiet hours; optional `idempotencyKey` |
| POST | `/evaluate` | Decide whether a notification may be sent |
| GET | `/health` | Health check |

### Evaluate example

```bash
curl -X POST http://localhost:3000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-1",
    "notificationType": "marketing_sms",
    "channel": "sms",
    "region": "EU",
    "datetime": "2026-05-21T12:00:00Z"
  }'
```

Response:

```json
{
  "decision": "deny",
  "reason": "blocked_by_global_policy"
}
```

Evaluation order: global policy → user/default preference → quiet hours (marketing only; transactional bypasses quiet hours).

## Tests

Requires PostgreSQL running with the same `DATABASE_URL` as in `.env`.

```bash
npm test
```

Unit tests run without a database. Integration tests require PostgreSQL; set `DATABASE_URL` if your instance does not use `postgres://nps:nps@localhost:5432/notification_preferences`. If the database is unreachable, integration tests are skipped automatically.

## Architecture

```
src/
  domain/          Pure types, quiet-hours logic, evaluation resolver
  application/     PreferenceService orchestration
  infrastructure/  PostgreSQL repositories, logging, metrics stub
  api/             Express routes and Zod validation
```

New users are created on first access; effective preferences merge `default_preferences` with `user_preferences` overrides. Idempotent updates are stored in `preference_change_log` by `idempotencyKey`.

## Observability

Structured logging (Pino) for preference updates and evaluate decisions. `src/infrastructure/metrics/metrics.ts` defines a small interface for future Prometheus counters (`preferences_updated_total`, `evaluate_decision_total`) and latency histograms.

## Production next steps

- Migrations tool (e.g. Flyway) instead of inline SQL on boot
- Connection pooling tuning, read replicas for evaluate-heavy traffic
- Authn/z on admin vs user-scoped endpoints
- Cache effective preferences per user with invalidation on update
- OpenAPI spec and contract tests
- Rate limiting and request validation at the gateway
