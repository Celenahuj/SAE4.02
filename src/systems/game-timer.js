// Système de chronomètre et gestion de la fin de jeu (adapté depuis la branche score-challenge)
(function () {
  let gameActive = false;
  let timeRemaining = 60; // seconds
  let caughtFishes = [];
  let totalScore = 0;
  let timerInterval = null;

  function formatTime(sec) {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  window.gameTimer = {
    startGame: function (duration = 60) {
      gameActive = true;
      timeRemaining = duration;
      caughtFishes = [];
      totalScore = 0;

      // show HTML timer
      const timerDisplay = document.getElementById('timer-display');
      if (timerDisplay) timerDisplay.style.display = 'block';

      // show 3D timer
      const timer3D = document.querySelector('#timer-3d');
      if (timer3D) timer3D.setAttribute('visible', 'true');

      // show bonus panel
      const bonusFish = document.querySelector('#bonus-fish');
      if (bonusFish) bonusFish.setAttribute('visible', 'true');

      // show score display in VR
      const scoreDisplay = document.querySelector('#score-display');
      if (scoreDisplay) scoreDisplay.setAttribute('visible', 'true');
      // initialize score display value
      if (scoreDisplay) scoreDisplay.setAttribute('value', 'Fish: 0 | Points: 0');

      // show water and bubbles if present
      const waterSurface = document.querySelector('#water-surface');
      if (waterSurface) {
        waterSurface.setAttribute('visible', 'true');
        const animation = waterSurface.components && waterSurface.components.animation;
        if (animation && animation.beginAnimation) animation.beginAnimation();
      }
      const bubbles = document.querySelector('#bubbles');
      if (bubbles) bubbles.setAttribute('visible', 'true');

      // show spear
      const spear = document.querySelector('#spear');
      if (spear) spear.setAttribute('visible', 'true');

      // show all fish-target entities
      const fishTargets = document.querySelectorAll('.fish-target');
      fishTargets.forEach(f => f.setAttribute('visible', 'true'));

      // update displays and start tick
      this.updateTimerDisplay();
      timerInterval = setInterval(() => {
        timeRemaining--;
        this.updateTimerDisplay();
        if (timeRemaining <= 0) this.endGame();
      }, 1000);

      console.log('🎮 Game started! Duration:', duration, 'seconds');
    },

    updateTimerDisplay: function () {
      const t = formatTime(timeRemaining);
      const timerDisplay = document.getElementById('timer-display');
      if (timerDisplay) {
        timerDisplay.textContent = t;
        timerDisplay.style.color = timeRemaining <= 10 ? '#e74c3c' : '#FFD700';
      }
      const timerText3D = document.querySelector('#timer-text');
      if (timerText3D) timerText3D.setAttribute('value', t);
    },

    addCaughtFish: function (fishType, isCorrect, points) {
      caughtFishes.push({ type: fishType, isCorrect: isCorrect, points: points, timestamp: new Date().toLocaleTimeString() });
      totalScore += points;

      // Update HUD (both HTML overlay and 3D text) when a fish is caught
      try {
        const scoreDisplay = document.querySelector('#score-display');
        if (scoreDisplay) {
          const count = caughtFishes.length;
          scoreDisplay.setAttribute('value', `Fish: ${count} | Points: ${totalScore}`);
        }
        const scoreDisplayHTML = document.getElementById('timer-display'); // reuse timer overlay for now
        if (scoreDisplayHTML) {
          // keep timer display separate; no change
        }
      } catch (e) { /* ignore HUD update errors */ }

      console.log(`🐟 Fish added: ${fishType} (${isCorrect ? 'CORRECT' : 'INCORRECT'}) ${points >= 0 ? '+' : ''}${points}pts - Total: ${totalScore}`);
    },

    endGame: function () {
      gameActive = false;
      if (timerInterval) clearInterval(timerInterval);
      console.log('🏁 Game ended!');
      this.showEndGameScreen();
    },

    showEndGameScreen: function () {
      // hide timers and bonus
      const timer3D = document.querySelector('#timer-3d'); if (timer3D) timer3D.setAttribute('visible', 'false');
      const bonusFish = document.querySelector('#bonus-fish'); if (bonusFish) bonusFish.setAttribute('visible', 'false');
      const scoreDisplay = document.querySelector('#score-display'); if (scoreDisplay) scoreDisplay.setAttribute('visible', 'false');

      // show 3D end screen
      const endScreen3D = document.querySelector('#end-screen-3d'); if (endScreen3D) { endScreen3D.setAttribute('visible','true'); this.populateScoreTable3D(); }

      // show HTML end screen
      const endGameScreen = document.getElementById('end-game-screen'); if (endGameScreen) { this.populateScoreTable(); endGameScreen.style.display = 'flex'; }
    },

    populateScoreTable: function () {
      const tableBody = document.getElementById('score-table-body'); if (!tableBody) return;
      tableBody.innerHTML = '';
      if (caughtFishes.length === 0) {
        const r = document.createElement('tr'); r.innerHTML = `<td colspan="3" style="text-align:center;color:#999;">😢 No fish caught...</td>`; tableBody.appendChild(r); return;
      }
      const groups = {};
      let calcTotal = 0;
      caughtFishes.forEach(f => {
        const key = `${f.type}_${f.isCorrect ? 'correct' : 'incorrect'}`;
        if (!groups[key]) groups[key] = { name: (f.type === 'piranha' ? '🐠 Piranha' : '🐟 Fish') + (f.isCorrect ? ' ✅' : ' ❌'), count: 0, points: 0, isCorrect: f.isCorrect };
        groups[key].count++; groups[key].points += f.points; calcTotal += f.points;
      });
      totalScore = calcTotal;
      Object.values(groups).forEach(g => {
        const row = document.createElement('tr'); row.className = g.isCorrect ? 'correct-row' : 'incorrect-row'; const pointsColor = g.points >= 0 ? '#00ff00' : '#ff0000'; row.innerHTML = `<td>${g.name}</td><td>x ${g.count}</td><td style="color:${pointsColor}">${g.points > 0 ? '+' : ''}${g.points} pts</td>`; tableBody.appendChild(row);
      });
      const totalRow = document.createElement('tr'); totalRow.className = 'total-row'; const totalColor = totalScore >= 0 ? '#FFD700' : '#ff6b6b'; totalRow.innerHTML = `<td><strong>TOTAL</strong></td><td></td><td style="color:${totalColor}"><strong>${totalScore > 0 ? '+' : ''}${totalScore} pts</strong></td>`; tableBody.appendChild(totalRow);
    },

    populateScoreTable3D: function () {
      const endScreen3D = document.querySelector('#end-screen-3d'); if (!endScreen3D) return;
      const old = document.querySelector('#dynamic-score-table-3d'); if (old) old.parentNode.removeChild(old);
      if (caughtFishes.length === 0) {
        const t = document.createElement('a-text'); t.setAttribute('id','score-list-3d'); t.setAttribute('value','No fish caught...'); t.setAttribute('align','center'); t.setAttribute('color','#999999'); t.setAttribute('width','1.8'); t.setAttribute('position','0 0 0'); endScreen3D.appendChild(t); return;
      }
      const tableContainer = document.createElement('a-entity'); tableContainer.setAttribute('id','dynamic-score-table-3d'); tableContainer.setAttribute('position','0 0.3 0.01');
      const fishGroups = {}; let calcTotal = 0; caughtFishes.forEach(f=>{ const key = `${f.type}_${f.isCorrect ? 'correct' : 'incorrect'}`; if(!fishGroups[key]) fishGroups[key] = { count:0, points:0, name: (f.type==='piranha'?'🐠 Piranha':'🐟 Poisson') + (f.isCorrect?' ✅':' ❌'), isCorrect: f.isCorrect }; fishGroups[key].count++; fishGroups[key].points += f.points; calcTotal += f.points; }); totalScore = calcTotal;
      // headers
      const headerBg = document.createElement('a-plane'); headerBg.setAttribute('color','#FFD700'); headerBg.setAttribute('opacity','0.2'); headerBg.setAttribute('width','1.1'); headerBg.setAttribute('height','0.08'); headerBg.setAttribute('position','0 0 -0.01'); tableContainer.appendChild(headerBg);
      const header1 = document.createElement('a-text'); header1.setAttribute('value','Fish Type'); header1.setAttribute('align','left'); header1.setAttribute('color','#FFD700'); header1.setAttribute('width','1'); header1.setAttribute('position','-0.52 0 0'); tableContainer.appendChild(header1);
      const header2 = document.createElement('a-text'); header2.setAttribute('value','Quantity'); header2.setAttribute('align','center'); header2.setAttribute('color','#FFD700'); header2.setAttribute('width','1'); header2.setAttribute('position','0 0 0'); tableContainer.appendChild(header2);
      const header3 = document.createElement('a-text'); header3.setAttribute('value','Points'); header3.setAttribute('align','right'); header3.setAttribute('color','#FFD700'); header3.setAttribute('width','1'); header3.setAttribute('position','0.52 0 0'); tableContainer.appendChild(header3);
      let yPosition = -0.12; Object.values(fishGroups).forEach(group => { const rowBg = document.createElement('a-plane'); rowBg.setAttribute('color', group.isCorrect ? '#00ff00' : '#ff0000'); rowBg.setAttribute('opacity','0.1'); rowBg.setAttribute('width','1.1'); rowBg.setAttribute('height','0.08'); rowBg.setAttribute('position',`0 ${yPosition} -0.01`); tableContainer.appendChild(rowBg); const col1 = document.createElement('a-text'); col1.setAttribute('value', group.name); col1.setAttribute('align','left'); col1.setAttribute('color','#ffffff'); col1.setAttribute('width','0.9'); col1.setAttribute('position',`-0.52 ${yPosition} 0`); tableContainer.appendChild(col1); const col2 = document.createElement('a-text'); col2.setAttribute('value', `x ${group.count}`); col2.setAttribute('align','center'); col2.setAttribute('color','#ffffff'); col2.setAttribute('width','1'); col2.setAttribute('position',`0 ${yPosition} 0`); tableContainer.appendChild(col2); const col3 = document.createElement('a-text'); const pointsColor = group.points >= 0 ? '#00ff00' : '#ff0000'; const sign = group.points > 0 ? '+' : ''; col3.setAttribute('value', `${sign}${group.points} pts`); col3.setAttribute('align','right'); col3.setAttribute('color', pointsColor); col3.setAttribute('width','1'); col3.setAttribute('position',`0.52 ${yPosition} 0`); tableContainer.appendChild(col3); yPosition -= 0.10; });
      // TOTAL
      yPosition -= 0.02; const totalBg = document.createElement('a-plane'); totalBg.setAttribute('color','#FFD700'); totalBg.setAttribute('opacity','0.25'); totalBg.setAttribute('width','1.1'); totalBg.setAttribute('height','0.09'); totalBg.setAttribute('position',`0 ${yPosition} -0.01`); tableContainer.appendChild(totalBg); const totalLabel = document.createElement('a-text'); totalLabel.setAttribute('value','TOTAL'); totalLabel.setAttribute('align','left'); totalLabel.setAttribute('color','#FFD700'); totalLabel.setAttribute('width','1'); totalLabel.setAttribute('position',`-0.52 ${yPosition} 0`); tableContainer.appendChild(totalLabel); const totalValue = document.createElement('a-text'); const totalColor = totalScore >= 0 ? '#FFD700' : '#ff6b6b'; const totalSign = totalScore > 0 ? '+' : ''; totalValue.setAttribute('value', `${totalSign}${totalScore} pts`); totalValue.setAttribute('align','right'); totalValue.setAttribute('color', totalColor); totalValue.setAttribute('width','1'); totalValue.setAttribute('position', `0.52 ${yPosition} 0`); tableContainer.appendChild(totalValue);
      endScreen3D.appendChild(tableContainer);
    },

    resetGame: function () {
      gameActive = false; if (timerInterval) clearInterval(timerInterval); timeRemaining = 60; caughtFishes = []; totalScore = 0;
      const endGameScreen = document.getElementById('end-game-screen'); if (endGameScreen) endGameScreen.style.display = 'none';
      const endScreen3D = document.querySelector('#end-screen-3d'); if (endScreen3D) endScreen3D.setAttribute('visible','false');
      const timer3D = document.querySelector('#timer-3d'); if (timer3D) timer3D.setAttribute('visible','false');
      const timerDisplay = document.getElementById('timer-display'); if (timerDisplay) { timerDisplay.style.display = 'none'; timerDisplay.textContent = '1:00'; timerDisplay.style.color = '#FFD700'; }
      const timerText3D = document.querySelector('#timer-text'); if (timerText3D) { timerText3D.setAttribute('value','1:00'); timerText3D.setAttribute('color','#FFD700'); }
      const scoreDisplayReset = document.querySelector('#score-display'); if (scoreDisplayReset) scoreDisplayReset.setAttribute('value','Fish: 0 | Points: 0');
      const grabManager = document.querySelector('[grab-manager]'); if (grabManager && grabManager.components && grabManager.components['grab-manager']) { grabManager.components['grab-manager'].fishCaught = 0; grabManager.components['grab-manager'].points = 0; }
      const fishTargets = document.querySelectorAll('.fish-target'); fishTargets.forEach(f => { delete f.dataset.caught; f.setAttribute('visible', 'false'); });
      console.log('🔄 Game reset');
    },

    isGameActive: function () { return gameActive; },
    getCaughtFishes: function () { return caughtFishes; },
    getTotalScore: function () { return totalScore; }
  };

  console.log('✅ Game timer system loaded');
})();
