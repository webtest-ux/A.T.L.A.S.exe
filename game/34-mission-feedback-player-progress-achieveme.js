/* A.T.L.A.S · section 16P — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16P. MISSION FEEDBACK & PLAYER PROGRESS — achievements, discoveries,
 *      milestones, ratings, improvement tips, unlockable challenges.
 *      Everything is triggered by real gameplay events (design changes
 *      that meet engineering limits, orbit insertion, simulation phases,
 *      anomaly outcomes, debrief). Opening a screen never awards anything.
 *      Reads the existing score formula; never changes it.
 ***********************************************************************/
const PG_KEY = 'aeroNexusProgress.v1';
const PG = (() => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(PG_KEY) || 'null'); } catch (e) { d = null; }
    d = d || {};
    return { ach: d.ach || {}, disc: d.disc || {}, chal: d.chal || {}, best: d.best || {}, runs: d.runs || 0 };
})();
function pgSave() { try { localStorage.setItem(PG_KEY, JSON.stringify(PG)); } catch (e) { /* storage blocked: progress lives for this visit */ } }

const PG_ACH = [
    ['first_craft', 'FIRST SPACECRAFT', 'ph-rocket', 'Complete your first spacecraft — a design you changed that passes every NO-GO check.'],
    ['power_eng', 'POWER ENGINEER', 'ph-lightning', 'Build a functioning power system: positive power balance and a battery that survives the eclipse.'],
    ['sci_explorer', 'SCIENCE EXPLORER', 'ph-flask', 'Deploy instruments and return at least 85% of their data during Science & DSN operations.'],
    ['orbit', 'ORBIT ACHIEVED', 'ph-planet', 'Reach the selected orbit after launch.'],
    ['success', 'MISSION SUCCESS', 'ph-trophy', 'Complete the mission objectives (no hard failures, science target met).'],
    ['storm', 'STORM RIDER', 'ph-sun-dim', 'Turn the solar-storm anomaly into bonus science.'],
    ['all_go', 'ALL STATIONS GO', 'ph-check-circle', 'Launch with every readiness check green — no warnings at all.'],
    ['frugal', 'UNDER BUDGET', 'ph-coins', 'Succeed while spending no more than 85% of the budget.'],
    ['ace', 'MISSION ACE', 'ph-star', 'Earn an S rating on any mission.'],
    ['tour', 'GRAND TOUR', 'ph-globe-hemisphere-west', 'Succeed at all four missions: Earth, Moon, Mars and Europa.']
];
// Advanced challenges — unlocked by real results, completed by real results
const PG_CHAL = [
    { id: 'lean', name: 'Lean Machine', need: 'success', desc: 'Succeed using ≤ 75% of the budget.', test: (m, r) => r.success && m.totalCost <= m.maxBudget * 0.75 },
    { id: 'iron', name: 'Ironclad', need: 'success', desc: 'Succeed with reliability ≥ 95%.', test: (m, r) => r.success && m.reliability >= 95 },
    { id: 'over', name: 'Overachiever', need: 'success', desc: 'Return ≥ 150% of the science target.', test: (m, r) => r.finalScience >= m.scenario.targetScience * 1.5 },
    { id: 'eu_ace', name: 'Icy Moon Master', need: 'tour', desc: 'Earn an S rating on the Europa mission.', test: (m, r) => m.scenario.id === 'europa_clipper' && r.grade === 'S' }
];
// Science discoveries — real findings for each target body, unlocked when your instruments return data there
const PG_DISC = {
    earth: [['Sea-level rise', 'Satellite altimetry shows global mean sea level rising ~3–4 mm per year, faster than in the 20th century.'],
            ['Ice sheet loss', 'Gravity-measuring satellites (GRACE) found Greenland and Antarctica losing hundreds of billions of tonnes of ice per year.']],
    moon:  [['Water ice in shadow', 'Permanently shadowed craters near the lunar south pole stay below about −230 °C and hold water ice.'],
            ['Ancient crust', 'The South Pole–Aitken basin is among the largest and oldest impact basins in the Solar System, ~2,500 km across.']],
    mars:  [['Ancient rivers', 'Orbiters imaged dried river deltas and valley networks — liquid water once flowed on Mars.'],
            ['Lost atmosphere', 'MAVEN showed the solar wind stripped much of Mars’ early atmosphere into space.']],
    europa:[['Hidden ocean', 'Europa’s induced magnetic field reveals a salty liquid-water ocean beneath its ice shell.'],
            ['Twice Earth’s water', 'That ocean may hold about twice as much water as all of Earth’s oceans combined.']]
};
const PG_FACTS = [
    'A rocket spends most of its fuel in the first few minutes — just to climb out of the thick lower atmosphere.',
    'Max-Q is usually reached about a minute after liftoff, roughly 10–15 km up.',
    'In low Earth orbit a spacecraft circles the planet about every 90 minutes.',
    'Solar panels near Jupiter receive only about 4% of the sunlight they get near Earth.',
    'NASA’s DSN has three sites ~120° apart so one can always see a deep-space probe.',
    'A radio signal from Jupiter takes 33–53 minutes to reach Earth.'
];
const PG_MILESTONES = ['Launch & orbit insertion', 'Systems checkout', 'Eclipse & solar storm', 'Science & DSN downlink', 'Mission complete'];

