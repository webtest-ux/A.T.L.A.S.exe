/* A.T.L.A.S · section 16I — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16I. PLAY GAME — SPACECRAFT BUILDER (Stages 2–4)
 *      Body · Power · Battery · Communication · Propulsion · Thermal ·
 *      Instruments · Destination & Orbit.
 *      Uses the existing parts data and the existing actions
 *      (selectSubsystem / togglePayload / selectOrbitRegime / sliders),
 *      so every number comes from computeMissionMetrics(). No scoring
 *      formula, part value, mission ID or saved-design field changes.
 ***********************************************************************/
const BUILD_STEPS = [
    { id: 'chassis', title: 'Spacecraft Body', icon: 'ph-cube', plain: 'The main structure that holds all the equipment. Bigger bodies carry more instruments but weigh and cost more.' },
    { id: 'power', title: 'Power Source', icon: 'ph-sun', plain: 'Makes electricity. Solar panels turn sunlight into power; a radioisotope generator makes steady power from the heat of decaying plutonium, even far from the Sun.' },
    { id: 'battery', title: 'Battery', icon: 'ph-battery-charging', plain: 'Stores electricity for the times the spacecraft is in a planet’s shadow and cannot make enough power.' },
    { id: 'comms', title: 'Communication', icon: 'ph-broadcast', plain: 'The radio or laser that sends your science back to Earth and receives commands.' },
    { id: 'propulsion', title: 'Propulsion', icon: 'ph-rocket', plain: 'Thrusters that steer the spacecraft and change its orbit.' },
    { id: 'thermal', title: 'Thermal Protection', icon: 'ph-thermometer', plain: 'Keeps the electronics at safe temperatures — and, in this simulation, also protects them from radiation.' },
    { id: 'payloads', title: 'Instruments', icon: 'ph-flask', plain: 'The science tools. Each instrument studies something different, so choose the ones that fit your destination.' },
    { id: 'rocket', title: 'Launch Rocket', icon: 'ph-rocket-launch', plain: 'The rocket that carries your spacecraft to space. Bigger rockets lift more weight but cost more.' },
    { id: 'orbit', title: 'Destination & Orbit', icon: 'ph-planet', plain: 'The path your spacecraft follows around its destination.' }
];
// In the existing simulation, propulsion and thermal control are ONE combined subsystem (state.shield).
// Both steps show the same three options from different angles and set the same field.
const BUILD_SHIELD_VIEWS = {
    std_adcs: { prop: 'Reaction wheels for pointing, small cold-gas thrusters only — limited ability to change orbit.', therm: 'Passive blankets and paint. Fine near Earth; minimal radiation protection.' },
    cryo_thruster: { prop: 'Bipropellant thrusters (fuel + oxidiser) for orbit insertion and corrections.', therm: 'Active cryo-radiators and heat pipes; hardened electronics for the Moon and Mars.' },
    rad_vault: { prop: 'Main engine plus thrusters sized for a long outer-planet tour.', therm: 'A titanium–tantalum vault around the electronics — needed in Jupiter’s radiation belts.' }
};
const BUILD_PLAIN = {
    electron_micro: 'A small, cheap rocket for very light spacecraft close to Earth.',
    falcon_med: 'A reliable medium rocket — the everyday choice for most missions.',
    vulcan_heavy: 'A heavy rocket with side boosters for big or far-away missions.',
    sls_super: 'The most powerful (and most expensive) rocket, for the outer Solar System.',
    cubesat: 'A tiny shoebox-sized satellite. Cheap, but room for only 2 instruments.',
    microsat: 'A small, agile satellite — good for Earth orbit, 3 instruments.',
    hexbus: 'A deep-space body with built-in fuel tanks, 4 instruments.',
    titan_bus: 'A large flagship body built to last for years far from Earth, 4 instruments.',
    solar_gaas: 'Standard fold-out solar panels. Great near Earth, weak far from the Sun.',
    solar_roas: 'Big roll-out solar panels — lots of power, still depends on sunlight.',
    mmrtg: 'A nuclear battery (like Curiosity and Perseverance use): steady power day and night, anywhere.',
    li_ion: 'A phone-style battery pack. Enough for short shadows near Earth.',
    solid_state: 'A newer, denser battery for power-hungry instruments in the dark.',
    regen_fuel: 'A large energy store for very long dark periods.',
    s_band: 'A small antenna — cheap and light, but slow.',
    x_band: 'The standard deep-space radio NASA uses for most missions.',
    ka_dish: 'A big dish antenna — fast data for planetary missions.',
    lasercomm: 'Sends data with an infrared laser — very fast, like NASA’s DSOC test on Psyche.',
    sar_radar: { what: 'Radar', purpose: 'Bounces microwaves off the surface to make images through clouds, darkness and even ice.', why: { earth: 'Sees ice sheets and forests day or night, through clouds — like NASA-ISRO NISAR.', europa: 'Radar can probe Europa’s ice shell, as Europa Clipper’s REASON instrument does.', moon: 'Useful for terrain, but the Moon has no clouds to see through — weaker fit here.', mars: 'Useful for terrain, but other instruments suit Mars’ dusty surface better.' } },
    hyperspectral: { what: 'Camera + spectrometer', purpose: 'Takes pictures in hundreds of colours of light — including heat — to tell rocks, plants and ice apart.', why: { earth: 'Tracks plant health, water and heat across Earth, like Landsat and EMIT.', mars: 'Finds minerals that formed in water, like CRISM on Mars Reconnaissance Orbiter.', moon: 'Can map minerals, but the Moon’s grey surface gives weaker contrast.', europa: 'Can map surface salts, but radiation and dim light make it harder here.' } },
    ice_sounder: { what: 'Ice-penetrating radar', purpose: 'Sends radio pulses deep below the surface to find buried ice layers.', why: { moon: 'Searches for water-ice in permanently dark craters at the south pole.', mars: 'Maps buried glaciers, like SHARAD on Mars Reconnaissance Orbiter.', europa: 'Measures how thick Europa’s ice shell is above the ocean.', earth: 'Works on ice sheets, but radar imagers cover Earth better.' } },
    laser_altimeter: { what: 'Laser height-mapper', purpose: 'Fires laser pulses to measure the height of the ground very precisely.', why: { moon: 'Maps crater rims and safe landing sites, like LOLA on the Lunar Reconnaissance Orbiter.', mars: 'Builds a 3D map of Mars’ volcanoes and canyons, like MOLA did.', earth: 'Measures ice-sheet height changes, like ICESat-2.', europa: 'Can measure tides in the ice, but this design is tuned for rocky worlds.' } },
    magnetometer: { what: 'Magnetometer', purpose: 'Measures magnetic fields — and how they change.', why: { earth: 'Tracks Earth’s magnetic field and space weather.', europa: 'Detects the salty ocean through the magnetic field it induces, as Galileo did.', moon: 'The Moon has only weak, patchy magnetism — a weaker fit.', mars: 'Mars lost its global magnetic field — a weaker fit.' } },
    mass_spec: { what: 'Atmosphere & gas sensor', purpose: 'Sniffs gas particles and weighs them to tell what they are made of.', why: { moon: 'Studies the Moon’s ultra-thin exosphere and gases released from ice.', mars: 'Measures Mars’ thin atmosphere and how it escapes to space, like MAVEN.', europa: 'Could analyse material from possible plumes, like Clipper’s MASPEX.', earth: 'Earth’s atmosphere is well covered by other tools — a weaker fit.' } }
};
// Real physical constants (NASA fact sheets) used only for the orbit panel's explanatory numbers
const BUILD_BODY = {
    earth: { name: 'Earth', R: 6371.0, GM: 398600.4, sun: 100, delay: 'about 0.01 s (via ground stations)', dist: 'In orbit around Earth' },
    moon: { name: 'The Moon', R: 1737.4, GM: 4902.8, sun: 100, delay: 'about 1.3 s each way', dist: '≈384,400 km from Earth' },
    mars: { name: 'Mars', R: 3389.5, GM: 42828.4, sun: 43, delay: '3 to 22 minutes each way', dist: '55–400 million km from Earth' },
    europa: { name: 'Europa (moon of Jupiter)', R: 1560.8, GM: 3202.7, sun: 3.7, delay: '33 to 53 minutes each way', dist: '590–970 million km from Earth' }
};
const BUILD_ORBIT_LABEL = {
    leo: ['Low Earth Orbit', 'Close to Earth, tilted 28°. Cheapest to reach, but 1/3 of every orbit is in Earth’s shadow.'],
    sso: ['Polar Orbit (Sun-synchronous)', 'Passes over both poles and crosses each place at the same local time — ideal for watching Earth change.'],
    lunar_polar: ['Lunar Polar Orbit', 'Flies over the Moon’s poles, so the south-pole craters pass below every orbit.'],
    mars_orbit: ['Mars Science Orbit', 'A low, steeply tilted orbit for mapping Mars (similar in spirit to MRO/MAVEN). Note: the game’s internal name “Areostationary” is inaccurate — a real areostationary orbit is ~17,000 km up over the equator.'],
    jovian_flyby: ['Europa Flyby Campaign', 'Real missions like Europa Clipper orbit JUPITER and fly past Europa dozens of times to limit radiation. The game draws this campaign as an ellipse around Europa.']
};
const BUILD = { step: 0 };

