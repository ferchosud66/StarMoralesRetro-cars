// Configuración inicial del canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Variables ajustables para móvil
let GAME_WIDTH, GAME_HEIGHT;
let ROAD_WIDTH, ROAD_LEFT, ROAD_RIGHT, ROAD_CENTER;

// Estado del juego
let level = 1;
let subLevelSpeed = 1;
let timeElapsed = 0;
let slowdownCounter = 0;
let lastFrameTime = performance.now();
let collisionTime = null;
let gameRunning = true;

// Elementos de control para móvil
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

// Configuración responsive
function setupGameDimensions() {
    // Ajustar tamaño del canvas al viewport móvil
    GAME_WIDTH = window.innerWidth;
    GAME_HEIGHT = window.innerHeight;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // Ajustar ancho de carretera según pantalla
    ROAD_WIDTH = Math.min(GAME_WIDTH * 0.8, 300);
    ROAD_LEFT = (GAME_WIDTH - ROAD_WIDTH) / 2;
    ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
    ROAD_CENTER = ROAD_LEFT + ROAD_WIDTH / 2;
    
    // Recalcular posición del auto
    car.width = GAME_WIDTH * 0.15;
    car.height = car.width * 1.4;
    car.x = ROAD_LEFT + ROAD_WIDTH / 2 - car.width / 2;
    car.y = GAME_HEIGHT - car.height - 20;
}

// Configuración de hitboxes (ajustadas para móvil)
const HITBOX_SETTINGS = {
  player: { 
    width: 29, 
    height: 80, 
    offsetX: 19, 
    offsetY: 10 
  },
  truck: { 
    width: 17, 
    height: 100, 
    offsetX: 30, 
    offsetY: 15 
  },
  car: { 
    width: 20, 
    height: 60, 
    offsetX: 23, 
    offsetY: 16 
  },
  moto: { 
    width: 10, 
    height: 20, 
    offsetX: 20, 
    offsetY: 30 
  },
  plant: { 
    width: 10, 
    height: 10, 
    offsetX: 10, 
    offsetY: 10 
  }
};

// Jugador
let car = {
  x: 0,
  y: 0,
  width: 70,
  height: 100,
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

// Cargar imágenes
let carImg = new Image();
carImg.src = "car.png";

const obstacleImagePaths = [
  { src: "camion.png", type: "truck" },
  { src: "carro.png", type: "car" },
  { src: "carro2.png", type: "car" },
  { src: "moto.png", type: "moto" },
  { src: "moto2.png", type: "moto" },
];

let obstacleImgObjects = obstacleImagePaths.map(({ src, type }) => {
  const img = new Image();
  img.src = src;
  return { img, type, src };
});

// Inicializar líneas de carretera
let roadLines = [];
function initRoadLines() {
  roadLines = [];
  for (let y = 0; y < GAME_HEIGHT; y += 40) {
    roadLines.push({ x: ROAD_CENTER, y });
  }
}

// Obstáculos y cubos
let obstacles = [];
let greenCubes = [];

// Configuración de niveles
const LEVEL_SETTINGS = [
  { duration: 75, speedIncrement: 0.2, maxSpeed: 2.5, obstacleRate: 0.012, cubeRate: 0.006, roadColor: "#333" },
  { duration: 70, speedIncrement: 0.25, maxSpeed: 2.8, obstacleRate: 0.015, cubeRate: 0.008, roadColor: "#2a2a2a" },
  { duration: 65, speedIncrement: 0.3, maxSpeed: 3.2, obstacleRate: 0.018, cubeRate: 0.01, roadColor: "#252525" },
  { duration: 60, speedIncrement: 0.35, maxSpeed: 3.6, obstacleRate: 0.022, cubeRate: 0.012, roadColor: "#202020" },
  { duration: 55, speedIncrement: 0.4, maxSpeed: 4.0, obstacleRate: 0.026, cubeRate: 0.014, roadColor: "#1a1a1a" },
  { duration: 50, speedIncrement: 0.45, maxSpeed: 4.5, obstacleRate: 0.03, cubeRate: 0.016, roadColor: "#151515" },
  { duration: 45, speedIncrement: 0.5, maxSpeed: 5.0, obstacleRate: 0.035, cubeRate: 0.018, roadColor: "#101010" },
  { duration: 40, speedIncrement: 0.55, maxSpeed: 5.5, obstacleRate: 0.04, cubeRate: 0.02, roadColor: "#0a0a0a" },
  { duration: 35, speedIncrement: 0.6, maxSpeed: 6.0, obstacleRate: 0.045, cubeRate: 0.022, roadColor: "#050505" },
  { duration: 30, speedIncrement: 0.65, maxSpeed: 6.5, obstacleRate: 0.05, cubeRate: 0.025, roadColor: "#000000" }
];

// Detección de colisiones
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

// Dibujar elementos
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
  
  // Barra de progreso del nivel
  const progressWidth = GAME_WIDTH * 0.4;
  const progress = timeElapsed / LEVEL_SETTINGS[level-1].duration;
  ctx.fillStyle = "#444";
  ctx.fillRect(20, 40, progressWidth, 8);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(20, 40, progressWidth * progress, 8);
  
  // Velocidad
  ctx.fillText(`Velocidad: ${subLevelSpeed.toFixed(1)}x`, 20, 70);
}

