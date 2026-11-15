/* A.T.L.A.S · section 6 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 6. ATLAS — INTERACTIVE GUIDE BOT & 10-CHAPTER TUTORIAL ENGINE
 ***********************************************************************/
const NEXI_TUTORIAL_CHAPTERS = [
    {
        title: '1. Welcome to A.T.L.A.S',
        targetId: 'headerProfileCardContainer',
        tab: 'directive',
        text: 'Greetings, Commander! I am ATLAS, your mission guide. In A.T.L.A.S, you design, balance, and fly a complete NASA/JPL spacecraft from Cleanroom assembly to orbital science operations.'
    },
    {
        title: '2. Meet Your Mission Control Team',
        targetId: 'modeSelectorBar',
        tab: 'directive',
        text: 'You can play as a Solo Architect (controlling all workstations with your customized astronaut) or switch to 4-Player Mission Control where FLIGHT, EECOM, SCIENCE, and FIDO collaborate across seats!'
    },
    {
        title: '3. Understanding NASA Mission Directives',
        targetId: 'scenarioCardsContainer',
        tab: 'directive',
        text: 'Every mission starts with a Directive in Tab 1. Notice each destination (Earth, Moon, Mars, or Europa) defines a strict Budget Cap, Science Goal, Solar Irradiance percentage, and Radiation Hazard level.'
    },
    {
        title: '4. Building a Spacecraft Bus',
        targetId: 'busStructureGrid',
        tab: 'bus',
        text: 'In Tab 2 (Bus & Power), choose a Spacecraft Chassis first. Larger frames like the DeepSpace Hex-Bus or Titan Bus support up to 4 scientific instruments and higher reliability, but add wet mass and cost.'
    },
    {
        title: '5. Selecting Scientific Instruments',
        targetId: 'payloadInstrumentsGrid',
        tab: 'payload',
        text: 'In Tab 3 (Instruments), equip sensors that match your target planet for a +35% Orbital Synergy bonus! Watch your mass, power draw (-W), and daily data generation (Gbps).'
    },
    {
        title: '6. Understanding Power and Batteries',
        targetId: 'busPowerGrid',
        tab: 'bus',
        text: 'Solar arrays work well at Earth and the Moon (100% solar flux), but lose output at Mars (45%) and Europa (8%), where MMRTG nuclear power shines. Ensure your battery bank (Wh) survives 3D orbital eclipses!'
    },
    {
        title: '7. Configuring Keplerian Orbits',
        targetId: 'orbitSelectionGrid',
        tab: 'orbit',
        text: 'In Tab 4 (Orbit & Rocket), match your orbital regime to your target planet and fine-tune Periapsis, Apoapsis, and Inclination sliders. Higher orbits reduce eclipse darkness but require more rocket Delta-V.'
    },
    {
        title: '8. Understanding DSN Communications',
        targetId: 'commsSelectionGrid',
        tab: 'orbit',
        text: 'High-rate radar and hyperspectral sensors generate massive data streams. Select an X-Band, Ka-Band Dish, or Optical Lasercomm transceiver so your DSN Downlink capacity matches or exceeds instrument data generation.'
    },
    {
        title: '9. Preparing for Launch & GO/NO-GO Poll',
        targetId: 'diagnosticsAnalyzerPanel',
        tab: 'team',
        text: 'Review the Mission Operations Dashboard below the 3D view. When Budget, Lift Mass, Net Power, and Planetary Orbit have zero critical violations, all specialist stations will report GO!'
    },
    {
        title: '10. Completing Your First Mission',
        targetId: 'headerLaunchPollBtn',
        tab: 'team',
        text: 'Click "LET\'S EXPLORE!" / Start (top right) or "GO/NO-GO Poll" on the dashboard to conduct the voice-loop GO/NO-GO poll, command 3D Pad 3A9 liftoff and stage separation, and earn your final mission score!'
    }
];

function clearTutorialHighlights() {
    document.querySelectorAll('.nexi-tutorial-highlight').forEach(el => {
        el.classList.remove('nexi-tutorial-highlight');
    });
}

