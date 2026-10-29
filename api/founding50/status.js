// GET /api/founding50/status  public count of Founding 50 places.
import { getSql } from '../_lib/db.js';

export function createHandler(getDb = getSql) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ message: 'Method not allowed.' });
    }
    try {
      const sql = getDb();
      const [s] = await sql`SELECT places_taken, places_left, is_full FROM founding50_status`;
      // Cached for a minute at Vercel's edge, so the database isn't hit on every page view.
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({
        places_total: 50,
        places_taken: Number(s?.places_taken ?? 0),
        places_left: Number(s?.places_left ?? 50),
        is_full: Boolean(s?.is_full),
      });
    } catch (err) {
      console.error('founding50/status failed', err);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(500).json({ message: 'Could not load the count.' });
    }
  };
}

export default createHandler();
