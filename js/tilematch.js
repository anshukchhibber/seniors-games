// Tile Match: turn over two tiles at a time and find the matching pairs.
// No timer of any kind. Two tiles that do not match simply stay showing until
// the player taps the next tile, and the status line always says in words what
// just happened and what to do next.
(function (SG) {
  'use strict';

  const el = SG.el;

  const LEVELS = {
    easy: { pairs: 4 },
    medium: { pairs: 6 },
    hard: { pairs: 8 }
  };

  // Each picture: { pic, en, hi, group?, newer? }.
  //   group - with low vision a picture is matched by its colour and outline, so two from the same
  //           look-alike group are never dealt into one game.
  //   newer - an emoji that older tablets cannot draw; it is quietly left out where it would show
  //           as an empty box. (Every picture is also named in the status line.)
  const CLASSIC = [
    { pic: '🍎', en: 'Apple', hi: 'सेब' }, { pic: '🍌', en: 'Banana', hi: 'केला' },
    { pic: '🍇', en: 'Grapes', hi: 'अंगूर' }, { pic: '🌻', en: 'Sunflower', hi: 'सूरजमुखी', group: 'yellow burst' },
    { pic: '🐟', en: 'Fish', hi: 'मछली' }, { pic: '🦋', en: 'Butterfly', hi: 'तितली' },
    { pic: '🐘', en: 'Elephant', hi: 'हाथी' }, { pic: '⭐', en: 'Star', hi: 'तारा', group: 'yellow burst' },
    { pic: '☂️', en: 'Umbrella', hi: 'छाता' }, { pic: '🚗', en: 'Car', hi: 'कार' },
    { pic: '🏠', en: 'House', hi: 'घर' }, { pic: '⏰', en: 'Clock', hi: 'घड़ी' },
    { pic: '🌳', en: 'Tree', hi: 'पेड़', group: 'green mass' }, { pic: '⚽', en: 'Football', hi: 'फ़ुटबॉल' },
    { pic: '🎁', en: 'Gift', hi: 'उपहार' }, { pic: '🐢', en: 'Turtle', hi: 'कछुआ', group: 'green mass' },
    { pic: '🌈', en: 'Rainbow', hi: 'इंद्रधनुष' }, { pic: '☕', en: 'Cup of tea', hi: 'चाय' },
    { pic: '🐱', en: 'Cat', hi: 'बिल्ली' }, { pic: '✈️', en: 'Aeroplane', hi: 'हवाई जहाज़' }
  ];

  // Everyday sights for an Indian player. Used when the app is in Hindi.
  const INDIAN = [
    { pic: '🥭', en: 'Mango', hi: 'आम', group: 'yellow fruit' }, { pic: '🍌', en: 'Banana', hi: 'केला' },
    { pic: '🥥', en: 'Coconut', hi: 'नारियल' }, { pic: '🌶️', en: 'Chilli', hi: 'मिर्च' },
    { pic: '🍋', en: 'Lemon', hi: 'नींबू', group: 'yellow fruit' }, { pic: '☕', en: 'Cup of tea', hi: 'चाय' },
    { pic: '🐘', en: 'Elephant', hi: 'हाथी' }, { pic: '🐅', en: 'Tiger', hi: 'बाघ' },
    { pic: '🦚', en: 'Peacock', hi: 'मोर', group: 'green bird' }, { pic: '🦜', en: 'Parrot', hi: 'तोता', group: 'green bird' },
    { pic: '🐄', en: 'Cow', hi: 'गाय' }, { pic: '🐒', en: 'Monkey', hi: 'बंदर' },
    { pic: '🐪', en: 'Camel', hi: 'ऊँट' }, { pic: '🐟', en: 'Fish', hi: 'मछली' },
    { pic: '🦋', en: 'Butterfly', hi: 'तितली' }, { pic: '🌳', en: 'Tree', hi: 'पेड़' },
    { pic: '🚂', en: 'Train', hi: 'रेलगाड़ी' }, { pic: '🚲', en: 'Bicycle', hi: 'साइकिल' },
    { pic: '🛺', en: 'Auto rickshaw', hi: 'ऑटो रिक्शा', newer: true }, { pic: '🏏', en: 'Cricket bat', hi: 'क्रिकेट का बल्ला' },
    { pic: '🪁', en: 'Kite', hi: 'पतंग', newer: true }, { pic: '🪔', en: 'Lamp', hi: 'दीया', newer: true },
    { pic: '🪷', en: 'Lotus', hi: 'कमल', newer: true }, { pic: '🥁', en: 'Drum', hi: 'ढोल' },
    { pic: '🏠', en: 'House', hi: 'घर' }, { pic: '⭐', en: 'Star', hi: 'तारा', group: 'yellow burst' },
    { pic: '🌻', en: 'Sunflower', hi: 'सूरजमुखी', group: 'yellow burst' }, { pic: '☂️', en: 'Umbrella', hi: 'छाता' },
    { pic: '⏰', en: 'Clock', hi: 'घड़ी' }
  ];

  const SETS = { en: CLASSIC, hi: INDIAN };
  const drawable = {}; // per picture set, worked out once

  const DOUBLE_TAP_MS = 700; // a second tap sooner than this is treated as an accident
  const WIN_PAUSE_MS = 2200;

  function pickSymbols(count) {
    const lang = SETS[SG.lang] ? SG.lang : 'en';
    if (!drawable[lang]) {
      drawable[lang] = SETS[lang].filter(function (entry) { return !entry.newer || SG.canDraw(entry.pic); });
    }
    const groups = {};
    return SG.shuffle(drawable[lang]).filter(function (entry) {
      if (entry.group && groups[entry.group]) return false;
      if (entry.group) groups[entry.group] = true;
      return true;
    }).slice(0, count);
  }

  function mount(stage, levelKey, hooks) {
    const level = LEVELS[levelKey];
    const t = SG.t;
    hooks = hooks || {};

    let tiles, first, pending, pendingSince, pairsFound, turns, done;
    let timers = [];
    let layoutEl, wrap, board, statusEl;

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
      const where = t('tm.tile', tile.index + 1);
      if (tile.state === 'down') return where + ', ' + t('tm.down');
      return where + ', ' + tile.name + (tile.state === 'matched' ? ', ' + t('tm.matched') : '');
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
      // Always two lines tall, so a longer message can never push the tiles down.
      statusEl = el('p', { class: 'status tm-status', role: 'status' });
      board = el('div', { class: 'tm-board' });

      tiles.forEach(function (tile) {
        tile.button = el('button', { class: 'tm-tile', type: 'button' }, [
          el('span', { class: 'tm-face', 'aria-hidden': 'true', text: tile.symbol })
        ]);
        SG.onTap(tile.button, function () { turnOver(tile); });
        setState(tile, 'down');
        board.appendChild(tile.button);
      });

      wrap = el('div', { class: 'tm-board-wrap' }, [board]);
      layoutEl = el('div', { class: 'tm-layout' }, [statusEl, wrap]);
      stage.appendChild(layoutEl);
      statusEl.textContent = t('tm.start', level.pairs);
    }

    // Pick the rows/columns split that gives the biggest tiles for this screen, then sit the
    // game in the middle of the space - the top of a tablet is the hardest place to reach.
    function layout() {
      if (!board) return;
      layoutEl.style.minHeight = '';
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

      const size = Math.floor(SG.clamp(best.size, 64, 200));
      board.style.setProperty('--cols', best.cols);
      board.style.setProperty('--tile', size + 'px');
      board.style.setProperty('--gap', gap + 'px');

      const layoutTop = layoutEl.getBoundingClientRect().top + window.pageYOffset;
      layoutEl.style.minHeight = Math.max(0, window.innerHeight - layoutTop - 20) + 'px';
    }

    function hidePending() {
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
        statusEl.textContent = t('tm.first', tile.name);
        SG.sound.tap();
        return;
      }

      const other = first;
      first = null;
      turns++;

      if (other.symbol !== tile.symbol) {
        // The two tiles stay showing for as long as the player likes; the next tap turns them back.
        pending = [other, tile];
        pendingSince = Date.now();
        statusEl.textContent = t('tm.mismatch', other.name, tile.name);
        SG.sound.tap();
        return;
      }

      setState(other, 'matched');
      setState(tile, 'matched');
      pairsFound++;
      const left = level.pairs - pairsFound;
      if (left === 0) {
        done = true;
        statusEl.textContent = t('tm.matchLast', tile.name);
        SG.sound.win();
        later(showWin, WIN_PAUSE_MS);
      } else {
        statusEl.textContent = t('tm.match', tile.name, left);
        SG.sound.found();
      }
    }

    function showWin() {
      const seen = {};
      const pictures = tiles.filter(function (tile) {
        if (seen[tile.symbol]) return false;
        seen[tile.symbol] = true;
        return true;
      });
      const trophies = el('div', { class: 'tm-trophies panel-trophies', 'aria-hidden': 'true' },
        pictures.map(function (tile) { return el('span', { text: tile.symbol }); }));
      const panel = SG.winPanel(
        t('tm.win', level.pairs, turns),
        trophies, newGame, '#/tilematch'
      );
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      if (hooks.onWin) hooks.onWin();
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      clearTimers();
      const chosen = pickSymbols(level.pairs);
      tiles = SG.shuffle(chosen.concat(chosen)).map(function (entry, index) {
        return { index: index, symbol: entry.pic, name: entry[SG.lang] || entry.en, state: 'down', button: null };
      });
      first = null;
      pending = null;
      pairsFound = 0;
      turns = 0;
      done = false;
      render();
      layout();
      if (hooks.onStart) hooks.onStart();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      // Shown on the "start a new game?" page, so a stray tap cannot wipe out a game in progress.
      progress: function () {
        return done || !pairsFound ? null : t('tm.progress', pairsFound, level.pairs);
      },
      destroy: function () {
        clearTimers();
        window.removeEventListener('resize', layout);
      }
    };
  }

  SG.tilematch = {
    levels: LEVELS,
    mount: mount,
    detail: function (levelKey) { return SG.t('tm.level', LEVELS[levelKey].pairs * 2, LEVELS[levelKey].pairs); }
  };
})(window.SG);
