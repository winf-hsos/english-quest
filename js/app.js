"use strict";

/* =========================================================
   English Quest – Lern-App für die Englischarbeit
   ========================================================= */

/* ---------- Hilfsfunktionen ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (arr, n) => shuffle(arr).slice(0, n);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function dayStr(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function seeded(seed) {
  let s = seed || 1;
  return () => { s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) | 0; let t = s; t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------- Antworten prüfen ---------- */
function canon(input) {
  let s = String(input || "").toLowerCase();
  s = s.replace(/[’‘`´]/g, "'").replace(/[“”„«»]/g, '"');
  s = s.replace(/\.\.\.|…/g, " ");
  s = s.replace(/\bcan't\b/g, "cannot").replace(/\bcan not\b/g, "cannot").replace(/\bwon't\b/g, "will not");
  s = s.replace(/n't\b/g, " not");
  s = s.replace(/\b(did|was|were|do|does|is|are|could|has|have)nt\b/g, "$1 not");
  s = s.replace(/\bi'm\b/g, "i am")
    .replace(/\b(you|we|they)'re\b/g, "$1 are")
    .replace(/\b(he|she|it|that|there|what|where|who)'s\b/g, "$1 is")
    .replace(/\b(i|you|we|they|he|she)'d\b/g, "$1 would")
    .replace(/\b(i|you|we|they)'ve\b/g, "$1 have")
    .replace(/\b(i|you|we|they|he|she|it)'ll\b/g, "$1 will");
  s = s.replace(/[.,!?;:"()\/\-–]/g, " ");
  s = s.replace(/\b30\b/g, "thirty");
  return s.replace(/\s+/g, " ").trim();
}

function lev(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function judge(input, answers) {
  const c = canon(input);
  if (!c) return "empty";
  const list = answers.map(canon);
  if (list.includes(c)) return "ok";
  let best = 99;
  for (const a of list) best = Math.min(best, lev(c, a));
  if (best === 1 && c.length >= 4) return "near";
  if (best === 2 && c.length >= 14) return "near";
  return "wrong";
}

/* ---------- Abgeleitete Daten ---------- */
const VOCAB = [];
(function buildVocab() {
  const used = new Set();
  VOCAB_RAW.forEach(([en, de, g, extra = {}]) => {
    let id = "v." + slug(en);
    while (used.has(id)) id += "x";
    used.add(id);
    VOCAB.push({ id, en, de, g, n: extra.n || "", alt: extra.alt || [] });
  });
})();
const VOCAB_BY_ID = Object.fromEntries(VOCAB.map((v) => [v.id, v]));
const DE_MAP = {};
VOCAB.forEach((v) => { const k = canon(v.de); (DE_MAP[k] = DE_MAP[k] || []).push(v); });

function enVariants(en) {
  const out = new Set();
  const base = en.replace(/\s*(\.\.\.|…)\s*/g, " ").trim();
  out.add(base);
  if (/\(.*?\)/.test(base)) {
    out.add(base.replace(/\(([^)]*)\)/g, "$1"));
    out.add(base.replace(/\s*\([^)]*\)/g, ""));
  }
  for (const v of Array.from(out)) if (/^to /i.test(v)) out.add(v.slice(3));
  return Array.from(out);
}
function vocabAnswers(v) {
  const list = [...enVariants(v.en), ...v.alt];
  (DE_MAP[canon(v.de)] || []).forEach((o) => { if (o !== v) list.push(...enVariants(o.en), ...o.alt); });
  return list;
}
function vocabTag(v) {
  const t = [];
  if (/\bAE\b/.test(v.n)) t.push("AE");
  if (/\bBE\b/.test(v.n)) t.push("BE");
  if (/\bpl\b/.test(v.n)) t.push("Plural");
  if (/\bsg\b/.test(v.n)) t.push("Singular");
  return t.join(" · ");
}

const VERBS = IRREGULAR_RAW.map(([base, past, de, alt]) => ({ id: "iv." + slug(base), base, past, de, alt: alt || [] }));
const VERB_BY_ID = Object.fromEntries(VERBS.map((v) => [v.id, v]));

const PAST_ONLY = {};
[...IRREGULAR_ALL, ...IRREGULAR_RAW].forEach(([base, past]) => {
  const b = canon(base).split(" ")[0];
  canon(past).split(" ").forEach((p) => { if (p !== b && p !== "up" && p !== "was" && p !== "were") PAST_ONLY[p] = b; });
});
const REG_PAST = {};
REGULAR_RAW.forEach(([b, p]) => { REG_PAST[p] = b; });
const BASES = new Set([...[...IRREGULAR_ALL, ...IRREGULAR_RAW].map((v) => canon(v[0]).split(" ")[0]), ...REGULAR_RAW.map((r) => r[0]),
  "show", "miss", "need", "tell", "send", "learn", "turn", "post", "fix", "wish", "kiss", "pass", "touch", "rain", "film", "work"]);
const ED_OK = new Set(["need", "feed", "bleed", "speed", "seed", "red", "bed", "shed", "wed", "led", "fed", "shred"]);

function pastToBase(w) {
  if (PAST_ONLY[w]) return PAST_ONLY[w];
  if (REG_PAST[w]) return REG_PAST[w];
  if (/ed$/.test(w) && !ED_OK.has(w)) {
    if (/ied$/.test(w) && BASES.has(w.slice(0, -3) + "y")) return w.slice(0, -3) + "y";
    if (BASES.has(w.slice(0, -2))) return w.slice(0, -2);
    if (BASES.has(w.slice(0, -1))) return w.slice(0, -1);
    if (w.length > 5 && w[w.length - 3] === w[w.length - 4] && BASES.has(w.slice(0, -3))) return w.slice(0, -3);
  }
  return null;
}

const NAMES = ["ryan", "lily", "ruby", "karam", "ty", "josh", "ava", "sherlock", "mrs", "wilson", "austins", "students", "mum", "dad", "coach", "karam's"];
function grammarHint(raw, item) {
  const s = canon(raw);
  if (!s) return "";
  if (/\bdid (not )?(be|was|were)\b/.test(s)) return "Bei be brauchst du kein did: was/were bzw. wasn't/weren't.";
  if (/\b(do|does) not\b/.test(s) && item.past) return "Das ist Simple Present. Für die Vergangenheit brauchst du didn't.";
  const parts = s.split(/\bdid\b/);
  if (parts.length > 1) {
    const words = parts[1].trim().split(" ").slice(0, 5);
    for (const w of words) {
      const b = pastToBase(w);
      if (b) return `Nach did/didn't steht die Grundform: „${b}“ statt „${w}“.`;
    }
  }
  if (item.type === "q" && !/^did\b/.test(s)) return "Fragen im Simple Past beginnen mit Did (außer bei be).";
  if (item.type === "bq" && !/^(was|were)\b/.test(s)) return "Bei be stellst du Was/Were an den Anfang.";
  if (item.type === "bq") {
    const subj = (item.parts || "").split("|")[0].trim().toLowerCase();
    const plural = /\band\b|students|you\b|austins|they|we\b/.test(subj);
    if (plural && /^was\b/.test(s)) return "Mehrzahl oder you → Were.";
    if (!plural && /^were\b/.test(s)) return "Einzahl (he/she/it) → Was.";
  }
  if (item.type === "sa") {
    const m = s.match(/^(yes|no) (\S+) ?(\S+)?/);
    if (m) {
      if (NAMES.includes(m[2]) || m[2] === "the") return "In der Kurzantwort ersetzt du den Namen durch ein Pronomen (he, she, it, we, they).";
      if (m[3] && !["did", "was", "were"].includes(m[3])) return "Kurzantwort: nur did/didn't (bzw. was/were) – kein Vollverb.";
      const want = canon(item.a);
      if (/^yes/.test(want) && m[1] === "no" || /^no/.test(want) && m[1] === "yes") return "Achte auf das Zeichen: + heißt Yes, – heißt No.";
    }
  }
  return "";
}

/* ---------- Spielstand ---------- */
const KEY = "englishQuest.max.v1";
function defaultState() {
  return {
    v: 1, name: "Max", xp: 0, created: Date.now(), updated: Date.now(),
    cards: {}, items: {}, badges: {},
    stats: { answers: 0, correct: 0, bestCombo: 0, sessions: 0, listen: 0, stories: 0, dice: 0, blitzBest: 0, exams: [], best: {}, wsent: [] },
    days: {}, streak: { last: "", count: 0 }, missions: { date: "", list: [] }, wrong: [],
    settings: { sound: true, rate: 0.9, examDate: "2026-10-08", voice: "", vgroups: ["wb", "hol", "u1", "s1", "s2", "s3"] }
  };
}
function isObj(o) { return o && typeof o === "object" && !Array.isArray(o); }
function merge(def, obj) {
  if (!isObj(obj)) return def;
  const out = { ...def, ...obj };
  for (const k of Object.keys(def)) if (isObj(def[k]) && isObj(obj[k])) out[k] = merge(def[k], obj[k]);
  return out;
}
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return merge(defaultState(), JSON.parse(raw)); } catch (e) { /* leer */ }
  return defaultState();
}
let S = load();
let saveWarned = false;
function save() {
  S.updated = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { if (!saveWarned) { saveWarned = true; toast("Speichern im Browser klappt hier nicht. Nutze den Spielstand-Code!", "bad"); } }
}

/* Spielstand-Code */
function b64u(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const checksum = (str) => hashStr(str).toString(16).padStart(8, "0").slice(0, 6);
async function deflate(str) {
  if (!window.CompressionStream) return null;
  const stream = new Blob([new TextEncoder().encode(str)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}
async function makeCode() {
  const json = JSON.stringify(S);
  let bytes = null, tag = "EQ1";
  try { bytes = await deflate(json); } catch (e) { bytes = null; }
  if (!bytes) { bytes = new TextEncoder().encode(json); tag = "EQ0"; }
  const body = b64u(bytes);
  return `${tag}.${body}.${checksum(body)}`;
}
async function readCode(text) {
  const m = String(text).replace(/\s+/g, "").match(/EQ([01])\.([A-Za-z0-9_-]+)\.([0-9a-f]{6})/);
  if (!m) throw new Error("Im Text wurde kein Spielstand-Code gefunden.");
  if (checksum(m[2]) !== m[3]) throw new Error("Der Code ist unvollständig oder beschädigt. Bitte den ganzen Code kopieren.");
  const bytes = unb64u(m[2]);
  let json;
  if (m[1] === "1") {
    if (!window.DecompressionStream) throw new Error("Dieser Browser kann den Code nicht entpacken. Bitte einen aktuellen Browser verwenden.");
    json = await inflate(bytes);
  } else json = new TextDecoder().decode(bytes);
  const obj = JSON.parse(json);
  if (!obj || typeof obj.xp !== "number") throw new Error("Der Code enthält keinen gültigen Spielstand.");
  return merge(defaultState(), obj);
}

/* ---------- Sound ---------- */
let AC = null;
function tone(freq, dur, type, vol, when) {
  const t = AC.currentTime + when;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function sfx(name) {
  if (!S.settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    if (name === "ok") { tone(660, 0.09, "triangle", 0.12, 0); tone(990, 0.14, "triangle", 0.12, 0.08); }
    else if (name === "combo") { tone(784, 0.08, "triangle", 0.12, 0); tone(1047, 0.08, "triangle", 0.12, 0.07); tone(1319, 0.16, "triangle", 0.12, 0.14); }
    else if (name === "bad") { tone(196, 0.22, "sawtooth", 0.05, 0); tone(165, 0.25, "sawtooth", 0.05, 0.1); }
    else if (name === "near") { tone(523, 0.12, "triangle", 0.1, 0); }
    else if (name === "level") { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, "triangle", 0.12, i * 0.1)); }
    else if (name === "badge") { [880, 1175, 1568].forEach((f, i) => tone(f, 0.14, "sine", 0.1, i * 0.08)); }
    else if (name === "dice") { for (let i = 0; i < 6; i++) tone(300 + Math.random() * 300, 0.03, "square", 0.03, i * 0.06); }
    else if (name === "flip") { tone(1200, 0.04, "sine", 0.05, 0); }
  } catch (e) { /* kein Ton */ }
}

/* ---------- Sprachausgabe ---------- */
const Speech = {
  voices: [],
  get ok() { return "speechSynthesis" in window; },
  init() {
    if (!this.ok) return;
    const loadV = () => { this.voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)); };
    loadV();
    speechSynthesis.addEventListener ? speechSynthesis.addEventListener("voiceschanged", loadV) : (speechSynthesis.onvoiceschanged = loadV);
  },
  ordered() {
    if (!this.voices.length && this.ok) this.voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    const gb = this.voices.filter((v) => /en[-_]GB/i.test(v.lang));
    const us = this.voices.filter((v) => /en[-_]US/i.test(v.lang));
    return [...new Set([...gb, ...us, ...this.voices])];
  },
  pair() {
    const list = this.ordered();
    const main = list.find((v) => v.name === S.settings.voice) || list[0] || null;
    const second = list.find((v) => v !== main && v.lang === (main && main.lang)) || list.find((v) => v !== main) || main;
    return [main, second];
  },
  stop() { if (this.ok) speechSynthesis.cancel(); },
  speak(lines, keys) {
    return new Promise((resolve) => {
      if (!this.ok) { resolve(false); return; }
      speechSynthesis.cancel();
      const [a, b] = this.pair();
      const parts = [];
      lines.forEach(([who, text]) => {
        const alt = keys && keys.length > 1 && who === keys[1];
        const pieces = String(text).match(/[^.!?]+[.!?]*/g) || [text];
        pieces.forEach((p) => parts.push({ alt, text: p.trim() }));
      });
      if (!parts.length) { resolve(true); return; }
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p.text);
        const v = p.alt ? b : a;
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
        u.rate = S.settings.rate || 0.9;
        u.pitch = p.alt ? (b === a ? 1.35 : 1.05) : 1;
        if (i === parts.length - 1) { u.onend = () => resolve(true); u.onerror = () => resolve(false); }
        speechSynthesis.speak(u);
      });
    });
  },
  say(text) { return this.speak([["N", text]]); }
};

/* ---------- Belohnungssystem ---------- */
function rankIndex(xp) { let i = 0; RANKS.forEach((r, k) => { if (xp >= r.xp) i = k; }); return i; }
function rankInfo(xp = S.xp) {
  const i = rankIndex(xp), cur = RANKS[i], next = RANKS[i + 1];
  const prog = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { i, cur, next, prog, toNext: next ? next.xp - xp : 0 };
}
const pendingRankUps = [];
function addXP(n) {
  n = Math.round(n);
  if (n <= 0) return;
  const before = rankIndex(S.xp);
  S.xp += n;
  const d = dayStr();
  S.days[d] = (S.days[d] || 0) + n;
  touchStreak();
  missionEvent("xp", null, 0);
  const after = rankIndex(S.xp);
  if (after > before) pendingRankUps.push(after);
  save();
  renderTopbar();
}
function touchStreak() {
  const d = dayStr();
  if (S.streak.last === d) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  S.streak.count = S.streak.last === dayStr(y) ? S.streak.count + 1 : 1;
  S.streak.last = d;
  if (S.streak.count >= 3) award("streak3");
}
function streakNow() {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return (S.streak.last === dayStr() || S.streak.last === dayStr(y)) ? S.streak.count : 0;
}
function award(id) {
  if (S.badges[id]) return;
  const b = BADGES.find((x) => x.id === id);
  if (!b) return;
  S.badges[id] = Date.now();
  save();
  sfx("badge");
  toast(`<span class="t-big">${b.icon}</span> Abzeichen: <b>${esc(b.name)}</b>`, "gold");
}
function ensureMissions() {
  const d = dayStr();
  if (S.missions.date === d && S.missions.list.length) return;
  const rnd = seeded(hashStr(d + S.name));
  const pool = MISSIONS.slice(), list = [];
  while (list.length < 3 && pool.length) { const i = Math.floor(rnd() * pool.length); list.push({ id: pool[i].id, p: 0, done: false }); pool.splice(i, 1); }
  S.missions = { date: d, list };
  save();
}
function missionEvent(kind, mod, amount) {
  ensureMissions();
  for (const m of S.missions.list) {
    if (m.done) continue;
    const def = MISSIONS.find((x) => x.id === m.id);
    if (!def || def.kind !== kind) continue;
    if (def.mod && def.mod !== mod) continue;
    if (kind === "combo") m.p = Math.max(m.p, amount);
    else if (kind === "xp") m.p = S.days[dayStr()] || 0;
    else m.p += amount;
    if (m.p >= def.goal) {
      m.p = def.goal; m.done = true;
      S.xp += 30; S.days[dayStr()] = (S.days[dayStr()] || 0) + 30;
      sfx("badge");
      toast(`🎯 Mission geschafft: <b>${esc(def.text)}</b> · +30 XP`, "gold");
    }
  }
}
function cardResult(id, res) {
  const c = S.cards[id] || { b: -1, r: 0, w: 0, t: 0 };
  if (res === "ok") { c.b = c.b < 0 ? 2 : Math.min(5, c.b + 1); c.r++; }
  else if (res === "half") { c.b = Math.max(1, c.b); c.r++; }
  else { c.b = 0; c.w++; }
  c.t = Date.now();
  S.cards[id] = c;
}
function itemResult(id, ok) {
  const it = S.items[id] || { r: 0, w: 0, s: 0 };
  if (ok) { it.r++; it.s++; } else { it.w++; it.s = 0; }
  S.items[id] = it;
}
function markWrong(id, wrong) {
  S.wrong = S.wrong.filter((x) => x !== id);
  if (wrong) { S.wrong.unshift(id); S.wrong = S.wrong.slice(0, 80); }
}
function checkMasteryBadges() {
  const vm = VOCAB.filter((v) => (S.cards[v.id] || {}).b >= 3).length;
  const im = VERBS.filter((v) => (S.cards[v.id] || {}).b >= 3).length;
  if (vm >= 50) award("vocab50");
  if (vm >= 150) award("vocab150");
  if (im >= Math.ceil(VERBS.length / 2)) award("verbs30");
  if (im >= VERBS.length) award("verbsAll");
}

