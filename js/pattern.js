// Repeat the Pattern: big pads light up one after another; tap them back in the same order.
// Each pattern is one step longer than the last. It exercises working memory and attention.
//
// Nothing is ever "wrong": after a slip the player is simply invited to watch it again, as often
// as they like. The pads only light up when the player has pressed "Watch" - nothing moves by itself.
// Every pad has its own shape and note as well as its own colour.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;

  const SHAPES = {
    circle: function () { return svg('circle', { cx: 12, cy: 12, r: 8.2 }); },
    square: function () { return svg('rect', { x: 4.2, y: 4.2, width: 15.6, height: 15.6, rx: 2 }); },
    triangle: function () { return svg('path', { d: 'M12 3.2L21.2 19.6H2.8z' }); },
    star: function () { return svg('path', { d: 'M12 2.6l2.9 6.1 6.7.9-4.9 4.6 1.2 6.7L12 17.7l-5.9 3.2 1.2-6.7-4.9-4.6 6.7-.9z' }); },
    heart: function () { return svg('path', { d: 'M12 20.5C5 15.5 2.5 12 2.5 8.6c0-2.8 2.2-4.8 4.7-4.8 1.9 0 3.6 1.1 4.8 2.8 1.2-1.7 2.9-2.8 4.8-2.8 2.5 0 4.7 2 4.7 4.8 0 3.4-2.5 6.9-9.5 11.9z' }); },
    diamond: function () { return svg('path', { d: 'M12 2.4L21.4 12 12 21.6 2.6 12z' }); }
  };

  // `ink`: the shape is drawn dark on this pad, because white on yellow is too faint.
  const PADS = [
    { shape: 'circle', color: '#C62828', freq: 261.63, en: 'Red circle', hi: 'लाल गोला' },
    { shape: 'square', color: '#1D4E89', freq: 329.63, en: 'Blue square', hi: 'नीला चौकोर' },
    { shape: 'triangle', color: '#2E7D32', freq: 392.0, en: 'Green triangle', hi: 'हरा तिकोना' },
    { shape: 'star', color: '#F5B301', freq: 523.25, en: 'Yellow star', hi: 'पीला तारा', ink: true },
    { shape: 'heart', color: '#7B1FA2', freq: 293.66, en: 'Purple heart', hi: 'बैंगनी दिल' },
    { shape: 'diamond', color: '#C4500F', freq: 440.0, en: 'Orange diamond', hi: 'नारंगी हीरा' }
  ];

  // `from`/`to`: the first and the longest pattern. `on`/`off`: how long each pad stays lit, and the pause after it.
  const LEVELS = {
    easy: { pads: 4, from: 2, to: 5, on: 1100, off: 500 },
    medium: { pads: 4, from: 3, to: 6, on: 950, off: 450 },
    hard: { pads: 6, from: 3, to: 7, on: 850, off: 400 }
  };

  const FIRST_DELAY_MS = 600;  // a moment after pressing Watch, before the first pad lights
  const TAP_LIGHT_MS = 350;    // how long a pad stays lit after the player taps it
  const DOUBLE_TAP_MS = 600;   // a second tap on the same pad sooner than this is an accident
  const WIN_PAUSE_MS = 2200;
  const GAP = 16;

  function padIcon(pad) {
    return svg('svg', { class: 'pt-shape', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [SHAPES[pad.shape]()]);
  }

  function mount(stage, levelKey) {
    const level = LEVELS[levelKey];
    const t = SG.t;
    const pads = PADS.slice(0, level.pads);
    const timers = SG.timers();

    // phase: 'ready' (waiting for Watch), 'showing', 'input', 'done'
    let sequence, length, entered, phase, lastTap, lastPad, slipped;
    let layoutEl, board, padEls, dotsEl, statusEl, watchBtn;

    function randomPad(except) {
      let i;
      do { i = SG.rand(pads.length); } while (i === except); // never the same pad twice running
      return i;
    }

    // A brand-new pattern of `length` pads (not the last one with one more on the end)
    function fresh() {
      sequence = [];
      while (sequence.length < length) sequence.push(randomPad(sequence[sequence.length - 1]));
    }

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'status pt-status', role: 'status' });
      dotsEl = el('div', { class: 'pt-dots', 'aria-hidden': 'true' });

      padEls = pads.map(function (pad, i) {
        const button = el('button', {
          class: 'pt-pad pressable' + (pad.ink ? ' pt-ink' : ''),
          type: 'button',
          'aria-label': pad[SG.lang] || pad.en
        }, [padIcon(pad)]);
        button.style.setProperty('--pad', pad.color);
        SG.onTap(button, function () { tapPad(i); });
        return button;
      });
      board = el('div', { class: 'pt-board', role: 'group', 'aria-label': t('pt.board') }, padEls);

      watchBtn = SG.iconButton('btn btn-lg pt-watch', 'eye', t('pt.watch'));
      SG.onTap(watchBtn, watch);

      layoutEl = el('div', { class: 'pt-layout' }, [
        el('div', { class: 'pt-info' }, [statusEl, dotsEl]),
        el('div', { class: 'pt-board-wrap' }, [board]),
        el('div', { class: 'pt-foot' }, [watchBtn])
      ]);
      stage.appendChild(layoutEl);
    }

    // The pads get as big as the screen allows, with the Watch button still in view. On a wide,
    // short screen they go in one row, and Watch moves beside them (see style.css).
    function layout() {
      if (!board) return;
      const wrap = board.parentNode;
      const foot = layoutEl.lastChild;
      const top = wrap.getBoundingClientRect().top;
      const beside = foot.getBoundingClientRect().top < wrap.getBoundingClientRect().bottom - 1;
      const availW = wrap.clientWidth;
      const availH = SG.bottom() - top - (beside ? 0 : foot.offsetHeight + 16) - 10;
      let grid = null;
      for (let cols = 1; cols <= pads.length; cols++) {
        if (pads.length % cols) continue; // only full rows
        const rows = pads.length / cols;
        const cell = Math.min((availW - GAP * (cols - 1)) / cols, (availH - GAP * (rows - 1)) / rows);
        if (!grid || cell > grid.cell) grid = { cols: cols, cell: cell };
      }
      const size = Math.floor(SG.clamp(grid.cell, 72, 220));
      board.style.setProperty('--cols', grid.cols);
      board.style.setProperty('--pad-size', size + 'px');
      board.style.setProperty('--gap', GAP + 'px');
    }

    // One dot per step of the pattern: a ring still to do, a solid dot once tapped.
    function drawDots() {
      dotsEl.textContent = '';
      for (let i = 0; i < length; i++) dotsEl.appendChild(el('span', { class: i < entered ? 'on' : '' }));
    }

    // `step`: while the pattern is shown, each pad also shows which step it is (1, 2, 3...)
    function light(i, ms, step) {
      const pad = padEls[i];
      pad.classList.add('lit');
      if (step) pad.setAttribute('data-step', step);
      SG.sound.pad(pads[i].freq);
      timers.later(function () {
        pad.classList.remove('lit');
        pad.removeAttribute('data-step');
      }, ms);
    }

    function setWatch(text, show) {
      watchBtn.querySelector('.btn-text').textContent = text;
      watchBtn.style.visibility = show ? '' : 'hidden'; // keeps its space, so nothing moves
    }

    // Plays the whole pattern once. Only ever started by the player pressing Watch.
    function watch() {
      if (phase === 'showing' || phase === 'done') return;
      timers.clear();
      padEls.forEach(function (pad) { pad.classList.remove('lit'); });
      phase = 'showing';
      entered = 0;
      slipped = false;
      drawDots();
      layoutEl.classList.add('pt-showing');
      setWatch(t('pt.watchAgain'), false);
      statusEl.textContent = t('pt.watching');

      let at = FIRST_DELAY_MS;
      sequence.forEach(function (i, k) {
        timers.later(function () {
          light(i, level.on, k + 1);
          dotsEl.children[k].classList.add('shown'); // the row of dots counts the steps as they are shown
        }, at);
        at += level.on + level.off;
      });
      timers.later(function () {
        phase = 'input';
        layoutEl.classList.remove('pt-showing');
        setWatch(t('pt.watchAgain'), true);
        statusEl.textContent = t('pt.yourTurn', length);
      }, at);
    }

    function tapPad(i) {
      if (phase === 'ready' || phase === 'done') {
        if (phase === 'ready') {
          light(i, TAP_LIGHT_MS); // pads can always be tried out - they just play their note
          statusEl.textContent = t('pt.start');
        }
        return;
      }
      if (phase === 'showing') return; // the pattern is still being shown; a stray touch changes nothing
      if (slipped) {
        light(i, TAP_LIGHT_MS);
        return;
      }
      const now = Date.now();
      if (i === lastPad && now - lastTap < DOUBLE_TAP_MS) return;
      lastPad = i;
      lastTap = now;
      light(i, TAP_LIGHT_MS);

      if (sequence[entered] !== i) {
        // Not a failure - just an invitation to see it again.
        slipped = true;
        statusEl.textContent = t('pt.slip');
        SG.track.count('miss');
        return;
      }

      entered++;
      drawDots();
      if (entered < length) {
        statusEl.textContent = t('pt.step', entered, length);
        return;
      }

      if (length >= level.to) {
        phase = 'done';
        setWatch(t('pt.watch'), false);
        statusEl.textContent = t('pt.last', length);
        timers.later(function () { SG.sound.win(); }, TAP_LIGHT_MS);
        timers.later(showWin, WIN_PAUSE_MS);
        return;
      }
      length++;
      fresh();
      phase = 'ready';
      setWatch(t('pt.watch'), true);
      statusEl.textContent = t('pt.roundDone', length);
      timers.later(function () { SG.sound.found(); }, TAP_LIGHT_MS);
    }

    function showWin() {
      const panel = SG.winPanel(t('pt.win', level.to), null, newGame, '#/pattern/levels');
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
      length = level.from;
      fresh();
      entered = 0;
      phase = 'ready';
      slipped = false;
      lastPad = null;
      lastTap = 0;
      render();
      drawDots();
      statusEl.textContent = t('pt.start');
      layout();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      progress: function () {
        return phase === 'done' || length === level.from ? null : t('pt.progress', length);
      },
      destroy: function () {
        timers.clear();
        window.removeEventListener('resize', layout);
      },
      // for the playtest: the pattern being played, and a jump to the finish screen
      peek: function () { return sequence.slice(); },
      finish: function () {
        timers.clear();
        showWin();
      }
    };
  }

  // Four pads, one of them lit, with a little burst of light beside it.
  // `opts.demo`: a hand taps the lit pad.
  function illustration(opts) {
    const INK = '#1F2A44';
    const parts = [];
    PADS.slice(0, 4).forEach(function (pad, i) {
      const x = 19 + (i % 2) * 44, y = 4 + Math.floor(i / 2) * 42, lit = i === 2;
      parts.push(svg('rect', { x: x, y: y + 3.5, width: 38, height: 38, rx: 10, fill: INK }));
      parts.push(svg('rect', { x: x, y: y, width: 38, height: 38, rx: 10, fill: lit ? '#FFFFFF' : pad.color, stroke: lit ? INK : pad.color, 'stroke-width': 2.5 }));
      if (lit) parts.push(svg('rect', { x: x + 4, y: y + 4, width: 30, height: 30, rx: 7, fill: 'none', stroke: pad.color, 'stroke-width': 3 }));
      parts.push(svg('svg', { x: x + 8, y: y + 8, width: 22, height: 22, viewBox: '0 0 24 24', fill: lit ? pad.color : (pad.ink ? INK : '#FFFFFF') }, [SHAPES[pad.shape]()]));
    });
    parts.push(svg('path', { d: 'M13 52L6 47M11 65H3M13 78L6 83', stroke: '#F5B301', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
    if (opts && opts.demo) parts.push(SG.demoHand(40, 68, 'tap'));
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, parts);
  }

  // Four or six pads, with a row of dots for how long the patterns get.
  function preview(levelKey) {
    const level = LEVELS[levelKey];
    const box = el('div', { class: 'level-art level-art-pt', 'aria-hidden': 'true' });
    const grid = el('div', { class: 'level-art-pads' + (level.pads === 6 ? ' six' : '') });
    PADS.slice(0, level.pads).forEach(function (pad) {
      const span = el('span');
      span.style.background = pad.color;
      grid.appendChild(span);
    });
    const dots = el('div', { class: 'level-art-dots' });
    for (let i = 0; i < level.to; i++) dots.appendChild(el('span'));
    box.appendChild(grid);
    box.appendChild(dots);
    return box;
  }

  SG.registerGame({
    key: 'pattern',
    text: 'pt',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    preview: preview,
    detail: function (levelKey) { return SG.t('pt.level.' + levelKey); }
  });
})(window.SG);
