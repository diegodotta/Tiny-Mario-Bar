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

let world = '';
let initialWorld = '';

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

const SPEED = 10;
const GRAVITY = -30;
const JUMP_VELOCITY = 6;

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
  const tile = chars[PLAYER_POS] || GROUND_CHAR;
  if (y > 0) {
    // While airborne, show pipe variant if above a pipe, else jump variant
    if (tile === PIPE_CHAR) {
      chars[PLAYER_POS] = PIPE_PLAYER_CHAR;
    } else {
      chars[PLAYER_POS] = (tile === HOLE_CHAR) ? JUMP_HOLE_CHAR : JUMP_GROUND_CHAR;
    }
  } else {
    if (tile === PIPE_CHAR) {
      chars[PLAYER_POS] = PIPE_PLAYER_CHAR;
    } else if (tile === COIN_CHAR) {
      chars[PLAYER_POS] = COIN_PLAYER_CHAR;
    } else {
      chars[PLAYER_POS] = PLAYER_CHAR;
    }
  }
  const status = win ? '🏁' : (gameOver ? '💀' : '');
  const coinStr = coins > 0 ? `🪙${coins}` : '';
  const s = chars.join('') + coinStr + status;
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
  if (!gameOver && !win) update(dt);
  render();
  requestAnimationFrame(tick);
}

function update(dt) {
  // Horizontal movement with pipe collision on ground and coin rules in air
  const prevOffset = offset;
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

  const playerIndex = Math.floor(offset) + PLAYER_POS;
  const currentTile = getTileAt(playerIndex);
  // Win if touching flag
  if (currentTile === FLAG_CHAR) {
    win = true;
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
  if (initialWorld) world = initialWorld;
  // force immediate URL refresh on next render
  lastUrlString = '';
  lastUrlUpdate = 0;
}