/* Fortschritt pro Bereich */
const GRAMMAR_TOPICS = [
  { id: "reg", name: "Regelmäßige Formen", icon: "🔤", desc: "plan → planned, try → tried" },
  { id: "sig", name: "Present oder Past?", icon: "⏰", desc: "Signalwörter erkennen" },
  { id: "q",   name: "Fragen mit did", icon: "❓", desc: "Did Ty …?" },
  { id: "bq",  name: "Fragen mit was/were", icon: "🙋", desc: "Was the trip long?" },
  { id: "sa",  name: "Kurzantworten", icon: "💬", desc: "Yes, he did. / No, she didn't." },
  { id: "mc",  name: "Fehler-Detektiv", icon: "🔎", desc: "Welcher Satz ist richtig?" },
  { id: "ty",  name: "Ty's Wochenende", icon: "📝", desc: "Was hat er (nicht) gemacht?" },
  { id: "tr",  name: "Positiv → Negativ", icon: "🔄", desc: "… went → … didn't go" },
  { id: "ord", name: "Satzbauer", icon: "🧱", desc: "Wörter in die richtige Reihenfolge" }
];
function grammarIds(topic) {
  const n = { reg: REGULAR_RAW.length, sig: SIGNAL_RAW.length, q: QUESTIONS_RAW.length, bq: BE_QUESTIONS_RAW.length, sa: SHORT_RAW.length, mc: MC_GRAMMAR_RAW.length, ty: TY_LIST_RAW.length, tr: TRANSFORM_RAW.length, ord: ORDER_RAW.length }[topic];
  if (topic === "reg") return REGULAR_RAW.map((r) => "g.reg." + r[0]);
  return Array.from({ length: n }, (_, i) => `g.${topic}.${i}`);
}
const ALL_GRAMMAR_IDS = GRAMMAR_TOPICS.flatMap((t) => grammarIds(t.id));
const itemMastered = (id, need = 2) => (S.items[id] || {}).s >= need;

/* Fortschritt mit Teilpunkten: einmal richtig zählt schon halb, gemeistert (2× richtig) zählt voll. */
function cardCredit(id) {
  const c = S.cards[id];
  const b = c ? c.b : -1;
  return b >= 3 ? 1 : b === 2 ? 0.5 : b === 1 ? 0.25 : 0;
}
function itemCredit(id) {
  const s = (S.items[id] || {}).s || 0;
  return s >= 2 ? 1 : s === 1 ? 0.5 : 0;
}
function textCredit(id) {
  if (itemMastered(id, 1)) return 1;
  return ((S.stats.best[id] || 0) / 100) * 0.5;
}
function progress(ids, credit) {
  if (!ids.length) return 0;
  const sum = ids.reduce((a, id) => a + credit(id), 0);
  return sum > 0 ? Math.max(1, Math.round((sum / ids.length) * 100)) : 0;
}
function mastery() {
  const vocab = progress(VOCAB.map((v) => v.id), cardCredit);
  const verbs = progress(VERBS.map((v) => v.id), cardCredit);
  const grammar = progress(ALL_GRAMMAR_IDS, itemCredit);
  const stories = progress(STORIES.map((x) => "st." + x.id), textCredit);
  const listen = progress(LISTENING.map((l) => "ls." + l.id), textCredit);
  const reading = progress(READING.map((_, i) => "rd." + i), (id) => (itemMastered(id, 1) ? 1 : 0));
  const ready = Math.round(vocab * 0.25 + verbs * 0.2 + grammar * 0.3 + stories * 0.1 + listen * 0.1 + reading * 0.05);
  return { vocab, verbs, grammar, stories, listen, reading, ready };
}
function topicMastery(topic) { return progress(grammarIds(topic), itemCredit); }
function groupMastery(g) { return progress(VOCAB.filter((v) => v.g === g).map((v) => v.id), cardCredit); }

/* ---------- Aufgaben-Fabriken ---------- */
function vocabInput(id) {
  const v = VOCAB_BY_ID[id];
  const tag = vocabTag(v);
  return {
    id, kind: "input", mod: "vocab", card: true, label: "Vokabel · Deutsch → Englisch",
    prompt: `<div class="big">${esc(v.de)}</div>${tag ? `<div class="tag">${tag}</div>` : ""}`,
    answers: vocabAnswers(v), a: v.en, q: v.de, say: v.en.replace(/…/g, ""), placeholder: "Englisches Wort …"
  };
}
function vocabMC(id) {
  const v = VOCAB_BY_ID[id];
  const same = VOCAB.filter((o) => o.g === v.g && canon(o.de) !== canon(v.de));
  const other = VOCAB.filter((o) => canon(o.de) !== canon(v.de));
  const dist = [];
  for (const o of shuffle(same).concat(shuffle(other))) { if (dist.length >= 3) break; if (!dist.some((d) => d.de === o.de)) dist.push(o); }
  const options = shuffle([v.de, ...dist.map((d) => d.de)]);
  return {
    id, kind: "mc", mod: "vocab", card: true, label: "Vokabel · Englisch → Deutsch",
    prompt: `<div class="big en">${esc(v.en)}</div>${v.n ? `<div class="tag">${esc(v.n)}</div>` : ""}`,
    options, correct: options.indexOf(v.de), a: v.de, q: v.en, say: v.en.replace(/…/g, "")
  };
}
function vocabFlash(id) {
  const v = VOCAB_BY_ID[id];
  return { id, kind: "flash", mod: "vocab", card: true, label: "Karteikarte", front: v.en, frontNote: v.n, back: v.de, a: v.de, q: v.en, say: v.en.replace(/…/g, "") };
}
function verbInput(id) {
  const v = VERB_BY_ID[id];
  return {
    id, kind: "input", mod: "verbs", card: true, label: "Verb · Simple Past bilden",
    prompt: `<div class="big en">${esc(v.base)}</div><div class="tag">${esc(v.de)}</div>`,
    answers: [v.past, ...v.alt], a: v.past, q: v.base, say: `${v.base}. ${v.past.replace("/", ", ")}`, placeholder: "Simple-Past-Form …"
  };
}
function verbReverse(id) {
  const v = VERB_BY_ID[id];
  const shown = v.base === "be" ? pick(["was", "were"]) : v.past.replace(" (up)", "");
  return {
    id: id + ".r", cardId: id, kind: "input", mod: "verbs", card: true, label: "Verb · Grundform finden",
    prompt: `<div class="big en">${esc(shown)}</div><div class="tag">Wie heißt die Grundform?</div>`,
    answers: [v.base, v.base.replace(" (up)", ""), "to " + v.base.replace(" (up)", "")], a: v.base, q: shown, say: `${v.base}. ${v.past.replace("/", ", ")}`, placeholder: "Grundform …"
  };
}
function grammarItem(id) {
  const [, topic, key] = id.split(".");
  const i = Number(key);
  if (topic === "reg") {
    const r = REGULAR_RAW.find((x) => x[0] === key);
    return { id, kind: "input", mod: "grammar", label: "Regelmäßige Verben · Simple Past", prompt: `<div class="big en">${esc(r[0])}</div><div class="tag">Wie schreibt man das Simple Past?</div>`, answers: [r[1]], a: r[1], q: r[0], explain: RULE_TEXT[r[2]], say: `${r[0]}. ${r[1]}` };
  }
  if (topic === "sig") {
    const [sent, verb, ans, sw, tense] = SIGNAL_RAW[i];
    const html = esc(sent).replace("___", `<span class="blank">___</span> <span class="muted">(${esc(verb)})</span>`);
    return { id, kind: "input", mod: "grammar", label: "Simple Present oder Simple Past?", prompt: `<div class="sentence en">${html}</div>`, answers: [ans], a: ans, q: sent.replace("___", `___ (${verb})`), explain: `Signalwort „${sw}“ → ${tense === "past" ? "Simple Past" : "Simple Present"}.`, placeholder: "Verbform …" };
  }
  if (topic === "q") {
    const [parts, ans] = QUESTIONS_RAW[i];
    return { id, kind: "input", mod: "grammar", type: "q", past: true, parts, label: "Frage mit did bilden", prompt: chipsPrompt(parts), answers: [ans], a: ans, q: `(${parts})`, explain: "Did + Person + Grundform …?", placeholder: "Did …?", sentence: true, question: true };
  }
  if (topic === "bq") {
    const [parts, ans] = BE_QUESTIONS_RAW[i];
    return { id, kind: "input", mod: "grammar", type: "bq", parts, label: "Frage mit was/were bilden", prompt: chipsPrompt(parts), answers: [ans], a: ans, q: `(${parts})`, explain: "Was/Were + Person + …? (I/he/she/it → was, you/we/they → were)", placeholder: "Was/Were …?", sentence: true, question: true };
  }
  if (topic === "sa") {
    const [qq, sign, ans, hint, alt] = SHORT_RAW[i];
    const badge = sign === "+" ? `<span class="sign yes">✓ Yes</span>` : `<span class="sign no">✗ No</span>`;
    return { id, kind: "input", mod: "grammar", type: "sa", past: true, label: "Kurzantwort geben", prompt: `<div class="sentence en">${esc(qq)}</div><div class="row-c">${badge}${hint ? `<span class="tag">${esc(hint)}</span>` : ""}</div>`, answers: [ans, ...(alt || [])], a: ans, q: `${qq} (${sign === "+" ? "Yes" : "No"})`, explain: "Kurzantwort: Yes, + Pronomen + did/was/were. · No, + Pronomen + didn't/wasn't/weren't.", placeholder: sign === "+" ? "Yes, …" : "No, …", sentence: true };
  }
  if (topic === "mc") {
    const [task, opts, expl] = MC_GRAMMAR_RAW[i];
    const options = shuffle(opts);
    return { id, kind: "mc", mod: "grammar", label: "Fehler-Detektiv", prompt: `<div class="sentence">${esc(task)}</div>`, options, correct: options.indexOf(opts[0]), a: opts[0], q: task, explain: expl, en: true };
  }
  if (topic === "ty") {
    const [sign, act, sol] = TY_LIST_RAW[i];
    const badge = sign === "+" ? `<span class="sign yes">✓ gemacht</span>` : `<span class="sign no">✗ nicht gemacht</span>`;
    return { id, kind: "input", mod: "grammar", past: true, label: "Ty's Wochenende · Schreib einen Satz (Ty … / He …)", prompt: `<div class="row-c">${badge}</div><div class="sentence en">${esc(act)}</div>`, answers: ["Ty " + sol, "He " + sol], a: "Ty " + sol + ".", q: `${sign === "+" ? "✓" : "✗"} ${act}`, explain: sign === "+" ? "Gemacht → Simple Past (regelmäßig -ed oder unregelmäßig)." : "Nicht gemacht → didn't + Grundform.", placeholder: "Ty …", sentence: true };
  }
  if (topic === "tr") {
    const [sent, sol] = TRANSFORM_RAW[i];
    return { id, kind: "input", mod: "grammar", past: true, label: "Verneine den Satz", prompt: `<div class="sentence en">${esc(sent)}</div>`, answers: [sol], a: sol, q: sent, explain: /\b(was|were)\b/.test(sent) ? "be: was → wasn't, were → weren't." : "didn't + Grundform (nicht die Past-Form!).", placeholder: "… didn't …", sentence: true };
  }
  if (topic === "ord") {
    const [sent, distract] = ORDER_RAW[i];
    const end = sent.slice(-1);
    const words = sent.slice(0, -1).split(" ");
    return { id, kind: "order", mod: "grammar", label: "Satzbauer · Tippe die Wörter in der richtigen Reihenfolge an", words, distract, end, a: sent, q: "Satzbauer: " + sent.replace(/[.?]$/, ""), explain: distract.length ? `Vorsicht Falle: „${distract.join("“, „")}“ gehört nicht in den Satz.` : "" };
  }
  return null;
}
function chipsPrompt(parts) {
  return `<div class="chips-prompt">${parts.split("|").map((p) => `<span class="chip">${esc(p.trim())}</span>`).join('<span class="sep">+</span>')}</div>`;
}
function storyItem(st, section) {
  return { id: "st." + st.id, kind: "gaps", mod: "stories", label: `Lückentext · ${st.title}`, section, story: st, q: "Lückentext: " + st.title, a: "" };
}
function listenItem(L, section, exam) {
  return { id: "ls." + L.id, kind: "listen", mod: "listen", label: `Hören · ${L.title}`, section, L, maxPlays: exam ? 2 : 99, q: "Hörtext: " + L.title, a: "" };
}
function readingItem(i) {
  const r = READING[i];
  const options = shuffle(r.o);
  return { id: "rd." + i, kind: "mc", mod: "reading", label: `Text-Check · Buch S. ${r.p}`, prompt: `<div class="sentence en">${esc(r.q)}</div>`, options, correct: options.indexOf(r.o[0]), a: r.o[0], q: r.q, en: true };
}
function dictItem(i) {
  const t = DICTATION[i];
  return { id: "dc." + i, kind: "input", mod: "listen", label: "Hör-Diktat · Hör zu und schreib den Satz auf", prompt: `<div class="sentence">🎧 Drück auf <b>Anhören</b> und schreib genau auf, was du hörst.</div>`, speak: t, autoplay: true, answers: [t], a: t, q: "Diktat", placeholder: "Was hast du gehört?", sentence: true };
}
function beaeItem(kind, i) {
  if (kind === "ae") {
    const [be, ae] = BEAE[i];
    const options = shuffle([ae, ...sample(BEAE.filter((x) => x[1] !== ae).map((x) => x[1]), 3)]);
    return { id: `be.ae.${i}`, kind: "mc", mod: "beae", label: "British → American", prompt: `<div class="sentence">Was sagt man in Amerika statt <b class="en">${esc(be)}</b> 🇬🇧?</div>`, options, correct: options.indexOf(ae), a: ae, q: be + " (AE?)", en: true };
  }
  if (kind === "be") {
    const [be, ae] = BEAE[i];
    const options = shuffle([be, ...sample(BEAE.filter((x) => x[0] !== be).map((x) => x[0]), 3)]);
    return { id: `be.be.${i}`, kind: "mc", mod: "beae", label: "American → British", prompt: `<div class="sentence">Was sagt man in Großbritannien statt <b class="en">${esc(ae)}</b> 🇺🇸?</div>`, options, correct: options.indexOf(be), a: be, q: ae + " (BE?)", en: true };
  }
  const [us, gb] = SPELLING[i];
  return { id: `be.sp.${i}`, kind: "input", mod: "beae", label: "Britische Schreibweise", prompt: `<div class="sentence">Schreib das Wort so, wie man es in Großbritannien schreibt:</div><div class="big en">${esc(us)}</div>`, answers: [gb], a: gb, q: us, placeholder: "British English …" };
}
function itemById(id) {
  if (id.startsWith("v.")) return VOCAB_BY_ID[id] ? vocabInput(id) : null;
  if (id.startsWith("iv.")) { if (id.endsWith(".r")) return VERB_BY_ID[id.slice(0, -2)] ? verbReverse(id.slice(0, -2)) : null; return VERB_BY_ID[id] ? verbInput(id) : null; }
  if (id.startsWith("g.")) return grammarItem(id);
  if (id.startsWith("st.")) { const st = STORIES.find((s) => "st." + s.id === id); return st ? storyItem(st) : null; }
  if (id.startsWith("ls.")) { const L = LISTENING.find((l) => "ls." + l.id === id); return L ? listenItem(L) : null; }
  if (id.startsWith("rd.")) { const i = Number(id.slice(3)); return READING[i] ? readingItem(i) : null; }
  if (id.startsWith("dc.")) { const i = Number(id.slice(3)); return DICTATION[i] ? dictItem(i) : null; }
  if (id.startsWith("be.")) { const [, k, i] = id.split("."); return beaeItem(k, Number(i)); }
  return null;
}

