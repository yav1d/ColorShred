# ColorShred

A sliding-block color puzzle for phones. Drag each block into the shredder gate of its color to clear the board.

## Modes
- **Levels**: 200 levels, with 50 each in **Easy**, **Medium**, **Hard** and **Superhard**. Each level unlocks when you beat the one before it.
  A solver checks every level, so each one can be solved and has a known minimum move count.
- **Unstoppable**: endless boards generated on the phone. Moves are unlimited and the clock is what you fight. Each cleared board adds time,
  and the next board gets harder, with some randomness.

## Rules
- Drag a block. It slides around other blocks and walls.
- Push it into a gate of the same color to shred it. It must fit the gate's span, and every cell needs a clear path to the gate.
- Arrow blocks (↔ / ↕) only slide along their arrows. Ice blocks thaw after you shred the number of blocks shown.
- Every drag costs one move in Levels. Superhard levels allow one spare move and run on a clock.

## Coins, power-ups and colors
- Earn **coins** by beating levels (more on harder tiers and with more stars) and by clearing Unstoppable boards.
- Power-ups cost coins and are limited on each board: **Recolor** (40), **Blast** a block (60), **Thaw** ice (25), **+5 moves / +20 sec** (30).
- Every level you beat unlocks a new **board color**. Choose it under Colors.
- Progress, including a level in progress, saves on the phone automatically. Settings has a backup code you can copy and load later.

## Play on iPhone
Open `index.html` from any static host (for example GitHub Pages). In Safari, tap **Share → Add to Home Screen** for a full-screen app icon.

## Development
- `src/engine.js`: rules and the optimal solver.
- `src/gen.js`: level generator, used by the build tools and in-game by Unstoppable mode (in a Web Worker).
- `src/game.html`: the game UI.
- `tools/generate.js <tier> <count> <seed> <out.json>`: generates verified levels (`easy`, `medium`, `hard`, `superhard`).
- `tools/build.js [level json files...]`: merges levels into `src/levels.json` (up to 50 per tier) and builds `index.html` and `dist/artifact.html`.
- `tools/reverify.js`: re-solves every level with the current rules.
