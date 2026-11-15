/* A.T.L.A.S · section 5B — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 5B. "LET'S EXPLORE!" MISSION INTRODUCTION & GUIDED OPERATIONS FLOW
 ***********************************************************************/
function triggerLetsExploreFlow() {
    SoundFX.nexiChime();
    const m = computeMissionMetrics();

    // Mode-Specific Behavior: In 4-Player Mission Control, verify all 4 seats are READY first
    if (state.gameMode === 'coop') {
        const allSeatsReady = Object.values(playerCrewState.coopSeats).every(s => s.ready);
        if (!allSeatsReady) {
            renderCoopLobbyModal();
            const summaryEl = document.getElementById('lobbyReadySummaryText');
            if (summaryEl) {
                summaryEl.className = 'text-xs font-mono text-amber-300 font-bold animate-pulse';
                summaryEl.textContent = 'CREW READINESS REQUIRED: All 4 Specialist Stations must mark READY before Mission Briefing!';
            }
            openModal('coopLobbyModal');
            return;
        }
    }

    renderLetsExploreModal(m);
    openModal('letsExploreModal');
}

function markAllLobbySeatsReady() {
    SoundFX.success();
    [1, 2, 3, 4].forEach(seatNum => {
        playerCrewState.coopSeats[seatNum].ready = true;
        broadcastSeatCrewUpdate(seatNum);
    });
    renderCoopLobbyModal();
    renderAllUI();
}

function proceedFromCoopLobbyToMission() {
    const allReady = Object.values(playerCrewState.coopSeats).every(s => s.ready);
    if (!allReady) {
        SoundFX.alert();
        const summaryEl = document.getElementById('lobbyReadySummaryText');
        if (summaryEl) {
            summaryEl.className = 'text-xs font-mono text-rose-400 font-bold';
            summaryEl.textContent = 'Cannot start mission yet: Please mark all 4 specialist seats READY (or click "Mark All Ready").';
        }
        return;
    }
    closeModal('coopLobbyModal');
    renderLetsExploreModal(computeMissionMetrics());
    openModal('letsExploreModal');
}

function renderLetsExploreModal(m) {
    const sc = m.scenario;
    const soloProf = playerCrewState.soloProfile;
    const preset = CHARACTER_PRESETS.find(c => c.id === soloProf.presetId) || CHARACTER_PRESETS[0];
    const diffLabels = { cadet: 'Cadet (+15% Budget Margin)', engineer: 'Flight Engineer (Standard JPL)', director: 'Mission Director (Strict Cap)' };

    const badgeEl = document.getElementById('exploreModalModeBadge');
    const titleEl = document.getElementById('exploreModalMissionTitle');
    if (badgeEl) {
        badgeEl.textContent = state.gameMode === 'coop'
            ? `4-PLAYER CREW MISSION BRIEFING // ROOM ${state.roomCode}`
            : (state.gameMode === 'sandbox' ? 'SANDBOX FREE EXPLORATION BRIEFING' : 'SOLO ARCHITECT MISSION BRIEFING');
    }
    if (titleEl) {
        titleEl.textContent = state.gameMode === 'sandbox'
            ? `SANDBOX EXPLORATION: ${sc.name}`
            : sc.name;
    }

    const crewHtml = state.gameMode === 'coop'
        ? `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${[1, 2, 3, 4].map(n => {
                const s = playerCrewState.coopSeats[n];
                return `<div class="p-2 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex items-center gap-2">
                    <div class="w-10 h-10 rounded-lg bg-slate-950 border border-cyan-400/40 overflow-hidden shrink-0">
                        ${renderAstronautSVG(s.presetId, s.suitColor, 'talking', s.roleCode)}
                    </div>
                    <div class="min-w-0">
                        <div class="text-[9px] font-mono text-cyan-300 font-bold">${s.roleCode} • READY</div>
                        <div class="text-xs font-bold text-white truncate">${s.callsign}</div>
                    </div>
                </div>`;
            }).join('')}
           </div>`
        : `<div class="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/35 flex items-center gap-3.5">
            <div class="w-16 h-16 rounded-xl bg-slate-950 border-2 border-cyan-400/60 overflow-hidden shrink-0">
                ${renderAstronautSVG(soloProf.presetId, soloProf.suitColor, 'talking', soloProf.deptCode || 'FLIGHT')}
            </div>
            <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">${soloProf.deptCode || 'FLIGHT'} // ${soloProf.roleTitle || 'Flight Director'}</span>
                    <span class="text-[10px] font-mono text-emerald-400 font-bold">● ALL WORKSTATIONS UNLOCKED</span>
                </div>
                <div class="text-sm font-bold text-white">${soloProf.callsign} <span class="text-slate-400 font-normal text-xs">(${soloProf.customName || preset.name})</span></div>
                <div class="text-[11px] text-slate-300">${preset.bio}</div>
            </div>
           </div>`;

    const bodyEl = document.getElementById('exploreModalBody');
    if (bodyEl) {
        bodyEl.innerHTML = `
            ${crewHtml}

            <!-- ATLAS Interactive Mission Introduction -->
            <div class="p-3.5 rounded-xl bg-[#0B1220] border border-teal-400/40 flex items-start gap-3">
                <div class="w-12 h-12 rounded-xl bg-slate-950 border border-cyan-400/50 flex items-center justify-center shrink-0">
                    ${renderNexiRobotSVG('celebrate')}
                </div>
                <div class="space-y-1 text-xs">
                    <div class="font-mono text-[10px] uppercase text-teal-300 font-bold">ATLAS AI // MISSION BRIEFING & OBJECTIVES</div>
                    <p class="text-slate-200 leading-relaxed">
                        "Welcome aboard, <strong>${soloProf.callsign}</strong>! Our directive is <strong>${sc.name}</strong> targeting <strong>${sc.targetBody.toUpperCase()}</strong>. ${sc.desc} Once you click <strong>START MISSION</strong>, I will guide you through our 4 operational stages: Bus & Power, Science Instruments, Keplerian Orbit & Comms, and the Pre-Launch GO/NO-GO Poll."
                    </p>
                </div>
            </div>

            <!-- Mission Parameters Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div class="text-[9px] text-slate-400 uppercase">DESTINATION WORLD</div>
                    <div class="text-cyan-300 font-bold text-sm uppercase mt-0.5">${sc.targetBody} (${sc.badge.split(' ')[0]})</div>
                </div>
                <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div class="text-[9px] text-slate-400 uppercase">SCIENCE TARGET</div>
                    <div class="text-blue-300 font-bold text-sm mt-0.5">${sc.targetScience} Points</div>
                </div>
                <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div class="text-[9px] text-slate-400 uppercase">AVAILABLE BUDGET</div>
                    <div class="text-emerald-400 font-bold text-sm mt-0.5">${state.gameMode === 'sandbox' ? 'UNLIMITED (∞)' : `$${m.maxBudget} Million`}</div>
                </div>
                <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div class="text-[9px] text-slate-400 uppercase">DIFFICULTY TIER</div>
                    <div class="text-amber-300 font-bold text-xs truncate mt-0.5">${diffLabels[state.difficulty] || 'Flight Engineer'}</div>
                </div>
            </div>
        `;
    }
}

