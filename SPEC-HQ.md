# Sister Dash HQ – Game Specification

**Sister Dash HQ is the same game as the standard Sister Dash, with much better graphics.** Everything about how the game plays (characters, controls, levels, enemies, bosses, power-ups, coins, lives, time challenge) is identical to the standard version and described in sections 2–7 below. What is new is the look: detailed vector art, smooth animation, lighting, particles and effects. Section 12 describes the HQ graphics.

**Rule for keeping the two versions in sync:** gameplay values (speeds, jump heights, hit points, timings, level maps, time limits) must be the same as in the standard version. If the standard `SPEC.md` changes, the same gameplay change applies here. Only the graphics, effects and art files differ.

A 2D side-scrolling platform game that runs in the browser. You play as one of four characters (an older sister, a younger sister, Dad or Mom) and run from left to right: jump over boxes, get past the opposition, collect coins, beat the boss and grab the flag at the end of each level.

---

## 1. Technical constraints

| Item | Decision |
|---|---|
| Platform | Desktop web browser (Chrome, Safari, Edge) |
| Tech | Plain HTML5 Canvas + JavaScript. No frameworks, no build step |
| Files | `index.html`, `style.css`, `js/*.js` loaded with plain `<script>` tags (no ES modules), so the game works by double-clicking `index.html` |
| Graphics | High-quality vector art: every character, enemy, boss, tile and background is an SVG sprite authored in code and stored in `js/art/*.js`, rendered to the canvas. No external image downloads, so the game still works offline and from `index.html`. See section 12 |
| Sound | Optional in v1. Short beeps made with the Web Audio API, with a mute toggle |
| Resolution | Logical canvas 1920×1080 (16:9), scaled to fit the window, and rendered at the screen's pixel density (`devicePixelRatio`) so it looks sharp on Retina screens. Gameplay uses the same tile grid as the standard version (one tile = 64×64 logical px, which is the standard 32 px tile at double resolution) |
| Frame rate | 60 fps with a fixed-timestep update loop. Graphics quality setting (High / Medium / Low) in the pause menu, defaulting to High, that reduces particles and effects if the computer is slow |
| Persistence | Best score per level stored in `localStorage` (wrapped in try/catch) |

---

## 2. Game flow

```
Title screen → Character select → Level select → Play level → Level complete / Game over → back to Level select
```

- **Title screen:** game name and "Press Enter / Click to start".
- **Character select:** all four characters shown side by side, with a one-line description of each one's special ability and what they shoot. Choose with ←/→ and confirm with Enter, or click one.
- **Level select:** ten level cards, ordered from easiest to hardest, showing name, difficulty, best coin score, best time, and a checkmark if completed. Show them in two rows of five. All ten levels are unlocked from the start. Every card shows the level's boss, and gets a crown icon once that boss has been beaten. Level 9 is marked **"Very hard!"** with a small skull-and-sun icon, and level 10 is marked **"Extremely hard!"** with a skull-and-skyscraper icon.
- **Time challenge toggle:** on the level select screen the player can switch **Time challenge** ON or OFF (press T or click the stopwatch button). It is OFF by default. See 5.7.
- **Pause:** press P or Esc. Options are Resume, Restart level, and Back to level select.

---

## 3. Characters

Both sisters have **blonde hair**. Dad and Mom have **brown hair**. The four characters look clearly different and play slightly differently.

| | Older sister | Younger sister | Dad | Mom |
|---|---|---|---|---|
| Look | Long blonde hair in a ponytail, blue top | Blonde pigtails, **pink t-shirt, black pants** | Grown man, tall, short brown hair, green jacket, jeans | Grown woman, tall, long brown hair with a red hair band, orange jacket, dark blue jeans |
| Height (small form) | Medium | Shortest | Tallest (still fits under 2-tile gaps) | Tall (same as Dad) |
| Run speed | Slightly faster (+10%) | Standard | Standard | Standard |
| Jump | Standard | Slightly higher (+10%) | Slightly lower (−5%) | **Jumps further than everyone else** (see below) |
| Special | – | – | Can break cracked boxes even when small | **Long jump** |
| Shoots (with magic candy) | Sparkle stars | Bubbles | Boomerangs | Fireballs |

