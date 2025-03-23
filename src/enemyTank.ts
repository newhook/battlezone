import * as THREE from 'three';
import { Vehicle } from './types';
import { Tank } from './tank';

export class EnemyTank extends Tank {
  targetPosition: THREE.Vector3 | null = null;
  detectionRange: number;
  firingRange: number;
  aiUpdateInterval: number;
  aiIntervalId: number | null = null;

  constructor(position: THREE.Vector3) {
    super(position, 0xff0000); // Call base class constructor with red color

    // Enemy-specific properties
    this.speed = 5;  // Slower than player
    this.turnSpeed = 1;  // Slower turning than player
    this.detectionRange = 50;
    this.firingRange = 30;
    this.aiUpdateInterval = 500;
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

  update(): void {
    super.update();
    // Check if we need to fire at the player
    this.checkAndFireAtPlayer();
  }

  // Method to create an instance of enemy tank from position
  static create(position: THREE.Vector3): Vehicle {
    return new EnemyTank(position);
  }
}