/* Auswahl: Leitner-Karten (Vokabeln, Verben) */
/* Eine Runde mischt: zuletzt falsche Aufgaben, einmal richtige zum Bestätigen und neue. */
function takeMix(n, pools) {
  const out = [], used = new Set();
  for (const p of pools) {
    let taken = 0;
    for (const id of p.list) {
      if (out.length >= n || (p.max !== undefined && taken >= p.max)) break;
      if (!used.has(id)) { used.add(id); out.push(id); taken++; }
    }
  }
  for (const p of pools) for (const id of p.list) {
    if (out.length >= n) break;
    if (!used.has(id)) { used.add(id); out.push(id); }
  }
  return shuffle(out);
}
function pickCards(ids, n) {
  const now = Date.now();
  const interval = [0, 0.02, 0.15, 4, 20, 60];
  const weak = [], confirm = [], fresh = [], review = [], later = [];
  shuffle(ids).forEach((id) => {
    const c = S.cards[id];
    if (!c) { fresh.push(id); return; }
    const due = (now - c.t) / 36e5 >= interval[clamp(c.b, 0, 5)];
    if (!due) later.push(id);
    else if (c.b <= 0) weak.push(id);
    else if (c.b <= 2) confirm.push(id);
    else review.push(id);
  });
  later.sort((a, b) => S.cards[a].b - S.cards[b].b);
  review.sort((a, b) => S.cards[a].b - S.cards[b].b);
  return takeMix(n, [
    { list: weak, max: Math.ceil(n * 0.3) },
    { list: confirm, max: Math.ceil(n * 0.4) },
    { list: fresh },
    { list: review },
    { list: later }
  ]);
}
function pickItems(ids, n) {
  const weak = [], confirm = [], fresh = [], done = [];
  shuffle(ids).forEach((id) => {
    const it = S.items[id];
    if (!it) fresh.push(id);
    else if (it.s === 0) weak.push(id);
    else if (it.s === 1) confirm.push(id);
    else done.push(id);
  });
  return takeMix(n, [
    { list: weak, max: Math.ceil(n * 0.3) },
    { list: confirm, max: Math.ceil(n * 0.4) },
    { list: fresh },
    { list: done }
  ]);
}

/* =========================================================
   Übungs-Engine
   ========================================================= */
