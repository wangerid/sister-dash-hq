# Sister Dash – Merged Game Specification (10 levels)

This is the **master spec** for Sister Dash. It merges the two earlier specs:

- **`SPEC-HQ.md`** (newer): ten levels including Treetop Heights, Starlight Station and Cement City, three new bosses, five magic candies per level, the younger sister in a pink t-shirt, a quality setting and HQ effects.
- **`SPEC_OLD.md`** (original): the painted "animated film" art direction, the **hybrid art pipeline** (painted PNG sheets with a code-drawn fallback, F2 to switch), the no-`fetch` manifest so the game runs from `file://`, Pip the helper drone, and the performance-friendly 960×540 game grid.

Where the two disagreed, this spec picks one and says why (see **Merge decisions** below). The game in this folder implements this spec.

A 2D side-scrolling platform game that runs in the browser. You play as one of four characters (an older sister, a younger sister, Dad or Mom) and run from left to right: jump over boxes, get past the opposition, collect coins, beat the boss and grab the flag at the end of each level.

### Merge decisions

| Topic | SPEC_OLD | SPEC-HQ | Merged decision |
|---|---|---|---|
| Number of levels | 7 | 10 | **10** (HQ). The three new worlds use the expansion art pack |
| Art pipeline | Painted PNG sheets + code-drawn fallback | SVG strings authored in code | **Painted PNG + code-drawn fallback** (OLD). The painted art (including the expansion pack) already exists and looks better; the fallback keeps the game playable if any image is missing. F2 switches |
| Resolution | 960×540 logical, backing store × devicePixelRatio | 1920×1080 logical | **960×540 game grid (32 px tiles)**, rendered at up to **2× = 1920×1080** on High. Same sharpness as HQ, but all gameplay values and maps stay as they were (OLD) |
| Performance | Fixed timestep, pre-rendered caches | Quality setting High/Medium/Low, auto-downgrade | **Both**: fixed 60 Hz timestep, cached tile atlases / backgrounds / sprites, plus the quality setting and auto-downgrade (see 12.8) |
| Younger sister's look | Purple hoodie, loose curls | Pink t-shirt, black pants, pigtails | **Pink by default** (HQ), the purple hoodie is kept as an **outfit option** on the character screen |
| Pip the helper drone | Yes | Not mentioned | **Kept** (OLD): hints for every new enemy and hazard too, helmet in space |
| Magic candies per level | 2 | 5 | **5** (HQ) |
| Font | Bundled Fredoka (`@font-face`, offline) | Google Fonts | **Bundled Fredoka** (OLD), so it works offline |
| Save data | Best per level number | Best per level number | Saved per **world id**, so scores from the 7-level game carry over after renumbering |

---

## 1. Technical constraints

| Item | Decision |
|---|---|
| Platform | Desktop web browser (Chrome, Safari, Edge) |
| Tech | Plain HTML5 Canvas + JavaScript. No frameworks, no build step |
| Files | `index.html`, `style.css`, `js/*.js` loaded with plain `<script>` tags (no ES modules), so the game works by double-clicking `index.html` |
| Graphics | **Hybrid.** Painted PNG sprite sheets and background layers in `art/` (the original set plus `art/sister-dash-expansion/`), loaded with `new Image()`. Every sprite also has a **code-drawn fallback** in the same colours and silhouette, so the game is always playable while assets are missing. F2 toggles painted / fallback |
| Asset loading | No `fetch()` or JSON (they fail from `file://`). Frame data lives in `js/manifest.js` and `art/sister-dash-expansion/expansion-manifest.js` as plain globals; `js/expansion.js` registers the expansion pack. A missing image silently falls back to the code-drawn version |
| Sound | Short beeps made with the Web Audio API, with a mute toggle (M) |
| Resolution | Game logic uses a **960×540** grid with **32×32 px tiles**. The canvas is scaled to fit the window and rendered at up to 2× (1920×1080) depending on the quality setting and the screen's pixel density, with smooth scaling |
| Frame rate | 60 fps with a fixed-timestep (1/60 s) update loop, at most 8 catch-up steps per frame |
| Quality | High / Medium / Low in the pause menu (default High). See 12.8 |
| Persistence | Best coins, best time, Time-challenge time and crown per world, plus settings and seen hints, in `localStorage` (wrapped in try/catch) |

---

## 2. Game flow

```
Title screen → Character select → Level select → Play level → Level complete / Game over → back to Level select
```

- **Title screen:** game name and "Press Enter / Click to start".
- **Loading screen:** progress bar with a spinning star coin while painted assets load (never hangs: an 8-second timeout falls back to the code-drawn art).
- **Character select:** all four characters shown side by side on floating stone pedestals, with a one-line description of each one's special ability and what they shoot. Choose with ←/→ and confirm with Enter, or click one. When the younger sister is highlighted, ↑/↓ (or O, or the outfit button) switches her outfit between **Pink** (default) and **Purple**.
- **Level select:** ten level cards, ordered from easiest to hardest, showing name, difficulty, best coin score, best time, and a checkmark if completed. Show them in two rows of five. All ten levels are unlocked from the start. Every card shows the level's boss, and gets a crown icon once that boss has been beaten. Level 9 is marked **"Very hard!"** with a small skull-and-sun icon, and level 10 is marked **"Extremely hard!"** with a skull-and-skyscraper icon.
- **Time challenge toggle:** on the level select screen the player can switch **Time challenge** ON or OFF (press T or click the stopwatch button). It is OFF by default. See 5.7.
- **Pause:** press P or Esc. Options are Resume, Restart level, Pip on/off, 100 coins = extra life on/off, Graphics (High / Medium / Low), Screen shake on/off, and Back to level select.
- **Transitions:** a circle-wipe (iris) between screens and when respawning.

---

## 3. Characters

Both sisters have **blonde hair**. Dad and Mom have **brown hair**. The four characters look clearly different and play slightly differently.

| | Older sister | Younger sister | Dad | Mom |
|---|---|---|---|---|
| Look | Wavy blonde hair in a high ponytail, royal-blue hoodie, blue cargo trousers | Blonde pigtails, **pink t-shirt, black pants** (alternative outfit: purple hoodie and olive cargo trousers) | Grown man, tall, short brown hair, forest-green field jacket, jeans, hiking boots, big backpack | Grown woman, tall, long wavy brown hair with a red hair band, orange jacket, dark blue jeans |
| Signature colour (glow, UI) | Blue `#2F4FD1` | Purple `#7A3FB8` | Green `#3E7A3A` | Orange `#E8782A` |
| Height (small form) | Medium | Shortest | Tallest (still fits under 2-tile gaps) | Tall (same as Dad) |
| Run speed | Slightly faster (+10%) | Standard | Standard | Standard |
| Jump | Standard | Slightly higher (+10%) | Slightly lower (−5%) | **Jumps further than everyone else** (see below) |
| Special | – | – | Can break cracked boxes even when small | **Long jump** |
| Shoots (with magic candy) | Sparkle stars | Bubbles | Boomerangs | Fireballs |

**Mom's long jump:** her jumps carry about **25% further** horizontally than the other characters' (faster air speed and slightly longer hang time), at normal height. Each level has 1–2 optional **bonus coin areas** across wide gaps that only she can reach. These are always optional: the main path must be completable by every character.

The differences should be noticeable but small. Every level must be completable with any of the four characters.

### Animations (HQ)