function buildFieldFor(stepId) { return (stepId === 'propulsion' || stepId === 'thermal') ? 'shield' : stepId; }
function buildOptions(stepId) {
    if (stepId === 'comms') return COMMS;
    if (stepId === 'rocket') return ROCKETS;
    if (stepId === 'payloads') return PAYLOADS;
    if (stepId === 'orbit') return ORBITS;
    return SUBSYSTEMS[buildFieldFor(stepId)] || [];
}
// Evaluate a hypothetical choice with the real engine, then restore state exactly.
function buildTry(field, id) {
    const prev = field === 'payloads' ? state.payloads.slice() : state[field];
    if (field === 'payloads') { if (!state.payloads.includes(id)) state.payloads = state.payloads.concat([id]); }
    else state[field] = id;
    let m = null;
    try { m = computeMissionMetrics(); } catch (e) { m = null; }
    state[field] = prev;
    return m;
}
// Cadet recommendation: the option that keeps the mission within budget and gives the best readiness,
// judged with the real engine given everything else the player has chosen. Never auto-selected.
// ATLAS plans ONE complete design for the current mission with the real engine (computeMissionMetrics +
// computeGoNoGoStations): every combination of parts for the mission's recommended orbit is evaluated and the
// best launch-ready one is kept (science comfortably above target, then reliability, then lowest cost).
// Each builder step then suggests that plan's part, so following every suggestion yields a GO spacecraft.
const NEXI_PLAN = { key: '', plan: null };
function nexiPlan() {
    const sc = SCENARIOS.find(s => s.id === state.activeScenarioId); if (!sc) return null;
    const key = [sc.id, state.difficulty, state.gameMode, JSON.stringify(state.teamMods), state.eecomReserveActive, state.scienceOverclockActive].join('|');
    if (NEXI_PLAN.key === key) return NEXI_PLAN.plan;
    const fields = ['chassis', 'power', 'battery', 'shield', 'comms', 'rocket', 'orbit', 'payloads', 'periapsisKm', 'apoapsisKm', 'inclinationDeg'];
    const saved = {}; fields.forEach(f => saved[f] = Array.isArray(state[f]) ? state[f].slice() : state[f]);
    const pre = sc.optimalPreset || {};
    const orbit = pre.orbit || sc.recommendedOrbits[0];
    const ids = PAYLOADS.map(p => p.id);
    let best = null, bestScore = -Infinity;
    try {
        state.orbit = orbit;
        if (pre.orbit) { state.periapsisKm = pre.periapsisKm; state.apoapsisKm = pre.apoapsisKm; state.inclinationDeg = pre.inclinationDeg; }
        for (const ch of SUBSYSTEMS.chassis) {
            const subsets = [];
            for (let k = 1; k < 1 << ids.length; k++) { const sub = ids.filter((_, i) => k >> i & 1); if (sub.length <= ch.maxPayloads) subsets.push(sub); }
            for (const pw of SUBSYSTEMS.power) for (const bt of SUBSYSTEMS.battery) for (const sh of SUBSYSTEMS.shield)
                for (const cm of COMMS) for (const rk of ROCKETS) for (const pl of subsets) {
                    state.chassis = ch.id; state.power = pw.id; state.battery = bt.id; state.shield = sh.id; state.comms = cm.id; state.rocket = rk.id; state.payloads = pl;
                    const m = computeMissionMetrics();
                    if (Number(m.hardFailures) > 0 || !computeGoNoGoStations(m).every(st => st.go)) continue;
                    const sciRatio = m.effectiveScience / sc.targetScience;
                    // ≥ 1.25× target leaves room for in-flight anomaly penalties; then reliability, then budget left over
                    const score = Math.min(sciRatio, 1.25) * 1000 + m.reliability * 4 + (m.maxBudget - m.totalCost) * 0.5;
                    if (score > bestScore) { bestScore = score; best = { chassis: ch.id, power: pw.id, battery: bt.id, shield: sh.id, comms: cm.id, rocket: rk.id, orbit, payloads: pl.slice(), periapsisKm: state.periapsisKm, apoapsisKm: state.apoapsisKm, inclinationDeg: state.inclinationDeg }; }
                }
        }
    } finally { fields.forEach(f => state[f] = saved[f]); }
    NEXI_PLAN.key = key; NEXI_PLAN.plan = best;
    return best;
}
function buildRecommend(stepId) {
    const field = buildFieldFor(stepId), plan = nexiPlan();
    if (!plan) return [];
    return field === 'payloads' ? plan.payloads.slice() : (plan[field] ? [plan[field]] : []);
}
// Apply ATLAS's whole plan through the game's own actions (same as clicking every suggestion)
function applyNexiPlan() {
    const plan = nexiPlan(); if (!plan) return false;
    ['chassis', 'power', 'battery', 'shield', 'comms', 'rocket'].forEach(f => { if (state[f] !== plan[f]) selectSubsystem(f, plan[f]); });
    if (state.orbit !== plan.orbit) selectOrbitRegime(plan.orbit);
    state.periapsisKm = plan.periapsisKm; state.apoapsisKm = plan.apoapsisKm; state.inclinationDeg = plan.inclinationDeg;
    state.payloads = plan.payloads.slice();
    try { syncSlidersFromState(); } catch (e) {}
    renderAllUI(); try { broadcastStateUpdate(); } catch (e) {}
    return true;
}

