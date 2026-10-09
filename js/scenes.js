// Scenes: loading, title, character select, level select, play (with pause),
// level complete and game over. Also the World that runs one level.

// ---------------------------------------------------------------------------
// World: all state for one level being played.
function World(levelIndex, charId) {
  this.levelIndex = levelIndex;
  this.charId = charId;
  this.def = LEVELS[levelIndex - 1];
  this.level = new Level(this.def, levelIndex);
  this.entities = [];
  this.enemies = [];
  this.platforms = [];
  this.shots = [];
  this.t = 0;
  this.coins = 0;
  this.lives = 3;
  this.carrotCount = 0;
  this.candyCount = 0;
  this.bumps = {};
  this.banner = null;
  this.flashT = 0;
  this.darkness = 0;
  this.darkZone = null;
  this.state = 'play';
  this.deathT = 0;
  this.hintScanT = 0;
  FX.clear();
  var total = Entities.build(this);
  this.totalCoins = total + (this.def.boss ? BOSSES[this.def.boss].coins : 0);
  var st = this.level.start;
  var c = CHARACTERS[charId];
  this.player = new Player(this, charId, st.tx * TILE + 5, (st.ty + 1) * TILE - c.h);
  this.camera = new Camera(this.level);
  this.camera.follow(this.player, 1 / 60, true);
  this.checkpoint = null;
  this.arena = this.level.bossCol >= 0 && this.def.boss ? new Arena(this, this.level.bossCol) : null;
  this.boss = null;
  this.timer = new LevelTimer(this.def.timeLimit, Store.setting('timeChallenge'));
  this.air = Swim.AIR_MAX;
  this.pip = new Pip(this);
  this.coinLifeNext = 100;
  WorldRender.prepare(this);
  if (this.level.underwater) this.hint('swim');
  if (this.level.lowGravity) this.hint('space');
}

World.prototype.showBanner = function (text, sub, color, life, size) {
  this.banner = { text: text, sub: sub, color: color, t: 0, life: life || 2, size: size };
};

World.prototype.update = function (dt) {
  var p = this.player;
  this.t += dt;
  if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
  if (this.flashT > 0) this.flashT -= dt;
  for (var k in this.bumps) { this.bumps[k] += dt; if (this.bumps[k] > 0.16) delete this.bumps[k]; }

  if (this.state === 'complete') {
    this.completeT += dt;
    p.update(dt);
    this.updateEntities(dt);
    FX.update(dt);
    this.camera.follow(p, dt);
    this.pip.update(dt);
    if (this.completeT > 1 && Math.random() < dt * 6) FX.sparkle(p.x + p.w / 2 + (Math.random() - 0.5) * 80, p.y - Math.random() * 60, 3);
    return;
  }

  // Timer (not during the boss intro)
  var intro = this.arena && this.arena.state === 'intro';
  if (p.state === 'normal' && !intro) {
    if (this.timer.update(dt) === 'timeup') this.timesUp();
  }

  var i;
  for (i = 0; i < this.platforms.length; i++) this.platforms[i].update(dt, this);

  // Wind zones push the player (boss arenas control their own wind)
  if (!(this.arena && this.arena.active())) {
    var z = this.level.zoneAtPx(p.x + p.w / 2, p.y + p.h / 2);
    p.extPush = (z & Z.WIND) ? (this.def.windDir || 1) * 125 : 0;
    if (z & Z.WIND) this.hint('wind');
  }

  p.update(dt);

  // Darker cave tunnels
  var d = 0;
  if (this.def.dark) {
    var ptx = (p.x + p.w / 2) / TILE;
    for (i = 0; i < this.def.dark.length; i++) {
      var r = this.def.dark[i];
      if (ptx > r[0] - 3 && ptx < r[1] + 3) d = Math.max(d, Math.min(1, (ptx - (r[0] - 3)) / 3, ((r[1] + 3) - ptx) / 3));
    }
  }
  this.darkness += (d - this.darkness) * Math.min(1, dt * 4);

  this.updateEntities(dt);
  Enemies.update(this, dt);
  Enemies.collide(this);
  Shots.update(this, dt);
  if (this.arena) this.arena.update(dt);
  if (this.boss) this.boss.update(dt);
  Swim.updateAir(this, dt);
  FX.update(dt);
  this.camera.follow(p, dt);
  this.pip.update(dt);

  this.hintScanT -= dt;
  if (this.hintScanT <= 0) { this.hintScanT = 0.4; this.scanHints(); }

  if (p.state === 'dead') {
    this.deathT += dt;
    if (this.deathT > 1.8) this.respawn();
  }
};

World.prototype.updateEntities = function (dt) {
  var cam = this.camera;
  for (var i = this.entities.length - 1; i >= 0; i--) {
    var e = this.entities[i];
    if (e.x !== undefined && !e.isFlag && !(e instanceof PopCoin) && (e.x > cam.x + VIEW_W + 200 || e.x + (e.w || 0) < cam.x - 300)) continue;
    e.update(dt, this);
    if (e.dead) this.entities.splice(i, 1);
  }
};

