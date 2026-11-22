'use strict';

const VERSION = '1.2.0';
const APP_NAME = 'Sweat & Iron Pump Gym';
// Two people share the app. The ids are neutral on purpose: the real names are typed in on the phone
// ("Edit names" on the first screen) and stored only there, never in this code.
const PROFILES = [
  { id: 'pink', name: 'Pink' },
  { id: 'iron', name: 'Iron' },
];

/* =========================================================
   Built-in lists
   ========================================================= */
// Muscle groups are shown in exactly this order.
const GROUPS = {
  Chest: ['Bench Press', 'Incline Bench Press', 'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Chest Press Machine', 'Cable Fly', 'Pec Deck', 'Dips', 'Push-ups'],
  Back: ['Deadlift', 'Pull-ups', 'Lat Pulldown', 'Barbell Row', 'Dumbbell Row', 'Seated Cable Row', 'T-Bar Row', 'Face Pull', 'Back Extension'],
  Shoulders: ['Overhead Press', 'Dumbbell Shoulder Press', 'Arnold Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Upright Row', 'Shrugs'],
  Biceps: ['Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl', 'Incline Dumbbell Curl'],
  Triceps: ['Triceps Pushdown', 'Overhead Triceps Extension', 'Skull Crushers', 'Close-Grip Bench Press', 'Triceps Dips', 'Kickbacks'],
  Quads: ['Back Squat - Smith Machine', 'Hack Squat', 'Leg Press', 'Leg Extension'],
  Hamstrings: ['Romanian Deadlift', 'Lying Leg Curl', 'Seated Leg Curl', 'Good Morning', 'Nordic Curl'],
  Glutes: ['Hip Thrust', 'Glute Bridge', 'Cable Kickback', 'Hip Abduction Machine', 'Step-ups'],
  Calves: ['Standing Calf Raise', 'Seated Calf Raise'],
  Core: ['Plank', 'Crunches', 'Hanging Leg Raise', 'Cable Crunch', 'Russian Twist', 'Ab Wheel'],
  Forearm: ['Wrist Curl', 'Reverse Wrist Curl', 'Reverse Barbell Curl', "Farmer's Walk", 'Plate Pinch', 'Dead Hang'],
  Neck: ['Neck Flexion', 'Neck Extension', 'Lateral Neck Flexion', 'Neck Machine', 'Isometric Neck Hold'],
};
// The cardio activities, with the photo and the machine-specific settings you can log for each.
// Saved sessions refer to the activity name, so keep the names unchanged.
// A field is { k: stored key, l: label, u: unit, text: true for free text }.
const CARDIO_META = {
  'Treadmill': { img: 'treadmill.jpg', fields: [
    { k: 'speed', l: 'Speed', u: 'km/h' }, { k: 'incline', l: 'Incline', u: '%' }] },
  'Stationary Bike': { img: 'stationary-bike.png', fields: [
    { k: 'resistance', l: 'Resistance level', u: 'level' }, { k: 'rpm', l: 'Cadence', u: 'rpm' }] },
  'Spin Bike': { img: 'spin-bike.jpg', fields: [
    { k: 'resistance', l: 'Resistance', u: 'level' }, { k: 'rpm', l: 'Cadence', u: 'rpm' }, { k: 'watts', l: 'Power', u: 'W' }] },
  'Air Bike': { img: 'air-bike.jpg', fields: [
    { k: 'rpm', l: 'Average RPM', u: 'rpm' }, { k: 'watts', l: 'Average power', u: 'W' }, { k: 'calories', l: 'Calories', u: 'kcal' }] },
  'Rowing': { img: 'rowing.jpg', fields: [
    { k: 'damper', l: 'Damper setting', u: '1–10' }, { k: 'strokeRate', l: 'Stroke rate', u: 'spm' },
    { k: 'split', l: 'Average split / 500 m', u: 'min:sec', text: true, ph: '2:05' }] },
  'Elliptical': { img: 'elliptical.png', fields: [
    { k: 'resistance', l: 'Resistance level', u: 'level' }, { k: 'incline', l: 'Incline / ramp', u: 'level' }, { k: 'spm', l: 'Cadence', u: 'spm' }] },
  'Stair Climber': { img: 'stair-climber.jpg', dist: false, fields: [
    { k: 'level', l: 'Level / speed', u: '' }, { k: 'floors', l: 'Floors climbed', u: 'floors' }] },
  'Running': { img: 'running.png', fields: [{ k: 'elevation', l: 'Elevation gain', u: 'm' }] },
  'Walking': { img: 'walking.png', fields: [{ k: 'elevation', l: 'Elevation gain', u: 'm' }, { k: 'steps', l: 'Steps', u: 'steps' }] },
  'Cycling': { img: 'cycling.jpg', fields: [{ k: 'elevation', l: 'Elevation gain', u: 'm' }] },
};
const CARDIO = Object.keys(CARDIO_META);
const cardioMeta = (name) => CARDIO_META[name] || { fields: [] };
const hasDistance = (name) => cardioMeta(name).dist !== false;
const hasDist = (s) => Number.isFinite(s.distanceKm) && s.distanceKm > 0;
const INTENSITY = ['Low', 'Moderate', 'High'];

/* =========================================================
   Storage (everything lives on the phone first)
   ========================================================= */
// Each person has their own data, active workout and sync state. The GitHub login is shared on this phone.
const K = { settings: 'gymlog.settings', names: 'gymlog.names' };
let profile = null;
const pkey = (name) => `gymlog.${profile}.${name}`;

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function store(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { toast('Could not save on this device: ' + e.message); }
}

function emptyData() { return { version: 1, sessions: [], deleted: {}, custom: { cardio: [], exercises: {} } }; }

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Keep only well-formed sessions, and coerce the rest, so bad data can never crash the screens.
function cleanSession(s) {
  if (!s || typeof s !== 'object') return null;
  const id = typeof s.id === 'string' || finite(s.id) ? String(s.id) : '';
  if (!id || typeof s.start !== 'string' || !finite(Date.parse(s.start))) return null;
  const out = {
    id, type: s.type, start: s.start,
    end: typeof s.end === 'string' && finite(Date.parse(s.end)) ? s.end : s.start,
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : '',
  };
  if (typeof s.day === 'string' && DAY_RE.test(s.day) && finite(Date.parse(s.day))) out.day = s.day;
  if (s.type === 'cardio') {
    out.activity = typeof s.activity === 'string' && s.activity.trim() ? s.activity.slice(0, 60) : 'Cardio';
    out.intensity = INTENSITY.includes(s.intensity) ? s.intensity : 'Moderate';
    if (finite(s.distanceKm) && s.distanceKm >= 0) out.distanceKm = s.distanceKm;
    if (s.settings && typeof s.settings === 'object' && !Array.isArray(s.settings)) {
      const st = {};
      for (const [k, v] of Object.entries(s.settings)) {
        if (BAD_KEYS.has(k)) continue;
        if (finite(v) && v >= 0) st[k] = v; else if (typeof v === 'string' && v.length <= 40) st[k] = v;
      }
      if (Object.keys(st).length) out.settings = st;
    }
    if (typeof s.note === 'string' && s.note) out.note = s.note;
    return out;
  }
  if (s.type === 'weights') {
    if (!Array.isArray(s.exercises)) return null;
    out.exercises = [];
    for (const e of s.exercises) {
      if (!e || typeof e !== 'object' || typeof e.name !== 'string' || !e.name.trim() || !Array.isArray(e.sets)) continue;
      const sets = e.sets
        .filter((x) => x && finite(x.kg) && x.kg >= 0 && finite(x.reps) && x.reps > 0)
        .map((x) => ({ kg: x.kg, reps: x.reps, ...(x.warmup === true ? { warmup: true } : {}), ...(x.failure === true ? { failure: true } : {}) }));
      if (sets.length) out.exercises.push({ name: e.name.slice(0, 120), group: typeof e.group === 'string' ? e.group.slice(0, 40) : '', sets });
    }
    return out.exercises.length ? out : null;
  }
  return null;
}

