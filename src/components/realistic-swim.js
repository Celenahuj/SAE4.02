// Composant pour animer les poissons de manière réaliste avec Three.js
AFRAME.registerComponent('realistic-swim', {
  schema: {
    speed: { type: 'number', default: 0.5 },
    amplitude: { type: 'number', default: 0.02 },
    frequency: { type: 'number', default: 2 }
  },

  init: function () {
    this.time = Math.random() * 1000;
    this.hadCollision = false; // Flag pour collision
    this.safetyMargin = 0.4; // 40cm de marge de sécurité
    
    // Direction de nage simple (seulement horizontale au début)
    this.direction = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      0,
      (Math.random() - 0.5) * 2
    ).normalize();
    
    this.targetDirection = this.direction.clone();
    this.changeDirectionTimer = Math.random() * 5000 + 4000;
  },

  // Calculer la distance d'un point au bord du polygone
  getDistanceToPolygonEdge: function(x, z, polygon) {
    let minDist = Infinity;
    
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      
      // Distance du point au segment
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len2 = dx * dx + dz * dz;
      
      if (len2 === 0) continue;
      
      let t = ((x - p1.x) * dx + (z - p1.z) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      
      const projX = p1.x + t * dx;
      const projZ = p1.z + t * dz;
      
      const dist = Math.sqrt((x - projX) * (x - projX) + (z - projZ) * (z - projZ));
      minDist = Math.min(minDist, dist);
    }
    
    return minDist;
  },

  // Test si un point (x, z) est à l'intérieur du polygone 2D (ray casting)
  isInsidePolygon: function(x, z, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, zi = polygon[i].z;
      const xj = polygon[j].x, zj = polygon[j].z;
      
      const intersect = ((zi > z) !== (zj > z)) && 
                       (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },

  // Trouve le point le plus proche sur le bord du polygone et retourne aussi la normale
  getClosestPointOnPolygon: function(x, z, polygon) {
    let minDist = Infinity;
    let closestPoint = { x: x, z: z };
    let segmentIndex = 0;
    
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      
      // Projection du point sur le segment
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len2 = dx * dx + dz * dz;
      
      if (len2 === 0) continue;
      
      let t = ((x - p1.x) * dx + (z - p1.z) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      
      const projX = p1.x + t * dx;
      const projZ = p1.z + t * dz;
      
      const dist = (x - projX) * (x - projX) + (z - projZ) * (z - projZ);
      
      if (dist < minDist) {
        minDist = dist;
        closestPoint = { x: projX, z: projZ };
        segmentIndex = i;
      }
    }
    
    return { point: closestPoint, segmentIndex: segmentIndex };
  },

  // Calcule la normale d'un segment de polygone (vers l'intérieur)
  getSegmentNormal: function(polygon, segmentIndex) {
    const p1 = polygon[segmentIndex];
    const p2 = polygon[(segmentIndex + 1) % polygon.length];
    
    // Vecteur du segment
    const dx = p2.x - p1.x;
    const dz = p2.z - p1.z;
    
    // Normale perpendiculaire (rotation de 90° à gauche)
    const normalX = -dz;
    const normalZ = dx;
    
    // Normaliser
    const len = Math.sqrt(normalX * normalX + normalZ * normalZ);
    if (len === 0) return { x: 0, z: 0 };
    
    let nx = normalX / len;
    let nz = normalZ / len;
    
    // Vérifier que la normale pointe vers l'intérieur
    // On prend le centre du polygone comme référence
    let centerX = 0, centerZ = 0;
    polygon.forEach(p => {
      centerX += p.x;
      centerZ += p.z;
    });
    centerX /= polygon.length;
    centerZ /= polygon.length;
    
    // Milieu du segment
    const midX = (p1.x + p2.x) / 2;
    const midZ = (p1.z + p2.z) / 2;
    
    // Vecteur du segment vers le centre
    const toCenterX = centerX - midX;
    const toCenterZ = centerZ - midZ;
    
    // Produit scalaire : si négatif, la normale pointe vers l'extérieur
    const dot = nx * toCenterX + nz * toCenterZ;
    if (dot < 0) {
      nx = -nx;
      nz = -nz;
    }
    
    return { x: nx, z: nz };
  },

  // Réfléchit un vecteur direction par rapport à une normale (comme un rayon lumineux)
  reflectDirection: function(dirX, dirZ, normalX, normalZ) {
    // Formule de réflexion : R = V - 2(V·N)N
    // où V est le vecteur incident et N la normale de la surface
    const dotProduct = dirX * normalX + dirZ * normalZ;
    const reflectedX = dirX - 2 * dotProduct * normalX;
    const reflectedZ = dirZ - 2 * dotProduct * normalZ;
    
    // Normaliser le vecteur réfléchi
    const len = Math.sqrt(reflectedX * reflectedX + reflectedZ * reflectedZ);
    if (len === 0) return { x: -dirX, z: -dirZ }; // Rebond inverse par défaut
    
    return { x: reflectedX / len, z: reflectedZ / len };
  },

  tick: function (time, deltaTime) {
    if (!this.el.object3D.visible) return;
    
    const dt = deltaTime / 1000;
    this.time += dt;
    this.hadCollision = false; // Reset collision flag chaque frame
    
    // Récupérer le polygone exact et les bounds
    const polygon = window.FISH_ZONE?.floorPolygon;
    const pos = this.el.object3D.position;
    
    // 1. CALCULER le prochain mouvement (sans l'appliquer encore)
    const movement = this.direction.clone().multiplyScalar(this.data.speed * dt);
    const nextX = pos.x + movement.x;
    const nextZ = pos.z + movement.z;
    
    // 2. TESTER si la prochaine position serait trop proche du bord
    let canMove = true;
    
    if (polygon && polygon.length > 0) {
      // Test 1 : Est-ce que la position future est dans le polygone ?
      const isInside = this.isInsidePolygon(nextX, nextZ, polygon);
      
      // Test 2 : Est-ce que la position future est assez loin du bord ? (40cm minimum)
      const distToEdge = isInside ? this.getDistanceToPolygonEdge(nextX, nextZ, polygon) : 0;
      
      if (!isInside || distToEdge < this.safetyMargin) {
        canMove = false;
        this.hadCollision = true; // Marquer la collision immédiatement
        
        // 🔬 RÉFLEXION COMME UN RAYON LUMINEUX
        // Trouver le point le plus proche sur le polygone et le segment correspondant
        const closestData = this.getClosestPointOnPolygon(nextX, nextZ, polygon);
        const closest = closestData.point;
        
        // Calculer la normale du segment le plus proche (vers l'intérieur)
        const normal = this.getSegmentNormal(polygon, closestData.segmentIndex);
        
        // Réfléchir la direction actuelle par rapport à cette normale
        const reflected = this.reflectDirection(
          this.direction.x,
          this.direction.z,
          normal.x,
          normal.z
        );
        
        // Appliquer la nouvelle direction réfléchie
        this.direction.x = reflected.x;
        this.direction.z = reflected.z;
        this.direction.y = 0;
        this.direction.normalize();
        
        this.targetDirection.copy(this.direction);
        this.changeDirectionTimer = Math.random() * 3000 + 2000;
      }
    } else {
      // 🚨 PAS DE POLYGONE : ne pas bouger pour éviter de sortir !
      canMove = false;
    }
    
    // 3. APPLIQUER le mouvement seulement si autorisé
    if (canMove) {
      pos.x = nextX;
      pos.z = nextZ;
    }
    
    // 🛡️ FILET DE SÉCURITÉ : Vérifier la position ACTUELLE et forcer dedans si besoin
    if (polygon && polygon.length > 0) {
      const currentInside = this.isInsidePolygon(pos.x, pos.z, polygon);
      const currentDist = currentInside ? this.getDistanceToPolygonEdge(pos.x, pos.z, polygon) : 0;
      
      if (!currentInside || currentDist < this.safetyMargin) {
        // Calculer le centre
        let centerX = 0, centerZ = 0;
        polygon.forEach(p => {
          centerX += p.x;
          centerZ += p.z;
        });
        centerX /= polygon.length;
        centerZ /= polygon.length;
        
        // Si le poisson est COMPLÈTEMENT dehors, le téléporter au centre
        if (!currentInside) {
          pos.x = centerX;
          pos.z = centerZ;
          
          // Direction aléatoire après téléportation
          this.direction.set(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
          ).normalize();
          this.targetDirection.copy(this.direction);
        } else {
          // Si juste trop proche du bord, repousser ET réfléchir la direction
          const closestData = this.getClosestPointOnPolygon(pos.x, pos.z, polygon);
          const closest = closestData.point;
          
          // Repousser vers l'intérieur (20cm)
          const pushX = pos.x - closest.x;
          const pushZ = pos.z - closest.z;
          const pushDist = Math.sqrt(pushX * pushX + pushZ * pushZ);
          
          if (pushDist > 0.001) {
            pos.x = closest.x + (pushX / pushDist) * this.safetyMargin;
            pos.z = closest.z + (pushZ / pushDist) * this.safetyMargin;
          }
          
          // Réfléchir la direction
          const normal = this.getSegmentNormal(polygon, closestData.segmentIndex);
          const reflected = this.reflectDirection(
            this.direction.x,
            this.direction.z,
            normal.x,
            normal.z
          );
          
          this.direction.set(reflected.x, 0, reflected.z);
          this.direction.normalize();
          this.targetDirection.copy(this.direction);
        }
      }
    }
    
    // 4. ONDULATION verticale légère
    const verticalWave = Math.sin(this.time * this.data.frequency) * this.data.amplitude;
    pos.y += verticalWave * dt * 5;
    
    // 5. Contraintes verticales (sol et plafond)
    const floorY = window.FISH_ZONE?.floorY || 0;
    const ceilingY = window.FISH_ZONE?.ceilingY || 2.5;
    const margin = 0.2;
    
    if (pos.y < floorY + margin) {
      pos.y = floorY + margin;
    } else if (pos.y > ceilingY - margin) {
      pos.y = ceilingY - margin;
    }
    
    // 6. ROTATION simple vers la direction (sans lerp pour éviter les bugs)
    const targetRotY = Math.atan2(this.direction.x, this.direction.z);
    this.el.object3D.rotation.y = targetRotY;
    
    // 7. Petite inclinaison du corps (très subtile)
    this.el.object3D.rotation.z = Math.sin(this.time * 0.5) * 0.02;
    
    // 8. CHANGEMENT DE DIRECTION périodique
    this.changeDirectionTimer -= deltaTime;
    if (this.changeDirectionTimer <= 0) {
      // Générer une nouvelle direction aléatoire
      const newDirection = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ).normalize();
      
      // VÉRIFIER si cette direction est sûre (ne va pas vers un mur)
      if (polygon && polygon.length > 0) {
        // Simuler la position future avec cette nouvelle direction (1 seconde devant)
        const testDistance = this.data.speed * 1.0; // 1 seconde de mouvement
        const testX = pos.x + newDirection.x * testDistance;
        const testZ = pos.z + newDirection.z * testDistance;
        
        const isInside = this.isInsidePolygon(testX, testZ, polygon);
        const distToEdge = isInside ? this.getDistanceToPolygonEdge(testX, testZ, polygon) : 0;
        
        // Accepter la direction seulement si elle est sûre
        if (isInside && distToEdge >= this.safetyMargin) {
          this.targetDirection.copy(newDirection);
        }
      } else {
        // Pas de polygone, accepter la direction
        this.targetDirection.copy(newDirection);
      }
      
      this.changeDirectionTimer = Math.random() * 5000 + 4000;
    }
    
    // Appliquer targetDirection directement (pas de lerp pour éviter les bugs de collision)
    // Le lerp peut faire que le poisson continue vers un mur même après redirection
    this.direction.copy(this.targetDirection);
    this.direction.normalize();
  }
});
