const scene = document.getElementById("scene");
const playerEl = document.getElementById("player");
const opponentEl = document.getElementById("opponent");
const ballEl = document.getElementById("ball");
const homeScoreEl = document.getElementById("home-score");
const awayScoreEl = document.getElementById("away-score");
const resetButton = document.getElementById("reset");
const kickButton = document.getElementById("kick");

const field = {
  width: 100,
  height: 160,
  minX: 0,
  minY: 0,
};

const player = {
  x: 50,
  y: 120,
  speed: 36,
  radius: 6,
};

const opponent = {
  x: 50,
  y: 40,
  speed: 24, // Slightly slower than player for balance
  radius: 6,
};

const ball = {
  x: 50,
  y: 90,
  vx: 0,
  vy: 0,
  radius: 4,
};

const score = {
  home: 0,
  away: 0,
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  kick: false,
};

const sound = {
  kick: new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YRAAAAAA"),
};

const scale = () => {
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  return {
    x: width / field.width,
    y: height / field.height,
  };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const resetPositions = () => {
  player.x = 50;
  player.y = 120;
  opponent.x = 50;
  opponent.y = 40;
  ball.x = 50;
  ball.y = 90;
  ball.vx = 0;
  ball.vy = 0;
};

const updateScore = () => {
  homeScoreEl.textContent = String(score.home);
  awayScoreEl.textContent = String(score.away);
};

const setKickActive = (active) => {
  input.kick = active;
  kickButton.classList.toggle("active", active);
};

const handleDirection = (dir, active) => {
  input[dir] = active;
  document.querySelector(`[data-dir="${dir}"]`).classList.toggle("active", active);
};

const connectButton = (button, onChange) => {
  const activate = (event) => {
    event.preventDefault();
    onChange(true);
  };
  const deactivate = (event) => {
    event.preventDefault();
    onChange(false);
  };
  button.addEventListener("pointerdown", activate);
  button.addEventListener("pointerup", deactivate);
  button.addEventListener("pointerleave", deactivate);
  button.addEventListener("pointercancel", deactivate);
};

const setupControls = () => {
  document.querySelectorAll("[data-dir]").forEach((button) => {
    const dir = button.dataset.dir;
    connectButton(button, (active) => handleDirection(dir, active));
  });
  connectButton(kickButton, setKickActive);
  resetButton.addEventListener("click", () => {
    score.home = 0;
    score.away = 0;
    updateScore();
    resetPositions();
  });

  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    " ": "kick",
  };

  window.addEventListener("keydown", (event) => {
    const dir = keyMap[event.key];
    if (!dir) return;
    if (dir === "kick") {
      setKickActive(true);
      return;
    }
    handleDirection(dir, true);
  });

  window.addEventListener("keyup", (event) => {
    const dir = keyMap[event.key];
    if (!dir) return;
    if (dir === "kick") {
      setKickActive(false);
      return;
    }
    handleDirection(dir, false);
  });
};

const distance = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
};

const updateOpponentAI = (dt) => {
  // Goal target for opponent is the bottom goal (50, 160)
  const goalX = 50;
  const goalY = 160;

  // Calculate ideal position behind the ball
  const ballToGoalX = goalX - ball.x;
  const ballToGoalY = goalY - ball.y;
  const distToGoal = Math.hypot(ballToGoalX, ballToGoalY);

  // Normalize and offset
  const offset = 10;
  const targetX = ball.x - (ballToGoalX / distToGoal) * offset;
  const targetY = ball.y - (ballToGoalY / distToGoal) * offset;

  // Move towards target
  const dx = targetX - opponent.x;
  const dy = targetY - opponent.y;
  const dist = Math.hypot(dx, dy);

  let moveSpeed = opponent.speed;

  // If close to ideal position, charge the ball!
  if (dist < 5) {
     const ballDx = ball.x - opponent.x;
     const ballDy = ball.y - opponent.y;
     opponent.x += (ballDx / Math.hypot(ballDx, ballDy)) * moveSpeed * 1.5 * dt;
     opponent.y += (ballDy / Math.hypot(ballDx, ballDy)) * moveSpeed * 1.5 * dt;
  } else {
     if (dist > 1) {
        opponent.x += (dx / dist) * moveSpeed * dt;
        opponent.y += (dy / dist) * moveSpeed * dt;
     }
  }

  // Clamp position
  opponent.x = clamp(opponent.x, field.minX + opponent.radius, field.width - opponent.radius);
  opponent.y = clamp(opponent.y, field.minY + opponent.radius, field.height - opponent.radius);

  // Ball interaction
  const ballGap = distance(opponent, ball);
  if (ballGap < opponent.radius + ball.radius + 2) {
      ball.vx += (ball.x - opponent.x) * 0.8 * dt;
      ball.vy += (ball.y - opponent.y) * 0.8 * dt;
  }

  // Player interaction
  const playerGap = distance(player, opponent);
  const minGap = player.radius + opponent.radius;
  if (playerGap < minGap) {
    const pushX = (player.x - opponent.x) / playerGap;
    const pushY = (player.y - opponent.y) / playerGap;
    const overlap = minGap - playerGap;

    // Push apart
    const pushFactor = 0.5;
    player.x += pushX * overlap * pushFactor;
    player.y += pushY * overlap * pushFactor;
    opponent.x -= pushX * overlap * pushFactor;
    opponent.y -= pushY * overlap * pushFactor;
  }
};

