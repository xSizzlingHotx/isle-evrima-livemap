# 🗺️ isle-evrima-mapsystem

**Self-hostable Livemap & Heatmap for The Isle: Evrima.**

Show your players their real-time in-game position on a web map, and visualize server activity with a heatmap. Bring your own data source — any script or mod that writes to MySQL works.

![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

---

## ✨ Features

- 🗺️ **Live Map** — Real-time player position with HP, hunger, thirst, growth (refreshes every 5s)
- 🔥 **Heatmap** — Activity density map (refreshes every 5min)
- 🔐 **Discord OAuth** — Players log in with Discord to see their own position
- ⚙️ **Any data source** — MySQL + your own mod/script/bot
- 🌍 **Self-hostable** — VPS or Vercel

---

## 📋 Requirements

- Node.js 18+
- A MySQL database
- Something that writes player positions to that database (see [Getting Data Into The DB](#-getting-data-into-the-db))
- A Discord application — free at [discord.com/developers](https://discord.com/developers/applications)

---

## 🗄️ Database Setup

Create these 2 tables in any MySQL database:

```sql
-- Current player positions (updated live by your data source)
CREATE TABLE player_positions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  discord_id VARCHAR(64)  NOT NULL UNIQUE,
  username   VARCHAR(128) NOT NULL,
  pos_x      FLOAT        DEFAULT NULL,
  pos_y      FLOAT        DEFAULT NULL,
  pos_z      FLOAT        DEFAULT NULL,
  hp         FLOAT        DEFAULT 100,
  hunger     FLOAT        DEFAULT 100,
  thirst     FLOAT        DEFAULT 100,
  growth     FLOAT        DEFAULT 0,
  last_seen  DATETIME     DEFAULT NOW() ON UPDATE NOW(),
  INDEX idx_discord  (discord_id),
  INDEX idx_lastseen (last_seen)
);

-- Position snapshots for heatmap (optional — falls back to player_positions if missing)
CREATE TABLE heatmap_log (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  pos_x     FLOAT    NOT NULL,
  pos_z     FLOAT    NOT NULL,
  logged_at DATETIME DEFAULT NOW(),
  INDEX idx_logged (logged_at)
);
```

---

## 📡 Getting Data Into The DB

The app only **reads** from the database. You need something external that **writes** player positions.
Here are the main approaches for The Isle: Evrima:

### Option A — Unreal Engine Mod (Best accuracy)

Write a UE4/UE5 mod using the game's modding API. The mod runs server-side and pushes data directly.

**What the mod does:**
1. On a timer (e.g. every 3–5 seconds), loop through all connected players
2. Get each player's position (`GetActorLocation()`), stats, and linked Discord ID
3. `INSERT ... ON DUPLICATE KEY UPDATE` into `player_positions`

**Pseudocode:**
```cpp
// In your server-side Actor tick or timer:
for (APlayerController* PC : GetAllPlayers()) {
    FVector Pos = PC->GetPawn()->GetActorLocation();
    FString DiscordId = GetDiscordId(PC);  // from your link system
    
    FString Query = FString::Printf(
        TEXT("INSERT INTO player_positions (discord_id, username, pos_x, pos_y, pos_z, hp, hunger, thirst, growth) ")
        TEXT("VALUES ('%s','%s',%f,%f,%f,%f,%f,%f,%f) ")
        TEXT("ON DUPLICATE KEY UPDATE pos_x=%f, pos_y=%f, pos_z=%f, hp=%f, hunger=%f, thirst=%f, growth=%f, last_seen=NOW()"),
        *DiscordId, *Username,
        Pos.X, Pos.Y, Pos.Z, HP, Hunger, Thirst, Growth,
        Pos.X, Pos.Y, Pos.Z, HP, Hunger, Thirst, Growth
    );
    MySQL->Execute(Query);
}
```

You'll need a MySQL plugin for Unreal Engine (e.g. **MySQLConnector** on the UE marketplace, or open-source alternatives).

---

### Option B — RCON Script (No mod needed)

If your server exposes an RCON interface or HTTP API, you can poll it with a script running on your VPS.

**Node.js example:**
```js
const mysql = require('mysql2/promise');
const Rcon = require('rcon-client').Rcon; // npm install rcon-client

const db = await mysql.createConnection({
  host: 'your_db_host', user: 'root', password: 'pw', database: 'mapsystem'
});

async function syncPlayers() {
  const rcon = new Rcon({ host: '127.0.0.1', port: 27020, password: 'rconpw' });
  await rcon.connect();
  
  // The Isle RCON command to list players (check your server docs)
  const response = await rcon.send('listplayers');
  await rcon.end();
  
  // Parse response and update DB
  const players = parseRconResponse(response); // implement based on your server's format
  for (const p of players) {
    await db.execute(
      `INSERT INTO player_positions (discord_id, username, pos_x, pos_y, pos_z, hp)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pos_x=VALUES(pos_x), pos_y=VALUES(pos_y),
       pos_z=VALUES(pos_z), hp=VALUES(hp), last_seen=NOW()`,
      [p.discordId, p.name, p.x, p.y, p.z, p.hp]
    );
  }
}

// Run every 5 seconds
setInterval(syncPlayers, 5000);
```

Run this script with PM2 alongside your map server:
```bash
pm2 start sync.js --name "isle-sync"
```

---

### Option C — Discord Bot + Server Integration

If your server has a bot that already tracks players (e.g. for kills, events, linking), extend it to also write positions.

**Example with discord.js:**
```js
// Whenever your bot receives a position update event from the game server:
client.on('playerMove', async ({ discordId, username, x, y, z, hp }) => {
  await db.execute(
    `INSERT INTO player_positions (discord_id, username, pos_x, pos_y, pos_z, hp)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE pos_x=VALUES(pos_x), pos_y=VALUES(pos_y),
     pos_z=VALUES(pos_z), hp=VALUES(hp), last_seen=NOW()`,
    [discordId, username, x, y, z, hp]
  );
});
```

For the heatmap, INSERT a snapshot every minute:
```js
setInterval(async () => {
  const [players] = await db.query('SELECT pos_x, pos_z FROM player_positions WHERE last_seen > DATE_SUB(NOW(), INTERVAL 1 MINUTE)');
  for (const p of players) {
    await db.execute('INSERT INTO heatmap_log (pos_x, pos_z) VALUES (?, ?)', [p.pos_x, p.pos_z]);
  }
}, 60000);
```

---

### Option D — HTTP API (If your server exposes one)

Some server management tools expose a REST API. Poll it from a script:

```js
async function sync() {
  const res = await fetch('http://your-server:port/api/players', {
    headers: { 'Authorization': 'Bearer your-api-key' }
  });
  const players = await res.json();
  
  for (const p of players) {
    await db.execute(
      `INSERT INTO player_positions (discord_id, username, pos_x, pos_y, pos_z)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pos_x=VALUES(pos_x), pos_y=VALUES(pos_y),
       pos_z=VALUES(pos_z), last_seen=NOW()`,
      [p.discord_id, p.name, p.position.x, p.position.y, p.position.z]
    );
  }
}
setInterval(sync, 5000);
```

---

### Linking Discord IDs to Players

All approaches require knowing which Discord ID belongs to which in-game player.
Common methods:

| Method | How it works |
|--------|-------------|
| **In-game link command** | Player types `!link DiscordID` in game chat |
| **Discord bot command** | Player types `/link SteamID` in Discord |
| **Steam OAuth** | Player links Steam + Discord on your website |
| **Manual admin list** | Admin maintains a CSV/DB of Discord→SteamID mappings |

Store the mapping in a simple table:
```sql
CREATE TABLE discord_links (
  discord_id VARCHAR(64)  NOT NULL UNIQUE,
  steam_id   VARCHAR(64)  NOT NULL UNIQUE,
  username   VARCHAR(128),
  linked_at  DATETIME DEFAULT NOW()
);
```

Then join it when writing positions:
```sql
UPDATE player_positions p
JOIN discord_links d ON d.steam_id = ?
SET p.pos_x = ?, p.pos_y = ?, p.pos_z = ?
WHERE d.discord_id = d.discord_id;
```

---

## 🚀 Quick Start

```bash
git clone https://github.com/xSizzlingHotx/isle-evrima-mapsystem
cd isle-evrima-mapsystem
npm install
cp .env.example .env.local
# fill in your credentials
npm run dev
```

---

## ⚙️ Configuration

### `.env.local`

```env
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
NEXTAUTH_SECRET=any_random_32_char_string
NEXTAUTH_URL=https://your-domain.com
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

### Map bounds (`lib/mapConfig.js`)

```js
export const MAP_CONFIG = {
  imageWidth:  4096,   // px width of public/map.jpg
  imageHeight: 4096,   // px height of public/map.jpg
  worldMinX: -100000,  // game world min X
  worldMaxX:  100000,  // game world max X
  worldMinZ: -100000,  // game world min Z
  worldMaxZ:  100000,  // game world max Z
};
```

### Discord OAuth

1. [discord.com/developers](https://discord.com/developers/applications) → New App
2. OAuth2 → Redirects → add `https://your-domain.com/api/auth/callback/discord`
3. Copy Client ID + Secret to `.env.local`

---

## 🖥️ Deployment

### VPS
```bash
npm run build
npm i -g pm2
pm2 start npm --name "isle-mapsystem" -- start
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
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Vercel
```bash
npm i -g vercel && vercel
```
Add env vars in Vercel dashboard. DB must be publicly reachable.

---

## 🔒 Security

- DB credentials server-side only — never sent to the browser
- Players see only their own position
- Heatmap shows density only — no individual positions

---

## 💙 Credits

Built by [Blood & Bones](https://bloodandbones.de) Evrima server.