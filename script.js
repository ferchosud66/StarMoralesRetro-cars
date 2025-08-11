
// Script de juego corregido - Solo dirección de obstáculos ajustada según posición
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const ROAD_LEFT = 100;
const ROAD_WIDTH = 200;
const ROAD_CENTER = ROAD_LEFT + ROAD_WIDTH / 2;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 50;

const obstacleImagePaths = [
    { src: "camion.png", type: "truck" },
    { src: "carro.png", type: "car" },
    { src: "carro2.png", type: "car" },
    { src: "moto.png", type: "moto" },
    { src: "moto2.png", type: "moto" }
];

let obstacleImgObjects = obstacleImagePaths.map(entry => {
    const img = new Image();
    img.src = entry.src;
    return { img, type: entry.type };
});

let roadLines = [];
for (let y = 0; y < GAME_HEIGHT; y += 40) {
    roadLines.push({ x: GAME_WIDTH / 2 - 1, y });
}

let obstacles = [];

function generateObstacle() {
    const entry = obstacleImgObjects[Math.floor(Math.random() * obstacleImgObjects.length)];
    const type = entry.type;
    let width = ROAD_WIDTH * 0.2, height = width * 1.5;

    if (type === "truck") {
        width = ROAD_WIDTH * 0.25;
        height = width * 1.8;
    } else if (type === "moto") {
        width = ROAD_WIDTH * 0.15;
        height = width * 2.0;
    }

    const lane = ROAD_LEFT + Math.random() * (ROAD_WIDTH - width);
    const direction = lane < ROAD_CENTER ? "down" : "up";
    const y = direction === "down" ? -height : GAME_HEIGHT;

    obstacles.push({
        x: lane,
        y,
        width,
        height,
        img: entry.img,
        speed: 2,
        direction: direction,
        type
    });
}
