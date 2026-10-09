// Coins, carrots, candy, boxes' pop-outs, checkpoints, flags, stalactites,
// mine carts, cloud types, crumbling platforms, air vents and particles.

// ---------------------------------------------------------------------------
// Particles / effects
var FX = {
  list: [],
  clear: function () { this.list = []; },
  add: function (p) {
    p.t = 0;
    // Quality: Medium keeps half the particles, Low keeps only score texts and rings.
    var q = Quality.particles;
    if (q < 1 && p.k !== 'text' && p.k !== 'ring' && (q <= 0 || Math.random() > q)) return p;
    if (this.list.length > 600) this.list.shift();
    this.list.push(p);
    return p;
  },
  sparkle: function (x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 140;
      this.add({ k: 'sparkle', x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.4,
        size: 2 + Math.random() * 3, color: color || '#FFE36E', g: 120 });
    }
  },
  dust: function (x, y, n) {
    for (var i = 0; i < n; i++) {
      this.add({ k: 'dust', x: x + (Math.random() * 2 - 1) * 8, y: y - 2, vx: (Math.random() * 2 - 1) * 60, vy: -10 - Math.random() * 30,
        life: 0.35 + Math.random() * 0.2, size: 4 + Math.random() * 4, color: 'rgba(235,225,205,' });
    }
  },
  poof: function (x, y, n, tint) {
    n = n || 8;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      this.add({ k: 'poof', x: x, y: y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 70 - 20, life: 0.45, size: 7 + Math.random() * 5,
        color: tint || 'rgba(255,255,255,' });
    }
  },
  smoke: function (x, y, n) {
    for (var i = 0; i < n; i++) {
      this.add({ k: 'poof', x: x + (Math.random() * 2 - 1) * 10, y: y + (Math.random() * 2 - 1) * 10,
        vx: (Math.random() * 2 - 1) * 40, vy: -40 - Math.random() * 60, life: 0.8, size: 8 + Math.random() * 8,
        color: 'rgba(90,85,90,' });
    }
  },
  debris: function (x, y, color) {
    for (var i = 0; i < 6; i++) {
      this.add({ k: 'debris', x: x + 16, y: y + 16, vx: (i % 2 ? 1 : -1) * (60 + Math.random() * 120), vy: -250 - Math.random() * 200,
        life: 1.0, size: 6 + Math.random() * 5, color: color || '#8A5A33', g: 1400, rot: Math.random() * 6, vr: (Math.random() * 2 - 1) * 12 });
    }
  },
  bubbles: function (x, y, n) {
    for (var i = 0; i < n; i++) {
      this.add({ k: 'bubble', x: x + (Math.random() * 2 - 1) * 8, y: y, vx: (Math.random() * 2 - 1) * 20, vy: -40 - Math.random() * 50,
        life: 1.0 + Math.random() * 0.6, size: 2 + Math.random() * 3 });
    }
  },
  leaf: function (x, y) {
    this.add({ k: 'leaf', x: x, y: y, vx: (Math.random() * 2 - 1) * 30, vy: 30 + Math.random() * 30, life: 1.4,
      size: 3 + Math.random() * 2, rot: Math.random() * 6, vr: (Math.random() * 2 - 1) * 5,
      color: Math.random() < 0.5 ? '#6FBF3A' : '#A9C94A' });
  },
  text: function (x, y, str, color) {
    this.add({ k: 'text', x: x, y: y, vx: 0, vy: -50, life: 0.9, str: str, color: color || '#FFE36E' });
  },
  ring: function (x, y, color) {
    this.add({ k: 'ring', x: x, y: y, vx: 0, vy: 0, life: 0.5, color: color || '#FFFFFF' });
  },
  update: function (dt) {
    var l = this.list;
    for (var i = l.length - 1; i >= 0; i--) {
      var p = l[i];
      p.t += dt;
      if (p.t >= p.life) { l.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.g) p.vy += p.g * dt;
      if (p.k === 'dust' || p.k === 'poof') { p.vx *= 0.92; p.vy *= 0.92; }
      if (p.vr) p.rot += p.vr * dt;
    }
  },
  draw: function (ctx) {
    var l = this.list;
    for (var i = 0; i < l.length; i++) {
      var p = l[i];
      var f = p.t / p.life;
      var a = 1 - f;
      switch (p.k) {
        case 'sparkle':
          Art.sparkle(ctx, p.x, p.y, p.size * (1 - f * 0.5), p.color, a);
          break;
        case 'dust':
          ctx.fillStyle = p.color + (0.6 * a) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + f), 0, 6.283); ctx.fill();
          break;
        case 'poof':
          ctx.fillStyle = p.color + (0.85 * a) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.7 + f * 0.8), 0, 6.283); ctx.fill();
          break;
        case 'debris':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.strokeStyle = 'rgba(58,42,32,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
          break;
        case 'leaf':
          ctx.save(); ctx.translate(p.x + Math.sin(p.t * 4) * 6, p.y); ctx.rotate(p.rot);
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, 6.283); ctx.fill();
          ctx.restore();
          break;
        case 'bubble':
          ctx.strokeStyle = 'rgba(230,248,255,' + (0.8 * a) + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(p.x + Math.sin(p.t * 6) * 2, p.y, p.size, 0, 6.283); ctx.stroke();
          break;
        case 'text':
          ctx.globalAlpha = a;
          UI.text(ctx, p.str, p.x, p.y, 16, p.color, 'center');
          ctx.globalAlpha = 1;
          break;
        case 'ring':
          ctx.strokeStyle = p.color; ctx.globalAlpha = a; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(p.x, p.y, 8 + f * 40, 0, 6.283); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Base helpers
