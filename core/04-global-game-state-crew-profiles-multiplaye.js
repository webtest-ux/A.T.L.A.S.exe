/* A.T.L.A.S · section 4 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 4. GLOBAL GAME STATE, CREW PROFILES & MULTIPLAYER BROADCAST CHANNEL
 ***********************************************************************/
let playerCrewState = {
    soloProfile: {
        presetId: 'vance',
        callsign: 'CMDR. VANCE',
        customName: 'Cmdr. Aria Vance',
        suitColor: 'nasa_cyan',
        deptCode: 'FLIGHT',
        roleTitle: 'Flight Director',
        avatarSize: 'standard', // 'compact' (32px) | 'standard' (52px) | 'large' (76px)
        cardStyle: 'standard',  // 'compact' | 'standard' | 'expanded'
        animState: 'idle',
        confirmed: true
    },
    coopSeats: {
        1: { seat: 1, roleCode: 'FLIGHT', roleTitle: 'Flight Director', tabId: 'directive', presetId: 'vance', callsign: 'CMDR. VANCE', customName: 'Cmdr. Aria Vance', suitColor: 'nasa_cyan', connected: true, ready: true, animState: 'idle' },
        2: { seat: 2, roleCode: 'EECOM', roleTitle: 'Systems Engineer', tabId: 'bus', presetId: 'thorne', callsign: 'EECOM THORNE', customName: 'Dr. Marcus Thorne', suitColor: 'eecom_gold', connected: true, ready: true, animState: 'idle' },
        3: { seat: 3, roleCode: 'SCIENCE', roleTitle: 'Lead Scientist', tabId: 'payload', presetId: 'lin', callsign: 'SCI CHEN', customName: 'Dr. Mei-Ling Chen', suitColor: 'science_emerald', connected: true, ready: true, animState: 'idle' },
        4: { seat: 4, roleCode: 'FIDO', roleTitle: 'Flight Dynamics', tabId: 'orbit', presetId: 'kovacs', callsign: 'FIDO KOVACS', customName: 'Capt. Mateo Kovacs', suitColor: 'fido_indigo', connected: true, ready: true, animState: 'idle' }
    }
};

let profileBackupSnapshot = null;
const PROFILE_STORAGE_KEY = 'aeronexus_profile_prefs_v1';

function loadSavedProfilePreferences() {
    try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            playerCrewState.soloProfile = {
                ...playerCrewState.soloProfile,
                ...parsed
            };
            // Sync local player's active seat identity without overwriting remote seats
            const mySeat = state.activeSeat || 1;
            if (playerCrewState.coopSeats[mySeat]) {
                playerCrewState.coopSeats[mySeat].presetId = playerCrewState.soloProfile.presetId;
                playerCrewState.coopSeats[mySeat].callsign = playerCrewState.soloProfile.callsign;
                playerCrewState.coopSeats[mySeat].customName = playerCrewState.soloProfile.customName;
                playerCrewState.coopSeats[mySeat].suitColor = playerCrewState.soloProfile.suitColor;
            }
        }
    } catch (e) {}
}

function saveProfilePreferencesToStorage() {
    try {
        const p = playerCrewState.soloProfile;
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
            presetId: p.presetId,
            callsign: p.callsign,
            customName: p.customName,
            suitColor: p.suitColor,
            deptCode: p.deptCode,
            roleTitle: p.roleTitle,
            avatarSize: p.avatarSize,
            cardStyle: p.cardStyle
        }));
    } catch (e) {}
}

let nexiState = {
    enabled: true,
    minimized: true, // Starts as a compact floating orb so the 3D planet is never obscured
    dockCorner: 'br', // 'br' | 'bl' | 'tr'
    tutorialActive: false,
    tutorialStep: 0,
    lastCustomAnswer: null
};

