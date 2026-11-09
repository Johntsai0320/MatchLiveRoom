/**
 * MatchLiveRoom — 24/7 Global Sports & Esports Streaming Desk
 * Zero-cost, pure frontend real-time sports & esports broadcast room
 * powered directly by ESPN Public APIs + Riot LoL Esports Official Public API.
 */

const ESPN_LEAGUES = [
  { key: 'nba', label: 'NBA', sport: 'basketball', leaguePath: 'nba', isSoccer: false },
  { key: 'mlb', label: 'MLB', sport: 'baseball', leaguePath: 'mlb', isSoccer: false },
  { key: 'epl', label: '英超 EPL', sport: 'soccer', leaguePath: 'eng.1', isSoccer: true },
  { key: 'laliga', label: '西甲 LaLiga', sport: 'soccer', leaguePath: 'esp.1', isSoccer: true },
  { key: 'ucl', label: '歐冠 UCL', sport: 'soccer', leaguePath: 'uefa.champions', isSoccer: true },
  { key: 'nhl', label: 'NHL', sport: 'hockey', leaguePath: 'nhl', isSoccer: false },
  { key: 'nfl', label: 'NFL', sport: 'football', leaguePath: 'nfl', isSoccer: false },
];

// Riot Official LoL Esports Web Client Public Configuration
const LOL_API_BASE = 'https://esports-api.lolesports.com/persisted/gw';
const LOL_LIVESTATS_BASE = 'https://feed.lolesports.com/livestats/v1';
const LOL_PUBLIC_API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';
const DDRAGON_CHAMPION_CDN = 'https://ddragon.leagueoflegends.com/cdn/16.22.1/img/champion';

// Riot Official League IDs
const LOL_WORLDS_LEAGUE_IDS = [
  '98767975604431411', // Worlds (英雄聯盟世界大賽)
  '98767991325878492', // MSI (季中邀請賽)
  '113464388705111224', // First Stand (全球初陣對抗賽)
];

const LOL_PRO_LEAGUE_IDS = [
  '98767991310872058', // LCK (韓國冠軍聯賽)
  '98767991314006698', // LPL (中國職業聯賽)
  '113476371197627891', // LCP (太平洋職業聯賽 / PCS)
  '98767991302996019', // LEC (歐洲冠軍聯賽)
  '98767991299243165', // LCS
  '113475149040947852', // LTA
];

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

const state = {
  allMatches: [],
  filteredMatches: [],
  activeLeagueFilter: 'ALL',
  currentMatchIndex: 0,
  currentMatchId: null,
  currentSummary: null,
  selectedPeriod: 'ALL', // 'ALL' or period number / game number (1, 2, 3, 4, 5...)
  lolGamesCache: new Map(), // matchId -> { eventDetail, games, windowByGameNum: Map }
  pbpFilter: 'all', // 'all' | 'scoring'
  statView: 'boxscore', // 'boxscore' | 'team' | 'leaders'
  autoRotate: true,
  rotateIntervalSec: 25,
  rotateElapsedMs: 0,
  danmakuEnabled: true,
  modalOpen: false,
  previousScores: new Map(),
  announcedPlayIds: new Set(),
  chatHistoryByMatch: new Map(),
};

// DOM Elements
const els = {
  apiStatusDot: document.getElementById('api-status-dot'),
  apiStatusText: document.getElementById('api-status-text'),
  leagueNav: document.getElementById('league-nav'),
  tickerStrip: document.getElementById('match-ticker-strip'),
  rotationCountdown: document.getElementById('rotation-countdown'),
  rotationProgressBar: document.getElementById('rotation-progress-bar'),
  btnPrevMatch: document.getElementById('btn-prev-match'),
  btnToggleRotate: document.getElementById('btn-toggle-rotate'),
  rotateIcon: document.getElementById('rotate-icon'),
  btnNextMatch: document.getElementById('btn-next-match'),
  selectInterval: document.getElementById('select-interval'),
  btnRefreshNow: document.getElementById('btn-refresh-now'),

  // Jumbotron
  danmakuLayer: document.getElementById('danmaku-layer'),
  currentLeaguePill: document.getElementById('current-league-pill'),
  currentVenueText: document.getElementById('current-venue-text'),
  currentStateBadge: document.getElementById('current-state-badge'),
  currentClockText: document.getElementById('current-clock-text'),
  btnOpenDatacenter: document.getElementById('btn-open-datacenter'),

  awayTeamLogo: document.getElementById('away-team-logo'),
  awayTeamFallback: document.getElementById('away-team-fallback'),
  awayRoleTag: document.getElementById('away-role-tag'),
  awayTeamRecord: document.getElementById('away-team-record'),
  awayTeamName: document.getElementById('away-team-name'),
  awayTeamAbbr: document.getElementById('away-team-abbr'),
  awayScoreDigit: document.getElementById('away-score-digit'),

  homeTeamLogo: document.getElementById('home-team-logo'),
  homeTeamFallback: document.getElementById('home-team-fallback'),
  homeRoleTag: document.getElementById('home-role-tag'),
  homeTeamRecord: document.getElementById('home-team-record'),
  homeTeamName: document.getElementById('home-team-name'),
  homeTeamAbbr: document.getElementById('home-team-abbr'),
  homeScoreDigit: document.getElementById('home-score-digit'),

  matchSituationPill: document.getElementById('match-situation-pill'),
  lastPlayBanner: document.getElementById('last-play-banner'),
  gamePeriodBar: document.getElementById('game-period-bar'),
  linescoreWrapper: document.getElementById('linescore-wrapper'),
  momentumAwayLabel: document.getElementById('momentum-away-label'),
  momentumHomeLabel: document.getElementById('momentum-home-label'),
  momentumFillAway: document.getElementById('momentum-fill-away'),
  momentumFillHome: document.getElementById('momentum-fill-home'),

  // Lower Panels
  pbpSubtitleTag: document.getElementById('pbp-subtitle-tag'),
  pbpFilterAll: document.getElementById('pbp-filter-all'),
  pbpFilterScoring: document.getElementById('pbp-filter-scoring'),
  pbpFeedList: document.getElementById('pbp-feed-list'),
  statsSubtitleTag: document.getElementById('stats-subtitle-tag'),
  statTabBoxscore: document.getElementById('stat-tab-boxscore'),
  statTabTeam: document.getElementById('stat-tab-team'),
  statTabLeaders: document.getElementById('stat-tab-leaders'),
  statsContentArea: document.getElementById('stats-content-area'),

  // Interactive Fan Zone
  pollTotalVotes: document.getElementById('poll-total-votes'),
  btnVoteAway: document.getElementById('btn-vote-away'),
  btnVoteDraw: document.getElementById('btn-vote-draw'),
  btnVoteHome: document.getElementById('btn-vote-home'),
  voteAwayName: document.getElementById('vote-away-name'),
  voteHomeName: document.getElementById('vote-home-name'),
  voteAwayPct: document.getElementById('vote-away-pct'),
  voteDrawPct: document.getElementById('vote-draw-pct'),
  voteHomePct: document.getElementById('vote-home-pct'),
  pollBarAway: document.getElementById('poll-bar-away'),
  pollBarHome: document.getElementById('poll-bar-home'),
  toggleDanmaku: document.getElementById('toggle-danmaku'),
  chatMessagesList: document.getElementById('chat-messages-list'),
  chatInputForm: document.getElementById('chat-input-form'),
  chatNicknameInput: document.getElementById('chat-nickname-input'),
  chatTextInput: document.getElementById('chat-text-input'),

  // Telemetry
  telemetryPoolSummary: document.getElementById('telemetry-pool-summary'),
  telemetryLastSync: document.getElementById('telemetry-last-sync'),

  // Deep-Dive Modal
  datacenterModal: document.getElementById('datacenter-modal'),
  modalLeaguePill: document.getElementById('modal-league-pill'),
  modalMatchTitle: document.getElementById('modal-match-title'),
  modalMatchSubtitle: document.getElementById('modal-match-subtitle'),
  modalPeriodBar: document.getElementById('modal-period-bar'),
  datacenterModalBody: document.getElementById('datacenter-modal-body'),
  btnCloseDatacenter: document.getElementById('btn-close-datacenter'),
};

/* ==========================================================================
   1A. ESPN API Data Fetching & Normalization
   ========================================================================== */

