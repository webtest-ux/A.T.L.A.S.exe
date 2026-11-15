/* A.T.L.A.S · section 3 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 3. SPACE MISSION ENGINEERING DATABASE
 ***********************************************************************/
const SCENARIOS = [
    {
        id: 'earth_pulse',
        name: 'EARTH-PULSE (Climate & SAR)',
        targetBody: 'earth',
        badge: 'EARTH OBSERVATION',
        budget: 180,
        targetScience: 350,
        minDownlink: 120,
        recommendedOrbits: ['leo', 'sso'],
        requiredRadiation: 1,
        solarFluxMultiplier: 1.0,
        commsDistancePenalty: 1.0,
        desc: 'Monitor polar ice-sheet melt, deforestation, and ocean currents using all-weather radar and thermal imaging.',
        optimalPreset: {
            chassis: 'microsat', power: 'solar_gaas', battery: 'li_ion', shield: 'std_adcs',
            payloads: ['sar_radar', 'hyperspectral', 'magnetometer'],
            orbit: 'sso', comms: 'x_band', rocket: 'falcon_med',
            periapsisKm: 650, apoapsisKm: 750, inclinationDeg: 98
        }
    },
    {
        id: 'artemis_lunar',
        name: 'ARTEMIS LUNAR SOUTH POLE',
        targetBody: 'moon',
        badge: 'CISLUNAR EXPLORATION',
        budget: 320,
        targetScience: 550,
        minDownlink: 110,
        recommendedOrbits: ['lunar_polar'],
        requiredRadiation: 2,
        solarFluxMultiplier: 1.0,
        commsDistancePenalty: 0.75,
        desc: 'Map shadowed water-ice craters at the Lunar South Pole and establish high-precision topography for crewed landings.',
        optimalPreset: {
            chassis: 'hexbus', power: 'solar_roas', battery: 'solid_state', shield: 'cryo_thruster',
            payloads: ['ice_sounder', 'laser_altimeter', 'mass_spec'],
            orbit: 'lunar_polar', comms: 'ka_dish', rocket: 'falcon_med',
            periapsisKm: 300, apoapsisKm: 900, inclinationDeg: 89
        }
    },
    {
        id: 'red_horizon',
        name: 'RED HORIZON MARS ORBITER',
        targetBody: 'mars',
        badge: 'INTERPLANETARY',
        budget: 500,
        targetScience: 850,
        minDownlink: 130,
        recommendedOrbits: ['mars_orbit'],
        requiredRadiation: 3,
        solarFluxMultiplier: 0.45,
        commsDistancePenalty: 0.55,
        desc: 'Search for atmospheric methane biosignatures and probe buried Martian glaciers across deep interplanetary distances.',
        optimalPreset: {
            chassis: 'hexbus', power: 'solar_roas', battery: 'solid_state', shield: 'cryo_thruster',
            payloads: ['ice_sounder', 'hyperspectral', 'laser_altimeter', 'mass_spec'],
            orbit: 'mars_orbit', comms: 'lasercomm', rocket: 'vulcan_heavy',
            periapsisKm: 400, apoapsisKm: 1800, inclinationDeg: 72
        }
    },
    {
        id: 'europa_clipper',
        name: 'EUROPA OCEAN RECON (Jovian)',
        targetBody: 'europa',
        badge: 'EXTREME DEEP SPACE',
        budget: 750,
        targetScience: 1200,
        minDownlink: 100,
        recommendedOrbits: ['jovian_flyby'],
        requiredRadiation: 4,
        solarFluxMultiplier: 0.08,
        commsDistancePenalty: 0.40,
        desc: 'Survive Jupiter’s lethal radiation belts while probing beneath Europa’s icy crust for a subsurface liquid ocean.',
        optimalPreset: {
            chassis: 'titan_bus', power: 'mmrtg', battery: 'solid_state', shield: 'rad_vault',
            payloads: ['ice_sounder', 'sar_radar', 'magnetometer', 'mass_spec'],
            orbit: 'jovian_flyby', comms: 'lasercomm', rocket: 'sls_super',
            periapsisKm: 350, apoapsisKm: 4500, inclinationDeg: 45
        }
    }
];

