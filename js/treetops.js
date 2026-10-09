// Treetop Heights (level 4): swinging vines, bending leaf platforms, bee hives,
// and the treetop enemies (squirrel, caterpillar, bee). Pinecones use the
// falling-object code in entities.js, rope bridges are one-way tiles.

// ---------------------------------------------------------------------------
// Swinging vine "V". The V marks the anchor; the vine hangs 5 tiles down.
// She grabs it automatically by jumping into it and lets go with Jump.
var VINE = {
  LEN: 160,
  AMP: 0.95,        // swing amplitude while she holds on (radians)
  IDLE_AMP: 0.18,
  GRAV: 1400,       // pendulum "gravity" -> period of about 2.1 s
  MIN_GRIP: 64,     // she holds on at least this far down the vine
  RELEASE_UP: 430,
  RELEASE_FWD: 110,
  MAX_VX: 430
};

function Vine(tx, ty) {
  this.ax = tx * TILE + TILE / 2;
  this.ay = ty * TILE;
  this.len = VINE.LEN;
  this.x = this.ax - this.len; this.y = this.ay; this.w = this.len * 2; this.h = this.len + 20;
  this.omega = Math.sqrt(VINE.GRAV / this.len);
  this.phase = (tx % 7) * 0.9;
  this.amp = VINE.IDLE_AMP;
  this.theta = 0;
  this.dtheta = 0;
  this.holder = null;
  this.grip = this.len;
  this.kind = 'vine';
  this.t = 0;
}

Vine.prototype.update = function (dt, world) {
  this.t += dt;
  var want = this.holder ? VINE.AMP : VINE.IDLE_AMP;
  this.amp += (want - this.amp) * Math.min(1, dt * (this.holder ? 1.6 : 0.6));
  this.phase += this.omega * dt;
  this.theta = this.amp * Math.sin(this.phase);
  this.dtheta = this.amp * this.omega * Math.cos(this.phase);
  if (this.holder) return;
  var p = world.player;
  if (p.state !== 'normal' || p.vine || p.vineCd > 0 || p.onGround) return;
  // Grab when her body comes close to the rope (generous, so the swing is
  // easy to catch): distance from her centre to the rope segment.
  var ex = this.ax + Math.sin(this.theta) * this.len, ey = this.ay + Math.cos(this.theta) * this.len;
  var cx = p.x + p.w / 2, cy = p.y + p.h * 0.4;
  var dx = ex - this.ax, dy = ey - this.ay;
  var k = Math.max(0, Math.min(1, ((cx - this.ax) * dx + (cy - this.ay) * dy) / (dx * dx + dy * dy)));
  var qx = this.ax + dx * k, qy = this.ay + dy * k;
  var s = k * this.len;
  if (s > 24 && Math.abs(cx - qx) < p.w / 2 + 26 && Math.abs(cy - qy) < p.h * 0.6 + 10) {
    this.grab(p, Math.max(VINE.MIN_GRIP, Math.min(this.len, s + p.h * 0.3)));
  }
};

Vine.prototype.grab = function (p, grip) {
  this.holder = p;
  this.grip = grip;
  p.vine = this;
  p.jumping = false;
  p.setDuck(false);
  // Keep the swing moving the way she was flying.
  var dir = Math.abs(p.vx) > 20 ? (p.vx > 0 ? 1 : -1) : p.facing;
  this.amp = Math.max(this.amp, Math.min(VINE.AMP, Math.abs(this.theta) + 0.25));
  var s = Math.max(-1, Math.min(1, this.theta / this.amp));
  var ph = Math.asin(s);
  this.phase = dir > 0 ? ph : Math.PI - ph;
  p.vx = 0; p.vy = 0;
  Sound.play('vine');
  p.world.hint('vine', this);
};

