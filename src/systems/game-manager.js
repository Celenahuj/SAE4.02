// Game manager system: handles UI buttons and AR session entry
(function () {
  // Wait until DOM ready
  function initARButton() {
    const arButton = document.getElementById('ar-button');
    const scene = document.querySelector('a-scene');
    if (!arButton || !scene) return;

    arButton.addEventListener('click', async function () {
      if (!navigator.xr) {
        alert('WebXR non supporté sur ce navigateur');
        return;
      }

      const isArSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!isArSupported) {
        alert('Mode AR non supporté. Utilisez un Quest 3 ou un appareil compatible.');
        return;
      }

      try {
        scene.enterAR();
        arButton.style.display = 'none';

        scene.addEventListener('exit-vr', function onExitAR() {
          arButton.style.display = 'block';
          scene.removeEventListener('exit-vr', onExitAR);
        });

        console.log('Mode AR activé - passthrough actif !');
      } catch (err) {
        console.error('Erreur lors du lancement AR:', err);
        alert('Erreur: ' + err.message);
      }
    });

    // Hide or disable button if AR not supported
    scene.addEventListener('loaded', async function () {
      if (navigator.xr) {
        const isArSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!isArSupported) {
          arButton.textContent = 'AR non disponible';
          arButton.disabled = true;
        }
      } else {
        arButton.textContent = 'WebXR non supporté';
        arButton.disabled = true;
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initARButton, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initARButton);
  }
})();