const SUBSYSTEMS = {
    chassis: [
        { id: 'cubesat', name: '12U Nano-CubeSat Bus', mass: 35, cost: 12, maxPayloads: 2, reliability: 86, desc: 'Ultra-lightweight modular frame. Strictly limited to 2 instruments.' },
        { id: 'microsat', name: 'Composite MicroSat Bus', mass: 120, cost: 32, maxPayloads: 3, reliability: 92, desc: 'Agile aluminum-honeycomb bus for LEO/SSO missions (up to 3 payloads).' },
        { id: 'hexbus', name: 'DeepSpace Hex-Bus', mass: 260, cost: 65, maxPayloads: 4, reliability: 95, desc: 'High-heritage planetary bus with integrated propellant tanks (4 payloads).' },
        { id: 'titan_bus', name: 'Heavy Titan Flagship Bus', mass: 450, cost: 110, maxPayloads: 4, reliability: 98, desc: 'Dual-fault tolerant flagship structure built for outer-planet endurance.' }
    ],
    power: [
        { id: 'solar_gaas', name: 'Deployable GaAs Solar Wings', mass: 45, cost: 20, baseWatts: 340, isSolar: true, desc: 'Standard triple-junction solar arrays. Great at Earth/Moon, weak in deep space.' },
        { id: 'solar_roas', name: 'Ultra-Flex Roll-Out Solar (ROSA)', mass: 75, cost: 48, baseWatts: 760, isSolar: true, desc: 'High-power roll-out wings. Generates 760W at 1 AU; scales with sunlight.' },
        { id: 'mmrtg', name: 'Dual MMRTG Nuclear Isotope', mass: 115, cost: 115, baseWatts: 480, isSolar: false, desc: 'Plutonium-238 constant 480W power Day/Night regardless of solar distance!' }
    ],
    battery: [
        { id: 'li_ion', name: 'Standard Li-Ion Pack', mass: 28, cost: 12, capacityWh: 420, desc: '420 Wh storage for short LEO eclipses.' },
        { id: 'solid_state', name: 'NextGen Solid-State Bank', mass: 42, cost: 28, capacityWh: 920, desc: 'High-density 920 Wh reserve for power-hungry radars during eclipse.' },
        { id: 'regen_fuel', name: 'Regenerative Fuel Cell Vault', mass: 70, cost: 45, capacityWh: 1650, desc: '1,650 Wh deep-discharge energy bank for extreme occultations.' }
    ],
    shield: [
        { id: 'std_adcs', name: 'Reaction Wheels + Star Tracker', mass: 30, cost: 15, powerDraw: 35, radRating: 1, reliabilityBonus: 0, desc: 'Precision pointing for Earth orbit. Minimal radiation shielding (Rad Lv 1).' },
        { id: 'cryo_thruster', name: 'Bipropellant + Cryo-Radiators', mass: 68, cost: 38, powerDraw: 55, radRating: 3, reliabilityBonus: 4, desc: 'Active thermal control & hardened electronics for Lunar/Mars (Rad Lv 3).' },
        { id: 'rad_vault', name: 'Titanium-Tantalum Radiation Vault', mass: 135, cost: 82, powerDraw: 65, radRating: 4, reliabilityBonus: 8, desc: 'Heavy vault armor protecting avionics from Jovian radiation belts (Rad Lv 4).' }
    ]
};

const PAYLOADS = [
    {
        id: 'sar_radar',
        name: 'L/S-Band Synthetic Aperture Radar',
        icon: 'ph-waves',
        mass: 115, power: 165, cost: 55, dataGbps: 110, baseScience: 240,
        synergyBodies: ['earth', 'europa'],
        desc: 'Penetrates clouds and surface ice day or night. Huge science, but heavy power & data rate.'
    },
    {
        id: 'hyperspectral',
        name: 'Hyperspectral Thermal Imager',
        icon: 'ph-aperture',
        mass: 65, power: 85, cost: 38, dataGbps: 75, baseScience: 185,
        synergyBodies: ['earth', 'mars'],
        desc: 'Maps mineral composition, atmospheric greenhouse gases, and thermal anomalies.'
    },
    {
        id: 'ice_sounder',
        name: 'Subsurface Ice-Penetrating Sounder',
        icon: 'ph-radar',
        mass: 95, power: 130, cost: 62, dataGbps: 65, baseScience: 260,
        synergyBodies: ['moon', 'mars', 'europa'],
        desc: 'Low-frequency radar dipole that probes up to 5 km beneath lunar regolith or icy crusts.'
    },
    {
        id: 'laser_altimeter',
        name: 'LIDAR Altimeter & Gravity Gradiometer',
        icon: 'ph-crosshair',
        mass: 55, power: 75, cost: 34, dataGbps: 40, baseScience: 165,
        synergyBodies: ['moon', 'mars', 'earth'],
        desc: 'Centimeter-accurate 3D terrain mapping and subsurface mass-concentration detection.'
    },
    {
        id: 'magnetometer',
        name: 'Boom Magnetometer & Plasma Wave',
        icon: 'ph-magnet',
        mass: 25, power: 30, cost: 18, dataGbps: 20, baseScience: 120,
        synergyBodies: ['earth', 'europa'],
        desc: 'Low-mass, low-power sensor measuring planetary magnetic fields and induced ocean currents.'
    },
    {
        id: 'mass_spec',
        name: 'Exosphere & Plume Mass Spectrometer',
        icon: 'ph-flask',
        mass: 48, power: 60, cost: 42, dataGbps: 30, baseScience: 195,
        synergyBodies: ['moon', 'mars', 'europa'],
        desc: 'Sniffs trace water vapor, organic molecules, and cryovolcanic plumes in orbit.'
    }
];

