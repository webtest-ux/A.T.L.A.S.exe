/* A.T.L.A.S · section 14 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 14. SOLAR SYSTEM EXPLORER, COSMIC HISTORY TIMELINE & APP NAVIGATION
 ***********************************************************************/
let appExperienceMode = 'menu'; // 'menu' | 'explore' | 'game'
let solarScene = null, solarCamera = null;
let solarBodiesMap = {};
let solarOrbitLines = [];
let solarLabelSprites = [];
let solarRaycaster = new THREE.Raycaster();
let solarPointerVec = new THREE.Vector2();
let solarCamSpherical = { radius: 86, theta: 0.55, phi: 1.12 };
let solarTargetSpherical = { radius: 86, theta: 0.55, phi: 1.12 };
let solarLookAtCurrent = new THREE.Vector3(0, 0, 0);
let solarLookAtTarget = new THREE.Vector3(0, 0, 0);
let solarPanOffset = new THREE.Vector3(0, 0, 0);
let solarIsDragging = false, solarIsPanning = false, solarDragMoved = false, solarPrevMouse = { x: 0, y: 0 };
let solarSelectedBodyId = 'solar_system';
let solarEuropaCutawayActive = false;
let solarOrbitsPaused = false;
let solarOrbitSpeedMult = 1.0;
let solarShowOrbits = true;
let solarShowLabels = true;
let solarWideSpacing = false;
let solarPanelsCollapsed = false;
let timelineCurrentIndex = 0;
let timelineAutoTimer = null;
const solarBodyTextureCache = {};

