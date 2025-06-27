const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('finalScore');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const currentHighScoreDisplay = document.getElementById('currentHighScore');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const pauseButton = document.getElementById('pauseButton');
const gameOverScreen = document.getElementById('gameOverScreen');

// Images
const playerCarImg = document.getElementById('playerCarImg');
const enemyCarImg1 = document.getElementById('enemyCarImg1');
const enemyCarImg2 = document.getElementById('enemyCarImg2');
const roadImg = document.getElementById('roadImg');

// Sons
const crashSound = document.getElementById('crashSound');
const scoreSound = document.getElementById('scoreSound');

const PLAYER_CAR_WIDTH = 50;
const PLAYER_CAR_HEIGHT = 80;
const ENEMY_CAR_WIDTH = 50;
const ENEMY_CAR_HEIGHT = 80;
const LANE_WIDTH = canvas.width / 3;
const ROAD_MARKING_WIDTH = 10;
const ROAD_MARKING_HEIGHT = 50;
const ROAD_MARKING_GAP = 70;

let playerCar = {
    x: canvas.width / 2 - PLAYER_CAR_WIDTH / 2,
    y: canvas.height - PLAYER_CAR_HEIGHT - 10,
    width: PLAYER_CAR_WIDTH,
    height: PLAYER_CAR_HEIGHT,
    speed: 5
};

let enemyCars = [];
let score = 0;
let highScore = localStorage.getItem('carGameHighScore') || 0;
let gameSpeed = 3; // Vitesse initiale des voitures ennemies
let gameInterval;
let enemySpawnInterval;
let gameRunning = false;
let gamePaused = false;
let roadScrollOffset = 0;

// Fonction pour dessiner une voiture avec une image
function drawCar(car, img) {
    ctx.drawImage(img, car.x, car.y, car.width, car.height);
}

// Fonction pour dessiner la route défilante et les marquages
function drawRoad() {
    ctx.drawImage(roadImg, 0, roadScrollOffset, canvas.width, canvas.height);
    ctx.drawImage(roadImg, 0, roadScrollOffset - canvas.height, canvas.width, canvas.height);

    // Dessiner les marquages de route
    ctx.fillStyle = 'white';
    for (let i = 0; i < canvas.height / (ROAD_MARKING_HEIGHT + ROAD_MARKING_GAP); i++) {
        // Marquage gauche
        ctx.fillRect(LANE_WIDTH - ROAD_MARKING_WIDTH / 2, (i * (ROAD_MARKING_HEIGHT + ROAD_MARKING_GAP) + roadScrollOffset) % (canvas.height + ROAD_MARKING_GAP) - ROAD_MARKING_GAP, ROAD_MARKING_WIDTH, ROAD_MARKING_HEIGHT);
        // Marquage droit
        ctx.fillRect(2 * LANE_WIDTH - ROAD_MARKING_WIDTH / 2, (i * (ROAD_MARKING_HEIGHT + ROAD_MARKING_GAP) + roadScrollOffset) % (canvas.height + ROAD_MARKING_GAP) - ROAD_MARKING_GAP, ROAD_MARKING_WIDTH, ROAD_MARKING_HEIGHT);
    }
}

function generateRandomLane() {
    return Math.floor(Math.random() * 3); // 0, 1, ou 2 pour les trois voies
}

function createEnemyCar() {
    const lane = generateRandomLane();
    const x = lane * LANE_WIDTH + (LANE_WIDTH / 2) - (ENEMY_CAR_WIDTH / 2);
    const enemyImg = Math.random() < 0.5 ? enemyCarImg1 : enemyCarImg2;
    enemyCars.push({
        x: x,
        y: -ENEMY_CAR_HEIGHT, // Apparaît en haut du canvas
        width: ENEMY_CAR_WIDTH,
        height: ENEMY_CAR_HEIGHT,
        speed: gameSpeed,
        img: enemyImg
    });
}

