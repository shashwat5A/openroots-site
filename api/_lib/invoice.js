// GST tax invoices for paid orders (CGST Rules, Rule 46), with FSSAI number.
// Prices on the site INCLUDE GST, so tax is worked out backwards from the price paid.
// Same state as the seller (Delhi, code 07) = CGST + SGST. Any other state = IGST.
import { createHmac } from 'node:crypto';

export const STATE_CODES = {
  'Jammu and Kashmir': '01', 'Himachal Pradesh': '02', 'Punjab': '03', 'Chandigarh': '04', 'Uttarakhand': '05', 'Haryana': '06',
  'Delhi': '07', 'Rajasthan': '08', 'Uttar Pradesh': '09', 'Bihar': '10', 'Sikkim': '11', 'Arunachal Pradesh': '12', 'Nagaland': '13',
  'Manipur': '14', 'Mizoram': '15', 'Tripura': '16', 'Meghalaya': '17', 'Assam': '18', 'West Bengal': '19', 'Jharkhand': '20',
  'Odisha': '21', 'Chhattisgarh': '22', 'Madhya Pradesh': '23', 'Gujarat': '24', 'Dadra and Nagar Haveli and Daman and Diu': '26',
  'Maharashtra': '27', 'Karnataka': '29', 'Goa': '30', 'Lakshadweep': '31', 'Kerala': '32', 'Tamil Nadu': '33', 'Puducherry': '34',
  'Andaman and Nicobar Islands': '35', 'Telangana': '36', 'Andhra Pradesh': '37', 'Ladakh': '38',
};

// Seller details, taken from the CA-approved invoice (Focus Wellness Enterprises). Any of them can be overridden in Vercel.
export function seller() {
  const gstin = (process.env.SELLER_GSTIN || '07APRPS3924F1ZI').toUpperCase();
  return {
    legal_name: process.env.SELLER_LEGAL_NAME || 'Focus Wellness Enterprises',
    trade_name: process.env.SELLER_TRADE_NAME || 'openroots',
    tagline: process.env.SELLER_TAGLINE || 'Wellness | Balance | Growth',
    address: process.env.SELLER_ADDRESS || 'A-346, D-2, 3rd Floor, Chattarpur Enclave Phase-2, New Delhi - 110074',
    pan: process.env.SELLER_PAN || gstin.slice(2, 12),
    msme: process.env.SELLER_MSME || 'DL-08-0123985',
    state: process.env.SELLER_STATE || 'Delhi',
    state_code: gstin.slice(0, 2),
    gstin,
    fssai: process.env.SELLER_FSSAI || '23326002003826',
    email: process.env.SELLER_EMAIL || 'careopenroots@gmail.com',
    phone: process.env.SELLER_PHONE || '+91 78895 43491',
    website: 'openroots.in',
  };
}
export const sellerReady = () => Boolean(seller().legal_name && seller().address);

// Indian financial year (April to March), in IST, in the CA-approved style. e.g. "2026-27"
export function financialYear(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear(), m = ist.getUTCMonth() + 1;
  const start = m >= 4 ? y : y - 1;
  return start + '-' + String((start + 1) % 100).padStart(2, '0');
}

// Private link token so only the customer (who has the link) can open their invoice.
const linkSecret = () => process.env.INVOICE_LINK_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.ADMIN_KEY || '';
export const invoiceToken = (ref) => createHmac('sha256', linkSecret()).update('invoice:' + ref).digest('hex').slice(0, 20);
export const invoiceId = (ref) => ref + '.' + invoiceToken(ref);
export const invoiceUrl = (ref) => 'https://openroots.in/api/invoices/view?id=' + encodeURIComponent(invoiceId(ref));

