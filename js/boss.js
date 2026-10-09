// Shared boss engine: arena lock, intro, health bar data, weak moment,
// shot hits, contact, victory sequence with the rising flagpole, and a set of
// reusable telegraphed hazards used by the seven bosses in bosses.js.

// ---------------------------------------------------------------------------
// Arena
function Arena(world, col) {
  this.world = world;
  this.col = col;
  this.x0 = col * TILE;
  this.x1 = this.x0 + VIEW_W;
  this.state = 'idle';     // idle | intro | fight | victory | done
  this.t = 0;
  this.walls = [];
  this.wallRise = 0;
  var level = world.level;
  // Arena floor: the first solid tile from the top in the arena's middle column.
  var mid = col + 15;
  var fy = level.h;
  for (var y = level.h - 1; y >= 0; y--) {
    if (level.solid(mid, y)) fy = y;
    else break;
  }
  this.floorRow = fy;
  this.floorY = fy * TILE;
  // Ceiling: first empty tile from the top (caves have ceilings).
  var cy = 0;
  while (cy < level.h && level.solid(mid, cy)) cy++;
  this.ceilY = cy * TILE;
  this.left = this.x0 + TILE;          // inner edges
  this.right = this.x1 - TILE;
}

Arena.prototype.active = function () { return this.state === 'intro' || this.state === 'fight'; };
Arena.prototype.midX = function () { return (this.left + this.right) / 2; };

Arena.prototype.update = function (dt) {
  var world = this.world;
  var p = world.player;
  this.t += dt;
  if (this.state === 'idle') {
    if (p.state === 'normal' && p.x > this.x0 + TILE + 8) this.start();
    return;
  }
  if (this.wallRise < 1 && (this.state === 'intro' || this.state === 'fight')) this.wallRise = Math.min(1, this.wallRise + dt / 0.5);
  if (this.state === 'intro') {
    if (this.t > 2.0) {
      this.state = 'fight';
      this.t = 0;
      if (p.state === 'frozen') p.state = 'normal';
      world.hint('boss', world.boss);
    }
  } else if (this.state === 'victory') {
    this.wallRise = Math.max(0, this.wallRise - dt / 1.0);
    if (this.t > 1.0 && this.walls.length) this.removeWalls();
    if (this.t > 1.2 && !this.flag) {
      this.flag = new GoalFlag(this.x0 + TILE * 25, this.floorY, true);
      world.entities.push(this.flag);
      if (world.level.theme === TH.CLOUD) world.rainbowAt = { x: this.x0 + TILE * 25 + 10, y: this.floorY, t: 0 };
    }
    if (this.t > 1.5) this.state = 'done';
  }
};

Arena.prototype.start = function () {
  var world = this.world;
  var level = world.level;
  this.state = 'intro';
  this.t = 0;
  this.wallRise = 0;
  world.camera.lock = { x: this.x0 };
  // Walls on both sides of the one-screen arena
  var cols = [this.col, this.col + 29];
  this.walls = [];
  for (var i = 0; i < cols.length; i++) {
    for (var y = 0; y < this.floorRow; y++) {
      if (level.get(cols[i], y) === T.EMPTY) {
        level.set(cols[i], y, T.WALL);
        this.walls.push([cols[i], y]);
      }
    }
  }
  // Keep the player inside
  var p = world.player;
  if (p.x < this.left + 2) p.x = this.left + 2;
  p.state = 'frozen';
  p.vx = 0;
  var def = BOSSES[world.def.boss];
  world.boss = def.create(world, this);
  world.boss.intro = true;
  Sound.play('roar');
  world.camera.shake = 0.5;
};

Arena.prototype.removeWalls = function () {
  var level = this.world.level;
  for (var i = 0; i < this.walls.length; i++) level.set(this.walls[i][0], this.walls[i][1], T.EMPTY);
  this.walls = [];
};

