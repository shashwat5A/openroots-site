// GET /api/orders/config  tells the cart whether online payment is switched on.
import { razorpayKeys, FREE_SHIPPING_FROM_PAISE, SHIPPING_FEE_PAISE } from '../_lib/shop.js';

export default function handler(req, res) {
  const { keyId, live, mode } = razorpayKeys();
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    payments_live: live,
    mode,                       // 'test' or 'live'
    key_id: live ? keyId : null, // the public key only; the secret never leaves the server
    free_shipping_from_paise: FREE_SHIPPING_FROM_PAISE,
    shipping_fee_paise: SHIPPING_FEE_PAISE,
  });
}
