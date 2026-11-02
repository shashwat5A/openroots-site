// Order confirmation on WhatsApp, sent through Meta's WhatsApp Cloud API once an order is paid.
// Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel, and an approved template (default name: order_confirmed).
// Without them it does nothing (and says so in the logs).

import { invoiceId } from './invoice.js';

const inr = (paise) => '₹' + (Number(paise) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
// Meta rejects template values containing new lines, tabs or 4+ spaces.
const clean = (s, max = 200) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim().slice(0, max) || '-';

export function templatePayload(o) {
  const items = o.items.map((i) => `${i.product_name} x${i.quantity}`).join(', ');
  return {
    messaging_product: 'whatsapp',
    to: '91' + o.phone,
    type: 'template',
    template: {
      name: process.env.WHATSAPP_TEMPLATE || 'order_confirmed',
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: clean(String(o.customer_name || '').split(' ')[0] || 'there', 60) }, // {{1}} first name
          { type: 'text', text: clean(o.order_ref, 20) },                                           // {{2}} order number
          { type: 'text', text: clean(items, 500) },                                                // {{3}} items
          { type: 'text', text: clean(inr(o.total_paise), 20) },                                    // {{4}} total paid
        ],
      }, {
        // "View invoice" button. Template button URL: https://openroots.in/api/invoices/view?id={{1}}
        type: 'button', sub_type: 'url', index: '0',
        parameters: [{ type: 'text', text: invoiceId(o.order_ref) }],
      }],
    },
  };
}

export async function metaSend(payload) {
  const version = process.env.WHATSAPP_API_VERSION || 'v23.0';
  const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.WHATSAPP_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('WhatsApp ' + res.status + ' ' + JSON.stringify(json?.error || json).slice(0, 400));
  return json;
}

// Sends once per order, only if the customer ticked "Send my order updates on WhatsApp".
export async function sendWhatsAppConfirmation(sql, orderId, send = metaSend) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('WhatsApp message skipped: WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set');
    return { sent: false, reason: 'not_configured' };
  }
  const claimed = await sql`UPDATE orders SET confirmation_whatsapp_sent_at = now()
                            WHERE id = ${orderId} AND status = 'paid' AND confirmation_whatsapp_sent_at IS NULL
                              AND COALESCE((notes->>'whatsapp_opt_in')::boolean, false)
                            RETURNING id`;
  if (!claimed.length) return { sent: false, reason: 'already_sent_not_paid_or_no_opt_in' };
  try {
    const [o] = await sql`SELECT o.order_ref, o.total_paise, c.name AS customer_name, c.phone
                          FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ${orderId}`;
    o.items = await sql`SELECT product_name, quantity FROM order_items WHERE order_id = ${orderId} ORDER BY product_name`;
    const r = await send(templatePayload(o));
    console.log('WhatsApp confirmation sent', { order: o.order_ref, message: r?.messages?.[0]?.id });
    return { sent: true };
  } catch (err) {
    await sql`UPDATE orders SET confirmation_whatsapp_sent_at = NULL WHERE id = ${orderId}`;
    console.error('WhatsApp confirmation failed', err);
    return { sent: false, reason: 'error', error: String(err.message || err).slice(0, 300) };
  }
}
