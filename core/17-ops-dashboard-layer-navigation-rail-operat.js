/* A.T.L.A.S · section 14B — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 14B. OPS DASHBOARD LAYER — navigation rail, operations side panel,
 *      bottom mission dashboard, header status & ATLAS mode switching.
 *      Everything here READS the existing mission model
 *      (computeMissionMetrics / state / 3D sim state); it never changes
 *      budgets, scoring or scenario logic.
 ***********************************************************************/
const opsLayout = {
    wsCollapsed: false,
    userOpsPref: null,   // null = automatic by viewport width; true/false = user choice
    opsTab: 'telemetry',
    tabJustChanged: true,
    lastAtt: null
};

// Physical constants for Keplerian derivations (mean radius km, GM km^3/s^2)
const BODY_CONSTANTS = {
    earth:  { name: 'Earth',  R: 6371.0, mu: 398600.4 },
    moon:   { name: 'Moon',   R: 1737.4, mu: 4902.8 },
    mars:   { name: 'Mars',   R: 3389.5, mu: 42828.4 },
    europa: { name: 'Europa', R: 1560.8, mu: 3202.7 }
};
const COMMS_BAND_LABELS = {
    s_band: 'S-band (~2.2 GHz)',
    x_band: 'X-band (~8.4 GHz)',
    ka_dish: 'Ka-band (~32 GHz)',
    lasercomm: 'Optical (~1550 nm)'
};
const PAYLOAD_SHORT = {
    sar_radar: 'SAR', hyperspectral: 'HSI', ice_sounder: 'Sounder',
    laser_altimeter: 'LIDAR', magnetometer: 'MAG', mass_spec: 'Mass Spec'
};
const ATTITUDE_LABELS = {
    nadir: { name: 'Nadir science', target: 'Instruments → planet surface', effect: 'Nominal loads; SSR buffer filling' },
    dsn: { name: 'DSN downlink', target: 'High-gain antenna → Earth', effect: '+20% downlink (model); SSR draining' },
    sun: { name: 'Sun charge', target: 'Arrays → Sun', effect: '+15% solar input, −35% payload load (model)' },
    prograde: { name: 'ΔV burn (prograde)', target: 'Thrust axis → velocity vector', effect: 'Each burn raises apoapsis +150 km' }
};

const opsNum = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const opsEsc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtInt = n => Math.round(n).toLocaleString('en-US');

/* ---------------- Layout: rail / workstation / ops panel ---------------- */
function applyWorkspaceLayout() {
    const main = document.getElementById('opsWorkspace');
    if (!main) return;
    const w = window.innerWidth;
    const autoOps = opsLayout.wsCollapsed ? w >= 1200 : w >= 1800;
    const opsOpen = opsLayout.userOpsPref === null ? autoOps : opsLayout.userOpsPref;
    main.classList.toggle('ops-open', !!opsOpen);
    main.classList.toggle('ws-collapsed', !!opsLayout.wsCollapsed);
    const btn = document.getElementById('headerOpsPanelBtn');
    if (btn) btn.classList.toggle('is-active', !!opsOpen);
    syncRailUI();
    if (opsOpen) { opsLayout.tabJustChanged = true; renderOpsSidePanel(computeMissionMetrics()); }
    if (typeof appExperienceMode !== 'undefined' && appExperienceMode === 'game') {
        setTimeout(resizeThreeViewport, 60);
    }
}

function isOpsPanelOpen() {
    const main = document.getElementById('opsWorkspace');
    return !!(main && main.classList.contains('ops-open'));
}

function setWorkstationCollapsed(collapsed) {
    opsLayout.wsCollapsed = !!collapsed;
    applyWorkspaceLayout();
}

function toggleOpsSidePanel(force) {
    SoundFX.click();
    const next = (force === undefined || force === null) ? !isOpsPanelOpen() : !!force;
    opsLayout.userOpsPref = next;
    applyWorkspaceLayout();
}

function railNavigate(key) {
    switch (key) {
        case 'dashboard':
            SoundFX.click();
            setWorkstationCollapsed(!opsLayout.wsCollapsed);
            break;
        case 'directive': case 'bus': case 'payload': case 'orbit': case 'team':
            switchTab(key);
            break;
        case 'flight': initiateGoNoGoPoll(); break;
        case 'logs': openModal('leaderboardModal'); break;
        case 'explore': switchAppExperience('explore'); break;
        case 'menu': switchAppExperience('menu'); break;
        case 'settings': openModal('manualModal'); break;
    }
    syncRailUI();
}