function overlapsPlayer(e, p, shrink) {
  shrink = shrink || 0;
  return p.x + shrink < e.x + e.w && p.x + p.w - shrink > e.x && p.y + shrink < e.y + e.h && p.y + p.h - shrink > e.y;
}

// ---------------------------------------------------------------------------
function Coin(x, y, crystal) {
  this.x = x + 6; this.y = y + 6; this.w = 20; this.h = 20;
  this.crystal = !!crystal;
  this.value = crystal ? 5 : 1;
  this.phase = Math.random() * 10;
  this.kind = 'coin';
}
Coin.prototype.update = function (dt, world) {
  var p = world.player;
  if (p.state === 'normal' && overlapsPlayer(this, p, -2)) {
    this.dead = true;
    world.addCoins(this.value, this.x + 10, this.y + 10);
    Sound.play(this.crystal ? 'crystal' : 'coin');
    FX.sparkle(this.x + 10, this.y + 10, this.crystal ? 10 : 5, this.crystal ? '#BFF3FF' : '#FFE36E');
  }
};
Coin.prototype.draw = function (ctx, world) {
  var t = world.t + this.phase;
  Art.coin(ctx, this.x + 10, this.y + 10 + Math.sin(t * 2.5) * 2, t, this.crystal, 1, world.t);
};

// Coin that pops out of a box (or the boss) and is collected automatically.
function PopCoin(x, y, vx, vy, delay) {
  this.x = x; this.y = y; this.vx = vx || 0; this.vy = vy || -420;
  this.t = -(delay || 0);
  this.w = 1; this.h = 1;
}
PopCoin.prototype.update = function (dt) {
  this.t += dt;
  if (this.t < 0) return;
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  this.vy += 1300 * dt;
  if (this.t > 0.5) {
    this.dead = true;
    FX.sparkle(this.x, this.y, 4);
  }
};
PopCoin.prototype.draw = function (ctx, world) {
  if (this.t < 0) return;
  Art.coin(ctx, this.x, this.y, this.t * 4, false, 1, world.t);
};

