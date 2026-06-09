// ============================================================
//  app.js — Main Application Entry Point
// ============================================================

import { loadDatabase } from "./db.js";
import { applyFilters, DEFAULT_FILTERS, PAGE_SIZE } from "./filters.js";
import { MONSTER_SUBTYPES, SPELL_SUBTYPES, TRAP_SUBTYPES, MONSTER_RACES } from "./data.js";
import {
  renderCacheStats, renderCards, renderPagination,
  openModal as uiOpenModal, closeModal as uiCloseModal,
  renderAdvancedGroups, updateSubtypeToggles,
  renderAttributeToggles, renderRaceToggles, switchDescTab
} from "./ui.js";

// ── App State ────────────────────────────────────────────────────────────────
let allCardsPool = [];
let currentCards = [];
let activeFilters = {
  ...DEFAULT_FILTERS,
  subtypes: [],
  attributes: [],
  monsterRaces: [],
  advancedGroups: [{ gate: "AND", rules: [{ text: "" }] }]
};
let page = 1;
let searchTimeout;
let syncCooldownTimer = null;

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// ── DOM References ────────────────────────────────────────────────────────────
const cardsGrid       = document.getElementById("cards-grid");
const totalMatchesEl  = document.getElementById("total-matches");
const cacheStatsEl    = document.getElementById("cache-stats");
const prevPageBtn     = document.getElementById("prev-page");
const nextPageBtn     = document.getElementById("next-page");
const pagePillBtn     = document.getElementById("page-pill");
const searchLoader    = document.getElementById("search-loader");
const paginationBlock = document.getElementById("pagination-block");

const inputName       = document.getElementById("search-name");
const inputText       = document.getElementById("search-desc");
const selectCategory  = document.getElementById("search-category");
const typeToggleContainer = document.getElementById("type-toggles");
const attrToggleContainer = document.getElementById("attr-toggles");
const raceToggleContainer = document.getElementById("race-toggles");
const selectSortBy    = document.getElementById("sort-by");
const selectSortOrder = document.getElementById("sort-order");
const checkboxPointed = document.getElementById("search-pointed-only");
const inputMinLevel   = document.getElementById("search-min-level");
const inputMaxLevel   = document.getElementById("search-max-level");
const inputMinAtk     = document.getElementById("search-min-atk");
const inputMaxAtk     = document.getElementById("search-max-atk");
const inputMinDef     = document.getElementById("search-min-def");
const inputMaxDef     = document.getElementById("search-max-def");
const inputMinPoints  = document.getElementById("search-min-points");
const inputMaxPoints  = document.getElementById("search-max-points");
const inputMinScale   = document.getElementById("search-min-scale");
const inputMaxScale   = document.getElementById("search-max-scale");
const resetFiltersBtn = document.getElementById("reset-filters");
const refreshCacheBtn = document.getElementById("refresh-cache");

const modal            = document.getElementById("card-modal");
const modalClose       = document.getElementById("modal-close");
const modalCloseBottom = document.getElementById("modal-close-bottom");
const modalRefs = {
  modal,
  modalImg:         document.getElementById("modal-img"),
  modalId:          document.getElementById("modal-id"),
  modalType:        document.getElementById("modal-type"),
  modalRace:        document.getElementById("modal-race"),
  modalAttr:        document.getElementById("modal-attr"),
  modalLevelBlock:  document.getElementById("modal-level-block"),
  modalLevel:       document.getElementById("modal-level"),
  modalTitle:       document.getElementById("modal-title"),
  modalDesc:        document.getElementById("modal-desc"),
  modalStatsBlock:  document.getElementById("modal-stats-block"),
  modalAtk:         document.getElementById("modal-atk"),
  modalDef:         document.getElementById("modal-def"),
  modalPointsBadge: document.getElementById("modal-points-badge"),
  modalPointsText:  document.getElementById("modal-points-text"),
};

