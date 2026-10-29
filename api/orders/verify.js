// POST /api/orders/verify  confirms a payment right after Razorpay Checkout succeeds.
import { getSql } from '../_lib/db.js';
import { checkPaymentSignature, razorpay, recordPayment } from '../_lib/shop.js';

export function createHandler(getDb = getSql, rzp = razorpay) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ message: 'Method not allowed.' }); }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    const b = body && typeof body === 'object' ? body : {};
    const orderId = String(b.razorpay_order_id || ''), paymentId = String(b.razorpay_payment_id || ''), signature = String(b.razorpay_signature || '');

    if (!checkPaymentSignature(orderId, paymentId, signature)) {
      return res.status(400).json({ ok: false, message: 'We couldn’t verify this payment.' });
    }
    try {
      const sql = getDb();
      const payment = await rzp('/payments/' + encodeURIComponent(paymentId));
      if (payment.order_id !== orderId) return res.status(400).json({ ok: false, message: 'Payment does not match this order.' });
      const result = await recordPayment(sql, payment);
      if (!result.found) return res.status(404).json({ ok: false, message: 'Order not found.' });
      return res.status(200).json({ ok: result.order_status === 'paid', order_ref: result.order_ref, status: result.order_status });
    } catch (err) {
      console.error('orders/verify failed', err);
      return res.status(500).json({ ok: false, message: 'Payment received, still confirming.' });
    }
  };
}

export default createHandler();
