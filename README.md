# RUNNA // Adaptive Running Website (Docker + PostgreSQL Stack)

A full-stack personalized running coaching website featuring structured training plans, Garmin Connect™ wearable sync, interactive GPS route maps for reviewing past workouts, and a PostgreSQL 16 relational backend orchestrated with Docker Compose.

## Docker Architecture

| Container | Image / Build | Host Port(s) | Purpose |
| :--- | :--- | :--- | :--- |
| `runna-web` | Multi-stage `node:22-alpine` → `nginx:1.27-alpine` | `8080`, `5173` | Serves the compiled React + Tailwind SPA and reverse-proxies `/api/*` to `runna-api` |
| `runna-api` | `./server` (`node:22-alpine` + Express + `pg`) | `4000` | RESTful API server, automatic SQL schema migrations, and transactional state persistence |
| `runna-postgres` | `postgres:16-alpine` | `5432` | Relational PostgreSQL 16 database (`athletes`, `training_weeks`, `workout_logs`, `garmin_connections`) backed by persistent volume `runna_pgdata` |

## Quick Start with Docker

```bash
# Build and launch all 3 containers in detached mode
docker compose up -d --build

# Check container health status
docker compose ps

# Inspect live PostgreSQL & API health through the Nginx reverse proxy
curl http://localhost:8080/api/health
```

## REST API Endpoints

- `GET /api/health` — Live PostgreSQL server version, query ping latency (`ms`), container uptime, and relational table row counts.
- `GET /api/bootstrap` — Hydrates athlete profile, periodized training weeks, Garmin Connect™ state, and custom workout logs from PostgreSQL.
- `POST /api/state` — Transactional upsert of athlete calibration, scheduled weeks, normalized `workout_logs`, and Garmin wearable sync state.
- `GET /api/workout-logs` — Direct query of completed runs stored in the `workout_logs` SQL table.
