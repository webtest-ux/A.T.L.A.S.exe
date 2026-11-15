/* A.T.L.A.S · section 16Q — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16Q. CREW ROLES — beginner-friendly multiplayer explanations
 *      Presentation layer only: reads playerCrewState.coopSeats, state
 *      and computeMissionMetrics(); never writes seat/room/sync state.
 *      Cadet → plain-language roles + "how crew play works".
 *      Engineer / Mission Control → detailed responsibilities + live
 *      station criteria (same rules as the GO/NO-GO poll).
 ***********************************************************************/
const CREW_ROLES = {
    FLIGHT: {
        icon: 'ph-crown-simple', color: '#fbbf24',
        plain: 'The team captain. Picks the mission, watches the money and makes the final “let’s launch” call.',
        tasks: ['Choose the mission', 'Keep the cost under budget', 'Say GO when everyone is ready'],
        detail: ['Mission directive & scenario selection', 'Budget authority — total cost vs. cap ($M)', 'Lift margin — total mass vs. derated launcher capacity', 'Runs the GO/NO-GO poll and authorizes launch'],
        check: m => ({
            plain: m.totalCost > m.maxBudget ? 'Over budget' : m.totalMass > m.maxLiftCapacity ? 'Too heavy for the rocket' : 'Money and weight are OK',
            tech: `Cost $${Math.round(m.totalCost)}M / $${Math.round(m.maxBudget)}M · Mass ${Math.round(m.totalMass)} / ${Math.round(m.maxLiftCapacity)} kg` })
    },
    EECOM: {
        icon: 'ph-lightning', color: '#facc15',
        plain: 'The power keeper. Makes sure the spacecraft has enough electricity, even in the planet’s shadow.',
        tasks: ['Pick solar panels or an RTG', 'Pick a big enough battery', 'Add radiation shielding'],
        detail: ['Spacecraft bus, power source & battery sizing', 'Power balance: generated − load ≥ 0 W', 'Eclipse energy: battery Wh ≥ umbra demand', 'Radiation shielding & thermal configuration'],
        check: m => ({
            plain: m.netWatts < 0 ? 'Not enough electricity' : m.batteryMarginWh < 0 ? 'Battery too small for the shadow' : 'Power is healthy',
            tech: `Net ${m.netWatts >= 0 ? '+' : ''}${Math.round(m.netWatts)} W · Battery margin ${Math.round(m.batteryMarginWh)} Wh` })
    },
    SCIENCE: {
        icon: 'ph-flask', color: '#34d399',
        plain: 'The explorer. Chooses the instruments that make discoveries and makes sure enough data gets home.',
        tasks: ['Choose science instruments', 'Reach the science target', 'Make sure data gets back to Earth'],
        detail: ['Payload selection & slot allocation', 'Science yield ≥ 80% of target for GO', 'Data capture: downlink / generated ≥ 85%', 'Orbit-synergy & PI overclock decisions'],
        check: m => ({
            plain: m.effectiveScience < 0.8 * m.scenario.targetScience ? 'Need more or better instruments' : m.dataCaptureRatio < 0.85 ? 'Too much data stuck on board' : 'Science plan looks good',
            tech: `Science ${Math.round(m.effectiveScience)} / ${m.scenario.targetScience} · Capture ${Math.round(m.dataCaptureRatio * 100)}%` })
    },
    FIDO: {
        icon: 'ph-planet', color: '#818cf8',
        plain: 'The navigator. Chooses the path around the planet and the radio that talks to Earth.',
        tasks: ['Pick the orbit', 'Set the closest and farthest points', 'Pick the radio system'],
        detail: ['Orbit regime, periapsis/apoapsis, inclination', 'Target-body match & Δv budget', 'DSN transceiver selection (downlink Gbps)', 'Pad 3A9 ascent & staging commands'],
        check: m => ({
            plain: m.orbit && m.orbit.body === m.scenario.targetBody ? 'Orbit goes to the right place' : 'Orbit is around the wrong world',
            tech: `Orbit ${m.orbit ? m.orbit.name : '—'} · Pe ${Math.round(m.pe)} / Ap ${Math.round(m.ap)} km · Δv ${Number(m.effectiveDeltaV).toFixed(1)} km/s` })
    }
};
const crewCadet = () => state.difficulty === 'cadet';

const CREW_STATIONS = { FLIGHT: ['FLIGHT / PAD'], EECOM: ['EECOM', 'GNC'], SCIENCE: ['SCIENCE'], FIDO: ['FIDO'] };
// Green/red comes from the poll's own station rules; the role text only explains it
function crewCheck(code, m) {
    const r = CREW_ROLES[code], c = r.check(m);   // text only
    const st = computeGoNoGoStations(m).filter(s => CREW_STATIONS[code].includes(s.code));
    c.ok = st.length > 0 && st.every(s => s.go);
    if (code === 'EECOM' && c.ok === false && m.netWatts >= 0 && m.batteryMarginWh >= 0) c.plain = 'Radiation shielding too weak';
    if (c.ok) c.plain = { FLIGHT: 'Money and weight are OK', EECOM: 'Power and protection are healthy', SCIENCE: 'Science plan looks good', FIDO: 'Orbit goes to the right place' }[code];
    return c;
}
function crewRoleHTML(code, m, compact) {
    const r = CREW_ROLES[code]; if (!r) return '';
    const c = crewCheck(code, m), cadet = crewCadet();
    const status = `<div class="crew-st ${c.ok ? 'ok' : 'bad'}"><i class="ph-fill ${c.ok ? 'ph-check-circle' : 'ph-warning-circle'}"></i> ${opsEsc(cadet ? c.plain : c.tech)}</div>`;
    if (compact) return status;
    return cadet
        ? `<p class="crew-plain">${opsEsc(r.plain)}</p><ul class="crew-list">${r.tasks.map(t => `<li>${opsEsc(t)}</li>`).join('')}</ul>${status}`
        : `<ul class="crew-list tech">${r.detail.map(t => `<li>${opsEsc(t)}</li>`).join('')}</ul>${status}`;
}

