/**
 * water-effect.js
 * Effet d'eau animé sur le sol utilisant Three.js et GSAP
 * Pour le jeu de pêche XR - SAE 4.02
 */

// Attendre que la scène A-Frame soit chargée
document.addEventListener('DOMContentLoaded', function () {
  const scene = document.querySelector('a-scene');

  scene.addEventListener('loaded', function () {
    initWaterEffect();
    initSpotlightAnimations();
    initWaterRising(); // Effet de montée de l'eau
  });
});

/**
 * Initialise l'effet d'eau sur la surface
 * Utilise Three.js pour modifier la géométrie et créer des vagues
 */
function initWaterEffect() {
  const waterSurface = document.querySelector('#water-surface');

  // Attendre que l'objet Three.js soit disponible
  if (!waterSurface || !waterSurface.object3D) {
    setTimeout(initWaterEffect, 100);
    return;
  }

  // Récupérer le mesh Three.js du plan
  const mesh = waterSurface.getObject3D('mesh');

  if (!mesh || !mesh.geometry) {
    setTimeout(initWaterEffect, 100);
    return;
  }

  // Augmenter le nombre de segments pour avoir plus de vertices à animer
  // On remplace la géométrie par une plus détaillée
  const newGeometry = new THREE.PlaneGeometry(50, 50, 64, 64);
  mesh.geometry.dispose(); // Libérer l'ancienne géométrie
  mesh.geometry = newGeometry;

  // Créer un matériau plus réaliste pour l'eau
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ddff,
    transparent: true,
    opacity: 0.15,
    metalness: 0.9,
    roughness: 0.1,
    side: THREE.DoubleSide
  });

  mesh.material.dispose(); // Libérer l'ancien matériau
  mesh.material = waterMaterial;

  // Stocker les positions originales des vertices
  const positionAttribute = mesh.geometry.attributes.position;
  const originalPositions = new Float32Array(positionAttribute.array.length);
  originalPositions.set(positionAttribute.array);

  // Variables pour l'animation des vagues (vagues plus grandes)
  let time = 0;
  const waveSpeed = 0.6;
  const waveHeight = 0.8; // Plus grandes vagues
  const waveFrequency = 0.12;

  /**
   * Fonction d'animation des vagues
   * Appelée à chaque frame pour créer l'effet de vagues
   */
  function animateWaves() {
    time += 0.016; // ~60fps

    const positions = positionAttribute.array;

    // Parcourir tous les vertices et modifier leur position Z (hauteur)
    for (let i = 0; i < positions.length; i += 3) {
      const x = originalPositions[i];
      const y = originalPositions[i + 1];

      // Créer un effet de vagues combinant plusieurs ondes sinusoïdales
      // Onde principale (grande)
      const wave1 = Math.sin(x * waveFrequency + time * waveSpeed) * waveHeight;
      // Onde secondaire (perpendiculaire, moyenne)
      const wave2 = Math.sin(y * waveFrequency * 0.7 + time * waveSpeed * 1.3) * (waveHeight * 0.6);
      // Onde de détail (plus rapide, plus petite)
      const wave3 = Math.sin((x + y) * waveFrequency * 1.5 + time * waveSpeed * 1.8) * (waveHeight * 0.3);
      // Onde supplémentaire pour plus de réalisme
      const wave4 = Math.sin(x * waveFrequency * 2.5 - time * waveSpeed * 0.8) * (waveHeight * 0.15);

      // Appliquer la combinaison des vagues à la position Z du vertex
      positions[i + 2] = wave1 + wave2 + wave3 + wave4;
    }

    // Indiquer à Three.js que les positions ont changé
    positionAttribute.needsUpdate = true;

    // Recalculer les normales pour un éclairage correct
    mesh.geometry.computeVertexNormals();

    // Continuer l'animation
    requestAnimationFrame(animateWaves);
  }

  // Démarrer l'animation des vagues
  animateWaves();

  // Animation GSAP pour faire varier la couleur de l'eau
  animateWaterColor(waterMaterial);

  console.log('✅ Effet d\'eau initialisé avec succès !');
}

/**
 * Animation de la couleur de l'eau avec GSAP
 * Crée un effet de variation subtile de la teinte
 */
function animateWaterColor(material) {
  // Objet pour stocker les valeurs de couleur animées (plus clair)
  const colorValues = {
    r: 0.4,
    g: 0.8,
    b: 1.0
  };

  // Timeline GSAP pour animer la couleur en boucle
  const colorTimeline = gsap.timeline({ repeat: -1, yoyo: true });

  colorTimeline.to(colorValues, {
    r: 0.5,
    g: 0.85,
    b: 1.0,
    duration: 3,
    ease: "sine.inOut",
    onUpdate: function () {
      material.color.setRGB(colorValues.r, colorValues.g, colorValues.b);
    }
  });

  colorTimeline.to(colorValues, {
    r: 0.35,
    g: 0.75,
    b: 0.95,
    duration: 2,
    ease: "sine.inOut",
    onUpdate: function () {
      material.color.setRGB(colorValues.r, colorValues.g, colorValues.b);
    }
  });
}

