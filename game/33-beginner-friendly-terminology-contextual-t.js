/* A.T.L.A.S · section 16O — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16O. BEGINNER-FRIENDLY TERMINOLOGY — contextual tooltips + glossary
 *      Terms found in PLAY GAME text get a dotted underline. Hover, focus
 *      or tap shows: Cadet → the plain explanation first; Engineer /
 *      Mission Control → the technical definition (term kept as is).
 ***********************************************************************/
const AERO_TERMS = [
    ['Telemetry', ['telemetry'], 'Information sent by your spacecraft', 'Measured spacecraft and mission data transmitted to the ground.'],
    ['DSN', ['DSN', 'Deep Space Network'], 'NASA’s communication network', 'NASA Deep Space Network: 34 m and 70 m antennas in California, Spain and Australia.'],
    ['Mass', ['mass'], 'How heavy your spacecraft is', 'Total spacecraft mass (kg), checked against launch-vehicle lift capacity to the target orbit.'],
    ['Power balance', ['power balance', 'net power', 'power margin'], 'Electricity available after spacecraft systems use power', 'Generated power minus total load (W); must be ≥ 0.'],
    ['Downlink', ['downlink'], 'Sending information back to Earth', 'Spacecraft-to-ground data link; effective rate (Gbps) vs. science data generated.'],
    ['Orbital inclination', ['orbital inclination', 'inclination'], 'The angle of your spacecraft’s orbit', 'Angle between the orbital plane and the body’s equator (deg).'],
    ['Periapsis', ['periapsis', 'perigee'], 'The closest point in an orbit', 'Minimum orbital altitude (km).'],
    ['Apoapsis', ['apoapsis', 'apogee'], 'The farthest point in an orbit', 'Maximum orbital altitude (km).'],
    ['Payload', ['payload', 'payloads'], 'Scientific equipment carried by your spacecraft', 'Mission instruments; mass, power, data rate and science yield per unit.'],
    ['GO/NO-GO', ['GO/NO-GO', 'NO-GO'], 'Final decision on whether the mission is ready', 'Station-by-station launch readiness poll (EECOM, GNC, FIDO, SCIENCE, FLIGHT).'],
    ['Delta-v', ['delta-v', 'Δv', 'ΔV'], 'How much the rocket must change your speed to get there', 'Total velocity change required (km/s); derates rocket lift capacity.'],
    ['Eclipse', ['eclipse', 'umbra'], 'Time spent in a planet’s shadow', 'Fraction of each orbit in umbra; drives battery energy demand.'],
    ['Spacecraft bus', ['bus', 'chassis'], 'The main body that holds all the parts', 'Spacecraft structure providing payload slots, base mass and reliability.'],
    ['RTG', ['MMRTG', 'RTG', 'radioisotope'], 'A nuclear battery that makes steady power anywhere', 'Radioisotope thermoelectric generator (Pu-238), flux-independent power.'],
    ['Battery reserve', ['battery reserve', 'battery margin'], 'Extra stored energy left after the shadow', 'Effective battery capacity minus eclipse energy requirement (Wh).'],
    ['Max-Q', ['Max-Q'], 'The bumpiest moment of launch', 'Point of maximum dynamic pressure during ascent.'],
    ['MECO', ['MECO'], 'The first stage switches off and drops away', 'Main engine cutoff, followed by stage separation.'],
    ['SECO', ['SECO'], 'The second stage switches off — you’re in orbit', 'Second-stage engine cutoff at orbit insertion.'],
    ['Fairing', ['fairing'], 'The rocket’s nose cone that protects the spacecraft', 'Payload fairing, jettisoned once aerodynamic heating is low.'],
    ['Eccentricity', ['eccentricity'], 'How stretched (oval) the orbit is', 'e = (r_a − r_p)/(r_a + r_p); 0 = circular.'],
    ['Radiation level', ['radiation level', 'rad level'], 'How strong the harmful space radiation is', 'Environment severity (1–4) vs. shielding rating; deficit costs reliability.'],
    ['Reliability', ['reliability', 'assurance'], 'How likely your spacecraft keeps working', 'Engineering assurance: bus and launcher reliability ± shielding effects.'],
    ['Gbps', ['Gbps'], 'How fast data is sent (billions of bits per second)', 'Gigabits per second.'],
    ['Wh', ['Wh'], 'Amount of stored energy (watt-hours)', 'Watt-hours of energy.'],
    ['EECOM', ['EECOM'], 'The team that checks electricity and batteries', 'Electrical, Environmental & Consumables Manager console.'],
    ['GNC', ['GNC'], 'The team that checks steering and radiation safety', 'Guidance, Navigation & Control console.'],
    ['FIDO', ['FIDO'], 'The team that checks the orbit', 'Flight Dynamics Officer console.'],
    ['Orbit insertion', ['orbit insertion', 'orbital insertion'], 'Slowing down so the planet can capture you', 'Propulsive manoeuvre placing the spacecraft into its target orbit.']
];
const TERM_RX = (() => {
    const alts = [];
    AERO_TERMS.forEach((t, i) => t[1].forEach(a => alts.push([a, i])));
    alts.sort((a, b) => b[0].length - a[0].length);
    const esc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    return { rx: new RegExp('(^|[^A-Za-z0-9])(' + alts.map(a => esc(a[0])).join('|') + ')(?![A-Za-z0-9])', 'gi'), map: alts };
})();
function termIndexFor(word) {
    const w = word.toLowerCase();
    const hit = TERM_RX.map.find(a => a[0].toLowerCase() === w);
    return hit ? hit[1] : -1;
}
const TERM_SKIP = 'script,style,textarea,input,select,option,svg,code,abbr,.term,#termGlossary,#termTip,#missionLauncherOverlay,.no-terms';
function termWrap(root) {
    if (!root || appExperienceMode !== 'game') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: n => (!n.nodeValue.trim() || (n.parentElement && n.parentElement.closest(TERM_SKIP))) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
        const txt = n.nodeValue;
        TERM_RX.rx.lastIndex = 0;
        if (!TERM_RX.rx.test(txt)) return;
        TERM_RX.rx.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0, mm;
        while ((mm = TERM_RX.rx.exec(txt))) {
            const start = mm.index + mm[1].length, word = mm[2], idx = termIndexFor(word);
            if (idx < 0) continue;
            frag.appendChild(document.createTextNode(txt.slice(last, start)));
            const ab = document.createElement('abbr');
            ab.className = 'term'; ab.dataset.term = idx; ab.tabIndex = 0; ab.textContent = word;
            frag.appendChild(ab);
            last = start + word.length;
        }
        if (last === 0) return;
        frag.appendChild(document.createTextNode(txt.slice(last)));
        n.parentNode.replaceChild(frag, n);
    });
}
let _termQueued = false;
function termScan() {
    if (_termQueued) return;
    _termQueued = true;
    (window.requestIdleCallback ? (f => requestIdleCallback(f, { timeout: 250 })) : (f => setTimeout(f, 60)))(() => {
        _termQueued = false;
        ['opsWorkspace', 'opsCommandBar', 'simulationModal', 'goNoGoModal', 'nexiWidgetContainer'].forEach(id => termWrap(document.getElementById(id)));
    });
}
// Re-scan after renders (renderers rewrite their own HTML, so wrapping never fights them)
const _termRender = renderAllUI;
renderAllUI = function () { _termRender.apply(this, arguments); termScan(); };
new MutationObserver(muts => { if (appExperienceMode === 'game' && muts.some(m => m.addedNodes.length && !(m.target.closest && m.target.closest('#termTip')))) termScan(); })
    .observe(document.body, { childList: true, subtree: true });

