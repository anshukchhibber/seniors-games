// Sort into Baskets: one picture at a time; slide it into the basket where it belongs (fruit or
// vegetables, hot or cold...), or simply tap that basket. The baskets sit at the edges, so the
// hand has to reach; sorting things into groups is gentle thinking practice too.
//
// Nothing is ever "wrong": a picture put in the wrong basket just comes back, and a second try at
// the same picture shows which basket it goes in.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;

  // Each thing: [picture, English name, Hindi name, newer?]. `newer` pictures are left out on
  // tablets that cannot draw them.
  const GROUPS = {
    fruit: { en: 'Fruit', hi: 'फल', items: [
      ['🍎', 'Apple', 'सेब'], ['🍌', 'Banana', 'केला'], ['🍇', 'Grapes', 'अंगूर'], ['🍊', 'Orange', 'संतरा'],
      ['🍉', 'Watermelon', 'तरबूज़'], ['🥭', 'Mango', 'आम'], ['🍍', 'Pineapple', 'अनानास'], ['🍐', 'Pear', 'नाशपाती'],
      ['🍓', 'Strawberry', 'स्ट्रॉबेरी'], ['🍒', 'Cherries', 'चेरी']
    ] },
    veg: { en: 'Vegetables', hi: 'सब्ज़ियाँ', items: [
      ['🥕', 'Carrot', 'गाजर'], ['🥔', 'Potato', 'आलू'], ['🍆', 'Aubergine', 'बैंगन'], ['🌽', 'Corn', 'भुट्टा'],
      ['🥒', 'Cucumber', 'खीरा'], ['🥦', 'Broccoli', 'ब्रोकली'], ['🌶️', 'Chilli', 'मिर्च'],
      ['🧅', 'Onion', 'प्याज़', true], ['🧄', 'Garlic', 'लहसुन', true]
    ] },
    sweet: { en: 'Sweet things', hi: 'मीठी चीज़ें', items: [
      ['🍰', 'Cake', 'केक'], ['🍬', 'Sweet', 'टॉफ़ी'], ['🍫', 'Chocolate', 'चॉकलेट'], ['🍯', 'Honey', 'शहद'],
      ['🍩', 'Doughnut', 'डोनट'], ['🍪', 'Biscuit', 'बिस्कुट'], ['🍭', 'Lollipop', 'लॉलीपॉप']
    ] },
    hot: { en: 'Hot', hi: 'गरम', items: [
      ['☕', 'Cup of tea', 'चाय'], ['🔥', 'Fire', 'आग'], ['☀️', 'Sun', 'सूरज'], ['🍲', 'Hot soup', 'गरम सूप'],
      ['🕯️', 'Candle', 'मोमबत्ती']
    ] },
    cold: { en: 'Cold', hi: 'ठंडा', items: [
      ['🧊', 'Ice', 'बर्फ़'], ['🍦', 'Ice cream', 'आइसक्रीम'], ['⛄', 'Snowman', 'बर्फ़ का पुतला'],
      ['🍧', 'Ice gola', 'बर्फ़ का गोला'], ['🏔️', 'Snowy mountain', 'बर्फ़ीला पहाड़'], ['❄️', 'Snowflake', 'बर्फ़ का फाहा']
    ] },
    land: { en: 'Live on land', hi: 'ज़मीन पर रहते हैं', items: [
      ['🐘', 'Elephant', 'हाथी'], ['🐄', 'Cow', 'गाय'], ['🐒', 'Monkey', 'बंदर'], ['🐅', 'Tiger', 'बाघ'],
      ['🐪', 'Camel', 'ऊँट'], ['🐕', 'Dog', 'कुत्ता'], ['🐎', 'Horse', 'घोड़ा'], ['🐐', 'Goat', 'बकरी']
    ] },
    water: { en: 'Live in water', hi: 'पानी में रहते हैं', items: [
      ['🐟', 'Fish', 'मछली'], ['🐬', 'Dolphin', 'डॉल्फ़िन'], ['🐙', 'Octopus', 'ऑक्टोपस'], ['🦀', 'Crab', 'केकड़ा'],
      ['🐳', 'Whale', 'व्हेल'], ['🦈', 'Shark', 'शार्क']
    ] },
    sky: { en: 'Fly in the sky', hi: 'आसमान में उड़ते हैं', items: [
      ['🐦', 'Bird', 'चिड़िया'], ['🦋', 'Butterfly', 'तितली'], ['🦅', 'Eagle', 'चील'], ['🦜', 'Parrot', 'तोता'],
      ['🐝', 'Bee', 'मधुमक्खी'], ['🦉', 'Owl', 'उल्लू']
    ] },
    kitchen: { en: 'Kitchen', hi: 'रसोई', items: [
      ['🍳', 'Frying pan', 'फ़्राइंग पैन'], ['🥄', 'Spoon', 'चम्मच'], ['🍽️', 'Plate', 'थाली'], ['🧂', 'Salt', 'नमक'],
      ['🥣', 'Bowl', 'कटोरी'], ['🍴', 'Fork and knife', 'काँटा-छुरी'], ['☕', 'Cup', 'कप']
    ] },
    garden: { en: 'Garden', hi: 'बगीचा', items: [
      ['🌻', 'Sunflower', 'सूरजमुखी'], ['🌹', 'Rose', 'गुलाब'], ['🌳', 'Tree', 'पेड़'], ['🌱', 'Seedling', 'पौधा'],
      ['🐌', 'Snail', 'घोंघा'], ['🌼', 'Flower', 'फूल'], ['🐝', 'Bee', 'मधुमक्खी']
    ] },
    clothes: { en: 'Clothes', hi: 'कपड़े', items: [
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

  function basketArt() {
    return svg('svg', { class: 'so-basket-art', viewBox: '0 0 100 56', 'aria-hidden': 'true' }, [
      svg('path', { d: 'M10 16h80l-9 38H19z', fill: '#C68642', stroke: '#5B3A1A', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
      svg('path', { d: 'M14 29h72M17 41h66', stroke: '#8B5A2B', 'stroke-width': 3, 'stroke-linecap': 'round' }),
      svg('rect', { x: 4, y: 6, width: 92, height: 12, rx: 6, fill: '#A0652A', stroke: '#5B3A1A', 'stroke-width': 3 })
    ]);
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function mount(stage, levelKey, hooks) {
    const level = LEVELS[levelKey];
    const t = SG.t;
    const timers = SG.timers();
    hooks = hooks || {};

    let groups, queue, placed, current, tries, busy, settledAt, done, lastSet;
    let layoutEl, field, home, card, statusEl, baskets;
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
        all = all.concat(SG.shuffle(GROUPS[key].items.filter(canShow)).slice(0, per).map(function (item) {
          return { item: item, group: key };
        }));
      });
      queue = SG.shuffle(all).slice(0, level.things);
    }

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'status so-status', role: 'status' });
      home = el('div', { class: 'so-home' });

      baskets = groups.map(function (key) {
        const contents = el('span', { class: 'so-contents', 'aria-hidden': 'true' });
        const button = el('button', { class: 'so-basket pressable', type: 'button' }, [
          el('span', { class: 'so-basket-name', text: groupName(key) }),
          el('span', { class: 'so-basket-pic' }, [contents, basketArt()])
        ]);
        const basket = { key: key, button: button, contents: contents, count: 0 };
        SG.onTap(button, function () { tapBasket(basket); });
        return basket;
      });
      const row = el('div', { class: 'so-baskets', role: 'group', 'aria-label': t('so.baskets') },
        baskets.map(function (b) { return b.button; }));
      row.style.setProperty('--n', baskets.length);

      field = el('div', { class: 'so-field' }, [home, row]);
      layoutEl = el('div', { class: 'so-layout' }, [statusEl, field]);
      stage.appendChild(layoutEl);
    }

    // The play area fills the screen, so the baskets sit at the bottom corners within reach.
    function layout() {
      if (!field) return;
      const top = field.getBoundingClientRect().top + window.pageYOffset;
      field.style.minHeight = Math.max(360, window.innerHeight - top - 20) + 'px';
      const cardSize = SG.clamp(Math.min(field.clientWidth * 0.5, (window.innerHeight - top) * 0.34), 130, 210);
      field.style.setProperty('--card', Math.floor(cardSize) + 'px');
    }

    function showNext() {
      tries = 0;
      baskets.forEach(function (b) { b.button.classList.remove('so-hint'); });
      current = queue[placed];
      card = el('div', { class: 'so-card', role: 'img', 'aria-label': name(current.item) }, [
        el('span', { class: 'so-card-pic', 'aria-hidden': 'true', text: current.item[0] }),
        el('span', { class: 'so-card-name', 'aria-hidden': 'true', text: name(current.item) })
      ]);
      card.addEventListener('pointerdown', onDown);
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerup', onUp);
      card.addEventListener('pointercancel', onCancel);
      home.textContent = '';
      home.appendChild(card);
    }

    // Moves the card by (dx, dy) from its place, optionally gliding there.
    function moveCard(dx, dy, scale, glide) {
      card.style.transition = glide && !reducedMotion() ? 'transform ' + MOVE_MS + 'ms ease-out' : 'none';
      card.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)' + (scale ? ' scale(' + scale + ')' : '');
    }

    function centreOf(node) {
      const r = node.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // Puts the current thing into `basket`, which the player chose by sliding or tapping.
    function drop(basket, byTap) {
      const from = centreOf(home);
      if (basket.key !== current.group) {
        tries++;
        moveCard(0, 0, 0, true); // it simply comes back
        SG.sound.tap();
        if (tries === 1 && baskets.length > 1) {
          statusEl.textContent = t('so.wrong', name(current.item), groupName(basket.key));
        } else {
          const right = baskets.filter(function (b) { return b.key === current.group; })[0];
          right.button.classList.add('so-hint');
          statusEl.textContent = t('so.reveal', name(current.item), groupName(right.key));
        }
        return;
      }

      busy = true;
      const to = centreOf(basket.button.querySelector('.so-basket-pic'));
      moveCard(to.x - from.x, to.y - from.y, 0.35, true);
      const item = current.item;
      timers.later(function () {
        basket.count++;
        basket.contents.appendChild(el('span', { text: item[0] }));
        basket.button.setAttribute('aria-label', groupName(basket.key) + ', ' + basket.count);
        placed++;
        busy = false;
        if (byTap) settledAt = Date.now(); // a quick second tap on that basket is an accident, not the next answer
        const left = queue.length - placed;
        if (left === 0) {
          done = true;
          home.textContent = '';
          statusEl.textContent = t('so.last', name(item), groupName(basket.key));
          SG.sound.win();
          timers.later(showWin, WIN_PAUSE_MS);
          return;
        }
        statusEl.textContent = t('so.good', name(item), groupName(basket.key), left);
        SG.sound.found();
        showNext();
      }, reducedMotion() ? 0 : MOVE_MS);
    }

    function tapBasket(basket) {
      if (done || busy || drag || Date.now() - settledAt < SETTLE_MS) return;
      drop(basket, true);
    }

    // ----- Sliding the card -----

    function onDown(e) {
      if (done || busy || drag) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      card.classList.add('dragging');
    }

    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
      drag.moved = true;
      moveCard(dx, dy, 0, false);
      baskets.forEach(function (b) { b.button.classList.toggle('so-over', b === basketAt(e.clientX, e.clientY)); });
    }

    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null;
      card.classList.remove('dragging');
      baskets.forEach(function (b) { b.button.classList.remove('so-over'); });
      if (!moved) {
        moveCard(0, 0, 0, false);
        statusEl.textContent = t('so.tip', name(current.item));
        return;
      }
      const basket = basketAt(e.clientX, e.clientY);
      if (basket) drop(basket);
      else moveCard(0, 0, 0, true); // let go away from every basket: it floats back, nothing else happens
    }

    function onCancel(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      card.classList.remove('dragging');
      baskets.forEach(function (b) { b.button.classList.remove('so-over'); });
      moveCard(0, 0, 0, true);
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
      const panel = SG.winPanel(t('so.win', queue.length), trophies, newGame, '#/sorting');
      stage.textContent = '';
      field = null;
      stage.appendChild(panel);
      if (hooks.onWin) hooks.onWin();
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
      deal();
      placed = 0;
      busy = false;
      done = false;
      drag = null;
      settledAt = 0;
      render();
      showNext();
      statusEl.textContent = t('so.start');
      layout();
      if (hooks.onStart) hooks.onStart();
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

  function art() {
    return el('div', { class: 'art art-so', 'aria-hidden': 'true' }, [
      el('span', { class: 'art-so-card', text: SG.lang === 'hi' ? '🥭' : '🍎' }),
      el('span', { class: 'art-so-basket' }, [basketArt()]),
      el('span', { class: 'art-so-basket' }, [basketArt()])
    ]);
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
    category: 'hands',
    levels: LEVELS,
    mount: mount,
    art: art,
    preview: preview,
    detail: function (levelKey) { return SG.t('so.level', LEVELS[levelKey].baskets, LEVELS[levelKey].things); }
  });

  SG.sorting = { groups: GROUPS, sets: SETS }; // for the playtest's answer key
})(window.SG);
