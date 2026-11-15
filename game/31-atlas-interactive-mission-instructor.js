/* A.T.L.A.S · section 16M — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16M. ATLAS — INTERACTIVE MISSION INSTRUCTOR
 *      Event-driven lessons on top of the existing ATLAS panel.
 *      Every number ATLAS quotes is read from computeMissionMetrics() /
 *      aeroReadiness(); ATLAS never changes the design by itself.
 *      Tone adapts to Cadet / Engineer / Mission Control.
 ***********************************************************************/
const NX = { last: null, prevGo: null, prevBad: null, hintLevel: 0, lessonKey: null, muted: false };
const nxMode = () => state.difficulty === 'director' ? 'director' : (state.difficulty === 'cadet' ? 'cadet' : 'engineer');
const nxPick = (o) => o[nxMode()] || o.engineer || o.cadet;
const nxFmt = n => Math.round(n).toLocaleString('en-US');

/* ---------- Glossary (capability 1) ---------- */
const NX_GLOSSARY = {
    'solar panel': { k: ['solar', 'panel', 'array', 'rosa', 'gaas'], cadet: 'Solar panels are like big flat leaves: they catch sunlight and turn it into electricity.', engineer: 'Photovoltaic arrays convert sunlight to electricity. Output scales with sunlight, which falls with the square of distance from the Sun.', director: 'PV array output ∝ solar flux (1/r²); size EPS for end-of-life power at destination flux, including eclipse recharge.', visual: 'solar' },
    'rtg': { k: ['rtg', 'mmrtg', 'nuclear', 'radioisotope', 'plutonium'], cadet: 'A radioisotope generator makes steady electricity from the warmth of a tiny amount of radioactive material — day or night, near or far from the Sun.', engineer: 'An MMRTG converts decay heat from plutonium-238 into ~110 W electric with thermocouples; output is independent of sunlight.', director: 'MMRTG: Pu-238 thermoelectric source, flux-independent bus power; mass/cost penalty vs. PV, slow output decay.', visual: 'rtg' },
    'battery': { k: ['battery', 'eclipse', 'shadow', 'wh'], cadet: 'The battery saves electricity for when the spacecraft is in the planet’s shadow and the solar panels can’t see the Sun.', engineer: 'Battery capacity (Wh) must cover the load during eclipse. This game estimates eclipse energy from load × eclipse fraction.', director: 'Size depth-of-discharge for worst-case umbra duration; this model compares eclipse energy demand against effective capacity.', visual: 'battery' },
    'orbit': { k: ['orbit', 'orbital'], cadet: 'An orbit is the path a spacecraft follows as it falls around a planet — always falling, but moving sideways fast enough to keep missing it!', engineer: 'An orbit is a free-fall trajectory set by gravity; its shape is defined by periapsis, apoapsis and inclination.', director: 'Keplerian orbit defined by a, e, i (plus Ω, ω, ν); period from T = 2π√(a³/μ).', visual: 'orbit' },
    'periapsis': { k: ['periapsis', 'perigee', 'lowest point'], cadet: 'Periapsis is the lowest point of the orbit — where the spacecraft passes closest to the planet.', engineer: 'Periapsis: minimum orbital altitude. Lower periapsis = sharper science, but more drag or radiation near some planets.', director: 'Periapsis altitude r_p − R; drives resolution, drag (LEO) and eclipse geometry.', visual: 'orbit' },
    'apoapsis': { k: ['apoapsis', 'apogee', 'highest point'], cadet: 'Apoapsis is the highest point of the orbit — the farthest the spacecraft gets from the planet.', engineer: 'Apoapsis: maximum orbital altitude. A bigger gap between periapsis and apoapsis makes a more stretched (eccentric) orbit.', director: 'Apoapsis altitude r_a − R; with r_p sets e = (r_a − r_p)/(r_a + r_p).', visual: 'orbit' },
    'inclination': { k: ['inclination', 'tilt', 'polar orbit'], cadet: 'Inclination is how tilted the orbit is. About 90° means the spacecraft flies over the North and South Poles.', engineer: 'Inclination is the angle between the orbit and the equator; ~90° (polar) lets the ground track cover the whole planet.', director: 'i sets ground-track latitude coverage (±i); SSO requires i ≈ 97–99° at LEO altitudes.', visual: 'orbit' },
    'delta-v': { k: ['delta-v', 'delta v', 'δv', 'dv'], cadet: 'Delta-v is how much “speed change” the rocket must give your spacecraft to get where it’s going. Farther places need more.', engineer: 'Δv (km/s) is the total velocity change needed; it drives how much the rocket can lift to your orbit.', director: 'Mission Δv budget sets payload capacity via the rocket equation; this model derates lift capacity with Δv.' },
    'dsn': { k: ['dsn', 'downlink', 'bandwidth', 'deep space network', 'radio', 'antenna', 'gbps'], cadet: 'The Deep Space Network is a set of giant antennas on Earth that listen to spacecraft. Your radio must be fast enough to send all your science home.', engineer: 'DSN downlink rate falls with distance; if instruments make more data than the link can send, the extra science is lost.', director: 'Link budget: effective downlink = base rate × distance penalty; data-capture ratio gates the SCIENCE poll (≥85%).', visual: 'radio' },
    'radiation': { k: ['radiation', 'shield', 'vault', 'rad'], cadet: 'Space has invisible radiation that can damage electronics. Jupiter has the strongest — your spacecraft needs armour there.', engineer: 'Radiation level must not exceed the spacecraft’s protection rating, or reliability drops 18% per level short.', director: 'TID/SEE environment: GNC poll requires shield radRating ≥ orbit radiation level; deficit costs 18% reliability per level.', visual: 'radiation' },
    'fairing': { k: ['fairing', 'nose cone'], cadet: 'The fairing is the rocket’s nose cone. It protects the spacecraft from the air, then splits open once the air is too thin to matter.', engineer: 'The payload fairing shields the spacecraft through max dynamic pressure; it’s jettisoned above ~100 km to save mass.', director: 'PLF jettison after aero-heating drops below threshold (~100–115 km on a typical ascent).' },
    'max-q': { k: ['max-q', 'max q', 'maxq'], cadet: 'Max-Q is the bumpiest moment of launch, when the air pushes hardest on the rocket.', engineer: 'Max-Q is the point of maximum aerodynamic pressure, typically ~1 minute after liftoff at ~12 km.', director: 'Peak dynamic pressure q = ½ρv²; engines often throttle down through it.' },
    'readiness': { k: ['readiness', 'go/no-go', 'go no go', 'no-go'], cadet: 'GO means every team says the spacecraft is safe and ready. NO-GO means something must be fixed first.', engineer: 'GO requires every poll station to pass: power & battery, radiation, destination, data & science, mass & budget.', director: 'Five-station poll: EECOM, GNC, FIDO, SCIENCE, FLIGHT/PAD — any NO-GO holds the launch.' },
    'reliability': { k: ['reliability', 'assurance'], cadet: 'Reliability is how likely the spacecraft is to keep working. Higher is safer.', engineer: 'Engineering assurance = average of bus and rocket reliability, plus shielding bonus, minus radiation penalties.', director: 'Reliability model: mean(bus, LV) + shield bonus − 18%/radiation level deficit.' },
    'spectrometer': { k: ['spectrometer', 'hyperspectral', 'mass spec'], cadet: 'A spectrometer splits light (or gas) into its parts — like a rainbow — to find out what things are made of.', engineer: 'Spectrometers measure intensity vs. wavelength (or mass) to identify minerals, ices and gases.', director: 'Imaging spectrometers / mass spectrometers: compositional mapping and in-situ species identification.' },
    'magnetometer': { k: ['magnetometer', 'magnetic'], cadet: 'A magnetometer is a super-sensitive compass that measures magnetic fields.', engineer: 'Magnetometers measure field strength and direction; induced fields at Europa revealed a salty subsurface ocean.', director: 'Fluxgate/vector magnetometer on a boom; induction response constrains ocean conductivity and depth.' }
};
function nxGlossaryFor(q) {
    q = (q || '').toLowerCase();
    const esc = k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const [term, g] of Object.entries(NX_GLOSSARY)) if (g.k.some(k => new RegExp('(^|[^a-z])' + esc(k) + '($|[^a-z])').test(q))) return [term, g];
    return null;
}

