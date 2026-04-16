import { getDb } from '../../lib/db';

/**
 * GET /api/heatmap
 * Returns all player positions from the last 24h for heatmap rendering.
 * No authentication required (only aggregated data, no personal info).
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  const db = await getDb();
  try {
    const [rows] = await db.query(
      'SELECT pos_x, pos_z FROM playerstats WHERE last_seen > DATE_SUB(NOW(), INTERVAL 24 HOUR) AND pos_x IS NOT NULL'
    );
    await db.end();
    return res.json({ points: rows.map(r => ({ x: r.pos_x, z: r.pos_z })), count: rows.length });
  } catch (err) {
    await db.end().catch(() => {});
    return res.status(500).json({ error: 'Database error: ' + err.message });
  }
}