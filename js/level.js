// ASCII level parsing, tile collision and the camera.
var TILE = 32;
var VIEW_W = 960;
var VIEW_H = 540;

// Tile codes stored in the grid.
var T = {
  EMPTY: 0, GROUND: 1, BOX: 2, QCOIN: 3, QCARROT: 4, QCANDY: 5, CRACKED: 6, USED: 7,
  THIN: 8,        // one-way: thin cloud "~" or rope bridge "_"
  WALL: 9,        // boss arena wall
  RAINBOW: 10,    // rainbow bridge ":" (solid)
  PLANK: 11,      // sunken ship planks "H" (solid)
  ROPE: 12,       // rope bridge "_" (one-way, drawn as planks; "H" in the treetops)
  ROAD: 13,       // city road "_" (solid, cars drive on top)
  CROSS: 14       // city crosswalk "Z" (solid road with zebra stripes)
};

// Art/theme ids. Stable numbers (also used as save keys), independent of the
// order the levels are played in. 1-7 are the original worlds.
var TH = { MEADOW: 1, CAVES: 2, FOREST: 3, CLOUD: 4, SNOW: 5, REEF: 6, DESERT: 7, TREETOP: 8, SPACE: 9, CITY: 10 };

// Zone flags (a second grid layer, non-solid areas with effects).
var Z = { WIND: 1, CUR_L: 2, CUR_R: 4, QUICK: 8, DARK: 16, SPACEWALK: 32, CEMENT: 64, METEOR: 128 };

function tileSolid(code) {
  return code === T.GROUND || (code >= T.BOX && code <= T.USED) || code === T.WALL ||
    code === T.RAINBOW || code === T.PLANK || code === T.ROAD || code === T.CROSS;
}
function tileOneWay(code) { return code === T.THIN || code === T.ROPE; }
function tileIsBox(code) { return code >= T.BOX && code <= T.USED; }

function Level(def, index) {
  this.def = def;
  this.index = index;           // 1..10, play order
  this.theme = def.theme || index;   // art / save id (see TH)
  var rows = def.map;
  this.h = rows.length;
  var w = 0;
  for (var i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
  this.w = w;
  this.pw = w * TILE;
  this.ph = this.h * TILE;
  this.grid = new Uint8Array(w * this.h);
  this.zone = new Uint8Array(w * this.h);
  this.spawns = [];
  this.decor = [];
  this.bossCol = -1;
  this.start = { tx: 2, ty: this.h - 4 };
  this.underwater = !!def.underwater;
  this.lowGravity = !!def.lowGravity;
  this.waterTop = def.underwater ? (def.waterTop !== undefined ? def.waterTop : 2) * TILE : 0;
  this.boxHome = {};  // "tx,ty" -> original code, used to refill boxes on respawn

  for (var y = 0; y < this.h; y++) {
    var row = rows[y];
    for (var x = 0; x < w; x++) {
      var ch = x < row.length ? row[x] : '.';
      this.parseChar(ch, x, y);
    }
  }
  this.computeLooks();
}

function groundLike(c) { return c === T.GROUND || c === T.PLANK || c === T.ROAD || c === T.CROSS; }

Level.prototype.idx = function (tx, ty) { return ty * this.w + tx; };

Level.prototype.parseChar = function (ch, x, y) {
  var i = this.idx(x, y);
  switch (ch) {
    case '#': this.grid[i] = T.GROUND; break;
    case 'B': this.grid[i] = T.BOX; break;
    case '?': this.grid[i] = T.QCOIN; this.boxHome[x + ',' + y] = T.QCOIN; break;
    case 'C': this.grid[i] = T.QCARROT; this.boxHome[x + ',' + y] = T.QCARROT; break;
    case 'D': this.grid[i] = T.QCANDY; this.boxHome[x + ',' + y] = T.QCANDY; break;
    case 'X': this.grid[i] = T.CRACKED; break;
    case '~': this.grid[i] = T.THIN; break;
    case '_': this.grid[i] = this.theme === TH.CITY ? T.ROAD : T.ROPE; break;
    case 'Z':
      if (this.theme === TH.CITY) this.grid[i] = T.CROSS;
      else this.spawns.push({ ch: ch, tx: x, ty: y });
      break;
    case ':': this.grid[i] = T.RAINBOW; break;
    case 'H': this.grid[i] = this.theme === TH.TREETOP ? T.ROPE : T.PLANK; break;
    case '$': this.zone[i] |= Z.SPACEWALK; break;
    case 'x':
      if (this.theme === TH.CITY) this.zone[i] |= Z.CEMENT;
      else this.spawns.push({ ch: ch, tx: x, ty: y });
      break;
    case 'M':
      if (this.theme === TH.SPACE) { this.zone[i] |= Z.METEOR; this.spawns.push({ ch: ch, tx: x, ty: y }); }
      break;
    case 'W': this.zone[i] |= Z.WIND; break;
    case '<': this.zone[i] |= Z.CUR_L; break;
    case '>': this.zone[i] |= Z.CUR_R; break;
    case 'q': this.zone[i] |= Z.QUICK; break;
    case '%': this.decor.push({ tx: x, ty: y }); break;
    case 'P': this.start = { tx: x, ty: y }; break;
    case 'K': this.bossCol = x; break;
    case '.': case ' ': break;
    default:
      this.spawns.push({ ch: ch, tx: x, ty: y });
  }
  // Dark tunnels (level 2) are marked with a def option list of column ranges.
};

Level.prototype.get = function (tx, ty) {
  if (tx < 0 || tx >= this.w) return T.WALL;
  if (ty < 0 || ty >= this.h) return T.EMPTY;
  return this.grid[ty * this.w + tx];
};

Level.prototype.set = function (tx, ty, code) {
  if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return;
  this.grid[ty * this.w + tx] = code;
  this.lookDirty = true;
  this.computeLookAt(tx, ty);
  this.computeLookAt(tx, ty + 1);
  this.computeLookAt(tx - 1, ty);
  this.computeLookAt(tx + 1, ty);
};

Level.prototype.zoneAt = function (tx, ty) {
  if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return 0;
  return this.zone[ty * this.w + tx];
};

Level.prototype.zoneAtPx = function (px, py) {
  return this.zoneAt(Math.floor(px / TILE), Math.floor(py / TILE));
};

Level.prototype.solid = function (tx, ty) { return tileSolid(this.get(tx, ty)); };

// Does a pixel rectangle touch any solid tile?
Level.prototype.rectSolid = function (x, y, w, h) {
  var x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
  var y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.01) / TILE);
  for (var ty = y0; ty <= y1; ty++)
    for (var tx = x0; tx <= x1; tx++)
      if (this.solid(tx, ty)) return true;
  return false;
};