/* ---------- Small visual explainers ---------- */
const NX_VISUAL = {
    solar: '<svg viewBox="0 0 220 70"><circle cx="22" cy="22" r="14" fill="#fbbf24"/>' + [0, 1, 2].map(i => `<line x1="40" y1="${16 + i * 7}" x2="95" y2="${30 + i * 7}" stroke="#fde68a" stroke-width="1.5" stroke-dasharray="4 3"/>`).join('') + '<rect x="98" y="26" width="46" height="26" fill="#0ea5e9" stroke="#0c4a6e"/><line x1="121" y1="26" x2="121" y2="52" stroke="#0c4a6e"/><path d="M146 39 L170 39" stroke="#22d3ee" stroke-width="2"/><text x="174" y="43" fill="#67e8f9" font-size="10">⚡ power</text><text x="96" y="66" fill="#94a3b8" font-size="9">sunlight → electricity</text></svg>',
    rtg: '<svg viewBox="0 0 220 70"><rect x="30" y="12" width="24" height="46" rx="4" fill="#334155"/>' + [0, 1, 2, 3].map(i => `<rect x="22" y="${17 + i * 10}" width="40" height="3" fill="#f97316"/>`).join('') + '<text x="74" y="30" fill="#fdba74" font-size="10">heat from decay</text><text x="74" y="46" fill="#67e8f9" font-size="10">→ steady electricity, day &amp; night</text></svg>',
    battery: '<svg viewBox="0 0 220 70"><circle cx="40" cy="35" r="20" fill="#2563eb"/><path d="M40 15 A20 20 0 0 1 40 55 Z" fill="#0f172a" opacity=".85"/><circle cx="96" cy="35" r="30" fill="none" stroke="#38bdf8" stroke-dasharray="3 3"/><path d="M60 35 A36 36 0 0 0 96 5" fill="none" stroke="#475569" stroke-width="6" opacity=".6"/><rect x="150" y="22" width="34" height="22" rx="3" fill="none" stroke="#22c55e" stroke-width="2"/><rect x="153" y="25" width="20" height="16" fill="#22c55e"/><text x="140" y="62" fill="#94a3b8" font-size="9">battery covers the shadow</text></svg>',
    radio: '<svg viewBox="0 0 220 70"><circle cx="24" cy="50" r="16" fill="#2563eb"/><path d="M18 34 Q24 26 30 34" fill="none" stroke="#cbd5e1" stroke-width="2"/>' + [0, 1, 2].map(i => `<path d="M${50 + i * 18} 40 Q${58 + i * 18} 30 ${66 + i * 18} 40" fill="none" stroke="#22d3ee" stroke-width="1.5"/>`).join('') + '<rect x="160" y="18" width="26" height="18" fill="#f59e0b"/><text x="120" y="64" fill="#94a3b8" font-size="9">data travels home by radio</text></svg>',
    orbit: '<svg viewBox="0 0 220 70"><circle cx="70" cy="35" r="18" fill="#2563eb"/><ellipse cx="80" cy="35" rx="52" ry="26" fill="none" stroke="#38bdf8" stroke-dasharray="4 3"/><circle cx="32" cy="35" r="3" fill="#f59e0b"/><circle cx="132" cy="35" r="3" fill="#f59e0b"/><text x="10" y="64" fill="#94a3b8" font-size="9">periapsis</text><text x="118" y="64" fill="#94a3b8" font-size="9">apoapsis</text></svg>',
    radiation: '<svg viewBox="0 0 220 70"><circle cx="40" cy="35" r="22" fill="#d97706"/>' + [0, 1, 2].map(i => `<ellipse cx="40" cy="35" rx="${34 + i * 10}" ry="${12 + i * 4}" fill="none" stroke="#f43f5e" opacity="${0.6 - i * 0.15}"/>`).join('') + '<rect x="150" y="20" width="30" height="30" rx="4" fill="#334155" stroke="#94a3b8" stroke-width="3"/><text x="132" y="64" fill="#94a3b8" font-size="9">armour protects electronics</text></svg>'
};

