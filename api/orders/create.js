// POST /api/orders/create  saves the order in Neon and opens a matching Razorpay order.
import { getSql } from '../_lib/db.js';
import { validateCheckout, shippingFor, newOrderRef, razorpay, razorpayKeys } from '../_lib/shop.js';

export function createHandler(getDb = getSql, rzp = razorpay) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ message: 'Method not allowed.' }); }
    const { live, keyId, mode } = razorpayKeys();
    if (!live) return res.status(503).json({ message: 'Online payment isn’t switched on yet.' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    const { data, errors } = validateCheckout(body);
    if (Object.keys(errors).length) return res.status(422).json({ message: 'Please check your details.', errors });

    try {
      const sql = getDb();
      // Real prices from the database
      const ids = data.items.map((i) => i.id);
      const products = await sql`SELECT id, name, price_paise FROM products WHERE active AND id = ANY(${ids})`;
      const byId = new Map(products.map((p) => [p.id, p]));
      const missing = ids.filter((id) => !byId.has(id));
      if (missing.length) return res.status(422).json({ message: 'Some teas in your cart are no longer available. Please refresh.', errors: { items: missing } });

      const lines = data.items.map((i) => {
        const p = byId.get(i.id);
        return { product_id: p.id, product_name: p.name, unit_price: Number(p.price_paise), qty: i.qty };
      });
      const subtotal = lines.reduce((s, l) => s + l.unit_price * l.qty, 0);
      const shipping = shippingFor(subtotal);
      const total = subtotal + shipping;
      const orderRef = newOrderRef();
      const shippingAddress = { name: data.customer.name, phone: data.customer.phone, ...data.address };

      // Customer, address, order and items saved in one step: all or nothing.
      const [saved] = await sql`
        WITH c AS (
          INSERT INTO customers (name, email, phone, marketing_opt_in)
          VALUES (${data.customer.name}, ${data.customer.email}, ${data.customer.phone}, ${data.customer.news})
          ON CONFLICT ((lower(email))) DO UPDATE SET
            name = EXCLUDED.name, phone = EXCLUDED.phone,
            marketing_opt_in = customers.marketing_opt_in OR EXCLUDED.marketing_opt_in
          RETURNING id
        ), a AS (
          INSERT INTO addresses (customer_id, line1, line2, city, state, pin)
          SELECT id, ${data.address.line1}, ${data.address.line2 || null}, ${data.address.city}, ${data.address.state}, ${data.address.pin} FROM c
          RETURNING id, customer_id
        ), o AS (
          INSERT INTO orders (order_ref, customer_id, address_id, shipping_address, subtotal_paise, shipping_paise, total_paise)
          SELECT ${orderRef}, a.customer_id, a.id, ${JSON.stringify(shippingAddress)}::jsonb, ${subtotal}, ${shipping}, ${total} FROM a
          RETURNING id
        ), i AS (
          INSERT INTO order_items (order_id, product_id, product_name, unit_price_paise, quantity)
          SELECT o.id, x.product_id, x.product_name, x.unit_price, x.qty
          FROM o, jsonb_to_recordset(${JSON.stringify(lines)}::jsonb) AS x(product_id text, product_name text, unit_price int, qty int)
          RETURNING order_id
        )
        SELECT o.id FROM o`;

      let rzpOrder;
      try {
        rzpOrder = await rzp('/orders', { method: 'POST', body: { amount: total, currency: 'INR', receipt: orderRef, notes: { order_ref: orderRef } } });
      } catch (e) {
        await sql`UPDATE orders SET status = 'failed', notes = notes || ${JSON.stringify({ error: 'razorpay_order_failed' })}::jsonb WHERE id = ${saved.id}`;
        throw e;
      }
      await sql`UPDATE orders SET razorpay_order_id = ${rzpOrder.id} WHERE id = ${saved.id}`;

      return res.status(201).json({
        order_ref: orderRef,
        razorpay_order_id: rzpOrder.id,
        key_id: keyId,
        mode,
        amount: total,
        currency: 'INR',
        subtotal, shipping,
        prefill: { name: data.customer.name, email: data.customer.email, contact: '+91' + data.customer.phone },
      });
    } catch (err) {
      console.error('orders/create failed', err);
      return res.status(500).json({ message: 'We couldn’t start the payment. Please try again in a moment.' });
    }
  };
}

export default createHandler();