function normalize(d) {
  const out = emptyData();
  if (!d || typeof d !== 'object') return out;
  if (Array.isArray(d.sessions)) out.sessions = d.sessions.map(cleanSession).filter(Boolean);
  if (d.deleted && typeof d.deleted === 'object' && !Array.isArray(d.deleted)) {
    for (const [id, t] of Object.entries(d.deleted)) if (!BAD_KEYS.has(id) && typeof t === 'string' && t) out.deleted[id] = t;
  }
  if (d.custom && typeof d.custom === 'object') {
    if (Array.isArray(d.custom.cardio)) out.custom.cardio = d.custom.cardio.filter((x) => typeof x === 'string');
    const ex = d.custom.exercises;
    if (ex && typeof ex === 'object' && !Array.isArray(ex)) {
      for (const [g, list] of Object.entries(ex)) {
        if (!BAD_KEYS.has(g) && Array.isArray(list)) out.custom.exercises[g] = list.filter((x) => typeof x === 'string');
      }
    }
  }
  return out;
}

const uniqSorted = (list) => [...new Set(list)].sort((a, b) => a.localeCompare(b));

// Combine two copies of the data (phone + GitHub, or phone + imported file).
// Sessions are matched by id; deletions win; newest edit wins.
function mergeData(a, b) {
  a = normalize(a); b = normalize(b);
  const deleted = {};
  for (const src of [a.deleted, b.deleted]) {
    for (const [id, t] of Object.entries(src)) if (!deleted[id] || t > deleted[id]) deleted[id] = t;
  }
  const byId = new Map();
  for (const s of [...a.sessions, ...b.sessions]) {
    if (deleted[s.id]) continue;
    const cur = byId.get(s.id);
    // newest edit wins; on an exact tie pick deterministically so every device converges
    if (!cur || (s.updatedAt || '') > (cur.updatedAt || '') ||
      ((s.updatedAt || '') === (cur.updatedAt || '') && JSON.stringify(s) > JSON.stringify(cur))) byId.set(s.id, s);
  }
  const sessions = [...byId.values()].sort((x, y) =>
    x.start < y.start ? -1 : x.start > y.start ? 1 : x.id < y.id ? -1 : 1);
  const sortedDeleted = {};
  for (const id of Object.keys(deleted).sort()) sortedDeleted[id] = deleted[id];
  const exercises = {};
  for (const g of uniqSorted([...Object.keys(a.custom.exercises), ...Object.keys(b.custom.exercises)])) {
    exercises[g] = uniqSorted([...(own(a.custom.exercises, g) ? a.custom.exercises[g] : []), ...(own(b.custom.exercises, g) ? b.custom.exercises[g] : [])]);
  }
  return {
    version: 1,
    sessions,
    deleted: sortedDeleted,
    custom: { cardio: uniqSorted([...a.custom.cardio, ...b.custom.cardio]), exercises },
  };
}

let data = emptyData();
let settings = load(K.settings, null) || {};
let names = load(K.names, null) || {};
const nameOf = (p) => (typeof names[p.id] === 'string' && names[p.id].trim()) || p.name;
let syncState = {};
let view = { name: 'profiles' };

function commit() {
  store(pkey('data'), data);
  scheduleSync();
}

const getActive = () => (profile ? load(pkey('active'), null) : null);
const setActive = (a) => store(pkey('active'), a);
const profileName = () => { const p = PROFILES.find((x) => x.id === profile); return p ? nameOf(p) : ''; };

function selectProfile(id) {
  profile = id;
  data = mergeData(load(pkey('data'), null), null);
  syncState = load(pkey('sync'), null) || {};
  document.documentElement.dataset.profile = id;
  go('home');
  sync();
}

/* =========================================================
   Helpers
   ========================================================= */
const $app = document.getElementById('app');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nowISO = () => new Date().toISOString();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const parseNum = (v) => { const n = parseFloat(String(v).trim().replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const pad = (n) => String(n).padStart(2, '0');

const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
function fmtShortDate(iso) {
  const d = new Date(iso), today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function fmtDur(ms) {
  const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60);
  return h ? `${h} h ${pad(m % 60)} min` : `${m} min`;
}
function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
const fmtNum = (n) => String(Math.round(n * 100) / 100);
const fmtKg = (kg) => (kg ? `${fmtNum(kg)} kg` : 'Bodyweight');
// The day a workout is logged under: the local date when you press Finish (YYYY-MM-DD).
const localDay = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
// Older sessions have no saved day, so fall back to the start time.
const dayOf = (s) => (s.day ? new Date(s.day + 'T12:00:00') : new Date(s.start));
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const durMs = (s) => Date.parse(s.end) - Date.parse(s.start);
function pace(ms, km) {
  if (!km || ms < 60000) return '–';
  const total = Math.round(ms / 1000 / km);
  return `${Math.floor(total / 60)}:${pad(total % 60)} /km`;
}
const speed = (ms, km) => (km && ms >= 60000 ? `${(km / (ms / 3600000)).toFixed(1)} km/h` : '–');
// Warm-up sets are logged but don't count toward working sets or volume.
const isWork = (set) => !set.warmup;
const totalSets = (s) => s.exercises.reduce((n, e) => n + e.sets.filter(isWork).length, 0);
const warmupSets = (s) => s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.warmup).length, 0);
const setLabels = (sets) => { let n = 0; return sets.map((x) => (x.warmup ? 'W' : String(++n))); };
const setText = (set) => `${fmtKg(set.kg)} × ${set.reps}${set.warmup ? ' <small class="muted">warm-up</small>' : ''}${set.failure ? ' <small class="fail-tag">to failure</small>' : ''}`;
const PLATES = [1.25, 2.5, 5, 10, 15, 20];
const setBadge = (label) => `<span class="set-n${label === 'W' ? ' warm' : ''}">${label}</span>`;
const volume = (s) => s.exercises.reduce((v, e) => v + e.sets.filter(isWork).reduce((x, set) => x + (set.kg || 0) * set.reps, 0), 0);

function sessionTitle(s) {
  if (s.type === 'cardio') return s.activity;
  const groups = [...new Set(s.exercises.map((e) => e.group))];
  return groups.length ? groups.join(' · ') : 'Weightlifting';
}
const sortedDesc = () => [...data.sessions].sort((a, b) => (a.start < b.start ? 1 : -1));

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* =========================================================
   Views
   ========================================================= */
function topBar(title, backAttrs, right = '') {
  return `<div class="top">
    ${backAttrs ? `<button class="back" ${backAttrs}>‹ Back</button>` : ''}
    <h1 class="${backAttrs ? 'small' : ''}">${esc(title)}</h1>${right}
  </div>`;
}

function sessionRow(s) {
  const sub = s.type === 'cardio'
    ? [hasDist(s) ? `${fmtNum(s.distanceKm)} km` : null, fmtDur(durMs(s)), s.intensity].filter(Boolean).join(' · ')
    : `${s.exercises.length} exercise${s.exercises.length === 1 ? '' : 's'} · ${totalSets(s)} sets`;
  return `<button class="row" data-action="go" data-to="detail" data-id="${esc(s.id)}">
    <span class="row-icon ${esc(s.type)}">${s.type === 'cardio' ? activityVisual(s.activity, 28) : '🏋️'}</span>
    <span class="row-main"><span class="row-title">${esc(sessionTitle(s))}</span><span class="row-sub">${esc(sub)}</span></span>
    <span class="row-meta">${fmtShortDate(dayOf(s))}</span>
  </button>`;
}

