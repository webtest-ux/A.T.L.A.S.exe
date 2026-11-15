/* A.T.L.A.S · section 5 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 5. SOLO CHARACTER STUDIO & 4-PLAYER CREW LOBBY CONTROLLERS
 ***********************************************************************/
function openProfileCustomizerModal() {
    SoundFX.click();
    profileBackupSnapshot = JSON.parse(JSON.stringify(playerCrewState.soloProfile));
    renderSoloCharacterModal();
    openModal('soloCharacterModal');
}

function cancelProfileCustomization() {
    SoundFX.click();
    if (profileBackupSnapshot) {
        playerCrewState.soloProfile = JSON.parse(JSON.stringify(profileBackupSnapshot));
    }
    closeModal('soloCharacterModal');
    renderAllUI();
}

function openActiveCharacterModal() {
    SoundFX.click();
    if (state.gameMode === 'coop') {
        renderCoopLobbyModal();
        openModal('coopLobbyModal');
    } else {
        openProfileCustomizerModal();
    }
}

function setProfileAvatarSize(sizeKey) {
    SoundFX.click();
    playerCrewState.soloProfile.avatarSize = sizeKey;
    renderSoloCharacterModal();
    renderHeaderCharacterProfile();
}

function setProfileCardStyle(styleKey) {
    SoundFX.click();
    playerCrewState.soloProfile.cardStyle = styleKey;
    renderSoloCharacterModal();
    renderHeaderCharacterProfile();
}

