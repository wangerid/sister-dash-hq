// Drawing helpers. Every draw call first asks Assets for a painted sprite and
// otherwise draws the code-drawn fallback in the same colours and silhouette:
// layered gradients for shading, a highlight blob, and a dark warm outline.
// Lighting: warm key light from the upper left, cool blue fill from the right.

var RS = 1;                 // device pixels per logical pixel (set by main.js)
var OUTLINE = 'rgba(58,42,32,0.7)';
var OUTLINE_SOLID = '#3A2A20';
var FONT = '"SDRounded", "Nunito", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';

var PAL = {
  sky0: '#6FB6F2', sky1: '#BFE3FA',
  moss: '#7DAF3A', mossHi: '#A9C94A', mossLo: '#4E7A26',
  stone: '#8E8A83', stoneHi: '#B7B1A6', stoneLo: '#5E5A55',
  earth: '#A0633F', earthHi: '#C98458',
  wood: '#8A5A33', woodHi: '#C49A6C',
  gold: '#F7C21B', goldHi: '#FFE36E', goldLo: '#C98A0B',
  mist: '#E8F4FB', mist2: '#A9D3EE'
};

// Seeded random for stable procedural art.
function RNG(seed) {
  var s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return (s % 100000) / 100000;
  };
}
function hash2(x, y) {
  var h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mixColor(a, b, t) {
  var pa = parseHex(a), pb = parseHex(b);
  var r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  var g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  var bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}
var _hexCache = {};
function parseHex(h) {
  if (_hexCache[h]) return _hexCache[h];
  var s = h.replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  var v = [parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16)];
  _hexCache[h] = v;
  return v;
}
function shadeHex(h, amt) {       // amt -1..1 (negative = darker)
  return amt < 0 ? mixColor(h, '#1E1424', -amt) : mixColor(h, '#FFFFFF', amt);
}
function rgba(h, a) {
  var p = parseHex(h);
  return 'rgba(' + p[0] + ',' + p[1] + ',' + p[2] + ',' + a + ')';
}

function makeCanvas(w, h) {
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Shape helpers ---------------------------------------------------------------
var G = {
  lx: -1,   // light direction in local x (-1 = light from local left)

  // Linear gradient lit from the upper left in world space.
  lit: function (ctx, x, y, r, light, dark) {
    var g = ctx.createLinearGradient(x + G.lx * r * 0.8, y - r, x - G.lx * r * 0.8, y + r);
    g.addColorStop(0, light);
    g.addColorStop(1, dark);
    return g;
  },
  radial: function (ctx, x, y, r, light, dark) {
    var g = ctx.createRadialGradient(x + G.lx * r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, light);
    g.addColorStop(1, dark);
    return g;
  },
  circle: function (ctx, x, y, r, fill) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = fill; ctx.fill();
  },
  ellipse: function (ctx, x, y, rx, ry, rot, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, 6.2832); ctx.fillStyle = fill; ctx.fill();
  },
  rrect: function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },
  limb: function (ctx, x0, y0, x1, y1, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  },
  highlight: function (ctx, x, y, rx, ry, a) {
    ctx.fillStyle = 'rgba(255,255,255,' + (a || 0.35) + ')';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.5, 0, 6.2832); ctx.fill();
  },
  star: function (ctx, x, y, r1, r2, n, rot) {
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 ? r2 : r1;
      var a = rot + i * Math.PI / n - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
};

// Outlined sprite pass --------------------------------------------------------
// Draws fn(localCtx) into an offscreen canvas, then stamps a dark silhouette
// around it so characters and enemies pop against busy backgrounds.
var Outline = {
  cv: null, cx: null, sil: null, sx: null,
  ensure: function (w, h) {
    if (!this.cv) {
      this.cv = makeCanvas(w, h); this.cx = this.cv.getContext('2d');
      this.sil = makeCanvas(w, h); this.sx = this.sil.getContext('2d');
    }
    if (this.cv.width < w || this.cv.height < h) {
      var nw = Math.max(this.cv.width, w), nh = Math.max(this.cv.height, h);
      this.cv.width = nw; this.cv.height = nh;
      this.sil.width = nw; this.sil.height = nh;
    }
  },
  // (x, y) is the local origin in the current ctx space; box = [left, top, w, h]
  // relative to that origin, big enough to contain the drawing.
  draw: function (ctx, x, y, box, fn, opts) {
    opts = opts || {};
    var sc = RS * (opts.zoom || ctx.__zoom || 1);
    var pad = 3;
    var W = Math.ceil((box[2] + pad * 2) * sc), H = Math.ceil((box[3] + pad * 2) * sc);
    if (W <= 0 || H <= 0) return;
    if (W > 2048 || H > 2048) { ctx.save(); ctx.translate(x, y); fn(ctx); ctx.restore(); return; }
    this.ensure(W, H);
    var c = this.cx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W + 2, H + 2);
    c.setTransform(sc, 0, 0, sc, (pad - box[0]) * sc, (pad - box[1]) * sc);
    c.globalAlpha = 1;
    fn(c);
    var s = this.sx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'copy';
    s.drawImage(this.cv, 0, 0, W, H, 0, 0, W, H);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = opts.outline || OUTLINE_SOLID;
    s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'source-over';
    var dx = x + box[0] - pad, dy = y + box[1] - pad;
    var dw = W / sc, dh = H / sc;
    var o = opts.width || 1.1;
    var oa = ctx.globalAlpha;
    ctx.globalAlpha = oa * (opts.outlineAlpha !== undefined ? opts.outlineAlpha : 0.72);
    var offs = [[-o, 0], [o, 0], [0, -o], [0, o], [-o * 0.7, -o * 0.7], [o * 0.7, -o * 0.7], [-o * 0.7, o * 0.7], [o * 0.7, o * 0.7]];
    for (var i = 0; i < offs.length; i++) ctx.drawImage(this.sil, 0, 0, W, H, dx + offs[i][0], dy + offs[i][1], dw, dh);
    ctx.globalAlpha = oa;
    ctx.drawImage(this.cv, 0, 0, W, H, dx, dy, dw, dh);
  }
};

// Cache of pre-rendered small sprites (coins etc.) keyed by name.
var SpriteCache = {
  map: {},
  version: -1,
  rs: 0,
  get: function (key, w, h, fn, outline) {
    if (this.version !== Assets.version || this.rs !== RS) { this.map = {}; this.version = Assets.version; this.rs = RS; }
    var c = this.map[key];
    if (c) return c;
    var pad = 3;
    var sc = RS;
    c = makeCanvas((w + pad * 2) * sc, (h + pad * 2) * sc);
    var cx = c.getContext('2d');
    if (outline) {
      // Draw via Outline into the cache canvas
      cx.setTransform(sc, 0, 0, sc, pad * sc, pad * sc);
      var save = RS;
      Outline.draw(cx, 0, 0, [0, 0, w, h], fn, { zoom: 1 });
      RS = save;
    } else {
      cx.setTransform(sc, 0, 0, sc, pad * sc, pad * sc);
      fn(cx);
    }
    c.lw = w + pad * 2; c.lh = h + pad * 2; c.pad = pad;
    this.map[key] = c;
    return c;
  },
  blit: function (ctx, c, x, y) {   // x, y = top-left of the w*h box
    ctx.drawImage(c, x - c.pad, y - c.pad, c.lw, c.lh);
  }
};

// UI helpers -------------------------------------------------------------------
var UI = {
  font: function (size, weight) { return (weight || 700) + ' ' + size + 'px ' + FONT; },
  text: function (ctx, str, x, y, size, color, align, opts) {
    opts = opts || {};
    ctx.font = UI.font(size, opts.weight);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = opts.baseline || 'middle';
    ctx.lineJoin = 'round';
    if (opts.outline !== false) {
      ctx.strokeStyle = opts.stroke || 'rgba(40,26,20,0.85)';
      ctx.lineWidth = opts.lw || Math.max(3, size * 0.22);
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color || '#FFFFFF';
    ctx.fillText(str, x, y);
  },
  panel: function (ctx, x, y, w, h, r, alpha) {
    G.rrect(ctx, x, y, w, h, r || 14);
    ctx.fillStyle = 'rgba(28,22,34,' + (alpha !== undefined ? alpha : 0.5) + ')';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  button: function (ctx, x, y, w, h, label, hot, color) {
    G.rrect(ctx, x, y, w, h, h / 2);
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    var base = color || '#F7C21B';
    g.addColorStop(0, hot ? shadeHex(base, 0.35) : shadeHex(base, 0.15));
    g.addColorStop(1, hot ? base : shadeHex(base, -0.25));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    G.rrect(ctx, x + 6, y + 3, w - 12, h * 0.35, h * 0.2); ctx.fill();
    UI.text(ctx, label, x + w / 2, y + h / 2 + 1, Math.round(h * 0.45), '#FFFFFF', 'center');
  },
  heart: function (ctx, x, y, s, full) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 20, s / 20);
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-2, 3, -10, 0, -10, -5);
    ctx.bezierCurveTo(-10, -10, -3, -12, 0, -6);
    ctx.bezierCurveTo(3, -12, 10, -10, 10, -5);
    ctx.bezierCurveTo(10, 0, 2, 3, 0, 6);
    ctx.closePath();
    if (full) {
      var g = ctx.createLinearGradient(-8, -10, 8, 6);
      g.addColorStop(0, '#FF7A8A'); g.addColorStop(1, '#C8203A');
      ctx.fillStyle = g;
    } else ctx.fillStyle = 'rgba(40,30,40,0.55)';
    ctx.fill();
    ctx.strokeStyle = OUTLINE_SOLID; ctx.lineWidth = 1.6; ctx.stroke();
    if (full) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.ellipse(-5, -6, 2.6, 1.6, -0.6, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  },
  speech: function (ctx, x, y, str) {
    ctx.font = UI.font(14, 600);
    var w = ctx.measureText(str).width + 22;
    var h = 30;
    var bx = Math.round(x - w / 2), by = Math.round(y - h - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    G.rrect(ctx, bx, by, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 6, by + h - 1); ctx.lineTo(x, by + h + 9); ctx.lineTo(x + 6, by + h - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.fillRect(x - 5, by + h - 3, 10, 3);
    UI.text(ctx, str, x, by + h / 2 + 1, 14, '#3A2A20', 'center', { outline: false, weight: 600 });
  },
  wrap: function (ctx, str, maxW, size) {
    ctx.font = UI.font(size, 600);
    var words = str.split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var tst = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = tst;
    }
    if (cur) lines.push(cur);
    return lines;
  }
};

// ---------------------------------------------------------------------------
// Characters (code-drawn fallback)
// Local units: 100 = full standing height, origin at the feet, facing +x.

var CHAR_ART = {
  older: {
    kind: 'child', skin: '#F4C6A0', skinLo: '#DA9C76', hair: '#E6B64A', hairHi: '#F9DD8C', hairLo: '#B5822A',
    hairStyle: 'ponytail', tie: '#2A2440', eye: '#6E92AE', brow: '#B07A2E',
    top: '#2F4FD1', topHi: '#5373F2', topLo: '#1E3494', shirt: '#D9D9DE',
    pants: '#3B5CBA', pantsHi: '#5A7BD8', pantsLo: '#27408A', belt: '#6B4428',
    shoe: '#6F80A8', sole: '#EFEBE2', wrist: '#2F4FD1', pack: '#3F3631', packLo: '#2A221E',
    freckles: true, mouth: 'half'
  },
  younger: {
    kind: 'child', skin: '#F5C8A2', skinLo: '#DC9E78', hair: '#EDC45A', hairHi: '#FBE39A', hairLo: '#BC8A2E',
    hairStyle: 'curls', eye: '#5B9D60', brow: '#B8842E',
    top: '#7A3FB8', topHi: '#9C62DA', topLo: '#55288A', shirt: '#F2E6CC',
    pants: '#6E7243', pantsHi: '#8A8E58', pantsLo: '#4F532E', belt: null,
    shoe: '#8A5CC0', sole: '#EFEBE2', wrist: '#5A3A22', pack: '#8A5A33', packLo: '#5E3A1E',
    freckles: true, sleevesUp: true, rolled: true, mouth: 'grin'
  },
  dad: {
    kind: 'adult', skin: '#E9B58E', skinLo: '#C98E68', hair: '#6B4428', hairHi: '#8E6440', hairLo: '#4A2D18',
    hairStyle: 'short', eye: '#6B4428', brow: '#4A2D18',
    top: '#3E7A3A', topHi: '#5E9C54', topLo: '#285426', shirt: '#8C8C90',
    pants: '#46628F', pantsHi: '#6282B0', pantsLo: '#334A70', belt: '#5A3A22',
    shoe: '#7A4E2C', sole: '#4A3222', wrist: '#3E7A3A', pack: '#7A5230', packLo: '#553618',
    boots: true, bigPack: true, blanket: '#B5503C', stubble: true, mouth: 'smile'
  },
  mom: {
    kind: 'adult', skin: '#F2C09A', skinLo: '#D59E78', hair: '#7A4A2A', hairHi: '#A06A40', hairLo: '#55301A',
    hairStyle: 'long', band: '#D8322E', eye: '#8C7C3C', brow: '#55301A',
    top: '#E8782A', topHi: '#FF9C52', topLo: '#B5561A', shirt: '#FFFFFF',
    pants: '#2E3F66', pantsHi: '#4A5E8C', pantsLo: '#1F2C4A', belt: null,
    shoe: '#FFFFFF', shoeAccent: '#E8782A', sole: '#E8E4DC', wrist: '#E8782A', pack: '#8A5A33', packLo: '#5E3A1E',
    smallPack: true, freckles: true, mouth: 'smile'
  }
};

var SKEL = {
  child: { headR: 15.5, headY: -79, shY: -60, hipY: -35, thigh: 18, shin: 17, uArm: 12, fArm: 11, torsoW: 25, legW: 10, armW: 7.5, neck: 4 },
  adult: { headR: 11.5, headY: -87, shY: -72, hipY: -45, thigh: 23, shin: 22, uArm: 16, fArm: 15, torsoW: 28, legW: 10.5, armW: 8, neck: 4 }
};

// Build joint angles for an animation state.
function charPose(P) {
  var t = P.t || 0;
  var pose = {
    legF: [0.06, 0.05], legB: [-0.06, 0.05],
    armF: [0.12, 0.3], armB: [-0.12, 0.3],
    lean: 0, bob: 0, ground: true, sy: 1, headTilt: 0, breathe: 0, eyes: 'open', look: 0
  };
  var a = P.anim;
  if (a === 'idle') {
    pose.breathe = Math.sin(t * 2.6) * 0.8;
    pose.armF = [0.1 + Math.sin(t * 2.6) * 0.03, 0.25];
    pose.armB = [-0.1, 0.25];
    // Occasional look-around
    var cyc = t % 6;
    if (cyc > 4.2 && cyc < 5.2) pose.look = -1;
    pose.headTilt = Math.sin(t * 1.3) * 0.03;
  } else if (a === 'run') {
    var ph = Math.floor(((P.phase || 0) % 1) * 6) / 6 * Math.PI * 2;   // 6 frames
    var leg = function (psi) {
      return [0.72 * Math.sin(psi), 0.25 + 1.05 * Math.max(0, Math.cos(psi))];
    };
    pose.legF = leg(ph);
    pose.legB = leg(ph + Math.PI);
    pose.armF = [-0.75 * Math.sin(ph), 1.1];
    pose.armB = [0.75 * Math.sin(ph), 1.1];
    pose.lean = 0.14;
    pose.bob = -Math.abs(Math.cos(ph)) * 3;
  } else if (a === 'jump') {
    var vy = P.vy || 0;
    if (vy < -150) {          // rise: the reference pose
      pose.legF = [1.15, 1.75]; pose.legB = [-0.6, 0.25];
      pose.armF = [1.85, 0.25]; pose.armB = [-0.95, 0.35];
      pose.lean = 0.1;
    } else if (vy < 150) {    // peak
      pose.legF = [0.95, 1.5]; pose.legB = [-0.45, 0.45];
      pose.armF = [2.0, 0.35]; pose.armB = [-1.3, 0.4];
      pose.lean = 0.06;
    } else {                  // fall
      pose.legF = [0.5, 0.8]; pose.legB = [-0.25, 0.6];
      pose.armF = [2.3, 0.4]; pose.armB = [-1.9, 0.4];
      pose.lean = -0.02;
    }
    pose.ground = false;
  } else if (a === 'duck') {
    pose.legF = [1.35, 2.3]; pose.legB = [0.95, 2.1];
    pose.armF = [0.9, 1.2]; pose.armB = [0.5, 1.2];
    pose.lean = 0.62; pose.sy = 0.86;
  } else if (a === 'swim') {
    var s = t * 7;
    pose.legF = [-0.25 + Math.sin(s * 1.4) * 0.35, 0.35];
    pose.legB = [-0.25 - Math.sin(s * 1.4) * 0.35, 0.35];
    var stroke = P.swimStroke > 0 ? (1 - P.swimStroke / 0.35) : 0.5 + 0.5 * Math.sin(t * 3);
    pose.armF = [2.6 - stroke * 2.2, 0.3];
    pose.armB = [2.3 - stroke * 2.0, 0.3];
    pose.lean = 0.45;
    pose.ground = false;
  } else if (a === 'hurt') {
    pose.legF = [0.4, 0.6]; pose.legB = [-0.35, 0.3];
    pose.armF = [2.5, 0.3]; pose.armB = [-2.5, 0.3];
    pose.eyes = 'x';
    pose.ground = !!P.onGround;
  } else if (a === 'victory') {
    var j = Math.abs(Math.sin(t * 5));
    pose.armF = [2.9, 0.2]; pose.armB = [-2.9, 0.2];
    pose.legF = [0.15 + j * 0.3, j * 0.5]; pose.legB = [-0.1, j * 0.4];
    pose.bob = -j * 7;
    pose.eyes = 'happy';
  } else if (a === 'shoot') {
    // Keep the base locomotion, extend the front arm.
    var base = charPose({ anim: P.base || 'idle', t: t, phase: P.phase, vy: P.vy, swimStroke: P.swimStroke });
    base.armF = [1.55, 0.05];
    return base;
  }
  return pose;
}

function legPoints(hx, hy, ang, sk) {
  var kx = hx + Math.sin(ang[0]) * sk.thigh, ky = hy + Math.cos(ang[0]) * sk.thigh;
  var a2 = ang[0] - ang[1];
  return [kx, ky, kx + Math.sin(a2) * sk.shin, ky + Math.cos(a2) * sk.shin, a2];
}
function armPoints(sx, sy, ang, sk) {
  var ex = sx + Math.sin(ang[0]) * sk.uArm, ey = sy + Math.cos(ang[0]) * sk.uArm;
  var a2 = ang[0] + ang[1];
  return [ex, ey, ex + Math.sin(a2) * sk.fArm, ey + Math.cos(a2) * sk.fArm];
}

// Draw a character. P = { anim, t, facing, height (px), vx, vy, hair: {x, y},
// squash, phase, swimStroke, onGround, blinkAlpha }
function drawCharacterFallback(ctx, id, P) {
  var A = CHAR_ART[id];
  var sk = SKEL[A.kind];
  var pose = charPose(P);
  var s = P.height / 100;
  var facing = P.facing || 1;
  var sq = P.squash || 1;
  ctx.save();
  ctx.scale(facing * s / Math.sqrt(sq), s * sq * pose.sy);
  G.lx = -1;   // (light handled in local space; outline pass keeps silhouette)
  var hx = 0, hy = sk.hipY;
  // Legs
  var lf = legPoints(hx + 2, hy, pose.legF, sk);
  var lb = legPoints(hx - 2, hy, pose.legB, sk);
  // Ground the lowest foot for grounded poses
  var shift = pose.bob;
  if (pose.ground) {
    var low = Math.max(lf[3], lb[3]);
    shift += -low;
  }
  ctx.translate(0, shift);
  var lean = pose.lean;
  // Torso top from hip with lean
  var tl = sk.hipY - sk.shY;
  var shX = hx + Math.sin(lean) * tl, shY = hy - Math.cos(lean) * tl + pose.breathe * 0.3;
  var headX = shX + Math.sin(lean) * (sk.shY - sk.headY) * 0.9 + 1.5;
  var headY = shY - Math.cos(lean) * (sk.shY - sk.headY) * (pose.sy < 1 ? 0.85 : 1) + pose.breathe * 0.2;
  var hr = sk.headR;
  var hlx = (P.hair ? P.hair.x : 0) * facing * 1.2;
  var hly = (P.hair ? P.hair.y : 0) * 1.2;
  if (!pose.ground && P.anim === 'jump') { hlx -= 3; hly += 2; }  // hair flying behind in jumps

  var afp = armPoints(shX + 3, shY + 3, pose.armF, sk);
  var abp = armPoints(shX - 4, shY + 3, pose.armB, sk);

  // 1. back hair
  drawHairBack(ctx, A, headX, headY, hr, hlx, hly, P.t || 0);
  // 2. back arm
  drawArm(ctx, A, sk, shX - 4, shY + 3, abp, true);
  // 3. back leg
  drawLeg(ctx, A, sk, hx - 2, hy, lb, true, false);
  // 4. backpack
  drawPack(ctx, A, sk, shX, shY, lean, P);
  // 5. torso
  drawTorso(ctx, A, sk, hx, hy, shX, shY, lean, hlx, hly);
  // 6. front leg
  drawLeg(ctx, A, sk, hx + 2, hy, lf, false, true);
  // 7. head
  drawHead(ctx, A, headX, headY, hr, pose, P);
  // 8. front hair
  drawHairFront(ctx, A, headX, headY, hr, hlx, hly, P.t || 0);
  // 9. front arm
  drawArm(ctx, A, sk, shX + 3, shY + 3, afp, false);
  ctx.restore();
}

function drawLeg(ctx, A, sk, hx, hy, L, back, front) {
  var col = back ? A.pantsLo : A.pants;
  G.limb(ctx, hx, hy, L[0], L[1], sk.legW, col);
  G.limb(ctx, L[0], L[1], L[2], L[3] - 1, sk.legW * 0.92, col);
  if (!back) {
    // highlight on the lit side
    G.limb(ctx, hx - 2, hy + 1, L[0] - 2.5, L[1], 2, A.pantsHi);
    if (A.kind === 'child') {
      // cargo pocket
      ctx.save();
      ctx.translate((hx + L[0]) / 2, (hy + L[1]) / 2);
      ctx.rotate(-Math.atan2(L[0] - hx, L[1] - hy));
      ctx.fillStyle = A.pantsLo;
      G.rrect(ctx, -3.5, -3, 7, 6.5, 1.5); ctx.fill();
      ctx.restore();
    }
  }
  if (A.rolled) G.limb(ctx, L[2] - 1, L[3] - 3, L[2] + 1, L[3] - 3, sk.legW * 1.05, back ? '#6E7050' : '#9DA070');
  // Shoe: oriented along the foot
  ctx.save();
  ctx.translate(L[2], L[3]);
  var ang = Math.max(-0.9, Math.min(0.9, -(L[4] || 0) * 0.5));
  ctx.rotate(ang);
  var boot = A.boots;
  ctx.fillStyle = back ? shadeHex(A.shoe, -0.25) : A.shoe;
  G.rrect(ctx, -4.5, boot ? -6 : -3.5, 12.5, boot ? 8.5 : 6.5, 3.2); ctx.fill();
  ctx.fillStyle = A.sole;
  G.rrect(ctx, -5, 1.8, 13.5, 2.8, 1.4); ctx.fill();
  if (A.shoeAccent) { ctx.fillStyle = A.shoeAccent; ctx.fillRect(-1, -2.5, 5, 2.2); }
  if (!back) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-2, -3, 5, 1.2); }
  ctx.restore();
}

function drawArm(ctx, A, sk, sx, sy, pts, back) {
  var sleeve = back ? A.topLo : A.top;
  G.limb(ctx, sx, sy, pts[0], pts[1], sk.armW, sleeve);
  if (A.sleevesUp) {
    G.limb(ctx, pts[0], pts[1], pts[2], pts[3], sk.armW * 0.7, back ? A.skinLo : A.skin);
    G.circle(ctx, pts[0], pts[1], sk.armW * 0.62, sleeve);
  } else {
    G.limb(ctx, pts[0], pts[1], pts[2], pts[3], sk.armW * 0.9, sleeve);
  }
  // wristband
  var wx = pts[0] + (pts[2] - pts[0]) * 0.8, wy = pts[1] + (pts[3] - pts[1]) * 0.8;
  G.circle(ctx, wx, wy, sk.armW * 0.5, back ? shadeHex(A.wrist, -0.25) : A.wrist);
  G.circle(ctx, pts[2], pts[3], sk.armW * 0.52, back ? A.skinLo : A.skin);
  if (!back) G.limb(ctx, sx - 1.5, sy + 1, pts[0] - 1.5, pts[1], 1.8, A.topHi);
}

function drawPack(ctx, A, sk, shX, shY, lean, P) {
  var w = A.bigPack ? 13 : (A.smallPack ? 8 : 10);
  var h = A.bigPack ? 26 : (A.smallPack ? 14 : 18);
  var bob = P.anim === 'run' ? Math.sin((P.phase || 0) * Math.PI * 4) * 1.2 : 0;
  ctx.save();
  ctx.translate(shX, shY);
  ctx.rotate(lean);
  var x = -sk.torsoW / 2 - w + 4, y = 2 + bob;
  ctx.fillStyle = G.lit(ctx, x + w / 2, y + h / 2, h / 2, shadeHex(A.pack, 0.12), A.packLo);
  G.rrect(ctx, x, y, w, h, 3.5); ctx.fill();
  ctx.fillStyle = A.packLo;
  G.rrect(ctx, x - 1, y + h * 0.45, w * 0.8, h * 0.4, 2); ctx.fill();
  ctx.fillStyle = '#C9A15A';
  ctx.fillRect(x + w * 0.25, y + h * 0.55, 3, 2.2);
  if (A.blanket) {
    ctx.fillStyle = A.blanket;
    G.rrect(ctx, x - 3, y - 6, w + 5, 7, 3.5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,200,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 2, y - 5.5); ctx.lineTo(x + 2, y + 0.5); ctx.stroke();
  }
  ctx.restore();
}

