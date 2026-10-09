// The original seven bosses and their attacks (the three expansion bosses are in bosses-expansion.js). Each boss is built on Boss (boss.js).
// Every attack is telegraphed, every boss has a weak (dizzy) moment when a
// stomp on its head removes 1 hit point, and all can be beaten by stomps alone.

var BOSSES = {};

// Small helper: cycles through an attack list.
function nextAttack(b, list) {
  b.cycle = (b.cycle === undefined ? -1 : b.cycle) + 1;
  return list[b.cycle % list.length];
}
function clampX(b, x, margin) {
  margin = margin || 0;
  return Math.max(b.arena.left + margin, Math.min(b.arena.right - margin, x));
}
// Spread n target spots around the player's x (one right at the player).
function spreadSpots(b, n, gap) {
  var p = b.player();
  var px = clampX(b, p.x + p.w / 2, 30);
  var spots = [px];
  var side = Math.random() < 0.5 ? -1 : 1;
  for (var i = 1; i < n; i++) {
    var k = Math.ceil(i / 2) * (i % 2 ? side : -side);
    var x = px + k * gap + (Math.random() * 2 - 1) * 16;
    if (x < b.arena.left + 30 || x > b.arena.right - 30) x = px - k * gap * 1.4;
    spots.push(clampX(b, x, 30));
  }
  return spots;
}

// ---------------------------------------------------------------------------
// Boss 1: Big Bristle – giant grumpy hedgehog (easy, 3 HP, 1 phase)
BOSSES.bristle = {
  name: 'Big Bristle', color: '#6E625A', hp: 3, coins: 20,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'bristle');
    b.w = 96; b.h = 72;
    b.x = arena.right - 170; b.y = arena.floorY - b.h;
    b.roll = 0;
    b.shakeNext = false;
    b.think = function (dt) {
      var p = this.player();
      switch (this.state) {
        case 'idle':
          this.pose = 'idle';
          this.faceTo(p.x + p.w / 2);
          if (this.st > 1.3) {
            if (this.hp <= 1 && this.shakeNext) this.set('shake');
            else this.set('curl');
          }
          break;
        case 'curl':
          // Warning: curls into a ball and wobbles for 1.5 s.
          this.pose = 'curl';
          this.wobble = Math.sin(this.st * 22) * 3;
          if (this.st > 1.5) { this.set('roll'); this.rollDir = this.facing; Sound.play('rumble'); }
          break;
        case 'roll':
          this.pose = 'roll';
          this.x += this.rollDir * 290 * dt;
          this.roll += this.rollDir * 290 * dt / 36;
          if (Math.random() < dt * 20) FX.dust(this.cx() - this.rollDir * 40, this.floor(), 1);
          if (this.x <= this.arena.left) { this.x = this.arena.left; this.bump(); }
          else if (this.x + this.w >= this.arena.right) { this.x = this.arena.right - this.w; this.bump(); }
          break;
        case 'dizzy':
          this.pose = 'dizzy';
          this.dizzy = true;
          if (this.st > 2.5) { this.dizzy = false; this.shakeNext = true; this.set('idle'); }
          break;
        case 'shake':
          // Warning: shakes and puffs up, then 3 slow spines fly up in an arc.
          this.pose = 'shake';
          if (this.st > 1.0 && !this.substep) {
            this.substep = 1;
            var spots = spreadSpots(this, 3, 110);
            for (var i = 0; i < 3; i++) {
              this.addHazard(new FallingThing('spine', this.cx(), this.y + 10, spots[i], this.groundAt(spots[i]), 1.6, i * 0.12,
                { arc: 230, shadowLead: 1.2, w: 16, h: 22, shootable: true }));
            }
            Sound.play('shoot');
          }
          if (this.st > 3.0) { this.shakeNext = false; this.set('idle'); }
          break;
      }
    };
    b.bump = function () {
      Sound.play('bosshit');
      this.world.camera.shake = 0.4;
      FX.poof(this.rollDir > 0 ? this.x + this.w : this.x, this.y + this.h / 2, 8);
      this.facing = -this.rollDir;
      this.set('dizzy');
    };
    b.hurtbox = function () {
      if (this.pose === 'curl' || this.pose === 'roll') return { x: this.x + 8, y: this.y + 8, w: this.w - 16, h: this.h - 8 };
      return { x: this.x + 6, y: this.y + 10, w: this.w - 12, h: this.h - 10 };
    };
    b.headY = function () { return this.y + 4; };
    return b;
  }
};

