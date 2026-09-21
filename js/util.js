// Small shared helpers. Everything hangs off one global, SG, so the app
// works when index.html is opened straight from disk (no modules, no build).
window.SG = window.SG || {};

(function (SG) {
  'use strict';

  // el('button', { class: 'btn', text: 'Play', onclick: fn }, [children])
  SG.el = function (tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      const value = attrs[key];
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  };

  SG.rand = function (n) {
    return Math.floor(Math.random() * n);
  };

  SG.shuffle = function (list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = SG.rand(i + 1);
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  SG.clamp = function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  };

  // localStorage can throw (private mode, file:// in some browsers) - never let it break a game.
  SG.store = {
    get: function (key, fallback) {
      try {
        const value = localStorage.getItem('sg.' + key);
        return value === null ? fallback : value;
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem('sg.' + key, value);
      } catch (e) { /* ignore */ }
    }
  };

  // The "you finished" screen. It replaces the board in the page - it is not a popup.
  SG.winPanel = function (message, onAgain, levelsHref) {
    const el = SG.el;
    return el('section', { class: 'win' }, [
      el('div', { class: 'win-star', 'aria-hidden': 'true', text: '★' }),
      el('h2', { class: 'win-title', tabindex: '-1', text: 'Well done!' }),
      el('p', { class: 'win-text', text: message }),
      el('div', { class: 'win-actions' }, [
        el('button', { class: 'btn', type: 'button', text: 'Play Again', onclick: onAgain }),
        el('a', { class: 'btn btn-secondary', href: levelsHref, text: 'Change Level' })
      ])
    ]);
  };
})(window.SG);
