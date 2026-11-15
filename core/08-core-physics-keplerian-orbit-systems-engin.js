/* A.T.L.A.S · section 7 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 7. CORE PHYSICS, KEPLERIAN ORBIT & SYSTEMS ENGINEERING CALCULATOR
 ***********************************************************************/
function computeMissionMetrics() {
    const scenario = SCENARIOS.find(s => s.id === state.activeScenarioId);
    const chassis = SUBSYSTEMS.chassis.find(c => c.id === state.chassis);
    const powerSys = SUBSYSTEMS.power.find(p => p.id === state.power);
    const battery = SUBSYSTEMS.battery.find(b => b.id === state.battery);
    const shield = SUBSYSTEMS.shield.find(s => s.id === state.shield);
    const orbit = ORBITS.find(o => o.id === state.orbit);
    const comms = COMMS.find(c => c.id === state.comms);
    const rocket = ROCKETS.find(r => r.id === state.rocket);
    const activePayloads = PAYLOADS.filter(p => state.payloads.includes(p.id));

    const diffBudgetMult = state.difficulty === 'cadet' ? 1.15 : (state.difficulty === 'director' ? 0.90 : 1.0);
    const maxBudget = state.gameMode === 'sandbox' ? 9999 : Math.round(scenario.budget * diffBudgetMult);

    const pe = Math.min(state.periapsisKm, state.apoapsisKm);
    const ap = Math.max(state.periapsisKm, state.apoapsisKm);
    const meanAltKm = (pe + ap) / 2;
    const rPe = 6371 + pe;
    const rAp = 6371 + ap;
    const eccentricity = (rAp - rPe) / (rAp + rPe);

    const altDeltaVAdder = ((meanAltKm - 600) / 1000) * 0.45 + (Math.abs(state.inclinationDeg - 28) / 90) * 0.35;
    const effectiveDeltaV = Number((orbit.deltaV + Math.max(-0.3, altDeltaVAdder)).toFixed(1));
    const effectiveEclipseFraction = Math.max(0.08, Math.min(0.42, orbit.eclipseFraction * (1 - (meanAltKm - 600) / 9500)));

    const vanAllenExtraRad = (orbit.body === 'earth' && ap > 2000) ? 1 : 0;
    const effectiveRadLevel = Math.min(4, orbit.radLevel + vanAllenExtraRad);

    const payloadMass = activePayloads.reduce((sum, p) => sum + p.mass, 0);
    const eecomMass = state.eecomReserveActive ? 12 : 0;
    const totalMass = chassis.mass + powerSys.mass + battery.mass + shield.mass + comms.mass + payloadMass + eecomMass;

    const deltaVFactor = Math.max(0.26, 1 - ((effectiveDeltaV - 9.4) * 0.085));
    const maxLiftCapacity = Math.round(rocket.baseCapacityKg * deltaVFactor);

    const payloadCost = activePayloads.reduce((sum, p) => sum + p.cost, 0);
    const eecomCost = state.eecomReserveActive ? 6 : 0;
    const totalCost = chassis.cost + powerSys.cost + battery.cost + shield.cost + comms.cost + rocket.cost + payloadCost + eecomCost + state.teamMods.costMod;

    const orbitScenario = SCENARIOS.find(s => s.targetBody === orbit.body) || scenario;
    const attitudeSolarMult = state.flightAttitude === 'sun' ? 1.15 : 1.0;
    const fluxMult = powerSys.isSolar ? (orbitScenario.solarFluxMultiplier * attitudeSolarMult) : 1.0;
    const generatedWatts = Math.round(powerSys.baseWatts * fluxMult) + state.teamMods.powerBonusW;

    const overclockPowerMult = state.scienceOverclockActive ? 1.25 : 1.0;
    const attitudeLoadMult = state.flightAttitude === 'sun' ? 0.65 : 1.0;
    const payloadWatts = Math.round(activePayloads.reduce((sum, p) => sum + p.power, 0) * overclockPowerMult * attitudeLoadMult);
    const busWatts = 45 + shield.powerDraw + comms.power;
    const totalWattsRequired = payloadWatts + busWatts;
    const netWatts = generatedWatts - totalWattsRequired;

    const effectiveBatteryWh = Math.round(battery.capacityWh * (state.eecomReserveActive ? 1.15 : 1.0));
    const eclipseEnergyReqWh = Math.round(totalWattsRequired * effectiveEclipseFraction * 2.1);
    const batteryMarginWh = effectiveBatteryWh - eclipseEnergyReqWh;

    const dataGeneratedGbps = Math.round(activePayloads.reduce((sum, p) => sum + p.dataGbps, 0) * (state.scienceOverclockActive ? 1.15 : 1.0));
    const dsnAttitudeBoost = state.flightAttitude === 'dsn' ? 1.20 : 1.0;
    const effectiveDownlinkGbps = Math.round(comms.baseGbps * orbitScenario.commsDistancePenalty * dsnAttitudeBoost);
    const dataCaptureRatio = dataGeneratedGbps > 0
        ? Math.min(1.0, effectiveDownlinkGbps / dataGeneratedGbps)
        : 0;

    let rawScience = 0;
    activePayloads.forEach(p => {
        const bodySynergy = p.synergyBodies.includes(orbit.body) ? 1.35 : 0.85;
        rawScience += p.baseScience * bodySynergy;
    });
    const destinationMatchMult = (orbit.body === scenario.targetBody) ? 1.0 : 0.45;
    const overclockSciMult = state.scienceOverclockActive ? 1.20 : 1.0;
    const teamScienceMult = 1 + (state.teamMods.scienceBonusPct / 100);
    const effectiveScience = Math.round(rawScience * orbit.scienceMult * dataCaptureRatio * destinationMatchMult * overclockSciMult * teamScienceMult);

    const radDeficit = Math.max(0, effectiveRadLevel - shield.radRating);
    const radPenalty = radDeficit * 18;
    const reliability = Math.max(15, Math.min(99, Math.round(
        ((chassis.reliability + rocket.reliability) / 2) + shield.reliabilityBonus - radPenalty
    )));

    const diagnostics = [];
    let hardFailures = 0;

    if (orbit.body !== scenario.targetBody && state.gameMode !== 'sandbox') {
        diagnostics.push({
            level: 'critical',
            title: 'WRONG PLANETARY TARGET ORBIT',
            msg: `Mission "${scenario.name}" targets ${scenario.targetBody.toUpperCase()}, but your selected orbit is around ${orbit.body.toUpperCase()}.`
        });
        hardFailures++;
    }

    if (totalMass > maxLiftCapacity) {
        diagnostics.push({
            level: 'critical',
            title: 'LAUNCH VEHICLE OVERWEIGHT',
            msg: `Spacecraft mass (${totalMass} kg) exceeds ${rocket.name}'s lift capacity to ${pe}x${ap} km orbit (${maxLiftCapacity} kg).`
        });
        hardFailures++;
    }

    if (totalCost > maxBudget && state.gameMode !== 'sandbox') {
        diagnostics.push({
            level: 'critical',
            title: 'BUDGET OVERRUN',
            msg: `Total cost ($${totalCost}M) exceeds allocated budget ($${maxBudget}M) by $${totalCost - maxBudget}M.`
        });
        hardFailures++;
    }

    if (netWatts < 0) {
        diagnostics.push({
            level: 'critical',
            title: 'NEGATIVE POWER BALANCE',
            msg: `Load draws ${totalWattsRequired}W, but ${powerSys.name} only supplies ${generatedWatts}W at ${orbit.body.toUpperCase()}.`
        });
        hardFailures++;
    } else if (batteryMarginWh < 0) {
        diagnostics.push({
            level: 'warning',
            title: 'ECLIPSE BATTERY DEFICIT',
            msg: `During ${Math.round(effectiveEclipseFraction*100)}% umbra eclipse, spacecraft requires ${eclipseEnergyReqWh} Wh vs ${effectiveBatteryWh} Wh capacity.`
        });
    }

    if (dataCaptureRatio < 0.95 && dataGeneratedGbps > 0) {
        const lostPct = Math.round((1 - dataCaptureRatio) * 100);
        diagnostics.push({
            level: 'warning',
            title: `DSN DOWNLINK BOTTLENECK (${lostPct}% LOST)`,
            msg: `Instruments generate ${dataGeneratedGbps} Gbps, but ${comms.name} downlinks ${effectiveDownlinkGbps} Gbps.`
        });
    }

    if (radDeficit > 0) {
        diagnostics.push({
            level: 'warning',
            title: 'RADIATION SHIELDING DEFICIT',
            msg: `Orbit has Radiation Level ${effectiveRadLevel}, while ${shield.name} is rated Level ${shield.radRating} (-${radPenalty}% Rel).`
        });
    }

    if (diagnostics.length === 0) {
        diagnostics.push({
            level: 'nominal',
            title: 'ALL SYSTEMS GO FOR PAD 3A9 LAUNCH',
            msg: `Power +${netWatts}W, 100% DSN capture, +${maxLiftCapacity - totalMass} kg lift margin, and $${maxBudget - totalCost}M under budget.`
        });
    }

    let readiness = 100;
    if (totalMass > maxLiftCapacity) readiness -= 35;
    if (totalCost > maxBudget && state.gameMode !== 'sandbox') readiness -= 25;
    if (netWatts < 0) readiness -= 35;
    if (batteryMarginWh < 0) readiness -= 15;
    if (orbit.body !== scenario.targetBody && state.gameMode !== 'sandbox') readiness -= 30;
    readiness -= Math.round((1 - dataCaptureRatio) * 20);
    readiness -= radPenalty;
    readiness = Math.max(5, Math.min(100, readiness));

    return {
        scenario, chassis, powerSys, battery, shield, orbit, comms, rocket, activePayloads,
        pe, ap, eccentricity, effectiveDeltaV, effectiveEclipseFraction, effectiveRadLevel,
        maxBudget, totalCost, totalMass, maxLiftCapacity,
        generatedWatts, totalWattsRequired, netWatts, effectiveBatteryWh, eclipseEnergyReqWh, batteryMarginWh,
        dataGeneratedGbps, effectiveDownlinkGbps, dataCaptureRatio,
        effectiveScience, reliability, readiness, hardFailures, diagnostics
    };
}