// The most recent saved session that included this exercise (for progressive overload).
function lastTime(name) {
  let best = null;
  for (const s of data.sessions) {
    if (s.type !== 'weights') continue;
    const ex = s.exercises.find((e) => e.name === name);
    if (!ex || !ex.sets.length) continue;
    if (!best || dayOf(s) > dayOf(best.session) || (+dayOf(s) === +dayOf(best.session) && s.start > best.session.start)) best = { session: s, ex };
  }
  return best;
}

// ---- Smart ordering: what you did most in the last 7 days goes first ----
// Ranking: times used in the last 7 days (rolling), then most recently used, then the default order.
function usageStats(pick) {
  const cutoff = Date.now() - 7 * 86400000;
  const stats = new Map();
  for (const s of data.sessions) {
    const t = Date.parse(s.start);
    for (const name of new Set(pick(s))) {
      const st = stats.get(name) || { week: 0, last: 0 };
      if (t >= cutoff) st.week++;
      if (t > st.last) st.last = t;
      stats.set(name, st);
    }
  }
  return stats;
}
function rankByUsage(names, stats) {
  const st = (n) => stats.get(n) || { week: 0, last: 0 };
  return names.map((n, i) => ({ n, i }))
    .sort((a, b) => st(b.n).week - st(a.n).week || st(b.n).last - st(a.n).last || a.i - b.i)
    .map((x) => x.n);
}
const weekLabel = (stats, n) => {
  const w = (stats.get(n) || {}).week || 0;
  return w ? `${w}× this week` : '';
};

// Product photo of the machine; falls back to a line icon for anything without one.
function activityVisual(name, iconSize) {
  const m = CARDIO_META[name];
  return m && m.img
    ? `<img class="photo" src="images/${m.img}" alt="${esc(name)}" onerror="this.onerror=null;this.outerHTML=machineIcon(this.alt,${Math.max(iconSize, 48)})">`
    : machineIcon(name, iconSize);
}

// Little body figure with the trained muscle lit up. Chest/shoulders/biceps/quads/core/forearm/neck
// are drawn from the front; back/triceps/hamstrings/glutes/calves from behind.
const ln = (x1, y1, x2, y2, w) => `<line class="h" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w}"/>`;
const MUSCLE_HL = {
  Chest: `<path class="h" d="M15 17 L33 17 L32 25 L16 25 Z"/>`,
  Back: `<path class="h" d="M14.5 16 L33.5 16 L31 30 L17 30 Z"/>`,
  Shoulders: `<circle class="h" cx="12" cy="17" r="4.5"/><circle class="h" cx="36" cy="17" r="4.5"/>`,
  Biceps: ln(10, 19, 8, 27, 5.5) + ln(38, 19, 40, 27, 5.5),
  Triceps: ln(10, 19, 8, 27, 5.5) + ln(38, 19, 40, 27, 5.5),
  Quads: ln(20, 36, 19.5, 48, 8.5) + ln(28, 36, 28.5, 48, 8.5),
  Hamstrings: ln(20, 41, 19.5, 50, 8.5) + ln(28, 41, 28.5, 50, 8.5),
  Glutes: `<circle class="h" cx="20.5" cy="36" r="5.5"/><circle class="h" cx="27.5" cy="36" r="5.5"/>`,
  Calves: ln(19.5, 52, 19.2, 60, 6.5) + ln(28.5, 52, 28.8, 60, 6.5),
  Core: `<path class="h" d="M18.5 26 L29.5 26 L29 33 L19 33 Z"/>`,
  Forearm: ln(7, 31, 5, 41, 5.5) + ln(41, 31, 43, 41, 5.5),
  Neck: ln(24, 10.5, 24, 15.5, 6.5) + `<path class="h" d="M18 15 L30 15 L33 18 L15 18 Z"/>`,
};
const MUSCLE_BACK = new Set(['Back', 'Triceps', 'Hamstrings', 'Glutes', 'Calves']); // drawn from behind: shows a spine line
const muscleIcon = (group) => `<svg class="mus" viewBox="0 0 48 64" role="img" aria-label="${esc(group)}">
  <circle class="b" cx="24" cy="7" r="5"/>
  <path class="b" d="M13 15 L35 15 L32 33 L16 33 Z"/>
  <line class="b" x1="11" y1="17" x2="7" y2="29" stroke-width="5"/><line class="b" x1="7" y1="29" x2="5" y2="42" stroke-width="5"/>
  <line class="b" x1="37" y1="17" x2="41" y2="29" stroke-width="5"/><line class="b" x1="41" y1="29" x2="43" y2="42" stroke-width="5"/>
  <line class="b" x1="20" y1="35" x2="19" y2="48" stroke-width="8.5"/><line class="b" x1="19" y1="48" x2="19" y2="61" stroke-width="6.5"/>
  <line class="b" x1="28" y1="35" x2="29" y2="48" stroke-width="8.5"/><line class="b" x1="29" y1="48" x2="29" y2="61" stroke-width="6.5"/>
  ${MUSCLE_HL[group] || ''}
  ${MUSCLE_BACK.has(group) ? '<line class="spine" x1="24" y1="15.5" x2="24" y2="33"/>' : ''}
</svg>`;

// Cartoon avatars for the profile buttons.
const AVATARS = {
  pink: `<svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="M82 40 C102 38 108 64 94 84 C94 68 88 58 80 52 Z" fill="#4a2c1a"/>
    <circle cx="60" cy="42" r="26" fill="#4a2c1a"/>
    <path d="M20 120 C20 92 38 84 60 84 C82 84 100 92 100 120 Z" fill="#ff4fa3"/>
    <rect x="52" y="66" width="16" height="22" rx="6" fill="#f2c6a0"/>
    <ellipse cx="60" cy="50" rx="19" ry="22" fill="#f2c6a0"/>
    <path d="M40 46 C42 24 78 24 80 46 C72 37 52 36 40 46Z" fill="#4a2c1a"/>
    <rect x="39" y="34" width="42" height="6" rx="3" fill="#ff4fa3" transform="rotate(-4 60 37)"/>
    <circle cx="52" cy="52" r="2.2" fill="#2a1a12"/><circle cx="68" cy="52" r="2.2" fill="#2a1a12"/>
    <path d="M53 61 Q60 67 67 61" stroke="#c4566b" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M44 91 Q60 105 76 91" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`,
  iron: `<svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="M24 84 L96 84 L102 120 L18 120 Z" fill="#2b2f38"/>
    <path d="M48 68 L22 86 L98 86 L72 68 Z" fill="#c98a5c"/>
    <rect x="49" y="62" width="22" height="24" rx="8" fill="#c98a5c"/>
    <rect x="2" y="80" width="34" height="17" rx="8.5" fill="#c98a5c"/>
    <rect x="2" y="42" width="17" height="52" rx="8.5" fill="#c98a5c"/>
    <circle cx="11" cy="38" r="10" fill="#c98a5c"/>
    <circle cx="24" cy="80" r="12" fill="#d99a6b"/>
    <rect x="84" y="80" width="34" height="17" rx="8.5" fill="#c98a5c"/>
    <rect x="101" y="42" width="17" height="52" rx="8.5" fill="#c98a5c"/>
    <circle cx="109" cy="38" r="10" fill="#c98a5c"/>
    <circle cx="96" cy="80" r="12" fill="#d99a6b"/>
    <ellipse cx="60" cy="46" rx="18" ry="21" fill="#c98a5c"/>
    <path d="M41 44 C40 20 80 20 79 44 C72 33 48 33 41 44Z" fill="#241710"/>
    <path d="M42 54 C44 72 76 72 78 54 C74 62 46 62 42 54Z" fill="#3a251a"/>
    <path d="M47 46 L55 49 M73 46 L65 49" stroke="#241710" stroke-width="3" stroke-linecap="round"/>
    <path d="M52 60 Q60 65 68 60" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`,
};

