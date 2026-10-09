// Boot, fixed-timestep game loop and scene manager.
var Game = {
  scene: null,
  canvas: null,
  ctx: null,
  STEP: 1 / 60,
  acc: 0,
  last: 0,

  set: function (scene) {
    this.scene = scene;
    if (scene.enter) scene.enter();
    // Circle-wipe (iris) into every new screen.
    if (!(scene instanceof LoadingScene)) this.transition = { t: 0 };
  },

  drawTransition: function (ctx, dt) {
    var tr = this.transition;
    tr.t += Math.min(dt, 0.05);
    var f = tr.t / 0.45;
    if (f >= 1) { this.transition = null; return; }
    var r = Math.max(0, f * f) * 620;
    ctx.save();
    ctx.fillStyle = '#1B2433';
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.arc(VIEW_W / 2, VIEW_H / 2, r, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();
  },

  resize: function () {
    var c = this.canvas;
    var ww = window.innerWidth, wh = window.innerHeight;
    var cssW = Math.min(ww, wh * 16 / 9);
    var cssH = cssW * 9 / 16;
    c.style.width = Math.floor(cssW) + 'px';
    c.style.height = Math.floor(cssH) + 'px';
    // Render scale: as many device pixels as the screen shows, capped by the
    // quality setting (High 2x = 1920x1080, Medium 1.5x, Low 1x). All game
    // logic stays in 960x540 coordinates. Only resize the backing store when
    // the scale really changes, so ordinary resizes keep the drawing state.
    var dpr = window.devicePixelRatio || 1;
    var want = Math.max(1, Math.min(Quality.maxScale, cssW * dpr / VIEW_W));
    want = Math.round(want * 4) / 4;
    var w = Math.round(VIEW_W * want), h = Math.round(VIEW_H * want);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    RS = c.width / VIEW_W;
  },

  frame: function (now) {
    var self = Game;
    var raw = (now - self.last) / 1000 || 0;
    var dt = Math.min(0.25, raw);
    self.last = now;
    Quality.sample(raw, self.scene instanceof PlayScene && !self.scene.paused);
    self.acc += dt;
    var steps = 0;
    while (self.acc >= self.STEP && steps < 8) {
      Input.beginStep();
      self.globalKeys();
      self.scene.update(self.STEP);
      self.acc -= self.STEP;
      steps++;
    }
    if (steps >= 8) self.acc = 0;
    var ctx = self.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    self.scene.draw(ctx);
    if (self.transition) self.drawTransition(ctx, raw);
    Quality.drawNotice(ctx);
    window.requestAnimationFrame(self.frame);
  },

  globalKeys: function () {
    if (Input.hit('debugArt')) Assets.toggle();
    if (Input.hit('mute')) {
      var m = Sound.toggleMute();
      Store.setSetting('muted', m);
    }
  },

  start: function () {
    this.canvas = document.getElementById('game');
    this.canvas.tabIndex = 0;
    this.ctx = this.canvas.getContext('2d');
    Store.load();
    Quality.init();
    Sound.setMuted(!!Store.setting('muted'));
    Input.init(this.canvas);
    this.resize();
    window.addEventListener('resize', function () { Game.resize(); });
    this.canvas.focus();
    this.set(new LoadingScene());
    this.last = performance.now();
    window.requestAnimationFrame(this.frame);
  }
};

// Debug / testing shortcuts via the URL hash, e.g. index.html#level=3&char=mom
// (#scene=title|chars|levels, #hold=ArrowRight to hold a key, #fallback for F2 mode).
Game.debug = (function () {
  var h = (window.location && window.location.hash || '').replace(/^#/, '');
  var o = {};
  if (!h) return o;
  h.split('&').forEach(function (kv) { var p = kv.split('='); o[p[0]] = p[1] === undefined ? true : decodeURIComponent(p[1]); });
  return o;
})();

window.addEventListener('error', function (e) {
  if (!Game.debug.log) return;
  var d = document.getElementById('errlog') || document.body.appendChild(document.createElement('pre'));
  d.id = 'errlog';
  d.textContent += (e.message || e) + ' @' + (e.filename || '') + ':' + (e.lineno || '') + '\n';
});

window.addEventListener('load', function () { Game.start(); });