let state = {
    roomCode: 'JPL-4',
    gameMode: 'solo', // 'solo' | 'coop' | 'sandbox'
    activeTab: 'directive',
    difficulty: 'engineer',
    activeScenarioId: 'earth_pulse',
    activeSeat: 1,
    activeRoleName: 'FLIGHT (P1)',
    // Hardware selections
    chassis: 'microsat',
    power: 'solar_gaas',
    battery: 'li_ion',
    shield: 'std_adcs',
    payloads: ['sar_radar', 'hyperspectral', 'magnetometer'],
    orbit: 'sso',
    comms: 'x_band',
    rocket: 'falcon_med',
    // Keplerian 3D orbital parameters
    periapsisKm: 650,
    apoapsisKm: 750,
    inclinationDeg: 98,
    // Specialist Console Toggles
    eecomReserveActive: false,
    scienceOverclockActive: false,
    manualStagingMode: true,
    // 3D Viewport, Collapsible CAD Drawer & Fullscreen Exploration State
    cadDrawerOpen: false,
    scienceDrawerOpen: false,
    diagnosticsDrawerOpen: true,
    viewportExpanded: false,
    missionExperienceActive: false,
    missionOpsStage: 1, // 1: Bus & Power, 2: Science Payload, 3: Orbit & Comms, 4: Flight Authorization (GO/NO-GO)
    explodedFactor: 0,
    arraysDeployed: true,
    planetAnimSpeed: 1.0,
    planetScienceLayer: 'natural',
    marsDustStormActive: false,
    europaOceanCutaway: false,
    flightAttitude: 'nadir',
    inUmbraShadow: false,
    ssrFillPct: 18,
    // Ascent Sequence State
    ascent: {
        active: false,
        stageIndex: 0,
        timer: 0,
        altitudeKm: 0,
        velocityKms: 0,
        manualStageBonus: 0,
        stage1SepTime: 0,
        fairingSepTime: 0
    },
    // Team Collaboration Modifiers
    dilemmaIndex: 0,
    teamMods: {
        scienceBonusPct: 0,
        powerBonusW: 0,
        costMod: 0,
        synergyScore: 95
    },
    savedDesigns: [],
    sim: {
        phase: 0,
        health: 100,
        scienceCollected: 0,
        anomalyResolved: false,
        anomalyBonusPts: 0
    }
};

let broadcastChannel = null;
let isApplyingRemoteSync = false;

function initBroadcastChannel(code) {
    const cleanCode = (code || 'JPL-4').trim().toUpperCase().slice(0, 8) || 'JPL-4';
    state.roomCode = cleanCode;
    document.getElementById('headerRoomCode').textContent = cleanCode;
    const coopCodeEl = document.getElementById('coopBarRoomCode');
    if (coopCodeEl) coopCodeEl.textContent = cleanCode;
    const lobbyCodeEl = document.getElementById('lobbyRoomCodeBadge');
    if (lobbyCodeEl) lobbyCodeEl.textContent = cleanCode;

    if (broadcastChannel) {
        try { broadcastChannel.close(); } catch (e) {}
    }
    if ('BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel(`aeronexus_room_${cleanCode}`);
        broadcastChannel.onmessage = (ev) => {
            if (!ev.data) return;
            isApplyingRemoteSync = true;
            if (ev.data.type === 'STATE_SYNC') {
                const incoming = ev.data.payload;
                const mySeat = state.activeSeat;
                const myRole = state.activeRoleName;
                Object.assign(state, incoming);
                state.activeSeat = mySeat;
                state.activeRoleName = myRole;
                if (incoming.coopSeats) {
                    Object.keys(incoming.coopSeats).forEach(sKey => {
                        playerCrewState.coopSeats[sKey] = {
                            ...playerCrewState.coopSeats[sKey],
                            ...incoming.coopSeats[sKey]
                        };
                    });
                }
                syncSlidersFromState();
                lastBuiltSignature = '';
                renderAllUI();
                SoundFX.beep(880, 0.03, 'sine', 0.03);
            } else if (ev.data.type === 'SEAT_CREW_UPDATE') {
                const { seatNum, seatProfile } = ev.data;
                if (seatNum && playerCrewState.coopSeats[seatNum]) {
                    playerCrewState.coopSeats[seatNum] = {
                        ...playerCrewState.coopSeats[seatNum],
                        ...seatProfile
                    };
                    renderAllUI();
                    renderCoopLobbyModal();
                    SoundFX.beep(940, 0.03, 'sine', 0.03);
                }
            }
            isApplyingRemoteSync = false;
        };
    }
}

