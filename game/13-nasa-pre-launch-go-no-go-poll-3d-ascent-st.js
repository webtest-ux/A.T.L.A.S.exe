/* A.T.L.A.S · section 11 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 11. NASA PRE-LAUNCH GO/NO-GO POLL & 3D ASCENT STAGING ENGINE
 ***********************************************************************/
// Single source of truth for GO/NO-GO station rules (poll, readiness checklist and crew status all use this)
function computeGoNoGoStations(m) {
    m = m || computeMissionMetrics();
    const s1 = playerCrewState.coopSeats[1];
    const s2 = playerCrewState.coopSeats[2];
    const s3 = playerCrewState.coopSeats[3];
    const s4 = playerCrewState.coopSeats[4];
    return [
        {
            code: 'EECOM',
            crew: s2,
            name: 'Electrical, Environmental & Consumables',
            go: m.netWatts >= 0 && m.batteryMarginWh >= 0,
            statusText: m.netWatts >= 0 ? `Power +${m.netWatts}W, Bat Reserve +${m.batteryMarginWh}Wh` : `NEGATIVE POWER (${m.netWatts}W)`
        },
        {
            code: 'GNC',
            crew: s2,
            name: 'Guidance, Navigation & Radiation Control',
            go: m.shield.radRating >= m.effectiveRadLevel,
            statusText: `Shield Lv ${m.shield.radRating} vs Orbit Rad Lv ${m.effectiveRadLevel}`
        },
        {
            code: 'FIDO',
            crew: s4,
            name: 'Flight Dynamics & Trajectory',
            go: m.orbit.body === m.scenario.targetBody || state.gameMode === 'sandbox',
            statusText: `${m.pe}x${m.ap} km (${state.inclinationDeg}°) @ ${m.orbit.body.toUpperCase()}`
        },
        {
            code: 'SCIENCE',
            crew: s3,
            name: 'Payload & DSN Telemetry Link',
            go: m.dataCaptureRatio >= 0.85 && m.effectiveScience >= m.scenario.targetScience * 0.8,
            statusText: `${m.effectiveScience} Sci Pts • ${Math.round(m.dataCaptureRatio * 100)}% Downlink`
        },
        {
            code: 'FLIGHT / PAD',
            crew: s1,
            name: 'Pad 3A9 Booster & Budget Authorization',
            go: m.totalMass <= m.maxLiftCapacity && (m.totalCost <= m.maxBudget || state.gameMode === 'sandbox'),
            statusText: `${m.totalMass}/${m.maxLiftCapacity} kg on ${m.rocket.name}`
        }
    ];
}