// ---------------------------------------------------------------------------
// Boss 2: Digger Duke – giant mole in a miner's helmet (3 HP, 2 phases)
BOSSES.duke = {
  name: 'Digger Duke', color: '#8C6A4F', hp: 3, coins: 25,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'duke');
    b.w = 84; b.h = 80;
    b.x = arena.right - 180; b.y = arena.floorY - b.h;
    b.sink = 0;       // 0 = standing, 1 = fully underground
    b.phase = function () { return this.hp >= 2 ? 1 : 2; };
    b.think = function (dt) {
      var p = this.player();
      var ph = this.phase();
      var fy = this.floor();
      switch (this.state) {
        case 'idle':
          this.pose = 'idle';
          this.sink = Math.max(0, this.sink - dt * 3);
          this.faceTo(p.x + p.w / 2);
          if (this.st > (ph === 1 ? 1.1 : 0.7)) this.set(nextAttack(this, ph === 1 ? ['dig', 'toss', 'dig'] : ['dig', 'quake', 'dig', 'toss']));
          break;
        case 'dig':
          // Dives into the ground; a dirt mound moves toward the player.
          this.pose = 'dig';
          this.sink = Math.min(1, this.st / 0.5);
          if (this.st > 0.5) { this.set('mound'); this.mx = this.cx(); Sound.play('rumble'); }
          break;
        case 'mound':
          this.pose = 'hidden';
          var speed = ph === 1 ? 150 : 240;
          var px = clampX(this, p.x + p.w / 2, this.w / 2);
          var d = px - this.mx;
          var step = Math.max(-speed * dt, Math.min(speed * dt, d));
          // Mounds can't pass under the rock ledges
          var nx = this.mx + step + (step > 0 ? 30 : -30);
          if (!this.world.level.solid(Math.floor(nx / TILE), this.arena.floorRow - 1)) this.mx += step;
          if (Math.random() < dt * 25) FX.dust(this.mx, fy, 1);
          if (Math.abs(d) < 6 || this.st > 3.0) this.set('rumble');
          break;
        case 'rumble':
          this.pose = 'hidden';
          if (Math.random() < dt * 40) FX.dust(this.mx + (Math.random() * 2 - 1) * 20, fy, 1);
          if (this.st > 0.5) {
            this.set('pop');
            this.x = clampX(this, this.mx - this.w / 2, 0);
            if (this.x + this.w > this.arena.right) this.x = this.arena.right - this.w;
            Sound.play('break');
            FX.debris(this.cx() - 16, fy - 20, '#8C6A4F');
            this.world.camera.shake = 0.3;
          }
          break;
        case 'pop':
          // Bursts up (harmful), then gets stuck with his helmet crooked.
          this.pose = 'pop';
          this.sink = Math.max(0.3, 1 - this.st / 0.2);
          if (this.st > 0.25) { this.set('stuck'); }
          break;
        case 'stuck':
          this.pose = 'dizzy';
          this.dizzy = true;
          this.sink = 0.3;
          if (this.st > 2.0) { this.dizzy = false; this.set('idle'); }
          break;
        case 'toss':
          // Scoops up rocks, lamp flashes, throws 2 rocks in slow arcs.
          this.pose = 'toss';
          if (this.st > 0.9 && !this.substep) {
            this.substep = 1;
            var spots = spreadSpots(this, 2, 120);
            for (var i = 0; i < 2; i++) {
              this.addHazard(new FallingThing('rock', this.cx() + this.facing * 20, this.y + 10, spots[i], this.groundAt(spots[i]), 1.5, i * 0.25,
                { arc: 200, shadowLead: 1.2, w: 24, h: 24, shootable: true }));
            }
          }
          if (this.st > 2.2) this.set('idle');
          break;
        case 'quake':
          // Phase 2: stamps his feet, the screen rumbles, stalactites drop.
          this.pose = 'stamp';
          if (this.st < 0.9) this.world.camera.shake = Math.max(this.world.camera.shake, 0.1);
          if (this.st > 0.4 && !this.substep) {
            this.substep = 1;
            Sound.play('rumble');
            var s2 = spreadSpots(this, 4, 150);
            for (var j = 0; j < s2.length; j++) {
              this.addHazard(new CeilingDrop(s2[j], this.arena.ceilY, this.groundAt(s2[j]), 0.9, j * 0.2));
            }
          }
          if (this.st > 2.6) this.set('idle');
          break;
      }
      this.y = fy - this.h + this.sink * this.h;
    };
    b.hurtbox = function () {
      if (this.state === 'mound' || this.state === 'rumble' || this.sink > 0.95) return null;
      var visH = this.h * (1 - this.sink);
      return { x: this.x + 8, y: fy() - visH + 4, w: this.w - 16, h: visH - 4 };
      function fy() { return b.floor(); }
    };
    b.headY = function () { return this.floor() - this.h * (1 - this.sink) - 4; };
    b.onDamaged = function () { this.dizzy = false; this.set('dig'); this.sink = 0.3; };
    return b;
  }
};

