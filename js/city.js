// Cement City (level 10): roads with crosswalks and pedestrian lights, cars,
// buses and cement trucks, manholes, crane girders and the city enemies.
// Wet cement is a zone ("x", see player.js); cement bags reuse Stalactite.

// ---------------------------------------------------------------------------
// A road: a run of road "_" / crosswalk "Z" tiles in the street surface.
// Its pedestrian light cycles red (cars drive) -> clearing (red, last cars
// leave) -> green (road empty, 4 s) -> flashing green (1.5 s, fast beeps).
// Cars only drive inside the road, never on the pavement.
var TRAFFIC = { RED: 3.6, GREEN: 4.0, FLASH: 1.5, SPEED: [330, 380, 430] };

function Road(tx0, tx1, ty, index) {
  this.x0 = tx0 * TILE; this.x1 = (tx1 + 1) * TILE;
  this.x = this.x0 - 40; this.w = this.x1 - this.x0 + 80;
  this.surfY = ty * TILE;
  this.y = this.surfY - 120; this.h = 120;
  this.dir = index % 2 ? 1 : -1;           // which way the traffic drives
  this.light = 'red';
  this.lt = 1.5 + (index % 3) * 0.9;      // stagger the roads a little
  this.cars = [];
  this.spawnT = 0.2;
  this.beepT = 0;
  this.kind = 'road';
  this.carIdx = index;
}
Road.prototype.update = function (dt, world) {
  this.lt += dt;
  var p = world.player;
  var near = world.camera.visible(this.x0, this.surfY - 200, this.x1 - this.x0, 200, 300);
  if (this.light === 'red') {
    if (this.lt > TRAFFIC.RED) { this.light = 'clearing'; this.lt = 0; }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = 1.0 + Math.random() * 0.8;
      this.spawnCar();
    }
  } else if (this.light === 'clearing') {
    if (!this.cars.length) { this.light = 'green'; this.lt = 0; if (near) Sound.play('walk'); }
  } else if (this.light === 'green') {
    if (this.lt > TRAFFIC.GREEN) { this.light = 'flash'; this.lt = 0; }
  } else if (this.light === 'flash') {
    this.beepT -= dt;
    if (this.beepT <= 0 && near) { this.beepT = 0.18; Sound.play('beep'); }
    if (this.lt > TRAFFIC.FLASH) { this.light = 'red'; this.lt = 0; this.spawnT = 0.6; }
  }
  for (var i = this.cars.length - 1; i >= 0; i--) {
    var c = this.cars[i];
    c.x += c.vx * dt;
    c.t += dt;
    if ((c.vx < 0 && c.x + c.w < this.x0 - 4) || (c.vx > 0 && c.x > this.x1 + 4)) { this.cars.splice(i, 1); continue; }
    if (p.state === 'normal' && overlapsPlayer({ x: Math.max(c.x + 6, this.x0), y: c.y + 8, w: Math.min(c.x + c.w - 6, this.x1) - Math.max(c.x + 6, this.x0), h: c.h - 8 }, p)) {
      p.hurt('car');
    }
  }
  if (near) world.hint('road', this);
};
Road.prototype.spawnCar = function () {
  var kinds = ['car', 'car', 'bus', 'truck'];
  var k = kinds[(this.carIdx++) % kinds.length];
  var w = k === 'car' ? 104 : k === 'bus' ? 124 : 118;
  var h = k === 'car' ? 44 : 58;
  var speed = TRAFFIC.SPEED[this.carIdx % 3] * (k === 'car' ? 1 : 0.85);
  var x = this.dir < 0 ? this.x1 + 2 : this.x0 - w - 2;
  this.cars.push({ kind: k, x: x, y: this.surfY - h, w: w, h: h, vx: this.dir * speed, t: 0 });
};
Road.prototype.safe = function () { return this.light === 'green' || this.light === 'flash'; };
Road.prototype.drawBack = function (ctx, world) {
  Art.trafficLight(ctx, this.x0 - 14, this.surfY, this.light, world.t, -1);
  Art.trafficLight(ctx, this.x1 + 14, this.surfY, this.light, world.t, 1);
};
Road.prototype.draw = function (ctx, world) {
  this.drawBack(ctx, world);
  if (!this.cars.length) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(this.x0, this.surfY - 140, this.x1 - this.x0, 150); ctx.clip();
  for (var i = 0; i < this.cars.length; i++) Art.vehicle(ctx, this.cars[i], world.t);
  ctx.restore();
};