// Neighbour-aware "look" per ground tile: top edge, hanging moss etc.
// Bits: 1 = open above, 2 = open left, 4 = open right, 8 = open below
Level.prototype.computeLooks = function () {
  this.look = new Uint8Array(this.w * this.h);
  for (var y = 0; y < this.h; y++)
    for (var x = 0; x < this.w; x++) this.computeLookAt(x, y);
};

Level.prototype.computeLookAt = function (x, y) {
  if (!this.look || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
  var c = this.grid[y * this.w + x];
  var v = 0;
  if (c === T.GROUND || c === T.PLANK) {
    var up = y > 0 ? this.grid[(y - 1) * this.w + x] : T.EMPTY;
    if (!groundLike(up)) v |= 1;
    var l = x > 0 ? this.grid[y * this.w + x - 1] : T.GROUND;
    var r = x < this.w - 1 ? this.grid[y * this.w + x + 1] : T.GROUND;
    var dn = y < this.h - 1 ? this.grid[(y + 1) * this.w + x] : T.GROUND;
    if (!groundLike(l)) v |= 2;
    if (!groundLike(r)) v |= 4;
    if (!groundLike(dn)) v |= 8;
  }
  this.look[y * this.w + x] = v;
};

// ---------------------------------------------------------------------------
// Body movement with tile collision.
// body: { x, y, w, h, vx, vy } (x, y = top-left). Sets body.onGround.
// opts: { oneWay: bool (default true), dropThrough: bool, platforms: array,
//         quickSolid: bool (treat quicksand as ground, for enemies) }
// Returns { wallL, wallR, head: {tx, ty} | null, landed, platform }
Level.prototype.moveBody = function (b, dt, opts) {
  opts = opts || {};
  var res = { wallL: false, wallR: false, head: null, landed: false, platform: null, ceiling: false };
  var i, tx, ty;

  // Horizontal
  var dx = b.vx * dt;
  if (dx !== 0) {
    b.x += dx;
    var y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h - 0.01) / TILE);
    if (dx > 0) {
      tx = Math.floor((b.x + b.w - 0.01) / TILE);
      for (ty = y0; ty <= y1; ty++) {
        if (this.solid(tx, ty)) { b.x = tx * TILE - b.w; res.wallR = true; break; }
      }
    } else {
      tx = Math.floor(b.x / TILE);
      for (ty = y0; ty <= y1; ty++) {
        if (this.solid(tx, ty)) { b.x = (tx + 1) * TILE; res.wallL = true; break; }
      }
    }
    if (res.wallL || res.wallR) b.vx = 0;
  }

  // Vertical
  var prevBottom = b.y + b.h;
  var dy = b.vy * dt;
  b.y += dy;
  var wasGround = b.onGround;
  b.onGround = false;
  var x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w - 0.01) / TILE);
  if (dy > 0) {
    ty = Math.floor((b.y + b.h - 0.01) / TILE);
    var land = false;
    for (tx = x0; tx <= x1; tx++) {
      var c = this.get(tx, ty);
      if (tileSolid(c)) { land = true; break; }
      if (opts.oneWay !== false && tileOneWay(c) && !opts.dropThrough && prevBottom <= ty * TILE + 0.5) { land = true; break; }
      if (opts.quickSolid && (this.zoneAt(tx, ty) & Z.QUICK) && prevBottom <= ty * TILE + 0.5) { land = true; break; }
    }
    if (land) {
      b.y = ty * TILE - b.h;
      b.vy = 0;
      b.onGround = true;
      res.landed = !wasGround;
    }
  } else if (dy < 0) {
    ty = Math.floor(b.y / TILE);
    var best = null, bestD = 1e9;
    var cx = b.x + b.w / 2;
    for (tx = x0; tx <= x1; tx++) {
      if (this.solid(tx, ty)) {
        var d = Math.abs(tx * TILE + TILE / 2 - cx);
        if (d < bestD) { bestD = d; best = { tx: tx, ty: ty }; }
      }
    }
    if (best) {
      b.y = (ty + 1) * TILE;
      b.vy = 0;
      res.head = best;
      res.ceiling = true;
    }
  }

  // Moving / special platforms (one-way from above)
  var plats = opts.platforms;
  if (plats && b.vy >= 0) {
    for (i = 0; i < plats.length; i++) {
      var p = plats[i];
      if (!p.solidNow()) continue;
      if (b.x + b.w <= p.x + 1 || b.x >= p.x + p.w - 1) continue;
      var prevTop = p.y - (p.dy || 0);
      if (prevBottom <= prevTop + 1.5 && b.y + b.h >= p.y - 0.5) {
        b.y = p.y - b.h;
        b.vy = 0;
        b.onGround = true;
        res.platform = p;
        res.landed = !wasGround;
      }
    }
  }
  return res;
};

