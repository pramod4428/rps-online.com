/**
 * Rock Paper Scissors – game logic
 * Supports: vs Computer (single-player) and Local Two-Player modes.
 */

'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const MOVES = ['rock', 'paper', 'scissors'];

const ICONS = { rock: '✊', paper: '🖐️', scissors: '✌️' };

const LABELS = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };

/** Returns 'win' | 'lose' | 'draw' from Player 1's perspective. */
function evaluate(p1, p2) {
  if (p1 === p2) return 'draw';
  if (
    (p1 === 'rock'     && p2 === 'scissors') ||
    (p1 === 'paper'    && p2 === 'rock')     ||
    (p1 === 'scissors' && p2 === 'paper')
  ) return 'win';
  return 'lose';
}

function randomMove() {
  return MOVES[Math.floor(Math.random() * MOVES.length)];
}

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  mode: 'computer',   // 'computer' | 'local'
  scores: { p1: 0, p2: 0 },
  round: 0,
  history: [],
  awaitingP2: false,  // local mode: P1 has chosen, waiting for P2
  p1Choice: null,
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const modeBtns       = document.querySelectorAll('.mode-btn');
const moveButtons    = document.querySelectorAll('.move-btn');
const p1Display      = document.getElementById('p1-display');
const p2Display      = document.getElementById('p2-display');
const p2Label        = document.getElementById('p2-label');
const resultBanner   = document.getElementById('result-banner');
const scoreP1El      = document.getElementById('score-p1');
const scoreP2El      = document.getElementById('score-p2');
const scoreP2Label   = document.getElementById('score-p2-label');
const moveSectionLabel = document.getElementById('move-section-label');
const p2Prompt       = document.getElementById('p2-prompt');
const historyList    = document.getElementById('history-list');
const resetBtn       = document.getElementById('reset-btn');
const clearBtn       = document.getElementById('clear-btn');

// ── Helpers ────────────────────────────────────────────────────────────────
function animateDisplay(el) {
  el.classList.remove('animate');
  void el.offsetWidth; // reflow
  el.classList.add('animate');
}

function setDisplay(el, move) {
  el.textContent = move ? ICONS[move] : '❓';
  animateDisplay(el);
}

function updateScores() {
  scoreP1El.textContent = state.scores.p1;
  scoreP2El.textContent = state.scores.p2;
}

function addHistoryEntry(round, p1, p2, outcome) {
  const li = document.createElement('li');
  li.className = outcome;

  const p2Name = state.mode === 'computer' ? 'CPU' : 'P2';
  const outcomeText = outcome === 'win' ? 'Win' : outcome === 'lose' ? 'Loss' : 'Draw';

  li.innerHTML =
    `<span class="round-num">#${round}</span>` +
    `<span>${ICONS[p1]} ${LABELS[p1]} vs ${ICONS[p2]} ${LABELS[p2]}</span>` +
    `<span>${outcomeText}</span>`;

  historyList.prepend(li);

  const empty = historyList.querySelector('.history-empty');
  if (empty) empty.remove();
}

function setResult(text, cls) {
  resultBanner.textContent = text;
  resultBanner.className = cls || '';
}

function setMoveButtonsDisabled(disabled) {
  moveButtons.forEach(btn => { btn.disabled = disabled; });
}

// ── Mode switching ─────────────────────────────────────────────────────────
function setMode(mode) {
  state.mode = mode;
  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  if (mode === 'computer') {
    p2Label.textContent = 'Computer';
    scoreP2Label.textContent = 'Computer';
    moveSectionLabel.textContent = 'Choose your move';
  } else {
    p2Label.textContent = 'Player 2';
    scoreP2Label.textContent = 'Player 2';
    moveSectionLabel.textContent = 'Player 1 – choose your move';
  }

  resetGame();
}

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

// ── Computer mode ──────────────────────────────────────────────────────────
function playVsComputer(p1Move) {
  const p2Move = randomMove();
  const outcome = evaluate(p1Move, p2Move);

  state.round += 1;
  if (outcome === 'win')  state.scores.p1 += 1;
  if (outcome === 'lose') state.scores.p2 += 1;

  setDisplay(p1Display, p1Move);
  setDisplay(p2Display, p2Move);
  updateScores();

  const resultText =
    outcome === 'win'  ? `🎉 You win! ${LABELS[p1Move]} beats ${LABELS[p2Move]}.`  :
    outcome === 'lose' ? `😞 You lose! ${LABELS[p2Move]} beats ${LABELS[p1Move]}.` :
                         `🤝 It's a draw! Both chose ${LABELS[p1Move]}.`;

  setResult(resultText, outcome);
  addHistoryEntry(state.round, p1Move, p2Move, outcome);
}

// ── Local two-player mode ──────────────────────────────────────────────────
function playLocalP1(move) {
  state.p1Choice = move;
  state.awaitingP2 = true;

  // Hide P1's choice visually until P2 has chosen
  setDisplay(p1Display, null);
  setDisplay(p2Display, null);
  setResult('Player 1 has chosen. Pass to Player 2…', '');

  p2Prompt.classList.add('visible');
  moveSectionLabel.textContent = 'Player 2 – choose your move';
}

function playLocalP2(p2Move) {
  const p1Move = state.p1Choice;
  const outcome = evaluate(p1Move, p2Move); // outcome from P1 perspective

  state.round += 1;
  if (outcome === 'win')  state.scores.p1 += 1;
  if (outcome === 'lose') state.scores.p2 += 1;

  state.awaitingP2 = false;
  state.p1Choice = null;

  setDisplay(p1Display, p1Move);
  setDisplay(p2Display, p2Move);
  updateScores();

  const resultText =
    outcome === 'win'  ? `🎉 Player 1 wins! ${LABELS[p1Move]} beats ${LABELS[p2Move]}.`  :
    outcome === 'lose' ? `🎉 Player 2 wins! ${LABELS[p2Move]} beats ${LABELS[p1Move]}.` :
                         `🤝 It's a draw! Both chose ${LABELS[p1Move]}.`;

  setResult(resultText, outcome);
  addHistoryEntry(state.round, p1Move, p2Move, outcome);

  p2Prompt.classList.remove('visible');
  moveSectionLabel.textContent = 'Player 1 – choose your move';
}

// ── Move button handler ────────────────────────────────────────────────────
moveButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const move = btn.dataset.move;

    if (state.mode === 'computer') {
      playVsComputer(move);
    } else {
      // Local two-player
      if (!state.awaitingP2) {
        playLocalP1(move);
      } else {
        playLocalP2(move);
      }
    }
  });
});

// ── Reset / Clear ──────────────────────────────────────────────────────────
function resetGame() {
  state.scores = { p1: 0, p2: 0 };
  state.round = 0;
  state.history = [];
  state.awaitingP2 = false;
  state.p1Choice = null;

  p1Display.textContent = '❓';
  p2Display.textContent = '❓';
  resultBanner.textContent = 'Make your move!';
  resultBanner.className = '';
  updateScores();
  p2Prompt.classList.remove('visible');
  historyList.innerHTML = '<li class="history-empty">No rounds played yet.</li>';

  if (state.mode === 'local') {
    moveSectionLabel.textContent = 'Player 1 – choose your move';
  } else {
    moveSectionLabel.textContent = 'Choose your move';
  }
}

resetBtn.addEventListener('click', resetGame);

clearBtn.addEventListener('click', () => {
  historyList.innerHTML = '<li class="history-empty">No rounds played yet.</li>';
});

// ── Init ───────────────────────────────────────────────────────────────────
setMode('computer');