// ── Core Functions ────────────────────────────────────────────────────────────
function refresh() {
  if (!cardsGrid) return;
  cardsGrid.innerHTML = "";

  const result = applyFilters(allCardsPool, activeFilters, page);
  page         = result.page;
  currentCards = result.cards;

  renderCards(currentCards, cardsGrid, totalMatchesEl, result.totalCards);
  renderPagination(paginationBlock, pagePillBtn, prevPageBtn, nextPageBtn, page, result.totalPages);
}

function triggerFuzzySearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { page = 1; refresh(); }, 350);
}

async function syncDatabase(forceSync = false) {
  if (searchLoader) searchLoader.classList.remove("hidden");
  if (forceSync) cacheStatsEl.innerHTML = "DATABASE: SYNCING DATA ONLINE...";

  const { pool, fromCache, cacheDate, stale, offline } = await loadDatabase(forceSync);
  allCardsPool = pool;
  renderCacheStats(cacheStatsEl, pool, fromCache, cacheDate, stale, offline);

  if (searchLoader) searchLoader.classList.add("hidden");
}

// ── Cooldown rate limiter helper ──────────────────────────────────────────────
function updateSyncButtonCooldown() {
  if (!refreshCacheBtn) return;
  if (syncCooldownTimer) {
    clearTimeout(syncCooldownTimer);
    syncCooldownTimer = null;
  }

  const lastSync = localStorage.getItem("genesys_last_sync_time");
  if (!lastSync) {
    refreshCacheBtn.disabled = false;
    refreshCacheBtn.innerHTML = "SYNC DATABASE";
    return;
  }

  const elapsed = Date.now() - Number(lastSync);
  if (elapsed < COOLDOWN_MS) {
    refreshCacheBtn.disabled = true;
    const remainingSecs = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    const formattedTime = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    refreshCacheBtn.innerHTML = `COOLDOWN (${formattedTime})`;
    syncCooldownTimer = setTimeout(updateSyncButtonCooldown, 1000);
  } else {
    refreshCacheBtn.disabled = false;
    refreshCacheBtn.innerHTML = "SYNC DATABASE";
  }
}

// ── Announcement parsing and loading helper ───────────────────────────────────
function getHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xFFFFFFFF; // keep 32-bit unsigned
  }
  return hash.toString(36);
}

function parseAnnouncementText(text) {
  if (!text) return null;
  text = text.trim();

  const bracketIdx = text.indexOf("[");
  if (bracketIdx === -1) return null;

  const prefix = text.slice(0, bracketIdx).trim();
  const content = text.slice(bracketIdx + 1, text.lastIndexOf("]")).trim();
  if (!content) return null;

  // Strip trailing boilerplate like "announcnet:", "announcement:", "id:"
  let id = prefix
    .replace(/\b(announcnet|announcement|announcet|announcment)\b/gi, "")
    .replace(/\b(id)\b/gi, "")
    .replace(/[:\s]+$/g, "")
    .trim();

  if (!id) id = "default";

  const uniqueKey = `${id}_${getHash(content)}`;
  return { id: uniqueKey, content };
}

async function loadAnnouncement() {
  try {
    const res = await fetch("announcement.txt");
    if (!res.ok) return;
    const text = await res.text();
    const announcement = parseAnnouncementText(text);
    if (!announcement) return;

    const acknowledgedId = localStorage.getItem("genesys_acknowledged_announcement");
    if (acknowledgedId !== announcement.id) {
      const banner = document.getElementById("announcement-banner");
      const bannerText = document.getElementById("announcement-text");
      const bannerClose = document.getElementById("announcement-close");

      if (banner && bannerText) {
        bannerText.textContent = announcement.content;
        banner.classList.remove("hidden");

        bannerClose?.addEventListener("click", () => {
          localStorage.setItem("genesys_acknowledged_announcement", announcement.id);
          banner.classList.add("hidden");
        }, { once: true });
      }
    }
  } catch (error) {
    console.warn("Announcement check failed:", error);
  }
}

// ── Global Callbacks ────────────────────────────────────────────────────────────
window.openModal = (cardIndex) => {
  const card = currentCards[cardIndex];
  if (!card) return;
  uiOpenModal(card, modalRefs);
};

