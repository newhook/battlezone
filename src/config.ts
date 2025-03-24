export interface GameConfig {
    worldSize: number;
    enemyCount: number;
    obstacleCount: number;
    minObstacleDistance: number;
    minEnemyDistance: number;
    wallHeight: number;
    wallThickness: number;
}

export const defaultConfig: GameConfig = {
    worldSize: 500,
    enemyCount: 20,
    obstacleCount: 100,
    minObstacleDistance: 10,
    minEnemyDistance: 100,
    wallHeight: 8,
    wallThickness: 2
};