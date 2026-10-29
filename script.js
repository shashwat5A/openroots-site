// openroots nav scroll state + newsletter signup
(function () { try {
  var nav = document.getElementById('site-nav');

  function updateNav() {
    var scrolled = window.scrollY > 20;
    nav.style.background = scrolled ? 'rgba(46,61,40,.97)' : '#2E3D28';
    nav.style.boxShadow = scrolled ? '0 10px 30px -18px rgba(0,0,0,.6)' : 'none';
    nav.style.borderBottomColor = scrolled ? 'rgba(242,233,216,.12)' : 'rgba(242,233,216,0)';
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  var form = document.getElementById('newsletter-form');
  var success = document.getElementById('newsletter-success');
  var emailInput = document.getElementById('newsletter-email');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (emailInput.value.includes('@')) {
      form.style.display = 'none';
      success.style.display = 'block';
    }
  });
} catch (err) { if (window.console) console.error('openroots module failed', err); } })();

// openroots: tea detail popup
(function () { try {
  var WA = 'https://wa.me/917889543491';
  var TEAS = {
    'anti-stress': {
      no: '01', name: 'Anti-Stress', tag: 'Breathe in. Breathe out.',
      c: { bg: '#6B4FA8', on: '#F5EFFF', tint: '#E8DCFF', ink: '#3E2A6B', deep: '#6B4FA8' },
      desc: 'Chamomile flowers, St. John’s Wort and lavender steep into a quiet blend made to soften the loud days, one slow sip at a time.',
      inside: ['Chamomile', 'St. John’s Wort', 'Lavender'],
      sip: 'Whenever the day gets loud',
      problem: 'A mind on full volume and a day that won’t switch off.',
      why: 'Stress stays in your body long after the meeting ends. Anti-Stress is a slow, floral cup that gives you a reason to stop for five minutes and just breathe.',
      how: [['Chamomile', 'Traditionally sipped to calm the nerves and ease tension.'], ['St. John’s Wort', 'Used for centuries to lift a low, heavy mood.'], ['Lavender', 'Its soft aroma helps a busy mind slow down.']],
      taste: 'Floral, honeyed, gently sweet.'
    },
    'deep-sleep': {
      no: '02', name: 'Deep Sleep', tag: 'See you in the morning.',
      c: { bg: '#1F2A63', on: '#E8ECFF', tint: '#DDE3FF', ink: '#0E1436', deep: '#1F2A63' },
      desc: 'Lavender, ashwagandha root and valerian root steep into a soft blend made to walk you gently into sleep.',
      inside: ['Lavender', 'Ashwagandha root', 'Valerian root'],
      sip: '30 minutes before bed',
      problem: 'Lying awake at 2 AM, replaying the whole day.',
      why: 'Good sleep starts before you get into bed. Deep Sleep is a caffeine-free bedtime ritual that tells your body the day is done.',
      how: [['Lavender', 'Relaxes the senses and quiets a racing mind.'], ['Ashwagandha root', 'An Ayurvedic adaptogen that helps the body handle stress.'], ['Valerian root', 'A traditional herb for easing into restful sleep.']],
      taste: 'Earthy, soft and floral.'
    },
    'happy-gut': {
      no: '03', name: 'Happy Gut', tag: 'Your gut, your happy place!',
      c: { bg: '#7C3A18', on: '#F6E7D4', tint: '#F3DFC6', ink: '#4A1F0B', deep: '#7C3A18' },
      desc: 'Peppermint, ginger, fennel and bay leaves steep into a warming blend made to keep your gut happy, one soothing sip at a time.',
      inside: ['Peppermint', 'Ginger', 'Fennel', 'Bay leaves'],
      sip: 'Right after a big meal',
      problem: 'Bloating, heaviness and that too-full feeling after meals.',
      why: 'Your gut works hard after every meal. Happy Gut uses kitchen-cupboard herbs that have helped digestion for generations.',
      how: [['Peppermint', 'Soothes the stomach and eases bloating.'], ['Ginger', 'Warms up digestion and settles queasiness.'], ['Fennel', 'The classic after-meal seed for gas and heaviness.'], ['Bay leaves', 'Traditionally used to keep digestion smooth.']],
      taste: 'Cool mint with a warm, spicy finish.'
    },
    'heart-care': {
      no: '04', name: 'Heart Care', tag: 'Everything will be OK!',
      c: { bg: '#A3122C', on: '#FDECE7', tint: '#FFDCD3', ink: '#5C0716', deep: '#A3122C' },
      desc: 'Arjun bark, hibiscus flower and sea buckthorn steep into a gentle blend made to keep your heart happy, one warm sip at a time.',
      inside: ['Arjun bark', 'Hibiscus flower', 'Sea buckthorn'],
      sip: 'With your evening wind-down',
      problem: 'Long hours, salty food, little rest. Your heart carries it all.',
      why: 'Caring for your heart is a daily habit, not a one-time fix. Heart Care turns that habit into a tart, ruby-red cup you’ll look forward to.',
      how: [['Arjun bark', 'Revered in Ayurveda as a tonic for the heart.'], ['Hibiscus flower', 'Rich in antioxidants, loved for its tangy taste.'], ['Sea buckthorn', 'A bright berry packed with vitamin C and omegas.']],
      taste: 'Tart, fruity and gently tangy.'
    },
    'skin-glow': {
      no: '05', name: 'Skin Glow', tag: 'Glow from the inside.',
      c: { bg: '#C9513A', on: '#FFF4EE', tint: '#FFE0D2', ink: '#8C3A25', deep: '#B4432D' },
      desc: 'Rose petals, sea buckthorn, manjistha and rakt chandan steep into a dewy blend made to keep your skin calm and clear.',
      inside: ['Rose petals', 'Sea buckthorn', 'Manjistha', 'Rakt chandan'],
      sip: 'Your afternoon cup',
      problem: 'Dull, tired skin that no cream seems to fix.',
      why: 'What shows on your skin often starts on the inside. Skin Glow blends Ayurvedic beauty herbs into a cup that works from within.',
      how: [['Rose petals', 'Cooling, calming and rich in antioxidants.'], ['Sea buckthorn', 'Vitamin C and omegas for a natural glow.'], ['Manjistha', 'Ayurveda’s classic herb for clear, even skin.'], ['Rakt chandan', 'Red sandalwood, traditionally used to cool and calm the skin.']],
      taste: 'Rosy, light and slightly woody.'
    },
    'stay-immune': {
      no: '06', name: 'Stay Immune', tag: 'Stay well, sniffles and all.',
      c: { bg: '#EFB01A', on: '#4A3105', tint: '#FFF0C2', ink: '#4A3105', deep: '#9A6F06' },
      desc: 'Tulsi, ashwagandha root and giloy steep into a golden blend made to keep your defences wide awake.',
      inside: ['Tulsi', 'Ashwagandha root', 'Giloy'],
      sip: 'First thing in the morning',
      problem: 'Every change of season, another cold.',
      why: 'Strong defences are built every day, not just when you feel unwell. Stay Immune is a golden daily cup of time-tested Ayurvedic herbs.',
      how: [['Tulsi', 'Holy basil, India’s go-to herb for seasonal wellness.'], ['Ashwagandha root', 'Helps the body stay strong and resilient.'], ['Giloy', 'Called “amrita” in Ayurveda, used to support natural immunity.']],
      taste: 'Warm, peppery and herbal.'
    }
  };

  var modal = document.getElementById('tea-modal');
  var dialog = modal.querySelector('.tea-modal__dialog');
  var body = document.getElementById('tea-modal-body');
  var lastFocus = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }

  function render(t, pouchHTML) {
    var waText = encodeURIComponent('Hi openroots, I’d like to order ' + t.name + '.');
    return '' +
      '<div class="tm-hero">' +
        '<div>' +
          '<div class="tm-no">No. ' + t.no + ' / 06 · HERBAL INFUSION</div>' +
          '<div class="tm-name" id="tea-modal-title">' + esc(t.name) + '</div>' +
          '<div class="tm-tag">' + esc(t.tag) + '</div>' +
          '<div class="tm-desc">' + esc(t.desc) + '</div>' +
        '</div>' +
        '<div class="tm-pouch" aria-hidden="true">' + pouchHTML + '</div>' +
      '</div>' +
      '<div class="tm-content">' +
        '<div><div class="tm-label">What’s inside</div><div class="tm-chips">' +
          t.inside.map(function (i) { return '<span class="tm-chip">' + esc(i) + '</span>'; }).join('') +
        '</div></div>' +
        '<div class="tm-stats">' +
          '<div class="tm-stat"><b>95°C</b><span>WATER</span></div>' +
          '<div class="tm-stat"><b>3–5 min</b><span>STEEP</span></div>' +
          '<div class="tm-stat"><b>25 cups</b><span>PER POUCH</span></div>' +
        '</div>' +
        '<div class="tm-sip"><strong>SIP IT</strong><span>' + esc(t.sip) + '</span></div>' +
        '<div class="tm-quote"><div class="tm-label" style="margin-bottom:8px">The problem</div><q>' + esc(t.problem) + '</q><div>So we made this.</div></div>' +
        '<div><div class="tm-h">Why ' + esc(t.name) + '</div><div class="tm-p">' + esc(t.why) + '</div></div>' +
        '<div><div class="tm-label">How it helps</div><div class="tm-steps">' +
          t.how.map(function (h, i) { return '<div class="tm-step"><i>' + (i + 1) + '</i><div><b>' + esc(h[0]) + '</b><span>' + esc(h[1]) + '</span></div></div>'; }).join('') +
        '</div></div>' +
        '<div class="tm-taste"><div class="tm-label" style="margin:0">Tastes like</div><div>' + esc(t.taste) + '</div></div>' +
        '<div class="tm-cta">' +
          '<span class="add-slot add-slot--modal" data-slot="' + t.slug + '">' + (window.openroots && window.openroots.cart ? window.openroots.cart.slotHTML(t.slug, true) : '') + '</span>' +
          '<a class="tm-btn tm-btn--ghost" href="#teas" data-close>See all six</a>' +
        '</div>' +
        '<a class="tm-wa" href="' + WA + '?text=' + waText + '" target="_blank" rel="noopener">Questions about ' + esc(t.name) + '? Chat with us on WhatsApp</a>' +
        '<div class="tm-note">Herbal infusions are not intended to diagnose, treat, cure or prevent any disease. Pregnant or on medication? Check with your doctor first.</div>' +
      '</div>';
  }

  function open(slug, trigger) {
    var t = TEAS[slug];
    if (!t) return;
    t.slug = slug;
    var card = trigger.closest('.product-card');
    var pouch = card ? card.firstElementChild.outerHTML : '';
    Object.keys(t.c).forEach(function (k) { dialog.style.setProperty('--tea-' + k, t.c[k]); });
    body.innerHTML = render(t, pouch);
    document.dispatchEvent(new Event('or:slots'));
    lastFocus = trigger;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    dialog.scrollTop = 0;
    requestAnimationFrame(function () { modal.classList.add('is-open'); dialog.focus(); });
  }

  function close() {
    if (modal.hidden) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    setTimeout(function () { modal.hidden = true; body.innerHTML = ''; }, 220);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-tea]');
    if (trigger) { e.preventDefault(); open(trigger.getAttribute('data-tea'), trigger); return; }
    var closer = e.target.closest('[data-close]');
    if (closer && modal.contains(closer)) {
      if (closer.getAttribute('href') !== '#teas') e.preventDefault();
      close();
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
} catch (err) { if (window.console) console.error('openroots module failed', err); } })();

