// POST /api/founding50/apply  saves a Founding 50 application to Neon.
import { getSql } from '../_lib/db.js';
import { validate, looksLikeSpam, ipHash, MAX_PER_IP_PER_HOUR } from '../_lib/founding50.js';

export function createHandler(getDb = getSql) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ message: 'Method not allowed.' });
    }

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }

    // Quietly accept spam so bots don't learn anything; nothing is saved.
    if (looksLikeSpam(body)) return res.status(200).json({ ok: true });

    const { data, errors } = validate(body);
    if (Object.keys(errors).length) {
      return res.status(422).json({ message: 'Please check the highlighted fields.', errors });
    }

    try {
      const sql = getDb();
      const fingerprint = ipHash(req);

      const [{ recent }] = await sql`
        SELECT count(*)::int AS recent FROM founding_applications
        WHERE meta->>'ip_hash' = ${fingerprint} AND created_at > now() - interval '1 hour'`;
      if (recent >= MAX_PER_IP_PER_HOUR) {
        return res.status(429).json({ message: 'Too many attempts. Please wait a while and try again.' });
      }

      const meta = {
        ip_hash: fingerprint,
        elapsed_ms: typeof body.elapsed_ms === 'number' ? body.elapsed_ms : null,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
        source: 'the-original-roots',
      };

      await sql`
        INSERT INTO founding_applications
          (first_name, email, instagram, city, teas, tea_why, order_number, rooting_for, why, marketing_opt_in, meta)
        VALUES
          (${data.first_name}, ${data.email}, ${data.instagram || null}, ${data.city}, ${data.teas},
           ${data.tea_why}, ${data.order_number || null}, ${data.rooting_for}, ${data.why},
           ${data.marketing_opt_in}, ${JSON.stringify(meta)}::jsonb)`;

      const [status] = await sql`SELECT places_left, is_full FROM founding50_status`;
      return res.status(201).json({ ok: true, places_left: status?.places_left ?? null, is_full: status?.is_full ?? false });
    } catch (err) {
      if (err && err.code === '23505') {
        return res.status(409).json({
          message: 'You’ve already applied with this email. We’ll be in touch soon.',
          errors: { email: 'You’ve already applied with this email.' },
        });
      }
      console.error('founding50/apply failed', err);
      return res.status(500).json({ message: 'Something went wrong on our side. Please try again in a moment.' });
    }
  };
}

export default createHandler();