function splitTax(tax, intra) {
  if (!intra) return { cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.round(tax / 2);
  return { cgst, sgst: tax - cgst, igst: 0 };
}

// Builds every number on the invoice from the order. All amounts in paise.
export function computeInvoice(order, items, sellerInfo = seller()) {
  const addr = order.shipping_address || {};
  const posState = addr.state || '';
  const posCode = STATE_CODES[posState] || '';
  const intra = posCode === sellerInfo.state_code;

  const lines = items.map((i) => {
    const rate = Number(i.gst_rate ?? 5);
    const gross = Number(i.unit_price_paise) * Number(i.quantity);
    const taxable = Math.round((gross * 100) / (100 + rate));
    return {
      description: `${i.product_name} herbal infusion, ${i.weight_grams || 50}g pouch`,
      hsn: i.hsn_code || '2106', qty: Number(i.quantity), unit: 'NOS',
      unit_price_incl: Number(i.unit_price_paise), rate, gross, taxable, ...splitTax(gross - taxable, intra),
    };
  });
  // Delivery is part of a composite supply, so it is taxed at the rate of the main goods (the highest-value line).
  if (Number(order.shipping_paise) > 0 && lines.length) {
    const main = [...lines].sort((a, b) => b.gross - a.gross)[0];
    const gross = Number(order.shipping_paise);
    const taxable = Math.round((gross * 100) / (100 + main.rate));
    lines.push({ description: 'Delivery charges', hsn: main.hsn, qty: 1, unit: 'NOS', unit_price_incl: gross, rate: main.rate, gross, taxable, ...splitTax(gross - taxable, intra) });
  }
  const sum = (k) => lines.reduce((s, l) => s + l[k], 0);
  const totals = { taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst'), igst: sum('igst'), total: sum('gross') };
  if (totals.total !== Number(order.total_paise)) console.error('Invoice total does not match order total', { order: order.order_ref, invoice: totals.total, order_total: order.total_paise });

  return {
    order_ref: order.order_ref,
    order_date: order.created_at,
    payment_date: order.paid_at,
    payment_method: order.method || null,
    supply_type: intra ? 'intra' : 'inter',
    pos_state: posState, pos_code: posCode,
    reverse_charge: false,
    seller: sellerInfo,
    buyer: {
      name: addr.name || order.customer_name, phone: addr.phone || order.phone, email: order.email,
      line1: addr.line1, line2: addr.line2 || '', city: addr.city, state: posState, state_code: posCode, pin: addr.pin,
    },
    lines, totals,
  };
}

// Issues the invoice once per paid order, with the next number in this financial year's series. Safe to call repeatedly.
export async function issueInvoice(sql, orderId) {
  const [existing] = await sql`SELECT invoice_number FROM invoices WHERE order_id = ${orderId}`;
  if (existing) return { issued: false, invoice_number: existing.invoice_number };
  if (!sellerReady()) {
    console.warn('Invoice not issued: set SELLER_LEGAL_NAME and SELLER_ADDRESS in Vercel');
    return { issued: false, reason: 'seller_details_missing' };
  }
  const [order] = await sql`
    SELECT o.id, o.order_ref, o.created_at, o.paid_at, o.status, o.subtotal_paise, o.shipping_paise, o.total_paise, o.shipping_address,
           c.name AS customer_name, c.email, c.phone,
           (SELECT p.method FROM payments p WHERE p.order_id = o.id AND p.status IN ('captured','authorized') ORDER BY p.created_at DESC LIMIT 1) AS method
    FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ${orderId}`;
  if (!order || !['paid', 'shipped', 'delivered'].includes(order.status)) return { issued: false, reason: 'not_paid' };
  const items = await sql`
    SELECT oi.product_name, oi.unit_price_paise, oi.quantity, p.hsn_code, p.gst_rate, p.weight_grams
    FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ${orderId} ORDER BY oi.product_name`;
  const data = computeInvoice(order, items);
  // Website orders use their own series (OR/2026-27/00001), separate from the FWE/2026-27/.. invoices raised by hand.
  // Rule 46 allows several series; each must run without gaps within the financial year. Max 16 characters.
  const prefix = (process.env.INVOICE_PREFIX || 'OR').replace(/[^A-Za-z0-9-]/g, '').slice(0, 2) || 'OR';
  const [row] = await sql`SELECT issue_invoice(${orderId}, ${financialYear()}, ${prefix}, ${JSON.stringify(data)}::jsonb) AS invoice_number`;
  console.log('Invoice issued', { order: order.order_ref, invoice: row.invoice_number });
  return { issued: true, invoice_number: row.invoice_number };
}

// ---------- amount in words (Indian numbering) ----------
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function under1000(n) {
  const h = Math.floor(n / 100), r = n % 100;
  const rest = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? ' ' + ONES[r % 10] : '');
  return [h ? ONES[h] + ' Hundred' : '', rest].filter(Boolean).join(' ');
}
function words(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(words(crore) + ' Crore');
  if (lakh) parts.push(under1000(lakh) + ' Lakh');
  if (thousand) parts.push(under1000(thousand) + ' Thousand');
  if (n) parts.push(under1000(n));
  return parts.join(' ');
}
export function amountInWords(paise) {
  const r = Math.floor(paise / 100), p = paise % 100;
  return 'Rupees ' + words(r) + (p ? ' and ' + words(p) + ' Paise' : '') + ' Only';
}