// Look for box types and hazards on screen to trigger Pip's first-time hints.
World.prototype.scanHints = function () {
  var level = this.level, cam = this.camera;
  var x0 = Math.floor((cam.x + 60) / TILE), x1 = Math.floor((cam.x + VIEW_W - 100) / TILE);
  for (var ty = 0; ty < level.h; ty++) {
    for (var tx = x0; tx <= x1; tx++) {
      var c = level.get(tx, ty);
      if (c === T.QCOIN || c === T.QCARROT) this.hint('qbox');
      else if (c === T.QCANDY) this.hint('candybox');
      else if (c === T.CRACKED) this.hint(this.player.c.breaksCracked ? 'crackedDad' : 'cracked');
      else if (c === T.THIN && level.theme === TH.CLOUD) this.hint('thin');
      var z = level.zoneAt(tx, ty);
      if (z & (Z.CUR_L | Z.CUR_R)) this.hint('current');
    }
  }
  for (var i = 0; i < this.entities.length; i++) {
    var e = this.entities[i];
    if (!e.kind || !cam.visible(e.x, e.y, e.w, e.h, -80)) continue;
    if (e.kind === 'carrot') this.hint('carrot');
    if (e.kind === 'vent') this.hint('vent');
  }
  for (var j = 0; j < this.platforms.length; j++) {
    var pl = this.platforms[j];
    if (!cam.visible(pl.x, pl.y, pl.w, pl.h, -80)) continue;
    if (pl.kind === 'cart') this.hint('cart');
    if (pl.kind === 'spring') this.hint('spring');
  }
  if (this.def.bonusHintCol && Math.abs(this.player.x / TILE - this.def.bonusHintCol) < 6 && this.player.c.longJump) this.hint('bonus');
};

World.prototype.hint = function (id) {
  if (this.pip) this.pip.say(id);
};

World.prototype.pipReact = function (m) { if (this.pip) this.pip.react(m); };

World.prototype.groundBelow = function (x, fromY) {
  var level = this.level;
  var tx = Math.floor(x / TILE);
  for (var ty = Math.max(0, Math.floor(fromY / TILE)); ty < level.h; ty++) {
    var c = level.get(tx, ty);
    if (tileSolid(c) || tileOneWay(c) || (level.zoneAt(tx, ty) & Z.QUICK)) return ty * TILE;
  }
  return level.ph;
};

World.prototype.addCoins = function (n, x, y, big) {
  this.coins += n;
  if (n > 1 && x !== undefined) FX.text(x, y - 10, '+' + n);
  if (Store.setting('coinLife') && this.coins >= this.coinLifeNext) {
    this.coinLifeNext += 100;
    this.lives++;
    Sound.play('oneup');
    FX.text(this.player.x + this.player.w / 2, this.player.y - 20, '1 UP!', '#7CFF9A');
  }
  if (Math.random() < 0.3) this.pipReact('happy');
};

World.prototype.hitBoxFromBelow = function (tx, ty, p) {
  var level = this.level;
  var code = level.get(tx, ty);
  if (!tileIsBox(code)) return;
  var key = tx + ',' + ty;
  var x = tx * TILE, y = ty * TILE;
  // Knock enemies standing on the box
  for (var i = 0; i < this.enemies.length; i++) {
    var e = this.enemies[i];
    if (e.dying || e.dead) continue;
    if (Math.abs(e.y + e.h - y) < 4 && e.x + e.w > x && e.x < x + TILE) e.kill(this, 'poof');
  }
  switch (code) {
    case T.QCOIN:
      level.set(tx, ty, T.USED);
      this.bumps[key] = 0;
      this.entities.push(new PopCoin(x + 16, y - 6, 0, -420));
      this.addCoins(1);
      Sound.play('coin');
      break;
    case T.QCARROT:
      level.set(tx, ty, T.USED);
      this.bumps[key] = 0;
      var it = new PowerItem('carrot', x, y - TILE, true);
      it.fromBox = true; it.homeKey = key;
      this.entities.push(it);
      Sound.play('item');
      break;
    case T.QCANDY:
      level.set(tx, ty, T.USED);
      this.bumps[key] = 0;
      var cd = new PowerItem('candy', x, y - TILE, true);
      cd.fromBox = true; cd.homeKey = key;
      this.entities.push(cd);
      Sound.play('item');
      break;
    case T.CRACKED:
      if (p.big || p.c.breaksCracked) {
        level.set(tx, ty, T.EMPTY);
        FX.debris(x, y, '#B07A48');
        Sound.play('break');
        this.entities.push(new PopCoin(x + 10, y, -40, -380));
        this.entities.push(new PopCoin(x + 22, y, 40, -420, 0.08));
        this.addCoins(2);
        this.camera.shake = Math.max(this.camera.shake, 0.12);
      } else {
        this.bumps[key] = 0;
        Sound.play('bump');
        this.hint('cracked');
      }
      break;
    default:
      this.bumps[key] = 0;
      Sound.play('bump');
  }
};

World.prototype.collectCarrot = function (item) {
  var p = this.player;
  if (p.big) {
    this.addCoins(10, item.x + 12, item.y);
    Sound.play('coin');
  } else {
    p.setBig(true);
    Sound.play('powerup');
    FX.sparkle(p.x + p.w / 2, p.y + p.h / 2, 14, '#FFD27A');
  }
  this.pipReact('happy');
};

World.prototype.collectCandy = function (item) {
  var p = this.player;
  if (p.candy) {
    this.addCoins(10, item.x + 12, item.y);
    Sound.play('coin');
  } else {
    p.candy = true;
    Sound.play('candy');
    FX.sparkle(p.x + p.w / 2, p.y + p.h / 2, 18, SHOT_COLOR[p.c.shot]);
    this.hint('candy');
  }
  this.pipReact('spin');
};

World.prototype.setCheckpoint = function (cp) {
  if (this.checkpoint && this.checkpoint.order > cp.order) return;
  this.checkpoint = cp;
  Sound.play('checkpoint');
  FX.sparkle(cp.x + 8, cp.y + 10, 10, '#7CFF9A');
  this.pipReact('loop');
  this.hint('checkpoint');
};

World.prototype.touchFlag = function (flag) {
  var p = this.player;
  this.state = 'complete';
  this.completeT = 0;
  p.state = 'victory';
  p.invuln = 0;
  this.timer.running = false;
  this.pipReact('loop');
  Sound.play('victory');
  this.result = {
    level: this.levelIndex, coins: this.coins, total: this.totalCoins, time: this.timer.elapsed,
    challenge: this.timer.challenge, left: this.timer.challenge ? this.timer.remaining : null, extra: this.timer.extraTime
  };
  this.result.best = Store.recordLevel(this.def.theme, this.coins, this.timer.elapsed, this.timer.challenge);
};

