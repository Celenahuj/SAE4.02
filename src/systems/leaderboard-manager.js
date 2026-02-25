// Système de gestion du classement avec localStorage
(function () {
  const LEADERBOARD_KEY = 'spearfisher_leaderboard';
  const MAX_LEADERBOARD_SIZE = 10;
  let currentPlayerName = '';

  // Fonction pour charger le classement depuis localStorage
  function loadLeaderboard() {
    try {
      const data = localStorage.getItem(LEADERBOARD_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Erreur lors du chargement du classement:', e);
      return [];
    }
  }

  // Fonction pour sauvegarder le classement dans localStorage
  function saveLeaderboard(leaderboard) {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
      return true;
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde du classement:', e);
      return false;
    }
  }

  // Fonction pour ajouter un score au classement
  function addScore(playerName, score) {
    if (!playerName || playerName.trim() === '') {
      console.warn('Nom de joueur invalide');
      return false;
    }

    const leaderboard = loadLeaderboard();
    const timestamp = new Date().toISOString();
    const trimmedName = playerName.trim();

    // Vérifier si le joueur existe déjà dans le classement
    const existingPlayerIndex = leaderboard.findIndex(entry => entry.name === trimmedName);

    if (existingPlayerIndex !== -1) {
      // Le joueur existe déjà, mettre à jour son score (même s'il est moins bon)
      leaderboard[existingPlayerIndex].score = score;
      leaderboard[existingPlayerIndex].date = timestamp;
      console.log(`🔄 Score mis à jour pour ${trimmedName}: ${score} points`);
    } else {
      // Nouveau joueur, ajouter une nouvelle entrée
      leaderboard.push({
        name: trimmedName,
        score: score,
        date: timestamp
      });
      console.log(`✅ Nouveau score pour ${trimmedName}: ${score} points`);
    }

    // Trier par score décroissant
    leaderboard.sort((a, b) => b.score - a.score);

    // Garder seulement les 10 meilleurs
    const topLeaderboard = leaderboard.slice(0, MAX_LEADERBOARD_SIZE);

    // Sauvegarder
    saveLeaderboard(topLeaderboard);

    return true;
  }

  // Fonction pour afficher le classement HTML
  function displayLeaderboard() {
    const leaderboard = loadLeaderboard();
    const tableBody = document.getElementById('leaderboard-table-body');
    
    if (!tableBody) {
      console.warn('Element leaderboard-table-body non trouvé');
      return;
    }

    tableBody.innerHTML = '';

    if (leaderboard.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="3" style="text-align:center;color:#999;">Aucun score enregistré</td>`;
      tableBody.appendChild(row);
      return;
    }

    // Afficher chaque entrée du classement
    leaderboard.forEach((entry, index) => {
      const row = document.createElement('tr');
      
      // Mettre en évidence le joueur actuel
      if (entry.name === currentPlayerName) {
        row.classList.add('current-player');
      }

      let rankIcon = `${index + 1}`;
      if (index === 0) rankIcon = '🥇';
      else if (index === 1) rankIcon = '🥈';
      else if (index === 2) rankIcon = '🥉';

      const scoreColor = entry.score >= 0 ? '#00ff00' : '#ff6b6b';
      const date = new Date(entry.date).toLocaleDateString('fr-FR');

      row.innerHTML = `
        <td style="font-weight:bold;">${rankIcon}</td>
        <td style="text-align:left;">${entry.name}</td>
        <td style="color:${scoreColor};font-weight:bold;">${entry.score} pts</td>
      `;

      tableBody.appendChild(row);
    });

    console.log('📊 Classement affiché avec', leaderboard.length, 'entrées');
  }

  // Fonction pour afficher le classement en 3D dans la scène VR
  function displayLeaderboard3D() {
    const leaderboard = loadLeaderboard();
    const endScreen3D = document.querySelector('#end-screen-3d');
    
    if (!endScreen3D) {
      console.warn('end-screen-3d non trouvé pour le classement 3D');
      return;
    }

    // Supprimer TOUS les anciens éléments dynamiques (tableau de scores et messages)
    const oldTable = document.querySelector('#dynamic-score-table-3d');
    if (oldTable) oldTable.parentNode.removeChild(oldTable);
    
    const oldMessage = document.querySelector('#score-list-3d');
    if (oldMessage) oldMessage.parentNode.removeChild(oldMessage);

    // Créer le conteneur du classement
    const leaderboardContainer = document.createElement('a-entity');
    leaderboardContainer.setAttribute('id', 'dynamic-score-table-3d');
    leaderboardContainer.setAttribute('position', '0 0.3 0.01');

    if (leaderboard.length === 0) {
      const noDataText = document.createElement('a-text');
      noDataText.setAttribute('value', 'Aucun score enregistré');
      noDataText.setAttribute('align', 'center');
      noDataText.setAttribute('color', '#999999');
      noDataText.setAttribute('width', '1.5');
      noDataText.setAttribute('position', '0 0 0');
      leaderboardContainer.appendChild(noDataText);
      endScreen3D.appendChild(leaderboardContainer);
      return;
    }

    // En-têtes
    const headerBg = document.createElement('a-plane');
    headerBg.setAttribute('color', '#FFD700');
    headerBg.setAttribute('opacity', '0.2');
    headerBg.setAttribute('width', '1.1');
    headerBg.setAttribute('height', '0.08');
    headerBg.setAttribute('position', '0 0 -0.01');
    leaderboardContainer.appendChild(headerBg);

    const header1 = document.createElement('a-text');
    header1.setAttribute('value', '#');
    header1.setAttribute('align', 'center');
    header1.setAttribute('color', '#FFD700');
    header1.setAttribute('width', '1');
    header1.setAttribute('position', '-0.42 0 0');
    leaderboardContainer.appendChild(header1);

    const header2 = document.createElement('a-text');
    header2.setAttribute('value', 'Joueur');
    header2.setAttribute('align', 'left');
    header2.setAttribute('color', '#FFD700');
    header2.setAttribute('width', '1');
    header2.setAttribute('position', '-0.15 0 0');
    leaderboardContainer.appendChild(header2);

    const header3 = document.createElement('a-text');
    header3.setAttribute('value', 'Score');
    header3.setAttribute('align', 'right');
    header3.setAttribute('color', '#FFD700');
    header3.setAttribute('width', '1');
    header3.setAttribute('position', '0.52 0 0');
    leaderboardContainer.appendChild(header3);

    // Lignes du classement
    let yPosition = -0.12;
    leaderboard.forEach((entry, index) => {
      // Fond de la ligne
      const rowBg = document.createElement('a-plane');
      const isCurrentPlayer = entry.name === currentPlayerName;
      rowBg.setAttribute('color', isCurrentPlayer ? '#FFD700' : '#ffffff');
      rowBg.setAttribute('opacity', isCurrentPlayer ? '0.25' : '0.05');
      rowBg.setAttribute('width', '1.1');
      rowBg.setAttribute('height', '0.08');
      rowBg.setAttribute('position', `0 ${yPosition} -0.01`);
      leaderboardContainer.appendChild(rowBg);

      // Rang avec couleurs spéciales pour les 3 premiers
      const rankText = `${index + 1}`;
      let rankColor = '#ffffff';
      
      if (index === 0) rankColor = '#FFD700';      // Or
      else if (index === 1) rankColor = '#C0C0C0'; // Argent
      else if (index === 2) rankColor = '#CD7F32'; // Bronze

      const col1 = document.createElement('a-text');
      col1.setAttribute('value', rankText);
      col1.setAttribute('align', 'center');
      col1.setAttribute('color', rankColor);
      col1.setAttribute('width', '1');
      col1.setAttribute('position', `-0.42 ${yPosition} 0`);
      leaderboardContainer.appendChild(col1);

      // Nom
      const col2 = document.createElement('a-text');
      col2.setAttribute('value', entry.name);
      col2.setAttribute('align', 'left');
      col2.setAttribute('color', isCurrentPlayer ? '#FFD700' : '#ffffff');
      col2.setAttribute('width', '0.9');
      col2.setAttribute('position', `-0.15 ${yPosition} 0`);
      leaderboardContainer.appendChild(col2);

      // Score
      const col3 = document.createElement('a-text');
      const scoreColor = entry.score >= 0 ? '#00ff00' : '#ff6b6b';
      col3.setAttribute('value', `${entry.score} pts`);
      col3.setAttribute('align', 'right');
      col3.setAttribute('color', scoreColor);
      col3.setAttribute('width', '1');
      col3.setAttribute('position', `0.52 ${yPosition} 0`);
      leaderboardContainer.appendChild(col3);

      yPosition -= 0.10;
    });

    endScreen3D.appendChild(leaderboardContainer);
    console.log('🎮 Classement 3D affiché avec', leaderboard.length, 'entrées');
  }

  // Fonction pour afficher l'écran de classement HTML
  function showLeaderboardScreen() {
    // Masquer l'écran de fin de partie
    const endGameScreen = document.getElementById('end-game-screen');
    if (endGameScreen) endGameScreen.style.display = 'none';

    // Afficher le classement
    displayLeaderboard();

    // Afficher l'écran de classement
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    if (leaderboardScreen) leaderboardScreen.style.display = 'flex';

    console.log('📊 Écran de classement affiché');
  }

  // Fonction pour masquer l'écran de classement
  function hideLeaderboardScreen() {
    const leaderboardScreen = document.getElementById('leaderboard-screen');
    if (leaderboardScreen) leaderboardScreen.style.display = 'none';
  }

  // Fonction pour définir le nom du joueur actuel
  function setPlayerName(name) {
    currentPlayerName = name.trim();
    console.log('👤 Joueur actuel:', currentPlayerName);
  }

  // Fonction pour obtenir le nom du joueur actuel
  function getPlayerName() {
    return currentPlayerName;
  }

  // Initialisation des gestionnaires d'événements
  function initLeaderboardUI() {
    // Bouton pour démarrer le jeu (depuis l'écran de saisie du nom)
    const startButton = document.getElementById('btn-start-game');
    const playerNameInput = document.getElementById('player-name-input');
    const playerNameScreen = document.getElementById('player-name-screen');
    const weaponChoiceScreen = document.getElementById('weapon-choice-screen');

    if (startButton && playerNameInput) {
      startButton.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        
        if (name === '') {
          alert('Veuillez entrer votre nom !');
          playerNameInput.focus();
          return;
        }

        setPlayerName(name);

        // Masquer l'écran de saisie du nom
        if (playerNameScreen) playerNameScreen.style.display = 'none';

        // Afficher l'écran de choix d'arme (nouvelle étape)
        if (weaponChoiceScreen) {
          weaponChoiceScreen.style.display = 'flex';
          console.log('🗡️ Affichage de l\'écran de choix d\'arme');
        }

        console.log('✅ Nom du joueur enregistré:', name);
      });

      // Permettre de valider avec la touche Entrée
      playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          startButton.click();
        }
      });
    }

    // Bouton "Classement" depuis l'écran de fin de partie
    const leaderboardButton = document.getElementById('btn-leaderboard');
    if (leaderboardButton) {
      leaderboardButton.addEventListener('click', () => {
        showLeaderboardScreen();
      });
    }

    // Bouton "Classement" 3D depuis l'écran de fin VR
    const leaderboard3DButton = document.querySelector('#btn-leaderboard-3d');
    if (leaderboard3DButton) {
      leaderboard3DButton.addEventListener('click', () => {
        // En VR, on modifie le panneau 3D pour afficher le classement
        const endScreen3D = document.querySelector('#end-screen-3d');
        if (endScreen3D) {
          // Changer le titre
          const title = endScreen3D.querySelector('a-text[value*="FIN DE LA PARTIE"]');
          if (title) title.setAttribute('value', '🏆 CLASSEMENT 🏆');
          
          const subtitle = endScreen3D.querySelector('a-text[value*="Poissons"]');
          if (subtitle) subtitle.setAttribute('value', 'Top 10 Joueurs');

          // Afficher le classement à la place du tableau de scores
          displayLeaderboard3D();

          // Optionnellement, modifier les boutons pour retourner au récapitulatif
          // Pour simplifier, on peut juste afficher le classement
        }
      });
    }

    // Boutons depuis l'écran de classement
    const leaderboardRestartBtn = document.getElementById('btn-leaderboard-restart');
    if (leaderboardRestartBtn) {
      leaderboardRestartBtn.addEventListener('click', () => {
        hideLeaderboardScreen();
        try {
          if (window.gameTimer && window.gameTimer.resetGame) window.gameTimer.resetGame();
          setTimeout(() => {
            try {
              if (window.gameTimer && window.gameTimer.startGame) window.gameTimer.startGame(60);
            } catch (e) {}
          }, 200);
        } catch (e) {
          console.warn('Erreur lors du redémarrage:', e);
        }
      });
    }

    const leaderboardQuitBtn = document.getElementById('btn-leaderboard-quit');
    if (leaderboardQuitBtn) {
      leaderboardQuitBtn.addEventListener('click', () => {
        // Retour au menu principal (recharger la page)
        window.location.reload();
      });
    }

    console.log('✅ Leaderboard UI initialisée');
  }

  // Exposer les fonctions globalement
  window.leaderboardManager = {
    addScore: addScore,
    loadLeaderboard: loadLeaderboard,
    displayLeaderboard: displayLeaderboard,
    displayLeaderboard3D: displayLeaderboard3D,
    showLeaderboardScreen: showLeaderboardScreen,
    hideLeaderboardScreen: hideLeaderboardScreen,
    setPlayerName: setPlayerName,
    getPlayerName: getPlayerName
  };

  // Initialiser au chargement du DOM
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initLeaderboardUI, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initLeaderboardUI);
  }

  console.log('✅ Leaderboard Manager chargé');
})();
