/* A.T.L.A.S · section 8 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 8. UI RENDERERS & CREW / ATLAS SYNCHRONIZATION
 ***********************************************************************/
function syncSlidersFromState() {
    const peEl = document.getElementById('sliderPeriapsis');
    const apEl = document.getElementById('sliderApoapsis');
    const incEl = document.getElementById('sliderInclination');
    if (peEl) peEl.value = state.periapsisKm;
    if (apEl) apEl.value = state.apoapsisKm;
    if (incEl) incEl.value = state.inclinationDeg;
}

function updateKeplerSliders() {
    state.periapsisKm = Number(document.getElementById('sliderPeriapsis').value);
    state.apoapsisKm = Number(document.getElementById('sliderApoapsis').value);
    state.inclinationDeg = Number(document.getElementById('sliderInclination').value);
    lastBuiltSignature = '';
    renderAllUI();
    broadcastStateUpdate();
}

function renderAllUI() {
    const m = computeMissionMetrics();

    document.getElementById('headerScenarioTitle').textContent =
        state.gameMode === 'sandbox' ? 'SANDBOX MODE: Unlimited Orbital Architect' : m.scenario.name;

    const budgetEl = document.getElementById('gaugeBudget');
    budgetEl.textContent = state.gameMode === 'sandbox' ? `$${m.totalCost}M (∞)` : `$${m.totalCost}M / $${m.maxBudget}M`;
    budgetEl.className = `tm-value font-mono font-bold whitespace-nowrap ${m.totalCost <= m.maxBudget ? 'text-emerald-400' : 'text-rose-400'}`;

    const massEl = document.getElementById('gaugeMass');
    massEl.textContent = `${m.totalMass} / ${m.maxLiftCapacity} kg`;
    massEl.className = `tm-value font-mono font-bold whitespace-nowrap ${m.totalMass <= m.maxLiftCapacity ? 'text-cyan-300' : 'text-rose-400'}`;

    const powerEl = document.getElementById('gaugePower');
    powerEl.textContent = `${m.netWatts >= 0 ? '+' : ''}${m.netWatts}W (${m.effectiveBatteryWh}Wh)`;
    powerEl.className = `tm-value font-mono font-bold whitespace-nowrap ${(m.netWatts >= 0 && m.batteryMarginWh >= 0) ? 'text-amber-300' : 'text-rose-400'}`;

    const dataEl = document.getElementById('gaugeData');
    dataEl.textContent = `${m.effectiveDownlinkGbps} / ${m.dataGeneratedGbps} Gbps`;
    dataEl.className = `tm-value font-mono font-bold whitespace-nowrap ${m.dataCaptureRatio >= 0.95 ? 'text-purple-300' : 'text-amber-400'}`;

    const sciEl = document.getElementById('gaugeScience');
    sciEl.textContent = `${m.effectiveScience} / ${m.scenario.targetScience} pts`;
    sciEl.className = `tm-value font-mono font-bold whitespace-nowrap ${m.effectiveScience >= m.scenario.targetScience ? 'text-blue-300' : 'text-amber-300'}`;

    const relEl = document.getElementById('gaugeReliability');
    relEl.textContent = `${m.reliability}%`;
    relEl.className = `tm-value font-mono font-bold whitespace-nowrap ${m.reliability >= 85 ? 'text-teal-300' : 'text-rose-400'}`;

    document.getElementById('valPeriapsis').textContent = `${m.pe} km`;
    document.getElementById('valApoapsis').textContent = `${m.ap} km`;
    document.getElementById('valInclination').textContent = `${state.inclinationDeg}°`;
    document.getElementById('keplerReadoutSummary').textContent = `Eccentricity e = ${m.eccentricity.toFixed(3)} • ΔV = ${m.effectiveDeltaV} km/s`;

    const eecomBtn = document.getElementById('eecomReserveBtn');
    if (eecomBtn) {
        eecomBtn.innerHTML = `<i class="ph-fill ph-battery-plus mr-1"></i>+15% Emergency Bat Reserve: ${state.eecomReserveActive ? 'ON (+12kg)' : 'OFF'}`;
        eecomBtn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition ' + (state.eecomReserveActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-900 text-slate-300 border-slate-700');
    }

    const sciBtn = document.getElementById('sciOverclockBtn');
    if (sciBtn) {
        sciBtn.innerHTML = `<i class="ph-fill ph-lightning mr-1"></i>PI Overclock (+20% Sci / +25% W): ${state.scienceOverclockActive ? 'ACTIVE' : 'OFF'}`;
        sciBtn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition ' + (state.scienceOverclockActive ? 'bg-amber-500/25 text-amber-300 border-amber-400' : 'bg-slate-900 text-slate-300 border-slate-700');
    }

    const stageBtn = document.getElementById('fidoStagingModeBtn');
    if (stageBtn) {
        stageBtn.innerHTML = `<i class="ph-fill ph-hand-tap mr-1"></i>Staging: ${state.manualStagingMode ? 'MANUAL (+75 Pts)' : 'AUTO-SEQUENCE'}`;
        stageBtn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition ' + (state.manualStagingMode ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40');
    }

    renderHeaderCharacterProfile(m);
    renderMissionOpsStageBar(m);
    renderCoopSeatCardsBar(m);
    renderLiveCrewReactionStrip(m);
    renderScenariosTab(m);
    renderBusTab(m);
    renderPayloadsTab(m);
    renderOrbitTab(m);
    renderTeamTab(m);
    renderDiagnosticsPanel(m);
    renderOpsHeaderStatus(m);
    renderExplorerProfile();
    renderMissionDashboard(m);
    renderOpsSidePanel(m);
    syncRailUI();
    update3DSpacecraftAndOrbit(m);
    renderPlanetScienceLayerHUD(m);
    updateNexiContextualGuidance(m);
}

