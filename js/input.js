// Keyboard state (held + pressed-this-frame) and mouse clicks in game coordinates.
var Input = {
  held: {},
  pressedQ: {},
  pressed: {},
  clicks: [],        // [{x, y}] in 960x540 coordinates, consumed each frame
  mouse: { x: -1, y: -1 },
  clickThisFrame: null,

  bindings: {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'ArrowUp', 'KeyW'],
    shoot: ['KeyX', 'ShiftLeft', 'ShiftRight', 'KeyJ'],
    pause: ['KeyP', 'Escape'],
    confirm: ['Enter', 'NumpadEnter', 'Space'],
    back: ['Escape', 'Backspace'],
    time: ['KeyT'],
    mute: ['KeyM'],
    debugArt: ['F2']
  },

  init: function (canvas) {
    var self = this;
    window.addEventListener('keydown', function (e) {
      if (!self.held[e.code]) self.pressedQ[e.code] = true;
      self.held[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F2', 'Backspace'].indexOf(e.code) >= 0) e.preventDefault();
      Sound.resume();
    });
    window.addEventListener('keyup', function (e) { self.held[e.code] = false; });
    window.addEventListener('blur', function () { self.held = {}; });
    canvas.addEventListener('mousedown', function (e) {
      var p = self.toGame(canvas, e);
      self.clicks.push(p);
      Sound.resume();
    });
    canvas.addEventListener('mousemove', function (e) {
      var p = self.toGame(canvas, e);
      self.mouse.x = p.x; self.mouse.y = p.y;
    });
  },

  toGame: function (canvas, e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * 960, y: (e.clientY - r.top) / r.height * 540 };
  },

  // Called once per fixed update step, before scenes update.
  beginStep: function () {
    this.pressed = this.pressedQ;
    this.pressedQ = {};
    this.clickThisFrame = this.clicks.length ? this.clicks.shift() : null;
  },

  down: function (action) {
    var keys = this.bindings[action];
    for (var i = 0; i < keys.length; i++) if (this.held[keys[i]]) return true;
    return false;
  },

  hit: function (action) {
    var keys = this.bindings[action];
    for (var i = 0; i < keys.length; i++) if (this.pressed[keys[i]]) return true;
    return false;
  },

  // Click inside a rect this step?
  clicked: function (x, y, w, h) {
    var c = this.clickThisFrame;
    return !!c && c.x >= x && c.x <= x + w && c.y >= y && c.y <= y + h;
  },

  anyClick: function () { return !!this.clickThisFrame; },

  hover: function (x, y, w, h) {
    var m = this.mouse;
    return m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
  }
};
