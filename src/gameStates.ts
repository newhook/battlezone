import * as THREE from 'three';

export interface IGameState {
    update(deltaTime: number): void;
    onEnter(): void;
    onExit(): void;
    render(renderer: THREE.WebGLRenderer): void;
}

export interface PreMarqueeState extends IGameState {
    // Additional methods or properties specific to the pre-marquee state can be added here
}