const app = () => $("#app");
const Sess = {
  st: null,

  start(opts) {
    Speech.stop();
    const items = opts.items.filter(Boolean);
    if (!items.length) { toast("Hier gibt es gerade nichts zu üben.", "bad"); return; }
    this.st = {
      opts, title: opts.title, mod: opts.mod, queue: items.slice(), i: 0, exam: !!opts.exam, before: mastery(), beforeProg: opts.prog ? opts.prog.calc() : null,
      combo: 0, maxCombo: 0, xp: 0, ok: 0, bad: 0, mistakes: [], requeued: new Set(), log: [], startCount: items.length
    };
    window.scrollTo(0, 0);
    this.view();
  },

  get cur() { return this.st.queue[this.st.i]; },

  quit() {
    if (this.st && this.st.exam && !confirm("Probearbeit wirklich abbrechen? Sie wird dann nicht gewertet.")) return;
    Speech.stop();
    const back = this.st ? this.st.opts.back || "#/" : "#/";
    this.st = null;
    if (location.hash === back) route(); else location.hash = back;
  },

  view() {
    const st = this.st, it = this.cur;
    st.answered = false; st.nearTried = false; st.flipped = false; st.chosen = []; st.tf = {}; st.plays = 0;
    const done = st.i, total = st.queue.length;
    const label = st.exam && it.section ? it.section : it.label;
    app().innerHTML = `
      <section class="session ${st.exam ? "exam" : ""}">
        <div class="s-top">
          <button class="icon-btn" data-act="quit" title="Beenden" aria-label="Beenden">✕</button>
          <div class="progress"><i style="width:${pct(done, total)}%"></i></div>
          ${st.exam ? `<span class="s-count">${done + 1}/${total}</span>` : `<span class="combo ${st.combo >= 3 ? "hot" : ""}" title="Combo">🔥 ${st.combo}</span>`}
        </div>
        <div class="s-label">${esc(label)}</div>
        <div class="card s-card" id="s-body">${this.body(it)}</div>
        <div class="feedback" id="s-fb" aria-live="polite"></div>
        <div class="s-actions"><button class="btn primary big" id="s-main"></button></div>
      </section>`;
    $("[data-act=quit]").onclick = () => this.quit();
    this.bind(it);
  },

  setMain(text, state, disabled = false) {
    const b = $("#s-main");
    if (!b) return;
    b.textContent = text; b.dataset.state = state; b.disabled = disabled;
    b.style.visibility = text ? "visible" : "hidden";
  },

  body(it) {
    if (it.kind === "input") {
      return `<div class="prompt">${it.prompt}</div>
        ${it.speak ? `<button class="btn ghost" data-act="play">🔊 Anhören</button>` : ""}
        <input id="ans" class="answer" type="text" autocomplete="off" autocorrect="off" autocapitalize="${it.sentence ? "sentences" : "off"}" spellcheck="false" placeholder="${esc(it.placeholder || "Deine Antwort …")}">`;
    }
    if (it.kind === "mc") {
      return `<div class="prompt">${it.prompt}</div>
        ${it.say && !this.st.exam ? `<button class="btn ghost small" data-act="say">🔊</button>` : ""}
        <div class="options">${it.options.map((o, k) => `<button class="opt ${it.en ? "en" : ""}" data-k="${k}"><span class="key">${k + 1}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
    }
    if (it.kind === "flash") {
      return `<div class="flash" id="flash" tabindex="0">
          <div class="flash-inner">
            <div class="face face-front"><div class="big en">${esc(it.front)}</div>${it.frontNote ? `<div class="tag">${esc(it.frontNote)}</div>` : ""}<div class="muted small">Tippen zum Umdrehen</div></div>
            <div class="face face-back"><div class="big">${esc(it.back)}</div></div>
          </div>
        </div>
        <div class="row-c"><button class="btn ghost small" data-act="say">🔊 Aussprache</button></div>
        <div class="flash-rate" id="flash-rate" hidden>
          <button class="btn bad" data-rate="0">✗ Wusste ich nicht</button>
          <button class="btn good" data-rate="1">✓ Wusste ich</button>
        </div>`;
    }
    if (it.kind === "order") {
      const tokens = shuffle([...it.words.map((w, k) => ({ w, k })), ...it.distract.map((w, k) => ({ w, k: 100 + k }))]);
      this.st.tokens = tokens;
      return `<div class="prompt"><div class="sentence">Bilde den Satz:</div></div>
        <div class="order-line" id="ord-line"><span class="muted">Tippe unten auf die Wörter …</span></div>
        <div class="order-bank" id="ord-bank">${tokens.map((t, k) => `<button class="tok en" data-t="${k}">${esc(t.w)}</button>`).join("")}</div>`;
    }
    if (it.kind === "gaps") {
      const segs = parseGaps(it.story.text);
      this.st.segs = segs;
      let gi = 0;
      const html = segs.map((sg) => {
        if (sg.t !== undefined) return fmtStory(sg.t);
        const w = Math.max(5, ...sg.answers.map((a) => a.length)) + 1;
        const k = gi++;
        return `<span class="gap-wrap"><input class="gap" data-g="${k}" style="width:${w}ch" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Lücke ${k + 1}${sg.hint ? ": " + esc(sg.hint) : ""}">${sg.hint ? `<span class="hint">(${esc(sg.hint)})</span>` : ""}</span>`;
      }).join("");
      this.st.gapCount = gi;
      return `<div class="story-head"><span class="story-icon">${it.story.icon}</span><div><div class="story-title en">${esc(it.story.title)}</div><div class="muted small">${esc(it.story.intro)}</div></div></div>
        <div class="story en">${html}</div>`;
    }
    if (it.kind === "listen") {
      const L = it.L;
      const noVoice = !Speech.ok || !Speech.voices.length;
      return `<div class="listen-head">
          <div class="story-head"><span class="story-icon">${L.icon}</span><div><div class="story-title en">${esc(L.title)}</div><div class="muted small">Hör gut zu: Sind die Aussagen richtig (true) oder falsch (false)?${it.maxPlays < 99 ? " Du kannst den Text 2× hören – wie in der Arbeit." : ""}</div></div></div>
          <div class="row-c">
            <button class="btn primary" data-act="listen">▶ Abspielen</button>
            <span class="muted small" id="plays"></span>
          </div>
          ${noVoice ? `<p class="warn">Dein Browser hat keine englische Stimme. Du kannst den Text stattdessen lesen.</p><button class="btn ghost small" data-act="transcript">📄 Text zeigen</button>` : ""}
          <div class="transcript en" id="transcript" hidden>${L.lines.map(([w, t]) => `<p>${L.voices ? `<b>${esc(L.voices[w])}:</b> ` : ""}${esc(t)}</p>`).join("")}</div>
        </div>
        <div class="tf-list">${L.q.map(([s], k) => `
          <div class="tf" data-q="${k}">
            <span class="tf-num">${k + 1}</span><span class="tf-text en">${esc(s)}</span>
            <span class="tf-btns"><button class="tfb" data-v="1">true</button><button class="tfb" data-v="0">false</button></span>
          </div>`).join("")}</div>`;
    }
    return "";
  },

  bind(it) {
    const st = this.st;
    const main = $("#s-main");
    main.onclick = () => {
      if (main.dataset.state === "next") return this.next();
      if (main.dataset.state === "check") return this.check();
      if (main.dataset.state === "flip") return this.flip();
    };
    if (it.kind === "input") {
      this.setMain("Prüfen", "check");
      const inp = $("#ans");
      setTimeout(() => inp.focus(), 30);
      const play = $("[data-act=play]");
      if (play) play.onclick = () => { Speech.say(it.speak); inp.focus(); };
      if (it.autoplay) setTimeout(() => Speech.say(it.speak), 350);
    } else if (it.kind === "mc") {
      this.setMain("", "none");
      $$(".opt").forEach((b) => (b.onclick = () => this.choose(Number(b.dataset.k))));
      const say = $("[data-act=say]");
      if (say) say.onclick = () => Speech.say(it.say);
    } else if (it.kind === "flash") {
      this.setMain("Umdrehen", "flip");
      $("#flash").onclick = () => this.flip();
      $("[data-act=say]").onclick = (e) => { e.stopPropagation(); Speech.say(it.say); };
      $$("[data-rate]").forEach((b) => (b.onclick = () => this.rate(b.dataset.rate === "1")));
    } else if (it.kind === "order") {
      this.setMain("Prüfen", "check", true);
      this.renderOrder();
    } else if (it.kind === "gaps") {
      this.setMain("Prüfen", "check");
      const gaps = $$(".gap");
      gaps.forEach((g, k) => {
        g.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          e.preventDefault(); e.stopPropagation();
          if (st.answered) { this.next(); return; }
          if (k < gaps.length - 1) gaps[k + 1].focus(); else this.check();
        });
      });
      setTimeout(() => gaps[0] && gaps[0].focus(), 30);
    } else if (it.kind === "listen") {
      this.setMain("Prüfen", "check", true);
      const btn = $("[data-act=listen]");
      const upd = () => { $("#plays").textContent = st.plays ? `${st.plays}× gehört` + (it.maxPlays < 99 ? ` (max. ${it.maxPlays})` : "") : ""; };
      btn.onclick = async () => {
        if (st.plays >= it.maxPlays) return;
        if (!Speech.ok) { $("#transcript").hidden = false; return; }
        st.plays++; upd();
        btn.disabled = true; btn.textContent = "🔊 Läuft …";
        await Speech.speak(it.L.lines, it.L.voices ? Object.keys(it.L.voices) : null);
        if (!this.st || this.cur !== it) return;
        btn.disabled = st.plays >= it.maxPlays;
        btn.textContent = st.plays >= it.maxPlays ? "Kein Hören mehr" : "▶ Nochmal abspielen";
      };
      const tr = $("[data-act=transcript]");
      if (tr) tr.onclick = () => { $("#transcript").hidden = false; };
      $$(".tf").forEach((row) => {
        $$(".tfb", row).forEach((b) => (b.onclick = () => {
          if (st.answered) return;
          st.tf[row.dataset.q] = b.dataset.v === "1";
          $$(".tfb", row).forEach((x) => x.classList.toggle("on", x === b));
          this.setMain("Prüfen", "check", Object.keys(st.tf).length < it.L.q.length);
        }));
      });
    }
  },

  /* ----- einzelne Aufgabentypen ----- */
  check() {
    const st = this.st, it = this.cur;
    if (st.answered) return;
    if (it.kind === "input") return this.checkInput();
    if (it.kind === "order") return this.checkOrder();
    if (it.kind === "gaps") return this.checkGaps();
    if (it.kind === "listen") return this.checkListen();
  },

  checkInput() {
    const st = this.st, it = this.cur;
    const inp = $("#ans");
    const val = inp.value;
    let res = judge(val, it.answers);
    if (res === "empty") { inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake"); inp.focus(); return; }
    let hint = "";
    if (res !== "ok" && (it.mod === "grammar" || it.type)) {
      hint = grammarHint(val, it);
      if (hint && res === "near") res = "wrong";
    }
    if (res === "near" && !st.nearTried && !st.exam) {
      st.nearTried = true;
      sfx("near");
      this.feedback("near", `<b>Fast!</b> Da ist noch ein kleiner Fehler – schau genau hin und versuch's nochmal.`);
      inp.classList.add("near"); inp.focus(); inp.select();
      return;
    }
    const notes = [];
    if (res === "ok" && it.question && !/\?\s*$/.test(val)) notes.push("Denk in der Arbeit ans Fragezeichen „?“.");
    if (res === "ok" && it.sentence && /^[a-z]/.test(val.trim())) notes.push("Satzanfang immer groß schreiben!");
    if (res === "ok" && /\b(did|was|were|do|does)nt\b/i.test(val)) notes.push("Apostroph nicht vergessen: didn't, wasn't, weren't.");
    inp.readOnly = true;
    inp.classList.add(res === "ok" ? "ok" : res === "near" ? "near" : "bad");
    this.resolve(res === "ok" ? "ok" : res === "near" && st.exam ? "half" : "bad", val, { hint, notes });
  },

  choose(k) {
    const st = this.st, it = this.cur;
    if (st.answered) return;
    const ok = k === it.correct;
    $$(".opt").forEach((b, j) => {
      b.disabled = true;
      if (!st.exam) { if (j === it.correct) b.classList.add("ok"); else if (j === k) b.classList.add("bad"); }
      else if (j === k) b.classList.add("picked");
    });
    this.resolve(ok ? "ok" : "bad", it.options[k], {});
  },

  flip() {
    const st = this.st;
    if (st.flipped) return;
    st.flipped = true;
    sfx("flip");
    $("#flash").classList.add("flipped");
    $("#flash-rate").hidden = false;
    this.setMain("", "none");
  },

  rate(knew) {
    if (this.st.answered) return;
    $("#flash-rate").hidden = true;
    this.resolve(knew ? "ok" : "bad", null, { flash: true });
  },

  renderOrder() {
    const st = this.st, it = this.cur;
    const line = $("#ord-line"), bank = $("#ord-bank");
    line.innerHTML = st.chosen.length
      ? st.chosen.map((t, k) => `<button class="tok en in" data-c="${k}">${esc(st.tokens[t].w)}</button>`).join("") + `<span class="tok-end">${esc(it.end)}</span>`
      : `<span class="muted">Tippe unten auf die Wörter …</span>`;
    $$(".tok", bank).forEach((b) => { b.classList.toggle("used", st.chosen.includes(Number(b.dataset.t))); });
    $$(".tok", bank).forEach((b) => (b.onclick = () => {
      if (st.answered) return;
      const t = Number(b.dataset.t);
      if (st.chosen.includes(t)) return;
      st.chosen.push(t); sfx("flip"); this.renderOrder();
    }));
    $$(".tok.in", line).forEach((b) => (b.onclick = () => {
      if (st.answered) return;
      st.chosen.splice(Number(b.dataset.c), 1); this.renderOrder();
    }));
    this.setMain("Prüfen", "check", st.chosen.length === 0);
  },

  checkOrder() {
    const st = this.st, it = this.cur;
    const built = st.chosen.map((t) => st.tokens[t].w).join(" ");
    const ok = canon(built) === canon(it.words.join(" "));
    $("#ord-line").classList.add(ok ? "ok" : "bad");
    this.resolve(ok ? "ok" : "bad", built + it.end, {});
  },

  checkGaps() {
    const st = this.st, it = this.cur;
    const gapSegs = st.segs.filter((s) => s.t === undefined);
    const inputs = $$(".gap");
    if (!st.exam && inputs.some((g) => !g.value.trim()) && !st.emptyWarned) {
      st.emptyWarned = true;
      this.feedback("near", "Es sind noch Lücken leer. Nochmal auf <b>Prüfen</b> drücken, um trotzdem auszuwerten.");
      return;
    }
    let pts = 0;
    const wrong = [];
    inputs.forEach((g, k) => {
      const sg = gapSegs[k];
      const r = judge(g.value, sg.answers);
      g.readOnly = true;
      if (r === "ok") { pts += 1; g.classList.add("ok"); }
      else {
        if (r === "near") { pts += 0.5; g.classList.add("near"); } else g.classList.add("bad");
        if (!st.exam) g.insertAdjacentHTML("afterend", `<span class="gap-fix">${esc(sg.answers[0])}</span>`);
        wrong.push({ q: (sg.hint ? `(${sg.hint})` : "Lücke") + ` – ${it.story.title}`, a: sg.answers[0], given: g.value });
      }
    });
    this.resolveMulti(pts, inputs.length, wrong);
  },

  checkListen() {
    const st = this.st, it = this.cur;
    let pts = 0;
    const wrong = [];
    $$(".tf").forEach((row) => {
      const k = Number(row.dataset.q);
      const [s, truth] = it.L.q[k];
      const given = st.tf[k];
      const ok = given === truth;
      if (ok) pts++; else wrong.push({ q: s, a: truth ? "true" : "false", given: given === undefined ? "–" : given ? "true" : "false" });
      if (!st.exam) {
        row.classList.add(ok ? "ok" : "bad");
        $$(".tfb", row).forEach((b) => { if ((b.dataset.v === "1") === truth) b.classList.add("right"); });
      }
    });
    if (!st.exam) {
      const t = $("#transcript");
      t.insertAdjacentHTML("beforebegin", `<button class="btn ghost small" id="show-tr">📄 Hörtext anzeigen</button>`);
      $("#show-tr").onclick = (e) => { t.hidden = !t.hidden; e.target.textContent = t.hidden ? "📄 Hörtext anzeigen" : "📄 Hörtext ausblenden"; };
      const lb = $("[data-act=listen]"); if (lb) lb.disabled = false;
      it.maxPlays = 99;
    }
    Speech.stop();
    this.resolveMulti(pts, it.L.q.length, wrong);
  },

  /* ----- Auswertung ----- */
  record(it, okFlag, res) {
    const id = it.cardId || it.id;
    if (it.card) cardResult(id, res);
    else itemResult(id, okFlag);
    markWrong(it.id, !okFlag);
    S.stats.answers++;
    if (okFlag) S.stats.correct++;
  },

  resolve(res, given, extra) {
    const st = this.st, it = this.cur;
    st.answered = true;
    const ok = res === "ok";
    this.record(it, ok, res === "half" ? "half" : ok ? "ok" : "bad");
    if (st.exam) {
      st.log.push({ section: it.section || it.label, q: it.q, a: it.a, given, pts: ok ? 1 : res === "half" ? 0.5 : 0, max: 1 });
      save();
      setTimeout(() => this.next(), it.kind === "mc" ? 250 : 0);
      return;
    }
    if (ok) {
      st.combo++; st.ok++;
      st.maxCombo = Math.max(st.maxCombo, st.combo);
      const mult = st.combo >= 10 ? 2 : st.combo >= 5 ? 1.5 : 1;
      const gain = Math.round((extra.flash ? 6 : 10) * mult);
      st.xp += gain; addXP(gain);
      missionEvent("correct", it.mod, 1);
      missionEvent("combo", null, st.combo);
      S.stats.bestCombo = Math.max(S.stats.bestCombo, st.combo);
      award("first");
      if (st.combo >= 10) award("combo10");
      if (st.combo >= 25) award("combo25");
      sfx(st.combo > 0 && st.combo % 5 === 0 ? "combo" : "ok");
      const comboTxt = st.combo >= 3 ? ` <span class="combo-pop">🔥 ${st.combo}er-Combo${mult > 1 ? " · ×" + mult : ""}</span>` : "";
      const praise = pick(["Richtig!", "Super!", "Klasse!", "Stark!", "Genau!", "Perfekt!", "Yes!"]);
      this.feedback("ok", `<b>${praise}</b> <span class="xp-pop">+${gain} XP</span>${comboTxt}
        ${it.kind === "input" && canon(given) !== canon(it.a) ? `<div class="fb-line">Musterlösung: <b class="en">${esc(it.a)}</b></div>` : ""}
        ${extra.notes && extra.notes.length ? `<div class="fb-note">💡 ${extra.notes.map(esc).join(" ")}</div>` : ""}
        ${it.explain && it.mod === "grammar" ? `<div class="fb-line small muted">${esc(it.explain)}</div>` : ""}
        ${this.sayBtn(it)}`);
    } else {
      st.combo = 0; st.bad++;
      st.mistakes.push({ q: it.q, a: it.a, given });
      if (!st.requeued.has(it.id) && it.kind !== "flash") { st.requeued.add(it.id); st.queue.push(itemById(it.id) || it); }
      sfx("bad");
      this.feedback("bad", `<b>${extra.flash ? "Kein Problem – die Karte kommt gleich nochmal." : "Leider falsch."}</b>
        ${!extra.flash ? `<div class="fb-line">Richtig ist: <b class="${it.mod === "vocab" && it.kind === "mc" ? "" : "en"}">${esc(it.a)}</b></div>` : ""}
        ${extra.hint ? `<div class="fb-note">💡 ${esc(extra.hint)}</div>` : ""}
        ${it.explain ? `<div class="fb-line small">${esc(it.explain)}</div>` : ""}
        ${!extra.flash && it.kind !== "flash" ? `<div class="fb-line small muted">Die Aufgabe kommt später nochmal.</div>` : ""}
        ${this.sayBtn(it)}`);
    }
    save();
    this.updateTop();
    this.setMain("Weiter", "next");
    $("#s-main").focus({ preventScroll: true });
  },

  resolveMulti(pts, max, wrong) {
    const st = this.st, it = this.cur;
    st.answered = true;
    const ratio = max ? pts / max : 0;
    this.record(it, ratio >= 0.8, ratio >= 0.8 ? "ok" : "bad");
    const key = it.id;
    S.stats.best[key] = Math.max(S.stats.best[key] || 0, Math.round(ratio * 100));
    if (it.kind === "gaps") { S.stats.stories++; if (S.stats.stories >= 5) award("stories5"); }
    if (it.kind === "listen") { S.stats.listen++; if (S.stats.listen >= 5) award("listen5"); }
    if (st.exam) {
      st.log.push({ section: it.section || it.label, q: it.q, a: "", given: "", pts, max, wrong });
      save();
      this.next();
      return;
    }
    const gain = Math.round(pts * 5 + (ratio === 1 ? 15 : 0));
    st.xp += gain; addXP(gain);
    missionEvent("correct", it.mod, Math.floor(pts));
    if (ratio === 1) { st.combo++; st.ok++; } else { st.combo = 0; st.bad++; wrong.forEach((w) => st.mistakes.push(w)); }
    st.maxCombo = Math.max(st.maxCombo, st.combo);
    sfx(ratio >= 0.8 ? "ok" : "bad");
    const cls = ratio === 1 ? "ok" : ratio >= 0.6 ? "near" : "bad";
    this.feedback(cls, `<b>${ratio === 1 ? "Alles richtig – wow!" : `${fmtPts(pts)} von ${max} richtig.`}</b> <span class="xp-pop">+${gain} XP</span>
      ${ratio < 1 ? `<div class="fb-line small">${it.kind === "gaps" ? "Die richtigen Lösungen stehen grün neben deinen Lücken." : "Die richtigen Antworten sind markiert."}</div>` : ""}`);
    save();
    this.updateTop();
    this.setMain("Weiter", "next");
  },

  sayBtn(it) { return it.say ? `<button class="btn ghost small fb-say" onclick="Speech.say(${esc(JSON.stringify(it.say))})">🔊 Anhören</button>` : ""; },

  feedback(cls, html) {
    const fb = $("#s-fb");
    fb.className = "feedback show " + cls;
    fb.innerHTML = html;
    if (cls === "bad") { const c = $("#s-body"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); }
  },

  updateTop() {
    const st = this.st;
    const c = $(".combo");
    if (c) { c.textContent = "🔥 " + st.combo; c.classList.toggle("hot", st.combo >= 3); }
    const p = $(".progress i");
    if (p) p.style.width = pct(st.i + 1, st.queue.length) + "%";
  },

  next() {
    const st = this.st;
    Speech.stop();
    st.i++;
    if (st.i >= st.queue.length) return this.finish();
    if (pendingRankUps.length) { showRankUp(pendingRankUps.splice(0).pop(), () => this.view()); return; }
    this.view();
  },

  finish() {
    const st = this.st;
    S.stats.sessions++;
    missionEvent("session", st.mod, 1);
    if (st.exam) return this.finishExam(st);
    this.st = null;
    const total = st.ok + st.bad;
    const perfect = st.bad === 0 && st.startCount >= 5;
    const bonus = st.opts.noBonus ? 0 : 10 + (perfect ? 20 : 0);
    if (bonus) { st.xp += bonus; addXP(bonus); }
    if (perfect) award("perfect");
    checkMasteryBadges();
    save();
    const acc = pct(st.ok, total);
    const stars = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 40 ? 1 : 0;
    const mistakes = st.mistakes.slice(0, 30);
    const after = mastery();
    const PKEY = { vocab: ["vocab", "📚 Vokabeln"], verbs: ["verbs", "⚡ Verben"], grammar: ["grammar", "🧩 Grammatik"], stories: ["stories", "✍️ Lückentexte"], listen: ["listen", "🎧 Hören"], reading: ["reading", "📖 Text-Check"] };
    let [pk, pname] = PKEY[st.mod] || ["ready", "🎯 Prüfungs-Bereitschaft"];
    let pb = st.before[pk], pa = after[pk];
    if (st.opts.prog) { pname = st.opts.prog.name; pb = st.beforeProg; pa = st.opts.prog.calc(); }
    const progHTML = `<div class="prog-gain"><span>${pname}</span>${bar(pa)}<b>${pb} % → ${pa} %</b>${pa > pb ? `<span class="xp-pop">+${pa - pb} %</span>` : ""}</div>`;
    const show = () => {
      app().innerHTML = `
        <section class="results card pop-in">
          <div class="stars">${[0, 1, 2].map((k) => `<span class="star ${k < stars ? "on" : ""}" style="animation-delay:${k * 0.15}s">★</span>`).join("")}</div>
          <h2>${perfect ? "Fehlerfrei! ✨" : stars >= 2 ? "Stark gemacht!" : stars === 1 ? "Gut geübt!" : "Dranbleiben lohnt sich!"}</h2>
          <p class="muted">${esc(st.title)}</p>
          <div class="stat-row">
            <div class="stat"><b>${st.ok}</b><span>richtig</span></div>
            <div class="stat"><b>${st.bad}</b><span>falsch</span></div>
            <div class="stat gold"><b>+${st.xp}</b><span>XP</span></div>
            <div class="stat"><b>${st.maxCombo}</b><span>beste Combo</span></div>
          </div>
          ${bonus ? `<p class="small muted">inkl. Abschluss-Bonus +${bonus} XP</p>` : ""}
          ${progHTML}
          ${mistakes.length ? `<h3>Das übst du nochmal:</h3><ul class="review">${mistakes.map((m) => `<li><span class="rq">${esc(m.q)}</span><span class="ra en">→ ${esc(m.a)}</span>${m.given ? `<span class="rg">deine Antwort: ${esc(m.given)}</span>` : ""}</li>`).join("")}</ul>` : ""}
          <div class="row-c">
            ${st.opts.rebuild ? `<button class="btn primary" id="again">Nochmal 🔁</button>` : ""}
            <a class="btn ghost" href="${st.opts.back || "#/"}">Zur Übersicht</a>
          </div>
        </section>`;
      if (stars === 3) confetti();
      const again = $("#again");
      if (again) again.onclick = () => { const o = st.opts; this.start({ ...o, items: o.rebuild() }); };
    };
    if (pendingRankUps.length) showRankUp(pendingRankUps.splice(0).pop(), show); else show();
  },

  finishExam(st) {
    this.st = null;
    const pts = st.log.reduce((a, l) => a + l.pts, 0);
    const max = st.log.reduce((a, l) => a + l.max, 0);
    const p = max ? (pts / max) * 100 : 0;
    const g = gradeFor(p);
    const sections = {};
    st.log.forEach((l) => { const k = l.section; sections[k] = sections[k] || { pts: 0, max: 0 }; sections[k].pts += l.pts; sections[k].max += l.max; });
    const gain = Math.round(p * 2 + (g.n <= 2 ? 60 : g.n <= 3 ? 30 : 10));
    addXP(gain);
    S.stats.exams.push({ d: Date.now(), p: Math.round(p), g: g.n });
    S.stats.exams = S.stats.exams.slice(-30);
    award("exam1");
    if (g.n === 1) award("examA");
    checkMasteryBadges();
    save();
    const wrong = [];
    st.log.forEach((l) => {
      if (l.wrong) l.wrong.forEach((w) => wrong.push({ ...w, section: l.section }));
      else if (l.pts < l.max) wrong.push({ q: l.q, a: l.a, given: l.given, section: l.section });
    });
    const show = () => {
      app().innerHTML = `
        <section class="results card exam-result pop-in">
          <div class="grade-badge g${g.n}"><span>${g.n}</span><small>${g.word}</small></div>
          <h2>Probearbeit ausgewertet</h2>
          <p class="big-num">${fmtPts(pts)} / ${max} Punkte · ${Math.round(p)} %</p>
          <p class="muted">${g.msg}</p>
          <div class="sect-table">${Object.entries(sections).map(([k, v]) => `
            <div class="sect"><span>${esc(k)}</span><span class="bar"><i style="width:${pct(v.pts, v.max)}%"></i></span><b>${fmtPts(v.pts)}/${v.max}</b></div>`).join("")}</div>
          <p class="stat gold inline"><b>+${gain} XP</b></p>
          ${wrong.length ? `<h3>Deine Fehler – mit Lösung:</h3><ul class="review">${wrong.map((m) => `<li><span class="rs">${esc(m.section)}</span><span class="rq">${esc(m.q)}</span><span class="ra en">→ ${esc(m.a)}</span>${m.given !== undefined && m.given !== "" ? `<span class="rg">deine Antwort: ${esc(m.given)}</span>` : ""}</li>`).join("")}</ul>` : `<p>Keine Fehler – unglaublich! 🏆</p>`}
          <div class="row-c"><a class="btn primary" href="#/exam">Neue Probearbeit</a><a class="btn ghost" href="#/">Zur Übersicht</a></div>
          <p class="small muted">Die Note ist nur eine Schätzung nach einem üblichen Punkteschlüssel.</p>
        </section>`;
      if (g.n <= 2) confetti();
    };
    if (pendingRankUps.length) showRankUp(pendingRankUps.splice(0).pop(), show); else show();
  }
};

