const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Servir arquivos estáticos do diretório public
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// 1. MÓDULO OPENDOTA API & CACHE EM MEMÓRIA
// ============================================================

const opendotaCache = {
  heroes: null,
  heroesByName: new Map(),
  heroesById: new Map(),
  itemPopularity: new Map(), // heroId -> data
  matchups: new Map()        // heroId -> data
};

let currentTrackedHeroId = null;

// Inicializar lista de heróis do OpenDota
async function initOpenDotaHeroes() {
  if (opendotaCache.heroes) return opendotaCache.heroes;

  try {
    const res = await fetch('https://api.opendota.com/api/heroes', { headers: { 'User-Agent': 'Dota2Overlay/2.0' } });
    if (res.ok) {
      const data = await res.json();
      opendotaCache.heroes = data;
      data.forEach((h) => {
        opendotaCache.heroesByName.set(h.name, h);
        opendotaCache.heroesById.set(h.id, h);
      });
      console.log(`📡 [OpenDota] ${data.length} heróis carregados com sucesso.`);
      return data;
    }
  } catch (err) {
    console.warn('⚠️ [OpenDota] Erro ao carregar lista de heróis online, usando lista base:', err.message);
  }

  // Fallback caso sem internet
  return getFallbackHeroes();
}

// Buscar dados táticos (Item Popularity + Matchups) com cache
async function fetchHeroTactics(heroId) {
  if (!heroId) return null;

  // Verificar se já temos em cache
  const cachedItems = opendotaCache.itemPopularity.get(heroId);
  const cachedMatchups = opendotaCache.matchups.get(heroId);

  if (cachedItems && cachedMatchups) {
    return {
      heroId,
      itemPopularity: cachedItems,
      matchups: cachedMatchups
    };
  }

  console.log(`🔍 [OpenDota] Buscando táticas e matchups para Herói ID ${heroId}...`);

  try {
    const [itemsRes, matchupsRes] = await Promise.all([
      fetch(`https://api.opendota.com/api/heroes/${heroId}/itemPopularity`, { headers: { 'User-Agent': 'Dota2Overlay/2.0' } }),
      fetch(`https://api.opendota.com/api/heroes/${heroId}/matchups`, { headers: { 'User-Agent': 'Dota2Overlay/2.0' } })
    ]);

    let itemPopularity = cachedItems;
    let matchups = cachedMatchups;

    if (itemsRes.ok) {
      itemPopularity = await itemsRes.json();
      opendotaCache.itemPopularity.set(heroId, itemPopularity);
    }
    if (matchupsRes.ok) {
      matchups = await matchupsRes.json();
      opendotaCache.matchups.set(heroId, matchups);
    }

    const tactics = { heroId, itemPopularity, matchups };
    io.emit('dota:tactics', tactics);
    return tactics;
  } catch (err) {
    console.warn(`⚠️ [OpenDota] Erro ao buscar dados do herói ${heroId}:`, err.message);
    return null;
  }
}

function resolveHeroId(heroData) {
  if (!heroData) return null;
  if (heroData.id && typeof heroData.id === 'number' && heroData.id > 0) {
    return heroData.id;
  }
  if (heroData.name && opendotaCache.heroesByName.has(heroData.name)) {
    return opendotaCache.heroesByName.get(heroData.name).id;
  }
  return null;
}

// Iniciar lista de heróis em segundo plano
initOpenDotaHeroes().catch(() => {});

// ============================================================
// 2. ESTADO EM MEMÓRIA & GSI
// ============================================================

let lastGameState = null;
let timerState = {
  roshan: {
    active: false,
    deathGameTime: null,
    deathTimestamp: null,
    aegisGameTime: null,
    minRespawnGameTime: null,
    maxRespawnGameTime: null
  },
  tormentor: {
    active: false,
    deathGameTime: null,
    respawnGameTime: null
  }
};

let dotaConnected = false;
let lastHeartbeat = Date.now();

const handleGSI = (req, res) => {
  const data = req.body;

  if (data && typeof data === 'object') {
    lastGameState = data;
    lastHeartbeat = Date.now();

    if (!dotaConnected) {
      dotaConnected = true;
      console.log('🎮 [DOTA 2] Conexão detectada! Recebendo telemetria da partida.');
    }

    // Verificar se herói foi selecionado para buscar dados no OpenDota
    if (data.hero) {
      const heroId = resolveHeroId(data.hero);
      if (heroId && heroId !== currentTrackedHeroId) {
        currentTrackedHeroId = heroId;
        fetchHeroTactics(heroId).then((tactics) => {
          if (tactics) {
            io.emit('dota:tactics', tactics);
          }
        });
      }
    }

    // Emitir os dados em tempo real via WebSocket
    io.emit('dota:state', {
      raw: data,
      player: data.player || null,
      hero: data.hero || null,
      map: data.map || null,
      items: data.items || null,
      abilities: data.abilities || null,
      timerState
    });
  }

  res.status(200).send('OK');
};

app.post('/', handleGSI);
app.post('/endpoint', handleGSI);

