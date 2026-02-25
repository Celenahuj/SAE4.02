# Guide du système de choix d'arme

## Workflow complet

1. **Saisir votre nom** → Cliquer sur "Commencer"
2. **Choisir une arme** → Sélectionner Harpon/Trident/Flèche → Cliquer sur "Valider et Plonger"
3. **Entrer en AR** → Cliquer sur "Enter AR 🥽"
4. **Scanner la pièce** → Scanner votre environnement avec le casque
5. **Démarrer le jeu** → Cliquer sur le bouton "▶ PLAY" qui apparaît en 3D
6. **L'arme apparaît !** → L'arme que vous avez choisie devient visible et utilisable

## Débogage

Si l'arme n'apparaît pas, ouvrez la console du navigateur (F12) et vérifiez :

### Logs attendus lors du choix d'arme :
```
🗡️ Weapon Manager initialisé
🎯 Arme sélectionnée: spear (ou trident/harpoon)
🗡️ Arme sélectionnée: Harpon
🗡️ Application de l'arme: Harpon (spear)
✅ Arme configurée dans la scène: Harpon
   Modèle: #spear-model, Échelle: 0.5 0.5 0.5
✅ Validation de l'arme: Harpon
```

### Logs attendus lors du clic sur PLAY :
```
🗡️ Arme rendue visible !
   Position: 0 1.45 -0.6
   Modèle: #spear-model (ou #trident-model / #harpoon-model)
   Échelle: 0.5 0.5 0.5
```

## Problèmes courants

### L'arme n'apparaît pas du tout
- **Cause** : Le bouton PLAY n'a pas été cliqué
- **Solution** : Après avoir scanné la pièce, cherchez le bouton bleu "▶ PLAY" en 3D et cliquez dessus

### L'arme est au mauvais endroit
- **Cause** : Position de spawn par défaut
- **Solution** : L'arme spawne à la position `0 1.45 -0.6` (devant vous, à hauteur de main)

### Le modèle 3D ne s'affiche pas
- **Cause** : Le fichier GLB n'est pas chargé
- **Solution** : Vérifiez que les fichiers existent dans `assets/models/`

### L'arme disparaît
- **Cause** : Physique activée (dynamic-body)
- **Solution** : L'arme peut tomber si elle n'est pas attrapée rapidement

## Modification du comportement

Si vous voulez que l'arme soit visible **immédiatement** après le choix (sans attendre PLAY) :

Modifiez `src/systems/weapon-manager.js` ligne 156 pour ajouter :
```javascript
// Rendre l'arme visible immédiatement (optionnel)
const spearEntity = document.querySelector('#spear');
if (spearEntity) {
  spearEntity.setAttribute('visible', 'true');
}
```

## localStorage

Le choix d'arme est sauvegardé dans `localStorage` sous la clé :
- `spearfisher_selected_weapon`

Pour réinitialiser :
```javascript
localStorage.removeItem('spearfisher_selected_weapon');
```
