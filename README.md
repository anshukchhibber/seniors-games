# Sunny Games

Calm, clear games for seniors: **Word Search** and **Tile Match**.
No ads, no popups, no timers, no accounts, no internet needed once loaded.

## Play

Double-click `index.html`. That's it — there is nothing to install or build.

To play on a tablet, put this folder on any static web host (GitHub Pages, Netlify, …)
and open the address on the tablet. A tablet is the best fit: the letters and tiles get big.

## Design rules (please keep these when adding games)

- **Nothing pops up.** Every screen is a plain page. "Home" is always top-left.
- **No time pressure, no failure.** No timers, no lives, no "wrong!" sounds or red flashes.
- **Big and high-contrast.** Text ≥ 19px, buttons ≥ 64px tall, dark navy on cream.
- **Forgiving hands.**
  - Word Search: slide along a word *or* tap its first then last letter. Selections snap to a
    straight line, may be one letter out, and work in either direction. A resting palm or
    second finger is ignored. The page cannot scroll or zoom mid-word.
  - Tile Match: accidental double-taps are ignored; mismatched tiles stay up for 2.5 seconds,
    or until the next tap.
- **Nothing moves unless the player moved it.** The layout never shifts during a game.
- **Colour is never the only signal** (found words are also struck through; matched tiles get a ✓).
- Works with keyboard and screen readers, and honours the "reduce motion" system setting.

## Make it yours

| To change…                        | Edit                                              |
| --------------------------------- | ------------------------------------------------- |
| Word Search topics and words      | `js/words.js` (add family names, places, …)       |
| Grid sizes / number of words      | `LEVELS` at the top of `js/wordsearch.js`         |
| Tile pictures, how long tiles show | `SYMBOLS`, `MISMATCH_SHOW_MS` in `js/tilematch.js` |
| Colours and text sizes            | `:root` at the top of `css/style.css`             |
| The app's name                    | `APP_NAME` in `js/app.js` and `<title>` in `index.html` |

## Test

`node tests/playtest.mjs` plays both games to the end in a headless browser with real mouse,
touch and keyboard input, at desktop, phone and tablet sizes, and saves screenshots to
`tests/.output/screenshots`. Needs Node 22+ and Edge or Chrome; no npm packages.
