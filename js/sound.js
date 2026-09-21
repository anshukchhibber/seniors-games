// Soft chimes made with the Web Audio API - no sound files to load.
// A quiet blip on every tap confirms the touch registered, which helps
// when feeling in the fingers is reduced.
(function (SG) {
  'use strict';

  let ctx = null;
  let on = SG.store.get('sound', 'on') !== 'off';

  function context() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function note(freq, delay, length, volume) {
    if (!on) return;
    const ac = context();
    if (!ac) return;
    const start = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  SG.sound = {
    isOn: function () {
      return on;
    },
    toggle: function () {
      on = !on;
      SG.store.set('sound', on ? 'on' : 'off');
      if (on) SG.sound.found();
      return on;
    },
    tap: function () {
      note(440, 0, 0.12, 0.05);
    },
    step: function () {
      note(659.25, 0, 0.2, 0.08);
    },
    found: function () {
      note(523.25, 0, 0.35, 0.12);
      note(783.99, 0.14, 0.5, 0.12);
    },
    win: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (freq, i) {
        note(freq, i * 0.16, 0.6, 0.12);
      });
    }
  };
})(window.SG);
