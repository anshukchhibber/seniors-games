# Sunny Games

Calm, clear games for seniors, in **English and Hindi**. No ads, no popups, no timers, no
accounts, and no internet needed once it has been opened.

| Game | Tag on its card | What it is good for |
| --- | --- | --- |
| **Word Search** | Words | Find hidden words. Vocabulary and scanning; sliding along a word practises a controlled drag. |
| **Tile Match** | Memory | Turn over tiles to find pairs. Short-term memory. |
| **Number Hunt** | Look & Find | Tap 1, 2, 3... scattered over a grid. Attention and visual search; the hand reaches all over the screen. |
| **Repeat the Pattern** | Memory | Pads light up in turn (each with its own colour, shape and note); tap them back. Each pattern is one longer. A slip just means "watch again". |
| **Sort into Baskets** | Hands | Slide each picture into its basket (fruit / vegetables, hot / cold, land / water...), or tap the basket. Reaching, dragging and simple grouping. |
| **Colouring Book** | Colour & Create | Choose a colour, tap part of a picture to fill it: flower, house, butterfly, kite, diya, lotus, rangoli. Creative and calming; nothing can go wrong. Every picture is kept, so the picture page is also the gallery. |

The games are for enjoyment and extra practice. They are not therapy, and the app makes no
"brain training" claims (the evidence for those is weak).

The language is chosen on the home page and switches the whole app. In Hindi the word search
uses Devanagari (one akshara per square: रिश्तेदार → रि · श्ते · दा · र) and Tile Match uses pictures
familiar to an Indian player (mango, peacock, auto rickshaw, kite, cricket bat...).

## Play

Double-click `index.html`. That's it — there is nothing to install or build.

To play on a tablet, put this folder on any static web host (GitHub Pages, Netlify, …)
and open the address on the tablet. A tablet is the best fit: the letters and tiles get big.

**Put it on the tablet's home screen** so it opens like an app, full screen, even without internet:
- iPad (Safari): the Share button → **Add to Home Screen**.
- Android (Chrome): the ⋮ menu → **Add to Home screen** (or **Install app**).

Once it has been opened online, it keeps working offline (`sw.js`). While online it always loads
the newest version, so there is nothing to bump when you change a file - but a **new** file must be
added to the `FILES` list in `sw.js` (the playtest checks this).

## Design rules (please keep these when adding games)

- **Nothing pops up.** Every screen is a plain page. "Home" is always top-left. "How to play"
  lives permanently on the level page. Even "Start a new puzzle?" is an ordinary page - and it
  only appears once there is progress to lose, with **Keep Playing** as the big button.
  Long-press is tamed app-wide so the tablet's own popups (link previews, "Copy / Look Up")
  cannot appear either.
- **No time pressure, no failure.** No timers of any kind: a hint stays until its word is found,
  and mismatched tiles stay showing until the next tap. No lives, no "wrong!" sounds, no red.
- **One visual rule to learn:** a navy outline that looks *raised* can be pressed; flat cream or
  plain text is information. Presses answer on touch-down by visibly going *down* (shape, not
  just colour) - important when feeling in the fingers is reduced. No hover effects.
- **Big and high-contrast.** Text ≥ 19px (on a phone the Hard grid shrinks to 10 × 10 rather than
  shrink the letters), buttons ≥ 64px, body text ≥ 7:1, every control edge and game state ≥ 3:1.
