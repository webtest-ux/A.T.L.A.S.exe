/* A.T.L.A.S · section 14C — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 14C. LET'S EXPLORE — OPS-STYLE EXPLORER MODULE
 *      Mirrors the Play Game layout (header · rail · 3D viewport ·
 *      dashboard · right info panel) and adds a realistic Earth that
 *      shares textures/material settings with the Play Game Earth.
 ***********************************************************************/

// ---- Published physical data (NASA Planetary Fact Sheets / NASA Science; moon counts from NASA Space Place, Jul 2026) ----
// approx: true marks values that are approximate, model-dependent or change over time.
const SOLAR_BODY_FACTS = {
    solar_system: {
        typeShort: 'Planetary system', dist: '—', orbit: '≈230 Myr (galactic)', rot: '—', status: 'Voyagers interstellar',
        statusFull: 'Voyager 1 & 2 have crossed the heliopause into interstellar space (2012, 2018).',
        mass: 'Sun holds ≈99.86% of the total mass', massApprox: true,
        tilt: 'Planets lie within ~7° of the ecliptic', tiltApprox: true,
        temp: 'From ≈15 million K (solar core) to ≈40 K (outer Kuiper Belt)', tempApprox: true,
        composition: 'One G-type star, 8 planets, IAU-recognized dwarf planets, asteroids, comets and dust',
        atmosphere: 'Bathed in the solar wind out to the heliopause (~120 AU)',
        geology: 'Rocky inner planets, gas giants (Jupiter, Saturn), ice giants (Uranus, Neptune)',
        moons: 'Hundreds of known moons; counts keep rising with new discoveries', moonsApprox: true,
        rings: 'All four giant planets have ring systems',
        discoveries: [
            'Meteorite dating fixes the oldest solids at ≈4.567 billion years',
            'Heliopause crossed by Voyager 1 (2012) and Voyager 2 (2018)',
            'Giant-planet migration models explain the Kuiper Belt and late impacts'
        ],
        missions: [
            { name: 'Voyager 1 & 2', years: '1977–', agency: 'NASA', objective: 'Grand tour of the outer planets', result: 'Only spacecraft to visit Uranus and Neptune; now in interstellar space' },
            { name: 'New Horizons', years: '2006–', agency: 'NASA', objective: 'Pluto & Kuiper Belt reconnaissance', result: 'Pluto flyby 2015; Arrokoth flyby 2019' },
            { name: 'Pioneer 10 & 11', years: '1972–1995', agency: 'NASA', objective: 'First crossings of the asteroid belt', result: 'First flybys of Jupiter and (Pioneer 11) Saturn' }
        ]
    },
    sun: {
        typeShort: 'G2V star', dist: '0 AU (centre)', orbit: '≈230 Myr galactic', rot: '25–34 d', status: 'Parker & Solar Orbiter',
        statusFull: 'Parker Solar Probe and Solar Orbiter study the Sun up close; SOHO and SDO observe continuously.',
        mass: '1.989 × 10³⁰ kg (≈333,000 Earths)', tilt: '7.25° (to the ecliptic)',
        temp: 'Photosphere ≈5,772 K · core ≈15 million K', tempApprox: true,
        composition: '≈73% hydrogen, ≈25% helium by mass', compositionApprox: true,
        atmosphere: 'Chromosphere and corona (corona exceeds 1 million K)',
        geology: 'No solid surface — convection zone, granulation, sunspots, ~11-year activity cycle',
        moons: 'N/A — 8 planets orbit the Sun', moonsNA: true, rings: 'N/A', ringsNA: true,
        discoveries: [
            'Helioseismology maps the solar interior from surface oscillations',
            'Solar wind confirmed in situ by Mariner 2 (1962)',
            'Parker Solar Probe found magnetic “switchbacks” in the young solar wind'
        ],
        missions: [
            { name: 'SOHO', years: '1995–', agency: 'ESA/NASA', objective: 'Continuous solar & coronal observation', result: 'Helioseismology; thousands of sungrazing comets found' },
            { name: 'Solar Dynamics Observatory', years: '2010–', agency: 'NASA', objective: 'High-cadence full-disk imaging', result: 'Continuous record of flares and the solar cycle' },
            { name: 'Parker Solar Probe', years: '2018–', agency: 'NASA', objective: 'Fly through the corona', result: 'Closest approach ≈6.1 million km (Dec 2024)' },
            { name: 'Solar Orbiter', years: '2020–', agency: 'ESA/NASA', objective: 'Close-up and out-of-ecliptic views', result: 'First images of the Sun’s south pole (2025)' }
        ]
    },
    mercury: {
        typeShort: 'Terrestrial planet', dist: '0.387 AU', orbit: '88.0 days', rot: '58.6 days', status: 'BepiColombo arriving',
        statusFull: 'ESA/JAXA BepiColombo is scheduled to enter Mercury orbit in November 2026.',
        mass: '3.30 × 10²³ kg (0.055 Earths)', tilt: '0.03°',
        temp: '≈ −180 °C (night) to 430 °C (day)', tempApprox: true,
        composition: 'Silicate crust and mantle over a large iron core (~85% of the radius)', compositionApprox: true,
        atmosphere: 'Surface-bound exosphere only (O, Na, H, He, K)',
        geology: 'Heavily cratered; lobate scarps from global contraction; Caloris Basin',
        moons: '0', rings: 'None',
        discoveries: [
            'Global magnetic field detected by Mariner 10 (1974)',
            'Water ice in permanently shadowed polar craters (MESSENGER)',
            'Planet shrank by several km as its interior cooled'
        ],
        missions: [
            { name: 'Mariner 10', years: '1974–1975', agency: 'NASA', objective: 'First Mercury flybys (3)', result: 'Mapped ≈45% of the surface; found the magnetic field' },
            { name: 'MESSENGER', years: '2004–2015', agency: 'NASA', objective: 'First Mercury orbiter', result: 'Global map; polar ice; volatile-rich surface' },
            { name: 'BepiColombo', years: '2018–', agency: 'ESA/JAXA', objective: 'Two orbiters for interior & magnetosphere', result: 'Mercury orbit insertion scheduled for November 2026' }
        ]
    },
    venus: {
        typeShort: 'Terrestrial planet', dist: '0.723 AU', orbit: '224.7 days', rot: '243 d (retro)', status: 'Missions planned',
        statusFull: 'No dedicated orbiter is operating; VERITAS, DAVINCI and EnVision have been proposed/planned.',
        mass: '4.87 × 10²⁴ kg (0.815 Earths)', tilt: '177.4° (retrograde spin)',
        temp: '≈ 464 °C at the surface', tempApprox: true,
        composition: 'Basaltic volcanic plains, tesserae highlands',
        atmosphere: '96.5% CO₂, 3.5% N₂; ≈92 bar; sulfuric-acid clouds',
        geology: 'Volcanic plains, coronae, pancake domes; few craters (young surface)',
        moons: '0', rings: 'None',
        discoveries: [
            'Mariner 2 confirmed extreme surface heat (1962)',
            'Runaway greenhouse explains its loss of water',
            'Magellan radar re-analysis showed a changing vent at Maat Mons (2023)'
        ],
        missions: [
            { name: 'Mariner 2', years: '1962', agency: 'NASA', objective: 'First interplanetary flyby', result: 'Measured high surface temperature' },
            { name: 'Venera 7 / 13', years: '1970 / 1982', agency: 'USSR', objective: 'Surface landers', result: 'First data from another planet’s surface; colour panoramas' },
            { name: 'Magellan', years: '1989–1994', agency: 'NASA', objective: 'Radar mapping', result: 'Mapped ≈98% of the surface' },
            { name: 'Venus Express', years: '2005–2014', agency: 'ESA', objective: 'Atmospheric studies', result: 'Polar vortices; signs of recent volcanism' }
        ]
    },
    earth: {
        typeShort: 'Ocean world', dist: '1.000 AU', orbit: '365.26 days', rot: '23.93 h', status: 'Continuously observed',
        statusFull: 'Observed continuously by a large fleet of Earth-observation satellites.',
        mass: '5.97 × 10²⁴ kg', tilt: '23.44°',
        temp: '≈ 15 °C global mean surface', tempApprox: true,
        composition: 'Silicate crust & mantle; iron-nickel core; ~71% ocean surface',
        atmosphere: '78% N₂, 21% O₂, ~1% Ar, trace CO₂ & H₂O',
        geology: 'Active plate tectonics, volcanism, erosion; liquid surface water',
        moons: '1 (the Moon)', rings: 'None',
        discoveries: [
            'Van Allen radiation belts found by Explorer 1 (1958)',
            'Ice-sheet mass loss measured from orbit by GRACE / GRACE-FO',
            'Satellite altimetry tracks global sea-level rise since 1993'
        ],
        missions: [
            { name: 'Explorer 1', years: '1958', agency: 'NASA/JPL', objective: 'First US satellite', result: 'Discovered the Van Allen belts' },
            { name: 'Landsat program', years: '1972–', agency: 'NASA/USGS', objective: 'Land-surface imaging', result: 'Longest continuous record of Earth’s land surface' },
            { name: 'Terra & Aqua', years: '1999– / 2002–', agency: 'NASA', objective: 'Climate system observation', result: 'Daily global clouds, aerosols, fires, ocean colour' },
            { name: 'GRACE / GRACE-FO', years: '2002–', agency: 'NASA/DLR/GFZ', objective: 'Gravity-field change', result: 'Ice-sheet and groundwater mass changes' }
        ]
    },
    moon: {
        typeShort: 'Natural satellite', dist: '1.00 AU', orbit: '27.32 days', rot: '27.32 d (locked)', status: 'Artemis era',
        statusFull: 'Lunar Reconnaissance Orbiter continues mapping; NASA’s Artemis program targets the south pole.',
        mass: '7.35 × 10²² kg (0.0123 Earths)', tilt: '1.54° (to the ecliptic)',
        temp: '≈ −173 °C to 127 °C at the equator; polar shadowed craters below ≈40 K', tempApprox: true,
        composition: 'Anorthosite highlands; basaltic maria',
        atmosphere: 'Exosphere only — essentially vacuum',
        geology: 'Impact basins, maria, rilles; no plate tectonics',
        moons: 'N/A', moonsNA: true, rings: 'N/A', ringsNA: true,
        discoveries: [
            'Apollo samples support a giant-impact origin',
            'Water ice in permanently shadowed craters (LCROSS, 2009)',
            'First far-side samples returned by Chang’e 6 (2024)'
        ],
        missions: [
            { name: 'Luna 9', years: '1966', agency: 'USSR', objective: 'Soft landing', result: 'First soft landing and surface images' },
            { name: 'Apollo 11–17', years: '1969–1972', agency: 'NASA', objective: 'Crewed exploration', result: '12 astronauts walked on the Moon; 382 kg of samples' },
            { name: 'Lunar Reconnaissance Orbiter', years: '2009–', agency: 'NASA', objective: 'High-resolution mapping', result: 'Metre-scale maps; polar temperature data' },
            { name: 'Chang’e 4 / 6', years: '2019 / 2024', agency: 'CNSA', objective: 'Far-side landing & sample return', result: 'First far-side landing; first far-side samples' },
            { name: 'Artemis I', years: '2022', agency: 'NASA', objective: 'Uncrewed Orion test flight', result: 'Validated SLS and Orion for crewed flights' }
        ]
    },
    mars: {
        typeShort: 'Terrestrial planet', dist: '1.524 AU', orbit: '687 days', rot: '24.6 h', status: 'Orbiters & rovers',
        statusFull: 'Several orbiters and rovers from multiple agencies operate at Mars.',
        mass: '6.42 × 10²³ kg (0.107 Earths)', tilt: '25.19°',
        temp: '≈ −63 °C mean (about −140 °C to 20 °C)', tempApprox: true,
        composition: 'Basaltic crust; iron-oxide-rich dust',
        atmosphere: '≈95% CO₂; ≈6 mbar surface pressure',
        geology: 'Olympus Mons, Valles Marineris, ancient river valleys and deltas, polar caps',
        moons: '2 (Phobos, Deimos)', rings: 'None',
        discoveries: [
            'Ancient lakebed at Gale Crater was habitable (Curiosity)',
            'Buried mid-latitude ice mapped by orbital radar (SHARAD)',
            'First powered flight on another planet — Ingenuity (2021)'
        ],
        missions: [
            { name: 'Mariner 4', years: '1965', agency: 'NASA', objective: 'First Mars flyby', result: 'First close-up images; a cratered surface' },
            { name: 'Viking 1 & 2', years: '1976', agency: 'NASA', objective: 'Orbiters + landers', result: 'First long-duration surface operations' },
            { name: 'Mars Reconnaissance Orbiter', years: '2006–', agency: 'NASA', objective: 'High-resolution imaging & radar', result: 'HiRISE imagery; buried ice detection' },
            { name: 'Curiosity', years: '2012–', agency: 'NASA', objective: 'Habitability of Gale Crater', result: 'Evidence of a long-lived ancient lake' },
            { name: 'Perseverance', years: '2021–', agency: 'NASA', objective: 'Astrobiology & sample caching', result: 'Cached cores in Jezero Crater delta' }
        ]
    },
    jupiter: {
        typeShort: 'Gas giant', dist: '5.20 AU', orbit: '11.86 years', rot: '9.93 h', status: 'JUICE & Clipper en route',
        statusFull: 'Juno has orbited Jupiter since 2016 (its extended mission ran to Sept 2025; later status uncertain). ESA’s JUICE and NASA’s Europa Clipper are en route.',
        mass: '1.898 × 10²⁷ kg (317.8 Earths)', tilt: '3.13°',
        temp: '≈ −110 °C at the 1-bar level', tempApprox: true,
        composition: 'Hydrogen & helium; metallic-hydrogen interior; dilute core', compositionApprox: true,
        atmosphere: '≈90% H₂, ≈10% He by volume; ammonia clouds',
        geology: 'No solid surface; Great Red Spot; polar cyclone clusters',
        moons: '115 known (NASA, Apr 2026)', moonsApprox: true,
        rings: 'Faint dusty rings (main, halo, gossamer) found by Voyager 1 (1979)',
        discoveries: [
            'Galilean moons discovered by Galileo Galilei (1610)',
            'Active volcanoes on Io seen by Voyager 1 (1979)',
            'Juno gravity data point to a large dilute core'
        ],
        missions: [
            { name: 'Pioneer 10', years: '1973', agency: 'NASA', objective: 'First Jupiter flyby', result: 'Measured the intense radiation belts' },
            { name: 'Voyager 1 & 2', years: '1979', agency: 'NASA', objective: 'Flybys', result: 'Rings, Io volcanism, detailed moon imagery' },
            { name: 'Galileo', years: '1995–2003', agency: 'NASA', objective: 'Orbiter + atmospheric probe', result: 'Evidence for Europa’s subsurface ocean' },
            { name: 'Juno', years: '2016–', agency: 'NASA', objective: 'Interior, gravity & magnetic field', result: 'Polar cyclones; dilute core; Europa & Io flybys' },
            { name: 'JUICE', years: '2023–', agency: 'ESA', objective: 'Ganymede orbiter', result: 'Arrival at Jupiter planned for 2031' }
        ]
    },
    europa: {
        typeShort: 'Icy ocean moon', dist: '5.20 AU', orbit: '3.55 d (Jupiter)', rot: '3.55 d (locked)', status: 'Clipper en route',
        statusFull: 'NASA’s Europa Clipper launched in October 2024 and is planned to arrive in 2030.',
        mass: '4.80 × 10²² kg (0.008 Earths)', tilt: '≈0.1°', tiltApprox: true,
        temp: '≈ −160 °C (equator) to −220 °C (poles)', tempApprox: true,
        composition: 'Water-ice shell over a salty ocean; rocky mantle; iron core', compositionApprox: true,
        atmosphere: 'Tenuous oxygen exosphere',
        geology: 'Lineae, double ridges, chaos terrain; very few impact craters (young surface)',
        moons: 'N/A', moonsNA: true, rings: 'N/A', ringsNA: true,
        discoveries: [
            'Induced magnetic field (Galileo) — strongest evidence for a salty ocean',
            'Ice-shell thickness estimates range ≈15–25 km (model-dependent)',
            'Possible water-vapour plumes reported from Hubble data (debated)'
        ],
        missions: [
            { name: 'Voyager 1 & 2', years: '1979', agency: 'NASA', objective: 'Flybys', result: 'Revealed a bright, fractured, young surface' },
            { name: 'Galileo', years: '1995–2003', agency: 'NASA', objective: 'Repeated close flybys', result: 'Magnetometer evidence for a subsurface ocean' },
            { name: 'Juno', years: '2022', agency: 'NASA', objective: 'Close flyby (≈352 km)', result: 'High-resolution images of the ice shell' },
            { name: 'Europa Clipper', years: '2024–', agency: 'NASA', objective: 'Habitability survey (~49 flybys planned)', result: 'Arrival planned for 2030' }
        ]
    },
    saturn: {
        typeShort: 'Ringed gas giant', dist: '9.58 AU', orbit: '29.45 years', rot: '10.6 h', status: 'Dragonfly planned',
        statusFull: 'No orbiter since Cassini ended in 2017; NASA’s Dragonfly rotorcraft to Titan is planned to launch in 2028.',
        mass: '5.68 × 10²⁶ kg (95.2 Earths)', tilt: '26.73°',
        temp: '≈ −140 °C at the 1-bar level', tempApprox: true,
        composition: 'Hydrogen & helium; lowest mean density of any planet (less than water)',
        atmosphere: '≈96% H₂, ≈3% He; ammonia haze',
        geology: 'No solid surface; hexagonal north-polar jet stream',
        moons: '293 known (NASA, Jun 2026)', moonsApprox: true,
        rings: 'Extensive bright water-ice rings (main A, B, C plus D–G, E)',
        discoveries: [
            'Water plumes from Enceladus’s south pole (Cassini)',
            'Methane lakes and seas on Titan (Cassini-Huygens)',
            'Ring age from Cassini data suggested to be young — still debated'
        ],
        missions: [
            { name: 'Pioneer 11', years: '1979', agency: 'NASA', objective: 'First Saturn flyby', result: 'Discovered the F ring' },
            { name: 'Voyager 1 & 2', years: '1980–1981', agency: 'NASA', objective: 'Flybys', result: 'Ring structure and Titan’s thick atmosphere' },
            { name: 'Cassini-Huygens', years: '2004–2017', agency: 'NASA/ESA/ASI', objective: 'Orbiter + Titan lander', result: 'Huygens landed on Titan (2005); Enceladus plumes' },
            { name: 'Dragonfly', years: 'launch 2028 (planned)', agency: 'NASA', objective: 'Rotorcraft for Titan', result: 'Not yet launched' }
        ]
    },
    uranus: {
        typeShort: 'Ice giant', dist: '19.2 AU', orbit: '84.0 years', rot: '17.2 h (retro)', status: 'Voyager 2 only (1986)',
        statusFull: 'Visited once by Voyager 2 (1986); a Uranus orbiter & probe was the top flagship priority of the 2023 decadal survey.',
        mass: '8.68 × 10²⁵ kg (14.5 Earths)', tilt: '97.77°',
        temp: '≈ −195 °C at the 1-bar level', tempApprox: true,
        composition: 'Water-ammonia-methane “ice” mantle over a rocky core; H₂/He envelope', compositionApprox: true,
        atmosphere: 'H₂, He and ≈2% methane (gives the cyan colour)', atmosphereApprox: true,
        geology: 'No solid surface; extreme seasons from its sideways tilt',
        moons: '29 known (NASA)', moonsApprox: true,
        rings: '13 known narrow, dark rings',
        discoveries: [
            'Discovered by William Herschel (1781)',
            'Rings found from stellar occultations (1977)',
            'Tilted, off-centre magnetic field (Voyager 2, 1986)'
        ],
        missions: [
            { name: 'Voyager 2', years: '1986', agency: 'NASA', objective: 'Flyby', result: 'Only close-up visit; 10 new moons, 2 new rings' },
            { name: 'Hubble & JWST', years: '1990– / 2021–', agency: 'NASA/ESA/CSA', objective: 'Remote observation', result: 'Seasonal storms, ring and moon imaging' }
        ]
    },
    neptune: {
        typeShort: 'Ice giant', dist: '30.07 AU', orbit: '164.8 years', rot: '16.1 h', status: 'Voyager 2 only (1989)',
        statusFull: 'Visited once by Voyager 2 (1989); studied remotely by Hubble and JWST.',
        mass: '1.02 × 10²⁶ kg (17.1 Earths)', tilt: '28.32°',
        temp: '≈ −200 °C at the 1-bar level', tempApprox: true,
        composition: 'Ice-giant interior similar to Uranus', compositionApprox: true,
        atmosphere: 'H₂, He, methane; winds up to ≈2,100 km/h', atmosphereApprox: true,
        geology: 'No solid surface; transient dark storms',
        moons: '16 known (NASA)', moonsApprox: true,
        rings: '5 main faint rings',
        discoveries: [
            'Predicted mathematically before being seen (1846)',
            'Great Dark Spot and fastest planetary winds (Voyager 2)',
            'Nitrogen geysers on its captured moon Triton'
        ],
        missions: [
            { name: 'Voyager 2', years: '1989', agency: 'NASA', objective: 'Flyby', result: 'Only close-up visit; Triton geysers' },
            { name: 'Hubble & JWST', years: '1990– / 2021–', agency: 'NASA/ESA/CSA', objective: 'Remote observation', result: 'Storm tracking; infrared ring imaging' }
        ]
    }
};