// ---------------------------------------------------------------------------
// Boss 3: Queen Croakia – giant frog with a leaf crown (4 HP, 2 phases)
BOSSES.croakia = {
  name: 'Queen Croakia', color: '#4F9A3C', hp: 4, coins: 30,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'croakia');
    b.w = 104; b.h = 80;
    b.x = arena.right - 190; b.y = arena.floorY - b.h;
    b.phase = function () { return this.hp >= 3 ? 1 : 2; };
    b.think = function (dt) {
      var p = this.player();
      var ph = this.phase();
      var fy = this.floor();
      switch (this.state) {
        case 'idle':
          this.pose = 'idle';
          this.y = fy - this.h;
          this.faceTo(p.x + p.w / 2);
          if (this.st > (ph === 1 ? 1.3 : 0.8)) this.set(nextAttack(this, ph === 1 ? ['jump'] : ['jump', 'tongue', 'jump', 'tadpole']));
          break;
        case 'jump':
          // Crouch and puff cheeks for 1 s; shadow marks where she'll land.
          this.pose = 'crouch';
          if (!this.substep) {
            this.substep = 1;
            this.jx0 = this.x;
            this.jx1 = clampX(this, p.x + p.w / 2, this.w / 2 + 4) - this.w / 2;
            this.shadowX = this.jx1 + this.w / 2;
          }
          if (this.st > (ph === 1 ? 1.0 : 0.75)) { this.set('air'); Sound.play('jump'); }
          break;
        case 'air':
          this.pose = 'leap';
          var T = ph === 1 ? 1.2 : 0.95;
          var f = Math.min(1, this.st / T);
          this.x = this.jx0 + (this.jx1 - this.jx0) * f;
          this.y = fy - this.h - Math.sin(Math.PI * f) * 280;
          if (f >= 1) {
            this.y = fy - this.h;
            this.shadowX = null;
            this.set('stuck');
            Sound.play('rumble');
            this.world.camera.shake = 0.4;
            FX.dust(this.x + 10, fy, 6); FX.dust(this.x + this.w - 10, fy, 6);
            // Ground shock both ways (always follows a big jump)
            this.addHazard(new FloorWave('shock', this.x - 20, fy, -1, 260, 18, this.arena));
            this.addHazard(new FloorWave('shock', this.x + this.w - 6, fy, 1, 260, 18, this.arena));
          }
          break;
        case 'stuck':
          this.pose = 'dizzy';
          this.dizzy = true;
          if (this.st > 2.0) { this.dizzy = false; this.set('idle'); }
          break;
        case 'tongue':
          // Opens her mouth, eyes glow, then the tongue shoots straight across.
          this.pose = 'mouth';
          if (!this.substep) {
            this.substep = 1;
            this.faceTo(p.x + p.w / 2);
            var sh = p.standHeight();
            this.tongueY = fy - sh + 6;
            this.tongueH = Math.max(10, sh * 0.3);
          }
          if (this.st > 0.9 && this.substep === 1) {
            this.substep = 2;
            var mouthX = this.facing > 0 ? this.x + this.w - 16 : this.x + 16;
            this.addHazard(new Tongue(this, mouthX, this.tongueY, this.tongueH, this.facing));
            Sound.play('shoot');
          }
          if (this.st > 2.1) this.set('idle');
          break;
        case 'tadpole':
          // Croaks loudly; 2 small frogs hop into the arena.
          this.pose = 'croak';
          if (this.st > 0.8 && !this.substep) {
            this.substep = 1;
            Sound.play('roar');
            var xs = [this.arena.left + 8, this.arena.right - 40];
            for (var i = 0; i < 2; i++) {
              var fr = EnemyTypes.frog(xs[i], fy - 32 - 64);
              fr.ctor = EnemyTypes.frog;
              fr.active = true;
              fr.bossMinion = true;
              this.world.enemies.push(fr);
            }
          }
          if (this.st > 1.8) this.set('idle');
          break;
      }
    };
    b.hurtbox = function () { return { x: this.x + 8, y: this.y + 12, w: this.w - 16, h: this.h - 12 }; };
    b.headY = function () { return this.y + 6; };
    b.drawShadow = function (ctx) {
      if (this.shadowX !== null && this.shadowX !== undefined) Art.shadow(ctx, this.shadowX, this.floor(), 50, 0.45);
    };
    return b;
  }
};