/* ---------- Lesson card in the ATLAS panel ---------- */
function nxShow(lesson) {
    if (!nexiState.enabled || nexiState.tutorialActive) return;
    NX.lessonKey = lesson.key || null;
    let el = document.getElementById('nexiLessonCard');
    const speech = document.getElementById('nexiSpeechText');
    if (!el && speech) { el = document.createElement('div'); el.id = 'nexiLessonCard'; speech.parentNode.insertBefore(el, speech); }
    if (!el) return;
    el.className = 'nx-card ' + (lesson.tone || '');
    el.innerHTML = `${lesson.title ? `<div class="nx-title">${lesson.icon ? `<i class="ph-fill ${lesson.icon}"></i>` : ''}${opsEsc(lesson.title)}</div>` : ''}
        <p>${opsEsc(lesson.text)}</p>${lesson.visual && NX_VISUAL[lesson.visual] ? `<div class="nx-visual">${NX_VISUAL[lesson.visual]}</div>` : ''}
        ${lesson.choices && lesson.choices.length ? `<div class="nx-choices">${lesson.choices.map(c => `<button onclick="${c[1]}">${opsEsc(c[0])}</button>`).join('')}</div>` : ''}`;
    nexiState.lastCustomAnswer = lesson.text;
    if (speech) speech.style.display = 'none';   // the lesson card replaces the plain speech line
    if (nexiState.minimized) {
        const mini = document.getElementById('nexiMiniSubtext'); if (mini) mini.textContent = lesson.text;
        // Cadets get ATLAS opened for the big moments; other modes keep it where the player left it
        if (nxMode() === 'cadet' && /^(welcome|step-|go$|win$|fail$)/.test(lesson.key || '') && typeof maximizeNexiPanel === 'function') maximizeNexiPanel();
    }
}
function nxDismiss() { const el = document.getElementById('nexiLessonCard'); if (el) el.remove(); NX.lessonKey = null; const sp = document.getElementById('nexiSpeechText'); if (sp) sp.style.display = ''; }