function fmtPts(x) { return Number.isInteger(x) ? String(x) : x.toFixed(1).replace(".", ","); }
function gradeFor(p) {
  if (p >= 92) return { n: 1, word: "sehr gut", msg: "Hervorragend! Damit bist du bestens vorbereitet." };
  if (p >= 81) return { n: 2, word: "gut", msg: "Richtig gut! Schau dir die Fehler unten noch einmal an." };
  if (p >= 67) return { n: 3, word: "befriedigend", msg: "Solide! Mit etwas Übung bei den Fehlern wird es noch besser." };
  if (p >= 50) return { n: 4, word: "ausreichend", msg: "Bestanden – aber da geht noch mehr. Übe die Bereiche mit wenig Punkten." };
  if (p >= 30) return { n: 5, word: "mangelhaft", msg: "Nicht aufgeben! Lies die Regeln im Spickzettel und übe gezielt." };
  return { n: 6, word: "ungenügend", msg: "Das war schwer. Starte mit den Regeln und einzelnen Übungen – du schaffst das!" };
}
function parseGaps(text) {
  const segs = [];
  const re = /\[([^\]=]*)=([^\]]+)\]/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push({ t: text.slice(last, m.index) });
    segs.push({ hint: m[1].trim(), answers: m[2].split("|").map((s) => s.trim()) });
    last = re.lastIndex;
  }
  if (last < text.length) segs.push({ t: text.slice(last) });
  return segs;
}
function fmtStory(t) {
  return esc(t).replace(/(^|\n)([A-Z][a-z]+):/g, "$1<b class=\"who\">$2:</b>").replace(/\n/g, "<br>");
}

/* Keyboard */
document.addEventListener("keydown", (e) => {
  if (!Sess.st || document.querySelector(".overlay")) return;
  const it = Sess.cur;
  if (!it) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (e.key === "Enter") {
    const btn = $("#s-main");
    if (btn && !btn.disabled && btn.style.visibility !== "hidden") { e.preventDefault(); btn.click(); }
  } else if (it.kind === "mc" && !Sess.st.answered && /^[1-4]$/.test(e.key) && tag !== "INPUT") {
    const k = Number(e.key) - 1;
    if (k < it.options.length) Sess.choose(k);
  } else if (it.kind === "flash" && e.key === " " && tag !== "INPUT") {
    e.preventDefault();
    if (!Sess.st.flipped) Sess.flip();
  }
});

/* =========================================================
   UI-Bausteine
   ========================================================= */
function toast(html, cls = "") {
  const box = $("#toasts");
  const el = document.createElement("div");
  el.className = "toast " + cls;
  el.innerHTML = html;
  box.appendChild(el);
  setTimeout(() => el.classList.add("out"), 3200);
  setTimeout(() => el.remove(), 3700);
}
function showRankUp(idx, then) {
  const r = RANKS[idx];
  sfx("level");
  confetti();
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="modal pop-in">
      <div class="rank-big">${r.icon}</div>
      <div class="muted">Rang aufgestiegen!</div>
      <h2>${esc(r.name)}</h2>
      <p>Du hast jetzt <b>${S.xp} XP</b>. ${RANKS[idx + 1] ? `Nächster Rang: ${RANKS[idx + 1].icon} ${esc(RANKS[idx + 1].name)} bei ${RANKS[idx + 1].xp} XP.` : "Du hast den höchsten Rang erreicht – legendär!"}</p>
      <button class="btn primary big" id="rk-ok">Weiter</button>
    </div>`;
  document.body.appendChild(ov);
  const close = () => { ov.remove(); then && then(); };
  $("#rk-ok", ov).onclick = close;
  $("#rk-ok", ov).focus();
}
let confettiRun = 0;
function clearConfetti() { confettiRun++; const cv = $("#confetti"); if (cv) cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); }
function confetti() {
  const run = ++confettiRun;
  const cv = $("#confetti");
  const ctx = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ["#ffcf3f", "#ff5a6e", "#33d69f", "#4aa8ff", "#b18cff", "#ffffff"];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.4, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, s: 4 + Math.random() * 6,
    c: pick(colors), r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3
  }));
  let frame = 0;
  const step = () => {
    if (run !== confettiRun) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach((p) => {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); ctx.restore();
    });
    if (++frame < 160) requestAnimationFrame(step); else ctx.clearRect(0, 0, cv.width, cv.height);
  };
  step();
}
function ring(value, size = 120, stroke = 12, label = "") {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(value, 0, 100) / 100);
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${value} %">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" class="ring-txt" dominant-baseline="central" text-anchor="middle">${value}%</text>
    ${label ? `<text x="50%" y="${size / 2 + 22}" class="ring-sub" text-anchor="middle">${label}</text>` : ""}
  </svg>`;
}
function bar(p, cls = "") { return `<div class="bar ${cls}"><i style="width:${clamp(p, 0, 100)}%"></i></div>`; }
function daysToExam() {
  const [y, m, d] = (S.settings.examDate || "2026-10-08").split("-").map(Number);
  const exam = new Date(y, m - 1, d);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return { days: Math.round((exam - now) / 864e5), exam };
}
function examText() {
  const { days, exam } = daysToExam();
  const wd = exam.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  if (days > 1) return `Noch <b>${days} Tage</b> bis zur Englischarbeit (${wd}).`;
  if (days === 1) return `<b>Morgen</b> ist die Englischarbeit – du schaffst das! 💪`;
  if (days === 0) return `<b>Heute</b> ist die Englischarbeit. Viel Erfolg! 🍀`;
  return `Die Englischarbeit ist vorbei – weiter üben hält dich fit!`;
}

/* ---------- Topbar ---------- */
function renderTopbar() {
  const ri = rankInfo();
  const tb = $("#topbar");
  tb.innerHTML = `
    <div class="tb-inner">
      <a class="brand" href="#/" aria-label="Startseite"><span class="logo">EQ</span><span class="brand-txt">English Quest</span></a>
      <a class="rankchip" href="#/profile" title="Rang & Abzeichen">
        <span class="r-icon">${ri.cur.icon}</span>
        <span class="r-meta"><span class="r-name">${esc(ri.cur.name)}</span>${bar(ri.prog * 100, "xp")}</span>
        <span class="xp-num">${S.xp} XP</span>
      </a>
      <div class="tb-right">
        <span class="streak ${streakNow() ? "on" : ""}" title="Tage in Folge gelernt">🔥 ${streakNow()}</span>
        <a class="icon-btn" href="#/save" title="Spielstand übertragen & Einstellungen" aria-label="Spielstand">💾</a>
      </div>
    </div>`;
}

/* =========================================================
   Seiten
   ========================================================= */
const MODULES = [
  { id: "vocab",   href: "#/vocab",   icon: "📚", name: "Vokabeln",            sub: "S. 209–217",                key: "vocab",   color: "blue" },
  { id: "verbs",   href: "#/verbs",   icon: "⚡", name: "Unregelmäßige Verben", sub: "go – went, see – saw …",      key: "verbs",   color: "gold" },
  { id: "grammar", href: "#/grammar", icon: "🧩", name: "Grammatik",           sub: "Fragen, Kurzantworten, didn't", key: "grammar", color: "purple" },
  { id: "stories", href: "#/stories", icon: "✍️", name: "Lückentexte",         sub: "Geschichten im Simple Past",  key: "stories", color: "green" },
  { id: "listen",  href: "#/listen",  icon: "🎧", name: "Hören",               sub: "Listening wie in der Arbeit", key: "listen",  color: "red" },
  { id: "reading", href: "#/reading", icon: "📖", name: "Text-Check",          sub: "Buch S. 15, 20 & 22",         key: "reading", color: "orange" },
  { id: "writing", href: "#/writing", icon: "🖊️", name: "Schreibwerkstatt",    sub: "Sätze mit didn't",            key: null,      color: "purple" },
  { id: "beae",    href: "#/beae",    icon: "🇬🇧", name: "British vs. American", sub: "biscuit oder cookie?",       key: null,      color: "blue" },
  { id: "dice",    href: "#/dice",    icon: "🎲", name: "Würfelspiel",         sub: "Something funny for money",   key: null,      color: "green" }
];

function viewHome() {
  ensureMissions();
  const m = mastery();
  const today = S.days[dayStr()] || 0;
  const goal = 100;
  const tips = [
    "Nach <b>did</b> und <b>didn't</b> kommt immer die Grundform: <i>Did you <u>go</u>? – I didn't <u>go</u>.</i>",
    "Kurzantworten wiederholen nur <b>did</b>: <i>Did Lily feel sick? – Yes, she did.</i>",
    "Bei <b>be</b> kein did: <i>Was the trip long? – No, it wasn't.</i>",
    "Signalwörter fürs Simple Past: <b>yesterday, last week, two days ago</b>.",
    "<b>stop → stopped</b>, <b>try → tried</b>, <b>like → liked</b> – achte auf die Schreibung!",
    "<b>pants</b> (AE) = trousers (BE). In England sind <i>pants</i> die Unterhose! 😄"
  ];
  const tip = tips[hashStr(dayStr()) % tips.length];
  const wrongCount = S.wrong.length;
  app().innerHTML = `
    <section class="hero card">
      <div class="hero-main">
        <h1>Hi ${esc(S.name)}! 👋</h1>
        <p class="lead">${examText()}</p>
        <div class="hero-actions">
          <a class="btn primary big" href="#/exam">🏆 Probearbeit starten</a>
          <button class="btn ghost" id="quick">⚡ Schnell-Mix (12 Aufgaben)</button>
        </div>
        <p class="tip">💡 ${tip}</p>
      </div>
      <div class="hero-side">
        ${ring(m.ready, 150, 14, "bereit")}
        <div class="muted small center">Prüfungs-Bereitschaft</div>
      </div>
    </section>

    <section class="two-col">
      <div class="card">
        <div class="card-head"><h2>Tagesmissionen</h2><span class="muted small">+30 XP pro Mission</span></div>
        <ul class="missions">${S.missions.list.map((x) => {
          const def = MISSIONS.find((d) => d.id === x.id);
          if (!def) return "";
          const p = def.kind === "xp" ? Math.min(today, def.goal) : x.p;
          return `<li class="${x.done ? "done" : ""}"><span class="m-check">${x.done ? "✓" : "○"}</span><span class="m-text">${esc(def.text)}</span><span class="m-prog">${Math.min(p, def.goal)}/${def.goal}</span>${bar(pct(p, def.goal), "thin")}</li>`;
        }).join("")}</ul>
      </div>
      <div class="card daily">
        <div class="card-head"><h2>Heute</h2><span class="streak-big">🔥 ${streakNow()} ${streakNow() === 1 ? "Tag" : "Tage"}</span></div>
        <div class="daily-row">${ring(pct(Math.min(today, goal), goal), 96, 10)}<div><b>${today} / ${goal} XP</b><div class="muted small">Tagesziel</div>${today >= goal ? `<div class="good-txt">Tagesziel geschafft! 🎉</div>` : ""}</div></div>
        <a class="btn ${wrongCount ? "warn-btn" : "ghost"} full" href="#/mistakes">🔁 Fehler-Training ${wrongCount ? `<span class="pill">${wrongCount}</span>` : ""}</a>
      </div>
    </section>

    <h2 class="section-title">Trainingsbereiche</h2>
    <section class="grid">${MODULES.map((mod) => `
      <a class="mod card c-${mod.color}" href="${mod.href}">
        <span class="mod-icon">${mod.icon}</span>
        <span class="mod-name">${esc(mod.name)}</span>
        <span class="mod-sub">${esc(mod.sub)}</span>
        ${mod.key ? `${bar(m[mod.key])}<span class="mod-pct">${m[mod.key]} % Fortschritt</span>` : `<span class="mod-pct">Bonus-XP</span>`}
      </a>`).join("")}
      <a class="mod card c-boss" href="#/exam">
        <span class="mod-icon">🏆</span>
        <span class="mod-name">Probearbeit</span>
        <span class="mod-sub">Wie am Donnerstag: Listening, Grammar, Writing, Vokabeln</span>
        <span class="mod-pct">${S.stats.exams.length ? `Beste Note: ${Math.min(...S.stats.exams.map((e) => e.g))}` : "Noch nicht geschrieben"}</span>
      </a>
    </section>`;
  $("#quick").onclick = () => startQuickMix();
}

function startQuickMix() {
  const build = () => {
    const vids = pickCards(VOCAB.filter((v) => S.settings.vgroups.includes(v.g)).map((v) => v.id), 4);
    const iv = pickCards(VERBS.map((v) => v.id), 3);
    const gr = pickItems(ALL_GRAMMAR_IDS, 5);
    return shuffle([...vids.map(vocabInput), ...iv.map(verbInput), ...gr.map(grammarItem)]);
  };
  Sess.start({ title: "Schnell-Mix", mod: "mix", items: build(), rebuild: build, back: "#/" });
}

