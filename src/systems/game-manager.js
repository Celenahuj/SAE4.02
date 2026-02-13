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
  // Setup simple game UI handlers (start/restart/quit)
  function initGameUI() {
    const start3D = document.querySelector('#start-button-3d');
    const scene = document.querySelector('a-scene');
    if (start3D) {
      // Ensure hidden by default (will be shown after room-scanned)
      start3D.setAttribute('visible', 'false');
      start3D.addEventListener('click', () => {
        start3D.setAttribute('visible', 'false');
        try {
          // 1) reveal the weapon
          const spear = document.querySelector('#spear');
          if (spear) spear.setAttribute('visible', 'true');

          // 2) reveal water and start its rise animation; when complete -> spawn fishes and start game timer
          const water = document.querySelector('#water-surface');
          const scene = document.querySelector('a-scene');
          if (water) {
            // Prefer the water-adapter API to start the rise so it only runs once
            const adapter = water.components && water.components['water-adapter'];
            try {
              if (adapter && adapter.startRise) {
                adapter.startRise();
              } else {
                // fallback: ensure water visible and apply a named animation
                water.setAttribute('visible', 'true');
                const anim = water.getAttribute('animation');
                if (anim) {
                  water.removeAttribute('animation__rise');
                  water.setAttribute('animation__rise', anim);
                } else {
                  water.setAttribute('animation__rise', 'property: position; to: 0 2.5 -2; dur: 10000; easing: easeInOutQuad');
                }
              }
            } catch (e) { console.warn('game-manager: startRise failed', e); }

            const onAnim = (ev) => {
              try { water.removeEventListener('animationcomplete', onAnim); } catch (e) {}
              // spawn fishes (use fish-spawner API) then start timer
              try {
                const spawner = document.querySelector('[fish-spawner]');
                if (spawner && spawner.components && spawner.components['fish-spawner'] && spawner.components['fish-spawner'].startSpawn) {
                  spawner.components['fish-spawner'].startSpawn();
                }
              } catch (e) { console.warn('game-manager: spawn after rise failed', e); }

              try { if (window.gameTimer && window.gameTimer.startGame) window.gameTimer.startGame(60); } catch (e) {}
            };

            // listen for animationcomplete
            water.addEventListener('animationcomplete', onAnim);
          } else {
            // If no water entity, just spawn and start
            try {
              const spawner = document.querySelector('[fish-spawner]');
              if (spawner && spawner.components && spawner.components['fish-spawner'] && spawner.components['fish-spawner'].startSpawn) spawner.components['fish-spawner'].startSpawn();
            } catch (e) {}
            try { if (window.gameTimer && window.gameTimer.startGame) window.gameTimer.startGame(60); } catch (e) {}
          }
        } catch (e) { console.warn('start button handler error', e); }
      });

      // Show the start button only after the room scan completes
      if (scene) {
        scene.addEventListener('room-scanned', (ev) => {
          // Small delay to allow visuals/UI to settle
          setTimeout(() => start3D.setAttribute('visible', 'true'), 300);
        }, { once: true });
      }
    }

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.addEventListener('click', () => { 
      if (window.gameTimer && window.gameTimer.resetGame) { 
        window.gameTimer.resetGame(); 
        setTimeout(() => {
          if (window.gameTimer && window.gameTimer.startGame) window.gameTimer.startGame(60);
        }, 200);
      } 
    });
    
    const btnQuit = document.getElementById('btn-quit');
    if (btnQuit) btnQuit.addEventListener('click', () => { 
      try {
        if (window.gameTimer && window.gameTimer.resetGame) window.gameTimer.resetGame();
      } catch (e) {}
      // Reload page to return to player name screen
      window.location.reload();
    });

    const btnRestart3D = document.querySelector('#btn-restart-3d');
    if (btnRestart3D) btnRestart3D.addEventListener('click', () => { 
      if (window.gameTimer && window.gameTimer.resetGame) { 
        window.gameTimer.resetGame(); 
        setTimeout(() => {
          if (window.gameTimer && window.gameTimer.startGame) window.gameTimer.startGame(60);
        }, 200);
      } 
    });
    
    const btnQuit3D = document.querySelector('#btn-quit-3d');
    if (btnQuit3D) btnQuit3D.addEventListener('click', () => { 
      try {
        if (window.gameTimer && window.gameTimer.resetGame) window.gameTimer.resetGame();
      } catch (e) {}
      // Reload page to return to player name screen
      window.location.reload();
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') initGameUI(); else document.addEventListener('DOMContentLoaded', initGameUI);
})();
