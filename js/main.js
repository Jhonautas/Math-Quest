// ===========================
// CONFIGURAÇÕES E CONSTANTES
// ===========================
const CONFIG = {
    canvas: {
        width: 800,
        height: 600
    },
    player: {
        size: 25,
        speed: 3,
        initialHealth: 3,
        color: 'blue'
    },
    enemy: {
        baseSize: 15,
        sizeIncrement: 2,
        baseSpeed: 0.5,
        speedIncrement: 0.15,
        speedVariation: 0.6,
        minSpeed: 0.2,
        enemiesPerWave: 3
    },
    boss: {
        size: 50,
        health: 25,
        baseSpeed: 0.5,
        speedVariation: 0.2,
        minSpeed: 0.3,
        speedIncrease: 0.08,
        maxSpeed: 2.5,
        color: 'purple'
    },
    projectile: {
        speed: 7,
        size: 5,
        color: 'black'
    },
    game: {
        enemiesForQuestion: 3,
        enemiesForBoss: 3,
        pushDistance: 50,
        helpCost: 0.5
    }
};


// ===========================
// ELEMENTOS DOM
// ===========================
const DOM = {
    canvas: document.getElementById('gameCanvas'),
    perguntaContainer: document.getElementById('pergunta-container'),
    perguntaText: document.getElementById('pergunta'),
    respostaInput: document.getElementById('resposta-input'),
    submitResposta: document.getElementById('submit-resposta'),
    helpButton: document.getElementById('help-button'),
    helpInfo: document.getElementById('help-info'),
    helpHint: document.getElementById('help-hint'),
    gameOverContainer: document.getElementById('game-over-container'),
    finalScoreElement: document.getElementById('final-score'),
    restartButton: document.getElementById('restart-button'),
    scoreDisplay: document.getElementById('score'),
    waveDisplay: document.getElementById('wave'),
};

const ctx = DOM.canvas.getContext('2d');

// ===========================
// ESTADO DO JOGO
// ===========================
const gameState = {
    player: {
        x: 400,
        y: 300,
        size: CONFIG.player.size,
        speed: CONFIG.player.speed,
        color: CONFIG.player.color,
        health: CONFIG.player.initialHealth,
        score: 0
    },
    enemies: [],
    projectiles: [],
    wave: 1,
    enemiesDefeated: 0,
    isPaused: false,
    currentAnswer: null,
    currentEquation: null,
    keys: { w: false, a: false, s: false, d: false },
    mouse: { x: DOM.canvas.width / 2, y: DOM.canvas.height / 2 }
};

// ===========================
// GERAÇÃO DE PERGUNTAS
// ===========================
const QuestionGenerator = {
    generateMathQuestion() {
        const operations = ['+', '-', '*', '/'];
        const op = operations[Math.floor(Math.random() * operations.length)];
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;

        switch (op) {
            case '+':
                return {
                    question: `${num1} + ${num2} = ?`,
                    answer: num1 + num2
                };
            case '-':
                const max = Math.max(num1, num2);
                const min = Math.min(num1, num2);
                return {
                    question: `${max} - ${min} = ?`,
                    answer: max - min
                };
            case '*':
                return {
                    question: `${num1} * ${num2} = ?`,
                    answer: num1 * num2
                };
            case '/':
                return {
                    question: `${num1 * num2} / ${num2} = ?`,
                    answer: num1
                };
        }
    },

    generateLinearEquation() {
        const a = Math.floor(Math.random() * 5) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const c = a * Math.floor(Math.random() * 5) + b;
        
        return {
            question: `${a}x + ${b} = ${c}. Qual é o valor de x?`,
            answer: (c - b) / a,
            a, b, c
        };
    }
};

