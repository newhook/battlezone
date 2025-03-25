import { Vehicle } from './types';

export class Radar {
    private element!: HTMLElement; // Using definite assignment assertion
    private maxDistance: number = 200;
    private radarRadius: number = 100;

    constructor() {
        // Check if radar already exists before creating a new one
        const existingRadar = document.getElementById('radar');
        if (existingRadar) {
            this.element = existingRadar as HTMLElement;
        } else {
            this.setupRadarElement();
        }
        this.setupStyles();
    }

    private setupRadarElement() {
        // Create radar container
        this.element = document.createElement('div');
        this.element.id = 'radar';

        // Add player indicator
        const playerIndicator = document.createElement('div');
        playerIndicator.className = 'player-indicator';
        this.element.appendChild(playerIndicator);

        // Add sweep line
        const sweepLine = document.createElement('div');
        sweepLine.className = 'radar-sweep';
        this.element.appendChild(sweepLine);

        // Add to document
        document.body.appendChild(this.element);
    }

    private setupStyles() {
        // Create style element if it doesn't exist
        let style = document.getElementById('radar-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'radar-styles';
            document.head.appendChild(style);
        }

        // Add radar styles
        style.textContent = `
            #radar {
                position: absolute;
                bottom: 20px;
                right: 20px;
                width: 200px;
                height: 200px;
                background-color: rgba(0, 0, 0, 0.5);
                border: 2px solid #00ff00;
                border-radius: 50%;
                overflow: hidden;
            }
            .radar-sweep {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 50%;
                height: 2px;
                background-color: #00ff00;
                transform-origin: left center;
                animation: radar-sweep 4s infinite linear;
            }
            .radar-blip {
                position: absolute;
                width: 4px;
                height: 4px;
                background-color: #ff0000;
                border-radius: 50%;
                transform: translate(-50%, -50%);
            }
            .player-indicator {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 6px;
                height: 6px;
                background-color: #00ff00;
                border-radius: 50%;
                transform: translate(-50%, -50%);
            }
            @keyframes radar-sweep {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }
        `;
    }

    hide() : void {
        this.element.style.display = 'none';

        // Remove all enemy blips from the radar
        const blips = this.element.getElementsByClassName('radar-blip');
        while (blips.length > 0) {
            blips[0].remove();
        }
    }

    show() : void {
        this.element.style.display = 'block';
    }

    update(player: Vehicle, enemies: Vehicle[]) {
        // Remove old blips
        const oldBlips = this.element.getElementsByClassName('radar-blip');
        while (oldBlips.length > 0) {
            oldBlips[0].remove();
        }

        // Get player position and rotation
        const playerPos = player.mesh.position;
        const playerRotation = player.mesh.rotation.y;

        // Add blips for each enemy
        enemies.forEach(enemy => {
            // Calculate relative position
            const relativeX = enemy.mesh.position.x - playerPos.x;
            const relativeZ = enemy.mesh.position.z - playerPos.z;

            // Convert to radar coordinates (rotate based on player orientation)
            const distance = Math.sqrt(relativeX * relativeX + relativeZ * relativeZ);
            const angle = Math.atan2(relativeZ, relativeX) - playerRotation;
            
            // Scale distance to radar size
            const scaledDistance = Math.min(distance, this.maxDistance) * (this.radarRadius / this.maxDistance);
            
            // Calculate radar position
            const radarX = Math.cos(angle) * scaledDistance + this.radarRadius;
            const radarY = Math.sin(angle) * scaledDistance + this.radarRadius;

            // Create blip element
            const blip = document.createElement('div');
            blip.className = 'radar-blip';
            blip.style.left = `${radarX}px`;
            blip.style.top = `${radarY}px`;
            
            // Add distance-based opacity
            const opacity = 1 - (distance / this.maxDistance);
            blip.style.opacity = Math.max(0.3, opacity).toString();
            
            this.element.appendChild(blip);
        });
    }
}