async function fetchLeagueScoreboard(leagueCfg) {
  const url = `${ESPN_BASE}/${leagueCfg.sport}/${leagueCfg.leaguePath}/scoreboard`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${leagueCfg.key}`);
  }
  const data = await response.json();
  const events = Array.isArray(data.events) ? data.events : [];
  return events.map((ev) => normalizeEspnEvent(ev, leagueCfg));
}

function normalizeEspnEvent(ev, leagueCfg) {
  const comp = (ev.competitions && ev.competitions[0]) || {};
  const competitors = comp.competitors || [];
  const homeComp = competitors.find((c) => c.homeAway === 'home') || competitors[0] || {};
  const awayComp = competitors.find((c) => c.homeAway === 'away') || competitors[1] || {};

  const statusObj = ev.status || comp.status || {};
  const statusType = statusObj.type || {};
  const matchState = statusType.state || 'pre';

  const formatTeam = (c, fallbackAbbr) => {
    const t = c.team || {};
    const rec = Array.isArray(c.records) && c.records[0] ? c.records[0].summary : '';
    return {
      id: t.id || c.id || fallbackAbbr,
      name: t.shortDisplayName || t.displayName || t.name || fallbackAbbr,
      fullName: t.displayName || t.name || fallbackAbbr,
      abbr: t.abbreviation || fallbackAbbr,
      logo: t.logo || (Array.isArray(t.logos) && t.logos[0] ? t.logos[0].href : ''),
      score: c.score !== undefined ? String(c.score) : '0',
      record: rec,
      linescores: Array.isArray(c.linescores) ? c.linescores : [],
      statistics: Array.isArray(c.statistics) ? c.statistics : [],
      leaders: Array.isArray(c.leaders) ? c.leaders : [],
      winner: Boolean(c.winner),
    };
  };

  const away = formatTeam(awayComp, 'AWY');
  const home = formatTeam(homeComp, 'HOM');

  const venueObj = comp.venue || {};
  const venueParts = [
    venueObj.fullName,
    venueObj.address && (venueObj.address.city || venueObj.address.country),
  ].filter(Boolean);

  const situation = comp.situation || {};
  const lastPlayText =
    (situation.lastPlay && situation.lastPlay.text) ||
    (comp.headlines && comp.headlines[0] && comp.headlines[0].shortLinkText) ||
    statusType.detail ||
    '';

  let awayWinPct = 50;
  let homeWinPct = 50;
  if (situation.lastPlay && situation.lastPlay.probability) {
    const p = situation.lastPlay.probability;
    if (typeof p.awayWinPercentage === 'number' && typeof p.homeWinPercentage === 'number') {
      awayWinPct = Math.round(p.awayWinPercentage * 100);
      homeWinPct = Math.round(p.homeWinPercentage * 100);
    }
  } else if (matchState !== 'pre') {
    const aNum = parseFloat(away.score) || 0;
    const hNum = parseFloat(home.score) || 0;
    const total = aNum + hNum;
    if (total > 0) {
      awayWinPct = Math.min(88, Math.max(12, Math.round((aNum / total) * 100)));
      homeWinPct = 100 - awayWinPct;
    }
  }

  return {
    id: String(ev.id),
    provider: 'espn',
    leagueKey: leagueCfg.key,
    leagueLabel: leagueCfg.label,
    sport: leagueCfg.sport,
    leaguePath: leagueCfg.leaguePath,
    isSoccer: leagueCfg.isSoccer,
    isEsports: false,
    date: ev.date ? new Date(ev.date) : new Date(),
    state: matchState,
    statusDetail: statusType.shortDetail || statusType.detail || statusType.description || '',
    displayClock: statusObj.displayClock || '',
    period: statusObj.period || 0,
    venue: venueParts.join(' · ') || `${leagueCfg.label} 官方轉播場館`,
    away,
    home,
    situation,
    lastPlayText,
    awayWinPct,
    homeWinPct,
    compLeaders: Array.isArray(comp.leaders) ? comp.leaders : [],
  };
}

/* ==========================================================================
   1B. Riot LoL Esports Official Public API (Worlds, MSI, LCK, LPL, LCP, LEC)
   ========================================================================== */

async function fetchLoLEsportsJson(endpointPath) {
  const response = await fetch(`${LOL_API_BASE}/${endpointPath}`, {
    headers: { 'x-api-key': LOL_PUBLIC_API_KEY },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`LoL Esports API HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchAllLoLEsportsMatches() {
  const worldsQuery = LOL_WORLDS_LEAGUE_IDS.map((id) => `leagueId=${id}`).join('&');
  const proQuery = LOL_PRO_LEAGUE_IDS.map((id) => `leagueId=${id}`).join('&');

  const [liveRes, worldsRes, proRes] = await Promise.allSettled([
    fetchLoLEsportsJson('getLive?hl=zh-TW'),
    fetchLoLEsportsJson(`getSchedule?hl=zh-TW&${worldsQuery}`),
    fetchLoLEsportsJson(`getSchedule?hl=zh-TW&${proQuery}`),
  ]);

  const rawEvents = [];

  if (liveRes.status === 'fulfilled') {
    const liveEvents = liveRes.value?.data?.schedule?.events || [];
    rawEvents.push(...liveEvents);
  }
  if (worldsRes.status === 'fulfilled') {
    const wEvents = worldsRes.value?.data?.schedule?.events || [];
    rawEvents.push(...wEvents.slice(-30));
  }
  if (proRes.status === 'fulfilled') {
    const pEvents = proRes.value?.data?.schedule?.events || [];
    rawEvents.push(...pEvents.slice(-45));
  }

  const seenMatchIds = new Set();
  const normalized = [];

  rawEvents.forEach((ev) => {
    if (!ev || !ev.match || !Array.isArray(ev.match.teams) || ev.match.teams.length < 2) return;
    const matchId = String(ev.match.id || ev.id || '');
    if (!matchId || seenMatchIds.has(matchId)) return;

    const tBlue = ev.match.teams[0] || {};
    const tRed = ev.match.teams[1] || {};
    if (tBlue.code === 'TBD' && tRed.code === 'TBD') return;

    seenMatchIds.add(matchId);
    normalized.push(normalizeLoLEvent(ev));
  });

  return normalized;
}

function normalizeLoLEvent(ev) {
  const matchObj = ev.match || {};
  const leagueObj = ev.league || {};
  const leagueSlug = String(leagueObj.slug || '').toLowerCase();
  const leagueId = String(leagueObj.id || '');

  const isWorldsCategory =
    LOL_WORLDS_LEAGUE_IDS.includes(leagueId) ||
    /worlds|msi|first_stand|world/i.test(leagueSlug) ||
    /世界大賽|世界賽|Worlds|MSI|季中/i.test(leagueObj.name || '');

  const leagueKey = isWorldsCategory ? 'lol-worlds' : 'lol-pro';
  const leagueDisplayName = isWorldsCategory
    ? `🏆 ${leagueObj.name || 'LOL 世界大賽 Worlds'}`
    : `🎮 ${leagueObj.name || 'LOL 職業聯賽'}`;

  const rawState = ev.state || 'unstarted';
  const matchState =
    rawState === 'inProgress' ? 'in' : rawState === 'completed' ? 'post' : 'pre';

  const strategyCount = (matchObj.strategy && matchObj.strategy.count) || 3;
  const boLabel = `BO${strategyCount}`;
  const blockName = ev.blockName ? `${ev.blockName} · ${boLabel}` : boLabel;

  const formatLoLTeam = (t, fallbackCode) => {
    const wins = t.result && typeof t.result.gameWins === 'number' ? t.result.gameWins : 0;
    const rec =
      t.record && typeof t.record.wins === 'number'
        ? `${t.record.wins}W-${t.record.losses}L`
        : '';
    return {
      id: String(t.id || t.code || fallbackCode),
      name: t.code || t.name || fallbackCode,
      fullName: t.name || t.code || fallbackCode,
      abbr: t.code || fallbackCode,
      logo: t.image || '',
      score: String(wins),
      record: rec,
      linescores: [],
      statistics: [],
      leaders: [],
      winner: Boolean(t.result && t.result.outcome === 'win'),
    };
  };

  const blueTeam = formatLoLTeam(matchObj.teams[0] || {}, 'BLU');
  const redTeam = formatLoLTeam(matchObj.teams[1] || {}, 'RED');

  const bWins = parseInt(blueTeam.score, 10) || 0;
  const rWins = parseInt(redTeam.score, 10) || 0;
  const totalGames = bWins + rWins;

  const mapCount = Math.max(totalGames, matchState === 'in' ? totalGames + 1 : 0);
  for (let i = 0; i < mapCount; i++) {
    if (i < bWins) {
      blueTeam.linescores.push({ displayValue: 'W' });
      redTeam.linescores.push({ displayValue: 'L' });
    } else if (i < bWins + rWins) {
      blueTeam.linescores.push({ displayValue: 'L' });
      redTeam.linescores.push({ displayValue: 'W' });
    } else {
      blueTeam.linescores.push({ displayValue: 'LIVE' });
      redTeam.linescores.push({ displayValue: 'LIVE' });
    }
  }

  let awayWinPct = 50;
  let homeWinPct = 50;
  if (totalGames > 0) {
    awayWinPct = Math.min(90, Math.max(10, Math.round(((bWins + 0.5) / (totalGames + 1)) * 100)));
    homeWinPct = 100 - awayWinPct;
  }

  const statusDetail =
    matchState === 'in'
      ? `LIVE · ${blockName}`
      : matchState === 'post'
      ? `終場 · ${boLabel}`
      : blockName;

  return {
    id: String(matchObj.id || ev.id),
    provider: 'lolesports',
    leagueKey,
    leagueLabel: leagueDisplayName,
    sport: 'esports',
    leaguePath: leagueSlug || 'lol',
    isSoccer: false,
    isEsports: true,
    boCount: strategyCount,
    blockName,
    date: ev.startTime ? new Date(ev.startTime) : new Date(),
    state: matchState,
    statusDetail,
    displayClock: blockName,
    period: totalGames + 1,
    venue: `${leagueObj.name || 'LoL Esports'} · 召喚師峽谷官方轉播台 (${blockName})`,
    away: blueTeam,
    home: redTeam,
    situation: { boLabel, blockName },
    lastPlayText:
      matchState === 'in'
        ? `正在進行 ${leagueDisplayName} (${blockName}) 峽谷對決！點擊下方各局可查看單局英雄與詳細戰報。`
        : `${leagueDisplayName} · ${blockName} 系列賽 (${blueTeam.fullName} vs ${redTeam.fullName}) — 點擊下方各局進入該局數據`,
    awayWinPct,
    homeWinPct,
    compLeaders: [],
  };
}

/* ==========================================================================
   1C. Global Aggregation & 24/7 Priority Queue Sorting
   ========================================================================== */

function sortMatchesFor24HCarousel(matches) {
  const now = Date.now();
  const stateRank = { in: 0, pre: 1, post: 2 };

  return [...matches].sort((a, b) => {
    const rankA = stateRank[a.state] !== undefined ? stateRank[a.state] : 3;
    const rankB = stateRank[b.state] !== undefined ? stateRank[b.state] : 3;
    if (rankA !== rankB) return rankA - rankB;

    if (a.state === 'in') {
      return a.id.localeCompare(b.id);
    }
    if (a.state === 'pre') {
      return Math.abs(a.date.getTime() - now) - Math.abs(b.date.getTime() - now);
    }
    return Math.abs(now - a.date.getTime()) - Math.abs(now - b.date.getTime());
  });
}

async function syncAllScoreboards(preserveSelection = true) {
  updateApiStatus('syncing', '正在同步 ESPN 與 LoL Esports 全球賽事...');

  const tasks = [
    ...ESPN_LEAGUES.map((cfg) => fetchLeagueScoreboard(cfg)),
    fetchAllLoLEsportsMatches(),
  ];

  const results = await Promise.allSettled(tasks);
  const gathered = [];
  let fulfilledCount = 0;

  results.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      fulfilledCount += 1;
      gathered.push(...res.value);
    }
  });

  if (fulfilledCount === 0) {
    updateApiStatus('error', '全球賽事 API 連線受阻，請檢查網路狀態');
    return;
  }

  state.allMatches = sortMatchesFor24HCarousel(gathered);
  updateLeagueCounts();
  applyLeagueFilter(preserveSelection);

  const liveTotal = state.allMatches.filter((m) => m.state === 'in').length;
  const lolTotal = state.allMatches.filter((m) => m.isEsports).length;
  const nowStr = new Date().toLocaleTimeString('zh-TW', { hour12: false });
  updateApiStatus(
    'online',
    `API 直連正常 · ${liveTotal} 場 LIVE / 含 ${lolTotal} 場電競 / 共 ${state.allMatches.length} 場`
  );
  els.telemetryPoolSummary.textContent = `${liveTotal} 場 LIVE · ${lolTotal} 場 LOL 電競 / 共 ${state.allMatches.length} 場`;
  els.telemetryLastSync.textContent = nowStr;
}

function updateApiStatus(mode, text) {
  els.apiStatusText.textContent = text;
  els.apiStatusDot.className = 'status-dot';
  if (mode === 'online') els.apiStatusDot.classList.add('online');
  if (mode === 'error') els.apiStatusDot.classList.add('error');
}

function updateLeagueCounts() {
  const counts = {
    ALL: state.allMatches.length,
    LIVE: state.allMatches.filter((m) => m.state === 'in').length,
    'lol-worlds': state.allMatches.filter((m) => m.leagueKey === 'lol-worlds').length,
    'lol-pro': state.allMatches.filter((m) => m.leagueKey === 'lol-pro').length,
  };
  ESPN_LEAGUES.forEach((l) => {
    counts[l.key] = state.allMatches.filter((m) => m.leagueKey === l.key).length;
  });

  Object.entries(counts).forEach(([key, val]) => {
    const badge = document.getElementById(`count-${key}`);
    if (badge) badge.textContent = String(val);
  });
}

function applyLeagueFilter(preserveSelection = true) {
  const prevMatchId = state.currentMatchId;

  if (state.activeLeagueFilter === 'ALL') {
    state.filteredMatches = [...state.allMatches];
  } else if (state.activeLeagueFilter === 'LIVE') {
    const liveOnly = state.allMatches.filter((m) => m.state === 'in');
    state.filteredMatches = liveOnly.length > 0 ? liveOnly : [...state.allMatches];
  } else {
    state.filteredMatches = state.allMatches.filter(
      (m) => m.leagueKey === state.activeLeagueFilter
    );
  }

  if (state.filteredMatches.length === 0) {
    renderEmptyMatchState();
    return;
  }

  if (preserveSelection && prevMatchId) {
    const idx = state.filteredMatches.findIndex((m) => m.id === prevMatchId);
    state.currentMatchIndex = idx >= 0 ? idx : 0;
  } else {
    state.currentMatchIndex = 0;
    state.selectedPeriod = 'ALL';
  }

  const activeMatch = state.filteredMatches[state.currentMatchIndex];
  if (state.currentMatchId !== activeMatch.id) {
    state.selectedPeriod = 'ALL';
  }
  state.currentMatchId = activeMatch.id;

  renderTickerStrip();
  renderCurrentMatchJumbotron(activeMatch);
  fetchAndRenderMatchSummary(activeMatch);
}

/* ==========================================================================
   2. Render Ticker Strip & Main Jumbotron Scoreboard
   ========================================================================== */