// ===========================
// SISTEMA DE SPAWNING
// ===========================
const SpawnSystem = {
    spawnEnemies(wave) {
        const count = CONFIG.enemy.enemiesPerWave * wave;
        
        for (let i = 0; i < count; i++) {
            const baseSpeed = CONFIG.enemy.baseSpeed + wave * CONFIG.enemy.speedIncrement;
            const variation = (Math.random() - 0.5) * CONFIG.enemy.speedVariation;
            const speed = Math.max(CONFIG.enemy.minSpeed, baseSpeed + variation);

            gameState.enemies.push({
                x: Math.random() * DOM.canvas.width,
                y: Math.random() * DOM.canvas.height,
                size: CONFIG.enemy.baseSize + wave * CONFIG.enemy.sizeIncrement,
                speed: speed,
                color: 'red',
                health: 1,
                isBoss: false
            });
        }
    },

    spawnBoss() {
        gameState.player.health = CONFIG.player.initialHealth;
        
        const bossVariation = (Math.random() - 0.5) * CONFIG.boss.speedVariation;
        const bossSpeed = Math.max(CONFIG.boss.minSpeed, CONFIG.boss.baseSpeed + bossVariation);

        gameState.enemies.push({
            x: DOM.canvas.width / 2,
            y: DOM.canvas.height / 2,
            size: CONFIG.boss.size,
            speed: bossSpeed,
            color: CONFIG.boss.color,
            health: CONFIG.boss.health,
            isBoss: true
        });
    }
};

// ===========================
// SISTEMA DE INPUT
// ===========================
const InputSystem = {
    init() {
        this.setupKeyboard();
        this.setupMouse();
    },

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(key)) {
                if (gameState.player.health > 0) {
                    gameState.keys[key] = true;
                    e.preventDefault();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd'].includes(key)) {
                gameState.keys[key] = false;
            }
        });
    },

    setupMouse() {
        DOM.canvas.addEventListener('mousemove', (e) => {
            const rect = DOM.canvas.getBoundingClientRect();
            gameState.mouse.x = e.clientX - rect.left;
            gameState.mouse.y = e.clientY - rect.top;
        });

        DOM.canvas.addEventListener('click', (e) => {
            if (gameState.isPaused || gameState.player.health <= 0) return;
            
            const rect = DOM.canvas.getBoundingClientRect();
            const targetX = e.clientX - rect.left;
            const targetY = e.clientY - rect.top;
            
            ProjectileSystem.shoot(targetX, targetY);
        });
    }
};

// ===========================
// SISTEMA DE PROJÉTEIS
// ===========================
const ProjectileSystem = {
    shoot(targetX, targetY) {
        const player = gameState.player;
        const angle = Math.atan2(
            targetY - (player.y + player.size / 2),
            targetX - (player.x + player.size / 2)
        );

        gameState.projectiles.push({
            x: player.x + player.size / 2,
            y: player.y + player.size / 2,
            speed: CONFIG.projectile.speed,
            angle: angle,
            size: CONFIG.projectile.size,
            color: CONFIG.projectile.color
        });
    },

    update() {
        for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
            const proj = gameState.projectiles[i];
            proj.x += Math.cos(proj.angle) * proj.speed;
            proj.y += Math.sin(proj.angle) * proj.speed;

            if (this.isOutOfBounds(proj)) {
                gameState.projectiles.splice(i, 1);
            }
        }
    },

    isOutOfBounds(projectile) {
        return projectile.x < 0 || projectile.x > DOM.canvas.width ||
               projectile.y < 0 || projectile.y > DOM.canvas.height;
    }
};

// ===========================
// SISTEMA DE MOVIMENTO
// ===========================
const MovementSystem = {
    updatePlayer() {
        const keys = gameState.keys;
        let vx = 0, vy = 0;

        if (keys.w && !keys.s) vy -= gameState.player.speed;
        if (keys.s && !keys.w) vy += gameState.player.speed;
        if (keys.a && !keys.d) vx -= gameState.player.speed;
        if (keys.d && !keys.a) vx += gameState.player.speed;

        // Normalizar diagonal
        if (vx !== 0 && vy !== 0) {
            const inv = 1 / Math.sqrt(2);
            vx *= inv;
            vy *= inv;
        }

        gameState.player.x += vx;
        gameState.player.y += vy;

        this.clampPlayerPosition();
    },

    clampPlayerPosition() {
        const player = gameState.player;
        player.x = Math.max(0, Math.min(DOM.canvas.width - player.size, player.x));
        player.y = Math.max(0, Math.min(DOM.canvas.height - player.size, player.y));
    },

    updateEnemies() {
        gameState.enemies.forEach(enemy => {
            const player = gameState.player;
            const angle = Math.atan2(
                player.y + player.size / 2 - enemy.y,
                player.x + player.size / 2 - enemy.x
            );
            
            enemy.x += Math.cos(angle) * enemy.speed;
            enemy.y += Math.sin(angle) * enemy.speed;
        });
    }
};

