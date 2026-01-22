AFRAME.registerComponent('init-game', {
  init: function () {
    console.log("Jeu de pêche XR initialisé !");
  }
});

document.querySelector('a-scene').setAttribute('init-game', '');