// Small illustrated thumbnails (the real 3D part is shown on the spacecraft in the main viewport)
function buildThumbSVG(stepId, id) {
    const g = (s) => `<svg viewBox="0 0 64 64" class="bd-thumb" aria-hidden="true">${s}</svg>`;
    const gold = '#f59e0b', ti = '#cbd5e1', blue = '#0ea5e9', dark = '#334155';
    switch (buildFieldFor(stepId)) {
        case 'chassis': { const s = { cubesat: 14, microsat: 20, hexbus: 24, titan_bus: 28 }[id] || 20; return g(`<rect x="${32 - s / 2}" y="${32 - s / 2}" width="${s}" height="${s}" rx="3" fill="${gold}" stroke="#78350f"/><rect x="${32 - s / 2 + 3}" y="${32 - s / 2 + 3}" width="${s - 6}" height="${s * 0.3}" fill="#fcd34d" opacity=".5"/>`); }
        case 'power': return id === 'mmrtg' ? g(`<rect x="26" y="14" width="12" height="36" rx="3" fill="${dark}"/>${[0, 1, 2, 3, 4].map(i => `<rect x="20" y="${17 + i * 7}" width="24" height="2" fill="#f97316"/>`).join('')}`)
            : g(`<rect x="27" y="26" width="10" height="12" fill="${gold}"/>${[-1, 1].map(sx => `<rect x="${sx < 0 ? 4 : 39}" y="${id === 'solar_roas' ? 22 : 25}" width="21" height="${id === 'solar_roas' ? 20 : 14}" fill="${blue}" stroke="#0c4a6e"/>`).join('')}`);
        case 'battery': { const n = { li_ion: 2, solid_state: 3, regen_fuel: 4 }[id] || 2; return g(Array.from({ length: n }, (_, i) => `<rect x="${12 + i * 11}" y="20" width="9" height="26" rx="2" fill="#22c55e" stroke="#14532d"/><rect x="${14 + i * 11}" y="17" width="5" height="3" fill="#86efac"/>`).join('')); }
        case 'comms': return id === 'lasercomm' ? g(`<rect x="22" y="30" width="20" height="14" rx="2" fill="${ti}"/><circle cx="32" cy="30" r="7" fill="${dark}"/><line x1="32" y1="30" x2="58" y2="6" stroke="#f43f5e" stroke-width="2"/>`)
            : g(`<path d="M${32 - ({ s_band: 8, x_band: 13, ka_dish: 20 }[id] || 12)} 30 Q32 ${30 + ({ s_band: 8, x_band: 12, ka_dish: 18 }[id] || 12)} ${32 + ({ s_band: 8, x_band: 13, ka_dish: 20 }[id] || 12)} 30 Z" fill="${ti}" stroke="#64748b"/><line x1="32" y1="30" x2="32" y2="18" stroke="#94a3b8" stroke-width="2"/><circle cx="32" cy="17" r="2.5" fill="#94a3b8"/>`);
        case 'shield': return stepId === 'propulsion'
            ? g(`<rect x="22" y="8" width="20" height="22" rx="4" fill="${ti}"/><path d="M26 30 L38 30 L42 50 L22 50 Z" fill="${dark}"/>${id !== 'std_adcs' ? '<path d="M25 52 L32 62 L39 52 Z" fill="#f97316" opacity=".8"/>' : ''}`)
            : g(id === 'rad_vault' ? `<rect x="14" y="14" width="36" height="36" rx="4" fill="${dark}" stroke="#94a3b8" stroke-width="3"/><rect x="24" y="24" width="16" height="16" fill="${gold}"/>`
                : `<rect x="22" y="22" width="20" height="20" fill="${gold}"/>${id === 'cryo_thruster' ? `<rect x="6" y="18" width="12" height="28" fill="#e2e8f0" stroke="#64748b"/><rect x="46" y="18" width="12" height="28" fill="#e2e8f0" stroke="#64748b"/>` : ''}`);
        default: return g(`<circle cx="32" cy="32" r="20" fill="${blue}"/>`);
    }
}

