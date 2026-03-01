const STORAGE_KEY = 'adedonha_championship_v1';
const categories = ['nome', 'cidade', 'animal', 'objeto', 'comida', 'cor'];

const portugueseDictionary = {
  nome: ['amanda', 'ana', 'andre', 'augusto', 'bruna', 'bianca', 'beatriz', 'carla', 'caio', 'daniel', 'diego', 'eduarda', 'felipe', 'gabriela', 'joao', 'julia', 'lara', 'lucas', 'marcos', 'maria', 'natalia', 'otavio', 'paulo', 'rafael', 'samuel', 'thiago', 'vinicius'],
  cidade: ['aracaju', 'bauru', 'campinas', 'curitiba', 'belem', 'brasilia', 'fortaleza', 'goiania', 'manaus', 'natal', 'osasco', 'palmas', 'recife', 'salvador', 'santos', 'teresina', 'uberlandia', 'vitoria'],
  animal: ['abelha', 'anta', 'arara', 'baleia', 'boi', 'burro', 'cachorro', 'camelo', 'coelho', 'coruja', 'elefante', 'foca', 'gato', 'girafa', 'jacare', 'lagarto', 'lobo', 'macaco', 'onca', 'ovelha', 'pato', 'porco', 'raposa', 'sapo', 'tigre', 'urso', 'vaca', 'zebra'],
  objeto: ['agulha', 'anel', 'bola', 'bone', 'cadeira', 'caneta', 'copo', 'escova', 'faca', 'filtro', 'garrafa', 'janela', 'lampada', 'livro', 'mesa', 'mochila', 'oculos', 'pente', 'quadro', 'relogio', 'sapato', 'tesoura', 'vassoura'],
  comida: ['abacate', 'arroz', 'batata', 'bolo', 'brigadeiro', 'cuscuz', 'feijao', 'frango', 'hamburguer', 'iogurte', 'lasanha', 'macarrao', 'manga', 'omelete', 'panqueca', 'pizza', 'queijo', 'risoto', 'salada', 'sopa', 'tapioca', 'uva'],
  cor: ['amarelo', 'anil', 'azul', 'bege', 'branco', 'bronze', 'cinza', 'ciano', 'creme', 'dourado', 'escarlate', 'lilas', 'laranja', 'marrom', 'preto', 'prata', 'roxo', 'rosa', 'verde', 'vermelho', 'violeta']
};

const normalizedDictionary = Object.fromEntries(
  Object.entries(portugueseDictionary).map(([cat, words]) => [cat, new Set(words.map(normalizeWord))])
);

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
  answersLocked: false,
  roundScored: false
};

let intervalId;
let deferredInstallPrompt = null;
const $ = (id) => document.getElementById(id);

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }
function el(id) { return $(id); }

function normalizeWord(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

function isValidPortugueseWord(category, value) {
  const normalized = normalizeWord(value);
  return normalizedDictionary[category]?.has(normalized) || false;
}

function addPlayer() {
  const nameInput = el('player-name');
  const avatarInput = el('player-avatar');
  if (!nameInput || !avatarInput) return;

  const name = nameInput.value.trim();
  const avatar = avatarInput.value.trim() || '🙂';
  if (!name || state.players.length >= 10) return;
  if (!state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    state.players.push({ id: crypto.randomUUID(), name, avatar });
    state.ranking[name] ||= { points: 0, wins: 0, rounds: 0 };
  }
  nameInput.value = '';
  avatarInput.value = '';
  render();
}

function updateRoundLimitFromInputs() {
  const unlimitedEl = el('round-unlimited');
  const limitEl = el('round-limit');
  if (!unlimitedEl || !limitEl) return;

  if (unlimitedEl.checked) {
    state.roundLimit = 0;
    return;
  }

  const manual = Number(limitEl.value);
  state.roundLimit = Number.isFinite(manual) && manual > 0 ? manual : 5;
}

function startChampionship() {
  if (state.players.length < 2) return alert('Cadastre entre 2 e 10 jogadores.');
  updateRoundLimitFromInputs();
  el('setup-card')?.classList.add('hidden');
  el('game-card')?.classList.remove('hidden');
  el('history-card')?.classList.remove('hidden');
  render();
}

function drawLetter() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const pool = alphabet.filter((l) => !state.usedLetters.includes(l));
  if (!pool.length) {
    alert('Todas as letras já foram usadas.');
    return false;
  }
  const letter = pool[Math.floor(Math.random() * pool.length)];
  state.currentLetter = letter;
  state.usedLetters.push(letter);
  return true;
}

