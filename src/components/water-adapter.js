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
    
    console.log('💧 water-adapter: En attente de room-scanned...');
  },

  _onRoomScanned: function(event) {
    console.log('💧 water-adapter: Événement room-scanned reçu');
    
    const data = event.detail;
    if (!data || !data.bounds) {
      console.warn('💧 water-adapter: Pas de bounds dans room-scanned');
      return;
    }

    this.roomData = data;
    console.log('💧 water-adapter: Dimensions de la pièce:', {
      width: data.width,
      depth: data.depth,
      height: data.height,
      centerX: data.centerX,
      centerZ: data.centerZ,
      floorY: data.floorY
    });

    // Mettre à jour l'eau
    this._updateWaterGeometry();
    this._updateWaterPosition();
    this._applyRotation();
    this._updateAnimation();
  },

  _updateWaterGeometry: function() {
    if (!this.roomData) return;

    const margin = this.data.margin;
    const trim = 0.02; // petit retrait pour éviter le léger dépassement visuel
    let width = this.roomData.width + (margin * 2) - (trim * 2);
    let depth = this.roomData.depth + (margin * 2) - (trim * 2);
    width = Math.max(0.1, width);
    depth = Math.max(0.1, depth);

    console.log('💧 water-adapter: Nouvelle taille de l\'eau:', {width, depth, trim});

    // Trouver tous les enfants avec water-shader
    const waterEntities = this.el.querySelectorAll('[water-shader]');
    console.log('💧 water-adapter: Nombre de couches d\'eau trouvées:', waterEntities.length);

    waterEntities.forEach((entity, index) => {
      // Utiliser setAttribute pour mettre à jour les dimensions du composant water-shader
      entity.setAttribute('water-shader', {
        width: width,
        depth: depth
      });
      
      // Rendre visible après dimensionnement
      try { entity.setAttribute('visible', 'true'); } catch (e) {}
      console.log(`💧 water-adapter: Couche ${index + 1} redimensionnée et affichée à ${width.toFixed(2)}m x ${depth.toFixed(2)}m`);
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
    
    console.log('💧 water-adapter: Nouvelle position de l\'eau:', newPosition);
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

    // Mettre à jour l'animation
    this.el.setAttribute('animation', {
      property: 'position',
      from: from,
      to: to,
      dur: 10000,
      easing: 'easeInOutQuad'
    });

    console.log('💧 water-adapter: Animation mise à jour:', {from, to});
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
      console.log('💧 water-adapter: Rotation appliquée:', degrees.toFixed(2), '°');
    }
  }
});
