// Configuración inicial del canvas
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

// Configuración responsive
function setupGameDimensions() {
    // Ajuste preciso al viewport
    GAME_WIDTH = window.innerWidth;
    GAME_HEIGHT = window.innerHeight;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // Carretera con márgenes adecuados
    ROAD_WIDTH = Math.min(GAME_WIDTH * 0.85, 350);
    ROAD_LEFT = (GAME_WIDTH - ROAD_WIDTH) / 2;
    ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
    ROAD_CENTER = ROAD_LEFT + ROAD_WIDTH / 2;
    
    // Tamaño y posición del coche
    car.width = ROAD_WIDTH * 0.22;
    car.height = car.width * 1.4;
    car.x = ROAD_LEFT + (ROAD_WIDTH / 2) - (car.width / 2);
    car.y = GAME_HEIGHT - car.height - (GAME_HEIGHT * 0.05);
    
    // Límites de movimiento
    car.minX = ROAD_LEFT + (car.width * 0.1);
    car.maxX = ROAD_RIGHT - car.width - (car.width * 0.1);
}

// Hitboxes precisas
const HITBOX_SETTINGS = {
  player: { width: 29, height: 80, offsetX: 19, offsetY: 10 },
  truck: { width: 17, height: 100, offsetX: 30, offsetY: 15 },
  car: { width: 20, height: 60, offsetX: 23, offsetY: 16 },
  moto: { width: 10, height: 20, offsetX: 20, offsetY: 30 },
  plant: { width: 10, height: 10, offsetX: 10, offsetY: 10 }
};

// Jugador
let car = {
  x: 0, y: 0, width: 70, height: 100,
  get hitbox() {
    const s = HITBOX_SETTINGS.player;
    return {
      x: this.x + s.offsetX * (this.width/70),
      y: this.y + s.offsetY * (this.height/100),
      width: s.width * (this.width/70),
      height: s.height * (this.height/100)
    };
  }
};

// Carga de imágenes
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
  const lineSpacing = GAME_HEIGHT * 0.07;
  for (let y = -lineSpacing; y < GAME_HEIGHT + lineSpacing; y += lineSpacing) {
    roadLines.push({ 
      x: ROAD_CENTER, 
      y: y,
      width: ROAD_WIDTH * 0.02,
      height: lineSpacing * 0.6
    });
  }
}

// Obstáculos y elementos del juego
let obstacles = [];
let greenCubes = [];

const LEVEL_SETTINGS = [
  { duration: 75, speedIncrement: 0.2, maxSpeed: 2.5, obstacleRate: 0.012, cubeRate: 0.006, roadColor: "#333" },
  // ... (otros niveles)
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
  ctx.font = `${GAME_WIDTH * 0.04}px Arial`;
  ctx.textAlign = "left";
  ctx.fillText(`Nivel ${level}/10`, 20, 30);
  
  const progressWidth = GAME_WIDTH * 0.4;
  const progress = timeElapsed / LEVEL_SETTINGS[level-1].duration;
  ctx.fillStyle = "#444";
  ctx.fillRect(20, 40, progressWidth, 8);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(20, 40, progressWidth * progress, 8);
  ctx.fillText(`Velocidad: ${subLevelSpeed.toFixed(1)}x`, 20, 70);
}

// Controles móviles optimizados
function setupMobileControls() {
  let leftActive = false, rightActive = false;
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
  
  return function updateControls(deltaTime) {
    if (leftActive) car.x = Math.max(car.minX, car.x - moveSpeed);
    if (rightActive) car.x = Math.min(car.maxX, car.x + moveSpeed);
  };
}

// Generación de elementos
function generateObstacle() {
  const type = obstacleImgObjects[Math.floor(Math.random() * obstacleImgObjects.length)].type;
  let width = GAME_WIDTH * 0.15, height = width * 1.4;
  
  if (type === "truck") {
    width = GAME_WIDTH * 0.17;
    height = width * 1.6;
  } else if (type === "moto") {
    width = GAME_WIDTH * 0.11;
    height = width * 1.8;
  }

  const direction = Math.random() < 0.5 ? "down" : "up";
  const lane = direction === "down" ? 
    Math.random() * (ROAD_CENTER - ROAD_LEFT - width) + ROAD_LEFT :
    Math.random() * (ROAD_RIGHT - ROAD_CENTER - width) + ROAD_CENTER;

  obstacles.push({
    x: lane,
    y: direction === "up" ? GAME_HEIGHT : -height,
    width, height,
    img: obstacleImgObjects.find(o => o.type === type).img,
    speed: direction === "up" ? (1.8 + (level * 0.1)) * subLevelSpeed : (0.9 + (level * 0.1)) * subLevelSpeed,
    direction, type
  });
}

function generateGreenCube() {
  const cubeSize = GAME_WIDTH * 0.07;
  greenCubes.push({
    x: ROAD_CENTER - cubeSize/2,
    y: -cubeSize,
    width: cubeSize,
    height: cubeSize,
    speed: 1.5 * subLevelSpeed
  });
}

function updateObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
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

    if (obs.y + obs.height < 0 || obs.y > GAME_HEIGHT) {
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
  car.x = ROAD_LEFT + ROAD_WIDTH / 2 - car.width / 2;
  car.y = GAME_HEIGHT - car.height - (GAME_HEIGHT * 0.05);
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

  const currentLevelSettings = LEVEL_SETTINGS[level-1];
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
