requiero que me lo pases completo que yo no se como hacerlo: // Configuración inicial del canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Variables del juego
let GAME_WIDTH, GAME_HEIGHT;
let ROAD_WIDTH, ROAD_LEFT, ROAD_RIGHT, ROAD_CENTER;
let level = 1;
let subLevelSpeed = 1;
let timeElapsed = 0;
let slowdownCounter = 0;
let lastFrameTime = performance.now();
let collisionTime = null;
let gameRunning = true;

// Controles móviles
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const upBtn = document.getElementById("upBtn");
const downBtn = document.getElementById("downBtn");

// Configuración responsive
function setupGameDimensions() {
    GAME_WIDTH = window.innerWidth;
    GAME_HEIGHT = window.innerHeight;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    ROAD_WIDTH = Math.min(GAME_WIDTH * 0.8, 400);
    ROAD_LEFT = (GAME_WIDTH - ROAD_WIDTH) / 2;
    ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
    ROAD_CENTER = ROAD_LEFT + ROAD_WIDTH / 2;
    
    car.width = ROAD_WIDTH * 0.2;
    car.height = car.width * 1.5;
    car.x = ROAD_CENTER - car.width / 2;
    car.y = GAME_HEIGHT * 0.7;
    car.minX = ROAD_LEFT + 10;
    car.maxX = ROAD_RIGHT - car.width - 10;
    car.minY = GAME_HEIGHT * 0.2;
    car.maxY = GAME_HEIGHT * 0.9;
}

// Hitboxes
const HITBOX_SETTINGS = {
    player: { width: 25, height: 45, offsetX: 20, offsetY: 25 },
    truck: { width: 17, height: 100, offsetX: 30, offsetY: 15 },
    car: { width: 20, height: 60, offsetX: 23, offsetY: 16 },
    moto: { width: 10, height: 20, offsetX: 20, offsetY: 30 },
    plant: { width: 10, height: 10, offsetX: 10, offsetY: 10 }
};

// Jugador
let car = {
    x: 0, y: 0, width: 70, height: 100,
    minX: 0, maxX: 0,
    minY: 0, maxY: 0,
    get hitbox() {
        const s = HITBOX_SETTINGS.player;
        return {
            x: this.x + s.offsetX,
            y: this.y + s.offsetY,
            width: s.width,
            height: s.height
        };
    }
};

// Imágenes (asegúrate de tener estos archivos en tu proyecto)
let carImg = new Image();
carImg.src = "./car.png";

const obstacleImagePaths = [
    { src: "./camion.png", type: "truck" },
    { src: "./carro.png", type: "car" },
    { src: "./carro2.png", type: "car" },
    { src: "./moto.png", type: "moto" },
    { src: "./moto2.png", type: "moto" }
];

let obstacleImgObjects = obstacleImagePaths.map(({ src, type }) => {
    const img = new Image();
    img.src = src;
    return { img, type, src };
});

// Líneas de carretera
let roadLines = [];
function initRoadLines() {
    roadLines = [];
    const lineSpacing = GAME_HEIGHT * 0.1;
    for (let y = -lineSpacing; y < GAME_HEIGHT + lineSpacing; y += lineSpacing) {
        roadLines.push({ 
            x: ROAD_CENTER, 
            y: y,
            width: ROAD_WIDTH * 0.02,
            height: lineSpacing * 0.6
        });
    }
}

// Obstáculos
let obstacles = [];
let greenCubes = [];

const LEVEL_SETTINGS = [
    { duration: 75, speedIncrement: 0.2, maxSpeed: 2.5, obstacleRate: 0.012, cubeRate: 0.006, roadColor: "#333" },
    { duration: 80, speedIncrement: 0.25, maxSpeed: 3.0, obstacleRate: 0.015, cubeRate: 0.008, roadColor: "#222" },
    { duration: 85, speedIncrement: 0.3, maxSpeed: 3.5, obstacleRate: 0.018, cubeRate: 0.01, roadColor: "#1a1a1a" },
    { duration: 90, speedIncrement: 0.35, maxSpeed: 4.0, obstacleRate: 0.021, cubeRate: 0.012, roadColor: "#111" }
];