/* ---------- Vokabeln ---------- */
function viewVocab() {
  const sel = new Set(S.settings.vgroups);
  const ids = () => VOCAB.filter((v) => S.settings.vgroups.includes(v.g)).map((v) => v.id);
  const weak = VOCAB.filter((v) => { const c = S.cards[v.id]; return c && c.b <= 1 && c.w > 0; });
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>📚 Vokabeln</h1></div>
    <div class="card">
      <h2>1. Wähle die Seiten</h2>
      <div class="group-list">${VOCAB_GROUPS.map((g) => {
        const n = VOCAB.filter((v) => v.g === g.id).length;
        return `<button class="group ${sel.has(g.id) ? "on" : ""}" data-g="${g.id}">
          <span class="g-check">${sel.has(g.id) ? "✓" : ""}</span>
          <span class="g-name">${esc(g.name)}<small>${g.pages} · ${n} Wörter</small></span>
          <span class="g-pct">${groupMastery(g.id)} %</span>
        </button>`;
      }).join("")}</div>
      <p class="small muted">Der Wortkasten auf S. 216 (Eco fashion …) ist zum Schluss dran – frag deinen Lehrer, ob er dazugehört.</p>
    </div>
    <div class="card">
      <h2>2. Wähle das Spiel</h2>
      <div class="modes">
        <button class="mode" data-m="flash"><span>🃏</span><b>Karteikarten</b><small>Umdrehen & selbst bewerten</small></button>
        <button class="mode" data-m="input"><span>⌨️</span><b>Schreiben</b><small>Deutsch → Englisch tippen</small></button>
        <button class="mode" data-m="mc"><span>🔘</span><b>Auswählen</b><small>Englisch → Deutsch</small></button>
        <button class="mode" data-m="mix"><span>🔀</span><b>Mix</b><small>Alles durcheinander</small></button>
        <button class="mode ${weak.length ? "" : "dim"}" data-m="weak"><span>🎯</span><b>Schwache Wörter</b><small>${weak.length} Wörter</small></button>
        <a class="mode" href="#/words"><span>📋</span><b>Wortliste</b><small>Alle Wörter ansehen</small></a>
      </div>
      <p class="small muted">Das Spiel merkt sich jedes Wort: Was du kannst, kommt seltener – was schwer ist, öfter. Einmal richtig zählt schon halb, zweimal richtig heißt gemeistert. Wörter, die du einmal richtig hattest, kommen bald zur Bestätigung wieder.</p>
    </div>`;
  $$(".group").forEach((b) => (b.onclick = () => {
    const g = b.dataset.g;
    const set = new Set(S.settings.vgroups);
    if (set.has(g)) { if (set.size > 1) set.delete(g); } else set.add(g);
    S.settings.vgroups = VOCAB_GROUPS.map((x) => x.id).filter((x) => set.has(x));
    save(); viewVocab();
  }));
  $$(".mode[data-m]").forEach((b) => (b.onclick = () => {
    const mode = b.dataset.m;
    let build;
    if (mode === "weak") {
      if (!weak.length) { toast("Keine schwachen Wörter – stark! 💪"); return; }
      build = () => shuffle(VOCAB.filter((v) => { const c = S.cards[v.id]; return c && c.b <= 1 && c.w > 0; }).slice(0, 12).map((v) => vocabInput(v.id)));
    } else {
      build = () => pickCards(ids(), 12).map((id) => mode === "flash" ? vocabFlash(id) : mode === "input" ? vocabInput(id) : mode === "mc" ? vocabMC(id) : (Math.random() < 0.55 ? vocabInput(id) : vocabMC(id)));
    }
    const prog = { name: "📚 Gewählte Seiten", calc: () => progress(ids(), cardCredit) };
    Sess.start({ title: "Vokabeln · " + b.querySelector("b").textContent, mod: "vocab", items: build(), rebuild: build, back: "#/vocab", prog });
  }));
}

function boxDots(id) {
  const c = S.cards[id];
  const b = c ? c.b : -1;
  return `<span class="dots" title="${b < 0 ? "noch nicht geübt" : b >= 3 ? "gemeistert" : "in Arbeit"}">${[1, 2, 3, 4, 5].map((k) => `<i class="${b >= k ? "on" : ""} ${b >= 3 ? "m" : ""}"></i>`).join("")}</span>`;
}
function viewWords() {
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/vocab">←</a><h1>📋 Wortliste</h1></div>
    <div class="card">
      <input id="wsearch" class="answer small" type="search" placeholder="Suchen (englisch oder deutsch) …" autocomplete="off">
      <div id="wlist"></div>
    </div>`;
  const draw = () => {
    const q = canon($("#wsearch").value);
    $("#wlist").innerHTML = VOCAB_GROUPS.map((g) => {
      const list = VOCAB.filter((v) => v.g === g.id && (!q || canon(v.en).includes(q) || canon(v.de).includes(q)));
      if (!list.length) return "";
      return `<h3>${esc(g.name)} <span class="muted small">${g.pages}</span></h3>
        <div class="wtable">${list.map((v) => `
          <div class="wrow"><button class="say" data-say="${esc(v.en.replace(/…/g, ""))}" aria-label="Aussprache">🔊</button>
          <span class="w-en en">${esc(v.en)}${v.n ? ` <small>(${esc(v.n)})</small>` : ""}</span><span class="w-de">${esc(v.de)}</span>${boxDots(v.id)}</div>`).join("")}</div>`;
    }).join("") || `<p class="muted">Nichts gefunden.</p>`;
    $$("[data-say]").forEach((b) => (b.onclick = () => Speech.say(b.dataset.say)));
  };
  $("#wsearch").oninput = draw;
  draw();
}

/* ---------- Unregelmäßige Verben ---------- */
function viewVerbs() {
  const m = mastery();
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>⚡ Unregelmäßige Verben</h1></div>
    <div class="card">
      <div class="row-between"><div><b>${VERBS.length} Verben</b> · ${m.verbs} % Fortschritt</div><div class="muted small">Rekord Verb-Blitz: <b>${S.stats.blitzBest}</b></div></div>
      ${bar(m.verbs)}
      <div class="modes">
        <button class="mode" data-m="past"><span>➡️</span><b>Simple Past bilden</b><small>go → went</small></button>
        <button class="mode" data-m="base"><span>⬅️</span><b>Grundform finden</b><small>went → go</small></button>
        <button class="mode" data-m="blitz"><span>🌩️</span><b>Verb-Blitz</b><small>60 Sekunden – so viele wie möglich!</small></button>
        <a class="mode" href="#/verblist"><span>📋</span><b>Liste</b><small>Alle Verben ansehen</small></a>
      </div>
      <p class="small muted">Das sind die Verben aus deinem Heft. Für unregelmäßige Formen gibt es keine Regeln – du musst sie auswendig lernen. <b>want</b> und <b>try</b> sind regelmäßig, aber achte auf die Schreibung: tr<b>ied</b>.</p>
    </div>`;
  $$(".mode[data-m]").forEach((b) => (b.onclick = () => {
    const mode = b.dataset.m;
    if (mode === "blitz") return startBlitz();
    const build = () => {
      const ids = pickCards(VERBS.map((v) => v.id), 12);
      return ids.map((id) => mode === "past" ? verbInput(id) : verbReverse(id));
    };
    Sess.start({ title: "Unregelmäßige Verben", mod: "verbs", items: build(), rebuild: build, back: "#/verbs" });
  }));
}
function viewVerbList() {
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/verbs">←</a><h1>📋 Verbliste</h1></div>
    <div class="card">
      <input id="vsearch" class="answer small" type="search" placeholder="Suchen …" autocomplete="off">
      <div class="vtable" id="vlist"></div>
    </div>`;
  const draw = () => {
    const q = canon($("#vsearch").value);
    $("#vlist").innerHTML = `<div class="vrow head"><span></span><span>Grundform</span><span>Simple Past</span><span>Deutsch</span><span></span></div>` +
      VERBS.filter((v) => !q || canon(v.base + " " + v.past + " " + v.de).includes(q)).map((v) => `
      <div class="vrow"><button class="say" data-say="${esc(v.base + ". " + v.past.replace("/", ", "))}" aria-label="Aussprache">🔊</button><span class="en">${esc(v.base)}</span><span class="en strong">${esc(v.past)}</span><span>${esc(v.de)}</span>${boxDots(v.id)}</div>`).join("");
    $$("[data-say]").forEach((b) => (b.onclick = () => Speech.say(b.dataset.say)));
  };
  $("#vsearch").oninput = draw;
  draw();
}

function startBlitz() {
  let score = 0, left = 60, timer = null, cur = null, done = false, streak = 0, misses = [];
  const order = shuffle(VERBS);
  let idx = 0;
  app().innerHTML = `
    <section class="session blitz">
      <div class="s-top"><button class="icon-btn" id="bq" aria-label="Beenden">✕</button><div class="progress time"><i id="tbar" style="width:100%"></i></div><span class="s-count" id="tleft">60 s</span></div>
      <div class="s-label">Verb-Blitz · Simple Past so schnell du kannst!</div>
      <div class="card s-card blitz-card">
        <div class="blitz-score">⚡ <b id="bscore">0</b></div>
        <div class="big en" id="bverb"></div>
        <div class="tag" id="bde"></div>
        <input id="bans" class="answer" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Simple Past … (Enter)">
        <div class="blitz-fb" id="bfb"></div>
      </div>
      <p class="center muted small">Rekord: ${S.stats.blitzBest}</p>
    </section>`;
  const inp = $("#bans");
  const nextVerb = () => { cur = order[idx++ % order.length]; $("#bverb").textContent = cur.base; $("#bde").textContent = cur.de; inp.value = ""; inp.className = "answer"; inp.focus(); };
  const end = () => {
    if (done) return;
    done = true; clearInterval(timer);
    const gain = score * 5 + 10;
    const best = score > S.stats.blitzBest;
    if (best) S.stats.blitzBest = score;
    if (score >= 15) award("blitz15");
    addXP(gain);
    missionEvent("session", "blitz", 1);
    missionEvent("correct", "verbs", score);
    save();
    app().innerHTML = `
      <section class="results card pop-in">
        <div class="rank-big">🌩️</div>
        <h2>${score} Verben in 60 Sekunden!</h2>
        ${best ? `<p class="good-txt">Neuer Rekord! 🎉</p>` : `<p class="muted">Rekord: ${S.stats.blitzBest}</p>`}
        <div class="stat-row"><div class="stat gold"><b>+${gain}</b><span>XP</span></div><div class="stat"><b>${misses.length}</b><span>Fehler</span></div></div>
        ${misses.length ? `<h3>Diese Formen merken:</h3><ul class="review">${misses.map((m) => `<li><span class="rq en">${esc(m.base)}</span><span class="ra en">→ ${esc(m.past)}</span></li>`).join("")}</ul>` : ""}
        <div class="row-c"><button class="btn primary" id="again">Nochmal ⚡</button><a class="btn ghost" href="#/verbs">Zurück</a></div>
      </section>`;
    if (best && score > 5) confetti();
    $("#again").onclick = startBlitz;
  };
  $("#bq").onclick = () => { done = true; clearInterval(timer); location.hash = "#/verbs"; if (location.hash === "#/verbs") route(); };
  inp.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || done) return;
    e.preventDefault();
    if (!inp.value.trim()) return;
    const ok = judge(inp.value, [cur.past, ...cur.alt]) === "ok";
    cardResult(cur.id, ok ? "ok" : "bad");
    S.stats.answers++;
    if (ok) { score++; streak++; S.stats.correct++; sfx(streak % 5 === 0 ? "combo" : "ok"); $("#bfb").innerHTML = `<span class="good-txt">✓ ${esc(cur.past)}</span>`; }
    else { streak = 0; misses.push(cur); sfx("bad"); $("#bfb").innerHTML = `<span class="bad-txt">✗ ${esc(cur.base)} → <b>${esc(cur.past)}</b></span>`; }
    $("#bscore").textContent = score;
    nextVerb();
  });
  nextVerb();
  const t0 = Date.now();
  timer = setInterval(() => {
    if (!document.body.contains(inp)) { clearInterval(timer); return; }
    left = Math.max(0, 60 - Math.floor((Date.now() - t0) / 1000));
    $("#tleft").textContent = left + " s";
    $("#tbar").style.width = pct(left, 60) + "%";
    if (left <= 0) end();
  }, 250);
}

/* ---------- Grammatik ---------- */
function viewGrammar() {
  const m = mastery();
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>🧩 Grammatik: Simple Past</h1></div>
    <a class="card rules-link" href="#/rules"><span class="mod-icon">📌</span><div><b>Spickzettel: Alle Regeln</b><div class="muted small">Zuerst lesen, dann üben – mit Beispielen und typischen Fehlern</div></div><span class="arrow">→</span></a>
    <div class="card">
      <div class="row-between"><b>Gesamt</b><span>${m.grammar} % Fortschritt</span></div>${bar(m.grammar)}
      <div class="topic-list">${GRAMMAR_TOPICS.map((t) => `
        <button class="topic" data-t="${t.id}"><span class="t-icon">${t.icon}</span><span class="t-txt"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></span><span class="t-pct">${topicMastery(t.id)} %</span></button>`).join("")}
        <button class="topic mix" data-t="all"><span class="t-icon">🎲</span><span class="t-txt"><b>Grammatik-Mix</b><small>Von allem etwas – wie in der Arbeit</small></span><span class="t-pct">→</span></button>
      </div>
    </div>`;
  $$(".topic").forEach((b) => (b.onclick = () => {
    const t = b.dataset.t;
    const build = () => (t === "all" ? pickItems(ALL_GRAMMAR_IDS, 12) : pickItems(grammarIds(t), 10)).map(grammarItem);
    const topic = GRAMMAR_TOPICS.find((x) => x.id === t);
    const name = t === "all" ? "Grammatik-Mix" : topic.name;
    const prog = t === "all" ? null : { name: `${topic.icon} ${topic.name}`, calc: () => topicMastery(t) };
    Sess.start({ title: name, mod: "grammar", items: build(), rebuild: build, back: "#/grammar", prog });
  }));
}

function viewRules() {
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/grammar">←</a><h1>📌 Spickzettel Simple Past</h1></div>
    <div class="rules">
      <div class="card rule">
        <h2>1. Wann benutze ich das Simple Past?</h2>
        <p>Für Dinge, die in der Vergangenheit passiert und <b>abgeschlossen</b> sind.</p>
        <p>Signalwörter: <span class="kw">yesterday</span> <span class="kw">last week / month / year / Friday</span> <span class="kw">two days ago</span> <span class="kw">in 2025</span></p>
        <p class="ex en">Mrs Wilson <b>talked</b> to her class <u>yesterday</u>.</p>
      </div>
      <div class="card rule">
        <h2>2. Regelmäßige Verben: + ed</h2>
        <table class="rtable">
          <tr><td>Normalfall</td><td class="en">talk → talk<b>ed</b>, want → want<b>ed</b></td></tr>
          <tr><td>endet auf -e → nur -d</td><td class="en">like → like<b>d</b>, move → move<b>d</b></td></tr>
          <tr><td>kurzer Vokal + 1 Konsonant → verdoppeln</td><td class="en">plan → pla<b>nned</b>, stop → sto<b>pped</b></td></tr>
          <tr><td>Konsonant + y → ied</td><td class="en">try → tr<b>ied</b>, cry → cr<b>ied</b></td></tr>
          <tr><td>Vokal + y → ed</td><td class="en">play → play<b>ed</b>, stay → stay<b>ed</b></td></tr>
        </table>
      </div>
      <div class="card rule">
        <h2>3. Unregelmäßige Verben</h2>
        <p>Keine Regel – <b>auswendig lernen!</b> <span class="en">go → went, see → saw, take → took, have → had, think → thought …</span></p>
        <a class="btn ghost small" href="#/verbs">⚡ Zu den Verben</a>
      </div>
      <div class="card rule">
        <h2>4. Verneinung: didn't + Grundform</h2>
        <p>Für <b>alle</b> Personen gleich: <span class="en">I / you / he / she / it / we / they <b>didn't</b> + Grundform</span></p>
        <p class="ex en">Ty <b>didn't go</b> to the party. &nbsp; Lily <b>didn't take</b> the bus.</p>
        <p class="wrong en">✗ Ty didn't went. &nbsp; ✗ He didn't liked it.</p>
        <p class="right en">✓ Ty didn't go. &nbsp; ✓ He didn't like it.</p>
        <p class="small">didn't = did not</p>
      </div>
      <div class="card rule">
        <h2>5. Fragen: Did + Person + Grundform …?</h2>
        <table class="rtable en">
          <tr><td><b>Did</b></td><td>you / Ryan / the Austins</td><td><b>go</b> swimming / <b>like</b> the film</td><td>yesterday?</td></tr>
        </table>
        <p class="ex en"><b>Did</b> you <b>like</b> my pictures? &nbsp; <b>Did</b> he <b>wear</b> his school uniform?</p>
        <p class="wrong en">✗ Did you went to the park?</p>
        <p class="right en">✓ Did you go to the park?</p>
        <p class="small">Mit Fragewort: <span class="en">What <b>did</b> you <b>do</b>? Where <b>did</b> they <b>go</b>?</span></p>
      </div>
      <div class="card rule">
        <h2>6. Kurzantworten</h2>
        <p><span class="en"><b>Yes,</b> + Pronomen + <b>did.</b> &nbsp; / &nbsp; <b>No,</b> + Pronomen + <b>didn't.</b></span></p>
        <p class="ex en">Did Ryan play football? – Yes, <b>he did</b>. &nbsp; Did Lily walk home? – No, <b>she didn't</b>.</p>
        <table class="rtable">
          <tr><td class="en">Ryan, Ty, Josh, Sherlock</td><td class="en">→ he</td></tr>
          <tr><td class="en">Lily, Ruby, Ava, Mrs Wilson</td><td class="en">→ she</td></tr>
          <tr><td class="en">the party, the trip, it</td><td class="en">→ it</td></tr>
          <tr><td class="en">the Austins, the students</td><td class="en">→ they</td></tr>
          <tr><td class="en">you (eine Person)</td><td class="en">→ I</td></tr>
          <tr><td class="en">you guys, Karam and you</td><td class="en">→ we</td></tr>
        </table>
        <p class="wrong en">✗ Yes, Ryan did. &nbsp; ✗ Yes, he played.</p>
      </div>
      <div class="card rule">
        <h2>7. Sonderfall be: was / were</h2>
        <table class="rtable en">
          <tr><td>I / he / she / it</td><td><b>was</b> – <b>wasn't</b></td></tr>
          <tr><td>you / we / they</td><td><b>were</b> – <b>weren't</b></td></tr>
        </table>
        <p class="ex en"><b>Was</b> Ty's farewell party a surprise? – Yes, it <b>was</b>.<br><b>Were</b> the students nervous? – No, they <b>weren't</b>.</p>
        <p class="wrong en">✗ Did the trip be long? &nbsp; ✗ It didn't was easy.</p>
        <p class="right en">✓ Was the trip long? &nbsp; ✓ It wasn't easy.</p>
      </div>
      <div class="row-c"><a class="btn primary big" href="#/grammar">Jetzt üben 🧩</a></div>
    </div>`;
}

