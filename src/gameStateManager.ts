import { IGameState, MarqueeState, PlayState } from './gameStates';
import * as THREE from 'three';
import { GameConfig } from './config';

export class GameStateManager {
    private currentState: IGameState;
    private marqueeState: MarqueeState;
    private playState: PlayState;

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, config: GameConfig) {
        this.marqueeState = new MarqueeState(scene, camera);
        this.playState = new PlayState(scene, camera, config);
        this.currentState = this.marqueeState;
        this.currentState.onEnter();
    }

    switchToPlay(): void {
        this.currentState.onExit();
        this.currentState = this.playState;
        this.currentState.onEnter();
    }

    switchToMarquee(): void {
        this.currentState.onExit();
        this.currentState = this.marqueeState;
        this.currentState.onEnter();
    }

    getCurrentState(): IGameState {
        return this.currentState;
    }

    getPlayState(): PlayState {
        return this.playState;
    }

    update(deltaTime: number): void {
        this.currentState.update(deltaTime);
    }
}