// The queen's tongue: extends across the arena, holds, then retracts.
function Tongue(boss, x, y, h, dir) {
  this.boss = boss;
  this.sx = x; this.y = y; this.h = h; this.dir = dir;
  this.len = 0;
  this.t = 0;
  this.maxLen = dir > 0 ? boss.arena.right - x : x - boss.arena.left;
  this.x = x; this.w = 1;
}
Tongue.prototype.update = function (dt) {
  this.t += dt;
  var f;
  if (this.t < 0.3) f = this.t / 0.3;
  else if (this.t < 0.6) f = 1;
  else f = Math.max(0, 1 - (this.t - 0.6) / 0.3);
  this.len = this.maxLen * f;
  this.w = Math.max(1, this.len);
  this.x = this.dir > 0 ? this.sx : this.sx - this.len;
  if (this.t > 0.9) this.dead = true;
};
Tongue.prototype.hurts = function (p) { return this.len > 4 && rectHit({ x: this.x, y: this.y + 2, w: this.w, h: this.h - 4 }, p); };
Tongue.prototype.draw = function (ctx) { Art.tongue(ctx, this.sx, this.y, this.h, this.len, this.dir); };

// ---------------------------------------------------------------------------
// Boss 4: Grumblecloud – huge angry storm cloud (4 HP, 3 phases)
BOSSES.grumblecloud = {
  name: 'Grumblecloud', color: '#5E6675', hp: 4, coins: 35,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'grumblecloud');
    b.w = 150; b.h = 88;
    b.hoverY = arena.floorY - 300;
    b.lowY = arena.floorY - 94;
    b.x = arena.midX() - b.w / 2; b.y = b.hoverY;
    b.flyAway = true;
    b.phase = function () { return this.hp >= 3 ? 1 : (this.hp === 2 ? 2 : 3); };
    b.bolt = function (x, delay) {
      var bottom = this.groundAt(x);
      return this.addHazard(new ColumnStrike('lightning', x, this.hoverY + this.h - 10, bottom, 1.0, 0.35, 30, { delay: delay || 0 }));
    };
    b.think = function (dt) {
      var p = this.player();
      var ph = this.phase();
      var px = p.x + p.w / 2;
      var hovering = this.state !== 'weak' && this.state !== 'rise';
      if (hovering) {
        var tx = clampX(this, px, this.w / 2) - this.w / 2;
        this.x += Math.max(-60 * dt, Math.min(60 * dt, tx - this.x));
        this.y += (this.hoverY + Math.sin(this.t * 1.5) * 8 - this.y) * Math.min(1, dt * 3);
        this.faceTo(px);
      }
      switch (this.state) {
        case 'idle':
          this.pose = 'idle';
          if (this.st > 1.2) {
            var list = ph === 1 ? ['bolt', 'downpour'] : ph === 2 ? ['bolt', 'gust', 'downpour'] : ['storm', 'gust', 'bolt'];
            this.set(nextAttack(this, list));
          }
          break;
        case 'bolt':
          // Crackles, a flickering line marks the floor for 1 s, then the bolt.
          this.pose = 'crackle';
          if (!this.substep) {
            this.substep = 1;
            this.strike = this.bolt(clampX(this, px, 20));
            Sound.play('warn');
          }
          if (this.strike && this.strike.dead) this.set('weak');
          break;
        case 'downpour':
          // Frowns, turns darker; heavy rain on the player's half for 3 s.
          this.pose = 'frown';
          if (this.st > 1.0 && !this.substep) {
            this.substep = 1;
            var mid = this.arena.midX();
            var leftSide = px < mid;
            this.addHazard(new AreaEffect('rain', leftSide ? this.arena.left : mid, leftSide ? mid : this.arena.right, 3.0));
          }
          if (this.st > 1.6) this.set('bolt');
          break;
        case 'gust':
          // Puffs out his cheeks, then blows toward a wall for 2 s.
          this.pose = 'puff';
          if (this.st > 0.9 && !this.substep) {
            this.substep = 1;
            var dir = px < this.cx() ? -1 : 1;
            this.addHazard(new AreaEffect('wind', this.arena.left, this.arena.right, 2.0, { push: dir * 175 }));
            Sound.play('rumble');
          }
          if (this.st > 1.4) this.set('bolt');
          break;
        case 'storm':
          // Phase 3: rumbles and flashes; 3 bolts strike left to right.
          this.pose = 'crackle';
          if (this.st < 0.8 && Math.random() < dt * 4) this.world.flashT = 0.08;
          if (this.st > 0.8 && !this.substep) {
            this.substep = 1;
            Sound.play('rumble');
            var a = this.arena;
            var xs = [a.left + 150, a.midX(), a.right - 150];
            this.strikes = [];
            for (var i = 0; i < 3; i++) this.strikes.push(this.bolt(xs[i], i * 0.6));
          }
          if (this.strikes && this.substep && this.strikes[2].dead) { this.strikes = null; this.set('weak'); }
          break;
        case 'weak':
          // Out of energy: sinks low, pale and puffy for 2 s. Stomp him!
          this.pose = 'weak';
          this.dizzy = true;
          this.y += (this.lowY - this.y) * Math.min(1, dt * 5);
          if (this.st > 2.4) { this.dizzy = false; this.set('rise'); }
          break;
        case 'rise':
          this.pose = 'idle';
          this.y += (this.hoverY - this.y) * Math.min(1, dt * 3);
          if (this.st > 0.9) this.set('idle');
          break;
      }
    };
    b.onDamaged = function () { this.dizzy = false; this.set('rise'); };
    b.hurtbox = function () { return { x: this.x + 14, y: this.y + 12, w: this.w - 28, h: this.h - 22 }; };
    b.headY = function () { return this.y + 4; };
    return b;
  }
};

