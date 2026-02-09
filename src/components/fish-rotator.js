// Composant pour faire tourner les modèles de poisson affichés dans le panneau BONUS
AFRAME.registerComponent('fish-rotator', {
  schema: { interval: { type: 'number', default: 10000 } },

  init: function () {
    // list of models to rotate in the bonus panel: include all available fish
    // Échelles ajustées pour une taille visuelle cohérente dans le panneau
    this.fishModels = [
      // Goldfish - taille de référence
      { type: 'goldfish', model: '#goldfish', position: '0 0.01 0', rotation: '0 90 0', scale: '0.002 0.002 0.002' },
      // Piranha - augmenté significativement car modèle plus petit à la base, baissé en Y
      { type: 'piranha', model: '#piranha', position: '0 -0.04 0', rotation: '0 90 0', scale: '0.018 0.018 0.018' },
      // Thon - taille de référence
      { type: 'thon', model: '#thon', position: '0 0 0', rotation: '0 90 0', scale: '0.0035 0.0035 0.0035' },
      // Thon bleu - augmenté + décalé pour compenser le pivot vers la bouche
      { type: 'thon_bleu', model: '#thon_bleu', position: '0.04 0 0', rotation: '0 90 0', scale: '0.025 0.025 0.025' },
      // starfish intentionally excluded from bonus rotation (not considered a target fish)
    ];
    this.currentIndex = 0;
    if (this.el.sceneEl.hasLoaded) this.startRotation(); else this.el.sceneEl.addEventListener('loaded', () => this.startRotation());
  },

  startRotation: function () {
    const self = this;
    this.intervalId = setInterval(() => { self.nextFish(); }, this.data.interval);
    // initialize first
    this.applyCurrent();
  },

  getCurrentFish: function () { return this.fishModels[this.currentIndex].type; },
  getCurrentFishModel: function () { return this.fishModels[this.currentIndex].model; },

  applyCurrent: function () {
    const d = this.fishModels[this.currentIndex];
    this.el.removeAttribute('gltf-model');
    setTimeout(() => {
      this.el.setAttribute('gltf-model', d.model);
      this.el.setAttribute('position', d.position);
      this.el.setAttribute('rotation', d.rotation);
      this.el.setAttribute('scale', d.scale);
    }, 50);
  },

  nextFish: function () {
    this.currentIndex = (this.currentIndex + 1) % this.fishModels.length;
    this.applyCurrent();
  },

  remove: function () { if (this.intervalId) clearInterval(this.intervalId); }
});
