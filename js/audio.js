// Simple Web Audio beeps with a mute toggle (M).
var Sound = {
  ctx: null,
  muted: false,
  master: null,

  init: function () {
    if (this.ctx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },

  resume: function () {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (e) {}
    }
  },

  setMuted: function (m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  },

  toggleMute: function () { this.setMuted(!this.muted); return this.muted; },

  // One tone with a pitch slide and a quick envelope.
  tone: function (freq, freq2, dur, type, vol, delay) {
    if (!this.ctx || this.muted) return;
    var c = this.ctx;
    var t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },

  noise: function (dur, vol, filterFreq, delay) {
    if (!this.ctx || this.muted) return;
    var c = this.ctx;
    var t0 = c.currentTime + (delay || 0);
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource();
    src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq || 1200;
    var g = c.createGain();
    g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  },

  play: function (name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'jump': this.tone(330, 620, 0.12, 'square', 0.12); break;
      case 'coin': this.tone(988, null, 0.06, 'square', 0.12); this.tone(1319, null, 0.12, 'square', 0.12, 0.06); break;
      case 'crystal': this.tone(1319, null, 0.06, 'triangle', 0.2); this.tone(1760, null, 0.08, 'triangle', 0.2, 0.06); this.tone(2349, null, 0.15, 'triangle', 0.15, 0.12); break;
      case 'stomp': this.tone(420, 120, 0.12, 'square', 0.18); break;
      case 'bump': this.tone(160, 90, 0.08, 'square', 0.18); break;
      case 'break': this.noise(0.2, 0.35, 900); this.tone(200, 60, 0.15, 'square', 0.1); break;
      case 'powerup':
        [523, 659, 784, 1047].forEach(function (f, i) { Sound.tone(f, null, 0.09, 'square', 0.12, i * 0.07); });
        break;
      case 'candy':
        [784, 988, 1175, 1568, 1976].forEach(function (f, i) { Sound.tone(f, null, 0.08, 'triangle', 0.18, i * 0.05); });
        break;
      case 'item': this.tone(392, 784, 0.18, 'triangle', 0.2); break;
      case 'shrink': this.tone(700, 200, 0.35, 'square', 0.14); break;
      case 'hurt': this.tone(300, 80, 0.3, 'sawtooth', 0.16); break;
      case 'die':
        [494, 440, 392, 330, 262].forEach(function (f, i) { Sound.tone(f, null, 0.12, 'square', 0.14, i * 0.11); });
        break;
      case 'shoot': this.tone(880, 440, 0.08, 'triangle', 0.18); break;
      case 'poof': this.noise(0.18, 0.25, 2000); break;
      case 'checkpoint': this.tone(660, null, 0.08, 'square', 0.12); this.tone(990, null, 0.16, 'square', 0.12, 0.08); break;
      case 'spring': this.tone(200, 900, 0.25, 'triangle', 0.25); break;
      case 'tick': this.tone(1500, null, 0.04, 'square', 0.1); break;
      case 'warn': this.tone(880, null, 0.1, 'square', 0.12); this.tone(660, null, 0.1, 'square', 0.12, 0.12); break;
      case 'rumble': this.noise(0.6, 0.35, 180); break;
      case 'roar': this.tone(160, 70, 0.6, 'sawtooth', 0.22); this.noise(0.5, 0.2, 400); break;
      case 'bosshit': this.tone(600, 150, 0.25, 'square', 0.2); this.noise(0.15, 0.2, 1500); break;
      case 'shothit': this.tone(1200, 600, 0.06, 'square', 0.1); break;
      case 'zap': this.noise(0.25, 0.4, 5000); this.tone(1800, 200, 0.2, 'sawtooth', 0.12); break;
      case 'swim': this.tone(260, 380, 0.1, 'sine', 0.2); break;
      case 'bubble': this.tone(500, 1100, 0.12, 'sine', 0.2); break;
      case 'timesup': this.tone(440, 110, 0.7, 'sawtooth', 0.2); break;
      case 'victory':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { Sound.tone(f, null, 0.14, 'square', 0.13, i * 0.12); });
        break;
      case 'select': this.tone(660, null, 0.05, 'square', 0.1); break;
      case 'confirm': this.tone(523, null, 0.06, 'square', 0.12); this.tone(784, null, 0.1, 'square', 0.12, 0.06); break;
      case 'oneup': [660, 880, 1320, 1760].forEach(function (f, i) { Sound.tone(f, null, 0.1, 'square', 0.12, i * 0.08); }); break;
      case 'splash': this.noise(0.3, 0.25, 1600); break;
      // expansion worlds
      case 'vine': this.tone(300, 520, 0.12, 'triangle', 0.16); break;
      case 'rustle': this.noise(0.35, 0.18, 2600); break;
      case 'creak': this.tone(180, 140, 0.4, 'sawtooth', 0.08); this.tone(150, 120, 0.3, 'sawtooth', 0.06, 0.35); break;
      case 'drum': this.noise(0.04, 0.35, 900); break;
      case 'screech': this.tone(1400, 900, 0.25, 'sawtooth', 0.12); break;
      case 'laser': this.tone(1200, 1600, 0.15, 'sawtooth', 0.06); break;
      case 'pellet': this.tone(900, 500, 0.12, 'triangle', 0.1); break;
      case 'boing': this.tone(180, 520, 0.3, 'sine', 0.3); break;
      case 'sneeze': this.noise(0.25, 0.35, 3000); this.tone(700, 300, 0.2, 'triangle', 0.15); break;
      case 'slam': this.noise(0.4, 0.45, 300); this.tone(110, 50, 0.4, 'square', 0.2); break;
      case 'walk': this.tone(1046, null, 0.06, 'square', 0.08); this.tone(1046, null, 0.06, 'square', 0.08, 0.12); break;
      case 'beep': this.tone(1568, null, 0.04, 'square', 0.07); break;
      case 'flap': this.noise(0.15, 0.2, 1800); break;
    }
  }
};
