# A.T.L.A.S — Architecture & Developer Map

Classic (non-module) scripts sharing one global scope, loaded in the order listed in `index.html`.
No build step and no npm dependencies at runtime (three.js r128, Tailwind, Phosphor icons and fonts come from CDNs).

## 1–2. Files
| Kind | Where | Notes |
|---|---|---|
| HTML | `index.html` | All markup; loading screen + independent boot script right after `<body>` |
| CSS | `css/app.css` | Original styles + redesign sections 1–23 (builder, readiness, launch, dashboard, ATLAS, layout, terms, progress, crew, a11y) |
| JS | `js/core`, `js/data`, `js/engine`, `js/shaders`, `js/explorer`, `js/game` | One file per numbered section (see README for load order) |
| Tooling | `scripts/check-syntax.mjs`, `.vscode/` | `npm run check` parse-checks every file |

## 3. Game functions (original, kept with the same names)
- **UI cycle:** `renderAllUI()` → tab renderers, `renderMissionDashboard`, `renderCoopSeatCardsBar`, `updateNexiContextualGuidance`
- **Navigation:** `switchAppExperience('menu'|'explore'|'game')`, `switchTab`, `railNavigate`, `openModal` / `closeModal`
- **Configuration actions:** `selectScenario`, `selectSubsystem`, `togglePayload`, `selectOrbitRegime`, `syncSlidersFromState`, `changeDifficulty`, `setGameMode`
- **Flight:** `initiateGoNoGoPoll` → `start3DPadAscentSequence` → `handleAscentPrimaryAction` → `completeAscentIntoOrbit` → `startMissionSimulation` → `advanceSimulationPhase` / `resolveInFlightAnomaly` → debrief in `renderSimulationStage`
- **Saving:** `saveCurrentDesignToLeaderboard`, `loadSavedDesign`, `getSerializableStateSnapshot`, `renderLeaderboardTable`; profile in `localStorage['aeronexus_profile_prefs_v1']`

## 4. Mission state (single source — every mode reads and writes the same objects)
- `state` — scenario, hardware (`chassis, power, battery, shield, payloads, orbit, comms, rocket`), orbit (`periapsisKm, apoapsisKm, inclinationDeg`), toggles, `difficulty`, `gameMode`, `ascent`, `sim`, `teamMods`, `savedDesigns`
- `playerCrewState` — `soloProfile`, `coopSeats[1..4]`
- `nexiState` — widget/tutorial state
- Redesign-only UI state (no mission data): `GM` (launcher), `BUILD` (builder step), `LX` (launch HUD), `NX` (ATLAS lessons), `PG` (achievements, saved in `localStorage['aeroNexusProgress.v1']`)

**Modes:** `state.difficulty` = `cadet | engineer | director` (Cadet / Engineer / Mission Control). It changes the interface (`body.xp-*`) and the existing budget tier only. It never resets the spacecraft. Re-picking the same mission in the launcher keeps the design; only a different mission loads that mission's orbit preset. Values hidden in Cadet (orbit sliders, console toggles) keep their values.

## 5. Spacecraft configuration
- Catalogs: `SCENARIOS`, `SUBSYSTEMS.{chassis,power,battery,shield}`, `PAYLOADS`, `ORBITS`, `COMMS`, `ROCKETS`
- **`computeMissionMetrics()` is the only physics/engineering engine.** Every panel, checklist, tip and rating reads from it.
- Builder (`js/game/27-…`): 10 steps, including **Launch Rocket**. `buildTry` evaluates a hypothetical part with the real engine and then restores state.
- **`nexiPlan()`** evaluates every part combination for the mission's recommended orbit with `computeMissionMetrics` + `computeGoNoGoStations` and keeps the best launch-ready design (cached per mission, difficulty, game mode and team modifiers). `buildRecommend(step)` returns that plan's part, and `applyNexiPlan()` applies it through the normal selection actions.

