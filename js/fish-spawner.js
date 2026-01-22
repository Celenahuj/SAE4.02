const fishTypes = [
  { color: 'orange', points: 10 },
  { color: 'blue', points: 20 },
  { color: 'gold', points: 50 } // rare
];

AFRAME.registerComponent('spawn-fish', {
  init: function () {
    this.container = document.getElementById('fish-container');
    this.spawnFish();
  },
  spawnFish: function () {
    setInterval(() => {
      const fishData = fishTypes[Math.floor(Math.random() * fishTypes.length)];
      const fish = document.createElement('a-sphere');
      fish.setAttribute('class', 'fish');
      fish.setAttribute('color', fishData.color);
      fish.setAttribute('radius', 0.1);
      fish.setAttribute('position', {
        x: (Math.random() - 0.5) * 4,
        y: Math.random() * 2 + 1,
        z: (Math.random() - 0.5) * 4
      });
      fish.setAttribute('fish-points', fishData.points);
      this.container.appendChild(fish);
    }, 2000); // 1 poisson toutes les 2s
  }
});
