// Anonymous usage counts, with Umami (https://umami.is): how many people play, and what each visit
// looks like - which games, which levels, how long, how many slips and hints. No cookies, no names,
// nothing that could identify anyone, and so no consent popup.
//
// It only ever runs on the live site (DOMAIN) and only when WEBSITE_ID is filled in: opened from the
// folder, on a test machine or in the playtest, nothing is sent. If the Umami script cannot load
// (offline, blocked), the app carries on exactly the same; events made offline wait on the tablet
// and are sent once it is back online (Umami then shows them at the time they were sent).
(function (SG) {
  'use strict';

  // ----- Settings -----
  const WEBSITE_ID = ''; // from Umami: Settings > Websites > Edit > Website ID. Empty = off.
  const SCRIPT = 'https://cloud.umami.is/script.js';
  const DOMAIN = 'anshukchhibber.github.io';

  const QUEUE_KEY = 'track.queue';
  const MAX_QUEUE = 200;
  const MAX_LOG = 100;

  let on = !!WEBSITE_ID && location.hostname === DOMAIN;
  const log = []; // the last events, kept in memory (the playtest reads it; nothing leaves the page)
  let current = null; // the game being played: { game, level, started, misses, hints, finished }

  function queued() {
    try {
      const q = JSON.parse(SG.store.get(QUEUE_KEY, '[]'));
      return Array.isArray(q) ? q : [];
    } catch (e) {
      return [];
    }
  }

  function saveQueue(q) {
    SG.store.set(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
  }

  function ready() {
    return on && window.umami && typeof window.umami.track === 'function' && navigator.onLine !== false;
  }

  function deliver(item) {
    if (item.kind === 'page') {
      window.umami.track(function (props) { return Object.assign({}, props, { url: item.url, title: item.title }); });
    } else {
      window.umami.track(item.name, item.data);
    }
  }

  // Sends everything that waited while the tablet was offline (or the script was still loading)
  function flush() {
    if (!ready()) return;
    const q = queued();
    if (!q.length) return;
    saveQueue([]);
    q.forEach(function (item) {
      try { deliver(item); } catch (e) { /* never let counting break the app */ }
    });
  }

  function send(item) {
    log.push(item);
    if (log.length > MAX_LOG) log.shift();
    if (!on) return;
    try {
      if (ready()) {
        flush();
        deliver(item);
        return;
      }
    } catch (e) { /* fall through to the queue */ }
    const q = queued();
    q.push(item);
    saveQueue(q);
  }

  function seconds() {
    return current ? Math.round((Date.now() - current.started) / 1000) : 0;
  }

  SG.track = {
    log: log,

    // A screen opened: the address after the # is the page, e.g. /#/tilematch/easy
    page: function () {
      const url = '/' + (location.hash || '#/');
      send({ kind: 'page', url: url, title: document.title });
    },

    event: function (name, data) {
      send({ kind: 'event', name: name, data: data || {} });
    },

    gameStart: function (game, level) {
      current = { game: game, level: level, started: Date.now(), misses: 0, hints: 0, finished: false };
      SG.track.event('game-start', { game: game, level: level });
    },

    // The finish screen (every game's ends in SG.winPanel)
    gameFinish: function () {
      if (!current || current.finished) return;
      current.finished = true;
      SG.track.event('game-finish', { game: current.game, level: current.level, seconds: seconds(), misses: current.misses, hints: current.hints });
    },

    // Left a game without finishing it. `progress`: was something under way?
    gameLeave: function (progress) {
      if (!current) return;
      if (!current.finished) {
        SG.track.event('game-leave', { game: current.game, level: current.level, seconds: seconds(), progress: !!progress, misses: current.misses, hints: current.hints });
      }
      current = null;
    },

    // "Play Again" on the finish screen: the same game and level, from the start
    again: function () {
      if (current) SG.track.gameStart(current.game, current.level);
    },

    // A gentle slip ('miss') or a hint asked for, in the game being played
    count: function (kind) {
      if (current && (kind === 'miss' || kind === 'hint')) current[kind === 'miss' ? 'misses' : 'hints']++;
    },

    game: function () {
      return current && current.game;
    },

    // for the playtest: pretend to be on the live site, with `stub` standing in for Umami
    testMode: function (stub) {
      on = !!stub;
      window.umami = stub;
    },
    flush: flush
  };

  if (on) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = SCRIPT;
    script.setAttribute('data-website-id', WEBSITE_ID);
    script.setAttribute('data-auto-track', 'false'); // the app sends its own page views (it lives after the #)
    script.setAttribute('data-domains', DOMAIN);
    script.onload = flush;
    document.head.appendChild(script);
    window.addEventListener('online', flush);
  }

  // The start of a visit: which language, installed as an app or in the browser, which size of screen
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  SG.track.event('app-open', {
    lang: SG.lang,
    standalone: !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true,
    screen: small ? 'phone' : touch ? 'tablet' : 'computer'
  });
})(window.SG);
