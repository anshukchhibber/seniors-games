// Harmonium: big keys marked with the sargam, each with its own colour and a warm reed sound.
// Play freely, or play along with a song they know: the words run along the top, the syllable
// being sung is lit, and a hand points at its key.
//
// Playing an instrument works each finger in turn. Nothing is ever wrong: another key simply plays
// its own note, and the lit key waits. A key sounds the moment the finger lands (music cannot wait
// for the finger to lift) and holds its note for as long as it is pressed.
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;
  const INK = '#1F2A44';

  // The seven notes, each with its colour (a rainbow, so a key can be found by colour as well as
  // by name), and its distance in semitones above Sa. Komal notes are a semitone lower; tivra Ma a
  // semitone higher.
  const NOTES = {
    S: { hi: 'सा', en: 'Sa', step: 0, color: '#E53935' },
    R: { hi: 'रे', en: 'Re', step: 2, color: '#FB8C00' },
    G: { hi: 'ग', en: 'Ga', step: 4, color: '#FDD835' },
    M: { hi: 'म', en: 'Ma', step: 5, color: '#7CB342' },
    P: { hi: 'प', en: 'Pa', step: 7, color: '#26A69A' },
    D: { hi: 'ध', en: 'Dha', step: 9, color: '#1E88E5' },
    N: { hi: 'नि', en: 'Ni', step: 11, color: '#8E24AA' }
  };
  const SA = 261.63; // Sa is middle C

  // A note as written: S R G M P D N; lower case for komal (r g d n); M# for tivra Ma; a dot in
  // front for the low octave (.D) and an apostrophe after for the high one (S').
  function note(code) {
    const low = code.charAt(0) === '.';
    const high = /'$/.test(code);
    const c = code.replace(/^\./, '').replace(/'$/, '');
    const letter = c.charAt(0).toUpperCase();
    const komal = c.charAt(0) !== letter;
    const tivra = c.indexOf('#') > 0;
    const octave = low ? -1 : high ? 1 : 0;
    const semis = NOTES[letter].step - (komal ? 1 : 0) + (tivra ? 1 : 0) + 12 * octave;
    return { code: code, letter: letter, komal: komal, tivra: tivra, octave: octave, semis: semis, freq: SA * Math.pow(2, semis / 12) };
  }

  // Songs, one line of words per entry. Each part is [notes, syllable in Hindi, syllable in roman
  // letters]. Notes: one or more joined by +, each with :beats if longer than one beat.
  // The notes were checked against several published harmonium notations; the note lengths are
  // approximate (none of the notations give the rhythm).
  const SONGS = {
    birthday: {
      lines: [
        [['.P', 'है', 'Hap'], ['.P', 'प्पी', 'py'], ['.D:2', 'बर्थ', 'birth'], ['.P:2', 'डे', 'day'], ['S:2', 'टू', 'to'], ['.N:4', 'यू', 'you']],
        [['.P', 'है', 'Hap'], ['.P', 'प्पी', 'py'], ['.D:2', 'बर्थ', 'birth'], ['.P:2', 'डे', 'day'], ['R:2', 'टू', 'to'], ['S:4', 'यू', 'you']],
        [['.P', 'है', 'Hap'], ['.P', 'प्पी', 'py'], ['P:2', 'बर्थ', 'birth'], ['G:2', 'डे', 'day'], ['S:2', 'डियर', 'dear'], ['.N+.D:4', 'फ्रेंड', 'friend']],
        [['M', 'है', 'Hap'], ['M', 'प्पी', 'py'], ['G:2', 'बर्थ', 'birth'], ['S:2', 'डे', 'day'], ['R:2', 'टू', 'to'], ['S:4', 'यू', 'you']]
      ]
    },
    aarti: {
      lines: [
        [['S:2', 'ॐ', 'Om'], ['S:2', 'जय', 'Jai'], ['S', 'ज', 'Ja'], ['S', 'ग', 'ga'], ['S:2', 'दी', 'dee'], ['.N', 'श', 'sha'], ['S', 'ह', 'Ha'], ['R:4', 'रे', 're']],
        [['R', 'स्वा', 'Swaa'], ['G', 'मी', 'mi'], ['M:2', 'जय', 'Jai'], ['P', 'ज', 'Ja'], ['P', 'ग', 'ga'], ['D+P', 'दी', 'dee'], ['M', 'श', 'sha'], ['G+M', 'ह', 'Ha'], ['G+R:4', 'रे', 're']],
        [['R', 'भ', 'Bha'], ['G', 'क्त', 'kta'], ['R', 'ज', 'ja'], ['G+M:2', 'नों', 'non'], ['M+G', 'के', 'ke'], ['R+G', 'सं', 'san'], ['R+S:3', 'कट', 'kat']],
        [['.N+S', 'क्षण', 'Kshan'], ['R:2', 'में', 'mein'], ['G+R+S', 'दूर', 'door'], ['.N+S', 'क', 'ka'], ['.N+.D:4', 'रे', 're']],
        [['R:2', 'ॐ', 'Om'], ['R:2', 'जय', 'Jai'], ['R', 'ज', 'Ja'], ['R', 'ग', 'ga'], ['G+R', 'दी', 'dee'], ['S', 'श', 'sha'], ['.N', 'ह', 'Ha'], ['S:4', 'रे', 're']]
      ]
    },
    raghupati: {
      lines: [
        [['S', 'र', 'Ra'], ['S', 'घु', 'ghu'], ['S', 'प', 'pa'], ['S', 'ति', 'ti'], ['S:2', 'रा', 'Raa'], ['.n', 'घ', 'gha'], ['.D', 'व', 'va'], ['.n:2', 'रा', 'Raa'], ['R:2', 'जा', 'ja'], ['R+M+G+M:2', 'राम', 'Ram']],
        [['R', 'प', 'pa'], ['g', 'ति', 'ti'], ['R', 'त', 'ta'], ['S:2', 'पा', 'paa'], ['.n', 'व', 'va'], ['.D', 'न', 'na'], ['.n:2', 'सी', 'See'], ['g', 'ता', 'ta'], ['R', 'रा', 'Raa'], ['S:4', 'म', 'm']],
        [['G:2', 'सी', 'See'], ['G:2', 'ता', 'ta'], ['G+R+S:2', 'राम', 'Ram'], ['M:2', 'सी', 'See'], ['M+G', 'ता', 'ta'], ['M:4', 'राम', 'Ram']],
        [['R:2', 'भज', 'Bhaj'], ['M:2', 'प्या', 'pyaa'], ['P:2', 'रे', 're'], ['d+P', 'तू', 'tu'], ['M', 'सी', 'See'], ['g', 'ता', 'ta'], ['R+g', 'रा', 'Raa'], ['R+S:3', 'म', 'm']]
      ]
    },
    // The official short version: the first and the last lines
    anthem: {
      lines: [
        [['S', 'ज', 'Ja'], ['R', 'न', 'na'], ['G', 'ग', 'ga'], ['G', 'ण', 'na'], ['G', 'म', 'ma'], ['G', 'न', 'na'], ['G', 'अ', 'a'], ['G', 'धि', 'dhi'], ['G:2', 'ना', 'naa'], ['G', 'य', 'ya'], ['G', 'क', 'ka'], ['R', 'ज', 'ja'], ['G', 'य', 'ya'], ['M:3', 'हे', 'he']],
        [['G:2', 'भा', 'Bhaa'], ['G', 'र', 'ra'], ['G', 'त', 'ta'], ['R:2', 'भा', 'bhaa'], ['R', 'ग्य', 'gya'], ['R', 'वि', 'vi'], ['.N', 'धा', 'dhaa'], ['R+S:3', 'ता', 'taa']],
        [['N', 'ज', 'Ja'], ['N', 'य', 'ya'], ["S':2", 'हे', 'he'], ['N', 'ज', 'Ja'], ['D', 'य', 'ya'], ['N:2', 'हे', 'he'], ['D', 'ज', 'Ja'], ['P', 'य', 'ya'], ['D:2', 'हे', 'he']],
        [['S', 'ज', 'Ja'], ['S', 'य', 'ya'], ['R', 'ज', 'ja'], ['R', 'य', 'ya'], ['G', 'ज', 'ja'], ['G', 'य', 'ya'], ['R', 'ज', 'ja'], ['G', 'य', 'ya'], ['M:4', 'हे', 'he']]
      ]
    }
  };

  const FREE_KEYS = ['S', 'R', 'G', 'M', 'P', 'D', 'N', "S'"];
  const LEVELS = { free: {}, birthday: { song: 'birthday' }, aarti: { song: 'aarti' }, raghupati: { song: 'raghupati' }, anthem: { song: 'anthem' } };

  const BEAT_MS = 430;       // the pace of "Listen"
  const TAP_NOTE_MS = 380;   // how long a note sounds for a key pressed by keyboard
  const NEXT_LINE_MS = 700;
  const WIN_PAUSE_MS = 2200;
  const GAP = 10;

  // A song as the player meets it: lines of notes, each note with the syllable it starts (or ''
  // when it carries on the syllable before), and the keys it needs, low to high.
  function prepare(songKey) {
    const lines = SONGS[songKey].lines.map(function (line) {
      const out = [];
      line.forEach(function (part) {
        part[0].split('+').forEach(function (token, i) {
          const bits = token.split(':');
          out.push({ note: note(bits[0]), beats: bits[1] ? +bits[1] : 1, hi: i ? '' : part[1], en: i ? '' : part[2] });
        });
      });
      return out;
    });
    const seen = {};
    const keys = [];
    lines.forEach(function (line) {
      line.forEach(function (n) {
        if (seen[n.note.code]) return;
        seen[n.note.code] = true;
        keys.push(n.note);
      });
    });
    keys.sort(function (a, b) { return a.semis - b.semis; });
    return { lines: lines, keys: keys };
  }

  function keyName(n) {
    return NOTES[n.letter][SG.lang === 'hi' ? 'hi' : 'en'];
  }

  // The name as it is said: "low Dha", "komal Ga"... (for screen readers)
  function keyLabel(n) {
    const t = SG.t;
    return [n.octave < 0 ? t('hm.low') : '', n.octave > 0 ? t('hm.high') : '', n.komal ? t('hm.komal') : '', n.tivra ? t('hm.tivra') : '', keyName(n)]
      .filter(Boolean).join(' ');
  }

  function mount(stage, levelKey) {
    const level = LEVELS[levelKey];
    const t = SG.t;
    const timers = SG.timers();
    const song = level.song ? prepare(level.song) : null;
    const keys = song ? song.keys : FREE_KEYS.map(note);
    const songName = SG.t('hm.level.' + levelKey);

    let line, pos, done, listening;
    let layoutEl, board, keyEls, stripEl, statusEl, listenBtn;

    function render() {
      stage.textContent = '';
      statusEl = el('p', { class: 'status hm-status', role: 'status' });
      // The words of the line being played: the syllable to play now is lit
      stripEl = el('div', { class: 'hm-strip', 'aria-hidden': 'true' });

      keyEls = keys.map(function (n, i) {
        const key = el('button', {
          class: 'hm-key pressable' + (n.octave < 0 ? ' hm-low' : '') + (n.octave > 0 ? ' hm-high' : '') + (n.komal ? ' hm-komal' : '') + (n.tivra ? ' hm-tivra' : ''),
          type: 'button',
          'aria-label': keyLabel(n)
        }, [
          svg('svg', { class: 'hm-point', viewBox: '-8 -2 28 38', 'aria-hidden': 'true' }, [SG.handShape()]),
          el('span', { class: 'hm-cap', 'aria-hidden': 'true' }),
          el('span', { class: 'hm-name', 'aria-hidden': 'true', text: keyName(n) })
        ]);
        key.style.setProperty('--key', NOTES[n.letter].color);
        bindKey(key, i);
        return key;
      });
      board = el('div', { class: 'hm-board', role: 'group', 'aria-label': t('hm.board') }, keyEls);

      const parts = [statusEl];
      if (song) parts.push(stripEl);
      parts.push(el('div', { class: 'hm-board-wrap' }, [board]));
      if (song) {
        listenBtn = SG.iconButton('btn btn-secondary hm-listen', 'sound', t('hm.listen'));
        SG.onTap(listenBtn, listen);
        parts.push(el('div', { class: 'hm-foot' }, [listenBtn]));
      }
      layoutEl = el('div', { class: 'hm-layout' + (song ? '' : ' hm-free') }, parts);
      stage.appendChild(layoutEl);
    }

    // A key sounds while it is held. Only the finger that pressed it can stop it.
    function bindKey(key, i) {
      const held = {};
      key.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        try { key.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
        held[e.pointerId] = SG.sound.reed(keys[i].freq);
        key.classList.add('sounding');
        played(i);
      });
      function up(e) {
        if (!held[e.pointerId]) return;
        held[e.pointerId]();
        delete held[e.pointerId];
        if (!Object.keys(held).length) key.classList.remove('sounding');
      }
      key.addEventListener('pointerup', up);
      key.addEventListener('pointercancel', up);
      // Keyboard, switch access and screen readers: a short note
      key.addEventListener('click', function (e) {
        if (e.detail !== 0) return; // a real press already played on pointerdown
        const release = SG.sound.reed(keys[i].freq);
        key.classList.add('sounding');
        timers.later(function () { release(); key.classList.remove('sounding'); }, TAP_NOTE_MS);
        played(i);
      });
    }

    // Big keys: all in one row when each can be at least 64px wide, otherwise two rows.
    function layout() {
      if (!board) return;
      const wrap = board.parentNode;
      const top = wrap.getBoundingClientRect().top;
      const foot = layoutEl.querySelector('.hm-foot');
      const cs = getComputedStyle(board);
      const handRoom = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); // the pointing hand and the raised edge
      // Listen sits below the keys, or beside the words on a short, wide screen (see style.css)
      const footBelow = foot && foot.getBoundingClientRect().top >= top;
      const availW = wrap.clientWidth;
      const availH = SG.bottom() - top - handRoom - (footBelow ? foot.offsetHeight + 14 : 0) - 10;
      const count = keys.length;
      const cols = (availW - GAP * (count - 1)) / count >= 64 ? count : Math.ceil(count / 2);
      const rows = Math.ceil(count / cols);
      const w = Math.floor(Math.min((availW - GAP * (cols - 1)) / cols, 130));
      const h = Math.floor(SG.clamp((availH - GAP * (rows - 1)) / rows, 72, w * 2.6));
      board.style.setProperty('--cols', cols);
      board.style.setProperty('--key-w', w + 'px');
      board.style.setProperty('--key-h', h + 'px');
    }

    function current() {
      return song.lines[line][pos];
    }

    function keyIndex(n) {
      return keys.findIndex(function (k) { return k.code === n.note.code; });
    }

    function drawStrip() {
      stripEl.textContent = '';
      song.lines[line].forEach(function (n, i) {
        const word = n[SG.lang === 'hi' ? 'hi' : 'en'];
        const chip = el('span', { class: 'hm-chip' + (word ? '' : ' hm-held') + (i < pos ? ' done' : '') + (i === pos && !done ? ' next' : ''), text: word || '–' });
        chip.style.setProperty('--key', NOTES[n.note.letter].color);
        stripEl.appendChild(chip);
      });
    }

    function showNext() {
      keyEls.forEach(function (k) { k.classList.remove('hm-next'); });
      if (done) return;
      const k = keyEls[keyIndex(current())];
      k.getBoundingClientRect(); // restart the pointing hand's three bobs
      k.classList.add('hm-next');
    }

    function played(i) {
      if (!song) {
        statusEl.textContent = keyName(keys[i]);
        return;
      }
      if (done || listening) return;
      if (i !== keyIndex(current())) {
        // Not the lit key: it simply plays its note, and the lit key waits
        statusEl.textContent = t('hm.other');
        SG.track.count('miss');
        return;
      }
      pos++;
      if (pos < song.lines[line].length) {
        statusEl.textContent = t('hm.follow');
        drawStrip();
        showNext();
        return;
      }
      // The end of a line
      drawStrip();
      keyEls.forEach(function (k) { k.classList.remove('hm-next'); });
      if (line === song.lines.length - 1) {
        done = true;
        statusEl.textContent = t('hm.last');
        timers.later(function () { SG.sound.win(); }, 500);
        timers.later(showWin, WIN_PAUSE_MS);
        return;
      }
      statusEl.textContent = t('hm.lineDone', line + 2, song.lines.length);
      listening = true; // a moment's pause before the next line, so a quick extra tap is not taken as its first note
      timers.later(function () {
        listening = false;
        line++;
        pos = 0;
        drawStrip();
        showNext();
        statusEl.textContent = t('hm.follow');
      }, NEXT_LINE_MS);
    }

    // Plays the line being learned, with its rhythm; each key lights as it sounds.
    // Only ever started by pressing "Listen".
    function listen() {
      if (done || listening) return;
      listening = true;
      statusEl.textContent = t('hm.listening');
      let at = 250;
      song.lines[line].forEach(function (n) {
        const ms = n.beats * BEAT_MS;
        timers.later(function () {
          const release = SG.sound.reed(n.note.freq);
          const k = keyEls[keyIndex(n)];
          k.classList.add('sounding');
          timers.later(function () { release(); k.classList.remove('sounding'); }, ms * 0.85);
        }, at);
        at += ms;
      });
      timers.later(function () {
        listening = false;
        statusEl.textContent = t('hm.yourTurn');
      }, at + 150);
    }

    function showWin() {
      const panel = SG.winPanel(t('hm.win', songName), null, newGame, '#/harmonium/levels');
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      panel.querySelector('.panel-title').focus();
    }

    function newGame() {
      timers.clear();
      line = 0;
      pos = 0;
      done = false;
      listening = false;
      render();
      if (song) {
        drawStrip();
        showNext();
        statusEl.textContent = t('hm.start');
      } else {
        statusEl.textContent = t('hm.free');
      }
      layout();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      progress: function () {
        return !song || done || (line === 0 && pos === 0) ? null : t('hm.progress', songName);
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

  // A harmonium: a wooden box, bellows behind, a row of keys with coloured tops.
  // `opts.demo`: a hand presses a key.
  function illustration(opts) {
    const parts = [
      // bellows
      svg('path', { d: 'M18 8H102L96 30H24Z', fill: '#E8D5BE', stroke: INK, 'stroke-width': 2, 'stroke-linejoin': 'round' }),
      svg('path', { d: 'M22 15H98M24 22H96', stroke: '#B08B65', 'stroke-width': 2 }),
      // wooden box
      svg('rect', { x: 8, y: 30, width: 104, height: 54, rx: 7, class: 'fill-accent', stroke: INK, 'stroke-width': 2.5 }),
      svg('rect', { x: 14, y: 36, width: 92, height: 42, rx: 4, fill: '#FFFFFF', stroke: INK, 'stroke-width': 2 })
    ];
    FREE_KEYS.forEach(function (code, i) {
      const x = 16 + i * 11.2;
      parts.push(svg('rect', { x: x, y: 38, width: 10, height: 38, rx: 2, fill: '#FFFFFF', stroke: INK, 'stroke-width': 1.3 }));
      parts.push(svg('rect', { x: x, y: 38, width: 10, height: 10, rx: 2, fill: NOTES[note(code).letter].color, stroke: INK, 'stroke-width': 1.3 }));
    });
    if (opts && opts.demo) parts.push(SG.demoHand(65, 62, 'tap'));
    return svg('svg', { class: 'illus', viewBox: '0 0 120 90', 'aria-hidden': 'true' }, parts);
  }

  // Level pictures: all the key colours for free play; for a song, its first notes as a tune.
  function preview(levelKey) {
    const parts = [];
    if (levelKey === 'free') {
      FREE_KEYS.forEach(function (code, i) {
        parts.push(svg('rect', { x: 4 + i * 11.5, y: 20, width: 9.5, height: 60, rx: 2.5, fill: '#FFFFFF', stroke: INK, 'stroke-width': 1.5 }));
        parts.push(svg('rect', { x: 4 + i * 11.5, y: 20, width: 9.5, height: 16, rx: 2.5, fill: NOTES[note(code).letter].color, stroke: INK, 'stroke-width': 1.5 }));
      });
    } else {
      prepare(LEVELS[levelKey].song).lines[0].slice(0, 8).forEach(function (n, i) {
        parts.push(svg('circle', { cx: 10 + i * 11.5, cy: 58 - n.note.semis * 3.2, r: 5, fill: NOTES[n.note.letter].color, stroke: INK, 'stroke-width': 1.5 }));
      });
    }
    return svg('svg', { class: 'level-art', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, parts);
  }

  SG.registerGame({
    key: 'harmonium',
    text: 'hm',
    levels: LEVELS,
    mount: mount,
    illustration: illustration,
    preview: preview,
    levelName: function (key) { return SG.t('hm.level.' + key); },
    detail: function (key) { return SG.t('hm.detail.' + key); }
  });

  SG.harmonium = { prepare: prepare, note: note }; // for the playtest
})(window.SG);
