// ============================================================
//  db.js — IndexedDB Cache Layer
// ============================================================

import { GENESYS_POINTS_DICT } from "./data.js";

const DB_NAME    = "GenesysCardDB";
const DB_VERSION = 1;
const STORE_NAME = "cardCache";
const CACHE_KEY  = "allCards";
const META_KEY   = "cacheMeta";

export function normalizeName(name) {
  if (!name) return "";
  let val = name;
  if (val.toLowerCase().includes("lupis") && val.toLowerCase().includes("k9")) return "K9-ØØ Lupis";
  if (val.toLowerCase().includes("lupus") && val.toLowerCase().includes("k9")) return "K9-ØØ Lupis";
  val = val.replace(/&amp;/g, "&");
  val = val.replace(/�/g, "α");
  return val;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = e  => reject(e.target.error);
  });
}

function processRawCards(remoteCards) {
  return remoteCards.map(c => {
    const rawName = c.name;
    const norm    = normalizeName(rawName);
    let points    = GENESYS_POINTS_DICT[norm] || 0;
    if (points === 0) {
      for (const [key, val] of Object.entries(GENESYS_POINTS_DICT)) {
        if (key.toLowerCase() === norm.toLowerCase()) { points = val; break; }
      }
    }

    // Safely resolve image URL: prefer cropped, fallback to full, fallback to blank
    let imageUrl = "";
    if (Array.isArray(c.card_images) && c.card_images.length > 0) {
      const first = c.card_images[0];
      imageUrl = first.image_url_cropped || first.image_url || "";
    }

    // Safer attribute fallback for monsters
    let attribute = c.attribute;
    if (!attribute) {
      const typeLower = (c.type || "").toLowerCase();
      if (typeLower.includes("spell")) attribute = "SPELL";
      else if (typeLower.includes("trap")) attribute = "TRAP";
      else attribute = "UNKNOWN";
    }

    return {
      id:        Number(c.id),
      name:      rawName,
      type:      c.type || "",
      frameType: c.frameType || "",
      desc:      c.desc || c.description || "",
      atk:       c.atk       !== undefined ? Number(c.atk)   : 0,
      def:       c.def       !== undefined ? Number(c.def)   : 0,
      level:     c.level     !== undefined ? Number(c.level) : 0,
      scale:     c.scale     !== undefined ? Number(c.scale) : null,
      race:      c.race  || "N/A",
      attribute,
      image_url: imageUrl,
      points
    };
  });
}

export async function loadDatabase(forceSync = false) {
  let db;
  try { db = await openDB(); } catch (e) { console.warn("IndexedDB unavailable", e); }

  if (!forceSync && db) {
    try {
      const cached = await idbGet(db, CACHE_KEY);
      const meta   = await idbGet(db, META_KEY);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return { pool: cached, fromCache: true, cacheDate: meta?.savedAt ?? null };
      }
    } catch (e) { console.warn("Cache read failed", e); }
  }

  try {
    const res = await fetch("https://db.ygoprodeck.com/api/v7/cardinfo.php");
    if (!res.ok) throw new Error("API unreachable");
    const json        = await res.json();
    const remoteCards = json.data || [];
    const pool        = processRawCards(remoteCards);

    if (db) {
      try {
        await idbPut(db, CACHE_KEY, pool);
        await idbPut(db, META_KEY,  { savedAt: Date.now() });
      } catch (e) { console.warn("Cache write failed", e); }
    }

    return { pool, fromCache: false, cacheDate: null };

  } catch (e) {
    console.error("Network load failed", e);

    if (db) {
      try {
        const cached = await idbGet(db, CACHE_KEY);
        const meta   = await idbGet(db, META_KEY);
        if (cached && cached.length > 0) {
          return { pool: cached, fromCache: true, cacheDate: meta?.savedAt ?? null, stale: true };
        }
      } catch (_) {}
    }

    return {
      pool: [
        { id: 89631139, name: "Blue-Eyes White Dragon", type: "Normal Monster", desc: "This legendary dragon is powerful...", atk: 3000, def: 2500, level: 8, race: "Dragon", attribute: "LIGHT", image_url: "", points: 0 },
        { id: 33396948, name: "Exodia the Forbidden One", type: "Effect Monster", desc: "Wins standard game.", atk: 1000, def: 1000, level: 3, race: "Spellcaster", attribute: "DARK", image_url: "", points: 30 }
      ],
      fromCache: false,
      cacheDate: null,
      offline: true
    };
  }
}
