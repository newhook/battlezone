import * as THREE from 'three';
import { GameState, GameObject, Vehicle, InputState } from './types';
import { createTerrain, createBoundaryWalls, createGround } from './gameObjects';
import { PlayerTank } from './playerTank';
import { EnemyTank } from './enemyTank';
import { createPhysicsWorld, createObstacleBody } from './physics';

// Set up the game state
export function setupGame(scene: THREE.Scene): { gameState: GameState, physicsWorld: any } {
  // Create physics world
  const physicsWorld = createPhysicsWorld();
  
  // Create player tank
  const player = new PlayerTank();
  scene.add(player.mesh);
  
  // Initialize player physics
  player.initPhysics(physicsWorld.world);
  physicsWorld.addBody(player.body);
  
  // Create more enemy tanks spread across the large terrain
  const enemies: Vehicle[] = [];
  
  // Add 10 enemy tanks at random positions
  for (let i = 0; i < 10; i++) {
    // Random position far from player start
    let x = 0, z = 0;
    do {
      x = (Math.random() * 960) - 480; // Keep tanks within the boundary
      z = (Math.random() * 960) - 480;
    } while (Math.sqrt(x*x + z*z) < 100); // Keep at least 100 units away from origin
    
    const enemy = new EnemyTank(new THREE.Vector3(x, 0, z));
    enemies.push(enemy);
    scene.add(enemy.mesh);
    
    // Initialize enemy physics
    enemy.initPhysics(physicsWorld.world);
    physicsWorld.addBody(enemy.body);
  }
  
  // Create random terrain objects (obstacles) across the 1000x1000 terrain
  const terrainPositions: THREE.Vector3[] = [];
  
  // Generate 200 random obstacle positions
  for (let i = 0; i < 200; i++) {
    // Calculate random position but avoid area around player (0,0)
    let x = 0, z = 0;
    
    // Make sure obstacles aren't too close to the starting position (0,0)
    do {
      x = (Math.random() * 980) - 490; // Range from -490 to 490
      z = (Math.random() * 980) - 490; // Range from -490 to 490
    } while (Math.sqrt(x*x + z*z) < 20); // Keep at least 20 units away from origin
    
    // Random height between 2 and 6
    const y = 2 + Math.random() * 4; 
    
    terrainPositions.push(new THREE.Vector3(x, y, z));
  }
  
  const terrain = createTerrain(terrainPositions,physicsWorld.world);
  terrain.forEach(obj => {
    scene.add(obj.mesh);
    
    // Create obstacle physics body and link to mesh
    const size = {
      width: obj.mesh.scale.x,
      height: obj.mesh.scale.y,
      depth: obj.mesh.scale.z
    };
    
    const position = {
      x: obj.mesh.position.x,
      y: obj.mesh.position.y,
      z: obj.mesh.position.z
    };
    
    // Create physics body for obstacle
    obj.body = createObstacleBody(size, position, physicsWorld.world, 0);
    obj.body.userData = { mesh: obj.mesh };
    physicsWorld.addBody(obj.body);
  });
  
  // Create boundary walls (expanded to 1000 x 1000)
  const walls: GameObject[] = [];
  // const walls = createBoundaryWalls(500, physicsWorld.world);
  // walls.forEach(wall => {
  //   scene.add(wall.mesh);
    
  //   // Create wall physics bodies
  //   const size = {
  //     width: wall.mesh.scale.x,
  //     height: wall.mesh.scale.y,
  //     depth: wall.mesh.scale.z
  //   };
    
  //   const position = {
  //     x: wall.mesh.position.x,
  //     y: wall.mesh.position.y,
  //     z: wall.mesh.position.z
  //   };
    
  //   // Create physics body for wall
  //   wall.body = createObstacleBody(size, position, physicsWorld.world, 0);
  //   wall.body.userData = { mesh: wall.mesh };
  //   physicsWorld.addBody(wall.body);
  // });
  
  // Create ground (expanded to 1000 x 1000)
  const ground = createGround(1000);
  scene.add(ground.mesh);
  
  // All objects in one array
  const allTerrain: GameObject[] = [...terrain, ...walls, ground];
  
  // Initialize game state
  const gameState: GameState = {
    player,
    enemies,
    terrain: allTerrain,
    projectiles: [],
    score: 0,
    gameOver: false
  };
  
  // Store references in window for cross-module access
  window.gameState = gameState;
  window.physicsWorld = physicsWorld;
  
  return { gameState, physicsWorld };
}

// Update game logic
export function updateGame(gameState: GameState, input: InputState, physicsWorld: any, deltaTime: number) {
  if (gameState.gameOver) return;
  
  // Update physics world
  physicsWorld.update(deltaTime);
  
  // Handle player input
  if (input.forward) {
    gameState.player.move(1);
  }
  if (input.backward) {
    gameState.player.move(-1);
  }
  if (input.left) {
    gameState.player.turn(1);
  }
  if (input.right) {
    gameState.player.turn(-1);
  }
  if (input.fire) {
    gameState.player.fire();
  }
  
  // Update player
  if (gameState.player.update) {
    gameState.player.update();
  }
  
  // Update enemies with AI
  gameState.enemies.forEach(enemy => {
    // Update enemy position and AI
    if (enemy.update) {
      enemy.update();
    }
  });
  
  // Update projectiles and check for collisions
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const projectile = gameState.projectiles[i];
    
    // Check for collisions with enemies
    if (projectile.body) {
      // Get projectile position
      const projectilePos = projectile.body.translation();
      
      // Check collision with each enemy
      for (let j = gameState.enemies.length - 1; j >= 0; j--) {
        const enemy = gameState.enemies[j];
        
        if (enemy.body) {
          const enemyPos = enemy.body.translation();
          
          // Calculate distance for collision detection
          const distance = Math.sqrt(
            Math.pow(projectilePos.x - enemyPos.x, 2) +
            Math.pow(projectilePos.y - enemyPos.y, 2) +
            Math.pow(projectilePos.z - enemyPos.z, 2)
          );
          
          // Check if collision occurred
          if (distance < 2) { // Collision threshold
            // Remove enemy from scene
            if (enemy.mesh.parent) {
              enemy.mesh.parent.remove(enemy.mesh);
            }
            
            // Remove enemy from physics world
            if (enemy.body) {
              physicsWorld.removeBody(enemy.body);
              
              // Stop AI behavior
              if (enemy instanceof EnemyTank) {
                enemy.stopAI();
              }
            }
            
            // Remove projectile from scene
            if (projectile.mesh.parent) {
              projectile.mesh.parent.remove(projectile.mesh);
            }
            
            // Remove projectile from physics world
            if (projectile.body) {
              physicsWorld.removeBody(projectile.body);
            }
            
            // Remove from arrays
            gameState.enemies.splice(j, 1);
            gameState.projectiles.splice(i, 1);
            
            // Increase score
            gameState.score += 100;
            updateScoreDisplay(gameState.score);
            
            // Break inner loop since projectile is now removed
            break;
          }
        }
      }
    }
  }
}

// Update score display
function updateScoreDisplay(score: number) {
  const scoreElement = document.getElementById('score');
  if (scoreElement) {
    scoreElement.textContent = `SCORE: ${score}`;
  }
}
