import { InputState } from './types';

// Handle keyboard input
export function setupInputHandlers(): InputState {
  const input: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    fire: false,
    toggleFlyCamera: false,
    down: false
  };
  
  // Key down handler
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyR':
        input.wireframeToggle = !input.wireframeToggle;
        break;
      case 'KeyW':
      case 'ArrowUp':
        input.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        input.right = true;
        break;
      case 'Space':
        input.fire = true;
        break;
      case 'KeyF':
        // Toggle fly camera on keydown, not continuous press
        input.toggleFlyCamera = !input.toggleFlyCamera;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.down = true;
        break;
    }
  };
  
  // Key up handler
  const handleKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        input.right = false;
        break;
      case 'Space':
        input.fire = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.down = false;
        break;
      // We don't reset toggleFlyCamera on keyup as it's a toggle state
    }
  };
  
  // Add event listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return input;
}
