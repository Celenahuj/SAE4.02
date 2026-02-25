# 🔱 Diagnostic Trident

## Vérifications effectuées

✅ **Fichier Trident.glb** 
- Existe dans `assets/models/Trident.glb`
- Taille : 20KB
- Format : glTF binary model version 2 (VALIDE)

✅ **Modifications appliquées**
- Échelle du Trident augmentée de 0.5 à **1.0** (2x plus grand)
- Logs détaillés ajoutés pour diagnostic
- ID asset correctement référencé : `#trident-model`

## Tests à effectuer

### Test 1 : Vérifier le modèle isolé

1. **Ouvrez** `test-trident-model.html` dans votre navigateur
2. Vous devriez voir le **Trident à gauche** et le **Harpon à droite**
3. Si le Trident n'apparaît pas, vérifiez la console pour les erreurs

```bash
open test-trident-model.html
# Ou sur Windows:
# start test-trident-model.html
```

### Test 2 : Dans le jeu complet

1. **Lancez le jeu** : `npm run dev`
2. **Ouvrez la console** (F12)
3. **Entrez votre nom** → Commencer
4. **Sélectionnez Trident** → Cliquez dessus

#### Logs attendus :
```
🖱️ Clic sur carte: trident
✅ Arme sélectionnée: trident
📝 Sauvegarde de l'arme: trident
🗡️ Application de l'arme: Trident (trident)
🗡️ Ancien modèle retiré
✅ Arme configurée dans la scène: Trident
   Modèle: #trident-model, Échelle: 1.0 1.0 1.0
   Position: 0 1.45 -0.6
   Visible: false
🔍 Vérification après chargement:
   Modèle actuel: #trident-model
   Composant gltf-model présent: true
   ✅ Modèle 3D chargé avec succès
```

5. **Cliquez sur "Valider et Plonger"**
6. **Entrez en AR**, scannez la pièce
7. **Cliquez sur PLAY**

#### Logs attendus au PLAY :
```
🗡️ Arme rendue visible !
   Position: 0 1.45 -0.6
   Modèle: #trident-model
   Échelle: 1.0 1.0 1.0
```

## Diagnostic si le Trident n'apparaît toujours pas

### Dans la console, tapez :

```javascript
// Vérifier l'entité arme
const weapon = document.querySelector('#spear');
console.log('Weapon entity:', weapon);
console.log('Model:', weapon.getAttribute('gltf-model'));
console.log('Scale:', weapon.getAttribute('scale'));
console.log('Visible:', weapon.getAttribute('visible'));
console.log('Position:', weapon.getAttribute('position'));

// Vérifier le composant gltf-model
const gltfComp = weapon.components['gltf-model'];
console.log('GLTF Component:', gltfComp);
console.log('Model loaded:', !!gltfComp?.model);
console.log('Model data:', gltfComp?.model);

// Vérifier si l'asset est chargé
const asset = document.querySelector('#trident-model');
console.log('Asset element:', asset);
console.log('Asset src:', asset?.getAttribute('src'));
```

### Problèmes possibles et solutions

#### 1. Le modèle se charge mais n'est pas visible

**Cause** : Échelle trop petite
**Solution** : Augmenter encore l'échelle
```javascript
document.querySelector('#spear').setAttribute('scale', '2 2 2');
```

#### 2. Le modèle ne se charge pas du tout

**Cause** : Erreur dans le chargement de l'asset
**Solution** : Vérifier les erreurs dans la console et le réseau (F12 > Network)

#### 3. "Composant gltf-model présent: false"

**Cause** : Le modèle n'a pas été appliqué
**Solution** : Forcer l'application
```javascript
const weapon = document.querySelector('#spear');
weapon.setAttribute('gltf-model', '#trident-model');
weapon.setAttribute('scale', '2 2 2');
```

#### 4. L'arme est loin ou derrière vous

**Cause** : Position incorrecte
**Solution** : Ajuster la position
```javascript
const weapon = document.querySelector('#spear');
weapon.setAttribute('position', '0 1.5 -1'); // Plus proche
```

## Comparaison Harpon vs Trident

| Propriété | Harpon | Trident (nouveau) |
|-----------|---------|-------------------|
| **Modèle** | stylized_low-poly_spear.glb | Trident.glb |
| **Échelle** | 0.5 0.5 0.5 | 1.0 1.0 1.0 |
| **Taille fichier** | ~XX KB | 20 KB |
| **Format** | GLB v2 | GLB v2 |

## Si le Trident apparaît mais est bizarre

### Trop grand ?
```javascript
// Dans weapon-manager.js, ligne 14
scale: '0.3 0.3 0.3'  // Plus petit
```

### Trop petit ?
```javascript
// Dans weapon-manager.js, ligne 14
scale: '2.0 2.0 2.0'  // Plus grand
```

### Mal orienté ?
Ajoutez une rotation dans le HTML :
```html
<a-entity id="spear" 
          rotation="0 180 0">  <!-- Ajuster selon besoin -->
```

## Logs complets à copier

Si le problème persiste, lancez ces commandes dans la console et copiez TOUTE la sortie :

```javascript
console.log('=== DIAGNOSTIC COMPLET ===');
const weapon = document.querySelector('#spear');
const asset = document.querySelector('#trident-model');
const gltf = weapon?.components['gltf-model'];

console.log('1. Weapon entity:', weapon);
console.log('2. Asset element:', asset);
console.log('3. Asset src:', asset?.getAttribute('src'));
console.log('4. Weapon model attr:', weapon?.getAttribute('gltf-model'));
console.log('5. Weapon scale:', weapon?.getAttribute('scale'));
console.log('6. Weapon visible:', weapon?.getAttribute('visible'));
console.log('7. Weapon position:', weapon?.getAttribute('position'));
console.log('8. GLTF component:', gltf);
console.log('9. Model loaded:', !!gltf?.model);
console.log('10. Model object:', gltf?.model);
console.log('11. LocalStorage weapon:', localStorage.getItem('spearfisher_selected_weapon'));
console.log('=== FIN DIAGNOSTIC ===');
```
