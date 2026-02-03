AFRAME.registerComponent('fish-movement', {
  schema: {
    speed: { type: 'number', default: 0.05 },
    bounds: { type: 'number', default: 2 }
  },

  init: function () {
    // Swimming state: velocity, target point, sway for a natural swim
    this.velocity = new THREE.Vector3(0, 0, 0);
    // Slight random variation, but overall slower
    this.speed = this.data.speed * (0.6 + Math.random() * 0.4);
    this.bounds = this.data.bounds;
    this.target = new THREE.Vector3();
    this._pickNewTarget();
    this.swayPhase = Math.random() * Math.PI * 2;

    // Données de la pièce détectée (room-detection)
    this.roomBounds = null;
    this.obstacles = [];
    this.wallPlanes = [];
    this.floorY = 0;
    this.ceilingY = 2.5;

    // Écouter l'événement de scan de pièce
    this.el.sceneEl.addEventListener('room-scanned', (e) => {
      const data = e.detail;
      
      // Calculer les bounds à partir du centre et des dimensions (plus fiable)
      const centerX = data.centerX || 0;
      const centerZ = data.centerZ || -2;
      const width = data.width || 4;
      const depth = data.depth || 4;
      const height = data.height || 2.5;
      const floorY = data.floorY || 0;
      
      this.roomBounds = {
        minX: centerX - width / 2,
        maxX: centerX + width / 2,
        minZ: centerZ - depth / 2,
        maxZ: centerZ + depth / 2,
        minY: floorY,
        maxY: floorY + height
      };
      
      this.obstacles = data.obstaclePlanes || [];
      this.wallPlanes = data.wallPlanes || [];
      this.floorY = floorY;
      this.ceilingY = floorY + height - 0.3;
      
      console.log('🐟 Poisson: pièce détectée, limites =', {
        x: `${this.roomBounds.minX.toFixed(2)} à ${this.roomBounds.maxX.toFixed(2)}`,
        y: `${this.roomBounds.minY.toFixed(2)} à ${this.roomBounds.maxY.toFixed(2)}`,
        z: `${this.roomBounds.minZ.toFixed(2)} à ${this.roomBounds.maxZ.toFixed(2)}`
      });
      
      // Repositionner le poisson s'il est hors limites
      this._ensureInBounds();
    });
  },

  _pickNewTarget: function () {
    // Si on a les vraies dimensions de la pièce, les utiliser
    if (this.roomBounds && isFinite(this.roomBounds.minX) && isFinite(this.roomBounds.maxX)) {
      const margin = 0.3; // Marge pour éviter les murs
      const minX = this.roomBounds.minX + margin;
      const maxX = this.roomBounds.maxX - margin;
      const minZ = this.roomBounds.minZ + margin;
      const maxZ = this.roomBounds.maxZ - margin;
      const minY = Math.max(this.floorY + 0.3, 0.2);
      const maxY = Math.min(this.ceilingY - 0.3, this.floorY + 2.0);
      
      this.target.set(
        minX + Math.random() * (maxX - minX),
        minY + Math.random() * (maxY - minY),
        minZ + Math.random() * (maxZ - minZ)
      );
      
      console.log('🎯 Nouvelle cible poisson:', this.target.toArray().map(v => v.toFixed(2)));
    } else {
      // Fallback: utiliser les bounds par défaut
      const b = this.bounds;
      this.target.set(
        (Math.random() - 0.5) * b * 2, 
        0.2 + Math.random() * (b - 0.2), 
        (Math.random() - 0.5) * b * 2 - 1.0
      );
    }
  },

  _ensureInBounds: function () {
    if (!this.roomBounds || !isFinite(this.roomBounds.minX)) return;
    
    const pos = this.el.object3D.position;
    const margin = 0.2;
    
    // Garder dans les limites X, Y, Z
    if (pos.x < this.roomBounds.minX + margin) pos.x = this.roomBounds.minX + margin;
    if (pos.x > this.roomBounds.maxX - margin) pos.x = this.roomBounds.maxX - margin;
    if (pos.y < this.floorY + 0.2) pos.y = this.floorY + 0.2;
    if (pos.y > this.ceilingY - 0.2) pos.y = this.ceilingY - 0.2;
    if (pos.z < this.roomBounds.minZ + margin) pos.z = this.roomBounds.minZ + margin;
    if (pos.z > this.roomBounds.maxZ - margin) pos.z = this.roomBounds.maxZ - margin;
  },

  _checkWallCollision: function (pos, nextPos) {
    // Vérifier collision avec les murs de la pièce
    if (!this.roomBounds || !isFinite(this.roomBounds.minX)) return false;
    
    const margin = 0.25;
    let collision = false;
    
    // Collision avec les murs X
    if (nextPos.x < this.roomBounds.minX + margin || nextPos.x > this.roomBounds.maxX - margin) {
      this.velocity.x *= -1; // Rebondir
      nextPos.x = pos.x; // Annuler le mouvement
      collision = true;
    }
    
    // Collision avec le sol et plafond
    if (nextPos.y < this.floorY + 0.2 || nextPos.y > this.ceilingY - 0.2) {
      this.velocity.y *= -1;
      nextPos.y = pos.y;
      collision = true;
    }
    
    // Collision avec les murs Z
    if (nextPos.z < this.roomBounds.minZ + margin || nextPos.z > this.roomBounds.maxZ - margin) {
      this.velocity.z *= -1;
      nextPos.z = pos.z;
      collision = true;
    }
    
    return collision;
  },

  _checkObstacleCollision: function (pos, nextPos) {
    // Vérifier collision avec les tables et obstacles
    if (!this.obstacles || this.obstacles.length === 0) return false;
    
    let collision = false;
    const fishRadius = 0.15;
    
    this.obstacles.forEach(obstacle => {
      const obsData = obstacle.data;
      const obsPos = obsData.position;
      const bounds = obsData.bounds;
      
      if (!obsPos || !bounds) return;
      
      // Calculer si le poisson entre dans la boîte de l'obstacle
      const inX = nextPos.x > bounds.minX - fishRadius && nextPos.x < bounds.maxX + fishRadius;
      const inY = nextPos.y > bounds.minY - fishRadius && nextPos.y < bounds.maxY + fishRadius;
      const inZ = nextPos.z > bounds.minZ - fishRadius && nextPos.z < bounds.maxZ + fishRadius;
      
      if (inX && inY && inZ) {
        // Collision détectée ! Rebondir intelligemment
        const dx = nextPos.x - obsPos.x;
        const dy = nextPos.y - obsPos.y;
        const dz = nextPos.z - obsPos.z;
        
        // Rebondir selon l'axe le plus proche
        if (Math.abs(dx) > Math.abs(dz)) {
          this.velocity.x *= -1;
          nextPos.x = pos.x;
        } else {
          this.velocity.z *= -1;
          nextPos.z = pos.z;
        }
        
        // Si collision verticale (dessus/dessous de table)
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > Math.abs(dz)) {
          this.velocity.y *= -1;
          nextPos.y = pos.y;
        }
        
        collision = true;
      }
    });
    
    return collision;
  },

  tick: function (time, delta) {
    if (!delta) return;
    if (this.el.__isGrabbed) return; // when grabbed, let controller handle it

    const dt = delta / 1000;
    const pos = this.el.object3D.position;

    // Si proche de la cible, choisir une nouvelle cible
    if (pos.distanceTo(this.target) < 0.4) this._pickNewTarget();

    // Direction désirée vers la cible
    const desired = this.target.clone().sub(pos).normalize();

    // Ajuster progressivement la vélocité vers la direction désirée
    const desiredVel = desired.multiplyScalar(this.speed);
    this.velocity.lerp(desiredVel, Math.min(1, dt * 1.5));

    // Ajouter un mouvement de nage latéral naturel (comme une queue de poisson)
    this.swayPhase += dt * (1.2 + Math.random() * 0.8);
    const lateral = new THREE.Vector3().crossVectors(this.velocity, new THREE.Vector3(0, 1, 0)).normalize();
    const sway = lateral.multiplyScalar(Math.sin(this.swayPhase) * 0.03);

    // Calculer la prochaine position
    const nextPos = pos.clone();
    nextPos.addScaledVector(this.velocity, dt);
    nextPos.addScaledVector(sway, 1);

    // Vérifier les collisions avec les murs de la pièce
    const wallHit = this._checkWallCollision(pos, nextPos);
    
    // Vérifier les collisions avec les obstacles (tables, etc.)
    const obstacleHit = this._checkObstacleCollision(pos, nextPos);

    // Si collision, choisir une nouvelle cible aléatoire pour éviter de rester coincé
    if (wallHit || obstacleHit) {
      this._pickNewTarget();
      
      // Ajouter une petite perturbation aléatoire pour rendre le mouvement naturel
      this.velocity.x += (Math.random() - 0.5) * 0.05;
      this.velocity.y += (Math.random() - 0.5) * 0.03;
      this.velocity.z += (Math.random() - 0.5) * 0.05;
    }

    // Appliquer la position finale
    pos.copy(nextPos);

    // Garder le poisson au-dessus du sol minimal
    if (pos.y < this.floorY + 0.12) pos.y = this.floorY + 0.12;

    // Rotation douce pour faire face à la direction du mouvement
    if (this.velocity.lengthSq() > 0.0001) {
      const lookTarget = pos.clone().add(this.velocity.clone());
      // Capturer le quaternion actuel
      const currentQuat = this.el.object3D.quaternion.clone();
      // Définir temporairement lookAt pour calculer le quaternion cible
      this.el.object3D.lookAt(lookTarget);
      const targetQuat = this.el.object3D.quaternion.clone();
      // Restaurer puis interpoler vers la cible pour une rotation douce
      this.el.object3D.quaternion.copy(currentQuat);
      this.el.object3D.quaternion.slerp(targetQuat, Math.min(1, dt * 4));
    }
  }
});