function initiateGoNoGoPoll() {
    SoundFX.quindar();
    const m = computeMissionMetrics();
    document.getElementById('goNoGoModal').classList.remove('hidden');

    const s1 = playerCrewState.coopSeats[1];
    const s2 = playerCrewState.coopSeats[2];
    const s3 = playerCrewState.coopSeats[3];
    const s4 = playerCrewState.coopSeats[4];

    const stations = computeGoNoGoStations(m);

    const container = document.getElementById('pollStationsContainer');
    container.innerHTML = stations.map((s, idx) => `
        <div id="pollRow-${idx}" class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 opacity-40 transition-all duration-300">
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-slate-950 border border-cyan-500/40 overflow-hidden shrink-0">
                    ${renderAstronautSVG(s.crew.presetId, s.crew.suitColor, s.go ? 'talking' : 'alert', s.code)}
                </div>
                <div class="min-w-0">
                    <span class="font-bold text-cyan-300">${s.code} // ${s.crew.callsign}</span>
                    <span class="text-slate-400 ml-1 hidden sm:inline">${s.name}</span>
                    <div class="text-[11px] text-slate-300 truncate">${s.statusText}</div>
                </div>
            </div>
            <span id="pollBadge-${idx}" class="px-2.5 py-1 rounded font-bold text-xs bg-slate-800 text-slate-400 shrink-0">STANDBY...</span>
        </div>
    `).join('');

    const summary = document.getElementById('pollSummaryBanner');
    summary.textContent = 'Flight Director polling specialist crew stations sequentially...';

    stations.forEach((s, idx) => {
        setTimeout(() => {
            const row = document.getElementById(`pollRow-${idx}`);
            const badge = document.getElementById(`pollBadge-${idx}`);
            if (!row || !badge) return;
            row.classList.remove('opacity-40');
            if (s.go) {
                SoundFX.beep(880 + idx * 70, 0.08, 'sine', 0.07);
                row.classList.add('border-emerald-500/40');
                badge.className = 'px-2.5 py-1 rounded font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0';
                badge.textContent = 'GO!';
            } else {
                SoundFX.alert();
                row.classList.add('border-rose-500/50');
                badge.className = 'px-2.5 py-1 rounded font-bold text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0';
                badge.textContent = 'NO-GO';
            }

            if (idx === stations.length - 1) {
                const allGo = stations.every(st => st.go);
                summary.className = `p-3 rounded-xl border text-xs font-mono font-bold ${
                    allGo ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                }`;
                summary.textContent = allGo
                    ? 'ALL CREW STATIONS ARE GO FOR LAUNCH! Proceed to 3D Pad 3A9 Liftoff & Staging.'
                    : 'ADVISORY: One or more specialist stations reported constraint warnings. You may still launch with flight penalties or return to VAB.';
            }
        }, (idx + 1) * 320);
    });
}

function resetPadAscentState() {
    state.ascent = {
        active: false,
        stageIndex: 0,
        timer: 0,
        altitudeKm: 0,
        velocityKms: 0,
        manualStageBonus: 0,
        stage1SepTime: 0,
        fairingSepTime: 0
    };
    state.arraysDeployed = false;
    applyExplodedAndArticulationTransforms();
    const m = computeMissionMetrics();
    buildLaunchPadAndVehicleStack(m);
    updateAscentHUD();
}

function start3DPadAscentSequence() {
    closeModal('goNoGoModal');
    setCameraViewMode('pad');
    resetPadAscentState();
    state.ascent.active = true;
    state.ascent.stageIndex = 1;
    SoundFX.rumble(1.2);
    SoundFX.quindar();
    updateAscentHUD();
    renderAllUI();
}

function handleAscentPrimaryAction() {
    const asc = state.ascent;
    if (!asc.active && asc.stageIndex === 0) {
        start3DPadAscentSequence();
        return;
    }
    if (asc.stageIndex === 1 || asc.stageIndex === 2) {
        SoundFX.rumble(0.6);
        SoundFX.success();
        asc.stageIndex = 3;
        asc.stage1SepTime = asc.timer;
        if (state.manualStagingMode) asc.manualStageBonus += 40;
        updateAscentHUD();
    } else if (asc.stageIndex === 3) {
        SoundFX.click();
        SoundFX.success();
        asc.stageIndex = 4;
        asc.fairingSepTime = asc.timer;
        if (state.manualStagingMode) asc.manualStageBonus += 35;
        updateAscentHUD();
    } else if (asc.stageIndex === 4) {
        completeAscentIntoOrbit();
    }
}

function completeAscentIntoOrbit() {
    SoundFX.success();
    state.ascent.active = false;
    state.ascent.stageIndex = 5;
    state.arraysDeployed = true;
    applyExplodedAndArticulationTransforms();
    setCameraViewMode('orbit');
    startMissionSimulation();
}

