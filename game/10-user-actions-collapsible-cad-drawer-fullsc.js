/* A.T.L.A.S · section 9 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 9. USER ACTIONS, COLLAPSIBLE CAD DRAWER & FULLSCREEN VIEWPORT CONTROLS
 ***********************************************************************/
function toggleCadControlsDrawer(forceState = null) {
    SoundFX.click();
    state.cadDrawerOpen = forceState !== null ? forceState : !state.cadDrawerOpen;
    syncCadControlsDrawerUI();
}

function toggleScienceOverlayDrawer(forceState = null) {
    SoundFX.click();
    state.scienceDrawerOpen = forceState !== null ? forceState : !state.scienceDrawerOpen;
    const panel = document.getElementById('planetScienceOverlayPanel');
    const caret = document.getElementById('scienceOverlayCaret');
    if (!panel || !caret) return;
    if (state.scienceDrawerOpen) {
        panel.classList.remove('cad-drawer-closed');
        panel.classList.add('cad-drawer-open');
        caret.className = 'ph-bold ph-caret-up text-purple-300 text-xs transition-transform duration-300';
    } else {
        panel.classList.remove('cad-drawer-open');
        panel.classList.add('cad-drawer-closed');
        caret.className = 'ph-bold ph-caret-down text-purple-300 text-xs transition-transform duration-300';
    }
}

function toggleDiagnosticsDrawer(forceState = null) {
    SoundFX.click();
    state.diagnosticsDrawerOpen = forceState !== null ? forceState : !state.diagnosticsDrawerOpen;
    const bodyEl = document.getElementById('diagnosticsCollapsibleBody');
    const caretEl = document.getElementById('diagDrawerCaret');
    if (!bodyEl || !caretEl) return;
    if (state.diagnosticsDrawerOpen) {
        bodyEl.classList.remove('hidden');
        caretEl.className = 'ph-bold ph-caret-up text-cyan-400 text-xs transition-transform duration-300';
    } else {
        bodyEl.classList.add('hidden');
        caretEl.className = 'ph-bold ph-caret-down text-cyan-400 text-xs transition-transform duration-300';
    }
}

function cycleNexiDockPosition() {
    SoundFX.click();
    const order = ['br', 'bl', 'tr'];
    const idx = order.indexOf(nexiState.dockCorner || 'br');
    nexiState.dockCorner = order[(idx + 1) % order.length];
    const container = document.getElementById('nexiWidgetContainer');
    if (!container) return;
    container.classList.remove('nexi-dock-br', 'nexi-dock-bl', 'nexi-dock-tr');
    container.classList.add(`nexi-dock-${nexiState.dockCorner}`);
}

function syncCadControlsDrawerUI() {
    const drawer = document.getElementById('cleanroomControlsOverlay');
    const toggleBtn = document.getElementById('cadControlsToggleBtn');
    const arrowIcon = document.getElementById('cadToggleArrowIcon');
    const tooltip = document.getElementById('cadToggleTooltip');
    if (!drawer || !toggleBtn || !arrowIcon) return;

    const pctText = `${Math.round((state.explodedFactor || 0) * 100)}%`;
    if (state.cadDrawerOpen) {
        drawer.classList.remove('cad-drawer-closed');
        drawer.classList.add('cad-drawer-open');
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.setAttribute('title', 'Hide CAD Controls');
        if (tooltip) tooltip.innerHTML = `Hide CAD Controls (<span id="cadExplodedMiniBadge">${pctText}</span>)`;
        arrowIcon.className = 'ph-bold ph-caret-up text-cyan-300 text-xs transition-transform duration-300';
    } else {
        drawer.classList.remove('cad-drawer-open');
        drawer.classList.add('cad-drawer-closed');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('title', 'Show CAD Controls');
        if (tooltip) tooltip.innerHTML = `Show CAD Controls (<span id="cadExplodedMiniBadge">${pctText}</span>)`;
        arrowIcon.className = 'ph-bold ph-caret-down text-cyan-400 text-xs transition-transform duration-300';
    }
}

