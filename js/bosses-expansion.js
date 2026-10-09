// The three expansion bosses: Drumbeak (Treetop Heights), Fuzzmo (Starlight
// Station) and Brutus Block (Cement City), plus the hazards only they use.
// Same rules as bosses.js: telegraphed attacks, a dizzy weak moment when a
// stomp removes 1 HP, beatable by stomps alone, 3 shot hits = 1 HP.

// ---------------------------------------------------------------------------
// Hazards

// Something that bounces along the floor (acorns) or around the arena
// (Fuzzmo's sneeze stars). Disappears after `life` seconds or off the arena.
function Bouncer(kind, x, y, vx, vy, opts) {
  opts = opts || {};
  this.kind = kind;
  this.w = opts.w || 18; this.h = opts.h || 18;
  this.x = x - this.w / 2; this.y = y - this.h / 2;
  this.vx = vx; this.vy = vy;
  this.g = opts.g !== undefined ? opts.g : 1400;
  this.bounceV = opts.bounceV || 380;
  this.life = opts.life || 4;
  this.walls = !!opts.walls;
  this.t = -(opts.delay || 0);
  this.rot = 0;
  this.shootable = true;
}
Bouncer.prototype.update = function (dt, boss) {
  this.t += dt;
  if (this.t < 0) return;
  var a = boss.arena;
  this.vy += this.g * dt;
  this.x += this.vx * dt; this.y += this.vy * dt;
  this.rot += this.vx * dt / 10;
  var gy = boss.groundAt(this.x + this.w / 2);
  if (this.y + this.h > gy && this.vy > 0) { this.y = gy - this.h; this.vy = -this.bounceV; FX.dust(this.x + this.w / 2, gy, 1); }
  if (this.walls) {
    if (this.x < a.left) { this.x = a.left; this.vx = Math.abs(this.vx); }
    if (this.x + this.w > a.right) { this.x = a.right - this.w; this.vx = -Math.abs(this.vx); }
    if (this.y < a.ceilY + 10) { this.y = a.ceilY + 10; this.vy = Math.abs(this.vy); }
  } else if (this.x + this.w < a.left - 20 || this.x > a.right + 20) this.dead = true;
  if (this.t > this.life) { this.dead = true; FX.sparkle(this.x + this.w / 2, this.y + this.h / 2, 4, '#FFE36E'); }
};
Bouncer.prototype.hurts = function (p) { return this.t >= 0 && rectHit({ x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 6 }, p); };
Bouncer.prototype.draw = function (ctx) {
  if (this.t < 0) return;
  Art.bossProjectile(ctx, this.kind, this.x + this.w / 2, this.y + this.h / 2, this.rot, this.w);
};

// Fuzzmo's static sparks: float slowly toward the player for a few seconds.
function Homing(kind, x, y, speed, life, delay) {
  this.kind = kind;
  this.w = 18; this.h = 18;
  this.x = x - 9; this.y = y - 9;
  this.speed = speed; this.life = life;
  this.t = -(delay || 0);
  this.vx = 0; this.vy = 0;
  this.shootable = true;
}
Homing.prototype.update = function (dt, boss) {
  this.t += dt;
  if (this.t < 0) return;
  var p = boss.player();
  var dx = p.x + p.w / 2 - (this.x + 9), dy = p.y + p.h * 0.5 - (this.y + 9);
  var d = Math.hypot(dx, dy) || 1;
  this.vx += (dx / d * this.speed - this.vx) * Math.min(1, dt * 1.5);
  this.vy += (dy / d * this.speed - this.vy) * Math.min(1, dt * 1.5);
  this.x += this.vx * dt; this.y += this.vy * dt;
  if (this.t > this.life) { this.dead = true; FX.sparkle(this.x + 9, this.y + 9, 6, '#9FE8FF'); }
};
Homing.prototype.hurts = function (p) { return this.t >= 0 && rectHit({ x: this.x + 3, y: this.y + 3, w: 12, h: 12 }, p); };
Homing.prototype.draw = function (ctx) {
  if (this.t < 0) return;
  Art.bossProjectile(ctx, this.kind, this.x + 9, this.y + 9, this.t * 6, 20);
};

