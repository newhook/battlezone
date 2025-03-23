import { PhysicsWorld as PhysicsWorldInterface } from './types';
import RAPIER from '@dimforge/rapier3d';
import * as THREE from 'three';
import { PhysicsBody } from './PhysicsBody';

// PhysicsWorld class implementation
export class PhysicsWorld implements PhysicsWorldInterface {
  world: RAPIER.World;
  bodies: PhysicsBody[] = [];

  constructor(gravity = { x: 0.0, y: -9.81, z: 0.0 }) {
    // Create the RAPIER physics world with the specified gravity
    this.world = new RAPIER.World(gravity);
    
    // Create ground plane as a static collider
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(500.0, 0.1, 500.0)
      .setTranslation(0, -0.1, 0);
    this.world.createCollider(groundColliderDesc);
  }

  // Update the physics simulation and sync objects
  update(deltaTime: number): void {
    // Step the physics simulation
    this.world.step();
    
    // Check for invalid bodies before updating
    const validBodies = this.bodies.filter(physicsBody => {
      try {
        // This will throw an error if the body has been removed but is still in our array
        physicsBody.body.translation();
        return true;
      } catch (e) {
        console.warn("Found invalid physics body, removing from tracking");
        return false;
      }
    });
    
    // Replace our bodies array with only valid bodies
    if (validBodies.length !== this.bodies.length) {
      this.bodies.length = 0;
      this.bodies.push(...validBodies);
    }
    
    // Update all physics objects
    for (let i = 0; i < this.bodies.length; i++) {
      const physicsBody = this.bodies[i];
      try {
        const position = physicsBody.getPosition();
        const rotation = physicsBody.getRotation();
        
        // Update mesh position and rotation from physics body
        physicsBody.mesh.position.copy(position);
        physicsBody.mesh.quaternion.copy(rotation);
      } catch (e) {
        console.error("Error updating body:", e);
      }
    }
  }

  // Add a body to the physics world
  addBody(physicsBody: PhysicsBody): void {
    this.bodies.push(physicsBody);
  }

  // Remove a body from the physics world
  removeBody(physicsBody: PhysicsBody): void {
    const index = this.bodies.indexOf(physicsBody);
    if (index !== -1) {
      this.bodies.splice(index, 1);
      this.world.removeRigidBody(physicsBody.body);
    }
  }
}

export function createVehicleBody(
  size: { width: number, height: number, depth: number }, 
  mass: number,
  world: RAPIER.World,
  mesh: THREE.Object3D
): PhysicsBody {
  // Create rigid body description with very high friction for stable movement
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0, size.height / 2, 0)
    .setLinearDamping(4.0)     // Much higher linear damping to reduce sliding
    .setAngularDamping(3.0);   // Much higher angular damping to reduce spinning
  
  const body = world.createRigidBody(rigidBodyDesc);
  
  // Create collider
  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    size.width / 2, 
    size.height / 2, 
    size.depth / 2
  );
  
  // Set mass properties for better tank-like inertia
  const density = mass / (size.width * size.height * size.depth);
  colliderDesc.setDensity(density);
  
  // Very high friction to prevent sliding
  colliderDesc.setFriction(4.0);
  colliderDesc.setRestitution(0.0); // No bounce
  
  // Attach collider to body
  world.createCollider(colliderDesc, body);
  
  // Create PhysicsBody instance
  return new PhysicsBody(body, mesh);
}

export function createObstacleBody(
  size: { width: number, height: number, depth: number }, 
  position: { x: number, y: number, z: number },
  world: RAPIER.World,
  mesh: THREE.Object3D,
  mass: number = 0
): PhysicsBody {
  // Create appropriate rigid body based on mass
  const rigidBodyDesc = mass === 0 
    ? RAPIER.RigidBodyDesc.fixed()
    : RAPIER.RigidBodyDesc.dynamic();
  
  // Set position
  rigidBodyDesc.setTranslation(
    position.x, 
    position.y, // Don't add half height - this is now handled correctly in gameObjects.ts
    position.z
  );
  
  const body = world.createRigidBody(rigidBodyDesc);
  
  // Create collider for this body
  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    size.width / 2, 
    size.height / 2, 
    size.depth / 2
  );
  
  if (mass > 0) {
    colliderDesc.setDensity(mass / (size.width * size.height * size.depth));
  }
  
  // Increase friction and make sure there's no bounce for obstacles
  colliderDesc.setFriction(1.0);
  colliderDesc.setRestitution(0.0);
  
  // Add some contact force events for debugging if needed
  colliderDesc.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS);
  
  // Attach collider to body
  world.createCollider(colliderDesc, body);
  
  // Create PhysicsBody instance
  return new PhysicsBody(body, mesh);
}