/* ---------- Lückentexte ---------- */
function viewStories() {
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>✍️ Lückentexte</h1></div>
    <p class="muted">Setze die Verben ins Simple Past. Bei <b>(not …)</b> brauchst du die Verneinung mit <b>didn't</b>. Mit <b>Enter</b> springst du zur nächsten Lücke.</p>
    <div class="story-list">${STORIES.map((st) => {
      const best = S.stats.best["st." + st.id];
      return `<button class="card story-card" data-s="${st.id}">
        <span class="story-icon">${st.icon}</span>
        <span class="t-txt"><b class="en">${esc(st.title)}</b><small>${esc(st.focus)} · ${parseGaps(st.text).filter((s) => s.t === undefined).length} Lücken</small></span>
        <span class="best ${best >= 80 ? "good" : ""}">${best !== undefined ? best + " %" : "neu"}</span>
      </button>`;
    }).join("")}</div>`;
  $$(".story-card").forEach((b) => (b.onclick = () => {
    const st = STORIES.find((s) => s.id === b.dataset.s);
    Sess.start({ title: "Lückentext · " + st.title, mod: "stories", items: [storyItem(st)], rebuild: () => [storyItem(st)], back: "#/stories" });
  }));
}

/* ---------- Hören ---------- */
function viewListen() {
  const noVoice = !Speech.ok;
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>🎧 Hören</h1></div>
    ${noVoice ? `<p class="warn card">Dein Browser unterstützt keine Sprachausgabe. Probier Chrome, Edge oder Safari.</p>` : ""}
    <div class="card">
      <h2>Hörtexte · true or false?</h2>
      <p class="muted small">In der Arbeit hörst du den Text zweimal. Lies zuerst die Aussagen, dann drück auf Abspielen. Die Stimme kommt von deinem Browser.</p>
      <div class="story-list">${LISTENING.map((L) => {
        const best = S.stats.best["ls." + L.id];
        return `<button class="card story-card" data-l="${L.id}"><span class="story-icon">${L.icon}</span><span class="t-txt"><b class="en">${esc(L.title)}</b><small>${L.voices ? "Dialog" : "Erzählung"} · ${L.q.length} Aussagen</small></span><span class="best ${best >= 80 ? "good" : ""}">${best !== undefined ? best + " %" : "neu"}</span></button>`;
      }).join("")}</div>
    </div>
    <div class="card">
      <h2>Hör-Diktat</h2>
      <p class="muted small">Du hörst einen Satz im Simple Past und schreibst ihn auf. Perfekt für Rechtschreibung!</p>
      <button class="btn primary" id="dict">🎧 Diktat starten (8 Sätze)</button>
    </div>
    <div class="card">
      <h2>Stimme testen</h2>
      <div class="row-c"><button class="btn ghost" id="vtest">🔊 Testsatz</button><label class="small">Tempo <input type="range" id="rate" min="0.6" max="1.1" step="0.05" value="${S.settings.rate}"></label></div>
      <p class="small muted" id="vinfo"></p>
    </div>`;
  const info = () => { const el = $("#vinfo"); if (!el) return; const [a] = Speech.pair(); el.textContent = a ? `Stimme: ${a.name} (${a.lang}) – ändern unter 💾 Einstellungen.` : "Keine englische Stimme gefunden."; };
  info(); setTimeout(info, 800);
  $("#vtest").onclick = () => Speech.say("Hi Max! Did you have a good day at school? Yes, I did.");
  $("#rate").oninput = (e) => { S.settings.rate = Number(e.target.value); save(); };
  $$("[data-l]").forEach((b) => (b.onclick = () => {
    const L = LISTENING.find((x) => x.id === b.dataset.l);
    Sess.start({ title: "Hören · " + L.title, mod: "listen", items: [listenItem(L)], rebuild: () => [listenItem(L)], back: "#/listen" });
  }));
  $("#dict").onclick = () => {
    const build = () => sample(DICTATION.map((_, i) => i), 8).map(dictItem);
    Sess.start({ title: "Hör-Diktat", mod: "listen", items: build(), rebuild: build, back: "#/listen" });
  };
}

