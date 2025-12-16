// Turtle Surf - Mini Game 🐢🌊
// A Flappy Bird-like game with the Machi Mochkil turtle mascot

class TurtleSurfGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // Game state
        this.gameState = 'ready'; // ready, playing, gameover
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('turtleSurfHighScore')) || 0;
        this.pointsEarned = 0;

        // Turtle
        this.turtle = {
            x: 80,
            y: this.height / 2,
            width: 50,
            height: 40,
            velocity: 0,
            gravity: 0.4,
            jump: -8,
            rotation: 0
        };

        // Obstacles (coral reefs)
        this.obstacles = [];
        this.obstacleWidth = 60;
        this.obstacleGap = 150;
        this.obstacleSpeed = 3;
        this.obstacleTimer = 0;
        this.obstacleInterval = 100;

        // Collectibles (shells)
        this.shells = [];
        this.shellTimer = 0;

        // Bubbles (decorative)
        this.bubbles = [];
        for (let i = 0; i < 15; i++) {
            this.bubbles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 8 + 4,
                speed: Math.random() * 1 + 0.5,
                opacity: Math.random() * 0.5 + 0.2
            });
        }

        // Wave effect
        this.waveOffset = 0;

        // Bind events
        this.handleInput = this.handleInput.bind(this);
        canvas.addEventListener('click', this.handleInput);
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInput();
        });
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') this.handleInput();
        });

        // Start game loop
        this.lastTime = 0;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    handleInput() {
        if (this.gameState === 'ready') {
            this.gameState = 'playing';
            this.turtle.velocity = this.turtle.jump;
        } else if (this.gameState === 'playing') {
            this.turtle.velocity = this.turtle.jump;
            // Play swim sound effect (visual feedback)
            this.createSplash();
        } else if (this.gameState === 'gameover') {
            this.reset();
        }
    }

    createSplash() {
        // Add visual splash effect
        for (let i = 0; i < 5; i++) {
            this.bubbles.push({
                x: this.turtle.x,
                y: this.turtle.y + this.turtle.height / 2,
                size: Math.random() * 10 + 5,
                speed: Math.random() * 2 + 1,
                opacity: 0.8,
                isSplash: true
            });
        }
    }

    reset() {
        this.gameState = 'ready';
        this.score = 0;
        this.turtle.y = this.height / 2;
        this.turtle.velocity = 0;
        this.turtle.rotation = 0;
        this.obstacles = [];
        this.shells = [];
        this.obstacleTimer = 0;
        this.pointsEarned = 0;
    }

    update() {
        if (this.gameState !== 'playing') return;

        // Update turtle
        this.turtle.velocity += this.turtle.gravity;
        this.turtle.y += this.turtle.velocity;
        this.turtle.rotation = Math.min(Math.max(this.turtle.velocity * 3, -30), 60);

        // Boundaries
        if (this.turtle.y < 0) {
            this.turtle.y = 0;
            this.turtle.velocity = 0;
        }
        if (this.turtle.y + this.turtle.height > this.height) {
            this.gameOver();
        }

        // Spawn obstacles
        this.obstacleTimer++;
        if (this.obstacleTimer >= this.obstacleInterval) {
            this.spawnObstacle();
            this.obstacleTimer = 0;
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.obstacleSpeed;

            // Score point
            if (!obs.passed && obs.x + this.obstacleWidth < this.turtle.x) {
                obs.passed = true;
                this.score++;
                this.pointsEarned = Math.floor(this.score / 5) * 10;
            }

            // Remove off-screen
            if (obs.x + this.obstacleWidth < 0) {
                this.obstacles.splice(i, 1);
            }

            // Collision detection
            if (this.checkCollision(obs)) {
                this.gameOver();
            }
        }

        // Spawn shells occasionally
        this.shellTimer++;
        if (this.shellTimer >= 200 && Math.random() > 0.7) {
            this.spawnShell();
            this.shellTimer = 0;
        }

        // Update shells
        for (let i = this.shells.length - 1; i >= 0; i--) {
            const shell = this.shells[i];
            shell.x -= this.obstacleSpeed;
            shell.y += Math.sin(shell.x * 0.05) * 0.5;

            // Collect shell
            if (this.checkShellCollision(shell)) {
                this.shells.splice(i, 1);
                this.score += 5;
                this.pointsEarned += 5;
            }

            // Remove off-screen
            if (shell.x < -30) {
                this.shells.splice(i, 1);
            }
        }

        // Update bubbles
        this.bubbles.forEach(bubble => {
            bubble.y -= bubble.speed;
            bubble.x += Math.sin(bubble.y * 0.02) * 0.3;
            if (bubble.y < -10) {
                bubble.y = this.height + 10;
                bubble.x = Math.random() * this.width;
            }
            if (bubble.isSplash) {
                bubble.opacity -= 0.02;
            }
        });
        this.bubbles = this.bubbles.filter(b => !b.isSplash || b.opacity > 0);

        // Wave effect
        this.waveOffset += 0.05;

        // Increase difficulty
        if (this.score > 0 && this.score % 10 === 0) {
            this.obstacleSpeed = Math.min(6, 3 + this.score * 0.05);
        }
    }

    spawnObstacle() {
        const minHeight = 50;
        const maxHeight = this.height - this.obstacleGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

        this.obstacles.push({
            x: this.width,
            topHeight: topHeight,
            bottomY: topHeight + this.obstacleGap,
            passed: false
        });
    }

    spawnShell() {
        const lastObs = this.obstacles[this.obstacles.length - 1];
        if (lastObs) {
            this.shells.push({
                x: this.width + 50,
                y: lastObs.topHeight + this.obstacleGap / 2,
                collected: false
            });
        }
    }

    checkCollision(obs) {
        const t = this.turtle;
        const hitboxPadding = 5;

        // Top obstacle
        if (t.x + t.width - hitboxPadding > obs.x &&
            t.x + hitboxPadding < obs.x + this.obstacleWidth &&
            t.y + hitboxPadding < obs.topHeight) {
            return true;
        }

        // Bottom obstacle
        if (t.x + t.width - hitboxPadding > obs.x &&
            t.x + hitboxPadding < obs.x + this.obstacleWidth &&
            t.y + t.height - hitboxPadding > obs.bottomY) {
            return true;
        }

        return false;
    }

    checkShellCollision(shell) {
        const t = this.turtle;
        const distance = Math.sqrt(
            Math.pow(t.x + t.width / 2 - shell.x, 2) +
            Math.pow(t.y + t.height / 2 - shell.y, 2)
        );
        return distance < 35;
    }

    gameOver() {
        this.gameState = 'gameover';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('turtleSurfHighScore', this.highScore);
        }
        // Dispatch event for points
        window.dispatchEvent(new CustomEvent('gameOver', {
            detail: { score: this.score, points: this.pointsEarned }
        }));
    }

    draw() {
        // Clear & draw ocean gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#0077B6');
        gradient.addColorStop(0.5, '#00B4D8');
        gradient.addColorStop(1, '#48CAE4');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw wave pattern at top
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 30);
        for (let x = 0; x <= this.width; x += 20) {
            this.ctx.lineTo(x, 30 + Math.sin(x * 0.02 + this.waveOffset) * 10);
        }
        this.ctx.lineTo(this.width, 0);
        this.ctx.lineTo(0, 0);
        this.ctx.fill();

        // Draw bubbles
        this.bubbles.forEach(bubble => {
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity})`;
            this.ctx.fill();
        });

        // Draw obstacles (coral reefs)
        this.obstacles.forEach(obs => {
            // Top coral
            this.drawCoral(obs.x, 0, this.obstacleWidth, obs.topHeight, true);
            // Bottom coral
            this.drawCoral(obs.x, obs.bottomY, this.obstacleWidth, this.height - obs.bottomY, false);
        });

        // Draw shells
        this.shells.forEach(shell => {
            this.ctx.font = '30px Arial';
            this.ctx.fillText('🐚', shell.x - 15, shell.y + 10);
        });

        // Draw turtle
        this.drawTurtle();

        // Draw score
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 28px Outfit, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(this.score.toString(), this.width / 2, 50);
        this.ctx.shadowBlur = 0;

        // Draw game state overlays
        if (this.gameState === 'ready') {
            this.drawOverlay('🐢 Turtle Surf 🌊', 'Tap to swim!', '🏄‍♂️');
        } else if (this.gameState === 'gameover') {
            this.drawGameOver();
        }
    }

    drawCoral(x, y, width, height, isTop) {
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, isTop ? '#FF6B6B' : '#E63946');
        gradient.addColorStop(1, isTop ? '#E63946' : '#FF6B6B');
        this.ctx.fillStyle = gradient;

        // Draw coral shape with rounded edges
        this.ctx.beginPath();
        if (isTop) {
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x, y + height - 15);
            this.ctx.quadraticCurveTo(x + width / 4, y + height, x + width / 2, y + height - 10);
            this.ctx.quadraticCurveTo(x + width * 3 / 4, y + height, x + width, y + height - 15);
            this.ctx.lineTo(x + width, y);
        } else {
            this.ctx.moveTo(x, y + 15);
            this.ctx.quadraticCurveTo(x + width / 4, y, x + width / 2, y + 10);
            this.ctx.quadraticCurveTo(x + width * 3 / 4, y, x + width, y + 15);
            this.ctx.lineTo(x + width, y + height);
            this.ctx.lineTo(x, y + height);
        }
        this.ctx.closePath();
        this.ctx.fill();

        // Coral details
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = 0; i < 3; i++) {
            const circleX = x + 15 + i * 15;
            const circleY = isTop ? y + height - 30 - i * 20 : y + 30 + i * 20;
            this.ctx.beginPath();
            this.ctx.arc(circleX, circleY, 8, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawTurtle() {
        this.ctx.save();
        this.ctx.translate(this.turtle.x + this.turtle.width / 2, this.turtle.y + this.turtle.height / 2);
        this.ctx.rotate(this.turtle.rotation * Math.PI / 180);

        // Draw turtle emoji
        this.ctx.font = '45px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🐢', 0, 0);

        this.ctx.restore();
    }

    drawOverlay(title, subtitle, emoji) {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(2, 48, 71, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Emoji
        this.ctx.font = '60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(emoji, this.width / 2, this.height / 2 - 60);

        // Title
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 28px Outfit, sans-serif';
        this.ctx.fillText(title, this.width / 2, this.height / 2 + 10);

        // Subtitle
        this.ctx.font = '18px Outfit, sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText(subtitle, this.width / 2, this.height / 2 + 45);

        // High score
        if (this.highScore > 0) {
            this.ctx.font = '16px Outfit, sans-serif';
            this.ctx.fillText(`🏆 Best: ${this.highScore}`, this.width / 2, this.height / 2 + 80);
        }
    }

    drawGameOver() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(2, 48, 71, 0.85)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Game Over text
        this.ctx.font = 'bold 32px Outfit, sans-serif';
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over!', this.width / 2, this.height / 2 - 70);

        // Score
        this.ctx.font = 'bold 50px Outfit, sans-serif';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(this.score.toString(), this.width / 2, this.height / 2);

        // High score
        this.ctx.font = '18px Outfit, sans-serif';
        this.ctx.fillStyle = '#FFD93D';
        const hsText = this.score >= this.highScore ? '🎉 New Record!' : `🏆 Best: ${this.highScore}`;
        this.ctx.fillText(hsText, this.width / 2, this.height / 2 + 35);

        // Points earned
        if (this.pointsEarned > 0) {
            this.ctx.font = 'bold 20px Outfit, sans-serif';
            this.ctx.fillStyle = '#06D6A0';
            this.ctx.fillText(`+${this.pointsEarned} points fidélité!`, this.width / 2, this.height / 2 + 70);
        }

        // Tap to retry
        this.ctx.font = '16px Outfit, sans-serif';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.fillText('Tap to play again', this.width / 2, this.height / 2 + 110);
    }

    animate(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update();
        this.draw();

        requestAnimationFrame(this.animate);
    }

    destroy() {
        this.canvas.removeEventListener('click', this.handleInput);
    }
}

// Export for use
window.TurtleSurfGame = TurtleSurfGame;
