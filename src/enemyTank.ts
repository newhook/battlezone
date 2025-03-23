import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { GameObject, Vehicle } from './types';
import { createVehicleBody } from './physics';
import { PhysicsBody } from './PhysicsBody';

// EnemyTank class for better encapsulation and AI behavior
export class EnemyTank implements Vehicle {
  mesh: THREE.Mesh;
  physics: PhysicsBody;
  speed: number;
  turnSpeed: number;
  canFire: boolean;
  lastFired: number;
  targetPosition: THREE.Vector3 | null = null;
  detectionRange: number;
  firingRange: number;
  aiUpdateInterval: number;
  aiIntervalId: number | null = null;

  constructor(position: THREE.Vector3) {
    // Enemy tank body
    const tankGeometry = new THREE.BoxGeometry(2, 0.75, 3);
    const tankMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, 
      wireframe: false 
    });
    this.mesh = new THREE.Mesh(tankGeometry, tankMaterial);
    
    // Create a container for the turret to help with rotations
    const turretContainer = new THREE.Object3D();
    turretContainer.position.set(0, 0.375, 0); // Position on top of tank body
    this.mesh.add(turretContainer);
    
    // Enemy tank turret
    const turretGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8);
    const turretMesh = new THREE.Mesh(turretGeometry, tankMaterial);
    turretMesh.position.set(0, 0.25, 0); // Half the height of the turret
    turretContainer.add(turretMesh);
    
    // Enemy tank cannon
    const cannonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const cannonMaterial = new THREE.MeshStandardMaterial({
      color: 0xbb0000, // Slightly darker red for contrast
      wireframe: false
    });
    const cannonMesh = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannonMesh.position.set(0, 0, 1.0); // Position forward of the turret
    cannonMesh.rotation.x = Math.PI / 2; // Rotate to point forward
    turretContainer.add(cannonMesh);
    
    // Set initial position
    this.mesh.position.copy(position);
    
    // Initialize properties
    this.speed = 5;
    this.turnSpeed = 1;
    this.canFire = true;
    this.lastFired = 0;
    this.detectionRange = 50; // How far the tank can detect the player
    this.firingRange = 30; // How far the tank can fire at the player
    this.aiUpdateInterval = 500; // Update AI every 500ms
  }

  initPhysics(world: RAPIER.World) {
    // Create physics body for the enemy tank
    this.physics = createVehicleBody(
      { width: 2, height: 0.75, depth: 3 },
      500,
      world,
      this.mesh
    );
    
    // Set initial physics body position to match mesh
    const position = this.mesh.position;
    this.physics.setPosition(position);
    
    // Start AI behavior
    this.startAI();
  }

  move(direction: number): void {
    if (!this.physics) return;
    
    // Get current rotation to determine forward direction
    const rotation = this.physics.getRotation();
    
    // Calculate forward vector based on current rotation
    const forward = new THREE.Vector3(0, 0, direction);
    forward.applyQuaternion(rotation);
    
    // Apply impulse for immediate movement, scaled by direction
    const impulse = forward.multiplyScalar(this.speed * 2);
    this.physics.applyImpulse(impulse);
  }

  turn(direction: number): void {
    if (!this.physics) return;
    
    // Use the simulateTreads method from PhysicsBody class
    this.physics.simulateTreads(direction, this.turnSpeed);
  }

  fire(): void {
    if (!this.canFire) return;
    
    // Get the position and rotation of the tank cannon
    const cannonTip = new THREE.Vector3(0, 0, 2);
    cannonTip.applyQuaternion(this.mesh.quaternion);
    cannonTip.add(this.mesh.position);
    
    // Create projectile mesh
    const projectileGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const projectileMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff6600, 
      wireframe: true,
      emissive: 0xff6600,
      emissiveIntensity: 0.5
    });
    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectileMesh.position.copy(cannonTip);
    
    // Create projectile physics body
    const scene = this.mesh.parent;
    if (scene && window.physicsWorld) {
      const world = window.physicsWorld.world;
      
      // Create rigid body for projectile
      const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(cannonTip.x, cannonTip.y, cannonTip.z)
        .setLinearDamping(0.0) // No drag for projectiles
        .setAngularDamping(0.0);
      
      const projectileBody = world.createRigidBody(rigidBodyDesc);
      
      // Create collider
      const colliderDesc = RAPIER.ColliderDesc.ball(0.2);
      colliderDesc.setDensity(2.0);  // Dense projectile
      colliderDesc.setRestitution(0.6);  // Bouncy
      
      world.createCollider(colliderDesc, projectileBody);
      
      // Create PhysicsBody for the projectile
      const projectilePhysics = new PhysicsBody(projectileBody, projectileMesh);
      
      // Apply velocity in the direction the tank is facing
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(this.mesh.quaternion);
      forward.multiplyScalar(40); // Enemy projectile speed
      
      // Add tank's velocity to projectile velocity
      if (this.physics) {
        const tankVel = this.physics.getVelocity();
        forward.add(tankVel);
      }
      
      // Set linear velocity of projectile
      projectilePhysics.setVelocity(forward);
      
      scene.add(projectileMesh);
      window.physicsWorld.addBody(projectilePhysics);
      
      // Add projectile to game objects
      if (window.gameState) {
        const projectile: GameObject = {
          mesh: projectileMesh,
          physics: projectilePhysics,
          update: () => {
            // Physics world will update the mesh position
          }
        };
        
        window.gameState.projectiles.push(projectile);
        
        // Destroy projectile after 3 seconds
        setTimeout(() => {
          if (scene && projectileMesh.parent) {
            scene.remove(projectileMesh);
          }
          
          if (window.physicsWorld && projectilePhysics) {
            window.physicsWorld.removeBody(projectilePhysics);
          }
          
          if (window.gameState) {
            const index = window.gameState.projectiles.indexOf(projectile);
            if (index !== -1) {
              window.gameState.projectiles.splice(index, 1);
            }
          }
        }, 3000);
      }
    }
    
    // Set cooldown
    this.canFire = false;
    this.lastFired = Date.now();
    setTimeout(() => {
      this.canFire = true;
    }, 2000); // 2 second cooldown between shots for enemy tanks
  }

  update(): void {
    // The physics world now handles updating the mesh position
    
    // Check if we need to fire at the player
    this.checkAndFireAtPlayer();
  }

  startAI(): void {
    // Run AI behavior at fixed intervals
    this.aiIntervalId = window.setInterval(() => {
      this.updateAI();
    }, this.aiUpdateInterval);
  }

  stopAI(): void {
    if (this.aiIntervalId !== null) {
      window.clearInterval(this.aiIntervalId);
      this.aiIntervalId = null;
    }
  }

  updateAI(): void {
    if (!window.gameState || !window.gameState.player) return;
    
    const playerPosition = window.gameState.player.mesh.position;
    const tankPosition = this.mesh.position;
    
    // Calculate distance to player
    const distanceToPlayer = playerPosition.distanceTo(tankPosition);
    
    // If player is within detection range, set them as target
    if (distanceToPlayer < this.detectionRange) {
      this.targetPosition = playerPosition.clone();
      
      // Calculate direction to player
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, tankPosition)
        .normalize();
      
      // Calculate the angle to the player
      const forward = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(this.mesh.quaternion);
      
      const angleToPlayer = forward.angleTo(directionToPlayer);
      
      // Get the sign of the angle (left or right)
      const cross = new THREE.Vector3().crossVectors(forward, directionToPlayer);
      const turnDirection = Math.sign(cross.y);
      
      // If we need to turn more than a small threshold angle
      if (Math.abs(angleToPlayer) > 0.1) {
        this.turn(turnDirection * 0.5); // Slower turning for more natural movement
      }
      
      // Move forward if facing approximately the right direction
      if (Math.abs(angleToPlayer) < Math.PI / 4) {
        this.move(0.5); // Forward at half speed
      } else {
        this.move(0); // Stop moving if we need to turn a lot
      }
    } else {
      // Random patrol movement if no player detected
      // Choose a new random direction occasionally
      if (!this.targetPosition || Math.random() < 0.05) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 20;
        this.targetPosition = new THREE.Vector3(
          tankPosition.x + Math.sin(angle) * distance,
          0,
          tankPosition.z + Math.cos(angle) * distance
        );
      }
      
      // Move toward target position
      const directionToTarget = new THREE.Vector3()
        .subVectors(this.targetPosition, tankPosition)
        .normalize();
      
      const forward = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(this.mesh.quaternion);
      
      const angleToTarget = forward.angleTo(directionToTarget);
      const cross = new THREE.Vector3().crossVectors(forward, directionToTarget);
      const turnDirection = Math.sign(cross.y);
      
      if (Math.abs(angleToTarget) > 0.1) {
        this.turn(turnDirection * 0.3);
      }
      
      if (Math.abs(angleToTarget) < Math.PI / 3) {
        this.move(0.3); // Slower patrol speed
      }
    }
  }

  checkAndFireAtPlayer(): void {
    if (!window.gameState || !window.gameState.player) return;
    
    const playerPosition = window.gameState.player.mesh.position;
    const tankPosition = this.mesh.position;
    
    // Calculate distance to player
    const distanceToPlayer = playerPosition.distanceTo(tankPosition);
    
    // If player is within firing range
    if (distanceToPlayer < this.firingRange) {
      // Calculate direction to player
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, tankPosition)
        .normalize();
      
      // Calculate the angle to the player
      const forward = new THREE.Vector3(0, 0, 1)
        .applyQuaternion(this.mesh.quaternion);
      
      const angleToPlayer = forward.angleTo(directionToPlayer);
      
      // If we're facing approximately toward the player, fire
      if (Math.abs(angleToPlayer) < Math.PI / 8) {
        this.fire();
      }
    }
  }

  // Method to create an instance of enemy tank from position
  static create(position: THREE.Vector3): Vehicle {
    return new EnemyTank(position);
  }
}