/**
 * Animation des rayons de lumière sous-marins avec GSAP
 * Crée un effet dynamique de rayons qui oscillent doucement
 */
function initSpotlightAnimations() {
  // Rayon central - légère oscillation
  const sunray1 = document.querySelector('#sunray-1');
  if (sunray1) {
    gsap.to(sunray1.object3D.rotation, {
      x: -1.65, // légère oscillation autour de -90°
      duration: 4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
    // Variation d'intensité
    gsap.to({ intensity: 3 }, {
      intensity: 4,
      duration: 3,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      onUpdate: function () {
        sunray1.setAttribute('light', 'intensity', this.targets()[0].intensity);
      }
    });
  }

  // Rayon 2 - mouvement latéral
  const sunray2 = document.querySelector('#sunray-2');
  if (sunray2) {
    gsap.to(sunray2.object3D.position, {
      x: -2,
      z: -5,
      duration: 6,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
  }

  // Rayon 3 - mouvement opposé
  const sunray3 = document.querySelector('#sunray-3');
  if (sunray3) {
    gsap.to(sunray3.object3D.position, {
      x: 6,
      z: 0,
      duration: 5,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
  }

  // Rayon 4 et 5 - variation d'intensité décalée
  const sunray4 = document.querySelector('#sunray-4');
  const sunray5 = document.querySelector('#sunray-5');

  if (sunray4) {
    gsap.to({ intensity: 2 }, {
      intensity: 3.5,
      duration: 4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      onUpdate: function () {
        sunray4.setAttribute('light', 'intensity', this.targets()[0].intensity);
      }
    });
  }

  if (sunray5) {
    gsap.to({ intensity: 2 }, {
      intensity: 3,
      duration: 5,
      delay: 1,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      onUpdate: function () {
        sunray5.setAttribute('light', 'intensity', this.targets()[0].intensity);
      }
    });
  }

  console.log('✅ Animations des rayons sous-marins initialisées !');
}

/**
 * Effet de montée de l'eau qui noie progressivement l'utilisateur
 * Le volume d'eau grandit en hauteur jusqu'à submerger la caméra
 */
function initWaterRising() {
  const waterVolume = document.querySelector('#water-volume');
  const waterSurface = document.querySelector('#water-surface');
  const underwaterSphere = document.querySelector('#underwater-sphere');

  // Hauteur finale de l'eau (au-dessus de la tête du joueur)
  const endHeight = 5;
  // Hauteur des yeux du joueur
  const eyeLevel = 1.6;

  // Durée de la montée en secondes
  const riseDuration = 30;

  // Objet pour tracker la hauteur de l'eau
  const waterState = { height: 0.1 };

  // Variable pour suivre l'état sous l'eau
  let isUnderwater = false;

  // Animation de montée de l'eau avec GSAP
  gsap.to(waterState, {
    height: endHeight,
    duration: riseDuration,
    delay: 3,
    ease: "linear",
    onUpdate: function () {
      // Mettre à jour la hauteur du volume d'eau
      // La boîte grandit depuis le bas (position Y = hauteur/2)
      const currentHeight = waterState.height;
      waterVolume.setAttribute('height', currentHeight);
      waterVolume.setAttribute('position', `0 ${currentHeight / 2} 0`);

      // Déplacer la surface de l'eau au sommet du volume
      waterSurface.setAttribute('position', `0 ${currentHeight} 0`);

      // Vérifier si l'eau atteint le niveau des yeux
      checkUnderwaterState(currentHeight, eyeLevel);
    }
  });

  // Faire monter les rayons de lumière avec l'eau
  const sunrays = ['#sunray-1', '#sunray-2', '#sunray-3', '#sunray-4', '#sunray-5'];
  sunrays.forEach((rayId, index) => {
    const ray = document.querySelector(rayId);
    if (ray) {
      const initialY = parseFloat(ray.getAttribute('position').y) || 20;
      const rayState = { y: initialY };
      gsap.to(rayState, {
        y: initialY + endHeight,
        duration: riseDuration,
        delay: 3,
        ease: "linear",
        onUpdate: function () {
          const currentPos = ray.getAttribute('position');
          ray.setAttribute('position', `${currentPos.x} ${rayState.y} ${currentPos.z}`);
        }
      });
    }
  });

  /**
   * Vérifie si le joueur est sous l'eau et applique les effets visuels
   */
  function checkUnderwaterState(waterY, playerEyeY) {
    const wasUnderwater = isUnderwater;
    isUnderwater = waterY >= playerEyeY;

    // Transition quand on passe sous l'eau
    if (isUnderwater && !wasUnderwater) {
      transitionToUnderwater();
    }
  }

  /**
   * Applique les effets visuels quand le joueur est submergé
   * Utilise des spotlights pour créer l'ambiance sous-marine
   */
  function transitionToUnderwater() {
    console.log('🌊 Joueur submergé !');

    // Activer les spotlights sous-marins
    const underwaterLight1 = document.querySelector('#underwater-light-1');
    const underwaterLight2 = document.querySelector('#underwater-light-2');
    const underwaterLight3 = document.querySelector('#underwater-light-3');

    // Allumer progressivement les lumières sous-marines
    if (underwaterLight1) {
      gsap.to({ intensity: 0 }, {
        intensity: 3,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: function () {
          underwaterLight1.setAttribute('light', 'intensity', this.targets()[0].intensity);
        }
      });
    }

    if (underwaterLight2) {
      gsap.to({ intensity: 0 }, {
        intensity: 2,
        duration: 2.5,
        delay: 0.3,
        ease: "power2.inOut",
        onUpdate: function () {
          underwaterLight2.setAttribute('light', 'intensity', this.targets()[0].intensity);
        }
      });
    }

    if (underwaterLight3) {
      gsap.to({ intensity: 0 }, {
        intensity: 2,
        duration: 2.5,
        delay: 0.5,
        ease: "power2.inOut",
        onUpdate: function () {
          underwaterLight3.setAttribute('light', 'intensity', this.targets()[0].intensity);
        }
      });
    }

    // Diminuer les rayons de soleil (sunrays) pour effet de profondeur
    const sunrays = ['#sunray-1', '#sunray-2', '#sunray-3', '#sunray-4', '#sunray-5'];
    sunrays.forEach((rayId, index) => {
      const ray = document.querySelector(rayId);
      if (ray) {
        gsap.to({ intensity: parseFloat(ray.getAttribute('light').intensity) || 2 }, {
          intensity: 0.5,
          duration: 3,
          delay: index * 0.2,
          ease: "power2.inOut",
          onUpdate: function () {
            ray.setAttribute('light', 'intensity', this.targets()[0].intensity);
          }
        });
      }
    });

    // Faire apparaître un léger overlay (très subtil)
    if (underwaterSphere) {
      gsap.to({ opacity: 0 }, {
        opacity: 0.15,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: function () {
          underwaterSphere.setAttribute('material', 'opacity', this.targets()[0].opacity);
        }
      });
    }

    // Ajouter des bulles qui montent (effet visuel)
    createBubbles();

    // Animer les spotlights sous-marins pour un effet dynamique
    animateUnderwaterLights();
  }

  /**
   * Anime les lumières sous-marines pour un effet de caustiques
   */
  function animateUnderwaterLights() {
    const lights = ['#underwater-light-1', '#underwater-light-2', '#underwater-light-3'];

    lights.forEach((lightId, index) => {
      const light = document.querySelector(lightId);
      if (light) {
        // Animation d'intensité pulsante
        gsap.to({ intensity: 2 + index }, {
          intensity: 3.5 + index * 0.5,
          duration: 2 + index * 0.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          onUpdate: function () {
            light.setAttribute('light', 'intensity', this.targets()[0].intensity);
          }
        });

        // Animation de mouvement léger
        const pos = light.getAttribute('position');
        gsap.to(light.object3D.position, {
          x: pos.x + (Math.random() - 0.5) * 3,
          z: pos.z + (Math.random() - 0.5) * 3,
          duration: 4 + index,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true
        });
      }
    });
  }

  /**
   * Crée des bulles qui montent pour l'effet sous-marin
   */
  function createBubbles() {
    const scene = document.querySelector('a-scene');
    const numBubbles = 20;

    for (let i = 0; i < numBubbles; i++) {
      setTimeout(() => {
        const bubble = document.createElement('a-sphere');
        const size = 0.02 + Math.random() * 0.05;
        const startX = (Math.random() - 0.5) * 4;
        const startZ = (Math.random() - 0.5) * 4;
        const startY = 0.5 + Math.random() * 1;

        bubble.setAttribute('radius', size);
        bubble.setAttribute('position', `${startX} ${startY} ${startZ}`);
        bubble.setAttribute('material', 'color: #aaddff; opacity: 0.6; transparent: true');
        bubble.classList.add('bubble');

        scene.appendChild(bubble);

        // Animation de montée de la bulle
        gsap.to(bubble.object3D.position, {
          y: startY + 3 + Math.random() * 2,
          x: startX + (Math.random() - 0.5) * 0.5,
          duration: 3 + Math.random() * 2,
          ease: "power1.out",
          onComplete: function () {
            bubble.remove(); // Supprimer la bulle une fois en haut
          }
        });

        // Faire grossir légèrement la bulle en montant
        gsap.to(bubble.object3D.scale, {
          x: 1.3,
          y: 1.3,
          z: 1.3,
          duration: 3,
          ease: "power1.out"
        });
      }, i * 200); // Espacement entre chaque bulle
    }

    // Continuer à créer des bulles tant qu'on est sous l'eau
    setTimeout(() => {
      if (isUnderwater) {
        createBubbles();
      }
    }, 4000);
  }

  console.log('✅ Effet de montée de l\'eau initialisé !');
}
