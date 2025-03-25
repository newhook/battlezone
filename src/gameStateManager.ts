import * as THREE from 'three';
import { IGameState } from './gameStates';
import { MarqueeState } from './marqueeState';
import { PlayState } from './playState';
import { SoundManager } from './soundManager';
import { PreMarqueeState } from './gameStates';
import { PreMarquee } from './preMarquee';

export class GameStateManager {
    private currentState: IGameState;
    public soundManager: SoundManager;

    constructor() {
        this.soundManager = new SoundManager();
        this.currentState = new PreMarquee(this); // Set PreMarquee as the initial state
        this.currentState.onEnter();
    }

    switchToPreMarquee(): void {
        if (this.currentState) {
            this.currentState.onExit();
        }
        this.currentState = new PreMarquee(this);
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