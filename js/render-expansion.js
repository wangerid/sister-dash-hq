// Art for the three expansion worlds (Treetop Heights, Starlight Station,
// Cement City) and the merged-game extras (pink outfit, space helmet, guide
// dots). Like render.js, every draw call first tries the painted art from the
// expansion pack and otherwise draws a code-drawn fallback in the same colours.

// ---------------------------------------------------------------------------
// Themes, skies and arena walls for the new worlds
THEMES[TH.TREETOP] = { base: '#8A5A33', hi: '#B07A48', lo: '#5A3A1E', top: '#5E9A2E', topHi: '#8CC43E', topLo: '#3A6A1E', earth: '#7A4E2C', earthHi: '#9A6A40', kind: 'stone' };
THEMES[TH.SPACE] = { base: '#6A7084', hi: '#9AA2B8', lo: '#3E4254', top: '#8A92A8', topHi: '#C8D0E0', topLo: '#5A6074', earth: '#5E6274', earthHi: '#7E8498', kind: 'cave' };
THEMES[TH.CITY] = { base: '#9A968E', hi: '#C4C0B6', lo: '#6A665E', top: '#B4B0A6', topHi: '#D8D4CA', topLo: '#8A867E', earth: '#8A867E', earthHi: '#A8A49A', kind: 'stone' };

Backgrounds.sky[TH.TREETOP] = ['#7EC8F0', '#FCE7B0'];
Backgrounds.sky[TH.SPACE] = ['#0B0A24', '#2E1D5E'];
Backgrounds.sky[TH.CITY] = ['#F2A27A', '#FFE0B8'];

(function () {
  var baseWall = Art.arenaWall;
  var cols = { 8: ['#A87A4C', '#5A3A1E'], 9: ['#AEB8CC', '#4E566C'], 10: ['#F2A23A', '#8A5A20'] };
  Art.arenaWall = function (ctx, x, y, w, h, theme) {
    if (!cols[theme]) return baseWall(ctx, x, y, w, h, theme);
    var c = cols[theme];
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(40,30,20,0.5)'; ctx.lineWidth = 1.5;
    if (theme === TH.CITY) {          // construction fence: orange mesh with stripes
      for (var yy = y + 8; yy < y + h; yy += 10) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
    } else if (theme === TH.TREETOP) { // huge tree trunk
      for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + 6 + k * 9, y); ctx.lineTo(x + 8 + k * 9, y + h); ctx.stroke(); }
    } else {                           // dome frame
      for (var yy2 = y + 24; yy2 < y + h; yy2 += 48) ctx.strokeRect(x + 4, yy2, w - 8, 20);
    }
    ctx.strokeRect(x, y, w, h);
  };
})();