const pgHas = id => !!PG.ach[id];
function pgAward(id) {
    if (pgHas(id)) return false;
    const a = PG_ACH.find(x => x[0] === id); if (!a) return false;
    PG.ach[id] = Date.now(); pgSave();
    pgToast('achievement', a[1], a[3], a[2]);
    try { SoundFX.success(); } catch (e) {}
    return true;
}
function pgToast(kind, title, body, icon) {
    let wrap = document.getElementById('pgToasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'pgToasts'; wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
    const el = document.createElement('div');
    el.className = 'pg-toast pg-' + kind;
    const label = { achievement: 'ACHIEVEMENT UNLOCKED', discovery: 'SCIENCE DISCOVERY', milestone: 'MISSION MILESTONE', unlock: 'NEW CHALLENGE UNLOCKED', challenge: 'CHALLENGE COMPLETE', fact: 'DID YOU KNOW?' }[kind] || '';
    el.innerHTML = `<i class="ph-fill ${icon || 'ph-star'}"></i><div><small>${label}</small><b>${opsEsc(title)}</b>${body ? `<p>${opsEsc(body)}</p>` : ''}</div>`;
    el.onclick = () => el.remove();
    wrap.appendChild(el);
    while (wrap.children.length > 4) wrap.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, kind === 'milestone' || kind === 'fact' ? 4200 : 6500);
    pgBadge();
}

/* ---------- Design-time achievements: only after the player actually changes the design ---------- */
function pgSig(m) { return [m.chassis, m.powerSys, m.battery, m.shield, m.orbit, m.comms, m.rocket].map(x => x && (x.id || x.name)).join('|') + '|' + m.totalMass + '|' + m.totalCost; }
let pgBaseline = null, pgBaseScenario = null;
function pgDesignCheck() {
    if (appExperienceMode !== 'game') return;
    const m = computeMissionMetrics(), sig = pgSig(m);
    if (pgBaseScenario !== state.activeScenarioId || pgBaseline === null) { pgBaseline = sig; pgBaseScenario = state.activeScenarioId; return; }
    if (sig === pgBaseline) return;           // nothing the player did yet
    const eecom = computeGoNoGoStations(m).find(st => st.code === 'EECOM');
    if (eecom && eecom.go && m.generatedWatts > 0) pgAward('power_eng');
    if (typeof aeroReadiness === 'function' && aeroReadiness(m).bad === 0) pgAward('first_craft');
}
const _pgRender = renderAllUI;
renderAllUI = function () { _pgRender.apply(this, arguments); try { pgDesignCheck(); } catch (e) {} };

