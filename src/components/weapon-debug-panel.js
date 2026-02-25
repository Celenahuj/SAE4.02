// Composant de debug 3D pour afficher les informations de l'arme
AFRAME.registerComponent('weapon-debug-panel', {
  schema: {},

  init: function () {
    console.log('🔍 Panneau de debug initialisé');
    
    // Créer le panneau de fond
    const panel = document.createElement('a-plane');
    panel.setAttribute('color', '#000000');
    panel.setAttribute('opacity', '0.85');
    panel.setAttribute('width', '2');
    panel.setAttribute('height', '1.5');
    panel.setAttribute('position', '0 0 -0.01');
    this.el.appendChild(panel);

    // Créer les lignes de texte
    this.lines = [];
    const lineHeight = 0.12;
    const startY = 0.6;
    
    for (let i = 0; i < 10; i++) {
      const text = document.createElement('a-text');
      text.setAttribute('value', '...');
      text.setAttribute('color', '#00FF00');
      text.setAttribute('align', 'left');
      text.setAttribute('width', '1.8');
      text.setAttribute('position', `-0.9 ${startY - (i * lineHeight)} 0`);
      text.setAttribute('font', 'monoid');
      this.el.appendChild(text);
      this.lines.push(text);
    }

    // Titre
    const title = document.createElement('a-text');
    title.setAttribute('value', '=== DEBUG ARME ===');
    title.setAttribute('color', '#FFD700');
    title.setAttribute('align', 'center');
    title.setAttribute('width', '2');
    title.setAttribute('position', `0 0.7 0`);
    this.el.appendChild(title);

    console.log('✅ Panneau de debug créé avec', this.lines.length, 'lignes');
  },

  tick: function (time, deltaTime) {
    // Mettre à jour toutes les 500ms pour ne pas surcharger
    if (!this.lastUpdate || time - this.lastUpdate > 500) {
      this.updateDebugInfo();
      this.lastUpdate = time;
    }
  },

  updateDebugInfo: function () {
    const weapon = document.querySelector('#spear');
    const modelEntity = document.querySelector('#weapon-3d-model');
    
    if (!weapon) {
      this.lines[0].setAttribute('value', '⚠️ Arme #spear non trouvée!');
      return;
    }

    const weaponType = localStorage.getItem('spearfisher_selected_weapon') || 'none';
    
    // Le modèle est sur #weapon-3d-model
    const model = modelEntity ? modelEntity.getAttribute('gltf-model') : 'AUCUN';
    const scale = modelEntity ? modelEntity.getAttribute('scale') : 'N/A';
    const position = weapon.getAttribute('position');
    const visible = weapon.getAttribute('visible');
    const hasComponent = modelEntity && !!modelEntity.components['gltf-model'];
    const hasModel = hasComponent && !!modelEntity.components['gltf-model'].model;

    // Récupérer les informations de la caméra pour distance
    const camera = document.querySelector('a-camera') || document.querySelector('[camera]');
    let distance = 'N/A';
    if (camera && position) {
      const camPos = camera.object3D.position;
      const weaponPos = weapon.object3D.position;
      const dx = weaponPos.x - camPos.x;
      const dy = weaponPos.y - camPos.y;
      const dz = weaponPos.z - camPos.z;
      distance = Math.sqrt(dx*dx + dy*dy + dz*dz).toFixed(2) + 'm';
    }

    const info = [
      `Arme: ${weaponType}`,
      `Modèle: ${model || 'AUCUN'}`,
      `Échelle: x=${scale?.x || '?'} y=${scale?.y || '?'} z=${scale?.z || '?'}`,
      `Pos: x=${position?.x?.toFixed(2) || '?'} y=${position?.y?.toFixed(2) || '?'} z=${position?.z?.toFixed(2) || '?'}`,
      `Distance: ${distance}`,
      `Visible: ${visible}`,
      `Composant: ${hasComponent ? 'OUI' : 'NON'}`,
      `3D chargé: ${hasModel ? '✅ OUI' : '❌ NON'}`,
      `Timestamp: ${new Date().toLocaleTimeString()}`,
      hasModel ? '✅ ARME OK' : '⚠️ PROBLÈME DÉTECTÉ'
    ];

    info.forEach((line, i) => {
      if (this.lines[i]) {
        this.lines[i].setAttribute('value', line);
        // Colorer la dernière ligne
        if (i === info.length - 1) {
          this.lines[i].setAttribute('color', hasModel ? '#00FF00' : '#FF0000');
        }
      }
    });
  }
});

console.log('✅ Composant weapon-debug-panel enregistré');
