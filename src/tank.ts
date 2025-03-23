import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { GameObject, Vehicle } from './types';
import { PhysicsWorld, createVehicleBody } from './physics';

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
    const cannonMesh = new THREE.Mesh(cannonGeometry, cannonMaterial);
    
    // Position and rotate the cannon to be centered in the turret
    cannonMesh.position.set(0, tankDimensions.height/4, cannonLength/2); // Move forward by half its length
    cannonMesh.rotation.x = Math.PI / 2; // Rotate to point forward
    this.turretContainer.add(cannonMesh);
    
    // Set initial position
    this.mesh.position.copy(position);
    
    // Physics body will be created when the tank is added to the world
    // For now, just initialize properties
    this.speed = 150;  // Base movement force
    this.turnSpeed = 20;  // Base rotation speed
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
    
    // Find the cannon mesh within the turret container
    let cannon: THREE.Mesh | null = null;
    this.turretContainer.traverse(child => {
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
    (cannon as THREE.Object3D).getWorldPosition(cannonWorldPosition);
    
    // Calculate forward direction based on turret's rotation
    const forward = new THREE.Vector3(0, 0, 1);
    const turretWorldQuaternion = new THREE.Quaternion();
    this.turretContainer.getWorldQuaternion(turretWorldQuaternion);
    forward.applyQuaternion(turretWorldQuaternion);
    forward.normalize();
    
    // Position the projectile at the tip of the cannon
    const cannonTip = cannonWorldPosition.clone().add(forward.clone().multiplyScalar(1.5));
    
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
        
        // Apply velocity in the direction of the turret
        const projectileSpeed = 100; // Fast projectile speed
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