function newRound() {
  const draw = el('draw-animation');
  if (draw) draw.classList.remove('hidden');

  setTimeout(() => {
    const ok = drawLetter();
    if (draw) draw.classList.add('hidden');
    if (!ok) return;

    state.currentRound += 1;
    state.totalRoundsPlayed += 1;
    state.timerLeft = 300;
    state.answersLocked = false;
    state.timerRunning = true;
    state.roundScored = false;
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
    if (state.timerLeft === 60) el('alert-sound')?.play().catch(() => {});
    if (state.timerLeft <= 0) {
      state.timerLeft = 0;
      state.timerRunning = false;
      state.answersLocked = true;
      lockInputs();
      alert('TEMPO ESGOTADO!');
    }
    renderTimer();
    saveState();
  }, 1000);
}

function buildAnswerRows() {
  const body = el('answers-body');
  if (!body) return;
  body.innerHTML = '';
  state.players.forEach((player) => {
    const tr = document.createElement('tr');
    tr.dataset.player = player.name;
    tr.innerHTML = `<td>${player.avatar} ${player.name}</td>${categories.map((c) => `<td><input data-cat="${c}" ${state.answersLocked ? 'disabled' : ''}></td>`).join('')}<td class="score">0</td>`;
    body.appendChild(tr);
  });
}

function lockInputs() {
  el('answers-body')?.querySelectorAll('input').forEach((input) => { input.disabled = true; });
}

