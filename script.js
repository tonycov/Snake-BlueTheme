// Nokia Snake — Blue Edition
// Grid-based snake on a canvas. Arrow keys and on-screen D-pad control the snake.

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const speedEl = document.getElementById('speed');
  const startBtn = document.getElementById('startBtn');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMsg = document.getElementById('overlayMsg');
  const overlayBtn = document.getElementById('overlayBtn');
  const mobileControls = document.getElementById('mobileControls');

  const container = document.querySelector('.container');

  // Game settings
  const gridSize = 20; // number of cells per row/column
  let cell = 0;        // pixel size of each cell (calculated on resize)

  const initialSpeed = 5; // moves per second
  const speedIncrease = 0.3;
  const maxSpeed = 25;

  // Colors (blue scheme)
  const colors = {
    bg: '#031428',
    grid: '#052e44',
    snakeHead: '#9fe9ff',
    snakeBody: '#3fb0ff',
    food: '#e6fbff',
    border: '#022033'
  };

  // Game state
  let snake = [];
  let dir = { x: 1, y: 0 }; // current direction vector
  let nextDir = { x: 1, y: 0 }; // queued direction (prevents immediate reverse)
  let food = { x: 0, y: 0 };
  let score = 0;
  let speed = initialSpeed;
  let moveInterval = null;
  let running = false;
  let growPending = 0;

  function resizeCanvas() {
    // Make the canvas square using the computed CSS size for crisp scaling.
    // We use the actual displayed width (clientWidth) for internal resolution.
    const maxSize = Math.min(400, container.clientWidth - 36);
    const size = Math.max(160, Math.floor(maxSize)); // clamp to reasonable minimum
    canvas.width = size;
    canvas.height = size;
    cell = canvas.width / gridSize;
    draw(); // redraw at new size
  }

  // Initialize or reset the game
  function reset() {
    const cx = Math.floor(gridSize / 2);
    const cy = Math.floor(gridSize / 2);
    snake = [
      { x: cx, y: cy },           // head
      { x: cx - 1, y: cy },       // neck (behind head)
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    speed = initialSpeed;
    growPending = 0;
    spawnFood();
    updateHUD();
    hideOverlay();
  }

  function spawnFood() {
    let tries = 0;
    while (true) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      if (!snake.some(s => s.x === x && s.y === y)) {
        food = { x, y };
        return;
      }
      if (++tries > 1000) break;
    }
  }

  function drawCell(x, y, color, inset = 0) {
    const px = Math.round(x * cell + inset);
    const py = Math.round(y * cell + inset);
    const size = Math.max(1, Math.round(cell - inset * 2));
    ctx.fillStyle = color;
    ctx.fillRect(px, py, size, size);
  }

  function draw() {
    // background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle grid
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvas.width, pos);
      ctx.stroke();
    }

    // draw food
    drawCell(food.x, food.y, colors.food, Math.max(2, Math.floor(cell * 0.1)));
    // draw snake body
    for (let i = 0; i < snake.length; i++) {
      const part = snake[i];
      const inset = i === 0 ? Math.max(2, Math.floor(cell * 0.08)) : Math.max(3, Math.floor(cell * 0.12));
      const color = i === 0 ? colors.snakeHead : colors.snakeBody;
      drawCell(part.x, part.y, color, inset);
    }
  }

  function updateHUD() {
    scoreEl.textContent = score;
    speedEl.textContent = (Math.round(speed * 10) / 10).toFixed(1);
  }

  function step() {
    // apply queued direction but disallow reversing if length>1
    if (snake.length > 1) {
      const head = snake[0];
      const neck = snake[1];
      if (!(head.x + nextDir.x === neck.x && head.y + nextDir.y === neck.y)) {
        dir = nextDir;
      }
    } else {
      dir = nextDir;
    }

    const newHead = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // check wall collision (no wrapping)
    if (newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize) {
      gameOver('You hit the wall!');
      return;
    }

    // check self collision
    if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      gameOver('You ran into yourself!');
      return;
    }

    snake.unshift(newHead);

    // check food
    if (newHead.x === food.x && newHead.y === food.y) {
      score += 1;
      growPending += 1;
      speed = Math.min(maxSpeed, speed + speedIncrease);
      spawnFood();
      updateHUD();
      restartTicker();
    }

    if (growPending > 0) {
      growPending--;
    } else {
      snake.pop();
    }

    draw();
  }

  function gameOver(message) {
    running = false;
    showOverlay('Game Over', `${message} Score: ${score}`);
    stopTicker();
  }

  function restartTicker() {
    stopTicker();
    const ms = 1000 / speed;
    moveInterval = setInterval(step, ms);
    running = true;
  }

  function stopTicker() {
    if (moveInterval) {
      clearInterval(moveInterval);
      moveInterval = null;
    }
    running = false;
  }

  // Input helpers
  function setDirectionByVector(nd) {
    // prevent reversing directly when length>1
    if (snake.length > 1) {
      const head = snake[0];
      const neck = snake[1];
      if (head.x + nd.x === neck.x && head.y + nd.y === neck.y) {
        return;
      }
    }
    nextDir = nd;
  }

  function setDirectionFromName(name) {
    const mapping = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const nd = mapping[name];
    if (nd) setDirectionByVector(nd);
  }

  window.addEventListener('keydown', (e) => {
    const key = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      const mapping = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      const nd = mapping[key];
      setDirectionByVector(nd);
    } else if (key === ' ' || key === 'Enter') {
      if (!running) startGame();
    }
  });

  // D-pad / touch controls
  function attachDpadHandlers() {
    const buttons = document.querySelectorAll('.dpad-btn');
    buttons.forEach(btn => {
      // pointerdown covers mouse/touch/stylus
      btn.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        const dirName = btn.dataset.dir;
        setDirectionFromName(dirName);
      }, { passive: false });
      // also support click for non-touch
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const dirName = btn.dataset.dir;
        setDirectionFromName(dirName);
      });
    });
  }

  startBtn.addEventListener('click', startGame);
  overlayBtn.addEventListener('click', startGame);

  function startGame() {
    reset();
    draw();
    restartTicker();
    // move focus to canvas so arrow keys work immediately
    canvas.focus();
  }

  function showOverlay(title, msg) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  // Setup & initial draw
  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  // Call once on load
  attachDpadHandlers();
  resizeCanvas();
  reset();
  draw();

  // Expose for debugging (optional)
  window.snakeGame = {
    start: startGame,
    stop: () => { stopTicker(); },
    reset,
  };
})();