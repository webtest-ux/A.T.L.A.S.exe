# A.T.L.A.S

3D Solar System explorer ("LET'S EXPLORE") and spacecraft mission-control simulator ("PLAY GAME"), built on three.js r128.

## Run it (VS Code)
1. Open this folder in VS Code (**File → Open Folder…**). Accept the recommended extensions (Live Server).
2. Right-click `index.html` → **Open with Live Server**, or in a terminal run `npm run dev` (needs Node.js; serves on http://localhost:5173).
3. Press **F12** for the browser console. Any runtime error is also shown in a red banner at the bottom-left.

Opening `index.html` directly from disk (file://) also works, but a local server is recommended.

## Quality / troubleshooting
- Default = **standard** surfaces (light canvas textures).
- `?quality=ultra` (or Layers → *Ultra-detail surfaces*) enables the GPU texture baker — sharper surfaces, much heavier on the GPU.
- `?safe=1` disables the baker, belts and shader effects — use it if the page freezes or the 3D view turns blank/grey
  (that usually means the browser reset the GPU: "WebGL context lost").
- In the console, `PlanetBaker.stats()` shows texture-baking status.

## Project layout
```
index.html            markup + script tags (load order matters)
css/app.css           all custom styles
js/tailwind.config.js Tailwind CDN theme
js/core|game|explorer|engine|shaders|data/  application code, one file per section
scripts/check-syntax.mjs   `npm run check` — parse-checks every JS file
ARCHITECTURE.md       state, engine, ATLAS guide, launch, sync and extension map
```
Script load order:
    js/core/01-sound-synthesis-engine-web-audio-api-telem.js
    js/game/02-astronaut-character-presets-suit-colors-an.js
    js/data/03-space-mission-engineering-database.js
    js/core/04-global-game-state-crew-profiles-multiplaye.js
    js/game/05-solo-character-studio-4-player-crew-lobby.js
    js/game/06-let-s-explore-mission-introduction-guided.js
    js/core/07-atlas-interactive-guide-bot-10-chapter-tut.js
    js/core/08-core-physics-keplerian-orbit-systems-engin.js
    js/game/09-ui-renderers-crew-atlas-synchronization.js
    js/game/10-user-actions-collapsible-cad-drawer-fullsc.js
    js/game/11-planetary-science-layer-menu-destination-e.js
    js/game/12-nasa-5-layer-realistic-earth-planetary-3d.js
    js/game/13-nasa-pre-launch-go-no-go-poll-3d-ascent-st.js
    js/game/14-interactive-5-phase-mission-simulation-cre.js
    js/game/15-saved-designs-architecture-comparison-tabl.js
    js/explorer/16-solar-system-explorer-cosmic-history-timel.js
    js/core/17-ops-dashboard-layer-navigation-rail-operat.js
    js/explorer/18-let-s-explore-ops-style-explorer-module.js
    js/shaders/19-planetary-rendering-library-glsl.js
    js/data/20-per-body-surface-recipes.js
    js/data/21-extended-solar-system-catalog-physical-dat.js
    js/engine/22-planet-engine-core-gpu-texture-baker-lazy.js
    js/engine/23-let-s-explore-3d-solar-system-engine.js
    js/engine/24-play-game-mission-destination-surfaces-moo.js
    js/engine/25-play-game-realistic-mission-surfaces-witho.js
    js/game/26-play-game-experience-modes-guided-mission.js
    js/game/27-play-game-spacecraft-builder-stages-2-4.js
    js/game/28-play-game-mission-readiness-checklist-stag.js
    js/game/29-play-game-launch-mission-experience-stage.js
    js/game/30-play-game-simplified-mission-dashboard-cad.js
    js/game/31-atlas-interactive-mission-instructor.js
    js/game/32-play-game-mode-specific-layouts.js
    js/game/33-beginner-friendly-terminology-contextual-t.js
    js/game/34-mission-feedback-player-progress-achieveme.js
    js/game/35-crew-roles-beginner-friendly-multiplayer-e.js
    js/game/36-responsive-accessibility-layer.js
    js/core/37-audio-manager-master-music-effects-ambient.js
    js/game/38-pad-3a9-earth-to-space-flight-view.js
    js/core/39-initialization-on-window-load.js

The scripts are classic (non-module) scripts sharing one global scope, exactly like the original single file,
so behaviour is unchanged. A later step could convert them to ES modules + Vite once the globals are untangled.
