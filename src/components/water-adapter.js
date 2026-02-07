/**
 * water-adapter.js
 * Composant qui adapte la taille et position de l'eau selon les dimensions de la pièce
 */

AFRAME.registerComponent('water-adapter', {
  schema: {
    // Marge autour de la pièce pour que l'eau déborde légèrement
    margin: {type: 'number', default: 0.5}
  },

  init: function () {
    console.log('💧 water-adapter: Init');
    
    this.roomData = null;
    this.waterLayers = [];
    
    // Écouter l'événement room-scanned
    this.el.sceneEl.addEventListener('room-scanned', this._onRoomScanned.bind(this));
    
    console.log('💧 water-adapter: Waiting for room-scanned...');
  },

  _onRoomScanned: function(event) {
    console.log('💧 water-adapter: room-scanned event received');
    
    const data = event.detail;
    if (!data || !data.bounds) {
      console.warn('💧 water-adapter: No bounds in room-scanned');
      return;
    }

    this.roomData = data;
    console.log('💧 water-adapter: Room dimensions:', {
      width: data.width,
      depth: data.depth,
      height: data.height,
      centerX: data.centerX,
      centerZ: data.centerZ,
      floorY: data.floorY
    });

    // Prepare water geometry/position but do NOT start any rise animation here.
    // The actual rise will be triggered explicitly by calling `startRise()` (from the PLAY button).
    this._updateWaterGeometry();
    this._updateWaterPosition();
    this._applyRotation();
    // compute and store animation params for later start
    this._prepareAnimationParams();
  },

  _updateWaterGeometry: function() {
    if (!this.roomData) return;

    const margin = this.data.margin;
    const trim = 0.02; // petit retrait pour éviter le léger dépassement visuel
    let width = this.roomData.width + (margin * 2) - (trim * 2);
    let depth = this.roomData.depth + (margin * 2) - (trim * 2);
    width = Math.max(0.1, width);
    depth = Math.max(0.1, depth);

    console.log('💧 water-adapter: New water size:', {width, depth, trim});

    // Trouver tous les enfants avec water-shader
    const waterEntities = this.el.querySelectorAll('[water-shader]');
    // Update geometry for each layer but keep them hidden until startRise()
    waterEntities.forEach((entity, index) => {
      entity.setAttribute('water-shader', {
        width: width,
        depth: depth
      });
      try { entity.setAttribute('visible', 'false'); } catch (e) {}
    });
  },

  _updateWaterPosition: function() {
    if (!this.roomData) return;

    const centerX = this.roomData.centerX;
    const centerZ = this.roomData.centerZ;
    const floorY = this.roomData.floorY;

    // Positionner l'eau au niveau du sol, au centre de la pièce
    const newPosition = `${centerX} ${floorY} ${centerZ}`;
    this.el.setAttribute('position', newPosition);
    
    console.log('💧 water-adapter: New water position:', newPosition);
  },

  _updateAnimation: function() {
    if (!this.roomData) return;

    const centerX = this.roomData.centerX;
    const centerZ = this.roomData.centerZ;
    const floorY = this.roomData.floorY;
    const height = this.roomData.height || 2.5;

    // Position de départ : au sol
    const from = `${centerX} ${floorY} ${centerZ}`;
    // Position d'arrivée : hauteur de la pièce
    const to = `${centerX} ${floorY + height} ${centerZ}`;

    // For compatibility we compute and store the rise parameters; do not apply the animation yet.
    this._riseParams = { property: 'position', from: from, to: to, dur: 10000, easing: 'easeInOutQuad' };
    this._risePrepared = true;
  },

  _prepareAnimationParams: function() {
    if (!this.roomData) return;
    const centerX = this.roomData.centerX;
    const centerZ = this.roomData.centerZ;
    const floorY = this.roomData.floorY;
    const height = this.roomData.height || 2.5;
    const from = `${centerX} ${floorY} ${centerZ}`;
    const to = `${centerX} ${floorY + height} ${centerZ}`;
    this._riseParams = { property: 'position', from: from, to: to, dur: 10000, easing: 'easeInOutQuad' };
    this._risePrepared = true;
  },

  startRise: function() {
    // Start the water rise animation (only once)
    if (this._riseStarted) return;
    this._riseStarted = true;

    // Reveal water layers
    const waterEntities = this.el.querySelectorAll('[water-shader]');
    waterEntities.forEach((entity) => { try { entity.setAttribute('visible', 'true'); } catch (e) {} });

    // Apply prepared animation params if available
    if (this._riseParams) {
      // Ensure any previous named animation is removed
      try { this.el.removeAttribute('animation__rise'); } catch (e) {}
      this.el.setAttribute('animation__rise', this._riseParams);
    } else {
      // Fallback animation
      this.el.setAttribute('animation__rise', 'property: position; to: 0 2.5 -2; dur: 10000; easing: easeInOutQuad');
    }

    // Emit an event to indicate the rise started (useful if callers want to react)
    try { this.el.emit('water-rise-started'); } catch (e) {}
  },


  // Si la pièce a une rotation, on pourrait appliquer la rotation à l'eau
  // Mais pour un plan d'eau horizontal, ce n'est généralement pas nécessaire
  _applyRotation: function() {
    if (!this.roomData || !this.roomData.orientedBox) return;

    const rotationY = this.roomData.orientedBox.rotationY;
    if (rotationY && Math.abs(rotationY) > 0.01) {
      // Convertir radians en degrés
      const degrees = rotationY * (180 / Math.PI);
      this.el.setAttribute('rotation', `0 ${degrees} 0`);
      console.log('💧 water-adapter: Rotation applied:', degrees.toFixed(2), '°');
    }
  }
});
