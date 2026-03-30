/* ═══════════════════════════════════════════════
   Rock Paper Scissors — Game Logic
   Supports: vs CPU & Local 1v1
   ═══════════════════════════════════════════════ */

const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJIS = { rock: '🪨', paper: '📄', scissors: '✂️' };
const OUTCOMES = {
  rock:     { rock: 'draw', paper: 'lose', scissors: 'win' },
  paper:    { rock: 'win',  paper: 'draw', scissors: 'lose' },
  scissors: { rock: 'lose', paper: 'win',  scissors: 'draw' },
};

// ─── State ───────────────────────────────────
let state = {
  gameMode: 'cpu',   // 'cpu' or 'pvp'
  mode: 5,           // first-to-N, or Infinity for endless
  playerScore: 0,
  cpuScore: 0,
  round: 1,
  history: [],       // ['win', 'lose', 'draw', ...]  (from P1's perspective)
  isPlaying: false,
  isAnimating: false,
  // PvP specific
  pvpTurn: 1,        // 1 or 2 — whose turn to pick
  p1Choice: null,    // Player 1's secret choice
  p2Choice: null,    // Player 2's secret choice
};

// ─── DOM refs ────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const screens = {
  start:    $('#start-screen'),
  turn:     $('#turn-screen'),
  game:     $('#game-screen'),
  gameover: $('#gameover-screen'),
};

const els = {
  playBtn:         $('#play-btn'),
  modeBtns:        $$('.mode-btn'),
  roundBtns:       $$('.round-btn'),
  weaponBtns:      $$('.weapon-btn'),
  playerScore:     $('#player-score'),
  cpuScore:        $('#cpu-score'),
  roundText:       $('#round-text'),
  playerEmoji:     $('#player-emoji'),
  cpuEmoji:        $('#cpu-emoji'),
  playerDisplay:   $('#player-choice-display'),
  cpuDisplay:      $('#cpu-choice-display'),
  resultBadge:     $('#result-badge'),
  resultText:      $('#result-text'),
  historyStrip:    $('#history-strip'),
  resetBtn:        $('#reset-btn'),
  rematchBtn:      $('#rematch-btn'),
  homeBtn:         $('#home-btn'),
  gameoverTitle:   $('#gameover-title'),
  gameoverSub:     $('#gameover-subtitle'),
  trophyEmoji:     $('#trophy-emoji'),
  finalPlayerScore:$('#final-player-score'),
  finalCpuScore:   $('#final-cpu-score'),
  playerScoreCard: $('#player-score-card'),
  cpuScoreCard:    $('#cpu-score-card'),
  // Labels
  p1Label:         $('#p1-label'),
  p2Label:         $('#p2-label'),
  p1SideLabel:     $('#p1-side-label'),
  p2SideLabel:     $('#p2-side-label'),
  fsP1Label:       $('#fs-p1-label'),
  fsP2Label:       $('#fs-p2-label'),
  // Turn screen
  turnIcon:        $('#turn-icon'),
  turnTitle:       $('#turn-title'),
  turnSubtitle:    $('#turn-subtitle'),
  readyBtn:        $('#ready-btn'),
  // PvP indicator
  pvpTurnIndicator:$('#pvp-turn-indicator'),
  pvpTurnText:     $('#pvp-turn-text'),
};

// ─── Screen Management ───────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ─── Sound FX (Web Audio) ────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, duration, type = 'sine', volume = 0.12) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function sfxClick()  { playTone(600, 0.08, 'sine', 0.1); }
function sfxReveal() { playTone(440, 0.15, 'triangle', 0.1); }
function sfxWin()    { playTone(523, 0.12); setTimeout(() => playTone(659, 0.12), 100); setTimeout(() => playTone(784, 0.2), 200); }
function sfxLose()   { playTone(330, 0.2, 'sawtooth', 0.06); setTimeout(() => playTone(260, 0.3, 'sawtooth', 0.06), 150); }
function sfxDraw()   { playTone(440, 0.15, 'square', 0.05); }

