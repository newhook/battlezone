import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';

/**
 * PhysicsBody class to encapsulate physics behavior for game objects
 * This provides a clean, consistent interface for working with physics objects
 */
export class PhysicsBody {
  body: RAPIER.RigidBody;
  mesh: THREE.Object3D;

  constructor(body: RAPIER.RigidBody, mesh: THREE.Object3D) {
    this.body = body;
    this.mesh = mesh;
  }

  /**
   * Get the current position of the physics body
   */
  getPosition(): THREE.Vector3 {
    const position = this.body.translation();
    return new THREE.Vector3(position.x, position.y, position.z);
  }

  /**
   * Set the position of the physics body
   */
  setPosition(position: THREE.Vector3): void {
    this.body.setTranslation(
      { x: position.x, y: position.y, z: position.z },
      true
    );
  }

  /**
   * Get the current rotation of the physics body as a quaternion
   */
  getRotation(): THREE.Quaternion {
    const rotation = this.body.rotation();
    return new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  /**
   * Set the rotation of the physics body
   */
  setRotation(rotation: THREE.Quaternion): void {
    this.body.setRotation(
      { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
      true
    );
  }

  /**
   * Get the current linear velocity of the physics body
   */
  getVelocity(): THREE.Vector3 {
    const velocity = this.body.linvel();
    return new THREE.Vector3(velocity.x, velocity.y, velocity.z);
  }

  /**
   * Set the linear velocity of the physics body
   */
  setVelocity(velocity: THREE.Vector3): void {
    this.body.setLinvel(
      { x: velocity.x, y: velocity.y, z: velocity.z },
      true
    );
  }

  /**
   * Apply a force to the physics body
   * @param force The force vector to apply (in world space)
   * @param point Optional point to apply the force at (in world space)
   */
  applyForce(force: THREE.Vector3, point?: THREE.Vector3): void {
    const forceVec = { x: force.x, y: force.y, z: force.z };
    
    if (point) {
      const pointVec = { x: point.x, y: point.y, z: point.z };
      this.body.addForceAtPoint(forceVec, pointVec, true);
    } else {
      this.body.addForce(forceVec, true);
    }
  }

  /**
   * Apply an impulse to the physics body
   * @param impulse The impulse vector to apply (in world space)
   * @param point Optional point to apply the impulse at (in world space)
   */
  applyImpulse(impulse: THREE.Vector3, point?: THREE.Vector3): void {
    const impulseVec = { x: impulse.x, y: impulse.y, z: impulse.z };
    
    if (point) {
      const pointVec = { x: point.x, y: point.y, z: point.z };
      this.body.applyImpulseAtPoint(impulseVec, pointVec, true);
    } else {
      this.body.applyImpulse(impulseVec, true);
    }
  }

  /**
   * Apply torque to the physics body
   * @param torque The torque vector to apply
   */
  applyTorque(torque: THREE.Vector3): void {
    this.body.addTorque(
      { x: torque.x, y: torque.y, z: torque.z },
      true
    );
  }

  /**
   * Apply angular impulse to the physics body
   * @param angularImpulse The angular impulse vector to apply
   */
  applyAngularImpulse(angularImpulse: THREE.Vector3): void {
    this.body.applyTorqueImpulse(
      { x: angularImpulse.x, y: angularImpulse.y, z: angularImpulse.z },
      true
    );
  }

  /**
   * Apply linear damping to slow down the body
   * @param damping Damping factor (0-1)
   */
  applyLinearDamping(damping: number): void {
    // Get current velocity
    const velocity = this.getVelocity();
    
    // Apply damping
    velocity.multiplyScalar(1 - damping);
    
    // Set new velocity
    this.setVelocity(velocity);
  }
  
  /**
   * Simulate tank treads by applying opposing forces to the sides of the body
   * @param direction Direction of turning (-1 = left, 1 = right)
   * @param strength Strength of the turn
   */
  simulateTreads(direction: number, strength: number): void {
    // Only proceed if it's a valid direction
    if (direction === 0) return;
    
    // Get the tank's up direction (Y-axis)
    const upVector = new THREE.Vector3(0, 1, 0);
    
    // Get the tank's forward direction (Z-axis in local space)
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.getRotation());
    
    // Calculate the right vector (cross product of up and forward)
    const right = new THREE.Vector3().crossVectors(forward, upVector).normalize();
    
    // Calculate the torque needed to turn the tank
    // The force is perpendicular to the tank's forward direction
    const torque = new THREE.Vector3(0, direction * strength * 10, 0);
    
    // Apply the torque to the tank
    this.applyTorque(torque);
    
    // Apply additional forces to simulate treads
    // For more realistic behavior, we apply opposing forces on each side
    
    // Calculate offset points for the left and right sides of the tank
    const leftTreadPoint = new THREE.Vector3().copy(right).multiplyScalar(-1);
    const rightTreadPoint = new THREE.Vector3().copy(right);
    
    // Adjust by the height of the tank to apply at ground level
    leftTreadPoint.y -= 0.4;  // Slightly below center of mass
    rightTreadPoint.y -= 0.4;
    
    // Calculate force magnitude and direction for each tread
    // When turning right (direction > 0), left tread pushes forward, right tread pushes backward
    const leftTreadForce = new THREE.Vector3().copy(forward).multiplyScalar(direction * strength * 5);
    const rightTreadForce = new THREE.Vector3().copy(forward).multiplyScalar(-direction * strength * 5);
    
    // Apply the forces
    this.applyForce(leftTreadForce, leftTreadPoint);
    this.applyForce(rightTreadForce, rightTreadPoint);
  }
}