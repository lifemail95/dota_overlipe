// Conexão Socket.io com o servidor Node.js
const socket = io();

// ============================================================
// ELEMENTOS DO DOM
// ============================================================
const elDayNightIcon = document.getElementById('day-night-icon');
const elGameClock = document.getElementById('game-clock');
const elMatchStatus = document.getElementById('match-status');
const elMenuStandbyBadge = document.getElementById('menu-standby-badge');

const elHeroImg = document.getElementById('hero-img');
const elHeroLevel = document.getElementById('hero-level');
const elPlayerName = document.getElementById('player-name');
const elHeroName = document.getElementById('hero-name');
const elPlayerNetworth = document.getElementById('player-networth');

const elStatKills = document.getElementById('stat-kills');
const elStatDeaths = document.getElementById('stat-deaths');
const elStatAssists = document.getElementById('stat-assists');
const elStatKdaRatio = document.getElementById('stat-kda-ratio');

const elStatGpm = document.getElementById('stat-gpm');
const elStatXpm = document.getElementById('stat-xpm');
const elStatLh = document.getElementById('stat-lh');
const elStatDn = document.getElementById('stat-dn');

// Roshan
const elRoshanStatusText = document.getElementById('roshan-status-text');
const elRoshanAegisTime = document.getElementById('roshan-aegis-time');
const elRoshanMinTime = document.getElementById('roshan-min-time');
const elRoshanMaxTime = document.getElementById('roshan-max-time');
const elRoshanProgress = document.getElementById('roshan-progress');
const btnRoshanDeath = document.getElementById('btn-roshan-death');
const btnRoshanReset = document.getElementById('btn-roshan-reset');

// Tormentor
const elTormentorStatusText = document.getElementById('tormentor-status-text');
const elTormentorTimerLabel = document.getElementById('tormentor-timer-label');
const elTormentorTimeLeft = document.getElementById('tormentor-time-left');
const elTormentorProgress = document.getElementById('tormentor-progress');
const btnTormentorDeath = document.getElementById('btn-tormentor-death');
const btnTormentorReset = document.getElementById('btn-tormentor-reset');

// Farm Monitor
const btnFarmProfile = document.getElementById('btn-farm-profile');
const elFarmProfileName = document.getElementById('farm-profile-name');
const elFarmAlertBadge = document.getElementById('farm-alert-badge');
const elFarmMetaDetails = document.getElementById('farm-meta-details');
const elFarmCurrentLh = document.getElementById('farm-current-lh');
const elFarmTargetLh = document.getElementById('farm-target-lh');
const elFarmCurrentNw = document.getElementById('farm-current-nw');
const elFarmTargetNw = document.getElementById('farm-target-nw');
const elItemTimingsList = document.getElementById('item-timings-list');
const elPopularItemsIcons = document.getElementById('popular-items-icons');

// Skill Build
const widgetSkillBuild = document.getElementById('widget-skill-build');
const elSkillRecommendedText = document.getElementById('skill-recommended-text');
const elSkillRecommendedKey = document.getElementById('skill-recommended-key');

// Draft Counter-Picks
const widgetDraftCounters = document.getElementById('widget-draft-counters');
const inputDraftHeroSearch = document.getElementById('draft-hero-search');
const elDraftSearchResults = document.getElementById('draft-search-results');
const elEnemySlots = document.getElementById('enemy-slots');
const elCounterList = document.getElementById('counter-list');
const btnClearDraft = document.getElementById('btn-clear-draft');

// Toolbar e Modos
const btnTestSim = document.getElementById('btn-test-sim');
const btnTestDraft = document.getElementById('btn-test-draft');
const btnToggleToolbar = document.getElementById('btn-toggle-toolbar');
const streamerToolbar = document.getElementById('streamer-toolbar');
const btnToggleMode = document.getElementById('btn-toggle-mode');
const btnLockMode = document.getElementById('btn-lock-mode');
const btnResetLayout = document.getElementById('btn-reset-layout');
const btnToggleVoice = document.getElementById('btn-toggle-voice');
const elModeBanner = document.getElementById('mode-banner');
const elGameModeToast = document.getElementById('game-mode-toast');
const scaleTooltip = document.getElementById('scale-tooltip');

// ============================================================
// ESTADO GLOBAL DO CLIENTE
// ============================================================
let currentClockTime = 0;
let lastServerTick = Date.now();
let isGameInProgress = false;
let currentGameState = null;
let isEditMode = false;
let voiceEnabled = localStorage.getItem('dota_overlay_voice') !== 'false'; // Padrão: ligado
let farmProfile = localStorage.getItem('dota_overlay_farm_profile') || 'core'; // 'core' ou 'support'

// Timers de Objetivos
let timerState = {
  roshan: { active: false, deathGameTime: null, aegisGameTime: null, minRespawnGameTime: null, maxRespawnGameTime: null },
  tormentor: { active: false, deathGameTime: null, respawnGameTime: null }
};

// Histórico de Itens adquiridos pelo jogador (nome -> tempo em segundos)
const acquiredItemsHistory = new Map();

// Heróis para o Draft
let allHeroesList = [];
let selectedEnemyHeroIds = [];

// Flag para disparos de voz não repetirem
const voiceAnnouncements = {
  tormentor15s: false,
  tormentorSpawn: false,
  roshanMin: false,
  roshanMax: false
};

const TORMENTOR_INITIAL_SPAWN = 900; // 15 minutos (900s)

// ============================================================
// MÓDULO 4: NARRADOR POR VOZ (SPEECH SYNTHESIS EM PT-BR)
// ============================================================
function speakVoice(text) {
  if (!voiceEnabled || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Tentar selecionar voz brasileira de boa qualidade
    const voices = window.speechSynthesis.getVoices();
    const brVoice = voices.find((v) => v.lang === 'pt-BR' || v.lang === 'pt_BR');
    if (brVoice) utterance.voice = brVoice;

    window.speechSynthesis.speak(utterance);
    console.log(`🔊 [Voz] Falando: "${text}"`);
  } catch (err) {
    console.error('Erro na síntese de voz:', err);
  }
}

