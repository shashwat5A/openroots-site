// Shared shop rules and Razorpay helpers. Prices always come from the products table, never the browser.
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export const FREE_SHIPPING_FROM_PAISE = 59900; // free delivery from ₹599 (keep in sync with cart.js)
export const SHIPPING_FEE_PAISE = 4900;        // ₹49 below that
export const MAX_QTY = 10;

export const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function shippingFor(subtotalPaise) {
  return subtotalPaise === 0 || subtotalPaise >= FREE_SHIPPING_FROM_PAISE ? 0 : SHIPPING_FEE_PAISE;
}

export function newOrderRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return 'OR-' + s;
}

// Checks the checkout form and cart sent by the browser.
export function validateCheckout(body) {
  const b = body && typeof body === 'object' ? body : {};
  const c = b.customer && typeof b.customer === 'object' ? b.customer : {};
  const a = b.address && typeof b.address === 'object' ? b.address : {};
  const phone = str(c.phone).replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  const data = {
    customer: { name: str(c.name), email: str(c.email).toLowerCase(), phone, news: c.news === true },
    address: { line1: str(a.line1), line2: str(a.line2), city: str(a.city), state: str(a.state), pin: str(a.pin) },
    items: [],
  };
  const errors = {};
  const qty = new Map();
  if (Array.isArray(b.items)) {
    for (const it of b.items) {
      const id = str(it && it.id);
      const q = Number(it && it.qty);
      if (!id || !Number.isInteger(q) || q < 1 || q > MAX_QTY) { errors.items = 'Your cart has an invalid item.'; continue; }
      qty.set(id, Math.min(MAX_QTY, (qty.get(id) || 0) + q));
    }
  }
  data.items = [...qty].map(([id, q]) => ({ id, qty: q }));
  if (!data.items.length) errors.items = errors.items || 'Your cart is empty.';
  if (data.items.length > 20) errors.items = 'Too many items.';
  if (data.customer.name.length < 2 || data.customer.name.length > 80) errors.name = 'Please enter your full name.';
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.customer.email) || data.customer.email.length > 120) errors.email = 'Enter a valid email address.';
  if (data.address.line1.length < 5 || data.address.line1.length > 160) errors.line1 = 'Please add your house number and street.';
  if (data.address.line2.length > 160) errors.line2 = 'Please shorten this.';
  if (data.address.city.length < 2 || data.address.city.length > 60) errors.city = 'Please enter your city.';
  if (!STATES.includes(data.address.state)) errors.state = 'Please choose your state.';
  if (!/^[1-9]\d{5}$/.test(data.address.pin)) errors.pin = 'PIN code must be 6 digits.';
  return { data, errors };
}

// ---- Razorpay ----
export function razorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  return { keyId, keySecret, live: Boolean(keyId && keySecret), mode: keyId.startsWith('rzp_live_') ? 'live' : keyId ? 'test' : null };
}

export async function razorpay(path, { method = 'GET', body } = {}) {
  const { keyId, keySecret } = razorpayKeys();
  const res = await fetch('https://api.razorpay.com/v1' + path, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error('Razorpay ' + method + ' ' + path + ' failed: ' + res.status + ' ' + (json?.error?.description || ''));
    err.status = res.status;
    throw err;
  }
  return json;
}

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

// Checkout signature: HMAC-SHA256(order_id + "|" + payment_id, key secret)
export function checkPaymentSignature(orderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET) {
  if (!secret || !orderId || !paymentId || !signature) return false;
  const expected = createHmac('sha256', secret).update(orderId + '|' + paymentId).digest('hex');
  return safeEqualHex(expected, signature);
}

// Webhook signature: HMAC-SHA256(raw body, webhook secret)
export function checkWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}

// Records a payment from Razorpay and moves the order forward. Safe to call repeatedly.
export async function recordPayment(sql, payment) {
  const status = ['created', 'authorized', 'captured', 'failed', 'refunded'].includes(payment.status) ? payment.status : 'created';
  const fullyRefunded = payment.amount_refunded && payment.amount_refunded >= payment.amount;
  const finalStatus = fullyRefunded ? 'refunded' : status;
  const [order] = await sql`SELECT id, total_paise, status FROM orders WHERE razorpay_order_id = ${payment.order_id}`;
  if (!order) return { found: false };

  await sql`
    INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, method, amount_paise, status, error_code, error_description, raw)
    VALUES (${order.id}, ${payment.order_id}, ${payment.id}, ${payment.method || null}, ${payment.amount}, ${finalStatus},
            ${payment.error_code || null}, ${payment.error_description || null}, ${JSON.stringify(payment)}::jsonb)
    ON CONFLICT (razorpay_payment_id) DO UPDATE SET
      status = EXCLUDED.status, method = COALESCE(EXCLUDED.method, payments.method),
      error_code = EXCLUDED.error_code, error_description = EXCLUDED.error_description, raw = EXCLUDED.raw`;

  const amountOk = Number(payment.amount) === Number(order.total_paise);
  if ((finalStatus === 'captured' || finalStatus === 'authorized') && amountOk) {
    await sql`UPDATE orders SET status = 'paid', paid_at = COALESCE(paid_at, now())
              WHERE id = ${order.id} AND status IN ('created', 'failed')`;
  } else if (finalStatus === 'failed') {
    await sql`UPDATE orders SET status = 'failed' WHERE id = ${order.id} AND status = 'created'`;
  } else if (finalStatus === 'refunded') {
    await sql`UPDATE orders SET status = 'refunded' WHERE id = ${order.id} AND status IN ('paid', 'shipped', 'delivered')`;
  }
  if (!amountOk && finalStatus !== 'failed') console.error('Payment amount does not match order total', { payment: payment.id, order: order.id });
  const [after] = await sql`SELECT order_ref, status FROM orders WHERE id = ${order.id}`;
  return { found: true, amountOk, order_ref: after.order_ref, order_status: after.status };
}