// ===========================
// SISTEMA DE COLISÃO
// ===========================
const CollisionSystem = {
    checkAll() {
        this.checkProjectileEnemyCollisions();
        this.checkPlayerEnemyCollisions();
    },

    checkProjectileEnemyCollisions() {
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = gameState.enemies[i];
            
            for (let j = gameState.projectiles.length - 1; j >= 0; j--) {
                const proj = gameState.projectiles[j];
                const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                
                if (dist < enemy.size) {
                    this.handleProjectileHit(enemy, i, j);
                    break;
                }
            }
        }
    },

    handleProjectileHit(enemy, enemyIndex, projIndex) {
        enemy.health -= 1;
        enemy.color = 'orange';
        gameState.projectiles.splice(projIndex, 1);

        if (enemy.isBoss && enemy.health > 0) {
            enemy.speed = Math.min(
                enemy.speed + CONFIG.boss.speedIncrease,
                CONFIG.boss.maxSpeed
            );
        }

        if (enemy.health <= 0) {
            this.handleEnemyDefeat(enemy, enemyIndex);
        }
    },

    handleEnemyDefeat(enemy, enemyIndex) {
        gameState.enemiesDefeated++;
        gameState.player.score += enemy.isBoss ? 5 : 1;
        gameState.enemies.splice(enemyIndex, 1);

        if (enemy.isBoss) {
            QuestionSystem.show('boss');
            gameState.wave++;
            SpawnSystem.spawnEnemies(gameState.wave);
        } else if (gameState.enemiesDefeated % CONFIG.game.enemiesForQuestion === 0) {
            QuestionSystem.show('normal');
        }
    },

    checkPlayerEnemyCollisions() {
        const player = gameState.player;
        
        gameState.enemies.forEach(enemy => {
            const dist = Math.hypot(
                player.x + player.size / 2 - enemy.x,
                player.y + player.size / 2 - enemy.y
            );
            
            if (dist < player.size + enemy.size) {
                this.handlePlayerHit(enemy);
            }
        });
    },

    handlePlayerHit(enemy) {
        gameState.player.health -= 1;
        
        if (gameState.player.health <= 0) {
            GameSystem.gameOver();
            return;
        }

        this.pushEnemyAway(enemy);
    },

    pushEnemyAway(enemy) {
        const player = gameState.player;
        const pushAngle = Math.atan2(
            enemy.y - (player.y + player.size / 2),
            enemy.x - (player.x + player.size / 2)
        );
        
        enemy.x += Math.cos(pushAngle) * CONFIG.game.pushDistance;
        enemy.y += Math.sin(pushAngle) * CONFIG.game.pushDistance;
        
        enemy.x = Math.max(0, Math.min(DOM.canvas.width - enemy.size, enemy.x));
        enemy.y = Math.max(0, Math.min(DOM.canvas.height - enemy.size, enemy.y));
    }
};