// ---------------------------------------------------------------------------
// Fallback parallax layers (1920 x 540, tileable)
BGPaint[TH.TREETOP] = function (c, layer, r) {
  var i, x;
  if (layer === 0) {
    for (i = 0; i < 9; i++) {
      x = i * 213 + r() * 60;
      c.fillStyle = 'rgba(120,150,120,0.55)';
      c.fillRect(x, 120, 34 + r() * 20, 420);
      c.fillStyle = 'rgba(110,160,110,0.5)';
      bgWrap(function (xx) { c.beginPath(); c.arc(xx + 20, 130, 90 + r() * 30, 0, 6.28); c.fill(); }, x);
    }
  } else if (layer === 1) {
    for (i = 0; i < 6; i++) {
      x = i * 320 + r() * 80;
      c.fillStyle = '#6A4A2E';
      c.fillRect(x, 60, 56, 480);
      c.fillStyle = '#4E7A2A';
      bgWrap(function (xx) { c.beginPath(); c.arc(xx + 28, 70, 120, 0, 6.28); c.fill(); }, x);
      c.fillStyle = '#7A5A3A';
      c.fillRect(x + 56, 300 + r() * 80, 140, 12);
    }
  } else {
    for (i = 0; i < 14; i++) {
      x = i * 137 + r() * 40;
      c.strokeStyle = '#4E8A2A'; c.lineWidth = 4;
      var len = 80 + r() * 140;
      c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 20, len / 2, x, len); c.stroke();
      c.fillStyle = '#6FBF3A';
      for (var k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x + 8, k * len / 4 + 10, 9, 4, 0.5, 0, 6.28); c.fill(); }
    }
  }
};
BGPaint[TH.SPACE] = function (c, layer, r) {
  var i;
  if (layer === 0) {
    for (i = 0; i < 260; i++) {
      c.fillStyle = 'rgba(255,255,255,' + (0.3 + r() * 0.7) + ')';
      c.fillRect(r() * BG_W, r() * 540, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    var g = c.createRadialGradient(1300, 160, 10, 1300, 160, 90);
    g.addColorStop(0, '#7AB8FF'); g.addColorStop(0.6, '#2E6AC8'); g.addColorStop(1, 'rgba(46,106,200,0)');
    c.fillStyle = g; c.beginPath(); c.arc(1300, 160, 90, 0, 6.28); c.fill();
    c.fillStyle = '#E8A86A'; c.beginPath(); c.arc(420, 120, 60, 0, 6.28); c.fill();
    c.strokeStyle = 'rgba(255,220,180,0.6)'; c.lineWidth = 4; c.beginPath(); c.ellipse(420, 120, 100, 20, -0.3, 0, 6.28); c.stroke();
  } else if (layer === 1) {
    for (i = 0; i < 10; i++) {
      var x = i * 190 + r() * 60, y = 260 + r() * 160, s = 20 + r() * 30;
      c.fillStyle = '#5A5068'; c.beginPath(); c.ellipse(x, y, s, s * 0.7, r(), 0, 6.28); c.fill();
    }
    c.fillStyle = '#4A5270'; c.fillRect(700, 330, 520, 16); c.fillRect(900, 280, 80, 70);
  } else {
    c.fillStyle = 'rgba(90,80,110,0.9)';
    for (i = 0; i < 5; i++) { c.beginPath(); c.ellipse(i * 400 + r() * 100, 470 + r() * 50, 40, 26, r(), 0, 6.28); c.fill(); }
  }
};
BGPaint[TH.CITY] = function (c, layer, r) {
  var i, x, w, h;
  if (layer === 0) {
    for (i = 0; i < 18; i++) {
      x = i * 107 + r() * 30; w = 60 + r() * 50; h = 160 + r() * 220;
      c.fillStyle = 'rgba(150,140,170,0.6)'; c.fillRect(x, 540 - h, w, h);
    }
  } else if (layer === 1) {
    for (i = 0; i < 10; i++) {
      x = i * 192 + r() * 40; w = 90 + r() * 60; h = 120 + r() * 160;
      c.fillStyle = '#8A8494'; c.fillRect(x, 540 - h, w, h);
      c.fillStyle = 'rgba(255,230,150,0.75)';
      for (var wy = 540 - h + 14; wy < 520; wy += 22) for (var wx = x + 10; wx < x + w - 12; wx += 20) if (r() < 0.5) c.fillRect(wx, wy, 9, 11);
    }
  } else {
    for (i = 0; i < 6; i++) {
      x = i * 320 + 60;
      c.fillStyle = '#4A4A52'; c.fillRect(x, 300, 6, 240);
      c.fillRect(x, 300, 40, 5);
      c.fillStyle = 'rgba(255,240,180,0.9)'; c.fillRect(x + 30, 305, 12, 4);
    }
  }
};

// ---------------------------------------------------------------------------
// Painted prop helper
function prop(ctx, key, name, x, y, s, flip, alpha, rot) {
  return Assets.drawNamed(ctx, key, name, x, y, s, flip, alpha, rot);
}

// Treetops --------------------------------------------------------------------
Art.fallingProp = function (ctx, kind, cx, cy, rot, t) {
  if (kind === 'pinecone') {
    if (prop(ctx, 'props-treetop', 'pinecone', cx, cy, 0.5, false, 1, rot)) return;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.fillStyle = G.lit(ctx, 0, 0, 12, '#B07A48', '#5A3A1E');
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 12, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(58,42,32,0.8)'; ctx.lineWidth = 1;
    for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-8, i * 4); ctx.lineTo(8, i * 4 + 3); ctx.stroke(); }
    ctx.restore();
  } else {
    if (prop(ctx, 'props-city', 'cementBag', cx, cy, 0.55, false, 1, rot * 0.3)) return;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot * 0.3);
    ctx.fillStyle = '#E8DCC4'; G.rrect(ctx, -11, -13, 22, 26, 5); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#C8402A'; ctx.fillRect(-11, -4, 22, 3); ctx.fillRect(-11, 4, 22, 3);
    ctx.restore();
  }
};

Art.vine = function (ctx, ax, ay, theta, len, t) {
  var ex = ax + Math.sin(theta) * len, ey = ay + Math.cos(theta) * len;
  var mx = ax + Math.sin(theta * 0.8) * len * 0.55, my = ay + Math.cos(theta * 0.8) * len * 0.55;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3E5A1E'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  ctx.strokeStyle = '#6E9A34'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  for (var i = 1; i <= 6; i++) {
    var f = i / 6.5, u = 1 - f;
    var px = u * u * ax + 2 * u * f * mx + f * f * ex, py = u * u * ay + 2 * u * f * my + f * f * ey;
    ctx.fillStyle = i % 2 ? '#7CC23E' : '#5EA02E';
    ctx.beginPath(); ctx.ellipse(px + (i % 2 ? 6 : -6), py, 7, 3.5, (i % 2 ? 0.6 : -0.6) + theta, 0, 6.28); ctx.fill();
  }
  // knot at the anchor
  G.circle(ctx, ax, ay + 2, 5, '#5A3A1E');
};

Art.guideDots = function (ctx, pts, t, landed) {
  for (var i = 0; i < pts.length; i++) {
    var a = 0.35 + 0.45 * ((Math.sin(t * 8 - i * 0.6) + 1) / 2);
    G.circle(ctx, pts[i][0], pts[i][1] - 6, 2.4, 'rgba(255,255,255,' + a.toFixed(2) + ')');
  }
  if (landed && pts.length) {
    var e = pts[pts.length - 1];
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e[0], e[1], 10, 3.5, 0, 0, 6.28); ctx.stroke();
  }
};

