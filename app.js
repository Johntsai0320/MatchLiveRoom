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
const DDRAGON_CHAMPION_CDN = 'https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion';

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
  pbpFilter: 'all', // 'all' | 'scoring'
  statView: 'team', // 'team' | 'leaders'
  autoRotate: true,
  rotateIntervalSec: 25,
  rotateElapsedMs: 0,
  danmakuEnabled: true,
  previousScores: new Map(), // matchId -> { away, home }
  announcedPlayIds: new Set(),
  chatHistoryByMatch: new Map(), // matchId -> Array of messages
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
  linescoreWrapper: document.getElementById('linescore-wrapper'),
  momentumAwayLabel: document.getElementById('momentum-away-label'),
  momentumHomeLabel: document.getElementById('momentum-home-label'),
  momentumFillAway: document.getElementById('momentum-fill-away'),
  momentumFillHome: document.getElementById('momentum-fill-home'),

  // Lower Panels
  pbpFilterAll: document.getElementById('pbp-filter-all'),
  pbpFilterScoring: document.getElementById('pbp-filter-scoring'),
  pbpFeedList: document.getElementById('pbp-feed-list'),
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
  const matchState = statusType.state || 'pre'; // 'in' | 'pre' | 'post'

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
    // Take recent & upcoming Worlds / MSI / International matches
    rawEvents.push(...wEvents.slice(-30));
  }
  if (proRes.status === 'fulfilled') {
    const pEvents = proRes.value?.data?.schedule?.events || [];
    // Prioritize inProgress, unstarted, and recent completed pro matches
    const activeOrRecent = pEvents.slice(-45);
    rawEvents.push(...activeOrRecent);
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

  // Build per-map linescores from series score until getEventDetails populates exact maps
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
    away: blueTeam, // Blue Side
    home: redTeam, // Red Side
    situation: { boLabel, blockName },
    lastPlayText:
      matchState === 'in'
        ? `正在進行 ${leagueDisplayName} (${blockName}) 峽谷對決！`
        : `${leagueDisplayName} · ${blockName} 系列賽 (${blueTeam.fullName} vs ${redTeam.fullName})`,
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
  }

  const activeMatch = state.filteredMatches[state.currentMatchIndex];
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
        <article class="ticker-card ${isSelected ? 'selected' : ''}" data-match-idx="${idx}" id="ticker-card-${m.id}">
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
      selectMatchByIndex(idx, true);
    });
  });
}

function selectMatchByIndex(idx, resetTimer = true) {
  if (state.filteredMatches.length === 0) return;
  const normalizedIdx =
    ((idx % state.filteredMatches.length) + state.filteredMatches.length) %
    state.filteredMatches.length;
  state.currentMatchIndex = normalizedIdx;
  const match = state.filteredMatches[normalizedIdx];
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

  // Team Logos & Names
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

  // Score & Flash Detection
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

  // Situation Pill & Last Play
  els.matchSituationPill.textContent = formatSituationText(match);
  els.lastPlayBanner.textContent =
    match.lastPlayText ||
    (match.state === 'pre'
      ? `開賽時間：${formatFullDateTime(match.date)}`
      : '等待現場最新戰況訊號...');

  // Linescore Table
  renderLinescoreTable(match);

  // Momentum Bar
  updateMomentumUI(match.away.abbr, match.home.abbr, match.awayWinPct, match.homeWinPct);

  // Update Poll & Chat for this Match
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
    return `${match.leagueLabel} · ${match.blockName || 'BO3/BO5 系列賽'}`;
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
    const label = match.isEsports ? `G${i + 1}` : match.isSoccer ? `H${i + 1}` : `${i + 1}`;
    headers.push(`<th>${label}</th>`);
  }

  const renderCells = (lines) => {
    const cells = [];
    for (let i = 0; i < maxCols; i++) {
      const val =
        lines[i] && (lines[i].displayValue !== undefined ? lines[i].displayValue : lines[i].value);
      cells.push(`<td>${val !== undefined ? escapeHtml(String(val)) : '-'}</td>`);
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

    renderPlayByPlay(match, summaryData);
    renderTechnicalStats(match, summaryData);
  } catch (err) {
    if (state.currentMatchId !== targetMatchId) return;
    renderPlayByPlay(match, null);
    renderTechnicalStats(match, null);
  }
}

/* ==========================================================================
   3B. Riot LoL Esports EventDetails & LiveStats Window Parser
   ========================================================================== */

