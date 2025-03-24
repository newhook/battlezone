import * as THREE from 'three';
import { Tank } from './tank';

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
}

// Add new interface for marquee camera positions
interface MarqueeCamera {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  duration: number;
}

// Add marquee camera configurations
const marqueeCameras: MarqueeCamera[] = [
  {
    position: new THREE.Vector3(0, 30, 0),
    lookAt: new THREE.Vector3(0, 0, 0),
    duration: 5000
  },
  {
    position: new THREE.Vector3(50, 5, 50),
    lookAt: new THREE.Vector3(0, 2, 0),
    duration: 4000
  },
  {
    position: new THREE.Vector3(-30, 3, 20),
    lookAt: new THREE.Vector3(0, 1, 0),
    duration: 4000
  },
  {
    position: new THREE.Vector3(0, 1.5, -40),
    lookAt: new THREE.Vector3(0, 1.5, 0),
    duration: 4000
  }
];

let currentMarqueeIndex = 0;
let marqueeStartTime = 0;
let isMarqueeMode = true;

export function initScene(): SceneSetup {
  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Set up camera with increased far plane and narrower FOV for first person view
  const camera = new THREE.PerspectiveCamera(
    60, // Reduced FOV for more realistic first person view
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  // Initial position will be adjusted by updateCamera, these are just starting values
  camera.position.set(0, 1.5, 0);
  camera.lookAt(0, 1.5, 10);

  // Create renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 1);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 2.0); // Doubled from 1.0
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Increased from 1.0
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);
  
  // Add a distant point light to simulate moonlight
  const moonLight = new THREE.PointLight(0x7777ff, 1.0, 1000); // Doubled from 0.5
  moonLight.position.set(-150, 300, -150);
  scene.add(moonLight);
  
  // Add axis helper with labels to visualize X, Y, Z directions
  const axisLength = 20;
  const axesHelper = new THREE.AxesHelper(axisLength);
  scene.add(axesHelper);
  
  // Create a world orientation guide that shows at the corner of the screen
  createOrientationGuide(scene);
  
  // Create clock for time-based animations
  const clock = new THREE.Clock();

  return { scene, camera, renderer, clock };
}

// Creates a small orientation guide that stays in the corner of the screen
function createOrientationGuide(scene: THREE.Scene) {
  // Create a separate scene for the orientation guide
  const guideScene = new THREE.Scene();
  
  // Add axes to the guide
  const axesHelper = new THREE.AxesHelper(10);
  guideScene.add(axesHelper);
  
  // Add labels
  const createGuideLabel = (text: string, position: THREE.Vector3, color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    
    const context = canvas.getContext('2d');
    if (context) {
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = 'bold 20px Arial';
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.copy(position);
    sprite.scale.set(2, 1, 1);
    
    guideScene.add(sprite);
    return sprite;
  };
  
  // Add axis labels for the guide
  createGuideLabel('X', new THREE.Vector3(12, 0, 0), '#ff0000');
  createGuideLabel('Y', new THREE.Vector3(0, 12, 0), '#00ff00');
  createGuideLabel('Z', new THREE.Vector3(0, 0, 12), '#0000ff');
  
  // Create camera for the guide
  const guideCamera = new THREE.PerspectiveCamera(50, 1, 1, 1000);
  guideCamera.position.set(15, 15, 15);
  guideCamera.lookAt(0, 0, 0);
  
  // Add the guide elements to the main scene
  scene.userData.orientationGuide = {
    scene: guideScene,
    camera: guideCamera
  };
}

// Update the camera to follow the player in first person view
export function updateCamera(camera: THREE.PerspectiveCamera, player: Tank) {
  // Get the turret container safely using the getter method
  const turretContainer = player.getTurretContainer();
  if (!turretContainer) return;

  // Position camera under the cannon
  const cameraOffset = new THREE.Vector3(0, 1.25, 0); // Slightly below turret height
  
  // Apply tank's position and rotation
  camera.position.copy(player.mesh.position).add(cameraOffset);
  
  // Create forward direction based on tank and turret rotation
  const forward = new THREE.Vector3(0, 0, 1);
  const combinedRotation = new THREE.Quaternion()
    .multiplyQuaternions(player.mesh.quaternion, turretContainer.quaternion);
  forward.applyQuaternion(combinedRotation);
  
  // Look in the direction the turret is facing
  const lookAtPoint = camera.position.clone().add(forward.multiplyScalar(10));
  camera.lookAt(lookAtPoint);
}

export function updateMarqueeCamera(camera: THREE.PerspectiveCamera, currentTime: number): void {
  if (!isMarqueeMode) return;

  if (marqueeStartTime === 0) {
    marqueeStartTime = currentTime;
  }

  const current = marqueeCameras[currentMarqueeIndex];
  const next = marqueeCameras[(currentMarqueeIndex + 1) % marqueeCameras.length];
  const elapsedTime = currentTime - marqueeStartTime;

  if (elapsedTime >= current.duration) {
    // Move to next camera position
    currentMarqueeIndex = (currentMarqueeIndex + 1) % marqueeCameras.length;
    marqueeStartTime = currentTime;
    return;
  }

  // Interpolate between current and next camera position
  const progress = elapsedTime / current.duration;
  const position = new THREE.Vector3().lerpVectors(
    current.position,
    next.position,
    progress
  );
  const lookAt = new THREE.Vector3().lerpVectors(
    current.lookAt,
    next.lookAt,
    progress
  );

  camera.position.copy(position);
  camera.lookAt(lookAt);
}

export function setMarqueeMode(enabled: boolean): void {
  isMarqueeMode = enabled;
  currentMarqueeIndex = 0;
  marqueeStartTime = 0;
}