window.resetAllFilters = () => {
  activeFilters = {
    ...DEFAULT_FILTERS,
    subtypes: [],
    attributes: [],
    monsterRaces: [],
    advancedGroups: [{ gate: "AND", rules: [{ text: "" }] }]
  };

  if (inputName)       inputName.value = "";
  if (inputText)       inputText.value = "";
  if (selectCategory)  selectCategory.value = "";

  document.getElementById("subtype-row")?.classList.add("hidden");
  document.getElementById("attribute-row")?.classList.add("hidden");
  document.getElementById("race-row")?.classList.add("hidden");
  document.getElementById("scale-row")?.classList.add("hidden");

  if (typeToggleContainer) typeToggleContainer.innerHTML = "";
  renderAttributeToggles(attrToggleContainer, activeFilters.attributes, () => { page = 1; refresh(); });
  renderRaceToggles(raceToggleContainer, activeFilters.monsterRaces, MONSTER_RACES, () => { page = 1; refresh(); });

  [inputMinLevel, inputMaxLevel, inputMinAtk, inputMaxAtk,
   inputMinDef, inputMaxDef, inputMinPoints, inputMaxPoints,
   inputMinScale, inputMaxScale]
    .forEach(el => { if (el) el.value = ""; });

  _switchDescTab("simple");
  page = 1;
  refresh();
};

window.updateGroupGate = (gIdx, val) => { activeFilters.advancedGroups[gIdx].gate = val; page = 1; refresh(); };
window.removeGroup = (gIdx) => {
  if (activeFilters.advancedGroups.length > 1) {
    activeFilters.advancedGroups.splice(gIdx, 1);
    _renderGroups();
    page = 1;
    refresh();
  }
};
window.addRule = (gIdx) => { activeFilters.advancedGroups[gIdx].rules.push({ text: "" }); _renderGroups(); };
window.removeRule = (gIdx, rIdx) => {
  if (activeFilters.advancedGroups[gIdx].rules.length > 1) {
    activeFilters.advancedGroups[gIdx].rules.splice(rIdx, 1);
    _renderGroups();
    page = 1;
    refresh();
  }
};

// ── Internal Helpers ──────────────────────────────────────────────────────────
function _renderGroups() {
  renderAdvancedGroups(
    activeFilters,
    document.getElementById("adv-groups-list"),
    triggerFuzzySearch
  );
}

function _switchDescTab(name) {
  switchDescTab(
    name,
    document.getElementById("desc-tab-simple"),
    document.getElementById("desc-tab-gate"),
    document.getElementById("desc-container-simple"),
    document.getElementById("desc-container-gate"),
    activeFilters,
    _renderGroups
  );
  page = 1;
  refresh();
}

