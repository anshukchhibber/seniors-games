# Sunny Games

Calm, clear games for seniors, in **English and Hindi**. No ads, no popups, no timers, no
accounts, and no internet needed once it has been opened.

| Game | Its colour | What it is good for |
| --- | --- | --- |
| **Word Search** | amber | Find hidden words. Vocabulary and scanning; sliding along a word practises a controlled drag. |
| **Tile Match** | teal | Cards really turn over; find the pairs. Short-term memory. |
| **Number Hunt** | terracotta | Tap 1, 2, 3... on big round tokens scattered over the screen (12, 20 or 30 of them). Attention and visual search; the hand reaches all over the screen. |
| **Repeat the Pattern** | purple | Pads light up in turn (each with its own colour, shape and note); tap them back. Each pattern is one longer. A slip just means "watch again". |
| **Sort into Baskets** | green | Four pictures on the table at a time. Tap one and then its basket, or slide it in (fruit / vegetables, hot / cold, land / water...). Reaching, dragging and simple grouping. |
| **Colouring Book** | rose | Choose a colour, tap part of a picture and the colour spreads out from your finger: flower, house, butterfly, kite, diya, lotus, rangoli. Creative and calming; nothing can go wrong. Every picture is kept, so the picture page is also the gallery. |
| **Harmonium** | wood brown | Eight big keys, सा to सां, each with its own colour and a warm reed sound that lasts as long as the key is held. Play freely, or follow the glowing key (and the pointing hand) through Sa Re Ga Ma, Twinkle Twinkle or Jingle Bells; "Listen" plays the line first. Finger-by-finger movement, music and joy. |
| **Rangoli Mirror** | blue | Choose a colour and a shape, tap the floor, and the mark is repeated all the way round, mirrored (Square, Flower or Star), so every design comes out balanced. Each design is kept. Creative, calming, and reaching all over the screen. |
| **Diya Trail** | night indigo | Slide a finger along a dotted path of light from one diya to the next (or tap the dots one by one); each diya catches fire as the light reaches it. A slow, controlled finger movement, like handwriting practice after a stroke. The finger may wander; nothing is ever lost. |

## How it flows

- **Home** is six big tiles, one per game: a picture and a name, nothing else to read. The
  language (English / हिंदी) sits below them, with a small **Settings** button (sound, playing hand).
- **One tap plays.** A tile opens its game straight away, at the level played last time (Easy the
  first time). Colouring Book opens on its pictures instead, because choosing one *is* the first move.
- **The very first time** a game is opened, a page shows its picture, three short lines on how to
  play, and one big **Start** button. After that it never appears again (the same words stay on the
  level page).
- **In a game** the top bar is always **Home** · the game's name · **the level being played**
  ("Medium", or the picture's name). That last button is how to change level.
- **The level page** lists the levels, with a **How to play** button (the first-time page again,
  with a Back button). If a game is under way, it is kept (only hidden) and the page opens with
  **Keep Playing** as the big button, plus New Game. The tablet's Back button also goes back to the
  same game.
- **Finishing** shows what was done (the words, the pairs, the full baskets, the coloured picture)
  in the game's colour, with a warm chord and a short burst of paper confetti; then **Play Again**
  or **Change Level**. No scores to beat, no streaks.

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

- **As few taps and words as possible before playing.** A game is one tap from home. Nothing
  on a home tile but its picture and name. The only first-time page has one button.
- **Pictures first, words second** - for a player who reads little, or not in this language.
  Every action button has a picture as well as a word (▶ start / keep playing, ↻ play again,
  eye = watch, lightbulb = hint, ↶ undo, ✓ finished). The first-time page has a drawn hand that
  acts out the move. In Sort into Baskets each basket stands in its own scene (grass for land,
  waves for water, clouds for sky, sun for hot, snow for cold) and carries a picture label of
  something that goes in it; after a second try, a hand points at the right basket. In Number
  Hunt, the number to find is drawn exactly like the tokens to tap.
- **Everything fits on one screen - nothing ever scrolls.** The app is a frame exactly the size of
  the screen, on any phone, tablet or computer, held either way. Pictures and tiles grow and shrink
  to the space; words keep their size. The home tiles and the level choices arrange themselves to
  suit the screen's shape (3 x 2 on a tablet held sideways, 2 x 3 upright, picture beside the name
  on a phone held sideways). If a page is still too tall, extras are taken away in a set order
  (tighter spacing, then a heading, then a third line of help...): `data-fit` on the page and
  `.fit-1`, `.fit-2`... in `css/style.css`, applied by `SG.fitSteps`. Games step down the same
  way (a smaller word grid, fewer numbers, two pictures on the table instead of four). All of it is
  decided when a page opens or the tablet is turned, never mid-game. `ONLY=fit` in the playtest
  checks every page at nine screen sizes.
