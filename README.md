# Super Mario Bar

A tiny, text-first platformer inspired by Tiny Horse (horse-jump-url-bar) and World 1-1 from Super Mario. The player can move left, move right, and jump. Level 1 is represented using characters (primarily Unicode Braille patterns) to achieve dense, crisp level geometry in a text-only surface.

- Inspiration: Tiny Horse URL bar game
- Reference Level: World 1-1

## Overview
Super Mario Bar reimagines a classic side-scrolling platformer as a low-fi, text-rendered experience. The goal is to traverse Level 1-1, avoiding pits and enemies, and reach the end flag. Rendering primarily uses Unicode Braille cells (⠤⠥⠤) to represent fine-grained terrain and objects while remaining purely textual.

## Key Features
- Text-based renderer using Unicode Braille for compact, high-resolution shapes
- Player movement: left, right, jump
- Collision and simple physics for ground, blocks, and pipes
- Level 1-1 layout encoded as characters for portability and fast iteration
- Minimal UI for score/coins/time (text counters)

## Controls
- Left: A or Left Arrow
- Right: D or Right Arrow
- Jump: W, Space, or Up Arrow

## Level 1-1 as Characters (Braille-first)
We convert World 1-1 into a character grid:
- Primary glyphs: Braille patterns ⠤ ⠥
- Secondary glyphs: Special characters like _ for holes.
- Coordinate system: Tile map expressed as rows of characters, with mapping rules from glyph to collision/material (solid block, question block, pipe, ground, empty).
- Authoring: Maintain level data as text files for easy diffs and quick iteration.

Recommended mapping examples:
- Solid ground/blocks: dense Braille patterns (e.g., ⠿, ⣿) mapped to solid collision.
- Pipes: contiguous vertical bands of consistent Braille glyphs to signal cylindrical solids.
- Question/brick blocks: distinct repeated glyphs to differentiate collectible vs destructible.
- Enemies: simple ASCII letters or emoji placeholders if supported (e.g., g for goomba).

Note: This repository will start with Level 1 only. Additional levels can follow the same textual encoding.

## Tech Stack
- Runtime/Language: TBD by implementation
  - Option A: Web (JavaScript/TypeScript) for portability and easy text rendering
  - Option B: Swift (macOS/iOS) terminal or UI text surface
- Rendering: Monospace text surface with Unicode Braille support
- Input: Keyboard events mapped to left/right/jump

We will mirror best practices from Tiny Horse (separation of input, physics, renderer, and level data files) even if the underlying platform differs.

## Project Structure (initial proposal)
- /levels
  - world-1-1.txt — Braille-first character map and legend
- /src
  - engine/ — input, physics, collision, camera
  - render/ — text renderer and glyph mapping
  - game/ — game loop, entities (player, enemies), HUD
- README.md

Note: The repository currently only contains this README. Source files will be added incrementally.

## Setup
Because the implementation is TBD, setup steps will be added with the first runnable version. We will include:
- Prerequisites
- Install/build steps
- Run/debug instructions

## How to Run
To be documented alongside the chosen runtime. Target experiences:
- Web: open index.html or run a dev server (e.g., Vite) and play in the browser
- Swift: run an app target or a console target that renders the text grid and accepts keyboard input

## Roadmap
- Milestone 1: Bootstrap runtime and renderer
- Milestone 2: Input + physics + collision
- Milestone 3: Import and render Level 1-1 text map
- Milestone 4: Entities (coins, enemies), basic HUD
- Milestone 5: Polish pass and performance tuning

## Contributing
- Open an issue to propose changes
- Keep level files human-diffable
- Follow separation of concerns (input/physics/render/data)

## License
MIT (to be confirmed)

## References
- Tiny Horse (horse-jump-url-bar): https://github.com/diegodotta/horse-jump-url-bar
- World 1-1 reference: https://ahistoryofthemushroomkingdom.fandom.com/wiki/World_1-1
- Unicode Braille patterns: https://www.unicode.org/charts/PDF/U2800.pdf
- Sound Effects: https://www.beepbox.co/