// openroots: tea carousel (smaller screens) + story read more
(function () { try {
  var grid = document.getElementById('tea-grid');
  var dotsWrap = document.getElementById('tea-dots');
  var ctrl = document.getElementById('tea-controls');
  if (grid && dotsWrap && ctrl) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));
    var prev = ctrl.querySelector('[data-dir="-1"]');
    var next = ctrl.querySelector('[data-dir="1"]');
    var colours = cards.map(function (c) { var a = c.querySelector('.card-actions'); return a ? a.style.getPropertyValue('--tea') : ''; });
    var dots = cards.map(function (c, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Show tea ' + (i + 1));
      d.addEventListener('click', function () { go(i); });
      dotsWrap.appendChild(d);
      return d;
    });
    function current() {
      var gl = grid.getBoundingClientRect().left + parseFloat(getComputedStyle(grid).paddingLeft);
      var best = 0, bestD = Infinity;
      cards.forEach(function (c, i) { var d = Math.abs(c.getBoundingClientRect().left - gl); if (d < bestD) { bestD = d; best = i; } });
      if (grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4) best = cards.length - 1;
      return best;
    }
    var target = null;
    function base() { return target !== null ? target : current(); }
    function go(i) {
      i = Math.max(0, Math.min(cards.length - 1, i));
      target = i;
      var gl = grid.getBoundingClientRect().left + parseFloat(getComputedStyle(grid).paddingLeft);
      grid.scrollBy({ left: cards[i].getBoundingClientRect().left - gl, behavior: 'smooth' });
    }
    function update() {
      target = null;
      var i = current();
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
      dotsWrap.style.setProperty('--dot', colours[i] || '#2E3D28');
      prev.disabled = grid.scrollLeft <= 4;
      next.disabled = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
    }
    prev.addEventListener('click', function () { go(base() - 1); });
    next.addEventListener('click', function () { go(base() + 1); });
    var t;
    grid.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  var story = document.getElementById('story');
  var toggle = story && story.querySelector('.story-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = story.classList.toggle('is-expanded');
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? 'Show less' : 'Read more';
    });
  }
} catch (err) { if (window.console) console.error('openroots module failed', err); } })();