- **The status line says it in words** - what just happened and what to do next ("First letter: B.
  Now tap the last letter of the word.", "Clock and cat are not a pair. Tap any tile to carry on.").
  It always reserves two lines, so a longer message never pushes anything.
- **Forgiving hands.**
  - Word Search: slide along a word *or* tap its first then last letter. Selections snap to a
    straight line, work in either direction, and may be one letter out - along the word or to the
    side. A resting palm or second finger is ignored. The page cannot scroll or zoom mid-word.
  - Every in-game tap uses `SG.onTap`, which still counts when a trembling finger slides a few
    millimetres (browsers silently drop such taps). Accidental double-taps are ignored.
  - "Playing hand: Left / Right" puts the word list and Hint on that side, so nobody reaches
    across the grid. Games sit in the middle of the screen, not at the hard-to-reach top.
- **Nothing moves unless the player moved it.** The layout never shifts during a game, and every
  animation is started by the player's own action.
- **Colour is never the only signal.** Found words get an outlined band, a tick and a strike-through;
  matched tiles get a thick green edge and a solid ✓ badge; chosen settings are filled *and* ticked.
- **Never shrink, reduce instead.** When a screen is too small, a game uses fewer things at full
  size rather than more things made tiny: a phone gets a 10 × 10 word grid (8 × 8 in Hindi, whose
  aksharas are wider) and about 50 numbers instead of 100. This is decided once, before a game starts.
- **Hindi is typeset as Hindi.** No letter-spacing (it breaks the headline joining the letters),
  taller lines for vowel signs, and no strike-through on found words (it makes Devanagari unreadable).
  Newer emoji (auto rickshaw, kite, lamp, lotus) are left out on tablets that cannot draw them.
- **Pictures that can't be confused.** Look-alike tile pictures (star/sunflower, tree/turtle) are
  never dealt into the same game, and every picture is also named in the status line.
- Icons are drawn (inline SVG), never font glyphs, so they look the same on every tablet.
- Works with keyboard and screen readers, and honours the "reduce motion" system setting.

## Make it yours

| To change…                        | Edit                                              |
| --------------------------------- | ------------------------------------------------- |
| Any wording, in either language   | `js/i18n.js` (a Hindi speaker should review the Hindi) |
| Add another language              | a block in `js/i18n.js`, word lists in `js/words.js`, and a `SCRIPTS` entry in `js/wordsearch.js` |
| Word Search topics and words      | `js/words.js` (add family names, places, …)       |
| How many numbers in Number Hunt   | `LEVELS` at the top of `js/numbers.js`            |
| Grid sizes / number of words      | `LEVELS` at the top of `js/wordsearch.js`         |
| Tile pictures (and look-alike groups) | `SYMBOLS` in `js/tilematch.js`                 |
| Sort into Baskets groups and pictures | `GROUPS` and `SETS` in `js/sorting.js`       |
| Colouring pictures and palette    | `PICTURES` and `COLOURS` in `js/colouring.js`     |
| Pattern pads (shape, colour, note), lengths | `PADS` and `LEVELS` in `js/pattern.js`  |
| Colours, text sizes, spacing (design tokens) | `:root` at the top of `css/style.css`   |
| The app's name                    | `APP_NAME` in `js/app.js` and `<title>` in `index.html` |

## Add a game

1. Make `js/<game>.js` ending in `SG.registerGame({ key, text, category, levels, mount, art, preview, detail })`.
   Copy the shape of `js/pattern.js`: `mount(stage, levelKey, hooks)` returns
   `{ newGame, resize, progress, destroy }`. Use `SG.onTap` for every tap, `SG.timers()`, `SG.bestGrid`,
   `SG.winPanel`, and add the class `pressable` to the game's own big buttons.
2. `levels` can be anything to choose between, not only Easy / Medium / Hard: Colouring Book uses
   pictures, with `levelName` and a `<text>.choose` heading.
3. Add its words to `js/i18n.js` in **both** languages (`<text>.title`, `.blurb`, `.howto`, ...). The
   "New Game" button and the "Start a new game?" page have shared wording; a game can override it.
4. Add a `<script>` tag in `index.html` (the home page lists games in that order), the file to
   `FILES` in `sw.js`, and a `want('<game>')` section to `tests/playtest.mjs`.

## Ideas for the next games

From a look at the research and at senior game apps (September 2026):
- **Harmonium / Sargam**: big सा रे ग म keys. Free play, or follow the glowing key through a simple
  bhajan. Playing an instrument is the best-evidenced hand exercise of all of these.
- **Rangoli Mirror**: every tap on a dot grid is mirrored 4 or 8 ways, so it always looks beautiful.
- **Bazaar Shopping**: remember a short list, then pick it from a stall. She can peek at the list any time.
- **Complete the Muhavara**: pick the end of a proverb (needs a Hindi speaker's review).
- **Jigsaw**, with a tap-to-swap alternative. **Recipe Steps**: put chai-making in order.
- **Spot the Difference**, **Tambola** (good with family), **Diya Lighting** (trace a path),
  **Calm Garden**.

## Test

`node tests/playtest.mjs` plays every game to the end in a headless browser with real mouse,
touch and keyboard input, at desktop, phone and tablet sizes, and saves screenshots to
`tests/.output/screenshots`. Needs Node 22+ and Edge or Chrome; no npm packages.
`ONLY=colouring,sorting node tests/playtest.mjs` runs just those parts (`classic` is the first
three games; also `pattern`, `hindi`, `strings`, `offline`, `home`).
