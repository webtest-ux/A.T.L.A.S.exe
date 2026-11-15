/* A.T.L.A.S · section 16N — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16N. PLAY GAME — MODE-SPECIFIC LAYOUTS
 *      Cadet: left (progress · current task · completed · ATLAS) /
 *             centre (large 3D view) / bottom (4 indicators · status · main action).
 *      Engineer: configuration + viewport + engineering indicators.
 *      Mission Control: original workstation arrangement (readability tweaks only).
 *      Pure presentation: panels are re-arranged / hidden with CSS, never removed,
 *      so every existing renderer keeps its DOM targets.
 ***********************************************************************/
const LY = { nexiHome: null, nexiNext: null };
function layoutDockNexi(dock) {
    const nexi = document.getElementById('nexiWidgetContainer');
    const ws = document.getElementById('workstationPanel');
    if (!nexi || !ws) return;
    if (!LY.nexiHome) { LY.nexiHome = nexi.parentNode; LY.nexiNext = nexi.nextSibling; }
    let slot = document.getElementById('cadetNexiSlot');
    if (dock) {
        if (!slot) { slot = document.createElement('div'); slot.id = 'cadetNexiSlot'; ws.appendChild(slot); }
        if (nexi.parentNode !== slot) slot.appendChild(nexi);
        nexi.classList.add('nexi-docked');
    } else if (nexi.parentNode !== LY.nexiHome) {
        LY.nexiHome.insertBefore(nexi, LY.nexiNext && LY.nexiNext.parentNode === LY.nexiHome ? LY.nexiNext : null);
        nexi.classList.remove('nexi-docked');
    }
}
function layoutApply(mode) {
    const inGame = appExperienceMode === 'game';
    // Cadet and Engineer dock ATLAS into the left column so it never covers dashboard numbers;
    // Mission Control keeps the original floating ATLAS.
    layoutDockNexi(inGame && (mode === 'cadet' || mode === 'engineer'));
    if (inGame && (mode === 'cadet' || mode === 'engineer') && state.activeTab !== 'builder' && !LY.userTabbed) {
        try { switchTab('builder'); } catch (e) { /* tab optional */ }
    }
    document.getElementById('opsWorkspace')?.classList.add('ly-anim');
    setTimeout(() => { try { resizeThreeViewport(); } catch (e) { /* not ready */ } document.getElementById('opsWorkspace')?.classList.remove('ly-anim'); }, 380);
}
const _lyApply = applyExperienceMode;
applyExperienceMode = function (mode) { _lyApply(mode); layoutApply(mode); };
const _lySwitchApp = switchAppExperience;
switchAppExperience = function (t) {
    _lySwitchApp(t);
    const mode = (document.body.className.match(/xp-(cadet|engineer|director)/) || [])[1];
    if (t !== 'game') layoutDockNexi(false); else if (mode) layoutApply(mode);
};
const _lyTab = switchTab;
switchTab = function (id) { _lyTab(id); if (id !== 'builder') LY.userTabbed = true; };

/* ---------- Cadet left column: completed objectives under the guide ---------- */
const _lyGuide = renderCadetGuide;
renderCadetGuide = function () {
    _lyGuide.apply(this, arguments);
    const el = document.getElementById('cadetGuideBar');
    if (!el || el.classList.contains('hidden')) return;
    let r; try { r = aeroReadiness(); } catch (e) { return; }
    const done = r.items.filter(i => i.status === 'ok');
    const todo = r.items.filter(i => i.status !== 'ok');
    el.insertAdjacentHTML('beforeend', `<div class="cg-objs"><div><span class="cg-k">Completed (${done.length}/${r.items.length})</span>${done.map(i => `<span class="cg-obj ok">✓ ${opsEsc(i.title)}</span>`).join('')}</div>
        ${todo.length ? `<div><span class="cg-k">Still to do</span>${todo.map(i => `<button class="cg-obj ${i.status}" onclick="openSpacecraftBuilder(${i.fixStep})">${i.status === 'bad' ? '✕' : '⚠'} ${opsEsc(i.title)}</button>`).join('')}</div>` : ''}</div>`);
};

/* ---------- Bottom bar: status line + main action (Cadet & Engineer) ---------- */
function layoutMainAction() {
    const r = aeroReadiness();
    const asc = state.ascent || {};
    if (asc.active || (typeof LX !== 'undefined' && (LX.cdTimer || LX.seqTimer))) return { status: 'Launch in progress — watch the 3D view.', btn: null };
    if (state.sim && !document.getElementById('simulationModal').classList.contains('hidden')) return { status: 'Mission in flight.', btn: null };
    if (!r.go) {
        const it = r.items.find(i => i.status === 'bad');
        return { status: `Building · ${r.bad} item${r.bad > 1 ? 's' : ''} to fix before launch`, btn: [`Fix: ${it.title}`, `openSpacecraftBuilder(${it.fixStep})`, 'fix'] };
    }
    return { status: r.warn ? `Ready to launch (${r.warn} caution${r.warn > 1 ? 's' : ''})` : 'Ready to launch — all checks passed', btn: ['Start GO/NO-GO poll', 'initiateGoNoGoPoll()', 'go'] };
}
const _lyDash = renderSimpleDashboard;
renderSimpleDashboard = function () {
    _lyDash.apply(this, arguments);
    const el = document.getElementById('simpleDashPanel');
    if (!el || el.classList.contains('hidden')) return;
    let a; try { a = layoutMainAction(); } catch (e) { return; }
    const head = el.querySelector('.sd-head');
    if (head) head.insertAdjacentHTML('beforeend', `<div class="sd-status"><span class="sd-dot ${a.btn && a.btn[2] === 'go' ? 'go' : (a.btn ? 'fix' : 'live')}"></span>${opsEsc(a.status)}${a.btn ? `<button class="sd-main ${a.btn[2]}" onclick="${a.btn[1]}">${opsEsc(a.btn[0])} <i class="ph-bold ph-arrow-right"></i></button>` : ''}</div>`);
};
window.addEventListener('resize', () => { if (appExperienceMode === 'game') try { renderSimpleDashboard(); } catch (e) { /* ignore */ } });

