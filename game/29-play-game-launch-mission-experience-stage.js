/* A.T.L.A.S · section 16K — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16K. PLAY GAME — LAUNCH & MISSION EXPERIENCE (Stage 6)
 *      Wraps the EXISTING ascent engine (start3DPadAscentSequence →
 *      MECO/stage separation → fairing jettison → SECO →
 *      completeAscentIntoOrbit → startMissionSimulation). Adds:
 *      readiness gate, T-10 countdown, ascent clock & milestones (altitude/velocity stay the engine's own),
 *      deployment & orbit-insertion sequence, cruise transition, a
 *      milestone tracker and a simple objectives strip in the mission sim.
 *      Scoring (manual staging bonus, sim phases, debrief) is unchanged.
 ***********************************************************************/
const LAUNCH_MILESTONES = [
    ['countdown', 'Countdown'], ['liftoff', 'Liftoff'], ['maxq', 'Max-Q'], ['meco', 'Stage separation'],
    ['fairing', 'Fairing separation'], ['seco', 'Engine cutoff'], ['deploy', 'Spacecraft deployment'],
    ['insert', 'Orbit insertion'], ['cruise', 'Journey'], ['ops', 'Science operations'], ['debrief', 'Debrief']
];
// Real transit times (rounded) used for the journey screen
const LAUNCH_TRANSIT = {
    earth: { label: 'Direct insertion into Earth orbit', time: 'about 9 minutes after liftoff', burn: 'Second-stage cutoff places the spacecraft directly into its Earth orbit.' },
    moon: { label: 'Trans-lunar injection → lunar orbit', time: 'about 4–5 days to the Moon (like LRO)', burn: 'A braking burn behind the Moon lets lunar gravity capture the spacecraft into a polar orbit.' },
    mars: { label: 'Trans-Mars injection → Mars orbit insertion', time: 'about 7 months to Mars (like MRO / MAVEN)', burn: 'A ~30-minute engine burn slows the spacecraft so Mars can capture it.' },
    europa: { label: 'Interplanetary cruise with gravity assists → Jupiter orbit', time: 'about 5.5 years to Jupiter (like Europa Clipper)', burn: 'Jupiter orbit insertion, then dozens of close Europa flybys.' }
};
const LX = { milestone: 0, cdTimer: null, seqTimer: null };

function launchSetMilestone(id) {
    const i = LAUNCH_MILESTONES.findIndex(x => x[0] === id);
    if (i >= 0) LX.milestone = i;
    renderLaunchMilestones();
}
function renderLaunchMilestones() {
    let el = document.getElementById('launchMilestoneBar');
    const host = document.getElementById('threeViewportPanel');
    if (!el && host) { el = document.createElement('div'); el.id = 'launchMilestoneBar'; host.appendChild(el); }
    if (!el) return;
    const active = !!LX.showing;
    el.classList.toggle('hidden', !active);
    if (!active) return;
    el.innerHTML = `<span class="lm-k">MISSION MILESTONES</span>${LAUNCH_MILESTONES.map(([id, t], i) =>
        `<span class="lm ${i < LX.milestone ? 'done' : ''} ${i === LX.milestone ? 'now' : ''}">${i < LX.milestone ? '✓' : (i + 1)} ${t}</span>`).join('')}`;
}

function launchOverlay(html, cls) {
    let el = document.getElementById('launchOverlay');
    const host = document.getElementById('threeViewportPanel') || document.body;
    if (!el) { el = document.createElement('div'); el.id = 'launchOverlay'; host.appendChild(el); }
    el.className = cls || '';
    el.innerHTML = html;
    el.classList.toggle('hidden', !html);
}

