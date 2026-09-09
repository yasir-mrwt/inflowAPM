# InflowAPM

InflowAPM is an open-source application performance monitoring project. Its backend accepts project-scoped telemetry, persists events asynchronously, and calculates dashboard analytics. The web application is currently only a generated Next.js scaffold; the product UI is planned.

## Current status

| Area | Status |
| --- | --- |
| User registration, repeated login, refresh, and logout | Implemented |
| Project creation, listing, and deletion | Implemented |
| Project API-key authentication | Implemented |
| Batched telemetry ingestion | Implemented |
| BullMQ telemetry processing and PostgreSQL bulk insert | Implemented |
| Dashboard analytics | Implemented |
| Frontend product experience | Planned |
| CI/CD and production deployment | Planned |

The backend integration tests exercise authentication, projects, ingestion, analytics, tenant isolation, safety bounds, and test-infrastructure isolation. Tests use a dedicated PostgreSQL database and Redis database.

## Architecture

```text
Browser / telemetry producer
            |
            v
       Express API
            |
    +-------+-------------------+
    |                           |
    v                           v
JWT-protected routes       API-key-protected ingestion
    |                           |
    v                           v
Controllers                 BullMQ queue
    |                           |
    v                           v
Services                  Telemetry worker
    |                           |
    +-------------+-------------+
                  |
                  v
          Models / SQL queries
                  |
                  v
              PostgreSQL

Redis supports BullMQ, rate-limit state, and short-lived API-key lookup caching.
An additional BullMQ worker sends registration welcome emails through SMTP.
```

## Technology stack

### Backend

- Node.js and TypeScript
- Express 5
- PostgreSQL 18
- Redis 7 and BullMQ
- Zod request validation
- JSON Web Tokens and bcrypt
- Nodemailer
- Node test runner, Supertest, and Docker Compose

### Frontend

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4

The frontend is still a scaffold. shadcn/ui, Lucide React, Recharts, and other product libraries are planned and have not been installed.

## Repository structure

```text
InflowAPM/
├── backend/
│   ├── src/
│   │   ├── configs/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── queues/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── workers/
│   └── test/
├── frontend/
│   ├── public/
│   └── src/app/
├── docker-compose.yml
└── README.md
```

## Local setup

### Prerequisites

- Node.js 26 for the backend container-compatible environment
- npm
- PostgreSQL
- Redis
- SMTP credentials if registration emails are enabled

Install the backend dependencies:

```bash
cd backend
npm install
```

Copy the safe example files and replace their placeholders:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Point `DATABASE_URL` and `REDIS_URL` at services reachable from the backend process.

Start the backend directly:

```bash
npm run dev
```

The API listens on the configured `PORT`. The checked-in Docker configuration uses port `5002`.

To inspect the current frontend scaffold separately:

```bash
cd frontend
npm install
npm run dev
```

The frontend normally runs at `http://localhost:3000`. Add every permitted frontend origin to the comma-separated `CORS_ORIGINS` setting.

## Docker setup

Create the root and backend environment files from their examples, then start the API and its infrastructure:

```bash
docker compose up --build
```

This starts:

- Express API at `http://localhost:5002`
- PostgreSQL inside the Compose network
- Redis inside the Compose network

The frontend is not currently part of `docker-compose.yml`.

Secrets are supplied through ignored environment files and are not embedded in `docker-compose.yml`.

## Environment variables

The current backend validates all of these variables during startup:

| Variable | Purpose |
| --- | --- |
| `PORT` | Express listen port |
| `NODE_ENV` | Runtime environment; defaults to the current development mode |
| `DATABASE_URL` | Development PostgreSQL connection URL |
| `TEST_DATABASE_URL` | Test PostgreSQL URL; should target `inflowapm_test` |
| `REDIS_URL` | Development Redis and BullMQ URL, normally database 0 |
| `TEST_REDIS_URL` | Test Redis and BullMQ URL, normally database 1 |
| `ACCESS_TOKEN_SECRET` | Access-token signing secret; must differ from the refresh secret and contain at least 24 characters |
| `REFRESH_TOKEN_SECRET` | Refresh-token signing secret; must differ from the access secret and contain at least 24 characters |
| `CORS_ORIGINS` | Comma-separated browser-origin allowlist |
| `MAIL_ENABLED` | Enables SMTP verification, the email worker, and welcome-email enqueueing |
| `MAIL_HOST` | SMTP host |
| `MAIL_PORT` | SMTP port |
| `MAIL_USER` | SMTP user |
| `MAIL_PASSWORD` | SMTP password |
| `MAIL_FROM` | Sender address for welcome emails |

Do not commit `.env` files or production credentials.

## Running tests

The test scripts expect the Docker Compose services to be running. Execute the full suite inside the API container:

```bash
docker compose exec api npm test
```

Individual suites are also available:

```bash
docker compose exec api env NODE_ENV=test npx tsx --test test/auth.test.ts
docker compose exec api env NODE_ENV=test npx tsx --test test/project.test.ts
docker compose exec api env NODE_ENV=test npx tsx --test test/telemetry.test.ts
docker compose exec api env NODE_ENV=test npx tsx --test test/analytics.test.ts
```

