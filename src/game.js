/*
 Tiny Mario Bar
 Author: Diego Dotta — https://diego.horse
 Play: https://diego.horse/tiny-mario
 Controls: Desktop — SPACE to start/jump, R to restart (auto-starts). Mobile — Tap to start/jump/restart.
 License: MIT
*/

const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Animation frame constants
const PIPE_ENTER_OVER_FRAMES = ['⠶','⠴','⠲'];
const PIPE_ENTER_UNDER_FRAMES = ['⠭','⠬','⠯'];
const PIPE_EXIT_OVER_FRAMES  = ['⠲','⠴','⠶'];
const PIPE_EXIT_UNDER_FRAMES = ['⠯','⠬','⠭'];

const SCENE_LENGTH = isMobile ? 40 : 60;
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
let undergroundWorld = '';
let undergroundRaw = '';
let undergroundRawInitial = '';
let isUnderground = false;
let prevOverworldOffset = 0;
let undergroundPipeIndices = [];
let undergroundVisited = false;
let pipeAnim = null; // {phase:'over'|'under', frames:string[], idx:number, t:number, underStartOffset:number}
let playerPos = PLAYER_POS; // dynamic screen position (0..PLAYER_POS), default anchored at 3
let overworldPipeIndices = [];

const DEFAULT_WORLD = GROUND_CHAR.repeat(200);

function rebuildUndergroundFromRaw() {
  undergroundWorld = undergroundRaw
    .split('')
    .map((ch) => {
      if (ch === '⠿') return GROUND_CHAR;
      if (ch === '⠭' || ch === '⠯') return PIPE_CHAR;
      if (ch === '⠻' || ch === '⠽') return GROUND_CHAR;
      return ch;
    })
    .join('');
  undergroundPipeIndices = [];
  for (let i = 0; i < undergroundWorld.length; i++) {
    if (undergroundWorld[i] === PIPE_CHAR) undergroundPipeIndices.push(i);
  }
}

function loadWorldFromGlobal() {
  if (typeof window !== 'undefined' && window.LEVEL_WORLD_1_1) {
    return String(window.LEVEL_WORLD_1_1);
  }
  return null;
}

function setupMobileControls() {
  const ctrls = document.getElementById('mobile-controls');
  if (!ctrls) return;
  ctrls.style.display = isMobile ? 'grid' : 'none';
  if (!isMobile) return;
  const map = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  };
  function bind(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    const kd = () => onKeyDown({ key });
    const ku = () => onKeyUp({ key });
    if (id === 'up') {
      const handlePress = (e) => {
        e.preventDefault();
        if (gameOver || win) {
          resetGame();
        } else {
          kd();
        }
      };
      const handleRelease = (e) => { e.preventDefault(); if (!(gameOver || win)) ku(); };
      el.addEventListener('touchstart', handlePress, { passive: false });
      el.addEventListener('touchend', handleRelease, { passive: false });
      el.addEventListener('mousedown', handlePress);
      el.addEventListener('mouseup', handleRelease);
      el.addEventListener('mouseleave', handleRelease);
    } else {
      el.addEventListener('touchstart', (e) => { e.preventDefault(); kd(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); ku(); }, { passive: false });
      el.addEventListener('mousedown', (e) => { e.preventDefault(); kd(); });
      el.addEventListener('mouseup', (e) => { e.preventDefault(); ku(); });
      el.addEventListener('mouseleave', (e) => { e.preventDefault(); ku(); });
    }
  }
  Object.entries(map).forEach(([id, key]) => bind(id, key));
  // Set initial label
  updateMobileUpLabel();
}