// The player lost a life in the arena: boss back to full health next time.
Arena.prototype.reset = function () {
  var world = this.world;
  this.removeWalls();
  this.state = 'idle';
  this.t = 0;
  this.wallRise = 0;
  world.camera.lock = null;
  if (world.boss) world.boss.cleanup();
  world.boss = null;
  var p = world.player;
  p.slowMul = 1; p.extPush = 0; p.ice = false;
};

Arena.prototype.victory = function () {
  var world = this.world;
  this.state = 'victory';
  this.t = 0;
  var boss = world.boss;
  var n = BOSSES[world.def.boss].coins;
  var bx = boss.x + boss.w / 2, by = boss.y + boss.h / 2;
  for (var i = 0; i < n; i++) {
    var a = -Math.PI / 2 + (Math.random() * 2 - 1) * 1.1;
    var s = 300 + Math.random() * 250;
    world.entities.push(new PopCoin(bx, by, Math.cos(a) * s * 0.7, Math.sin(a) * s, i * 0.03));
  }
  world.addCoins(n, bx, by - 30, true);
  Sound.play('victory');
  world.pipReact('loop');
  var p = world.player;
  p.slowMul = 1; p.extPush = 0; p.ice = false;
};

Arena.prototype.drawWalls = function (ctx) {
  if (!this.walls.length && this.state !== 'victory') return;
  if (this.wallRise <= 0) return;
  var theme = this.world.level.theme;
  var h = this.floorY - this.ceilY;
  var cols = [this.col, this.col + 29];
  for (var i = 0; i < 2; i++) {
    var x = cols[i] * TILE;
    var top = this.floorY - h * this.wallRise;
    Art.arenaWall(ctx, x, top, TILE, this.floorY - top, theme);
  }
};

// ---------------------------------------------------------------------------
// Boss base
function Boss(world, arena, id) {
  var def = BOSSES[id];
  this.id = id;
  this.def = def;
  this.world = world;
  this.arena = arena;
  this.name = def.name;
  this.color = def.color;
  this.maxHp = def.hp;
  this.hp = def.hp;
  this.t = 0;
  this.st = 0;
  this.state = 'idle';
  this.flash = 0;
  this.shotHits = 0;
  this.hazards = [];
  this.dizzy = false;
  this.facing = -1;
  this.defeated = false;
  this.scale = 1;
  this.pose = 'idle';
  this.anger = 0;
  this.phaseNow = 1;
  this.x = 0; this.y = 0; this.w = 64; this.h = 64;
  this.harmful = true;
  this.visible = true;
}

Boss.prototype.introActive = function () { return this.arena.state === 'intro'; };
Boss.prototype.set = function (s) { this.state = s; this.st = 0; this.substep = 0; };
Boss.prototype.cx = function () { return this.x + this.w / 2; };
Boss.prototype.floor = function () { return this.arena.floorY; };
Boss.prototype.player = function () { return this.world.player; };
Boss.prototype.faceTo = function (px) { this.facing = px < this.cx() ? -1 : 1; };
Boss.prototype.hurtbox = function () { return { x: this.x, y: this.y, w: this.w, h: this.h }; };
Boss.prototype.phase = function () { return 1; };
Boss.prototype.think = function (dt) {};

Boss.prototype.update = function (dt) {
  this.t += dt;
  this.st += dt;
  if (this.flash > 0) this.flash -= dt;
  if (this.defeated) { this.updateDefeated(dt); return; }
  if (this.arena.state === 'intro') { this.updateIntro(dt); return; }
  var ph = this.phase();
  if (ph !== this.phaseNow) {
    this.phaseNow = ph;
    this.onPhaseChange(ph);
  }
  this.think(dt);
  this.updateHazards(dt);
  this.collide();
};

Boss.prototype.updateIntro = function (dt) {
  this.pose = this.st < 1.4 ? 'roar' : 'idle';
};

Boss.prototype.onPhaseChange = function (ph) {
  Sound.play('roar');
  this.world.camera.shake = 0.4;
  this.flash = Math.max(this.flash, 0.6);
};