function scoreRound() {
  if (!state.currentLetter) return alert('Inicie uma rodada antes de pontuar.');
  if (state.roundScored) return alert('Esta rodada já foi pontuada.');

  const bodyRows = [...(el('answers-body')?.querySelectorAll('tr') || [])];
  const entries = [];

  bodyRows.forEach((tr) => {
    const player = tr.dataset.player;
    categories.forEach((cat) => {
      const input = tr.querySelector(`[data-cat="${cat}"]`);
      const value = input?.value.trim() || '';
      const normalized = normalizeWord(value);
      const startsWithLetter = normalized.startsWith(state.currentLetter.toLowerCase());
      const inDictionary = isValidPortugueseWord(cat, value);
      const valid = Boolean(normalized) && startsWithLetter && inDictionary;

      entries.push({ player, cat, normalized, valid, input });
      input?.classList.toggle('valid', valid);
      input?.classList.toggle('invalid', !valid);
      if (input) {
        input.title = valid
          ? 'Resposta válida'
          : 'Inválido: precisa existir em português e iniciar com a letra da rodada.';
      }
    });
  });

  const grouped = {};
  entries.forEach((entry) => {
    if (!entry.valid) return;
    const key = `${entry.cat}:${entry.normalized}`;
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const roundScores = Object.fromEntries(state.players.map((p) => [p.name, 0]));
  entries.forEach((entry) => {
    if (!entry.valid) return;
    const key = `${entry.cat}:${entry.normalized}`;
    roundScores[entry.player] += grouped[key] === 1 ? 10 : 5;
  });

  const top = Math.max(...Object.values(roundScores));
  Object.entries(roundScores).forEach(([name, points]) => {
    const rank = state.ranking[name] ||= { points: 0, wins: 0, rounds: 0 };
    rank.points += points;
    rank.rounds += 1;
    if (points === top && top > 0) rank.wins += 1;

    const row = bodyRows.find((r) => r.dataset.player === name);
    row?.querySelector('.score')?.replaceChildren(String(points));
  });

  state.history.unshift({
    round: state.totalRoundsPlayed,
    letter: state.currentLetter,
    scores: roundScores,
    date: new Date().toLocaleString('pt-BR')
  });

  state.timerRunning = false;
  state.answersLocked = true;
  state.roundScored = true;
  lockInputs();
  maybeFinishChampionship();
  render();
}

function maybeFinishChampionship() {
  if (state.roundLimit > 0 && state.totalRoundsPlayed >= state.roundLimit) {
    renderChampion();
    el('champion-modal')?.showModal();
  }
}

function rankingSorted() {
  return Object.entries(state.ranking).sort((a, b) => b[1].points - a[1].points);
}

function renderRanking() {
  const medals = ['🥇', '🥈', '🥉'];
  const content = el('ranking-content');
  if (!content) return;
  content.innerHTML = rankingSorted().map(([name, rank], i) =>
    `<div class="podium">${medals[i] || '🏅'} <strong>${name}</strong> — ${rank.points} pts | vitórias: ${rank.wins} | média: ${(rank.points / Math.max(rank.rounds, 1)).toFixed(1)}</div>`
  ).join('') || '<p>Sem dados ainda.</p>';
}

function renderChampion() {
  const [name, rank] = rankingSorted()[0] || ['Ninguém', { points: 0 }];
  const champion = el('champion-content');
  if (!champion) return;
  champion.innerHTML = `<h3>Campeão: ${name}</h3><p>Total: ${rank.points} pontos</p>${rankingSorted().slice(0, 3).map(([n, r], i) => `<p>${['🥇', '🥈', '🥉'][i]} ${n} - ${r.points}</p>`).join('')}`;
}

function renderTimer() {
  const timer = el('timer');
  if (!timer) return;
  const mm = String(Math.floor(state.timerLeft / 60)).padStart(2, '0');
  const ss = String(state.timerLeft % 60).padStart(2, '0');
  timer.textContent = `${mm}:${ss}`;
  timer.classList.toggle('warning', state.timerLeft <= 60);
}

function renderHistory() {
  const history = el('history-list');
  if (!history) return;
  history.innerHTML = state.history.map((h) => `<li>Rodada ${h.round} (${h.letter}) - ${h.date}</li>`).join('');
}

function resetChampionship() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function exportRankingPdf() {
  const popup = window.open('', '_blank');
  if (!popup) return;
  popup.document.write(`<h1>Ranking - Adedonha Bribs Championship</h1>${rankingSorted().map(([name, rank], i) => `<p>${i + 1}. ${name} - ${rank.points} pontos</p>`).join('')}`);
  popup.print();
}

function encodeRoomState() {
  const payload = {
    players: state.players,
    roundLimit: state.roundLimit,
    usedLetters: state.usedLetters,
    createdAt: Date.now()
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function decodeRoomState(encoded) {
  const decoded = decodeURIComponent(escape(atob(encoded)));
  return JSON.parse(decoded);
}

function createRoomShare() {
  if (state.players.length < 2) return alert('Cadastre ao menos 2 jogadores antes de gerar QR.');
  updateRoundLimitFromInputs();

  const token = encodeRoomState();
  const link = `${location.origin}${location.pathname}?room=${encodeURIComponent(token)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(link)}`;

  const roomLink = el('room-link');
  const roomQr = el('room-qr');
  if (roomLink) roomLink.value = link;
  if (roomQr) roomQr.src = qrSrc;
  el('room-modal')?.showModal();
}

function applyRoomToken(token) {
  try {
    const room = decodeRoomState(token);
    if (!Array.isArray(room.players) || room.players.length < 2) throw new Error('invalid room');

    state.players = room.players.slice(0, 10);
    state.roundLimit = Number(room.roundLimit) || 0;
    state.usedLetters = Array.isArray(room.usedLetters) ? room.usedLetters : [];
    state.ranking = Object.fromEntries(state.players.map((p) => [p.name, state.ranking[p.name] || { points: 0, wins: 0, rounds: 0 }]));

    const roundLimit = el('round-limit');
    const roundUnlimited = el('round-unlimited');
    if (roundLimit) roundLimit.value = state.roundLimit > 0 ? state.roundLimit : 5;
    if (roundUnlimited) roundUnlimited.checked = state.roundLimit === 0;
    if (roundLimit && roundUnlimited) roundLimit.disabled = roundUnlimited.checked;

    render();
    alert('Partida carregada! Agora clique em Iniciar Campeonato.');
  } catch {
    alert('Não foi possível carregar a partida a partir desse QR/link.');
  }
}

function joinRoomFromInput() {
  const joinLink = el('join-link');
  const raw = joinLink?.value.trim();
  if (!raw) return;

  try {
    const url = new URL(raw);
    const token = url.searchParams.get('room');
    if (!token) throw new Error('missing room');
    applyRoomToken(token);
  } catch {
    alert('Link inválido de partida.');
  }
}

function preloadRoomFromUrl() {
  const token = new URLSearchParams(location.search).get('room');
  if (!token) return;
  applyRoomToken(token);
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  el('install-app')?.classList.add('hidden');
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    el('install-app')?.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    el('install-app')?.classList.add('hidden');
  });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch {
    // ignore registration error
  }
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  const playersList = el('players-list');
  if (playersList) playersList.innerHTML = state.players.map((p) => `<li>${p.avatar} ${p.name}</li>`).join('');

  if (el('round-counter')) el('round-counter').textContent = String(state.totalRoundsPlayed + 1);
  if (el('letter-display')) el('letter-display').textContent = state.currentLetter || '-';
  if (el('used-letters')) el('used-letters').textContent = state.usedLetters.join(', ') || 'nenhuma';

  renderTimer();
  renderRanking();
  renderHistory();
  saveState();
}

function bindClick(id, handler) {
  const button = el(id);
  if (button) button.onclick = handler;
}

bindClick('add-player', addPlayer);
bindClick('start-championship', startChampionship);
bindClick('new-round', newRound);
bindClick('finish-round', scoreRound);
bindClick('open-ranking', () => el('ranking-modal')?.showModal());
bindClick('close-ranking', () => el('ranking-modal')?.close());
bindClick('reset-championship', resetChampionship);
bindClick('new-championship', resetChampionship);
bindClick('continue-rounds', () => {
  state.roundLimit = 0;
  el('champion-modal')?.close();
  render();
});
bindClick('install-app', installApp);
bindClick('create-room', createRoomShare);
bindClick('join-room', joinRoomFromInput);
bindClick('close-room-modal', () => el('room-modal')?.close());

bindClick('toggle-theme', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  render();
});

el('round-unlimited')?.addEventListener('change', () => {
  const roundLimit = el('round-limit');
  const roundUnlimited = el('round-unlimited');
  if (!roundLimit || !roundUnlimited) return;
  roundLimit.disabled = roundUnlimited.checked;
});

const setupActions = el('setup-card')?.querySelector('.actions');
if (setupActions && !el('export-ranking-btn')) {
  const exportBtn = document.createElement('button');
  exportBtn.id = 'export-ranking-btn';
  exportBtn.className = 'btn ghost';
  exportBtn.textContent = 'Exportar ranking (PDF)';
  exportBtn.onclick = exportRankingPdf;
  setupActions.appendChild(exportBtn);
}

if (state.currentLetter && state.players.length) buildAnswerRows();
if (el('round-limit')) el('round-limit').value = state.roundLimit > 0 ? state.roundLimit : 5;
if (el('round-unlimited')) el('round-unlimited').checked = state.roundLimit === 0;
if (el('round-limit') && el('round-unlimited')) el('round-limit').disabled = el('round-unlimited').checked;
registerServiceWorker();
setupInstallPrompt();
preloadRoomFromUrl();
render();
