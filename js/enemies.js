// Enemy types and AI. All are round, soft, cute-grumpy creatures.

function Enemy(type, x, y, w, h) {
  this.type = type;
  this.x = x; this.y = y; this.w = w; this.h = h;
  this.vx = 0; this.vy = 0;
  this.dir = -1;
  this.t = Math.random() * 2;
  this.state = 'normal';
  this.onGround = false;
  this.active = false;
  this.dying = null;
  this.stompable = true;
  this.flying = false;
  this.visible = true;
  this.solidHit = true;   // currently able to touch the player
  this.hintId = type;
}

Enemy.prototype.hitbox = function () { return this; };
Enemy.prototype.canStomp = function () { return this.stompable; };
Enemy.prototype.canTouch = function () { return this.solidHit && !this.dying; };
Enemy.prototype.cx = function () { return this.x + this.w / 2; };

Enemy.prototype.walk = function (dt, world, speed, turnAtEdges) {
  var level = world.level;
  this.vx = this.dir * speed;
  this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAX_FALL);
  var res = level.moveBody(this, dt, { quickSolid: true });
  if (res.wallL) this.dir = 1;
  if (res.wallR) this.dir = -1;
  if (turnAtEdges && this.onGround) {
    var fx = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
    if (!level.groundAt(fx, this.y + this.h + 4, true)) this.dir = -this.dir;
  }
  if (this.y > level.ph + 64) this.dead = true;
};

Enemy.prototype.gravity = function (dt, world) {
  this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAX_FALL);
  var res = world.level.moveBody(this, dt, { quickSolid: true });
  if (this.y > world.level.ph + 64) this.dead = true;
  return res;
};

Enemy.prototype.stomp = function (world) {
  this.dying = { style: 'poof', t: 0 };
  Sound.play('stomp');
  FX.poof(this.x + this.w / 2, this.y + this.h / 2, 8);
};

// Defeated by a shot: each character's shot has its own defeat look.
Enemy.prototype.kill = function (world, style, dir) {
  if (this.dying) return;
  this.dying = { style: style || 'poof', t: 0, dir: dir || 1, vy: -300 };
  var cx = this.x + this.w / 2, cy = this.y + this.h / 2;
  if (style === 'sparkle') FX.sparkle(cx, cy, 16, '#FFE36E');
  else if (style === 'smoke') FX.smoke(cx, cy, 8);
  else if (style === 'poof') FX.poof(cx, cy, 8);
  Sound.play('poof');
};

Enemy.prototype.updateDying = function (dt) {
  var d = this.dying;
  d.t += dt;
  if (d.style === 'bubble') { this.y -= 70 * dt; this.x += Math.sin(d.t * 3) * 20 * dt; if (d.t > 2.5) this.dead = true; }
  else if (d.style === 'spin') { this.x += d.dir * 220 * dt; this.y += d.vy * dt; d.vy += 1100 * dt; if (d.t > 1.6) this.dead = true; }
  else if (d.t > 0.3) this.dead = true;
};

Enemy.prototype.update = function (dt, world) {};