/* ---------- Tooltip ---------- */
function termTipShow(el) {
    const t = AERO_TERMS[Number(el.dataset.term)];
    if (!t) return;
    let tip = document.getElementById('termTip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'termTip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    const cadet = state.difficulty === 'cadet';
    tip.innerHTML = `<b>${opsEsc(t[0])}</b>${cadet ? `<p>${opsEsc(t[2])}</p><small>Technical: ${opsEsc(t[3])}</small>` : `<p>${opsEsc(t[3])}</p><small>In plain words: ${opsEsc(t[2])}</small>`}<a onclick="openTermGlossary('${opsEsc(t[0]).replace(/'/g, "\\'")}')">Open glossary →</a>`;
    const r = el.getBoundingClientRect();
    tip.style.display = 'block';
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tip.style.top = (r.top - h - 8 > 8 ? r.top - h - 8 : r.bottom + 8) + 'px';
}
function termTipHide() { const tip = document.getElementById('termTip'); if (tip && !tip.matches(':hover')) tip.style.display = 'none'; }
document.addEventListener('mouseover', e => { const a = e.target.closest && e.target.closest('abbr.term'); if (a) termTipShow(a); });
document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('abbr.term')) setTimeout(termTipHide, 120); });
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('abbr.term')) termTipShow(e.target); });
document.addEventListener('focusout', e => { if (e.target.matches && e.target.matches('abbr.term')) termTipHide(); });
document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('abbr.term');
    if (a && !a.closest('button')) { termTipShow(a); return; }
    if (!(e.target.closest && e.target.closest('#termTip'))) { const tip = document.getElementById('termTip'); if (tip) tip.style.display = 'none'; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const tip = document.getElementById('termTip'); if (tip) tip.style.display = 'none'; closeTermGlossary(); } });

