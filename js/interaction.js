AFRAME.registerComponent('fish-interactions', {
  init: function () {
    const cursor = document.querySelector('#cursor');
    cursor.addEventListener('click', (evt) => {
      const target = evt.detail.intersectedEl;
      if (target && target.classList.contains('fish')) {
        const points = target.getAttribute('fish-points');
        alert(`Poisson attrapé ! +${points} points`);
        target.parentNode.removeChild(target);
      }
    });
  }
});