const explorerUI = {
    infoTab: 'data',
    cameraLabel: 'System overview',
    expanded: false,
    panelsHidden: false,
    mountHandlersAttached: false,
    seenNexiMsg: '',
    earth: null
};

const shortBodyName = b => b.id === 'solar_system' ? 'Solar System'
    : b.name.replace(' (Jovian Moon)', '').replace('Earth’s Moon (Luna)', 'Moon').replace('The Sun (Sol)', 'Sun');

/* ---------------- Realistic Earth (same textures & material settings as Play Game) ---------------- */
const explorerSunDirUniform = { value: new THREE.Vector3(1, 0, 0) };
function buildExplorerRealisticEarth(targetRadius, tiltDeg) {
    const maps = getEarthLayeredTextures();
    const root = new THREE.Group();
    root.scale.setScalar(targetRadius / 3.2);
    const tilt = new THREE.Group();
    tilt.rotation.z = THREE.MathUtils.degToRad(tiltDeg);
    root.add(tilt);

    const surfMat = new THREE.MeshStandardMaterial({
        map: maps.albedo, roughnessMap: maps.roughness, bumpMap: maps.bump,
        bumpScale: 0.045, roughness: 0.72, metalness: 0.12
    });
    if (maps.normal) { surfMat.normalMap = maps.normal; surfMat.normalScale = new THREE.Vector2(0.85, 0.85); }
    const surface = new THREE.Mesh(new THREE.SphereGeometry(3.2, 64, 64), surfMat);
    surface.userData.bodyId = 'earth';
    tilt.add(surface);

    const nightMat = createEarthNightLightsMaterial(maps.night);
    nightMat.uniforms.uSunDir = explorerSunDirUniform;
    const night = new THREE.Mesh(new THREE.SphereGeometry(3.208, 64, 64), nightMat);
    tilt.add(night);

    const clouds = new THREE.Mesh(new THREE.SphereGeometry(3.245, 64, 64), new THREE.MeshStandardMaterial({
        map: maps.clouds, alphaMap: maps.clouds, transparent: true, opacity: 0.84,
        roughness: 0.9, metalness: 0.0, depthWrite: false
    }));
    tilt.add(clouds);

    const innerMat = createEarthAtmosphereMaterial(false); innerMat.uniforms.uSunDir = explorerSunDirUniform;
    const outerMat = createEarthAtmosphereMaterial(true); outerMat.uniforms.uSunDir = explorerSunDirUniform;
    root.add(new THREE.Mesh(new THREE.SphereGeometry(3.29, 64, 64), innerMat));
    root.add(new THREE.Mesh(new THREE.SphereGeometry(3.48, 64, 64), outerMat));
    return { root, surface, night, clouds };
}

