// Screens and navigation.
//   #/                     home
//   #/wordsearch           choose a level
//   #/wordsearch/easy      play
// Using the address hash means the browser / tablet Back button always
// goes to the previous screen instead of leaving the app.
(function (SG) {
  'use strict';

  const el = SG.el;
  const t = SG.t;
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

  // ---------- Screens ----------

  function renderHome() {
    document.title = t('appName');

    const cards = SG.games.map(function (game) {
      return link({ class: 'game-card', href: '#/' + game.key }, [
        el('span', { class: 'game-card-tag', text: t('cat.' + game.category) }),
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

    const options = Object.keys(game.levels).map(function (levelKey) {
      const words = [
        el('span', { class: 'level-name', text: game.levelName ? game.levelName(levelKey) : t('level.' + levelKey) }),
        el('span', { class: 'level-detail', text: game.detail(levelKey) })
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
      el('div', { class: 'levels' }, [el('h2', { class: 'levels-title', text: tg(game, 'choose', 'levels.choose') })].concat(options)),
      howTo
    ]));
  }

  function renderGame(key, game, levelKey) {
    const title = t(game.text + '.title');
    document.title = title + ' – ' + t('appName');
    SG.store.set('last.' + key, levelKey);

    const action = el('button', { class: 'btn btn-secondary', type: 'button', text: tg(game, 'action', 'newGame') });
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
      const fresh = el('button', { class: 'btn btn-secondary', type: 'button', text: tg(game, 'action', 'newGame') });
      const panel = SG.panel({
        title: tg(game, 'confirmTitle', 'confirmNew.title'),
        text: tg(game, 'confirmText', 'confirmNew.text', progress),
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
    current = game.mount(stage, levelKey, {
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
    const game = gameByKey(parts[0]);
    if (!game) renderHome();
    else if (!game.levels[parts[1]]) renderLevels(parts[0], game);
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
    // `.pressable` is how a game marks its own big buttons (tiles, pads, swatches...).
    const pressed = e.target.closest('.game-card') || e.target.closest('.btn, .level-btn, .pressable');
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
