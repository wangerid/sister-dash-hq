// Image loading, loading-screen progress, and the painted/fallback switch (F2).
var Assets = {
  painted: true,     // F2 toggles; when false everything uses code-drawn art
  sheets: {},        // key -> { def, img, ok }
  images: {},        // key -> { img, ok }
  total: 0,
  settled: 0,
  loadedCount: 0,
  version: 0,        // bumps when painted mode changes (render caches rebuild)

  load: function (onDone) {
    var self = this;
    var entries = [];
    var k;
    for (k in MANIFEST.sheets) entries.push(['sheet', k, MANIFEST.sheets[k].src]);
    for (k in MANIFEST.images) entries.push(['image', k, MANIFEST.images[k]]);
    this.total = entries.length;
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      onDone();
    }
    if (!entries.length) { finish(); return; }
    entries.forEach(function (e) {
      var img = new Image();
      var rec = { img: img, ok: false };
      if (e[0] === 'sheet') { rec.def = MANIFEST.sheets[e[1]]; self.sheets[e[1]] = rec; }
      else self.images[e[1]] = rec;
      img.onload = function () {
        rec.ok = img.naturalWidth > 0;
        if (rec.ok) self.loadedCount++;
        self.settled++;
        if (self.settled >= self.total) finish();
      };
      img.onerror = function () {
        self.settled++;
        if (self.settled >= self.total) finish();
      };
      img.src = e[2];
    });
    // Never hang on the loading screen.
    setTimeout(finish, 8000);
  },

  progress: function () { return this.total ? this.settled / this.total : 1; },

  toggle: function () {
    this.painted = !this.painted;
    this.version++;
  },

  sheet: function (key) {
    if (!this.painted) return null;
    var s = this.sheets[key];
    return s && s.ok ? s : null;
  },

  image: function (key) {
    if (!this.painted) return null;
    var s = this.images[key];
    return s && s.ok ? s.img : null;
  },

  // Draw one frame of a sheet with its pivot at (x, y). Returns false when
  // the painted sheet is unavailable so the caller can draw the fallback.
  drawFrame: function (ctx, key, frameIndex, x, y, flip, scaleMul, alpha) {
    var s = this.sheet(key);
    if (!s) return false;
    var d = s.def;
    var cols = d.cols || 1;
    var sx = (frameIndex % cols) * d.cell[0];
    var sy = Math.floor(frameIndex / cols) * d.cell[1];
    if (sy + d.cell[1] > s.img.naturalHeight) return false;
    var sc = d.scale * (scaleMul || 1);
    var ins = d.inset || 0;     // trims a few source pixels where neighbouring cells bleed in
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(s.img, sx + ins, sy + ins, d.cell[0] - ins * 2, d.cell[1] - ins * 2,
      (ins - d.pivot[0]) * sc, (ins - d.pivot[1]) * sc, (d.cell[0] - ins * 2) * sc, (d.cell[1] - ins * 2) * sc);
    ctx.restore();
    return true;
  },

  // Draw a frame by name (sheets with a "frames" table: props, effects, UI).
  drawNamed: function (ctx, key, name, x, y, scaleMul, flip, alpha, rot) {
    var s = this.sheet(key);
    if (!s || !s.def.frames || s.def.frames[name] === undefined) return false;
    if (!rot) return this.drawFrame(ctx, key, s.def.frames[name], x, y, flip, scaleMul, alpha);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    var ok = this.drawFrame(ctx, key, s.def.frames[name], 0, 0, flip, scaleMul, alpha);
    ctx.restore();
    return ok;
  },

  // Draw a named animation at time t (seconds). frameOverride picks a frame
  // inside the animation directly (used for jump rise/peak/fall).
  drawAnim: function (ctx, key, anim, t, x, y, flip, scaleMul, alpha, frameOverride) {
    var s = this.sheet(key);
    if (!s || !s.def.anims || !s.def.anims[anim]) return false;
    var a = s.def.anims[anim];
    var i;
    if (frameOverride !== undefined) i = Math.min(a.frames.length - 1, frameOverride);
    else i = a.fps ? Math.floor(t * a.fps) % a.frames.length : 0;
    return this.drawFrame(ctx, key, a.frames[i], x, y, flip, scaleMul, alpha);
  },

  // Named tile frame from a tileset (drawn top-left at x, y, 32x32).
  // cropTop: skip that many source pixels at the top of the cell (used for
  // buried tiles in sheets whose ground cells have a grass/metal cap drawn in).
  drawTile: function (ctx, level, name, x, y, w, h, cropTop) {
    var s = this.sheet('tiles-' + level);
    if (!s || s.def.frames[name] === undefined) return false;
    var d = s.def;
    var f = d.frames[name];
    var sx = (f % d.cols) * d.cell[0];
    var sy = Math.floor(f / d.cols) * d.cell[1];
    if (sy + d.cell[1] > s.img.naturalHeight) return false;
    var ct = cropTop || 0;
    ctx.drawImage(s.img, sx, sy + ct, d.cell[0], d.cell[1] - ct, x, y, w || 32, h || 32);
    return true;
  }
};