function syncRailUI() {
    const active = opsLayout.wsCollapsed ? 'dashboard' : state.activeTab;
    document.querySelectorAll('#gameNavRail .ops-rail-btn').forEach(btn => {
        const on = btn.dataset.rail === active;
        btn.classList.toggle('is-active', on);
        if (on) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });
}

/* ---------------- Mission progress helpers ---------------- */
function getMissionStageChecks(m) {
    return [
        { num: 1, label: 'Bus & Power', ok: m.netWatts >= 0 && m.batteryMarginWh >= 0 && m.shield.radRating >= m.effectiveRadLevel },
        { num: 2, label: 'Instruments', ok: m.effectiveScience >= m.scenario.targetScience },
        { num: 3, label: 'Orbit & Comms', ok: m.totalMass <= m.maxLiftCapacity && m.dataCaptureRatio >= 0.95 && (m.orbit.body === m.scenario.targetBody || state.gameMode === 'sandbox') },
        { num: 4, label: 'Launch Poll', ok: m.hardFailures === 0 && m.readiness >= 80 }
    ];
}

function getMissionPhaseLabel() {
    const simModal = document.getElementById('simulationModal');
    if (simModal && !simModal.classList.contains('hidden') && typeof SIM_PHASES !== 'undefined') {
        const p = SIM_PHASES[state.sim.phase];
        return `Flight sim · ${p ? p.name.replace(/^\d+\.\s*/, '') : '—'}`;
    }
    if (state.ascent && state.ascent.active) return 'Ascent & staging (Pad 3A9)';
    if (state.ascent && state.ascent.stageIndex === 5) return 'On-orbit operations';
    if (state.missionExperienceActive) return `Guided ops · stage ${state.missionOpsStage}/4`;
    return 'Design & integration (VAB)';
}

function renderOpsHeaderStatus(m) {
    const pill = document.getElementById('headerMissionStatusPill');
    const txt = document.getElementById('headerMissionStatusText');
    if (pill && txt) {
        let cls = 'ops-status-go', label = `GO · ${m.readiness}%`;
        if (m.hardFailures > 0) { cls = 'ops-status-nogo'; label = `NO-GO · ${m.readiness}%`; }
        else if (m.readiness < 80) { cls = 'ops-status-caution'; label = `CAUTION · ${m.readiness}%`; }
        pill.className = `ops-status ${cls}`;
        txt.textContent = label;
    }
    const crit = m.diagnostics.filter(d => d.level === 'critical').length;
    const warn = m.diagnostics.filter(d => d.level === 'warning').length;
    const badge = document.getElementById('headerNotifBadge');
    if (badge) {
        const n = crit + warn;
        badge.textContent = n;
        badge.classList.toggle('hidden', n === 0);
        badge.classList.toggle('is-warn', crit === 0);
    }
    const modeEl = document.getElementById('headerAppModeLabel');
    if (modeEl) {
        const modeName = state.gameMode === 'coop'
            ? `CREW S${state.activeSeat}`
            : (state.gameMode === 'sandbox' ? 'SANDBOX' : 'SOLO');
        modeEl.textContent = `PLAY GAME · ${modeName}`;
        modeEl.title = state.gameMode === 'coop' ? `4-Player Mission Control — Seat ${state.activeSeat}` : (state.gameMode === 'sandbox' ? 'Sandbox (unlimited budget)' : 'Solo Architect');
    }
    const sub = document.getElementById('opsSideSubtitle');
    if (sub) sub.textContent = `${m.scenario.name} · ${m.orbit.name}`;
}

/* ---------------- Bottom operations dashboard ---------------- */
function renderDashboardAlertItems(diags, maxItems) {
    const rank = { critical: 0, warning: 1, info: 2, nominal: 3 };
    const sorted = [...diags].sort((a, b) => (rank[a.level] ?? 9) - (rank[b.level] ?? 9));
    const shown = sorted.slice(0, maxItems);
    const icons = { critical: 'ph-warning-octagon', warning: 'ph-warning', info: 'ph-info', nominal: 'ph-check-circle' };
    let html = shown.map(d => `
        <div class="ops-alert ops-alert-${d.level === 'info' ? 'warning' : d.level}" onclick="openModal('diagnosticsModal')" title="${opsEsc(d.msg)}">
            <i class="ph-fill ${icons[d.level] || 'ph-info'} text-[13px] mt-px shrink-0"></i>
            <div class="min-w-0">
                <b class="block truncate">${opsEsc(d.title)}</b>
                <div class="truncate opacity-80">${opsEsc(d.msg)}</div>
            </div>
        </div>`).join('');
    if (sorted.length > maxItems) {
        html += `<button onclick="openModal('diagnosticsModal')" class="ops-link text-left">+${sorted.length - maxItems} more advisories</button>`;
    }
    return html;
}

