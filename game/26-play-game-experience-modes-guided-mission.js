/* A.T.L.A.S · section 16H — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16H. PLAY GAME — EXPERIENCE MODES & GUIDED MISSION SELECTION
 *      Cadet / Engineer / Mission Control are interface-complexity levels on
 *      top of the SAME engine: they map onto the existing state.difficulty
 *      tiers ('cadet' | 'engineer' | 'director') and call the existing
 *      selectScenario(), changeDifficulty(), applyOptimalPreset(),
 *      switchTab() and initiateGoNoGoPoll(). No scoring formula changes.
 ***********************************************************************/
const AERO_MODES = {
    cadet: {
        name: 'CADET MODE', tag: 'Beginner · Guided', icon: 'ph-student', accent: '#34d399',
        who: 'Kids, students and first-time players',
        blurb: 'Step-by-step missions in plain language. ATLAS recommends parts and the game does the engineering maths for you.',
        points: ['Guided steps — one goal at a time', 'Recommended spacecraft parts', 'Simple Budget / Power / Science / Safety meters', 'Clear reasons for success or failure'],
        note: 'Same missions and physics · +15% starting budget (existing Cadet tier)'
    },
    engineer: {
        name: 'ENGINEER MODE', tag: 'Intermediate', icon: 'ph-wrench', accent: '#38bdf8',
        who: 'Players curious about how spacecraft are designed',
        blurb: 'Choose parts, power, batteries, instruments, radios and orbits yourself — every number comes with a short explanation.',
        points: ['Full component selection', 'Mass, power and budget trade-offs', 'Orbit parameters', 'Optional ATLAS recommendations'],
        note: 'Standard budget (existing Flight Engineer tier)'
    },
    director: {
        name: 'MISSION CONTROL MODE', tag: 'Advanced · Professional', icon: 'ph-broadcast', accent: '#f59e0b',
        who: 'Space enthusiasts who want the whole console',
        blurb: 'The complete A.T.L.A.S NASA-style console: full telemetry, diagnostics, downlink, crew coordination and strict GO/NO-GO.',
        points: ['Full telemetry dashboard & diagnostics', 'Detailed power, mass and data budgets', 'Crew coordination & 4-player seats', 'Strict GO/NO-GO readiness'],
        note: 'Tighter budget, strict reviews (existing Director tier)'
    }
};
// Plain-language mission cards (data comes from the existing SCENARIOS entries)
const AERO_MISSION_CARDS = {
    earth_pulse: { dest: 'Earth orbit', plain: 'Build a spacecraft that watches Earth from space and tracks changes in ice, forests and oceans.',
        objective: 'Climate & environmental observation', challenge: 'Fit radar and cameras inside a small budget', outcome: 'Global maps of melting ice and changing land', level: 1 },
    artemis_lunar: { dest: 'The Moon — south pole', plain: 'Orbit the Moon over its south pole and find frozen water hidden in dark craters where future astronauts may land.',
        objective: 'Lunar exploration & resource mapping', challenge: 'Long lunar nights and very cold, dark craters', outcome: 'Maps of water-ice and safe landing sites', level: 2 },
    red_horizon: { dest: 'Mars orbit', plain: 'Travel to Mars and study its thin air and the ice buried under its surface.',
        objective: 'Mars atmosphere & geology research', challenge: 'Weaker sunlight and a long-distance radio link', outcome: 'Data on Martian air and hidden glaciers', level: 3 },
    europa_clipper: { dest: 'Europa — moon of Jupiter', plain: 'Survive Jupiter’s strong radiation to check whether an ocean hides beneath Europa’s icy shell.',
        objective: 'Ocean-world exploration', challenge: 'Extreme radiation and very weak sunlight', outcome: 'Evidence about Europa’s hidden ocean', level: 4 }
};
const AERO_BODY_TINT = { earth: ['#1d4ed8', '#22c55e', '#e0f2fe'], moon: ['#6b7280', '#d1d5db', '#4b5563'], mars: ['#9a3412', '#ea580c', '#fde68a'], europa: ['#d6d3d1', '#a16207', '#f5f5f4'] };
const GM = { step: 'mode', mode: null, mission: null, shownOnce: false };

