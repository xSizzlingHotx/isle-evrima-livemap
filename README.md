# 🗺️ isle-evrima-livemap

**Open-source Livemap & Heatmap for The Isle: Evrima — self-hostable, mod-agnostic.**

Show your players their real-time position on a web map, and visualize server activity with a heatmap.
Works with **any data source** — PrimalCore, your own mod, RCON, a custom bot, anything that writes to MySQL.

![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

---

## ✨ Features

- 🗺️ **Live Map** — Real-time player position with HP, hunger, thirst, growth (refreshes every 5s)
- 🔥 **Heatmap** — Activity density map showing where players spend time (refreshes every 5min)
- 🔐 **Discord OAuth** — Players log in with Discord to see their own position
- ⚙️ **Mod-agnostic** — Bring your own database. Only 2 tables needed.
- 🌍 **Self-hostable** — VPS or Vercel, your choice

---

## 📋 Requirements

- Node.js 18+
- A MySQL database with player position data (see [Database Setup](#-database-setup) below)
- A Discord application for login (free at [discord.com/developers](https://discord.com/developers/applications))
- A domain + VPS (or Vercel)

> **No specific mod required.** You just need a MySQL database with the right table structure.
> You can populate it from any source: PrimalCore, your own mod, RCON scripts, a Discord bot, etc.

---

## 🗄️ Database Setup

You need **2 tables** in a MySQL database. Create them yourself:

### Table 1: `player_positions`
Stores each player's current position and stats. Updated by your game server / mod / bot.

```sql
CREATE TABLE player_positions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  discord_id VARCHAR(64)  NOT NULL UNIQUE,  -- Discord user ID (snowflake)
  username   VARCHAR(128) NOT NULL,          -- Display name
  pos_x      FLOAT        DEFAULT NULL,      -- World X coordinate
  pos_y      FLOAT        DEFAULT NULL,      -- World Y coordinate (height)
  pos_z      FLOAT        DEFAULT NULL,      -- World Z coordinate
  hp         FLOAT        DEFAULT 100,       -- Health %
  hunger     FLOAT        DEFAULT 100,       -- Hunger %
  thirst     FLOAT        DEFAULT 100,       -- Thirst %
  growth     FLOAT        DEFAULT 0,         -- Growth 0.0–1.0
  last_seen  DATETIME     DEFAULT NOW() ON UPDATE NOW(),
  INDEX idx_discord (discord_id),
  INDEX idx_last_seen (last_seen)
);
```

### Table 2: `heatmap_log` *(optional but recommended)*
Stores position snapshots for heatmap generation. Your mod/bot can INSERT here periodically.

```sql
CREATE TABLE heatmap_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  pos_x      FLOAT    NOT NULL,
  pos_z      FLOAT    NOT NULL,
  logged_at  DATETIME DEFAULT NOW(),
  INDEX idx_logged (logged_at)
);
```

> **Note:** If you don't use `heatmap_log`, the heatmap will fall back to reading `player_positions` directly.

### How to populate the data

You have many options:

| Approach | Description |
|----------|-------------|
| **PrimalCore mod** | Use the existing `idsync` + `playerstats` tables (see [PrimalCore mode](#primalcore-mode)) |
| **Custom UE4/UE5 mod** | Write a mod that UPDATEs `player_positions` via a MySQL plugin |
| **RCON script** | Poll your server via RCON every few seconds, write positions to DB |
| **Discord bot** | Bot receives position data from players or server, writes to DB |
| **Game API** | If your server has an HTTP API, poll it and write to DB |

The app **only reads** from the database — it never writes game data.

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/xSizzlingHotx/isle-evrima-livemap
cd isle-evrima-livemap

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Add your map image
# Place your server map as: public/map.jpg (recommended: 4096×4096px)

# 5. Configure map bounds
# Edit lib/mapConfig.js with your world coordinates

# 6. Run
npm run dev           # development
npm run build && npm start  # production
```

---

## ⚙️ Configuration

### Environment Variables (`.env.local`)

```env
# Discord OAuth (https://discord.com/developers/applications)
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

# NextAuth
NEXTAUTH_SECRET=any_random_32_char_string
NEXTAUTH_URL=https://your-domain.com

# MySQL Database (your own DB)
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

### Map Image & Bounds (`lib/mapConfig.js`)

```js
export const MAP_CONFIG = {
  imageWidth:  4096,   // width of public/map.jpg
  imageHeight: 4096,   // height of public/map.jpg
  worldMinX: -100000,  // your map's min X coordinate
  worldMaxX:  100000,  // your map's max X coordinate
  worldMinZ: -100000,  // your map's min Z coordinate
  worldMaxZ:  100000,  // your map's max Z coordinate
};
```

### Discord OAuth Setup

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create app → **OAuth2 → Redirects** → add:
   ```
   https://your-domain.com/api/auth/callback/discord
   ```
3. Copy Client ID + Secret to `.env.local`

---

## 🔌 PrimalCore Mode

If you're running **PrimalCore**, you can use its existing tables instead of creating your own.
Set these additional env vars:

```env
USE_PRIMALCORE=true
DB_NAME=primalcore
```

PrimalCore tables used:
- `idsync` — maps `discord_id` → `steam_id`
- `playerstats` — position and stats keyed by `steam_id`

---

## 🏗️ How It Works

```
Game Server / Mod / Bot / Script
        │ writes player positions to MySQL
        ▼
Your MySQL Database
  └─ player_positions  (pos_x, pos_z, hp, hunger, thirst, growth)
  └─ heatmap_log       (pos_x, pos_z snapshots)
        │
        ▼
Next.js App (this repo) ← you host this
  └─ /api/location   → authenticated player's position
  └─ /api/heatmap    → density data for heatmap
        │
        ▼
Player's Browser
  ├─ Leaflet.js Live Map (refreshes every 5s)
  └─ Leaflet.js Heatmap  (refreshes every 5min)
```

---

## 📁 Project Structure

```
isle-evrima-livemap/
├── pages/
│   ├── map.js                    # Live map page
│   ├── heatmap.js                # Heatmap page
│   ├── login.js                  # Discord login
│   ├── index.js                  # Redirects to /map
│   ├── _app.js                   # Session provider
│   └── api/
│       ├── auth/[...nextauth].js # Discord OAuth
│       ├── location.js           # Player position API
│       └── heatmap.js            # Heatmap data API
├── lib/
│   ├── db.js                     # MySQL connection
│   └── mapConfig.js              # Map bounds & coord conversion
├── public/
│   └── map.jpg                   # ⚠️ Your map image here
└── .env.example                  # Config template
```

---

## 🖥️ Deployment

### VPS

```bash
npm run build
npm i -g pm2
pm2 start npm --name "isle-livemap" -- start
pm2 save && pm2 startup
```

Nginx:
```nginx
server {
    listen 80;
    server_name map.yourserver.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
    }
}
```

### Vercel

```bash
npm i -g vercel && vercel
```
Add env variables in Vercel dashboard. DB must be publicly reachable.

---

## 🔒 Security

- DB credentials server-side only, never exposed to browser
- Players see **only their own** position
- Heatmap shows density only, no individual positions
- Never commit `.env.local`

---

## 📄 License

MIT — free to use, modify, self-host. PRs welcome!

---

## 💙 Credits

Built by [Blood & Bones](https://bloodandbones.de) Evrima server.