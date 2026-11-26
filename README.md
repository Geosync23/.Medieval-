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
(shove bodies into rocks, trees, the fire, barrels and each other).

The page now groups ten of these as **weapons**: Momentum, Hammer throw, Horde, War drum,
Ball & chain, Chain hook, Longbow (five retrievable piercing arrows), Greatsword
(spin up like a top), Fire pots and Lodestone (pull everyone in, hurl them out). Two newer ones are
tagged NEW in the bar: Leap maul and Launcher. All logic is in
`hd/js/combat.js`.

## Battle test (`hd/battle.html`)

The pixel-art version of the massed battle: England against France, 100 / 200 / 300 a side, in six
regiments each (swordsmen, spearmen, archers). Regiments march and wheel toward the nearest enemy block,
then break into individual fights; archers loose arcing volleys. The king takes the field with any of
the twelve weapons from the combat page, switchable mid-battle.

- `hd/js/battlefield.js` — the battlefield scene (camps at either end, walls, haystacks, pond)
- `hd/js/troops.js` — pre-rendered soldier sprites, fast enough for 600+ men a frame
- `hd/js/combat.js` — the battle layer lives here behind the `BATTLE` flag, so weapons are shared
- `hd/troops-demo.html` — a sprite and battlefield viewer

## The castle (`hd/castle.html`)

There are three layouts. **Layout 3** (`hd/castle.html`) is the current one and is **Euclidean**:
the whole castle is one master plan in one coordinate system (`hd/js/site.js`). Every building has a
real footprint and real storey heights. Outdoors it is drawn closed; when the king walks in, the same
world is drawn again with that building cut open at his storey, so each room sits exactly inside the
walls you saw from outside, and every door and stair is at the same world position on both sides.
An L-shaped keep (north range: staff quarters, council and library, royal apartments; west range:
undercroft prison and cellars, great hall and kitchens, throne room; a round great tower of four
floors at the corner with a stair to its roof) wraps the great court; the lower bailey (barracks,
smithy, stables, drill ground, gatehouse) lies east and the garden terrace (chapel, bath house, maze,
pond, orchard) south. Room contents are in `hd/js/rooms.js` and `hd/js/room_throne.js`, the grounds in
`hd/js/site_out.js`.

**Layout 2** (`hd/castle_v2.html`, `hd/js/castle_ext_v2.js`) is the previous design, kept for reference: an
L-shaped keep (a pitched royal range and a flat-roofed great hall range meeting at a great round tower)
spread over three outdoor areas: the great court, a long lower bailey with a terrace and grand stair,
and a garden terrace with the chapel, cloister, hedge maze, lily pond and orchard. **Layout 1**
(`hd/castle_v1.html`, `hd/js/castle_ext_v1.js`) is the first design, kept for reference: a square
outer ward and a square inner ward with a box keep. Both share the throne room
(`hd/js/castle_throne.js`) and the nine interiors. The description below is of layout 1's areas.

A large explorable castle made of twelve connected areas. Hold to walk, tap to walk to a spot, tap a
yellow tag to use a door or stair. Walking is height-aware: stairs, wall-walks, tower tops and the keep's
battlements are all reachable on foot.

- **Outer ward** — gatehouse, barracks, stables, smithy, training yard, climbable watchtower
- **Inner ward & gardens** — the keep, chapel, staff wing, bath house, formal garden, orchard
- **Keep** — great hall and kitchens, throne room, royal apartments, battlements; undercroft with the
  prison, wine cellar, treasury and crypt
- **Wings** — barracks, staff quarters, bath house and games hall, chapel, council chamber and library,
  the astronomer's tower

Code: `hd/js/castle.js` (areas, portals, height-aware pathfinding, staff), `hd/js/kit.js` (floors,
walls, partitions, stairs, curtain walls, towers), `hd/js/furnish.js` (115 pieces of furniture and
decoration; `hd/furnish-demo.html` is a gallery), `hd/js/castle_ext.js` (courtyards and throne room),
`hd/js/castle_int.js` (the nine interiors).