function renderTickerStrip() {
  if (state.filteredMatches.length === 0) {
    els.tickerStrip.innerHTML =
      '<div class="ticker-skeleton">此聯賽分類目前無排程賽事，請切換至「全球輪播」查看其他跨時區賽事。</div>';
    return;
  }

  els.tickerStrip.innerHTML = state.filteredMatches
    .map((m, idx) => {
      const isSelected = m.id === state.currentMatchId;
      const stateClass = `state-${m.state}`;
      const badgeLabel =
        m.state === 'in'
          ? `● LIVE ${escapeHtml(m.statusDetail)}`
          : escapeHtml(m.statusDetail || formatMatchTime(m.date));

      return `
        <article class="ticker-card ${isSelected ? 'selected' : ''}" data-match-idx="${idx}" id="ticker-card-${m.id}" title="點擊切換至此場比賽並查看完整數據">
          <div class="ticker-card-top">
            <span class="ticker-league-tag">${escapeHtml(m.leagueLabel)}</span>
            <span class="ticker-status ${stateClass}">${badgeLabel}</span>
          </div>
          <div class="ticker-teams">
            <div class="ticker-team-row">
              <div class="ticker-team-info">
                ${
                  m.away.logo
                    ? `<img src="${escapeAttr(m.away.logo)}" alt="" class="ticker-team-logo" loading="lazy" />`
                    : ''
                }
                <span class="ticker-team-name">${escapeHtml(m.away.name)}</span>
              </div>
              <span class="ticker-team-score">${m.state === 'pre' ? '-' : escapeHtml(m.away.score)}</span>
            </div>
            <div class="ticker-team-row">
              <div class="ticker-team-info">
                ${
                  m.home.logo
                    ? `<img src="${escapeAttr(m.home.logo)}" alt="" class="ticker-team-logo" loading="lazy" />`
                    : ''
                }
                <span class="ticker-team-name">${escapeHtml(m.home.name)}</span>
              </div>
              <span class="ticker-team-score">${m.state === 'pre' ? '-' : escapeHtml(m.home.score)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  els.tickerStrip.querySelectorAll('.ticker-card').forEach((card) => {
    card.addEventListener('click', () => {
      const idx = Number(card.getAttribute('data-match-idx'));
      const wasSelected = state.currentMatchIndex === idx;
      // Pause auto-rotation when user explicitly clicks a match to inspect its data
      if (state.autoRotate) {
        state.autoRotate = false;
        els.btnToggleRotate.classList.remove('active');
        els.rotateIcon.innerHTML = '&#9654;';
        updateRotationProgressUI();
      }
      selectMatchByIndex(idx, true);
      if (wasSelected) {
        openDataCenterModal();
      }
    });
  });
}

function selectMatchByIndex(idx, resetTimer = true) {
  if (state.filteredMatches.length === 0) return;
  const normalizedIdx =
    ((idx % state.filteredMatches.length) + state.filteredMatches.length) %
    state.filteredMatches.length;
  const match = state.filteredMatches[normalizedIdx];
  if (state.currentMatchId !== match.id) {
    state.selectedPeriod = 'ALL';
    state.currentSummary = null;
  }
  state.currentMatchIndex = normalizedIdx;
  state.currentMatchId = match.id;

  if (resetTimer) {
    state.rotateElapsedMs = 0;
    updateRotationProgressUI();
  }

  renderTickerStrip();
  const activeCard = document.getElementById(`ticker-card-${match.id}`);
  if (activeCard && activeCard.scrollIntoView) {
    activeCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  renderCurrentMatchJumbotron(match);
  fetchAndRenderMatchSummary(match);
}

function renderCurrentMatchJumbotron(match) {
  els.currentLeaguePill.textContent = match.leagueLabel;
  els.currentVenueText.textContent = match.venue;

  els.currentStateBadge.className = `match-state-badge state-${match.state}`;
  if (match.state === 'in') {
    els.currentStateBadge.textContent = 'LIVE 進行中';
    els.currentClockText.textContent = match.statusDetail || match.displayClock || '進行中';
  } else if (match.state === 'pre') {
    els.currentStateBadge.textContent = 'UPCOMING 即將開賽';
    els.currentClockText.textContent = formatMatchTime(match.date);
  } else {
    els.currentStateBadge.textContent = 'FINAL 已完賽';
    els.currentClockText.textContent = match.statusDetail || '終場';
  }

  setTeamLogo(els.awayTeamLogo, els.awayTeamFallback, match.away.logo, match.away.abbr);
  setTeamLogo(els.homeTeamLogo, els.homeTeamFallback, match.home.logo, match.home.abbr);

  if (match.isEsports) {
    els.awayRoleTag.textContent = '藍方 BLUE SIDE';
    els.homeRoleTag.textContent = '紅方 RED SIDE';
  } else {
    els.awayRoleTag.textContent = '客隊 AWAY';
    els.homeRoleTag.textContent = '主隊 HOME';
  }

  els.awayTeamRecord.textContent = match.away.record ? `(${match.away.record})` : '';
  els.homeTeamRecord.textContent = match.home.record ? `(${match.home.record})` : '';
  els.awayTeamName.textContent = match.away.fullName;
  els.homeTeamName.textContent = match.home.fullName;
  els.awayTeamAbbr.textContent = match.away.abbr;
  els.homeTeamAbbr.textContent = match.home.abbr;

  const prev = state.previousScores.get(match.id);
  const displayAwayScore = match.state === 'pre' ? '-' : match.away.score;
  const displayHomeScore = match.state === 'pre' ? '-' : match.home.score;

  els.awayScoreDigit.textContent = displayAwayScore;
  els.homeScoreDigit.textContent = displayHomeScore;

  if (prev && match.state === 'in') {
    if (prev.away !== displayAwayScore) {
      triggerScoreFlash(els.awayScoreDigit);
      spawnDanmaku(`🎉 ${match.away.name} 拿下勝局/得分！比數 ${displayAwayScore} : ${displayHomeScore}`);
    }
    if (prev.home !== displayHomeScore) {
      triggerScoreFlash(els.homeScoreDigit);
      spawnDanmaku(`🎉 ${match.home.name} 拿下勝局/得分！比數 ${displayAwayScore} : ${displayHomeScore}`);
    }
  }
  state.previousScores.set(match.id, { away: displayAwayScore, home: displayHomeScore });

  els.matchSituationPill.textContent = formatSituationText(match);
  els.lastPlayBanner.textContent =
    match.lastPlayText ||
    (match.state === 'pre'
      ? `開賽時間：${formatFullDateTime(match.date)}`
      : '點擊下方局數或文字動態可查看單局/單節深度數據');

  renderPeriodSelectorBar(match);
  renderLinescoreTable(match);
  updateMomentumUI(match.away.abbr, match.home.abbr, match.awayWinPct, match.homeWinPct);

  renderPollForMatch(match);
  ensureChatInitializedForMatch(match);
  renderChatMessages(match.id);
}

function setTeamLogo(imgEl, fallbackEl, url, abbr) {
  if (url) {
    imgEl.src = url;
    imgEl.alt = abbr;
    imgEl.hidden = false;
    fallbackEl.hidden = true;
    imgEl.onerror = () => {
      imgEl.hidden = true;
      fallbackEl.hidden = false;
      fallbackEl.textContent = abbr;
    };
  } else {
    imgEl.hidden = true;
    fallbackEl.hidden = false;
    fallbackEl.textContent = abbr;
  }
}

function triggerScoreFlash(el) {
  el.classList.remove('score-flash');
  void el.offsetWidth;
  el.classList.add('score-flash');
  setTimeout(() => el.classList.remove('score-flash'), 1200);
}

function formatSituationText(match) {
  const s = match.situation || {};
  if (match.isEsports) {
    const selLabel =
      state.selectedPeriod === 'ALL' ? '系列賽總覽' : `目前檢視：Game ${state.selectedPeriod}`;
    return `${match.leagueLabel} · ${match.blockName || 'BO3/BO5'} (${selLabel})`;
  }
  if (match.state === 'pre') {
    return `表定開賽：${formatFullDateTime(match.date)}`;
  }
  if (match.leagueKey === 'mlb' && match.state === 'in') {
    const outs = typeof s.outs === 'number' ? `${s.outs} 出局` : '';
    const bases = [
      s.onFirst ? '一壘' : null,
      s.onSecond ? '二壘' : null,
      s.onThird ? '三壘' : null,
    ]
      .filter(Boolean)
      .join('、');
    const baseText = bases ? `${bases}有人` : '壘上無人';
    return [match.statusDetail, outs, baseText].filter(Boolean).join(' · ');
  }
  if (match.leagueKey === 'nfl' && s.downDistanceText) {
    return `${match.statusDetail} · ${s.downDistanceText}`;
  }
  return `${match.leagueLabel} · ${match.statusDetail || (match.state === 'post' ? '終場完賽' : '即時賽況')}`;
}

/* ==========================================================================
   2B. Interactive Game / Period / Inning Selector & Linescore Table
   ========================================================================== */

function getAvailablePeriodsForMatch(match) {
  const items = [{ key: 'ALL', label: match.isEsports ? '全系列賽總覽' : '全場數據總覽' }];

  if (match.isEsports) {
    const cached = state.lolGamesCache.get(match.id);
    const games = (cached && cached.games) || [];
    const count = Math.max(games.length, match.boCount || 3);
    for (let i = 1; i <= count; i++) {
      const gObj = games.find((g) => Number(g.number) === i);
      if (gObj && gObj.state === 'unneeded') continue;
      const stateTag =
        gObj && gObj.state === 'inProgress'
          ? ' (LIVE)'
          : gObj && gObj.state === 'completed'
          ? ' (完賽)'
          : '';
      items.push({ key: String(i), label: `Game ${i}${stateTag}` });
    }
    return items;
  }

  const maxLines = Math.max(
    (match.away.linescores || []).length,
    (match.home.linescores || []).length,
    match.period || 0
  );

  if (match.isSoccer) {
    items.push({ key: '1', label: '上半場 (1st Half)' });
    items.push({ key: '2', label: '下半場 (2nd Half)' });
  } else if (match.leagueKey === 'mlb') {
    const innings = Math.max(maxLines, 9);
    for (let i = 1; i <= innings; i++) {
      items.push({ key: String(i), label: `第 ${i} 局` });
    }
  } else if (match.leagueKey === 'nhl') {
    const periods = Math.max(maxLines, 3);
    for (let i = 1; i <= periods; i++) {
      items.push({ key: String(i), label: i > 3 ? `OT${i - 3}` : `第 ${i} 節` });
    }
  } else {
    const quarters = Math.max(maxLines, 4);
    for (let i = 1; i <= quarters; i++) {
      items.push({ key: String(i), label: i > 4 ? `OT${i - 4}` : `第 ${i} 節` });
    }
  }

  return items;
}

function renderPeriodSelectorBar(match) {
  const periods = getAvailablePeriodsForMatch(match);
  const html = `
    <span class="period-bar-label">${match.isEsports ? '切換單局數據：' : '點擊節數/局數篩選數據：'}</span>
    ${periods
      .map(
        (p) => `
      <button type="button" class="period-chip ${String(state.selectedPeriod) === String(p.key) ? 'active' : ''}" data-period-key="${escapeAttr(p.key)}">
        ${escapeHtml(p.label)}
      </button>
    `
      )
      .join('')}
  `;

  els.gamePeriodBar.innerHTML = html;
  els.gamePeriodBar.querySelectorAll('.period-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pKey = btn.getAttribute('data-period-key') || 'ALL';
      selectPeriodOrGame(pKey, false);
    });
  });

  if (els.modalPeriodBar) {
    els.modalPeriodBar.innerHTML = html;
    els.modalPeriodBar.querySelectorAll('.period-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pKey = btn.getAttribute('data-period-key') || 'ALL';
        selectPeriodOrGame(pKey, true);
      });
    });
  }
}

async function selectPeriodOrGame(periodKey, fromModal = false) {
  state.selectedPeriod = String(periodKey);
  const match = state.filteredMatches[state.currentMatchIndex];
  if (!match) return;

  // Pause carousel so user can inspect the selected game/period freely
  if (state.autoRotate) {
    state.autoRotate = false;
    els.btnToggleRotate.classList.remove('active');
    els.rotateIcon.innerHTML = '&#9654;';
    updateRotationProgressUI();
  }

  els.matchSituationPill.textContent = formatSituationText(match);
  renderPeriodSelectorBar(match);
  renderLinescoreTable(match);

  if (match.provider === 'lolesports') {
    await fetchAndRenderLoLSummary(match);
  } else {
    renderPlayByPlay(match, state.currentSummary);
    renderTechnicalStats(match, state.currentSummary);
  }

  if (state.modalOpen || fromModal) {
    renderDataCenterModalContent(match);
  }
}

function renderLinescoreTable(match) {
  const awayLines = match.away.linescores || [];
  const homeLines = match.home.linescores || [];
  const maxCols = Math.max(awayLines.length, homeLines.length);

  if (maxCols === 0) {
    els.linescoreWrapper.innerHTML = `
      <table class="linescore-table">
        <thead>
          <tr>
            <th class="team-col">隊伍</th>
            <th>賽制 / 狀態</th>
            <th>總比分</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="team-col">${escapeHtml(match.away.abbr)}</td>
            <td>${escapeHtml(match.statusDetail || '-')}</td>
            <td class="total-col">${match.state === 'pre' ? '-' : escapeHtml(match.away.score)}</td>
          </tr>
          <tr>
            <td class="team-col">${escapeHtml(match.home.abbr)}</td>
            <td>${escapeHtml(match.statusDetail || '-')}</td>
            <td class="total-col">${match.state === 'pre' ? '-' : escapeHtml(match.home.score)}</td>
          </tr>
        </tbody>
      </table>
    `;
    return;
  }

  const headers = [];
  for (let i = 0; i < maxCols; i++) {
    const pNum = String(i + 1);
    const activeCls = String(state.selectedPeriod) === pNum ? 'active-col' : '';
    const label = match.isEsports ? `G${i + 1}` : match.isSoccer ? `H${i + 1}` : `${i + 1}`;
    headers.push(
      `<th class="clickable-col ${activeCls}" data-col-period="${pNum}" title="點擊查看 ${label} 數據">${label}</th>`
    );
  }

  const renderCells = (lines) => {
    const cells = [];
    for (let i = 0; i < maxCols; i++) {
      const pNum = String(i + 1);
      const activeCls = String(state.selectedPeriod) === pNum ? 'active-col' : '';
      const val =
        lines[i] && (lines[i].displayValue !== undefined ? lines[i].displayValue : lines[i].value);
      cells.push(
        `<td class="clickable-col ${activeCls}" data-col-period="${pNum}">${
          val !== undefined ? escapeHtml(String(val)) : '-'
        }</td>`
      );
    }
    return cells.join('');
  };

  els.linescoreWrapper.innerHTML = `
    <table class="linescore-table">
      <thead>
        <tr>
          <th class="team-col">隊伍</th>
          ${headers.join('')}
          <th>${match.isEsports ? '勝場' : '總計'}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="team-col">${escapeHtml(match.away.abbr)}</td>
          ${renderCells(awayLines)}
          <td class="total-col">${escapeHtml(match.away.score)}</td>
        </tr>
        <tr>
          <td class="team-col">${escapeHtml(match.home.abbr)}</td>
          ${renderCells(homeLines)}
          <td class="total-col">${escapeHtml(match.home.score)}</td>
        </tr>
      </tbody>
    </table>
  `;

  els.linescoreWrapper.querySelectorAll('[data-col-period]').forEach((cell) => {
    cell.addEventListener('click', () => {
      const pNum = cell.getAttribute('data-col-period');
      if (!pNum) return;
      const nextPeriod = String(state.selectedPeriod) === pNum ? 'ALL' : pNum;
      selectPeriodOrGame(nextPeriod, false);
    });
  });
}

function updateMomentumUI(awayAbbr, homeAbbr, awayPct, homePct) {
  els.momentumAwayLabel.textContent = `${awayAbbr} ${awayPct}%`;
  els.momentumHomeLabel.textContent = `${homeAbbr} ${homePct}%`;
  els.momentumFillAway.style.width = `${awayPct}%`;
  els.momentumFillHome.style.width = `${homePct}%`;
}

function renderEmptyMatchState() {
  els.awayTeamName.textContent = '暫無符合篩選賽事';
  els.homeTeamName.textContent = '請切換聯賽分頁';
  els.awayScoreDigit.textContent = '-';
  els.homeScoreDigit.textContent = '-';
  els.pbpFeedList.innerHTML = '<div class="empty-state">目前分類無進行中賽事。</div>';
  els.statsContentArea.innerHTML = '<div class="empty-state">目前分類無統計資料。</div>';
}

/* ==========================================================================
   3. Detailed Summary Dispatcher (ESPN Summary API vs Riot LoL LiveStats API)
   ========================================================================== */

async function fetchAndRenderMatchSummary(match) {
  if (!match) return;
  if (match.provider === 'lolesports') {
    await fetchAndRenderLoLSummary(match);
    return;
  }

  const targetMatchId = match.id;
  const summaryUrl = `${ESPN_BASE}/${match.sport}/${match.leaguePath}/summary?event=${match.id}`;

  try {
    const res = await fetch(summaryUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Summary HTTP ${res.status}`);
    const summaryData = await res.json();

    if (state.currentMatchId !== targetMatchId) return;
    state.currentSummary = summaryData;

    if (Array.isArray(summaryData.winprobability) && summaryData.winprobability.length > 0) {
      const latestWp = summaryData.winprobability[summaryData.winprobability.length - 1];
      if (typeof latestWp.homeWinPercentage === 'number') {
        const homePct = Math.round(latestWp.homeWinPercentage * 100);
        const awayPct = Math.max(0, 100 - homePct);
        updateMomentumUI(match.away.abbr, match.home.abbr, awayPct, homePct);
      }
    }

    renderPeriodSelectorBar(match);
    renderPlayByPlay(match, summaryData);
    renderTechnicalStats(match, summaryData);
    if (state.modalOpen) renderDataCenterModalContent(match);
  } catch (err) {
    if (state.currentMatchId !== targetMatchId) return;
    renderPlayByPlay(match, null);
    renderTechnicalStats(match, null);
  }
}

