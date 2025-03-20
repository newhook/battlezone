console.log("debug.js loaded");

// Attempt to dynamically import the main module
import('./src/main.ts')
  .then(() => {
    console.log("Main module loaded successfully");
  })
  .catch(error => {
    console.error("Error loading main module:", error);
  });