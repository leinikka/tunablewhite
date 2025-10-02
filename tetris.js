// Tunable White Tetris Game
// LED-themed Tetris with localStorage high score

class TunableWhiteTetris {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-piece');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Game settings
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        this.CELL_SIZE = 30;
        
        // Game state
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.isGameRunning = false;
        this.isPaused = false;
        this.gameLoop = null;
        this.dropTime = 1000; // milliseconds
        
        // High score from localStorage
        this.highScore = parseInt(localStorage.getItem('tunableWhiteTetrisHighScore')) || 0;
        
        // LED piece shapes and colors
        this.ledPieces = {
            // Spotlight (T-shape)
            spotlight: {
                shape: [
                    [0, 1, 0],
                    [1, 1, 1]
                ],
                color: '#fffacd',
                glow: '#fff8dc'
            },
            // Panel (Square)
            panel: {
                shape: [
                    [1, 1],
                    [1, 1]
                ],
                color: '#87ceeb',
                glow: '#b0e0e6'
            },
            // Strip (Long line)
            strip: {
                shape: [
                    [1, 1, 1, 1]
                ],
                color: '#ffb347',
                glow: '#ffd700'
            },
            // Bulb (L-shape)
            bulb: {
                shape: [
                    [1, 0],
                    [1, 0],
                    [1, 1]
                ],
                color: '#ffd23f',
                glow: '#ffff00'
            },
            // Tube (Z-shape)
            tube: {
                shape: [
                    [1, 1, 0],
                    [0, 1, 1]
                ],
                color: '#f0f8ff',
                glow: '#ffffff'
            }
        };
        
        this.pieceTypes = Object.keys(this.ledPieces);
        