function drawTorso(ctx, A, sk, hx, hy, shX, shY, lean, hlx, hly) {
  var tw = sk.torsoW;
  var tl = sk.hipY - sk.shY;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(lean);
  // body
  var top = -tl - 2, bot = 3;
  ctx.fillStyle = G.lit(ctx, 0, (top + bot) / 2, tl / 2, A.topHi, A.topLo);
  ctx.beginPath();
  ctx.moveTo(-tw / 2 + 2, top + 2);
  ctx.quadraticCurveTo(0, top - 3, tw / 2 - 2, top + 2);
  ctx.quadraticCurveTo(tw / 2 + 2, (top + bot) / 2, tw / 2, bot);
  ctx.lineTo(-tw / 2, bot);
  ctx.quadraticCurveTo(-tw / 2 - 2, (top + bot) / 2, -tw / 2 + 2, top + 2);
  ctx.fill();
  // open front showing the shirt
  ctx.fillStyle = A.shirt;
  ctx.beginPath();
  ctx.moveTo(tw * 0.02, top + 1);
  ctx.lineTo(tw * 0.4, top + 1);
  ctx.lineTo(tw * 0.3, bot - 3);
  ctx.lineTo(tw * 0.12, bot - 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(tw * 0.12, top + tl * 0.5, tw * 0.2, tl * 0.4);
  // zip edges
  ctx.strokeStyle = A.topLo; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(tw * 0.02, top + 1); ctx.lineTo(tw * 0.12, bot - 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tw * 0.4, top + 1); ctx.lineTo(tw * 0.3, bot - 2); ctx.stroke();
  // hem band
  ctx.fillStyle = A.topLo;
  G.rrect(ctx, -tw / 2, bot - 4, tw, 5, 2); ctx.fill();
  if (A.belt) {
    ctx.fillStyle = A.belt;
    ctx.fillRect(-tw / 2 + 1, bot - 1, tw - 2, 3.2);
    ctx.fillStyle = '#C9A15A'; ctx.fillRect(tw * 0.15, bot - 1, 3, 3.2);
  }
  // hood behind the neck
  ctx.fillStyle = A.topLo;
  G.ellipse(ctx, -tw * 0.22, top + 1, tw * 0.3, 4.5, 0, A.topLo);
  // hoodie strings lag behind movement
  if (A.kind === 'child') {
    ctx.strokeStyle = '#F2EEE6'; ctx.lineWidth = 1.2;
    var sx1 = tw * 0.05, sx2 = tw * 0.36;
    ctx.beginPath(); ctx.moveTo(sx1, top + 2); ctx.quadraticCurveTo(sx1 + hlx * 0.3, top + 8, sx1 + hlx * 0.5, top + 11 + hly * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx2, top + 2); ctx.quadraticCurveTo(sx2 + hlx * 0.3, top + 8, sx2 + hlx * 0.5, top + 11 + hly * 0.2); ctx.stroke();
  } else {
    // jacket collar and pocket
    ctx.fillStyle = A.topHi;
    ctx.beginPath(); ctx.moveTo(tw * 0.0, top); ctx.lineTo(tw * 0.18, top + 7); ctx.lineTo(tw * 0.08, top - 1); ctx.fill();
    ctx.fillStyle = A.topLo;
    G.rrect(ctx, -tw * 0.35, top + tl * 0.45, tw * 0.28, tl * 0.25, 1.5); ctx.fill();
  }
  // backpack strap across the front
  ctx.strokeStyle = A.packLo; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-tw * 0.15, top + 1); ctx.lineTo(-tw * 0.05, bot - 5); ctx.stroke();
  // soft rim light from the right (cool sky fill)
  ctx.strokeStyle = 'rgba(190,225,255,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(tw / 2 - 1, top + 5); ctx.quadraticCurveTo(tw / 2 + 1, (top + bot) / 2, tw / 2 - 0.5, bot - 3); ctx.stroke();
  ctx.restore();
}

function drawHead(ctx, A, x, y, r, pose, P) {
  var t = P.t || 0;
  // neck
  G.limb(ctx, x - 1.5, y + r * 0.7, x - 2.5, y + r * 1.25, r * 0.42, A.skinLo);
  // ear (hidden under curls)
  if (A.hairStyle !== 'curls' && A.hairStyle !== 'long') G.ellipse(ctx, x - r * 0.28, y + r * 0.08, r * 0.17, r * 0.24, 0, A.skinLo);
  // face
  ctx.fillStyle = G.radial(ctx, x, y, r, shadeHex(A.skin, 0.18), A.skinLo);
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.02, 0, 0, 6.2832); ctx.fill();
  // chin/jaw toward the front
  G.ellipse(ctx, x + r * 0.35, y + r * 0.52, r * 0.5, r * 0.42, 0, A.skin);
  if (A.stubble) {
    ctx.fillStyle = 'rgba(90,60,40,0.28)';
    ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.6, r * 0.62, r * 0.36, 0, 0, 6.2832); ctx.fill();
  }
  var fx = x + r * 0.2;
  var ey = y - r * 0.02;
  var look = pose.look || 0;
  var blink = (t % 3.7) > 3.58;
  var eyes = pose.eyes;
  var er = A.kind === 'child' ? r * 0.21 : r * 0.2;
  var drawEye = function (ex, sc) {
    if (eyes === 'x') {
      ctx.strokeStyle = '#3A2A20'; ctx.lineWidth = r * 0.08;
      ctx.beginPath(); ctx.moveTo(ex - er * 0.7, ey - er * 0.7); ctx.lineTo(ex + er * 0.7, ey + er * 0.7);
      ctx.moveTo(ex + er * 0.7, ey - er * 0.7); ctx.lineTo(ex - er * 0.7, ey + er * 0.7); ctx.stroke();
      return;
    }
    if (eyes === 'happy' || blink) {
      ctx.strokeStyle = '#3A2A20'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, ey + er * 0.3, er * 0.75, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      return;
    }
    G.ellipse(ctx, ex, ey, er * sc, er * 1.22, 0, '#FFFFFF');
    var ix = ex + er * 0.18 * (look < 0 ? -2.2 : 1);
    G.circle(ctx, ix, ey + er * 0.12, er * 0.78 * sc, A.eye);
    G.circle(ctx, ix, ey + er * 0.12, er * 0.4 * sc, '#1E1A22');
    G.circle(ctx, ix - er * 0.28, ey - er * 0.25, er * 0.3, '#FFFFFF');
    ctx.strokeStyle = 'rgba(40,26,20,0.75)'; ctx.lineWidth = r * 0.06;
    ctx.beginPath(); ctx.ellipse(ex, ey, er * sc, er * 1.22, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  };
  drawEye(fx + r * 0.42, 1);
  drawEye(fx - r * 0.1, 0.82);
  // brows
  ctx.strokeStyle = A.brow; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(fx + r * 0.24, ey - er * 1.75); ctx.quadraticCurveTo(fx + r * 0.44, ey - er * 2.05, fx + r * 0.64, ey - er * 1.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx - r * 0.24, ey - er * 1.7); ctx.quadraticCurveTo(fx - r * 0.1, ey - er * 1.95, fx + r * 0.04, ey - er * 1.75); ctx.stroke();
  // nose
  ctx.strokeStyle = A.skinLo; ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.arc(fx + r * 0.58, y + r * 0.2, r * 0.1, -0.8, 1.6); ctx.stroke();
  // cheeks
  ctx.fillStyle = 'rgba(255,110,110,0.28)';
  ctx.beginPath(); ctx.ellipse(fx + r * 0.52, y + r * 0.36, r * 0.18, r * 0.12, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(fx - r * 0.2, y + r * 0.34, r * 0.16, r * 0.11, 0, 0, 6.2832); ctx.fill();
  // freckles
  if (A.freckles) {
    ctx.fillStyle = 'rgba(170,95,60,0.55)';
    var fr = [[0.38, 0.2], [0.5, 0.26], [0.62, 0.3], [0.44, 0.34], [-0.2, 0.22], [-0.1, 0.28], [-0.26, 0.3]];
    for (var i = 0; i < fr.length; i++) { ctx.beginPath(); ctx.arc(fx + r * fr[i][0], y + r * fr[i][1], r * 0.035, 0, 6.28); ctx.fill(); }
  }
  if (A.kind === 'adult' && A.stubble) {
    // laugh lines
    ctx.strokeStyle = 'rgba(150,95,70,0.5)'; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.arc(fx + r * 0.72, ey + r * 0.05, r * 0.12, -0.6, 0.6); ctx.stroke();
  }
  // mouth
  var mx = fx + r * 0.32, my = y + r * 0.5;
  if (eyes === 'x') {
    G.ellipse(ctx, mx, my + r * 0.02, r * 0.12, r * 0.14, 0, '#7A2E2E');
  } else if (A.mouth === 'grin' || eyes === 'happy') {
    ctx.fillStyle = '#7A2E2E';
    ctx.beginPath(); ctx.moveTo(mx - r * 0.24, my - r * 0.04); ctx.quadraticCurveTo(mx, my + r * 0.34, mx + r * 0.26, my - r * 0.08); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(mx - r * 0.2, my - r * 0.03); ctx.lineTo(mx + r * 0.22, my - r * 0.07); ctx.lineTo(mx + r * 0.18, my + r * 0.04); ctx.lineTo(mx - r * 0.16, my + r * 0.05); ctx.fill();
  } else {
    ctx.strokeStyle = '#8A3A34'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
    ctx.beginPath();
    if (A.mouth === 'half') { ctx.moveTo(mx - r * 0.18, my + r * 0.02); ctx.quadraticCurveTo(mx + r * 0.06, my + r * 0.16, mx + r * 0.26, my - r * 0.08); }
    else { ctx.moveTo(mx - r * 0.2, my - r * 0.02); ctx.quadraticCurveTo(mx + r * 0.04, my + r * 0.2, mx + r * 0.24, my - r * 0.04); }
    ctx.stroke();
  }
  // soft highlight on the forehead (upper-left key light)
  G.highlight(ctx, x - r * 0.3, y - r * 0.5, r * 0.28, r * 0.16, 0.22);
}

function hairBlob(ctx, x, y, r, A, k) {
  var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r);
  g.addColorStop(0, k ? A.hairHi : shadeHex(A.hair, 0.1));
  g.addColorStop(1, A.hairLo);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
}

function drawHairBack(ctx, A, x, y, r, hlx, hly, t) {
  var st = A.hairStyle;
  if (st === 'ponytail') {
    // cap behind the head
    hairBlob(ctx, x - r * 0.12, y - r * 0.12, r * 1.07, A, true);
    // ponytail from the top-back, trailing with the hair spring
    var ax = x - r * 0.62, ay = y - r * 0.72;
    var sway = Math.sin(t * 3) * 1.2;
    var p1x = ax - r * 0.55 + hlx * 0.4, p1y = ay + r * 0.15 + hly * 0.3 + sway * 0.3;
    var p2x = p1x - r * 0.35 + hlx * 0.7, p2y = p1y + r * 0.5 + hly * 0.6 + sway * 0.5;
    var p3x = p2x - r * 0.12 + hlx * 0.9, p3y = p2y + r * 0.55 + hly * 0.8 + sway;
    ctx.fillStyle = G.lit(ctx, p2x, p2y, r, A.hairHi, A.hairLo);
    ctx.beginPath();
    ctx.moveTo(ax + r * 0.15, ay - r * 0.3);
    ctx.bezierCurveTo(p1x - r * 0.2, p1y - r * 0.75, p2x - r * 0.55, p2y - r * 0.2, p3x - r * 0.15, p3y + r * 0.35);
    ctx.bezierCurveTo(p2x + r * 0.35, p2y + r * 0.35, p1x + r * 0.5, p1y + r * 0.5, ax + r * 0.25, ay + r * 0.35);
    ctx.closePath(); ctx.fill();
    // wavy curls along the tail
    hairBlob(ctx, p1x, p1y, r * 0.36, A, true);
    hairBlob(ctx, (p1x + p2x) / 2 - r * 0.05, (p1y + p2y) / 2, r * 0.3, A, false);
    hairBlob(ctx, p2x, p2y, r * 0.27, A, true);
    hairBlob(ctx, (p2x + p3x) / 2, (p2y + p3y) / 2, r * 0.2, A, false);
    // wavy strand texture
    ctx.strokeStyle = rgba(A.hairLo, 0.6); ctx.lineWidth = r * 0.07;
    ctx.beginPath(); ctx.moveTo(p1x, p1y - r * 0.2); ctx.quadraticCurveTo(p2x + r * 0.2, p2y, p3x, p3y + r * 0.2); ctx.stroke();
  } else if (st === 'curls') {
    // big voluminous curls to below the shoulders
    var n = 14;
    for (var i = 0; i < n; i++) {
      var a = Math.PI * 0.45 + i / (n - 1) * Math.PI * 1.35;
      var d = r * (1.02 + (i % 2) * 0.1);
      var lag = Math.max(0, Math.cos(a - Math.PI)) ;
      var cx = x - r * 0.1 + Math.cos(a) * d + hlx * lag * 0.6;
      var cy = y - r * 0.05 + Math.sin(a) * d + hly * lag * 0.4;
      hairBlob(ctx, cx, cy, r * (0.42 + (i % 3) * 0.06), A, i % 2 === 0);
    }
    // lower mass behind the shoulders
    for (var j = 0; j < 5; j++) {
      var bx = x - r * (0.9 + (j % 2) * 0.3) + hlx * (0.5 + j * 0.15);
      var by = y + r * (0.5 + j * 0.28) + hly * 0.4 + Math.sin(t * 3 + j) * 0.6;
      hairBlob(ctx, bx, by, r * (0.5 - j * 0.04), A, j % 2 === 1);
    }
    hairBlob(ctx, x - r * 0.1, y - r * 0.15, r * 1.05, A, true);
  } else if (st === 'short') {
    hairBlob(ctx, x - r * 0.12, y - r * 0.2, r * 1.04, A, true);
  } else if (st === 'long') {
    // long wavy brown hair down the back
    var lx = x - r * 0.35, ly = y;
    ctx.fillStyle = G.lit(ctx, lx, ly + r, r * 1.5, A.hairHi, A.hairLo);
    ctx.beginPath();
    ctx.moveTo(x + r * 0.3, y - r * 0.9);
    ctx.quadraticCurveTo(x - r * 1.4, y - r * 1.1, x - r * 1.15 + hlx * 0.4, y + r * 0.6 + hly * 0.3);
    ctx.quadraticCurveTo(x - r * 1.5 + hlx * 0.9, y + r * 1.6 + hly * 0.6, x - r * 1.0 + hlx * 1.1, y + r * 2.5 + hly);
    ctx.quadraticCurveTo(x - r * 0.4 + hlx * 0.8, y + r * 2.0 + hly * 0.7, x - r * 0.1 + hlx * 0.5, y + r * 2.2 + hly * 0.6);
    ctx.quadraticCurveTo(x + r * 0.1, y + r * 1.2, x + r * 0.2, y + r * 0.2);
    ctx.closePath();
    ctx.fill();
    hairBlob(ctx, x - r * 0.1, y - r * 0.15, r * 1.08, A, true);
    ctx.strokeStyle = rgba(A.hairLo, 0.6); ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.moveTo(x - r * 0.9, y + r * 0.3); ctx.quadraticCurveTo(x - r * 1.2 + hlx * 0.6, y + r * 1.4, x - r * 0.8 + hlx, y + r * 2.2); ctx.stroke();
  }
}

function drawHairFront(ctx, A, x, y, r, hlx, hly, t) {
  var st = A.hairStyle;
  ctx.save();
  if (st === 'ponytail') {
    // fringe swept over the forehead
    ctx.fillStyle = G.lit(ctx, x, y - r * 0.6, r * 0.6, A.hairHi, A.hair);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.95, y - r * 0.2);
    ctx.quadraticCurveTo(x - r * 0.8, y - r * 1.2, x + r * 0.25, y - r * 1.05);
    ctx.quadraticCurveTo(x + r * 0.95, y - r * 0.85, x + r * 1.0, y - r * 0.25);
    ctx.quadraticCurveTo(x + r * 0.7, y - r * 0.55, x + r * 0.45, y - r * 0.5);
    ctx.quadraticCurveTo(x + r * 0.1, y - r * 0.45, x - r * 0.1, y - r * 0.62);
    ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.3, x - r * 0.95, y - r * 0.2);
    ctx.fill();
    // loose strands around the face
    ctx.strokeStyle = A.hair; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + r * 0.9, y - r * 0.35); ctx.quadraticCurveTo(x + r * 1.05 + hlx * 0.1, y + r * 0.1, x + r * 0.88 + hlx * 0.15, y + r * 0.45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.1, y - r * 0.6); ctx.quadraticCurveTo(x - r * 0.35, y - r * 0.1, x - r * 0.3, y + r * 0.2); ctx.stroke();
    // hair tie
    G.ellipse(ctx, x - r * 0.66, y - r * 0.76, r * 0.16, r * 0.22, 0.6, A.tie);
    // shine
    ctx.strokeStyle = 'rgba(255,245,200,0.6)'; ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.2, r * 0.8, Math.PI * 1.2, Math.PI * 1.45); ctx.stroke();
  } else if (st === 'curls') {
    var fr = [[-0.5, -0.85, 0.36], [0.0, -0.98, 0.34], [0.42, -0.82, 0.3], [0.78, -0.55, 0.24], [-0.85, -0.45, 0.32]];
    for (var i = 0; i < fr.length; i++) hairBlob(ctx, x + r * fr[i][0], y + r * fr[i][1], r * fr[i][2], A, i % 2 === 0);
    // a curl hanging in front of the ear
    hairBlob(ctx, x - r * 0.45 + hlx * 0.1, y + r * 0.35, r * 0.26, A, true);
    hairBlob(ctx, x - r * 0.55 + hlx * 0.2, y + r * 0.7, r * 0.22, A, false);
    ctx.strokeStyle = rgba(A.hairLo, 0.7); ctx.lineWidth = r * 0.06;
    for (var j = 0; j < 4; j++) {
      ctx.beginPath(); ctx.arc(x + r * (-0.5 + j * 0.4), y - r * (0.8 + (j % 2) * 0.1), r * 0.14, 0.3, 3.5); ctx.stroke();
    }
  } else if (st === 'short') {
    ctx.fillStyle = G.lit(ctx, x, y - r * 0.6, r * 0.6, A.hairHi, A.hair);
    ctx.beginPath();
    ctx.moveTo(x - r * 1.0, y - r * 0.1);
    ctx.quadraticCurveTo(x - r * 0.9, y - r * 1.15, x + r * 0.2, y - r * 1.1);
    ctx.quadraticCurveTo(x + r * 0.95, y - r * 1.0, x + r * 0.9, y - r * 0.5);
    ctx.quadraticCurveTo(x + r * 0.5, y - r * 0.65, x + r * 0.1, y - r * 0.55);
    ctx.quadraticCurveTo(x - r * 0.3, y - r * 0.5, x - r * 0.5, y - r * 0.1);
    ctx.closePath(); ctx.fill();
    // sideburn
    ctx.fillStyle = A.hairLo; ctx.fillRect(x - r * 0.5, y - r * 0.3, r * 0.14, r * 0.45);
  } else if (st === 'long') {
    ctx.fillStyle = G.lit(ctx, x, y - r * 0.6, r * 0.6, A.hairHi, A.hair);
    ctx.beginPath();
    ctx.moveTo(x - r * 1.0, y + r * 0.2);
    ctx.quadraticCurveTo(x - r * 0.95, y - r * 1.2, x + r * 0.2, y - r * 1.1);
    ctx.quadraticCurveTo(x + r * 1.0, y - r * 0.95, x + r * 1.02, y - r * 0.2);
    ctx.quadraticCurveTo(x + r * 0.6, y - r * 0.7, x + r * 0.0, y - r * 0.55);
    ctx.quadraticCurveTo(x - r * 0.45, y - r * 0.3, x - r * 0.55, y + r * 0.3);
    ctx.closePath(); ctx.fill();
    // red hair band
    ctx.strokeStyle = A.band; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x - r * 0.05, y - r * 0.05, r * 0.98, Math.PI * 1.12, Math.PI * 1.72); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,190,0.6)'; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.arc(x - r * 0.05, y - r * 0.05, r * 1.02, Math.PI * 1.2, Math.PI * 1.45); ctx.stroke();
  }
  ctx.restore();
}

// Visual height of a character in px for a given hitbox height.
function charVisualHeight(p) {
  var base = p.c.h * (p.big ? 1.5 : 1);
  return base * 1.08;
}

// ---------------------------------------------------------------------------
// Art: every in-world sprite. Painted sheet first, fallback otherwise.
var Art = {};

Art.player = function (ctx, p, world) {
  var anim = p.anim();
  var vh = charVisualHeight(p);
  var cx = p.x + p.w / 2, by = p.y + p.h;
  var t = world.t;
  // Grow/shrink pulse
  var pulse = 1;
  if (p.growT > 0) {
    var k = p.growT / 0.6;
    pulse = 1 + Math.sin(k * Math.PI * 5) * 0.12 * k;
    if (p.growDir > 0) pulse *= 1 - k * 0.25;
    else pulse *= 1 + k * 0.25;
  }
  // Blink while invulnerable
  if (p.invuln > 0 && p.state === 'normal' && Math.floor(p.invuln * 14) % 2 === 0) return;
  if (p.state === 'dead') by = p.y + p.h;
  // Candy glow in the shot's color
  if (p.candy && p.state !== 'dead') {
    var gc = SHOT_COLOR[p.c.shot];
    var gr = vh * 0.75;
    var g = ctx.createRadialGradient(cx, by - vh * 0.45, 2, cx, by - vh * 0.45, gr);
    var a = 0.28 + Math.sin(t * 5) * 0.08;
    g.addColorStop(0, rgba(gc, a));
    g.addColorStop(1, rgba(gc, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, by - vh * 0.45, gr, 0, 6.2832); ctx.fill();
  }
  var sheetKey = 'char-' + p.charId + '-' + (p.big ? 'big' : 'small');
  var frameOverride;
  if (anim === 'jump') frameOverride = p.vy < -150 ? 0 : (p.vy < 150 ? 1 : 2);
  if (Assets.drawAnim(ctx, sheetKey, anim, p.animT, cx, by, p.facing < 0, pulse, undefined, frameOverride)) return;

  var P = {
    anim: anim, t: t, facing: p.facing, height: vh * pulse, vx: p.vx, vy: p.vy, hair: p.hair,
    squash: p.squash, phase: p.runPhase * 0.2, swimStroke: p.swimStroke, onGround: p.onGround,
    base: p.ducking ? 'duck' : (!p.onGround ? (world.level.underwater ? 'swim' : 'jump') : (Math.abs(p.vx) > 15 ? 'run' : 'idle'))
  };
  if (anim === 'duck') P.height = vh * pulse;   // pose handles the crouch
  if (p.state === 'dead') P.anim = 'hurt';
  var hgt = P.height;
  Outline.draw(ctx, cx, by, [-hgt * 0.75, -hgt * 1.12, hgt * 1.5, hgt * 1.2], function (c) {
    drawCharacterFallback(c, p.charId, P);
  }, { width: 1.1 });
};

// Portrait / showcase drawing of a character (select screen, title).
Art.characterShowcase = function (ctx, id, x, y, height, t, anim, facing, extra) {
  extra = extra || {};
  var P = { anim: anim || 'idle', t: t, facing: facing || 1, height: height, vx: extra.vx || 0, vy: extra.vy || 0,
    hair: extra.hair || { x: Math.sin(t * 2) * 1.5, y: 0 }, squash: 1, phase: extra.phase || 0, onGround: true };
  var key = 'ui-portrait-' + id;
  var img = Assets.image(key);
  if (img && !extra.noPortrait) {
    var w = height * img.naturalWidth / img.naturalHeight;
    ctx.drawImage(img, x - w / 2, y - height, w, height);
    return;
  }
  Outline.draw(ctx, x, y, [-height * 0.8, -height * 1.15, height * 1.6, height * 1.22], function (c) {
    drawCharacterFallback(c, id, P);
  }, { width: Math.max(1.5, height / 40) });
};

// Coins ------------------------------------------------------------------------
Art.coin = function (ctx, cx, cy, t, crystal, scale, globalT) {
  scale = scale || 1;
  var key = crystal ? 'crystal' : 'coin';
  if (Assets.drawAnim(ctx, 'items', key, t, cx, cy, false, scale)) return;
  // 6 spin frames (edge-on in the middle), pre-rendered with outline.
  var f = Math.floor((t * 7) % 6);
  var widths = [1, 0.72, 0.28, 0.12, 0.28, 0.72];
  var wf = widths[f];
  var R = 10 * scale;
  var c = SpriteCache.get(key + f + '_' + scale, R * 2, R * 2, function (x) {
    Art._coinShape(x, R, R, R, wf, crystal);
  }, true);
  SpriteCache.blit(ctx, c, cx - R, cy - R);
  // glint every few seconds
  var gt = (globalT || t) % 3.2;
  if (!crystal && f === 0 && gt < 0.35) Art.sparkle(ctx, cx - R * 0.35, cy - R * 0.45, 3.5 * scale, '#FFFFFF', 1 - gt / 0.35);
  if (crystal) Art.sparkle(ctx, cx + R * 0.2, cy - R * 0.5, 2.5 * scale, '#FFFFFF', 0.5 + 0.5 * Math.sin(t * 6));
};

Art._coinShape = function (ctx, cx, cy, R, wf, crystal) {
  var rx = Math.max(1.4, R * wf);
  if (crystal) {
    // cut crystal coin: faceted hexagon in pale cyan
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.max(0.14, wf), 1);
    ctx.beginPath();
    for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 - Math.PI / 2; ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); }
    ctx.closePath();
    var g = ctx.createLinearGradient(-R, -R, R, R);
    g.addColorStop(0, '#E8FDFF'); g.addColorStop(0.5, '#7FD8F0'); g.addColorStop(1, '#3E8FC8');
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    G.star(ctx, 0, 0, R * 0.55, R * 0.24, 5, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.moveTo(-R * 0.86, -R * 0.5); ctx.lineTo(R * 0.86, R * 0.5); ctx.stroke();
    ctx.restore();
    return;
  }
  // edge (thickness)
  G.ellipse(ctx, cx + (wf < 0.5 ? 0 : 1.5), cy, rx + 1.5, R, 0, PAL.goldLo);
  // face
  var g2 = ctx.createLinearGradient(cx - rx, cy - R, cx + rx, cy + R);
  g2.addColorStop(0, PAL.goldHi); g2.addColorStop(0.55, PAL.gold); g2.addColorStop(1, '#D99A10');
  G.ellipse(ctx, cx, cy, rx, R, 0, g2);
  if (wf > 0.25) {
    // rim
    ctx.strokeStyle = 'rgba(201,138,11,0.9)'; ctx.lineWidth = R * 0.14;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.8, R * 0.8, 0, 0, 6.2832); ctx.stroke();
    // raised star
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(wf, 1);
    G.star(ctx, 0.6, 0.8, R * 0.52, R * 0.22, 5, 0);
    ctx.fillStyle = PAL.goldLo; ctx.fill();
    G.star(ctx, 0, 0, R * 0.52, R * 0.22, 5, 0);
    var g3 = ctx.createLinearGradient(-R * 0.5, -R * 0.5, R * 0.5, R * 0.5);
    g3.addColorStop(0, '#FFF3A8'); g3.addColorStop(1, PAL.gold);
    ctx.fillStyle = g3; ctx.fill();
    ctx.restore();
  }
  G.highlight(ctx, cx - rx * 0.4, cy - R * 0.5, rx * 0.35, R * 0.18, 0.55);
};

