// Word Search.
// Two ways to pick a word, both always available:
//   1. Slide a finger (or mouse) from one end of the word to the other.
//   2. Tap the first letter, then tap the last letter.
// Selections snap to a straight line and forgive being one letter off,
// so shaky or imprecise movement still works. Nothing is ever marked "wrong".
(function (SG) {
  'use strict';

  const el = SG.el;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const RIGHT = [0, 1], DOWN = [1, 0], DOWN_RIGHT = [1, 1], UP_RIGHT = [-1, 1];
  const FORWARD = [RIGHT, DOWN, DOWN_RIGHT, UP_RIGHT];
  const BACKWARD = FORWARD.map(function (d) { return [0 - d[0], 0 - d[1]]; });

  const LEVELS = {
    easy: { label: 'Easy', detail: 'Small grid, 6 words', size: 8, count: 6, dirs: [RIGHT, DOWN] },
    medium: { label: 'Medium', detail: 'Bigger grid, 8 words, some diagonal', size: 10, count: 8, dirs: FORWARD },
    hard: { label: 'Hard', detail: 'Large grid, 10 words, some backwards', size: 12, count: 10, dirs: FORWARD.concat(BACKWARD) }
  };

  // Highlighter colours - all light enough to keep dark letters easy to read.
  const MARK_COLORS = ['#FFD54F', '#A5D6A7', '#90CAF9', '#F8A5C2', '#FFB74D',
    '#CE93D8', '#80CBC4', '#DCE775', '#BCAAA4', '#9FA8DA'];
  const PREVIEW_COLOR = '#1D4E89';

  // Filler letters, weighted towards common ones so the grid looks natural.
  const FILL = 'AAAABBCCDDDEEEEEFFGGHHHIIIJKLLLMMNNNOOOOPPRRRSSSTTTUUVWXYZ';

  const MIN_WORD = 4;
  const SIDE_BY_SIDE = '(min-width: 820px) and (orientation: landscape)'; // keep in step with style.css

  let lastTheme = null;

  // ---------- Puzzle building ----------

  function place(grid, word, dirs) {
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
      return { word: word, dir: d, cells: cells, found: false };
    }
    return null;
  }

  function buildPuzzle(level) {
    const n = level.size;
    for (let attempt = 0; attempt < 40; attempt++) {
      const choices = SG.themes.filter(function (t) { return t.name !== lastTheme; });
      const theme = choices[SG.rand(choices.length)];
      const grid = [];
      for (let r = 0; r < n; r++) grid.push(new Array(n).fill(''));

      const pool = SG.shuffle(theme.words.filter(function (w) {
        return w.length >= MIN_WORD && w.length <= n;
      }));
      const placements = [];
      for (let i = 0; i < pool.length && placements.length < level.count; i++) {
        const word = pool[i];
        // Skip words hiding inside each other (RAIN / RAINBOW) - finding one would be ambiguous.
        const overlaps = placements.some(function (p) {
          return p.word.indexOf(word) !== -1 || word.indexOf(p.word) !== -1;
        });
        if (overlaps) continue;
        const placed = place(grid, word, level.dirs);
        if (placed) placements.push(placed);
      }
      if (placements.length < level.count) continue;

      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (!grid[r][c]) grid[r][c] = FILL[SG.rand(FILL.length)];
        }
      }
      placements.sort(function (a, b) { return a.word < b.word ? -1 : 1; });
      lastTheme = theme.name;
      return { theme: theme.name, grid: grid, placements: placements };
    }
    throw new Error('Could not build a word search puzzle');
  }

  // ---------- The game ----------

  function mount(stage, levelKey) {
    const level = LEVELS[levelKey];
    const n = level.size;

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
    let pointerId, downCell, downX, downY;
    let cursor, usingKeys; // keyboard play
    let timers = [];
    let wrap, board, hintBtn, foundLayer, preview, hintRing, statusEl, cellEls, wordEls;

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

    function svg(tag, attrs) {
      const node = document.createElementNS(SVG_NS, tag);
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      return node;
    }

    function setLine(line, a, b) {
      line.setAttribute('x1', a.c + 0.5);
      line.setAttribute('y1', a.r + 0.5);
      // A zero-length line draws nothing in some browsers; nudge it so a single cell shows as a dot.
      line.setAttribute('x2', b.c + 0.5 + (same(a, b) ? 0.001 : 0));
      line.setAttribute('y2', b.r + 0.5);
    }

    function render() {
      stage.textContent = '';

      wordEls = {};
      const list = el('ul', { class: 'ws-words' }, puzzle.placements.map(function (p) {
        // A found word is struck through and filled with its highlighter colour. Its size never
        // changes, so the word list cannot re-wrap and nudge the grid while someone is playing.
        const item = el('li', { class: 'ws-word' }, [
          el('span', { class: 'ws-word-text', text: p.word }),
          el('span', { class: 'sr-only ws-found-note', text: '' })
        ]);
        wordEls[p.word] = item;
        return item;
      }));

      const info = el('section', { class: 'ws-info', 'aria-label': 'Words to find' }, [
        el('p', { class: 'ws-topic' }, ['Topic: ', el('strong', { text: puzzle.theme })]),
        list
      ]);

      const marks = svg('svg', { class: 'ws-marks', viewBox: '0 0 ' + n + ' ' + n, 'aria-hidden': 'true' });
      foundLayer = svg('g', {});
      preview = svg('line', { class: 'ws-preview', stroke: PREVIEW_COLOR, 'stroke-width': 0.8, 'stroke-linecap': 'round' });
      hintRing = svg('circle', { class: 'ws-hint-ring', r: 0.44, fill: 'none', stroke: PREVIEW_COLOR, 'stroke-width': 0.09 });
      preview.style.display = 'none';
      hintRing.style.display = 'none';
      marks.appendChild(foundLayer);
      marks.appendChild(preview);
      marks.appendChild(hintRing);

      board = el('div', {
        class: 'ws-board',
        tabindex: '0',
        role: 'application',
        'aria-label': 'Letter grid. Arrow keys move. Press Enter on the first letter of a word, then on its last letter.'
      }, [marks]);
      board.style.setProperty('--n', n);

      cellEls = [];
      puzzle.grid.forEach(function (row, r) {
        cellEls.push(row.map(function (letter, c) {
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
      board.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      wrap = el('div', { class: 'ws-board-wrap' }, [board]);

      statusEl = el('p', { class: 'ws-status', role: 'status' });
      hintBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: 'Show a Hint', onclick: hint });
      const foot = el('section', { class: 'ws-foot' }, [
        statusEl,
        hintBtn,
        el('p', { class: 'ws-tip', text: 'Slide along a word, or tap its first letter and then its last letter.' })
      ]);

      stage.appendChild(el('div', { class: 'ws-layout' }, [info, wrap, foot]));
      showProgress();
    }

    // Make the grid as big as the screen allows, and keep it fully visible without scrolling when possible.
    function layout() {
      if (!board || done) return;
      const top = wrap.getBoundingClientRect().top + window.pageYOffset;
      // When the hint row sits below the grid, leave room for it. The grid swallows touches
      // (so a word is never interrupted by scrolling), which makes scrolling past it awkward.
      const stacked = !window.matchMedia(SIDE_BY_SIDE).matches;
      const reserve = stacked ? Math.max(statusEl.offsetHeight, hintBtn.offsetHeight) + 28 : 0;
      const border = board.offsetWidth - board.clientWidth;
      const availW = wrap.clientWidth - border;
      const availH = window.innerHeight - top - reserve - 20 - border;
      const size = Math.floor(Math.min(availW, Math.max(280, Math.min(availH, n * 76))));
      board.style.width = size + 'px';
      board.style.height = size + 'px';
      board.style.setProperty('--cell', (size / n) + 'px');
    }

    function showProgress() {
      statusEl.textContent = 'Found ' + foundCount + ' of ' + puzzle.placements.length + ' words';
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
      setLine(preview, cells[0], cells[cells.length - 1]);
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

    function findMatch(cells) {
      if (cells.length < 2) return null;
      const a = cells[0], b = cells[cells.length - 1];

      // Either direction counts, and the ends may be one letter out in total.
      let best = null, bestError = 2;
      puzzle.placements.forEach(function (p) {
        if (p.found) return;
        const ta = along(p, a), tb = along(p, b);
        if (ta === null || tb === null) return;
        const error = Math.abs(Math.min(ta, tb)) + Math.abs(Math.max(ta, tb) - (p.cells.length - 1));
        if (error < bestError) { bestError = error; best = p; }
      });
      if (best) return best;

      // The filler letters can spell a listed word by chance - accept that too.
      const text = cells.map(function (cell) { return puzzle.grid[cell.r][cell.c]; }).join('');
      const reversed = text.split('').reverse().join('');
      for (let i = 0; i < puzzle.placements.length; i++) {
        const p = puzzle.placements[i];
        if (!p.found && (p.word === text || p.word === reversed)) {
          p.cells = cells;
          return p;
        }
      }
      return null;
    }

    function attempt(cells) {
      anchor = null;
      const match = findMatch(cells);
      if (match) {
        hidePreview();
        markFound(match);
      } else {
        // Not a word: the selection simply fades away. No buzzer, no red.
        showPreview(cells);
        preview.classList.add('fading');
      }
    }

    // A tap (or Enter key) on one letter.
    function tap(cell) {
      if (!anchor) {
        anchor = cell;
        showPreview([cell]);
        SG.sound.tap();
      } else if (same(anchor, cell)) {
        anchor = null;
        hidePreview();
      } else {
        attempt(snapLine(anchor, cell));
      }
    }

    function markFound(p) {
      p.found = true;
      const color = MARK_COLORS[foundCount % MARK_COLORS.length];
      foundCount++;

      const line = svg('line', { class: 'ws-found-mark', stroke: color, 'stroke-width': 0.8, 'stroke-linecap': 'round' });
      setLine(line, p.cells[0], p.cells[p.cells.length - 1]);
      foundLayer.appendChild(line);

      const item = wordEls[p.word];
      item.classList.add('found');
      item.classList.remove('hinting');
      item.style.setProperty('--mark', color);
      item.querySelector('.ws-found-note').textContent = ' (found)';
      hintRing.style.display = 'none';

      const left = puzzle.placements.length - foundCount;
      if (left === 0) {
        done = true;
        statusEl.textContent = 'You found ' + p.word + '. That is all of them!';
        SG.sound.win();
        later(showWin, 1500);
      } else {
        statusEl.textContent = 'You found ' + p.word + '! ' + left + (left === 1 ? ' word' : ' words') + ' to go.';
        SG.sound.found();
      }
    }

    function showWin() {
      const panel = SG.winPanel(
        'You found all ' + puzzle.placements.length + ' words in the ' + puzzle.theme + ' puzzle.',
        newGame,
        '#/wordsearch'
      );
      stage.textContent = '';
      board = null;
      stage.appendChild(panel);
      panel.querySelector('.win-title').focus();
    }

    function hint() {
      if (done) return;
      const p = puzzle.placements.filter(function (x) { return !x.found; })[0];
      if (!p) return;
      const first = p.cells[0];
      hintRing.setAttribute('cx', first.c + 0.5);
      hintRing.setAttribute('cy', first.r + 0.5);
      hintRing.style.display = '';
      wordEls[p.word].classList.add('hinting');
      statusEl.textContent = 'Look for ' + p.word + '. Its first letter is circled.';
      later(function () {
        if (p.found || done) return;
        hintRing.style.display = 'none';
        wordEls[p.word].classList.remove('hinting');
        showProgress();
      }, 6000);
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
      else attempt(snapLine(downCell, upCell));
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
      }
    }

    // ----- Lifecycle -----

    function newGame() {
      clearTimers();
      puzzle = buildPuzzle(level);
      done = false;
      foundCount = 0;
      anchor = null;
      pointerId = null;
      cursor = { r: 0, c: 0 };
      usingKeys = false;
      render();
      layout();
    }

    window.addEventListener('resize', layout);
    newGame();

    return {
      newGame: newGame,
      destroy: function () {
        clearTimers();
        window.removeEventListener('resize', layout);
      }
    };
  }

  SG.wordsearch = { levels: LEVELS, mount: mount };
})(window.SG);
