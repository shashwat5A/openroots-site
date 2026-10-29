// Founding 50 form: server-side checks (the page checks too, but never trust the browser).
import { createHash } from 'node:crypto';

export const TEAS = ['Anti-stress', 'Deep sleep', 'Happy gut', 'Heart care', 'Skin glow', 'Stay immune'];
export const MAX_PER_IP_PER_HOUR = 5;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export function validate(body) {
  const b = body && typeof body === 'object' ? body : {};
  const data = {
    first_name: str(b.first_name),
    email: str(b.email).toLowerCase(),
    instagram: str(b.instagram).replace(/^@/, ''),
    city: str(b.city),
    teas: Array.isArray(b.teas) ? [...new Set(b.teas.map(str))] : [],
    tea_why: str(b.tea_why),
    order_number: str(b.order_number).replace(/^#/, ''),
    rooting_for: str(b.rooting_for),
    why: str(b.why),
    marketing_opt_in: b.marketing_opt_in === true,
  };
  const errors = {};
  if (!data.first_name) errors.first_name = 'Please tell us your first name.';
  else if (data.first_name.length > 50) errors.first_name = 'Please keep this under 50 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email) || data.email.length > 120) errors.email = 'Please enter a valid email address.';
  if (data.instagram && !/^[A-Za-z0-9._]{1,30}$/.test(data.instagram)) errors.instagram = 'That doesn’t look like an Instagram handle.';
  if (!data.city) errors.city = 'Please tell us your city.';
  else if (data.city.length > 60) errors.city = 'Please keep this under 60 characters.';
  if (!data.teas.length || data.teas.some((t) => !TEAS.includes(t))) errors.teas = 'Please choose at least one tea.';
  if (!data.tea_why) errors.tea_why = 'Tell us a little about why you chose it.';
  else if (data.tea_why.length > 400) errors.tea_why = 'Please keep this under 400 characters.';
  if (data.order_number.length > 30) errors.order_number = 'That order number looks too long.';
  if (!data.rooting_for) errors.rooting_for = 'What are you rooting for?';
  else if (data.rooting_for.length > 120) errors.rooting_for = 'Please keep this under 120 characters.';
  if (!data.why) errors.why = 'Tell us why you’d like to be part of the Founding 50.';
  else if (data.why.length > 600) errors.why = 'Please keep this under 600 characters.';
  return { data, errors };
}

// Bots fill the hidden check field or submit in seconds. Returns the reason, or '' if it looks human.
export function spamReason(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (str(b.hp) || str(b.company)) return 'hidden field filled';
  if (typeof b.elapsed_ms === 'number' && b.elapsed_ms < 3000) return 'submitted in under 3 seconds';
  return '';
}

// Store a one-way fingerprint of the visitor's IP, never the IP itself.
export function ipHash(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = fwd || req.socket?.remoteAddress || 'unknown';
  return createHash('sha256').update((process.env.IP_HASH_SALT || 'openroots') + ip).digest('hex').slice(0, 32);
}
