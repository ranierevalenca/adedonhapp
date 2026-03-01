const STORAGE_KEY = 'adedonha_championship_v1';
const categories = ['nome', 'cidade', 'animal', 'objeto', 'comida', 'cor'];
const BUILD_VERSION = '2026.03.03';

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
  roundScored: false,
  isGuest: false,
  selectedPlayerName: '',
  roomId: ''
};

let intervalId;
let deferredInstallPrompt = null;
let syncChannel = null;
let suppressBroadcast = false;
let guestSyncPollId = null;

const $ = (id) => document.getElementById(id);
const el = (id) => $(id);

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; } }

function normalizeWord(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function addPlayer() {
  if (state.isGuest) return alert('Apenas o criador da partida pode adicionar jogadores.');
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
  if (state.isGuest && !state.selectedPlayerName) return alert('Escolha seu nome para entrar na partida.');

  if (!state.isGuest) updateRoundLimitFromInputs();
  el('setup-card')?.classList.add('hidden');
  el('game-card')?.classList.remove('hidden');
  el('history-card')?.classList.remove('hidden');
  buildAnswerRows();
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
  if (state.isGuest) return alert('Apenas o criador da partida pode iniciar nova rodada.');
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
    broadcastSync('new-round');
    render();
  }, 1200);
}

function stopRound() {
  if (!state.timerRunning) return;
  state.timerRunning = false;
  state.answersLocked = true;
  lockInputs();
  broadcastSync('stop-round');
  renderTimer();
  saveState();
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
    broadcastSync('timer');
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
    tr.innerHTML = `<td>${player.avatar} ${player.name}</td>${categories.map((cat) => `<td><input data-cat="${cat}"></td>`).join('')}<td class="score">0</td>`;
    body.appendChild(tr);
  });

  applyInputPermissions();
}

function applyInputPermissions() {
  const rows = [...(el('answers-body')?.querySelectorAll('tr') || [])];

  rows.forEach((row) => {
    const rowPlayer = row.dataset.player;
    const canEditRow = !state.isGuest || (state.selectedPlayerName && rowPlayer === state.selectedPlayerName);
    row.querySelectorAll('input').forEach((input) => {
      input.disabled = state.answersLocked || !canEditRow;
    });
  });
}

function lockInputs() {
  el('answers-body')?.querySelectorAll('input').forEach((input) => { input.disabled = true; });
}

