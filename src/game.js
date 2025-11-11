const isMobile = /Mobi|Android/i.test(navigator.userAgent);

const SCENE_LENGTH = isMobile ? 40 : 50;
const PLAYER_POS = 3;
const GROUND_CHAR = '⠤';
const HOLE_CHAR = '_';
const PLAYER_CHAR = '⠦';
const JUMP_GROUND_CHAR = '⠥';
const JUMP_HOLE_CHAR = '⠁';
const FLAG_CHAR = '⚑';
const PIPE_CHAR = '⠶';
const PIPE_PLAYER_CHAR = '⠷';
const COIN_CHAR = '⠥';
const COIN_PLAYER_CHAR = '⠧';
const ENEMY_CHAR = 'o';
const JUMP_ENEMY_CHAR = 'ȯ';
const COIN_ENEMY_CHAR = 'ȯ';

let world = '';
let initialWorld = '';
let enemies = []; // { idx: number, dir: -1|1 }

const DEFAULT_WORLD = GROUND_CHAR.repeat(200);

function loadWorldFromGlobal() {
  if (typeof window !== 'undefined' && window.LEVEL_WORLD_1_1) {
    return String(window.LEVEL_WORLD_1_1);
  }
  return null;
}

function loadWorldInline() {
  const el = document.getElementById('level-1-1');
  if (!el) return null;
  const txt = el.textContent || '';
  const line = txt
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .join('');
  return line || null;
}

let offset = 0;
let dir = 0;
let y = 0;
let vy = 0;
let gameOver = false;
let win = false;
let coins = 0;
let started = false; // game starts after first input

const SPEED = 10;
const GRAVITY = -30;
const JUMP_VELOCITY = 6;
const ENEMY_SPEED = 2; // tiles per second
const MARQUEE_SPEED = 10; // chars per second for rolling text
let marqueeOffset = 0; // rolling text character offset

let lastUrlString = '';
let lastUrlUpdate = 0;
const URL_UPDATE_INTERVAL = 1 / 12; // seconds

