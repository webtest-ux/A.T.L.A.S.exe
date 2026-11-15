/* A.T.L.A.S · section 16L — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16L. PLAY GAME — SIMPLIFIED MISSION DASHBOARD (Cadet / Engineer)
 *      Four indicators (Budget, Energy, Science, Safety) computed directly
 *      from computeMissionMetrics() and the readiness rules. Expandable
 *      ENGINEERING DETAILS. Mission Control keeps the full telemetry
 *      dashboard unchanged.
 ***********************************************************************/
function renderSimpleDashboard() {
    const el = document.getElementById('simpleDashPanel');
    if (!el) return;
    const mode = state.difficulty === 'director' ? 'director' : (state.difficulty === 'cadet' ? 'cadet' : 'engineer');
    el.classList.toggle('hidden', mode === 'director');
    if (mode === 'director') return;
    let m;
    try { m = computeMissionMetrics(); } catch (e) { return; }
    const r = aeroReadiness(m), sc = m.scenario, sandbox = state.gameMode === 'sandbox';
    const pct = (a, b) => Math.max(0, Math.min(100, Math.round(a / Math.max(1e-9, b) * 100)));
    const fmt = n => Math.round(n).toLocaleString('en-US');
    const tech = mode === 'engineer';

    const left = m.maxBudget - m.totalCost;
    const budget = sandbox ? { st: 'ok', big: 'Unlimited', bar: 100, desc: 'Sandbox mode has no budget limit.', t: `Spent $${fmt(m.totalCost)}M` }
        : { st: left < 0 ? 'bad' : (left < m.maxBudget * 0.1 ? 'warn' : 'ok'), big: left < 0 ? `−$${fmt(-left)}M` : `$${fmt(left)}M`, bar: pct(Math.max(0, left), m.maxBudget),
            desc: left < 0 ? `Over budget — the mission costs $${fmt(m.totalCost)}M of $${fmt(m.maxBudget)}M.` : `left of $${fmt(m.maxBudget)}M to spend.`,
            t: `Cost $${fmt(m.totalCost)}M / cap $${fmt(m.maxBudget)}M (${pct(m.totalCost, m.maxBudget)}%)` };
    const energy = { st: m.netWatts < 0 ? 'bad' : (m.batteryMarginWh < 0 ? 'warn' : 'ok'), big: `${m.netWatts >= 0 ? '+' : '−'}${fmt(Math.abs(m.netWatts))} W`,
        bar: pct(m.generatedWatts, m.totalWattsRequired),
        desc: m.netWatts < 0 ? `Not enough electricity: making ${fmt(m.generatedWatts)} W, needs ${fmt(m.totalWattsRequired)} W.`
            : (m.batteryMarginWh < 0 ? 'Enough in sunlight, but the battery runs out in the planet’s shadow.' : 'Spare electricity, and the battery lasts through the shadow.'),
        t: `Gen ${fmt(m.generatedWatts)} W · load ${fmt(m.totalWattsRequired)} W · battery margin ${m.batteryMarginWh >= 0 ? '+' : ''}${fmt(m.batteryMarginWh)} Wh` };
    const sciRatio = m.effectiveScience / sc.targetScience;
    const science = { st: sciRatio >= 1 ? 'ok' : (sciRatio >= 0.8 ? 'warn' : 'bad'), big: `${fmt(m.effectiveScience)}`, bar: pct(m.effectiveScience, sc.targetScience),
        desc: sciRatio >= 1 ? `points — goal of ${sc.targetScience} reached.` : `of ${sc.targetScience} points needed${sciRatio >= 0.8 ? ' (close enough to launch)' : ''}.`,
        t: `Data delivered ${Math.round(m.dataCaptureRatio * 100)}% · ${state.payloads.length} instruments` };
    const hf = Number(m.hardFailures) || 0;
    const safety = { st: r.go ? (r.warn ? 'warn' : 'ok') : 'bad', big: r.go ? (r.warn ? 'GO*' : 'GO') : 'NO-GO', bar: Math.round(m.reliability),
        desc: r.go ? (r.warn ? `Ready, with ${r.warn} caution${r.warn > 1 ? 's' : ''}.` : 'All safety and launch rules are met.') : `${r.bad} problem${r.bad > 1 ? 's' : ''} to fix before launch.`,
        t: `Critical faults ${hf} · reliability ${m.reliability}% · readiness ${m.readiness}%` };
    const cards = [['Budget', 'ph-coins', budget, 'How much mission money is left'], ['Energy', 'ph-lightning', energy, 'Spare electrical power'],
        ['Science', 'ph-flask', science, 'Science expected vs. the mission goal'], ['Safety', 'ph-shield-check', safety, 'Are all operating limits met?']];
    const barLabel = { Budget: 'remaining', Energy: 'power made vs needed', Science: 'of goal', Safety: 'reliability' };

    const rows = [
        ['Mass', `${fmt(m.totalMass)} kg of ${fmt(m.maxLiftCapacity)} kg rocket capacity`],
        ['Power generation', `${fmt(m.generatedWatts)} W`],
        ['Power consumption', `${fmt(m.totalWattsRequired)} W`],
        ['Battery capacity', `${fmt(m.effectiveBatteryWh)} Wh (needs ${fmt(m.eclipseEnergyReqWh)} Wh in ${Math.round(m.effectiveEclipseFraction * 100)}% shadow)`],
        ['DSN bandwidth', `${m.effectiveDownlinkGbps} Gbps (${m.comms.name}; mission minimum ${sc.minDownlink})`],
        ['Science data generation', `${m.dataGeneratedGbps} Gbps`],
        ['Communication performance', `${Math.round(m.dataCaptureRatio * 100)}% of science data reaches Earth`],
        ['Orbital parameters', `${m.pe} × ${m.ap} km, ${state.inclinationDeg}° inclination, e = ${Number(m.eccentricity).toFixed(3)}, Δv ${m.effectiveDeltaV} km/s · ${m.orbit.name}`],
        ['Engineering assurance', `${m.reliability}% (radiation level ${m.effectiveRadLevel} vs protection ${m.shield.radRating})`]
    ];
    const det = el.querySelector('details');
    const open = (det && el.dataset.mode === mode) ? det.open : tech;
    el.dataset.mode = mode;
    el.innerHTML = `<div class="sd-head"><b>${tech ? 'ENGINEERING DASHBOARD' : 'MISSION DASHBOARD'}</b><span>${opsEsc(sc.name)}</span>
            <button class="sd-link" onclick="openSpacecraftBuilder(BUILD_STEPS.findIndex(s => s.id === 'ready'))">Readiness checklist →</button></div>
        <div class="sd-grid">${cards.map(([name, icon, c, help]) => `<div class="sd-card ${c.st}" title="${help}">
            <div class="sd-top"><i class="ph-fill ${icon}"></i><span>${name.toUpperCase()}</span><em>${c.st === 'ok' ? 'Good' : c.st === 'warn' ? 'Check' : 'Fix'}</em></div>
            <div class="sd-big">${c.big}</div><p>${opsEsc(c.desc)}</p>
            <div class="sd-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.bar}" aria-label="${name}"><i style="width:${c.bar}%"></i></div>
            <small>${c.bar}% ${barLabel[name]}</small>${tech ? `<code>${opsEsc(c.t)}</code>` : ''}</div>`).join('')}</div>
        <details class="sd-details" ${open ? 'open' : ''}><summary>ENGINEERING DETAILS</summary>
            <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${opsEsc(v)}</dd></div>`).join('')}</dl></details>`;
}
const _sdRenderAllUI = renderAllUI;
renderAllUI = function () {
    _sdRenderAllUI.apply(this, arguments);
    try { renderSimpleDashboard(); } catch (e) { aeroReportError('mission dashboard', e); }
};
const _sdApplyMode = applyExperienceMode;
applyExperienceMode = function (mode) { _sdApplyMode(mode); renderSimpleDashboard(); };
const _sdChangeDiff = changeDifficulty;
changeDifficulty = function (d) { _sdChangeDiff(d); if (document.body.className.match(/xp-/)) applyExperienceMode(d); };