Idle (breathing, blinking, hair moving), run (8-frame cycle), jump (rise / peak / fall picked by vertical speed, squash on take-off and landing), duck, swim (level 7), vine swing (level 4: the pink-outfit sheet has two vine poses, the others use the jump peak pose), throw/shoot, hurt (flash and knock-back), grow/shrink (stretchy pop with sparkles), victory. Hair and hoodie strings follow a small spring so they lag behind movement. In level 8 (space), every character wears a round glass space helmet overlay (`ui/expansion.png`, helmetSide), sized for small and big forms and lower while ducking.

Painted sheets: 256×256 cells, 8 columns, pivot at the feet (128, 244), small form scale 0.25, big form 0.375. Minimum frames: idle 4, run 8, jump 3, duck 2, swim 6, shoot 3, hurt 1, victory 4.

---

## 4. Controls

| Action | Keys |
|---|---|
| Move left / right | ← / → or A / D |
| Jump | Space, ↑ or W. Holding the key gives a higher jump, a quick tap gives a short hop |
| Duck | Hold ↓ or S |
| Swim (underwater level) | Tap Space, ↑ or W repeatedly to swim upward. Hold ↓ or S to swim down faster (ducks instead when standing on the sea floor) |
| Drop through a thin cloud (sky level) | Hold ↓ or S and press Jump while standing on it |
| Let go of a vine (treetop level) | Press Jump |
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
- Ducking lets her dodge things flying at head height: crows, bees, sky gulls, rolling spines, Queen Croakia's tongue grab, Drumbeak's peck dash and Admiral Octavia's spinning shells.
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

- The **magic candy** is a glowing, swirly rainbow candy. Collecting it gives the player the power to **shoot** (see 5.8), whether she is small or big.
- The power lasts for the rest of the level, **until she is hit**. Any hit removes the candy power (and if she was big, she also shrinks, as usual).
- Each level has **5 magic candies**, so a player who gets hit has good chances to find a new one:
  - one in the first part of the level, shortly after the start;
  - one right after each of the first two checkpoints;
  - one hidden in the level, in a candy surprise box or a secret area, so it rewards exploring;
  - one in a candy surprise box right next to the checkpoint before the boss arena, so the player can always get it before the boss.
- The candies are spread out so that there is roughly one in every fifth of the level. They are a bit rarer than coins and carrots, so finding one still feels special.
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

- Spinning gold coins placed in the level, plus coins that come out of surprise boxes.
- A HUD counter shows the number of coins in this level.
- Coins are plentiful: rows and arcs of coins over jumps, coin trails that hint at the right path, and bonus clusters in hard-to-reach spots.
- Every **100 coins** gives an extra life. This is optional and off by default.

### 5.4 Opposition (enemies)

All enemies are original, friendly-looking cartoon creatures.

| Enemy | Level | Behaviour | How to defeat |
|---|---|---|---|
| Grumpy hedgehog | 1+ | Walks back and forth and turns at walls and edges | Jump on top of it |
| Bouncing frog | 1+ | Hops in place or toward the player | Jump on top of it |
| Mole | 2 | Pops up out of a hole in the ground for 2 s, then hides again (dirt shakes 0.5 s before) | Jump on it while it is up |
| Cave bat | 2 | Hangs from the ceiling and swoops down in an arc when the player walks underneath | Avoid it, or jump on it |
| Rolling rock | 2 | Rolls down slopes and along tunnels | Cannot be stomped. Jump over it, or shoot it |
| Swooping crow | 3+ | Flies in a wave pattern | Avoid it, or jump on it |
| Squirrel | 4 | Runs back and forth along branches, and sometimes jumps to the next branch | Jump on top of it |
| Caterpillar | 4 | Crawls slowly along branches and up tree trunks | Jump on top of it |
| Bee | 4 | Buzzes in a figure-eight around its hive | Cannot be stomped. Avoid it, duck under it, or shoot it |
| Cloudling | 5 | A small grumpy cloud that drifts slowly toward the player | Jump on top of it |
| Sky gull | 5 | Flies straight across the screen at different heights | Avoid it, or jump on it |
| Spark | 5 | A little ball of lightning that rolls along the clouds and hops over gaps | Cannot be stomped. Jump over it, or shoot it |
| Spiky plant | 6 | Stationary and cannot be stomped | Avoid it, or shoot it |
| Crab | 7 | Walks sideways along the sea floor, snapping its claws | Swim down on top of it |
| Jellyfish | 7 | Bobs slowly up and down. Its top stings, so it cannot be stomped | Avoid it, or shoot it |
| Pufferfish | 7 | Swims slowly, and puffs up into a spiky ball for 2 s when the player comes close | Stomp it while it is not puffed up, or shoot it |
| Eel | 7 | Hides in a rock hole and darts out when the player passes (bubbles at the hole warn 1 s before) | Avoid it, or shoot it when it is out |
| Blob alien | 8 | A small purple jelly alien that bounces in high, slow hops (low gravity) | Jump on top of it |
| Mini UFO | 8 | Hovers back and forth and drops slow, glowing star pellets straight down | Avoid the pellets, or jump on it |
| Space urchin | 8 | A spiky ball that drifts slowly through the air | Cannot be stomped. Avoid it, or shoot it |
| Cactus | 9 | Same as the spiky plant, drawn as a cactus | Avoid it, or shoot it |
| Desert scorpion | 9 | Walks fast, and dashes toward the player when she is on the same row | Jump on top of it |
| Vulture | 9 | Circles high up, then dives at the player's position (a shadow on the ground warns 1 s before) | Avoid it, or jump on it |
| Tumbleweed | 9 | Rolls quickly across the screen with big bounces | Cannot be stomped. Jump over it, or shoot it |
| City pigeon | 10 | Sits on ledges and lamp posts, then flutters down at the player in a curve | Avoid it, or jump on it |
| Hopping traffic cone | 10 | An orange cone that hops toward the player in short jumps | Jump on top of it |
| Runaway shopping cart | 10 | Rolls fast along the pavement and bounces off walls | Cannot be stomped. Jump over it, or shoot it |
| Cars, buses and cement trucks | 10 | Drive along the roads when the pedestrian light is red (see 6.7) | Cannot be defeated. Cross at the crosswalk on green |

- Stomping an enemy makes it disappear with a "poof" and gives the player a small bounce.
- Touching an enemy from the side or below counts as a hit (see 5.1).
- Falling into a pit (or off the branches, clouds or space platforms) costs a life, whatever size the player is.

### 5.5 Lives and checkpoints

- The player starts with 3 lives. The HUD shows hearts.
- Each level has **three checkpoints**: at about one third, at about two thirds, and right before the boss arena (small flags that light up). The player respawns at the last one reached after losing a life.
- At 0 lives: Game over screen with Retry level or Back to level select.

### 5.6 Goal flag

- Each level ends with a boss fight (see 6.8). When the boss is beaten, a **flagpole** rises. Touching it triggers the victory animation.
- A "Level complete!" screen shows coins collected / total coins in level and time taken. In Time challenge mode it also shows the time left.
- The best coin score and best time per level are saved.

### 5.7 Time challenge mode

An optional mode, switched on from the level select screen, where each level must be finished within a time limit.

| Level | Time limit (including the boss) |
|---|---|
| 1 Sunny Meadow | 3:00 |
| 2 Crystal Caves | 3:30 |
| 3 Whispering Forest | 3:45 |
| 4 Treetop Heights | 4:00 |
| 5 Cloud Kingdom | 4:10 |
| 6 Snowy Mountain | 4:15 |
| 7 Coral Reef | 4:45 |
| 8 Starlight Station | 5:00 |
| 9 Scorching Desert | 5:15 |
| 10 Cement City | 5:30 |

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
- **Defeats any enemy** it touches, including enemies that can't be stomped (rolling rock, bee, spark, spiky plant, jellyfish, space urchin, cactus, tumbleweed), and gives +1 coin per enemy defeated.
- **Does not break boxes.**
- **Underwater (level 7):** shots move at half speed and bounce in slow, floaty hops along the sea floor and rocks.
- **In space (level 8):** shots bounce in higher, slower hops because of the low gravity.
- **Bosses:** 3 shot hits = 1 boss hit point, for every character (see 6.8).
- Star pellets dropped by mini UFOs and Brutus Block's pebble friends can be shot but give no coin (no coin farming).

