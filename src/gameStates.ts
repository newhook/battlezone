import * as THREE from 'three';

export interface IGameState {
    update(deltaTime: number): void;
    onEnter(): void;
    onExit(): void;
    getCamera(): THREE.PerspectiveCamera;
    render(renderer: THREE.WebGLRenderer): void;
}