// Called from Player.update while she hangs on this vine.
Vine.prototype.updatePlayer = function (p, dt) {
  p.jumpHeld = Input.down('jump');
  if (Input.down('left')) p.facing = -1;
  if (Input.down('right')) p.facing = 1;
  var hx = this.ax + Math.sin(this.theta) * this.grip;
  var hy = this.ay + Math.cos(this.theta) * this.grip;
  var nx = hx - p.w / 2, ny = hy - p.h * 0.3;
  p.vx = (nx - p.x) / Math.max(dt, 1e-4);
  p.vy = (ny - p.y) / Math.max(dt, 1e-4);
  p.x = nx; p.y = ny;
  p.prevBottom = p.y + p.h;
  p.onGround = false;
  p.coyote = 0;
  if (Input.hit('jump')) this.release(p, true);
};

Vine.prototype.tangent = function () {
  var v = this.dtheta * this.grip;
  return { vx: Math.cos(this.theta) * v, vy: -Math.sin(this.theta) * v };
};

Vine.prototype.release = function (p, jump) {
  if (p.vine !== this) return;
  p.vine = null;
  this.holder = null;
  p.vineCd = 0.35;
  if (!jump) { p.vx = 0; p.vy = 0; return; }
  var tv = this.tangent();
  var vx = tv.vx + p.facing * VINE.RELEASE_FWD;
  p.vx = Math.max(-VINE.MAX_VX, Math.min(VINE.MAX_VX, vx));
  p.vy = Math.min(tv.vy, 0) - VINE.RELEASE_UP;
  p.facing = p.vx >= 0 ? 1 : -1;
  p.jumping = true;
  p.momentumT = 0.7;
  p.squash = 1.15;
  Sound.play('jump');
};

// Where she would fly if she let go now (dots for the guide line).
Vine.prototype.predict = function (p, world) {
  var tv = this.tangent();
  var vx = Math.max(-VINE.MAX_VX, Math.min(VINE.MAX_VX, tv.vx + p.facing * VINE.RELEASE_FWD));
  var vy = Math.min(tv.vy, 0) - VINE.RELEASE_UP;
  var x = p.x + p.w / 2, y = p.y + p.h;
  var pts = [];
  var g = PHYS.GRAV * (p.c.longJump ? PHYS.MOM_GRAV : 1);
  for (var i = 0; i < 40; i++) {
    var st = 1 / 30;
    x += vx * st; vy = Math.min(PHYS.MAX_FALL, vy + g * st); y += vy * st;
    if (i % 2 === 0) pts.push([x, y]);
    var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    var c = world.level.get(tx, ty);
    if (vy > 0 && (tileSolid(c) || tileOneWay(c))) { pts.push([x, ty * TILE]); pts.landed = true; break; }
    if (y > world.level.ph) break;
  }
  return pts;
};

Vine.prototype.draw = function (ctx, world) {
  Art.vine(ctx, this.ax, this.ay, this.theta, this.len, world.t);
  if (this.holder && this.holder.state === 'normal') {
    var pts = this.predict(this.holder, world);
    Art.guideDots(ctx, pts, world.t, pts.landed);
  }
};

// ---------------------------------------------------------------------------
// Leaf platform "L": bends down while she stands on it and springs back when
// she leaves. Standing still for 2 s bends it so far that she slides off.
function LeafPlatform(x, y, w) {
  Platform.call(this, x, y + 6, w, 14);
  this.hy = this.y;
  this.bend = 0;
  this.still = 0;
  this.state = 'ok';      // ok | tip
  this.t = 0;
  this.kind = 'leaf';
  this.onIt = false;
}
LeafPlatform.prototype = Object.create(Platform.prototype);
LeafPlatform.prototype.solidNow = function () { return this.state === 'ok'; };
LeafPlatform.prototype.onStand = function (p) {
  this.onIt = true;
  if (Math.abs(p.vx) < 25) this.still += 1 / 60;
  else this.still = Math.max(0, this.still - 1 / 60);
  if (this.still > 0.5) p.world.hint('leaf', this);
};
LeafPlatform.prototype.update = function (dt, world) {
  this.t += dt;
  var p = world.player;
  var standing = p.platform === this && p.onGround;
  if (this.state === 'ok') {
    var target = standing ? 0.45 + Math.min(0.55, this.still / 2 * 0.55) : 0;
    this.bend += (target - this.bend) * Math.min(1, dt * (standing ? 3 : 6));
    if (!standing) this.still = Math.max(0, this.still - dt * 2);
    if (this.still >= 2) {
      this.state = 'tip'; this.t = 0;
      Sound.play('rustle');
      if (standing) { p.onGround = false; p.platform = null; p.vy = 60; p.vx = (p.x + p.w / 2 < this.x + this.w / 2 ? -1 : 1) * 120; }
    }
  } else {
    this.bend = Math.min(1.6, this.bend + dt * 4);
    if (this.t > 1.2) { this.state = 'ok'; this.still = 0; this.bend = 0.6; }
  }
  var ny = this.hy + this.bend * 9;
  this.dy = ny - this.y; this.dx = 0;
  this.y = ny;
};
LeafPlatform.prototype.draw = function (ctx, world) {
  var shake = this.still > 1.3 && this.state === 'ok' ? Math.sin(world.t * 50) * 1.2 : 0;
  Art.leafPlatform(ctx, this.x + shake, this.hy, this.w, this.bend, this.state === 'tip');
};