/* ---------- Flight events ---------- */
let pgRun = null;   // per-flight record
const _pgAscent = start3DPadAscentSequence;
start3DPadAscentSequence = function () {
    const m = computeMissionMetrics();
    const rd = typeof aeroReadiness === 'function' ? aeroReadiness(m) : null;
    pgRun = { scenario: state.activeScenarioId, allGo: !!rd && rd.bad === 0 && rd.warn === 0, orbit: false, summarized: false, phaseSeen: {} };
    return _pgAscent.apply(this, arguments);
};
const _pgOrbit = completeAscentIntoOrbit;
completeAscentIntoOrbit = function () {
    const r = _pgOrbit.apply(this, arguments);
    if (!pgRun) pgRun = { scenario: state.activeScenarioId, allGo: false, phaseSeen: {} };
    pgRun.orbit = true;
    pgAward('orbit');
    if (pgRun.allGo) pgAward('all_go');
    return r;
};
const _pgSimStart = startMissionSimulation;
startMissionSimulation = function () {
    const r = _pgSimStart.apply(this, arguments);
    if (pgRun) { pgRun.phaseSeen = {}; pgRun.summarized = false; }
    pgPhase(0);
    return r;
};
const _pgAdvance = advanceSimulationPhase;
advanceSimulationPhase = function () { const before = state.sim && state.sim.phase; const r = _pgAdvance.apply(this, arguments); if (state.sim && state.sim.phase !== before) pgPhase(state.sim.phase); return r; };
const _pgAnom = resolveInFlightAnomaly;
resolveInFlightAnomaly = function () {
    const before = state.sim ? state.sim.anomalyBonusPts : 0;
    const r = _pgAnom.apply(this, arguments);
    if (state.sim && state.sim.anomalyBonusPts > before) pgAward('storm');
    return r;
};

function pgPhase(p) {
    if (!pgRun || !state.sim) return;
    if (pgRun.phaseSeen[p]) return;
    pgRun.phaseSeen[p] = true;
    const m = computeMissionMetrics();
    if (p < 4) pgToast('milestone', `${p + 1}/5 · ${PG_MILESTONES[p]}`, '', 'ph-flag-checkered');
    if (p === 1) pgToast('fact', PG_FACTS[(PG.runs + m.scenario.id.length) % PG_FACTS.length], '', 'ph-lightbulb');
    if (p === 3) {
        if (m.dataGeneratedGbps > 0 && m.dataCaptureRatio >= 0.85) {
            pgAward('sci_explorer');
            const list = PG_DISC[m.scenario.targetBody] || [];
            const got = PG.disc[m.scenario.targetBody] || [];
            const next = list.find(d => !got.includes(d[0]));
            if (next) { PG.disc[m.scenario.targetBody] = got.concat(next[0]); pgSave(); pgToast('discovery', next[0], next[1], 'ph-sparkle'); }
        } else {
            pgToast('milestone', 'Science downlink limited', `Only ${Math.round(m.dataCaptureRatio * 100)}% of instrument data reached Earth — no discovery this time.`, 'ph-warning');
        }
    }
    if (p === 4) pgFinish(m);
}