/* ---------- Mission welcome ---------- */
function nxWelcome() {
    const sc = SCENARIOS.find(s => s.id === state.activeScenarioId);
    const card = AERO_MISSION_CARDS[sc.id] || {};
    const subj = { earth: 'a satellite to study Earth', moon: 'a lunar orbiter to explore the Moon’s south pole', mars: 'an orbiter to study Mars', europa: 'a spacecraft to investigate Europa’s hidden ocean' }[sc.targetBody];
    nxShow({ key: 'welcome', icon: 'ph-hand-waving', title: (() => { const cs = (playerCrewState.soloProfile && playerCrewState.soloProfile.callsign) || ''; return /^cmdr/i.test(cs) ? `Welcome, ${cs}!` : `Welcome, Commander${cs ? ' ' + cs : ''}!`; })(),
        text: nxPick({ cadet: `Today we’re building ${subj}. ${card.plain || ''} I’ll guide you one step at a time.`,
            engineer: `Today we’re building ${subj}. Goal: ${sc.targetScience} science points within $${nxFmt(computeMissionMetrics().maxBudget)}M. I’ll flag trade-offs as you go.`,
            director: `Flight, mission ${sc.name}: science requirement ${sc.targetScience} pts, downlink ≥ ${sc.minDownlink} Gbps, radiation level ${sc.requiredRadiation}. Standing by.` }),
        choices: [['Start building', 'openSpacecraftBuilder(0)'], ['What should I do first?', 'nxHint()']] });
}

