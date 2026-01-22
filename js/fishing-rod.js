AFRAME.registerComponent('fishing-rod', {
  init: function () {
    this.el.setAttribute('geometry', { primitive: 'cylinder', radius: 0.02, height: 1 });
    this.el.setAttribute('material', { color: '#8B4513' });
  }
});
