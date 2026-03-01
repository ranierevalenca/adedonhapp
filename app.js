const STORAGE_KEY = 'adedonha_championship_v1';
const categories = ['nome', 'cidade', 'animal', 'objeto', 'comida', 'cor'];

const state = loadState() || {
  theme: 'light',
  players: [],
  roundLimit: 5,
  currentRound: 0,
  totalRoundsPlayed: 0,
  usedLetters: [],
  currentLetter: '',
  ranking: {},
  history: [],
  timerLeft: 300,
  timerRunning: false,
  answersLocked: false
};

let intervalId;
const $ = (id) => document.getElementById(id);

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }

function addPlayer() {
  const name = $('player-name').value.trim();
  const avatar = $('player-avatar').value.trim() || '🙂';
  if (!name || state.players.length >= 10) return;
  if (state.players.length < 2 || !state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    state.players.push({ id: crypto.randomUUID(), name, avatar });
    state.ranking[name] ||= { points: 0, wins: 0, rounds: 0 };
  }
  $('player-name').value = '';
  $('player-avatar').value = '';
  render();
}

function startChampionship() {
  if (state.players.length < 2) return alert('Cadastre entre 2 e 10 jogadores.');
  state.roundLimit = Number($('round-limit').value);
  $('setup-card').classList.add('hidden');
  $('game-card').classList.remove('hidden');
  $('history-card').classList.remove('hidden');
  render();
}

function drawLetter() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const pool = alphabet.filter((l) => !state.usedLetters.includes(l));
  if (!pool.length) return alert('Todas as letras já foram usadas.');
  const letter = pool[Math.floor(Math.random() * pool.length)];
  state.currentLetter = letter;
  state.usedLetters.push(letter);
}

function newRound() {
  $('draw-animation').classList.remove('hidden');
  setTimeout(() => {
    drawLetter();
    state.currentRound += 1;
    state.totalRoundsPlayed += 1;
    state.timerLeft = 300;
    state.answersLocked = false;
    state.timerRunning = true;
    $('draw-animation').classList.add('hidden');
    buildAnswerRows();
    startTimer();
    render();
  }, 1200);
}

function startTimer() {
  clearInterval(intervalId);
  intervalId = setInterval(() => {
    if (!state.timerRunning) return;
    state.timerLeft -= 1;
    if (state.timerLeft === 60) $('alert-sound').play().catch(() => {});
    if (state.timerLeft <= 0) {
      state.timerLeft = 0;
      state.timerRunning = false;
      state.answersLocked = true;
      alert('TEMPO ESGOTADO!');
    }
    renderTimer();
    saveState();
  }, 1000);
}

function buildAnswerRows() {
  const body = $('answers-body');
  body.innerHTML = '';
  state.players.forEach((player) => {
    const tr = document.createElement('tr');
    tr.dataset.player = player.name;
    tr.innerHTML = `<td>${player.avatar} ${player.name}</td>${categories.map((c) => `<td><input data-cat="${c}" ${state.answersLocked ? 'disabled' : ''}></td>`).join('')}<td class="score">0</td>`;
    body.appendChild(tr);
  });
}

function scoreRound() {
  const entries = [];
  [...$('answers-body').querySelectorAll('tr')].forEach((tr) => {
    const player = tr.dataset.player;
    categories.forEach((cat) => {
      const input = tr.querySelector(`[data-cat="${cat}"]`);
      const value = input.value.trim().toUpperCase();
      const valid = value && value.startsWith(state.currentLetter);
      entries.push({ player, cat, value, valid, input });
      input.classList.toggle('valid', !!valid);
      input.classList.toggle('invalid', !valid);
    });
  });

  const grouped = {};
  entries.forEach((e) => {
    if (e.valid) {
      const key = `${e.cat}:${e.value}`;
      grouped[key] = (grouped[key] || 0) + 1;
    }
  });

  const scores = Object.fromEntries(state.players.map((p) => [p.name, 0]));
  entries.forEach((e) => {
    if (!e.valid) return;
    const key = `${e.cat}:${e.value}`;
    scores[e.player] += grouped[key] === 1 ? 10 : 5;
  });

  const top = Math.max(...Object.values(scores));
  Object.entries(scores).forEach(([name, pts]) => {
    const rank = state.ranking[name] ||= { points: 0, wins: 0, rounds: 0 };
    rank.points += pts;
    rank.rounds += 1;
    if (pts === top && top > 0) rank.wins += 1;
    const row = [...$('answers-body').querySelectorAll('tr')].find((r) => r.dataset.player === name);
    row.querySelector('.score').textContent = pts;
  });

  state.history.unshift({ round: state.totalRoundsPlayed, letter: state.currentLetter, scores, date: new Date().toLocaleString('pt-BR') });
  state.timerRunning = false;
  state.answersLocked = true;
  $('answers-body').querySelectorAll('input').forEach((i) => i.disabled = true);
  maybeFinishChampionship();
  render();
}

