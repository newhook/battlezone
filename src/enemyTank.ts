import * as THREE from 'three';
import { Tank } from './tank';
import { PhysicsWorld } from './physics';

export class EnemyTank extends Tank {
  targetPosition: THREE.Vector3 | null = null;
  detectionRange: number;
  firingRange: number;
  lastAIUpdate: number = 0;
  aiUpdateInterval: number = 500;

  constructor(physicsWorld : PhysicsWorld, position: THREE.Vector3) {
    super(physicsWorld, position, 0xff0000); // Call base class constructor with red color

    // Enemy-specific properties
    this.speed = 100;  // Slower than player
    this.turnSpeed = 2;  // Increased from 1 to 2 to compensate for the lower base turn speed
    this.detectionRange = 500;
    this.firingRange = 30;
  }

  calculateTurnDirection(forward: THREE.Vector3, targetDirection: THREE.Vector3): number {
    const cross = new THREE.Vector3().crossVectors(forward, targetDirection);
    return Math.sign(cross.y);
  }

  handleMovement(playerPosition: THREE.Vector3, tankPosition: THREE.Vector3): void {
    // Get current forward direction
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    
    // Calculate direction to player
    const directionToPlayer = new THREE.Vector3().subVectors(playerPosition, tankPosition).normalize();
    
    // Calculate angle to player
    const angleToTarget = forward.angleTo(directionToPlayer);
    
    // Get turn direction (1 for left, -1 for right)
    const turnDirection = this.calculateTurnDirection(forward, directionToPlayer);
    
    // First rotate to face the player
    if (Math.abs(angleToTarget) > 0.1) {
      // Turn either 1 or -1 based on which direction is shorter
      this.turn(turnDirection);
    } else {
      // Only move forward when properly aligned
      this.move(1);
    }
  }

  update(): void {
    super.update();
    
    if (!window.gameState?.player) return;
    
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - this.lastAIUpdate;
    
    const playerPosition = window.gameState.player.mesh.position;
    const tankPosition = this.mesh.position;
    
    // Calculate distance to player
    const distanceToPlayer = playerPosition.distanceTo(tankPosition);
    
    // If player is within detection range, engage
    if (distanceToPlayer < this.detectionRange) {
      this.handleMovement(playerPosition, tankPosition);
    } else {
      // Random patrol behavior could be implemented here
      this.move(0); // Stop moving when player is out of range
    }
      
    // Update AI behavior at fixed intervals
    if (timeSinceLastUpdate >= this.aiUpdateInterval) {
      // Check if we can fire at the player
      this.checkAndFireAtPlayer();
      
      this.lastAIUpdate = currentTime;
    }
  }

  checkAndFireAtPlayer(): void {
    if (!window.gameState?.player) return;
    
    const playerPosition = window.gameState.player.mesh.position;
    const tankPosition = this.mesh.position;
    
    const distanceToPlayer = playerPosition.distanceTo(tankPosition);
    
    if (distanceToPlayer < this.firingRange) {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
      const directionToPlayer = new THREE.Vector3()
        .subVectors(playerPosition, tankPosition)
        .normalize();
      
      const angleToPlayer = forward.angleTo(directionToPlayer);
      
      if (Math.abs(angleToPlayer) < Math.PI / 8) {
        this.fire();
      }
    }
  }
}