/* ==========================================================================
   3B. Riot LoL Esports EventDetails & Completed/Live Game Window Probing
   ========================================================================== */

function alignTimestampTo10SecISO(ms) {
  const aligned = Math.floor(ms / 10000) * 10000;
  return new Date(aligned).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function fetchLoLWindowForGame(match, gameObj) {
  if (!gameObj || !gameObj.id || gameObj.state === 'unstarted' || gameObj.state === 'unneeded') {
    return null;
  }

  let initialWindow = null;
  let exactGameStartMs = null;

  // 1. Fetch initial window without startingTime:
  //    - For inProgress games, this returns the live window directly.
  //    - For completed games, this returns the 00:00 game-start frame whose `rfc460Timestamp`
  //      gives the exact second the game started!
  try {
    const directRes = await fetch(`${LOL_LIVESTATS_BASE}/window/${gameObj.id}`, {
      cache: 'no-store',
    });
    if (directRes.ok && directRes.status === 200) {
      const directData = await directRes.json();
      if (directData && Array.isArray(directData.frames) && directData.frames.length > 0) {
        initialWindow = directData;
        const firstTs = directData.frames[0]?.rfc460Timestamp;
        if (firstTs) {
          const parsed = new Date(firstTs).getTime();
          if (!isNaN(parsed)) exactGameStartMs = parsed;
        }
        const lastFrame = directData.frames[directData.frames.length - 1];
        const totalGold =
          Number(lastFrame?.blueTeam?.totalGold || 0) + Number(lastFrame?.redTeam?.totalGold || 0);
        // If this is a live game with active gold/stats already populated, return immediately
        if (gameObj.state === 'inProgress' && totalGold > 5500) {
          return directData;
        }
      }
    }
  } catch (_) {}

  // 2. Query timeline slices (+10m, +18m, +26m, +34m, +44m, +75m) from exactGameStartMs
  //    +75m guarantees Riot livestats clamps to the `finished` end-of-game scoreboard,
  //    while earlier slices populate the full mid-game Play-by-Play combat timeline.
  const gIndex = Math.max(0, (Number(gameObj.number) || 1) - 1);
  const fallbackBaseMs =
    (match.date instanceof Date && !isNaN(match.date.getTime())
      ? match.date.getTime()
      : Date.now() - 7200000) +
    gIndex * 54 * 60000;

  const baseMs = exactGameStartMs || fallbackBaseMs;
  const sliceMinutes = [10, 18, 26, 34, 44, 75];

  const probePromises = sliceMinutes.map(async (minOffset) => {
    const iso = alignTimestampTo10SecISO(baseMs + minOffset * 60000);
    const url = `${LOL_LIVESTATS_BASE}/window/${gameObj.id}?startingTime=${encodeURIComponent(iso)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok || res.status === 204) return null;
    const data = await res.json();
    if (data && Array.isArray(data.frames) && data.frames.length > 0) {
      return data;
    }
    return null;
  });

  const probeResults = await Promise.allSettled(probePromises);
  const validWindows = [];
  probeResults.forEach((r) => {
    if (r.status === 'fulfilled' && r.value) {
      validWindows.push(r.value);
    }
  });

  if (validWindows.length === 0) {
    return initialWindow;
  }

  // Merge frames chronologically across slices and ensure the highest-gold end-of-game frame is last
  const frameByTs = new Map();
  let bestMeta = initialWindow?.gameMetadata || null;
  let maxGoldFrame = null;
  let maxGoldVal = -1;

  validWindows.forEach((w) => {
    if (w.gameMetadata) bestMeta = w.gameMetadata;
    (w.frames || []).forEach((f) => {
      const ts = f.rfc460Timestamp || JSON.stringify(f);
      const gold =
        Number(f?.blueTeam?.totalGold || 0) + Number(f?.redTeam?.totalGold || 0);
      if (gold > maxGoldVal) {
        maxGoldVal = gold;
        maxGoldFrame = f;
      }
      if (!frameByTs.has(ts)) {
        frameByTs.set(ts, f);
      }
    });
  });

  const mergedFrames = Array.from(frameByTs.values()).sort((a, b) =>
    String(a.rfc460Timestamp || '').localeCompare(String(b.rfc460Timestamp || ''))
  );

  if (maxGoldFrame && mergedFrames[mergedFrames.length - 1] !== maxGoldFrame) {
    mergedFrames.push(maxGoldFrame);
  }

  return {
    gameMetadata: bestMeta,
    frames: mergedFrames,
  };
}

async function fetchAndRenderLoLSummary(match) {
  const targetMatchId = match.id;
  try {
    let cached = state.lolGamesCache.get(match.id);
    if (!cached) {
      const detailsData = await fetchLoLEsportsJson(`getEventDetails?hl=zh-TW&id=${match.id}`);
      const eventDetail = detailsData?.data?.event || {};
      const games = eventDetail?.match?.games || [];
      cached = {
        eventDetail,
        games,
        windowByGameNum: new Map(),
      };
      state.lolGamesCache.set(match.id, cached);
    }

    if (state.currentMatchId !== targetMatchId) return;

    const { eventDetail, games, windowByGameNum } = cached;

    // Determine which game to inspect: user-selected game, or inProgress game, or latest completed game
    let targetGame = null;
    if (state.selectedPeriod !== 'ALL') {
      const wantedNum = Number(state.selectedPeriod);
      targetGame = games.find((g) => Number(g.number) === wantedNum && g.state !== 'unneeded') || null;
    }
    if (!targetGame) {
      targetGame =
        games.find((g) => g.state === 'inProgress') ||
        [...games].reverse().find((g) => g.state === 'completed') ||
        games[0];
    }

    let windowData = null;
    if (targetGame && targetGame.number) {
      if (windowByGameNum.has(targetGame.number) && targetGame.state === 'completed') {
        windowData = windowByGameNum.get(targetGame.number);
      } else {
        windowData = await fetchLoLWindowForGame(match, targetGame);
        if (windowData) {
          windowByGameNum.set(targetGame.number, windowData);
        }
      }
    }

    if (state.currentMatchId !== targetMatchId) return;

    const synthesizedSummary = buildLoLSummaryFromRiotData(
      match,
      eventDetail,
      games,
      targetGame,
      windowData
    );
    state.currentSummary = synthesizedSummary;

    if (synthesizedSummary.awayGoldPct && synthesizedSummary.homeGoldPct) {
      updateMomentumUI(
        match.away.abbr,
        match.home.abbr,
        synthesizedSummary.awayGoldPct,
        synthesizedSummary.homeGoldPct
      );
    }

    renderPeriodSelectorBar(match);
    renderPlayByPlay(match, synthesizedSummary);
    renderTechnicalStats(match, synthesizedSummary);
    if (state.modalOpen) renderDataCenterModalContent(match);
  } catch (err) {
    if (state.currentMatchId !== targetMatchId) return;
    renderPlayByPlay(match, null);
    renderTechnicalStats(match, null);
  }
}

function buildLoLSummaryFromRiotData(match, eventDetail, games, activeGame, windowData) {
  const plays = [];
  const awayStats = [];
  const homeStats = [];
  const leaders = [];
  const boxscorePlayers = [];
  let awayGoldPct = match.awayWinPct;
  let homeGoldPct = match.homeWinPct;

  const activeGameNum = activeGame ? Number(activeGame.number) : 1;

  // 1. Add interactive series game cards (excluding unneeded games in finished series)
  const validGames = Array.isArray(games)
    ? games.filter((g) => g.state !== 'unneeded')
    : [];

  if (validGames.length > 0) {
    validGames.forEach((g) => {
      const gNum = Number(g.number) || 1;
      const gState =
        g.state === 'inProgress'
          ? '進行中 LIVE'
          : g.state === 'completed'
          ? '已完賽'
          : '未開始';

      let sideInfo = '';
      if (Array.isArray(g.teams) && g.teams.length >= 2) {
        const bTeamObj = g.teams.find((t) => t.side === 'blue');
        const bName =
          String(bTeamObj?.id) === String(match.away.id)
            ? match.away.abbr
            : String(bTeamObj?.id) === String(match.home.id)
            ? match.home.abbr
            : match.away.abbr;
        const rName = bName === match.away.abbr ? match.home.abbr : match.away.abbr;
        sideInfo = `（藍方 ${bName} vs 紅方 ${rName}）`;
      }

      plays.push({
        id: `game-${g.id || gNum}`,
        gameNumber: gNum,
        isGameSelectorCard: true,
        clock: { displayValue: `Game ${gNum}` },
        period: { number: gNum, displayValue: match.blockName || 'BO5' },
        type: { text: `第 ${gNum} 局 (${gState})` },
        text: `${match.away.fullName} vs ${match.home.fullName} — 第 ${gNum} 局峽谷對決 ${sideInfo}`,
        actionHint:
          g.state === 'unstarted'
            ? '此局尚未開始'
            : activeGameNum === gNum
            ? `✨ 目前顯示第 ${gNum} 局數據（點擊開啟完整數據中心）`
            : `👉 點擊切換查看第 ${gNum} 局十人英雄 KDA 與詳細戰況`,
        scoringPlay: g.state === 'inProgress' || activeGameNum === gNum,
        awayScore: match.away.score,
        homeScore: match.home.score,
      });
    });
  }

  // 2. Parse Riot LiveStats Window frames (Gold, Kills, Towers, Barons, Dragons, Players)
  if (windowData && Array.isArray(windowData.frames) && windowData.frames.length > 0) {
    const frames = windowData.frames;
    const latestFrame = frames[frames.length - 1];
    const blue = latestFrame.blueTeam || {};
    const red = latestFrame.redTeam || {};
    const meta = windowData.gameMetadata || {};
    const gNumLabel = activeGame ? `Game ${activeGame.number}` : 'LIVE';

    // Determine whether Blue Side in this specific game is match.away or match.home
    const blueIdFromGame = activeGame?.teams?.find((t) => t.side === 'blue')?.id;
    const blueIdFromMeta = meta?.blueTeamMetadata?.esportsTeamId;
    const firstBlueSummoner =
      meta?.blueTeamMetadata?.participantMetadata?.[0]?.summonerName || '';

    const blueIsHome =
      (blueIdFromGame && String(blueIdFromGame) === String(match.home.id)) ||
      (blueIdFromMeta && String(blueIdFromMeta) === String(match.home.id)) ||
      (firstBlueSummoner &&
        firstBlueSummoner.toUpperCase().startsWith(match.home.abbr.toUpperCase() + ' '));

    const blueTeamInfo = blueIsHome ? match.home : match.away;
    const redTeamInfo = blueIsHome ? match.away : match.home;

    const awaySide = blueIsHome ? red : blue;
    const homeSide = blueIsHome ? blue : red;

    const awayGold = Number(awaySide.totalGold || 0);
    const homeGold = Number(homeSide.totalGold || 0);
    if (awayGold + homeGold > 0) {
      awayGoldPct = Math.min(88, Math.max(12, Math.round((awayGold / (awayGold + homeGold)) * 100)));
      homeGoldPct = 100 - awayGoldPct;
    }

    const pushStatPair = (label, aVal, hVal) => {
      awayStats.push({ name: label, label, displayValue: String(aVal) });
      homeStats.push({ name: label, label, displayValue: String(hVal) });
    };

    pushStatPair(`${gNumLabel} 總擊殺 (Kills)`, awaySide.totalKills ?? 0, homeSide.totalKills ?? 0);
    pushStatPair(
      `${gNumLabel} 團隊經濟 (Gold)`,
      `${(awayGold / 1000).toFixed(1)}k`,
      `${(homeGold / 1000).toFixed(1)}k`
    );
    pushStatPair(`${gNumLabel} 摧毀防禦塔 (Towers)`, awaySide.towers ?? 0, homeSide.towers ?? 0);
    pushStatPair(`${gNumLabel} 巴龍擊殺 (Barons)`, awaySide.barons ?? 0, homeSide.barons ?? 0);
    pushStatPair(
      `${gNumLabel} 元素飛龍 (Dragons)`,
      Array.isArray(awaySide.dragons) ? awaySide.dragons.length : 0,
      Array.isArray(homeSide.dragons) ? homeSide.dragons.length : 0
    );
    pushStatPair(
      `${gNumLabel} 水晶兵營 (Inhibitors)`,
      awaySide.inhibitors ?? 0,
      homeSide.inhibitors ?? 0
    );

    // Extract frame-by-frame combat events across timeline slices
    let prevB = null;
    let prevR = null;
    frames.forEach((f, idx) => {
      const b = f.blueTeam || {};
      const r = f.redTeam || {};
      const aKills = blueIsHome ? r.totalKills ?? 0 : b.totalKills ?? 0;
      const hKills = blueIsHome ? b.totalKills ?? 0 : r.totalKills ?? 0;

      if (prevB && prevR) {
        const timeTag = f.rfc460Timestamp
          ? new Date(f.rfc460Timestamp).toLocaleTimeString('zh-TW', { hour12: false })
          : `F${idx}`;

        if ((b.totalKills || 0) > (prevB.totalKills || 0)) {
          const diff = b.totalKills - prevB.totalKills;
          plays.push({
            id: `bk-${activeGameNum}-${idx}`,
            gameNumber: activeGameNum,
            clock: { displayValue: timeTag },
            period: { number: activeGameNum, displayValue: gNumLabel },
            type: { text: `⚔️ ${gNumLabel} 藍方擊殺 (${blueTeamInfo.abbr})` },
            text: `${blueTeamInfo.fullName} (藍方) 斬獲 ${diff} 顆人頭！本局擊殺比 ${blueTeamInfo.abbr} ${b.totalKills} : ${r.totalKills} ${redTeamInfo.abbr}（經濟 ${(b.totalGold / 1000).toFixed(1)}k vs ${(r.totalGold / 1000).toFixed(1)}k）`,
            scoringPlay: true,
            awayScore: aKills,
            homeScore: hKills,
          });
        }
        if ((r.totalKills || 0) > (prevR.totalKills || 0)) {
          const diff = r.totalKills - prevR.totalKills;
          plays.push({
            id: `rk-${activeGameNum}-${idx}`,
            gameNumber: activeGameNum,
            clock: { displayValue: timeTag },
            period: { number: activeGameNum, displayValue: gNumLabel },
            type: { text: `⚔️ ${gNumLabel} 紅方擊殺 (${redTeamInfo.abbr})` },
            text: `${redTeamInfo.fullName} (紅方) 斬獲 ${diff} 顆人頭！本局擊殺比 ${blueTeamInfo.abbr} ${b.totalKills} : ${r.totalKills} ${redTeamInfo.abbr}（經濟 ${(b.totalGold / 1000).toFixed(1)}k vs ${(r.totalGold / 1000).toFixed(1)}k）`,
            scoringPlay: true,
            awayScore: aKills,
            homeScore: hKills,
          });
        }
        if ((b.barons || 0) > (prevB.barons || 0)) {
          plays.push({
            id: `bb-${activeGameNum}-${idx}`,
            gameNumber: activeGameNum,
            clock: { displayValue: timeTag },
            period: { number: activeGameNum, displayValue: gNumLabel },
            type: { text: `🐉 ${gNumLabel} 巴龍擊殺 (${blueTeamInfo.abbr})` },
            text: `${blueTeamInfo.fullName} 擊殺納什男爵 (Baron Nashor)！獲得巴龍 Buff 推進加成！`,
            scoringPlay: true,
            awayScore: aKills,
            homeScore: hKills,
          });
        }
        if ((r.barons || 0) > (prevR.barons || 0)) {
          plays.push({
            id: `rb-${activeGameNum}-${idx}`,
            gameNumber: activeGameNum,
            clock: { displayValue: timeTag },
            period: { number: activeGameNum, displayValue: gNumLabel },
            type: { text: `🐉 ${gNumLabel} 巴龍擊殺 (${redTeamInfo.abbr})` },
            text: `${redTeamInfo.fullName} 擊殺納什男爵 (Baron Nashor)！獲得巴龍 Buff 推進加成！`,
            scoringPlay: true,
            awayScore: aKills,
            homeScore: hKills,
          });
        }
        const bDrag = Array.isArray(b.dragons) ? b.dragons.length : 0;
        const prevBDrag = Array.isArray(prevB.dragons) ? prevB.dragons.length : 0;
        if (bDrag > prevBDrag) {
          const dType = b.dragons[b.dragons.length - 1] || '元素飛龍';
          plays.push({
            id: `bd-${activeGameNum}-${idx}`,
            gameNumber: activeGameNum,
            clock: { displayValue: timeTag },
            period: { number: activeGameNum, displayValue: gNumLabel },
            type: { text: `🐲 ${gNumLabel} 飛龍控制 (${blueTeamInfo.abbr})` },
            text: `${blueTeamInfo.fullName} 擊殺元素飛龍 (${dType})，本局累積 ${bDrag} 條小龍！`,
            scoringPlay: false,
            awayScore: aKills,
            homeScore: hKills,
          });
        }
        const rDrag = Array.isArray(r.dragons) ? r.dragons.length : 0;
        const prevRDrag = Array.isArray(prevR.dragons) ? prevR.dragons.length : 0;
        if (rDrag > prevRDrag) {
          const dType = r.dragons[r.dragons.length - 1] || '元素飛龍';
          plays.push({
            id: `rd-${activeGameNum}-${idx}`,
            gameNumber: activeGameNum,
            clock: { displayValue: timeTag },
            period: { number: activeGameNum, displayValue: gNumLabel },
            type: { text: `🐲 ${gNumLabel} 飛龍控制 (${redTeamInfo.abbr})` },
            text: `${redTeamInfo.fullName} 擊殺元素飛龍 (${dType})，本局累積 ${rDrag} 條小龍！`,
            scoringPlay: false,
            awayScore: aKills,
            homeScore: hKills,
          });
        }
        if ((b.towers || 0) > (prevB.towers || 0)) {
          plays.push({
            id: `bt-${activeGameNum}-${idx}`,
            gameNumber: activeGameNum,
            clock: { displayValue: timeTag },
            period: { number: activeGameNum, displayValue: gNumLabel },
            type: { text: `🗼 ${gNumLabel} 防禦塔摧毀 (${blueTeamInfo.abbr})` },
            text: `${blueTeamInfo.fullName} 推進成功，本局累計摧毀 ${b.towers} 座防禦塔。`,
            scoringPlay: false,
            awayScore: aKills,
            homeScore: hKills,
          });
        }
        if ((r.towers || 0) > (prevR.towers || 0)) {
          plays.push({
            id: `rt-${activeGameNum}-${idx}`,
            gameNumber: activeGameNum,
            clock: { displayValue: timeTag },
            period: { number: activeGameNum, displayValue: gNumLabel },
            type: { text: `🗼 ${gNumLabel} 防禦塔摧毀 (${redTeamInfo.abbr})` },
            text: `${redTeamInfo.fullName} 推進成功，本局累計摧毀 ${r.towers} 座防禦塔。`,
            scoringPlay: false,
            awayScore: aKills,
            homeScore: hKills,
          });
        }
      }
      prevB = b;
      prevR = r;
    });

    // Build 5v5 Boxscore Table & Leaders from participantMetadata + latestFrame participants
    const buildTeamRosterData = (teamMeta, frameParticipants, teamAbbr, teamFullName, sideLabel) => {
      const pMetaList = (teamMeta && teamMeta.participantMetadata) || [];
      const pStatsList = Array.isArray(frameParticipants) ? frameParticipants : [];
      const groupLeaders = [];
      const athletesRows = [];

      pMetaList.forEach((pm, i) => {
        const ps =
          pStatsList.find((x) => x.participantId === pm.participantId) || pStatsList[i] || {};
        const champ = pm.championId || 'Champion';
        const role = String(pm.role || '').toUpperCase();
        const kills = ps.kills ?? 0;
        const deaths = ps.deaths ?? 0;
        const assists = ps.assists ?? 0;
        const kdaStr = `${kills}/${deaths}/${assists}`;
        const kdaRatio = ((kills + assists) / Math.max(1, deaths)).toFixed(1);
        const cs = ps.creepScore !== undefined ? String(ps.creepScore) : '0';
        const goldK = ps.totalGold ? `${(Number(ps.totalGold) / 1000).toFixed(1)}k` : '0.0k';
        const level = ps.level !== undefined ? `Lv.${ps.level}` : '-';
        const champImg = pm.championId ? `${DDRAGON_CHAMPION_CDN}/${pm.championId}.png` : '';

        groupLeaders.push({
          displayName: `${role} · ${champ}`,
          leaders: [
            {
              displayValue: `${kdaStr} · ${cs} CS · ${goldK}`,
              athlete: {
                displayName: pm.summonerName || champ,
                headshot: champImg,
              },
            },
          ],
        });

        athletesRows.push({
          athlete: {
            displayName: pm.summonerName || champ,
            shortName: pm.summonerName || champ,
            position: { abbreviation: role },
            headshot: champImg,
            championName: champ,
          },
          stats: [champ, level, kdaStr, kdaRatio, cs, goldK],
        });
      });

      if (groupLeaders.length > 0) {
        leaders.push({
          team: { abbreviation: teamAbbr },
          leaders: groupLeaders,
        });
      }

      if (athletesRows.length > 0) {
        boxscorePlayers.push({
          team: {
            abbreviation: teamAbbr,
            displayName: `${teamFullName} (${sideLabel} · ${gNumLabel})`,
          },
          statistics: [
            {
              labels: ['英雄', '等級', 'K/D/A', 'KDA比', '吃兵 CS', '個人經濟'],
              athletes: athletesRows,
            },
          ],
        });
      }
    };

    buildTeamRosterData(
      meta.blueTeamMetadata,
      blue.participants,
      blueTeamInfo.abbr,
      blueTeamInfo.fullName,
      '藍方 Blue'
    );
    buildTeamRosterData(
      meta.redTeamMetadata,
      red.participants,
      redTeamInfo.abbr,
      redTeamInfo.fullName,
      '紅方 Red'
    );
  }

  // Fallback team series overview if detailed window telemetry is not available
  if (awayStats.length === 0) {
    awayStats.push(
      { name: 'seriesWins', label: '系列賽勝局 (Game Wins)', displayValue: match.away.score },
      { name: 'boFormat', label: '賽制規格 (Best Of)', displayValue: `BO${match.boCount || 3}` }
    );
    homeStats.push(
      { name: 'seriesWins', label: '系列賽勝局 (Game Wins)', displayValue: match.home.score },
      { name: 'boFormat', label: '賽制規格 (Best Of)', displayValue: `BO${match.boCount || 3}` }
    );
  }

  return {
    activeGameNumber: activeGameNum,
    plays,
    boxscore: {
      teams: [
        { homeAway: 'away', team: { abbreviation: match.away.abbr }, statistics: awayStats },
        { homeAway: 'home', team: { abbreviation: match.home.abbr }, statistics: homeStats },
      ],
      players: boxscorePlayers,
    },
    leaders,
    awayGoldPct,
    homeGoldPct,
  };
}

/* ==========================================================================
   3C. Play-by-Play Extraction & Interactive Click-to-Inspect
   ========================================================================== */

function extractPlaysFromSummary(match, summaryData) {
  if (!summaryData) return [];

  if (Array.isArray(summaryData.plays) && summaryData.plays.length > 0) {
    return summaryData.plays
      .slice(-100)
      .reverse()
      .map((p) => ({
        id: String(p.id || `${p.clock?.displayValue}-${p.text}`),
        gameNumber: p.gameNumber || null,
        isGameSelectorCard: Boolean(p.isGameSelectorCard),
        actionHint: p.actionHint || '',
        periodNumber: p.period && p.period.number ? Number(p.period.number) : null,
        clock: (p.clock && p.clock.displayValue) || '',
        period: (p.period && (p.period.displayValue || `P${p.period.number}`)) || '',
        type: (p.type && p.type.text) || '',
        text: p.text || p.shortDescription || '',
        scoringPlay: Boolean(p.scoringPlay),
        scoreText:
          p.awayScore !== undefined && p.homeScore !== undefined
            ? `${match.away.abbr} ${p.awayScore} - ${p.homeScore} ${match.home.abbr}`
            : '',
      }))
      .filter((item) => item.text);
  }

  if (Array.isArray(summaryData.commentary) && summaryData.commentary.length > 0) {
    return summaryData.commentary
      .slice(-80)
      .reverse()
      .map((c, idx) => ({
        id: String(c.sequence || idx),
        gameNumber: null,
        isGameSelectorCard: false,
        actionHint: '',
        periodNumber: null,
        clock: (c.time && c.time.displayValue) || '',
        period: 'MATCH',
        type: (c.play && c.play.type && c.play.type.text) || '',
        text: c.text || '',
        scoringPlay: Boolean(c.play && c.play.scoringPlay),
        scoreText: '',
      }))
      .filter((item) => item.text);
  }

  if (Array.isArray(summaryData.keyEvents) && summaryData.keyEvents.length > 0) {
    return summaryData.keyEvents
      .slice()
      .reverse()
      .map((k, idx) => ({
        id: String(k.id || idx),
        gameNumber: null,
        isGameSelectorCard: false,
        actionHint: '',
        periodNumber: k.period && k.period.number ? Number(k.period.number) : null,
        clock: (k.clock && k.clock.displayValue) || '',
        period: (k.period && k.period.displayValue) || '',
        type: (k.type && k.type.text) || '關鍵事件',
        text: k.text || k.shortText || '',
        scoringPlay: Boolean(k.scoringPlay),
        scoreText: '',
      }))
      .filter((item) => item.text);
  }

  return [];
}

function getFilteredPlaysForCurrentSelection(match, summaryData) {
  const allPlays = extractPlaysFromSummary(match, summaryData);

  // Filter by selected period/game if not 'ALL' (always keep LoL game selector cards visible at top so user can switch games)
  let periodFiltered = allPlays;
  if (state.selectedPeriod !== 'ALL') {
    const wantedNum = Number(state.selectedPeriod);
    periodFiltered = allPlays.filter((p) => {
      if (p.isGameSelectorCard) return true;
      if (p.gameNumber !== null) return Number(p.gameNumber) === wantedNum;
      if (p.periodNumber !== null) return Number(p.periodNumber) === wantedNum;
      return true;
    });
  }

  if (state.pbpFilter === 'scoring') {
    return periodFiltered.filter(
      (p) =>
        p.isGameSelectorCard ||
        p.scoringPlay ||
        /goal|score|homers|three point|touchdown|擊殺|巴龍/i.test(p.type + ' ' + p.text)
    );
  }

  return periodFiltered;
}

function renderPlayByPlay(match, summaryData) {
  const allPlays = extractPlaysFromSummary(match, summaryData);
  const filtered = getFilteredPlaysForCurrentSelection(match, summaryData);

  if (allPlays.length > 0 && match.state === 'in') {
    const newest = allPlays[0];
    const uniqueKey = `${match.id}:${newest.id}`;
    if (!state.announcedPlayIds.has(uniqueKey)) {
      state.announcedPlayIds.add(uniqueKey);
      pushChatMessage(match.id, {
        author: match.isEsports ? 'LoL 峽谷戰報台' : 'ESPN 現場轉播台',
        text: `${newest.clock ? `[${newest.clock}] ` : ''}${newest.text}`,
        type: 'system-play',
      });
      if (newest.scoringPlay) {
        spawnDanmaku(`⚡ [${match.leagueLabel}] ${newest.text}`);
      }
    }
  }

  if (filtered.length === 0) {
    const fallbackMsg =
      match.state === 'pre'
        ? `賽事將於 ${formatFullDateTime(match.date)} 開打，開賽後將自動串流即時 Play-by-Play 戰況紀錄。`
        : match.lastPlayText
        ? `最新賽況：${escapeHtml(match.lastPlayText)}`
        : '此賽事或該節數目前無符合篩選條件的詳細文字紀錄。';
    els.pbpFeedList.innerHTML = `<div class="empty-state">${fallbackMsg}</div>`;
    return;
  }

  const activeGNum = summaryData && summaryData.activeGameNumber;

  els.pbpFeedList.innerHTML = filtered
    .slice(0, 60)
    .map((p) => {
      const isSelectedGameCard =
        p.isGameSelectorCard && activeGNum && Number(p.gameNumber) === Number(activeGNum);
      const targetPeriodAttr = p.gameNumber || p.periodNumber || '';

      return `
        <div class="pbp-item clickable ${p.scoringPlay ? 'scoring-play' : ''} ${
          isSelectedGameCard ? 'selected-game' : ''
        }" data-pbp-period="${escapeAttr(targetPeriodAttr)}" data-is-game-card="${
          p.isGameSelectorCard ? '1' : '0'
        }" title="點擊查看此局/此節完整球員與比賽數據">
          <div class="pbp-time">
            <span>${escapeHtml(p.clock || '--:--')}</span>
            <span class="pbp-period">${escapeHtml(p.period)}</span>
          </div>
          <div class="pbp-text-wrap">
            ${p.type ? `<span class="pbp-type-badge">${escapeHtml(p.type)}</span>` : ''}
            <p class="pbp-desc">${escapeHtml(p.text)}</p>
            <span class="pbp-action-hint">${escapeHtml(
              p.actionHint || '📊 點擊進入本場/本節詳細球員數據中心 →'
            )}</span>
          </div>
          ${p.scoreText ? `<span class="pbp-score-pill">${escapeHtml(p.scoreText)}</span>` : '<span></span>'}
        </div>
      `;
    })
    .join('');

  els.pbpFeedList.querySelectorAll('.pbp-item.clickable').forEach((item) => {
    item.addEventListener('click', async () => {
      const pVal = item.getAttribute('data-pbp-period');
      const isGameCard = item.getAttribute('data-is-game-card') === '1';
      if (pVal) {
        await selectPeriodOrGame(pVal, false);
      }
      // Always switch right panel to Player Boxscore or open Deep-Dive Modal so user immediately sees the game's data
      if (!isGameCard || String(state.selectedPeriod) === String(pVal)) {
        openDataCenterModal();
      }
    });
  });
}

/* ==========================================================================
   3D. Technical Stats, Full Player Boxscore & Leaders Rendering
   ========================================================================== */

function buildPlayerBoxscoreHTML(match, summaryData) {
  const playersGroups = summaryData?.boxscore?.players;
  if (!Array.isArray(playersGroups) || playersGroups.length === 0) {
    return '';
  }

  return playersGroups
    .map((teamBlock, idx) => {
      const teamObj = teamBlock.team || {};
      const teamTitle =
        teamObj.displayName || teamObj.name || (idx === 0 ? match.away.fullName : match.home.fullName);
      const statBlocks = Array.isArray(teamBlock.statistics) ? teamBlock.statistics : [];
      if (statBlocks.length === 0) return '';

      const tablesHtml = statBlocks
        .map((sb) => {
          const labels = Array.isArray(sb.labels)
            ? sb.labels
            : Array.isArray(sb.names)
            ? sb.names
            : [];
          const athletes = Array.isArray(sb.athletes) ? sb.athletes : [];
          if (athletes.length === 0) return '';

          // Limit columns to keep table readable while showing key metrics
          const maxCols = Math.min(labels.length, 10);
          const slicedLabels = labels.slice(0, maxCols);

          const groupTypeTitle = sb.name || sb.type || sb.text || '';

          return `
            <div class="boxscore-table-wrap">
              <table class="boxscore-table">
                <thead>
                  <tr>
                    <th class="player-col">${escapeHtml(
                      match.isEsports ? '選手 (路線)' : groupTypeTitle ? `球員 (${groupTypeTitle})` : '球員'
                    )}</th>
                    ${slicedLabels.map((lbl) => `<th>${escapeHtml(lbl)}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${athletes
                    .slice(0, 15)
                    .map((row) => {
                      const ath = row.athlete || {};
                      const pName = ath.shortName || ath.displayName || '球員';
                      const pos = (ath.position && ath.position.abbreviation) || '';
                      const statsArr = Array.isArray(row.stats) ? row.stats.slice(0, maxCols) : [];
                      const imgUrl =
                        typeof ath.headshot === 'string'
                          ? ath.headshot
                          : ath.headshot && ath.headshot.href
                          ? ath.headshot.href
                          : '';

                      return `
                        <tr>
                          <td class="player-col">
                            <div class="boxscore-player-cell">
                              ${
                                imgUrl
                                  ? `<img src="${escapeAttr(imgUrl)}" alt="" class="boxscore-champ-icon" loading="lazy" />`
                                  : ''
                              }
                              <span>${escapeHtml(pName)}</span>
                              ${pos ? `<span class="boxscore-role-tag">${escapeHtml(pos)}</span>` : ''}
                            </div>
                          </td>
                          ${statsArr.map((st) => `<td>${escapeHtml(String(st ?? '-'))}</td>`).join('')}
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `;
        })
        .join('');

      if (!tablesHtml) return '';

      return `
        <div class="boxscore-team-section">
          <div class="boxscore-team-header ${idx > 0 ? 'home-header' : ''}">
            <span>${escapeHtml(teamTitle)}</span>
            <span>${escapeHtml(teamObj.abbreviation || (idx === 0 ? match.away.abbr : match.home.abbr))}</span>
          </div>
          ${tablesHtml}
        </div>
      `;
    })
    .join('');
}

function buildTeamComparisonHTML(match, summaryData) {
  let awayStats = [];
  let homeStats = [];

  if (summaryData && summaryData.boxscore && Array.isArray(summaryData.boxscore.teams)) {
    const boxTeams = summaryData.boxscore.teams;
    const awayBox =
      boxTeams.find(
        (t) => t.homeAway === 'away' || (t.team && t.team.abbreviation === match.away.abbr)
      ) || boxTeams[0];
    const homeBox =
      boxTeams.find(
        (t) => t.homeAway === 'home' || (t.team && t.team.abbreviation === match.home.abbr)
      ) || boxTeams[1];

    if (awayBox && Array.isArray(awayBox.statistics)) awayStats = awayBox.statistics;
    if (homeBox && Array.isArray(homeBox.statistics)) homeStats = homeBox.statistics;
  }

  if (awayStats.length === 0 && match.away.statistics.length > 0) {
    awayStats = match.away.statistics;
    homeStats = match.home.statistics;
  }

  if (awayStats.length === 0 || homeStats.length === 0) return '';

  const homeMap = new Map();
  homeStats.forEach((s) => {
    const key = s.name || s.label || s.abbreviation;
    if (key) homeMap.set(key, s);
  });

  const rows = [];
  awayStats.forEach((aStat) => {
    const key = aStat.name || aStat.label || aStat.abbreviation;
    const hStat = homeMap.get(key);
    if (!hStat) return;

    const label = aStat.label || aStat.abbreviation || aStat.name;
    const aDisp = String(aStat.displayValue ?? aStat.value ?? '0');
    const hDisp = String(hStat.displayValue ?? hStat.value ?? '0');

    const aNum = parseStatNumber(aDisp);
    const hNum = parseStatNumber(hDisp);
    const sum = aNum + hNum;
    const aPct = sum > 0 ? Math.round((aNum / sum) * 100) : 50;
    const hPct = 100 - aPct;

    rows.push({ label, aDisp, hDisp, aPct, hPct });
  });

  if (rows.length === 0) return '';

  return rows
    .slice(0, 14)
    .map(
      (r) => `
      <div class="stat-comparison-row">
        <div class="stat-row-labels">
          <span class="stat-val-away">${escapeHtml(r.aDisp)}</span>
          <span class="stat-label-center">${escapeHtml(r.label)}</span>
          <span class="stat-val-home">${escapeHtml(r.hDisp)}</span>
        </div>
        <div class="stat-dual-bar">
          <div class="stat-bar-away" style="width: ${r.aPct}%"></div>
          <div class="stat-bar-home" style="width: ${r.hPct}%"></div>
        </div>
      </div>
    `
    )
    .join('');
}

function buildLeadersHTML(match, summaryData) {
  const leaderItems = [];

  const collectFromGroup = (groups, teamAbbr) => {
    if (!Array.isArray(groups)) return;
    groups.forEach((cat) => {
      const top = Array.isArray(cat.leaders) && cat.leaders[0];
      if (!top || !top.athlete) return;
      leaderItems.push({
        category: `${teamAbbr ? teamAbbr + ' · ' : ''}${cat.displayName || cat.shortDisplayName || cat.name || '焦點數據'}`,
        name: top.athlete.displayName || top.athlete.fullName || top.athlete.shortName || '選手',
        headshot:
          (top.athlete.headshot && (top.athlete.headshot.href || top.athlete.headshot)) ||
          (top.athlete.links && top.athlete.links[0]?.href) ||
          '',
        stat: top.displayValue || String(top.value || ''),
      });
    });
  };

  if (summaryData && Array.isArray(summaryData.leaders)) {
    summaryData.leaders.forEach((teamGroup) => {
      const abbr = (teamGroup.team && teamGroup.team.abbreviation) || '';
      collectFromGroup(teamGroup.leaders, abbr);
    });
  }

  if (leaderItems.length === 0) {
    collectFromGroup(match.away.leaders, match.away.abbr);
    collectFromGroup(match.home.leaders, match.home.abbr);
    collectFromGroup(match.compLeaders, '');
  }

  if (leaderItems.length === 0) return '';

  return leaderItems
    .slice(0, 10)
    .map(
      (item) => `
      <div class="leader-card">
        <div class="leader-left">
          ${
            item.headshot && typeof item.headshot === 'string' && item.headshot.startsWith('http')
              ? `<img src="${escapeAttr(item.headshot)}" alt="" class="leader-avatar" loading="lazy" />`
              : `<div class="leader-avatar" style="display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">★</div>`
          }
          <div class="leader-meta">
            <span class="leader-category">${escapeHtml(item.category)}</span>
            <span class="leader-name">${escapeHtml(item.name)}</span>
          </div>
        </div>
        <div class="leader-statline">${escapeHtml(item.stat)}</div>
      </div>
    `
    )
    .join('');
}

function renderTechnicalStats(match, summaryData) {
  const boxscoreHtml = buildPlayerBoxscoreHTML(match, summaryData);
  const teamHtml = buildTeamComparisonHTML(match, summaryData);
  const leadersHtml = buildLeadersHTML(match, summaryData);

  if (state.statView === 'boxscore') {
    if (boxscoreHtml) {
      els.statsContentArea.innerHTML = boxscoreHtml;
      return;
    }
    if (teamHtml) {
      els.statsContentArea.innerHTML = teamHtml;
      return;
    }
  }

  if (state.statView === 'team') {
    if (teamHtml) {
      els.statsContentArea.innerHTML = teamHtml;
      return;
    }
  }

  if (leadersHtml) {
    els.statsContentArea.innerHTML = leadersHtml;
    return;
  }

  if (teamHtml) {
    els.statsContentArea.innerHTML = teamHtml;
    return;
  }

  els.statsContentArea.innerHTML = `<div class="empty-state">本場賽事將於開賽後即時更新完整球員/選手盒式數據 (Boxscore) 與團隊技術指標。</div>`;
}

function parseStatNumber(str) {
  const cleaned = String(str).replace('%', '').replace(/k$/i, '').trim();
  if (cleaned.includes('-')) {
    const first = parseFloat(cleaned.split('-')[0]);
    return Number.isFinite(first) ? first : 0;
  }
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.abs(num) : 0;
}

/* ==========================================================================
   3E. Deep-Dive Match Data Center Modal
   ========================================================================== */

function openDataCenterModal() {
  const match = state.filteredMatches[state.currentMatchIndex];
  if (!match || !els.datacenterModal) return;

  // Pause carousel while modal is open
  if (state.autoRotate) {
    state.autoRotate = false;
    els.btnToggleRotate.classList.remove('active');
    els.rotateIcon.innerHTML = '&#9654;';
    updateRotationProgressUI();
  }

  state.modalOpen = true;
  els.datacenterModal.hidden = false;
  renderPeriodSelectorBar(match);
  renderDataCenterModalContent(match);
}

function closeDataCenterModal() {
  state.modalOpen = false;
  if (els.datacenterModal) {
    els.datacenterModal.hidden = true;
  }
}

function renderDataCenterModalContent(match) {
  if (!match || !els.datacenterModalBody) return;
  const summaryData = state.currentSummary;

  els.modalLeaguePill.textContent = match.leagueLabel;
  els.modalMatchTitle.textContent = `${match.away.fullName} (${match.away.score}) vs (${match.home.score}) ${match.home.fullName}`;
  els.modalMatchSubtitle.textContent = formatSituationText(match);

  const boxscoreHtml =
    buildPlayerBoxscoreHTML(match, summaryData) ||
    buildLeadersHTML(match, summaryData) ||
    '<div class="empty-state">目前尚無詳細球員/選手盒式數據。</div>';

  const teamStatsHtml =
    buildTeamComparisonHTML(match, summaryData) ||
    '<div class="empty-state">目前尚無團隊對比數據。</div>';

  const filteredPlays = getFilteredPlaysForCurrentSelection(match, summaryData).slice(0, 35);
  const playsHtml =
    filteredPlays.length > 0
      ? filteredPlays
          .map(
            (p) => `
          <div class="pbp-item ${p.scoringPlay ? 'scoring-play' : ''}">
            <div class="pbp-time">
              <span>${escapeHtml(p.clock || '--:--')}</span>
              <span class="pbp-period">${escapeHtml(p.period)}</span>
            </div>
            <div class="pbp-text-wrap">
              ${p.type ? `<span class="pbp-type-badge">${escapeHtml(p.type)}</span>` : ''}
              <p class="pbp-desc">${escapeHtml(p.text)}</p>
            </div>
            ${p.scoreText ? `<span class="pbp-score-pill">${escapeHtml(p.scoreText)}</span>` : '<span></span>'}
          </div>
        `
          )
          .join('')
      : '<div class="empty-state">無符合此局/節數的詳細文字紀錄。</div>';

  els.datacenterModalBody.innerHTML = `
    <div class="modal-section-card">
      <div class="modal-section-title">
        <span>📋 球員 / 選手個人數據表 (Player Boxscore)</span>
        <span>${state.selectedPeriod === 'ALL' ? '全場統計' : `局/節數: ${state.selectedPeriod}`}</span>
      </div>
      <div>${boxscoreHtml}</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:18px;">
      <div class="modal-section-card">
        <div class="modal-section-title">
          <span>📊 團隊關鍵數據對比 (Team Comparison)</span>
          <span>${escapeHtml(match.away.abbr)} vs ${escapeHtml(match.home.abbr)}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">${teamStatsHtml}</div>
      </div>

      <div class="modal-section-card">
        <div class="modal-section-title">
          <span>⚡ 該局 / 該節關鍵戰況紀錄 (Play-by-Play)</span>
          <span>共 ${filteredPlays.length} 筆</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;">
          ${playsHtml}
        </div>
      </div>
    </div>
  `;
}

/* ==========================================================================
   4. Interactive Fan Zone: Crowd Poll, Live Chat & Floating Danmaku
   ========================================================================== */

function getPollData(match) {
  const storageKey = `mlr_poll_${match.id}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch (_) {}

  const seedNum = (parseInt(match.id.slice(-4), 10) || 140) + 80;
  const awayVotes = Math.max(10, Math.round((seedNum * match.awayWinPct) / 100));
  const homeVotes = Math.max(10, seedNum - awayVotes);
  const initial = { away: awayVotes, home: homeVotes, userChoice: null };
  try {
    localStorage.setItem(storageKey, JSON.stringify(initial));
  } catch (_) {}
  return initial;
}

function savePollData(matchId, pollObj) {
  try {
    localStorage.setItem(`mlr_poll_${matchId}`, JSON.stringify(pollObj));
  } catch (_) {}
}

function renderPollForMatch(match) {
  const poll = getPollData(match);
  const total = Math.max(1, poll.away + poll.home);
  const awayPct = Math.round((poll.away / total) * 100);
  const homePct = 100 - awayPct;

  els.voteAwayName.textContent = `${match.away.name} 勝`;
  els.voteHomeName.textContent = `${match.home.name} 勝`;
  els.voteAwayPct.textContent = `${awayPct}%`;
  els.voteHomePct.textContent = `${homePct}%`;
  els.pollBarAway.style.width = `${awayPct}%`;
  els.pollBarHome.style.width = `${homePct}%`;
  els.pollTotalVotes.textContent = `${total} 票`;

  els.btnVoteAway.classList.toggle('voted', poll.userChoice === 'away');
  els.btnVoteHome.classList.toggle('voted', poll.userChoice === 'home');
}

function handleVote(side) {
  const match = state.filteredMatches[state.currentMatchIndex];
  if (!match) return;
  const poll = getPollData(match);
  if (poll.userChoice === side) return;

  if (poll.userChoice === 'away') poll.away = Math.max(0, poll.away - 1);
  if (poll.userChoice === 'home') poll.home = Math.max(0, poll.home - 1);

  poll[side] += 1;
  poll.userChoice = side;
  savePollData(match.id, poll);
  renderPollForMatch(match);

  const teamSupported = side === 'away' ? match.away.name : match.home.name;
  const msg = `📣 我剛投票預測【${teamSupported}】拿下本場勝利！`;
  pushChatMessage(match.id, {
    author: els.chatNicknameInput.value.trim() || '觀眾',
    text: msg,
    type: 'user-post',
  });
  spawnDanmaku(msg);
}

function ensureChatInitializedForMatch(match) {
  if (state.chatHistoryByMatch.has(match.id)) return;
  const initialMsgs = [
    {
      author: '系統廣播',
      text: `歡迎進入【${match.leagueLabel}】${match.away.fullName} vs ${match.home.fullName} 24H 全球直播間！`,
      time: formatTimeNow(),
      type: 'system-play',
    },
  ];
  if (match.lastPlayText) {
    initialMsgs.push({
      author: match.isEsports ? 'LoL 峽谷轉播台' : 'ESPN 現場轉播台',
      text: match.lastPlayText,
      time: formatTimeNow(),
      type: 'system-play',
    });
  }
  state.chatHistoryByMatch.set(match.id, initialMsgs);
}

function pushChatMessage(matchId, { author, text, type = 'user-post' }) {
  if (!state.chatHistoryByMatch.has(matchId)) {
    state.chatHistoryByMatch.set(matchId, []);
  }
  const list = state.chatHistoryByMatch.get(matchId);
  list.push({
    author,
    text,
    time: formatTimeNow(),
    type,
  });
  if (list.length > 60) list.shift();

  if (state.currentMatchId === matchId) {
    renderChatMessages(matchId);
  }
}

function renderChatMessages(matchId) {
  const list = state.chatHistoryByMatch.get(matchId) || [];
  els.chatMessagesList.innerHTML = list
    .map(
      (m) => `
      <div class="chat-msg ${escapeAttr(m.type)}">
        <div class="chat-msg-header">
          <span class="chat-author">${escapeHtml(m.author)}</span>
          <span class="chat-time">${escapeHtml(m.time)}</span>
        </div>
        <div class="chat-text">${escapeHtml(m.text)}</div>
      </div>
    `
    )
    .join('');
  els.chatMessagesList.scrollTop = els.chatMessagesList.scrollHeight;
}

function spawnDanmaku(text) {
  if (!state.danmakuEnabled || !els.danmakuLayer) return;
  const item = document.createElement('div');
  item.className = 'danmaku-item';
  item.textContent = text;
  const topPercent = 12 + Math.floor(Math.random() * 68);
  item.style.top = `${topPercent}%`;
  els.danmakuLayer.appendChild(item);

  setTimeout(() => {
    if (item.parentNode) item.parentNode.removeChild(item);
  }, 9600);
}

/* ==========================================================================
   5. 24H Auto-Carousel Timer & Event Listeners
   ========================================================================== */

function updateRotationProgressUI() {
  const totalMs = state.rotateIntervalSec * 1000;
  const remainSec = Math.max(0, Math.ceil((totalMs - state.rotateElapsedMs) / 1000));
  const pct = Math.min(100, (state.rotateElapsedMs / totalMs) * 100);

  els.rotationCountdown.textContent = state.autoRotate ? `${remainSec}s` : '已鎖定單場';
  els.rotationProgressBar.style.width = `${pct}%`;
}

function startCarouselTick() {
  const tickMs = 250;
  setInterval(() => {
    if (!state.autoRotate || state.filteredMatches.length <= 1) return;
    state.rotateElapsedMs += tickMs;
    const totalMs = state.rotateIntervalSec * 1000;
    if (state.rotateElapsedMs >= totalMs) {
      state.rotateElapsedMs = 0;
      selectMatchByIndex(state.currentMatchIndex + 1, false);
    }
    updateRotationProgressUI();
  }, tickMs);

  setInterval(() => {
    syncAllScoreboards(true);
  }, 30000);

  setInterval(() => {
    const current = state.filteredMatches[state.currentMatchIndex];
    if (current) fetchAndRenderMatchSummary(current);
  }, 15000);
}

function bindEvents() {
  els.leagueNav.querySelectorAll('.league-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.leagueNav.querySelectorAll('.league-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeLeagueFilter = btn.getAttribute('data-league') || 'ALL';
      state.rotateElapsedMs = 0;
      applyLeagueFilter(false);
    });
  });

  els.btnPrevMatch.addEventListener('click', () => {
    selectMatchByIndex(state.currentMatchIndex - 1, true);
  });

  els.btnNextMatch.addEventListener('click', () => {
    selectMatchByIndex(state.currentMatchIndex + 1, true);
  });

  els.btnToggleRotate.addEventListener('click', () => {
    state.autoRotate = !state.autoRotate;
    els.btnToggleRotate.classList.toggle('active', state.autoRotate);
    els.rotateIcon.innerHTML = state.autoRotate ? '&#10074;&#10074;' : '&#9654;';
    updateRotationProgressUI();
  });

  els.selectInterval.addEventListener('change', () => {
    state.rotateIntervalSec = Number(els.selectInterval.value) || 25;
    state.rotateElapsedMs = 0;
    updateRotationProgressUI();
  });

  els.btnRefreshNow.addEventListener('click', () => {
    syncAllScoreboards(true);
  });

  // Open / Close Deep-Dive Data Center Modal
  if (els.btnOpenDatacenter) {
    els.btnOpenDatacenter.addEventListener('click', openDataCenterModal);
  }
  if (els.btnCloseDatacenter) {
    els.btnCloseDatacenter.addEventListener('click', closeDataCenterModal);
  }
  if (els.datacenterModal) {
    els.datacenterModal.addEventListener('click', (e) => {
      if (e.target === els.datacenterModal) closeDataCenterModal();
    });
  }

  els.pbpFilterAll.addEventListener('click', () => {
    state.pbpFilter = 'all';
    els.pbpFilterAll.classList.add('active');
    els.pbpFilterScoring.classList.remove('active');
    const match = state.filteredMatches[state.currentMatchIndex];
    if (match) renderPlayByPlay(match, state.currentSummary);
  });

  els.pbpFilterScoring.addEventListener('click', () => {
    state.pbpFilter = 'scoring';
    els.pbpFilterScoring.classList.add('active');
    els.pbpFilterAll.classList.remove('active');
    const match = state.filteredMatches[state.currentMatchIndex];
    if (match) renderPlayByPlay(match, state.currentSummary);
  });

  const setStatTab = (viewName) => {
    state.statView = viewName;
    if (els.statTabBoxscore) {
      els.statTabBoxscore.classList.toggle('active', viewName === 'boxscore');
    }
    els.statTabTeam.classList.toggle('active', viewName === 'team');
    els.statTabLeaders.classList.toggle('active', viewName === 'leaders');
    const match = state.filteredMatches[state.currentMatchIndex];
    if (match) renderTechnicalStats(match, state.currentSummary);
  };

  if (els.statTabBoxscore) {
    els.statTabBoxscore.addEventListener('click', () => setStatTab('boxscore'));
  }
  els.statTabTeam.addEventListener('click', () => setStatTab('team'));
  els.statTabLeaders.addEventListener('click', () => setStatTab('leaders'));

  els.btnVoteAway.addEventListener('click', () => handleVote('away'));
  els.btnVoteHome.addEventListener('click', () => handleVote('home'));

  document.querySelectorAll('.cheer-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-cheer');
      const match = state.filteredMatches[state.currentMatchIndex];
      if (!match || !text) return;
      pushChatMessage(match.id, {
        author: els.chatNicknameInput.value.trim() || '觀眾',
        text,
        type: 'user-post',
      });
      spawnDanmaku(text);
    });
  });

  els.toggleDanmaku.addEventListener('change', () => {
    state.danmakuEnabled = els.toggleDanmaku.checked;
  });

  els.chatInputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = els.chatTextInput.value.trim();
    const author = els.chatNicknameInput.value.trim() || '觀眾';
    const match = state.filteredMatches[state.currentMatchIndex];
    if (!text || !match) return;
    pushChatMessage(match.id, { author, text, type: 'user-post' });
    spawnDanmaku(`${author}：${text}`);
    els.chatTextInput.value = '';
  });
}

/* ==========================================================================
   Helpers
   ========================================================================== */

function formatMatchTime(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '--:--';
  return dateObj.toLocaleTimeString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatFullDateTime(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '--';
  return dateObj.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTimeNow() {
  return new Date().toLocaleTimeString('zh-TW', { hour12: false });
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

/* ==========================================================================
   Bootstrap
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  syncAllScoreboards(false);
  startCarouselTick();
});
