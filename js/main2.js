// ============================================
// ELEMENTOS DO DOM
// ============================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menuContainer = document.getElementById('menu-container');
const startButton = document.getElementById('start-button');
const perguntaContainer = document.getElementById('pergunta-container');
const perguntaText = document.getElementById('pergunta');
const respostaInput = document.getElementById('resposta-input');
const submitResposta = document.getElementById('submit-resposta');
const helpButton = document.getElementById('help-button');
const helpInfo = document.getElementById('help-info');
const helpHint = document.getElementById('help-hint');
const gameOverContainer = document.getElementById('game-over-container');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');

// ============================================
// VARIÁVEIS DO JOGO
// ============================================
const player = {
    x: 400,
    y: 300,
    size: 25,
    speed: 3,
    color: 'blue',
    health: 3,
    score: 0
};

const enemies = [];
const projectiles = [];
let wave = 1;
let enemiesDefeated = 0;
let isPaused = false;
let gameStarted = false;

// Variáveis para tiro contínuo
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let mousePressed = false;
let lastShot = 0;
const fireRate = 250; // milissegundos entre cada tiro (4 tiros por segundo)

// Botão de voltar ao menu
document.getElementById('menu-button').addEventListener('click', function() {
    window.location.href = 'index.html';
});

// ============================================
// INICIALIZAÇÃO DO JOGO
// ============================================
function startGame() {
    gameStarted = true;
    menuContainer.style.display = 'none';
    canvas.classList.add('active');
    spawnEnemies();
}

// ============================================
// GERAÇÃO DE PERGUNTAS
// ============================================
function generateMathQuestion() {
    const operations = ['+', '-', '*', '/'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    let question = '';
    let answer = 0;

    if (op === '+') {
        question = `${num1} + ${num2} = ?`;
        answer = num1 + num2;
    } else if (op === '-') {
        question = `${Math.max(num1, num2)} - ${Math.min(num1, num2)} = ?`;
        answer = Math.max(num1, num2) - Math.min(num1, num2);
    } else if (op === '*') {
        question = `${num1} * ${num2} = ?`;
        answer = num1 * num2;
    } else if (op === '/') {
        question = `${num1 * num2} / ${num2} = ?`;
        answer = num1;
    }
    
    return { question, answer };
}

function generateLinearEquation() {
    const a = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const c = a * Math.floor(Math.random() * 5) + b;
    const question = `${a}x + ${b} = ${c}. Qual é o valor de x?`;
    const answer = (c - b) / a;
    
    return { question, answer, a, b, c };
}

// ============================================
// GERENCIAMENTO DE PERGUNTAS
// ============================================
function showQuestion(type) {
    isPaused = true;
    perguntaContainer.style.display = 'block';
    
    if (type === 'normal') {
        const { question, answer } = generateMathQuestion();
        perguntaText.textContent = question;
        window.currentAnswer = answer;
        hideHelpElements();
    } else {
        const eq = generateLinearEquation();
        perguntaText.textContent = eq.question;
        window.currentAnswer = eq.answer;
        window.currentEquation = { a: eq.a, b: eq.b, c: eq.c };
        helpButton.style.display = 'inline-block';
        updateHelpInfo();
        helpHint.style.display = 'none';
    }
}

function handleSubmitAnswer() {
    const userAnswer = parseFloat(respostaInput.value);
    
    if (userAnswer === window.currentAnswer) {
        isPaused = false;
        perguntaContainer.style.display = 'none';
        respostaInput.value = '';
        hideHelpElements();
    } else {
        alert('Errado! Tente novamente.');
    }
}

function hideHelpElements() {
    helpButton.style.display = 'none';
    helpInfo.style.display = 'none';
    helpHint.style.display = 'none';
}

// ============================================
// SISTEMA DE AJUDA
// ============================================
function updateHelpInfo() {
    const X = Number(player.health.toFixed(2));
    const Y = Math.floor(X / 0.5);
    helpInfo.textContent = `Ajuda custa meia vida. sua vida atual é = ${X} e você ainda poderá utilizar ${Y} vezes`;
    helpInfo.style.display = 'block';
}

function handleHelp() {
    const X = Number(player.health.toFixed(2));
    const Y = Math.floor(X / 0.5);
    
    if (Y <= 0) {
        alert('Você não tem vida suficiente para usar ajuda.');
        hideHelpElements();
        return;
    }
    
    const confirmMsg = `Ajuda custa meia vida. sua vida atual é = ${X} e você poderá utilizar ${Y} vezes. Deseja usar a ajuda?`;
    if (!confirm(confirmMsg)) return;

    player.health = Number((player.health - 0.5).toFixed(2));
    updateHelpInfo();

    if (window.currentEquation) {
        const { a, b, c } = window.currentEquation;
        const hintText = `Passos para resolver:\n1) Subtraia ${b} de ambos os lados: ${a}x = ${c} - ${b}\n2) Divida ambos os lados por ${a}: x = ( ${c} - ${b} ) / ${a}\nUtilize essa fórmula para a resolução da questão!`;
        helpHint.textContent = hintText;
        helpHint.style.display = 'block';
    } else {
        helpHint.textContent = 'Dica indisponível.';
        helpHint.style.display = 'block';
    }

    if (player.health <= 0) {
        gameOver();
    }
}

// ============================================
// SPAWN DE INIMIGOS
// ============================================
function spawnEnemies() {
    for (let i = 0; i < 3 * wave; i++) {
        enemies.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 15 + wave * 2,
            speed: 0.5 + wave * 0.15,
            color: 'red',
            health: 1,
            isBoss: false
        });
    }
}

