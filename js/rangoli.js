// Rangoli Mirror: choose a colour and a shape, tap the floor, and the mark appears again all the
// way round the centre, mirrored - so whatever is tapped, the rangoli comes out balanced and
// beautiful. Taps snap to the faint guide dots, the way rangoli is laid out on dots.
//
// Nothing can go wrong: Undo takes back the last tap, and each design is kept, so the level page
// (Square, Flower, Star) doubles as the gallery.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;

  // Named, so the status line can say which colour is chosen (colour is never the only signal)
  const COLOURS = [
    { value: '#FFFFFF', en: 'White', hi: 'सफ़ेद' },
    { value: '#FFD54F', en: 'Yellow', hi: 'पीला' },
    { value: '#FF9800', en: 'Saffron', hi: 'केसरिया' },
    { value: '#E53935', en: 'Red', hi: 'लाल' },
    { value: '#F06292', en: 'Pink', hi: 'गुलाबी' },
    { value: '#AB47BC', en: 'Purple', hi: 'बैंगनी' },
    { value: '#29B6F6', en: 'Blue', hi: 'नीला' },
    { value: '#66BB6A', en: 'Green', hi: 'हरा' }
  ];

  // Each shape is drawn pointing away from the centre, around (0, 0)
  const SHAPES = {
    dot: { en: 'Dots', hi: 'बिंदु', draw: function () { return svg('circle', { cx: 0, cy: 0, r: 6.2 }); } },
    petal: { en: 'Petals', hi: 'पंखुड़ी', draw: function () { return svg('path', { d: 'M0 8.5C-6.5 3-5.5-5 0-10.5 5.5-5 6.5 3 0 8.5Z' }); } },
    diamond: { en: 'Diamonds', hi: 'हीरे', draw: function () { return svg('path', { d: 'M0-9.5L6.5 0 0 9.5-6.5 0Z' }); } },
    ring: { en: 'Rings', hi: 'छल्ले', draw: function () { return svg('circle', { cx: 0, cy: 0, r: 5.4, fill: 'none', 'stroke-width': 3.2 }); } }
  };
  const SHAPE_KEYS = Object.keys(SHAPES);

  // How many times a mark goes round the centre (and each is mirrored too)
  const LEVELS = {
    square: { n: 4, en: 'Square', hi: 'चौकोर' },
    flower: { n: 6, en: 'Flower', hi: 'फूल' },
    star: { n: 8, en: 'Star', hi: 'तारा' }
  };

  const RINGS = [0, 17, 32, 47, 62, 77]; // radius of each circle of guide dots, on a board 200 across
  const FLOOR = '#5B2A22';
  const SIDE_BY_SIDE = '(min-width: 640px) and (orientation: landscape)'; // keep in step with style.css

  // How many guide dots go round a ring: a whole number of dots for each turn of the pattern, as
  // many as fit about 12 apart. Dots between the mirror lines are what make a tap come out twice
  // in each turn (16 marks on the star, not 8).
  function ringSteps(ring, n) {
    if (ring === 0) return 1;
    return n * Math.max(ring === 1 ? 1 : 2, Math.floor(2 * Math.PI * RINGS[ring] / (12 * n)));
  }

  // The guide dots for a symmetry: the centre, then rings with more dots as they get bigger.
  function guidePoints(n) {
    const points = [{ ring: 0, step: 0, r: 0, a: 0 }];
    for (let ring = 1; ring < RINGS.length; ring++) {
      const steps = ringSteps(ring, n);
      for (let step = 0; step < steps; step++) points.push({ ring: ring, step: step, steps: steps, r: RINGS[ring], a: 360 * step / steps });
    }
    return points;
  }

  // Where one tap puts its mark: n turns round the centre, each also mirrored, without doubles.
  function copies(point, n) {
    if (!point.r) return [0];
    const seen = {};
    const out = [];
    for (let k = 0; k < n; k++) {
      [point.a + 360 * k / n, -point.a + 360 * k / n].forEach(function (a) {
        const key = Math.round((((a % 360) + 360) % 360) * 100);
        if (!seen[key]) { seen[key] = true; out.push(a); }
      });
    }
    return out;
  }

  function stampNodes(stamp, level, points) {
    const point = points[stamp.p];
    const shape = SHAPES[stamp.shape];
    const scale = point.r ? 0.8 + point.ring * 0.13 : 1.5;
    return copies(point, LEVELS[level].n).map(function (a) {
      const node = shape.draw();
      const ring = stamp.shape === 'ring';
      node.setAttribute('fill', ring ? 'none' : stamp.colour);
      node.setAttribute('stroke', ring ? stamp.colour : 'rgba(0,0,0,0.3)');
      if (!ring) node.setAttribute('stroke-width', 0.8);
      node.setAttribute('transform', 'rotate(' + a + ') translate(0 ' + (-point.r) + ') scale(' + scale + ')');
      return node;
    });
  }

  // The floor with its guide dots, and the design on it
  function drawBoard(level, stamps, className, withDots) {
    const points = guidePoints(LEVELS[level].n);
    const parts = [svg('rect', { x: -100, y: -100, width: 200, height: 200, rx: 14, fill: FLOOR })];
    if (withDots) {
      parts.push(svg('g', { class: 'rg-dots', fill: '#FFFFFF', 'fill-opacity': 0.32 }, points.map(function (p) {
        return svg('circle', { r: 1.6, transform: 'rotate(' + p.a + ') translate(0 ' + (-p.r) + ')' });
      })));
    }
    const design = svg('g', { class: 'rg-design' });
    stamps.forEach(function (s) { stampNodes(s, level, points).forEach(function (n) { design.appendChild(n); }); });
    parts.push(design);
    return svg('svg', { class: className, viewBox: '-100 -100 200 200', 'aria-hidden': withDots ? 'false' : 'true' }, parts);
  }

  function saved(level) {
    try {
      const list = JSON.parse(SG.store.get('rg.' + level, '[]'));
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function save(level, stamps) {
    SG.store.set('rg.' + level, JSON.stringify(stamps));
  }

  function colourName(value) {
    const c = COLOURS.filter(function (x) { return x.value === value; })[0] || COLOURS[0];
    return c[SG.lang] || c.en;
  }

  function mount(stage, levelKey) {
    const t = SG.t;
    const n = LEVELS[levelKey].n;
    const points = guidePoints(n);

    let stamps, colour, shape, finished, pointerId, cursor;
    let layoutEl, boardBox, boardSvg, design, cursorEl, statusEl, currentEl, swatches, shapeBtns;

    function status() {
      statusEl.textContent = t('rg.status', colourName(colour), SHAPES[shape][SG.lang] || SHAPES[shape].en);
    }

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'status rg-status', role: 'status' });
      currentEl = el('span', { class: 'rg-current', 'aria-hidden': 'true' });

      boardSvg = drawBoard(levelKey, stamps, 'rg-board', true);
      boardSvg.setAttribute('role', 'img');
      boardSvg.setAttribute('tabindex', '0');
      boardSvg.setAttribute('aria-label', t('rg.board'));
      design = boardSvg.querySelector('.rg-design');
      cursorEl = svg('circle', { class: 'rg-cursor', r: 9, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2.2 });
      cursorEl.style.display = 'none';
      boardSvg.appendChild(cursorEl);
      boardSvg.addEventListener('pointerdown', onDown);
      boardSvg.addEventListener('pointerup', onUp);
      boardSvg.addEventListener('pointercancel', function () { pointerId = null; });
      boardSvg.addEventListener('keydown', onKey);
      boardSvg.addEventListener('blur', function () { cursorEl.style.display = 'none'; });
      boardBox = el('div', { class: 'rg-board-box' }, [boardSvg]);

      shapeBtns = SHAPE_KEYS.map(function (key) {
        const b = el('button', { class: 'rg-shape pressable', type: 'button', 'aria-label': SHAPES[key][SG.lang] || SHAPES[key].en }, [
          svg('svg', { class: 'rg-shape-pic', viewBox: '-13 -13 26 26', 'aria-hidden': 'true' }, [SHAPES[key].draw()]),
          SG.icon('check')
        ]);
        SG.onTap(b, function () { chooseShape(key); });
        return b;
      });
      swatches = COLOURS.map(function (c) {
        const b = el('button', { class: 'col-swatch rg-swatch pressable', type: 'button', 'aria-label': c[SG.lang] || c.en }, [SG.icon('check')]);
        b.style.setProperty('--swatch', c.value);
        SG.onTap(b, function () { chooseColour(c.value); });
        return b;
      });

      const undoBtn = SG.iconButton('btn btn-secondary rg-undo', 'undo', t('col.undo'));
      SG.onTap(undoBtn, undo);
      const finishBtn = SG.iconButton('btn rg-finish', 'check', t('col.finish'));
      SG.onTap(finishBtn, finish);

      layoutEl = el('div', { class: 'col-layout rg-layout' }, [
        el('div', { class: 'col-top' }, [currentEl, statusEl]),
        boardBox,
        el('div', { class: 'col-side rg-side' }, [
          el('div', { class: 'rg-shapes', role: 'group', 'aria-label': t('rg.shapes') }, shapeBtns),
          el('div', { class: 'col-palette rg-palette', role: 'group', 'aria-label': t('col.palette') }, swatches),
          el('div', { class: 'col-tools' }, [undoBtn, finishBtn])
        ])
      ]);
      stage.appendChild(layoutEl);
      showChosen();
      status();
    }

    // The floor gets all the room the tools leave
    function layout() {
      if (!boardBox) return;
      const sideBySide = window.matchMedia(SIDE_BY_SIDE).matches;
      const top = boardBox.getBoundingClientRect().top;
      const side = layoutEl.querySelector('.col-side');
      const availW = sideBySide ? layoutEl.clientWidth - side.offsetWidth - 28 : layoutEl.clientWidth;
      const availH = SG.bottom() - top - (sideBySide ? 0 : side.offsetHeight + 16) - 10;
      const size = Math.floor(SG.clamp(Math.min(availW, availH), 130, 760));
      boardBox.style.width = size + 'px';
      boardBox.style.height = size + 'px';
    }

    function showChosen() {
      swatches.forEach(function (b, i) { b.setAttribute('aria-pressed', String(COLOURS[i].value === colour)); });
      shapeBtns.forEach(function (b, i) {
        b.setAttribute('aria-pressed', String(SHAPE_KEYS[i] === shape));
        // each shape button shows its shape in the chosen colour
        const pic = b.querySelector('.rg-shape-pic').firstChild;
        if (SHAPE_KEYS[i] === 'ring') pic.setAttribute('stroke', colour);
        else pic.setAttribute('fill', colour);
      });
      currentEl.textContent = '';
      currentEl.appendChild(svg('svg', { viewBox: '-13 -13 26 26' }, [(function () {
        const node = SHAPES[shape].draw();
        node.setAttribute(shape === 'ring' ? 'stroke' : 'fill', colour);
        return node;
      })()]));
    }

    function chooseColour(value) {
      colour = value;
      SG.store.set('rg.colour', value);
      showChosen();
      SG.sound.tap();
      status();
    }

    function chooseShape(key) {
      shape = key;
      SG.store.set('rg.shape', key);
      showChosen();
      SG.sound.tap();
      status();
    }

    function stamp(p) {
      const s = { p: p, shape: shape, colour: colour };
      stamps.push(s);
      save(levelKey, stamps);
      stampNodes(s, levelKey, points).forEach(function (node) {
        if (!SG.reducedMotion()) node.classList.add('rg-new');
        design.appendChild(node);
      });
      SG.sound.good(points[p].ring + SHAPE_KEYS.indexOf(shape));
      status();
    }

    // The guide dot nearest a point on the screen (or none, if the finger is off the floor)
    function nearest(clientX, clientY) {
      const at = boardSvg.createSVGPoint();
      at.x = clientX;
      at.y = clientY;
      const p = at.matrixTransform(boardSvg.getScreenCTM().inverse());
      if (Math.hypot(p.x, p.y) > 96) return -1;
      let best = -1, bestD = Infinity;
      points.forEach(function (g, i) {
        const rad = (g.a - 90) * Math.PI / 180;
        const d = Math.hypot(p.x - g.r * Math.cos(rad), p.y - g.r * Math.sin(rad));
        if (d < bestD) { best = i; bestD = d; }
      });
      return best;
    }

    // The dot under the finger when it comes down gets the mark, however much the finger drifts.
    let pressed = -1;
    function onDown(e) {
      if (pointerId !== null) return; // a resting palm or second finger is ignored
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      pointerId = e.pointerId;
      pressed = nearest(e.clientX, e.clientY);
    }

    function onUp(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (pressed >= 0) stamp(pressed);
      pressed = -1;
    }

    // Keyboard: arrows move round and in and out along the guide dots, Enter or Space stamps
    function onKey(e) {
      const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [1, 0], ArrowDown: [-1, 0] };
      if (moves[e.key]) {
        e.preventDefault();
        const ring = SG.clamp(cursor.ring + moves[e.key][0], 0, RINGS.length - 1);
        const steps = ringSteps(ring, n);
        const fraction = cursor.step / ringSteps(cursor.ring, n);
        let step = ring === cursor.ring ? cursor.step + moves[e.key][1] : Math.round(fraction * steps);
        step = ((step % steps) + steps) % steps;
        cursor = { ring: ring, step: step };
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        stamp(cursorIndex());
      } else {
        return;
      }
      const g = points[cursorIndex()];
      cursorEl.setAttribute('transform', 'rotate(' + g.a + ') translate(0 ' + (-g.r) + ')');
      cursorEl.style.display = '';
    }

    function cursorIndex() {
      return points.findIndex(function (g) { return g.ring === cursor.ring && (g.ring === 0 || g.step === cursor.step); });
    }

    function undo() {
      if (!stamps.length) {
        statusEl.textContent = t('col.nothingToUndo');
        return;
      }
      stamps.pop();
      save(levelKey, stamps);
      const fresh = drawBoard(levelKey, stamps, 'rg-board', true).querySelector('.rg-design');
      design.replaceWith(fresh);
      design = fresh;
      SG.sound.tap();
      statusEl.textContent = t('col.undone');
    }

    function finish() {
      if (!stamps.length) {
        statusEl.textContent = t('rg.empty');
        return;
      }
      finished = true;
      SG.sound.win();
      const panel = SG.winPanel(t('rg.doneText'), null, keepGoing, '#/rangoli/levels', {
        title: t('col.doneTitle'),
        art: drawBoard(levelKey, stamps, 'col-finished rg-finished', false),
        again: t('rg.keep'),
        againIcon: 'play',
        back: t('rg.another'),
        backIcon: 'picture'
      });
      stage.textContent = '';
      boardBox = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function keepGoing() {
      finished = false;
      render();
      layout();
    }

    // "Start Again": a clean floor
    function newGame() {
      stamps = [];
      save(levelKey, stamps);
      keepGoing();
    }

    stamps = saved(levelKey);
    colour = SG.store.get('rg.colour', COLOURS[1].value);
    if (!COLOURS.some(function (c) { return c.value === colour; })) colour = COLOURS[1].value;
    shape = SG.store.get('rg.shape', 'petal');
    if (!SHAPES[shape]) shape = 'petal';
    pointerId = null;
    cursor = { ring: 0, step: 0 };
    window.addEventListener('resize', layout);
    keepGoing();

    return {
      newGame: newGame,
      resize: layout,
      progress: function () {
        return stamps.length && !finished ? t('rg.progress') : null;
      },
      destroy: function () {
        window.removeEventListener('resize', layout);
      },
      // for the playtest: a few marks, then "I'm Finished"
      finish: function () {
        [0, 3, 9, 20].forEach(function (p) { stamp(p); });
        finish();
      }
    };
  }

  // A floor with a flower of petals and dots. `opts.demo`: a hand taps the floor.
  function illustration(opts) {
    const stamps = [
      { p: 0, shape: 'dot', colour: '#FFD54F' },
      { p: 2, shape: 'petal', colour: '#F06292' },
      { p: 10, shape: 'dot', colour: '#FFFFFF' },
      { p: 25, shape: 'petal', colour: '#FF9800' },
      { p: 42, shape: 'diamond', colour: '#29B6F6' }
    ];
    const board = drawBoard('star', stamps, '', true);
    board.removeAttribute('class');
    board.setAttribute('x', 16);
    board.setAttribute('y', 1);
    board.setAttribute('width', 88);
    board.setAttribute('height', 88);
    const parts = [board];
    if (opts && opts.demo) parts.push(SG.demoHand(76, 30, 'tap'));
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, parts);
  }

  SG.registerGame({
    key: 'rangoli',
    text: 'rg',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    // The level page shows each design as it was left: it is the player's gallery too.
    preview: function (key) {
      const stamps = saved(key);
      return drawBoard(key, stamps, 'level-art level-art-rg', !stamps.length);
    },
    levelName: function (key) { return LEVELS[key][SG.lang] || LEVELS[key].en; },
    detail: function (key) {
      return SG.t('rg.detail', LEVELS[key].n) + (saved(key).length ? ' ' + SG.t('col.started') : '');
    }
  });

  SG.rangoli = { guidePoints: guidePoints, copies: copies }; // for the playtest
})(window.SG);
