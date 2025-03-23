import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { GameObject } from './types';
import { createObstacleBody } from './physics';

// Create ground plane
export function createGround(size: number): GameObject {
  const groundGeometry = new THREE.PlaneGeometry(size, size);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
    metalness: 0.2,
    wireframe: false,
    side: THREE.DoubleSide
  });
  
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  groundMesh.position.y = 0;
  groundMesh.receiveShadow = true;
  
  // Add a grid for visual reference
  const gridHelper = new THREE.GridHelper(size, size / 10);
  gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
  groundMesh.add(gridHelper);
  
  // Return as a game object (no physics needed as we have a static ground collider)
  return { mesh: groundMesh };
}

// Create terrain objects
export function createTerrain(positions: THREE.Vector3[], world: RAPIER.World): GameObject[] {
  const terrain: GameObject[] = [];
  
  positions.forEach(position => {
    // Randomize size
    const width = 2 + Math.random() * 3; // 2-5 units wide
    const height = 3 + Math.random() * 5; // 3-8 units tall
    const depth = 2 + Math.random() * 3; // 2-5 units deep
    
    // Create mesh
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8866ff,
      roughness: 0.7,
      metalness: 0.2,
      wireframe: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position mesh (y position adjusted to sit on ground)
    mesh.position.set(position.x, height / 2, position.z);
    
    // Create physics body
    const physics = createObstacleBody(
      { width, height, depth },
      { x: position.x, y: height / 2, z: position.z },
      world,
      mesh
    );
    
    // Add to terrain array
    terrain.push({ mesh, physics });
  });
  
  return terrain;
}

// Create boundary walls
export function createBoundaryWalls(size: number, world: RAPIER.World): GameObject[] {
  const wallHeight = 5;
  const wallThickness = 2;
  const halfSize = size / 2;
  
  // Wall positions and dimensions
  const wallsConfig = [
    // North wall
    {
      position: new THREE.Vector3(0, wallHeight / 2, -halfSize),
      size: { width: size, height: wallHeight, depth: wallThickness }
    },
    // South wall
    {
      position: new THREE.Vector3(0, wallHeight / 2, halfSize),
      size: { width: size, height: wallHeight, depth: wallThickness }
    },
    // East wall
    {
      position: new THREE.Vector3(halfSize, wallHeight / 2, 0),
      size: { width: wallThickness, height: wallHeight, depth: size }
    },
    // West wall
    {
      position: new THREE.Vector3(-halfSize, wallHeight / 2, 0),
      size: { width: wallThickness, height: wallHeight, depth: size }
    }
  ];
  
  const walls: GameObject[] = [];
  
  // Create each wall
  wallsConfig.forEach(config => {
    const { position, size } = config;
    
    // Create mesh
    const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0x66aaff,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: false,
      transparent: true,
      opacity: 0.6
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Set position
    mesh.position.copy(position);
    
    // Create physics body
    const physics = createObstacleBody(
      size,
      { x: position.x, y: position.y, z: position.z },
      world,
      mesh
    );
    
    // Add to walls array
    walls.push({ mesh, physics });
  });
  
  return walls;
}

// Create a checkpoint object
export function createCheckpoint(
  position: THREE.Vector3, 
  world: RAPIER.World,
  isActive: boolean = false
): GameObject {
  // Checkpoint dimensions
  const width = 5;
  const height = 0.5;
  const depth = 5;
  
  // Create mesh
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: isActive ? 0x00ff00 : 0xff0000,
    emissive: isActive ? 0x00ff00 : 0xff0000,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.7,
    wireframe: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  
  // Set position
  mesh.position.copy(position);
  
  // Create physics body (no collision, just a trigger)
  const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(position.x, position.y, position.z);
  
  const body = world.createRigidBody(rigidBodyDesc);
  
  // Create sensor collider
  const colliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2)
    .setSensor(true); // This is a sensor/trigger
  
  const collider = world.createCollider(colliderDesc, body);
  
  // Store additional data
  mesh.userData.isCheckpoint = true;
  mesh.userData.isActive = isActive;
  
  // Create the physics body using our helper function
  const physics = createObstacleBody(
    { width, height, depth },
    { x: position.x, y: position.y, z: position.z },
    world,
    mesh,
    0 // Zero mass means static
  );
  
  // Override the collider to be a sensor
  const newCollider = physics.body.collider(0);
  if (newCollider) {
    newCollider.setSensor(true);
  }
  
  // Return the checkpoint object
  return {
    mesh,
    physics,
    update: () => {
      // Make checkpoint rotate slowly
      mesh.rotation.y += 0.01;
      
      // Make it bob up and down slightly
      const offset = Math.sin(Date.now() * 0.002) * 0.2;
      mesh.position.y = position.y + offset;
      
      // Update physics position too
      if (physics) {
        const currentPos = physics.getPosition();
        physics.setPosition(new THREE.Vector3(currentPos.x, position.y + offset, currentPos.z));
      }
    }
  };
}
