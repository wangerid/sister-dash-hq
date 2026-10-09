// Sister Dash – asset manifest.
// Every painted image the game knows about, plus sprite-sheet frame data.
// A plain global object (no JSON / fetch) so the game works from file://.
// Any file that is missing or fails to load silently falls back to the
// code-drawn art in render.js.
//
// Sheet fields:
//   src    – path relative to index.html
//   cell   – [w, h] size of one frame cell in the PNG (source pixels)
//   cols   – frames per row in the PNG
//   scale  – game pixels per source pixel (0.25 = authored at 4x)
//   pivot  – [x, y] in source pixels inside a cell; for sprites this is the
//            point between the feet, for tiles/items it is the top-left
//   anims  – { name: { frames: [cell indices], fps } }

(function () {
  // Standard character sheet layout (8 columns, 256x256 cells, 4x game size).
  function charAnims() {
    return {
      idle:    { frames: [0, 1, 2, 3], fps: 6 },
      run:     { frames: [8, 9, 10, 11, 12, 13, 14, 15], fps: 14 },
      jump:    { frames: [16, 17, 18], fps: 0 },   // rise, peak, fall (picked by velocity)
      duck:    { frames: [19, 20], fps: 4 },
      swim:    { frames: [24, 25, 26, 27, 28, 29], fps: 10 },
      shoot:   { frames: [21, 22, 23], fps: 16 },
      hurt:    { frames: [30], fps: 0 },
      victory: { frames: [32, 33, 34, 35], fps: 8 }
    };
  }
  function enemyAnims() {
    return {
      walk:  { frames: [0, 1, 2, 3], fps: 8 },
      alt:   { frames: [4, 5, 6, 7], fps: 8 },   // hop / swoop / puffed / out etc.
      hurt:  { frames: [8], fps: 0 }
    };
  }
  function bossAnims() {
    return {
      idle:   { frames: [0, 1, 2, 3], fps: 6 },
      attack: { frames: [4, 5, 6, 7], fps: 10 },
      warn:   { frames: [8, 9], fps: 8 },
      dizzy:  { frames: [12, 13, 14, 15], fps: 6 },
      hurt:   { frames: [16], fps: 0 }
    };
  }

  var sheets = {};
  var chars = ['older-sister', 'younger-sister', 'dad', 'mom'];
  var charIds = ['older', 'younger', 'dad', 'mom'];
  for (var i = 0; i < chars.length; i++) {
    ['small', 'big'].forEach(function (size) {
      sheets['char-' + charIds[i] + '-' + size] = {
        src: 'art/characters/' + chars[i] + '-' + size + '.png',
        cell: [256, 256], cols: 8,
        scale: size === 'small' ? 0.25 : 0.375,
        pivot: [128, 244],
        anims: charAnims()
      };
    });
  }

  var enemies = ['hedgehog', 'frog', 'mole', 'bat', 'rock', 'crow', 'cloudling', 'gull', 'spark',
    'plant', 'crab', 'jellyfish', 'puffer', 'eel', 'cactus', 'scorpion', 'vulture', 'tumbleweed'];
  enemies.forEach(function (e) {
    sheets['enemy-' + e] = {
      src: 'art/enemies/' + e + '.png',
      cell: [192, 192], cols: 4, scale: 0.25, pivot: [96, 184], anims: enemyAnims()
    };
  });

  var bosses = ['bristle', 'duke', 'croakia', 'grumblecloud', 'frostbeak', 'octavia', 'sandclaw'];
  bosses.forEach(function (b) {
    sheets['boss-' + b] = {
      src: 'art/bosses/' + b + '.png',
      cell: [320, 320], cols: 4, scale: 0.5, pivot: [160, 312], anims: bossAnims()
    };
  });

  // Tilesets: 128x128 cells (4x the 32 px tile). Row 0 = solid tiles,
  // row 1 = top overlays (moss/snow/sand) drawn above so they can overhang.
  var tileFrames = {
    ground: 0, groundAlt: 1, box: 2, qbox: 3, candybox: 4, cracked: 5, used: 6, thin: 7,
    top: 8, topLeft: 9, topRight: 10, hangLeft: 11, hangRight: 12, spring: 13, rain: 14, crumble: 15
  };
  for (var l = 1; l <= 7; l++) {
    sheets['tiles-' + l] = {
      src: 'art/tiles/level' + l + '-tiles.png',
      cell: [128, 128], cols: 8, scale: 0.25, pivot: [0, 0], frames: tileFrames
    };
  }

  sheets['items'] = {
    src: 'art/items/items.png',
    cell: [128, 128], cols: 8, scale: 0.25, pivot: [64, 64],
    anims: {
      coin:     { frames: [0, 1, 2, 3, 4, 5], fps: 10 },
      crystal:  { frames: [8, 9, 10, 11, 12, 13], fps: 10 },
      carrot:   { frames: [16, 17], fps: 3 },
      candy:    { frames: [18, 19, 20, 21], fps: 8 },
      checkpoint: { frames: [24, 25], fps: 0 },   // off, on
      flag:     { frames: [26, 27, 28, 29], fps: 8 }
    }
  };
  sheets['shots'] = {
    src: 'art/items/shots.png',
    cell: [64, 64], cols: 4, scale: 0.25, pivot: [32, 32],
    anims: {
      star:      { frames: [0, 1, 2, 3], fps: 16 },
      bubble:    { frames: [4, 5, 6, 7], fps: 8 },
      boomerang: { frames: [8, 9, 10, 11], fps: 20 },
      fireball:  { frames: [12, 13, 14, 15], fps: 16 }
    }
  };
  sheets['pip'] = {
    src: 'art/pip/pip.png',
    cell: [128, 128], cols: 4, scale: 0.25, pivot: [64, 64],
    anims: { fly: { frames: [0, 1, 2, 3], fps: 8 } }
  };

  var images = {
    'ui-keyart': 'art/ui/keyart.png',
    'ui-logo': 'art/ui/logo.png'
  };
  charIds.forEach(function (c) { images['ui-portrait-' + c] = 'art/ui/portrait-' + c + '.png'; });
  for (var lv = 1; lv <= 7; lv++) {
    for (var layer = 0; layer < 4; layer++) {
      images['bg-' + lv + '-' + layer] = 'art/backgrounds/level' + lv + '-layer' + layer + '.png';
    }
  }

  window.MANIFEST = { sheets: sheets, images: images };
})();
