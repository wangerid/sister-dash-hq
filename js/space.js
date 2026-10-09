// Starlight Station (level 8): drifting asteroids, laser gates, boost pads,
// meteor showers, gravity wells and the space enemies. Low gravity itself
// lives in Player.env() (player.js); space-walk zones are marked with "$".

// ---------------------------------------------------------------------------
// Floating asteroid "@": a drifting platform. Even columns drift sideways,
// odd columns bob up and down. Some spin slowly (only visually).
function Asteroid(x, y, w, tx) {
  Platform.call(this, x, y + 4, w, 22);
  this.hx = this.x; this.hy = this.y;
  this.vertical = tx % 2 === 1;
  this.range = this.vertical ? 48 : 56;
  this.period = this.vertical ? 4.6 : 5.4;
  this.t = (tx % 5) * 0.8;
  this.spin = tx % 3 === 0;
  this.kind = 'asteroid';
  this.seed = tx;
}
Asteroid.prototype = Object.create(Platform.prototype);
Asteroid.prototype.update = function (dt) {
  this.t += dt;
  var o = Math.sin(this.t * Math.PI * 2 / this.period) * this.range;
  var nx = this.vertical ? this.hx : this.hx + o;
  var ny = this.vertical ? this.hy + o : this.hy + Math.sin(this.t * 1.3) * 3;
  this.dx = nx - this.x; this.dy = ny - this.y;
  this.x = nx; this.y = ny;
};
Asteroid.prototype.draw = function (ctx, world) {
  Art.asteroid(ctx, this.x, this.y, this.w, this.spin ? Math.sin(world.t * 0.8 + this.seed) * 0.06 : 0, this.seed);
};

// ---------------------------------------------------------------------------
// Laser gate "!": a beam across the corridor, top to bottom of the open
// space at that column. On 2 s, off 2 s, flickers for 0.5 s before it turns on.
function LaserGate(tx, ty, level) {
  var top = ty, bot = ty;
  while (top > 0 && !level.solid(tx, top - 1)) top--;
  while (bot < level.h - 1 && !level.solid(tx, bot + 1)) bot++;
  this.x = tx * TILE + 11; this.w = 10;
  this.y = top * TILE; this.h = (bot + 1) * TILE - this.y;
  this.t = (tx * 0.37) % 4;
  this.kind = 'laser';
}
LaserGate.prototype.phase = function () {
  var c = this.t % 4;
  if (c < 2) return 'on';
  if (c > 3.5) return 'warn';
  return 'off';
};
LaserGate.prototype.update = function (dt, world) {
  var before = this.phase();
  this.t += dt;
  var ph = this.phase();
  var p = world.player;
  if (ph === 'on' && before !== 'on' && world.camera.visible(this.x, this.y, this.w, this.h, 0)) Sound.play('laser');
  if (ph === 'on' && p.state === 'normal' && overlapsPlayer(this, p, 2)) p.hurt('laser');
  if (world.camera.visible(this.x, this.y, this.w, this.h, -60)) world.hint('laser', this);
};
LaserGate.prototype.draw = function (ctx, world) {
  Art.laser(ctx, this.x + this.w / 2, this.y, this.h, this.phase(), world.t);
};

// ---------------------------------------------------------------------------
// Boost pad "I": glowing pad on the floor that launches her high, like a spring.
function BoostPad(tx, ty) {
  this.x = tx * TILE; this.w = TILE; this.y = (ty + 1) * TILE - 10; this.h = 10;
  this.floorY = (ty + 1) * TILE;
  this.t = 0;
  this.glow = 0;
  this.kind = 'boost';
}
BoostPad.prototype.update = function (dt, world) {
  this.t += dt;
  this.glow = Math.max(0, this.glow - dt * 2);
  var p = world.player;
  var cx = p.x + p.w / 2;
  if (p.state === 'normal' && p.onGround && !p.vine && cx > this.x - 2 && cx < this.x + this.w + 2 &&
      Math.abs(p.y + p.h - this.floorY) < 3) {
    p.vy = -p.springV(2);
    p.onGround = false; p.jumping = false; p.y -= 2;
    this.glow = 1;
    Sound.play('spring');
    FX.sparkle(cx, this.floorY, 8, '#7FE8FF');
  }
};
BoostPad.prototype.draw = function (ctx, world) { Art.boostPad(ctx, this.x, this.floorY, this.w, world.t, this.glow); };