function startGuidedMissionExperience() {
    SoundFX.success();
    closeModal('letsExploreModal');
    state.missionExperienceActive = true;
    state.missionOpsStage = 1;

    const subLabel = document.getElementById('headerExploreSubLabel');
    if (subLabel) subLabel.textContent = 'MISSION OPS ACTIVE';

    // Focus 3D camera on the planetary destination in Orbital 3D mode
    setCameraViewMode('orbit');
    focusPrimaryPlanetRegion();

    // Activate Stage 1 (Bus & Power Engineering) and show ATLAS guidance
    setMissionOpsStage(1);
}

function setMissionOpsStage(stageNum) {
    SoundFX.click();
    state.missionOpsStage = stageNum;
    const stageTabs = { 1: 'bus', 2: 'payload', 3: 'orbit', 4: 'team' };
    const targetTab = stageTabs[stageNum] || 'directive';
    switchTab(targetTab);
    renderMissionOpsStageBar(computeMissionMetrics());

    if (stageNum === 4) {
        nexiState.lastCustomAnswer = 'Stage 4 (Flight Authorization): Review all specialist readiness checks below, then click "GO/NO-GO POLL" to authorize Pad 3A9 launch and 3D rocket staging!';
        updateNexiContextualGuidance();
    }
}

function advanceMissionOpsStage() {
    if (state.missionOpsStage < 4) {
        setMissionOpsStage(state.missionOpsStage + 1);
    } else {
        initiateGoNoGoPoll();
    }
}

function renderMissionOpsStageBar(m) {
    const bar = document.getElementById('missionOpsStageBar');
    const grid = document.getElementById('missionOpsStagesGrid');
    if (!bar || !grid) return;

    if (!state.missionExperienceActive) {
        bar.classList.add('hidden');
        return;
    }
    bar.classList.remove('hidden');

    const stages = [
        { num: 1, label: '1. Bus & Power', ok: m.netWatts >= 0 && m.batteryMarginWh >= 0 && m.shield.radRating >= m.effectiveRadLevel },
        { num: 2, label: '2. Instruments', ok: m.effectiveScience >= m.scenario.targetScience },
        { num: 3, label: '3. Orbit & Comms', ok: m.totalMass <= m.maxLiftCapacity && m.dataCaptureRatio >= 0.95 && (m.orbit.body === m.scenario.targetBody || state.gameMode === 'sandbox') },
        { num: 4, label: '4. Launch Poll', ok: m.hardFailures === 0 && m.readiness >= 80 }
    ];

    grid.innerHTML = stages.map(s => {
        const active = state.missionOpsStage === s.num;
        return `
            <button onclick="setMissionOpsStage(${s.num})" class="px-2 py-1 rounded-lg border text-left font-mono text-[10px] flex items-center justify-between transition ${
                active ? 'bg-teal-500/25 border-teal-300 text-white font-bold shadow' : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }">
                <span class="truncate">${s.label}</span>
                <i class="ph-fill ${s.ok ? 'ph-check-circle text-emerald-400' : 'ph-warning-circle text-amber-400'} shrink-0 ml-1"></i>
            </button>
        `;
    }).join('');
}