function renderMissionDashboard(m) {
    const phaseEl = document.getElementById('dashMissionPhase');
    if (phaseEl) phaseEl.textContent = getMissionPhaseLabel();

    const checks = getMissionStageChecks(m);
    const done = checks.filter(c => c.ok).length;
    const pf = document.getElementById('dashProgressFill');
    const pl = document.getElementById('dashProgressLabel');
    if (pf) pf.style.width = `${(done / checks.length) * 100}%`;
    if (pl) pl.textContent = `${done} / ${checks.length}`;

    const objEl = document.getElementById('dashObjective');
    if (objEl) {
        const crit = m.diagnostics.find(d => d.level === 'critical');
        const warn = m.diagnostics.find(d => d.level === 'warning');
        const firstOpen = checks.find(c => !c.ok);
        let obj;
        if (crit) obj = `Resolve: ${crit.title.toLowerCase()}`;
        else if (firstOpen) obj = `Complete stage ${firstOpen.num}: ${firstOpen.label}`;
        else if (warn) obj = `Optional: ${warn.title.toLowerCase()}`;
        else obj = 'Run GO/NO-GO poll & launch';
        objEl.textContent = obj;
        objEl.title = obj;
    }

    const crit = m.diagnostics.filter(d => d.level === 'critical').length;
    const warn = m.diagnostics.filter(d => d.level === 'warning').length;
    const sumEl = document.getElementById('dashAlertSummary');
    if (sumEl) {
        sumEl.innerHTML = (crit + warn) === 0
            ? '<span class="text-emerald-400">all nominal</span>'
            : `${crit ? `<span class="text-rose-300">${crit} crit</span>` : ''}${crit && warn ? ' · ' : ''}${warn ? `<span class="text-amber-300">${warn} warn</span>` : ''}`;
    }

    const sysEl = document.getElementById('dashSystemsList');
    if (sysEl) {
        const chips = m.activePayloads.length
            ? m.activePayloads.map(p => `<span class="ops-pill" title="${opsEsc(p.name)}">${PAYLOAD_SHORT[p.id] || p.name}</span>`).join('')
            : '<span class="text-[color:var(--text-muted)]">none equipped</span>';
        const arrays = m.powerSys.isSolar ? ` · arrays ${state.arraysDeployed ? 'deployed' : 'stowed'}` : ' · isotope (no arrays)';
        sysEl.innerHTML = `
            <div class="ops-sys-row" title="Equipped instruments (${state.payloads.length}/${m.chassis.maxPayloads} slots)"><i class="ph ph-aperture"></i><span class="flex flex-wrap gap-1 min-w-0">${chips}</span></div>
            <div class="ops-sys-row truncate" title="${opsEsc(m.powerSys.name)}"><i class="ph ph-sun"></i><span class="truncate"><b>${opsEsc(m.powerSys.name.split(' ').slice(0, 3).join(' '))}</b>${arrays}</span></div>
            <div class="ops-sys-row truncate" title="${opsEsc(m.battery.name)}"><i class="ph ph-battery-high"></i><span class="truncate"><b>${fmtInt(m.effectiveBatteryWh)} Wh</b> · ${opsEsc(m.battery.name)}</span></div>
            <div class="ops-sys-row truncate" title="${opsEsc(m.comms.name)}"><i class="ph ph-broadcast"></i><span class="truncate"><b>${COMMS_BAND_LABELS[m.comms.id] ? COMMS_BAND_LABELS[m.comms.id].split(' ')[0] : ''}</b> · ${opsEsc(m.comms.name)}</span></div>
            <div class="ops-sys-row truncate" title="${opsEsc(m.rocket.name)}"><i class="ph ph-rocket"></i><span class="truncate"><b>${opsEsc(m.rocket.name.split(' ')[0])}</b> · ${opsEsc(m.chassis.name)}</span></div>`;
    }
}