function startNexiTutorial(stepIndex = 0) {
    SoundFX.nexiChime();
    nexiState.enabled = true;
    nexiState.minimized = false;
    nexiState.tutorialActive = true;
    nexiState.tutorialStep = Math.max(0, Math.min(NEXI_TUTORIAL_CHAPTERS.length - 1, stepIndex));
    nexiState.lastCustomAnswer = null;
    applyNexiTutorialStep();
}

function applyNexiTutorialStep() {
    clearTutorialHighlights();
    const chap = NEXI_TUTORIAL_CHAPTERS[nexiState.tutorialStep];
    if (!chap) return;
    if (chap.tab && state.activeTab !== chap.tab) {
        switchTab(chap.tab);
    }
    const targetEl = document.getElementById(chap.targetId);
    if (targetEl) {
        targetEl.classList.add('nexi-tutorial-highlight');
        try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }
    updateNexiContextualGuidance();
}

function nextNexiTutorialStep() {
    SoundFX.click();
    if (nexiState.tutorialStep < NEXI_TUTORIAL_CHAPTERS.length - 1) {
        nexiState.tutorialStep++;
        applyNexiTutorialStep();
    } else {
        exitNexiTutorial();
        nexiState.lastCustomAnswer = 'Tutorial complete! You are ready to configure your mission and click "LAUNCH POLL & 3D SIM".';
        updateNexiContextualGuidance();
    }
}

function prevNexiTutorialStep() {
    SoundFX.click();
    if (nexiState.tutorialStep > 0) {
        nexiState.tutorialStep--;
        applyNexiTutorialStep();
    }
}

function restartNexiTutorial() {
    startNexiTutorial(0);
}

function exitNexiTutorial() {
    SoundFX.click();
    nexiState.tutorialActive = false;
    clearTutorialHighlights();
    updateNexiContextualGuidance();
}

function minimizeNexiPanel() {
    SoundFX.click();
    nexiState.minimized = true;
    updateNexiContextualGuidance();
}

function maximizeNexiPanel() {
    SoundFX.nexiChime();
    nexiState.enabled = true;
    nexiState.minimized = false;
    updateNexiContextualGuidance();
}

function disableNexiAssistant() {
    SoundFX.click();
    nexiState.enabled = false;
    nexiState.tutorialActive = false;
    clearTutorialHighlights();
    updateNexiContextualGuidance();
}

function toggleNexiAssistantButton() {
    if (!nexiState.enabled || nexiState.minimized) {
        maximizeNexiPanel();
    } else {
        minimizeNexiPanel();
    }
}