/* ---------- Component lessons by builder step (capability 2) ---------- */
const NX_STEP = {
    chassis: { v: null, cadet: 'The body holds everything together. Bigger bodies fit more science instruments but cost and weigh more.', engineer: 'Bus choice sets instrument slots, base mass and reliability. Pick the smallest bus that fits your payload plan.', director: 'Select bus for payload accommodation, mass budget and heritage reliability.' },
    power: { v: 'solar', cadet: 'Your spacecraft needs electricity to operate. Solar panels collect sunlight and convert it into electrical energy.', engineer: 'Power must exceed the total load. Solar output here is scaled by local sunlight; an RTG is constant.', director: 'Size EPS for destination flux; verify positive margin and eclipse recharge.' },
    battery: { v: 'battery', cadet: 'Part of every orbit is in the planet’s shadow. The battery keeps everything running until the Sun comes back.', engineer: 'Battery must cover eclipse energy (load × eclipse fraction). Bigger cells add mass and cost.', director: 'Verify eclipse energy demand vs. effective capacity; EECOM poll requires a positive margin.' },
    comms: { v: 'radio', cadet: 'Your radio sends science back to Earth. The farther away you are, the slower it gets.', engineer: 'Downlink falls with distance. Aim for at least 85–95% of generated data to reach Earth.', director: 'Close the link budget: data-capture ratio ≥ 0.85 for SCIENCE GO.' },
    propulsion: { v: null, cadet: 'Thrusters push the spacecraft to steer it and to slow down into orbit at your destination.', engineer: 'In this simulation propulsion is combined with thermal/radiation control; deep-space options add propellant tanks.', director: 'Propulsion and thermal are a combined subsystem in this model (shield field).' },
    thermal: { v: 'radiation', cadet: 'Space is very hot in sunlight and very cold in shadow. This keeps electronics comfortable — and protects them from radiation.', engineer: 'Protection rating must meet the orbit’s radiation level; each level short costs 18% reliability.', director: 'GNC poll: radRating ≥ orbit radiation level.' },
    payloads: { v: null, cadet: 'Instruments are your science tools. Look for the green “great fit” badge — those work best at your destination.', engineer: 'Matching instruments get ×1.35 science, others ×0.85. Watch power and data rate.', director: 'Payload selection: destination synergy ×1.35/×0.85, power draw, data volume vs. link.' },
    orbit: { v: 'orbit', cadet: 'Now choose the path around your destination. The star marks the orbit your mission recommends.', engineer: 'Orbit sets Δv, eclipse time, radiation and a science multiplier. Adjust periapsis, apoapsis and inclination below.', director: 'Select regime; verify Δv-derated lift, eclipse fraction and radiation environment.' },
    ready: { v: null, cadet: 'Final check! Red items must be fixed before launch. Tap “Go to …” on any red item to fix it.', engineer: 'All five poll rules must pass. Yellow cautions still allow launch.', director: 'Readiness mirrors the five-station poll; resolve all NO-GO items.' }
};
const _nxBuildGo = buildGo;
buildGo = function (i) {
    _nxBuildGo(i);
    const st = BUILD_STEPS[BUILD.step], L = NX_STEP[st.id];
    if (!L || nxMode() === 'director' && st.id !== 'ready') return;
    const term = { power: 'solar power', battery: 'batteries', comms: 'radio links', orbit: 'orbits', thermal: 'radiation' }[st.id];
    nxShow({ key: 'step-' + st.id, icon: 'ph-chalkboard-teacher', title: st.title, text: nxPick(L), visual: L.v,
        choices: [term ? [`Learn more about ${term}`, `nxLearn('${st.id}')`] : null, ['Give me a hint', 'nxHint()'], ['Continue building', 'nxDismiss()']].filter(Boolean) });
};
function nxLearn(stepId) {
    SoundFX.click();
    const map = { power: 'solar panel', battery: 'battery', comms: 'dsn', orbit: 'orbit', thermal: 'radiation' };
    let term = map[stepId];
    if (stepId === 'power' && state.power === 'mmrtg') term = 'rtg';
    const g = NX_GLOSSARY[term];
    const m = computeMissionMetrics();
    const live = {
        power: `Right now you make ${nxFmt(m.generatedWatts)} W and need ${nxFmt(m.totalWattsRequired)} W.`,
        battery: `Right now: ${nxFmt(m.effectiveBatteryWh)} Wh stored, ${nxFmt(m.eclipseEnergyReqWh)} Wh needed in shadow.`,
        comms: `Right now ${Math.round(m.dataCaptureRatio * 100)}% of your data reaches Earth (${m.effectiveDownlinkGbps} of ${m.dataGeneratedGbps} Gbps).`,
        orbit: `Your orbit: ${m.pe} × ${m.ap} km at ${state.inclinationDeg}°.`,
        thermal: `Radiation here: level ${m.effectiveRadLevel}; your protection: level ${m.shield.radRating}.`
    }[stepId] || '';
    nxShow({ key: 'learn-' + stepId, icon: 'ph-book-open', title: term.charAt(0).toUpperCase() + term.slice(1), text: `${nxPick(g)} ${live}`, visual: g.visual,
        choices: [['Give me a hint', 'nxHint()'], ['Continue building', 'nxDismiss()']] });
}

