// Elapsed time and the Time challenge countdown (5.7).
function LevelTimer(limitSeconds, challenge) {
  this.elapsed = 0;
  this.challenge = !!challenge;
  this.limit = limitSeconds;
  this.remaining = limitSeconds;
  this.extraTime = false;       // true once the player is running on 1:00 extra time
  this.lastTick = -1;
  this.running = true;
}

LevelTimer.EXTRA = 60;

// Returns 'timeup' when the countdown just reached zero.
LevelTimer.prototype.update = function (dt) {
  if (!this.running) return null;
  this.elapsed += dt;
  if (!this.challenge) return null;
  this.remaining -= dt;
  if (this.remaining <= 10 && this.remaining > 0) {
    var s = Math.ceil(this.remaining);
    if (s !== this.lastTick) { this.lastTick = s; Sound.play('tick'); }
  }
  if (this.remaining <= 0) {
    this.remaining = LevelTimer.EXTRA;
    this.extraTime = true;
    this.lastTick = -1;
    return 'timeup';
  }
  return null;
};

LevelTimer.prototype.urgent = function () {
  return this.challenge && this.remaining <= 10;
};

LevelTimer.format = function (sec) {
  if (sec === null || sec === undefined) return '--:--';
  sec = Math.max(0, sec);
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
};

LevelTimer.formatPrecise = function (sec) {
  if (sec === null || sec === undefined) return '--:--';
  var m = Math.floor(sec / 60);
  var s = sec - m * 60;
  var whole = Math.floor(s);
  var tenth = Math.floor((s - whole) * 10);
  return m + ':' + (whole < 10 ? '0' : '') + whole + '.' + tenth;
};