// ---------------------------------------------------------------------------
// Boss 5: Frostbeak – giant snow owl (5 HP, 2 phases). Slippery ice floor.
BOSSES.frostbeak = {
  name: 'Frostbeak', color: '#9FC4E0', hp: 5, coins: 40,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'frostbeak');
    b.w = 88; b.h = 76;
    b.hoverY = arena.floorY - 300;
    b.x = arena.midX() - b.w / 2; b.y = b.hoverY;
    b.flyAway = true;
    world.player.ice = true;
    b.phase = function () { return this.hp >= 3 ? 1 : 2; };
    b.snow = function (n) {
      var spots = spreadSpots(this, n, 100);
      var top = this.world.camera.y - 30;
      for (var i = 0; i < spots.length; i++) {
        this.addHazard(new FallingThing('snowball', spots[i], top, spots[i], this.groundAt(spots[i]), 1.3, i * 0.15,
          { arc: 0, shadowLead: 1.1, w: 22, h: 22, shootable: true }));
      }
    };
    b.think = function (dt) {
      var p = this.player();
      var ph = this.phase();
      var px = p.x + p.w / 2;
      var fy = this.floor();
      p.ice = true;
      switch (this.state) {
        case 'idle':
          this.pose = 'fly';
          this.x += (this.arena.midX() + Math.sin(this.t * 0.7) * 250 - this.w / 2 - this.x) * Math.min(1, dt * 1.5);
          this.y += (this.hoverY + Math.sin(this.t * 2.5) * 10 - this.y) * Math.min(1, dt * 3);
          this.faceTo(px);
          if (this.st > (ph === 1 ? 1.2 : 0.8)) this.set(nextAttack(this, ph === 1 ? ['snow', 'dive'] : ['windsnow', 'dive', 'snow', 'dive']));
          break;
        case 'snow':
          // Hoots and flaps hard, then drops snowballs (shadows show where).
          this.pose = 'flap';
          if (this.st > 0.8 && !this.substep) { this.substep = 1; this.snow(ph === 1 ? 3 : 5); Sound.play('warn'); }
          if (this.st > 2.4) this.set('idle');
          break;
        case 'windsnow':
          // Phase 2: spreads wings wide and blows toward the edge, with snow.
          this.pose = 'wings';
          if (this.st > 0.8 && !this.substep) {
            this.substep = 1;
            var dir = px < this.arena.midX() ? -1 : 1;
            this.addHazard(new AreaEffect('wind', this.arena.left, this.arena.right, 3.0, { push: dir * 110 }));
            this.snow(4);
          }
          if (this.st > 3.4) this.set('idle');
          break;
        case 'dive':
          // Screeches and flies to the edge of the screen...
          this.pose = 'fly';
          if (!this.substep) {
            this.substep = 1;
            this.side = px < this.arena.midX() ? 1 : -1;   // start on the side away from the player
            this.ex = this.side > 0 ? this.arena.right - this.w - 10 : this.arena.left + 10;
            Sound.play('roar');
          }
          this.x += (this.ex - this.x) * Math.min(1, dt * 4);
          this.y += (this.hoverY + 40 - this.y) * Math.min(1, dt * 4);
          this.facing = -this.side;
          if (this.st > 0.7) this.set('hover');
          break;
        case 'hover':
          // ...hovers still for 1 s (warning)...
          this.pose = 'screech';
          if (this.st > 1.0) {
            this.set('swoop');
            this.sx = this.x; this.sy = this.y;
            this.tx = this.side > 0 ? this.arena.left + 20 : this.arena.right - this.w - 20;
            this.ty = fy - this.h;
          }
          break;
        case 'swoop':
          // ...then swoops diagonally down across the arena into a snowdrift.
          this.pose = 'swoop';
          var T = ph === 1 ? 1.15 : 0.85;
          var f = Math.min(1, this.st / T);
          this.x = this.sx + (this.tx - this.sx) * f;
          this.y = this.sy + (this.ty - this.sy) * f;
          if (f >= 1) {
            this.set('stuck');
            FX.poof(this.cx(), fy - 10, 12);
            Sound.play('rumble');
            this.world.camera.shake = 0.3;
          }
          break;
        case 'stuck':
          this.pose = 'dizzy';
          this.dizzy = true;
          this.y = fy - this.h + 16;
          if (this.st > 2.0) { this.dizzy = false; this.set('up'); }
          break;
        case 'up':
          this.pose = 'fly';
          this.y += (this.hoverY - this.y) * Math.min(1, dt * 3);
          if (this.st > 1.0) this.set('idle');
          break;
      }
    };
    b.onDamaged = function () { this.dizzy = false; this.set('up'); };
    b.hurtbox = function () { return { x: this.x + 10, y: this.y + 8, w: this.w - 20, h: this.h - 14 }; };
    b.headY = function () { return this.y + 2; };
    var baseCleanup = b.cleanupHazards;
    b.cleanupHazards = function () { baseCleanup.call(this); this.world.player.ice = false; };
    return b;
  }
};