Art.sparkle = function (ctx, x, y, r, color, alpha) {
  ctx.save();
  ctx.globalAlpha *= Math.max(0, Math.min(1, alpha === undefined ? 1 : alpha));
  var g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  g.addColorStop(0, rgba(color && color[0] === '#' ? color : '#FFFFFF', 0.7));
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.6); ctx.quadraticCurveTo(x, y, x + r * 1.6, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 1.6); ctx.quadraticCurveTo(x, y, x - r * 1.6, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 1.6);
  ctx.fill();
  ctx.restore();
};

// Power-ups ------------------------------------------------------------------------
Art.carrot = function (ctx, cx, cy, t) {
  if (Assets.drawAnim(ctx, 'items', 'carrot', t, cx, cy)) return;
  // soft magic glow
  var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
  g.addColorStop(0, 'rgba(255,200,120,0.45)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 6.2832); ctx.fill();
  var c = SpriteCache.get('carrot', 26, 30, function (x) {
    // leaves
    x.fillStyle = '#4E9A2E';
    x.beginPath(); x.ellipse(10, 6, 3, 7, -0.5, 0, 6.28); x.fill();
    x.fillStyle = '#6DBB3A';
    x.beginPath(); x.ellipse(14, 5, 3, 7, 0.1, 0, 6.28); x.fill();
    x.fillStyle = '#86CF4A';
    x.beginPath(); x.ellipse(17, 7, 2.5, 6, 0.6, 0, 6.28); x.fill();
    // body
    var gg = x.createLinearGradient(6, 10, 20, 28);
    gg.addColorStop(0, '#FFB050'); gg.addColorStop(1, '#E0621A');
    x.fillStyle = gg;
    x.beginPath(); x.moveTo(6, 12); x.quadraticCurveTo(13, 8, 21, 12); x.quadraticCurveTo(17, 22, 12, 29); x.quadraticCurveTo(7, 20, 6, 12); x.fill();
    x.strokeStyle = 'rgba(160,70,20,0.6)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(8, 16); x.lineTo(12, 16.5); x.moveTo(10, 20); x.lineTo(14, 20); x.moveTo(11, 24); x.lineTo(13.5, 24); x.stroke();
    G.highlight(x, 10, 14, 2.5, 1.5, 0.6);
  }, true);
  SpriteCache.blit(ctx, c, cx - 13, cy - 15 + Math.sin(t * 3) * 1);
  if (Math.floor(t * 3) % 3 === 0) Art.sparkle(ctx, cx + 9, cy - 8, 2.5, '#FFFFFF', 0.8);
};

Art.candy = function (ctx, cx, cy, t) {
  if (Assets.drawAnim(ctx, 'items', 'candy', t, cx, cy)) return;
  var hue = (t * 120) % 360;
  var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
  g.addColorStop(0, 'hsla(' + hue + ',100%,75%,0.6)'); g.addColorStop(1, 'hsla(' + hue + ',100%,75%,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 6.2832); ctx.fill();
  Outline.draw(ctx, cx, cy, [-16, -12, 32, 24], function (x) {
    // wrapper ends
    x.fillStyle = '#FF8AD0';
    x.beginPath(); x.moveTo(-9, 0); x.lineTo(-15, -7); x.lineTo(-15, 7); x.closePath(); x.fill();
    x.fillStyle = '#8AD8FF';
    x.beginPath(); x.moveTo(9, 0); x.lineTo(15, -7); x.lineTo(15, 7); x.closePath(); x.fill();
    // swirly rainbow disc
    var cols = ['#FF5A5A', '#FFB23A', '#FFE14A', '#5ED66A', '#4AB8FF', '#A46BFF'];
    for (var i = 0; i < 6; i++) {
      x.fillStyle = cols[i];
      x.beginPath(); x.moveTo(0, 0);
      var a0 = t * 3 + i * Math.PI / 3;
      x.arc(0, 0, 9.5, a0, a0 + Math.PI / 3 + 0.02); x.closePath(); x.fill();
    }
    x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 1.4;
    x.beginPath();
    for (var k = 0; k < 30; k++) { var a = t * 3 + k * 0.4, r = k * 0.3; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.stroke();
    G.highlight(x, -3, -4, 3.5, 2, 0.6);
  });
};

Art.bubble = function (ctx, x, y, r, t) {
  var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.15)');
  g.addColorStop(0.8, 'rgba(180,230,255,0.25)');
  g.addColorStop(1, 'rgba(210,180,255,0.55)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  G.highlight(ctx, x - r * 0.4, y - r * 0.45, r * 0.25, r * 0.13, 0.8);
};

// Checkpoint and goal flag ------------------------------------------------------------
Art.checkpoint = function (ctx, x, groundY, on, t) {
  if (Assets.drawFrame(ctx, 'items', on ? 25 : 24, x, groundY - 32)) return;
  // stone base
  ctx.fillStyle = G.lit(ctx, x, groundY - 4, 6, PAL.stoneHi, PAL.stoneLo);
  G.rrect(ctx, x - 8, groundY - 8, 16, 8, 3); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke();
  // pole
  G.limb(ctx, x, groundY - 6, x, groundY - 56, 3, '#8A5A33');
  G.limb(ctx, x - 0.8, groundY - 8, x - 0.8, groundY - 54, 1, '#C49A6C');
  // flag
  var wave = Math.sin(t * 6) * 2;
  var col = on ? '#3FD17A' : '#B9B2A6';
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x + 1, groundY - 55);
  ctx.quadraticCurveTo(x + 12, groundY - 56 + wave, x + 22, groundY - 50 + wave);
  ctx.quadraticCurveTo(x + 12, groundY - 45 - wave, x + 1, groundY - 42);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  if (on) {
    G.star(ctx, x + 10, groundY - 49 + wave * 0.5, 4, 1.8, 5, 0); ctx.fillStyle = '#FFF7B0'; ctx.fill();
    var g = ctx.createRadialGradient(x + 8, groundY - 50, 1, x + 8, groundY - 50, 26);
    g.addColorStop(0, 'rgba(160,255,190,0.4)'); g.addColorStop(1, 'rgba(160,255,190,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 8, groundY - 50, 26, 0, 6.28); ctx.fill();
  }
  G.circle(ctx, x, groundY - 57, 3, on ? '#FFE36E' : '#D9D2C4');
};

Art.flag = function (ctx, x, groundY, rise, t, touched, levelIndex) {
  var h = 150 * rise;
  if (h < 2) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 60, groundY - 170, 140, 170); ctx.clip();
  var top = groundY - h;
  // base
  ctx.fillStyle = G.lit(ctx, x, groundY - 8, 10, PAL.stoneHi, PAL.stoneLo);
  G.rrect(ctx, x - 14, groundY - 14, 28, 14, 4); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  // pole
  var pg = ctx.createLinearGradient(x - 3, 0, x + 3, 0);
  pg.addColorStop(0, '#FFFFFF'); pg.addColorStop(1, '#9AA6B8');
  ctx.fillStyle = pg;
  ctx.fillRect(x - 2.5, top + 6, 5, h - 18);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, top + 6, 5, h - 18);
  // gold star ball on top
  G.circle(ctx, x, top + 6, 6, PAL.gold);
  ctx.strokeStyle = OUTLINE; ctx.stroke();
  G.highlight(ctx, x - 2, top + 4, 2, 1.2, 0.8);
  // banner (slides down when touched)
  var fy = touched ? Math.min(groundY - 40, top + 14 + (t * 60)) : top + 14;
  var w = Math.sin(t * 5) * 3;
  ctx.fillStyle = '#E8403A';
  ctx.beginPath();
  ctx.moveTo(x + 2, fy);
  ctx.quadraticCurveTo(x + 20, fy - 2 + w, x + 38, fy + 6 + w);
  ctx.quadraticCurveTo(x + 22, fy + 14 - w, x + 2, fy + 26);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  G.star(ctx, x + 16, fy + 12 + w * 0.4, 6, 2.6, 5, 0); ctx.fillStyle = PAL.goldHi; ctx.fill();
  ctx.restore();
};

// Level objects --------------------------------------------------------------------
Art.stalactite = function (ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w * 0.62, y + h * 0.7); ctx.lineTo(x + w * 0.5, y + h); ctx.lineTo(x + w * 0.38, y + h * 0.7);
  ctx.closePath();
  var g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#B8AED0'); g.addColorStop(1, '#5A5070');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = 'rgba(200,230,255,0.5)';
  ctx.beginPath(); ctx.moveTo(x + w * 0.25, y + 2); ctx.lineTo(x + w * 0.4, y + 2); ctx.lineTo(x + w * 0.45, y + h * 0.55); ctx.fill();
};

Art.rails = function (ctx, x0, x1, y) {
  ctx.fillStyle = '#5A3A22';
  for (var x = x0 + 4; x < x1; x += 14) ctx.fillRect(x, y, 5, 5);
  ctx.strokeStyle = '#8A8A96'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x0, y + 1); ctx.lineTo(x1, y + 1); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
};

Art.mineCart = function (ctx, x, y, w, h, spin) {
  // wheels
  for (var i = 0; i < 2; i++) {
    var wx = x + 14 + i * (w - 28), wy = y + h - 2;
    G.circle(ctx, wx, wy, 6, '#3A3440');
    ctx.strokeStyle = '#8A8A96'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(wx + Math.cos(spin) * 5, wy + Math.sin(spin) * 5); ctx.lineTo(wx - Math.cos(spin) * 5, wy - Math.sin(spin) * 5); ctx.stroke();
  }
  ctx.fillStyle = G.lit(ctx, x + w / 2, y + h / 2, h, '#B07A48', '#6B4428');
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 6, y + h - 4); ctx.lineTo(x + 6, y + h - 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#8A8A96';
  ctx.fillRect(x, y, w, 4);
  ctx.fillRect(x + w * 0.33, y, 3, h - 4); ctx.fillRect(x + w * 0.66, y, 3, h - 4);
  // crystals in the cart
  ctx.fillStyle = '#7FE0FF';
  ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 16, y - 7); ctx.lineTo(x + 20, y); ctx.fill();
  ctx.fillStyle = '#FF8AE0';
  ctx.beginPath(); ctx.moveTo(x + w - 22, y); ctx.lineTo(x + w - 17, y - 9); ctx.lineTo(x + w - 13, y); ctx.fill();
};

// Cloud platforms: kind 'white' | 'rain' | 'spring' | 'thin'
Art.cloudPlatform = function (ctx, x, y, w, kind, t, alpha, squish) {
  ctx.save();
  ctx.globalAlpha *= alpha === undefined ? 1 : alpha;
  var base = kind === 'rain' ? '#9AA2B2' : kind === 'spring' ? '#FFB3D9' : '#FFFFFF';
  var lo = kind === 'rain' ? '#6E7688' : kind === 'spring' ? '#E07AB0' : '#D6DCEC';
  var n = Math.max(2, Math.round(w / 14));
  var h = 18 - (squish || 0) * 4;
  ctx.fillStyle = lo;
  G.rrect(ctx, x, y + 4, w, h, h / 2); ctx.fill();
  for (var i = 0; i < n; i++) {
    var bx = x + 7 + i * (w - 14) / Math.max(1, n - 1);
    var r = 8 + (i % 2) * 3;
    ctx.fillStyle = G.radial(ctx, bx, y + 6, r, '#FFFFFF', base);
    ctx.beginPath(); ctx.arc(bx, y + 7, r, 0, 6.2832); ctx.fill();
  }
  ctx.fillStyle = base;
  G.rrect(ctx, x + 2, y + 6, w - 4, h - 4, 6); ctx.fill();
  ctx.strokeStyle = kind === 'white' ? 'rgba(255,200,110,0.8)' : 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 6, y + 1); ctx.lineTo(x + w - 6, y + 1); ctx.stroke();
  ctx.strokeStyle = 'rgba(58,42,32,0.3)'; ctx.lineWidth = 1;
  G.rrect(ctx, x, y, w, h + 4, 9); ctx.stroke();
  if (kind === 'rain') {
    // grumpy little face
    ctx.fillStyle = '#3A3440';
    ctx.fillRect(x + w / 2 - 6, y + 8, 3, 3); ctx.fillRect(x + w / 2 + 3, y + 8, 3, 3);
  }
  if (kind === 'spring') {
    ctx.strokeStyle = '#C05090'; ctx.lineWidth = 1.5;
    for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + w / 2 - 8 + k * 8, y + 13, 3, 0, Math.PI); ctx.stroke(); }
  }
  ctx.restore();
};

Art.rain = function (ctx, x, y, w, h, t) {
  ctx.strokeStyle = 'rgba(160,200,255,0.8)'; ctx.lineWidth = 1.5;
  for (var i = 0; i < w / 6; i++) {
    var rx = x + 3 + i * 6;
    var off = ((t * 300 + i * 37) % h);
    ctx.beginPath(); ctx.moveTo(rx, y + off); ctx.lineTo(rx - 2, y + off + 7); ctx.stroke();
  }
};

Art.crumble = function (ctx, x, y, w, alpha, crack) {
  ctx.save();
  ctx.globalAlpha *= Math.max(0, alpha);
  ctx.fillStyle = G.lit(ctx, x + w / 2, y + 10, 12, '#E9B87A', '#A8703A');
  G.rrect(ctx, x, y, w, 20, 4); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,210,0.5)'; ctx.fillRect(x + 3, y + 2, w - 6, 3);
  ctx.strokeStyle = 'rgba(90,50,20,' + (0.3 + (crack || 0) * 0.6) + ')'; ctx.lineWidth = 1;
  for (var i = 16; i < w; i += 32) {
    ctx.beginPath(); ctx.moveTo(x + i, y + 4); ctx.lineTo(x + i + 4, y + 10); ctx.lineTo(x + i - 2, y + 17); ctx.stroke();
  }
  ctx.restore();
};

Art.airVent = function (ctx, x, y, w, h, t) {
  var g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(210,245,255,0.05)'); g.addColorStop(1, 'rgba(210,245,255,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(x + 4, y, w - 8, h);
  ctx.strokeStyle = 'rgba(240,252,255,0.85)'; ctx.lineWidth = 1.4;
  for (var i = 0; i < 9; i++) {
    var by = y + h - ((t * 70 + i * h / 9) % h);
    var bx = x + w / 2 + Math.sin(t * 3 + i * 1.7) * 7;
    ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, 6.2832); ctx.stroke();
  }
  // vent rock
  ctx.fillStyle = '#6A6258';
  G.rrect(ctx, x + 4, y + h - 8, w - 8, 8, 3); ctx.fill();
  ctx.fillStyle = '#2E2A26'; ctx.fillRect(x + 11, y + h - 7, w - 22, 3);
};

Art.shadow = function (ctx, x, y, r, a) {
  ctx.fillStyle = 'rgba(30,20,30,' + (a || 0.35) + ')';
  ctx.beginPath(); ctx.ellipse(x, y - 1, r, r * 0.3, 0, 0, 6.2832); ctx.fill();
};

Art.arenaWall = function (ctx, x, y, w, h, theme) {
  var cols = {
    1: ['#B7B1A6', '#5E5A55'], 2: ['#7A6E90', '#3A3048'], 3: ['#6E7A5A', '#3A4430'], 4: ['#FFFFFF', '#C8D0E8'],
    5: ['#DDEBF7', '#8AA4C0'], 6: ['#8A6A4A', '#4A3422'], 7: ['#E9C08A', '#A8703A']
  }[theme] || ['#B7B1A6', '#5E5A55'];
  var g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(58,42,32,0.45)'; ctx.lineWidth = 1.5;
  for (var yy = y + 16; yy < y + h; yy += 22) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
  ctx.strokeRect(x, y, w, h);
};

// Shots ----------------------------------------------------------------------------
Art.shot = function (ctx, kind, x, y, t, dir, gt) {
  if (Assets.drawAnim(ctx, 'shots', kind, t, x, y, dir < 0)) return;
  switch (kind) {
    case 'star':
      for (var i = 1; i <= 3; i++) Art.sparkle(ctx, x - dir * i * 6, y + Math.sin(t * 20 + i) * 2, 2 - i * 0.4, '#FFE36E', 0.7 - i * 0.18);
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 14 * dir);
      G.star(ctx, 0, 0, 8, 3.6, 5, 0);
      var g = ctx.createLinearGradient(-6, -6, 6, 6); g.addColorStop(0, '#FFF6B0'); g.addColorStop(1, '#F7C21B');
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
      break;
    case 'bubble':
      Art.bubble(ctx, x, y, 8 + Math.sin(t * 10) * 0.8, t);
      break;
    case 'boomerang':
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 18 * dir);
      ctx.fillStyle = '#C49A6C';
      ctx.beginPath(); ctx.moveTo(-9, -3); ctx.quadraticCurveTo(0, -9, 9, -3); ctx.lineTo(8, 1); ctx.quadraticCurveTo(0, -4, -8, 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#8A5A33'; ctx.fillRect(-2, -6.5, 4, 3);
      ctx.restore();
      break;
    case 'fireball':
      for (var k = 1; k <= 4; k++) {
        ctx.fillStyle = 'rgba(255,' + (150 - k * 25) + ',40,' + (0.5 - k * 0.1) + ')';
        ctx.beginPath(); ctx.arc(x - dir * k * 4, y + Math.sin(t * 25 + k) * 1.5, 6 - k, 0, 6.2832); ctx.fill();
      }
      var fg = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8);
      fg.addColorStop(0, '#FFF3B0'); fg.addColorStop(0.5, '#FF9A2A'); fg.addColorStop(1, '#E0401A');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(x, y, 7.5, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(150,40,10,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      break;
  }
};

