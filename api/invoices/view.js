// GET /api/invoices/view?id=OR-XXXXXXXX.token  (customer link)
// GET /api/invoices/view?ref=OR-XXXXXXXX&key=ADMIN_KEY  (your access)
// Shows a printable GST tax invoice. Issues it first if the order is paid but has no invoice yet.
import { getSql } from '../_lib/db.js';
import { invoiceToken, issueInvoice, amountInWords } from '../_lib/invoice.js';
import { buildInvoicePdf, invoiceFileName } from '../_lib/invoice-pdf.js';
import { timingSafeEqual } from 'node:crypto';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rs = (paise) => (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateIST = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
const METHODS = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay Later' };
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#F2E9D8;font:14px/1.5 Helvetica,Arial,sans-serif;color:#1f2a1b}
.bar{max-width:820px;margin:16px auto 0;padding:0 12px;display:flex;gap:10px;justify-content:flex-end}
.bar button,.bar a{border:none;border-radius:999px;background:#2E3D28;color:#F2E9D8;font:700 14px Helvetica,Arial,sans-serif;padding:10px 18px;cursor:pointer;text-decoration:none}
.doc{max-width:820px;margin:12px auto 24px;background:#fff;padding:32px;border-radius:14px;box-shadow:0 10px 30px -18px rgba(0,0,0,.4)}
h1{margin:0;font-size:20px;letter-spacing:.5px}.muted{color:#6b6153}.small{font-size:12px}
.top{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-bottom:2px solid #2E3D28;padding-bottom:14px}
.brand{font-size:26px;font-weight:800;color:#2E3D28;letter-spacing:-.5px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}
.box{border:1px solid #e3dccb;border-radius:10px;padding:12px}.box b{display:block;font-size:11px;letter-spacing:1px;color:#8a8070;margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin-top:6px}th,td{padding:7px 6px;border-bottom:1px solid #ece5d4;text-align:right;vertical-align:top}
th{font-size:11px;letter-spacing:.5px;color:#6b6153;background:#faf6ec}th:first-child,td:first-child,th:nth-child(2),td:nth-child(2){text-align:left}
.tot td{font-weight:700}.grand td{font-size:16px;font-weight:800;border-top:2px solid #2E3D28}
.words{margin-top:10px;font-weight:700}.foot{margin-top:18px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:12px}
.scroll{overflow-x:auto}.mtotal{display:none}
@media (max-width:640px){.doc{padding:18px;border-radius:0}.grid{grid-template-columns:1fr}th,td{padding:6px 5px;font-size:12px}.top>div:last-child{text-align:left!important}.scroll table{min-width:620px}.scroll::after{content:'Swipe the table sideways to see all columns';display:block;font-size:11px;color:#9a8f80;margin-top:6px}.mtotal{display:flex;justify-content:space-between;align-items:baseline;background:#2E3D28;color:#F2E9D8;border-radius:10px;padding:12px 14px;margin:4px 0 12px}.mtotal b{font-size:18px}}
@media print{body{background:#fff}.bar{display:none}.doc{box-shadow:none;margin:0;max-width:none;padding:0;border-radius:0}@page{size:A4;margin:14mm}}
</style></head><body>${body}</body></html>`;
}

function render(inv) {
  const s = inv.snapshot, se = s.seller, b = s.buyer, intra = s.supply_type === 'intra';
  const taxCols = intra ? '<th>CGST</th><th>SGST</th>' : '<th>IGST</th>';
  const rows = s.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td>${esc(l.hsn)}</td><td>${l.qty} ${esc(l.unit)}</td>
    <td>${rs(l.taxable)}</td><td>${l.rate}%</td>${intra ? `<td>${rs(l.cgst)}<br><span class="muted small">${l.rate / 2}%</span></td><td>${rs(l.sgst)}<br><span class="muted small">${l.rate / 2}%</span></td>` : `<td>${rs(l.igst)}</td>`}
    <td>${rs(l.gross)}</td></tr>`).join('');
  const t = s.totals;
  const addr = [b.line1, b.line2, `${b.city}, ${b.state} ${b.pin}`].filter(Boolean).map(esc).join('<br>');
  return page(`Tax Invoice ${inv.invoice_number}`, `
<div class="bar"><a href="#" onclick="var u=new URL(location.href);u.searchParams.set('format','pdf');location.href=u.toString();return false">Download PDF</a><button onclick="window.print()">Print</button></div>
<div class="doc">
  <div class="top">
    <div><div class="brand">openroots<sup style="font-size:9px">TM</sup></div>
      <div><b>${esc(se.legal_name)}</b>${se.trade_name ? ` <span class="muted">(brand: ${esc(se.trade_name)})</span>` : ''}</div>
      ${se.tagline ? `<div class="muted small" style="letter-spacing:2px">${esc(se.tagline.toUpperCase())}</div>` : ''}
      <div class="muted">${esc(se.address).replace(/\n/g, '<br>')}</div>
      <div>GSTIN: <b>${esc(se.gstin)}</b> · State: ${esc(se.state)} (${esc(se.state_code)})</div>
      <div>FSSAI Reg. No.: <b>${esc(se.fssai)}</b></div>
      ${se.pan || se.msme ? `<div>${se.pan ? 'PAN: ' + esc(se.pan) : ''}${se.pan && se.msme ? ' · ' : ''}${se.msme ? 'MSME: ' + esc(se.msme) : ''}</div>` : ''}
      <div class="muted small">${esc(se.email)} · ${esc(se.phone)} · ${esc(se.website)}</div></div>
    <div style="text-align:right"><h1>TAX INVOICE</h1>
      <div>Invoice No.: <b>${esc(inv.invoice_number)}</b></div>
      <div>Invoice Date: <b>${dateIST(inv.issued_at)}</b></div>
      <div>Order No.: ${esc(s.order_ref)}</div>
      <div>Order Date: ${dateIST(s.order_date)}</div>
      ${s.payment_method ? `<div>Payment: ${esc(METHODS[s.payment_method] || s.payment_method)} (prepaid)</div>` : ''}</div>
  </div>
  <div class="grid">
    <div class="box"><b>BILL TO / SHIP TO</b><strong>${esc(b.name)}</strong><br>${addr}<br>State code: ${esc(b.state_code)}<br><span class="muted">${esc(b.phone ? '+91 ' + b.phone : '')}${b.email ? ' · ' + esc(b.email) : ''}</span></div>
    <div class="box"><b>SUPPLY DETAILS</b>Place of supply: <strong>${esc(s.pos_state)} (${esc(s.pos_code)})</strong><br>
      Supply type: ${intra ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}<br>Tax payable on reverse charge: No<br>Buyer: Unregistered (B2C)</div>
  </div>
  <div class="mtotal"><span>Invoice total<br><span class="small">incl. GST ₹${rs(t.cgst + t.sgst + t.igst)}</span></span><b>₹${rs(t.total)}</b></div>
  <div class="scroll"><table>
    <thead><tr><th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Taxable value (₹)</th><th>GST rate</th>${taxCols}<th>Amount (₹)</th></tr></thead>
    <tbody>${rows}
      <tr class="tot"><td></td><td colspan="3">Total</td><td>${rs(t.taxable)}</td><td></td>${intra ? `<td>${rs(t.cgst)}</td><td>${rs(t.sgst)}</td>` : `<td>${rs(t.igst)}</td>`}<td>${rs(t.total)}</td></tr>
      <tr class="grand"><td></td><td colspan="${intra ? 7 : 6}">Grand total (INR, inclusive of GST)</td><td>₹${rs(t.total)}</td></tr>
    </tbody></table></div>
  <div class="words">${esc(amountInWords(t.total))}</div>
  <div class="muted small">Total GST: ₹${rs(t.cgst + t.sgst + t.igst)}. Prices are inclusive of GST. Delivery charges are part of a composite supply and taxed at the rate of the goods.</div>
  <div class="foot">
    <div class="muted">This is a computer-generated invoice issued electronically and does not require a physical signature.<br>
      Herbal infusions are not intended to diagnose, treat, cure or prevent any disease.</div>
    <div style="text-align:right">For <b>${esc(se.legal_name)}</b><br><br>Authorised Signatory</div>
  </div>
</div>`);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const q = req.query || {};
  let ref = '', ok = false;
  if (q.id) {
    const [r, tok] = String(q.id).split('.');
    ref = String(r || '').toUpperCase();
    ok = Boolean(tok) && same(tok, invoiceToken(ref));
  } else if (q.ref && process.env.ADMIN_KEY && q.key === process.env.ADMIN_KEY) {
    ref = String(q.ref).toUpperCase(); ok = true;
  }
  const send = (code, html) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.statusCode = code; res.end(html); };
  if (!ok || !/^OR-[A-Z0-9]{8}$/.test(ref)) return send(404, page('Invoice not found', '<div class="doc"><h1>Invoice not found</h1><p>Please check the link, or WhatsApp us on +91 78895 43491.</p></div>'));
  try {
    const sql = getSql();
    const [order] = await sql`SELECT id, status FROM orders WHERE order_ref = ${ref}`;
    if (!order) return send(404, page('Invoice not found', '<div class="doc"><h1>Invoice not found</h1></div>'));
    let [inv] = await sql`SELECT invoice_number, issued_at, snapshot FROM invoices WHERE order_id = ${order.id}`;
    if (!inv && ['paid', 'shipped', 'delivered'].includes(order.status)) {
      await issueInvoice(sql, order.id);
      [inv] = await sql`SELECT invoice_number, issued_at, snapshot FROM invoices WHERE order_id = ${order.id}`;
    }
    if (!inv) return send(200, page('Invoice on its way', `<div class="doc"><h1>Your invoice is being prepared</h1><p>Order ${esc(ref)}. Please check back shortly, or WhatsApp us on +91 78895 43491.</p></div>`));
    if (q.format === 'pdf') {
      const bytes = await buildInvoicePdf(inv);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="' + invoiceFileName(inv.invoice_number) + '"');
      res.statusCode = 200;
      return res.end(Buffer.from(bytes));
    }
    return send(200, render(inv));
  } catch (err) {
    console.error('invoices/view failed', err);
    return send(500, page('Error', '<div class="doc"><h1>Something went wrong</h1><p>Please try again in a moment.</p></div>'));
  }
}