Art.leafPlatform = function (ctx, x, y, w, bend, tipping) {
  var cx = x + w / 2;
  var s = w / 58;
  var name = tipping || bend > 1 ? 'leafDeep' : bend > 0.55 ? 'leafBent' : 'leafLevel';
  var drop = bend * 9;
  if (Assets.sheet('props-treetop')) {
    // the leaf's upper edge sits about 40 source px above the cell centre
    prop(ctx, 'props-treetop', name, cx, y + drop + 40 * 0.25 * s - 4, s, false, 1);
    return;
  }
  ctx.save();
  ctx.translate(cx, y + drop);
  ctx.rotate(tipping ? 0.35 : bend * 0.06);
  ctx.fillStyle = G.lit(ctx, 0, 4, w / 2, '#8CD24A', '#3E8A22');
  ctx.beginPath();
  ctx.moveTo(-w / 2 - 4, 4);
  ctx.quadraticCurveTo(0, -10 + bend * 6, w / 2 + 6, 6 + bend * 6);
  ctx.quadraticCurveTo(0, 16, -w / 2 - 4, 4);
  ctx.fill();
  ctx.strokeStyle = '#2E6A1A'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w / 2, 5); ctx.lineTo(w / 2, 7 + bend * 5); ctx.stroke();
  ctx.restore();
};

Art.hive = function (ctx, cx, y, t) {
  var wob = Math.sin(t * 3) * 0.05;
  if (prop(ctx, 'fx-treetop', 'hive', cx, y + 14, 0.8, false, 1, wob)) return;
  ctx.save(); ctx.translate(cx, y + 14); ctx.rotate(wob);
  ctx.strokeStyle = '#5A3A1E'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -6); ctx.stroke();
  for (var i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#E8A830' : '#F2C04A';
    ctx.beginPath(); ctx.ellipse(0, -4 + i * 5, 12 - Math.abs(i - 1.5) * 2, 4, 0, 0, 6.28); ctx.fill();
  }
  G.circle(ctx, 0, 6, 2.5, '#3A2A20');
  ctx.restore();
};

// Space -----------------------------------------------------------------------
Art.asteroid = function (ctx, x, y, w, rot, seed) {
  var s = w / 58;
  if (prop(ctx, 'props-space', seed % 2 ? 'asteroidAlt' : 'asteroid', x + w / 2, y + 58 * 0.25 * s - 2, s, seed % 3 === 1, 1, rot)) return;
  ctx.save(); ctx.translate(x + w / 2, y + 10); ctx.rotate(rot);
  ctx.fillStyle = G.lit(ctx, 0, 0, w / 2, '#A08A80', '#4E4048');
  ctx.beginPath();
  ctx.moveTo(-w / 2, -6); ctx.lineTo(w / 2, -8); ctx.lineTo(w / 2 - 6, 10); ctx.lineTo(0, 18); ctx.lineTo(-w / 2 + 6, 10); ctx.closePath();
  ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  G.circle(ctx, -w * 0.2, -1, 3, 'rgba(40,30,40,0.4)'); G.circle(ctx, w * 0.15, 3, 4, 'rgba(40,30,40,0.4)');
  ctx.restore();
};

