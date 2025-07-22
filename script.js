// JavaScript logic based on the project specification
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('high-score');
    const livesEl = document.getElementById('lives');
    
    const startMenu = document.getElementById('start-menu');
    const gameOverMenu = document.getElementById('game-over-menu');
    const startEasyBtn = document.getElementById('start-easy');
    const startHardBtn = document.getElementById('start-hard');
    const playAgainBtn = document.getElementById('play-again');
    const gameOverTitle = document.getElementById('game-over-title');
    const finalScoreEl = document.getElementById('final-score');
    const finalHighScoreEl = document.getElementById('final-high-score');

    const initialGrid = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 0, 1, 0, 1, 9, 9, 9, 9, 1, 0, 1, 1, 0, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 9, 9, 9, 9, 1, 0, 0, 0, 0, 3, 0, 1],
        [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
        [1, 3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 1],
        [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];
    let grid;
    
    const TILE_SIZE = 20;
    const V = 4; // Base speed
    
    let tileSize;
    let player, ghost;
    let score, highScore, lives;
    let difficulty;
    let gameState = 'menu'; // menu, playing, paused, gameOver
    let totalDots = 0;

    // --- Game Objects ---
    class Character {
        constructor(x, y, radius, color) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.color = color;
            this.direction = { x: 0, y: 0 };
            this.nextDirection = { x: 0, y: 0 };
            this.speed = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }

        update() {
            // Input buffering logic
            if (this.canChangeDirection(this.nextDirection)) {
                this.direction = { ...this.nextDirection };
            }
            
            const nextX = this.x + this.direction.x * this.speed;
            const nextY = this.y + this.direction.y * this.speed;

            if (!this.checkCollision(nextX, nextY)) {
                this.x = nextX;
                this.y = nextY;
            }
        }

        checkCollision(x, y) {
            const buffer = this.radius * 0.9;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const gridX = Math.floor((x + i * buffer) / tileSize);
                    const gridY = Math.floor((y + j * buffer) / tileSize);
                    if (grid[gridY] && (grid[gridY][gridX] === 1 || grid[gridY][gridX] === 9)) {
                        return true;
                    }
                }
            }
            return false;
        }
        
        canChangeDirection(dir) {
            if (dir.x === 0 && dir.y === 0) return false;
            
            const currentTileX = Math.round(this.x / tileSize);
            const currentTileY = Math.round(this.y / tileSize);
            
            const isAtIntersection = Math.abs(this.x - (currentTileX * tileSize + tileSize / 2)) < this.speed &&
                                     Math.abs(this.y - (currentTileY * tileSize + tileSize / 2)) < this.speed;

            if (!isAtIntersection) return false;
            
            const nextGridX = currentTileX + dir.x;
            const nextGridY = currentTileY + dir.y;
            
            return grid[nextGridY] && grid[nextGridY][nextGridX] !== 1 && grid[nextGridY][nextGridX] !== 9;
        }
    }
    
    class Ghost extends Character {
         update() {
            this.aiMove();
            super.update();
        }

        aiMove() {
            const currentTileX = Math.round(this.x / tileSize);
            const currentTileY = Math.round(this.y / tileSize);

            const isAtIntersection = Math.abs(this.x - (currentTileX * tileSize + tileSize/2)) < this.speed &&
                                     Math.abs(this.y - (currentTileY * tileSize + tileSize/2)) < this.speed;

            if (isAtIntersection) {
                const possibleMoves = [];
                const directions = [
                    { x: 0, y: -1 }, // Up
                    { x: 0, y: 1 },  // Down
                    { x: -1, y: 0 }, // Left
                    { x: 1, y: 0 }   // Right
                ];

                for (const move of directions) {
                    // Don't allow reversing direction
                    if (move.x === -this.direction.x && move.y === -this.direction.y) {
                        continue;
                    }
                    
                    const nextGridX = currentTileX + move.x;
                    const nextGridY = currentTileY + move.y;

                    if (grid[nextGridY] && grid[nextGridY][nextGridX] !== 1 && grid[nextGridY][nextGridX] !== 9) {
                        const dist = Math.hypot(
                            (nextGridX * tileSize) - player.x,
                            (nextGridY * tileSize) - player.y
                        );
                        possibleMoves.push({ move, dist });
                    }
                }
                
                if (possibleMoves.length > 0) {
                    possibleMoves.sort((a, b) => a.dist - b.dist);
                    this.direction = possibleMoves[0].move;
                } else { // Dead end, must reverse
                     this.direction.x *=
