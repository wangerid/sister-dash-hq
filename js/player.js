// Player physics, states, small/big, character stats and Mom's long jump.

var CHARACTERS = {
  older: {
    id: 'older', name: 'Older Sister', color: '#2F4FD1', h: 46,
    speed: 1.10, jump: 1.00, shot: 'star', shotName: 'Sparkle stars',
    ability: 'Runs a little faster than everyone else.',
    desc: 'Fast runner. Shoots sparkle stars.'
  },
  younger: {
    id: 'younger', name: 'Younger Sister', color: '#7A3FB8', h: 40,
    speed: 1.00, jump: 1.10, shot: 'bubble', shotName: 'Bubbles',
    ability: 'Jumps a little higher than everyone else.',
    desc: 'High jumper. Shoots bubbles.'
  },
  dad: {
    id: 'dad', name: 'Dad', color: '#3E7A3A', h: 54,
    speed: 1.00, jump: 0.95, shot: 'boomerang', shotName: 'Boomerangs',
    breaksCracked: true,
    ability: 'Smashes cracked boxes even when small.',
    desc: 'Box smasher. Shoots boomerangs.'
  },
  mom: {
    id: 'mom', name: 'Mom', color: '#E8782A', h: 54,
    speed: 1.00, jump: 1.00, shot: 'fireball', shotName: 'Fireballs',
    longJump: true,
    ability: 'Long jump: flies about 25% further.',
    desc: 'Long jumper. Shoots fireballs.'
  }
};
var CHARACTER_ORDER = ['older', 'younger', 'dad', 'mom'];

var PHYS = {
  RUN: 210,          // px/s standard run speed
  ACC: 1900,         // ground acceleration
  DEC: 2600,         // ground deceleration (no ice sliding)
  AIR_ACC: 1500,
  GRAV: 2100,
  JUMP_V: 860,       // held jump: ~5.3 tiles; Dad clears the 4-tile power-up boxes
  CUT: 2.8,          // extra gravity multiplier while rising with jump released
  MAX_FALL: 900,
  COYOTE: 0.1,
  BUFFER: 0.1,
  STOMP_BOUNCE: 430,
  // Mom's long jump: faster air speed, lower gravity at the same apex height,
  // and a little extra hang time at the top while the jump key is held.
  MOM_AIR: 1.3,
  MOM_GRAV: 0.8,
  MOM_HANG: 0.6,
  MOM_HANG_V: 120
};

function Player(world, charId, x, y) {
  this.world = world;
  this.c = CHARACTERS[charId];
  this.charId = charId;
  this.big = false;
  this.candy = false;
  this.w = 22;
  this.h = this.c.h;
  this.x = x;
  this.y = y;
  this.vx = 0;
  this.vy = 0;
  this.facing = 1;
  this.onGround = false;
  this.ducking = false;
  this.state = 'normal';   // normal | dead | frozen | victory
  this.coyote = 0;
  this.buffer = 0;
  this.invuln = 0;
  this.shootCd = 0;
  this.shootAnim = 0;
  this.dropThrough = 0;
  this.platform = null;
  this.growT = 0;
  this.growDir = 0;
  this.animT = 0;
  this.runPhase = 0;
  this.squash = 1;
  this.squashV = 0;
  this.hair = { x: 0, y: 0, vx: 0, vy: 0 };
  this.lookAround = 0;
  this.idleT = 0;
  this.deathT = 0;
  this.prevBottom = y + this.h;
  this.inQuick = false;
  this.sunkT = 0;
  this.extPush = 0;         // wind/current push px/s (set by world each step)
  this.slowMul = 1;         // boss downpour
  this.ice = false;         // Frostbeak arena
  this.jumpHeld = false;
  this.jumping = false;
  this.gravMul = 1;
  this.swimStroke = 0;
  this.vine = null;         // treetop vine she is hanging on
  this.vineCd = 0;          // short delay before grabbing a vine again
  this.momentumT = 0;       // keeps vine-release speed for a moment
  this.cementSink = 0;      // visual sink in wet cement (px)
}

// Environment multipliers: low gravity (space), space-walk zones, wet cement.
// g = gravity, jv = jump velocity, air = air control, fall = max fall speed,
// speed = run speed.
Player.prototype.env = function () {
  var lv = this.world.level;
  var e = { g: 1, jv: 1, air: 1, fall: 1, speed: 1 };
  if (lv.lowGravity) {
    var z = lv.zoneAtPx(this.x + this.w / 2, this.y + this.h / 2);
    if (z & Z.SPACEWALK) { e.g = 0.4; e.jv = Math.sqrt(1.25 * 0.4); e.air = 0.6; e.fall = 0.45; }
    else { e.g = 0.6; e.jv = Math.sqrt(1.5 * 0.6); e.air = 0.75; e.fall = 0.6; }
  }
  if (this.inCement) { e.speed = 0.5; e.jv *= 0.6; }
  return e;
};