Boss.prototype.updateHazards = function (dt) {
  var p = this.world.player;
  for (var i = this.hazards.length - 1; i >= 0; i--) {
    var h = this.hazards[i];
    h.update(dt, this);
    if (!h.dead && h.hurts && h.hurts(p) && p.state === 'normal') p.hurt('boss');
    if (h.dead) this.hazards.splice(i, 1);
  }
};

Boss.prototype.addHazard = function (h) { this.hazards.push(h); return h; };

Boss.prototype.collide = function () {
  var p = this.world.player;
  if (p.state !== 'normal' || !this.visible) return;
  var hb = this.hurtbox();
  if (!hb) return;
  if (!(p.x < hb.x + hb.w && p.x + p.w > hb.x && p.y < hb.y + hb.h && p.y + p.h > hb.y)) return;
  var falling = p.vy > 0 || (this.world.level.underwater && p.vy > -40);
  var fromAbove = p.prevBottom <= hb.y + 18;
  if (this.dizzy && this.flash <= 0 && falling && fromAbove) {
    p.y = hb.y - p.h;
    p.bounce(560);
    this.damage();
    return;
  }
  if (this.dizzy || this.flash > 0) {
    // Harmless now: gently push the player out of the body.
    if (fromAbove && falling) { p.y = hb.y - p.h; p.bounce(300); }
    return;
  }
  if (this.harmful) p.hurt('boss');
};

Boss.prototype.overlapsShot = function (s) {
  if (this.defeated || !this.visible || this.arena.state !== 'fight') return false;
  var hb = this.hurtbox();
  if (!hb) return false;
  return s.x < hb.x + hb.w && s.x + s.w > hb.x && s.y < hb.y + hb.h && s.y + s.h > hb.y;
};

// 3 shot hits = 1 hit point, for every character, at any time.
Boss.prototype.shotHit = function (s) {
  if (this.flash > 0 || this.defeated) return;
  this.shotHits++;
  FX.sparkle(s.x, s.y, 6, SHOT_COLOR[s.kind]);
  this.hitBlink = 0.12;
  if (this.shotHits >= 3) {
    this.shotHits = 0;
    this.damage();
  }
};

Boss.prototype.damage = function () {
  if (this.defeated) return;
  this.hp--;
  this.flash = 1.0;
  Sound.play('bosshit');
  this.world.camera.shake = 0.3;
  FX.sparkle(this.cx(), this.y + 10, 12, '#FFFFFF');
  if (this.hp <= 0) { this.defeat(); return; }
  this.onDamaged();
};

Boss.prototype.onDamaged = function () {
  this.dizzy = false;
  this.recover();
};

Boss.prototype.recover = function () { this.set('idle'); };

Boss.prototype.defeat = function () {
  this.defeated = true;
  this.dizzy = false;
  this.st = 0;
  this.cleanupHazards();
  this.arena.victory();
};

Boss.prototype.cleanupHazards = function () {
  for (var i = 0; i < this.hazards.length; i++) if (this.hazards[i].cleanup) this.hazards[i].cleanup(this);
  this.hazards = [];
  var p = this.world.player;
  p.slowMul = 1; p.extPush = 0;
  this.world.darkZone = null;
};

Boss.prototype.cleanup = function () {
  this.cleanupHazards();
  // Remove boss minions
  var en = this.world.enemies;
  for (var i = en.length - 1; i >= 0; i--) if (en[i].bossMinion) en.splice(i, 1);
};

// Victory: shrink to a small harmless version that runs away.
Boss.prototype.updateDefeated = function (dt) {
  this.scale = Math.max(0.35, 1 - this.st * 1.6);
  this.pose = 'run';
  if (this.st > 0.6) {
    this.x += 220 * dt;
    if (this.flyAway) this.y -= 80 * dt;
    else {
      var gy = this.floor() - this.h;
      this.y += (gy - this.y) * Math.min(1, dt * 8);
    }
    this.facing = 1;
  }
  if (this.x > this.arena.x1 + 200) this.visible = false;
};

