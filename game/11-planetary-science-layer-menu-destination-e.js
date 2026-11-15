/* A.T.L.A.S · section 9B — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 9B. PLANETARY SCIENCE LAYER MENU & DESTINATION ENVIRONMENT CONTROLS
 ***********************************************************************/
const PLANET_SCIENCE_LAYERS = {
    earth: [
        { id: 'natural', label: '1. Natural Blue Marble', desc: 'True-color continents, bathymetry & cloud cover' },
        { id: 'sar_ice', label: '2. Polar Ice & SAR Swath', desc: 'Simulated L/S-band cryosphere & ocean current radar' }
    ],
    moon: [
        { id: 'natural', label: '1. Natural Lunar Surface', desc: 'LRO-inspired gray regolith, maria basins & highland craters' },
        { id: 'elevation', label: '2. Polar Elevation (LOLA)', desc: 'Relief from the procedural reconstruction (LOLA-inspired ramp) — not LOLA data' },
        { id: 'psr', label: '3. Permanently Shadowed (PSR)', desc: 'Approximate PSR locations: Shackleton, Haworth, Shoemaker, Faustini, de Gerlache, Sverdrup, Cabeus' },
        { id: 'ice_zones', label: '4. Ice Investigation Zones', desc: 'Research target regions (outlines), not detected ice — Simulated' }
    ],
    mars: [
        { id: 'natural', label: '1. Natural Red Planet', desc: 'Iron-oxide regolith, Syrtis Major basalt & polar ice caps' },
        { id: 'atmo_zones', label: '2. Atmospheric Research', desc: 'Simulated atmospheric research target zones — not methane detections' },
        { id: 'subsurface_ice', label: '3. Subsurface Ice Zones', desc: 'Approximate radar-informed (SHARAD) buried-ice regions — illustrative' },
        { id: 'polar_ice', label: '4. Polar Ice Regions', desc: 'North Planum Boreum & South CO2/H2O layered ice deposits' },
        { id: 'elevation', label: '5. Surface Elevation (MOLA)', desc: 'Olympus Mons, Tharsis, Valles Marineris & Hellas — reconstruction relief, not MOLA data' },
        { id: 'dust_cond', label: '6. Dust & Atmo Conditions', desc: 'Simulated aerosol optical-depth pattern — not observed data' }
    ],
    europa: [
        { id: 'natural', label: '1. Natural Ice Shell', desc: 'Bright water-ice crust, reddish-brown lineae & Conamara Chaos' },
        { id: 'fractures', label: '2. Tectonic Ridges & Bands', desc: 'Intersecting double ridges, cycloids & dilational bands' },
        { id: 'chaos_terrain', label: '3. Chaos & Plume Targets', desc: 'Chaos regions (approx.) & a candidate plume region (unconfirmed)' },
        { id: 'radiation_env', label: '4. Jovian Radiation Flux', desc: 'Simulated Jupiter-centred field lines & radiation context — not measured flux' }
    ]
};