/* ---------- Consequences of decisions (capability 4) ---------- */
function nxConsequence(before, label) {
    const a = computeMissionMetrics(), b = before;
    const parts = [];
    const d = (x, y) => Math.round(x - y);
    if (d(a.totalCost, b.totalCost)) parts.push(`${d(a.totalCost, b.totalCost) > 0 ? '+' : '−'}$${Math.abs(d(a.totalCost, b.totalCost))}M cost`);
    if (d(a.totalMass, b.totalMass)) parts.push(`${d(a.totalMass, b.totalMass) > 0 ? '+' : '−'}${Math.abs(d(a.totalMass, b.totalMass))} kg`);
    if (d(a.netWatts, b.netWatts)) parts.push(`power margin ${d(a.netWatts, b.netWatts) > 0 ? '+' : '−'}${Math.abs(d(a.netWatts, b.netWatts))} W`);
    if (d(a.effectiveScience, b.effectiveScience)) parts.push(`science ${d(a.effectiveScience, b.effectiveScience) > 0 ? '+' : '−'}${Math.abs(d(a.effectiveScience, b.effectiveScience))}`);
    if (!parts.length) return;
    const r = aeroReadiness(a);
    const verdict = r.go ? nxPick({ cadet: 'Everything still looks safe.', engineer: 'All launch rules still pass.', director: 'Poll status: GO.' })
        : nxPick({ cadet: `${r.bad} thing${r.bad > 1 ? 's' : ''} still need fixing.`, engineer: `${r.bad} readiness item${r.bad > 1 ? 's' : ''} red.`, director: `Poll status: NO-GO (${r.bad}).` });
    nxShow({ key: 'consequence', icon: 'ph-arrows-left-right', title: label, text: `${parts.join(' · ')}. ${verdict}`,
        choices: [!r.go ? ['What’s wrong?', 'nxExplainProblem()'] : ['Continue', 'nxDismiss()'], ['Give me a hint', 'nxHint()']] });
}
const _nxSelect = buildSelect;
buildSelect = function (field, id) {
    const before = computeMissionMetrics();
    _nxSelect(field, id);
    const o = (buildOptions(field === 'shield' ? 'thermal' : field) || []).find(x => x.id === id);
    nxConsequence(before, `You chose ${o ? o.name : id}`);
};
const _nxToggle = buildTogglePayload;
buildTogglePayload = function (id) {
    const before = computeMissionMetrics(), had = state.payloads.includes(id);
    _nxToggle(id);
    const p = PAYLOADS.find(x => x.id === id);
    if (had === state.payloads.includes(id)) { nxShow({ key: 'slots', icon: 'ph-warning', title: 'No free slot', text: nxPick({ cadet: 'Your spacecraft body is full! Choose a bigger body or remove an instrument first.', engineer: 'Bus payload slots are full — upgrade the bus or remove a payload.', director: 'Payload accommodation exceeded.' }), tone: 'warn' }); return; }
    nxConsequence(before, `${had ? 'Removed' : 'Added'} ${BUILD_PLAIN[id] ? BUILD_PLAIN[id].what : p.name}`);
};
const _nxOrbit = buildSelectOrbit;
buildSelectOrbit = function (id) {
    const before = computeMissionMetrics();
    _nxOrbit(id);
    nxConsequence(before, `Orbit: ${(BUILD_ORBIT_LABEL[id] || [id])[0]}`);
};

/* ---------- Problems, warnings, hints (capabilities 3, 5, 6, 7) ---------- */
function nxExplainProblem() {
    SoundFX.click();
    const r = aeroReadiness();
    const it = r.items.find(i => i.status === 'bad') || r.items.find(i => i.status === 'warn');
    if (!it) { nxShow({ key: 'ok', icon: 'ph-check-circle', title: 'No problems found', text: 'Every readiness check passes. You can start the GO/NO-GO poll.', tone: 'good' }); return; }
    const text = nxPick({ cadet: `${it.title}: ${it.why}`, engineer: `${it.title} — ${it.what} ${it.why}`, director: `${it.station || 'FLIGHT'}: ${it.what}` });
    nxShow({ key: 'problem', icon: 'ph-warning-circle', title: 'Here’s the problem', text, tone: 'warn',
        choices: [['Give me a hint', 'nxHint()'], [`Open ${BUILD_STEPS[it.fixStep].title}`, `buildGo(${it.fixStep})`]] });
}
// Graduated hints: 1 = where to look, 2 = what to look for, 3 = the fix written in the checklist. Never selects anything.
function nxHint() {
    SoundFX.click();
    const r = aeroReadiness();
    const it = r.items.find(i => i.status === 'bad') || r.items.find(i => i.status === 'warn');
    if (!it) { nxShow({ key: 'hint', icon: 'ph-lightbulb', title: 'Hint', text: nxPick({ cadet: 'Your spacecraft passes every check! Open Mission Readiness and start the GO/NO-GO poll.', engineer: 'All checks pass — consider spending leftover budget on a higher-science instrument, then run the poll.', director: 'Nominal. Proceed to poll.' }), tone: 'good' }); return; }
    if (NX.hintFor !== it.title) { NX.hintFor = it.title; NX.hintLevel = 0; }
    NX.hintLevel = Math.min(3, NX.hintLevel + 1);
    const area = BUILD_STEPS[it.fixStep].title;
    const text = NX.hintLevel === 1 ? `Look at the ${area} step — something there is causing “${it.title.toLowerCase()}”.`
        : NX.hintLevel === 2 ? `${it.what} Compare the numbers on each ${area.toLowerCase()} card.`
        : `${it.how}`;
    nxShow({ key: 'hint', icon: 'ph-lightbulb', title: `Hint ${NX.hintLevel} of 3`, text,
        choices: [NX.hintLevel < 3 ? ['Another hint', 'nxHint()'] : null, [`Open ${area}`, `openSpacecraftBuilder(${it.fixStep})`]].filter(Boolean) });
}