/* ---------- Glossary panel ---------- */
function openTermGlossary(focus) {
    SoundFX.click();
    let g = document.getElementById('termGlossary');
    if (!g) {
        g = document.createElement('div'); g.id = 'termGlossary'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-label', 'Glossary');
        g.innerHTML = `<div class="tg-box"><div class="tg-head"><b><i class="ph-fill ph-book-open-text"></i> Mission Glossary</b><input id="tgSearch" type="search" placeholder="Search terms…" oninput="renderTermGlossary(this.value)"><button onclick="closeTermGlossary()" aria-label="Close"><i class="ph ph-x"></i></button></div><div id="tgBody"></div></div>`;
        g.addEventListener('click', e => { if (e.target === g) closeTermGlossary(); });
        document.body.appendChild(g);
    }
    g.classList.remove('hidden');
    const tip = document.getElementById('termTip'); if (tip) tip.style.display = 'none';
    const s = document.getElementById('tgSearch'); s.value = focus || '';
    renderTermGlossary(s.value);
    s.focus();
}
function closeTermGlossary() { const g = document.getElementById('termGlossary'); if (g) g.classList.add('hidden'); }
function renderTermGlossary(q) {
    q = (q || '').toLowerCase();
    const cadet = state.difficulty === 'cadet';
    const rows = AERO_TERMS.filter(t => !q || t[0].toLowerCase().includes(q) || t[2].toLowerCase().includes(q) || t[1].some(a => a.toLowerCase().includes(q)));
    document.getElementById('tgBody').innerHTML = `<table><thead><tr><th>Technical term</th><th>${cadet ? 'What it means' : 'Definition'}</th><th>${cadet ? 'Technical detail' : 'Beginner-friendly'}</th></tr></thead><tbody>${rows.map(t => `<tr><td><b>${opsEsc(t[0])}</b></td><td>${opsEsc(cadet ? t[2] : t[3])}</td><td class="tg-dim">${opsEsc(cadet ? t[3] : t[2])}</td></tr>`).join('') || '<tr><td colspan="3">No matching terms.</td></tr>'}</tbody></table>`;
}