// Brutus Block's wet cement puddles: slow her down while she stands in one.
function CementSpill(spots, floorY, duration) {
  this.spots = spots; this.floorY = floorY;
  this.duration = duration; this.t = 0;
}
CementSpill.prototype.update = function (dt, boss) {
  this.t += dt;
  var p = boss.player();
  var cx = p.x + p.w / 2;
  var inside = false;
  if (this.t > 0.4 && p.onGround && Math.abs(p.y + p.h - this.floorY) < 4) {
    for (var i = 0; i < this.spots.length; i++) if (Math.abs(cx - this.spots[i]) < 40) inside = true;
  }
  p.slowMul = inside ? 0.5 : 1;
  if (this.t > this.duration) { this.dead = true; this.cleanup(boss); }
};
CementSpill.prototype.cleanup = function (boss) { boss.player().slowMul = 1; };
CementSpill.prototype.drawBack = function (ctx) {
  var a = Math.min(1, this.t * 3, (this.duration - this.t) * 2);
  for (var i = 0; i < this.spots.length; i++) Art.cementPuddle(ctx, this.spots[i], this.floorY, 84, a);
};

// Shared: fly / jump in a simple arc from (sx, sy) to (tx, ty) over time T.
function arcPos(sx, sy, tx, ty, f, height) {
  return { x: sx + (tx - sx) * f, y: sy + (ty - sy) * f - Math.sin(Math.PI * f) * height };
}