const checkGoal = () => {
  const goalWidth = 48;
  const goalX = (field.width - goalWidth) / 2;
  if (ball.y <= 10 && ball.x >= goalX && ball.x <= goalX + goalWidth) {
    score.home += 1;
    updateScore();
    resetPositions();
  }
  if (ball.y >= field.height - 10 && ball.x >= goalX && ball.x <= goalX + goalWidth) {
    score.away += 1;
    updateScore();
    resetPositions();
  }
};

const applyMovement = (dt) => {
  const direction = {
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
  };

  if (direction.x !== 0 || direction.y !== 0) {
    const length = Math.hypot(direction.x, direction.y);
    player.x += (direction.x / length) * player.speed * dt;
    player.y += (direction.y / length) * player.speed * dt;
  }

  player.x = clamp(player.x, field.minX + player.radius, field.width - player.radius);
  player.y = clamp(player.y, field.minY + player.radius, field.height - player.radius);

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  ball.vx *= 0.98;
  ball.vy *= 0.98;

  const maxX = field.width - ball.radius;
  const maxY = field.height - ball.radius;
  const minX = field.minX + ball.radius;
  const minY = field.minY + ball.radius;

  if (ball.x <= minX || ball.x >= maxX) {
    ball.vx *= -0.7;
  }
  if (ball.y <= minY || ball.y >= maxY) {
    ball.vy *= -0.7;
  }

  ball.x = clamp(ball.x, minX, maxX);
  ball.y = clamp(ball.y, minY, maxY);

  updateOpponentAI(dt);

  const gap = distance(player, ball);
  if (gap < player.radius + ball.radius + 2) {
    if (input.kick) {
      const dx = ball.x - player.x;
      const dy = ball.y - player.y;
      const length = Math.max(Math.hypot(dx, dy), 0.01);
      ball.vx = (dx / length) * 90;
      ball.vy = (dy / length) * 90;
      sound.kick.currentTime = 0;
      sound.kick.play().catch(() => {});
    } else {
      ball.vx += (ball.x - player.x) * 0.8 * dt;
      ball.vy += (ball.y - player.y) * 0.8 * dt;
    }
  }

  checkGoal();
};

const renderEntity = (el, entity, offsetZ) => {
  const { x, y } = entity;
  const scaleFactor = scale();
  const translateX = x * scaleFactor.x;
  const translateY = y * scaleFactor.y;
  const z = offsetZ;
  el.style.transform = `translate3d(${translateX}px, ${translateY}px, ${z}px)`;
};

let lastTime = performance.now();
const tick = (time) => {
  const dt = Math.min((time - lastTime) / 1000, 0.02);
  lastTime = time;
  applyMovement(dt);
  renderEntity(playerEl, player, 28);
  renderEntity(opponentEl, opponent, 28);
  renderEntity(ballEl, ball, 24);
  requestAnimationFrame(tick);
};

setupControls();
resetPositions();
updateScore();
requestAnimationFrame(tick);
