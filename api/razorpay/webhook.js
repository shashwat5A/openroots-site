// POST /api/razorpay/webhook  Razorpay tells us directly about payments, even if the customer closed the tab.
import { createHash } from 'node:crypto';
import { getSql } from '../_lib/db.js';
import { checkWebhookSignature, recordPayment } from '../_lib/shop.js';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export function createWebhook(getDb = getSql) {
  return async function POST(request) {
    const raw = await request.text(); // must be the exact bytes Razorpay sent
    if (!checkWebhookSignature(raw, request.headers.get('x-razorpay-signature'))) return json(400, { ok: false });

    let event;
    try { event = JSON.parse(raw); } catch { return json(400, { ok: false }); }
    const eventId = request.headers.get('x-razorpay-event-id') || createHash('sha256').update(raw).digest('hex');

    try {
      const sql = getDb();
      // Store each event once; a repeat delivery is acknowledged and skipped.
      const fresh = await sql`
        INSERT INTO webhook_events (event_id, event_type, payload)
        VALUES (${eventId}, ${String(event.event || 'unknown')}, ${raw}::jsonb)
        ON CONFLICT (event_id) DO NOTHING RETURNING event_id`;
      if (!fresh.length) return json(200, { ok: true, duplicate: true });

      const payment = event?.payload?.payment?.entity;
      if (payment && payment.order_id) await recordPayment(sql, payment);

      await sql`UPDATE webhook_events SET processed_at = now() WHERE event_id = ${eventId}`;
      return json(200, { ok: true });
    } catch (err) {
      console.error('razorpay/webhook failed', err);
      return json(500, { ok: false }); // Razorpay will retry
    }
  };
}

export const POST = createWebhook();
