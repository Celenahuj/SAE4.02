// ============================================
// COMPOSANT ROOM-DETECTION : Détection complète de l'environnement
// Code complet du professeur BenoitCrespin
// https://github.com/BenoitCrespin/SAE4.DWeb-DI.02-XR/
// ============================================
AFRAME.registerComponent('room-detection', {
  schema: {
    debug: { type: 'boolean', default: true },
    scanDuration: { type: 'number', default: 15000 },
    showPlanes: { type: 'boolean', default: true },
    continuousDetection: { type: 'boolean', default: true }
  },

  init: function () {
    // Bounds de la pièce
    this.roomBounds = {
      minX: Infinity, maxX: -Infinity,
      minY: Infinity, maxY: -Infinity,
      minZ: Infinity, maxZ: -Infinity
    };

    // Stockage des plans détectés par catégorie (approche du professeur)
    this.detectedPlanes = new Map();
    this.floorPlanes = [];      // Sols (horizontal bas)
    this.ceilingPlanes = [];    // Plafonds (horizontal haut)
    this.wallPlanes = [];       // Murs (vertical)
    this.obstaclePlanes = [];   // Obstacles (tables, meubles - horizontal milieu)

    // Hit-test (style du professeur)
    this.hitTestSource = null;              // Hit-test depuis la vue (viewer)
    this.controllerHitTestSource = null;    // Hit-test depuis le contrôleur droit
    this.hitTestSourceRequested = false;
    this.controllerHitTestRequested = false;
    this.hitSurfaces = new Map();           // Surfaces détectées
    this.cursorEl = null;                   // Curseur visuel de détection

    // Visualisations
    this.planeMeshes = [];

    // État du scan
    this.isScanning = false;
    this.scanComplete = false;
    this.scanStartTime = 0;
    this.floorY = 0;

    // Sessions XR
    this.xrSession = null;
    this.xrRefSpace = null;

    // Créer l'interface de scan
    this.createScanUI();

    // Écouter les événements XR
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterXR.bind(this));
    this.el.sceneEl.addEventListener('exit-vr', this.onExitXR.bind(this));

    console.log('🏠 Room detection initialisé - Approche du professeur Benoit Crespin');
  },

  createScanUI: function () {
    // Panneau d'information de scan visible en VR
    this.scanPanel = document.createElement('a-entity');
    this.scanPanel.setAttribute('id', 'scan-panel');
    this.scanPanel.setAttribute('position', '0 1.5 -1.5');
    this.scanPanel.setAttribute('visible', 'false');

    // Fond du panneau
    const background = document.createElement('a-plane');
    background.setAttribute('width', '1.4');
    background.setAttribute('height', '0.7');
    background.setAttribute('color', '#000');
    background.setAttribute('opacity', '0.85');
    background.setAttribute('shader', 'flat');
    this.scanPanel.appendChild(background);

    // Titre
    this.scanTitle = document.createElement('a-text');
    this.scanTitle.setAttribute('value', '🔍 SCAN DE LA PIECE');
    this.scanTitle.setAttribute('align', 'center');
    this.scanTitle.setAttribute('color', '#00ff00');
    this.scanTitle.setAttribute('width', '2.2');
    this.scanTitle.setAttribute('position', '0 0.22 0.01');
    this.scanPanel.appendChild(this.scanTitle);

    // Texte d'instructions
    this.scanText = document.createElement('a-text');
    this.scanText.setAttribute('value', 'Regardez les surfaces\nPointez les tables avec la manette');
    this.scanText.setAttribute('align', 'center');
    this.scanText.setAttribute('color', '#ffffff');
    this.scanText.setAttribute('width', '1.8');
    this.scanText.setAttribute('position', '0 0.06 0.01');
    this.scanPanel.appendChild(this.scanText);

    // Compteur de surfaces
    this.surfaceCount = document.createElement('a-text');
    this.surfaceCount.setAttribute('value', 'Surfaces: 0');
    this.surfaceCount.setAttribute('align', 'center');
    this.surfaceCount.setAttribute('color', '#00ffff');
    this.surfaceCount.setAttribute('width', '1.5');
    this.surfaceCount.setAttribute('position', '0 -0.08 0.01');
    this.scanPanel.appendChild(this.surfaceCount);

    // Fond barre de progression
    const progressBg = document.createElement('a-plane');
    progressBg.setAttribute('width', '1.1');
    progressBg.setAttribute('height', '0.05');
    progressBg.setAttribute('color', '#333');
    progressBg.setAttribute('position', '0 -0.26 0.01');
    this.scanPanel.appendChild(progressBg);

    // Barre de progression
    this.progressBar = document.createElement('a-plane');
    this.progressBar.setAttribute('width', '0.01');
    this.progressBar.setAttribute('height', '0.05');
    this.progressBar.setAttribute('color', '#00ff00');
    this.progressBar.setAttribute('position', '-0.545 -0.26 0.02');
    this.scanPanel.appendChild(this.progressBar);

    this.el.sceneEl.appendChild(this.scanPanel);
  },

  onEnterXR: function () {
    console.log('🥽 Entrée en mode XR - Démarrage du scan');

    // Attendre que la session soit prête
    setTimeout(() => {
      this.initializeXRSession();
    }, 1000);
  },

  initializeXRSession: async function () {
    const renderer = this.el.sceneEl.renderer;
    if (!renderer?.xr) {
      console.warn('❌ Renderer XR non disponible');
      return;
    }

    this.xrSession = renderer.xr.getSession();
    this.xrRefSpace = renderer.xr.getReferenceSpace();

    if (!this.xrSession) {
      console.warn('❌ Session XR non disponible');
      return;
    }

    // Vérifier les features
    if (this.xrSession.enabledFeatures) {
      const features = Array.from(this.xrSession.enabledFeatures);
      console.log('✅ Features XR activées:', features);

      if (features.includes('plane-detection')) {
        console.log('✅ Plane detection disponible !');
      }
      if (features.includes('mesh-detection')) {
        console.log('✅ Mesh detection disponible !');
      }
      if (features.includes('hit-test')) {
        console.log('✅ Hit-test disponible !');
      }
    }

    // Initialiser le hit-test source (comme le professeur)
    // On utilise le viewer space pour scanner ce qu'on regarde
    try {
      const viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
      this.hitTestSource = await this.xrSession.requestHitTestSource({
        space: viewerSpace
      });
      console.log('✅ Hit-test source créé (viewer space)');
    } catch (error) {
      console.warn('⚠️ Hit-test viewer non disponible:', error.message);
    }

    // Créer un curseur visuel pour montrer où on pointe
    this.createScanCursor();

    // Démarrer le scan
    this.startScan();
  },

  // Créer un curseur visuel pour indiquer les surfaces détectées
  createScanCursor: function () {
    this.cursorEl = document.createElement('a-entity');
    this.cursorEl.setAttribute('id', 'scan-cursor');

    // Anneau externe
    const ring1 = document.createElement('a-ring');
    ring1.setAttribute('radius-inner', '0.04');
    ring1.setAttribute('radius-outer', '0.06');
    ring1.setAttribute('color', '#00ff00');
    ring1.setAttribute('opacity', '0.8');
    ring1.setAttribute('rotation', '-90 0 0');
    this.cursorEl.appendChild(ring1);

    // Anneau interne
    const ring2 = document.createElement('a-ring');
    ring2.setAttribute('radius-inner', '0.01');
    ring2.setAttribute('radius-outer', '0.02');
    ring2.setAttribute('color', '#ffffff');
    ring2.setAttribute('opacity', '0.9');
    ring2.setAttribute('rotation', '-90 0 0');
    this.cursorEl.appendChild(ring2);

    this.cursorEl.object3D.visible = false;
    this.el.sceneEl.appendChild(this.cursorEl);
  },

  startScan: function () {
    if (this.scanComplete) return;

    this.isScanning = true;
    this.scanStartTime = Date.now();
    this.scanPanel.setAttribute('visible', 'true');

    console.log('🔍 Démarrage du scan de l\'environnement...');
    console.log('💡 Regardez les tables et surfaces pour les détecter !');

    // Programmer la fin du scan
    setTimeout(() => {
      if (this.isScanning) {
        this.finishScan();
      }
    }, this.data.scanDuration);
  },

  onExitXR: function () {
    console.log('🚪 Sortie du mode XR');
    this.isScanning = false;
    this.scanPanel.setAttribute('visible', 'false');
    this.clearPlaneVisuals();

    // Nettoyer les hit-test sources
    if (this.hitTestSource) {
      this.hitTestSource.cancel();
      this.hitTestSource = null;
    }
    if (this.controllerHitTestSource) {
      this.controllerHitTestSource.cancel();
      this.controllerHitTestSource = null;
    }
    this.hitTestSourceRequested = false;
    this.controllerHitTestRequested = false;

    // Cacher le curseur
    if (this.cursorEl) {
      this.cursorEl.object3D.visible = false;
    }
  },

  tick: function (time, deltaTime) {
    // Continuer même après le scan si continuousDetection est activé
    const shouldDetect = this.isScanning ||
      (this.data.continuousDetection && this.scanComplete);

    if (!shouldDetect || !this.xrSession || !this.xrRefSpace) return;

    // Mettre à jour la barre de progression pendant le scan
    if (this.isScanning) {
      const elapsed = Date.now() - this.scanStartTime;
      const progress = Math.min(elapsed / this.data.scanDuration, 1);
      const width = 1.1 * progress;
      this.progressBar.setAttribute('width', Math.max(0.01, width));
      this.progressBar.setAttribute('position', `${-0.55 + width / 2} -0.26 0.02`);
    }

    // Détecter les plans et utiliser hit-test
    this.detectPlanes();
    this.performHitTest();
  },

  // Hit-test pour détecter précisément ce qu'on regarde (comme le professeur)
  performHitTest: function () {
    const renderer = this.el.sceneEl.renderer;
    if (!renderer?.xr) return;

    const frame = renderer.xr.getFrame();
    if (!frame) return;

    // Essayer aussi de créer un hit-test source pour le contrôleur droit
    // (comme le professeur fait dans son code)
    if (!this.controllerHitTestSource && this.xrSession) {
      this.trySetupControllerHitTest(frame);
    }

    // Hit-test depuis la vue (regarder les surfaces)
    this.processHitTestSource(frame, this.hitTestSource, 'viewer');

    // Hit-test depuis le contrôleur (pointer les surfaces)
    this.processHitTestSource(frame, this.controllerHitTestSource, 'controller');
  },

  trySetupControllerHitTest: function (frame) {
    // Approche du professeur : chercher le contrôleur droit dynamiquement
    if (this.controllerHitTestRequested || !this.xrSession) return;

    try {
      const inputSources = this.xrSession.inputSources;

      // Chercher la manette droite (comme le professeur le fait)
      for (let inputSource of inputSources) {
        if (inputSource.handedness === 'right' && inputSource.targetRaySpace) {
          this.controllerHitTestRequested = true;
          this.xrSession.requestHitTestSource({ space: inputSource.targetRaySpace })
            .then((source) => {
              this.controllerHitTestSource = source;
              if (this.data.debug) {
                console.log('✅ Hit-test contrôleur droit créé - Pointez les tables !');
              }
            })
            .catch((error) => {
              if (this.data.debug) {
                console.warn('⚠️ Hit-test contrôleur non disponible:', error.message);
              }
            });
          break;
        }
      }
    } catch (error) {
      // Silently ignore errors
    }
  },

  processHitTestSource: function (frame, hitTestSource, sourceType) {
    // Approche du professeur : traiter les résultats du hit-test avec filtrage intelligent
    if (!hitTestSource) return;

    try {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];  // Prendre le premier résultat (plus proche)
        const hitPose = hit.getPose(this.xrRefSpace);

        if (hitPose) {
          const pos = hitPose.transform.position;
          const orient = hitPose.transform.orientation;

          // Mettre à jour le curseur visuel pour le viewer (style professeur)
          if (sourceType === 'viewer' && this.cursorEl && this.isScanning) {
            this.cursorEl.object3D.visible = true;
            this.cursorEl.object3D.position.set(pos.x, pos.y, pos.z);
            this.cursorEl.object3D.quaternion.set(orient.x, orient.y, orient.z, orient.w);

            // Couleur selon la hauteur (comme le professeur)
            const rings = this.cursorEl.querySelectorAll('a-ring');
            if (pos.y > 0.55 && pos.y <= 1.0) {
              rings.forEach(r => r.setAttribute('color', '#ff8800')); // Table probable
            } else if (pos.y < 0.25) {
              rings.forEach(r => r.setAttribute('color', '#00ff00')); // Sol
            } else {
              rings.forEach(r => r.setAttribute('color', '#00ffff')); // Autre
            }
          }

          // Pour le contrôleur, appliquer le filtrage du professeur
          if (sourceType === 'controller' && this.xrSession) {
            // Vérifier la distance comme le professeur le fait (éviter la main)
            const inputSources = this.xrSession.inputSources;
            let rightController = null;

            for (let inputSource of inputSources) {
              if (inputSource.handedness === 'right') {
                rightController = inputSource;
                break;
              }
            }

            if (rightController && rightController.targetRaySpace) {
              const controllerPose = frame.getPose(rightController.targetRaySpace, this.xrRefSpace);
              if (controllerPose) {
                const dx = pos.x - controllerPose.transform.position.x;
                const dy = pos.y - controllerPose.transform.position.y;
                const dz = pos.z - controllerPose.transform.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // N'accepter que si distance > 0.5m (méthode du professeur)
                if (distance <= 0.5) {
                  if (this.cursorEl) this.cursorEl.object3D.visible = false;
                  return;
                }
              }
            }
          }

          // Grille pour éviter les doublons
          const gridSize = sourceType === 'controller' ? 20 : 10;
          const key = `${sourceType}_${Math.round(pos.x * gridSize)}_${Math.round(pos.y * gridSize)}_${Math.round(pos.z * gridSize)}`;

          // Enregistrer la surface si nouvelle
          if (!this.hitSurfaces.has(key)) {
            this.hitSurfaces.set(key, {
              position: { x: pos.x, y: pos.y, z: pos.z },
              orientation: { x: orient.x, y: orient.y, z: orient.z, w: orient.w },
              sourceType: sourceType,
              timestamp: Date.now()
            });

            // Mettre à jour les bounds
            this.roomBounds.minX = Math.min(this.roomBounds.minX, pos.x);
            this.roomBounds.maxX = Math.max(this.roomBounds.maxX, pos.x);
            this.roomBounds.minY = Math.min(this.roomBounds.minY, pos.y);
            this.roomBounds.maxY = Math.max(this.roomBounds.maxY, pos.y);
            this.roomBounds.minZ = Math.min(this.roomBounds.minZ, pos.z);
            this.roomBounds.maxZ = Math.max(this.roomBounds.maxZ, pos.z);

            if (this.data.debug && this.isScanning && sourceType === 'controller') {
              const dx = pos.x - (rightController ? frame.getPose(rightController.targetRaySpace, this.xrRefSpace).transform.position.x : 0);
              const dy = pos.y - (rightController ? frame.getPose(rightController.targetRaySpace, this.xrRefSpace).transform.position.y : 0);
              const dz = pos.z - (rightController ? frame.getPose(rightController.targetRaySpace, this.xrRefSpace).transform.position.z : 0);
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              console.log(`🎯 Surface détectée à y=${pos.y.toFixed(2)}m (distance: ${dist.toFixed(2)}m)`);
            }
          }
        }
      } else if (sourceType === 'viewer' && this.cursorEl) {
        this.cursorEl.object3D.visible = false;
      }
    } catch (error) {
      // Silently ignore errors
    }
  },

  detectPlanes: function () {
    const renderer = this.el.sceneEl.renderer;
    if (!renderer?.xr) return;

    const frame = renderer.xr.getFrame();
    if (!frame) return;

    // Vérifier si la détection de plans est disponible
    if (!frame.detectedPlanes) return;

    const detectedPlanes = frame.detectedPlanes;
    let newPlanesCount = 0;

    detectedPlanes.forEach((plane) => {
      // Ignorer les plans déjà traités
      if (this.detectedPlanes.has(plane)) return;

      const planePose = frame.getPose(plane.planeSpace, this.xrRefSpace);
      if (!planePose) return;

      const position = planePose.transform.position;
      const orientation = planePose.transform.orientation;
      const polygon = plane.polygon;

      if (!polygon || polygon.length < 3) return;

      newPlanesCount++;

      // Stocker le plan
      const planeData = {
        position: { x: position.x, y: position.y, z: position.z },
        orientation: { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w },
        polygon: polygon,
        type: plane.orientation,
        pose: planePose
      };
      this.detectedPlanes.set(plane, planeData);

      // Classifier le plan selon son orientation et sa hauteur
      this.classifyPlane(plane, planeData);

      // Mettre à jour les bounds avec la pose complète
      this.updateBoundsFromPolygon(planePose, polygon);

      // Créer la visualisation
      if (this.data.showPlanes) {
        this.createPlaneVisual(plane, planeData);
      }

      if (this.data.debug) {
        console.log(`📋 ${plane.orientation} détecté: y=${position.y.toFixed(2)}m, vertices=${polygon.length}`);
      }
    });

    // Mettre à jour l'UI
    if (newPlanesCount > 0) {
      this.updateScanUI();
    }
  },

  classifyPlane: function (plane, planeData) {
    // Approche du professeur : classification robuste basée sur la pose réelle
    const pose = planeData.pose;
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);

    // Transformer tous les vertices pour avoir les vraies coordonnées
    const polygon = planeData.polygon;
    let avgY = planeData.position.y;
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    if (polygon && polygon.length > 0) {
      let sumY = 0;
      polygon.forEach(v => {
        const vec = new THREE.Vector3(v.x, v.y, v.z);
        vec.applyMatrix4(matrix);
        sumY += vec.y;
        minX = Math.min(minX, vec.x);
        maxX = Math.max(maxX, vec.x);
        minY = Math.min(minY, vec.y);
        maxY = Math.max(maxY, vec.y);
        minZ = Math.min(minZ, vec.z);
        maxZ = Math.max(maxZ, vec.z);
      });
      avgY = sumY / polygon.length;
    }

    // Calculer taille et aire (méthode du professeur)
    const planeWidth = maxX - minX;
    const planeDepth = maxZ - minZ;
    const planeArea = planeWidth * planeDepth;
    const heightVariance = maxY - minY;  // Vérifier si c'est vraiment plat

    // Stocker les infos
    planeData.worldY = avgY;
    planeData.dimensions = { width: planeWidth, depth: planeDepth, area: planeArea };
    planeData.bounds = { minX, maxX, minY, maxY, minZ, maxZ };

    // Classification AMÉLIORÉE POUR LES TABLES
    if (plane.orientation === 'horizontal') {
      if (avgY < 0.3) {
        // SOL - hauteur basse
        this.floorPlanes.push({ plane, data: planeData });
        this.floorY = Math.max(this.floorY, avgY);
        if (this.data.debug) {
          console.log(`🟢 SOL: y=${avgY.toFixed(2)}m, size=${planeArea.toFixed(2)}m²`);
        }
      } else if (avgY > 2.0) {
        // PLAFOND - hauteur haute
        this.ceilingPlanes.push({ plane, data: planeData });
        if (this.data.debug) {
          console.log(`🔵 PLAFOND: y=${avgY.toFixed(2)}m`);
        }
      } else {
        // OBSTACLE (tables, meubles) - hauteur intermédiaire
        let type = 'obstacle';

        // DÉTECTION AMÉLIORÉE DES TABLES
        // Critères : hauteur + aire + surface plate
        const isTableHeight = avgY >= 0.50 && avgY <= 1.1;
        const isTableSize = planeArea >= 0.12;  // Réduit de 0.2 à 0.12
        const isFlat = heightVariance < 0.15;   // Surface plate

        if (isTableHeight && isTableSize && isFlat) {
          type = 'table';
          if (this.data.debug) {
            console.log(`🟡 TABLE DÉTECTÉE: y=${avgY.toFixed(2)}m, ${planeWidth.toFixed(2)}x${planeDepth.toFixed(2)}m, area=${planeArea.toFixed(2)}m²`);
          }
        }
        // Sous-classification pour les autres obstacles
        else if (avgY >= 0.25 && avgY < 0.50) {
          type = 'meuble_bas';
        } else if (avgY > 1.1 && avgY <= 1.4) {
          type = 'etagere';
        } else {
          type = 'obstacle';
        }

        planeData.obstacleType = type;
        this.obstaclePlanes.push({ plane, data: planeData });

        if (this.data.debug && type !== 'table') {
          console.log(`🟠 ${type.toUpperCase()}: y=${avgY.toFixed(2)}m, ${planeWidth.toFixed(2)}x${planeDepth.toFixed(2)}m`);
        }
      }
    } else if (plane.orientation === 'vertical') {
      // MUR
      this.wallPlanes.push({ plane, data: planeData });
      if (this.data.debug) {
        console.log(`🔷 MUR: pos=(${planeData.position.x.toFixed(2)}, ${planeData.position.z.toFixed(2)})`);
      }
    }
  },

  updateBoundsFromPolygon: function (pose, polygon) {
    // Utiliser la matrice de transformation pour convertir en coordonnées monde
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);

    polygon.forEach(vertex => {
      // Transformer le vertex local en coordonnées monde
      const worldPos = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
      worldPos.applyMatrix4(matrix);

      this.roomBounds.minX = Math.min(this.roomBounds.minX, worldPos.x);
      this.roomBounds.maxX = Math.max(this.roomBounds.maxX, worldPos.x);
      this.roomBounds.minY = Math.min(this.roomBounds.minY, worldPos.y);
      this.roomBounds.maxY = Math.max(this.roomBounds.maxY, worldPos.y);
      this.roomBounds.minZ = Math.min(this.roomBounds.minZ, worldPos.z);
      this.roomBounds.maxZ = Math.max(this.roomBounds.maxZ, worldPos.z);
    });
  },

  createPlaneVisual: function (plane, planeData) {
    const polygon = planeData.polygon;
    const pose = planeData.pose;

    if (!polygon || polygon.length < 3) return;

    // Calculer la hauteur Y moyenne pour la classification
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);
    const centerWorld = new THREE.Vector3(0, 0, 0).applyMatrix4(matrix);

    // Vérifier si c'est une table (amélioré)
    const isTable = plane.orientation === 'horizontal' &&
      planeData.obstacleType === 'table';

    if (isTable) {
      // Pour les tables, créer une visualisation TRÈS VISIBLE
      this.createTableVisual(polygon, matrix, planeData);
    } else {
      // Pour les autres plans, utiliser la géométrie classique
      this.createStandardPlaneVisual(polygon, matrix, planeData, plane, centerWorld);
    }
  },

  // Créer une visualisation très visible pour les tables
  createTableVisual: function (polygon, matrix, planeData) {
    // Créer les points du contour de la table
    const points = [];
    polygon.forEach(vertex => {
      points.push(new THREE.Vector3(vertex.x, vertex.y, vertex.z));
    });

    // Créer le contour avec une line très épaisse et très colorée
    const lineGeometry = new THREE.BufferGeometry();

    // Ajouter tous les points + fermer la boucle
    const closedPoints = [...points, points[0]];
    lineGeometry.setFromPoints(closedPoints);

    // Matériau pour le contour (JAUNE BRILLANT pour les tables)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffdd00,  // Jaune vif
      transparent: true,
      opacity: 1.0,
      linewidth: 5,
      fog: false
    });

    const lineSegments = new THREE.Line(lineGeometry, lineMaterial);
    lineSegments.matrixAutoUpdate = false;
    lineSegments.matrix.copy(matrix);

    this.el.sceneEl.object3D.add(lineSegments);
    this.planeMeshes.push(lineSegments);

    // Créer aussi une version transparente remplie JAUNE pour bien voir la surface
    const shape = new THREE.Shape();
    shape.moveTo(polygon[0].x, polygon[0].z);
    for (let i = 1; i < polygon.length; i++) {
      shape.lineTo(polygon[i].x, polygon[i].z);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      color: 0xffdd00,  // Jaune
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(matrix);

    this.el.sceneEl.object3D.add(mesh);
    this.planeMeshes.push(mesh);
  },

  // Créer une visualisation standard pour les autres plans
  createStandardPlaneVisual: function (polygon, matrix, planeData, plane, centerWorld) {
    // Créer un shape 2D à partir du polygone (coordonnées locales du plan)
    const shape = new THREE.Shape();
    shape.moveTo(polygon[0].x, polygon[0].z);
    for (let i = 1; i < polygon.length; i++) {
      shape.lineTo(polygon[i].x, polygon[i].z);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);

    // Couleur selon le type de plan
    let color, opacity;
    if (plane.orientation === 'horizontal') {
      if (centerWorld.y < 0.25) {
        color = 0x00ff00; // Sol = vert vif
        opacity = 0.35;
      } else if (centerWorld.y > 2.2) {
        color = 0x00ffff; // Plafond = cyan
        opacity = 0.2;
      } else {
        // Autre obstacle
        const obstacleType = planeData.obstacleType || 'unknown';
        if (obstacleType.includes('tabouret') || obstacleType.includes('bas')) {
          color = 0xffff00; // Jaune pour meubles bas
          opacity = 0.4;
        } else if (obstacleType.includes('comptoir') || obstacleType.includes('étagère')) {
          color = 0xff00ff; // Magenta pour comptoirs/étagères
          opacity = 0.4;
        } else if (obstacleType.includes('petit')) {
          color = 0xff4444; // Rouge pour petits objets
          opacity = 0.6;
        } else {
          color = 0xff8800; // Orange par défaut
          opacity = 0.4;
        }
      }
    } else {
      color = 0x0088ff; // Mur = bleu
      opacity = 0.25;
    }

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Appliquer directement la matrice de transformation de la pose
    // Cela positionne et oriente correctement le mesh dans l'espace monde
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(matrix);

    // Ajouter un contour plus épais pour mieux voir
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff, // Contour blanc pour meilleure visibilité
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.matrixAutoUpdate = false;
    wireframe.matrix.copy(matrix);

    this.el.sceneEl.object3D.add(mesh);
    this.el.sceneEl.object3D.add(wireframe);
    this.planeMeshes.push(mesh, wireframe);
  },

  updateScanUI: function () {
    const floorCount = this.floorPlanes.length;
    const wallCount = this.wallPlanes.length;
    const obstacleCount = this.obstaclePlanes.length;
    const hitSurfaceCount = this.hitSurfaces.size;
    const total = floorCount + wallCount + obstacleCount + this.ceilingPlanes.length;

    // Compter les types d'obstacles
    const obstacleTypes = {};
    this.obstaclePlanes.forEach(({ data }) => {
      const type = data.obstacleType || 'autre';
      obstacleTypes[type] = (obstacleTypes[type] || 0) + 1;
    });

    this.surfaceCount.setAttribute('value',
      `Sol: ${floorCount} | Murs: ${wallCount} | Objets: ${obstacleCount}`);

    // Afficher plus de détails sur les obstacles
    let details = `${total} surfaces + ${hitSurfaceCount} points`;
    if (obstacleCount > 0) {
      const typesList = Object.entries(obstacleTypes)
        .map(([type, count]) => `${count} ${type.split('/')[0]}`)
        .slice(0, 2)
        .join(', ');
      details += `\n${typesList}`;
    } else {
      details += `\nContinuez à scanner...`;
    }

    this.scanText.setAttribute('value', details);
  },

  clearPlaneVisuals: function () {
    this.planeMeshes.forEach(mesh => {
      this.el.sceneEl.object3D.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });
    this.planeMeshes = [];
  },

  finishScan: function () {
    this.isScanning = false;
    this.scanComplete = true;

    const totalPlanes = this.detectedPlanes.size;

    // Logs détaillés comme le professeur
    console.log(`\n✅ SCAN TERMINÉ - ${totalPlanes} surfaces analysées`);
    console.log(`   🟢 Sols: ${this.floorPlanes.length}`);
    console.log(`   🔷 Murs: ${this.wallPlanes.length}`);
    console.log(`   🟠 Obstacles (tables, meubles): ${this.obstaclePlanes.length}`);
    console.log(`   🔵 Plafonds: ${this.ceilingPlanes.length}`);
    console.log(`   Total surfaces détectées par hit-test: ${this.hitSurfaces.size}\n`);

    // Détail des obstacles
    if (this.obstaclePlanes.length > 0) {
      const typeCount = {};
      this.obstaclePlanes.forEach(({ data }) => {
        const type = data.obstacleType || 'autre';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      console.log('   Détail des obstacles détectés:');
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`     - ${count} ${type}(s)`);
      });
    }

    // Mettre à jour l'UI
    this.scanTitle.setAttribute('value', '✅ SCAN TERMINÉ');
    this.scanTitle.setAttribute('color', '#00ff00');
    this.scanText.setAttribute('value', `${totalPlanes} surfaces\nAdaptation eau...`);
    this.progressBar.setAttribute('color', '#00ff00');

    // Calculer les dimensions finales
    const bounds = this.roomBounds;
    let width = bounds.maxX - bounds.minX;
    let depth = bounds.maxZ - bounds.minZ;
    let height = bounds.maxY - bounds.minY;

    // Valider les dimensions
    if (!isFinite(width) || width < 1) width = 6;
    if (!isFinite(depth) || depth < 1) depth = 6;
    if (!isFinite(height) || height < 1) height = 2.5;

    width = Math.min(Math.max(width, 2), 20);
    depth = Math.min(Math.max(depth, 2), 20);
    height = Math.min(Math.max(height, 1.5), 5);

    const centerX = isFinite(bounds.minX) && isFinite(bounds.maxX)
      ? (bounds.minX + bounds.maxX) / 2 : 0;
    const centerZ = isFinite(bounds.minZ) && isFinite(bounds.maxZ)
      ? (bounds.minZ + bounds.maxZ) / 2 : -2;

    console.log('📐 Dimensions de la pièce:');
    console.log(`   - Largeur: ${width.toFixed(2)}m`);
    console.log(`   - Profondeur: ${depth.toFixed(2)}m`);
    console.log(`   - Hauteur: ${height.toFixed(2)}m`);
    console.log(`   - Centre: (${centerX.toFixed(2)}, ${centerZ.toFixed(2)})\n`);

    // Émettre l'événement avec les données
    this.el.sceneEl.emit('room-scanned', {
      bounds: bounds,
      width: width,
      depth: depth,
      height: height,
      centerX: centerX,
      centerZ: centerZ,
      floorY: this.floorY,
      floorPlanes: this.floorPlanes,
      wallPlanes: this.wallPlanes,
      obstaclePlanes: this.obstaclePlanes,
      ceilingPlanes: this.ceilingPlanes,
      allPlanes: this.detectedPlanes
    });

    // Cacher l'UI après 3s
    setTimeout(() => {
      this.scanPanel.setAttribute('visible', 'false');

      setTimeout(() => {
        this.fadeOutPlaneVisuals();
      }, 2000);
    }, 3000);
  },

  fadeOutPlaneVisuals: function () {
    const fadeTime = 1500;
    const startTime = Date.now();

    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeTime, 1);
      const opacity = 1 - progress;

      this.planeMeshes.forEach(mesh => {
        if (mesh.material) {
          mesh.material.opacity = mesh.material.opacity * opacity;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        this.clearPlaneVisuals();
      }
    };

    fade();
  },

  remove: function () {
    this.isScanning = false;
    this.clearPlaneVisuals();
  }
});