function generateNexiAnswerForQuery(rawQuery) {
    const q = (rawQuery || '').toLowerCase();
    if (typeof appExperienceMode !== 'undefined' && appExperienceMode !== 'game') {
        return generateNexiPlanetaryAnswer(q);
    }
    const m = computeMissionMetrics();

    if (q.includes('power') || q.includes('negative') || q.includes('watt') || q.includes('battery') || q.includes('eclipse')) {
        if (m.netWatts < 0) {
            return `Your spacecraft currently has a negative power balance (${m.netWatts}W: generating ${m.generatedWatts}W vs consuming ${m.totalWattsRequired}W). At ${m.orbit.body.toUpperCase()} (${Math.round(m.scenario.solarFluxMultiplier*100)}% sunlight), switch to Ultra-Flex ROSA Solar or Dual MMRTG Nuclear in Tab 2, or turn off PI Overclock.`;
        }
        if (m.batteryMarginWh < 0) {
            return `Your daytime power is positive (+${m.netWatts}W), but your battery bank (${m.effectiveBatteryWh}Wh) is ${Math.abs(m.batteryMarginWh)}Wh short during the ${Math.round(m.effectiveEclipseFraction*100)}% orbital eclipse. Upgrade to Solid-State/Fuel Cell in Tab 2 or enable EECOM +15% Battery Reserve.`;
        }
        return `Power systems are nominal! You generate ${m.generatedWatts}W against a ${m.totalWattsRequired}W load (+${m.netWatts}W margin) with +${m.batteryMarginWh}Wh eclipse battery reserve.`;
    }

    if (q.includes('periapsis') || q.includes('apoapsis') || q.includes('orbit') || q.includes('staging')) {
        return `Periapsis (${m.pe} km) is your closest orbital altitude and Apoapsis (${m.ap} km) is your farthest point (Eccentricity e = ${m.eccentricity.toFixed(3)}, ΔV = ${m.effectiveDeltaV} km/s). During 3D Pad 3A9 ascent, trigger Stage 1 MECO and Clamshell Fairing Jettison manually for +75 bonus points!`;
    }

    if (q.includes('mars') || q.includes('instrument') || q.includes('payload') || q.includes('science')) {
        const bestPayloads = PAYLOADS.filter(p => p.synergyBodies.includes(m.scenario.targetBody)).map(p => p.name).join(', ');
        return `For ${m.scenario.name} (${m.scenario.targetBody.toUpperCase()}), instruments with +35% orbital synergy are: ${bestPayloads}. Your current science yield is ${m.effectiveScience} / ${m.scenario.targetScience} pts (${Math.round(m.dataCaptureRatio*100)}% DSN downlink capture).`;
    }

    if (q.includes('no-go') || q.includes('nogo') || q.includes('go') || q.includes('ready') || q.includes('warning')) {
        if (m.hardFailures === 0 && m.readiness >= 80) {
            return `All 5 Mission Control stations are GO FOR LAUNCH (${m.readiness}% Readiness)! Budget is $${m.totalCost}M/$${m.maxBudget}M, Mass is ${m.totalMass}/${m.maxLiftCapacity} kg, and Net Power is +${m.netWatts}W.`;
        }
        const issues = m.diagnostics.map(d => `${d.title} (${d.msg})`).join(' | ');
        return `Current GO/NO-GO Advisories: ${issues}`;
    }

    if (q.includes('build') || q.includes('start') || q.includes('how')) {
        return `Follow the 5 Workstation Tabs in order: 1) Pick your Mission Directive, 2) Choose a Chassis, Power Source, Battery & Shielding, 3) Equip matching Science Instruments, 4) Match your Orbit, DSN Antenna & Rocket capacity, and 5) Run the GO/NO-GO Launch Poll!`;
    }

    return `Live Telemetry Summary for ${m.scenario.name}: Cost $${m.totalCost}M/$${m.maxBudget}M, Wet Mass ${m.totalMass}/${m.maxLiftCapacity} kg, Power ${m.netWatts >= 0 ? '+' : ''}${m.netWatts}W, DSN Capture ${Math.round(m.dataCaptureRatio*100)}%, Science ${m.effectiveScience}/${m.scenario.targetScience} pts.`;
}

function askNexiQuestion(qText) {
    SoundFX.nexiChime();
    nexiState.tutorialActive = false;
    clearTutorialHighlights();
    nexiState.lastCustomAnswer = generateNexiAnswerForQuery(qText);
    updateNexiContextualGuidance();
}

function handleNexiInputSubmit(ev) {
    ev.preventDefault();
    const input = document.getElementById('nexiQuestionInput');
    if (!input || !input.value.trim()) return;
    askNexiQuestion(input.value.trim());
    input.value = '';
}