function updateVoiceButton() {
  if (btnToggleVoice) {
    btnToggleVoice.textContent = voiceEnabled ? '🔊 Voz: ON' : '🔇 Voz: OFF';
    btnToggleVoice.style.color = voiceEnabled ? '#2ed573' : '#ff4757';
  }
}

if (btnToggleVoice) {
  btnToggleVoice.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    localStorage.setItem('dota_overlay_voice', String(voiceEnabled));
    updateVoiceButton();
    if (voiceEnabled) speakVoice('Notificações de voz ativadas.');
  });
}
updateVoiceButton();

// ============================================================
// INTEGRAÇÃO COM ELECTRON (MODO JOGO / EDIÇÃO & ATALHOS)
// ============================================================
function setEditMode(active) {
  isEditMode = active;

  if (isEditMode) {
    document.body.classList.add('edit-mode');
    elModeBanner.classList.remove('hidden');
    elGameModeToast.classList.add('hidden');
    // Forçar exibição de todos os widgets no modo edição para o streamer arrumar a tela
    document.querySelectorAll('.draggable-widget').forEach((w) => {
      if (!hiddenWidgets.has(w.id)) w.classList.remove('hidden');
    });
  } else {
    document.body.classList.remove('edit-mode');
    elModeBanner.classList.add('hidden');

    elGameModeToast.classList.remove('hidden');
    setTimeout(() => {
      elGameModeToast.classList.add('hidden');
    }, 2600);

    // Reaplicar regras de auto-hide conforme o estado do jogo
    applyGameStateVisibility(currentGameState);
  }
}

if (window.electronAPI) {
  window.electronAPI.onModeChanged((data) => {
    setEditMode(data.mode === 'edit');
  });

  // Atalho global Ctrl+Shift+R para Roshan
  window.electronAPI.onRoshanTrigger(() => {
    triggerRoshanDeath();
  });

  if (btnToggleMode) btnToggleMode.addEventListener('click', () => window.electronAPI.toggleMode());
  if (btnLockMode) btnLockMode.addEventListener('click', () => window.electronAPI.toggleMode());
} else {
  // Fallback para navegador convencional
  if (btnToggleMode) btnToggleMode.addEventListener('click', () => setEditMode(!isEditMode));
  if (btnLockMode) btnLockMode.addEventListener('click', () => setEditMode(false));
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
      e.preventDefault();
      setEditMode(!isEditMode);
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
      e.preventDefault();
      triggerRoshanDeath();
    }
  });
}

// Disparar morte do Roshan (usado pelo botão e pelo atalho Ctrl+Shift+R)
function triggerRoshanDeath() {
  socket.emit('roshan:death', { gameTime: currentClockTime });
  speakVoice('Roshan abatido! Temporizador de 8 minutos iniciado.');
}

// ============================================================
// MÓDULO 6: AUTO-HIDE & PERSISTÊNCIA DE POSIÇÃO/ESCALA
// ============================================================
const POSITIONS_KEY = 'dota_overlay_positions_v3';
const VISIBILITY_KEY = 'dota_overlay_hidden_widgets_v1';

let hiddenWidgets = new Set();