function toggleViewportExpandMode() {
    SoundFX.click();
    const panel = document.getElementById('threeViewportPanel');
    if (!panel) return;

    if (!state.viewportExpanded) {
        state.viewportExpanded = true;
        document.body.classList.add('viewport-expanded-backdrop');
        panel.classList.add('viewport-expanded-fallback');
        // Declutter secondary overlays automatically when entering Expanded Exploration Mode
        toggleScienceOverlayDrawer(false);
    } else {
        state.viewportExpanded = false;
        document.body.classList.remove('viewport-expanded-backdrop');
        panel.classList.remove('viewport-expanded-fallback');
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    }
    syncViewportExpandButtonUI();
    setTimeout(resizeThreeViewport, 50);
}

function syncViewportExpandButtonUI() {
    const panel = document.getElementById('threeViewportPanel');
    const btn = document.getElementById('expandViewportBtn');
    const icon = document.getElementById('expandViewportIcon');
    const label = document.getElementById('expandViewportLabel');
    if (!btn || !icon || !label) return;

    const active = state.viewportExpanded || (document.fullscreenElement === panel);
    if (active) {
        btn.className = 'hud-floating-glass px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/55 font-mono text-[11px] font-bold flex items-center gap-1.5';
        icon.className = 'ph-bold ph-corners-in text-sm text-amber-300';
        label.textContent = 'RETURN TO WORKSPACE';
    } else {
        btn.className = 'hud-floating-glass px-2.5 py-1.5 rounded-xl hover:bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 font-mono text-[11px] font-bold flex items-center gap-1.5';
        icon.className = 'ph-bold ph-corners-out text-sm text-cyan-300';
        label.textContent = 'EXPAND 3D VIEW';
    }
}

document.addEventListener('fullscreenchange', () => {
    const panel = document.getElementById('threeViewportPanel');
    if (!document.fullscreenElement && panel) {
        state.viewportExpanded = false;
        document.body.classList.remove('viewport-expanded-backdrop');
        panel.classList.remove('viewport-expanded-fallback');
    }
    syncViewportExpandButtonUI();
    setTimeout(resizeThreeViewport, 50);
});

function switchTab(tabId) {
    SoundFX.click();
    state.activeTab = tabId;
    if (typeof setWorkstationCollapsed === 'function' && opsLayout.wsCollapsed) setWorkstationCollapsed(false);
    nexiState.lastCustomAnswer = null;
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) targetPane.classList.remove('hidden');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = 'tab-btn py-2 px-1.5 rounded-xl text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 transition text-slate-400 hover:text-slate-200 hover:bg-[#142238]/60';
    });
    const activeBtn = document.getElementById(`tabBtn-${tabId}`);
    if (activeBtn) {
        activeBtn.className = 'tab-btn py-2 px-1.5 rounded-xl text-[11px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 transition bg-[#142238] text-cyan-200 border border-cyan-400/45 shadow-sm';
    }
    if (typeof syncRailUI === 'function') syncRailUI();
    updateNexiContextualGuidance();
}

function selectSpecialistSeat(seatNum, tabId, roleLabel) {
    SoundFX.quindar();
    state.activeSeat = seatNum;
    state.activeRoleName = roleLabel;
    nexiState.lastCustomAnswer = null;
    document.getElementById('activeRoleBadge').innerHTML = `<i class="ph-fill ph-user-focus"></i> ${roleLabel}`;
    switchTab(tabId);
    renderAllUI();
}