function updateNexiContextualGuidance(metrics) {
    const m = metrics || computeMissionMetrics();
    const container = document.getElementById('nexiWidgetContainer');
    const expanded = document.getElementById('nexiExpandedPanel');
    const miniBtn = document.getElementById('nexiMinimizedBtn');
    const headerBtn = document.getElementById('headerNexiBtn');

    if (headerBtn) {
        headerBtn.className = nexiState.enabled
            ? 'px-2.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md'
            : 'px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 border border-slate-700 text-xs font-mono flex items-center gap-1.5';
    }

    if (!nexiState.enabled) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    const mood = m.hardFailures > 0 ? 'alert' : (m.readiness >= 90 ? 'celebrate' : 'nominal');
    const headerMount = document.getElementById('nexiAvatarHeaderMount');
    const miniMount = document.getElementById('nexiAvatarMiniMount');
    if (headerMount) headerMount.innerHTML = renderNexiRobotSVG(mood);
    if (miniMount) miniMount.innerHTML = renderNexiRobotSVG(mood);

    if (nexiState.minimized) {
        expanded.classList.add('hidden');
        miniBtn.classList.remove('hidden');
    } else {
        expanded.classList.remove('hidden');
        miniBtn.classList.add('hidden');
    }

    const seatObj = playerCrewState.coopSeats[state.activeSeat] || playerCrewState.coopSeats[1];
    const roleBadge = document.getElementById('nexiRoleContextBadge');
    if (roleBadge) {
        roleBadge.textContent = state.gameMode === 'coop'
            ? `SEAT ${state.activeSeat} // ${seatObj.roleCode} (${seatObj.callsign})`
            : `SOLO // ${playerCrewState.soloProfile.callsign}`;
    }

    const teamAlertBox = document.getElementById('nexiTeamAlertBox');
    const teamAlertText = document.getElementById('nexiTeamAlertText');
    let teamAlertMsg = '';
    if (m.orbit.body !== m.scenario.targetBody && state.gameMode !== 'sandbox') {
        teamAlertMsg = `FIDO, your selected orbital destination (${m.orbit.body.toUpperCase()}) does not match the ${m.scenario.targetBody.toUpperCase()} mission directive.`;
    } else if (m.netWatts < 0) {
        teamAlertMsg = `Flight Director, EECOM reports negative spacecraft power (${m.netWatts}W).`;
    } else if (m.batteryMarginWh < 0) {
        teamAlertMsg = `Flight Director, EECOM reports insufficient battery reserves (${m.batteryMarginWh}Wh deficit).`;
    } else if (m.totalMass > m.maxLiftCapacity) {
        teamAlertMsg = `FIDO & EECOM: Spacecraft wet mass (${m.totalMass} kg) exceeds ${m.rocket.name} capacity (${m.maxLiftCapacity} kg).`;
    } else if (m.effectiveScience < m.scenario.targetScience) {
        teamAlertMsg = `Science team, current payload yield (${m.effectiveScience} pts) is below the ${m.scenario.targetScience} pts target.`;
    } else if (m.hardFailures === 0 && m.readiness >= 85) {
        teamAlertMsg = `Mission Control, all specialist departments have completed readiness checks (${m.readiness}% Ready).`;
    }

    if (teamAlertBox && teamAlertText) {
        if (teamAlertMsg) {
            teamAlertBox.classList.remove('hidden');
            teamAlertBox.className = (m.hardFailures === 0 && m.readiness >= 85)
                ? 'px-3.5 py-1.5 bg-emerald-950/60 border-b border-emerald-500/40 text-[11px] font-mono text-emerald-200 flex items-center gap-2'
                : 'px-3.5 py-1.5 bg-rose-950/60 border-b border-rose-500/40 text-[11px] font-mono text-rose-200 flex items-center gap-2';
            teamAlertText.textContent = teamAlertMsg;
        } else {
            teamAlertBox.classList.add('hidden');
        }
    }

    if (typeof appExperienceMode !== 'undefined' && appExperienceMode !== 'game' && !nexiState.tutorialActive) {
        renderNexiPlanetaryGuideMode();
        return;
    }
    renderNexiChipsForMode('game');
    const tutBar = document.getElementById('nexiTutorialBar');
    const contextHeader = document.getElementById('nexiContextHeader');
    const speechEl = document.getElementById('nexiSpeechText');
    const modeTag = document.getElementById('nexiModeTag');

    if (nexiState.tutorialActive) {
        tutBar.classList.remove('hidden');
        const chap = NEXI_TUTORIAL_CHAPTERS[nexiState.tutorialStep];
        modeTag.textContent = 'TUTORIAL MODE';
        document.getElementById('nexiTutorialChapterLabel').textContent = `CHAPTER ${nexiState.tutorialStep + 1} / ${NEXI_TUTORIAL_CHAPTERS.length}`;
        document.getElementById('nexiTutorialProgressFill').style.width = `${((nexiState.tutorialStep + 1) / NEXI_TUTORIAL_CHAPTERS.length) * 100}%`;
        contextHeader.textContent = chap.title;
        speechEl.textContent = chap.text;
        document.getElementById('nexiMiniSubtext').textContent = chap.title;
        return;
    } else {
        tutBar.classList.add('hidden');
        modeTag.textContent = 'LIVE TELEMETRY GUIDE';
    }

    if (nexiState.lastCustomAnswer) {
        contextHeader.textContent = 'ATLAS ENGINEERING RESPONSE';
        speechEl.textContent = nexiState.lastCustomAnswer;
        document.getElementById('nexiMiniSubtext').textContent = nexiState.lastCustomAnswer;
        return;
    }

    let msg = '';
    let headerTitle = 'WORKSTATION TELEMETRY BRIEF';

    if (m.netWatts < 0) {
        headerTitle = 'ENGINEERING ADVISORY // POWER DEFICIT';
        msg = `Engineering advisory: Your spacecraft is consuming more power (${m.totalWattsRequired}W) than it generates (${m.generatedWatts}W at ${m.orbit.body.toUpperCase()}). Consider selecting a higher-output power system (ROSA or MMRTG) or reducing instrument power consumption.`;
    } else if (m.totalMass > m.maxLiftCapacity) {
        headerTitle = 'WARNING // LAUNCH MASS EXCEEDED';
        msg = `Warning: Your spacecraft (${m.totalMass} kg) exceeds the selected launch vehicle's lifting capacity (${m.maxLiftCapacity} kg on ${m.rocket.name}). Review your chassis, payload mass, and rocket selection.`;
    } else if (m.orbit.body !== m.scenario.targetBody && state.gameMode !== 'sandbox') {
        headerTitle = 'TRAJECTORY MISMATCH // FIDO ALERT';
        msg = `Navigation advisory: Directive "${m.scenario.name}" targets ${m.scenario.targetBody.toUpperCase()}, but your selected orbit is around ${m.orbit.body.toUpperCase()}. Open Tab 4 to align your planetary orbital regime.`;
    } else if (m.totalCost > m.maxBudget && state.gameMode !== 'sandbox') {
        headerTitle = 'FLIGHT DIRECTOR // BUDGET OVERRUN';
        msg = `Budget advisory: Total mission cost ($${m.totalCost}M) exceeds the $${m.maxBudget}M cap by $${m.totalCost - m.maxBudget}M. Consider a more economical launcher or bus structure.`;
    } else if (state.activeTab === 'bus') {
        headerTitle = 'EECOM // SPACECRAFT SYSTEMS ENGINEERING';
        msg = `Welcome to spacecraft systems engineering. Choose a power-generation system that can supply enough energy for your selected scientific instruments (+${m.netWatts}W net margin, ${m.effectiveBatteryWh}Wh battery reserve).`;
    } else if (state.activeTab === 'payload') {
        headerTitle = 'SCIENCE // INSTRUMENT PAYLOAD SELECTION';
        msg = `Lead Scientist workstation active: Equip up to ${m.chassis.maxPayloads} instruments. Current yield is ${m.effectiveScience} / ${m.scenario.targetScience} pts with ${Math.round(m.dataCaptureRatio*100)}% DSN downlink capture.`;
    } else if (state.activeTab === 'orbit') {
        headerTitle = 'FIDO // KEPLERIAN ORBIT & LAUNCH STACK';
        msg = `Flight Dynamics console active: Your ${m.pe}x${m.ap} km orbit (${state.inclinationDeg}°) requires ${m.effectiveDeltaV} km/s ΔV. ${m.rocket.name} provides ${m.maxLiftCapacity - m.totalMass} kg of spare lift margin.`;
    } else if (state.activeScenarioId === 'red_horizon' && state.activeTab === 'directive') {
        headerTitle = 'MARS DIRECTIVE // SOLAR FLUX ADVISORY';
        msg = `Welcome to the Red Horizon mission. Mars receives less solar energy (45% flux) than Earth, so your power-generation architecture and deep-space Lasercomm require special attention.`;
    } else if (m.hardFailures === 0 && m.effectiveScience >= m.scenario.targetScience) {
        headerTitle = 'ALL STATIONS GO // READY FOR POLL';
        msg = `Mission Control, all critical systems are within their defined limits (${m.readiness}% Readiness, ${m.effectiveScience} Sci pts). You may proceed with the GO/NO-GO assessment!`;
    } else {
        headerTitle = 'FLIGHT DIRECTOR // MISSION BRIEFING';
        msg = `Active Directive: ${m.scenario.name}. Configure your bus, instruments, and orbit across Tabs 1–5 so that Science reaches ${m.scenario.targetScience} pts within the $${m.maxBudget}M budget cap.`;
    }

    contextHeader.textContent = headerTitle;
    speechEl.textContent = msg;
    document.getElementById('nexiMiniSubtext').textContent = msg;
}

