import { invoiceUrl, issueInvoice } from './invoice.js';
import { buildInvoicePdf, invoiceFileName } from './invoice-pdf.js';

// Order confirmation emails, sent through Brevo once an order is paid.
// Needs BREVO_API_KEY and MAIL_FROM in Vercel. Without them it does nothing (and says so in the logs).

const inr = (paise) => '₹' + (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: Number(paise) % 100 ? 2 : 0, maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';
const METHODS = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay Later' };

export function buildConfirmationEmail(o) {
  const a = o.shipping_address || {};
  const addr = [a.line1, a.line2, `${a.city || ''}, ${a.state || ''} ${a.pin || ''}`].filter(Boolean).map(esc).join('<br>');
  const rows = o.items.map((i) => `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #EFE6D3;font-size:15px;color:#2E3D28"><b>${esc(i.product_name)}</b><br><span style="font-size:13px;color:#8A8070">50g pouch · ${inr(i.unit_price_paise)} each</span></td>
            <td style="padding:12px 0;border-bottom:1px solid #EFE6D3;font-size:15px;color:#2E3D28;text-align:center;white-space:nowrap">× ${i.quantity}</td>
            <td style="padding:12px 0;border-bottom:1px solid #EFE6D3;font-size:15px;color:#2E3D28;text-align:right;white-space:nowrap">${inr(i.unit_price_paise * i.quantity)}</td>
          </tr>`).join('');
  const first = esc(String(o.customer_name || '').split(' ')[0] || 'there');
  const method = METHODS[o.method] || (o.method ? esc(o.method) : 'Online');
  const wa = 'https://wa.me/917889543491?text=' + encodeURIComponent('Hi openroots, a question about my order ' + o.order_ref);

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F2E9D8;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2E9D8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FBF7EF;border-radius:20px;overflow:hidden">
  <tr><td style="background:#2E3D28;padding:28px 28px 24px;color:#F2E9D8">
    <div style="font-size:26px;font-weight:800;letter-spacing:-0.5px">openroots<sup style="font-size:9px">TM</sup></div>
    <div style="font-size:14px;color:#C9A24B;margin-top:14px;font-weight:700;letter-spacing:1px">ORDER CONFIRMED</div>
    <div style="font-size:24px;font-weight:800;margin-top:4px;line-height:1.25">Thank you, ${first}. Your teas are on their way to being packed.</div>
  </td></tr>
  <tr><td style="padding:24px 28px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px dashed #D9CBA6;border-radius:14px">
      <tr><td style="padding:14px 16px;font-size:13px;color:#8A8070">Order number<br><b style="font-size:17px;color:#2E3D28;letter-spacing:1px;white-space:nowrap">${esc(o.order_ref)}</b></td>
          <td style="padding:14px 16px;font-size:13px;color:#8A8070;text-align:right">Placed on<br><b style="font-size:14px;color:#2E3D28">${esc(when(o.paid_at || o.created_at))}</b></td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:16px 28px 0">
    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#9A8F80">WHAT YOU ORDERED</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
      <tr><td colspan="2" style="padding:12px 0 4px;font-size:14px;color:#6B6153">Subtotal</td><td style="padding:12px 0 4px;font-size:14px;color:#6B6153;text-align:right">${inr(o.subtotal_paise)}</td></tr>
      <tr><td colspan="2" style="padding:4px 0;font-size:14px;color:#6B6153">Delivery</td><td style="padding:4px 0;font-size:14px;color:#6B6153;text-align:right">${o.shipping_paise ? inr(o.shipping_paise) : 'Free'}</td></tr>
      <tr><td colspan="2" style="padding:10px 0 0;font-size:17px;font-weight:800;color:#2E3D28;border-top:2px solid #2E3D28">Total paid</td><td style="padding:10px 0 0;font-size:17px;font-weight:800;color:#2E3D28;text-align:right;border-top:2px solid #2E3D28">${inr(o.total_paise)}</td></tr>
      <tr><td colspan="3" style="padding:6px 0 0;font-size:12px;color:#9A8F80">Paid by ${method}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:22px 28px 0">
    <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:#9A8F80">DELIVERING TO</div>
    <div style="font-size:15px;line-height:1.55;color:#2E3D28;margin-top:6px"><b>${esc(a.name || o.customer_name)}</b><br>${addr}<br><span style="color:#6B6153">+91 ${esc(a.phone || o.phone)}</span></div>
  </td></tr>
  <tr><td style="padding:22px 28px 0;font-size:15px;line-height:1.65;color:#4A4236">
    We’re so glad you’re here. Every pouch is blended and packed by hand in small batches, so it can take a couple of days before it ships. We’ll let you know as soon as it’s on its way.
    <br><br>Steep 1 teaspoon in water at 95°C for 3 to 5 minutes, then sit back and sip.
  </td></tr>
  <tr><td style="padding:22px 28px 28px">
    <a href="${invoiceUrl(o.order_ref)}" style="display:inline-block;background:#C9A24B;color:#223019;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;margin:0 8px 8px 0">View / download GST invoice</a>
    <a href="${wa}" style="display:inline-block;background:#2E3D28;color:#F2E9D8;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px">Questions? Chat with us on WhatsApp</a>
    <div style="font-size:13px;color:#8A8070;margin-top:14px">Your GST invoice is attached as a PDF. Questions? Just reply to this email.<br><br>With love,<br><b style="color:#2E3D28">The three of us at openroots</b> 🌿<br><i>Modern life, ancient roots.</i></div>
  </td></tr>
</table>
<div style="font-size:11px;color:#9A8F80;margin-top:14px">openroots · openroots.in · careopenroots@gmail.com</div>
</td></tr></table></body></html>`;

  const text = [
    `Thank you, ${String(o.customer_name || '').split(' ')[0] || 'there'}! Your openroots order is confirmed.`, '',
    `Order number: ${o.order_ref}`, `Placed on: ${when(o.paid_at || o.created_at)}`, '',
    ...o.items.map((i) => `${i.product_name} x ${i.quantity}  ${inr(i.unit_price_paise * i.quantity)}`), '',
    `Subtotal: ${inr(o.subtotal_paise)}`, `Delivery: ${o.shipping_paise ? inr(o.shipping_paise) : 'Free'}`, `Total paid: ${inr(o.total_paise)}`, '',
    'Delivering to:', a.name || o.customer_name, a.line1, a.line2, `${a.city}, ${a.state} ${a.pin}`, '',
    'Your GST invoice: ' + invoiceUrl(o.order_ref), '',
    'We’ll let you know as soon as it ships. Questions? Reply to this email or WhatsApp +91 78895 43491.', '',
    'With love, the three of us at openroots',
  ].filter((l) => l !== undefined && l !== null).join('\n');

  return { subject: `Your openroots order ${o.order_ref} is confirmed 🌿`, html, text };
}

export async function brevoSend({ to, subject, html, text, replyTo, attachment }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_FROM_NAME || 'openroots', email: process.env.MAIL_FROM },
      to, subject, htmlContent: html, textContent: text,
      replyTo: replyTo || { email: process.env.ORDER_ALERT_TO || process.env.MAIL_FROM, name: 'openroots' },
      ...(attachment ? { attachment } : {}),
    }),
  });
  if (!res.ok) throw new Error('Brevo ' + res.status + ' ' + (await res.text()).slice(0, 300));
  return res.json().catch(() => ({}));
}

// Sends the confirmation once per order. Safe to call from verify, webhook and status at the same time.
export async function sendOrderConfirmation(sql, orderId, send = brevoSend) {
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    console.warn('Order email skipped: BREVO_API_KEY or MAIL_FROM not set');
    return { sent: false, reason: 'not_configured' };
  }
  // Claim the order so only one function sends the email.
  const claimed = await sql`UPDATE orders SET confirmation_email_sent_at = now()
                            WHERE id = ${orderId} AND status = 'paid' AND confirmation_email_sent_at IS NULL
                            RETURNING id`;
  if (!claimed.length) return { sent: false, reason: 'already_sent_or_not_paid' };
  try {
    const [o] = await sql`
      SELECT o.order_ref, o.created_at, o.paid_at, o.subtotal_paise, o.shipping_paise, o.total_paise, o.shipping_address,
             c.name AS customer_name, c.email, c.phone,
             (SELECT p.method FROM payments p WHERE p.order_id = o.id AND p.status IN ('captured','authorized') ORDER BY p.created_at DESC LIMIT 1) AS method
      FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ${orderId}`;
    o.items = await sql`SELECT product_name, unit_price_paise, quantity FROM order_items WHERE order_id = ${orderId} ORDER BY product_name`;
    const mail = buildConfirmationEmail(o);

    // Attach the GST invoice as a PDF (issued now if it wasn't already).
    let attachment;
    try {
      let [inv] = await sql`SELECT invoice_number, issued_at, snapshot FROM invoices WHERE order_id = ${orderId}`;
      if (!inv) { await issueInvoice(sql, orderId); [inv] = await sql`SELECT invoice_number, issued_at, snapshot FROM invoices WHERE order_id = ${orderId}`; }
      if (inv) {
        const bytes = await buildInvoicePdf(inv);
        attachment = [{ name: invoiceFileName(inv.invoice_number), content: Buffer.from(bytes).toString('base64') }];
      }
    } catch (e) { console.error('Invoice PDF for email failed; sending without it', e); }

    await send({ to: [{ email: o.email, name: o.customer_name }], ...mail, attachment });

    // Copy to you, so you know to pack it.
    const alertTo = process.env.ORDER_ALERT_TO || process.env.MAIL_FROM;
    try {
      await send({
        to: [{ email: alertTo, name: 'openroots orders' }],
        subject: `New order ${o.order_ref} · ${inr(o.total_paise)} · ${o.customer_name}`,
        html: mail.html, text: mail.text, attachment,
        replyTo: { email: o.email, name: o.customer_name },
      });
    } catch (e) { console.error('Order alert email failed', e); }
    return { sent: true };
  } catch (err) {
    // Release the claim so the next check (webhook retry or status poll) tries again.
    await sql`UPDATE orders SET confirmation_email_sent_at = NULL WHERE id = ${orderId}`;
    console.error('Order confirmation email failed', err);
    return { sent: false, reason: 'error' };
  }
}