/* ---------- Lobby: role explanation on each seat card + Cadet intro ---------- */
const _crewLobby = renderCoopLobbyModal;
renderCoopLobbyModal = function () {
    const r = _crewLobby.apply(this, arguments);
    try {
        const grid = document.getElementById('coopLobbySlotsGrid'); if (!grid) return r;
        const m = computeMissionMetrics();
        [...grid.children].forEach((card, i) => {
            const seat = playerCrewState.coopSeats[i + 1]; if (!seat) return;
            const box = document.createElement('div');
            box.className = 'crew-explain no-terms';
            box.innerHTML = `<b style="color:${CREW_ROLES[seat.roleCode] ? CREW_ROLES[seat.roleCode].color : '#67e8f9'}"><i class="ph-fill ${(CREW_ROLES[seat.roleCode] || {}).icon || 'ph-user'}"></i> ${crewCadet() ? 'What this job is' : 'Station responsibilities'}</b>${crewRoleHTML(seat.roleCode, m)}`;
            card.appendChild(box);
        });
        let intro = document.getElementById('crewIntro');
        if (crewCadet()) {
            if (!intro) { intro = document.createElement('details'); intro.id = 'crewIntro'; intro.open = true; grid.parentNode.insertBefore(intro, grid); }
            intro.innerHTML = `<summary><i class="ph-fill ph-graduation-cap"></i> New to crew play? How it works</summary>
                <ol><li><b>Everyone builds one spacecraft together.</b> Each player has one job (a “seat”).</li>
                <li><b>Click a seat card</b> to choose your job, your astronaut and your name, then press <b>READY</b>.</li>
                <li><b>Do your part</b> — the green/red line on your card shows if your part is ready.</li>
                <li><b>FLIGHT makes the final call.</b> When all four parts are green, you launch together.</li></ol>
                <p>Playing alone? Use <b>Solo</b> mode — you do all four jobs with ATLAS’s help.</p>`;
        } else if (intro) intro.remove();
    } catch (e) { /* explanation layer must never break the lobby */ }
    return r;
};

/* ---------- In-game: current seat's role strip in the co-op bar ---------- */
function renderCrewRoleNow() {
    const bar = document.getElementById('coopRoleBar');
    if (!bar || bar.classList.contains('hidden')) return;
    const seat = playerCrewState.coopSeats[state.activeSeat] || playerCrewState.coopSeats[1];
    const role = CREW_ROLES[seat.roleCode]; if (!role) return;
    let el = document.getElementById('crewRoleNow');
    if (!el) { el = document.createElement('div'); el.id = 'crewRoleNow'; el.className = 'no-terms'; bar.appendChild(el); }
    const m = computeMissionMetrics(), cadet = crewCadet();
    const team = Object.keys(CREW_ROLES).map(code => { const c = crewCheck(code, m); return `<span class="crew-chip ${c.ok ? 'ok' : 'bad'}" title="${opsEsc(cadet ? c.plain : c.tech)}">${c.ok ? '●' : '○'} ${code}</span>`; }).join('');
    el.innerHTML = `<div class="crew-now-head"><i class="ph-fill ${role.icon}" style="color:${role.color}"></i><b>${cadet ? 'Your job' : 'Your station'}: ${seat.roleCode}</b><span>${opsEsc(cadet ? role.plain : seat.roleTitle)}</span></div>
        ${cadet ? `<div class="crew-now-tasks">${role.tasks.map(t => `<span>${opsEsc(t)}</span>`).join('')}</div>` : ''}
        ${crewRoleHTML(seat.roleCode, m, true)}<div class="crew-team">${cadet ? 'Team:' : 'Stations:'} ${team}</div>`;
}
const _crewRender = renderAllUI;
renderAllUI = function () { _crewRender.apply(this, arguments); try { renderCrewRoleNow(); } catch (e) {} };

/* ---------- Seat buttons: role tooltip (Cadet plain, advanced detailed) ---------- */
const _crewSeatBar = renderCoopSeatCardsBar;
renderCoopSeatCardsBar = function () {
    const r = _crewSeatBar.apply(this, arguments);
    try { [1, 2, 3, 4].forEach(n => { const b = document.getElementById('seatBtn-' + n), s = playerCrewState.coopSeats[n], role = s && CREW_ROLES[s.roleCode];
        if (b && role) b.title = `${s.roleCode} — ${crewCadet() ? role.plain : role.detail.join(' · ')}`; }); } catch (e) {}
    return r;
};

