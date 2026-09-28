// Number Hunt: numbered kites fly all over a blue sky; tap them in order - 1, 2, 3...
// It exercises scanning, attention and counting, and makes the hand reach all over the screen.
//
// No timer. Tapping some other number is never "wrong": the status line just says which number
// that was and which one to look for. "Show Me" circles the next number for as long as needed.
(function (SG) {
  'use strict';

  const el = SG.el;

  const LEVELS = {
    easy: { count: 12 },
    medium: { count: 20 },
    hard: { count: 30 }
  };

  // Each token sits somewhere inside its own cell of an invisible grid, so they look scattered
  // but can never overlap each other or run off the screen.
  const MIN_CELL = 78;   // px. If the full set of numbers would need smaller cells than this on
  const MAX_CELL = 170;  //     the player's screen, the game uses fewer numbers instead.
  const MAX_TOKEN = 128;
  const TOKEN_SHARE = 0.84; // of the cell; the rest is room to scatter
  const SMALLER_SETS = [24, 20, 16, 12, 9];
  const GAP = 10;
  const WIN_PAUSE_MS = 2200;
  const KITE_COLOURS = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA', '#EC407A', '#00ACC1'];

  // A patang: a diamond with its cross-sticks, and a tail with little bows. The number sits on a
  // white patch in the middle (in the button's own text, so it is read out too).
  function kite(colour) {
    const svg = SG.svg;
    return svg('svg', { class: 'nh-kite', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, [
      svg('path', { class: 'nh-tail', d: 'M50 78C40 84 60 88 50 94', fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      svg('path', { d: 'M44 86l-6-3 1 6zM56 91l6-3-1 6z', fill: colour, stroke: '#1F2A44', 'stroke-width': 1.5 }),
      svg('path', { class: 'nh-diamond', d: 'M50 4L90 41 50 78 10 41Z', fill: colour, 'stroke-width': 4, 'stroke-linejoin': 'round' }),
      svg('path', { d: 'M50 4V78M10 41H90', stroke: '#1F2A44', 'stroke-opacity': 0.3, 'stroke-width': 2.5 })
    ]);
  }
  const SIDE_BY_SIDE = '(min-width: 640px) and (orientation: landscape)'; // keep in step with style.css
  const SIDE_WIDTH = 340 + 28;

  function mount(stage, levelKey) {
    const level = LEVELS[levelKey];
    const t = SG.t;

    let count, next, tiles, hinted, done;
    const timers = SG.timers();
    let layoutEl, wrap, board, foot, targetEl, statusEl;

    function room() {
      const sideBySide = window.matchMedia(SIDE_BY_SIDE).matches;
      const top = wrap.getBoundingClientRect().top + window.pageYOffset;
      return {
        w: layoutEl.clientWidth - (sideBySide ? SIDE_WIDTH : 0) - 20, // the sky's border round the board
        h: SG.bottom() - top - (sideBySide ? 0 : foot.offsetHeight + 12) - 30
      };
    }

    function renderFrame() {
      stage.textContent = '';
      targetEl = el('span', { class: 'nh-target-number' });
      // Always two lines tall, so a longer message never pushes the numbers down.
      statusEl = el('p', { class: 'status nh-status', role: 'status' });
      const info = el('section', { class: 'nh-info' }, [
        // The number to find, on a kite just like the ones in the sky
        el('p', { class: 'nh-target' }, [el('span', { class: 'nh-target-label', text: t('nh.find') }),
          el('span', { class: 'nh-target-kite' }, [kite('#FDD835'), targetEl])]),
        statusEl
      ]);

      board = el('div', { class: 'nh-board', role: 'group', 'aria-label': t('nh.board') });
      wrap = el('div', { class: 'nh-board-wrap' }, [board]);

      const hintBtn = SG.iconButton('btn btn-secondary nh-hint', 'bulb', t('nh.hint'));
      SG.onTap(hintBtn, hint);
      foot = el('section', { class: 'nh-foot' }, [hintBtn]);

      layoutEl = el('div', { class: 'nh-layout' }, [info, wrap, foot]);
      stage.appendChild(layoutEl);
    }

    // The level's full set of numbers if this screen can show them at a comfortable size;
    // otherwise the biggest smaller set that can. (Decided once per game - never mid-game.)
    function chooseCount() {
      const space = room();
      if (space.w <= 0 || space.h <= 0) return level.count;
      const options = [level.count].concat(SMALLER_SETS.filter(function (n) { return n < level.count; }));
      for (let i = 0; i < options.length; i++) {
        if (SG.bestGrid(options[i], space.w, space.h, GAP).cell >= MIN_CELL) return options[i];
      }
      return options[options.length - 1];
    }

    function renderTiles() {
      const numbers = [];
      for (let n = 1; n <= count; n++) numbers.push(n);
      tiles = {};
      SG.shuffle(numbers).forEach(function (n, i) {
        const button = el('button', { class: 'nh-tile pressable', type: 'button' }, [
          kite(KITE_COLOURS[SG.rand(KITE_COLOURS.length)]),
          el('span', { class: 'nh-num', text: String(n) })
        ]);
        // Where in its cell this token sits, from -1 (one edge) to 1 (the other). Fixed for the game.
        const tile = { n: n, i: i, button: button, done: false, ox: Math.random() * 2 - 1, oy: Math.random() * 2 - 1 };
        SG.onTap(button, function () { tapTile(tile); });
        tiles[n] = tile;
        board.appendChild(button);
      });
    }

    function layout() {
      if (!board) return;
      const space = room();
      const grid = SG.bestGrid(count, space.w, space.h, GAP);
      const cell = Math.floor(SG.clamp(grid.cell, 56, MAX_CELL));
      const token = Math.min(Math.round(cell * TOKEN_SHARE), MAX_TOKEN);
      const slack = (cell - token) / 2;
      board.style.width = (grid.cols * cell + (grid.cols - 1) * GAP) + 'px';
      board.style.height = (grid.rows * cell + (grid.rows - 1) * GAP) + 'px';
      board.style.setProperty('--token', token + 'px');
      Object.keys(tiles).forEach(function (n) {
        const tile = tiles[n];
        const col = tile.i % grid.cols, row = Math.floor(tile.i / grid.cols);
        tile.button.style.left = Math.round(col * (cell + GAP) + slack * (1 + tile.ox)) + 'px';
        tile.button.style.top = Math.round(row * (cell + GAP) + slack * (1 + tile.oy)) + 'px';
      });
    }

    function tapTile(tile) {
      if (done || tile.done) return;

      if (tile.n !== next) {
        // Not the next number. Nothing is marked wrong - the player is simply told what they
        // pressed and what to look for, in the same calm voice as everything else.
        statusEl.textContent = t('nh.other', tile.n, next);
        SG.track.count('miss');
        SG.sound.tap();
        return;
      }

      tile.done = true;
      tile.button.classList.add('done');
      tile.button.classList.remove('hinting');
      tile.button.setAttribute('aria-label', t('nh.doneTile', tile.n));
      tile.button.setAttribute('aria-disabled', 'true');
      if (hinted === tile) hinted = null;
      next++;

      if (next > count) {
        done = true;
        statusEl.textContent = t('nh.last', count);
        SG.sound.win();
        timers.later(showWin, WIN_PAUSE_MS);
        return;
      }
      targetEl.textContent = String(next);
      statusEl.textContent = t('nh.good', next - 1, count);
      SG.sound.good(next - 2);
    }

    // Circles the next number. Like every hint in the app it simply stays until it is used.
    function hint() {
      if (done) return;
      SG.track.count('hint');
      hinted = tiles[next];
      hinted.button.classList.remove('hinting');
      hinted.button.getBoundingClientRect(); // restart the three gentle pulses if asked again
      hinted.button.classList.add('hinting');
      statusEl.textContent = t('nh.hintMsg', next);
    }

    function showWin() {
      const trophies = el('div', { class: 'nh-trophies panel-trophies', 'aria-hidden': 'true' }, Object.keys(tiles).map(function (n) {
        return el('span', { class: 'nh-trophy' }, [kite(KITE_COLOURS[n % KITE_COLOURS.length]), el('span', { class: 'nh-num', text: n })]);
      }));
      const panel = SG.winPanel(t('nh.win', count), trophies, newGame, '#/numbers/levels');
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
      next = 1;
      hinted = null;
      done = false;
      renderFrame();
      targetEl.textContent = '1'; // fill the header first: the space left for the grid is measured next
      count = chooseCount();
      renderTiles();
      statusEl.textContent = t('nh.start', count);
      layout();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      progress: function () {
        return done || next === 1 ? null : t('nh.progress', next - 1, count);
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

  // Numbered kites in a blue sky: 1 and 2 found, 3 circled as the one to find.
  // `opts.demo`: a hand taps the 3.
  function illustration(opts) {
    const svg = SG.svg;
    const parts = [svg('rect', { x: 2, y: 2, width: 116, height: 86, rx: 12, fill: '#CBE7FD' }),
      svg('ellipse', { cx: 96, cy: 76, rx: 16, ry: 6, fill: '#FFFFFF' }), svg('ellipse', { cx: 22, cy: 14, rx: 13, ry: 5, fill: '#FFFFFF' })];
    function flyer(x, y, n, colour, state) {
      const g = svg('g', { transform: 'translate(' + (x - 16) + ' ' + (y - 14) + ') scale(0.32)', opacity: state === 'done' ? 0.45 : 1 }, [kite(colour)]);
      g.firstChild.setAttribute('class', 'nh-kite');
      parts.push(g);
      if (state === 'find') parts.push(svg('circle', { cx: x, cy: y - 1, r: 17, fill: 'none', class: 'stroke-deep', 'stroke-width': 2.5, 'stroke-dasharray': '4.5 3.5' }));
      parts.push(svg('circle', { cx: x, cy: y - 1, r: 6.5, fill: '#FFFFFF', stroke: '#1F2A44', 'stroke-width': 1.2 }));
      parts.push(svg('text', { x: x, y: y - 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 9, 'font-weight': 800, fill: '#1F2A44' }, [document.createTextNode(String(n))]));
    }
    flyer(22, 42, 1, '#43A047', 'done');
    flyer(48, 70, 2, '#FB8C00', 'done');
    flyer(98, 22, 4, '#8E24AA');
    flyer(94, 56, 5, '#E53935');
    flyer(62, 30, 3, '#1E88E5', 'find');
    if (opts && opts.demo) parts.push(SG.demoHand(64, 34, 'tap'));
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, parts);
  }

  // One round dot per number.
  function preview(levelKey) {
    return SG.squares(LEVELS[levelKey].count, 'level-art-tokens');
  }

  SG.registerGame({
    key: 'numbers',
    text: 'nh',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    preview: preview,
    detail: function (levelKey) { return SG.t('nh.level', LEVELS[levelKey].count); }
  });
})(window.SG);
