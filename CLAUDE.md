# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **FIBO ControlNet Visualizer** - a web application that demonstrates controllable AI image generation through FIBO's JSON-native API. It enables users to create parameter sweep grids, compare variations, and visualize how specific JSON parameters affect image generation while maintaining deterministic outputs (same seed + JSON = same image).

**Core Concept:** Instead of vague text prompts, users manipulate structured JSON parameters (camera FOV, lighting temperature, color palettes) and see how each change affects the output.

## Architecture

The project uses a **monorepo** structure with two main packages:

### packages/web
- **Next.js 14** (App Router) frontend
- Serves the UI, JSON editor, and parameter sweep builder
- API routes handle sweep planning and job queuing
- Tech: React 18, TypeScript, BullMQ client

### packages/worker
- **Node.js worker** service that processes render jobs
- Consumes jobs from Redis queue (BullMQ)
- Calls FIBO API with JSON payloads
- Stores rendered images to filesystem (deterministic caching via hash)
- Tech: TypeScript (ESM), BullMQ worker, node-fetch

### Infrastructure
- **Redis**: Job queue (BullMQ) for asynchronous rendering
- **Docker Compose**: Orchestrates redis, web, and worker services
- **Shared Storage**: Volume-mounted directory (`/data/storage`) for image cache

## Development Commands

### Docker (Recommended for Full Stack)
```bash
# Start all services (redis, web, worker)
docker compose up --build

# Web will be available at http://localhost:3000
```

### Local Development (Requires Redis)
```bash
# Install dependencies
pnpm install

# Terminal 1: Start web app
pnpm dev:web

# Terminal 2: Start worker
pnpm dev:worker

# Web runs on http://localhost:3000
```

### Build Commands
```bash
# Build web for production
pnpm build:web

# Build worker for production
pnpm build:worker

# Start production web server
pnpm start:web

# Start production worker
pnpm start:worker
```

## Environment Variables

The application expects the following environment variables (typically in `.env` at root or via docker-compose):

- `REDIS_URL`: Redis connection string (default: `redis://localhost:6379`)
- `FIBO_API_URL`: FIBO generation API endpoint (default: `https://api.bria.ai/v1/generate`)
- `FIBO_API_KEY`: Authentication token for FIBO API
- `MODEL_VERSION`: FIBO model version to use (default: `fibo-v1`)
- `STORAGE_DIR`: Path for storing rendered images (default: `./storage` locally, `/data/storage` in Docker)
- `WEB_PORT`: Port for web server (default: `3000`)

## Key System Flows

### 1. Parameter Sweep Generation
Located in `packages/web/app/api/plan-sweep/route.ts`:
- Accepts a base JSON and sweep configuration (X/Y axes with parameter paths and value arrays)
- Expands into a cartesian product of all parameter combinations
- Each variant gets a delta object tracking what changed from the base

### 2. Deterministic Rendering
Core algorithm in `packages/web/lib/hash.ts` and `packages/worker/src/index.ts`:
- Each render job is hashed based on: `hash(JSON + seed + modelVersion)`
- Hash becomes the filename: `{hash}.png`
- Before rendering, worker checks if `{hash}.png` already exists
- If cached, returns immediately; otherwise calls FIBO API and saves result
- **Critical:** Same JSON + seed always produces the same hash = same cached result

### 3. Job Queue Flow
1. User submits sweep from frontend (`packages/web/app/page.tsx`)
2. Frontend calls `/api/queue-renders` with variants
3. API route adds jobs to Redis queue via BullMQ
4. Worker picks up jobs, renders via FIBO API, saves images
5. Frontend polls or streams job status updates
6. Images are served via `/api/images/[name]/route.ts`

## FIBO API Integration

The worker's `renderWithFIBO()` function in `packages/worker/src/index.ts` is **scaffolded with placeholder logic**.

**Important:** The FIBO API integration is currently a stub. You must:
1. Consult the official FIBO documentation at **docs.bria.ai**
2. Update the request/response format in `renderWithFIBO()`
3. Adjust payload structure to match FIBO's actual JSON schema
4. Handle authentication properly (currently uses Bearer token if `FIBO_API_KEY` is set)
5. Parse the actual image response format (currently assumes `image_base64` or `data` field)

## Storage and Caching

- Images are stored in `STORAGE_DIR` with deterministic filenames
- Cache key format: `{16-char-hash}.png` where hash = `sha256(JSON.stringify(payload)).slice(0,16)`
- Worker checks file existence before rendering to avoid redundant API calls
- Web serves images via Next.js route handler at `/api/images/{filename}`

## TypeScript Configuration

Both packages use TypeScript with ESM:
- **web**: Standard Next.js TypeScript config
- **worker**: `"type": "module"` in package.json, uses `tsx` for dev and `tsup` for building

## Testing and Development Notes

- No test suite is currently configured (hackathon starter project)
- Linting available via `pnpm --filter web lint` (Next.js built-in ESLint)
- The project prioritizes rapid prototyping over test coverage

## Common Gotchas

1. **Redis must be running** before starting web or worker locally
2. **Shared storage** between web and worker is critical - in Docker this is handled via volume mounts
3. **FIBO API response format** is stubbed - actual implementation will differ
4. **Job cleanup**: BullMQ jobs persist in Redis; consider implementing cleanup for old completed jobs
5. **Image format**: Currently hardcoded to PNG; FIBO may support other formats (TIFF, 16-bit, etc.)

## Project Context

This is a hackathon submission for FIBO's "Best Controllability" category, demonstrating:
- JSON-native parameter control (vs vague text prompts)
- Visual parameter sweeps (X/Y grid of variations)
- Deterministic, reproducible rendering
- Professional-grade workflow integration potential
