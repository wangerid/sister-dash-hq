// Best scores, best times, crowns, hints seen and settings in localStorage.
var Store = {
  KEY: 'sisterDash.v1',
  data: null,

  defaults: function () {
    return {
      levels: {},          // theme id ("1".."10", see TH) -> { coins, time, tcTime, done, crown }
      hints: {},           // hint id -> true
      settings: { pip: true, timeChallenge: false, coinLife: false, muted: false, quality: 'high', shake: true, youngerOutfit: 'pink' }
    };
  },

  load: function () {
    var d = null;
    try {
      var raw = window.localStorage.getItem(this.KEY);
      if (raw) d = JSON.parse(raw);
    } catch (e) { d = null; }
    var def = this.defaults();
    if (!d || typeof d !== 'object') d = def;
    d.levels = d.levels || {};
    d.hints = d.hints || {};
    d.settings = d.settings || {};
    for (var k in def.settings) if (d.settings[k] === undefined) d.settings[k] = def.settings[k];
    this.data = d;
    return d;
  },

  save: function () {
    try { window.localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {}
  },

  level: function (n) {
    return this.data.levels[String(n)] || null;
  },

  // Record a finished level. Returns flags telling what was a new best.
  recordLevel: function (n, coins, time, timeChallenge) {
    var key = String(n);
    var rec = this.data.levels[key] || { coins: 0, time: null, done: false, crown: false };
    var res = { newCoins: false, newTime: false };
    if (coins > (rec.coins || 0)) { rec.coins = coins; res.newCoins = true; }
    if (rec.time === null || rec.time === undefined || time < rec.time) { rec.time = time; res.newTime = true; }
    if (timeChallenge) {
      if (!rec.tcTime || time < rec.tcTime) rec.tcTime = time;
    }
    rec.done = true;
    rec.crown = true;
    this.data.levels[key] = rec;
    this.save();
    return res;
  },

  hintSeen: function (id) { return !!this.data.hints[id]; },
  markHint: function (id) { this.data.hints[id] = true; this.save(); },

  setting: function (k) { return this.data.settings[k]; },
  setSetting: function (k, v) { this.data.settings[k] = v; this.save(); }
};
