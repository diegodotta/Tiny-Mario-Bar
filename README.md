# Tiny Mario

This is my second small experiment inspired from URL Snake by Demian Ferreiro. The first one was Tiny Horse, which used only one type of movement (jump).

Besides the challenge of creating a game in a 4 x 100 pixel scene with no color and limited characters, this time I wanted something more difficult. So, Tiny Mario reimagines the classic Super Mario Bros as a side-scroller with a low-fi, text-rendered style.

![Tiny Mario Gameplay](https://diego.horse/wp-content/uploads/2025/11/tinymario.gif)

Your goal is to collect the most coins and reach the flag while avoiding pits and enemies before time runs out.

Again, the rendering mainly uses Unicode Braille cells (e.g., ⠤ ⠥). But now, the player can move in all directions, even going down to an underworld through one of the “pipes.”

![Underground View](https://diego.horse/wp-content/uploads/2025/11/tinymario-underground.gif)

There’s just one level, though. If you want more, feel free to add them. This is an open-source project.

Enjoy.

## Current Features
- Text renderer using Unicode Braille
- Player movement (left/right/jump/down the pipe) and basic physics/collision
- Pipes and underground section with rules and animations
  - Enter underground via the 4th pipe (overworld)
  - Exit by jumping the last inverted pipe underground; you reappear at the 5th overworld pipe
  - Pipe enter/exit animations and music/SFX swaps
- Coins, timer drain on win, enemies with stomp bounce
- HUD split into two rows (instructions and stats) with emojis
- URL HUD row that mirrors the “address bar” string in-page
  - Auto‑shown on Safari and Mobile; toggleable elsewhere
  - Adjustable monospace font size (+/−)
- Mobile on‑screen controls (Up/Left/Down/Right)
  - Hidden on desktop
  - Up becomes “R” after win/death to restart

## Controls
- Keyboard
  - Left: A or Left Arrow
  - Right: D or Right Arrow
  - Jump: W, Space, or Up Arrow
  - Restart: R
- Mobile
  - D‑pad buttons for movement/jump
  - When game over or stage clear, Up shows “R” and restarts

## Glyph Legend (level encoding)
- Ground: ⠤
- Hole: _
- Flag: ⚑
- Pipe (overworld): ⠶
- Pipe player variant: ⠷
- Coin: ⠥
- Enemy: o
- Underground walls: ⠿ (non‑walkable background in logic)
- Underground inverted pipe variants: ⠭ (pipe), ⠯ (pipe+player)

Levels are encoded as single‑line strings for portability and easy diffs. See `src/levels.js` for the current layout.

## How to Run (Web)
- Open https://diego.horse/tiny-mario
OR
- Clone and open `index.html` in a modern browser, or serve the folder with any static server
- No build step required
- Notes
  - A monospace‑capable font improves readability
  - Safari/Mobile automatically shows the URL HUD row

## Project Structure
- index.html — HUD and containers
- styles.css — HUD and mobile controls styling
- src/
  - game.js — game loop, input, physics, renderer, HUD, mobile controls
  - levels.js — level strings (overworld and underground)

## Future Improvements
- Move the definition of underground enter and exit to levels.js
- Additional levels
- Migrate to the 8-dot Braille pattern instead of 6

## Contributing
- Please open an issue or PR for changes
- Keep level strings human‑diffable

## License
Public Domain (CC0 1.0)
You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission. See https://creativecommons.org/publicdomain/zero/1.0/

## References and Tool
- Pair programmed with [Windsurf](https://windsurf.com/refer?referral_code=oy0hdqpvkz4b88ng)
- Proofread by [Smart Keys for Mac](https://smartkeys.so/for-macos/)
- [Url Snake](https://demian.ferrei.ro/snake)
- [Tiny Horse](https://github.com/diegodotta/horse-jump-url-bar)
- [Super Mario Bros World 1-1](https://ahistoryofthemushroomkingdom.fandom.com/wiki/World_1-1)
- [Unicode Braille patterns](https://en.wikipedia.org/wiki/Braille_Patterns)
- [Sound Effects](https://www.beepbox.co/)