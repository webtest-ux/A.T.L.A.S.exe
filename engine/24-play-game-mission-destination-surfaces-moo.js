/* A.T.L.A.S · section 16F — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16F. PLAY GAME — MISSION DESTINATION SURFACES (Moon · Mars · Europa)
 *      Upgrades the destination materials built by update3DSpacecraftAndOrbit
 *      with GPU-baked reconstruction maps + science overlays.
 *      The Play Game EARTH is never touched by anything in this section.
 *      Without WebGL the original canvas maps stay in use (fallback).
 ***********************************************************************/
const AERO_GAME_OVERLAYS = {};
const aeroLL = (lat, lon, r) => {
    const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    // three.js SphereGeometry UV convention: u = (lon + 180) / 360  →  (cos φ cos λ, sin φ, −cos φ sin λ)
    return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
};
// Science zones: [lat, eastLon, radius°, kind, label]  kind: psr · ice · atmo · subice · polar · chaos · plume
const AERO_MISSION_ZONES = {
    moon_psr: [
        [-89.67, 129.8, 0.35, 'psr', 'Shackleton'], [-87.45, -5.1, 0.85, 'psr', 'Haworth'], [-88.1, 44.9, 0.85, 'psr', 'Shoemaker'],
        [-87.3, 77.0, 0.7, 'psr', 'Faustini'], [-88.5, -87.1, 0.55, 'psr', 'de Gerlache'], [-88.3, -152.0, 0.55, 'psr', 'Sverdrup'],
        [-85.3, -42.1, 1.6, 'psr', 'Cabeus']
    ],
    moon_ice_zones: [
        [-89.3, 129.8, 1.1, 'ice', 'Shackleton rim'], [-87.2, -5.1, 1.3, 'ice', 'Haworth'], [-85.6, 0.0, 1.1, 'ice', 'Malapert massif'],
        [-85.2, 53.5, 1.2, 'ice', 'Nobile region'], [-88.2, -87.0, 0.9, 'ice', 'de Gerlache rim'], [-85.3, -42.1, 1.8, 'ice', 'Cabeus (LCROSS impact)']
    ],
    mars_atmo_zones: [
        [-5.4, 137.8, 4.5, 'atmo', 'Gale crater'], [22.0, 76.8, 5.0, 'atmo', 'Nili Fossae'], [8.4, 69.5, 6.0, 'atmo', 'Syrtis Major'],
        [18.4, 77.5, 2.2, 'atmo', 'Jezero'], [-1.9, 354.5, 3.0, 'atmo', 'Meridiani']
    ],
    mars_subsurface_ice: [
        [46.0, 190.0, 9.0, 'subice', 'Arcadia Planitia'], [45.0, 110.0, 9.0, 'subice', 'Utopia Planitia'],
        [44.0, 22.0, 6.0, 'subice', 'Deuteronilus Mensae'], [-40.0, 105.0, 6.5, 'subice', 'E. Hellas aprons']
    ],
    mars_polar_ice: [
        [90.0, 0.0, 9.5, 'polar', 'Planum Boreum'], [-87.0, -45.0, 4.5, 'polar', 'South residual cap'], [-83.0, -20.0, 9.0, 'polar', 'Planum Australe']
    ],
    europa_chaos_terrain: [
        [9.7, 86.7, 2.6, 'chaos', 'Conamara Chaos'], [-46.7, 178.8, 1.7, 'chaos', 'Thera Macula'], [-46.0, 171.0, 2.6, 'chaos', 'Thrace Macula'],
        [22.0, 85.0, 1.6, 'chaos', 'Murias Chaos'], [-22.0, 177.0, 6.0, 'plume', 'Plume? (unconfirmed)']
    ]
};
const AERO_ZONE_STYLE = {
    psr: { fill: [6, 10, 30, 210], stroke: [56, 189, 248, 230], w: 0.10 },
    ice: { fill: [251, 191, 36, 28], stroke: [251, 191, 36, 235], w: 0.12 },
    atmo: { fill: [52, 211, 153, 26], stroke: [52, 211, 153, 230], w: 0.35 },
    subice: { fill: [125, 211, 252, 40], stroke: [125, 211, 252, 230], w: 0.35, hatch: true },
    polar: { fill: [224, 242, 254, 22], stroke: [186, 230, 253, 230], w: 0.35 },
    chaos: { fill: [56, 189, 248, 30], stroke: [56, 189, 248, 235], w: 0.18 },
    plume: { fill: [244, 63, 94, 18], stroke: [244, 63, 94, 220], w: 0.22, dashed: true }
};
function aeroPaintZoneTexture(key, zones, W, H, latMin, latMax) {
    if (AERO_GAME_OVERLAYS[key]) return AERO_GAME_OVERLAYS[key];
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    const D = Math.PI / 180;
    const pre = zones.map(z => ({ z, s: AERO_ZONE_STYLE[z[3]], sl: Math.sin(z[0] * D), cl: Math.cos(z[0] * D), lo: z[1] * D }));
    const y0 = Math.max(0, Math.floor((90 - latMax) / 180 * H)), y1 = Math.min(H, Math.ceil((90 - latMin) / 180 * H));
    for (let y = y0; y < y1; y++) {
        const lat = (90 - (y + 0.5) / H * 180) * D, sl = Math.sin(lat), cl = Math.cos(lat);
        for (let x = 0; x < W; x++) {
            const lon = ((x + 0.5) / W * 360 - 180) * D;
            let r = 0, g = 0, b = 0, a = 0;
            for (const q of pre) {
                const cosd = Math.max(-1, Math.min(1, q.sl * sl + q.cl * cl * Math.cos(lon - q.lo)));
                const d = Math.acos(cosd) / D, R = q.z[2], s = q.s;
                let col = null;
                if (Math.abs(d - R) < s.w * Math.max(1, R * 0.12)) {
                    if (!s.dashed || Math.floor(Math.atan2(cl * Math.sin(lon - q.lo), q.cl * sl - q.sl * cl * Math.cos(lon - q.lo)) / D / 12) % 2 === 0) col = s.stroke;
                } else if (d < R) {
                    col = s.fill;
                    if (s.hatch && ((x + y) % 14) < 2) col = [s.stroke[0], s.stroke[1], s.stroke[2], 120];
                }
                if (col && col[3] > a) { r = col[0]; g = col[1]; b = col[2]; a = col[3]; }
            }
            const o = (y * W + x) * 4;
            img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = a;
        }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    if (threeRenderer) t.anisotropy = Math.min(8, threeRenderer.capabilities.getMaxAnisotropy());
    AERO_GAME_OVERLAYS[key] = t;
    return t;
}
// Simulated aerosol optical depth (illustrative dust-loading pattern; NOT observed data)
function aeroMarsDustTexture() {
    if (AERO_GAME_OVERLAYS.mars_dust) return AERO_GAME_OVERLAYS.mars_dust;
    const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
        const lat = 90 - (y + 0.5) / H * 180;
        for (let x = 0; x < W; x++) {
            const lon = (x + 0.5) / W * Math.PI * 2;
            const px = Math.cos(lat * Math.PI / 180) * Math.cos(lon), pz = Math.cos(lat * Math.PI / 180) * Math.sin(lon), py = Math.sin(lat * Math.PI / 180);
            let n = 0, a = 0.5, f = 2.2;
            for (let o = 0; o < 4; o++) { n += a * aeroNoise3(px * f + 3.1, py * f * 2.4, pz * f - 1.7); a *= 0.5; f *= 2.0; }
            const southern = Math.exp(-Math.pow((lat + 25) / 28, 2));
            const tau = Math.max(0, Math.min(1, 0.25 + 0.9 * n + 0.45 * southern));
            const o = (y * W + x) * 4;
            img.data[o] = 230; img.data[o + 1] = 160 - tau * 60; img.data[o + 2] = 70 - tau * 40; img.data[o + 3] = tau * 150;
        }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    AERO_GAME_OVERLAYS.mars_dust = t;
    return t;
}
function aeroMissionOverlayTexture(body, layer, baked) {
    if (layer === 'elevation' && baked.elev) return baked.elev.texture;
    if (body === 'europa' && layer === 'fractures' && baked.mask) return baked.mask.texture;
    if (body === 'mars' && layer === 'dust_cond') return aeroMarsDustTexture();
    const zones = AERO_MISSION_ZONES[`${body}_${layer}`];
    if (!zones) return null;
    if (body === 'moon') return aeroPaintZoneTexture(`${body}_${layer}`, zones, 2048, 1024, -90, -78);
    return aeroPaintZoneTexture(`${body}_${layer}`, zones, 1024, 512, -90, 90);
}
const AERO_MISSION_LAYER_NOTES = {
    moon_elevation: 'Relief from the procedural reconstruction (LOLA-inspired colour ramp) — not LOLA data.',
    moon_psr: 'Approximate permanently shadowed regions (LRO-derived crater list). Locations approximate.',
    moon_ice_zones: 'Research target REGIONS (outlines) — not detected ice. Simulated.',
    mars_elevation: 'Relief from the procedural reconstruction (MOLA-inspired colour ramp) — not MOLA data.',
    mars_atmo_zones: 'Atmospheric research target zones — simulated; NOT methane detections.',
    mars_subsurface_ice: 'Approximate radar-informed (SHARAD) buried-ice regions — illustrative outlines.',
    mars_polar_ice: 'Polar layered deposits & residual caps — outlines approximate.',
    mars_dust_cond: 'Simulated aerosol optical depth pattern — not observed data.',
    europa_fractures: 'Lineae & ridge network from the reconstruction (highlighted).',
    europa_chaos_terrain: 'Chaos regions (approximate) and a candidate plume region (unconfirmed).',
    europa_radiation_env: 'SIMULATED Jovian magnetic field lines & Europa flux tube — illustrative, not measured flux.'
};
const AERO_MISSION_LAYER_TAGS = {
    moon_elevation: 'RELIEF: RECONSTRUCTION', moon_psr: 'PSRs (APPROX. LOCATIONS)', moon_ice_zones: 'TARGET ZONES — NOT ICE',
    mars_elevation: 'RELIEF: RECONSTRUCTION', mars_atmo_zones: 'SIMULATED TARGET ZONES', mars_subsurface_ice: 'BURIED ICE (APPROX.)',
    mars_polar_ice: 'POLAR DEPOSITS (APPROX.)', mars_dust_cond: 'SIMULATED DUST OPACITY', europa_fractures: 'LINEAE (RECONSTRUCTION)',
    europa_chaos_terrain: 'CHAOS + PLUME (UNCONFIRMED)', europa_radiation_env: 'SIMULATED RADIATION'
};
const AERO_MISSION_RECIPE = { moon: 'moon', mars: 'mars', europa: 'europa' };

// Called right after the destination surface mesh is created. The original canvas maps stay visible
// until the baked maps finish (time-sliced on the GPU, 1024×512 first, then 2048×1024) — no frame stalls.
function aeroUpgradeMissionSurface(body, mat, legacyMaps) {
    if (body === 'earth' || !AERO_MISSION_RECIPE[body] || !planetSurfaceMesh || !threeRenderer || webglFallbackMode) return false;
    const layer = state.planetScienceLayer;
    const extras = layer === 'elevation' ? ['elev'] : ((body === 'europa' && layer === 'fractures') ? ['mask'] : []);
    const legacyImg = legacyMaps && legacyMaps.albedo && legacyMaps.albedo.image && legacyMaps.albedo.image.tagName === 'IMG';
    const cut = body === 'europa' && state.europaOceanCutaway;
    const phiLen = cut ? Math.PI * 1.55 : Math.PI * 2;
    const mesh = planetSurfaceMesh;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.SphereGeometry(3.2, 128, 64, 0, phiLen, 0, Math.PI);
    mesh.userData.aeroBaked = true;
    if (body === 'mars' && state.marsDustStormActive) { mat.color.setHex(0xe9cfae); mat.needsUpdate = true; }

    let ovMat = null;
    const addOverlay = tex => {
        ovMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: cut ? THREE.DoubleSide : THREE.FrontSide });
        const ov = new THREE.Mesh(new THREE.SphereGeometry(3.2 * 1.003, 128, 64, 0, phiLen, 0, Math.PI), ovMat);
        ov.userData.aeroOverlay = layer;
        mesh.add(ov);
        return ov;
    };
    const applyMaps = e => {
        if (planetSurfaceMesh !== mesh || mesh.material !== mat || !e || !e.albedo) return; // rebuilt meanwhile
        const cur = mat.map, curImg = !!(cur && cur.image && cur.image.tagName === 'IMG');
        // Moon natural layer: the three.js example lunar texture (if it loaded) still takes priority, as before.
        mat.map = (body === 'moon' && layer === 'natural' && (legacyImg || curImg)) ? (curImg ? cur : legacyMaps.albedo) : e.albedo.texture;
        mat.bumpMap = null;
        mat.normalMap = e.normal.texture;
        mat.normalScale = new THREE.Vector2(1, 1);
        mat.roughness = { moon: 0.96, mars: 0.9, europa: 0.5 }[body];
        mat.metalness = 0.0;
        mat.needsUpdate = true;
        if (extras[0] && e[extras[0]]) {
            if (!ovMat) addOverlay(e[extras[0]].texture);
            else { ovMat.map = e[extras[0]].texture; ovMat.needsUpdate = true; }
        }
    };
    const recipe = AERO_MISSION_RECIPE[body];
    if (PlanetBaker.available()) {
        PlanetBaker.request(recipe, 'lo', true, { extras, pin: true, cb: applyMaps });
        PlanetBaker.request(recipe, 'hi', false, { extras, pin: true, cb: applyMaps });
    } else if (!AERO_SAFE) {
        // Standard quality: CPU-generated (Web Worker) albedo + relief. Science layers keep their own colour maps
        // and gain the relief; the Natural layer gets the realistic albedo.
        aeroCpuSurface(body, tex => {
            if (planetSurfaceMesh !== mesh || mesh.material !== mat) return;
            const cur = mat.map, curImg = !!(cur && cur.image && cur.image.tagName === 'IMG');
            if (layer === 'natural' && !(body === 'moon' && (legacyImg || curImg))) mat.map = tex.albedo;
            mat.bumpMap = tex.height;
            mat.bumpScale = { moon: 0.05, mars: 0.04, europa: 0.025 }[body] * (tex.W >= 2048 ? 1 : 0.8);
            mat.normalMap = null;
            mat.roughness = { moon: 0.97, mars: 0.92, europa: 0.45 }[body];
            mat.metalness = 0.0;
            mat.needsUpdate = true;
        });
    }

    // Zone / dust overlays are canvas data layers (cached after the first build)
    const ovTex = extras.length ? null : aeroMissionOverlayTexture(body, layer, {});
    if (ovTex) {
        const ov = addOverlay(ovTex);
        const zones = AERO_MISSION_ZONES[`${body}_${layer}`];
        if (zones) {
            zones.forEach((z, k) => {
                if (body === 'moon' && k > 3) return;
                const st = AERO_ZONE_STYLE[z[3]].stroke;
                const lbl = createLabelSprite(z[4].toUpperCase(), `rgb(${st[0]},${st[1]},${st[2]})`);
                lbl.scale.set(1.45, 0.27, 1);
                lbl.position.copy(aeroLL(z[0], z[1], 3.2 * (body === 'moon' ? 1.16 + k * 0.07 : 1.12)));
                ov.add(lbl);
            });
        }
    }
    const note = AERO_MISSION_LAYER_NOTES[`${body}_${layer}`];
    if (note) {
        const n = createLabelSprite(AERO_MISSION_LAYER_TAGS[`${body}_${layer}`] || 'RECONSTRUCTION', '#94a3b8');
        n.scale.set(3.4, 0.64, 1);
        n.position.set(0, -4.55, 0);
        n.userData.aeroLayerNote = note;
        planetGroup.add(n);
    }
    // Mars: mission landing-site "footprints" (Viking → Zhurong), small pins only
    if (body === 'mars' && layer === 'natural') {
        const sites = [[22.27, -47.95], [47.64, 134.29], [19.13, -33.22], [-14.57, 175.47], [-1.95, -5.53], [68.22, -125.75], [-4.59, 137.44], [4.50, 135.62], [18.44, 77.45], [25.07, 109.93]];
        const pm = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
        const pg = new THREE.OctahedronGeometry(0.035, 0);
        sites.forEach(([la, lo]) => { const p = new THREE.Mesh(pg, pm); p.position.copy(aeroLL(la, lo, 3.212)); mesh.add(p); });
    }
    return true;
}