// Controles para móvil
function setupMobileControls() {
  // Botones táctiles
  let leftActive = false;
  let rightActive = false;
  
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
  
  // Controles por inclinación (opcional)
  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", handleOrientation, true);
  }
  
  // Controles táctiles directos en pantalla
  let touchStartX = 0;
  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    e.preventDefault();
  }, { passive: false });
  
  canvas.addEventListener("touchmove", (e) => {
    const touchX = e.touches[0].clientX;
    const moveX = touchX - touchStartX;
    
    if (Math.abs(moveX) > 10) {
      car.x += moveX * 0.5;
      car.x = Math.max(ROAD_LEFT, Math.min(car.x, ROAD_RIGHT - car.width));
      touchStartX = touchX;
    }
    e.preventDefault();
  }, { passive: false });
  
  // Actualizar controles en el game loop
  return function updateControls(deltaTime) {
    const moveSpeed = 6 + (level * 0.2);
    
    if (leftActive) {
      car.x = Math.max(car.x - moveSpeed, ROAD_LEFT);
    }
    if (rightActive) {
      car.x = Math.min(car.x + moveSpeed, ROAD_RIGHT - car.width);
    }
  };
}

function handleOrientation(e) {
  if (e.gamma) { // gamma = inclinación izquierda/derecha
    const sensitivity = 1.5;
    const newX = car.x + (e.gamma * sensitivity);
    car.x = Math.max(ROAD_LEFT, Math.min(newX, ROAD_RIGHT - car.width));
  }
}

