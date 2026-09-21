// Word Search.
// Two ways to pick a word, both always available:
//   1. Slide a finger (or mouse) from one end of the word to the other.
//   2. Tap the first letter, then tap the last letter.
// Selections snap to a straight line and forgive being one letter off,
// so shaky or imprecise movement still works. Nothing is ever marked "wrong".
(function (SG) {
  'use strict';

  const el = SG.el;
  const svg = SG.svg;

  const RIGHT = [0, 1], DOWN = [1, 0], DOWN_RIGHT = [1, 1], UP_RIGHT = [-1, 1];
  const FORWARD = [RIGHT, DOWN, DOWN_RIGHT, UP_RIGHT];
  const BACKWARD = FORWARD.map(function (d) { return [0 - d[0], 0 - d[1]]; });

  const LEVELS = {
    easy: { size: 8, count: 6, dirs: [RIGHT, DOWN] },
    medium: { size: 10, count: 8, dirs: FORWARD },
    hard: { size: 12, count: 10, dirs: FORWARD.concat(BACKWARD) }
  };

  // Highlighter colours. The fill is light enough to keep dark letters easy to read (all 6.9:1
  // or better); the darker edge makes each band visible against the white grid without relying
  // on a pale colour alone (every edge is 4.7:1 or better on white).
  const MARKS = [
    { fill: '#FFD54F', edge: '#946C00' }, { fill: '#A5D6A7', edge: '#2F7D38' },
    { fill: '#90CAF9', edge: '#1F6FB5' }, { fill: '#F8A5C2', edge: '#B83A70' },
    { fill: '#FFB74D', edge: '#A85F00' }, { fill: '#CE93D8', edge: '#8A3D9C' },
    { fill: '#80CBC4', edge: '#1F7A71' }, { fill: '#DCE775', edge: '#6F7700' },
    { fill: '#BCAAA4', edge: '#75615A' }, { fill: '#9FA8DA', edge: '#4A58AD' }
  ];
  const SELECT_FILL = '#CFE0F5';
  const SELECT_EDGE = '#1D4E89';

  // Filler letters, weighted towards common ones so the grid looks natural.
  const FILL = 'AAAABBCCDDDEEEEEFFGGHHHIIIJKLLLMMNNNOOOOPPRRRSSSTTTUUVWXYZ';
  const HINDI_CONSONANTS = 'कखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह';
  const HINDI_MATRAS = ['ा', 'ा', 'ि', 'ी', 'ु', 'ू', 'े', 'े', 'ै', 'ो', 'ौ', 'ं'];

  // Devanagari is not one-letter-per-character: a grid square holds one AKSHARA - a consonant (or
  // a conjunct such as श्त or द्र) together with its vowel sign and marks. रिश्तेदार -> रि | श्ते | दा | र.
  // Done by hand rather than with Intl.Segmenter, which older tablets lack or get wrong for conjuncts.
  function isMark(code) {
    return (code >= 0x0900 && code <= 0x0903) || (code >= 0x093A && code <= 0x093C) ||
      (code >= 0x093E && code <= 0x094F) || (code >= 0x0951 && code <= 0x0957) ||
      code === 0x0962 || code === 0x0963 || code === 0x200C || code === 0x200D;
  }

  function splitAksharas(text) {
    const out = [];
    Array.from(text.normalize('NFC')).forEach(function (ch) {
      const last = out.length ? out[out.length - 1] : '';
      const joins = /\u094D[\u200C\u200D]?$/.test(last); // a halant (्) glues the next consonant on
      if (out.length && (isMark(ch.codePointAt(0)) || joins)) out[out.length - 1] = last + ch;
      else out.push(ch);
    });
    return out;
  }

  // What differs between languages. `minCell` is the smallest square (px) that keeps its letter
  // above the 19px reading floor; aksharas are wider than Latin capitals, so they need more room.
  const SCRIPTS = {
    en: {
      minWord: 4, minCell: 34,
      split: function (text) { return text.split(''); },
      letterScale: function (cell) { return cell < 40 ? 0.62 : 0.58; },
      filler: function () { return FILL[SG.rand(FILL.length)]; }
    },
    hi: {
      minWord: 3, minCell: 42,
      split: splitAksharas,
      letterScale: function () { return 0.48; },
      filler: function () {
        const consonant = HINDI_CONSONANTS[SG.rand(HINDI_CONSONANTS.length)];
        return SG.rand(2) ? consonant : consonant + HINDI_MATRAS[SG.rand(HINDI_MATRAS.length)];
      }
    }
  };

  const MAX_CELL = 76;
  const WIN_PAUSE_MS = 2200; // time to enjoy the last highlight before the finish screen
  const SIDE_BY_SIDE = '(min-width: 820px) and (orientation: landscape)'; // keep in step with style.css
  const SIDE_WIDTH = 340 + 28; // side panel + column gap, as in style.css

  let lastTheme = null;

  // ---------- Puzzle building ----------

  // `text` is what the word list shows; `letters` is what goes in the squares, one each.
  function place(grid, text, letters, dirs) {
    const word = letters;
    const n = grid.length;
    for (let attempt = 0; attempt < 150; attempt++) {
      const d = dirs[SG.rand(dirs.length)];
      const r0 = SG.rand(n), c0 = SG.rand(n);
      const rEnd = r0 + d[0] * (word.length - 1), cEnd = c0 + d[1] * (word.length - 1);
      if (rEnd < 0 || rEnd >= n || cEnd < 0 || cEnd >= n) continue;

      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const existing = grid[r0 + d[0] * i][c0 + d[1] * i];
        if (existing && existing !== word[i]) { fits = false; break; }
      }
      if (!fits) continue;

      const cells = [];
      for (let i = 0; i < word.length; i++) {
        const r = r0 + d[0] * i, c = c0 + d[1] * i;
        grid[r][c] = word[i];
        cells.push({ r: r, c: c });
      }
      return { word: text, letters: letters, dir: d, cells: cells, found: false, mark: null };
    }
    return null;
  }

  function key(letters) {
    return '|' + letters.join('|') + '|';
  }

  function buildPuzzle(level, n, count, script, themes) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const choices = themes.filter(function (t) { return t.name !== lastTheme; });
      const theme = choices[SG.rand(choices.length)];
      const grid = [];
      for (let r = 0; r < n; r++) grid.push(new Array(n).fill(''));

      const pool = SG.shuffle(theme.words.map(function (text) {
        return { text: text, letters: script.split(text) };
      }).filter(function (w) {
        return w.letters.length >= script.minWord && w.letters.length <= n;
      }));
      const placements = [];
      for (let i = 0; i < pool.length && placements.length < count; i++) {
        const word = pool[i];
        // Skip words hiding inside each other (RAIN / RAINBOW) - finding one would be ambiguous.
        const overlaps = placements.some(function (p) {
          return key(p.letters).indexOf(key(word.letters)) !== -1 || key(word.letters).indexOf(key(p.letters)) !== -1;
        });
        if (overlaps) continue;
        const placed = place(grid, word.text, word.letters, level.dirs);
        if (placed) placements.push(placed);
      }
      if (placements.length < count) continue;

      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (!grid[r][c]) grid[r][c] = script.filler();
        }
      }
      placements.sort(function (a, b) { return a.word < b.word ? -1 : 1; });
      lastTheme = theme.name;
      return { theme: theme.name, grid: grid, placements: placements };
    }
    throw new Error('Could not build a word search puzzle');
  }

  function wordChip(p) {
    // The marker slot is always there, and a found word only changes colour and gains a tick
    // inside it - so a chip never changes size, the list never re-wraps, and the grid never moves.
    const chip = el('li', { class: 'ws-word' + (p.found ? ' found' : '') }, [
      el('span', { class: 'ws-word-mark', 'aria-hidden': 'true' }),
      el('span', { class: 'ws-word-text', text: p.word }),
      el('span', { class: 'sr-only ws-found-note', text: p.found ? SG.t('ws.foundNote') : '' })
    ]);
    if (p.mark) paint(chip, p.mark);
    return chip;
  }

  function paint(chip, mark) {
    chip.style.setProperty('--mark', mark.fill);
    chip.style.setProperty('--mark-edge', mark.edge);
  }

  // ---------- The game ----------

  function mount(stage, levelKey, hooks) {
    const level = LEVELS[levelKey];
    const t = SG.t;
    const script = SCRIPTS[SG.lang] || SCRIPTS.en;
    const themes = SG.themes[SG.lang] || SG.themes.en;
    const MIN_CELL = script.minCell; // px. Below this, letters drop under the 19px reading floor.
    hooks = hooks || {};

    // On a narrow phone a 12 x 12 grid would make the letters too small to read, so the grid is
    // capped to what fits at a readable size (and carries a couple fewer words to match).
    const fits = stage.clientWidth > 0 ? Math.floor((stage.clientWidth - 6) / MIN_CELL) : level.size;
    const n = SG.clamp(fits, 8, level.size);
    const wordCount = Math.min(level.count, n - 2);

    // Selections snap to the directions this level uses (either way round).
    const snapDirs = [];
    level.dirs.forEach(function (d) {
      [d, [0 - d[0], 0 - d[1]]].forEach(function (dir) {
        const seen = snapDirs.some(function (s) { return s[0] === dir[0] && s[1] === dir[1]; });
        if (!seen) snapDirs.push(dir);
      });
    });

    let puzzle, done, foundCount;
    let anchor;            // first letter chosen by a tap, waiting for the last letter
    let hinted;            // the word currently being hinted, if any
    let pointerId, downCell, downX, downY;
    let cursor, usingKeys; // keyboard play
    let timers = [];
    let layoutEl, wrap, board, foot, foundLayer, preview, previewLines, hintRing, statusEl, cellEls, wordEls;

    function later(fn, ms) {
      const id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function same(a, b) {
      return a && b && a.r === b.r && a.c === b.c;
    }

    // ----- Rendering -----

    function setLine(line, a, b) {
      line.setAttribute('x1', a.c + 0.5);
      line.setAttribute('y1', a.r + 0.5);
      // A zero-length line draws nothing in some browsers; nudge it so a single cell shows as a dot.
      line.setAttribute('x2', b.c + 0.5 + (same(a, b) ? 0.001 : 0));
      line.setAttribute('y2', b.r + 0.5);
    }

    // A highlighter band: a darker outline with the colour on top.
    function band(edge, fill, edgeWidth, fillWidth) {
      return [
        svg('line', { stroke: edge, 'stroke-width': edgeWidth, 'stroke-linecap': 'round' }),
        svg('line', { stroke: fill, 'stroke-width': fillWidth, 'stroke-linecap': 'round' })
      ];
    }

    function render() {
      stage.textContent = '';

      wordEls = {};
      const list = el('ul', { class: 'ws-words' }, puzzle.placements.map(function (p) {
        wordEls[p.word] = wordChip(p);
        return wordEls[p.word];
      }));

      const info = el('section', { class: 'ws-info', 'aria-label': t('ws.list') }, [
        el('p', { class: 'ws-topic' }, [t('ws.topic') + ': ', el('strong', { text: puzzle.theme })]),
        list
      ]);

      foundLayer = svg('g', {});
      previewLines = band(SELECT_EDGE, SELECT_FILL, 0.86, 0.74);
      preview = svg('g', { class: 'ws-preview' }, previewLines);
      // The hint ring is dashed (a shape cue, not just a colour) with a white halo so it
      // still shows when it lands on top of a highlighted word.
      hintRing = svg('g', { class: 'ws-hint-ring' }, [
        svg('circle', { r: 0.44, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 0.17 }),
        svg('circle', { r: 0.44, fill: 'none', stroke: SELECT_EDGE, 'stroke-width': 0.11, 'stroke-dasharray': '.18 .12' })
      ]);
      preview.style.display = 'none';
      hintRing.style.display = 'none';
      const marks = svg('svg', { class: 'ws-marks', viewBox: '0 0 ' + n + ' ' + n, 'aria-hidden': 'true' },
        [foundLayer, preview, hintRing]);

      board = el('div', {
        class: 'ws-board',
        tabindex: '0',
        role: 'application',
        'aria-label': t('ws.grid')
      }, [marks]);
      board.style.setProperty('--n', n);

      cellEls = [];
      puzzle.grid.forEach(function (row) {
        cellEls.push(row.map(function (letter) {
          const cell = el('div', { class: 'ws-cell', 'aria-hidden': 'true', text: letter });
          board.appendChild(cell);
          return cell;
        }));
      });

      board.addEventListener('pointerdown', onDown);
      board.addEventListener('pointermove', onMove);
      board.addEventListener('pointerup', onUp);
      board.addEventListener('pointercancel', onCancel);
      board.addEventListener('keydown', onKey);
      // Reaching the grid with the Tab key starts keyboard play; a touch or click does not.
      board.addEventListener('focus', function () { if (pointerId === null) showCursor(true); });
      board.addEventListener('blur', function () { showCursor(false); });

      wrap = el('div', { class: 'ws-board-wrap' }, [board]);

      // The status line always reserves two lines, so a longer message never pushes the Hint button.
      statusEl = el('p', { class: 'status ws-status', role: 'status' });
      const hintBtn = el('button', { class: 'btn btn-secondary ws-hint', type: 'button', text: t('ws.hint') });
      SG.onTap(hintBtn, hint);
      foot = el('section', { class: 'ws-foot' }, [
        statusEl,
        hintBtn,
        el('p', { class: 'ws-tip', text: t('ws.tip') })
      ]);

      layoutEl = el('div', { class: 'ws-layout' }, [info, wrap, foot]);
      stage.appendChild(layoutEl);
      restStatus();
    }

    // Make the grid as big as the screen allows. Readable letters come first; keeping the Hint
    // button on screen comes second (on a small phone it may sit just below the fold).
    function layout() {
      if (!board || done) return;
      const sideBySide = window.matchMedia(SIDE_BY_SIDE).matches;
      const top = wrap.getBoundingClientRect().top + window.pageYOffset;
      // When the hint row sits below the grid, leave room for it: the grid swallows touches
      // (so a word is never interrupted by scrolling), which makes scrolling past it awkward.
      const reserve = sideBySide ? 0 : foot.offsetHeight + 16;
      const border = board.offsetWidth - board.clientWidth;
      const availW = layoutEl.clientWidth - (sideBySide ? SIDE_WIDTH : 0) - border;
      const availH = window.innerHeight - top - reserve - 20 - border;
      const size = Math.floor(Math.max(
        Math.min(availW, n * MIN_CELL),
        Math.min(availW, availH, n * MAX_CELL)
      ));
      const cell = size / n;
      board.style.width = size + 'px';
      board.style.height = size + 'px';
      board.style.setProperty('--letter', (cell * script.letterScale(cell)) + 'px');
    }

    // What the status line says when nothing has just happened.
    function restStatus() {
      if (hinted && !hinted.found) {
        statusEl.textContent = t('ws.lookFor', hinted.word);
      } else {
        statusEl.textContent = t('ws.found', foundCount, puzzle.placements.length);
      }
    }

    // ----- Choosing letters -----

    function cellAt(e) {
      const rect = board.getBoundingClientRect();
      const cellSize = board.clientWidth / n;
      // Clamping means a finger that drifts just off the edge still counts as the edge letter.
      return {
        r: SG.clamp(Math.floor((e.clientY - rect.top - board.clientTop) / cellSize), 0, n - 1),
        c: SG.clamp(Math.floor((e.clientX - rect.left - board.clientLeft) / cellSize), 0, n - 1)
      };
    }

    // Straight line of cells from `start` towards `target`, snapped to the nearest allowed direction.
    function snapLine(start, target) {
      const dr = target.r - start.r, dc = target.c - start.c;
      if (!dr && !dc) return [start];

      let best = null, bestCos = -Infinity;
      snapDirs.forEach(function (d) {
        const cos = (dr * d[0] + dc * d[1]) / (Math.hypot(dr, dc) * Math.hypot(d[0], d[1]));
        if (cos > bestCos) { bestCos = cos; best = d; }
      });

      const steps = Math.round((dr * best[0] + dc * best[1]) / (best[0] * best[0] + best[1] * best[1]));
      const cells = [start];
      for (let i = 1; i <= steps; i++) {
        const r = start.r + best[0] * i, c = start.c + best[1] * i;
        if (r < 0 || r >= n || c < 0 || c >= n) break;
        cells.push({ r: r, c: c });
      }
      return cells;
    }

    function showPreview(cells) {
      preview.classList.remove('fading');
      preview.style.display = '';
      previewLines.forEach(function (line) { setLine(line, cells[0], cells[cells.length - 1]); });
    }

    function hidePreview() {
      preview.classList.remove('fading');
      preview.style.display = 'none';
    }

    // How far along a hidden word's line a cell sits (0 = first letter), or null if it is off the line.
    function along(p, cell) {
      const dr = cell.r - p.cells[0].r, dc = cell.c - p.cells[0].c;
      if (dr * p.dir[1] - dc * p.dir[0] !== 0) return null;
      return p.dir[0] !== 0 ? dr / p.dir[0] : dc / p.dir[1];
    }

    function gap(a, b) {
      return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
    }

    // `cells` is the snapped line; `target` is the letter the player actually ended on.
    function findMatch(cells, target) {
      const a = cells[0], b = cells[cells.length - 1];
      const unfound = puzzle.placements.filter(function (p) { return !p.found; });

      // 1. On the word's own line: either direction counts, and the ends may be one letter out in total.
      if (cells.length > 1) {
        let best = null, bestError = 2;
        unfound.forEach(function (p) {
          const ta = along(p, a), tb = along(p, b);
          if (ta === null || tb === null) return;
          const error = Math.abs(Math.min(ta, tb)) + Math.abs(Math.max(ta, tb) - (p.cells.length - 1));
          if (error < bestError) { bestError = error; best = p; }
        });
        if (best) return best;

        // 2. The filler letters can spell a listed word by chance - accept that too.
        const picked = cells.map(function (cell) { return puzzle.grid[cell.r][cell.c]; });
        const text = key(picked);
        const reversed = key(picked.slice().reverse());
        for (let i = 0; i < unfound.length; i++) {
          if (key(unfound[i].letters) === text || key(unfound[i].letters) === reversed) {
            unfound[i].cells = cells;
            return unfound[i];
          }
        }
      }

      // 3. A sideways slip: each end landed on a letter touching the word's real end.
      //    If two words could be meant, it is not counted (better to ask again than guess wrong).
      let nearest = null, nearestGap = Infinity, tie = false;
      unfound.forEach(function (p) {
        const first = p.cells[0], last = p.cells[p.cells.length - 1];
        [[first, last], [last, first]].forEach(function (ends) {
          const g1 = gap(a, ends[0]), g2 = gap(target, ends[1]);
          if (g1 > 1 || g2 > 1) return;
          if (g1 + g2 < nearestGap) { nearestGap = g1 + g2; nearest = p; tie = false; }
          else if (g1 + g2 === nearestGap && nearest !== p) tie = true;
        });
      });
      return tie ? null : nearest;
    }

    function attempt(start, target) {
      const cells = snapLine(start, target);
      anchor = null;
      const match = findMatch(cells, target);
      if (match) {
        hidePreview();
        markFound(match, start);
      } else {
        // Not a word: the selection simply fades away. No buzzer, no red, no "wrong".
        showPreview(cells);
        preview.classList.add('fading');
        restStatus();
      }
    }

    // A tap (or Enter key) on one letter.
    function tap(cell) {
      if (!anchor) {
        anchor = cell;
        showPreview([cell]);
        statusEl.textContent = t('ws.first', puzzle.grid[cell.r][cell.c]);
        SG.sound.tap();
      } else if (same(anchor, cell)) {
        anchor = null;
        hidePreview();
        restStatus();
      } else {
        attempt(anchor, cell);
      }
    }

    function markFound(p, from) {
      p.found = true;
      p.mark = MARKS[foundCount % MARKS.length];
      foundCount++;

      // Draw the highlighter on from the end the player started at.
      let a = p.cells[0], b = p.cells[p.cells.length - 1];
      if (gap(from, b) < gap(from, a)) { const t = a; a = b; b = t; }
      const length = Math.hypot(b.r - a.r, b.c - a.c);
      band(p.mark.edge, p.mark.fill, 0.84, 0.76).forEach(function (line) {
        setLine(line, a, b);
        line.style.strokeDasharray = length + ' ' + length;
        line.style.strokeDashoffset = length;
        foundLayer.appendChild(line);
        line.getBoundingClientRect(); // commit the starting state so the next line animates
        line.style.transition = 'stroke-dashoffset 0.3s ease-out';
        line.style.strokeDashoffset = 0;
      });

      const chip = wordEls[p.word];
      chip.classList.add('found');
      chip.classList.remove('hinting');
      paint(chip, p.mark);
      chip.querySelector('.ws-found-note').textContent = t('ws.foundNote');
      if (hinted === p) {
        hinted = null;
        hintRing.style.display = 'none';
      }

      const left = puzzle.placements.length - foundCount;
      if (left === 0) {
        done = true;
        statusEl.textContent = t('ws.foundLast', p.word);
        SG.sound.win();
        later(showWin, WIN_PAUSE_MS);
      } else {
        statusEl.textContent = t('ws.foundWord', p.word, left);
        SG.sound.found();
      }
    }

    function showWin() {
      const trophies = el('ul', { class: 'ws-words panel-trophies', 'aria-label': t('ws.trophies') },
        puzzle.placements.map(wordChip));
      const panel = SG.winPanel(
        t('ws.win', puzzle.placements.length, puzzle.theme),
        trophies, newGame, '#/wordsearch'
      );
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      if (hooks.onWin) hooks.onWin();
      panel.querySelector('.panel-title').focus();
    }

    // The hint stays until its word is found (or another hint is asked for).
    // Nothing on screen ever changes on a timer.
    function hint() {
      if (done) return;
      const p = puzzle.placements.filter(function (x) { return !x.found; })[0];
      if (!p) return;
      if (hinted) wordEls[hinted.word].classList.remove('hinting');
      hinted = p;
      hintRing.setAttribute('transform', 'translate(' + (p.cells[0].c + 0.5) + ' ' + (p.cells[0].r + 0.5) + ')');
      hintRing.style.display = 'none';
      hintRing.getBoundingClientRect(); // restart the three gentle pulses if asked again
      hintRing.style.display = '';
      wordEls[p.word].classList.add('hinting');
      restStatus();
    }

    // ----- Touch, mouse and pen -----

    function onDown(e) {
      if (done) return;
      // Only one finger plays at a time - a resting palm or second finger is ignored.
      if (pointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      pointerId = e.pointerId;
      board.focus({ preventScroll: true });
      showCursor(false);
      try { board.setPointerCapture(pointerId); } catch (err) { /* older browsers */ }
      downCell = cellAt(e);
      downX = e.clientX;
      downY = e.clientY;
      showPreview(snapLine(anchor || downCell, downCell));
    }

    function onMove(e) {
      if (done) return;
      if (pointerId === null) {
        // Mouse users get a live preview after clicking the first letter.
        if (anchor && e.pointerType === 'mouse') showPreview(snapLine(anchor, cellAt(e)));
        return;
      }
      if (e.pointerId !== pointerId) return;
      showPreview(snapLine(anchor || downCell, cellAt(e)));
    }

    function onUp(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (done) return;
      // A small wobble while tapping is still a tap.
      const wobble = Math.hypot(e.clientX - downX, e.clientY - downY);
      const upCell = wobble < (board.clientWidth / n) * 0.5 ? downCell : cellAt(e);
      if (anchor || same(upCell, downCell)) tap(upCell);
      else attempt(downCell, upCell);
    }

    function onCancel(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (anchor) showPreview([anchor]);
      else hidePreview();
    }

    // ----- Keyboard -----

    function showCursor(show) {
      usingKeys = show;
      board.classList.toggle('keys', show);
      cellEls.forEach(function (row) {
        row.forEach(function (cell) { cell.classList.remove('cursor'); });
      });
      if (show) cellEls[cursor.r][cursor.c].classList.add('cursor');
    }

    function onKey(e) {
      if (done) return;
      const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (moves[e.key]) {
        e.preventDefault();
        if (usingKeys) {
          cursor = {
            r: SG.clamp(cursor.r + moves[e.key][0], 0, n - 1),
            c: SG.clamp(cursor.c + moves[e.key][1], 0, n - 1)
          };
        }
        showCursor(true);
        if (anchor) showPreview(snapLine(anchor, cursor));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (usingKeys) tap(cursor);
        else showCursor(true);
      } else if (e.key === 'Escape' && anchor) {
        anchor = null;
        hidePreview();
        restStatus();
      }
    }

    // ----- Lifecycle -----

    function newGame() {
      clearTimers();
      puzzle = buildPuzzle(level, n, wordCount, script, themes);
      done = false;
      foundCount = 0;
      anchor = null;
      hinted = null;
      pointerId = null;
      cursor = { r: 0, c: 0 };
      usingKeys = false;
      render();
      layout();
      if (hooks.onStart) hooks.onStart();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      resize: layout,
      // Shown on the "start a new puzzle?" page, so a stray tap cannot wipe out a long game.
      progress: function () {
        return done || !foundCount ? null : t('ws.progress', foundCount, puzzle.placements.length);
      },
      destroy: function () {
        clearTimers();
        window.removeEventListener('resize', layout);
      }
    };
  }

  SG.wordsearch = {
    levels: LEVELS,
    mount: mount,
    detail: function (levelKey) { return SG.t('ws.level.' + levelKey); },
    split: function (text) { return (SCRIPTS[SG.lang] || SCRIPTS.en).split(text); }
  };
})(window.SG);