// Magic carrot / magic candy. fromBox: rises out of the box first.
function PowerItem(kind, x, y, fromBox) {
  this.kind = kind;       // 'carrot' | 'candy'
  this.x = x + 4; this.w = 24; this.h = 26;
  this.baseY = y + 4;
  this.y = fromBox ? y + 4 + TILE : this.baseY;
  this.rise = fromBox ? 0 : 1;
  this.t = Math.random() * 3;
}
PowerItem.prototype.update = function (dt, world) {
  this.t += dt;
  if (this.rise < 1) {
    this.rise = Math.min(1, this.rise + dt / 0.5);
    this.y = this.baseY + TILE * (1 - this.rise);
    return;
  }
  var p = world.player;
  if (p.state === 'normal' && overlapsPlayer(this, p)) {
    this.dead = true;
    if (this.kind === 'carrot') world.collectCarrot(this);
    else world.collectCandy(this);
  }
};
PowerItem.prototype.draw = function (ctx, world) {
  var bob = this.rise >= 1 ? Math.sin(this.t * 3) * 2 : 0;
  var cx = this.x + this.w / 2, cy = this.y + this.h / 2 + bob;
  if (this.rise < 1) {
    // Clip so it appears to come out of the box top
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x - 10, this.baseY - 20, this.w + 20, TILE + 20 - 4);
    ctx.clip();
  }
  if (this.kind === 'carrot') Art.carrot(ctx, cx, cy, this.t);
  else Art.candy(ctx, cx, cy, this.t);
  if (this.rise < 1) ctx.restore();
};

// ---------------------------------------------------------------------------
function Checkpoint(tx, ty, order) {
  this.x = tx * TILE + 8; this.y = ty * TILE - TILE; this.w = 16; this.h = TILE * 2;
  this.tx = tx; this.ty = ty;
  this.order = order;
  this.on = false;
  this.t = 0;
  this.groundY = (ty + 1) * TILE;
}
Checkpoint.prototype.update = function (dt, world) {
  this.t += dt;
  var p = world.player;
  if (!this.on && p.state === 'normal' && p.x + p.w > this.x) {
    this.on = true;
    this.t = 0;
    world.setCheckpoint(this);
  }
};
Checkpoint.prototype.draw = function (ctx) {
  Art.checkpoint(ctx, this.x + 8, this.groundY, this.on, this.t);
};

// Goal flagpole. rising: grows out of the ground after the boss is beaten.
function GoalFlag(x, groundY, rising) {
  this.x = x; this.groundY = groundY;
  this.w = 20; this.h = TILE * 5;
  this.y = groundY - this.h;
  this.rise = rising ? 0 : 1;
  this.t = 0;
  this.touched = false;
  this.isFlag = true;
}
GoalFlag.prototype.update = function (dt, world) {
  this.t += dt;
  if (this.rise < 1) {
    this.rise = Math.min(1, this.rise + dt / 1.6);
    if (Math.random() < 0.5) FX.dust(this.x + 10, this.groundY, 1);
    return;
  }
  var p = world.player;
  if (!this.touched && p.state === 'normal' && overlapsPlayer({ x: this.x - 4, y: this.y, w: this.w + 8, h: this.h }, p)) {
    this.touched = true;
    world.touchFlag(this);
  }
};
GoalFlag.prototype.draw = function (ctx, world) {
  Art.flag(ctx, this.x + 10, this.groundY, this.rise, this.t, this.touched, world.level.theme);
};

