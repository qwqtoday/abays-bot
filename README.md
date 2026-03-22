# KitBot - Minecraft Kit Delivery Bot

A production-ready Mineflayer bot that delivers kits to players via server commands (`/home`, `/tpa`, `/kill`).

## Features

- REST API with JWT authentication
- Web dashboard for managing kits and orders
- Concurrent delivery queue
- SQLite database with Drizzle ORM
- Docker support
- Microsoft and offline account authentication

## How It Works

```
1. Player orders kit via HTTP API or web dashboard
2. Bot teleports to kit storage using /home <location>
3. Bot retrieves item from chest at configured coordinates
4. Bot sends /tpa <player> and waits for acceptance
5. Bot executes /kill, dropping items at player location
6. Bot respawns at spawn, ready for next delivery
```

## Prerequisites

- Node.js 22+
- Minecraft server with `/home` and `/tpa` commands (EssentialsX, CMI, etc.)
- Bot account (Microsoft or offline mode)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd abays-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Minecraft Server
MC_HOST=your.server.com
MC_PORT=25565
MC_USERNAME=bot_username
MC_AUTH=microsoft  # or 'offline' for offline mode

# API Server
API_PORT=3000
JWT_SECRET=your-super-secret-key-at-least-32-characters

# Queue Settings
QUEUE_CONCURRENCY=3
TPA_TIMEOUT_MS=60000

# Database
DATABASE_PATH=./data/bot.db

# Logging
LOG_LEVEL=info
```

### 3. Initialize Database

```bash
npm run db:push
```

### 4. Create Admin User

```bash
npm run create-admin
# Or for Docker:
docker exec abays-bot npx tsx src/scripts/create-admin-cli.ts <username> <password>
```

### 5. Start the Bot

```bash
npm run dev
```

## Docker Deployment

### Build and Run

```bash
cd docker
docker-compose up -d
```

### Create Admin in Docker

```bash
docker exec abays-bot npx tsx src/scripts/create-admin-cli.ts admin yourpassword
```

## Usage

### Web Dashboard

Access the dashboard at `http://localhost:3000/`

1. Login with your admin credentials
2. Go to **Kits** to add kit configurations
3. Go to **Orders** to request deliveries

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/login` | Login to get JWT token | None |
| GET | `/api/kits` | List all kits | User |
| POST | `/api/kits` | Create a new kit | Admin |
| PUT | `/api/kits/:id` | Update a kit | Admin |
| DELETE | `/api/kits/:id` | Delete a kit | Admin |
| POST | `/api/orders` | Request a delivery | User |
| GET | `/api/orders` | List orders | User |
| GET | `/api/orders/:id` | Get order status | User |
| GET | `/api/health` | Health check | None |
| GET | `/api/ready` | Readiness check | None |

### Example: Create Kit

```bash
curl -X POST http://localhost:3000/api/kits \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Iron Starter Kit",
    "homeName": "iron_kit",
    "chestX": 100,
    "chestY": 64,
    "chestZ": -200
  }'
```

### Example: Request Delivery

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kitId": "kit-uuid-here",
    "playerName": "PlayerUsername"
  }'
```

## Kit Configuration

Each kit requires:

| Field | Description |
|-------|-------------|
| `name` | Display name for the kit |
| `homeName` | The `/home` location name where the chest is located |
| `chestX` | X coordinate of the chest |
| `chestY` | Y coordinate of the chest |
| `chestZ` | Z coordinate of the chest |

### Setup Instructions

1. Teleport the bot to a location using `/sethome <name>`
2. Place a chest and note its coordinates (F3 debug screen)
3. Put the kit items in the chest
4. Create the kit via API or dashboard

## Bot Commands Required

The Minecraft server must support these commands:

- `/home <name>` - Teleport to saved location
- `/sethome <name>` - Save a home location
- `/tpa <player>` - Request to teleport to a player
- `/kill` - Kill yourself

Most servers with EssentialsX or CMI support these commands.

## Project Structure

```
abays-bot/
├── src/
│   ├── api/           # Fastify API server
│   ├── bot/           # Mineflayer bot logic
│   ├── config/        # Environment configuration
│   ├── db/            # Database schema and connection
│   ├── queue/         # Job queue processor
│   ├── scripts/       # Utility scripts
│   └── utils/         # Logging utilities
├── public/            # Web dashboard (HTML/CSS/JS)
├── docker/            # Docker configuration
└── .env               # Environment variables
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Type check
npm run typecheck

# Database operations
npm run db:push    # Push schema changes
npm run db:studio  # Open Drizzle Studio
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MC_HOST` | Yes | - | Minecraft server hostname |
| `MC_PORT` | No | 25565 | Minecraft server port |
| `MC_USERNAME` | Yes | - | Bot account username |
| `MC_AUTH` | No | offline | `microsoft` or `offline` |
| `API_PORT` | No | 3000 | API server port |
| `JWT_SECRET` | Yes | - | Secret for JWT tokens (32+ chars) |
| `QUEUE_CONCURRENCY` | No | 3 | Max concurrent deliveries |
| `TPA_TIMEOUT_MS` | No | 60000 | TPA timeout in milliseconds |
| `DATABASE_PATH` | No | ./data/bot.db | SQLite database path |
| `LOG_LEVEL` | No | info | Log level |

## License

MIT