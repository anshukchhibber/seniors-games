// Tile Match: every picture shows. Find the ones that are the same - two of a kind, or on the
// Hard level three of a kind - and tap them. Looking and matching, with no memory strain.
//
// Nothing is wrong: tapping two that differ just gives them a little shake and lets them go, and
// the status line always says in words what just happened and what to do next.
(function (SG) {
  'use strict';

  const el = SG.el;

  const LEVELS = {
    easy: { group: 2, sets: 4 },
    medium: { group: 2, sets: 6 },
    hard: { group: 3, sets: 4 }
  };

  // Each picture: { pic, en, hi, group?, newer? }.
  //   group - look-alikes (the same colour and outline) are never dealt into one game, so "the
  //           same" is always obvious.
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

  const DOUBLE_TAP_MS = 600; // a second tap on the same tile sooner than this is an accident
  const WIN_PAUSE_MS = 2000;

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
    const timers = SG.timers();

    let tiles, picked, found, done, lastTap;
    let layoutEl, wrap, board, statusEl;

    function describe(tile) {
      return tile.name + (tile.matched ? ', ' + t('tm.matched') : '');
    }

    function render() {
      stage.textContent = '';
      // Always two lines tall, so a longer message can never push the tiles down.
      statusEl = el('p', { class: 'status tm-status', role: 'status' });
      board = el('div', { class: 'tm-board', role: 'group', 'aria-label': t('tm.board') });

      tiles.forEach(function (tile) {
        tile.button = el('button', { class: 'tm-tile pressable', type: 'button', 'aria-label': describe(tile) }, [
          el('span', { class: 'tm-face', 'aria-hidden': 'true', text: tile.symbol })
        ]);
        SG.onTap(tile.button, function () { tap(tile); });
        tile.button.addEventListener('animationend', function () { tile.button.classList.remove('tm-nope'); });
        board.appendChild(tile.button);
      });

      wrap = el('div', { class: 'tm-board-wrap' }, [board]);
      layoutEl = el('div', { class: 'tm-layout' }, [statusEl, wrap]);
      stage.appendChild(layoutEl);
      statusEl.textContent = t(level.group === 3 ? 'tm.start3' : 'tm.start');
    }

    // Pick the rows/columns split that gives the biggest tiles for this screen, then sit the
    // game in the middle of the space - the top of a tablet is the hardest place to reach.
    function layout() {
      if (!board) return;
      layoutEl.style.minHeight = '';
      const top = wrap.getBoundingClientRect().top;
      const availW = wrap.clientWidth;
      const availH = SG.bottom() - top - 10;
      const gap = availW < 500 ? 10 : 16;

      const best = SG.bestGrid(tiles.length, availW, availH, gap, true);
      const size = Math.floor(SG.clamp(best.cell, 64, 220));
      board.style.setProperty('--cols', best.cols);
      board.style.setProperty('--tile', size + 'px');
      board.style.setProperty('--gap', gap + 'px');

      const layoutTop = layoutEl.getBoundingClientRect().top;
      layoutEl.style.minHeight = Math.max(0, SG.bottom() - layoutTop - 4) + 'px';
    }

    function setPicked(tile, on) {
      tile.button.classList.toggle('picked', on);
      tile.button.setAttribute('aria-pressed', String(on));
    }

    function tap(tile) {
      if (done || tile.matched) return;
      const now = Date.now();
      if (picked.indexOf(tile) !== -1) {
        // Tapping a chosen tile again lets it go (unless it was a quick accidental double tap)
        if (now - lastTap < DOUBLE_TAP_MS) return;
        picked.splice(picked.indexOf(tile), 1);
        setPicked(tile, false);
        lastTap = now;
        statusEl.textContent = t(level.group === 3 ? 'tm.start3' : 'tm.start');
        return;
      }
      lastTap = now;

      if (picked.length && picked[0].symbol !== tile.symbol) {
        // Not the same: a little shake, and they are let go. Nothing is lost.
        [picked[0], tile].concat(picked.slice(1)).forEach(function (p) {
          setPicked(p, false);
          if (!SG.reducedMotion()) p.button.classList.add('tm-nope');
        });
        picked = [];
        SG.sound.tap();
        statusEl.textContent = t('tm.notSame');
        return;
      }

      picked.push(tile);
      setPicked(tile, true);
      if (picked.length < level.group) {
        SG.sound.tap();
        statusEl.textContent = picked.length === 1
          ? t(level.group === 3 ? 'tm.first3' : 'tm.first', tile.name)
          : t('tm.oneMore', tile.name);
        return;
      }

      // A whole set: ticked, settled back, and out of the way of the rest
      picked.forEach(function (p) {
        p.matched = true;
        setPicked(p, false);
        p.button.classList.add('matched');
        p.button.setAttribute('aria-disabled', 'true');
        p.button.setAttribute('aria-label', describe(p));
      });
      picked = [];
      found++;
      const left = level.sets - found;
      if (left === 0) {
        done = true;
        statusEl.textContent = t('tm.matchLast');
        SG.sound.win();
        timers.later(showWin, WIN_PAUSE_MS);
      } else {
        statusEl.textContent = t('tm.match', tile.name, left);
        SG.sound.good(found);
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
      const panel = SG.winPanel(t('tm.win', level.sets), trophies, newGame, '#/tilematch/levels');
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
      const chosen = pickSymbols(level.sets);
      let all = [];
      for (let i = 0; i < level.group; i++) all = all.concat(chosen);
      tiles = SG.shuffle(all).map(function (entry, index) {
        return { index: index, symbol: entry.pic, name: entry[SG.lang] || entry.en, matched: false, button: null };
      });
      picked = [];
      found = 0;
      done = false;
      lastTap = 0;
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
        return done || !found ? null : t('tm.progress', found, level.sets);
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

  // Six pictures face up, two of them the same and ticked.
  // `opts.demo`: a hand taps the second sunflower.
  function illustration(opts) {
    const svg = SG.svg;
    const pics = [['🌻', true], ['☕', false], ['🐘', false], ['🍌', false], ['🌻', true], ['🚗', false]];
    const parts = [];
    pics.forEach(function (p, i) {
      const x = 8 + (i % 3) * 36, y = 6 + Math.floor(i / 3) * 40;
      parts.push(svg('rect', { x: x, y: y + 3, width: 32, height: 34, rx: 7, class: 'fill-deep' }));
      parts.push(svg('rect', { x: x, y: y, width: 32, height: 34, rx: 7, fill: p[1] ? '#D7EFDD' : '#FFFFFF', stroke: p[1] ? '#1F6B3F' : 'none', 'stroke-width': 2.5 }));
      parts.push(svg('text', { x: x + 16, y: y + 18, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 20, style: 'font-family: var(--font-emoji)' }, [document.createTextNode(p[0])]));
      if (p[1]) {
        parts.push(svg('circle', { cx: x + 29, cy: y + 3, r: 6.5, fill: '#1F6B3F', stroke: '#FFFFFF', 'stroke-width': 1.5 }));
        parts.push(svg('path', { d: 'M' + (x + 26) + ' ' + (y + 3.3) + 'l2.2 2.2 4-4.4', fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      }
    });
    if (opts && opts.demo) parts.push(SG.demoHand(28, 64, 'tap'));
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, parts);
  }

  SG.registerGame({
    key: 'tilematch',
    text: 'tm',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    preview: function (levelKey) { return SG.squares(LEVELS[levelKey].sets * LEVELS[levelKey].group, 'level-art-tiles'); },
    detail: function (levelKey) { return SG.t('tm.level.' + levelKey); }
  });
})(window.SG);
