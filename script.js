// === Element references ===
const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const singlePlayerBtn = document.getElementById("singlePlayerBtn");
const twoPlayerBtn = document.getElementById("twoPlayerBtn");
const startGameBtn = document.getElementById("startGameBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const difficultyGroup = document.getElementById("difficultyGroup");
const difficultyButtons = [...document.querySelectorAll(".difficulty")];

const leftScoreEl = document.getElementById("leftScore");
const rightScoreEl = document.getElementById("rightScore");
const gameOverText = document.getElementById("gameOverText");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === Constants ===
const WIN_SCORE = 10;
const PADDLE_WIDTH = 14;
const PADDLE_HEIGHT = 95;
const PADDLE_SPEED = 6;
const BALL_SIZE = 14;
const BALL_SPEED_START = 4.6;
const BALL_SPEED_BOOST = 0.28;
const MAX_BALL_SPEED = 11;

const aiConfig = {
  easy: { speed: 2.3, reactionThreshold: 32 },
  medium: { speed: 3.6, reactionThreshold: 18 },
  hard: { speed: 5.2, reactionThreshold: 8 },
};

// === Game state ===
let mode = "single"; // "single" | "two"
let difficulty = "easy";
let state = "menu"; // "menu" | "playing" | "gameover"
let animationFrameId = null;

const paddleLeft = {
  x: 25,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  speed: PADDLE_SPEED,
};

const paddleRight = {
  x: canvas.width - 25 - PADDLE_WIDTH,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  speed: PADDLE_SPEED,
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  vx: BALL_SPEED_START,
  vy: BALL_SPEED_START,
  size: BALL_SIZE,
};

let leftScore = 0;
let rightScore = 0;

const keys = {
  w: false,
  s: false,
  arrowUp: false,
  arrowDown: false,
};

// === Utility helpers ===
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setScreen(screenName) {
  menuScreen.classList.remove("active");
  gameScreen.classList.remove("active");
  gameOverScreen.classList.remove("active");

  if (screenName === "menu") menuScreen.classList.add("active");
  if (screenName === "game") gameScreen.classList.add("active");
  if (screenName === "gameover") gameOverScreen.classList.add("active");
}

function updateScoreUI() {
  leftScoreEl.textContent = String(leftScore);
  rightScoreEl.textContent = String(rightScore);
}

function centerBall(direction = 1) {
  const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6;
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.vx = Math.cos(angle) * BALL_SPEED_START * direction;
  ball.vy = Math.sin(angle) * BALL_SPEED_START;
}

function resetPaddles() {
  paddleLeft.y = canvas.height / 2 - paddleLeft.height / 2;
  paddleRight.y = canvas.height / 2 - paddleRight.height / 2;
}

function resetMatch() {
  leftScore = 0;
  rightScore = 0;
  updateScoreUI();
  resetPaddles();
  centerBall(Math.random() > 0.5 ? 1 : -1);
}

// === Input handling ===
window.addEventListener("keydown", (event) => {
  if (event.key === "w" || event.key === "W") keys.w = true;
  if (event.key === "s" || event.key === "S") keys.s = true;
  if (event.key === "ArrowUp") keys.arrowUp = true;
  if (event.key === "ArrowDown") keys.arrowDown = true;
});

window.addEventListener("keyup", (event) => {
  if (event.key === "w" || event.key === "W") keys.w = false;
  if (event.key === "s" || event.key === "S") keys.s = false;
  if (event.key === "ArrowUp") keys.arrowUp = false;
  if (event.key === "ArrowDown") keys.arrowDown = false;
});

// === UI events ===
singlePlayerBtn.addEventListener("click", () => {
  mode = "single";
  singlePlayerBtn.classList.add("primary");
  twoPlayerBtn.classList.remove("primary");
  difficultyGroup.style.display = "block";
});

twoPlayerBtn.addEventListener("click", () => {
  mode = "two";
  twoPlayerBtn.classList.add("primary");
  singlePlayerBtn.classList.remove("primary");
  difficultyGroup.style.display = "none";
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    difficulty = button.dataset.difficulty;
    difficultyButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
  });
});

startGameBtn.addEventListener("click", () => {
  startGame();
});

playAgainBtn.addEventListener("click", () => {
  startGame();
});

backToMenuBtn.addEventListener("click", () => {
  endLoop();
  state = "menu";
  setScreen("menu");
});

function startGame() {
  resetMatch();
  state = "playing";
  setScreen("game");
  endLoop();
  loop();
}

function endLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// === Game logic ===
function updatePaddles() {
  // Player 1 controls (left paddle)
  if (keys.w) paddleLeft.y -= paddleLeft.speed;
  if (keys.s) paddleLeft.y += paddleLeft.speed;

  paddleLeft.y = clamp(paddleLeft.y, 0, canvas.height - paddleLeft.height);

  // Right paddle: player in two-player, otherwise AI
  if (mode === "two") {
    if (keys.arrowUp) paddleRight.y -= paddleRight.speed;
    if (keys.arrowDown) paddleRight.y += paddleRight.speed;
  } else {
    const ai = aiConfig[difficulty];
    const paddleCenter = paddleRight.y + paddleRight.height / 2;
    const delta = ball.y - paddleCenter;

    if (Math.abs(delta) > ai.reactionThreshold) {
      paddleRight.y += Math.sign(delta) * ai.speed;
    }
  }

  paddleRight.y = clamp(paddleRight.y, 0, canvas.height - paddleRight.height);
}

function handlePaddleCollision(paddle) {
  const ballLeft = ball.x - ball.size / 2;
  const ballRight = ball.x + ball.size / 2;
  const ballTop = ball.y - ball.size / 2;
  const ballBottom = ball.y + ball.size / 2;

  const paddleLeftEdge = paddle.x;
  const paddleRightEdge = paddle.x + paddle.width;
  const paddleTop = paddle.y;
  const paddleBottom = paddle.y + paddle.height;

  const overlaps =
    ballRight >= paddleLeftEdge &&
    ballLeft <= paddleRightEdge &&
    ballBottom >= paddleTop &&
    ballTop <= paddleBottom;

  if (!overlaps) return false;

  // Push ball out to avoid sticking
  if (ball.vx < 0) {
    ball.x = paddleRightEdge + ball.size / 2;
  } else {
    ball.x = paddleLeftEdge - ball.size / 2;
  }

  // Angle bounce based on hit position
  const paddleCenter = paddle.y + paddle.height / 2;
  const normalizedIntersect = (ball.y - paddleCenter) / (paddle.height / 2);

  ball.vx *= -1;
  ball.vy += normalizedIntersect * 1.9;

  // Gradually increase ball speed while preserving angle
  const speed = Math.min(
    Math.hypot(ball.vx, ball.vy) + BALL_SPEED_BOOST,
    MAX_BALL_SPEED
  );
  const directionX = Math.sign(ball.vx);
  const angle = Math.atan2(ball.vy, ball.vx);
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;

  // Ensure ball always keeps moving horizontally
  if (Math.abs(ball.vx) < 2.2) ball.vx = 2.2 * directionX;

  return true;
}

function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Top/bottom wall collision
  if (ball.y - ball.size / 2 <= 0) {
    ball.y = ball.size / 2;
    ball.vy *= -1;
  } else if (ball.y + ball.size / 2 >= canvas.height) {
    ball.y = canvas.height - ball.size / 2;
    ball.vy *= -1;
  }

  handlePaddleCollision(paddleLeft);
  handlePaddleCollision(paddleRight);

  // Goal checks
  if (ball.x + ball.size / 2 < 0) {
    rightScore += 1;
    updateScoreUI();
    checkGameOver();
    centerBall(1);
  } else if (ball.x - ball.size / 2 > canvas.width) {
    leftScore += 1;
    updateScoreUI();
    checkGameOver();
    centerBall(-1);
  }
}

function checkGameOver() {
  if (leftScore < WIN_SCORE && rightScore < WIN_SCORE) return;

  endLoop();
  state = "gameover";

  const leftName = "Player 1";
  const rightName = mode === "single" ? "Computer" : "Player 2";
  const winner = leftScore > rightScore ? leftName : rightName;

  gameOverText.textContent = `${winner} wins ${leftScore} - ${rightScore}`;
  setScreen("gameover");
}

// === Rendering ===
function drawBackground() {
  ctx.fillStyle = "#050812";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dashed center line
  ctx.strokeStyle = "#2b3d62";
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 14]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 8);
  ctx.lineTo(canvas.width / 2, canvas.height - 8);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddle(paddle) {
  ctx.fillStyle = "#59d0ff";
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrame() {
  drawBackground();
  drawPaddle(paddleLeft);
  drawPaddle(paddleRight);
  drawBall();
}

function loop() {
  if (state !== "playing") return;

  updatePaddles();
  updateBall();
  drawFrame();

  animationFrameId = requestAnimationFrame(loop);
}

// Ensure initial menu state is correct
setScreen("menu");
updateScoreUI();
