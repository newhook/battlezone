import * as THREE from 'three';
import { Vehicle } from './types';
import { Tank } from './tank';

export class PlayerTank extends Tank {
  constructor(position: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0)) {
    super(position, 0x00ff00); // Call base class constructor with green color
    
    // Override base speeds for player-specific values
    this.speed = 150;  // Increased from base for faster player movement
    this.turnSpeed = 20;  // Increased from base for faster player turning
  }

  // Static factory method for creating player tank
  static create(position?: THREE.Vector3): Vehicle {
    return new PlayerTank(position);
  }
}