/* ---------- Readiness gate + countdown ---------- */
const _lxStartAscent = start3DPadAscentSequence;
start3DPadAscentSequence = function () {
    const r = aeroReadiness();
    const strict = state.difficulty !== 'director';
    if (!r.go && strict) {
        closeModal('goNoGoModal');
        SoundFX.alert();
        nexiState.lastCustomAnswer = `Launch on hold: ${r.bad} readiness item${r.bad === 1 ? '' : 's'} still red. Open the Mission Readiness checklist to see what to fix.`;
        updateNexiContextualGuidance();
        openSpacecraftBuilder(BUILD_STEPS.findIndex(s => s.id === 'ready'));
        return;
    }
    if (LX.cdTimer) return;
    LX.showing = true;
    closeModal('goNoGoModal');
    setCameraViewMode('pad');
    resetPadAscentState();
    const calls = { 10: 'Range is green', 7: 'Flight computer in startup', 5: 'Stage 1 propellant pressurisation', 3: 'Engine ignition sequence start', 1: 'Flight termination system armed', 0: 'LIFTOFF!' };
    let t = 10;
    launchSetMilestone('countdown');
    const tick = () => {
        LX.count = t; if (typeof padxCountdownTick === 'function') padxCountdownTick(t);
        launchOverlay(`<div class="lx-cd"><span>T−</span>${String(t).padStart(2, '0')}</div><div class="lx-call">${calls[t] || ''}</div>
            ${!r.go ? '<div class="lx-warn">Mission Control override: launching with open readiness issues — flight penalties apply.</div>' : ''}
            <button class="lx-skip" onclick="launchSkipCountdown()">Skip countdown</button>`, 'lx-countdown');
        if (t <= 3 && t > 0) SoundFX.beep(660, 0.09, 'square', 0.05);
        if (t === 0) { launchSkipCountdown(); return; }
        t--;
    };
    tick();
    LX.cdTimer = setInterval(tick, 1000);
    renderLaunchMilestones();
};
function launchSkipCountdown() {
    if (LX.cdTimer) { clearInterval(LX.cdTimer); LX.cdTimer = null; }
    LX.count = null;
    launchOverlay('');
    launchSetMilestone('liftoff');
    _lxStartAscent();
}