// ---------------------------------------------------------------------------
// Bee hive "Y": hangs below a branch; two bees buzz in a figure-eight.
function BeeHive(tx, ty, world) {
  this.x = tx * TILE + 2; this.y = ty * TILE; this.w = 28; this.h = 30;
  this.cx = tx * TILE + 16; this.cy = ty * TILE + 18;
  this.t = Math.random() * 3;
  this.kind = 'hive';
  for (var i = 0; i < 2; i++) {
    var b = EnemyTypes.bee(this.cx, this.cy, world, this, i * Math.PI);
    b.ctor = EnemyTypes.bee;
    world.enemies.push(b);
  }
}
BeeHive.prototype.update = function (dt) { this.t += dt; };
BeeHive.prototype.draw = function (ctx, world) { Art.hive(ctx, this.cx, this.y, world.t); };

// ---------------------------------------------------------------------------
// Treetop enemies

// Squirrel: runs along branches and sometimes jumps to the next branch.
EnemyTypes.squirrel = function (x, y) {
  var e = new Enemy('squirrel', x + 3, y + 32 - 24, 26, 24);
  e.pause = 0;
  e.update = function (dt, world) {
    this.t += dt;
    var level = world.level;
    if (this.pause > 0) { this.pause -= dt; this.vx = 0; this.gravity(dt, world); return; }
    this.vx = this.dir * 88;
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAX_FALL);
    var res = level.moveBody(this, dt, { platforms: world.platforms });
    if (res.wallL) this.dir = 1;
    if (res.wallR) this.dir = -1;
    if (this.onGround) {
      var fx = this.dir > 0 ? this.x + this.w + 4 : this.x - 4;
      if (!level.groundAt(fx, this.y + this.h + 4)) {
        var land = false;
        for (var k = 1; k <= 3; k++) if (level.groundAt(fx + this.dir * k * TILE, this.y + this.h + 4)) land = true;
        if (land && Math.random() < 0.6) this.vy = -560;
        else { this.dir = -this.dir; this.pause = 0.35; }
      }
    }
    if (this.y > level.ph + 64) this.dead = true;
  };
  return e;
};

// Caterpillar: crawls slowly along branches.
EnemyTypes.caterpillar = function (x, y) {
  var e = new Enemy('caterpillar', x + 1, y + 32 - 16, 30, 16);
  e.update = function (dt, world) {
    this.t += dt;
    this.walk(dt, world, 24, true);
  };
  return e;
};

// Bee: figure-eight around its hive. Can't be stomped.
EnemyTypes.bee = function (cx, cy, world, hive, phase) {
  var e = new Enemy('bee', cx - 11, cy - 9, 22, 18);
  e.stompable = false;
  e.flying = true;
  e.hcx = cx; e.hcy = cy;
  e.ph = phase || 0;
  e.update = function (dt) {
    this.t += dt;
    var a = this.t * 1.7 + this.ph;
    var nx = this.hcx + Math.sin(a) * 74 - this.w / 2;
    this.dir = nx > this.x ? 1 : -1;
    this.x = nx;
    this.y = this.hcy + Math.sin(a * 2) * 26 - this.h / 2 + 8;
  };
  return e;
};
