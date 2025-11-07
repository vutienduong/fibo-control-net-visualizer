# FIBO ControlNet Visualizer – Starter Repo

This is a **hackathon-ready** starter for the project described in the PRD/Tech doc:
- **Web (Next.js App Router)** for JSON editor, parameter sweeps, grid & diff
- **Worker (Node + BullMQ)** to call FIBO and store images
- **Redis** for queues
- **Docker Compose** for one-command local run

> ⚠️ The render call is scaffolded with a placeholder FIBO API request. Update it to the latest official endpoint and auth method from **docs.bria.ai**.

---

## Quick Start (Docker)

1. Copy env:
```bash
cp .env.example .env
```
2. (Optional) Edit `.env` with your FIBO API URL and KEY.

3. Launch:
```bash
docker compose up --build
```

4. Open the web app:
- http://localhost:3000

5. Start a test sweep from the **Home** page, watch thumbnails stream in.

---

## Local Dev (without Docker)

- Requires: Node 20+, pnpm, Redis running locally

```bash
cp .env.example .env
pnpm install
pnpm dev:web
# In another terminal
pnpm dev:worker
```

Web: http://localhost:3000

---

## Structure

```
packages/
  web/        # Next.js (App Router)
  worker/     # BullMQ worker
infra/
  docker/
    Dockerfile.web
    Dockerfile.worker
docker-compose.yml
```

---

## Notes

- **Caching**: The worker stores images under `STORAGE_DIR` (default `/data/storage` in Docker). The web serves URLs via a simple route handler.
- **Determinism**: Jobs are keyed by model + seed + JSON hash.
- **Safety**: This is a starter; add auth/rate-limits for public demos.

Happy building!