function renderCoopSeatCardsBar(m) {
    const bar = document.getElementById('coopSeatCardsBar');
    if (!bar) return;
    const metrics = m || computeMissionMetrics();
    bar.innerHTML = [1, 2, 3, 4].map(seatNum => {
        const s = playerCrewState.coopSeats[seatNum];
        const isSelected = state.activeSeat === seatNum;
        const anim = getSeatContextualAnimState(seatNum, metrics);
        return `
            <button onclick="selectSpecialistSeat(${seatNum}, '${s.tabId}', '${s.roleTitle.toUpperCase()} (${s.callsign})')" id="seatBtn-${seatNum}" class="p-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border ${isSelected ? 'border-cyan-400 shadow-md shadow-cyan-500/15' : 'border-slate-700'} text-left flex items-center gap-2 transition">
                <div class="w-8 h-8 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden shrink-0">
                    ${renderAstronautSVG(s.presetId, s.suitColor, anim, s.roleCode)}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="text-[9px] font-mono text-cyan-400 flex items-center justify-between">
                        <span>S${seatNum} // ${s.roleCode}</span>
                        <span class="w-1.5 h-1.5 rounded-full ${s.ready ? 'bg-emerald-400' : 'bg-amber-400'}"></span>
                    </div>
                    <div class="text-[11px] font-bold text-white truncate">${s.callsign}</div>
                </div>
            </button>
        `;
    }).join('');
}

function renderLiveCrewReactionStrip(m) {
    const strip = document.getElementById('liveCrewReactionStrip');
    if (!strip) return;

    const seatReactions = [
        {
            seat: 1,
            ok: m.totalCost <= m.maxBudget || state.gameMode === 'sandbox',
            msg: m.totalCost <= m.maxBudget ? `Budget +$${m.maxBudget - m.totalCost}M` : `Overrun -$${m.totalCost - m.maxBudget}M!`
        },
        {
            seat: 2,
            ok: m.netWatts >= 0 && m.batteryMarginWh >= 0 && m.shield.radRating >= m.effectiveRadLevel,
            msg: m.netWatts < 0 ? `Power ${m.netWatts}W!` : (m.batteryMarginWh < 0 ? `Bat ${m.batteryMarginWh}Wh!` : `Bus +${m.netWatts}W OK`)
        },
        {
            seat: 3,
            ok: m.effectiveScience >= m.scenario.targetScience,
            msg: `${m.effectiveScience}/${m.scenario.targetScience} Sci`
        },
        {
            seat: 4,
            ok: m.totalMass <= m.maxLiftCapacity && m.dataCaptureRatio >= 0.95 && (m.orbit.body === m.scenario.targetBody || state.gameMode === 'sandbox'),
            msg: m.totalMass > m.maxLiftCapacity ? `Overweight!` : `${m.pe}x${m.ap}km OK`
        }
    ];

    const roleNames = { 1: 'FLIGHT DIRECTOR', 2: 'EECOM', 3: 'LEAD SCIENTIST', 4: 'FIDO' };
    strip.innerHTML = seatReactions.map(r => {
        const crewR = state.gameMode === 'coop'
            ? playerCrewState.coopSeats[r.seat]
            : (r.seat === 1 ? { ...playerCrewState.soloProfile, roleCode: 'CMD' } : playerCrewState.coopSeats[r.seat]);
        const animR = getSeatContextualAnimState(r.seat, m);
        return `
            <div onclick="openActiveCharacterModal()" class="ops-crew-row ${r.ok ? '' : 'is-bad'}" title="${roleNames[r.seat]} — ${crewR.callsign}">
                <div class="av">${renderAstronautSVG(crewR.presetId, crewR.suitColor, animR, crewR.roleCode || 'NASA')}</div>
                <div class="who">${crewR.callsign}<small>${roleNames[r.seat]}</small></div>
                <div class="st ${r.ok ? 'text-emerald-400' : 'text-rose-400'}">${r.msg}</div>
            </div>`;
    }).join('');

}