/* ---------- Debrief: rating, summary, suggestions, unlocks ---------- */
function pgResult(m) {
    // Uses the game's own debrief score (computeMissionScore) — no duplicate formula
    const sc = computeMissionScore(m);
    const finalScience = sc.finalScience, success = sc.missionSuccess, science = sc.scienceScore, efficiency = sc.efficiencyScore,
        engineering = sc.engineeringScore, synergy = sc.synergyScore, total = sc.totalMissionScore;
    const grade = !success ? (total >= 600 ? 'C' : 'D') : total >= 900 ? 'S' : total >= 750 ? 'A' : total >= 600 ? 'B' : 'C';
    return { finalScience, success, science, efficiency, engineering, synergy, total, grade };
}
function pgSuggestions(m, r) {
    const s = [];
    if (m.netWatts < 0) s.push(`Power is short by ${Math.abs(Math.round(m.netWatts))} W — add solar area or an RTG, or drop a power-hungry instrument.`);
    else if (m.netWatts < 50) s.push(`Power margin is only +${Math.round(m.netWatts)} W. Above 50 W lets you use burst-mode science during the storm.`);
    if (m.batteryMarginWh < 0) s.push(`Battery is ${Math.abs(Math.round(m.batteryMarginWh))} Wh short for the eclipse — pick a bigger battery.`);
    if (m.dataCaptureRatio < 0.85) s.push(`Only ${Math.round(m.dataCaptureRatio * 100)}% of data reached Earth — upgrade communications or carry fewer high-rate instruments.`);
    if (m.shield.radRating < m.effectiveRadLevel) s.push(`Radiation shielding is rated ${m.shield.radRating} but the environment is ${m.effectiveRadLevel} — upgrade shielding.`);
    if (m.totalCost > m.maxBudget) s.push(`Over budget by $${Math.round(m.totalCost - m.maxBudget)}M — choose a cheaper bus or rocket.`);
    else if (m.totalCost > m.maxBudget * 0.9) s.push(`Only $${Math.round(m.maxBudget - m.totalCost)}M of budget left; efficiency points rise as you spend less.`);
    if (m.totalMass > m.maxLiftCapacity) s.push(`Spacecraft is ${Math.round(m.totalMass - m.maxLiftCapacity)} kg too heavy for the rocket.`);
    if (r.finalScience < m.scenario.targetScience) s.push(`Science reached ${r.finalScience}/${m.scenario.targetScience} — add or upgrade instruments.`);
    if (m.reliability < 90) s.push(`Reliability is ${Math.round(m.reliability)}% — a sturdier bus or better shielding raises it.`);
    if (!s.length) s.push('Design is well balanced. Try an advanced challenge to push it further.');
    return s.slice(0, 4);
}
function pgFinish(m) {
    if (!pgRun || pgRun.summarized) return;
    pgRun.summarized = true;
    const r = pgResult(m), sid = m.scenario.id;
    PG.runs++;
    const prev = PG.best[sid];
    if (!prev || r.total > prev.total) PG.best[sid] = { total: r.total, grade: r.grade, success: r.success };
    pgSave();
    if (r.success) {
        pgAward('success');
        if (m.totalCost <= m.maxBudget * 0.85) pgAward('frugal');
        if (['earth_pulse', 'artemis_lunar', 'red_horizon', 'europa_clipper'].every(id => PG.best[id] && PG.best[id].success)) pgAward('tour');
    }
    if (r.grade === 'S') pgAward('ace');
    const newly = [];
    PG_CHAL.forEach(c => {
        if (!pgHas(c.need)) return;
        if (!PG.chal[c.id]) { PG.chal[c.id] = { unlocked: Date.now() }; newly.push(c); }
        else if (!PG.chal[c.id].done && c.test(m, r)) { PG.chal[c.id].done = Date.now(); pgToast('challenge', c.name, c.desc, 'ph-medal'); }
    });
    pgSave();
    newly.forEach(c => pgToast('unlock', c.name, c.desc, 'ph-lock-key-open'));
    pgSummary(m, r, prev);
}
function pgSummary(m, r, prev) {
    const box = document.getElementById('simulationModal'); if (!box) return;
    let el = document.getElementById('pgSummary');
    const host = document.getElementById('simObjectivesStrip') || document.getElementById('simPhaseStepper');
    if (!el && host) { el = document.createElement('div'); el.id = 'pgSummary'; host.parentNode.insertBefore(el, host.nextSibling); }
    if (!el) return;
    const tips = pgSuggestions(m, r);
    const cadet = state.difficulty === 'cadet';
    const disc = PG.disc[m.scenario.targetBody] || [];
    el.innerHTML = `
        <div class="pgs-grade pgs-${r.grade}"><b>${r.grade}</b><small>RATING</small></div>
        <div class="pgs-main">
            <div class="pgs-title">${r.success ? 'Mission objectives complete' : 'Mission objectives not met'} · ${opsEsc(m.scenario.name)}</div>
            <div class="pgs-row">
                <span>Science <b>${r.finalScience}/${m.scenario.targetScience}</b></span>
                <span>Score <b>${r.total}</b>${prev ? ` <em>${r.total > prev.total ? '▲ new best' : 'best ' + prev.total}</em>` : ' <em>first flight</em>'}</span>
                ${cadet ? '' : `<span>Sci ${r.science} · Eff ${r.efficiency} · Eng ${r.engineering} · Team ${r.synergy}</span>`}
                <span>Discoveries here <b>${disc.length}/${(PG_DISC[m.scenario.targetBody] || []).length}</b></span>
            </div>
            <div class="pgs-tips"><b>${cadet ? 'How to do even better' : 'Engineering improvements'}</b><ul>${tips.map(t => `<li>${opsEsc(t)}</li>`).join('')}</ul></div>
            <button class="pgs-btn" onclick="openProgressPanel()"><i class="ph-bold ph-trophy"></i> Achievements & challenges</button>
        </div>`;
}
const _pgSimRender = renderSimulationStage;
renderSimulationStage = function () {
    const r = _pgSimRender.apply(this, arguments);
    if (state.sim && state.sim.phase === 4 && pgRun && pgRun.summarized) pgSummary(computeMissionMetrics(), pgResult(computeMissionMetrics()), null);
    else { const el = document.getElementById('pgSummary'); if (el && (!state.sim || state.sim.phase < 4)) el.remove(); }
    return r;
};

