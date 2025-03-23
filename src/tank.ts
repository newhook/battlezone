import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { Vehicle } from './types';
import { PhysicsWorld, createVehicleBody } from './physics';
import { Projectile } from './projectile';

/**
 * Base Tank class for shared functionality between player and enemy tanks
 */
export abstract class Tank implements Vehicle {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
  speed: number;
  turnSpeed: number;
  canFire: boolean;
  lastFired: number;
  protected turretContainer: THREE.Object3D;
  protected cannonMesh: THREE.Mesh;

  constructor(
    physicsWorld : PhysicsWorld,
    position: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0),
    color: number = 0x00ff00, 
    tankDimensions = { width: 2, height: 0.75, depth: 3 }
  ) {
    // Tank body
    const tankGeometry = new THREE.BoxGeometry(
      tankDimensions.width, 
      tankDimensions.height, 
      tankDimensions.depth
    );
    const tankMaterial = new THREE.MeshStandardMaterial({ 
      color: color, 
      wireframe: false
    });
    this.mesh = new THREE.Mesh(tankGeometry, tankMaterial);
    
    // Create a container for the turret to help with rotations
    this.turretContainer = new THREE.Object3D();
    this.turretContainer.position.set(0, tankDimensions.height/2, 0); // Position on top of tank body
    this.mesh.add(this.turretContainer);
    
    // Tank turret
    const turretGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8);
    const turretMesh = new THREE.Mesh(turretGeometry, tankMaterial);
    // Don't rotate the turret itself, only position it
    turretMesh.position.set(0, 0.25, 0); // Half the height of the turret
    this.turretContainer.add(turretMesh);
    
    // Tank cannon
    const cannonLength = 2;
    const cannonGeometry = new THREE.CylinderGeometry(0.1, 0.1, cannonLength, 8);
    const cannonMaterial = new THREE.MeshStandardMaterial({
      color: this.getCannonColor(color), // Slightly darker for contrast
      wireframe: false
    });
    this.cannonMesh = new THREE.Mesh(cannonGeometry, cannonMaterial);
    
    // Position and rotate the cannon to be centered in the turret
    this.cannonMesh.position.set(0, tankDimensions.height/4, cannonLength/2); // Move forward by half its length
    this.cannonMesh.rotation.x = Math.PI / 2; // Rotate to point forward
    this.turretContainer.add(this.cannonMesh);
    
    // Set initial position
    this.mesh.position.copy(position);
    
    // Physics body will be created when the tank is added to the world
    // For now, just initialize properties
    this.speed = 150;  // Base movement force
    this.turnSpeed = 5;  // Reduced from 20 to 5 for slower rotation
    this.canFire = true;
    this.lastFired = 0;
    
    // The body will be set when added to the scene in game.ts
    // Create physics body for the tank
    this.body = createVehicleBody(
      { width: 2, height: 0.75, depth: 3 },
      500,
      physicsWorld.world,
    );
    
    // Set initial physics body position to match mesh
    this.body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    
    // Link the mesh to the physics body for updates
    this.body.userData = { mesh: this.mesh };
  }

  // Helper method to create slightly darker color for cannon
  private getCannonColor(tankColor: number): number {
    const color = new THREE.Color(tankColor);
    color.multiplyScalar(0.8); // Make it darker
    return color.getHex();
  }

  move(direction: number): void {
    // Ensure the body is awake
    this.body.wakeUp();
    
    // Get current rotation to determine forward direction
    const rotation = this.body.rotation();
    
    // Create a rotation quaternion
    const quat = new THREE.Quaternion(
      rotation.x, rotation.y, rotation.z, rotation.w
    );
    
    // Calculate forward vector based on current rotation
    const forward = new THREE.Vector3(0, 0, direction);
    forward.applyQuaternion(quat);
    forward.multiplyScalar(this.speed);
    
    // Apply impulse for immediate movement
    this.body.applyImpulse(
      { x: forward.x, y: 0, z: forward.z }, // Lock Y component to prevent jumping
      true
    );
  }

  turn(direction: number): void {
    // Ensure the body is awake
    this.body.wakeUp();
    
    // For tanks, we want to rotate in place by applying direct rotation
    // rather than just torque which requires forward movement
    
    // Get current rotation
    const rotation = this.body.rotation();
    const currentQuat = new THREE.Quaternion(
      rotation.x, rotation.y, rotation.z, rotation.w
    );
    
    // Create a rotation quaternion for the turn
    const turnQuat = new THREE.Quaternion();
    turnQuat.setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), // Y-axis rotation
      direction * this.turnSpeed * 0.005 // Reduced from 0.01 to 0.005 for smoother rotation
    );
    
    // Combine rotations
    const newQuat = currentQuat.multiply(turnQuat);
    
    // Apply the new rotation directly
    this.body.setRotation({
      x: newQuat.x,
      y: newQuat.y,
      z: newQuat.z,
      w: newQuat.w
    }, true);
    
    // Also apply a small amount of torque to make the rotation feel more natural
    // and to overcome any friction
    const torque = { x: 0, y: direction * this.turnSpeed * 0.2, z: 0 }; // Reduced from 0.5 to 0.2
    this.body.applyTorqueImpulse(torque, true);
  }

  fire(): void {
    if (!this.canFire) return;
    
    // Calculate the cannon tip position in world space
    const cannonWorldPosition = new THREE.Vector3();
    this.cannonMesh.getWorldPosition(cannonWorldPosition);
    
    // Calculate forward direction based on turret's rotation
    const forward = new THREE.Vector3(0, 0, 1);
    const turretWorldQuaternion = new THREE.Quaternion();
    this.turretContainer.getWorldQuaternion(turretWorldQuaternion);
    forward.applyQuaternion(turretWorldQuaternion);
    forward.normalize();
    
    // Position the projectile at the tip of the cannon
    const cannonTip = cannonWorldPosition.clone().add(forward.clone().multiplyScalar(1.5));
    
    // Get tank's current velocity to add to projectile
    const tankVel = this.body.linvel();
    const initialVelocity = new THREE.Vector3(tankVel.x, tankVel.y, tankVel.z);
    
    // Create projectile physics body
    const scene = this.mesh.parent;
    if (scene instanceof THREE.Scene && window.physicsWorld) {
      try {
        // Create new projectile using the Projectile class
        const projectile = new Projectile(
          cannonTip,
          forward.clone(),
          initialVelocity,
          scene,
          window.physicsWorld
        );

        // Add to physics world and game state
        window.physicsWorld.addBody(projectile);
        if (window.gameState) {
          window.gameState.projectiles.push(projectile);
        }
      } catch (error) {
        console.error("Error creating projectile:", error);
      }
    }
    
    // Set cooldown
    this.canFire = false;
    this.lastFired = Date.now();
    setTimeout(() => {
      this.canFire = true;
    }, 500); // 500ms cooldown between shots
  }

  rotateTurret(direction: number): void {
    // Calculate new rotation
    const newRotation = this.turretContainer.rotation.y + direction * 0.05;
    
    // Limit rotation to ±45 degrees (±π/4 radians)
    const maxRotation = Math.PI / 4;
    this.turretContainer.rotation.y = Math.max(-maxRotation, Math.min(maxRotation, newRotation));
  }

  update(): void {
    // The physics world now handles updating the mesh position
  }

  // Method to check status and take damage
  takeDamage(_amount: number = 1): boolean {
    // Flash the tank briefly
    const originalColor = (this.mesh.material as THREE.MeshStandardMaterial).color.clone();
    (this.mesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
    
    setTimeout(() => {
      (this.mesh.material as THREE.MeshStandardMaterial).color.copy(originalColor);
    }, 100);
    
    return true; // Return true if tank is still alive
  }
}