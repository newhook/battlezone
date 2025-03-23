import * as THREE from 'three';
import { GameState, GameObject, Vehicle, InputState } from './types';
import { createTerrain, createGround } from './gameObjects';
import { PlayerTank } from './playerTank';
import { EnemyTank } from './enemyTank';
import { createPhysicsWorld } from './physics';

// Set up the game state
export function setupGame(scene: THREE.Scene): { gameState: GameState, physicsWorld: any } {
  // Create physics world
  const physicsWorld = createPhysicsWorld();
  
  // Create player tank
  const player = new PlayerTank();
  scene.add(player.mesh);
  
  // Initialize player physics
  player.initPhysics(physicsWorld.world);
  if (player.body) {
    physicsWorld.addBody(player.body);
  }
  
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
    if (enemy.body) {
      physicsWorld.addBody(enemy.body);
    }
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
    
    // Set Y position to half the obstacle height to place it on the ground
    // We'll adjust this in createTerrain to ensure the bottom of the object is at ground level
    const y = 0; 
    
    terrainPositions.push(new THREE.Vector3(x, y, z));
  }
  
  const terrain = createTerrain(terrainPositions,physicsWorld.world);
  terrain.forEach(obj => {
    scene.add(obj.mesh);
    
    // We don't need to create physics bodies here since they're already created in createTerrain
    // Just add the existing body to the physics world
    if (obj.body) {
      physicsWorld.addBody(obj.body);
    }
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
  
  // Only process tank movement controls if not in fly mode
  if (!input.toggleFlyCamera) {
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
    
    // Handle turret rotation
    if (input.turretLeft) {
      gameState.player.rotateTurret(1);
    }
    if (input.turretRight) {
      gameState.player.rotateTurret(-1);
    }
  }
  
  // Handle firing - this remains active in both modes
  if (input.fire) {
    console.log("Fire button pressed, canFire =", gameState.player.canFire);
    
    // Visual feedback when trying to fire
    const feedbackDiv = document.createElement('div');
    feedbackDiv.textContent = gameState.player.canFire ? "FIRING!" : "COOLING DOWN...";
    feedbackDiv.style.position = 'absolute';
    feedbackDiv.style.top = '180px';
    feedbackDiv.style.left = '10px';
    feedbackDiv.style.color = gameState.player.canFire ? '#ffff00' : '#ff6600';
    feedbackDiv.style.fontFamily = 'monospace';
    feedbackDiv.style.fontSize = '16px';
    feedbackDiv.style.padding = '5px';
    feedbackDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    feedbackDiv.style.border = '1px solid #00ff00';
    feedbackDiv.style.transition = 'opacity 0.5s ease-in-out';
    feedbackDiv.style.opacity = '1';
    document.body.appendChild(feedbackDiv);
    
    // Remove after a short time
    setTimeout(() => {
      feedbackDiv.style.opacity = '0';
      setTimeout(() => document.body.removeChild(feedbackDiv), 500);
    }, 1000);
    
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
    
    // Skip invalid projectiles
    if (!projectile.body || !projectile.mesh) {
      continue;
    }
    
    try {
      // Check if projectile is still valid (this will throw if the physics body is invalid)
      const projectilePos = projectile.body.translation();
      
      // Check if projectile has gone too far away (optimization)
      const distanceFromOrigin = Math.sqrt(
        projectilePos.x * projectilePos.x + 
        projectilePos.y * projectilePos.y + 
        projectilePos.z * projectilePos.z
      );
      
      // If projectile has gone too far, remove it
      if (distanceFromOrigin > 1000) {
        if (projectile.mesh.parent) {
          projectile.mesh.parent.remove(projectile.mesh);
        }
        
        if (physicsWorld) {
          physicsWorld.removeBody(projectile.body);
        }
        
        gameState.projectiles.splice(i, 1);
        continue;
      }
      
      // Check collision with each enemy
      for (let j = gameState.enemies.length - 1; j >= 0; j--) {
        const enemy = gameState.enemies[j];
        
        if (!enemy.body || !enemy.mesh) {
          continue;
        }
        
        try {
          const enemyPos = enemy.body.translation();
          
          // Calculate distance for collision detection
          const distance = Math.sqrt(
            Math.pow(projectilePos.x - enemyPos.x, 2) +
            Math.pow(projectilePos.y - enemyPos.y, 2) +
            Math.pow(projectilePos.z - enemyPos.z, 2)
          );
          
          // Check if collision occurred
          if (distance < 2) { // Collision threshold
            console.log("Hit enemy at distance:", distance);
            
            // Create explosion effect
            if (enemy.mesh.parent) {
              createExplosion(enemyPos, enemy.mesh.parent);
            }
            
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
        } catch (e) {
          console.error("Error checking enemy collision:", e);
        }
      }
    } catch (e) {
      console.warn("Invalid projectile found, removing", e);
      
      // Clean up invalid projectile
      if (projectile.mesh && projectile.mesh.parent) {
        projectile.mesh.parent.remove(projectile.mesh);
      }
      
      gameState.projectiles.splice(i, 1);
    }
  }
}

// Create explosion effect at the given position
function createExplosion(position: { x: number, y: number, z: number }, scene: THREE.Object3D) {
  // Explosion particle count
  const particleCount = 20;
  
  // Create explosion particles
  for (let i = 0; i < particleCount; i++) {
    // Random size for each particle
    const size = 0.2 + Math.random() * 0.3;
    
    // Create particle
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0xff5500 : 0xffaa00,
      transparent: true,
      opacity: 1.0
    });
    
    const particle = new THREE.Mesh(geometry, material);
    
    // Set particle position to explosion center
    particle.position.set(position.x, position.y, position.z);
    
    // Random velocity
    const velocity = new THREE.Vector3(
      Math.random() * 10 - 5,
      Math.random() * 10, // Mostly upward
      Math.random() * 10 - 5
    );
    
    // Add to scene
    scene.add(particle);
    
    // Animate the particle
    const startTime = Date.now();
    const duration = 500 + Math.random() * 500; // Between 0.5 and 1 second
    
    function animateParticle() {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        // Remove particle when animation is done
        scene.remove(particle);
        return;
      }
      
      // Update position based on velocity
      particle.position.x += velocity.x * 0.02;
      particle.position.y += velocity.y * 0.02 - 0.1 * progress; // Add gravity effect
      particle.position.z += velocity.z * 0.02;
      
      // Fade out
      material.opacity = 1 - progress;
      
      // Continue animation
      requestAnimationFrame(animateParticle);
    }
    
    // Start animation
    animateParticle();
  }
}

// Update score display
function updateScoreDisplay(score: number) {
  const scoreElement = document.getElementById('score');
  if (scoreElement) {
    scoreElement.textContent = `SCORE: ${score}`;
  }
}
