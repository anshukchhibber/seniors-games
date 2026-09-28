// A photo with the masterpiece: the front camera, with the finished picture (or rangoli) shown in
// a frame in the corner, a big button, a gentle 3-2-1, and the photo to keep or share.
//
// The camera is only ever turned on by the player pressing "Photo with it", and it is always
// turned off again on leaving. (The tablet asks for permission the first time: that question is
// the tablet's own, and cannot be avoided.)
(function (SG) {
  'use strict';

  const el = SG.el;
  const COUNT_MS = 900;

  // Turns an SVG drawing into an image that can be painted onto the photo.
  function svgImage(node) {
    const copy = node.cloneNode(true);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', 600);
    copy.setAttribute('height', 600);
    copy.removeAttribute('class');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copy));
    return img;
  }

  // The finished picture in a white frame, in the bottom corner of the photo
  function paintArt(g, art, w, h) {
    const size = Math.round(Math.min(w, h) * 0.42);
    const pad = Math.round(size * 0.06);
    const x = w - size - pad * 3, y = h - size - pad * 3;
    g.fillStyle = 'rgba(0, 0, 0, 0.25)';
    g.fillRect(x + pad * 0.6, y + pad * 0.6, size + pad * 2, size + pad * 2);
    g.fillStyle = '#FFFFFF';
    g.fillRect(x, y, size + pad * 2, size + pad * 2);
    if (art.complete && art.naturalWidth) g.drawImage(art, x + pad, y + pad, size, size);
  }

  // `stage`: where it shows. `drawing`: the SVG of the finished picture. `onBack`: back to the
  // finish screen. Returns { stop } to turn the camera off.
  SG.photoBooth = function (stage, drawing, onBack) {
    const t = SG.t;
    const timers = SG.timers();
    const art = svgImage(drawing);
    let stream = null, shot = null, blob = null;

    stage.textContent = '';
    const statusEl = el('p', { class: 'status pb-status', role: 'status', text: t('photo.smile') });
    const video = el('video', { class: 'pb-video', autoplay: '', playsinline: '', muted: '' });
    video.muted = true;
    const frame = el('div', { class: 'pb-art', 'aria-hidden': 'true' }, [drawing.cloneNode(true)]);
    const count = el('div', { class: 'pb-count', 'aria-hidden': 'true' });
    const photo = el('img', { class: 'pb-shot', alt: t('photo.alt') });
    photo.hidden = true;
    const view = el('div', { class: 'pb-view' }, [video, frame, count, photo]);

    const take = SG.iconButton('btn btn-lg pb-take', 'camera', t('photo.take'));
    const save = SG.iconButton('btn btn-lg pb-save', 'check', t('photo.save'));
    const again = SG.iconButton('btn btn-secondary pb-again', 'again', t('photo.again'));
    const back = SG.iconButton('btn btn-secondary pb-back', 'back', t('back'));
    save.hidden = again.hidden = true;
    const actions = el('div', { class: 'pb-actions' }, [take, save, again, back]);
    stage.appendChild(el('div', { class: 'pb-layout' }, [statusEl, view, actions]));

    function stop() {
      timers.clear();
      if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
    }

    function noCamera() {
      statusEl.textContent = t('photo.noCamera');
      SG.track.event('photo', { game: SG.track.game() || '', step: 'no-camera' });
      video.hidden = true;
      frame.classList.add('pb-art-only');
      take.hidden = true;
      save.hidden = false;
    }

    // Front camera, as big as the screen allows
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
        .then(function (s) {
          if (!stage.contains(view)) { s.getTracks().forEach(function (track) { track.stop(); }); return; } // left already
          stream = s;
          video.srcObject = s;
        })
        .catch(noCamera);
    } else {
      noCamera();
    }

    function capture() {
      const w = video.videoWidth || 800, h = video.videoHeight || 600;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const g = canvas.getContext('2d');
      // mirrored, as the player saw themself
      g.save();
      g.translate(w, 0);
      g.scale(-1, 1);
      g.drawImage(video, 0, 0, w, h);
      g.restore();
      paintArt(g, art, w, h);
      return canvas;
    }

    function show(canvas) {
      canvas.toBlob(function (b) {
        blob = b;
        if (shot) URL.revokeObjectURL(shot);
        shot = URL.createObjectURL(b);
        photo.src = shot;
        photo.hidden = false;
        video.hidden = frame.hidden = true;
        take.hidden = true;
        save.hidden = again.hidden = false;
        statusEl.textContent = t('photo.here');
        SG.track.event('photo', { game: SG.track.game() || '', step: 'taken' });
        SG.sound.win();
      }, 'image/png');
    }

    // 3, 2, 1... then the photo. Started only by pressing the button.
    SG.onTap(take, function () {
      if (!stream || count.textContent) return;
      take.disabled = true;
      [3, 2, 1].forEach(function (n, i) {
        timers.later(function () { count.textContent = String(n); SG.sound.good(i); }, i * COUNT_MS);
      });
      timers.later(function () {
        count.textContent = '';
        take.disabled = false;
        view.classList.add('pb-flash');
        timers.later(function () { view.classList.remove('pb-flash'); }, 300);
        show(capture());
      }, 3 * COUNT_MS);
    });

    SG.onTap(again, function () {
      photo.hidden = true;
      video.hidden = frame.hidden = false;
      take.hidden = false;
      save.hidden = again.hidden = true;
      statusEl.textContent = t('photo.smile');
    });

    // Keep it: the tablet's own "share" (to the photo gallery, or to the family), or a download
    SG.onTap(save, function () {
      const done = function () {
        statusEl.textContent = t('photo.saved');
        SG.track.event('photo', { game: SG.track.game() || '', step: 'saved' });
      };
      if (!blob) { // no camera: the picture on its own
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 800;
        const g = canvas.getContext('2d');
        g.fillStyle = '#FFFFFF';
        g.fillRect(0, 0, 800, 800);
        if (art.complete && art.naturalWidth) g.drawImage(art, 40, 40, 720, 720);
        canvas.toBlob(function (b) { blob = b; keep(b, done); }, 'image/png');
        return;
      }
      keep(blob, done);
    });

    SG.onTap(back, function () {
      stop();
      onBack();
    });

    return { stop: stop };
  };

  function keep(blob, done) {
    const file = typeof File === 'function' ? new File([blob], 'sunny-games-photo.png', { type: 'image/png' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).then(done).catch(function () { /* the player changed their mind */ });
      return;
    }
    const a = SG.el('a', { href: URL.createObjectURL(blob), download: 'sunny-games-photo.png', class: 'pb-download', draggable: 'false' });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    done();
  }
})(window.SG);
