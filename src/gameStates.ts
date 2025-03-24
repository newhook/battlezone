import * as THREE from 'three';
import { Vehicle, GameObject, InputState } from './types';
import { PhysicsWorld } from './physics';
import { PlayerTank } from './playerTank';
import { EnemyTank } from './enemyTank';
import { createTerrain, createGround, createBoundaryWalls } from './gameObjects';
import { GameConfig } from './config';
import { FlyCamera } from './flyCamera';

export interface IGameState {
    update(deltaTime: number): void;
    onEnter(): void;
    onExit(): void;
    getCamera(): THREE.PerspectiveCamera;
    handleInput(input: InputState, flyCamera: FlyCamera): void;
}

interface MarqueeCamera {
    position: THREE.Vector3;
    lookAt: THREE.Vector3;
    duration: number;
}

export class MarqueeState implements IGameState {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private marqueeCameras: MarqueeCamera[];
    private currentMarqueeIndex: number = 0;
    private marqueeStartTime: number = 0;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.scene = scene;
        this.camera = camera;
        this.marqueeCameras = [
            {
                position: new THREE.Vector3(0, 30, 0),
                lookAt: new THREE.Vector3(0, 0, 0),
                duration: 5000
            },
            {
                position: new THREE.Vector3(50, 5, 50),
                lookAt: new THREE.Vector3(0, 2, 0),
                duration: 4000
            },
            {
                position: new THREE.Vector3(-30, 3, 20),
                lookAt: new THREE.Vector3(0, 1, 0),
                duration: 4000
            },
            {
                position: new THREE.Vector3(0, 1.5, -40),
                lookAt: new THREE.Vector3(0, 1.5, 0),
                duration: 4000
            }
        ];
        
        // Optional: Add some visual effects to the scene during marquee mode
        const ambientLight = new THREE.AmbientLight(0x404040, 3.0); // Brighter lighting for showcase
        this.scene.add(ambientLight);
    }

    update(deltaTime: number): void {
        // Scale camera movements based on deltaTime for consistent speed
        const movementScale = deltaTime * 1000;
        const currentTime = performance.now() * (movementScale / 1000);

        if (this.marqueeStartTime === 0) {
            this.marqueeStartTime = currentTime;
        }

        const current = this.marqueeCameras[this.currentMarqueeIndex];
        const next = this.marqueeCameras[(this.currentMarqueeIndex + 1) % this.marqueeCameras.length];
        const elapsedTime = currentTime - this.marqueeStartTime;

        if (elapsedTime >= current.duration) {
            this.currentMarqueeIndex = (this.currentMarqueeIndex + 1) % this.marqueeCameras.length;
            this.marqueeStartTime = currentTime;
            return;
        }

        const progress = elapsedTime / current.duration;
        const position = new THREE.Vector3().lerpVectors(
            current.position,
            next.position,
            progress
        );
        const lookAt = new THREE.Vector3().lerpVectors(
            current.lookAt,
            next.lookAt,
            progress
        );

        this.camera.position.copy(position);
        this.camera.lookAt(lookAt);
    }

    onEnter(): void {
        this.currentMarqueeIndex = 0;
        this.marqueeStartTime = 0;
        
        // Hide gameplay UI elements
        const scoreElement = document.getElementById('score');
        const fpsElement = document.getElementById('fps');
        const instructionsElement = document.getElementById('instructions');
        
        if (scoreElement) scoreElement.style.opacity = '0';
        if (fpsElement) fpsElement.style.opacity = '0';
        if (instructionsElement) {
            instructionsElement.style.display = 'none';
            instructionsElement.style.opacity = '0';
        }
    }

    onExit(): void {
        // No specific cleanup needed
    }

    getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    handleInput(_input: InputState, _flyCamera: FlyCamera): void {
        // In marquee mode, we only care about the space key to start the game
        // This is handled in main.ts, so we don't need any input handling here
    }
}

