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
    worldSize: 1000,
    enemyCount: 100,
    obstacleCount: 200,
    minObstacleDistance: 20,
    minEnemyDistance: 100,
    wallHeight: 8,
    wallThickness: 2
};