// ============================================================
// 3. ROTAS DE API (DRAFT & SIMULAÇÃO)
// ============================================================

// Obter lista completa de heróis para o Widget de Draft
app.get('/api/heroes', async (req, res) => {
  const heroes = await initOpenDotaHeroes();
  res.json(heroes);
});

// Calcular Counter-Picks com base nos heróis inimigos selecionados
app.post('/api/counter-picks', async (req, res) => {
  const { enemyHeroIds } = req.body;
  if (!Array.isArray(enemyHeroIds) || enemyHeroIds.length === 0) {
    return res.json([]);
  }

  const allHeroes = await initOpenDotaHeroes();
  const enemyIds = new Set(enemyHeroIds.map(Number));

  // Buscar matchups de cada inimigo (com cache)
  const enemyMatchups = await Promise.all(
    enemyHeroIds.map(async (id) => {
      let m = opendotaCache.matchups.get(id);
      if (!m) {
        try {
          const r = await fetch(`https://api.opendota.com/api/heroes/${id}/matchups`);
          if (r.ok) {
            m = await r.json();
            opendotaCache.matchups.set(id, m);
          }
        } catch (e) {}
      }
      return { enemyId: id, matchups: m || [] };
    })
  );

  // Calcular score de vantagem para cada herói aliado candidato
  // Quanto menor a taxa de vitória do inimigo contra nosso herói candidato, maior nossa vantagem!
  const candidateScores = [];

  allHeroes.forEach((candidate) => {
    if (enemyIds.has(candidate.id)) return; // Não sugerir quem já foi pego

    let totalAdvantage = 0;
    let count = 0;

    enemyMatchups.forEach(({ enemyId, matchups }) => {
      const match = matchups.find((item) => item.hero_id === candidate.id);
      if (match && match.games_played > 50) {
        // match.wins é a vitória do inimigo contra o candidato
        const enemyWinrate = match.wins / match.games_played;
        // Nossa vantagem é (50% - taxa de vitória do inimigo) * 100
        const ourAdvantage = (0.50 - enemyWinrate) * 100;
        totalAdvantage += ourAdvantage;
        count++;
      }
    });

    const avgAdvantage = count > 0 ? (totalAdvantage / count) : 0;
    candidateScores.push({
      hero: candidate,
      advantage: Math.round(avgAdvantage * 10) / 10,
      matchCount: count
    });
  });

  // Ordenar pelos maiores counters (maior vantagem)
  candidateScores.sort((a, b) => b.advantage - a.advantage);

  res.json(candidateScores.slice(0, 8));
});

// Simulação de dados para teste rápido
app.get('/api/simulate', (req, res) => {
  const mockState = generateMockState();
  lastGameState = mockState;
  const heroId = resolveHeroId(mockState.hero) || 8;
  currentTrackedHeroId = heroId;

  fetchHeroTactics(heroId).then((tactics) => {
    io.emit('dota:state', {
      raw: mockState,
      player: mockState.player,
      hero: mockState.hero,
      map: mockState.map,
      items: mockState.items,
      abilities: mockState.abilities,
      timerState,
      tactics
    });
  });

  res.json({ success: true, message: 'Dados de simulação enviados para o overlay!' });
});

// Simular fase de Draft
app.get('/api/simulate-draft', (req, res) => {
  const draftState = {
    map: {
      game_state: 'DOTA_GAMERULES_STATE_HERO_SELECTION',
      clock_time: 0,
      daytime: true
    },
    player: { name: 'Player' },
    hero: null
  };
  lastGameState = draftState;
  io.emit('dota:state', {
    raw: draftState,
    map: draftState.map,
    player: draftState.player,
    hero: null,
    timerState
  });
  res.json({ success: true, message: 'Fase de draft simulada!' });
});

// ============================================================
// 4. SOCKET.IO EVENTS & TIMERS
// ============================================================

