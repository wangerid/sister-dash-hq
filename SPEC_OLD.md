# Sister Dash – Game Specification

A 2D side-scrolling platform game that runs in the browser. You play as one of four characters (an older sister, a younger sister, Dad or Mom) and run from left to right: jump over boxes, get past the opposition, collect coins, beat the boss and grab the flag at the end of each level.

**Look and feel:** a bright, painterly "animated feature film" style — stylised 3D-looking characters with big expressive eyes and freckles, floating mossy stone islands, waterfalls, rope bridges and chunky gold star coins, under a warm sunny sky. Two reference pictures define the style (see 1b). They are stored in the project as `art/reference/younger-sister.png` (purple hoodie) and `art/reference/older-sister.png` (blue hoodie).

---

## 1. Technical constraints

| Item | Decision |
|---|---|
| Platform | Desktop web browser (Chrome, Safari, Edge) |
| Tech | Plain HTML5 Canvas + JavaScript. No frameworks, no build step |
| Files | `index.html`, `style.css`, `js/*.js` loaded with plain `<script>` tags (no ES modules), so the game works by double-clicking `index.html` |
| Graphics | **Hybrid.** Painted PNG sprite sheets and background layers in `art/`, loaded with `new Image()`. Every sprite also has a **code-drawn fallback** in the same style (same colours, proportions and silhouette), so the game is always playable while assets are missing or still being made. See 1b |
| Asset loading | No `fetch()` or JSON files (they fail when opened from `file://`). The asset list and sprite-sheet frame data live in `js/manifest.js` as a plain global object. A missing or failed image silently falls back to the code-drawn version |
| Sound | Optional in v1. Short beeps made with the Web Audio API, with a mute toggle |
| Resolution | Logical canvas 960×540 (16:9), scaled to fit the window. **Smooth scaling** (`imageSmoothingEnabled = true`, not pixelated). The canvas backing store is sized to window × `devicePixelRatio` so painted art stays sharp on high-DPI screens; all game logic uses 960×540 coordinates |
| Frame rate | 60 fps with a fixed-timestep update loop |
| Persistence | Best score per level stored in `localStorage` (wrapped in try/catch) |

---

## 1b. Art direction

The two reference pictures are the style bible. Everything in the game — characters, enemies, bosses, tiles, backgrounds, HUD — should look like it belongs in those pictures.

### Style rules

| Area | Rule |
|---|---|
| Overall | Stylised 3D animated-film look, rendered as 2D sprites. Soft shading, rounded forms, saturated but natural colours, gentle rim light. Friendly and adventurous, never scary |
| Lighting | Warm golden key light from the **upper left**, cool blue sky fill from the right. Consistent across all sprites so nothing looks pasted in |
| Characters | Big head (children ≈ 1/3.5 of body height, adults ≈ 1/5), large eyes with bright highlights, rosy cheeks, freckles, confident smile. Clothing is practical adventure gear: hoodies, cargo trousers, canvas sneakers, wristbands, small leather backpack with buckles |
| Readability | Characters are only 48–72 px tall on screen, so each is identified first by **hoodie/jacket colour and hair shape**, then by detail. Add a thin darker outline (1–2 px at game size) around characters, enemies and collectibles so they pop against busy backgrounds |
| Environment | Floating islands of mossy stone with hanging moss, grassy tops and exposed earth; waterfalls falling into misty depths; wooden rope bridges; stone ruins and a distant castle with blue banners; pine trees; soft clouds |
| Depth | Atmospheric haze: far layers are lighter, bluer and less detailed; the play layer is sharp and saturated. Light mist at the bottom of the screen hides pits |
| Coins | Chunky gold coins with a raised **star** in the middle, a bright glint, and a spin animation (edge-on frames). Crystal coins (level 2) use the same shape in cut crystal |
| Enemies | Round, soft, cartoonish creatures with big white eyes and grumpy eyebrows (like the fuzzy dark ball in the purple picture). Cute-grumpy, not menacing |
| Effects | Soft glowing particles: sparkles on pick-ups, dust puffs on landing, "poof" clouds on stomps, light shafts in caves and underwater |

### Colour palette (starting values, tune in playtesting)

| Use | Colours |
|---|---|
| Sky | `#6FB6F2` top → `#BFE3FA` horizon |
| Moss / grass | `#7DAF3A`, `#A9C94A` highlight, `#4E7A26` shadow |
| Stone | `#8E8A83`, `#B7B1A6` highlight, `#5E5A55` shadow |
| Earth | `#A0633F`, `#C98458` |
| Wood / rope | `#8A5A33`, `#C49A6C` |
| Gold coins | `#F7C21B`, `#FFE36E` highlight, `#C98A0B` edge |
| Waterfall / mist | `#E8F4FB`, `#A9D3EE` |
| Outline | Dark warm brown `#3A2A20` at 70% opacity (not pure black) |

### Hybrid asset pipeline

- **Painted assets** (`art/`) are made outside the game with an image generator or by hand, using the reference pictures as style input, then cleaned up.
- **Code-drawn fallback** (`js/render.js`) draws each thing with canvas shapes: layered gradients for shading, a highlight blob, the dark outline, correct colours and silhouette. It is not meant to match the paintings exactly, only to keep the same colours, shapes and mood.
- `js/assets.js` loads everything listed in `js/manifest.js` during a short loading screen (progress bar with a spinning star coin). Each draw call asks "is the painted sprite loaded?" and uses the fallback if not.
- A debug key (**F2**) toggles between painted and fallback art, to check both.

**Asset requirements**

| Asset | Format |
|---|---|
| Character sprite sheets | One PNG per character and size (small, big), transparent background, clean anti-aliased edges (no halo or leftover background — the purple reference has messy edges that must not appear in-game). Frames authored at **4× game size** (e.g. small sister ≈ 192 px tall in a 256×256 cell) and drawn scaled down |
| Enemies and bosses | Same rules as characters. Bosses authored at 2× game size |
| Tiles | 128×128 px per tile (4× the 32 px tile), seamless left/right, mossy tops as a separate overlay row so moss can overhang edges |
| Backgrounds | 3–4 parallax layers per level, each 3840×2160 px (4× the canvas), horizontally tileable, transparent where layers overlap |
| Key art | Title screen illustration (both sisters mid-jump over a floating-island scene, like the reference pictures) and one portrait per character for the character select screen |
| Frame data | In `js/manifest.js`: file path, cell size, and a list of frames per animation with the pivot point at the feet |