World.prototype.onPlayerDied = function (why) {
  this.deathT = 0;
  this.lives--;
  if (why === 'air') this.showBanner('Out of air!', null, '#BFE8FF', 1.6, 36);
};

World.prototype.timesUp = function () {
  Sound.play('timesup');
  this.showBanner("Time's up!", '+1:00 extra time', '#FF7A5A', 2.2);
  if (this.lives <= 1) {
    this.player.die('time');
    return;
  }
  this.lives--;
  this.pipReact('worried');
};

World.prototype.respawn = function () {
  if (this.lives <= 0) {
    Game.set(new GameOverScene(this.levelIndex, this.charId));
    return;
  }
  if (this.arena && this.arena.state !== 'idle' && this.arena.state !== 'done') this.arena.reset();
  var cp = this.checkpoint;
  var c = CHARACTERS[this.charId];
  var x, y;
  if (cp) { x = cp.x - 4; y = cp.groundY - c.h; }
  else { x = this.level.start.tx * TILE + 5; y = (this.level.start.ty + 1) * TILE - c.h; }
  this.player = new Player(this, this.charId, x, y);
  this.player.invuln = 1.0;
  for (var v = 0; v < this.entities.length; v++) if (this.entities[v].holder) this.entities[v].holder = null;
  Game.transition = { t: 0.1 };
  this.shots = [];
  this.air = Swim.AIR_MAX;
  this.darkZone = null;
  // Refill the carrot and candy boxes by the checkpoint
  if (cp) {
    var level = this.level;
    for (var key in level.boxHome) {
      var parts = key.split(',');
      var btx = +parts[0], bty = +parts[1];
      if (Math.abs(btx - cp.tx) <= 8 && level.get(btx, bty) === T.USED && level.boxHome[key] !== T.QCOIN) {
        level.set(btx, bty, level.boxHome[key]);
        for (var i = this.entities.length - 1; i >= 0; i--) {
          if (this.entities[i].homeKey === key) this.entities.splice(i, 1);
        }
      }
    }
  }
  this.camera.lock = null;
  this.camera.follow(this.player, 1 / 60, true);
  this.pip.x = this.player.x - 40; this.pip.y = this.player.y - 40;
  this.state = 'play';
};

World.prototype.draw = function (ctx) {
  WorldRender.draw(ctx, this);
  HUD.draw(ctx, this);
};

// ---------------------------------------------------------------------------
// Scenes
function LoadingScene() { this.t = 0; this.done = false; }
LoadingScene.prototype.enter = function () {
  var self = this;
  Assets.load(function () { self.done = true; });
};
LoadingScene.prototype.update = function (dt) {
  this.t += dt;
  if (this.done && this.t > 0.15) {
    var dbg = Game.debug || {};
    if (dbg.fallback) Assets.toggle();
    if (dbg.hold) String(dbg.hold).split(',').forEach(function (k) { Input.held[k] = true; });
    if (dbg.level) Game.set(new PlayScene(+dbg.level, dbg['char'] || 'older'));
    else if (dbg.scene === 'chars') Game.set(new CharSelectScene());
    else if (dbg.scene === 'levels') Game.set(new LevelSelectScene(dbg['char'] || 'older'));
    else Game.set(new TitleScene());
    if (dbg.level && dbg.x) {
      var wd = Game.scene.world, pl = wd.player;
      pl.x = +dbg.x * TILE;
      pl.y = wd.groundBelow(pl.x + pl.w / 2, wd.level.underwater ? 5 * TILE : 0) - pl.h;
      if (dbg.big) pl.setBig(true);
      if (dbg.candy) pl.candy = true;
      wd.camera.follow(pl, 1 / 60, true);
    }
    // Fast-forward N fixed steps (used for automated screenshots)
    for (var i = 0; i < (+dbg.ff || 0); i++) {
      Input.beginStep();
      if (dbg.jumpEvery && i % +dbg.jumpEvery === 0) Input.pressed.Space = true;
      Game.scene.update(1 / 60);
    }
  }
};
LoadingScene.prototype.draw = function (ctx) {
  var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, PAL.sky0); g.addColorStop(1, PAL.sky1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  Art.coin(ctx, VIEW_W / 2, 230, this.t * 1.5, false, 2.4, this.t);
  UI.text(ctx, 'Loading...', VIEW_W / 2, 300, 24, '#FFFFFF', 'center');
  G.rrect(ctx, 330, 330, 300, 18, 9); ctx.fillStyle = 'rgba(30,20,40,0.4)'; ctx.fill();
  G.rrect(ctx, 332, 332, 296 * Assets.progress(), 14, 7); ctx.fillStyle = PAL.gold; ctx.fill();
};

// Title ------------------------------------------------------------------------------
function TitleScene() { this.t = 0; }
TitleScene.prototype.update = function (dt) {
  this.t += dt;
  if (Input.hit('confirm') || Input.anyClick()) {
    Sound.resume();
    Sound.play('confirm');
    Game.set(new CharSelectScene());
  }
};
TitleScene.prototype.draw = function (ctx) {
  var t = this.t;
  var img = Assets.image('ui-keyart');
  if (img) ctx.drawImage(img, 0, 0, VIEW_W, VIEW_H);
  else Title.keyArt(ctx, t);
  Title.logo(ctx, VIEW_W / 2, 118, t);
  var a = 0.6 + 0.4 * Math.sin(t * 4);
  ctx.globalAlpha = a;
  UI.text(ctx, 'Press Enter / Click to start', VIEW_W / 2, 470, 26, '#FFFFFF', 'center', { lw: 6 });
  ctx.globalAlpha = 1;
  UI.text(ctx, 'M: sound on/off   F2: painted / drawn art', VIEW_W / 2, 516, 14, 'rgba(255,255,255,0.85)', 'center');
};