// ---------------------------------------------------------------------------
// Loose stalactite: shakes 0.7 s when the player walks underneath, then drops.
// The same falling object is used for treetop pinecones (rustle 0.7 s) and
// city cement bags (shadow + creak 1 s).
function Stalactite(tx, ty, kind) {
  this.kind = kind || 'stalactite';
  this.x = tx * TILE + 6; this.y = ty * TILE; this.w = 20; this.h = this.kind === 'bag' ? 26 : this.kind === 'pinecone' ? 24 : 30;
  this.homeY = this.y;
  this.state = 'idle';
  this.t = 0;
  this.vy = 0;
  this.warnT = this.kind === 'bag' ? 1.0 : 0.7;
}
Stalactite.prototype.update = function (dt, world) {
  var p = world.player;
  this.t += dt;
  if (this.state === 'idle') {
    var pcx = p.x + p.w / 2;
    var reach = this.kind === 'stalactite' ? 34 : 70;
    if (p.state === 'normal' && pcx > this.x - reach && pcx < this.x + this.w + reach && p.y > this.y) {
      this.state = 'shake'; this.t = 0;
      this.groundY = world.groundBelow(this.x + this.w / 2, this.y + this.h + 2);
      world.hint(this.kind, this);
      if (this.kind === 'bag') Sound.play('creak');
      else if (this.kind === 'pinecone') Sound.play('rustle');
    }
  } else if (this.state === 'shake') {
    if (this.kind === 'pinecone' && Math.random() < dt * 10) FX.leaf(this.x + 10, this.y - 6);
    if (this.t > this.warnT) { this.state = 'fall'; this.t = 0; }
  } else if (this.state === 'fall') {
    this.vy = Math.min(900, this.vy + 1600 * dt);
    this.y += this.vy * dt;
    if (p.state === 'normal' && overlapsPlayer(this, p, 3)) p.hurt(this.kind);
    var ty = Math.floor((this.y + this.h) / TILE);
    var tx = Math.floor((this.x + this.w / 2) / TILE);
    var lv = world.level;
    if (lv.solid(tx, ty) || tileOneWay(lv.get(tx, ty)) && this.y + this.h > ty * TILE + 4 || this.y > lv.ph) {
      this.dead = true;
      var col = this.kind === 'bag' ? '#D8D0C0' : this.kind === 'pinecone' ? '#8A5A33' : '#7F7A8C';
      FX.debris(this.x - 6, ty * TILE - 30, col);
      if (this.kind === 'bag') FX.poof(this.x + 10, ty * TILE, 8, 'rgba(220,215,205,');
      Sound.play('break');
    }
  }
};
Stalactite.prototype.drawBack = function (ctx) {
  if (this.kind !== 'stalactite' && this.state !== 'idle' && this.groundY) {
    var k = this.state === 'shake' ? this.t / this.warnT : 1;
    Art.shadow(ctx, this.x + this.w / 2, this.groundY, 8 + 8 * k, 0.2 + 0.35 * k);
  }
};
Stalactite.prototype.draw = function (ctx, world) {
  var sx = this.state === 'shake' ? Math.sin(this.t * 60) * 1.5 : 0;
  this.drawBack(ctx);
  if (this.kind === 'stalactite') Art.stalactite(ctx, this.x + sx, this.y, this.w, this.h);
  else Art.fallingProp(ctx, this.kind, this.x + this.w / 2 + sx, this.y + this.h / 2, this.state === 'fall' ? this.t * 4 : 0, world.t);
};

// ---------------------------------------------------------------------------
// Moving platform base (one-way from above).
function Platform(x, y, w, h) {
  this.x = x; this.y = y; this.w = w; this.h = h;
  this.dx = 0; this.dy = 0;
  this.isPlatform = true;
}
Platform.prototype.solidNow = function () { return true; };

// Mine cart: rolls back and forth on its rail row between walls.
function MineCart(tx, ty, level) {
  Platform.call(this, tx * TILE, ty * TILE, 64, 26);
  var minX = tx, maxX = tx;
  while (minX > 0 && !level.solid(minX - 1, ty) && tx - minX < 30) minX--;
  while (maxX < level.w - 1 && !level.solid(maxX + 1, ty) && maxX - tx < 30) maxX++;
  this.minX = minX * TILE;
  this.maxX = (maxX + 1) * TILE - this.w;
  this.speed = 62;
  this.dir = 1;
  this.t = 0;
  this.kind = 'cart';
}
MineCart.prototype = Object.create(Platform.prototype);
MineCart.prototype.update = function (dt) {
  this.t += dt;
  var nx = this.x + this.dir * this.speed * dt;
  if (nx > this.maxX) { nx = this.maxX; this.dir = -1; }
  if (nx < this.minX) { nx = this.minX; this.dir = 1; }
  this.dx = nx - this.x;
  this.dy = 0;
  this.x = nx;
};
MineCart.prototype.drawBack = function (ctx) {
  Art.rails(ctx, this.minX, this.maxX + this.w, this.y + 22);
};
MineCart.prototype.draw = function (ctx) {
  Art.mineCart(ctx, this.x, this.y, this.w, this.h, this.t * this.dir * this.speed / 10);
};