const VIEWS = {
  profiles() {
    return `<div class="splash">
      <div class="brand">
        <div class="brand-top">★ EST. 2026 ★</div>
        <h1 class="brand-name">SWEAT <span>&amp;</span> IRON</h1>
        <div class="brand-sub">PUMP GYM</div>
        <div class="brand-tag">NO PAIN · NO GAIN</div>
      </div>
      <p class="who">WHO'S LIFTING TODAY?</p>
      ${PROFILES.map((p) => `<button class="profile ${p.id}" data-action="selectProfile" data-id="${p.id}">
        <span class="avatar">${AVATARS[p.id]}</span><span class="p-name">${esc(nameOf(p))}</span></button>`).join('')}
      <button class="link center" data-action="editNames">✏️ Edit names</button>
    </div>`;
  },

  home() {
    const a = getActive();
    const recent = sortedDesc().slice(0, 5);
    let resume = '';
    if (a) {
      const what = a.kind === 'cardio' ? a.activity : 'Weightlifting';
      resume = `<button class="resume" data-action="resume">
        <div><b>${esc(what)} in progress</b><span>${a.kind === 'cardio' ? `Started ${fmtTime(a.start)} · <span data-since="${esc(a.start)}">${fmtClock(Date.now() - Date.parse(a.start))}</span>` : `${a.exercises.length} exercise${a.exercises.length === 1 ? '' : 's'} so far`}</span></div>
        <span class="go">Resume ›</span></button>`;
    }
    return `<div class="top">
        <div class="head"><h1 class="brand-h">SWEAT <span>&amp;</span> IRON</h1><div class="brand-h-sub">PUMP GYM · ${esc(profileName().toUpperCase())}</div></div>
        <button class="icon-btn" data-action="switchProfile" aria-label="Switch person">👥</button>
        <button class="icon-btn" data-action="go" data-to="settings" aria-label="Settings">⚙️</button>
      </div>
      ${resume}
      <div class="choices">
        <button class="choice cardio" data-action="chooseCardio"><span>Cardio</span></button>
        <button class="choice weights" data-action="chooseWeights"><span>Weightlifting</span></button>
      </div>
      <div class="section-head"><h2>Recent</h2>${data.sessions.length ? '<button class="link" data-action="go" data-to="history">See all</button>' : ''}</div>
      ${recent.length ? `<div class="list">${recent.map(sessionRow).join('')}</div>` : '<div class="empty">No workouts yet. Pick Cardio or Weightlifting to start.</div>'}
      <p class="sync-status" data-sync-status>${esc(syncText())}</p>`;
  },

  /* ---------- Cardio ---------- */
  cardioPick() {
    const stats = usageStats((s) => (s.type === 'cardio' ? [s.activity] : []));
    return `${topBar(view.past ? 'Log past cardio' : 'Cardio', 'data-action="go" data-to="home"')}
      <p class="hint">${view.past ? 'Pick the activity you did, then enter the times.' : 'Pick an activity. The timer starts right away.'} Your most-used this week come first.</p>
      <div class="grid">
        ${rankByUsage(CARDIO, stats).map((n) => `<button class="tile photo-tile" data-action="pickCardio" data-name="${esc(n)}">
          <span class="photo-wrap">${activityVisual(n, 40)}</span><span class="photo-name">${esc(n)}<span class="use">${weekLabel(stats, n)}</span></span></button>`).join('')}
      </div>
      <button class="btn soft-orange" data-action="togglePast">${view.past ? 'Start a live session instead' : 'Log a past session'}</button>`;
  },

  cardioActive() {
    const a = getActive();
    return `${topBar('Cardio', '')}
      <div class="card live">
        <div class="live-icon">${activityVisual(a.activity, 72)}</div>
        <div class="live-label">${esc(a.activity)}</div>
        <div class="clock" data-since="${esc(a.start)}">${fmtClock(Date.now() - Date.parse(a.start))}</div>
        <div class="muted">Started at ${fmtTime(a.start)}</div>
      </div>
      <button class="btn primary big" data-action="cardioStop">Finish</button>
      <button class="btn ghost" data-action="go" data-to="home">Back to home (timer keeps running)</button>
      <button class="link danger center" data-action="discard">Discard session</button>`;
  },

  cardioFinish() {
    const past = !!view.past;
    const a = getActive();
    const activity = past ? view.activity : a.activity;
    let times;
    if (past) {
      const end = new Date(), start = new Date(end.getTime() - 30 * 60000);
      times = `<div class="field"><label for="c-start">Start</label><input type="datetime-local" id="c-start" value="${toLocalInput(start)}"></div>
        <div class="field"><label for="c-end">End</label><input type="datetime-local" id="c-end" value="${toLocalInput(end)}"></div>`;
    } else {
      times = `<p class="hint" style="margin:0 0 12px">📅 ${esc(fmtDate(a.end))}</p><div class="summary">
        <div><span>Start</span><b>${fmtTime(a.start)}</b></div>
        <div><span>End</span><b>${fmtTime(a.end)}</b></div>
        <div><span>Time</span><b>${fmtDur(Date.parse(a.end) - Date.parse(a.start))}</b></div></div>`;
    }
    const head = past
      ? topBar(activity, 'data-action="go" data-to="cardioPick" data-past="1"')
      : topBar(`${activity} done 🎉`, '');
    const meta = cardioMeta(activity);
    const distField = hasDistance(activity)
      ? `<div class="field"><label for="c-dist">Distance</label>
          <div class="with-unit"><input id="c-dist" inputmode="decimal" placeholder="0.0" autocomplete="off"><span>km</span></div></div>` : '';
    const machineFields = meta.fields.length
      ? `<div class="field-title">${esc(activity)} settings <span>(optional)</span></div>` + meta.fields.map((f) =>
        `<div class="field"><label for="f-${f.k}">${esc(f.l)}</label>
          <div class="with-unit"><input id="f-${f.k}" inputmode="${f.text ? 'text' : 'decimal'}" placeholder="${esc(f.ph || '')}" autocomplete="off"><span>${esc(f.u)}</span></div></div>`).join('')
      : '';
    return `${head}
      <div class="card">
        ${times}
        ${distField}
        ${machineFields}
        <div class="field"><label>Intensity</label>
          <div class="seg">${INTENSITY.map((i) => `<label class="i-${i.toLowerCase()}"><input type="radio" name="intensity" value="${i}"><span>${i}</span></label>`).join('')}</div></div>
        <div class="field"><label for="c-note">Note (optional)</label><input id="c-note" type="text" placeholder="e.g. intervals, incline 5%"></div>
      </div>
      <button class="btn primary big" data-action="cardioSave">Save</button>
      ${past ? '' : '<button class="btn ghost" data-action="cardioBackToTimer">Oops, not finished yet</button>'}`;
  },

  /* ---------- Weightlifting ---------- */
  weightsActive() {
    const a = getActive();
    const exHtml = a.exercises.map((ex) => {
      const open = a.open === ex.id;
      const last = ex.sets[ex.sets.length - 1];
      const labels = setLabels(ex.sets);
      const work = ex.sets.filter(isWork).length, warm = ex.sets.length - work;
      const sets = ex.sets.map((s, i) => `<li>${setBadge(labels[i])}
        <span class="set-v">${setText(s)}</span>
        <button class="x" data-action="removeSet" data-id="${ex.id}" data-idx="${i}" aria-label="Delete set">✕</button></li>`).join('');
      const input = open ? `<div class="set-input">
          <div class="with-unit"><input id="kg-${ex.id}" inputmode="decimal" placeholder="0" value="${last ? esc(last.kg || '') : ''}" autocomplete="off"><span>kg</span></div>
          <span class="times">×</span>
          <div class="with-unit"><input id="reps-${ex.id}" inputmode="numeric" placeholder="0" value="${last ? esc(last.reps) : ''}" autocomplete="off"><span>reps</span></div>
          <button class="fail-toggle" id="fail-${ex.id}" data-action="toggleFail" aria-pressed="false" aria-label="Set taken to failure">F</button>
          <div class="plates" role="group" aria-label="Add plates to the weight">
            ${PLATES.map((pl) => `<button class="plate p${String(pl).replace('.', '_')}" data-action="addPlate" data-id="${ex.id}" data-kg="${pl}" aria-label="Add ${pl} kg"><b>${pl}</b></button>`).join('')}
            </div>
          <button class="plate-clear" data-action="clearKg" data-id="${ex.id}" aria-label="Clear weight">Clear</button>
          <div class="plate-hint">Tap plates to add them to the kg total</div>
          <button class="warm-toggle" id="warm-${ex.id}" data-action="toggleWarm" aria-pressed="false">🔥 Warm-up set</button>
          <button class="btn purple" data-action="addSet" data-id="${ex.id}">Add set ${work + 1}</button>
        </div>
        <div class="ex-foot"><button class="link danger small" data-action="removeEx" data-id="${ex.id}">Remove exercise</button></div>` : '';
      return `<div class="card ex ${open ? 'open' : ''}" id="ex-${ex.id}">
        <button class="ex-head" data-action="toggleEx" data-id="${ex.id}">
          <div><div class="ex-name">${esc(ex.name)}</div><div class="muted small">${esc(ex.group)} · ${work} set${work === 1 ? '' : 's'}${warm ? ` + ${warm} warm-up` : ''}</div></div>
          <span class="chev">›</span></button>
        ${sets ? `<ol class="sets">${sets}</ol>` : ''}
        ${input}
      </div>`;
    }).join('');
    return `${topBar('Weightlifting', '')}
      ${exHtml || '<div class="empty">No exercises yet. Add your first one.</div>'}
      <div class="btn-pair">
        <button class="btn blue" data-action="go" data-to="groupPick">+ Add exercise</button>
        <button class="btn red" data-action="finishWeights">Finish workout</button>
      </div>
      <div class="btn-pair spaced">
        <button class="btn ghost" data-action="go" data-to="home">Back to home</button>
        <button class="btn ghost danger-outline" data-action="discard">Discard workout</button>
      </div>
      ${a.exercises.length ? `<h2>Last time</h2>${a.exercises.map((ex) => {
        const last = lastTime(ex.name);
        if (!last) return `<div class="card detail-ex"><h3>${esc(ex.name)}</h3><div class="muted small">First time. Nothing logged before.</div></div>`;
        const l = setLabels(last.ex.sets);
        return `<div class="card detail-ex"><h3>${esc(ex.name)}</h3><div class="muted small">Last time: ${esc(fmtDate(dayOf(last.session)))}</div>
          <ol class="sets">${last.ex.sets.map((set, i) => `<li>${setBadge(l[i])}<span class="set-v">${setText(set)}</span></li>`).join('')}</ol></div>`;
      }).join('')}` : ''}`;
  },

  groupPick() {
    const stats = usageStats((s) => (s.type === 'weights' ? s.exercises.map((e) => e.group) : []));
    return `${topBar('Muscle group', 'data-action="go" data-to="weightsActive"')}
      <div class="grid">${Object.keys(GROUPS).map((g) => `<button class="tile group-tile" data-action="pickGroup" data-group="${esc(g)}"><span class="g-name">${esc(g)}<span class="use">${weekLabel(stats, g)}</span></span>${muscleIcon(g)}</button>`).join('')}</div>`;
  },

  exercisePick() {
    const g = view.group;
    const a = getActive();
    const done = new Set(a.exercises.map((e) => e.name));
    const custom = (data.custom.exercises[g] || []).filter((n) => !GROUPS[g].includes(n));
    const stats = usageStats((s) => (s.type === 'weights' ? s.exercises.filter((e) => e.group === g).map((e) => e.name) : []));
    const list = rankByUsage([...GROUPS[g], ...custom], stats);
    return `${topBar(g, 'data-action="go" data-to="groupPick"')}
      <div class="list">${list.map((n) => `<button class="row" data-action="pickExercise" data-name="${esc(n)}">
        <span class="row-main"><span class="row-title">${esc(n)}</span>${weekLabel(stats, n) ? `<span class="row-sub use">${weekLabel(stats, n)}</span>` : ''}</span>${done.has(n) ? '<span class="check">✓</span>' : ''}</button>`).join('')}</div>
      <button class="btn ghost" data-action="addExercise">+ Add your own ${esc(g.toLowerCase())} exercise</button>`;
  },

  /* ---------- History ---------- */
  history() {
    const all = sortedDesc();
    let html = '', day = '', open = false;
    for (const s of all) {
      const d = dayOf(s).toDateString();
      if (d !== day) {
        if (open) html += '</div>';
        html += `<div class="day-label">${esc(fmtDate(dayOf(s)))}</div><div class="list">`;
        day = d; open = true;
      }
      html += sessionRow(s);
    }
    if (open) html += '</div>';
    return `${topBar('History', 'data-action="go" data-to="home"')}
      ${html || '<div class="empty">Nothing logged yet.</div>'}`;
  },

  detail() {
    const s = data.sessions.find((x) => x.id === view.id);
    if (!s) return VIEWS.history();
    const ms = durMs(s);
    let body;
    if (s.type === 'cardio') {
      const vals = s.settings || {};
      const machine = cardioMeta(s.activity).fields.filter((f) => vals[f.k] != null && vals[f.k] !== '')
        .map((f) => `<div class="stat"><span>${esc(f.l)}</span><b>${esc(vals[f.k])} ${esc(f.u)}</b></div>`).join('');
      body = `${cardioMeta(s.activity).img ? `<div class="detail-photo">${activityVisual(s.activity, 80)}</div>` : ''}
        <div class="stats">
          ${hasDist(s) ? `<div class="stat"><span>Distance</span><b>${fmtNum(s.distanceKm)} km</b></div>` : ''}
          <div class="stat"><span>Duration</span><b>${fmtDur(ms)}</b></div>
          ${hasDist(s) ? `<div class="stat"><span>Pace</span><b>${pace(ms, s.distanceKm)}</b></div>
          <div class="stat"><span>Speed</span><b>${speed(ms, s.distanceKm)}</b></div>` : ''}
          <div class="stat"><span>Time</span><b>${fmtTime(s.start)}–${fmtTime(s.end)}</b></div>
          <div class="stat"><span>Intensity</span><b><span class="badge ${esc(s.intensity.toLowerCase())}">${esc(s.intensity)}</span></b></div>
          ${machine}
        </div>
        ${s.note ? `<div class="card"><div class="muted small">Note</div>${esc(s.note)}</div>` : ''}`;
    } else {
      body = `<div class="stats">
          <div class="stat"><span>Working sets</span><b>${totalSets(s)}</b></div>
          ${warmupSets(s) ? `<div class="stat"><span>Warm-up sets</span><b>${warmupSets(s)}</b></div>` : ''}
          <div class="stat"><span>Volume</span><b>${fmtNum(volume(s))} kg</b></div>
        </div>
        ${s.exercises.map((e) => `<div class="card detail-ex"><h3>${esc(e.name)}</h3><div class="muted small">${esc(e.group)}</div>
          <ol class="sets">${(() => { const l = setLabels(e.sets); return e.sets.map((set, i) => `<li>${setBadge(l[i])}<span class="set-v">${setText(set)}</span></li>`).join(''); })()}</ol></div>`).join('')}`;
    }
    return `${topBar(sessionTitle(s), 'data-action="go" data-to="history"')}
      <p class="hint">📅 ${esc(fmtDate(dayOf(s)))}</p>
      ${body}
      <button class="link danger center" data-action="deleteSession" data-id="${esc(s.id)}">Delete this session</button>`;
  },

  /* ---------- Settings ---------- */
  settings() {
    const g = settings.github || {};
    const attrs = 'type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off"';
    return `${topBar('Settings', 'data-action="go" data-to="home"')}
      <h2>GitHub backup</h2>
      <div class="card">
        <p class="hint" style="margin:0 0 14px">Workouts are saved on this phone and copied to a private GitHub repo whenever you're online.</p>
        <div class="field"><label for="gh-owner">GitHub username</label><input id="gh-owner" ${attrs} value="${esc(g.owner)}" placeholder="your-username"></div>
        <div class="field"><label for="gh-repo">Private repo name</label><input id="gh-repo" ${attrs} value="${esc(g.repo)}" placeholder="gym-data"></div>
        <div class="field"><label for="gh-branch">Branch</label><input id="gh-branch" ${attrs} value="${esc(g.branch || 'main')}"></div>
        <div class="field"><label for="gh-token">Access token</label><input id="gh-token" type="password" autocomplete="off" value="${esc(g.token)}" placeholder="github_pat_…"></div>
        <button class="btn primary" data-action="saveGithub">Save & sync now</button>
        <p class="sync-status" data-sync-status>${esc(syncText())}</p>
        ${g.token ? '<button class="link danger center" data-action="disconnectGithub">Disconnect GitHub</button>' : ''}
      </div>
      <h2>Export & backup</h2>
      <div class="card">
        <button class="btn" data-action="exportData" style="margin-top:0">Export workouts (CSV)</button>
        <p class="hint" style="margin:8px 2px 14px">For spreadsheets. Save it to Files / iCloud Drive.</p>
        <button class="btn ghost" data-action="exportBackup">Save backup file (JSON)</button>
        <button class="btn ghost" data-action="importData">Restore from a backup file</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </div>
      <p class="muted small" style="text-align:center">${APP_NAME} v${VERSION} · ${data.sessions.length} sessions for ${esc(profileName())}</p>`;
  },
};