function applyGameStateVisibility(gameState) {
  if (isEditMode) return; // No modo edição tudo fica visível para ajuste

  const isMainMenu = !gameState || gameState === 'DOTA_GAMERULES_STATE_INIT' || gameState === 'DOTA_GAMERULES_STATE_DISCONNECT' || gameState === 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD';
  const isDraft = (gameState === 'DOTA_GAMERULES_STATE_HERO_SELECTION');
  const isInMatch = (gameState === 'DOTA_GAMERULES_STATE_PRE_GAME' || gameState === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' || gameState === 'DOTA_GAMERULES_STATE_POST_GAME');

  // Badge de Standby do Menu
  if (isMainMenu) {
    elMenuStandbyBadge.classList.remove('hidden');
  } else {
    elMenuStandbyBadge.classList.add('hidden');
  }

  // Painéis da partida
  const inGameWidgets = document.querySelectorAll('.in-game-widget');
  inGameWidgets.forEach((w) => {
    if (isInMatch && !hiddenWidgets.has(w.id)) {
      w.classList.remove('hidden');
    } else {
      w.classList.add('hidden');
    }
  });

  // Painel de Draft de Counter-Picks
  if (isDraft && !hiddenWidgets.has('widget-draft-counters')) {
    widgetDraftCounters.classList.remove('hidden');
  } else {
    widgetDraftCounters.classList.add('hidden');
  }
}

function loadHiddenWidgets() {
  try {
    const saved = localStorage.getItem(VISIBILITY_KEY);
    if (saved) {
      hiddenWidgets = new Set(JSON.parse(saved));
    }
  } catch (e) {
    hiddenWidgets = new Set();
  }
  applyWidgetVisibility();
}

function saveHiddenWidgets() {
  localStorage.setItem(VISIBILITY_KEY, JSON.stringify(Array.from(hiddenWidgets)));
}

function setWidgetVisibility(widgetId, visible) {
  if (visible) {
    hiddenWidgets.delete(widgetId);
  } else {
    hiddenWidgets.add(widgetId);
  }
  saveHiddenWidgets();
  applyWidgetVisibility();
}

function applyWidgetVisibility() {
  const draggables = document.querySelectorAll('.draggable-widget');
  draggables.forEach((w) => {
    if (hiddenWidgets.has(w.id)) {
      w.classList.add('widget-removed');
    } else {
      w.classList.remove('widget-removed');
    }
  });

  document.querySelectorAll('.widget-chip').forEach((chip) => {
    const targetId = chip.dataset.widgetTarget;
    const isHidden = hiddenWidgets.has(targetId);
    const statusIcon = chip.querySelector('.chip-status');
    if (isHidden) {
      chip.classList.remove('active');
      chip.classList.add('inactive');
      if (statusIcon) statusIcon.textContent = '✕';
    } else {
      chip.classList.add('active');
      chip.classList.remove('inactive');
      if (statusIcon) statusIcon.textContent = '✔';
    }
  });
}

// ============================================================
// ARRASTAR, SOLTAR E REDIMENSIONAR (ESCALA) NO MODO EDIÇÃO
// ============================================================
function initDraggables() {
  const draggables = document.querySelectorAll('.draggable-widget');
  restoreWidgetPositions();
  loadHiddenWidgets();

  // 1. Arraste
  draggables.forEach((widget) => {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    widget.addEventListener('mousedown', (e) => {
      if (!isEditMode) return;
      if (e.target.closest('button, input, a, .widget-resize-handle, .widget-remove-btn')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = widget.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      const currentScale = widget.dataset.scale || '1';

      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
      widget.style.left = `${initialLeft}px`;
      widget.style.top = `${initialTop}px`;
      widget.style.transform = `scale(${currentScale})`;

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newLeft = Math.max(0, Math.min(1920 - 80, initialLeft + deltaX));
        let newTop = Math.max(0, Math.min(1080 - 40, initialTop + deltaY));

        widget.style.left = `${newLeft}px`;
        widget.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          saveWidgetPositions();
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });

  // 2. Redimensionamento por escala (Canto ◢)
  document.querySelectorAll('.widget-resize-handle').forEach((handle) => {
    const widget = handle.closest('.draggable-widget');
    if (!widget) return;

    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!isEditMode) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const rect = widget.getBoundingClientRect();
      const startScale = parseFloat(widget.dataset.scale || '1');
      const startDist = Math.hypot(startX - rect.left, startY - rect.top) || 1;

      if (scaleTooltip) {
        scaleTooltip.classList.remove('hidden');
        scaleTooltip.textContent = `${Math.round(startScale * 100)}%`;
        scaleTooltip.style.left = `${e.clientX}px`;
        scaleTooltip.style.top = `${e.clientY}px`;
      }

      const onMouseMove = (moveEvent) => {
        const currDist = Math.hypot(moveEvent.clientX - rect.left, moveEvent.clientY - rect.top);
        let newScale = startScale * (currDist / startDist);
        // Limitar escala com limite minimo seguro (70% a 250%) para nao prejudicar a legibilidade das fontes
        newScale = Math.max(0.70, Math.min(2.5, Math.round(newScale * 100) / 100));

        widget.dataset.scale = newScale;
        widget.style.transform = `scale(${newScale})`;

        if (scaleTooltip) {
          scaleTooltip.textContent = `${Math.round(newScale * 100)}%`;
          scaleTooltip.style.left = `${moveEvent.clientX}px`;
          scaleTooltip.style.top = `${moveEvent.clientY}px`;
        }
      };

      const onMouseUp = () => {
        if (scaleTooltip) scaleTooltip.classList.add('hidden');
        saveWidgetPositions();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    handle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      widget.dataset.scale = '1';
      widget.style.transform = 'scale(1)';
      saveWidgetPositions();
    });
  });

  // 3. Botões ✕
  document.querySelectorAll('.widget-remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.dataset.target || btn.closest('.draggable-widget')?.id;
      if (targetId) setWidgetVisibility(targetId, false);
    });
  });

  // 4. Chips
  document.querySelectorAll('.widget-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const targetId = chip.dataset.widgetTarget;
      if (!targetId) return;
      setWidgetVisibility(targetId, hiddenWidgets.has(targetId));
    });
  });

  // 5. Reset Padrão
  if (btnResetLayout) {
    btnResetLayout.addEventListener('click', () => {
      localStorage.removeItem(POSITIONS_KEY);
      localStorage.removeItem(VISIBILITY_KEY);
      hiddenWidgets.clear();
      applyWidgetVisibility();

      draggables.forEach((widget) => {
        widget.style.left = '';
        widget.style.top = '';
        widget.style.right = '';
        widget.style.bottom = '';
        widget.style.transform = '';
        delete widget.dataset.scale;
      });
      console.log('Layout restaurado ao padrão.');
    });
  }
}

function saveWidgetPositions() {
  const draggables = document.querySelectorAll('.draggable-widget');
  const positions = {};
  draggables.forEach((widget) => {
    const id = widget.dataset.widget || widget.id;
    if (id) {
      positions[id] = {
        left: widget.style.left,
        top: widget.style.top,
        scale: widget.dataset.scale || '1'
      };
    }
  });
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
}

function restoreWidgetPositions() {
  try {
    const saved = localStorage.getItem(POSITIONS_KEY);
    if (!saved) return;
    const positions = JSON.parse(saved);
    const draggables = document.querySelectorAll('.draggable-widget');

    draggables.forEach((widget) => {
      const id = widget.dataset.widget || widget.id;
      if (id && positions[id]) {
        if (positions[id].left && positions[id].top) {
          widget.style.right = 'auto';
          widget.style.bottom = 'auto';
          widget.style.left = positions[id].left;
          widget.style.top = positions[id].top;
        }
        if (positions[id].scale) {
          const sc = parseFloat(positions[id].scale) || 1;
          widget.dataset.scale = sc;
          widget.style.transform = `scale(${sc})`;
        }
      }
    });
  } catch (err) {
    console.error('Erro ao restaurar posições:', err);
  }
}

initDraggables();

// ============================================================
// MÓDULO 2: MONITOR DE FARM & TIMINGS VS. IMMORTAL
// ============================================================
// Banco de dados de Timings médios do Rank Immortal (em segundos de partida)
const IMMORTAL_ITEM_TIMINGS = {
  item_blink: { name: 'Blink Dagger', targetSeconds: 840, label: '14:00' },
  item_bfury: { name: 'Battle Fury', targetSeconds: 870, label: '14:30' },
  item_manta: { name: 'Manta Style', targetSeconds: 1200, label: '20:00' },
  item_black_king_bar: { name: 'BKB', targetSeconds: 1260, label: '21:00' },
  item_ultimate_scepter: { name: 'Aghanim Scepter', targetSeconds: 1200, label: '20:00' },
  item_force_staff: { name: 'Force Staff', targetSeconds: 960, label: '16:00' },
  item_mekansm: { name: 'Mekansm', targetSeconds: 720, label: '12:00' },
  item_radiance: { name: 'Radiance', targetSeconds: 1020, label: '17:00' },
  item_yasha: { name: 'Yasha', targetSeconds: 840, label: '14:00' },
  item_diffusal_blade: { name: 'Diffusal Blade', targetSeconds: 900, label: '15:00' },
  item_echo_sabre: { name: 'Echo Sabre', targetSeconds: 780, label: '13:00' }
};