// ---------------------------------------------------------------------------
// Meteor shower "M": while she is inside the zone, meteors fall at an angle.
// A red glow and a target mark show where each lands, 1 s before.
function MeteorShower(x0, x1) {
  this.x = x0; this.w = x1 - x0; this.y = 0; this.h = 1;
  this.next = 0.8;
  this.meteors = [];
  this.kind = 'meteors';
}
MeteorShower.prototype.update = function (dt, world) {
  var p = world.player;
  var cx = p.x + p.w / 2;
  var inside = cx > this.x - 60 && cx < this.x + this.w && p.state === 'normal';
  if (inside) {
    world.hint('meteor', this);
    this.next -= dt;
    if (this.next <= 0) {
      this.next = 1.3 + Math.random() * 0.7;
      var tx = cx + (Math.random() * 260 - 60) + p.vx * 0.4;
      tx = Math.max(this.x + 10, Math.min(this.x + this.w - 10, tx));
      this.meteors.push({ tx: tx, gy: world.groundBelow(tx, p.y - 40), t: 0, done: false });
    }
  }
  for (var i = this.meteors.length - 1; i >= 0; i--) {
    var m = this.meteors[i];
    m.t += dt;
    if (m.t >= 1.0 && !m.done) {
      m.done = true;
      FX.debris(m.tx - 16, m.gy - 20, '#8A6A58');
      FX.poof(m.tx, m.gy - 6, 6, 'rgba(255,170,90,');
      Sound.play('bump');
      world.camera.shake = Math.max(world.camera.shake, 0.12);
    }
    // The meteor itself (last 0.45 s) and the impact hurt.
    if (m.t > 0.55 && m.t < 1.12 && p.state === 'normal') {
      var pos = this.meteorPos(m);
      var r = m.t >= 1.0 ? 22 : 12;
      if (cx > pos.x - r - p.w / 2 && cx < pos.x + r + p.w / 2 && p.y < pos.y + r && p.y + p.h > pos.y - r) p.hurt('meteor');
    }
    if (m.t > 1.3) this.meteors.splice(i, 1);
  }
};
MeteorShower.prototype.meteorPos = function (m) {
  var f = Math.max(0, Math.min(1, (m.t - 0.55) / 0.45));
  return { x: m.tx + (1 - f) * 220, y: m.gy - 12 - (1 - f) * 420 };
};
MeteorShower.prototype.draw = function (ctx, world) {
  for (var i = 0; i < this.meteors.length; i++) {
    var m = this.meteors[i];
    if (m.t < 1.0) Art.meteorTarget(ctx, m.tx, m.gy, m.t, world.t);
    if (m.t > 0.55 && m.t < 1.0) {
      var pos = this.meteorPos(m);
      Art.meteor(ctx, pos.x, pos.y, world.t);
    }
  }
};

// ---------------------------------------------------------------------------
// Gravity well "&": a small swirling purple hole that gently pulls her in.
// Touching the middle costs a life, but the pull is weak enough to escape.
function GravityWell(tx, ty) {
  this.cx = tx * TILE + 16; this.cy = ty * TILE + 16;
  this.x = this.cx - 120; this.y = this.cy - 120; this.w = 240; this.h = 240;
  this.R = 118; this.CORE = 13;
  this.t = Math.random() * 5;
  this.kind = 'well';
}
GravityWell.prototype.update = function (dt, world) {
  this.t += dt;
  var p = world.player;
  if (p.state !== 'normal' || p.vine) return;
  var dx = this.cx - (p.x + p.w / 2), dy = this.cy - (p.y + p.h / 2);
  var d = Math.hypot(dx, dy);
  if (d < this.R) {
    world.hint('well', this);
    var f = 330 * (1 - d / this.R) + 60;
    p.vx += dx / (d || 1) * f * dt;
    if (!p.onGround || dy < 0) p.vy += dy / (d || 1) * f * dt;
  }
  if (Math.abs(dx) < this.CORE + p.w * 0.3 && Math.abs(dy) < this.CORE + p.h * 0.3) p.die('well');
};
GravityWell.prototype.draw = function (ctx, world) { Art.gravityWell(ctx, this.cx, this.cy, world.t + this.t); };