Boss.prototype.drawHazardsBack = function (ctx) {
  for (var i = 0; i < this.hazards.length; i++) if (this.hazards[i].drawBack) this.hazards[i].drawBack(ctx, this);
};
Boss.prototype.drawHazards = function (ctx) {
  for (var i = 0; i < this.hazards.length; i++) if (this.hazards[i].draw) this.hazards[i].draw(ctx, this);
};

Boss.prototype.draw = function (ctx) {
  if (!this.visible) return;
  var blink = (this.flash > 0 && Math.floor(this.flash * 16) % 2 === 0) || this.hitBlink > 0;
  if (this.hitBlink > 0) this.hitBlink -= 1 / 60;
  Art.boss(ctx, this, blink);
  if (this.dizzy) Art.dizzyStars(ctx, this.cx(), this.headY ? this.headY() : this.y - 6, this.t, this.w * 0.45);
};

// Ground height below x inside the arena (platform-aware for shadows).
Boss.prototype.groundAt = function (x) {
  return this.world.groundBelow(x, this.arena.ceilY + 4);
};

// ---------------------------------------------------------------------------
// Reusable hazards. Each: update(dt, boss), draw(ctx, boss), hurts(p), dead.

function rectHit(h, p) {
  return p.x < h.x + h.w && p.x + p.w > h.x && p.y < h.y + h.h && p.y + p.h > h.y;
}

// Something thrown / dropped that lands on a marked spot. A shadow on the
// ground grows while it falls. kind: 'spine' | 'rock' | 'snowball' | 'stinger'
function FallingThing(kind, sx, sy, tx, groundY, flightT, delay, opts) {
  opts = opts || {};
  this.kind = kind;
  this.sx = sx; this.sy = sy;
  this.tx = tx; this.gy = groundY;
  this.T = flightT;
  this.delay = delay || 0;
  this.t = -this.delay;
  this.w = opts.w || 18; this.h = opts.h || 18;
  this.arc = opts.arc !== undefined ? opts.arc : 160;
  this.x = sx - this.w / 2; this.y = sy - this.h / 2;
  this.shadowLead = opts.shadowLead !== undefined ? opts.shadowLead : 1.0;
  this.shootable = !!opts.shootable;
  this.onLand = opts.onLand;
  this.hidden = true;
}
FallingThing.prototype.update = function (dt, boss) {
  this.t += dt;
  if (this.t < 0) { this.hidden = true; return; }
  this.hidden = false;
  var f = Math.min(1, this.t / this.T);
  var cx = this.sx + (this.tx - this.sx) * f;
  var cy = this.sy + (this.gy - this.h / 2 - this.sy) * f - Math.sin(Math.PI * f) * this.arc;
  this.x = cx - this.w / 2; this.y = cy - this.h / 2;
  this.rot = (this.rot || 0) + dt * 8;
  if (f >= 1) {
    this.dead = true;
    FX.poof(this.tx, this.gy - 6, 6, this.kind === 'snowball' ? 'rgba(255,255,255,' : 'rgba(235,225,205,');
    if (this.kind === 'rock') FX.debris(this.tx - 16, this.gy - 24, '#7C7670');
    Sound.play('bump');
    if (this.onLand) this.onLand(this, boss);
  }
};
FallingThing.prototype.hurts = function (p) { return !this.hidden && rectHit({ x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 6 }, p); };
FallingThing.prototype.drawBack = function (ctx) {
  // Shadow shows up shadowLead seconds before it lands.
  var toLand = this.T - this.t;
  if (toLand > this.shadowLead + this.delay && this.t < 0) return;
  if (toLand > this.shadowLead) return;
  var k = 1 - Math.max(0, toLand) / this.shadowLead;
  Art.shadow(ctx, this.tx, this.gy, 10 + 14 * k, 0.25 + 0.4 * k);
};
FallingThing.prototype.draw = function (ctx, boss) {
  if (this.hidden) return;
  Art.bossProjectile(ctx, this.kind, this.x + this.w / 2, this.y + this.h / 2, this.rot || 0, this.w);
};

