// --- DOM ELEMENTS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const livesEl = document.getElementById('lives');
const startMenu = document.getElementById('start-menu');
const gameOverMenu = document.getElementById('game-over-menu');
const finalScoreEl = document.getElementById('final-score');
const finalHighScoreEl = document.getElementById('final-high-score');
const easyModeBtn = document.getElementById('easy-mode-btn');
const hardModeBtn = document.getElementById('hard-mode-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// --- GAME STATE & CONFIG ---
let TILE_SIZE;
let maze = [];
const originalMaze = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,3,1],
    [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
    [1,3,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,2,1,1,2,1,1,1,0,1,1,1,1],
    [2,2,2,1,0,1,2,2,2,9,9,2,2,2,1,0,1,2,2,2],
    [1,1,1,1,0,1,2,1,1,9,9,1,1,2,1,0,1,1,1,1],
    [1,0,0,0,0,0,2,1,9,9,9,9,1,2,0,0,0,0,0,1],
    [1,1,1,1,0,1,2,1,1,1,1,1,1,2,1,0,1,1,1,1],
    [2,2,2,1,0,1,2,2,2,2,2,2,2,2,1,0,1,2,2,2],
    [1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
    [1,3,0,1,0,0,0,0,0,1,1,0,0,0,0,0,1,0,3,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let score = 0;
let highScore = localStorage.getItem('pixelMuncherHighScore') || 0;
let lives = 3;
let dotCount = 0;
let V = 4; // Base speed
let ghostSpeedMultiplier = 1.0;
let gameState = 'menu'; // 'menu', 'playing', 'gameOver'
let player, blinky;
let animationFrameId;

// --- CLASSES ---
class Character {
    constructor(x, y, speed, colorName) {
        this.x = x; this.y = y; this.speed = speed;
        this.color = getComputedStyle(document.documentElement).getPropertyValue(colorName);
        this.dir = { x: 0, y: 0 }; this.nextDir = { x: 0, y: 0 };
    }
    isAtTileCenter() {
        const tileCenterX = (Math.floor(this.x / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
        const tileCenterY = (Math.floor(this.y / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
        return Math.abs(this.x - tileCenterX) < this.speed / 2 && Math.abs(this.y - tileCenterY) < this.speed / 2;
    }
    getTile() { return { col: Math.floor(this.x / TILE_SIZE), row: Math.floor(this.y / TILE_SIZE) }; }
    checkCollision(dx, dy) {
        const { col, row } = this.getTile();
        const tile = maze[row + dy]?.[col + dx];
        return tile === 1 || tile === 9;
    }
    move() {
        if (this.x > canvas.width + TILE_SIZE / 2) this.x = -TILE_SIZE / 2;
        if (this.x < -TILE_SIZE / 2) this.x = canvas.width + TILE_SIZE / 2;
        if (this.isAtTileCenter()) {
            if (this.nextDir.x !== 0 || this.nextDir.y !== 0) {
                if (!this.checkCollision(this.nextDir.x, this.nextDir.y)) {
                    this.dir = { ...this.nextDir };
                    this.nextDir = { x: 0, y: 0 };
                }
            }
            if (this.checkCollision(this.dir.x, this.dir.y)) {
                this.dir = { x: 0, y: 0 };
            }
        }
        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;
    }
}

class Player extends Character {
    constructor(x, y) { super(x, y, 0.8 * V, '--player-color'); }
    eatDot() {
        const { col, row } = this.getTile();
        if (maze[row]?.[col] === 0 || maze[row]?.[col] === 3) {
            score += (maze[row][col] === 0) ? 10 : 50;
            dotCount--;
            maze[row][col] = 2;
            updateScore();
            if (dotCount === 0) {
                levelWon();
            }
        }
    }
    update() { this.move(); this.eatDot(); }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, TILE_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Ghost extends Character {
    constructor(x, y, colorName) {
        // Apply the difficulty multiplier to the ghost's speed
        const finalSpeed = (0.75 * V) * ghostSpeedMultiplier;
        super(x, y, finalSpeed, colorName);
    }
    update() {
        if (this.isAtTileCenter()) {
            const choices = [];
            const opposites = {'1,0':'-1,0','-1,0':'1,0','0,1':'0,-1','0,-1':'0,1'};
            const currentDirKey = `${this.dir.x},${this.dir.y}`;
            [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].forEach(dir => {
                if (`${dir.x},${dir.y}` !== opposites[currentDirKey] && !this.checkCollision(dir.x, dir.y)) {
                    choices.push(dir);
                }
            });
            if (choices.length > 0) {
                choices.sort((a, b) => {
                    const distA = Math.hypot(this.x + a.x * TILE_SIZE - player.x, this.y + a.y * TILE_SIZE - player.y);
                    const distB = Math.hypot(this.x + b.x * TILE_SIZE - player.x, this.y + b.y * TILE_SIZE - player.y);
                    return distA - distB;
                });
                this.dir = choices[0];
            }
        }
        this.move();
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, TILE_SIZE / 2, Math.PI, 0);
        ctx.lineTo(this.x + TILE_SIZE / 2, this.y + TILE_SIZE / 2);
        ctx.lineTo(this.x - TILE_SIZE / 2, this.y + TILE_SIZE / 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'white';
        const eyeOffsetX = this.dir.x * 4; const eyeOffsetY = this.dir.y * 4;
        ctx.beginPath();
        ctx.arc(this.x - TILE_SIZE / 4 + eyeOffsetX, this.y - TILE_SIZE / 5 + eyeOffsetY, TILE_SIZE/10, 0, Math.PI*2);
        ctx.arc(this.x + TILE_SIZE / 4 + eyeOffsetX, this.y - TILE_SIZE / 5 + eyeOffsetY, TILE_SIZE/10, 0, Math.PI*2);
        ctx.fill();
    }
}

// --- GAME FLOW & STATE MANAGEMENT ---
function startGame(difficulty) {
    // ** DIFFICULTY FIX **
    // Easy mode makes the ghost much slower, Hard mode makes it faster.
    ghostSpeedMultiplier = (difficulty === 'hard') ? 1.25 : 0.75;
    
    gameState = 'playing';
    startMenu.style.display = 'none';
    gameOverMenu.style.display = 'none';
    resetGame();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

function resetGame() {
    score = 0;
    lives = 3;
    maze = originalMaze.map(row => [...row]);
    resizeCanvas();
    resetCharacters();
    updateScore();
    updateLives();
    countDots();
}

function resetCharacters() {
    player = new Player(TILE_SIZE * 1.5, TILE_SIZE * 1.5);
    blinky = new Ghost(TILE_SIZE * 10.5, TILE_SIZE * 8.5, '--blinky-color');
}

function playerLosesLife() {
    lives--;
    updateLives();
    if (lives <= 0) {
        gameOver();
    } else {
        // Pause briefly before resetting positions
        gameState = 'paused';
        setTimeout(() => {
            resetCharacters();
            gameState = 'playing';
        }, 500);
    }
}

function gameOver() {
    gameState = 'gameOver';
    finalScoreEl.textContent = score;
    finalHighScoreEl.textContent = highScore;
    gameOverMenu.style.display = 'flex';
}

function levelWon() {
    gameState = 'gameOver';
    document.getElementById('game-over-title').textContent = "YOU WIN!";
    finalScoreEl.textContent = score;
    finalHighScoreEl.textContent = highScore;
    gameOverMenu.style.display = 'flex';
}

// --- UI & DRAWING ---
function updateScore() {
    scoreEl.textContent = `SCORE: ${score}`;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pixelMuncherHighScore', highScore);
    }
    highScoreEl.textContent = `HIGH SCORE: ${highScore}`;
}

function updateLives() {
    livesEl.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const heart = document.createElement('span');
        heart.className = 'life-heart';
        heart.textContent = '♥';
        livesEl.appendChild(heart);
    }
}

function drawMaze() {
    const wallColor = getComputedStyle(document.documentElement).getPropertyValue('--wall-color');
    const dotColor = getComputedStyle(document.documentElement).getPropertyValue('--dot-color');
    const powerPelletColor = getComputedStyle(document.documentElement).getPropertyValue('--power-pellet-color');
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            const x = col * TILE_SIZE; const y = row * TILE_SIZE;
            switch (maze[row][col]) {
                case 1: ctx.fillStyle = wallColor; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE); break;
                case 0:
                    ctx.fillStyle = dotColor; ctx.beginPath();
                    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 10, 0, Math.PI * 2); ctx.fill();
                    break;
                case 3:
                    ctx.fillStyle = powerPelletColor; ctx.beginPath();
                    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 4, 0, Math.PI * 2); ctx.fill();
                    break;
            }
        }
    }
}

function checkCollisions() {
    if (!player || !blinky) return;
    const distance = Math.hypot(player.x - blinky.x, player.y - blinky.y);
    if (distance < TILE_SIZE / 1.5) {
        playerLosesLife();
    }
}

function countDots() {
    dotCount = 0;
    maze.forEach(row => row.forEach(tile => { if (tile === 0) dotCount++; }));
}

// --- GAME LOOP ---
function gameLoop() {
    if (gameState !== 'playing') {
        // Stop the loop if the game isn't active
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        return;
    }
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function update() {
    player.update();
    blinky.update();
    checkCollisions();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMaze();
    if (player) player.draw();
    if (blinky) blinky.draw();
}

// --- EVENT LISTENERS & INITIALIZATION ---
easyModeBtn.addEventListener('click', () => startGame('easy'));
hardModeBtn.addEventListener('click', () => startGame('hard'));
playAgainBtn.addEventListener('click', () => {
    document.getElementById('game-over-title').textContent = "GAME OVER";
    gameOverMenu.style.display = 'none';
    startMenu.style.display = 'flex';
    gameState = 'menu';
});

// ** KEYBOARD CONTROLS FIX **
// This new, simpler switch statement is more reliable.
window.addEventListener('keydown', (e) => {
    if (gameState !== 'playing' || !player) return;
    e.preventDefault(); // Prevent default browser actions like scrolling
    switch (e.key) {
        case 'ArrowUp': case 'w':
            player.nextDir = { x: 0, y: -1 };
            break;
        case 'ArrowDown': case 's':
            player.nextDir = { x: 0, y: 1 };
            break;
        case 'ArrowLeft': case 'a':
            player.nextDir = { x: -1, y: 0 };
            break;
        case 'ArrowRight': case 'd':
            player.nextDir = { x: 1, y: 0 };
            break;
    }
});

// Touch Controls
let touchStartX=0, touchStartY=0;
canvas.addEventListener('touchstart', e => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

canvas.addEventListener('touchend', e => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const dX = touchEndX - touchStartX, dY = touchEndY - touchStartY;
    if (Math.abs(dX) > Math.abs(dY)) {
        if (Math.abs(dX) > 30) player.nextDir = { x: dX > 0 ? 1 : -1, y: 0 };
    } else {
        if (Math.abs(dY) > 30) player.nextDir = { x: 0, y: dY > 0 ? 1 : -1 };
    }
}, { passive: false });

// Canvas Resizing
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const size = Math.min(container.clientWidth, container.clientHeight);
    canvas.width = size;
    canvas.height = size;
    TILE_SIZE = canvas.width / originalMaze[0].length;
    if (gameState === 'playing') {
        draw();
    }
}

window.addEventListener('resize', () => {
    resizeCanvas();
    if (gameState === 'playing') {
        resetCharacters();
    }
});

// Initial Setup
function init() {
    resizeCanvas();
    updateScore();
    updateLives();
    startMenu.style.display = 'flex';
}

init();