// ---------------------------------------------------------------------------
// Boss 6: Admiral Octavia – giant purple octopus in an admiral's hat (5 HP, 3 phases)
BOSSES.octavia = {
  name: 'Admiral Octavia', color: '#8A4FB8', hp: 5, coins: 45,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'octavia');
    b.w = 120; b.h = 96;
    b.homeY = arena.floorY - 250;
    b.x = arena.midX() - b.w / 2; b.y = b.homeY;
    b.flyAway = true;
    b.phase = function () { return this.hp >= 4 ? 1 : (this.hp >= 2 ? 2 : 3); };
    b.slam = function (x) {
      var fy = this.groundAt(x);
      return this.addHazard(new ColumnStrike('tentacle', x, fy - 200, fy, 1.0, 0.5, 34, { stay: 3.2 }));
    };
    b.think = function (dt) {
      var p = this.player();
      var ph = this.phase();
      var px = p.x + p.w / 2;
      var a = this.arena;
      // Gentle current toward the middle of the arena
      p.extPush = px < a.midX() - 20 ? 35 : (px > a.midX() + 20 ? -35 : 0);
      var drift = this.dizzy ? 0 : Math.sin(this.t * 0.5) * 140;
      this.x += (a.midX() + drift - this.w / 2 - this.x) * Math.min(1, dt * 1.2);
      var ty = this.homeY + (this.dizzy ? 40 : 0) + Math.sin(this.t * 1.7) * 8;
      this.y += (ty - this.y) * Math.min(1, dt * 2);
      this.faceTo(px);
      switch (this.state) {
        case 'idle':
          this.pose = 'idle';
          if (this.st > (ph === 1 ? 1.3 : 0.9)) {
            var list = ph === 1 ? ['slam'] : ph === 2 ? ['slam', 'ink', 'slam'] : ['slam2', 'shells', 'slam2', 'ink'];
            this.set(nextAttack(this, list));
          }
          break;
        case 'slam':
        case 'slam2':
          // Bubbles rise from the sea floor for 1 s, then a tentacle shoots up.
          this.pose = 'slam';
          if (!this.substep) {
            this.substep = 1;
            var x1 = clampX(this, px, 24);
            this.strikes = [this.slam(x1)];
            if (this.state === 'slam2') {
              var x2 = x1 + (x1 < a.midX() ? 170 : -170);
              this.strikes.push(this.slam(clampX(this, x2, 24)));
            }
          }
          if (this.strikes && this.strikes[0].t > this.strikes[0].warnT + this.strikes[0].strikeT) {
            this.strikes = null;
            this.set('dizzy');
          }
          break;
        case 'dizzy':
          // Tentacle stuck in the sand: dizzy for 4 s (longest of all bosses).
          this.pose = 'dizzy';
          this.dizzy = true;
          if (this.st > 4.0) { this.dizzy = false; this.set('idle'); }
          break;
        case 'ink':
          // Puffs up and turns dark; ink darkens half the arena for 4 s.
          this.pose = 'puff';
          if (this.st > 0.9 && !this.substep) {
            this.substep = 1;
            var left = px < a.midX();
            this.addHazard(new AreaEffect('ink', left ? a.left : a.midX(), left ? a.midX() : a.right, 4.0));
            FX.smoke(this.cx(), this.y + this.h, 10);
          }
          if (this.st > 1.4) this.set('idle');
          break;
        case 'shells':
          // Grabs shells with 3 tentacles and throws them slowly across.
          this.pose = 'shells';
          if (this.st > 1.0 && !this.substep) {
            this.substep = 1;
            var fy2 = this.floor();
            var dir = px < this.cx() ? -1 : 1;
            var hs = [fy2 - 50, fy2 - 150, fy2 - 250];
            for (var i = 0; i < 3; i++) {
              var sx = dir > 0 ? this.x + this.w - 10 : this.x - 16;
              this.addHazard(new Sweeper('shell', sx, hs[i], 26, 20, dir * 115, 12, { delay: i * 0.35, shootable: true, arena: a }));
            }
            Sound.play('shoot');
          }
          if (this.st > 2.2) this.set('idle');
          break;
      }
    };
    b.hurtbox = function () { return { x: this.x + 12, y: this.y + 6, w: this.w - 24, h: this.h - 16 }; };
    b.headY = function () { return this.y + 2; };
    b.onDamaged = function () { this.dizzy = false; this.set('idle'); };
    return b;
  }
};