// Shockwave / sand wave / dirt wave running along the floor.
function FloorWave(kind, x, floorY, dir, speed, h, arena) {
  this.kind = kind;
  this.x = x; this.w = 26; this.h = h || 18; this.y = floorY - this.h;
  this.dir = dir; this.speed = speed;
  this.arena = arena;
  this.t = 0;
}
FloorWave.prototype.update = function (dt) {
  this.t += dt;
  this.x += this.dir * this.speed * dt;
  if (this.x < this.arena.left - 10 || this.x + this.w > this.arena.right + 10) this.dead = true;
  if (Math.random() < dt * 30) FX.dust(this.x + this.w / 2, this.y + this.h, 1);
};
FloorWave.prototype.hurts = function (p) { return rectHit({ x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 4 }, p); };
FloorWave.prototype.draw = function (ctx) { Art.floorWave(ctx, this.kind, this.x, this.y, this.w, this.h, this.t, this.dir); };

// Vertical strike (lightning bolt / tentacle / pop-up): warning first, then hits a column.
function ColumnStrike(kind, x, topY, bottomY, warnT, strikeT, w, opts) {
  opts = opts || {};
  this.kind = kind;
  this.cxp = x; this.w = w || 28;
  this.x = x - this.w / 2;
  this.topY = topY; this.bottomY = bottomY;
  this.y = topY; this.h = bottomY - topY;
  this.warnT = warnT; this.strikeT = strikeT;
  this.t = -(opts.delay || 0);
  this.onStrike = opts.onStrike;
  this.onEnd = opts.onEnd;
  this.stay = opts.stay || 0;
  this.struck = false;
}
ColumnStrike.prototype.update = function (dt, boss) {
  this.t += dt;
  if (this.t >= this.warnT && !this.struck) {
    this.struck = true;
    if (this.kind === 'lightning') { Sound.play('zap'); boss.world.camera.shake = 0.25; boss.world.flashT = 0.12; }
    else Sound.play('bump');
    if (this.onStrike) this.onStrike(this, boss);
  }
  if (this.kind !== 'lightning' && this.t < this.warnT && Math.random() < dt * 30) {
    FX.bubbles(this.cxp + (Math.random() * 2 - 1) * 12, this.bottomY - 4, 1);
  }
  if (this.t > this.warnT + this.strikeT + this.stay) {
    this.dead = true;
    if (this.onEnd) this.onEnd(this, boss);
  }
};
ColumnStrike.prototype.hurts = function (p) {
  if (this.t < this.warnT || this.t > this.warnT + this.strikeT) return false;
  var f = this.kind === 'lightning' ? 1 : Math.min(1, (this.t - this.warnT) / 0.15);
  var top = this.bottomY - (this.bottomY - this.topY) * f;
  return rectHit({ x: this.x + 4, y: top, w: this.w - 8, h: this.bottomY - top }, p);
};
ColumnStrike.prototype.drawBack = function (ctx, boss) {
  if (this.t < 0) return;
  if (this.t < this.warnT) Art.strikeWarning(ctx, this.kind, this.cxp, this.topY, this.bottomY, this.t, this.w);
};
ColumnStrike.prototype.draw = function (ctx, boss) {
  if (this.t < this.warnT) return;
  var st = this.t - this.warnT;
  Art.columnStrike(ctx, this.kind, this.cxp, this.topY, this.bottomY, st, this.strikeT, this.stay, this.w, boss);
};