The suite runs files sequentially with Node process isolation. Each process initializes and closes only its own PostgreSQL, Redis, queue, and worker resources. Test mail is disabled.

To type-check the backend without changing files:

```bash
cd backend
npx tsc --noEmit
```

## Telemetry architecture

Telemetry producers authenticate with the API key returned when a project is created.

```text
POST /api/v1/telemetry/ingest
  -> Bearer API-key validation
  -> Redis API-key cache lookup (five-minute TTL)
  -> project-scoped rate limit (120 batches/minute)
  -> Zod batch validation
  -> BullMQ enqueue
  -> HTTP 202 Accepted
  -> background worker
  -> parameterized PostgreSQL bulk insert
```

Supported events are:

- `http`: requires a slash-prefixed route, HTTP method, status, duration, metadata, and occurrence timestamp.
- `event`: accepts the route values `query`, `error`, or `timeout`, with optional duration, metadata, and occurrence timestamp.

Both event kinds can include `user_id`, `anonymous_id`, `email`, and `ip` identity fields.
Each request may contain between 1 and 100 events.

Example HTTP event batch:

```json
[
  {
    "type": "http",
    "route": "/api/orders",
    "method": "GET",
    "status": 200,
    "duration_ms": 42.5,
    "metadata": {},
    "occurred_at": "2026-09-09T12:00:00.000Z"
  }
]
```

## Analytics architecture

`GET /api/v1/telemetry/analytics/dashboard` validates its project UUID and range, authenticates the user, verifies project ownership, then runs four PostgreSQL analytics queries concurrently:

- overview totals, server-error count, average latency, and P95 latency
- time-series requests, errors, average latency, and P95 latency
- performance grouped by method and route
- 20 most recent server errors

The HTTP dashboard excludes custom events from request metrics. The service adds average throughput per second. Supported ranges are `1h`, `24h`, `7d`, and `30d`; omission defaults to 24 hours and unsupported values return 400. Recent errors use the same selected range.

## Current API

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | None | Register a user and enqueue a welcome email |
| `POST` | `/api/v1/auth/login` | None | Return access and refresh tokens plus user data |
| `POST` | `/api/v1/auth/refresh` | Refresh token in body | Request a new access token |
| `POST` | `/api/v1/auth/logout` | Access token | Clear the stored refresh token |
| `POST` | `/api/v1/projects` | Access token | Create a project and return its API key |
| `GET` | `/api/v1/projects` | Access token | List the authenticated user's projects |
| `DELETE` | `/api/v1/projects/:id` | Access token | Delete an owned project and its telemetry |
| `POST` | `/api/v1/telemetry/ingest` | Project API key | Validate and queue a telemetry batch |
| `GET` | `/api/v1/telemetry/analytics/dashboard` | Access token | Return owned-project dashboard analytics |

Protected routes use this header format:

```http
Authorization: Bearer <token-or-project-api-key>
```

## Current features

- User registration with hashed passwords
- Short-lived JWT access tokens and hashed persisted refresh tokens
- User-owned projects
- Hashed project API-key storage, with the raw key returned at creation and omitted from listings
- Ownership-aware project deletion and analytics access
- API-key caching in Redis
- Validated HTTP and application-event batches
- Maximum telemetry batch size of 100 events
- Project-scoped telemetry rate limiting
- Asynchronous ingestion with retry and exponential backoff
- Parameterized bulk inserts
- Time-windowed dashboard statistics
- Average and P95 latency
- Throughput and server-error metrics
- Route-level performance
- Recent server-error feed
- PostgreSQL indexes for project/time and project/route/time queries

## Roadmap

### Frontend handoff

Backend stabilization has been validated with two consecutive full-suite passes. Frontend work starts only after explicit user approval.

### Planned frontend

- Authentication screens and session handling
- Project creation and selection
- API-key onboarding experience
- Dashboard overview, charts, route performance, and recent errors
- Accessible loading, empty, error, and responsive states

### Planned production hardening and scale work

- Versioned database migrations
- Dedicated worker processes and graceful shutdown
- API-key rotation and removal of the temporary legacy plaintext-key fallback
- Refresh-token rotation and removal of the temporary legacy plaintext-token fallback
- Queue monitoring and dead-letter handling
- Telemetry retention policies
- Pre-aggregated rollups and table partitioning
- Horizontal API and worker scaling
- Specialized analytics storage if PostgreSQL no longer meets scale needs
- CI/CD, health checks, observability, and deployment documentation

The current schema bootstrap remains intentionally small and idempotent for local/MVP use. Before production deployment, replace runtime `CREATE TABLE IF NOT EXISTS` statements with ordered, versioned migrations using a tool such as `node-pg-migrate`, and run migrations as a separate deployment step before starting API or worker processes.

If any credential was committed before environment-variable configuration was introduced, rotate it. Removing it from the current Compose file does not remove it from Git history.
