// Nokia Snake — Green Edition
// Grid-based snake on a canvas. Arrow keys control the snake.
// Each food increases the snake length and slightly increases movement speed.

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

  // Game settings
  const gridSize = 20; // number of cells per row/column
  const cell = canvas.width / gridSize; // pixel size of each cell

  const initialSpeed = 5; // moves per second (keeps it slow -> easy to control)
  const speedIncrease = 0.3; // additional moves/sec after each food (small)
  const maxSpeed = 25;

  // Colors (green scheme)
  const colors = {
    bg: '#072617',
    grid: '#0b3f1b',
    snakeHead: '#adebad',
    snakeBody: '#55c16a',
    food: '#dfffe6',
    border: '#053216'
  };

  // Game state
  let snake = [];
  let dir = { x: 1, y: 0 }; // current direction vector
  let nextDir = { x: 1, y: 0 }; // queued direction (prevents immediate reverse)
  let food = { x: 0, y: 0 };
  let score = 0;
  let speed = initialSpeed;
  let moveInterval = null;
  let lastTick = 0;
  let running = false;
  let growPending = 0;

  // Initialize or reset the game
  function reset() {
    // Ensure head is the first element and neck is behind it (opposite of dir)
    const cx = Math.floor(gridSize / 2);
    const cy = Math.floor(gridSize / 2);

    // With initial dir {x:1,y:0} the neck should be to the left of the head.
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
    // find a free cell
    let tries = 0;
    while (true) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      if (!snake.some(s => s.x === x && s.y === y)) {
        food = { x, y };
        return;
      }
      if (++tries > 1000) {
        // no free cell (very full) -> end
        break;
      }
    }
  }

  function drawCell(x, y, color, inset = 0) {
    const px = x * cell + inset;
    const py = y * cell + inset;
    const size = cell - inset * 2;
    ctx.fillStyle = color;
    ctx.fillRect(px, py, size, size);
  }

  function draw() {
    // background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle grid (optional)
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
    drawCell(food.x, food.y, colors.food, 4);
    // draw snake body
    for (let i = 0; i < snake.length; i++) {
      const part = snake[i];
      const inset = i === 0 ? 3 : 5; // head is slightly larger
      const color = i === 0 ? colors.snakeHead : colors.snakeBody;
      drawCell(part.x, part.y, color, inset);
    }
  }

  function updateHUD() {
    scoreEl.textContent = score;
    // show speed rounded to 1 decimal
    speedEl.textContent = (Math.round(speed * 10) / 10).toFixed(1);
  }

  function step() {
    // apply queued direction but disallow reversing if length>1
    if (snake.length > 1) {
      const head = snake[0];
      const neck = snake[1];
      // if nextDir would reverse, ignore it
      if (!(head.x + nextDir.x === neck.x && head.y + nextDir.y === neck.y)) {
        dir = nextDir;
      }
    } else {
      dir = nextDir;
    }

    const newHead = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // check wall collision (no wrapping — classic behavior)
    if (newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize) {
      gameOver('You hit the wall!');
      return;
    }

    // check self collision
    if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      gameOver('You ran into yourself!');
      return;
    }

    // add new head
    snake.unshift(newHead);

    // check food
    if (newHead.x === food.x && newHead.y === food.y) {
      score += 1;
      growPending += 1; // grow by not removing tail this tick
      // increase speed a bit
      speed = Math.min(maxSpeed, speed + speedIncrease);
      spawnFood();
      updateHUD();
      // reset the interval so speed change takes effect
      restartTicker();
    }

    // handle growth (if no growth pending, remove tail)
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

  // Ticker using setInterval; we recreate interval when speed changes
  function restartTicker() {
    stopTicker();
    const ms = 1000 / speed;
    moveInterval = setInterval(step, ms);
    lastTick = performance.now();
    running = true;
  }

  function stopTicker() {
    if (moveInterval) {
      clearInterval(moveInterval);
      moveInterval = null;
    }
    running = false;
  }

  // input handling
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    // handle arrows only
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      const mapping = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      };
      const nd = mapping[key];
      // prevent reversing directly: we only set nextDir
      if (snake.length > 1) {
        const head = snake[0];
        const neck = snake[1];
        // if nd is reverse of current dir, ignore
        if (head.x + nd.x === neck.x && head.y + nd.y === neck.y) {
          return;
        }
      }
      nextDir = nd;
    } else if (key === ' ' || key === 'Enter') {
      // space or enter to restart if not running
      if (!running) {
        startGame();
      }
    }
  });

  startBtn.addEventListener('click', startGame);
  overlayBtn.addEventListener('click', startGame);

  function startGame() {
    reset();
    draw();
    restartTicker();
  }

  function showOverlay(title, msg) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  // initial draw
  reset();
  draw();

  // expose to window for debugging (optional)
  window.snakeGame = {
    start: startGame,
    stop: () => { stopTicker(); },
    reset,
  };
})();