const PLANET_LANDMARKS_3D = {
    moon: [
        { name: 'Shackleton Crater (89.7°S)', lat: -89.67, lon: 129.8, color: 0x38bdf8, desc: 'Primary Artemis South Pole Rim & PSR Target' },
        { name: 'Haworth PSR Basin', lat: -87.45, lon: -5.1, color: 0x22d3ee, desc: 'Cold-trap permanently shadowed floor' },
        { name: 'Mons Malapert Peak', lat: -85.9, lon: 2.9, color: 0xfacc15, desc: 'Sunlit Earth-communication relay ridge' },
        { name: 'South Pole-Aitken Basin', lat: -53.0, lon: -169.0, color: 0x94a3b8, desc: 'Ancient ~2,500 km lunar impact basin (centre, approx.)' }
    ],
    mars: [
        { name: 'Olympus Mons (21.9 km)', lat: 18.6, lon: -133.8, color: 0xf97316, desc: 'Largest shield volcano in the Solar System' },
        { name: 'Valles Marineris Canyon', lat: -14.0, lon: -59.0, color: 0xfbbf24, desc: '4,000 km tectonic rift system (Atmo Target)' },
        { name: 'Hellas Planitia Basin', lat: -42.4, lon: 70.5, color: 0x38bdf8, desc: 'Deep impact basin & buried glacier target' },
        { name: 'Nili Fossae (Atmo Zone)', lat: 22.0, lon: 76.8, color: 0x34d399, desc: 'Simulated trace-gas investigation zone' },
        { name: 'Planum Boreum Ice Cap', lat: 83.0, lon: 15.0, color: 0xe0f2fe, desc: 'Layered water-ice & CO2 polar cap' }
    ],
    europa: [
        { name: 'Conamara Chaos Region', lat: 9.7, lon: 86.7, color: 0x38bdf8, desc: 'Disrupted ice rafts over subsurface brine lens' },
        { name: 'Thera Macula Chaos', lat: -46.7, lon: 178.8, color: 0x22d3ee, desc: 'Collapsed ice-shell investigation target' },
        { name: 'Minos & Cadmus Lineae', lat: 32.0, lon: -125.0, color: 0xf59e0b, desc: 'Intersecting reddish-brown double ridges' },
        { name: 'Pwyll Crater Rays', lat: -25.2, lon: 88.6, color: 0xf43f5e, desc: 'Young bright-rayed water-ice impact crater' }
    ],
    earth: [
        { name: 'Greenland Ice Sheet', lat: 72.0, lon: -40.0, color: 0x38bdf8, desc: 'Cryosphere SAR elevation monitoring' },
        { name: 'Amazon Basin Biomass', lat: -5.0, lon: -62.0, color: 0x34d399, desc: 'Hyperspectral forest carbon flux target' }
    ]
};

function selectPlanetScienceLayer(layerId) {
    SoundFX.click();
    state.planetScienceLayer = layerId;
    lastBuiltSignature = '';
    renderAllUI();
}

function toggleMarsDustStorm() {
    SoundFX.click();
    state.marsDustStormActive = !state.marsDustStormActive;
    lastBuiltSignature = '';
    renderAllUI();
}

function toggleEuropaOceanCutaway() {
    SoundFX.click();
    state.europaOceanCutaway = !state.europaOceanCutaway;
    lastBuiltSignature = '';
    renderAllUI();
}

function focusPrimaryPlanetRegion() {
    SoundFX.click();
    const m = computeMissionMetrics();
    const body = m.orbit.body;
    if (cameraMode === 'spacecraft' || cameraMode === 'pad') {
        setCameraViewMode('orbit');
    }
    if (body === 'moon') {
        // Zoom smoothly toward Lunar South Pole & Shackleton Crater
        targetSpherical.phi = 2.58;
        targetSpherical.theta = 0.25;
        targetSpherical.radius = 7.4;
    } else if (body === 'mars') {
        // Focus on Valles Marineris & Olympus Mons hemisphere
        targetSpherical.phi = 1.24;
        targetSpherical.theta = 1.05;
        targetSpherical.radius = 8.4;
    } else if (body === 'europa') {
        // Focus on Conamara Chaos & Subsurface Cutaway / Jupiter backdrop
        targetSpherical.phi = 1.28;
        targetSpherical.theta = -0.45;
        targetSpherical.radius = 8.2;
    } else {
        targetSpherical.phi = 1.1;
        targetSpherical.theta = 0.65;
        targetSpherical.radius = 9.0;
    }
}

