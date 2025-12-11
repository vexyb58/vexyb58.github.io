// game.js
(() => {
  // Canvas setup
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Game constants
  const W = canvas.width;
  const H = canvas.height;
  const GROUND_HEIGHT = 80;
  const GRAVITY = 1800; // px/s^2
  const JUMP_VELOCITY = -700; // px/s
  const PLAYER_SIZE = 40;
  const INITIAL_GAME_SPEED = 420; // px/s (how fast world moves left)
  const OBSTACLE_MIN_GAP = 220; // min px between obstacles (from right edge spawn)
  const OBSTACLE_MAX_GAP = 520;
  const OBSTACLE_MIN_WIDTH = 30;
  const OBSTACLE_MAX_WIDTH = 70;
  const OBSTACLE_MIN_HEIGHT = 30;
  const OBSTACLE_MAX_HEIGHT = 120;
  const SPEED_INCREASE_RATE = 0.02; // how much speed increases per second
  const SCORE_PER_SECOND = 10; // points per second survived

  // Game state
  let lastTime = performance.now();
  let accumulated = 0;
  let gameSpeed = INITIAL_GAME_SPEED;
  let score = 0;
  let best = Number(localStorage.getItem('gd_clone_best') || 0);

  let gameOver = false;
  let paused = false;
  let running = true; // overall app running (for future use)

  // Player object
  const player = {
    x: 100,
    y: H - GROUND_HEIGHT - PLAYER_SIZE,
    w: PLAYER_SIZE,
    h: PLAYER_SIZE,
    vy: 0,
    grounded: true,
    color: '#ffd166',
    // simple dash visual (not necessary)
  };

  // Ground (just a rect)
  const ground = {
    x: 0,
    y: H - GROUND_HEIGHT,
    w: W,
    h: GROUND_HEIGHT,
    color: '#2b2d42',
  };

  // Obstacles array
  const obstacles = [];

  // Helpers
  function randBetween(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function resetGame() {
    obstacles.length = 0;
    player.y = H - GROUND_HEIGHT - PLAYER_SIZE;
    player.vy = 0;
    player.grounded = true;
    gameSpeed = INITIAL_GAME_SPEED;
    score = 0;
    lastTime = performance.now();
    gameOver = false;
    paused = false;
    // spawn first obstacle a little off-screen
    spawnObstacle(W + 120);
  }

  // Spawn an obstacle at given x (if omitted, spawn right edge + gap)
  function spawnObstacle(x) {
    const w = randBetween(OBSTACLE_MIN_WIDTH, OBSTACLE_MAX_WIDTH);
    const h = randBetween(OBSTACLE_MIN_HEIGHT, OBSTACLE_MAX_HEIGHT);
    const spawnX = x ?? W + randBetween(OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP);
    obstacles.push({
      x: spawnX,
      y: H - GROUND_HEIGHT - h,
      w,
      h,
      passed: false,
      color: '#ef233c',
    });
  }

  // Collisions: axis-aligned bounding boxes
  function rectsOverlap(a, b) {
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  // Input handling
  let wantJump = false;

  function doJump() {
    if (!gameOver && (player.grounded || player.vy > -40)) {
      player.vy = JUMP_VELOCITY;
      player.grounded = false;
    } else if (gameOver) {
      // restart on jump press after game over
      resetGame();
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      wantJump = true;
    } else if (e.code === 'KeyP') {
      paused = !paused;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      wantJump = false;
    }
  });

  // Mouse click / touch to jump or restart
  canvas.addEventListener('mousedown', () => {
    if (gameOver) resetGame();
    else wantJump = true;
  });
  canvas.addEventListener('mouseup', () => { wantJump = false; });
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameOver) resetGame();
    else wantJump = true;
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    wantJump = false;
  }, { passive: false });

  // Main update loop
  function update(dt) {
    if (gameOver || paused) return;

    // physics - jump
    if (wantJump) {
      doJump();
      // short hop if holding — but we just let it be normal jump
    }

    // apply gravity
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    // ground collision
    if (player.y + player.h >= ground.y) {
      player.y = ground.y - player.h;
      player.vy = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }

    // move obstacles left
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.x -= gameSpeed * dt;

      // Passed check for scoring (when their right edge crosses player's left)
      if (!ob.passed && ob.x + ob.w < player.x) {
        ob.passed = true;
      }

      // remove off-screen
      if (ob.x + ob.w < -50) obstacles.splice(i, 1);
    }

    // spawn new obstacles when none or last one is far enough left
    if (obstacles.length === 0) {
      spawnObstacle(W + randBetween(60, 220));
    } else {
      const last = obstacles[obstacles.length - 1];
      if (last.x + last.w < W - randBetween(OBSTACLE_MIN_GAP, OBSTACLE_MAX_GAP)) {
        spawnObstacle();
      }
    }

    // collisions
    for (const ob of obstacles) {
      if (rectsOverlap(player, ob)) {
        // trigger game over
        gameOver = true;
        if (score > best) {
          best = Math.floor(score);
          localStorage.setItem('gd_clone_best', best);
        }
      }
    }

    // speed increases gradually
    gameSpeed += SPEED_INCREASE_RATE * dt * 1000 * 0.001; // small ramp (keeps controlled)

    // scoring by time alive: incremental
    score += SCORE_PER_SECOND * dt;
  }

  // Draw functions
  function drawRoundedRect(x, y, w, h, r) {
    r = r || 6;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function render() {
    // clear
    ctx.clearRect(0, 0, W, H);

    // background grid / subtle pattern (parallax squares)
    drawBackground();

    // ground
    ctx.fillStyle = ground.color;
    ctx.fillRect(ground.x, ground.y, ground.w, ground.h);

    // obstacles
    for (const ob of obstacles) {
      ctx.fillStyle = ob.color;
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      // top highlight
      ctx.globalAlpha = 0.15;
      ctx.fillRect(ob.x, ob.y, ob.w, 6);
      ctx.globalAlpha = 1;
    }

    // player (square)
    ctx.fillStyle = player.color;
    drawRoundedRect(player.x, player.y, player.w, player.h, 6);

    // Player shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(player.x + 6, H - GROUND_HEIGHT, player.w, 8);

    // UI: score
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px system-ui, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${Math.floor(score)}`, 18, 30);

    // Best
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${best}`, W - 18, 30);

    // instructions
    ctx.font = '14px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`Space / Click / Tap to jump. P to pause. Click/Tap to restart on game over.`, W / 2, H - 18);

    // game over overlay
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px system-ui, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', W / 2, H / 2 - 20);
      ctx.font = '18px system-ui, Arial, sans-serif';
      ctx.fillText(`Score: ${Math.floor(score)}   Best: ${best}`, W / 2, H / 2 + 12);
      ctx.font = '16px system-ui, Arial, sans-serif';
      ctx.fillText('Click or Tap to Restart', W / 2, H / 2 + 44);
    }

    // paused overlay
    if (paused && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px system-ui, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Paused', W / 2, H / 2);
    }
  }

  // simple dynamic background (parallax rectangles)
  const bgRects = [];
  function initBackground() {
    bgRects.length = 0;
    for (let i = 0; i < 18; i++) {
      bgRects.push({
        x: Math.random() * W,
        y: Math.random() * (H - GROUND_HEIGHT),
        w: randBetween(30, 140),
        h: randBetween(8, 22),
        speedMult: 0.15 + Math.random() * 0.5,
        alpha: 0.04 + Math.random() * 0.08,
      });
    }
  }
  function drawBackground() {
    for (const r of bgRects) {
      ctx.fillStyle = `rgba(0,0,0,${r.alpha})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      // move left slowly for parallax
      r.x -= gameSpeed * 0.001 * r.speedMult;
      if (r.x + r.w < 0) r.x = W + Math.random() * 200;
    }
  }

  // Main loop w/ fixed timestep for stable physics
  const FIXED_DT = 1 / 120; // 120 updates per second max for physics
  function loop(now) {
    if (!running) return;
    const realDt = (now - lastTime) / 1000;
    lastTime = now;

    // Cap realDt to avoid spiraling after a tab switch
    const cappedDt = Math.min(realDt, 0.033);

    accumulated += cappedDt;
    let steps = 0;
    while (accumulated >= FIXED_DT && steps < 6) {
      update(FIXED_DT);
      accumulated -= FIXED_DT;
      steps++;
    }

    render();
    requestAnimationFrame(loop);
  }

  // Kick off
  initBackground();
  resetGame();
  requestAnimationFrame(loop);

  // Responsiveness: scale canvas while keeping internal resolution
  function fitCanvasToWindow() {
    // We'll scale up/down to fit the smaller dimension while preserving aspect ratio.
    const maxScale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const scale = Math.max(0.6, Math.min(maxScale, 1.4));
    canvas.style.transform = `scale(${scale})`;
    canvas.style.transformOrigin = 'center';
  }
  window.addEventListener('resize', fitCanvasToWindow);
  fitCanvasToWindow();

  // Expose a simple debug console on window for tinkering
  window.__gd = {
    resetGame,
    spawnObstacle: (x) => spawnObstacle(x ?? W + 100),
    setSpeed: (s) => { gameSpeed = s; },
    getState: () => ({
      score: Math.floor(score),
      best,
      gameSpeed,
      obstacles: obstacles.map(o => ({ x: o.x, y: o.y, w: o.w, h: o.h })),
    }),
  };
})();
