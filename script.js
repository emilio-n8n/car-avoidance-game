const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const startButton = document.getElementById('startButton');

const PLAYER_CAR_WIDTH = 50;
const PLAYER_CAR_HEIGHT = 80;
const ENEMY_CAR_WIDTH = 50;
const ENEMY_CAR_HEIGHT = 80;
const LANE_WIDTH = canvas.width / 3;

let playerCar = {
    x: canvas.width / 2 - PLAYER_CAR_WIDTH / 2,
    y: canvas.height - PLAYER_CAR_HEIGHT - 10,
    width: PLAYER_CAR_WIDTH,
    height: PLAYER_CAR_HEIGHT,
    speed: 5
};

let enemyCars = [];
let score = 0;
let gameSpeed = 3; // Vitesse initiale des voitures ennemies
let gameInterval;
let enemySpawnInterval;
let gameRunning = false;

function drawCar(car, color) {
    ctx.fillStyle = color;
    ctx.fillRect(car.x, car.y, car.width, car.height);
}

function generateRandomLane() {
    return Math.floor(Math.random() * 3); // 0, 1, ou 2 pour les trois voies
}

function createEnemyCar() {
    const lane = generateRandomLane();
    const x = lane * LANE_WIDTH + (LANE_WIDTH / 2) - (ENEMY_CAR_WIDTH / 2);
    enemyCars.push({
        x: x,
        y: -ENEMY_CAR_HEIGHT, // Apparaît en haut du canvas
        width: ENEMY_CAR_WIDTH,
        height: ENEMY_CAR_HEIGHT,
        speed: gameSpeed
    });
}

function updateGameArea() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner la voiture du joueur
    drawCar(playerCar, 'blue');

    // Mettre à jour et dessiner les voitures ennemies
    for (let i = 0; i < enemyCars.length; i++) {
        let enemy = enemyCars[i];
        enemy.y += enemy.speed;
        drawCar(enemy, 'red');

        // Supprimer les voitures sorties de l'écran
        if (enemy.y > canvas.height) {
            enemyCars.splice(i, 1);
            score++;
            scoreDisplay.textContent = score;
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
            endGame();
            return;
        }
    }
}

function startGame() {
    gameRunning = true;
    score = 0;
    scoreDisplay.textContent = score;
    gameSpeed = 3;
    playerCar.x = canvas.width / 2 - PLAYER_CAR_WIDTH / 2;
    playerCar.y = canvas.height - PLAYER_CAR_HEIGHT - 10;
    enemyCars = [];
    startButton.style.display = 'none';

    gameInterval = setInterval(updateGameArea, 20); // Rafraîchissement du jeu
    enemySpawnInterval = setInterval(createEnemyCar, 2000); // Apparition des voitures ennemies
}

function endGame() {
    gameRunning = false;
    clearInterval(gameInterval);
    clearInterval(enemySpawnInterval);
    alert(`Game Over! Votre score est: ${score}`);
    startButton.style.display = 'block';
}

// Contrôles de la voiture du joueur
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;

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

// Initialisation du jeu (pour afficher la voiture du joueur avant de commencer)
drawCar(playerCar, 'blue');