function renderPlanetScienceLayerHUD(m) {
    const body = m.orbit.body;
    const layers = PLANET_SCIENCE_LAYERS[body] || PLANET_SCIENCE_LAYERS.earth;
    const activeLayerObj = layers.find(l => l.id === state.planetScienceLayer) || layers[0];

    const titleEl = document.getElementById('planetScienceHudTitle');
    if (titleEl) {
        const bodyTitles = {
            earth: 'EARTH-PULSE // LEO OBSERVATION',
            moon: 'ARTEMIS // LUNAR SOUTH POLE (89.9°S)',
            mars: 'RED HORIZON // MARS ORBITAL RECON',
            europa: 'EUROPA // JOVIAN ICY MOON & OCEAN'
        };
        titleEl.innerHTML = `<i class="ph-fill ph-stack"></i> ${bodyTitles[body] || 'PLANETARY LAYERS'}`;
    }

    const focusBtn = document.getElementById('planetFocusRegionBtn');
    if (focusBtn) {
        focusBtn.innerHTML = body === 'moon'
            ? '<i class="ph-bold ph-crosshair-simple"></i> South Pole Zoom'
            : (body === 'mars' ? '<i class="ph-bold ph-crosshair-simple"></i> Tharsis / Canyon' : (body === 'europa' ? '<i class="ph-bold ph-crosshair-simple"></i> Chaos / Jupiter' : '<i class="ph-bold ph-crosshair-simple"></i> Focus Orbit'));
    }

    const dustBtn = document.getElementById('marsDustStormBtn');
    if (dustBtn) {
        if (body === 'mars') {
            dustBtn.classList.remove('hidden');
            dustBtn.textContent = state.marsDustStormActive ? 'Dust Storm: ACTIVE (τ=2.4)' : 'Dust: Nominal (τ=0.4)';
            dustBtn.className = state.marsDustStormActive
                ? 'px-2 py-0.5 rounded bg-orange-500 text-slate-950 font-mono text-[9px] font-extrabold shadow'
                : 'px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-400/40 font-mono text-[9px] font-bold';
        } else {
            dustBtn.classList.add('hidden');
        }
    }

    const cutawayBtn = document.getElementById('europaCutawayBtn');
    if (cutawayBtn) {
        if (body === 'europa') {
            cutawayBtn.classList.remove('hidden');
            cutawayBtn.textContent = state.europaOceanCutaway ? 'VIEW: SUBSURFACE OCEAN CUTAWAY' : 'VIEW: ICE SURFACE / CUTAWAY';
            cutawayBtn.className = state.europaOceanCutaway
                ? 'px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[9px] font-extrabold shadow'
                : 'px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/35 text-sky-200 border border-sky-400/40 font-mono text-[9px] font-bold';
        } else {
            cutawayBtn.classList.add('hidden');
        }
    }

    const stripEl = document.getElementById('planetLayerButtonsStrip');
    if (stripEl) {
        stripEl.innerHTML = layers.map(l => {
            const active = l.id === activeLayerObj.id;
            return `<button onclick="selectPlanetScienceLayer('${l.id}')" class="px-2 py-0.5 rounded text-[9px] font-mono transition ${active ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80'}" title="${l.desc}">${l.label}</button>`;
        }).join('');
    }

    const telemEl = document.getElementById('planetDestinationTelemetryReadout');
    if (telemEl) {
        if (body === 'moon') {
            telemEl.innerHTML = `<span><strong class="text-cyan-300">SIMULATED TELEMETRY:</strong> Shackleton Rim Sun Elev: <strong class="text-amber-300">1.5° Grazing</strong></span><span>PSR Floor: <strong class="text-sky-300">38 K (-235°C)</strong> • Alt: ${m.pe}x${m.ap}km • Rad: Lv ${m.effectiveRadLevel}</span>`;
        } else if (body === 'mars') {
            telemEl.innerHTML = `<span><strong class="text-amber-300">SIMULATED TELEMETRY:</strong> Landmarks: <strong class="text-white">Olympus Mons / Valles Marineris</strong></span><span>Dust τ: <strong class="text-orange-300">${state.marsDustStormActive ? '2.4 (Storm)' : '0.45'}</strong> • Sci Yield: ${m.effectiveScience} pts</span>`;
        } else if (body === 'europa') {
            telemEl.innerHTML = `<span><strong class="text-sky-300">SIMULATED TELEMETRY:</strong> Ice Crust: <strong class="text-white">~15-25 km</strong> • Ocean: <strong class="text-blue-300">~100 km Deep</strong></span><span>Jovian Rad: <strong class="text-rose-400">Lv 4 (Extreme)</strong> • Cutaway: ${state.europaOceanCutaway ? 'ON' : 'OFF'}</span>`;
        } else {
            telemEl.innerHTML = `<span><strong class="text-emerald-300">SIMULATED TELEMETRY:</strong> Layer: <strong class="text-white">${activeLayerObj.label}</strong></span><span>Alt: ${m.pe}x${m.ap}km (${state.inclinationDeg}°) • Sci: ${m.effectiveScience} pts</span>`;
        }
    }

    const subLabel = document.getElementById('viewportSubLabel');
    if (subLabel) {
        const subMap = {
            earth: 'NASA 5-Layer Earth • Continents, Specular Ocean, Clouds & City Lights',
            moon: 'Artemis Lunar South Pole • Vacuum Sharp Shadows, Shackleton Rim & LRO Relief',
            mars: 'Red Horizon Mars • Olympus Mons, Valles Marineris, Polar Caps & Dusty Haze',
            europa: 'Europa & Distant Jupiter • Lineae Ice Fractures, Chaos Terrain & Ocean Cutaway'
        };
        subLabel.textContent = subMap[body] || subMap.earth;
    }
}