const keys = new Set();
let jumpStartIndex = -1; // track where the player initiated the jump
function onKeyDown(e) {
  keys.add(e.key);
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = -1;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 1;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    if (y === 0) {
      vy = JUMP_VELOCITY;
      jumpStartIndex = Math.floor(offset) + PLAYER_POS;
    }
  }
  // First input starts the game loop updates
  if (!started && (e.key === ' ' || e.key.startsWith('Arrow') || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'w')) {
    started = true;
  }
  if (e.key === 'r' || e.key === 'R') {
    resetGame();
  }
}
function onKeyUp(e) {
  keys.delete(e.key);
  const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
  const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
  dir = (right ? 1 : 0) + (left ? -1 : 0);
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

function getTileAt(idx) {
  if (idx < 0) return GROUND_CHAR;
  if (idx >= world.length) return GROUND_CHAR;
  return world[idx];
}

function setTileAt(idx, ch) {
  if (idx < 0 || idx >= world.length) return;
  world = world.slice(0, idx) + ch + world.slice(idx + 1);
}

function render() {
  const i0 = Math.max(0, Math.floor(offset));
  const i1 = i0 + SCENE_LENGTH;
  let slice = '';
  if (i1 <= world.length) {
    slice = world.slice(i0, i1);
  } else {
    slice = world.slice(i0);
    slice += GROUND_CHAR.repeat(i1 - world.length);
  }
  const chars = slice.split('');
  // Overlay enemies into chars for display
  for (const e of enemies) {
    if (e.idx >= i0 && e.idx < i1) {
      const under = getTileAt(e.idx);
      chars[e.idx - i0] = (under === COIN_CHAR) ? COIN_ENEMY_CHAR : ENEMY_CHAR;
    }
  }
  const playerWorldIndex = i0 + PLAYER_POS;
  const tileUnderPlayer = getTileAt(playerWorldIndex);
  const enemyHere = enemies.some((e) => e.idx === playerWorldIndex);
  if (y > 0) {
    // While airborne, show pipe variant if above a pipe, else jump variant
    if (tileUnderPlayer === PIPE_CHAR) {
      chars[PLAYER_POS] = PIPE_PLAYER_CHAR;
    } else if (enemyHere) {
      chars[PLAYER_POS] = JUMP_ENEMY_CHAR;
    } else {
      chars[PLAYER_POS] = (tileUnderPlayer === HOLE_CHAR) ? JUMP_HOLE_CHAR : JUMP_GROUND_CHAR;
    }
  } else {
    if (tileUnderPlayer === PIPE_CHAR) {
      chars[PLAYER_POS] = PIPE_PLAYER_CHAR;
    } else if (tileUnderPlayer === COIN_CHAR) {
      chars[PLAYER_POS] = COIN_PLAYER_CHAR;
    } else {
      chars[PLAYER_POS] = PLAYER_CHAR;
    }
  }
  // On game over, show skull at the player's position
  if (gameOver) {
    chars[PLAYER_POS] = '💀';
  }
  const status = win ? '' : '';
  const coinNum = String(coins % 100).padStart(2, '0');
  const coinStr = `(🟡${coinNum})`;
  // Rolling marquee messages for start and game over
  let showMarquee = false;
  let marquee = '';
  if (!started && !gameOver && !win) {
    showMarquee = true;
    const msg = 'PRESS⠤SPACE⠤TO⠤START';
    const base = (msg + '⠤'.repeat(SCENE_LENGTH/2));
    const idx = Math.floor(marqueeOffset) % base.length;
    marquee = (base.slice(idx) + base.slice(0, idx));
  } else if (gameOver) {
    showMarquee = true;
    const msg = 'GAME⠤OVER⠤⠤⠤PRESS⠤R⠤TO⠤RESTART';
    const base = (msg + '⠤'.repeat(SCENE_LENGTH/2));
    const idx = Math.floor(marqueeOffset) % base.length;
    marquee = (base.slice(idx) + base.slice(0, idx));
  }
  // If marquee active, overlay it into the scene to the right of the player
  if (showMarquee) {
    const start = Math.min(PLAYER_POS + 1, SCENE_LENGTH);
    const spaceRight = Math.max(0, SCENE_LENGTH - start);
    const overlay = marquee.slice(0, spaceRight);
    for (let i = 0; i < overlay.length; i++) {
      const pos = start + i;
      if (pos >= 0 && pos < SCENE_LENGTH) {
        chars[pos] = overlay[i];
      }
    }
  }
  const s = coinStr + chars.join('') + status;
  const now = performance.now() / 1000;
  if (s !== lastUrlString && (now - lastUrlUpdate) >= URL_UPDATE_INTERVAL) {
    lastUrlString = s;
    lastUrlUpdate = now;
    const hash = '#' + encodeURIComponent(s);
    try {
      history.replaceState(null, '', hash);
    } catch (e) {
      document.title = s;
    }
  }
}

let lastTime = performance.now();
function tick(t) {
  const dt = Math.min(0.05, (t - lastTime) / 1000);
  lastTime = t;
  // Advance marquee continuously
  marqueeOffset += MARQUEE_SPEED * dt;
  if (marqueeOffset > 1e9) marqueeOffset = marqueeOffset % 1000; // prevent unbounded growth
  // Only update physics after the game has started and while active
  if (started && !gameOver && !win) update(dt);
  render();
  requestAnimationFrame(tick);
}

function update(dt) {
  // Horizontal movement with pipe collision on ground and coin rules in air
  const prevOffset = offset;
  const prevY = y; // track previous vertical position to detect landings
  let intended = offset + dir * SPEED * dt;
  if (intended < 0) intended = 0;
  const nextIndex = Math.floor(intended) + PLAYER_POS;
  const nextTile = getTileAt(nextIndex);
  const currIndex = Math.floor(offset) + PLAYER_POS;
  const currTile = getTileAt(currIndex);
  // Ground: only pipes block movement
  if (y === 0) {
    if (nextTile === PIPE_CHAR && currTile !== PIPE_CHAR) {
      intended = prevOffset; // blocked by pipe front
    }
  } else {
    // Airborne: block lateral entry into coins unless it's the coin directly above jump start
    if (nextTile === COIN_CHAR && nextIndex !== jumpStartIndex) {
      intended = prevOffset; // blocked by coin side in air
    }
  }
  offset = intended;

  vy += GRAVITY * dt;
  y += vy * dt;
  if (y < 0) y = 0;

  // Move enemies: time-based patrol between obstacles (pipes and holes)
  // Use per-enemy accumulator to advance whole tiles at a stable rate
  for (const e of enemies) {
    if (e.acc == null) e.acc = 0;
    e.acc += ENEMY_SPEED * dt;
    let guard = 0;
    while (e.acc >= 1 && guard++ < 4) { // move up to 4 tiles per frame max
      let desired = e.idx + e.dir;
      let t = getTileAt(desired);
      // If next is blocked, reverse once
      if (desired < 0 || desired >= world.length || t === PIPE_CHAR || t === HOLE_CHAR) {
        e.dir = -e.dir;
        desired = e.idx + e.dir;
        t = getTileAt(desired);
      }
      // Move if not blocked after potential reverse
      if (!(desired < 0 || desired >= world.length || t === PIPE_CHAR || t === HOLE_CHAR)) {
        e.idx = desired;
      }
      e.acc -= 1;
    }
  }

  const playerIndex = Math.floor(offset) + PLAYER_POS;
  const currentTile = getTileAt(playerIndex);
  // Win if touching flag
  if (currentTile === FLAG_CHAR) {
    win = true;
    dir = 0; vy = 0;
    return;
  }
  // Enemy interactions using dynamic enemy positions
  const enemyIndex = enemies.findIndex((e) => e.idx === playerIndex);
  // Stomp only when actually landing on the tile (prevY>0 and now on ground)
  if (prevY > 0 && y === 0 && enemyIndex !== -1) {
    coins += 1;
    // Do not alter underlying tile (could be a coin)
    enemies.splice(enemyIndex, 1);
    vy = JUMP_VELOCITY * 0.6; // bounce
  } else if (y === 0 && enemyIndex !== -1) {
    // Walking into an enemy on the ground kills the player
    gameOver = true;
    dir = 0; vy = 0;
    return;
  }
  // Collect coin only when ascending from directly below the coin you jumped under
  if (y > 0 && vy > 0 && currentTile === COIN_CHAR && playerIndex === jumpStartIndex) {
    coins += 1;
    setTileAt(playerIndex, GROUND_CHAR);
    // Dampen upward velocity to shorten jump duration
    if (vy > 0) {
      vy *= 0.4;
    }
    // After collecting, prevent further coin checks tied to this jump index
    jumpStartIndex = -1;
  }
  // Immediate game over if landed in a hole
  if (y === 0 && currentTile === HOLE_CHAR) {
    gameOver = true;
    dir = 0; vy = 0;
    return;
  }
  // When on ground (non-hole), clamp vertical velocity
  if (y === 0 && currentTile !== HOLE_CHAR) {
    vy = 0;
    // Reset jump start upon landing
    jumpStartIndex = -1;
  }
}

function init() {
  const loaded = loadWorldFromGlobal() || loadWorldInline();
  world = loaded && loaded.length ? loaded : DEFAULT_WORLD;
  initialWorld = world;
  // Extract enemies from world into dynamic list and clear them from world tiles
  enemies = [];
  for (let i = 0; i < world.length; i++) {
    if (world[i] === ENEMY_CHAR) {
      enemies.push({ idx: i, dir: -1, acc: 0 });
      setTileAt(i, GROUND_CHAR);
    }
  }
  requestAnimationFrame(tick);
}

init();

function resetGame() {
  offset = 0;
  dir = 0;
  y = 0;
  vy = 0;
  gameOver = false;
  win = false;
  coins = 0;
  started = true; // immediately start after restart
  marqueeOffset = 0;
  if (initialWorld) world = initialWorld;
  // Rebuild enemies from the reset world and clear them from tiles
  enemies = [];
  for (let i = 0; i < world.length; i++) {
    if (world[i] === ENEMY_CHAR) {
      enemies.push({ idx: i, dir: -1, acc: 0 });
      setTileAt(i, GROUND_CHAR);
    }
  }
  // force immediate URL refresh on next render
  lastUrlString = '';
  lastUrlUpdate = 0;
}