// ---------------------------------------------------------------------------
// Boss 4: Drumbeak – giant red-crested woodpecker (4 HP, 2 phases)
BOSSES.drumbeak = {
  name: 'Drumbeak', color: '#D8322E', hp: 4, coins: 32,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'drumbeak');
    b.w = 96; b.h = 64;
    b.side = 1;
    b.perch = function () {
      return { x: this.side < 0 ? this.arena.left + 4 : this.arena.right - this.w - 4, y: this.floor() - this.h - 110 };
    };
    var pp = b.perch();
    b.x = pp.x; b.y = pp.y; b.facing = -1;
    b.flyAway = true;
    b.phase = function () { return this.hp >= 3 ? 1 : 2; };
    b.sheetAnim = function () {
      return { idle: 'idle', fly: 'attack', dash: 'attack', warn: 'warn', drum: 'drum', dive: 'dive', stuck: 'dizzy',
        flap: 'acornDrop', run: 'victory', roar: 'warn' }[this.pose] || 'idle';
    };
    b.goPerch = function (dt, speed) {
      var tgt = this.perch();
      var dx = tgt.x - this.x, dy = tgt.y - this.y, d = Math.hypot(dx, dy);
      var s = speed * dt;
      if (d <= s) { this.x = tgt.x; this.y = tgt.y; return true; }
      this.x += dx / d * s; this.y += dy / d * s;
      this.facing = dx < 0 ? -1 : (dx > 0 ? 1 : this.facing);
      return false;
    };
    b.think = function (dt) {
      var p = this.player();
      var ph = this.phase();
      var a = this.arena;
      var fy = this.floor();
      var sh = p.standHeight();
      switch (this.state) {
        case 'idle':
          this.pose = 'idle';
          this.h = 64;
          this.facing = -this.side;
          if (this.goPerch(dt, 300) && this.st > (ph === 1 ? 1.0 : 0.6)) {
            this.set(nextAttack(this, ph === 1 ? ['drum', 'peck', 'peck', 'drum', 'peck'] : ['peck', 'dive', 'acorns', 'peck', 'drum', 'dive']));
          }
          break;
        case 'drum':
          // Drums on the trunk ("rat-a-tat-tat"), branches shake, bark falls.
          this.pose = 'drum';
          this.world.camera.shake = Math.max(this.world.camera.shake, 0.06);
          if (Math.floor(this.st * 12) !== Math.floor((this.st - dt) * 12)) Sound.play('drum');
          if (this.st > 1.0 && !this.substep) {
            this.substep = 1;
            var n = ph === 1 ? 4 : 5;
            var spots = spreadSpots(this, n, 110);
            var top = this.world.camera.y - 30;
            for (var i = 0; i < n; i++) {
              this.addHazard(new FallingThing('bark', spots[i], top, spots[i], this.groundAt(spots[i]), 1.2, i * 0.15,
                { arc: 0, shadowLead: 1.1, w: 18, h: 18 }));
              FX.leaf(spots[i], top + 40);
            }
          }
          if (this.st > 2.4) this.set('idle');
          break;
        case 'peck':
          // Drops to head height, pulls his head back, eyes narrow for 1 s.
          this.pose = 'warn';
          this.dashH = Math.max(12, sh * 0.32);
          var ty = fy - sh + 2;
          this.h = this.dashH;
          this.y += (ty - this.y) * Math.min(1, dt * 8);
          this.facing = -this.side;
          if (this.st > 1.15) { this.y = ty; this.set('dash'); Sound.play('screech'); }
          break;
        case 'dash':
          // Flies straight across at head height, beak first.
          this.pose = 'dash';
          this.x += this.facing * (ph === 1 ? 520 : 640) * dt;
          if (Math.random() < dt * 20) FX.leaf(this.cx() - this.facing * 40, this.y);
          if ((this.facing > 0 && this.x + this.w >= a.right) || (this.facing < 0 && this.x <= a.left)) {
            this.x = this.facing > 0 ? a.right - this.w : a.left;
            this.side = this.facing;
            this.stuck();
          }
          break;
        case 'stuck':
          // Beak stuck in the wood: flaps and wiggles for 2.5 s.
          this.pose = 'stuck';
          this.dizzy = true;
          if (this.st > 2.5) { this.dizzy = false; this.h = 64; this.set('idle'); }
          break;
        case 'dive':
          // Flies up out of sight; a red target follows her, then locks.
          this.pose = 'fly';
          this.h = 64;
          if (this.st < 0.6) { this.y -= 700 * dt; this.facing = -this.side; }
          else {
            if (this.st < 1.6) this.targetX = clampX(this, p.x + p.w / 2, 40);
            if (this.st > 1.85) { this.set('diving'); this.x = this.targetX - this.w / 2; this.y = this.world.camera.y - 120; Sound.play('screech'); }
          }
          break;
        case 'diving':
          this.pose = 'dive';
          this.y += 900 * dt;
          if (this.y + this.h >= fy) {
            this.y = fy - this.h;
            this.targetX = null;
            this.world.camera.shake = 0.35;
            FX.debris(this.cx() - 16, fy - 20, '#8A5A33');
            Sound.play('bump');
            this.stuck();
          }
          break;
        case 'acorns':
          // Flaps hard above the arena and drops 3 bouncing acorns.
          this.pose = 'flap';
          this.h = 64;
          var hx = a.midX() - this.w / 2, hy = fy - 300;
          this.x += (hx - this.x) * Math.min(1, dt * 3);
          this.y += (hy - this.y) * Math.min(1, dt * 3);
          if (this.st > 1.0 && this.substep < 3 && this.st > 1.0 + this.substep * 0.35) {
            var dir = (this.substep % 2 ? 1 : -1) * (p.x + p.w / 2 < this.cx() ? -1 : 1);
            this.addHazard(new Bouncer('acorn', this.cx(), this.y + this.h, dir * (110 + this.substep * 30), 0, { w: 18, h: 20, bounceV: 330, life: 6 }));
            this.substep++;
            Sound.play('shoot');
          }
          if (this.st > 2.3) { this.side = p.x + p.w / 2 < a.midX() ? 1 : -1; this.set('idle'); }
          break;
      }
    };
    b.stuck = function () {
      Sound.play('bosshit');
      this.world.camera.shake = Math.max(this.world.camera.shake, 0.3);
      FX.debris(this.facing > 0 ? this.x + this.w - 10 : this.x - 10, this.y, '#8A5A33');
      this.set('stuck');
    };
    b.hurtbox = function () {
      if (this.state === 'dive' && this.st < 1.85) return null;
      return { x: this.x + 8, y: this.y + 2, w: this.w - 16, h: Math.max(10, this.h - 2) };
    };
    b.headY = function () { return this.y - 16; };
    b.onDamaged = function () { this.dizzy = false; this.h = 64; this.set('idle'); };
    b.drawShadow = function (ctx) {
      if (this.targetX !== null && this.targetX !== undefined && (this.state === 'dive' || this.state === 'diving')) {
        Art.diveTarget(ctx, this.targetX, this.floor(), this.world.t, this.state === 'diving' || this.st > 1.6);
      }
    };
    return b;
  }
};

