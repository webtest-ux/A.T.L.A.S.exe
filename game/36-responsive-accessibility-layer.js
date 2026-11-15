/* A.T.L.A.S · section 16R — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16R. RESPONSIVE & ACCESSIBILITY LAYER
 *      Keyboard access for clickable non-buttons, names for icon-only
 *      buttons, Escape closes dialogs, focus moves into opened dialogs,
 *      skip link, loading screen and graceful 3D-unavailable notice.
 ***********************************************************************/
const A11Y_NAMES = { 'camBtn-spacecraft': 'Camera: spacecraft', 'camBtn-pad': 'Camera: launch pad', 'camBtn-orbit': 'Camera: orbit view', 'camBtn-chase': 'Camera: chase', 'camBtn-nadir': 'Camera: look down at planet' };
function a11yLabel(el) {
    if (el.getAttribute('aria-label') || el.innerText.trim()) return;
    const name = A11Y_NAMES[el.id] || el.title || (el.querySelector('i[class*="ph-"]') && el.querySelector('i[class*="ph-"]').className.replace(/.*ph-(?!fill|bold)([a-z-]+).*/, '$1').replace(/-/g, ' ')) || '';
    if (name) el.setAttribute('aria-label', name);
}
function a11yScan(root) {
    root = root || document.body;
    root.querySelectorAll('button, a[onclick], [onclick]').forEach(el => {
        a11yLabel(el);
        if (!/^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY|LABEL|OPTION)$/.test(el.tagName) && el.tabIndex < 0 && !el.closest('button')) {
            el.tabIndex = 0;
            if (!el.getAttribute('role')) el.setAttribute('role', 'button');
        }
    });
    root.querySelectorAll('i[class*="ph-"]:not([aria-hidden])').forEach(i => i.setAttribute('aria-hidden', 'true'));
}
// Enter / Space activate role=button elements (native buttons already do)
document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('role') === 'button' && e.target.tagName !== 'BUTTON') {
        e.preventDefault(); e.target.click();
    }
});
let _a11yQ = false;
function a11yQueue() { if (_a11yQ) return; _a11yQ = true; setTimeout(() => { _a11yQ = false; try { a11yScan(); } catch (e) {} }, 120); }
new MutationObserver(a11yQueue).observe(document.body, { childList: true, subtree: true });

/* ---------- Dialogs: focus in on open, Escape closes the top one ---------- */
const A11Y_ESC_EXEMPT = ['simulationModal', 'goNoGoModal'];   // mission-flow dialogs keep their own buttons
const _a11yOpen = openModal;
openModal = function (id) {
    const r = _a11yOpen.apply(this, arguments);
    setTimeout(() => { const m = document.getElementById(id); const f = m && m.querySelector('button, [href], input, select, textarea, [tabindex="0"]'); if (f) f.focus({ preventScroll: true }); }, 60);
    return r;
};
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('[id$="Modal"]')].filter(m => !m.classList.contains('hidden') && getComputedStyle(m).display !== 'none' && !A11Y_ESC_EXEMPT.includes(m.id));
    const top = open[open.length - 1];
    if (top) { try { closeModal(top.id); } catch (err) { top.classList.add('hidden'); } }
});

/* ---------- Skip link + landmarks ---------- */
(() => {
    const skip = document.createElement('a');
    skip.className = 'aero-skip'; skip.href = '#'; skip.textContent = 'Skip to main controls';
    skip.onclick = e => { e.preventDefault(); const t = document.getElementById('opsWorkspace') || document.querySelector('main'); if (t) { t.tabIndex = -1; t.focus(); } };
    document.body.prepend(skip);
    const ws = document.getElementById('opsWorkspace'); if (ws && !ws.getAttribute('role')) ws.setAttribute('role', 'main');
    const nx = document.getElementById('nexiWidgetContainer'); if (nx) nx.setAttribute('aria-live', 'polite');
})();

// Loading screen + 3D-unavailable notice live in an independent inline script right after <body>,
// so they still work if any application script fails to load.
a11yQueue();

/* ---------- Tabs & navigation: expose the active item (aria-selected / aria-current) ---------- */
function a11yMarkActive() {
    document.querySelectorAll('.tab-btn').forEach(b => { b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(b.id === 'tabBtn-' + state.activeTab)); });
    document.querySelectorAll('.ops-rail-btn').forEach(b => { if (b.classList.contains('is-active')) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    document.querySelectorAll('.bd-navbtn').forEach(b => { if (b.classList.contains('now')) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
}
const _a11yRenderAll = renderAllUI;
renderAllUI = function () { _a11yRenderAll.apply(this, arguments); try { a11yMarkActive(); } catch (e) {} };
const _a11ySwitchTab = switchTab;
switchTab = function () { const r = _a11ySwitchTab.apply(this, arguments); try { a11yMarkActive(); } catch (e) {} return r; };