/* ---------- Celebrate & explain failures (capabilities 8, 9) ---------- */
function nxWatchReadiness() {
    let r;
    try { r = aeroReadiness(); } catch (e) { return; }
    if (NX.prevGo === null) { NX.prevGo = r.go; NX.prevBad = r.bad; return; }
    if (r.go && !NX.prevGo) {
        SoundFX.success();
        nxShow({ key: 'go', icon: 'ph-confetti', title: 'All systems GO!', tone: 'good', text: nxPick({ cadet: 'Amazing work, Commander! Your spacecraft passes every safety check. It’s ready to launch!', engineer: 'All five readiness rules pass. You’re cleared for the GO/NO-GO poll.', director: 'All stations nominal. Cleared to poll.' }),
            choices: [['Start GO/NO-GO poll', 'initiateGoNoGoPoll()']] });
    } else if (!r.go && r.bad > NX.prevBad && NX.lessonKey !== 'consequence') {
        nxExplainProblem();
    }
    NX.prevGo = r.go; NX.prevBad = r.bad;
}
const _nxRenderAll = renderAllUI;
renderAllUI = function () { _nxRenderAll.apply(this, arguments); if (appExperienceMode === 'game') nxWatchReadiness(); };

const NX_MILESTONE_TEXT = {
    liftoff: { cadet: 'Liftoff! Your rocket is climbing toward space! 🚀', engineer: 'Liftoff confirmed — engines at full thrust.', director: 'Liftoff. Clear of the tower.' },
    meco: { cadet: 'The first stage has done its job and dropped away. The second stage takes over!', engineer: 'MECO and stage separation — second-stage ignition.', director: 'MECO, staging nominal, MVac ignition.' },
    fairing: { cadet: 'The nose cone split open — your spacecraft can see space for the first time!', engineer: 'Fairing separation: aero-heating is low enough now.', director: 'Fairing sep confirmed.' },
    deploy: { cadet: 'Your spacecraft is flying on its own now! Unfolding its panels and antenna…', engineer: 'Spacecraft separation and deployment in progress.', director: 'Spacecraft sep. Deploying arrays.' },
    insert: { cadet: 'Orbit reached! Your spacecraft is now circling its destination. 🎉', engineer: 'Orbit insertion complete — target orbit achieved.', director: 'Orbit insertion burn complete.' },
    ops: { cadet: 'Science time! Let’s see what your spacecraft discovers.', engineer: 'Entering science operations.', director: 'Nominal ops. Commence science.' }
};
const _nxMilestone = launchSetMilestone;
launchSetMilestone = function (id) {
    const prev = LX.milestone;
    _nxMilestone(id);
    if (LX.milestone !== prev && NX_MILESTONE_TEXT[id]) nxShow({ key: 'ms-' + id, icon: 'ph-rocket-launch', title: 'Mission milestone', text: nxPick(NX_MILESTONE_TEXT[id]), tone: 'good' });
};
const _nxSim = renderSimulationStage;
renderSimulationStage = function () {
    _nxSim.apply(this, arguments);
    if (!state.sim || state.sim.phase < 4 || NX.debriefShown === state.sim) return;
    NX.debriefShown = state.sim;
    const m = computeMissionMetrics(), sc = m.scenario;
    const finalScience = Math.max(0, m.effectiveScience + state.sim.anomalyBonusPts);
    const success = m.hardFailures === 0 && finalScience >= sc.targetScience;
    if (success) { SoundFX.success(); nxShow({ key: 'win', icon: 'ph-trophy', tone: 'good', title: 'Mission success!', text: nxPick({ cadet: `You did it! Your spacecraft collected ${nxFmt(finalScience)} science points — more than the ${sc.targetScience} needed. Scientists will be studying your data for years!`, engineer: `Mission success: ${nxFmt(finalScience)} / ${sc.targetScience} science, ${m.hardFailures} critical faults.`, director: `Mission complete. Science ${nxFmt(finalScience)}/${sc.targetScience}. Nominal.` }) }); return; }
    const r = aeroReadiness(m), it = r.items.find(i => i.status === 'bad');
    const why = finalScience < sc.targetScience ? `The spacecraft collected ${nxFmt(finalScience)} of ${sc.targetScience} science points.` : `${m.hardFailures} critical engineering problem${m.hardFailures > 1 ? 's' : ''} limited the mission.`;
    nxShow({ key: 'fail', icon: 'ph-arrow-counter-clockwise', tone: 'warn', title: 'Not this time — but we learned a lot',
        text: `${why} ${it ? `The biggest issue: ${it.title.toLowerCase()}. ${it.how}` : 'Try instruments with a better fit for this destination.'} Real missions often fail before they succeed — let’s improve the design.`,
        choices: [['Back to the builder', `closeSimulationModal(); openSpacecraftBuilder(${it ? it.fixStep : BUILD_STEPS.findIndex(s => s.id === 'payloads')})`]] });
};