var Title = {
  keyArt: function (ctx, t) {
    // Floating-island scene like the reference pictures, drifting gently.
    Backgrounds.draw(ctx, 1, t * 20, 0, t);
    // foreground islands
    Title.island(ctx, 150, 400, 260, 150);
    Title.island(ctx, 820, 380, 280, 170);
    // rope bridge between them
    ctx.strokeStyle = '#8A5A33'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(280, 402); ctx.quadraticCurveTo(480, 450, 680, 385); ctx.stroke();
    for (var i = 0; i < 16; i++) {
      var f = i / 15, bx = 280 + f * 400, by = 402 + (385 - 402) * f + Math.sin(f * Math.PI) * 38;
      ctx.fillStyle = i % 2 ? '#C49A6C' : '#A87A4C';
      ctx.fillRect(bx - 9, by, 18, 7);
    }
    // coins arc
    for (var k = 0; k < 5; k++) Art.coin(ctx, 560 + k * 60, 250 - Math.sin(k / 4 * Math.PI) * 50, t * 1.4 + k * 0.3, false, 1.6, t + k);
    // both sisters mid-jump
    var bob = Math.sin(t * 2) * 6;
    Art.characterShowcase(ctx, 'older', 400, 360 + bob, 150, t, 'jump', 1, { vy: -300, hair: { x: -6, y: 3 }, noPortrait: true });
    Art.characterShowcase(ctx, 'younger', 560, 390 - bob, 130, t + 1, 'jump', 1, { vy: -200, hair: { x: -6, y: 3 }, noPortrait: true });
    Art.pip(ctx, 250 + Math.sin(t) * 10, 250 + Math.cos(t * 1.3) * 8, t, 'happy', 0, null, 0);
    // hedgehog peeking
    var fakeH = { type: 'hedgehog', x: 90, y: 330 - 26, w: 28, h: 26, t: t, dir: 1 };
    Outline.draw(ctx, 104, 330, [-28, -40, 56, 44], function (c) { c.scale(-1, 1); EnemyArt.hedgehog(c, fakeH, t); });
    FrontFX.draw(ctx, { level: { index: 1 }, t: t, camera: { x: t * 20 } });
  },
  island: function (ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(x - w / 2, y, x + w / 2, y + h);
    g.addColorStop(0, PAL.stoneHi); g.addColorStop(1, PAL.stoneLo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w * 0.4, y + h * 0.5);
    ctx.lineTo(x + w * 0.1, y + h); ctx.lineTo(x - w * 0.2, y + h * 0.7); ctx.lineTo(x - w * 0.45, y + h * 0.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
    for (var r = 1; r < 4; r++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + r * 10, y + r * 26); ctx.lineTo(x + w / 2 - r * 10, y + r * 26); ctx.stroke(); }
    ctx.fillStyle = PAL.moss;
    ctx.beginPath(); ctx.ellipse(x, y + 2, w / 2 + 8, 12, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - w / 2 - 8, y, w + 16, 8);
    ctx.fillStyle = PAL.mossHi;
    ctx.beginPath(); ctx.ellipse(x - w * 0.1, y - 3, w * 0.35, 6, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = PAL.moss;
    for (var m = 0; m < 7; m++) { ctx.beginPath(); ctx.ellipse(x - w / 2 + 10 + m * w / 7, y + 12, 4, 10 + (m % 3) * 5, 0, 0, 6.28); ctx.fill(); }
    // waterfall
    var wg = ctx.createLinearGradient(0, y, 0, VIEW_H);
    wg.addColorStop(0, 'rgba(232,244,251,0.95)'); wg.addColorStop(1, 'rgba(169,211,238,0.2)');
    ctx.fillStyle = wg; ctx.fillRect(x + w * 0.3, y + 4, 16, VIEW_H - y);
  },
  logo: function (ctx, x, y, t) {
    var img = Assets.image('ui-logo');
    if (img) { var w = 520; ctx.drawImage(img, x - w / 2, y - 80, w, w * img.naturalHeight / img.naturalWidth); return; }
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.5) * 3);
    ctx.rotate(-0.03);
    ctx.font = UI.font(96);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3A2A20'; ctx.lineWidth = 18;
    ctx.strokeText('Sister Dash', 0, 0);
    ctx.strokeStyle = '#C98A0B'; ctx.lineWidth = 9;
    ctx.strokeText('Sister Dash', 0, 0);
    var g = ctx.createLinearGradient(0, -40, 0, 40);
    g.addColorStop(0, '#FFF3A8'); g.addColorStop(0.5, PAL.gold); g.addColorStop(1, '#E09A10');
    ctx.fillStyle = g;
    ctx.fillText('Sister Dash', 0, 0);
    // star dots
    var stars = [[-250, -40], [-90, -50], [120, -48], [255, -30], [-200, 42], [190, 44]];
    for (var i = 0; i < stars.length; i++) {
      var s = 6 + Math.sin(t * 3 + i) * 1.5;
      G.star(ctx, stars[i][0], stars[i][1], s, s * 0.45, 5, t * 0.5 + i);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
    }
    ctx.restore();
  }
};