// Launch speed for springs / boost pads / manholes: mult x a normal jump height.
Player.prototype.springV = function (mult) {
  var gm = this.c.longJump ? PHYS.MOM_GRAV : 1;
  var e = this.env();
  return PHYS.JUMP_V * Math.sqrt(mult * this.c.jump * gm * e.g);
};

Player.prototype.standHeight = function () {
  return this.big ? Math.round(this.c.h * 1.5) : this.c.h;
};
Player.prototype.duckHeight = function () {
  return Math.round(this.standHeight() * 0.5);
};
Player.prototype.centerX = function () { return this.x + this.w / 2; };
Player.prototype.centerY = function () { return this.y + this.h / 2; };
Player.prototype.bottom = function () { return this.y + this.h; };

// Change hitbox size keeping the feet in place.
Player.prototype.resize = function (w, h) {
  var cx = this.x + this.w / 2;
  var by = this.y + this.h;
  this.w = w;
  this.h = h;
  this.x = cx - w / 2;
  this.y = by - h;
};

Player.prototype.roomToStand = function () {
  var h = this.standHeight();
  var w = this.big ? 26 : 22;
  var cx = this.x + this.w / 2;
  return !this.world.level.rectSolid(cx - w / 2, this.y + this.h - h, w, h - 1);
};

Player.prototype.setDuck = function (on) {
  if (on === this.ducking) return;
  if (on) {
    this.ducking = true;
    this.resize(this.w, this.duckHeight());
  } else {
    if (!this.roomToStand()) return;
    this.ducking = false;
    this.resize(this.big ? 26 : 22, this.standHeight());
  }
};

Player.prototype.setBig = function (big) {
  if (this.big === big) return;
  this.big = big;
  this.growT = 0.6;
  this.growDir = big ? 1 : -1;
  var w = big ? 26 : 22;
  if (this.ducking) {
    this.resize(w, this.duckHeight());
    return;
  }
  var h = this.standHeight();
  var cx = this.x + this.w / 2;
  if (big && this.world.level.rectSolid(cx - w / 2, this.y + this.h - h, w, h - 1)) {
    // No room: crouch until there is space above.
    this.ducking = true;
    this.resize(w, this.duckHeight());
  } else {
    this.resize(w, h);
  }
};

Player.prototype.canAct = function () { return this.state === 'normal'; };

Player.prototype.update = function (dt) {
  var world = this.world;
  this.animT += dt;
  if (this.invuln > 0) this.invuln -= dt;
  if (this.shootCd > 0) this.shootCd -= dt;
  if (this.shootAnim > 0) this.shootAnim -= dt;
  if (this.growT > 0) this.growT -= dt;
  if (this.dropThrough > 0) this.dropThrough -= dt;
  if (this.vineCd > 0) this.vineCd -= dt;
  if (this.momentumT > 0) this.momentumT -= dt;

  if (this.state === 'dead') {
    this.deathT += dt;
    if (this.deathT > 0.45) {
      this.vy += PHYS.GRAV * 0.8 * dt;
      this.y += this.vy * dt;
    }
    return;
  }
  if (this.state === 'frozen' || this.state === 'victory') {
    // Stand still (still affected by gravity so she lands).
    this.vx *= 0.8;
    if (Math.abs(this.vx) < 5) this.vx = 0;
    if (world.level.underwater) {
      this.vy = Math.min(this.vy + 300 * dt, 80);
    } else {
      this.vy = Math.min(this.vy + PHYS.GRAV * this.env().g * dt, PHYS.MAX_FALL);
    }
    var r0 = world.level.moveBody(this, dt, { platforms: world.platforms });
    this.platform = r0.platform;
    this.updateSecondary(dt);
    return;
  }

  // Carry along with a moving platform we stood on last step.
  if (this.platform && this.onGround) {
    this.x += this.platform.dx || 0;
    this.y += this.platform.dy || 0;
  }
  this.prevBottom = this.y + this.h;

  if (world.level.underwater) Swim.updatePlayer(this, dt);
  else if (this.vine) this.vine.updatePlayer(this, dt);
  else this.updateLand(dt);

  // Shooting (any size, needs the magic candy)
  if (this.candy && Input.hit('shoot') && this.shootCd <= 0) {
    if (Shots.count(world) < 2) {
      Shots.fire(world, this);
      this.shootCd = 0.3;
      this.shootAnim = 0.2;
    }
  }

  // Fell into a pit / off the clouds
  if (this.y > world.level.ph + 40) this.die('pit');

  this.updateSecondary(dt);
};

