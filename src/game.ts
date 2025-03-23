import * as THREE from 'three';
import { GameState, InputState, PhysicsWorld as PhysicsWorldInterface } from './types';
import { PlayerTank } from './playerTank';
import { EnemyTank } from './enemyTank';
import { createTerrain, createBoundaryWalls, createGround } from './gameObjects';
import { PhysicsWorld } from './physics';

// Create game state and initialize the game world
export function setupGame(scene: THREE.Scene): { gameState: GameState, physicsWorld: PhysicsWorldInterface } {
  // Initialize physics world
  const physicsWorld = new PhysicsWorld();
  
  // Make physics world globally accessible (for easier debugging and projectile creation)
  window.physicsWorld = physicsWorld;
  
  // Create the player's tank
  const player = new PlayerTank();
  player.initPhysics(physicsWorld.world);
  scene.add(player.mesh);
  
  // Create enemy tanks
  const enemies: EnemyTank[] = [];
  const maxEnemies = 5; // Number of enemy tanks in the scene
  
  // Calculate enemy positions in a ring around the player
  for (let i = 0; i < maxEnemies; i++) {
    // Position in a circle around the play area (50 units away)
    const angle = (i / maxEnemies) * Math.PI * 2; 
    const distance = 50 + Math.random() * 20; // Between 50-70 units away
    const x = Math.sin(angle) * distance;
    const z = Math.cos(angle) * distance;
    
    // Create the enemy tank
    const enemy = new EnemyTank(new THREE.Vector3(x, 0.4, z));
    enemy.initPhysics(physicsWorld.world);
    
    scene.add(enemy.mesh);
    enemies.push(enemy);
  }
  
  // Create terrain obstacles (random blockers in the scene)
  const terrainPositions: THREE.Vector3[] = [];
  const maxObstacles = 20;
  
  // Distribute obstacles in clusters for more natural grouping
  for (let cluster = 0; cluster < 5; cluster++) {
    // Create a cluster center
    const centerX = (Math.random() - 0.5) * 80;
    const centerZ = (Math.random() - 0.5) * 80;
    
    // Add 3-6 obstacles per cluster
    const obstaclesInCluster = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < obstaclesInCluster; i++) {
      // Position within the cluster (within 5-15 units of cluster center)
      const radius = 5 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      const x = centerX + Math.sin(angle) * radius;
      const z = centerZ + Math.cos(angle) * radius;
      
      // Avoid placing obstacles too close to the player's starting position
      const distFromPlayer = Math.sqrt(x * x + z * z);
      if (distFromPlayer > 15) {
        terrainPositions.push(new THREE.Vector3(x, 0, z));
      }
      
      // Limit total obstacles
      if (terrainPositions.length >= maxObstacles) break;
    }
  }
  
  // Create terrain objects
  const terrain = createTerrain(terrainPositions, physicsWorld.world);
  terrain.forEach(object => {
    scene.add(object.mesh);
    if (object.physics) {
      physicsWorld.addBody(object.physics);
    }
  });
  
  // Create boundary walls
  const walls = createBoundaryWalls(100, physicsWorld.world);
  walls.forEach(wall => {
    scene.add(wall.mesh);
    if (wall.physics) {
      physicsWorld.addBody(wall.physics);
    }
  });
  
  // Create ground
  const ground = createGround(200); // Create a 200x200 ground plane
  scene.add(ground.mesh);
  
  // Initialize game state
  const gameState: GameState = {
    player,
    enemies,
    terrain,
    projectiles: [],
    score: 0,
    gameOver: false
  };
  
  // Make game state globally accessible
  window.gameState = gameState;
  
  return { gameState, physicsWorld };
}

// Update game logic based on input
export function updateGame(
  gameState: GameState, 
  input: InputState, 
  physicsWorld: PhysicsWorldInterface, 
  deltaTime: number
): void {
  if (gameState.gameOver) return;
  
  // Update player tank based on input
  const player = gameState.player;
  
  // Apply movement forces based on input
  if (input.forward) {
    player.move(1);
  } else if (input.backward) {
    player.move(-1);
  } else {
    player.move(0); // Apply no force but handle damping
  }
  
  // Apply turning forces
  if (input.left) {
    player.turn(-1);
  } else if (input.right) {
    player.turn(1);
  }
  
  // Turret rotation
  if (input.turretLeft) {
    player.rotateTurret(-1);
  } else if (input.turretRight) {
    player.rotateTurret(1);
  }
  
  // Handle firing
  if (input.fire && player.canFire && Date.now() - player.lastFired > 500) {
    player.fire();
  }
  
  // Update physics world
  physicsWorld.update(deltaTime);
  
  // Call update method for any game objects that need custom updates
  if (player.update) player.update();
  
  // Update enemy tanks
  gameState.enemies.forEach(enemy => {
    if (enemy.update) enemy.update();
  });
  
  // Update projectiles
  gameState.projectiles.forEach(projectile => {
    if (projectile.update) projectile.update();
    
    // Check for out-of-bounds projectiles
    if (projectile.mesh.position.length() > 200) {
      // Remove from scene and physics world
      if (projectile.mesh.parent) {
        projectile.mesh.parent.remove(projectile.mesh);
      }
      
      if (projectile.physics && physicsWorld) {
        physicsWorld.removeBody(projectile.physics);
      }
      
      // Mark for removal from game state
      projectile.mesh.userData.removed = true;
    }
  });
  
  // Clean up removed projectiles
  gameState.projectiles = gameState.projectiles.filter(p => !p.mesh.userData.removed);
  
  // Update score display 
  const scoreElement = document.getElementById('score');
  if (scoreElement) {
    scoreElement.textContent = `SCORE: ${gameState.score}`;
  }
  
  // Check for collisions (handled by physics world)
  // ...
  
  // Check for enemies destroyed
  gameState.enemies = gameState.enemies.filter(enemy => {
    // For now, keep all enemies
    return true;
  });
  
  // Check win/lose conditions
  if (gameState.enemies.length === 0) {
    // All enemies destroyed - win condition
    console.log('All enemies destroyed! Victory!');
  }
}

// Create explosion effect at the given position
function createExplosion(position: THREE.Vector3 | RAPIER.Vector, scene: THREE.Scene) {
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
    if (position instanceof THREE.Vector3) {
      particle.position.copy(position);
    } else {
      particle.position.set(position.x, position.y, position.z);
    }
    
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
