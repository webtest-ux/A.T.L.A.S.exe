/* A.T.L.A.S · section 13 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 13. SAVED DESIGNS & ARCHITECTURE COMPARISON TABLE
 ***********************************************************************/
function saveCurrentDesignToLeaderboard(customScore = null) {
    SoundFX.success();
    const m = computeMissionMetrics();
    const score = customScore !== null ? customScore : Math.round(m.effectiveScience * 0.6 + m.readiness * 4);
    const cmdrName = state.gameMode === 'coop' ? playerCrewState.coopSeats[1].callsign : playerCrewState.soloProfile.callsign;
    const entry = {
        id: Date.now(),
        scenarioName: `${m.scenario.name} (${cmdrName})`,
        costStr: `$${m.totalCost}M / $${m.maxBudget}M`,
        massStr: `${m.totalMass}kg (${m.rocket.name.split(' ')[0]})`,
        scienceStr: `${m.effectiveScience} pts (${Math.round(m.dataCaptureRatio*100)}% link)`,
        scoreStr: `${score} pts (${m.readiness}% Ready)`,
        snapshot: getSerializableStateSnapshot()
    };
    state.savedDesigns.unshift(entry);
    document.getElementById('savedCountBadge').textContent = state.savedDesigns.length;
    renderLeaderboardTable();
}

function loadSavedDesign(id) {
    SoundFX.success();
    const item = state.savedDesigns.find(d => d.id === id);
    if (!item) return;
    Object.assign(state, item.snapshot);
    syncSlidersFromState();
    lastBuiltSignature = '';
    closeModal('leaderboardModal');
    renderAllUI();
    broadcastStateUpdate();
}

function renderLeaderboardTable() {
    const tbody = document.getElementById('savedDesignsTableBody');
    if (state.savedDesigns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500">No saved mission designs yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = state.savedDesigns.map(d => `
        <tr class="hover:bg-slate-900/60">
            <td class="py-2.5 px-2 font-bold text-white">${d.scenarioName}</td>
            <td class="py-2.5 px-2 text-emerald-300">${d.costStr}</td>
            <td class="py-2.5 px-2 text-cyan-300">${d.massStr}</td>
            <td class="py-2.5 px-2 text-blue-300">${d.scienceStr}</td>
            <td class="py-2.5 px-2 text-amber-300 font-bold">${d.scoreStr}</td>
            <td class="py-2.5 px-2">
                <button onclick="loadSavedDesign(${d.id})" class="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[10px]">
                    Load Design
                </button>
            </td>
        </tr>
    `).join('');
}

