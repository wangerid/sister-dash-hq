// Pip, the helper drone (cosmetic): follows the player, gives first-time
// hints in a speech bubble and reacts with its eyes.

var PIP_HINTS = {
  hedgehog: 'Jump on its head!',
  frog: 'Frogs hop! Stomp them when they land.',
  mole: 'Wait for the mole to pop up, then stomp!',
  bat: 'Bats swoop down. Keep moving!',
  rock: "Rocks can't be stomped. Jump over!",
  crow: 'Hold ↓ to duck under crows!',
  cloudling: 'Grumpy cloud! Jump on top of it.',
  gull: 'Gulls fly straight. Duck or jump!',
  spark: "Sparks zap! Don't stomp, jump over.",
  plant: "Ouch, spiky! Don't stomp it.",
  cactus: "Cactus! Don't touch it.",
  crab: 'Swim down onto the crab!',
  jellyfish: "Jellyfish sting on top. Avoid them!",
  puffer: 'Stomp it before it puffs up!',
  eel: 'Bubbles at a hole? An eel!',
  scorpion: 'Scorpions dash at you. Stomp them!',
  vulture: 'Watch for the vulture shadow!',
  tumbleweed: 'Dust at the edge? Tumbleweed! Jump!',
  qbox: 'Hit ? boxes from below!',
  candybox: 'Rainbow box! Magic candy inside!',
  cracked: 'Grow big to smash cracked boxes!',
  crackedDad: 'Dad can smash cracked boxes!',
  carrot: 'A magic carrot! It makes you big.',
  candy: 'Press X to shoot!',
  checkpoint: 'Checkpoint! You restart here.',
  stalactite: 'Keep moving under stalactites!',
  cart: 'Ride the mine cart across!',
  thin: 'Hold ↓ and press Jump to drop down.',
  raincloud: "Rain clouds vanish! Don't wait.",
  spring: 'Pink clouds bounce you up high!',
  wind: 'Wind! It pushes you sideways.',
  swim: 'Tap Jump to swim up!',
  vent: 'Swim through bubbles for air!',
  current: 'Currents push you along.',
  quicksand: 'Quicksand! Jump, jump, jump!',
  crumble: "Crumbly! Don't stand still.",
  boss: 'Wait till it is dizzy, then jump on its head!',
  duck: 'Hold ↓ to duck!',
  bonus: 'Only Mom can jump that far!',
  // Treetop Heights
  squirrel: 'Squirrels hop between branches. Stomp!',
  caterpillar: 'Slow caterpillar. Jump on it!',
  bee: "Bees can't be stomped. Duck or shoot!",
  vine: 'Press Jump to let go of the vine!',
  leaf: "Leaves bend! Don't stand still.",
  pinecone: 'Rustling leaves? Pinecone! Keep moving!',
  // Starlight Station
  blob: 'Bouncy alien! Jump on its head.',
  ufo: 'Watch out for falling star pellets!',
  urchin: "Spiky urchin. Don't stomp it!",
  laser: 'Lasers flicker before they switch on!',
  meteor: 'Red target = meteor! Move away!',
  well: "Don't touch the middle of the swirl!",
  space: 'Low gravity! You jump extra high.',
  // Cement City
  road: 'Cross on green! Wait on the pavement.',
  cement: 'Wet cement makes you slow!',
  manhole: 'Stand on the manhole for a big boost!',
  bag: 'Shadow and creaking? Cement bag!',
  pigeon: 'Pigeons swoop down. Duck!',
  cone: 'Stomp the hopping cone!',
  cart: "Runaway cart! Jump over it.",
  pebble: 'Stomp the little blocks!'
};

function Pip(world) {
  this.world = world;
  var p = world.player;
  this.x = p.x - 40; this.y = p.y - 50;
  this.vx = 0; this.vy = 0;
  this.t = 0;
  this.mood = 'normal';
  this.moodT = 0;
  this.bubble = null;      // { text, t }
  this.queue = [];
  this.loop = 0;           // loop-the-loop progress
}

Pip.prototype.enabled = function () { return Store.setting('pip'); };

Pip.prototype.react = function (mood) {
  this.mood = mood;
  this.moodT = mood === 'spin' ? 1.2 : 1.0;
  if (mood === 'loop') { this.loop = 1; this.mood = 'happy'; }
};

Pip.prototype.say = function (id) {
  if (!PIP_HINTS[id]) return;
  if (Store.hintSeen(id)) return;
  Store.markHint(id);
  if (!this.enabled()) return;
  if (this.bubble && this.bubble.text === PIP_HINTS[id]) return;
  this.queue.push(PIP_HINTS[id]);
};

Pip.prototype.update = function (dt) {
  this.t += dt;
  var p = this.world.player;
  // Float a little behind and above the player, with lag.
  var tx = p.x + p.w / 2 - p.facing * 46;
  var ty = p.y - 38 + Math.sin(this.t * 2.2) * 5;
  var cam = this.world.camera;
  ty = Math.max(cam.y + 40, ty);
  var k = 5;
  this.vx += ((tx - this.x) * k * 4 - this.vx * 5) * dt;
  this.vy += ((ty - this.y) * k * 4 - this.vy * 5) * dt;
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  if (this.loop > 0) {
    this.loop -= dt / 0.9;
    if (this.loop < 0) this.loop = 0;
  }
  if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.mood = 'normal'; }
  if (this.bubble) {
    this.bubble.t += dt;
    if (this.bubble.t > 3.2) this.bubble = null;
  }
  if (!this.bubble && this.queue.length) this.bubble = { text: this.queue.shift(), t: 0 };
};

Pip.prototype.draw = function (ctx) {
  if (!this.enabled()) return;
  var lx = 0, ly = 0, rot = 0;
  if (this.loop > 0) {
    var a = (1 - this.loop) * Math.PI * 2;
    lx = Math.sin(a) * 18;
    ly = -(1 - Math.cos(a)) * 18;
    rot = a;
  }
  var lvl = this.world.level;
  var extra = lvl.underwater ? 'helmet' : (lvl.theme === TH.CLOUD ? 'propeller' : lvl.lowGravity ? 'helmet' : null);
  Art.pip(ctx, this.x + lx, this.y + ly, this.t, this.mood, rot, extra, Math.max(-1, Math.min(1, this.vx / 200)));
};

Pip.prototype.drawBubble = function (ctx) {
  if (!this.enabled() || !this.bubble) return;
  var b = this.bubble;
  var a = Math.min(1, b.t * 5, (3.2 - b.t) * 3);
  ctx.globalAlpha = Math.max(0, a);
  UI.speech(ctx, this.x, this.y - 20, b.text);
  ctx.globalAlpha = 1;
};
