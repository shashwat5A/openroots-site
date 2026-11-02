// Builds the GST tax invoice as an A4 PDF (same content as the web invoice page).
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { amountInWords } from './invoice.js';

const INK = rgb(0.12, 0.16, 0.1), GREEN = rgb(0.18, 0.24, 0.16), MUTED = rgb(0.42, 0.38, 0.33), LINE = rgb(0.89, 0.86, 0.79), HEAD = rgb(0.98, 0.965, 0.925);
const METHODS = { upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay Later' };
const rs = (p) => (Number(p) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateIST = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
// Built-in PDF fonts only cover basic Latin, so anything else (e.g. ₹ or Devanagari) is swapped for a safe equivalent.
const safe = (s) => String(s ?? '').replace(/₹/g, 'Rs. ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E\n]/g, '?');

export async function buildInvoicePdf(inv) {
  const s = inv.snapshot, se = s.seller, b = s.buyer, t = s.totals, intra = s.supply_type === 'intra';
  const pdf = await PDFDocument.create();
  pdf.setTitle('Tax Invoice ' + inv.invoice_number); pdf.setAuthor(se.legal_name); pdf.setCreator('openroots.in');
  const reg = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 40;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  const text = (str, x, yy, { size = 9, font = reg, color = INK, align = 'left', width } = {}) => {
    const v = safe(str);
    const w = font.widthOfTextAtSize(v, size);
    const xx = align === 'right' ? x + (width ?? 0) - w : align === 'center' ? x + ((width ?? 0) - w) / 2 : x;
    page.drawText(v, { x: xx, y: yy, size, font, color });
  };
  const wrap = (str, font, size, maxW) => {
    const out = [];
    for (const para of safe(str).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const tryLine = line ? line + ' ' + word : word;
        if (font.widthOfTextAtSize(tryLine, size) <= maxW) line = tryLine;
        else { if (line) out.push(line); line = word; }
      }
      out.push(line);
    }
    return out;
  };
  const block = (lines, x, yy, opts = {}) => { const lh = (opts.size || 9) * 1.35; lines.forEach((l, i) => text(l, x, yy - i * lh, opts)); return yy - lines.length * lh; };

  // ---- header ----
  text('openroots', M, y - 14, { size: 22, font: bold, color: GREEN });
  text('TAX INVOICE', W - M - 200, y - 12, { size: 15, font: bold, align: 'right', width: 200 });
  let ly = y - 32;
  ly = block([se.legal_name + (se.trade_name ? '  (brand: ' + se.trade_name + ')' : '')], M, ly, { font: bold });
  if (se.tagline) ly = block([se.tagline.toUpperCase()], M, ly, { size: 7, color: MUTED }) - 3;
  ly = block(wrap(se.address, reg, 9, 300), M, ly, { color: MUTED });
  ly = block(['GSTIN: ' + se.gstin + '   State: ' + se.state + ' (' + se.state_code + ')', 'FSSAI Reg. No.: ' + se.fssai,
    [se.pan ? 'PAN: ' + se.pan : '', se.msme ? 'MSME: ' + se.msme : ''].filter(Boolean).join('   ')].filter(Boolean), M, ly);
  ly = block([se.email + '  |  ' + se.phone + '  |  ' + se.website], M, ly, { size: 8, color: MUTED });
  const right = [
    ['Invoice No.', inv.invoice_number], ['Invoice Date', dateIST(inv.issued_at)], ['Order No.', s.order_ref], ['Order Date', dateIST(s.order_date)],
    ...(s.payment_method ? [['Payment', (METHODS[s.payment_method] || s.payment_method) + ' (prepaid)']] : []),
  ];
  let ry = y - 32;
  right.forEach(([k, v]) => { text(k + ':', W - M - 200, ry, { color: MUTED }); text(v, W - M - 110, ry, { font: bold, align: 'right', width: 110 }); ry -= 12.5; });
  y = Math.min(ly, ry) - 6;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.5, color: GREEN });
  y -= 14;

  // ---- parties ----
  const boxW = (W - 2 * M - 12) / 2;
  const left = [b.name, b.line1, b.line2, `${b.city}, ${b.state} ${b.pin}`, 'State code: ' + b.state_code, [b.phone ? '+91 ' + b.phone : '', b.email].filter(Boolean).join('  |  ')].filter(Boolean);
  const leftLines = left.flatMap((l, i) => wrap(l, i === 0 ? bold : reg, 9, boxW - 16));
  const rightLines = ['Place of supply: ' + s.pos_state + ' (' + s.pos_code + ')', 'Supply type: ' + (intra ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'), 'Tax payable on reverse charge: No', 'Buyer: Unregistered (B2C)'];
  const boxH = Math.max(leftLines.length, rightLines.length) * 12.2 + 26;
  [[M, 'BILL TO / SHIP TO', leftLines], [M + boxW + 12, 'SUPPLY DETAILS', rightLines]].forEach(([x, title, lines], bi) => {
    page.drawRectangle({ x, y: y - boxH, width: boxW, height: boxH, borderColor: LINE, borderWidth: 1 });
    text(title, x + 8, y - 13, { size: 7, font: bold, color: MUTED });
    lines.forEach((l, i) => text(l, x + 8, y - 26 - i * 12.2, { font: bi === 0 && i === 0 ? bold : reg }));
  });
  y -= boxH + 16;

  // ---- items table ----
  const cols = intra
    ? [['#', 18, 'left'], ['Description', 163, 'left'], ['HSN', 36, 'left'], ['Qty', 40, 'right'], ['Taxable (Rs.)', 62, 'right'], ['GST', 30, 'right'], ['CGST', 48, 'right'], ['SGST', 48, 'right'], ['Amount (Rs.)', 70, 'right']]
    : [['#', 18, 'left'], ['Description', 199, 'left'], ['HSN', 38, 'left'], ['Qty', 42, 'right'], ['Taxable (Rs.)', 66, 'right'], ['GST', 32, 'right'], ['IGST', 50, 'right'], ['Amount (Rs.)', 70, 'right']];
  const xs = []; cols.reduce((x, c) => { xs.push(x); return x + c[1]; }, M);
  const tableW = cols.reduce((a, c) => a + c[1], 0);
  page.drawRectangle({ x: M, y: y - 18, width: tableW, height: 18, color: HEAD });
  cols.forEach(([h, w, al], i) => text(h, xs[i] + 3, y - 12, { size: 7.5, font: bold, color: MUTED, align: al, width: w - 6 }));
  y -= 18;
  s.lines.forEach((l, n) => {
    const desc = wrap(l.description, reg, 8.5, cols[1][1] - 6);
    const rowH = Math.max(desc.length, intra ? 2 : 1) * 11 + 9;
    if (y - rowH < 140) { page = pdf.addPage([W, H]); y = H - M; }
    const vals = intra
      ? [String(n + 1), null, l.hsn, l.qty + ' ' + l.unit, rs(l.taxable), l.rate + '%', rs(l.cgst), rs(l.sgst), rs(l.gross)]
      : [String(n + 1), null, l.hsn, l.qty + ' ' + l.unit, rs(l.taxable), l.rate + '%', rs(l.igst), rs(l.gross)];
    vals.forEach((v, i) => { if (v !== null) text(v, xs[i] + 3, y - 12, { size: 8.5, align: cols[i][2], width: cols[i][1] - 6 }); });
    desc.forEach((d, i) => text(d, xs[1] + 3, y - 12 - i * 11, { size: 8.5 }));
    if (intra) { [6, 7].forEach((ci) => text(l.rate / 2 + '%', xs[ci] + 3, y - 23, { size: 7, color: MUTED, align: 'right', width: cols[ci][1] - 6 })); }
    y -= rowH;
    page.drawLine({ start: { x: M, y }, end: { x: M + tableW, y }, thickness: 0.6, color: LINE });
  });
  // totals row
  y -= 2;
  text('Total', xs[1] + 3, y - 12, { size: 9, font: bold });
  const totVals = intra ? { 4: rs(t.taxable), 6: rs(t.cgst), 7: rs(t.sgst), 8: rs(t.total) } : { 4: rs(t.taxable), 6: rs(t.igst), 7: rs(t.total) };
  Object.entries(totVals).forEach(([i, v]) => text(v, xs[i] + 3, y - 12, { size: 9, font: bold, align: 'right', width: cols[i][1] - 6 }));
  y -= 20;
  page.drawLine({ start: { x: M, y }, end: { x: M + tableW, y }, thickness: 1.5, color: GREEN });
  text('Grand total (INR, inclusive of GST)', xs[1] + 3, y - 16, { size: 11, font: bold });
  text('Rs. ' + rs(t.total), M, y - 16, { size: 12, font: bold, align: 'right', width: tableW - 3 });
  y -= 34;
  y = block(wrap(amountInWords(t.total), bold, 9.5, W - 2 * M), M, y, { size: 9.5, font: bold });
  y = block(wrap('Total GST: Rs. ' + rs(t.cgst + t.sgst + t.igst) + '. Prices are inclusive of GST. Delivery charges are part of a composite supply and taxed at the rate of the goods.', reg, 8, W - 2 * M), M, y - 2, { size: 8, color: MUTED });

  // ---- footer ----
  y -= 22;
  block(wrap('This is a computer-generated invoice issued electronically and does not require a physical signature.', reg, 8, 330), M, y, { size: 8, color: MUTED });
  block(['Herbal infusions are not intended to diagnose, treat, cure or prevent any disease.'], M, y - 24, { size: 8, color: MUTED });
  text('For ' + se.legal_name, W - M - 200, y, { size: 9, font: bold, align: 'right', width: 200 });
  text('Authorised Signatory', W - M - 200, y - 30, { size: 9, align: 'right', width: 200 });

  return pdf.save();
}

export const invoiceFileName = (invoiceNumber) => 'openroots-invoice-' + String(invoiceNumber).replace(/[^A-Za-z0-9-]/g, '-') + '.pdf';
