# Yu-Gi-Oh! GENESYS Card Index & Point Searcher

A high-performance, client-side card database and deck-building assistant for the **Yu-Gi-Oh!**. Search, filter, and inspect the entire official card pool with a simple interface designed for speed and clarity.

---

## What It Does

The GENESYS Searcher connects to the [YGOProDeck API] to pull the latest card data, caches it locally in your browser via IndexedDB, and layers a custom **point-cost system** on top. Every card is assigned a GENESYS deck-build value — this tool lets you find cards by name, stats, type, attribute, description keywords, and point cost so you can craft legal, optimized decks without memorizing a thousand-card banlist.

---

## Features

### Core Search
- **Live fuzzy name search** — type any card name and results update in real time
- **Category filtering** — narrow to Monsters, Spells, or Traps
- **Multi-select type toggles** — pick any combination of card types (Effect, Fusion, Synchro, Xyz, Link, Pendulum, etc.) with color-coded pills
- **Multi-select attributes** — filter by EARTH, WATER, FIRE, WIND, LIGHT, DARK, DIVINE
- **Multi-select monster races** — filter all 25 official types (Dragon, Spellcaster, Warrior, Cyberse, etc.)

### Advanced Description Search
- **Simple mode** — quick keyword matching across card text
- **Logic Gate mode** — build complex queries with nested AND / OR / NOT gate groups for precise effect searching

### Numerical Bounds
- **Level / Rank / Link** min/max sliders
- **ATK & DEF** range filters
- **GENESYS Points** cost filtering — find free cards or hunt for high-cost power pieces
- **Pendulum Scale** bounds — isolate monsters within a specific scale range

### Card Inspector
- Click any card to open a detailed modal with full art, stats, type breakdown, and point cost
- One-click image fallback for missing card art

### Data Management
- **IndexedDB caching** — cards are stored locally after first load for instant subsequent searches
- **10-minute sync cooldown** — prevents accidental API spam; manual refresh button with live countdown timer
- **Offline fallback** — if the API is unreachable, the app serves the last cached dataset