function updateMobileUpLabel() {
  const upBtn = document.getElementById('up');
  if (!upBtn) return;
  if (!isMobile) return;
  upBtn.textContent = (gameOver || win) ? 'R' : '▲︎';
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
let timeLeft = 99; // seconds remaining on the level timer
let timedOut = false; // whether game over was caused by time running out

const SPEED = 10;
const GRAVITY = -30;
const JUMP_VELOCITY = 6;
const ENEMY_SPEED = 2; // tiles per second
const MARQUEE_SPEED = 6; // chars per second for rolling text
let marqueeOffset = 0; // rolling text character offset
const TIME_TICK_RATE = 1; // seconds per second (real-time countdown)
const TIME_DRAIN_RATE = 20; // coins per second gained from remaining time after win
const PIPE_ANIM_FRAME_DUR = 0.12; // seconds per frame for pipe entry animation

// Audio
const base = (typeof domain === 'string' && domain) ? domain : '.';
let music = new Audio(base + '/sound/soundtrack.mp3');
music.loop = true;
music.volume = 0.3;
let musicUnderground = new Audio(base + '/sound/underground.mp3');
musicUnderground.loop = true;
musicUnderground.volume = 0.3;
let sfxJump = new Audio(base + '/sound/jump.mp3');
sfxJump.volume = 0.3;
let sfxCoin = new Audio(base + '/sound/coin.mp3');
sfxCoin.volume = 0.7;
let sfxPipe = new Audio(base + '/sound/pipe.wav');
sfxPipe.volume = 0.7;
let sfxDie = new Audio(base + '/sound/death.mp3');
sfxDie.volume = 0.5;
let sfxClear = new Audio(base + '/sound/stage_clear.mp3');
sfxClear.volume = 0.5;
let sfxStomp = null; // optional separate stomp sound
try {
  sfxStomp = new Audio(base + '/sound/stomp.mp3');
  sfxStomp.volume = 0.5;
} catch {}

let lastUrlString = '';
let lastUrlUpdate = 0;
const URL_UPDATE_INTERVAL = 1 / 12; // seconds

const keys = new Set();
let jumpStartIndex = -1; // track where the player initiated the jump
// High score (best coins) and HUD helpers
let bestCoins = 0;
try { bestCoins = parseInt(localStorage.getItem('bestCoins') || '0', 10) || 0; } catch {}
function updateHighHUD() {
  const el = document.getElementById('high');
  if (el) {
    const n = String(bestCoins % 100).padStart(2, '0');
    el.textContent = `High Score ${n}`;
  }
}
function updateScoreHUD() {
  const el = document.getElementById('score');
  if (el) {
    const n = String(coins % 100).padStart(2, '0');
    el.textContent = `Score: ${n}`;
  }
}
function updateInstructionsHUD() {
  const el = document.getElementById('instructions');
  if (!el) return;
  if (win) {
    el.textContent = 'Stage Clear · Press R to restart';
  } else if (gameOver) {
    el.textContent = timedOut ? 'Time Up · Press R to restart' : 'Game Over · Press R to restart';
  } else if (!started) {
    el.textContent = isMobile ? 'Press UP to start' : 'Press UP arrow to start 👲🏻 Tiny Mario on your URL bar';
  } else {
    el.textContent = 'Use arrows to move. Collect coins, avoid enemies, and discover hidden underground areas.';
  }
}
function maybeUpdateBest() {
  if (coins > bestCoins) {
    bestCoins = coins;
    try { localStorage.setItem('bestCoins', String(bestCoins)); } catch {}
    updateHighHUD();
  }
}
function setupShare() {
  const btn = document.getElementById('share');
  if (!btn) return;
  btn.onclick = async () => {
    const text = `🍄👲🏻🏰 My high score is ${bestCoins} coins in Tiny Mario Bar! https://diego.horse/tiny-mario`;
    try {
      
        await navigator.clipboard.writeText(`${text}`);
        const prev = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = prev; }, 1200);

      if (navigator.share) {
          await navigator.share({ text });
      }
        
      
      
      
    } catch {}
  };
}

