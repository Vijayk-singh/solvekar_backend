# Solvekar backend

NestJS REST API for the Solvekar test-series platform.

## Included

- TypeScript with strict compiler settings
- Environment configuration through `@nestjs/config`
- Global request validation
- CORS enabled for the future web and mobile clients
- Swagger API documentation at `/docs`
- Health endpoint at `/api/v1/health`
- PostgreSQL-backed user creation at `POST /api/v1/users`
- CRUD APIs for plans, tests, question bank, demo subscriptions, and audit logs

## Run locally

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Run `npm install`.
4. Run `npx prisma migrate dev --name init`.
5. Run `npm run start:dev`.

The first functional endpoints are `GET /api/v1/health` and `POST /api/v1/users`.

## Current API groups

- `/plans` — create, list, edit, delete, and attach tests
- `/tests` — create, list, edit, delete, add sections, and attach questions
- `/questions` — question-bank CRUD
- `/subscriptions/demo-activate` — activate a plan without a gateway during the demo phase
- `/subscriptions/users/:userId` — list a student's activated plans
- `/audit-logs` — latest recorded platform actions (to be protected by the admin JWT guard)
