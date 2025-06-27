const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('finalScore');
const highScoreDisplay = document.getElementById('highScoreDisplay');
const currentHighScoreDisplay = document.getElementById('currentHighScore');
const startFromScreenButton = document.getElementById('startFromScreenButton');
const restartButton = document.getElementById('restartButton');
const pauseButton = document.getElementById('pauseButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const startScreen = document.getElementById('startScreen');
const loadingScreen = document.getElementById('loadingScreen');

// Images
const playerCarImg = new Image();
playerCarImg.src = "https://via.placeholder.com/50x80/0000FF/FFFFFF?text=Player";
const enemyCarImg1 = new Image();
enemyCarImg1.src = "https://via.placeholder.com/50x80/FF0000/FFFFFF?text=Enemy1";
const enemyCarImg2 = new Image();
enemyCarImg2.src = "https://via.placeholder.com/50x80/00FF00/FFFFFF?text=Enemy2";
const roadImg = new Image();
roadImg.src = "https://via.placeholder.com/400x600/808080/FFFFFF?text=Road";
const powerUpScoreImg = new Image();
powerUpScoreImg.src = "https://via.placeholder.com/30x30/FFFF00/000000?text=2X";
const powerUpInvincibleImg = new Image();
powerUpInvincibleImg.src = "https://via.placeholder.com/30x30/00FFFF/000000?text=INV";

const images = [playerCarImg, enemyCarImg1, enemyCarImg2, roadImg, powerUpScoreImg, powerUpInvincibleImg];
let assetsLoaded = 0;

// Sons
const crashSound = document.getElementById('crashSound');
const scoreSound = document.getElementById('scoreSound');
const powerUpSound = document.getElementById('powerUpSound');

let PLAYER_CAR_WIDTH = 50;
let PLAYER_CAR_HEIGHT = 80;
let ENEMY_CAR_WIDTH = 50;
let ENEMY_CAR_HEIGHT = 80;
let POWER_UP_WIDTH = 30;
let POWER_UP_HEIGHT = 30;
let LANE_WIDTH;
const ROAD_MARKING_WIDTH = 10;
const ROAD_MARKING_HEIGHT = 50;
const ROAD_MARKING_GAP = 70;

let playerCar = {
    x: 0,
    y: 0,
    width: PLAYER_CAR_WIDTH,
    height: PLAYER_CAR_HEIGHT,
    speed: 5,
    invincible: false,
    flash: false
};

let enemyCars = [];
let powerUps = [];
let score = 0;
let scoreMultiplier = 1;
let powerUpActive = false;
let powerUpTimer;
let invincibleTimer;
let invincibleFlashInterval;
let highScore = localStorage.getItem('carGameHighScore') || 0;
let gameSpeed = 3; // Vitesse initiale des voitures ennemies
let gameInterval;
let enemySpawnInterval;
let powerUpSpawnInterval;
let gameState = 'LOADING'; // LOADING, START_SCREEN, PLAYING, PAUSED, GAME_OVER
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
    POWER_UP_WIDTH = newWidth / 12;
    POWER_UP_HEIGHT = newWidth / 12;

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

    // Adjust power-up sizes
    powerUps.forEach(powerUp => {
        powerUp.width = POWER_UP_WIDTH;
        powerUp.height = POWER_UP_HEIGHT;
        const lane = Math.floor(powerUp.x / (canvas.width / 3));
        powerUp.x = lane * LANE_WIDTH + (LANE_WIDTH / 2) - (powerUp.width / 2);
    });

    if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        drawGame();
    }
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