function applyOptimalPreset() {
    SoundFX.success();
    nexiState.lastCustomAnswer = null;
    const sc = SCENARIOS.find(s => s.id === state.activeScenarioId);
    if (!sc || !sc.optimalPreset) return;
    const p = sc.optimalPreset;
    state.chassis = p.chassis;
    state.power = p.power;
    state.battery = p.battery;
    state.shield = p.shield;
    state.payloads = [...p.payloads];
    state.orbit = p.orbit;
    state.comms = p.comms;
    state.rocket = p.rocket;
    state.periapsisKm = p.periapsisKm;
    state.apoapsisKm = p.apoapsisKm;
    state.inclinationDeg = p.inclinationDeg;
    syncSlidersFromState();
    lastBuiltSignature = '';
    renderAllUI();
    broadcastStateUpdate();
}

function selectSubsystem(category, itemId) {
    SoundFX.click();
    state[category] = itemId;
    nexiState.lastCustomAnswer = null;
    if (category === 'chassis') {
        const c = SUBSYSTEMS.chassis.find(x => x.id === itemId);
        if (state.payloads.length > c.maxPayloads) {
            state.payloads = state.payloads.slice(0, c.maxPayloads);
        }
    }
    lastBuiltSignature = '';
    renderAllUI();
    broadcastStateUpdate();
}

function togglePayload(payloadId) {
    const c = SUBSYSTEMS.chassis.find(x => x.id === state.chassis);
    const idx = state.payloads.indexOf(payloadId);
    nexiState.lastCustomAnswer = null;
    if (idx > -1) {
        SoundFX.click();
        state.payloads.splice(idx, 1);
    } else {
        if (state.payloads.length >= c.maxPayloads) {
            SoundFX.alert();
            document.getElementById('footerHintText').innerHTML =
                `<span class="text-rose-400 font-bold">Chassis Slot Limit (${c.maxPayloads}):</span> Upgrade Spacecraft Bus in Tab 2 to add more instruments!`;
            return;
        }
        SoundFX.click();
        state.payloads.push(payloadId);
    }
    lastBuiltSignature = '';
    renderAllUI();
    broadcastStateUpdate();
}

function toggleEecomBatteryReserve() {
    SoundFX.click();
    state.eecomReserveActive = !state.eecomReserveActive;
    nexiState.lastCustomAnswer = null;
    renderAllUI();
    broadcastStateUpdate();
}