Art.laser = function (ctx, cx, y, h, phase, t) {
  // emitters
  ctx.fillStyle = '#4A4E62';
  G.rrect(ctx, cx - 9, y, 18, 10, 3); ctx.fill();
  G.rrect(ctx, cx - 9, y + h - 10, 18, 10, 3); ctx.fill();
  var on = phase === 'on', warn = phase === 'warn';
  G.circle(ctx, cx, y + 8, 3.5, on || (warn && Math.floor(t * 16) % 2) ? '#FF4FD8' : '#7A3A6A');
  G.circle(ctx, cx, y + h - 8, 3.5, on || (warn && Math.floor(t * 16) % 2) ? '#FF4FD8' : '#7A3A6A');
  if (on) {
    var g = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
    g.addColorStop(0, 'rgba(255,60,200,0)'); g.addColorStop(0.5, 'rgba(255,120,230,0.9)'); g.addColorStop(1, 'rgba(255,60,200,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 10, y + 10, 20, h - 20);
    ctx.fillStyle = 'rgba(255,240,255,0.95)'; ctx.fillRect(cx - 1.5, y + 10, 3, h - 20);
  } else if (warn && Math.floor(t * 16) % 2) {
    ctx.fillStyle = 'rgba(255,100,220,0.35)'; ctx.fillRect(cx - 1, y + 10, 2, h - 20);
  }
};

Art.boostPad = function (ctx, x, floorY, w, t, glow) {
  var cx = x + w / 2;
  var g = ctx.createRadialGradient(cx, floorY - 6, 2, cx, floorY - 6, 30);
  g.addColorStop(0, 'rgba(120,230,255,' + (0.35 + glow * 0.5 + Math.sin(t * 4) * 0.1) + ')'); g.addColorStop(1, 'rgba(120,230,255,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - 30, floorY - 36, 60, 36);
  if (prop(ctx, 'props-space', 'boostPad', cx, floorY - 6, 0.6, false, 1)) return;
  ctx.fillStyle = '#5A6278'; G.rrect(ctx, x + 1, floorY - 8, w - 2, 8, 3); ctx.fill();
  ctx.fillStyle = '#7FE8FF'; ctx.beginPath(); ctx.moveTo(cx - 6, floorY - 3); ctx.lineTo(cx, floorY - 8); ctx.lineTo(cx + 6, floorY - 3); ctx.fill();
};

Art.meteorTarget = function (ctx, x, gy, mt, t) {
  var k = Math.min(1, mt);
  var g = ctx.createRadialGradient(x, gy - 4, 2, x, gy - 4, 34);
  g.addColorStop(0, 'rgba(255,60,40,' + (0.25 + 0.35 * k) + ')'); g.addColorStop(1, 'rgba(255,60,40,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 34, gy - 38, 68, 40);
  if (prop(ctx, 'props-space', 'meteorTarget', x, gy - 8, 0.45 + 0.1 * Math.sin(t * 12), false, 0.6 + 0.4 * k)) return;
  ctx.strokeStyle = 'rgba(255,70,50,' + (0.5 + 0.5 * k) + ')'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(x, gy - 2, 16, 5, 0, 0, 6.28); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, gy - 2, 7, 2.5, 0, 0, 6.28); ctx.stroke();
};

Art.meteor = function (ctx, x, y, t) {
  if (prop(ctx, 'props-space', 'meteor', x + 6, y - 6, 0.55, false, 1)) return;
  var g = ctx.createLinearGradient(x, y, x + 60, y - 110);
  g.addColorStop(0, 'rgba(255,200,90,0.9)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60, y - 110); ctx.stroke();
  G.circle(ctx, x, y, 9, '#8A5A48');
};

Art.gravityWell = function (ctx, cx, cy, t) {
  var g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
  g.addColorStop(0, 'rgba(150,60,220,0.35)'); g.addColorStop(1, 'rgba(150,60,220,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - 70, cy - 70, 140, 140);
  if (prop(ctx, 'props-space', 'gravityWell', cx, cy, 0.85, false, 1, t * 1.5)) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 2);
  for (var i = 0; i < 3; i++) {
    ctx.strokeStyle = ['#C87AFF', '#8A3AD8', '#5A1A9A'][i]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 22 - i * 6, i, i + 4); ctx.stroke();
  }
  G.circle(ctx, 0, 0, 6, '#1A0A2A');
  ctx.restore();
};

Art.spaceWalk = function (ctx, px, py, t, edge) {
  ctx.fillStyle = 'rgba(160,120,255,0.07)';
  ctx.fillRect(px, py, TILE, TILE);
  if (edge && Math.floor(t * 2 + px * 0.01) % 2 === 0) {
    G.star(ctx, px + 16, py + 16, 4, 1.8, 5, t);
    ctx.fillStyle = 'rgba(255,230,140,0.75)'; ctx.fill();
  }
};

// City ------------------------------------------------------------------------
Art.trafficLight = function (ctx, x, surfY, light, t, side) {
  var name = light === 'green' ? 'signalGreen' : light === 'flash' ? (Math.floor(t * 4) % 2 ? 'signalGreen' : 'signalDim') : 'signalRed';
  if (prop(ctx, 'props-city', name, x, surfY - 42, 1.45, side > 0, 1)) return;
  ctx.fillStyle = '#4A4A52'; ctx.fillRect(x - 2, surfY - 84, 4, 84);
  ctx.fillStyle = '#2A2A30'; G.rrect(ctx, x - 9, surfY - 100, 18, 30, 4); ctx.fill();
  var red = light === 'red' || light === 'clearing';
  var green = light === 'green' || (light === 'flash' && Math.floor(t * 4) % 2);
  G.circle(ctx, x, surfY - 92, 5, red ? '#FF3A2A' : '#5A2020');
  G.circle(ctx, x, surfY - 78, 5, green ? '#3AFF6A' : '#1E4A28');
};

Art.vehicle = function (ctx, car, t) {
  var key = 'traffic-' + car.kind;
  if (Assets.drawAnim(ctx, key, 'drive', t, car.x + car.w / 2, car.y + car.h + 2, car.vx < 0)) return;
  var col = car.kind === 'bus' ? '#F2B23A' : car.kind === 'truck' ? '#E8E4DC' : '#D8322E';
  ctx.fillStyle = col;
  G.rrect(ctx, car.x, car.y + 8, car.w, car.h - 16, 8); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#BFE3FA'; G.rrect(ctx, car.x + 10, car.y + 12, car.w * 0.35, 12, 3); ctx.fill();
  G.circle(ctx, car.x + 20, car.y + car.h - 8, 8, '#2A2A30'); G.circle(ctx, car.x + car.w - 20, car.y + car.h - 8, 8, '#2A2A30');
  var hx = car.vx < 0 ? car.x + 2 : car.x + car.w - 2;
  G.circle(ctx, hx, car.y + car.h - 20, 4, '#FFF4C0');
};

Art.manhole = function (ctx, cx, floorY, rise, steaming, t) {
  ctx.fillStyle = '#2A2A2E';
  ctx.beginPath(); ctx.ellipse(cx, floorY - 1, 14, 3.5, 0, 0, 6.28); ctx.fill();
  var y = floorY - 3 - rise * 44;
  if (prop(ctx, 'props-city', 'manholeClosed', cx, y, 0.5, false, 1, rise * 0.4)) return;
  ctx.fillStyle = G.lit(ctx, cx, y, 14, '#8A7A6A', '#4A3E34');
  ctx.beginPath(); ctx.ellipse(cx, y, 15, 4.5, rise * 0.4, 0, 6.28); ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
};

Art.girder = function (ctx, x, y, w, camY) {
  ctx.strokeStyle = '#3A3A40'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + w * 0.3, camY - 10); ctx.lineTo(x + w * 0.3, y); ctx.moveTo(x + w * 0.7, camY - 10); ctx.lineTo(x + w * 0.7, y); ctx.stroke();
  var s = w / 58;
  if (Assets.sheet('props-city')) {
    // beam top is about 36 source px below the cell centre
    prop(ctx, 'props-city', 'girder', x + w / 2, y - 36 * 0.25 * s + 2, s, false, 1);
    return;
  }
  ctx.fillStyle = G.lit(ctx, x + w / 2, y + 8, w / 2, '#E8603A', '#9A3A1E');
  ctx.fillRect(x, y, w, 16);
  ctx.strokeStyle = 'rgba(60,20,10,0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, 16);
  ctx.beginPath();
  for (var i = 0; i < w; i += 16) { ctx.moveTo(x + i, y + 16); ctx.lineTo(x + i + 8, y); ctx.lineTo(x + i + 16, y + 16); }
  ctx.stroke();
};

Art.cementPuddle = function (ctx, cx, floorY, w, a) {
  if (prop(ctx, 'props-city', 'wetCement', cx, floorY - 2, w / 58, false, a)) return;
  ctx.fillStyle = 'rgba(150,146,140,' + (0.9 * a) + ')';
  ctx.beginPath(); ctx.ellipse(cx, floorY - 2, w / 2, 6, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,' + (0.4 * a) + ')';
  ctx.beginPath(); ctx.ellipse(cx - w * 0.15, floorY - 4, w * 0.15, 1.5, 0, 0, 6.28); ctx.fill();
};

Art.wetCement = function (ctx, px, py, t) {
  // drawn on top of the pavement in the tile where the zone is
  var y = py + TILE;
  ctx.fillStyle = 'rgba(140,136,130,0.95)';
  ctx.fillRect(px, y - 7, TILE, 8);
  ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.15 * Math.sin(t * 2 + px * 0.1)) + ')';
  ctx.fillRect(px + 6 + (px * 7) % 12, y - 6, 8, 1.5);
};

