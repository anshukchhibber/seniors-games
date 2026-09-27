// Sort into Baskets: up to four pictures lie on the table; put each one into the basket where it
// belongs (fruit or vegetables, hot or cold...). Tap a picture and then its basket, or slide the
// picture there. The baskets sit at the bottom edge, so the hand has to reach; sorting things into
// groups is gentle thinking practice too. Each picture sorted makes room for the next one.
//
// Nothing is ever "wrong": a picture put in the wrong basket just comes back, and a second try at
// the same picture shows which basket it goes in.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;

  // Each thing: [picture, English name, Hindi name, newer?]. `newer` pictures are left out on
  // tablets that cannot draw them.
  // So that a basket can be understood without reading its name, each group also has
  //   sign  - one of its own pictures, shown as a label on the basket (and never dealt to be sorted)
  //   scene - what is drawn behind the basket: grass, water, sky, sun, snow... (see style.css);
  //           'plain' is just the group's own colour, `tint`.
  const GROUPS = {
    fruit: { en: 'Fruit', hi: 'फल', sign: '🍎', scene: 'plain', tint: '#FFE3C2', items: [
      ['🍎', 'Apple', 'सेब'], ['🍌', 'Banana', 'केला'], ['🍇', 'Grapes', 'अंगूर'], ['🍊', 'Orange', 'संतरा'],
      ['🍉', 'Watermelon', 'तरबूज़'], ['🥭', 'Mango', 'आम'], ['🍍', 'Pineapple', 'अनानास'], ['🍐', 'Pear', 'नाशपाती'],
      ['🍓', 'Strawberry', 'स्ट्रॉबेरी'], ['🍒', 'Cherries', 'चेरी']
    ] },
    veg: { en: 'Vegetables', hi: 'सब्ज़ियाँ', sign: '🥕', scene: 'plain', tint: '#DDF0CC', items: [
      ['🥕', 'Carrot', 'गाजर'], ['🥔', 'Potato', 'आलू'], ['🍆', 'Aubergine', 'बैंगन'], ['🌽', 'Corn', 'भुट्टा'],
      ['🥒', 'Cucumber', 'खीरा'], ['🥦', 'Broccoli', 'ब्रोकली'], ['🌶️', 'Chilli', 'मिर्च'],
      ['🧅', 'Onion', 'प्याज़', true], ['🧄', 'Garlic', 'लहसुन', true]
    ] },
    sweet: { en: 'Sweet things', hi: 'मीठी चीज़ें', sign: '🍰', scene: 'plain', tint: '#FCDDEA', items: [
      ['🍰', 'Cake', 'केक'], ['🍬', 'Sweet', 'टॉफ़ी'], ['🍫', 'Chocolate', 'चॉकलेट'], ['🍯', 'Honey', 'शहद'],
      ['🍩', 'Doughnut', 'डोनट'], ['🍪', 'Biscuit', 'बिस्कुट'], ['🍭', 'Lollipop', 'लॉलीपॉप']
    ] },
    hot: { en: 'Hot', hi: 'गरम', sign: '🔥', scene: 'hot', items: [
      ['☕', 'Cup of tea', 'चाय'], ['🔥', 'Fire', 'आग'], ['☀️', 'Sun', 'सूरज'], ['🍲', 'Hot soup', 'गरम सूप'],
      ['🕯️', 'Candle', 'मोमबत्ती']
    ] },
    cold: { en: 'Cold', hi: 'ठंडा', sign: '❄️', scene: 'cold', items: [
      ['🧊', 'Ice', 'बर्फ़'], ['🍦', 'Ice cream', 'आइसक्रीम'], ['⛄', 'Snowman', 'बर्फ़ का पुतला'],
      ['🍧', 'Ice gola', 'बर्फ़ का गोला'], ['🏔️', 'Snowy mountain', 'बर्फ़ीला पहाड़'], ['❄️', 'Snowflake', 'बर्फ़ का फाहा']
    ] },
    land: { en: 'Live on land', hi: 'ज़मीन पर रहते हैं', sign: '🐄', scene: 'land', items: [
      ['🐘', 'Elephant', 'हाथी'], ['🐄', 'Cow', 'गाय'], ['🐒', 'Monkey', 'बंदर'], ['🐅', 'Tiger', 'बाघ'],
      ['🐪', 'Camel', 'ऊँट'], ['🐕', 'Dog', 'कुत्ता'], ['🐎', 'Horse', 'घोड़ा'], ['🐐', 'Goat', 'बकरी']
    ] },
    water: { en: 'Live in water', hi: 'पानी में रहते हैं', sign: '🐟', scene: 'water', items: [
      ['🐟', 'Fish', 'मछली'], ['🐬', 'Dolphin', 'डॉल्फ़िन'], ['🐙', 'Octopus', 'ऑक्टोपस'], ['🦀', 'Crab', 'केकड़ा'],
      ['🐳', 'Whale', 'व्हेल'], ['🦈', 'Shark', 'शार्क']
    ] },
    sky: { en: 'Fly in the sky', hi: 'आसमान में उड़ते हैं', sign: '🐦', scene: 'sky', items: [
      ['🐦', 'Bird', 'चिड़िया'], ['🦋', 'Butterfly', 'तितली'], ['🦅', 'Eagle', 'चील'], ['🦜', 'Parrot', 'तोता'],
      ['🐝', 'Bee', 'मधुमक्खी'], ['🦉', 'Owl', 'उल्लू']
    ] },
    kitchen: { en: 'Kitchen', hi: 'रसोई', sign: '🍳', scene: 'plain', tint: '#F1E2CF', items: [
      ['🍳', 'Frying pan', 'फ़्राइंग पैन'], ['🥄', 'Spoon', 'चम्मच'], ['🍽️', 'Plate', 'थाली'], ['🧂', 'Salt', 'नमक'],
      ['🥣', 'Bowl', 'कटोरी'], ['🍴', 'Fork and knife', 'काँटा-छुरी'], ['☕', 'Cup', 'कप']
    ] },
    garden: { en: 'Garden', hi: 'बगीचा', sign: '🌻', scene: 'garden', items: [
      ['🌻', 'Sunflower', 'सूरजमुखी'], ['🌹', 'Rose', 'गुलाब'], ['🌳', 'Tree', 'पेड़'], ['🌱', 'Seedling', 'पौधा'],
      ['🐌', 'Snail', 'घोंघा'], ['🌼', 'Flower', 'फूल'], ['🐝', 'Bee', 'मधुमक्खी']
    ] },
    clothes: { en: 'Clothes', hi: 'कपड़े', sign: '👕', scene: 'plain', tint: '#E6E0F7', items: [
      ['👕', 'Shirt', 'कमीज़'], ['👗', 'Dress', 'फ़्रॉक'], ['👟', 'Shoe', 'जूता'], ['🧣', 'Scarf', 'मफ़लर'],
      ['🧦', 'Socks', 'मोज़े'], ['👒', 'Hat', 'टोपी'], ['🧤', 'Gloves', 'दस्ताने']
    ] }
  };

  // Which groups are sorted against each other. Nothing in a set belongs to two of its groups.
  const SETS = {
    2: [['fruit', 'veg'], ['hot', 'cold'], ['land', 'water'], ['kitchen', 'garden']],
    3: [['fruit', 'veg', 'sweet'], ['land', 'water', 'sky'], ['kitchen', 'garden', 'clothes']]
  };

  const LEVELS = {
    easy: { baskets: 2, things: 6 },
    medium: { baskets: 2, things: 10 },
    hard: { baskets: 3, things: 12 }
  };

  const TAP_SLOP = 14;        // px. A press that moves less than this is a tap, not a slide.
  const DROP_SLACK = 48;      // px. Letting go this close to a basket still counts as in it.
  const SETTLE_MS = 700;      // after a thing lands, taps on the baskets wait this long (accidental double taps)
  const MOVE_MS = 320;
  const WIN_PAUSE_MS = 2000;

  const drawable = {};
  function canShow(item) {
    if (!item[3]) return true;
    if (drawable[item[0]] === undefined) drawable[item[0]] = SG.canDraw(item[0]);
    return drawable[item[0]];
  }

  // A hand pointing down at a basket: shown over the right basket after a second try.
  function pointer() {
    return svg('svg', { class: 'so-point', viewBox: '-8 -2 28 38', 'aria-hidden': 'true' }, [SG.handShape()]);
  }

  function basketArt() {
    return svg('svg', { class: 'so-basket-art', viewBox: '0 0 100 56', 'aria-hidden': 'true' }, [
      svg('path', { d: 'M10 16h80l-9 38H19z', fill: '#C68642', stroke: '#5B3A1A', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      svg('path', { d: 'M14 29h72M17 41h66', stroke: '#8B5A2B', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      svg('rect', { x: 4, y: 6, width: 92, height: 12, rx: 6, fill: '#A0652A', stroke: '#5B3A1A', 'stroke-width': 3 })
    ]);
  }

  const TABLE = 4;       // pictures on the table at once
  const MIN_CARD = 130;  // px. If four cannot be this big on the screen, two are shown instead.
  const MAX_CARD = 200;
  const GAP = 16;

  function mount(stage, levelKey) {
    const level = LEVELS[levelKey];
    const t = SG.t;
    const timers = SG.timers();

    let groups, queue, dealt, placed, selected, busy, settledAt, done, lastSet, slotCount;
    let layoutEl, table, statusEl, slots, baskets;
    let drag = null;

    function name(item) {
      return item[SG.lang === 'hi' ? 2 : 1];
    }

    function groupName(key) {
      return GROUPS[key][SG.lang] || GROUPS[key].en;
    }

    function deal() {
      const sets = SETS[level.baskets].filter(function (s) { return s.join() !== lastSet; });
      groups = sets[SG.rand(sets.length)];
      lastSet = groups.join();
      const per = Math.ceil(level.things / groups.length);
      let all = [];
      groups.forEach(function (key) {
        const pile = GROUPS[key].items.filter(function (item) { return canShow(item) && item[0] !== GROUPS[key].sign; });
        all = all.concat(SG.shuffle(pile).slice(0, per).map(function (item) {
          return { item: item, group: key };
        }));
      });
      queue = SG.shuffle(all).slice(0, level.things);
    }

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'status so-status', role: 'status' });

      // Fixed places on the table: a picture leaving or arriving never moves the others.
      slots = [];
      for (let i = 0; i < slotCount; i++) slots.push({ el: el('div', { class: 'so-slot' }), card: null });
      table = el('div', { class: 'so-table', role: 'group', 'aria-label': t('so.table') }, slots.map(function (s) { return s.el; }));

      baskets = groups.map(function (key) {
        const group = GROUPS[key];
        const contents = el('span', { class: 'so-contents', 'aria-hidden': 'true' });
        // The basket stands in its own little scene, with a picture label on its front
        const button = el('button', { class: 'so-basket pressable so-scene-' + group.scene, type: 'button' }, [
          pointer(),
          el('span', { class: 'so-basket-name', text: groupName(key) }),
          el('span', { class: 'so-basket-pic' }, [
            contents,
            el('span', { class: 'so-basket-body' }, [basketArt(), el('span', { class: 'so-sign', 'aria-hidden': 'true', text: group.sign })])
          ])
        ]);
        if (group.tint) button.style.setProperty('--scene', group.tint);
        const basket = { key: key, button: button, contents: contents, count: 0 };
        SG.onTap(button, function () { tapBasket(basket); });
        button.addEventListener('animationend', function () { button.classList.remove('so-wobble'); });
        return basket;
      });
      const row = el('div', { class: 'so-baskets', role: 'group', 'aria-label': t('so.baskets') },
        baskets.map(function (b) { return b.button; }));
      row.style.setProperty('--n', baskets.length);

      layoutEl = el('div', { class: 'so-layout' }, [statusEl, table, row]);
      stage.appendChild(layoutEl);
    }

    // The table takes all the room above the baskets; the pictures are as big as it allows.
    function cardSize() {
      const top = table.getBoundingClientRect().top + window.pageYOffset;
      const row = layoutEl.lastChild;
      const availH = window.innerHeight - top - row.offsetHeight - 2 * GAP - 12;
      const grid = SG.bestGrid(slotCount, table.clientWidth, availH, GAP);
      return { size: Math.floor(Math.min(grid.cell, MAX_CARD)), cols: grid.cols };
    }

    function layout() {
      if (!table) return;
      const top = layoutEl.getBoundingClientRect().top + window.pageYOffset;
      layoutEl.style.minHeight = Math.max(0, window.innerHeight - top - 22) + 'px';
      const fit = cardSize();
      table.style.setProperty('--card', Math.max(fit.size, 100) + 'px');
      table.style.setProperty('--cols', fit.cols);
    }

    function makeCard(entry) {
      const node = el('div', { class: 'so-card', role: 'button', tabindex: '0', 'aria-label': name(entry.item) }, [
        el('span', { class: 'so-card-pic', 'aria-hidden': 'true', text: entry.item[0] }),
        el('span', { class: 'so-card-name', 'aria-hidden': 'true', text: name(entry.item) })
      ]);
      const card = { entry: entry, el: node, tries: 0 };
      node.addEventListener('pointerdown', function (e) { onDown(e, card); });
      node.addEventListener('pointermove', onMove);
      node.addEventListener('pointerup', onUp);
      node.addEventListener('pointercancel', onCancel);
      node.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        select(card);
      });
      return card;
    }

    // Fills every empty place on the table from the pile.
    function fillTable() {
      slots.forEach(function (slot) {
        if (slot.card || dealt >= queue.length) return;
        slot.card = makeCard(queue[dealt++]);
        slot.card.slot = slot;
        slot.el.appendChild(slot.card.el);
      });
    }

    function cardsOnTable() {
      return slots.filter(function (s) { return s.card; }).map(function (s) { return s.card; });
    }

    function clearHints() {
      baskets.forEach(function (b) { b.button.classList.remove('so-hint'); });
    }

    // Tapping a picture picks it up: it lifts and gets a thick outline, and the status line
    // says what to do next. Tapping it again changes nothing (so a double tap is harmless).
    function select(card) {
      if (done || busy) return;
      if (selected !== card) {
        if (selected) selected.el.classList.remove('so-selected');
        clearHints();
        selected = card;
        card.el.classList.add('so-selected');
      }
      SG.sound.tap();
      statusEl.textContent = t('so.pick', name(card.entry.item));
    }

    // Moves a card by (dx, dy) from its place, optionally gliding there.
    function moveCard(card, dx, dy, scale, glide) {
      card.el.style.transition = glide && !SG.reducedMotion() ? 'transform ' + MOVE_MS + 'ms ease-out' : 'none';
      card.el.style.transform = dx || dy || scale ? 'translate(' + dx + 'px, ' + dy + 'px)' + (scale ? ' scale(' + scale + ')' : '') : '';
    }

    function centreOf(node) {
      const r = node.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // Puts `card` into `basket`, which the player chose by sliding or tapping.
    function drop(card, basket, byTap) {
      const item = card.entry.item;
      if (basket.key !== card.entry.group) {
        card.tries++;
        moveCard(card, 0, 0, 0, true); // it simply comes back
        SG.sound.tap();
        if (card.tries === 1 && baskets.length > 1) {
          statusEl.textContent = t('so.wrong', name(item), groupName(basket.key));
        } else {
          const right = baskets.filter(function (b) { return b.key === card.entry.group; })[0];
          right.button.classList.add('so-hint');
          statusEl.textContent = t('so.reveal', name(item), groupName(right.key));
        }
        return;
      }

      busy = true;
      const from = centreOf(card.slot.el);
      const to = centreOf(basket.button.querySelector('.so-basket-pic'));
      moveCard(card, to.x - from.x, to.y - from.y, 0.3, true);
      timers.later(function () {
        card.slot.el.removeChild(card.el);
        card.slot.card = null;
        if (selected === card) selected = null;
        clearHints();
        basket.count++;
        basket.contents.appendChild(el('span', { text: item[0] }));
        basket.button.setAttribute('aria-label', groupName(basket.key) + ', ' + basket.count);
        if (!SG.reducedMotion()) basket.button.classList.add('so-wobble');
        placed++;
        busy = false;
        if (byTap) settledAt = Date.now(); // a quick second tap on that basket is an accident, not the next answer
        const left = queue.length - placed;
        if (left === 0) {
          done = true;
          statusEl.textContent = t('so.last', name(item), groupName(basket.key));
          SG.sound.win();
          timers.later(showWin, WIN_PAUSE_MS);
          return;
        }
        statusEl.textContent = t('so.good', name(item), groupName(basket.key), left);
        SG.sound.good(placed - 1);
        fillTable();
      }, SG.reducedMotion() ? 0 : MOVE_MS);
    }

    // A basket tap puts the picked-up picture in it (or the last picture, when only one is left).
    function tapBasket(basket) {
      if (done || busy || drag || Date.now() - settledAt < SETTLE_MS) return;
      const onTable = cardsOnTable();
      const card = selected || (onTable.length === 1 ? onTable[0] : null);
      if (!card) {
        statusEl.textContent = t('so.tapFirst');
        return;
      }
      drop(card, basket, true);
    }

    // ----- Sliding a card -----

    function onDown(e, card) {
      if (done || busy || drag) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      drag = { id: e.pointerId, card: card, x: e.clientX, y: e.clientY, moved: false };
      try { card.el.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    }

    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
      if (!drag.moved) {
        drag.moved = true;
        if (selected !== drag.card) select(drag.card); // the picture being slid is the one picked up
        drag.card.el.classList.add('dragging');
      }
      moveCard(drag.card, dx, dy, 0, false);
      baskets.forEach(function (b) { b.button.classList.toggle('so-over', b === basketAt(e.clientX, e.clientY)); });
    }

    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const card = drag.card, moved = drag.moved;
      drag = null;
      card.el.classList.remove('dragging');
      baskets.forEach(function (b) { b.button.classList.remove('so-over'); });
      if (!moved) {
        moveCard(card, 0, 0, 0, false);
        select(card);
        return;
      }
      const basket = basketAt(e.clientX, e.clientY);
      if (basket) drop(card, basket);
      else moveCard(card, 0, 0, 0, true); // let go away from every basket: it floats back, nothing else happens
    }

    function onCancel(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const card = drag.card;
      drag = null;
      card.el.classList.remove('dragging');
      baskets.forEach(function (b) { b.button.classList.remove('so-over'); });
      moveCard(card, 0, 0, 0, true);
    }

    function basketAt(x, y) {
      let best = null, bestDistance = Infinity;
      baskets.forEach(function (b) {
        const r = b.button.getBoundingClientRect();
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        const distance = Math.hypot(dx, dy);
        if (distance <= DROP_SLACK && distance < bestDistance) { best = b; bestDistance = distance; }
      });
      return best;
    }

    function showWin() {
      const trophies = el('div', { class: 'so-trophies panel-trophies', 'aria-hidden': 'true' }, baskets.map(function (b) {
        return el('div', { class: 'so-trophy' }, [
          el('span', { class: 'so-trophy-name', text: groupName(b.key) }),
          el('span', { class: 'so-trophy-pics', text: b.contents.textContent })
        ]);
      }));
      const panel = SG.winPanel(t('so.win', queue.length), trophies, newGame, '#/sorting/levels');
      stage.textContent = '';
      table = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
      deal();
      dealt = 0;
      placed = 0;
      selected = null;
      busy = false;
      done = false;
      drag = null;
      settledAt = 0;
      // Four pictures if they can be big on this screen, otherwise two. Decided once, before play.
      slotCount = Math.min(TABLE, queue.length);
      render();
      if (slotCount > 2 && cardSize().size < MIN_CARD) {
        slotCount = 2;
        render();
      }
      fillTable();
      statusEl.textContent = t('so.start');
      layout();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      progress: function () {
        return done || !placed ? null : t('so.progress', placed, queue.length);
      },
      destroy: function () {
        timers.clear();
        window.removeEventListener('resize', layout);
      }
    };
  }

  // A basket with fruit in it, and an apple on its way in.
  // `opts.demo`: a hand carries the apple into the basket.
  function illustration(opts) {
    const demo = opts && opts.demo;
    const basket = basketArt();
    basket.removeAttribute('class');
    basket.setAttribute('x', 16);
    basket.setAttribute('y', 40);
    basket.setAttribute('width', 84);
    basket.setAttribute('height', 47);
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, [
      svg('circle', { cx: 46, cy: 44, r: 11, fill: '#FB8C00', stroke: '#8A4B00', 'stroke-width': 1.8 }),
      svg('circle', { cx: 67, cy: 42, r: 11, fill: '#8BC34A', stroke: '#33691E', 'stroke-width': 1.8 }),
      basket,
      svg('path', { d: 'M83 28Q80 38 72 40', fill: 'none', class: 'stroke-accent', 'stroke-width': 3, 'stroke-dasharray': '3.5 4', 'stroke-linecap': 'round' })
    ].concat(demo
      ? [SG.demoHand(92, 22, 'slide', -32, 22, [svg('g', { transform: 'translate(-92 -22)' }, apple())])]
      : apple()));
  }

  function apple() {
    return [
      svg('path', { d: 'M92 7V12', stroke: '#5B3A1A', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
      svg('path', { d: 'M92 9C95 4 101 4 103 6 100 10 95 11 92 9z', fill: '#66BB6A', stroke: '#2E7D32', 'stroke-width': 1.5 }),
      svg('path', { d: 'M92 13C86 9 79 13 79 21 79 29 85 35 92 33 99 35 105 29 105 21 105 13 98 9 92 13z', fill: '#E53935', stroke: '#8E1B1B', 'stroke-width': 1.8 })
    ];
  }

  function preview(levelKey) {
    // Dots for the things to sort, above a basket for each group.
    const things = el('div', { class: 'level-art-things' });
    for (let i = 0; i < LEVELS[levelKey].things; i++) things.appendChild(el('span'));
    const row = el('div', { class: 'level-art-baskets' });
    for (let i = 0; i < LEVELS[levelKey].baskets; i++) row.appendChild(basketArt());
    return el('div', { class: 'level-art level-art-so', 'aria-hidden': 'true' }, [things, row]);
  }

  SG.registerGame({
    key: 'sorting',
    text: 'so',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    preview: preview,
    detail: function (levelKey) { return SG.t('so.level', LEVELS[levelKey].baskets, LEVELS[levelKey].things); }
  });

  SG.sorting = { groups: GROUPS, sets: SETS }; // for the playtest's answer key
})(window.SG);
