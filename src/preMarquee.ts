import * as THREE from 'three';
import { PreMarqueeState } from './gameStates';
import { GameStateManager } from './gameStateManager';

export class PreMarquee implements PreMarqueeState {
    private gameStateManager: GameStateManager;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;

    constructor(gameStateManager: GameStateManager) {
        this.gameStateManager = gameStateManager;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 1.5, 5);
        this.camera.lookAt(0, 1.5, 0);

        // Add a welcome message
        const welcomeElement = document.createElement('div');
        welcomeElement.id = 'welcome';
        welcomeElement.style.position = 'absolute';
        welcomeElement.style.top = '50%';
        welcomeElement.style.left = '50%';
        welcomeElement.style.transform = 'translate(-50%, -50%)';
        welcomeElement.style.color = '#00ff00';
        welcomeElement.style.fontFamily = 'monospace';
        welcomeElement.style.fontSize = '24px';
        welcomeElement.style.textAlign = 'center';
        welcomeElement.innerHTML = 'Welcome to Battlezone!<br>Click to Start';
        document.body.appendChild(welcomeElement);

        // Add click listener to transition to marquee state
        document.addEventListener('click', this.startMarquee, { once: true });
    }

    private startMarquee = () => {
        const welcomeElement = document.getElementById('welcome');
        if (welcomeElement) {
            welcomeElement.remove();
        }
        this.gameStateManager.switchToMarquee();
    };

    update(deltaTime: number): void {
        // No updates needed for the pre-marquee state
    }

    onEnter(): void {
        console.log('Entering PreMarquee State');
    }

    onExit(): void {
        console.log('Exiting PreMarquee State');
    }

    render(renderer: THREE.WebGLRenderer): void {
        renderer.render(this.scene, this.camera);
    }
}