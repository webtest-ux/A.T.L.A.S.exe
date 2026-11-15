/* A.T.L.A.S · section 12 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 12. INTERACTIVE 5-PHASE MISSION SIMULATION & CREW REACTIONS
 ***********************************************************************/
const SIM_PHASES = [
    { name: '1. Ascent & Staging', icon: 'ph-rocket-launch' },
    { name: '2. Orbit Insertion', icon: 'ph-planet' },
    { name: '3. Eclipse & CME', icon: 'ph-moon-stars' },
    { name: '4. Science & DSN', icon: 'ph-broadcast' },
    { name: '5. Final Debrief', icon: 'ph-medal' }
];

function startMissionSimulation() {
    SoundFX.success();
    const m = computeMissionMetrics();
    state.sim = {
        phase: 0,
        health: m.reliability,
        scienceCollected: Math.round(m.effectiveScience * 0.25),
        anomalyResolved: false,
        anomalyBonusPts: state.ascent.manualStageBonus || 0
    };
    document.getElementById('simulationModal').classList.remove('hidden');
    renderSimulationStage();
}

function closeSimulationModal() {
    SoundFX.click();
    document.getElementById('simulationModal').classList.add('hidden');
}

// Single source of truth for the mission debrief score (simulation debrief and progress ratings use this)
function computeMissionScore(m) {
    m = m || computeMissionMetrics();
    const finalScience = Math.max(0, m.effectiveScience + state.sim.anomalyBonusPts);
    const missionSuccess = m.hardFailures === 0 && finalScience >= m.scenario.targetScience;
    const scienceScore = Math.min(450, Math.round((finalScience / m.scenario.targetScience) * 350));
    const efficiencyScore = m.totalCost <= m.maxBudget
        ? Math.round(150 + ((m.maxBudget - m.totalCost) / m.maxBudget) * 150)
        : Math.max(0, 100 - (m.totalCost - m.maxBudget) * 2);
    const engineeringScore = Math.round(m.readiness * 2.5);
    const synergyScore = state.teamMods.synergyScore + (state.ascent.manualStageBonus || 0);
    const totalMissionScore = scienceScore + efficiencyScore + engineeringScore + synergyScore;
    return { finalScience, missionSuccess, scienceScore, efficiencyScore, engineeringScore, synergyScore, totalMissionScore };
}

