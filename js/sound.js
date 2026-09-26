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

  // A pentatonic scale: any of these notes sounds pleasant after any other, so each right
  // answer can simply play the next one up and it always makes a little tune.
  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

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
    // A right answer: the i-th note of the scale, with a soft shimmer an octave up.
    good: function (i) {
      const freq = PENTATONIC[Math.abs(i || 0) % PENTATONIC.length];
      note(freq, 0, 0.45, 0.11);
      note(freq * 2, 0.03, 0.3, 0.025);
    },
    // One clear note, e.g. for a pad in Repeat the Pattern.
    pad: function (freq) {
      note(freq, 0, 0.5, 0.14);
    },
    // A warm chord that rises: C-E-G together, then the high C.
    win: function () {
      [523.25, 659.25, 783.99].forEach(function (freq, i) {
        note(freq, i * 0.05, 0.9, 0.09);
      });
      note(1046.5, 0.3, 1.2, 0.1);
      note(1318.51, 0.45, 1.1, 0.05);
    }
  };
})(window.SG);