const SOLAR_SYSTEM_DATABASE = [
    {
        id: 'solar_system',
        name: 'Solar System Overview',
        classification: 'Planetary System (G2V Star + 8 Planets)',
        icon: 'ph-planet',
        color: '#38bdf8',
        diameter: '~287.46 Billion km (Heliopause)',
        distanceFromSun: '0 AU (Heliocentric Reference)',
        orbitalPeriod: '~225–250 Million Years (Galactic Orbit)',
        rotationPeriod: 'Invariable Plane Counter-Clockwise',
        age: '~4.568 Billion Years (Ca-Al-rich Inclusions)',
        surfaceAtmo: 'Central G-type main-sequence star surrounded by 4 terrestrial planets, main asteroid belt, 4 giant planets, and Kuiper Belt.',
        discoveries: 'Radiometric dating of primitive chondrite meteorites constrains Solar System formation to ~4.567–4.568 billion years ago.',
        missions: 'Voyager 1 & 2, Pioneer 10/11, New Horizons, Parker Solar Probe, Cassini, Juno, Galileo.',
        nexiQuote: 'Welcome to the 3D Solar System Explorer! Select any planet, moon, or the Sun on the left (or click directly in 3D space) to inspect its physical characteristics and scrub through 4.568 billion years of cosmic history.',
        history: [
            { date: '~4.568 Billion Years Ago (Ga)', title: 'Protosolar Nebula Collapse', type: 'Artistic Scientific Reconstruction', color: '#f59e0b', desc: 'A dense molecular cloud core collapses under gravity, forming a spinning protoplanetary disk of gas and dust around the infant protostar (Source: NASA / Meteoritical Bulletin).' },
            { date: '~4.567 Ga', title: 'First Solids (CAIs & Chondrules)', type: 'Meteorite Radiometric Evidence', color: '#fbbf24', desc: 'Calcium-aluminum-rich inclusions (CAIs) condense in the hot inner nebula—the oldest dated solid materials in our Solar System.' },
            { date: '~4.56–4.54 Ga', title: 'Rapid Accretion of Gas & Ice Giants', type: 'Planetary Formation Model', color: '#38bdf8', desc: 'Beyond the frost line, runaway gas accretion forms proto-Jupiter and proto-Saturn before the solar nebula gas dissipates.' },
            { date: '~4.54–4.45 Ga', title: 'Terrestrial Planet Embryo Collisions', type: 'Artistic Scientific Reconstruction', color: '#fb7185', desc: 'Dozens of Moon-to-Mars-sized planetary embryos collide in the inner Solar System, building Mercury, Venus, Earth, and Mars.' },
            { date: '~4.51–4.45 Ga', title: 'Giant Impact & Formation of Earth’s Moon', type: 'Lunar Sample Geochemistry', color: '#e2e8f0', desc: 'A Mars-sized protoplanet (Theia) obliquely impacts proto-Earth; debris coalesces into the Moon (Source: NASA Apollo & Zircon Geochronology).' },
            { date: '~4.1–3.8 Ga', title: 'Early Heavy Impact Bombardment', type: 'Crater Chronology Record', color: '#a78bfa', desc: 'Giant planet migration scatters leftover planetesimals across the inner Solar System, carving major impact basins on the Moon, Mercury, and Mars.' },
            { date: '~3.5–1.0 Ga', title: 'Planetary Atmospheric & Geological Divergence', type: 'Comparative Planetology', color: '#34d399', desc: 'Earth sustains liquid oceans and life; Mars loses most of its magnetic field and thick atmosphere; Venus undergoes runaway greenhouse heating.' },
            { date: '1957 CE – Present', title: 'Robotic & Crewed Space Exploration Era', type: 'Historical Spaceflight Record', color: '#38bdf8', desc: 'Humanity launches orbital spacecraft, lands Apollo crews on the Moon, rovers on Mars, and sends Voyager 1 & 2 into interstellar space (Source: NASA/ESA).' }
        ]
    },
    {
        id: 'sun',
        name: 'The Sun (Sol)',
        classification: 'G2V Main-Sequence Yellow Dwarf Star',
        icon: 'ph-sun',
        color: '#fbbf24',
        radius3D: 4.8,
        distCompact: 0,
        distWide: 0,
        orbitSpeed: 0,
        diameter: '1,392,700 km (109 × Earth)',
        distanceFromSun: '0 km (Center of Solar System)',
        orbitalPeriod: '~230 Million Years (Milky Way Center)',
        rotationPeriod: '~25.05 Days (Equator) / ~34.4 Days (Poles)',
        age: '~4.60 Billion Years',
        surfaceAtmo: 'Photosphere (~5,772 K), Chromosphere, and Corona (>1,000,000 K); ~73% Hydrogen, ~25% Helium by mass.',
        discoveries: 'Helioseismology, coronal mass ejections (CMEs), solar wind parker spiral, and core proton-proton nuclear fusion.',
        missions: 'Parker Solar Probe, Solar Orbiter (ESA/NASA), SOHO, Solar Dynamics Observatory (SDO), Ulysses.',
        nexiQuote: 'The Sun contains 99.86% of all mass in the Solar System. Its solar irradiance drives spacecraft solar arrays at Earth and the Moon, but drops inverse-squarely to 45% at Mars and 4% at Jupiter!',
        history: [
            { date: '~4.60 Billion Years Ago (Ga)', title: 'Gravitational Collapse of Protosun', type: 'Astrophysical Model', color: '#f59e0b', desc: 'A fragment of a giant molecular cloud collapses, heating a central T Tauri protostar surrounded by a circumstellar disk (Source: NASA Solar Science).' },
            { date: '~4.55 Ga', title: 'Core Hydrogen Ignition (Zero-Age Main Sequence)', type: 'Stellar Evolution Model', color: '#fbbf24', desc: 'Core temperatures reach ~15 million K, igniting sustained proton-proton nuclear fusion. The young Sun shines at ~70% of its modern luminosity.' },
            { date: '~4.5–4.0 Ga', title: 'Intense Young Solar Wind & EUV Activity', type: 'Stellar Proxy Observations', color: '#fb7185', desc: 'Strong magnetic activity and coronal mass ejections strip primordial hydrogen envelopes from inner rocky worlds.' },
            { date: '~4.0 Ga – Present', title: 'Gradual Main-Sequence Brightening', type: 'Standard Solar Model', color: '#38bdf8', desc: 'As helium accumulates in the core, the Sun brightens by ~7–10% every billion years, shaping planetary climate evolution.' },
            { date: '2018 CE – Present', title: 'Parker Solar Probe Touches the Corona', type: 'NASA Mission Telemetry', color: '#34d399', desc: 'NASA’s Parker Solar Probe flies inside the Alfvén critical surface, sampling solar wind acceleration directly (Source: NASA APL).' }
        ]
    },
    {
        id: 'mercury',
        name: 'Mercury',
        classification: 'Terrestrial Planet (Innermost World)',
        icon: 'ph-globe-hemisphere-west',
        color: '#94a3b8',
        radius3D: 0.68,
        distCompact: 9.2,
        distWide: 11.5,
        orbitSpeed: 1.60,
        tiltDeg: 0.03,
        diameter: '4,879 km',
        distanceFromSun: '57.9 Million km (0.387 AU)',
        orbitalPeriod: '87.97 Earth Days',
        rotationPeriod: '58.65 Earth Days (3:2 Spin-Orbit Resonance)',
        age: '~4.50 Billion Years',
        surfaceAtmo: 'Ultra-thin surface-bound exosphere (O2, Na, H, He); heavily cratered silicate crust over an oversized metallic iron core (~85% of radius).',
        discoveries: 'Water ice in permanently shadowed polar craters, global lobate scarps from planetary cooling/contraction, and an active dipole magnetic field.',
        missions: 'Mariner 10 (1974–1975), MESSENGER (2004–2015), BepiColombo (ESA/JAXA, arriving 2026).',
        nexiQuote: 'Mercury has the largest iron core relative to its size of any planet, and despite scorching 430°C daytime temperatures, radar and MESSENGER confirmed water ice hiding in its permanently shadowed polar craters!',
        history: [
            { date: '~4.50 Ga', title: 'Accretion & Giant Core Differentiation', type: 'Geochemical Model', color: '#94a3b8', desc: 'Mercury forms in the innermost nebula; either a giant impact strips its mantle or nebular sorting leaves an iron core ~85% of its radius (Source: NASA MESSENGER).' },
            { date: '~4.1–3.8 Ga', title: 'Caloris Basin Impact & Heavy Bombardment', type: 'Orbital Geological Mapping', color: '#f59e0b', desc: 'A massive asteroid carves the 1,550 km Caloris Basin, sending seismic shockwaves that form chaotic "Weird Terrain" on the opposite hemisphere.' },
            { date: '~3.8–3.5 Ga', title: 'Widespread Volcanic Smooth Plains', type: 'MESSENGER Imagery', color: '#fb7185', desc: 'Flood basalts resurface vast northern plains and crater interiors before volcanism wanes.' },
            { date: '~3.5 Ga – Present', title: 'Global Planetary Contraction & Polar Cold Traps', type: 'Tectonic Scarp Mapping', color: '#38bdf8', desc: 'Interior cooling shrinks Mercury’s radius by up to ~7 km, buckling the crust into lobate thrust scarps while comets deliver ice to polar craters.' },
            { date: '1974 – Present', title: 'Mariner 10, MESSENGER & BepiColombo', type: 'Spaceflight Exploration', color: '#34d399', desc: 'Mariner 10 discovers Mercury’s magnetic field; MESSENGER maps 100% of the globe; ESA/JAXA BepiColombo investigates its interior (Source: NASA/ESA).' }
        ]
    },
    {
        id: 'venus',
        name: 'Venus',
        classification: 'Terrestrial Planet',
        icon: 'ph-cloud-sun',
        color: '#fcd34d',
        radius3D: 1.12,
        distCompact: 13.5,
        distWide: 17.5,
        orbitSpeed: 1.18,
        tiltDeg: 177.36,
        diameter: '12,104 km (0.95 × Earth)',
        distanceFromSun: '108.2 Million km (0.723 AU)',
        orbitalPeriod: '224.70 Earth Days',
        rotationPeriod: '243.02 Earth Days (Retrograde)',
        age: '~4.50 Billion Years',
        surfaceAtmo: '96.5% CO2 super-dense atmosphere (92 bar surface pressure, ~464°C) with sulfuric acid cloud decks super-rotating every ~4 days.',
        discoveries: 'Runaway greenhouse effect, pancake domes, Maxwell Montes radar mapping, and active volcanic surface changes detected in Magellan archival radar.',
        missions: 'Venera Program, Mariner 2, Pioneer Venus, Magellan Radar Orbiter, Akatsuki, upcoming VERITAS / DAVINCI / EnVision.',
        nexiQuote: 'Venus is Earth’s twin in size and mass, yet its 92-bar carbon dioxide atmosphere traps heat at 464°C—hotter than Mercury! Synthetic Aperture Radar (SAR) is essential to map its surface through the opaque sulfuric clouds.',
        history: [
            { date: '~4.50 Ga', title: 'Accretion of Earth’s Sister World', type: 'Planetary Formation Model', color: '#fbbf24', desc: 'Venus accretes near 0.72 AU with bulk size and density nearly identical to Earth (Source: NASA Venus Exploration).' },
            { date: '~4.2–1.0 Ga (Uncertain)', title: 'Ocean Evaporation & Runaway Greenhouse', type: 'Paleoclimate Modeling', color: '#f97316', desc: 'Higher solar flux vaporizes early surface water; UV photolysis splits H2O and hydrogen escapes to space, locking CO2 into a dense atmosphere.' },
            { date: '~700–300 Million Years Ago (Ma)', title: 'Global Volcanic Resurfacing Episode', type: 'Crater Count Chronology', color: '#fb7185', desc: 'A scarcity of impact craters (~900 total) indicates vast volcanic plains resurfaced ~80% of Venus within the last billion years.' },
            { date: '1962–1994 CE', title: 'Mariner 2, Venera Landers & Magellan SAR', type: 'Spaceflight Exploration', color: '#38bdf8', desc: 'Soviet Venera landers photograph basaltic slabs on the surface; NASA’s Magellan maps 98% of the globe with synthetic aperture radar.' },
            { date: '2023 CE – Present', title: 'Active Volcanism Confirmed at Maat Mons', type: 'Magellan Radar Re-analysis', color: '#34d399', desc: 'Scientists identify a shape-changing volcanic vent on Maat Mons in Magellan radar images, confirming modern geological activity (Source: NASAJPL).' }
        ]
    },
    {
        id: 'earth',
        name: 'Earth',
        classification: 'Terrestrial Ocean & Biosphere World',
        icon: 'ph-globe-hemisphere-east',
        color: '#38bdf8',
        radius3D: 1.25,
        distCompact: 18.8,
        distWide: 25.0,
        orbitSpeed: 1.0,
        tiltDeg: 23.44,
        diameter: '12,742 km (Mean)',
        distanceFromSun: '149.6 Million km (1.000 AU)',
        orbitalPeriod: '365.256 Days',
        rotationPeriod: '23h 56m 04s',
        age: '~4.54 Billion Years',
        surfaceAtmo: '78% N2, 21% O2, 1% Ar & trace greenhouse gases; 71% liquid water oceans, active plate tectonics, protective magnetosphere.',
        discoveries: 'Plate tectonics, anthropogenic climate change monitoring from LEO/SSO, polar cryosphere dynamics, and global biosphere.',
        missions: 'Landsat, Terra/Aqua, Sentinel (ESA), NISAR, GRACE-FO, ICESat-2, ISS.',
        nexiQuote: 'Welcome to Earth, our home planet! Explore its Rayleigh-scattered blue atmosphere, specular oceans, continents, and 4.54-billion-year geological and biological history—or launch the EARTH-PULSE SAR mission!',
        history: [
            { date: '~4.54 Billion Years Ago (Ga)', title: 'Hadean Accretion & Magma Ocean', type: 'Zircon & Isotope Geochronology', color: '#f97316', desc: 'Proto-Earth accretes and differentiates into an iron-nickel core and silicate mantle; impact with Theia forms the Moon (Source: USGS / NASA).' },
            { date: '~4.40–4.00 Ga', title: 'First Continental Crust & Liquid Oceans', type: 'Jack Hills Zircon Evidence', color: '#38bdf8', desc: 'Detrital zircons from Western Australia (~4.4 Ga) show liquid water interacted with cool continental crust remarkably early.' },
            { date: '~3.8–3.5 Ga', title: 'Archean Eon & Earliest Microbial Life', type: 'Stromatolite & Microfossil Record', color: '#34d399', desc: 'Prokaryotic life emerges in hydrothermal and shallow marine environments, leaving stromatolite structures and carbon isotope signatures.' },
            { date: '~2.4–2.1 Ga', title: 'Great Oxidation Event (GOE)', type: 'Geochemical Banded Iron Record', color: '#22d3ee', desc: 'Photosynthetic cyanobacteria release free oxygen into the oceans and atmosphere, rusting iron formations and forming an ozone shield.' },
            { date: '~541 Million Years Ago (Ma)', title: 'Cambrian Explosion & Complex Multicellular Life', type: 'Paleontological Fossil Record', color: '#a78bfa', desc: 'Rapid diversification of major animal phyla in the oceans, followed by land plants (~470 Ma), dinosaurs, and mammals.' },
            { date: 'Present Era', title: 'Holocene & Space-Based Climate Monitoring', type: 'Satellite Earth Observation', color: '#38bdf8', desc: 'Earth-observing satellites in Sun-Synchronous Orbit (SSO) continuously track ice sheets, sea level, and ecosystems (Source: NASA Earth Science).' }
        ]
    },
    {
        id: 'moon',
        name: 'Earth’s Moon (Luna)',
        classification: 'Natural Terrestrial Satellite',
        icon: 'ph-moon-stars',
        color: '#cbd5e1',
        isMoonOf: 'earth',
        radius3D: 0.44,
        distCompact: 2.55,
        distWide: 3.1,
        orbitSpeed: 4.8,
        tiltDeg: 1.54,
        diameter: '3,474.8 km (0.27 × Earth)',
        distanceFromSun: '1.00 AU (384,400 km from Earth)',
        orbitalPeriod: '27.32 Earth Days (Tidally Locked)',
        rotationPeriod: '27.32 Earth Days (Synchronous)',
        age: '~4.51–4.45 Billion Years',
        surfaceAtmo: 'Ultra-high vacuum exosphere; anorthositic highland crust, dark basaltic maria basins, and permanently shadowed polar craters.',
        discoveries: 'Water-ice deposits in Lunar South Pole Permanently Shadowed Regions (Shackleton, Haworth, Cabeus) confirmed by LCROSS, LRO, and Chandrayaan-1.',
        missions: 'Apollo 11–17, Luna Program, Lunar Reconnaissance Orbiter (LRO), LCROSS, GRAIL, Chandrayaan-1/2/3, Artemis Program.',
        nexiQuote: 'The Moon’s 1.54° axial tilt creates Permanently Shadowed Regions (PSRs) at the Lunar South Pole where temperatures stay below 40 K (-233°C), trapping ancient water ice targeted by NASA’s Artemis missions!',
        history: [
            { date: '~4.51–4.45 Ga', title: 'Giant Impact Origin (Theia Collision)', type: 'Apollo Sample Isotope Record', color: '#f97316', desc: 'A Mars-sized body collides with proto-Earth; silicate vapor and molten debris coalesce in orbit to form the Moon (Source: NASA Lunar Science).' },
            { date: '~4.45–4.35 Ga', title: 'Lunar Magma Ocean & Anorthosite Crust', type: 'Apollo Ferroan Anorthosite Samples', color: '#e2e8f0', desc: 'Lightweight plagioclase feldspar crystals float to the top of a global magma ocean, forming the bright Lunar Highlands.' },
            { date: '~4.3–3.8 Ga', title: 'South Pole-Aitken & Imbrium Giant Basins', type: 'LRO Topographic Mapping', color: '#a78bfa', desc: 'Massive impactors excavate the 2,500 km South Pole-Aitken basin and the nearside Imbrium, Serenitatis, and Crisium basins.' },
            { date: '~3.8–3.0 Ga', title: 'Mare Basalt Flood Volcanism', type: 'Radiometric Basalt Dating', color: '#64748b', desc: 'Radioactive heating melts the lunar mantle; dark, low-viscosity basaltic lava floods impact basins to create the lunar maria ("seas").' },
            { date: '~1.0 Ga – Present', title: 'Rayed Craters & Polar Water-Ice Cold Traps', type: 'LRO & LCROSS Observations', color: '#38bdf8', desc: 'Young impacts like Tycho and Copernicus spread bright ejecta rays; water molecules accumulate in South Pole PSR craters.' },
            { date: '1969 CE – Artemis Era', title: 'Apollo Landings to Artemis South Pole', type: 'Crewed & Robotic Exploration', color: '#34d399', desc: 'Apollo astronauts return 382 kg of lunar rock; LRO maps the poles in meter-scale detail for Artemis crewed landings (Source: NASA).' }
        ]
    },
    {
        id: 'mars',
        name: 'Mars',
        classification: 'Terrestrial Planet (The Red Planet)',
        icon: 'ph-planet',
        color: '#f97316',
        radius3D: 0.88,
        distCompact: 24.5,
        distWide: 33.5,
        orbitSpeed: 0.78,
        tiltDeg: 25.19,
        diameter: '6,779 km (0.53 × Earth)',
        distanceFromSun: '227.9 Million km (1.524 AU)',
        orbitalPeriod: '686.98 Earth Days (1.88 Years)',
        rotationPeriod: '24h 37m 22s (1 Sol)',
        age: '~4.50 Billion Years',
        surfaceAtmo: 'Thin 95% CO2 atmosphere (~6 mbar surface pressure) with suspended iron-oxide dust; Olympus Mons, Valles Marineris, and H2O/CO2 polar caps.',
        discoveries: 'Ancient river deltas (Jezero Crater), clay/sulfate minerals, buried mid-latitude glaciers mapped by SHARAD radar, and seasonal dust storms.',
        missions: 'Mariner 4/9, Viking 1/2, Mars Global Surveyor, Mars Odyssey, Mars Express, MRO, Curiosity, MAVEN, InSight, Perseverance.',
        nexiQuote: 'Mars is home to Olympus Mons (21.9 km high) and the 4,000 km Valles Marineris canyon. Because Mars orbits at 1.52 AU, solar arrays receive only ~45% of Earth’s sunlight!',
        history: [
            { date: '~4.50 Ga', title: 'Rapid Accretion & Early Core Dynamo', type: 'Martian Meteorite Geochronology', color: '#f97316', desc: 'Mars accretes rapidly within ~2–5 million years as a "stranded planetary embryo" and generates an early global magnetic field (Source: NASA Mars).' },
            { date: '~4.1–3.7 Ga (Noachian Period)', title: 'Warm Wet Intervals, Valley Networks & Lakes', type: 'Orbital & Rover Geology', color: '#38bdf8', desc: 'Liquid water carves dendritic river valleys and fills crater lakes like Jezero and Gale, forming phyllosilicate clay minerals.' },
            { date: '~3.7–3.0 Ga (Hesperian Period)', title: 'Tharsis Volcanism, Valles Marineris & Outflow Floods', type: 'MOLA & MRO Mapping', color: '#fbbf24', desc: 'Massive volcanic eruptions build the Tharsis bulge, fracturing the crust to open Valles Marineris and releasing catastrophic outflow floods.' },
            { date: '~3.7 Ga – Present', title: 'Magnetic Field Loss & Atmospheric Stripping', type: 'NASA MAVEN Telemetry', color: '#fb7185', desc: 'After Mars’s core dynamo shuts down, solar wind sputtering strips much of the early atmosphere, transitioning Mars into an arid desert.' },
            { date: '~3.0 Ga – Present (Amazonian)', title: 'Obliquity Cycles, Polar Caps & Buried Glaciers', type: 'SHARAD Radar Sounding', color: '#e2e8f0', desc: 'Chaotic axial tilt swings shift water ice between the polar caps and buried mid-latitude debris-covered glaciers.' },
            { date: '1965 CE – Present', title: 'Robotic Orbiters, Landers & Sample Caching', type: 'Spaceflight Exploration', color: '#34d399', desc: 'From Mariner 4 and Viking to MRO, Curiosity, and Perseverance caching rock cores in Jezero Crater (Source: NASA JPL).' }
        ]
    },
    {
        id: 'jupiter',
        name: 'Jupiter',
        classification: 'Gas Giant Planet (Largest Planet)',
        icon: 'ph-globe',
        color: '#fdba74',
        radius3D: 2.85,
        distCompact: 34.5,
        distWide: 48.0,
        orbitSpeed: 0.44,
        tiltDeg: 3.13,
        diameter: '139,820 km (11 × Earth)',
        distanceFromSun: '778.5 Million km (5.204 AU)',
        orbitalPeriod: '11.86 Earth Years',
        rotationPeriod: '9h 55m 30s (Fastest Rotating Planet)',
        age: '~4.56 Billion Years',
        surfaceAtmo: '~90% H2, ~10% He by volume with ammonia/water cloud belts and zones, Great Red Spot anticyclone, metallic hydrogen interior, and intense magnetosphere.',
        discoveries: '4 Galilean moons (Io, Europa, Ganymede, Callisto), dilute core structure revealed by Juno gravity science, and polar cyclone polygons.',
        missions: 'Pioneer 10/11, Voyager 1/2, Galileo Orbiter & Probe, Cassini, New Horizons, Juno, JUICE (ESA), Europa Clipper (NASA).',
        nexiQuote: 'Jupiter is the king of planets—its rapid 9.9-hour spin drives powerful jet streams, the Great Red Spot, and a lethal magnetosphere energized by volcanic sulfur from its moon Io!',
        history: [
            { date: '~4.565 Ga', title: 'Core Accretion Beyond the Frost Line', type: 'Meteorite Isotope Dichotomy', color: '#f59e0b', desc: 'A 10–20 Earth-mass rock/ice core forms rapidly, dividing the early solar nebula into inner and outer isotopic reservoirs (Source: NASA Juno / Meteoritics).' },
            { date: '~4.562 Ga', title: 'Runaway Nebular Gas Capture', type: 'Hydrodynamic Accretion Model', color: '#fdba74', desc: 'Gravity pulls in a massive hydrogen-helium envelope from the protoplanetary disk before the Sun disperses the gas.' },
            { date: '~4.56 Ga', title: 'Circumplanetary Disk & Galilean Moon Formation', type: 'Satellite Accretion Model', color: '#38bdf8', desc: 'Io, Europa, Ganymede, and Callisto accrete within a circum-Jovian sub-nebula; Io, Europa, and Ganymede lock into a 4:2:1 Laplace resonance.' },
            { date: '~4.5 Ga – Present', title: 'Interior Cooling & Metallic Hydrogen Dynamo', type: 'Juno Gravity & Magnetic Data', color: '#a78bfa', desc: 'Extreme pressures compress hydrogen into a liquid metallic conductor, generating the strongest planetary magnetic field in the Solar System.' },
            { date: '1610 CE – Present', title: 'Galileo’s Telescope to Juno & Europa Clipper', type: 'Astronomical & Spaceflight Record', color: '#34d399', desc: 'Galileo Galilei discovers the 4 moons in 1610; Galileo and Juno orbit Jupiter to probe its deep atmosphere and interior (Source: NASA).' }
        ]
    },
    {
        id: 'europa',
        name: 'Europa (Jovian Moon)',
        classification: 'Icy Galilean Moon / Ocean World',
        icon: 'ph-snowflake',
        color: '#7dd3fc',
        isMoonOf: 'jupiter',
        radius3D: 0.48,
        distCompact: 4.1,
        distWide: 4.9,
        orbitSpeed: 3.6,
        tiltDeg: 0.1,
        diameter: '3,121.6 km (0.90 × Moon)',
        distanceFromSun: '5.204 AU (670,900 km from Jupiter)',
        orbitalPeriod: '3.551 Earth Days (around Jupiter)',
        rotationPeriod: '3.551 Earth Days (Tidally Locked)',
        age: '~4.50 Billion Years (Surface Ice ~20–180 Myr)',
        surfaceAtmo: 'Tenuous O2 exosphere sputtered by Jovian radiation; 15–25 km fractured water-ice crust over a ~60–150 km global salty liquid-water ocean.',
        discoveries: 'Induced magnetic field measured by Galileo magnetometer (strongest evidence for a salty subsurface ocean), Conamara Chaos terrain, and young surface with few craters.',
        missions: 'Voyager 1 & 2 (1979), Galileo Orbiter (1995–2003), Juno Flyby (2022), JUICE (ESA), NASA Europa Clipper.',
        nexiQuote: 'Europa is one of the highest-priority astrobiology targets in the Solar System! Tidal flexing from Jupiter warms a global liquid ocean holding more than twice the water of all Earth’s oceans combined.',
        history: [
            { date: '~4.55 Ga', title: 'Accretion in Jupiter’s Circumplanetary Disk', type: 'Jovian Satellite Model', color: '#38bdf8', desc: 'Europa accretes from rock and water ice in orbit around young Jupiter, differentiating into an iron core, silicate mantle, and outer H2O layer (Source: NASA Europa).' },
            { date: '~4.5–4.0 Ga (model-dependent)', title: 'Ice-Shell & Ocean Differentiation', type: 'Interior Evolution Model', color: '#e0f2fe', desc: 'Heating from accretion, radioactive decay and tides separates Europa\'s water layer from its rocky interior; the outer water freezes into an ice shell above a liquid ocean. The timing is model-dependent (Source: NASA Europa Clipper science).' },
            { date: '~4.5 Ga – Present', title: 'Laplace 4:2:1 Orbital Resonance & Tidal Heating', type: 'Celestial Mechanics', color: '#f59e0b', desc: 'Gravitational tugs from Io and Ganymede maintain Europa’s orbital eccentricity, flexing its interior and keeping its ~100 km subsurface ocean liquid.' },
            { date: '~180–20 Million Years Ago (Ma)', title: 'Continuous Ice-Shell Tectonic Resurfacing', type: 'Crater Retention Age', color: '#7dd3fc', desc: 'Dilational bands, double ridges (lineae), and chaos terrain continually recycle the outer ice shell, erasing older impact craters.' },
            { date: '1979–2003 CE', title: 'Voyager Imagery & Galileo Magnetometer Discovery', type: 'Spacecraft Discovery Record', color: '#a78bfa', desc: 'Voyager reveals Europa’s fractured surface; NASA’s Galileo spacecraft detects an induced magnetic signature diagnostic of a global conductive salty ocean.' },
            { date: '2022 CE – Present', title: 'Juno Close Flyby, JUICE & Europa Clipper', type: 'Modern Deep Space Reconnaissance', color: '#34d399', desc: 'Juno images Europa at 352 km altitude while ESA’s JUICE and NASA’s Europa Clipper mission set out to sound the ice shell and ocean habitability (Source: NASA JPL).' }
        ]
    },
    {
        id: 'saturn',
        name: 'Saturn',
        classification: 'Ringed Gas Giant Planet',
        icon: 'ph-planet',
        color: '#fde68a',
        radius3D: 2.40,
        hasRings: true,
        distCompact: 45.5,
        distWide: 64.0,
        orbitSpeed: 0.31,
        tiltDeg: 26.73,
        diameter: '116,460 km (Rings span ~282,000 km)',
        distanceFromSun: '1.43 Billion km (9.58 AU)',
        orbitalPeriod: '29.45 Earth Years',
        rotationPeriod: '10h 33m 38s',
        age: '~4.56 Billion Years (Main Rings ~100–400 Myr)',
        surfaceAtmo: '~96% H2, ~3% He; golden ammonia haze bands, north polar hexagonal jet stream, and extensive 99% pure water-ice ring system.',
        discoveries: 'Enceladus south polar water plumes & subsurface ocean, Titan methane lakes and thick nitrogen atmosphere, and ring age constraints from Cassini Grand Finale.',
        missions: 'Pioneer 11 (1979), Voyager 1 & 2 (1980–1981), Cassini-Huygens Flagship Orbiter & Lander (2004–2017), Dragonfly (upcoming to Titan).',
        nexiQuote: 'Saturn’s iconic rings span 282,000 km across yet are often only 10 to 30 meters thick! Cassini’s final gravity measurements revealed the bright rings may have formed only 100 to 400 million years ago.',
        history: [
            { date: '~4.56 Ga', title: 'Core Accretion & Gas Envelope Capture', type: 'Giant Planet Formation Model', color: '#fde68a', desc: 'Saturn forms in the outer solar nebula shortly after Jupiter, capturing a deep hydrogen-helium envelope around a rocky/icy core (Source: NASA Cassini).' },
            { date: '~4.50 Ga', title: 'Formation of Titan & Icy Moon System', type: 'Satellite Evolution Model', color: '#f59e0b', desc: 'Titan and Saturn’s mid-sized icy moons accrete in Saturn’s sub-nebula.' },
            { date: '~400–100 Million Years Ago (Ma)', title: 'Tidal Disruption & Main Ring Formation', type: 'Cassini Ring Mass & Dust Flux Data', color: '#38bdf8', desc: 'Cassini ring-mass and dust-darkening measurements suggest the main rings may be only ~100–400 Myr old, possibly from a shredded icy body — the ring age is still debated.' },
            { date: '2004–2017 CE', title: 'Cassini-Huygens 13-Year Orbital Tour', type: 'Historical Flagship Mission', color: '#34d399', desc: 'Huygens lands on Titan’s surface; Cassini discovers active hydrothermally-warmed water geysers erupting from Enceladus’s south pole (Source: NASA/ESA/ASI).' }
        ]
    },
    {
        id: 'uranus',
        name: 'Uranus',
        classification: 'Ice Giant Planet (Tilted 97.77°)',
        icon: 'ph-globe-simple',
        color: '#67e8f9',
        radius3D: 1.72,
        hasThinRing: true,
        distCompact: 55.5,
        distWide: 79.0,
        orbitSpeed: 0.21,
        tiltDeg: 97.77,
        diameter: '50,724 km (4.0 × Earth)',
        distanceFromSun: '2.87 Billion km (19.19 AU)',
        orbitalPeriod: '84.02 Earth Years',
        rotationPeriod: '17h 14m 24s (Retrograde on its side)',
        age: '~4.50 Billion Years',
        surfaceAtmo: 'H2, He, and ~2.3% methane (CH4) upper atmosphere giving a pale cyan hue over a warm, dense mantle of water, ammonia, and methane "ices".',
        discoveries: 'Extreme 97.77° axial tilt (rolling on its side), 13 narrow dark rings, off-center tilted magnetosphere, and complex tectonic canyons on moon Miranda.',
        missions: 'Voyager 2 Flyby (January 1986), Hubble & JWST Infrared Observations.',
        nexiQuote: 'Uranus rotates on its side with a 97.77° axial tilt—likely knocked over by a giant protoplanet collision early in Solar System history—causing extreme 42-year-long polar seasons!',
        history: [
            { date: '~4.55 Ga', title: 'Accretion of the Volatile-Rich Ice Giant', type: 'Planetary Formation Model', color: '#67e8f9', desc: 'Uranus accretes abundant water, ammonia, and methane ices alongside rock, forming an "Ice Giant" distinct from hydrogen-dominated Jupiter and Saturn (Source: NASA).' },
            { date: '~4.5–4.0 Ga', title: 'Catastrophic Oblique Giant Impact (97.77° Tilt)', type: 'Hydrodynamic Impact Simulation', color: '#fb7185', desc: 'An Earth-to-multi-Earth-mass protoplanet strikes Uranus obliquely, tipping its spin axis onto its side and reshaping its satellite disk.' },
            { date: '1781 CE', title: 'Discovery by William Herschel', type: 'Historical Astronomy Record', color: '#fbbf24', desc: 'William Herschel discovers Uranus with a telescope—the first planet identified in modern history beyond those known since antiquity.' },
            { date: '1986 CE – Present', title: 'Voyager 2 Flyby & JWST Ring/Moon Imaging', type: 'Spaceflight & Space Telescope Record', color: '#34d399', desc: 'Voyager 2 conducts the only close spacecraft flyby in 1986; JWST captures crisp infrared views of Uranus’s rings and polar cap (Source: NASA/STScI).' }
        ]
    },
    {
        id: 'neptune',
        name: 'Neptune',
        classification: 'Ice Giant Planet (Outermost Major Planet)',
        icon: 'ph-wind',
        color: '#3b82f6',
        radius3D: 1.68,
        distCompact: 64.5,
        distWide: 93.0,
        orbitSpeed: 0.16,
        tiltDeg: 28.32,
        diameter: '49,244 km (3.88 × Earth)',
        distanceFromSun: '4.50 Billion km (30.07 AU)',
        orbitalPeriod: '164.8 Earth Years',
        rotationPeriod: '16h 06m 36s',
        age: '~4.50 Billion Years',
        surfaceAtmo: 'H2, He, and methane atmosphere with bright high-altitude methane-ice cirrus clouds and supersonic winds reaching ~2,100 km/h.',
        discoveries: 'Mathematical prediction before telescopic observation (1846), supersonic atmospheric winds, and nitrogen-ice geysers on retrograde captured moon Triton.',
        missions: 'Voyager 2 Flyby (August 1989), Hubble & JWST Observations.',
        nexiQuote: 'Orbiting 30 AU from the Sun, Neptune radiates more than twice the internal heat it receives from sunlight, driving the fastest planetary winds in the Solar System (~2,100 km/h)!',
        history: [
            { date: '~4.55 Ga', title: 'Formation & Outward Planetary Migration', type: 'Nice Dynamical Model', color: '#3b82f6', desc: 'Neptune forms closer to the Sun and migrates outward to ~30 AU through gravitational interactions with the primordial Kuiper Belt (Source: NASA Solar System).' },
            { date: '~4.5–4.0 Ga', title: 'Gravitational Capture of Kuiper Belt Moon Triton', type: 'Orbital Dynamics Evidence', color: '#a78bfa', desc: 'Neptune captures Triton—a Pluto-sized Kuiper Belt object—into a retrograde orbit, tidally heating Triton and disrupting original inner moons.' },
            { date: '1846 CE', title: 'First Planet Discovered by Mathematical Prediction', type: 'History of Celestial Mechanics', color: '#fbbf24', desc: 'Urbain Le Verrier and John Couch Adams calculate Neptune’s position from gravitational perturbations on Uranus; Johann Galle observes it in Berlin.' },
            { date: '1989 CE – Present', title: 'Voyager 2 Encounter at 30 AU & Triton Plumes', type: 'Spaceflight Exploration Record', color: '#34d399', desc: 'Voyager 2 images the Great Dark Spot and active nitrogen-ice geyser plumes on Triton in August 1989 (Source: NASA JPL).' }
        ]
    }
];

