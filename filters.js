// ============================================================
//  filters.js — Filter, Sort, and Pagination Logic
// ============================================================

import { normalizeName } from "./db.js";
import { MONSTER_SUBTYPES } from "./data.js";

export const DEFAULT_FILTERS = {
  name: "", category: "", subtypes: [], attributes: [], monsterRaces: [], text: "",
  minLevel: "", maxLevel: "", minAtk: "", maxAtk: "", minDef: "", maxDef: "",
  minPoints: "", maxPoints: "", minScale: "", maxScale: "", pointedOnly: false,
  sortBy: "name", sortOrder: "asc",
  isAdvancedEnabled: false,
  advancedOuterGate: "OR",
  advancedGroups: [{ gate: "AND", rules: [{ text: "" }] }]
};

export const PAGE_SIZE = 12;

export function applyFilters(pool, activeFilters, page) {
  try {
    let filtered = [...pool];

    if (activeFilters.name) {
      const q = activeFilters.name.toLowerCase();
      filtered = filtered.filter(c => normalizeName(c.name).toLowerCase().includes(q));
    }

    if (activeFilters.category === "Monster") {
      filtered = filtered.filter(c => {
        const t = c.type.toLowerCase();
        return !t.includes("spell") && !t.includes("trap") && !t.includes("skill") && t !== "token";
      });
    } else if (activeFilters.category === "Spell") {
      filtered = filtered.filter(c => c.type.toLowerCase().includes("spell"));
    } else if (activeFilters.category === "Trap") {
      filtered = filtered.filter(c => c.type.toLowerCase().includes("trap"));
    }

    if (activeFilters.subtypes && activeFilters.subtypes.length > 0) {
      filtered = filtered.filter(c => {
        return activeFilters.subtypes.some(subtype => {
          if (activeFilters.category === "Monster") {
            // Exact match for monster types
            return c.type === subtype;
          } else {
            // Spell/Trap match by race/property
            return c.race.toLowerCase() === subtype.toLowerCase();
          }
        });
      });
    }

    if (activeFilters.attributes && activeFilters.attributes.length > 0 && activeFilters.category === "Monster") {
      const attrs = activeFilters.attributes.map(a => a.toUpperCase());
      filtered = filtered.filter(c => attrs.includes(c.attribute.toUpperCase()));
    }

    if (activeFilters.monsterRaces && activeFilters.monsterRaces.length > 0 && activeFilters.category === "Monster") {
      const races = activeFilters.monsterRaces.map(r => r.toLowerCase());
      filtered = filtered.filter(c => races.includes(c.race.toLowerCase()));
    }

    if (activeFilters.pointedOnly) {
      filtered = filtered.filter(c => c.points > 0);
    }

    const hasScaleFilter =
      activeFilters.minScale !== "" ||
      activeFilters.maxScale !== "";

    if (hasScaleFilter) {
      filtered = filtered.filter(c => c.scale !== null && c.scale !== undefined);
      if (activeFilters.minScale !== "") {
        filtered = filtered.filter(c => c.scale >= Number(activeFilters.minScale));
      }
      if (activeFilters.maxScale !== "") {
        filtered = filtered.filter(c => c.scale <= Number(activeFilters.maxScale));
      }
    }

    if (activeFilters.isAdvancedEnabled) {
      filtered = filtered.filter(c => {
        const desc = (c.desc || "").toLowerCase();
        const results = activeFilters.advancedGroups.map(group => {
          const activeRules = group.rules.filter(r => r.text.trim() !== "");
          if (activeRules.length === 0) return true;
          const ruleResults = activeRules.map(r => desc.includes(r.text.trim().toLowerCase()));
          if (group.gate === "AND") return ruleResults.every(Boolean);
          if (group.gate === "OR")  return ruleResults.some(Boolean);
          if (group.gate === "NOT") return !ruleResults.some(Boolean);
          return true;
        });
        return activeFilters.advancedOuterGate === "AND"
          ? results.every(Boolean)
          : results.some(Boolean);
      });
    } else if (activeFilters.text) {
      const q = activeFilters.text.toLowerCase();
      filtered = filtered.filter(c => c.desc.toLowerCase().includes(q));
    }

    if (activeFilters.minLevel !== "") filtered = filtered.filter(c => c.level >= Number(activeFilters.minLevel));
    if (activeFilters.maxLevel !== "") filtered = filtered.filter(c => c.level <= Number(activeFilters.maxLevel));
    if (activeFilters.minAtk !== "")   filtered = filtered.filter(c => c.atk >= Number(activeFilters.minAtk));
    if (activeFilters.maxAtk !== "")   filtered = filtered.filter(c => c.atk <= Number(activeFilters.maxAtk));
    if (activeFilters.minDef !== "")   filtered = filtered.filter(c => c.def >= Number(activeFilters.minDef));
    if (activeFilters.maxDef !== "")   filtered = filtered.filter(c => c.def <= Number(activeFilters.maxDef));
    if (activeFilters.minPoints !== "") filtered = filtered.filter(c => c.points >= Number(activeFilters.minPoints));
    if (activeFilters.maxPoints !== "") filtered = filtered.filter(c => c.points <= Number(activeFilters.maxPoints));

    const sortBy = activeFilters.sortBy;
    const descDir = activeFilters.sortOrder === "desc";

    filtered.sort((a, b) => {
      let comp = 0;
      if (["points", "atk", "def", "level", "scale"].includes(sortBy)) {
        const valA = a[sortBy] != null ? Number(a[sortBy]) : 0;
        const valB = b[sortBy] != null ? Number(b[sortBy]) : 0;
        comp = valA - valB;
      } else {
        comp = String(a[sortBy] || "").localeCompare(String(b[sortBy] || ""));
      }
      return descDir ? -comp : comp;
    });

    const totalCards = filtered.length;
    const totalPages = Math.ceil(totalCards / PAGE_SIZE) || 1;
    const safePage   = Math.min(Math.max(page, 1), totalPages);
    const cards      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return { cards, totalCards, totalPages, page: safePage };

  } catch (error) {
    console.error("applyFilters error:", error);
    return { cards: [], totalCards: 0, totalPages: 1, page: 1 };
  }
}
