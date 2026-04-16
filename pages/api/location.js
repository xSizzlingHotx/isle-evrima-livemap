import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getDb } from '../../lib/db';

/**
 * GET /api/location
 *
 * Returns the authenticated player's current position and stats.
 * Supports two modes, configured via .env.local:
 *
 * DEFAULT MODE (own tables):
 *   Reads from `player_positions` table keyed by discord_id.
 *   CREATE TABLE player_positions (
 *     discord_id VARCHAR(64) NOT NULL UNIQUE,
 *     username   VARCHAR(128),
 *     pos_x FLOAT, pos_y FLOAT, pos_z FLOAT,
 *     hp FLOAT, hunger FLOAT, thirst FLOAT, growth FLOAT,
 *     last_seen DATETIME DEFAULT NOW() ON UPDATE NOW()
 *   );
 *
 * PRIMALCORE MODE (USE_PRIMALCORE=true):
 *   Uses idsync (discord_id -> steam_id) + playerstats tables.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Not logged in' });

  const discordId = session.user.discordId;
  const db = await getDb();

  try {
    let row;

    if (process.env.USE_PRIMALCORE === 'true') {
      // PrimalCore mode: idsync + playerstats
      const [ids] = await db.query('SELECT steam_id FROM idsync WHERE discord_id = ?', [discordId]);
      if (!ids[0]) { await db.end(); return res.json({ linked: false }); }
      const [stats] = await db.query(
        'SELECT pos_x, pos_y, pos_z, hp, hunger, thirst, growth, last_seen FROM playerstats WHERE steam_id = ?',
        [ids[0].steam_id]
      );
      row = stats[0];
    } else {
      // Default mode: own player_positions table
      const [rows] = await db.query(
        'SELECT pos_x, pos_y, pos_z, hp, hunger, thirst, growth, last_seen FROM player_positions WHERE discord_id = ?',
        [discordId]
      );
      row = rows[0];
    }

    await db.end();
    if (!row) return res.json({ linked: true, online: false });
    return res.json({ linked: true, online: true, ...row });

  } catch (err) {
    await db.end().catch(() => {});
    return res.status(500).json({ error: err.message });
  }
}