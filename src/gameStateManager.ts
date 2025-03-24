import * as THREE from 'three';
import { IGameState } from './gameStates';
import { MarqueeState } from './marqueeState';
import { PlayState } from './playState';

export class GameStateManager {
    private currentState: IGameState;

    constructor() {
        this.currentState = new MarqueeState(this);
        this.currentState.onEnter();
    }

    switchToPlay(): void {
        if (this.currentState) {
            this.currentState.onExit();
        }
        this.currentState = new PlayState(this);
        this.currentState.onEnter();
    }

    switchToMarquee(): void {
        if (this.currentState) {
            this.currentState.onExit();
        }
        this.currentState = new MarqueeState(this);
        this.currentState.onEnter();
    }

    getCurrentState(): IGameState {
        return this.currentState;
    }

    update(deltaTime: number): void {
        this.currentState.update(deltaTime);
    }

    render(renderer: THREE.WebGLRenderer): void {
        this.currentState.render(renderer);
    }
}