/* ---------- Questions: glossary first, then the existing answer engine ---------- */
const _nxGen = generateNexiAnswerForQuery;
generateNexiAnswerForQuery = function (raw) {
    const q = (raw || '').toLowerCase();
    const asksDef = /(what (is|are|does)|explain|define|meaning|how does|what's|whats)/.test(q);
    if (appExperienceMode === 'game' && asksDef) {
        const hit = nxGlossaryFor(q);
        if (hit) return nxPick(hit[1]);
    }
    if (appExperienceMode === 'game' && /(hint|stuck|help me|what should i do|next step)/.test(q)) {
        const r = aeroReadiness(), it = r.items.find(i => i.status === 'bad') || r.items.find(i => i.status === 'warn');
        return it ? `Look at ${BUILD_STEPS[it.fixStep].title}: ${it.title.toLowerCase()}. ${nxMode() === 'cadet' ? it.why : it.what}` : 'Everything passes — open Mission Readiness and run the GO/NO-GO poll!';
    }
    return _nxGen(raw);
};
const _nxStart = startGuidedMission;
startGuidedMission = function () { _nxStart(); NX.prevGo = null; setTimeout(nxWelcome, 50); };
// Mode-appropriate quick questions
function nxRenderChips() {
    const el = document.getElementById('nexiQuickChips');
    if (!el || appExperienceMode !== 'game') return;
    const sets = {
        cadet: [['What is an orbit?', 'What is an orbit?'], ['Why do I need a battery?', 'What is a battery for?'], ['Give me a hint', 'Give me a hint'], ['Am I ready?', 'Why is my mission GO or NO-GO?']],
        engineer: [['Explain Δv', 'What is delta-v?'], ['Power & battery?', 'Why is my power negative or battery low?'], ['Best instruments?', 'Which instruments are best for my mission?'], ['Hint', 'Give me a hint']],
        director: [['GO/NO-GO?', 'Why is my mission GO or NO-GO?'], ['Link budget', 'What is the DSN downlink?'], ['Radiation', 'What is radiation shielding?'], ['Orbit elements', 'What is periapsis and apoapsis?']]
    };
    el.innerHTML = sets[nxMode()].map(([l, q]) => `<button onclick="askNexiQuestion('${q.replace(/'/g, "\\'")}')" class="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 text-[10.5px] font-mono">${l}</button>`).join('');
    const lab = document.getElementById('nexiQuickChipsLabel');
    if (lab) lab.textContent = nxPick({ cadet: 'Ask ATLAS:', engineer: 'Quick engineering questions:', director: 'Quick telemetry queries:' });
}
const _nxApply = applyExperienceMode;
applyExperienceMode = function (mode) { _nxApply(mode); nxRenderChips(); const sub = document.getElementById('nexiSubtitle'); if (sub) sub.textContent = nxPick({ cadet: 'Your mission instructor', engineer: 'Mission instructor · engineering mode', director: 'Flight-dynamics & mission-control assistant' }); };
const _nxUpdate = updateNexiContextualGuidance;
updateNexiContextualGuidance = function () {
    _nxUpdate.apply(this, arguments);
    const el = document.getElementById('nexiLessonCard');
    if (el) el.style.display = appExperienceMode === 'game' ? '' : 'none';
    const sp = document.getElementById('nexiSpeechText');
    if (sp) sp.style.display = (el && appExperienceMode === 'game') ? 'none' : '';
};