Player.prototype.updateLand = function (dt) {
  var world = this.world;
  var level = world.level;
  var c = this.c;
  var left = Input.down('left'), right = Input.down('right');
  var downHeld = Input.down('down');
  var jumpPressed = Input.hit('jump');
  this.jumpHeld = Input.down('jump');

  // Quicksand
  var feetZone = level.zoneAtPx(this.x + this.w / 2, this.y + this.h - 2) |
    level.zoneAtPx(this.x + this.w / 2, this.y + this.h * 0.5);
  var wasQuick = this.inQuick;
  this.inQuick = !!(feetZone & Z.QUICK);
  if (this.inQuick && !wasQuick) world.hint('quicksand', this);
  var wasCement = this.inCement;
  this.inCement = !!(level.zoneAtPx(this.x + this.w / 2, this.y + this.h - 4) & Z.CEMENT) && this.onGround;
  if (this.inCement && !wasCement) world.hint('cement', this);
  this.cementSink += ((this.inCement ? 6 : 0) - this.cementSink) * Math.min(1, dt * 8);
  var env = this.env();

  // Ducking: only on the ground; stays ducked under low ceilings.
  if (this.onGround && downHeld && !this.inQuick) this.setDuck(true);
  else if (this.ducking && (!downHeld || !this.onGround)) this.setDuck(false);

  var move = this.ducking ? 0 : (right ? 1 : 0) - (left ? 1 : 0);
  if (move !== 0) this.facing = move;

  var mom = !!c.longJump;
  var maxSpeed = PHYS.RUN * c.speed;
  if (!this.onGround && mom) maxSpeed *= PHYS.MOM_AIR;
  maxSpeed *= this.slowMul * env.speed;
  if (this.inQuick) maxSpeed *= 0.35;
  var target = move * maxSpeed;
  var acc;
  if (this.onGround) acc = move !== 0 ? PHYS.ACC : PHYS.DEC;
  else acc = PHYS.AIR_ACC * (mom ? 1.2 : 1) * env.air;
  // Right after letting go of a vine she keeps her swing speed.
  if (this.momentumT > 0 && !this.onGround && Math.abs(this.vx) > Math.abs(target) &&
      (target === 0 || (target > 0) === (this.vx > 0))) acc = 0;
  if (this.ice && this.onGround) acc *= 0.3;
  if (this.ducking && this.onGround) acc = PHYS.DEC * 0.45; // slide to a stop
  if (this.vx < target) this.vx = Math.min(target, this.vx + acc * dt);
  else if (this.vx > target) this.vx = Math.max(target, this.vx - acc * dt);

  // Jump timing helpers
  if (jumpPressed) this.buffer = PHYS.BUFFER;
  else this.buffer -= dt;
  if (this.onGround) this.coyote = PHYS.COYOTE;
  else this.coyote -= dt;

  // Drop through a thin cloud / rope bridge: hold down + jump
  if (downHeld && this.buffer > 0 && this.onGround && this.standingOnOneWayOnly()) {
    this.dropThrough = 0.25;
    this.buffer = 0;
    this.coyote = 0;
    this.y += 3;
    this.onGround = false;
    this.setDuck(false);
  }

  var gm = mom ? PHYS.MOM_GRAV : 1;
  if (this.buffer > 0 && this.coyote > 0) {
    if (this.ducking) this.setDuck(false);
    if (!this.ducking) {
      var v = PHYS.JUMP_V * Math.sqrt(c.jump * gm) * env.jv;
      if (this.inQuick) v *= 0.5;
      if (this.slowMul < 1) v *= 0.9;
      this.vy = -v;
      this.buffer = 0;
      this.coyote = 0;
      this.onGround = false;
      this.jumping = true;
      this.squash = 1.18;
      Sound.play('jump');
      FX.dust(this.x + this.w / 2, this.y + this.h, 4);
    }
  }

  // Gravity (variable jump height: releasing jump while rising cuts it short)
  var g = PHYS.GRAV * gm * env.g;
  if (this.vy < 0 && !this.jumpHeld && this.jumping) g *= PHYS.CUT;
  if (mom && this.jumpHeld && !this.onGround && Math.abs(this.vy) < PHYS.MOM_HANG_V) g *= PHYS.MOM_HANG;
  if (this.vy >= 0) this.jumping = false;
  this.vy += g * dt;
  var maxFall = this.inQuick ? 28 : PHYS.MAX_FALL * env.fall;
  if (this.vy > maxFall) this.vy = maxFall;

  var push = this.extPush;
  this.vx += push;
  var res = level.moveBody(this, dt, {
    dropThrough: this.dropThrough > 0,
    platforms: world.platforms
  });
  if (!res.wallL && !res.wallR) this.vx -= push;
  else this.vx = 0;
  this.afterMove(res);

  // Quicksand sinking
  if (this.inQuick) {
    if (this.onGround && this.vy === 0) {
      // standing on the bottom of the pit counts as sunk
    }
    var top = this.quickTop();
    if (this.y > top - 2) {
      this.sunkT += dt;
      if (this.sunkT > 3) this.die('quicksand');
    } else this.sunkT = Math.max(0, this.sunkT - dt * 2);
  } else this.sunkT = 0;
};