// Alternar perfil entre Offlane/Core e Suporte
function updateFarmProfileUI() {
  if (elFarmProfileName) {
    elFarmProfileName.textContent = farmProfile === 'core' ? 'Offlane/Core' : 'Suporte';
  }
}

if (btnFarmProfile) {
  btnFarmProfile.addEventListener('click', () => {
    farmProfile = farmProfile === 'core' ? 'support' : 'core';
    localStorage.setItem('dota_overlay_farm_profile', farmProfile);
    updateFarmProfileUI();
    updateFarmMonitor();
  });
}
updateFarmProfileUI();

function calculateImmortalTargets(clockSeconds) {
  if (clockSeconds <= 0) return { targetLH: 0, targetNW: 0 };
  const mins = clockSeconds / 60;

  if (farmProfile === 'core') {
    // Curva média Immortal para Core (Carry/Mid/Offlane)
    const targetLH = Math.max(0, Math.floor(mins * 11.5 - 20));
    const targetNW = Math.max(0, Math.floor(mins * 650 - 500));
    return { targetLH, targetNW };
  } else {
    // Curva média Immortal para Suporte
    const targetLH = Math.max(0, Math.floor(mins * 2.5));
    const targetNW = Math.max(0, Math.floor(mins * 340));
    return { targetLH, targetNW };
  }
}

function updateFarmMonitor(playerData) {
  if (!playerData && !lastKnownPlayer) return;
  const player = playerData || lastKnownPlayer;
  const clock = currentClockTime;

  const currentLH = player.last_hits || 0;
  const currentNW = player.net_worth || (player.gold || 0);

  const { targetLH, targetNW } = calculateImmortalTargets(clock);

  elFarmCurrentLh.textContent = currentLH;
  elFarmTargetLh.textContent = `/ ${targetLH} (Immortal)`;
  elFarmCurrentNw.textContent = formatNumber(currentNW);
  elFarmTargetNw.textContent = `/ ${formatNumber(targetNW)} (Immortal)`;

  elFarmMetaDetails.textContent = `Tempo: ${formatGameTime(clock)} | Meta: ${targetLH} LH • ${formatNumber(targetNW)} NW`;

  // Checar Atraso de mais de 15% após 4 minutos (240s)
  if (clock >= 240 && targetLH > 10) {
    const lhRatio = currentLH / targetLH;
    const nwRatio = currentNW / targetNW;
    const minRatio = Math.min(lhRatio, nwRatio);

    if (minRatio < 0.85) {
      // Atrasado > 15%
      const pctBehind = Math.round((1 - minRatio) * 100);
      elFarmAlertBadge.textContent = `⚠️ Farm Atrasado (-${pctBehind}% vs Immortal)`;
      elFarmAlertBadge.className = 'farm-alert-badge delayed';
    } else if (minRatio > 1.15) {
      // Avançado > 15%
      const pctAhead = Math.round((minRatio - 1) * 100);
      elFarmAlertBadge.textContent = `🔥 Farm Avançado (+${pctAhead}% vs Immortal)`;
      elFarmAlertBadge.className = 'farm-alert-badge ahead';
    } else {
      // Na Meta
      elFarmAlertBadge.textContent = `✔ Farm na Meta`;
      elFarmAlertBadge.className = 'farm-alert-badge ontrack';
    }
  } else {
    elFarmAlertBadge.textContent = `✔ Aquecendo / Início de Jogo`;
    elFarmAlertBadge.className = 'farm-alert-badge ontrack';
  }
}