// Character select --------------------------------------------------------------------
function CharSelectScene() {
  this.t = 0;
  var last = Store.data.lastChar;
  this.sel = Math.max(0, CHARACTER_ORDER.indexOf(last || 'older'));
}
CharSelectScene.prototype.slot = function (i) { return { x: 130 + i * 233, y: 390 }; };
CharSelectScene.prototype.update = function (dt) {
  this.t += dt;
  if (Input.hit('left')) { this.sel = (this.sel + 3) % 4; Sound.play('select'); }
  if (Input.hit('right')) { this.sel = (this.sel + 1) % 4; Sound.play('select'); }
  for (var i = 0; i < 4; i++) {
    var s = this.slot(i);
    if (Input.hover(s.x - 100, s.y - 250, 200, 330) && this.hoverIdx !== i) { this.hoverIdx = i; }
    if (Input.clicked(s.x - 100, s.y - 250, 200, 330)) {
      if (this.sel === i) { this.choose(); return; }
      this.sel = i; Sound.play('select');
    }
  }
  // Younger sister's outfit: ↑/↓ or O, or click the outfit button.
  if (CHARACTER_ORDER[this.sel] === 'younger') {
    var ob = this.outfitRect();
    if (Input.hit('up') || Input.hit('down') || Input.pressed['KeyO'] || Input.clicked(ob.x, ob.y, ob.w, ob.h)) {
      Store.setSetting('youngerOutfit', youngerOutfit() === 'pink' ? 'purple' : 'pink');
      Sound.play('select');
      return;
    }
  }
  if (Input.hit('confirm')) { this.choose(); return; }
  if (Input.hit('back')) Game.set(new TitleScene());
};
CharSelectScene.prototype.outfitRect = function () {
  var s = this.slot(CHARACTER_ORDER.indexOf('younger'));
  return { x: s.x - 70, y: 102, w: 140, h: 30 };
};
CharSelectScene.prototype.choose = function () {
  var id = CHARACTER_ORDER[this.sel];
  Store.data.lastChar = id; Store.save();
  Sound.play('confirm');
  Game.set(new LevelSelectScene(id));
};
CharSelectScene.prototype.draw = function (ctx) {
  var t = this.t;
  Backgrounds.draw(ctx, 1, t * 10, 0, t);
  ctx.fillStyle = 'rgba(20,30,50,0.25)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  UI.text(ctx, 'Choose your adventurer', VIEW_W / 2, 48, 36, '#FFFFFF', 'center', { lw: 7 });
  for (var i = 0; i < 4; i++) {
    var id = CHARACTER_ORDER[i];
    var c = CHARACTERS[id];
    var s = this.slot(i);
    var on = i === this.sel;
    // floating stone pedestal
    var py = s.y + Math.sin(t * 1.5 + i) * 4;
    if (on) {
      var g = ctx.createRadialGradient(s.x, py - 90, 10, s.x, py - 90, 150);
      g.addColorStop(0, rgba(c.color, 0.55)); g.addColorStop(1, rgba(c.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, py - 90, 150, 0, 6.28); ctx.fill();
    }
    Title.island(ctx, s.x, py, 150, 70);
    var bounce = on ? Math.abs(Math.sin(t * 5)) * 10 : 0;
    var hgt = (id === 'younger' ? 150 : id === 'older' ? 165 : 185);
    Art.characterShowcase(ctx, id, s.x, py - 2 - bounce, hgt, t + i, on ? 'idle' : 'idle', 1);
    // name + ability
    UI.panel(ctx, s.x - 108, 424, 216, 104, 16, on ? 0.72 : 0.5);
    if (on) { G.rrect(ctx, s.x - 108, 424, 216, 104, 16); ctx.strokeStyle = c.color; ctx.lineWidth = 4; ctx.stroke(); }
    UI.text(ctx, c.name, s.x, 446, 22, on ? '#FFE36E' : '#FFFFFF', 'center');
    var lines = UI.wrap(ctx, c.ability, 196, 13);
    for (var l = 0; l < lines.length; l++) UI.text(ctx, lines[l], s.x, 472 + l * 17, 13, '#FFFFFF', 'center', { outline: false, weight: 600 });
    Art.shot(ctx, c.shot, s.x - 62, 512, t, 1, t);
    UI.text(ctx, 'Shoots ' + c.shotName.toLowerCase(), s.x + 8, 512, 13, '#FFE9B0', 'center', { outline: false, weight: 600 });
  }
  UI.text(ctx, '← → to choose, Enter to confirm', VIEW_W / 2, 84, 16, 'rgba(255,255,255,0.9)', 'center');
  if (CHARACTER_ORDER[this.sel] === 'younger') {
    var ob = this.outfitRect();
    var pink = youngerOutfit() === 'pink';
    UI.button(ctx, ob.x, ob.y, ob.w, ob.h, '', Input.hover(ob.x, ob.y, ob.w, ob.h), pink ? '#E85A9A' : '#7A3FB8');
    UI.text(ctx, '↕ Outfit: ' + (pink ? 'Pink' : 'Purple'), ob.x + ob.w / 2, ob.y + 15, 14, '#FFFFFF', 'center');
  }
};

// Level select ----------------------------------------------------------------------------

function LevelSelectScene(charId, sel) {
  this.charId = charId;
  this.t = 0;
  this.sel = sel || 0;
}
// Ten cards in two rows of five, easiest (top left) to hardest (bottom right).
LevelSelectScene.prototype.card = function (i) {
  var row = i < 5 ? 0 : 1;
  var col = i % 5;
  var w = 176, h = 196;
  return { x: 24 + col * 186, y: row ? 318 : 108, w: w, h: h };
};
LevelSelectScene.prototype.update = function (dt) {
  this.t += dt;
  var s = this.sel;
  var n = LEVELS.length;
  if (Input.hit('left')) s = Math.max(0, s - 1);
  if (Input.hit('right')) s = Math.min(n - 1, s + 1);
  if (Input.hit('down') && s < 5) s = Math.min(n - 1, s + 5);
  if (Input.hit('up') && s >= 5) s = s - 5;
  if (s !== this.sel) { this.sel = s; Sound.play('select'); }
  // Time challenge toggle (T or the stopwatch button)
  if (Input.hit('time') || Input.clicked(VIEW_W - 250, 30, 230, 44)) {
    Store.setSetting('timeChallenge', !Store.setting('timeChallenge'));
    Sound.play('select');
  }
  for (var i = 0; i < LEVELS.length; i++) {
    var c = this.card(i);
    if (Input.clicked(c.x, c.y, c.w, c.h)) {
      if (this.sel === i) { this.start(); return; }
      this.sel = i; Sound.play('select');
    }
  }
  if (Input.clicked(20, 30, 120, 40) || Input.hit('back')) { Game.set(new CharSelectScene()); return; }
  if (Input.hit('confirm')) this.start();
};
LevelSelectScene.prototype.start = function () {
  Sound.play('confirm');
  Game.set(new PlayScene(this.sel + 1, this.charId));
};
LevelSelectScene.prototype.draw = function (ctx) {
  var t = this.t;
  Backgrounds.draw(ctx, 1, t * 8, 0, t);
  ctx.fillStyle = 'rgba(20,30,50,0.35)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  UI.text(ctx, 'Choose a level', VIEW_W / 2, 52, 34, '#FFFFFF', 'center', { lw: 7 });
  UI.button(ctx, 20, 30, 120, 40, '← Back', Input.hover(20, 30, 120, 40), '#8A9AB8');
  // time challenge toggle
  var tc = Store.setting('timeChallenge');
  UI.button(ctx, VIEW_W - 250, 30, 230, 44, '', Input.hover(VIEW_W - 250, 30, 230, 44), tc ? '#3FB86A' : '#8A9AB8');
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(VIEW_W - 222, 53, 11, 0, 6.28); ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(VIEW_W - 225, 37, 6, 4);
  ctx.beginPath(); ctx.moveTo(VIEW_W - 222, 53); ctx.lineTo(VIEW_W - 222, 46); ctx.moveTo(VIEW_W - 222, 53); ctx.lineTo(VIEW_W - 216, 56); ctx.stroke();
  UI.text(ctx, 'Time challenge: ' + (tc ? 'ON' : 'OFF'), VIEW_W - 122, 53, 17, '#FFFFFF', 'center');
  UI.text(ctx, '(T)', VIEW_W - 135, 84, 12, 'rgba(255,255,255,0.8)', 'center');
  for (var i = 0; i < LEVELS.length; i++) if (i !== this.sel) this.drawCard(ctx, i, false);
  this.drawCard(ctx, this.sel, true);
  var c0 = CHARACTERS[this.charId];
  UI.text(ctx, 'Playing as ' + c0.name + '   •   Arrows + Enter, or click', VIEW_W / 2, 530, 14, 'rgba(255,255,255,0.9)', 'center');
};
LevelSelectScene.prototype.drawCard = function (ctx, i, on) {
  var c = this.card(i);
  var def = LEVELS[i];
  var rec = Store.level(def.theme);
  var t = this.t;
  var lift = on ? -6 - Math.sin(t * 4) * 2 : 0;
  var x = c.x, y = c.y + lift;
  // themed card background: the level's own painted far layer when available
  ctx.save();
  G.rrect(ctx, x, y, c.w, c.h, 18);
  ctx.clip();
  var sky = Backgrounds.sky[def.theme];
  var g = ctx.createLinearGradient(0, y, 0, y + c.h);
  g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
  ctx.fillStyle = g; ctx.fillRect(x, y, c.w, c.h);
  var bg = Assets.image('bg-' + def.theme + '-0');
  if (bg) {
    var bw = c.h * bg.naturalWidth / bg.naturalHeight;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(bg, x + c.w / 2 - bw / 2, y, bw, c.h);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(20,20,40,0.28)'; ctx.fillRect(x, y, c.w, 112);
  var th = THEMES[def.theme];
  ctx.fillStyle = th.base; ctx.fillRect(x, y + c.h - 28, c.w, 28);
  ctx.fillStyle = th.top; ctx.fillRect(x, y + c.h - 32, c.w, 7);
  // the level's boss
  var bossId = def.boss;
  var bx = x + c.w - 52, by = y + c.h - 28;
  if (!Assets.drawAnim(ctx, 'boss-' + bossId, 'idle', t + i, bx, by, false, 0.5)) {
    var b = { id: bossId, pose: 'idle', t: t + i, facing: -1, sink: 0, h: 80, w: 100, dizzy: false, wobble: 0, roll: 0, hp: 1 };
    var bs = 0.5;
    ctx.save();
    ctx.translate(bx, by + (def.theme === TH.CLOUD || def.theme === TH.SNOW || def.theme === TH.REEF ? -36 : 0));
    ctx.scale(bs, bs);
    Outline.draw(ctx, 0, 0, [-110, -170, 220, 180], function (cc) { BossArt[bossId](cc, b, b.t); }, { zoom: bs, width: 2 });
    ctx.restore();
  }
  ctx.restore();
  G.rrect(ctx, x, y, c.w, c.h, 18);
  ctx.strokeStyle = on ? '#FFE36E' : 'rgba(58,42,32,0.8)'; ctx.lineWidth = on ? 5 : 2.5; ctx.stroke();
  // text
  UI.text(ctx, (i + 1) + '. ' + def.name, x + 10, y + 20, 15, '#FFFFFF', 'left');
  var hard = i >= 8;
  UI.text(ctx, def.difficulty, x + 10, y + 41, 13, hard ? '#FF6A4A' : '#FFE9B0', 'left');
  if (i === 8) Art.skullSun(ctx, x + 98, y + 40, t);
  if (i === 9 && !Art.badge(ctx, 'extremeBadge', x + 146, y + 39, 0.42)) Art.skullSun(ctx, x + 140, y + 40, t);
  var badge = { 8: 'treetopBadge', 9: 'spaceBadge', 10: 'cityBadge' }[def.theme];
  if (badge && Assets.sheet('ui-expansion') && !rec) Art.badge(ctx, badge, x + c.w - 26, y + 104, 0.5);
  var coins = rec ? rec.coins : 0;
  Art.coin(ctx, x + 20, y + 64, t + i, false, 0.8, t);
  UI.text(ctx, String(coins), x + 33, y + 65, 14, '#FFE36E', 'left');
  UI.text(ctx, '⏱ ' + LevelTimer.formatPrecise(rec ? rec.time : null), x + 10, y + 87, 13, '#FFFFFF', 'left');
  if (Store.setting('timeChallenge')) UI.text(ctx, 'Limit ' + LevelTimer.format(def.timeLimit), x + 10, y + 106, 12, '#BFF0C8', 'left');
  UI.text(ctx, BOSSES[bossId].name, x + 10, y + c.h - 13, 12, '#FFFFFF', 'left');
  if (rec && rec.done) Art.checkmark(ctx, x + c.w - 20, y + 20);
  if (rec && rec.crown) Art.crown(ctx, x + c.w - 52, y + 20, t);
};

Art.checkmark = function (ctx, x, y) {
  G.circle(ctx, x, y, 13, '#3FB86A');
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 13, 0, 6.28); ctx.stroke();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 1, y + 5); ctx.lineTo(x + 7, y - 5); ctx.stroke();
};
Art.crown = function (ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.08);
  var g = ctx.createLinearGradient(0, -10, 0, 10);
  g.addColorStop(0, '#FFF3A8'); g.addColorStop(1, '#D8A21A');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(-15, -7); ctx.lineTo(-7, 0); ctx.lineTo(0, -11); ctx.lineTo(7, 0); ctx.lineTo(15, -7); ctx.lineTo(14, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  G.circle(ctx, 0, 2, 2.5, '#E8403A');
  ctx.restore();
};
Art.skullSun = function (ctx, x, y, t) {
  // small sun behind a skull: "very hard"
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#FFB23A';
  for (var i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4 + t); ctx.fillRect(-1.5, -13, 3, 5); ctx.restore(); }
  G.circle(ctx, 0, 0, 8, '#FFD23A');
  G.circle(ctx, 0, -1, 6, '#FFFFFF');
  ctx.fillRect(-3.5, 3, 7, 3);
  G.circle(ctx, -2.2, -1.5, 1.6, '#3A2A20'); G.circle(ctx, 2.2, -1.5, 1.6, '#3A2A20');
  ctx.restore();
};

