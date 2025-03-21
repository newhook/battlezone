// Use dynamic import pattern
import { PhysicsWorld } from './types';
import RAPIER from '@dimforge/rapier3d';

export function createPhysicsWorld(): PhysicsWorld {
  // Create a physics world
  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  
  const world = new RAPIER.World(gravity);
  
  // List to track all physics bodies
  const bodies: RAPIER.RigidBody[] = [];
  
  // Create ground plane
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(500.0, 0.1, 500.0)
    .setTranslation(0, -0.1, 0);
  world.createCollider(groundColliderDesc);
  
  // Physics world update function
  const update = (deltaTime: number) => {
    // Step the physics simulation
    world.step();
    
    // Check for invalid bodies before updating
    const validBodies = bodies.filter(body => {
      try {
        // This will throw an error if the body has been removed but is still in our array
        body.translation();
        return true;
      } catch (e) {
        console.warn("Found invalid physics body, removing from tracking");
        return false;
      }
    });
    
    // Replace our bodies array with only valid bodies
    if (validBodies.length !== bodies.length) {
      bodies.length = 0;
      bodies.push(...validBodies);
    }
    
    // Update all physics objects
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      if (body.userData && body.userData.mesh) {
        try {
          const position = body.translation();
          const rotation = body.rotation();
          
          // Update mesh position and rotation from physics body
          body.userData.mesh.position.set(position.x, position.y, position.z);
          body.userData.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        } catch (e) {
          console.error("Error updating body:", e);
        }
      }
    }
  };
  
  // Add a body to the physics world
  const addBody = (body: RAPIER.RigidBody) => {
    bodies.push(body);
  };

  // Remove a body from the physics world
  const removeBody = (body: RAPIER.RigidBody) => {
    const index = bodies.indexOf(body);
    if (index !== -1) {
      bodies.splice(index, 1);
      world.removeRigidBody(body);
    }
  };
  
  return { world, bodies, update, addBody, removeBody };
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