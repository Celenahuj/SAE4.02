// Système de gestion des armes avec localStorage
(function () {
  const WEAPON_KEY = 'spearfisher_selected_weapon';
  const DEFAULT_WEAPON = 'spear';
  
  const WEAPONS_CONFIG = {
    spear: {
      name: 'Harpon',
      model: '#spear-model',
      scale: '0.5 0.5 0.5',
      offset: '0 0 0',          // Pas d'offset pour le modèle
      entityPos: '0 1.45 -0.8', // Position normale
      icon: '🔱'
    },
    trident: {
      name: 'Trident',
      model: '#trident-model',
      scale: '0.27 0.27 0.27',   // Échelle légèrement réduite
      offset: '0.15 -0.05 0.05',      // Offset X pour centrer (déplacer vers la droite)
      rotation: '0 90 0',        // Rotation pour aligner avec le mouvement
      entityPos: '0 1.45 -0.8',  // Position fixe attrapable
      icon: '🔱'
    },
    harpoon: {
      name: 'Flèche',
      model: '#harpoon-model',
      scale: '0.45 0.45 0.45',
      offset: '0 0 0',
      entityPos: '0 1.45 -0.8',
      icon: '➳'
    }
  };

  let currentWeapon = DEFAULT_WEAPON;

  // Fonction pour sauvegarder le choix d'arme dans localStorage
  function saveWeaponChoice(weaponId) {
    try {
      localStorage.setItem(WEAPON_KEY, weaponId);
      currentWeapon = weaponId;
      console.log(`🗡️ Arme sélectionnée: ${WEAPONS_CONFIG[weaponId].name}`);
      return true;
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde du choix d\'arme:', e);
      return false;
    }
  }

  // Fonction pour charger le choix d'arme depuis localStorage
  function loadWeaponChoice() {
    try {
      const savedWeapon = localStorage.getItem(WEAPON_KEY);
      if (savedWeapon && WEAPONS_CONFIG[savedWeapon]) {
        currentWeapon = savedWeapon;
        console.log(`🗡️ Arme chargée: ${WEAPONS_CONFIG[savedWeapon].name}`);
        return savedWeapon;
      }
      return DEFAULT_WEAPON;
    } catch (e) {
      console.warn('Erreur lors du chargement du choix d\'arme:', e);
      return DEFAULT_WEAPON;
    }
  }

  // Fonction pour obtenir l'arme actuellement sélectionnée
  function getCurrentWeapon() {
    return currentWeapon;
  }

  // Fonction pour obtenir la configuration d'une arme
  function getWeaponConfig(weaponId) {
    return WEAPONS_CONFIG[weaponId] || WEAPONS_CONFIG[DEFAULT_WEAPON];
  }

  // Fonction pour appliquer l'arme sélectionnée à l'entité spear dans la scène
  function applyWeaponToScene() {
    const weaponId = getCurrentWeapon();
    const config = getWeaponConfig(weaponId);
    
    console.log(`🗡️ Application de l'arme: ${config.name} (${weaponId})`);
    
    // Attendre que la scène soit chargée
    const scene = document.querySelector('a-scene');
    if (!scene) {
      console.warn('⚠️ Scène A-Frame non trouvée');
      return;
    }

    const applyWeapon = () => {
      const spearEntity = document.querySelector('#spear');
      const modelContainer = document.querySelector('#weapon-3d-model');
      
      if (!spearEntity) {
        console.warn('⚠️ Entité #spear non trouvée');
        return;
      }
      if (!modelContainer) {
        console.warn('⚠️ Entité #weapon-3d-model non trouvée');
        return;
      }

      // Retirer l'ancien modèle du conteneur
      modelContainer.removeAttribute('gltf-model');
      console.log('🗑️ Ancien modèle retiré');
      
      setTimeout(() => {
        // Charger le modèle sur le conteneur enfant avec offset
        modelContainer.setAttribute('gltf-model', config.model);
        modelContainer.setAttribute('scale', config.scale);
        modelContainer.setAttribute('position', config.offset || '0 0 0');
        modelContainer.setAttribute('rotation', config.rotation || '0 0 0');
        
        // Ajuster la position de l'entité parente pour compenser l'offset
        spearEntity.setAttribute('position', config.entityPos || '0 1.45 -0.8');
        spearEntity.setAttribute('visible', 'true');
        
        console.log(`✅ Arme configurée: ${config.name}`);
        console.log(`   Modèle: ${config.model}`);
        console.log(`   Échelle: ${config.scale}`);
        console.log(`   Offset modèle: ${config.offset}`);
        console.log(`   Position entité: ${config.entityPos}`);
        
        // Vérifier le chargement
        setTimeout(() => {
          const hasModel = modelContainer.components['gltf-model'];
          if (hasModel && hasModel.model) {
            console.log('   ✅ Modèle 3D chargé avec succès');
            
            // Vérifier la taille du modèle
            const box = new THREE.Box3().setFromObject(hasModel.model);
            const size = box.getSize(new THREE.Vector3());
            console.log(`   📏 Taille du modèle: x=${size.x.toFixed(3)} y=${size.y.toFixed(3)} z=${size.z.toFixed(3)}`);
            console.log(`   📦 BoundingBox: min(${box.min.x.toFixed(2)},${box.min.y.toFixed(2)},${box.min.z.toFixed(2)}) max(${box.max.x.toFixed(2)},${box.max.y.toFixed(2)},${box.max.z.toFixed(2)})`);
            
            // Si le modèle est trop petit, le signaler
            if (size.x < 0.1 && size.y < 0.1 && size.z < 0.1) {
              console.warn(`   ⚠️ MODÈLE TRÈS PETIT ! Il faut augmenter l'échelle.`);
            }
          } else {
            console.warn(`   ⚠️ Modèle 3D non chargé !`);
          }
        }, 1000);
      }, 50);
    };

    // Si la scène est déjà chargée, appliquer immédiatement
    if (scene.hasLoaded) {
      applyWeapon();
    } else {
      // Sinon, attendre que la scène soit chargée
      scene.addEventListener('loaded', applyWeapon, { once: true });
    }
  }

  // Fonction d'initialisation de l'écran de choix d'arme
  function initWeaponChoiceUI() {
    const weaponChoiceScreen = document.getElementById('weapon-choice-screen');
    const weaponCards = document.querySelectorAll('.weapon-card');
    const btnValidate = document.getElementById('btn-validate-weapon');

    console.log('🔧 Initialisation UI choix d\'arme...');
    console.log('   Screen trouvé:', !!weaponChoiceScreen);
    console.log('   Cartes trouvées:', weaponCards.length);
    console.log('   Bouton trouvé:', !!btnValidate);

    if (!weaponChoiceScreen || !btnValidate) {
      console.warn('⚠️ Écran de choix d\'arme non trouvé');
      return;
    }

    if (weaponCards.length === 0) {
      console.warn('⚠️ Aucune carte d\'arme trouvée !');
      return;
    }

    let selectedWeapon = loadWeaponChoice();

    // Pré-sélectionner l'arme sauvegardée
    const savedCard = document.querySelector(`.weapon-card[data-weapon="${selectedWeapon}"]`);
    if (savedCard) {
      savedCard.classList.add('selected');
      btnValidate.disabled = false;
      console.log('✅ Arme pré-sélectionnée:', selectedWeapon);
    }

    // Gérer la sélection d'arme
    weaponCards.forEach((card, index) => {
      const weaponId = card.getAttribute('data-weapon');
      console.log(`   Attaching click to card ${index}:`, weaponId);
      
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('🖱️ Clic sur carte:', weaponId);
        
        // Retirer la sélection de toutes les cartes
        weaponCards.forEach(c => c.classList.remove('selected'));
        
        // Sélectionner la carte cliquée
        card.classList.add('selected');
        
        // Récupérer l'ID de l'arme
        selectedWeapon = weaponId;
        
        // Activer le bouton de validation
        btnValidate.disabled = false;
        
        console.log(`✅ Arme sélectionnée: ${selectedWeapon}`);
      }, { passive: false });
    });

    console.log('✅ Event listeners attachés à', weaponCards.length, 'cartes');

    // Gérer la validation
    btnValidate.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('🖱️ Clic sur bouton Valider');
      
      if (selectedWeapon) {
        console.log(`📝 Sauvegarde de l'arme: ${selectedWeapon}`);
        
        // Sauvegarder le choix
        saveWeaponChoice(selectedWeapon);
        
        // Appliquer l'arme à la scène
        applyWeaponToScene();
        
        // Masquer l'écran de choix d'arme
        weaponChoiceScreen.style.display = 'none';
        console.log('👁️ Écran de choix masqué');
        
        // Afficher l'écran AR ou démarrer le jeu
        const arOverlay = document.getElementById('ar-overlay');
        if (arOverlay) {
          arOverlay.style.display = 'flex';
          console.log('👁️ Écran AR affiché');
        }
        
        console.log(`✅ Validation de l'arme: ${WEAPONS_CONFIG[selectedWeapon].name}`);
      } else {
        console.warn('⚠️ Aucune arme sélectionnée !');
      }
    }, { passive: false });
    
    console.log('✅ UI choix d\'arme complètement initialisée');
  }

  // Exporter l'API globale
  window.weaponManager = {
    saveWeaponChoice,
    loadWeaponChoice,
    getCurrentWeapon,
    getWeaponConfig,
    applyWeaponToScene,
    initWeaponChoiceUI,
    WEAPONS_CONFIG
  };

  // Initialiser l'UI au chargement du DOM
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initWeaponChoiceUI, 100);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initWeaponChoiceUI, 100);
    });
  }

  // Charger et appliquer l'arme sauvegardée au démarrage de la scène
  const initWeaponOnSceneLoad = () => {
    // Charger l'arme depuis localStorage
    const savedWeapon = loadWeaponChoice();
    console.log('🗡️ Arme à charger au démarrage:', savedWeapon);
    
    // Appliquer l'arme à la scène dès qu'elle est prête
    const scene = document.querySelector('a-scene');
    if (scene) {
      // Appliquer immédiatement si la scène est déjà là
      applyWeaponToScene();
      
      // Et aussi après le chargement complet pour être sûr
      if (!scene.hasLoaded) {
        scene.addEventListener('loaded', () => {
          console.log('🗡️ Scène chargée - réapplication de l\'arme');
          applyWeaponToScene();
        }, { once: true });
      }
    }
  };

  // Initialiser dès que possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeaponOnSceneLoad);
  } else {
    // DOM déjà chargé, initialiser immédiatement
    initWeaponOnSceneLoad();
  }

  console.log('🗡️ Weapon Manager initialisé');
})();