**Style prompt to keep all generated art consistent** (reuse for every asset, adding the specific subject):

> Stylised 3D animated-film style, soft painterly shading, warm golden light from the upper left, cool blue sky fill, saturated natural colours, rounded friendly shapes, fantasy floating mossy stone islands with waterfalls. [Subject]. Full body, side view facing right, transparent background, clean edges, no text.

---

## 2. Game flow

```
Title screen → Character select → Level select → Play level → Level complete / Game over → back to Level select
```

- **Loading screen:** progress bar with a spinning star coin while painted assets load (skipped instantly if they are missing).
- **Title screen:** the key art (both sisters leaping across floating islands), the game name in a chunky gold, star-dotted logo, and "Press Enter / Click to start". Clouds and waterfalls in the background drift gently.
- **Character select:** all four characters shown side by side as large portraits on floating stone pedestals; the highlighted one does a little idle bounce. Each has a one-line description of each one's special ability and what they shoot. Choose with ←/→ and confirm with Enter, or click one.
- **Level select:** seven level cards, ordered from easiest to hardest, showing name, difficulty, best coin score, best time, and a checkmark if completed. All seven levels are unlocked from the start. Every card shows the level's boss, and gets a crown icon once that boss has been beaten. Level 7 is marked **"Very hard!"** with a small skull-and-sun icon.
- **Time challenge toggle:** on the level select screen the player can switch **Time challenge** ON or OFF (press T or click the stopwatch button). It is OFF by default. See 5.7.
- **Pause:** press P or Esc. Options are Resume, Restart level, Pip on/off, and Back to level select.

---

## 3. Characters

Both sisters have **blonde hair**. Dad and Mom have **brown hair**. The four characters look clearly different and play slightly differently. All four are drawn in the style of the reference pictures (see 1b) and dressed as a family of adventurers: hoodie or jacket, cargo trousers or jeans, canvas sneakers, wristbands and a small brown leather backpack with buckles.

| | Older sister | Younger sister | Dad | Mom |
|---|---|---|---|---|
| Reference | `art/reference/older-sister.png` (blue) | `art/reference/younger-sister.png` (purple) | Designed to match the sisters | Designed to match the sisters |
| Hair | Wavy golden-blonde hair in a **high ponytail** with a dark hair tie, loose strands around the face | Big, voluminous **loose golden-blonde curls** to below the shoulders | Short brown hair, neat light stubble | Long wavy brown hair with a **red hair band** |
| Face | Blue-grey eyes, freckles, confident half-smile | Green eyes, freckles, cheeky grin | Brown eyes, friendly smile, laugh lines | Hazel eyes, freckles, warm smile |
| Outfit | **Royal-blue zip hoodie** over a light grey t-shirt, **blue cargo trousers** with a brown utility belt, blue-grey sneakers, blue wristbands, dark backpack | **Purple zip hoodie** (sleeves pushed up) over a cream t-shirt, **olive-green cargo trousers** rolled at the ankle, purple sneakers, dark brown wristbands, brown leather backpack | **Forest-green field jacket**, grey t-shirt, jeans, brown hiking boots, larger backpack with a rolled blanket | **Orange jacket**, white t-shirt, dark blue jeans, white-and-orange sneakers, small backpack |
| Signature colour (for glow, UI and readability) | Blue `#2F4FD1` | Purple `#7A3FB8` | Green `#3E7A3A` | Orange `#E8782A` |
| Height (small form) | Medium | Shortest | Tallest (still fits under 2-tile gaps) | Tall (same as Dad) |
| Run speed | Slightly faster (+10%) | Standard | Standard | Standard |
| Jump | Standard | Slightly higher (+10%) | Slightly lower (−5%) | **Jumps further than everyone else** (see below) |
| Special | – | – | Can break cracked boxes even when small | **Long jump** |
| Shoots (with magic candy) | Sparkle stars | Bubbles | Boomerangs | Fireballs |

**Mom's long jump:** her jumps carry about **25% further** horizontally than the other characters' (faster air speed and slightly longer hang time), at normal height. Each level has 1–2 optional **bonus coin areas** across wide gaps that only she can reach. These are always optional: the main path must be completable by every character.

The differences should be noticeable but small. Every level must be completable with any of the four characters.

### Animations

Idle, run (legs cycle), jump, duck (crouched down), swim (arm strokes, level 6), throw/shoot, hurt (flash), grow/shrink (quick scale pulse), victory (arms up by the flag).

Animation style, taken from the reference pictures:

- **Jump pose** = the reference pose: leading knee up, back leg stretched, one arm reaching forward, hair and hoodie flying behind.
- **Run:** 8 frames in the painted sheets (6 in the fallback), bouncy and energetic, backpack bobbing.
- **Secondary motion:** hair (ponytail, curls, Mom's long hair) and hoodie strings lag behind movement and settle after landing. The fallback does this with a simple spring on a few hair points.
- **Squash and stretch:** a small squash on landing and stretch on take-off.
- **Idle:** breathing plus an occasional look-around or hair flick.

Minimum frame counts for the painted sheets: idle 4, run 8, jump 3 (rise, peak, fall), duck 2, swim 6, shoot 3, hurt 1, victory 4.

---

## 4. Controls

| Action | Keys |
|---|---|
| Move left / right | ← / → or A / D |
| Jump | Space, ↑ or W. Holding the key gives a higher jump, a quick tap gives a short hop |
| Duck | Hold ↓ or S |
| Swim (underwater level) | Tap Space, ↑ or W repeatedly to swim upward. Hold ↓ or S to swim down faster (ducks instead when standing on the sea floor) |
| Drop through a thin cloud (sky level) | Hold ↓ or S and press Jump while standing on it |
| Shoot (all characters, with magic candy) | X, Shift or J |
| Pause | P / Esc |
| Confirm in menus | Enter / click |

Movement feel:

- Short acceleration and deceleration, with no ice-like sliding.
- "Coyote time": the player can still jump for 0.1 s after walking off a ledge.
- Jump buffering: a jump pressed 0.1 s before landing still counts.

**Ducking:**

- Holding ↓ or S while standing makes the character crouch down to about **half her height** (a big character crouches to about the height of a small one).
- While ducking she can't walk, but slides to a stop if she was running. Releasing the key stands her up again.
- Ducking lets her dodge things flying at head height: crows and sky gulls, rolling spines, Queen Croakia's tongue grab and Admiral Octavia's spinning shells.
- She can't duck in the air. She can still shoot while ducking, and the shot comes out low.
- If she is ducking under a low ceiling, she stays ducked until there is room to stand up.

---

## 5. Core mechanics

### 5.1 Small and big (magic carrot)

- The player **starts small** in every level.
- The rules below apply to all four characters.
- Collecting a **magic carrot** makes the player **big**. She grows to about 1.5× height with a short grow animation and a sparkle.
- Big-only benefits:
  - She can break **cracked boxes** by jumping into them from below.
  - She survives one hit.
- When a big player is hit, she **shrinks back to small** and flashes, invulnerable for 1.5 seconds.
- When a small player is hit, she **loses a life**.
- Carrots appear on the ground or pop out of **surprise boxes** (boxes marked "?").
- Carrots are fairly common: there is one near the start of each level and one right after each checkpoint, plus extras in each level (see section 6).
- Collecting a carrot while already big gives a **+10 coin bonus** instead.
- The carrot **only** makes the player big. It does not let her shoot: for that she needs the magic candy (5.1b).

### 5.1b Magic candy (shooting power)

- The **magic candy** is a rare, glowing, swirly rainbow candy. Collecting it gives the player the power to **shoot** (see 5.8), whether she is small or big.
- The power lasts for the rest of the level, **until she is hit**. Any hit removes the candy power (and if she was big, she also shrinks, as usual).
- Each level has **2 magic candies**:
  - one hidden in the level, in a candy surprise box or a secret area, so it rewards exploring;
  - one in a candy surprise box right next to the checkpoint before the boss arena, so the player can always get it before the boss.
- If she respawns after losing a life, the candy box by the last checkpoint is refilled.
- Collecting a candy while she already has the power gives a **+10 coin bonus** instead.
- While she has the power, she glows faintly in her shot's color.

### 5.2 Boxes

| Type | Behaviour |
|---|---|
| Wooden box | Solid obstacle to jump over or stand on |
| Surprise box "?" | Hit from below to release a coin or a carrot, then it turns plain |
| Candy surprise box | A "?" box with a rainbow shimmer. Hit from below to release a magic candy |
| Cracked box | Only a big player (or Dad at any size) can break it by hitting it from below. It may hide coins |

### 5.3 Coins

- Spinning chunky gold coins with a raised star (as in the reference pictures), placed in the level, plus coins that come out of surprise boxes. Coins bob gently and catch a glint every few seconds.
- A HUD counter shows the number of coins in this level.
- Coins are plentiful: rows and arcs of coins over jumps, coin trails that hint at the right path, and bonus clusters in hard-to-reach spots.
- Every **100 coins** gives an extra life. This is optional and off by default.

### 5.4 Opposition (enemies)

All enemies are original, friendly-looking cartoon creatures in the style described in 1b: round and soft, big white eyes, grumpy eyebrows. The **grumpy hedgehog** is based directly on the fuzzy dark-grey spiky ball peeking over the ledge in the purple reference picture (a round ball of soft spines with small feet), and sets the look for the others.

| Enemy | Level | Behaviour | How to defeat |
|---|---|---|---|
| Grumpy hedgehog | 1+ | Walks back and forth and turns at walls and edges | Jump on top of it |
| Bouncing frog | 1+ | Hops in place or toward the player | Jump on top of it |
| Mole | 2 | Pops up out of a hole in the ground for 2 s, then hides again (dirt shakes 0.5 s before) | Jump on it while it is up |
| Cave bat | 2 | Hangs from the ceiling and swoops down in an arc when the player walks underneath | Avoid it, or jump on it |
| Rolling rock | 2 | Rolls down slopes and along tunnels | Cannot be stomped. Jump over it, or shoot it |
| Swooping crow | 3+ | Flies in a wave pattern | Avoid it, or jump on it |
| Cloudling | 4 | A small grumpy cloud that drifts slowly toward the player | Jump on top of it |
| Sky gull | 4 | Flies straight across the screen at different heights | Avoid it, or jump on it |
| Spark | 4 | A little ball of lightning that rolls along the clouds and hops over gaps | Cannot be stomped. Jump over it, or shoot it |
| Spiky plant | 5 | Stationary and cannot be stomped | Avoid it, or shoot it |
| Crab | 6 | Walks sideways along the sea floor, snapping its claws | Swim down on top of it |
| Jellyfish | 6 | Bobs slowly up and down. Its top stings, so it cannot be stomped | Avoid it, or shoot it |
| Pufferfish | 6 | Swims slowly, and puffs up into a spiky ball for 2 s when the player comes close | Stomp it while it is not puffed up, or shoot it |
| Eel | 6 | Hides in a rock hole and darts out when the player passes (bubbles at the hole warn 1 s before) | Avoid it, or shoot it when it is out |
| Cactus | 7 | Same as the spiky plant, drawn as a cactus | Avoid it, or shoot it |
| Desert scorpion | 7 | Walks fast, and dashes toward the player when she is on the same row | Jump on top of it |
| Vulture | 7 | Circles high up, then dives at the player's position (a shadow on the ground warns 1 s before) | Avoid it, or jump on it |
| Tumbleweed | 7 | Rolls quickly across the screen with big bounces | Cannot be stomped. Jump over it, or shoot it |

- Stomping an enemy makes it disappear with a "poof" and gives the player a small bounce.
- Touching an enemy from the side or below counts as a hit (see 5.1).
- Falling into a pit (or off the clouds in the sky level) costs a life, whatever size the player is.

### 5.5 Lives and checkpoints

- The player starts with 3 lives. The HUD shows hearts.
- Each level has **three checkpoints**: at about one third, at about two thirds, and right before the boss arena (small flags that light up). The player respawns at the last one reached after losing a life.
- At 0 lives: Game over screen with Retry level or Back to level select.

### 5.6 Goal flag

- Each level ends with a boss fight (see 6.5). When the boss is beaten, a **flagpole** rises. Touching it triggers the victory animation.
- A "Level complete!" screen shows coins collected / total coins in level and time taken. In Time challenge mode it also shows the time left.
- The best coin score and best time per level are saved.

### 5.7 Time challenge mode

An optional mode, switched on from the level select screen, where each level must be finished within a time limit.

| Level | Time limit |
|---|---|
| 1 Sunny Meadow | 3:00 (including the boss) |
| 2 Crystal Caves | 3:30 (including the boss) |
| 3 Whispering Forest | 3:45 (including the boss) |
| 4 Cloud Kingdom | 4:00 (including the boss) |
| 5 Snowy Mountain | 4:15 (including the boss) |
| 6 Coral Reef | 4:45 (including the boss) |
| 7 Scorching Desert | 5:00 (including the boss) |

The limits are tuned so a normal run finishes with 20–40 seconds to spare. Keep them as easy-to-edit values in `levels.js` so they can be adjusted after playtesting.

- A countdown timer replaces the elapsed-time display in the HUD.
- In the last 10 seconds the timer turns red and pulses, with a tick sound each second.
- **When the timer reaches 0:** a "Time's up!" message is shown, the player **loses one life**, and the player keeps going from where she is with a **1:00 extra-time** countdown. If time runs out again, she loses another life and gets another 1:00.
- If that lost life was the last one, it is Game over.
- Losing a life for other reasons (enemy, pit, running out of air) does not reset the timer.
- With Time challenge OFF, the game works exactly as before, with no time limit.

### 5.8 Shooting (all characters)

Every character can shoot once she has found a **magic candy** (see 5.1b), whether she is small or big. The shots **look** different for each character but **behave exactly the same**: they all bounce along the ground like fireballs. While she has the power, the character glows faintly in her shot's color so the player can see it is active. Press X, Shift or J to shoot in the direction she is facing.

| Character | Shot | Look | When it defeats an enemy |
|---|---|---|---|
| Older sister | **Sparkle stars** | Small spinning yellow stars with a glitter trail | The enemy bursts into sparkles |
| Younger sister | **Bubbles** | Shiny round soap bubbles | The enemy is trapped in a bubble and floats off the screen |
| Dad | **Boomerangs** | Small spinning wooden boomerangs | The enemy spins away off the screen |
| Mom | **Fireballs** | Orange-red balls of fire with a small flame trail | The enemy puffs away in smoke |

Shared behaviour for all four shots:

- **Bounce:** the shot is thrown slightly downward, then bounces along the ground in small hops (about 1 tile high). If it goes off a ledge it falls and keeps bouncing on the ground below.
- **Range:** about one screen width.
- **Limit:** at most **2 shots** on screen at once, with a 0.3 s cooldown between shots.
- **Disappears** when it hits a wall or leaves the screen.
- **Defeats any enemy** it touches, including enemies that can't be stomped (rolling rock, spark, spiky plant, jellyfish, cactus, tumbleweed), and gives +1 coin per enemy defeated.
- **Does not break boxes.**
- **Underwater (level 6):** shots move at half speed and bounce in slow, floaty hops along the sea floor and rocks.
- **Bosses:** 3 shot hits = 1 boss hit point, for every character (see 6.5).

### 5.9 Pip, the helper drone (cosmetic)

Based on the small flying robot in the blue reference picture.

- **Look:** a round, glossy white robot the size of a football, with a black visor face showing glowing blue smiley eyes, small white wing-fins and a soft blue glow underneath.
- **Behaviour:** floats a little behind and above the player, bobbing, and follows with a slight lag. Keeps out of the way of the play area.
- **Hints:** the first time the player meets a new enemy, box type or hazard, Pip pops up a short speech bubble ("Jump on its head!", "Hold ↓ to duck!"). Each hint shows once per save.
- **Reactions:** eyes change expression — happy arcs on coins, worried when the player is hit, spinning when the player gets the magic candy, a little loop-the-loop at checkpoints and at the flag.
- **Underwater:** Pip wears a tiny bubble helmet. In the sky level it has a little propeller.
- **No gameplay effect:** Pip can't be hit, doesn't collect anything and never blocks the view. It can be switched off in the pause menu.

---

## 6. Levels

Levels are tile-based (tile = 32×32 px) and defined as **ASCII maps** in `js/levels.js`, so they are easy to edit. Each level is roughly 300–500 tiles wide (about 2–4 minutes of play) and scrolls horizontally, with the camera following the player.

### Tile legend

```
.  empty          #  ground         B  wooden box      ?  surprise box (coin)
C  surprise box (carrot)            X  cracked box     o  coin
D  surprise box (magic candy)       d  magic candy
c  magic carrot   h  hedgehog       f  frog            w  crow
s  spiky plant    k  checkpoint     F  goal flag       P  player start
m  mole hole      b  cave bat       R  rolling rock start
|  loose stalactite (falls)         n  mine cart platform (moves on rails)
~  thin cloud (one-way)             g  rain cloud (vanishes)
^  spring cloud   =  moving cloud   W  wind zone
l  cloudling      u  sky gull       y  spark
r  crab           j  jellyfish      p  pufferfish      e  eel hole
a  air bubble vent                  <  water current (pushes left)
>  water current (pushes right)     %  seaweed / coral (decoration)
z  scorpion       v  vulture        t  tumbleweed      q  quicksand
-  crumbling sandstone platform     K  boss arena start (boss spawns here)
```

In level 2, `#` is drawn as cave rock. In level 4, `#` is drawn as a solid white cloud. In level 7, `s` is drawn as a cactus. Level 6 has an `underwater: true` flag in `levels.js` that switches on the swimming rules in 6.3.

### The seven levels (easiest to hardest)

| # | Name | Theme | Difficulty | Length | Carrots | Coins | Content |
|---|---|---|---|---|---|---|---|
| 1 | Sunny Meadow | Floating mossy islands, waterfalls, rope bridges, blue sky | Easy | ~300 tiles + boss arena | 4 | ~120 | Low boxes, a few hedgehogs, small gaps, **boss: Big Bristle** |
| 2 | Crystal Caves | Underground caves, glowing crystals, mine tracks | Easy–Medium | ~350 tiles + boss arena | 5 | ~140 | Moles, cave bats, rolling rocks, falling stalactites, mine cart platforms, **boss: Digger Duke** |
| 3 | Whispering Forest | Dark green trees, mushrooms | Medium | ~375 tiles + boss arena | 5 | ~160 | Stacked boxes, frogs and crows, wider pits, floating platforms, **boss: Queen Croakia** |
| 4 | Cloud Kingdom | High in the sky, walking on clouds, rainbows, sunset colours | Medium–Harder | ~400 tiles + boss arena | 5 | ~180 | Cloud platforms, rain clouds that vanish, spring clouds, wind, cloudlings, sky gulls, sparks, **boss: Grumblecloud** |
| 5 | Snowy Mountain | White and blue, snowy peaks | Harder | ~450 tiles + boss arena | 6 | ~200 | Tall box staircases, spiky plants, crows, cracked-box secret area, **boss: Frostbeak** |
| 6 | Coral Reef | Deep blue sea, colourful coral, seaweed, light rays from above, a sunken ship | Hard | ~450 tiles + boss arena | 5 | ~200 | Swimming, crabs, jellyfish, pufferfish, eels, water currents, air bubbles, **boss: Admiral Octavia** |
| 7 | Scorching Desert | Sand dunes, pyramids far away, orange sky, heat shimmer | **Very hard** | ~500 tiles + boss arena | 4 | ~220 | Scorpions, vultures, tumbleweeds, cacti, quicksand, crumbling platforms, long jumps over pits, **boss: King Sandclaw** |

Each level has its own palette and 3–4 parallax layers, all in the painterly style of 1b.

| # | Look (play layer) | Parallax layers (far → near) |
|---|---|---|
| 1 Sunny Meadow | **Exactly the reference pictures:** floating islands of mossy stone blocks with grassy tops, wooden crates, rope bridges, rows of wooden spikes, waterfalls pouring off the island edges | Pale sky with soft clouds and snowy mountains → floating islands with waterfalls and a distant castle with blue banners → mossy stone pillars and pine trees → light mist at the bottom |
| 2 Crystal Caves | Dark stone with moss patches, glowing blue/pink/green crystal clusters, wooden mine rails | Deep cave glow → giant crystal formations → rock pillars with hanging roots |
| 3 Whispering Forest | Mossy logs, giant mushrooms, stone ruins overgrown with ivy | Misty tree silhouettes → big trees with light shafts → ferns and bushes |
| 4 Cloud Kingdom | Big fluffy clouds with soft gold rims, rainbow bridges | Sunset sky with a large warm sun → far floating islands and a sky castle → drifting cloud banks |
| 5 Snowy Mountain | Snow-capped stone blocks, icicles, frosted pine trees | Pale blue peaks → pine forest in snow → falling snowflakes (front layer) |
| 6 Coral Reef | Coral, seaweed, sand floor, sunken ship planks | Deep-blue gradient with light rays from above → far rocks and a whale silhouette → near coral and swaying seaweed |
| 7 Scorching Desert | Sandstone blocks, cracked clay, cacti, bleached bones | Orange sky with heat shimmer → distant pyramids → dunes → blowing sand (front layer) |

In the play layer, `#` tiles use a mossy top edge wherever there is empty space above (snow in level 5, sand in level 7), with moss or roots hanging over cliff edges, just like the island edges in the reference pictures.

### 6.1 Level 2: Crystal Caves (underground, easy–medium)

The player climbs down a ladder into a cave and travels through tunnels lit by glowing crystals. This is the step between the meadow and the forest, so it introduces a few new ideas without being hard.

- **Lighting:** most of the cave is lit by blue, pink and green crystals. A few short tunnels are darker, with a soft circle of light around the player so she can always see a few tiles ahead.
- **Falling stalactites** (`|`): they shake for 0.7 s when the player walks underneath, then drop. Easy to dodge by keeping moving.
- **Mine cart platforms** (`n`): carts that roll slowly back and forth on rails over pits. The player rides them like moving platforms.
- **Rolling rocks** (`R`): roll down sloped tunnels toward the player, with a rumbling sound first.
- **Crystal coins:** some coins are shiny crystals worth 5 coins each, hidden in side tunnels.
- The ceiling is low in places, so jumps are shorter, but pits are few and narrow.

**Boss:** Digger Duke (see 6.5).

### 6.2 Level 4: Cloud Kingdom (sky, medium–harder)

The whole level is high in the sky. There is no ground: the player walks and jumps from cloud to cloud. Falling off the clouds costs a life, so this is the first level where most gaps really matter.

| Cloud | Tile | Behaviour |
|---|---|---|
| Solid cloud | `#` | Big fluffy white clouds that act like normal ground |
| Thin cloud | `~` | The player can jump up through it from below and land on top. Holding ↓ and pressing Jump drops through it |
| Rain cloud | `g` | Grey cloud. It starts raining 1 s after the player lands, then disappears. It comes back after 3 seconds |
| Spring cloud | `^` | Pink bouncy cloud that launches the player about 3× as high as a normal jump |
| Moving cloud | `=` | Drifts slowly left and right, or up and down, on a fixed path |

- **Wind zones** (`W`): areas with visible wind lines that push the player sideways, both on clouds and in the air. They are always shown before the player reaches them.
- **Rainbow bridges:** a few rainbows act as long solid platforms, with coin rows along the top.
- **Fairness:** the camera always shows the next cloud before the player has to jump, and there are no jumps that need Mom's long jump on the main path.

**Boss:** Grumblecloud (see 6.5).

### 6.3 Level 6: Coral Reef (underwater)

The whole level takes place under the sea. The player dives in from a small beach at the start and swims the rest of the way.

**Swimming rules**

- Gravity is much weaker: the player slowly sinks when no key is pressed.
- Each tap of the jump key is a swim stroke upward. Holding ↓ or S sinks faster (or ducks when standing on the sea floor).
- Left/right movement is about 70% of normal speed, with a little drift when changing direction.
- The player can stand and walk on the sea floor and on rocks, and swim onto enemies from above to stomp them.
- The top of the level is the water surface, and the player can't leave the water.

**Air meter**

- An air meter (a row of 10 bubbles) is shown in the HUD. It empties over **30 seconds**.
- Swimming through an **air bubble vent** (`a`, a stream of rising bubbles) refills it completely. Vents are placed at least every 20 seconds of normal swimming.
- When 3 bubbles are left, the meter blinks and a warning sound plays.
- If the air runs out, the player loses a life.

**Other hazards**

- **Water currents** (`<` and `>`): areas with visible streaming lines that push the player sideways. Some help her along, others must be fought against.
- **Narrow coral tunnels** with jellyfish bobbing through them, so timing matters.
- **Sunken ship section:** a short part inside a shipwreck with low ceilings and eels in the walls.

**Boss:** Admiral Octavia (see 6.5).

### 6.4 Level 7: Scorching Desert (very hard)

This is the hardest level in the game and should feel like a real challenge for a player who has beaten levels 1–6.

**Desert hazards**

- **Quicksand:** the player slowly sinks while standing in it. She can escape by jumping repeatedly. After being fully sunk for 3 seconds she loses a life.
- **Crumbling sandstone platforms:** they shake for 0.5 s after the player lands, then fall. They reappear after 3 seconds.
- **Long pits:** several jumps need a full run-up and a held jump button.
- **Enemy combinations:** for example scorpions on a narrow ledge while a vulture dives, or tumbleweeds rolling toward the player during a staircase of boxes.

**Fairness rules** (hard, but not unfair)

- Every danger is visible or warned about before it hits (vulture shadows, platforms shaking, tumbleweed dust clouds at the screen edge).
- There are no blind jumps: the camera always shows where the player will land.
- Fewer carrots than level 5 (4 in total), but one is always placed just before the boss arena.

**Boss:** King Sandclaw (see 6.5).

### 6.5 Bosses

**Every level ends with a boss fight.** Bosses are drawn in the same cute-grumpy style as the enemies, just much bigger (2–4 tiles tall), with extra detail and expressive faces: eyebrows that furrow when attacking, dizzy spiral eyes and circling stars during the weak moment. The bosses get harder level by level, so the first one is a gentle introduction and King Sandclaw in the desert is the final, toughest challenge.

#### Shared boss rules (all seven bosses)

- **No flagpole until the boss is beaten.** The level map ends in a boss arena instead.
- **Checkpoint before the arena:** every level has a checkpoint right before the arena, plus a carrot surprise box and a candy surprise box next to it.
- **Arena:** when the player passes the `K` tile, the camera locks and walls rise on both sides. The arena is one screen wide, with 1–2 floating platforms (their positions depend on the boss).
- **Intro:** the boss appears with a short 2-second entrance (roar or jump in) and its name on screen. The player can't move during the intro and can't be hurt.
- **Health bar:** a boss health bar with the boss's name replaces the level name at the top of the screen.
- **Telegraphed attacks:** every attack has a clear warning (animation, sound, shadow or shake) before it hits.
- **Weak moment:** each boss has a moment after one of its attacks when it is **dizzy or tired for about 2 seconds** (longer for some bosses, see below) (stars circle its head). Jumping on its head then removes **1 hit point**.
- **Shots:** 3 shot hits from any character = 1 hit point. This works at any time.
- **Contact:** touching the boss at any other moment counts as a normal hit to the player.
- **After a hit:** the boss flashes and is invulnerable for 1 second, and the player bounces off.
- **Losing a life in the arena:** the player respawns at the checkpoint before the arena, and the boss is back to full health.
- **Victory:** the boss turns into a small, harmless version of itself and runs away. Coins burst out, the walls sink, and the **goal flagpole rises** from the ground. The player touches the flag to finish.
- **Stomps alone:** every boss must be beatable by every character using stomps only (no shooting needed).
- **Crowns:** a crown icon on the level select card shows that the boss has been beaten.

#### Overview

| Level | Boss | Difficulty | HP | Phases | Victory coins |
|---|---|---|---|---|---|
| 1 Sunny Meadow | Big Bristle, a giant grumpy hedgehog | Easy | 3 | 1 | 20 |
| 2 Crystal Caves | Digger Duke, a giant mole with a miner's helmet and lamp | Easy–Medium | 3 | 2 | 25 |
| 3 Whispering Forest | Queen Croakia, a giant frog with a leaf crown | Medium | 4 | 2 | 30 |
| 4 Cloud Kingdom | Grumblecloud, a huge angry storm cloud | Medium–Harder | 4 | 3 | 35 |
| 5 Snowy Mountain | Frostbeak, a giant snow owl | Harder | 5 | 2 | 40 |
| 6 Coral Reef | Admiral Octavia, a giant purple octopus in an admiral's hat | Hard | 5 | 3 | 45 |
| 7 Scorching Desert | King Sandclaw, a giant sand scorpion with a golden crown | Very hard | 6 | 3 | 50 |

#### Boss 1: Big Bristle (Sunny Meadow)

A round, grumpy hedgehog the size of a small car. Slow and easy to read, it teaches the player how boss fights work.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Spiky roll | Curls into a ball and wobbles for 1.5 s | Rolls across the arena and bumps into the wall | Jump over it, or onto the platform |
| Spine shake (after 2 HP lost) | Shakes and puffs up | 3 slow spines fly up in an arc and land | Step away from the landing spots (shadows) |

- **Weak moment:** after bumping into the wall at the end of a roll, it is dizzy for 2.5 seconds (a little longer than the other bosses).
- **Arena:** one low platform in the middle.

#### Boss 2: Digger Duke (Crystal Caves)

A chubby giant mole with a yellow miner's helmet and a lamp on top, living in a big crystal cavern.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Dig and pop | He dives into the ground, and a dirt mound moves along the floor toward the player | He bursts up out of the ground where the mound stops | Keep moving, or jump onto a platform |
| Rock toss | He scoops up rocks and his lamp flashes | Throws 2 rocks in slow arcs (shadows show where they land) | Step away from the shadows |
| Ceiling shake (phase 2) | He stamps his feet and the screen rumbles | 3–4 small stalactites drop from the ceiling (they shake first) | Stand where nothing is shaking above you |

- **Weak moment:** after popping up, his head is stuck in the dirt with his helmet crooked, and he is dizzy for 2 seconds.
- **Phases:** phase 1 at 3–2 HP, phase 2 at 1 HP (faster digging, adds ceiling shake).
- **Arena:** two low rock ledges.

#### Boss 3: Queen Croakia (Whispering Forest)

A huge green frog with a crown of leaves who lives in a pond clearing.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Big jump | Crouches and puffs her cheeks for 1 s | Leaps high and lands where the player is (a shadow shows where) | Move away from the shadow |
| Ground shock | Always follows a big jump | A small shockwave runs along the floor on both sides | Jump over it |
| Tongue grab (phase 2) | Opens her mouth and her eyes glow | Her tongue shoots straight out across the arena at the player's height | Jump over it, or stand on a platform |
| Tadpole call (phase 2) | Croaks loudly | 2 small frogs hop into the arena | Stomp them, or avoid them |

- **Weak moment:** after a big jump she is stuck in the mud for 2 seconds.
- **Phases:** phase 1 at 4–3 HP, phase 2 at 2–1 HP (faster jumps, adds tongue grab and tadpole call).
- **Arena:** two lily-pad platforms.

#### Boss 4: Grumblecloud (Cloud Kingdom)

A huge, dark grey storm cloud with an angry face, bushy eyebrows and a grumbling voice. He floats above a big solid cloud that forms the arena floor, so the player can't fall off during the fight.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Lightning bolt | He crackles, and a thin flickering line appears on the floor for 1 s | A lightning bolt strikes down along that line | Step away from the line |
| Downpour | He frowns and turns darker | Heavy rain falls on one half of the arena for 3 seconds, making the player move and jump slower there | Stay on the dry side |
| Gust (phase 2+) | He puffs out his cheeks | Blows a strong wind across the arena for 2 seconds, pushing the player toward the wall | Run against the wind, or hold on by standing still on a platform |
| Thunder storm (phase 3) | He rumbles loudly and flashes | 3 lightning bolts strike one after another, left to right | Follow the gaps between the lines |

- **Weak moment:** after a lightning bolt he runs out of energy, sinks down low and turns pale and puffy for 2 seconds. He is soft enough to jump on top of, and stomping him then removes 1 hit point.
- **Phases:** phase 1 at 4–3 HP (lightning and downpour), phase 2 at 2 HP (adds gust), phase 3 at 1 HP (adds thunder storm).
- **Arena:** one big solid cloud floor and two small thin clouds (`~`) to jump up onto.
- **Victory:** he rains himself out into a tiny, smiling white cloud that floats away, and a rainbow appears where the flagpole rises.

#### Boss 5: Frostbeak (Snowy Mountain)

A giant white snow owl that flies above an icy mountain top. Parts of the arena floor are slippery ice.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Snowball drop | Hoots and flaps hard | Drops 3–4 snowballs (shadows show where) | Stand away from the shadows |
| Dive swoop | Screeches, then hovers still for 1 s at the edge of the screen | Swoops diagonally down across the arena and lands in a snowdrift | Jump or step out of the way |
| Icy wind (phase 2) | Spreads her wings wide | Blows the player slowly toward the edge of the arena for 3 seconds | Run against the wind |

- **Weak moment:** after a dive swoop she is stuck in the snowdrift for 2 seconds.
- **Phases:** phase 1 at 5–3 HP, phase 2 at 2–1 HP (faster swoops, more snowballs, adds icy wind).
- **Arena:** two floating ice platforms. The floor is slippery ice, so the player slides a bit more than normal.

#### Boss 6: Admiral Octavia (Coral Reef)

A giant purple octopus wearing a small admiral's hat, living in the wreck of an old ship. The arena is underwater, so the swimming rules apply. The air meter is paused during the fight so the player can concentrate on the boss.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Tentacle slam | A line of bubbles rises from the sea floor for 1 s | A tentacle shoots up from below where the bubbles were | Swim away from the bubbles |
| Ink cloud (phase 2+) | She puffs up and turns dark | Sprays a cloud of ink that darkens half the arena for 4 seconds | Stay on the clear side |
| Shell spin (phase 3) | She grabs shells with 3 tentacles | Throws 3 spinning shells that travel slowly across the arena | Swim over or under them |

- **Weak moment:** after a tentacle slam, the tentacle gets stuck in the sand and she is dizzy for **4 seconds**, longer than any other boss, because swimming down onto her takes more time than jumping. Swimming down onto her head then removes 1 hit point.
- **Phases:** phase 1 at 5–4 HP, phase 2 at 3–2 HP (faster slams, adds ink cloud), phase 3 at 1 HP (two tentacle slams at once, adds shell spin).
- **Arena:** two floating rock platforms and a current that slowly pushes toward the middle.

#### Boss 7: King Sandclaw (Scorching Desert)

A huge sand scorpion with a golden crown. He is the final and hardest boss in the game. The arena has two floating stone platforms and sand walls.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Claw charge | He stamps and scrapes his feet for 1 s | Charges across the arena and crashes into the wall | Jump onto a platform or over him |
| Stinger rain | He raises his tail and it glows | Stingers fall from the sky in 3–5 spots | Stand where there is no shadow on the ground |
| Sand wave (phase 3 only) | He slams the ground and it shakes | A low sand wave rolls across the floor | Jump over it |

- **Weak moment:** after a claw charge he crashes into the wall and is dizzy for 2 seconds.
- **Phases:**
  - Phase 1 (6–5 HP): slow claw charges and stinger rain.
  - Phase 2 (4–3 HP): faster, with more stingers.
  - Phase 3 (2–1 HP): fastest, and adds the sand wave.
  - He flashes and roars at each phase change.

---

## 7. HUD

Top bar:

- **Left:** hearts (lives).
- **Center:** level name (replaced by the boss health bar during the boss fight).
- **Right:** coin icon with count, and elapsed time (or the countdown in Time challenge mode).

HUD style: chunky rounded shapes on soft semi-transparent dark panels, gold star coin icon (same as the in-game coin), glossy red hearts, white text with a soft dark outline. Use a rounded bold font bundled in `art/fonts/` and loaded with `@font-face` (no web fonts, so it works offline), falling back to a system sans-serif. The boss health bar is a gold-framed bar in the boss's colour.

A small carrot icon shows when the player is currently big. A candy icon with her shot (star, bubble, boomerang or flame) shows when she has the magic candy power and can shoot. In level 6, the **air meter** (10 bubbles) is shown under the hearts.

---

## 8. Code structure

```
index.html
style.css
art/
  reference/     – the two style reference pictures (not loaded by the game)
  characters/    – older-sister-small.png, older-sister-big.png, … (8 sheets)
  enemies/       – one sheet per enemy
  bosses/        – one sheet per boss
  tiles/         – one tileset per level
  backgrounds/   – level1-layer0.png … level7-layer3.png
  items/         – coins, carrot, candy, boxes, flag, checkpoint, shots
  ui/            – key art, character portraits, HUD icons, logo
  pip/           – helper drone sheet
  fonts/         – bundled rounded font
js/
  manifest.js    – global list of all art files and sprite-sheet frame data
  assets.js      – image loading, loading screen, painted/fallback switch (F2)
  pip.js         – helper drone follow, hints and reactions
  main.js        – boot, game loop, scene manager
  input.js       – keyboard state
  scenes.js      – title, character select, level select, play, results, game over
  player.js      – physics, states, small/big, character stats, long jump
  swimming.js    – underwater physics, air meter, currents
  projectiles.js – shared bouncing-shot logic, with a different look per character
  enemies.js     – enemy types and AI
  boss.js        – shared boss engine: arena lock, intro, health bar, phases, victory
  bosses.js      – the seven bosses and their attacks
  level.js       – ASCII parsing, tile collision, camera
  levels.js      – the seven level maps and time limits
  entities.js    – coins, carrots, boxes, checkpoint, flag, stalactites, mine carts, cloud types, wind, quicksand, crumbling platforms, air vents
  render.js      – drawing helpers: draws painted sprites when loaded, otherwise the code-drawn fallback art for characters, enemies, tiles and backgrounds
  audio.js       – simple sound effects and mute
  storage.js     – best scores and best times
  timer.js       – elapsed time and Time challenge countdown
```

---

## 9. Build milestones (for Claude Code)

Build and verify one milestone at a time.

1. **Skeleton:** canvas, game loop, keyboard input, and a rectangle that runs and jumps on flat ground.
2. **Level engine:** ASCII level parsing, tile collision, a scrolling camera, and level 1 playable start to flag.
3. **Art pipeline:** `manifest.js`, `assets.js`, loading screen, high-DPI canvas, smooth scaling, painted/fallback switch (F2). Level 1 fallback tiles and parallax in the floating-island style.
4. **Characters:** both sisters (blonde, styled after the reference pictures), Dad and Mom (both brown hair), code-drawn fallback with animations and hair secondary motion, painted sprite support, ducking, Mom's long jump, plus the character select screen with portraits.
5. **Collectibles:** star coins, surprise boxes, styled HUD.
6. **Magic carrot:** small/big states, cracked boxes, hit/shrink logic, invulnerability.
7. **Enemies:** hedgehog (the fuzzy ball from the reference) and frog first, then crow and spiky plant.
8. **Magic candy + shooting:** candy item and candy boxes, the shared bouncing shot with the four different looks (stars, bubbles, boomerangs, fireballs), and enemy hits.
9. **Lives and checkpoints:** game over and results screens.
10. **Pip the helper drone:** follow behaviour, first-time hints, reactions, on/off in pause menu.
11. **Level select + Whispering Forest and Snowy Mountain:** level select screen with all seven cards, best-score saving, and levels 3 and 5.
12. **Time challenge:** toggle on level select, countdown HUD, time's-up life loss and extra time, best times.
13. **Level 2 – Crystal Caves:** cave tiles, moles, bats, rolling rocks, stalactites, mine carts, darker tunnels.
14. **Level 4 – Cloud Kingdom:** cloud tile types, wind zones, rainbow bridges, cloudlings, sky gulls, sparks.
15. **Level 6 – Coral Reef:** swimming physics, air meter and vents, currents, sea enemies.
16. **Level 7 – Scorching Desert:** desert enemies, quicksand, crumbling platforms.
17. **Boss engine + Big Bristle:** arena lock, intro, health bar, weak moment, victory sequence with the rising flagpole, and the level 1 boss.
18. **Remaining bosses:** Digger Duke, Queen Croakia, Grumblecloud, Frostbeak, Admiral Octavia and King Sandclaw, one at a time.
19. **Polish:** fallback parallax for all levels, particles and light effects, title screen, sounds, pause menu, balancing, Mom's bonus coin areas.
20. **Painted art drop-in:** add painted sheets to `art/` as they are produced, register them in `manifest.js`, and check each against its fallback with F2 (alignment, pivot at the feet, scale, lighting direction).

Until a level's boss is built, that level can end with a temporary flag. Painted art can arrive at any point; the game must never depend on it to run.

---

## 10. Acceptance criteria

- [ ] The game starts by opening `index.html` in a browser, with no install and no server (painted images load from `file://`).
- [ ] The player can pick one of four characters: two blonde sisters, Dad and Mom (both brown-haired grown-ups), all visibly distinct and named on the character select screen.
- [ ] The older sister matches the blue reference picture (blonde ponytail, blue hoodie, blue cargo trousers) and the younger sister matches the purple reference picture (loose blonde curls, purple hoodie, olive cargo trousers). Dad and Mom are drawn in the same style.
- [ ] The game looks like the reference pictures: painterly floating mossy islands, waterfalls, rope bridges, gold star coins, warm upper-left lighting and atmospheric depth.
- [ ] With **all** painted assets missing, the game still runs fully using code-drawn fallback art in the same colours and style. F2 switches between painted and fallback art.
- [ ] Painted art stays sharp on high-DPI screens and is never pixelated.
- [ ] Pip the helper drone follows the player, gives first-time hints, and can be switched off.
- [ ] Holding ↓ makes the character duck to about half height, and ducking dodges head-height attacks.
- [ ] Mom jumps noticeably further than the other characters, and each level has optional bonus areas only she can reach.
- [ ] The player can pick any of the 7 levels from the level select screen, ordered from easiest to hardest.
- [ ] The player can run, jump (variable height) and land on boxes and platforms.
- [ ] Coins can be collected and the count is shown in the HUD.
- [ ] A magic carrot only makes the player big. Getting hit while big makes her small, and getting hit while small costs a life.
- [ ] Enemies can be defeated by stomping (except the unstompable ones) and hurt the player on side contact.
- [ ] Shooting is only possible after finding a magic candy, and the power is lost when hit. Every level has 2 candies, one of them just before the boss.
- [ ] All four characters can shoot with the candy power. The shots look different (stars, bubbles, boomerangs, fireballs) but all bounce along the ground in the same way, and defeat any enemy.
- [ ] Level 2 is an underground cave level, between level 1 and level 3 in difficulty.
- [ ] Level 4 is a sky level where the player walks on clouds, between level 3 and level 5 in difficulty.
- [ ] Level 6 is an underwater level with swimming, an air meter and air bubble vents.
- [ ] With Time challenge ON, running out of time costs one life and gives 1:00 extra time. With it OFF, there is no time limit.
- [ ] Touching the flag completes the level and shows the coin score.
- [ ] Every level can be completed with all four characters, with and without Time challenge.
- [ ] Level 7 is a desert level that is clearly harder than level 6.
- [ ] Every level ends with its own boss (Big Bristle, Digger Duke, Queen Croakia, Grumblecloud, Frostbeak, Admiral Octavia, King Sandclaw), and each boss is harder than the one before.
- [ ] The Cloud Kingdom boss is Grumblecloud, an angry storm cloud.
- [ ] Admiral Octavia stays dizzy for 4 seconds after a tentacle slam.
- [ ] Every boss has telegraphed attacks, a health bar, and can be beaten by stomping alone.
- [ ] The goal flag in each level only appears after that level's boss is defeated.
- [ ] Each level has the number of carrots and roughly the number of coins listed in section 6.
- [ ] Runs smoothly at 60 fps on a normal laptop.

---

## 11. Out of scope for v1 (possible later)

- Two-player mode (two characters at once)
- Touch controls for iPad or phone
- Level editor
- Music tracks
- More power-ups (for example a golden carrot that gives temporary invincibility)