// Moving cloud "=" (horizontal) or "I" (vertical).
function MovingCloud(x, y, w, vertical, phase) {
  Platform.call(this, x, y, w, 20);
  this.hx = x; this.hy = y;
  this.vertical = vertical;
  this.range = vertical ? 80 : 96;
  this.period = vertical ? 4.2 : 4.8;
  this.t = phase || 0;
  this.kind = 'movingcloud';
}
MovingCloud.prototype = Object.create(Platform.prototype);
MovingCloud.prototype.update = function (dt) {
  this.t += dt;
  var o = Math.sin(this.t * Math.PI * 2 / this.period) * this.range;
  var nx = this.vertical ? this.hx : this.hx + o;
  var ny = this.vertical ? this.hy + o : this.hy;
  this.dx = nx - this.x; this.dy = ny - this.y;
  this.x = nx; this.y = ny;
};
MovingCloud.prototype.draw = function (ctx, world) {
  Art.cloudPlatform(ctx, this.x, this.y, this.w, 'white', world.t, 1);
};

// Rain cloud: rains 1 s after she lands, disappears, returns after 3 s.
function RainCloud(x, y, w) {
  Platform.call(this, x, y, w, 20);
  this.state = 'idle';
  this.t = 0;
  this.kind = 'raincloud';
}
RainCloud.prototype = Object.create(Platform.prototype);
RainCloud.prototype.solidNow = function () { return this.state !== 'gone'; };
RainCloud.prototype.onStand = function (p) {
  if (this.state === 'idle') { this.state = 'wait'; this.t = 0; p.world.hint('raincloud', this); }
};
RainCloud.prototype.update = function (dt, world) {
  this.t += dt;
  this.dx = 0; this.dy = 0;
  if (this.state === 'wait' && this.t > 1.0) { this.state = 'rain'; this.t = 0; }
  else if (this.state === 'rain' && this.t > 0.6) { this.state = 'gone'; this.t = 0; FX.poof(this.x + this.w / 2, this.y + 8, 6, 'rgba(200,205,215,'); }
  else if (this.state === 'gone' && this.t > 3.0) {
    // Only come back if the player isn't inside it.
    var p = world.player;
    if (!overlapsPlayer({ x: this.x, y: this.y - 4, w: this.w, h: this.h + 4 }, p)) { this.state = 'idle'; this.t = 0; }
  }
};
RainCloud.prototype.draw = function (ctx, world) {
  if (this.state === 'gone') {
    if (this.t > 2.4) { // fade back in as a warning it returns
      Art.cloudPlatform(ctx, this.x, this.y, this.w, 'rain', world.t, (this.t - 2.4) / 0.6 * 0.5);
    }
    return;
  }
  var wob = this.state === 'wait' ? Math.sin(this.t * 30) * (this.t) * 1.5 : 0;
  Art.cloudPlatform(ctx, this.x + wob, this.y, this.w, 'rain', world.t, 1);
  if (this.state === 'rain' || (this.state === 'wait' && this.t > 0.6)) Art.rain(ctx, this.x, this.y + 18, this.w, 60, world.t);
};

// Spring cloud: launches the player about 3x as high as a normal jump.
function SpringCloud(x, y, w) {
  Platform.call(this, x, y, w, 20);
  this.squish = 0;
  this.kind = 'spring';
}
SpringCloud.prototype = Object.create(Platform.prototype);
SpringCloud.prototype.update = function (dt) {
  this.squish = Math.max(0, this.squish - dt * 3);
};
SpringCloud.prototype.onStand = function (p) {
  p.vy = -p.springV(3);
  p.onGround = false;
  p.jumping = false;
  p.y -= 2;
  this.squish = 1;
  Sound.play('spring');
  FX.sparkle(p.x + p.w / 2, p.y + p.h, 6, '#FFB3D9');
};
SpringCloud.prototype.draw = function (ctx, world) {
  Art.cloudPlatform(ctx, this.x, this.y + this.squish * 6, this.w, 'spring', world.t, 1, this.squish);
};

