import * as THREE from 'three';
import { setupGame, updateGame } from './game';
import { createInputHandler } from './input';
import { FlyCamera } from './flyCamera';
import { PhysicsWorld } from './physics';
import './style.css';

// Set up the renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// Add canvas to the document
document.body.appendChild(renderer.domElement);

// Create a scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88ccff);

// Add fog for distance fading
scene.fog = new THREE.Fog(0x88ccff, 50, 150);

// Create a camera
const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);

// Position the camera
camera.position.set(0, 12, -15);
camera.lookAt(0, 0, 0);

// Create a fly camera controller
const flyCamera = new FlyCamera(camera);

// Set up lighting
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 15, 10);
directionalLight.castShadow = true;

// Improve shadow map quality
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.bias = -0.001;

// Expand shadow camera frustum for larger scene coverage
const shadowSize = 20;
directionalLight.shadow.camera.left = -shadowSize;
directionalLight.shadow.camera.right = shadowSize;
directionalLight.shadow.camera.top = shadowSize;
directionalLight.shadow.camera.bottom = -shadowSize;

scene.add(directionalLight);

// Add ambient light for better overall illumination
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// Create UI elements
const scoreDisplay = document.createElement('div');
scoreDisplay.style.position = 'absolute';
scoreDisplay.style.top = '10px';
scoreDisplay.style.left = '10px';
scoreDisplay.style.color = 'white';
scoreDisplay.style.fontFamily = '"Press Start 2P", monospace';
scoreDisplay.style.fontSize = '16px';
scoreDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
scoreDisplay.style.padding = '10px';
scoreDisplay.style.borderRadius = '5px';
scoreDisplay.id = 'score';
scoreDisplay.textContent = 'SCORE: 0';
document.body.appendChild(scoreDisplay);

// Set up game state with physics
const { gameState, physicsWorld } = setupGame(scene);

// Create input handler
const input = createInputHandler();

// Handle window resize
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// Run game loop
function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = 1/60; // Fixed time step for physics
  
  // Update game state based on input
  updateGame(gameState, input, physicsWorld, deltaTime);
  
  // Update camera position to follow player
  const player = gameState.player;
  
  // Position the camera relative to the player's position and orientation
  if (player && player.mesh) {
    const playerPosition = player.mesh.position;
    const playerDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(player.mesh.quaternion);
    
    // Position camera behind player (third-person view)
    const cameraOffset = new THREE.Vector3(
      -playerDirection.x * 12,
      8, // Height above player
      -playerDirection.z * 12
    );
    
    // Smoothly move the camera to follow the player
    const cameraTargetPosition = new THREE.Vector3().copy(playerPosition).add(cameraOffset);
    camera.position.lerp(cameraTargetPosition, 0.05);
    
    // Look at player
    const lookAtPosition = new THREE.Vector3().copy(playerPosition).add(new THREE.Vector3(0, 2, 0));
    camera.lookAt(lookAtPosition);
  }
  
  renderer.render(scene, camera);
}

// Start the game loop
animate();