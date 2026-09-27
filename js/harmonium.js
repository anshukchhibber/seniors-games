// Harmonium: eight big keys marked with the sargam, सा रे ग म प ध नि सां, each with its own colour
// and a warm reed sound. Play freely, or follow the glowing key through a tune.
//
// Playing an instrument works each finger in turn. Nothing is ever wrong: another key simply plays
// its own note, and the glowing key waits. A key sounds the moment the finger lands (music cannot
// wait for the finger to lift) and holds its note for as long as it is pressed.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;
  const INK = '#1F2A44';

  // Sa to high Sa (C4 to C5). The colours run like a rainbow, so a key can be found by its colour
  // as well as by its name.
  const KEYS = [
    { hi: 'सा', en: 'Sa', freq: 261.63, color: '#E53935' },
    { hi: 'रे', en: 'Re', freq: 293.66, color: '#FB8C00' },
    { hi: 'ग', en: 'Ga', freq: 329.63, color: '#FDD835' },
    { hi: 'म', en: 'Ma', freq: 349.23, color: '#7CB342' },
    { hi: 'प', en: 'Pa', freq: 392.0, color: '#26A69A' },
    { hi: 'ध', en: 'Dha', freq: 440.0, color: '#1E88E5' },
    { hi: 'नि', en: 'Ni', freq: 493.88, color: '#8E24AA' },
    { hi: 'सां', en: 'Sa', freq: 523.25, color: '#E53935', high: true }
  ];

  // Tunes, one phrase per string: the key (0 = Sa ... 7 = high Sa), and a dash for each extra beat.
  const TUNES = {
    scale: ['0 1 2 3 4 5 6 7-', '7 6 5 4 3 2 1 0-'],
    twinkle: ['0 0 4 4 5 5 4-', '3 3 2 2 1 1 0-', '4 4 3 3 2 2 1-', '4 4 3 3 2 2 1-', '0 0 4 4 5 5 4-', '3 3 2 2 1 1 0-'],
    jingle: ['2 2 2- 2 2 2- 2 4 0 1 2---', '3 3 3 3 3 2 2 2 2 1 1 2 1- 4-', '2 2 2- 2 2 2- 2 4 0 1 2---', '3 3 3 3 3 2 2 2 2 4 4 3 1 0---']
  };

  const LEVELS = { free: {}, scale: { tune: 'scale' }, twinkle: { tune: 'twinkle' }, jingle: { tune: 'jingle' } };

  const BEAT_MS = 420;       // the pace of "Listen"
  const TAP_NOTE_MS = 380;   // how long a note sounds for a key pressed by keyboard
  const NEXT_PHRASE_MS = 700;
  const WIN_PAUSE_MS = 2200;
  const GAP = 10;

  function parse(phrase) {
    return phrase.split(' ').map(function (n) {
      return { key: parseInt(n, 10), beats: 1 + (n.match(/-/g) || []).length };
    });
  }

  function keyName(i) {
    return KEYS[i][SG.lang === 'hi' ? 'hi' : 'en'];
  }

  function mount(stage, levelKey) {
    const level = LEVELS[levelKey];
    const t = SG.t;
    const timers = SG.timers();
    const phrases = level.tune ? TUNES[level.tune].map(parse) : null;
    const tuneName = SG.t('hm.level.' + levelKey);

    let phrase, note, done, listening;
    let layoutEl, board, keyEls, stripEl, statusEl, listenBtn;

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'status hm-status', role: 'status' });
      // The phrase to play, as a row of note names: the next one ringed, the ones played ticked
      stripEl = el('div', { class: 'hm-strip', 'aria-hidden': 'true' });

      keyEls = KEYS.map(function (k, i) {
        const other = SG.lang === 'hi' ? k.en : k.hi;
        const key = el('button', { class: 'hm-key pressable' + (k.high ? ' hm-high' : ''), type: 'button', 'aria-label': keyName(i) }, [
          svg('svg', { class: 'hm-point', viewBox: '-8 -2 28 38', 'aria-hidden': 'true' }, [SG.handShape()]),
          el('span', { class: 'hm-cap', 'aria-hidden': 'true' }),
          el('span', { class: 'hm-name', 'aria-hidden': 'true', text: keyName(i) }),
          el('span', { class: 'hm-other', 'aria-hidden': 'true', text: other })
        ]);
        key.style.setProperty('--key', k.color);
        bindKey(key, i);
        return key;
      });
      board = el('div', { class: 'hm-board', role: 'group', 'aria-label': t('hm.board') }, keyEls);

      const parts = [statusEl];
      if (phrases) parts.push(stripEl);
      parts.push(el('div', { class: 'hm-board-wrap' }, [board]));
      if (phrases) {
        listenBtn = SG.iconButton('btn btn-secondary hm-listen', 'sound', t('hm.listen'));
        SG.onTap(listenBtn, listen);
        parts.push(el('div', { class: 'hm-foot' }, [listenBtn]));
      }
      layoutEl = el('div', { class: 'hm-layout' + (phrases ? '' : ' hm-free') }, parts);
      stage.appendChild(layoutEl);
    }

    // A key sounds while it is held. Only the finger that pressed it can stop it.
    function bindKey(key, i) {
      const held = {};
      key.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        try { key.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
        held[e.pointerId] = SG.sound.reed(KEYS[i].freq);
        key.classList.add('sounding');
        played(i);
      });
      function up(e) {
        if (!held[e.pointerId]) return;
        held[e.pointerId]();
        delete held[e.pointerId];
        if (!Object.keys(held).length) key.classList.remove('sounding');
      }
      key.addEventListener('pointerup', up);
      key.addEventListener('pointercancel', up);
      // Keyboard, switch access and screen readers: a short note
      key.addEventListener('click', function (e) {
        if (e.detail !== 0) return; // a real press already played on pointerdown
        const release = SG.sound.reed(KEYS[i].freq);
        key.classList.add('sounding');
        timers.later(function () { release(); key.classList.remove('sounding'); }, TAP_NOTE_MS);
        played(i);
      });
    }

    // Big keys: all eight in a row when they can be at least 64px wide, otherwise two rows of four.
    function layout() {
      if (!board) return;
      const wrap = board.parentNode;
      const top = wrap.getBoundingClientRect().top;
      const foot = layoutEl.querySelector('.hm-foot');
      const availW = wrap.clientWidth;
      const cs = getComputedStyle(board);
      const handRoom = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); // the pointing hand and the raised edge
      // Listen sits below the keys, or beside the notes on a short, wide screen (see style.css)
      const footBelow = foot && foot.getBoundingClientRect().top >= top;
      const availH = SG.bottom() - top - handRoom - (footBelow ? foot.offsetHeight + 14 : 0) - 10;
      const cols = (availW - GAP * 7) / 8 >= 64 ? 8 : 4;
      const rows = 8 / cols;
      const w = Math.floor(Math.min((availW - GAP * (cols - 1)) / cols, 130));
      const h = Math.floor(SG.clamp((availH - GAP * (rows - 1)) / rows, 72, w * 2.6));
      board.style.setProperty('--cols', cols);
      board.style.setProperty('--key-w', w + 'px');
      board.style.setProperty('--key-h', h + 'px');
    }

    function current() {
      return phrases[phrase][note];
    }

    function drawStrip() {
      stripEl.textContent = '';
      phrases[phrase].forEach(function (n, i) {
        const chip = el('span', { class: 'hm-chip' + (i < note ? ' done' : '') + (i === note && !done ? ' next' : ''), text: keyName(n.key) });
        chip.style.setProperty('--key', KEYS[n.key].color);
        stripEl.appendChild(chip);
      });
    }

    function showNext() {
      keyEls.forEach(function (k) { k.classList.remove('hm-next'); });
      if (done) return;
      const k = keyEls[current().key];
      k.getBoundingClientRect(); // restart the pointing hand's three bobs
      k.classList.add('hm-next');
    }

    function played(i) {
      if (!phrases) {
        statusEl.textContent = t('hm.played', keyName(i));
        return;
      }
      if (done || listening) return;
      const want = current().key;
      if (i !== want) {
        // Not the glowing key: it simply plays its note, and the glowing key waits
        statusEl.textContent = t('hm.other', keyName(i), keyName(want));
        return;
      }
      note++;
      if (note < phrases[phrase].length) {
        statusEl.textContent = t('hm.next', keyName(current().key));
        drawStrip();
        showNext();
        return;
      }
      // The end of a phrase
      drawStrip();
      keyEls.forEach(function (k) { k.classList.remove('hm-next'); });
      if (phrase === phrases.length - 1) {
        done = true;
        statusEl.textContent = t('hm.last', tuneName);
        timers.later(function () { SG.sound.win(); }, 500);
        timers.later(showWin, WIN_PAUSE_MS);
        return;
      }
      statusEl.textContent = t('hm.phraseDone', phrase + 2, phrases.length);
      listening = true; // a moment's pause before the next phrase, so a quick extra tap is not taken as its first note
      timers.later(function () {
        listening = false;
        phrase++;
        note = 0;
        drawStrip();
        showNext();
        statusEl.textContent = t('hm.next', keyName(current().key));
      }, NEXT_PHRASE_MS);
    }

    // Plays the phrase being learned, with its rhythm; each key lights as it sounds.
    // Only ever started by pressing "Listen".
    function listen() {
      if (done || listening) return;
      listening = true;
      statusEl.textContent = t('hm.listening');
      let at = 250;
      phrases[phrase].forEach(function (n) {
        const ms = n.beats * BEAT_MS;
        timers.later(function () {
          const release = SG.sound.reed(KEYS[n.key].freq);
          const k = keyEls[n.key];
          k.classList.add('sounding');
          timers.later(function () { release(); k.classList.remove('sounding'); }, ms * 0.85);
        }, at);
        at += ms;
      });
      timers.later(function () {
        listening = false;
        statusEl.textContent = t('hm.yourTurn', keyName(current().key));
      }, at + 150);
    }

    function showWin() {
      const panel = SG.winPanel(t('hm.win', tuneName), null, newGame, '#/harmonium/levels');
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
      phrase = 0;
      note = 0;
      done = false;
      listening = false;
      render();
      if (phrases) {
        drawStrip();
        showNext();
        statusEl.textContent = t('hm.start', tuneName, keyName(current().key));
      } else {
        statusEl.textContent = t('hm.free');
      }
      layout();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      progress: function () {
        return !phrases || done || (phrase === 0 && note === 0) ? null : t('hm.progress', tuneName);
      },
      destroy: function () {
        timers.clear();
        window.removeEventListener('resize', layout);
      },
      // for the playtest: jump to the finish screen
      finish: function () {
        timers.clear();
        showWin();
      }
    };
  }

  // A harmonium: a wooden box, bellows behind, a row of keys with coloured tops.
  // `opts.demo`: a hand presses the Pa key.
  function illustration(opts) {
    const parts = [
      // bellows
      svg('path', { d: 'M18 8H102L96 30H24Z', fill: '#E8D5BE', stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }),
      svg('path', { d: 'M22 15H98M24 22H96', stroke: '#B08B65', 'stroke-width': 2 }),
      // wooden box
      svg('rect', { x: 8, y: 30, width: 104, height: 54, rx: 7, class: 'fill-accent', stroke: INK, 'stroke-width': 2.5 }),
      svg('rect', { x: 14, y: 36, width: 92, height: 42, rx: 4, fill: '#FFFFFF', stroke: INK, 'stroke-width': 2 })
    ];
    KEYS.forEach(function (k, i) {
      const x = 16 + i * 11.2;
      parts.push(svg('rect', { x: x, y: 38, width: 10, height: 38, rx: 2, fill: '#FFFFFF', stroke: INK, 'stroke-width': 1.3 }));
      parts.push(svg('rect', { x: x, y: 38, width: 10, height: 10, rx: 2, fill: k.color, stroke: INK, 'stroke-width': 1.3 }));
    });
    if (opts && opts.demo) parts.push(SG.demoHand(65, 62, 'tap'));
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, parts);
  }

  // Level pictures: all the key colours for free play; for a tune, its first notes as steps.
  function preview(levelKey) {
    const parts = [];
    if (levelKey === 'free') {
      KEYS.forEach(function (k, i) {
        parts.push(svg('rect', { x: 4 + i * 11.5, y: 20, width: 9.5, height: 60, rx: 2.5, fill: '#FFFFFF', stroke: INK, 'stroke-width': 1.5 }));
        parts.push(svg('rect', { x: 4 + i * 11.5, y: 20, width: 9.5, height: 16, rx: 2.5, fill: k.color, stroke: INK, 'stroke-width': 1.5 }));
      });
    } else {
      parse(TUNES[levelKey][0]).slice(0, 8).forEach(function (n, i) {
        parts.push(svg('circle', { cx: 10 + i * 11.5, cy: 82 - n.key * 9, r: 5, fill: KEYS[n.key].color, stroke: INK, 'stroke-width': 1.5 }));
      });
    }
    return svg('svg', { class: 'level-art', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, parts);
  }

  SG.registerGame({
    key: 'harmonium',
    text: 'hm',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    preview: preview,
    levelName: function (key) { return SG.t('hm.level.' + key); },
    detail: function (key) { return SG.t('hm.detail.' + key); }
  });

  SG.harmonium = { tunes: TUNES, parse: parse }; // for the playtest
})(window.SG);