// Crumbling sandstone: shakes 0.5 s after landing, falls, returns after 3 s.
function Crumble(x, y, w) {
  Platform.call(this, x, y, w, 20);
  this.state = 'idle';
  this.t = 0;
  this.fallY = 0;
  this.kind = 'crumble';
}
Crumble.prototype = Object.create(Platform.prototype);
Crumble.prototype.solidNow = function () { return this.state === 'idle' || this.state === 'shake'; };
Crumble.prototype.onStand = function (p) {
  if (this.state === 'idle') { this.state = 'shake'; this.t = 0; p.world.hint('crumble', this); }
};
Crumble.prototype.update = function (dt, world) {
  this.t += dt;
  this.dx = 0; this.dy = 0;
  if (this.state === 'shake' && this.t > 0.5) { this.state = 'fall'; this.t = 0; this.fallY = 0; Sound.play('break'); }
  else if (this.state === 'fall') {
    this.fallY += (200 + this.t * 900) * dt;
    if (this.t > 3.0) {
      var p = world.player;
      if (!overlapsPlayer({ x: this.x, y: this.y - 4, w: this.w, h: this.h + 4 }, p)) { this.state = 'idle'; this.t = 0; this.fallY = 0; }
    }
  }
};
Crumble.prototype.draw = function (ctx, world) {
  if (this.state === 'fall') {
    if (this.t < 1.2) Art.crumble(ctx, this.x, this.y + this.fallY, this.w, 1 - this.t / 1.2, 0);
    else if (this.t > 2.5) Art.crumble(ctx, this.x, this.y, this.w, (this.t - 2.5) / 0.5 * 0.5, 0);
    return;
  }
  var sh = this.state === 'shake' ? Math.sin(this.t * 70) * 1.5 : 0;
  Art.crumble(ctx, this.x + sh, this.y, this.w, 1, this.state === 'shake' ? this.t / 0.5 : 0);
};

// Air bubble vent: a column of rising bubbles that refills the air meter.
function AirVent(tx, ty, level) {
  var top = ty;
  while (top > 0 && !level.solid(tx, top - 1) && (top - 1) * TILE >= level.waterTop) top--;
  this.x = tx * TILE; this.w = TILE;
  this.y = top * TILE; this.h = (ty + 1) * TILE - this.y;
  this.t = Math.random() * 2;
  this.kind = 'vent';
}
AirVent.prototype.update = function (dt, world) {
  this.t += dt;
  var p = world.player;
  if (p.state === 'normal' && overlapsPlayer({ x: this.x + 4, y: this.y, w: this.w - 8, h: this.h }, p)) {
    if (world.air < Swim.AIR_MAX - 0.5) FX.bubbles(p.x + p.w / 2, p.y + p.h / 2, 3);
    Swim.refill(world);
  }
  if (Math.random() < dt * 8) FX.bubbles(this.x + 16, this.y + this.h - 4, 1);
};
AirVent.prototype.draw = function (ctx, world) {
  Art.airVent(ctx, this.x, this.y, this.w, this.h, world.t + this.t);
};