// Keeps the explorer Earth in step with Play Game's texture upgrades and the explorer Sun direction.
const _explorerWorldPos = new THREE.Vector3();
function explorerEarthFrameSync() {
    const e = explorerUI.earth;
    if (!e || !e.surface) return;
    const maps = earthLayeredTextures;
    if (maps) {
        const sm = e.surface.material;
        if (maps.albedo && sm.map !== maps.albedo) { sm.map = maps.albedo; sm.needsUpdate = true; }
        if (maps.normal && sm.normalMap !== maps.normal) { sm.normalMap = maps.normal; sm.normalScale = new THREE.Vector2(0.85, 0.85); sm.needsUpdate = true; }
        const cm = e.clouds.material;
        if (maps.clouds && cm.map !== maps.clouds) { cm.map = maps.clouds; cm.alphaMap = maps.clouds; cm.needsUpdate = true; }
        if (maps.night && e.night.material.uniforms && e.night.material.uniforms.uNightMap.value !== maps.night) {
            e.night.material.uniforms.uNightMap.value = maps.night;
        }
    }
    e.night.rotation.y = e.surface.rotation.y;
    e.clouds.rotation.y = e.surface.rotation.y * 1.28;
    if (e.surface.getWorldPosition) {
        e.surface.getWorldPosition(_explorerWorldPos);
        if (_explorerWorldPos.lengthSq && _explorerWorldPos.lengthSq() > 1e-6) {
            explorerSunDirUniform.value.copy(_explorerWorldPos).multiplyScalar(-1).normalize();
        }
    }
}