// ---------------------------------------------------------------------------
// Manhole "O" (placed on the pavement): pops up every few seconds with a puff
// of steam. Standing on it launches her like a spring; touching the rising
// cover from the side is a hit.
function Manhole(tx, ty) {
  this.x = tx * TILE; this.w = TILE;
  this.floorY = (ty + 1) * TILE;
  this.y = this.floorY - 8; this.h = 8;
  this.t = (tx * 0.53) % 3.2;
  this.rise = 0;
  this.kind = 'manhole';
}
Manhole.prototype.update = function (dt, world) {
  var before = this.t;
  this.t = (this.t + dt) % 3.2;
  var c = this.t;
  // 0-2.3 idle, 2.3-2.9 steam warning, 2.9-3.05 pop up, 3.05-3.2 drop back
  if (c > 2.3 && c < 2.9 && Math.random() < dt * 14) FX.smoke(this.x + 16, this.floorY - 6, 1);
  var r = c < 2.9 ? 0 : c < 3.05 ? (c - 2.9) / 0.15 : 1 - (c - 3.05) / 0.15;
  this.rise = Math.max(0, r);
  var p = world.player;
  var popping = before < 2.9 && c >= 2.9;
  var top = this.floorY - this.rise * 44 - 6;
  var cx = p.x + p.w / 2;
  if (p.state === 'normal' && world.camera.visible(this.x, this.floorY - 60, 32, 60, 0)) world.hint('manhole', this);
  if (popping && p.state === 'normal' && p.onGround && cx > this.x - 6 && cx < this.x + this.w + 6 && Math.abs(p.y + p.h - this.floorY) < 3) {
    p.vy = -p.springV(2.4); p.onGround = false; p.jumping = false; p.y -= 2;
    Sound.play('spring');
    FX.smoke(this.x + 16, this.floorY - 6, 6);
    return;
  }
  if (this.rise > 0.2 && p.state === 'normal' && p.vy <= 0 &&
      overlapsPlayer({ x: this.x + 2, y: top, w: this.w - 4, h: this.floorY - top }, p, 3) && p.y + p.h > top + 6) {
    p.hurt('manhole');
  }
};
Manhole.prototype.draw = function (ctx, world) { Art.manhole(ctx, this.x + 16, this.floorY, this.rise, this.t > 2.3 && this.t < 2.9, world.t); };

// ---------------------------------------------------------------------------
// Crane girder "G": hangs from a crane; swings sideways or moves up and down.
function Girder(x, y, w, tx) {
  Platform.call(this, x, y + 6, w, 16);
  this.hx = this.x; this.hy = this.y;
  this.vertical = tx % 2 === 1;
  this.range = this.vertical ? 56 : 64;
  this.period = this.vertical ? 4.0 : 4.6;
  this.t = (tx % 4) * 0.6;
  this.kind = 'girder';
}
Girder.prototype = Object.create(Platform.prototype);
Girder.prototype.update = function (dt) {
  this.t += dt;
  var o = Math.sin(this.t * Math.PI * 2 / this.period) * this.range;
  var nx = this.vertical ? this.hx : this.hx + o;
  var ny = this.vertical ? this.hy + o : this.hy;
  this.dx = nx - this.x; this.dy = ny - this.y;
  this.x = nx; this.y = ny;
};
Girder.prototype.draw = function (ctx, world) { Art.girder(ctx, this.x, this.y, this.w, world.camera.y); };

// ---------------------------------------------------------------------------
// City enemies