function updateAscentHUD() {
    const asc = state.ascent;
    const btn = document.getElementById('ascentActionBtn');
    const banner = document.getElementById('ascentStatusBanner');
    if (!btn || !banner) return;

    if (!asc.active && asc.stageIndex === 0) {
        banner.textContent = 'Pad 3A9 Umbilicals Connected. Ready for T-0 Liftoff!';
        btn.className = 'w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-mono font-extrabold text-xs uppercase tracking-wider shadow-lg';
        btn.innerHTML = '<i class="ph-fill ph-rocket-launch mr-1"></i> INITIATE LIFTOFF (T-0)';
    } else if (asc.stageIndex === 1) {
        banner.textContent = 'LIFTOFF! Tower cleared. Crew cheering as booster pitches over...';
        btn.className = 'w-full py-2 rounded-lg bg-amber-500 text-slate-950 font-mono font-extrabold text-xs uppercase stage-btn-ready';
        btn.innerHTML = '<i class="ph-bold ph-arrows-split mr-1"></i> STAGE 1 MECO & SEPARATE';
    } else if (asc.stageIndex === 2) {
        banner.textContent = 'SUPERSONIC MAX-Q! Peak aerodynamic pressure cone active. Ready for MECO!';
        btn.className = 'w-full py-2 rounded-lg bg-amber-400 text-slate-950 font-mono font-extrabold text-xs uppercase stage-btn-ready';
        btn.innerHTML = '<i class="ph-bold ph-arrows-split mr-1"></i> TRIGGER STAGE 1 SEPARATION (+40 PTS)';
    } else if (asc.stageIndex === 3) {
        banner.textContent = 'MECO CONFIRMED! Stage 1 & SRBs separated. Second stage vacuum ignition!';
        btn.className = 'w-full py-2 rounded-lg bg-cyan-400 text-slate-950 font-mono font-extrabold text-xs uppercase stage-btn-ready';
        btn.innerHTML = '<i class="ph-bold ph-shield-slash mr-1"></i> JETTISON CLAMSHELL FAIRING (+35 PTS)';
    } else if (asc.stageIndex === 4) {
        banner.textContent = 'FAIRING JETTISONED! Spacecraft exposed in vacuum. Approaching SECO!';
        btn.className = 'w-full py-2 rounded-lg bg-emerald-400 text-slate-950 font-mono font-extrabold text-xs uppercase stage-btn-ready';
        btn.innerHTML = '<i class="ph-bold ph-planet mr-1"></i> SPACECRAFT SEP & DEPLOY ARRAYS';
    }
}

