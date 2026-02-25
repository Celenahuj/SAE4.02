# 🔧 Guide de Débogage - Choix d'Arme

## Test rapide

1. **Ouvrez** `test-weapon-choice.html` dans votre navigateur
2. **Essayez de cliquer** sur les cartes d'armes
3. **Vérifiez** que :
   - Les cartes changent d'apparence au survol (hover)
   - Les cartes deviennent bleues/dorées quand cliquées
   - Le bouton "Valider et Plonger" devient actif
   - Un message s'affiche en bas

### Si ça fonctionne dans le test mais pas dans le jeu :

C'est probablement un problème de **timing** ou de **z-index**. Suivez les étapes ci-dessous.

## Débogage dans le jeu complet

### Étape 1 : Vérifier la console

1. **Ouvrez le jeu** → `npm run dev`
2. **Ouvrez la console** (F12)
3. **Entrez votre nom** et cliquez sur "Commencer"
4. **Cherchez ces logs** :

```
✅ Nom du joueur enregistré: VotreNom
🗡️ Affichage de l'écran de choix d'arme
🔧 Initialisation UI choix d'arme...
   Screen trouvé: true
   Cartes trouvées: 3
   Bouton trouvé: true
   Attaching click to card 0: spear
   Attaching click to card 1: trident
   Attaching click to card 2: harpoon
✅ Event listeners attachés à 3 cartes
✅ UI choix d'arme complètement initialisée
```

### Étape 2 : Test manuel dans la console

Si l'écran s'affiche mais les clics ne fonctionnent pas, testez dans la console :

```javascript
// Vérifier que l'écran est visible
const screen = document.getElementById('weapon-choice-screen');
console.log('Display:', screen.style.display);
console.log('Z-index:', window.getComputedStyle(screen).zIndex);
console.log('Pointer-events:', window.getComputedStyle(screen).pointerEvents);

// Vérifier les cartes
const cards = document.querySelectorAll('.weapon-card');
console.log('Nombre de cartes:', cards.length);
cards.forEach((card, i) => {
  const style = window.getComputedStyle(card);
  console.log(`Carte ${i}:`, {
    weapon: card.getAttribute('data-weapon'),
    cursor: style.cursor,
    pointerEvents: style.pointerEvents,
    zIndex: style.zIndex
  });
});

// Tester un clic programmatique
cards[0].click();
```

### Étape 3 : Vérifier le z-index

Si les cartes ne sont pas cliquables, c'est probablement qu'un élément est au-dessus.

Dans la console :

```javascript
// Vérifier quel élément est au-dessus à une position donnée
const x = window.innerWidth / 2;
const y = window.innerHeight / 2;
const element = document.elementFromPoint(x, y);
console.log('Élément au centre de l\'écran:', element);
console.log('ID:', element.id);
console.log('Class:', element.className);
```

Si ce n'est PAS une `.weapon-card` ou `.weapon-choice-container`, c'est le problème !

### Solutions selon le problème

#### Problème 1 : La scène A-Frame est au-dessus

**Solution** : Dans la console, tapez :
```javascript
const scene = document.querySelector('a-scene');
scene.style.zIndex = '1';
scene.style.pointerEvents = 'none';
```

#### Problème 2 : L'écran n'est pas en display: flex

**Solution** :
```javascript
const screen = document.getElementById('weapon-choice-screen');
screen.style.display = 'flex';
screen.style.pointerEvents = 'auto';
```

#### Problème 3 : Les event listeners ne sont pas attachés

**Solution** : Réinitialiser manuellement :
```javascript
window.weaponManager.initWeaponChoiceUI();
```

## Vérification après clic sur une arme

Quand vous cliquez sur une arme, vous devriez voir :

```
🖱️ Clic sur carte: spear
✅ Arme sélectionnée: spear
```

Quand vous cliquez sur "Valider et Plonger" :

```
🖱️ Clic sur bouton Valider
📝 Sauvegarde de l'arme: spear
🗡️ Arme sélectionnée: Harpon
🗡️ Application de l'arme: Harpon (spear)
✅ Arme configurée dans la scène: Harpon
   Modèle: #spear-model, Échelle: 0.5 0.5 0.5
👁️ Écran de choix masqué
👁️ Écran AR affiché
✅ Validation de l'arme: Harpon
```

## Si rien ne fonctionne

1. **Vérifiez que le CSS est bien chargé** :
```javascript
const styles = document.styleSheets;
console.log('Nombre de feuilles de style:', styles.length);
for (let sheet of styles) {
  console.log('CSS:', sheet.href);
}
```

2. **Vérifiez que weapon-manager.js est bien chargé** :
```javascript
console.log('Weapon Manager disponible:', !!window.weaponManager);
console.log('Fonctions:', Object.keys(window.weaponManager));
```

3. **Rechargez la page** en vidant le cache : `Ctrl+Shift+R` (PC) ou `Cmd+Shift+R` (Mac)

## Support

Si le problème persiste, copiez TOUS les logs de la console (F12) depuis le chargement de la page jusqu'au moment où vous essayez de cliquer, et partagez-les.