function toggleAudioMute() {
    SoundFX.muted = !SoundFX.muted;
    if (!SoundFX.muted) SoundFX.click();
    const icon = document.getElementById('menuAudioIcon');
    const label = document.getElementById('menuAudioLabel');
    const btn = document.getElementById('menuAudioBtn');
    if (icon && label && btn) {
        icon.className = SoundFX.muted ? 'ph-fill ph-speaker-slash text-sm' : 'ph-fill ph-speaker-high text-sm';
        label.textContent = SoundFX.muted ? 'Audio: MUTED' : 'Audio: ON';
        btn.className = SoundFX.muted
            ? 'hud-floating-glass px-3 py-2 rounded-xl hover:border-rose-400/60 text-xs font-mono text-rose-300 flex items-center gap-1.5 transition'
            : 'hud-floating-glass px-3 py-2 rounded-xl hover:border-cyan-400/60 text-xs font-mono text-emerald-300 flex items-center gap-1.5 transition';
    }
    if (typeof syncExplorerAudioButton === 'function') syncExplorerAudioButton();
}

/**
 * Procedural Texture Generator for Solar System Bodies (Sun, Mercury, Venus, Saturn, Uranus, Neptune)
 * Reuses getEarthLayeredTextures(), getDestinationLayeredMaps() for Moon, Mars, Europa, and getJupiterBackdropTexture() for Jupiter.
 */