function animateThreeLoop() {
    requestAnimationFrame(animateThreeLoop);
    if (!threeScene || !threeCamera) return;

    const m = computeMissionMetrics();
    const animSpeed = typeof state.planetAnimSpeed === 'number' ? state.planetAnimSpeed : 1.0;
    orbitAngle += 0.0065 * Math.max(0.2, animSpeed);

    camSpherical.radius = THREE.MathUtils.lerp(camSpherical.radius, targetSpherical.radius, 0.08);
    camSpherical.theta = THREE.MathUtils.lerp(camSpherical.theta, targetSpherical.theta, 0.12);
    camSpherical.phi = THREE.MathUtils.lerp(camSpherical.phi, targetSpherical.phi, 0.12);

    if (webglFallbackMode || !threeRenderer) {
        renderFallback2DViewport(m);
        return;
    }

    const targetExploded = state.explodedFactor || 0;
    const targetDeploy = state.arraysDeployed ? 1.0 : 0.0;
    if (Math.abs(smoothedExploded - targetExploded) > 0.001 || Math.abs(smoothedDeploy - targetDeploy) > 0.001) {
        smoothedExploded = THREE.MathUtils.lerp(smoothedExploded, targetExploded, 0.12);
        smoothedDeploy = THREE.MathUtils.lerp(smoothedDeploy, targetDeploy, 0.10);
        applyExplodedAndArticulationTransforms(smoothedExploded, smoothedDeploy);
    }

    const baseSpin = 0.0022 * animSpeed;
    if (planetSurfaceMesh && !state.europaOceanCutaway) planetSurfaceMesh.rotation.y += baseSpin;
    if (earthNightMesh) earthNightMesh.rotation.y += baseSpin;
    if (planetCloudMesh) planetCloudMesh.rotation.y += baseSpin * 1.28;
    if (destinationOverlayGroup && !state.europaOceanCutaway) destinationOverlayGroup.rotation.y += baseSpin;
    if (jupiterBackdropGroup && jupiterBackdropGroup.children[0]) {
        jupiterBackdropGroup.children[0].rotation.y += baseSpin * 1.8;
    }
    if (dsnBeamLine) {
        dsnBeamLine.material.opacity = (cameraMode !== 'spacecraft' && state.flightAttitude === 'dsn') ? (0.35 + Math.sin(orbitAngle * 25) * 0.15) : 0.0;
    }

    let desiredCamPos = new THREE.Vector3();
    let desiredLookAt = new THREE.Vector3();

    if (cameraMode === 'pad') {
        padGroup.visible = true;
        if (subSatMarker) subSatMarker.visible = false;
        if (cleanroomPedestalGroup) cleanroomPedestalGroup.visible = false;
        planetGroup.position.set(0, -18, -16);

        const asc = state.ascent;
        const swingArm = padGroup.getObjectByName('swingArm');

        if (asc.active) {
            asc.timer += (typeof padFlightDt === 'function' ? padFlightDt() : 0.025);
            asc.altitudeKm = Math.min(240, asc.timer * asc.timer * 2.4);
            asc.velocityKms = Math.min(m.effectiveDeltaV, asc.timer * 0.92);

            document.getElementById('ascentTimerLabel').textContent = `T+00:${String(Math.floor(asc.timer * 4)).padStart(2, '0')}`;
            document.getElementById('ascentAltLabel').textContent = `${asc.altitudeKm.toFixed(1)} km`;
            document.getElementById('ascentVelLabel').textContent = `${asc.velocityKms.toFixed(2)} km/s`;

            if (swingArm && swingArm.rotation.y < 1.1) {
                swingArm.rotation.y += 0.04;
            }

            if (asc.stageIndex === 1 && asc.timer > 2.2) {
                asc.stageIndex = 2;
                updateAscentHUD();
            }

            if (!state.manualStagingMode) {
                if (asc.stageIndex === 2 && asc.timer > 4.2) handleAscentPrimaryAction();
                if (asc.stageIndex === 3 && asc.timer > 6.5) handleAscentPrimaryAction();
                if (asc.stageIndex === 4 && asc.timer > 9.0) handleAscentPrimaryAction();
            }

            const liftY = -4.0 + Math.min(4.8, asc.timer * 0.75);
            launchStackGroup.position.y = liftY;
            launchStackGroup.rotation.z = -Math.min(0.32, asc.timer * 0.03);

            if (padExhaustParticles) {
                padExhaustParticles.material.opacity = asc.stageIndex <= 2 ? 0.65 : 0.0;
                const posAttr = padExhaustParticles.geometry.attributes.position;
                for (let i = 0; i < posAttr.count; i++) {
                    let py = posAttr.getY(i) - 0.16;
                    if (py < -5.8) py = liftY - 0.4;
                    posAttr.setY(i, py);
                }
                posAttr.needsUpdate = true;
            }

            if (asc.stageIndex <= 2) {
                stage1PlumeMesh.material.opacity = 0.75 + Math.sin(asc.timer * 30) * 0.2;
                stage1PlumeMesh.scale.y = 0.9 + Math.sin(asc.timer * 25) * 0.25;
                engineLight.intensity = 2.4;
                engineLight.position.set(0, liftY - 1.5, 1);
                maxQShockCone.material.opacity = asc.stageIndex === 2 ? (0.38 + Math.sin(asc.timer * 20) * 0.1) : 0.0;
            } else {
                stage1PlumeMesh.material.opacity = 0.0;
                maxQShockCone.material.opacity = 0.0;
                const dtSep = Math.max(0, asc.timer - asc.stage1SepTime);
                rocketStage1Group.position.y = -dtSep * 2.6;
                rocketStage1Group.rotation.z = dtSep * 0.25;
                if (rocketSrbLeft && rocketSrbRight) {
                    rocketSrbLeft.position.x = -1.2 - dtSep * 1.4;
                    rocketSrbLeft.position.y = -dtSep * 2.2;
                    rocketSrbLeft.rotation.z = dtSep * 0.5;
                    rocketSrbRight.position.x = 1.2 + dtSep * 1.4;
                    rocketSrbRight.position.y = -dtSep * 2.2;
                    rocketSrbRight.rotation.z = -dtSep * 0.5;
                }
                stage2PlumeMesh.material.opacity = 0.85;
                stage2PlumeMesh.scale.y = 1.0 + Math.sin(asc.timer * 28) * 0.2;
            }

            if (asc.stageIndex >= 4) {
                const dtFair = Math.max(0, asc.timer - asc.fairingSepTime);
                fairingLeftGroup.position.x = -dtFair * 2.1;
                fairingLeftGroup.position.y = 1.65 - dtFair * 0.8;
                fairingLeftGroup.rotation.z = dtFair * 0.75;

                fairingRightGroup.position.x = dtFair * 2.1;
                fairingRightGroup.position.y = 1.65 - dtFair * 0.8;
                fairingRightGroup.rotation.z = -dtFair * 0.75;
            }
        } else {
            engineLight.intensity = 0;
            if (padExhaustParticles) padExhaustParticles.material.opacity = 0.0;
        }

        const s2WorldPos = new THREE.Vector3();
        rocketStage2Group.getWorldPosition(s2WorldPos);
        spacecraftGroup.position.copy(s2WorldPos);
        spacecraftGroup.position.y += 2.3;
        spacecraftGroup.scale.set(0.36, 0.36, 0.36);
        spacecraftGroup.rotation.copy(launchStackGroup.rotation);

        desiredCamPos.set(
            camSpherical.radius * Math.sin(camSpherical.phi) * Math.sin(camSpherical.theta),
            camSpherical.radius * Math.cos(camSpherical.phi) + (asc.active ? 1.5 : 0),
            camSpherical.radius * Math.sin(camSpherical.phi) * Math.cos(camSpherical.theta)
        );
        desiredLookAt.set(0, asc.active ? 1.2 : -0.5, 0);
    } else {
        padGroup.visible = false;
        engineLight.intensity = 0;
        if (cleanroomPedestalGroup) {
            cleanroomPedestalGroup.visible = (cameraMode === 'spacecraft');
            cleanroomPedestalGroup.rotation.y -= 0.002;
        }

        const rPe3D = 3.2 * (1 + m.pe / 2200);
        const rAp3D = 3.2 * (1 + m.ap / 2200);
        const a = (rPe3D + rAp3D) / 2;
        const c = (rAp3D - rPe3D) / 2;
        const b = Math.sqrt(Math.max(1, a * a - c * c));
        const incRad = THREE.MathUtils.degToRad(state.inclinationDeg * 0.65);

        const ox = Math.cos(orbitAngle) * a - c;
        const oz = Math.sin(orbitAngle) * b;
        const scY = oz * Math.sin(incRad);
        const scZ = oz * Math.cos(incRad);
        const orbitalPos = new THREE.Vector3(ox, scY, scZ);
        if (subSatMarker) {
            subSatMarker.visible = (cameraMode !== 'spacecraft');
            subSatMarker.position.copy(orbitalPos).normalize().multiplyScalar(3.24);
            subSatMarker.lookAt(0, 0, 0);
        }
        if (groundTrackLine) groundTrackLine.visible = (cameraMode !== 'spacecraft');

        const distFromShadowAxis = Math.sqrt(scY * scY + scZ * scZ);
        const isEclipsed = (ox < -0.5 && distFromShadowAxis < 3.15);
        if (isEclipsed !== state.inUmbraShadow) {
            state.inUmbraShadow = isEclipsed;
            const umbraEl = document.getElementById('umbraStatusBadge');
            if (umbraEl) {
                umbraEl.className = isEclipsed
                    ? 'px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                    : 'px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold';
                umbraEl.innerHTML = isEclipsed
                    ? '<i class="ph-fill ph-moon-stars"></i> IN 3D UMBRA SHADOW (0W SOLAR)'
                    : `<i class="ph-fill ph-sun"></i> SUNLIT (${Math.round(m.scenario.solarFluxMultiplier*100)}% FLUX)`;
            }
        }

        if (state.flightAttitude === 'nadir') {
            state.ssrFillPct = Math.min(100, state.ssrFillPct + 0.03);
        } else if (state.flightAttitude === 'dsn') {
            state.ssrFillPct = Math.max(2, state.ssrFillPct - 0.06);
        }
        const ssrEl = document.getElementById('ssrBufferBadge');
        if (ssrEl) ssrEl.textContent = `SSR: ${Math.round(state.ssrFillPct)}%`;

        if (sensorSwathMesh) {
            sensorSwathMesh.visible = (cameraMode !== 'spacecraft' && state.flightAttitude === 'nadir');
        }

        if (cameraMode === 'spacecraft') {
            spacecraftGroup.position.set(0, Math.sin(orbitAngle * 3) * 0.08, 0);
            spacecraftGroup.scale.set(1.06, 1.06, 1.06);
            spacecraftGroup.rotation.y += 0.004;
            planetGroup.position.set(-5.8, -2.5, -8.2);

            desiredCamPos.set(
                camSpherical.radius * Math.sin(camSpherical.phi) * Math.sin(camSpherical.theta),
                camSpherical.radius * Math.cos(camSpherical.phi),
                camSpherical.radius * Math.sin(camSpherical.phi) * Math.cos(camSpherical.theta)
            );
            desiredLookAt.set(0, 0, 0);
        } else if (cameraMode === 'orbit') {
            planetGroup.position.set(0, 0, 0);
            spacecraftGroup.position.copy(orbitalPos);
            spacecraftGroup.scale.set(0.45, 0.45, 0.45);
            spacecraftGroup.lookAt(0, 0, 0);

            desiredCamPos.set(
                camSpherical.radius * Math.sin(camSpherical.phi) * Math.sin(camSpherical.theta),
                camSpherical.radius * Math.cos(camSpherical.phi),
                camSpherical.radius * Math.sin(camSpherical.phi) * Math.cos(camSpherical.theta)
            );
            desiredLookAt.set(0, 0, 0);
        } else if (cameraMode === 'chase') {
            planetGroup.position.set(0, 0, 0);
            spacecraftGroup.position.copy(orbitalPos);
            spacecraftGroup.scale.set(0.55, 0.55, 0.55);
            spacecraftGroup.lookAt(0, 0, 0);

            const chaseOffset = orbitalPos.clone().normalize().multiplyScalar(2.6);
            desiredCamPos.copy(orbitalPos).add(chaseOffset).add(new THREE.Vector3(0, 1.0, 1.3));
            desiredLookAt.copy(orbitalPos);
        } else if (cameraMode === 'nadir') {
            planetGroup.position.set(0, 0, 0);
            spacecraftGroup.position.copy(orbitalPos);
            spacecraftGroup.scale.set(0.35, 0.35, 0.35);

            desiredCamPos.copy(orbitalPos).multiplyScalar(0.92);
            desiredLookAt.set(0, 0, 0);
        }
    }

    smoothedCamPos.lerp(desiredCamPos, 0.12);
    smoothedLookAt.lerp(desiredLookAt, 0.14);
    threeCamera.position.copy(smoothedCamPos);
    threeCamera.lookAt(smoothedLookAt);

    if (typeof padFlightFrame === 'function') padFlightFrame(m);   // Pad 3A9 Earth-to-space flight view
    threeRenderer.render(threeScene, threeCamera);
}