function setGameMode(mode, openCharacterFlow = false) {
    SoundFX.click();
    state.gameMode = mode;
    nexiState.lastCustomAnswer = null;
    ['solo', 'coop', 'sandbox'].forEach(m => {
        const btn = document.getElementById(`modeBtn-${m}`);
        btn.className = m === mode
            ? 'px-2 py-1 rounded-md text-xs font-semibold transition bg-[#142238] text-cyan-200 border border-cyan-400/45'
            : 'px-2 py-1 rounded-md text-xs font-medium transition text-slate-400 hover:text-white';
    });

    const coopBar = document.getElementById('coopRoleBar');
    const badge = document.getElementById('activeRoleBadge');
    if (mode === 'coop') {
        coopBar.classList.remove('hidden');
        const seatObj = playerCrewState.coopSeats[state.activeSeat] || playerCrewState.coopSeats[1];
        badge.innerHTML = `<i class="ph-fill ph-users-four"></i> ${seatObj.roleCode} (${seatObj.callsign})`;
        if (openCharacterFlow) {
            renderCoopLobbyModal();
            openModal('coopLobbyModal');
        }
    } else if (mode === 'sandbox') {
        coopBar.classList.add('hidden');
        badge.innerHTML = `<i class="ph-fill ph-infinity"></i> SANDBOX (${playerCrewState.soloProfile.callsign})`;
    } else {
        coopBar.classList.add('hidden');
        badge.innerHTML = `<i class="ph-fill ph-user"></i> SOLO (${playerCrewState.soloProfile.callsign})`;
        if (openCharacterFlow) {
            renderSoloCharacterModal();
            openModal('soloCharacterModal');
        }
    }
    renderAllUI();
}

function changeDifficulty(diff) {
    SoundFX.click();
    state.difficulty = diff;
    nexiState.lastCustomAnswer = null;
    renderAllUI();
    broadcastStateUpdate();
}

function selectScenario(scId) {
    SoundFX.click();
    state.activeScenarioId = scId;
    state.planetScienceLayer = 'natural';
    state.marsDustStormActive = false;
    state.europaOceanCutaway = false;
    nexiState.lastCustomAnswer = null;
    const sc = SCENARIOS.find(s => s.id === scId);
    if (sc && sc.optimalPreset) {
        state.orbit = sc.optimalPreset.orbit;
        state.periapsisKm = sc.optimalPreset.periapsisKm;
        state.apoapsisKm = sc.optimalPreset.apoapsisKm;
        state.inclinationDeg = sc.optimalPreset.inclinationDeg;
        syncSlidersFromState();
    }
    if (cameraMode === 'spacecraft') {
        setCameraViewMode('orbit');
    }
    if (scId === 'artemis_lunar') {
        // Focus orbital camera toward the Lunar South Pole (Shackleton Crater rim)
        targetSpherical.phi = 2.42;
        targetSpherical.theta = 0.45;
        targetSpherical.radius = 9.6;
    } else if (scId === 'red_horizon') {
        // Focus orbital camera toward Mars Tharsis / Valles Marineris hemisphere
        targetSpherical.phi = 1.18;
        targetSpherical.theta = 0.82;
        targetSpherical.radius = 10.8;
    } else if (scId === 'europa_clipper') {
        // Frame Europa in foreground with distant Jupiter in background
        targetSpherical.phi = 1.22;
        targetSpherical.theta = -0.55;
        targetSpherical.radius = 11.2;
    } else {
        targetSpherical.phi = 1.12;
        targetSpherical.theta = 0.65;
        targetSpherical.radius = 11.8;
    }
    lastBuiltSignature = '';
    renderAllUI();
    broadcastStateUpdate();
}

function selectOrbitRegime(orbitId) {
    SoundFX.click();
    state.orbit = orbitId;
    state.planetScienceLayer = 'natural';
    nexiState.lastCustomAnswer = null;
    const o = ORBITS.find(x => x.id === orbitId);
    if (o) {
        state.periapsisKm = o.defaultPe;
        state.apoapsisKm = o.defaultAp;
        state.inclinationDeg = o.defaultInc;
        syncSlidersFromState();
    }
    lastBuiltSignature = '';
    renderAllUI();
    broadcastStateUpdate();
}

