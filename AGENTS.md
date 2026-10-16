# FIELD COMMAND / 戦線指揮

This is the canonical `hane-san/SRPG` repository. Do not modify the separate Nagi island game.

## Run and verify
- Static ES modules, no build step, no runtime dependencies or CDN.
- `npm run dev` serves repository root on port 4173.
- `npm run check` runs syntax and deterministic rules tests.
- `npm run simulate` reproduces the baseline policy comparison (not an optimal strategy solver).
- Optional browser QA: `npm install --no-save playwright`, `npx playwright install chromium`, serve root, then `node tests/browser-check.mjs`, `node tests/interaction-check.mjs`, `node tests/overlay-check.mjs`.
- Production URL (Pages enabled): `https://hane-san.github.io/SRPG/` (case matters).

## Change map/data before adding rules
- `data.js`: maps, terrain, positions, wave caps, roster. Coordinates are zero based. UI coordinates are one based.
- `config.js`: combat numbers, classes, skill descriptions.
- `engine.js`: pure deterministic commands and phases, no DOM or storage.
- `render.js`: original procedural pixel art / range overlays.
- `app.js` and `style.css`: compact battle UI, confirmation, campaign.
- `ui-input.js`: single pointer gesture tracking; a drag that returns to its origin is still a drag.
- `save.js`: optional local storage, validation, P1/finished-state restore.
- Read `docs/balance.md` before changing balance; preserve open hypotheses rather than calling them resolved.

## Invariants
1. P1 ally action -> P2 enemy -> P3 ally support -> P4 announced events.
2. No enemy general-unit P3 skills, hit/miss RNG, hidden lethal events, squad attrition resources or asset reuse from Fire Emblem.
3. P3 requires no move; no P2 counter when preparing support; no consumption if no valid target.
4. Public commands are attack/wait only. Stationary wait arms each unit’s finite P3 attack/heal; moved wait and P1 attack never arm P3. Attack skill at zero charges waits normally and may counter. Healers keep H1/H0/H2 emergency healing. Omitted units at phase-end wait in place.
5. H1 emergency healing is +1 up to floor(HP max / 2); H0/H2 are test controls.
6. Announce artillery at prior P4; spawned units first act at next P2.
7. Classic deaths persist only when continuing the campaign. Retry restores the chapter-start roster. Casual restores named units at next chapter.
8. Explicitly confirm player commands before committing movement or attacks. Don't save partial playing phases; finished victory/defeat states may persist at their final phase.
9. All tests/maps use one engine; keep settings independent (casual is not an enemy difficulty).

10. Battlefield geometry and scroll offsets must stay identical through selection, command/menu/details open-close, cancel, commit and warning appearance. Windows overlay the map. Only explicit navigation, zoom and resize may adjust the camera. Keep the 44px touch targets.

11. Route previews must use engine.routeTo, the same weighted movement field as reachable. Selected blue-range drags edit the cursor; outside-range drags pan. Flick from the draft destination to an enemy selects an attack target but never commits. Cancellation / multitouch restore the pre-gesture draft.

## Releases
- `node scripts/release.mjs 0.2.0` updates version tags on every ES module edge, CSS URL, package and version.json.
- Commit main and push; Pages deploys from main / root after its one-time activation. No service worker.
- Include playtest findings with actual observations; never claim iOS hardware testing from Chromium emulation.
- Do not commit test-results/, node_modules/, browser executables, credentials or personal chat context.
