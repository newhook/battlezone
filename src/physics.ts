// Use dynamic import pattern
import { PhysicsWorld as PhysicsWorldType } from './types';
import RAPIER from '@dimforge/rapier3d';
import * as THREE from 'three';

// Define the type for userData to include mesh
interface PhysicsUserData {
  mesh: THREE.Mesh;
}

export class PhysicsWorld implements PhysicsWorldType {
  world: RAPIER.World;
  bodies: RAPIER.RigidBody[];

  constructor() {
    // Create a physics world
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new RAPIER.World(gravity);
    this.bodies = [];

    // Create ground plane
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(500.0, 0.1, 500.0)
      .setTranslation(0, -0.1, 0);
    this.world.createCollider(groundColliderDesc);
  }

  update(_deltaTime: number): void {
    // Step the physics simulation
    this.world.step();
    
    // Check for invalid bodies before updating
    const validBodies = this.bodies.filter(body => {
        // This will throw an error if the body has been removed but is still in our array
        body.translation();
        return true;
    });
    
    // Replace our bodies array with only valid bodies
    if (validBodies.length !== this.bodies.length) {
      this.bodies.length = 0;
      this.bodies.push(...validBodies);
    }
    
    // Update all physics objects
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      const userData = body.userData as PhysicsUserData | undefined;
      if (userData?.mesh) {
        try {
          const position = body.translation();
          const rotation = body.rotation();
          
          // Update mesh position and rotation from physics body
          userData.mesh.position.set(position.x, position.y, position.z);
          userData.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        } catch (e) {
          console.error("Error updating body:", e);
        }
      }
    }
  }

  addBody(body: RAPIER.RigidBody): void {
    this.bodies.push(body);
  }

  removeBody(body: RAPIER.RigidBody): void {
    const index = this.bodies.indexOf(body);
    if (index !== -1) {
      this.bodies.splice(index, 1);
      this.world.removeRigidBody(body);
    }
  }
}

export function createVehicleBody(
  size: { width: number, height: number, depth: number }, 
  mass: number,
  world: RAPIER.World
): RAPIER.RigidBody {
  // Create rigid body description
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0, size.height / 2, 0)
    .setLinearDamping(0.1)  // Reduced from 0.5
    .setAngularDamping(0.2); // Reduced from 0.5
  
  const body = world.createRigidBody(rigidBodyDesc);
  
  // Create collider
  const colliderDesc = RAPIER.ColliderDesc.cuboid(
    size.width / 2, 
    size.height / 2, 
    size.depth / 2
  );
  
  // Set mass properties
  colliderDesc.setDensity(mass / (size.width * size.height * size.depth));
  colliderDesc.setFriction(0.7);    // Increased from 0.5 for better grip
  colliderDesc.setRestitution(0.1); // Reduced from 0.2 for less bouncing
  
  // Attach collider to body
  world.createCollider(colliderDesc, body);
  
  return body;
}

export function createObstacleBody(
  size: { width: number, height: number, depth: number }, 
  position: { x: number, y: number, z: number },
  world: RAPIER.World,
  mass: number = 0
): RAPIER.RigidBody {
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
  
  return body;
}