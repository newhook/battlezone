import * as THREE from 'three';
import { Tank } from './tank';
import { PlayState } from './playState';

export class PlayerTank extends Tank {
  constructor(playState : PlayState,  position: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0)) {
    super(playState, position, 0x00ff00); // Call base class constructor with green color
    
    // Override base speeds for player-specific values
    this.speed = 125; 
    this.turnSpeed = 1.5;
  }
}