async function fetchAndRenderLoLSummary(match) {
  const targetMatchId = match.id;
  try {
    const detailsData = await fetchLoLEsportsJson(`getEventDetails?hl=zh-TW&id=${match.id}`);
    if (state.currentMatchId !== targetMatchId) return;

    const eventDetail = detailsData?.data?.event || {};
    const games = eventDetail?.match?.games || [];

    // Find inProgress game, or the latest completed game
    const activeGame =
      games.find((g) => g.state === 'inProgress') ||
      [...games].reverse().find((g) => g.state === 'completed') ||
      games[0];

    let windowData = null;
    if (activeGame && activeGame.id && activeGame.state !== 'unstarted') {
      try {
        const winRes = await fetch(`${LOL_LIVESTATS_BASE}/window/${activeGame.id}`, {
          cache: 'no-store',
        });
        if (winRes.ok) {
          windowData = await winRes.json();
        }
      } catch (_) {}
    }

    if (state.currentMatchId !== targetMatchId) return;

    const synthesizedSummary = buildLoLSummaryFromRiotData(
      match,
      eventDetail,
      games,
      activeGame,
      windowData
    );
    state.currentSummary = synthesizedSummary;

    if (synthesizedSummary.blueGoldPct && synthesizedSummary.redGoldPct) {
      updateMomentumUI(
        match.away.abbr,
        match.home.abbr,
        synthesizedSummary.blueGoldPct,
        synthesizedSummary.redGoldPct
      );
    }

    renderPlayByPlay(match, synthesizedSummary);
    renderTechnicalStats(match, synthesizedSummary);
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
  let blueGoldPct = match.awayWinPct;
  let redGoldPct = match.homeWinPct;

  // 1. Add series game-by-game overview plays
  if (Array.isArray(games) && games.length > 0) {
    games.forEach((g) => {
      const gNum = g.number || 1;
      const gState =
        g.state === 'inProgress'
          ? '進行中 LIVE'
          : g.state === 'completed'
          ? '已完賽'
          : '未開始';
      if (g.state !== 'unstarted') {
        plays.push({
          id: `game-${g.id || gNum}`,
          clock: { displayValue: `Game ${gNum}` },
          period: { displayValue: match.blockName || 'BO5' },
          type: { text: `第 ${gNum} 局 (${gState})` },
          text: `${match.away.fullName} vs ${match.home.fullName} — 第 ${gNum} 局峽谷對決 (${gState})`,
          scoringPlay: g.state === 'inProgress',
          awayScore: match.away.score,
          homeScore: match.home.score,
        });
      }
    });
  }

  // 2. Parse Riot LiveStats Window frames (Gold, Kills, Towers, Barons, Dragons, Players)
  if (windowData && Array.isArray(windowData.frames) && windowData.frames.length > 0) {
    const frames = windowData.frames;
    const latestFrame = frames[frames.length - 1];
    const blue = latestFrame.blueTeam || {};
    const red = latestFrame.redTeam || {};
    const meta = windowData.gameMetadata || {};
    const gNumLabel = activeGame ? `G${activeGame.number}` : 'LIVE';

    const blueGold = Number(blue.totalGold || 0);
    const redGold = Number(red.totalGold || 0);
    if (blueGold + redGold > 0) {
      blueGoldPct = Math.min(88, Math.max(12, Math.round((blueGold / (blueGold + redGold)) * 100)));
      redGoldPct = 100 - blueGoldPct;
    }

    const pushStatPair = (label, bVal, rVal) => {
      awayStats.push({ name: label, label, displayValue: String(bVal) });
      homeStats.push({ name: label, label, displayValue: String(rVal) });
    };

    pushStatPair('總擊殺 (Kills)', blue.totalKills ?? 0, red.totalKills ?? 0);
    pushStatPair(
      '團隊總經濟 (Gold)',
      `${(blueGold / 1000).toFixed(1)}k`,
      `${(redGold / 1000).toFixed(1)}k`
    );
    pushStatPair('摧毀防禦塔 (Towers)', blue.towers ?? 0, red.towers ?? 0);
    pushStatPair('巴龍擊殺 (Barons)', blue.barons ?? 0, red.barons ?? 0);
    pushStatPair(
      '元素飛龍 (Dragons)',
      Array.isArray(blue.dragons) ? blue.dragons.length : 0,
      Array.isArray(red.dragons) ? red.dragons.length : 0
    );
    pushStatPair('水晶兵營 (Inhibitors)', blue.inhibitors ?? 0, red.inhibitors ?? 0);

    // Extract frame-by-frame combat events (kills, towers, barons, dragons)
    let prevB = null;
    let prevR = null;
    frames.forEach((f, idx) => {
      const b = f.blueTeam || {};
      const r = f.redTeam || {};
      if (prevB && prevR) {
        const timeTag = f.rfc460Timestamp
          ? new Date(f.rfc460Timestamp).toLocaleTimeString('zh-TW', { hour12: false })
          : `F${idx}`;

        if ((b.totalKills || 0) > (prevB.totalKills || 0)) {
          const diff = b.totalKills - prevB.totalKills;
          plays.push({
            id: `bk-${idx}`,
            clock: { displayValue: timeTag },
            period: { displayValue: gNumLabel },
            type: { text: '⚔️ 藍方擊殺' },
            text: `${match.away.name} 斬獲 ${diff} 顆人頭！人頭比來到 ${b.totalKills} : ${r.totalKills}（經濟 ${(b.totalGold / 1000).toFixed(1)}k vs ${(r.totalGold / 1000).toFixed(1)}k）`,
            scoringPlay: true,
            awayScore: b.totalKills,
            homeScore: r.totalKills,
          });
        }
        if ((r.totalKills || 0) > (prevR.totalKills || 0)) {
          const diff = r.totalKills - prevR.totalKills;
          plays.push({
            id: `rk-${idx}`,
            clock: { displayValue: timeTag },
            period: { displayValue: gNumLabel },
            type: { text: '⚔️ 紅方擊殺' },
            text: `${match.home.name} 斬獲 ${diff} 顆人頭！人頭比來到 ${b.totalKills} : ${r.totalKills}（經濟 ${(b.totalGold / 1000).toFixed(1)}k vs ${(r.totalGold / 1000).toFixed(1)}k）`,
            scoringPlay: true,
            awayScore: b.totalKills,
            homeScore: r.totalKills,
          });
        }
        if ((b.barons || 0) > (prevB.barons || 0)) {
          plays.push({
            id: `bb-${idx}`,
            clock: { displayValue: timeTag },
            period: { displayValue: gNumLabel },
            type: { text: '🐉 巴龍擊殺' },
            text: `${match.away.name} 成功擊殺納什男爵 (Baron Nashor)！全隊獲得巴龍 Buff 加持！`,
            scoringPlay: true,
            awayScore: b.totalKills,
            homeScore: r.totalKills,
          });
        }
        if ((r.barons || 0) > (prevR.barons || 0)) {
          plays.push({
            id: `rb-${idx}`,
            clock: { displayValue: timeTag },
            period: { displayValue: gNumLabel },
            type: { text: '🐉 巴龍擊殺' },
            text: `${match.home.name} 成功擊殺納什男爵 (Baron Nashor)！全隊獲得巴龍 Buff 加持！`,
            scoringPlay: true,
            awayScore: b.totalKills,
            homeScore: r.totalKills,
          });
        }
        if ((b.towers || 0) > (prevB.towers || 0)) {
          plays.push({
            id: `bt-${idx}`,
            clock: { displayValue: timeTag },
            period: { displayValue: gNumLabel },
            type: { text: '🗼 防禦塔摧毀' },
            text: `${match.away.name} 推進成功，累計摧毀 ${b.towers} 座防禦塔。`,
            scoringPlay: false,
            awayScore: b.totalKills,
            homeScore: r.totalKills,
          });
        }
        if ((r.towers || 0) > (prevR.towers || 0)) {
          plays.push({
            id: `rt-${idx}`,
            clock: { displayValue: timeTag },
            period: { displayValue: gNumLabel },
            type: { text: '🗼 防禦塔摧毀' },
            text: `${match.home.name} 推進成功，累計摧毀 ${r.towers} 座防禦塔。`,
            scoringPlay: false,
            awayScore: b.totalKills,
            homeScore: r.totalKills,
          });
        }
      }
      prevB = b;
      prevR = r;
    });

    // Build Champion & KDA Leaders from participantMetadata + latestFrame participants
    const buildRosterLeaders = (teamMeta, frameParticipants, teamAbbr) => {
      const pMetaList = (teamMeta && teamMeta.participantMetadata) || [];
      const pStatsList = Array.isArray(frameParticipants) ? frameParticipants : [];
      const groupLeaders = [];

      pMetaList.forEach((pm, i) => {
        const ps =
          pStatsList.find((x) => x.participantId === pm.participantId) || pStatsList[i] || {};
        const champ = pm.championId || '英雄';
        const role = String(pm.role || '').toUpperCase();
        const kda = `${ps.kills ?? 0}/${ps.deaths ?? 0}/${ps.assists ?? 0}`;
        const cs = ps.creepScore !== undefined ? `${ps.creepScore} CS` : '';
        const goldK =
          ps.totalGold ? `${(Number(ps.totalGold) / 1000).toFixed(1)}k` : '';

        groupLeaders.push({
          displayName: `${role} · ${champ}`,
          leaders: [
            {
              displayValue: [kda, cs, goldK].filter(Boolean).join(' · '),
              athlete: {
                displayName: pm.summonerName || champ,
                headshot: pm.championId
                  ? `${DDRAGON_CHAMPION_CDN}/${pm.championId}.png`
                  : '',
              },
            },
          ],
        });
      });

      if (groupLeaders.length > 0) {
        leaders.push({
          team: { abbreviation: teamAbbr },
          leaders: groupLeaders,
        });
      }
    };

    buildRosterLeaders(meta.blueTeamMetadata, blue.participants, match.away.abbr);
    buildRosterLeaders(meta.redTeamMetadata, red.participants, match.home.abbr);
  }

  // Fallback team series stats if live window telemetry is unavailable for an older/upcoming series
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
    plays,
    boxscore: {
      teams: [
        { homeAway: 'away', team: { abbreviation: match.away.abbr }, statistics: awayStats },
        { homeAway: 'home', team: { abbreviation: match.home.abbr }, statistics: homeStats },
      ],
    },
    leaders,
    blueGoldPct,
    redGoldPct,
  };
}