// openroots: our story chapters
(function () { try {
  var track = document.getElementById('story-track');
  var dotsWrap = document.getElementById('story-dots');
  if (!track || !dotsWrap) return;
  var slides = Array.prototype.slice.call(track.querySelectorAll('.st-slide'));
  var prev = document.querySelector('[data-st="-1"]');
  var next = document.querySelector('[data-st="1"]');
  var label = next.querySelector('.st-next-label');
  var dots = slides.map(function (s, i) {
    var d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label', 'Chapter ' + (i + 1));
    d.addEventListener('click', function () { go(i); });
    dotsWrap.appendChild(d);
    return d;
  });
  function idx() { return Math.round(track.scrollLeft / track.clientWidth); }
  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    fit(i);
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  }
  function fit(i) { track.style.height = slides[i].offsetHeight + 'px'; }
  function update() {
    var i = idx();
    fit(i);
    dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
    prev.disabled = i === 0;
    var last = i === slides.length - 1;
    if (label) label.textContent = last ? 'Read again' : 'Next chapter';
    next.setAttribute('aria-label', last ? 'Back to the first chapter' : 'Next chapter');
  }
  prev.addEventListener('click', function () { go(idx() - 1); });
  next.addEventListener('click', function () { var i = idx(); go(i === slides.length - 1 ? 0 : i + 1); });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx() - 1); }
  });
  var t;
  track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
  window.addEventListener('resize', function () { track.scrollLeft = idx() * track.clientWidth; update(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  update();
} catch (err) { if (window.console) console.error('openroots module failed', err); } })();

