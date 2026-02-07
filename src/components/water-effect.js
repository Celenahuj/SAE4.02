AFRAME.registerComponent('water-shader', {
  schema: {
    color: { type: 'color', default: '#0077be' },
    opacity: { type: 'number', default: 0.6 },
    speed: { type: 'number', default: 1.0 },
    waveHeight: { type: 'number', default: 0.1 },
    waveFrequency: { type: 'number', default: 2.0 },
    width: { type: 'number', default: 10 },
    depth: { type: 'number', default: 10 }
  },

  init: function () {
    const data = this.data;
    const el = this.el;

    // Créer une géométrie plane avec beaucoup de subdivisions pour les vagues
    const geometry = new THREE.PlaneGeometry(data.width, data.depth, 64, 64);

    // Matériau avec transparence
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      transparent: true,
      opacity: data.opacity,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.3
    });

    // Créer le mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2; // Horizontal

    // Ajouter à la scène
    el.setObject3D('mesh', this.mesh);

    // Stocker les positions initiales des vertices
    this.originalPositions = geometry.attributes.position.array.slice();
    this.time = 0;
  },

  tick: function (time, deltaTime) {
    if (!this.mesh) return;

    const data = this.data;
    this.time += deltaTime * 0.001 * data.speed;

    const positions = this.mesh.geometry.attributes.position.array;
    const original = this.originalPositions;

    // Animer chaque vertex pour créer l'effet de vagues
    for (let i = 0; i < positions.length; i += 3) {
      const x = original[i];
      const y = original[i + 1];

      // Créer des vagues sinusoïdales multiples
      const wave1 = Math.sin(x * data.waveFrequency + this.time) * data.waveHeight;
      const wave2 = Math.sin(y * data.waveFrequency * 0.8 + this.time * 1.2) * data.waveHeight * 0.5;
      const wave3 = Math.sin((x + y) * data.waveFrequency * 0.5 + this.time * 0.8) * data.waveHeight * 0.3;

      // Appliquer la hauteur de vague sur l'axe Z (qui devient Y après rotation)
      positions[i + 2] = wave1 + wave2 + wave3;
    }

    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  },

  update: function (oldData) {
    // Si les dimensions changent, recréer la géométrie
    if (this.mesh && (oldData.width !== this.data.width || oldData.depth !== this.data.depth)) {
      console.log('💧 water-shader: Mise à jour des dimensions:', this.data.width, 'x', this.data.depth);
      
      // Disposer de l'ancienne géométrie
      this.mesh.geometry.dispose();
      
      // Créer une nouvelle géométrie avec les nouvelles dimensions
      const geometry = new THREE.PlaneGeometry(this.data.width, this.data.depth, 64, 64);
      this.mesh.geometry = geometry;
      
      // Mettre à jour les positions originales
      this.originalPositions = geometry.attributes.position.array.slice();
    }
  }
});