// Rastrear itens no inventário para comparar timings com o rank Immortal
function trackInventoryItemTimings(itemsData) {
  if (!itemsData) return;

  const slots = ['slot0', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'];
  slots.forEach((s) => {
    const item = itemsData[s];
    if (item && item.name && item.name !== 'item_empty') {
      const code = item.name;
      if (IMMORTAL_ITEM_TIMINGS[code] && !acquiredItemsHistory.has(code)) {
        // Registra o tempo em que o item apareceu pela primeira vez no inventário
        acquiredItemsHistory.set(code, currentClockTime);
        console.log(`⏱️ [Timing] ${IMMORTAL_ITEM_TIMINGS[code].name} completado aos ${formatGameTime(currentClockTime)}!`);
      }
    }
  });

  renderItemTimingsList();
}

function renderItemTimingsList() {
  if (acquiredItemsHistory.size === 0) {
    elItemTimingsList.innerHTML = '<div class="timing-empty">Aguardando itens da build...</div>';
    return;
  }

  let html = '';
  acquiredItemsHistory.forEach((timeAcquired, code) => {
    const meta = IMMORTAL_ITEM_TIMINGS[code];
    if (!meta) return;

    const diff = timeAcquired - meta.targetSeconds;
    const isEarly = diff <= 0;
    const diffText = isEarly ? `${formatSeconds(Math.abs(diff))} adiantado` : `+${formatSeconds(diff)} atrasado`;
    const badgeClass = isEarly ? 'early' : 'late';

    html += `
      <div class="timing-row">
        <span class="timing-name">${meta.name}</span>
        <span class="timing-badge ${badgeClass}">${formatGameTime(timeAcquired)} (${diffText})</span>
      </div>
    `;
  });

  elItemTimingsList.innerHTML = html;
}

// ============================================================
// MÓDULO 7: LEMBRETE DE STACKS & PULLS NOS ACAMPAMENTOS
// ============================================================
const widgetStackPull = document.getElementById('widget-stack-pull');
const btnStackVoice = document.getElementById('btn-stack-voice');
const elStackActionBanner = document.getElementById('stack-action-banner');
const elStackStatusBadge = document.getElementById('stack-status-badge');
const elStackActionMain = document.getElementById('stack-action-main');
const elStackActionSub = document.getElementById('stack-action-sub');
const elStackTimelineFill = document.getElementById('stack-timeline-fill');

let stackVoiceEnabled = localStorage.getItem('dota_overlay_stack_voice') !== 'false';
let lastAnnouncedStackMin = -1;
let lastAnnouncedPrepMin = -1;

function updateStackVoiceButton() {
  if (btnStackVoice) {
    btnStackVoice.textContent = stackVoiceEnabled ? '🔊 Voz: ON' : '🔇 Voz: OFF';
    btnStackVoice.style.color = stackVoiceEnabled ? '#2ed573' : '#ff4757';
  }
}

if (btnStackVoice) {
  btnStackVoice.addEventListener('click', () => {
    stackVoiceEnabled = !stackVoiceEnabled;
    localStorage.setItem('dota_overlay_stack_voice', String(stackVoiceEnabled));
    updateStackVoiceButton();
    if (stackVoiceEnabled) speakVoice('Avisos de stack ativados.');
  });
}
updateStackVoiceButton();

function updateStackPullTimer(clockSeconds) {
  if (clockSeconds < 0) {
    if (elStackTimelineFill) elStackTimelineFill.style.width = '0%';
    if (elStackStatusBadge) elStackStatusBadge.textContent = 'PRÉ-JOGO';
    if (elStackActionMain) elStackActionMain.textContent = 'Neutros nascem aos 01:00';
    if (elStackActionSub) elStackActionSub.textContent = 'Aguarde o início da partida';
    if (elStackActionBanner) elStackActionBanner.className = 'stack-action-banner';
    return;
  }

  const currentMin = Math.floor(clockSeconds / 60);
  const sec = ((clockSeconds % 60) + 60) % 60;

  // Barra de progresso do minuto atual (0% a 100%)
  if (elStackTimelineFill) {
    const pct = (sec / 60) * 100;
    elStackTimelineFill.style.width = `${pct}%`;
  }

  // 1. :52s a :56s -> STACK AGORA!
  if (sec >= 52 && sec <= 56) {
    if (elStackActionBanner) elStackActionBanner.className = 'stack-action-banner action';
    if (elStackStatusBadge) elStackStatusBadge.textContent = '🔥 STACK AGORA (:53 - :55)';
    if (elStackActionMain) elStackActionMain.textContent = 'BATA E CORRA PARA FORA!';
    if (elStackActionSub) elStackActionSub.textContent = 'Puxe os creeps para fora da caixa de spawn';

    if (sec >= 53 && stackVoiceEnabled && lastAnnouncedStackMin !== currentMin && clockSeconds >= 50) {
      lastAnnouncedStackMin = currentMin;
      speakVoice('Stack agora! Puxe o acampamento.');
    }
  }
  // 2. :43s a :51s -> PREPARAÇÃO DE STACK (:45)
  else if (sec >= 43 && sec <= 51) {
    if (elStackActionBanner) elStackActionBanner.className = 'stack-action-banner prep';
    if (elStackStatusBadge) elStackStatusBadge.textContent = 'PREPARAR STACK (:45)';
    if (elStackActionMain) elStackActionMain.textContent = 'Posicione-se no Acampamento';
    const remainingToStack = 53 - sec;
    if (elStackActionSub) elStackActionSub.textContent = `Faltam ${remainingToStack}s para bater (:53s)`;

    if (sec >= 45 && stackVoiceEnabled && lastAnnouncedPrepMin !== currentMin && clockSeconds >= 40) {
      lastAnnouncedPrepMin = currentMin;
      speakVoice('Atenção, prepare o stack aos 53.');
    }
  }
  // 3. :12s a :18s -> PULL DA LANE NA WAVE (:15)
  else if (sec >= 12 && sec <= 18) {
    if (elStackActionBanner) elStackActionBanner.className = 'stack-action-banner pull';
    if (elStackStatusBadge) elStackStatusBadge.textContent = 'PULL DA LANE (:15)';
    if (elStackActionMain) elStackActionMain.textContent = 'Puxe o Small Camp na Wave!';
    if (elStackActionSub) elStackActionSub.textContent = 'Equilibre o creep equilibrium da lane';
  }
  // 4. Intervalo normal / Contagem regressiva
  else {
    if (elStackActionBanner) elStackActionBanner.className = 'stack-action-banner';
    if (elStackStatusBadge) elStackStatusBadge.textContent = 'PRÓXIMO STACK AOS :53';
    if (elStackActionMain) elStackActionMain.textContent = 'Stack em :53 - :55';
    const waitSec = sec < 53 ? 53 - sec : (60 - sec + 53);
    if (elStackActionSub) elStackActionSub.textContent = `Faltam ${waitSec}s para a janela de stack`;
  }
}

// ============================================================
// MÓDULO 3: SUGESTÃO DE SKILL BUILD EM TEMPO REAL
// ============================================================
function updateSkillBuildRecommendation(heroData, abilitiesData) {
  if (!heroData) {
    widgetSkillBuild.classList.add('hidden');
    return;
  }

  const abilityPoints = heroData.ability_points || 0;

  // Só exibe se houver pontos de habilidade para gastar (ou se estiver no modo edição)
  if (abilityPoints > 0 || isEditMode) {
    if (!hiddenWidgets.has('widget-skill-build')) {
      widgetSkillBuild.classList.remove('hidden');
    }

    const currentLevel = heroData.level || 1;
    let recKey = 'Q';
    let recName = 'Habilidade Principal';

    // Regras gerais de skill build recomendada por nível:
    // Níveis 6, 12, 18 -> Ultimate (R)
    if (currentLevel === 6 || currentLevel === 12 || currentLevel === 18) {
      recKey = 'R';
      recName = 'Ultimate (R)';
    } else if (abilitiesData) {
      // Avaliar nível das habilidades Q, W, E
      const q = abilitiesData.ability0;
      const w = abilitiesData.ability1;
      const e = abilitiesData.ability2;

      if (q && (q.level || 0) < 4) {
        recKey = 'Q';
        recName = (q.name || 'Habilidade Q').replace(/_/g, ' ');
      } else if (w && (w.level || 0) < 4) {
        recKey = 'W';
        recName = (w.name || 'Habilidade W').replace(/_/g, ' ');
      } else if (e && (e.level || 0) < 4) {
        recKey = 'E';
        recName = (e.name || 'Habilidade E').replace(/_/g, ' ');
      }
    }

    elSkillRecommendedKey.textContent = recKey;
    elSkillRecommendedText.textContent = `Recomendado upar: ${recName}`;
  } else {
    widgetSkillBuild.classList.add('hidden');
  }
}

// ============================================================
// MÓDULO 5: WIDGET DE COUNTER-PICK PARA FASE DE DRAFT
// ============================================================
async function initDraftModule() {
  try {
    const res = await fetch('/api/heroes');
    if (res.ok) {
      allHeroesList = await res.json();
    }
  } catch (err) {
    console.warn('Erro ao carregar heróis para o draft:', err);
  }

  if (inputDraftHeroSearch) {
    inputDraftHeroSearch.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query || allHeroesList.length === 0) {
        elDraftSearchResults.classList.add('hidden');
        return;
      }

      const matches = allHeroesList.filter((h) =>
        h.localized_name.toLowerCase().includes(query) && !selectedEnemyHeroIds.includes(h.id)
      ).slice(0, 6);

      if (matches.length === 0) {
        elDraftSearchResults.classList.add('hidden');
        return;
      }

      let html = '';
      matches.forEach((h) => {
        const cleanName = h.name.replace('npc_dota_hero_', '');
        html += `
          <div class="draft-search-item" data-id="${h.id}">
            <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${cleanName}.png" onerror="this.src=''">
            <span>${h.localized_name}</span>
          </div>
        `;
      });

      elDraftSearchResults.innerHTML = html;
      elDraftSearchResults.classList.remove('hidden');

      elDraftSearchResults.querySelectorAll('.draft-search-item').forEach((item) => {
        item.addEventListener('click', () => {
          const id = Number(item.dataset.id);
          addEnemyHero(id);
          inputDraftHeroSearch.value = '';
          elDraftSearchResults.classList.add('hidden');
        });
      });
    });
  }

  if (btnClearDraft) {
    btnClearDraft.addEventListener('click', () => {
      selectedEnemyHeroIds = [];
      updateEnemySlotsUI();
      elCounterList.innerHTML = '<div class="counter-placeholder">Selecione heróis inimigos acima para calcular os melhores counter-picks pela API do OpenDota.</div>';
    });
  }
}