// Generar obstáculos
function generateObstacle() {
  const type = obstacleImgObjects[Math.floor(Math.random() * obstacleImgObjects.length)].type;
  
  let width, height;
  if (type === "truck") {
    width = GAME_WIDTH * 0.17;
    height = width * 1.6;
  } else if (type === "moto") {
    width = GAME_WIDTH * 0.11;
    height = width * 1.8;
  } else {
    width = GAME_WIDTH * 0.15;
    height = width * 1.4;
  }

  const direction = Math.random() < 0.5 ? "down" : "up";
  const lane = direction === "down" ? 
    Math.random() * (ROAD_CENTER - ROAD_LEFT - width) + ROAD_LEFT :
    Math.random() * (ROAD_RIGHT - ROAD_CENTER - width) + ROAD_CENTER;

  obstacles.push({
    x: lane,
    y: direction === "up" ? GAME_HEIGHT : -height,
    width,
    height,
    img: obstacleImgObjects.find(o => o.type === type).img,
    speed: direction === "up" ? (1.8 + (level * 0.1)) * subLevelSpeed : (0.9 + (level * 0.1)) * subLevelSpeed,
    direction,
    type
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
    
    // Dibujar con suavizado para móviles
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

// Bucle principal del juego
function gameLoop(timestamp) {
  let deltaTime = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  if (!gameRunning) {
    if (timestamp - collisionTime > 800) {
      resetGame();
      gameRunning = true;
    } else {
      return requestAnimationFrame(gameLoop);
    }
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
      // Juego completado
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

  // Fondo y carretera
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  
  drawWatermark();
  
  ctx.fillStyle = currentLevelSettings.roadColor;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, GAME_HEIGHT);

  // Líneas de carretera
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  roadLines.forEach(line => {
    line.y -= 2 * subLevelSpeed;
    if (line.y < -20) line.y = GAME_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(ROAD_CENTER, line.y);
    ctx.lineTo(ROAD_CENTER, line.y + 20);
    ctx.stroke();
  });

  // Actualizar controles
  updateControls(deltaTime);

  // Dibujar auto con suavizado
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(carImg, car.x, car.y, car.width, car.height);
  ctx.restore();

  // Generar obstáculos
  if (Math.random() < currentLevelSettings.obstacleRate * subLevelSpeed) {
    generateObstacle();
  }

  // Generar cubos verdes
  if (Math.random() < currentLevelSettings.cubeRate * subLevelSpeed) {
    generateGreenCube();
  }

  // Actualizar obstáculos
  updateObstacles();

  // Actualizar cubos verdes
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

  // Mostrar información
  drawLevelIndicator();

  requestAnimationFrame(gameLoop);
}

function resetGame() {
  level = 1;
  timeElapsed = 0;
  subLevelSpeed = 1;
  slowdownCounter = 0;
  obstacles = [];
  greenCubes = [];
  car.x = ROAD_LEFT + ROAD_WIDTH / 2 - car.width / 2;
  car.y = GAME_HEIGHT - car.height - 20;
  gameRunning = true;
  
  // Remover event listeners de reinicio
  canvas.removeEventListener("click", resetGame);
  canvas.removeEventListener("touchend", resetGame);
}

// Inicialización del juego
setupGameDimensions();
initRoadLines();
const updateControls = setupMobileControls();

// Configuración inicial del canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Variables ajustables para móvil
let GAME_WIDTH, GAME_HEIGHT;
let ROAD_WIDTH, ROAD_LEFT, ROAD_RIGHT, ROAD_CENTER;

// Estado del juego
let level = 1;
let subLevelSpeed = 1;
let timeElapsed = 0;
let slowdownCounter = 0;
let lastFrameTime = performance.now();
let collisionTime = null;
let gameRunning = true;

// Elementos de control para móvil
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

// Configuración responsive
function setupGameDimensions() {
    // Ajustar tamaño del canvas al viewport móvil
    GAME_WIDTH = window.innerWidth;
    GAME_HEIGHT = window.innerHeight;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    // Ajustar ancho de carretera según pantalla
    ROAD_WIDTH = Math.min(GAME_WIDTH * 0.8, 300);
    ROAD_LEFT = (GAME_WIDTH - ROAD_WIDTH) / 2;
    ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
    ROAD_CENTER = ROAD_LEFT + ROAD_WIDTH / 2;
    
    // Recalcular posición del auto
    car.width = GAME_WIDTH * 0.15;
    car.height = car.width * 1.4;
    car.x = ROAD_LEFT + ROAD_WIDTH / 2 - car.width / 2;
    car.y = GAME_HEIGHT - car.height - 20;
}

// Configuración de hitboxes (ajustadas para móvil)
const HITBOX_SETTINGS = {
  player: { 
    width: 29, 
    height: 80, 
    offsetX: 19, 
    offsetY: 10 
  },
  truck: { 
    width: 17, 
    height: 100, 
    offsetX: 30, 
    offsetY: 15 
  },
  car: { 
    width: 20, 
    height: 60, 
    offsetX: 23, 
    offsetY: 16 
  },
  moto: { 
    width: 10, 
    height: 20, 
    offsetX: 20, 
    offsetY: 30 
  },
  plant: { 
    width: 10, 
    height: 10, 
    offsetX: 10, 
    offsetY: 10 
  }
};

// Jugador
let car = {
  x: 0,
  y: 0,
  width: 70,
  height: 100,
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

// Cargar imágenes
let carImg = new Image();
carImg.src = "car.png";

const obstacleImagePaths = [
  { src: "camion.png", type: "truck" },
  { src: "carro.png", type: "car" },
  { src: "carro2.png", type: "car" },
  { src: "moto.png", type: "moto" },
  { src: "moto2.png", type: "moto" },
];

let obstacleImgObjects = obstacleImagePaths.map(({ src, type }) => {
  const img = new Image();
  img.src = src;
  return { img, type, src };
});

// Inicializar líneas de carretera
let roadLines = [];
function initRoadLines() {
  roadLines = [];
  for (let y = 0; y < GAME_HEIGHT; y += 40) {
    roadLines.push({ x: ROAD_CENTER, y });
  }
}

// Obstáculos y cubos
let obstacles = [];
let greenCubes = [];

// Configuración de niveles
const LEVEL_SETTINGS = [
  { duration: 75, speedIncrement: 0.2, maxSpeed: 2.5, obstacleRate: 0.012, cubeRate: 0.006, roadColor: "#333" },
  { duration: 70, speedIncrement: 0.25, maxSpeed: 2.8, obstacleRate: 0.015, cubeRate: 0.008, roadColor: "#2a2a2a" },
  { duration: 65, speedIncrement: 0.3, maxSpeed: 3.2, obstacleRate: 0.018, cubeRate: 0.01, roadColor: "#252525" },
  { duration: 60, speedIncrement: 0.35, maxSpeed: 3.6, obstacleRate: 0.022, cubeRate: 0.012, roadColor: "#202020" },
  { duration: 55, speedIncrement: 0.4, maxSpeed: 4.0, obstacleRate: 0.026, cubeRate: 0.014, roadColor: "#1a1a1a" },
  { duration: 50, speedIncrement: 0.45, maxSpeed: 4.5, obstacleRate: 0.03, cubeRate: 0.016, roadColor: "#151515" },
  { duration: 45, speedIncrement: 0.5, maxSpeed: 5.0, obstacleRate: 0.035, cubeRate: 0.018, roadColor: "#101010" },
  { duration: 40, speedIncrement: 0.55, maxSpeed: 5.5, obstacleRate: 0.04, cubeRate: 0.02, roadColor: "#0a0a0a" },
  { duration: 35, speedIncrement: 0.6, maxSpeed: 6.0, obstacleRate: 0.045, cubeRate: 0.022, roadColor: "#050505" },
  { duration: 30, speedIncrement: 0.65, maxSpeed: 6.5, obstacleRate: 0.05, cubeRate: 0.025, roadColor: "#000000" }
];

// Detección de colisiones
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

// Dibujar elementos
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
  
  // Barra de progreso del nivel
  const progressWidth = GAME_WIDTH * 0.4;
  const progress = timeElapsed / LEVEL_SETTINGS[level-1].duration;
  ctx.fillStyle = "#444";
  ctx.fillRect(20, 40, progressWidth, 8);
  ctx.fillStyle = "#0f0";
  ctx.fillRect(20, 40, progressWidth * progress, 8);
  
  // Velocidad
  ctx.fillText(`Velocidad: ${subLevelSpeed.toFixed(1)}x`, 20, 70);
}

// Controles para móvil
function setupMobileControls() {
  // Botones táctiles
  let leftActive = false;
  let rightActive = false;
  
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
  
  // Controles por inclinación (opcional)
  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", handleOrientation, true);
  }
  
  // Controles táctiles directos en pantalla
  let touchStartX = 0;
  canvas.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    e.preventDefault();
  }, { passive: false });
  
  canvas.addEventListener("touchmove", (e) => {
    const touchX = e.touches[0].clientX;
    const moveX = touchX - touchStartX;
    
    if (Math.abs(moveX) > 10) {
      car.x += moveX * 0.5;
      car.x = Math.max(ROAD_LEFT, Math.min(car.x, ROAD_RIGHT - car.width));
      touchStartX = touchX;
    }
    e.preventDefault();
  }, { passive: false });
  
  // Actualizar controles en el game loop
  return function updateControls(deltaTime) {
    const moveSpeed = 6 + (level * 0.2);
    
    if (leftActive) {
      car.x = Math.max(car.x - moveSpeed, ROAD_LEFT);
    }
    if (rightActive) {
      car.x = Math.min(car.x + moveSpeed, ROAD_RIGHT - car.width);
    }
  };
}