// ---------------------------------------------------------------------------
// Space enemies

// Blob alien: bounces in high, slow hops toward the player.
EnemyTypes.blob = function (x, y) {
  var e = new Enemy('blob', x + 3, y + 32 - 24, 26, 24);
  e.hopT = 0.6 + Math.random();
  e.update = function (dt, world) {
    this.t += dt;
    var p = world.player;
    if (this.onGround) {
      this.vx *= 0.85;
      this.hopT -= dt;
      if (this.hopT <= 0) {
        var dx = p.x - this.x;
        this.dir = dx < 0 ? -1 : 1;
        this.vy = -430;
        this.vx = Math.abs(dx) < 320 ? this.dir * 70 : 0;
        this.hopT = 1.1;
        this.onGround = false;
      }
    }
    this.vy = Math.min(this.vy + PHYS.GRAV * 0.45 * dt, 420);
    var res = world.level.moveBody(this, dt, { platforms: world.platforms });
    if (res.wallL || res.wallR) this.vx = -this.vx;
    if (this.y > world.level.ph + 64) this.dead = true;
  };
  return e;
};

// Mini UFO: hovers back and forth and drops slow glowing star pellets.
EnemyTypes.ufo = function (x, y) {
  var e = new Enemy('ufo', x, y + 6, 32, 18);
  e.flying = true;
  e.hx = e.x; e.hy = e.y;
  e.cool = 1.2;
  e.update = function (dt, world) {
    this.t += dt;
    this.x = this.hx + Math.sin(this.t * 0.9) * 90;
    this.dir = Math.cos(this.t * 0.9) > 0 ? 1 : -1;
    this.y = this.hy + Math.sin(this.t * 2.4) * 4;
    var p = world.player;
    this.cool -= dt;
    if (this.cool <= 0 && Math.abs(p.x + p.w / 2 - this.cx()) < 240 && p.y > this.y) {
      this.cool = 2.3;
      var pe = EnemyTypes.pellet(this.cx(), this.y + this.h);
      pe.ctor = EnemyTypes.pellet; pe.active = true;
      world.enemies.push(pe);
      Sound.play('pellet');
    }
  };
  return e;
};

// Star pellet dropped by a mini UFO: falls slowly straight down.
EnemyTypes.pellet = function (cx, y) {
  var e = new Enemy('pellet', cx - 7, y, 14, 14);
  e.stompable = false;
  e.flying = true;
  e.hintId = 'ufo';
  e.update = function (dt, world) {
    this.t += dt;
    this.y += 120 * dt;
    if (world.level.solid(Math.floor(this.cx() / TILE), Math.floor((this.y + this.h) / TILE)) || this.y > world.level.ph) {
      this.dead = true;
      FX.sparkle(this.cx(), this.y + this.h, 4, '#FFE36E');
    }
  };
  e.stomp = e.kill;
  return e;
};

// Space urchin: a spiky ball drifting slowly through the air. Can't be stomped.
EnemyTypes.urchin = function (x, y) {
  var e = new Enemy('urchin', x + 3, y + 3, 26, 26);
  e.stompable = false;
  e.flying = true;
  e.hx = e.x; e.hy = e.y;
  e.update = function (dt) {
    this.t += dt;
    this.x = this.hx + Math.sin(this.t * 0.55) * 54;
    this.y = this.hy + Math.sin(this.t * 0.85 + 1) * 34;
  };
  return e;
};
