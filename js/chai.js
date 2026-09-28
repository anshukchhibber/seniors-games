// Making Chai: the steps of an everyday recipe, mixed up. Tap the one that comes first, then the
// next... and each goes into its place in the row, 1, 2, 3. Everyday sequencing, from memory
// that runs deep - chai, nimbu pani, khichdi.
//
// Nothing is ever wrong: a step tapped too early gives a little shake ("not yet") and stays put;
// after a second try, a hand points at the step that comes next.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;

  // Each step: [picture, English, Hindi]. `newer` pictures are not used - every step must show.
  const RECIPES = {
    chai: { en: 'Chai', hi: 'चाय', steps: [
      ['💧', 'Water in the pan', 'बरतन में पानी'],
      ['🍃', 'Tea leaves', 'चायपत्ती'],
      ['🥛', 'Milk and sugar', 'दूध और चीनी'],
      ['☕', 'Pour into cups', 'कप में डालिए']
    ] },
    nimbu: { en: 'Nimbu Pani', hi: 'नींबू पानी', steps: [
      ['🍋', 'Cut a lemon', 'नींबू काटिए'],
      ['💧', 'Water in a glass', 'गिलास में पानी'],
      ['✊', 'Squeeze the lemon', 'नींबू निचोड़िए'],
      ['🧂', 'Sugar and salt', 'चीनी और नमक'],
      ['🥄', 'Stir it', 'चम्मच से मिलाइए']
    ] },
    khichdi: { en: 'Khichdi', hi: 'खिचड़ी', steps: [
      ['🍚', 'Rice and dal', 'चावल और दाल'],
      ['💦', 'Wash them', 'धोइए'],
      ['🍲', 'Into the pot, with water', 'पानी के साथ पतीले में'],
      ['🔥', 'Cook on the stove', 'चूल्हे पर पकाइए'],
      ['🥄', 'A spoon of ghee', 'एक चम्मच घी'],
      ['🍽️', 'Serve it hot', 'गरम परोसिए']
    ] }
  };

  const LEVELS = { chai: {}, nimbu: {}, khichdi: {} };
  const MOVE_MS = 350;
  const WIN_PAUSE_MS = 2000;
  const GAP = 14;

  function stepName(step) {
    return step[SG.lang === 'hi' ? 2 : 1];
  }

  function mount(stage, recipeKey) {
    const recipe = RECIPES[recipeKey];
    const t = SG.t;
    const timers = SG.timers();

    let cards, placed, misses, done, busy;
    let layoutEl, row, pile, statusEl, slots;

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'status ch-status', role: 'status' });
      // The row the steps go into, in order: numbered places
      slots = recipe.steps.map(function (s, i) {
        return el('div', { class: 'ch-slot' }, [el('span', { class: 'ch-slot-num', 'aria-hidden': 'true', text: String(i + 1) })]);
      });
      row = el('div', { class: 'ch-row', role: 'list', 'aria-label': t('ch.row') }, slots);
      row.style.setProperty('--n', slots.length);

      // The steps, mixed up
      pile = el('div', { class: 'ch-pile', role: 'group', 'aria-label': t('ch.pile') });
      cards = SG.shuffle(recipe.steps.map(function (step, i) { return { step: step, order: i }; }));
      cards.forEach(function (card) {
        card.place = el('div', { class: 'ch-place' });
        card.button = el('button', { class: 'ch-card pressable', type: 'button', 'aria-label': stepName(card.step) }, [
          svg('svg', { class: 'ch-point', viewBox: '-8 -2 28 38', 'aria-hidden': 'true' }, [SG.handShape()]),
          el('span', { class: 'ch-pic', 'aria-hidden': 'true', text: card.step[0] }),
          el('span', { class: 'ch-words', 'aria-hidden': 'true', text: stepName(card.step) })
        ]);
        SG.onTap(card.button, function () { tap(card); });
        card.button.addEventListener('animationend', function () { card.button.classList.remove('ch-nope'); });
        card.place.appendChild(card.button);
        pile.appendChild(card.place);
      });

      layoutEl = el('div', { class: 'ch-layout' }, [statusEl, row, pile]);
      stage.appendChild(layoutEl);
    }

    // The mixed-up steps share the room below the row, as big as it allows
    function layout() {
      if (!pile) return;
      const top = pile.getBoundingClientRect().top;
      const availH = SG.bottom() - top - 12;
      const best = SG.gridFor(cards.length, pile.clientWidth, availH, GAP, 1.05);
      const size = Math.floor(SG.clamp(Math.min((pile.clientWidth - GAP * (best.cols - 1)) / best.cols, (availH - GAP * (best.rows - 1)) / best.rows), 96, 220));
      pile.style.setProperty('--cols', best.cols);
      pile.style.setProperty('--card', size + 'px');
    }

    function next() {
      return cards.filter(function (c) { return c.order === placed; })[0];
    }

    function tap(card) {
      if (done || busy || card.placed) return;
      cards.forEach(function (c) { c.button.classList.remove('ch-hint'); });
      if (card.order !== placed) {
        // Not yet: a little shake, and it stays where it is
        misses++;
        SG.sound.nope();
        SG.track.count('miss');
        if (!SG.reducedMotion()) card.button.classList.add('ch-nope');
        if (misses >= 2) {
          const n = next().button;
          n.getBoundingClientRect(); // restart the hand's three bobs
          n.classList.add('ch-hint');
          statusEl.textContent = t('ch.hint');
          SG.track.count('hint');
        } else {
          statusEl.textContent = t('ch.notYet');
        }
        return;
      }
      // Right: it glides up into its numbered place in the row
      misses = 0;
      busy = true;
      const slot = slots[placed];
      const from = card.button.getBoundingClientRect(), to = slot.getBoundingClientRect();
      if (!SG.reducedMotion()) {
        card.button.style.transition = 'transform ' + MOVE_MS + 'ms ease-in-out';
        card.button.style.transform = 'translate(' + (to.left + to.width / 2 - from.left - from.width / 2) + 'px, ' +
          (to.top + to.height / 2 - from.top - from.height / 2) + 'px) scale(' + (to.width / from.width) + ')';
      }
      timers.later(function () {
        card.placed = true;
        card.button.style.transition = card.button.style.transform = '';
        card.button.classList.add('ch-placed');
        card.button.setAttribute('aria-disabled', 'true');
        slot.appendChild(card.button);
        slot.classList.add('filled');
        placed++;
        busy = false;
        if (placed === cards.length) {
          done = true;
          statusEl.textContent = t('ch.last', recipe[SG.lang] || recipe.en);
          SG.sound.win();
          timers.later(showWin, WIN_PAUSE_MS);
          return;
        }
        SG.sound.good(placed);
        statusEl.textContent = t('ch.next');
      }, SG.reducedMotion() ? 0 : MOVE_MS);
    }

    function showWin() {
      const trophies = el('ol', { class: 'ch-trophies panel-trophies' }, recipe.steps.map(function (step) {
        return el('li', {}, [el('span', { class: 'ch-trophy-pic', 'aria-hidden': 'true', text: step[0] }), el('span', { text: stepName(step) })]);
      }));
      const panel = SG.winPanel(t('ch.win', recipe[SG.lang] || recipe.en), trophies, newGame, '#/chai/levels');
      stage.textContent = '';
      pile = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
      placed = 0;
      misses = 0;
      done = false;
      busy = false;
      render();
      statusEl.textContent = t('ch.start');
      layout();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      progress: function () {
        return done || !placed ? null : t('ch.progress', placed, cards.length);
      },
      destroy: function () {
        timers.clear();
        window.removeEventListener('resize', layout);
      },
      // for the playtest: the right order, and a jump to the finish screen
      order: function () { return cards.map(function (c) { return c.order; }); },
      finish: function () {
        timers.clear();
        showWin();
      }
    };
  }

  // A steaming cup of chai beside three numbered steps.
  // `opts.demo`: a hand taps the first step.
  function illustration(opts) {
    const parts = [];
    [['💧', 1], ['🍃', 2], ['🥛', 3]].forEach(function (s, i) {
      const x = 6 + i * 26, y = 8;
      parts.push(svg('rect', { x: x, y: y + 3, width: 22, height: 26, rx: 5, class: 'fill-deep' }));
      parts.push(svg('rect', { x: x, y: y, width: 22, height: 26, rx: 5, fill: '#FFFFFF', class: 'stroke-deep', 'stroke-width': 2 }));
      parts.push(svg('text', { x: x + 11, y: y + 14, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 13, style: 'font-family: var(--font-emoji)' }, [document.createTextNode(s[0])]));
      parts.push(svg('circle', { cx: x + 3, cy: y + 2, r: 5.5, class: 'fill-deep' }));
      parts.push(svg('text', { x: x + 3, y: y + 2.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 7, 'font-weight': 800, fill: '#FFFFFF' }, [document.createTextNode(String(s[1]))]));
    });
    // the cup
    parts.push(svg('path', { d: 'M34 50H86L80 80H40Z', fill: '#FFFFFF', stroke: '#1F2A44', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
    parts.push(svg('path', { d: 'M36 56H84', stroke: '#C68642', 'stroke-width': 7 }));
    parts.push(svg('path', { d: 'M86 56C98 56 98 72 83 72', fill: 'none', stroke: '#1F2A44', 'stroke-width': 2.5 }));
    parts.push(svg('path', { d: 'M28 84H92', stroke: '#1F2A44', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    parts.push(svg('path', { d: 'M52 46C48 40 56 38 52 32M62 46C58 40 66 38 62 32M72 46C68 40 76 38 72 32', fill: 'none', class: 'stroke-accent', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
    if (opts && opts.demo) parts.push(SG.demoHand(17, 24, 'tap'));
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, parts);
  }

  // Level pictures: the recipe's step pictures in a row
  function preview(key) {
    const box = el('div', { class: 'level-art level-art-ch', 'aria-hidden': 'true' });
    RECIPES[key].steps.forEach(function (s) { box.appendChild(el('span', { text: s[0] })); });
    return box;
  }

  SG.registerGame({
    key: 'chai',
    text: 'ch',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    preview: preview,
    levelName: function (key) { return RECIPES[key][SG.lang] || RECIPES[key].en; },
    detail: function (key) { return SG.t('ch.detail', RECIPES[key].steps.length); }
  });

  SG.chai = { recipes: RECIPES }; // for the playtest
})(window.SG);
