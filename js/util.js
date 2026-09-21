// Small shared helpers. Everything hangs off one global, SG, so the app
// works when index.html is opened straight from disk (no modules, no build).
window.SG = window.SG || {};

(function (SG) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

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

  SG.svg = function (tag, attrs, children) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  };

  // Icons are drawn, not typed: font glyphs like "✓" or "←" come out thin and
  // different on every tablet. These take the colour of the text around them.
  const ICONS = {
    home: ['M3 11.5L12 4l9 7.5', 'M5.5 9.8V20h13V9.8'],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    chevron: ['M9 4.5l7.5 7.5L9 19.5']
  };

  SG.icon = function (name) {
    return SG.svg('svg', {
      class: 'icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': 2.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'
    }, ICONS[name].map(function (d) { return SG.svg('path', { d: d }); }));
  };

  // The gold outline colours keep these visible on white (plain gold on white is only 1.85:1).
  SG.star = function () {
    return SG.svg('svg', { class: 'star', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, [
      SG.svg('path', {
        d: 'M12 2.6l2.9 6.1 6.7.9-4.9 4.6 1.2 6.7L12 17.7l-5.9 3.2 1.2-6.7-4.9-4.6 6.7-.9z',
        fill: '#F5B301', stroke: '#7A4F00', 'stroke-width': 0.9, 'stroke-linejoin': 'round'
      })
    ]);
  };

  SG.sun = function () {
    const rays = 'M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3M4.8 4.8l2.1 2.1M17.1 17.1l2.1 2.1M4.8 19.2l2.1-2.1M17.1 6.9l2.1-2.1';
    return SG.svg('svg', { class: 'sun', viewBox: '0 0 24 24', fill: 'none', 'stroke-linecap': 'round', 'aria-hidden': 'true' }, [
      SG.svg('path', { d: rays, stroke: '#7A4F00', 'stroke-width': 3 }),
      SG.svg('path', { d: rays, stroke: '#F5B301', 'stroke-width': 1.5 }),
      SG.svg('circle', { cx: 12, cy: 12, r: 5, fill: '#F5B301', stroke: '#7A4F00', 'stroke-width': 0.9 })
    ]);
  };

  // Can this tablet draw this (newer) emoji? An unsupported emoji comes out as an empty box or
  // nothing at all - neither has any coloured pixels. Only use this for pictures that ARE colourful.
  SG.canDraw = function (emoji) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 32;
      const g = canvas.getContext('2d');
      g.textBaseline = 'top';
      g.font = '24px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      g.fillText(emoji, 0, 4);
      const px = g.getImageData(0, 0, 32, 32).data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] > 0 && (Math.abs(px[i] - px[i + 1]) > 24 || Math.abs(px[i + 1] - px[i + 2]) > 24)) return true;
      }
      return false;
    } catch (e) {
      return true; // cannot tell - assume it is fine
    }
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

  // A tap that forgives a drifting finger.
  // Browsers only turn a touch into a "click" if the finger stays within about 2mm. A hand
  // with a tremor often slides further than that, and the tap is silently thrown away.
  // This counts any press that ends on (or within a few pixels of) the control.
  // Give the control `touch-action: none` in CSS so the press is never taken over as a scroll.
  SG.onTap = function (node, fn) {
    const SLACK = 8;
    let pointerId = null;
    let lastPointerUp = 0;

    if (window.PointerEvent) {
      node.addEventListener('pointerdown', function (e) {
        if (pointerId !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
        pointerId = e.pointerId;
        try { node.setPointerCapture(pointerId); } catch (err) { /* older browsers */ }
      });
      node.addEventListener('pointerup', function (e) {
        if (e.pointerId !== pointerId) return;
        pointerId = null;
        lastPointerUp = Date.now();
        const r = node.getBoundingClientRect();
        const inside = e.clientX >= r.left - SLACK && e.clientX <= r.right + SLACK &&
          e.clientY >= r.top - SLACK && e.clientY <= r.bottom + SLACK;
        if (inside) fn(e); // sliding well away before letting go still cancels, as people expect
      });
      node.addEventListener('pointercancel', function (e) {
        if (e.pointerId === pointerId) pointerId = null;
      });
    }

    // Keyboard, switch controls and screen readers arrive as a click with no press before it.
    node.addEventListener('click', function (e) {
      if (Date.now() - lastPointerUp > 500) fn(e);
    });
  };

  // An in-page panel (win screen, "start again?"). It replaces the game on the page - it is not a popup.
  SG.panel = function (options) {
    const el = SG.el;
    const children = [];
    if (options.art) children.push(el('div', { class: 'panel-art' }, [options.art]));
    children.push(el('h2', { class: 'panel-title', tabindex: '-1', text: options.title }));
    children.push(el('p', { class: 'panel-text', text: options.text }));
    if (options.extra) children.push(options.extra);
    children.push(el('div', { class: 'panel-actions' }, options.actions));
    return el('div', { class: 'panel-wrap' }, [
      el('section', { class: 'panel' + (options.kind ? ' panel-' + options.kind : '') }, children)
    ]);
  };

  SG.winPanel = function (message, trophies, onAgain, levelsHref) {
    const el = SG.el;
    const again = el('button', { class: 'btn btn-lg', type: 'button', text: SG.t('playAgain') });
    SG.onTap(again, onAgain);
    return SG.panel({
      kind: 'win',
      art: SG.star(),
      title: SG.t('wellDone'),
      text: message,
      extra: trophies,
      actions: [again, el('a', { class: 'btn btn-secondary', href: levelsHref, draggable: 'false', text: SG.t('changeLevel') })]
    });
  };
})(window.SG);
