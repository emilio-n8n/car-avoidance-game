const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('finalScore');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const currentHighScoreDisplay = document.getElementById('currentHighScore');
const startButton = document.getElementById('startButton'); // This button is now hidden
const startFromScreenButton = document.getElementById('startFromScreenButton');
const restartButton = document.getElementById('restartButton');
const pauseButton = document.getElementById('pauseButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const startScreen = document.getElementById('startScreen');

// Images
const playerCarImg = document.getElementById('playerCarImg');
const enemyCarImg1 = document.getElementById('enemyCarImg1');
const enemyCarImg2 = document.getElementById('enemyCarImg2');
const roadImg = document.getElementById('roadImg');

// Sons
const crashSound = document.getElementById('crashSound');
const scoreSound = document.getElementById('scoreSound');

let PLAYER_CAR_WIDTH = 50;
let PLAYER_CAR_HEIGHT = 80;
let ENEMY_CAR_WIDTH = 50;
let ENEMY_CAR_HEIGHT = 80;
let LANE_WIDTH;
const ROAD_MARKING_WIDTH = 10;
const ROAD_MARKING_HEIGHT = 50;
const ROAD_MARKING_GAP = 70;

let playerCar = {
    x: 0,
    y: 0,
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

// Adjust canvas size and car dimensions based on window size
function resizeGame() {
    const gameContainer = document.querySelector('.game-container');
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.8;

    let newWidth = 400;
    let newHeight = 600;

    if (maxWidth < newWidth) {
        newWidth = maxWidth;
        newHeight = (newWidth / 400) * 600;
    }
    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = (newHeight / 600) * 400;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    LANE_WIDTH = canvas.width / 3;

    // Adjust car sizes proportionally
    PLAYER_CAR_WIDTH = newWidth / 8;
    PLAYER_CAR_HEIGHT = (PLAYER_CAR_WIDTH / 50) * 80;
    ENEMY_CAR_WIDTH = newWidth / 8;
    ENEMY_CAR_HEIGHT = (ENEMY_CAR_WIDTH / 50) * 80;

    playerCar.width = PLAYER_CAR_WIDTH;
    playerCar.height = PLAYER_CAR_HEIGHT;
    playerCar.x = canvas.width / 2 - playerCar.width / 2;
    playerCar.y = canvas.height - playerCar.height - 10;

    // Adjust enemy car sizes
    enemyCars.forEach(enemy => {
        enemy.width = ENEMY_CAR_WIDTH;
        enemy.height = ENEMY_CAR_HEIGHT;
        // Re-position enemies to fit new lane widths
        const lane = Math.floor(enemy.x / (canvas.width / 3));
        enemy.x = lane * LANE_WIDTH + (LANE_WIDTH / 2) - (enemy.width / 2);
    });

    drawRoad();
    drawCar(playerCar, playerCarImg);
}

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

function createEnemyCar(lane = null) {
    const selectedLane = lane !== null ? lane : generateRandomLane();
    const x = selectedLane * LANE_WIDTH + (LANE_WIDTH / 2) - (ENEMY_CAR_WIDTH / 2);
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

function spawnEnemies() {
    const random = Math.random();
    if (random < 0.7) { // 70% chance to spawn one car
        createEnemyCar();
    } else if (random < 0.9) { // 20% chance to spawn two cars in different lanes
        let lane1 = generateRandomLane();
        let lane2;
        do {
            lane2 = generateRandomLane();
        } while (lane1 === lane2);
        createEnemyCar(lane1);
        createEnemyCar(lane2);
    } else { // 10% chance to spawn three cars (leaving one lane open)
        let openLane = generateRandomLane();
        for (let i = 0; i < 3; i++) {
            if (i !== openLane) {
                createEnemyCar(i);
            }
        }
    }
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
            // Petit effet visuel sur le score
            scoreDisplay.style.transform = 'scale(1.2)';
            setTimeout(() => {
                scoreDisplay.style.transform = 'scale(1)';
            }, 100);
            i--; // Ajuster l'index après suppression

            // Augmenter la vitesse du jeu tous les 10 points
            if (score % 10 === 0 && score !== 0) {
                gameSpeed += 0.5;
                // Mettre à jour la vitesse des voitures existantes et futures
                enemyCars.forEach(car => car.speed = gameSpeed);
                clearInterval(enemySpawnInterval);
                enemySpawnInterval = setInterval(spawnEnemies, Math.max(500, 2000 - gameSpeed * 100)); // Diminuer l'intervalle de spawn
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
    resizeGame(); // Set initial size and position
    enemyCars = [];
    startScreen.style.display = 'none'; // Hide the start screen
    gameOverScreen.style.display = 'none';
    pauseButton.style.display = 'block';
    updateHighScoreDisplay();

    gameInterval = setInterval(updateGameArea, 20); // Rafraîchissement du jeu
    enemySpawnInterval = setInterval(spawnEnemies, 2000); // Apparition des voitures ennemies
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
        enemySpawnInterval = setInterval(spawnEnemies, Math.max(500, 2000 - gameSpeed * 100));
        pauseButton.textContent = 'Pause';
    }
}

function updateHighScoreDisplay() {
    currentHighScoreDisplay.textContent = localStorage.getItem('carGameHighScore') || 0;
}

// Contrôles de la voiture du joueur (clavier)
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

// Contrôles de la voiture du joueur (tactile)
let touchStartX = 0;
canvas.addEventListener('touchstart', (e) => {
    if (!gameRunning || gamePaused) return;
    touchStartX = e.touches[0].clientX;
});

canvas.addEventListener('touchmove', (e) => {
    if (!gameRunning || gamePaused) return;
    const touchCurrentX = e.touches[0].clientX;
    const deltaX = touchCurrentX - touchStartX;

    playerCar.x += deltaX * 0.5; // Adjust sensitivity

    // Empêcher la voiture de sortir du canvas
    if (playerCar.x < 0) playerCar.x = 0;
    if (playerCar.x + playerCar.width > canvas.width) playerCar.x = canvas.width - playerCar.width;

    touchStartX = touchCurrentX; // Update start position for next move
});

// Event Listeners
startFromScreenButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

// Initialisation du jeu (pour afficher la voiture du joueur avant de commencer)
window.onload = () => {
    resizeGame(); // Initial resize
    updateHighScoreDisplay();
    drawRoad();
    drawCar(playerCar, playerCarImg);
    // Show start screen initially
    startScreen.style.display = 'flex';
    startButton.style.display = 'none'; // Ensure old button is hidden
    pauseButton.style.display = 'none'; // Ensure pause button is hidden
};

window.addEventListener('resize', resizeGame);