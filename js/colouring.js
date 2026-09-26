// Colouring Book: choose a colour, then tap part of the picture to fill it. No lines to stay
// inside and nothing to get wrong - a part can be recoloured any time, and Undo takes back the
// last colour. Every picture is kept as it is coloured, so the chooser page doubles as the
// player's gallery, and each picture carries on where it was left.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;
  const INK = '#1F2A44';
  const BLANK = '#FFFFFF';

  // Named, so the status line can say which colour is chosen (colour is never the only signal).
  const COLOURS = [
    { value: '#E53935', en: 'Red', hi: 'लाल' },
    { value: '#FB8C00', en: 'Saffron', hi: 'केसरिया' },
    { value: '#FDD835', en: 'Yellow', hi: 'पीला' },
    { value: '#9CCC65', en: 'Light green', hi: 'हल्का हरा' },
    { value: '#2E7D32', en: 'Green', hi: 'हरा' },
    { value: '#4FC3F7', en: 'Sky blue', hi: 'आसमानी' },
    { value: '#1E5BB8', en: 'Blue', hi: 'नीला' },
    { value: '#8E44AD', en: 'Purple', hi: 'बैंगनी' },
    { value: '#F48FB1', en: 'Pink', hi: 'गुलाबी' },
    { value: '#8D5524', en: 'Brown', hi: 'भूरा' },
    { value: '#9E9E9E', en: 'Grey', hi: 'स्लेटी' },
    { value: BLANK, en: 'White', hi: 'सफ़ेद' }
  ];

  // Pictures are drawn on a 100 x 100 grid, back to front. Each entry is
  //   [part id, svg tag, attributes, group?]  - a part that can be coloured
  //   ['-', svg tag, attributes]              - a line that is only decoration
  // Parts in the same group are coloured together by one tap (the rangoli's matching petals).
  // Parts are kept big: nothing smaller than a fingertip on a phone.
  function ring(count, offset, make) {
    const out = [];
    for (let i = 0; i < count; i++) out.push(make(i, offset + (360 / count) * i));
    return out;
  }
  const CLOUD = 'c-4 0-6-4-3-7 0-5 6-7 9-4 2-5 10-5 12 1 5-1 8 3 6 7 0 3-3 4-5 3z'; // drawn from wherever it starts

  const PICTURES = {
    flower: { en: 'Flower', hi: 'फूल', parts: [
      ['bg', 'rect', { x: 0, y: 0, width: 100, height: 100 }],
      ['stem', 'path', { d: 'M46.5 40H53.5V77H46.5z' }],
      ['leafL', 'path', { d: 'M47 70C38 58 24 60 19 66 27 75 40 77 47 70z' }],
      ['leafR', 'path', { d: 'M53 63C62 51 76 53 81 59 73 68 60 70 53 63z' }]
    ].concat(ring(5, 0, function (i, a) {
      return ['petal' + i, 'ellipse', { cx: 50, cy: 17, rx: 9, ry: 12.5, transform: 'rotate(' + a + ' 50 30)' }];
    })).concat([
      ['middle', 'circle', { cx: 50, cy: 30, r: 9 }],
      ['rim', 'rect', { x: 29, y: 76, width: 42, height: 8, rx: 2 }],
      ['pot', 'path', { d: 'M33 84H67L62 97H38z' }]
    ]) },

    house: { en: 'House', hi: 'घर', parts: [
      ['sky', 'rect', { x: 0, y: 0, width: 100, height: 72 }],
      ['sun', 'circle', { cx: 84, cy: 15, r: 9 }],
      ['cloud', 'path', { d: 'M17 25' + CLOUD }],
      ['ground', 'rect', { x: 0, y: 72, width: 100, height: 28 }],
      ['walk', 'path', { d: 'M44 84H56L63 100H37z' }],
      ['chimney', 'rect', { x: 63, y: 20, width: 9, height: 18 }],
      ['roof', 'path', { d: 'M13 46L50 19 87 46z' }],
      ['wall', 'rect', { x: 21, y: 46, width: 58, height: 38 }],
      ['door', 'rect', { x: 43, y: 61, width: 14, height: 23 }],
      ['windowL', 'rect', { x: 27, y: 53, width: 12, height: 12 }],
      ['windowR', 'rect', { x: 61, y: 53, width: 12, height: 12 }]
    ] },

    butterfly: { en: 'Butterfly', hi: 'तितली', parts: [
      ['bg', 'rect', { x: 0, y: 0, width: 100, height: 100 }],
      ['-', 'path', { d: 'M48 20C45 13 41 9 35 8M52 20C55 13 59 9 65 8', fill: 'none' }],
      ['wingUL', 'path', { d: 'M48 40C30 8 4 12 9 36 12 51 32 55 48 50z' }],
      ['wingUR', 'path', { d: 'M52 40C70 8 96 12 91 36 88 51 68 55 52 50z' }],
      ['wingLL', 'path', { d: 'M48 53C29 52 12 63 19 80 26 92 45 81 48 63z' }],
      ['wingLR', 'path', { d: 'M52 53C71 52 88 63 81 80 74 92 55 81 52 63z' }],
      ['spotUL', 'circle', { cx: 26, cy: 32, r: 7 }],
      ['spotUR', 'circle', { cx: 74, cy: 32, r: 7 }],
      ['spotLL', 'circle', { cx: 31, cy: 72, r: 5.5 }],
      ['spotLR', 'circle', { cx: 69, cy: 72, r: 5.5 }],
      ['body', 'ellipse', { cx: 50, cy: 51, rx: 5, ry: 23 }],
      ['head', 'circle', { cx: 50, cy: 23, r: 6 }]
    ] },

    kite: { en: 'Kite', hi: 'पतंग', parts: [
      ['sky', 'rect', { x: 0, y: 0, width: 100, height: 100 }],
      ['cloudL', 'path', { d: 'M13 21' + CLOUD }],
      ['cloudR', 'path', { d: 'M76 77' + CLOUD }],
      ['-', 'path', { d: 'M50 92C58 96 64 90 72 94S88 99 98 97', fill: 'none' }],
      ['topL', 'path', { d: 'M50 7L19 42H50z' }],
      ['topR', 'path', { d: 'M50 7L81 42H50z' }],
      ['bottomL', 'path', { d: 'M19 42L50 80V42z' }],
      ['bottomR', 'path', { d: 'M81 42L50 80V42z' }],
      ['patch', 'circle', { cx: 50, cy: 42, r: 8 }],
      ['tail', 'path', { d: 'M50 78L61 93H39z' }]
    ] },

    diya: { en: 'Diya', hi: 'दीया', parts: [
      ['bg', 'rect', { x: 0, y: 0, width: 100, height: 100 }],
      ['flame', 'path', { d: 'M50 8C61 25 63 38 50 47 37 38 39 25 50 8z' }],
      ['flameCore', 'path', { d: 'M50 23C56 31 56 39 50 44 44 39 44 31 50 23z' }],
      ['bowl', 'path', { d: 'M12 52H88C86 72 70 82 50 82 30 82 14 72 12 52z' }],
      ['oil', 'ellipse', { cx: 50, cy: 52, rx: 38, ry: 5.5 }],
      ['dotL', 'circle', { cx: 32, cy: 64, r: 5 }],
      ['dotM', 'circle', { cx: 50, cy: 68, r: 5 }],
      ['dotR', 'circle', { cx: 68, cy: 64, r: 5 }],
      ['stand', 'path', { d: 'M38 82H62L66 91H34z' }],
      ['plate', 'rect', { x: 20, y: 91, width: 60, height: 7, rx: 3.5 }]
    ] },

    lotus: { en: 'Lotus', hi: 'कमल', parts: [
      ['sky', 'rect', { x: 0, y: 0, width: 100, height: 100 }],
      ['water', 'rect', { x: 0, y: 72, width: 100, height: 28 }],
      ['padL', 'ellipse', { cx: 20, cy: 84, rx: 17, ry: 7 }],
      ['padR', 'ellipse', { cx: 80, cy: 88, rx: 17, ry: 7 }],
      ['backL', 'path', { d: 'M50 71C29 67 12 51 10 33 27 37 43 50 50 71z' }],
      ['backR', 'path', { d: 'M50 71C71 67 88 51 90 33 73 37 57 50 50 71z' }],
      ['midL', 'path', { d: 'M50 71C35 61 28 40 32 20 43 30 50 47 50 71z' }],
      ['midR', 'path', { d: 'M50 71C65 61 72 40 68 20 57 30 50 47 50 71z' }],
      ['centre', 'path', { d: 'M50 71C41 56 41 29 50 10 59 29 59 56 50 71z' }],
      ['base', 'path', { d: 'M33 70H67C63 77 57 79 50 79 43 79 37 77 33 70z' }]
    ] },

    rangoli: { en: 'Rangoli', hi: 'रंगोली', parts: [
      ['bg', 'rect', { x: 0, y: 0, width: 100, height: 100 }]
    ].concat(ring(8, 0, function (i, a) {
      return ['outer' + i, 'path', { d: 'M50 4C58 12 58 21 50 28 42 21 42 12 50 4z', transform: 'rotate(' + a + ' 50 50)' }, 'outer' + (i % 2)];
    })).concat(ring(8, 22.5, function (i, a) {
      return ['dot' + i, 'circle', { cx: 50, cy: 11, r: 5, transform: 'rotate(' + a + ' 50 50)' }, 'dot' + (i % 2)];
    })).concat([
      ['ring', 'circle', { cx: 50, cy: 50, r: 26 }]
    ]).concat(ring(8, 22.5, function (i, a) {
      return ['inner' + i, 'path', { d: 'M50 25C57 30 57 37 50 42 43 37 43 30 50 25z', transform: 'rotate(' + a + ' 50 50)' }, 'inner' + (i % 2)];
    })).concat([
      ['middle', 'circle', { cx: 50, cy: 50, r: 9 }]
    ]) }
  };

  const SIDE_BY_SIDE = '(min-width: 820px) and (orientation: landscape)'; // keep in step with style.css

  function saved(key) {
    try {
      return JSON.parse(SG.store.get('col.' + key, '{}')) || {};
    } catch (e) {
      return {};
    }
  }

  function save(key, fills) {
    SG.store.set('col.' + key, JSON.stringify(fills));
  }

  // The tap targets: a group counts once.
  function targets(picture) {
    const seen = {};
    return picture.parts.filter(function (p) {
      if (p[0] === '-') return false;
      const id = p[3] || p[0];
      if (seen[id]) return false;
      seen[id] = true;
      return true;
    }).length;
  }

  function colourName(value) {
    const c = COLOURS.filter(function (x) { return x.value === value; })[0] || COLOURS[0];
    return c[SG.lang] || c.en;
  }

  // Draws a picture with its colours. `live`: every part is a control (focusable, labelled).
  function draw(picture, fills, className, live) {
    let n = 0;
    const counted = {};
    const nodes = picture.parts.map(function (p) {
      const attrs = Object.assign({}, p[2]);
      if (p[0] === '-') {
        attrs.stroke = INK;
        attrs['stroke-width'] = 1.4;
        attrs['stroke-linecap'] = 'round';
        attrs['pointer-events'] = 'none';
        return svg(p[1], attrs);
      }
      attrs.fill = fills[p[0]] || BLANK;
      attrs.stroke = INK;
      attrs['stroke-width'] = 1.3;
      attrs['stroke-linejoin'] = 'round';
      attrs['data-part'] = p[0];
      if (p[3]) attrs['data-group'] = p[3];
      if (live) {
        const id = p[3] || p[0];
        if (!counted[id]) {
          counted[id] = ++n;
          attrs.tabindex = '0';
          attrs.role = 'button';
          attrs['aria-label'] = SG.t('col.part', n);
        }
        attrs.class = 'col-part';
      }
      return svg(p[1], attrs);
    });
    return svg('svg', { class: className, viewBox: '0 0 100 100', 'aria-hidden': live ? 'false' : 'true' }, nodes);
  }

  function mount(stage, pictureKey, hooks) {
    const picture = PICTURES[pictureKey];
    const t = SG.t;
    hooks = hooks || {};

    let fills, history, colour, pressedPart, pointerId;
    let layoutEl, pictureBox, pictureSvg, palette, swatches, tools, statusEl;

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'status col-status', role: 'status' });

      pictureSvg = draw(picture, fills, 'col-picture', true);
      pictureSvg.setAttribute('role', 'group');
      pictureSvg.setAttribute('aria-label', t('col.picture'));
      pictureSvg.addEventListener('pointerdown', onDown);
      pictureSvg.addEventListener('pointerup', onUp);
      pictureSvg.addEventListener('pointercancel', function () { pressedPart = null; pointerId = null; });
      pictureSvg.addEventListener('keydown', onKey);
      pictureBox = el('div', { class: 'col-picture-box' }, [pictureSvg]);

      swatches = COLOURS.map(function (c) {
        const button = el('button', {
          class: 'col-swatch pressable' + (c.value === BLANK ? ' col-swatch-white' : ''),
          type: 'button',
          'aria-label': c[SG.lang] || c.en
        }, [SG.icon('check')]);
        button.style.setProperty('--swatch', c.value);
        SG.onTap(button, function () { choose(c.value); });
        return button;
      });
      palette = el('div', { class: 'col-palette', role: 'group', 'aria-label': t('col.palette') }, swatches);

      const undoBtn = el('button', { class: 'btn btn-secondary col-undo', type: 'button', text: t('col.undo') });
      SG.onTap(undoBtn, undo);
      const finishBtn = el('button', { class: 'btn col-finish', type: 'button', text: t('col.finish') });
      SG.onTap(finishBtn, finish);
      tools = el('div', { class: 'col-tools' }, [undoBtn, finishBtn]);

      layoutEl = el('div', { class: 'col-layout' }, [
        statusEl,
        pictureBox,
        el('div', { class: 'col-side' }, [palette, tools])
      ]);
      stage.appendChild(layoutEl);
      showChosen();
      statusEl.textContent = t('col.colour', colourName(colour));
    }

    // The picture gets all the room the palette leaves.
    function layout() {
      if (!pictureBox) return;
      const sideBySide = window.matchMedia(SIDE_BY_SIDE).matches;
      const top = pictureBox.getBoundingClientRect().top + window.pageYOffset;
      const side = layoutEl.querySelector('.col-side');
      const availW = sideBySide ? layoutEl.clientWidth - side.offsetWidth - 28 : layoutEl.clientWidth;
      const availH = window.innerHeight - top - (sideBySide ? 0 : side.offsetHeight + 16) - 20;
      const size = Math.floor(SG.clamp(Math.min(availW, availH), 260, 760));
      pictureBox.style.width = size + 'px';
      pictureBox.style.height = size + 'px';
    }

    function showChosen() {
      swatches.forEach(function (button, i) {
        button.setAttribute('aria-pressed', String(COLOURS[i].value === colour));
      });
    }

    function choose(value) {
      colour = value;
      SG.store.set('col.colour', value);
      showChosen();
      SG.sound.tap();
      statusEl.textContent = t('col.colour', colourName(value));
    }

    // The part and, for a group, its matching parts.
    function partsFor(node) {
      const group = node.getAttribute('data-group');
      return group ? [].slice.call(pictureSvg.querySelectorAll('[data-group="' + group + '"]')) : [node];
    }

    function paint(node) {
      const nodes = partsFor(node);
      const before = nodes.map(function (n) { return fills[n.getAttribute('data-part')] || BLANK; });
      if (before.every(function (c) { return c === colour; })) return; // already this colour: nothing to undo
      history.push(nodes.map(function (n, i) { return { part: n.getAttribute('data-part'), was: before[i] }; }));
      nodes.forEach(function (n) {
        fills[n.getAttribute('data-part')] = colour;
        n.setAttribute('fill', colour);
      });
      save(pictureKey, fills);
      SG.sound.step();
      statusEl.textContent = t('col.colour', colourName(colour));
    }

    // The part under the finger when it came down is the one that gets coloured, however much the
    // finger drifts before lifting - a tremor never colours the part next door.
    function onDown(e) {
      if (pointerId !== null) return; // a resting palm or second finger is ignored
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const node = e.target.closest && e.target.closest('[data-part]');
      if (!node) return;
      e.preventDefault();
      pointerId = e.pointerId;
      pressedPart = node;
    }

    function onUp(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      const node = pressedPart;
      pressedPart = null;
      if (node) paint(node);
    }

    function onKey(e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const node = e.target.closest && e.target.closest('[data-part]');
      if (!node) return;
      e.preventDefault();
      paint(node);
    }

    function undo() {
      const step = history.pop();
      if (!step) {
        statusEl.textContent = t('col.nothingToUndo');
        return;
      }
      step.forEach(function (s) {
        if (s.was === BLANK) delete fills[s.part];
        else fills[s.part] = s.was;
        pictureSvg.querySelector('[data-part="' + s.part + '"]').setAttribute('fill', s.was);
      });
      save(pictureKey, fills);
      SG.sound.tap();
      statusEl.textContent = t('col.undone');
    }

    function coloured() {
      return Object.keys(fills).filter(function (k) { return fills[k] !== BLANK; }).length;
    }

    function finish() {
      if (!coloured()) {
        statusEl.textContent = t('col.empty');
        return;
      }
      SG.sound.win();
      const name = picture[SG.lang] || picture.en;
      const panel = SG.winPanel(t('col.doneText', name), null, keepColouring, '#/colouring', {
        title: t('col.doneTitle'),
        art: draw(picture, fills, 'col-finished', false),
        again: t('col.keep'),
        back: t('col.another')
      });
      stage.textContent = '';
      pictureBox = null;
      stage.appendChild(panel);
      if (hooks.onWin) hooks.onWin();
      panel.querySelector('.panel-title').focus();
    }

    function keepColouring() {
      render();
      layout();
      if (hooks.onStart) hooks.onStart();
    }

    // "Start Again": a clean, white copy of the picture.
    function newGame() {
      fills = {};
      save(pictureKey, fills);
      history = [];
      keepColouring();
    }

    fills = saved(pictureKey);
    history = [];
    pointerId = null;
    colour = SG.store.get('col.colour', COLOURS[0].value);
    if (!COLOURS.some(function (c) { return c.value === colour; })) colour = COLOURS[0].value;
    window.addEventListener('resize', layout);
    keepColouring();

    return {
      newGame: newGame,
      resize: layout,
      progress: function () {
        const n = coloured();
        return n ? t('col.progress', n) : null;
      },
      destroy: function () {
        window.removeEventListener('resize', layout);
      }
    };
  }

  function art() {
    const fills = { petal0: '#E53935', petal1: '#FB8C00', petal2: '#E53935', petal3: '#FB8C00', middle: '#FDD835', leafL: '#9CCC65', stem: '#2E7D32' };
    return el('div', { class: 'art art-col', 'aria-hidden': 'true' }, [
      draw(PICTURES.flower, fills, 'art-col-picture', false),
      el('div', { class: 'art-col-swatches' }, ['#E53935', '#FB8C00', '#FDD835', '#9CCC65'].map(function (c) {
        const s = el('span');
        s.style.background = c;
        return s;
      }))
    ]);
  }

  SG.registerGame({
    key: 'colouring',
    text: 'col',
    category: 'create',
    levels: PICTURES,
    mount: mount,
    art: art,
    // The chooser shows each picture as it was left: it is the player's gallery too.
    preview: function (key) { return draw(PICTURES[key], saved(key), 'level-art level-art-col', false); },
    levelName: function (key) { return PICTURES[key][SG.lang] || PICTURES[key].en; },
    detail: function (key) {
      const n = Object.keys(saved(key)).length;
      return SG.t('col.detail', targets(PICTURES[key])) + (n ? ' ' + SG.t('col.started') : '');
    }
  });
})(window.SG);