function aeroDestinationThumb(canvas, body) {
    const ctx = canvas.getContext('2d'), S = canvas.width, r = S * 0.44, cx = S / 2, cy = S / 2;
    ctx.clearRect(0, 0, S, S);
    let src = null;
    try { if (body !== 'earth' && typeof aeroCanvasRecipeTexture === 'function' && AERO_RECIPES[body]) src = aeroCanvasRecipeCanvas(body); } catch (e) { src = null; }
    const img = ctx.createImageData(S, S), sd = src ? src.getContext('2d').getImageData(0, 0, src.width, src.height).data : null;
    const tint = AERO_BODY_TINT[body] || AERO_BODY_TINT.moon;
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const tA = hex(tint[0]), tB = hex(tint[1]);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const nx = (x - cx) / r, ny = (cy - y) / r, d2 = nx * nx + ny * ny;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const lat = Math.asin(ny), lon = Math.atan2(nx, nz) + 0.4;
        let c;
        if (sd) {
            const u = Math.floor(((lon / (2 * Math.PI) + 0.5) % 1 + 1) % 1 * src.width), v = Math.floor((0.5 - lat / Math.PI) * (src.height - 1));
            const o = (v * src.width + u) * 4; c = [sd[o], sd[o + 1], sd[o + 2]];
        } else {
            const n = aeroNoise3(nx * 3, ny * 3, nz * 3) * 0.5 + aeroNoise3(nx * 7, ny * 7, nz * 7) * 0.25;
            c = n > 0.08 ? tB : tA;
            if (Math.abs(ny) > 0.86) c = [235, 240, 245];
        }
        const light = Math.max(0.05, 0.25 + 0.85 * (nx * -0.55 + ny * 0.35 + nz * 0.76));
        const o = (y * S + x) * 4;
        img.data[o] = Math.min(255, c[0] * light); img.data[o + 1] = Math.min(255, c[1] * light); img.data[o + 2] = Math.min(255, c[2] * light); img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    if (body === 'earth' || body === 'mars') {
        const g = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.12);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, body === 'earth' ? 'rgba(96,165,250,.45)' : 'rgba(251,146,60,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2); ctx.fill();
    }
}

function openMissionLauncher(step) {
    const el = document.getElementById('missionLauncherOverlay');
    if (!el) return;
    GM.step = step || (GM.mode ? 'mission' : 'mode');
    el.classList.remove('hidden');
    renderMissionLauncher();
}
function closeMissionLauncher() {
    const el = document.getElementById('missionLauncherOverlay');
    if (el) el.classList.add('hidden');
}
function chooseExperienceMode(mode) {
    SoundFX.click();
    GM.mode = mode;
    GM.step = 'mission';
    GM.mission = GM.mission || state.activeScenarioId;
    renderMissionLauncher();
}
function chooseLauncherMission(id) {
    SoundFX.click();
    GM.mission = id;
    renderMissionLauncher();
}
function startGuidedMission() {
    if (!GM.mode || !GM.mission) return;
    changeDifficulty(GM.mode);                 // existing tier → same scoring formulas as before
    const sel = document.getElementById('difficultySelect');
    if (sel) sel.value = GM.mode;
    // Same mission → keep the spacecraft, orbit and flight progress; only a different mission resets to its preset
    if (GM.mission !== state.activeScenarioId) selectScenario(GM.mission);
    applyExperienceMode(GM.mode);
    closeMissionLauncher();
    switchTab('directive');
    if (GM.mode === 'cadet') {
        nexiState.lastCustomAnswer = `Welcome, Cadet! Your mission: ${AERO_MISSION_CARDS[GM.mission].plain} Follow the green steps at the top — I’ll explain everything as we go.`;
        updateNexiContextualGuidance();
    }
}
function applyExperienceMode(mode) {
    document.body.classList.remove('xp-cadet', 'xp-engineer', 'xp-director');
    document.body.classList.add('xp-' + mode);
    renderCadetGuide();
    const badge = document.getElementById('xpModeBadge');
    if (badge) { badge.textContent = AERO_MODES[mode].name; badge.style.color = AERO_MODES[mode].accent; badge.style.borderColor = AERO_MODES[mode].accent + '66'; }
    setTimeout(() => { try { resizeThreeViewport(); } catch (e) { /* viewport not ready */ } }, 40);
}