// ===========================
// SISTEMA DE PERGUNTAS
// ===========================
const QuestionSystem = {
    show(type) {
        gameState.isPaused = true;
        DOM.perguntaContainer.style.display = 'block';

        if (type === 'normal') {
            this.showNormalQuestion();
        } else {
            this.showBossQuestion();
        }
    },

    showNormalQuestion() {
        const { question, answer } = QuestionGenerator.generateMathQuestion();
        DOM.perguntaText.textContent = question;
        gameState.currentAnswer = answer;
        
        this.hideHelp();
    },

    showBossQuestion() {
        const eq = QuestionGenerator.generateLinearEquation();
        DOM.perguntaText.textContent = eq.question;
        gameState.currentAnswer = eq.answer;
        gameState.currentEquation = { a: eq.a, b: eq.b, c: eq.c };
        
        DOM.helpButton.style.display = 'inline-block';
        this.updateHelpInfo();
        DOM.helpHint.style.display = 'none';
    },

    hideHelp() {
        DOM.helpButton.style.display = 'none';
        DOM.helpInfo.style.display = 'none';
        DOM.helpHint.style.display = 'none';
    },

    updateHelpInfo() {
        const health = Number(gameState.player.health.toFixed(2));
        const uses = Math.floor(health / CONFIG.game.helpCost);
        DOM.helpInfo.textContent = `Ajuda custa meia vida. Sua vida atual é = ${health} e você ainda poderá utilizar ${uses} vezes`;
        DOM.helpInfo.style.display = 'block';
    },

    handleSubmit() {
        const userAnswer = parseFloat(DOM.respostaInput.value);
        
        if (userAnswer === gameState.currentAnswer) {
            gameState.isPaused = false;
            DOM.perguntaContainer.style.display = 'none';
            DOM.respostaInput.value = '';
            this.hideHelp();
        } else {
            alert('Errado! Tente novamente.');
        }
    },

    useHelp() {
        const health = Number(gameState.player.health.toFixed(2));
        const uses = Math.floor(health / CONFIG.game.helpCost);
        
        if (uses <= 1) {
            alert('Você não tem vida suficiente para usar ajuda.');
            this.hideHelp();
            return;
        }

        const confirmMsg = `Ajuda custa meia vida. Sua vida atual é = ${health} e você poderá utilizar ${uses} vezes. Deseja usar a ajuda?`;
        if (!confirm(confirmMsg)) return;

        gameState.player.health = Number((gameState.player.health - CONFIG.game.helpCost).toFixed(2));
        this.updateHelpInfo();

        if (gameState.currentEquation) {
            const { a, b, c } = gameState.currentEquation;
            const hintText = `Passos para resolver:\n1) Subtraia ${b} de ambos os lados: ${a}x = ${c} - ${b}\n2) Divida ambos os lados por ${a}: x = ( ${c} - ${b} ) / ${a}\nUtilize essa fórmula para a resolução da questão!`;
            DOM.helpHint.textContent = hintText;
            DOM.helpHint.style.display = 'block';
        }

        if (gameState.player.health <= 0) {
            GameSystem.gameOver();
        }
    }
};

// ===========================
// RENDER IMAGENS 
// ===========================

// ===========CORAÇÃO=============
const heartFullImg = new Image();
const heartHalfImg = new Image();
const heartEmptyImg = new Image();
heartFullImg.src = '../img/coracao.png';
heartHalfImg.src = '../img/corameio.png';
heartEmptyImg.src = '../img/corazio.png';

// ===========BOSS=============
const enemyImg = new Image();
const bossImg = new Image();
enemyImg.src = '../img/inimigo.png';
bossImg.src = '../img/boss.png';