Art.diveTarget = function (ctx, x, floorY, t, locked) {
  var s = locked ? 0.55 : 0.5 + Math.sin(t * 10) * 0.04;
  if (prop(ctx, 'ui-expansion', 'target', x, floorY - 12, s, false, locked ? 1 : 0.7)) return;
  ctx.strokeStyle = locked ? '#FF2A2A' : 'rgba(255,60,60,0.7)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, floorY - 2, 24, 7, 0, 0, 6.28); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, floorY - 2, 10, 3, 0, 0, 6.28); ctx.stroke();
};

// ---------------------------------------------------------------------------
// Boss projectiles and floor waves used by the new bosses
(function () {
  var baseProj = Art.bossProjectile;
  var painted = {
    bark: ['props-treetop', 'barkChips', 0.32], acorn: ['fx-treetop', 'acorn', 0.55],
    rubble: ['props-city', 'rubble', 0.38], spark: ['fx-space', 'staticSpark', 0.6], star: ['fx-space', 'sneezeStar', 0.55]
  };
  Art.bossProjectile = function (ctx, kind, x, y, rot, size) {
    var p = painted[kind];
    if (!p) return baseProj(ctx, kind, x, y, rot, size);
    if (prop(ctx, p[0], p[1], x, y, p[2], false, 1, kind === 'spark' ? 0 : rot)) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    var r = size / 2;
    if (kind === 'spark') {
      ctx.fillStyle = G.radial(ctx, 0, 0, r, '#FFFFFF', '#4AB8FF'); ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 6.28); ctx.fill();
    } else if (kind === 'star') {
      G.star(ctx, 0, 0, r, r * 0.45, 5, 0); ctx.fillStyle = '#FFE36E'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.stroke();
    } else {
      ctx.fillStyle = kind === 'acorn' ? '#9A6A3A' : kind === 'bark' ? '#7A4E2C' : '#A8A296';
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.8, 0, 0, 6.28); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke();
      if (kind === 'acorn') { ctx.fillStyle = '#5A3A1E'; ctx.fillRect(-r, -r * 0.8, r * 2, r * 0.6); }
    }
    ctx.restore();
  };
  var baseWave = Art.floorWave;
  Art.floorWave = function (ctx, kind, x, y, w, h, t, dir) {
    if (kind === 'boing' && prop(ctx, 'fx-space', 'boingWave', x + w / 2, y + h / 2, 0.55, dir < 0, 1)) return;
    baseWave(ctx, kind, x, y, w, h, t, dir);
  };
})();