// ─── Confetti ────────────────────────────────
function spawnConfetti(count = 50) {
  const colors = ['#4ecdc4', '#ff6b6b', '#ffd93d', '#a88beb', '#667eea', '#f5576c', '#44e89e'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = -10 + 'px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width = (6 + Math.random() * 8) + 'px';
    el.style.height = (6 + Math.random() * 8) + 'px';
    el.style.animationDuration = (1.5 + Math.random() * 2) + 's';
    el.style.animationDelay = (Math.random() * 0.8) + 's';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

// ─── Helpers ─────────────────────────────────
function cpuChoice() {
  return CHOICES[Math.floor(Math.random() * 3)];
}

function getWinTarget() {
  if (state.mode === Infinity) return Infinity;
  return state.mode;
}

function resetState() {
  state.playerScore = 0;
  state.cpuScore = 0;
  state.round = 1;
  state.history = [];
  state.isAnimating = false;
  state.pvpTurn = 1;
  state.p1Choice = null;
  state.p2Choice = null;
}

function updateLabels() {
  if (state.gameMode === 'pvp') {
    els.p1Label.textContent = 'P1';
    els.p2Label.textContent = 'P2';
    els.p1SideLabel.textContent = "Player 1's Pick";
    els.p2SideLabel.textContent = "Player 2's Pick";
    els.fsP1Label.textContent = 'Player 1';
    els.fsP2Label.textContent = 'Player 2';
  } else {
    els.p1Label.textContent = 'You';
    els.p2Label.textContent = 'CPU';
    els.p1SideLabel.textContent = 'Your Pick';
    els.p2SideLabel.textContent = "CPU's Pick";
    els.fsP1Label.textContent = 'You';
    els.fsP2Label.textContent = 'CPU';
  }
}

function updateScoreboard() {
  els.playerScore.textContent = state.playerScore;
  els.cpuScore.textContent = state.cpuScore;
  els.roundText.textContent = state.mode === Infinity ? `Round ${state.round}` : `First to ${state.mode} · Round ${state.round}`;
}

function resetArena() {
  els.playerEmoji.textContent = '❓';
  els.cpuEmoji.textContent = '❓';
  els.playerDisplay.className = 'choice-display';
  els.cpuDisplay.className = 'choice-display';
  els.resultBadge.className = 'result-badge';
  els.resultText.textContent = 'Choose your weapon!';
}

function addHistoryDot(outcome) {
  const dot = document.createElement('div');
  dot.className = `history-dot ${outcome}`;
  const label = state.gameMode === 'pvp'
    ? (outcome === 'win' ? 'P1' : outcome === 'lose' ? 'P2' : 'D')
    : (outcome === 'win' ? 'W' : outcome === 'lose' ? 'L' : 'D');
  dot.textContent = label;
  els.historyStrip.appendChild(dot);
}

function setWeaponsDisabled(disabled) {
  els.weaponBtns.forEach(btn => {
    btn.classList.toggle('disabled', disabled);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════
// CPU MODE — Play Round
// ═══════════════════════════════════════════════
async function playCpuRound(playerPick) {
  if (state.isAnimating) return;
  state.isAnimating = true;
  setWeaponsDisabled(true);
  sfxClick();

  // Reset display classes
  els.playerDisplay.className = 'choice-display';
  els.cpuDisplay.className = 'choice-display';
  els.resultBadge.className = 'result-badge';

  // Show player choice immediately
  els.playerEmoji.textContent = EMOJIS[playerPick];
  els.playerDisplay.classList.add('reveal');

  // CPU "thinking" animation
  els.cpuDisplay.classList.add('shaking');
  els.cpuEmoji.textContent = '🤔';
  els.resultText.textContent = 'CPU is thinking...';

  await delay(800);

  // Reveal CPU choice
  const cpu = cpuChoice();
  els.cpuDisplay.classList.remove('shaking');
  els.cpuEmoji.textContent = EMOJIS[cpu];
  els.cpuDisplay.classList.add('reveal');
  sfxReveal();

  await delay(300);

  // Determine outcome
  const outcome = OUTCOMES[playerPick][cpu];
  state.history.push(outcome);

  showOutcome(outcome);
  addHistoryDot(outcome);
  updateScoreboard();

  setTimeout(() => {
    els.playerScoreCard.classList.remove('pulse');
    els.cpuScoreCard.classList.remove('pulse');
  }, 600);

  // Check game over
  const winTarget = getWinTarget();
  if (state.playerScore >= winTarget || state.cpuScore >= winTarget) {
    await delay(1200);
    endGame();
    return;
  }

  state.round++;

  await delay(1000);
  state.isAnimating = false;
  setWeaponsDisabled(false);
}

// ═══════════════════════════════════════════════
// PVP MODE — Local 1v1
// ═══════════════════════════════════════════════

function showTurnScreen(playerNum) {
  els.turnIcon.textContent = playerNum === 1 ? '🟦' : '🟥';
  els.turnTitle.textContent = `Player ${playerNum}'s Turn`;
  els.turnSubtitle.textContent = `Hand the device to Player ${playerNum}`;
  showScreen('turn');
}

function startPvpTurn(playerNum) {
  state.pvpTurn = playerNum;
  state.isAnimating = false;

  // Reset display
  els.playerDisplay.className = 'choice-display';
  els.cpuDisplay.className = 'choice-display';
  els.resultBadge.className = 'result-badge';

  // Hide both choices (show question marks)
  els.playerEmoji.textContent = '❓';
  els.cpuEmoji.textContent = '❓';

  if (playerNum === 1) {
    // If P1 hasn't chosen yet, show fresh
    els.resultText.textContent = 'Player 1 — Pick your weapon!';
    els.pvpTurnText.textContent = '🟦 Player 1 — Pick your weapon!';
  } else {
    // P1 has chosen, show locked in (but hidden)
    els.playerEmoji.textContent = '🔒';
    els.resultText.textContent = 'Player 2 — Pick your weapon!';
    els.pvpTurnText.textContent = '🟥 Player 2 — Pick your weapon!';
  }

  els.pvpTurnIndicator.style.display = 'flex';
  setWeaponsDisabled(false);
  showScreen('game');
}

async function pvpPickWeapon(choice) {
  if (state.isAnimating) return;
  sfxClick();

  if (state.pvpTurn === 1) {
    // Player 1 picks — store secretly, don't reveal
    state.p1Choice = choice;
    state.isAnimating = true;
    setWeaponsDisabled(true);

    // Brief confirmation
    els.playerEmoji.textContent = '✅';
    els.resultText.textContent = 'Player 1 locked in!';

    await delay(600);

    // Now show turn screen for Player 2
    showTurnScreen(2);

  } else if (state.pvpTurn === 2) {
    // Player 2 picks — now resolve!
    state.p2Choice = choice;
    state.isAnimating = true;
    setWeaponsDisabled(true);
    els.pvpTurnIndicator.style.display = 'none';

    // Brief confirmation
    els.cpuEmoji.textContent = '✅';
    els.resultText.textContent = 'Player 2 locked in!';

    await delay(600);

    // Reveal both simultaneously with countdown
    els.playerDisplay.className = 'choice-display';
    els.cpuDisplay.className = 'choice-display';
    els.resultBadge.className = 'result-badge';

    // Countdown
    els.playerEmoji.textContent = '🔒';
    els.cpuEmoji.textContent = '🔒';

    els.resultText.textContent = '3...';
    await delay(500);
    els.resultText.textContent = '2...';
    await delay(500);
    els.resultText.textContent = '1...';
    await delay(500);
    els.resultText.textContent = 'REVEAL!';
    sfxReveal();

    await delay(200);

    // Show both choices
    els.playerEmoji.textContent = EMOJIS[state.p1Choice];
    els.cpuEmoji.textContent = EMOJIS[state.p2Choice];
    els.playerDisplay.classList.add('reveal');
    els.cpuDisplay.classList.add('reveal');

    await delay(400);

    // Determine outcome (from P1's perspective)
    const outcome = OUTCOMES[state.p1Choice][state.p2Choice];
    state.history.push(outcome);

    showOutcome(outcome);
    addHistoryDot(outcome);
    updateScoreboard();

    setTimeout(() => {
      els.playerScoreCard.classList.remove('pulse');
      els.cpuScoreCard.classList.remove('pulse');
    }, 600);

    // Check game over
    const winTarget = getWinTarget();
    if (state.playerScore >= winTarget || state.cpuScore >= winTarget) {
      await delay(1500);
      endGame();
      return;
    }

    state.round++;

    // Wait, then go to P1 turn screen for next round
    await delay(2000);

    state.p1Choice = null;
    state.p2Choice = null;

    showTurnScreen(1);
  }
}

// ═══════════════════════════════════════════════
// SHARED — Outcome display
// ═══════════════════════════════════════════════

function showOutcome(outcome) {
  if (outcome === 'win') {
    state.playerScore++;
    if (state.gameMode === 'pvp') {
      els.resultText.textContent = '🟦 Player 1 Wins!';
    } else {
      els.resultText.textContent = '🎉 You Win!';
    }
    els.resultBadge.classList.add('win', 'pop');
    els.playerDisplay.classList.add('winner');
    els.cpuDisplay.classList.add('loser');
    els.playerScoreCard.classList.add('pulse');
    sfxWin();
  } else if (outcome === 'lose') {
    state.cpuScore++;
    if (state.gameMode === 'pvp') {
      els.resultText.textContent = '🟥 Player 2 Wins!';
    } else {
      els.resultText.textContent = '😵 You Lose!';
    }
    els.resultBadge.classList.add('lose', 'pop');
    els.cpuDisplay.classList.add('winner');
    els.playerDisplay.classList.add('loser');
    els.cpuScoreCard.classList.add('pulse');
    if (state.gameMode === 'cpu') sfxLose();
    else sfxWin(); // In PvP, someone wins either way
  } else {
    els.resultText.textContent = '🤝 Draw!';
    els.resultBadge.classList.add('draw', 'pop');
    els.playerDisplay.classList.add('draw-display');
    els.cpuDisplay.classList.add('draw-display');
    sfxDraw();
  }
}

// ─── End Game ────────────────────────────────
function endGame() {
  const p1Won = state.playerScore > state.cpuScore;

  screens.gameover.classList.remove('player-wins', 'cpu-wins');
  screens.gameover.classList.add(p1Won ? 'player-wins' : 'cpu-wins');

  if (state.gameMode === 'pvp') {
    els.trophyEmoji.textContent = '🏆';
    els.gameoverTitle.textContent = p1Won ? 'Player 1 Wins!' : 'Player 2 Wins!';
    els.gameoverSub.textContent = p1Won
      ? 'Player 1 dominated the showdown!'
      : 'Player 2 dominated the showdown!';
  } else {
    els.trophyEmoji.textContent = p1Won ? '🏆' : '😢';
    els.gameoverTitle.textContent = p1Won ? 'You Win!' : 'You Lose!';
    els.gameoverSub.textContent = p1Won
      ? 'Incredible performance, Champion!'
      : 'Better luck next time!';
  }

  els.finalPlayerScore.textContent = state.playerScore;
  els.finalCpuScore.textContent = state.cpuScore;

  showScreen('gameover');

  if (p1Won || state.gameMode === 'pvp') {
    spawnConfetti(60);
    sfxWin();
  } else {
    sfxLose();
  }
}

// ─── Start / Reset ───────────────────────────
function startGame() {
  resetState();
  updateLabels();
  updateScoreboard();
  resetArena();
  els.historyStrip.innerHTML = '';
  setWeaponsDisabled(false);

  if (state.gameMode === 'pvp') {
    els.pvpTurnIndicator.style.display = 'flex';
    showTurnScreen(1);
  } else {
    els.pvpTurnIndicator.style.display = 'none';
    showScreen('game');
  }
}

// ─── Event Listeners ─────────────────────────

// Game mode selection
els.modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    els.modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.gameMode = btn.dataset.mode;
    sfxClick();
  });
});

// Round selection
els.roundBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    els.roundBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const val = btn.dataset.rounds;
    state.mode = val === '∞' ? Infinity : parseInt(val);
    sfxClick();
  });
});