function addEnemyHero(heroId) {
  if (selectedEnemyHeroIds.length >= 5 || selectedEnemyHeroIds.includes(heroId)) return;
  selectedEnemyHeroIds.push(heroId);
  updateEnemySlotsUI();
  fetchCounterPicks();
}

function removeEnemyHero(heroId) {
  selectedEnemyHeroIds = selectedEnemyHeroIds.filter((id) => id !== heroId);
  updateEnemySlotsUI();
  fetchCounterPicks();
}

function updateEnemySlotsUI() {
  let html = '';
  for (let i = 0; i < 5; i++) {
    const heroId = selectedEnemyHeroIds[i];
    if (heroId) {
      const hero = allHeroesList.find((h) => h.id === heroId);
      const cleanName = hero ? hero.name.replace('npc_dota_hero_', '') : '';
      html += `
        <div class="enemy-slot filled" title="Clique para remover ${hero?.localized_name || ''}" onclick="removeEnemyHeroSlot(${heroId})">
          <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${cleanName}.png">
        </div>
      `;
    } else {
      html += `<div class="enemy-slot empty">+</div>`;
    }
  }
  elEnemySlots.innerHTML = html;
}

window.removeEnemyHeroSlot = function (heroId) {
  removeEnemyHero(heroId);
};

async function fetchCounterPicks() {
  if (selectedEnemyHeroIds.length === 0) {
    elCounterList.innerHTML = '<div class="counter-placeholder">Selecione heróis inimigos acima para calcular os melhores counter-picks pela API do OpenDota.</div>';
    return;
  }

  elCounterList.innerHTML = '<div class="counter-placeholder">Calculando counter-picks na API do OpenDota...</div>';

  try {
    const res = await fetch('/api/counter-picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enemyHeroIds: selectedEnemyHeroIds })
    });

    if (res.ok) {
      const counters = await res.json();
      renderCountersList(counters);
    }
  } catch (err) {
    console.error('Erro ao buscar counters:', err);
  }
}

function renderCountersList(counters) {
  if (!counters || counters.length === 0) {
    elCounterList.innerHTML = '<div class="counter-placeholder">Nenhum dado encontrado para estes heróis.</div>';
    return;
  }

  let html = '';
  counters.forEach(({ hero, advantage }) => {
    const cleanName = hero.name.replace('npc_dota_hero_', '');
    const advColor = advantage >= 0 ? '#2ed573' : '#ff4757';
    const advPrefix = advantage >= 0 ? '+' : '';
    const roles = (hero.roles || []).slice(0, 2).join(' • ');

    html += `
      <div class="counter-card">
        <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${cleanName}.png" alt="${hero.localized_name}">
        <div class="counter-info">
          <div class="counter-hero-name">${hero.localized_name}</div>
          <div class="counter-roles">${roles}</div>
        </div>
        <div class="counter-score" style="color: ${advColor}">${advPrefix}${advantage}%</div>
      </div>
    `;
  });

  elCounterList.innerHTML = html;
}

initDraftModule();

// ============================================================
// RECEPÇÃO VIA SOCKET.IO E TELEMETRIA
// ============================================================
let lastKnownPlayer = null;

socket.on('connect', () => {
  elMatchStatus.textContent = 'CONECTADO AO SERVIDOR';
  elMatchStatus.style.borderColor = 'rgba(0, 210, 211, 0.4)';
  elMatchStatus.style.color = '#00d2d3';
});

socket.on('timers:sync', (state) => {
  if (state) {
    timerState = state;
    updateTimerVisuals();
  }
});

socket.on('dota:tactics', (tactics) => {
  if (!tactics) return;
  // Renderizar itens populares do OpenDota
  if (tactics.itemPopularity) {
    renderPopularItems(tactics.itemPopularity);
  }
});

function renderPopularItems(itemPop) {
  const early = Object.keys(itemPop.early_game_items || {}).slice(0, 4);
  const mid = Object.keys(itemPop.mid_game_items || {}).slice(0, 4);
  const combined = Array.from(new Set([...early, ...mid])).slice(0, 6);

  let html = '';
  combined.forEach((itemCode) => {
    const label = itemCode.replace('item_', '').replace(/_/g, ' ');
    html += `<span class="popular-item-pill">${label}</span>`;
  });

  if (html) elPopularItemsIcons.innerHTML = html;
}

