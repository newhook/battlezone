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
    
    // Create a container for the turret to help with rotations
    const turretContainer = new THREE.Object3D();
    turretContainer.position.set(0, 0.375, 0); // Position on top of tank body
    this.mesh.add(turretContainer);
    
    // Tank turret
    const turretGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8);
    const turretMesh = new THREE.Mesh(turretGeometry, tankMaterial);
    // Don't rotate the turret itself, only position it
    turretMesh.position.set(0, 0.25, 0); // Half the height of the turret
    turretContainer.add(turretMesh);
    
    // Tank cannon
    const cannonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const cannonMaterial = new THREE.MeshStandardMaterial({
      color: 0x008800, // Slightly darker green for contrast
      wireframe: false
    });
    const cannonMesh = new THREE.Mesh(cannonGeometry, cannonMaterial);
    
    // Properly position and rotate the cannon
    cannonMesh.position.set(0, 0, 1.0); // Position forward of the turret
    // Rotate to point forward (cylinders by default are along the Y axis)
    cannonMesh.rotation.x = Math.PI / 2;
    turretContainer.add(cannonMesh);
    
    // Set initial position
    this.mesh.position.copy(position);
    
    // Physics body will be created when the tank is added to the world
    // For now, just initialize properties
    this.speed = 150;  // Increased from 30 for stronger movement force
    this.turnSpeed = 20;  // Increased from 12 for faster rotation
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
    if (!this.body) return;
    
    // Ensure the body is awake
    this.body.wakeUp();
    
    // Apply torque for rotation (around Y axis)
    const torque = { x: 0, y: direction * this.turnSpeed, z: 0 };
    this.body.applyTorqueImpulse(torque, true);
  }

  fire(): void {
    if (!this.canFire) return;
    
    console.log("Fire method called!"); // Debug logging
    
    // Find the turret container and cannon more reliably
    const turretContainer = this.mesh.children[0];
    if (!turretContainer) {
      console.error("Could not find turret container");
      return;
    }
    
    // Find the cannon mesh within the turret container
    let cannon = null;
    turretContainer.traverse(child => {
      if (child instanceof THREE.Mesh && 
          child.geometry instanceof THREE.CylinderGeometry && 
          child.geometry.parameters.radiusTop === 0.1) {
        cannon = child;
      }
    });
    
    if (!cannon) {
      console.error("Could not find cannon for firing");
      return;
    }
    
    // Calculate the cannon tip position in world space
    const cannonWorldPosition = new THREE.Vector3();
    cannon.getWorldPosition(cannonWorldPosition);
    
    // Calculate a position at the tip of the cannon
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.mesh.quaternion);
    forward.normalize();
    
    // Position the projectile at the tip of the cannon (a bit in front)
    const cannonTip = cannonWorldPosition.clone().add(forward.clone().multiplyScalar(1.5));
    
    console.log("Cannon tip position:", cannonTip);
    
    // Create projectile mesh with bright, glowing material
    const projectileGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const projectileMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffff00, 
      wireframe: false,
      emissive: 0xffff00,
      emissiveIntensity: 0.8
    });
    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectileMesh.position.copy(cannonTip);
    
    // Add a point light to the projectile to make it glow
    const projectileLight = new THREE.PointLight(0xffff00, 1, 10);
    projectileLight.position.set(0, 0, 0);
    projectileMesh.add(projectileLight);
    
    // Create projectile physics body
    const scene = this.mesh.parent;
    if (scene && window.physicsWorld) {
      const world = window.physicsWorld.world;
      
      try {
        // Create rigid body for projectile
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(cannonTip.x, cannonTip.y, cannonTip.z)
          .setLinearDamping(0.0) // No drag on projectiles
          .setAngularDamping(0.0); // No angular drag
        
        const projectileBody = world.createRigidBody(rigidBodyDesc);
        
        // Create collider (slightly smaller than visual size for better gameplay)
        const colliderDesc = RAPIER.ColliderDesc.ball(0.4);
        colliderDesc.setDensity(1.0);
        colliderDesc.setRestitution(0.5);
        colliderDesc.setFriction(0.0);
        
        world.createCollider(colliderDesc, projectileBody);
        
        // Link mesh to physics body
        projectileBody.userData = { mesh: projectileMesh };
        
        // Apply velocity in the direction the tank is facing
        const projectileSpeed = 100; // Increased speed
        forward.multiplyScalar(projectileSpeed); 
        
        // Add tank's velocity to projectile velocity
        if (this.body) {
          const tankVel = this.body.linvel();
          forward.add(new THREE.Vector3(tankVel.x, tankVel.y, tankVel.z));
        }
        
        // Set linear velocity of projectile
        projectileBody.setLinvel({ x: forward.x, y: forward.y, z: forward.z }, true);
        projectileBody.wakeUp();
        
        // Add to scene
        scene.add(projectileMesh);
        window.physicsWorld.addBody(projectileBody);
        
        console.log("Projectile created at position:", cannonTip, "with velocity:", forward);
        
        // Add projectile to game objects
        if (window.gameState) {
          const projectile: GameObject = {
            mesh: projectileMesh,
            body: projectileBody,
            update: () => {} // Physics world handles updates
          };
          
          window.gameState.projectiles.push(projectile);
          
          // Destroy projectile after 5 seconds
          setTimeout(() => {
            try {
              if (scene && projectileMesh.parent) {
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
            } catch (e) {
              console.error("Error cleaning up projectile:", e);
            }
          }, 5000); // Extended lifetime for projectiles
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