// Funciones del juego
function checkCollision(rect1, rect2) {
    return !(
        rect1.x + rect1.width < rect2.x ||
        rect1.x > rect2.x + rect2.width ||
        rect1.y + rect1.height < rect2.y ||
        rect1.y > rect2.y + rect2.height
    );
}

function getObstacleHitbox(obs) {
    const s = HITBOX_SETTINGS[obs.type] || HITBOX_SETTINGS.car;
    return {
        x: obs.x + s.offsetX * (obs.width/70),
        y: obs.y + s.offsetY * (obs.height/100),
        width: s.width * (obs.width/70),
        height: s.height * (obs.height/100)
    };
}

function drawGreenCube(x, y, size) {
    ctx.fillStyle = "#00AA00";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = "#005500";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
}

function drawWatermark() {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#AAAAAA";
    ctx.font = `italic ${GAME_WIDTH * 0.1}px Arial`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 10;
    ctx.fillText("STARMORALES", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);
    ctx.restore();
}

function drawLevelIndicator() {
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${GAME_WIDTH * 0.045}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText(`NIVEL ${level}/10`, 20, 35);
    
    const progressWidth = GAME_WIDTH * 0.4;
    const progress = timeElapsed / LEVEL_SETTINGS[Math.min(level-1, 3)].duration;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(20, 45, progressWidth, 10);
    ctx.fillStyle = "#0f0";
    ctx.fillRect(20, 45, progressWidth * progress, 10);
    
    ctx.fillText(`VELOCIDAD: ${subLevelSpeed.toFixed(1)}X`, 20, 80);
}

// Controles móviles
function setupMobileControls() {
    let leftActive = false, rightActive = false;
    let upActive = false, downActive = false;
    const moveSpeed = 6;
    
    leftBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        leftActive = true;
    });
    
    leftBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        leftActive = false;
    });
    
    rightBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        rightActive = true;
    });
    
    rightBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        rightActive = false;
    });
    
    upBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        upActive = true;
    });
    
    upBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        upActive = false;
    });
    
    downBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        downActive = true;
    });
    
    downBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        downActive = false;
    });
    
    return function updateControls(deltaTime) {
        if (leftActive) car.x = Math.max(car.minX, car.x - moveSpeed);
        if (rightActive) car.x = Math.min(car.maxX, car.x + moveSpeed);
        if (upActive) car.y = Math.max(car.minY, car.y - moveSpeed);
        if (downActive) car.y = Math.min(car.maxY, car.y + moveSpeed);
    };
}

function generateObstacle() {
    const type = obstacleImgObjects[Math.floor(Math.random() * obstacleImgObjects.length)].type;
    let width = ROAD_WIDTH * 0.2, height = width * 1.5;
    
    if (type === "truck") {
        width = ROAD_WIDTH * 0.25;
        height = width * 1.8;
    } else if (type === "moto") {
        width = ROAD_WIDTH * 0.15;
        height = width * 2.0;
    }

    // Carril izquierdo (bajan) - Carril derecho (suben)
    const isLeftLane = Math.random() < 0.5;
    const direction = isLeftLane ? "down" : "up";
    const lane = isLeftLane ? 
        ROAD_LEFT + Math.random() * (ROAD_CENTER - ROAD_LEFT - width) :
        ROAD_CENTER + Math.random() * (ROAD_RIGHT - ROAD_CENTER - width);
    
    obstacles.push({
        x: lane,
        y: direction === "up" ? GAME_HEIGHT : -height,
        width, height,
        img: obstacleImgObjects.find(o => o.type === type).img,
        speed: (1.2 + (level * 0.15)) * subLevelSpeed,
        direction: direction,
        type
    });
}

function generateGreenCube() {
    const cubeSize = ROAD_WIDTH * 0.1;
    greenCubes.push({
        x: ROAD_CENTER - cubeSize/2,
        y: -cubeSize,
        width: cubeSize,
        height: cubeSize,
        speed: 1.8 * subLevelSpeed
    });
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        // Movimiento vertical según dirección
        obs.y += obs.direction === "down" ? obs.speed : -obs.speed;
        
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(obs.img, obs.x, obs.y, obs.width, obs.height);
        ctx.restore();

        if (checkCollision(car.hitbox, getObstacleHitbox(obs))) {
            collisionTime = performance.now();
            gameRunning = false;
            return;
        }

        if ((obs.y + obs.height < 0) || (obs.y > GAME_HEIGHT)) {
            obstacles.splice(i, 1);
        }
    }
}

