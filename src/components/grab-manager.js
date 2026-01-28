// Simple grab system: spear follows hand position without reparenting
AFRAME.registerComponent('grab-manager', {
  init: function () {
    this.grabRadius = 0.4; // meters
    this.grabbedSpear = null;
    this.grabbingHand = null;
    this.offset = new AFRAME.THREE.Vector3(0, 0, -0.2);
    this.collisionRadius = 0.18; // Distance for spear-fish collision (smaller hitbox)
    
    const scene = this.el.sceneEl;
    
    // Wait for scene load
    scene.addEventListener('loaded', () => {
      // Support both hand-controls and platform-specific controller components
      const hands = scene.querySelectorAll('a-entity[hand-controls], a-entity[oculus-touch-controls]');
      console.log('✅ Grab manager found hands:', hands.length);
      
      hands.forEach((hand) => {
        hand.addEventListener('triggerdown', () => {
          this.tryGrab(hand);
        });
        
        hand.addEventListener('triggerup', () => {
          this.tryRelease(hand);
        });
      });
    });
  },

  tryGrab: function (hand) {
    if (this.grabbedSpear) return; // Already holding something
    
    const THREE = AFRAME.THREE;
    const handPos = new THREE.Vector3();
    hand.object3D.getWorldPosition(handPos);
    
    // Find nearest fish
    const scene = this.el.sceneEl;
    const fishes = Array.from(scene.querySelectorAll('.fish'));
    
    let nearest = null;
    let minDist = Infinity;
    
    fishes.forEach((fish) => {
      const fishPos = new THREE.Vector3();
      fish.object3D.getWorldPosition(fishPos);
      const dist = handPos.distanceTo(fishPos);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = fish;
      }
    });
    
    if (nearest && minDist < this.grabRadius) {
      this.grabbedSpear = nearest;
      this.grabbingHand = hand;
      console.log('🎣 Grabbed spear with hand:', hand.id, 'distance:', minDist.toFixed(2));
    } else {
      console.log('❌ No spear in range. Distance:', minDist.toFixed(2));
    }
  },

  tryRelease: function (hand) {
    if (this.grabbingHand === hand && this.grabbedSpear) {
      console.log('📤 Released spear');
      this.grabbedSpear = null;
      this.grabbingHand = null;
    }
  },

  tick: function () {
    if (!this.grabbedSpear || !this.grabbingHand) return;
    
    const THREE = AFRAME.THREE;
    
    // Get hand world position and rotation
    const handPos = new THREE.Vector3();
    const handQuat = new THREE.Quaternion();
    this.grabbingHand.object3D.getWorldPosition(handPos);
    this.grabbingHand.object3D.getWorldQuaternion(handQuat);
    
    // Apply offset in hand's local space
    const offsetWorld = this.offset.clone().applyQuaternion(handQuat);
    const targetPos = handPos.clone().add(offsetWorld);
    
    // Move spear to follow hand
    this.grabbedSpear.object3D.position.copy(targetPos);
    
    // Rotate spear 180 degrees on Y axis to flip it
    const flipRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    this.grabbedSpear.object3D.quaternion.copy(handQuat).multiply(flipRotation);
    
    // Check collision with fish targets
    this.checkFishCollision();
  },
  
  checkFishCollision: function () {
    if (!this.grabbedSpear) return;
    
    const THREE = AFRAME.THREE;
    const spearPos = new THREE.Vector3();
    this.grabbedSpear.object3D.getWorldPosition(spearPos);
    
    // Get spear tip position (forward from spear center)
    const spearQuat = new THREE.Quaternion();
    this.grabbedSpear.object3D.getWorldQuaternion(spearQuat);
    const forward = new THREE.Vector3(0, 0, 0.2).applyQuaternion(spearQuat);
    const tipPos = spearPos.clone().add(forward);
    
    // Check all fish targets
    const scene = this.el.sceneEl;
    const fishTargets = Array.from(scene.querySelectorAll('.fish-target'));
    
    fishTargets.forEach((fish) => {
      const fishPos = new THREE.Vector3();
      fish.object3D.getWorldPosition(fishPos);
      const distance = tipPos.distanceTo(fishPos);
      
      if (distance < this.collisionRadius) {
        console.log('🎯 Poisson attrapé!');
        // Make fish disappear
        fish.setAttribute('visible', 'false');
        // Remove after animation
        setTimeout(() => {
          if (fish.parentNode) {
            fish.parentNode.removeChild(fish);
          }
        }, 100);
      }
    });
  }
});