// Is there ground under a point just below (px, py)? Used by walking enemies.
Level.prototype.groundAt = function (px, py, quick) {
  var tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  var c = this.get(tx, ty);
  if (tileSolid(c) || tileOneWay(c)) return true;
  if (quick && (this.zoneAt(tx, ty) & Z.QUICK)) return true;
  return false;
};

// ---------------------------------------------------------------------------
function Camera(level) {
  this.level = level;
  this.x = 0;
  this.y = Math.max(0, level.ph - VIEW_H);
  this.lock = null;       // { x } when a boss arena has locked the view
  this.shake = 0;
  this.shakeX = 0;
  this.shakeY = 0;
  this.look = 0;
}

Camera.prototype.follow = function (p, dt, snap) {
  var lv = this.level;
  var tx;
  if (this.lock) {
    tx = this.lock.x;
  } else {
    // A little look-ahead in the facing direction so the next jump is visible.
    var want = p.facing * 90;
    this.look += (want - this.look) * Math.min(1, dt * 2.5);
    tx = p.x + p.w / 2 - VIEW_W * 0.42 + this.look;
    tx = Math.max(0, Math.min(lv.pw - VIEW_W, tx));
  }
  if (snap) this.x = tx;
  else this.x += (tx - this.x) * Math.min(1, dt * (this.lock ? 4 : 9));
  // Vertical: levels are mostly one screen tall; follow if taller.
  var ty;
  if (lv.ph <= VIEW_H + 8) ty = lv.ph - VIEW_H;
  else {
    ty = p.y + p.h / 2 - VIEW_H * 0.55;
    ty = Math.max(0, Math.min(lv.ph - VIEW_H, ty));
  }
  if (snap) this.y = ty;
  else this.y += (ty - this.y) * Math.min(1, dt * 6);
  if (!Quality.shake) this.shake = 0;
  if (this.shake > 0) {
    this.shake = Math.max(0, this.shake - dt);
    var m = Math.min(1, this.shake * 3) * 5;
    this.shakeX = (Math.random() * 2 - 1) * m;
    this.shakeY = (Math.random() * 2 - 1) * m;
  } else { this.shakeX = 0; this.shakeY = 0; }
};

Camera.prototype.visible = function (x, y, w, h, margin) {
  margin = margin || 0;
  return x + w >= this.x - margin && x <= this.x + VIEW_W + margin &&
    y + h >= this.y - margin && y <= this.y + VIEW_H + margin;
};

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
