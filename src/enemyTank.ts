import * as THREE from 'three';
import { Tank } from './tank';
import { PlayState } from './playState';

export class EnemyTank extends Tank {
  targetPosition: THREE.Vector3 | null = null;
  detectionRange: number;
  firingRange: number;
  lastAIUpdate: number = 0;
  aiUpdateInterval: number = 500;
  patrolRadius: number = 50;  // How far the tank will patrol from its current position
  minPatrolDistance: number = 20; // Minimum distance to move for patrol
  arrivalThreshold: number = 5; // How close we need to get to consider reaching patrol point

  // New properties for line of sight mechanics
  playerLastKnownPosition: THREE.Vector3 | null = null;
  hasLineOfSight: boolean = false;
  trackingPlayer: boolean = false;

  constructor(playState : PlayState, position: THREE.Vector3) {
    super(playState, position, 0xff0000); // Call base class constructor with red color

    // Enemy-specific properties
    this.speed = 100;  // Slower than player
    this.turnSpeed = 2;  // Increased from 1 to 2 to compensate for the lower base turn speed
    this.detectionRange = 500;
    this.firingRange = 30;
    this.hitpoints = 10; // Enemies have fewer hitpoints than the player
  }

  calculateTurnDirection(forward: THREE.Vector3, targetDirection: THREE.Vector3): number {
    const cross = new THREE.Vector3().crossVectors(forward, targetDirection);
    return Math.sign(cross.y);
  }

  handleMovement(targetPosition: THREE.Vector3, tankPosition: THREE.Vector3): void {
    // Get current forward direction
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    
    // Calculate direction to target
    const directionToTarget = new THREE.Vector3().subVectors(targetPosition, tankPosition).normalize();
    
    // Calculate angle to target
    const angleToTarget = forward.angleTo(directionToTarget);
    
    // Get turn direction (1 for left, -1 for right)
    const turnDirection = this.calculateTurnDirection(forward, directionToTarget);
    
    // First rotate to face the target
    if (Math.abs(angleToTarget) > 0.1) {
      // Turn either 1 or -1 based on which direction is shorter
      this.turn(turnDirection);
    } else {
      // Only move forward when properly aligned
      this.move(1);
    }
  }

  generateNewPatrolPoint(): void {
    const currentPos = this.mesh.position;
    const angle = Math.random() * Math.PI * 2;
    const distance = this.minPatrolDistance + Math.random() * (this.patrolRadius - this.minPatrolDistance);
    
    this.targetPosition = new THREE.Vector3(
      currentPos.x + Math.sin(angle) * distance,
      0.4, // Keep Y position constant
      currentPos.z + Math.cos(angle) * distance
    );
  }

  handlePatrol(): void {
    if (!this.targetPosition) {
      this.generateNewPatrolPoint();
      return;
    }

    const tankPosition = this.mesh.position;
    const distanceToTarget = tankPosition.distanceTo(this.targetPosition);

    // If we've reached the target, generate a new one
    if (distanceToTarget < this.arrivalThreshold) {
      this.generateNewPatrolPoint();
      return;
    }

    // Handle movement to patrol point
    this.handleMovement(this.targetPosition, tankPosition);
  }

  // Check if player is in line of sight (front 180 degrees and no obstacles)
  checkLineOfSight(playerPosition: THREE.Vector3, tankPosition: THREE.Vector3): boolean {
    // Get current forward direction
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
    
    // Calculate direction to player
    const directionToPlayer = new THREE.Vector3().subVectors(playerPosition, tankPosition).normalize();
    
    // Calculate angle to player
    const angleToPlayer = forward.angleTo(directionToPlayer);
    
    // Check if player is in front 180 degrees (PI/2 on each side)
    if (angleToPlayer > Math.PI / 2) {
      return false; // Player is behind the tank
    }
    
    // Check for obstacles using raycasting
    const distanceToPlayer = tankPosition.distanceTo(playerPosition);
    const ray = new THREE.Raycaster(
      tankPosition.clone().add(new THREE.Vector3(0, 0.5, 0)), // Slightly raise origin to avoid ground
      directionToPlayer,
      0,
      distanceToPlayer
    );
    
    // Get all obstacles (terrain objects) to check for collisions
    const obstacles = this.state.terrain.filter(obj => 
      // Exclude the ground itself from obstacle checks
      obj !== this.state.terrain[this.state.terrain.length - 1] && 
      obj.mesh instanceof THREE.Mesh
    );
    
    // Convert obstacles to meshes for raycasting
    const obstacleMeshes = obstacles.map(obj => obj.mesh);
    
    // Perform raycast
    const intersections = ray.intersectObjects(obstacleMeshes, false);
    
    // If there are intersections, the line of sight is blocked
    return intersections.length === 0;
  }

