// Screens and navigation.
//   #/                     home: one big tile per game
//   #/settings             sound and playing hand
//   #/wordsearch           play straight away, at the level played last time (Easy the first time).
//                          The very first time, a "How to play" page with one Start button comes first.
//   #/wordsearch/levels    choose a level (and "carry on" if a game is under way)
//   #/wordsearch/howto     how to play: the same page as the first time, with a Back button
//   #/wordsearch/easy      play this level
// Every screen fits the screen exactly: nothing ever scrolls (see fitScreen below).
// Using the address hash means the browser / tablet Back button always
// goes to the previous screen instead of leaving the app.
(function (SG) {
  'use strict';

  const el = SG.el;
  const t = SG.t;
  const link = SG.link;
  const view = document.getElementById('view');

  function gameByKey(key) {
    return SG.games.filter(function (game) { return game.key === key; })[0];
  }

  // A game's own wording if it has one ("New Puzzle"), otherwise the shared wording ("New Game").
  function tg(game, suffix, shared) {
    const own = game.text + '.' + suffix;
    const args = [SG.has(own) ? own : shared].concat(Array.prototype.slice.call(arguments, 3));
    return t.apply(null, args);
  }

  function levelName(game, levelKey) {
    return game.levelName ? game.levelName(levelKey) : t('level.' + levelKey);
  }

  // The game being played, if any: { key, levelKey, hash, game, top, stage, levels, resumable, backIsGame }.
  // While its level page is open the game is only hidden, never thrown away, so "Keep Playing"
  // brings back exactly the same game.
  let current = null;

  // Games whose Start button has been pressed in this visit (in case the tablet cannot store it).
  const seenNow = {};
  function seen(key) {
    return !!seenNow[key] || SG.store.get('seen.' + key, '') === '1';
  }

  function startLevel(key, game) {
    const last = SG.store.get('last.' + key, '');
    return game.levels[last] ? last : Object.keys(game.levels)[0];
  }

  // ---------- Shared pieces ----------

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

  // The game's picture with a drawn hand acting out the move. It plays twice when the page opens,
  // and again whenever the picture is tapped.
  function demo(game, className) {
    const box = el('div', { class: className + ' demo-run', 'aria-hidden': 'true' }, [game.illustration({ demo: true })]);
    SG.onTap(box, function () {
      box.classList.remove('demo-run');
      box.getBoundingClientRect(); // start the animation again from the beginning
      box.classList.add('demo-run');
    });
    return box;
  }

  // ---------- Screens ----------

  function renderHome() {
    document.title = t('appName');

    // The whole tile is the button: the game's picture and its name, nothing else to read.
    const tiles = SG.games.map(function (game) {
      return link({ class: 'tile', href: '#/' + game.key, 'data-game': game.key }, [el('span', { class: 'tile-inner' }, [
        el('span', { class: 'tile-art', 'aria-hidden': 'true' }, [game.illustration()]),
        el('h2', { class: 'tile-title', text: t(game.text + '.title') })
      ])]);
    });

    // Each language is written in its own script, so its readers can find it whatever is showing now.
    const language = chooser(t('language'), SG.languages, SG.lang, function (value) {
      SG.setLang(value);
      route(); // redraw this page in the new language
    });

    view.appendChild(el('div', { class: 'home', 'data-fit': '3' }, [
      el('header', { class: 'home-head' }, [
        el('div', { class: 'home-brand' }, [SG.sun(), el('h1', { class: 'home-title', tabindex: '-1', text: t('appName') })]),
        link({ class: 'btn btn-secondary home-settings', href: '#/settings' }, [SG.icon('settings'), el('span', { class: 'btn-text', text: t('settings') })])
      ]),
      // data-grid: laid out by fitScreen to suit the screen's shape (3 x 2, 2 x 3...)
      el('div', { class: 'tiles', 'data-grid': '1.15', 'data-min-width': '150' }, tiles),
      el('footer', { class: 'home-foot' }, [language])
    ]));
  }

  function renderSettings() {
    document.title = t('settings') + ' – ' + t('appName');

    const sound = chooser(t('sound'), [{ value: 'on', text: t('on') }, { value: 'off', text: t('off') }],
      SG.sound.isOn() ? 'on' : 'off',
      function (value) { if ((value === 'on') !== SG.sound.isOn()) SG.sound.toggle(); });

    // Puts the word list and buttons on the same side as the playing hand,
    // so nobody has to reach across the game (and brush it) to press Hint.
    const hand = chooser(t('hand'), [{ value: 'left', text: t('left') }, { value: 'right', text: t('right') }],
      SG.store.get('hand', 'right'),
      function (value) { SG.store.set('hand', value); applyHand(); });

    view.appendChild(el('div', { class: 'screen', 'data-fit': '2' }, [bar(t('settings')), el('div', { class: 'settings' }, [sound, hand])]));
  }

  // How to play: a picture with a hand acting out the move, three short lines, and one big button.
  //   'first': the first time a game is opened - "Start" plays it. Never shown by itself again.
  //   'howto': from the level page's How to play button - "Back" returns there.
  function introScreen(key, game, mode) {
    const title = t(game.text + '.title');
    document.title = title + ' – ' + t('appName');
    const button = mode === 'first'
      ? SG.iconButton('btn btn-lg intro-start', 'play', t('start'))
      : SG.iconButton('btn btn-lg intro-start', 'back', t('back'));
    SG.onTap(button, function () {
      if (mode === 'first') {
        seenNow[key] = true;
        SG.store.set('seen.' + key, '1');
        route(); // the same address now plays the game
      } else if (howtoFromApp) history.back();
      else location.hash = '#/' + key + '/levels';
    });
    return el('div', { class: 'screen', 'data-fit': '4' }, [
      bar(title),
      el('div', { class: 'intro' }, [
        demo(game, 'intro-art'),
        el('div', { class: 'intro-words' }, [
          el('h2', { class: 'intro-title', text: t('howto') }),
          el('div', { class: 'intro-lines' }, t(game.text + '.howto').map(function (line) { return el('p', { text: line }); })),
          button
        ])
      ])
    ]);
  }

  // "Carry on": shown at the top of the level page when a game is under way.
  function resumeBox(game, live, progress) {
    const keep = SG.iconButton('btn btn-lg', 'play', tg(game, 'keep', 'keepPlaying'));
    const fresh = SG.iconButton('btn btn-secondary', 'fresh', tg(game, 'action', 'newGame'));
    function backToGame() {
      if (live.backIsGame) history.back();
      else location.hash = live.hash;
    }
    SG.onTap(keep, backToGame);
    SG.onTap(fresh, function () {
      live.game.newGame(); // the same game, cleared (Colouring Book: the picture made white again)
      backToGame();
    });
    return el('section', { class: 'levels-resume' }, [
      el('h2', { class: 'levels-resume-title', text: tg(game, 'resumeTitle', 'levels.resumeTitle') }),
      el('p', { class: 'levels-resume-text', text: tg(game, 'resumeText', 'levels.resumeText', progress) }),
      el('div', { class: 'panel-actions' }, [keep, fresh])
    ]);
  }

  // The level page. `live`: the game under way, hidden underneath while this page shows.
  function renderLevels(key, game, live) {
    const title = t(game.text + '.title');
    document.title = title + ' – ' + t('appName');
    const last = SG.store.get('last.' + key, '');
    const progress = live && live.resumable ? live.game.progress() : null;

    const options = Object.keys(game.levels).map(function (levelKey) {
      const words = [
        el('span', { class: 'level-name', text: levelName(game, levelKey) }),
        el('span', { class: 'level-detail', text: game.detail(levelKey) })
      ];
      if (progress && levelKey === live.levelKey) words.push(el('span', { class: 'level-last', text: t('levels.playing') }));
      else if (!progress && levelKey === last) words.push(el('span', { class: 'level-last', text: t('levels.last') }));
      // The inside is laid out by the card's own size (container queries in style.css): picture
      // beside the words in a wide card, above them in a tall one, the detail left out in a small one.
      return link({ class: 'level-btn', href: '#/' + key + '/' + levelKey }, [el('span', { class: 'level-inner' }, [
        el('span', { class: 'level-pic' }, [game.preview(levelKey)]),
        el('span', { class: 'level-words' }, words),
        SG.icon('chevron')
      ])]);
    });

    const page = [bar(title)];
    if (progress) page.push(resumeBox(game, live, progress));
    page.push(el('div', { class: 'levels-page' + (game.chooser ? ' levels-gallery' : '') }, [
      el('div', { class: 'levels-head' }, [
        el('h2', { class: 'levels-title', text: tg(game, 'choose', 'levels.choose') }),
        link({ class: 'btn btn-secondary levels-howto', href: '#/' + key + '/howto' }, [SG.icon('help'), el('span', { class: 'btn-text', text: t('howto') })])
      ]),
      el('div', { class: 'levels', 'data-grid': game.chooser ? '0.8' : '1.3' }, options)
    ]));
    return el('div', { class: 'screen levels-screen', 'data-fit': '4' }, page);
  }

  function renderGame(key, game, levelKey) {
    const title = t(game.text + '.title');
    document.title = title + ' – ' + t('appName');
    SG.store.set('last.' + key, levelKey);

    // Top-right: the level being played, which is also the way to change it.
    const name = levelName(game, levelKey);
    const levelLink = link({ class: 'btn btn-secondary bar-level', href: '#/' + key + '/levels', 'aria-label': tg(game, 'bar', 'bar.level', name) },
      [SG.icon(game.chooser ? 'picture' : 'levels'), el('span', { class: 'bar-level-text', text: name })]);
    const top = bar(title, levelLink);
    top.classList.add('bar-playing');
    const stage = el('div', { class: 'stage' });

    view.appendChild(top);
    view.appendChild(stage); // must be in the page before mounting so the game can measure the screen
    current = { key: key, levelKey: levelKey, hash: location.hash, top: top, stage: stage, levels: null };
    current.game = game.mount(stage, levelKey);
  }

  function destroyCurrent() {
    if (!current) return;
    current.game.destroy();
    current = null;
  }

  // Opens the level page (or How to play) over the game under way, which is only hidden.
  function park(game, backIsGame, sub) {
    if (!current.levels) {
      current.backIsGame = backIsGame;
      current.resumable = !!current.game.progress();
      current.top.hidden = true;
      current.stage.hidden = true;
    } else {
      view.removeChild(current.levels);
    }
    current.levels = sub === 'howto' ? introScreen(current.key, game, 'howto') : renderLevels(current.key, game, current);
    view.appendChild(current.levels);
  }

  function unpark() {
    view.removeChild(current.levels);
    current.levels = null;
    current.top.hidden = false;
    current.stage.hidden = false;
    document.title = t(gameByKey(current.key).text + '.title') + ' – ' + t('appName');
    current.game.resize();
  }

  function applyAccent(key) {
    if (key) document.body.setAttribute('data-game', key);
    else document.body.removeAttribute('data-game');
  }

  let firstRoute = true;
  let lastHash = null;
  let howtoFromApp = false; // How to play was opened from within the app, so Back can go back

  function route() {
    const hash = location.hash;
    const cameFrom = lastHash;
    lastHash = hash;
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const key = parts[0], sub = parts[1];
    const game = gameByKey(key);
    if (sub === 'howto') howtoFromApp = cameFrom !== null;

    if (current && game && key === current.key) {
      if (sub === 'levels' || sub === 'howto') {
        park(game, cameFrom === current.hash, sub);
        return settle();
      }
      // Back to the game under way (Keep Playing, the tablet's Back button, or its own level)
      if (current.levels && current.resumable && (hash === current.hash || sub === current.levelKey)) {
        unpark();
        return settle();
      }
    }

    destroyCurrent();
    view.textContent = '';
    applyAccent(game ? key : null);

    if (!game) {
      if (key === 'settings') renderSettings();
      else renderHome();
    } else if (sub === 'levels') view.appendChild(renderLevels(key, game, null));
    else if (sub === 'howto') view.appendChild(introScreen(key, game, 'howto'));
    else if (!seen(key)) view.appendChild(introScreen(key, game, 'first'));
    else if (game.levels[sub]) renderGame(key, game, sub);
    else if (game.chooser) view.appendChild(renderLevels(key, game, null));
    else renderGame(key, game, startLevel(key, game));
    settle();
  }

  // Lays out the tile and level grids for this screen's shape, then - only if the page is still
  // too big - takes away extras step by step (SG.fitSteps). Runs when a screen opens and when the
  // tablet is turned; never in the middle of play.
  function fitScreen() {
    const shown = function (node) { return !node.closest('[hidden]'); };
    const grids = [].slice.call(view.querySelectorAll('[data-grid]')).filter(shown);
    function layoutGrids() {
      grids.forEach(function (grid) {
        const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
        const best = SG.gridFor(grid.children.length, grid.clientWidth, grid.clientHeight, gap, +grid.getAttribute('data-grid'), +grid.getAttribute('data-min-width') || 0);
        grid.style.setProperty('--cols', best.cols);
        grid.style.setProperty('--rows', best.rows);
      });
    }
    layoutGrids();
    [].slice.call(view.querySelectorAll('[data-fit]')).filter(shown).forEach(SG.fitSteps);
    layoutGrids();
  }

  let fitTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitScreen, 120);
  });

  function settle() {
    window.scrollTo(0, 0);
    fitScreen();
    // Tell screen readers a new screen has opened (but leave focus alone on first load).
    if (!firstRoute) {
      const heading = [].slice.call(view.querySelectorAll('h1')).filter(function (h) { return !h.closest('[hidden]'); })[0];
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
    // `.pressable` is how a game marks its own big buttons (tiles, pads, swatches...).
    const pressed = e.target.closest('.tile, .btn, .level-btn, .pressable');
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

  // for the playtest: the game being played
  SG.current = function () { return current && current.game; };

  applyHand();
  window.addEventListener('hashchange', route);
  route();
})(window.SG);
