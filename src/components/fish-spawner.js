AFRAME.registerComponent('fish-movement', {

  init: function () {
    // Swimming state: velocity, target point, sway for a natural swim
    this.velocity = new THREE.Vector3(0, 0, 0);
    // Slight random variation, but overall slower
    this.speed = this.data.speed * (0.6 + Math.random() * 0.4);
    this.bounds = this.data.bounds;
    this.target = new THREE.Vector3();
    this._pickNewTarget();
    this.swayPhase = Math.random() * Math.PI * 2;
  },

  _pickNewTarget: function () {
    const b = this.bounds;
    this.target.set((Math.random() - 0.5) * b * 2, 0.2 + Math.random() * (b - 0.2), (Math.random() - 0.5) * b * 2 - 1.0);
  },

  tick: function (time, delta) {
    if (!delta) return;
    if (this.el.__isGrabbed) return; // when grabbed, let controller handle it

    const dt = delta / 1000;
    const pos = this.el.object3D.position;

    // If close to target, choose a new wander target
    if (pos.distanceTo(this.target) < 0.4) this._pickNewTarget();

    // Desired direction towards target
    const desired = this.target.clone().sub(pos).normalize();

    // Smoothly adjust velocity toward desired direction
    const desiredVel = desired.multiplyScalar(this.speed);
    this.velocity.lerp(desiredVel, Math.min(1, dt * 1.5));

    // Add a gentle lateral sway (like a fish tail) perpendicular to forward
    this.swayPhase += dt * (1.2 + Math.random() * 0.8);
    const lateral = new THREE.Vector3().crossVectors(this.velocity, new THREE.Vector3(0, 1, 0)).normalize();
    const sway = lateral.multiplyScalar(Math.sin(this.swayPhase) * 0.03);

    // Move position
    pos.addScaledVector(this.velocity, dt);
    pos.addScaledVector(sway, 1);

    // Keep fish above small floor height
    if (pos.y < 0.12) pos.y = 0.12;

    // Smooth rotation to face movement direction
    if (this.velocity.lengthSq() > 0.0001) {
      const lookTarget = pos.clone().add(this.velocity.clone());
      // Capture current quaternion
      const currentQuat = this.el.object3D.quaternion.clone();
      // Temporarily set lookAt to compute target quaternion
      this.el.object3D.lookAt(lookTarget);
      const targetQuat = this.el.object3D.quaternion.clone();
      // Restore then slerp toward target for smooth rotation
      this.el.object3D.quaternion.copy(currentQuat);
      this.el.object3D.quaternion.slerp(targetQuat, Math.min(1, dt * 4));
    }
  }
});

AFRAME.registerComponent('fish-spawner', {
  schema: {
    count: { type: 'int', default: 8 },
    area: { type: 'number', default: 2 }
  },

  init: function () {
    const scene = this.el.sceneEl;
    const parent = document.querySelector('#world-anchor') || scene;

    this.fishes = [];
    for (let i = 0; i < this.data.count; i++) {
      const fish = document.createElement('a-entity');

      // Debug/test shape: use a box so grabbing is visually obvious
      fish.setAttribute('geometry', 'primitive: box; width: 0.24; height: 0.14; depth: 0.12');
      fish.setAttribute('material', `color: ${this._randomColor()}; metalness: 0.05; roughness: 0.9`);
      // Slight random rotation so boxes don't all look identical
      const rx = (Math.random() - 0.5) * 20;
      const ry = (Math.random() - 0.5) * 180;
      const rz = (Math.random() - 0.5) * 20;
      fish.setAttribute('rotation', `${rx} ${ry} ${rz}`);

      // Random start position within area box
      const x = (Math.random() - 0.5) * this.data.area * 2;
      const y = 0.3 + Math.random() * (this.data.area - 0.3);
      const z = (Math.random() - 0.5) * this.data.area * 2 - 1.0; // slightly in front
      fish.setAttribute('position', `${x} ${y} ${z}`);

      // Mark as fish and grabbable
      fish.classList.add('fish');
      fish.setAttribute('grabbable', '');

      // Add movement component (much slower for boxes)
      const baseSpeed = 0.04 + Math.random() * 0.04; // 0.04 - 0.08
      fish.setAttribute('fish-movement', `speed: ${baseSpeed}; bounds: ${this.data.area}`);

      parent.appendChild(fish);
      this.fishes.push(fish);
    }
  },

  _randomColor: function () {
    const palette = ['#f39c12', '#e74c3c', '#1abc9c', '#3498db', '#9b59b6', '#f1c40f'];
    return palette[Math.floor(Math.random() * palette.length)];
  }
});