// ---------------------------------------------------------------------------
// Boss 7: King Sandclaw – giant sand scorpion with a golden crown (6 HP, 3 phases)
BOSSES.sandclaw = {
  name: 'King Sandclaw', color: '#D9A441', hp: 6, coins: 55,
  create: function (world, arena) {
    var b = new Boss(world, arena, 'sandclaw');
    b.w = 128; b.h = 78;
    b.x = arena.right - 200; b.y = arena.floorY - b.h;
    b.phase = function () { return this.hp >= 5 ? 1 : (this.hp >= 3 ? 2 : 3); };
    b.think = function (dt) {
      var p = this.player();
      var ph = this.phase();
      var px = p.x + p.w / 2;
      var fy = this.floor();
      this.y = fy - this.h;
      switch (this.state) {
        case 'idle':
          this.pose = 'idle';
          this.faceTo(px);
          if (this.st > [0, 1.2, 0.9, 0.7][ph]) {
            var list = ph === 1 ? ['charge', 'stingers'] : ph === 2 ? ['charge', 'stingers', 'charge'] : ['charge', 'wave', 'stingers', 'charge', 'wave'];
            this.set(nextAttack(this, list));
          }
          break;
        case 'charge':
          // Stamps and scrapes his feet, then charges into the wall.
          this.pose = 'stamp';
          this.faceTo(px);
          if (Math.random() < dt * 20) FX.dust(this.cx() - this.facing * 50, fy, 1);
          if (this.st > [0, 1.0, 0.8, 0.65][ph]) { this.set('run'); this.runDir = this.facing; Sound.play('roar'); }
          break;
        case 'run':
          this.pose = 'run';
          this.x += this.runDir * [0, 320, 400, 470][ph] * dt;
          if (Math.random() < dt * 30) FX.dust(this.cx() - this.runDir * 50, fy, 1);
          if (this.x <= this.arena.left) { this.x = this.arena.left; this.crash(); }
          else if (this.x + this.w >= this.arena.right) { this.x = this.arena.right - this.w; this.crash(); }
          break;
        case 'dizzy':
          this.pose = 'dizzy';
          this.dizzy = true;
          if (this.st > 2.0) { this.dizzy = false; this.set('idle'); }
          break;
        case 'stingers':
          // Raises his tail, it glows, then stingers fall in 3-5 spots.
          this.pose = 'tail';
          if (this.st > 1.0 && !this.substep) {
            this.substep = 1;
            var n = [0, 3, 4, 5][ph];
            var spots = spreadSpots(this, n, 95);
            var top = this.world.camera.y - 30;
            for (var i = 0; i < n; i++) {
              this.addHazard(new FallingThing('stinger', spots[i], top, spots[i], this.groundAt(spots[i]), 1.25, i * 0.12,
                { arc: 0, shadowLead: 1.1, w: 14, h: 26, shootable: true }));
            }
            Sound.play('warn');
          }
          if (this.st > 2.6) this.set('idle');
          break;
        case 'wave':
          // Phase 3: slams the ground (it shakes), a low sand wave rolls out.
          this.pose = 'slam';
          if (this.st < 0.8) this.world.camera.shake = Math.max(this.world.camera.shake, 0.08);
          if (this.st > 0.8 && !this.substep) {
            this.substep = 1;
            this.faceTo(px);
            var wx = this.facing > 0 ? this.x + this.w : this.x - 26;
            this.addHazard(new FloorWave('sand', wx, fy, this.facing, 280, 22, this.arena));
            Sound.play('rumble');
          }
          if (this.st > 1.8) this.set('idle');
          break;
      }
    };
    b.crash = function () {
      Sound.play('bosshit');
      this.world.camera.shake = 0.5;
      FX.poof(this.runDir > 0 ? this.x + this.w : this.x, this.y + this.h / 2, 10);
      FX.debris(this.runDir > 0 ? this.x + this.w - 16 : this.x - 16, this.y, '#D9B77A');
      this.set('dizzy');
    };
    b.hurtbox = function () { return { x: this.x + 8, y: this.y + 14, w: this.w - 16, h: this.h - 14 }; };
    b.headY = function () { return this.y + 6; };
    return b;
  }
};

var BOSS_ORDER = LEVEL_DEFS.map(function (d) { return d.boss; });