/* ---------- Text-Check ---------- */
function viewReading() {
  const pages = [15, 20, 22];
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>📖 Text-Check</h1></div>
    <div class="card">
      <p>Lies die Texte im Schülerbuch noch einmal und beantworte dann die Fragen. Du darfst auch nachschauen – so lernst du den Inhalt am besten.</p>
      <div class="story-list">${pages.map((p) => {
        const list = READING.map((r, i) => ({ r, i })).filter((x) => x.r.p === p);
        const done = list.filter((x) => itemMastered("rd." + x.i, 1)).length;
        const title = { 15: "We only arrived last week!", 20: "This is our club!", 22: "Sorry I didn't post last week!" }[p];
        return `<button class="card story-card" data-p="${p}"><span class="story-icon">📄</span><span class="t-txt"><b>S. ${p}: <span class="en">${title}</span></b><small>${list.length} Fragen</small></span><span class="best ${done === list.length ? "good" : ""}">${done}/${list.length}</span></button>`;
      }).join("")}
        <button class="card story-card" data-p="all"><span class="story-icon">🔀</span><span class="t-txt"><b>Alle Texte gemischt</b><small>10 Fragen</small></span><span class="best">→</span></button>
      </div>
    </div>`;
  $$("[data-p]").forEach((b) => (b.onclick = () => {
    const p = b.dataset.p;
    const build = () => {
      const idx = READING.map((r, i) => ({ r, i })).filter((x) => p === "all" || x.r.p === Number(p)).map((x) => x.i);
      return (p === "all" ? sample(idx, 10) : shuffle(idx)).map(readingItem);
    };
    Sess.start({ title: "Text-Check", mod: "reading", items: build(), rebuild: build, back: "#/reading" });
  }));
}

/* ---------- British vs. American ---------- */
function viewBEAE() {
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>🇬🇧 British vs. American 🇺🇸</h1></div>
    <div class="card">
      <div class="pair-table">${BEAE.map(([b, a, d]) => `<div class="pair"><span class="en">🇬🇧 ${esc(b)}</span><span class="en">🇺🇸 ${esc(a)}</span><span class="muted small">${esc(d)}</span></div>`).join("")}</div>
      <p class="small muted">Schreibweise: 🇺🇸 color, neighbor, favorite, center, mom → 🇬🇧 colour, neighbour, favourite, centre, mum</p>
      <div class="modes">
        <a class="mode" href="#/memory"><span>🧠</span><b>Memory</b><small>Finde die Paare</small></a>
        <button class="mode" data-m="quiz"><span>❓</span><b>Quiz</b><small>BE ↔ AE</small></button>
        <button class="mode" data-m="spell"><span>✏️</span><b>Britisch schreiben</b><small>color → colour</small></button>
      </div>
    </div>`;
  $$("[data-m]").forEach((b) => (b.onclick = () => {
    const build = b.dataset.m === "quiz"
      ? () => shuffle([...BEAE.map((_, i) => beaeItem("ae", i)), ...BEAE.map((_, i) => beaeItem("be", i))]).slice(0, 10)
      : () => shuffle(SPELLING.map((_, i) => beaeItem("sp", i)));
    Sess.start({ title: "British vs. American", mod: "beae", items: build(), rebuild: build, back: "#/beae" });
  }));
}
function viewMemory() {
  const cards = shuffle(BEAE.flatMap(([b, a], i) => [{ t: b, f: "🇬🇧", p: i }, { t: a, f: "🇺🇸", p: i }]));
  let open = [], found = 0, moves = 0, lock = false;
  const t0 = Date.now();
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/beae">←</a><h1>🧠 Memory</h1></div>
    <p class="muted">Finde zu jedem britischen Wort das amerikanische. <span id="mm">Züge: 0</span></p>
    <div class="memory">${cards.map((c, k) => `<button class="mcard" data-k="${k}" aria-label="Karte ${k + 1}"><span class="mfront">?</span><span class="mback"><small>${c.f}</small><b class="en">${esc(c.t)}</b></span></button>`).join("")}</div>`;
  $$(".mcard").forEach((el) => (el.onclick = () => {
    if (lock || el.classList.contains("open") || el.classList.contains("found")) return;
    el.classList.add("open"); sfx("flip");
    open.push(el);
    if (open.length < 2) return;
    moves++; $("#mm").textContent = "Züge: " + moves;
    const [a, b] = open;
    const ca = cards[a.dataset.k], cb = cards[b.dataset.k];
    if (ca.p === cb.p && ca.f !== cb.f) {
      a.classList.add("found"); b.classList.add("found"); open = []; found++; sfx("ok"); addXP(4);
      if (found === BEAE.length) {
        const secs = Math.round((Date.now() - t0) / 1000);
        const gain = Math.max(10, 40 - Math.max(0, moves - BEAE.length) * 2);
        addXP(gain);
        S.stats.sessions++; save();
        setTimeout(() => {
          confetti();
          app().insertAdjacentHTML("beforeend", `<div class="card results pop-in"><h2>Alle Paare gefunden! 🎉</h2><p>${moves} Züge · ${secs} Sekunden · <b class="gold-txt">+${gain} XP</b></p><div class="row-c"><button class="btn primary" id="again">Nochmal</button><a class="btn ghost" href="#/beae">Zurück</a></div></div>`);
          $("#again").onclick = viewMemory;
        }, 400);
      }
    } else {
      lock = true; sfx("bad");
      setTimeout(() => { a.classList.remove("open"); b.classList.remove("open"); open = []; lock = false; }, 900);
    }
  }));
}

/* ---------- Würfelspiel ---------- */
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const dieHTML = (n) => `<div class="die">${Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[n].includes(k + 1) ? "on" : ""}"></i>`).join("")}</div>`;
function viewDice() {
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>🎲 Würfelspiel</h1></div>
    <div class="card">
      <p><b>Something funny for money:</b> Du hast etwas Lustiges für einen guten Zweck gemacht. Würfle eine Aktivität und einen Kommentar und schreib beides im <b>Simple Past</b>.</p>
      <p class="ex en small">Beispiel: 2 + 5 → I went everywhere in my pyjamas. I enjoyed the day.</p>
      <div class="dice-table">
        <div><h3>🎲 1 · Activities</h3><ol class="en small">${DICE_ACT.map((a) => `<li>${esc(a[0])}</li>`).join("")}</ol></div>
        <div><h3>🎲 2 · Comments</h3><ol class="en small">${DICE_COM.map((a) => `<li>${esc(a[0])}</li>`).join("")}</ol></div>
      </div>
      <div class="dice-zone"><div id="d1">${dieHTML(1)}</div><div id="d2">${dieHTML(1)}</div></div>
      <div class="row-c"><button class="btn primary big" id="roll">Würfeln!</button></div>
      <div id="dice-task"></div>
      <p class="center small muted">Gespielte Runden: ${S.stats.dice}</p>
    </div>`;
  $("#roll").onclick = roll;
}
function roll() {
  const a = 1 + Math.floor(Math.random() * 6), c = 1 + Math.floor(Math.random() * 6);
  sfx("dice");
  const d1 = $("#d1"), d2 = $("#d2");
  let n = 0;
  $("#roll").disabled = true;
  const anim = setInterval(() => {
    d1.innerHTML = dieHTML(1 + Math.floor(Math.random() * 6)); d2.innerHTML = dieHTML(1 + Math.floor(Math.random() * 6));
    if (!document.body.contains(d1)) { clearInterval(anim); return; }
    if (++n > 8) {
      clearInterval(anim);
      d1.innerHTML = dieHTML(a); d2.innerHTML = dieHTML(c);
      $("#roll").disabled = false; $("#roll").textContent = "Nochmal würfeln";
      diceTask(a, c);
    }
  }, 80);
}
function diceTask(a, c) {
  const [act, actSol] = DICE_ACT[a - 1];
  const [com, comSol] = DICE_COM[c - 1];
  $("#dice-task").innerHTML = `
    <div class="dice-q">
      <label><span class="tag">${a} · Activity</span> <span class="en">${esc(act)}</span></label>
      <input class="answer" id="da" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="I …">
      <label><span class="tag">${c} · Comment</span> <span class="en">${esc(com)}</span></label>
      <input class="answer" id="dc" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="I …">
      <div class="row-c"><button class="btn primary" id="dcheck">Prüfen</button></div>
      <div id="dfb"></div>
    </div>`;
  $("#da").focus();
  $("#da").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("#dc").focus(); } };
  $("#dc").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("#dcheck").click(); } };
  let checked = false;
  $("#dcheck").onclick = () => {
    if (checked) return;
    const r1 = judge($("#da").value, [actSol, actSol.replace(/^I /, "")]);
    const r2 = judge($("#dc").value, [comSol, comSol.replace(/^I /, "")]);
    if (r1 === "empty" || r2 === "empty") { toast("Schreib beide Sätze!", "bad"); return; }
    checked = true;
    const ok1 = r1 === "ok", ok2 = r2 === "ok";
    $("#da").classList.add(ok1 ? "ok" : r1 === "near" ? "near" : "bad");
    $("#dc").classList.add(ok2 ? "ok" : r2 === "near" ? "near" : "bad");
    const pts = (ok1 ? 1 : r1 === "near" ? 0.5 : 0) + (ok2 ? 1 : r2 === "near" ? 0.5 : 0);
    const gain = Math.round(pts * 10) + (pts === 2 ? 5 : 0);
    addXP(gain);
    S.stats.dice++;
    if (S.stats.dice >= 10) award("dice10");
    missionEvent("correct", "dice", 1);
    save();
    sfx(pts === 2 ? "ok" : "bad");
    $("#dfb").innerHTML = `<div class="feedback show ${pts === 2 ? "ok" : pts >= 1 ? "near" : "bad"}">
      <b>${pts === 2 ? "Perfekt!" : pts >= 1 ? "Fast!" : "Nochmal üben!"}</b> <span class="xp-pop">+${gain} XP</span>
      ${!ok1 ? `<div class="fb-line">Richtig: <b class="en">${esc(actSol)}</b></div>` : ""}
      ${!ok2 ? `<div class="fb-line">Richtig: <b class="en">${esc(comSol)}</b></div>` : ""}
    </div>`;
  };
}

/* ---------- Schreibwerkstatt ---------- */
function analyzeNeg(sentence) {
  const raw = sentence.trim();
  const s = canon(raw);
  const words = s.split(" ").filter(Boolean);
  if (words.length < 3) return { ok: false, msg: "Der Satz ist zu kurz." };
  if (/\bdid (not )?(be|was|were)\b/.test(s)) return { ok: false, msg: "Bei be heißt es wasn't/weren't – ohne didn't." };
  if (/\b(do|does) not\b/.test(s)) return { ok: false, msg: "don't/doesn't ist Simple Present. Für die Vergangenheit: didn't." };
  const m = s.match(/\bdid not (\w+)/);
  if (!m) {
    if (/\b(was|were) not\b/.test(s)) return { ok: true, msg: "Prima – Verneinung mit wasn't/weren't!" };
    return { ok: false, msg: "Hier fehlt die Verneinung mit didn't." };
  }
  const v = m[1];
  const b = pastToBase(v);
  if (b) return { ok: false, msg: `Nach didn't steht die Grundform: „${b}“ statt „${v}“.` };
  if (/s$/.test(v) && BASES.has(v.slice(0, -1)) || /es$/.test(v) && BASES.has(v.slice(0, -2))) return { ok: false, msg: "Nach didn't steht die Grundform – ohne -s." };
  if (/ing$/.test(v) && v.length > 5) return { ok: false, msg: "Nach didn't steht die Grundform – ohne -ing." };
  if (!s.slice(0, m.index).trim()) return { ok: false, msg: "Wer? Am Satzanfang fehlt die Person (z. B. I)." };
  if (/^[a-z]/.test(raw)) return { ok: true, msg: "Richtig verneint! Tipp: Satzanfang groß schreiben." };
  return { ok: true, msg: "Super – richtige Verneinung!" };
}
function viewWriting() {
  const saved = (() => { try { return localStorage.getItem(KEY + ".draft") || ""; } catch (e) { return ""; } })();
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>🖊️ Schreibwerkstatt</h1></div>
    <div class="card">
      <p><b>Aufgabe:</b> Schreib einer Freundin oder einem Freund, was du in den Sommerferien <b>nicht</b> gemacht hast. Schreib 5 Sätze – <b>jeden Satz in eine eigene Zeile</b>.</p>
      <p class="ex en small">Start like this: Hi! My summer holidays were great – they weren't like school days. I didn't get up early, and …</p>
      <p class="small muted">Ideen: get up early · do homework · go to school · wear a school uniform · go to bed at 8 · tidy up my room · play football · watch TV · see my teacher · eat vegetables</p>
      <textarea id="wtext" class="answer area en" rows="7" placeholder="I didn't get up early.&#10;I didn't do any homework.&#10;…" spellcheck="false">${esc(saved)}</textarea>
      <div class="row-c"><button class="btn primary" id="wcheck">Sätze prüfen</button></div>
      <div id="wres"></div>
      <p class="small muted">Der Check findet typische Fehler (z. B. „didn't went“), aber nicht alle. Zeig deine Sätze ruhig auch jemandem.</p>
    </div>`;
  $("#wtext").oninput = (e) => { try { localStorage.setItem(KEY + ".draft", e.target.value); } catch (err) { /* egal */ } };
  $("#wcheck").onclick = () => {
    const lines = $("#wtext").value.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { toast("Schreib zuerst ein paar Sätze!", "bad"); return; }
    let gain = 0, okCount = 0;
    const res = lines.map((l) => {
      const r = analyzeNeg(l);
      if (r.ok) {
        okCount++;
        const key = canon(l);
        if (!S.stats.wsent.includes(key)) { S.stats.wsent.push(key); S.stats.wsent = S.stats.wsent.slice(-150); gain += 8; missionEvent("correct", "writing", 1); }
      }
      return { l, ...r };
    });
    if (gain) addXP(gain);
    save();
    sfx(okCount === lines.length ? "ok" : "near");
    $("#wres").innerHTML = `<ul class="wcheck">${res.map((r) => `<li class="${r.ok ? "ok" : "bad"}"><span class="en">${esc(r.l)}</span><small>${r.ok ? "✓" : "✗"} ${esc(r.msg)}</small></li>`).join("")}</ul>
      <p><b>${okCount} von ${lines.length}</b> Sätzen passen.${gain ? ` <span class="xp-pop">+${gain} XP</span>` : okCount ? ` <span class="muted small">(XP gibt es nur für neue Sätze)</span>` : ""}</p>`;
  };
}

/* ---------- Probearbeit ---------- */
function buildExam() {
  const items = [];
  items.push(listenItem(pick(LISTENING), "1 · Listening", true));
  sample(grammarIds("q"), 4).forEach((id) => items.push({ ...grammarItem(id), section: "2 · Grammar: Fragen" }));
  sample(grammarIds("sa"), 4).forEach((id) => items.push({ ...grammarItem(id), section: "2 · Grammar: Kurzantworten" }));
  sample(grammarIds("mc"), 2).forEach((id) => items.push({ ...grammarItem(id), section: "2 · Grammar: Fehler finden" }));
  sample(grammarIds("ty"), 4).forEach((id) => items.push({ ...grammarItem(id), section: "3 · Writing: Verneinung" }));
  sample(grammarIds("tr"), 3).forEach((id) => items.push({ ...grammarItem(id), section: "3 · Writing: Verneinung" }));
  items.push(storyItem(pick(STORIES.filter((s) => ["st3", "st6", "st7"].includes(s.id))), "4 · Simple Past im Text"));
  const core = VOCAB.filter((v) => ["wb", "u1", "s1", "s2", "s3"].includes(v.g));
  sample(core, 8).forEach((v) => items.push({ ...vocabInput(v.id), section: "5 · Vokabeln" }));
  sample(VERBS, 4).forEach((v) => items.push({ ...verbInput(v.id), section: "5 · Unregelmäßige Verben" }));
  return items;
}
function viewExam() {
  const ex = S.stats.exams;
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>🏆 Probearbeit</h1></div>
    <div class="card boss">
      <p class="lead">Die Probearbeit ist aufgebaut wie die echte Englischarbeit:</p>
      <ol class="exam-parts">
        <li><b>Listening</b> – Text 2× hören, true or false</li>
        <li><b>Grammar</b> – Fragen mit did und Kurzantworten</li>
        <li><b>Writing</b> – verneinte Sätze im Simple Past</li>
        <li><b>Simple Past im Text</b> – Lückentext</li>
        <li><b>Vokabeln & unregelmäßige Verben</b></li>
      </ol>
      <p class="muted small">Während der Probearbeit gibt es <b>keine</b> Rückmeldung – erst am Ende siehst du Punkte, Note und alle Fehler mit Lösung. Dauer: ca. 15–20 Minuten. Mach's dir ruhig und konzentriert!</p>
      <div class="row-c"><button class="btn primary big" id="go">Los geht's! 💪</button></div>
    </div>
    ${ex.length ? `<div class="card"><h2>Deine Probearbeiten</h2><div class="exam-hist">${ex.slice().reverse().map((e) => `<div class="eh"><span class="grade-mini g${e.g}">${e.g}</span><span>${e.p} %</span><span class="muted small">${new Date(e.d).toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>`).join("")}</div></div>` : ""}`;
  $("#go").onclick = () => Sess.start({ title: "Probearbeit", mod: "exam", exam: true, items: buildExam(), back: "#/exam" });
}

/* ---------- Fehler-Training ---------- */
function viewMistakes() {
  const items = S.wrong.slice(0, 15).map(itemById).filter(Boolean);
  if (!items.length) {
    app().innerHTML = `
      <div class="page-head"><a class="back" href="#/">←</a><h1>🔁 Fehler-Training</h1></div>
      <div class="card center"><div class="rank-big">🎉</div><h2>Keine offenen Fehler!</h2><p class="muted">Alles, was du falsch hattest, landet hier – bis du es richtig beantwortest.</p><a class="btn primary" href="#/">Zur Übersicht</a></div>`;
    return;
  }
  Sess.start({ title: "Fehler-Training", mod: "mistakes", items: shuffle(items), back: "#/", rebuild: () => shuffle(S.wrong.slice(0, 15).map(itemById).filter(Boolean)) });
}

/* ---------- Profil ---------- */
function viewProfile() {
  const ri = rankInfo();
  const m = mastery();
  const acc = pct(S.stats.correct, S.stats.answers);
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>🏅 ${esc(S.name)}s Profil</h1></div>
    <section class="two-col">
      <div class="card center">
        <div class="rank-big">${ri.cur.icon}</div>
        <h2>${esc(ri.cur.name)}</h2>
        <p><b>${S.xp} XP</b>${ri.next ? ` · noch ${ri.toNext} XP bis ${ri.next.icon} ${esc(ri.next.name)}` : " · höchster Rang!"}</p>
        ${bar(ri.prog * 100, "xp")}
        <div class="stat-row">
          <div class="stat"><b>${S.stats.answers}</b><span>Antworten</span></div>
          <div class="stat"><b>${acc} %</b><span>richtig</span></div>
          <div class="stat"><b>${S.stats.bestCombo}</b><span>beste Combo</span></div>
          <div class="stat"><b>${streakNow()}</b><span>Tage in Folge</span></div>
        </div>
      </div>
      <div class="card">
        <h2>Fortschritt</h2>
        ${[["📚 Vokabeln", m.vocab], ["⚡ Verben", m.verbs], ["🧩 Grammatik", m.grammar], ["✍️ Lückentexte", m.stories], ["🎧 Hören", m.listen], ["📖 Text-Check", m.reading]].map(([n, v]) => `<div class="prog-row"><span>${n}</span>${bar(v)}<b>${v} %</b></div>`).join("")}
      </div>
    </section>
    <div class="card">
      <h2>Ränge</h2>
      <div class="ranks">${RANKS.map((r, k) => `<div class="rank ${k < ri.i ? "past" : k === ri.i ? "now" : ""}"><span class="ri">${r.icon}</span><span class="rn">${esc(r.name)}</span><span class="rx">${r.xp} XP</span></div>`).join("")}</div>
    </div>
    <div class="card">
      <h2>Abzeichen <span class="muted small">${Object.keys(S.badges).length}/${BADGES.length}</span></h2>
      <div class="badges">${BADGES.map((b) => `<div class="badge ${S.badges[b.id] ? "have" : ""}" title="${esc(b.desc)}"><span class="bi">${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join("")}</div>
    </div>`;
}

/* ---------- Speichern & Einstellungen ---------- */
function viewSave() {
  const voices = Speech.ordered();
  app().innerHTML = `
    <div class="page-head"><a class="back" href="#/">←</a><h1>💾 Spielstand & Einstellungen</h1></div>
    <div class="card">
      <h2>Spielstand in einen anderen Browser übertragen</h2>
      <p class="muted small">Dein Fortschritt wird automatisch in diesem Browser gespeichert. Um auf einem anderen Gerät oder Browser weiterzumachen: Code erzeugen → kopieren oder als TXT-Datei speichern → im anderen Browser unten einfügen.</p>
      <div class="row-c"><button class="btn primary" id="mk">🔑 Code erzeugen</button></div>
      <div id="codebox" hidden>
        <textarea id="code" class="answer area code" rows="4" readonly></textarea>
        <div class="row-c"><button class="btn ghost" id="copy">📋 Kopieren</button><button class="btn ghost" id="dl">⬇️ Als TXT herunterladen</button></div>
        <p class="small muted" id="codeinfo"></p>
      </div>
    </div>
    <div class="card">
      <h2>Spielstand laden</h2>
      <p class="muted small">Füge hier einen Code ein oder wähle eine gespeicherte TXT-Datei. Achtung: Der aktuelle Spielstand in diesem Browser wird dabei ersetzt.</p>
      <textarea id="imp" class="answer area code" rows="4" placeholder="EQ1.…"></textarea>
      <div class="row-c">
        <label class="btn ghost file">📂 TXT-Datei wählen<input type="file" id="file" accept=".txt,text/plain" hidden></label>
        <button class="btn primary" id="load">Spielstand laden</button>
      </div>
      <div id="impinfo"></div>
    </div>
    <div class="card">
      <h2>Einstellungen</h2>
      <div class="settings">
        <label>Name <input id="sname" class="answer small" value="${esc(S.name)}" maxlength="20"></label>
        <label>Datum der Englischarbeit <input id="sdate" class="answer small" type="date" value="${esc(S.settings.examDate)}"></label>
        <label class="check"><input type="checkbox" id="ssound" ${S.settings.sound ? "checked" : ""}> Soundeffekte</label>
        <label>Englische Stimme
          <select id="svoice" class="answer small">${voices.length ? voices.map((v) => `<option value="${esc(v.name)}" ${v.name === S.settings.voice ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("") : `<option>Keine englische Stimme gefunden</option>`}</select>
        </label>
        <label>Sprechtempo <input type="range" id="srate" min="0.6" max="1.1" step="0.05" value="${S.settings.rate}"></label>
      </div>
      <div class="row-c"><button class="btn ghost" id="vtest">🔊 Stimme testen</button></div>
    </div>
    <div class="card danger">
      <h2>Neu anfangen</h2>
      <p class="muted small">Löscht den kompletten Fortschritt in diesem Browser. Erzeuge vorher besser einen Code!</p>
      <button class="btn bad" id="reset">Fortschritt zurücksetzen</button>
    </div>`;

  let code = "";
  $("#mk").onclick = async () => {
    code = await makeCode();
    $("#code").value = code;
    $("#codebox").hidden = false;
    $("#codeinfo").textContent = `Stand vom ${new Date().toLocaleString("de-DE")} · ${S.xp} XP · ${rankInfo().cur.name} · ${code.length} Zeichen`;
    award("saver");
  };
  $("#copy").onclick = async () => {
    try { await navigator.clipboard.writeText(code); toast("Code kopiert! 📋"); }
    catch (e) { $("#code").select(); document.execCommand("copy"); toast("Code kopiert! 📋"); }
  };
  $("#dl").onclick = () => {
    const now = new Date();
    const txt = `English Quest – Spielstand von ${S.name}\r\nErstellt: ${now.toLocaleString("de-DE")}\r\nXP: ${S.xp} · Rang: ${rankInfo().cur.name}\r\n\r\nSo lädst du den Spielstand: English Quest öffnen → 💾 → "Spielstand laden" → diese Datei wählen oder den Code einfügen.\r\n\r\n----- CODE START -----\r\n${code.replace(/(.{76})/g, "$1\r\n")}\r\n----- CODE ENDE -----\r\n`;
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `english-quest-${slug(S.name)}-${dayStr(now)}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $("#file").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    $("#imp").value = await f.text();
    $("#impinfo").innerHTML = `<p class="small muted">Datei „${esc(f.name)}“ geladen – jetzt auf „Spielstand laden“ drücken.</p>`;
  };
  $("#load").onclick = async () => {
    try {
      const obj = await readCode($("#imp").value);
      const ri = rankInfo(obj.xp);
      if (!confirm(`Spielstand von ${obj.name} laden?\n\n${obj.xp} XP · Rang: ${ri.cur.name}\nzuletzt gespeichert: ${new Date(obj.updated).toLocaleString("de-DE")}\n\nDer aktuelle Stand in diesem Browser (${S.xp} XP) wird ersetzt.`)) return;
      S = obj;
      save();
      renderTopbar();
      toast("Spielstand geladen! Willkommen zurück 👋", "gold");
      location.hash = "#/";
    } catch (err) {
      $("#impinfo").innerHTML = `<p class="warn">${esc(err.message || "Der Code konnte nicht gelesen werden.")}</p>`;
    }
  };
  $("#sname").onchange = (e) => { S.name = e.target.value.trim() || "Max"; save(); renderTopbar(); };
  $("#sdate").onchange = (e) => { if (e.target.value) { S.settings.examDate = e.target.value; save(); } };
  $("#ssound").onchange = (e) => { S.settings.sound = e.target.checked; save(); sfx("ok"); };
  $("#svoice").onchange = (e) => { S.settings.voice = e.target.value; save(); Speech.say("Hello Max!"); };
  $("#srate").oninput = (e) => { S.settings.rate = Number(e.target.value); save(); };
  $("#vtest").onclick = () => Speech.say("Did you go to the Autumn Fair? Yes, I did. It was great!");
  $("#reset").onclick = () => {
    if (!confirm("Wirklich den ganzen Fortschritt löschen? Das kann nicht rückgängig gemacht werden.")) return;
    const name = S.name;
    S = defaultState(); S.name = name;
    save(); renderTopbar(); toast("Fortschritt zurückgesetzt."); location.hash = "#/";
  };
}

/* =========================================================
   Router & Start
   ========================================================= */
const ROUTES = {
  "": viewHome, vocab: viewVocab, words: viewWords, verbs: viewVerbs, verblist: viewVerbList,
  grammar: viewGrammar, rules: viewRules, stories: viewStories, listen: viewListen, reading: viewReading,
  beae: viewBEAE, memory: viewMemory, dice: viewDice, writing: viewWriting, exam: viewExam,
  mistakes: viewMistakes, profile: viewProfile, save: viewSave
};
function route() {
  Speech.stop();
  clearConfetti();
  Sess.st = null;
  const key = location.hash.replace(/^#\/?/, "").split("?")[0];
  (ROUTES[key] || viewHome)();
  renderTopbar();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[href^='#']");
  if (a && a.getAttribute("href") === (location.hash || "#/")) { e.preventDefault(); route(); }
});
window.addEventListener("storage", (e) => { if (e.key === KEY && !Sess.st) { S = load(); route(); } });

Speech.init();
ensureMissions();
renderTopbar();
route();