### 5.9 Pip, the helper drone (cosmetic)

Based on the small flying robot in the blue reference picture (`art/reference/`).

- **Look:** a round, glossy white robot the size of a football, with a black visor face showing glowing blue smiley eyes, small white wing-fins and a soft blue glow underneath.
- **Behaviour:** floats a little behind and above the player, bobbing, and follows with a slight lag. Keeps out of the way of the play area.
- **Hints:** the first time the player meets a new enemy, box type or hazard, Pip pops up a short speech bubble ("Jump on its head!", "Cross on green! Wait on the pavement."). Each hint shows once per save. All new enemies and hazards of levels 4, 8 and 10 have hints.
- **Reactions:** happy eyes on coins, worried when the player is hit, spinning when she gets the magic candy, a loop-the-loop at checkpoints and at the flag.
- **Costumes:** a tiny bubble helmet underwater and in space, a little propeller in the sky level.
- **No gameplay effect:** Pip can't be hit, doesn't collect anything and never blocks the view. It can be switched off in the pause menu.

---

## 6. Levels

Levels are tile-based (tile = 32×32 px, 17 rows tall) and defined as **ASCII maps** in `js/levels.js`, so they are easy to edit. Each map is written as chunks that are joined left to right and bottom-aligned. Maps are stored by **world id** (`TH` in `js/level.js`: 1 Meadow, 2 Caves, 3 Forest, 4 Cloud, 5 Snow, 6 Reef, 7 Desert, 8 Treetop, 9 Space, 10 City); `LEVEL_DEFS` lists the play order, names, bosses, difficulty labels and time limits. Each level is roughly 300–550 tiles wide (about 2–4 minutes of play) and scrolls horizontally, with the camera following the player.

### Tile legend

```
.  empty          #  ground         B  wooden box      ?  surprise box (coin)
C  surprise box (carrot)            X  cracked box     o  coin
D  surprise box (magic candy)       d  magic candy
c  magic carrot   h  hedgehog       f  frog            w  crow
s  spiky plant    k  checkpoint     F  goal flag       P  player start
K  boss arena start (boss spawns here)

%  decoration (flowers, mushrooms, coral, tree house, rocket, street lamp…)
:  rainbow bridge (solid)           _  rope bridge (one-way; road in level 10)

Caves (level 2)
m  mole hole      b  cave bat       R  rolling rock start
|  loose stalactite (falls)         n  mine cart platform (moves on rails)
*  crystal coin (worth 5; pinecone in level 4)

Treetops (level 4)
L  leaf platform (bends down)       V  hanging vine (swing on it)
H  rope bridge (sways)              *  pinecone drop spot
Q  squirrel       E  caterpillar    Y  bee hive (bees fly around it)

Sky (level 5)
~  thin cloud (one-way)             g  rain cloud (vanishes)
^  spring cloud   =  moving cloud   I  moving cloud, up and down (boost pad in level 8)
W  wind zone
l  cloudling      u  sky gull       y  spark

Underwater (level 7)
r  crab           j  jellyfish      p  pufferfish      e  eel hole
a  air bubble vent                  <  water current (pushes left)
>  water current (pushes right)     %  seaweed / coral (decoration)     H  sunken-ship planks (solid; rope bridge in level 4)

Space (level 8)
@  floating asteroid (drifting platform)                !  laser gate
I  boost pad      M  meteor shower zone                 &  gravity well
J  blob alien     U  mini UFO       +  space urchin
$  space-walk zone (even lower gravity, star-marked border)

Desert (level 9)
z  scorpion       v  vulture        t  tumbleweed      q  quicksand
-  crumbling sandstone platform

City (level 10)
_  road (cars drive here)           Z  crosswalk with pedestrian traffic light
x  wet cement     O  manhole cover  G  crane girder (moving platform)
A  falling cement bag               i  city pigeon
N  hopping traffic cone             S  runaway shopping cart
```

How `#` and some tiles are drawn per level:

- Level 2: `#` is cave rock.
- Level 4: `#` is thick branches and tree trunks.
- Level 5: `#` is a solid white cloud.
- Level 8: `#` is metal space-station floor or grey moon rock.
- Level 9: `s` is a cactus.
- Level 10: `#` is grey pavement and cement, and `B` is cement blocks and crates.

Characters that mean different things in different worlds are resolved by the world id in `level.js` / `entities.js`.

Level flags in `levels.js`: level 7 has `underwater: true` (swimming rules in 6.4), and level 8 has `lowGravity: true` (space rules in 6.5).

**Five magic candies everywhere:** maps drawn with fewer candies get the missing ones placed automatically on the main path when the levels are built (one shortly after the start, one right after each of the first two checkpoints), on top of the hidden candy box and the candy box by the pre-boss checkpoint.

### The ten levels (easiest to hardest)

| # | Name | Theme | Difficulty | Length | Carrots | Coins | Content |
|---|---|---|---|---|---|---|---|
| 1 | Sunny Meadow | Green hills, blue sky, clouds | Easy | ~300 tiles + boss arena | 4 | ~120 | Low boxes, a few hedgehogs, small gaps, **boss: Big Bristle** |
| 2 | Crystal Caves | Underground caves, glowing crystals, mine tracks | Easy–Medium | ~350 tiles + boss arena | 5 | ~140 | Moles, cave bats, rolling rocks, falling stalactites, mine cart platforms, **boss: Digger Duke** |
| 3 | Whispering Forest | Dark green trees, mushrooms | Medium | ~375 tiles + boss arena | 5 | ~160 | Stacked boxes, frogs and crows, wider pits, floating platforms, **boss: Queen Croakia** |
| 4 | Treetop Heights | High up in giant trees, rope bridges, tree houses, sunlight through leaves | Medium+ | ~380 tiles + boss arena | 5 | ~170 | Branches, bending leaf platforms, swinging vines, rope bridges, falling pinecones, squirrels, caterpillars, bees, **boss: Drumbeak** |
| 5 | Cloud Kingdom | High in the sky, walking on clouds, rainbows, sunset colours | Medium–Harder | ~400 tiles + boss arena | 5 | ~180 | Cloud platforms, rain clouds that vanish, spring clouds, wind, cloudlings, sky gulls, sparks, **boss: Grumblecloud** |
| 6 | Snowy Mountain | White and blue, snowy peaks | Harder | ~450 tiles + boss arena | 6 | ~200 | Tall box staircases, spiky plants, crows, cracked-box secret area, **boss: Frostbeak** |
| 7 | Coral Reef | Deep blue sea, colourful coral, seaweed, light rays from above, a sunken ship | Hard | ~450 tiles + boss arena | 5 | ~200 | Swimming, crabs, jellyfish, pufferfish, eels, water currents, air bubbles, **boss: Admiral Octavia** |
| 8 | Starlight Station | Outer space, a space station and the moon, stars and colourful planets | Hard+ | ~475 tiles + boss arena | 5 | ~210 | Low gravity, floating asteroids, laser gates, meteor showers, gravity wells, blob aliens, mini UFOs, space urchins, **boss: Fuzzmo** |
| 9 | Scorching Desert | Sand dunes, pyramids far away, orange sky, heat shimmer | **Very hard** | ~500 tiles + boss arena | 4 | ~220 | Scorpions, vultures, tumbleweeds, cacti, quicksand, crumbling platforms, long jumps over pits, **boss: King Sandclaw** |
| 10 | Cement City | Grey cement city, skyscrapers, crosswalks, a building site with cranes, rooftops | **Extremely hard** | ~550 tiles + boss arena | 4 | ~240 | Busy roads with crosswalks and traffic lights, wet cement, swinging girders, falling cement bags, manholes, rooftop jumps, pigeons, traffic cones, shopping carts, **boss: Brutus Block** |