// City pigeon: sits on a ledge, then flutters down at her in a curve.
EnemyTypes.pigeon = function (x, y) {
  var e = new Enemy('pigeon', x + 4, y + 32 - 20, 24, 20);
  e.flying = true;
  e.phase = 'sit';
  e.pt = 0;
  e.hx = e.x; e.hy = e.y;
  e.update = function (dt, world) {
    this.t += dt;
    this.pt += dt;
    var p = world.player;
    var dx = p.x + p.w / 2 - this.cx();
    if (this.phase === 'sit') {
      this.dir = dx < 0 ? -1 : 1;
      if (Math.abs(dx) < 230 && p.state === 'normal' && this.pt > 0.8) {
        this.phase = 'warn'; this.pt = 0; Sound.play('flap');
      }
    } else if (this.phase === 'warn') {
      this.y = this.hy - Math.min(10, this.pt * 30);
      if (this.pt > 0.45) {
        this.phase = 'dive'; this.pt = 0;
        this.sx = this.x; this.sy = this.y;
        this.tx = p.x + p.w / 2 - this.w / 2 + p.vx * 0.35;
        this.ty = p.y + p.h * 0.35;
      }
    } else if (this.phase === 'dive') {
      var f = Math.min(1, this.pt / 1.0);
      // quadratic curve: drops down, then swoops past
      // control point chosen so the middle of the curve passes her position
      var ex = this.tx + (this.tx - this.sx) * 0.8, ey = this.sy - 40;
      var mx = 2 * this.tx - 0.5 * (this.sx + ex), my = 2 * this.ty - 0.5 * (this.sy + ey);
      var u = 1 - f;
      this.x = u * u * this.sx + 2 * u * f * mx + f * f * ex;
      this.y = u * u * this.sy + 2 * u * f * my + f * f * ey;
      this.dir = ex > this.sx ? 1 : -1;
      if (f >= 1) { this.phase = 'away'; this.pt = 0; }
    } else if (this.phase === 'away') {
      this.y -= 90 * dt; this.x += this.dir * 120 * dt;
      if (this.pt > 3) this.dead = true;
    }
  };
  return e;
};

// Hopping traffic cone: hops toward her in short jumps.
EnemyTypes.cone = function (x, y) {
  var e = new Enemy('cone', x + 4, y + 32 - 28, 24, 28);
  e.hopT = 0.5 + Math.random() * 0.6;
  e.update = function (dt, world) {
    this.t += dt;
    var p = world.player;
    if (this.onGround) {
      this.vx = 0;
      this.hopT -= dt;
      if (this.hopT <= 0) {
        this.dir = p.x < this.x ? -1 : 1;
        this.vy = -330; this.vx = this.dir * 110;
        this.hopT = 0.75;
        this.onGround = false;
      }
    }
    var res = this.gravity(dt, world);
    if (res.wallL || res.wallR) this.vx = 0;
  };
  return e;
};

// Runaway shopping cart: rolls fast along the pavement and bounces off walls.
EnemyTypes.cart = function (x, y) {
  var e = new Enemy('cart', x + 1, y + 32 - 26, 30, 26);
  e.stompable = false;
  e.dir = -1;
  e.update = function (dt, world) {
    this.t += dt;
    this.vx = this.dir * 190;
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAX_FALL);
    var res = world.level.moveBody(this, dt, { platforms: world.platforms });
    if (res.wallL) { this.dir = 1; Sound.play('bump'); }
    if (res.wallR) { this.dir = -1; Sound.play('bump'); }
    if (this.y > world.level.ph + 64) this.dead = true;
  };
  return e;
};

// Pebble friend: a small hopping cement block (Brutus Block's helpers).
EnemyTypes.pebble = function (x, y) {
  var e = new Enemy('pebble', x + 4, y + 32 - 22, 24, 22);
  e.hopT = 0.4;
  e.update = function (dt, world) {
    this.t += dt;
    var p = world.player;
    if (this.onGround) {
      this.vx = 0;
      this.hopT -= dt;
      if (this.hopT <= 0) {
        this.dir = p.x < this.x ? -1 : 1;
        this.vy = -360; this.vx = this.dir * 120;
        this.hopT = 0.6;
        this.onGround = false;
      }
    }
    var res = this.gravity(dt, world);
    if (res.wallL || res.wallR) { this.vx = -this.vx; this.dir = -this.dir; }
  };
  return e;
};
