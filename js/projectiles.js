// Shared bouncing-shot logic. Four looks (stars, bubbles, boomerangs,
// fireballs), identical behaviour: thrown slightly downward, bounces along the
// ground in ~1-tile hops, max 2 on screen, disappears at walls / off-screen.

var SHOT_STYLE = { star: 'sparkle', bubble: 'bubble', boomerang: 'spin', fireball: 'smoke' };
var SHOT_COLOR = { star: '#FFE36E', bubble: '#BFE8FF', boomerang: '#C49A6C', fireball: '#FF7A2A' };

function Shot(world, p) {
  var water = world.level.underwater;
  this.kind = p.c.shot;
  this.dir = p.facing;
  this.w = 14; this.h = 14;
  this.x = p.x + p.w / 2 + this.dir * 12 - 7;
  this.y = p.ducking ? p.y + p.h - 18 : p.y + p.h * 0.4;
  this.speed = water ? 190 : 380;
  this.grav = water ? 420 : 1500;
  this.bounceV = water ? 165 : 310;       // ~1 tile hop (v^2 / 2g)
  this.vx = this.dir * this.speed;
  this.vy = water ? 40 : 160;             // thrown slightly downward
  if (world.level.lowGravity) {           // space: higher, slower hops
    this.speed *= 0.85; this.vx = this.dir * this.speed;
    this.grav *= 0.6; this.bounceV *= Math.sqrt(1.5 * 0.6);
  }
  this.dist = 0;
  this.range = VIEW_W;
  this.t = 0;
  this.onGround = false;
}

Shot.prototype.update = function (dt, world) {
  this.t += dt;
  this.vx = this.dir * this.speed;
  this.vy = Math.min(this.vy + this.grav * dt, 700);
  var res = world.level.moveBody(this, dt, { platforms: world.platforms });
  this.dist += this.speed * dt;
  if (this.onGround) { this.vy = -this.bounceV; this.onGround = false; }
  if (res.ceiling) this.vy = 40;
  if (res.wallL || res.wallR) { this.pop(); return; }
  var cam = world.camera;
  if (this.dist > this.range || this.x < cam.x - 30 || this.x > cam.x + VIEW_W + 30 || this.y > world.level.ph) {
    this.dead = true;
    return;
  }
  // Enemies
  for (var i = 0; i < world.enemies.length; i++) {
    var e = world.enemies[i];
    if (e.dead || e.dying || !e.active || !e.canTouch()) continue;
    var hb = e.hitbox();
    if (this.x < hb.x + hb.w && this.x + this.w > hb.x && this.y < hb.y + hb.h && this.y + this.h > hb.y) {
      e.kill(world, SHOT_STYLE[this.kind], this.dir);
      if (e.type !== 'pellet' && !e.bossMinion) world.addCoins(1, e.x + e.w / 2, e.y);
      this.pop(true);
      return;
    }
  }
  // Boss
  if (world.boss && world.boss.shotHit && world.boss.overlapsShot(this)) {
    world.boss.shotHit(this);
    this.pop(true);
    return;
  }
  // Boss hazards that can be shot down (rolling spines etc.)
  if (world.boss && world.boss.hazards) {
    var hz = world.boss.hazards;
    for (var j = 0; j < hz.length; j++) {
      var h = hz[j];
      if (h.shootable && !h.dead && this.x < h.x + h.w && this.x + this.w > h.x && this.y < h.y + h.h && this.y + this.h > h.y) {
        h.dead = true;
        FX.poof(h.x + h.w / 2, h.y + h.h / 2, 6);
        this.pop(true);
        return;
      }
    }
  }
};

Shot.prototype.pop = function (hit) {
  this.dead = true;
  var cx = this.x + this.w / 2, cy = this.y + this.h / 2;
  if (this.kind === 'bubble') FX.ring(cx, cy, '#DFF4FF');
  else if (this.kind === 'fireball') FX.smoke(cx, cy, 3);
  else FX.sparkle(cx, cy, 5, SHOT_COLOR[this.kind]);
  if (hit) Sound.play('shothit');
};

Shot.prototype.draw = function (ctx, world) {
  Art.shot(ctx, this.kind, this.x + this.w / 2, this.y + this.h / 2, this.t, this.dir, world.t);
};

var Shots = {
  count: function (world) { return world.shots.length; },
  fire: function (world, p) {
    world.shots.push(new Shot(world, p));
    Sound.play('shoot');
  },
  update: function (world, dt) {
    var l = world.shots;
    for (var i = l.length - 1; i >= 0; i--) {
      l[i].update(dt, world);
      if (l[i].dead) l.splice(i, 1);
    }
  }
};
