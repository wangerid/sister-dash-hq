// Graphics quality (pause menu): High / Medium / Low, default High.
//   High   - canvas rendered at up to 2x the 960x540 game resolution (1920x1080,
//            sharp on Retina), all particles, glow and screen shake.
//   Medium - up to 1.5x, half the particles, no far-layer animation.
//   Low    - 1x, no particles, no glow, no screen shake.
// Gameplay never changes with the setting. If the game runs below 50 fps for
// a few seconds it steps down one level by itself and says so.
var Quality = {
  LEVELS: ['high', 'medium', 'low'],
  level: 'high',
  particles: 1,
  maxScale: 2,
  shake: true,
  notice: null,           // { text, t }
  _frames: 0, _time: 0, _slow: 0, _auto: true,

  init: function () {
    var q = Store.setting('quality');
    this.apply(this.LEVELS.indexOf(q) >= 0 ? q : 'high');
  },

  apply: function (q) {
    this.level = q;
    this.particles = q === 'high' ? 1 : q === 'medium' ? 0.5 : 0;
    this.maxScale = q === 'high' ? 2 : q === 'medium' ? 1.5 : 1;
    this.shake = q !== 'low' && Store.setting('shake') !== false;
    if (window.Game && Game.canvas) Game.resize();
  },

  set: function (q) {
    Store.setSetting('quality', q);
    this._auto = false;           // the player chose: don't override it
    this.apply(q);
  },

  cycle: function () {
    var i = this.LEVELS.indexOf(this.level);
    this.set(this.LEVELS[(i + 1) % this.LEVELS.length]);
  },

  label: function () { return this.level.charAt(0).toUpperCase() + this.level.slice(1); },

  // Called once per rendered frame with the real frame time (seconds).
  sample: function (dt, playing) {
    if (this.notice) { this.notice.t += dt; if (this.notice.t > 3.5) this.notice = null; }
    if (!playing || !this._auto || this.level === 'low' || dt > 0.5) { this._frames = 0; this._time = 0; return; }
    this._frames++;
    this._time += dt;
    if (this._time < 1) return;
    var fps = this._frames / this._time;
    this._frames = 0; this._time = 0;
    this._slow = fps < 50 ? this._slow + 1 : 0;
    if (this._slow >= 3) {
      this._slow = 0;
      var next = this.level === 'high' ? 'medium' : 'low';
      this.apply(next);
      Store.setSetting('quality', next);
      this.notice = { text: 'Graphics set to ' + this.label() + ' to keep the game smooth', t: 0 };
    }
  },

  drawNotice: function (ctx) {
    if (!this.notice) return;
    var a = Math.min(1, this.notice.t * 4, (3.5 - this.notice.t) * 2);
    ctx.globalAlpha = Math.max(0, a);
    UI.panel(ctx, VIEW_W / 2 - 230, VIEW_H - 52, 460, 34, 14, 0.6);
    UI.text(ctx, this.notice.text, VIEW_W / 2, VIEW_H - 35, 15, '#FFFFFF', 'center', { outline: false });
    ctx.globalAlpha = 1;
  }
};