// ---------------------------------------------------------------------------
// Spawning from ASCII characters.
var Entities = {
  build: function (world) {
    var level = world.level;
    var spawns = level.spawns.slice();
    // Merge horizontal runs of cloud-like platform chars.
    var used = {};
    var cpOrder = 0;
    var total = 0;
    var i, s;
    spawns.sort(function (a, b) { return a.ty - b.ty || a.tx - b.tx; });
    var key = function (x, y) { return x + ',' + y; };
    var byPos = {};
    for (i = 0; i < spawns.length; i++) byPos[key(spawns[i].tx, spawns[i].ty)] = spawns[i];
    var runLen = function (s0) {
      var n = 1;
      while (byPos[key(s0.tx + n, s0.ty)] && byPos[key(s0.tx + n, s0.ty)].ch === s0.ch) {
        used[key(s0.tx + n, s0.ty)] = true;
        n++;
      }
      return n;
    };
    var checkpoints = [];
    var theme = level.theme;
    for (i = 0; i < spawns.length; i++) {
      s = spawns[i];
      if (used[key(s.tx, s.ty)]) continue;
      var x = s.tx * TILE, y = s.ty * TILE;
      switch (s.ch) {
        case 'o': world.entities.push(new Coin(x, y, false)); total += 1; break;
        case '*':
          if (theme === TH.TREETOP) world.entities.push(new Stalactite(s.tx, s.ty, 'pinecone'));
          else { world.entities.push(new Coin(x, y, true)); total += 5; }
          break;
        case 'c': world.entities.push(new PowerItem('carrot', x, y, false)); world.carrotCount++; break;
        case 'd': world.entities.push(new PowerItem('candy', x, y, false)); world.candyCount++; break;
        case 'k': checkpoints.push(s); break;
        case 'F': world.entities.push(new GoalFlag(x + 6, y + TILE, false)); break;
        case '|': world.entities.push(new Stalactite(s.tx, s.ty)); break;
        case 'n': world.platforms.push(new MineCart(s.tx, s.ty, level)); break;
        case '=': world.platforms.push(new MovingCloud(x, y, runLen(s) * TILE, false, (s.tx % 5) * 0.7)); break;
        case 'I':
          if (theme === TH.SPACE) world.entities.push(new BoostPad(s.tx, s.ty));
          else world.platforms.push(new MovingCloud(x, y, runLen(s) * TILE, true, (s.tx % 5) * 0.7));
          break;
        case 'g': world.platforms.push(new RainCloud(x, y, runLen(s) * TILE)); break;
        case '^': world.platforms.push(new SpringCloud(x, y, runLen(s) * TILE)); break;
        case '-': world.platforms.push(new Crumble(x, y, runLen(s) * TILE)); break;
        case 'a': world.entities.push(new AirVent(s.tx, s.ty, level)); break;
        // Treetop Heights
        case 'L': world.platforms.push(new LeafPlatform(x, y, runLen(s) * TILE)); break;
        case 'V': world.entities.push(new Vine(s.tx, s.ty)); break;
        case 'Y': world.entities.push(new BeeHive(s.tx, s.ty, world)); break;
        // Starlight Station
        case '@': world.platforms.push(new Asteroid(x, y, runLen(s) * TILE, s.tx)); break;
        case '!': world.entities.push(new LaserGate(s.tx, s.ty, level)); break;
        case '&': world.entities.push(new GravityWell(s.tx, s.ty)); break;
        case 'M':
          var mn = runLen(s);
          world.entities.push(new MeteorShower(x, x + mn * TILE));
          break;
        // Cement City
        case 'O': world.entities.push(new Manhole(s.tx, s.ty)); break;
        case 'G': world.platforms.push(new Girder(x, y, runLen(s) * TILE, s.tx)); break;
        case 'A': world.entities.push(new Stalactite(s.tx, s.ty, 'bag')); break;
        default:
          var e = Enemies.create(s.ch, x, y, world);
          if (e) world.enemies.push(e);
      }
    }
    checkpoints.sort(function (a, b) { return a.tx - b.tx; });
    for (i = 0; i < checkpoints.length; i++) {
      world.entities.push(new Checkpoint(checkpoints[i].tx, checkpoints[i].ty, i + 1));
    }
    world.checkpointList = checkpoints;
    // City roads: runs of road / crosswalk tiles with open space above.
    if (theme === TH.CITY) {
      var roadN = 0;
      for (var ry = 1; ry < level.h; ry++) {
        var start = -1;
        for (var rx = 0; rx <= level.w; rx++) {
          var rc = rx < level.w ? level.get(rx, ry) : T.EMPTY;
          var isRoad = (rc === T.ROAD || rc === T.CROSS) && !tileSolid(level.get(rx, ry - 1));
          if (isRoad && start < 0) start = rx;
          if (!isRoad && start >= 0) { world.entities.push(new Road(start, rx - 1, ry, roadN++)); start = -1; }
        }
      }
    }
    // Count coins hidden in boxes
    for (var j = 0; j < level.grid.length; j++) {
      if (level.grid[j] === T.QCOIN) total += 1;
      else if (level.grid[j] === T.CRACKED) total += 2;
      else if (level.grid[j] === T.QCARROT) world.carrotCount++;
      else if (level.grid[j] === T.QCANDY) world.candyCount++;
    }
    return total;
  }
};
