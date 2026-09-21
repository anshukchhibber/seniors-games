// Screens and navigation.
//   #/                     home
//   #/wordsearch           choose a level
//   #/wordsearch/easy      play
// Using the address hash means the browser / tablet Back button always
// goes to the previous screen instead of leaving the app.
(function (SG) {
  'use strict';

  const el = SG.el;
  const view = document.getElementById('view');
  const APP_NAME = 'Sunny Games';

  const GAMES = {
    wordsearch: {
      module: SG.wordsearch,
      title: 'Word Search',
      blurb: 'Find the hidden words in a grid of letters.',
      action: 'New Puzzle'
    },
    tilematch: {
      module: SG.tilematch,
      title: 'Tile Match',
      blurb: 'Turn over the tiles and find the matching pairs.',
      action: 'New Game'
    }
  };

  let current = null; // the game being played, if any

  // Top bar: Home is always top-left, the title in the middle, one optional action top-right.
  function bar(title, action) {
    return el('header', { class: 'bar' }, [
      el('a', { class: 'btn btn-secondary bar-home', href: '#/' }, [
        el('span', { 'aria-hidden': 'true', text: '←' }),
        'Home'
      ]),
      el('h1', { class: 'bar-title', tabindex: '-1', text: title }),
      action || el('span')
    ]);
  }

  function wordSearchArt() {
    const letters = 'PSUNLOKATREE'.split('');
    return el('div', { class: 'art art-ws', 'aria-hidden': 'true' }, letters.map(function (letter, i) {
      const cls = i < 8 ? '' : 'hl' + (i === 8 ? ' hl-start' : '') + (i === 11 ? ' hl-end' : '');
      return el('span', { class: cls, text: letter });
    }));
  }

  function tileMatchArt() {
    const faces = ['🌻', '', '', '', '🌻', ''];
    return el('div', { class: 'art art-tm', 'aria-hidden': 'true' }, faces.map(function (face) {
      return el('span', { class: face ? 'up' : '', text: face });
    }));
  }

  function renderHome() {
    document.title = APP_NAME;

    const sound = el('button', { class: 'btn btn-secondary', type: 'button' });
    function showSound() {
      sound.textContent = SG.sound.isOn() ? 'Sound: On' : 'Sound: Off';
      sound.setAttribute('aria-pressed', String(SG.sound.isOn()));
    }
    sound.addEventListener('click', function () {
      SG.sound.toggle();
      showSound();
    });
    showSound();

    const arts = { wordsearch: wordSearchArt, tilematch: tileMatchArt };
    const cards = Object.keys(GAMES).map(function (key) {
      return el('a', { class: 'game-card', href: '#/' + key }, [
        arts[key](),
        el('h2', { class: 'game-card-title', text: GAMES[key].title }),
        el('p', { class: 'game-card-blurb', text: GAMES[key].blurb }),
        el('span', { class: 'btn game-card-play', text: 'Play' })
      ]);
    });

    view.appendChild(el('header', { class: 'home-head' }, [
      el('h1', { class: 'home-title', tabindex: '-1', text: APP_NAME }),
      el('p', { class: 'home-sub', text: 'Choose a game to play.' })
    ]));
    view.appendChild(el('div', { class: 'game-cards' }, cards));
    view.appendChild(el('footer', { class: 'home-foot' }, [sound]));
  }

  function renderLevels(key, game) {
    document.title = game.title + ' – ' + APP_NAME;
    const levels = game.module.levels;

    view.appendChild(bar(game.title));
    view.appendChild(el('div', { class: 'levels' }, [
      el('h2', { class: 'levels-title', text: 'Choose a level' })
    ].concat(Object.keys(levels).map(function (levelKey) {
      return el('a', { class: 'level-btn', href: '#/' + key + '/' + levelKey }, [
        el('span', { class: 'level-name', text: levels[levelKey].label }),
        el('span', { class: 'level-detail', text: levels[levelKey].detail })
      ]);
    }))));
  }

  function renderGame(key, game, levelKey) {
    document.title = game.title + ' – ' + APP_NAME;

    const action = el('button', {
      class: 'btn btn-secondary',
      type: 'button',
      text: game.action,
      onclick: function () { current.newGame(); }
    });
    const stage = el('div', { class: 'stage' });

    const top = bar(game.title, action);
    top.classList.add('bar-playing');
    view.appendChild(top);
    view.appendChild(stage); // must be in the page before mounting so the game can measure the screen
    current = game.module.mount(stage, levelKey);
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

  window.addEventListener('hashchange', route);
  route();
})(window.SG);
