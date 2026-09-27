// Diya Trail: a dotted path of light runs from one diya to the next across a night sky. Slide a
// finger along the dots and they light up behind it; reach the next diya and it catches fire.
// A slow, controlled finger movement - like handwriting practice after a stroke.
//
// Forgiving by design: the finger may wander (each dot has a wide catch area), tapping the dots one
// by one works just as well as sliding, and lifting the finger never loses what has been lit.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;

  // diyas: how many to light. dots: between two diyas. bend: how curved each stretch of path is.
  const LEVELS = {
    easy: { diyas: 3, dots: 7, bend: 0.18 },
    medium: { diyas: 5, dots: 8, bend: 0.32 },
    hard: { diyas: 7, dots: 9, bend: 0.45 }
  };

  const REACH = 3;           // a finger can move the light up to this many dots ahead at once
  const WIN_PAUSE_MS = 2000;

  // Where the diyas go, 0-1 across and down: along a zigzag that suits the board's shape
  // (rows across a wide board, columns down a tall one), each nudged a little from its place.
  function route(count, wide) {
    const perLine = count <= 3 ? count : count <= 5 ? 3 : 4; // 3 in a line; 3 + 2; 4 + 3
    const lines = Math.ceil(count / perLine);
    const spots = [];
    for (let i = 0; i < count; i++) {
      const line = Math.floor(i / perLine);
      let pos = i % perLine;
      if (line % 2) pos = perLine - 1 - pos; // back the other way: a snake, so the path never jumps
      const along = (pos + 0.5) / perLine + (Math.random() - 0.5) * 0.12 / perLine;
      const down = lines === 1 ? 0.5 + (i % 2 ? 0.18 : -0.18) : (line + 0.5) / lines + (Math.random() - 0.5) * 0.3 / lines;
      spots.push(wide ? { x: along, y: down } : { x: down, y: along });
    }
    return spots;
  }

  // The soft golden light round a burning diya
  function halo() {
    return svg('defs', {}, [svg('radialGradient', { id: 'dy-halo' }, [
      svg('stop', { offset: '0', 'stop-color': '#FFE082', 'stop-opacity': 0.95 }),
      svg('stop', { offset: '0.45', 'stop-color': '#FFB300', 'stop-opacity': 0.45 }),
      svg('stop', { offset: '1', 'stop-color': '#FF8F00', 'stop-opacity': 0 })
    ])]);
  }

  function mount(stage, levelKey) {
    const level = LEVELS[levelKey];
    const t = SG.t;
    const timers = SG.timers();

    let spots, bends, path, reached, lit, done, pointerId, width, height;
    let layoutEl, statusEl, board, dotEls, diyaEls, trailEl;

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'status dy-status', role: 'status' });
      board = svg('svg', { class: 'dy-board', role: 'img', tabindex: '0', 'aria-label': t('dy.board') });
      board.addEventListener('pointerdown', onDown);
      board.addEventListener('pointermove', onMove);
      board.addEventListener('pointerup', onUp);
      board.addEventListener('pointercancel', onUp);
      board.addEventListener('keydown', onKey);
      layoutEl = el('div', { class: 'dy-layout' }, [statusEl, el('div', { class: 'dy-board-wrap' }, [board])]);
      stage.appendChild(layoutEl);
    }

    // A curved stretch of path from diya a to diya b, as points 0-1 along it
    function stretch(a, b, bend, k) {
      const dx = b.x - a.x, dy = b.y - a.y;
      // control points pushed out sideways, one each way on the twistier paths
      const nx = -dy * bend, ny = dx * bend;
      const c1 = { x: a.x + dx / 3 + nx, y: a.y + dy / 3 + ny };
      const c2 = { x: a.x + 2 * dx / 3 + (level.bend > 0.3 ? -nx : nx), y: a.y + 2 * dy / 3 + (level.bend > 0.3 ? -ny : ny) };
      const u = 1 - k;
      return {
        x: u * u * u * a.x + 3 * u * u * k * c1.x + 3 * u * k * k * c2.x + k * k * k * b.x,
        y: u * u * u * a.y + 3 * u * u * k * c1.y + 3 * u * k * k * c2.y + k * k * k * b.y
      };
    }

    // The whole route in pixels: diya, dots, diya, dots... `diya` says which diya a point is.
    function buildPath() {
      const px = function (p) { return { x: margin() + p.x * (width - 2 * margin()), y: margin() + p.y * (height - 2 * margin()) }; };
      path = [];
      spots.forEach(function (s, i) {
        path.push(Object.assign(px(s), { diya: i }));
        if (i === spots.length - 1) return;
        for (let d = 1; d <= level.dots; d++) {
          path.push(Object.assign(px(stretch(s, spots[i + 1], bends[i], d / (level.dots + 1))), { diya: -1 }));
        }
      });
    }

    function margin() {
      return Math.max(34, Math.min(width, height) * 0.1);
    }

    function diyaSize() {
      return SG.clamp(Math.min(width, height) / 6, 48, 92);
    }

    function draw() {
      board.textContent = '';
      board.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      board.appendChild(halo());
      // the night sky, with a few stars and the moon
      board.appendChild(svg('rect', { class: 'dy-sky', x: 0, y: 0, width: width, height: height, rx: 22 }));
      for (let i = 0; i < 14; i++) {
        board.appendChild(svg('circle', { cx: ((i * 67) % 97) / 97 * width, cy: ((i * 41) % 89) / 89 * height, r: 1.6, fill: '#FFFFFF', 'fill-opacity': 0.5 }));
      }
      board.appendChild(svg('circle', { cx: width - 40, cy: 38, r: 16, fill: '#FFF3C4' }));
      board.appendChild(svg('circle', { cx: width - 33, cy: 32, r: 14, class: 'dy-moon-cut' }));

      // the light already along the path
      trailEl = svg('polyline', { class: 'dy-trail', fill: 'none' });
      board.appendChild(trailEl);

      const r = SG.clamp(Math.min(width, height) / 60, 6, 10);
      dotEls = path.map(function (p) {
        if (p.diya >= 0) return null;
        const dot = svg('circle', { class: 'dy-dot', cx: p.x, cy: p.y, r: r });
        board.appendChild(dot);
        return dot;
      });
      const size = diyaSize();
      diyaEls = path.filter(function (p) { return p.diya >= 0; }).map(function (p) {
        const g = diya(p.x, p.y, size);
        board.appendChild(g);
        return g;
      });
      show();
    }

    // A clay diya: flame and glow appear once it is lit
    function diya(x, y, size) {
      const s = size / 60;
      return svg('g', { class: 'dy-diya', transform: 'translate(' + x + ' ' + y + ') scale(' + s + ')' }, [
        svg('circle', { class: 'dy-glow', cx: 0, cy: -8, r: 40, fill: 'url(#dy-halo)' }),
        svg('path', { class: 'dy-flame', d: 'M0-34C9-22 10-12 0-4-10-12-9-22 0-34Z' }),
        svg('path', { class: 'dy-flame-core', d: 'M0-22C4-16 4-10 0-6-4-10-4-16 0-22Z' }),
        svg('path', { d: 'M0-4V-9', stroke: '#3E2A1A', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
        svg('path', { d: 'M-26-4H26C24 12 12 20 0 20-12 20-24 12-26-4Z', fill: '#C7702E', stroke: '#5B2E0A', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
        svg('ellipse', { cx: 0, cy: -4, rx: 26, ry: 5, fill: '#E8A15A', stroke: '#5B2E0A', 'stroke-width': 3 }),
        svg('circle', { cx: -11, cy: 8, r: 3, fill: '#FFD54F' }),
        svg('circle', { cx: 11, cy: 8, r: 3, fill: '#FFD54F' })
      ]);
    }

    // Lit dots, lit diyas, and a ring round the next dot to reach
    function show() {
      dotEls.forEach(function (dot, i) {
        if (!dot) return;
        dot.classList.toggle('lit', i <= reached);
        dot.classList.toggle('next', i === reached + 1 && !done);
      });
      let d = 0;
      path.forEach(function (p, i) {
        if (p.diya < 0) return;
        diyaEls[d].classList.toggle('lit', i <= reached);
        diyaEls[d].classList.toggle('next', !done && i > reached && path.slice(reached + 1, i).every(function (q) { return q.diya < 0; }));
        d++;
      });
      trailEl.setAttribute('points', path.slice(0, reached + 1).map(function (p) { return p.x + ',' + p.y; }).join(' '));
    }

    // Moves the light on to `i` (never back). Lights a diya when the light reaches it.
    function reach(i) {
      if (done || i <= reached) return;
      const before = reached;
      reached = i;
      const newlyLit = path.slice(before + 1, i + 1).filter(function (p) { return p.diya >= 0; }).length;
      show();
      if (!newlyLit) return;
      lit += newlyLit;
      if (lit === spots.length) {
        done = true;
        show();
        statusEl.textContent = t('dy.last');
        SG.sound.win();
        timers.later(showWin, WIN_PAUSE_MS);
        return;
      }
      SG.sound.good(lit);
      statusEl.textContent = t('dy.lit', lit, spots.length);
    }

    // The finger (or a tap) lights every dot it reaches, up to a few dots ahead of the light.
    function touch(clientX, clientY) {
      const r = board.getBoundingClientRect();
      const x = (clientX - r.left) * width / r.width, y = (clientY - r.top) * height / r.height;
      const spacing = path.length > 1 ? Math.hypot(path[1].x - path[0].x, path[1].y - path[0].y) : 40;
      const catchR = Math.max(38, spacing * 0.75);
      let best = -1;
      for (let i = reached + 1; i <= Math.min(reached + REACH, path.length - 1); i++) {
        if (Math.hypot(path[i].x - x, path[i].y - y) <= catchR) best = i;
      }
      if (best > reached) reach(best);
    }

    function onDown(e) {
      if (pointerId !== null) return; // a resting palm or second finger is ignored
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      pointerId = e.pointerId;
      try { board.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      touch(e.clientX, e.clientY);
    }

    function onMove(e) {
      if (e.pointerId !== pointerId) return;
      // every step of the movement, so a quick slide still passes each dot
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (events.length ? events : [e]).forEach(function (m) { touch(m.clientX, m.clientY); });
    }

    function onUp(e) {
      if (e.pointerId === pointerId) pointerId = null;
    }

    // Keyboard: Enter, Space or the right arrow moves the light on one dot
    function onKey(e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      reach(reached + 1);
    }

    function layout() {
      if (!board) return;
      const wrap = board.parentNode;
      const top = wrap.getBoundingClientRect().top;
      const w = Math.floor(wrap.clientWidth);
      const h = Math.floor(Math.max(200, SG.bottom() - top - 10));
      if (w === width && h === height) return;
      width = w;
      height = h;
      board.style.width = w + 'px';
      board.style.height = h + 'px';
      buildPath();
      draw();
    }

    function showWin() {
      const trophies = el('div', { class: 'dy-trophies panel-trophies', 'aria-hidden': 'true' }, spots.map(function () {
        return svg('svg', { viewBox: '-42 -50 84 76' }, [halo(), diya(0, 0, 60)]);
      }));
      trophies.querySelectorAll('.dy-diya').forEach(function (g) { g.classList.add('lit'); });
      const panel = SG.winPanel(t('dy.win', spots.length), trophies, newGame, '#/diya/levels');
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
      reached = 0;
      lit = 1; // the first diya is already burning: the light starts from it
      done = false;
      pointerId = null;
      width = height = 0;
      render();
      const wrap = board.parentNode;
      const wide = wrap.clientWidth >= SG.bottom() - wrap.getBoundingClientRect().top;
      spots = route(level.diyas, wide);
      bends = spots.map(function (s, i) { return level.bend * (i % 2 ? -1 : 1); });
      statusEl.textContent = t('dy.start');
      layout();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      progress: function () {
        return done || lit < 2 ? null : t('dy.progress', lit, spots.length);
      },
      destroy: function () {
        timers.clear();
        window.removeEventListener('resize', layout);
      },
      // for the playtest: where the dots are on the screen, and a jump to the finish screen
      peek: function () {
        const r = board.getBoundingClientRect();
        return path.map(function (p) { return { x: r.left + p.x * r.width / width, y: r.top + p.y * r.height / height, diya: p.diya }; });
      },
      finish: function () {
        timers.clear();
        showWin();
      }
    };
  }

  // A night sky with a dotted path through three diyas, the first two lit.
  // `opts.demo`: a hand slides along the dots towards the third.
  function illustration(opts) {
    const dots = [];
    for (let i = 1; i <= 6; i++) {
      const k = i / 7;
      dots.push(svg('circle', { cx: 60 + 40 * k, cy: 40 + Math.sin(k * Math.PI) * -14 + 18 * k, r: 2.6, fill: '#FFD54F', 'fill-opacity': i < 3 ? 1 : 0.45 }));
    }
    function lamp(x, y, lit) {
      return svg('g', { transform: 'translate(' + x + ' ' + y + ') scale(0.34)' }, [
        lit ? svg('circle', { cx: 0, cy: -8, r: 40, fill: 'url(#dy-halo)' }) : svg('g'),
        lit ? svg('path', { d: 'M0-34C9-22 10-12 0-4-10-12-9-22 0-34Z', fill: '#FF9800', stroke: '#E65100', 'stroke-width': 2 }) : svg('g'),
        svg('path', { d: 'M-26-4H26C24 12 12 20 0 20-12 20-24 12-26-4Z', fill: '#C7702E', stroke: '#5B2E0A', 'stroke-width': 4 }),
        svg('ellipse', { cx: 0, cy: -4, rx: 26, ry: 5, fill: '#E8A15A', stroke: '#5B2E0A', 'stroke-width': 4 })
      ]);
    }
    const parts = [
      halo(),
      svg('rect', { x: 4, y: 4, width: 112, height: 82, rx: 12, class: 'fill-deep' }),
      svg('circle', { cx: 100, cy: 18, r: 7, fill: '#FFF3C4' }),
      svg('path', { d: 'M20 62Q40 30 60 40', fill: 'none', stroke: '#FFD54F', 'stroke-width': 3.5, 'stroke-linecap': 'round' })
    ].concat(dots).concat([lamp(20, 64, true), lamp(60, 42, true), lamp(100, 60, false)]);
    if (opts && opts.demo) parts.push(SG.demoHand(66, 44, 'slide', 26, 8));
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, parts);
  }

  // A line of dots with a diya at each stop
  function preview(levelKey) {
    const n = LEVELS[levelKey].diyas;
    const parts = [svg('rect', { x: 0, y: 0, width: 100, height: 100, rx: 14, class: 'fill-deep' })];
    let d = 'M';
    for (let i = 0; i < n; i++) {
      const x = 12 + 76 * i / (n - 1), y = 50 + (i % 2 ? -18 : 18);
      d += (i ? ' L' : '') + x + ' ' + y;
    }
    parts.push(svg('path', { d: d, fill: 'none', stroke: '#FFD54F', 'stroke-width': 3, 'stroke-dasharray': '1 6', 'stroke-linecap': 'round' }));
    for (let i = 0; i < n; i++) {
      parts.push(svg('circle', { cx: 12 + 76 * i / (n - 1), cy: 50 + (i % 2 ? -18 : 18), r: 6.5, fill: i ? '#C7702E' : '#FF9800', stroke: '#FFD54F', 'stroke-width': 1.5 }));
    }
    return svg('svg', { class: 'level-art', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, parts);
  }

  SG.registerGame({
    key: 'diya',
    text: 'dy',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    preview: preview,
    detail: function (levelKey) { return SG.t('dy.level.' + levelKey); }
  });
})(window.SG);