function resetGame() {
    level = 1;
    timeElapsed = 0;
    subLevelSpeed = 1;
    slowdownCounter = 0;
    obstacles = [];
    greenCubes = [];
    car.x = ROAD_CENTER - car.width / 2;
    car.y = GAME_HEIGHT * 0.7;
    gameRunning = true;
    canvas.removeEventListener("click", resetGame);
    canvas.removeEventListener("touchend", resetGame);
}

// Bucle principal del juego
function gameLoop(timestamp) {
    let deltaTime = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (!gameRunning) {
        if (timestamp - collisionTime > 800) {
            resetGame();
            gameRunning = true;
        }
        return requestAnimationFrame(gameLoop);
    }

    timeElapsed += deltaTime;
    slowdownCounter += deltaTime;

    const currentLevelSettings = LEVEL_SETTINGS[Math.min(level-1, 3)];
    if (slowdownCounter > 15) {
        subLevelSpeed = Math.min(subLevelSpeed + currentLevelSettings.speedIncrement, currentLevelSettings.maxSpeed);
        slowdownCounter = 0;
    }

    if (timeElapsed > currentLevelSettings.duration) {
        if (level < 10) {
            level++;
            timeElapsed = 0;
            subLevelSpeed = 1 + (level * 0.15);
            obstacles = [];
            greenCubes = [];
        } else {
            ctx.fillStyle = "#fff";
            ctx.font = `${GAME_WIDTH * 0.06}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText("¡Felicidades! Has completado todos los niveles.", GAME_WIDTH / 2, GAME_HEIGHT / 2);
            ctx.font = `${GAME_WIDTH * 0.04}px Arial`;
            ctx.fillText("Toca para reiniciar.", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
            canvas.addEventListener("click", resetGame);
            canvas.addEventListener("touchend", resetGame);
            return;
        }
    }

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawWatermark();
    ctx.fillStyle = currentLevelSettings.roadColor;
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, GAME_HEIGHT);

    // Líneas de carretera
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    roadLines.forEach(line => {
        line.y += 2 * subLevelSpeed;
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x, line.y + line.height);
        ctx.stroke();
        if (line.y > GAME_HEIGHT) line.y = -line.height;
    });

    updateControls(deltaTime);

    // Dibujar elementos
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(carImg, car.x, car.y, car.width, car.height);
    ctx.restore();

    if (Math.random() < currentLevelSettings.obstacleRate * subLevelSpeed) generateObstacle();
    if (Math.random() < currentLevelSettings.cubeRate * subLevelSpeed) generateGreenCube();

    updateObstacles();

    for (let i = greenCubes.length - 1; i >= 0; i--) {
        let cube = greenCubes[i];
        cube.y += cube.speed * subLevelSpeed;
        drawGreenCube(cube.x, cube.y, cube.width);

        const cubeHitbox = {
            x: cube.x + HITBOX_SETTINGS.plant.offsetX * (cube.width/30),
            y: cube.y + HITBOX_SETTINGS.plant.offsetY * (cube.width/30),
            width: HITBOX_SETTINGS.plant.width * (cube.width/30),
            height: HITBOX_SETTINGS.plant.height * (cube.width/30)
        };

        if (checkCollision(car.hitbox, cubeHitbox)) {
            collisionTime = timestamp;
            gameRunning = false;
            break;
        }

        if (cube.y + cube.height < 0 || cube.y > GAME_HEIGHT) {
            greenCubes.splice(i, 1);
        }
    }

    drawLevelIndicator();
    requestAnimationFrame(gameLoop);
}

// Inicialización del juego
setupGameDimensions();
initRoadLines();
const updateControls = setupMobileControls();

window.addEventListener("resize", () => {
    setupGameDimensions();
    initRoadLines();
    resetGame();
});

// Carga de imágenes
let imagesLoaded = 0;
const totalImages = 1 + obstacleImgObjects.length;

function checkAllImagesLoaded() {
    if (++imagesLoaded === totalImages) requestAnimationFrame(gameLoop);
}

carImg.onload = checkAllImagesLoaded;
obstacleImgObjects.forEach(obj => {
    obj.img.onload = checkAllImagesLoaded;
});