// ---------------------------------------------------------------------------
// Boss 8: Fuzzmo – giant fluffy lime-green space creature (5 HP, 3 phases)
BOSSES.fuzzmo = {
  name: 'Fuzzmo', color: '#8ED63A', hp: 5, coins: 50,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'fuzzmo');
    b.w = 104; b.h = 92;
    b.x = arena.right - 190; b.y = arena.floorY - b.h;
    b.flyAway = true;
    b.phase = function () { return this.hp >= 4 ? 1 : (this.hp >= 2 ? 2 : 3); };
    b.sheetAnim = function () {
      return { idle: 'idle', warn: 'warn', squish: 'warn', jump: 'bounce', roll: 'tumble', wobble: 'warn', dizzy: 'dizzy',
        sparks: 'sparks', sneeze: 'sneeze', run: 'saucer', roar: 'special' }[this.pose] || 'idle';
    };
    b.think = function (dt) {
      var p = this.player();
      var ph = this.phase();
      var a = this.arena;
      var fy = this.floor();
      var px = p.x + p.w / 2;
      switch (this.state) {
        case 'idle':
          this.pose = 'idle';
          this.y = fy - this.h;
          this.faceTo(px);
          if (this.st > [0, 1.1, 0.85, 0.7][ph]) {
            var list = ph === 1 ? ['bounce', 'tumble', 'bounce', 'tumble'] :
              ph === 2 ? ['bounce', 'sparks', 'tumble', 'bounce', 'tumble'] : ['sneeze', 'tumble', 'bounce', 'sparks', 'tumble'];
            this.set(nextAttack(this, list));
          }
          break;
        case 'bounce':
          // Squishes flat, fur puffs out; a shadow appears under her.
          this.pose = 'squish';
          this.shadowX = clampX(this, px, this.w / 2);
          if (this.st > 1.0) { this.set('jump'); this.sx = this.x; this.tx = this.shadowX - this.w / 2; Sound.play('boing'); }
          break;
        case 'jump':
          this.pose = 'jump';
          var T = 1.15;
          var f = Math.min(1, this.st / T);
          var pos = arcPos(this.sx, fy - this.h, this.tx, fy - this.h, f, 230);
          this.x = pos.x; this.y = pos.y;
          if (f >= 1) {
            this.shadowX = null;
            this.world.camera.shake = 0.3;
            Sound.play('boing');
            this.addHazard(new FloorWave('boing', this.x - 26, fy, -1, 230, 18, a));
            this.addHazard(new FloorWave('boing', this.x + this.w, fy, 1, 230, 18, a));
            this.set('idle');
          }
          break;
        case 'tumble':
          // Wobbles and rolls up into a perfect fur ball...
          this.pose = 'wobble';
          this.faceTo(px);
          this.wob = Math.sin(this.st * 24) * 3;
          if (this.st > 1.0) { this.set('roll'); this.rollDir = this.facing; this.wob = 0; Sound.play('rumble'); }
          break;
        case 'roll':
          // ...rolls fast across and bumps into the dome wall.
          this.pose = 'roll';
          this.x += this.rollDir * [0, 380, 450, 520][ph] * dt;
          if (Math.random() < dt * 14) FX.sparkle(this.cx(), this.y + this.h, 1, '#C8FF7A');
          if (this.x <= a.left) { this.x = a.left; this.bump(); }
          else if (this.x + this.w >= a.right) { this.x = a.right - this.w; this.bump(); }
          break;
        case 'dizzy':
          this.pose = 'dizzy';
          this.dizzy = true;
          if (this.st > 2.5) { this.dizzy = false; this.set('idle'); }
          break;
        case 'sparks':
          // Rubs its fur, crackles, antennae glow; sparks float toward her.
          this.pose = 'sparks';
          if (Math.random() < dt * 20) FX.sparkle(this.cx() + (Math.random() - 0.5) * this.w, this.y + Math.random() * 30, 1, '#9FE8FF');
          if (this.st > 1.0 && !this.substep) {
            this.substep = 1;
            var n = ph === 3 ? 4 : 3;
            for (var i = 0; i < n; i++) {
              this.addHazard(new Homing('spark', this.cx() + (i - (n - 1) / 2) * 30, this.y + 10, 70, 4.0, i * 0.2));
            }
            Sound.play('zap');
          }
          if (this.st > 1.8) this.set('idle');
          break;
        case 'sneeze':
          // "ah... ah... ah..." then sneezes 5 stars in a fan.
          this.pose = this.st < 1.2 ? 'warn' : 'sneeze';
          this.faceTo(px);
          if (this.st > 1.2 && !this.substep) {
            this.substep = 1;
            Sound.play('sneeze');
            for (var k = 0; k < 5; k++) {
              var ang = -0.15 - k * 0.22;
              var sp = 240;
              this.addHazard(new Bouncer('star', this.cx() + this.facing * 40, this.y + 30,
                this.facing * Math.cos(ang) * sp, Math.sin(ang) * sp, { g: 500, bounceV: 300, walls: true, life: 3.6, w: 18, h: 18 }));
            }
          }
          if (this.st > 2.0) this.set('idle');
          break;
      }
    };
    b.bump = function () {
      Sound.play('bosshit');
      this.world.camera.shake = 0.4;
      FX.poof(this.rollDir > 0 ? this.x + this.w : this.x, this.y + this.h / 2, 8, 'rgba(200,255,140,');
      this.facing = -this.rollDir;
      this.set('dizzy');
    };
    b.hurtbox = function () { return { x: this.x + 10, y: this.y + 12, w: this.w - 20, h: this.h - 12 }; };
    b.headY = function () { return this.y + 6; };
    b.drawShadow = function (ctx) {
      if (this.shadowX !== null && this.shadowX !== undefined) Art.shadow(ctx, this.shadowX, this.floor(), 50, 0.45);
    };
    var baseDefeated = b.updateDefeated;
    b.updateDefeated = function (dt) {
      // Shrinks into a tiny fuzzball, hops into a flying saucer and zooms away.
      baseDefeated.call(this, dt);
      if (this.st > 0.6) this.y -= 60 * dt;
    };
    return b;
  }
};

