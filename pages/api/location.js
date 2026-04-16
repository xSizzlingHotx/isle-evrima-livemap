import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getDb } from '../../lib/db';

/**
 * GET /api/location
 * Returns the authenticated player's position and stats.
 * Requires Discord login + Steam account linked via PrimalCore idsync table.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Not logged in' });

  const discordId = session.user.discordId;
  const db = await getDb();
  try {
    const [idRows] = await db.query('SELECT steam_id FROM idsync WHERE discord_id = ?', [discordId]);
    if (!idRows[0]) { await db.end(); return res.json({ linked: false }); }

    const [stats] = await db.query(
      'SELECT pos_x, pos_y, pos_z, hp, hunger, thirst, growth, last_seen FROM playerstats WHERE steam_id = ?',
      [idRows[0].steam_id]
    );
    await db.end();

    if (!stats[0]) return res.json({ linked: true, online: false });
    return res.json({ linked: true, online: true, ...stats[0] });
  } catch (err) {
    await db.end().catch(() => {});
    return res.status(500).json({ error: 'Database error: ' + err.message });
  }
}