function setupUrlControls() {
  const display = document.getElementById('url-display');
  const minus = document.getElementById('url-font-minus');
  const plus = document.getElementById('url-font-plus');
  if (!display || !minus || !plus) return;
  let size = 14;
  try {
    const stored = parseInt(localStorage.getItem('urlFontSize') || '14', 10);
    if (!Number.isNaN(stored)) size = stored;
  } catch {}
  function apply() {
    display.style.fontSize = `${size}px`;
    try { localStorage.setItem('urlFontSize', String(size)); } catch {}
  }
  apply();
  plus.onclick = () => { size = Math.min(size + 1, 28); apply(); };
  minus.onclick = () => { size = Math.max(size - 1, 14); apply(); };
}
function onKeyDown(e) {
  keys.add(e.key);
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = -1;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 1;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    if (y === 0) {
      try { sfxJump.currentTime = 0; sfxJump.play(); } catch {}
      vy = JUMP_VELOCITY;
      jumpStartIndex = Math.floor(offset) + Math.floor(playerPos);
    }
  }
  // Enter underground with DOWN/S while on the first overworld pipe
  if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && !isUnderground && !(pipeAnim && pipeAnim.phase)) {
    const playerIndex = Math.floor(offset) + Math.floor(playerPos);
    const tile = getTileAt(playerIndex);
    // Use cached 4th overworld pipe index
    const entryPipeIdx = overworldPipeIndices.length >= 4 ? overworldPipeIndices[3] : -1;
    // Entry is allowed only on the 4th overworld pipe
    if (y === 0 && tile === PIPE_CHAR && undergroundWorld && entryPipeIdx !== -1 && playerIndex === entryPipeIdx) {
      prevOverworldOffset = offset;
      // compute target offset for underground start now
      let underStartOffset = 0;
      if (undergroundVisited && undergroundPipeIndices.length >= 4) {
        const targetIndex = undergroundPipeIndices[3];
        underStartOffset = Math.max(0, targetIndex - PLAYER_POS);
      }
      pipeAnim = {
        mode: 'enter',
        phase: 'over',
        framesOver: ['⠶','⠴','⠲'],
        idx: 0,
        t: 0,
        underStartOffset,
      };
      try { sfxPipe.currentTime = 0; sfxPipe.play(); } catch {}
      try { music.pause(); } catch {}
    }
  }
  // First input starts the game loop updates
  if (!started && (e.key === ' ' || e.key.startsWith('Arrow') || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'w')) {
    started = true;
    try { music.currentTime = 0; music.play(); } catch {}
    updateInstructionsHUD();
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

const urlRow = typeof document !== 'undefined' ? document.querySelector('.hud-url') : null;
const toggle = typeof document !== 'undefined' ? document.getElementById('toggle-url') : null;
if (urlRow) {
  // Ensure visible by default using stylesheet (flex); empty inline style lets CSS apply
  urlRow.style.display = '';
}
if (toggle && urlRow) {
  // Set initial label based on current visibility
  const currentlyVisible = urlRow.style.display !== 'none';
  toggle.textContent = currentlyVisible ? 'Hide URL' : 'Show URL';
  toggle.addEventListener('click', () => {
    const visible = urlRow.style.display !== 'none';
    urlRow.style.display = visible ? 'none' : '';
    toggle.textContent = visible ? 'Show URL' : 'Hide URL';
  });
}

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
    slice = isUnderground && undergroundRaw ? undergroundRaw.slice(i0, i1) : world.slice(i0, i1);
  } else {
    slice = isUnderground && undergroundRaw ? undergroundRaw.slice(i0) : world.slice(i0);
    const padLen = i1 - world.length;
    slice += (isUnderground ? '⠿' : GROUND_CHAR).repeat(padLen);
  }
  const chars = slice.split('');
  // Overlay enemies into chars for display
  for (const e of enemies) {
    if (e.idx >= i0 && e.idx < i1) {
      const under = getTileAt(e.idx);
      chars[e.idx - i0] = (under === COIN_CHAR) ? COIN_ENEMY_CHAR : ENEMY_CHAR;
    }
  }
  const playerWorldIndex = i0 + Math.floor(playerPos);
  const tileUnderPlayer = getTileAt(playerWorldIndex);
  const enemyHere = enemies.some((e) => e.idx === playerWorldIndex);
  if (y > 0) {
    // While airborne, show pipe variant if above a pipe, else jump variant
    if (tileUnderPlayer === PIPE_CHAR) {
      chars[Math.floor(playerPos)] = isUnderground ? '⠯' : PIPE_PLAYER_CHAR;
    } else if (enemyHere) {
      chars[Math.floor(playerPos)] = JUMP_ENEMY_CHAR;
    } else {
      chars[Math.floor(playerPos)] = (tileUnderPlayer === HOLE_CHAR) ? JUMP_HOLE_CHAR : JUMP_GROUND_CHAR;
    }
  } else {
    if (tileUnderPlayer === PIPE_CHAR) {
      chars[Math.floor(playerPos)] = isUnderground ? '⠯' : PIPE_PLAYER_CHAR;
    } else if (tileUnderPlayer === COIN_CHAR) {
      chars[Math.floor(playerPos)] = COIN_PLAYER_CHAR;
    } else {
      chars[Math.floor(playerPos)] = PLAYER_CHAR;
    }
  }
  // Override player glyph while pipe animation is active
  if (pipeAnim && pipeAnim.phase) {
    let frameGlyph = PLAYER_CHAR;
    if (pipeAnim.mode === 'enter') {
      if (pipeAnim.phase === 'over') {
        const frames = pipeAnim.framesOver || pipeAnim.frames || PIPE_ENTER_OVER_FRAMES;
        frameGlyph = frames[Math.min(pipeAnim.idx, frames.length - 1)];
      } else {
        const framesUnder = PIPE_ENTER_UNDER_FRAMES;
        frameGlyph = framesUnder[Math.min(pipeAnim.idx, framesUnder.length - 1)];
      }
    } else if (pipeAnim.mode === 'exit') {
      if (pipeAnim.phase === 'under') {
        const framesUnderExit = PIPE_EXIT_UNDER_FRAMES;
        frameGlyph = framesUnderExit[Math.min(pipeAnim.idx, framesUnderExit.length - 1)];
      } else {
        const framesOverExit = PIPE_EXIT_OVER_FRAMES;
        frameGlyph = framesOverExit[Math.min(pipeAnim.idx, framesOverExit.length - 1)];
      }
    }
    chars[Math.floor(playerPos)] = frameGlyph;
  }
  // On game over, show skull at the player's position
  if (gameOver) {
    chars[Math.floor(playerPos)] = '💀';
  }
  const status = win ? '' : '';
  const coinNum = String(coins % 100).padStart(2, '0');
  const coinStr = `🟡${coinNum}⠿`;
  const timeNum = String(Math.floor(timeLeft) % 100).padStart(2, '0');
  const timeStr = `⏱${timeNum}`;
  // Rolling marquee messages for start and game over
  let showMarquee = false;
  let marquee = '';
  if (!started && !gameOver && !win) {
    showMarquee = true;
    const msg = 'PRESS⠤UP⠤TO⠤START';
    const base = (msg + '⠤'.repeat(SCENE_LENGTH/2));
    const idx = Math.floor(marqueeOffset) % base.length;
    marquee = (base.slice(idx) + base.slice(0, idx));
  } else if (gameOver) {
    showMarquee = true;
    const msg = timedOut ? 'TIME⠤UP⠤⠤⠤⠤PRESS⠤R⠤TO⠤RESTART' : 'GAME⠤OVER⠤⠤⠤⠤⠤PRESS⠤R⠤TO⠤RESTART';
    const base = (msg + '⠤'.repeat(SCENE_LENGTH/2));
    const idx = Math.floor(marqueeOffset) % base.length;
    marquee = (base.slice(idx) + base.slice(0, idx));
  } else if (win) {
    showMarquee = true;
    const msg = 'STAGE⠤CLEAR⠤⠤⠤⠤⠤⚑⠤⠤⠤⠤⠤PRESS⠤R⠤TO⠤RESTART';
    const base = (msg + '⠤'.repeat(SCENE_LENGTH/2));
    const idx = Math.floor(marqueeOffset) % base.length;
    marquee = (base.slice(idx) + base.slice(0, idx));
  }
  // If marquee active, overlay it into the scene to the right of the player
  if (showMarquee) {
    const start = Math.min(Math.floor(playerPos) + 1, SCENE_LENGTH);
    const spaceRight = Math.max(0, SCENE_LENGTH - start);
    const overlay = marquee.slice(0, spaceRight);
    for (let i = 0; i < overlay.length; i++) {
      const pos = start + i;
      if (pos >= 0 && pos < SCENE_LENGTH) {
        chars[pos] = overlay[i];
      }
    }
  }
  const s = coinStr + timeStr + chars.join('') + status;
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
    // Mirror into in-page URL display at the same throttled cadence
    try {
      const ud = document.getElementById('url-display');
      if (ud) ud.textContent = s;
    } catch {}
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
  if (started && !gameOver && !win && !(pipeAnim && pipeAnim.phase)) update(dt);
  // Advance pipe animation frames and handle world switch mid-sequence
  if (pipeAnim && pipeAnim.phase) {
    pipeAnim.t += dt;
    if (pipeAnim.t >= PIPE_ANIM_FRAME_DUR) {
      pipeAnim.t = 0;
      pipeAnim.idx++;
      if (pipeAnim.mode === 'enter') {
        const overLen = (pipeAnim.framesOver || pipeAnim.frames || ['⠶','⠴','⠲']).length;
        if (pipeAnim.phase === 'over' && pipeAnim.idx >= overLen) {
          // Switch to underground and start the underground-side animation
          world = undergroundWorld;
          isUnderground = true;
          offset = pipeAnim.underStartOffset;
          // rebuild enemies for underground
          enemies = [];
          for (let i = 0; i < world.length; i++) {
            if (world[i] === ENEMY_CHAR) {
              enemies.push({ idx: i, dir: -1, acc: 0 });
              setTileAt(i, GROUND_CHAR);
            }
          }
          try { musicUnderground.currentTime = 0; musicUnderground.play(); } catch {}
          undergroundVisited = true;
          updateInstructionsHUD();
          pipeAnim.phase = 'under';
          pipeAnim.idx = 0;
        } else if (pipeAnim.phase === 'under' && pipeAnim.idx >= 3) {
          // Entry animation complete
          pipeAnim = null;
        }
      } else if (pipeAnim.mode === 'exit') {
        if (pipeAnim.phase === 'under' && pipeAnim.idx >= 3) {
          // Switch to overworld now and start over-phase exit frames
          world = initialWorld;
          isUnderground = false;
          // Place at 5th overworld pipe (cached), fallback to previous offset if missing
          {
            const target = overworldPipeIndices.length >= 5 ? overworldPipeIndices[4] : -1;
            if (target !== -1) {
              offset = Math.max(0, target - PLAYER_POS);
            } else {
              offset = prevOverworldOffset + 1;
            }
          }
          // rebuild enemies for overworld
          enemies = [];
          for (let i = 0; i < world.length; i++) {
            if (world[i] === ENEMY_CHAR) {
              enemies.push({ idx: i, dir: -1, acc: 0 });
              setTileAt(i, GROUND_CHAR);
            }
          }
          try { musicUnderground.pause(); } catch {}
          try { music.currentTime = 0; music.play(); } catch {}
          updateInstructionsHUD();
          pipeAnim.phase = 'over';
          pipeAnim.idx = 0;
        } else if (pipeAnim.phase === 'over') {
          const overExitLen = 3; // ⠲ ⠴ ⠶
          if (pipeAnim.idx >= overExitLen) {
            pipeAnim = null;
          }
        }
      }
    }
  }
  // Drain remaining time into coins after win
  if (win && timeLeft > 0) {
    const before = Math.floor(timeLeft);
    timeLeft = Math.max(0, timeLeft - TIME_DRAIN_RATE * dt);
    const after = Math.floor(timeLeft);
    const gained = before - after;
    if (gained > 0) {
      coins += gained;
      try { sfxCoin.currentTime = 0; sfxCoin.play(); } catch {}
      maybeUpdateBest();
      updateScoreHUD();
    }
  }
  render();
  requestAnimationFrame(tick);
}

