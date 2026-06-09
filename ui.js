// ============================================================
//  ui.js — DOM Rendering & UI State Updates
// ============================================================

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPointsBadgeClass(points) {
  if (points === 0)       return "points-badge-0";
  if (points <= 9)        return "points-badge-low";
  if (points <= 29)       return "points-badge-mid";
  if (points <= 59)       return "points-badge-high";
  return "points-badge-apex";
}

export function renderCacheStats(el, pool, fromCache, cacheDate, stale = false, offline = false) {
  const total   = pool.length;
  const pointed = pool.filter(c => c.points > 0).length;

  if (offline) {
    el.innerHTML = "DATABASE: OFFLINE — NO CACHE";
    return;
  }

  let text = `DATABASE: ${total.toLocaleString()} CARDS (${pointed} POINTED)`;
  if (fromCache && cacheDate) {
    const d       = new Date(cacheDate);
    const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    text += ` · CACHED ${dateStr.toUpperCase()}`;
  }
  if (stale) text += " · OFFLINE (STALE CACHE)";
  el.innerHTML = text;
}

export function renderCards(cards, gridEl, totalMatchesEl, totalCards) {
  if (cards.length === 0) {
    gridEl.innerHTML = `
      <div class="col-span-full border-4 border-black bg-white p-12 text-center shadow-[4px_4px_0px_0px_black] max-w-xl mx-auto my-4">
        <h3 class="text-xl font-black uppercase text-black mb-2">No Cards Matched</h3>
        <p class="text-xs text-gray-500 mb-4">Try relaxing some attributes, card types, or search keywords.</p>
        <button onclick="resetAllFilters()" class="px-5 py-2.5 bg-[#D02020] text-white border-2 border-black font-black text-xs uppercase cursor-pointer">Reset Filters</button>
      </div>`;
    if (totalMatchesEl) totalMatchesEl.innerText = "MATCH FOUND: 0 CARDS";
    return;
  }

  if (totalMatchesEl) totalMatchesEl.innerText = `MATCH FOUND: ${(totalCards ?? cards.length).toLocaleString()} CARDS`;

  let html = "";
  cards.forEach((card, idx) => {
    const isMonster = !card.type.toLowerCase().includes("spell") && !card.type.toLowerCase().includes("trap") && !card.type.toLowerCase().includes("skill") && card.type !== "Token";
    const badgeClass = getPointsBadgeClass(card.points);
    html += `
      <div onclick="openModal(${idx})" class="group cursor-pointer bg-white border-4 border-black p-4 flex flex-col justify-between shadow-[4px_4px_0px_0px_black] hover:-translate-y-1 transition-all duration-150 relative">
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="font-mono text-[9px] uppercase font-bold text-gray-400">Class Block</span>
            <span class="px-2 py-0.5 font-mono text-[9px] font-black uppercase bg-gray-100 border border-black">${escapeHtml(card.attribute)}</span>
          </div>
          <div class="border-2 border-black bg-gray-100 aspect-square w-full overflow-hidden mb-3">
            <img src="${escapeHtml(card.image_url)}" alt="${escapeHtml(card.name)}" class="w-full h-full object-cover" onerror="this.src='https://images.ygoprodeck.com/images/cards_cropped/46986414.jpg'" />
          </div>
          <h3 class="font-black text-lg text-black uppercase leading-tight truncate" title="${escapeHtml(card.name)}">${escapeHtml(card.name)}</h3>
          <p class="font-mono text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-1 mb-2">${escapeHtml(card.type)}</p>
          <div class="font-mono text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 border inline-block select-none">
            ${card.level > 0 ? `LEVEL ${card.level} ★` : escapeHtml(card.race)}
          </div>
        </div>
        <div class="mt-4">
          <div class="border-2 border-black divide-x-2 divide-black grid grid-cols-2 bg-gray-50 text-center font-mono text-xs py-1 mb-3">
            ${isMonster
              ? `<div><span class="text-[8px] block text-gray-400 uppercase">ATK</span><b>${card.atk}</b></div><div><span class="text-[8px] block text-gray-400">DEF</span><b>${card.def}</b></div>`
              : `<div><span class="text-[8px] block text-gray-400 uppercase">CLASS</span><b>SPELL/TRAP</b></div><div><span class="text-[8px] block text-gray-400">PROP</span><b>${escapeHtml(card.race)}</b></div>`}
          </div>
          <div class="border-2 border-black p-2 font-mono ${badgeClass}">
            <div class="text-[8px] uppercase tracking-widest opacity-80 leading-none">Cost Level</div>
            <div class="flex items-center justify-between mt-1">
              <span class="font-black text-xs">${card.points > 0 ? `${card.points} POINTS` : '0 POINTS (FREE)'}</span>
              <span class="text-[8px] opacity-60 font-medium">ID: ${card.id}</span>
            </div>
          </div>
        </div>
      </div>`;
  });
  gridEl.innerHTML = html;
}

