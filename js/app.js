// Screens and navigation.
//   #/                     home
//   #/wordsearch           choose a level
//   #/wordsearch/easy      play
// Using the address hash means the browser / tablet Back button always
// goes to the previous screen instead of leaving the app.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;
  const t = SG.t;
  const view = document.getElementById('view');

  // `text` is the prefix of the game's entries in i18n.js (ws.title, ws.blurb, ws.howto ...).
  const GAMES = {
    wordsearch: { module: SG.wordsearch, text: 'ws', art: wordSearchArt, preview: wordSearchPreview },
    tilematch: { module: SG.tilematch, text: 'tm', art: tileMatchArt, preview: tileMatchPreview },
    numbers: { module: SG.numbers, text: 'nh', art: numbersArt, preview: numbersPreview }
  };

  let current = null; // the game being played, if any

  // ---------- Shared pieces ----------

  function link(attrs, children) {
    attrs.draggable = 'false'; // a slow, heavy press must not start dragging the link
    return el('a', attrs, children);
  }

  // Top bar: Home is always top-left, the title in the middle, one optional action top-right.
  function bar(title, action) {
    return el('header', { class: 'bar' }, [
      link({ class: 'btn btn-secondary bar-home', href: '#/' }, [SG.icon('home'), t('home')]),
      el('h1', { class: 'bar-title', tabindex: '-1', text: title }),
      action || el('span')
    ]);
  }

  // A pair of buttons where exactly one is chosen. The chosen one is filled in AND ticked,
  // so the state never depends on colour alone. Both keep room for the tick, so nothing moves.
  function chooser(label, options, value, onChange) {
    const buttons = options.map(function (option) {
      const button = el('button', { class: 'btn', type: 'button' }, [SG.icon('check'), option.text]);
      button.addEventListener('click', function () {
        show(option.value);
        onChange(option.value);
      });
      return button;
    });
    function show(chosen) {
      buttons.forEach(function (button, i) {
        const on = options[i].value === chosen;
        button.classList.toggle('btn-secondary', !on);
        button.setAttribute('aria-pressed', String(on));
      });
    }
    show(value);
    return el('div', { class: 'chooser', role: 'group', 'aria-label': label }, [
      el('span', { class: 'chooser-label', text: label }),
      el('div', { class: 'chooser-options' }, buttons)
    ]);
  }

  // ---------- Little pictures ----------

  function wordSearchArt() {
    // The same picture in each script: a small letter grid with one word highlighted.
    const letters = SG.lang === 'hi'
      ? ['प', 'सू', 'ल', 'न', 'ग', 'की', 'र', 'मा', 'क', 'म', 'ल', 'टा']
      : 'PSUNLOKATREE'.split('');
    const wordLength = SG.lang === 'hi' ? 3 : 4; // कमल / TREE, along the bottom row
    return el('div', { class: 'art art-ws', 'aria-hidden': 'true' }, letters.map(function (letter, i) {
      const at = i - 8;
      const lit = at >= 0 && at < wordLength;
      const cls = lit ? 'hl' + (at === 0 ? ' hl-start' : '') + (at === wordLength - 1 ? ' hl-end' : '') : '';
      return el('span', { class: cls, text: letter });
    }));
  }

  function tileMatchArt() {
    const face = SG.lang === 'hi' ? '🐘' : '🌻';
    return el('div', { class: 'art art-tm', 'aria-hidden': 'true' }, [face, '', '', '', face, ''].map(function (f) {
      return el('span', { class: f ? 'up' : '', text: f });
    }));
  }

  function numbersArt() {
    // 1 and 2 already found; 3 is next.
    return el('div', { class: 'art art-nh', 'aria-hidden': 'true' }, ['5', '', '3', '', '6', '4'].map(function (n) {
      return el('span', { class: n ? '' : 'done', text: n });
    }));
  }

  // Level pictures: a bigger grid with more (and more varied) highlighted words as it gets harder.
  function wordSearchPreview(levelKey) {
    const spec = {
      easy: { n: 4, bands: [[1, 0, 1, 2, '#FFD54F', '#946C00'], [0, 3, 3, 3, '#90CAF9', '#1F6FB5']] },
      medium: { n: 5, bands: [[0, 1, 0, 4, '#FFD54F', '#946C00'], [1, 0, 4, 3, '#A5D6A7', '#2F7D38']] },
      hard: { n: 6, bands: [[0, 0, 0, 3, '#FFD54F', '#946C00'], [1, 1, 4, 4, '#A5D6A7', '#2F7D38'], [5, 5, 2, 5, '#F8A5C2', '#B83A70'], [5, 0, 5, 3, '#90CAF9', '#1F6FB5']] }
    }[levelKey];
    const parts = [];
    spec.bands.forEach(function (b) {
      [[b[5], 0.78], [b[4], 0.58]].forEach(function (stroke) {
        parts.push(svg('line', {
          x1: b[1] + 0.5, y1: b[0] + 0.5, x2: b[3] + 0.5, y2: b[2] + 0.5,
          stroke: stroke[0], 'stroke-width': stroke[1], 'stroke-linecap': 'round'
        }));
      });
    });
    for (let r = 0; r < spec.n; r++) {
      for (let c = 0; c < spec.n; c++) parts.push(svg('circle', { cx: c + 0.5, cy: r + 0.5, r: 0.14, fill: '#1F2A44' }));
    }
    return svg('svg', { class: 'level-art', viewBox: '0 0 ' + spec.n + ' ' + spec.n, 'aria-hidden': 'true' }, parts);
  }

  function squares(count, className) {
    const parts = [];
    for (let i = 0; i < count; i++) parts.push(el('span'));
    return el('div', { class: 'level-art ' + className, 'aria-hidden': 'true' }, parts);
  }

  function tileMatchPreview(levelKey) {
    return squares(SG.tilematch.levels[levelKey].pairs * 2, 'level-art-tiles');
  }

  function numbersPreview(levelKey) {
    const count = SG.numbers.levels[levelKey].count;
    const grid = squares(count, 'level-art-grid');
    grid.style.setProperty('--n', Math.sqrt(count));
    return grid;
  }

  // ---------- Screens ----------

  function renderHome() {
    document.title = t('appName');

    const cards = Object.keys(GAMES).map(function (key) {
      const game = GAMES[key];
      return link({ class: 'game-card', href: '#/' + key }, [
        el('div', { class: 'art-box' }, [game.art()]),
        el('h2', { class: 'game-card-title', text: t(game.text + '.title') }),
        el('p', { class: 'game-card-blurb', text: t(game.text + '.blurb') }),
        el('span', { class: 'btn game-card-play', text: t('play') })
      ]);
    });

    // Each language is written in its own script, so its readers can find it whatever is showing now.
    const language = chooser(t('language'), SG.languages, SG.lang, function (value) {
      SG.setLang(value);
      route(); // redraw this page in the new language
    });

    const sound = chooser(t('sound'), [{ value: 'on', text: t('on') }, { value: 'off', text: t('off') }],
      SG.sound.isOn() ? 'on' : 'off',
      function (value) { if ((value === 'on') !== SG.sound.isOn()) SG.sound.toggle(); });

    // Puts the word list and buttons on the same side as the playing hand,
    // so nobody has to reach across the game (and brush it) to press Hint.
    const hand = chooser(t('hand'), [{ value: 'left', text: t('left') }, { value: 'right', text: t('right') }],
      SG.store.get('hand', 'right'),
      function (value) { SG.store.set('hand', value); applyHand(); });

    view.appendChild(el('div', { class: 'home' }, [
      el('header', { class: 'home-head' }, [
        el('div', { class: 'home-brand' }, [SG.sun(), el('h1', { class: 'home-title', tabindex: '-1', text: t('appName') })]),
        el('p', { class: 'home-sub', text: t('home.sub') })
      ]),
      el('div', { class: 'game-cards' }, cards),
      el('footer', { class: 'home-foot' }, [language, sound, hand])
    ]));
  }

  function renderLevels(key, game) {
    const title = t(game.text + '.title');
    document.title = title + ' – ' + t('appName');
    const last = SG.store.get('last.' + key, '');
    const phoneNote = t(game.text + '.level.phone'); // only some games shrink on a phone

    const options = Object.keys(game.module.levels).map(function (levelKey) {
      const words = [
        el('span', { class: 'level-name', text: t('level.' + levelKey) }),
        el('span', { class: 'level-detail', text: game.module.detail(levelKey) })
      ];
      if (phoneNote && levelKey === 'hard') words.push(el('span', { class: 'level-detail phone-only', text: phoneNote }));
      if (levelKey === last) words.push(el('span', { class: 'level-last', text: t('levels.last') }));
      return link({ class: 'level-btn', href: '#/' + key + '/' + levelKey }, [
        game.preview(levelKey),
        el('span', { class: 'level-words' }, words),
        SG.icon('chevron')
      ]);
    });

    // "How to play" lives here permanently, on the page - never in a popup.
    const howTo = el('section', { class: 'howto' }, [
      el('h2', { class: 'howto-title', text: t('howto') }),
      el('div', { class: 'art-box' }, [game.art()])
    ].concat(t(game.text + '.howto').map(function (line) { return el('p', { text: line }); })));

    view.appendChild(bar(title));
    view.appendChild(el('div', { class: 'levels-page' }, [
      el('div', { class: 'levels' }, [el('h2', { class: 'levels-title', text: t('levels.choose') })].concat(options)),
      howTo
    ]));
  }

  function renderGame(key, game, levelKey) {
    const title = t(game.text + '.title');
    document.title = title + ' – ' + t('appName');
    SG.store.set('last.' + key, levelKey);

    const action = el('button', { class: 'btn btn-secondary', type: 'button', text: t(game.text + '.action') });
    const stage = el('div', { class: 'stage' });
    const top = bar(title, action);
    top.classList.add('bar-playing');

    function showAction(show) {
      action.style.visibility = show ? '' : 'hidden'; // keeps its space, so the bar never re-flows
    }

    // One stray tap must never wipe out a long game: once there is progress, "New Puzzle"
    // first asks - on an ordinary page, with "Keep Playing" as the big, obvious button.
    function askBeforeNewGame() {
      const progress = current.progress();
      if (!progress) {
        current.newGame();
        return;
      }
      const keep = el('button', { class: 'btn btn-lg', type: 'button', text: t('keepPlaying') });
      const fresh = el('button', { class: 'btn btn-secondary', type: 'button', text: t(game.text + '.action') });
      const panel = SG.panel({
        title: t(game.text + '.confirmTitle'),
        text: t(game.text + '.confirmText', progress),
        actions: [keep, fresh]
      });
      function close() {
        view.removeChild(panel);
        stage.hidden = false;
      }
      SG.onTap(keep, function () {
        close();
        showAction(true);
        current.resize();
      });
      SG.onTap(fresh, function () {
        close();
        current.newGame();
      });
      stage.hidden = true;
      showAction(false);
      view.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }
    SG.onTap(action, askBeforeNewGame);

    view.appendChild(top);
    view.appendChild(stage); // must be in the page before mounting so the game can measure the screen
    current = game.module.mount(stage, levelKey, {
      onStart: function () { showAction(true); },
      onWin: function () { showAction(false); } // the finish screen has its own "Play Again"
    });
  }

  let firstRoute = true;

  function route() {
    if (current) {
      current.destroy();
      current = null;
    }
    view.textContent = '';

    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const game = GAMES[parts[0]];
    if (!game) renderHome();
    else if (!game.module.levels[parts[1]]) renderLevels(parts[0], game);
    else renderGame(parts[0], game, parts[1]);

    window.scrollTo(0, 0);
    // Tell screen readers a new screen has opened (but leave focus alone on first load).
    if (!firstRoute) {
      const heading = view.querySelector('h1');
      if (heading) heading.focus({ preventScroll: true });
    }
    firstRoute = false;
  }

  // ---------- Whole-app behaviour ----------

  function applyHand() {
    document.body.classList.toggle('hand-left', SG.store.get('hand', 'right') === 'left');
  }

  // Show a press the instant a finger lands, and keep it visible long enough to see even on a
  // quick tap. With reduced feeling in the fingers, the screen has to answer on touch-down.
  const PRESS_SHOW_MS = 160;
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest) return;
    const pressed = e.target.closest('.game-card') || e.target.closest('.btn, .level-btn, .tm-tile, .nh-tile');
    if (!pressed) return;
    const since = Date.now();
    pressed.classList.add('is-pressed');
    function release() {
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
      setTimeout(function () { pressed.classList.remove('is-pressed'); }, Math.max(0, PRESS_SHOW_MS - (Date.now() - since)));
    }
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
  }, true);

  // iOS Safari only paints :active styles when some touchstart listener exists.
  document.addEventListener('touchstart', function () {}, { passive: true });

  // A long, heavy press (normal after a stroke) must not summon the system's own popups:
  // link previews, "Copy / Look Up" bubbles or context menus. Right-click with a mouse still works.
  let lastPointerType = 'mouse';
  document.addEventListener('pointerdown', function (e) { lastPointerType = e.pointerType; }, true);
  document.addEventListener('contextmenu', function (e) {
    if (lastPointerType !== 'mouse') e.preventDefault();
  });

  applyHand();
  window.addEventListener('hashchange', route);
  route();
})(window.SG);
