# King Simulator — pixel art tests

Art-direction mock-ups for an isometric pixel-art king sim. Nothing here is hand-drawn or an image
asset: every pixel is generated in code by a small software renderer.

Open `index.html` in a browser (no build step, no dependencies).

- **Town Square** — market square with ~50 wandering villagers
- **Castle** — keep, great hall, walls, moat and the road to the village
- **Throne Room** — cut-away interior with real light shafts through the stained glass

Each scene can be viewed at Day / Dusk / Night. Tap the ground to walk the king, tap a person to see
who they are and what they are doing, drag to pan, pinch or use +/− to zoom.

## How it works

| File | Role |
| --- | --- |
| `js/engine.js` | Rasterises textured 3D quads into a G-buffer, sun shadow map, banded lighting, point lights, outlines |
| `js/tex.js` | Procedural textures: cobbles, half-timber facades, roof tiles, windows, stained glass |
| `js/build.js` | Builders: houses, roofs, towers, walls, fountain, stalls, trees, props |
| `js/scenes.js`, `js/scenes2.js` | The three scenes |
| `js/sim.js` | Villager agents (A* pathing, simple routines), people sprites, water / smoke / flags / fire |
| `js/main.js` | Camera, input, UI, frame loop |

The static scene is baked once (~0.5 s); each frame only copies it and draws the moving things with a
per-pixel depth test, so it costs about 1 ms per frame.

## High-detail test (`hd/`)

`hd/index.html` is a second pass at double the pixel density, aimed at the reference image: soft
dithered shadow edges, ambient occlusion, edge highlights, richer wall / roof / cobble textures,
3D flower boxes, ivy, lanterns, shop signs, baskets of produce and ~30px-tall villagers.
It bakes in about 1.3 s and uses a leaner G-buffer (world position is reconstructed from depth).

## Combat tests (`hd/combat.html`)

One forest clearing, waves of bandits, archers and brutes, and four switchable control schemes:
**Swipe** (hold to move, swipe to strike, hold the king to block, swipe from the king to roll),
**King's Guard** (the king swings on his own when he stands still; three knights fight beside him),
**Duel** (one opponent at a time on a balance bar) and **Draw & loose** (pull back from the king and
release to dash through a line of enemies), plus five genre experiments: **Momentum** (speed is the
weapon), **Hammer throw** (a bouncing, recallable hammer), **Horde** (weapons work on their own, you
only move), **War drum** (strike on the beat) and **Time holds** (the world moves only when the king
does), and two physics prototypes: **Ball & chain** (a rope-simulated iron ball) and **Shield bash**
(shove bodies into rocks, trees, the fire, barrels and each other). All logic is in `hd/js/combat.js`.