// ---------------------------------------------------------------------------
// Decorations ("%") and foreground effects for the new worlds
(function () {
  var baseDecor = Art.decor;
  Art.decor = function (ctx, theme, x, y, t, seed) {
    if (theme === TH.TREETOP) {
      if (seed % 3 === 1) {
        if (prop(ctx, 'props-treetop', 'treehouse', x, y - 68, 2.3, false, 1)) return;
      } else if (prop(ctx, 'props-treetop-extra', 'emptyNest', x, y - 20, 0.9, false, 1)) return;
      ctx.fillStyle = '#8A5A33'; ctx.fillRect(x - 20, y - 40, 40, 30);
      ctx.fillStyle = '#C8402A'; ctx.beginPath(); ctx.moveTo(x - 26, y - 40); ctx.lineTo(x, y - 60); ctx.lineTo(x + 26, y - 40); ctx.fill();
      return;
    }
    if (theme === TH.SPACE) {
      if (seed < 4) {
        if (prop(ctx, 'props-space', 'rocket', x, y - 62, 2.0, false, 1, -Math.PI / 2)) return;
        ctx.fillStyle = '#E8E8F0'; G.rrect(ctx, x - 14, y - 110, 28, 100, 12); ctx.fill();
        ctx.fillStyle = '#D8322E'; ctx.beginPath(); ctx.moveTo(x - 14, y - 96); ctx.lineTo(x, y - 128); ctx.lineTo(x + 14, y - 96); ctx.fill();
        return;
      }
      if (prop(ctx, 'props-space', 'glassDome', x, y - 26, 1.2, false, 1)) return;
      return;
    }
    if (theme === TH.CITY) {
      if (seed % 2 === 1) {
        // street lamp
        ctx.fillStyle = '#4A4A52'; ctx.fillRect(x - 2, y - 120, 5, 120); ctx.fillRect(x - 2, y - 120, 26, 4);
        var g = ctx.createRadialGradient(x + 22, y - 112, 2, x + 22, y - 112, 40);
        g.addColorStop(0, 'rgba(255,240,180,0.7)'); g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 18, y - 152, 80, 80);
        ctx.fillStyle = '#FFF4C0'; ctx.fillRect(x + 14, y - 116, 14, 4);
        return;
      }
      if (prop(ctx, 'props-city', 'fence', x, y - 22, 1.1, false, 1)) return;
      return;
    }
    baseDecor(ctx, theme, x, y, t, seed);
  };

  var baseFront = FrontFX.draw;
  FrontFX.draw = function (ctx, world) {
    var theme = world.level.theme;
    var t = world.t, camX = world.camera.x;
    if (theme === TH.TREETOP) {
      if (Quality.level === 'low') return;
      // sun rays through the leaves and drifting leaves
      for (var i = 0; i < 3; i++) {
        var rx = ((i * 380 - camX * 0.15) % 1140 + 1140) % 1140 - 100;
        var g = ctx.createLinearGradient(rx, 0, rx - 120, VIEW_H);
        g.addColorStop(0, 'rgba(255,240,180,0.16)'); g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx + 50, 0); ctx.lineTo(rx - 70, VIEW_H); ctx.lineTo(rx - 160, VIEW_H); ctx.fill();
      }
      var n = Quality.level === 'medium' ? 8 : 16;
      for (var k = 0; k < n; k++) {
        var lx = ((k * 131 - camX * 1.1 + Math.sin(t + k) * 30) % 1000 + 1000) % 1000 - 20;
        var ly = (k * 61 + t * (24 + (k % 4) * 8)) % 580 - 20;
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(t * 1.5 + k);
        ctx.fillStyle = k % 2 ? 'rgba(124,194,62,0.85)' : 'rgba(170,200,74,0.85)';
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.4, 0, 0, 6.28); ctx.fill();
        ctx.restore();
      }
      return;
    }
    if (theme === TH.SPACE) {
      if (Quality.level === 'low') return;
      for (var s = 0; s < 14; s++) {
        var sx = ((s * 173 - camX * 0.05) % 1000 + 1000) % 1000 - 20;
        var sy = (s * 97) % 360 + 10;
        Art.sparkle(ctx, sx, sy, 1.6, '#FFFFFF', 0.3 + 0.5 * Math.abs(Math.sin(t * 1.7 + s)));
      }
      return;
    }
    if (theme === TH.CITY) return;
    baseFront(ctx, world);
  };
})();

// ---------------------------------------------------------------------------
// Code-drawn fallback enemies (art faces left / -x, origin at the feet)
ENEMY_SHEET.squirrel = 'squirrel'; ENEMY_SHEET.caterpillar = 'caterpillar'; ENEMY_SHEET.bee = 'bee';
ENEMY_SHEET.blob = 'blob'; ENEMY_SHEET.ufo = 'ufo'; ENEMY_SHEET.urchin = 'urchin';
ENEMY_SHEET.pigeon = 'pigeon'; ENEMY_SHEET.cone = 'cone'; ENEMY_SHEET.cart = 'cart'; ENEMY_SHEET.pebble = 'pebble';
ENEMY_SHEET.pellet = 'pellet';