AFRAME.registerComponent('fish-spawner', {
  schema: {
    count: { type: 'int', default: 8 },
    area: { type: 'number', default: 2 }
  },

  init: function () {
    this.fishes = [];
    this.roomBounds = null;
    this.floorY = 0;
    this.ceilingY = 2.5;
    this.spawned = false;

    // Attendre que la pièce soit scannée avant de spawner les poissons
    this.el.sceneEl.addEventListener('room-scanned', (e) => {
      if (this.spawned) {
        // Si déjà spawné, repositionner les poissons dans la pièce
        this._repositionFishes(e.detail);
      } else {
        // Sinon, spawner les poissons dans la pièce détectée
        this._spawnFishesInRoom(e.detail);
      }
    });

    console.log('🐟 Fish-spawner: attente du scan de la pièce...');
  },

  _spawnFishesInRoom: function (roomData) {
    this.spawned = true;
    
    // Utiliser centerX/centerZ et width/depth au lieu des bounds (plus fiable)
    const centerX = roomData.centerX || 0;
    const centerZ = roomData.centerZ || -2;
    const width = roomData.width || 4;
    const depth = roomData.depth || 4;
    const height = roomData.height || 2.5;
    const floorY = roomData.floorY || 0;
    
    // Calculer les vraies limites à partir du centre et des dimensions
    const minX = centerX - width / 2;
    const maxX = centerX + width / 2;
    const minZ = centerZ - depth / 2;
    const maxZ = centerZ + depth / 2;
    const minY = floorY + 0.2;
    const maxY = floorY + height - 0.3;
    
    // Stocker pour le mouvement
    this.roomBounds = { minX, maxX, minY, maxY, minZ, maxZ };
    this.floorY = floorY;
    this.ceilingY = maxY;

    const scene = this.el.sceneEl;
    const parent = document.querySelector('#world-anchor') || scene;

    console.log(`🐟 Spawn de ${this.data.count} poissons dans la pièce détectée:`);
    console.log(`   Centre: (${centerX.toFixed(2)}, ${centerZ.toFixed(2)})`);
    console.log(`   Dimensions: ${width.toFixed(2)}m x ${depth.toFixed(2)}m x ${height.toFixed(2)}m`);
    console.log(`   Limites X: ${minX.toFixed(2)} à ${maxX.toFixed(2)}`);
    console.log(`   Limites Y: ${minY.toFixed(2)} à ${maxY.toFixed(2)}`);
    console.log(`   Limites Z: ${minZ.toFixed(2)} à ${maxZ.toFixed(2)}`);

    for (let i = 0; i < this.data.count; i++) {
      const fish = document.createElement('a-entity');

      // Debug/test shape: use a box so grabbing is visually obvious
      fish.setAttribute('geometry', 'primitive: box; width: 0.24; height: 0.14; depth: 0.12');
      fish.setAttribute('material', `color: ${this._randomColor()}; metalness: 0.05; roughness: 0.9`);
      
      // Slight random rotation so boxes don't all look identical
      const rx = (Math.random() - 0.5) * 20;
      const ry = (Math.random() - 0.5) * 180;
      const rz = (Math.random() - 0.5) * 20;
      fish.setAttribute('rotation', `${rx} ${ry} ${rz}`);

      // Position aléatoire DANS LA PIÈCE DÉTECTÉE (avec marge)
      const margin = 0.3;
      const x = minX + margin + Math.random() * (maxX - minX - margin * 2);
      const y = minY + 0.2 + Math.random() * (maxY - minY - 0.4);
      const z = minZ + margin + Math.random() * (maxZ - minZ - margin * 2);
      
      console.log(`🐟 Poisson #${i + 1} spawné à (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
      
      fish.setAttribute('position', `${x} ${y} ${z}`);

      // Mark as fish and grabbable
      fish.classList.add('fish');
      fish.setAttribute('grabbable', '');

      // Add movement component (much slower for boxes)
      const baseSpeed = 0.04 + Math.random() * 0.04; // 0.04 - 0.08
      fish.setAttribute('fish-movement', `speed: ${baseSpeed}; bounds: ${this.data.area}`);

      parent.appendChild(fish);
      this.fishes.push(fish);
    }

    console.log(`✅ ${this.fishes.length} poissons créés dans la pièce !`);
  },

  _repositionFishes: function (roomData) {
    // Utiliser centerX/centerZ et width/depth au lieu des bounds (plus fiable)
    const centerX = roomData.centerX || 0;
    const centerZ = roomData.centerZ || -2;
    const width = roomData.width || 4;
    const depth = roomData.depth || 4;
    const height = roomData.height || 2.5;
    const floorY = roomData.floorY || 0;
    
    // Calculer les vraies limites
    const minX = centerX - width / 2;
    const maxX = centerX + width / 2;
    const minZ = centerZ - depth / 2;
    const maxZ = centerZ + depth / 2;
    const minY = floorY + 0.2;
    const maxY = floorY + height - 0.3;
    
    // Stocker pour le mouvement
    this.roomBounds = { minX, maxX, minY, maxY, minZ, maxZ };
    this.floorY = floorY;
    this.ceilingY = maxY;

    console.log('🔄 Repositionnement des poissons dans la pièce détectée:');
    console.log(`   Limites X: ${minX.toFixed(2)} à ${maxX.toFixed(2)}`);
    console.log(`   Limites Y: ${minY.toFixed(2)} à ${maxY.toFixed(2)}`);
    console.log(`   Limites Z: ${minZ.toFixed(2)} à ${maxZ.toFixed(2)}`);

    this.fishes.forEach((fish, i) => {
      const margin = 0.3;
      const x = minX + margin + Math.random() * (maxX - minX - margin * 2);
      const y = minY + 0.2 + Math.random() * (maxY - minY - 0.4);
      const z = minZ + margin + Math.random() * (maxZ - minZ - margin * 2);
      
      console.log(`🔄 Poisson #${i + 1} repositionné à (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
      fish.setAttribute('position', `${x} ${y} ${z}`);
    });
  },

  _randomColor: function () {
    const palette = ['#f39c12', '#e74c3c', '#1abc9c', '#3498db', '#9b59b6', '#f1c40f'];
    return palette[Math.floor(Math.random() * palette.length)];
  }
});
