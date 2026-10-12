SISTER DASH — SPEC(1) EXPANSION ART

Open preview.html after extracting this ZIP. It shows the comparison,
background previews, animated sheets and an individual-frame viewer.

This is an ART PACK, not a complete ten-level game or a drop-in render.js.
Copy its art subfolders into your project, preserving their names. The
new filenames use theme names to avoid overwriting old numbered levels.

expansion-manifest.js defines EXPANSION_ART as a plain global. Load it with
a script tag after the existing manifest. The accompanying JSON contains
the same data for other tools; the browser game does not need to fetch JSON.
It does not automatically modify MANIFEST: map the new keys to your
renderer and add the new level/enemy/boss logic when implementing Spec(1).
The gallery demonstrates correct source rectangles, pivots and animations.

FORMATS
Bosses: 320x320 cells, 4x5, scale 0.5, feet pivot (160,312).
Enemy strips: 192x192 cells, four poses, scale 0.25, feet pivot (96,184).
Tiles: 128x128 cells, 8x2, scale 0.25, top-left anchor.
Props/UI: 256x256 cells, centered pivot (128,128), default scale 0.25.
Traffic: 512x256 cells, four poses, feet pivot (256,248), scale 0.25.
Characters: 256x256 cells, 8x5, feet pivot (128,244), small 0.25 / big 0.375.
Effects: 192x192 cells, centered pivot (96,96).
Backgrounds: 1920x1080, three independently scrolling layers per new world.
Use alternating mirrored tiles when scrolling backgrounds; the gallery
shows this approach. This avoids hard edge joins without extra textures.
Background exports are resized from the generated artwork, not native 4K.

All frame numbers and named states are listed in the manifest. Boss sheets
face LEFT; new regular enemies and vehicles face RIGHT. Mirror on direction
changes. Set collision boxes in code independently of the painted outlines.
The animation poses need timing/blending appropriate to each game state.
The glass helmet center is transparent and can overlay any family member.

READ COMPARISON.txt BEFORE RENUMBERING LEVELS.

Generated with the built-in image-generation tool. Full prompts and two
correction prompts are included in generation-prompts.json. Sheets were
mechanically isolated, aligned and resized for consistent frame addresses.
The supplied PNGs and their source rectangles were checked locally. New
level gameplay has not been implemented or play-tested in this art task.