// Play button
els.playBtn.addEventListener('click', () => {
  sfxClick();
  startGame();
});

// Ready button (PvP turn screen)
els.readyBtn.addEventListener('click', () => {
  sfxClick();
  // Determine which player is about to pick
  if (state.p1Choice === null) {
    startPvpTurn(1);
  } else {
    startPvpTurn(2);
  }
});

// Weapon buttons — dispatch to correct handler
els.weaponBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (state.gameMode === 'pvp') {
      pvpPickWeapon(btn.dataset.choice);
    } else {
      playCpuRound(btn.dataset.choice);
    }
  });
});

// Reset button
els.resetBtn.addEventListener('click', () => {
  sfxClick();
  showScreen('start');
});

// Rematch
els.rematchBtn.addEventListener('click', () => {
  sfxClick();
  startGame();
});

// Home
els.homeBtn.addEventListener('click', () => {
  sfxClick();
  showScreen('start');
});

// Keyboard controls (only for CPU mode to avoid conflicts in PvP)
document.addEventListener('keydown', (e) => {
  if (!screens.game.classList.contains('active') || state.isAnimating) return;

  const key = e.key.toLowerCase();
  if (state.gameMode === 'cpu') {
    if (key === 'r' || key === '1') playCpuRound('rock');
    else if (key === 'p' || key === '2') playCpuRound('paper');
    else if (key === 's' || key === '3') playCpuRound('scissors');
  } else {
    // PvP keyboard controls
    if (key === 'r' || key === '1') pvpPickWeapon('rock');
    else if (key === 'p' || key === '2') pvpPickWeapon('paper');
    else if (key === 's' || key === '3') pvpPickWeapon('scissors');
  }
});

// Space/Enter on turn screen
document.addEventListener('keydown', (e) => {
  if (!screens.turn.classList.contains('active')) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    els.readyBtn.click();
  }
});