function updateGameArea() {
    if (!gameRunning || gamePaused) return;

    // Défilement de la route
    roadScrollOffset += gameSpeed;
    if (roadScrollOffset >= canvas.height) {
        roadScrollOffset = 0;
    }
    drawRoad();

    // Dessiner la voiture du joueur
    drawCar(playerCar, playerCarImg);

    // Mettre à jour et dessiner les voitures ennemies
    for (let i = 0; i < enemyCars.length; i++) {
        let enemy = enemyCars[i];
        enemy.y += enemy.speed;
        drawCar(enemy, enemy.img);

        // Supprimer les voitures sorties de l'écran
        if (enemy.y > canvas.height) {
            enemyCars.splice(i, 1);
            score++;
            scoreDisplay.textContent = score;
            scoreSound.play();
            i--; // Ajuster l'index après suppression

            // Augmenter la vitesse du jeu tous les 10 points
            if (score % 10 === 0 && score !== 0) {
                gameSpeed += 0.5;
                // Mettre à jour la vitesse des voitures existantes et futures
                enemyCars.forEach(car => car.speed = gameSpeed);
                clearInterval(enemySpawnInterval);
                enemySpawnInterval = setInterval(createEnemyCar, Math.max(500, 2000 - gameSpeed * 100)); // Diminuer l'intervalle de spawn
            }
        }

        // Détection de collision
        if (
            playerCar.x < enemy.x + enemy.width &&
            playerCar.x + playerCar.width > enemy.x &&
            playerCar.y < enemy.y + enemy.height &&
            playerCar.y + playerCar.height > enemy.y
        ) {
            crashSound.play();
            endGame();
            return;
        }
    }
}

function startGame() {
    gameRunning = true;
    gamePaused = false;
    score = 0;
    scoreDisplay.textContent = score;
    gameSpeed = 3;
    playerCar.x = canvas.width / 2 - PLAYER_CAR_WIDTH / 2;
    playerCar.y = canvas.height - PLAYER_CAR_HEIGHT - 10;
    enemyCars = [];
    startButton.style.display = 'none';
    pauseButton.style.display = 'block';
    gameOverScreen.style.display = 'none';
    updateHighScoreDisplay();

    gameInterval = setInterval(updateGameArea, 20); // Rafraîchissement du jeu
    enemySpawnInterval = setInterval(createEnemyCar, 2000); // Apparition des voitures ennemies
}

function endGame() {
    gameRunning = false;
    clearInterval(gameInterval);
    clearInterval(enemySpawnInterval);
    finalScoreDisplay.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('carGameHighScore', highScore);
    }
    highScoreDisplay.textContent = highScore;
    gameOverScreen.style.display = 'flex';
    pauseButton.style.display = 'none';
}

function togglePause() {
    gamePaused = !gamePaused;
    if (gamePaused) {
        clearInterval(gameInterval);
        clearInterval(enemySpawnInterval);
        pauseButton.textContent = 'Reprendre';
    } else {
        gameInterval = setInterval(updateGameArea, 20);
        enemySpawnInterval = setInterval(createEnemyCar, Math.max(500, 2000 - gameSpeed * 100));
        pauseButton.textContent = 'Pause';
    }
}

function updateHighScoreDisplay() {
    currentHighScoreDisplay.textContent = localStorage.getItem('carGameHighScore') || 0;
}

// Contrôles de la voiture du joueur
document.addEventListener('keydown', (e) => {
    if (!gameRunning || gamePaused) return;

    if (e.key === 'ArrowLeft' || e.key === 'q') {
        playerCar.x -= playerCar.speed * 10; // Déplacement plus rapide
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
        playerCar.x += playerCar.speed * 10; // Déplacement plus rapide
    }

    // Empêcher la voiture de sortir du canvas
    if (playerCar.x < 0) playerCar.x = 0;
    if (playerCar.x + playerCar.width > canvas.width) playerCar.x = canvas.width - playerCar.width;
});

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

// Initialisation du jeu (pour afficher la voiture du joueur avant de commencer)
window.onload = () => {
    updateHighScoreDisplay();
    drawRoad();
    drawCar(playerCar, playerCarImg);
};