socket.on('dota:state', (data) => {
  if (!data) return;

  if (data.timerState) timerState = data.timerState;
  if (data.map) updateMapData(data.map);
  if (data.player) {
    lastKnownPlayer = data.player;
    updatePlayerData(data.player);
  }
  if (data.hero) updateHeroData(data.hero);
  if (data.items) trackInventoryItemTimings(data.items);

  // Módulo 2 e 3
  updateFarmMonitor(data.player);
  updateSkillBuildRecommendation(data.hero, data.abilities);

  updateTimerVisuals();
});

function updateMapData(map) {
  if (map.clock_time !== undefined) {
    currentClockTime = map.clock_time;
    lastServerTick = Date.now();
    elGameClock.textContent = formatGameTime(currentClockTime);

    // Checagem de voz do Tormentor e Alertas de Stack/Pull
    checkVoiceAlerts(currentClockTime);
    updateStackPullTimer(currentClockTime);
  }

  if (map.daytime !== undefined) {
    elDayNightIcon.textContent = map.daytime ? '☀️' : '🌙';
  }

  currentGameState = map.game_state;
  isGameInProgress = (map.game_state === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS');

  if (map.paused) {
    elMatchStatus.textContent = 'PAUSADO';
    elMatchStatus.style.color = '#ffa502';
  } else if (map.game_state === 'DOTA_GAMERULES_STATE_PRE_GAME') {
    elMatchStatus.textContent = 'PRÉ-JOGO';
    elMatchStatus.style.color = '#70a1ff';
  } else if (isGameInProgress) {
    elMatchStatus.textContent = 'EM PARTIDA';
    elMatchStatus.style.color = '#2ed573';
  } else if (map.game_state === 'DOTA_GAMERULES_STATE_POST_GAME') {
    elMatchStatus.textContent = 'FIM DE JOGO';
    elMatchStatus.style.color = '#ffd32a';
  }

  // Auto-hide dependente do estado da partida
  applyGameStateVisibility(map.game_state);
}

function updatePlayerData(player) {
  if (player.name) elPlayerName.textContent = player.name;

  const kills = player.kills ?? 0;
  const deaths = player.deaths ?? 0;
  const assists = player.assists ?? 0;

  elStatKills.textContent = kills;
  elStatDeaths.textContent = deaths;
  elStatAssists.textContent = assists;

  const kdaRatio = ((kills + assists) / Math.max(1, deaths)).toFixed(2);
  elStatKdaRatio.textContent = `KDA RATIO: ${kdaRatio}`;

  elStatGpm.textContent = player.gpm ?? 0;
  elStatXpm.textContent = player.xpm ?? 0;
  elStatLh.textContent = player.last_hits ?? 0;
  elStatDn.textContent = player.denies ?? 0;

  const nw = player.net_worth ?? (player.gold ?? 0);
  elPlayerNetworth.textContent = `${formatNumber(nw)} NW`;
}

function updateHeroData(hero) {
  if (hero.level) elHeroLevel.textContent = `Lv ${hero.level}`;

  if (hero.name) {
    const rawName = hero.name.replace('npc_dota_hero_', '');
    elHeroName.textContent = rawName.replace(/_/g, ' ');

    const cdnUrl = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${rawName}.png`;
    if (elHeroImg.dataset.hero !== rawName) {
      elHeroImg.src = cdnUrl;
      elHeroImg.dataset.hero = rawName;
    }
  }
}

// ============================================================
// TEMPORIZADORES & DISPARADORES DE VOZ AUTOMÁTICOS
// ============================================================
function checkVoiceAlerts(clock) {
  // 1. Tormentor: Faltando 15s (14:45 = 885s)
  if (clock >= 885 && clock < 900 && !voiceAnnouncements.tormentor15s && !timerState.tormentor.active) {
    voiceAnnouncements.tormentor15s = true;
    speakVoice('Atenção! Tormentor nasce em 15 segundos.');
  }

  // 2. Tormentor: Nascimento (15:00 = 900s)
  if (clock >= 900 && !voiceAnnouncements.tormentorSpawn && !timerState.tormentor.active) {
    voiceAnnouncements.tormentorSpawn = true;
    speakVoice('Tormentor nasceu! Prepare-se para abater.');
  }

  // 3. Roshan: Janela de respawn aos 8 min (480s após a morte)
  if (timerState.roshan.active && timerState.roshan.deathGameTime !== null) {
    const elapsedSinceDeath = clock - timerState.roshan.deathGameTime;

    if (elapsedSinceDeath >= 480 && !voiceAnnouncements.roshanMin) {
      voiceAnnouncements.roshanMin = true;
      speakVoice('Janela de respawn do Roshan aberta! Fique atento.');
    }

    // 4. Roshan: Respawn garantido aos 11 min (660s após a morte)
    if (elapsedSinceDeath >= 660 && !voiceAnnouncements.roshanMax) {
      voiceAnnouncements.roshanMax = true;
      speakVoice('Roshan renasceu com certeza!');
    }
  }
}

function updateTimerVisuals() {
  const clock = currentClockTime;

  // Tormentor
  if (timerState.tormentor.active && timerState.tormentor.respawnGameTime) {
    const remaining = timerState.tormentor.respawnGameTime - clock;
    elTormentorTimerLabel.textContent = 'Respawn (10 min):';

    if (remaining > 0) {
      elTormentorStatusText.textContent = `RESPAWN EM ${formatSeconds(remaining)}`;
      elTormentorStatusText.style.color = '#ff9f43';
      elTormentorTimeLeft.textContent = formatGameTime(timerState.tormentor.respawnGameTime);

      const elapsed = 600 - remaining;
      const pct = Math.max(0, Math.min(100, (elapsed / 600) * 100));
      elTormentorProgress.style.width = `${pct}%`;
      elTormentorProgress.style.background = 'linear-gradient(90deg, #ff9f43, #00d2d3)';
    } else {
      elTormentorStatusText.textContent = 'DISPONÍVEL (VIVO)';
      elTormentorStatusText.style.color = '#00d2d3';
      elTormentorTimeLeft.textContent = 'VIVO';
      elTormentorProgress.style.width = '100%';
      elTormentorProgress.style.background = '#00d2d3';
    }
  } else {
    elTormentorTimerLabel.textContent = 'Primeiro Spawn (15:00):';

    if (clock < TORMENTOR_INITIAL_SPAWN) {
      const remaining = TORMENTOR_INITIAL_SPAWN - clock;
      elTormentorStatusText.textContent = `SPAWNA EM ${formatSeconds(remaining)}`;
      elTormentorStatusText.style.color = '#70a1ff';
      elTormentorTimeLeft.textContent = '15:00';

      const pct = Math.max(0, Math.min(100, (clock / TORMENTOR_INITIAL_SPAWN) * 100));
      elTormentorProgress.style.width = `${pct}%`;
      elTormentorProgress.style.background = 'linear-gradient(90deg, #2e86de, #00d2d3)';
    } else {
      elTormentorStatusText.textContent = 'DISPONÍVEL (VIVO)';
      elTormentorStatusText.style.color = '#00d2d3';
      elTormentorTimeLeft.textContent = 'DISPONÍVEL';
      elTormentorProgress.style.width = '100%';
      elTormentorProgress.style.background = '#00d2d3';
    }
  }

  // Roshan
  if (timerState.roshan.active && timerState.roshan.deathGameTime !== null) {
    const death = timerState.roshan.deathGameTime;
    const aegis = timerState.roshan.aegisGameTime;
    const minResp = timerState.roshan.minRespawnGameTime;
    const maxResp = timerState.roshan.maxRespawnGameTime;

    elRoshanAegisTime.textContent = formatGameTime(aegis);
    elRoshanMinTime.textContent = formatGameTime(minResp);
    elRoshanMaxTime.textContent = formatGameTime(maxResp);

    if (clock < aegis) {
      const aegisLeft = aegis - clock;
      elRoshanStatusText.textContent = `AEGIS ATIVA (${formatSeconds(aegisLeft)})`;
      elRoshanStatusText.style.color = '#ffd32a';

      const pct = Math.max(0, Math.min(100, ((clock - death) / 300) * 100));
      elRoshanProgress.style.width = `${pct}%`;
      elRoshanProgress.style.background = 'linear-gradient(90deg, #ffd32a, #ff9f43)';
    } else if (clock < minResp) {
      const minLeft = minResp - clock;
      elRoshanStatusText.textContent = `AEGIS EXPIROU (Respawn em ${formatSeconds(minLeft)})`;
      elRoshanStatusText.style.color = '#ff9f43';

      const pct = Math.max(0, Math.min(100, ((clock - death) / 480) * 100));
      elRoshanProgress.style.width = `${pct}%`;
      elRoshanProgress.style.background = 'linear-gradient(90deg, #ff9f43, #ff4757)';
    } else if (clock < maxResp) {
      const maxLeft = maxResp - clock;
      elRoshanStatusText.textContent = `JANELA ABERTA (Máx ${formatSeconds(maxLeft)})`;
      elRoshanStatusText.style.color = '#2ed573';

      const pct = Math.max(0, Math.min(100, ((clock - minResp) / (maxResp - minResp)) * 100));
      elRoshanProgress.style.width = `${pct}%`;
      elRoshanProgress.style.background = 'linear-gradient(90deg, #2ed573, #00d2d3)';
    } else {
      elRoshanStatusText.textContent = 'STATUS: VIVO';
      elRoshanStatusText.style.color = '#2ed573';
      elRoshanProgress.style.width = '100%';
      elRoshanProgress.style.background = '#2ed573';
    }
  } else {
    elRoshanStatusText.textContent = 'STATUS: VIVO';
    elRoshanStatusText.style.color = '#2ed573';
    elRoshanAegisTime.textContent = '--:--';
    elRoshanMinTime.textContent = '--:--';
    elRoshanMaxTime.textContent = '--:--';
    elRoshanProgress.style.width = '100%';
    elRoshanProgress.style.background = '#2ed573';
  }
}

// Tick local 1s
setInterval(() => {
  if (isGameInProgress) {
    const elapsedSinceLastTick = Math.floor((Date.now() - lastServerTick) / 1000);
    if (elapsedSinceLastTick > 0 && elapsedSinceLastTick < 4) {
      const liveClock = currentClockTime + elapsedSinceLastTick;
      elGameClock.textContent = formatGameTime(liveClock);
      checkVoiceAlerts(liveClock);
      updateStackPullTimer(liveClock);
    } else {
      updateStackPullTimer(currentClockTime);
    }
  } else {
    updateStackPullTimer(currentClockTime);
  }
  updateTimerVisuals();
  updateFarmMonitor();
}, 1000);

// ============================================================
// EVENTOS DE BOTÕES
// ============================================================
btnRoshanDeath.addEventListener('click', () => {
  triggerRoshanDeath();
});

btnRoshanReset.addEventListener('click', () => {
  socket.emit('roshan:reset');
  voiceAnnouncements.roshanMin = false;
  voiceAnnouncements.roshanMax = false;
});

btnTormentorDeath.addEventListener('click', () => {
  socket.emit('tormentor:death', { gameTime: currentClockTime });
  speakVoice('Tormentor abatido! Respawn em 10 minutos.');
});

btnTormentorReset.addEventListener('click', () => {
  socket.emit('tormentor:reset');
  voiceAnnouncements.tormentor15s = false;
  voiceAnnouncements.tormentorSpawn = false;
});

btnTestSim.addEventListener('click', () => {
  fetch('/api/simulate')
    .then((res) => res.json())
    .catch((err) => console.error(err));
});

btnTestDraft.addEventListener('click', () => {
  fetch('/api/simulate-draft')
    .then((res) => res.json())
    .catch((err) => console.error(err));
});

btnToggleToolbar.addEventListener('click', () => {
  setWidgetVisibility('streamer-toolbar', false);
});

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================
function formatGameTime(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds)) return '00:00';
  const prefix = totalSeconds < 0 ? '-' : '';
  const abs = Math.abs(Math.floor(totalSeconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${prefix}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatSeconds(seconds) {
  if (seconds <= 0) return '00:00';
  const abs = Math.floor(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return String(num);
}