const ORBITS = [
    {
        id: 'leo', name: 'Low Earth Orbit (LEO)', body: 'earth',
        eclipseFraction: 0.34, deltaV: 9.4, radLevel: 1, scienceMult: 1.0,
        defaultPe: 450, defaultAp: 550, defaultInc: 28,
        desc: 'Close range, low launch Delta-V, high resolution, but 34% eclipse darkness.'
    },
    {
        id: 'sso', name: 'Sun-Synchronous Polar (SSO)', body: 'earth',
        eclipseFraction: 0.20, deltaV: 9.8, radLevel: 1, scienceMult: 1.15,
        defaultPe: 650, defaultAp: 750, defaultInc: 98,
        desc: 'Global pole-to-pole Earth coverage with consistent lighting and shorter eclipses.'
    },
    {
        id: 'lunar_polar', name: 'Lunar Polar Mapping (LLO)', body: 'moon',
        eclipseFraction: 0.25, deltaV: 12.6, radLevel: 2, scienceMult: 1.35,
        defaultPe: 300, defaultAp: 900, defaultInc: 89,
        desc: 'Passes directly over Lunar South Pole craters. Requires higher Delta-V and deep-space comms.'
    },
    {
        id: 'mars_orbit', name: 'Areostationary / Mars Capture', body: 'mars',
        eclipseFraction: 0.22, deltaV: 14.2, radLevel: 3, scienceMult: 1.65,
        defaultPe: 400, defaultAp: 1800, defaultInc: 72,
        desc: 'Interplanetary transfer to Mars. Weakened solar flux (45%) and long comms distance.'
    },
    {
        id: 'jovian_flyby', name: 'Jovian Resonant Europa Flyby', body: 'europa',
        eclipseFraction: 0.18, deltaV: 16.8, radLevel: 4, scienceMult: 2.1,
        defaultPe: 350, defaultAp: 4500, defaultInc: 45,
        desc: 'Extreme Delta-V, severe radiation (Lv 4), and 8% sunlight—highest scientific reward!'
    }
];

const COMMS = [
    { id: 's_band', name: 'S-Band Omni Patch Antenna', mass: 12, power: 20, cost: 10, baseGbps: 55, desc: 'Low cost & mass, but low bandwidth (55 Gbps base). Prone to data bottlenecks.' },
    { id: 'x_band', name: 'X-Band High-Gain Phased Array', mass: 28, power: 45, cost: 24, baseGbps: 155, desc: 'Reliable high-rate Earth/Lunar downlink (155 Gbps base).' },
    { id: 'ka_dish', name: 'Ka-Band 2.5m Parabolic Dish', mass: 48, power: 70, cost: 42, baseGbps: 260, desc: 'High-gain parabolic dish built for Lunar & Planetary science streams (260 Gbps base).' },
    { id: 'lasercomm', name: 'Deep-Space Optical Lasercomm', mass: 38, power: 85, cost: 65, baseGbps: 420, desc: 'Infrared laser terminal delivering ultra-high bandwidth across interplanetary space.' }
];

