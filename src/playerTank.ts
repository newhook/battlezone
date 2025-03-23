import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { GameObject, Vehicle } from './types';
import { createVehicleBody } from './physics';
import { PhysicsBody } from './PhysicsBody';

export class PlayerTank implements Vehicle {
  mesh: THREE.Mesh;
  physics: PhysicsBody;
  speed: number;
  turnSpeed: number;
  turretRotationSpeed: number;
  canFire: boolean;
  lastFired: number;
  private turretContainer: THREE.Object3D;

  constructor(position: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0)) {
    // Tank body
    const tankGeometry = new THREE.BoxGeometry(2, 0.75, 3);
    const tankMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00, 
      wireframe: false
    });
    this.mesh = new THREE.Mesh(tankGeometry, tankMaterial);
    
    // Create a container for the turret to help with rotations
    this.turretContainer = new THREE.Object3D();
    this.turretContainer.position.set(0, 0.375, 0); // Position on top of tank body
    this.mesh.add(this.turretContainer);
    
    // Tank turret
    const turretGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8);
    const turretMesh = new THREE.Mesh(turretGeometry, tankMaterial);
    turretMesh.position.set(0, 0.25, 0); // Half the height of the turret
    this.turretContainer.add(turretMesh);
    
    // Tank cannon
    const cannonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
    const cannonMaterial = new THREE.MeshStandardMaterial({
      color: 0x008800,
      wireframe: false
    });
    const cannonMesh = new THREE.Mesh(cannonGeometry, cannonMaterial);
    
    // Position and rotate the cannon
    cannonMesh.position.set(0, 0, 1.0);
    cannonMesh.rotation.x = Math.PI / 2;
    this.turretContainer.add(cannonMesh);
    
    // Set initial position
    this.mesh.position.copy(position);
    
    // Initialize properties
    this.speed = 15;  // Reduced for better control
    this.turnSpeed = 2;  // Reduced for better control
    this.turretRotationSpeed = 2; // Speed of turret rotation
    this.canFire = true;
    this.lastFired = 0;
  }

  initPhysics(world: RAPIER.World) {
    // Create physics body for the tank using our new PhysicsBody class
    this.physics = createVehicleBody(
      { width: 2, height: 0.75, depth: 3 },
      500,
      world,
      this.mesh
    );
    
    // Set initial physics body position to match mesh
    const position = this.mesh.position;
    this.physics.setPosition(position);
  }

  move(direction: number): void {
    if (!this.physics) return;
    
    // Get current rotation to determine forward direction
    const rotation = this.physics.getRotation();
    
    // Calculate forward vector based on current rotation
    const forward = new THREE.Vector3(0, 0, direction);
    forward.applyQuaternion(rotation);
    
    // Apply a constant force for smoother movement
    const force = forward.multiplyScalar(this.speed * 12);
    this.physics.applyForce(force);
    
    // Apply stronger damping when not moving for quicker stops
    if (direction === 0) {
      this.physics.applyLinearDamping(0.7);
    }
  }

  turn(direction: number): void {
    if (!this.physics) return;
    
    // Use the simulateTreads method from our PhysicsBody class
    this.physics.simulateTreads(direction, this.turnSpeed);
  }

  rotateTurret(direction: number): void {
    // Rotate the turret container
    this.turretContainer.rotation.y += direction * this.turretRotationSpeed * 0.02;
  }

  fire(): void {
    if (!this.canFire) return;
    
    console.log("Fire method called!"); // Debug logging
    
    // Use turret rotation for projectile direction instead of tank body rotation
    const cannonTip = new THREE.Vector3(0, 0, 2);
    cannonTip.applyQuaternion(this.turretContainer.getWorldQuaternion(new THREE.Quaternion()));
    cannonTip.add(this.mesh.position);
    
    // Calculate the cannon tip position in world space
    const cannonWorldPosition = new THREE.Vector3();
    cannonTip.getWorldPosition(cannonWorldPosition);
    
    // Calculate a position at the tip of the cannon
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.mesh.quaternion);
    forward.normalize();
    
    // Position the projectile at the tip of the cannon (a bit in front)
    const cannonTipPosition = cannonWorldPosition.clone().add(forward.clone().multiplyScalar(1.5));
    
    console.log("Cannon tip position:", cannonTipPosition);
    
    // Create projectile mesh with bright, glowing material
    const projectileGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const projectileMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffff00, 
      wireframe: false,
      emissive: 0xffff00,
      emissiveIntensity: 0.8
    });
    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectileMesh.position.copy(cannonTipPosition);
    
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
          .setTranslation(cannonTipPosition.x, cannonTipPosition.y, cannonTipPosition.z)
          .setLinearDamping(0.0) // No drag on projectiles
          .setAngularDamping(0.0); // No angular drag
        
        const projectileBody = world.createRigidBody(rigidBodyDesc);
        
        // Create collider (slightly smaller than visual size for better gameplay)
        const colliderDesc = RAPIER.ColliderDesc.ball(0.4);
        colliderDesc.setDensity(1.0);
        colliderDesc.setRestitution(0.5);
        colliderDesc.setFriction(0.0);
        
        world.createCollider(colliderDesc, projectileBody);
        
        // Create a physics body for the projectile
        const projectilePhysics = new PhysicsBody(projectileBody, projectileMesh);
        
        // Apply velocity in the direction the tank is facing
        const projectileSpeed = 100; // Increased speed
        forward.multiplyScalar(projectileSpeed); 
        
        // Add tank's velocity to projectile velocity
        if (this.physics) {
          const tankVel = this.physics.getVelocity();
          forward.add(tankVel);
        }
        
        // Set linear velocity of projectile
        projectilePhysics.setVelocity(forward);
        
        // Add to scene
        scene.add(projectileMesh);
        window.physicsWorld.addBody(projectilePhysics);
        
        console.log("Projectile created at position:", cannonTipPosition, "with velocity:", forward);
        
        // Add projectile to game objects
        if (window.gameState) {
          const projectile: GameObject = {
            mesh: projectileMesh,
            physics: projectilePhysics,
            update: () => {} // Physics world handles updates
          };
          
          window.gameState.projectiles.push(projectile);
          
          // Destroy projectile after 5 seconds
          setTimeout(() => {
            try {
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