/* =========================================================
   Rendering & timers
   ========================================================= */
function render() {
  if (!profile) view = { name: 'profiles' };
  if (!VIEWS[view.name]) view = { name: 'home' };
  // Views that need an active workout fall back to home if there isn't one.
  const a = getActive();
  const needs = { cardioActive: 'cardio', weightsActive: 'weights', groupPick: 'weights', exercisePick: 'weights' };
  if (needs[view.name] && (!a || a.kind !== needs[view.name])) view = { name: 'home' };
  if (view.name === 'cardioFinish' && !view.past && !(a && a.kind === 'cardio' && a.end)) view = { name: 'home' };
  try {
    $app.innerHTML = VIEWS[view.name]();
  } catch (err) {
    console.error(err);
    $app.innerHTML = `<div class="card" style="margin-top:40px;text-align:center"><h2 style="margin:0 0 8px">Something went wrong</h2>
      <p class="hint">${esc(err && err.message)}</p><button class="btn primary" data-action="resetView">Back to start</button></div>`;
    return;
  }
  if (view.focus) {
    document.getElementById('ex-' + view.focus)?.scrollIntoView({ block: 'center' });
    delete view.focus;
  }
}

function go(name, params = {}) {
  view = { name, ...params };
  window.scrollTo(0, 0);
  render();
}

