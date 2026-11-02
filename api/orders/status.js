// GET /api/orders/status?ref=OR-XXXXXXXX
// Asks Razorpay directly whether the order has been paid, records it, and returns the status.
// A safety net for when the payment window doesn't report back (e.g. a QR paid from another phone).
import { getSql } from '../_lib/db.js';
import { razorpay, recordPayment } from '../_lib/shop.js';
import { invoiceUrl } from '../_lib/invoice.js';

export function createHandler(getDb = getSql, rzp = razorpay) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ message: 'Method not allowed.' }); }
    const ref = String((req.query && req.query.ref) || new URL(req.url, 'http://x').searchParams.get('ref') || '').trim().toUpperCase();
    if (!/^OR-[A-Z0-9]{8}$/.test(ref)) return res.status(400).json({ message: 'Invalid order reference.' });
    try {
      const sql = getDb();
      const [order] = await sql`SELECT order_ref, status, razorpay_order_id FROM orders WHERE order_ref = ${ref}`;
      if (!order) return res.status(404).json({ message: 'Order not found.' });
      let status = order.status;
      if ((status === 'created' || status === 'failed') && order.razorpay_order_id) {
        const list = await rzp('/orders/' + encodeURIComponent(order.razorpay_order_id) + '/payments');
        const items = (list && list.items) || [];
        // Record every attempt; a captured/authorized one marks the order paid.
        items.sort((a, b) => (a.status === 'captured' || a.status === 'authorized' ? 1 : 0) - (b.status === 'captured' || b.status === 'authorized' ? 1 : 0));
        for (const p of items) {
          const r = await recordPayment(sql, p);
          if (r.found) status = r.order_status;
        }
      }
      return res.status(200).json({ order_ref: ref, status, paid: status === 'paid', invoice_url: status === 'paid' ? invoiceUrl(ref) : null });
    } catch (err) {
      console.error('orders/status failed', err);
      return res.status(500).json({ message: 'Could not check the order.' });
    }
  };
}

export default createHandler();
