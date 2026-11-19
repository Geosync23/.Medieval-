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
