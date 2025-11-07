# FIBO ControlNet Visualizer

A professional web application for exploring and visualizing **controllable AI image generation** using FIBO's JSON-native API. Unlike traditional text-prompt systems, this tool lets you manipulate structured parameters (camera FOV, lighting, color palettes) and see exactly how each change affects your output—deterministically and reproducibly.

## 🎯 Project Overview

This is a production-ready application that demonstrates FIBO's controllability through:
- **Parameter Sweep Grids**: Generate matrices of images varying 1-2 parameters
- **Real-time Progress Tracking**: Live updates as renders complete
- **Side-by-Side Comparison**: Visual diff tool with JSON change highlighting
- **Deterministic Caching**: Same JSON + seed = identical output, cached for speed
- **Export & Reproducibility**: Download complete sweep packages with all metadata

**Target Users**: Art directors, designers, ML researchers, and developers who need predictable, controllable AI generation.

## ✨ Key Features

### Core Functionality
- ✅ **JSON-based Parameter Control** - Edit FIBO parameters with real-time validation
- ✅ **Parameter Sweep Builder** - X/Y axis sweep configuration with value ranges
- ✅ **Live Grid Viewer** - Real-time updates showing render progress (queued → active → completed)
- ✅ **Quick Presets** - One-click presets for Cinematic, Studio Lighting, and Color sweeps
- ✅ **Progress Tracking** - Progress bar, completion counter, and job status polling
- ✅ **Deterministic Caching** - Hash-based caching prevents redundant API calls

### Advanced Features
- ✅ **Side-by-Side Comparison** - Select any 2 variants to compare with JSON diff
- ✅ **Export to ZIP** - Download images + metadata (base.json, sweep.json, variants.csv)
- ✅ **Error Handling** - Automatic retry with exponential backoff, manual retry buttons
- ✅ **JSON Schema Validation** - Zod-based validation with helpful error messages
- ✅ **Job Management** - View status, error messages, and retry failed jobs

## 🏗️ Architecture

**Tech Stack:**
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Node.js API routes, BullMQ job queue
- **Worker**: Node.js render worker with FIBO API integration
- **Storage**: Redis (queue), File system (images)
- **Deployment**: Docker Compose

**Data Flow:**
1. User configures sweep → Frontend plans variants
2. Variants queued to Redis (BullMQ)
3. Worker picks up jobs → Calls FIBO API → Saves images
4. Frontend polls status → Displays results in real-time

> ⚠️ **Important**: The FIBO API integration is currently a placeholder stub. Update `packages/worker/src/index.ts` with the actual FIBO endpoint from **docs.bria.ai**.

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

The fastest way to get everything running:

```bash
# 1. Clone and navigate to the project
cd fibo-control-net-visualizer

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Edit .env with your FIBO API credentials (optional for testing)
# FIBO_API_URL=https://api.bria.ai/v1/generate
# FIBO_API_KEY=your_api_key_here

# 4. Launch all services (Redis, Web, Worker)
docker compose up --build
```

**Access the application**: http://localhost:3000

Docker will automatically start:
- ✅ Redis (queue backend)
- ✅ Web server (Next.js on port 3000)
- ✅ Worker (background job processor)

### Option 2: Local Development

For development without Docker:

**Prerequisites:**
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Redis running locally (`brew install redis && redis-server`)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Start web server (Terminal 1)
pnpm dev:web