function spawnBoss() {
    player.health = 3;
    enemies.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        size: 50,
        speed: 0.5,
        color: 'purple',
        health: 5,
        isBoss: true
    });
}

// ============================================
// CONTROLES E INPUT - SISTEMA DE TIRO CONTÍNUO
// ============================================
const keyState = { w: false, a: false, s: false, d: false };

function handleInput() {
    // Controles de teclado
    document.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
            if (player.health <= 0) return;
            keyState[k] = true;
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
            keyState[k] = false;
        }
    });

    // Rastrear posição do mouse
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // Mouse pressionado = atirar
    canvas.addEventListener('mousedown', (e) => {
        if (isPaused || player.health <= 0) return;
        mousePressed = true;
    });

    canvas.addEventListener('mouseup', () => {
        mousePressed = false;
    });

    // Prevenir que o mouse solte fora do canvas
    document.addEventListener('mouseup', () => {
        mousePressed = false;
    });

    return keyState;
}

// ============================================
// SISTEMA DE TIRO
// ============================================
function shoot() {
    const angle = Math.atan2(
        mouseY - (player.y + player.size / 2),
        mouseX - (player.x + player.size / 2)
    );
    
    projectiles.push({
        x: player.x + player.size / 2,
        y: player.y + player.size / 2,
        speed: 7,
        angle: angle,
        size: 5,
        color: 'black'
    });
}

function tryShoot() {
    if (isPaused || player.health <= 0) return;
    if (!mousePressed) return;

    const now = Date.now();
    if (now - lastShot < fireRate) return;

    lastShot = now;
    shoot();
}