## 6. ATLAS
- Original: `updateNexiContextualGuidance`, `generateNexiAnswerForQuery`, tutorial chapters
- Instructor layer (`31-…`) wraps those: lessons `nxShow`, hints `nxHint`, glossary-first answers. Everything it says is built from live metrics.

## 7. Launch & orbit simulation
- Poll stations: **`computeGoNoGoStations(m)`** — the single rule set used by the poll, the readiness checklist (`aeroReadiness`), crew status and achievements
- Ascent: the original engine drives altitude and velocity (from the mission's Δv). The launch layer (`29-…`) adds only the readiness gate, T-10 countdown, mission clock, milestones and the deployment sequence.
- Orbits: Keplerian helpers in `08-core-physics…`
- Debrief score: **`computeMissionScore(m)`** — used by the simulation debrief and by the progress ratings

### Pad 3A9 flight view (`js/game/…pad-3a9-earth-to-space-flight-view.js`)
- Driven by the same ascent state (`state.ascent`); altitude and velocity are still the engine's values.
- Two hooks in `animateThreeLoop`: `padFlightDt()` (time-based ascent clock: slow lift-off, pause, speed) and `padFlightFrame(m)` (runs just before rendering).
- The rocket stays near the scene origin; the Earth globe, launch complex, clouds and pad fall away beneath it (`padxVisualH(altKm)` maps altitude to scene height). Sky, haze, stars and the limb glow are continuous functions of altitude.
- Cameras: `padxSetCam('pad'|'track'|'fp'|'earth'|'space')`. Controls: `padxFreeLaunch`, `padxTogglePause`, `padxRestart`, `padxReturnToPad`, `padxToggleSpeed`.
- Free flight (`PX.free`) never reaches the mission simulation, score or achievements; a mission launch always replaces it.
- If the view throws, it disables itself (`PX.broken`) and the original short ascent continues to work.

### Audio manager (`js/core/…audio-manager…js`)
- `AtlasAudio`: master gain → `music` / `sfx` / `ambient` buses; preferences in `localStorage['atlas_audio_v1']`; `AtlasAudio.set(key, value)`.
- `SoundFX` output is routed through the `sfx` bus; the existing mute buttons drive `AtlasAudio`.
- `PadAudio`: engine roar, aerodynamic noise and a space ambience, plus a spoken countdown (browser speech synthesis).

## 8. Multiplayer synchronization
- `initBroadcastChannel(code)` opens `BroadcastChannel('aeronexus_room_<CODE>')`. `broadcastStateUpdate()` sends `getSerializableStateSnapshot()` (hardware, orbit, difficulty, seats); remote packets are applied with `isApplyingRemoteSync`.
- Packet export/import lives in `roomSyncModal`.
- Redesign layers only *read* `coopSeats`. If a crew-mate changes difficulty, the local interface switches to match.

## 9. Reused UI components
Existing tabs (`tab-*`), workstation panel, 3D viewport, dashboard telemetry strip, poll modal, simulation modal, co-op lobby, room sync modal and leaderboard are all reused. The redesign adds panels next to them (builder tab, readiness panel, simple dashboard, cadet guide, glossary, progress panel) and does not replace them.

## Extension pattern
Add behaviour by wrapping, never by replacing:
```js
const _orig = renderAllUI;
renderAllUI = function () { _orig.apply(this, arguments); /* extra UI */ };
```
Wrappers must not write mission state unless the player acted, and must catch their own errors so the original flow never breaks.

## Checks used during development
See `QA_REPORT.md` for the full Stage 12 test run.
- Same element IDs and function names as the base build (302 IDs, 199 functions)
- Mode switches (difficulty select, launcher, during simulation) keep spacecraft, orbit, physics and flight progress
- Save → change → load restores the design
- Checklist / crew status never disagree with the GO/NO-GO poll (random designs)
- Debrief score unchanged for the reference flight (804)
- Two-tab room sync: hardware, seat READY and difficulty propagate
