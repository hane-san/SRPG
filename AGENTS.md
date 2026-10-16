# FIELD COMMAND / 戦線指揮

This is the canonical `hane-san/SRPG` repository. Do not modify the separate Nagi island game.

## Run and verify
- Static ES modules, no build step, no runtime dependencies or CDN.
- `npm run dev` serves repository root on port 4173.
- `npm run check` runs syntax and deterministic rules tests.
- `npm run simulate` reproduces the baseline policy comparison (not an optimal strategy solver).
- Optional browser QA: `npm install --no-save playwright`, `npx playwright install chromium`, serve root, then `node tests/browser-check.mjs`.
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
4. Each unit has one finite tactical skill. Normal attacks remain available at zero charges.
5. H1 emergency healing is +1 up to floor(HP max / 2); H0/H2 are test controls.
6. Announce artillery at prior P4; spawned units first act at next P2.
7. Classic deaths persist only when continuing the campaign. Retry restores the chapter-start roster. Casual restores named units at next chapter.
8. Explicitly confirm player commands before committing movement or attacks. Don't save partial playing phases; finished victory/defeat states may persist at their final phase.
9. All tests/maps use one engine; keep settings independent (casual is not an enemy difficulty).

10. Battlefield geometry and scroll offsets must stay identical through selection, command/menu/details open-close, cancel, commit and warning appearance. Windows overlay the map. Only explicit navigation, zoom and resize may adjust the camera. Keep the 44px touch targets.

## Releases
- `node scripts/release.mjs 0.1.2` updates version tags on every ES module edge, CSS URL, package and version.json.
- Commit main and push; Pages deploys from main / root after its one-time activation. No service worker.
- Include playtest findings with actual observations; never claim iOS hardware testing from Chromium emulation.
- Do not commit test-results/, node_modules/, browser executables, credentials or personal chat context.