setInterval(() => {
  const now = Date.now();
  document.querySelectorAll('[data-since]').forEach((el) => { el.textContent = fmtClock(now - Date.parse(el.dataset.since)); });
}, 1000);

/* =========================================================
   Actions
   ========================================================= */
function resume() {
  const a = getActive();
  if (!a) return go('home');
  if (a.kind === 'cardio') return go(a.end ? 'cardioFinish' : 'cardioActive');
  return go('weightsActive');
}

// ---- Export ----
const todayStr = () => localDay(nowISO());

// One row per cardio session and one row per weightlifting set (weightlifting rows carry no times).
function buildCsv() {
  const cell = (v, text) => {
    if (v == null) return '';
    let t = String(v);
    if (text && /^[=+\-@\t\r]/.test(t)) t = "'" + t; // stop spreadsheets from running text as a formula
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const head = ['Date', 'Person', 'Type', 'Exercise / Activity', 'Muscle group', 'Set', 'Set type', 'Weight (kg)', 'Reps', 'To failure',
    'Distance (km)', 'Start', 'End', 'Duration (min)', 'Intensity', 'Machine settings', 'Note'];
  const rows = [];
  const sessions = [...data.sessions].sort((a, b) => (dayOf(a) - dayOf(b)) || (a.start < b.start ? -1 : 1));
  for (const s of sessions) {
    const date = localDay(dayOf(s));
    if (s.type === 'cardio') {
      const vals = s.settings || {};
      const machine = cardioMeta(s.activity).fields.filter((f) => vals[f.k] != null && vals[f.k] !== '')
        .map((f) => `${f.l} ${vals[f.k]} ${f.u}`.trim()).join('; ');
      rows.push([date, profileName(), 'Cardio', s.activity, '', '', '', '', '', '', hasDist(s) ? s.distanceKm : '',
        fmtTime(s.start), fmtTime(s.end), Math.round(durMs(s) / 60000), s.intensity, machine, s.note || ''].map((v, i) => cell(v, [1, 3, 14, 15, 16].includes(i))));
    } else {
      for (const e of s.exercises) {
        e.sets.forEach((set, i) => rows.push([date, profileName(), 'Weightlifting', e.name, e.group, i + 1,
          set.warmup ? 'Warm-up' : 'Working', set.kg, set.reps, set.failure ? 'Yes' : 'No', '', '', '', '', '', '', ''].map((v, j) => cell(v, [1, 3, 4].includes(j)))));
      }
    }
  }
  return [head.join(','), ...rows.map((r) => r.join(','))].join('\r\n') + '\r\n';
}

// Opens the iPhone share sheet (Save to Files / iCloud Drive) or downloads the file on a computer.
async function saveFile(name, text, type, title) {
  const file = new File([text], name, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const ACTIONS = {
  go: (d) => go(d.to, { id: d.id, past: d.past === '1' }),
  resume,
  selectProfile: (d) => selectProfile(d.id),
  resetView: () => ACTIONS.switchProfile(),
  editNames() {
    for (const p of PROFILES) {
      const v = prompt(`Name for the ${p.id === 'pink' ? 'pink (top)' : 'strong (bottom)'} button`, nameOf(p));
      if (v === null) return; // cancelled
      const t = v.trim().slice(0, 20);
      if (t) names[p.id] = t;
    }
    store(K.names, names);
    render();
  },
  switchProfile() {
    document.getElementById('toast').hidden = true;
    profile = null;
    data = emptyData();
    syncState = {};
    delete document.documentElement.dataset.profile;
    go('profiles');
  },

  chooseCardio() {
    if (getActive()) { toast('Finish your current workout first'); return resume(); }
    go('cardioPick', { past: false });
  },
  chooseWeights() {
    if (getActive()) { toast('Finish your current workout first'); return resume(); }
    setActive({ kind: 'weights', start: nowISO(), exercises: [], open: null });
    go('groupPick');
  },
  discard() {
    if (!confirm('Discard this workout? Nothing will be saved.')) return;
    setActive(null);
    go('home');
  },

  /* Cardio */
  togglePast: () => go('cardioPick', { past: !view.past }),
  pickCardio(d) {
    if (view.past) return go('cardioFinish', { past: true, activity: d.name });
    setActive({ kind: 'cardio', activity: d.name, start: nowISO() });
    go('cardioActive');
  },
  cardioStop() {
    const a = getActive();
    a.end = nowISO();
    setActive(a);
    go('cardioFinish');
  },
  cardioBackToTimer() {
    const a = getActive();
    delete a.end;
    setActive(a);
    go('cardioActive');
  },
  cardioSave() {
    const past = !!view.past;
    const a = getActive();
    let start, end;
    if (past) {
      const s = document.getElementById('c-start').value, e = document.getElementById('c-end').value;
      if (!s || !e) return toast('Enter start and end time');
      start = new Date(s).toISOString(); end = new Date(e).toISOString();
    } else { start = a.start; end = a.end; }
    if (Date.parse(end) <= Date.parse(start)) return toast('End must be after start');
    const activity = past ? view.activity : a.activity;
    let distanceKm;
    if (hasDistance(activity)) {
      distanceKm = parseNum(document.getElementById('c-dist').value);
      if (!(distanceKm >= 0)) return toast('Enter the distance in km');
    }
    const machine = {};
    for (const f of cardioMeta(activity).fields) {
      const raw = document.getElementById('f-' + f.k).value.trim();
      if (!raw) continue;
      if (f.text) { machine[f.k] = raw; continue; }
      const n = parseNum(raw);
      if (!(n >= 0)) return toast(`${f.l} must be a number`);
      machine[f.k] = n;
    }
    const intensity = document.querySelector('input[name="intensity"]:checked')?.value;
    if (!intensity) return toast('Pick an intensity');
    const note = document.getElementById('c-note').value.trim();
    const session = {
      id: uid(), type: 'cardio', activity, start, end, day: localDay(end),
      ...(distanceKm != null ? { distanceKm } : {}),
      intensity,
      ...(Object.keys(machine).length ? { settings: machine } : {}),
      ...(note ? { note } : {}), updatedAt: nowISO(),
    };
    data.sessions.push(session);
    commit();
    if (!past) setActive(null);
    toast('Cardio saved ✓');
    go('detail', { id: session.id });
  },

  /* Weightlifting */
  toggleFail(d, el) {
    const on = el.classList.toggle('on');
    el.setAttribute('aria-pressed', String(on));
  },
  addPlate(d) {
    const input = document.getElementById('kg-' + d.id);
    const cur = parseNum(input.value);
    const total = Math.round(((cur >= 0 ? cur : 0) + Number(d.kg)) * 100) / 100;
    input.value = String(total);
  },
  clearKg(d) { document.getElementById('kg-' + d.id).value = ''; },
  toggleWarm(d, el) {
    const on = el.classList.toggle('on');
    el.setAttribute('aria-pressed', String(on));
  },
  pickGroup: (d) => go('exercisePick', { group: d.group }),
  addExercise() {
    const g = view.group;
    const name = (prompt(`New ${g.toLowerCase()} exercise`) || '').trim();
    if (!name) return;
    const list = data.custom.exercises[g] || (data.custom.exercises[g] = []);
    if (!GROUPS[g].includes(name) && !list.includes(name)) { list.push(name); commit(); }
    render();
  },
  pickExercise(d) {
    const a = getActive();
    const ex = { id: uid(), name: d.name, group: view.group, sets: [] };
    a.exercises.push(ex);
    a.open = ex.id;
    setActive(a);
    go('weightsActive', { focus: ex.id });
  },
  toggleEx(d) {
    const a = getActive();
    a.open = a.open === d.id ? null : d.id;
    setActive(a);
    render();
  },
  addSet(d) {
    const kgRaw = document.getElementById('kg-' + d.id).value;
    const kg = kgRaw.trim() === '' ? 0 : parseNum(kgRaw);
    const reps = parseInt(document.getElementById('reps-' + d.id).value, 10);
    if (!(kg >= 0)) return toast('Weight must be a number');
    if (!(reps > 0)) return toast('Enter the reps');
    const warm = !!document.getElementById('warm-' + d.id)?.classList.contains('on');
    const fail = !!document.getElementById('fail-' + d.id)?.classList.contains('on');
    const a = getActive();
    const ex = a.exercises.find((e) => e.id === d.id);
    ex.sets.push({ kg, reps, ...(warm ? { warmup: true } : {}), ...(fail ? { failure: true } : {}) });
    setActive(a);
    render();
    toast(`${warm ? 'Warm-up' : 'Set ' + ex.sets.filter(isWork).length}: ${fmtKg(kg)} × ${reps}${fail ? ' (failure)' : ''}`);
  },
  removeSet(d) {
    if (!confirm('Delete this set?')) return;
    const a = getActive();
    a.exercises.find((e) => e.id === d.id).sets.splice(Number(d.idx), 1);
    setActive(a);
    render();
  },
  removeEx(d) {
    if (!confirm('Remove this exercise and its sets?')) return;
    const a = getActive();
    a.exercises = a.exercises.filter((e) => e.id !== d.id);
    setActive(a);
    render();
  },
  finishWeights() {
    const a = getActive();
    const exercises = a.exercises.filter((e) => e.sets.length).map(({ name, group, sets }) => ({ name, group, sets }));
    if (!exercises.length) {
      if (confirm('No sets logged yet. Discard this workout?')) { setActive(null); go('home'); }
      return;
    }
    if (!confirm('Finish and save this workout?')) return;
    const end = nowISO();
    const session = { id: uid(), type: 'weights', start: a.start, end, day: localDay(end), exercises, updatedAt: nowISO() };
    data.sessions.push(session);
    commit();
    setActive(null);
    toast('Workout saved 💪');
    go('detail', { id: session.id });
  },

  /* History */
  deleteSession(d) {
    if (!confirm('Delete this session permanently?')) return;
    data.sessions = data.sessions.filter((s) => s.id !== d.id);
    data.deleted[d.id] = nowISO();
    commit();
    toast('Deleted');
    go('history');
  },

  /* Settings */
  saveGithub() {
    const val = (id) => document.getElementById(id).value.trim();
    const g = {
      owner: val('gh-owner'), repo: val('gh-repo'),
      branch: val('gh-branch') || 'main', token: val('gh-token'),
    };
    if (!g.owner || !g.repo || !g.token) return toast('Fill in username, repo and token');
    settings.github = g;
    store(K.settings, settings);
    setSync({ error: null });
    sync();
    render();
  },
  disconnectGithub() {
    if (!confirm('Remove the GitHub connection from this phone? Your data stays on the phone and on GitHub.')) return;
    delete settings.github;
    store(K.settings, settings);
    setSync({ lastOk: null, error: null });
    render();
  },
  exportData: () => saveFile(`iron-pump-${profile}-${todayStr()}.csv`, '\uFEFF' + buildCsv(), 'text/csv', 'Sweat & Iron workouts (CSV)'),
  exportBackup: () => saveFile(`iron-pump-${profile}-${todayStr()}.json`, JSON.stringify(data, null, 2), 'application/json', 'Sweat & Iron backup'),
  importData: () => document.getElementById('import-file').click(),
};

$app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || !ACTIONS[el.dataset.action]) return;
  e.preventDefault();
  ACTIONS[el.dataset.action](el.dataset, el);
});

