// GET /api/orders/resend?ref=OR-XXXXXXXX&key=YOUR_ADMIN_KEY&channel=email|whatsapp|both
// Re-sends the order confirmation (for testing, or if a customer didn't get it). Default channel: both.
import { getSql } from '../_lib/db.js';
import { sendOrderConfirmation } from '../_lib/notify.js';
import { sendWhatsAppConfirmation } from '../_lib/whatsapp.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const q = req.query || {};
  if (!process.env.ADMIN_KEY || q.key !== process.env.ADMIN_KEY) return res.status(401).json({ message: 'Not allowed.' });
  const ref = String(q.ref || '').trim().toUpperCase();
  const channel = ['email', 'whatsapp'].includes(q.channel) ? q.channel : 'both';
  try {
    const sql = getSql();
    const [o] = await sql`SELECT id FROM orders WHERE order_ref = ${ref} AND status = 'paid'`;
    if (!o) return res.status(404).json({ message: 'No paid order with that number.' });
    const out = {};
    if (channel !== 'whatsapp') {
      await sql`UPDATE orders SET confirmation_email_sent_at = NULL WHERE id = ${o.id}`;
      out.email = await sendOrderConfirmation(sql, o.id);
    }
    if (channel !== 'email') {
      // Only goes to customers who ticked "Send my order updates on WhatsApp" (WhatsApp's rules require opt-in).
      await sql`UPDATE orders SET confirmation_whatsapp_sent_at = NULL WHERE id = ${o.id}`;
      out.whatsapp = await sendWhatsAppConfirmation(sql, o.id);
    }
    return res.status(200).json(out);
  } catch (err) {
    console.error('orders/resend failed', err);
    return res.status(500).json({ message: 'Failed.' });
  }
}
