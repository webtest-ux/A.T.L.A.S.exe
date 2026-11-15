/* A.T.L.A.S · section 15 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 15. INITIALIZATION ON WINDOW LOAD
 ***********************************************************************/
window.onload = function () {
    loadSavedProfilePreferences();
    initThreeViewport();
    initBroadcastChannel('JPL-4');
    syncSlidersFromState();
    syncCadControlsDrawerUI();
    syncViewportExpandButtonUI();
    renderSoloCharacterModal();
    renderCoopLobbyModal();
    renderAllUI();
    saveCurrentDesignToLeaderboard();
    // Open directly into the Cinematic 3D Solar System Main Menu
    switchAppExperience('menu');
    applyWorkspaceLayout();
    setInterval(tickOpsLiveTelemetry, 500);
    setInterval(refreshExplorerStatusPanel, 500);
    window.addEventListener('resize', () => { if (opsLayout.userOpsPref === null) applyWorkspaceLayout(); });
    animateThreeLoop();
};
