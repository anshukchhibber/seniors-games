// Play-tests the whole app in a real (headless) browser, using real mouse, touch and keyboard input:
//
//     node tests/playtest.mjs
//
// Needs Node 22+ and Microsoft Edge or Google Chrome. No npm packages.
// Screenshots of every screen (desktop, phone, tablet) are saved to tests/.output/screenshots.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = join(HERE, '.output');
const SHOTS = join(OUT, 'screenshots');
mkdirSync(SHOTS, { recursive: true });

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].find(existsSync);
if (!EDGE) throw new Error('Could not find Edge or Chrome - add its path to the list at the top of this file.');

// A tiny static file server for the app, on any free port.
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  const file = resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  try {
    if (!file.startsWith(ROOT + sep)) throw new Error('outside the app folder');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/index.html`;
const PORT = 9333;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const problems = [];
function check(name, ok, extra) {
  results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  -> ' + extra : ''));
}

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, 'browser-profile')}`,
  '--no-first-run', '--disable-gpu', '--window-size=1280,800', 'about:blank'
], { stdio: 'ignore' });

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find(t => t.type === 'page');
  } catch { /* not up yet */ }
}
if (!target) { edge.kill(); server.close(); throw new Error('The browser did not start'); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let nextId = 1;
const waiting = new Map();
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && waiting.has(msg.id)) {
    const { resolve, reject } = waiting.get(msg.id);
    waiting.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    problems.push('EXCEPTION: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    problems.push('CONSOLE ' + msg.params.type + ': ' + msg.params.args.map(a => a.value ?? a.description).join(' '));
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    problems.push('LOG: ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
  }
});
function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => waiting.set(id, { resolve, reject }));
}
async function js(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
}
async function viewport(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: !!mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: !!mobile });
}
let visit = 0;
async function go(hash) {
  await send('Page.navigate', { url: BASE + '?v=' + (++visit) + hash });
  await sleep(350);
}
async function mouse(type, x, y, extra = {}) {
  await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
}
async function click(x, y) {
  await mouse('mousePressed', x, y);
  await mouse('mouseReleased', x, y);
}
async function drag(x1, y1, x2, y2, wobble = 0) {
  await mouse('mousePressed', x1, y1);
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    await mouse('mouseMoved', x1 + (x2 - x1) * t + Math.sin(i * 2) * wobble, y1 + (y2 - y1) * t + Math.cos(i * 3) * wobble);
  }
  await mouse('mouseReleased', x2, y2);
}
async function touchDrag(x1, y1, x2, y2) {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t }] });
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function tapTouch(x, y) {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

// Reads the grid + word list from the page and locates every word (test-side solver).
const SOLVE = `(() => {
  const board = document.querySelector('.ws-board');
  const n = +board.style.getPropertyValue('--n');
  const letters = [...board.querySelectorAll('.ws-cell')].map(c => c.textContent);
  const grid = []; for (let r = 0; r < n; r++) grid.push(letters.slice(r * n, r * n + n));
  const rect = board.getBoundingClientRect();
  const cell = board.clientWidth / n;
  const at = (r, c) => ({ x: rect.left + board.clientLeft + (c + 0.5) * cell, y: rect.top + board.clientTop + (r + 0.5) * cell });
  const words = [...document.querySelectorAll('.ws-word')].map(li => li.querySelector(".ws-word-text").textContent);
  const dirs = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
  const out = [];
  for (const w of words) {
    let hit = null;
    for (let r = 0; r < n && !hit; r++) for (let c = 0; c < n && !hit; c++) for (const d of dirs) {
      let ok = true;
      for (let i = 0; i < w.length; i++) {
        const rr = r + d[0] * i, cc = c + d[1] * i;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n || grid[rr][cc] !== w[i]) { ok = false; break; }
      }
      if (ok) { hit = { word: w, dir: d, len: w.length, start: at(r, c), end: at(r + d[0] * (w.length - 1), c + d[1] * (w.length - 1)), cell }; break; }
    }
    out.push(hit || { word: w, missing: true });
  }
  return { n, cell, words: out, boardBottom: rect.bottom, boardRight: rect.right, vw: innerWidth, vh: innerHeight, scrollW: document.documentElement.scrollWidth };
})()`;

const foundCount = () => js(`document.querySelectorAll('.ws-word.found').length`);

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  // ---------- Desktop ----------
  await viewport(1280, 800, false);
  await go('#/');
  await shot('01-home-desktop');
  check('home shows two games', (await js(`document.querySelectorAll('.game-card').length`)) === 2);

  await go('#/wordsearch');
  await shot('02-levels-desktop');
  check('three levels listed', (await js(`document.querySelectorAll('.level-btn').length`)) === 3);

  for (const levelKey of ['easy', 'medium', 'hard']) {
    await go('#/wordsearch/' + levelKey);
    const s = await js(SOLVE);
    check(`${levelKey}: every word is really in the grid`, s.words.every(w => !w.missing), JSON.stringify(s.words.filter(w => w.missing)));
    check(`${levelKey}: board fits on screen without scrolling`, s.boardBottom <= s.vh && s.scrollW <= s.vw, `bottom=${s.boardBottom} vh=${s.vh}`);
    if (levelKey === 'easy') await shot('03-ws-easy-start');

    // Alternate techniques: clean drag, wobbly drag, tap-tap, reversed drag, one-letter-short drag.
    let i = 0;
    for (const w of s.words) {
      const mode = i++ % 5;
      const ux = Math.sign(w.end.x - w.start.x) * w.cell, uy = Math.sign(w.end.y - w.start.y) * w.cell;
      if (mode === 0) await drag(w.start.x, w.start.y, w.end.x, w.end.y);
      else if (mode === 1) await drag(w.start.x + 6, w.start.y - 5, w.end.x - 7, w.end.y + 6, w.cell * 0.3);
      else if (mode === 2) { await click(w.start.x, w.start.y); await sleep(50); await click(w.end.x, w.end.y); }
      else if (mode === 3) await drag(w.end.x, w.end.y, w.start.x, w.start.y);
      else await drag(w.start.x, w.start.y, w.end.x - ux, w.end.y - uy);
      await sleep(40);
      const n = await foundCount();
      check(`${levelKey}: found ${w.word} (technique ${mode})`, n === i, `found=${n}`);
      if (levelKey === 'medium' && i === 4) await shot('04-ws-medium-midgame');
    }
    await sleep(1800);
    check(`${levelKey}: finish screen appears`, await js(`!!document.querySelector('.win')`));
    if (levelKey === 'easy') await shot('05-ws-win');
  }

  // Wrong selections do nothing harmful; hint works; New Puzzle works.
  await go('#/wordsearch/easy');
  let s = await js(SOLVE);
  const w0 = s.words[0];
  { // two letters at right angles to the word, heading towards the middle of the grid so we stay on it
    const mid = s.boardBottom - s.cell * s.n / 2;
    const sx = w0.dir[1] ? 0 : (w0.start.x < s.boardRight - s.cell * s.n / 2 ? s.cell : -s.cell);
    const sy = w0.dir[1] ? (w0.start.y < mid ? s.cell : -s.cell) : 0;
    await drag(w0.start.x, w0.start.y, w0.start.x + sx, w0.start.y + sy);
  }
  check('a non-word selection finds nothing', (await foundCount()) === 0);
  await click(w0.start.x, w0.start.y); await click(w0.start.x, w0.start.y);
  check('tapping the same letter twice cancels', (await js(`getComputedStyle(document.querySelector('.ws-preview')).display`)) === 'none');
  await js(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Show a Hint').click()`);
  check('hint circles a letter', (await js(`document.querySelector('.ws-hint-ring').style.display`)) === '');
  check('hint names the word', (await js(`document.querySelector('.ws-status').textContent`)).startsWith('Look for '));
  await shot('06-ws-hint');
  const before = await js(`document.querySelector('.ws-board').textContent`);
  await js(`[...document.querySelectorAll('button')].find(b => b.textContent === 'New Puzzle').click()`);
  check('New Puzzle makes a different grid', before !== await js(`document.querySelector('.ws-board').textContent`));

  // Keyboard play
  await go('#/wordsearch/easy');
  s = await js(SOLVE);
  const kw = s.words[0];
  await js(`document.querySelector('.ws-board').focus()`);
  const key = async k => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k === ' ' ? 'Space' : k, windowsVirtualKeyCode: { ArrowRight: 39, ArrowDown: 40, Enter: 13 }[k] }); };
  const toCell = p => ({ r: Math.round((p.y - kw.start.y) / s.cell), c: Math.round((p.x - kw.start.x) / s.cell) });
  const origin = await js(`(() => { const b = document.querySelector('.ws-board'); const r = b.getBoundingClientRect(); return { x: r.left + b.clientLeft, y: r.top + b.clientTop }; })()`);
  const startRC = { r: Math.floor((kw.start.y - origin.y) / s.cell), c: Math.floor((kw.start.x - origin.x) / s.cell) };
  check('tabbing to the grid shows the keyboard cursor', await js(`!!document.querySelector(".ws-cell.cursor") && document.querySelector(".ws-board").classList.contains("keys")`));
  for (let i = 0; i < startRC.c; i++) await key('ArrowRight');
  for (let i = 0; i < startRC.r; i++) await key('ArrowDown');
  await key('Enter');
  const delta = toCell(kw.end);
  for (let i = 0; i < delta.c; i++) await key('ArrowRight');
  for (let i = 0; i < delta.r; i++) await key('ArrowDown');
  await key('Enter');
  check('keyboard can find a word', (await foundCount()) === 1);

  // Stress the puzzle builder
  for (const levelKey of ['easy', 'medium', 'hard']) {
    const ms = await js(`(() => { const d = document.createElement('div'); document.body.appendChild(d); const g = SG.wordsearch.mount(d, '${levelKey}'); const t = performance.now(); for (let i = 0; i < 300; i++) g.newGame(); const e = performance.now() - t; g.destroy(); d.remove(); return e / 300; })()`);
    check(`${levelKey}: 300 puzzles build without error`, true, ms.toFixed(2) + ' ms each');
  }

  // ---------- Tile Match (desktop) ----------
  for (const levelKey of ['easy', 'medium', 'hard']) {
    await go('#/tilematch/' + levelKey);
    const info = await js(`(() => { const t = [...document.querySelectorAll('.tm-tile')]; const b = document.querySelector('.tm-board').getBoundingClientRect(); return { count: t.length, size: t[0].offsetWidth, bottom: b.bottom, vh: innerHeight }; })()`);
    check(`${levelKey}: tiles are big and fit`, info.size >= 64 && info.bottom <= info.vh, JSON.stringify(info));
    if (levelKey === 'medium') await shot('07-tm-medium-start');

    // Read where the pairs are, then play with real clicks.
    const centres = await js(`[...document.querySelectorAll(".tm-tile")].map(t => { const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })`);
    const faces = await js(`[...document.querySelectorAll(".tm-face")].map(f => f.textContent)`);
    const pairs = {};
    faces.forEach((f, i) => (pairs[f] = pairs[f] || []).push(i));
    const list = Object.values(pairs);
    check(`${levelKey}: every picture appears exactly twice`, list.every(p => p.length === 2));

    // Start with a deliberate mismatch, then carry straight on without waiting for it to turn back.
    await click(centres[list[0][0]].x, centres[list[0][0]].y);
    await click(centres[list[1][0]].x, centres[list[1][0]].y);
    check(`${levelKey}: a mismatch is not counted as a pair`, (await js(`document.querySelectorAll(".tm-tile.matched").length`)) === 0);
    // An instant second tap on a showing tile is an accident and must change nothing...
    await click(centres[list[1][0]].x, centres[list[1][0]].y);
    check(`${levelKey}: accidental double tap leaves the mismatch on show`, (await js(`document.querySelectorAll(".tm-tile.up").length`)) === 2);
    // ...but after a moment, tapping one of the two picks it again.
    await sleep(800);
    await click(centres[list[0][0]].x, centres[list[0][0]].y);
    check(`${levelKey}: tapping a showing tile later re-picks it`, (await js(`document.querySelectorAll(".tm-tile.up").length`)) === 1);
    await click(centres[list[0][1]].x, centres[list[0][1]].y);
    let n = 1;
    for (const [a, b] of list.slice(1)) {
      await click(centres[a].x, centres[a].y);
      await click(centres[a].x, centres[a].y); // accidental double tap must be harmless
      await click(centres[b].x, centres[b].y);
      n++;
      const matched = await js(`document.querySelectorAll(".tm-tile.matched").length`);
      if (matched !== n * 2) check(`${levelKey}: pair ${n} matched`, false, "matched=" + matched);
      if (levelKey === "medium" && n === 3) {
        await click(centres[list[4][0]].x, centres[list[4][0]].y);
        await click(centres[list[5][0]].x, centres[list[5][0]].y);
        await shot("08-tm-medium-midgame");
        await sleep(2700);
      }
    }
    await sleep(1700);
    check(`${levelKey}: tile match finish screen appears`, await js(`!!document.querySelector('.win')`), await js(`(document.querySelector('.win-text') || {}).textContent || document.querySelector('.tm-status').textContent`));
    if (levelKey === 'medium') await shot('09-tm-win');
  }

  // Mismatched tiles turn back on their own
  await go('#/tilematch/hard');
  {
    const centres = await js(`[...document.querySelectorAll('.tm-tile')].map(t => { const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })`);
    let a = 0, b = 1;
    await click(centres[a].x, centres[a].y);
    const nameA = await js(`document.querySelectorAll('.tm-tile')[0].getAttribute('aria-label')`);
    for (b = 1; b < centres.length; b++) {
      const sym = await js(`document.querySelectorAll('.tm-face')[${b}].textContent === document.querySelectorAll('.tm-face')[0].textContent`);
      if (!sym) break;
    }
    await click(centres[b].x, centres[b].y);
    check('mismatch stays visible at first', (await js(`document.querySelectorAll('.tm-tile.up').length`)) === 2, nameA);
    await sleep(2800);
    check('mismatch turns back after a pause', (await js(`document.querySelectorAll('.tm-tile.up').length`)) === 0);
  }

  // ---------- Phone (touch) ----------
  await viewport(390, 844, true);
  await go('#/');
  await shot('10-home-phone');
  check('phone: home has no sideways scroll', await js(`document.documentElement.scrollWidth <= innerWidth`));
  await go('#/wordsearch');
  await shot('11-levels-phone');
  await go('#/wordsearch/easy');
  s = await js(SOLVE);
  await shot('12-ws-easy-phone');
  check('phone: no sideways scroll in word search', s.scrollW <= s.vw, `${s.scrollW} vs ${s.vw}`);
  check('phone: letters are a comfortable size', s.cell >= 38, 'cell=' + s.cell.toFixed(1));
  await touchDrag(s.words[0].start.x, s.words[0].start.y, s.words[0].end.x, s.words[0].end.y);
  check('phone: touch-drag finds a word', (await foundCount()) === 1);
  await tapTouch(s.words[1].start.x, s.words[1].start.y);
  await sleep(60);
  await tapTouch(s.words[1].end.x, s.words[1].end.y);
  check('phone: tap-tap finds a word', (await foundCount()) === 2);
  for (const w of s.words.slice(2)) await touchDrag(w.start.x, w.start.y, w.end.x, w.end.y);
  check('phone: grid never moved while words were being found', (await foundCount()) === s.words.length);
  check('phone: page did not scroll while dragging', (await js(`pageYOffset`)) === 0);
  await shot('13-ws-easy-phone-midgame');
  check('phone: Hint button is on screen without scrolling', (await js(`document.querySelector(".ws-foot .btn").getBoundingClientRect().bottom`)) <= 844);
  await viewport(390, 700, true); // same phone with the browser toolbars showing
  for (let k = 0; k < 6; k++) { // several puzzles, since the word list height varies
    await go('#/wordsearch/medium');
    s = await js(SOLVE);
    const hintBottom = await js(`document.querySelector(".ws-foot .btn").getBoundingClientRect().bottom`);
    if (hintBottom > 700 || s.cell < 28) check('short phone: medium grid + Hint fit', false, `cell=${s.cell.toFixed(1)} hintBottom=${hintBottom}`);
  }
  await shot('14a-ws-medium-short-phone');
  await viewport(390, 844, true);
  await go('#/wordsearch/hard');
  s = await js(SOLVE);
  await shot('14-ws-hard-phone');
  check('phone: hard grid still fits width', s.scrollW <= s.vw, 'cell=' + s.cell.toFixed(1));
  await go('#/tilematch/hard');
  await shot('15-tm-hard-phone');
  check('phone: tile match has no sideways scroll', await js(`document.documentElement.scrollWidth <= innerWidth`));
  check('phone: tiles at least 64px', (await js(`document.querySelector('.tm-tile').offsetWidth`)) >= 64);

  // ---------- Tablet ----------
  await viewport(1024, 768, true);
  await go('#/wordsearch/medium');
  s = await js(SOLVE);
  await shot('16-ws-medium-tablet-landscape');
  check('tablet landscape: board fits', s.boardBottom <= s.vh && s.scrollW <= s.vw, `bottom=${s.boardBottom}`);
  await go('#/tilematch/hard');
  await shot('17-tm-hard-tablet-landscape');
  await viewport(1024, 690, true); // tablet with browser toolbars showing
  await go('#/wordsearch/hard');
  s = await js(SOLVE);
  await touchDrag(s.words[0].start.x, s.words[0].start.y, s.words[0].end.x, s.words[0].end.y);
  await shot('17b-ws-hard-short-landscape');
  check('short landscape: hard board and Hint button both fit', s.boardBottom <= s.vh && (await js(`document.querySelector(".ws-foot .btn").getBoundingClientRect().bottom`)) <= s.vh, 'cell=' + s.cell.toFixed(1));
  check('touch play never shows the keyboard focus ring', !(await js(`document.querySelector(".ws-board").classList.contains("keys")`)));
  await viewport(768, 1024, true);
  await go('#/wordsearch/hard');
  s = await js(SOLVE);
  await shot('18-ws-hard-tablet-portrait');
  check('tablet portrait: board + hint button fit', (await js(`document.querySelector('.ws-foot .btn').getBoundingClientRect().bottom`)) <= s.vh);
  await go('#/tilematch/medium');
  await shot('19-tm-medium-tablet-portrait');

  // Back button behaviour
  await viewport(1280, 800, false);
  await go('#/');
  await js(`location.hash = '#/tilematch'`); await sleep(150);
  await js(`location.hash = '#/tilematch/easy'`); await sleep(150);
  await js(`history.back()`); await sleep(250);
  check('Back goes to the level screen, not out of the app', (await js(`location.hash`)) === '#/tilematch' && await js(`!!document.querySelector('.levels')`));
} catch (err) {
  problems.push('DRIVER ERROR: ' + err.stack);
} finally {
  console.log(results.join('\n'));
  console.log('\nPage problems: ' + (problems.length ? '\n' + problems.join('\n') : 'none'));
  console.log(`\n${results.filter(r => r.startsWith('PASS')).length} passed, ${results.filter(r => r.startsWith('FAIL')).length} failed`);
  try { await send('Browser.close'); } catch { /* already gone */ }
  ws.close();
  edge.kill();
  server.close();
  if (problems.length || results.some(r => r.startsWith('FAIL'))) process.exitCode = 1;
}