function getSolarBodyProceduralTexture(bodyId) {
    if (solarBodyTextureCache[bodyId]) return solarBodyTextureCache[bodyId];
    if (bodyId === 'earth') return getEarthLayeredTextures().albedo;
    if (bodyId === 'moon') return getDestinationLayeredMaps('moon', 'natural', false).albedo;
    if (bodyId === 'mars') return getDestinationLayeredMaps('mars', 'natural', false).albedo;
    if (bodyId === 'europa') return getDestinationLayeredMaps('europa', 'natural', false).albedo;
    if (bodyId === 'jupiter') return getJupiterBackdropTexture();

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (bodyId === 'sun') {
        const g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#f59e0b');
        g.addColorStop(0.5, '#fef08a');
        g.addColorStop(1, '#ea580c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1024, 512);
        for (let i = 0; i < 420; i++) {
            const x = (Math.sin(i * 93.7) * 0.5 + 0.5) * 1024;
            const y = (Math.cos(i * 41.3) * 0.5 + 0.5) * 512;
            const r = 6 + (i % 26);
            ctx.fillStyle = i % 9 === 0 ? 'rgba(180, 83, 9, 0.55)' : 'rgba(254, 249, 195, 0.45)';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (bodyId === 'mercury') {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 0, 1024, 512);
        for (let i = 0; i < 480; i++) {
            const x = (Math.sin(i * 71.1) * 0.5 + 0.5) * 1024;
            const y = (Math.cos(i * 37.9) * 0.5 + 0.5) * 512;
            const r = 3 + (i % 20);
            ctx.strokeStyle = 'rgba(203, 213, 225, 0.42)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(51, 65, 85, 0.6)';
            ctx.fill();
        }
    } else if (bodyId === 'venus') {
        const vg = ctx.createLinearGradient(0, 0, 0, 512);
        vg.addColorStop(0, '#d97706');
        vg.addColorStop(0.3, '#fde68a');
        vg.addColorStop(0.5, '#f59e0b');
        vg.addColorStop(0.7, '#fef3c7');
        vg.addColorStop(1, '#b45309');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, 1024, 512);
        for (let i = 0; i < 160; i++) {
            ctx.fillStyle = i % 2 === 0 ? 'rgba(254, 243, 199, 0.25)' : 'rgba(180, 83, 9, 0.2)';
            ctx.beginPath();
            ctx.ellipse((i * 59) % 1024, (i * 23) % 512, 85, 12, 0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (bodyId === 'saturn') {
        const sg = ctx.createLinearGradient(0, 0, 0, 512);
        sg.addColorStop(0.0, '#a16207');
        sg.addColorStop(0.2, '#fde68a');
        sg.addColorStop(0.4, '#eab308');
        sg.addColorStop(0.5, '#fef9c3');
        sg.addColorStop(0.65, '#ca8a04');
        sg.addColorStop(0.85, '#fde047');
        sg.addColorStop(1.0, '#854d0e');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, 1024, 512);
    } else if (bodyId === 'uranus') {
        const ug = ctx.createLinearGradient(0, 0, 0, 512);
        ug.addColorStop(0, '#a5f3fc');
        ug.addColorStop(0.5, '#67e8f9');
        ug.addColorStop(1, '#22d3ee');
        ctx.fillStyle = ug;
        ctx.fillRect(0, 0, 1024, 512);
    } else if (bodyId === 'neptune') {
        const ng = ctx.createLinearGradient(0, 0, 0, 512);
        ng.addColorStop(0, '#1e3a8a');
        ng.addColorStop(0.3, '#2563eb');
        ng.addColorStop(0.5, '#1d4ed8');
        ng.addColorStop(0.75, '#3b82f6');
        ng.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = ng;
        ctx.fillRect(0, 0, 1024, 512);
        // High-altitude white methane-ice streaks & Great Dark Spot
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.beginPath();
        ctx.ellipse(480, 310, 46, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.65)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(420, 290);
        ctx.lineTo(550, 295);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    solarBodyTextureCache[bodyId] = tex;
    return tex;
}

function getSaturnRingTexture() {
    if (solarBodyTextureCache['saturn_ring']) return solarBodyTextureCache['saturn_ring'];
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0.00, 'rgba(0,0,0,0)');
    g.addColorStop(0.15, 'rgba(120, 113, 108, 0.25)'); // C Ring
    g.addColorStop(0.32, 'rgba(254, 240, 138, 0.88)'); // B Ring
    g.addColorStop(0.62, 'rgba(234, 179, 8, 0.82)');
    g.addColorStop(0.66, 'rgba(2, 6, 23, 0.08)');      // Cassini Division
    g.addColorStop(0.70, 'rgba(253, 224, 71, 0.72)');  // A Ring
    g.addColorStop(0.92, 'rgba(217, 119, 6, 0.45)');
    g.addColorStop(1.00, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 64);
    const tex = new THREE.CanvasTexture(canvas);
    solarBodyTextureCache['saturn_ring'] = tex;
    return tex;
}



/**
 * Switches cleanly between 'menu' (Cinematic Main Menu), 'explore' (Solar System & Cosmic History),
 * and 'game' (Spacecraft Engineering & Mission Control) without creating duplicate loops or resetting spacecraft state.
 */
function switchAppExperience(targetMode) {
    SoundFX.click();
    if (timelineAutoTimer) {
        clearInterval(timelineAutoTimer);
        timelineAutoTimer = null;
    }
    appExperienceMode = targetMode;

    const shell = document.getElementById('solarSystemStageShell');
    const menuOverlay = document.getElementById('mainMenuOverlay');
    const exploreOverlay = document.getElementById('solarExplorerOverlay');
    const solarMount = document.getElementById('solarSystemCanvasMount');
    const gameMount = document.getElementById('threeCanvasContainer');

    initSolarSystemExplorerScene();
    if (!explorerUI.materialsEnhanced) { explorerUI.materialsEnhanced = true; enhanceExplorerPlanetMaterials(); }
    if (explorerUI.expanded && targetMode !== 'explore') toggleExplorerViewportExpand(false);
    shell.classList.toggle('is-explore', targetMode === 'explore');

    if (targetMode === 'menu') {
        shell.classList.remove('hidden');
        menuOverlay.classList.remove('hidden');
        exploreOverlay.classList.add('hidden');
        // Attach shared renderer canvas to the full-screen Solar System stage
        if (threeRenderer && solarMount && threeRenderer.domElement.parentElement !== solarMount) {
            solarMount.innerHTML = '';
            solarMount.appendChild(threeRenderer.domElement);
        } else if (fallbackCanvas2D && solarMount && fallbackCanvas2D.parentElement !== solarMount) {
            solarMount.innerHTML = '';
            solarMount.appendChild(fallbackCanvas2D);
        }
        solarSelectedBodyId = 'solar_system';
        solarTargetSpherical = { radius: 68, theta: 0.65, phi: 1.18 };
        nexiState.lastCustomAnswer = null;
        updateNexiContextualGuidance();
        resizeSolarSystemViewport();
    } else if (targetMode === 'explore') {
        shell.classList.remove('hidden');
        menuOverlay.classList.add('hidden');
        exploreOverlay.classList.remove('hidden');
        const exMount = document.getElementById('explorerViewportMount');
        attachExplorerViewportHandlers();
        if (threeRenderer && exMount && threeRenderer.domElement.parentElement !== exMount) {
            exMount.innerHTML = '';
            exMount.appendChild(threeRenderer.domElement);
        } else if (fallbackCanvas2D && exMount && fallbackCanvas2D.parentElement !== exMount) {
            exMount.innerHTML = '';
            exMount.appendChild(fallbackCanvas2D);
        }
        syncExplorerAudioButton();
        renderSolarBodyList();
        selectSolarBody(solarSelectedBodyId || 'earth');
        resizeSolarSystemViewport();
        setTimeout(resizeSolarSystemViewport, 60);
    } else if (targetMode === 'game') {
        shell.classList.add('hidden');
        nexiState.lastCustomAnswer = null;
        applyWorkspaceLayout();
        if (threeRenderer && gameMount && threeRenderer.domElement.parentElement !== gameMount) {
            gameMount.innerHTML = '';
            gameMount.appendChild(threeRenderer.domElement);
        } else if (fallbackCanvas2D && gameMount && fallbackCanvas2D.parentElement !== gameMount) {
            gameMount.innerHTML = '';
            gameMount.appendChild(fallbackCanvas2D);
        }
        setTimeout(() => {
            resizeThreeViewport();
            renderAllUI();
        }, 30);
    }
}

function resizeSolarSystemViewport() {
    const mount = document.getElementById(appExperienceMode === 'explore' ? 'explorerViewportMount' : 'solarSystemCanvasMount');
    if (!mount || !solarCamera) return;
    const w = Math.max(100, mount.clientWidth || window.innerWidth);
    const h = Math.max(100, mount.clientHeight || window.innerHeight);
    solarCamera.aspect = w / h;
    solarCamera.updateProjectionMatrix();
    if (threeRenderer) threeRenderer.setSize(w, h);
    if (fallbackCanvas2D) {
        fallbackCanvas2D.width = w;
        fallbackCanvas2D.height = h;
    }
}




function resetSolarSystemOverviewCamera() {
    selectSolarBody('solar_system');
}


function focusCosmicHistoryTimeline() {
    SoundFX.click();
    if (solarPanelsCollapsed) toggleExplorerPanelsCollapsed();
    const foot = document.getElementById('solarTimelineFooter');
    if (!foot) return;
    foot.classList.add('is-spotlight');
    setTimeout(() => foot.classList.remove('is-spotlight'), 1800);
    const entry = SOLAR_SYSTEM_DATABASE.find(b => b.id === solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    const ev = (entry.history || [])[timelineCurrentIndex];
    if (ev) {
        nexiState.lastCustomAnswer = `Cosmic History · ${entry.name}: use Earlier/Later Era or Auto-Tour to travel through ${entry.history.length} eras. Now showing ${ev.date} — ${ev.title}.`;
        updateNexiContextualGuidance();
    }
}

function renderSolarDossierPanel(entry) {
    const box = document.getElementById('solarDossierContent');
    if (!box) return;

    // Check if this world has a dedicated A.T.L.A.S spacecraft mission directive
    const missionMap = {
        earth: 'earth_pulse',
        moon: 'artemis_lunar',
        mars: 'red_horizon',
        europa: 'europa_clipper'
    };
    const linkedScenarioId = missionMap[entry.id];

    box.innerHTML = `
        <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
                <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">${entry.classification}</span>
                <h2 class="font-display text-lg font-bold text-white mt-1">${entry.name}</h2>
            </div>
            <div class="w-9 h-9 rounded-xl bg-slate-900 border border-cyan-400/40 flex items-center justify-center shrink-0">
                <i class="ph-duotone ${entry.icon} text-lg" style="color:${entry.color}"></i>
            </div>
        </div>

        <!-- Key Physical & Orbital Facts Grid -->
        <div class="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
            <div class="p-2 rounded-xl bg-slate-950/85 border border-slate-800/90">
                <div class="text-[8px] text-slate-400 uppercase">DIAMETER</div>
                <div class="text-cyan-300 font-bold mt-0.5">${entry.diameter}</div>
            </div>
            <div class="p-2 rounded-xl bg-slate-950/85 border border-slate-800/90">
                <div class="text-[8px] text-slate-400 uppercase">DISTANCE FROM SUN</div>
                <div class="text-amber-300 font-bold mt-0.5">${entry.distanceFromSun}</div>
            </div>
            <div class="p-2 rounded-xl bg-slate-950/85 border border-slate-800/90">
                <div class="text-[8px] text-slate-400 uppercase">ORBITAL PERIOD</div>
                <div class="text-emerald-300 font-bold mt-0.5">${entry.orbitalPeriod}</div>
            </div>
            <div class="p-2 rounded-xl bg-slate-950/85 border border-slate-800/90">
                <div class="text-[8px] text-slate-400 uppercase">ROTATION / AGE</div>
                <div class="text-purple-300 font-bold mt-0.5">${entry.rotationPeriod.split('(')[0]}</div>
            </div>
        </div>

        <div class="space-y-2 text-xs">
            <div class="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800/90">
                <div class="font-mono text-[9px] uppercase text-cyan-400 font-bold mb-0.5">Surface &amp; Atmosphere</div>
                <p class="text-slate-300 text-[11px] leading-relaxed">${entry.surfaceAtmo}</p>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800/90">
                <div class="font-mono text-[9px] uppercase text-emerald-400 font-bold mb-0.5">Key Scientific Discoveries (${entry.age})</div>
                <p class="text-slate-300 text-[11px] leading-relaxed">${entry.discoveries}</p>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800/90">
                <div class="font-mono text-[9px] uppercase text-amber-400 font-bold mb-0.5">Exploration Mission Heritage</div>
                <p class="text-slate-300 text-[11px] leading-relaxed">${entry.missions}</p>
            </div>
        </div>

        <div class="pt-1 flex flex-col gap-1.5">
            <div class="grid grid-cols-2 gap-1.5">
                <button onclick="zoomCloseToSelectedSolarBody()" class="py-1.5 px-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-400/40 font-mono text-[10px] font-bold flex items-center justify-center gap-1">
                    <i class="ph-bold ph-magnifying-glass-plus"></i>
                    <span>Close-Up Orbit View</span>
                </button>
                ${entry.id === 'europa' ? `
                    <button onclick="toggleSolarEuropaCutaway()" class="py-1.5 px-2.5 rounded-xl ${solarEuropaCutawayActive ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-sky-500/20 text-sky-200 border border-sky-400/40 font-bold'} font-mono text-[10px] flex items-center justify-center gap-1">
                        <i class="ph-bold ph-Drop"></i>
                        <span>${solarEuropaCutawayActive ? 'Ocean Cutaway: ON' : 'Subsurface Cutaway'}</span>
                    </button>
                ` : `
                    <button onclick="resetSolarSystemOverviewCamera()" class="py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px] flex items-center justify-center gap-1">
                        <i class="ph-bold ph-arrows-out"></i>
                        <span>Full System View</span>
                    </button>
                `}
            </div>
            ${linkedScenarioId ? `
                <button onclick="launchMissionFromSolarExplorer('${linkedScenarioId}')" class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 hover:from-cyan-400/45 hover:to-emerald-400/45 text-white border border-cyan-300/50 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 shadow">
                    <i class="ph-fill ph-rocket-launch text-cyan-300"></i>
                    <span>Design Spacecraft Mission for ${entry.name}</span>
                </button>
            ` : ''}
            <div class="text-[9px] font-mono text-slate-400 text-center">
                Source Attribution: NASA Solar System Exploration / JPL / ESA Planetary Fact Sheets
            </div>
        </div>
    `;
}

function launchMissionFromSolarExplorer(scenarioId) {
    selectScenario(scenarioId);
    switchAppExperience('game');
}

function renderHistoryTimelineForBody(entry) {
    const events = entry.history || [];
    const slider = document.getElementById('historyTimelineSlider');
    if (slider) {
        slider.max = Math.max(0, events.length - 1);
        slider.value = timelineCurrentIndex;
    }

    document.getElementById('timelineScopeBadge').textContent = `COSMIC HISTORY // ${entry.name.toUpperCase()}`;

    const nodesStrip = document.getElementById('historyTimelineNodesStrip');
    if (nodesStrip) {
        nodesStrip.innerHTML = events.map((ev, idx) => {
            const active = idx === timelineCurrentIndex;
            return `
                <button onclick="selectHistoryTimelineIndex(${idx})" class="flex-1 py-1 px-1 rounded text-[9px] font-mono truncate border transition ${
                    active ? 'bg-purple-500/30 border-purple-300 text-white font-bold' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }" title="${ev.date}: ${ev.title}">
                    Era ${idx + 1}
                </button>
            `;
        }).join('');
    }

    updateHistoryTimelineEventDisplay(entry, timelineCurrentIndex);
}

function selectHistoryTimelineIndex(idx) {
    SoundFX.click();
    const entry = SOLAR_SYSTEM_DATABASE.find(b => b.id === solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    const events = entry.history || [];
    timelineCurrentIndex = Math.max(0, Math.min(events.length - 1, Number(idx)));
    const ev = events[timelineCurrentIndex];
    if (ev) {
        nexiState.lastCustomAnswer = `Let's travel back in time (${ev.date}) and examine how ${entry.name} developed: ${ev.title} — ${ev.desc}`;
        updateNexiContextualGuidance();
    }
    renderHistoryTimelineForBody(entry);
}

function stepHistoryTimeline(delta) {
    const entry = SOLAR_SYSTEM_DATABASE.find(b => b.id === solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    const events = entry.history || [];
    const next = (timelineCurrentIndex + delta + events.length) % events.length;
    selectHistoryTimelineIndex(next);
}

function toggleTimelineAutoPlay() {
    SoundFX.click();
    const icon = document.getElementById('timelinePlayIcon');
    const label = document.getElementById('timelinePlayLabel');
    if (timelineAutoTimer) {
        clearInterval(timelineAutoTimer);
        timelineAutoTimer = null;
        if (icon) icon.className = 'ph-fill ph-play';
        if (label) label.textContent = 'Auto-Tour Eras';
    } else {
        if (icon) icon.className = 'ph-fill ph-pause';
        if (label) label.textContent = 'Touring...';
        timelineAutoTimer = setInterval(() => {
            stepHistoryTimeline(1);
        }, 4200);
    }
}

function updateHistoryTimelineEventDisplay(entry, idx) {
    const events = entry.history || [];
    const ev = events[idx] || events[0];
    if (!ev) return;

    document.getElementById('timelineEraDateBadge').textContent = ev.date;
    document.getElementById('timelineReconstructionBadge').textContent = ev.type.toUpperCase();

    const card = document.getElementById('historyTimelineDetailCard');
    if (card) {
        card.innerHTML = `
            <div class="w-12 h-12 rounded-xl bg-slate-900 border border-purple-400/45 flex items-center justify-center shrink-0 relative overflow-hidden">
                <svg viewBox="0 0 60 60" class="w-full h-full">
                    <defs>
                        <radialGradient id="eraGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="${ev.color}" stop-opacity="0.9"/>
                            <stop offset="100%" stop-color="#020617" stop-opacity="0.95"/>
                        </radialGradient>
                    </defs>
                    <rect width="60" height="60" fill="url(#eraGlow)"/>
                    <circle cx="30" cy="30" r="14" fill="${ev.color}" opacity="0.85"/>
                    <ellipse cx="30" cy="30" rx="24" ry="7" fill="none" stroke="#e2e8f0" stroke-width="1.2" stroke-dasharray="3 2" transform="rotate(-18 30 30)"/>
                </svg>
            </div>
            <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                    <span class="font-display text-xs sm:text-sm font-bold text-white truncate">${ev.title}</span>
                    <span class="text-[9px] font-mono text-purple-300 shrink-0">Step ${idx + 1} of ${events.length}</span>
                </div>
                <p class="text-[11px] text-slate-300 leading-snug mt-0.5">${ev.desc}</p>
            </div>
        `;
    }
}

function toggleSolarOrbitsPause() {
    SoundFX.click();
    solarOrbitsPaused = !solarOrbitsPaused;
    const icon = document.getElementById('solarOrbitPauseIcon');
    const label = document.getElementById('solarOrbitPauseLabel');
    if (icon && label) {
        icon.className = solarOrbitsPaused ? 'ph-fill ph-play' : 'ph-fill ph-pause';
        label.textContent = solarOrbitsPaused ? 'Orbits: Paused' : 'Orbits: Playing';
    }
}

function cycleSolarOrbitSpeed() {
    SoundFX.click();
    const speeds = [0.5, 1.0, 2.5, 5.0];
    const idx = speeds.indexOf(solarOrbitSpeedMult);
    solarOrbitSpeedMult = speeds[(idx + 1) % speeds.length];
    const btn = document.getElementById('solarOrbitSpeedBtn');
    if (btn) btn.textContent = `Orbit Speed: ${solarOrbitSpeedMult}x`;
}




function toggleExplorerPanelsCollapsed() {
    SoundFX.click();
    solarPanelsCollapsed = !solarPanelsCollapsed;
    const mid = document.getElementById('solarExplorerMiddlePanels');
    const foot = document.getElementById('solarTimelineFooter');
    const btn = document.getElementById('solarCleanViewBtn');
    if (mid && foot && btn) {
        if (solarPanelsCollapsed) {
            mid.classList.add('opacity-0', 'pointer-events-none');
            foot.classList.add('opacity-0', 'pointer-events-none');
            btn.innerHTML = '<i class="ph-bold ph-eye-slash text-cyan-300"></i> <span>Show Panels</span>';
        } else {
            mid.classList.remove('opacity-0', 'pointer-events-none');
            foot.classList.remove('opacity-0', 'pointer-events-none');
            btn.innerHTML = '<i class="ph-bold ph-eye"></i> <span class="hidden xl:inline">Hide Panels</span>';
        }
    }
}

function toggleSolarExplorerFullscreen() {
    const el = document.getElementById('solarSystemStageShell');
    if (!document.fullscreenElement && el && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
    } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
    }
}


window.addEventListener('resize', () => {
    if (appExperienceMode === 'menu' || appExperienceMode === 'explore') {
        resizeSolarSystemViewport();
    }
});

// Hook Solar System Explorer rendering into the single master requestAnimationFrame loop
const _originalAnimateThreeLoop = animateThreeLoop;
animateThreeLoop = function () {
    if (appExperienceMode === 'menu' || appExperienceMode === 'explore') {
        requestAnimationFrame(animateThreeLoop);
        updateAndRenderSolarSystemExplorer();
        return;
    }
    _originalAnimateThreeLoop();
};