// ── Event Listeners ───────────────────────────────────────────────────────────
function setupEventListeners() {
  inputName?.addEventListener("input",  (e) => { activeFilters.name = e.target.value.trim(); triggerFuzzySearch(); });
  inputText?.addEventListener("input",  (e) => { activeFilters.text = e.target.value.trim(); triggerFuzzySearch(); });

  selectCategory?.addEventListener("change", (e) => {
    activeFilters.category    = e.target.value;
    activeFilters.subtypes    = [];
    activeFilters.attributes  = [];
    activeFilters.monsterRaces = [];

    updateSubtypeToggles(
      e.target.value,
      typeToggleContainer,
      document.getElementById("subtype-row"),
      document.getElementById("attribute-row"),
      document.getElementById("race-row"),
      document.getElementById("scale-row"),
      activeFilters.subtypes,
      MONSTER_SUBTYPES, SPELL_SUBTYPES, TRAP_SUBTYPES,
      () => { page = 1; refresh(); }
    );

    renderAttributeToggles(attrToggleContainer, activeFilters.attributes, () => { page = 1; refresh(); });
    renderRaceToggles(raceToggleContainer, activeFilters.monsterRaces, MONSTER_RACES, () => { page = 1; refresh(); });
    page = 1; refresh();
  });

  selectSortBy?.addEventListener("change",    (e) => { activeFilters.sortBy      = e.target.value; page = 1; refresh(); });
  selectSortOrder?.addEventListener("change", (e) => { activeFilters.sortOrder   = e.target.value; page = 1; refresh(); });
  checkboxPointed?.addEventListener("change", (e) => { activeFilters.pointedOnly = e.target.checked; page = 1; refresh(); });

  const numericInputs = [inputMinLevel, inputMaxLevel, inputMinAtk, inputMaxAtk, inputMinDef, inputMaxDef, inputMinPoints, inputMaxPoints, inputMinScale, inputMaxScale];
  numericInputs.forEach(element => {
    element?.addEventListener("input", () => {
      activeFilters.minLevel  = inputMinLevel?.value  ?? "";
      activeFilters.maxLevel  = inputMaxLevel?.value  ?? "";
      activeFilters.minAtk    = inputMinAtk?.value    ?? "";
      activeFilters.maxAtk    = inputMaxAtk?.value    ?? "";
      activeFilters.minDef    = inputMinDef?.value    ?? "";
      activeFilters.maxDef    = inputMaxDef?.value    ?? "";
      activeFilters.minPoints = inputMinPoints?.value ?? "";
      activeFilters.maxPoints = inputMaxPoints?.value ?? "";
      activeFilters.minScale  = inputMinScale?.value  ?? "";
      activeFilters.maxScale  = inputMaxScale?.value  ?? "";
      triggerFuzzySearch();
    });
  });

  prevPageBtn?.addEventListener("click", () => {
    if (page > 1) { page--; refresh(); window.scrollTo({ top: 100, behavior: "smooth" }); }
  });
  nextPageBtn?.addEventListener("click", () => {
    const totalPages = Math.ceil(allCardsPool.length / PAGE_SIZE) || 1; // rough guard; real total comes from applyFilters
    if (page < totalPages) { page++; refresh(); window.scrollTo({ top: 100, behavior: "smooth" }); }
  });

  resetFiltersBtn?.addEventListener("click", window.resetAllFilters);

  refreshCacheBtn?.addEventListener("click", async () => {
    const lastSync = localStorage.getItem("genesys_last_sync_time");
    if (lastSync && (Date.now() - Number(lastSync) < COOLDOWN_MS)) {
      updateSyncButtonCooldown();
      return;
    }

    refreshCacheBtn.innerHTML = "SYNCING...";
    refreshCacheBtn.disabled  = true;

    await syncDatabase(true);

    localStorage.setItem("genesys_last_sync_time", Date.now().toString());
    updateSyncButtonCooldown();
    refresh();
  });

  modalClose?.addEventListener("click",       () => uiCloseModal(modal));
  modalCloseBottom?.addEventListener("click", () => uiCloseModal(modal));
  modal?.addEventListener("click",            (e) => { if (e.target === modal) uiCloseModal(modal); });

  document.getElementById("desc-tab-simple")?.addEventListener("click", () => _switchDescTab("simple"));
  document.getElementById("desc-tab-gate")?.addEventListener("click",   () => _switchDescTab("gate"));
  document.getElementById("adv-outer-gate")?.addEventListener("change", (e) => {
    activeFilters.advancedOuterGate = e.target.value;
    page = 1; refresh();
  });
  document.getElementById("adv-btn-add-group")?.addEventListener("click", () => {
    activeFilters.advancedGroups.push({ gate: "AND", rules: [{ text: "" }] });
    _renderGroups();
    page = 1; refresh();
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function init() {
  setupEventListeners();

  renderAttributeToggles(attrToggleContainer, activeFilters.attributes, () => { page = 1; refresh(); });
  renderRaceToggles(raceToggleContainer, activeFilters.monsterRaces, MONSTER_RACES, () => { page = 1; refresh(); });

  updateSyncButtonCooldown();
  loadAnnouncement();

  await syncDatabase(false);
  refresh();
}

init();