function scoreRound() {
  if (state.isGuest) return alert('Somente o criador da partida pode pontuar a rodada.');
  if (!state.currentLetter) return alert('Inicie uma rodada antes de pontuar.');
  if (state.roundScored) return alert('Esta rodada já foi pontuada.');

  const rows = [...(el('answers-body')?.querySelectorAll('tr') || [])];
  const entries = [];

  rows.forEach((tr) => {
    const player = tr.dataset.player;
    categories.forEach((cat) => {
      const input = tr.querySelector(`[data-cat="${cat}"]`);
      const raw = input?.value.trim() || '';
      const normalized = normalizeWord(raw);
      const valid = Boolean(normalized) && normalized.startsWith(state.currentLetter.toLowerCase());
      entries.push({ player, cat, value: raw, normalized, valid, input });
      input?.classList.toggle('valid', valid);
      input?.classList.toggle('invalid', !valid);
      if (input) input.title = valid ? 'Resposta válida' : 'Inválido: precisa começar com a letra da rodada.';
    });
  });

  const grouped = {};
  entries.forEach((entry) => {
    if (!entry.valid) return;
    const key = `${entry.cat}:${entry.value.trim().toUpperCase()}`;
    grouped[key] = (grouped[key] || 0) + 1;
  });

  const roundScores = Object.fromEntries(state.players.map((p) => [p.name, 0]));
  entries.forEach((entry) => {
    if (!entry.valid) return;
    const key = `${entry.cat}:${entry.value.trim().toUpperCase()}`;
    roundScores[entry.player] += grouped[key] === 1 ? 10 : 5;
  });

  const top = Math.max(...Object.values(roundScores));
  Object.entries(roundScores).forEach(([name, points]) => {
    const rank = state.ranking[name] ||= { points: 0, wins: 0, rounds: 0 };
    rank.points += points;
    rank.rounds += 1;
    if (points === top && top > 0) rank.wins += 1;

    const row = rows.find((r) => r.dataset.player === name);
    if (row) row.querySelector('.score').textContent = String(points);
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
  broadcastSync('score-round');
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

function applySyncPayload(payload) {
  if (!payload || payload.type !== 'sync') return;

  suppressBroadcast = true;
  state.currentLetter = payload.currentLetter;
  state.usedLetters = payload.usedLetters || [];
  state.timerLeft = payload.timerLeft;
  state.timerRunning = payload.timerRunning;
  state.answersLocked = payload.answersLocked;
  state.totalRoundsPlayed = payload.totalRoundsPlayed;
  state.currentRound = payload.currentRound;
  state.roundScored = payload.roundScored;
  suppressBroadcast = false;

  render();
  if (state.timerRunning) startTimer();
}

function startGuestSyncPolling() {
  if (!state.isGuest || !state.roomId) return;
  if (guestSyncPollId) clearInterval(guestSyncPollId);

  guestSyncPollId = setInterval(() => {
    try {
      const raw = localStorage.getItem(`adedonha-sync-${state.roomId}`);
      if (!raw) return;
      const payload = JSON.parse(raw);
      applySyncPayload(payload);
    } catch {
      // ignore polling parse failures
    }
  }, 700);
}

function setupStorageSync() {

  window.addEventListener('storage', (event) => {
    if (!state.isGuest || !state.roomId) return;
    if (event.key !== `adedonha-sync-${state.roomId}` || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue);
      applySyncPayload(payload);
    } catch {
      // ignore malformed payload
    }
  });
}

function ensureSyncChannel(roomId) {

  if (!roomId) return;
  if (syncChannel) syncChannel.close();
  syncChannel = new BroadcastChannel(`adedonha-room-${roomId}`);
  syncChannel.onmessage = (event) => {
    if (!state.isGuest) return;
    const payload = event.data;
    if (!payload || payload.type !== 'sync') return;

    suppressBroadcast = true;
    state.currentLetter = payload.currentLetter;
    state.usedLetters = payload.usedLetters || [];
    state.timerLeft = payload.timerLeft;
    state.timerRunning = payload.timerRunning;
    state.answersLocked = payload.answersLocked;
    state.totalRoundsPlayed = payload.totalRoundsPlayed;
    state.currentRound = payload.currentRound;
    state.roundScored = payload.roundScored;
    suppressBroadcast = false;

    render();
    if (state.timerRunning) startTimer();
  };
}

function broadcastSync(reason) {
  if (suppressBroadcast || state.isGuest || !syncChannel) return;
  const payload = {
    type: 'sync',
    reason,
    currentLetter: state.currentLetter,
    usedLetters: state.usedLetters,
    timerLeft: state.timerLeft,
    timerRunning: state.timerRunning,
    answersLocked: state.answersLocked,
    totalRoundsPlayed: state.totalRoundsPlayed,
    currentRound: state.currentRound,
    roundScored: state.roundScored
  };

  syncChannel.postMessage(payload);
  try {
    localStorage.setItem(`adedonha-sync-${state.roomId}`, JSON.stringify(payload));
  } catch {
    // ignore storage issues
  }
}

function encodeRoomState() {
  if (!state.roomId) state.roomId = crypto.randomUUID();
  const payload = {
    roomId: state.roomId,
    players: state.players,
    roundLimit: state.roundLimit,
    usedLetters: state.usedLetters,
    createdAt: Date.now(),
    buildVersion: BUILD_VERSION
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function decodeRoomState(encoded) {
  const decoded = decodeURIComponent(escape(atob(encoded)));
  return JSON.parse(decoded);
}

function createRoomShare() {
  if (state.players.length < 2) return alert('Cadastre ao menos 2 jogadores antes de gerar QR.');
  if (state.isGuest) return alert('Convidado não pode criar nova partida por QR.');
  updateRoundLimitFromInputs();
  if (!state.roomId) state.roomId = crypto.randomUUID();
  ensureSyncChannel(state.roomId);

  const token = encodeRoomState();
  const link = `${location.origin}${location.pathname}?room=${encodeURIComponent(token)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(link)}`;

  const roomLink = el('room-link');
  const roomQr = el('room-qr');
  if (roomLink) roomLink.value = link;
  if (roomQr) roomQr.src = qrSrc;
  el('room-modal')?.showModal();
}

function populateGuestSelection() {
  const guestSelect = el('guest-player-select');
  const guestWrap = el('guest-player-wrap');
  if (!guestSelect || !guestWrap) return;

  guestSelect.innerHTML = '<option value="">Selecione seu nome</option>' +
    state.players.map((p) => `<option value="${p.name}">${p.name}</option>`).join('');
  guestWrap.classList.remove('hidden');
}

function confirmGuestPlayer() {
  const guestSelect = el('guest-player-select');
  if (!guestSelect) return;
  const selected = guestSelect.value;
  if (!selected) return alert('Escolha seu nome para entrar na partida.');
  state.selectedPlayerName = selected;
  render();
}

function applyRoomToken(token) {
  try {
    const room = decodeRoomState(token);
    if (!Array.isArray(room.players) || room.players.length < 2) throw new Error('invalid room');

    state.players = room.players.slice(0, 10);
    state.isGuest = true;
    state.selectedPlayerName = '';
    state.roomId = room.roomId || crypto.randomUUID();
    ensureSyncChannel(state.roomId);
    startGuestSyncPolling();

    state.roundLimit = Number(room.roundLimit) || 0;
    state.usedLetters = Array.isArray(room.usedLetters) ? room.usedLetters : [];
    state.ranking = Object.fromEntries(state.players.map((p) => [p.name, state.ranking[p.name] || { points: 0, wins: 0, rounds: 0 }]));

    const roundLimit = el('round-limit');
    const roundUnlimited = el('round-unlimited');
    if (roundLimit) roundLimit.value = state.roundLimit > 0 ? state.roundLimit : 5;
    if (roundUnlimited) roundUnlimited.checked = state.roundLimit === 0;
    if (roundLimit && roundUnlimited) roundLimit.disabled = roundUnlimited.checked;

    populateGuestSelection();
    render();
    alert('Partida carregada! Escolha seu nome para entrar como convidado.');
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

function shareWhatsApp() {
  let link = window.location.href;
  if (state.players.length >= 2) {
    const token = encodeRoomState();
    link = `${location.origin}${location.pathname}?room=${encodeURIComponent(token)}`;
  }
  const message = `🎮 Vamos jogar Adedonha Bribs Championship! Entre na partida: ${link}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

function preloadRoomFromUrl() {
  const token = new URLSearchParams(location.search).get('room');
  if (!token) {
    state.isGuest = false;
    state.selectedPlayerName = '';
    if (state.roomId) ensureSyncChannel(state.roomId);
    return;
  }
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

async function forceRefreshApp() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore cleanup failures
  }

  const url = new URL(window.location.href);
  url.searchParams.set('v', BUILD_VERSION);
  window.location.replace(url.toString());
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch {
    // ignore registration error
  }
}

function applyRolePermissions() {
  const guestLockedIds = ['player-name', 'player-avatar', 'add-player', 'round-limit', 'round-unlimited', 'create-room'];
  guestLockedIds.forEach((id) => {
    const node = el(id);
    if (!node) return;
    node.disabled = state.isGuest;
  });

  const newRoundBtn = el('new-round');
  if (newRoundBtn) newRoundBtn.disabled = state.isGuest;

  const roleHint = el('room-role-hint');
  if (roleHint) {
    if (state.isGuest) {
      roleHint.classList.remove('hidden');
      roleHint.textContent = state.selectedPlayerName
        ? `Modo convidado: você joga como ${state.selectedPlayerName}. Apenas o criador inicia rodada.`
        : 'Modo convidado: escolha seu nome para entrar. Apenas o criador inicia rodada.';
    } else {
      roleHint.classList.add('hidden');
      roleHint.textContent = '';
    }
  }

  const startBtn = el('start-championship');
  if (startBtn && state.isGuest) startBtn.disabled = !state.selectedPlayerName;

  applyInputPermissions();
}

function render() {
  document.documentElement.dataset.theme = state.theme;

  const playersList = el('players-list');
  if (playersList) playersList.innerHTML = state.players.map((p) => `<li>${p.avatar} ${p.name}</li>`).join('');

  if (el('round-counter')) el('round-counter').textContent = String(state.totalRoundsPlayed + 1);
  if (el('letter-display')) el('letter-display').textContent = state.currentLetter || '-';
  if (el('used-letters')) el('used-letters').textContent = state.usedLetters.join(', ') || 'nenhuma';

  const build = el('build-version');
  if (build) build.textContent = `Build: ${BUILD_VERSION}`;

  renderTimer();
  renderRanking();
  renderHistory();
  applyRolePermissions();
  saveState();
}

function bindClick(id, handler) {
  const button = el(id);
  if (button) button.onclick = handler;
}

bindClick('add-player', addPlayer);
bindClick('start-championship', startChampionship);
bindClick('new-round', newRound);
bindClick('stop-round', stopRound);
bindClick('finish-round', scoreRound);
bindClick('open-ranking', () => el('ranking-modal')?.showModal());
bindClick('share-whatsapp', shareWhatsApp);
bindClick('force-refresh', forceRefreshApp);
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
bindClick('confirm-guest-player', confirmGuestPlayer);
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
if (state.roomId) ensureSyncChannel(state.roomId);
setupStorageSync();
registerServiceWorker();
setupInstallPrompt();
preloadRoomFromUrl();
render();
