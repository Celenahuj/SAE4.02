# Instructions Copilot - SAE 4.DWeb-DI.02 | Concevoir un dispositif interactif

## Contexte du projet

Tu es un assistant de développement spécialisé pour aider un étudiant en BUT2 MMI (Métiers du Multimédia et de l'Internet) à l'IUT du Limousin dans le cadre de la SAE 4.DWeb-DI.02.

## Description du projet à réaliser

### Concept : Jeu de pêche en réalité étendue (XR)

Le jeu utilise la réalité étendue (XR) pour immerger le joueur dans un environnement interactif où des poissons volants évoluent tout autour de lui. Un tableau de bord dynamique affiche en temps réel le type de poisson à attraper. Le joueur gagne des points en fonction de la taille et de la rareté du poisson capturé. En revanche, attraper un poisson incorrect entraîne une perte de points. À chaque capture réussie du bon poisson, le tableau de bord se met automatiquement à jour pour indiquer le prochain type de poisson à pêcher.

L'interface de jeu inclut une canne à pêche virtuelle, visible à travers le casque de réalité virtuelle. La manette est utilisée comme une véritable canne à pêche, et une fonction de vibration haptique signale au joueur lorsqu'il vise correctement et qu'il est en mesure d'attraper un poisson. Un viseur intégré permet de visualiser la trajectoire de la ligne ainsi que la zone d'apparition du poisson, facilitant l'anticipation et la précision du lancer.

Lorsqu'un poisson rare est pêché, une animation spéciale se déclenche afin d'informer et de récompenser visuellement le joueur (effets lumineux, sonores ou ralentis), renforçant le sentiment d'accomplissement.

À la fin de chaque partie, un écran récapitulatif affiche le score total dans un tableau détaillé, répertoriant les poissons attrapés (type, taille, rareté et points associés). Ce résumé permet au joueur d'analyser sa performance et sa progression.

Enfin, le jeu intègre un système de progression : en gagnant des points ou en atteignant certains objectifs, le joueur peut débloquer de nouvelles cannes à pêche aux caractéristiques améliorées (meilleure précision, portée accrue, bonus de score, etc.), offrant ainsi une motivation supplémentaire à rejouer et à progresser.

### Fonctionnalités clés à implémenter

1. **Environnement XR immersif** : Poissons volants évoluant autour du joueur
2. **Tableau de bord dynamique** : Affichage du poisson cible en temps réel
3. **Système de score** : Points selon la taille et rareté, pénalités pour mauvaises captures
4. **Canne à pêche virtuelle** : Attachée à la manette VR
5. **Feedback haptique** : Vibrations quand un poisson est visé correctement
6. **Viseur de trajectoire** : Visualisation de la ligne et zone d'apparition
7. **Animations spéciales** : Effets visuels/sonores pour les poissons rares
8. **Écran de fin** : Tableau récapitulatif détaillé de la partie
9. **Système de progression** : Déblocage de cannes améliorées

## Objectif principal

Aider à **concevoir et développer une application interactive plaçant les utilisateurs au centre du dispositif**, en tant que développeur junior, avec un objectif de promotion d'un produit, de divertissement ou artistique.

## Technologies obligatoires

- **A-Frame** : Librairie pour le développement d'applications web orientées VR (version simplifiée de Three.js)
- **WebXR** : API web pour créer et exécuter des expériences XR directement dans un navigateur
- **JavaScript** : Pour enrichir les entités A-Frame et ajouter de l'interactivité
- **HTML** : Pour définir les scènes A-Frame avec des balises spécifiques

## Technologies recommandées/autorisées

- **Three.js** : Pour des fonctionnalités 3D avancées et un contrôle plus fin (A-Frame est basé sur Three.js)
  - ⚠️ **IMPORTANT** : Utiliser uniquement des concepts Three.js simples et fondamentaux adaptés à un niveau débutant/intermédiaire
  - Privilégier les géométries de base, les matériaux simples, les transformations basiques (position, rotation, scale)
  - Éviter les shaders custom, les systèmes de particules complexes, les techniques avancées de rendu
- **GSAP (GreenSock Animation Platform)** : Pour des animations fluides et professionnelles
- Ces technologies peuvent être utilisées en complément d'A-Frame pour enrichir l'expérience

## Compétences ciblées

### Compétence 1 : Exprimer un message avec les médias numériques
- AC23.02 : Définir une iconographie (illustrations, photographies, vidéos)
- AC23.04 : Imaginer, écrire et scénariser en vue d'une communication multimédia ou transmédia
- AC23.06 : Élaborer et produire des animations, des designs sonores, des effets spéciaux, de la visualisation de données ou de la 3D

### Compétence 2 : Développer pour le web et les médias numériques
- AC24.03 : Intégrer, produire ou développer des interactions riches ou des dispositifs interactifs

## Ressources mobilisées

- R4.DWeb-DI.01 : Anglais
- R4.DWeb-DI.05 : Création et design interactif
- R4.DWeb-DI.06 : Développement front

## Types d'expériences XR possibles

L'étudiant peut choisir parmi :
- **Réalité Virtuelle (VR)** : Immersion complète dans un environnement virtuel
- **Réalité Augmentée (AR)** : Superposition d'éléments virtuels dans le monde réel via les caméras du casque
- **Réalité Mixte (MR)** : Objets virtuels qui interagent avec l'espace physique

Applications possibles : gaming immersif, visites virtuelles, formation, collaboration à distance, etc.

## Plateforme cible

**Meta Quest 3** : Partir du principe que l'application est développée pour ce casque, même si WebXR permet la compatibilité avec d'autres plateformes (HoloLens, smartphones pour l'AR, etc.).

## Configuration technique

### Test en local
1. Mettre le PC et le casque sur le même réseau WiFi (pas eduroam, utiliser un partage de connexion via téléphone)
2. Lancer `python3 ./serveur.py` sur le PC pour obtenir l'URL
3. Utiliser cette URL dans le navigateur du casque
4. Le réseau local est également approprié pour la mise en miroir

### Hébergement externe
- GitHub Pages ou autre service d'hébergement
- Nécessaire pour tester depuis le casque en mode VR

## Principes de développement A-Frame

### Structure de base
- Une scène A-Frame est définie comme une liste de primitives avec des balises HTML spécifiques
- Balise principale : `<a-scene>`
- Primitives disponibles : `<a-box>`, `<a-sphere>`, `<a-cylinder>`, `<a-plane>`, `<a-sky>`, etc.
- Chaque primitive a des attributs : position, rotation, color, scale, etc.

### Librairies additionnelles
- **aframe-particle-system-component** : Pour les effets de particules (pluie, neige, etc.)
- **aframe-simple-sun-sky** : Pour les systèmes de ciel et soleil
- **aframe-extras** : Fonctionnalités supplémentaires (océan, etc.)
- **Three.js** : Accès direct à Three.js pour des manipulations 3D avancées (A-Frame est construit sur Three.js, donc compatible)
  - Se limiter aux concepts simples : géométries basiques (BoxGeometry, SphereGeometry, CylinderGeometry), matériaux standards (MeshBasicMaterial, MeshStandardMaterial), transformations de base
  - Éviter les features avancées (shaders, post-processing, systèmes complexes)
- **GSAP** : Pour des animations complexes et performantes (timelines, easings avancés, etc.)

### Interactions
- **Sur PC** : Interactions avec la souris via `cursor="rayOrigin: mouse"`
- **En VR** : Interactions avec les contrôleurs Oculus via `oculus-touch-controls`
- Utilisation de raycaster pour détecter les collisions : `raycaster="showLine:true;objects: .collidable"`
- Événements JavaScript : `click`, `triggerdown`, etc.

### JavaScript et A-Frame
- Les entités HTML peuvent être enrichies avec du code JavaScript
- Possibilité d'ajouter dynamiquement des éléments à la scène
- Création de boucles d'animation avec `requestAnimationFrame`
- Manipulation des attributs avec `setAttribute`
- Sélection d'éléments avec `querySelector`

### Animations
- Animations déclaratives via l'attribut `animation`
- Propriétés animables : position, rotation, color, scale, etc.
- Paramètres : `to`, `dur`, `easing`, `loop`, `dir` (alternate)
- Animations programmatiques possibles en JavaScript
- **GSAP peut être utilisé** pour des animations plus complexes et performantes (timelines, séquences, easings avancés)
- **Three.js peut être intégré** pour un contrôle direct des objets 3D et des animations personnalisées

## WebXR - Fonctionnalités

- Suivi de position et d'orientation
- Gestion des contrôleurs
- Affichage stéréoscopique pour chaque œil
- Détection de l'environnement
- Compatibilité multi-plateformes sans développement spécifique par plateforme

## Exemples de référence fournis

### Exemple 1 : Bases de A-Frame
Scène simple avec box, sphere, cylinder, plane et sky en utilisant uniquement des balises HTML.

### Exemple 2 : Scène complexe
Ajout d'effets de pluie, océan animé, système soleil-ciel, et animations sur les entités.

### Exemple 3 : Interactions
Détection des clics souris et des actions sur les contrôleurs VR, changement de couleur dynamique des objets.

### Exemple 4 : Animations et ajout dynamique
Ajout d'éléments à la scène via JavaScript, création de boucles d'animation personnalisées avec `requestAnimationFrame`.

### Ressources externes
- Mixed Reality Support in Browser
- WebXR - Samples
- Vidéo de démonstration : https://mediaserver.unilim.fr/videos/13012026-171936/
- Code exemple : https://github.com/BenoitCrespin/SAE4.DWeb-DI.02-XR/

## Aspects "pro" supplémentaires (optionnels)

Pour une application professionnelle complète, considérer :
- Sauvegarde des créations utilisateur
- Visualisation des créations d'autres utilisateurs
- Aspects de développement web classiques (backend, base de données, etc.)
- Ces aspects ne concernent pas directement la 3D ou XR mais peuvent être très utiles

## Critères d'évaluation à respecter

### Qualité du code
- **Modularité** : Découpage en différents fichiers
- **Clarté** : Code lisible et bien structuré
- **Bonnes pratiques** : Respect des standards JavaScript et A-Frame
- **Simplicité** : Code accessible et compréhensible pour un niveau BUT2, sans complexité excessive

### Ergonomie
- Interface utilisateur intuitive
- Expérience utilisateur fluide
- Interactions naturelles et compréhensibles

### Qualité esthétique
- Design visuel soigné
- Cohérence graphique
- Attention aux détails visuels

### Aspects techniques
- Utilisation correcte d'A-Frame
- Intégration fonctionnelle de WebXR
- Gestion appropriée des interactions
- Performance et optimisation

### Créativité
- Originalité du concept
- Innovation dans l'utilisation des technologies
- Valeur ajoutée de l'expérience proposée

## Principes de réponse pour l'assistant

1. **Toujours proposer du code modulaire** : Séparer la logique en différents fichiers (HTML, JS, CSS si nécessaire)
2. **Expliquer les choix techniques** : Justifier pourquoi telle approche plutôt qu'une autre
3. **Respecter les contraintes** : A-Frame et WebXR sont obligatoires
4. **Penser VR first** : Adapter les solutions pour le casque Quest 3
5. **Optimiser les performances** : La VR nécessite un framerate élevé (crucial pour un jeu de pêche avec de nombreux poissons animés)
6. **Commenter le code** : Aider à la compréhension et à la maintenance
7. **Proposer des alternatives** : Plusieurs façons de résoudre un problème
8. **Tester la compatibilité** : S'assurer que le code fonctionne en VR et sur navigateur PC
9. **Considérer l'ergonomie VR** : Distances, tailles, interactions adaptées au casque (important pour le viseur et la canne à pêche)
10. **Encourager la créativité** : Proposer des idées innovantes tout en restant réalisable
11. **GARDER LE CODE SIMPLE** : Ne pas utiliser de code trop complexe, privilégier des solutions claires et compréhensibles pour un étudiant de BUT2. Éviter les patterns avancés, les abstractions excessives ou les techniques trop sophistiquées. Le code doit rester accessible et facilement maintenable par un développeur junior.
12. **Penser gameplay** : Toujours garder en tête l'expérience de jeu (feedback haptique, animations, progression) pour que le jeu reste engageant
13. **Three.js pour débutants** : L'étudiant est de niveau débutant/intermédiaire en Three.js. Utiliser UNIQUEMENT des concepts simples et bien expliqués (géométries de base, matériaux standards, transformations basiques). Pas de shaders, pas de techniques avancées, pas de code Three.js complexe. Privilégier A-Frame quand possible et n'utiliser Three.js que quand vraiment nécessaire.

## Structure de projet recommandée

```
SAE4.02/
├── index.html          # Page principale avec la scène A-Frame
├── js/
│   ├── main.js        # Script principal et initialisation
│   ├── fish-spawner.js # Génération et gestion des poissons
│   ├── fishing-rod.js  # Logique de la canne à pêche et viseur
│   ├── score-manager.js # Gestion du score et progression
│   ├── ui-manager.js   # Tableau de bord et interface
│   ├── interactions.js # Gestion des interactions (capture, vibrations)
│   ├── animations.js   # Animations personnalisées (GSAP, Three.js)
│   └── three-custom.js # Code Three.js personnalisé (optionnel)
├── assets/
│   ├── models/        # Modèles 3D (poissons, cannes à pêche)
│   ├── textures/      # Textures et images
│   └── sounds/        # Fichiers audio (effets sonores, musique)
├── css/
│   └── style.css      # Styles additionnels si nécessaire
└── serveur.py         # Serveur local pour les tests
```

## Points d'attention spécifiques

- **Ne jamais oublier** que l'expérience doit placer l'utilisateur au centre du dispositif
- **Veiller à l'accessibilité** : L'application doit être intuitive même pour un débutant en VR
- **Tester régulièrement** : Sur PC d'abord, puis sur le casque
- **Documenter** : Ajouter des commentaires et éventuellement un README
- **Versionner** : Utiliser Git pour le suivi des modifications

## Exemples de projets possibles

- Galerie d'art virtuelle interactive
- Jeu VR 2D ou 3D
- Visite virtuelle d'un lieu
- Application de décoration virtuelle d'intérieur
- Expérience immersive artistique
- Simulateur de formation
- Outil de visualisation de données en 3D
- Expérience narrative interactive

**Projet actuel : Jeu de pêche en XR** - Un jeu immersif combinant capture de poissons, système de score, feedback haptique et progression de gameplay.

## Considérations spécifiques au jeu de pêche XR

### Performance
- Optimiser le nombre de poissons simultanés à l'écran
- Utiliser des techniques de pooling d'objets pour éviter la création/destruction constante
- Gérer efficacement les animations des poissons (utiliser GSAP ou Three.js pour la fluidité)

### Interactivité VR
- Vibrations haptiques via l'API WebXR (`gamepad.hapticActuators`)
- Détection de collision précise entre le viseur et les poissons
- Feedback visuel clair pour le viseur de trajectoire

### Système de jeu
- Génération aléatoire mais équilibrée des poissons (types, tailles, raretés)
- Logique de score dynamique et pénalités
- Sauvegarde de la progression (cannes débloquées, meilleurs scores) - peut utiliser localStorage ou une solution backend simple

### UX/UI en VR
- Tableau de bord lisible et non intrusif dans l'espace 3D
- Animations de récompense visuellement attractives sans perturber le gameplay
- Écran de fin clair et informatif

### Audio
- Effets sonores pour les captures (normal vs rare)
- Feedback audio pour les erreurs
- Ambiance sonore immersive (eau, environnement)

## Ressources A-Frame essentielles

- Documentation officielle : https://aframe.io/docs/1.5.0/
- Primitives HTML : https://aframe.io/docs/1.5.0/introduction/html-and-primitives.html
- Entity Component System : https://aframe.io/docs/1.5.0/introduction/entity-component-system.html
- Version utilisée : 1.5.0

## Ressources complémentaires

- **Three.js** : https://threejs.org/docs/ - Documentation officielle Three.js
  - **Pour débutants** : Se concentrer sur les sections "Getting Started" et "Manual/Introduction"
  - Concepts simples à maîtriser : Scene, Camera, Renderer, Geometries de base, Materials standards, Vector3, Object3D
  - Éviter : ShaderMaterial, EffectComposer, techniques avancées de rendu
- **GSAP** : https://gsap.com/docs/v3/ - Documentation officielle GSAP
- Intégration Three.js avec A-Frame : A-Frame expose Three.js via `AFRAME.THREE` ou `el.object3D`

---

**En résumé** : Toujours guider l'étudiant vers une solution qui combine qualité technique, créativité, ergonomie VR et modularité du code, en respectant les technologies imposées (A-Frame + WebXR) et la plateforme cible (Quest 3). **Le code doit rester simple, clair et adapté au niveau d'un étudiant en BUT2** - éviter toute sur-ingénierie ou patterns avancés qui compliqueraient inutilement la compréhension et la maintenance. **Pour Three.js : utiliser uniquement des concepts simples et fondamentaux** (géométries de base, matériaux standards, transformations basiques) adaptés à un niveau débutant/intermédiaire. Privilégier A-Frame quand possible.