// Play ----------------------------------------------------------------------------------
function PlayScene(levelIndex, charId) {
  this.levelIndex = levelIndex;
  this.charId = charId;
  this.world = new World(levelIndex, charId);
  this.paused = false;
  this.menuSel = 0;
  this.world.showBanner(this.world.def.name, 'Level ' + levelIndex, '#FFFFFF', 2.2, 40);
}
PlayScene.prototype.menuItems = function () {
  return [
    { label: 'Resume', act: 'resume' },
    { label: 'Restart level', act: 'restart' },
    { label: 'Pip: ' + (Store.setting('pip') ? 'ON' : 'OFF'), act: 'pip' },
    { label: '100 coins = life: ' + (Store.setting('coinLife') ? 'ON' : 'OFF'), act: 'coinlife' },
    { label: 'Graphics: ' + Quality.label(), act: 'quality' },
    { label: 'Screen shake: ' + (Store.setting('shake') !== false ? 'ON' : 'OFF'), act: 'shake' },
    { label: 'Back to level select', act: 'quit' }
  ];
};
PlayScene.prototype.update = function (dt) {
  var w = this.world;
  if (this.paused) {
    var items = this.menuItems();
    if (Input.hit('up')) { this.menuSel = (this.menuSel + items.length - 1) % items.length; Sound.play('select'); }
    if (Input.hit('down')) { this.menuSel = (this.menuSel + 1) % items.length; Sound.play('select'); }
    for (var i = 0; i < items.length; i++) {
      var r = this.itemRect(i);
      if (Input.clicked(r.x, r.y, r.w, r.h)) { this.menuSel = i; this.activate(items[i].act); return; }
    }
    if (Input.hit('pause') && !Input.hit('confirm')) { this.paused = false; return; }
    if (Input.hit('confirm') && !Input.pressed['Space']) this.activate(items[this.menuSel].act);
    else if (Input.pressed['Enter'] || Input.pressed['NumpadEnter']) this.activate(items[this.menuSel].act);
    return;
  }
  if (Input.hit('pause') && w.state !== 'complete') { this.paused = true; this.menuSel = 0; Sound.play('select'); return; }
  w.update(dt);
  if (w.state === 'complete' && w.completeT > 3.0) Game.set(new LevelCompleteScene(w.result, this.charId));
};
PlayScene.prototype.itemRect = function (i) { return { x: VIEW_W / 2 - 170, y: 150 + i * 48, w: 340, h: 40 }; };
PlayScene.prototype.activate = function (act) {
  Sound.play('confirm');
  if (act === 'resume') this.paused = false;
  else if (act === 'restart') Game.set(new PlayScene(this.levelIndex, this.charId));
  else if (act === 'pip') Store.setSetting('pip', !Store.setting('pip'));
  else if (act === 'coinlife') Store.setSetting('coinLife', !Store.setting('coinLife'));
  else if (act === 'quality') Quality.cycle();
  else if (act === 'shake') { Store.setSetting('shake', Store.setting('shake') === false); Quality.apply(Quality.level); }
  else if (act === 'quit') Game.set(new LevelSelectScene(this.charId, this.levelIndex - 1));
};
PlayScene.prototype.draw = function (ctx) {
  this.world.draw(ctx);
  if (this.paused) {
    ctx.fillStyle = 'rgba(15,12,25,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    UI.text(ctx, 'Paused', VIEW_W / 2, 100, 48, '#FFE36E', 'center', { lw: 8 });
    var items = this.menuItems();
    for (var i = 0; i < items.length; i++) {
      var r = this.itemRect(i);
      UI.button(ctx, r.x, r.y, r.w, r.h, items[i].label, i === this.menuSel || Input.hover(r.x, r.y, r.w, r.h), i === this.menuSel ? '#F7C21B' : '#8A9AB8');
    }
    UI.text(ctx, '↑ ↓ + Enter   •   P / Esc to resume', VIEW_W / 2, 505, 15, '#FFFFFF', 'center');
  }
};