// Pixel y of the quicksand surface at the player's column.
Player.prototype.quickTop = function () {
  var level = this.world.level;
  var tx = Math.floor((this.x + this.w / 2) / TILE);
  var ty = Math.floor((this.y + this.h - 2) / TILE);
  while (ty > 0 && (level.zoneAt(tx, ty - 1) & Z.QUICK)) ty--;
  return ty * TILE;
};

Player.prototype.standingOnOneWayOnly = function () {
  var level = this.world.level;
  var ty = Math.floor((this.y + this.h + 1) / TILE);
  var x0 = Math.floor(this.x / TILE), x1 = Math.floor((this.x + this.w - 0.01) / TILE);
  var anyOneWay = false;
  for (var tx = x0; tx <= x1; tx++) {
    var cc = level.get(tx, ty);
    if (tileSolid(cc)) return false;
    if (tileOneWay(cc)) anyOneWay = true;
  }
  return anyOneWay;
};

Player.prototype.afterMove = function (res) {
  var world = this.world;
  this.platform = res.platform;
  if (res.head && this.vy === 0) {
    world.hitBoxFromBelow(res.head.tx, res.head.ty, this);
    this.jumping = false;
  }
  if (res.landed) {
    this.squash = 0.8;
    if (this.prevBottom < this.y + this.h - 1 || true) FX.dust(this.x + this.w / 2, this.y + this.h, 3);
  }
  if (res.platform && res.platform.onStand) res.platform.onStand(this);
};

// Small upward bounce after stomping an enemy.
Player.prototype.bounce = function (strength) {
  var v = strength || PHYS.STOMP_BOUNCE;
  if (this.world.level.underwater) v *= 0.55;
  if (Input.down('jump') && !this.world.level.underwater) v *= 1.45;
  this.vy = -v;
  this.onGround = false;
  this.jumping = true;
  this.coyote = 0;
};

Player.prototype.hurt = function (why) {
  if (this.state !== 'normal' || this.invuln > 0) return false;
  var world = this.world;
  if (this.vine) this.vine.release(this, false);
  if (world.boss && world.boss.introActive && world.boss.introActive()) return false;
  if (this.big) {
    this.candy = false;
    this.setBig(false);
    this.invuln = 1.5;
    Sound.play('shrink');
    world.pipReact('worried');
    return true;
  }
  this.die(why || 'hit');
  return true;
};

Player.prototype.die = function (why) {
  if (this.state === 'dead') return;
  if (this.vine) this.vine.release(this, false);
  this.state = 'dead';
  this.deathWhy = why;
  this.deathT = 0;
  this.vy = why === 'pit' ? -200 : -620;
  this.vx = 0;
  this.candy = false;
  Sound.play('die');
  this.world.pipReact('worried');
  this.world.onPlayerDied(why);
};

Player.prototype.updateSecondary = function (dt) {
  // Hair / hoodie-string spring: lags behind movement, settles after landing.
  var h = this.hair;
  var tx = Math.max(-10, Math.min(10, -this.vx * 0.035));
  var ty = Math.max(-8, Math.min(8, -this.vy * 0.012));
  var k = 90, damp = 10;
  h.vx += ((tx - h.x) * k - h.vx * damp) * dt;
  h.vy += ((ty - h.y) * k - h.vy * damp) * dt;
  h.x += h.vx * dt;
  h.y += h.vy * dt;
  // Squash & stretch spring back to 1
  this.squashV += ((1 - this.squash) * 260 - this.squashV * 16) * dt;
  this.squash += this.squashV * dt;
  // Run cycle phase
  if (this.onGround && Math.abs(this.vx) > 10) this.runPhase += Math.abs(this.vx) * dt / 18;
  if (Math.abs(this.vx) < 5 && this.onGround) {
    this.idleT += dt;
  } else this.idleT = 0;
};

// Current animation name for the renderer.
Player.prototype.anim = function () {
  if (this.state === 'dead') return 'hurt';
  if (this.state === 'victory') return 'victory';
  if (this.invuln > 1.3) return 'hurt';
  if (this.shootAnim > 0) return 'shoot';
  if (this.vine) return 'vine';
  if (this.world.level.underwater && !this.onGround) return 'swim';
  if (this.ducking) return 'duck';
  if (!this.onGround) return 'jump';
  if (Math.abs(this.vx) > 15) return 'run';
  return 'idle';
};
