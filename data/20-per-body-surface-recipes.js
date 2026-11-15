/* A.T.L.A.S · section 16B — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16B. PER-BODY SURFACE RECIPES
 *      Feature tuples: [lat°, eastLon°, radius°, type, b0, b1, b2, b3]
 *      types: 0 basin · 1 rayed crater · 2 albedo province · 3 shield volcano
 *             4 canyon/ridge segment [lat1,lon1,width,4,lat2,lon2,depth,0]
 *             5 bright deposit · 6 chaos terrain · 7 multi-ring basin
 *             9 parallel fractures · 10 storm oval · 11 ice plain · 12 dunes · 13 plume ring
 *      Coordinates follow IAU/USGS planetocentric east longitudes (approximate).
 ***********************************************************************/
const RGB = (r, g, b) => [r, g, b];
const AERO_RECIPE_DEFAULTS = {
    style: 0, seed: 1, colA: RGB(.4, .4, .4), colB: RGB(.6, .6, .6), colC: RGB(.5, .5, .5), colD: RGB(.3, .3, .3),
    noiseScale: 2.5, mottle: 0.4, relief: 1.0, ridge: 0.0,
    craterDensity: 0.5, craterAmp: 1.0, craterMinScale: 4.0, craterOctaves: 4, craterRays: 0.6,
    fracture: 0.0, fractureScale: 3.0, fractureCol: RGB(.5, .3, .2),
    groove: 0.0, twoTone: 0.0, twoToneLon: 0.0,
    polar: [95, 95, 0, 0], polarCol: RGB(.92, .92, .92),
    dichotomy: 0.0, spots: 0.0, bands: [], turb: 0.0, streaks: 0.0,
    feats: [], normalStrength: 10.0, roughness: 0.92, alphaMode: 0
};

