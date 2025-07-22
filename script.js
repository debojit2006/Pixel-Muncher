import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const BASE_SPEED = 4;

// Character speeds
const PLAYER_SPEED = BASE_SPEED * 0.8;
const GHOST_SPEED_EASY = BASE_SPEED * 0.75 * 0.75;
const GHOST_SPEED_HARD = BASE_SPEED * 0.75 * 1.25;

// Game state enum
enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'gameOver'
}

// Direction enum
enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3
}

// Cell types
enum CellType {
  DOT = 0,
  WALL = 1,
  EMPTY = 2,
  POWER_PELLET = 3,
  GHOST_HOUSE = 9
}

// Game maze layout (20x20)
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,3,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,3,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],
  [2,2,2,1,0,1,0,0,0,0,0,0,0,0,1,0,1,2,2,2],
  [1,1,1,1,0,1,0,1,9,9,9,9,1,0,1,0,1,1,1,1],
  [0,0,0,0,0,0,0,1,9,9,9,9,1,0,0,0,0,0,0,0],
  [1,1,1,1,0,1,0,1,9,9,9,9,1,0,1,0,1,1,1,1],
  [2,2,2,1,0,1,0,0,0,0,0,0,0,0,1,0,1,2,2,2],
  [1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,3,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,3,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

interface Position {
  x: number;
  y: number;
}

interface Character {
  x: number;
  y: number;
  direction: Direction;
  nextDirection?: Direction;
}

const PixelMuncher: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const { toast } = useToast();

  // Game state
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('pixelMuncherHighScore') || '0');
  });
  const [lives, setLives] = useState(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [maze, setMaze] = useState(() => MAZE.map(row => [...row]));
  const [totalDots, setTotalDots] = useState(() => {
    return MAZE.flat().filter(cell => cell === CellType.DOT || cell === CellType.POWER_PELLET).length;
  });

  // Characters
  const [player, setPlayer] = useState<Character>({
    x: 10 * CELL_SIZE,
    y: 15 * CELL_SIZE,
    direction: Direction.RIGHT
  });

  const [ghost, setGhost] = useState<Character>({
    x: 10 * CELL_SIZE,
    y: 9 * CELL_SIZE,
    direction: Direction.UP
  });

  // Touch handling for mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const getHighScore = useCallback(() => {
    return parseInt(localStorage.getItem('pixelMuncherHighScore') || '0');
  }, []);

  const saveHighScore = useCallback((newScore: number) => {
    const currentHigh = getHighScore();
    if (newScore > currentHigh) {
      localStorage.setItem('pixelMuncherHighScore', newScore.toString());
      setHighScore(newScore);
      return true;
    }
    return false;
  }, [getHighScore]);

  const isValidMove = useCallback((x: number, y: number): boolean => {
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
      return false;
    }
    
    const cell = maze[gridY][gridX];
    return cell !== CellType.WALL && cell !== CellType.GHOST_HOUSE;
  }, [maze]);

  const getDirectionVector = useCallback((direction: Direction): Position => {
    switch (direction) {
      case Direction.UP: return { x: 0, y: -PLAYER_SPEED };
      case Direction.DOWN: return { x: 0, y: PLAYER_SPEED };
      case Direction.LEFT: return { x: -PLAYER_SPEED, y: 0 };
      case Direction.RIGHT: return { x: PLAYER_SPEED, y: 0 };
      default: return { x: 0, y: 0 };
    }
  }, []);

  const checkCollision = useCallback((pos1: Position, pos2: Position): boolean => {
    const distance = Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
    return distance < CELL_SIZE * 0.8;
  }, []);

  const eatDot = useCallback((x: number, y: number) => {
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    
    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      const cell = maze[gridY][gridX];
      if (cell === CellType.DOT) {
        setMaze(prev => {
          const newMaze = [...prev];
          newMaze[gridY] = [...newMaze[gridY]];
          newMaze[gridY][gridX] = CellType.EMPTY;
          return newMaze;
        });
        setScore(prev => prev + 10);
        setTotalDots(prev => prev - 1);
      } else if (cell === CellType.POWER_PELLET) {
        setMaze(prev => {
          const newMaze = [...prev];
          newMaze[gridY] = [...newMaze[gridY]];
          newMaze[gridY][gridX] = CellType.EMPTY;
          return newMaze;
        });
        setScore(prev => prev + 50);
        setTotalDots(prev => prev - 1);
      }
    }
  }, [maze]);

  const moveGhost = useCallback((currentGhost: Character, playerPos: Position): Character => {
    const ghostSpeed = difficulty === 'easy' ? GHOST_SPEED_EASY : GHOST_SPEED_HARD;
    const currentVector = getDirectionVector(currentGhost.direction);
    const scaledVector = {
      x: (currentVector.x / PLAYER_SPEED) * ghostSpeed,
      y: (currentVector.y / PLAYER_SPEED) * ghostSpeed
    };
    
    const newX = currentGhost.x + scaledVector.x;
    const newY = currentGhost.y + scaledVector.y;

    // Check if ghost can continue in current direction
    if (isValidMove(newX, newY)) {
      return { ...currentGhost, x: newX, y: newY };
    }

    // Find new direction using AI
    const directions = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
    const validDirections = directions.filter(dir => {
      if (dir === (currentGhost.direction + 2) % 4) return false; // Can't reverse
      const vector = getDirectionVector(dir);
      const scaledTestVector = {
        x: (vector.x / PLAYER_SPEED) * ghostSpeed,
        y: (vector.y / PLAYER_SPEED) * ghostSpeed
      };
      return isValidMove(currentGhost.x + scaledTestVector.x, currentGhost.y + scaledTestVector.y);
    });

    if (validDirections.length === 0) {
      // Reverse if stuck
      const reverseDir = (currentGhost.direction + 2) % 4;
      const vector = getDirectionVector(reverseDir);
      const scaledReverseVector = {
        x: (vector.x / PLAYER_SPEED) * ghostSpeed,
        y: (vector.y / PLAYER_SPEED) * ghostSpeed
      };
      return {
        ...currentGhost,
        x: currentGhost.x + scaledReverseVector.x,
        y: currentGhost.y + scaledReverseVector.y,
        direction: reverseDir
      };
    }

    // Choose direction that gets closest to player
    let bestDirection = validDirections[0];
    let minDistance = Infinity;

    validDirections.forEach(dir => {
      const vector = getDirectionVector(dir);
      const scaledTestVector = {
        x: (vector.x / PLAYER_SPEED) * ghostSpeed,
        y: (vector.y / PLAYER_SPEED) * ghostSpeed
      };
      const testX = currentGhost.x + scaledTestVector.x;
      const testY = currentGhost.y + scaledTestVector.y;
      const distance = Math.sqrt(
        Math.pow(testX - playerPos.x, 2) + Math.pow(testY - playerPos.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        bestDirection = dir;
      }
    });

    const bestVector = getDirectionVector(bestDirection);
    const scaledBestVector = {
      x: (bestVector.x / PLAYER_SPEED) * ghostSpeed,
      y: (bestVector.y / PLAYER_SPEED) * ghostSpeed
    };

    return {
      ...currentGhost,
      x: currentGhost.x + scaledBestVector.x,
      y: currentGhost.y + scaledBestVector.y,
      direction: bestDirection
    };
  }, [difficulty, getDirectionVector, isValidMove]);

  const gameLoop = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    setPlayer(prevPlayer => {
      const vector = getDirectionVector(prevPlayer.direction);
      const newX = prevPlayer.x + vector.x;
      const newY = prevPlayer.y + vector.y;

      // Handle screen wrapping
      let wrappedX = newX;
      if (newX < -CELL_SIZE) wrappedX = CANVAS_SIZE;
      if (newX > CANVAS_SIZE) wrappedX = -CELL_SIZE;

      if (isValidMove(wrappedX, newY)) {
        eatDot(wrappedX, newY);
        return { ...prevPlayer, x: wrappedX, y: newY };
      }

      return prevPlayer;
    });

    setGhost(prevGhost => {
      return moveGhost(prevGhost, { x: player.x, y: player.y });
    });

    // Check collision between player and ghost
    if (checkCollision({ x: player.x, y: player.y }, { x: ghost.x, y: ghost.y })) {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState(GameState.GAME_OVER);
          const isNewHighScore = saveHighScore(score);
          if (isNewHighScore) {
            toast({
              title: "New High Score!",
              description: `Congratulations! New high score: ${score}`,
            });
          }
        } else {
          // Reset positions but continue game
          setPlayer(prev => ({ ...prev, x: 10 * CELL_SIZE, y: 15 * CELL_SIZE, direction: Direction.RIGHT }));
          setGhost(prev => ({ ...prev, x: 10 * CELL_SIZE, y: 9 * CELL_SIZE, direction: Direction.UP }));
          setGameState(GameState.PAUSED);
          setTimeout(() => setGameState(GameState.PLAYING), 1000);
        }
        return newLives;
      });
    }

    // Check win condition
    if (totalDots <= 0) {
      setGameState(GameState.GAME_OVER);
      const finalScore = score + 1000; // Bonus for winning
      setScore(finalScore);
      const isNewHighScore = saveHighScore(finalScore);
      if (isNewHighScore) {
        toast({
          title: "You Win! New High Score!",
          description: `Congratulations! Final score: ${finalScore}`,
        });
      } else {
        toast({
          title: "You Win!",
          description: `Congratulations! Final score: ${finalScore}`,
        });
      }
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, player, ghost, totalDots, score, isValidMove, eatDot, getDirectionVector, moveGhost, checkCollision, saveHighScore, toast]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw maze
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = maze[y][x];
        const pixelX = x * CELL_SIZE;
        const pixelY = y * CELL_SIZE;

        switch (cell) {
          case CellType.WALL:
            ctx.fillStyle = '#3498db';
            ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
            break;
          case CellType.DOT:
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath();
            ctx.arc(pixelX + CELL_SIZE / 2, pixelY + CELL_SIZE / 2, 2, 0, 2 * Math.PI);
            ctx.fill();
            break;
          case CellType.POWER_PELLET:
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(pixelX + CELL_SIZE / 2, pixelY + CELL_SIZE / 2, 6, 0, 2 * Math.PI);
            ctx.fill();
            break;
          case CellType.GHOST_HOUSE:
            ctx.fillStyle = '#34495e';
            ctx.fillRect(pixelX, pixelY, CELL_SIZE, CELL_SIZE);
            break;
        }
      }
    }

    // Draw player
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(player.x + CELL_SIZE / 2, player.y + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw ghost
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(ghost.x + CELL_SIZE / 2, ghost.y + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, 2 * Math.PI);
    ctx.fill();

    requestAnimationFrame(draw);
  }, [maze, player, ghost]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState !== GameState.PLAYING) return;

    let newDirection: Direction | undefined;
    
    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        newDirection = Direction.UP;
        break;
      case 'arrowdown':
      case 's':
        newDirection = Direction.DOWN;
        break;
      case 'arrowleft':
      case 'a':
        newDirection = Direction.LEFT;
        break;
      case 'arrowright':
      case 'd':
        newDirection = Direction.RIGHT;
        break;
    }

    if (newDirection !== undefined) {
      setPlayer(prev => ({ ...prev, direction: newDirection }));
    }
  }, [gameState]);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!touchStartRef.current || gameState !== GameState.PLAYING) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
      let newDirection: Direction;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newDirection = deltaX > 0 ? Direction.RIGHT : Direction.LEFT;
      } else {
        newDirection = deltaY > 0 ? Direction.DOWN : Direction.UP;
      }

      setPlayer(prev => ({ ...prev, direction: newDirection }));
    }

    touchStartRef.current = null;
  }, [gameState]);

  const startGame = useCallback((selectedDifficulty: 'easy' | 'hard') => {
    setDifficulty(selectedDifficulty);
    setGameState(GameState.PLAYING);
    setScore(0);
    setLives(3);
    setMaze(MAZE.map(row => [...row]));
    setTotalDots(MAZE.flat().filter(cell => cell === CellType.DOT || cell === CellType.POWER_PELLET).length);
    setPlayer({
      x: 10 * CELL_SIZE,
      y: 15 * CELL_SIZE,
      direction: Direction.RIGHT
    });
    setGhost({
      x: 10 * CELL_SIZE,
      y: 9 * CELL_SIZE,
      direction: Direction.UP
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState(GameState.MENU);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // Start game loop
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Keyboard events
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      {/* UI Bar */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center text-foreground">
        <div className="text-lg font-bold">Score: {score}</div>
        <div className="text-lg font-bold">High: {highScore}</div>
        <div className="text-lg font-bold flex items-center gap-1">
          Lives: {Array.from({ length: lives }, (_, i) => (
            <span key={i} className="heart-icon">♥</span>
          ))}
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-2 border-border rounded-lg touch-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            maxWidth: '90vmin',
            maxHeight: '90vmin',
            width: '400px',
            height: '400px'
          }}
        />

        {/* Start Menu */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 game-overlay flex items-center justify-center rounded-lg">
            <div className="bg-card p-8 rounded-lg border-2 border-border text-center">
              <h1 className="text-4xl font-bold mb-6 text-accent">PIXEL MUNCHER</h1>
              <div className="space-y-4">
                <Button
                  onClick={() => startGame('easy')}
                  className="game-button w-full py-3 text-lg"
                >
                  Easy Mode
                </Button>
                <Button
                  onClick={() => startGame('hard')}
                  className="game-button w-full py-3 text-lg"
                >
                  Hard Mode
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Menu */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 game-overlay flex items-center justify-center rounded-lg">
            <div className="bg-card p-8 rounded-lg border-2 border-border text-center">
              <h2 className="text-3xl font-bold mb-4 text-destructive">
                {totalDots <= 0 ? 'YOU WIN!' : 'GAME OVER'}
              </h2>
              <div className="mb-6 space-y-2">
                <p className="text-xl">Final Score: {score}</p>
                <p className="text-lg">High Score: {highScore}</p>
              </div>
              <Button
                onClick={resetGame}
                className="game-button px-8 py-3 text-lg"
              >
                Play Again
              </Button>
            </div>
          </div>
        )}

        {/* Pause Overlay */}
        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 game-overlay flex items-center justify-center rounded-lg">
            <div className="bg-card p-4 rounded-lg border-2 border-border">
              <p className="text-xl font-bold text-center">Get Ready!</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-muted-foreground max-w-md">
        <p className="mb-2">
          <strong>Desktop:</strong> Use arrow keys or WASD to move
        </p>
        <p>
          <strong>Mobile:</strong> Swipe to change direction
        </p>
      </div>
    </div>
  );
};

export default PixelMuncher;
