import * as THREE from 'three';
import { IGameState} from './gameStates';
import { MarqueeState} from './marqueeState';
import { PlayState } from './playState';
import { GameConfig } from './config';

export class GameStateManager {
    private currentState: IGameState;
    private marqueeState: MarqueeState;
    private playState: PlayState;

    constructor(scene: THREE.Scene, config: GameConfig) {
        this.marqueeState = new MarqueeState(this, scene);
        this.playState = new PlayState(this, scene, config);
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

    render(renderer: THREE.WebGLRenderer): void {
        this.currentState.render(renderer);
    }
}