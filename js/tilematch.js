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

  function mount(stage, levelKey) {
    const level = LEVELS[levelKey];
    const t = SG.t;

    let tiles, first, pending, pendingSince, pairsFound, turns, done;
    const timers = SG.timers();
    let layoutEl, wrap, board, statusEl;

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
        // A real card: a patterned back and a picture face, turned over in 3D (the tile's own box
        // never changes size, so nothing around it moves).
        tile.button = el('button', { class: 'tm-tile pressable', type: 'button' }, [
          el('span', { class: 'tm-card', 'aria-hidden': 'true' }, [
            el('span', { class: 'tm-back' }),
            el('span', { class: 'tm-face', text: tile.symbol })
          ])
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

      const best = SG.bestGrid(tiles.length, availW, availH, gap, true);
      const size = Math.floor(SG.clamp(best.cell, 64, 220));
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
        timers.later(showWin, WIN_PAUSE_MS);
      } else {
        statusEl.textContent = t('tm.match', tile.name, left);
        SG.sound.good(pairsFound);
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
        trophies, newGame, '#/tilematch/levels'
      );
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
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
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      // Shown on the level page while this game is under way, above its "Keep Playing" button.
      progress: function () {
        return done || !pairsFound ? null : t('tm.progress', pairsFound, level.pairs);
      },
      destroy: function () {
        timers.clear();
        window.removeEventListener('resize', layout);
      }
    };
  }

  // Three cards: one face down, and a matching pair turned up with a tick.
  function illustration() {
    const svg = SG.svg;
    function flower(cx, cy) {
      const parts = [];
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        parts.push(svg('circle', { cx: cx + 7.5 * Math.cos(a), cy: cy + 7.5 * Math.sin(a), r: 4.6, fill: '#FFC83D', stroke: '#946C00', 'stroke-width': 1 }));
      }
      parts.push(svg('circle', { cx: cx, cy: cy, r: 5, fill: '#8D5524', stroke: '#4E2C0E', 'stroke-width': 1 }));
      return parts;
    }
    function card(x, y, angle, up) {
      const w = 36, h = 50, cx = x + w / 2, cy = y + h / 2;
      const parts = [svg('rect', { x: x, y: y + 3, width: w, height: h, rx: 8, class: 'fill-deep' })];
      if (up) {
        parts.push(svg('rect', { x: x, y: y, width: w, height: h, rx: 8, fill: '#FFFFFF', class: 'stroke-deep', 'stroke-width': 3 }));
        parts.push.apply(parts, flower(cx, cy));
      } else {
        parts.push(svg('rect', { x: x, y: y, width: w, height: h, rx: 8, class: 'fill-accent stroke-deep', 'stroke-width': 3 }));
        parts.push(svg('rect', { x: x + 5, y: y + 5, width: w - 10, height: h - 10, rx: 5, fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.75, 'stroke-width': 1.8 }));
        parts.push(svg('circle', { cx: cx, cy: cy, r: 5.5, fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': 0.85, 'stroke-width': 1.8 }));
      }
      return svg('g', { transform: 'rotate(' + angle + ' ' + cx + ' ' + cy + ')' }, parts);
    }
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, [
      card(5, 26, -9, false),
      card(42, 12, 0, true),
      card(79, 26, 9, true),
      svg('circle', { cx: 110, cy: 25, r: 9, fill: '#1F6B3F', stroke: '#FFFFFF', 'stroke-width': 2 }),
      svg('path', { d: 'M105.5 25.5l3 3 6-6.5', fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    ]);
  }

  SG.registerGame({
    key: 'tilematch',
    text: 'tm',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    preview: function (levelKey) { return SG.squares(LEVELS[levelKey].pairs * 2, 'level-art-tiles'); },
    detail: function (levelKey) { return SG.t('tm.level', LEVELS[levelKey].pairs * 2, LEVELS[levelKey].pairs); }
  });
})(window.SG);