Enemy.prototype.draw = function (ctx, world) {
  if (!this.visible) return;
  var d = this.dying;
  var cx = this.x + this.w / 2, by = this.y + this.h;
  if (!d) { Art.enemy(ctx, this, world); return; }
  ctx.save();
  if (d.style === 'poof') {
    var s = Math.max(0, 1 - d.t / 0.3);
    ctx.translate(cx, by);
    ctx.scale(1 + (1 - s) * 0.4, s * 0.5);
    ctx.translate(-cx, -by);
    Art.enemy(ctx, this, world);
  } else if (d.style === 'bubble') {
    Art.enemy(ctx, this, world);
    ctx.restore();
    Art.bubble(ctx, cx, this.y + this.h / 2, Math.max(this.w, this.h) * 0.75, world.t);
    return;
  } else if (d.style === 'spin') {
    ctx.translate(cx, this.y + this.h / 2);
    ctx.rotate(d.t * 14 * d.dir);
    ctx.translate(-cx, -(this.y + this.h / 2));
    Art.enemy(ctx, this, world);
  } else {
    ctx.globalAlpha = Math.max(0, 1 - d.t / 0.3);
    Art.enemy(ctx, this, world);
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------
var EnemyTypes = {};

// Grumpy hedgehog: walks, turns at walls and edges.
EnemyTypes.hedgehog = function (x, y) {
  var e = new Enemy('hedgehog', x + 2, y + 32 - 26, 28, 26);
  e.update = function (dt, world) {
    this.t += dt;
    this.walk(dt, world, 42, true);
  };
  return e;
};

// Bouncing frog: hops in place or toward the player.
EnemyTypes.frog = function (x, y) {
  var e = new Enemy('frog', x + 2, y + 32 - 24, 28, 24);
  e.hopT = 1 + Math.random();
  e.update = function (dt, world) {
    this.t += dt;
    var p = world.player;
    if (this.onGround) {
      this.vx *= 0.8;
      this.hopT -= dt;
      if (this.hopT <= 0) {
        var dx = p.x - this.x;
        this.dir = dx < 0 ? -1 : 1;
        this.vy = -470;
        this.vx = Math.abs(dx) < 260 ? this.dir * 100 : 0;
        this.hopT = 1.3;
        this.onGround = false;
      }
    }
    var res = this.gravity(dt, world);
    if (res.wallL || res.wallR) this.vx = 0;
  };
  return e;
};

// Mole: pops out of a hole for 2 s (dirt shakes 0.5 s before).
EnemyTypes.mole = function (x, y) {
  var e = new Enemy('mole', x + 2, y + 32 - 28, 28, 28);
  e.holeY = y + 32;
  e.phase = 'hidden';
  e.pt = Math.random() * 1.5;
  e.rise = 0;
  e.update = function (dt, world) {
    this.t += dt;
    this.pt += dt;
    var p = world.player;
    if (this.phase === 'hidden') {
      this.rise = 0;
      var near = Math.abs(p.x + p.w / 2 - this.cx()) < 26 && p.onGround && Math.abs(p.y + p.h - this.holeY) < 40;
      if (this.pt > 2 && !near) { this.phase = 'shake'; this.pt = 0; }
    } else if (this.phase === 'shake') {
      if (this.pt > 0.5) { this.phase = 'up'; this.pt = 0; }
    } else if (this.phase === 'up') {
      this.rise = Math.min(1, this.pt / 0.2);
      if (this.pt > 2) { this.phase = 'down'; this.pt = 0; }
    } else if (this.phase === 'down') {
      this.rise = Math.max(0, 1 - this.pt / 0.2);
      if (this.pt > 0.2) { this.phase = 'hidden'; this.pt = 0; }
    }
    this.h = Math.max(1, 28 * this.rise);
    this.y = this.holeY - this.h;
    this.solidHit = this.rise > 0.5;
  };
  e.canStomp = function () { return this.rise > 0.5; };
  return e;
};

// Cave bat: hangs from the ceiling, swoops in an arc when the player is below.
EnemyTypes.bat = function (x, y) {
  var e = new Enemy('bat', x + 3, y + 2, 26, 20);
  e.flying = true;
  e.hy = e.y;
  e.phase = 'hang';
  e.pt = 0;
  e.update = function (dt, world) {
    this.t += dt;
    this.pt += dt;
    var p = world.player;
    if (this.phase === 'hang' || this.phase === 'rest') {
      this.y += (this.hy - this.y) * Math.min(1, dt * 4);
      var dx = p.x + p.w / 2 - this.cx();
      if ((this.phase === 'hang' || this.pt > 1.6) && Math.abs(dx) < 110 && p.y > this.y && p.state === 'normal') {
        this.phase = 'swoop'; this.pt = 0;
        this.dir = dx < 0 ? -1 : 1;
        this.sx = this.x;
        this.depth = Math.max(50, Math.min(220, p.y + p.h * 0.4 - this.hy));
      }
    } else if (this.phase === 'swoop') {
      var T = 1.5;
      var f = Math.min(1, this.pt / T);
      this.x = this.sx + this.dir * 230 * f;
      this.y = this.hy + this.depth * Math.sin(Math.PI * f);
      if (world.level.rectSolid(this.x, this.y, this.w, this.h)) {
        this.x -= this.dir * 4;
      }
      if (f >= 1) { this.phase = 'rest'; this.pt = 0; }
    }
  };
  return e;
};

// Rolling rock: rolls down slopes and along tunnels. Can't be stomped.
EnemyTypes.rock = function (x, y) {
  var e = new Enemy('rock', x + 1, y + 2, 30, 30);
  e.stompable = false;
  e.phase = 'wait';
  e.angle = 0;
  e.update = function (dt, world) {
    this.t += dt;
    var p = world.player;
    if (this.phase === 'wait') {
      this.gravity(dt, world);
      if (Math.abs(p.x - this.x) < 340) {
        this.phase = 'rumble'; this.pt = 0;
        Sound.play('rumble');
        world.camera.shake = Math.max(world.camera.shake, 0.3);
        this.dir = p.x < this.x ? -1 : 1;
        world.hint('rock', this);
      }
      return;
    }
    if (this.phase === 'rumble') {
      this.pt += dt;
      if (this.pt > 0.6) this.phase = 'roll';
      return;
    }
    this.vx = this.dir * 150;
    this.angle += this.vx * dt / 15;
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAX_FALL);
    var res = world.level.moveBody(this, dt);
    if (res.wallL || res.wallR) {
      this.dead = true;
      FX.debris(this.x, this.y, '#7C7670');
      Sound.play('break');
    }
    if (this.y > world.level.ph + 64) this.dead = true;
  };
  return e;
};

// Swooping crow: flies in a wave pattern.
EnemyTypes.crow = function (x, y) {
  var e = new Enemy('crow', x + 2, y + 6, 28, 20);
  e.flying = true;
  e.hy = e.y;
  e.update = function (dt, world) {
    this.t += dt;
    this.x += this.dir * 95 * dt;
    this.y = this.hy + Math.sin(this.t * 3.2) * 16;
    if (this.x < world.camera.x - 400) this.dead = true;
  };
  return e;
};

// Cloudling: small grumpy cloud drifting slowly toward the player.
EnemyTypes.cloudling = function (x, y) {
  var e = new Enemy('cloudling', x, y + 6, 30, 22);
  e.flying = true;
  e.hy = e.y;
  e.update = function (dt, world) {
    this.t += dt;
    var p = world.player;
    var dx = p.x + p.w / 2 - this.cx();
    this.dir = dx < 0 ? -1 : 1;
    this.x += this.dir * 38 * dt;
    var dy = (p.y + p.h * 0.3) - this.y;
    var ty = this.hy + Math.max(-40, Math.min(40, dy));
    this.y += Math.max(-20 * dt, Math.min(20 * dt, ty - this.y));
    this.y += Math.sin(this.t * 2) * 0.3;
  };
  return e;
};

// Sky gull: flies straight across the screen.
EnemyTypes.gull = function (x, y) {
  var e = new Enemy('gull', x, y + 8, 30, 16);
  e.flying = true;
  e.update = function (dt, world) {
    this.t += dt;
    this.x -= 170 * dt;
    this.dir = -1;
    if (this.x < world.camera.x - 200) this.dead = true;
  };
  return e;
};
EnemyTypes.gull.activateAhead = 40;

// Spark: rolls along clouds and hops over gaps. Can't be stomped.
EnemyTypes.spark = function (x, y) {
  var e = new Enemy('spark', x + 5, y + 32 - 22, 22, 22);
  e.stompable = false;
  e.update = function (dt, world) {
    this.t += dt;
    var level = world.level;
    this.vx = this.dir * 105;
    this.vy = Math.min(this.vy + PHYS.GRAV * dt, PHYS.MAX_FALL);
    var res = level.moveBody(this, dt, { platforms: world.platforms });
    if (res.wallL) this.dir = 1;
    if (res.wallR) this.dir = -1;
    if (this.onGround) {
      var fx = this.dir > 0 ? this.x + this.w + 4 : this.x - 4;
      if (!level.groundAt(fx, this.y + this.h + 4)) {
        // Hop over the gap if there is ground within 3 tiles, else turn around.
        var land = false;
        for (var k = 1; k <= 3; k++) if (level.groundAt(fx + this.dir * k * TILE, this.y + this.h + 4)) land = true;
        if (land) this.vy = -520;
        else this.dir = -this.dir;
      }
    }
    if (this.y > level.ph + 64) this.dead = true;
  };
  return e;
};

// Spiky plant / cactus: stationary, can't be stomped.
EnemyTypes.plant = function (x, y, world) {
  var cactus = world && world.level.theme === TH.DESERT;
  var e = new Enemy(cactus ? 'cactus' : 'plant', x + 3, y + 32 - 30, 26, 30);
  e.stompable = false;
  e.update = function (dt) { this.t += dt; };
  return e;
};

// Crab: walks sideways along the sea floor.
EnemyTypes.crab = function (x, y) {
  var e = new Enemy('crab', x + 1, y + 32 - 22, 30, 22);
  e.update = function (dt, world) {
    this.t += dt;
    this.vx = this.dir * 45;
    this.vy = Math.min(this.vy + 900 * dt, 300);
    var res = world.level.moveBody(this, dt);
    if (res.wallL) this.dir = 1;
    if (res.wallR) this.dir = -1;
    if (this.onGround) {
      var fx = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
      if (!world.level.groundAt(fx, this.y + this.h + 4)) this.dir = -this.dir;
    }
  };
  return e;
};

// Jellyfish: bobs up and down; the top stings so it can't be stomped.
EnemyTypes.jellyfish = function (x, y) {
  var e = new Enemy('jellyfish', x + 3, y, 26, 30);
  e.stompable = false;
  e.flying = true;
  e.hy = e.y;
  e.update = function (dt) {
    this.t += dt;
    this.y = this.hy + Math.sin(this.t * 2.1) * 48;
  };
  return e;
};

// Pufferfish: swims slowly, puffs up for 2 s when the player comes close.
EnemyTypes.puffer = function (x, y) {
  var e = new Enemy('puffer', x + 2, y + 4, 28, 24);
  e.flying = true;
  e.hx = e.x;
  e.puff = 0;      // 0..1
  e.puffT = 0;
  e.cool = 0;
  e.update = function (dt, world) {
    this.t += dt;
    var p = world.player;
    var cx = this.cx(), cy = this.y + this.h / 2;
    var d = Math.hypot(p.x + p.w / 2 - cx, p.y + p.h / 2 - cy);
    if (this.cool > 0) this.cool -= dt;
    if (this.puffT > 0) {
      this.puffT -= dt;
      this.puff = Math.min(1, this.puff + dt * 6);
      if (this.puffT <= 0) this.cool = 1.5;
    } else {
      this.puff = Math.max(0, this.puff - dt * 3);
      if (d < 90 && this.cool <= 0) { this.puffT = 2; }
      this.x += this.dir * 30 * dt;
      if (this.x < this.hx - 96) this.dir = 1;
      if (this.x > this.hx + 96) this.dir = -1;
      if (world.level.rectSolid(this.x, this.y, this.w, this.h)) this.dir = -this.dir;
    }
    this.baseY = this.baseY || this.y;
    this.y = this.baseY + Math.sin(this.t * 1.5) * 4;
  };
  e.hitbox = function () {
    var g = 10 * this.puff;
    return { x: this.x - g, y: this.y - g, w: this.w + g * 2, h: this.h + g * 2 };
  };
  e.canStomp = function () { return this.puff < 0.3; };
  return e;
};

// Eel: hides in a rock hole and darts out when the player passes.
EnemyTypes.eel = function (x, y, world) {
  var e = new Enemy('eel', x, y + 8, 32, 16);
  var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  e.dir = world && world.level.solid(tx - 1, ty) ? 1 : -1;
  e.hx = e.dir > 0 ? x : x + 32;   // hole mouth x
  e.out = 0;
  e.phase = 'hide';
  e.pt = 0;
  e.stompable = false;
  e.flying = true;
  e.len = 104;
  e.update = function (dt, world) {
    this.t += dt;
    this.pt += dt;
    var p = world.player;
    var pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    if (this.phase === 'hide') {
      this.out = 0;
      if (this.pt > 1.5 && Math.abs(pcx - this.hx) < 170 && Math.abs(pcy - (this.y + 8)) < 70) {
        this.phase = 'warn'; this.pt = 0;
        world.hint('eel', this);
      }
    } else if (this.phase === 'warn') {
      if (Math.random() < dt * 14) FX.bubbles(this.hx + this.dir * 6, this.y + 8, 1);
      if (this.pt > 1) { this.phase = 'dart'; this.pt = 0; }
    } else if (this.phase === 'dart') {
      this.out = Math.min(1, this.pt / 0.25);
      if (this.pt > 1.25) { this.phase = 'back'; this.pt = 0; }
    } else if (this.phase === 'back') {
      this.out = Math.max(0, 1 - this.pt / 0.5);
      if (this.pt > 0.5) { this.phase = 'hide'; this.pt = 0; }
    }
    var L = this.len * this.out;
    this.w = Math.max(1, L);
    this.x = this.dir > 0 ? this.hx : this.hx - L;
    this.solidHit = this.out > 0.15;
  };
  e.canTouch = function () { return this.out > 0.15 && !this.dying; };
  return e;
};

// Desert scorpion: walks fast, dashes at the player on the same row.
EnemyTypes.scorpion = function (x, y) {
  var e = new Enemy('scorpion', x + 1, y + 32 - 20, 30, 20);
  e.dash = 0;
  e.rest = 0;
  e.update = function (dt, world) {
    this.t += dt;
    var p = world.player;
    var speed = 80;
    if (this.dash > 0) { this.dash -= dt; speed = 230; if (this.dash <= 0) this.rest = 0.7; }
    else if (this.rest > 0) { this.rest -= dt; speed = 20; }
    else {
      var dy = Math.abs((p.y + p.h) - (this.y + this.h));
      var dx = p.x + p.w / 2 - this.cx();
      if (dy < 18 && Math.abs(dx) < 220 && p.state === 'normal') {
        this.dir = dx < 0 ? -1 : 1;
        this.dash = 0.9;
      }
    }
    this.walk(dt, world, speed, true);
  };
  return e;
};

// Vulture: circles high, then dives at the player's position (shadow warns 1 s before).
EnemyTypes.vulture = function (x, y) {
  var e = new Enemy('vulture', x, y, 34, 24);
  e.flying = true;
  e.cxh = x; e.hy = y;
  e.ang = Math.random() * 6;
  e.phase = 'circle';
  e.pt = 1.5;
  e.shadow = null;
  e.update = function (dt, world) {
    this.t += dt;
    this.pt += dt;
    var p = world.player;
    var pcx = p.x + p.w / 2;
    if (this.phase === 'circle') {
      this.ang += dt * 1.8;
      if (Math.abs(pcx - this.cxh) < 420) this.cxh += Math.max(-50 * dt, Math.min(50 * dt, pcx - this.cxh));
      this.x = this.cxh + Math.cos(this.ang) * 70 - this.w / 2;
      this.y = this.hy + Math.sin(this.ang) * 18;
      this.dir = Math.sin(this.ang) > 0 ? -1 : 1;
      if (this.pt > 3.2 && Math.abs(pcx - this.cx()) < 260 && p.state === 'normal' && p.y > this.y) {
        this.phase = 'warn'; this.pt = 0;
        this.shadow = { x: pcx, y: world.groundBelow(pcx, p.y + p.h - 4) };
        this.tx = pcx - this.w / 2; this.ty = this.shadow.y - this.h;
        Sound.play('warn');
        world.hint('vulture', this);
      }
    } else if (this.phase === 'warn') {
      this.x += Math.sin(this.t * 30) * 0.5;
      if (this.pt > 1) { this.phase = 'dive'; this.pt = 0; this.sx = this.x; this.sy = this.y; }
    } else if (this.phase === 'dive') {
      var f = Math.min(1, this.pt / 0.55);
      this.x = this.sx + (this.tx - this.sx) * f;
      this.y = this.sy + (this.ty - this.sy) * f * f;
      this.dir = this.tx < this.sx ? -1 : 1;
      if (f >= 1) { this.phase = 'rise'; this.pt = 0; this.shadow = null; this.sx = this.x; this.sy = this.y; }
    } else if (this.phase === 'rise') {
      var g = Math.min(1, this.pt / 1.0);
      this.y = this.sy + (this.hy - this.sy) * g;
      this.cxh = this.x + this.w / 2 - Math.cos(this.ang) * 70;
      if (g >= 1) { this.phase = 'circle'; this.pt = 0; }
    }
  };
  e.drawBack = function (ctx) {
    if (this.shadow && !this.dying) Art.shadow(ctx, this.shadow.x, this.shadow.y, 22 + 10 * Math.min(1, this.pt), 0.35 + 0.3 * Math.min(1, this.pt));
  };
  return e;
};

// Tumbleweed: rolls quickly across with big bounces. Dust warns at the screen edge.
EnemyTypes.tumbleweed = function (x, y) {
  var e = new Enemy('tumbleweed', x + 2, y + 2, 28, 28);
  e.stompable = false;
  e.phase = 'wait';
  e.angle = 0;
  e.update = function (dt, world) {
    this.t += dt;
    var cam = world.camera;
    if (this.phase === 'wait') {
      if (this.x < cam.x + VIEW_W + 280) { this.phase = 'warn'; this.pt = 0; world.hint('tumbleweed', this); }
      return;
    }
    if (this.phase === 'warn') {
      // Rolls in from off-screen; dust clouds puff at the screen edge first.
      this.pt += dt;
      if (this.x > cam.x + VIEW_W - 10) {
        if (Math.random() < dt * 25) FX.dust(cam.x + VIEW_W - 8, this.y + this.h, 2);
        if (this.pt < 0.8) return;   // hold a moment so the warning is seen
      } else this.phase = 'roll';
    }
    this.vx = -190;
    this.angle -= 190 * dt / 14;
    this.vy = Math.min(this.vy + PHYS.GRAV * 0.8 * dt, PHYS.MAX_FALL);
    var res = world.level.moveBody(this, dt, { platforms: world.platforms });
    if (this.onGround) this.vy = -380;
    if (res.wallL) {
      // Hop up over boxes
      this.vy = -520; this.x -= 1;
    }
    if (this.x < cam.x - 200 || this.y > world.level.ph + 64) this.dead = true;
  };
  return e;
};
EnemyTypes.tumbleweed.alwaysUpdate = true;

var ENEMY_CHARS = {
  h: 'hedgehog', f: 'frog', m: 'mole', b: 'bat', R: 'rock', w: 'crow', l: 'cloudling', u: 'gull',
  y: 'spark', s: 'plant', r: 'crab', j: 'jellyfish', p: 'puffer', e: 'eel', z: 'scorpion',
  v: 'vulture', t: 'tumbleweed',
  Q: 'squirrel', E: 'caterpillar', J: 'blob', U: 'ufo', '+': 'urchin', i: 'pigeon', N: 'cone', S: 'cart'
};

var Enemies = {
  create: function (ch, x, y, world) {
    var type = ENEMY_CHARS[ch];
    if (!type) return null;
    var e = EnemyTypes[type](x, y, world);
    e.ctor = EnemyTypes[type];
    return e;
  },

  update: function (world, dt) {
    var cam = world.camera;
    var list = world.enemies;
    for (var i = list.length - 1; i >= 0; i--) {
      var e = list[i];
      if (e.dead) { list.splice(i, 1); continue; }
      if (e.dying) { e.updateDying(dt); continue; }
      if (!e.active) {
        var ahead = e.ctor && e.ctor.activateAhead !== undefined ? e.ctor.activateAhead : 64;
        if (e.x < cam.x + VIEW_W + ahead && e.x + e.w > cam.x - 64) e.active = true;
        else if (e.ctor === EnemyTypes.tumbleweed && e.x < cam.x + VIEW_W + 300) e.active = true;
        else continue;
      }
      // Freeze ground enemies that are far off-screen (flyers keep going).
      if (!e.flying && (e.x > cam.x + VIEW_W + 400 || e.x + e.w < cam.x - 400)) continue;
      e.update(dt, world);
      if (cam.visible(e.x, e.y, e.w, e.h, -20)) world.hint(e.hintId || e.type, e);
    }
  },

  // Player vs enemy contact: stomp from above, otherwise a hit.
  collide: function (world) {
    var p = world.player;
    if (p.state !== 'normal') return;
    var list = world.enemies;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.dead || e.dying || !e.active || !e.canTouch()) continue;
      var hb = e.hitbox();
      if (!(p.x < hb.x + hb.w && p.x + p.w > hb.x && p.y < hb.y + hb.h && p.y + p.h > hb.y)) continue;
      var falling = p.vy > 0 || (world.level.underwater && p.vy > -30);
      var fromAbove = p.prevBottom <= hb.y + Math.max(10, hb.h * 0.5);
      if (falling && fromAbove && e.canStomp()) {
        e.stomp(world);
        p.y = hb.y - p.h;
        p.bounce();
        world.pipReact('happy');
      } else if (falling && fromAbove && !e.canStomp() && p.invuln > 0) {
        // invulnerable: pass through
      } else {
        p.hurt(e.type);
      }
    }
  }
};