// Pressing "Go"/Enter in the reps box adds the set.
$app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id?.startsWith('reps-')) {
    e.preventDefault();
    ACTIONS.addSet({ id: e.target.id.slice(5) });
  }
});

$app.addEventListener('change', async (e) => {
  if (e.target.id !== 'import-file' || !e.target.files[0]) return;
  try {
    const parsed = JSON.parse(await e.target.files[0].text());
    if (!parsed || !Array.isArray(parsed.sessions)) throw new Error('not a Sweat & Iron backup');
    const had = new Set(data.sessions.map((x) => x.id));
    const incoming = normalize(parsed);
    data = mergeData(data, parsed);
    commit();
    const added = data.sessions.filter((x) => !had.has(x.id)).length;
    const skipped = incoming.sessions.filter((x) => data.deleted[x.id]).length;
    toast(`Imported · ${added} new session${added === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped (deleted earlier)` : ''}`);
    render();
  } catch (err) {
    toast('Import failed: ' + err.message);
  }
  e.target.value = '';
});

/* =========================================================
   GitHub sync
   ========================================================= */
function setSync(patch) {
  syncState = { ...syncState, ...patch };
  store(pkey('sync'), { lastOk: syncState.lastOk, error: syncState.error });
  document.querySelectorAll('[data-sync-status]').forEach((el) => { el.textContent = syncText(); });
}

function syncText() {
  const g = settings.github;
  if (!g || !g.token) return 'Not backed up to GitHub yet. Set it up in Settings ⚙️';
  if (syncState.busy) return 'Syncing with GitHub…';
  if (!navigator.onLine) return 'Offline. Will sync when you are back online.';
  if (syncState.error) return 'Sync failed: ' + syncState.error;
  if (syncState.lastOk) return `Backed up to GitHub · ${fmtShortDate(syncState.lastOk)} ${fmtTime(syncState.lastOk)}`;
  return 'Not synced yet';
}

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

async function gh(method, url, token, body, accept = 'application/vnd.github+json') {
  // Don't let a hung connection block syncing forever (gym signal!).
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ac ? setTimeout(() => ac.abort(), 25000) : null;
  try {
    return await fetch(url, {
      method,
      cache: 'no-store',
      signal: ac ? ac.signal : undefined,
      headers: {
        Accept: accept,
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function ghError(res) {
  let msg = '';
  try { msg = (await res.json()).message || ''; } catch { /* ignore */ }
  if (res.status === 401) return 'token rejected (401). Check or regenerate it.';
  if (res.status === 403) {
    if (/rate limit/i.test(msg)) return 'GitHub rate limit reached. Try again in a few minutes.';
    if (/too.?large/i.test(msg)) return 'the backup file is too large for the GitHub API (over 1 MB).';
    return 'no permission (403). Token needs "Contents: Read and write" on this repo.';
  }
  if (res.status === 404) return 'repo or branch not found (404). Check the names and that the token can access the repo.';
  return `${res.status} ${msg}`.trim();
}

let syncing = false, syncAgain = false, syncTimer = null, retryTimer = null, lastAttempt = 0;
class SwitchedPerson extends Error {}

function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(sync, 1500);
}

async function sync() {
  const g = settings.github;
  if (!profile || !g || !g.token || !g.owner || !g.repo) return;
  if (!navigator.onLine) { setSync({}); return; }
  if (syncing) { syncAgain = true; return; }
  const p = profile; // if the person switches mid-sync, stop before touching the other person's data
  const guard = () => { if (profile !== p) throw new SwitchedPerson(); };
  syncing = true; lastAttempt = Date.now();
  clearTimeout(retryTimer);
  setSync({ busy: true });
  const path = encodeURIComponent(`gym-log-${p}.json`);
  const url = `https://api.github.com/repos/${encodeURIComponent(g.owner)}/${encodeURIComponent(g.repo)}/contents/${path}`;
  const getUrl = `${url}?ref=${encodeURIComponent(g.branch)}`;
  let retrySoon = false, hadRemote = false, lastConflict = 0;
  try {
    let done = false;
    for (let attempt = 0; attempt < 3 && !done; attempt++) {
      // 1. Download what's on GitHub (if anything).
      const res = await gh('GET', getUrl, g.token);
      guard();
      let remote = null, sha, tooBig = false;
      if (res.status === 403) {
        try { tooBig = /too.?large|1 MB/i.test((await res.clone().json()).message || ''); } catch { /* not JSON */ }
      }
      if (res.status === 200) {
        const j = await res.json();
        sha = j.sha;
        if (j.content) remote = JSON.parse(b64decode(j.content)); else tooBig = true;
      } else if (res.status !== 404 && !tooBig) {
        throw new Error(await ghError(res));
      }
      if (tooBig) {
        // Files over 1 MB can't be read in the normal format: read the raw file, and get its sha from the folder listing.
        const raw = await gh('GET', getUrl, g.token, undefined, 'application/vnd.github.raw+json');
        if (!raw.ok) throw new Error(await ghError(raw));
        remote = JSON.parse(await raw.text());
        guard();
        const list = await gh('GET', `https://api.github.com/repos/${encodeURIComponent(g.owner)}/${encodeURIComponent(g.repo)}/contents?ref=${encodeURIComponent(g.branch)}`, g.token);
        if (!list.ok) throw new Error(await ghError(list));
        const entry = (await list.json()).find((x) => x && x.name === `gym-log-${p}.json`);
        sha = entry && entry.sha;
      }
      hadRemote = hadRemote || remote !== null;
      guard();
      // 2. Merge it with the phone's copy.
      const before = JSON.stringify(data);
      const merged = mergeData(data, remote);
      data = merged;
      store(pkey('data'), data);
      if (JSON.stringify(data) !== before && ['home', 'history', 'detail'].includes(view.name)) render();
      // 3. Upload only if GitHub is missing something (compact JSON keeps the file small).
      if (remote && JSON.stringify(mergeData(remote, null)) === JSON.stringify(merged)) { done = true; break; }
      const put = await gh('PUT', url, g.token, {
        message: `Sweat & Iron sync (${p}) ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
        content: b64encode(JSON.stringify(merged)),
        branch: g.branch,
        ...(sha ? { sha } : {}),
      });
      guard();
      if (put.ok) { done = true; break; }
      if (put.status === 409 || put.status === 422) { lastConflict = put.status; await new Promise((r) => setTimeout(r, 1000)); continue; } // file changed meanwhile, retry
      throw new Error(await ghError(put));
    }
    if (!done) {
      // creating a brand-new file that keeps failing with 422 usually means the branch name is wrong
      if (lastConflict === 422 && !hadRemote) throw new Error(`could not create the file (422). Check that the branch "${g.branch}" exists.`);
      retrySoon = true;
      throw new Error('GitHub kept changing during sync. Will retry shortly.');
    }
    setSync({ busy: false, error: null, lastOk: nowISO() });
  } catch (err) {
    if (!(err instanceof SwitchedPerson) && profile === p) {
      const net = err instanceof TypeError || err.name === 'AbortError';
      setSync({ busy: false, error: net ? (err.name === 'AbortError' ? 'GitHub did not answer in time. Will retry.' : 'no connection to GitHub. Will retry.') : err.message });
      if (net || retrySoon) retryTimer = setTimeout(sync, 60000);
    }
  } finally {
    syncing = false;
    if (syncAgain) { syncAgain = false; scheduleSync(); } // also covers a person switched mid-sync
  }
}

window.addEventListener('online', () => sync());
window.addEventListener('offline', () => setSync({}));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastAttempt > 30000) sync();
});

/* =========================================================
   Start
   ========================================================= */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
navigator.storage?.persist?.().catch(() => {});
render();
sync();
