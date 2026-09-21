// Number Hunt: the numbers are scattered over a grid; tap them in order - 1, 2, 3...
// It exercises scanning, attention and counting, and makes the hand reach all over the screen.
//
// No timer. Tapping some other number is never "wrong": the status line just says which number
// that was and which one to look for. "Show Me" circles the next number for as long as needed.
(function (SG) {
  'use strict';

  const el = SG.el;

  const LEVELS = {
    easy: { count: 16 },
    medium: { count: 36 },
    hard: { count: 100 }
  };

  const MIN_CELL = 50;  // px. If the full set of numbers would need smaller squares than this on
  const MAX_CELL = 130; //     the player's screen, the game uses fewer numbers instead.
  const SMALLER_SETS = [80, 64, 60, 50, 48, 40, 36, 30, 25, 20, 16, 12, 9];
  const GAP = 8;
  const WIN_PAUSE_MS = 2200;
  const SIDE_BY_SIDE = '(min-width: 820px) and (orientation: landscape)'; // keep in step with style.css
  const SIDE_WIDTH = 340 + 28;

  // The rows/columns split that gives the biggest squares in a space of w x h.
  function bestGrid(count, w, h) {
    let best = null;
    for (let cols = 2; cols <= count; cols++) {
      const rows = Math.ceil(count / cols);
      const cell = Math.min((w - GAP * (cols - 1)) / cols, (h - GAP * (rows - 1)) / rows);
      const score = cell + (count % cols === 0 ? 0.5 : 0); // prefer a full last row when it costs nothing
      if (!best || score > best.score) best = { cols: cols, cell: cell, score: score };
    }
    return best;
  }

  function mount(stage, levelKey, hooks) {
    const level = LEVELS[levelKey];
    const t = SG.t;
    hooks = hooks || {};

    let count, next, tiles, hinted, done;
    let timers = [];
    let layoutEl, wrap, board, foot, targetEl, statusEl;

    function later(fn, ms) {
      timers.push(setTimeout(fn, ms));
    }

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function room() {
      const sideBySide = window.matchMedia(SIDE_BY_SIDE).matches;
      const top = wrap.getBoundingClientRect().top + window.pageYOffset;
      return {
        w: layoutEl.clientWidth - (sideBySide ? SIDE_WIDTH : 0),
        h: window.innerHeight - top - (sideBySide ? 0 : foot.offsetHeight + 16) - 24
      };
    }

    function renderFrame() {
      stage.textContent = '';
      targetEl = el('span', { class: 'nh-target-number' });
      // Always two lines tall, so a longer message never pushes the numbers down.
      statusEl = el('p', { class: 'status nh-status', role: 'status' });
      const info = el('section', { class: 'nh-info' }, [
        el('p', { class: 'nh-target' }, [el('span', { class: 'nh-target-label', text: t('nh.find') }), targetEl]),
        statusEl
      ]);

      board = el('div', { class: 'nh-board', role: 'group', 'aria-label': t('nh.board') });
      wrap = el('div', { class: 'nh-board-wrap' }, [board]);

      const hintBtn = el('button', { class: 'btn btn-secondary nh-hint', type: 'button', text: t('nh.hint') });
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
        if (bestGrid(options[i], space.w, space.h).cell >= MIN_CELL) return options[i];
      }
      return options[options.length - 1];
    }

    function renderTiles() {
      const numbers = [];
      for (let n = 1; n <= count; n++) numbers.push(n);
      tiles = {};
      SG.shuffle(numbers).forEach(function (n) {
        const button = el('button', { class: 'nh-tile', type: 'button', text: String(n) });
        const tile = { n: n, button: button, done: false };
        SG.onTap(button, function () { tapTile(tile); });
        tiles[n] = tile;
        board.appendChild(button);
      });
    }

    function layout() {
      if (!board) return;
      const space = room();
      const grid = bestGrid(count, space.w, space.h);
      const cell = Math.floor(SG.clamp(grid.cell, 40, MAX_CELL));
      board.style.setProperty('--cols', grid.cols);
      board.style.setProperty('--cell', cell + 'px');
      board.style.setProperty('--gap', GAP + 'px');
    }

    function tapTile(tile) {
      if (done || tile.done) return;

      if (tile.n !== next) {
        // Not the next number. Nothing is marked wrong - the player is simply told what they
        // pressed and what to look for, in the same calm voice as everything else.
        statusEl.textContent = t('nh.other', tile.n, next);
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
        later(showWin, WIN_PAUSE_MS);
        return;
      }
      targetEl.textContent = String(next);
      statusEl.textContent = t('nh.good', next - 1, count);
      if ((next - 1) % 10 === 0) SG.sound.found();
      else SG.sound.step();
    }

    // Circles the next number. Like every hint in the app it simply stays until it is used.
    function hint() {
      if (done) return;
      hinted = tiles[next];
      hinted.button.classList.remove('hinting');
      hinted.button.getBoundingClientRect(); // restart the three gentle pulses if asked again
      hinted.button.classList.add('hinting');
      statusEl.textContent = t('nh.hintMsg', next);
    }

    function showWin() {
      const panel = SG.winPanel(t('nh.win', count), null, newGame, '#/numbers');
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      if (hooks.onWin) hooks.onWin();
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      clearTimers();
      next = 1;
      hinted = null;
      done = false;
      renderFrame();
      targetEl.textContent = '1'; // fill the header first: the space left for the grid is measured next
      count = chooseCount();
      renderTiles();
      statusEl.textContent = t('nh.start', count);
      layout();
      if (hooks.onStart) hooks.onStart();
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
        clearTimers();
        window.removeEventListener('resize', layout);
      }
    };
  }

  SG.numbers = {
    levels: LEVELS,
    mount: mount,
    detail: function (levelKey) { return SG.t('nh.level', LEVELS[levelKey].count); }
  };
})(window.SG);