io.on('connection', (socket) => {
  console.log(`🔌 [Socket.io] Novo cliente conectado (ID: ${socket.id})`);

  if (lastGameState) {
    socket.emit('dota:state', {
      raw: lastGameState,
      player: lastGameState.player || null,
      hero: lastGameState.hero || null,
      map: lastGameState.map || null,
      items: lastGameState.items || null,
      abilities: lastGameState.abilities || null,
      timerState
    });
  }
  socket.emit('timers:sync', timerState);

  // Roshan death
  socket.on('roshan:death', (payload) => {
    const currentGameTime = payload?.gameTime ?? (lastGameState?.map?.clock_time || 0);
    timerState.roshan = {
      active: true,
      deathGameTime: currentGameTime,
      deathTimestamp: Date.now(),
      aegisGameTime: currentGameTime + 300,        // Aegis expira em 5:00
      minRespawnGameTime: currentGameTime + 480,   // Respawn mínimo aos 8:00
      maxRespawnGameTime: currentGameTime + 660    // Respawn máximo aos 11:00
    };
    io.emit('timers:sync', timerState);
    io.emit('voice:notify', { type: 'roshan_down', time: currentGameTime });
    console.log(`⏱️ [ROSHAN] Morto aos ${formatTime(currentGameTime)}.`);
  });

  socket.on('roshan:reset', () => {
    timerState.roshan = {
      active: false,
      deathGameTime: null,
      deathTimestamp: null,
      aegisGameTime: null,
      minRespawnGameTime: null,
      maxRespawnGameTime: null
    };
    io.emit('timers:sync', timerState);
  });

  // Tormentor death
  socket.on('tormentor:death', (payload) => {
    const currentGameTime = payload?.gameTime ?? (lastGameState?.map?.clock_time || 0);
    timerState.tormentor = {
      active: true,
      deathGameTime: currentGameTime,
      respawnGameTime: currentGameTime + 600
    };
    io.emit('timers:sync', timerState);
    io.emit('voice:notify', { type: 'tormentor_down', time: currentGameTime });
  });

  socket.on('tormentor:reset', () => {
    timerState.tormentor = {
      active: false,
      deathGameTime: null,
      respawnGameTime: null
    };
    io.emit('timers:sync', timerState);
  });
});

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '--:--';
  const prefix = seconds < 0 ? '-' : '';
  const abs = Math.abs(Math.floor(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${prefix}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getFallbackHeroes() {
  return [
    { id: 1, name: 'npc_dota_hero_antimage', localized_name: 'Anti-Mage', primary_attr: 'agi', roles: ['Carry', 'Escape'] },
    { id: 2, name: 'npc_dota_hero_axe', localized_name: 'Axe', primary_attr: 'str', roles: ['Initiator', 'Durable', 'Disabler'] },
    { id: 6, name: 'npc_dota_hero_drow_ranger', localized_name: 'Drow Ranger', primary_attr: 'agi', roles: ['Carry', 'Disabler'] },
    { id: 8, name: 'npc_dota_hero_juggernaut', localized_name: 'Juggernaut', primary_attr: 'agi', roles: ['Carry', 'Pusher', 'Escape'] },
    { id: 11, name: 'npc_dota_hero_nevermore', localized_name: 'Shadow Fiend', primary_attr: 'agi', roles: ['Carry', 'Nuker'] },
    { id: 14, name: 'npc_dota_hero_pudge', localized_name: 'Pudge', primary_attr: 'str', roles: ['Disabler', 'Initiator', 'Durable'] },
    { id: 25, name: 'npc_dota_hero_lina', localized_name: 'Lina', primary_attr: 'int', roles: ['Support', 'Carry', 'Nuker'] },
    { id: 44, name: 'npc_dota_hero_phantom_assassin', localized_name: 'Phantom Assassin', primary_attr: 'agi', roles: ['Carry', 'Escape'] },
    { id: 74, name: 'npc_dota_hero_invoker', localized_name: 'Invoker', primary_attr: 'all', roles: ['Carry', 'Nuker', 'Disabler'] }
  ];
}

function generateMockState() {
  return {
    provider: { name: 'Dota 2', appid: 570, version: 40, timestamp: Math.floor(Date.now() / 1000) },
    map: {
      name: 'start',
      matchid: '7891234567',
      game_time: 840, // 14 min
      clock_time: 780, // 13 min
      daytime: true,
      nightstalker_night: false,
      radiant_score: 18,
      dire_score: 14,
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      paused: false
    },
    player: {
      steamid: '76561198000000000',
      name: 'StreamerPro',
      activity: 'playing',
      kills: 6,
      deaths: 1,
      assists: 8,
      last_hits: 95,
      denies: 12,
      gpm: 560,
      xpm: 630,
      net_worth: 8400,
      gold: 1850
    },
    hero: {
      id: 8,
      name: 'npc_dota_hero_juggernaut',
      level: 11,
      alive: true,
      respawn_seconds: 0,
      health: 1250,
      max_health: 1420,
      mana: 450,
      max_mana: 620,
      ability_points: 1 // 1 ponto de habilidade pronto para ser gasto!
    },
    abilities: {
      ability0: { name: 'juggernaut_blade_fury', level: 4, can_cast: true, cooldown: 0 },
      ability1: { name: 'juggernaut_healing_ward', level: 1, can_cast: true, cooldown: 0 },
      ability2: { name: 'juggernaut_blade_dance', level: 3, can_cast: false, passive: true },
      ability3: { name: 'juggernaut_omislash', level: 1, can_cast: true, cooldown: 0, ultimate: true }
    },
    items: {
      slot0: { name: 'item_phase_boots', purchaser: 0 },
      slot1: { name: 'item_bfury', purchaser: 0 },
      slot2: { name: 'item_magic_wand', purchaser: 0 },
      slot3: { name: 'item_yasha', purchaser: 0 },
      slot4: { name: 'item_tpscroll', purchaser: 0 },
      slot5: { name: 'item_empty', purchaser: 0 }
    }
  };
}

server.listen(PORT, () => {
  console.log('========================================================');
  console.log(`🚀 Dota 2 Tactical Overlay Server ativo em http://localhost:${PORT}`);
  console.log('========================================================');
});