// Adds topography (bump) maps and a thin Martian haze to destination bodies already rendered in Play Game.

/* ---------------- Mounting the shared canvas into the explorer viewport ---------------- */

/* ---------------- Camera helpers ---------------- */


function toggleExplorerViewportExpand(force) {
    SoundFX.click();
    const panel = document.getElementById('explorerViewportPanel');
    if (!panel) return;
    explorerUI.expanded = (typeof force === 'boolean') ? force : !explorerUI.expanded;
    panel.classList.toggle('viewport-expanded-fallback', explorerUI.expanded);
    panel.classList.toggle('ex-expanded', explorerUI.expanded);
    const icon = document.getElementById('explorerExpandIcon');
    const label = document.getElementById('explorerExpandLabel');
    if (icon) icon.className = explorerUI.expanded ? 'ph-bold ph-corners-in text-sm text-amber-300' : 'ph-bold ph-corners-out text-sm text-cyan-300';
    if (label) label.textContent = explorerUI.expanded ? 'RETURN TO WORKSPACE' : 'EXPAND 3D VIEW';
    setTimeout(resizeSolarSystemViewport, 60);
}

/* ---------------- Rail ---------------- */

function focusCosmicHistoryTimeline() {
    SoundFX.click();
    if (explorerUI.panelsHidden) toggleExplorerPanelsCollapsed();
    const foot = document.getElementById('solarTimelineFooter');
    if (foot) {
        foot.classList.add('is-spotlight');
        setTimeout(() => foot.classList.remove('is-spotlight'), 1800);
    }
    const entry = SOLAR_SYSTEM_DATABASE.find(b => b.id === solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    const ev = (entry.history || [])[timelineCurrentIndex];
    if (ev) {
        nexiState.lastCustomAnswer = `Cosmic History · ${entry.name}: ${entry.history.length} eras. Now showing ${ev.date} — ${ev.title} [${ev.type}]. Use Earlier Era / Later Era or Auto-Tour; the orbit animation controls are separate.`;
        updateNexiContextualGuidance();
    }
}

/* ---------------- Right information panel ---------------- */
function setSolarInfoTab(tab) {
    SoundFX.click();
    explorerUI.infoTab = tab;
    if (explorerUI.panelsHidden) toggleExplorerPanelsCollapsed();
    const entry = SOLAR_SYSTEM_DATABASE.find(b => b.id === solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    renderSolarDossierPanel(entry, true);
    renderSolarBodyList();
}

function exRow(k, v, tag) {
    const cls = { FACT: 'ops-src-model', '≈': 'ops-src-sim', 'N/A': 'ops-src-nm' }[tag] || 'ops-src-model';
    return `<div class="ops-row ex-row"><span class="ops-row-k">${k}</span><span class="ops-row-v ex-row-v ${tag === 'N/A' ? 'is-nm' : ''}">${v}</span><b class="ops-src ${cls}">${tag}</b></div>`;
}
const tagFor = (f, key, value) => (f[key + 'NA'] || value === 'N/A' || value === '—') ? 'N/A' : (f[key + 'Approx'] ? '≈' : 'FACT');

function renderSolarDossierPanel(entry, tabChanged = false) {
    const f = SOLAR_BODY_FACTS[entry.id] || SOLAR_BODY_FACTS.solar_system;
    const box = document.getElementById('solarDossierContent');
    if (!box) return;

    const glyph = document.getElementById('exInfoGlyph');
    if (glyph) glyph.style.setProperty('--c', entry.color);
    const nm = document.getElementById('exInfoName'); if (nm) nm.textContent = entry.name;
    const cl = document.getElementById('exInfoClass'); if (cl) cl.textContent = entry.classification;
    document.querySelectorAll('#solarDossierCard .ops-side-tab').forEach(b => {
        const on = b.dataset.exTab === explorerUI.infoTab;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    let html = '';
    const tab = explorerUI.infoTab;
    if (tab === 'data') {
        html += `<div class="ops-hero"><div class="ops-hero-cell"><div class="k">Distance from Sun</div><div class="v ex-hero-v">${opsEsc(f.dist)}</div></div><div class="ops-hero-cell"><div class="k">Orbital period</div><div class="v ex-hero-v">${opsEsc(f.orbit)}</div></div></div>`;
        html += '<div class="ops-group-title">Planetary data</div>';
        html += exRow('Diameter', opsEsc(entry.diameter), entry.id === 'solar_system' ? '≈' : 'FACT');
        html += exRow('Mass', opsEsc(f.mass), tagFor(f, 'mass', f.mass));
        html += exRow('Distance from Sun', opsEsc(entry.distanceFromSun), entry.id === 'solar_system' ? 'N/A' : 'FACT');
        html += exRow('Orbital period', opsEsc(entry.orbitalPeriod), entry.id === 'solar_system' || entry.id === 'sun' ? '≈' : 'FACT');
        html += exRow('Rotation period', opsEsc(entry.rotationPeriod), entry.id === 'solar_system' ? 'N/A' : (['jupiter', 'saturn', 'uranus', 'neptune', 'sun'].includes(entry.id) ? '≈' : 'FACT'));
        html += exRow('Axial tilt', opsEsc(f.tilt), tagFor(f, 'tilt', f.tilt));
        html += exRow('Estimated age', opsEsc(entry.age), '≈');
        html += `<div class="ops-note">Rotation periods of the giant planets and the Sun vary with latitude or depth; ages are radiometric/model estimates.</div>`;
    } else if (tab === 'physical') {
        html += '<div class="ops-group-title">Physical characteristics</div>';
        html += exRow('Composition', opsEsc(f.composition), tagFor(f, 'composition', f.composition));
        html += exRow('Atmosphere', opsEsc(f.atmosphere), tagFor(f, 'atmosphere', f.atmosphere));
        html += exRow('Temperature', opsEsc(f.temp), tagFor(f, 'temp', f.temp));
        html += exRow('Geology', opsEsc(f.geology), 'FACT');
        html += exRow('Moons', opsEsc(f.moons), tagFor(f, 'moons', f.moons));
        html += exRow('Rings', opsEsc(f.rings), tagFor(f, 'rings', f.rings));
        html += `<div class="ops-note">${opsEsc(entry.surfaceAtmo)}</div>`;
        if (/moons/i.test(f.moons) || /known/.test(f.moons)) html += '<div class="ops-note">Moon counts change as new small moons are confirmed.</div>';
    } else if (tab === 'discoveries') {
        html += '<div class="ops-group-title">Major discoveries</div>';
        html += f.discoveries.map(d => `<div class="ex-bullet"><i class="ph ph-sparkle"></i><span>${opsEsc(d)}</span></div>`).join('');
        html += `<div class="ops-group-title">Research findings</div><div class="ops-note" style="margin-top:2px">${opsEsc(entry.discoveries)}</div>`;
        const milestones = (entry.history || []).filter(h => /CE|Present/.test(h.date));
        if (milestones.length) {
            html += '<div class="ops-group-title">Exploration milestones</div>';
            html += milestones.map(h => `<div class="ex-bullet"><i class="ph ph-flag"></i><span><b>${opsEsc(h.date)}</b> — ${opsEsc(h.title)}</span></div>`).join('');
        }
    } else if (tab === 'missions') {
        html += `<div class="ops-group-title">Exploration status (as of mid-2026)</div><div class="ops-note" style="margin-top:2px">${opsEsc(f.statusFull)}</div>`;
        html += '<div class="ops-group-title">Key missions</div>';
        html += f.missions.map(mi => `
            <div class="ex-mission">
                <div class="flex items-baseline justify-between gap-2"><b>${opsEsc(mi.name)}</b><span class="font-mono text-[9.5px] text-[color:var(--text-muted)] shrink-0">${opsEsc(mi.years)} · ${opsEsc(mi.agency)}</span></div>
                <div><span class="ex-mission-k">Objective</span>${opsEsc(mi.objective)}</div>
                <div><span class="ex-mission-k">Result</span>${opsEsc(mi.result)}</div>
            </div>`).join('');
    }
    box.innerHTML = `<div class="${tabChanged ? 'tab-anim' : ''}">${html}</div>`;

    // Actions
    const missionMap = { earth: 'earth_pulse', moon: 'artemis_lunar', mars: 'red_horizon', europa: 'europa_clipper' };
    const actions = document.getElementById('exInfoActions');
    if (actions) {
        let a = `<div class="grid grid-cols-2 gap-1.5">
            <button onclick="focusSelectedSolarOrbit()" class="ops-ghost-btn justify-center"><i class="ph ph-crosshair"></i><span>Focus Orbit</span></button>
            <button onclick="zoomCloseToSelectedSolarBody()" class="ops-ghost-btn justify-center"><i class="ph ph-magnifying-glass-plus"></i><span>Close-Up</span></button>
        </div>`;
        if (entry.id === 'europa') {
            a += `<button onclick="toggleSolarEuropaCutaway()" class="ops-ghost-btn justify-center w-full mt-1.5"><i class="ph ph-drop"></i><span>${solarEuropaCutawayActive ? 'Ocean cutaway: ON (illustrative)' : 'Show subsurface ocean cutaway'}</span></button>`;
        }
        if (missionMap[entry.id]) {
            a += `<button onclick="launchMissionFromSolarExplorer('${missionMap[entry.id]}')" class="ops-primary-btn w-full justify-center mt-1.5" style="height:30px"><i class="ph-fill ph-rocket-launch"></i><span class="font-display font-bold text-[11.5px]">Design a mission to ${opsEsc(shortBodyName(entry))}</span></button>`;
        }
        actions.innerHTML = a;
    }
    renderExplorerChrome(entry);
}

/* ---------------- Header, dashboard & viewport text ---------------- */
function renderExplorerChrome(entry) {
    entry = entry || SOLAR_SYSTEM_DATABASE.find(b => b.id === solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    const f = SOLAR_BODY_FACTS[entry.id] || SOLAR_BODY_FACTS.solar_system;
    const setT = (id, v, title) => { const el = document.getElementById(id); if (el) { el.textContent = v; if (title) el.title = title; } };
    setT('exTmBody', shortBodyName(entry));
    setT('exTmType', f.typeShort);
    setT('exTmDist', f.dist);
    setT('exTmOrbit', f.orbit);
    setT('exTmRot', f.rot);
    setT('exTmStatus', f.status, f.statusFull);
    setT('explorerBodyStatusText', shortBodyName(entry).toUpperCase());
    setT('explorerViewportTitle', `3D SOLAR SYSTEM // ${shortBodyName(entry).toUpperCase()}`);
    const cut = document.getElementById('explorerCutawayHudBtn');
    if (cut) {
        cut.classList.toggle('hidden', entry.id !== 'europa');
        cut.textContent = `Europa Cutaway: ${solarEuropaCutawayActive ? 'ON' : 'OFF'}`;
        cut.classList.toggle('is-on', solarEuropaCutawayActive);
    }

    const disc = document.getElementById('exDiscoveriesList');
    if (disc) {
        const ms = f.missions.slice(-2);
        disc.innerHTML = f.discoveries.slice(0, 2).map(d => `<div class="ex-mini"><i class="ph ph-sparkle text-amber-300"></i><span>${opsEsc(d)}</span></div>`).join('')
            + ms.map(mi => `<div class="ex-mini"><i class="ph ph-rocket text-cyan-300"></i><span><b>${opsEsc(mi.name)}</b> (${opsEsc(mi.years)}) — ${opsEsc(mi.result)}</span></div>`).join('');
    }
    renderExplorerProfile();
    refreshExplorerStatusPanel();
}

function refreshExplorerStatusPanel() {
    if (appExperienceMode !== 'explore') return;
    const entry = SOLAR_SYSTEM_DATABASE.find(b => b.id === solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    const f = SOLAR_BODY_FACTS[entry.id] || SOLAR_BODY_FACTS.solar_system;
    const setT = (id, v) => { const el = document.getElementById(id); if (el) { el.textContent = v; el.title = v; } };
    setT('exStatBody', shortBodyName(entry));
    setT('exStatCamera', `${explorerUI.cameraLabel} · zoom ${opsNum(solarCamSpherical.radius).toFixed(1)}`);
    setT('exStatRotation', `${solarOrbitsPaused ? 'Orbits paused' : 'Orbits playing'} · ${solarOrbitSpeedMult}x · axial spin on`);
    setT('exStatOrbit', entry.id === 'solar_system' ? 'Heliocentric overview' : `${f.orbit} · ${f.dist}`);
    const layers = [solarShowLabels ? 'Labels' : null, solarShowOrbits ? 'Orbit paths' : null, solarWideSpacing ? 'Wide spacing' : 'Compact spacing', (entry.id === 'europa' && solarEuropaCutawayActive) ? 'Ocean cutaway' : null].filter(Boolean);
    setT('exStatLayer', `Natural colour · ${layers.join(' · ')}`);
    renderExplorerCameraButtons();
    const evs = entry.history || [];
    setT('exHistoryStepLabel', `Era ${Math.min(timelineCurrentIndex + 1, evs.length)} / ${evs.length}`);
}

function renderExplorerProfile() {
    const p = playerCrewState.soloProfile;
    const m = document.getElementById('explorerAvatarMount');
    if (m) m.innerHTML = renderAstronautSVG(p.presetId, p.suitColor, 'idle', p.deptCode || 'FLIGHT');
    const c = document.getElementById('explorerCallsignLabel');
    if (c) c.textContent = p.callsign;
}

function syncExplorerAudioButton() {
    const icon = document.getElementById('explorerAudioIcon');
    const btn = document.getElementById('explorerAudioBtn');
    if (icon) icon.className = SoundFX.muted ? 'ph ph-speaker-slash' : 'ph ph-speaker-high';
    if (btn) { btn.title = SoundFX.muted ? 'Audio: MUTED (click to unmute)' : 'Audio: ON (click to mute)'; btn.classList.toggle('is-active', !SoundFX.muted); }
}

function openExplorerNotifications() {
    maximizeNexiPanel();
    const badge = document.getElementById('explorerNotifBadge');
    if (badge) badge.classList.add('hidden');
    explorerUI.seenNexiMsg = (document.getElementById('nexiSpeechText') || {}).textContent || '';
}

function noteExplorerNexiMessage(msg) {
    const badge = document.getElementById('explorerNotifBadge');
    if (!badge) return;
    const unseen = nexiState.minimized && msg && msg !== explorerUI.seenNexiMsg;
    badge.classList.toggle('hidden', !unseen);
    if (!nexiState.minimized) explorerUI.seenNexiMsg = msg;
}

function toggleExplorerPanelsCollapsed() {
    SoundFX.click();
    explorerUI.panelsHidden = !explorerUI.panelsHidden;
    const ws = document.getElementById('explorerWorkspace');
    if (ws) ws.classList.toggle('ex-panels-hidden', explorerUI.panelsHidden);
    const btn = document.getElementById('solarCleanViewBtn');
    if (btn) btn.innerHTML = explorerUI.panelsHidden
        ? '<i class="ph ph-eye-slash text-cyan-300"></i><span>Show Panels</span>'
        : '<i class="ph ph-eye"></i><span>Hide Panels</span>';
    solarPanelsCollapsed = explorerUI.panelsHidden;
    setTimeout(resizeSolarSystemViewport, 60);
}


