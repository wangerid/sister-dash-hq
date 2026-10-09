// Registers the expansion art pack (art/sister-dash-expansion, see its
// README.txt) in MANIFEST under the game's own keys. The pack's frame data
// comes from EXPANSION_ART (expansion-manifest.js, loaded just before this
// file); paths in it are relative to the pack folder.
(function () {
  var BASE = 'art/sister-dash-expansion/';
  var src = window.EXPANSION_ART && EXPANSION_ART.sheets;
  if (!src) return;

  var map = {
    'bosses/drumbeak': 'boss-drumbeak',
    'bosses/fuzzmo': 'boss-fuzzmo',
    'bosses/brutus-block': 'boss-brutus',
    'enemies/squirrel': 'enemy-squirrel',
    'enemies/caterpillar': 'enemy-caterpillar',
    'enemies/bee': 'enemy-bee',
    'enemies/blob-alien': 'enemy-blob',
    'enemies/mini-ufo': 'enemy-ufo',
    'enemies/space-urchin': 'enemy-urchin',
    'enemies/city-pigeon': 'enemy-pigeon',
    'enemies/traffic-cone': 'enemy-cone',
    'enemies/shopping-cart': 'enemy-cart',
    'enemies/pebble-friend': 'enemy-pebble',
    'tiles/treetop': 'tiles-' + TH.TREETOP,
    'tiles/space': 'tiles-' + TH.SPACE,
    'tiles/city': 'tiles-' + TH.CITY,
    'props/treetop': 'props-treetop',
    'props/treetop-extra': 'props-treetop-extra',
    'props/space': 'props-space',
    'props/city': 'props-city',
    'effects/treetop': 'fx-treetop',
    'effects/space': 'fx-space',
    'traffic/car': 'traffic-car',
    'traffic/bus': 'traffic-bus',
    'traffic/cement-truck': 'traffic-truck',
    'characters/younger-pink-small': 'char-younger-pink-small',
    'characters/younger-pink-big': 'char-younger-pink-big',
    'ui/expansion': 'ui-expansion'
  };
  for (var k in map) {
    var d = src[k];
    if (!d) continue;
    var copy = {};
    for (var f in d) copy[f] = d[f];
    copy.src = BASE + d.src;
    MANIFEST.sheets[map[k]] = copy;
  }
  // Props, effects and UI cells bleed a little into each other at the edges.
  ['props-treetop', 'props-treetop-extra', 'props-space', 'props-city', 'ui-expansion'].forEach(function (k) {
    if (MANIFEST.sheets[k]) MANIFEST.sheets[k].inset = 10;
  });
  ['fx-treetop', 'fx-space'].forEach(function (k) { if (MANIFEST.sheets[k]) MANIFEST.sheets[k].inset = 4; });
  // Enemies without a separate hurt pose reuse their first frame.
  ['squirrel', 'caterpillar', 'bee', 'blob', 'ufo', 'urchin', 'pigeon', 'cone', 'cart', 'pebble'].forEach(function (e) {
    var s = MANIFEST.sheets['enemy-' + e];
    if (s && s.anims && !s.anims.hurt) s.anims.hurt = { frames: [0], fps: 0 };
    if (s && s.anims && !s.anims.alt) s.anims.alt = s.anims.walk;
  });
  // The pink-outfit character sheets also have a portrait in cell 39.
  ['small', 'big'].forEach(function (size) {
    var s = MANIFEST.sheets['char-younger-pink-' + size];
    if (s && s.anims) s.anims.portrait = { frames: [39], fps: 0 };
  });

  // Backgrounds: three mirrored layers per new world, far -> near.
  var bgThemes = { treetop: TH.TREETOP, space: TH.SPACE, city: TH.CITY };
  var bgs = EXPANSION_ART.backgrounds || {};
  window.BG_PARALLAX = window.BG_PARALLAX || {};
  for (var name in bgThemes) {
    var layers = bgs[name] || [];
    var par = [];
    for (var i = 0; i < layers.length; i++) {
      MANIFEST.images['bg-' + bgThemes[name] + '-' + i] = BASE + layers[i].src;
      par.push(layers[i].parallax);
    }
    BG_PARALLAX[bgThemes[name]] = { par: par, mirror: true };
  }
})();