EnemyArt.squirrel = function (c, e, t) {
  var b = Math.abs(Math.sin(t * 12)) * 2;
  c.fillStyle = '#C8642A'; c.beginPath(); c.ellipse(12, -16 - b, 9, 14, 0.5, 0, 6.28); c.fill();   // tail
  c.fillStyle = G.lit(c, 0, -10, 12, '#E8823A', '#A8501E'); c.beginPath(); c.ellipse(0, -9 - b, 11, 9, 0, 0, 6.28); c.fill();
  c.beginPath(); c.arc(-9, -16 - b, 6.5, 0, 6.28); c.fill();
  grumpyEyes(c, -11, -17 - b, 2.4, -1, false);
  c.fillStyle = '#3A2A20'; c.fillRect(-6, -2, 3, 2); c.fillRect(3, -2, 3, 2);
};
EnemyArt.caterpillar = function (c, e, t) {
  for (var i = 3; i >= 0; i--) {
    var y = -7 - Math.max(0, Math.sin(t * 6 + i)) * 3;
    c.fillStyle = i % 2 ? '#8ACB3A' : '#6AA82A';
    c.beginPath(); c.arc(-10 + i * 7, y, 7, 0, 6.28); c.fill();
  }
  grumpyEyes(c, -12, -9, 2.2, -1, false);
};
EnemyArt.bee = function (c, e, t) {
  c.fillStyle = 'rgba(230,245,255,0.8)';
  c.beginPath(); c.ellipse(2, -16, 6, 4 + Math.abs(Math.sin(t * 40)) * 3, -0.4, 0, 6.28); c.fill();
  c.fillStyle = '#F2C02A'; c.beginPath(); c.ellipse(0, -9, 10, 7, 0, 0, 6.28); c.fill();
  c.fillStyle = '#2A2420'; c.fillRect(-2, -15, 3, 12); c.fillRect(4, -15, 3, 12);
  c.beginPath(); c.moveTo(10, -9); c.lineTo(14, -9); c.lineTo(10, -7); c.fill();
  grumpyEyes(c, -6, -11, 2, -1, true);
};
EnemyArt.blob = function (c, e, t) {
  var sq = e.onGround ? 1 + Math.sin(t * 6) * 0.06 : 0.9;
  c.fillStyle = G.radial(c, 0, -10, 14, '#C88AFF', '#7A3AC8');
  c.beginPath(); c.ellipse(0, -11 * sq, 13 / sq, 11 * sq, 0, 0, 6.28); c.fill();
  G.circle(c, -3, -13, 5, '#FFFFFF'); G.circle(c, -4, -13, 2.4, '#2A1A3A');
};
EnemyArt.ufo = function (c, e, t) {
  c.fillStyle = 'rgba(180,230,255,0.7)'; c.beginPath(); c.ellipse(0, -12, 8, 7, 0, Math.PI, 0); c.fill();
  c.fillStyle = G.lit(c, 0, -6, 16, '#D8DEE8', '#7A8498'); c.beginPath(); c.ellipse(0, -7, 16, 5, 0, 0, 6.28); c.fill();
  for (var i = -1; i <= 1; i++) G.circle(c, i * 8, -6, 1.8, Math.floor(t * 6 + i) % 2 ? '#7FE8FF' : '#FFE36E');
};
EnemyArt.urchin = function (c, e, t) {
  c.save(); c.translate(0, -13); c.rotate(t * 0.8);
  G.star(c, 0, 0, 15, 8, 10, 0); c.fillStyle = '#A84AD8'; c.fill();
  c.restore();
  G.circle(c, 0, -13, 8, '#C87AF0');
  grumpyEyes(c, -2, -14, 2.4, -1, true);
};
EnemyArt.pigeon = function (c, e, t) {
  var flap = e.phase === 'dive' || e.phase === 'away' ? Math.sin(t * 30) * 6 : 0;
  c.fillStyle = '#8A92A0'; c.beginPath(); c.ellipse(2, -9, 11, 8, 0, 0, 6.28); c.fill();
  c.fillStyle = '#6A7280'; c.beginPath(); c.ellipse(4, -11 - flap, 8, 4, -0.3, 0, 6.28); c.fill();
  c.fillStyle = '#7A8494'; c.beginPath(); c.arc(-8, -15, 5.5, 0, 6.28); c.fill();
  c.fillStyle = '#E8A040'; c.beginPath(); c.moveTo(-13, -15); c.lineTo(-17, -14); c.lineTo(-13, -13); c.fill();
  grumpyEyes(c, -9, -16, 1.8, -1, false);
};
EnemyArt.cone = function (c, e, t) {
  c.fillStyle = '#F2782A'; c.beginPath(); c.moveTo(-10, -2); c.lineTo(0, -28); c.lineTo(10, -2); c.closePath(); c.fill();
  c.fillStyle = '#FFFFFF'; c.fillRect(-6, -14, 12, 4);
  c.fillStyle = '#3A3A40'; c.fillRect(-12, -3, 24, 3);
  grumpyEyes(c, -2, -18, 2, -1, true);
};
EnemyArt.cart = function (c, e, t) {
  c.strokeStyle = '#8A92A0'; c.lineWidth = 2;
  c.strokeRect(-13, -22, 24, 13);
  for (var i = -9; i < 11; i += 5) { c.beginPath(); c.moveTo(i, -22); c.lineTo(i, -9); c.stroke(); }
  c.beginPath(); c.moveTo(11, -22); c.lineTo(15, -26); c.stroke();
  G.circle(c, -9, -3, 3, '#2A2A30'); G.circle(c, 8, -3, 3, '#2A2A30');
};
EnemyArt.pebble = function (c, e, t) {
  c.fillStyle = G.lit(c, 0, -10, 12, '#C8C4BA', '#7A766E'); G.rrect(c, -11, -21, 22, 20, 4); c.fill();
  c.fillStyle = '#3A3A40'; c.fillRect(-8, -15, 6, 2); c.fillRect(2, -15, 6, 2);
  G.circle(c, -5, -12, 1.6, '#2A2420'); G.circle(c, 5, -12, 1.6, '#2A2420');
};
EnemyArt.pellet = function (c, e, t) {
  if (prop(c, 'fx-space', 'starPellet', 0, -7, 0.4, false, 1, t * 3)) return;
  G.star(c, 0, -7, 7, 3, 5, t * 3); c.fillStyle = '#FFE36E'; c.fill();
};

