// Places coral models on yellow-marked visuals (tables) and on the floor inside the scanned room
AFRAME.registerComponent('coral-placer', {
  schema: {
    maxOnMarkers: { type: 'int', default: 3 },
    maxOnFloor: { type: 'int', default: 5 },
    densityFloor: { type: 'number', default: 0.45 }, // corals per m²
    scaleMin: { type: 'number', default: 0.35 },
    scaleMax: { type: 'number', default: 0.65 },
    floorPadding: { type: 'number', default: 0.35 }
  },

  init: function () {
    this.placed = [];
    this._onScan = (e) => this.placeCorals(e.detail);
    this._onReset = () => this.clearCorals();
    this.el.sceneEl.addEventListener('room-scanned', this._onScan);
    this.el.sceneEl.addEventListener('room-reset', this._onReset);

    // If already scanned
    if (window.FISH_ZONE && window.FISH_ZONE.scanned) {
      // attempt to place after a short delay to allow other components to prepare
      setTimeout(() => {
        const detail = {
          bounds: window.FISH_ZONE.roomBounds,
          floorY: window.FISH_ZONE.floorY,
          height: window.FISH_ZONE.ceilingY ? (window.FISH_ZONE.ceilingY - window.FISH_ZONE.floorY) : 2.5
        };
        this.placeCorals(detail);
      }, 200);
    }
    // Fallback: if no room-scanned within 7s, place corals using a sensible default for quick testing
    this._fallbackTimer = setTimeout(() => {
      if (this.placed.length === 0 && !(window.FISH_ZONE && window.FISH_ZONE.scanned)) {
        const testData = {
          bounds: { minX: -2, maxX: 2, minZ: -4, maxZ: 0 },
          floorY: 0,
          height: 2.4
        };
        console.warn('coral-placer: no scan received — using fallback placement for testing');
        this.placeCorals(testData);
      }
    }, 7000);
  },

  clearCorals: function () {
    this.placed.forEach(c => { if (c.parentNode) c.parentNode.removeChild(c); });
    this.placed = [];
  },

  placeCorals: function (roomData) {
    try {
      const scene = this.el.sceneEl;
      const rd = scene && scene.components && scene.components['room-detection'];

      console.log('coral-placer: placeCorals called; planeMeshes:', rd && rd.planeMeshes ? rd.planeMeshes.length : 0);

      // First: place on yellow-marked visuals (planeMeshes) if available
      // Place exactly one starfish per yellow-marked visual (if any)
      // Also place corals on red-marked visuals (prefer red surfaces over floor scatter)
      let foundRed = false;
      if (rd && rd.planeMeshes && rd.planeMeshes.length > 0) {
        for (let mesh of rd.planeMeshes) {
          try {
            let matDbg = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            const hexDbg = matDbg && matDbg.color && typeof matDbg.color.getHex === 'function' ? matDbg.color.getHex() : (matDbg && matDbg.color ? (matDbg.color & 0xffffff) : null);
            console.log('coral-placer: planeMesh material hex=', hexDbg, 'mesh type=', mesh.type);
          } catch (e) { console.log('coral-placer: planeMesh debug error', e); }
        }

        // iterate again for placement
        for (let mesh of rd.planeMeshes) {
          if (!mesh || !mesh.material) continue;
          let mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          if (!mat || !mat.color) continue;
          const hex = (typeof mat.color.getHex === 'function') ? mat.color.getHex() : (mat.color & 0xffffff);

          // Yellow -> starfish
          if (hex === 0xffdd00 || hex === 0xffff00) {
            const pos = new AFRAME.THREE.Vector3();
            mesh.getWorldPosition(pos);
            pos.y += 0.04; // offset above surface

            const near = this.placed.some(c => {
              try { const p = c.object3D.getWorldPosition(new AFRAME.THREE.Vector3()); return p.distanceTo(pos) < 0.18; }
              catch (e) { return false; }
            });
            if (!near) this._spawnCoralAt(pos, '#starfish');
          }

          // Red surfaces detected but coral spawning is disabled.
          if (hex === 0xff0000) {
            const pos = new AFRAME.THREE.Vector3();
            mesh.getWorldPosition(pos);
            pos.y += 0.06; // slightly above red surface
            console.log('coral-placer: red surface detected but coral spawns are disabled; skipping coral for this mesh');
          }
        }
      }

      console.log('coral-placer: coral floor scattering disabled; no coral models will be spawned on the floor');
    } catch (e) {
      console.warn('coral-placer: placement failed', e);
    }
  },

  _spawnCoralAt: function (posVec3, modelId) {
    // Create entity using the coral asset
    const ent = document.createElement('a-entity');
    const model = modelId || '#starfish';
    console.log('coral-placer: _spawnCoralAt model=', model, 'pos=', posVec3.toArray());
    ent.setAttribute('gltf-model', model);
    // Random uniform scale (starfish should be much smaller)
    const base = this.data.scaleMin + Math.random() * (this.data.scaleMax - this.data.scaleMin);
    let s = base;
    if (model === '#starfish') {
      // make starfish much smaller (~6x reduction from previous)
      s = Math.max(0.005, base * 0.0467);
    }
    // coral-specific scaling is disabled (coral model not used)
    ent.setAttribute('scale', `${s} ${s} ${s}`);
    // Clamp X/Z to remain well inside detected room bounds (account for coral size)
    try {
      const rb = (window.FISH_ZONE && window.FISH_ZONE.roomBounds) ? window.FISH_ZONE.roomBounds : null;
      if (rb) {
        const pad = Math.max(0, this.data.floorPadding) + 0.05;
        // margin based on model scale to avoid visual overflow (smaller margin)
        const sizeMargin = Math.max(0.05, s * 0.4);
        const minX = rb.minX + sizeMargin;
        const maxX = rb.maxX - sizeMargin;
        const minZ = rb.minZ + sizeMargin;
        const maxZ = rb.maxZ - sizeMargin;
        if (isFinite(minX) && isFinite(maxX) && minX < maxX) posVec3.x = Math.min(Math.max(posVec3.x, minX), maxX);
        if (isFinite(minZ) && isFinite(maxZ) && minZ < maxZ) posVec3.z = Math.min(Math.max(posVec3.z, minZ), maxZ);
        // also adjust Y slightly above floor if available
        if (rb.minY != null && rb.maxY != null) {
          const floorY = rb.minY;
          posVec3.y = Math.max(posVec3.y, floorY + 0.02);
        }
      }
    } catch (e) {
      // ignore clamping errors
    }
    // No coral-specific Y lift needed (coral model not used)
    ent.setAttribute('position', `${posVec3.x.toFixed(3)} ${posVec3.y.toFixed(3)} ${posVec3.z.toFixed(3)}`);
    // Slight random rotation
    const ry = Math.random() * 360;
    ent.setAttribute('rotation', `0 ${ry.toFixed(1)} 0`);
    ent.classList.add('coral');

    const parent = document.querySelector('#world-anchor') || this.el.sceneEl;
    parent.appendChild(ent);
    this.placed.push(ent);
  },

  remove: function () {
    this.clearCorals();
    this.el.sceneEl.removeEventListener('room-scanned', this._onScan);
    this.el.sceneEl.removeEventListener('room-reset', this._onReset);
    clearTimeout(this._fallbackTimer);
  }
});