export class PlayState implements IGameState {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private physicsWorld: PhysicsWorld;
    player!: PlayerTank; // Using definite assignment assertion
    enemies: Vehicle[] = [];
    terrain: GameObject[] = [];
    projectiles: GameObject[] = [];
    score: number = 0;
    gameOver: boolean = false;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, config: GameConfig) {
        this.scene = scene;
        this.camera = camera;
        this.physicsWorld = new PhysicsWorld(config);
        this.initializeGameObjects(config);
    }

    private initializeGameObjects(config: GameConfig): void {
        // Create player tank
        this.player = new PlayerTank(this.physicsWorld);
        this.scene.add(this.player.mesh);
        this.physicsWorld.addBody(this.player);

        // Create enemy tanks
        const halfWorldSize = config.worldSize / 2 - 20;
        for (let i = 0; i < config.enemyCount; i++) {
            let x = 0, z = 0;
            do {
                x = (Math.random() * (halfWorldSize * 2)) - halfWorldSize;
                z = (Math.random() * (halfWorldSize * 2)) - halfWorldSize;
            } while (Math.sqrt(x*x + z*z) < config.minEnemyDistance);

            const enemy = new EnemyTank(this.physicsWorld, new THREE.Vector3(x, 0.4, z));
            this.enemies.push(enemy);
            this.scene.add(enemy.mesh);
            this.physicsWorld.addBody(enemy);
        }

        // Create terrain
        const terrainPositions: THREE.Vector3[] = [];
        for (let i = 0; i < config.obstacleCount; i++) {
            let x = 0, z = 0;
            do {
                x = (Math.random() * (halfWorldSize * 2)) - halfWorldSize;
                z = (Math.random() * (halfWorldSize * 2)) - halfWorldSize;
            } while (Math.sqrt(x*x + z*z) < config.minObstacleDistance);
            terrainPositions.push(new THREE.Vector3(x, 0, z));
        }

        const terrain = createTerrain(terrainPositions, this.physicsWorld.world);
        terrain.forEach(obj => {
            this.scene.add(obj.mesh);
            if (obj.body) {
                this.physicsWorld.addBody(obj);
            }
        });

        // Create boundary walls
        const walls = createBoundaryWalls(halfWorldSize, config.wallHeight, config.wallThickness, this.physicsWorld.world);
        walls.forEach(wall => {
            this.scene.add(wall.mesh);
            this.physicsWorld.addBody(wall);
        });

        // Create ground
        const ground = createGround(config.worldSize);
        this.scene.add(ground.mesh);

        this.terrain = [...terrain, ...walls, ground];
    }

    handleInput(input: InputState, flyCamera: FlyCamera): void {
        // Only process tank movement controls if not in fly mode
        if (!input.toggleFlyCamera) {
            if (input.forward) {
                this.player.move(1);
            }
            if (input.backward) {
                this.player.move(-1);
            }
            if (input.left) {
                this.player.turn(1);
            }
            if (input.right) {
                this.player.turn(-1);
            }
            if (input.turretLeft) {
                this.player.rotateTurret(1);
            }
            if (input.turretRight) {
                this.player.rotateTurret(-1);
            }
            if (input.fire) {
                this.player.fire();
            }
        }
    }

    update(deltaTime: number): void {
        if (this.gameOver) return;

        this.physicsWorld.update(deltaTime);

        // Update player and enemies
        if (this.player.update) {
            this.player.update();
        }

        this.enemies.forEach(enemy => {
            if (enemy.update) {
                enemy.update();
            }
        });

        // Update projectiles
        this.updateProjectiles();
    }

    private updateProjectiles(): void {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            if (!projectile.body || !projectile.mesh) continue;

            const projectilePos = projectile.body.translation();
            const distanceFromOrigin = Math.sqrt(
                projectilePos.x * projectilePos.x +
                projectilePos.y * projectilePos.y +
                projectilePos.z * projectilePos.z
            );

            if (distanceFromOrigin > 1000) {
                this.removeProjectile(i);
                continue;
            }

            this.checkProjectileCollisions(i, projectile);
        }
    }

    private checkProjectileCollisions(projectileIndex: number, projectile: GameObject): void {
        const projectilePos = projectile.body.translation();

        for (let j = this.enemies.length - 1; j >= 0; j--) {
            const enemy = this.enemies[j];
            if (!enemy.body || !enemy.mesh) continue;

            const enemyPos = enemy.body.translation();
            const distance = Math.sqrt(
                Math.pow(projectilePos.x - enemyPos.x, 2) +
                Math.pow(projectilePos.y - enemyPos.y, 2) +
                Math.pow(projectilePos.z - enemyPos.z, 2)
            );

            if (distance < 2) {
                this.handleEnemyHit(j, enemyPos);
                this.removeProjectile(projectileIndex);
                break;
            }
        }
    }

    private handleEnemyHit(enemyIndex: number, enemyPos: { x: number, y: number, z: number }): void {
        const enemy = this.enemies[enemyIndex];
        
        // Create explosion effect
        if (enemy.mesh.parent) {
            this.createExplosion(enemyPos);
        }

        // Remove enemy
        if (enemy.mesh.parent) {
            enemy.mesh.parent.remove(enemy.mesh);
        }
        if (enemy.body) {
            // Pass the entire enemy object as it implements GameObject
            this.physicsWorld.removeBody(enemy);
        }

        this.enemies.splice(enemyIndex, 1);
        this.score += 100;
        this.updateScoreDisplay();
    }

    private removeProjectile(index: number): void {
        const projectile = this.projectiles[index];
        if (projectile.mesh.parent) {
            projectile.mesh.parent.remove(projectile.mesh);
        }
        if (projectile.body) {
            // Pass the entire projectile object as it implements GameObject
            this.physicsWorld.removeBody(projectile);
        }
        this.projectiles.splice(index, 1);
    }

    private createExplosion(position: { x: number, y: number, z: number }): void {
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const size = 0.2 + Math.random() * 0.3;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xff5500 : 0xffaa00,
                transparent: true,
                opacity: 1.0
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.set(position.x, position.y, position.z);
            
            const velocity = new THREE.Vector3(
                Math.random() * 10 - 5,
                Math.random() * 10,
                Math.random() * 10 - 5
            );
            
            this.scene.add(particle);
            
            const startTime = Date.now();
            const duration = 500 + Math.random() * 500;
            
            const animateParticle = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress >= 1) {
                    this.scene.remove(particle);
                    return;
                }
                
                particle.position.x += velocity.x * 0.02;
                particle.position.y += velocity.y * 0.02 - 0.1 * progress;
                particle.position.z += velocity.z * 0.02;
                material.opacity = 1 - progress;
                
                requestAnimationFrame(animateParticle);
            };
            
            animateParticle();
        }
    }

    private updateScoreDisplay(): void {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = `SCORE: ${this.score}`;
        }
    }

    onEnter(): void {
        // Show gameplay UI elements
        const scoreElement = document.getElementById('score');
        const fpsElement = document.getElementById('fps');
        const instructionsElement = document.getElementById('instructions');
        
        if (scoreElement) scoreElement.style.opacity = '1';
        if (fpsElement) fpsElement.style.opacity = '1';
        if (instructionsElement) {
            instructionsElement.style.display = 'block';
            instructionsElement.style.opacity = '1';
        }
    }

    onExit(): void {
        // Cleanup if needed
    }

    getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }
}