/* ---------- Progress panel ---------- */
function pgBadge() {
    const b = document.getElementById('progressBtn'); if (!b) return;
    b.querySelector('span').textContent = `${Object.keys(PG.ach).length}/${PG_ACH.length}`;
}
function openProgressPanel() {
    try { SoundFX.click(); } catch (e) {}
    let g = document.getElementById('pgPanel');
    if (!g) {
        g = document.createElement('div'); g.id = 'pgPanel'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'Achievements');
        g.addEventListener('click', e => { if (e.target === g) closeProgressPanel(); });
        document.body.appendChild(g);
    }
    const ach = PG_ACH.map(a => `<div class="pgp-ach ${pgHas(a[0]) ? 'got' : ''}"><i class="ph-fill ${pgHas(a[0]) ? a[2] : 'ph-lock-simple'}"></i><div><b>${a[1]}</b><p>${opsEsc(a[3])}</p></div></div>`).join('');
    const chal = PG_CHAL.map(c => { const s = PG.chal[c.id]; const need = PG_ACH.find(a => a[0] === c.need)[1];
        return `<div class="pgp-ch ${s ? (s.done ? 'done' : 'open') : 'locked'}"><b>${s ? opsEsc(c.name) : 'Locked challenge'}</b><p>${s ? opsEsc(c.desc) : 'Unlock by earning ' + need + '.'}</p><small>${s ? (s.done ? 'COMPLETE' : 'UNLOCKED') : 'LOCKED'}</small></div>`; }).join('');
    const disc = Object.keys(PG_DISC).map(b => `<div class="pgp-d"><b>${b[0].toUpperCase() + b.slice(1)}</b>${PG_DISC[b].map(d => (PG.disc[b] || []).includes(d[0]) ? `<p><i class="ph-fill ph-sparkle"></i> <u>${opsEsc(d[0])}</u> — ${opsEsc(d[1])}</p>` : '<p class="pgp-dim"><i class="ph ph-question"></i> Undiscovered — return science from here.</p>').join('')}</div>`).join('');
    const best = SCENARIOS.map(s => { const b = PG.best[s.id]; return `<span>${opsEsc(s.name.split(' (')[0])}: <b>${b ? b.grade + ' · ' + b.total : '—'}</b></span>`; }).join('');
    g.innerHTML = `<div class="pgp-box"><div class="pgp-head"><b><i class="ph-fill ph-trophy"></i> Mission Progress</b><small>${Object.keys(PG.ach).length}/${PG_ACH.length} achievements · ${PG.runs} flights</small><button onclick="closeProgressPanel()" aria-label="Close"><i class="ph ph-x"></i></button></div>
        <div class="pgp-body"><div class="pgp-best">${best}</div><h4>Achievements</h4><div class="pgp-grid">${ach}</div><h4>Advanced challenges</h4><div class="pgp-grid">${chal}</div><h4>Science discoveries</h4><div class="pgp-grid">${disc}</div></div></div>`;
    g.classList.remove('hidden');
}
function closeProgressPanel() { const g = document.getElementById('pgPanel'); if (g) g.classList.add('hidden'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProgressPanel(); });
setTimeout(pgBadge, 0);