function buildSpecRow(stepId, o) {
    const f = buildFieldFor(stepId), cells = [];
    if (o.mass !== undefined) cells.push(['Mass', `${o.mass} kg`]);
    if (o.cost !== undefined) cells.push(['Cost', `$${o.cost}M`]);
    if (f === 'power') cells.push(['Power made', `${o.baseWatts} W${o.isSolar ? ' at Earth' : ' constant'}`]);
    if (f === 'battery') cells.push(['Stores', `${o.capacityWh} Wh`]);
    if (f === 'comms') cells.push(['Uses', `${o.power} W`], ['Data rate', `${o.baseGbps} Gbps base`]);
    if (f === 'shield') cells.push(['Uses', `${o.powerDraw} W`], ['Radiation rating', `Level ${o.radRating}`]);
    if (f === 'chassis') cells.push(['Instrument slots', o.maxPayloads], ['Reliability', `${o.reliability}%`]);
    if (f === 'rocket') cells.push(['Lifts (to Earth orbit)', `${o.baseCapacityKg} kg`], ['Reliability', `${o.reliability}%`]);
    if (f === 'payloads') cells.push(['Uses', `${o.power} W`], ['Data', `${o.dataGbps} Gbps`], ['Base science', o.baseScience]);
    return `<dl class="bd-specs">${cells.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}
function buildCompat(stepId, o, m) {
    const f = buildFieldFor(stepId), sc = m.scenario, notes = [];
    const body = sc.targetBody;
    if (f === 'power' && o.isSolar && sc.solarFluxMultiplier < 1) notes.push(['warn', `Sunlight at this destination is ${Math.round(sc.solarFluxMultiplier * 100)}% of Earth’s in this simulation → about ${Math.round(o.baseWatts * sc.solarFluxMultiplier)} W.`]);
    if (f === 'power' && !o.isSolar) notes.push(['ok', 'Works the same at any distance from the Sun.']);
    if (f === 'shield' && o.radRating < sc.requiredRadiation) notes.push(['bad', `Radiation level ${o.radRating} is below this mission’s required level ${sc.requiredRadiation}.`]);
    if (f === 'shield' && o.radRating >= sc.requiredRadiation) notes.push(['ok', `Meets this mission’s radiation level (${sc.requiredRadiation}).`]);
    if (f === 'chassis' && state.payloads.length > o.maxPayloads) notes.push(['warn', `You have ${state.payloads.length} instruments; this body holds ${o.maxPayloads} (extras would be removed).`]);
    if (f === 'comms' && sc.commsDistancePenalty < 1) notes.push(['warn', `Distance cuts the data rate to ≈${Math.round(o.baseGbps * sc.commsDistancePenalty)} Gbps here (mission needs ${sc.minDownlink}).`]);
    if (f === 'payloads') notes.push(o.synergyBodies.includes(body) ? ['ok', 'Great fit for this destination: ×1.35 science.'] : ['warn', 'Weak fit for this destination: ×0.85 science.']);
    const t = f === 'payloads' && state.payloads.includes(o.id) ? m : buildTry(f, o.id);
    if (t) {
        if (t.totalCost > t.maxBudget) notes.push(['bad', `With this choice the mission costs $${Math.round(t.totalCost)}M of $${Math.round(t.maxBudget)}M.`]);
        if (t.totalMass > t.maxLiftCapacity) notes.push(['bad', `Too heavy for the selected rocket (${Math.round(t.totalMass)} / ${Math.round(t.maxLiftCapacity)} kg).`]);
        if (f !== 'payloads' && t.netWatts < 0 && m.netWatts >= 0) notes.push(['warn', 'Would leave the spacecraft short of power.']);
    }
    return notes.map(([k, s]) => `<li class="bd-note ${k}">${s}</li>`).join('');
}

function renderBuilder() {
    const host = document.getElementById('tab-builder');
    if (!host || host.classList.contains('hidden')) return;
    let m;
    try { m = computeMissionMetrics(); } catch (e) { return; }
    const mode = state.difficulty === 'director' ? 'director' : (state.difficulty === 'cadet' ? 'cadet' : 'engineer');
    const step = BUILD_STEPS[BUILD.step];
    const field = buildFieldFor(step.id);
    const rec = mode === 'cadet' && step.id !== 'ready' ? buildRecommend(step.id) : [];
    const nav = `<div class="bd-nav">${BUILD_STEPS.map((s, i) => {
        const f = buildFieldFor(s.id), done = s.id === 'ready' ? aeroReadiness(m).go : (f === 'payloads' ? state.payloads.length > 0 : !!state[f]);
        return `<button class="bd-navbtn ${i === BUILD.step ? 'now' : ''} ${done ? 'done' : ''}" onclick="buildGo(${i})" title="${s.title}"><i class="ph-fill ${s.icon}"></i><span>${s.title}</span></button>`;
    }).join('')}</div>`;
    const totals = `<div class="bd-totals">
        <span class="${m.totalCost <= m.maxBudget ? 'ok' : 'bad'}">Budget $${Math.round(m.totalCost)}M / $${Math.round(m.maxBudget)}M</span>
        <span class="${m.totalMass <= m.maxLiftCapacity ? 'ok' : 'bad'}">Mass ${Math.round(m.totalMass)} / ${Math.round(m.maxLiftCapacity)} kg</span>
        <span class="${m.netWatts >= 0 ? 'ok' : 'bad'}">Power ${m.netWatts >= 0 ? '+' : ''}${m.netWatts} W</span>
        <span class="${m.effectiveScience >= m.scenario.targetScience ? 'ok' : 'bad'}">Science ${Math.round(m.effectiveScience)} / ${m.scenario.targetScience}</span></div>`;
    let body = '';
    if (step.id === 'ready') body = renderReadinessPanel(m);
    else if (field === 'orbit') body = renderBuilderOrbit(m, mode, rec);
    else {
        const opts = buildOptions(step.id);
        body = `<div class="bd-grid">${opts.map(o => {
            const sel = field === 'payloads' ? state.payloads.includes(o.id) : state[field] === o.id;
            const info = BUILD_PLAIN[o.id];
            const plain = field === 'payloads' ? info.purpose : (field === 'shield' ? (step.id === 'propulsion' ? BUILD_SHIELD_VIEWS[o.id].prop : BUILD_SHIELD_VIEWS[o.id].therm) : info);
            const why = field === 'payloads' ? `<p class="bd-why"><b>Why for ${opsEsc(BUILD_BODY[m.scenario.targetBody].name)}:</b> ${opsEsc(info.why[m.scenario.targetBody] || '')}</p>` : '';
            const action = field === 'payloads' ? `buildTogglePayload('${o.id}')` : `buildSelect('${field}','${o.id}')`;
            return `<button class="bd-card ${sel ? 'sel' : ''}" onclick="${action}" aria-pressed="${sel}">
                <div class="bd-card-top">${field === 'payloads' ? `<span class="bd-ico"><i class="ph-duotone ${o.icon || 'ph-flask'}"></i></span>` : buildThumbSVG(step.id, o.id)}
                    <div class="bd-badges">${rec.includes(o.id) ? '<span class="bd-rec"><i class="ph-fill ph-star"></i> ATLAS suggests</span>' : ''}${sel ? '<span class="bd-on">Selected</span>' : ''}</div></div>
                <div class="bd-name">${field === 'payloads' ? `${opsEsc(info.what)}<small>${opsEsc(o.name)}</small>` : opsEsc(o.name)}</div>
                <p class="bd-plain">${opsEsc(plain)}</p>${why}
                ${mode === 'cadet' ? '' : `<p class="bd-tech">${opsEsc(o.desc || '')}</p>`}
                ${buildSpecRow(step.id, o)}
                <ul class="bd-notes">${buildCompat(step.id, o, m)}</ul>
            </button>`;
        }).join('')}</div>`;
        if (field === 'payloads') { const c = SUBSYSTEMS.chassis.find(x => x.id === state.chassis); body = `<div class="bd-slots">Instrument slots used: <b>${state.payloads.length} / ${c ? c.maxPayloads : '?'}</b> — tap a card to add or remove.</div>` + body; }
    }
    host.innerHTML = `${nav}<div class="bd-head"><div><h3><i class="ph-fill ${step.icon}"></i> Step ${BUILD.step + 1} of ${BUILD_STEPS.length}: ${step.title}</h3><p>${step.plain}${step.id === 'propulsion' || step.id === 'thermal' ? ' <span class="bd-tech">In this simulation propulsion and thermal protection are one combined system, so these two steps change the same choice.</span>' : ''}</p></div>
        <div class="bd-headbtns">${BUILD.step > 0 ? `<button class="bd-sec" onclick="buildGo(${BUILD.step - 1})"><i class="ph-bold ph-arrow-left"></i></button>` : ''}${BUILD.step < BUILD_STEPS.length - 1 ? `<button class="bd-pri" onclick="buildGo(${BUILD.step + 1})">Next <i class="ph-bold ph-arrow-right"></i></button>` : ''}</div></div>
        ${mode === 'cadet' && rec.length ? `<div class="bd-tip"><i class="ph-fill ph-robot"></i> ATLAS’s suggestion is marked with a star — it is worked out from your current design and the mission budget. You still choose.</div>` : ''}
        ${totals}${body}`;
}

function renderBuilderOrbit(m, mode, rec) {
    const sc = m.scenario;
    const cards = ORBITS.map(o => {
        const b = BUILD_BODY[o.body], sel = state.orbit === o.id, lab = BUILD_ORBIT_LABEL[o.id] || [o.name, o.desc];
        const target = o.body === sc.targetBody;
        return `<button class="bd-card bd-orbit ${sel ? 'sel' : ''}" onclick="buildSelectOrbit('${o.id}')">
            <div class="bd-card-top">${buildOrbitSVG(o.body, o.defaultPe, o.defaultAp, o.defaultInc)}<div class="bd-badges">${rec.includes(o.id) ? '<span class="bd-rec"><i class="ph-fill ph-star"></i> Recommended</span>' : ''}${sel ? '<span class="bd-on">Selected</span>' : ''}</div></div>
            <div class="bd-name">${opsEsc(lab[0])}<small>${opsEsc(b.name)} · game name: ${opsEsc(o.name)}</small></div>
            <p class="bd-plain">${opsEsc(lab[1])}</p>
            <ul class="bd-notes">${target ? '<li class="bd-note ok">Matches your mission’s destination.</li>' : `<li class="bd-note bad">Not your mission’s destination — science ×0.45.</li>`}</ul>
        </button>`;
    }).join('');
    // Live numbers for the CURRENT orbit (real Kepler period from the body’s GM; other values from the game engine)
    const o = ORBITS.find(x => x.id === state.orbit) || ORBITS[0], b = BUILD_BODY[o.body];
    const a = b.R + (state.periapsisKm + state.apoapsisKm) / 2;
    const Tmin = 2 * Math.PI * Math.sqrt(a * a * a / b.GM) / 60;
    const incTxt = state.inclinationDeg >= 80 && state.inclinationDeg <= 100 ? 'passes over (or near) both poles' : (state.inclinationDeg < 10 ? 'stays near the equator' : `covers latitudes up to ±${Math.round(state.inclinationDeg > 90 ? 180 - state.inclinationDeg : state.inclinationDeg)}°`);
    const sliders = mode === 'cadet' ? '' : `<div class="bd-sliders">
        ${[['periapsisKm', 'Lowest point', 200, 3500, 50, 'km'], ['apoapsisKm', 'Highest point', 300, 8000, 50, 'km'], ['inclinationDeg', 'Tilt (inclination)', 0, 98, 1, '°']].map(([k, l, mn, mx, st, u]) =>
            `<label>${l} <b>${state[k]} ${u}</b><input type="range" min="${mn}" max="${mx}" step="${st}" value="${state[k]}" oninput="buildSetOrbitValue('${k}', this.value)"></label>`).join('')}
        <p class="bd-tech">Lowest point is kept below the highest point. ${mode === 'director' ? 'Full orbital mechanics, Δv and eclipse modelling remain in tab 4 “Orbit & Rocket”.' : 'Higher orbits cost more energy but spend less time in shadow.'}</p></div>`;
    return `<div class="bd-grid bd-grid-orbit">${cards}</div>
        <div class="bd-orbit-info">
            <div class="bd-oi-viz">${buildOrbitSVG(o.body, state.periapsisKm, state.apoapsisKm, state.inclinationDeg, true)}</div>
            <dl class="bd-specs bd-oi-specs">
                <div><dt>Destination</dt><dd>${opsEsc(b.name)}</dd></div>
                <div><dt>Altitude</dt><dd>${state.periapsisKm}–${state.apoapsisKm} km</dd></div>
                <div><dt>Inclination</dt><dd>${state.inclinationDeg}° — ${incTxt}</dd></div>
                <div><dt>Orbital period</dt><dd>${Tmin >= 120 ? (Tmin / 60).toFixed(1) + ' h' : Math.round(Tmin) + ' min'} (Kepler’s law)</dd></div>
                <div><dt>Communication</dt><dd>${b.dist}; signal delay ${b.delay}. Data link ${m.effectiveDownlinkGbps} Gbps vs ${m.dataGeneratedGbps} Gbps generated (needs ≥ ${sc.minDownlink}).</dd></div>
                <div><dt>Energy</dt><dd>Mission Δv ${m.effectiveDeltaV} km/s · in shadow ${Math.round(m.effectiveEclipseFraction * 100)}% of each orbit · battery needed ${m.eclipseEnergyReqWh} Wh of ${m.effectiveBatteryWh} Wh · real sunlight ≈${b.sun}% of Earth’s</dd></div>
            </dl>
        </div>${sliders}`;
}
// Side-view sketch to scale: planet radius vs orbit (a, e), tilt shown as the orbit plane angle
function buildOrbitSVG(body, pe, ap, inc, big) {
    const b = BUILD_BODY[body], rp = b.R + pe, ra = b.R + ap, a = (rp + ra) / 2, e = (ra - rp) / (ra + rp), bb = a * Math.sqrt(1 - e * e);
    const W = big ? 220 : 64, S = (W * 0.46) / ra, c = a - rp;
    const col = { earth: '#2563eb', moon: '#9ca3af', mars: '#c2410c', europa: '#e7e5e4' }[body];
    return `<svg viewBox="0 0 ${W} ${W}" class="${big ? 'bd-oviz' : 'bd-thumb'}" role="img" aria-label="Orbit sketch to scale"><g transform="translate(${W / 2} ${W / 2}) rotate(${-Math.min(inc, 180 - inc) * 0.5})">
        <ellipse cx="${-c * S}" cy="0" rx="${a * S}" ry="${bb * S}" fill="none" stroke="#38bdf8" stroke-width="${big ? 1.5 : 1}" stroke-dasharray="${big ? '4 3' : '2 2'}"/>
        <circle r="${b.R * S}" fill="${col}"/>
        <circle cx="${(rp - 0) * S}" cy="0" r="${big ? 3.5 : 2}" fill="#f59e0b"/></g></svg>`;
}

/* ---------- Actions (wrap the existing ones) ---------- */
function buildGo(i) { SoundFX.click(); BUILD.step = Math.max(0, Math.min(BUILD_STEPS.length - 1, i)); buildFocusCamera(); renderBuilder(); }
function buildSelect(field, id) { selectSubsystem(field, id); buildFocusCamera(); }
function buildTogglePayload(id) { togglePayload(id); }
function buildSelectOrbit(id) { selectOrbitRegime(id); try { setCameraViewMode('orbit'); } catch (e) { /* camera optional */ } }
function buildSetOrbitValue(k, v) {
    v = Number(v);
    if (k === 'periapsisKm') v = Math.min(v, state.apoapsisKm - 50);
    if (k === 'apoapsisKm') v = Math.max(v, state.periapsisKm + 50);
    state[k] = v;
    syncSlidersFromState();
    lastBuiltSignature = '';
    renderAllUI();
    broadcastStateUpdate();
}
function buildFocusCamera() {
    const step = BUILD_STEPS[BUILD.step];
    try { setCameraViewMode(step.id === 'orbit' ? 'orbit' : 'spacecraft'); } catch (e) { /* camera optional */ }
}
function openSpacecraftBuilder(stepIdx) {
    if (typeof stepIdx === 'number') BUILD.step = stepIdx;
    switchTab('builder');
    buildFocusCamera();
    renderBuilder();
}

/* ---------- Extra 3D parts on the existing spacecraft model (battery, propulsion, radiators) ---------- */
const _bdBuildParts = buildProceduralSpacecraftParts;
buildProceduralSpacecraftParts = function (m) {
    _bdBuildParts.apply(this, arguments);
    try {
        if (!spacecraftGroup || typeof THREE === 'undefined') return;
        const metal = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6, roughness: 0.45 });
        // Sizes follow the existing bus geometry (half-width hw, half-height hh)
        const hw = { cubesat: 0.475, microsat: 0.675, hexbus: 1.0, titan_bus: 1.22 }[state.chassis] || 0.7;
        const hh = { cubesat: 0.675, microsat: 0.775, hexbus: 0.875, titan_bus: 1.075 }[state.chassis] || 0.8;
        const cells = { li_ion: 2, solid_state: 3, regen_fuel: 4 }[state.battery] || 2;
        const batMat = new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.4, roughness: 0.5 });
        const cw = Math.min(0.2, hw * 1.4 / cells);
        for (let i = 0; i < cells; i++) {
            const cell = new THREE.Mesh(new THREE.BoxGeometry(cw * 0.85, hh * 0.45, 0.1), batMat);
            cell.position.set((i - (cells - 1) / 2) * cw, -hh * 0.35, hw + 0.06);
            cell.userData.bdPart = 'battery';
            spacecraftGroup.add(cell);
        }
        // Propulsion: propellant tanks for bipropellant / flagship systems (the main nozzle already exists)
        if (state.shield !== 'std_adcs') {
            const tr = Math.max(0.12, hw * 0.24);
            [-1, 1].forEach(sx => {
                const tank = new THREE.Mesh(new THREE.SphereGeometry(tr, 20, 14), metal);
                tank.position.set(sx * hw * 0.5, -hh - tr * 0.6, -hw * 0.4);
                tank.userData.bdPart = 'propulsion';
                spacecraftGroup.add(tank);
            });
        } else {
            [-1, 1].forEach(sx => {   // small cold-gas thruster pods
                const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.12, 10), dark);
                pod.position.set(sx * (hw + 0.05), hh * 0.7, 0);
                pod.rotation.z = Math.PI / 2;
                pod.userData.bdPart = 'propulsion';
                spacecraftGroup.add(pod);
            });
        }
        // Thermal: white radiator panels for the cryo-radiator option
        if (state.shield === 'cryo_thruster') {
            const rad = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.1, roughness: 0.6 });
            [-1, 1].forEach(sx => {
                const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, hh * 0.9, hw * 0.8), rad);
                p.position.set(sx * (hw + 0.04), 0.1, -hw * 0.1);
                p.userData.bdPart = 'thermal';
                spacecraftGroup.add(p);
            });
        }
    } catch (e) { aeroReportError('spacecraft parts', e); }
};

const _bdRenderAllUI = renderAllUI;
renderAllUI = function () {
    _bdRenderAllUI.apply(this, arguments);
    try { renderBuilder(); } catch (e) { aeroReportError('spacecraft builder', e); }
};
const _bdSwitchTab = switchTab;
switchTab = function (tabId) {
    _bdSwitchTab(tabId);
    if (tabId === 'builder') renderBuilder();
};
// Cadet guide buttons now open the matching builder steps
if (typeof CADET_STEPS !== 'undefined') {
    CADET_STEPS[1].action = 'openSpacecraftBuilder(0)'; CADET_STEPS[1].btn = 'Open the spacecraft builder'; CADET_STEPS[1].action2 = 'cadetUseRecommended()'; CADET_STEPS[1].btn2 = 'Use ATLAS’s full design';
    CADET_STEPS[2].action = 'openSpacecraftBuilder(1)';
    CADET_STEPS[3].action = 'openSpacecraftBuilder(7)';
    CADET_STEPS[4].action = 'openSpacecraftBuilder(8)'; CADET_STEPS[4].btn = 'Open the readiness checklist';
}
if (typeof startGuidedMission === 'function') {
    const _bdStart = startGuidedMission;
    startGuidedMission = function () { _bdStart(); if (state.difficulty !== 'director') openSpacecraftBuilder(0); };
}