function update(dt) {
  // Horizontal movement with pipe collision on ground and coin rules in air
  const prevOffset = offset;
  const prevY = y; // track previous vertical position to detect landings
  // Allow on-screen sliding only near the start so the rest of the time the player stays centered
  let skipOffsetMove = false;
  if (!isUnderground && offset < 1 && dir !== 0) {
    if ((dir < 0 && playerPos > 0) || (dir > 0 && playerPos < PLAYER_POS)) {
      let intendedPlayerPos = playerPos + dir * SPEED * dt;
      if (intendedPlayerPos < 0) intendedPlayerPos = 0;
      if (intendedPlayerPos > PLAYER_POS) intendedPlayerPos = PLAYER_POS;
      playerPos = intendedPlayerPos;
      skipOffsetMove = true; // keep camera fixed while sliding on screen
    }
  }
  let intended = offset + (skipOffsetMove ? 0 : dir * SPEED * dt);
  if (intended < 0) intended = 0;
  const nextIndex = Math.floor(intended) + Math.floor(playerPos);
  const nextTile = getTileAt(nextIndex);
  const currIndex = Math.floor(offset) + Math.floor(playerPos);
  const currTile = getTileAt(currIndex);
  // Ground: block by pipes (except inverted ⠭/⠯ underground) and underground walls, and cap by last underground pipe
  if (y === 0) {
    if (nextTile === PIPE_CHAR && currTile !== PIPE_CHAR) {
      // In underground, treat inverted pipes (⠭/⠯) as pass-through horizontally
      let isPassThrough = false;
      if (isUnderground && undergroundRaw) {
        const rawCh = undergroundRaw[nextIndex] || '';
        if (rawCh === '⠭' || rawCh === '⠯') isPassThrough = true;
      }
      if (!isPassThrough) {
        intended = prevOffset; // blocked by pipe front
      }
    }
    // In underground, walls (⠿) block horizontal movement
    if (isUnderground && undergroundRaw) {
      const rawCh = undergroundRaw[nextIndex] || '';
      if (rawCh === '⠿') {
        intended = prevOffset;
      }
      // Also prevent moving beyond the 5th underground pipe
      const pipeIdxs = [];
      for (let i = 0; i < world.length; i++) if (world[i] === PIPE_CHAR) pipeIdxs.push(i);
      const fifthPipe = pipeIdxs.length >= 5 ? pipeIdxs[4] : -1;
      if (fifthPipe !== -1 && nextIndex > fifthPipe) {
        intended = prevOffset;
      }
    }
  } else {
    // Airborne: block lateral entry into coins unless it's the coin directly above jump start
    if (nextTile === COIN_CHAR && nextIndex !== jumpStartIndex) {
      intended = prevOffset; // blocked by coin side in air
    }
  }
  offset = intended;
  // Away from start region, maintain centered player
  if (offset >= 1) playerPos = PLAYER_POS;
  // Underground always centered (walls at indices 0..2)
  if (isUnderground) playerPos = PLAYER_POS;

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

  const playerIndex = Math.floor(offset) + Math.floor(playerPos);
  const currentTile = getTileAt(playerIndex);
  // Exit underground when jumping at the LAST inverted pipe (⠭/⠯): run reverse animation
  if (isUnderground && y > 0 && currentTile === PIPE_CHAR && !(pipeAnim && pipeAnim.phase)) {
    let lastInvIdx = -1;
    if (undergroundRaw) {
      for (let i = 0; i < undergroundRaw.length; i++) {
        const ch = undergroundRaw[i];
        if (ch === '⠭' || ch === '⠯') lastInvIdx = i;
      }
    }
    if (lastInvIdx !== -1 && playerIndex === lastInvIdx) {
      try { sfxPipe.currentTime = 0; sfxPipe.play(); } catch {}
      pipeAnim = { mode: 'exit', phase: 'under', idx: 0, t: 0 };
    }
  }
  // Win if touching flag
  if (currentTile === FLAG_CHAR) {
    if (!win) {
      win = true;
      dir = 0; vy = 0;
      try { music.pause(); } catch {}
      try { musicUnderground.pause(); } catch {}
      try { sfxClear.currentTime = 0; sfxClear.play(); } catch {}
      updateInstructionsHUD();
      updateMobileUpLabel();
    }
    // continue update; other interactions are irrelevant once won
  }
  // Enemy interactions using dynamic enemy positions
  const enemyIndex = enemies.findIndex((e) => e.idx === playerIndex);
  // Stomp only when actually landing on the tile (prevY>0 and now on ground)
  if (prevY > 0 && y === 0 && enemyIndex !== -1) {
    coins += 1;
    // Do not alter underlying tile (could be a coin)
    enemies.splice(enemyIndex, 1);
    vy = JUMP_VELOCITY * 0.6; // bounce
    try {
      const s = sfxStomp || sfxCoin;
      s.currentTime = 0; s.play();
    } catch {}
    maybeUpdateBest();
    updateScoreHUD();
  } else if (y === 0 && enemyIndex !== -1) {
    // Walking into an enemy on the ground kills the player
    gameOver = true;
    dir = 0; vy = 0;
    try { music.pause(); } catch {}
    try { sfxDie.currentTime = 0; sfxDie.play(); } catch {}
    updateMobileUpLabel();
    return;
  }
  // Collect coin only when ascending from directly below the coin you jumped under
  if (y > 0 && vy > 0 && currentTile === COIN_CHAR && playerIndex === jumpStartIndex) {
    coins += 1;
    setTileAt(playerIndex, GROUND_CHAR);
    try { sfxCoin.currentTime = 0; sfxCoin.play(); } catch {}
    // Dampen upward velocity to shorten jump duration
    if (vy > 0) {
      vy *= 0.4;
    }
    // After collecting, prevent further coin checks tied to this jump index
    jumpStartIndex = -1;
    maybeUpdateBest();
    updateScoreHUD();
    // Keep underground visuals in sync when collecting a coin
    if (isUnderground && undergroundRaw && undergroundRaw[playerIndex] === '⠥') {
      undergroundRaw = undergroundRaw.substring(0, playerIndex) + '⠤' + undergroundRaw.substring(playerIndex + 1);
    }
  }
  // Immediate game over if landed in a hole
  if (y === 0 && currentTile === HOLE_CHAR) {
    gameOver = true;
    dir = 0; vy = 0;
    try { music.pause(); } catch {}
    try { musicUnderground.pause(); } catch {}
    try { sfxDie.currentTime = 0; sfxDie.play(); } catch {}
    updateInstructionsHUD();
    updateMobileUpLabel();
    return;
  }
  // When on ground (non-hole), clamp vertical velocity
  if (y === 0 && currentTile !== HOLE_CHAR) {
    vy = 0;
    // Reset jump start upon landing
    jumpStartIndex = -1;
  }
  // Level timer countdown (only while playing)
  if (started && !gameOver && !win && timeLeft > 0) {
    const before = timeLeft;
    timeLeft = Math.max(0, timeLeft - TIME_TICK_RATE * dt);
    if (before > 0 && timeLeft === 0) {
      // Timeout -> game over
      timedOut = true;
      gameOver = true;
      dir = 0; vy = 0;
      try { music.pause(); } catch {}
      try { musicUnderground.pause(); } catch {}
      try { sfxDie.currentTime = 0; sfxDie.play(); } catch {}
      updateInstructionsHUD();
      updateMobileUpLabel();
      return;
    }
  }
}