// Level complete ----------------------------------------------------------------------------
function LevelCompleteScene(result, charId) {
  this.r = result;
  this.charId = charId;
  this.t = 0;
}
LevelCompleteScene.prototype.update = function (dt) {
  this.t += dt;
  if (this.t > 0.6 && (Input.hit('confirm') || Input.anyClick())) {
    Sound.play('confirm');
    Game.set(new LevelSelectScene(this.charId, Math.min(LEVELS.length - 1, this.r.level)));
  }
};
LevelCompleteScene.prototype.draw = function (ctx) {
  var t = this.t, r = this.r;
  Backgrounds.draw(ctx, LEVELS[r.level - 1].theme, t * 20, 0, t);
  ctx.fillStyle = 'rgba(20,20,40,0.45)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  UI.text(ctx, 'Level complete!', VIEW_W / 2, 90, 54, '#FFE36E', 'center', { lw: 9 });
  UI.text(ctx, LEVELS[r.level - 1].name, VIEW_W / 2, 145, 24, '#FFFFFF', 'center');
  Art.characterShowcase(ctx, this.charId, 200, 440, 170, t, 'victory', 1, { noPortrait: true });
  Art.crown(ctx, 200, 240 + Math.sin(t * 3) * 4, t);
  UI.panel(ctx, 380, 190, 440, 250, 20, 0.6);
  Art.coin(ctx, 420, 240, t, false, 1.4, t);
  UI.text(ctx, 'Coins: ' + r.coins + ' / ' + r.total, 450, 242, 26, '#FFE36E', 'left');
  if (r.best && r.best.newCoins) UI.text(ctx, 'New best!', 790, 242, 16, '#7CFF9A', 'right');
  UI.text(ctx, '⏱  Time: ' + LevelTimer.formatPrecise(r.time), 410, 300, 24, '#FFFFFF', 'left');
  if (r.best && r.best.newTime) UI.text(ctx, 'New best!', 790, 300, 16, '#7CFF9A', 'right');
  if (r.challenge) UI.text(ctx, 'Time left: ' + LevelTimer.format(r.left) + (r.extra ? ' (extra time)' : ''), 410, 350, 22, '#BFF0C8', 'left');
  var rec = Store.level(LEVELS[r.level - 1].theme);
  UI.text(ctx, 'Best: ' + (rec ? rec.coins : 0) + ' coins, ' + LevelTimer.formatPrecise(rec ? rec.time : null), 410, 400, 16, 'rgba(255,255,255,0.85)', 'left');
  if (t > 0.6) {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
    UI.text(ctx, 'Press Enter to continue', VIEW_W / 2, 492, 22, '#FFFFFF', 'center');
    ctx.globalAlpha = 1;
  }
  if (Math.random() < 0.3) FX.sparkle(Math.random() * VIEW_W, Math.random() * 200, 2);
  FX.update(1 / 60);
  FX.draw(ctx);
};