function toggleScienceOverclock() {
    SoundFX.click();
    state.scienceOverclockActive = !state.scienceOverclockActive;
    nexiState.lastCustomAnswer = null;
    renderAllUI();
    broadcastStateUpdate();
}

function toggleManualStagingMode() {
    SoundFX.click();
    state.manualStagingMode = !state.manualStagingMode;
    renderAllUI();
    broadcastStateUpdate();
}

function setExplodedFactor(val) {
    state.explodedFactor = Number(val) / 100;
    const label = document.getElementById('explodedValLabel');
    if (label) label.textContent = `${val}%`;
    syncCadControlsDrawerUI();
}

function toggleDeployArticulation() {
    SoundFX.click();
    state.arraysDeployed = !state.arraysDeployed;
    const btn = document.getElementById('deployToggleBtn');
    if (btn) {
        btn.innerHTML = `<i class="ph-bold ph-arrows-out-line-horizontal mr-1"></i>Arrays: ${state.arraysDeployed ? 'DEPLOYED' : 'STOWED'}`;
    }
    applyExplodedAndArticulationTransforms();
}

function cyclePlanetAnimSpeed() {
    SoundFX.click();
    const speeds = [0.25, 1.0, 2.5, 5.0, 0.0];
    const idx = speeds.indexOf(state.planetAnimSpeed);
    state.planetAnimSpeed = speeds[(idx + 1) % speeds.length];
    const btn = document.getElementById('planetSpeedBtn');
    if (btn) {
        btn.textContent = state.planetAnimSpeed === 0 ? 'Spin: PAUSE' : `Spin: ${state.planetAnimSpeed}x`;
    }
}

function setFlightAttitude(att) {
    SoundFX.click();
    state.flightAttitude = att;
    ['nadir', 'dsn', 'sun', 'prograde'].forEach(a => {
        const btn = document.getElementById(`attBtn-${a}`);
        if (btn) {
            btn.className = a === att
                ? 'px-2 py-1 rounded text-[10px] font-mono font-bold bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                : 'px-2 py-1 rounded text-[10px] font-mono text-slate-300 bg-[#0B1220]/90 hover:text-white border border-slate-700/80';
        }
    });
    if (att === 'prograde') {
        SoundFX.rumble(0.4);
        state.apoapsisKm = Math.min(8000, state.apoapsisKm + 150);
        syncSlidersFromState();
        lastBuiltSignature = '';
    }
    renderAllUI();
}

function triggerTeamNegotiationEvent() {
    SoundFX.click();
    state.dilemmaIndex = (state.dilemmaIndex + 1) % TEAM_DILEMMAS.length;
    switchTab('team');
    renderAllUI();
    broadcastStateUpdate();
}

function resolveTeamDilemmaOption(optIndex) {
    SoundFX.success();
    const d = TEAM_DILEMMAS[state.dilemmaIndex % TEAM_DILEMMAS.length];
    const opt = d.options[optIndex];
    state.teamMods.scienceBonusPct = opt.effect.scienceBonusPct;
    state.teamMods.powerBonusW = opt.effect.powerBonusW;
    state.teamMods.costMod = opt.effect.costMod;
    state.teamMods.synergyScore = Math.min(100, 88 + opt.effect.synergyMod);
    state.dilemmaIndex = (state.dilemmaIndex + 1) % TEAM_DILEMMAS.length;
    renderAllUI();
    broadcastStateUpdate();
}

function openModal(id) {
    SoundFX.click();
    document.getElementById(id).classList.remove('hidden');
    if (id === 'leaderboardModal') renderLeaderboardTable();
    if (id === 'roomSyncModal') {
        document.getElementById('packetTextarea').value = btoa(JSON.stringify(getSerializableStateSnapshot()));
    }
}

function closeModal(id) {
    SoundFX.click();
    document.getElementById(id).classList.add('hidden');
}