function renderSoloCharacterModal() {
    const prof = playerCrewState.soloProfile;
    const grid = document.getElementById('soloPresetGrid');
    if (grid) {
        grid.innerHTML = CHARACTER_PRESETS.map(c => {
            const selected = prof.presetId === c.id;
            return `
                <div onclick="selectSoloCharacterPreset('${c.id}')" class="glass-card rounded-xl p-2 cursor-pointer text-center flex flex-col items-center gap-1.5 ${selected ? 'selected' : ''}">
                    <div class="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden">
                        ${renderAstronautSVG(c.id, selected ? prof.suitColor : c.defaultSuit, 'idle', c.deptBadge)}
                    </div>
                    <div>
                        <div class="text-[10px] font-bold text-white leading-tight">${c.name}</div>
                        <div class="text-[8px] font-mono text-cyan-300">${c.specialty}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const suitGrid = document.getElementById('soloSuitColorGrid');
    if (suitGrid) {
        suitGrid.innerHTML = SUIT_COLORS.map(s => `
            <button type="button" onclick="selectSoloSuitColor('${s.id}')" class="h-6 rounded-lg border-2 transition ${prof.suitColor === s.id ? 'border-white scale-105 shadow-md' : 'border-slate-700 opacity-80'}" style="background: linear-gradient(135deg, ${s.primary}, ${s.secondary})" title="${s.name}"></button>
        `).join('');
    }

    // Highlight active Avatar Size & Card Style buttons
    const sizePxMap = { compact: 32, standard: 52, large: 76 };
    const activeSizePx = sizePxMap[prof.avatarSize] || 52;
    ['compact', 'standard', 'large'].forEach(k => {
        const btn = document.getElementById(`avatarSizeBtn-${k}`);
        if (btn) {
            btn.className = (prof.avatarSize === k)
                ? 'py-1.5 px-2 rounded-lg border border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold'
                : 'py-1.5 px-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white';
        }
    });
    ['compact', 'standard', 'expanded'].forEach(k => {
        const btn = document.getElementById(`cardStyleBtn-${k}`);
        if (btn) {
            btn.className = (prof.cardStyle === k)
                ? 'py-1.5 px-2 rounded-lg border border-teal-400 bg-teal-500/20 text-teal-200 font-bold'
                : 'py-1.5 px-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white';
        }
    });

    const preset = CHARACTER_PRESETS.find(c => c.id === prof.presetId) || CHARACTER_PRESETS[0];
    const previewMount = document.getElementById('soloPreviewAvatarMount');
    if (previewMount) {
        previewMount.style.width = `${activeSizePx}px`;
        previewMount.style.height = `${activeSizePx}px`;
        previewMount.innerHTML = renderAstronautSVG(prof.presetId, prof.suitColor, prof.animState || 'idle', prof.deptCode || preset.deptBadge);
    }

    const metaLabel = document.getElementById('previewSizeMetaLabel');
    if (metaLabel) {
        metaLabel.textContent = `${activeSizePx}px Avatar • ${(prof.cardStyle || 'standard').toUpperCase()} Card`;
    }

    document.getElementById('soloPreviewBadge').textContent = `${prof.deptCode || preset.deptBadge} // ${prof.roleTitle || preset.specialty}`;
    document.getElementById('soloPreviewName').textContent = prof.callsign || preset.defaultCallsign;

    const fullNameEl = document.getElementById('soloPreviewFullName');
    if (fullNameEl) {
        fullNameEl.textContent = prof.customName || preset.name;
        fullNameEl.className = prof.cardStyle === 'compact' ? 'hidden' : 'text-xs font-medium text-slate-200';
    }

    const bioEl = document.getElementById('soloPreviewBio');
    if (bioEl) {
        bioEl.textContent = preset.bio;
        bioEl.className = prof.cardStyle === 'expanded' ? 'text-[10px] text-slate-400 leading-snug line-clamp-2-custom' : 'hidden';
    }

    const callsignInput = document.getElementById('soloCallsignInput');
    if (callsignInput && document.activeElement !== callsignInput) {
        callsignInput.value = prof.callsign || preset.defaultCallsign;
    }
    const charNameInput = document.getElementById('soloCharNameInput');
    if (charNameInput && document.activeElement !== charNameInput) {
        charNameInput.value = prof.customName || preset.name;
    }
    const deptSelect = document.getElementById('soloDepartmentSelect');
    if (deptSelect && document.activeElement !== deptSelect) {
        const targetVal = `${prof.deptCode || preset.deptBadge}|${prof.roleTitle || 'Flight Director'}`;
        const hasOpt = Array.from(deptSelect.options).some(o => o.value === targetVal);
        if (hasOpt) deptSelect.value = targetVal;
    }
}

function selectSoloCharacterPreset(presetId) {
    SoundFX.click();
    const preset = CHARACTER_PRESETS.find(c => c.id === presetId) || CHARACTER_PRESETS[0];
    playerCrewState.soloProfile.presetId = preset.id;
    playerCrewState.soloProfile.callsign = preset.defaultCallsign;
    playerCrewState.soloProfile.customName = preset.name;
    playerCrewState.soloProfile.suitColor = preset.defaultSuit;
    playerCrewState.soloProfile.deptCode = preset.deptBadge;
    const roleMap = { FLIGHT: 'Flight Director', EECOM: 'EECOM Systems Engineer', SCIENCE: 'Principal Investigator', FIDO: 'Flight Dynamics Officer' };
    playerCrewState.soloProfile.roleTitle = roleMap[preset.deptBadge] || 'Flight Director';

    const callInput = document.getElementById('soloCallsignInput');
    if (callInput) callInput.value = preset.defaultCallsign;
    const nameInput = document.getElementById('soloCharNameInput');
    if (nameInput) nameInput.value = preset.name;

    renderSoloCharacterModal();
    renderHeaderCharacterProfile();
}

function selectSoloSuitColor(suitId) {
    SoundFX.click();
    playerCrewState.soloProfile.suitColor = suitId;
    renderSoloCharacterModal();
    renderHeaderCharacterProfile();
}

function updateSoloCustomizationPreview() {
    const callInput = document.getElementById('soloCallsignInput');
    const nameInput = document.getElementById('soloCharNameInput');
    const deptSelect = document.getElementById('soloDepartmentSelect');

    if (callInput) {
        playerCrewState.soloProfile.callsign = callInput.value.trim().toUpperCase() || 'CMDR. VANCE';
    }
    if (nameInput) {
        playerCrewState.soloProfile.customName = nameInput.value.trim() || 'Cmdr. Aria Vance';
    }
    if (deptSelect && deptSelect.value) {
        const [dCode, rTitle] = deptSelect.value.split('|');
        playerCrewState.soloProfile.deptCode = dCode || 'FLIGHT';
        playerCrewState.soloProfile.roleTitle = rTitle || 'Flight Director';
    }
    renderSoloCharacterModal();
    renderHeaderCharacterProfile();
}

function setSoloPreviewAnim(anim) {
    SoundFX.click();
    playerCrewState.soloProfile.animState = anim;
    renderSoloCharacterModal();
}

function confirmSoloCharacterSelection() {
    SoundFX.success();
    playerCrewState.soloProfile.confirmed = true;
    // Update only the local player's active seat so remote seats in 4-player mode are never overwritten
    const targetSeat = state.gameMode === 'coop' ? (state.activeSeat || 1) : 1;
    if (playerCrewState.coopSeats[targetSeat]) {
        playerCrewState.coopSeats[targetSeat].presetId = playerCrewState.soloProfile.presetId;
        playerCrewState.coopSeats[targetSeat].callsign = playerCrewState.soloProfile.callsign;
        playerCrewState.coopSeats[targetSeat].customName = playerCrewState.soloProfile.customName;
        playerCrewState.coopSeats[targetSeat].suitColor = playerCrewState.soloProfile.suitColor;
        if (state.gameMode === 'coop') {
            broadcastSeatCrewUpdate(targetSeat);
        }
    }
    saveProfilePreferencesToStorage();
    closeModal('soloCharacterModal');
    renderAllUI();
}

function renderCoopLobbyModal() {
    const slotsGrid = document.getElementById('coopLobbySlotsGrid');
    if (!slotsGrid) return;

    const responsibilities = {
        1: ['Select Mission Directive', 'Manage Budget Cap', 'Authorize GO/NO-GO Launch'],
        2: ['Configure Bus & Power', 'Manage Eclipse Battery Wh', 'Radiation & Thermal Trim'],
        3: ['Select Science Payloads', 'Maximize Orbital Synergy', 'Toggle PI Science Overclock'],
        4: ['Shape 3D Keplerian Orbit', 'Select DSN Transceiver', 'Command Pad 3A9 Staging']
    };

    slotsGrid.innerHTML = [1, 2, 3, 4].map(seatNum => {
        const seat = playerCrewState.coopSeats[seatNum];
        const preset = CHARACTER_PRESETS.find(c => c.id === seat.presetId) || CHARACTER_PRESETS[0];
        const isMySeat = state.activeSeat === seatNum;
        return `
            <div onclick="selectLobbySeatToEdit(${seatNum})" class="glass-card rounded-xl p-3 cursor-pointer flex flex-col justify-between ${isMySeat ? 'selected' : ''}">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            SEAT ${seatNum} // ${seat.roleCode}
                        </span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${seat.ready ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}">
                            ${seat.ready ? '● READY' : '○ CONFIGURING'}
                        </span>
                    </div>

                    <div class="flex items-center gap-2.5">
                        <div class="w-14 h-14 rounded-xl bg-slate-950 border border-cyan-400/40 overflow-hidden shrink-0">
                            ${renderAstronautSVG(seat.presetId, seat.suitColor, seat.ready ? 'idle' : 'typing', seat.roleCode)}
                        </div>
                        <div class="min-w-0">
                            <div class="font-mono text-xs font-bold text-white truncate">${seat.callsign}</div>
                            <div class="text-[11px] text-cyan-300 font-semibold">${seat.roleTitle}</div>
                            <div class="text-[10px] font-mono text-slate-400 truncate">${preset.name}</div>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-slate-800/80 space-y-1">
                        <div class="text-[9px] font-mono uppercase text-slate-400">Station Responsibilities:</div>
                        ${responsibilities[seatNum].map(r => `<div class="text-[10px] text-slate-300 flex items-center gap-1"><i class="ph-fill ph-caret-right text-cyan-400"></i>${r}</div>`).join('')}
                    </div>
                </div>

                <div class="pt-2.5 mt-2 border-t border-slate-800 flex items-center justify-between gap-1.5">
                    <span class="text-[10px] font-mono ${isMySeat ? 'text-cyan-300 font-bold' : 'text-slate-400'}">
                        ${isMySeat ? '▶ ACTIVE CONSOLE' : 'Click to Claim Seat'}
                    </span>
                    <button onclick="event.stopPropagation(); toggleLobbySeatReady(${seatNum})" class="px-2 py-1 rounded text-[10px] font-mono font-bold ${seat.ready ? 'bg-slate-800 text-emerald-300' : 'bg-emerald-500 text-slate-950'}">
                        ${seat.ready ? 'Ready ✓' : 'Mark Ready'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    const activeSeatObj = playerCrewState.coopSeats[state.activeSeat];
    document.getElementById('lobbyEditAvatarMount').innerHTML =
        renderAstronautSVG(activeSeatObj.presetId, activeSeatObj.suitColor, 'talking', activeSeatObj.roleCode);
    document.getElementById('lobbyEditSeatTitle').textContent =
        `CUSTOMIZING SEAT ${state.activeSeat} // ${activeSeatObj.roleTitle.toUpperCase()}`;
    document.getElementById('lobbyEditSeatNum').textContent = state.activeSeat;

    const callInput = document.getElementById('lobbyCallsignInput');
    if (callInput && document.activeElement !== callInput) {
        callInput.value = activeSeatObj.callsign;
    }

    document.getElementById('lobbyPresetMiniGrid').innerHTML = CHARACTER_PRESETS.map(c => `
        <button onclick="selectLobbySeatPreset('${c.id}')" class="p-1 rounded-lg border ${activeSeatObj.presetId === c.id ? 'border-cyan-400 bg-cyan-950/50' : 'border-slate-800 bg-slate-900'} hover:border-cyan-400/60" title="${c.name}">
            <div class="w-8 h-8 mx-auto rounded overflow-hidden">
                ${renderAstronautSVG(c.id, activeSeatObj.suitColor, 'idle', activeSeatObj.roleCode)}
            </div>
        </button>
    `).join('');

    document.getElementById('lobbySuitColorMiniGrid').innerHTML = SUIT_COLORS.map(s => `
        <button onclick="selectLobbySeatSuit('${s.id}')" class="w-5 h-5 rounded-full border ${activeSeatObj.suitColor === s.id ? 'border-white scale-110' : 'border-slate-700'}" style="background:${s.secondary}" title="${s.name}"></button>
    `).join('');

    const readyBtn = document.getElementById('lobbyReadyToggleBtn');
    if (readyBtn) {
        readyBtn.className = activeSeatObj.ready
            ? 'w-full py-2 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono font-bold text-xs'
            : 'w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs';
        readyBtn.innerHTML = activeSeatObj.ready
            ? '<i class="ph-bold ph-check-circle mr-1"></i> SEAT READY CONFIRMED'
            : '<i class="ph-bold ph-check-circle mr-1"></i> MARK SEAT READY';
    }

    const readyCount = Object.values(playerCrewState.coopSeats).filter(s => s.ready).length;
    document.getElementById('lobbyReadySummaryText').textContent = `${readyCount} / 4 Specialist Crew Stations Marked READY`;
}

function selectLobbySeatToEdit(seatNum) {
    const seatObj = playerCrewState.coopSeats[seatNum];
    selectSpecialistSeat(seatNum, seatObj.tabId, `${seatObj.roleTitle.toUpperCase()} (${seatObj.callsign})`);
    renderCoopLobbyModal();
}

function selectLobbySeatPreset(presetId) {
    SoundFX.click();
    const seatObj = playerCrewState.coopSeats[state.activeSeat];
    const preset = CHARACTER_PRESETS.find(c => c.id === presetId) || CHARACTER_PRESETS[0];
    seatObj.presetId = presetId;
    seatObj.callsign = `${seatObj.roleCode} ${preset.name.split(' ').pop().toUpperCase()}`;
    document.getElementById('lobbyCallsignInput').value = seatObj.callsign;
    broadcastSeatCrewUpdate(state.activeSeat);
    renderCoopLobbyModal();
    renderAllUI();
}

function selectLobbySeatSuit(suitId) {
    SoundFX.click();
    const seatObj = playerCrewState.coopSeats[state.activeSeat];
    seatObj.suitColor = suitId;
    broadcastSeatCrewUpdate(state.activeSeat);
    renderCoopLobbyModal();
    renderAllUI();
}

function updateLobbySeatCallsign(val) {
    const seatObj = playerCrewState.coopSeats[state.activeSeat];
    seatObj.callsign = (val || '').trim().toUpperCase() || `SEAT ${state.activeSeat}`;
    broadcastSeatCrewUpdate(state.activeSeat);
    renderAllUI();
}

function toggleLobbySeatReady(seatNum) {
    SoundFX.quindar();
    const seatObj = playerCrewState.coopSeats[seatNum];
    seatObj.ready = !seatObj.ready;
    broadcastSeatCrewUpdate(seatNum);
    renderCoopLobbyModal();
    renderAllUI();
}

function getSeatContextualAnimState(seatNum, m) {
    if (state.ascent && state.ascent.active) return 'celebrate';
    if (seatNum === 1 && m.totalCost > m.maxBudget && state.gameMode !== 'sandbox') return 'alert';
    if (seatNum === 2 && (m.netWatts < 0 || m.batteryMarginWh < 0 || m.shield.radRating < m.effectiveRadLevel)) return 'alert';
    if (seatNum === 3 && m.effectiveScience < m.scenario.targetScience) return 'typing';
    if (seatNum === 4 && (m.totalMass > m.maxLiftCapacity || m.dataCaptureRatio < 0.95 || (m.orbit.body !== m.scenario.targetBody && state.gameMode !== 'sandbox'))) return 'alert';
    if (state.activeSeat === seatNum) return 'typing';
    return 'idle';
}

function renderHeaderCharacterProfile(m) {
    const metrics = m || computeMissionMetrics();
    const soloProf = playerCrewState.soloProfile;
    const activeChar = state.gameMode === 'coop'
        ? playerCrewState.coopSeats[state.activeSeat]
        : soloProf;
    const preset = CHARACTER_PRESETS.find(c => c.id === activeChar.presetId) || CHARACTER_PRESETS[0];
    const badgeCode = state.gameMode === 'coop' ? activeChar.roleCode : (soloProf.deptCode || 'FLIGHT');
    const roleTitle = state.gameMode === 'coop' ? activeChar.roleTitle : (soloProf.roleTitle || 'Flight Director');
    const fullName = activeChar.customName || preset.name;
    const anim = getSeatContextualAnimState(state.activeSeat, metrics);

    // Apply local player's chosen Avatar Size (32px / 52px / 76px) and Card Style (compact / standard / expanded)
    const sizePxMap = { compact: 32, standard: 52, large: 76 };
    const px = sizePxMap[soloProf.avatarSize] || 52;
    const cardStyle = soloProf.cardStyle || 'standard';

    const mount = document.getElementById('headerAvatarMount');
    if (mount) {
        mount.style.width = `${px}px`;
        mount.style.height = `${px}px`;
        mount.innerHTML = renderAstronautSVG(activeChar.presetId, activeChar.suitColor, anim, badgeCode);
    }

    const callEl = document.getElementById('headerCallsignLabel');
    if (callEl) callEl.textContent = activeChar.callsign;
    const menuCallEl = document.getElementById('menuCmdrCallsignLabel');
    if (menuCallEl) menuCallEl.textContent = playerCrewState.soloProfile.callsign;

    const deptEl = document.getElementById('headerDeptBadge');
    if (deptEl) {
        deptEl.textContent = badgeCode;
        deptEl.className = cardStyle === 'compact'
            ? 'hidden'
            : 'px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
    }

    const fullNameLine = document.getElementById('headerFullNameLine');
    if (fullNameLine) {
        fullNameLine.textContent = fullName;
        fullNameLine.className = cardStyle === 'expanded'
            ? 'block text-[10px] font-semibold text-cyan-100 truncate'
            : 'hidden';
    }

    const subEl = document.getElementById('headerCharRoleSub');
    if (subEl) {
        if (cardStyle === 'compact') {
            subEl.className = 'hidden';
        } else {
            subEl.className = 'text-[9px] font-mono text-slate-400 truncate';
            subEl.textContent = state.gameMode === 'coop'
                ? `Seat ${state.activeSeat}: ${roleTitle}`
                : `${roleTitle} • ${metrics.readiness}% Ready`;
        }
    }

    const pillEl = document.getElementById('headerReactionPill');
    if (pillEl) {
        if (anim === 'alert') {
            pillEl.className = 'px-1.5 py-0.2 rounded text-[8px] font-mono bg-rose-500/20 text-rose-300';
            pillEl.textContent = 'ALERT';
        } else if (anim === 'celebrate') {
            pillEl.className = 'px-1.5 py-0.2 rounded text-[8px] font-mono bg-emerald-500/20 text-emerald-300';
            pillEl.textContent = 'LAUNCH!';
        } else {
            pillEl.className = 'px-1.5 py-0.2 rounded text-[8px] font-mono bg-cyan-500/20 text-cyan-300';
            pillEl.textContent = 'READY';
        }
    }
}