function renderMissionLauncher() {
    const el = document.getElementById('missionLauncherBody');
    if (!el) return;
    const steps = `<div class="ml-steps"><span class="${GM.step === 'mode' ? 'is-on' : 'is-done'}">1 · Choose your experience</span><i class="ph ph-caret-right"></i><span class="${GM.step === 'mission' ? 'is-on' : ''}">2 · Select your mission</span><i class="ph ph-caret-right"></i><span>3 · Build &amp; launch</span></div>`;
    if (GM.step === 'mode') {
        el.innerHTML = steps + `<h2 class="ml-title">How do you want to play?</h2><p class="ml-sub">All three use the same missions, spacecraft and physics — only the amount of detail on screen changes. You can switch later.</p>
        <div class="ml-grid ml-grid-3">${Object.entries(AERO_MODES).map(([k, m]) => `
            <button class="ml-card ${GM.mode === k ? 'is-sel' : ''}" style="--acc:${m.accent}" onclick="chooseExperienceMode('${k}')">
                <div class="ml-card-top"><span class="ml-icon"><i class="ph-fill ${m.icon}"></i></span><span class="ml-tag">${m.tag}</span></div>
                <div class="ml-name">${m.name}</div>
                <div class="ml-who">${m.who}</div>
                <p class="ml-blurb">${m.blurb}</p>
                <ul class="ml-list">${m.points.map(p => `<li><i class="ph-bold ph-check"></i>${p}</li>`).join('')}</ul>
                <div class="ml-note">${m.note}</div>
                <span class="ml-cta">Choose ${m.name.replace(' MODE', '').toLowerCase()} <i class="ph-bold ph-arrow-right"></i></span>
            </button>`).join('')}</div>`;
        return;
    }
    const sel = GM.mission;
    el.innerHTML = steps + `<div class="ml-head-row"><div><h2 class="ml-title">Select your mission</h2><p class="ml-sub">Playing as <b style="color:${AERO_MODES[GM.mode].accent}">${AERO_MODES[GM.mode].name}</b> · <button class="underline" onclick="openMissionLauncher('mode')">change</button></p></div></div>
        <div class="ml-grid ml-grid-4">${SCENARIOS.map(sc => {
            const c = AERO_MISSION_CARDS[sc.id] || { dest: sc.targetBody, plain: sc.desc, objective: sc.badge, challenge: '—', outcome: '—', level: 2 };
            const budget = Math.round(sc.budget * (GM.mode === 'cadet' ? 1.15 : (GM.mode === 'director' ? 0.9 : 1)));
            return `<button class="ml-card ml-mission ${sel === sc.id ? 'is-sel' : ''}" style="--acc:#22d3ee" onclick="chooseLauncherMission('${sc.id}')">
                <canvas class="ml-globe" width="132" height="132" data-body="${sc.targetBody}"></canvas>
                <div class="ml-badge">${opsEsc(sc.badge)}</div>
                <div class="ml-name">${opsEsc(sc.name)}</div>
                <div class="ml-dest"><i class="ph-fill ph-map-pin"></i>${opsEsc(c.dest)}</div>
                <p class="ml-blurb">${opsEsc(c.plain)}</p>
                <dl class="ml-facts">
                    <dt>Goal</dt><dd>${opsEsc(c.objective)}</dd>
                    <dt>Difficulty</dt><dd>${'★'.repeat(c.level)}<span class="ml-dim">${'★'.repeat(4 - c.level)}</span></dd>
                    <dt>Budget</dt><dd>$${budget}M</dd>
                    <dt>Main challenge</dt><dd>${opsEsc(c.challenge)}</dd>
                    <dt>Expected result</dt><dd>${opsEsc(c.outcome)}</dd>
                </dl>
            </button>`;
        }).join('')}</div>
        <div class="ml-foot"><button class="ml-back" onclick="openMissionLauncher('mode')"><i class="ph-bold ph-arrow-left"></i> Back</button>
            <button class="ml-go" ${sel ? '' : 'disabled'} onclick="startGuidedMission()">Start mission <i class="ph-bold ph-rocket-launch"></i></button></div>`;
    el.querySelectorAll('canvas.ml-globe').forEach(cv => { try { aeroDestinationThumb(cv, cv.dataset.body); } catch (e) { /* thumbnail is decorative */ } });
}

