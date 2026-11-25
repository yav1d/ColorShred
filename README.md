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

## Ship it (free web app with a home-screen icon)
`site/` is the finished app: the page, app icons, a manifest and an offline cache. Any static host works. With GitHub Pages:
1. Merge this branch into `main`.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   (Pages on a private repository needs a paid GitHub plan. Otherwise make the repository public.)
3. The **Deploy to GitHub Pages** workflow publishes on every push to `main`, at `https://<user>.github.io/<repo>/`.

On the iPhone: open that address in **Safari**, tap **Share → Add to Home Screen**. ColorShred then opens full screen like an app,
works offline, and keeps progress on the phone (Settings has a backup code).

## Development
- `src/engine.js`: rules and the optimal solver.
- `src/gen.js`: level generator, used by the build tools and in-game by Unstoppable mode (in a Web Worker).
- `src/game.html`: the game UI.
- `tools/generate.js <tier> <count> <seed> <out.json>`: generates verified levels (`easy`, `medium`, `hard`, `superhard`).
- `tools/build.js [level json files...]`: merges levels into `src/levels.json` (up to 50 per tier) and builds `site/` (the web app) and `dist/artifact.html`.
- `tools/icons.js`: renders the app icons into `assets/` (needs Playwright).
- `tools/reverify.js`: re-solves every level with the current rules.
