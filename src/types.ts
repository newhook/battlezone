import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';

export interface GameObject {
  mesh: THREE.Mesh;
  body?: RAPIER.RigidBody;
  update?: () => void;
}

export interface Vehicle extends GameObject {
  speed: number;
  turnSpeed: number;
  move: (direction: number) => void;
  turn: (direction: number) => void;
  fire: () => void;
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
  down: boolean;
  wireframeToggle: boolean;
}

export interface PhysicsWorld {
  world: RAPIER.World;
  bodies: RAPIER.RigidBody[];
  update: (deltaTime: number) => void;
  addBody: (body: RAPIER.RigidBody) => void;
  removeBody: (body: RAPIER.RigidBody) => void;
}