/* ---------------- Orbital derivations (Kepler / vis-viva) ---------------- */
function computeOrbitalState(m) {
    const c = BODY_CONSTANTS[m.orbit.body] || BODY_CONSTANTS.earth;
    const a = c.R + (m.pe + m.ap) / 2;
    const e = (m.ap - m.pe) / (2 * c.R + m.pe + m.ap);
    const E = ((opsNum(orbitAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const r = a * (1 - e * Math.cos(E));
    const v = Math.sqrt(c.mu * (2 / r - 1 / a));
    const vPe = Math.sqrt(c.mu * (2 / (c.R + m.pe) - 1 / a));
    const vAp = Math.sqrt(c.mu * (2 / (c.R + m.ap) - 1 / a));
    const periodMin = (2 * Math.PI * Math.sqrt(a * a * a / c.mu)) / 60;
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const inc = state.inclinationDeg * Math.PI / 180;
    const lat = Math.asin(Math.sin(inc) * Math.sin(nu)) * 180 / Math.PI;
    const lon = Math.atan2(Math.cos(inc) * Math.sin(nu), Math.cos(nu)) * 180 / Math.PI;
    return { body: c, a, e, alt: r - c.R, v, vPe, vAp, periodMin, nuDeg: ((nu * 180 / Math.PI) + 360) % 360, lat, lon };
}

/* ---------------- Right operations panel ---------------- */
function setOpsSideTab(tab) {
    SoundFX.click();
    opsLayout.opsTab = tab;
    opsLayout.tabJustChanged = true;
    renderOpsSidePanel(computeMissionMetrics());
}

function opsRow(k, v, src, cls = '') {
    const srcCls = { MODEL: 'ops-src-model', SIM: 'ops-src-sim', 'N/M': 'ops-src-nm' }[src] || 'ops-src-model';
    const vCls = src === 'N/M' ? 'is-nm' : cls;
    return `<div class="ops-row"><span class="ops-row-k">${k}</span><span class="ops-row-v ${vCls}">${v}</span><b class="ops-src ${srcCls}">${src}</b></div>`;
}
function opsHero(cells) {
    return `<div class="ops-hero">${cells.map(c => `<div class="ops-hero-cell"><div class="k">${c.k}</div><div class="v ${c.cls || ''}">${c.v}<span class="u">${c.u || ''}</span></div></div>`).join('')}</div>`;
}
function opsBar(pct, color) {
    return `<div class="ops-bar mt-1.5"><div class="ops-bar-fill" style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></div></div>`;
}

function renderOpsSidePanel(m) {
    if (!isOpsPanelOpen()) return;
    const body = document.getElementById('opsSidePanelBody');
    if (!body) return;
    document.querySelectorAll('#opsSidePanel .ops-side-tab').forEach(b => {
        const on = b.dataset.opsTab === opsLayout.opsTab;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const tab = opsLayout.opsTab;
    const orbitScenario = SCENARIOS.find(s => s.targetBody === m.orbit.body) || m.scenario;
    const flux = orbitScenario.solarFluxMultiplier;
    const inUmbra = !!state.inUmbraShadow;
    const live3D = cameraMode !== 'pad' && !(state.ascent && state.ascent.active);
    let html = '';

    if (tab === 'telemetry') {
        const o = computeOrbitalState(m);
        const radOk = m.shield.radRating >= m.effectiveRadLevel;
        html += opsHero([
            { k: 'Altitude (sim)', v: fmtInt(o.alt), u: 'km' },
            { k: 'Velocity (sim)', v: o.v.toFixed(2), u: 'km/s' }
        ]);
        html += `<div class="ops-group-title">Orbit — ${opsEsc(o.body.name)} · ${opsEsc(m.orbit.name)}</div>`;
        html += opsRow('Mean altitude', `${fmtInt((m.pe + m.ap) / 2)} km`, 'MODEL');
        html += opsRow('Periapsis × apoapsis', `${fmtInt(m.pe)} × ${fmtInt(m.ap)} km`, 'MODEL');
        html += opsRow('Inclination', `${state.inclinationDeg}°`, 'MODEL');
        html += opsRow('Eccentricity', m.eccentricity.toFixed(3), 'MODEL');
        html += opsRow('Orbital period', `${o.periodMin.toFixed(1)} min`, 'MODEL');
        html += opsRow('v periapsis / apoapsis', `${o.vPe.toFixed(2)} / ${o.vAp.toFixed(2)} km/s`, 'MODEL');
        html += opsRow('Mission ΔV budget', `${m.effectiveDeltaV} km/s`, 'MODEL');
        html += `<div class="ops-group-title">Spacecraft location</div>`;
        html += opsRow('True anomaly', `${o.nuDeg.toFixed(1)}°`, 'SIM');
        html += opsRow('Sub-spacecraft lat', `${o.lat >= 0 ? '+' : ''}${o.lat.toFixed(1)}°`, 'SIM');
        html += opsRow('Inertial longitude', `${o.lon >= 0 ? '+' : ''}${o.lon.toFixed(1)}°`, 'SIM');
        html += opsRow('Illumination', inUmbra ? 'UMBRA' : 'SUNLIT', 'SIM', inUmbra ? 'is-warn' : 'is-good');
        html += `<div class="ops-group-title">Environment</div>`;
        html += opsRow('Radiation level', `Lv ${m.effectiveRadLevel} / shield Lv ${m.shield.radRating}`, 'MODEL', radOk ? 'is-good' : 'is-bad');
        html += opsRow('Eclipse fraction', `${Math.round(m.effectiveEclipseFraction * 100)}% / orbit`, 'MODEL');
        html += `<div class="ops-note">Position uses Kepler's equation on your orbit with ${opsEsc(o.body.name)}'s GM; the animation runs on a visual time-scale, so position advances faster than real time.</div>`;
    } else if (tab === 'attitude') {
        const att = ATTITUDE_LABELS[state.flightAttitude] || ATTITUDE_LABELS.nadir;
        const rot = (spacecraftGroup && spacecraftGroup.rotation) ? spacecraftGroup.rotation : { x: 0, y: 0, z: 0 };
        const r2d = 180 / Math.PI;
        const roll = opsNum(rot.z) * r2d, pitch = opsNum(rot.x) * r2d, yaw = opsNum(rot.y) * r2d;
        const now = performance.now();
        let rates = { r: 0, p: 0, y: 0 };
        const prev = opsLayout.lastAtt;
        if (prev && now - prev.t > 50) {
            const dt = (now - prev.t) / 1000;
            const d = (a, b) => { let x = a - b; while (x > 180) x -= 360; while (x < -180) x += 360; return x / dt; };
            rates = { r: d(roll, prev.roll), p: d(pitch, prev.pitch), y: d(yaw, prev.yaw) };
        }
        opsLayout.lastAtt = { t: now, roll, pitch, yaw };
        const sgn = x => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`;
        html += opsHero([
            { k: 'Pointing mode', v: att.name.split(' ')[0], u: '' },
            { k: 'View', v: cameraMode.toUpperCase(), u: '' }
        ]);
        html += `<div class="ops-group-title">Commanded attitude</div>`;
        html += opsRow('Mode', att.name, 'MODEL');
        html += opsRow('Pointing target', att.target, 'MODEL');
        html += opsRow('Model effect', att.effect, 'MODEL');
        html += opsRow('ADCS hardware', opsEsc(m.shield.name.split(' ').slice(0, 3).join(' ')), 'MODEL');
        html += `<div class="ops-group-title">3D model orientation ${live3D ? '' : '(paused on pad)'}</div>`;
        html += opsRow('Roll', `${sgn(roll)}°`, 'SIM');
        html += opsRow('Pitch', `${sgn(pitch)}°`, 'SIM');
        html += opsRow('Yaw', `${sgn(yaw)}°`, 'SIM');
        html += opsRow('Rates r / p / y', `${sgn(rates.r)} / ${sgn(rates.p)} / ${sgn(rates.y)} °/s`, 'SIM');
        html += opsRow('Pointing error / jitter', '—', 'N/M');
        html += `<div class="ops-note">Euler angles are read from the 3D spacecraft model (inertial scene frame, visual time-scale). Change the commanded mode with the ATTITUDE buttons in the viewport.</div>`;
    } else if (tab === 'thermal') {
        const radOk = m.shield.radRating >= m.effectiveRadLevel;
        html += opsHero([
            { k: 'Illumination', v: inUmbra ? 'UMBRA' : 'SUNLIT', cls: inUmbra ? 'text-amber-300' : 'text-emerald-300' },
            { k: 'Solar flux', v: `${Math.round(flux * 100)}`, u: '% of 1 AU' }
        ]);
        html += `<div class="ops-group-title">Thermal & environmental control</div>`;
        html += opsRow('Subsystem', opsEsc(m.shield.name.split(' ').slice(0, 3).join(' ')), 'MODEL');
        html += opsRow('Control power draw', `${m.shield.powerDraw} W`, 'MODEL');
        html += opsRow('Eclipse exposure', `${Math.round(m.effectiveEclipseFraction * 100)}% / orbit`, 'MODEL');
        html += opsRow('Radiation margin', radOk ? `+${m.shield.radRating - m.effectiveRadLevel} Lv` : `${m.shield.radRating - m.effectiveRadLevel} Lv`, 'MODEL', radOk ? 'is-good' : 'is-bad');
        html += opsRow('Reliability (incl. rad.)', `${m.reliability}%`, 'MODEL', m.reliability >= 85 ? 'is-good' : 'is-warn');
        html += `<div class="ops-group-title">Temperatures</div>`;
        html += opsRow('Avionics temperature', '—', 'N/M');
        html += opsRow('Battery temperature', '—', 'N/M');
        html += opsRow('Heater duty cycle', '—', 'N/M');
        if (m.orbit.body === 'moon') html += opsRow('PSR floor (reference)', '≈ 38 K', 'MODEL');
        if (m.orbit.body === 'mars') html += opsRow('Dust optical depth τ', state.marsDustStormActive ? '2.4 (storm)' : '0.45', 'SIM');
        html += `<div class="ops-note">${opsEsc(m.shield.desc)} The simulator has no thermal model, so temperatures are not shown rather than invented.</div>`;
    } else if (tab === 'power') {
        const busW = 45 + m.shield.powerDraw + m.comms.power;
        const payloadW = m.totalWattsRequired - busW;
        const liveGen = (m.powerSys.isSolar && inUmbra) ? 0 : m.generatedWatts;
        const netCls = m.netWatts >= 0 ? 'text-emerald-300' : 'text-rose-300';
        html += opsHero([
            { k: 'Net balance', v: `${m.netWatts >= 0 ? '+' : ''}${m.netWatts}`, u: 'W', cls: netCls },
            { k: 'Battery', v: fmtInt(m.effectiveBatteryWh), u: 'Wh' }
        ]);
        html += `<div class="ops-group-title">Generation — ${opsEsc(m.powerSys.isSolar ? 'solar arrays' : 'radioisotope')}</div>`;
        html += opsRow('Sunlit output', `${m.generatedWatts} W`, 'MODEL');
        html += opsRow('Output now', `${liveGen} W${(m.powerSys.isSolar && inUmbra) ? ' (eclipse)' : ''}`, 'SIM', liveGen === 0 ? 'is-warn' : '');
        html += opsRow('Arrays', m.powerSys.isSolar ? (state.arraysDeployed ? 'Deployed' : 'Stowed') : 'n/a (MMRTG)', 'SIM');
        html += `<div class="ops-group-title">Consumption</div>`;
        html += opsRow('Total load', `${m.totalWattsRequired} W`, 'MODEL');
        html += opsRow('Payloads / bus', `${payloadW} / ${busW} W`, 'MODEL');
        html += opsBar((m.totalWattsRequired / Math.max(1, m.generatedWatts)) * 100, m.netWatts >= 0 ? '#fbbf24' : '#fb7185');
        html += `<div class="ops-group-title">Energy storage</div>`;
        html += opsRow('Eclipse demand', `${fmtInt(m.eclipseEnergyReqWh)} Wh`, 'MODEL');
        html += opsRow('Battery margin', `${m.batteryMarginWh >= 0 ? '+' : ''}${fmtInt(m.batteryMarginWh)} Wh`, 'MODEL', m.batteryMarginWh >= 0 ? 'is-good' : 'is-bad');
        html += opsRow('EECOM +15% reserve', state.eecomReserveActive ? 'ON' : 'OFF', 'MODEL');
        html += opsRow('PI overclock', state.scienceOverclockActive ? 'ACTIVE (+25% W)' : 'OFF', 'MODEL');
        html += opsRow('Bus voltage', '—', 'N/M');
        html += opsRow('State of charge', '—', 'N/M');
    } else if (tab === 'comms') {
        const cap = Math.round(m.dataCaptureRatio * 100);
        const status = m.dataGeneratedGbps === 0 ? 'IDLE' : (cap >= 95 ? 'NOMINAL' : (cap >= 85 ? 'DEGRADED' : 'BOTTLENECK'));
        const stCls = status === 'NOMINAL' ? 'is-good' : (status === 'IDLE' ? '' : (status === 'DEGRADED' ? 'is-warn' : 'is-bad'));
        html += opsHero([
            { k: 'Downlink', v: `${m.effectiveDownlinkGbps}`, u: 'Gbps' },
            { k: 'Data capture', v: `${cap}`, u: '%', cls: cap >= 95 ? 'text-emerald-300' : 'text-amber-300' }
        ]);
        html += `<div class="ops-group-title">Link</div>`;
        html += opsRow('Signal status', status, 'MODEL', stCls);
        html += opsRow('Band', COMMS_BAND_LABELS[m.comms.id] || '—', 'MODEL');
        html += opsRow('Terminal', opsEsc(m.comms.name.split(' ').slice(0, 3).join(' ')), 'MODEL');
        html += opsRow('Distance efficiency', `×${orbitScenario.commsDistancePenalty.toFixed(2)}`, 'MODEL');
        html += opsRow('DSN pointing boost', state.flightAttitude === 'dsn' ? '+20% (active)' : 'off', 'MODEL');
        html += opsRow('Terminal power', `${m.comms.power} W`, 'MODEL');
        html += `<div class="ops-group-title">Data</div>`;
        html += opsRow('Instrument data rate', `${m.dataGeneratedGbps} Gbps`, 'MODEL');
        html += opsRow('Downlink capacity', `${m.effectiveDownlinkGbps} Gbps`, 'MODEL');
        html += opsRow('Solid-state recorder', `${Math.round(opsNum(state.ssrFillPct))}% full`, 'SIM', state.ssrFillPct > 85 ? 'is-warn' : '');
        html += opsBar(opsNum(state.ssrFillPct), '#a78bfa');
        html += opsRow('Uplink', '—', 'N/M');
    }

    body.innerHTML = `<div class="${opsLayout.tabJustChanged ? 'tab-anim' : ''}">${html}</div>`;
    opsLayout.tabJustChanged = false;
}

function tickOpsLiveTelemetry() {
    if (typeof appExperienceMode === 'undefined' || appExperienceMode !== 'game') return;
    if (document.hidden) return;
    const phaseEl = document.getElementById('dashMissionPhase');
    if (phaseEl) phaseEl.textContent = getMissionPhaseLabel();
    if (isOpsPanelOpen()) renderOpsSidePanel(computeMissionMetrics());
}

/* ---------------- ATLAS: planetary-guide mode (Let's Explore / Main Menu) ---------------- */
const NEXI_CHIPS = {
    game: [
        ['Why is my mission GO or NO-GO?', 'Check GO/NO-GO?', 'text-cyan-300'],
        ['Why is my power negative or battery low?', 'Power & Battery?', 'text-amber-300'],
        ['Which instruments are best for my mission?', 'Best Instruments?', 'text-emerald-300'],
        ['What is periapsis and apoapsis?', 'Orbit & Staging?', 'text-purple-300']
    ],
    explore: [
        ['tell me about this world', 'About this world', 'text-cyan-300'],
        ['cosmic history timeline', 'Its history?', 'text-purple-300'],
        ['which missions explored it', 'Missions?', 'text-amber-300'],
        ['compare size and distance', 'Size & distance?', 'text-emerald-300'],
        ['how do I control the camera', 'Camera controls?', 'text-sky-300']
    ]
};

function renderNexiChipsForMode(mode) {
    if (nexiState.chipMode === mode) return;
    nexiState.chipMode = mode;
    const wrap = document.getElementById('nexiQuickChips');
    const lab = document.getElementById('nexiQuickChipsLabel');
    const sub = document.getElementById('nexiSubtitle');
    const miniT = document.getElementById('nexiMiniTitle');
    if (wrap) {
        wrap.innerHTML = NEXI_CHIPS[mode].map(([q, label, col]) =>
            `<button onclick="askNexiQuestion('${q.replace(/'/g, "\\'")}')" class="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 ${col} border border-slate-700/80 text-[10px] font-mono">${label}</button>`
        ).join('');
    }
    if (lab) lab.textContent = mode === 'game' ? 'Quick Telemetry Queries:' : 'Planetary Science Questions:';
    if (sub) sub.textContent = mode === 'game' ? 'Engineering & Mission-Control Assistant' : 'Planetary Science Guide';
    if (miniT) miniT.textContent = mode === 'game' ? 'ATLAS · MISSION ASSISTANT' : 'ATLAS · PLANETARY GUIDE';
    const input = document.getElementById('nexiQuestionInput');
    if (input) input.placeholder = mode === 'game' ? 'Ask ATLAS (e.g. How do I increase science?)' : 'Ask ATLAS (e.g. Tell me about Mars)';
}

function renderNexiPlanetaryGuideMode() {
    renderNexiChipsForMode('explore');
    const entry = SOLAR_SYSTEM_DATABASE.find(b => b.id === solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    const tutBar = document.getElementById('nexiTutorialBar');
    if (tutBar) tutBar.classList.add('hidden');
    const teamAlertBox = document.getElementById('nexiTeamAlertBox');
    if (teamAlertBox) teamAlertBox.classList.add('hidden');
    const modeTag = document.getElementById('nexiModeTag');
    if (modeTag) modeTag.textContent = 'PLANETARY GUIDE';
    const roleBadge = document.getElementById('nexiRoleContextBadge');
    if (roleBadge) roleBadge.textContent = appExperienceMode === 'menu' ? 'MAIN MENU' : `EXPLORER // ${entry.name.toUpperCase()}`;
    const headerMount = document.getElementById('nexiAvatarHeaderMount');
    const miniMount = document.getElementById('nexiAvatarMiniMount');
    if (headerMount) headerMount.innerHTML = renderNexiRobotSVG('nominal');
    if (miniMount) miniMount.innerHTML = renderNexiRobotSVG('nominal');
    const msg = nexiState.lastCustomAnswer || (appExperienceMode === 'menu'
        ? 'Welcome to A.T.L.A.S. Choose LET\'S EXPLORE to tour the Solar System and its 4.6-billion-year history, or PLAY GAME to design, launch and fly a spacecraft mission.'
        : entry.nexiQuote);
    const ctx = document.getElementById('nexiContextHeader');
    if (ctx) ctx.textContent = nexiState.lastCustomAnswer ? 'ATLAS PLANETARY SCIENCE RESPONSE' : 'PLANETARY SCIENCE BRIEF';
    const speech = document.getElementById('nexiSpeechText');
    if (speech) speech.textContent = msg;
    const mini = document.getElementById('nexiMiniSubtext');
    if (mini) mini.textContent = msg;
    if (appExperienceMode === 'explore') noteExplorerNexiMessage(msg);
}

function generateNexiPlanetaryAnswer(q) {
    const byName = SOLAR_SYSTEM_DATABASE.find(b => b.id !== 'solar_system' && (
        new RegExp('\\b' + shortBodyName(b).toLowerCase() + '\\b').test(q) || (b.id === 'moon' && /\bluna\b/.test(q))
    ));
    const entry = byName || SOLAR_SYSTEM_DATABASE.find(b => b.id === solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    if (byName && byName.id !== solarSelectedBodyId && appExperienceMode === 'explore') {
        setTimeout(() => selectSolarBody(byName.id), 0);
    }
    if (q.includes('camera') || q.includes('control') || q.includes('zoom') || q.includes('rotate')) {
        return 'Camera: drag to orbit, Shift-drag or right-drag to pan, scroll to zoom. Use Full System, Focus Orbit and Close-Up at the top of the viewport, or Expand 3D View for a larger scene. The ORBITS bar controls the orbit animation; the Cosmic History panel has its own Earlier / Later / Auto-Tour controls.';
    }
    if (q.includes('history') || q.includes('era') || q.includes('timeline') || q.includes('form')) {
        const evs = entry.history || [];
        const ev = (q.includes('form') ? evs[0] : evs[Math.min(timelineCurrentIndex, evs.length - 1)]) || evs[0];
        return ev ? `${entry.name} history has ${evs.length} eras on the Cosmic History panel. ${ev.date} — ${ev.title} [${ev.type}]. ${ev.desc} Dates are approximate scientific estimates; history visuals are illustrative reconstructions.` : entry.nexiQuote;
    }
    if (q.includes('geolog') || q.includes('feature') || q.includes('terrain')) {
        const f = SOLAR_BODY_FACTS[entry.id] || {};
        return `${entry.name} geology: ${f.geology || entry.surfaceAtmo}`;
    }
    if (q.includes('mission') || q.includes('explor') || q.includes('spacecraft')) {
        return `Missions to ${entry.name}: ${entry.missions}`;
    }
    if (q.includes('size') || q.includes('distance') || q.includes('compare') || q.includes('big') || q.includes('far')) {
        return `${entry.name} — diameter ${entry.diameter}; distance from the Sun ${entry.distanceFromSun}; orbital period ${entry.orbitalPeriod}; rotation ${entry.rotationPeriod}.`;
    }
    if (q.includes('atmo') || q.includes('surface') || q.includes('weather')) {
        return `${entry.name} surface & atmosphere: ${entry.surfaceAtmo}`;
    }
    return `${entry.nexiQuote} Key discoveries: ${entry.discoveries}`;
}

