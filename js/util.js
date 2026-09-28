// Small shared helpers. Everything hangs off one global, SG, so the app
// works when index.html is opened straight from disk (no modules, no build).
window.SG = window.SG || {};

(function (SG) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // el('button', { class: 'btn', text: 'Play', onclick: fn }, [children])
  SG.el = function (tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      const value = attrs[key];
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  };

  SG.svg = function (tag, attrs, children) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  };

  // Icons are drawn, not typed: font glyphs like "✓" or "←" come out thin and
  // different on every tablet. These take the colour of the text around them.
  const ICONS = {
    home: ['M3 11.5L12 4l9 7.5', 'M5.5 9.8V20h13V9.8'],
    chevron: ['M9 4.5l7.5 7.5L9 19.5'],
    settings: ['M4 7h9', 'M17 7h3', 'M15 4.5v5', 'M4 17h3', 'M11 17h9', 'M9 14.5v5'],
    levels: ['M5 19.5v-4', 'M12 19.5v-8.5', 'M19 19.5V4.5'],
    picture: ['M3.5 5h17v14h-17z', 'M3.5 16l5-5 4 4 3-3 4.5 4.5'],
    play: ['M8 5.2v13.6L18.8 12z'],
    again: ['M19.2 12a7.2 7.2 0 1 1-2.1-5.1', 'M19.2 4.2v4.4h-4.4'],
    fresh: ['M12 5v14', 'M5 12h14'],
    eye: ['M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12s-3.6 6.5-9.5 6.5S2.5 12 2.5 12z', 'M12 9.3a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 1 1 0-5.4z'],
    bulb: ['M9.5 18h5', 'M10.5 21h3', 'M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z'],
    undo: ['M9 13.5L4.5 9 9 4.5', 'M4.5 9h10a5.5 5.5 0 0 1 0 11H11'],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    back: ['M10 5.5L3.5 12l6.5 6.5', 'M4 12h16.5'],
    sound: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M15.5 9a4 4 0 0 1 0 6', 'M18.2 6.3a8 8 0 0 1 0 11.4'],
    camera: ['M3.5 8h3.5l2-2.5h6L17 8h3.5v11h-17z', 'M12 10a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 1 1 0-6.8z'],
    help: ['M12 3a9 9 0 1 1 0 18 9 9 0 1 1 0-18z', 'M9.4 9.6a2.7 2.7 0 1 1 3.9 2.4c-.8.4-1.3 1-1.3 1.9v.5', 'M12 17.3v.2']
  };

  SG.icon = function (name) {
    return SG.svg('svg', {
      class: 'icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': 2.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'
    }, ICONS[name].map(function (d) { return SG.svg('path', { d: d }); }));
  };

  // A button with a picture as well as a word, for anyone who reads the picture more easily.
  SG.iconButton = function (className, icon, text) {
    return SG.el('button', { class: className, type: 'button' }, [SG.icon(icon), SG.el('span', { class: 'btn-text', text: text })]);
  };

  // A friendly drawn hand, fingertip at (0, 0), pointing up. Used to act out a game's move on its
  // first-time page, and to point at the right basket.
  const SKIN = '#F7CFA8', INK = '#1F2A44';
  SG.handShape = function () {
    const svg = SG.svg;
    return svg('g', { class: 'hand-shape' }, [
      svg('rect', { x: -4.5, y: 11, width: 20, height: 17, rx: 6.5, fill: SKIN, stroke: INK, 'stroke-width': 1.7 }),
      svg('path', { d: 'M8 12.2v4.6M12.2 12.8v4', stroke: INK, 'stroke-width': 1.4, 'stroke-linecap': 'round' }),
      svg('ellipse', { cx: -4.2, cy: 19.5, rx: 3.3, ry: 5.4, transform: 'rotate(25 -4.2 19.5)', fill: SKIN, stroke: INK, 'stroke-width': 1.7 }),
      svg('rect', { x: -3.4, y: 0, width: 6.8, height: 18, rx: 3.4, fill: SKIN, stroke: INK, 'stroke-width': 1.7 }),
      svg('rect', { x: -3.5, y: 27, width: 18, height: 6.5, rx: 2, class: 'fill-deep', stroke: INK, 'stroke-width': 1.5 })
    ]);
  };

  // The hand acting out a move inside a game's illustration, with its fingertip at (x, y).
  //   kind 'tap':   comes in, presses, lifts.
  //   kind 'slide': presses at (x, y) and slides by (dx, dy), carrying `carried` (drawn around 0, 0).
  // It only moves on the first-time page and in How to play (the `demo` class on the picture), and
  // rests where the move ends; with "reduce motion" it simply rests there from the start.
  SG.demoHand = function (x, y, kind, dx, dy, carried) {
    const svg = SG.svg;
    const mover = svg('g', { class: 'demo-hand demo-' + kind }, (carried || []).concat([SG.handShape()]));
    mover.style.setProperty('--dx', (dx || 0) + 'px');
    mover.style.setProperty('--dy', (dy || 0) + 'px');
    return svg('g', { class: 'demo', transform: 'translate(' + x + ' ' + y + ') scale(0.95)' }, [mover]);
  };

  // The gold outline colours keep these visible on white (plain gold on white is only 1.85:1).
  SG.star = function () {
    return SG.svg('svg', { class: 'star', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
      SG.svg('path', {
        d: 'M12 2.6l2.9 6.1 6.7.9-4.9 4.6 1.2 6.7L12 17.7l-5.9 3.2 1.2-6.7-4.9-4.6 6.7-.9z',
        fill: '#F5B301', stroke: '#7A4F00', 'stroke-width': 0.9, 'stroke-linejoin': 'round'
      })
    ]);
  };

  SG.sun = function () {
    const rays = 'M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.8 4.8l2.1 2.1M17.1 17.1l2.1 2.1M4.8 19.2l2.1-2.1M17.1 6.9l2.1-2.1';
    return SG.svg('svg', { class: 'sun', viewBox: '0 0 24 24', fill: 'none', 'stroke-linecap': 'round', 'aria-hidden': 'true' }, [
      SG.svg('path', { d: rays, stroke: '#7A4F00', 'stroke-width': 3 }),
      SG.svg('path', { d: rays, stroke: '#F5B301', 'stroke-width': 1.5 }),
      SG.svg('circle', { cx: 12, cy: 12, r: 5, fill: '#F5B301', stroke: '#7A4F00', 'stroke-width': 0.9 })
    ]);
  };

  // Can this tablet draw this (newer) emoji? An unsupported emoji comes out as an empty box or
  // nothing at all - neither has any coloured pixels. Only use this for pictures that ARE colourful.
  SG.canDraw = function (emoji) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 32;
      const g = canvas.getContext('2d');
      g.textBaseline = 'top';
      g.font = '24px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      g.fillText(emoji, 0, 4);
      const px = g.getImageData(0, 0, 32, 32).data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] > 0 && (Math.abs(px[i] - px[i + 1]) > 24 || Math.abs(px[i + 1] - px[i + 2]) > 24)) return true;
      }
      return false;
    } catch (e) {
      return true; // cannot tell - assume it is fine
    }
  };

  // "Reduce motion" is switched on in the tablet's settings: no movement that is only decoration.
  SG.reducedMotion = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  // A link that a slow, heavy press cannot start dragging (or open a link preview for).
  SG.link = function (attrs, children) {
    attrs.draggable = 'false';
    return SG.el('a', attrs, children);
  };

  SG.rand = function (n) {
    return Math.floor(Math.random() * n);
  };

  SG.shuffle = function (list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = SG.rand(i + 1);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  SG.clamp = function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  };

  // Every game file registers itself here; the home page lists them in the order the
  // <script> tags load. A game is:
  //   { key, text, illustration(), mount(stage, levelKey),
  //     levels: { key: {...} }, detail(levelKey), preview(levelKey),
  //     levelName?(levelKey), chooser? }
  // `text` is the prefix of its entries in i18n.js (ws.title, ws.howto ...).
  // `chooser`: opening the game shows its levels first (Colouring Book: the pictures are the levels).
  SG.games = [];
  SG.registerGame = function (game) {
    game.chooser = !!game.chooser;
    SG.games.push(game);
  };

  // A little block of squares, for level pictures.
  SG.squares = function (count, className) {
    const parts = [];
    for (let i = 0; i < count; i++) parts.push(SG.el('span'));
    return SG.el('div', { class: 'level-art ' + className, 'aria-hidden': 'true' }, parts);
  };

  // Timeouts that all die together when a game is left or restarted.
  SG.timers = function () {
    let ids = [];
    return {
      later: function (fn, ms) {
        const id = setTimeout(fn, ms);
        ids.push(id);
        return id;
      },
      clear: function () {
        ids.forEach(clearTimeout);
        ids = [];
      }
    };
  };

  // The rows/columns split that gives the biggest squares for `count` things in a space of w x h.
  // `exact`: only splits with no gap in the last row (and at least two rows).
  SG.bestGrid = function (count, w, h, gap, exact) {
    let best = null;
    const maxCols = exact ? Math.max(2, Math.floor(count / 2)) : count;
    for (let cols = 2; cols <= maxCols; cols++) {
      if (exact && count % cols) continue;
      const rows = Math.ceil(count / cols);
      const cell = Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows);
      const score = cell + (!exact && count % cols === 0 ? 0.5 : 0); // prefer a full last row when it costs nothing
      if (!best || score > best.score) best = { cols: cols, rows: rows, cell: cell, score: score };
    }
    return best;
  };

  // ---------- Everything fits on one screen ----------
  // The app is a frame exactly the size of the screen; nothing ever needs scrolling.

  // Where the page must end: the bottom of the app's frame (above the tablet's own bars).
  SG.bottom = function () {
    const view = document.getElementById('view');
    return view ? view.getBoundingClientRect().bottom : window.innerHeight;
  };

  // Does anything reach past the edge of the screen?
  SG.overflows = function () {
    const d = document.documentElement;
    return Math.max(d.scrollHeight, document.body.scrollHeight) > window.innerHeight + 1 || d.scrollWidth > window.innerWidth + 1;
  };

  // "Never shrink, reduce instead", for whole pages: `root` has data-fit="n", and style.css says
  // what goes at each step .fit-1 ... .fit-n (tighter spacing first, then extras such as a
  // heading or a third line of help). Steps are added only while the page is too big.
  SG.fitSteps = function (root) {
    const steps = +root.getAttribute('data-fit') || 0;
    for (let i = 1; i <= steps; i++) root.classList.remove('fit-' + i);
    for (let i = 1; i <= steps && SG.overflows(); i++) root.classList.add('fit-' + i);
  };

  // The columns that make `count` things biggest in a w x h space, each ideally `aspect` times as
  // wide as it is tall (the home tiles, the levels, the pictures). Full rows are preferred (no
  // lopsided gaps), and no column is narrower than `minWidth` when that can be helped (names fit).
  SG.gridFor = function (count, w, h, gap, aspect, minWidth) {
    let best = null;
    for (let cols = 1; cols <= count; cols++) {
      const rows = Math.ceil(count / cols);
      const cw = (w - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows;
      if (cols > 1 && cw < (minWidth || 0)) break;
      const fill = count / (cols * rows); // empty places cost more than the room they waste: rows come out even
      const score = Math.min(cw / aspect, ch) * fill * fill;
      if (!best || score > best.score + 0.5) best = { cols: cols, rows: rows, score: score };
    }
    return best;
  };

  // localStorage can throw (private mode, file:// in some browsers) - never let it break a game.
  SG.store = {
    get: function (key, fallback) {
      try {
        const value = localStorage.getItem('sg.' + key);
        return value === null ? fallback : value;
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem('sg.' + key, value);
      } catch (e) { /* ignore */ }
    }
  };

  // A tap that forgives a drifting finger.
  // Browsers only turn a touch into a "click" if the finger stays within about 2mm. A hand
  // with a tremor often slides further than that, and the tap is silently thrown away.
  // This counts any press that ends on (or within a few pixels of) the control.
  // Give the control `touch-action: none` in CSS so the press is never taken over as a scroll.
  SG.onTap = function (node, fn) {
    const SLACK = 8;
    let pointerId = null;
    let lastPointerUp = 0;

    if (window.PointerEvent) {
      node.addEventListener('pointerdown', function (e) {
        if (pointerId !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
        pointerId = e.pointerId;
        try { node.setPointerCapture(pointerId); } catch (err) { /* older browsers */ }
      });
      node.addEventListener('pointerup', function (e) {
        if (e.pointerId !== pointerId) return;
        pointerId = null;
        lastPointerUp = Date.now();
        const r = node.getBoundingClientRect();
        const inside = e.clientX >= r.left - SLACK && e.clientX <= r.right + SLACK &&
          e.clientY >= r.top - SLACK && e.clientY <= r.bottom + SLACK;
        if (inside) fn(e); // sliding well away before letting go still cancels, as people expect
      });
      node.addEventListener('pointercancel', function (e) {
        if (e.pointerId === pointerId) pointerId = null;
      });
    }

    // Keyboard, switch controls and screen readers arrive as a click with no press before it.
    node.addEventListener('click', function (e) {
      if (Date.now() - lastPointerUp > 500) fn(e);
    });
  };

  // An in-page panel (the finish screen). It replaces the game on the page - it is not a popup.
  SG.panel = function (options) {
    const el = SG.el;
    const children = [];
    if (options.art) children.push(el('div', { class: 'panel-art' }, [options.art]));
    children.push(el('h2', { class: 'panel-title', tabindex: '-1', text: options.title }));
    children.push(el('p', { class: 'panel-text', text: options.text }));
    if (options.extra) children.push(options.extra);
    children.push(el('div', { class: 'panel-actions' }, options.actions));
    return el('div', { class: 'panel-wrap' }, [
      el('section', { class: 'panel' + (options.kind ? ' panel-' + options.kind : '') }, children)
    ]);
  };

  // A short burst of paper confetti over the finish screen. It falls once and is gone; it is
  // left out entirely when the tablet asks for reduced motion.
  const CONFETTI = ['var(--accent)', 'var(--accent-deep)', '#F5B301', '#1F6B3F', '#E0457B', '#4FC3F7'];
  SG.confetti = function () {
    const pieces = [];
    for (let i = 0; i < 40; i++) {
      const piece = SG.el('i');
      piece.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      piece.style.setProperty('--dx', Math.round(Math.random() * 160 - 80) + 'px');
      piece.style.setProperty('--d', (Math.random() * 0.6).toFixed(2) + 's');
      piece.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg');
      piece.style.setProperty('--c', CONFETTI[i % CONFETTI.length]);
      pieces.push(piece);
    }
    return SG.el('div', { class: 'confetti', 'aria-hidden': 'true' }, pieces);
  };

  // The finish screen, in the game's own colour. `trophies` shows what was done (the words found,
  // the pairs, the full baskets). `options` may change the title, picture and the button words.
  SG.winPanel = function (message, trophies, onAgain, levelsHref, options) {
    const el = SG.el;
    options = options || {};
    SG.track.gameFinish(); // counted: this game was finished
    const again = SG.iconButton('btn btn-lg', options.againIcon || 'again', options.again || SG.t('playAgain'));
    SG.onTap(again, function (e) {
      SG.track.again();
      onAgain(e);
    });
    const actions = [again];
    // Something the player made: a photo with it
    if (options.photo) {
      const photo = SG.iconButton('btn btn-lg win-photo', 'camera', SG.t('photo.open'));
      SG.onTap(photo, options.photo);
      actions.push(photo);
    }
    const wrap = SG.panel({
      kind: 'win',
      art: options.art || SG.star(),
      title: options.title || SG.t('wellDone'),
      text: message,
      extra: trophies,
      actions: actions.concat([SG.link({ class: 'btn btn-secondary', href: levelsHref }, [SG.icon(options.backIcon || 'levels'), SG.el('span', { class: 'btn-text', text: options.back || SG.t('changeLevel') })])])
    });
    if (!SG.reducedMotion()) wrap.appendChild(SG.confetti());
    // Once it is on the page: if it is too tall for the screen, take away extras step by step
    wrap.setAttribute('data-fit', '4');
    requestAnimationFrame(function () { if (wrap.isConnected) SG.fitSteps(wrap); });
    return wrap;
  };
})(window.SG);