Each level has a different background colour palette and painted parallax layers (levels 1–3, 5–7, 9: four layers each; levels 4, 8, 10: three mirrored layers from the expansion pack, softened with a light haze so the play layer reads first) (far hills or trees, near bushes; far crystals and rock in level 2, far tree trunks and near leaves in level 4, far clouds and a distant sun in level 5, far rocks and near coral in level 7, stars, planets and the Earth far away in level 8, far skyscrapers and near street lamps in level 10).

### 6.1 Level 2: Crystal Caves (underground, easy–medium)

The player climbs down a ladder into a cave and travels through tunnels lit by glowing crystals. This is the step between the meadow and the forest, so it introduces a few new ideas without being hard.

- **Lighting:** most of the cave is lit by blue, pink and green crystals. A few short tunnels are darker, with a soft circle of light around the player so she can always see a few tiles ahead.
- **Falling stalactites** (`|`): they shake for 0.7 s when the player walks underneath, then drop. Easy to dodge by keeping moving.
- **Mine cart platforms** (`n`): carts that roll slowly back and forth on rails over pits. The player rides them like moving platforms.
- **Rolling rocks** (`R`): roll down sloped tunnels toward the player, with a rumbling sound first.
- **Crystal coins:** some coins are shiny crystals worth 5 coins each, hidden in side tunnels.
- The ceiling is low in places, so jumps are shorter, but pits are few and narrow.

**Boss:** Digger Duke (see 6.8).

### 6.2 Level 4: Treetop Heights (trees, medium+)

The player climbs up out of the Whispering Forest and runs along the tops of giant trees, far above the ground. It is a step up from the forest, with the first real falls (dropping off a branch costs a life), but gentler than the sky level.

- **Branches** (`#`): thick branches are the main path. Tree trunks act as walls, and some have holes to run through.
- **Leaf platforms** (`L`): big leaves that bend down slowly while the player stands on them and spring back up when she leaves. If she stands still for 2 seconds, the leaf bends so far that she slides off, so she has to keep moving.
- **Swinging vines** (`V`, the anchor; the vine hangs 5 tiles): the player grabs a vine automatically by jumping close to it (a generous catch zone). It swings back and forth (about 2 s per swing), and pressing Jump lets go, flying in the direction of the swing with a small boost and keeping the swing speed for a moment. While she hangs on, a dotted line shows where she would land if she let go now. Every vine gap is about 7 tiles: too wide to jump, easy with the vine.
- **Rope bridges** (`H`): long wooden bridges between trees that sway and bounce a little when the player walks on them.
- **Falling pinecones** (`*`): pinecones drop from branches above when the player passes. A rustle in the leaves warns 0.7 s before.
- **Tree houses:** small tree houses with coins and a candy box inside, reached by short ladders of branches.
- **Fairness:** every gap shows a coin trail over it, and the main path never needs Mom's long jump.

**Boss:** Drumbeak (see 6.8).

### 6.3 Level 5: Cloud Kingdom (sky, medium–harder)

The whole level is high in the sky. There is no ground: the player walks and jumps from cloud to cloud. Falling off the clouds costs a life.

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

**Boss:** Grumblecloud (see 6.8).

### 6.4 Level 7: Coral Reef (underwater)

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

**Boss:** Admiral Octavia (see 6.8).

### 6.5 Level 8: Starlight Station (space, hard+)

The player rides a rocket from the reef up into space and lands at a space station near the moon. Every character wears a round glass space helmet in this level. It is harder than the Coral Reef but a little easier than the desert.

**Low gravity** (`lowGravity: true`)

- Jumps go about **1.5× higher** and the player falls more slowly, so she floats through the air.
- Left/right control in the air is a bit weaker, so jumps must be planned.
- In some marked areas outside the station ("space walk zones", shown with a star-shaped border), gravity is even lower.

**Space hazards**

