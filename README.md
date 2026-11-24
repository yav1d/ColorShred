# ColorShred

A sliding-block color puzzle for phones. Drag each block into the shredder gate of its color to clear the board.
It has 60 levels in three tiers: **Medium**, **Hard** and **Superhard**. The generator verifies every level with a solver,
so each one can be solved and has a known minimum move count.

## Rules
- Drag a block. It slides around other blocks and walls.
- Push it into a gate of the same color to shred it. The block must fit inside the gate's span.
- Arrow blocks (↔ / ↕) only slide along their arrows. Ice blocks thaw after you shred the number of blocks shown.
- Every drag costs one move. Superhard levels allow one spare move over the optimum and run on a clock.

## Play on iPhone
Open `index.html` from any static host (for example GitHub Pages). In Safari, tap **Share → Add to Home Screen** to get a full-screen app icon.
Progress is saved in the browser.

## Development
- `src/engine.js`: rules and the optimal solver, shared by the game and the generator.
- `src/game.html`: the game UI.
- `tools/generate.js <tier> <count> <seed> <out.json>`: generates verified levels (tiers: `medium`, `hard`, `superhard`).
- `tools/build.js [level json files...]`: merges levels into `src/levels.json` and builds `index.html` (standalone) and `dist/artifact.html`.