// Game over ------------------------------------------------------------------------------------
function GameOverScene(levelIndex, charId) {
  this.levelIndex = levelIndex;
  this.charId = charId;
  this.t = 0;
  this.sel = 0;
}
GameOverScene.prototype.rect = function (i) { return { x: VIEW_W / 2 - 160, y: 300 + i * 64, w: 320, h: 50 }; };
GameOverScene.prototype.update = function (dt) {
  this.t += dt;
  if (Input.hit('up') || Input.hit('down')) { this.sel = 1 - this.sel; Sound.play('select'); }
  for (var i = 0; i < 2; i++) {
    var r = this.rect(i);
    if (Input.clicked(r.x, r.y, r.w, r.h)) { this.sel = i; this.go(); return; }
  }
  if (this.t > 0.5 && (Input.pressed['Enter'] || Input.pressed['NumpadEnter'] || Input.pressed['Space'])) this.go();
};
GameOverScene.prototype.go = function () {
  Sound.play('confirm');
  if (this.sel === 0) Game.set(new PlayScene(this.levelIndex, this.charId));
  else Game.set(new LevelSelectScene(this.charId, this.levelIndex - 1));
};
GameOverScene.prototype.draw = function (ctx) {
  var t = this.t;
  Backgrounds.draw(ctx, LEVELS[this.levelIndex - 1].theme, 0, 0, t);
  ctx.fillStyle = 'rgba(20,10,30,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  UI.text(ctx, 'Game over', VIEW_W / 2, 150, 64, '#FF7A6A', 'center', { lw: 10 });
  UI.text(ctx, "Don't give up, try again!", VIEW_W / 2, 220, 22, '#FFFFFF', 'center');
  var labels = ['Retry level', 'Back to level select'];
  for (var i = 0; i < 2; i++) {
    var r = this.rect(i);
    UI.button(ctx, r.x, r.y, r.w, r.h, labels[i], i === this.sel || Input.hover(r.x, r.y, r.w, r.h), i === this.sel ? '#F7C21B' : '#8A9AB8');
  }
};
