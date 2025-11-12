# Tiny Mario

A tiny, text-first platformer inspired by (URL Snake)[https://demian.ferrei.ro/snake] and Tiny Horse. The level is rendered as text (primarily Unicode Braille) to achieve a dense, crisp layout in a purely textual surface.

- Inspiration: URL Snake and Tiny Horse
- Reference Level: Super Mario Bros World 1-1

## Overview
Tiny Mario reimagines a classic side‑scroller as a low‑fi, text‑rendered experience. Reach the flag while avoiding pits and enemies. Rendering primarily uses Unicode Braille cells (e.g. ⠤ ⠥) for compact geometry.

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

## Roadmap
- Additional levels

## Contributing
- Please open an issue or PR for changes
- Keep level strings human‑diffable

## License
Public Domain (CC0 1.0)
You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission. See https://creativecommons.org/publicdomain/zero/1.0/

## References
- Url Snake by Demian Ferreiro: https://demian.ferrei.ro/snake
- Tiny Horse by Diego Dotta: https://github.com/diegodotta/horse-jump-url-bar
- Super Mario Bros World 1-1: https://ahistoryofthemushroomkingdom.fandom.com/wiki/World_1-1
- Unicode Braille patterns: https://www.unicode.org/charts/PDF/U2800.pdf
- Sound Effects: https://www.beepbox.co/