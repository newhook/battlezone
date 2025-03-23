import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { GameObject } from './types';

export class Projectile implements GameObject {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
  
  constructor(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    initialVelocity: THREE.Vector3,
    scene: THREE.Scene,
    physicsWorld: { world: RAPIER.World }
  ) {
    // Create projectile mesh with bright, glowing material
    const projectileGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const projectileMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffff00, 
      wireframe: false,
      emissive: 0xffff00,
      emissiveIntensity: 0.8
    });
    this.mesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    this.mesh.position.copy(position);
    
    // Add a point light to the projectile to make it glow
    const projectileLight = new THREE.PointLight(0xffff00, 1, 10);
    projectileLight.position.set(0, 0, 0);
    this.mesh.add(projectileLight);

    // Create projectile physics body
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.0) // No drag on projectiles
      .setAngularDamping(0.0); // No angular drag
    
    this.body = physicsWorld.world.createRigidBody(rigidBodyDesc);
    
    // Create collider (slightly smaller than visual size for better gameplay)
    const colliderDesc = RAPIER.ColliderDesc.ball(0.4)
      .setDensity(1.0)
      .setRestitution(0.5)
      .setFriction(0.0);
    
    physicsWorld.world.createCollider(colliderDesc, this.body);
    
    // Link mesh to physics body
    this.body.userData = { mesh: this.mesh };
    
    // Apply velocity in the direction of the turret
    const projectileSpeed = 100; // Fast projectile speed
    const velocity = direction.multiplyScalar(projectileSpeed).add(initialVelocity);
    this.body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    this.body.wakeUp();
    
    // Add to scene
    scene.add(this.mesh);
    
    // Set up auto-destruction after 5 seconds
    setTimeout(() => this.destroy(scene), 5000);
  }

  destroy(scene: THREE.Scene): void {
    try {
      if (scene && this.mesh.parent) {
        scene.remove(this.mesh);
      }
      
      if (window.physicsWorld) {
        window.physicsWorld.removeBody(this);
      }
      
      if (window.gameState) {
        const index = window.gameState.projectiles.indexOf(this);
        if (index !== -1) {
          window.gameState.projectiles.splice(index, 1);
        }
      }
    } catch (e) {
      console.error("Error cleaning up projectile:", e);
    }
  }

  update(): void {
    // Physics world handles updates
  }
}