export function renderPagination(paginationBlock, pagePillBtn, prevPageBtn, nextPageBtn, page, totalPages) {
  if (!paginationBlock) return;
  if (totalPages <= 1) { paginationBlock.classList.add("hidden"); return; }
  paginationBlock.classList.remove("hidden");
  pagePillBtn.innerText   = `PAGE ${page} OF ${totalPages}`;
  prevPageBtn.disabled    = page === 1;
  nextPageBtn.disabled    = page === totalPages;
}

export function openModal(card, refs) {
  const { modal, modalImg, modalId, modalType, modalRace, modalAttr,
          modalLevelBlock, modalLevel, modalTitle, modalDesc,
          modalStatsBlock, modalAtk, modalDef, modalPointsBadge, modalPointsText } = refs;

  modalImg.src = card.image_url;
  modalImg.onerror = () => { modalImg.src = "https://images.ygoprodeck.com/images/cards_cropped/46986414.jpg"; };
  modalId.innerText   = card.id;
  modalType.innerText = card.type;
  modalRace.innerText = card.race;
  modalAttr.innerText = card.attribute;

  if (card.level > 0) {
    modalLevelBlock.classList.remove("hidden");
    modalLevel.innerText = card.level;
  } else {
    modalLevelBlock.classList.add("hidden");
  }

  modalTitle.innerText = card.name;
  modalDesc.innerText  = card.desc;

  const isMonster = !card.type.toLowerCase().includes("spell") && !card.type.toLowerCase().includes("trap") && !card.type.toLowerCase().includes("skill") && card.type !== "Token";
  if (isMonster) {
    modalStatsBlock.classList.remove("hidden");
    modalAtk.innerText = `${card.atk} ATK`;
    modalDef.innerText = `${card.def} DEF`;
  } else {
    modalStatsBlock.classList.add("hidden");
  }

  if (card.points > 0) {
    modalPointsBadge.className = "px-3 py-1 font-mono text-xs font-black uppercase tracking-wider bg-[#D02020] text-white border-2 border-black";
    modalPointsBadge.innerText = `${card.points} POINTS`;
    modalPointsText.innerHTML  = `This card has an official Genesys deck build value of <strong>${card.points} points</strong>.`;
  } else {
    modalPointsBadge.className = "px-3 py-1 font-mono text-xs font-black uppercase tracking-wider bg-white text-black border-2 border-black";
    modalPointsBadge.innerText = "0 POINTS (FREE)";
    modalPointsText.innerHTML  = `This card has a cost of <strong>0 points (FREE)</strong>.`;
  }

  modal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

export function closeModal(modal) {
  modal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

export function renderAdvancedGroups(activeFilters, container, onRuleChange) {
  if (!container) return;
  container.innerHTML = "";

  const GATE_STYLES = {
    AND: { border: "border-l-[#2563EB]", label: "ALL keywords must match",    bg: "bg-blue-50"   },
    OR:  { border: "border-l-[#D02020]", label: "ANY keyword must match",     bg: "bg-red-50"    },
    NOT: { border: "border-l-[#7C3AED]", label: "NONE of the keywords match", bg: "bg-purple-50" },
  };

  activeFilters.advancedGroups.forEach((group, gIdx) => {
    const style = GATE_STYLES[group.gate] || GATE_STYLES.AND;
    const div = document.createElement("div");
    div.className = `border-2 border-black ${style.bg} p-3 shadow-[2px_2px_0px_0px_black] relative border-l-4 ${style.border}`;

    let rules = "";
    group.rules.forEach((rule, rIdx) => {
      rules += `
        <div class="flex items-center mb-1 bg-white">
          <input type="text" value="${escapeHtml(rule.text)}" placeholder="e.g. Draw" class="adv-rule p-1 w-full text-xs border border-gray-400" data-g="${gIdx}" data-r="${rIdx}">
          <button type="button" onclick="removeRule(${gIdx}, ${rIdx})" class="px-2 text-red-500 font-bold cursor-pointer">✕</button>
        </div>`;
    });

    div.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <select onchange="updateGroupGate(${gIdx}, this.value)" class="border border-black text-xs py-0.5 px-1 bg-white font-black cursor-pointer">
          <option value="AND" ${group.gate === "AND" ? "selected" : ""}>AND</option>
          <option value="OR"  ${group.gate === "OR"  ? "selected" : ""}>OR</option>
          <option value="NOT" ${group.gate === "NOT" ? "selected" : ""}>NOT</option>
        </select>
        <button onclick="removeGroup(${gIdx})" class="text-xs text-red-500 font-black cursor-pointer">Group ✕</button>
      </div>
      <p class="font-mono text-[8px] uppercase text-gray-400 mb-2">${style.label}</p>
      ${rules}
      <button onclick="addRule(${gIdx})" class="mt-2 text-[9px] font-black uppercase tracking-wider cursor-pointer">+ Keyword</button>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll(".adv-rule").forEach(input => {
    input.addEventListener("input", (e) => {
      const g = Number(input.getAttribute("data-g"));
      const r = Number(input.getAttribute("data-r"));
      activeFilters.advancedGroups[g].rules[r].text = e.target.value;
      onRuleChange();
    });
  });
}

const ATTRIBUTE_CONFIG = [
  { value: "EARTH",  color: "bg-amber-700  text-white border-amber-900"  },
  { value: "WATER",  color: "bg-blue-500   text-white border-blue-700"   },
  { value: "FIRE",   color: "bg-red-500    text-white border-red-700"    },
  { value: "WIND",   color: "bg-green-500  text-white border-green-700"  },
  { value: "LIGHT",  color: "bg-yellow-300 text-black border-yellow-500" },
  { value: "DARK",   color: "bg-purple-700 text-white border-purple-900" },
  { value: "DIVINE", color: "bg-orange-400 text-white border-orange-600" },
];

export function renderAttributeToggles(container, activeAttributes, onChange) {
  if (!container) return;
  container.innerHTML = "";
  ATTRIBUTE_CONFIG.forEach(({ value, color }) => {
    const active = activeAttributes.includes(value);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.value = value;
    btn.className = `px-2.5 py-1 font-mono text-[10px] font-black uppercase border-2 cursor-pointer transition-all duration-100 select-none
      ${active ? color + " shadow-[2px_2px_0px_0px_black]" : "bg-white text-gray-400 border-gray-300 hover:border-black hover:text-black"}`;
    btn.textContent = value;
    btn.addEventListener("click", () => {
      const idx = activeAttributes.indexOf(value);
      if (idx === -1) activeAttributes.push(value);
      else activeAttributes.splice(idx, 1);
      renderAttributeToggles(container, activeAttributes, onChange);
      onChange();
    });
    container.appendChild(btn);
  });
}

export function renderRaceToggles(container, activeRaces, MONSTER_RACES, onChange) {
  if (!container) return;
  container.innerHTML = "";
  MONSTER_RACES.forEach(race => {
    const active = activeRaces.includes(race);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.value = race;
    btn.className = `px-2 py-1 font-mono text-[10px] font-black uppercase border-2 cursor-pointer transition-all duration-100 select-none
      ${active ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_black]" : "bg-white text-gray-400 border-gray-300 hover:border-black hover:text-black"}`;
    btn.textContent = race;
    btn.addEventListener("click", () => {
      const idx = activeRaces.indexOf(race);
      if (idx === -1) activeRaces.push(race);
      else activeRaces.splice(idx, 1);
      renderRaceToggles(container, activeRaces, MONSTER_RACES, onChange);
      onChange();
    });
    container.appendChild(btn);
  });
}

const TYPE_CONFIGS = {
  Monster: {
    "Effect Monster":                    "bg-orange-500  text-white      border-orange-700",
    "Flip Effect Monster":               "bg-yellow-400  text-black      border-yellow-600",
    "Flip Tuner Effect Monster":         "bg-yellow-500  text-black      border-yellow-700",
    "Fusion Monster":                    "bg-purple-500  text-white      border-purple-700",
    "Gemini Monster":                    "bg-rose-400    text-white      border-rose-600",
    "Link Monster":                      "bg-blue-500    text-white      border-blue-700",
    "Normal Monster":                    "bg-amber-200   text-amber-900  border-amber-400",
    "Normal Tuner Monster":              "bg-cyan-200    text-cyan-900   border-cyan-400",
    "Pendulum Effect Fusion Monster":    "bg-fuchsia-500 text-white      border-fuchsia-700",
    "Pendulum Effect Monster":           "bg-emerald-500 text-white      border-emerald-700",
    "Pendulum Effect Ritual Monster":    "bg-indigo-500  text-white      border-indigo-700",
    "Pendulum Flip Effect Monster":      "bg-lime-400    text-black      border-lime-600",
    "Pendulum Normal Monster":           "bg-teal-400    text-white      border-teal-600",
    "Pendulum Tuner Effect Monster":     "bg-green-400   text-black      border-green-600",
    "Ritual Effect Monster":             "bg-violet-500  text-white      border-violet-700",
    "Ritual Monster":                    "bg-blue-700    text-white      border-blue-900",
    "Spirit Monster":                    "bg-sky-400     text-white      border-sky-600",
    "Synchro Monster":                   "bg-slate-200   text-slate-900  border-slate-400",
    "Synchro Pendulum Effect Monster":   "bg-pink-400    text-black      border-pink-600",
    "Synchro Tuner Monster":             "bg-slate-400   text-white      border-slate-600",
    "Toon Monster":                      "bg-pink-500    text-white      border-pink-700",
    "Tuner Monster":                     "bg-cyan-500    text-white      border-cyan-700",
    "Union Effect Monster":              "bg-amber-500   text-white      border-amber-700",
    "XYZ Monster":                       "bg-gray-900    text-white      border-black",
    "XYZ Pendulum Effect Monster":       "bg-gray-700    text-white      border-gray-900",
  },
  Spell: {
    "Normal":     "bg-green-600   text-white border-green-800",
    "Quick-Play": "bg-lime-500    text-white border-lime-700",
    "Continuous": "bg-emerald-600 text-white border-emerald-800",
    "Ritual":     "bg-teal-600    text-white border-teal-800",
    "Equip":      "bg-green-800   text-white border-green-950",
    "Field":      "bg-green-500   text-white border-green-700",
    "Link":       "bg-teal-800    text-white border-teal-950",
  },
  Trap: {
    "Normal":     "bg-rose-500   text-white border-rose-700",
    "Continuous": "bg-red-600    text-white border-red-800",
    "Counter":    "bg-purple-600 text-white border-purple-800",
  }
};

export function renderTypeToggles(container, activeSubtypes, subtypeList, category, onChange) {
  if (!container) return;
  container.innerHTML = "";
  if (!category) return;
  const categoryConfig = TYPE_CONFIGS[category] || {};

  subtypeList.forEach(({ label, value }) => {
    const active      = activeSubtypes.includes(value);
    const activeColor = categoryConfig[value] || "bg-gray-500 text-white border-gray-700";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.value = value;
    btn.className = `px-2.5 py-1 font-mono text-[10px] font-black uppercase border-2 cursor-pointer transition-all duration-100 select-none
      ${active ? activeColor + " shadow-[2px_2px_0px_0px_black]" : "bg-white text-gray-400 border-gray-300 hover:border-black hover:text-black"}`;
    btn.textContent = label.toUpperCase();
    btn.addEventListener("click", () => {
      const idx = activeSubtypes.indexOf(value);
      if (idx === -1) activeSubtypes.push(value);
      else activeSubtypes.splice(idx, 1);
      renderTypeToggles(container, activeSubtypes, subtypeList, category, onChange);
      onChange();
    });
    container.appendChild(btn);
  });
}

export function updateSubtypeToggles(category, togglesContainer, subtypeRow, attributeRow, raceRow, scaleRow, activeSubtypes, MONSTER_SUBTYPES, SPELL_SUBTYPES, TRAP_SUBTYPES, onChange) {
  if (!togglesContainer) return;

  if (category === "Monster") {
    subtypeRow.classList.remove("hidden");
    attributeRow.classList.remove("hidden");
    raceRow.classList.remove("hidden");
    scaleRow.classList.remove("hidden");
    renderTypeToggles(togglesContainer, activeSubtypes, MONSTER_SUBTYPES, category, onChange);
  } else if (category === "Spell") {
    subtypeRow.classList.remove("hidden");
    attributeRow.classList.add("hidden");
    raceRow.classList.add("hidden");
    scaleRow.classList.add("hidden");
    renderTypeToggles(togglesContainer, activeSubtypes, SPELL_SUBTYPES, category, onChange);
  } else if (category === "Trap") {
    subtypeRow.classList.remove("hidden");
    attributeRow.classList.add("hidden");
    raceRow.classList.add("hidden");
    scaleRow.classList.add("hidden");
    renderTypeToggles(togglesContainer, activeSubtypes, TRAP_SUBTYPES, category, onChange);
  } else {
    subtypeRow.classList.add("hidden");
    attributeRow.classList.add("hidden");
    raceRow.classList.add("hidden");
    scaleRow.classList.add("hidden");
    togglesContainer.innerHTML = "";
  }
}

export function switchDescTab(name, simpleBtn, gateBtn, simpleCont, gateCont, activeFilters, onSwitch) {
  if (name === "simple") {
    activeFilters.isAdvancedEnabled = false;
    simpleBtn.className = "px-2.5 py-1.5 bg-black text-white cursor-pointer text-[9px]";
    gateBtn.className   = "px-2.5 py-1.5 bg-white text-black border-l-2 border-black cursor-pointer text-[9px]";
    simpleCont.classList.remove("hidden");
    gateCont.classList.add("hidden");
  } else {
    activeFilters.isAdvancedEnabled = true;
    gateBtn.className   = "px-2.5 py-1.5 bg-black text-white cursor-pointer text-[9px]";
    simpleBtn.className = "px-2.5 py-1.5 bg-white text-black cursor-pointer text-[9px]";
    gateCont.classList.remove("hidden");
    simpleCont.classList.add("hidden");
    onSwitch();
  }
}