  update(): void {
    super.update();
    
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - this.lastAIUpdate;
    
    const playerPosition = this.state.player.mesh.position;
    const tankPosition = this.mesh.position;
    
    // Calculate distance to player
    const distanceToPlayer = playerPosition.distanceTo(tankPosition);
    
    // Check if player is within detection range
    if (distanceToPlayer < this.detectionRange) {
      // Check if we have line of sight to the player
      this.hasLineOfSight = this.checkLineOfSight(playerPosition, tankPosition);
      
      if (this.hasLineOfSight) {
        // We can see the player, update the last known position
        this.playerLastKnownPosition = playerPosition.clone();
        this.trackingPlayer = true;
        
        // Engage with player directly
        this.handleMovement(playerPosition, tankPosition);
      } else if (this.trackingPlayer && this.playerLastKnownPosition) {
        // We've lost sight but were tracking - move to last known position
        const distanceToLastKnown = tankPosition.distanceTo(this.playerLastKnownPosition);
        
        if (distanceToLastKnown < this.arrivalThreshold) {
          // We've reached the last known position but player isn't visible
          // Resume patrol behavior
          this.trackingPlayer = false;
          this.playerLastKnownPosition = null;
          this.targetPosition = null; // Will generate new patrol point
          this.handlePatrol();
        } else {
          // Move to last known position
          this.handleMovement(this.playerLastKnownPosition, tankPosition);
        }
      } else {
        // Player in range but not visible and not tracking - continue patrol
        this.handlePatrol();
      }
    } else {
      // Player out of detection range - reset tracking and patrol
      if (this.trackingPlayer) {
        this.trackingPlayer = false;
        this.playerLastKnownPosition = null;
        this.targetPosition = null; // Will generate new patrol point
      }
      
      // Continue standard patrol behavior
      this.handlePatrol();
    }
      
    // Update AI behavior at fixed intervals
    if (timeSinceLastUpdate >= this.aiUpdateInterval) {
      // Only check to fire if we have line of sight to the player
      if (this.hasLineOfSight) {
        this.checkAndFireAtPlayer();
      }
      
      this.lastAIUpdate = currentTime;
    }
  }

  checkAndFireAtPlayer(): void {
    const playerPosition = this.state.player.mesh.position;
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

  // Override takeDamage to add visual feedback specific to enemy tanks
  takeDamage(amount: number = 10): boolean {
    const isAlive = super.takeDamage(amount);
    
    // If the tank is destroyed, show more dramatic effects
    if (!isAlive) {
      // Create smoke particles for a damaged tank
      this.createDamageEffect();
    }
    
    return isAlive;
  }
  
  private createDamageEffect(): void {
    // Create smoke particles at the tank position
    const particleCount = 15;
    const tankPosition = this.mesh.position.clone();
    
    for (let i = 0; i < particleCount; i++) {
      const size = 0.3 + Math.random() * 0.4;
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.7
      });
      
      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(
        tankPosition.x + (Math.random() * 2 - 1),
        tankPosition.y + Math.random() * 2,
        tankPosition.z + (Math.random() * 2 - 1)
      );
      
      // Add particle to scene
      this.state.scene.add(particle);
      
      // Animate the smoke particle
      const startTime = Date.now();
      const duration = 1000 + Math.random() * 1000;
      
      // Create upward drift motion
      const drift = new THREE.Vector3(
        Math.random() * 0.5 - 0.25,
        Math.random() * 0.5 + 0.5, // Mostly upward
        Math.random() * 0.5 - 0.25
      );
      
      const animateParticle = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
          this.state.scene.remove(particle);
          return;
        }
        
        // Drift upward and expand slightly
        particle.position.add(drift.clone().multiplyScalar(0.03));
        particle.scale.multiplyScalar(1.01);
        
        // Fade out
        material.opacity = 0.7 * (1 - progress);
        
        requestAnimationFrame(animateParticle);
      };
      
      animateParticle();
    }
  }
}