/* A.T.L.A.S · section 16J — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16J. PLAY GAME — MISSION READINESS CHECKLIST (Stage 5)
 *      Every line is derived from computeMissionMetrics() and uses the
 *      SAME pass/fail rules as the existing GO/NO-GO poll stations
 *      (EECOM, GNC, FIDO, SCIENCE, FLIGHT/PAD), so the checklist can never
 *      say GO while the poll would say NO-GO.
 ***********************************************************************/
function aeroReadiness(m) {
    m = m || computeMissionMetrics();
    const sc = m.scenario, sandbox = state.gameMode === 'sandbox';
    const step = id => BUILD_STEPS.findIndex(s => s.id === id);
    const items = [];
    const add = (status, title, what, why, how, fixStep, station) => items.push({ status, title, what, why, how, fixStep, station });
    const fmt = n => Math.round(n).toLocaleString('en-US');

    // 1. Structure (always assembled; slots must hold the chosen instruments)
    const ch = m.chassis;
    add(state.payloads.length <= ch.maxPayloads ? 'ok' : 'bad', 'Spacecraft structure',
        `${ch.name}: ${state.payloads.length} of ${ch.maxPayloads} instrument slots used, ${m.reliability}% reliability.`,
        'The body carries every part; it must have room for all instruments.',
        'Choose a larger body or remove an instrument.', step('chassis'));

    // 2. Power (EECOM)
    if (m.netWatts >= 0) add('ok', 'Power system operational', `${m.generatedWatts} W made, ${m.totalWattsRequired} W needed (+${m.netWatts} W spare).`, '', '', step('power'), 'EECOM');
    else {
        const better = SUBSYSTEMS.power.filter(p => p.id !== state.power).map(p => ({ p, mm: buildTry('power', p.id) })).filter(x => x.mm && x.mm.netWatts >= 0).sort((a, b) => a.p.cost - b.p.cost)[0];
        add('bad', 'Not enough electricity',
            `The spacecraft needs ${m.totalWattsRequired} W but ${m.powerSys.name} only makes ${m.generatedWatts} W at ${BUILD_BODY[sc.targetBody] ? BUILD_BODY[sc.targetBody].name : sc.targetBody} (${Math.abs(m.netWatts)} W short).`,
            'Without enough power, instruments, radio and heaters switch off — the mission cannot operate.',
            better ? `Switch the power source to ${better.p.name} (${better.mm.generatedWatts} W here), or remove a power-hungry instrument.` : 'Remove a power-hungry instrument or choose a lower-power radio.',
            step('power'), 'EECOM');
    }
    // 3. Battery (EECOM)
    if (m.batteryMarginWh >= 0) add('ok', 'Battery capacity sufficient', `${fmt(m.effectiveBatteryWh)} Wh stored vs ${fmt(m.eclipseEnergyReqWh)} Wh needed in shadow.`, '', '', step('battery'), 'EECOM');
    else {
        const bigger = SUBSYSTEMS.battery.filter(b => b.capacityWh > (SUBSYSTEMS.battery.find(x => x.id === state.battery) || {}).capacityWh).map(b => ({ b, mm: buildTry('battery', b.id) })).filter(x => x.mm && x.mm.batteryMarginWh >= 0)[0];
        add('bad', 'Battery capacity needs attention',
            `In ${Math.round(m.effectiveEclipseFraction * 100)}% of each orbit the spacecraft is in shadow and needs ${fmt(m.eclipseEnergyReqWh)} Wh, but the battery stores ${fmt(m.effectiveBatteryWh)} Wh.`,
            'In shadow the solar panels make nothing; an empty battery shuts the spacecraft down every orbit.',
            bigger ? `Upgrade to the ${bigger.b.name} (${fmt(bigger.b.capacityWh)} Wh), reduce power use, or raise the orbit to spend less time in shadow.` : 'Reduce power use or raise the orbit to spend less time in shadow.',
            step('battery'), 'EECOM');
    }
    // 4. Instruments + science (SCIENCE station: science ≥ 80% of target)
    const sciOK = m.effectiveScience >= sc.targetScience * 0.8;
    if (!state.payloads.length) add('bad', 'No scientific instruments installed', 'The spacecraft carries no instruments.', 'Without instruments the mission returns no science.', 'Add instruments that fit this destination (look for the green “great fit” badge).', step('payloads'), 'SCIENCE');
    else if (m.effectiveScience >= sc.targetScience) add('ok', 'Scientific instruments installed', `${state.payloads.length} instruments, ${fmt(m.effectiveScience)} of ${sc.targetScience} science points.`, '', '', step('payloads'), 'SCIENCE');
    else add(sciOK ? 'warn' : 'bad', sciOK ? 'Science slightly below target' : 'Not enough science',
        `Expected science is ${fmt(m.effectiveScience)} points; the mission goal is ${sc.targetScience} (${sciOK ? 'GO needs at least 80%' : 'below the 80% needed for GO'}).`,
        'Science is the reason the mission flies — reviewers will not approve a launch that cannot meet its goal.',
        'Swap weak-fit instruments for “great fit” ones, add an instrument if a slot is free, or pick an orbit with a higher science factor.', step('payloads'), 'SCIENCE');
    // 5. Communication (SCIENCE station: ≥ 85% of data downlinked)
    const cap = Math.round(m.dataCaptureRatio * 100);
    if (m.dataCaptureRatio >= 0.95 || m.dataGeneratedGbps === 0) add('ok', 'Communication system connected', `${m.comms.name}: ${m.effectiveDownlinkGbps} Gbps link for ${m.dataGeneratedGbps} Gbps of data.`, '', '', step('comms'), 'SCIENCE');
    else add(m.dataCaptureRatio >= 0.85 ? 'warn' : 'bad', m.dataCaptureRatio >= 0.85 ? 'Radio link slightly too slow' : 'Radio link too slow',
        `Instruments make ${m.dataGeneratedGbps} Gbps but ${m.comms.name} can send ${m.effectiveDownlinkGbps} Gbps from here — only ${cap}% of the data reaches Earth.`,
        'Data that cannot be sent home is lost science. GO needs at least 85% to reach Earth.',
        'Choose a faster radio (Ka-band dish or laser), or carry fewer data-heavy instruments.', step('comms'), 'SCIENCE');
    // 6. Destination (FIDO)
    if (m.orbit.body === sc.targetBody || sandbox) add('ok', 'Destination selected', `${m.orbit.name} at ${BUILD_BODY[m.orbit.body] ? BUILD_BODY[m.orbit.body].name : m.orbit.body}, ${m.pe}–${m.ap} km.`, '', '', step('orbit'), 'FIDO');
    else add('bad', 'Wrong destination', `This mission goes to ${sc.targetBody}, but the orbit chosen is around ${m.orbit.body}.`, 'The spacecraft would study the wrong world.', `Choose the recommended orbit for ${sc.targetBody}.`, step('orbit'), 'FIDO');
    // 7. Radiation (GNC)
    if (m.shield.radRating >= m.effectiveRadLevel) add('ok', 'Radiation protection adequate', `Protection level ${m.shield.radRating} vs radiation level ${m.effectiveRadLevel} here.`, '', '', step('thermal'), 'GNC');
    else add('bad', 'Radiation protection too weak', `Radiation here is level ${m.effectiveRadLevel}, but ${m.shield.name} protects to level ${m.shield.radRating}.`, 'Radiation damages electronics; reliability drops and the spacecraft may fail early.', 'In Thermal Protection / Propulsion choose an option with a higher radiation rating.', step('thermal'), 'GNC');
    // 8. Launch mass (FLIGHT/PAD)
    if (m.totalMass <= m.maxLiftCapacity) add('ok', 'Launch mass within rocket capacity', `${fmt(m.totalMass)} kg of ${fmt(m.maxLiftCapacity)} kg.`, '', '', step('chassis'), 'FLIGHT');
    else add('bad', 'Too heavy for the rocket', `The spacecraft weighs ${fmt(m.totalMass)} kg; ${m.rocket.name} can lift ${fmt(m.maxLiftCapacity)} kg to this orbit.`, 'An overweight spacecraft cannot reach its orbit.', 'Choose a bigger rocket (tab “Orbit & Rocket”), or lighter parts.', step('chassis'), 'FLIGHT');
    // 9. Budget (FLIGHT/PAD)
    if (m.totalCost <= m.maxBudget || sandbox) add('ok', 'Within budget', sandbox ? 'Sandbox: unlimited budget.' : `$${fmt(m.totalCost)}M of $${fmt(m.maxBudget)}M ($${fmt(m.maxBudget - m.totalCost)}M left).`, '', '', step('chassis'), 'FLIGHT');
    else add('bad', 'Over budget', `The mission costs $${fmt(m.totalCost)}M; the budget is $${fmt(m.maxBudget)}M ($${fmt(m.totalCost - m.maxBudget)}M over).`, 'NASA will not fund a mission that exceeds its budget.', 'Swap expensive parts for cheaper ones (each card shows its cost), or drop an instrument.', step('chassis'), 'FLIGHT');

    const bad = items.filter(i => i.status === 'bad').length, warn = items.filter(i => i.status === 'warn').length;
    // Final verdict must match the GO/NO-GO poll rules exactly
    const stations = computeGoNoGoStations(m);
    const pollGo = stations.every(st => st.go);
    const go = pollGo && bad === 0 && !(Number(m.hardFailures) > 0);
    return { items, bad, warn, go, stations, verdict: go ? (warn ? 'GO (with cautions)' : 'GO') : 'NO-GO', readiness: m.readiness };
}

