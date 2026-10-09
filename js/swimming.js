// Underwater physics, the air meter and water currents (level 6).
var Swim = {
  GRAV: 330,
  MAX_SINK: 105,
  FAST_SINK: 250,
  STROKE: 265,
  SPEED: 0.7,     // of normal run speed
  ACC: 620,       // lower acceleration = a little drift when changing direction
  AIR_MAX: 30,    // seconds
  CURRENT: 95,    // px/s push

  updatePlayer: function (p, dt) {
    var world = p.world;
    var level = world.level;
    var left = Input.down('left'), right = Input.down('right');
    var downHeld = Input.down('down');
    var stroke = Input.hit('jump');
    p.jumpHeld = Input.down('jump');

    // Duck on the sea floor, otherwise ↓ sinks faster.
    if (p.onGround && downHeld) p.setDuck(true);
    else if (p.ducking && (!downHeld || !p.onGround)) p.setDuck(false);

    var move = p.ducking ? 0 : (right ? 1 : 0) - (left ? 1 : 0);
    if (move !== 0) p.facing = move;
    var maxSpeed = PHYS.RUN * p.c.speed * this.SPEED * (p.c.longJump && !p.onGround ? 1.12 : 1);
    var target = move * maxSpeed;
    var acc = p.onGround ? PHYS.ACC * 0.6 : this.ACC;
    if (p.ducking) acc = PHYS.DEC * 0.3;
    if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt);
    else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);

    if (stroke && !p.ducking) {
      p.vy = -this.STROKE * Math.sqrt(p.c.jump);
      p.onGround = false;
      p.swimStroke = 0.35;
      Sound.play('swim');
      FX.bubbles(p.x + p.w / 2, p.y + 6, 3);
    }
    if (p.swimStroke > 0) p.swimStroke -= dt;

    p.vy += this.GRAV * dt;
    var maxSink = downHeld && !p.onGround ? this.FAST_SINK : this.MAX_SINK;
    if (p.vy > maxSink) p.vy = Math.max(maxSink, p.vy - 900 * dt);

    // Currents
    var z = level.zoneAtPx(p.x + p.w / 2, p.y + p.h / 2);
    var push = p.extPush;
    if (z & Z.CUR_L) push -= this.CURRENT;
    if (z & Z.CUR_R) push += this.CURRENT;

    p.vx += push;
    var res = level.moveBody(p, dt, { platforms: world.platforms });
    if (!res.wallL && !res.wallR) p.vx -= push;
    else p.vx = 0;

    // The water surface: she can't leave the water.
    if (p.y < level.waterTop) {
      p.y = level.waterTop;
      if (p.vy < 0) p.vy = 0;
    }
    p.afterMove(res);
  },

  // Air meter: returns true while air is draining.
  updateAir: function (world, dt) {
    var p = world.player;
    if (!world.level.underwater || p.state !== 'normal') return;
    if (world.arena && world.arena.active()) return;  // paused during the boss fight
    var before = world.air;
    world.air = Math.max(0, world.air - dt);
    var bubbles = Math.ceil(world.air / (this.AIR_MAX / 10));
    var bubblesBefore = Math.ceil(before / (this.AIR_MAX / 10));
    if (bubbles <= 3 && bubbles !== bubblesBefore) Sound.play('warn');
    if (world.air <= 0) p.die('air');
  },

  refill: function (world) {
    if (world.air < this.AIR_MAX - 0.5) Sound.play('bubble');
    world.air = this.AIR_MAX;
  }
};