- **Nothing pops up.** Every screen is a plain page. "Home" is always top-left (and always navy, the
  same landmark in every game). "How to play" lives permanently on the level page. A game under way
  is never thrown away by opening the level page: **Keep Playing** is the big button there.
  Long-press is tamed app-wide so the tablet's own popups (link previews, "Copy / Look Up")
  cannot appear either.
- **No time pressure, no failure.** No timers of any kind: a hint stays until its word is found,
  and mismatched tiles stay showing until the next tap. No lives, no "wrong!" sounds, no red.
- **One visual rule to learn:** a dark outline that looks *raised* can be pressed; flat colour or
  plain text is information. Each game has its own colour (`[data-game]` in `css/style.css`), but
  the rule is the same everywhere. Presses answer on touch-down by visibly going *down* (shape, not
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
- **Nothing moves unless the player moved it.** The layout never shifts during a game (a card
  turning over, a picture leaving the table, a number being found - none of them moves anything
  else), and every animation is started by the player's own action. With "reduce motion" switched
  on in the tablet's settings, all of it - confetti included - is left out.
- **Colour is never the only signal.** Found words get an outlined band, a tick and a strike-through;
  matched tiles get a thick green edge and a solid ✓ badge; chosen settings are filled *and* ticked.
- **Never shrink, reduce instead.** When a screen is too small, a game uses fewer things at full
  size rather than more things made tiny: a smaller word grid with fewer words, fewer numbers, and
  two pictures on the sorting table instead of four. This is decided once, before a game starts.
- **Hindi is typeset as Hindi.** No letter-spacing (it breaks the headline joining the letters),
  taller lines for vowel signs, and no strike-through on found words (it makes Devanagari unreadable).
  Newer emoji (auto rickshaw, kite, lamp, lotus) are left out on tablets that cannot draw them.
- **Pictures that can't be confused.** Look-alike tile pictures (star/sunflower, tree/turtle) are
  never dealt into the same game, and every picture is also named in the status line.
- **One friendly typeface for both languages:** Baloo 2 (SIL Open Font License, `fonts/OFL.txt`),
  bundled so it works offline. Icons and game pictures are drawn (inline SVG), never font glyphs,
  so they look the same on every tablet.
- **Sounds only ever say "yes".** Each right answer plays the next note of a pentatonic scale (so
  it always makes a little tune); a finish plays a chord. A neutral tap is a soft blip.
- Works with keyboard and screen readers, and honours the "reduce motion" system setting.

## Make it yours

| To change…                        | Edit                                              |
| --------------------------------- | ------------------------------------------------- |
| Any wording, in either language   | `js/i18n.js` (a Hindi speaker should review the Hindi) |
| Add another language              | a block in `js/i18n.js`, word lists in `js/words.js`, and a `SCRIPTS` entry in `js/wordsearch.js` |
| Word Search topics and words      | `js/words.js` (add family names, places, …)       |
| How many numbers in Number Hunt   | `LEVELS` at the top of `js/numbers.js`            |
| A game's colour                   | its `[data-game="..."]` line in `css/style.css` (keep the contrast notes above it) |
| The typeface                      | `@font-face` at the top of `css/style.css`, the files in `fonts/` and in `FILES` in `sw.js` |
| Grid sizes / number of words      | `LEVELS` at the top of `js/wordsearch.js`         |
| Tile pictures (and look-alike groups) | `SYMBOLS` in `js/tilematch.js`                 |
| Sort into Baskets groups and pictures | `GROUPS` (with each basket's `sign`, `scene`, `tint`) and `SETS` in `js/sorting.js`; the scenes are `.so-scene-*` in `css/style.css` |
| Colouring pictures and palette    | `PICTURES` and `COLOURS` in `js/colouring.js`     |
| Pattern pads (shape, colour, note), lengths | `PADS` and `LEVELS` in `js/pattern.js`  |
| Harmonium keys and tunes          | `KEYS` and `TUNES` in `js/harmonium.js` (one line of sargam per phrase) |
| Rangoli colours, shapes, symmetries | `COLOURS`, `SHAPES` and `LEVELS` in `js/rangoli.js` |
| Diya Trail lengths and curves     | `LEVELS` in `js/diya.js`                          |
| Colours, text sizes, spacing (design tokens) | `:root` at the top of `css/style.css`   |
| The app's name                    | `APP_NAME` in `js/app.js` and `<title>` in `index.html` |

## Add a game

1. Make `js/<game>.js` ending in `SG.registerGame({ key, text, levels, mount, illustration, preview, detail })`.
   Copy the shape of `js/pattern.js`: `mount(stage, levelKey)` returns
   `{ newGame, resize, progress, destroy }`. `progress()` is a sentence while there is something to
   lose ("You have found 3 of 8 pairs.") and `null` otherwise - the level page shows it above Keep
   Playing. Use `SG.onTap` for every tap, `SG.timers()`, `SG.bestGrid`, `SG.winPanel` (pass
   `'#/<key>/levels'` as its link), `SG.sound.good(i)` for each right answer, `SG.reducedMotion()`
   before any movement, and add the class `pressable` to the game's own big buttons.
2. `illustration(opts)` returns one SVG (`viewBox="0 0 120 90"`, class `illus`) for the home tile, the
   first-time page and How to play. When `opts.demo` is set, add `SG.demoHand(x, y, 'tap' | 'slide', dx, dy)`
   so a hand acts out the game's move. Use the classes `fill-accent`, `fill-deep`, `fill-tint`,
   `stroke-deep` and `stroke-accent` so it takes the game's colour.
3. Give the game a colour: a `[data-game="<key>"]` line in `css/style.css` with its four accent
   values. Check the contrast (the ratios are listed above those lines).
4. `levels` can be anything to choose between, not only Easy / Medium / Hard: Colouring Book uses
   pictures, with `levelName`, a `<text>.choose` heading, and `chooser: true` (opening the game shows
   the choice first). `levels` and `howto` cannot be level keys (they are page addresses).
5. Add its words to `js/i18n.js` in **both** languages (`<text>.title`, `.howto`, ...). "New Game",
   "Keep Playing" and the level page's wording are shared; a game can override them
   (`<text>.action`, `<text>.keep`, `<text>.resumeTitle`, `<text>.resumeText`, `<text>.bar`).
6. Add a `<script>` tag in `index.html` (the home page lists games in that order), the file to
   `FILES` in `sw.js`, and a `want('<game>')` section to `tests/playtest.mjs`.

## Ideas for the next games

From a look at the research and at senior game apps (September 2026):
- A bhajan or two for the **Harmonium** (the notes need checking by someone who plays).
- **Bazaar Shopping**: remember a short list, then pick it from a stall. She can peek at the list any time.
- **Complete the Muhavara**: pick the end of a proverb (needs a Hindi speaker's review).
- **Jigsaw**, with a tap-to-swap alternative. **Recipe Steps**: put chai-making in order.
- **Spot the Difference**, **Tambola** (good with family),
  **Calm Garden**.

## Test

`node tests/playtest.mjs` plays every game to the end in a headless browser with real mouse,
touch and keyboard input, at desktop, phone and tablet sizes, and saves screenshots to
`tests/.output/screenshots`. Needs Node 22+ and Edge or Chrome; no npm packages.
`ONLY=colouring,sorting node tests/playtest.mjs` runs just those parts (`classic` is the home page,
the first-time page, settings and the first three games; also `pattern`, `sorting`, `colouring`,
`hindi`, `strings`, `offline`, `intro`, `fit` - every page at nine screen sizes - and `home`).