// Pip ------------------------------------------------------------------------------
Art.pip = function (ctx, x, y, t, mood, rot, extra, tilt) {
  if (Assets.drawAnim(ctx, 'pip', 'fly', t, x, y, false)) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot || 0) + (tilt || 0) * 0.2);
  // soft blue glow underneath
  var g = ctx.createRadialGradient(0, 12, 1, 0, 12, 16);
  g.addColorStop(0, 'rgba(120,200,255,0.6)'); g.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 12, 16, 0, 6.2832); ctx.fill();
  if (extra === 'propeller') {
    G.limb(ctx, 0, -11, 0, -15, 1.5, '#8A8A96');
    var pw = Math.cos(t * 30) * 9;
    G.ellipse(ctx, 0, -15, Math.abs(pw) + 1, 1.8, 0, '#FF6A5A');
  }
  // wing-fins
  var flap = Math.sin(t * 18) * 0.25;
  ctx.fillStyle = '#F2F6FA';
  ctx.save(); ctx.rotate(-0.4 + flap); G.ellipse(ctx, -12, -2, 7, 3, 0, '#EEF3F8'); ctx.restore();
  ctx.save(); ctx.rotate(0.4 - flap); G.ellipse(ctx, 12, -2, 7, 3, 0, '#EEF3F8'); ctx.restore();
  // body
  ctx.fillStyle = G.radial(ctx, 0, 0, 11, '#FFFFFF', '#C8D2DE');
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
  // visor
  G.rrect(ctx, -8, -5.5, 16, 10, 5);
  ctx.fillStyle = '#12161E'; ctx.fill();
  // eyes
  ctx.strokeStyle = '#6FD6FF'; ctx.fillStyle = '#6FD6FF'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  if (mood === 'happy') {
    ctx.beginPath(); ctx.arc(-3.5, 0.5, 2.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(3.5, 0.5, 2.2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else if (mood === 'worried') {
    ctx.beginPath(); ctx.moveTo(-5.5, -2.5); ctx.lineTo(-2, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5.5, -2.5); ctx.lineTo(2, -1); ctx.stroke();
    G.circle(ctx, -3.5, 1.2, 1.3, '#6FD6FF'); G.circle(ctx, 3.5, 1.2, 1.3, '#6FD6FF');
  } else if (mood === 'spin') {
    for (var e = -1; e <= 1; e += 2) {
      ctx.beginPath();
      for (var k = 0; k < 12; k++) { var a = t * 12 + k * 0.6, r = k * 0.22; ctx.lineTo(e * 3.5 + Math.cos(a) * r, Math.sin(a) * r); }
      ctx.stroke();
    }
  } else {
    // smiley eyes
    ctx.beginPath(); ctx.arc(-3.5, -0.5, 1.9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(3.5, -0.5, 1.9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 1, 2.5, 0.3, Math.PI - 0.3); ctx.stroke();
  }
  G.highlight(ctx, -5, -7, 3, 1.6, 0.8);
  if (extra === 'helmet') {
    ctx.strokeStyle = 'rgba(220,245,255,0.8)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, 6.2832); ctx.stroke();
    ctx.fillStyle = 'rgba(200,240,255,0.15)'; ctx.fill();
    G.highlight(ctx, -7, -9, 4, 2, 0.6);
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------
// Enemies (round, soft, big white eyes, grumpy eyebrows)

// Big white grumpy eyes. (x, y) = centre between the eyes, facing +x.
function grumpyEyes(ctx, x, y, r, look, angry, closed) {
  var ex = [x - r * 1.05, x + r * 1.05];
  for (var i = 0; i < 2; i++) {
    if (closed) {
      ctx.strokeStyle = '#1E1A22'; ctx.lineWidth = r * 0.35; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex[i] - r * 0.7, y); ctx.lineTo(ex[i] + r * 0.7, y); ctx.stroke();
      continue;
    }
    G.ellipse(ctx, ex[i], y, r, r * 1.12, 0, '#FFFFFF');
    G.circle(ctx, ex[i] + r * 0.35 * (look || 1), y + r * 0.2, r * 0.52, '#1E1A22');
    G.circle(ctx, ex[i] + r * 0.2 * (look || 1), y - r * 0.05, r * 0.18, '#FFFFFF');
  }
  // grumpy brows slanting down toward the middle
  ctx.strokeStyle = '#1E1A22'; ctx.lineWidth = r * 0.42; ctx.lineCap = 'round';
  var tilt = angry ? 0.75 : 0.5;
  ctx.beginPath(); ctx.moveTo(ex[0] - r * 0.9, y - r * (1.2 + tilt * 0.4)); ctx.lineTo(ex[0] + r * 0.7, y - r * (1.2 - tilt * 0.6)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex[1] + r * 0.9, y - r * (1.2 + tilt * 0.4)); ctx.lineTo(ex[1] - r * 0.7, y - r * (1.2 - tilt * 0.6)); ctx.stroke();
}

function dizzyEyes(ctx, x, y, r, t) {
  var ex = [x - r * 1.05, x + r * 1.05];
  for (var i = 0; i < 2; i++) {
    G.ellipse(ctx, ex[i], y, r, r * 1.12, 0, '#FFFFFF');
    ctx.strokeStyle = '#1E1A22'; ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    for (var k = 0; k < 14; k++) { var a = t * 8 * (i ? 1 : -1) + k * 0.55, rr = k * r * 0.06; ctx.lineTo(ex[i] + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.stroke();
  }
}

function fuzzBall(ctx, x, y, r, base, hi, lo, spikes, t) {
  // spiky fur outline
  ctx.fillStyle = lo;
  ctx.beginPath();
  var n = spikes || 18;
  for (var i = 0; i <= n; i++) {
    var a = i / n * Math.PI * 2;
    var rr = r * (i % 2 ? 1.0 : 1.22) + Math.sin(t * 6 + i) * 0.4;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = G.radial(ctx, x, y, r, hi, base);
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  // fur texture
  ctx.strokeStyle = rgba(lo, 0.6); ctx.lineWidth = 1;
  for (var j = 0; j < 8; j++) {
    var aa = j * 0.8 + 0.3, r0 = r * 0.5;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(aa) * r0, y + Math.sin(aa) * r0); ctx.lineTo(x + Math.cos(aa) * r * 0.85, y + Math.sin(aa) * r * 0.85); ctx.stroke();
  }
}

var ENEMY_SHEET = {
  hedgehog: 'hedgehog', frog: 'frog', mole: 'mole', bat: 'bat', rock: 'rock', crow: 'crow', cloudling: 'cloudling',
  gull: 'gull', spark: 'spark', plant: 'plant', cactus: 'cactus', crab: 'crab', jellyfish: 'jellyfish', puffer: 'puffer',
  eel: 'eel', scorpion: 'scorpion', vulture: 'vulture', tumbleweed: 'tumbleweed'
};

Art.enemy = function (ctx, e, world) {
  var t = e.t;
  var cx = e.x + e.w / 2, by = e.y + e.h;
  if (e.drawBack && !e.dying) e.drawBack(ctx);
  var alt = (e.type === 'frog' && !e.onGround) || (e.type === 'bat' && e.phase === 'swoop') ||
    (e.type === 'puffer' && e.puff > 0.5) || (e.type === 'vulture' && e.phase === 'dive');
  if (e.type !== 'mole' && e.type !== 'eel' &&
    Assets.drawAnim(ctx, 'enemy-' + ENEMY_SHEET[e.type], alt ? 'alt' : 'walk', t, cx, by, e.dir > 0)) return;
  var dir = e.dir || -1;
  var fn = EnemyArt[e.type];
  if (!fn) return;
  if (e.type === 'mole') { EnemyArt.moleHole(ctx, e); if (e.rise <= 0.02) return; }
  if (e.type === 'eel') { EnemyArt.eelHole(ctx, e); if (e.out <= 0.02) return; }
  var box = [-e.w, -e.h * 1.6 - 10, e.w * 2, e.h * 1.6 + 14];
  if (e.type === 'eel') box = [-e.len - 20, -30, e.len * 2 + 40, 44];
  if (e.type === 'puffer') box = [-34, -60, 68, 70];
  if (e.type === 'vulture') box = [-40, -40, 80, 50];
  if (e.type === 'jellyfish') box = [-24, -46, 48, 56];
  Outline.draw(ctx, cx, by, box, function (c) {
    c.save();
    if (e.type !== 'eel') c.scale(-dir, 1);   // art is drawn facing left (-x)
    fn(c, e, t, world);
    c.restore();
  });
};

var EnemyArt = {};

EnemyArt.hedgehog = function (c, e, t) {
  var step = Math.sin(t * 12);
  // feet
  G.ellipse(c, -6 + step * 2, -2, 4, 2.6, 0, '#6B4A36');
  G.ellipse(c, 6 - step * 2, -2, 4, 2.6, 0, '#6B4A36');
  fuzzBall(c, 0, -14, 12, '#4E4A55', '#8A8594', '#2E2A33', 20, t);
  // snout
  G.ellipse(c, -11, -10, 5, 4, 0, '#8A7A70');
  G.circle(c, -15, -10.5, 1.8, '#E88AA0');
  grumpyEyes(c, -5, -16, 3.6, -1, false);
};

EnemyArt.frog = function (c, e, t) {
  var air = !e.onGround;
  var sq = air ? 1.1 : 1 + Math.sin(t * 4) * 0.03;
  c.save(); c.scale(1 / sq, sq);
  // legs
  if (air) {
    G.limb(c, 6, -8, 13, 0, 4, '#3E7A2A');
    G.limb(c, -6, -8, -12, 0, 4, '#3E7A2A');
  } else {
    G.ellipse(c, 9, -4, 7, 4, 0, '#3E7A2A');
    G.ellipse(c, -9, -4, 7, 4, 0, '#3E7A2A');
  }
  c.fillStyle = G.radial(c, 0, -11, 13, '#9BD85A', '#4E9A2E');
  c.beginPath(); c.ellipse(0, -11, 13, 10, 0, 0, 6.2832); c.fill();
  G.ellipse(c, -2, -6, 8, 4, 0, '#D8F0A0');
  // eye bumps
  G.circle(c, -6, -19, 5, '#6BB83A'); G.circle(c, 5, -19, 5, '#6BB83A');
  grumpyEyes(c, -0.5, -19, 3.4, -1, false);
  c.strokeStyle = '#2E5A1E'; c.lineWidth = 1.3;
  c.beginPath(); c.moveTo(-9, -10); c.quadraticCurveTo(-3, -8, 4, -10); c.stroke();
  c.restore();
};

EnemyArt.moleHole = function (c, e) {
  var cx = e.x + e.w / 2, y = e.holeY;
  var shake = e.phase === 'shake' ? Math.sin(e.t * 50) * 1.5 : 0;
  G.ellipse(c, cx, y + 1, 16, 5, 0, '#3A2618');
  c.fillStyle = '#8A5A33';
  for (var i = -2; i <= 2; i++) { c.beginPath(); c.arc(cx + i * 7 + shake, y - 1 - (e.phase === 'shake' ? 2 : 0), 3.5, 0, 6.28); c.fill(); }
};
EnemyArt.mole = function (c, e, t) {
  var h = e.h;
  c.save();
  c.beginPath(); c.rect(-20, -40, 40, 40); c.clip();
  c.fillStyle = G.radial(c, 0, -h * 0.55, 14, '#A07A5A', '#5E4030');
  c.beginPath(); c.ellipse(0, -28 * e.rise + 14, 13, 16, 0, 0, 6.2832); c.fill();
  var y = -28 * e.rise + 6;
  G.ellipse(c, -6, y + 2, 6, 4.5, 0, '#D8B89A');
  G.circle(c, -11, y + 1, 2.8, '#E87A8A');
  grumpyEyes(c, -3, y - 5, 2.8, -1, true);
  // claws
  G.ellipse(c, -11, y + 12, 4, 3, 0.3, '#E8D8C8'); G.ellipse(c, 10, y + 12, 4, 3, -0.3, '#E8D8C8');
  c.restore();
};

EnemyArt.bat = function (c, e, t) {
  var hang = e.phase === 'hang';
  var flap = hang ? 0.2 : Math.sin(t * 16);
  if (hang) c.scale(1, -1), c.translate(0, 20);
  c.fillStyle = '#4A3A6A';
  for (var s = -1; s <= 1; s += 2) {
    c.beginPath();
    c.moveTo(s * 5, -12);
    c.quadraticCurveTo(s * 16, -22 - flap * 8, s * 20, -8 + flap * 6);
    c.quadraticCurveTo(s * 14, -10, s * 12, -4);
    c.quadraticCurveTo(s * 9, -8, s * 5, -6);
    c.fill();
  }
  c.fillStyle = G.radial(c, 0, -10, 9, '#8A76B0', '#4A3A6A');
  c.beginPath(); c.arc(0, -10, 9, 0, 6.2832); c.fill();
  c.fillStyle = '#4A3A6A';
  c.beginPath(); c.moveTo(-6, -16); c.lineTo(-4, -22); c.lineTo(-1, -17); c.fill();
  c.beginPath(); c.moveTo(6, -16); c.lineTo(4, -22); c.lineTo(1, -17); c.fill();
  grumpyEyes(c, -1, -11, 2.8, -1, false, hang && Math.sin(t) > 0.7);
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.moveTo(-3, -5); c.lineTo(-2, -2.5); c.lineTo(-1, -5); c.fill();
};

EnemyArt.rock = function (c, e, t) {
  c.save();
  c.translate(0, -15);
  c.rotate(e.angle || 0);
  c.fillStyle = G.radial(c, 0, 0, 15, '#B8B2A8', '#5E5A55');
  c.beginPath();
  for (var i = 0; i < 9; i++) { var a = i / 9 * 6.283, r = 15 - (i % 3) * 1.2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(60,55,50,0.7)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-6, -8); c.lineTo(-1, -2); c.lineTo(-4, 5); c.moveTo(5, 4); c.lineTo(9, 8); c.stroke();
  G.circle(c, 6, -8, 2.5, '#7DAF3A');
  c.restore();
  grumpyEyes(c, -3, -16, 3, -1, true);
};

EnemyArt.crow = function (c, e, t) {
  var flap = Math.sin(t * 14);
  c.fillStyle = '#2A2A40';
  c.beginPath(); c.moveTo(4, -10); c.quadraticCurveTo(12, -22 - flap * 8, 18, -12 + flap * 4); c.quadraticCurveTo(10, -8, 4, -6); c.fill();
  c.fillStyle = G.radial(c, 0, -10, 10, '#5A5A7A', '#22223A');
  c.beginPath(); c.ellipse(0, -10, 11, 9, 0, 0, 6.2832); c.fill();
  // tail
  c.fillStyle = '#22223A';
  c.beginPath(); c.moveTo(9, -12); c.lineTo(17, -15); c.lineTo(16, -8); c.closePath(); c.fill();
  // beak
  c.fillStyle = '#F2A33A';
  c.beginPath(); c.moveTo(-10, -12); c.lineTo(-17, -9); c.lineTo(-10, -7); c.closePath(); c.fill();
  grumpyEyes(c, -4, -13, 2.8, -1, false);
  c.fillStyle = '#2A2A40';
  c.beginPath(); c.moveTo(-2, -9); c.quadraticCurveTo(-8, -18 + flap * 7, -12, -10 - flap * 3); c.quadraticCurveTo(-6, -7, -2, -6); c.fill();
};

EnemyArt.cloudling = function (c, e, t) {
  var b = Math.sin(t * 3) * 1;
  var puffs = [[-9, -9, 8], [0, -13, 10], [9, -9, 8], [-4, -5, 8], [5, -5, 8]];
  for (var i = 0; i < puffs.length; i++) {
    c.fillStyle = G.radial(c, puffs[i][0], puffs[i][1] + b, puffs[i][2], '#FFFFFF', '#AEB6C8');
    c.beginPath(); c.arc(puffs[i][0], puffs[i][1] + b, puffs[i][2], 0, 6.2832); c.fill();
  }
  grumpyEyes(c, -1, -11 + b, 3, -1, false);
  c.strokeStyle = '#3A3440'; c.lineWidth = 1.3;
  c.beginPath(); c.arc(-1, -2 + b, 3, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
};

EnemyArt.gull = function (c, e, t) {
  var flap = Math.sin(t * 10);
  c.fillStyle = '#9AA6B8';
  c.beginPath(); c.moveTo(-2, -9); c.quadraticCurveTo(8, -24 - flap * 6, 22, -14 - flap * 8); c.quadraticCurveTo(10, -8, 0, -6); c.fill();
  c.fillStyle = G.radial(c, 0, -8, 11, '#FFFFFF', '#C8D0DC');
  c.beginPath(); c.ellipse(0, -8, 13, 7, 0, 0, 6.2832); c.fill();
  c.fillStyle = '#F2C23A';
  c.beginPath(); c.moveTo(-12, -10); c.lineTo(-19, -8); c.lineTo(-12, -6); c.closePath(); c.fill();
  G.ellipse(c, -7, -11, 2.8, 3, 0, '#FFFFFF'); G.circle(c, -7.8, -10.5, 1.4, '#1E1A22');
  c.strokeStyle = '#1E1A22'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-10, -15); c.lineTo(-4, -13); c.stroke();
  c.fillStyle = '#B8C2D0';
  c.beginPath(); c.moveTo(2, -9); c.quadraticCurveTo(-4, -22 + flap * 6, -12, -16 + flap * 6); c.quadraticCurveTo(-4, -9, 2, -6); c.fill();
};

EnemyArt.spark = function (c, e, t) {
  var g = c.createRadialGradient(0, -11, 1, 0, -11, 16);
  g.addColorStop(0, 'rgba(255,255,200,0.9)'); g.addColorStop(1, 'rgba(255,230,80,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, -11, 16, 0, 6.2832); c.fill();
  c.fillStyle = G.radial(c, 0, -11, 10, '#FFFFFF', '#FFD23A');
  c.beginPath(); c.arc(0, -11, 10, 0, 6.2832); c.fill();
  c.strokeStyle = '#FFF6A0'; c.lineWidth = 1.6;
  for (var i = 0; i < 5; i++) {
    var a = t * 7 + i * 1.26;
    c.beginPath(); c.moveTo(Math.cos(a) * 10, -11 + Math.sin(a) * 10);
    c.lineTo(Math.cos(a + 0.2) * 14, -11 + Math.sin(a + 0.2) * 14);
    c.lineTo(Math.cos(a - 0.1) * 17, -11 + Math.sin(a - 0.1) * 17); c.stroke();
  }
  grumpyEyes(c, -1, -12, 2.6, -1, true);
};

EnemyArt.plant = function (c, e, t) {
  var sway = Math.sin(t * 2) * 0.06;
  c.save(); c.rotate(sway);
  G.limb(c, 0, 0, 0, -12, 4, '#3E7A2A');
  c.fillStyle = '#4E9A2E';
  c.beginPath(); c.ellipse(-7, -5, 6, 3, 0.5, 0, 6.28); c.fill();
  c.beginPath(); c.ellipse(7, -5, 6, 3, -0.5, 0, 6.28); c.fill();
  // spiky bulb
  c.fillStyle = '#2E5A1E';
  c.beginPath();
  for (var i = 0; i <= 16; i++) { var a = i / 16 * 6.283, r = i % 2 ? 11 : 15; c.lineTo(Math.cos(a) * r, -20 + Math.sin(a) * r); }
  c.fill();
  c.fillStyle = G.radial(c, 0, -20, 11, '#9AD84A', '#4E8A2A');
  c.beginPath(); c.arc(0, -20, 10.5, 0, 6.2832); c.fill();
  c.fillStyle = '#FFFFFF';
  for (var k = 0; k < 6; k++) { var aa = k * 1.05; c.beginPath(); c.moveTo(Math.cos(aa) * 12, -20 + Math.sin(aa) * 12); c.lineTo(Math.cos(aa) * 16.5, -20 + Math.sin(aa) * 16.5); c.lineTo(Math.cos(aa + 0.2) * 12, -20 + Math.sin(aa + 0.2) * 12); c.fill(); }
  grumpyEyes(c, -1, -21, 2.8, -1, true);
  c.restore();
};

EnemyArt.cactus = function (c, e, t) {
  c.fillStyle = G.lit(c, 0, -15, 12, '#8AC85A', '#3E7A2A');
  G.rrect(c, -8, -30, 16, 30, 8); c.fill();
  G.rrect(c, -16, -20, 7, 12, 3.5); c.fill();
  G.rrect(c, 9, -24, 7, 12, 3.5); c.fill();
  c.strokeStyle = 'rgba(40,80,30,0.6)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-3, -27); c.lineTo(-3, -2); c.moveTo(3, -27); c.lineTo(3, -2); c.stroke();
  c.strokeStyle = '#FFF8E0'; c.lineWidth = 1;
  var sp = [[-8, -24], [8, -18], [-8, -10], [8, -6], [-16, -15], [16, -20], [0, -30]];
  for (var i = 0; i < sp.length; i++) { c.beginPath(); c.moveTo(sp[i][0], sp[i][1]); c.lineTo(sp[i][0] + (sp[i][0] < 0 ? -3 : 3), sp[i][1] - 2); c.stroke(); }
  G.circle(c, 2, -31, 3, '#FF7AB0');
  grumpyEyes(c, -1, -20, 2.6, -1, true);
};

EnemyArt.crab = function (c, e, t) {
  var snap = Math.abs(Math.sin(t * 6));
  var step = Math.sin(t * 14) * 2;
  c.strokeStyle = '#B8401E'; c.lineWidth = 2;
  for (var i = -1; i <= 1; i += 2) for (var k = 0; k < 3; k++) {
    c.beginPath(); c.moveTo(i * 6, -6); c.lineTo(i * (11 + k * 2), -3 + (k === 1 ? step : -step) * 0.5); c.lineTo(i * (13 + k * 2), 0); c.stroke();
  }
  c.fillStyle = G.radial(c, 0, -9, 13, '#FF8A5A', '#C8401E');
  c.beginPath(); c.ellipse(0, -9, 13, 8, 0, 0, 6.2832); c.fill();
  for (var s = -1; s <= 1; s += 2) {
    G.limb(c, s * 10, -11, s * 14, -17, 3, '#C8401E');
    c.fillStyle = '#FF7A4A';
    c.beginPath(); c.arc(s * 15, -19, 5, 0, 6.2832); c.fill();
    c.fillStyle = '#FFE8D0';
    c.beginPath(); c.moveTo(s * 15, -19); c.arc(s * 15, -19, 5, -0.4 - snap * 0.5 + (s < 0 ? Math.PI : 0), 0.4 + snap * 0.5 + (s < 0 ? Math.PI : 0)); c.fill();
  }
  G.limb(c, -3, -15, -4, -20, 1.5, '#C8401E'); G.limb(c, 3, -15, 4, -20, 1.5, '#C8401E');
  grumpyEyes(c, 0, -21, 2.4, -1, false);
};

EnemyArt.jellyfish = function (c, e, t) {
  c.strokeStyle = 'rgba(255,170,220,0.8)'; c.lineWidth = 1.6;
  for (var i = 0; i < 5; i++) {
    var x0 = -9 + i * 4.5;
    c.beginPath(); c.moveTo(x0, -14);
    for (var k = 1; k <= 4; k++) c.lineTo(x0 + Math.sin(t * 4 + i + k) * 2.5, -14 + k * 4);
    c.stroke();
  }
  var g = c.createRadialGradient(-3, -24, 2, 0, -20, 14);
  g.addColorStop(0, 'rgba(255,230,250,0.95)'); g.addColorStop(1, 'rgba(230,110,190,0.85)');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(-13, -14); c.quadraticCurveTo(-13, -32, 0, -32); c.quadraticCurveTo(13, -32, 13, -14);
  c.quadraticCurveTo(6, -11, 0, -14); c.quadraticCurveTo(-6, -11, -13, -14); c.fill();
  // stinging top glow
  c.fillStyle = 'rgba(255,255,160,' + (0.4 + 0.3 * Math.sin(t * 6)) + ')';
  c.beginPath(); c.ellipse(0, -30, 7, 2.5, 0, 0, 6.28); c.fill();
  grumpyEyes(c, 0, -21, 2.6, -1, false);
};

EnemyArt.puffer = function (c, e, t) {
  var p = e.puff || 0;
  var r = 11 + p * 9;
  // tail and fins
  c.fillStyle = '#E0A030';
  c.beginPath(); c.moveTo(r - 2, -12); c.lineTo(r + 8, -18); c.lineTo(r + 8, -6); c.closePath(); c.fill();
  if (p > 0.1) {
    c.fillStyle = '#FFF4D0';
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * 6.283;
      c.beginPath(); c.moveTo(Math.cos(a) * r, -12 + Math.sin(a) * r); c.lineTo(Math.cos(a + 0.12) * (r + 6 * p), -12 + Math.sin(a + 0.12) * (r + 6 * p)); c.lineTo(Math.cos(a + 0.25) * r, -12 + Math.sin(a + 0.25) * r); c.fill();
    }
  }
  c.fillStyle = G.radial(c, 0, -12, r, '#FFE87A', '#E0A030');
  c.beginPath(); c.ellipse(0, -12, r, r * (0.8 + p * 0.2), 0, 0, 6.2832); c.fill();
  G.ellipse(c, -1, -8 + p * 2, r * 0.6, r * 0.35, 0, '#FFF6D8');
  grumpyEyes(c, -r * 0.3, -14 - p * 2, 2.6 + p, -1, p > 0.5);
  c.fillStyle = '#C8601E';
  c.beginPath(); c.arc(-r * 0.85, -10, 1.8, 0, 6.28); c.fill();
};

EnemyArt.eelHole = function (c, e) {
  var y = e.y + 8;
  G.ellipse(c, e.hx, y, 7, 11, 0, '#1A1418');
  if (e.phase === 'warn') {
    c.fillStyle = 'rgba(0,0,0,0.25)';
    G.ellipse(c, e.hx, y, 9, 13, 0, 'rgba(255,255,255,0.12)');
  }
};
EnemyArt.eel = function (c, e, t) {
  var L = e.len * e.out;
  var d = e.dir;
  var hx = e.hx - (e.x + e.w / 2);   // hole mouth in local coords (origin = rect centre bottom)
  var y = -8;
  c.strokeStyle = '#5E7A3A'; c.lineWidth = 12; c.lineCap = 'round';
  c.beginPath(); c.moveTo(hx, y);
  for (var k = 1; k <= 8; k++) c.lineTo(hx + d * L * k / 8, y + Math.sin(t * 10 + k) * 2.5 * (k / 8));
  c.stroke();
  c.strokeStyle = '#A8C86A'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(hx, y + 3);
  for (var k2 = 1; k2 <= 8; k2++) c.lineTo(hx + d * L * k2 / 8, y + 3 + Math.sin(t * 10 + k2) * 2.5 * (k2 / 8));
  c.stroke();
  var head = hx + d * L;
  c.save(); c.translate(head, y); c.scale(-d, 1);
  G.ellipse(c, 0, 0, 10, 7.5, 0, '#6E8A42');
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.moveTo(-9, 2); c.lineTo(-6, 5); c.lineTo(-4, 2); c.fill();
  grumpyEyes(c, -2, -3, 2.3, -1, true);
  c.restore();
};

EnemyArt.scorpion = function (c, e, t) {
  var step = Math.sin(t * (e.dash > 0 ? 30 : 16)) * 2;
  c.strokeStyle = '#8A5A20'; c.lineWidth = 1.8;
  for (var k = 0; k < 3; k++) {
    c.beginPath(); c.moveTo(-3 + k * 5, -5); c.lineTo(-5 + k * 5 + (k % 2 ? step : -step), 0); c.stroke();
  }
  // tail curling up with a stinger
  c.strokeStyle = '#C8842E'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(10, -8); c.quadraticCurveTo(20, -14, 16, -24); c.quadraticCurveTo(12, -30, 6, -26); c.stroke();
  c.fillStyle = '#6B3A1A';
  c.beginPath(); c.moveTo(6, -26); c.lineTo(1, -24); c.lineTo(5, -21); c.closePath(); c.fill();
  c.fillStyle = G.radial(c, 0, -8, 12, '#F0B45A', '#B8742A');
  c.beginPath(); c.ellipse(1, -8, 12, 6.5, 0, 0, 6.2832); c.fill();
  // claws
  G.limb(c, -9, -8, -15, -10, 3, '#C8842E');
  G.ellipse(c, -17, -11, 4.5, 3.2, -0.3, '#E09A40');
  grumpyEyes(c, -5, -12, 2.4, -1, e.dash > 0);
};

EnemyArt.vulture = function (c, e, t) {
  var flap = e.phase === 'dive' ? -0.6 : Math.sin(t * 7);
  c.fillStyle = '#6B4A30';
  c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(14, -26 - flap * 8, 30, -16 - flap * 10); c.quadraticCurveTo(16, -10, 2, -6); c.fill();
  c.fillStyle = G.radial(c, 0, -10, 12, '#9A7A5A', '#4A3220');
  c.beginPath(); c.ellipse(2, -10, 13, 9, 0, 0, 6.2832); c.fill();
  G.ellipse(c, 2, -3, 9, 4, 0, '#E8DCC8');
  G.limb(c, -8, -14, -12, -18, 5, '#E8A0A0');
  G.circle(c, -14, -19, 5.5, '#F0B0A8');
  c.fillStyle = '#E8C04A';
  c.beginPath(); c.moveTo(-18, -20); c.lineTo(-24, -17); c.lineTo(-18, -16); c.closePath(); c.fill();
  G.ellipse(c, -15, -21, 2.4, 2.7, 0, '#FFFFFF'); G.circle(c, -15.8, -20.6, 1.3, '#1E1A22');
  c.strokeStyle = '#1E1A22'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-18, -25); c.lineTo(-12, -23); c.stroke();
  c.fillStyle = '#5A3A22';
  c.beginPath(); c.moveTo(4, -12); c.quadraticCurveTo(-8, -28 + flap * 8, -20, -20 + flap * 8); c.quadraticCurveTo(-6, -10, 4, -7); c.fill();
};

EnemyArt.tumbleweed = function (c, e, t) {
  c.save();
  c.translate(0, -14);
  c.rotate(e.angle || 0);
  c.strokeStyle = '#A07840'; c.lineWidth = 1.6;
  var r = RNG(7);
  for (var i = 0; i < 16; i++) {
    c.beginPath();
    var a0 = r() * 6.28, a1 = a0 + 1 + r() * 2;
    c.arc((r() - 0.5) * 6, (r() - 0.5) * 6, 8 + r() * 6, a0, a1);
    c.stroke();
  }
  c.strokeStyle = '#D8B070'; c.lineWidth = 1;
  for (var k = 0; k < 8; k++) { c.beginPath(); c.arc((r() - 0.5) * 8, (r() - 0.5) * 8, 6 + r() * 6, r() * 6, r() * 6 + 1.5); c.stroke(); }
  c.restore();
};

// ---------------------------------------------------------------------------
// Bosses
var BOSS_SHEET_ANIM = { idle: 'idle', run: 'idle', roar: 'warn', curl: 'warn', shake: 'warn', crouch: 'warn', mouth: 'warn',
  croak: 'warn', crackle: 'warn', frown: 'warn', puff: 'warn', flap: 'warn', wings: 'warn', screech: 'warn', toss: 'warn',
  stamp: 'warn', tail: 'warn', slam: 'attack', roll: 'attack', leap: 'attack', swoop: 'attack', pop: 'attack', dig: 'attack',
  shells: 'attack', fly: 'idle', dizzy: 'dizzy', weak: 'dizzy', hidden: 'idle' };

Art.boss = function (ctx, b, blink) {
  if (b.drawShadow) b.drawShadow(ctx);
  b.drawHazardsBack(ctx);
  if (b.pose === 'hidden') {
    if (b.id === 'duke') BossArt.mound(ctx, b);
    b.drawHazards(ctx);
    return;
  }
  var cx = b.x + b.w / 2, by = b.y + b.h;
  ctx.save();
  if (blink) ctx.globalAlpha *= 0.45;
  var anim = BOSS_SHEET_ANIM[b.pose] || 'idle';
  var sheetOk = Assets.sheet('boss-' + b.id);
  if (sheetOk) {
    Assets.drawAnim(ctx, 'boss-' + b.id, anim, b.t, cx, by, b.facing > 0, b.scale);
  } else {
    var fn = BossArt[b.id];
    var s = b.scale;
    var W = b.w, H = b.h;
    Outline.draw(ctx, cx, by, [-W, -H * 2.2, W * 2, H * 2.4], function (c) {
      c.save();
      c.scale(-b.facing * s, s);
      fn(c, b, b.t);
      c.restore();
    }, { width: 1.6 });
  }
  if (blink) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25;
  }
  ctx.restore();
  b.drawHazards(ctx);
};

var BossArt = {};

BossArt.mound = function (ctx, b) {
  var x = b.mx, y = b.floor();
  var sh = b.state === 'rumble' ? Math.sin(b.t * 50) * 2 : 0;
  ctx.fillStyle = '#8A5A33';
  ctx.beginPath(); ctx.ellipse(x + sh, y, 30, 14, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#A8744A';
  ctx.beginPath(); ctx.ellipse(x + sh - 6, y - 4, 16, 7, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x + sh, y, 30, 14, 0, Math.PI, 0); ctx.stroke();
  // his lamp glints through the dirt
  G.circle(ctx, x + sh, y - 12, 3, '#FFF3A0');
};

// Big Bristle – drawn facing left (-x), origin at bottom centre.
BossArt.bristle = function (c, b, t) {
  var curled = b.pose === 'curl' || b.pose === 'roll';
  if (curled) {
    c.save();
    c.translate(b.wobble || 0, -36);
    c.rotate(b.pose === 'roll' ? -b.roll : Math.sin(t * 20) * 0.08);
    fuzzBall(c, 0, 0, 30, '#4E4A55', '#8A8594', '#2E2A33', 28, t);
    c.strokeStyle = '#2E2A33'; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, 18, 0.5, 2.2); c.stroke();
    c.restore();
    return;
  }
  var puff = b.pose === 'shake' ? 1 + Math.sin(t * 30) * 0.04 + 0.08 : 1;
  var sh = b.pose === 'shake' ? Math.sin(t * 40) * 2 : 0;
  c.save(); c.translate(sh, 0); c.scale(puff, puff);
  var step = b.pose === 'run' ? Math.sin(t * 20) * 4 : 0;
  G.ellipse(c, -20 + step, -5, 11, 6, 0, '#6B4A36'); G.ellipse(c, 20 - step, -5, 11, 6, 0, '#6B4A36');
  fuzzBall(c, 4, -36, 34, '#4E4A55', '#8A8594', '#2E2A33', 34, t);
  // belly and snout
  G.ellipse(c, -12, -26, 20, 16, 0, '#9A8A80');
  G.ellipse(c, -32, -30, 13, 10, 0, '#A8988C');
  G.circle(c, -43, -32, 5, '#E88AA0');
  G.highlight(c, -45, -34, 1.8, 1, 0.8);
  if (b.dizzy) dizzyEyes(c, -18, -46, 8, t);
  else grumpyEyes(c, -18, -46, 8, -1, b.pose === 'roar' || b.pose === 'shake');
  // mouth
  c.strokeStyle = '#2E2A33'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath();
  if (b.pose === 'roar') { c.fillStyle = '#6A2A3A'; c.ellipse(-26, -20, 7, 5, 0, 0, 6.28); c.fill(); }
  else { c.moveTo(-34, -21); c.quadraticCurveTo(-26, -24, -18, -20); c.stroke(); }
  c.restore();
};

// Digger Duke – mole with a yellow miner's helmet and lamp.
BossArt.duke = function (c, b, t) {
  var sink = b.sink || 0;
  c.save();
  c.beginPath(); c.rect(-70, -140, 140, 140); c.clip();
  c.translate(0, sink * b.h);
  var tilt = b.dizzy ? 0.25 : 0;
  c.rotate(tilt);
  // arms / claws
  var stamp = b.pose === 'stamp' ? Math.abs(Math.sin(t * 14)) * 6 : 0;
  var toss = b.pose === 'toss';
  G.ellipse(c, 34, -20 - stamp, 12, 9, 0.5, '#7A5A40');
  G.ellipse(c, toss ? -30 : -36, toss ? -50 : -22 - stamp, 12, 9, -0.5, '#7A5A40');
  c.fillStyle = '#F0E0D0';
  for (var k = 0; k < 3; k++) {
    c.beginPath(); c.ellipse((toss ? -40 : -46) + k * 3, (toss ? -56 : -26) + k * 4 - stamp, 3, 5, -0.6, 0, 6.28); c.fill();
  }
  if (toss) { G.circle(c, -40, -64, 9, '#7C7670'); G.circle(c, -30, -66, 7, '#8C867E'); }
  // body
  c.fillStyle = G.radial(c, 0, -42, 40, '#B08A68', '#5E4030');
  c.beginPath(); c.ellipse(0, -40, 40, 42, 0, 0, 6.2832); c.fill();
  G.ellipse(c, -6, -28, 24, 20, 0, '#C8A888');
  // face
  G.ellipse(c, -22, -44, 14, 10, 0, '#D8B89A');
  G.circle(c, -34, -46, 7, '#E87A8A');
  G.highlight(c, -36, -48, 2.5, 1.4, 0.8);
  if (b.dizzy) dizzyEyes(c, -14, -56, 5.5, t);
  else grumpyEyes(c, -14, -56, 5.5, -1, b.pose === 'stamp' || b.pose === 'roar');
  c.fillStyle = '#FFFFFF';
  c.fillRect(-26, -38, 4, 5); c.fillRect(-21, -38, 4, 5);
  // miner's helmet (crooked when dizzy)
  c.save();
  c.translate(-2, -76);
  c.rotate(b.dizzy ? -0.45 : -0.08);
  c.fillStyle = G.lit(c, 0, 0, 22, '#FFE36E', '#D8A21A');
  c.beginPath(); c.ellipse(0, 4, 30, 8, 0, 0, 6.28); c.fill();
  c.beginPath(); c.arc(0, 4, 23, Math.PI, 0); c.fill();
  c.strokeStyle = 'rgba(140,90,10,0.6)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 4); c.stroke();
  // lamp
  var flash = b.pose === 'toss' && Math.floor(t * 10) % 2 === 0;
  G.rrect(c, -30, -10, 12, 10, 3); c.fillStyle = '#6A6A76'; c.fill();
  G.circle(c, -30, -5, 5, flash ? '#FFFFFF' : '#FFF3A0');
  if (flash || b.pose !== 'dizzy') {
    var lg = c.createRadialGradient(-34, -5, 1, -34, -5, 30);
    lg.addColorStop(0, flash ? 'rgba(255,255,220,0.8)' : 'rgba(255,245,180,0.35)');
    lg.addColorStop(1, 'rgba(255,245,180,0)');
    c.fillStyle = lg; c.beginPath(); c.arc(-34, -5, 30, 0, 6.28); c.fill();
  }
  c.restore();
  c.restore();
  // dirt around him when partly sunk
  if (sink > 0.05) {
    c.fillStyle = '#8A5A33';
    c.beginPath(); c.ellipse(0, 0, 48, 12, 0, Math.PI, 0); c.fill();
  }
};

// Queen Croakia – giant frog with a crown of leaves.
BossArt.croakia = function (c, b, t) {
  var crouch = b.pose === 'crouch';
  var leap = b.pose === 'leap';
  var sq = crouch ? 0.85 : leap ? 1.12 : 1 + Math.sin(t * 3) * 0.02;
  c.save();
  c.scale(1 / sq, sq);
  // legs
  if (leap) {
    G.limb(c, 28, -30, 50, 0, 14, '#3E7A2A'); G.limb(c, -28, -30, -48, 0, 14, '#3E7A2A');
  } else {
    G.ellipse(c, 34, -12, 22, 13, 0, '#3E7A2A'); G.ellipse(c, -34, -12, 22, 13, 0, '#3E7A2A');
    G.ellipse(c, 44, -3, 14, 5, 0, '#5A9A3A'); G.ellipse(c, -46, -3, 14, 5, 0, '#5A9A3A');
  }
  // body
  c.fillStyle = G.radial(c, 0, -38, 48, '#A8E060', '#3E8A2A');
  c.beginPath(); c.ellipse(0, -36, 50, 36, 0, 0, 6.2832); c.fill();
  G.ellipse(c, -6, -22, 34, 16, 0, '#E0F4B0');
  // cheeks puff
  var puff = (crouch || b.pose === 'croak') ? 1 + Math.sin(t * 20) * 0.1 : 0.6;
  G.ellipse(c, -30, -26, 14 * puff, 11 * puff, 0, '#C8F090');
  // mouth
  if (b.pose === 'mouth' || b.pose === 'croak' || b.pose === 'roar') {
    c.fillStyle = '#8A2A3A';
    c.beginPath(); c.ellipse(-24, -30, 22, 9, 0, 0, 6.28); c.fill();
    c.fillStyle = '#E86A8A'; c.beginPath(); c.ellipse(-24, -26, 12, 4, 0, 0, 6.28); c.fill();
  } else {
    c.strokeStyle = '#2E5A1E'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-46, -32); c.quadraticCurveTo(-24, -26, 2, -32); c.stroke();
  }
  // eye bumps on top
  G.circle(c, -26, -64, 14, '#7EC048'); G.circle(c, 4, -64, 14, '#7EC048');
  if (b.dizzy) dizzyEyes(c, -11, -64, 9, t);
  else {
    grumpyEyes(c, -11, -64, 9, -1, crouch || b.pose === 'mouth');
    if (b.pose === 'mouth') {
      c.fillStyle = 'rgba(255,240,120,0.6)';
      c.beginPath(); c.arc(-21, -64, 5, 0, 6.28); c.arc(-1, -64, 5, 0, 6.28); c.fill();
    }
  }
  // leaf crown
  var leaves = [[-26, -84, -0.5], [-14, -88, -0.2], [-2, -89, 0.1], [10, -86, 0.4]];
  for (var i = 0; i < leaves.length; i++) {
    c.save(); c.translate(leaves[i][0], leaves[i][1]); c.rotate(leaves[i][2]);
    c.fillStyle = i % 2 ? '#3E9A3A' : '#5ABA4A';
    c.beginPath(); c.ellipse(0, 0, 5, 11, 0, 0, 6.28); c.fill();
    c.strokeStyle = '#2E6A2A'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, 9); c.stroke();
    c.restore();
  }
  G.circle(c, -8, -80, 4, '#FFD84A');
  c.restore();
  if (b.dizzy) {
    c.fillStyle = '#6B4A30';
    c.beginPath(); c.ellipse(0, 0, 60, 10, 0, Math.PI, 0); c.fill();
  }
};

// Grumblecloud – huge angry storm cloud.
BossArt.grumblecloud = function (c, b, t) {
  var weak = b.pose === 'weak';
  var dark = b.pose === 'frown' ? 0.35 : 0;
  var base = weak ? '#E4E8F0' : mixColor('#7A8294', '#3A3E4C', dark);
  var hi = weak ? '#FFFFFF' : mixColor('#B8C0D0', '#6A7080', dark);
  var puff = b.pose === 'puff' ? 1.1 : weak ? 1.08 : 1;
  var puffs = [[-50, -34, 26], [-22, -50, 32], [12, -52, 34], [46, -38, 26], [-34, -18, 24], [0, -20, 28], [36, -18, 24]];
  for (var i = 0; i < puffs.length; i++) {
    var wob = Math.sin(t * 2 + i) * 1.5;
    c.fillStyle = G.radial(c, puffs[i][0], puffs[i][1] + wob, puffs[i][2] * puff, hi, base);
    c.beginPath(); c.arc(puffs[i][0], puffs[i][1] + wob, puffs[i][2] * puff, 0, 6.2832); c.fill();
  }
  // bushy eyebrows and angry face
  if (weak) {
    dizzyEyes(c, -8, -40, 9, t);
    c.strokeStyle = '#8A90A0'; c.lineWidth = 3;
    c.beginPath(); c.arc(-8, -20, 8, 0.2, Math.PI - 0.2); c.stroke();
  } else {
    G.ellipse(c, -20, -40, 10, 11, 0, '#FFFFFF'); G.ellipse(c, 4, -40, 10, 11, 0, '#FFFFFF');
    G.circle(c, -23, -37, 5, '#1E1A22'); G.circle(c, 1, -37, 5, '#1E1A22');
    c.fillStyle = '#2A2A36';
    c.beginPath(); c.moveTo(-36, -58); c.lineTo(-8, -48); c.lineTo(-10, -42); c.lineTo(-34, -50); c.fill();
    c.beginPath(); c.moveTo(20, -58); c.lineTo(-4, -48); c.lineTo(-2, -42); c.lineTo(18, -50); c.fill();
    c.fillStyle = '#2A2A36';
    if (b.pose === 'puff') { c.beginPath(); c.arc(-30, -20, 6, 0, 6.28); c.fill(); }
    else { c.beginPath(); c.moveTo(-26, -18); c.quadraticCurveTo(-8, -28, 10, -18); c.quadraticCurveTo(-8, -22, -26, -18); c.fill(); }
  }
  if (b.pose === 'crackle') {
    c.strokeStyle = '#FFF6A0'; c.lineWidth = 2;
    for (var k = 0; k < 3; k++) {
      var a = t * 9 + k * 2.1;
      var x0 = Math.cos(a) * 50, y0 = -36 + Math.sin(a) * 24;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + 6, y0 + 8); c.lineTo(x0 - 2, y0 + 12); c.lineTo(x0 + 4, y0 + 20); c.stroke();
    }
  }
};

// Frostbeak – giant white snow owl.
BossArt.frostbeak = function (c, b, t) {
  var p = b.pose;
  var flap = p === 'flap' ? Math.sin(t * 18) : p === 'wings' ? -1 : p === 'swoop' ? -0.6 : Math.sin(t * 6) * 0.6;
  var stuck = p === 'dizzy';
  // wings
  var spread = p === 'wings' ? 1.6 : 1;
  for (var s = -1; s <= 1; s += 2) {
    c.fillStyle = s < 0 ? '#DCE8F4' : '#C8D8EA';
    c.beginPath();
    c.moveTo(s * 20, -50);
    c.quadraticCurveTo(s * 60 * spread, -80 - flap * 20, s * 70 * spread, -40 - flap * 25);
    c.quadraticCurveTo(s * 50 * spread, -30, s * 26, -22);
    c.fill();
    c.strokeStyle = 'rgba(120,150,190,0.6)'; c.lineWidth = 1.5;
    for (var f = 0; f < 3; f++) { c.beginPath(); c.moveTo(s * (34 + f * 10) * spread, -42 - flap * (8 + f * 5)); c.lineTo(s * (40 + f * 10) * spread, -32); c.stroke(); }
  }
  // body
  c.fillStyle = G.radial(c, 0, -40, 36, '#FFFFFF', '#B8CCE0');
  c.beginPath(); c.ellipse(0, -38, 34, 38, 0, 0, 6.2832); c.fill();
  // chest speckles
  c.fillStyle = 'rgba(120,150,190,0.5)';
  for (var i = 0; i < 8; i++) { c.beginPath(); c.arc(-12 + (i % 4) * 8, -30 + Math.floor(i / 4) * 8, 1.8, 0, 6.28); c.fill(); }
  // face disc
  G.ellipse(c, -6, -56, 26, 18, 0, '#F4F8FC');
  // ear tufts
  c.fillStyle = '#DCE8F4';
  c.beginPath(); c.moveTo(-26, -66); c.lineTo(-30, -84); c.lineTo(-16, -70); c.fill();
  c.beginPath(); c.moveTo(14, -66); c.lineTo(18, -84); c.lineTo(4, -70); c.fill();
  if (b.dizzy) dizzyEyes(c, -6, -58, 8, t);
  else {
    G.circle(c, -16, -58, 9, '#FFE070'); G.circle(c, 4, -58, 9, '#FFE070');
    G.circle(c, -17, -57, 4.5, '#1E1A22'); G.circle(c, 3, -57, 4.5, '#1E1A22');
    G.circle(c, -19, -59, 1.6, '#FFFFFF'); G.circle(c, 1, -59, 1.6, '#FFFFFF');
    c.strokeStyle = '#6A7A90'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-28, -71); c.lineTo(-10, -66); c.stroke();
    c.beginPath(); c.moveTo(16, -71); c.lineTo(-2, -66); c.stroke();
  }
  // beak
  c.fillStyle = '#F2B23A';
  c.beginPath(); c.moveTo(-11, -52); c.lineTo(-1, -52); c.lineTo(-6, p === 'screech' ? -40 : -44); c.closePath(); c.fill();
  // feet
  if (!stuck) { G.ellipse(c, -10, -2, 7, 4, 0, '#F2B23A'); G.ellipse(c, 10, -2, 7, 4, 0, '#F2B23A'); }
  if (stuck) {
    // snowdrift
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.ellipse(0, 4, 56, 22, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#DCE8F4';
    c.beginPath(); c.ellipse(-16, 0, 20, 8, 0, Math.PI, 0); c.fill();
  }
};

// Admiral Octavia – giant purple octopus in an admiral's hat.
BossArt.octavia = function (c, b, t) {
  var p = b.pose;
  var dark = p === 'puff' ? 0.45 : 0;
  var base = mixColor('#9A5AC8', '#3A2050', dark);
  var hi = mixColor('#D8A8F0', '#6A4A80', dark);
  // tentacles
  c.lineCap = 'round';
  for (var i = 0; i < 6; i++) {
    var x0 = -40 + i * 16;
    var hold = p === 'shells' && i % 2 === 0;
    c.strokeStyle = base; c.lineWidth = 11;
    c.beginPath(); c.moveTo(x0, -22);
    var tx = x0 + Math.sin(t * 2.5 + i) * 10, ty = hold ? -40 : 10 + Math.cos(t * 2 + i) * 6;
    c.quadraticCurveTo(x0 + Math.sin(t * 2 + i) * 14, -2, tx, ty);
    c.stroke();
    if (hold) { G.circle(c, tx, ty, 8, '#F8D8B0'); c.strokeStyle = '#C89A6A'; c.lineWidth = 1.5; c.beginPath(); c.arc(tx, ty, 5, 0, 5); c.stroke(); }
    c.fillStyle = '#F0C8F8';
    c.beginPath(); c.arc(x0 + 2, -8, 2, 0, 6.28); c.arc(tx, ty - 6, 1.5, 0, 6.28); c.fill();
  }
  // head
  var puff = p === 'puff' ? 1.12 : 1;
  c.fillStyle = G.radial(c, 0, -60, 48 * puff, hi, base);
  c.beginPath(); c.ellipse(0, -58, 48 * puff, 40 * puff, 0, 0, 6.2832); c.fill();
  G.highlight(c, -20, -78, 12, 6, 0.3);
  if (b.dizzy) dizzyEyes(c, -8, -56, 9, t);
  else {
    grumpyEyes(c, -8, -56, 9, -1, p === 'slam' || p === 'puff');
  }
  c.strokeStyle = '#4A2060'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-18, -36); c.quadraticCurveTo(-8, -40, 2, -36); c.stroke();
  // admiral's hat (bicorne)
  c.save(); c.translate(0, -94);
  c.fillStyle = '#1E2A4A';
  c.beginPath(); c.moveTo(-40, 4); c.quadraticCurveTo(0, -30, 40, 4); c.quadraticCurveTo(0, -4, -40, 4); c.fill();
  c.strokeStyle = '#F2C23A'; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(-38, 3); c.quadraticCurveTo(0, -5, 38, 3); c.stroke();
  G.circle(c, 0, -8, 5, '#F2C23A');
  c.fillStyle = '#FFFFFF';
  c.beginPath(); c.moveTo(-3, -12); c.lineTo(0, -22); c.lineTo(3, -12); c.fill();
  c.restore();
};

