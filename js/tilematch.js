// Tile Match: turn over two tiles at a time and find the matching pairs.
// No timer. Tiles that do not match stay visible for a good while before
// turning back, and tapping the next tile turns them back straight away.
(function (SG) {
  'use strict';

  const el = SG.el;

  const LEVELS = {
    easy: { label: 'Easy', detail: '8 tiles, 4 pairs', pairs: 4 },
    medium: { label: 'Medium', detail: '12 tiles, 6 pairs', pairs: 6 },
    hard: { label: 'Hard', detail: '16 tiles, 8 pairs', pairs: 8 }
  };

  // Pictures chosen to look clearly different from each other in both shape and colour.
  const SYMBOLS = [
    ['🍎', 'apple'], ['🍌', 'banana'], ['🍇', 'grapes'], ['🌻', 'sunflower'],
    ['🐟', 'fish'], ['🦋', 'butterfly'], ['🐘', 'elephant'], ['⭐', 'star'],
    ['🌙', 'moon'], ['☂️', 'umbrella'], ['🚗', 'car'], ['🏠', 'house'],
    ['🔑', 'key'], ['⏰', 'clock'], ['🌳', 'tree'], ['⚽', 'football'],
    ['🎁', 'gift'], ['🐢', 'turtle'], ['🌈', 'rainbow'], ['☕', 'cup of tea'],
    ['🐱', 'cat'], ['✈️', 'aeroplane']
  ];

  const MISMATCH_SHOW_MS = 2500;
  const DOUBLE_TAP_MS = 700; // a second tap sooner than this is treated as an accident

  function mount(stage, levelKey) {
    const level = LEVELS[levelKey];

    let tiles, first, pending, pendingSince, pendingTimer, pairsFound, turns, done;
    let timers = [];
    let wrap, board, statusEl, liveEl;

    function later(fn, ms) {
      const id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function describe(tile) {
      const where = 'Tile ' + (tile.index + 1);
      if (tile.state === 'down') return where + ', face down';
      return where + ', ' + tile.name + (tile.state === 'matched' ? ', matched' : '');
    }

    function setState(tile, state) {
      tile.state = state;
      tile.button.classList.toggle('up', state !== 'down');
      tile.button.classList.toggle('matched', state === 'matched');
      tile.button.setAttribute('aria-label', describe(tile));
      if (state === 'matched') tile.button.setAttribute('aria-disabled', 'true');
    }

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'tm-status' });
      liveEl = el('p', { class: 'sr-only', role: 'status' });
      board = el('div', { class: 'tm-board' });

      tiles.forEach(function (tile) {
        tile.button = el('button', { class: 'tm-tile', type: 'button', onclick: function () { turnOver(tile); } }, [
          el('span', { class: 'tm-face', 'aria-hidden': 'true', text: tile.symbol })
        ]);
        setState(tile, 'down');
        board.appendChild(tile.button);
      });

      wrap = el('div', { class: 'tm-board-wrap' }, [board]);
      stage.appendChild(el('div', { class: 'tm-layout' }, [statusEl, liveEl, wrap]));
      showProgress();
    }

    // Pick the rows/columns split that gives the biggest tiles for this screen.
    function layout() {
      if (!board) return;
      const top = wrap.getBoundingClientRect().top + window.pageYOffset;
      const availW = wrap.clientWidth;
      const availH = Math.max(260, window.innerHeight - top - 20);
      const gap = availW < 500 ? 10 : 16;

      let best = null;
      for (let cols = 2; cols <= tiles.length / 2; cols++) {
        if (tiles.length % cols) continue;
        const rows = tiles.length / cols;
        const size = Math.min((availW - gap * (cols - 1)) / cols, (availH - gap * (rows - 1)) / rows);
        if (!best || size > best.size) best = { cols: cols, size: size };
      }

      const size = Math.floor(SG.clamp(best.size, 64, 190));
      board.style.setProperty('--cols', best.cols);
      board.style.setProperty('--tile', size + 'px');
      board.style.setProperty('--gap', gap + 'px');
    }

    function showProgress() {
      statusEl.textContent = 'Pairs found: ' + pairsFound + ' of ' + level.pairs;
    }

    function hidePending() {
      clearTimeout(pendingTimer);
      if (!pending) return;
      pending.forEach(function (tile) { setState(tile, 'down'); });
      pending = null;
    }

    function turnOver(tile) {
      if (done) return;
      // Taps on a tile that is already showing are ignored, so a double tap does no harm.
      // The exception: once a mismatch has been on show for a moment, tapping one of
      // those two tiles picks it again as the start of the next turn.
      const repick = pending && pending.indexOf(tile) !== -1 && Date.now() - pendingSince > DOUBLE_TAP_MS;
      if (tile.state !== 'down' && !repick) return;
      hidePending();
      setState(tile, 'up');

      if (!first) {
        first = tile;
        liveEl.textContent = tile.name;
        SG.sound.tap();
        return;
      }

      const other = first;
      first = null;
      turns++;

      if (other.symbol !== tile.symbol) {
        pending = [other, tile];
        pendingSince = Date.now();
        pendingTimer = later(hidePending, MISMATCH_SHOW_MS);
        liveEl.textContent = tile.name + '. Not a pair.';
        SG.sound.tap();
        return;
      }

      setState(other, 'matched');
      setState(tile, 'matched');
      pairsFound++;
      showProgress();
      if (pairsFound === level.pairs) {
        done = true;
        liveEl.textContent = tile.name + '. A pair! That is all of them.';
        SG.sound.win();
        later(showWin, 1400);
      } else {
        liveEl.textContent = tile.name + '. A pair!';
        SG.sound.found();
      }
    }

    function showWin() {
      const panel = SG.winPanel(
        'You matched all ' + level.pairs + ' pairs in ' + turns + ' turns.',
        newGame,
        '#/tilematch'
      );
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      panel.querySelector('.win-title').focus();
    }

    function newGame() {
      clearTimers();
      const chosen = SG.shuffle(SYMBOLS).slice(0, level.pairs);
      tiles = SG.shuffle(chosen.concat(chosen)).map(function (entry, index) {
        return { index: index, symbol: entry[0], name: entry[1], state: 'down', button: null };
      });
      first = null;
      pending = null;
      pairsFound = 0;
      turns = 0;
      done = false;
      render();
      layout();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      destroy: function () {
        clearTimers();
        window.removeEventListener('resize', layout);
      }
    };
  }

  SG.tilematch = { levels: LEVELS, mount: mount };
})(window.SG);