// ---------------------------------------------------------------------------
// Code-drawn fallback bosses (face left, origin at the feet)
BossArt.drumbeak = function (c, b, t) {
  var flap = Math.sin(t * 10) * 0.3;
  c.fillStyle = '#2A2A34'; c.beginPath(); c.ellipse(26, -34, 34, 16, -0.2 + flap, 0, 6.28); c.fill();     // wing / tail
  c.fillStyle = G.lit(c, 0, -34, 30, '#FFFFFF', '#C8C4C0'); c.beginPath(); c.ellipse(4, -30, 30, 24, 0, 0, 6.28); c.fill();
  c.fillStyle = '#2A2A34'; c.fillRect(-4, -46, 30, 6); c.fillRect(0, -32, 26, 5);
  c.fillStyle = '#F2EEE8'; c.beginPath(); c.arc(-20, -54, 17, 0, 6.28); c.fill();
  c.fillStyle = '#E8322A';
  for (var i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-30 + i * 6, -64); c.lineTo(-24 + i * 6, -92 + Math.abs(i - 2) * 6); c.lineTo(-18 + i * 6, -64); c.fill(); }
  c.fillStyle = '#D8B060'; c.beginPath(); c.moveTo(-34, -58); c.lineTo(-76, -50); c.lineTo(-34, -48); c.closePath(); c.fill();
  grumpyEyes(c, -24, -58, 4, -1, true, b.dizzy);
  c.fillStyle = '#8A6A3A'; c.fillRect(-6, -8, 4, 8); c.fillRect(10, -8, 4, 8);
};
BossArt.fuzzmo = function (c, b, t) {
  for (var i = 0; i < 26; i++) {
    var a = i / 26 * 6.28, r = 44 + Math.sin(t * 3 + i) * 3;
    c.strokeStyle = i % 3 ? '#9AD83A' : '#3AB8A8'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(Math.cos(a) * 26, -42 + Math.sin(a) * 26); c.lineTo(Math.cos(a) * r, -42 + Math.sin(a) * r); c.stroke();
  }
  c.fillStyle = G.radial(c, 0, -42, 40, '#C8F07A', '#7AC83A'); c.beginPath(); c.arc(0, -42, 38, 0, 6.28); c.fill();
  c.strokeStyle = '#5A4A2A'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-8, -78); c.lineTo(-14, -98); c.moveTo(8, -78); c.lineTo(14, -98); c.stroke();
  G.circle(c, -14, -100, 5, '#FFE87A'); G.circle(c, 14, -100, 5, '#FFE87A');
  if (b.dizzy) { dizzyEyes(c, -12, -48, 7, t); dizzyEyes(c, 10, -48, 7, t); }
  else { G.circle(c, -12, -48, 8, '#1A1A22'); G.circle(c, 10, -48, 8, '#1A1A22'); G.circle(c, -14, -51, 2.5, '#FFFFFF'); G.circle(c, 8, -51, 2.5, '#FFFFFF'); }
  c.strokeStyle = '#3A1A1A'; c.lineWidth = 2.5; c.beginPath(); c.arc(-1, -36, 12, 0.2, Math.PI - 0.2); c.stroke();
};
BossArt.brutus = function (c, b, t) {
  c.fillStyle = G.lit(c, 0, -48, 46, '#D0CCC2', '#86827A');
  G.rrect(c, -44, -92, 88, 84, 8); c.fill();
  c.strokeStyle = 'rgba(60,55,50,0.7)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-30, -92); c.lineTo(-22, -70); c.lineTo(-30, -56); c.moveTo(24, -8); c.lineTo(30, -30); c.stroke();
  c.fillStyle = '#5A4A3A'; c.fillRect(-34, -70, 26, 7); c.fillRect(6, -70, 26, 7);
  if (b.dizzy) { dizzyEyes(c, -20, -56, 6, t); dizzyEyes(c, 18, -56, 6, t); }
  else { G.circle(c, -20, -56, 5, '#FFFFFF'); G.circle(c, 18, -56, 5, '#FFFFFF'); G.circle(c, -21, -55, 2.5, '#2A2420'); G.circle(c, 17, -55, 2.5, '#2A2420'); }
  c.strokeStyle = '#3A2A20'; c.lineWidth = 3; c.beginPath(); c.arc(0, -26, 12, Math.PI + 0.3, -0.3); c.stroke();
  c.fillStyle = '#A8A49A'; c.beginPath(); c.arc(-50, -40, 12, 0, 6.28); c.arc(50, -40, 12, 0, 6.28); c.fill();
  c.fillRect(-30, -10, 18, 10); c.fillRect(12, -10, 18, 10);
};

// ---------------------------------------------------------------------------
// Space helmet over the character's head (level 8)
Art.helmet = function (ctx, p, vh, cx, by, t) {
  var adult = p.c.h > 50;
  var duck = p.ducking;
  var hy = by - vh * (duck ? 0.62 : adult ? 0.86 : 0.8);
  var size = (adult ? 0.5 : 0.62) * (p.big ? 1.5 : 1);
  var hx = cx + p.facing * (adult ? 1 : 2);
  if (prop(ctx, 'ui-expansion', 'helmetSide', hx, hy, size, p.facing < 0, 0.95)) return;
  var r = 64 * 0.25 * size * 0.9;
  ctx.strokeStyle = 'rgba(200,230,255,0.9)'; ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(180,220,255,0.18)';
  ctx.beginPath(); ctx.arc(hx, hy, r, 0, 6.28); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.ellipse(hx - r * 0.4 + Math.sin(t) * 1.5, hy - r * 0.45, r * 0.25, r * 0.12, -0.6, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#9AA2B8'; ctx.fillRect(hx - r * 0.8, hy + r * 0.75, r * 1.6, 4);
};

// UI badges ------------------------------------------------------------------
Art.badge = function (ctx, name, x, y, s) {
  return prop(ctx, 'ui-expansion', name, x, y, s, false, 1);
};

// Road and crosswalk tiles (fallback for the painted city tiles).
Art.roadTile = function (ctx, px, py, zebra) {
  ctx.fillStyle = '#4A4A50'; ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = '#5A5A62'; ctx.fillRect(px, py, TILE, 3);
  ctx.fillStyle = '#F2F0E8';
  if (zebra) { ctx.fillRect(px + 4, py + 4, 8, 22); ctx.fillRect(px + 20, py + 4, 8, 22); }
  else ctx.fillRect(px + 8, py + 14, 16, 3);
};