// King Sandclaw – giant sand scorpion with a golden crown.
BossArt.sandclaw = function (c, b, t) {
  var p = b.pose;
  var run = p === 'run';
  var step = run ? Math.sin(t * 30) * 5 : (p === 'stamp' ? Math.sin(t * 25) * 3 : 0);
  // legs
  c.strokeStyle = '#8A5A20'; c.lineWidth = 5; c.lineCap = 'round';
  for (var k = 0; k < 4; k++) {
    var lx = -30 + k * 20;
    c.beginPath(); c.moveTo(lx, -22); c.lineTo(lx - 8 + (k % 2 ? step : -step), -8); c.lineTo(lx - 10 + (k % 2 ? step : -step), 0); c.stroke();
  }
  // tail
  var raise = p === 'tail' ? 1 : 0;
  c.strokeStyle = '#C8842E'; c.lineWidth = 14;
  c.beginPath(); c.moveTo(40, -34);
  c.quadraticCurveTo(80, -60 - raise * 30, 60, -100 - raise * 30);
  c.quadraticCurveTo(44, -118 - raise * 26, 26, -104 - raise * 20);
  c.stroke();
  c.strokeStyle = '#E8A84A'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(44, -38); c.quadraticCurveTo(76, -62 - raise * 30, 58, -98 - raise * 30); c.stroke();
  // stinger
  var sx = 26, sy = -104 - raise * 20;
  var glow = p === 'tail' ? 0.5 + 0.5 * Math.sin(t * 12) : 0;
  if (glow) {
    var gg = c.createRadialGradient(sx, sy, 1, sx, sy, 22);
    gg.addColorStop(0, 'rgba(255,240,120,' + (0.8 * glow) + ')'); gg.addColorStop(1, 'rgba(255,240,120,0)');
    c.fillStyle = gg; c.beginPath(); c.arc(sx, sy, 22, 0, 6.28); c.fill();
  }
  c.fillStyle = '#6B3A1A';
  c.beginPath(); c.moveTo(sx + 4, sy - 6); c.lineTo(sx - 14, sy + 4); c.lineTo(sx + 2, sy + 8); c.closePath(); c.fill();
  // body
  c.fillStyle = G.radial(c, 0, -36, 56, '#F8C870', '#B8742A');
  c.beginPath(); c.ellipse(4, -34, 56, 26, 0, 0, 6.2832); c.fill();
  c.strokeStyle = 'rgba(140,80,30,0.6)'; c.lineWidth = 2;
  for (var s = 0; s < 4; s++) { c.beginPath(); c.arc(10 + s * 12, -34, 22, -1.2, 1.2); c.stroke(); }
  // claws
  var clawOpen = p === 'stamp' || run ? Math.abs(Math.sin(t * 10)) : 0.3;
  for (var cl = 0; cl < 2; cl++) {
    var cy = -26 - cl * 16;
    G.limb(c, -40, cy, -62, cy - 6, 10, '#C8842E');
    c.fillStyle = '#E09A40';
    c.beginPath(); c.ellipse(-72, cy - 8, 14, 9, -0.2, 0, 6.28); c.fill();
    c.fillStyle = '#B8742A';
    c.beginPath(); c.moveTo(-80, cy - 8); c.lineTo(-92, cy - 14 - clawOpen * 8); c.lineTo(-84, cy - 4); c.fill();
    c.beginPath(); c.moveTo(-80, cy - 6); c.lineTo(-92, cy + 2 + clawOpen * 6); c.lineTo(-78, cy); c.fill();
  }
  // face
  if (b.dizzy) dizzyEyes(c, -30, -46, 7, t);
  else grumpyEyes(c, -30, -46, 7, -1, p === 'stamp' || p === 'run' || p === 'roar');
  c.fillStyle = '#6B3A1A';
  c.beginPath(); c.moveTo(-40, -32); c.quadraticCurveTo(-30, -28, -20, -32); c.lineTo(-30, -30); c.fill();
  // golden crown
  c.save(); c.translate(-26, -64);
  c.fillStyle = G.lit(c, 0, 0, 14, '#FFF0A0', '#D8A21A');
  c.beginPath(); c.moveTo(-14, 4); c.lineTo(-14, -8); c.lineTo(-8, -2); c.lineTo(-2, -12); c.lineTo(4, -2); c.lineTo(10, -8); c.lineTo(12, 4); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(140,90,10,0.8)'; c.lineWidth = 1.2; c.stroke();
  G.circle(c, -2, -1, 2.5, '#E8403A'); G.circle(c, 7, 0, 2, '#4AB8FF');
  c.restore();
};

Art.dizzyStars = function (ctx, x, y, t, r) {
  for (var i = 0; i < 4; i++) {
    var a = t * 4 + i * Math.PI / 2;
    var sx = x + Math.cos(a) * r, sy = y - 10 + Math.sin(a) * r * 0.3;
    G.star(ctx, sx, sy, 6, 2.6, 5, t * 3);
    ctx.fillStyle = PAL.goldHi; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke();
  }
};

// Boss hazards -------------------------------------------------------------------
Art.bossProjectile = function (ctx, kind, x, y, rot, size) {
  ctx.save(); ctx.translate(x, y);
  switch (kind) {
    case 'spine':
      ctx.rotate(rot);
      ctx.fillStyle = '#4E4A55';
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(5, 9); ctx.lineTo(-5, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E8E0D8'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(2, -4); ctx.lineTo(-2, -4); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
      break;
    case 'rock':
      ctx.rotate(rot);
      ctx.fillStyle = G.radial(ctx, 0, 0, size / 2, '#B8B2A8', '#5E5A55');
      ctx.beginPath(); for (var i = 0; i < 7; i++) { var a = i / 7 * 6.28; ctx.lineTo(Math.cos(a) * size / 2, Math.sin(a) * size / 2 * 0.9); } ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
      break;
    case 'snowball':
      ctx.fillStyle = G.radial(ctx, 0, 0, size / 2, '#FFFFFF', '#B8CCE0');
      ctx.beginPath(); ctx.arc(0, 0, size / 2, 0, 6.28); ctx.fill();
      ctx.strokeStyle = 'rgba(80,110,150,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      break;
    case 'stinger':
      ctx.fillStyle = '#6B3A1A';
      ctx.beginPath(); ctx.moveTo(0, 13); ctx.lineTo(6, -8); ctx.lineTo(-6, -8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFE070'; ctx.beginPath(); ctx.arc(0, -10, 4, 0, 6.28); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
      break;
  }
  ctx.restore();
};

Art.floorWave = function (ctx, kind, x, y, w, h, t, dir) {
  var col = kind === 'sand' ? ['#F2C880', '#C8904A'] : ['#FFFFFF', '#A9D3EE'];
  if (kind === 'shock') col = ['#E8F0D0', '#8AA86A'];
  var g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + h);
  ctx.quadraticCurveTo(x + w * 0.3, y - 4, x + w / 2 + dir * 4, y);
  ctx.quadraticCurveTo(x + w * 0.8, y + 2, x + w + 6, y + h);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke();
};

Art.strikeWarning = function (ctx, kind, x, top, bottom, t, w) {
  if (kind === 'lightning') {
    // thin flickering line on the floor and up the column
    var a = 0.35 + 0.35 * Math.abs(Math.sin(t * 30));
    ctx.fillStyle = 'rgba(255,245,150,' + a * 0.25 + ')';
    ctx.fillRect(x - w / 2, top, w, bottom - top);
    ctx.fillStyle = 'rgba(255,250,170,' + a + ')';
    ctx.fillRect(x - w / 2, bottom - 4, w, 4);
    ctx.fillRect(x - 1, top, 2, bottom - top);
  } else {
    // rising bubble line (tentacle)
    ctx.fillStyle = 'rgba(220,245,255,0.15)';
    ctx.fillRect(x - w / 2, top, w, bottom - top);
    ctx.strokeStyle = 'rgba(235,250,255,0.9)'; ctx.lineWidth = 1.3;
    for (var i = 0; i < 6; i++) {
      var by = bottom - ((t * 160 + i * 35) % (bottom - top));
      ctx.beginPath(); ctx.arc(x + Math.sin(t * 5 + i) * 6, by, 3, 0, 6.28); ctx.stroke();
    }
  }
};

Art.columnStrike = function (ctx, kind, x, top, bottom, st, strikeT, stay, w, boss) {
  if (kind === 'lightning') {
    if (st > strikeT) return;
    var a = 1 - st / strikeT;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    var r = RNG(Math.floor(st * 30) + 3);
    ctx.beginPath(); ctx.moveTo(x, top);
    for (var y = top; y < bottom; y += 18) ctx.lineTo(x + (r() - 0.5) * 22, y);
    ctx.lineTo(x, bottom); ctx.stroke();
    ctx.strokeStyle = '#FFF06A'; ctx.lineWidth = 2.5; ctx.stroke();
    var g = ctx.createRadialGradient(x, bottom, 2, x, bottom, 40);
    g.addColorStop(0, 'rgba(255,250,200,0.8)'); g.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, bottom, 40, 0, 6.28); ctx.fill();
    ctx.restore();
    return;
  }
  // tentacle rising from below, then stuck in the sand
  var f = Math.min(1, st / 0.15);
  var h = (bottom - top) * f;
  if (st > strikeT) h = (bottom - top) * 0.55;
  ctx.save();
  ctx.lineCap = 'round';
  var sway = st > strikeT ? Math.sin(st * 3) * 5 : 0;
  ctx.strokeStyle = '#8A4FB8'; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x, bottom + 4); ctx.quadraticCurveTo(x + sway, bottom - h / 2, x + sway * 2, bottom - h + w / 2); ctx.stroke();
  ctx.strokeStyle = '#D8A8F0'; ctx.lineWidth = w * 0.35;
  ctx.beginPath(); ctx.moveTo(x - w * 0.2, bottom); ctx.quadraticCurveTo(x - w * 0.2 + sway, bottom - h / 2, x + sway * 2 - w * 0.2, bottom - h + w / 2); ctx.stroke();
  ctx.fillStyle = '#F0C8F8';
  for (var i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(x + w * 0.25 + sway * i / 5, bottom - h * i / 5, 3, 0, 6.28); ctx.fill(); }
  ctx.restore();
  if (st > strikeT) {
    ctx.fillStyle = '#E8D8A8';
    ctx.beginPath(); ctx.ellipse(x, bottom, w, 6, 0, Math.PI, 0); ctx.fill();
  }
};

