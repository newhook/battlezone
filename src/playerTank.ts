import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { GameObject, Vehicle } from './types';
import { createVehicleBody } from './physics';

export class PlayerTank implements Vehicle {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
  speed: number;
  turnSpeed: number;
  canFire: boolean;
  lastFired: number;

  constructor(position: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0)) {
    // Tank body
    const tankGeometry = new THREE.BoxGeometry(2, 0.75, 3);
    const tankMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00, 
      wireframe: false
    });
    this.mesh = new THREE.Mesh(tankGeometry, tankMaterial);
    
    // Tank turret
    const turretGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8);
    const turretMesh = new THREE.Mesh(turretGeometry, tankMaterial);
    turretMesh.position.set(0, 0.5, 0);
    turretMesh.rotation.x = Math.PI / 2;
    this.mesh.add(turretMesh);
    
    // Tank cannon
    const cannonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const cannonMesh = new THREE.Mesh(cannonGeometry, tankMaterial);
    cannonMesh.position.set(0, 0, 1.2);
    cannonMesh.rotation.x = Math.PI / 2;
    turretMesh.add(cannonMesh);
    
    // Set initial position
    this.mesh.position.copy(position);
    
    // Physics body will be created when the tank is added to the world
    // For now, just initialize properties
    this.speed = 30;  // Moderate speed for better control
    this.turnSpeed = 12;  // Significantly increased turn speed for faster rotation
    this.canFire = true;
    this.lastFired = 0;
    
    // The body will be set when added to the scene in game.ts
    this.body = null;
  }

  initPhysics(world: RAPIER.World) {
    // Create physics body for the tank
    this.body = createVehicleBody(
      { width: 2, height: 0.75, depth: 3 },
      500,
      world
    );
    
    // Set initial physics body position to match mesh
    const position = this.mesh.position;
    this.body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    
    // Link the mesh to the physics body for updates
    this.body.userData = { mesh: this.mesh };
  }

  move(direction: number): void {
    if (!this.body) return;
    
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
      { x: forward.x, y: forward.y, z: forward.z },
      true
    );
  }

  turn(direction: number): void {
    if (!this.body) return;
    
    // Apply torque for rotation (around Y axis)
    const torque = { x: 0, y: direction * this.turnSpeed, z: 0 };
    this.body.applyTorqueImpulse(torque, true);
  }

  fire(): void {
    if (!this.canFire) return;
    
    // Get the position and rotation of the tank cannon
    const cannonTip = new THREE.Vector3(0, 0, 2);
    cannonTip.applyQuaternion(this.mesh.quaternion);
    cannonTip.add(this.mesh.position);
    
    // Create projectile mesh
    const projectileGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const projectileMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, wireframe: true });
    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectileMesh.position.copy(cannonTip);
    
    // Create projectile physics body
    const scene = this.mesh.parent;
    if (scene && window.physicsWorld) {
      const world = window.physicsWorld.world;
      
      // Create rigid body for projectile
      const RAPIER_MODULE = (RAPIER as any)._module;
      const rigidBodyDesc = RAPIER_MODULE.RigidBodyDesc.dynamic()
        .setTranslation(cannonTip.x, cannonTip.y, cannonTip.z);
      
      const projectileBody = world.createRigidBody(rigidBodyDesc);
      
      // Create collider
      const colliderDesc = RAPIER_MODULE.ColliderDesc.ball(0.2);
      colliderDesc.setDensity(2.0);  // Dense projectile
      colliderDesc.setRestitution(0.6);  // Bouncy
      
      world.createCollider(colliderDesc, projectileBody);
      
      // Link mesh to physics body
      projectileBody.userData = { mesh: projectileMesh };
      
      // Apply velocity in the direction the tank is facing
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(this.mesh.quaternion);
      forward.multiplyScalar(50); // Fast projectile speed
      
      // Add tank's velocity to projectile velocity
      if (this.body) {
        const tankVel = this.body.linvel();
        forward.add(new THREE.Vector3(tankVel.x, tankVel.y, tankVel.z));
      }
      
      // Set linear velocity of projectile
      projectileBody.setLinvel({ x: forward.x, y: forward.y, z: forward.z }, true);
      
      scene.add(projectileMesh);
      window.physicsWorld.addBody(projectileBody);
      
      // Add projectile to game objects
      if (window.gameState) {
        const projectile: GameObject = {
          mesh: projectileMesh,
          body: projectileBody,
          update: () => {
            // Physics world will update the mesh position
          }
        };
        
        window.gameState.projectiles.push(projectile);
        
        // Destroy projectile after 3 seconds
        setTimeout(() => {
          if (scene && projectileMesh) {
            scene.remove(projectileMesh);
          }
          
          if (window.physicsWorld && projectileBody) {
            window.physicsWorld.removeBody(projectileBody);
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
    }, 500); // 500ms cooldown between shots
  }

  update(): void {
    // The physics world now handles updating the mesh position
  }

  // Method to check status and take damage
  takeDamage(amount: number = 1): boolean {
    // Could implement health system here
    // For now, let's just indicate the player took damage
    
    // Flash the tank briefly
    const originalColor = (this.mesh.material as THREE.MeshStandardMaterial).color.clone();
    (this.mesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
    
    setTimeout(() => {
      (this.mesh.material as THREE.MeshStandardMaterial).color.copy(originalColor);
    }, 100);
    
    return true; // Return true if player is still alive
  }

  // Static factory method for creating player tank
  static create(position?: THREE.Vector3): Vehicle {
    return new PlayerTank(position);
  }
}