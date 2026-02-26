// ============================================
// COMPOSANT ROOM-DETECTION : Détection complète de l'environnement
// Code complet du professeur BenoitCrespin
// https://github.com/BenoitCrespin/SAE4.DWeb-DI.02-XR/
// ============================================
AFRAME.registerComponent('room-detection', {
  schema: {
    debug: { type: 'boolean', default: false },
    scanDuration: { type: 'number', default: 15000 },
    showPlanes: { type: 'boolean', default: false },
    continuousDetection: { type: 'boolean', default: true },
    // Si true, autorise l'émission automatique de données de test (development only)
    enableTest: { type: 'boolean', default: false }
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
    this.xrSessionRequested = false;

    // Créer l'interface de scan
    this.createScanUI();

    // Écouter les événements XR
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterXR.bind(this));
    this.el.sceneEl.addEventListener('exit-vr', this.onExitXR.bind(this));

    console.log('🏠 Room detection initialisé - Approche du professeur Benoit Crespin');

    // MODE TEST: Si pas en VR après 8 secondes, émettre des données de test
    setTimeout(async () => {
      // TEST MODE: n'émettre des données de test QUE si explicitement autorisé
      // via l'attribut `enableTest` du composant ou le paramètre d'URL `allowTest=1`.
      try {
        const urlParams = (typeof window !== 'undefined' && window.location && window.location.search)
          ? new URLSearchParams(window.location.search)
          : null;
        const allowParam = urlParams ? (urlParams.get('allowTest') === '1' || urlParams.get('allowTest') === 'true') : false;
        const allowTest = this.data.enableTest || allowParam;

        if (!allowTest) return; // pas d'émission automatique de test

        // N'émettre des données de test que si WebXR est absent (PC dev)
        if ('xr' in navigator) return;
      } catch (e) {
        // ignore
        return;
      }

      if (!this.xrSession && !this.xrSessionRequested && !this.scanComplete && !this.isScanning) {
        console.warn('⚠️ WebXR non présent — émission de données de test pour le développement PC');
        this.emitTestRoomData();
      }
    }, 8000);
  },

  emitTestRoomData: function () {
    console.log('🧪 MODE TEST: Émission de room-scanned avec données simulées');
    
    this.scanComplete = true;
    
    // Données de test pour le développement sur PC
    const testData = {
      bounds: {
        minX: -3, maxX: 3,
        minY: 0, maxY: 2.5,
        minZ: -4, maxZ: 0
      },
      width: 6,
      depth: 4,
      height: 2.5,
      centerX: 0,
      centerZ: -2,
      floorY: 0,
      floorPlanes: [],
      wallPlanes: [],
      obstaclePlanes: [],
      ceilingPlanes: [],
      allPlanes: new Map()
    };
    
    console.log('📐 Dimensions de test:');
    console.log(`   - Largeur: ${testData.width}m`);
    console.log(`   - Profondeur: ${testData.depth}m`);
    console.log(`   - Hauteur: ${testData.height}m`);
    console.log(`   - Centre: (${testData.centerX}, ${testData.centerZ})`);
    
    // Créer une boîte de visualisation pour le mode test
    this.createTestBoundingBox(testData);
    
    this.el.sceneEl.emit('room-scanned', testData);
  },

  createTestBoundingBox: function(data) {
    // Créer une boîte fil-de-fer pour visualiser la zone de spawn
    this.createSpawnZoneBoundingBox(data);
  },

  createSpawnZoneBoundingBox: function(data) {
    // Supprimer uniquement l'ancienne boîte de spawn si elle existe (ne PAS nettoyer les plane visuals)
    const oldBox = document.querySelector('#spawn-zone-bounds');
    if (oldBox) {
      oldBox.parentNode.removeChild(oldBox);
    }

    // Visualiser le VRAI contour du sol (polygone exact avec rotation)
    if (data.floorPolygon && data.floorPolygon.length >= 3 && data.floorPose) {
      this.createFloorPolygonVisualization(data); // Contour exact du sol
      // Calculer quand même les bounds pour les collisions
      this.calculateWorldBounds(data);
    } else {
      // Sinon, utiliser une box standard (mode test)
      this.createStandardBox(data);
    }
  },
  
  calculateWorldBounds: function(data) {
    const polygon = data.floorPolygon;
    const pose = data.floorPose;
    
    console.log('🔄 calculateWorldBounds appelé avec:', {
      polygonPresent: !!polygon,
      polygonLength: polygon?.length || 0,
      posePresent: !!pose
    });
    
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);
    
    // Calculer les bounds en monde ET transformer le polygone
    let realMinX = Infinity, realMaxX = -Infinity;
    let realMinZ = Infinity, realMaxZ = -Infinity;
    const transformedPolygon = [];
    
    polygon.forEach(v => {
      const vec = new THREE.Vector3(v.x, v.y, v.z);
      vec.applyMatrix4(matrix);
      transformedPolygon.push({ x: vec.x, y: vec.y, z: vec.z });
      realMinX = Math.min(realMinX, vec.x);
      realMaxX = Math.max(realMaxX, vec.x);
      realMinZ = Math.min(realMinZ, vec.z);
      realMaxZ = Math.max(realMaxZ, vec.z);
    });
    
    data.bounds = {
      minX: realMinX,
      maxX: realMaxX,
      minZ: realMinZ,
      maxZ: realMaxZ
    };
    
    // Stocker le polygone transformé pour les collisions précises
    data.transformedPolygon = transformedPolygon;
    
    console.log('📐 Bounds monde calculés depuis polygone:');
    console.log(`   X: ${realMinX.toFixed(2)} → ${realMaxX.toFixed(2)}`);
    console.log(`   Z: ${realMinZ.toFixed(2)} → ${realMaxZ.toFixed(2)}`);
    console.log(`   Polygone: ${transformedPolygon.length} points stockés pour collisions`);
  },
  
  createBoxFromPolygon: function(data) {
    const polygon = data.floorPolygon;
    const pose = data.floorPose;
    const height = data.height;
    
    // Transformer tous les vertices avec la matrice du sol
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);
    
    // Extraire la position et rotation de la matrice
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);
    
    // Convertir quaternion en angles Euler
    const euler = new THREE.Euler();
    euler.setFromQuaternion(quaternion);
    const rotationY = THREE.MathUtils.radToDeg(euler.y);
    
    // Calculer les bounds dans l'espace LOCAL du plan (avant transformation)
    let localMinX = Infinity, localMaxX = -Infinity;
    let localMinZ = Infinity, localMaxZ = -Infinity;
    
    polygon.forEach(v => {
      localMinX = Math.min(localMinX, v.x);
      localMaxX = Math.max(localMaxX, v.x);
      localMinZ = Math.min(localMinZ, v.z);
      localMaxZ = Math.max(localMaxZ, v.z);
    });
    
    // Dimensions dans l'espace local
    const width = localMaxX - localMinX;
    const depth = localMaxZ - localMinZ;
    const localCenterX = (localMinX + localMaxX) / 2;
    const localCenterZ = (localMinZ + localMaxZ) / 2;
    
    // Transformer le centre local en monde
    const centerLocal = new THREE.Vector3(localCenterX, 0, localCenterZ);
    centerLocal.applyMatrix4(matrix);
    
    // Calculer les bounds RÉELS en monde (pour les collisions)
    let realMinX = Infinity, realMaxX = -Infinity;
    let realMinZ = Infinity, realMaxZ = -Infinity;
    
    polygon.forEach(v => {
      const vec = new THREE.Vector3(v.x, v.y, v.z);
      vec.applyMatrix4(matrix);
      
      realMinX = Math.min(realMinX, vec.x);
      realMaxX = Math.max(realMaxX, vec.x);
      realMinZ = Math.min(realMinZ, vec.z);
      realMaxZ = Math.max(realMaxZ, vec.z);
    });
    
    // Mettre à jour les bounds ET infos de la box orientée pour les poissons
    data.bounds = {
      minX: realMinX,
      maxX: realMaxX,
      minZ: realMinZ,
      maxZ: realMaxZ
    };
    
    // Infos de la box orientée pour collisions précises
    data.orientedBox = {
      centerX: centerLocal.x,
      centerZ: centerLocal.z,
      width: width,
      depth: depth,
      rotationY: rotationY * Math.PI / 180, // En radians
      halfWidth: width / 2,
      halfDepth: depth / 2
    };

    // Stocker la matrice de transformation du plan (local -> world) et son inverse
    data.orientedBox.matrix = matrix.clone();
    data.orientedBox.inverseMatrix = new THREE.Matrix4().copy(matrix).invert();
    
    // Créer la box rouge ORIENTÉE qui suit la rotation du sol
    const box = document.createElement('a-box');
    box.setAttribute('id', 'spawn-zone-bounds');
    box.setAttribute('position', `${centerLocal.x} ${data.floorY + height/2} ${centerLocal.z}`);
    box.setAttribute('rotation', `0 ${rotationY} 0`); // Rotation du sol détecté
    box.setAttribute('width', width);  // Dimensions locales
    box.setAttribute('height', height);
    box.setAttribute('depth', depth);
    box.setAttribute('material', 'color: #ff0000; opacity: 0.12; transparent: true; wireframe: true; side: double');
    box.setAttribute('geometry', 'primitive: box');
    box.setAttribute('visible', 'true'); // 🔍 DEBUG: Visible pour comparer avec les limites Quest
    
    console.log('📦 ZONE ROUGE ORIENTÉE créée depuis polygone :');
    console.log(`   Position: (${centerLocal.x.toFixed(2)}, ${(data.floorY + height/2).toFixed(2)}, ${centerLocal.z.toFixed(2)})`);
    console.log(`   Rotation Y: ${rotationY.toFixed(1)}° (suit le sol détecté)`);
    console.log(`   Dimensions locales: ${width.toFixed(2)}m x ${depth.toFixed(2)}m`);
    console.log(`   Bounds monde X: ${realMinX.toFixed(2)} à ${realMaxX.toFixed(2)}`);
    console.log(`   Bounds monde Z: ${realMinZ.toFixed(2)} à ${realMaxZ.toFixed(2)}`);
    console.log('   ✅ Poissons utiliseront bounds monde pour collisions');
    
    this.el.sceneEl.appendChild(box);
  },

  createBoxFromPolygonAligned: function(data) {
    const polygon = data.floorPolygon;
    const pose = data.floorPose;
    const height = data.height;
    
    // Transformer tous les vertices avec la matrice du sol
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);
    
    // Calculer les bounds RÉELS en monde depuis le polygone transformé
    let realMinX = Infinity, realMaxX = -Infinity;
    let realMinZ = Infinity, realMaxZ = -Infinity;
    
    polygon.forEach(v => {
      const vec = new THREE.Vector3(v.x, v.y, v.z);
      vec.applyMatrix4(matrix);
      
      realMinX = Math.min(realMinX, vec.x);
      realMaxX = Math.max(realMaxX, vec.x);
      realMinZ = Math.min(realMinZ, vec.z);
      realMaxZ = Math.max(realMaxZ, vec.z);
    });
    
    // Mettre à jour les bounds pour les collisions
    data.bounds = {
      minX: realMinX,
      maxX: realMaxX,
      minZ: realMinZ,
      maxZ: realMaxZ
    };
    
    // Créer la box rouge ALIGNÉE sur les axes mondiaux
    const worldWidth = realMaxX - realMinX;
    const worldDepth = realMaxZ - realMinZ;
    const worldCenterX = (realMinX + realMaxX) / 2;
    const worldCenterZ = (realMinZ + realMaxZ) / 2;
    
    const box = document.createElement('a-box');
    box.setAttribute('id', 'spawn-zone-bounds');
    box.setAttribute('position', `${worldCenterX} ${data.floorY + height/2} ${worldCenterZ}`);
    box.setAttribute('rotation', `0 0 0`);
    box.setAttribute('width', worldWidth);
    box.setAttribute('height', height);
    box.setAttribute('depth', worldDepth);
    box.setAttribute('material', 'color: #ff0000; opacity: 0.12; transparent: true; wireframe: true; side: double');
    box.setAttribute('geometry', 'primitive: box');
    box.setAttribute('visible', 'true'); // 🔍 DEBUG: Visible pour comparer avec les limites Quest
    
    console.log('📦 ZONE ROUGE (masquée) créée depuis polygone :');
    console.log(`   Position: (${worldCenterX.toFixed(2)}, ${(data.floorY + height/2).toFixed(2)}, ${worldCenterZ.toFixed(2)})`);
    console.log(`   Dimensions monde: ${worldWidth.toFixed(2)}m x ${worldDepth.toFixed(2)}m`);
    console.log(`   Bounds X: ${realMinX.toFixed(2)} à ${realMaxX.toFixed(2)}`);
    console.log(`   Bounds Z: ${realMinZ.toFixed(2)} à ${realMaxZ.toFixed(2)}`);
    
    this.el.sceneEl.appendChild(box);
  },

  createFloorPolygonVisualization: function(data) {
    const polygon = data.floorPolygon;
    const pose = data.floorPose;
    const height = data.height;
    
    if (this.data.debug) {
      console.log('📦 Création visualisation EXACTE basée sur polygone du sol (', polygon.length, 'vertices)');
    }
    
    // Créer une entité pour contenir la visualisation (seulement si debug activé)
    const container = this.data.debug ? document.createElement('a-entity') : null;
    if (container) container.setAttribute('id', 'spawn-zone-bounds');
    
    // Matrice de transformation du sol
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);
    
    // 1. Créer le contour du sol (en bas)
    const bottomPoints = [];
    polygon.forEach(v => {
      const vec = new THREE.Vector3(v.x, v.y, v.z);
      vec.applyMatrix4(matrix);
      bottomPoints.push(vec);
    });
    
    // 2. Créer le contour du plafond (même polygone mais +height en Y)
    const topPoints = bottomPoints.map(p => 
      new THREE.Vector3(p.x, p.y + height, p.z)
    );
    
    // 3. Dessiner les contours horizontaux (sol et plafond) EN ROUGE (seulement si debug)
    if (this.data.debug) {
      this.drawPolygonLoop(bottomPoints, container, '#ff0000', 0.5);
      this.drawPolygonLoop(topPoints, container, '#ff0000', 0.5);
      
      // 4. Dessiner les arêtes verticales (coins) EN ROUGE
      for (let i = 0; i < bottomPoints.length; i++) {
        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          bottomPoints[i],
          topPoints[i]
        ]);
        const lineMat = new THREE.LineBasicMaterial({ 
          color: 0xff0000, 
          transparent: true, 
          opacity: 0.6,
          linewidth: 2
        });
        const line = new THREE.Line(lineGeom, lineMat);
        this.el.sceneEl.object3D.add(line);
        this.planeMeshes.push(line);
      }
      
      // 5. Créer une surface semi-transparente pour le sol
      const shape = new THREE.Shape();
      shape.moveTo(polygon[0].x, polygon[0].z);
      for (let i = 1; i < polygon.length; i++) {
        shape.lineTo(polygon[i].x, polygon[i].z);
      }
      shape.closePath();
      
      const shapeGeom = new THREE.ShapeGeometry(shape);
      shapeGeom.rotateX(-Math.PI / 2);
      
      const shapeMat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      
      const shapeMesh = new THREE.Mesh(shapeGeom, shapeMat);
      shapeMesh.matrixAutoUpdate = false;
      shapeMesh.matrix.copy(matrix);
      
      this.el.sceneEl.object3D.add(shapeMesh);
      this.planeMeshes.push(shapeMesh);
      
      console.log('✅ Visualisation polygonale créée - suit EXACTEMENT le sol détecté');
      
      this.el.sceneEl.appendChild(container);
    }
  },

  drawPolygonLoop: function(points, container, color, opacity) {
    const closedPoints = [...points, points[0]];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(closedPoints);
    const lineMat = new THREE.LineBasicMaterial({ 
      color: color, 
      transparent: true, 
      opacity: opacity,
      linewidth: 3
    });
    const line = new THREE.Line(lineGeom, lineMat);
    this.el.sceneEl.object3D.add(line);
    this.planeMeshes.push(line);
  },

  createStandardBox: function(data) {
    // Ne créer la box de visualisation que si debug est activé
    if (!this.data.debug) return;
    
    // Box rectangulaire (MÊME ZONE que pour les collisions des poissons)
    const bounds = data.bounds || {};
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    
    const box = document.createElement('a-box');
    box.setAttribute('id', 'spawn-zone-bounds');
    box.setAttribute('position', `${centerX} ${data.floorY + data.height/2} ${centerZ}`);
    box.setAttribute('width', width);
    box.setAttribute('height', data.height);
    box.setAttribute('depth', depth);
    box.setAttribute('material', 'color: #ff0000; opacity: 0.12; transparent: true; wireframe: true; side: double');
    box.setAttribute('geometry', 'primitive: box');
    box.setAttribute('visible', 'true');
    
    console.log('📦 ZONE ROUGE créée (bounds du sol) :');
    console.log(`   Position: (${centerX.toFixed(2)}, ${(data.floorY + data.height/2).toFixed(2)}, ${centerZ.toFixed(2)})`);
    console.log(`   Taille: ${width.toFixed(2)}m x ${data.height.toFixed(2)}m x ${depth.toFixed(2)}m`);
    console.log(`   Bounds X: ${bounds.minX.toFixed(2)} à ${bounds.maxX.toFixed(2)}`);
    console.log(`   Bounds Z: ${bounds.minZ.toFixed(2)} à ${bounds.maxZ.toFixed(2)}`);
    
    this.el.sceneEl.appendChild(box);
  },

  createScanUI: function () {
    // Scan information panel visible in VR (style océanique cohérent avec nom/arme)
    this.scanPanel = document.createElement('a-entity');
    this.scanPanel.setAttribute('id', 'scan-panel');
    this.scanPanel.setAttribute('position', '0 1.5 -1.5');
    this.scanPanel.setAttribute('visible', 'false');

    // Fond du panneau (bleu océan comme écrans nom/arme)
    const background = document.createElement('a-plane');
    background.setAttribute('width', '1.0');
    background.setAttribute('height', '0.35');
    background.setAttribute('color', '#001e3c');
    background.setAttribute('opacity', '0.95');
    background.setAttribute('shader', 'flat');
    background.setAttribute('position', '0 0 -0.02');
    this.scanPanel.appendChild(background);

    // Bordures cyan/bleu (même style que les boutons)
    const borderTop = document.createElement('a-box');
    borderTop.setAttribute('color', '#00d4ff');
    borderTop.setAttribute('width', '1.0');
    borderTop.setAttribute('height', '0.01');
    borderTop.setAttribute('depth', '0.01');
    borderTop.setAttribute('position', '0 0.17 0');
    this.scanPanel.appendChild(borderTop);

    const borderBottom = document.createElement('a-box');
    borderBottom.setAttribute('color', '#00d4ff');
    borderBottom.setAttribute('width', '1.0');
    borderBottom.setAttribute('height', '0.01');
    borderBottom.setAttribute('depth', '0.01');
    borderBottom.setAttribute('position', '0 -0.17 0');
    this.scanPanel.appendChild(borderBottom);

    const borderLeft = document.createElement('a-box');
    borderLeft.setAttribute('color', '#00d4ff');
    borderLeft.setAttribute('width', '0.01');
    borderLeft.setAttribute('height', '0.33');
    borderLeft.setAttribute('depth', '0.01');
    borderLeft.setAttribute('position', '-0.495 0 0');
    this.scanPanel.appendChild(borderLeft);

    const borderRight = document.createElement('a-box');
    borderRight.setAttribute('color', '#00d4ff');
    borderRight.setAttribute('width', '0.01');
    borderRight.setAttribute('height', '0.33');
    borderRight.setAttribute('depth', '0.01');
    borderRight.setAttribute('position', '0.495 0 0');
    this.scanPanel.appendChild(borderRight);

    // Titre avec gradient cyan (comme le titre "Spearfisher")
    this.scanTitle = document.createElement('a-text');
    this.scanTitle.setAttribute('value', 'SCANNING ENVIRONMENT');
    this.scanTitle.setAttribute('align', 'center');
    this.scanTitle.setAttribute('color', '#00ffcc');
    this.scanTitle.setAttribute('width', '1.5');
    this.scanTitle.setAttribute('position', '0 0.06 0.01');
    this.scanTitle.setAttribute('font', 'roboto');
    this.scanPanel.appendChild(this.scanTitle);

    // Fond barre de progression (noir transparent)
    const progressBg = document.createElement('a-plane');
    progressBg.setAttribute('width', '0.8');
    progressBg.setAttribute('height', '0.04');
    progressBg.setAttribute('color', '#000000');
    progressBg.setAttribute('opacity', '0.6');
    progressBg.setAttribute('position', '0 -0.08 0.01');
    this.scanPanel.appendChild(progressBg);

    // Barre de progression cyan/bleu (comme les boutons)
    this.progressBar = document.createElement('a-plane');
    this.progressBar.setAttribute('width', '0.01');
    this.progressBar.setAttribute('height', '0.04');
    this.progressBar.setAttribute('color', '#00d4ff');
    this.progressBar.setAttribute('position', '-0.395 -0.08 0.02');
    this.scanPanel.appendChild(this.progressBar);

    this.el.sceneEl.appendChild(this.scanPanel);
  },

  onEnterXR: function () {
    console.log('🥽 Entrée en mode XR - Démarrage du scan');
    
    // Marquer qu'on a une session XR pour éviter le mode test
    this.xrSessionRequested = true;

    // Réinitialiser l'état de scan et les données globales partagées
    try {
      if (window && window.FISH_ZONE) {
        window.FISH_ZONE.roomBounds = null;
        window.FISH_ZONE.orientedBox = null;
        window.FISH_ZONE.floorY = 0;
        window.FISH_ZONE.ceilingY = 2.5;
        window.FISH_ZONE.obstacles = [];
        window.FISH_ZONE.wallPlanes = [];
        window.FISH_ZONE.scanned = false;
      }
    } catch (e) {
      // ignore
    }

    // Réinitialiser l'état interne du composant pour forcer un nouveau scan propre
    this.detectedPlanes = new Map();
    this.floorPlanes = [];
    this.ceilingPlanes = [];
    this.wallPlanes = [];
    this.obstaclePlanes = [];
    this.hitSurfaces = new Map();
    this.clearPlaneVisuals();
    this.isScanning = false;
    this.scanComplete = false;
    this.scanStartTime = 0;
    this.floorY = 0;

    // Émettre un événement pour informer les autres composants (ex: fish-spawner) de réinitialisation
    try {
      this.el.sceneEl.emit('room-reset');
      if (this.data.debug) console.log('🔁 room-reset émis pour réinitialiser les composants dépendants');
    } catch (e) {
      // ignore
    }

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

  // Créer un curseur visuel pour indiquer les surfaces détectées (seulement en mode debug)
  createScanCursor: function () {
    if (!this.data.debug) {
      this.cursorEl = null;
      return;
    }
    
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

    console.log('🔍 Starting environment scan...');
    console.log('💡 Look at tables and surfaces to detect them!');

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
      const width = 0.8 * progress;
      this.progressBar.setAttribute('width', Math.max(0.01, width));
      this.progressBar.setAttribute('position', `${-0.4 + width / 2} -0.08 0.02`);
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
      // Flag pour éviter de recréer plusieurs fois la même visualisation
      planeData._visualCreated = false;
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

    // Éviter de créer plusieurs fois la visualisation pour le même plane
    if (planeData._visualCreated) return;

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
    // Marquer la visualisation comme créée pour ce plane
    planeData._visualCreated = true;
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
    // Marquer la visualisation comme créée pour ce plane
    planeData._visualCreated = true;
  },

  updateScanUI: function () {
    // UI simplifiée - pas besoin d'afficher les détails à l'utilisateur
    // Les infos sont toujours loguées en console pour le debug
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
    console.log(`\n✅ SCAN COMPLETE - ${totalPlanes} surfaces analyzed`);
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
    this.scanTitle.setAttribute('value', '✅ COMPLETE');
    this.progressBar.setAttribute('color', '#00ffcc');

    // CALCUL AMÉLIORÉ : Utiliser le sol le plus grand pour définir la zone
    let roomData = null;
    
    if (this.floorPlanes.length > 0) {
      // Trouver le plus grand sol
      let largestFloor = this.floorPlanes[0];
      let maxArea = 0;
      
      this.floorPlanes.forEach(({ data }) => {
        const area = data.dimensions?.area || 0;
        if (area > maxArea) {
          maxArea = area;
          largestFloor = { data };
        }
      });
      
      const floorData = largestFloor.data;
      
      // Calculer les bounds PRÉCIS depuis le polygone transformé
      let floorBounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
      
      if (floorData.polygon && floorData.pose) {
        const matrix = new THREE.Matrix4();
        matrix.fromArray(floorData.pose.transform.matrix);
        
        floorData.polygon.forEach(v => {
          const vec = new THREE.Vector3(v.x, v.y, v.z);
          vec.applyMatrix4(matrix);
          floorBounds.minX = Math.min(floorBounds.minX, vec.x);
          floorBounds.maxX = Math.max(floorBounds.maxX, vec.x);
          floorBounds.minZ = Math.min(floorBounds.minZ, vec.z);
          floorBounds.maxZ = Math.max(floorBounds.maxZ, vec.z);
        });
      } else if (floorData.bounds) {
        floorBounds = floorData.bounds;
      }
      
      // Utiliser les dimensions réelles du sol principal
      const width = floorBounds.maxX - floorBounds.minX;
      const depth = floorBounds.maxZ - floorBounds.minZ;
      const centerX = (floorBounds.minX + floorBounds.maxX) / 2;
      const centerZ = (floorBounds.minZ + floorBounds.maxZ) / 2;
      
      // Hauteur basée sur les murs ou valeur par défaut
      let height = this.roomBounds.maxY - this.floorY;
      if (!isFinite(height) || height < 1.5) height = 2.5;
      height = Math.min(height, 4.0); // Limiter à 4m max
      
      console.log('📐 Dimensions basées sur le sol principal:');
      console.log(`   - Aire du sol: ${maxArea.toFixed(2)}m²`);
      console.log(`   - Largeur: ${width.toFixed(2)}m`);
      console.log(`   - Profondeur: ${depth.toFixed(2)}m`);
      console.log(`   - Hauteur: ${height.toFixed(2)}m`);
      console.log(`   - Centre: (${centerX.toFixed(2)}, ${centerZ.toFixed(2)})`);
      console.log(`   - Sol Y: ${this.floorY.toFixed(2)}m\n`);
      
      roomData = {
        width: width,
        depth: depth,
        height: height,
        centerX: centerX,
        centerZ: centerZ,
        floorY: this.floorY,
        bounds: floorBounds,
        floorPolygon: floorData.polygon,
        floorPose: floorData.pose,
        orientedBox: null // Sera rempli par createBoxFromPolygon
      };
    } else {
      // Fallback : utiliser les bounds du SOL uniquement (pas toute la pièce)
      // Calculer les bounds à partir des floorPlanes si disponibles
      let floorBoundsFromPlanes = null;
      
      if (this.floorPlanes.length > 0) {
        floorBoundsFromPlanes = {
          minX: Infinity, maxX: -Infinity,
          minZ: Infinity, maxZ: -Infinity
        };
        
        this.floorPlanes.forEach(({ data }) => {
          if (data.bounds) {
            floorBoundsFromPlanes.minX = Math.min(floorBoundsFromPlanes.minX, data.bounds.minX);
            floorBoundsFromPlanes.maxX = Math.max(floorBoundsFromPlanes.maxX, data.bounds.maxX);
            floorBoundsFromPlanes.minZ = Math.min(floorBoundsFromPlanes.minZ, data.bounds.minZ);
            floorBoundsFromPlanes.maxZ = Math.max(floorBoundsFromPlanes.maxZ, data.bounds.maxZ);
          }
        });
      }
      
      const bounds = floorBoundsFromPlanes || this.roomBounds;
      let width = bounds.maxX - bounds.minX;
      let depth = bounds.maxZ - bounds.minZ;
      let height = this.roomBounds.maxY - this.floorY;

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

      console.log('📐 Dimensions (fallback - bounds du SOL):');
      console.log(`   - Largeur: ${width.toFixed(2)}m`);
      console.log(`   - Profondeur: ${depth.toFixed(2)}m`);
      console.log(`   - Hauteur: ${height.toFixed(2)}m`);
      console.log(`   - Centre: (${centerX.toFixed(2)}, ${centerZ.toFixed(2)})\n`);
      
      roomData = {
        width: width,
        depth: depth,
        height: height,
        centerX: centerX,
        centerZ: centerZ,
        floorY: this.floorY,
        bounds: bounds
      };
    }

    // Créer une boîte de visualisation pour la zone de spawn
    // IMPORTANT: createBoxFromPolygon modifie data.bounds et data.orientedBox
    this.createSpawnZoneBoundingBox(roomData);
    
    console.log('📤 Émission room-scanned avec orientedBox:', roomData.orientedBox ? 'OUI ✅' : 'NON ❌');

    // Mettre à jour la variable globale pour que d'autres composants y accèdent immédiatement
    if (window && window.FISH_ZONE) {
      window.FISH_ZONE.roomBounds = roomData.bounds;
      window.FISH_ZONE.orientedBox = roomData.orientedBox || null;
      window.FISH_ZONE.floorY = roomData.floorY;
      window.FISH_ZONE.ceilingY = roomData.floorY + roomData.height;
      window.FISH_ZONE.floorPolygon = roomData.transformedPolygon || null; // Pour collisions précises
      window.FISH_ZONE.scanned = true;
      
      console.log('💾 window.FISH_ZONE mis à jour:', {
        bounds: !!window.FISH_ZONE.roomBounds,
        floorPolygon: window.FISH_ZONE.floorPolygon ? `${window.FISH_ZONE.floorPolygon.length} points` : 'NULL',
        floorY: window.FISH_ZONE.floorY?.toFixed(2),
        ceilingY: window.FISH_ZONE.ceilingY?.toFixed(2)
      });
    }

    // Émettre l'événement avec les données (INCLURE orientedBox!)
    this.el.sceneEl.emit('room-scanned', {
      bounds: roomData.bounds,
      width: roomData.width,
      depth: roomData.depth,
      height: roomData.height,
      centerX: roomData.centerX,
      centerZ: roomData.centerZ,
      floorY: roomData.floorY,
      orientedBox: roomData.orientedBox || null,
      floorPlanes: this.floorPlanes,
      wallPlanes: this.wallPlanes,
      obstaclePlanes: this.obstaclePlanes,
      ceilingPlanes: this.ceilingPlanes,
      allPlanes: this.detectedPlanes
    });

    // Cacher l'UI après 3s; ne pas effacer les visualisations si debug=true
    setTimeout(() => {
      this.scanPanel.setAttribute('visible', 'false');

      if (!this.data.debug) {
        // En mode non-debug, on laisse l'effet se dissiper après 2s
        setTimeout(() => {
          this.fadeOutPlaneVisuals();
        }, 2000);
      } else {
        // En debug mode, garder les visuals visibles pour inspection
        console.log('🔍 Debug mode actif — conservation des visualisations de scan');
      }
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