function broadcastStateUpdate() {
    if (isApplyingRemoteSync || !broadcastChannel) return;
    try {
        broadcastChannel.postMessage({
            type: 'STATE_SYNC',
            payload: getSerializableStateSnapshot()
        });
    } catch (e) {}
}

function broadcastSeatCrewUpdate(seatNum) {
    if (isApplyingRemoteSync || !broadcastChannel) return;
    try {
        broadcastChannel.postMessage({
            type: 'SEAT_CREW_UPDATE',
            seatNum,
            seatProfile: { ...playerCrewState.coopSeats[seatNum] }
        });
    } catch (e) {}
}

function getSerializableStateSnapshot() {
    return {
        activeScenarioId: state.activeScenarioId,
        difficulty: state.difficulty,
        chassis: state.chassis,
        power: state.power,
        battery: state.battery,
        shield: state.shield,
        payloads: [...state.payloads],
        orbit: state.orbit,
        comms: state.comms,
        rocket: state.rocket,
        periapsisKm: state.periapsisKm,
        apoapsisKm: state.apoapsisKm,
        inclinationDeg: state.inclinationDeg,
        eecomReserveActive: state.eecomReserveActive,
        scienceOverclockActive: state.scienceOverclockActive,
        manualStagingMode: state.manualStagingMode,
        teamMods: { ...state.teamMods },
        dilemmaIndex: state.dilemmaIndex,
        coopSeats: JSON.parse(JSON.stringify(playerCrewState.coopSeats))
    };
}

function joinBroadcastRoom(code) {
    SoundFX.success();
    initBroadcastChannel(code);
    broadcastStateUpdate();
    document.getElementById('packetFeedbackMsg').textContent = `Connected to Live Broadcast Room: ${state.roomCode}`;
}

function joinBroadcastRoomFromInput() {
    const inputEl = document.getElementById('roomCodeInput');
    joinBroadcastRoom(inputEl ? inputEl.value : 'JPL-4');
}

function generateRandomRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'JPL-';
    for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
    document.getElementById('roomCodeInput').value = code;
    joinBroadcastRoom(code);
}

function copyMissionPacket() {
    const packetStr = btoa(JSON.stringify(getSerializableStateSnapshot()));
    const area = document.getElementById('packetTextarea');
    area.value = packetStr;
    area.select();
    try { document.execCommand('copy'); } catch (e) {}
    SoundFX.success();
    document.getElementById('packetFeedbackMsg').textContent = 'Mission & Crew Telemetry Packet copied to clipboard!';
}

function importMissionPacket() {
    const raw = document.getElementById('packetTextarea').value.trim();
    if (!raw) return;
    try {
        const parsed = JSON.parse(atob(raw));
        const mySeat = state.activeSeat;
        Object.assign(state, parsed);
        state.activeSeat = mySeat;
        if (parsed.coopSeats) {
            Object.keys(parsed.coopSeats).forEach(k => {
                playerCrewState.coopSeats[k] = { ...playerCrewState.coopSeats[k], ...parsed.coopSeats[k] };
            });
        }
        syncSlidersFromState();
        lastBuiltSignature = '';
        renderAllUI();
        broadcastStateUpdate();
        SoundFX.success();
        document.getElementById('packetFeedbackMsg').textContent = 'Mission & Crew Packet imported and synced!';
    } catch (e) {
        SoundFX.alert();
        document.getElementById('packetFeedbackMsg').textContent = 'Invalid Base64 Mission Packet format.';
    }
}

