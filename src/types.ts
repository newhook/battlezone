import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d';
import { PhysicsBody } from './PhysicsBody';

// Define interfaces for various game components

// Interface for the physics world
export interface PhysicsWorld {
  world: RAPIER.World;
  bodies: PhysicsBody[];
  update(deltaTime: number): void;
  addBody(physicsBody: PhysicsBody): void;
  removeBody(physicsBody: PhysicsBody): void;
}

// Base game object interface
export interface GameObject {
  mesh: THREE.Mesh | THREE.Object3D;
  physics?: PhysicsBody;
  update?(): void;
}

// Extended interface for vehicles (tanks)
export interface Vehicle extends GameObject {
  speed: number;
  turnSpeed: number;
  move(direction: number): void;
  turn(direction: number): void;
  fire?(): void;
  canFire?: boolean;
  lastFired?: number;
  initPhysics(world: RAPIER.World): void;
}

// Input state for controlling the player
export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  turretLeft: boolean;
  turretRight: boolean;
  fire: boolean;
}

// Game state for storing all game objects and state
export interface GameState {
  player: Vehicle;
  enemies: Vehicle[];
  terrain: GameObject[];
  projectiles: GameObject[];
  score: number;
  gameOver: boolean;
}

// Extend the Window interface to include our global state
declare global {
  interface Window {
    gameState?: GameState;
    physicsWorld?: PhysicsWorld;
  }
}
