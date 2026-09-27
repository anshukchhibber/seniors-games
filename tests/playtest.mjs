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
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  let file = resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (file === ROOT) file = join(ROOT, 'index.html'); // like a real web host
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
// ONLY=pattern,sorting node tests/playtest.mjs   runs just those parts (see the want(...) blocks below).
const want = part => !process.env.ONLY || process.env.ONLY.split(',').includes(part);
const results = [];
const problems = [];
function check(name, ok, extra) {
  results.push((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  -> ' + extra : ''));
}

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(OUT, 'browser-profile')}`,
  '--no-first-run', '--disable-gpu', '--window-size=1280,800',
  '--mute-audio', // the games' sounds are never played out loud while testing
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', // a pretend camera, for the photo
  'about:blank'
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
  await sleep(250);
  // then wait until the page has really drawn (a slow load must not look like a missing button)
  for (let i = 0; i < 40; i++) {
    try {
      if (await js(`document.readyState === 'complete' && document.getElementById('view').children.length > 0`)) break;
    } catch { /* still loading */ }
    await sleep(100);
  }
  await sleep(100);
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
    const L = SG.wordsearch.split(w);
    for (let r = 0; r < n && !hit; r++) for (let c = 0; c < n && !hit; c++) for (const d of dirs) {
      let ok = true;
      for (let i = 0; i < L.length; i++) {
        const rr = r + d[0] * i, cc = c + d[1] * i;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n || grid[rr][cc] !== L[i]) { ok = false; break; }
      }
      if (ok) { hit = { word: w, dir: d, len: L.length, start: at(r, c), end: at(r + d[0] * (L.length - 1), c + d[1] * (L.length - 1)), cell }; break; }
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

  await viewport(1280, 800, false);
  await go('#/');
  await js(`localStorage.clear()`);
  // Every game has been opened before (the first-time "How to play" page is tested on its own).
  const seenAll = () => js(`SG.games.forEach(g => localStorage.setItem('sg.seen.' + g.key, '1'))`);
  await seenAll();
  const levelLabel = () => js(`document.querySelector('.bar-level').textContent`);

  if (want('classic')) {
  // ---------- Desktop ----------
  await go('#/');
  await shot('01-home-desktop');
  check('home shows one big tile per game, each with its picture and name', await js(`document.querySelectorAll('.tile').length === SG.games.length && SG.games.length >= 6 && [...document.querySelectorAll('.tile')].every(t => t.querySelector('svg') && t.querySelector('.tile-title').textContent.trim().length > 2 && t.offsetHeight >= 150)`));
  check('home: nothing on a tile but its picture and name (no tags, blurbs or separate Play buttons)', await js(`document.querySelectorAll('.tile .btn, .tile p').length === 0`));

  // The first time a game is opened: how to play, and one Start button. Then never again.
  await js(`localStorage.removeItem('sg.seen.tilematch'); localStorage.removeItem('sg.last.tilematch')`);
  await go('#/tilematch');
  check('first time: a game opens with how to play and one big Start button', await js(`!!document.querySelector('.intro') && !document.querySelector('.tm-board') && document.querySelectorAll('.intro button').length === 1 && document.querySelector('.intro-start').offsetHeight >= 72`));
  await shot('02a-intro-first-time');
  await js(`document.querySelector('.intro-start').click()`);
  await sleep(200);
  check('Start begins the game at once, on the same page address', await js(`!!document.querySelector('.tm-board') && location.hash === '#/tilematch'`) && (await levelLabel()) === 'Easy');
  await go('#/tilematch');
  check('after that, tapping the game plays it straight away', await js(`!document.querySelector('.intro') && !!document.querySelector('.tm-board')`));
  await go('#/tilematch/hard');
  await go('#/tilematch');
  check('it opens at the level played last time, named top-right', (await levelLabel()) === 'Hard', await levelLabel());
  await go('#/');
  await js(`document.querySelector('.home-settings').click()`);
  await sleep(200);
  check('the settings page has sound and playing hand', await js(`location.hash === '#/settings' && ['On', 'Off', 'Left', 'Right'].every(w => [...document.querySelectorAll('.chooser button')].some(b => b.textContent === w))`));
  await shot('02b-settings');
  await go('#/');

  check('home offers English and Hindi, each in its own script', await js(`['English', 'हिंदी'].every(name => [...document.querySelectorAll('.chooser button')].some(b => b.textContent === name))`));

  await go('#/wordsearch/levels');
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
      if (levelKey === 'medium' && i === 4) { await sleep(400); await shot('04-ws-medium-midgame'); }
    }
    await sleep(2700);
    check(`${levelKey}: finish screen appears`, await js(`!!document.querySelector('.panel-win')`));
    check(`${levelKey}: finish screen lists the found words; the level stays named top-right`, await js(`document.querySelectorAll('.panel-trophies .ws-word.found').length === ${s.words.length}`) && (await levelLabel()) === levelKey[0].toUpperCase() + levelKey.slice(1));
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
  const hintTop = () => js(`Math.round(document.querySelector('.ws-hint').getBoundingClientRect().top)`);
  const status = () => js(`document.querySelector('.status').textContent`);
  const hintTop0 = await hintTop();
  await click(w0.start.x, w0.start.y);
  check('tapping a first letter says so in words', (await status()).startsWith('First letter: ' + w0.word[0] + '.'), await status());
  check('the chosen first letter is clearly drawn (opaque, outlined)', await js(`getComputedStyle(document.querySelector('.ws-preview')).opacity === '1' && document.querySelectorAll('.ws-preview line').length === 2`));
  await shot('06a-ws-first-letter');
  await click(w0.start.x, w0.start.y);
  check('tapping the same letter twice cancels', (await js(`getComputedStyle(document.querySelector('.ws-preview')).display`)) === 'none' && (await status()).startsWith('0 of '));
  await js(`document.querySelector('.ws-hint').click()`);
  check('hint circles a letter', (await js(`document.querySelector('.ws-hint-ring').style.display`)) === '');
  check('hint names the word', (await status()).startsWith('Look for '));
  await shot('06-ws-hint');
  await sleep(6500);
  check('the hint never times out by itself', (await js(`document.querySelector('.ws-hint-ring').style.display`)) === '' && (await status()).startsWith('Look for '));
  { // sideways slip: start one letter to the side of the real first letter, end on the real last letter
    const w = s.words[1];
    const towardsMiddle = (pos, far) => (pos > far ? -s.cell : s.cell);
    const side = w.dir[1] === 0
      ? { x: towardsMiddle(w.start.x, s.boardRight - s.cell * s.n / 2), y: 0 }
      : { x: 0, y: towardsMiddle(w.start.y, s.boardBottom - s.cell * s.n / 2) };
    await click(w.start.x + side.x, w.start.y + side.y);
    await click(w.end.x, w.end.y);
    check('a first letter one square to the side is forgiven', (await foundCount()) === 1, w.word);
  }
  check('the Hint button never moves as the status line changes', (await hintTop()) === hintTop0, `${hintTop0} -> ${await hintTop()}`);

  // The level page, opened mid-game, keeps the game and offers to carry on
  const gridBefore = await js(`document.querySelector('.ws-board').textContent`);
  const resumeButton = label => js(`[...document.querySelectorAll('.levels-resume button')].find(b => b.textContent === '${label}').click()`);
  await js(`document.querySelector('.bar-level').click()`);
  await sleep(200);
  check('the level button opens the level page, which offers to carry on', await js(`location.hash === '#/wordsearch/levels' && !!document.querySelector('.levels-resume') && document.querySelector('.stage').hidden`) && (await js(`document.querySelector('.levels-resume-text').textContent`)).startsWith('1 of 5 words found'), await js(`(document.querySelector('.levels-resume-text') || {}).textContent`));
  await shot('06b-ws-levels-resume');
  await js(`document.querySelector('.levels-howto').click()`);
  await sleep(250);
  check('How to play opens from the level page, with a hand showing the move and a Back button', await js(`location.hash === '#/wordsearch/howto' && !!document.querySelector('.intro .demo-hand') && document.querySelector('.intro-start').textContent === 'Back'`));
  await js(`document.querySelector('.intro-start').click()`);
  await sleep(250);
  check('Back returns to the level page, with the game still waiting', await js(`location.hash === '#/wordsearch/levels' && !!document.querySelector('.levels-resume')`));
  await resumeButton('Keep Playing');
  await sleep(200);
  check('Keep Playing returns to the same puzzle', (await js(`document.querySelector('.ws-board').textContent`)) === gridBefore && (await foundCount()) === 1 && (await js(`location.hash`)) === '#/wordsearch/easy');
  await js(`location.hash = '#/wordsearch/levels'`);
  await sleep(200);
  await js(`history.back()`);
  await sleep(250);
  check('the tablet Back button from the level page also returns to the same puzzle', (await js(`document.querySelector('.ws-board').textContent`)) === gridBefore && (await foundCount()) === 1);
  await js(`location.hash = '#/wordsearch/levels'`);
  await sleep(200);
  await resumeButton('New Puzzle');
  await sleep(250);
  check('New Puzzle there starts afresh', (await js(`document.querySelector('.ws-board').textContent`)) !== gridBefore && (await foundCount()) === 0 && (await js(`location.hash`)) === '#/wordsearch/easy');
  await js(`location.hash = '#/wordsearch/levels'`);
  await sleep(200);
  check('with nothing found yet, there is nothing to carry on', await js(`!document.querySelector('.levels-resume')`));
  await js(`[...document.querySelectorAll('.level-btn')][2].click()`);
  await sleep(250);
  check('choosing another level plays it', (await js(`location.hash`)) === '#/wordsearch/hard' && (await levelLabel()) === 'Hard');

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
  const tmState = () => js(`(() => {
    const t = [...document.querySelectorAll('.tm-tile')];
    return t.map(x => { const r = x.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, face: x.querySelector('.tm-face').textContent }; });
  })()`);
  for (const [levelKey, group, sets] of [['easy', 2, 4], ['medium', 2, 6], ['hard', 3, 4]]) {
    await go('#/tilematch/' + levelKey);
    const info = await js(`(() => { const t = [...document.querySelectorAll('.tm-tile')]; const b = document.querySelector('.tm-board').getBoundingClientRect(); return { count: t.length, size: t[0].offsetWidth, bottom: b.bottom, vh: innerHeight }; })()`);
    check(`${levelKey}: all ${group * sets} pictures show at once, big, and fit`, info.count === group * sets && info.size >= 64 && info.bottom <= info.vh, JSON.stringify(info));
    if (levelKey === 'medium') await shot('07-tm-medium-start');
    const tiles = await tmState();
    const bySymbol = {};
    tiles.forEach((t, i) => (bySymbol[t.face] = bySymbol[t.face] || []).push(i));
    const list = Object.values(bySymbol);
    check(`${levelKey}: every picture appears exactly ${group} times`, list.length === sets && list.every(p => p.length === group));
    const tmStatus = () => js(`document.querySelector('.status').textContent`);
    const matched = () => js(`document.querySelectorAll('.tm-tile.matched').length`);
    check(`${levelKey}: says what to do, in a few words`, (await tmStatus()) === (group === 3 ? 'Tap three that are the same.' : 'Tap two that are the same.'), await tmStatus());
    // Two that differ: a little shake, let go, nothing counted
    const a = list[0][0], b = list[1][0];
    await click(tiles[a].x, tiles[a].y);
    check(`${levelKey}: a tapped picture is picked up and named`, await js(`document.querySelectorAll('.tm-tile.picked').length === 1`) && (await tmStatus()).startsWith(tiles[a].face === '🍎' ? 'Apple' : ''), await tmStatus());
    await click(tiles[b].x, tiles[b].y);
    check(`${levelKey}: two that differ are let go gently, and nothing is counted`, (await tmStatus()) === 'Not the same. Try again.' && (await matched()) === 0 && await js(`document.querySelectorAll('.tm-tile.picked').length === 0`), await tmStatus());
    let n = 0;
    for (const set of list) {
      for (const k of set) { await click(tiles[k].x, tiles[k].y); if (k === set[0]) await click(tiles[k].x, tiles[k].y); } // an accidental double tap is harmless
      n++;
      if ((await matched()) !== n * group) { check(`${levelKey}: set ${n} matched`, false, 'matched=' + await matched()); break; }
      if (levelKey === 'medium' && n === 3) { await sleep(300); await shot('08-tm-medium-midgame'); }
    }
    await sleep(2300);
    check(`${levelKey}: finish screen appears`, await js(`!!document.querySelector('.panel-win')`), await js(`(document.querySelector('.panel-text') || {}).textContent || document.querySelector('.status').textContent`));
    if (levelKey === 'medium') await shot('09-tm-win');
  }
  await go('#/tilematch/easy');
  {
    const tiles = await tmState();
    const boardTop = await js(`Math.round(document.querySelector('.tm-board').getBoundingClientRect().top)`);
    await click(tiles[0].x, tiles[0].y);
    await sleep(700);
    await click(tiles[0].x, tiles[0].y);
    check('tapping a picked picture again lets it go', await js(`document.querySelectorAll('.tm-tile.picked').length === 0`));
    check('the tiles never move as the status line changes', (await js(`Math.round(document.querySelector('.tm-board').getBoundingClientRect().top)`)) === boardTop);
  }

  // ---------- Number Hunt (desktop) ----------
  const nhState = () => js(`(() => {
    const tiles = [...document.querySelectorAll('.nh-tile')];
    const b = document.querySelector('.nh-board').getBoundingClientRect();
    const where = {};
    tiles.forEach(t => { const r = t.getBoundingClientRect(); where[t.textContent] = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const rects = tiles.map(t => t.getBoundingClientRect());
    let overlap = false, outside = false;
    rects.forEach((a, i) => {
      if (a.left < b.left - 1 || a.right > b.right + 1 || a.top < b.top - 1 || a.bottom > b.bottom + 1) outside = true;
      rects.slice(i + 1).forEach(c => { if (Math.hypot(a.x - c.x, a.y - c.y) < a.width - 1) overlap = true; });
    });
    return { count: tiles.length, numbers: tiles.map(t => +t.textContent).sort((a, b) => a - b), where, cell: tiles[0].offsetWidth, overlap, outside,
      top: Math.round(b.top), bottom: b.bottom, vh: innerHeight, vw: innerWidth, scrollW: document.documentElement.scrollWidth,
      font: parseFloat(getComputedStyle(tiles[0].querySelector('.nh-num')).fontSize) };
  })()`);
  const nhStatus = () => js(`document.querySelector('.status').textContent`);
  const nhTarget = () => js(`document.querySelector('.nh-target-number').textContent`);
  for (const [levelKey, expected] of [['easy', 12], ['medium', 20], ['hard', 30]]) {
    await go('#/numbers/' + levelKey);
    const st = await nhState();
    check(`numbers ${levelKey}: shows 1 to ${expected}, each exactly once`, st.count === expected && st.numbers.every((n, i) => n === i + 1));
    check(`numbers ${levelKey}: big round numbers, and everything fits`, st.cell >= 64 && st.font >= 19 && st.bottom <= st.vh && st.scrollW <= st.vw, `size=${st.cell} font=${st.font} bottom=${st.bottom}`);
    check(`numbers ${levelKey}: scattered, but no two numbers overlap and none leaves the board`, !st.overlap && !st.outside);
    if (levelKey === 'hard') await shot('21-nh-hard-start');

    await click(st.where[5].x, st.where[5].y);
    check(`numbers ${levelKey}: tapping another number is met gently, and changes nothing`, (await nhStatus()) === 'That is 5. Find 1.' && (await js(`document.querySelectorAll('.nh-tile.done').length`)) === 0, await nhStatus());
    await js(`document.querySelector('.nh-hint').click()`);
    check(`numbers ${levelKey}: Show Me circles the next number`, await js(`[...document.querySelectorAll('.nh-tile.hinting')].map(t => t.textContent).join() === '1'`) && (await nhStatus()) === '1 is circled.');
    if (levelKey === 'easy') await shot('20-nh-easy-hint');

    for (let n = 1; n <= expected; n++) {
      await click(st.where[n].x, st.where[n].y);
      if (n % 7 === 0) await click(st.where[n].x, st.where[n].y); // accidental double tap on a found number
      if (n === 3) {
        check(`numbers ${levelKey}: the big number shows what to find next`, (await nhTarget()) === '4' && (await nhStatus()) === 'Good! 3 of ' + expected + '.', await nhStatus());
        check(`numbers ${levelKey}: the hint clears once its number is found`, (await js(`document.querySelectorAll('.nh-tile.hinting').length`)) === 0);
        await js(`location.hash = '#/numbers/levels'`);
        await sleep(200);
        check(`numbers ${levelKey}: the level page offers to carry on`, await js(`!!document.querySelector('.levels-resume') && document.querySelector('.stage').hidden`));
        await js(`[...document.querySelectorAll('.levels-resume button')].find(b => b.textContent === 'Keep Playing').click()`);
        await sleep(200);
      }
      if (levelKey === 'medium' && n === 14) await shot('22-nh-medium-midgame');
    }
    const after = await nhState();
    check(`numbers ${levelKey}: the grid never moved during play`, after.top === st.top, `${st.top} -> ${after.top}`);
    check(`numbers ${levelKey}: out-of-order taps never counted`, (await js(`document.querySelectorAll('.nh-tile.done').length`)) === expected);
    await sleep(2700);
    check(`numbers ${levelKey}: finish screen appears`, await js(`!!document.querySelector('.panel-win')`), await js(`(document.querySelector('.panel-text') || {}).textContent`));
    if (levelKey === 'easy') await shot('23-nh-win');
  }

  // ---------- Hindi ----------
  await go('#/');
  await js(`[...document.querySelectorAll('.chooser button')].find(b => b.textContent === 'हिंदी').click()`);
  await sleep(150);
  check('Hindi: the whole home page switches', await js(`document.documentElement.lang === 'hi' && document.querySelector('.home-title').textContent === 'सनी गेम्स' && [...document.querySelectorAll('.tile-title')].every(n => /[\u0900-\u097F]/.test(n.textContent))`));
  await shot('30-hi-home');
  check('Hindi: words split into aksharas, not characters', await js(`JSON.stringify(['रिश्तेदार', 'इंद्रधनुष', 'बुज़ुर्ग', 'कठफोड़वा'].map(w => SG.wordsearch.split(w).join(' '))) === JSON.stringify(['रि श्ते दा र', 'इं द्र ध नु ष', 'बु ज़ु र्ग', 'क ठ फो ड़ वा'])`));
  check('Hindi: every word in every topic has at least 3 aksharas', await js(`SG.themes.hi.every(t => t.words.length >= 10 && t.words.every(w => SG.wordsearch.split(w).length >= 3))`));
  await go('#/wordsearch/levels');
  await shot('31-hi-levels');
  for (const levelKey of ['easy', 'hard']) {
    await go('#/wordsearch/' + levelKey);
    const hs = await js(SOLVE);
    check(`Hindi ${levelKey}: every word is really in the grid`, hs.words.length === (levelKey === 'easy' ? 5 : 8) && hs.words.every(w => !w.missing), JSON.stringify(hs.words.filter(w => w.missing)));
    const letter = await js(`parseFloat(getComputedStyle(document.querySelector('.ws-cell')).fontSize)`);
    check(`Hindi ${levelKey}: aksharas are big and the board fits`, letter >= 19 && hs.boardBottom <= hs.vh && hs.scrollW <= hs.vw, 'letter=' + letter);
    let k = 0;
    for (const w of hs.words) {
      if (k % 2) { await click(w.start.x, w.start.y); await click(w.end.x, w.end.y); }
      else await drag(w.start.x, w.start.y, w.end.x, w.end.y);
      k++;
      if (k === 1) check(`Hindi ${levelKey}: the status line speaks Hindi`, (await js(`document.querySelector('.status').textContent`)).includes('मिल गया'), await js(`document.querySelector('.status').textContent`));
      if (levelKey === 'hard' && k === 5) { await sleep(400); await shot('32-hi-ws-hard-midgame'); }
    }
    check(`Hindi ${levelKey}: all words found by drag and by tap-tap`, (await foundCount()) === hs.words.length, 'found=' + await foundCount());
    await sleep(2700);
    check(`Hindi ${levelKey}: finish screen in Hindi`, (await js(`(document.querySelector('.panel-title') || {}).textContent`)) === 'शाबाश!');
    if (levelKey === 'easy') await shot('33-hi-ws-win');
  }
  for (const levelKey of ['easy', 'medium', 'hard']) {
    const ms = await js(`(() => { const d = document.createElement('div'); document.body.appendChild(d); const g = SG.wordsearch.mount(d, '${levelKey}'); const t = performance.now(); for (let i = 0; i < 300; i++) g.newGame(); const e = performance.now() - t; g.destroy(); d.remove(); return e / 300; })()`);
    check(`Hindi ${levelKey}: 300 puzzles build without error`, true, ms.toFixed(2) + ' ms each');
  }
  await go('#/tilematch/hard');
  {
    const tiles = await tmState();
    const classic = ['🍎', '🍇', '🚗', '⚽', '🎁', '🐢', '🌈', '🐱', '✈️'];
    check('Hindi tile match: uses the Indian picture set', tiles.every(t => !classic.includes(t.face)), tiles.map(t => t.face).join(' '));
    await click(tiles[0].x, tiles[0].y);
    check('Hindi tile match: names the picture in Hindi', /[ऀ-ॿ]/.test(await js(`document.querySelector('.tm-tile').getAttribute('aria-label')`)) && (await js(`document.querySelector('.status').textContent`)).includes('दो और'), await js(`document.querySelector('.status').textContent`));
    await sleep(300);
    await shot('34-hi-tilematch');
  }
  await go('#/numbers/easy');
  check('Hindi number hunt: instructions in Hindi', (await js(`document.querySelector('.nh-target-label').textContent`)) === 'ढूँढ़िए' && (await js(`document.querySelector('.nh-hint').textContent`)) === 'दिखाइए');
  await viewport(390, 844, true);
  await go('#/wordsearch/hard');
  {
    const hs = await js(SOLVE);
    const letter = await js(`parseFloat(getComputedStyle(document.querySelector('.ws-cell')).fontSize)`);
    check('Hindi on a phone: a smaller grid keeps aksharas at least 19px', hs.cell >= 42 && letter >= 19 && hs.scrollW <= hs.vw && hs.words.every(w => !w.missing), `n=${hs.n} cell=${hs.cell.toFixed(1)} letter=${letter}`);
    await touchDrag(hs.words[0].start.x, hs.words[0].start.y, hs.words[0].end.x, hs.words[0].end.y);
    check('Hindi on a phone: touch-drag finds a word', (await foundCount()) === 1);
    await sleep(400);
    await shot('35-hi-ws-phone');
  }
  await go('#/');
  await shot('36-hi-home-phone');
  check('Hindi on a phone: home has no sideways scroll', await js(`document.documentElement.scrollWidth <= innerWidth`));
  await js(`[...document.querySelectorAll('.chooser button')].find(b => b.textContent === 'English').click()`);
  await sleep(150);
  check('switching back to English works', await js(`document.documentElement.lang === 'en' && document.querySelector('.home-title').textContent === 'Sunny Games'`));

  // ---------- Phone (touch) ----------
  await viewport(390, 844, true);
  await go('#/');
  await shot('10-home-phone');
  check('phone: home has no sideways scroll', await js(`document.documentElement.scrollWidth <= innerWidth`));
  await go('#/wordsearch/levels');
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
  await sleep(400);
  await shot('13-ws-easy-phone-midgame');
  check('phone: Hint button is on screen without scrolling', (await js(`document.querySelector(".ws-foot .btn").getBoundingClientRect().bottom`)) <= 844);
  await viewport(390, 700, true); // same phone with the browser toolbars showing
  for (let k = 0; k < 6; k++) { // several puzzles, since the word list height varies
    await go('#/wordsearch/medium');
    s = await js(SOLVE);
    const letter = await js(`parseFloat(getComputedStyle(document.querySelector('.ws-cell')).fontSize)`);
    if (s.cell < 34 || letter < 19 || s.scrollW > s.vw) check('short phone: letters stay readable', false, `cell=${s.cell.toFixed(1)} letter=${letter}`);
  }
  check('short phone: letters stay readable (6 puzzles)', true);
  await shot('14a-ws-medium-short-phone');
  await viewport(390, 844, true);
  await go('#/wordsearch/hard');
  s = await js(SOLVE);
  await shot('14-ws-hard-phone');
  check('phone: hard grid still fits width', s.scrollW <= s.vw, 'cell=' + s.cell.toFixed(1));
  check('phone: hard uses a smaller grid so letters stay at least 19px', s.n <= 10 && (await js(`parseFloat(getComputedStyle(document.querySelector('.ws-cell')).fontSize)`)) >= 19, 'n=' + s.n);
  await go('#/tilematch/hard');
  await shot('15-tm-hard-phone');
  check('phone: tile match has no sideways scroll', await js(`document.documentElement.scrollWidth <= innerWidth`));
  check('phone: tiles at least 64px', (await js(`document.querySelector('.tm-tile').offsetWidth`)) >= 64);
  { // a finger that slides 30px while pressing (tremor) must still count as a tap
    const t = await js(`(() => { const r = document.querySelector('.tm-tile').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    await touchDrag(t.x - 15, t.y - 10, t.x + 15, t.y + 12);
    check('phone: a drifting finger still picks up the picture', await js(`document.querySelector('.tm-tile').classList.contains('picked')`));
    const centred = await js(`(() => { const b = document.querySelector('.tm-board').getBoundingClientRect(); return { above: b.top, below: innerHeight - b.bottom }; })()`);
    check('phone: the tiles sit in the middle of the screen, within easy reach', centred.below < centred.above + 80, JSON.stringify(centred));
  }
  await go('#/numbers/hard');
  {
    const st = await nhState();
    check('phone: Number Hunt uses fewer, bigger numbers instead of tiny ones', st.count <= 30 && st.count >= 12 && st.cell >= 64 && !st.overlap && !st.outside && st.scrollW <= st.vw, `count=${st.count} size=${st.cell}`);
    check('phone: Show Me button is on screen', (await js(`document.querySelector('.nh-hint').getBoundingClientRect().bottom`)) <= 844);
    await touchDrag(st.where[1].x - 10, st.where[1].y - 8, st.where[1].x + 10, st.where[1].y + 9);
    check('phone: a drifting finger still counts on a number', (await nhTarget()) === '2');
    await tapTouch(st.where[2].x, st.where[2].y);
    await tapTouch(st.where[3].x, st.where[3].y);
    await shot('24-nh-hard-phone');
  }
  check('long-press cannot select text or open a link preview', await js(`getComputedStyle(document.body).userSelect === 'none' && [...document.querySelectorAll('a')].every(a => a.getAttribute('draggable') === 'false')`));

  // ---------- Tablet ----------
  await viewport(1024, 768, true);
  await go('#/wordsearch/medium');
  s = await js(SOLVE);
  await shot('16-ws-medium-tablet-landscape');
  check('tablet landscape: board fits', s.boardBottom <= s.vh && s.scrollW <= s.vw, `bottom=${s.boardBottom}`);
  check('right hand (default): word list is to the right of the grid', await js(`document.querySelector('.ws-info').getBoundingClientRect().left > document.querySelector('.ws-board').getBoundingClientRect().right`));
  await go('#/settings');
  await js(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Left').click()`);
  await shot('16a-settings-tablet-landscape');
  await go('#/wordsearch/medium');
  check('left hand: word list and Hint move to the left of the grid', await js(`document.querySelector('.ws-hint').getBoundingClientRect().right < document.querySelector('.ws-board').getBoundingClientRect().left`));
  await shot('16b-ws-medium-left-handed');
  await go('#/settings');
  await js(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Right').click()`);
  await go('#/tilematch/levels');
  await shot('16c-tm-levels-tablet-landscape');
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
  await go('#/');
  await shot('19a-home-tablet-portrait');
  check('tablet portrait: home has no sideways scroll', await js(`document.documentElement.scrollWidth <= innerWidth`));
  await go('#/numbers/hard');
  {
    const st = await nhState();
    check('tablet portrait: all 30 numbers, big', st.count === 30 && st.cell >= 80 && !st.overlap && st.scrollW <= st.vw, `count=${st.count} size=${st.cell}`);
    await shot('19b-nh-hard-tablet-portrait');
  }

  // Back button behaviour
  await viewport(1280, 800, false);
  await go('#/');
  await js(`location.hash = '#/tilematch/levels'`); await sleep(150);
  await js(`location.hash = '#/tilematch/easy'`); await sleep(150);
  await js(`history.back()`); await sleep(250);
  check('Back goes to the level screen, not out of the app', (await js(`location.hash`)) === '#/tilematch/levels' && await js(`!!document.querySelector('.levels')`));
  } // classic

  const statusText = () => js(`document.querySelector('.status').textContent`);
  const centresOf = sel => js(`[...document.querySelectorAll(${JSON.stringify(sel)})].map(t => { const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })`);
  const noSideScroll = () => js(`document.documentElement.scrollWidth <= innerWidth`);

  // ---------- Repeat the Pattern ----------
  if (want('pattern')) {
    await viewport(1280, 800, false);
    await go('#/pattern/levels');
    await shot('40-pt-levels');
    check('pattern: three levels listed', (await js(`document.querySelectorAll('.level-btn').length`)) === 3);

    // Presses Watch and notes which pads light up, the way a player would.
    const watchAndRecord = async () => {
      await js(`document.querySelector('.pt-watch').click()`);
      const seen = [];
      let prev = -1;
      for (let i = 0; i < 200; i++) {
        const state = await js(`({ lit: [...document.querySelectorAll('.pt-pad')].findIndex(p => p.classList.contains('lit')), showing: !!document.querySelector('.pt-showing') })`);
        if (state.lit !== prev && state.lit !== -1) seen.push(state.lit);
        prev = state.lit;
        if (!state.showing) break;
        await sleep(60);
      }
      return seen;
    };

    for (const [levelKey, pads, from, to] of [['easy', 4, 2, 5], ['hard', 6, 3, 7]]) {
      await go('#/pattern/' + levelKey);
      const info = await js(`(() => { const p = [...document.querySelectorAll('.pt-pad')]; const w = document.querySelector('.pt-watch').getBoundingClientRect(); return { count: p.length, size: p[0].offsetWidth, watchBottom: w.bottom, vh: innerHeight }; })()`);
      check(`pattern ${levelKey}: ${pads} big pads, and Watch is on screen`, info.count === pads && info.size >= 90 && info.watchBottom <= info.vh, JSON.stringify(info));
      check(`pattern ${levelKey}: opens by saying what to do`, (await statusText()).includes('Watch'), await statusText());
      if (levelKey === 'easy') await shot('41-pt-easy-start');
      const centres = await centresOf('.pt-pad');
      await click(centres[0].x, centres[0].y);
      check(`pattern ${levelKey}: a pad pressed before watching only plays its note`, (await js(`document.querySelectorAll('.pt-dots .on').length`)) === 0);

      let seq = await watchAndRecord();
      check(`pattern ${levelKey}: shows a pattern of ${from}, then hands over`, seq.length === from && (await statusText()).startsWith('Your turn'), `seen=${seq} status=${await statusText()}`);
      // A slip first: it is met gently and nothing is lost.
      const wrong = (seq[0] + 1) % pads;
      await click(centres[wrong].x, centres[wrong].y);
      check(`pattern ${levelKey}: a slip invites another look, with no "wrong"`, (await statusText()).startsWith('Not quite'), await statusText());
      if (levelKey === 'easy') { await sleep(100); await shot('42-pt-slip'); }
      seq = await watchAndRecord();
      check(`pattern ${levelKey}: Watch Again replays the same length`, seq.length === from);

      const rounds = [];
      for (let len = from; len <= to; len++) {
        if (len > from) seq = await watchAndRecord();
        rounds.push(seq);
        if (seq.length !== len) { check(`pattern ${levelKey}: pattern of ${len} shown`, false, 'seen ' + seq); break; }
        for (let k = 0; k < seq.length; k++) {
          await click(centres[seq[k]].x, centres[seq[k]].y);
          if (k === 0) await click(centres[seq[k]].x, centres[seq[k]].y); // an accidental double tap is ignored
          await sleep(80);
        }
        if (len === from + 1 && levelKey === 'easy') await shot('43-pt-round-done');
        if (len < to && !(await statusText()).startsWith('Well done')) check(`pattern ${levelKey}: round ${len} completes`, false, await statusText());
      }
      check(`pattern ${levelKey}: every round is a new pattern, not the last one made longer`, rounds.slice(1).some((r, i) => r.slice(0, rounds[i].length).join() !== rounds[i].join()), JSON.stringify(rounds));
      await sleep(2700);
      check(`pattern ${levelKey}: finish screen appears after the longest pattern`, await js(`!!document.querySelector('.panel-win')`), await statusText().catch(() => ''));
      if (levelKey === 'easy') await shot('44-pt-win');
    }

    // Taps while the pattern is being shown change nothing
    await go('#/pattern/medium');
    {
      const centres = await centresOf('.pt-pad');
      await js(`document.querySelector('.pt-watch').click()`);
      await sleep(900);
      check('pattern: while showing, the lit pad shows its step number', (await js(`(document.querySelector('.pt-pad.lit') || {}).dataset?.step`)) === '1');
      await shot('41b-pt-showing-step');
      await click(centres[1].x, centres[1].y);
      check('pattern: tapping during the show changes nothing', (await js(`document.querySelectorAll('.pt-dots .on').length`)) === 0 && (await statusText()) === 'Watch…');
    }

    await viewport(390, 844, true);
    await go('#/pattern/hard');
    {
      const info = await js(`(() => { const p = [...document.querySelectorAll('.pt-pad')]; const w = document.querySelector('.pt-watch').getBoundingClientRect(); return { size: p[0].offsetWidth, watchBottom: w.bottom, vh: innerHeight }; })()`);
      check('phone: six pads stay big and Watch is on screen', info.size >= 90 && info.watchBottom <= info.vh, JSON.stringify(info));
      check('phone: pattern has no sideways scroll', await noSideScroll());
      await shot('45-pt-hard-phone');
    }
    await viewport(1024, 768, true);
    await go('#/pattern/hard');
    await shot('46-pt-hard-tablet-landscape');
    check('tablet: Watch is on screen', (await js(`document.querySelector('.pt-watch').getBoundingClientRect().bottom`)) <= 768);
    await viewport(1280, 800, false);
  }

  // ---------- Sort into Baskets ----------
  if (want('sorting')) {
    // Which basket the picture on show belongs in (answer key from the game's own lists).
    // The pictures on the table, each with the basket it belongs in.
    const SORT_STATE = `(() => {
      const names = [...document.querySelectorAll('.so-basket-name')].map(n => n.textContent);
      const keys = names.map(n => Object.keys(SG.sorting.groups).find(k => [SG.sorting.groups[k].en, SG.sorting.groups[k].hi].includes(n)));
      const cards = [...document.querySelectorAll('.so-card')].map(card => {
        const pic = card.querySelector('.so-card-pic').textContent;
        const c = card.getBoundingClientRect();
        return { x: c.left + c.width / 2, y: c.top + c.height / 2, size: c.width, bottom: c.bottom, right: keys.findIndex(k => SG.sorting.groups[k].items.some(i => i[0] === pic)) };
      });
      const baskets = [...document.querySelectorAll('.so-basket')].map(b => { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, bottom: r.bottom }; });
      return { cards, card: cards[0], right: cards.length ? cards[0].right : -1, baskets, sorted: document.querySelectorAll('.so-contents span').length, vh: innerHeight, scrollW: document.documentElement.scrollWidth, vw: innerWidth };
    })()`;
    const sortState = () => js(SORT_STATE);

    check('sorting: every set of baskets has enough pictures for its level, and no picture fits two of its baskets', await js(`(() => {
      const g = SG.sorting.groups;
      const need = { easy: 6, medium: 10, hard: 12 };
      return Object.keys(SG.sorting.sets).every(level => SG.sorting.sets[level].every(set => {
        const clash = set.some((k, i) => set.slice(i + 1).some(j => g[k].items.some(a => g[j].items.some(b => b[0] === a[0]))));
        return !clash && set.reduce((sum, k) => sum + g[k].items.filter(i => !i[3] && i[0] !== g[k].sign).length, 0) >= need[level];
      }));
    })()`));
    await viewport(1280, 800, false);
    await go('#/sorting/levels');
    await shot('50-so-levels');
    for (const [levelKey, baskets, things] of [['easy', 2, 6], ['medium', 2, 10], ['hard', 3, 12]]) {
      await go('#/sorting/' + levelKey);
      let st = await sortState();
      check(`sorting ${levelKey}: ${baskets} baskets, four big pictures on the table, all on screen`, st.baskets.length === baskets && st.cards.length === 4 && st.cards.every(c => c.size >= 130) && st.baskets.every(b => b.bottom <= st.vh) && st.scrollW <= st.vw, JSON.stringify({ sizes: st.cards.map(c => c.size), bottoms: st.baskets.map(b => b.bottom) }));
      if (levelKey === 'easy') await shot('51-so-easy-start');

      if (levelKey !== 'medium') {
        // A basket tapped first explains; a tap picks a picture up; a wrong basket sends it back;
        // a second try shows the answer.
        await click(st.baskets[0].x, st.baskets[0].y);
        await sleep(100);
        check(`sorting ${levelKey}: tapping a basket first says to pick a picture`, (await statusText()).startsWith('First tap a picture') && (await sortState()).sorted === 0, await statusText());
        await click(st.card.x, st.card.y);
        check(`sorting ${levelKey}: tapping a picture picks it up and says what to do`, (await statusText()).includes('Now tap its basket') && await js(`document.querySelector('.so-card').classList.contains('so-selected')`), await statusText());
        await click(st.card.x, st.card.y);
        check(`sorting ${levelKey}: tapping it again keeps it picked up`, await js(`document.querySelector('.so-card').classList.contains('so-selected')`));
        const wrong = (st.right + 1) % baskets;
        await drag(st.card.x, st.card.y, st.baskets[wrong].x, st.baskets[wrong].y);
        await sleep(600);
        if (levelKey === 'hard') await shot('52-so-wrong');
        check(`sorting ${levelKey}: a wrong basket shakes its head with a cross`, await js(`document.querySelectorAll('.so-basket.so-nope').length === 1`));
        check(`sorting ${levelKey}: a wrong basket sends the picture back, gently`, (await statusText()).startsWith('Not in ') && (await sortState()).sorted === 0, await statusText());
        await click(st.baskets[wrong].x, st.baskets[wrong].y);
        await sleep(100);
        check(`sorting ${levelKey}: a second miss shows the right basket, with a pointing hand`, (await statusText()).includes('See the hand') && (await js(`document.querySelectorAll('.so-basket.so-hint').length === 1 && getComputedStyle(document.querySelector('.so-hint .so-point')).display === 'block'`)), await statusText());
        if (levelKey === 'hard') { await sleep(2600); await shot('52b-so-hint'); }
        // Let go far from any basket: it floats back and nothing else happens.
        await drag(st.card.x, st.card.y, st.card.x + 300, st.card.y - 150);
        await sleep(450);
        check(`sorting ${levelKey}: letting go away from the baskets changes nothing`, (await sortState()).sorted === 0);
      }

      for (let k = 0; k < things; k++) {
        st = await sortState();
        if (!st.cards.length) { // should never happen: say exactly what was on the screen
          check(`sorting ${levelKey}: a picture is on the table for turn ${k + 1}`, false, JSON.stringify(await js(`({ hash: location.hash, status: (document.querySelector('.status') || {}).textContent, slots: document.querySelectorAll('.so-slot').length, cards: document.querySelectorAll('.so-card').length, win: !!document.querySelector('.panel-win'), sorted: document.querySelectorAll('.so-contents span').length })`)));
          break;
        }
        const card = st.cards[k % st.cards.length];
        const b = st.baskets[card.right];
        if (k % 2) { await click(card.x, card.y); await click(b.x, b.y); await click(b.x, b.y); } // tap, tap - with an accidental double tap
        else await drag(card.x, card.y, b.x + 30, b.y - 20);
        await sleep(k % 2 ? 800 : 450);
        if (k === 0) check(`sorting ${levelKey}: a new picture takes the sorted one's place on the table`, (await sortState()).cards.length === Math.min(4, things - 1));
        if ((await sortState()).sorted !== k + 1) { check(`sorting ${levelKey}: picture ${k + 1} sorted`, false, await statusText()); break; }
        if (levelKey === 'hard' && k === 6) await shot('53-so-hard-midgame');
      }
      await sleep(2300);
      check(`sorting ${levelKey}: finish screen appears`, await js(`!!document.querySelector('.panel-win')`));
      if (levelKey === 'hard') await shot('54-so-win');
    }

    await viewport(390, 844, true);
    await go('#/sorting/hard');
    {
      const st = await sortState();
      check('phone: three baskets and the pictures all fit', st.baskets.every(b => b.bottom <= st.vh) && st.scrollW <= st.vw && st.cards.length >= 2 && st.cards.every(c => c.size >= 130), JSON.stringify({ cards: st.cards.map(c => c.size), bottoms: st.baskets.map(b => b.bottom) }));
      const b = st.baskets[st.right];
      await touchDrag(st.card.x, st.card.y, b.x, b.y);
      await sleep(450);
      check('phone: sliding with a finger sorts a picture', (await sortState()).sorted === 1);
      check('phone: the page did not scroll while sliding', (await js(`pageYOffset`)) === 0);
      await shot('55-so-hard-phone');
    }
    await viewport(1024, 768, true);
    await go('#/sorting/medium');
    await shot('56-so-medium-tablet');
    // Each basket can be told apart without reading: its own scene and a picture label
    for (const [want, name] of [['Sky', '57-so-land-water-sky'], ['Hot', '58-so-hot-cold'], ['Puja', '59-so-kitchen-puja']]) {
      for (let i = 0; i < 12; i++) {
        await go('#/sorting/' + (want === 'Hot' ? 'easy' : want === 'Puja' ? 'medium' : 'hard'));
        if (await js(`[...document.querySelectorAll('.so-basket-name')].some(n => n.textContent === '${want}')`)) break;
      }
      await shot(name);
    }
    check('sorting: every basket has its own look and a picture label', await js(`(() => { const b = [...document.querySelectorAll('.so-basket')]; return b.every(x => x.querySelector('.so-sign').textContent.trim()) && new Set(b.map(x => getComputedStyle(x).backgroundImage + getComputedStyle(x).backgroundColor)).size === b.length; })()`));
    await viewport(1280, 800, false);
  }

  // ---------- Colouring Book ----------
  if (want('colouring')) {
    // A point inside each tap target where that part really is on top (found by probing the page).
    const PART_POINTS = `(() => [...document.querySelectorAll('.col-picture [data-part][tabindex]')].map(p => {
      const r = p.getBoundingClientRect();
      for (let fy = 0.5; fy < 1; fy += 0.07) for (const sy of [1, -1]) for (let fx = 0.5; fx < 1; fx += 0.07) for (const sx of [1, -1]) {
        const x = r.left + r.width * (0.5 + sx * (fx - 0.5)), y = r.top + r.height * (0.5 + sy * (fy - 0.5));
        if (document.elementFromPoint(x, y) === p) return { part: p.dataset.part, x, y };
      }
      return { part: p.dataset.part, missing: true };
    }))()`;
    const fillOf = part => js(`document.querySelector('.col-picture [data-part="${part}"]').getAttribute('fill')`);
    const pickColour = name => js(`(() => { const b = [...document.querySelectorAll('.col-swatch')].find(b => b.getAttribute('aria-label') === '${name}'); if (!b) throw new Error('no ${name} swatch; page: ' + location.hash + ' lang=' + document.documentElement.lang + ' swatches=' + [...document.querySelectorAll('.col-swatch')].map(x => x.getAttribute('aria-label')).join()); b.click(); })()`);

    await viewport(1280, 800, false);
    await go('#/colouring');
    check('colouring: seven pictures to choose from', (await js(`document.querySelectorAll('.level-btn').length`)) === 7 && (await js(`document.querySelector('.levels-title').textContent`)) === 'Choose a picture');
    await shot('60-col-chooser');

    await go('#/colouring/flower');
    {
      const info = await js(`(() => { const p = document.querySelector('.col-picture').getBoundingClientRect(); const s = [...document.querySelectorAll('.col-swatch')].map(b => b.offsetWidth); const f = document.querySelector('.col-finish').getBoundingClientRect(); return { pic: p.width, bottom: Math.max(p.bottom, f.bottom), minSwatch: Math.min(...s), vh: innerHeight, scrollW: document.documentElement.scrollWidth, vw: innerWidth }; })()`);
      check('colouring: a big picture, big colours, all on screen', info.pic >= 400 && info.minSwatch >= 64 && info.bottom <= info.vh && info.scrollW <= info.vw, JSON.stringify(info));
      check('colouring: says which colour is chosen', (await statusText()) === 'Red. Tap the picture.', await statusText());
      const points = await js(PART_POINTS);
      check('colouring: every part of the flower can be tapped', points.every(p => !p.missing), JSON.stringify(points.filter(p => p.missing)));
      const colours = ['Yellow', 'Saffron', 'Pink', 'Green', 'Sky blue'];
      for (let i = 0; i < points.length; i++) {
        if (i % 3 === 0) await pickColour(colours[(i / 3) % colours.length]);
        await click(points[i].x, points[i].y);
      }
      const unfilled = [];
      for (const p of points) if ((await fillOf(p.part)) === '#FFFFFF') unfilled.push(p.part);
      check('colouring: tapping colours each part', unfilled.length === 0, unfilled.join());
      await shot('61-col-flower-coloured');

      // Undo takes back the last colour only.
      const last = points[points.length - 1].part;
      await js(`document.querySelector('.col-undo').click()`);
      check('colouring: Undo takes back the last colour', (await fillOf(last)) === '#FFFFFF' && (await fillOf(points[0].part)) !== '#FFFFFF');
      // A drifting finger colours the part it came down on, not the one it slid to.
      await pickColour('Purple');
      await touchDrag(points[0].x, points[0].y, points[1].x, points[1].y);
      check('colouring: a sliding finger colours the part it pressed first', (await fillOf(points[0].part)) === '#8E44AD' && (await fillOf(points[1].part)) !== '#8E44AD');

      // Kept between visits, and shown on the chooser.
      await go('#/colouring/flower');
      check('colouring: the picture is kept when you come back', (await fillOf(points[0].part)) === '#8E44AD');
      await go('#/colouring');
      check('colouring: the chooser shows the picture as it was left', await js(`[...document.querySelectorAll('.level-btn')][0].querySelector('[fill="#8E44AD"]') !== null && document.querySelectorAll('.level-detail')[0].textContent.includes('Carries on')`));
      await shot('62-col-chooser-gallery');

      await go('#/colouring/flower');
      await js(`document.querySelector('.col-finish').click()`);
      check('colouring: "I am Finished" shows the picture, saved', await js(`!!document.querySelector('.panel-win .col-finished') && document.querySelector('.panel-title').textContent === 'Beautiful!'`));
      // A photo with the masterpiece (the test browser has a pretend camera)
      await js(`document.querySelector('.win-photo').click()`);
      await sleep(1500);
      check('photo: the camera opens, with the picture framed in the corner', await js(`(() => { const v = document.querySelector('.pb-video'); return !!v && v.videoWidth > 0 && !!document.querySelector('.pb-art svg'); })()`), await statusText());
      await shot('68-photo-camera');
      await js(`document.querySelector('.pb-take').click()`);
      await sleep(1200);
      check('photo: a big 3-2-1 before the photo', /^[321]$/.test(await js(`document.querySelector('.pb-count').textContent`)));
      await sleep(2600);
      check('photo: the photo is shown, ready to keep', await js(`(() => { const p = document.querySelector('.pb-shot'); return !p.hidden && p.naturalWidth > 0 && !document.querySelector('.pb-save').hidden; })()`) && (await statusText()) === 'Here is your photo!', await statusText());
      await shot('69-photo-taken');
      await js(`document.querySelector('.pb-back').click()`);
      await sleep(200);
      check('photo: Back returns to the finished picture, and the camera is off', await js(`!!document.querySelector('.panel-win .col-finished') && !document.querySelector('.pb-video')`));
      await shot('63-col-finished');
      await js(`[...document.querySelectorAll('.panel button')].find(b => b.textContent === 'Keep Colouring').click()`);
      check('colouring: Keep Colouring goes back to the same picture', (await fillOf(points[0].part)) === '#8E44AD');
      await js(`document.querySelector('.col-finish').click()`);
      await js(`[...document.querySelectorAll('.panel a')].find(b => b.textContent === 'Choose Another Picture').click()`);
      await sleep(250);
      check('colouring: after finishing, Choose Another Picture goes straight to the pictures', await js(`location.hash === '#/colouring/levels' && !document.querySelector('.levels-resume') && document.querySelectorAll('.level-btn').length === 7`));
      await go('#/colouring/flower');
      check('colouring: the picture\'s name is top-right', (await levelLabel()) === 'Flower');
      await js(`document.querySelector('.bar-level').click()`);
      await sleep(200);
      check('colouring: the picture page offers Keep Colouring, or Start Again', await js(`!!document.querySelector('.levels-resume') && document.querySelector('.stage').hidden`), await js(`(document.querySelector('.levels-resume-text') || {}).textContent`));
      await shot('63a-col-resume');
      await js(`[...document.querySelectorAll('.levels-resume button')].find(b => b.textContent === 'Start Again').click()`);
      await sleep(250);
      check('colouring: Start Again gives a clean white picture', await js(`[...document.querySelectorAll('.col-picture [data-part]')].every(p => p.getAttribute('fill') === '#FFFFFF')`));
    }

    // Every picture: every part reachable by a tap at desktop and phone size.
    const pictures = await js(`Object.keys(SG.games.find(g => g.key === 'colouring').levels)`);
    for (const [w, h, mobile] of [[1280, 800, false], [390, 844, true]]) {
      await viewport(w, h, mobile);
      const bad = [];
      for (const key of pictures) {
        await go('#/colouring/' + key);
        const points = await js(PART_POINTS);
        points.filter(p => p.missing).forEach(p => bad.push(key + '.' + p.part));
      }
      check(`colouring ${w}px: every part of every picture can be tapped`, bad.length === 0, bad.join());
    }

    // The rangoli colours matching petals together.
    await viewport(1280, 800, false);
    await go('#/colouring/rangoli');
    {
      const points = await js(PART_POINTS);
      await pickColour('Saffron');
      const outer = points.find(p => p.part === 'outer0');
      await click(outer.x, outer.y);
      check('rangoli: one tap colours all the matching petals', (await js(`[...document.querySelectorAll('[data-group="outer0"]')].filter(p => p.getAttribute('fill') === '#FB8C00').length`)) === 4 && (await js(`document.querySelector('[data-part="outer1"]').getAttribute('fill')`)) === '#FFFFFF');
      await pickColour('Blue');
      for (const p of points.filter(p => p.part !== 'outer0' && p.part !== 'bg')) { await click(p.x, p.y); if (p.part === 'dot0') await pickColour('Pink'); if (p.part === 'ring') await pickColour('Yellow'); if (p.part === 'inner0') await pickColour('Red'); }
      await shot('64-col-rangoli');
    }

    await viewport(390, 844, true);
    await go('#/colouring/diya');
    {
      const info = await js(`(() => { const p = document.querySelector('.col-picture').getBoundingClientRect(); const s = [...document.querySelectorAll('.col-swatch')].map(b => b.offsetWidth); const f = document.querySelector('.col-finish').getBoundingClientRect(); return { pic: p.width, finishBottom: f.bottom, minSwatch: Math.min(...s), vh: innerHeight, scrollW: document.documentElement.scrollWidth, vw: innerWidth }; })()`);
      check('phone: colouring picture fills the width, colours stay 64px, all on screen', info.pic >= 300 && info.minSwatch >= 64 && info.finishBottom <= info.vh && info.scrollW <= info.vw, JSON.stringify(info));
      const points = await js(PART_POINTS);
      await pickColour('Saffron');
      const events = [];
      for (const p of points.slice(0, 6)) { await tapTouch(p.x, p.y); await sleep(120); events.push(p.part + '=' + await fillOf(p.part)); }
      check('phone: tapping with a finger colours each part', events.every(e => e.endsWith('#FB8C00')), events.join(' '));
      await shot('65-col-diya-phone');
    }
    await viewport(1024, 768, true);
    await go('#/colouring/lotus');
    await shot('66-col-lotus-tablet');
    await viewport(768, 1024, true);
    await go('#/colouring/house');
    await shot('67-col-house-tablet-portrait');
    await viewport(1280, 800, false);
  }

  // ---------- The new games in Hindi ----------
  if (want('hindi')) {
    await viewport(1280, 800, false);
    await go('#/');
    await js(`[...document.querySelectorAll('.chooser button')].find(b => b.textContent === 'हिंदी').click()`);
    await sleep(150);
    check('Hindi: every tile is named in Hindi', await js(`[...document.querySelectorAll('.tile-title')].every(n => /[\\u0900-\\u097F]/.test(n.textContent))`));
    await js(`localStorage.removeItem('sg.seen.sorting')`);
    await go('#/sorting');
    check('Hindi: the first-time page and its Start button are in Hindi', (await js(`document.querySelector('.intro-start').textContent`)) === 'शुरू कीजिए');
    await shot('69-hi-intro');
    await seenAll();
    await go('#/pattern/easy');
    check('Hindi pattern: speaks Hindi', (await statusText()).includes('देखिए') && (await js(`document.querySelector('.pt-watch').textContent`)) === 'देखिए');
    await go('#/sorting/hard');
    check('Hindi sorting: baskets and picture named in Hindi', await js(`[...document.querySelectorAll('.so-basket-name, .so-card-name')].every(n => /[\\u0900-\\u097F]/.test(n.textContent))`));
    await shot('70-hi-sorting');
    await go('#/colouring');
    check('Hindi colouring: picture names in Hindi', (await js(`document.querySelector('.levels-title').textContent`)) === 'तस्वीर चुनिए' && await js(`[...document.querySelectorAll('.level-name')].every(n => /[\\u0900-\\u097F]/.test(n.textContent))`));
    await go('#/colouring/lotus');
    check('Hindi colouring: names the colour in Hindi', (await statusText()).includes(' रंग। '), await statusText());
    await viewport(390, 844, true);
    await go('#/');
    await shot('71-hi-home-phone');
    check('Hindi on a phone: home has no sideways scroll', await noSideScroll());
    await js(`[...document.querySelectorAll('.chooser button')].find(b => b.textContent === 'English').click()`);
    await viewport(1280, 800, false);
  }

  // ---------- Every screen, every language: no missing words ----------
  if (want('strings')) {
    const missing = await js(`(() => {
      const out = [];
      for (const lang of ['en', 'hi']) {
        SG.setLang(lang);
        for (const k of ['start', 'settings', 'levels.playing', 'levels.resumeTitle', 'bar.level', 'so.pick', 'so.tapFirst', 'so.table']) {
          let v = SG.t(k, 'x');
          if (v === undefined || (lang === 'hi' && !/[\\u0900-\\u097F]/.test(v))) out.push(lang + ':' + k);
        }
        for (const g of SG.games) {
          for (const k of ['title', 'howto']) if (SG.t(g.text + '.' + k) === undefined) out.push(lang + ':' + g.text + '.' + k);
          for (const l of Object.keys(g.levels)) if (!g.detail(l)) out.push(lang + ':' + g.key + ' detail ' + l);
        }
      }
      SG.setLang('en');
      return out;
    })()`);
    check('every game has its words in both languages', missing.length === 0, missing.join());
  }

  // ---------- Installable, and works offline ----------
  if (want('offline')) {
    await viewport(1280, 800, false);
    const listed = await js(`fetch('sw.js').then(r => r.text())`);
    const needed = await js(`[...document.querySelectorAll('script[src], link[rel=stylesheet], link[rel=manifest], link[rel=apple-touch-icon]')].map(n => n.getAttribute('src') || n.getAttribute('href'))`);
    const manifest = await js(`fetch('manifest.webmanifest').then(r => r.json())`);
    const fonts = (await js(`fetch('css/style.css').then(r => r.text())`)).match(/fonts\/[\w-]+\.woff2/g) || [];
    const unlisted = needed.concat(manifest.icons.map(i => i.src), fonts).filter(f => !listed.includes(`'${f}'`));
    check('the bundled font draws both English and Hindi', fonts.length === 2 && await js(`document.fonts.load('700 22px "Baloo 2"', 'Aक').then(() => document.fonts.check('700 22px "Baloo 2"', 'A') && document.fonts.check('700 22px "Baloo 2"', 'क'))`));
    check('offline: every file the app loads is in the offline list', unlisted.length === 0, unlisted.join());
    await go('#/');
    const ready = await js(`Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 8000))])`);
    check('offline: the offline helper starts', ready);
    await sleep(1500); // let it finish fetching everything
    await send('Network.enable');
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await go('#/');
    check('offline: the home page opens with no internet', (await js(`document.querySelectorAll('.tile').length`)) === (await js(`SG.games.length`)) && (await js(`SG.games.length`)) >= 6);
    await go('#/colouring/kite');
    check('offline: a game opens with no internet', await js(`!!document.querySelector('.col-picture')`));
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  }

  // ---------- Harmonium ----------
  if (want('harmonium')) {
    await viewport(1280, 800, false);
    const keyCentres = () => centresOf('.hm-key');
    await go('#/harmonium/free');
    {
      const info = await js(`(() => { const k = [...document.querySelectorAll('.hm-key')]; return { count: k.length, w: Math.min(...k.map(x => x.offsetWidth)), h: k[0].offsetHeight }; })()`);
      check('harmonium: eight big keys, Sa to high Sa', info.count === 8 && info.w >= 64 && info.h >= 120, JSON.stringify(info));
      const keys = await keyCentres();
      await mouse('mousePressed', keys[4].x, keys[4].y);
      check('harmonium: a key sounds while it is held, and is named', await js(`document.querySelectorAll('.hm-key')[4].classList.contains('sounding')`) && (await statusText()) === 'Pa', await statusText());
      await shot('100-hm-free');
      await mouse('mouseReleased', keys[4].x, keys[4].y);
      check('harmonium: letting go stops it', !(await js(`document.querySelectorAll('.hm-key')[4].classList.contains('sounding')`)));
    }
    check('harmonium: the songs\' notes are all playable, and Happy Birthday is the tune everyone knows', await js(`(() => {
      const b = SG.harmonium.prepare('birthday');
      const tune = b.lines.map(l => l.map(n => n.note.code).join(' ')).join(' | ');
      return tune === '.P .P .D .P S .N | .P .P .D .P R S | .P .P P G S .N .D | M M G S R S'
        && ['aarti', 'raghupati', 'anthem'].every(k => SG.harmonium.prepare(k).keys.length <= 10);
    })()`));
    for (const song of ['birthday', 'aarti', 'anthem', 'raghupati']) {
      await go('#/harmonium/' + song);
      const plan = await js(`(() => { const p = SG.harmonium.prepare('${song}'); return p.lines.map(l => l.map(n => p.keys.findIndex(k => k.code === n.note.code))); })()`);
      const keys = await keyCentres();
      const nextKey = () => js(`[...document.querySelectorAll('.hm-key')].findIndex(k => k.classList.contains('hm-next'))`);
      check(`harmonium ${song}: the first key has the pointing hand, and the words are shown`, (await nextKey()) === plan[0][0] && (await js(`document.querySelectorAll('.hm-chip').length`)) === plan[0].length && (await js(`document.querySelector('.hm-chip.next').textContent.length`)) > 0);
      if (song === 'birthday') {
        await shot('101-hm-birthday');
        const other = plan[0][0] === 0 ? 1 : 0;
        await click(keys[other].x, keys[other].y);
        check('harmonium: another key just plays its note, and the hand waits', (await statusText()) === 'Try the key with the hand.' && (await nextKey()) === plan[0][0] && (await js(`document.querySelectorAll('.hm-chip.done').length`)) === 0, await statusText());
        await js(`document.querySelector('.hm-listen').click()`);
        await sleep(700);
        check('harmonium: Listen plays the line, lighting each key', (await statusText()) === 'Listen…' && (await js(`document.querySelectorAll('.hm-key.sounding').length`)) === 1);
        await sleep(await js(`SG.harmonium.prepare('birthday').lines[0].reduce((a, n) => a + n.beats, 0) * 430 + 300`));
        check('harmonium: then it is the player\'s turn', (await statusText()) === 'Your turn.', await statusText());
      }
      for (let l = 0; l < plan.length; l++) {
        for (const k of plan[l]) { await click(keys[k].x, keys[k].y); await sleep(30); }
        if (song === 'aarti' && l === 0) { await shot('102-hm-aarti-line-done'); }
        await sleep(800);
      }
      await sleep(2300);
      check(`harmonium ${song}: playing every note finishes the song`, await js(`!!document.querySelector('.panel-win')`), await statusText().catch(() => ''));
    }
    await shot('103-hm-win');
    await go('#/harmonium/raghupati');
    await shot('104-hm-raghupati');
    await viewport(390, 844, true);
    await go('#/harmonium/aarti');
    {
      const info = await js(`(() => { const k = [...document.querySelectorAll('.hm-key')]; return { w: Math.min(...k.map(x => x.offsetWidth)), rows: new Set(k.map(x => Math.round(x.getBoundingClientRect().top))).size }; })()`);
      check('phone: the keys go in two rows, still big', info.w >= 64 && info.rows === 2, JSON.stringify(info));
      const keys = await keyCentres();
      const first = await js(`(() => { const p = SG.harmonium.prepare('aarti'); return p.keys.findIndex(k => k.code === p.lines[0][0].note.code); })()`);
      await tapTouch(keys[first].x, keys[first].y);
      check('phone: a finger plays the key', (await js(`document.querySelectorAll('.hm-chip.done').length`)) === 1);
      await shot('105-hm-phone');
    }
    await viewport(1024, 768, true);
    await go('#/harmonium/anthem');
    await shot('106-hm-tablet');
    await js(`SG.setLang('hi')`);
    await go('#/harmonium/aarti');
    check('Hindi harmonium: the words and the keys are in Hindi', (await js(`document.querySelector('.hm-chip').textContent`)) === 'ॐ' && (await js(`document.querySelector('.hm-name').textContent`)).length > 0 && /[ऀ-ॿ]/.test(await js(`document.querySelector('.hm-name').textContent`)));
    await shot('107-hm-hindi');
    await js(`SG.setLang('en')`);
    await viewport(1280, 800, false);
  }

  // ---------- Rangoli Mirror ----------
  if (want('rangoli')) {
    await viewport(1280, 800, false);
    check('rangoli: one tap is copied all the way round, mirrored', await js(`SG.rangoli.copies({ r: 32, a: 10 }, 8).length === 16 && SG.rangoli.copies({ r: 32, a: 0 }, 8).length === 8 && SG.rangoli.copies({ r: 0, a: 0 }, 8).length === 1`));
    await js(`['square', 'flower', 'star'].forEach(k => localStorage.removeItem('sg.rg.' + k))`);
    await go('#/rangoli/star');
    const marks = () => js(`document.querySelectorAll('.rg-design > *').length`);
    const board = await js(`(() => { const r = document.querySelector('.rg-board').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width }; })()`);
    check('rangoli: a big floor, all on screen', board.s >= 400 && (await js(`document.querySelector('.rg-finish').getBoundingClientRect().bottom`)) <= 800, JSON.stringify(board));
    await js(`[...document.querySelectorAll('.rg-swatch')].find(b => b.getAttribute('aria-label') === 'Pink').click()`);
    await js(`[...document.querySelectorAll('.rg-shape')].find(b => b.getAttribute('aria-label') === 'Diamonds').click()`);
    check('rangoli: says the colour and shape chosen', (await statusText()) === 'Pink diamonds. Tap the floor.', await statusText());
    await click(board.x, board.y);
    check('rangoli: a tap in the middle makes one mark', (await marks()) === 1);
    const u = board.s / 200; // board units to pixels
    await click(board.x + 47 * u * Math.sin(15 * Math.PI / 180), board.y - 47 * u * Math.cos(15 * Math.PI / 180));
    check('rangoli: a tap between the mirror lines is copied 16 times round the star', (await marks()) === 17, 'marks=' + await marks());
    await js(`[...document.querySelectorAll('.rg-shape')].find(b => b.getAttribute('aria-label') === 'Petals').click()`);
    await js(`[...document.querySelectorAll('.rg-swatch')].find(b => b.getAttribute('aria-label') === 'Yellow').click()`);
    await touchDrag(board.x, board.y - 62 * u, board.x + 20, board.y - 40 * u);
    check('rangoli: a drifting finger marks the dot it came down on', (await marks()) === 25, 'marks=' + await marks());
    await js(`document.querySelector('.rg-undo').click()`);
    check('rangoli: Undo takes back the last tap (all its copies)', (await marks()) === 17);
    await js(`document.querySelector('.rg-board').focus()`);
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowUp', 'Enter']) await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k === 'Enter' ? 'Enter' : k, windowsVirtualKeyCode: { ArrowUp: 38, Enter: 13 }[k] });
    check('rangoli: the keyboard can make marks too', (await marks()) > 17, 'marks=' + await marks());
    for (const [r, a] of [[47, 0], [77, 22], [62, 45], [17, 0], [77, 0]]) {
      await click(board.x + r * u * Math.sin(a * Math.PI / 180), board.y - r * u * Math.cos(a * Math.PI / 180));
    }
    await sleep(500);
    await shot('110-rg-star');
    const before = await marks();
    await go('#/rangoli/star');
    check('rangoli: the design is kept when you come back', (await marks()) === before);
    await go('#/rangoli/levels');
    check('rangoli: the level page shows it, as a gallery', (await js(`document.querySelectorAll('.level-btn').length`)) === 3 && await js(`document.querySelectorAll('.level-btn')[2].querySelectorAll('.rg-design > *').length > 10`));
    await shot('111-rg-levels');
    await go('#/rangoli/star');
    await js(`document.querySelector('.rg-finish').click()`);
    check('rangoli: "I\'m Finished" shows the design', await js(`!!document.querySelector('.panel-win .rg-finished')`));
    await shot('112-rg-finished');
    await go('#/rangoli/flower');
    const fb = await js(`(() => { const r = document.querySelector('.rg-board').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width }; })()`);
    for (const [r, a, colour] of [[0, 0, 'Red'], [17, 0, 'Yellow'], [32, 15, 'Blue'], [47, 30, 'White'], [62, 0, 'Saffron'], [77, 15, 'Green']]) {
      await js(`[...document.querySelectorAll('.rg-swatch')].find(b => b.getAttribute('aria-label') === '${colour}').click()`);
      await click(fb.x + r * fb.s / 200 * Math.sin(a * Math.PI / 180), fb.y - r * fb.s / 200 * Math.cos(a * Math.PI / 180));
    }
    await sleep(500);
    await shot('113-rg-flower');
    await viewport(390, 844, true);
    await go('#/rangoli/square');
    {
      const info = await js(`(() => { const b = document.querySelector('.rg-board').getBoundingClientRect(); const s = [...document.querySelectorAll('.rg-swatch, .rg-shape')].map(x => x.offsetWidth); return { board: b.width, min: Math.min(...s), finish: document.querySelector('.rg-finish').getBoundingClientRect().bottom, vh: innerHeight }; })()`);
      check('phone: a big floor, 64px buttons, all on screen', info.board >= 280 && info.min >= 64 && info.finish <= info.vh, JSON.stringify(info));
      const b = await js(`(() => { const r = document.querySelector('.rg-board').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await tapTouch(b.x, b.y);
      check('phone: a finger tap makes a mark', (await marks()) === 1);
      await sleep(500);
    await shot('114-rg-phone');
    }
    await viewport(1280, 800, false);
  }

  // ---------- Diya Trail ----------
  if (want('diya')) {
    await viewport(1280, 800, false);
    const litDiyas = () => js(`document.querySelectorAll('.dy-diya.lit').length`);
    const litDots = () => js(`document.querySelectorAll('.dy-dot.lit').length`);
    for (const [levelKey, count] of [['easy', 4], ['medium', 6], ['hard', 8]]) {
      await go('#/diya/' + levelKey);
      const path = await js(`SG.current().peek()`);
      const info = await js(`(() => { const b = document.querySelector('.dy-board').getBoundingClientRect(); return { bottom: b.bottom, vh: innerHeight, w: b.width }; })()`);
      check(`diya ${levelKey}: ${count} diyas on a night sky that fills the screen, the first one burning`, path.filter(p => p.diya >= 0).length === count && (await litDiyas()) === 1 && info.bottom <= info.vh && info.w > 900, JSON.stringify(info));
      check(`diya ${levelKey}: every dot is on the screen`, path.every(p => p.x > 0 && p.y > 0 && p.x < 1280 && p.y < info.vh));
      if (levelKey === 'easy') {
        await shot('120-dy-easy-start');
        // Skipping ahead (tapping the far diya) does nothing; wandering off does nothing.
        const last = path[path.length - 1];
        await click(last.x, last.y);
        check('diya: tapping far ahead does not jump there', (await litDots()) === 0 && (await litDiyas()) === 1);
        // Slide half way, lift off, then carry on: nothing is lost.
        await mouse('mousePressed', path[0].x, path[0].y);
        for (let i = 1; i <= 5; i++) await mouse('mouseMoved', path[i].x + 9, path[i].y - 7);
        await mouse('mouseMoved', path[5].x + 200, path[5].y + 150); // the finger wanders far off
        await mouse('mouseReleased', path[5].x + 200, path[5].y + 150);
        check('diya: sliding along lights the dots; wandering off loses nothing', (await litDots()) === 5, 'lit=' + await litDots());
        await shot('121-dy-sliding');
        // tap the next dots, one by one, up to the next diya
        const nextDiya = path.findIndex(p => p.diya === 1);
        for (let i = 6; i <= nextDiya; i++) await click(path[i].x - 6, path[i].y + 5);
        check('diya: tapping the dots one by one works too, and lights the next diya', (await litDiyas()) === 2 && (await statusText()).startsWith('Lovely! 2 of 4'), await statusText());
        await mouse('mousePressed', path[nextDiya].x, path[nextDiya].y);
        for (let i = nextDiya + 1; i < path.length; i++) { await mouse('mouseMoved', (path[i - 1].x + path[i].x) / 2, (path[i - 1].y + path[i].y) / 2); await mouse('mouseMoved', path[i].x, path[i].y); }
        await mouse('mouseReleased', path[path.length - 1].x, path[path.length - 1].y);
      } else {
        // one long slide, through every point on the way
        await mouse('mousePressed', path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) { await mouse('mouseMoved', (path[i - 1].x + path[i].x) / 2 + 5, (path[i - 1].y + path[i].y) / 2 - 5); await mouse('mouseMoved', path[i].x, path[i].y); }
        await mouse('mouseReleased', path[path.length - 1].x, path[path.length - 1].y);
        if (levelKey === 'hard') await shot('122-dy-hard-done');
      }
      check(`diya ${levelKey}: every diya lit`, (await litDiyas()) === count, 'lit=' + await litDiyas());
      if (levelKey !== 'easy') {
        // the path is narrow: a finger well off to the side does not light the next dot
        await go('#/diya/' + levelKey);
        const p2 = await js(`SG.current().peek()`);
        const dx = p2[1].y - p2[0].y, dy = p2[0].x - p2[1].x, len = Math.hypot(dx, dy);
        await click(p2[1].x + dx / len * 45, p2[1].y + dy / len * 45);
        check(`diya ${levelKey}: the finger has to stay on the path`, (await litDots()) === 0);
        await mouse('mousePressed', p2[0].x, p2[0].y);
        for (let i = 1; i < p2.length; i++) { await mouse('mouseMoved', (p2[i - 1].x + p2[i].x) / 2, (p2[i - 1].y + p2[i].y) / 2); await mouse('mouseMoved', p2[i].x, p2[i].y); }
        await mouse('mouseReleased', p2[p2.length - 1].x, p2[p2.length - 1].y);
      }
      await sleep(2200);
      check(`diya ${levelKey}: finish screen appears`, await js(`!!document.querySelector('.panel-win')`));
      if (levelKey === 'medium') await shot('123-dy-win');
    }
    await go('#/diya/medium');
    await js(`document.querySelector('.dy-board').focus()`);
    for (let i = 0; i < 12; i++) await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    check('diya: the keyboard moves the light on too', (await litDiyas()) === 2);
    await viewport(390, 844, true);
    await go('#/diya/medium');
    {
      const path = await js(`SG.current().peek()`);
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: path[0].x, y: path[0].y }] });
      for (let i = 1; i <= 14; i++) {
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: (path[i - 1].x + path[i].x) / 2 + 4, y: (path[i - 1].y + path[i].y) / 2 + 3 }] });
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: path[i].x + 4, y: path[i].y + 3 }] });
      }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      check('phone: a finger sliding along the dots lights them, and the next diya', (await litDiyas()) >= 2 && (await js(`pageYOffset`)) === 0, 'lit=' + await litDiyas());
      await shot('124-dy-phone');
    }
    await viewport(1024, 768, true);
    await go('#/diya/hard');
    await shot('125-dy-tablet');
    await viewport(1280, 800, false);
  }

  // ---------- Making Chai ----------
  if (want('chai')) {
    await viewport(1280, 800, false);
    for (const recipe of ['chai', 'nimbu', 'khichdi']) {
      await go('#/chai/' + recipe);
      const order = await js(`SG.current().order()`); // the step each card is, in the order they lie
      const cards = await centresOf('.ch-card');
      const info = await js(`(() => { const c = [...document.querySelectorAll('.ch-card')]; return { count: c.length, size: Math.min(...c.map(x => x.offsetWidth)), slots: document.querySelectorAll('.ch-slot').length, bottom: Math.max(...c.map(x => x.getBoundingClientRect().bottom)), vh: innerHeight }; })()`);
      check(`chai ${recipe}: the steps are mixed up, big, with a numbered place for each`, info.count === order.length && info.slots === order.length && info.size >= 96 && info.bottom <= info.vh, JSON.stringify(info));
      check(`chai ${recipe}: asks what comes first`, (await statusText()) === 'What comes first?');
      if (recipe === 'chai') {
        await shot('130-ch-start');
        const wrong = order.findIndex(o => o !== 0);
        await click(cards[wrong].x, cards[wrong].y);
        check('chai: a step tapped too early shakes and stays put', (await statusText()) === 'Not yet. Try another.' && (await js(`document.querySelectorAll('.ch-slot.filled').length`)) === 0);
        await sleep(500);
        await click(cards[wrong].x, cards[wrong].y);
        check('chai: after a second try, a hand points at the step that comes next', (await statusText()).startsWith('This one') && (await js(`document.querySelectorAll('.ch-card.ch-hint').length === 1 && document.querySelector('.ch-card.ch-hint').getAttribute('aria-label') === SG.chai.recipes.chai.steps[0][1]`)));
        await shot('131-ch-hint');
      }
      for (let step = 0; step < order.length; step++) {
        const k = order.indexOf(step);
        await click(cards[k].x, cards[k].y);
        await sleep(450);
        if ((await js(`document.querySelectorAll('.ch-slot.filled').length`)) !== step + 1) { check(`chai ${recipe}: step ${step + 1} goes into its place`, false, await statusText()); break; }
        if (recipe === 'khichdi' && step === 2) await shot('132-ch-khichdi-mid');
      }
      await sleep(2200);
      check(`chai ${recipe}: all the steps in order finish the recipe`, await js(`!!document.querySelector('.panel-win')`));
      if (recipe === 'chai') await shot('133-ch-win');
    }
    await viewport(390, 844, true);
    await go('#/chai/khichdi');
    {
      const order = await js(`SG.current().order()`);
      const cards = await centresOf('.ch-card');
      const info = await js(`(() => { const c = [...document.querySelectorAll('.ch-card')]; return { size: Math.min(...c.map(x => x.offsetWidth)), bottom: Math.max(...c.map(x => x.getBoundingClientRect().bottom)), vh: innerHeight }; })()`);
      check('phone: six big steps and their places all fit', info.size >= 96 && info.bottom <= info.vh, JSON.stringify(info));
      await tapTouch(cards[order.indexOf(0)].x, cards[order.indexOf(0)].y);
      await sleep(450);
      check('phone: a finger tap puts the first step in place', (await js(`document.querySelectorAll('.ch-slot.filled').length`)) === 1);
      await shot('134-ch-phone');
    }
    await viewport(1280, 800, false);
  }

  // ---------- Every screen fits on the screen: no scrolling, ever ----------
  if (want('fit')) {
    const SIZES = [
      ['desktop', 1280, 800, false], ['laptop-short', 1280, 650, false],
      ['tablet-landscape', 1024, 768, true], ['tablet-landscape-toolbars', 1024, 690, true], ['tablet-portrait', 768, 1024, true],
      ['phone', 390, 844, true], ['phone-short', 390, 680, true], ['phone-small', 360, 640, true], ['phone-landscape', 844, 390, true]
    ];
    const games = await js(`SG.games.map(g => ({ key: g.key, levels: Object.keys(g.levels) }))`);
    // How far the page reaches past the screen, and the smallest button/tile on it
    const OVER = `(() => {
      const d = document.documentElement;
      const visible = [...document.querySelectorAll('.btn, .tile, .level-btn, .pressable')].filter(b => b.offsetParent && !b.closest('[hidden]'));
      return { down: Math.max(d.scrollHeight, document.body.scrollHeight) - innerHeight, side: d.scrollWidth - innerWidth,
        smallest: visible.length ? Math.min(...visible.map(b => Math.min(b.offsetWidth, b.offsetHeight))) : 999 };
    })()`;
    for (const [size, w, h, mobile] of SIZES) {
      await viewport(w, h, mobile);
      const bad = [];
      const measure = async (name, shotName) => {
        await sleep(120);
        const o = await js(OVER);
        if (o.down > 1 || o.side > 1 || o.smallest < 56) {
          bad.push(`${name} (down ${o.down}, side ${o.side}, smallest ${o.smallest})`);
          if (shotName) await shot('90-fit-' + size + '-' + shotName);
        } else if (['home', 'wordsearch-levels', 'colouring-levels', 'sorting-intro', 'wordsearch-finish', 'resume', 'sorting-hard', 'colouring-flower', 'wordsearch-hard'].includes(shotName)) {
          await shot('91-' + size + '-' + shotName);
        }
      };
      for (const hash of ['#/', '#/settings']) { await go(hash); await measure(hash, hash.replace(/\W/g, '') || 'home'); }
      for (const g of games) {
        await js(`localStorage.removeItem('sg.seen.${g.key}')`);
        await go('#/' + g.key);
        await measure(g.key + ' first-time page', g.key + '-intro');
        await seenAll();
        await go('#/' + g.key + '/levels');
        await measure(g.key + ' levels', g.key + '-levels');
        for (const level of g.key === 'colouring' ? ['flower', 'rangoli'] : [g.levels[0], g.levels[g.levels.length - 1]]) {
          await go('#/' + g.key + '/' + level);
          await measure(g.key + ' ' + level, g.key + '-' + level);
        }
        await js(`SG.current().finish()`);
        await measure(g.key + ' finish screen', g.key + '-finish');
      }
      // The level page while a game is under way (with Keep Playing at the top)
      await go('#/tilematch/hard');
      await js(`(() => { const t = [...document.querySelectorAll('.tm-tile')]; const f = t.map(x => x.querySelector('.tm-face').textContent); t.filter((x, i) => f[i] === f[0]).forEach(x => x.click()); })()`);
      await js(`location.hash = '#/tilematch/levels'`);
      await measure('level page with a game under way', 'resume');
      check(`fits the screen at ${size} (${w}x${h}): every page, no scrolling, buttons at least 56px`, bad.length === 0, bad.join('; '));
    }
    await viewport(1280, 800, false);
  }

  // ---------- The first-time page of every game: a hand acts out the move ----------
  if (want('intro')) {
    await viewport(1024, 768, true);
    for (const key of await js(`SG.games.map(g => g.key)`)) {
      await js(`localStorage.removeItem('sg.seen.${key}')`);
      await go('#/' + key);
      await sleep(1100); // the moment the finger presses
      await shot('03-intro-' + key);
      check(`${key}: the first-time page shows a hand acting out the move, and one Start button`, await js(`!!document.querySelector('.intro .demo-run .demo-hand') && document.querySelectorAll('.intro button').length === 1`));
    }
    await seenAll();
    await viewport(1280, 800, false);
  }

  // ---------- Home, with the whole collection ----------
  if (want('home')) {
    for (const [name, w, h, mobile] of [['desktop', 1280, 800, false], ['tablet-landscape', 1024, 768, true], ['tablet-portrait', 768, 1024, true], ['phone', 390, 844, true]]) {
      await viewport(w, h, mobile);
      await go('#/');
      await shot('80-home-' + name);
      check(`home ${name}: every game tile, no sideways scroll`, (await js(`document.querySelectorAll('.tile').length === SG.games.length`)) && await noSideScroll());
    }
    await viewport(1280, 800, false);
  }
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
