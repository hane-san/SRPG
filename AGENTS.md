# FIELD COMMAND / 戦線指揮

This is the canonical `hane-san/SRPG` repository. Do not modify the separate Nagi island game.

Shared setup / handoff: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Current findings: [docs/destination-0.5.1.md](docs/destination-0.5.1.md). Next work: [docs/ROADMAP.md](docs/ROADMAP.md). Claude Code imports this file from `CLAUDE.md`; keep one rules contract.

## Run and verify
- Static ES modules, no build step, no runtime dependencies or CDN.
- `npm run dev` serves repository root on port 4173.
- `npm run check` runs syntax and deterministic rules tests on Node.js 22+.
- `npm run simulate` reproduces the baseline policy comparison (not an optimal strategy solver).
- Optional browser QA: `npm install --no-save --package-lock=false playwright@1.57.0`, `npx playwright install chromium`, serve root, then `node tests/browser-check.mjs`, `node tests/interaction-check.mjs`, `node tests/overlay-check.mjs`, `node tests/usability-check.mjs` (or `npm run test:browser`).
- Production URL (Pages enabled): `https://hane-san.github.io/SRPG/` (case matters).

## Change map/data before adding rules
- `data.js`: maps, terrain, positions, wave caps, roster. Coordinates are zero based. UI coordinates are one based.
- `config.js`: combat numbers, classes, skill descriptions.
- `engine.js`: pure deterministic commands and phases, no DOM or storage.
- `render.js`: original procedural pixel art / range overlays.
- `app.js` and `style.css`: quick-action battle UI, campaign, keyboard; Attack/Wait are the final choice with no extra confirmation.
- `ui-model.js`: forecast/target/slide/next-ready helpers; delegate rule calculations to engine.
- `playback.js`: tile interpolation and ordered hit/counter/heal presentation; never resolve rules here.
- `audio.js`: original Web Audio cues, gesture unlock, persistent mute; audio failure cannot block play.
- `assets/`: temporary original knight app icon and exported PNGs; `npm run icons` uses optional sharp.
- `ui-input.js`: single pointer gesture tracking; a drag that returns to its origin is still a drag.
- `save.js`: optional local storage, validation, P1/finished-state restore.
- Read `docs/balance.md` before changing balance; preserve open hypotheses rather than calling them resolved.

## Invariants
1. P1 ally action -> P2 enemy -> P3 ally support -> P4 announced events.
2. No enemy general-unit P3 skills, hit/miss RNG, hidden lethal events, squad attrition resources or asset reuse from Fire Emblem.
3. P3 requires no move; no P2 counter when preparing support; no consumption if no valid target.
4. Public commands are attack/wait only. Stationary wait arms each unit’s finite P3 attack/heal; moved wait and P1 attack never arm P3. Attack skill at zero charges waits normally and may counter. Healers keep H1/H0/H2 emergency healing. Omitted units at phase-end wait in place.
5. Shooter (ally): HP10, normal range2–3; stationary P3 fires once at every enemy at Manhattan range1–5, no counter, one charge per activation per turn, no targets means no spend. Rain map05 cycles clear/clear/light/heavy/light; movement reduction is foot2/horse3 for light, foot3/horse4 for heavy, minimum1 on both teams. All reach/routes/AI/threats must use engine.movement without altering base stats.
6. P3 heal affects every living wounded ally at Manhattan distance 1 (no self, enemies or diagonals), +7 each, one charge per healer activation per turn regardless of recipient count. No targets means no spend. Snapshot amounts before consuming the last charge. H1 emergency healing is +1 per eligible neighbour up to floor(HP max / 2); H0/H2 are test controls. Full-HP units are unaffected.
7. Announce artillery at prior P4; spawned units first act at next P2.
8. Classic deaths persist only when continuing the campaign. Retry restores the chapter-start roster. Casual restores named units at next chapter.
9. Press/slide/release only edits a draft and opens Attack / Wait / Back. Choices are disabled while the route finger is still held; after release, choosing Attack or Wait commits immediately; do not add a separate command/confirm step. Back/cancel/multitouch never consumes an action. Save the complete resolved P1 command before its presentation, never an intermediate visual/playing phase; finished outcomes may persist at their final phase.
10. All tests/maps use one engine; keep settings independent (casual is not an enemy difficulty).

11. Battlefield geometry and scroll offsets must stay identical through selection, command/menu/details open-close, cancel, commit and warning appearance. Windows overlay the map. Only explicit navigation, zoom and resize may adjust the camera. Holding a route near an edge is explicit navigation and may auto-scroll. Keep the 44px touch targets.

12. Route previews and movement events must use engine.routeTo, the weighted movement field shared with reachable. Pointerdown on an unselected ready ally selects it immediately and captures the gesture. Sliding into an enemy keeps the last legal firing position or finds a legal approach. Enemy contact may open its preview while still held; release opens the quick menu. Neither commits. Empty/outside-range drags pan through game handlers. Set touch-action:none before pointerdown and suppress map contextmenu, selection and touch callouts. Cancellation/multitouch restore the entire pre-press draft.
13. Animate movement along adjacent route tiles, then first strike, then a legal counter as separate engine observations. Present enemies sequentially. Playback speed/reduced motion/sound must not change results or enable input mid-command. Sound starts only after a user gesture and has persistent mute.

## Releases
- `node scripts/release.mjs 0.5.1` updates version tags on every ES module edge, CSS URL, package and version.json.
- Keep compatible saves when rules/schema are unchanged; 0.5.1 accepts stable 0.2.0 through 0.5.0 saves. The P3 area-heal rule applies prospectively.
- Sync and inspect remote changes before publishing; never force-push or overwrite another tool’s changes.
- Commit main and push; Pages deploys from main / root after its one-time activation. No service worker.
- Include playtest findings with actual observations; never claim iOS hardware testing from Chromium emulation.
- Do not commit test-results/, node_modules/, browser executables, credentials or personal chat context.


Optional maps 04–06 are standalone only; retain the original three-chapter campaign. Map controls start collapsed. Keep active origin/destination/target tiles clear of command windows where the viewport allows; window repositioning never scrolls the map.

When a route is already drawn, an enemy flick must retain that endpoint and route. A secondary gesture may start at the endpoint, original selected unit or empty map. Intermediate empty cells do not edit the anchor before the final intent is known; releasing on an empty tile explicitly edits the route. Out-of-range targets disable attack and explain why; never silently choose another firing position or another target. Without an explicit route, a direct enemy selection may still suggest a legal approach. Command popups are anchored by the destination with a pointer, clamped to the viewport without camera movement. Blue movement and the outer red normal-attack area must not overlap; P3 remains separately described.