// ===========================
// SISTEMA DE RENDERIZAÇÃO
// ===========================
const RenderSystem = {
    draw() {
        ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);
        this.drawPlayer();
        this.drawAimLine();
        this.drawEnemies();
        this.drawProjectiles();
        this.drawHUD();
    },

    drawPlayer() {
        const player = gameState.player;
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(
            player.x + player.size / 2,
            player.y + player.size / 2,
            player.size / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    },

    drawAimLine() {
        if (gameState.isPaused || gameState.player.health <= 0) return;
        const player = gameState.player;
        const mouse = gameState.mouse;
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x + player.size / 2, player.y + player.size / 2);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
    },

   drawEnemies() {
        gameState.enemies.forEach(enemy => {
            const img = enemy.isBoss ? bossImg : enemyImg;
            const w = enemy.size * 2;
            const h = enemy.size * 2;
            const x = enemy.x - w / 2;
            const y = enemy.y - h / 2;

            if (img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, x, y, w, h);
            } else {
                ctx.fillStyle = enemy.color;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    },

    drawProjectiles() {
        gameState.projectiles.forEach(proj => {
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    drawHUD() {
        DOM.scoreDisplay.textContent = `Pontos: ${gameState.player.score}`;
        DOM.waveDisplay.textContent = `Wave: ${gameState.wave}`;
        this.drawHearts();
    },

       drawHearts() {
        const heartSize = 46;
        const startX = 10;
        const startY = 10;
        const maxHearts = 3;
        let remaining = gameState.player.health;

        for (let i = 0; i < maxHearts; i++) {
            const x = startX + i * (heartSize + 8) + heartSize / 2;
            const y = startY + heartSize / 2;
            
            let fill = 0;
            if (remaining >= 1) {
                fill = 1;
                remaining -= 1;
            } else if (remaining > 0) {
                fill = Math.max(0, Math.min(1, remaining));
                remaining = 0;
            }

            this.drawHeart(x, y, heartSize, fill);
        }
    },

    drawHeart(cx, cy, size, fillFraction) {
        const w = size;
        const h = size;
        const x = cx - w / 2;
        const y = cy - h / 2;

        ctx.save();

        // Desenha o coração vazio sempre
        ctx.drawImage(heartEmptyImg, x, y, w, h);

        // Se o coração está cheio
        if (fillFraction >= 1) {
            ctx.drawImage(heartFullImg, x, y, w, h);
        } 
        // Se o coração está pela metade
        else if (fillFraction > 0) {
            ctx.drawImage(heartHalfImg, x, y, w, h);
        }

        ctx.restore();
    }
};

// ==== Espera todas as imagens carregarem antes de desenhar ====
Promise.all([
    new Promise(res => heartFullImg.onload = res),
    new Promise(res => heartHalfImg.onload = res),
    new Promise(res => heartEmptyImg.onload = res),
    new Promise(res => enemyImg.onload = res),
    new Promise(res => bossImg.onload = res)
]).then(() => {
    RenderSystem.drawHearts();
});

// ===========================
// SISTEMA PRINCIPAL DO JOGO
// ===========================
const GameSystem = {
    update() {
        if (gameState.isPaused || gameState.player.health <= 0) return;

        MovementSystem.updatePlayer();
        MovementSystem.updateEnemies();
        ProjectileSystem.update();
        CollisionSystem.checkAll();

        if (gameState.enemies.length === 0 && gameState.enemiesDefeated >= CONFIG.game.enemiesForBoss) {
            SpawnSystem.spawnBoss();
            gameState.enemiesDefeated = 0;
        }
    },

    gameOver() {
        gameState.isPaused = true;
        QuestionSystem.hideHelp();
        DOM.gameOverContainer.style.display = 'block';
        DOM.finalScoreElement.textContent = gameState.player.score;
    },

    restart() {
        gameState.player.health = CONFIG.player.initialHealth;
        gameState.player.score = 0;
        gameState.player.x = 400;
        gameState.player.y = 300;
        gameState.enemies.length = 0;
        gameState.projectiles.length = 0;
        gameState.wave = 1;
        gameState.enemiesDefeated = 0;
        gameState.isPaused = false;
        
        DOM.gameOverContainer.style.display = 'none';
        QuestionSystem.hideHelp();
        SpawnSystem.spawnEnemies(gameState.wave);
    },

    gameLoop() {
        this.update();
        RenderSystem.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
};

// ===========================
// INICIALIZAÇÃO
// ===========================
function init() {
    InputSystem.init();
    
    DOM.submitResposta.addEventListener('click', () => QuestionSystem.handleSubmit());
    DOM.respostaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') QuestionSystem.handleSubmit();
    });
    DOM.helpButton.addEventListener('click', () => QuestionSystem.useHelp());
    DOM.restartButton.addEventListener('click', () => GameSystem.restart());
    
    SpawnSystem.spawnEnemies(gameState.wave);
    GameSystem.gameLoop();
}

init();