/* ---------- Representative telemetry + milestones during the existing ascent ---------- */
function ascentMissionTime(asc) {
    // Map the engine's internal timer to representative mission time using its own staging events
    const seg = (t0, t1, s0, s1) => s0 + (s1 - s0) * Math.max(0, Math.min(1, (asc.timer - t0) / Math.max(0.01, t1 - t0)));
    if (asc.stageIndex <= 1) return seg(0, 2.2, 0, 70);
    if (asc.stageIndex === 2) return seg(2.2, Math.max(2.3, asc.stage1SepTime || 4.2), 70, 150);
    if (asc.stageIndex === 3) return seg(asc.stage1SepTime, asc.stage1SepTime + 2.3, 150, 210);
    return seg(asc.fairingSepTime, asc.fairingSepTime + 2.5, 210, 520);
}
const _lxLoop = animateThreeLoop;
animateThreeLoop = function () {
    _lxLoop.apply(this, arguments);
    const asc = state.ascent;
    if (!asc || !asc.active) return;
    try {
        const ts = ascentMissionTime(asc);
        const mm = Math.floor(ts / 60), ss = Math.floor(ts % 60);
        const T = document.getElementById('ascentTimerLabel');
        if (T) T.textContent = `T+${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        // Altitude / velocity labels stay the ascent engine's own values (driven by this mission's Δv) — no profile override
        const want = asc.stageIndex <= 1 ? 'liftoff' : asc.stageIndex === 2 ? 'maxq' : asc.stageIndex === 3 ? 'meco' : 'fairing';
        if (LAUNCH_MILESTONES[LX.milestone][0] !== want && LX.milestone < LAUNCH_MILESTONES.findIndex(x => x[0] === want)) launchSetMilestone(want);
    } catch (e) { /* HUD optional */ }
};

/* ---------- Deployment → insertion → journey → mission simulation ---------- */
const _lxComplete = completeAscentIntoOrbit;
completeAscentIntoOrbit = function () {
    const asc = state.ascent;
    asc.active = false;
    asc.stageIndex = 5;
    const m = computeMissionMetrics();
    const tr = LAUNCH_TRANSIT[m.orbit.body] || LAUNCH_TRANSIT.earth;
    const bodyName = (BUILD_BODY[m.orbit.body] || {}).name || m.orbit.body;
    const steps = [
        ['seco', 'Second-stage engine cutoff', `Parking orbit reached at about 200 km and 7.8 km/s.`, () => setCameraViewMode('spacecraft')],
        ['deploy', 'Spacecraft separation', 'Springs push the spacecraft away from the rocket’s upper stage.', () => { }],
        ['deploy', 'Solar arrays & antenna deploy', state.power === 'mmrtg' ? 'The radioisotope generator is already producing power; the antenna unfolds and points at Earth.' : 'The solar panels unfold and turn toward the Sun; the antenna points at Earth.', () => { state.arraysDeployed = true; applyExplodedAndArticulationTransforms(); }],
        ['insert', 'Orbit insertion', `${tr.burn} Target: ${m.pe}–${m.ap} km at ${state.inclinationDeg}° around ${bodyName}.`, () => setCameraViewMode('orbit')],
        ['cruise', tr.label, `Real-world journey time: ${tr.time}. Time is compressed here.`, () => { }]
    ];
    let i = 0;
    const next = () => {
        if (i >= steps.length) {
            clearInterval(LX.seqTimer); LX.seqTimer = null;
            launchOverlay('');
            launchSetMilestone('ops');
            _lxComplete();             // existing: arrays deployed, orbit camera, startMissionSimulation()
            renderLaunchMilestones();
            return;
        }
        const [ms, title, text, act] = steps[i];
        try { act(); } catch (e) { /* camera optional */ }
        launchSetMilestone(ms);
        launchOverlay(`<div class="lx-step"><span class="lx-k">STEP ${i + 1} / ${steps.length}</span><b>${opsEsc(title)}</b><p>${opsEsc(text)}</p>
            <div class="lx-prog">${steps.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
            <button class="lx-skip" onclick="launchSkipSequence()">Skip to mission</button></div>`, 'lx-seq');
        SoundFX.beep(520 + i * 80, 0.07, 'sine', 0.05);
        i++;
    };
    LX.seqNext = next; LX.seqSteps = steps; LX.seqI = () => i;
    next();
    LX.seqTimer = setInterval(next, 2600);
    renderLaunchMilestones();
};
function launchSkipSequence() {
    if (!LX.seqTimer) return;
    clearInterval(LX.seqTimer); LX.seqTimer = null;
    state.arraysDeployed = true;
    launchOverlay('');
    launchSetMilestone('ops');
    _lxComplete();
}

/* ---------- Simple objectives strip inside the existing mission simulation ---------- */
const _lxRenderSim = renderSimulationStage;
renderSimulationStage = function () {
    _lxRenderSim.apply(this, arguments);
    try {
        const m = computeMissionMetrics(), sc = m.scenario, sim = state.sim || {};
        if (sim.phase >= 4) launchSetMilestone('debrief');
        let el = document.getElementById('simObjectivesStrip');
        const stepper = document.getElementById('simPhaseStepper');
        if (!el && stepper) { el = document.createElement('div'); el.id = 'simObjectivesStrip'; stepper.parentNode.insertBefore(el, stepper.nextSibling); }
        if (!el) return;
        const card = AERO_MISSION_CARDS[sc.id] || {};
        const sciNow = sim.phase >= 4 ? Math.max(0, m.effectiveScience + (sim.anomalyBonusPts || 0)) : (sim.scienceCollected || 0);
        const obj = [
            ['Reach the destination orbit', sim.phase >= 1],
            ['Survive the shadow and space-weather phase', sim.phase >= 3],
            [`Collect ${sc.targetScience} science points (${Math.round(sciNow)} so far)`, sciNow >= sc.targetScience],
            [`Send at least ${sc.minDownlink} Gbps of data home (${m.effectiveDownlinkGbps} Gbps link)`, m.effectiveDownlinkGbps >= sc.minDownlink],
            ['Spacecraft health above 50%', (sim.health || 0) > 50]
        ];
        el.innerHTML = `<div class="so-head"><b>${opsEsc(sc.name)}</b><span>${opsEsc(card.plain || sc.desc)}</span></div>
            <ul>${obj.map(([t, ok]) => `<li class="${ok ? 'ok' : ''}"><i class="ph-fill ${ok ? 'ph-check-circle' : 'ph-circle'}"></i>${opsEsc(t)}</li>`).join('')}</ul>`;
    } catch (e) { aeroReportError('mission objectives', e); }
};
const _lxCloseSim = closeSimulationModal;
closeSimulationModal = function () {
    _lxCloseSim.apply(this, arguments);
    LX.milestone = 0;
    LX.showing = false;
    renderLaunchMilestones();
};