Art.sweeper = function (ctx, kind, x, y, w, h, t) {
  if (kind === 'shell') {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(t * 8);
    ctx.fillStyle = G.radial(ctx, 0, 0, w / 2, '#FFF0D8', '#E0A070');
    ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, h / 3); ctx.lineTo(-w / 2, h / 3); ctx.quadraticCurveTo(-w / 2, -h / 2, 0, -h / 2); ctx.fill();
    ctx.strokeStyle = '#B87040'; ctx.lineWidth = 1.2;
    for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, h / 3); ctx.lineTo(i * w / 5, -h / 2 + 2); ctx.stroke(); }
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, h / 3); ctx.lineTo(-w / 2, h / 3); ctx.quadraticCurveTo(-w / 2, -h / 2, 0, -h / 2); ctx.stroke();
    ctx.restore();
  }
};

Art.tongue = function (ctx, x, y, h, len, dir) {
  if (len < 2) return;
  var x1 = x + dir * len;
  ctx.strokeStyle = '#E8607A'; ctx.lineWidth = h; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x1, y + h / 2); ctx.stroke();
  ctx.strokeStyle = '#FF9AAA'; ctx.lineWidth = h * 0.3;
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.35); ctx.lineTo(x1, y + h * 0.35); ctx.stroke();
  G.circle(ctx, x1, y + h / 2, h * 0.75, '#E8607A');
};

Art.areaEffect = function (ctx, kind, x0, x1, arena, t, dur, push) {
  var top = arena.ceilY, bottom = arena.floorY;
  var fade = Math.min(1, t * 3, (dur - t) * 3);
  if (kind === 'rain') {
    ctx.fillStyle = 'rgba(80,100,140,' + 0.18 * fade + ')';
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    ctx.strokeStyle = 'rgba(170,200,255,' + 0.8 * fade + ')'; ctx.lineWidth = 1.5;
    for (var i = 0; i < (x1 - x0) / 12; i++) {
      var rx = x0 + i * 12 + (i % 3) * 3;
      var off = (t * 600 + i * 53) % (bottom - top);
      ctx.beginPath(); ctx.moveTo(rx, top + off); ctx.lineTo(rx - 3, top + off + 12); ctx.stroke();
    }
  } else if (kind === 'wind') {
    ctx.strokeStyle = 'rgba(255,255,255,' + 0.6 * fade + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    var d = push > 0 ? 1 : -1;
    for (var k = 0; k < 14; k++) {
      var wy = top + 30 + (k * 97) % (bottom - top - 40);
      var wx = x0 + ((t * 500 * d + k * 173) % (x1 - x0) + (x1 - x0)) % (x1 - x0);
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + d * 20, wy - 4, wx + d * 40, wy); ctx.stroke();
    }
  }
  // ink is drawn as a front overlay by the world renderer
};

// ---------------------------------------------------------------------------
// Tiles: per-level fallback tile atlas (pre-rendered at device resolution)
var THEMES = {
  1: { base: '#8E8A83', hi: '#B7B1A6', lo: '#5E5A55', top: '#7DAF3A', topHi: '#A9C94A', topLo: '#4E7A26', earth: '#A0633F', earthHi: '#C98458', kind: 'stone' },
  2: { base: '#5E5670', hi: '#8A80A0', lo: '#3A3248', top: '#4E8A6A', topHi: '#7AB88A', topLo: '#2E5A44', earth: '#6A4E5A', earthHi: '#8A6A78', kind: 'cave' },
  3: { base: '#6E6A5C', hi: '#9A9482', lo: '#46423A', top: '#4E8A2A', topHi: '#7AB43A', topLo: '#2E5A1A', earth: '#7A5234', earthHi: '#9A6E48', kind: 'stone' },
  4: { base: '#FFFFFF', hi: '#FFFFFF', lo: '#D8DEF0', top: '#FFFFFF', topHi: '#FFFFFF', topLo: '#F2E0C0', earth: '#F0F2FA', earthHi: '#FFFFFF', kind: 'cloud' },
  5: { base: '#8A96A8', hi: '#B8C4D4', lo: '#5A6478', top: '#FFFFFF', topHi: '#FFFFFF', topLo: '#C8DCEE', earth: '#7A869A', earthHi: '#A0ACC0', kind: 'snow' },
  6: { base: '#C8A870', hi: '#E8CC90', lo: '#8A6A40', top: '#E8D09A', topHi: '#F8E8C0', topLo: '#B89860', earth: '#B08A58', earthHi: '#D0AA70', kind: 'sand' },
  7: { base: '#D89A58', hi: '#F2C080', lo: '#A06A34', top: '#F2D08A', topHi: '#FFF0C0', topLo: '#D0A868', earth: '#C8804A', earthHi: '#E8A060', kind: 'desert' }
};

var TileArt = {
  atlas: null, key: '', cells: {}, CELL: 48,
  get: function (theme) {
    var key = theme + '_' + RS + '_' + Assets.version;
    if (this.key === key) return this.atlas;
    this.key = key;
    this.build(theme);
    return this.atlas;
  },
  build: function (theme) {
    var th = THEMES[theme];
    var names = ['g0', 'g1', 'g2', 'g3', 't0', 't1', 't2', 't3', 'box', 'qbox', 'candybox', 'cracked', 'used', 'thin', 'rope',
      'rainbow', 'plank', 'wall', 'cap', 'capL', 'capR', 'hangL', 'hangR', 'under'];
    var C = this.CELL;
    var cols = 8;
    var rows = Math.ceil(names.length / cols);
    var sc = RS;
    var cv = makeCanvas(cols * C * sc, rows * C * sc);
    var c = cv.getContext('2d');
    this.cells = {};
    for (var i = 0; i < names.length; i++) {
      var cx = (i % cols) * C, cy = Math.floor(i / cols) * C;
      this.cells[names[i]] = [cx * sc, cy * sc];
      c.save();
      c.setTransform(sc, 0, 0, sc, (cx + 8) * sc, (cy + 8) * sc);
      c.beginPath(); c.rect(-8, -8, C, C); c.clip();
      TileArt.paint(c, names[i], th, theme, i);
      c.restore();
    }
    this.atlas = cv;
  },
  // Draw cell name with its 32x32 tile area at (x, y). Cells have 8 px margin.
  blit: function (ctx, name, x, y) {
    var cell = this.cells[name];
    if (!cell) return;
    var sc = RS;
    ctx.drawImage(this.atlas, cell[0], cell[1], this.CELL * sc, this.CELL * sc, x - 8, y - 8, this.CELL, this.CELL);
  },

  paint: function (c, name, th, theme, idx) {
    var r = RNG(idx * 97 + theme * 13 + 5);
    switch (name) {
      case 'g0': case 'g1': case 'g2': case 'g3':
        TileArt.ground(c, th, theme, r, false, +name[1]); break;
      case 't0': case 't1': case 't2': case 't3':
        TileArt.ground(c, th, theme, r, true, +name[1]); break;
      case 'box': TileArt.box(c, 'box'); break;
      case 'qbox': TileArt.box(c, 'q'); break;
      case 'candybox': TileArt.box(c, 'candy'); break;
      case 'cracked': TileArt.box(c, 'cracked'); break;
      case 'used': TileArt.box(c, 'used'); break;
      case 'thin':
        TileArt.thin(c, theme); break;
      case 'rope':
        c.strokeStyle = '#C49A6C'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(16, 0, 32, -6); c.stroke();
        for (var p = 0; p < 4; p++) {
          c.fillStyle = G.lit(c, p * 8 + 4, 5, 5, '#C49A6C', '#7A4E2C');
          G.rrect(c, p * 8 + 0.5, 1 + Math.sin(p) * 0.5, 7, 9, 1.5); c.fill();
          c.strokeStyle = 'rgba(58,42,32,0.6)'; c.lineWidth = 1; c.stroke();
        }
        c.strokeStyle = '#A07A4C'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(0, 3); c.lineTo(32, 3); c.stroke();
        break;
      case 'rainbow':
        var rc = ['#FF6A6A', '#FFB24A', '#FFE85A', '#6AD86A', '#5AB8FF', '#A87AFF'];
        for (var k = 0; k < 6; k++) { c.fillStyle = rc[k]; c.fillRect(0, k * 3.3, 32, 3.4); }
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(0, 0, 32, 2);
        c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(0, 20, 32, 12);
        break;
      case 'plank':
        c.fillStyle = G.lit(c, 16, 16, 16, '#9A6A40', '#5A3A1E');
        c.fillRect(0, 0, 32, 32);
        c.strokeStyle = 'rgba(40,25,15,0.7)'; c.lineWidth = 1.5;
        for (var yy = 8; yy < 32; yy += 8) { c.beginPath(); c.moveTo(0, yy); c.lineTo(32, yy); c.stroke(); }
        c.fillStyle = '#3A2A20';
        c.fillRect(4, 3, 2, 2); c.fillRect(26, 11, 2, 2); c.fillRect(6, 19, 2, 2); c.fillRect(24, 27, 2, 2);
        c.fillStyle = 'rgba(80,140,120,0.35)'; c.fillRect(0, 26, 32, 6);
        break;
      case 'wall':
        c.fillStyle = th.base; c.fillRect(0, 0, 32, 32); break;
      case 'cap':
        TileArt.cap(c, th, theme, r, 0); break;
      case 'capL':
        TileArt.cap(c, th, theme, r, -1); break;
      case 'capR':
        TileArt.cap(c, th, theme, r, 1); break;
      case 'hangL':
        TileArt.hang(c, th, theme, r, -1); break;
      case 'hangR':
        TileArt.hang(c, th, theme, r, 1); break;
      case 'under':
        TileArt.under(c, th, theme, r); break;
    }
  },

  ground: function (c, th, theme, r, top, v) {
    var kind = th.kind;
    if (kind === 'cloud') {
      var cg = c.createLinearGradient(0, 0, 0, 32);
      cg.addColorStop(0, '#FFFFFF'); cg.addColorStop(1, '#EEF0FA');
      c.fillStyle = cg;
      c.fillRect(-1, -1, 34, 34);
      c.fillStyle = 'rgba(255,225,235,0.18)';
      c.beginPath(); c.arc(r() * 32, r() * 32, 10 + r() * 6, 0, 6.28); c.fill();
      c.fillStyle = 'rgba(205,212,240,0.14)';
      c.beginPath(); c.arc(r() * 32, 16 + r() * 16, 9 + r() * 5, 0, 6.28); c.fill();
      return;
    }
    var earthy = (kind === 'stone' && v === 3) || kind === 'sand';
    var base = earthy ? th.earth : th.base, hi = earthy ? th.earthHi : th.hi;
    c.fillStyle = mixColor(th.lo, th.base, 0.45);
    c.fillRect(0, 0, 32, 32);
    if (kind === 'sand') {
      c.fillStyle = G.lit(c, 16, 16, 18, th.hi, th.base);
      c.fillRect(0, 0, 32, 32);
      c.strokeStyle = 'rgba(140,100,50,0.25)'; c.lineWidth = 1;
      for (var s = 0; s < 4; s++) { c.beginPath(); var yy = 6 + s * 7 + r() * 2; c.moveTo(0, yy); c.quadraticCurveTo(16, yy - 2, 32, yy + 1); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,0.25)';
      for (var d = 0; d < 5; d++) c.fillRect(r() * 30, r() * 30, 1.5, 1.5);
    } else {
      // stone blocks: one big block or two stacked blocks
      var blocks = v === 1 ? [[0, 0, 32, 16], [0, 16, 32, 16]] : v === 2 ? [[0, 0, 18, 32], [18, 0, 14, 32]] : [[0, 0, 32, 32]];
      for (var b = 0; b < blocks.length; b++) {
        var B = blocks[b];
        var gx = B[0] + 1, gy = B[1] + 1, gw = B[2] - 2, gh = B[3] - 2;
        c.fillStyle = G.lit(c, gx + gw / 2, gy + gh / 2, Math.max(gw, gh) / 2, hi, base);
        G.rrect(c, gx, gy, gw, gh, 3); c.fill();
        // highlight top-left edge, shadow bottom-right
        c.strokeStyle = rgba('#FFFFFF', 0.2); c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(gx + 2, gy + gh - 2); c.lineTo(gx + 1, gy + 2); c.lineTo(gx + gw - 2, gy + 1); c.stroke();
        c.strokeStyle = rgba('#000000', 0.18);
        c.beginPath(); c.moveTo(gx + gw - 1, gy + 3); c.lineTo(gx + gw - 1, gy + gh - 1); c.lineTo(gx + 3, gy + gh - 1); c.stroke();
        // cracks and pits
        c.strokeStyle = rgba(th.lo, 0.6); c.lineWidth = 0.8;
        if (r() < 0.6) { c.beginPath(); var px = gx + r() * gw; c.moveTo(px, gy + 2); c.lineTo(px + 3, gy + gh * 0.4); c.lineTo(px + 1, gy + gh * 0.7); c.stroke(); }
        c.fillStyle = rgba(th.lo, 0.35);
        for (var q = 0; q < 3; q++) { c.beginPath(); c.arc(gx + r() * gw, gy + r() * gh, 0.8 + r(), 0, 6.28); c.fill(); }
      }
      // moss patches (not in snow/desert)
      if (kind === 'stone' || kind === 'cave') {
        c.fillStyle = rgba(th.top, 0.55);
        for (var m = 0; m < 2; m++) if (r() < 0.55) { c.beginPath(); c.ellipse(r() * 32, r() * 32, 3 + r() * 4, 2 + r() * 2, 0, 0, 6.28); c.fill(); }
      }
      if (kind === 'cave' && v === 2) {
        // small glowing crystal in the rock
        var cc = ['#7FE0FF', '#FF8AE0', '#8AFFB0'][Math.floor(r() * 3)];
        c.fillStyle = cc;
        c.beginPath(); c.moveTo(12, 20); c.lineTo(15, 12); c.lineTo(18, 20); c.closePath(); c.fill();
      }
      if (kind === 'desert') {
        c.strokeStyle = 'rgba(120,70,30,0.35)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(4, 20); c.lineTo(10, 24); c.lineTo(16, 22); c.stroke();
      }
    }
    if (top) {
      // grassy / snowy / sandy top band
      var g = c.createLinearGradient(0, 0, 0, 9);
      g.addColorStop(0, th.topHi); g.addColorStop(1, th.top);
      c.fillStyle = g;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(32, 0); c.lineTo(32, 7);
      for (var x = 32; x >= 0; x -= 4) c.lineTo(x, 7 + (x % 8 ? 3 : 0) + r() * 2);
      c.closePath(); c.fill();
      c.fillStyle = rgba(th.topLo, 0.6);
      for (var k2 = 0; k2 < 5; k2++) { c.beginPath(); c.arc(r() * 32, 8 + r() * 3, 1.5, 0, 6.28); c.fill(); }
    }
  },

  // Top overlay that overhangs the tile edge (moss, snow, sand)
  cap: function (c, th, theme, r, side) {
    var kind = th.kind;
    if (kind === 'cloud') {
      for (var i = 0; i < 3; i++) {
        var bx = 5 + i * 11, rr = 7 + (i % 2) * 2;
        c.fillStyle = G.radial(c, bx, -1, rr, '#FFFFFF', '#F4F2FA');
        c.beginPath(); c.arc(bx, 1, rr, Math.PI, 0); c.fill();
      }
      c.strokeStyle = 'rgba(255,196,110,0.75)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(16, -9, 32, -5); c.stroke();
      return;
    }
    var x0 = side < 0 ? -4 : 0, x1 = side > 0 ? 36 : 32;
    var g = c.createLinearGradient(0, -5, 0, 5);
    g.addColorStop(0, th.topHi); g.addColorStop(1, th.top);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x0, 3);
    for (var x = x0; x <= x1; x += 3) c.lineTo(x, -3 - r() * 2.5);
    c.lineTo(x1, 4);
    c.lineTo(x0, 4);
    c.closePath(); c.fill();
    if (kind === 'stone' || kind === 'cave') {
      // grass blades
      c.strokeStyle = th.topHi; c.lineWidth = 1;
      for (var b = 0; b < 6; b++) { var gx = x0 + r() * (x1 - x0); c.beginPath(); c.moveTo(gx, -2); c.lineTo(gx + (r() - 0.5) * 3, -6 - r() * 3); c.stroke(); }
    }
    if (kind === 'snow') {
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.beginPath(); c.ellipse(16, -2, 18, 5, 0, Math.PI, 0); c.fill();
    }
    if (kind === 'sand' && r() < 0.5) {
      // tiny shell / pebble
      G.circle(c, 6 + r() * 20, 0, 1.6, '#F8E0D0');
    }
  },

  // Hanging moss / roots / icicles over a cliff side
  hang: function (c, th, theme, r, side) {
    var kind = th.kind;
    var x = side < 0 ? -1 : 29;
    if (kind === 'cloud' || kind === 'sand') return;
    if (kind === 'snow') {
      c.fillStyle = 'rgba(230,245,255,0.95)';
      for (var i = 0; i < 3; i++) {
        var ix = side < 0 ? 2 + i * 5 : 30 - i * 5;
        c.beginPath(); c.moveTo(ix - 2, 3); c.lineTo(ix + 2, 3); c.lineTo(ix, 10 + r() * 10); c.closePath(); c.fill();
      }
      return;
    }
    if (kind === 'desert') return;
    c.fillStyle = th.top;
    c.beginPath(); c.moveTo(x - 2, 0); c.lineTo(x + 5, 0);
    var len = 12 + r() * 14;
    c.quadraticCurveTo(x + 5, len * 0.6, x + 2, len);
    c.quadraticCurveTo(x - 1, len * 0.5, x - 2, 0);
    c.fill();
    c.strokeStyle = th.topLo; c.lineWidth = 1;
    for (var k = 0; k < 3; k++) {
      var sx = x + r() * 4;
      c.beginPath(); c.moveTo(sx, 2); c.quadraticCurveTo(sx + (r() - 0.5) * 3, 10, sx + (r() - 0.5) * 4, 14 + r() * 12); c.stroke();
    }
  },

  // Underside of floating islands: roots / moss hanging below
  under: function (c, th, theme, r) {
    if (th.kind === 'cloud') {
      c.fillStyle = 'rgba(210,216,236,0.9)';
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(16, 10, 32, 0); c.fill();
      return;
    }
    if (th.kind === 'snow') {
      c.fillStyle = 'rgba(220,240,255,0.95)';
      for (var i = 0; i < 3; i++) { var ix = 5 + i * 11 + r() * 3; c.beginPath(); c.moveTo(ix - 2.5, 0); c.lineTo(ix + 2.5, 0); c.lineTo(ix, 8 + r() * 10); c.fill(); }
      return;
    }
    if (th.kind === 'desert' || th.kind === 'sand') return;
    c.strokeStyle = th.kind === 'cave' ? '#6A5A48' : th.topLo; c.lineWidth = 1.2;
    for (var k = 0; k < 4; k++) {
      var sx = 3 + r() * 26;
      c.beginPath(); c.moveTo(sx, 0); c.quadraticCurveTo(sx + (r() - 0.5) * 6, 6, sx + (r() - 0.5) * 6, 5 + r() * 9); c.stroke();
    }
    c.fillStyle = rgba(th.top, 0.8);
    c.beginPath(); c.ellipse(8 + r() * 16, 1, 6, 3, 0, 0, Math.PI); c.fill();
  },

  // One-way ledge "~", themed per level.
  thin: function (c, theme) {
    if (theme === 4) { Art.cloudPlatform(c, -1, 0, 34, 'white', 0, 1); return; }
    if (theme === 3) {
      // lily pad
      c.fillStyle = G.lit(c, 16, 6, 14, '#8AD05A', '#3E8A2A');
      c.beginPath(); c.ellipse(16, 6, 17, 7, 0, 0, 6.28); c.fill();
      c.fillStyle = '#2E6A24';
      c.beginPath(); c.moveTo(16, 6); c.lineTo(30, 2); c.lineTo(30, 8); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(40,80,30,0.6)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(16, 6, 17, 7, 0, 0, 6.28); c.stroke();
      return;
    }
    var cols = { 1: ['#C49A6C', '#7A4E2C'], 2: ['#8A80A0', '#3A3248'], 5: ['#E8F6FF', '#9CC4E0'], 6: ['#9A8A78', '#5A4A3A'], 7: ['#F2C080', '#A06A34'] }[theme] || ['#C49A6C', '#7A4E2C'];
    c.fillStyle = G.lit(c, 16, 6, 14, cols[0], cols[1]);
    G.rrect(c, 0, 0, 32, 12, 4); c.fill();
    c.strokeStyle = 'rgba(58,42,32,0.6)'; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(3, 1.5, 26, 2.5);
    if (theme === 5) { c.fillStyle = 'rgba(230,248,255,0.95)'; c.beginPath(); c.moveTo(6, 12); c.lineTo(9, 12); c.lineTo(7.5, 18); c.fill(); c.beginPath(); c.moveTo(22, 12); c.lineTo(26, 12); c.lineTo(24, 20); c.fill(); }
    if (theme === 6) { G.circle(c, 8, 1, 3, '#FF8AA0'); G.circle(c, 24, 0, 2.5, '#FFB24A'); }
    if (theme === 1) { c.strokeStyle = 'rgba(58,42,32,0.4)'; c.beginPath(); c.moveTo(11, 1); c.lineTo(11, 11); c.moveTo(22, 1); c.lineTo(22, 11); c.stroke(); }
  },

  box: function (c, type) {
    if (type === 'used') {
      c.fillStyle = G.lit(c, 16, 16, 16, '#B89A78', '#7A5E44');
      G.rrect(c, 0.5, 0.5, 31, 31, 3); c.fill();
      c.strokeStyle = OUTLINE; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = 'rgba(58,42,32,0.4)';
      c.fillRect(4, 4, 2, 2); c.fillRect(26, 4, 2, 2); c.fillRect(4, 26, 2, 2); c.fillRect(26, 26, 2, 2);
      return;
    }
    // wooden crate
    var base = type === 'q' ? '#E8A83A' : type === 'candy' ? '#E870C0' : '#B07A48';
    var lo = type === 'q' ? '#A86A1A' : type === 'candy' ? '#A04090' : '#6B4428';
    c.fillStyle = G.lit(c, 16, 16, 16, shadeHex(base, 0.25), lo);
    G.rrect(c, 0.5, 0.5, 31, 31, 3); c.fill();
    c.strokeStyle = shadeHex(lo, -0.2); c.lineWidth = 3;
    G.rrect(c, 2.5, 2.5, 27, 27, 2); c.stroke();
    if (type === 'box' || type === 'cracked') {
      c.strokeStyle = shadeHex(lo, -0.1); c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(4, 4); c.lineTo(28, 28); c.stroke();
      c.strokeStyle = 'rgba(58,42,32,0.35)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(4, 11); c.lineTo(28, 11); c.moveTo(4, 21); c.lineTo(28, 21); c.stroke();
    }
    c.strokeStyle = OUTLINE; c.lineWidth = 1.5;
    G.rrect(c, 0.5, 0.5, 31, 31, 3); c.stroke();
    // corner nails
    c.fillStyle = '#E8E0D0';
    c.fillRect(4, 4, 2, 2); c.fillRect(26, 4, 2, 2); c.fillRect(4, 26, 2, 2); c.fillRect(26, 26, 2, 2);
    if (type === 'q' || type === 'candy') {
      UI.text(c, '?', 16, 17, 20, '#FFFFFF', 'center', { lw: 3 });
    }
    if (type === 'cracked') {
      c.strokeStyle = '#3A2A20'; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(9, 3); c.lineTo(13, 12); c.lineTo(8, 17); c.lineTo(14, 26); c.lineTo(11, 30); c.stroke();
      c.beginPath(); c.moveTo(24, 5); c.lineTo(20, 13); c.lineTo(26, 19); c.stroke();
    }
    G.highlight(c, 8, 6, 5, 2, 0.35);
  },

  drawLevel: function (ctx, world) {
    var level = world.level;
    var cam = world.camera;
    var theme = level.index;
    var painted = Assets.sheet('tiles-' + theme);
    if (!painted) this.get(theme);
    var x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), x1 = Math.min(level.w - 1, Math.floor((cam.x + VIEW_W) / TILE) + 1);
    var y0 = Math.max(0, Math.floor(cam.y / TILE) - 1), y1 = Math.min(level.h - 1, Math.floor((cam.y + VIEW_H) / TILE) + 1);
    var t = world.t;
    var W = level.w;
    var tx, ty, code, px, py, look, name, bump;
    for (ty = y0; ty <= y1; ty++) {
      for (tx = x0; tx <= x1; tx++) {
        code = level.grid[ty * W + tx];
        if (!code || code === T.WALL) continue;
        px = tx * TILE; py = ty * TILE;
        bump = world.bumps[tx + ',' + ty];
        if (bump) py -= Math.sin(Math.min(1, bump / 0.16) * Math.PI) * 7;
        switch (code) {
          case T.GROUND:
            look = level.look[ty * W + tx];
            var hv = hash2(tx, ty);
            var v = hv < 0.1 ? 3 : Math.floor(hash2(ty + 11, tx) * 3);
            name = (look & 1 ? 't' : 'g') + v;
            if (painted) Assets.drawTile(ctx, theme, v === 3 ? 'groundAlt' : 'ground', px, py);
            else {
              this.blit(ctx, name, px, py);
              // Depth shading: deeper rock is darker, like the island cliffs.
              var dep = 0;
              while (dep < 4 && level.get(tx, ty - dep - 1) === T.GROUND) dep++;
              if (dep > 0 && theme !== 4) {
                ctx.fillStyle = 'rgba(30,22,40,' + (dep * 0.09) + ')';
                ctx.fillRect(px, py, TILE, TILE);
              }
            }
            break;
          case T.BOX: this.drawBox(ctx, painted, theme, 'box', px, py); break;
          case T.QCOIN: case T.QCARROT:
            this.drawBox(ctx, painted, theme, 'qbox', px, py);
            if ((t + tx * 0.3) % 2.4 < 0.5) Art.sparkle(ctx, px + 8 + ((t * 40) % 16), py + 6, 2, '#FFFFFF', 0.8);
            break;
          case T.QCANDY:
            this.drawBox(ctx, painted, theme, 'candybox', px, py);
            // rainbow shimmer
            var hue = (t * 150 + tx * 40) % 360;
            ctx.fillStyle = 'hsla(' + hue + ',100%,70%,0.35)';
            ctx.fillRect(px + 2, py + 2, 28, 28);
            Art.sparkle(ctx, px + 16 + Math.cos(t * 3) * 12, py + 16 + Math.sin(t * 3) * 12, 2, '#FFFFFF', 0.9);
            break;
          case T.CRACKED: this.drawBox(ctx, painted, theme, 'cracked', px, py); break;
          case T.USED: this.drawBox(ctx, painted, theme, 'used', px, py); break;
          case T.THIN: this.drawBox(ctx, painted, theme, 'thin', px, py); break;
          case T.ROPE: this.blit(ctx, 'rope', px, py); break;
          case T.RAINBOW: this.blit(ctx, 'rainbow', px, py); break;
          case T.PLANK: this.blit(ctx, 'plank', px, py); break;
        }
      }
    }
    // Overlays: moss caps overhanging edges, hanging moss, island undersides
    if (painted) return;
    for (ty = y0; ty <= y1; ty++) {
      for (tx = x0; tx <= x1; tx++) {
        code = level.grid[ty * W + tx];
        if (code !== T.GROUND) continue;
        look = level.look[ty * W + tx];
        px = tx * TILE; py = ty * TILE;
        if (look & 1) {
          this.blit(ctx, (look & 2) ? 'capL' : (look & 4) ? 'capR' : 'cap', px, py);
          if ((look & 2) && hash2(tx, ty + 7) < 0.8) this.blit(ctx, 'hangL', px, py);
          if ((look & 4) && hash2(tx + 3, ty) < 0.8) this.blit(ctx, 'hangR', px, py);
        }
        if (look & 8 && ty < level.h - 1) this.blit(ctx, 'under', px, py + TILE);
      }
    }
  },
  drawBox: function (ctx, painted, theme, name, px, py) {
    if (painted && Assets.drawTile(ctx, theme, name, px, py)) return;
    this.blit(ctx, name, px, py);
  }
};