function renderReadinessPanel(m) {
    const r = aeroReadiness(m);
    const icon = { ok: '✓', warn: '⚠', bad: '✕' };
    return `<div class="rd-head ${r.go ? 'go' : 'nogo'}"><div><span class="rd-k">MISSION READINESS</span><b>${r.verdict}</b><small>${r.go ? 'All launch rules are met.' : `${r.bad} item${r.bad === 1 ? '' : 's'} must be fixed before launch.`}${r.warn ? ` ${r.warn} caution${r.warn === 1 ? '' : 's'}.` : ''} Readiness score ${r.readiness}%.</small></div>
        <button class="bd-pri" ${r.go ? '' : 'disabled title="Fix the red items first"'} onclick="initiateGoNoGoPoll()">${r.go ? 'Start GO/NO-GO poll' : 'Not ready'} <i class="ph-bold ph-check-square-offset"></i></button></div>
        <ul class="rd-list">${r.items.map(i => `<li class="rd-item ${i.status}"><span class="rd-ic">${icon[i.status]}</span><div><b>${opsEsc(i.title)}</b>${i.station ? `<span class="rd-st">${i.station}</span>` : ''}<p>${opsEsc(i.what)}</p>
            ${i.status !== 'ok' ? `<p class="rd-why"><b>Why it matters:</b> ${opsEsc(i.why)}</p><p class="rd-how"><b>How to fix:</b> ${opsEsc(i.how)} <button class="rd-fix" onclick="buildGo(${i.fixStep})">Go to ${opsEsc(BUILD_STEPS[i.fixStep].title)} →</button></p>` : ''}</div></li>`).join('')}</ul>
        <p class="bd-tech">The checklist uses the same rules as the crew GO/NO-GO poll (EECOM power &amp; battery, GNC radiation, FIDO destination, SCIENCE data &amp; science, FLIGHT mass &amp; budget).</p>`;
}
BUILD_STEPS.push({ id: 'ready', title: 'Mission Readiness', icon: 'ph-list-checks', plain: 'A final check of every system before launch. Red items block launch; yellow items are cautions.' });

