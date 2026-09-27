// Lets the app open with no internet, once it has been opened online.
//
// Network first: while online the tablet always gets the newest version (so there is no version
// number to remember to change), and every file fetched is kept. Offline - or if the network takes
// too long - the kept copy is used instead.
'use strict';

const CACHE = 'sunny-games';
const SLOW_MS = 3000;

// Everything the app needs, fetched up front so it works offline even before every game is opened.
// tests/playtest.mjs checks that every file index.html loads is listed here.
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'fonts/Baloo2-latin.woff2',
  'fonts/Baloo2-devanagari.woff2',
  'js/util.js',
  'js/i18n.js',
  'js/sound.js',
  'js/words.js',
  'js/wordsearch.js',
  'js/tilematch.js',
  'js/numbers.js',
  'js/pattern.js',
  'js/sorting.js',
  'js/colouring.js',
  'js/harmonium.js',
  'js/rangoli.js',
  'js/diya.js',
  'js/app.js',
  'icons/sun.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  // One file failing to download must not stop the others being kept.
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return Promise.all(FILES.map(function (file) { return cache.add(file).catch(function () {}); }));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(caches.open(CACHE).then(function (cache) {
    const fromNetwork = fetch(request).then(function (response) {
      if (response.ok) cache.put(request, response.clone());
      return response;
    });
    const fromCache = function () {
      return cache.match(request, { ignoreSearch: true }).then(function (kept) {
        return kept || fromNetwork;
      });
    };
    let timer;
    const slow = new Promise(function (resolve) { timer = setTimeout(resolve, SLOW_MS); }).then(fromCache);
    return Promise.race([fromNetwork.catch(fromCache), slow]).finally(function () { clearTimeout(timer); });
  }));
});