function handleOrientation(e) {
  if (e.gamma) { // gamma = inclinación izquierda/derecha
    const sensitivity = 1.5;
    const newX = car.x + (e.gamma * sensitivity);
    car.x = Math.max(ROAD_LEFT, Math.min(newX, ROAD_RIGHT - car.width));
  }
}

// Generar obstáculos
function generateObstacle() {
  const type = obstacleImgObjects[Math.floor(Math.random() * obstacleImgObjects.length)].type;
  
  let width, height;
  if (type === "truck") {
    width = GAME_WIDTH * 0.17;
    height = width * 1.6;
  } else if (type === "moto") {
    width = GAME_WIDTH * 0.11;
    height = width * 1.8;
  } else {
    width = GAME_WIDTH * 0.15;
    height = width * 1.4;
  }

  const direction = Math.random() < 0.5 ? "down" : "up";
  const lane = direction === "down" ? 
    Math.random() * (ROAD_CENTER - ROAD_LEFT - width) + ROAD_LEFT :
    Math.random() * (ROAD_RIGHT - ROAD_CENTER - width) + ROAD_CENTER;

  obstacles.push({
    x: lane,
    y: direction === "up" ? GAME_HEIGHT : -height,
    width,
    height,
    img: obstacleImgObjects.find(o => o.type === type).img,
    speed: direction === "up" ? (1.8 + (level * 0.1)) * subLevelSpeed : (0.9 + (level * 0.1)) * subLevelSpeed,
    direction,
    type
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
    
    // Dibujar con suavizado para móviles
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

// Bucle principal del juego
function gameLoop(timestamp) {
  let deltaTime = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  if (!gameRunning) {
    if (timestamp - collisionTime > 800) {
      resetGame();
      gameRunning = true;
    } else {
      return requestAnimationFrame(gameLoop);
    }
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
      // Juego completado
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

  // Fondo y carretera
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  
  drawWatermark();
  
  ctx.fillStyle = currentLevelSettings.roadColor;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, GAME_HEIGHT);

  // Líneas de carretera
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  roadLines.forEach(line => {
    line.y -= 2 * subLevelSpeed;
    if (line.y < -20) line.y = GAME_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(ROAD_CENTER, line.y);
    ctx.lineTo(ROAD_CENTER, line.y + 20);
    ctx.stroke();
  });

  // Actualizar controles
  updateControls(deltaTime);

  // Dibujar auto con suavizado
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(carImg, car.x, car.y, car.width, car.height);
  ctx.restore();

  // Generar obstáculos
  if (Math.random() < currentLevelSettings.obstacleRate * subLevelSpeed) {
    generateObstacle();
  }

  // Generar cubos verdes
  if (Math.random() < currentLevelSettings.cubeRate * subLevelSpeed) {
    generateGreenCube();
  }

  // Actualizar obstáculos
  updateObstacles();

  // Actualizar cubos verdes
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

  // Mostrar información
  drawLevelIndicator();

  requestAnimationFrame(gameLoop);
}

function resetGame() {
  level = 1;
  timeElapsed = 0;
  subLevelSpeed = 1;
  slowdownCounter = 0;
  obstacles = [];
  greenCubes = [];
  car.x = ROAD_LEFT + ROAD_WIDTH / 2 - car.width / 2;
  car.y = GAME_HEIGHT - car.height - 20;
  gameRunning = true;
  
  // Remover event listeners de reinicio
  canvas.removeEventListener("click", resetGame);
  canvas.removeEventListener("touchend", resetGame);
}

// Inicialización del juego
setupGameDimensions();
initRoadLines();
const updateControls = setupMobileControls();

// Manejar redimensionamiento
window.addEventListener("resize", () => {
  setupGameDimensions();
  initRoadLines();
  resetGame();
});

// Iniciar el juego cuando todas las imágenes estén cargadas
let imagesLoaded = 0;
const totalImages = 1 + obstacleImgObjects.length; // auto + obstáculos

function checkAllImagesLoaded() {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    requestAnimationFrame(gameLoop);
  }
}

carImg.onload = checkAllImagesLoaded;
obstacleImgObjects.forEach(obj => {
  obj.img.onload = checkAllImagesLoaded;
});