function renderSimulationStage() {
    const m = computeMissionMetrics();
    const phase = state.sim.phase;

    document.getElementById('simPhaseStepper').innerHTML = SIM_PHASES.map((p, idx) => {
        const active = idx === phase;
        const done = idx < phase;
        return `
            <div class="p-2 rounded-xl border text-center font-mono text-xs transition ${
                active ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold' :
                done ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                'bg-slate-900/70 border-slate-800 text-slate-500'
            }">
                <i class="ph-fill ${done ? 'ph-check-circle' : p.icon} text-base block mx-auto mb-0.5"></i>
                <span class="text-[10px] sm:text-xs">${p.name}</span>
            </div>
        `;
    }).join('');

    const _score = computeMissionScore(m);
    const finalScience = _score.finalScience;
    const missionSuccess = _score.missionSuccess;
    const simCrewBar = document.getElementById('simCrewReactionBar');
    if (simCrewBar) {
        simCrewBar.innerHTML = [1, 2, 3, 4].map(seatNum => {
            const c = playerCrewState.coopSeats[seatNum];
            let anim = 'typing';
            let statusTag = 'MONITORING';
            if (phase === 0) { anim = 'celebrate'; statusTag = 'MAX-Q / STAGING'; }
            else if (phase === 2 && !state.sim.anomalyResolved) { anim = 'alert'; statusTag = 'CME STORM ALERT'; }
            else if (phase === 4) { anim = missionSuccess ? 'celebrate' : 'alert'; statusTag = missionSuccess ? 'MISSION SUCCESS!' : 'DEBRIEF'; }

            return `
                <div class="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2">
                    <div class="w-10 h-10 rounded-lg bg-slate-950 border border-cyan-500/30 overflow-hidden shrink-0">
                        ${renderAstronautSVG(c.presetId, c.suitColor, anim, c.roleCode)}
                    </div>
                    <div class="min-w-0">
                        <div class="text-[10px] font-mono font-bold text-white truncate">${c.callsign}</div>
                        <div class="text-[9px] font-mono text-cyan-300 truncate">${statusTag}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const container = document.getElementById('simActiveStageContainer');
    const nextBtn = document.getElementById('simNextPhaseBtn');

    if (phase === 0) {
        const massOk = m.totalMass <= m.maxLiftCapacity;
        nextBtn.classList.remove('hidden');
        container.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">PHASE 1 // PAD 3A9 LIFTOFF, MAX-Q & CLAMSHELL FAIRING JETTISON</span>
                    <span class="font-mono text-xs ${massOk ? 'text-emerald-400' : 'text-rose-400'}">
                        ${m.rocket.name} (${m.totalMass}/${m.maxLiftCapacity} kg)
                    </span>
                </div>
                <p class="text-sm text-slate-200 leading-relaxed">
                    ${massOk
                        ? `Liftoff from Pad 3A9 confirmed! <strong>${m.rocket.name}</strong> cleared the umbilical tower with +${m.maxLiftCapacity - m.totalMass} kg margin, passed supersonic Max-Q, executed Stage 1 MECO separation, and jettisoned the clamshell payload fairing.${state.ascent.manualStageBonus > 0 ? ` <strong>(+${state.ascent.manualStageBonus} Manual Staging Precision Bonus!)</strong>` : ''}`
                        : `CRITICAL OVERWEIGHT ANOMALY: Spacecraft mass (${m.totalMass} kg) exceeded ${m.rocket.name}'s Keplerian orbit injection limit (${m.maxLiftCapacity} kg)! Upper stage burned reserve ACS propellant (-25% Reliability).`
                    }
                </p>
                <div class="grid grid-cols-3 gap-3 pt-2 font-mono text-xs">
                    <div class="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div class="text-slate-400 text-[10px]">STAGING & FAIRING</div>
                        <div class="text-emerald-400 font-bold">NOMINAL (+${state.ascent.manualStageBonus || 0} PTS)</div>
                    </div>
                    <div class="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div class="text-slate-400 text-[10px]">KEPLERIAN ΔV BURN</div>
                        <div class="text-cyan-300 font-bold">${m.effectiveDeltaV} km/s</div>
                    </div>
                    <div class="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div class="text-slate-400 text-[10px]">BUS INTEGRITY</div>
                        <div class="text-teal-300 font-bold">${massOk ? m.reliability : Math.max(20, m.reliability - 25)}%</div>
                    </div>
                </div>
            </div>
        `;
    } else if (phase === 1) {
        const targetOk = m.orbit.body === m.scenario.targetBody || state.gameMode === 'sandbox';
        container.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">PHASE 2 // KEPLERIAN ORBITAL INSERTION & ARRAY DEPLOYMENT</span>
                    <span class="font-mono text-xs text-cyan-300">Orbit: ${m.pe} x ${m.ap} km (${state.inclinationDeg}°)</span>
                </div>
                <p class="text-sm text-slate-200 leading-relaxed">
                    ${targetOk
                        ? `Spacecraft captured into <strong>${m.pe} x ${m.ap} km</strong> elliptical orbit (e = ${m.eccentricity.toFixed(3)}) around ${m.orbit.body.toUpperCase()}. ${m.powerSys.name} and ${m.comms.name} unfolded into flight lock.`
                        : `NAVIGATION MISMATCH: Spacecraft entered orbit around ${m.orbit.body.toUpperCase()}, whereas the mission directive required ${m.scenario.targetBody.toUpperCase()}!`
                    }
                </p>
                <div class="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                    Power Output at ${m.orbit.body.toUpperCase()}: <strong class="text-amber-300">${m.generatedWatts}W</strong> vs Load: <strong class="text-cyan-300">${m.totalWattsRequired}W</strong> (Net: ${m.netWatts >= 0 ? '+' : ''}${m.netWatts}W)
                </div>
            </div>
        `;
    } else if (phase === 2) {
        if (!state.sim.anomalyResolved) {
            nextBtn.classList.add('hidden');
        } else {
            nextBtn.classList.remove('hidden');
        }
        container.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">PHASE 3 // 3D UMBRA ECLIPSE & CME SOLAR STORM DECISION</span>
                    <span class="font-mono text-xs text-rose-400 animate-pulse">LIVE TELEMETRY ALERT!</span>
                </div>
                <p class="text-xs sm:text-sm text-slate-200">
                    As your spacecraft crosses the ${Math.round(m.effectiveEclipseFraction*100)}% planetary umbra shadow, a Coronal Mass Ejection (CME) radiation spike hits the bus! Choose Mission Control's response:
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <button onclick="resolveInFlightAnomaly('shield')" class="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-left transition">
                        <div class="font-mono text-xs font-bold text-cyan-300 mb-1">A. Rely on Shielding & Battery Bank</div>
                        <p class="text-[11px] text-slate-400">Keep all science payloads running using ${m.shield.name} and ${m.effectiveBatteryWh}Wh battery reserve.</p>
                    </button>
                    <button onclick="resolveInFlightAnomaly('safemode')" class="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-left transition">
                        <div class="font-mono text-xs font-bold text-amber-300 mb-1">B. Slew to Sun-Track Safe Mode</div>
                        <p class="text-[11px] text-slate-400">Power down non-essential instruments for 1 orbit to protect avionics (+10% Reliability, -15 Sci).</p>
                    </button>
                    <button onclick="resolveInFlightAnomaly('overclock')" class="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-left transition">
                        <div class="font-mono text-xs font-bold text-purple-300 mb-1">C. High-Gain Magnetosphere Burst</div>
                        <p class="text-[11px] text-slate-400">Sample CME plasma waves at maximum rate (+65 Bonus Science if Net Power > +50W).</p>
                    </button>
                </div>
                <div id="anomalyOutcomeBox" class="text-xs font-mono text-emerald-300 pt-1"></div>
            </div>
        `;
    } else if (phase === 3) {
        nextBtn.classList.remove('hidden');
        const capturePct = Math.round(m.dataCaptureRatio * 100);
        container.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-xs font-bold">PHASE 4 // SCIENCE DATA ACQUISITION & DSN DOWNLINK</span>
                    <span class="font-mono text-xs text-purple-300">DSN Capture: ${capturePct}%</span>
                </div>
                <p class="text-sm text-slate-200 leading-relaxed">
                    Your ${state.payloads.length} onboard instruments generated <strong>${m.dataGeneratedGbps} Gbps/day</strong> of telemetry.
                    <strong>${m.comms.name}</strong> downlinked <strong>${Math.min(m.dataGeneratedGbps, m.effectiveDownlinkGbps)} Gbps/day</strong> to Deep Space Network dishes.
                </p>
                <div class="grid grid-cols-3 gap-3 font-mono text-xs">
                    <div class="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div class="text-slate-400 text-[10px]">ACTIVE INSTRUMENTS</div>
                        <div class="text-white font-bold">${state.payloads.length} / ${m.chassis.maxPayloads} Slots</div>
                    </div>
                    <div class="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div class="text-slate-400 text-[10px]">DATA CAPTURED</div>
                        <div class="text-purple-300 font-bold">${capturePct}% Yield</div>
                    </div>
                    <div class="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div class="text-slate-400 text-[10px]">TOTAL SCIENCE</div>
                        <div class="text-blue-300 font-bold">${m.effectiveScience + state.sim.anomalyBonusPts} pts</div>
                    </div>
                </div>
            </div>
        `;
    } else if (phase === 4) {
        nextBtn.classList.add('hidden');
        const { scienceScore, efficiencyScore, engineeringScore, synergyScore, totalMissionScore } = _score;

        if (missionSuccess) {
            nexiState.lastCustomAnswer = `Congratulations, ${playerCrewState.soloProfile.callsign}! Mission objectives achieved (${finalScience}/${m.scenario.targetScience} Science pts, Score: ${totalMissionScore}). Your spacecraft completed its scientific objectives!`;
        } else {
            nexiState.lastCustomAnswer = `Post-Flight Debrief: Your spacecraft achieved ${finalScience}/${m.scenario.targetScience} Science pts (${totalMissionScore} total score), but encountered engineering or science shortfalls. Review the debrief below to refine your design.`;
        }
        updateNexiContextualGuidance(m);

        container.innerHTML = `
            <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                        <span class="px-2.5 py-0.5 rounded font-mono text-xs font-bold ${missionSuccess ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}">
                            ${missionSuccess ? 'MISSION SUCCESS // OBJECTIVES ACHIEVED' : 'PARTIAL SUCCESS // CONSTRAINTS VIOLATED'}
                        </span>
                        <h3 class="text-lg font-bold text-white mt-1">Final Mission Score: <span class="text-cyan-400 font-mono">${totalMissionScore} PTS</span></h3>
                    </div>
                    <button onclick="saveCurrentDesignToLeaderboard(${totalMissionScore})" class="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5">
                        <i class="ph-bold ph-trophy"></i> Save to Leaderboard Log
                    </button>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                    <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div class="text-[10px] text-slate-400">SCIENCE VALUE</div>
                        <div class="text-sm font-bold text-blue-300">+${scienceScore} pts</div>
                        <div class="text-[10px] text-slate-500">${finalScience}/${m.scenario.targetScience} sci</div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div class="text-[10px] text-slate-400">ENG. RELIABILITY</div>
                        <div class="text-sm font-bold text-teal-300">+${engineeringScore} pts</div>
                        <div class="text-[10px] text-slate-500">Readiness ${m.readiness}%</div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div class="text-[10px] text-slate-400">BUDGET EFFICIENCY</div>
                        <div class="text-sm font-bold text-emerald-300">+${efficiencyScore} pts</div>
                        <div class="text-[10px] text-slate-500">$${m.totalCost}M / $${m.maxBudget}M</div>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <div class="text-[10px] text-slate-400">SYNERGY & STAGING</div>
                        <div class="text-sm font-bold text-amber-300">+${synergyScore} pts</div>
                        <div class="text-[10px] text-slate-500">Co-op & Ascent Bonus</div>
                    </div>
                </div>

                <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                    <div class="font-mono font-bold text-cyan-300 uppercase text-[11px]">ATLAS & Chief Engineer Post-Mission Debrief:</div>
                    ${m.diagnostics.map(d => `<div class="text-slate-300">• <strong>${d.title}:</strong> ${d.msg}</div>`).join('')}
                </div>
            </div>
        `;
    }
}

function resolveInFlightAnomaly(choice) {
    SoundFX.success();
    const m = computeMissionMetrics();
    state.sim.anomalyResolved = true;
    const outBox = document.getElementById('anomalyOutcomeBox');
    document.getElementById('simNextPhaseBtn').classList.remove('hidden');

    if (choice === 'shield') {
        if (m.shield.radRating >= m.effectiveRadLevel && m.batteryMarginWh >= 0) {
            state.sim.anomalyBonusPts += 45;
            outBox.textContent = `OUTCOME: Your ${m.shield.name} and ${m.effectiveBatteryWh}Wh battery absorbed the CME storm with zero downtime! (+45 Bonus Science)`;
        } else {
            state.sim.anomalyBonusPts -= 40;
            outBox.className = 'text-xs font-mono text-rose-400 pt-1';
            outBox.textContent = `OUTCOME: Shielding/Battery margin was insufficient! Avionics suffered a reboot during eclipse (-40 Science pts).`;
        }
    } else if (choice === 'safemode') {
        state.sim.anomalyBonusPts -= 15;
        outBox.textContent = `OUTCOME: Spacecraft safely rode out the solar storm in Sun-Track Safe Mode (-15 Science pts).`;
    } else {
        if (m.netWatts >= 50) {
            state.sim.anomalyBonusPts += 65;
            outBox.textContent = `OUTCOME: Surplus power (+${m.netWatts}W) enabled high-rate magnetospheric storm sampling! (+65 Bonus Science)`;
        } else {
            state.sim.anomalyBonusPts -= 30;
            outBox.className = 'text-xs font-mono text-amber-400 pt-1';
            outBox.textContent = `OUTCOME: Power margin (+${m.netWatts}W) was too low for burst mode (<50W), triggering brownout protection (-30 Science pts).`;
        }
    }
    renderSimulationStage();
}

function advanceSimulationPhase() {
    SoundFX.click();
    if (state.sim.phase < 4) {
        state.sim.phase++;
        renderSimulationStage();
    }
}

