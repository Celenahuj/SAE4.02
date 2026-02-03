// ============================================
// SHIMS DE COMPATIBILITÉ POUR THREE.JS ET CANNON.JS
// Ces patches corrigent les incompatibilités entre versions
// ============================================

// ============================================
// SHIM 1: THREE.Geometry
// Recrée THREE.Geometry pour les anciens addons qui en dépendent
// ============================================
(function () {
  try {
    if (window.AFRAME && AFRAME.THREE && !AFRAME.THREE.Geometry) {
      const THREE = AFRAME.THREE;
      // ES6 class extends BufferGeometry to avoid calling super as a function
      class Geometry extends THREE.BufferGeometry {
        constructor() {
          super();
          this.vertices = [];
        }

        static fromBufferGeometry(bufferGeometry) {
          const g = new Geometry();
          const pos = bufferGeometry.attributes && bufferGeometry.attributes.position;
          if (pos && pos.array) {
            const a = pos.array;
            for (let i = 0; i < a.length; i += 3) {
              g.vertices.push(new THREE.Vector3(a[i], a[i + 1], a[i + 2]));
            }
          }
          return g;
        }
        // instance method expected by older plugins: tmp.fromBufferGeometry(...)
        fromBufferGeometry(bufferGeometry) {
          this.vertices.length = 0;
          const pos = bufferGeometry.attributes && bufferGeometry.attributes.position;
          if (pos && pos.array) {
            const a = pos.array;
            for (let i = 0; i < a.length; i += 3) {
              this.vertices.push(new THREE.Vector3(a[i], a[i + 1], a[i + 2]));
            }
          }
          return this;
        }
      }
      THREE.Geometry = Geometry;
      console.log('🔧 THREE.Geometry shim installed (class)');
    }
  } catch (e) {
    console.warn('Geometry shim failed', e);
  }
})();

// ============================================
// SHIM 2: Box3.getCenter
// Assure qu'un Vector3 est créé si la cible est manquante
// ============================================
(function () {
  try {
    if (window.AFRAME && AFRAME.THREE && AFRAME.THREE.Box3) {
      const THREE = AFRAME.THREE;
      const proto = THREE.Box3.prototype;
      if (proto && typeof proto.getCenter === 'function') {
        const origGetCenter = proto.getCenter;
        proto.getCenter = function (target) {
          if (target === undefined || target === null) target = new THREE.Vector3();
          return origGetCenter.call(this, target);
        };
        console.log('🔧 Box3.getCenter shim applied');
      }
    }
  } catch (e) {
    console.warn('Box3.getCenter shim failed', e);
  }
})();

// ============================================
// SHIM 3: Quaternion.inverse()
// Fournit la méthode inverse() pour THREE et CANNON Quaternion
// Attend que CANNON soit chargé
// ============================================
window.addEventListener('load', function() {
  setTimeout(function() {
    try {
      // THREE.Quaternion: alias inverse -> invert()
      if (window.AFRAME && AFRAME.THREE && AFRAME.THREE.Quaternion) {
        const Q = AFRAME.THREE.Quaternion.prototype;
        if (!Q.inverse) {
          Q.inverse = Q.invert || function () { return this.conjugate(); };
          console.log('🔧 THREE.Quaternion.inverse shim applied');
        }
      }

      // CANNON.Quaternion: provide inverse() returning a new quaternion
      if (window.CANNON && CANNON.Quaternion) {
        if (!CANNON.Quaternion.prototype.inverse) {
          CANNON.Quaternion.prototype.inverse = function () {
            return new CANNON.Quaternion(-this.x, -this.y, -this.z, this.w);
          };
          console.log('🔧 CANNON.Quaternion.inverse shim applied');
        }
      } else {
        console.warn('⚠️ CANNON not loaded');
      }
    } catch (e) {
      console.warn('Quaternion shim failed', e);
    }
  }, 100);
});