// Something moving horizontally at a height (tongue, shells).
function Sweeper(kind, x, y, w, h, vx, life, opts) {
  opts = opts || {};
  this.kind = kind;
  this.x = x; this.y = y; this.w = w; this.h = h;
  this.vx = vx; this.life = life;
  this.t = -(opts.delay || 0);
  this.shootable = !!opts.shootable;
  this.arena = opts.arena;
}
Sweeper.prototype.update = function (dt) {
  this.t += dt;
  if (this.t < 0) return;
  this.x += this.vx * dt;
  if (this.t > this.life) this.dead = true;
  if (this.arena && (this.x + this.w < this.arena.left - 40 || this.x > this.arena.right + 40)) this.dead = true;
};
Sweeper.prototype.hurts = function (p) { return this.t >= 0 && rectHit({ x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 6 }, p); };
Sweeper.prototype.draw = function (ctx) { if (this.t >= 0) Art.sweeper(ctx, this.kind, this.x, this.y, this.w, this.h, this.t); };

// Weather/area effect over part of the arena for a while.
// kind: 'rain' (slows), 'wind' (pushes), 'ink' (darkens)
function AreaEffect(kind, x0, x1, duration, opts) {
  opts = opts || {};
  this.kind = kind;
  this.x0 = x0; this.x1 = x1;
  this.duration = duration;
  this.t = 0;
  this.push = opts.push || 0;
  this.onlyAir = opts.onlyAir;
}
AreaEffect.prototype.update = function (dt, boss) {
  this.t += dt;
  var p = boss.world.player;
  var inside = p.x + p.w / 2 > this.x0 && p.x + p.w / 2 < this.x1;
  if (this.kind === 'rain') p.slowMul = inside ? 0.6 : 1;
  if (this.kind === 'wind') {
    var standingStill = p.onGround && !Input.down('left') && !Input.down('right') && p.standingOnOneWayOnly();
    p.extPush = inside && !standingStill ? this.push : 0;
  }
  if (this.kind === 'ink') boss.world.darkZone = { x0: this.x0, x1: this.x1, a: Math.min(1, this.t * 3, (this.duration - this.t) * 2) };
  if (this.t > this.duration) { this.dead = true; this.cleanup(boss); }
};
AreaEffect.prototype.cleanup = function (boss) {
  var p = boss.world.player;
  if (this.kind === 'rain') p.slowMul = 1;
  if (this.kind === 'wind') p.extPush = 0;
  if (this.kind === 'ink') boss.world.darkZone = null;
};
AreaEffect.prototype.drawBack = function (ctx, boss) {
  Art.areaEffect(ctx, this.kind, this.x0, this.x1, boss.arena, this.t, this.duration, this.push);
};

// Ceiling stalactite that shakes, then drops (Digger Duke).
function CeilingDrop(x, ceilY, floorY, shakeT, delay) {
  this.x = x - 10; this.w = 20; this.h = 30;
  this.y = ceilY;
  this.floorY = floorY;
  this.t = -(delay || 0);
  this.shakeT = shakeT;
  this.vy = 0;
  this.shootable = false;
}
CeilingDrop.prototype.update = function (dt) {
  this.t += dt;
  if (this.t < this.shakeT) return;
  this.vy = Math.min(900, this.vy + 1600 * dt);
  this.y += this.vy * dt;
  if (this.y + this.h >= this.floorY) {
    this.dead = true;
    FX.debris(this.x - 6, this.floorY - 30, '#8A7FA8');
    Sound.play('break');
  }
};
CeilingDrop.prototype.hurts = function (p) { return this.t >= this.shakeT && rectHit({ x: this.x + 3, y: this.y, w: this.w - 6, h: this.h }, p); };
CeilingDrop.prototype.drawBack = function (ctx) {
  if (this.t >= 0 && this.t < this.shakeT) Art.shadow(ctx, this.x + 10, this.floorY, 14, 0.2 + 0.3 * (this.t / this.shakeT));
};
CeilingDrop.prototype.draw = function (ctx) {
  if (this.t < 0) { Art.stalactite(ctx, this.x, this.y, this.w, this.h); return; }
  var sx = this.t < this.shakeT ? Math.sin(this.t * 60) * 1.8 : 0;
  Art.stalactite(ctx, this.x + sx, this.y, this.w, this.h);
};
