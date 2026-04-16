import { getDb } from '../../lib/db';

/**
 * GET /api/heatmap
 * Returns player positions from the last 24h for heatmap rendering.
 * Reads from 'heatmap_log' if it exists, falls back to 'player_positions'.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  const db = await getDb();
  try {
    let rows;
    try {
      [rows] = await db.query(
        'SELECT pos_x, pos_z FROM heatmap_log WHERE logged_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)'
      );
    } catch {
      [rows] = await db.query(
        'SELECT pos_x, pos_z FROM player_positions WHERE last_seen > DATE_SUB(NOW(), INTERVAL 24 HOUR) AND pos_x IS NOT NULL'
      );
    }
    await db.end();
    return res.json({ points: rows.map(r => ({ x: r.pos_x, z: r.pos_z })), count: rows.length });
  } catch (err) {
    await db.end().catch(() => {});
    return res.status(500).json({ error: err.message });
  }
}