// ---------------------------------------------------------------------------
// Parallax backgrounds (fallback layers pre-rendered, tileable 1920 px wide)
var BG_W = 1920;
var Backgrounds = {
  cache: {}, key: '',
  PAR: [0.06, 0.18, 0.38, 0.62],
  sky: {
    1: ['#6FB6F2', '#BFE3FA'], 2: ['#1E1830', '#3A2E52'], 3: ['#5E8A6A', '#B8D8A8'], 4: ['#6A6AC8', '#FFB88A'],
    5: ['#9CC4E8', '#E8F4FC'], 6: ['#0E3A6A', '#2A7AB0'], 7: ['#F2A04A', '#FFE0A0']
  },
  layers: function (theme) {
    var key = theme + '_' + RS + '_' + Assets.version;
    if (this.cache[key]) return this.cache[key];
    this.cache = {};
    var sc = Math.min(RS, 1.5);
    var out = [];
    for (var i = 0; i < 3; i++) {
      var cv = makeCanvas(BG_W * sc, VIEW_H * sc);
      var c = cv.getContext('2d');
      c.setTransform(sc, 0, 0, sc, 0, 0);
      BGPaint[theme](c, i, RNG(theme * 31 + i * 7 + 1));
      out.push(cv);
    }
    this.cache[key] = out;
    return out;
  },
  draw: function (ctx, theme, camX, camY, t) {
    var sky = this.sky[theme];
    var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    BGPaint.skyExtras(ctx, theme, t);
    // Painted layers (each 3840x2160 = one screen at 4x, tileable)
    var anyPainted = false;
    for (var p = 0; p < 4; p++) {
      var img = Assets.image('bg-' + theme + '-' + p);
      if (!img) continue;
      anyPainted = true;
      var off = -((camX * this.PAR[p]) % VIEW_W);
      if (theme === 1 && p === 0) off -= (t * 4) % VIEW_W;
      for (var k = -1; k < 2; k++) ctx.drawImage(img, off + k * VIEW_W, 0, VIEW_W, VIEW_H);
    }
    if (anyPainted) return;
    var L = this.layers(theme);
    for (var i = 0; i < L.length; i++) {
      var o = -((camX * this.PAR[i] + (i === 0 ? t * 3 : 0)) % BG_W);
      if (o > 0) o -= BG_W;
      ctx.drawImage(L[i], o, 0, BG_W, VIEW_H);
      ctx.drawImage(L[i], o + BG_W, 0, BG_W, VIEW_H);
    }
  }
};

// Background painters -------------------------------------------------------------
function bgCloud(c, x, y, s, col, alpha) {
  c.fillStyle = rgba(col || '#FFFFFF', alpha === undefined ? 0.85 : alpha);
  var p = [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [-0.4, -0.35, 0.75], [0.4, -0.3, 0.8]];
  for (var w = -1; w <= 1; w++) {
    for (var i = 0; i < p.length; i++) {
      c.beginPath(); c.arc(x + w * BG_W + p[i][0] * s, y + p[i][1] * s, p[i][2] * s, 0, 6.28); c.fill();
    }
  }
}
function bgWrap(fn, x) { fn(x); fn(x - BG_W); fn(x + BG_W); }
function bgMountains(c, baseY, col, snow, r, n, hmin, hmax) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(0, VIEW_H);
  var pts = [];
  var step = BG_W / n;
  for (var i = 0; i <= n; i++) pts.push([i * step, baseY - (hmin + r() * (hmax - hmin))]);
  pts[n][1] = pts[0][1];
  c.lineTo(0, pts[0][1]);
  for (var j = 0; j < n; j++) {
    var mx = (pts[j][0] + pts[j + 1][0]) / 2;
    c.lineTo(mx, Math.max(pts[j][1], pts[j + 1][1]) + 40 + r() * 30);
    c.lineTo(pts[j + 1][0], pts[j + 1][1]);
  }
  c.lineTo(BG_W, VIEW_H);
  c.closePath(); c.fill();
  if (snow) {
    c.fillStyle = snow;
    for (var k = 0; k < n; k++) {
      var p = pts[k];
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] - 26, p[1] + 34); c.lineTo(p[0] - 8, p[1] + 28); c.lineTo(p[0] + 4, p[1] + 38); c.lineTo(p[0] + 24, p[1] + 30); c.closePath(); c.fill();
    }
  }
}
function bgPine(c, x, y, h, col, colLo) {
  bgWrap(function (xx) {
    c.fillStyle = colLo || col;
    c.fillRect(xx - h * 0.04, y - h * 0.2, h * 0.08, h * 0.2);
    for (var i = 0; i < 4; i++) {
      var ty = y - h * 0.2 - i * h * 0.2, w = h * (0.34 - i * 0.07);
      c.fillStyle = i % 2 ? col : (colLo || col);
      c.beginPath(); c.moveTo(xx - w, ty); c.lineTo(xx, ty - h * 0.32); c.lineTo(xx + w, ty); c.closePath(); c.fill();
    }
  }, x);
}
function bgIsland(c, x, y, w, h, cols, waterfall, r) {
  bgWrap(function (xx) {
    // rock body tapering down
    var g = c.createLinearGradient(xx - w / 2, y, xx + w / 2, y + h);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(xx - w / 2, y);
    c.lineTo(xx + w / 2, y);
    c.lineTo(xx + w * 0.38, y + h * 0.45);
    c.lineTo(xx + w * 0.12, y + h * 0.8);
    c.lineTo(xx, y + h);
    c.lineTo(xx - w * 0.15, y + h * 0.75);
    c.lineTo(xx - w * 0.4, y + h * 0.4);
    c.closePath(); c.fill();
    // stone block lines
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
    for (var k = 1; k < 4; k++) { c.beginPath(); c.moveTo(xx - w * 0.45 + k * 4, y + k * h * 0.12); c.lineTo(xx + w * 0.45 - k * 4, y + k * h * 0.12); c.stroke(); }
    // grassy top
    c.fillStyle = cols[2];
    c.beginPath(); c.ellipse(xx, y + 2, w / 2 + 4, 8, 0, Math.PI, 0); c.fill();
    c.fillRect(xx - w / 2 - 4, y, w + 8, 6);
    // hanging moss
    c.fillStyle = cols[2];
    for (var m = 0; m < 5; m++) { var mx = xx - w / 2 + 6 + m * w / 5; c.beginPath(); c.ellipse(mx, y + 8, 3, 7 + (m % 3) * 3, 0, 0, 6.28); c.fill(); }
    if (waterfall) {
      var wx = xx + w * (waterfall - 0.5);
      var wg = c.createLinearGradient(0, y, 0, VIEW_H);
      wg.addColorStop(0, 'rgba(232,244,251,0.95)'); wg.addColorStop(1, 'rgba(169,211,238,0.1)');
      c.fillStyle = wg;
      c.fillRect(wx - 6, y + 2, 12, VIEW_H - y);
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.fillRect(wx - 2, y + 2, 3, VIEW_H - y);
    }
  }, x);
}
function bgCastle(c, x, y, s, stone, stoneLo, banner) {
  bgWrap(function (xx) {
    c.fillStyle = stone;
    c.fillRect(xx - 60 * s, y - 50 * s, 120 * s, 50 * s);
    c.fillRect(xx - 70 * s, y - 90 * s, 28 * s, 90 * s);
    c.fillRect(xx + 42 * s, y - 80 * s, 28 * s, 80 * s);
    c.fillRect(xx - 16 * s, y - 120 * s, 32 * s, 120 * s);
    c.fillStyle = stoneLo;
    c.beginPath(); c.moveTo(xx - 74 * s, y - 90 * s); c.lineTo(xx - 56 * s, y - 116 * s); c.lineTo(xx - 38 * s, y - 90 * s); c.fill();
    c.beginPath(); c.moveTo(xx - 20 * s, y - 120 * s); c.lineTo(xx, y - 150 * s); c.lineTo(xx + 20 * s, y - 120 * s); c.fill();
    c.beginPath(); c.moveTo(xx + 38 * s, y - 80 * s); c.lineTo(xx + 56 * s, y - 104 * s); c.lineTo(xx + 74 * s, y - 80 * s); c.fill();
    // arch & windows
    c.fillStyle = 'rgba(40,50,80,0.5)';
    c.beginPath(); c.arc(xx, y - 14 * s, 12 * s, Math.PI, 0); c.fill(); c.fillRect(xx - 12 * s, y - 14 * s, 24 * s, 14 * s);
    c.fillRect(xx - 4 * s, y - 100 * s, 8 * s, 12 * s);
    // blue banners
    c.fillStyle = banner;
    c.fillRect(xx - 62 * s, y - 84 * s, 10 * s, 26 * s);
    c.fillRect(xx + 50 * s, y - 74 * s, 10 * s, 26 * s);
    c.fillStyle = '#FFFFFF';
    c.fillRect(xx - 59 * s, y - 76 * s, 4 * s, 4 * s);
    c.fillRect(xx + 53 * s, y - 66 * s, 4 * s, 4 * s);
  }, x);
}
function bgHaze(c, col, a) {
  c.fillStyle = rgba(col, a);
  c.fillRect(0, 0, BG_W, VIEW_H);
}

var BGPaint = {};