const ROCKETS = [
    { id: 'electron_micro', name: 'Electron-Class Microlift', cost: 22, baseCapacityKg: 320, reliability: 93, srbCount: 0, color: 0x1e293b, radius: 0.42, height: 4.2, desc: 'Carbon-composite dedicated small-launcher for CubeSats & light LEO payloads.' },
    { id: 'falcon_med', name: 'Falcon-Class Reusable Medium', cost: 58, baseCapacityKg: 1150, reliability: 98, srbCount: 0, color: 0xf8fafc, radius: 0.56, height: 5.4, desc: 'Workhorse reusable booster with titanium grid fins for LEO, SSO, and Lunar transfers.' },
    { id: 'vulcan_heavy', name: 'Vulcan/Ariane Heavy Lifter', cost: 105, baseCapacityKg: 2100, reliability: 96, srbCount: 2, color: 0xe2e8f0, radius: 0.68, height: 5.8, desc: 'High-energy cryogenic core + Twin Solid Rocket Boosters (SRBs) for Mars & Planetary.' },
    { id: 'sls_super', name: 'SLS / Super-Heavy Deep Space', cost: 175, baseCapacityKg: 4200, reliability: 97, srbCount: 2, color: 0xd97706, radius: 0.82, height: 6.4, desc: 'Cryogenic Orange Core Stage + Twin Heavy SRBs built for Outer Solar System flagships.' }
];

const TEAM_DILEMMAS = [
    {
        title: 'DISPUTE #1: SAR Radar Power Spike vs. Battery Mass Budget',
        context: 'The Lead Scientist (SEAT 3) wants to run the Synthetic Aperture Radar continuously during orbital eclipse, but EECOM (SEAT 2) warns this risks draining the battery below safe thermal survival limits.',
        options: [
            {
                label: 'Approve High-Duty Cycle Science (+12% Science, -30W Power Margin)',
                effect: { scienceBonusPct: 12, powerBonusW: -30, costMod: 0, synergyMod: 5 },
                roleTag: 'SCIENCE Priority'
            },
            {
                label: 'Enforce 25% Eclipse Power Throttling (+45W Power Margin, +4% Reliability)',
                effect: { scienceBonusPct: -5, powerBonusW: 45, costMod: 0, synergyMod: 8 },
                roleTag: 'EECOM Priority'
            },
            {
                label: 'Fund Custom High-Efficiency MPPT Power Controller (+$10M Cost, +30W, +5% Science)',
                effect: { scienceBonusPct: 5, powerBonusW: 30, costMod: 10, synergyMod: 12 },
                roleTag: 'FLIGHT Consensus'
            }
        ]
    },
    {
        title: 'DISPUTE #2: Deep Space Network (DSN) Bandwidth Contention',
        context: 'FIDO & Comms (SEAT 4) report that onboard instruments are generating massive raw telemetry. Without onboard AI compression or a comms boost, science packets may overflow the SSR.',
        options: [
            {
                label: 'Install Onboard FPGA Data Compression (+20% Effective Downlink, +$8M Cost)',
                effect: { scienceBonusPct: 6, powerBonusW: -10, costMod: 8, synergyMod: 12 },
                roleTag: 'FIDO & SCIENCE Consensus'
            },
            {
                label: 'De-scope Instrument Duty Rate to Save Budget (-$12M Cost Saved, -8% Science)',
                effect: { scienceBonusPct: -8, powerBonusW: 20, costMod: -12, synergyMod: 6 },
                roleTag: 'FLIGHT Cost-Cap'
            }
        ]
    },
    {
        title: 'DISPUTE #3: Max-Q Fairing Acoustic Blanket vs. Payload Mass Margin',
        context: 'Pad 3A9 acoustic testing reveals high vibration near Max-Q. EECOM recommends acoustic damping blankets, while FIDO wants lighter composite struts to preserve Delta-V margin.',
        options: [
            {
                label: 'Use Carbon-Nanotube Composite Struts (+6% Science, +$9M Cost, +10% Synergy)',
                effect: { scienceBonusPct: 6, powerBonusW: 0, costMod: 9, synergyMod: 10 },
                roleTag: 'FIDO Priority'
            },
            {
                label: 'Accept Standard Aluminum Acoustic Blankets ($0 Cost, +15W Heater Savings)',
                effect: { scienceBonusPct: 0, powerBonusW: 15, costMod: 0, synergyMod: 6 },
                roleTag: 'Budget Conservation'
            }
        ]
    }
];