// Europa: Jupiter backdrop from the baked Jupiter map + Europa's orbit + Jupiter-centred field lines (radiation layer only)
function aeroUpgradeJupiterBackdrop() {
    if (!jupiterBackdropGroup || !threeRenderer || webglFallbackMode) return false;
    const jup = jupiterBackdropGroup.children[0];
    if (jup) jup.scale.set(1, 1 - 0.0649, 1);
    if (jup && PlanetBaker.available()) {
        const group = jupiterBackdropGroup;
        PlanetBaker.request('jupiter', 'lo', true, { pin: true, cb: e => {
            if (jupiterBackdropGroup !== group || !e || !e.albedo) return;
            jup.material.map = e.albedo.texture;
            jup.material.roughness = 1.0;
            jup.material.metalness = 0.0;
            jup.material.needsUpdate = true;
        } });
    }
    const J = jupiterBackdropGroup.position.clone();
    const rel = new THREE.Vector3(0, 0, 0).sub(J);
    const d = rel.length(), u = rel.clone().normalize();
    const w = new THREE.Vector3().crossVectors(u, new THREE.Vector3(0, 1, 0)).normalize();
    const nrm = new THREE.Vector3().crossVectors(w, u).normalize();
    const ring = [];
    for (let k = 0; k <= 256; k++) { const t = k / 256 * Math.PI * 2; ring.push(J.clone().addScaledVector(u, Math.cos(t) * d).addScaledVector(w, Math.sin(t) * d)); }
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.28, depthWrite: false }));
    planetGroup.add(orbit);
    const oLbl = createLabelSprite('EUROPA ORBIT (NOT TO SCALE)', '#fbbf24');
    oLbl.scale.set(3.6, 0.68, 1);
    oLbl.position.copy(J.clone().addScaledVector(w, d).addScaledVector(nrm, 2.0));
    planetGroup.add(oLbl);
    if (state.planetScienceLayer === 'radiation_env') {
        const Rj = 9.4;
        const mat = new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.42, depthWrite: false });
        const tube = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85, depthWrite: false });
        [0.62, 0.8, 1.0, 1.25].forEach(Lf => {
            const L = d * Lf, lmax = Math.acos(Math.sqrt(Rj / L));
            for (let k = 0; k < 10; k++) {
                const ph = k / 10 * Math.PI * 2;
                const eq = u.clone().multiplyScalar(Math.cos(ph)).addScaledVector(w, Math.sin(ph));
                const pts = [];
                for (let s = 0; s <= 64; s++) {
                    const lam = -lmax + 2 * lmax * s / 64, r = L * Math.cos(lam) * Math.cos(lam);
                    pts.push(J.clone().addScaledVector(eq, r * Math.cos(lam)).addScaledVector(nrm, r * Math.sin(lam)));
                }
                planetGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), (Lf === 1.0 && k === 0) ? tube : mat));
            }
        });
        const rl = createLabelSprite('SIMULATED JOVIAN FIELD LINES', '#f43f5e');
        rl.scale.set(3.6, 0.68, 1);
        rl.position.copy(J.clone().addScaledVector(nrm, 13.5));
        planetGroup.add(rl);
    }
    return true;
}