BGPaint.skyExtras = function (ctx, theme, t) {
  if (theme === 4) {
    // large warm sunset sun
    var g = ctx.createRadialGradient(700, 330, 10, 700, 330, 260);
    g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(0.25, 'rgba(255,200,120,0.8)'); g.addColorStop(1, 'rgba(255,160,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    G.circle(ctx, 700, 330, 70, '#FFE8A8');
  } else if (theme === 7) {
    var g2 = ctx.createRadialGradient(240, 120, 10, 240, 120, 200);
    g2.addColorStop(0, 'rgba(255,255,220,1)'); g2.addColorStop(0.2, 'rgba(255,240,180,0.7)'); g2.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else if (theme === 1 || theme === 5) {
    var g3 = ctx.createRadialGradient(120, 40, 10, 120, 40, 320);
    g3.addColorStop(0, 'rgba(255,245,210,0.7)'); g3.addColorStop(1, 'rgba(255,245,210,0)');
    ctx.fillStyle = g3; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
};

BGPaint[1] = function (c, layer, r) {
  if (layer === 0) {
    // pale sky with soft clouds and snowy mountains
    for (var i = 0; i < 9; i++) bgCloud(c, r() * BG_W, 60 + r() * 160, 24 + r() * 30, '#FFFFFF', 0.75);
    bgMountains(c, 400, '#A8C4DC', '#F4F8FC', r, 7, 120, 240);
    bgHaze(c, '#D8ECFA', 0.22);
  } else if (layer === 1) {
    // floating islands with waterfalls and a distant castle with blue banners
    bgIsland(c, 300, 250, 170, 170, ['#A8A8B0', '#7A7A88', '#9AC06A'], 0.7, r);
    bgIsland(c, 860, 190, 120, 120, ['#A8A8B0', '#7A7A88', '#9AC06A'], 0, r);
    bgIsland(c, 1450, 270, 220, 190, ['#A8A8B0', '#7A7A88', '#9AC06A'], 0.3, r);
    bgCastle(c, 1450, 272, 0.9, '#B0A8B8', '#8A8098', '#3A5AC8');
    bgIsland(c, 1800, 160, 90, 80, ['#A8A8B0', '#7A7A88', '#9AC06A'], 0, r);
    for (var k = 0; k < 6; k++) bgCloud(c, r() * BG_W, 380 + r() * 80, 30 + r() * 20, '#FFFFFF', 0.6);
    bgHaze(c, '#D8ECFA', 0.12);
  } else {
    // mossy stone pillars and pine trees
    for (var p = 0; p < 5; p++) {
      var px = 150 + p * 380 + r() * 80, ph = 200 + r() * 140, pw = 60 + r() * 40;
      bgWrap(function (xx) {
        var g = c.createLinearGradient(xx - pw / 2, 0, xx + pw / 2, 0);
        g.addColorStop(0, '#9A968E'); g.addColorStop(1, '#6A665F');
        c.fillStyle = g;
        c.fillRect(xx - pw / 2, VIEW_H - ph, pw, ph);
        c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 1.5;
        for (var yy = VIEW_H - ph + 30; yy < VIEW_H; yy += 30) { c.beginPath(); c.moveTo(xx - pw / 2, yy); c.lineTo(xx + pw / 2, yy); c.stroke(); }
        c.fillStyle = '#7DAF3A';
        c.beginPath(); c.ellipse(xx, VIEW_H - ph, pw / 2 + 6, 9, 0, Math.PI, 0); c.fill();
        c.fillRect(xx - pw / 2 - 6, VIEW_H - ph, pw + 12, 5);
        for (var m = 0; m < 4; m++) { c.beginPath(); c.ellipse(xx - pw / 2 + 8 + m * pw / 4, VIEW_H - ph + 8, 3, 8 + (m % 2) * 6, 0, 0, 6.28); c.fill(); }
      }, px);
      bgPine(c, px + pw * 0.2, VIEW_H - ph, 70 + r() * 40, '#4E7A3A', '#3A5E2A');
    }
    for (var t2 = 0; t2 < 10; t2++) bgPine(c, r() * BG_W, VIEW_H - 20, 80 + r() * 70, '#5A8A44', '#3E6A30');
    bgHaze(c, '#D8ECFA', 0.12);
  }
};

BGPaint[2] = function (c, layer, r) {
  if (layer === 0) {
    // deep cave glow
    var cols = ['rgba(90,180,255,', 'rgba(255,110,220,', 'rgba(110,255,170,'];
    for (var i = 0; i < 12; i++) {
      var x = r() * BG_W, y = r() * VIEW_H, rad = 60 + r() * 120, col = cols[i % 3];
      bgWrap(function (xx) {
        var g = c.createRadialGradient(xx, y, 1, xx, y, rad);
        g.addColorStop(0, col + '0.35)'); g.addColorStop(1, col + '0)');
        c.fillStyle = g; c.fillRect(xx - rad, y - rad, rad * 2, rad * 2);
      }, x);
    }
    bgMountains(c, 560, '#2A2240', null, r, 10, 120, 260);
  } else if (layer === 1) {
    // giant crystal formations
    var ccols = [['#7FE0FF', '#2A6A9A'], ['#FF8AE0', '#8A2A7A'], ['#8AFFB0', '#2A8A5A']];
    for (var k = 0; k < 9; k++) {
      var cx = r() * BG_W, h = 90 + r() * 180, cc = ccols[k % 3], w = 20 + r() * 26, ang = (r() - 0.5) * 0.6;
      bgWrap(function (xx) {
        c.save(); c.translate(xx, VIEW_H - 40); c.rotate(ang);
        var g = c.createLinearGradient(-w, 0, w, 0);
        g.addColorStop(0, cc[0]); g.addColorStop(1, cc[1]);
        c.fillStyle = g; c.globalAlpha = 0.75;
        c.beginPath(); c.moveTo(-w, 0); c.lineTo(-w * 0.7, -h * 0.8); c.lineTo(0, -h); c.lineTo(w * 0.7, -h * 0.8); c.lineTo(w, 0); c.fill();
        c.globalAlpha = 0.25; c.fillStyle = '#FFFFFF';
        c.beginPath(); c.moveTo(-w * 0.5, -10); c.lineTo(-w * 0.35, -h * 0.75); c.lineTo(0, -h * 0.9); c.lineTo(-w * 0.1, -10); c.fill();
        c.restore();
      }, cx);
    }
    // ceiling stalactites
    c.fillStyle = '#2E2640';
    for (var s = 0; s < 30; s++) { var sx = r() * BG_W, sl = 30 + r() * 90; c.beginPath(); c.moveTo(sx - 12, 0); c.lineTo(sx, sl); c.lineTo(sx + 12, 0); c.fill(); }
  } else {
    // rock pillars with hanging roots
    for (var p = 0; p < 6; p++) {
      var px = p * 320 + r() * 120, pw = 50 + r() * 50;
      bgWrap(function (xx) {
        var g = c.createLinearGradient(xx - pw / 2, 0, xx + pw / 2, 0);
        g.addColorStop(0, '#4A4260'); g.addColorStop(1, '#241E34');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(xx - pw / 2, 0); c.lineTo(xx + pw / 2, 0); c.lineTo(xx + pw * 0.35, VIEW_H * 0.5); c.lineTo(xx + pw / 2, VIEW_H); c.lineTo(xx - pw / 2, VIEW_H); c.lineTo(xx - pw * 0.35, VIEW_H * 0.5); c.fill();
        c.strokeStyle = '#5A4A3A'; c.lineWidth = 1.5;
        for (var k = 0; k < 5; k++) { var rx = xx - pw / 2 + k * pw / 4; c.beginPath(); c.moveTo(rx, 0); c.quadraticCurveTo(rx + 8, 60, rx - 4, 90 + k * 15); c.stroke(); }
      }, px);
    }
  }
};

BGPaint[3] = function (c, layer, r) {
  if (layer === 0) {
    // misty tree silhouettes
    for (var i = 0; i < 26; i++) {
      var x = r() * BG_W, h = 250 + r() * 200;
      bgWrap(function (xx) {
        c.fillStyle = 'rgba(70,110,80,0.55)';
        c.fillRect(xx - 7, VIEW_H - h * 0.5, 14, h * 0.5);
        c.beginPath(); c.ellipse(xx, VIEW_H - h * 0.62, 40 + h * 0.08, h * 0.25, 0, 0, 6.28); c.fill();
      }, x);
    }
    bgHaze(c, '#C8E0C0', 0.35);
  } else if (layer === 1) {
    // big trees with light shafts
    for (var s = 0; s < 6; s++) {
      var sx = r() * BG_W;
      bgWrap(function (xx) {
        var g = c.createLinearGradient(xx, 0, xx - 120, VIEW_H);
        g.addColorStop(0, 'rgba(255,250,200,0.35)'); g.addColorStop(1, 'rgba(255,250,200,0)');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx + 50, 0); c.lineTo(xx - 70, VIEW_H); c.lineTo(xx - 180, VIEW_H); c.fill();
      }, sx);
    }
    for (var t = 0; t < 7; t++) {
      var tx = t * 280 + r() * 80, tw = 34 + r() * 20;
      bgWrap(function (xx) {
        var g = c.createLinearGradient(xx - tw, 0, xx + tw, 0);
        g.addColorStop(0, '#6A5438'); g.addColorStop(1, '#3A2A1A');
        c.fillStyle = g;
        c.fillRect(xx - tw / 2, 0, tw, VIEW_H);
        c.beginPath(); c.moveTo(xx - tw / 2, VIEW_H - 40); c.quadraticCurveTo(xx - tw, VIEW_H - 10, xx - tw * 1.3, VIEW_H); c.lineTo(xx + tw * 1.3, VIEW_H); c.quadraticCurveTo(xx + tw, VIEW_H - 10, xx + tw / 2, VIEW_H - 40); c.fill();
        c.fillStyle = 'rgba(90,150,60,0.8)';
        c.beginPath(); c.ellipse(xx, 20, 120, 70, 0, 0, 6.28); c.fill();
        c.fillStyle = 'rgba(60,110,40,0.8)';
        c.beginPath(); c.ellipse(xx + 40, 50, 90, 50, 0, 0, 6.28); c.fill();
        // mushrooms at the foot
        G.ellipse(c, xx + tw, VIEW_H - 18, 16, 8, 0, '#E86A4A');
        c.fillStyle = '#F2E8D0'; c.fillRect(xx + tw - 3, VIEW_H - 16, 6, 16);
      }, tx);
    }
  } else {
    // ferns and bushes
    for (var b = 0; b < 20; b++) {
      var bx = r() * BG_W, bs = 30 + r() * 40, col = ['#3E7A2A', '#4E8A34', '#2E6A24'][b % 3];
      bgWrap(function (xx) {
        c.fillStyle = col;
        c.beginPath(); c.ellipse(xx, VIEW_H - 10, bs, bs * 0.7, 0, Math.PI, 0); c.fill();
        c.strokeStyle = '#5E9A3A'; c.lineWidth = 2;
        for (var f = 0; f < 5; f++) { c.beginPath(); c.moveTo(xx, VIEW_H - 5); c.quadraticCurveTo(xx + (f - 2) * bs * 0.4, VIEW_H - bs * 1.2, xx + (f - 2) * bs * 0.7, VIEW_H - bs * 0.6); c.stroke(); }
      }, bx);
    }
  }
};

BGPaint[4] = function (c, layer, r) {
  if (layer === 0) {
    // far floating islands and a sky castle
    for (var i = 0; i < 4; i++) bgIsland(c, 200 + i * 480 + r() * 100, 200 + r() * 90, 80 + r() * 60, 70 + r() * 40, ['#C8A0B8', '#8A6A98', '#E8C0A0'], 0, r);
    bgCastle(c, 1000, 220, 0.7, '#E8D0E0', '#B898C0', '#F2B23A');
    bgHaze(c, '#FFD8C0', 0.35);
  } else if (layer === 1) {
    // drifting cloud banks
    for (var k = 0; k < 14; k++) bgCloud(c, r() * BG_W, 330 + r() * 150, 40 + r() * 40, '#FFE8E0', 0.8);
    for (var j = 0; j < 8; j++) bgCloud(c, r() * BG_W, 120 + r() * 120, 26 + r() * 20, '#FFD0C8', 0.5);
  } else {
    for (var m = 0; m < 10; m++) bgCloud(c, r() * BG_W, 470 + r() * 80, 50 + r() * 40, '#FFFFFF', 0.9);
  }
};

BGPaint[5] = function (c, layer, r) {
  if (layer === 0) {
    bgMountains(c, 420, '#B8D0E8', '#FFFFFF', r, 6, 180, 300);
    bgHaze(c, '#E8F4FC', 0.3);
  } else if (layer === 1) {
    bgMountains(c, 470, '#8AA8C8', '#F4FAFF', r, 9, 90, 170);
    for (var i = 0; i < 26; i++) {
      var x = r() * BG_W, h = 60 + r() * 60;
      bgPine(c, x, VIEW_H - 30 - r() * 30, h, '#5A7A8A', '#3E5E6E');
    }
    bgHaze(c, '#E8F4FC', 0.2);
  } else {
    for (var j = 0; j < 22; j++) {
      var x2 = r() * BG_W, h2 = 90 + r() * 80;
      bgPine(c, x2, VIEW_H, h2, '#3E6A58', '#2A4E40');
      bgWrap(function (xx) {
        c.fillStyle = 'rgba(255,255,255,0.9)';
        for (var s = 0; s < 3; s++) { c.beginPath(); c.ellipse(xx, VIEW_H - h2 * (0.35 + s * 0.2), h2 * (0.22 - s * 0.05), 5, 0, 0, 6.28); c.fill(); }
      }, x2);
    }
    c.fillStyle = '#FFFFFF';
    c.fillRect(0, VIEW_H - 16, BG_W, 16);
  }
};

BGPaint[6] = function (c, layer, r) {
  if (layer === 0) {
    // far rocks and a whale silhouette
    bgMountains(c, 560, 'rgba(20,60,110,0.7)', null, r, 8, 120, 260);
    bgWrap(function (xx) {
      c.fillStyle = 'rgba(20,50,90,0.55)';
      c.beginPath(); c.ellipse(xx, 170, 150, 42, 0, 0, 6.28); c.fill();
      c.beginPath(); c.moveTo(xx + 130, 170); c.lineTo(xx + 210, 130); c.lineTo(xx + 200, 200); c.fill();
      c.beginPath(); c.ellipse(xx - 20, 210, 40, 10, 0.4, 0, 6.28); c.fill();
    }, 1200);
  } else if (layer === 1) {
    // near coral and swaying seaweed
    var cc = ['#FF7A8A', '#FFB24A', '#B87AFF', '#FF8AD0'];
    for (var i = 0; i < 18; i++) {
      var x = r() * BG_W, h = 60 + r() * 100, col = cc[i % 4];
      bgWrap(function (xx) {
        c.strokeStyle = rgba(col, 0.75); c.lineWidth = 8; c.lineCap = 'round';
        c.beginPath(); c.moveTo(xx, VIEW_H); c.lineTo(xx, VIEW_H - h * 0.6);
        c.moveTo(xx, VIEW_H - h * 0.4); c.lineTo(xx - 20, VIEW_H - h * 0.8);
        c.moveTo(xx, VIEW_H - h * 0.5); c.lineTo(xx + 22, VIEW_H - h); c.stroke();
      }, x);
    }
    for (var s = 0; s < 22; s++) {
      var sx = r() * BG_W, sh = 80 + r() * 140;
      bgWrap(function (xx) {
        c.strokeStyle = 'rgba(60,150,90,0.7)'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(xx, VIEW_H);
        for (var k = 1; k <= 6; k++) c.lineTo(xx + Math.sin(k * 1.3) * 10, VIEW_H - sh * k / 6);
        c.stroke();
      }, sx);
    }
  } else {
    // sunken ship silhouette far right
    bgWrap(function (xx) {
      c.fillStyle = 'rgba(40,40,60,0.45)';
      c.beginPath(); c.moveTo(xx - 160, VIEW_H - 40); c.lineTo(xx + 160, VIEW_H - 70); c.lineTo(xx + 120, VIEW_H); c.lineTo(xx - 140, VIEW_H); c.fill();
      c.fillRect(xx - 10, VIEW_H - 230, 10, 170);
      c.fillRect(xx - 70, VIEW_H - 190, 120, 6);
    }, 500);
  }
};

BGPaint[7] = function (c, layer, r) {
  if (layer === 0) {
    // distant pyramids
    var ps = [[300, 150], [520, 220], [760, 120], [1300, 200], [1560, 140]];
    for (var i = 0; i < ps.length; i++) {
      var px = ps[i][0], ph = ps[i][1];
      bgWrap(function (xx) {
        c.fillStyle = '#E8B070';
        c.beginPath(); c.moveTo(xx - ph, 440); c.lineTo(xx, 440 - ph); c.lineTo(xx + ph, 440); c.fill();
        c.fillStyle = '#C08850';
        c.beginPath(); c.moveTo(xx, 440 - ph); c.lineTo(xx + ph, 440); c.lineTo(xx + ph * 0.2, 440); c.fill();
      }, px);
    }
    bgHaze(c, '#FFE0B0', 0.4);
  } else if (layer === 1) {
    // dunes
    for (var d = 0; d < 6; d++) {
      var dx = d * 330 + r() * 80, dw = 300 + r() * 200, dh = 80 + r() * 70;
      bgWrap(function (xx) {
        var g = c.createLinearGradient(xx - dw / 2, 0, xx + dw / 2, 0);
        g.addColorStop(0, '#F8D090'); g.addColorStop(1, '#D0904A');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(xx - dw / 2, VIEW_H); c.quadraticCurveTo(xx - dw * 0.1, VIEW_H - dh * 2, xx + dw / 2, VIEW_H); c.fill();
      }, dx);
    }
    bgHaze(c, '#FFE0B0', 0.15);
  } else {
    // bleached bones and far cacti
    for (var k = 0; k < 10; k++) {
      var kx = r() * BG_W, kh = 40 + r() * 40;
      bgWrap(function (xx) {
        c.fillStyle = '#6A8A4A';
        G.rrect(c, xx - 6, VIEW_H - kh, 12, kh, 6); c.fill();
        G.rrect(c, xx - 16, VIEW_H - kh * 0.7, 8, kh * 0.35, 4); c.fill();
      }, kx);
    }
  }
};

// Front layers (drawn over the play layer, in screen space)
var FrontFX = {
  draw: function (ctx, world) {
    var theme = world.level.index;
    var t = world.t;
    var camX = world.camera.x;
    if (theme === 1 || theme === 3 || theme === 4) {
      // light mist at the bottom that hides pits
      var g = ctx.createLinearGradient(0, VIEW_H - 90, 0, VIEW_H);
      var mc = theme === 4 ? '255,230,220' : '232,244,251';
      g.addColorStop(0, 'rgba(' + mc + ',0)'); g.addColorStop(1, 'rgba(' + mc + ',0.85)');
      ctx.fillStyle = g; ctx.fillRect(0, VIEW_H - 90, VIEW_W, 90);
      for (var i = 0; i < 8; i++) {
        var x = ((i * 170 - camX * 0.9 + t * 12) % 1360 + 1360) % 1360 - 200;
        ctx.fillStyle = 'rgba(' + mc + ',0.35)';
        ctx.beginPath(); ctx.ellipse(x, VIEW_H - 14, 110, 26, 0, 0, 6.28); ctx.fill();
      }
    } else if (theme === 5) {
      // falling snowflakes (front layer)
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (var s = 0; s < 70; s++) {
        var sx = ((s * 137 - camX * 1.1 + Math.sin(t + s) * 20) % 1000 + 1000) % 1000 - 20;
        var sy = (s * 53 + t * (30 + (s % 5) * 12)) % 580 - 20;
        ctx.beginPath(); ctx.arc(sx, sy, 1.2 + (s % 3) * 0.8, 0, 6.28); ctx.fill();
      }
    } else if (theme === 7) {
      // heat shimmer and blowing sand
      ctx.fillStyle = 'rgba(255,230,180,0.08)';
      for (var h = 0; h < 5; h++) ctx.fillRect(0, 120 + h * 80 + Math.sin(t * 3 + h) * 6, VIEW_W, 20);
      ctx.fillStyle = 'rgba(240,200,140,0.6)';
      for (var k = 0; k < 60; k++) {
        var kx = ((k * 97 - t * (240 + (k % 4) * 60) - camX * 1.2) % 1000 + 1000) % 1000 - 20;
        var ky = 300 + (k * 41) % 240 + Math.sin(t * 2 + k) * 8;
        ctx.fillRect(kx, ky, 3 + (k % 3), 1.2);
      }
    } else if (theme === 2) {
      // floating crystal motes
      for (var m = 0; m < 20; m++) {
        var mx = ((m * 173 - camX * 0.3) % 1000 + 1000) % 1000 - 20;
        var my = (m * 71 + Math.sin(t * 0.7 + m) * 30) % 540;
        Art.sparkle(ctx, mx, my, 1.4, ['#7FE0FF', '#FF8AE0', '#8AFFB0'][m % 3], 0.5 + 0.4 * Math.sin(t * 2 + m));
      }
    }
  }
};

// ---------------------------------------------------------------------------
// World renderer
var WorldRender = {
  prepare: function (world) {
    // Waterfalls pouring off island edges (Sunny Meadow)
    var level = world.level;
    world.waterfalls = [];
    if (level.index !== 1 && level.index !== 3) return;
    for (var tx = 1; tx < level.w - 2; tx++) {
      for (var ty = 2; ty < level.h - 2; ty++) {
        if (level.get(tx, ty) !== T.GROUND) continue;
        var lk = level.look[ty * level.w + tx];
        if (!(lk & 1)) break;
        var side = (lk & 4) ? 1 : (lk & 2) ? -1 : 0;
        if (!side) break;
        var nx = tx + side;
        var clear = true;
        for (var y = ty; y < level.h; y++) if (level.get(nx, y) !== T.EMPTY) { clear = false; break; }
        if (clear && hash2(tx, ty * 3) < (level.index === 1 ? 0.6 : 0.25) && (tx < level.bossCol - 2 || level.bossCol < 0)) {
          world.waterfalls.push({ x: side > 0 ? (tx + 1) * TILE + 2 : tx * TILE - 12, y: ty * TILE + 6, w: 10 });
        }
        break;
      }
    }
  },

  draw: function (ctx, world) {
    var cam = world.camera;
    var level = world.level;
    var t = world.t;
    Backgrounds.draw(ctx, level.index, cam.x, cam.y, t);
    ctx.save();
    var ox = Math.round((cam.x + cam.shakeX) * RS) / RS, oy = Math.round((cam.y + cam.shakeY) * RS) / RS;
    ctx.translate(-ox, -oy);

    this.drawBackDecor(ctx, world);
    var i;
    for (i = 0; i < world.platforms.length; i++) if (world.platforms[i].drawBack) world.platforms[i].drawBack(ctx, world);
    TileArt.drawLevel(ctx, world);
    if (world.arena) world.arena.drawWalls(ctx);
    for (i = 0; i < world.platforms.length; i++) {
      var pl = world.platforms[i];
      if (cam.visible(pl.x, pl.y, pl.w, pl.h + 30, 40)) pl.draw(ctx, world);
    }
    for (i = 0; i < world.entities.length; i++) {
      var e = world.entities[i];
      if (e.x === undefined || cam.visible(e.x, e.y, e.w || 32, e.h || 32, 64)) e.draw(ctx, world);
    }
    if (world.rainbowAt) Art.victoryRainbow(ctx, world.rainbowAt, t);
    for (i = 0; i < world.enemies.length; i++) {
      var en = world.enemies[i];
      if (cam.visible(en.x, en.y - 20, en.w, en.h + 40, 120) || en.shadow) en.draw(ctx, world);
    }
    if (world.boss) world.boss.draw(ctx);
    for (i = 0; i < world.shots.length; i++) world.shots[i].draw(ctx, world);
    Art.player(ctx, world.player, world);
    FX.draw(ctx);
    if (world.pip) world.pip.draw(ctx);
    ctx.restore();

    this.drawOverlays(ctx, world);
    FrontFX.draw(ctx, world);
    ctx.save();
    ctx.translate(-ox, -oy);
    if (world.pip) world.pip.drawBubble(ctx);
    ctx.restore();
  },

  drawBackDecor: function (ctx, world) {
    var level = world.level;
    var cam = world.camera;
    var t = world.t;
    var i;
    // waterfalls
    for (i = 0; i < world.waterfalls.length; i++) {
      var wf = world.waterfalls[i];
      if (wf.x < cam.x - 20 || wf.x > cam.x + VIEW_W + 20) continue;
      var g = ctx.createLinearGradient(0, wf.y, 0, level.ph);
      g.addColorStop(0, 'rgba(232,244,251,0.95)'); g.addColorStop(1, 'rgba(169,211,238,0.2)');
      ctx.fillStyle = g;
      ctx.fillRect(wf.x, wf.y, wf.w, level.ph - wf.y);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (var s = 0; s < 6; s++) {
        var sy = wf.y + ((t * 220 + s * 60) % (level.ph - wf.y));
        ctx.fillRect(wf.x + 2 + (s % 3) * 2, sy, 2, 22);
      }
    }
    // decorations (seaweed / coral)
    for (i = 0; i < level.decor.length; i++) {
      var d = level.decor[i];
      var dx = d.tx * TILE + 16, dy = (d.ty + 1) * TILE;
      if (dx < cam.x - 40 || dx > cam.x + VIEW_W + 40) continue;
      Art.decor(ctx, level.index, dx, dy, t, d.tx);
    }
    // wind zones and water currents: visible streaming lines
    var x0 = Math.max(0, Math.floor(cam.x / TILE)), x1 = Math.min(level.w - 1, Math.ceil((cam.x + VIEW_W) / TILE));
    ctx.lineCap = 'round';
    for (var ty = 0; ty < level.h; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        var z = level.zone[ty * level.w + tx];
        if (!z) continue;
        var px = tx * TILE, py = ty * TILE;
        if (z & Z.WIND) {
          var dir = world.def.windDir || 1;
          var ph = ((t * 3.5 + hash2(tx, ty) * 4) % 1);
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * Math.sin(ph * Math.PI)) + ')';
          ctx.lineWidth = 2;
          var wx = px + (dir > 0 ? ph * 32 : 32 - ph * 32);
          ctx.beginPath(); ctx.moveTo(wx - dir * 14, py + 10 + (tx % 3) * 6); ctx.quadraticCurveTo(wx, py + 7 + (tx % 3) * 6, wx + dir * 10, py + 10 + (tx % 3) * 6); ctx.stroke();
        }
        if (z & (Z.CUR_L | Z.CUR_R)) {
          var cd = (z & Z.CUR_L) ? -1 : 1;
          var cp = ((t * 2 + hash2(ty, tx) * 3) % 1);
          ctx.strokeStyle = 'rgba(200,240,255,' + (0.5 * Math.sin(cp * Math.PI)) + ')';
          ctx.lineWidth = 1.6;
          var cx = px + (cd > 0 ? cp * 32 : 32 - cp * 32);
          ctx.beginPath(); ctx.moveTo(cx - cd * 12, py + 16 + (tx % 2) * 6); ctx.lineTo(cx + cd * 8, py + 16 + (tx % 2) * 6); ctx.stroke();
        }
        if (z & Z.QUICK) {
          Art.quicksand(ctx, px, py, t, !(level.zoneAt(tx, ty - 1) & Z.QUICK));
        }
      }
    }
  },

  drawOverlays: function (ctx, world) {
    var level = world.level;
    var cam = world.camera;
    var p = world.player;
    var t = world.t;
    var psx = p.x + p.w / 2 - cam.x, psy = p.y + p.h / 2 - cam.y;
    if (level.underwater) {
      ctx.fillStyle = 'rgba(20,90,170,0.16)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      // light rays from above
      for (var i = 0; i < 5; i++) {
        var rx = ((i * 260 - cam.x * 0.3 + t * 8) % 1300 + 1300) % 1300 - 200;
        var g = ctx.createLinearGradient(rx, 0, rx - 160, VIEW_H);
        g.addColorStop(0, 'rgba(220,245,255,' + (0.16 + 0.05 * Math.sin(t + i)) + ')'); g.addColorStop(1, 'rgba(220,245,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx + 70, 0); ctx.lineTo(rx - 90, VIEW_H); ctx.lineTo(rx - 200, VIEW_H); ctx.fill();
      }
      // water surface
      var sy = level.waterTop - cam.y;
      if (sy > -10) {
        ctx.fillStyle = 'rgba(180,230,255,0.3)';
        ctx.fillRect(0, 0, VIEW_W, Math.max(0, sy));
        ctx.strokeStyle = 'rgba(230,250,255,0.9)'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (var x = 0; x <= VIEW_W; x += 16) ctx.lineTo(x, sy + Math.sin(x * 0.05 + t * 2) * 3);
        ctx.stroke();
      }
    }
    // Darker cave tunnels: a soft circle of light around the player
    var dark = world.darkness || 0;
    if (dark > 0.01) {
      var rad = 150;
      var dg = ctx.createRadialGradient(psx, psy, rad * 0.3, psx, psy, rad);
      dg.addColorStop(0, 'rgba(8,6,16,0)');
      dg.addColorStop(1, 'rgba(8,6,16,' + (0.88 * dark) + ')');
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // Octavia's ink cloud
    if (world.darkZone) {
      var dz = world.darkZone;
      ctx.fillStyle = 'rgba(20,10,30,' + 0.88 * dz.a + ')';
      var zx0 = dz.x0 - cam.x, zx1 = dz.x1 - cam.x;
      ctx.fillRect(zx0, 0, zx1 - zx0, VIEW_H);
      for (var k = 0; k < 8; k++) {
        ctx.fillStyle = 'rgba(40,20,50,' + 0.5 * dz.a + ')';
        ctx.beginPath(); ctx.arc(zx0 + (k * 67) % (zx1 - zx0), 60 + (k * 97) % 400, 50, 0, 6.28); ctx.fill();
      }
    }
    if (world.flashT > 0) {
      ctx.fillStyle = 'rgba(255,255,240,' + Math.min(0.6, world.flashT * 5) + ')';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
};

Art.decor = function (ctx, theme, x, y, t, seed) {
  var h = 26 + (seed % 3) * 10;
  if (theme === 6) {
    if (seed % 2) {
      ctx.strokeStyle = '#3E9A5A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (var k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(x + k * 5, y);
        for (var s = 1; s <= 5; s++) ctx.lineTo(x + k * 5 + Math.sin(t * 2 + s + k) * 4, y - h * s / 5);
        ctx.stroke();
      }
    } else {
      var col = ['#FF7A8A', '#FFB24A', '#B87AFF', '#FF8AD0'][seed % 4];
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h * 0.6); ctx.moveTo(x, y - h * 0.3); ctx.lineTo(x - 10, y - h * 0.8);
      ctx.moveTo(x, y - h * 0.4); ctx.lineTo(x + 10, y - h); ctx.stroke();
      ctx.fillStyle = shadeHex(col, 0.4);
      ctx.beginPath(); ctx.arc(x + 10, y - h, 3, 0, 6.28); ctx.arc(x - 10, y - h * 0.8, 3, 0, 6.28); ctx.fill();
    }
  } else if (theme === 2) {
    var cc = ['#7FE0FF', '#FF8AE0', '#8AFFB0'][seed % 3];
    var g = ctx.createRadialGradient(x, y - 12, 1, x, y - 12, 34);
    g.addColorStop(0, rgba(cc, 0.45)); g.addColorStop(1, rgba(cc, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 12, 34, 0, 6.28); ctx.fill();
    ctx.fillStyle = cc;
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 5, y - 18); ctx.lineTo(x - 1, y); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y - 26); ctx.lineTo(x + 7, y); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 5, y); ctx.lineTo(x + 10, y - 14); ctx.lineTo(x + 12, y); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 22); ctx.lineTo(x + 2, y); ctx.fill();
  } else if (theme === 3) {
    // giant mushroom
    ctx.fillStyle = '#F2E8D0'; ctx.fillRect(x - 4, y - h * 0.7, 8, h * 0.7);
    ctx.fillStyle = G.lit(ctx, x, y - h * 0.7, 18, '#FF8A6A', '#C8402A');
    ctx.beginPath(); ctx.ellipse(x, y - h * 0.7, 18, 11, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#FFF4E0';
    ctx.beginPath(); ctx.arc(x - 7, y - h * 0.7 - 5, 2.5, 0, 6.28); ctx.arc(x + 6, y - h * 0.7 - 7, 2, 0, 6.28); ctx.fill();
  } else if (theme === 5) {
    // frosted pine
    bgPineSingle(ctx, x, y, 60 + (seed % 3) * 14);
  } else if (theme === 7) {
    // bleached bones
    ctx.fillStyle = '#F4ECDC';
    ctx.fillRect(x - 10, y - 4, 20, 3);
    ctx.beginPath(); ctx.arc(x - 10, y - 2.5, 3, 0, 6.28); ctx.arc(x + 10, y - 2.5, 3, 0, 6.28); ctx.fill();
  } else {
    // flowers and grass tufts
    ctx.strokeStyle = '#5E9A3A'; ctx.lineWidth = 1.5;
    for (var f = -2; f <= 2; f++) { ctx.beginPath(); ctx.moveTo(x + f * 3, y); ctx.lineTo(x + f * 4 + Math.sin(t * 2 + f) * 1.5, y - 10 - (f % 2) * 4); ctx.stroke(); }
    G.circle(ctx, x - 4, y - 12, 2.5, '#FFE36E'); G.circle(ctx, x + 5, y - 14, 2.5, '#FF9AC0');
  }
};

function bgPineSingle(ctx, x, y, h) {
  ctx.fillStyle = '#5A3A22'; ctx.fillRect(x - 3, y - h * 0.2, 6, h * 0.2);
  for (var i = 0; i < 4; i++) {
    var ty = y - h * 0.2 - i * h * 0.2, w = h * (0.34 - i * 0.07);
    ctx.fillStyle = i % 2 ? '#3E6A58' : '#2E5646';
    ctx.beginPath(); ctx.moveTo(x - w, ty); ctx.lineTo(x, ty - h * 0.32); ctx.lineTo(x + w, ty); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(x - w * 0.3, ty - 3, w * 0.5, 3, 0, 0, 6.28); ctx.fill();
  }
}

Art.quicksand = function (ctx, x, y, t, top) {
  var g = ctx.createLinearGradient(0, y, 0, y + 32);
  g.addColorStop(0, '#D8A868'); g.addColorStop(1, '#A87438');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, 32, 32);
  ctx.strokeStyle = 'rgba(120,70,30,0.5)'; ctx.lineWidth = 1.2;
  for (var i = 0; i < 2; i++) {
    var r = 5 + ((t * 6 + i * 6 + x * 0.1) % 10);
    ctx.beginPath(); ctx.ellipse(x + 16, y + 12 + i * 10, r, r * 0.35, 0, 0, 6.28); ctx.stroke();
  }
  if (top) {
    ctx.fillStyle = '#E8C080';
    ctx.beginPath();
    for (var k = 0; k <= 32; k += 4) ctx.lineTo(x + k, y + Math.sin(t * 3 + (x + k) * 0.2) * 1.5);
    ctx.lineTo(x + 32, y + 5); ctx.lineTo(x, y + 5); ctx.fill();
  }
};

Art.victoryRainbow = function (ctx, r, t) {
  r.t += 1 / 60;
  var a = Math.min(1, r.t / 1.5);
  var cols = ['#FF6A6A', '#FFB24A', '#FFE85A', '#6AD86A', '#5AB8FF', '#A87AFF'];
  ctx.save();
  ctx.globalAlpha = 0.55 * a;
  ctx.lineWidth = 7;
  for (var i = 0; i < cols.length; i++) {
    ctx.strokeStyle = cols[i];
    ctx.beginPath(); ctx.arc(r.x, r.y, 170 - i * 7, Math.PI, 0); ctx.stroke();
  }
  ctx.restore();
};

// ---------------------------------------------------------------------------
// HUD
var HUD = {
  draw: function (ctx, world) {
    var p = world.player;
    var t = world.t;
    // Left: hearts
    var lives = world.lives;
    var nh = Math.min(lives, 5);
    var lw = 20 + Math.max(3, nh) * 28 + (lives > 5 ? 40 : 0);
    UI.panel(ctx, 12, 10, lw, 42, 16, 0.45);
    for (var i = 0; i < Math.max(3, nh); i++) UI.heart(ctx, 34 + i * 28, 31, 24, i < nh);
    if (lives > 5) UI.text(ctx, 'x' + lives, 34 + 5 * 28 - 6, 31, 18, '#FFFFFF', 'left');
    // Power icons
    var ix = 12 + lw + 8;
    if (p.big) {
      UI.panel(ctx, ix, 10, 42, 42, 16, 0.45);
      Art.carrot(ctx, ix + 21, 31, t);
      ix += 50;
    }
    if (p.candy) {
      UI.panel(ctx, ix, 10, 72, 42, 16, 0.45);
      Art.candy(ctx, ix + 22, 31, t);
      Art.shot(ctx, p.c.shot, ix + 52, 31, t, 1, t);
      ix += 80;
    }
    // Air meter (level 6)
    if (world.level.underwater) {
      var bubbles = Math.ceil(world.air / (Swim.AIR_MAX / 10));
      var blink = bubbles <= 3 && Math.floor(t * 5) % 2 === 0;
      var paused = world.arena && world.arena.active();
      UI.panel(ctx, 12, 58, 232, 30, 12, 0.45);
      for (var b = 0; b < 10; b++) {
        var bx = 30 + b * 21, by = 73;
        if (b < bubbles && !blink) {
          Art.bubble(ctx, bx, by, 8, t);
          G.circle(ctx, bx, by, 6, 'rgba(160,220,255,0.5)');
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(bx, by, 7, 0, 6.28); ctx.stroke();
        }
      }
      if (paused) UI.text(ctx, 'II', 236, 73, 12, '#BFE8FF', 'center');
    }
    // Center: level name, or the boss health bar
    var boss = world.boss;
    if (boss && world.arena && (world.arena.state === 'intro' || world.arena.state === 'fight')) {
      this.bossBar(ctx, boss, world.arena);
    } else {
      ctx.font = UI.font(20);
      var nm = world.def.name;
      var w = ctx.measureText(nm).width + 44;
      UI.panel(ctx, VIEW_W / 2 - w / 2, 10, w, 36, 16, 0.4);
      UI.text(ctx, nm, VIEW_W / 2, 29, 20, '#FFFFFF', 'center');
    }
    // Right: coins and time
    UI.panel(ctx, VIEW_W - 214, 10, 202, 42, 16, 0.45);
    Art.coin(ctx, VIEW_W - 190, 31, t, false, 1, t);
    UI.text(ctx, String(world.coins), VIEW_W - 172, 32, 22, '#FFE36E', 'left');
    var tm = world.timer;
    var str, col = '#FFFFFF', size = 20;
    if (tm.challenge) {
      str = LevelTimer.format(Math.ceil(tm.remaining));
      if (tm.urgent()) {
        col = '#FF5A5A';
        size = 20 + Math.max(0, Math.sin(t * Math.PI * 2)) * 4;
      }
      if (tm.extraTime) UI.text(ctx, '+1:00', VIEW_W - 22, 64, 12, '#FFB24A', 'right');
    } else str = LevelTimer.format(tm.elapsed);
    // stopwatch glyph
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(VIEW_W - 92, 32, 8, 0, 6.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(VIEW_W - 92, 32); ctx.lineTo(VIEW_W - 92, 27); ctx.moveTo(VIEW_W - 92, 32); ctx.lineTo(VIEW_W - 88, 34); ctx.stroke();
    UI.text(ctx, str, VIEW_W - 22, 32, size, col, 'right');
    // Banner messages
    if (world.banner) {
      var bn = world.banner;
      var a = Math.min(1, bn.t * 4, (bn.life - bn.t) * 3);
      ctx.globalAlpha = Math.max(0, a);
      var sc = 1 + Math.max(0, 0.3 - bn.t) * 1.5;
      ctx.save();
      ctx.translate(VIEW_W / 2, 170);
      ctx.scale(sc, sc);
      UI.text(ctx, bn.text, 0, 0, bn.size || 44, bn.color || '#FFE36E', 'center', { lw: 7 });
      if (bn.sub) UI.text(ctx, bn.sub, 0, 40, 20, '#FFFFFF', 'center');
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  },

  bossBar: function (ctx, boss, arena) {
    var w = 360, h = 20;
    var x = VIEW_W / 2 - w / 2, y = 30;
    UI.panel(ctx, x - 14, 6, w + 28, 52, 16, 0.5);
    UI.text(ctx, boss.name, VIEW_W / 2, 18, 15, '#FFFFFF', 'center');
    // gold frame
    G.rrect(ctx, x - 3, y - 3, w + 6, h + 6, 10);
    var fg = ctx.createLinearGradient(0, y - 3, 0, y + h + 3);
    fg.addColorStop(0, PAL.goldHi); fg.addColorStop(1, PAL.goldLo);
    ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
    G.rrect(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(30,20,30,0.85)'; ctx.fill();
    var shown = arena.state === 'intro' ? Math.min(1, arena.t / 1.5) : boss.hp / boss.maxHp;
    if (shown > 0) {
      G.rrect(ctx, x + 2, y + 2, (w - 4) * shown, h - 4, 7);
      var bg = ctx.createLinearGradient(0, y, 0, y + h);
      bg.addColorStop(0, shadeHex(boss.color, 0.3)); bg.addColorStop(1, shadeHex(boss.color, -0.15));
      ctx.fillStyle = bg; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      G.rrect(ctx, x + 4, y + 3, Math.max(0, (w - 8) * shown), 4, 2); ctx.fill();
    }
    // HP segment ticks
    ctx.strokeStyle = 'rgba(30,20,30,0.7)'; ctx.lineWidth = 2;
    for (var i = 1; i < boss.maxHp; i++) {
      var sx = x + w * i / boss.maxHp;
      ctx.beginPath(); ctx.moveTo(sx, y + 2); ctx.lineTo(sx, y + h - 2); ctx.stroke();
    }
    // shot progress pips (3 shots = 1 HP)
    for (var k = 0; k < 2; k++) {
      G.circle(ctx, x + w + 22 + k * 0, y + h / 2, 0, '#FFF');
    }
    if (boss.shotHits > 0) {
      for (var s = 0; s < 3; s++) G.circle(ctx, x + w - 26 + s * 10, y + h + 10, 3, s < boss.shotHits ? '#FFE36E' : 'rgba(255,255,255,0.25)');
    }
  }
};
