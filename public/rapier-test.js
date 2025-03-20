console.log("rapier-test.js loaded");

// Debug what's in the Rapier module
async function testRapier() {
  console.log("Testing Rapier initialization...");
  
  try {
    // Import the module
    const RAPIER = await import('@dimforge/rapier3d/rapier_wasm3d.js');
    console.log("RAPIER imported:", typeof RAPIER);
    
    // Log the module contents
    console.log("RAPIER keys:", Object.keys(RAPIER));
    console.log("RAPIER init:", RAPIER.init);
    console.log("RAPIER default:", RAPIER.default);
    
    // Try different ways to initialize
    if (RAPIER.init) {
      console.log("Using RAPIER.init()");
      const rapierModule = await RAPIER.init();
      console.log("Rapier initialized successfully with RAPIER.init()");
      return true;
    } else if (RAPIER.default && RAPIER.default.init) {
      console.log("Using RAPIER.default.init()");
      const rapierModule = await RAPIER.default.init();
      console.log("Rapier initialized successfully with RAPIER.default.init()");
      return true;
    } else {
      console.error("Could not find init function in RAPIER module");
      return false;
    }
  } catch (error) {
    console.error("Error initializing Rapier:", error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return false;
  }
}

// Run the test
testRapier()
  .then(success => {
    console.log("Rapier test complete, success:", success);
  })
  .catch(err => {
    console.error("Unexpected error in Rapier test:", err);
  });