// ============================================
// ATUALIZAÇÃO DO JOGO
// ============================================
function update() {
    if (!gameStarted || isPaused || player.health <= 0) return;

    // Tentar atirar (tiro contínuo)
    tryShoot();

    // Movimento do jogador
    let vx = 0, vy = 0;
    if (keyState.w && !keyState.s) vy -= player.speed;
    if (keyState.s && !keyState.w) vy += player.speed;
    if (keyState.a && !keyState.d) vx -= player.speed;
    if (keyState.d && !keyState.a) vx += player.speed;

    // Normalizar velocidade diagonal
    if (vx !== 0 && vy !== 0) {
        const inv = 1 / Math.sqrt(2);
        vx *= inv;
        vy *= inv;
    }

    player.x += vx;
    player.y += vy;
    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));

    // Atualizar projéteis
    projectiles.forEach((proj, index) => {
        proj.x += Math.cos(proj.angle) * proj.speed;
        proj.y += Math.sin(proj.angle) * proj.speed;
        
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            projectiles.splice(index, 1);
        }
    });

    // Atualizar inimigos
    enemies.forEach((enemy, enemyIndex) => {
        const angle = Math.atan2(
            player.y + player.size / 2 - enemy.y,
            player.x + player.size / 2 - enemy.x
        );
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;

        // Colisão projétil-inimigo
        projectiles.forEach((proj, projIndex) => {
            const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            
            if (dist < enemy.size) {
                enemy.health -= 1;
                enemy.color = 'orange';
                projectiles.splice(projIndex, 1);
                
                if (enemy.isBoss && enemy.health > 0) {
                    showQuestion('boss');
                } else if (enemy.health <= 0) {
                    showQuestion(enemy.isBoss ? 'boss' : 'normal');
                    enemiesDefeated++;
                    player.score += enemy.isBoss ? 5 : 1;
                    enemies.splice(enemyIndex, 1);
                    
                    if (enemy.isBoss) {
                        wave++;
                        spawnEnemies();
                    }
                }
            }
        });

        // Colisão jogador-inimigo
        const playerDist = Math.hypot(
            player.x + player.size / 2 - enemy.x,
            player.y + player.size / 2 - enemy.y
        );
        
        if (playerDist < player.size + enemy.size) {
            player.health -= 1;
            
            if (player.health <= 0) {
                gameOver();
            }
            
            const pushDistance = 50;
            const pushAngle = Math.atan2(
                enemy.y - (player.y + player.size / 2),
                enemy.x - (player.x + player.size / 2)
            );
            
            enemy.x += Math.cos(pushAngle) * pushDistance;
            enemy.y += Math.sin(pushAngle) * pushDistance;
            enemy.x = Math.max(0, Math.min(canvas.width - enemy.size, enemy.x));
            enemy.y = Math.max(0, Math.min(canvas.height - enemy.size, enemy.y));
        }
    });

    // Verificar se deve spawnar chefão
    if (enemies.length === 0 && enemiesDefeated >= 3) {
        spawnBoss();
        enemiesDefeated = 0;
    }
}

// ============================================
// RENDERIZAÇÃO
// ============================================
function drawHeart(cx, cy, size, fillFraction) {
    const w = size;
    const h = size;
    const x = cx;
    const y = cy - h / 4;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.25);
    ctx.bezierCurveTo(x, y, x - w * 0.5, y, x - w * 0.5, y + h * 0.25);
    ctx.bezierCurveTo(x - w * 0.5, y + h * 0.6, x, y + h * 0.9, x, y + h);
    ctx.bezierCurveTo(x, y + h * 0.9, x + w * 0.5, y + h * 0.6, x + w * 0.5, y + h * 0.25);
    ctx.bezierCurveTo(x + w * 0.5, y, x, y, x, y + h * 0.25);
    ctx.closePath();

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000';
    ctx.stroke();

    if (fillFraction > 0) {
        ctx.save();
        ctx.clip();
        const bboxHeight = h * 1.1;
        const fillHeight = bboxHeight * fillFraction;
        ctx.beginPath();
        ctx.rect(x - w * 0.6, y + h - fillHeight, w * 1.2, fillHeight + 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar jogador
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Desenhar inimigos
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Desenhar projéteis
    projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Desenhar informações
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Onda: ${wave}`, 10, 30);
    ctx.fillText(`Pontuação: ${player.score}`, 10, 60);

    // Desenhar corações
    const heartSize = 32;
    const startX = 10;
    const startY = 80;
    const maxHearts = 3;
    let remaining = player.health;

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
        
        drawHeart(x, y, heartSize, fill);
    }
}

// ============================================
// GAME OVER E RESTART
// ============================================
function gameOver() {
    isPaused = true;
    hideHelpElements();
    gameOverContainer.style.display = 'block';
    finalScoreElement.textContent = player.score;
}

function restartGame() {
    player.health = 3;
    player.score = 0;
    enemies.length = 0;
    projectiles.length = 0;
    wave = 1;
    enemiesDefeated = 0;
    isPaused = false;
    gameStarted = false;
    mousePressed = false;
    lastShot = 0;
    gameOverContainer.style.display = 'none';
    canvas.classList.remove('active');
    hideHelpElements();
    menuContainer.style.display = 'block';
}

// ============================================
// GAME LOOP
// ============================================
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ============================================
// EVENT LISTENERS
// ============================================
startButton.addEventListener('click', startGame);
submitResposta.addEventListener('click', handleSubmitAnswer);
respostaInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleSubmitAnswer();
    }
});
helpButton.addEventListener('click', handleHelp);
restartButton.addEventListener('click', restartGame);

// ============================================
// INICIALIZAÇÃO
// ============================================
handleInput();
gameLoop();