// ---------------------------------------------------------------------------
// Boss 10: Brutus Block – huge angry cement block (7 HP, 3 phases)
BOSSES.brutus = {
  name: 'Brutus Block', color: '#9A958C', hp: 7, coins: 60,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'brutus');
    b.w = 104; b.h = 96;
    b.x = arena.right - 190; b.y = arena.floorY - b.h;
    b.phase = function () { return this.hp >= 6 ? 1 : (this.hp >= 3 ? 2 : 3); };
    b.sheetAnim = function () {
      return { idle: 'idle', crouch: 'warn', jump: 'slam', wobble: 'warn', tumble: 'tumble', dizzy: 'dizzy',
        rubble: 'rubbleThrow', spill: 'cementSpill', roar: 'roar', run: 'victory' }[this.pose] || 'idle';
    };
    b.minions = function () {
      var n = 0, en = this.world.enemies;
      for (var i = 0; i < en.length; i++) if (en[i].bossMinion && !en[i].dead && !en[i].dying) n++;
      return n;
    };
    b.think = function (dt) {
      var p = this.player();
      var ph = this.phase();
      var a = this.arena;
      var fy = this.floor();
      var px = p.x + p.w / 2;
      switch (this.state) {
        case 'idle':
          this.pose = 'idle';
          this.y = fy - this.h;
          this.faceTo(px);
          if (this.st > [0, 1.0, 0.8, 0.6][ph]) {
            var list = ph === 1 ? ['slam', 'rubble', 'tumble'] :
              ph === 2 ? ['slam', 'spill', 'tumble', 'rubble', 'tumble'] :
              ['pebbles', 'slam', 'tumble', 'spill', 'slam', 'rubble', 'tumble'];
            var nx = nextAttack(this, list);
            if (nx === 'pebbles' && this.minions() > 0) nx = 'slam';
            this.slamsLeft = ph === 3 ? 2 : 1;
            this.set(nx);
          }
          break;
        case 'slam':
          // Crouches, eyebrows go down; a shadow appears under her.
          this.pose = 'crouch';
          this.shadowX = clampX(this, px, this.w / 2);
          if (this.st > (this.slamsLeft === 1 && ph === 3 && this.substep ? 0.55 : 1.0)) {
            this.set('jump'); this.sx = this.x; this.tx = this.shadowX - this.w / 2; Sound.play('roar');
          }
          break;
        case 'jump':
          this.pose = 'jump';
          var f = Math.min(1, this.st / 0.95);
          var pos = arcPos(this.sx, fy - this.h, this.tx, fy - this.h, f, 260);
          this.x = pos.x; this.y = pos.y;
          if (f >= 1) {
            this.shadowX = null;
            this.world.camera.shake = 0.5;
            Sound.play('slam');
            FX.debris(this.cx() - 16, fy - 20, '#B8B2A6');
            this.addHazard(new FloorWave('shock', this.x - 26, fy, -1, 300, 18, a));
            this.addHazard(new FloorWave('shock', this.x + this.w, fy, 1, 300, 18, a));
            this.slamsLeft--;
            if (this.slamsLeft > 0) { this.set('slam'); this.substep = 1; }
            else this.set('idle');
          }
          break;
        case 'tumble':
          this.pose = 'wobble';
          this.faceTo(px);
          this.wob = Math.sin(this.st * 20) * 4;
          if (this.st > 1.0) { this.set('roll'); this.rollDir = this.facing; this.wob = 0; Sound.play('rumble'); }
          break;
        case 'roll':
          // Tips over and tumbles end-over-end, crashing into the fence.
          this.pose = 'tumble';
          this.x += this.rollDir * [0, 360, 430, 500][ph] * dt;
          if (Math.random() < dt * 20) FX.dust(this.cx() - this.rollDir * 40, fy, 1);
          if (this.x <= a.left) { this.x = a.left; this.crash(); }
          else if (this.x + this.w >= a.right) { this.x = a.right - this.w; this.crash(); }
          break;
        case 'dizzy':
          this.pose = 'dizzy';
          this.dizzy = true;
          if (Math.random() < dt * 6) FX.dust(this.cx() + (Math.random() - 0.5) * 60, this.y + 10, 1);
          if (this.st > 2.0) { this.dizzy = false; this.set('idle'); }
          break;
        case 'rubble':
          // Breaks off chunks of himself and throws 3 in arcs.
          this.pose = 'rubble';
          if (this.st > 0.9 && !this.substep) {
            this.substep = 1;
            var spots = spreadSpots(this, 3, 120);
            for (var i = 0; i < 3; i++) {
              this.addHazard(new FallingThing('rubble', this.cx(), this.y + 10, spots[i], this.groundAt(spots[i]), 1.3, i * 0.15,
                { arc: 220, shadowLead: 1.1, w: 20, h: 18, shootable: true }));
            }
            Sound.play('shoot');
          }
          if (this.st > 2.3) this.set('idle');
          break;
        case 'spill':
          // Shakes, grey drips run down; 2-3 puddles of wet cement for 5 s.
          this.pose = 'spill';
          if (this.st > 0.9 && !this.substep) {
            this.substep = 1;
            var ns = ph === 3 ? 3 : 2;
            var ps = spreadSpots(this, ns, 190);
            this.addHazard(new CementSpill(ps, fy, 5.0));
            for (var s = 0; s < ns; s++) FX.poof(ps[s], fy - 6, 6, 'rgba(170,165,155,');
            Sound.play('splash');
          }
          if (this.st > 1.6) this.set('idle');
          break;
        case 'pebbles':
          // Roars, cracks appear: 2 pebble friends join the fight.
          this.pose = 'roar';
          if (this.st > 1.0 && !this.substep) {
            this.substep = 1;
            for (var k = 0; k < 2; k++) {
              var e = EnemyTypes.pebble(this.cx() + (k ? 50 : -80), fy - TILE);
              e.ctor = EnemyTypes.pebble; e.active = true; e.bossMinion = true; e.vy = -300;
              this.world.enemies.push(e);
            }
            this.world.camera.shake = 0.4;
            Sound.play('roar');
          }
          if (this.st > 1.6) this.set('idle');
          break;
      }
    };
    b.crash = function () {
      Sound.play('slam');
      this.world.camera.shake = 0.5;
      FX.debris(this.rollDir > 0 ? this.x + this.w - 16 : this.x - 16, this.y, '#B8B2A6');
      FX.poof(this.rollDir > 0 ? this.x + this.w : this.x, this.y + this.h / 2, 10, 'rgba(210,205,195,');
      this.facing = -this.rollDir;
      this.set('dizzy');
    };
    b.hurtbox = function () { return { x: this.x + 8, y: this.y + 10, w: this.w - 16, h: this.h - 10 }; };
    b.headY = function () { return this.y + 4; };
    b.drawShadow = function (ctx) {
      if (this.shadowX !== null && this.shadowX !== undefined) Art.shadow(ctx, this.shadowX, this.floor(), 54, 0.5);
    };
    return b;
  }
};