# 4. Start worker (Terminal 2)
pnpm dev:worker
```

**Access the application**: http://localhost:3000

---

## 📖 Usage Guide

### Step 1: Configure Base JSON

Edit the JSON configuration for your base image. The sample includes:
```json
{
  "seed": 1337,
  "camera": { "fov": 35, "angle": "eye_level", "tilt": 0 },
  "lights": { "key": { "temperature": 5000, "intensity": 0.9 } },
  "color_palette": { "name": "cinematic_neutral" },
  "composition": { "rule_of_thirds": true },
  "subject": { "description": "ceramic bottle on linen table" }
}
```

**Validation**: Real-time schema validation with Zod ensures your JSON is valid before queueing.

### Step 2: Choose Quick Preset (Optional)

Click one of the preset buttons:
- 🎥 **Cinematic**: FOV (20-80) × Camera Tilt (-15 to 15)
- 💡 **Studio Lighting**: Intensity (0.4-1.0) × Temperature (3000-6500K)
- 🎨 **Color Palette**: Saturation (0.2-1.0) × Warmth (-0.5 to 0.5)

Or configure custom parameters manually.

### Step 3: Configure Sweep Parameters

Define X and Y axis parameters:
- **X Path**: e.g., `camera.fov`
- **X Values**: e.g., `25,35,45,55,65`
- **Y Path**: e.g., `lights.key.temperature`
- **Y Values**: e.g., `3000,4000,5000,6000,6500`

This creates a 5×5 grid (25 variants).

### Step 4: Plan and Queue Renders

1. Click **"Plan Sweep"** - Generates all variant combinations
2. Review planned variants in the right panel
3. Click **"Queue Renders"** - Submits jobs to the worker

### Step 5: Monitor Progress

Watch real-time updates:
- ⟳ **Polling indicator** - Shows active status checking
- **Progress bar** - Visual completion percentage
- **Grid cards** - Individual job states:
  - ⋯ Queued (gray)
  - ⟳ Rendering (blue)
  - ✓ Completed (green, with image)
  - ❌ Failed (red, with retry button)

### Step 6: Compare Variants

1. Click checkboxes on any 2 completed images
2. Click **"🔍 Compare Selected"**
3. View side-by-side comparison with JSON diff in new tab

### Step 7: Export Results

Click **"⬇ Export ZIP"** to download a package containing:
- `images/*.png` - All rendered images
- `metadata/base.json` - Your base configuration
- `metadata/sweep.json` - Sweep parameters
- `metadata/variants.csv` - Job metadata table

---

## ⚙️ Environment Variables

Configure via `.env` file (see `.env.example`):

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` | Yes |
| `FIBO_API_URL` | FIBO generation endpoint | `https://api.bria.ai/v1/generate` | Yes |
| `FIBO_API_KEY` | FIBO authentication key | - | Yes (for production) |
| `MODEL_VERSION` | FIBO model version | `fibo-v1` | No |
| `STORAGE_DIR` | Image storage directory | `./storage` | No |
| `WEB_PORT` | Web server port | `3000` | No |

---

## 🔌 API Endpoints

### POST `/api/plan-sweep`
Plans a parameter sweep by generating all variant combinations.

**Request:**
```json
{
  "base": { ...baseJSON... },
  "sweep": {
    "x": { "path": "camera.fov", "values": [25, 35, 45] },
    "y": { "path": "lights.key.temperature", "values": [3000, 5000] }
  }
}
```

**Response:**
```json
{
  "plan": [
    { "json": {...}, "deltas": {"camera.fov": 25, "lights.key.temperature": 3000} },
    ...
  ],
  "variants": 6
}
```

### POST `/api/queue-renders`
Queues render jobs to Redis/BullMQ.

**Request:**
```json
{
  "plan": [...variants...],
  "modelVersion": "fibo-v1"
}
```

**Response:**
```json
{
  "enqueued": [
    { "hash": "abc123...", "cached": false },
    ...
  ]
}
```

### POST `/api/job-status`
Polls status of multiple jobs.

**Request:**
```json
{
  "jobIds": ["hash1", "hash2", ...]
}
```

**Response:**
```json
{
  "statuses": [
    {
      "jobId": "hash1",
      "status": "completed",
      "result": { "url": "/api/images/hash1.png", "cached": true },
      "attemptsMade": 1,
      "attemptsTotal": 3
    },
    ...
  ]
}
```

### POST `/api/retry-job`
Retries a failed job.

**Request:**
```json
{
  "jobId": "hash123",
  "jobData": { "json": {...}, "modelVersion": "fibo-v1", "seed": 1337, "hash": "hash123" }
}
```

### POST `/api/export`
Generates ZIP archive of sweep results.

**Request:**
```json
{
  "jobResults": [...],
  "baseJson": {...},
  "sweepConfig": {...}
}
```

**Response:** Binary ZIP file download

### GET `/api/images/{filename}`
Serves rendered images from storage.

---

## 🏗️ Project Structure

```
fibo-control-net-visualizer/
├── packages/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── page.tsx        # Main sweep UI
│   │   │   ├── compare/        # Comparison view
│   │   │   │   └── page.tsx
│   │   │   └── api/            # API routes
│   │   │       ├── plan-sweep/
│   │   │       ├── queue-renders/
│   │   │       ├── job-status/
│   │   │       ├── retry-job/
│   │   │       ├── export/
│   │   │       └── images/
│   │   ├── lib/
│   │   │   ├── queue.ts        # BullMQ client
│   │   │   ├── hash.ts         # Deterministic hashing
│   │   │   └── validation.ts   # Zod schemas
│   │   └── package.json
│   │
│   └── worker/                 # Render worker
│       ├── src/
│       │   └── index.ts        # BullMQ worker + FIBO integration
│       └── package.json
│
├── infra/
│   └── docker/
│       ├── Dockerfile.web
│       └── Dockerfile.worker
│
├── docker-compose.yml
├── .env.example
├── CLAUDE.md                   # Development guide for Claude Code
├── PROGRESS.md                 # Feature implementation progress
├── PRD-and-tech-doc.md        # Product requirements
└── README.md
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
pnpm install

# Development (separate terminals)
pnpm dev:web          # Start Next.js dev server
pnpm dev:worker       # Start worker with hot reload

# Production build
pnpm build:web        # Build Next.js for production
pnpm build:worker     # Build worker for production

# Production start
pnpm start:web        # Start production web server
pnpm start:worker     # Start production worker

# Linting
pnpm --filter web lint

# Docker
docker compose up --build          # Start all services
docker compose down                # Stop all services
docker compose logs -f worker      # View worker logs
```

---

## 🔧 How It Works

### Deterministic Caching
Every render job is identified by a hash:
```typescript
hash = sha256(JSON.stringify({ json, modelVersion, seed })).slice(0, 16)
```

- Same parameters = same hash = cached result
- Images stored as `{hash}.png`
- Worker checks cache before calling FIBO API

### Job Queue Flow
1. Frontend: `queueRenders()` → POST `/api/queue-renders`
2. API: Adds jobs to Redis with BullMQ
3. Worker: Picks up job → `renderWithFIBO()` → Saves image
4. Frontend: Polls `/api/job-status` every 2s
5. Frontend: Displays completed images

### Automatic Retry
Jobs configured with exponential backoff:
- **Attempts**: 3 (configurable)
- **Delay**: 2s base, exponential growth
- **Manual retry**: Available for failed jobs

---

## 🐛 Troubleshooting

### Issue: Redis connection failed
**Solution:**
```bash
# Check Redis is running
redis-cli ping  # Should return "PONG"

# Or install and start Redis
brew install redis
brew services start redis
```

### Issue: Worker not processing jobs
**Check worker logs:**
```bash
# Docker
docker compose logs -f worker

# Local
# Check the terminal running pnpm dev:worker
```

**Common causes:**
- Redis URL incorrect in `.env`
- FIBO API credentials missing/invalid
- Worker not started

### Issue: Images not displaying
**Verify storage:**
```bash
# Docker
docker compose exec web ls /data/storage

# Local
ls ./storage
```

**Check image route:**
- Open browser DevTools → Network tab
- Look for failed `/api/images/{hash}.png` requests

### Issue: JSON validation errors
**Common fixes:**
- Ensure valid JSON syntax (no trailing commas)
- Check parameter types match schema (numbers vs strings)
- Nested paths use correct dot notation: `lights.key.temperature`

---

## 🚀 Deployment

### Docker Production

```bash
# Build and start in production mode
docker compose up --build -d

# View logs
docker compose logs -f

# Scale workers
docker compose up -d --scale worker=3
```

### Cloud Deployment

**Requirements:**
- Redis instance (AWS ElastiCache, Redis Cloud, etc.)
- Shared storage for images (S3, MinIO, etc.)
- Container orchestration (Kubernetes, ECS, Cloud Run)

**Environment variables** for production:
```env
REDIS_URL=redis://production-redis:6379
STORAGE_DIR=/mnt/shared-storage
FIBO_API_KEY=your_production_key
```

---

## 📝 License

This project is provided as-is for the FIBO hackathon.

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [BullMQ](https://docs.bullmq.io/) - Job queue
- [Redis](https://redis.io/) - In-memory data store
- [Zod](https://zod.dev/) - Schema validation
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

**Ready to explore controllable AI generation?** 🎨

Start your first parameter sweep and see how FIBO's JSON-native approach gives you unprecedented control over your creative output.
