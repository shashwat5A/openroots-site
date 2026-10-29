// openroots: cart, drawer and checkout
(function () { try {
  // ---- Settings: edit prices and delivery here ----
  var PRICES = { 'anti-stress': 299, 'deep-sleep': 299, 'happy-gut': 299, 'heart-care': 299, 'skin-glow': 299, 'stay-immune': 299 }; // placeholder prices in rupees
  var FREE_SHIPPING_FROM = 599;   // free delivery at or above this subtotal
  var SHIPPING_FEE = 49;          // delivery fee below the threshold
  var MAX_QTY = 10;
  var PAYMENTS_LIVE = false;      // switch on once Razorpay is connected
  var WA_NUMBER = '917889543491';

  var NAMES = { 'anti-stress': 'Anti-Stress', 'deep-sleep': 'Deep Sleep', 'happy-gut': 'Happy Gut', 'heart-care': 'Heart Care', 'skin-glow': 'Skin Glow', 'stay-immune': 'Stay Immune' };
  var TAGS = { 'anti-stress': 'Breathe in. Breathe out.', 'deep-sleep': 'See you in the morning.', 'happy-gut': 'Your gut, your happy place!', 'heart-care': 'Everything will be OK!', 'skin-glow': 'Glow from the inside.', 'stay-immune': 'Stay well, sniffles and all.' };
  var COLOURS = { 'anti-stress': ['#6B4FA8', '#F5EFFF', '#6B4FA8'], 'deep-sleep': ['#1F2A63', '#E8ECFF', '#1F2A63'], 'happy-gut': ['#7C3A18', '#F6E7D4', '#7C3A18'], 'heart-care': ['#A3122C', '#FDECE7', '#A3122C'], 'skin-glow': ['#C9513A', '#FFF4EE', '#B4432D'], 'stay-immune': ['#EFB01A', '#4A3105', '#9A6F06'] };
  var STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

  var KEY = 'or-cart-v1', DKEY = 'or-details-v1';

  // ---- make sure the cart markup exists, even if an older page is cached ----
  var BAG_NAV = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 8h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 8Z" stroke="#F2E9D8" stroke-width="1.8"></path><path d="M9 8a3 3 0 1 1 6 0" stroke="#F2E9D8" stroke-width="1.8"></path></svg>';
  function ensureMarkup() {
    if (!document.getElementById('cart')) {
      var wrap = document.createElement('div');
      wrap.innerHTML = '<div id="cart" class="cart" hidden><div class="cart__backdrop" data-cart-close></div><aside class="cart__panel" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabindex="-1"><header class="cart__head"><button type="button" class="cart__icon-btn cart__back" data-cart-back aria-label="Back" hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="cart__titles"><div class="cart__eyebrow" id="cart-eyebrow">Your basket</div><h2 class="cart__title" id="cart-title">Cart</h2></div><button type="button" class="cart__icon-btn" data-cart-close aria-label="Close cart"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button><ol class="cart__steps" aria-label="Checkout steps"><li data-step="cart">Cart</li><li data-step="details">Details</li><li data-step="review">Review</li></ol></header><div class="cart__body" id="cart-body"></div><footer class="cart__foot" id="cart-foot"></footer></aside></div>' +
        '<div id="cart-toast" class="cart-toast" role="status" aria-live="polite" hidden></div>';
      while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    }
    if (!document.getElementById('cart-btn')) {
      var nav = document.getElementById('site-nav');
      var path = nav && nav.querySelector('svg path[d^="M6 8h12"]');
      var svg = path && path.ownerSVGElement;
      var btn = document.createElement('button');
      btn.type = 'button'; btn.id = 'cart-btn'; btn.className = 'cart-btn';
      btn.setAttribute('aria-label', 'Open cart'); btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-controls', 'cart');
      btn.innerHTML = BAG_NAV + '<span class="cart-dot" id="cart-dot" hidden></span>';
      if (svg && svg.parentNode) svg.parentNode.replaceChild(btn, svg);
      else if (nav) { var right = nav.querySelector('a[href="#teas"].hover-brighten'); if (right && right.parentNode) right.parentNode.insertBefore(btn, right); }
    }
    Array.prototype.forEach.call(document.querySelectorAll('.product-card'), function (card) {
      if (card.querySelector('.card-actions')) return;
      var learn = card.querySelector('a[data-tea]');
      if (!learn) return;
      var slug = learn.getAttribute('data-tea'), c = COLOURS[slug];
      if (!c) return;
      var box = document.createElement('div');
      box.className = 'card-actions';
      box.style.cssText = '--tea:' + c[0] + ';--tea-on:' + c[1] + ';--tea-deep:' + c[2];
      learn.parentNode.insertBefore(box, learn);
      learn.removeAttribute('style'); learn.className = 'btn-learn';
      box.appendChild(learn);
      var slot = document.createElement('span');
      slot.className = 'add-slot'; slot.setAttribute('data-slot', slug);
      box.appendChild(slot);
    });
  }
  ensureMarkup();

  var root = document.getElementById('cart');
  if (!root) return;
  var panel = root.querySelector('.cart__panel');
  var bodyEl = document.getElementById('cart-body');
  var footEl = document.getElementById('cart-foot');
  var titleEl = document.getElementById('cart-title');
  var eyebrowEl = document.getElementById('cart-eyebrow');
  var backBtn = root.querySelector('[data-cart-back]');
  var dot = document.getElementById('cart-dot');
  var cartBtn = document.getElementById('cart-btn');
  var toastEl = document.getElementById('cart-toast');
  var step = 'cart', lastFocus = null, toastTimer;

  var BAG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 8h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 8Z" stroke="currentColor" stroke-width="2"/><path d="M9 8a3 3 0 1 1 6 0" stroke="currentColor" stroke-width="2"/></svg>';
  var MINUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

  // pouch thumbnails from the cards on the page
  var POUCH = {};
  Array.prototype.forEach.call(document.querySelectorAll('.product-card'), function (c) {
    var a = c.querySelector('[data-tea]');
    if (a) POUCH[a.getAttribute('data-tea')] = c.firstElementChild.outerHTML;
  });

  function esc(x) { return String(x).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function inr(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  var mem = {};
  function store() { try { var ls = window.localStorage; ls.getItem('x'); return ls; } catch (e) { return null; } }
  function load(k, d) { try { var ls = store(); var raw = ls ? ls.getItem(k) : mem[k]; var v = raw ? JSON.parse(raw) : null; return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  function save(k, v) { var raw = JSON.stringify(v); mem[k] = raw; try { var ls = store(); if (ls) ls.setItem(k, raw); } catch (e) {} }

  var cart = load(KEY, {});
  Object.keys(cart).forEach(function (k) { if (!PRICES[k] || !(cart[k] > 0)) delete cart[k]; else cart[k] = Math.min(MAX_QTY, Math.floor(cart[k])); });
  var details = load(DKEY, {});

  function count() { return Object.keys(cart).reduce(function (a, k) { return a + cart[k]; }, 0); }
  function subtotal() { return Object.keys(cart).reduce(function (a, k) { return a + cart[k] * PRICES[k]; }, 0); }
  function shipping() { var s = subtotal(); return s === 0 || s >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE; }
  function total() { return subtotal() + shipping(); }

  function setQty(slug, q) {
    q = Math.max(0, Math.min(MAX_QTY, q));
    if (q === 0) delete cart[slug]; else cart[slug] = q;
    save(KEY, cart);
    sync();
  }
  function add(slug, n) {
    var before = cart[slug] || 0;
    setQty(slug, before + (n || 1));
    if (before === 0) showToast(NAMES[slug] + ' added to your cart');
    bump();
  }

  // ---- add buttons / steppers on cards and in the tea pop-up ----
  function slotHTML(slug, modal) {
    var q = cart[slug] || 0;
    if (!q) {
      return '<button type="button" class="btn-add' + (modal ? ' tm-btn' : '') + '" data-add="' + slug + '">' + BAG +
        '<span>' + (modal ? 'Add to cart' : 'Add') + '</span><span class="add-price">· ' + inr(PRICES[slug]) + '</span></button>';
    }
    return '<div class="qty' + (modal ? ' qty--modal' : '') + '" role="group" aria-label="' + esc(NAMES[slug]) + ' quantity">' +
      '<button type="button" class="qty__btn" data-dec="' + slug + '" aria-label="Remove one">' + MINUS + '</button>' +
      '<button type="button" class="qty__val" data-open-cart aria-label="' + q + ' in cart, open cart"><b>' + q + '</b><span>in cart</span></button>' +
      '<button type="button" class="qty__btn" data-inc="' + slug + '" aria-label="Add one"' + (q >= MAX_QTY ? ' disabled' : '') + '>' + PLUS + '</button></div>';
  }
  function refreshSlots() {
    Array.prototype.forEach.call(document.querySelectorAll('.add-slot'), function (el) {
      var slug = el.getAttribute('data-slot');
      var modal = el.classList.contains('add-slot--modal');
      var html = slotHTML(slug, modal);
      if (el.__html !== html) { el.innerHTML = html; el.__html = html; }
    });
  }

  function sync() {
    var c = count();
    dot.hidden = c === 0;
    dot.textContent = c > 9 ? '9+' : c;
    cartBtn.setAttribute('aria-label', c ? 'Open cart, ' + c + ' item' + (c > 1 ? 's' : '') : 'Open cart');
    refreshSlots();
    if (!root.hidden) render();
  }
  function bump() { cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump'); }
  function showToast(msg) {
    toastEl.innerHTML = '<span>' + esc(msg) + '</span><button type="button" data-open-cart>View cart</button>';
    toastEl.hidden = false;
    requestAnimationFrame(function () { toastEl.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3200);
  }
  function hideToast() { toastEl.classList.remove('show'); setTimeout(function () { if (!toastEl.classList.contains('show')) toastEl.hidden = true; }, 300); }

  // ---- drawer ----
  function openCart(toStep) {
    if (!root.hidden) { if (toStep) go(toStep); return; }
    lastFocus = document.activeElement;
    hideToast();
    var tm = document.getElementById('tea-modal');
    if (tm && !tm.hidden) { var x = tm.querySelector('.tea-modal__close'); if (x) x.click(); }
    step = toStep || 'cart';
    render();
    root.hidden = false;
    document.body.classList.add('cart-open');
    requestAnimationFrame(function () { root.classList.add('is-open'); panel.focus(); });
  }
  function closeCart() {
    if (root.hidden) return;
    root.classList.remove('is-open');
    document.body.classList.remove('cart-open');
    setTimeout(function () { root.hidden = true; }, 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function go(s) { step = s; render(); bodyEl.scrollTop = 0; }

  function summaryRows() {
    var sub = subtotal(), sh = shipping();
    var away = FREE_SHIPPING_FROM - sub;
    var pct = Math.min(100, Math.round(sub / FREE_SHIPPING_FROM * 100));
    return '<div class="ship-meter">' +
        '<div class="ship-meter__txt">' + (away > 0 ? 'Add <b>' + inr(away) + '</b> more for free delivery' : '<b>Free delivery</b> unlocked') + '</div>' +
        '<div class="ship-meter__bar"><span style="width:' + pct + '%"></span></div></div>' +
      '<dl class="totals"><div><dt>Subtotal</dt><dd>' + inr(sub) + '</dd></div>' +
      '<div><dt>Delivery</dt><dd>' + (sh ? inr(sh) : 'Free') + '</dd></div>' +
      '<div class="totals__grand"><dt>Total</dt><dd>' + inr(total()) + '</dd></div></dl>';
  }

  function itemsHTML(compact) {
    return '<ul class="citems' + (compact ? ' citems--compact' : '') + '">' + Object.keys(cart).map(function (slug) {
      var c = COLOURS[slug], q = cart[slug];
      return '<li class="citem" style="--tea:' + c[0] + ';--tea-on:' + c[1] + ';--tea-deep:' + c[2] + '">' +
        '<div class="citem__thumb" aria-hidden="true"><div class="citem__pouch">' + (POUCH[slug] || '') + '</div></div>' +
        '<div class="citem__info"><div class="citem__name">' + esc(NAMES[slug]) + '</div>' +
          '<div class="citem__tag">' + esc(TAGS[slug]) + '</div>' +
          '<div class="citem__meta">50g pouch · ' + inr(PRICES[slug]) + '</div>' +
          (compact ? '<div class="citem__meta">Qty ' + q + '</div>' :
          '<div class="citem__row"><div class="qty qty--sm" role="group" aria-label="' + esc(NAMES[slug]) + ' quantity">' +
            '<button type="button" class="qty__btn" data-dec="' + slug + '" aria-label="Remove one">' + MINUS + '</button>' +
            '<span class="qty__val"><b>' + q + '</b></span>' +
            '<button type="button" class="qty__btn" data-inc="' + slug + '" aria-label="Add one"' + (q >= MAX_QTY ? ' disabled' : '') + '>' + PLUS + '</button></div>' +
            '<button type="button" class="citem__remove" data-remove="' + slug + '">Remove</button></div>') +
        '</div><div class="citem__price">' + inr(q * PRICES[slug]) + '</div></li>';
    }).join('') + '</ul>';
  }

  function field(id, label, attrs, type) {
    var v = details[id] || '';
    var input = type === 'select'
      ? '<select id="f-' + id + '" name="' + id + '" ' + attrs + '><option value="">Select state</option>' + STATES.map(function (st) { return '<option' + (st === v ? ' selected' : '') + '>' + st + '</option>'; }).join('') + '</select>'
      : '<input id="f-' + id + '" name="' + id + '" value="' + esc(v) + '" ' + attrs + '>';
    return '<div class="fld" data-fld="' + id + '"><label for="f-' + id + '">' + label + '</label>' + input + '<div class="fld__err" id="e-' + id + '" aria-live="polite"></div></div>';
  }

  function render() {
    root.setAttribute('data-step', step);
    Array.prototype.forEach.call(root.querySelectorAll('.cart__steps li'), function (li) {
      var order = ['cart', 'details', 'review'];
      var i = order.indexOf(li.getAttribute('data-step')), cur = order.indexOf(step);
      li.className = i < cur ? 'done' : i === cur ? 'on' : '';
    });
    var empty = count() === 0;
    backBtn.hidden = step === 'cart';
    if (empty && step !== 'cart') step = 'cart';

    if (step === 'cart') {
      eyebrowEl.textContent = 'Your basket';
      titleEl.textContent = empty ? 'Cart' : 'Cart (' + count() + ')';
      if (empty) {
        bodyEl.innerHTML = '<div class="cempty"><div class="cempty__art" aria-hidden="true"><svg viewBox="0 0 120 120" width="110" height="110" fill="none"><circle cx="60" cy="60" r="56" fill="#E4EBDD"/><path d="M36 46h48l-4.5 38a6 6 0 0 1-6 5.3H46.5a6 6 0 0 1-6-5.3L36 46Z" fill="#FBF7EF" stroke="#2E3D28" stroke-width="3"/><path d="M48 46a12 12 0 1 1 24 0" stroke="#2E3D28" stroke-width="3"/><path d="M52 66c3 3 13 3 16 0" stroke="#2E3D28" stroke-width="3" stroke-linecap="round"/><circle cx="52" cy="60" r="2.5" fill="#2E3D28"/><circle cx="68" cy="60" r="2.5" fill="#2E3D28"/></svg></div>' +
          '<div class="cempty__title">Your cart is empty</div><p>Six blends, six jobs. Pick the one your body’s asking for.</p>' +
          '<button type="button" class="cbtn cbtn--primary" data-browse>Browse the teas</button></div>';
        footEl.innerHTML = '';
        return;
      }
      bodyEl.innerHTML = itemsHTML(false) + '<div class="cnote">Every pouch is 50g, about 25 cups.</div>';
      footEl.innerHTML = summaryRows() + '<button type="button" class="cbtn cbtn--primary cbtn--block" data-goto="details">Checkout · ' + inr(total()) + '</button>' +
        '<div class="cfoot-note">Delivery details next. You’ll review everything before paying.</div>';
    }

    if (step === 'details') {
      eyebrowEl.textContent = 'Step 2 of 3';
      titleEl.textContent = 'Delivery details';
      bodyEl.innerHTML = '<form id="cform" class="cform" novalidate>' +
        '<fieldset><legend>Contact</legend>' +
          field('name', 'Full name', 'type="text" autocomplete="name" required') +
          '<div class="fld-row">' + field('phone', 'Mobile number', 'type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="10-digit mobile" maxlength="16" required') +
          field('email', 'Email', 'type="email" inputmode="email" autocomplete="email" placeholder="you@email.com" required') + '</div>' +
        '</fieldset><fieldset><legend>Delivery address</legend>' +
          field('line1', 'House / flat, street', 'type="text" autocomplete="address-line1" required') +
          field('line2', 'Area, landmark (optional)', 'type="text" autocomplete="address-line2"') +
          '<div class="fld-row fld-row--3">' + field('pin', 'PIN code', 'type="text" inputmode="numeric" autocomplete="postal-code" maxlength="6" placeholder="6 digits" required') +
          field('city', 'City', 'type="text" autocomplete="address-level2" required') +
          field('state', 'State', 'autocomplete="address-level1" required', 'select') + '</div>' +
        '</fieldset><label class="chk"><input type="checkbox" id="f-news"' + (details.news ? ' checked' : '') + '> Send me news about new blends (optional)</label></form>';
      footEl.innerHTML = '<dl class="totals totals--slim"><div class="totals__grand"><dt>Total</dt><dd>' + inr(total()) + '</dd></div></dl>' +
        '<button type="submit" form="cform" class="cbtn cbtn--primary cbtn--block">Review order</button>';
      wireForm();
    }

    if (step === 'review') {
      eyebrowEl.textContent = 'Step 3 of 3';
      titleEl.textContent = 'Review & pay';
      var d = details;
      bodyEl.innerHTML = '<div class="rv-block"><div class="rv-head"><span>Deliver to</span><button type="button" data-goto="details">Edit</button></div>' +
          '<div class="rv-addr"><b>' + esc(d.name) + '</b><br>' + esc(d.line1) + (d.line2 ? ', ' + esc(d.line2) : '') + '<br>' + esc(d.city) + ', ' + esc(d.state) + ' ' + esc(d.pin) +
          '<br><span>+91 ' + esc(d.phone) + ' · ' + esc(d.email) + '</span></div></div>' +
        '<div class="rv-block"><div class="rv-head"><span>Your teas</span><button type="button" data-goto="cart">Edit</button></div>' + itemsHTML(true) + '</div>' +
        '<div class="rv-block">' + summaryRows() + '</div>';
      if (PAYMENTS_LIVE) {
        footEl.innerHTML = '<button type="button" class="cbtn cbtn--primary cbtn--block" data-pay>Pay ' + inr(total()) + ' securely</button>' +
          '<div class="cfoot-note">UPI, cards and net banking via Razorpay.</div>';
      } else {
        footEl.innerHTML = '<div class="soon"><b>Online payment is launching soon.</b> Send your order to us on WhatsApp and we’ll confirm it and share payment details.</div>' +
          '<button type="button" class="cbtn cbtn--wa cbtn--block" data-wa-order><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.16-1.5A9.95 9.95 0 1 0 12.04 2Zm0 18.13a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.06.89.9-2.98-.2-.31a8.18 8.18 0 1 1 6.84 3.73Z"/></svg>Place order on WhatsApp · ' + inr(total()) + '</button>';
      }
    }
  }

  // ---- checkout form validation ----
  var RULES = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your full name.'; },
    phone: function (v) { var d = v.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, ''); return /^[6-9]\d{9}$/.test(d) ? '' : 'Enter a valid 10-digit Indian mobile number.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.'; },
    line1: function (v) { return v.trim().length >= 5 ? '' : 'Please add your house number and street.'; },
    line2: function () { return ''; },
    pin: function (v) { return /^[1-9]\d{5}$/.test(v.trim()) ? '' : 'PIN code must be 6 digits.'; },
    city: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your city.'; },
    state: function (v) { return v ? '' : 'Please choose your state.'; }
  };
  function check(id, show) {
    var el = document.getElementById('f-' + id);
    var msg = RULES[id](el.value);
    if (show) {
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      el.setAttribute('aria-describedby', 'e-' + id);
      document.getElementById('e-' + id).textContent = msg;
      el.closest('.fld').classList.toggle('fld--bad', !!msg);
      el.closest('.fld').classList.toggle('fld--ok', !msg && el.value.trim() !== '');
    }
    return !msg;
  }
  function wireForm() {
    var form = document.getElementById('cform');
    Object.keys(RULES).forEach(function (id) {
      var el = document.getElementById('f-' + id);
      el.addEventListener('blur', function () { if (el.value) check(id, true); });
      el.addEventListener('input', function () {
        if (id === 'pin') el.value = el.value.replace(/\D/g, '').slice(0, 6);
        details[id] = el.value; save(DKEY, details);
        if (el.closest('.fld').classList.contains('fld--bad')) check(id, true);
      });
    });
    document.getElementById('f-news').addEventListener('change', function (e) { details.news = e.target.checked; save(DKEY, details); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(RULES).forEach(function (id) { if (!check(id, true) && !firstBad) firstBad = document.getElementById('f-' + id); });
      if (firstBad) { firstBad.focus(); return; }
      details.phone = details.phone.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
      ['name', 'email', 'line1', 'line2', 'city', 'pin'].forEach(function (k) { details[k] = (details[k] || '').trim(); });
      save(DKEY, details);
      go('review');
    });
  }

  // ---- order hand-off (Razorpay plugs in here later) ----
  function buildOrder() {
    return {
      ref: 'OR-' + Date.now().toString(36).toUpperCase(),
      items: Object.keys(cart).map(function (k) { return { id: k, name: NAMES[k], qty: cart[k], price: PRICES[k] }; }),
      subtotal: subtotal(), shipping: shipping(), total: total(),
      customer: { name: details.name, phone: details.phone, email: details.email, news: !!details.news },
      address: { line1: details.line1, line2: details.line2 || '', city: details.city, state: details.state, pin: details.pin }
    };
  }
  function whatsappOrder() {
    var o = buildOrder();
    var lines = ['Hi openroots, I’d like to place an order (' + o.ref + '):', ''];
    o.items.forEach(function (i) { lines.push('• ' + i.name + ' x ' + i.qty + ' = ' + inr(i.qty * i.price)); });
    lines.push('', 'Subtotal: ' + inr(o.subtotal), 'Delivery: ' + (o.shipping ? inr(o.shipping) : 'Free'), 'Total: ' + inr(o.total), '',
      'Deliver to:', o.customer.name, o.address.line1 + (o.address.line2 ? ', ' + o.address.line2 : ''), o.address.city + ', ' + o.address.state + ' ' + o.address.pin,
      'Phone: +91 ' + o.customer.phone, 'Email: ' + o.customer.email);
    window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
  }
  window.openroots = window.openroots || {};
  window.openroots.cart = { get: function () { return JSON.parse(JSON.stringify(cart)); }, order: buildOrder, open: openCart, slotHTML: slotHTML, prices: PRICES, clear: function () { cart = {}; save(KEY, cart); sync(); } };

  // ---- events ----
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-add],[data-inc],[data-dec],[data-remove],[data-open-cart],[data-cart-close],[data-cart-back],[data-goto],[data-browse],[data-wa-order],[data-pay]');
    if (!t) return;
    if (t.hasAttribute('data-add')) { e.preventDefault(); add(t.getAttribute('data-add'), 1); return; }
    if (t.hasAttribute('data-inc')) { var a = t.getAttribute('data-inc'); setQty(a, (cart[a] || 0) + 1); return; }
    if (t.hasAttribute('data-dec')) { var b = t.getAttribute('data-dec'); setQty(b, (cart[b] || 0) - 1); return; }
    if (t.hasAttribute('data-remove')) { setQty(t.getAttribute('data-remove'), 0); return; }
    if (t.hasAttribute('data-open-cart')) { openCart(); return; }
    if (t.hasAttribute('data-cart-close')) { closeCart(); return; }
    if (t.hasAttribute('data-cart-back')) { go(step === 'review' ? 'details' : 'cart'); return; }
    if (t.hasAttribute('data-goto')) { go(t.getAttribute('data-goto')); return; }
    if (t.hasAttribute('data-browse')) { closeCart(); var teas = document.getElementById('teas'); if (teas) teas.scrollIntoView({ behavior: 'smooth' }); return; }
    if (t.hasAttribute('data-wa-order')) { whatsappOrder(); return; }
    if (t.hasAttribute('data-pay')) { document.dispatchEvent(new CustomEvent('openroots:pay', { detail: buildOrder() })); return; }
  });
  cartBtn.addEventListener('click', function () { openCart(); });
  document.addEventListener('keydown', function (e) {
    if (root.hidden) return;
    if (e.key === 'Escape') { closeCart(); return; }
    if (e.key === 'Tab') {
      var f = panel.querySelectorAll('button:not([disabled]):not([hidden]),input,select,a[href],[tabindex]:not([tabindex="-1"])');
      f = Array.prototype.filter.call(f, function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('or:slots', refreshSlots);
  window.addEventListener('storage', function (e) { if (e.key === KEY) { cart = load(KEY, {}); sync(); } });
  sync();
} catch (err) { if (window.console) console.error('openroots module failed', err); } })();
