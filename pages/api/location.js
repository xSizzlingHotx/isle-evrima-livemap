import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getDb } from '../../lib/db';

/**
 * GET /api/location
 * Returns the authenticated player's current position and stats.
 * Reads from the 'player_positions' table keyed by discord_id.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Not logged in' });

  const db = await getDb();
  try {
    const [rows] = await db.query(
      'SELECT pos_x, pos_y, pos_z, hp, hunger, thirst, growth, last_seen FROM player_positions WHERE discord_id = ?',
      [session.user.discordId]
    );
    await db.end();
    if (!rows[0]) return res.json({ linked: false });
    return res.json({ linked: true, online: true, ...rows[0] });
  } catch (err) {
    await db.end().catch(() => {});
    return res.status(500).json({ error: err.message });
  }
}