function renderScenariosTab(m) {
    const container = document.getElementById('scenarioCardsContainer');
    container.innerHTML = SCENARIOS.map(sc => {
        const isSelected = sc.id === state.activeScenarioId;
        return `
            <div onclick="selectScenario('${sc.id}')" class="glass-card h-full rounded-xl p-3.5 cursor-pointer flex flex-col justify-between gap-2 ${isSelected ? 'selected' : ''}">
                <div>
                    <div class="flex items-center justify-between gap-1.5 mb-1.5">
                        <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 truncate">${sc.badge}</span>
                        <span class="font-mono text-xs font-bold text-emerald-400 shrink-0">Budget: $${sc.budget}M</span>
                    </div>
                    <h3 class="font-bold text-white text-xs sm:text-sm leading-snug mb-1.5">${sc.name}</h3>
                    <p class="text-[11px] text-slate-300 leading-relaxed">${sc.desc}</p>
                </div>
                <div class="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono">
                    <div class="bg-slate-950/75 px-2 py-1 rounded border border-slate-800/60"><span class="text-slate-400">Sci:</span> <span class="text-blue-300 font-bold">${sc.targetScience}</span></div>
                    <div class="bg-slate-950/75 px-2 py-1 rounded border border-slate-800/60"><span class="text-slate-400">Flux:</span> <span class="text-amber-300 font-bold">${Math.round(sc.solarFluxMultiplier*100)}%</span></div>
                    <div class="bg-slate-950/75 px-2 py-1 rounded border border-slate-800/60"><span class="text-slate-400">Rad:</span> <span class="text-rose-300 font-bold">Lv ${sc.requiredRadiation}</span></div>
                </div>
            </div>
        `;
    }).join('');

    const sc = m.scenario;
    const activeCmdr = state.gameMode === 'coop' ? playerCrewState.coopSeats[1] : playerCrewState.soloProfile;
    const cmdrPreset = CHARACTER_PRESETS.find(c => c.id === activeCmdr.presetId) || CHARACTER_PRESETS[0];

    document.getElementById('scenarioBriefBox').innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-1.5">
            <div class="flex items-center gap-2.5 min-w-0">
                <div onclick="openActiveCharacterModal()" class="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-400/50 overflow-hidden cursor-pointer shrink-0" title="Click to Customize Commander">
                    ${renderAstronautSVG(activeCmdr.presetId, activeCmdr.suitColor, 'talking', 'FLIGHT')}
                </div>
                <div class="min-w-0">
                    <div class="font-mono text-[11px] uppercase font-bold text-cyan-300 truncate">Active Mission Brief // ${sc.name}</div>
                    <div class="text-[10px] font-mono text-slate-400 truncate">Cmdr: <strong class="text-white">${activeCmdr.callsign}</strong> (${cmdrPreset.name}) • Target: <strong class="text-cyan-300 uppercase">${sc.targetBody}</strong></div>
                </div>
            </div>
            <button onclick="openActiveCharacterModal()" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 font-mono text-[10px] shrink-0">
                <i class="ph-bold ph-user-gear mr-1"></i>Edit Astronaut
            </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-mono">
            <div class="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <div class="text-[9px] text-slate-400">BUDGET CAP</div>
                <div class="text-emerald-400 font-bold text-xs">$${m.maxBudget}M</div>
            </div>
            <div class="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <div class="text-[9px] text-slate-400">SCI GOAL</div>
                <div class="text-blue-400 font-bold text-xs">${sc.targetScience} pts</div>
            </div>
            <div class="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <div class="text-[9px] text-slate-400">SOLAR FLUX</div>
                <div class="text-amber-400 font-bold text-xs">${Math.round(sc.solarFluxMultiplier*100)}% Earth</div>
            </div>
            <div class="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <div class="text-[9px] text-slate-400">RAD HAZARD</div>
                <div class="text-rose-400 font-bold text-xs">Lv ${sc.requiredRadiation} / 4</div>
            </div>
        </div>
    `;

    const archEl = document.getElementById('directiveArchitectureSummary');
    if (archEl) {
        archEl.innerHTML = `
            <div class="flex items-center justify-between text-[10px] font-mono">
                <span class="text-cyan-400 font-bold uppercase flex items-center gap-1">
                    <i class="ph-fill ph-cpu"></i> Active Spacecraft Architecture Manifest
                </span>
                <span class="text-slate-400">Click any module to configure</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                <button onclick="switchTab('bus')" class="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition">
                    <div class="text-[8px] text-slate-400 uppercase">2. Bus & Power</div>
                    <div class="text-cyan-300 font-bold truncate mt-0.5">${m.chassis.name.split(' ')[0]} • ${m.powerSys.isSolar ? 'Solar' : 'MMRTG'}</div>
                </button>
                <button onclick="switchTab('payload')" class="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition">
                    <div class="text-[8px] text-slate-400 uppercase">3. Instruments</div>
                    <div class="text-emerald-300 font-bold truncate mt-0.5">${state.payloads.length}/${m.chassis.maxPayloads} Equipped (${m.effectiveScience} pts)</div>
                </button>
                <button onclick="switchTab('orbit')" class="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-left transition">
                    <div class="text-[8px] text-slate-400 uppercase">4. Orbit & DSN</div>
                    <div class="text-purple-300 font-bold truncate mt-0.5">${m.pe}×${m.ap}km • ${m.comms.name.split(' ')[0]}</div>
                </button>
                <button onclick="switchTab('orbit')" class="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-left transition">
                    <div class="text-[8px] text-slate-400 uppercase">4. Launch Stack</div>
                    <div class="text-amber-300 font-bold truncate mt-0.5">${m.rocket.name.split(' ')[0]} (${m.totalMass}/${m.maxLiftCapacity}kg)</div>
                </button>
            </div>
        `;
    }
}

function renderBusTab(m) {
    document.getElementById('busStructureGrid').innerHTML = SUBSYSTEMS.chassis.map(c => `
        <div onclick="selectSubsystem('chassis', '${c.id}')" class="glass-card rounded-xl p-2.5 cursor-pointer ${state.chassis === c.id ? 'selected' : ''}">
            <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-xs text-white">${c.name}</span>
                <span class="font-mono text-xs text-emerald-400 font-bold">$${c.cost}M</span>
            </div>
            <p class="text-[11px] text-slate-400 mb-2">${c.desc}</p>
            <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">${c.mass} kg</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-purple-300">Max ${c.maxPayloads} Payloads</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-teal-300">Rel: ${c.reliability}%</span>
            </div>
        </div>
    `).join('');

    document.getElementById('busPowerGrid').innerHTML = SUBSYSTEMS.power.map(p => `
        <div onclick="selectSubsystem('power', '${p.id}')" class="glass-card rounded-xl p-2.5 cursor-pointer ${state.power === p.id ? 'selected' : ''}">
            <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-xs text-white">${p.name}</span>
                <span class="font-mono text-xs text-emerald-400 font-bold">$${p.cost}M</span>
            </div>
            <p class="text-[11px] text-slate-400 mb-2">${p.desc}</p>
            <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300">+${p.baseWatts}W Base</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">${p.mass} kg</span>
            </div>
        </div>
    `).join('');

    document.getElementById('busBatteryGrid').innerHTML = SUBSYSTEMS.battery.map(b => `
        <div onclick="selectSubsystem('battery', '${b.id}')" class="glass-card rounded-xl p-2.5 cursor-pointer ${state.battery === b.id ? 'selected' : ''}">
            <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-xs text-white">${b.name}</span>
                <span class="font-mono text-xs text-emerald-400 font-bold">$${b.cost}M</span>
            </div>
            <p class="text-[11px] text-slate-400 mb-2">${b.desc}</p>
            <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300">${b.capacityWh} Wh</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">${b.mass} kg</span>
            </div>
        </div>
    `).join('');

    document.getElementById('busShieldGrid').innerHTML = SUBSYSTEMS.shield.map(s => `
        <div onclick="selectSubsystem('shield', '${s.id}')" class="glass-card rounded-xl p-2.5 cursor-pointer ${state.shield === s.id ? 'selected' : ''}">
            <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-xs text-white">${s.name}</span>
                <span class="font-mono text-xs text-emerald-400 font-bold">$${s.cost}M</span>
            </div>
            <p class="text-[11px] text-slate-400 mb-2">${s.desc}</p>
            <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-rose-300">Rad Lv ${s.radRating}</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300">-${s.powerDraw}W</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">${s.mass} kg</span>
            </div>
        </div>
    `).join('');
}

function renderPayloadsTab(m) {
    document.getElementById('maxPayloadSlotsLabel').textContent = m.chassis.maxPayloads;
    document.getElementById('equippedCountBadge').textContent = `${state.payloads.length} / ${m.chassis.maxPayloads}`;

    document.getElementById('payloadInstrumentsGrid').innerHTML = PAYLOADS.map(p => {
        const isEquipped = state.payloads.includes(p.id);
        const hasSynergy = p.synergyBodies.includes(m.orbit.body);
        return `
            <div onclick="togglePayload('${p.id}')" class="glass-card rounded-xl p-3 cursor-pointer flex flex-col justify-between ${isEquipped ? 'selected' : ''}">
                <div>
                    <div class="flex items-center justify-between gap-2 mb-1">
                        <div class="flex items-center gap-2">
                            <i class="ph-fill ${p.icon} text-cyan-400 text-lg"></i>
                            <span class="font-bold text-xs sm:text-sm text-white">${p.name}</span>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isEquipped ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'}">
                            ${isEquipped ? 'EQUIPPED' : '+ EQUIP'}
                        </span>
                    </div>
                    <p class="text-xs text-slate-300 mb-2">${p.desc}</p>
                </div>
                <div class="space-y-1 pt-2 border-t border-slate-800/80">
                    <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
                        <span class="px-1.5 py-0.5 rounded bg-slate-900 text-blue-300 font-bold">+${p.baseScience} Sci</span>
                        <span class="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300">$${p.cost}M</span>
                        <span class="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">${p.mass} kg</span>
                        <span class="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300">-${p.power}W</span>
                        <span class="px-1.5 py-0.5 rounded bg-slate-900 text-purple-300">${p.dataGbps} Gbps</span>
                    </div>
                    <div class="text-[10px] font-mono ${hasSynergy ? 'text-emerald-400' : 'text-slate-400'}">
                        <i class="ph-fill ${hasSynergy ? 'ph-check-circle' : 'ph-info'}"></i>
                        ${hasSynergy ? `High Orbital Synergy (+35% bonus at ${m.orbit.body.toUpperCase()})` : `Best at: ${p.synergyBodies.join(', ').toUpperCase()}`}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderOrbitTab(m) {
    document.getElementById('orbitSelectionGrid').innerHTML = ORBITS.map(o => {
        const isSelected = state.orbit === o.id;
        const matchesScenario = o.body === m.scenario.targetBody;
        return `
            <div onclick="selectOrbitRegime('${o.id}')" class="glass-card rounded-xl p-2.5 cursor-pointer flex flex-col justify-between ${isSelected ? 'selected' : ''}">
                <div>
                    <div class="flex items-center justify-between gap-1 mb-1">
                        <span class="font-bold text-xs text-white">${o.name}</span>
                        ${matchesScenario ? '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">TARGET</span>' : ''}
                    </div>
                    <p class="text-[11px] text-slate-400 mb-2">${o.desc}</p>
                </div>
                <div class="flex flex-wrap gap-1.5 text-[10px] font-mono pt-1.5 border-t border-slate-800">
                    <span class="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300">ΔV: ${o.deltaV} km/s</span>
                    <span class="px-1.5 py-0.5 rounded bg-slate-900 text-rose-300">Rad Lv ${o.radLevel}</span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('commsSelectionGrid').innerHTML = COMMS.map(c => `
        <div onclick="selectSubsystem('comms', '${c.id}')" class="glass-card rounded-xl p-2.5 cursor-pointer ${state.comms === c.id ? 'selected' : ''}">
            <div class="flex justify-between items-start mb-1">
                <span class="font-bold text-xs text-white">${c.name}</span>
                <span class="font-mono text-xs text-emerald-400 font-bold">$${c.cost}M</span>
            </div>
            <p class="text-[11px] text-slate-400 mb-2">${c.desc}</p>
            <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-purple-300">${c.baseGbps} Gbps Base</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300">-${c.power}W</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">${c.mass} kg</span>
            </div>
        </div>
    `).join('');

    document.getElementById('rocketSelectionGrid').innerHTML = ROCKETS.map(r => {
        const deltaVFactor = Math.max(0.26, 1 - ((m.effectiveDeltaV - 9.4) * 0.085));
        const orbitCap = Math.round(r.baseCapacityKg * deltaVFactor);
        const fitsMass = m.totalMass <= orbitCap;
        return `
            <div onclick="selectSubsystem('rocket', '${r.id}')" class="glass-card rounded-xl p-2.5 cursor-pointer ${state.rocket === r.id ? 'selected' : ''}">
                <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-xs text-white">${r.name}</span>
                    <span class="font-mono text-xs text-emerald-400 font-bold">$${r.cost}M</span>
                </div>
                <p class="text-[11px] text-slate-400 mb-2">${r.desc}</p>
                <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span class="px-1.5 py-0.5 rounded bg-slate-900 ${fitsMass ? 'text-cyan-300' : 'text-rose-400'} font-bold">
                        Lift Cap: ${orbitCap} kg
                    </span>
                    <span class="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300">${r.srbCount > 0 ? '2x SRBs + Core' : '2-Stage Stack'}</span>
                    <span class="px-1.5 py-0.5 rounded bg-slate-900 text-teal-300">Rel: ${r.reliability}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderTeamTab(m) {
    const roles = [
        {
            seat: 1,
            role: 'SEAT 1 // FLIGHT DIRECTOR',
            status: m.totalCost <= m.maxBudget ? 'GO (BUDGET OK)' : 'NO-GO (OVERRUN)',
            ok: m.totalCost <= m.maxBudget,
            detail: `Cost: $${m.totalCost}M / $${m.maxBudget}M Cap • Readiness: ${m.readiness}%`
        },
        {
            seat: 2,
            role: 'SEAT 2 // SYSTEMS ENG (EECOM)',
            status: (m.netWatts >= 0 && m.batteryMarginWh >= 0) ? 'GO (POWER OK)' : 'NO-GO (DEFICIT)',
            ok: (m.netWatts >= 0 && m.batteryMarginWh >= 0),
            detail: `Power: ${m.netWatts >= 0 ? '+' : ''}${m.netWatts}W • Eclipse Bat Margin: ${m.batteryMarginWh} Wh`
        },
        {
            seat: 3,
            role: 'SEAT 3 // LEAD SCIENTIST (SCI)',
            status: m.effectiveScience >= m.scenario.targetScience ? 'GO (SCI TARGET MET)' : 'ADVISORY (LOW SCI)',
            ok: m.effectiveScience >= m.scenario.targetScience,
            detail: `Yield: ${m.effectiveScience} / ${m.scenario.targetScience} pts (${state.scienceOverclockActive ? 'Overclock ON' : 'Nominal'})`
        },
        {
            seat: 4,
            role: 'SEAT 4 // FLIGHT DYNAMICS (FIDO)',
            status: (m.totalMass <= m.maxLiftCapacity && m.dataCaptureRatio >= 0.95) ? 'GO (TRAJECTORY OK)' : 'NO-GO (MASS/DSN)',
            ok: (m.totalMass <= m.maxLiftCapacity && m.dataCaptureRatio >= 0.95),
            detail: `Lift: ${m.totalMass}/${m.maxLiftCapacity} kg • Orbit: ${m.pe}x${m.ap}km (${state.inclinationDeg}°)`
        }
    ];

    document.getElementById('specialistStatusGrid').innerHTML = roles.map(r => {
        const crew = playerCrewState.coopSeats[r.seat];
        const anim = getSeatContextualAnimState(r.seat, m);
        return `
            <div onclick="openActiveCharacterModal()" class="p-3 rounded-xl bg-slate-900/90 border ${r.ok ? 'border-slate-800' : 'border-rose-500/50'} flex items-center gap-3 cursor-pointer hover:border-cyan-400/50 transition">
                <div class="w-12 h-12 rounded-xl bg-slate-950 border border-cyan-400/40 overflow-hidden shrink-0">
                    ${renderAstronautSVG(crew.presetId, crew.suitColor, anim, crew.roleCode)}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-1 mb-0.5">
                        <span class="font-bold text-xs text-white truncate">${crew.callsign}</span>
                        <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold ${r.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">${r.status}</span>
                    </div>
                    <div class="text-[10px] font-mono text-cyan-400">${r.role} ${crew.ready ? '• READY ✓' : '• STANDBY'}</div>
                    <div class="text-[11px] font-mono text-slate-400 truncate">${r.detail}</div>
                </div>
            </div>
        `;
    }).join('');

    const d = TEAM_DILEMMAS[state.dilemmaIndex % TEAM_DILEMMAS.length];
    document.getElementById('teamDilemmaContainer').innerHTML = `
        <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">ACTIVE ENGINEERING TRADE-OFF NEGOTIATION</span>
            <span class="text-xs font-mono text-cyan-300">Team Synergy Score: ${state.teamMods.synergyScore}%</span>
        </div>
        <h4 class="font-bold text-sm text-white">${d.title}</h4>
        <p class="text-xs text-slate-300 leading-relaxed">${d.context}</p>
        <div class="grid grid-cols-1 gap-2 pt-1">
            ${d.options.map((opt, idx) => `
                <button onclick="resolveTeamDilemmaOption(${idx})" class="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-left transition flex flex-wrap items-center justify-between gap-2">
                    <span class="text-xs font-medium text-white">${opt.label}</span>
                    <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[10px]">${opt.roleTag}</span>
                </button>
            `).join('')}
        </div>
    `;
}

function renderDiagnosticsPanel(m) {
    const meanAlt = Math.round((m.pe + m.ap) / 2);
    const hudMeanAltEl = document.getElementById('hudMeanAlt');
    if (hudMeanAltEl) {
        hudMeanAltEl.textContent = `${meanAlt} km (${m.orbit.body.toUpperCase()})`;
    }
    document.getElementById('hudOrbitName').textContent = `${m.pe}×${m.ap} km (${state.inclinationDeg}°)`;
    document.getElementById('hudEclipse').textContent = `${Math.round(m.effectiveEclipseFraction * 100)}% / Orbit`;
    document.getElementById('hudDeltaV').textContent = `${m.effectiveDeltaV} km/s`;
    const radNames = ['Low', 'Low-Mod', 'Elevated', 'High', 'Extreme'];
    document.getElementById('hudRadiation').textContent = `Lv ${m.effectiveRadLevel} (${radNames[m.effectiveRadLevel]})`;

    const hudPowerEl = document.getElementById('hudFloatingPower');
    if (hudPowerEl) {
        hudPowerEl.textContent = `${m.netWatts >= 0 ? '+' : ''}${m.netWatts}W (${m.effectiveBatteryWh}Wh)`;
        hudPowerEl.className = `text-[11px] font-mono font-bold truncate ${(m.netWatts >= 0 && m.batteryMarginWh >= 0) ? 'text-amber-300' : 'text-rose-400'}`;
    }
    const hudDataEl = document.getElementById('hudFloatingData');
    if (hudDataEl) {
        const capPct = Math.round(m.dataCaptureRatio * 100);
        hudDataEl.textContent = `${m.effectiveDownlinkGbps}/${m.dataGeneratedGbps} Gbps (${capPct}%)`;
        hudDataEl.className = `text-[11px] font-mono font-bold truncate ${capPct >= 95 ? 'text-purple-300' : 'text-amber-400'}`;
    }

    const badge = document.getElementById('overallReadinessBadge');
    if (m.hardFailures === 0 && m.readiness >= 80) {
        badge.textContent = `GO FOR LAUNCH (${m.readiness}%)`;
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    } else if (m.hardFailures === 0) {
        badge.textContent = `MARGIN CAUTION (${m.readiness}%)`;
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
    } else {
        badge.textContent = `NO-GO CONSTRAINT (${m.readiness}%)`;
        badge.className = 'px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 warning-pulse';
    }

    const budgetPct = Math.min(100, Math.round((m.totalCost / m.maxBudget) * 100));
    document.getElementById('barLabelBudget').textContent = state.gameMode === 'sandbox' ? `$${m.totalCost}M` : `${budgetPct}%`;
    const bFill = document.getElementById('barFillBudget');
    bFill.style.width = `${budgetPct}%`;
    bFill.className = `h-full transition-all duration-300 ${m.totalCost <= m.maxBudget ? 'bg-emerald-400' : 'bg-rose-500'}`;

    const massPct = Math.min(100, Math.round((m.totalMass / m.maxLiftCapacity) * 100));
    document.getElementById('barLabelMass').textContent = `${massPct}%`;
    const mFill = document.getElementById('barFillMass');
    mFill.style.width = `${massPct}%`;
    mFill.className = `h-full transition-all duration-300 ${m.totalMass <= m.maxLiftCapacity ? 'bg-cyan-400' : 'bg-rose-500'}`;

    const powerRatio = Math.min(100, Math.max(10, Math.round((m.generatedWatts / Math.max(1, m.totalWattsRequired)) * 75)));
    document.getElementById('barLabelPower').textContent = `${m.netWatts >= 0 ? '+' : ''}${m.netWatts}W`;
    const pFill = document.getElementById('barFillPower');
    pFill.style.width = `${powerRatio}%`;
    pFill.className = `h-full transition-all duration-300 ${(m.netWatts >= 0 && m.batteryMarginWh >= 0) ? 'bg-amber-400' : 'bg-rose-500'}`;

    const dataPct = Math.round(m.dataCaptureRatio * 100);
    document.getElementById('barLabelData').textContent = `${dataPct}%`;
    const dFill = document.getElementById('barFillData');
    dFill.style.width = `${dataPct}%`;
    dFill.className = `h-full transition-all duration-300 ${dataPct >= 95 ? 'bg-purple-400' : 'bg-amber-500'}`;

    document.getElementById('teamSynergyLabel').textContent = `Team Synergy: ${state.teamMods.synergyScore}%`;

    const alertCountBadge = document.getElementById('alertCountBadge');
    if (alertCountBadge) alertCountBadge.textContent = m.diagnostics.length;

    const renderDiagnosticItem = (d, compact = false) => {
        const styles = {
            critical: 'bg-rose-950/60 border-rose-500/50 text-rose-200',
            warning: 'bg-amber-950/60 border-amber-500/40 text-amber-200',
            info: 'bg-blue-950/60 border-blue-500/40 text-blue-200',
            nominal: 'bg-emerald-950/45 border-emerald-500/40 text-emerald-200'
        }[d.level];
        const icon = d.level === 'critical' ? 'ph-warning-octagon text-rose-400' :
                     d.level === 'warning' ? 'ph-warning text-amber-400' :
                     d.level === 'info' ? 'ph-info text-blue-400' : 'ph-check-circle text-emerald-400';
        if (compact) {
            return `
                <div onclick="openModal('diagnosticsModal')" class="px-2.5 py-1.5 rounded-lg border ${styles} text-[10px] flex items-center justify-between gap-2 cursor-pointer hover:border-cyan-400/50 transition" title="${d.msg}">
                    <div class="flex items-center gap-1.5 min-w-0">
                        <i class="ph-fill ${icon} text-sm shrink-0"></i>
                        <div class="truncate">
                            <span class="font-mono font-bold">${d.title}:</span>
                            <span class="opacity-90 ml-1">${d.msg}</span>
                        </div>
                    </div>
                    ${m.diagnostics.length > 1 ? `<span class="px-1.5 py-0.2 rounded bg-slate-950/80 font-mono text-[9px] text-cyan-300 shrink-0">+${m.diagnostics.length - 1} more</span>` : ''}
                </div>
            `;
        }
        return `
            <div class="p-2.5 rounded-xl border ${styles} text-xs flex items-start gap-2.5">
                <i class="ph-fill ${icon} text-base mt-0.5 shrink-0"></i>
                <div>
                    <div class="font-mono font-bold text-xs">${d.title}</div>
                    <div class="text-xs opacity-90 leading-relaxed mt-0.5">${d.msg}</div>
                </div>
            </div>
        `;
    };

    // Dashboard "Engineering Alerts" card: show the three highest-priority advisories
    const compactContainer = document.getElementById('diagnosticAlertsList');
    if (compactContainer) {
        compactContainer.innerHTML = renderDashboardAlertItems(m.diagnostics, 3);
    }

    // Populate all alerts inside the View All Alerts modal
    const fullModalList = document.getElementById('fullDiagnosticModalList');
    if (fullModalList) {
        fullModalList.innerHTML = m.diagnostics.map(d => renderDiagnosticItem(d, false)).join('');
    }
}