function maybeFinishChampionship() {
  if (state.roundLimit > 0 && state.totalRoundsPlayed >= state.roundLimit) {
    renderChampion();
    $('champion-modal').showModal();
  }
}

function rankingSorted() {
  return Object.entries(state.ranking).sort((a, b) => b[1].points - a[1].points);
}

function renderRanking() {
  const medals = ['🥇', '🥈', '🥉'];
  $('ranking-content').innerHTML = rankingSorted().map(([name, r], i) =>
    `<div class="podium">${medals[i] || '🏅'} <strong>${name}</strong> — ${r.points} pts | vitórias: ${r.wins} | média: ${(r.points / Math.max(r.rounds,1)).toFixed(1)}</div>`
  ).join('') || '<p>Sem dados ainda.</p>';
}

function renderChampion() {
  const [name, rank] = rankingSorted()[0] || ['Ninguém', { points: 0 }];
  $('champion-content').innerHTML = `<h3>Campeão: ${name}</h3><p>Total: ${rank.points} pontos</p>${rankingSorted().slice(0,3).map(([n,r],i)=>`<p>${['🥇','🥈','🥉'][i]} ${n} - ${r.points}</p>`).join('')}`;
}

function renderTimer() {
  const m = String(Math.floor(state.timerLeft / 60)).padStart(2, '0');
  const s = String(state.timerLeft % 60).padStart(2, '0');
  $('timer').textContent = `${m}:${s}`;
  $('timer').classList.toggle('warning', state.timerLeft <= 60);
}

function renderHistory() {
  $('history-list').innerHTML = state.history.map((h) => `<li>Rodada ${h.round} (${h.letter}) - ${h.date}</li>`).join('');
}

function resetChampionship() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function exportRankingPdf() {
  const w = window.open('', '_blank');
  w.document.write(`<h1>Ranking - Adedonha Bribs Championship</h1>${rankingSorted().map(([n,r],i)=>`<p>${i+1}. ${n} - ${r.points} pontos</p>`).join('')}`);
  w.print();
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  $('players-list').innerHTML = state.players.map((p) => `<li>${p.avatar} ${p.name}</li>`).join('');
  $('round-counter').textContent = state.totalRoundsPlayed + 1;
  $('letter-display').textContent = state.currentLetter || '-';
  $('used-letters').textContent = state.usedLetters.join(', ') || 'nenhuma';
  renderTimer();
  renderRanking();
  renderHistory();
  saveState();
}

$('add-player').onclick = addPlayer;
$('start-championship').onclick = startChampionship;
$('new-round').onclick = newRound;
$('finish-round').onclick = scoreRound;
$('open-ranking').onclick = () => $('ranking-modal').showModal();
$('close-ranking').onclick = () => $('ranking-modal').close();
$('reset-championship').onclick = resetChampionship;
$('toggle-theme').onclick = () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; render(); };
$('new-championship').onclick = resetChampionship;
$('continue-rounds').onclick = () => { state.roundLimit = 0; $('champion-modal').close(); render(); };

const exportBtn = document.createElement('button');
exportBtn.className = 'btn ghost';
exportBtn.textContent = 'Exportar ranking (PDF)';
exportBtn.onclick = exportRankingPdf;
$('setup-card').querySelector('.actions').appendChild(exportBtn);

if (state.currentLetter && state.players.length) buildAnswerRows();
render();
