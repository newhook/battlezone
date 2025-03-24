import * as THREE from 'three';
import { initScene, updateCamera } from './scene';
import { setupGame, updateGame } from './game';
import { setupInputHandlers } from './input';
import { FlyCamera } from './flyCamera';
import { GameConfig, defaultConfig } from './config';
import { Radar } from './radar';

// Function to initialize the app
let isGameStarted = false;

// Add title screen overlay
function createTitleScreen() {
  const titleScreen = document.createElement('div');
  titleScreen.id = 'title-screen';
  titleScreen.innerHTML = `
    <div class="title">BATTLEZONE</div>
    <div class="press-start">PRESS SPACE TO START</div>
    <div class="credits">MOVEMENT: WASD/ARROWS<br>FIRE: SPACE/MOUSE<br>TURRET: Q/E</div>
  `;
  document.body.appendChild(titleScreen);

  // Add title screen styles
  const style = document.createElement('style');
  style.textContent = `
    #title-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #00ff00;
      font-family: monospace;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
    }
    .title {
      font-size: 48px;
      margin-bottom: 40px;
      text-shadow: 0 0 10px #00ff00;
    }
    .press-start {
      font-size: 24px;
      animation: blink 1s infinite;
    }
    .credits {
      position: absolute;
      bottom: 40px;
      text-align: center;
      font-size: 16px;
      line-height: 1.5;
    }
    @keyframes blink {
      50% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  return titleScreen;
}

// Handle game start
function startGame(titleScreen: HTMLElement) {
  isGameStarted = true;
  titleScreen.style.opacity = '0';
  setTimeout(() => titleScreen.remove(), 1000);
  setMarqueeMode(false);
  
  // Show the instructions element
  const instructions = document.getElementById('instructions');
  if (instructions) {
    instructions.style.display = 'block';
    instructions.style.opacity = '1';
  }

  // Show score and FPS
  const score = document.getElementById('score');
  const fps = document.getElementById('fps');
  if (score) score.style.opacity = '1';
  if (fps) fps.style.opacity = '1';

  // Update game state marquee mode
  if (window.gameState) {
    window.gameState.isMarqueeMode = false;
  }
}

async function init() {
  try {
    console.log('Init function starting');
    const loadingElement = document.getElementById('loading');
    
    // Initialize the scene
    const { scene, camera, renderer, clock } = initScene();
    document.body.appendChild(renderer.domElement);
    
    // Create and show title screen
    const titleScreen = createTitleScreen();
    
    // Hide instructions initially
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'none';
    }
    
    // Setup input handlers
    const input = setupInputHandlers();
    
    // Setup game state with configuration
    const config: GameConfig = {
      ...defaultConfig,
      // You can override default config values here if needed
    };
    const { gameState, physicsWorld } = setupGame(scene, config);
    
    // Initialize fly camera
    const flyCamera = new FlyCamera(camera);
    
    // Initialize radar
    const radar = new Radar();
    
    // Fade out instructions after 5 seconds
    setTimeout(() => {
      const instructions = document.getElementById('instructions');
      if (instructions) {
        instructions.style.opacity = '0';
      }
    }, 5000);
    
    // Previous toggle state to detect changes
    let prevToggleState = input.toggleFlyCamera;
    
    // Hide the loading element
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    // FPS counter variables
    let frameCount = 0;
    let lastTime = performance.now();
    const fpsElement = document.getElementById('fps');
    
    // Update FPS counter
    function updateFPS() {
      frameCount++;
      
      const currentTime = performance.now();
      const elapsedTime = currentTime - lastTime;
      
      // Update FPS display once per second
      if (elapsedTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsedTime);
        if (fpsElement) {
          fpsElement.textContent = `FPS: ${fps}`;
        }
        
        // Reset values
        frameCount = 0;
        lastTime = currentTime;
      }
    }
    
    // Handle wireframe toggle
    let prevWireframeState = input.wireframeToggle;
    
    function toggleWireframeMode(scene: THREE.Scene, isWireframe: boolean) {
      // Create a notification about wireframe mode
      const wireframeNotification = document.createElement('div');
      wireframeNotification.style.position = 'absolute';
      wireframeNotification.style.top = '140px';
      wireframeNotification.style.left = '10px';
      wireframeNotification.style.color = '#00ff00';
      wireframeNotification.style.fontFamily = 'monospace';
      wireframeNotification.style.fontSize = '16px';
      wireframeNotification.style.padding = '5px';
      wireframeNotification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      wireframeNotification.style.border = '1px solid #00ff00';
      wireframeNotification.style.transition = 'opacity 0.5s ease-in-out';
      wireframeNotification.style.opacity = '1';
      wireframeNotification.textContent = isWireframe ? 'WIREFRAME MODE: ON' : 'WIREFRAME MODE: OFF';
      
      document.body.appendChild(wireframeNotification);
      
      // Fade out after 2 seconds
      setTimeout(() => {
        wireframeNotification.style.opacity = '0';
        // Remove from DOM after fade out
        setTimeout(() => {
          document.body.removeChild(wireframeNotification);
        }, 500);
      }, 2000);
      
      // Process the scene to toggle wireframe for all materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          // Handle array of materials
          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              if (material instanceof THREE.MeshStandardMaterial || 
                  material instanceof THREE.MeshBasicMaterial ||
                  material instanceof THREE.MeshPhongMaterial) {
                material.wireframe = isWireframe;
              }
            });
          } 
          // Handle single material
          else if (object.material instanceof THREE.MeshStandardMaterial || 
                   object.material instanceof THREE.MeshBasicMaterial ||
                   object.material instanceof THREE.MeshPhongMaterial) {
            object.material.wireframe = isWireframe;
          }
        }
      });
    }
    
    // Handle space key for game start
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space' && !isGameStarted) {
        startGame(titleScreen);
      }
    });
    
    // Set up animation loop
    function animate() {
      requestAnimationFrame(animate);
      
      // Update FPS counter
      updateFPS();
      
      // Get elapsed time since last frame
      const deltaTime = clock.getDelta();
      const currentTime = clock.getElapsedTime() * 1000; // Convert to milliseconds
      
      // Update radar with current game state
      radar.update(gameState.player, gameState.enemies);
      
      // Check if the fly camera toggle has changed
      if (input.toggleFlyCamera !== prevToggleState) {
        // If we're going from fly mode to tank mode, reset the camera position
        if (flyCamera.enabled) {
          flyCamera.resetToTankCamera();
        }
        
        // Toggle the camera mode
        flyCamera.toggle();
        prevToggleState = input.toggleFlyCamera;
        
        // Update camera mode display
        const cameraMode = document.getElementById('camera-mode');
        if (cameraMode) {
          cameraMode.textContent = flyCamera.enabled ? 'CAMERA: FLY MODE' : 'CAMERA: TANK MODE';
          cameraMode.style.opacity = '1';
          // Fade out after 2 seconds
          setTimeout(() => {
            cameraMode.style.opacity = '0';
          }, 2000);
        }
      }
      
      // Check if wireframe toggle has been pressed
      if (input.wireframeToggle !== prevWireframeState) {
        toggleWireframeMode(scene, input.wireframeToggle);
        prevWireframeState = input.wireframeToggle;
      }
      
      // Update game logic
      updateGame(gameState, input, physicsWorld, deltaTime);
      
      // Update camera based on mode
      if (!isGameStarted) {
        updateMarqueeCamera(camera, currentTime);
      } else if (flyCamera.enabled) {
        flyCamera.update(input, deltaTime);
      } else {
        updateCamera(camera, gameState.player);
      }
      
      // Render the scene
      renderer.render(scene, camera);
      
      // Render orientation guide if it exists
      if (scene.userData.orientationGuide && isGameStarted) {
        const { scene: guideScene, camera: guideCamera } = scene.userData.orientationGuide;
        
        // Update orientation guide to match main camera's rotation
        // This keeps the guide aligned with your current view direction
        const guideHelper = guideScene.children[0] as THREE.AxesHelper;
        if (guideHelper) {
          guideHelper.quaternion.copy(camera.quaternion);
        }
        
        // Set up the viewport for the guide in the bottom-right corner
        const guideSize = Math.min(150, window.innerWidth / 5);
        renderer.setViewport(
          window.innerWidth - guideSize - 10, 
          window.innerHeight - guideSize - 10, 
          guideSize, 
          guideSize
        );
        renderer.setScissor(
          window.innerWidth - guideSize - 10, 
          window.innerHeight - guideSize - 10, 
          guideSize, 
          guideSize
        );
        renderer.setScissorTest(true);
        
        // Clear depth buffer to ensure guide renders on top
        renderer.clearDepth();
        
        // Render the guide
        renderer.render(guideScene, guideCamera);
        
        // Reset viewport and scissor test
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
        renderer.setScissorTest(false);
      }
    }
    
    // Start the animation loop
    animate();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Add camera mode indicator to the UI
    const cameraMode = document.createElement('div');
    cameraMode.id = 'camera-mode';
    cameraMode.textContent = 'CAMERA: TANK MODE';
    cameraMode.style.position = 'absolute';
    cameraMode.style.top = '60px';
    cameraMode.style.left = '10px';
    cameraMode.style.color = '#00ff00';
    cameraMode.style.fontFamily = 'monospace';
    cameraMode.style.fontSize = '20px';
    cameraMode.style.opacity = '0';
    cameraMode.style.transition = 'opacity 0.5s ease-in-out';
    document.body.appendChild(cameraMode);
    
    // Add coordinate display
    const coordDisplay = document.createElement('div');
    coordDisplay.id = 'coordinates';
    coordDisplay.style.position = 'absolute';
    coordDisplay.style.top = '100px';
    coordDisplay.style.left = '10px';
    coordDisplay.style.color = '#00ff00';
    coordDisplay.style.fontFamily = 'monospace';
    coordDisplay.style.fontSize = '16px';
    coordDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    coordDisplay.style.padding = '5px';
    coordDisplay.style.border = '1px solid #00ff00';
    document.body.appendChild(coordDisplay);
    
    // Update the coordinate display in the animation loop
    setInterval(() => {
      const position = flyCamera.enabled ? camera.position : gameState.player.mesh.position;
      coordDisplay.innerHTML = `Position:<br>X: ${position.x.toFixed(2)}<br>Y: ${position.y.toFixed(2)}<br>Z: ${position.z.toFixed(2)}`;
    }, 100); // Update 10 times per second

  } catch (error) {
    console.error('Error initializing game:', error);
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.innerHTML = `<div style="color: red">Error: ${(error as Error).message || 'Unknown error'}</div>
      <div style="margin-top: 20px; font-size: 16px">
        Try the following:<br>
        - Check your internet connection<br>
        - Disable any content blockers<br>
        - <a href="#" onclick="location.reload()" style="color: #00ff00">Reload the page</a>
      </div>`;
    }
  }
}

// Immediately invoke the initialization function regardless of DOMContentLoaded
console.log("Attempting to initialize immediately");
init().catch((error) => {
  console.error('Unhandled error during initialization:', error);
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.textContent = `Error: ${error.message}. Please reload the page.`;
    loadingElement.style.color = 'red';
  }
});