const AERO_RECIPES = {
    mercury: {
        seed: 3, colA: RGB(.34, .32, .30), colB: RGB(.62, .59, .55), colC: RGB(.50, .44, .38), colD: RGB(.28, .27, .26),
        mottle: 0.45, craterDensity: 0.62, craterMinScale: 4, craterOctaves: 5, craterRays: 0.9, normalStrength: 16,
        basis: 'Procedural reconstruction guided by MESSENGER global maps (feature positions approximate).',
        feats: [
            [30.5, 170.2, 18, 0, 0.05, 0.016, 0.25, 0.10],
            [-33.2, 87.9, 7.8, 0, 0.03, 0.012, 0.2, 0.04],
            [-20, 120, 16, 2, -0.14, 0, 0.6, 0],
            [57.8, 16.8, 1.8, 1, 0, 3.0, 0.1, 0],
            [-11.3, -31.5, 0.9, 1, 0, 2.5, 0.1, 0],
            [-33.9, -12.5, 1.1, 1, 0, 3.0, 0.1, 0]
        ]
    },
    venus_surface: {
        seed: 5, colA: RGB(.42, .28, .17), colB: RGB(.74, .54, .32), colC: RGB(.60, .42, .25), colD: RGB(.30, .20, .12),
        noiseScale: 2.0, mottle: 0.55, ridge: 0.8, craterDensity: 0.08, craterOctaves: 2, craterMinScale: 5, craterRays: 0.2, normalStrength: 9,
        basis: 'Radar-inspired procedural reconstruction (Magellan-era topography features, approximate). Not radar imagery.',
        feats: [
            [65, 3, 6, 3, 0.09, 0, 0.3, 0],
            [70, -30, 15, 2, 0.12, 0.025, 0.4, 0],
            [-5, 105, 25, 2, 0.12, 0.03, 0.5, 0],
            [-60, 30, 9, 7, 3, 0.02, 0.3, 0.05],
            [25, -80, 6, 3, 0.05, 0.12, 0.3, 0]
        ]
    },
    venus_clouds: { style: 3, seed: 7, colA: RGB(.80, .70, .50), colB: RGB(.96, .92, .80), colC: RGB(.86, .76, .56), basis: 'Procedural cloud deck (visible light).' },
    venus_clouds_upper: { style: 3, seed: 11, colA: RGB(.86, .80, .66), colB: RGB(.99, .97, .90), colC: RGB(.90, .84, .70), alphaMode: 1, basis: 'Procedural upper haze layer.' },
    moon: {
        seed: 13, colA: RGB(.40, .39, .38), colB: RGB(.64, .62, .59), colC: RGB(.52, .50, .47), colD: RGB(.23, .23, .24),
        mottle: 0.35, craterDensity: 0.62, craterMinScale: 4, craterOctaves: 5, craterRays: 0.75, normalStrength: 15, ridge: 0.35,
        basis: 'Procedural reconstruction guided by LRO/LOLA maps; real three.js lunar albedo mosaic used when it loads.',
        feats: [
            [32.8, -15.6, 18.9, 2, 0.92, -0.010, 0.5, 1],
            [32.8, -15.6, 18.9, 0, 0.0, 0.018, 0.2, 0],
            [28.0, 17.5, 11.1, 2, 0.90, -0.009, 0.5, 1],
            [8.5, 31.4, 14.4, 2, 0.90, -0.009, 0.6, 1],
            [17.0, 59.1, 9.2, 2, 0.95, -0.010, 0.3, 1],
            [-7.8, 51.3, 13.0, 2, 0.85, -0.008, 0.6, 1],
            [-15.2, 35.5, 5.5, 2, 0.85, -0.008, 0.4, 1],
            [-21.3, -16.6, 11.8, 2, 0.80, -0.008, 0.6, 1],
            [18.4, -57.4, 30.0, 2, 0.85, -0.009, 0.8, 1],
            [-24.4, -38.6, 6.8, 2, 0.85, -0.008, 0.4, 1],
            [56.0, 1.4, 8.0, 2, 0.75, -0.006, 0.7, 1],
            [-19.4, -92.8, 15, 7, 3, 0.03, 0.3, -0.04],
            [-53, -169, 41, 0, 0.06, 0.0, 0.3, -0.07],
            [-89.67, 129.8, 0.6, 0, 0.05, 0.014, 0.0, -0.08],
            [-43.31, -11.36, 1.4, 1, 0, 6.0, 0.1, 0],
            [9.62, -20.08, 1.5, 1, 0, 4.0, 0.1, 0],
            [8.1, -38.0, 0.5, 1, 0, 3.0, 0.1, 0],
            [23.7, -47.4, 0.7, 5, 0.6, 0, 0, 0]
        ]
    },
    mars: {
        seed: 17, colA: RGB(.46, .24, .12), colB: RGB(.72, .42, .22), colC: RGB(.82, .57, .34), colD: RGB(.26, .17, .12),
        mottle: 0.5, craterDensity: 0.32, craterAmp: 0.6, craterOctaves: 4, craterRays: 0.15, dichotomy: 1.0, normalStrength: 13,
        polar: [80, 84, 0.95, 0.012], polarCol: RGB(.94, .93, .91),
        basis: 'Procedural reconstruction guided by MOLA topography & Viking/MGS albedo (feature positions approximate).',
        feats: [
            [2, -110, 30, 3, 0.07, 0.0, 0.4, 0],
            [18.65, -133.8, 5.5, 3, 0.13, 0.16, 0.15, 1],
            [11.8, -104.5, 3.5, 3, 0.07, 0.15, 0.2, 0],
            [0.8, -112.9, 3.2, 3, 0.06, 0.15, 0.2, 0],
            [-8.3, -120.5, 3.6, 3, 0.065, 0.18, 0.2, 0],
            [40.5, -109.6, 9, 3, 0.025, 0.08, 0.3, 0],
            [25.0, 147.2, 3, 3, 0.05, 0.12, 0.2, 0],
            [-7, -97, 2.2, 4, -10, -75, 0.05, 0],
            [-10, -75, 2.6, 4, -13, -58, 0.06, 0],
            [-13, -58, 2.2, 4, -6, -38, 0.045, 0],
            [-7, -102, 3, 9, 6, 0.6, 0.3, 0],
            [-42.4, 70.5, 19.4, 0, 0.12, 0.02, 0.25, 0.16],
            [-49.7, -43.0, 15, 0, 0.07, 0.02, 0.25, 0.10],
            [12.9, 87.0, 10, 0, 0.04, 0.01, 0.25, 0.05],
            [49.7, 118.0, 25, 0, 0.03, 0.0, 0.3, 0.04],
            [8.4, 69.5, 10, 2, 0.75, 0, 0.6, 1],
            [46.7, -22, 15, 2, 0.6, 0, 0.6, 1],
            [-25, -40, 15, 2, 0.55, 0, 0.6, 1],
            [-2, 0, 8, 2, 0.6, 0, 0.6, 1],
            [-20, 105, 12, 2, 0.55, 0, 0.6, 1],
            [-20, 145, 12, 2, 0.55, 0, 0.6, 1],
            [-26, -88, 5, 2, 0.6, 0, 0.5, 1],
            [81, 180, 10, 12, 0.5, 0, 0.4, 0]
        ]
    },
    jupiter: {
        style: 1, seed: 19, turb: 1.25, streaks: 0.14, normalStrength: 2.5, roughness: 0.95,
        basis: 'Procedural reconstruction of Juno/Cassini-era belt & zone structure.',
        bands: [[-90, .52, .47, .42], [-62, .66, .58, .48], [-45, .80, .73, .62], [-34, .70, .58, .46], [-27, .86, .80, .69],
                [-20, .64, .45, .31], [-8, .90, .85, .74], [7, .60, .42, .29], [18, .86, .80, .68], [26, .68, .55, .43],
                [33, .82, .76, .65], [45, .70, .62, .52], [62, .52, .48, .44]],
        feats: [
            [-22.5, 60, 4.8, 10, 0, 1.4, 1, 0],
            [-34, -40, 1.6, 10, 1, 1.5, 2, 0],
            [-34, 120, 1.5, 10, 1, 1.5, 3, 0],
            [-41, 10, 1.2, 10, 1, 1.6, 4, 0],
            [7.5, -150, 1.0, 10, 2, 2.5, 5, 0],
            [7.5, 30, 1.0, 10, 2, 2.5, 6, 0]
        ]
    },
    saturn: {
        style: 1, seed: 23, turb: 0.4, streaks: 0.12, spots: 1, normalStrength: 1.5, roughness: 0.95,
        basis: 'Procedural reconstruction of Cassini-era banding incl. the north-polar hexagon.',
        bands: [[-90, .62, .60, .55], [-70, .75, .68, .55], [-50, .84, .76, .60], [-35, .80, .70, .52], [-20, .90, .82, .64],
                [-8, .93, .86, .68], [8, .90, .82, .63], [20, .82, .72, .54], [35, .86, .78, .61], [50, .78, .70, .56], [65, .62, .64, .62]]
    },
    uranus: {
        style: 1, seed: 29, turb: 0.15, streaks: 0.03, normalStrength: 0.5, roughness: 0.97,
        basis: 'Procedural reconstruction (Voyager 2 / Keck / JWST appearance).',
        bands: [[-90, .70, .88, .90], [-40, .66, .86, .89], [-10, .62, .83, .87], [10, .64, .85, .88], [40, .70, .89, .91], [65, .76, .92, .93]]
    },
    neptune: {
        style: 1, seed: 31, turb: 0.5, streaks: 0.18, normalStrength: 1.0, roughness: 0.96,
        basis: 'Procedural reconstruction; the Great Dark Spot is shown as seen by Voyager 2 in 1989 (it has since vanished).',
        bands: [[-90, .30, .42, .80], [-70, .22, .36, .78], [-50, .27, .42, .86], [-25, .24, .40, .85], [0, .27, .44, .88], [25, .24, .40, .85], [55, .22, .36, .78]],
        feats: [
            [-22, 40, 6, 10, 2, 1.6, 7, 0],
            [-27, 40, 1.2, 10, 3, 3, 8, 0],
            [-42, -120, 1.0, 10, 3, 2, 9, 0],
            [-60, 100, 0.8, 10, 3, 4, 10, 0],
            [20, -30, 1.0, 10, 3, 6, 11, 0]
        ]
    },
    europa: {
        seed: 37, colA: RGB(.78, .74, .66), colB: RGB(.93, .92, .89), colC: RGB(.78, .83, .88), colD: RGB(.62, .46, .34),
        mottle: 0.35, relief: 0.6, craterDensity: 0.08, craterOctaves: 2, craterMinScale: 6, craterRays: 0.6,
        fracture: 1.0, fractureScale: 3.0, fractureCol: RGB(.55, .33, .20), normalStrength: 9,
        basis: 'Procedural reconstruction guided by Galileo/Voyager mosaics (lineae, chaos and craters at approximate positions).',
        feats: [
            [0, 90, 70, 2, 0.45, 0, 0.4, 1],
            [9.7, 86.7, 4, 6, 0.9, 0, 0.3, 0],
            [-46.7, 178.8, 4, 6, 0.9, 0, 0.3, 0],
            [22, 83, 3, 6, 0.8, 0, 0.3, 0],
            [-25.2, 88.6, 1.0, 1, 0, 6.0, 0.1, 0],
            [34, -146.7, 3, 7, 4, 0.01, 0.2, 0.05]
        ]
    },
    io: {
        style: 2, seed: 41, colA: RGB(.80, .72, .40), colB: RGB(.91, .87, .66), colC: RGB(.78, .50, .26), colD: RGB(.42, .32, .24),
        relief: 0.6, craterDensity: 0.0, craterOctaves: 0, spots: 0.11, normalStrength: 6,
        basis: 'Procedural reconstruction guided by Galileo/Juno imagery (Pele, Loki, Prometheus at approximate positions).',
        feats: [
            [-18.7, 104.7, 6, 13, 0.75, 0, 0.3, 0],
            [13, 51, 1.6, 2, -0.75, 0, 0.3, 0],
            [-1.6, -153, 3, 13, 0.5, 0, 0.3, 0],
            [63, -123, 3, 13, 0.45, 0, 0.3, 0]
        ]
    },
    ganymede: {
        seed: 43, colA: RGB(.36, .33, .30), colB: RGB(.62, .60, .56), colC: RGB(.48, .46, .43), colD: RGB(.72, .71, .68),
        groove: 0.9, craterDensity: 0.4, craterOctaves: 4, craterRays: 0.7, normalStrength: 11,
        polar: [60, 60, 0.3, 0.0], polarCol: RGB(.82, .84, .86),
        basis: 'Procedural reconstruction guided by Galileo/Voyager/Juno maps.',
        feats: [[35, -145, 25, 2, -0.25, 0, 0.4, 0], [-38, -166, 1.3, 1, 0, 4, 0.1, 0], [11, -27, 1.2, 1, 0, 3, 0.1, 0]]
    },
    callisto: {
        seed: 47, colA: RGB(.24, .22, .20), colB: RGB(.48, .45, .41), colC: RGB(.35, .32, .29),
        craterDensity: 0.8, craterOctaves: 5, craterRays: 0.9, normalStrength: 13,
        basis: 'Procedural reconstruction guided by Galileo/Voyager maps.',
        feats: [[14.7, -56, 15, 7, 6, 0.03, 0.2, 0.12], [32.2, 140, 8, 7, 4, 0.02, 0.2, 0.08]]
    },
    titan: {
        seed: 53, colA: RGB(.18, .13, .08), colB: RGB(.46, .36, .22), colC: RGB(.30, .22, .13),
        relief: 0.5, craterDensity: 0.05, craterOctaves: 2, normalStrength: 6,
        basis: 'Surface: procedural reconstruction guided by Cassini radar/near-IR maps. Hidden by haze in visible light.',
        feats: [[-10, -100, 25, 2, 0.6, 0.01, 0.4, 0], [0, 30, 40, 12, 0.5, 0, 0.4, 0], [68, -50, 8, 2, -0.6, -0.01, 0.6, 0], [79, -110, 4, 2, -0.6, -0.01, 0.6, 0]]
    },
    enceladus: {
        seed: 59, colA: RGB(.86, .88, .90), colB: RGB(.97, .98, .99), colC: RGB(.86, .91, .95), colD: RGB(.55, .74, .84),
        fracture: 0.4, fractureScale: 2.5, fractureCol: RGB(.62, .76, .84), craterDensity: 0.35, craterOctaves: 3, craterRays: 0.2, normalStrength: 10,
        basis: 'Procedural reconstruction guided by Cassini maps (south-polar “tiger stripes”).',
        feats: [[-90, 0, 22, 9, 4, 0.9, 0.2, 1]]
    },
    mimas: {
        seed: 61, colA: RGB(.62, .62, .62), colB: RGB(.82, .82, .80), craterDensity: 0.75, craterOctaves: 5, normalStrength: 14,
        basis: 'Procedural reconstruction guided by Cassini maps (Herschel crater).',
        feats: [[1.7, -111.8, 20, 0, 0.09, 0.03, 0.1, -0.05], [1.7, -111.8, 3, 3, 0.05, 0, 0, 0]]
    },
    tethys: {
        seed: 67, colA: RGB(.75, .75, .76), colB: RGB(.90, .90, .90), craterDensity: 0.55, normalStrength: 12,
        basis: 'Procedural reconstruction guided by Cassini maps (Odysseus, Ithaca Chasma).',
        feats: [[32.8, -128.9, 24, 0, 0.06, 0.02, 0.15, 0], [55, -20, 1.8, 4, 0, -15, 0.03, 0], [0, -15, 1.8, 4, -55, -5, 0.03, 0]]
    },
    dione: {
        seed: 71, colA: RGB(.62, .62, .63), colB: RGB(.86, .86, .86), fractureCol: RGB(.95, .96, .97), craterDensity: 0.55, normalStrength: 12,
        basis: 'Procedural reconstruction guided by Cassini maps (trailing-hemisphere wispy fractures).',
        feats: [[0, 90, 55, 9, 5, 0.75, 0.3, 0], [0, 90, 70, 2, -0.15, 0, 0.4, 0]]
    },
    rhea: {
        seed: 73, colA: RGB(.60, .60, .60), colB: RGB(.84, .84, .83), fractureCol: RGB(.94, .95, .96), craterDensity: 0.7, craterOctaves: 5, normalStrength: 13,
        basis: 'Procedural reconstruction guided by Cassini maps.',
        feats: [[0, 90, 45, 9, 5, 0.5, 0.3, 0], [-14, -112, 1.5, 1, 0, 4, 0.1, 0]]
    },
    iapetus: {
        seed: 79, colA: RGB(.72, .70, .66), colB: RGB(.86, .84, .80), colD: RGB(.18, .12, .08), twoTone: 0.95, twoToneLon: -90,
        craterDensity: 0.6, normalStrength: 12,
        basis: 'Procedural reconstruction guided by Cassini maps (dark Cassini Regio, equatorial ridge).',
        feats: [[0, -150, 1.2, 4, 0, -30, -0.03, 0]]
    },
    miranda: {
        seed: 83, colA: RGB(.62, .62, .64), colB: RGB(.78, .78, .80), fractureCol: RGB(.45, .45, .48), craterDensity: 0.4, normalStrength: 13,
        basis: 'Procedural reconstruction guided by Voyager 2 (southern hemisphere only imaged; rest is speculative).',
        feats: [[-66, -35, 18, 9, 6, 0.7, 0.2, 0], [-29, 74, 20, 9, 7, 0.7, 0.2, 0], [-24, -103, 20, 9, 6, 0.7, 0.2, 0], [-20, -20, 1.2, 4, -50, -10, 0.05, 0]]
    },
    ariel: {
        seed: 89, colA: RGB(.58, .58, .60), colB: RGB(.78, .78, .80), craterDensity: 0.35, craterRays: 0.6, normalStrength: 12,
        basis: 'Procedural reconstruction guided by Voyager 2 (partial coverage).',
        feats: [[10, -30, 1.4, 4, -30, 20, 0.04, 0], [20, 60, 1.3, 4, -20, 110, 0.04, 0], [-5, 150, 1.4, 4, -40, -160, 0.035, 0]]
    },
    umbriel: {
        seed: 97, colA: RGB(.24, .24, .25), colB: RGB(.36, .36, .37), craterDensity: 0.7, normalStrength: 12,
        basis: 'Procedural reconstruction guided by Voyager 2 (partial coverage; Wunda bright ring).',
        feats: [[-7.9, -86.4, 6.4, 5, 0.8, 0, 0, 0]]
    },
    titania: {
        seed: 101, colA: RGB(.45, .43, .42), colB: RGB(.62, .60, .58), craterDensity: 0.5, craterRays: 0.5, normalStrength: 12,
        basis: 'Procedural reconstruction guided by Voyager 2 (partial coverage).',
        feats: [[-10, -40, 1.6, 4, -45, -5, 0.05, 0], [-15.8, -72.9, 7, 0, 0.04, 0.015, 0.2, 0]]
    },
    oberon: {
        seed: 103, colA: RGB(.36, .34, .33), colB: RGB(.52, .50, .48), craterDensity: 0.6, craterRays: 0.7, normalStrength: 12,
        basis: 'Procedural reconstruction guided by Voyager 2 (partial coverage).',
        feats: [[-46, 44, 6, 0, 0.04, 0.01, 0.2, -0.2]]
    },
    triton: {
        seed: 107, colA: RGB(.72, .68, .66), colB: RGB(.88, .82, .80), colC: RGB(.86, .74, .70), colD: RGB(.40, .36, .34),
        noiseScale: 6, relief: 0.8, ridge: 0.6, craterDensity: 0.1, craterOctaves: 2, normalStrength: 11,
        polar: [95, 15, 0.6, 0.004], polarCol: RGB(.93, .84, .82),
        basis: 'Procedural reconstruction guided by Voyager 2 (south polar cap, cantaloupe terrain, plume streaks).',
        feats: [[-40, 30, 30, 9, 3, 0.5, 0.6, 1]]
    },
    pluto: {
        seed: 109, colA: RGB(.55, .45, .38), colB: RGB(.85, .78, .70), colC: RGB(.62, .42, .30), colD: RGB(.25, .13, .08),
        craterDensity: 0.25, craterOctaves: 3, normalStrength: 11, polar: [60, 95, 0.3, 0], polarCol: RGB(.75, .70, .68),
        basis: 'Procedural reconstruction guided by New Horizons (2015) maps: Sputnik Planitia, Tombaugh Regio, Cthulhu Macula.',
        feats: [[20, 175, 15, 11, 0.95, 0, 0.3, 0], [10, -150, 22, 2, 0.25, 0, 0.4, 0], [-5, 100, 22, 2, 0.9, 0, 0.5, 1], [-10, 60, 15, 2, 0.85, 0, 0.5, 1], [-8, 140, 12, 2, 0.8, 0, 0.5, 1]]
    },
    charon: {
        seed: 113, colA: RGB(.48, .47, .46), colB: RGB(.66, .65, .63), craterDensity: 0.35, normalStrength: 11,
        polar: [72, 95, 0.8, 0], polarCol: RGB(.35, .17, .10),
        basis: 'Procedural reconstruction guided by New Horizons (Mordor Macula, Serenity Chasma).',
        feats: [[5, -10, 1.5, 4, -10, 60, 0.05, 0]]
    },
    ceres: {
        seed: 127, colA: RGB(.26, .25, .25), colB: RGB(.36, .35, .34), craterDensity: 0.55, normalStrength: 13,
        basis: 'Procedural reconstruction guided by Dawn (2015–2018) maps: Occator bright deposits, Ahuna Mons, Kerwan.',
        feats: [[19.8, -120.7, 1.6, 0, 0.03, 0.01, 0.1, 0], [19.8, -120.7, 0.5, 5, 1.0, 0, 0, 0], [-10.8, 123.9, 9, 0, 0.03, 0.006, 0.3, 0], [-10.5, -44, 1.2, 3, 0.04, 0, 0, 0]]
    },
    eris: { seed: 131, colA: RGB(.90, .90, .91), colB: RGB(.97, .97, .98), relief: 0.3, craterDensity: 0.05, craterAmp: 0.4, craterOctaves: 2, normalStrength: 6, basis: 'Speculative reconstruction — no resolved images of Eris exist.' },
    makemake: { seed: 137, colA: RGB(.68, .50, .38), colB: RGB(.86, .70, .55), relief: 0.3, craterDensity: 0.05, craterAmp: 0.4, craterOctaves: 2, normalStrength: 6, basis: 'Speculative reconstruction — no resolved images of Makemake exist.' },
    haumea: { seed: 139, colA: RGB(.82, .82, .84), colB: RGB(.93, .93, .95), colD: RGB(.45, .30, .28), relief: 0.3, craterDensity: 0.05, craterAmp: 0.4, craterOctaves: 2, normalStrength: 6,
        basis: 'Speculative reconstruction — no resolved images; the dark red region is from 2009 light-curve studies.', feats: [[0, 0, 15, 2, 0.6, 0, 0.3, 1]] },
    vesta: { seed: 149, colA: RGB(.42, .40, .38), colB: RGB(.62, .60, .56), craterDensity: 0.55, normalStrength: 13, basis: 'Procedural reconstruction guided by Dawn (2011–2012) maps (Rheasilvia basin).',
        feats: [[-75, -59, 30, 0, 0.12, 0.03, 0.2, 0], [-75, -59, 4, 3, 0.06, 0, 0, 0]] },
    pallas: { seed: 151, colA: RGB(.40, .40, .42), colB: RGB(.55, .55, .57), craterDensity: 0.6, normalStrength: 12, basis: 'Speculative reconstruction (only telescope-resolved).' },
    phobos: { seed: 157, colA: RGB(.24, .22, .21), colB: RGB(.36, .33, .31), fractureCol: RGB(.18, .17, .16), craterDensity: 0.6, normalStrength: 14,
        basis: 'Procedural reconstruction guided by Viking/MRO/Mars Express imagery (Stickney crater, grooves).',
        feats: [[1, -49, 23, 0, 0.08, 0.02, 0.1, 0.03], [0, 30, 70, 9, 9, 0.6, 0.1, 0]] },
    deimos: { seed: 163, colA: RGB(.32, .29, .27), colB: RGB(.45, .41, .38), relief: 0.4, craterDensity: 0.3, normalStrength: 9, basis: 'Procedural reconstruction guided by Viking/MRO imagery.' },
    generic_dark: { seed: 167, colA: RGB(.22, .21, .20), colB: RGB(.34, .32, .30), craterDensity: 0.6, normalStrength: 12, basis: 'Generic procedural reconstruction.' },
    generic_gray: { seed: 173, colA: RGB(.45, .44, .43), colB: RGB(.62, .60, .58), craterDensity: 0.6, normalStrength: 12, basis: 'Generic procedural reconstruction.' },
    generic_red: { seed: 179, colA: RGB(.45, .25, .16), colB: RGB(.62, .38, .25), craterDensity: 0.5, normalStrength: 12, basis: 'Generic procedural reconstruction (reddish surface reported by Voyager/Galileo).' },
    generic_sponge: { seed: 181, colA: RGB(.40, .36, .30), colB: RGB(.58, .54, .46), craterDensity: 0.95, craterOctaves: 5, craterMinScale: 5, normalStrength: 16, basis: 'Generic procedural reconstruction (sponge-like cratering seen by Cassini).' }
};

