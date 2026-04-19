import { callStravaExchange, callStravaRefresh } from './firebase.js';

// Your Strava app's Client ID (public — find it at strava.com/settings/api)
const STRAVA_CLIENT_ID = '227363';

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_KEY = 'marathon-strava';

// ===== OAuth =====

export function stravaConnect() {
  const redirectUri = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'activity:read_all'
  });
  window.location.href = `${STRAVA_AUTH_URL}?${params}`;
}

export async function handleStravaCallback(code) {
  const result = await callStravaExchange({ code });
  const data = result.data;
  _saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athlete: data.athlete
  });
  return data;
}

// ===== Token management =====

export async function getValidToken() {
  const s = _loadTokens();
  if (!s.accessToken) return null;
  if (Date.now() / 1000 < s.expiresAt - 60) return s.accessToken;

  const result = await callStravaRefresh({ refreshToken: s.refreshToken });
  const data = result.data;
  _saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athlete: s.athlete
  });
  return data.access_token;
}

export function isStravaConnected() {
  const s = _loadTokens();
  return !!(s.accessToken && s.athlete);
}

export function getStravaAthlete() {
  return _loadTokens().athlete || null;
}

export function disconnectStrava() {
  localStorage.removeItem(STRAVA_KEY);
}

// ===== API =====

export async function fetchRecentActivities(afterTimestamp) {
  const token = await getValidToken();
  if (!token) return [];
  const res = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?after=${afterTimestamp}&per_page=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to fetch Strava activities.');
  return res.json();
}

// ===== Sync =====

export async function syncActivitiesToPlan(plan, completions, toggleCompletionFn) {
  if (!plan || !isStravaConnected()) return 0;
  const planStartTs = Math.floor(new Date(plan.days[0].date).getTime() / 1000);
  const activities = await fetchRecentActivities(planStartTs);
  const runActivities = activities.filter(a => a.type === 'Run');
  let newMatches = 0;
  plan.days.forEach((day, idx) => {
    if (!day.date || !day.focusArea || day.focusArea === 'Rest') return;
    if (completions[String(idx)]) return;
    const matched = runActivities.some(a => a.start_date_local.split('T')[0] === day.date);
    if (matched) { toggleCompletionFn(idx); newMatches++; }
  });
  return newMatches;
}

// ===== Private helpers =====

function _loadTokens() {
  try {
    const raw = localStorage.getItem(STRAVA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function _saveTokens(tokens) {
  localStorage.setItem(STRAVA_KEY, JSON.stringify(tokens));
}
