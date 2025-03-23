import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';

export interface GameObject {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
  update?: () => void;
}

export interface Vehicle extends GameObject {
  speed: number;
  turnSpeed: number;
  move: (direction: number) => void;
  turn: (direction: number) => void;
  fire: () => void;
  rotateTurret: (direction: number) => void;
  canFire: boolean;
  lastFired: number;
}

export interface GameState {
  player: Vehicle;
  enemies: Vehicle[];
  terrain: GameObject[];
  projectiles: GameObject[];
  score: number;
  gameOver: boolean;
}

// Global declarations for access across modules
declare global {
  interface Window {
    gameState: GameState | undefined;
    physicsWorld: PhysicsWorld;
  }
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  toggleFlyCamera: boolean;
  wireframeToggle: boolean;
  turretLeft: boolean;  // For Q key
  turretRight: boolean; // For E key
}

export interface PhysicsObject {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
}

export interface PhysicsWorld {
  world: RAPIER.World;
  bodies: PhysicsObject[];
  update: (deltaTime: number) => void;
  addBody: (body: PhysicsObject) => void;
  removeBody: (body: PhysicsObject) => void;
}
