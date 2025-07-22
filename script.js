// --- SETUP & CONFIGURATION ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

// These must match the canvas size in the HTML file
canvas.width = 600;
canvas.height = 600;

const TILE_SIZE = 30;
const V = 4; // Base Speed unit (slightly slower for better control)

// Maze representation: 1=Wall, 0=Dot, 2=Empty, 3=Power Pellet, 9=Ghost House
const maze = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 3, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 0, 1, 1, 1, 1],
    [2, 2, 2, 1, 0, 1, 2, 2, 2, 9, 9, 2, 2, 2, 1, 0, 1, 2, 2, 2],
    [1, 1, 1, 1, 0, 1, 2, 1, 1, 9, 9, 1, 1, 2, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 2, 1, 9, 9, 9, 9, 1, 2, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1],
    [2, 2, 2, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 1, 2, 2, 2],
    [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 3, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 3, 1],
    [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];
let score = 0;
let dotCount = 0;

// --- CLASSES ---
class Character {
    constructor(x, y, speed, colorName) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.color = getComputedStyle(document.documentElement).getPropertyValue(colorName);
        this.dir = { x: 0, y: 0 };
        this.nextDir = { x: 0, y: 0 };
    }
    isAtTileCenter() {
        const tileCenterX = (Math.floor(this.x / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
        const tileCenterY = (Math.floor(this.y / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
        const tolerance = this.speed / 2;
        return Math.abs(this.x - tileCenterX) < tolerance && Math.abs(this.y - tileCenterY) < tolerance;
    }
    getTile() { return { col: Math.floor(this.x / TILE_SIZE), row: Math.floor(this.y / TILE_SIZE) }; }
    checkCollision(dx, dy) {
        const { col, row } = this.getTile();
        const nextCol = col + dx;
        const nextRow = row + dy;
        const tile = maze[nextRow]?.[nextCol];
        return tile === 1 || tile === 9;
    }
    move() {
        if (this.x > canvas.width + TILE_SIZE / 2) this.x = -TILE_SIZE / 2;
        if (this.x < -TILE_SIZE / 2) this.x = canvas.width + TILE_SIZE / 2;
        if (this.isAtTileCenter()) {
            if (this.nextDir.x !== 0 || this.nextDir.y !== 0) {
                if (!this.checkCollision(this.nextDir.x, this.nextDir.y)) {
                    this.dir.x = this.nextDir.x;
                    this.dir.y = this.nextDir.y;
                    this.nextDir = { x: 0, y: 0 }; // Clear next direction
                }
            }
            if (this.checkCollision(this.dir.x, this.dir.y)) {
                this.dir.x = 0;
                this.dir.y = 0;
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
        const tile = maze[row]?.[col];
        if (tile === 0 || tile === 3) {
            score += (tile === 0) ? 10 : 50;
            dotCount--;
            maze[row][col] = 2;
            scoreEl.textContent = `SCORE: ${score}`;
            if (dotCount === 0) {
                alert("You Win! Final Score: " + score);
                document.location.reload();
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
    constructor(x, y, colorName) { super(x, y, 0.75 * V, colorName); }
    update() {
        if (this.isAtTileCenter()) {
            const choices = [];
            const opposites = { '1,0': '-1,0', '-1,0': '1,0', '0,1': '0,-1', '0,-1': '0,1' };
            const currentDirKey = `${this.dir.x},${this.dir.y}`;
            const directions = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
            for (const dir of directions) {
                if (`${dir.x},${dir.y}` === opposites[currentDirKey]) continue;
                if (!this.checkCollision(dir.x, dir.y)) choices.push(dir);
            }
            if (choices.length > 0) {
                let bestChoice = choices[0];
                let minDistance = Infinity;
                for (const choice of choices) {
                    const newX = this.x + choice.x * TILE_SIZE;
                    const newY = this.y + choice.y * TILE_SIZE;
                    const distance = Math.hypot(player.x - newX, player.y - newY);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestChoice = choice;
                    }
                }
                this.dir = bestChoice;
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
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'white';
        const eyeOffsetX = this.dir.x * 4;
        const eyeOffsetY = this.dir.y * 4;
        ctx.beginPath();
        ctx.arc(this.x - TILE_SIZE / 4 + eyeOffsetX, this.y - TILE_SIZE / 5 + eyeOffsetY, 3, 0, Math.PI * 2);
        ctx.arc(this.x + TILE_SIZE / 4 + eyeOffsetX, this.y - TILE_SIZE / 5 + eyeOffsetY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
let player = new Player(TILE_SIZE * 1.5, TILE_SIZE * 1.5);
let blinky = new Ghost(TILE_SIZE * 10.5, TILE_SIZE * 8.5, '--blinky-color');

// --- DRAWING ---
function drawMaze() {
    const wallColor = getComputedStyle(document.documentElement).getPropertyValue('--wall-color');
    const dotColor = getComputedStyle(document.documentElement).getPropertyValue('--dot-color');
    const powerPelletColor = getComputedStyle(document.documentElement).getPropertyValue('--power-pellet-color');
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            const tile = maze[row][col]; const x = col * TILE_SIZE; const y = row * TILE_SIZE;
            if (tile === 1) { ctx.fillStyle = wallColor; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE); }
            else if (tile === 0) {
                ctx.fillStyle = dotColor; ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 3, 0, Math.PI * 2); ctx.fill();
            } else if (tile === 3) {
                ctx.fillStyle = powerPelletColor; ctx.beginPath();
                ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 8, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
}
function checkPlayerGhostCollision() {
    const distance = Math.hypot(player.x - blinky.x, player.y - blinky.y);
    if (distance < TILE_SIZE / 1.5) {
        alert("Game Over! Blinky got you.");
        document.location.reload();
    }
}

// --- GAME LOOP ---
function update() { player.update(); blinky.update(); checkPlayerGhostCollision(); }
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMaze(); player.draw(); blinky.draw();
}
function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

// --- KEYBOARD CONTROLS ---
window.addEventListener('keydown', (e) => {
    e.preventDefault();
    switch (e.key) {
        case 'ArrowUp': case 'w': player.nextDir = { x: 0, y: -1 }; break;
        case 'ArrowDown': case 's': player.nextDir = { x: 0, y: 1 }; break;
        case 'ArrowLeft': case 'a': player.nextDir = { x: -1, y: 0 }; break;
        case 'ArrowRight': case 'd': player.nextDir = { x: 1, y: 0 }; break;
    }
});

// --- TOUCH CONTROLS for MOBILE ---
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, { passive: false });

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const swipeThreshold = 30; // Minimum distance for a swipe

    if (Math.abs(deltaX) > Math.abs(deltaY)) { // Horizontal swipe
        if (Math.abs(deltaX) > swipeThreshold) {
            player.nextDir = (deltaX > 0) ? { x: 1, y: 0 } : { x: -1, y: 0 };
        }
    } else { // Vertical swipe
        if (Math.abs(deltaY) > swipeThreshold) {
            player.nextDir = (deltaY > 0) ? { x: 0, y: 1 } : { x: 0, y: -1 };
        }
    }
}

// --- INITIALIZE GAME ---
function init() {
    dotCount = 0;
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            if (maze[row][col] === 0) dotCount++;
        }
    }
    gameLoop();
}
init();