// openroots: foldable phones (hint when folded, book view when unfolded)
(function () { try {
  var html = document.documentElement;
  var hint = document.getElementById('fold-hint');
  var toast = document.getElementById('fold-toast');
  var nav = document.getElementById('site-nav');
  var preview = null;
  try { preview = new URLSearchParams(location.search).get('fold'); } catch (e) {}
  var foldable = preview === 'open' || preview === 'closed' ||
    /SM-F9\d\d|Pixel Fold|Pixel 9 Pro Fold|Pixel 10 Pro Fold|CPH2551|CPH2671/i.test(navigator.userAgent);
  var dismissed = false;
  try { dismissed = localStorage.getItem('or-fold-hint') === '1'; } catch (e) {}
  var isOpen = false, toastTimer;

  function spanning() {
    try { if (window.viewport && window.viewport.segments && window.viewport.segments.length > 1) return true; } catch (e) {}
    return window.matchMedia && matchMedia('(horizontal-viewport-segments: 2)').matches;
  }
  function wantsBook() {
    if (preview === 'open') return true;
    if (preview === 'closed') return false;
    if (spanning()) return true;
    return foldable && window.innerWidth >= 600 && window.innerWidth <= 1100;
  }
  function setNavH() { if (nav) html.style.setProperty('--navh', nav.offsetHeight + 'px'); }

  function apply() {
    setNavH();
    var open = wantsBook();
    if (open !== isOpen) {
      isOpen = open;
      html.classList.toggle('fold-open', open);
      if (open) {
        hideHint();
        toast.hidden = false;
        requestAnimationFrame(function () { toast.classList.add('show'); });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); setTimeout(function () { toast.hidden = true; }, 300); }, 3800);
      }
      window.dispatchEvent(new Event('resize'));
    }
    var showHint = !open && foldable && !dismissed && (preview === 'closed' || window.innerWidth < 600);
    if (showHint) {
      if (hint.hidden) { hint.hidden = false; setTimeout(function () { hint.classList.add('show'); }, 1200); }
    } else { hideHint(); }
  }
  function hideHint() {
    if (hint.hidden) return;
    hint.classList.remove('show');
    setTimeout(function () { if (!hint.classList.contains('show')) hint.hidden = true; }, 450);
  }
  hint.querySelector('.fh-close').addEventListener('click', function () {
    dismissed = true;
    try { localStorage.setItem('or-fold-hint', '1'); } catch (e) {}
    hideHint();
  });

  var rt;
  window.addEventListener('resize', function (e) { if (!e.isTrusted) return; clearTimeout(rt); rt = setTimeout(apply, 120); });
  if (window.matchMedia) {
    var mq = matchMedia('(horizontal-viewport-segments: 2)');
    if (mq.addEventListener) mq.addEventListener('change', apply);
  }
  if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    navigator.userAgentData.getHighEntropyValues(['model']).then(function (v) {
      if (/^SM-F9|Fold|CPH2551|CPH2671/i.test(v.model || '')) { foldable = true; apply(); }
    }).catch(function () {});
  }
  apply();
} catch (err) { if (window.console) console.error('openroots module failed', err); } })();

// openroots: make sure the cart script is loaded (covers an older cached index.html)
(function () { try {
  if (document.querySelector('script[src*="cart.js"]')) return;
  var s = document.createElement('script');
  s.src = 'cart.js?v=17';
  document.body.appendChild(s);
} catch (err) {} })();