        this.init();
    }
    
    init() {
        this.initBoard();
        this.bindEvents();
        this.updateDisplay();
        this.generateNextPiece();
        this.draw(); // Initial draw
    }
    
    initBoard() {
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(null));
    }
    
    bindEvents() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.isGameRunning || this.isPaused) return;
            
            switch(e.code) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.movePiece(0, 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.rotatePiece();
                    break;
                case 'Space':
                    e.preventDefault();
                    this.togglePause();
                    break;
            }
        });
        
        // Button events
        document.getElementById('start-btn').addEventListener('click', () => {
            console.log('Start button clicked'); // Debug log
            this.startGame();
        });
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
    }
    
    generatePiece() {
        const pieceType = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
        const piece = this.ledPieces[pieceType];
        
        return {
            type: pieceType,
            shape: piece.shape.map(row => [...row]), // Deep copy
            color: piece.color,
            glow: piece.glow,
            x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0
        };
    }
    
    generateNextPiece() {
        this.nextPiece = this.generatePiece();
        this.drawNextPiece();
    }
    
    startGame() {
        console.log('Starting game...'); // Debug log
        
        this.isGameRunning = true;
        this.isPaused = false;
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.dropTime = 1000;
        
        this.initBoard();
        
        // Ensure we have pieces to work with
        if (!this.nextPiece) {
            this.generateNextPiece();
        }
        this.currentPiece = this.nextPiece;
        this.generateNextPiece();
        
        this.updateDisplay();
        this.hideGameOverOverlay();
        this.draw(); // Initial draw
        
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        
        console.log('Game started, starting loop...'); // Debug log
        this.startGameLoop();
    }
    
    startGameLoop() {
        if (this.gameLoop) clearInterval(this.gameLoop);
        
        this.gameLoop = setInterval(() => {
            if (!this.isPaused) {
                this.update();
            }
        }, this.dropTime);
        
        console.log('Game loop started'); // Debug log
    }
    
    update() {
        if (!this.currentPiece) {
            console.log('No current piece!'); // Debug log
            return;
        }
        
        // Try to move piece down
        if (this.canMovePiece(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
        } else {
            // Lock piece in place
            this.lockPiece();
            this.clearLines();
            
            // Generate new piece
            this.currentPiece = this.nextPiece;
            this.generateNextPiece();
            
            // Check game over
            if (!this.canMovePiece(this.currentPiece, 0, 0)) {
                this.gameOver();
                return;
            }
        }
        
        this.draw();
    }
    
    canMovePiece(piece, deltaX, deltaY, shape = null) {
        if (!piece) return false;
        
        const testShape = shape || piece.shape;
        const newX = piece.x + deltaX;
        const newY = piece.y + deltaY;
        
        for (let row = 0; row < testShape.length; row++) {
            for (let col = 0; col < testShape[row].length; col++) {
                if (testShape[row][col]) {
                    const boardX = newX + col;
                    const boardY = newY + row;
                    
                    // Check boundaries
                    if (boardX < 0 || boardX >= this.BOARD_WIDTH || 
                        boardY >= this.BOARD_HEIGHT) {
                        return false;
                    }
                    
                    // Check collision with existing pieces
                    if (boardY >= 0 && this.board[boardY][boardX]) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    movePiece(deltaX, deltaY) {
        if (this.canMovePiece(this.currentPiece, deltaX, deltaY)) {
            this.currentPiece.x += deltaX;
            this.currentPiece.y += deltaY;
            this.draw();
        }
    }
    
    rotatePiece() {
        const rotatedShape = this.rotateMatrix(this.currentPiece.shape);
        
        if (this.canMovePiece(this.currentPiece, 0, 0, rotatedShape)) {
            this.currentPiece.shape = rotatedShape;
            this.draw();
        }
    }
    
    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                rotated[col][rows - 1 - row] = matrix[row][col];
            }
        }
        
        return rotated;
    }
    
    lockPiece() {
        const piece = this.currentPiece;
        
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const boardX = piece.x + col;
                    const boardY = piece.y + row;
                    
                    if (boardY >= 0) {
                        this.board[boardY][boardX] = {
                            color: piece.color,
                            glow: piece.glow,
                            type: piece.type
                        };
                    }
                }
            }
        }
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let row = this.BOARD_HEIGHT - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== null)) {
                // Line is complete
                this.board.splice(row, 1);
                this.board.unshift(Array(this.BOARD_WIDTH).fill(null));
                linesCleared++;
                row++; // Check the same row again
            }
        }
        
        if (linesCleared > 0) {
            this.score += linesCleared;
            this.linesCleared += linesCleared;
            
            // Increase level every 10 lines
            const newLevel = Math.floor(this.linesCleared / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.dropTime = Math.max(100, 1000 - (this.level - 1) * 100);
                this.startGameLoop(); // Restart with new speed
            }
            
            this.updateDisplay();
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw locked pieces
        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            for (let col = 0; col < this.BOARD_WIDTH; col++) {
                if (this.board[row][col]) {
                    this.drawLEDCell(col, row, this.board[row][col]);
                }
            }
        }
        
        // Draw current piece
        if (this.currentPiece) {
            this.drawPiece(this.currentPiece);
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let row = 0; row <= this.BOARD_HEIGHT; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, row * this.CELL_SIZE);
            this.ctx.lineTo(this.BOARD_WIDTH * this.CELL_SIZE, row * this.CELL_SIZE);
            this.ctx.stroke();
        }
        
        for (let col = 0; col <= this.BOARD_WIDTH; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(col * this.CELL_SIZE, 0);
            this.ctx.lineTo(col * this.CELL_SIZE, this.BOARD_HEIGHT * this.CELL_SIZE);
            this.ctx.stroke();
        }
    }
    
    drawPiece(piece) {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const x = piece.x + col;
                    const y = piece.y + row;
                    
                    if (y >= 0) {
                        this.drawLEDCell(x, y, piece);
                    }
                }
            }
        }
    }
    
    drawLEDCell(x, y, ledData) {
        const pixelX = x * this.CELL_SIZE;
        const pixelY = y * this.CELL_SIZE;
        const size = this.CELL_SIZE - 2;
        
        // Draw LED housing
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(pixelX + 1, pixelY + 1, size, size);
        
        // Draw LED glow effect
        const gradient = this.ctx.createRadialGradient(
            pixelX + this.CELL_SIZE / 2, pixelY + this.CELL_SIZE / 2, 0,
            pixelX + this.CELL_SIZE / 2, pixelY + this.CELL_SIZE / 2, this.CELL_SIZE / 2
        );
        
        gradient.addColorStop(0, ledData.color);
        gradient.addColorStop(0.7, ledData.glow || ledData.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(pixelX + 1, pixelY + 1, size, size);
        
        // Draw LED center light
        const centerX = pixelX + this.CELL_SIZE / 2;
        const centerY = pixelY + this.CELL_SIZE / 2;
        const lightRadius = this.CELL_SIZE / 4;
        
        const lightGradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, lightRadius
        );
        
        lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
        
        this.ctx.fillStyle = lightGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, lightRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(pixelX + 1, pixelY + 1, size, size);
    }
    
    drawNextPiece() {
        if (!this.nextPiece) return;
        
        // Clear next piece canvas
        this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const piece = this.nextPiece;
        const cellSize = 20;
        const offsetX = (this.nextCanvas.width - piece.shape[0].length * cellSize) / 2;
        const offsetY = (this.nextCanvas.height - piece.shape.length * cellSize) / 2;
        
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const x = offsetX + col * cellSize;
                    const y = offsetY + row * cellSize;
                    
                    // Draw mini LED
                    const gradient = this.nextCtx.createRadialGradient(
                        x + cellSize / 2, y + cellSize / 2, 0,
                        x + cellSize / 2, y + cellSize / 2, cellSize / 2
                    );
                    
                    gradient.addColorStop(0, piece.color);
                    gradient.addColorStop(0.7, piece.glow || piece.color);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
                    
                    this.nextCtx.fillStyle = gradient;
                    this.nextCtx.fillRect(x, y, cellSize - 1, cellSize - 1);
                    
                    // Draw mini light center
                    this.nextCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                    this.nextCtx.beginPath();
                    this.nextCtx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 6, 0, Math.PI * 2);
                    this.nextCtx.fill();
                }
            }
        }
    }
    
    togglePause() {
        if (!this.isGameRunning) return;
        
        this.isPaused = !this.isPaused;
        document.getElementById('pause-btn').textContent = this.isPaused ? 'Fortsätt' : 'Pausa';
        
        if (!this.isPaused) {
            this.startGameLoop();
        }
    }
    
    gameOver() {
        this.isGameRunning = false;
        this.isPaused = false;
        
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        
        // Check for high score
        let isNewHighScore = false;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('tunableWhiteTetrisHighScore', this.highScore.toString());
            isNewHighScore = true;
        }
        
        // Update final score display
        document.getElementById('final-score').textContent = this.score;
        
        if (isNewHighScore) {
            document.getElementById('new-high-score').classList.remove('hidden');
        } else {
            document.getElementById('new-high-score').classList.add('hidden');
        }
        
        this.showGameOverOverlay();
        
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('pause-btn').textContent = 'Pausa';
        
        this.updateDisplay();
    }
    
    resetGame() {
        this.isGameRunning = false;
        this.isPaused = false;
        
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
        
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;
        this.dropTime = 1000;
        
        this.initBoard();
        this.currentPiece = null;
        this.generateNextPiece();
        
        this.hideGameOverOverlay();
        this.updateDisplay();
        this.draw();
        
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('pause-btn').textContent = 'Pausa';
    }
    
    updateDisplay() {
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('high-score').textContent = this.highScore;
        document.getElementById('level').textContent = this.level;
    }
    
    showGameOverOverlay() {
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }
    
    hideGameOverOverlay() {
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...'); // Debug log
    const game = new TunableWhiteTetris();
    
    // Focus on the game for keyboard input
    document.body.tabIndex = 0;
    document.body.focus();
    
    console.log('Game initialized successfully'); // Debug log
});