**Mom's long jump:** her jumps carry about **25% further** horizontally than the other characters' (faster air speed and slightly longer hang time), at normal height. Each level has 1–2 optional **bonus coin areas** across wide gaps that only she can reach. These are always optional: the main path must be completable by every character.

The differences should be noticeable but small. Every level must be completable with any of the four characters.

### Animations (HQ)

Idle (breathing, blinking, hair moving), run (8-frame cycle), jump (take-off, rise, fall, landing squash), duck, swim (level 7), vine swing (level 4), throw/shoot, hurt (flash and knock-back), grow/shrink (stretchy pop with sparkles), victory (character-specific cheer by the flag). See section 12.3. In level 8 (space), every character wears a round glass space helmet.

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

---

## 6. Levels

Levels are tile-based (tile = 32×32 px) and defined as **ASCII maps** in `js/levels.js`, so they are easy to edit. Each level is roughly 300–550 tiles wide (about 2–4 minutes of play) and scrolls horizontally, with the camera following the player.

### Tile legend

```
.  empty          #  ground         B  wooden box      ?  surprise box (coin)
C  surprise box (carrot)            X  cracked box     o  coin
D  surprise box (magic candy)       d  magic candy
c  magic carrot   h  hedgehog       f  frog            w  crow
s  spiky plant    k  checkpoint     F  goal flag       P  player start
K  boss arena start (boss spawns here)

Caves (level 2)
m  mole hole      b  cave bat       R  rolling rock start
|  loose stalactite (falls)         n  mine cart platform (moves on rails)

Treetops (level 4)
L  leaf platform (bends down)       V  hanging vine (swing on it)
H  rope bridge (sways)              *  pinecone drop spot
Q  squirrel       E  caterpillar    Y  bee hive (bees fly around it)

Sky (level 5)
~  thin cloud (one-way)             g  rain cloud (vanishes)
^  spring cloud   =  moving cloud   W  wind zone
l  cloudling      u  sky gull       y  spark

Underwater (level 7)
r  crab           j  jellyfish      p  pufferfish      e  eel hole
a  air bubble vent                  <  water current (pushes left)
>  water current (pushes right)     %  seaweed / coral (decoration)

Space (level 8)
@  floating asteroid (drifting platform)                !  laser gate
I  boost pad      M  meteor shower zone                 &  gravity well
J  blob alien     U  mini UFO       +  space urchin

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

Level flags in `levels.js`: level 7 has `underwater: true` (swimming rules in 6.4), and level 8 has `lowGravity: true` (space rules in 6.5).

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

Each level has a different background color palette and simple parallax layers (far hills or trees, near bushes; far crystals and rock in level 2, far tree trunks and near leaves in level 4, far clouds and a distant sun in level 5, far rocks and near coral in level 7, stars, planets and the Earth far away in level 8, far skyscrapers and near street lamps in level 10).

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
- **Swinging vines** (`V`): the player grabs a vine automatically by jumping into it. It swings back and forth, and pressing Jump lets go, flying in the direction of the swing. A dotted line shows where the next vine or branch is.
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

- **Floating asteroids** (`@`): rocks that drift slowly in the air and act as moving platforms. Some spin slowly, so the player has to stay on top.
- **Laser gates** (`!`): pink laser beams across corridors that switch on for 2 seconds and off for 2 seconds. They flicker for 0.5 s before switching on. Touching a laser counts as a hit.
- **Boost pads** (`I`): glowing pads on the floor that launch the player high up, like springs.
- **Meteor showers** (`M`): small meteors fall at an angle in these zones. A red glow and a target mark on the ground show where each one will land, 1 second before.
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

- **Busy roads and crosswalks** (`_` road, `Z` crosswalk): the street level is full of roads where cartoon cars, buses and cement mixer trucks drive past. The only safe way across is a **crosswalk** (zebra stripes) with a pedestrian traffic light:
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

A small carrot icon shows when the player is currently big. A candy icon with her shot (star, bubble, boomerang or flame) shows when she has the magic candy power and can shoot. In level 7, the **air meter** (10 bubbles) is shown under the hearts.

---

## 8. Code structure

```
index.html
style.css
js/
  main.js        – boot, game loop, scene manager
  input.js       – keyboard state
  scenes.js      – title, character select, level select, play, results, game over
  player.js      – physics, states, small/big, ducking, character stats, long jump, vine swinging
  swimming.js    – underwater physics, air meter, currents
  space.js       – low gravity, gravity wells, laser gates, meteor showers
  projectiles.js – shared bouncing-shot logic, with a different look per character
  enemies.js     – enemy types and AI
  boss.js        – shared boss engine: arena lock, intro, health bar, phases, victory
  bosses.js      – the ten bosses and their attacks
  level.js       – ASCII parsing, tile collision, camera
  levels.js      – the ten level maps, level flags and time limits
  entities.js    – coins, carrots, candies, boxes, checkpoint, flag, stalactites, mine carts, leaf platforms, vines, rope bridges, pinecones, cloud types, wind, asteroids, boost pads, quicksand, crumbling platforms, air vents, roads and crosswalks with traffic lights, cars, wet cement, crane girders, manholes, cement bags
  render.js      – renderer: sprite drawing, camera, parallax layers, lighting, screen shake, quality setting
  art/           – SVG sprite definitions as JS strings (characters.js, enemies.js, bosses.js, tiles.js, backgrounds.js, items.js, ui.js)
  sprites.js     – turns the SVG strings into cached images at load time, and handles animation frames
  particles.js   – particle system: dust, sparkles, coin glints, splashes, smoke, leaves, snow, stars
  fx.js          – effects: glow, light rays, rain, wind lines, heat shimmer, flashes, transitions
  audio.js       – simple sound effects and mute
  storage.js     – best scores and best times
  timer.js       – elapsed time and Time challenge countdown