function extractPlaysFromSummary(match, summaryData) {
  if (!summaryData) return [];

  // 1. Standard US Sports (NBA, MLB, NHL, NFL) & Synthesized LoL Plays have `plays` array
  if (Array.isArray(summaryData.plays) && summaryData.plays.length > 0) {
    return summaryData.plays
      .slice(-80)
      .reverse()
      .map((p) => ({
        id: String(p.id || `${p.clock?.displayValue}-${p.text}`),
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

  // 2. Soccer Commentary or KeyEvents (`commentary`, `keyEvents`)
  if (Array.isArray(summaryData.commentary) && summaryData.commentary.length > 0) {
    return summaryData.commentary
      .slice(-80)
      .reverse()
      .map((c, idx) => ({
        id: String(c.sequence || idx),
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

function renderPlayByPlay(match, summaryData) {
  const allPlays = extractPlaysFromSummary(match, summaryData);
  const filtered =
    state.pbpFilter === 'scoring'
      ? allPlays.filter(
          (p) =>
            p.scoringPlay ||
            /goal|score|homers|three point|touchdown|擊殺|巴龍/i.test(p.type + ' ' + p.text)
        )
      : allPlays;

  // Broadcast newest live play to chat & danmaku if not yet announced
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
        : '此賽事目前無符合篩選條件的詳細文字紀錄。';
    els.pbpFeedList.innerHTML = `<div class="empty-state">${fallbackMsg}</div>`;
    return;
  }

  els.pbpFeedList.innerHTML = filtered
    .slice(0, 50)
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
    .join('');
}

function renderTechnicalStats(match, summaryData) {
  if (state.statView === 'leaders') {
    renderMatchLeaders(match, summaryData);
    return;
  }

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

  if (awayStats.length === 0 || homeStats.length === 0) {
    renderMatchLeaders(match, summaryData);
    return;
  }

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

  if (rows.length === 0) {
    renderMatchLeaders(match, summaryData);
    return;
  }

  els.statsContentArea.innerHTML = rows
    .slice(0, 12)
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

function renderMatchLeaders(match, summaryData) {
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

  if (leaderItems.length === 0) {
    els.statsContentArea.innerHTML = `<div class="empty-state">本場賽事將於開賽後更新選手英雄 KDA 與團隊技術統計。</div>`;
    return;
  }

  els.statsContentArea.innerHTML = leaderItems
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

  els.rotationCountdown.textContent = state.autoRotate ? `${remainSec}s` : '已暫停';
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

  els.statTabTeam.addEventListener('click', () => {
    state.statView = 'team';
    els.statTabTeam.classList.add('active');
    els.statTabLeaders.classList.remove('active');
    const match = state.filteredMatches[state.currentMatchIndex];
    if (match) renderTechnicalStats(match, state.currentSummary);
  });

  els.statTabLeaders.addEventListener('click', () => {
    state.statView = 'leaders';
    els.statTabLeaders.classList.add('active');
    els.statTabTeam.classList.remove('active');
    const match = state.filteredMatches[state.currentMatchIndex];
    if (match) renderTechnicalStats(match, state.currentSummary);
  });

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
