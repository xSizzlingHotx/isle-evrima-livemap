# 🗺️ isle-evrima-livemap

**Open-source Livemap & Heatmap for The Isle: Evrima servers using PrimalCore.**

Show your players their real-time position on a web map, and visualize server activity with a heatmap. Fully self-hostable — just plug in your database credentials.

![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![PrimalCore](https://img.shields.io/badge/mod-PrimalCore-blue)

---

## ✨ Features

- 🗺️ **Live Map** — Real-time player position with HP, hunger, thirst, growth (refreshes every 5s)
- 🔥 **Heatmap** — Activity density map showing where players spend time (refreshes every 5min)
- 🔐 **Discord OAuth** — Players log in with Discord (linked to Steam via PrimalCore)
- ⚙️ **Easy config** — Just set env variables and drop in your map image
- 🌍 **Self-hostable** — VPS or Vercel

---

## 📋 Requirements

- Node.js 18+
- The Isle: Evrima server with **PrimalCore** mod installed
- Access to the PrimalCore MySQL database
- A Discord application (free at [discord.com/developers](https://discord.com/developers/applications))
- A domain + VPS (or Vercel)

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/xSizzlingHotx/isle-evrima-livemap
cd isle-evrima-livemap

# 2. Install dependencies
npm install

# 3. Configure
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Add your map image
# Place your server map as: public/map.jpg

# 5. Configure map bounds
# Edit lib/mapConfig.js with your world coordinates

# 6. Run
npm run dev           # development
npm run build && npm start  # production
```

---

## ⚙️ Configuration

### Environment Variables (`.env.local`)

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `DISCORD_CLIENT_ID` | From [discord.com/developers](https://discord.com/developers/applications) |
| `DISCORD_CLIENT_SECRET` | From Discord application settings |
| `NEXTAUTH_SECRET` | Any random 32+ char string |
| `NEXTAUTH_URL` | Your full domain e.g. `https://map.yourserver.com` |
| `PRIMALCORE_DB_HOST` | MySQL host IP or hostname |
| `PRIMALCORE_DB_USER` | MySQL username |
| `PRIMALCORE_DB_PASSWORD` | MySQL password |
| `PRIMALCORE_DB_NAME` | Database name (usually `primalcore`) |

### Map Image & Bounds (`lib/mapConfig.js`)

1. Place your server map image at `public/map.jpg` (recommended: 4096×4096px)
2. Edit `lib/mapConfig.js` with your world bounds:

```js
export const MAP_CONFIG = {
  imageWidth:  4096,   // width of your map.jpg
  imageHeight: 4096,   // height of your map.jpg
  worldMinX: -100000,  // your server min X coordinate
  worldMaxX:  100000,  // your server max X coordinate
  worldMinZ: -100000,  // your server min Z coordinate
  worldMaxZ:  100000,  // your server max Z coordinate
};
```

> 💡 Get the world bounds from your PrimalCore config or ask your server developer.

### Discord OAuth Setup

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Create a new application → **OAuth2 → Redirects** → add:
   ```
   https://your-domain.com/api/auth/callback/discord
   ```
3. Copy **Client ID** and **Client Secret** into `.env.local`

---

## 🏗️ How It Works

```
The Isle Server (PrimalCore mod)
        │ writes player data every few seconds
        ▼
PrimalCore MySQL Database
        │ queried by Next.js API routes
        ▼
Next.js App (this repo)   ← you host this
        │
        ├─ /api/location  → player position + stats (auth required)
        └─ /api/heatmap   → all positions last 24h (public)
        │
        ▼
Player Browser (Leaflet.js map)
        ├─ Live position marker — refreshes every 5s
        └─ Heatmap overlay — refreshes every 5min
```

### PrimalCore Tables Used

| Table | Columns | Purpose |
|-------|---------|---------|
| `idsync` | `discord_id`, `steam_id` | Links Discord login to Steam account |
| `playerstats` | `steam_id`, `pos_x`, `pos_z`, `hp`, `hunger`, `thirst`, `growth`, `last_seen` | Player position & stats |

---

## 📁 Project Structure

```
isle-evrima-livemap/
├── pages/
│   ├── index.js                  # Redirects to /map
│   ├── map.js                    # Live map page
│   ├── heatmap.js                # Heatmap page
│   ├── login.js                  # Discord login page
│   ├── _app.js                   # NextAuth session provider
│   └── api/
│       ├── auth/
│       │   └── [...nextauth].js  # Discord OAuth handler
│       ├── location.js           # Player position endpoint
│       └── heatmap.js            # Heatmap data endpoint
├── lib/
│   ├── db.js                     # MySQL connection helper
│   └── mapConfig.js              # Map bounds & coordinate conversion
├── public/
│   └── map.jpg                   # ⚠️ Add your map image here!
├── .env.example                  # Copy to .env.local
└── package.json
```

---

## 🖥️ Deployment

### VPS (Recommended)

```bash
npm run build
npm install -g pm2
pm2 start npm --name "isle-livemap" -- start
pm2 save && pm2 startup
```

Nginx config:
```nginx
server {
    listen 80;
    server_name map.yourserver.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Vercel

```bash
npm i -g vercel && vercel
```

Add all env variables in the Vercel dashboard.
> ⚠️ Your PrimalCore DB must be publicly accessible for Vercel to reach it.

---

## 🔒 Security Notes

- DB credentials are **server-side only** — never exposed to the browser
- Players see **only their own** position (authenticated via Discord session)
- The heatmap shows **density only** — no individual positions
- Never commit `.env.local` (covered by `.gitignore`)

---

## 📄 License

MIT — free to use, modify and self-host. PRs welcome!

---

## 💙 Credits

Built by [Blood & Bones](https://bloodandbones.de) Evrima server.
Compatible with any The Isle: Evrima server running PrimalCore.