function init() {
  const loaded = loadWorldFromGlobal() || loadWorldInline();
  world = loaded && loaded.length ? loaded : DEFAULT_WORLD;
  initialWorld = world;
  // Cache overworld pipe indices from the initial world
  overworldPipeIndices = [];
  for (let i = 0; i < initialWorld.length; i++) {
    if (initialWorld[i] === PIPE_CHAR) overworldPipeIndices.push(i);
  }
  // Prepare underground world if present
  try {
    if (typeof window !== 'undefined' && window.LEVEL_WORLD_1_1_UNDERGROUND) {
      undergroundRaw = String(window.LEVEL_WORLD_1_1_UNDERGROUND);
      undergroundRawInitial = undergroundRaw;
      rebuildUndergroundFromRaw();
    }
  } catch {}
  // Extract enemies from world into dynamic list and clear them from world tiles
  enemies = [];
  for (let i = 0; i < world.length; i++) {
    if (world[i] === ENEMY_CHAR) {
      enemies.push({ idx: i, dir: -1, acc: 0 });
      setTileAt(i, GROUND_CHAR);
    }
  }
  updateHighHUD();
  updateScoreHUD();
  updateInstructionsHUD();
  setupShare();
  // Initialize URL HUD visibility per platform
  try {
    const urlRow = document.querySelector('.hud-url');
    const toggleBtn = document.getElementById('toggle-url');
    if (urlRow) {
      const shouldShow = isMobile || isSafari;
      urlRow.style.display = shouldShow ? 'flex' : 'none';
      if (toggleBtn) toggleBtn.textContent = shouldShow ? 'Hide URL' : 'Show URL';
    }
  } catch {}
  setupUrlControls();
  setupMobileControls();
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
  timeLeft = 60;
  if (initialWorld) world = initialWorld;
  isUnderground = false;
  prevOverworldOffset = 0;
  undergroundVisited = false;
  // Restore underground visuals and logic to initial state
  if (undergroundRawInitial) {
    undergroundRaw = undergroundRawInitial;
    rebuildUndergroundFromRaw();
  }
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
  try { sfxDie.pause(); sfxDie.currentTime = 0; } catch {}
  try { sfxClear.pause(); sfxClear.currentTime = 0; } catch {}
  try { musicUnderground.pause(); musicUnderground.currentTime = 0; } catch {}
  try { music.currentTime = 0; music.play(); } catch {}
  updateHighHUD();
  updateScoreHUD();
  timedOut = false;
  updateInstructionsHUD();
  updateMobileUpLabel();
}