/* ---------- Cadet guide: one objective at a time, plain words, existing actions ---------- */
function cadetMeters() {
    let m = null;
    try { m = computeMissionMetrics(); } catch (e) { return null; }
    const pct = (a, b) => Math.max(0, Math.min(100, Math.round(a / Math.max(1e-6, b) * 100)));
    return {
        budget: { v: pct(m.maxBudget - m.totalCost, m.maxBudget), ok: m.totalCost <= m.maxBudget, txt: m.totalCost <= m.maxBudget ? `$${Math.round(m.maxBudget - m.totalCost)}M left` : `Over by $${Math.round(m.totalCost - m.maxBudget)}M` },
        power: { v: pct(m.generatedWatts, m.totalWattsRequired), ok: m.netWatts >= 0, txt: m.netWatts >= 0 ? 'Enough electricity' : 'Not enough electricity' },
        science: { v: pct(m.effectiveScience, m.scenario.targetScience), ok: m.effectiveScience >= m.scenario.targetScience, txt: m.effectiveScience >= m.scenario.targetScience ? 'Science goal reached' : 'Needs more science' },
        safety: (() => { const r = (typeof aeroReadiness === 'function') ? aeroReadiness(m) : null; const ok = r ? r.go : !(Number(m.hardFailures) > 0); const n = r ? r.bad : Number(m.hardFailures); return { v: Math.round(m.reliability), ok, txt: ok ? 'Safe to fly' : `${n} problem${n > 1 ? 's' : ''} to fix` }; })(),
        m
    };
}
const CADET_STEPS = [
    { id: 'mission', title: 'Mission chosen', plain: 'You picked where to go.', action: "openMissionLauncher('mission')", btn: 'Change mission' },
    { id: 'build', title: 'Build your spacecraft', plain: 'Every spacecraft needs a body, electricity, a radio and science tools. Open the builder and choose each part — ATLAS marks a suggestion with a star. In a hurry? “Use ATLAS’s full design” fills in a launch-ready spacecraft.', action: 'cadetUseRecommended()', btn: 'Use ATLAS’s recommended parts' },
    { id: 'power', title: 'Check the electricity', plain: 'Solar panels collect sunlight and turn it into electricity. Far from the Sun there is less light, so bigger panels or a nuclear generator may be needed.', action: "switchTab('bus')", btn: 'Look at power parts', tech: 'Technical: EPS power balance (generated W − required W)' },
    { id: 'orbit', title: 'Choose the orbit', plain: 'The orbit is the path your spacecraft follows around the planet. A path over the poles lets you see the whole surface.', action: "switchTab('orbit')", btn: 'See the orbit', tech: 'Technical: periapsis / apoapsis / inclination' },
    { id: 'launch', title: 'Ready? Launch!', plain: 'Mission Control asks every team “GO or NO-GO?”. If all the meters are green, you are ready.', action: 'initiateGoNoGoPoll()', btn: 'Start GO/NO-GO launch check' }
];
let cadetStepIdx = 1;
function cadetUseRecommended() {
    if (!applyNexiPlan()) applyOptimalPreset();
    cadetStepIdx = Math.max(cadetStepIdx, 2);
    nexiState.lastCustomAnswer = 'Done! I picked a complete design that passes every launch check for this mission. Open the builder to see why each part was chosen — you can still change anything. Next, check the electricity meter.';
    updateNexiContextualGuidance();
    renderCadetGuide();
}
function cadetGo(i) { SoundFX.click(); cadetStepIdx = Math.max(0, Math.min(CADET_STEPS.length - 1, i)); renderCadetGuide(); }
function renderCadetGuide() {
    const el = document.getElementById('cadetGuideBar');
    if (!el) return;
    const on = document.body.classList.contains('xp-cadet');
    el.classList.toggle('hidden', !on);
    if (!on) return;
    const meters = cadetMeters();
    const st = CADET_STEPS[cadetStepIdx];
    const sc = SCENARIOS.find(s => s.id === state.activeScenarioId);
    const meter = (k, label, icon) => {
        if (!meters) return '';
        const x = meters[k];
        return `<div class="cg-meter ${x.ok ? 'ok' : 'bad'}" title="${opsEsc(x.txt)}"><i class="ph-fill ${icon}"></i><span>${label}</span><b>${x.ok ? '✓' : '!'}</b><small>${opsEsc(x.txt)}</small></div>`;
    };
    el.innerHTML = `<div class="cg-row">
            <div class="cg-steps">${CADET_STEPS.map((s, i) => `<button class="cg-step ${i < cadetStepIdx ? 'done' : ''} ${i === cadetStepIdx ? 'now' : ''}" onclick="cadetGo(${i})"><span>${i < cadetStepIdx ? '✓' : i + 1}</span>${s.title}</button>`).join('')}</div>
            <div class="cg-meters">${meter('budget', 'Budget', 'ph-coins')}${meter('power', 'Power', 'ph-lightning')}${meter('science', 'Science', 'ph-flask')}${meter('safety', 'Safety', 'ph-shield-check')}</div>
        </div>
        <div class="cg-now"><div><b>Step ${cadetStepIdx + 1}: ${st.title}</b> — ${st.plain}${st.tech ? `<small>${st.tech}</small>` : ''}${sc ? `<small>Mission: ${opsEsc(sc.name)}</small>` : ''}</div>
            <div class="cg-actions"><button class="cg-btn" onclick="${st.action}">${st.btn}</button>${st.action2 ? `<button class="cg-next" onclick="${st.action2}">${st.btn2}</button>` : ''}${cadetStepIdx < CADET_STEPS.length - 1 ? `<button class="cg-next" onclick="cadetGo(${cadetStepIdx + 1})">Next step <i class="ph-bold ph-arrow-right"></i></button>` : ''}</div></div>`;
}
const _xpRenderAllUI = renderAllUI;
renderAllUI = function () {
    _xpRenderAllUI.apply(this, arguments);
    if (document.body.classList.contains('xp-cadet')) { try { renderCadetGuide(); } catch (e) { aeroReportError('cadet guide', e); } }
};
// Show the launcher when entering PLAY GAME (first time each session) — skippable via the header button
const _xpSwitch = switchAppExperience;
switchAppExperience = function (targetMode) {
    _xpSwitch(targetMode);
    if (targetMode === 'game') {
        if (!GM.shownOnce) { GM.shownOnce = true; GM.mode = null; openMissionLauncher('mode'); }
        if (!document.body.className.match(/xp-/)) applyExperienceMode(state.difficulty || 'engineer');
    } else closeMissionLauncher();
};

// Keep the interface mode in step with the shared difficulty (e.g. when a crew-mate changes it over room sync),
// so the UI never shows one mode while the mission runs under another.
const _xpSyncRender = renderAllUI;
renderAllUI = function () {
    _xpSyncRender.apply(this, arguments);
    if (appExperienceMode === 'game' && AERO_MODES[state.difficulty] && !document.body.classList.contains('xp-' + state.difficulty)) {
        applyExperienceMode(state.difficulty);
        const sel = document.getElementById('difficultySelect'); if (sel) sel.value = state.difficulty;
    }
};