- **Floating asteroids** (`@`): rocks that drift slowly in the air (sideways or up and down) and act as moving platforms, 4 tiles wide. Some spin slowly (visual only).
- **Laser gates** (`!`): pink laser beams across corridors that switch on for 2 seconds and off for 2 seconds. They flicker for 0.5 s before switching on. Touching a laser counts as a hit.
- **Boost pads** (`I`): glowing pads on the floor that launch the player high up, like springs.
- **Meteor showers** (`M`, a row of M marks the zone's width): small meteors fall at an angle in these zones, one every 1.3–2 s near the player. A red glow and a target mark on the ground show where each one will land, 1 second before.
- **Gravity wells** (`&`): small swirling purple holes that gently pull the player toward them when she is close. Touching the middle costs a life, but the pull is weak enough to walk or jump away.
- **Station corridors:** some parts are inside the space station, with low ceilings, laser gates and blinking lights.
- **Fairness:** every danger flickers, glows or is marked before it hits, and the camera always shows the next asteroid before the player jumps.

**Boss:** Fuzzmo (see 6.8).

### 6.6 Level 9: Scorching Desert (very hard)

This is the second-hardest level in the game and should feel like a real challenge for a player who has beaten levels 1–8.

**Desert hazards**

- **Quicksand:** the player slowly sinks while standing in it. She can escape by jumping repeatedly. After being fully sunk for 3 seconds she loses a life.
- **Crumbling sandstone platforms:** they shake for 0.5 s after the player lands, then fall. They reappear after 3 seconds.
- **Long pits:** several jumps need a full run-up and a held jump button.
- **Enemy combinations:** for example scorpions on a narrow ledge while a vulture dives, or tumbleweeds rolling toward the player during a staircase of boxes.

**Fairness rules** (hard, but not unfair)

- Every danger is visible or warned about before it hits (vulture shadows, platforms shaking, tumbleweed dust clouds at the screen edge).
- There are no blind jumps: the camera always shows where the player will land.
- Fewer carrots than level 6 (4 in total), but one is always placed just before the boss arena.

**Boss:** King Sandclaw (see 6.8).

### 6.7 Level 10: Cement City (extremely hard)

The final level, harder than the desert. The player runs through a big grey city: lots of cement, busy streets, crosswalks and a building site. It is meant for players who have beaten all the other levels.

**City hazards**

- **Busy roads and crosswalks** (`_` road, `Z` crosswalk, placed in the street surface): the street level is full of roads where cartoon cars, buses and cement mixer trucks drive past. Each run of road tiles is one crossing with a pedestrian light on both sides. After red, the light only turns green once the last car has left, so green always means an empty road:
  - **Green walking figure:** the cars stop at the crosswalk and the player can cross. It stays green for about 4 seconds.
  - **Flashing green:** the light is about to change, with a fast beeping sound.
  - **Red standing figure:** the cars drive across the crosswalk. Touching a car counts as a hit.
  - Some crosswalks are short (one lane) and some are wide (three lanes), so the player has to start crossing as soon as the light turns green.
  - Cars only drive on road tiles, never on the pavement, so the pavement is always safe to wait on.
- **Wet cement** (`x`): grey, shiny patches of fresh cement. The player sinks a little and moves at half speed, and jumps are much lower while standing in it. Some coins are placed so that the player must cross wet cement to reach them.
- **Building site with cranes:** steel girders (`G`) hang from cranes and swing slowly or move up and down, so they act as moving platforms high above the street.
- **Falling cement bags** (`A`): bags fall from scaffolding when the player passes underneath. A shadow and a creaking sound warn 1 second before.
- **Manholes** (`O`): manhole covers that pop up into the air every few seconds with a puff of steam. Standing on one launches the player up like a spring, but touching it from the side while it pops is a hit.
- **Rooftop run:** the last third of the level is on the roofs of buildings, with long jumps between them, air-conditioning boxes to jump over and pigeons diving in.
- **Enemy combinations:** for example a shopping cart rolling toward the player while she waits at a red light, or pigeons diving while she crosses a swinging girder.

**Fairness rules** (extremely hard, but still fair)

- Every danger is visible or warned about before it hits (traffic lights, shadows, creaking, steam puffs).
- The camera always shows the next roof before the player has to jump.
- Only 4 carrots in the whole level, but one is always placed just before the boss arena, together with the candy box.
- Even on the hardest jumps, the main path does not need Mom's long jump.

**Boss:** Brutus Block (see 6.8).

### 6.8 Bosses

**Every level ends with a boss fight.** The bosses get harder level by level, so the first one is a gentle introduction and Brutus Block in Cement City is the final, toughest challenge.

#### Shared boss rules (all ten bosses)

- **No flagpole until the boss is beaten.** The level map ends in a boss arena instead.
- **Checkpoint before the arena:** every level has a checkpoint right before the arena, plus a carrot surprise box and a candy surprise box next to it.
- **Arena:** when the player passes the `K` tile, the camera locks and walls rise on both sides. The arena is one screen wide, with 1–2 floating platforms (their positions depend on the boss).
- **Intro:** the boss appears with a short 2-second entrance (roar or jump in) and its name on screen. The player can't move during the intro and can't be hurt.
- **Health bar:** a boss health bar with the boss's name replaces the level name at the top of the screen.
- **Telegraphed attacks:** every attack has a clear warning (animation, sound, shadow or shake) before it hits.
- **Weak moment:** each boss has a moment after one of its attacks when it is **dizzy or tired for about 2 seconds** (longer for some bosses, see below), with stars circling its head. Jumping on its head then removes **1 hit point**.
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
| 4 Treetop Heights | Drumbeak, a giant red-crested woodpecker | Medium+ | 4 | 2 | 32 |
| 5 Cloud Kingdom | Grumblecloud, a huge angry storm cloud | Medium–Harder | 4 | 3 | 35 |
| 6 Snowy Mountain | Frostbeak, a giant snow owl | Harder | 5 | 2 | 40 |
| 7 Coral Reef | Admiral Octavia, a giant purple octopus in an admiral's hat | Hard | 5 | 3 | 45 |
| 8 Starlight Station | Fuzzmo, a giant fluffy lime-green space creature | Hard+ | 5 | 3 | 50 |
| 9 Scorching Desert | King Sandclaw, a giant sand scorpion with a golden crown | Very hard | 6 | 3 | 55 |
| 10 Cement City | Brutus Block, a huge angry cement block | Extremely hard | 7 | 3 | 60 |

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
| Tongue grab (phase 2) | Opens her mouth and her eyes glow | Her tongue shoots straight out across the arena at the player's height | Jump over it, duck, or stand on a platform |
| Tadpole call (phase 2) | Croaks loudly | 2 small frogs hop into the arena | Stomp them, or avoid them |

- **Weak moment:** after a big jump she is stuck in the mud for 2 seconds.
- **Phases:** phase 1 at 4–3 HP, phase 2 at 2–1 HP (faster jumps, adds tongue grab and tadpole call).
- **Arena:** two lily-pad platforms.

#### Boss 4: Drumbeak (Treetop Heights)

A giant woodpecker with a bright red crest, a black-and-white striped body and a long, strong beak. He lives in the biggest tree of all. The arena is a wide, flat branch floor between two huge tree trunks, with two leaf platforms above.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Drum roll | He drums fast on a tree trunk ("rat-a-tat-tat") and the branches shake | Bark chips and leaves fall from above in 4–5 spots (shadows show where) | Stand where there is no shadow |
| Peck dash | He pulls his head back and his eyes narrow for 1 s | Flies straight across the arena at head height, beak first, and pecks into the trunk on the other side | Duck under him, or jump onto a leaf platform |
| Dive peck (phase 2) | He flies up out of sight, and a red target mark appears on the floor under the player | Dives straight down beak first where the mark was | Run away from the mark |
| Acorn drop (phase 2) | He flaps hard above the arena | Drops 3 acorns that bounce along the branch floor | Jump over them |

- **Weak moment:** after a peck dash or a dive peck, his beak gets **stuck** in the wood. He flaps and wiggles for 2.5 seconds, and jumping on his back then removes 1 hit point.
- **Phases:** phase 1 at 4–3 HP (drum roll and peck dash), phase 2 at 2–1 HP (faster, adds dive peck and acorn drop).
- **Victory:** he pulls his beak free, shrinks into a tiny, friendly woodpecker and flies off to his nest, and the flagpole rises out of a knothole.

#### Boss 5: Grumblecloud (Cloud Kingdom)

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

#### Boss 6: Frostbeak (Snowy Mountain)

A giant white snow owl that flies above an icy mountain top. Parts of the arena floor are slippery ice.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Snowball drop | Hoots and flaps hard | Drops 3–4 snowballs (shadows show where) | Stand away from the shadows |
| Dive swoop | Screeches, then hovers still for 1 s at the edge of the screen | Swoops diagonally down across the arena and lands in a snowdrift | Jump or step out of the way |
| Icy wind (phase 2) | Spreads her wings wide | Blows the player slowly toward the edge of the arena for 3 seconds | Run against the wind |

- **Weak moment:** after a dive swoop she is stuck in the snowdrift for 2 seconds.
- **Phases:** phase 1 at 5–3 HP, phase 2 at 2–1 HP (faster swoops, more snowballs, adds icy wind).
- **Arena:** two floating ice platforms. The floor is slippery ice, so the player slides a bit more than normal.

#### Boss 7: Admiral Octavia (Coral Reef)

A giant purple octopus wearing a small admiral's hat, living in the wreck of an old ship. The arena is underwater, so the swimming rules apply. The air meter is paused during the fight so the player can concentrate on the boss.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Tentacle slam | A line of bubbles rises from the sea floor for 1 s | A tentacle shoots up from below where the bubbles were | Swim away from the bubbles |
| Ink cloud (phase 2+) | She puffs up and turns dark | Sprays a cloud of ink that darkens half the arena for 4 seconds | Stay on the clear side |
| Shell spin (phase 3) | She grabs shells with 3 tentacles | Throws 3 spinning shells that travel slowly across the arena | Swim over or under them, or duck on the sea floor |

- **Weak moment:** after a tentacle slam, the tentacle gets stuck in the sand and she is dizzy for **4 seconds**, longer than any other boss, because swimming down onto her takes more time than jumping.
- **Phases:** phase 1 at 5–4 HP, phase 2 at 3–2 HP (faster slams, adds ink cloud), phase 3 at 1 HP (two tentacle slams at once, adds shell spin).
- **Arena:** two floating rock platforms and a current that slowly pushes toward the middle.

#### Boss 8: Fuzzmo (Starlight Station)

A huge, round, super-fluffy space creature about the size of a car. Its long, soft fur is bright lime green with teal-blue streaks, and it stands out in every direction like it has just been charged with static electricity. It has two big pointy fluffy ears, two large round shiny black eyes, two short wobbly antennae with little glowing balls on the tips, a cheeky wide grin, and short stubby fluffy legs. It looks cute and a bit silly rather than scary, but it is very bouncy and very mischievous.

Draw it as an original character for this game: a fluffy ball of fur with ears, eyes, antennae and a grin, with fur drawn as many short wavy lines in lime green and teal.

The arena is a round glass dome on the moon, with low gravity, a moon-rock floor and two floating metal platforms.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Fuzz bounce | It squishes down flat and its fur puffs out for 1 s, and a shadow appears under the player | Bounces high (low gravity) and lands where the shadow was, with a soft "boing" shockwave along the floor | Move away from the shadow, then jump over the shockwave |
| Static sparks (phase 2+) | It rubs its fur and crackles, and its antennae glow | 3–4 little blue spark balls float slowly toward the player for 4 seconds | Jump or move away from them, or shoot them |
| Fur tumble | It wobbles and rolls up into a perfect fur ball | Rolls fast across the arena and bumps against the dome wall | Jump over it, or onto a platform |
| Star sneeze (phase 3) | Its nose twitches: "ah… ah… ah…" | Sneezes 5 little stars that spread out in a fan and bounce around the arena | Duck, or find a gap between the stars |

- **Weak moment:** after a fur tumble it bumps into the dome wall and sits dizzy for 2.5 seconds with its fur all flat and messy. Jumping on its head then removes 1 hit point (the low gravity makes the player bounce extra high afterwards).
- **Phases:** phase 1 at 5–4 HP (fuzz bounce and fur tumble), phase 2 at 3–2 HP (faster, adds static sparks), phase 3 at 1 HP (adds star sneeze).
- **Victory:** it shrinks into a tiny fluffy fuzzball, giggles, jumps into a little flying saucer and zooms away. Coins float down slowly in the low gravity, and the flagpole rises out of the moon rock.

#### Boss 9: King Sandclaw (Scorching Desert)

A huge sand scorpion with a golden crown. He is the second-hardest boss in the game. The arena has two floating stone platforms and sand walls.

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

#### Boss 10: Brutus Block (Cement City)

A huge, angry grey cement block with thick cracked eyebrows, little stubby arms and a grumpy mouth. He lives on a building site in the middle of the city and is the final and hardest boss in the game. The arena is a fenced building site with cement floor and two steel girder platforms hanging from a crane.

| Attack | Warning | What happens | How to avoid |
|---|---|---|---|
| Block slam | He crouches and his eyebrows go down for 1 s, and a shadow appears under the player | He jumps high and slams down where the player was. A shockwave runs along the floor on both sides | Move away from the shadow, then jump over the shockwave |
| Tumble roll | He wobbles back and forth for 1 s | He tips over and tumbles end-over-end across the arena, crashing into the fence | Jump onto a girder platform |
| Rubble throw | He breaks off chunks of himself | Throws 3 cement chunks in arcs (shadows show where they land) | Stand away from the shadows |
| Wet cement spill (phase 2+) | He shakes and grey drips run down his sides | Leaves 2–3 puddles of wet cement on the floor for 5 seconds, which slow the player down | Avoid the puddles, or jump over them |
| Pebble friends (phase 3) | He roars and cracks appear all over him | 2 small, hopping cement blocks join the fight | Stomp them, or avoid them |

- **Weak moment:** after a tumble roll he crashes into the fence, cracks a little and is dizzy for 2 seconds (stars and dust circle his head). Jumping on top of him then removes 1 hit point.
- **Phases:**
  - Phase 1 (7–6 HP): block slam, tumble roll and rubble throw.
  - Phase 2 (5–3 HP): faster, and adds the wet cement spill.
  - Phase 3 (2–1 HP): fastest, with two block slams in a row, and adds pebble friends.
  - He roars and more cracks appear at each phase change.
- **Victory:** he crumbles into a pile of rubble, out of which a tiny, friendly cement brick hops away. 60 coins burst out, the fence falls, and the goal flagpole rises out of a manhole.

---

## 7. HUD

Top bar:

- **Left:** hearts (lives).
- **Center:** level name (replaced by the boss health bar during the boss fight).
- **Right:** coin icon with count, and elapsed time (or the countdown in Time challenge mode).

HUD style: rounded semi-transparent dark panels, gold star coin icon, glossy red hearts, white text with a soft outline, the bundled rounded font. During a boss fight the health bar has the boss's portrait (painted portraits for Drumbeak, Fuzzmo and Brutus Block; the idle frame for the others), gold-framed, with one segment per hit point and three dots for shot hits.

A small carrot icon shows when the player is currently big. A candy icon with her shot (star, bubble, boomerang or flame) shows when she has the magic candy power and can shoot. In level 7, the **air meter** (10 bubbles) is shown under the hearts.

---

## 8. Code structure

```
index.html
style.css
art/
  reference/        – style reference pictures (not loaded)
  characters/ enemies/ bosses/ tiles/ backgrounds/ items/ pip/ fonts/ ui/   – original painted art
  sister-dash-expansion/   – expansion art pack (treetop, space, city, pink outfit, helmets, traffic, UI badges)
    expansion-manifest.js  – frame data as a plain global (EXPANSION_ART)
js/
  manifest.js       – original art files and sprite-sheet frame data (plain global)
  assets.js         – image loading, loading progress, painted/fallback switch (F2), drawFrame / drawNamed / drawTile
  audio.js          – Web Audio beeps and mute
  input.js          – keyboard state and clicks
  storage.js        – best scores per world, settings, seen hints
  quality.js        – High / Medium / Low, render scale, particles, auto-downgrade
  timer.js          – elapsed time and Time challenge countdown
  render.js         – drawing helpers, code-drawn fallback art, tiles, parallax, world renderer, HUD
  level.js          – world ids (TH), ASCII parsing, tile collision, camera
  expansion.js      – registers the expansion pack in the manifest
  render-expansion.js – art for treetop / space / city, new enemies and bosses, helmet, guide dots
  levels.js         – the ten level maps (by world), level order, flags, time limits, candy top-up
  entities.js       – coins, carrots, candies, checkpoints, flag, stalactites/pinecones/cement bags, mine carts, clouds, crumbling platforms, air vents, particles
  enemies.js        – shared enemy code and the original enemies
  projectiles.js    – shared bouncing shot with four looks
  swimming.js       – underwater physics, air meter, currents
  treetops.js       – vines, leaf platforms, bee hives, squirrel / caterpillar / bee
  space.js          – asteroids, laser gates, boost pads, meteor showers, gravity wells, blob alien / mini UFO / urchin
  city.js           – roads with pedestrian lights and traffic, manholes, crane girders, pigeon / cone / cart / pebble friend
  player.js         – physics, states, small/big, ducking, character stats, long jump, low gravity, wet cement, vine hook-up
  pip.js            – helper drone follow, hints, reactions
  boss.js           – shared boss engine: arena lock, intro, health, weak moment, victory, reusable hazards
  bosses.js         – the seven original bosses
  bosses-expansion.js – Drumbeak, Fuzzmo, Brutus Block and their hazards
  scenes.js         – loading, title, character select, level select, play + pause, level complete, game over
  main.js           – boot, fixed-timestep loop, scene manager, screen transitions
```

Debug shortcuts via the URL hash: `index.html#level=4&char=mom` jumps straight into a level, `#scene=levels`, `#fallback` starts in code-drawn mode, `#log` shows errors on the page.

---

## 9. Build status

The original seven levels were already built (old milestones 1–20). The merge added, in this order:

1. World ids (`TH`) separate from play order; maps, art and saves keyed by world; ten-level order and new time limits.
2. Expansion art pack registered (`expansion.js`), mirrored 3-layer backgrounds, new tilesets, props, effects, traffic, pink outfit, helmets, UI badges.
3. Quality setting with render scale up to 1920×1080, particle/glow/shake reduction, auto-downgrade, iris transitions.
4. Treetop Heights mechanics, enemies and map; Drumbeak.
5. Starlight Station mechanics, enemies and map; Fuzzmo.
6. Cement City mechanics, enemies and map; Brutus Block.
7. Five candies in every level; level select in two rows of five; outfit choice; pause options; boss portraits; Pip hints for all new things.
8. Verification: every level builds and runs; a scripted player clears every section of the three new levels with Older Sister, Dad and Mom; every boss is beaten by stomps alone and raises the flag; every new boss attack runs in its last phase.

---

## 10. Acceptance criteria

- [ ] The game starts by opening `index.html` in a browser, with no install and no server.
- [ ] The player can pick one of four characters: two blonde sisters, Dad and Mom (both brown-haired grown-ups), all visibly distinct and named on the character select screen.
- [ ] The younger sister wears a pink t-shirt and black pants by default; the purple-hoodie outfit can be picked on the character screen.
- [ ] With **all** painted assets missing, the game still runs fully using code-drawn fallback art. F2 switches between painted and fallback art.
- [ ] Pip the helper drone follows the player, gives first-time hints (also for the new enemies and hazards), and can be switched off.
- [ ] Holding ↓ makes the character duck to about half height, and ducking dodges head-height attacks.
- [ ] Mom jumps noticeably further than the other characters, and each level has optional bonus areas only she can reach.
- [ ] The player can pick any of the 10 levels from the level select screen, ordered from easiest to hardest.
- [ ] The player can run, jump (variable height) and land on boxes and platforms.
- [ ] Coins can be collected and the count is shown in the HUD.
- [ ] A magic carrot only makes the player big. Getting hit while big makes her small, and getting hit while small costs a life.
- [ ] Enemies can be defeated by stomping (except the unstompable ones) and hurt the player on side contact.
- [ ] Shooting is only possible after finding a magic candy, and the power is lost when hit. Every level has 5 candies, spread out through the level, and one of them is just before the boss.
- [ ] All four characters can shoot with the candy power. The shots look different (stars, bubbles, boomerangs, fireballs) but all bounce along the ground in the same way, and defeat any enemy.
- [ ] Level 2 is an underground cave level, between level 1 and level 3 in difficulty.
- [ ] Level 4 is a treetop level with branches, vines and rope bridges, between Whispering Forest and Cloud Kingdom in difficulty.
- [ ] Level 5 is a sky level where the player walks on clouds.
- [ ] Level 7 is an underwater level with swimming, an air meter and air bubble vents.
- [ ] Level 8 is a space level with low gravity, between Coral Reef and Scorching Desert in difficulty.
- [ ] With Time challenge ON, running out of time costs one life and gives 1:00 extra time. With it OFF, there is no time limit.
- [ ] Touching the flag completes the level and shows the coin score.
- [ ] Every level can be completed with all four characters, with and without Time challenge.
- [ ] Level 9 is a desert level that is clearly harder than level 8.
- [ ] Level 10 is a city level with lots of cement and crosswalks with traffic lights, and is clearly harder than level 9.
- [ ] Cars only drive across a crosswalk when its pedestrian light is red.
- [ ] Every level ends with its own boss (Big Bristle, Digger Duke, Queen Croakia, Drumbeak, Grumblecloud, Frostbeak, Admiral Octavia, Fuzzmo, King Sandclaw, Brutus Block), and each boss is harder than the one before.
- [ ] The Treetop Heights boss is Drumbeak, a woodpecker whose beak gets stuck in the wood after his attacks.
- [ ] The Starlight Station boss is Fuzzmo, a big fluffy lime-green space creature drawn as an original character.
- [ ] The Cloud Kingdom boss is Grumblecloud, an angry storm cloud, and the Cement City boss is Brutus Block, a big angry cement block.
- [ ] Admiral Octavia stays dizzy for 4 seconds after a tentacle slam.
- [ ] Every boss has telegraphed attacks, a health bar, and can be beaten by stomping alone.
- [ ] The goal flag in each level only appears after that level's boss is defeated.
- [ ] Each level has the number of carrots and roughly the number of coins listed in section 6, plus 5 magic candies.
- [ ] Runs smoothly at 60 fps on a normal laptop on the High quality setting.
- [ ] Gameplay values (speeds, jump heights, hit points, timings, time limits) are the same on every quality setting and in painted and fallback mode.
- [ ] All characters, enemies, bosses, tiles, backgrounds and items use painted art when it is present (section 12), and a styled code-drawn version otherwise.
- [ ] Best scores saved before the merge still show on the right worlds after the renumbering.
- [ ] The game looks sharp (no blurry or blocky edges) on a Retina/high-resolution screen.
- [ ] Every level has at least 3 parallax background layers and its own particle effects.
- [ ] The game still works by opening `index.html`, with no downloads and no server (painted images load from `file://`).
- [ ] Graphics High / Medium / Low can be changed in the pause menu, and the game steps down by itself when it runs below 50 fps.

---

## 11. Out of scope for v1 (possible later)

- Two-player mode (two characters at once)
- Touch controls for iPad or phone
- Level editor
- Music tracks
- More power-ups (for example a golden carrot that gives temporary invincibility)

---

## 12. Graphics

### 12.1 Art style

- **Style:** bright, smooth **cartoon vector art**, like a modern mobile or Nintendo-style platformer, but with **original designs only**. No characters, enemies or art copied from existing games or toys.
- **Shapes:** soft rounded shapes, clean dark outlines (2–4 px at 1080p, slightly darker shade of the fill colour rather than black), and simple two-tone shading (a lighter highlight on top and a darker shadow underneath).
- **Colours:** rich, saturated colours with a clear palette per level (see 12.4). Characters and enemies always stand out from the background: backgrounds are a little softer and less saturated than the foreground.
- **Readability first:** dangerous things (enemies, spikes, lasers, cars) always have strong outlines and warm or contrasting colours, and things that are safe to stand on are always clearly solid. Nice graphics must never make the game harder to read.

### 12.2 How the art is made

- **Painted assets** (`art/`) are made outside the game with an image generator or by hand, using the reference pictures and the style prompt below, then cleaned up. Characters and enemies are authored at 4× game size, bosses at 2×, tiles at 128×128 per 32 px tile, backgrounds as wide tileable layers.
- **Code-drawn fallback** (`render.js`, `render-expansion.js`) draws each thing with canvas shapes in the same colours and silhouette: layered gradients, a highlight blob and a dark warm outline (`#3A2A20` at 70 %, never pure black).
- `assets.js` loads everything listed in the manifests during the loading screen; every draw call asks "is the painted sprite loaded?" and otherwise uses the fallback. Prop and UI sheets are drawn with a small inset so neighbouring cells never bleed in.
- Painted sheets face right (bosses face left) and are mirrored on direction changes; collision boxes are set in code, never from the painted outlines.
- Style prompt for new painted art (add the subject):

> Stylised 3D animated-film style, soft painterly shading, warm golden light from the upper left, cool blue sky fill, saturated natural colours, rounded friendly shapes. [Subject]. Full body, side view facing right, transparent background, clean edges, no text.

### 12.3 Characters

| | Older sister | Younger sister | Dad | Mom |
|---|---|---|---|---|
| Hair | Long blonde ponytail that swings when running and bounces on landing | Blonde pigtails that flop up and down | Short brown hair with a small quiff | Long brown hair with a red hair band, flowing behind her when she runs and jumps |
| Clothes | Blue top with a small star print, light jeans, white sneakers | Pink t-shirt with a heart, black pants, pink sneakers | Green jacket over a grey t-shirt, jeans, brown boots | Orange jacket, dark blue jeans, white sneakers |
| Face | Big friendly eyes that blink, small smile, rosy cheeks | Extra big eyes, a cheeky grin | Friendly smile and eyebrows that move | Warm smile, eyes that narrow in concentration on long jumps |
| Victory pose | Fist in the air | Jumps up and down clapping | Thumbs up and a wink | Twirl and a wave |

All characters:

- **Run:** 8-frame cycle with arm swing and a little bounce. Small dust puffs at the feet.
- **Jump:** squash on take-off, stretch while rising, a "floaty" frame at the top, and a squash with dust on landing.
- **Idle:** breathing, blinking every few seconds, and after 5 seconds of standing still a short idle animation (looking around, stretching, checking a watch for Dad).
- **Big form:** the same character drawn larger with a little more detail, never just scaled up.
- **Candy glow:** a soft animated outline glow in the shot's colour, with tiny sparkles drifting off.
- **Hurt:** a quick red flash, knock-back, and then blinking while invulnerable.
- **Space helmet** (level 8): round glass bubble with a light reflection that moves as she moves.

### 12.4 Levels

Every level gets **3–5 parallax layers** (far sky, far scenery, middle scenery, near decoration, and an optional foreground layer that passes in front of the player now and then), animated details and its own particles.

| Level | Look and atmosphere | Animated details and particles |
|---|---|---|
| 1 Sunny Meadow | Bright blue sky, soft clouds, rolling green hills, flowers, wooden fences | Swaying grass and flowers, butterflies, drifting clouds, sun glow |
| 2 Crystal Caves | Dark purple-blue cave, glowing pink/blue/green crystals, wooden mine supports | Crystals pulse with light and cast coloured glow, dripping water, dust motes, a soft light circle around the player in dark tunnels |
| 3 Whispering Forest | Deep green trees, giant mushrooms, ferns, soft light beams | Light rays through the trees, falling leaves, fireflies, swaying ferns |
| 4 Treetop Heights | Golden sunlight through leaves, huge tree trunks, rope bridges, tree houses | Leaves rustling and falling, birds in the distance, swinging vines and bridges with physics-like motion |
| 5 Cloud Kingdom | Sunset sky in pink, orange and purple, fluffy clouds, rainbows | Clouds slowly puffing and drifting, rainbow shimmer, wind lines, raindrops from rain clouds, sparkles on spring clouds |
| 6 Snowy Mountain | Cold blue and white, snowy peaks, icy ledges, pine trees with snow | Falling snow, breath puffs from characters, ice glints, snow puffs on landing |
| 7 Coral Reef | Deep blue water, colourful coral, seaweed, a sunken ship | Light rays from the surface, caustic light patterns moving over the sea floor, bubbles, swaying seaweed, small background fish, a slight wavy effect on far layers |
| 8 Starlight Station | Dark space with stars, colourful planets, the Earth far away, a metal space station and grey moon rock | Twinkling stars, slowly spinning planets, blinking station lights, glowing laser beams, meteor trails, glow around boost pads |
| 9 Scorching Desert | Orange-yellow sky, sand dunes, pyramids far away, cacti | Heat shimmer in the air, blowing sand, tumbleweed dust, a hot sun glow |
| 10 Cement City | Grey cement city with colourful details: shop signs, traffic lights, zebra crossings, cranes, rooftops at sunset | Moving traffic with headlights, blinking pedestrian lights, steam from manholes, pigeons flapping, swinging crane girders, lit windows in the skyscrapers |

### 12.5 Effects and particles

- **Coins:** spinning with a glint; when collected they fly up to the HUD counter with a sparkle trail.
- **Carrots and candies:** float and glow; a burst of sparkles and a ring of light when collected.
- **Stomps:** a squash of the enemy, a cartoon "poof" cloud and a few stars.
- **Shots:** sparkle stars leave a glitter trail, bubbles shine and wobble, boomerangs spin with motion lines, fireballs flicker with a flame trail and small embers.
- **Boxes:** bump animation when hit; cracked boxes break into pieces that fall with gravity.
- **Water** (level 7): bubbles from the player when swimming, splash at the start, and a soft blue tint.
- **Screen shake:** small shake on boss slams, explosions and big landings (can be turned off in the pause menu).
- **Warnings:** shadows, flickers and target marks from this spec are drawn clearly with soft pulsing glows, so they are easy to see.
- **Transitions:** a circle-wipe or iris transition between screens and when respawning.

### 12.6 Enemies and bosses

- Every enemy has at least an idle/move animation, a warning animation where this spec has one, and a defeat animation.
- **Bosses** are big (2–4 times the player's height), richly detailed and full of personality: an intro animation, separate animations for each attack's warning and attack, a dizzy animation with circling stars, a hit flash with a funny face, a phase-change animation, and the defeat animation described in 6.8.
- Fuzzmo (level 8) gets fluffy fur drawn as many layered strands that move gently, and fur that stands up during static sparks.

### 12.7 Menus and HUD

- **Title screen:** animated scene with all four characters running across a meadow, the game logo with a soft shine moving across it, and "Press Enter / Click to start" pulsing gently.
- **Character select:** each character shown large with their idle animation; the selected one plays their victory pose.
- **Level select:** illustrated cards with a small picture of each level and its boss, with a crown and best time on beaten levels.
- **HUD:** rounded semi-transparent panels; hearts, coins, carrot and candy icons drawn in the same style as the game; the boss health bar has the boss's portrait.
- **Fonts:** Fredoka, bundled in `art/fonts/` (SIL Open Font License) and loaded with `@font-face`, with a rounded system font as fallback, so the game works offline.

### 12.8 Performance

Keeps the cheap-to-draw approach of the original game and adds the HQ quality levels.

- Target: steady 60 fps on a normal laptop on **High**.
- **Game grid stays 960×540**: all physics, maps and collisions are unchanged; only the drawing resolution changes.
- **Render scale by quality:** High renders at up to 2× (1920×1080, sharp on Retina), Medium up to 1.5×, Low 1×. The scale also never exceeds what the screen can show (window size × devicePixelRatio).
- **Medium** halves particles and turns off far-layer drifting. **Low** turns off particles (score texts stay), glow and screen shake, and front-layer weather. Screen shake can also be switched off on its own.
- **Auto-downgrade:** if the game runs below 50 fps for 3 seconds in a row while playing, it steps down one level (High → Medium → Low) and shows a short message. Choosing a level in the pause menu turns this off.
- **Caches instead of redrawing:** fallback tiles are pre-rendered into one atlas per world; fallback backgrounds are pre-rendered layers; painted background layers are pre-scaled once to screen height at the current render scale (mirrored copies for the expansion layers) instead of scaling 4K images every frame; small sprites are cached.
- **Fixed timestep** with at most 8 catch-up steps, so a slow frame never makes the game run in slow motion or explode.
- **Culling:** only visible tiles are drawn; entities and ground enemies far off-screen are not updated; particles are capped at 600.
- No `fetch`, no JSON, no external downloads; everything loads from local files.