```

---

## 9. Build milestones (for Claude Code)

**Recommended approach:** build the HQ version as a **copy of the finished standard game** in its own folder (for example `sister-dash-hq`), and replace only the graphics. The game logic files (player, enemies, bosses, levels, physics, timer, storage) stay the same, so both versions play exactly alike. If the standard game is not finished yet, first follow the milestones in the standard `SPEC.md`, then do the HQ milestones below.

Build and verify one milestone at a time.

1. **HQ renderer:** 1920×1080 canvas, `devicePixelRatio` support, sprite cache (`sprites.js`), camera with smooth follow, quality setting. The game should still run with the old graphics as placeholders.
2. **Characters:** all four characters as detailed SVG sprites with every animation in 12.3, in small and big form, with and without the candy glow, and the space helmet for level 8.
3. **Items and UI:** coins, carrots, candies, boxes, checkpoints, flagpole, HUD, menus, character select and level select in the HQ style (12.6 and 12.7).
4. **Effects and particles:** the particle system and effects in 12.5, including shot trails, stomp poofs and screen shake.
5. **Levels 1–3 art:** tiles, backgrounds and enemies for Sunny Meadow, Crystal Caves and Whispering Forest.
6. **Levels 4–6 art:** Treetop Heights, Cloud Kingdom and Snowy Mountain.
7. **Levels 7–8 art:** Coral Reef (water effects) and Starlight Station (space effects).
8. **Levels 9–10 art:** Scorching Desert (heat shimmer) and Cement City (traffic, cranes, rooftops).
9. **Bosses:** all ten bosses as large, detailed animated sprites with intro, attack, dizzy, hit and defeat animations.
10. **Polish:** transitions between screens, title screen animation, performance check on Low/Medium/High, and a final side-by-side check that HQ and standard play the same.

---

## 10. Acceptance criteria

- [ ] The game starts by opening `index.html` in a browser, with no install and no server.
- [ ] The player can pick one of four characters: two blonde sisters, Dad and Mom (both brown-haired grown-ups), all visibly distinct and named on the character select screen.
- [ ] The younger sister wears a pink t-shirt and black pants.
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
- [ ] Gameplay is identical to the standard version: same levels, speeds, jump heights, enemy behaviour, boss hit points and time limits.
- [ ] All characters, enemies, bosses, tiles, backgrounds and items use the HQ art described in section 12, with no plain placeholder shapes left.
- [ ] The game looks sharp (no blurry or blocky edges) on a Retina/high-resolution screen.
- [ ] Every level has at least 3 parallax background layers and its own particle effects.
- [ ] The game still works by opening `index.html`, with no downloads and no server.

---

## 11. Out of scope for v1 (possible later)

- Two-player mode (two characters at once)
- Touch controls for iPad or phone
- Level editor
- Music tracks
- More power-ups (for example a golden carrot that gives temporary invincibility)

---

## 12. HQ graphics

### 12.1 Art style

- **Style:** bright, smooth **cartoon vector art**, like a modern mobile or Nintendo-style platformer, but with **original designs only**. No characters, enemies or art copied from existing games or toys.
- **Shapes:** soft rounded shapes, clean dark outlines (2–4 px at 1080p, slightly darker shade of the fill colour rather than black), and simple two-tone shading (a lighter highlight on top and a darker shadow underneath).
- **Colours:** rich, saturated colours with a clear palette per level (see 12.4). Characters and enemies always stand out from the background: backgrounds are a little softer and less saturated than the foreground.
- **Readability first:** dangerous things (enemies, spikes, lasers, cars) always have strong outlines and warm or contrasting colours, and things that are safe to stand on are always clearly solid. Nice graphics must never make the game harder to read.

### 12.2 How the art is made

- All sprites are **hand-authored SVG** written as strings in `js/art/*.js`, so Claude Code can create and change them, and no image files have to be downloaded.
- `sprites.js` converts each SVG into an image once at load time (and caches it at the right size for the current screen), so drawing stays fast.
- Animations are made from several SVG frames per action, plus code-driven motion on top: squash and stretch, bobbing, rotation, and parts that move separately (hair, ears, tails, antennae).
- A short loading screen with a progress bar is shown while the sprites are prepared.

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
- **Warnings:** shadows, flickers and target marks from the standard spec are drawn clearly with soft pulsing glows, so they are easy to see.
- **Transitions:** a circle-wipe or iris transition between screens and when respawning.

### 12.6 Enemies and bosses

- Every enemy has at least an idle/move animation, a warning animation where the standard spec has one, and a defeat animation.
- **Bosses** are big (2–4 times the player's height), richly detailed and full of personality: an intro animation, separate animations for each attack's warning and attack, a dizzy animation with circling stars, a hit flash with a funny face, a phase-change animation, and the defeat animation from the standard spec.
- Fuzzmo (level 8) gets fluffy fur drawn as many layered strands that move gently, and fur that stands up during static sparks.

### 12.7 Menus and HUD

- **Title screen:** animated scene with all four characters running across a meadow, the game logo with a soft shine moving across it, and "Press Enter / Click to start" pulsing gently.
- **Character select:** each character shown large with their idle animation; the selected one plays their victory pose.
- **Level select:** illustrated cards with a small picture of each level and its boss, with a crown and best time on beaten levels.
- **HUD:** rounded semi-transparent panels; hearts, coins, carrot and candy icons drawn in the same style as the game; the boss health bar has the boss's portrait.
- **Fonts:** a rounded, friendly font from Google Fonts (for example "Baloo 2" or "Fredoka"), with a built-in fallback if it can't load, so the game also works offline.

### 12.8 Performance

- Target: steady 60 fps on a normal laptop on **High**.
- **Medium** halves particles and turns off the far parallax animations. **Low** turns off particles, glow and screen shake.
- The game picks Medium automatically if it notices it is running below 50 fps for a few seconds, and shows a small message.