function createPowerUp() {
    const lane = generateRandomLane();
    const x = lane * LANE_WIDTH + (LANE_WIDTH / 2) - (POWER_UP_WIDTH / 2);
    const randomType = Math.random();
    let powerUpType;
    let powerUpImage;

    if (randomType < 0.7) { // 70% chance for score multiplier
        powerUpType = 'scoreMultiplier';
        powerUpImage = powerUpScoreImg;
    } else { // 30% chance for invincibility
        powerUpType = 'invincible';
        powerUpImage = powerUpInvincibleImg;
    }

    powerUps.push({
        x: x,
        y: -POWER_UP_HEIGHT,
        width: POWER_UP_WIDTH,
        height: POWER_UP_HEIGHT,
        speed: gameSpeed,
        img: powerUpImage,
        type: powerUpType
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

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoad();

    // Draw player car, with flashing effect if invincible
    if (playerCar.invincible && playerCar.flash) {
        // Don't draw if flashing off
    } else {
        drawCar(playerCar, playerCarImg);
    }

    enemyCars.forEach(enemy => drawCar(enemy, enemy.img));
    powerUps.forEach(powerUp => ctx.drawImage(powerUp.img, powerUp.x, powerUp.y, powerUp.width, powerUp.height));

    // Draw power-up active indicator
    if (scoreMultiplier > 1) {
        ctx.fillStyle = 'yellow';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('2X SCORE!', canvas.width / 2, 30);
    }
    if (playerCar.invincible) {
        ctx.fillStyle = 'cyan';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('INVINCIBLE!', canvas.width / 2, 60);
    }
}

function updateGameArea() {
    if (gameState !== 'PLAYING') return;

    // Défilement de la route
    roadScrollOffset += gameSpeed;
    if (roadScrollOffset >= canvas.height) {
        roadScrollOffset = 0;
    }

    // Mettre à jour et dessiner les voitures ennemies
    for (let i = 0; i < enemyCars.length; i++) {
        let enemy = enemyCars[i];
        enemy.y += enemy.speed;

        // Supprimer les voitures sorties de l'écran
        if (enemy.y > canvas.height) {
            enemyCars.splice(i, 1);
            score += 1 * scoreMultiplier;
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

        // Détection de collision avec les ennemis
        if (!playerCar.invincible &&
            playerCar.x < enemy.x + enemy.width &&
            playerCar.x + playerCar.width > enemy.x &&
            playerCar.y < enemy.y + enemy.height &&
            playerCar.y + playerCar.height > enemy.y
        ) {
            crashSound.play();
            setGameState('GAME_OVER');
            return;
        }
    }

    // Mettre à jour et dessiner les power-ups
    for (let i = 0; i < powerUps.length; i++) {
        let powerUp = powerUps[i];
        powerUp.y += powerUp.speed;

        // Supprimer les power-ups sortis de l'écran
        if (powerUp.y > canvas.height) {
            powerUps.splice(i, 1);
            i--;
        }

        // Détection de collision avec les power-ups
        if (
            playerCar.x < powerUp.x + powerUp.width &&
            playerCar.x + playerCar.width > powerUp.x &&
            playerCar.y < powerUp.y + powerUp.height &&
            playerCar.y + playerCar.height > powerUp.y
        ) {
            powerUpSound.play();
            powerUps.splice(i, 1);
            i--;
            activatePowerUp(powerUp.type);
        }
    }

    drawGame();
}

function activatePowerUp(type) {
    if (type === 'scoreMultiplier') {
        scoreMultiplier = 2; // Double le score
        powerUpActive = true;
        // Réinitialiser le timer si un power-up est déjà actif
        clearTimeout(powerUpTimer);
        powerUpTimer = setTimeout(() => {
            scoreMultiplier = 1;
            powerUpActive = false;
        }, 5000); // Power-up dure 5 secondes
    } else if (type === 'invincible') {
        playerCar.invincible = true;
        // Start flashing
        playerCar.flash = true;
        invincibleFlashInterval = setInterval(() => {
            playerCar.flash = !playerCar.flash;
        }, 100); // Flash every 100ms

        // Réinitialiser le timer si un power-up est déjà actif
        clearTimeout(invincibleTimer);
        invincibleTimer = setTimeout(() => {
            playerCar.invincible = false;
            clearInterval(invincibleFlashInterval);
            playerCar.flash = false; // Ensure it's visible after invincibility ends
        }, 7000); // Invincibilité dure 7 secondes
    }
}

function setGameState(newState) {
    gameState = newState;
    loadingScreen.style.display = 'none';
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    pauseButton.style.display = 'none';

    switch (gameState) {
        case 'LOADING':
            loadingScreen.style.display = 'flex';
            break;
        case 'START_SCREEN':
            startScreen.style.display = 'flex';
            updateHighScoreDisplay();
            break;
        case 'PLAYING':
            pauseButton.style.display = 'block';
            gameInterval = setInterval(updateGameArea, 20);
            enemySpawnInterval = setInterval(spawnEnemies, 2000);
            powerUpSpawnInterval = setInterval(createPowerUp, 10000); // Power-up toutes les 10 secondes
            break;
        case 'PAUSED':
            pauseButton.style.display = 'block';
            pauseButton.textContent = 'Reprendre';
            clearInterval(gameInterval);
            clearInterval(enemySpawnInterval);
            clearInterval(powerUpSpawnInterval);
            clearInterval(invincibleFlashInterval);
            break;
        case 'GAME_OVER':
            finalScoreDisplay.textContent = score;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('carGameHighScore', highScore);
            }
            highScoreDisplay.textContent = highScore;
            gameOverScreen.style.display = 'flex';
            clearInterval(gameInterval);
            clearInterval(enemySpawnInterval);
            clearInterval(powerUpSpawnInterval);
            clearInterval(invincibleFlashInterval);
            playerCar.invincible = false; // Ensure invincibility is off
            playerCar.flash = false; // Ensure car is visible
            break;
    }
}

function startGame() {
    score = 0;
    scoreMultiplier = 1;
    powerUpActive = false;
    playerCar.invincible = false;
    playerCar.flash = false;
    clearTimeout(powerUpTimer);
    clearTimeout(invincibleTimer);
    clearInterval(invincibleFlashInterval);
    scoreDisplay.textContent = score;
    gameSpeed = 3;
    resizeGame();
    playerCar.x = canvas.width / 2 - playerCar.width / 2;
    playerCar.y = canvas.height - playerCar.height - 10;
    enemyCars = [];
    powerUps = [];
    setGameState('PLAYING');
}

function togglePause() {
    if (gameState === 'PLAYING') {
        setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
        setGameState('PLAYING');
        pauseButton.textContent = 'Pause';
    }
}

function updateHighScoreDisplay() {
    currentHighScoreDisplay.textContent = localStorage.getItem('carGameHighScore') || 0;
}

// Contrôles de la voiture du joueur (clavier)
document.addEventListener('keydown', (e) => {
    if (gameState !== 'PLAYING') return;

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
    if (gameState !== 'PLAYING') return;
    touchStartX = e.touches[0].clientX;
});

canvas.addEventListener('touchmove', (e) => {
    if (gameState !== 'PLAYING') return;
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

window.addEventListener('resize', resizeGame);

// Asset loading
images.forEach(img => {
    img.onload = () => {
        assetsLoaded++;
        if (assetsLoaded === images.length) {
            // All images loaded, check sounds
            if (crashSound.readyState >= 2 && scoreSound.readyState >= 2 && powerUpSound.readyState >= 2) {
                setGameState('START_SCREEN');
                resizeGame(); // Initial resize after assets are loaded
            } else {
                // Wait for sounds to load
                crashSound.addEventListener('canplaythrough', checkSoundsLoaded);
                scoreSound.addEventListener('canplaythrough', checkSoundsLoaded);
                powerUpSound.addEventListener('canplaythrough', checkSoundsLoaded);
            }
        }
    };
    img.onerror = () => {
        console.error("Failed to load image: " + img.src);
        // Handle error, maybe show a message or use a fallback
    };
});

function checkSoundsLoaded() {
    if (crashSound.readyState >= 2 && scoreSound.readyState >= 2 && powerUpSound.readyState >= 2 && assetsLoaded === images.length) {
        setGameState('START_SCREEN');
        resizeGame();
    }
}

// Initial state
setGameState('LOADING');
