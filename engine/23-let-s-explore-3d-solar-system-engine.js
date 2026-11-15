/* A.T.L.A.S · section 16E — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16E. LET'S EXPLORE — 3D SOLAR SYSTEM ENGINE
 *      One scene (solarScene), one camera, rendered from the single
 *      master loop. Bodies are built from BODY_PHYS; surface maps come
 *      from PlanetBaker (procedural reconstructions); the Earth is a
 *      separate instance of the Play Game Earth (buildExplorerRealisticEarth).
 ***********************************************************************/
const AERO_ORIGINAL_RAIL = ['solar_system', 'sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'europa', 'saturn', 'uranus', 'neptune'];
const AERO_MOON_GROUPS = {
    earth: [['moon'], []],
    mars: [['phobos', 'deimos'], []],
    jupiter: [['io', 'europa', 'ganymede', 'callisto'], ['amalthea', 'himalia']],
    saturn: [['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus'], ['janus', 'hyperion', 'phoebe']],
    uranus: [['miranda', 'ariel', 'umbriel', 'titania', 'oberon'], ['puck']],
    neptune: [['triton'], ['proteus', 'nereid']],
    pluto: [['charon'], []]
};
const AERO_HAZE = {
    venus: ['#f3dcaa', 2.4, 0.95, 0.02, 1.035], mars: ['#d9a066', 3.2, 0.55, 0.0, 1.014],
    jupiter: ['#f1e2c8', 4.0, 0.25, 0.0, 1.012], saturn: ['#f2e3c0', 4.0, 0.25, 0.0, 1.012],
    uranus: ['#b4ecf2', 2.6, 0.45, 0.0, 1.02], neptune: ['#6f9bff', 2.6, 0.5, 0.0, 1.02],
    titan: ['#d4903f', 1.2, 0.85, 0.78, 1.07], pluto: ['#a8c8ff', 4.0, 0.35, 0.0, 1.02], triton: ['#cfe0ff', 5.0, 0.18, 0.0, 1.01]
};
const AX = {
    mode: 'cinematic', simDays: aeroDaysSinceJ2000(), daysPerSec: 12, moonClock: 0, time: 0, lastT: 0,
    nodes: {}, sun: null, belts: null, stars: null, view: 'system', focusId: 'solar_system',
    trans: { t: 1, from: null }, logR: Math.log(86), extOpen: {}, catalogOpen: false, layerOpen: false,
    layers: { belts: true, comets: true, prominences: true, moonOrbits: true, venusRadar: false, titanHaze: true },
    flare: { t: -1, dir: null }, built: false, pickList: []
};
const _ax = { v1: null, v2: null, v3: null };
// Orbit-path visibility classes: 'planet' (8 major planets), 'majorMoon' (major moons of those planets), 'minor' (everything else)
function aeroOrbitClass(id) {
    const p = BODY_PHYS[id];
    if (!p) return 'minor';
    if (p.kind === 'planet') return 'planet';
    if (p.kind === 'moon' && p.major && p.parent && BODY_PHYS[p.parent] && BODY_PHYS[p.parent].kind === 'planet') return 'majorMoon';
    return 'minor';
}
const exEntry = id => SOLAR_SYSTEM_DATABASE.find(b => b.id === id);
const exDeg = d => d * Math.PI / 180;

/* ---------------- Catalog registration (DB + facts for the new bodies) ---------------- */
(function aeroRegisterCatalog() {
    const fmt = n => n >= 100 ? Math.round(n).toLocaleString('en-US') : (n >= 10 ? n.toFixed(1) : n.toFixed(2));
    const parentName = id => ({ earth: 'Earth', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' }[id] || id);
    const typeColor = t => /Spacecraft|Mission|Telemetry/.test(t) ? '#34d399' : (/Historical|Discovery|Observation/.test(t) ? '#38bdf8' : (/Uncertain|Debated|Hypothes/.test(t) ? '#a78bfa' : '#f59e0b'));
    Object.keys(EXTRA_BODY_TEXT).forEach(id => {
        if (exEntry(id)) return;
        const t = EXTRA_BODY_TEXT[id], p = BODY_PHYS[id];
        const [name, cls, color, discovered, mass, temp, comp, atmo, geo, status, disc, missions, history, nexi] = t;
        const dia = p.axes ? `${p.axes.map(a => fmt(a * 2)).join(' × ')} km (irregular)` : `${fmt(p.R * 2)} km`;
        const aAU = p.parent ? (AERO_ORBIT_EL[p.parent] || [BODY_PHYS[p.parent].aAU])[0] : p.aAU;
        const Pabs = Math.abs(p.P || 0);
        const period = Pabs > 730 ? `${fmt(Pabs / 365.25)} years` : `${fmt(Pabs)} days`;
        const rot = p.rotH === 'sync' ? 'Synchronous (tidally locked)' : (p.rotH === 0 ? 'Chaotic tumbling (no fixed period)' : `${fmt(Math.abs(p.rotH))} hours${p.rotH < 0 ? ' (retrograde)' : ''}`);
        const distTxt = p.parent ? `≈${aAU.toFixed(2)} AU (with ${parentName(p.parent)}) · ${fmt(p.aKm)} km from ${parentName(p.parent)}` : `${p.aAU} AU (semi-major axis)`;
        SOLAR_SYSTEM_DATABASE.push({
            id, name, classification: cls, icon: 'ph-planet', color, radius3D: p.r3D,
            isMoonOf: p.parent, catalogKind: p.kind, extended: !p.major && p.kind === 'moon',
            diameter: dia, distanceFromSun: distTxt,
            orbitalPeriod: p.parent ? `${period} around ${parentName(p.parent)}${p.P < 0 || (p.incl || 0) > 90 ? ' (retrograde)' : ''}` : period,
            rotationPeriod: rot, age: '≈4.5 billion years (model estimate)',
            surfaceAtmo: `${atmo}. ${geo}.`, discoveries: disc.join(' · '),
            missions: missions.map(m => m[0]).join(', '), nexiQuote: nexi,
            history: history.map(h => ({ date: h[0], title: h[1], type: h[2], color: typeColor(h[2]), desc: h[3] }))
        });
        const nMoons = (AERO_MOON_GROUPS[id] || [[], []]);
        SOLAR_BODY_FACTS[id] = {
            typeShort: cls.length > 26 ? cls.replace(/\s*\(.*\)/, '') : cls,
            dist: p.parent ? `${aAU.toFixed(2)} AU` : `${p.aAU} AU`, orbit: p.parent ? `${period} (${parentName(p.parent)})` : period,
            rot: p.rotH === 'sync' ? 'Synchronous' : (p.rotH === 0 ? 'Chaotic' : `${fmt(Math.abs(p.rotH))} h`),
            status, statusFull: `${status}. Discovered ${discovered}.`,
            mass, massApprox: /≈/.test(mass), tilt: p.tilt !== undefined ? `${p.tilt}°` : (p.rotH === 'sync' ? '≈0° (locked)' : 'Not well constrained'),
            tiltApprox: p.tilt === undefined, temp, tempApprox: true, composition: comp, compositionApprox: /≈/.test(comp),
            atmosphere: atmo, geology: geo,
            moons: p.kind === 'moon' ? 'N/A' : (nMoons[0].length ? `${nMoons[0].length + nMoons[1].length} shown here` : 'None known'),
            moonsApprox: true, rings: AERO_RING_SPECS[id] ? 'Yes' : 'None known',
            discoveries: [`Discovered ${discovered}`].concat(disc),
            missions: missions.map(m => ({ name: m[0], years: m[1], agency: m[2], objective: m[3], result: m[4] }))
        };
        if (p.approxR) SOLAR_BODY_FACTS[id].sizeApprox = true;
    });
})();

/* ---------------- Scale helpers ---------------- */
const AERO_SCI_UNIT_KM = 1e6;            // scientific mode: 1 scene unit = 1 million km
const AERO_AU_UNITS = AU_KM / AERO_SCI_UNIT_KM;
function aeroDispR(id) { const p = BODY_PHYS[id]; return AX.mode === 'scientific' ? p.R / AERO_SCI_UNIT_KM : p.r3D; }
function aeroMoonDist(id) { const p = BODY_PHYS[id]; return AX.mode === 'scientific' ? p.aKm / AERO_SCI_UNIT_KM : p.cin * BODY_PHYS[p.parent].r3D; }
function aeroHelioScene(el, days, phaseDeg, out) {
    const k = aeroKepler(el, days, phaseDeg);
    const rr = AX.mode === 'scientific' ? k.r * AERO_AU_UNITS : auToCin(k.r);
    const s = rr / Math.max(k.r, 1e-9);
    out.set(k.x * s, k.z * s, -k.y * s);
    return k.r;
}
function aeroOrbitPoints(el) {
    const [a, e, iDeg, OmDeg, wbarDeg] = el;
    const pts = [], D = Math.PI / 180, Om = OmDeg * D, w = (wbarDeg - OmDeg) * D, inc = iDeg * D;
    const N = e > 0.5 ? 720 : 256;
    for (let k = 0; k <= N; k++) {
        const E = k / N * Math.PI * 2;
        const xv = a * (Math.cos(E) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
        const v = Math.atan2(yv, xv), r = Math.hypot(xv, yv), u = v + w;
        const x = r * (Math.cos(Om) * Math.cos(u) - Math.sin(Om) * Math.sin(u) * Math.cos(inc));
        const y = r * (Math.sin(Om) * Math.cos(u) + Math.cos(Om) * Math.sin(u) * Math.cos(inc));
        const z = r * Math.sin(u) * Math.sin(inc);
        const rr = AX.mode === 'scientific' ? r * AERO_AU_UNITS : auToCin(r);
        const s = rr / Math.max(r, 1e-9);
        pts.push(new THREE.Vector3(x * s, z * s, -y * s));
    }
    return pts;
}
function aeroDot(color) {
    if (!AX._dotTex) {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
        AX._dotTex = new THREE.CanvasTexture(c);
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: AX._dotTex, color: new THREE.Color(color), sizeAttenuation: false, depthTest: false, transparent: true }));
    s.scale.set(0.011, 0.011, 1);
    s.renderOrder = 5;
    return s;
}
function aeroLabel(text, color) {
    const s = createLabelSprite(text, color);
    s.material.sizeAttenuation = false;
    s.center.set(0.5, -0.25);
    s.scale.set(0.15, 0.028, 1);
    s.renderOrder = 10;
    solarLabelSprites.push(s);
    return s;
}

/* ---------------- Body construction ---------------- */
function aeroBuildSurface(n) {
    const p = n.p, recipe = p.recipe, R = Object.assign({}, AERO_RECIPE_DEFAULTS, AERO_RECIPES[recipe] || {});
    const gas = R.style === 1;
    const geo = p.axes ? aeroIrregularGeometry(n.id, p.axes, p.R, p.kind === 'dwarf' ? 0.015 : (p.kind === 'comet' ? 0.22 : (n.id === 'vesta' || n.id === 'pallas' ? 0.05 : 0.11)))
        : aeroSphere(48);
    const entry = exEntry(n.id);
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(entry ? entry.color : '#888888'), roughness: gas ? 1.0 : (R.roughness || 0.92), metalness: 0.0 });
    n.irregular = !!p.axes;
    n.mesh = new THREE.Mesh(geo, mat);
    n.mesh.userData.bodyId = n.id;
    n.spin.add(n.mesh);
    if (PlanetBaker.available()) {
        n.binding = PlanetBaker.bind(mat, recipe, 'xs', { normal: !gas, onUpgrade: () => { mat.color.set(0xffffff); } });
    } else {
        // Standard quality: light canvas texture, generated lazily (one per frame) to keep start-up smooth
        AX.canvasQueue = AX.canvasQueue || [];
        AX.canvasQueue.push(() => { mat.map = aeroCanvasRecipeTexture(recipe); mat.color.set(0xffffff); mat.needsUpdate = true; });
    }
    n.gas = gas;
}
function aeroBuildBody(id) {
    if (AX.nodes[id]) return AX.nodes[id];
    const p = BODY_PHYS[id], entry = exEntry(id) || { name: id, color: '#94a3b8' };
    const n = { id, p, kind: p.kind, parentId: p.parent || null, angle: 0, phase0: aeroHash(id.length * 13.7 + id.charCodeAt(0) * 3.1 + id.charCodeAt(id.length - 1)) * Math.PI * 2 };
    n.anchor = new THREE.Group(); n.root = new THREE.Group(); n.tilt = new THREE.Group(); n.spin = new THREE.Group();
    n.anchor.add(n.root); n.root.add(n.tilt); n.tilt.add(n.spin);
    n.tilt.rotation.z = exDeg(p.tilt || 0);
    if (p.flat) n.spin.scale.set(1, 1 - p.flat, 1);
    n.anchor.userData.bodyId = id;

    if (id === 'earth') {
        explorerUI.earth = buildExplorerRealisticEarth(1, p.tilt);
        n.root.add(explorerUI.earth.root);
        n.mesh = explorerUI.earth.surface;
        n.earth = explorerUI.earth;
    } else {
        aeroBuildSurface(n);
    }
    // Venus: an upper haze/cloud layer that super-rotates (≈4 days) above the cloud deck
    if (id === 'venus') {
        const m = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 1, metalness: 0, depthWrite: false });
        n.upper = new THREE.Mesh(aeroSphere(48), m);
        n.upper.scale.setScalar(1.012);
        n.tilt.add(n.upper);
        if (PlanetBaker.available()) PlanetBaker.bind(m, 'venus_clouds_upper', 'lo', { alphaOnly: true, normal: false });
        else { const t = aeroCanvasRecipeTexture('venus_clouds_upper'); m.map = t; m.alphaMap = t; }
    }
    if (AERO_HAZE[id]) {
        const h = AERO_HAZE[id];
        n.haze = new THREE.Mesh(aeroSphere(64), aeroHazeMaterial(h[0], h[1], h[2], h[3]));
        n.haze.scale.setScalar(h[4]);
        n.root.add(n.haze);
    }
    if (AERO_RING_SPECS[id]) {
        n.ring = aeroRingMesh(id);
        n.tilt.add(n.ring);
    }
    if (id === 'europa') aeroBuildEuropaInterior(n);
    if (id === 'enceladus') aeroBuildPlumes(n);
    if (p.kind === 'comet') aeroBuildCometTails(n);

    n.label = aeroLabel((entry.name || id).replace(' (Jovian Moon)', '').replace('Earth’s Moon (Luna)', 'Moon').replace('The Sun (Sol)', 'Sun').replace('C/1995 O1 (Hale–Bopp)', 'Hale–Bopp').toUpperCase(), entry.color);
    n.anchor.add(n.label);
    n.marker = aeroDot(entry.color);
    n.anchor.add(n.marker);

    if (n.parentId) {
        const parent = aeroBuildBody(n.parentId);
        n.pivot = new THREE.Group();
        if (!p.inEcliptic) n.pivot.rotation.z = exDeg(BODY_PHYS[n.parentId].tilt || 0);
        n.inner = new THREE.Group();
        n.inner.rotation.x = exDeg(p.incl || 0);
        n.pivot.add(n.inner);
        n.inner.add(n.anchor);
        const pts = [];
        for (let s = 0; s <= 128; s++) { const a = s / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a))); }
        n.orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: new THREE.Color(entry.color).lerp(new THREE.Color(0x1e3a5f), 0.55), transparent: true, opacity: 0.2, depthWrite: false }));
        n.inner.add(n.orbitLine);
        parent.moonHub.add(n.pivot);
        const P = Math.abs(p.P || 1);
        n.dispPeriod = 6 + 7 * Math.log10(1 + P);
        n.dir = (p.P < 0 && !((p.incl || 0) > 90)) ? -1 : 1;
    } else {
        n.el = AERO_ORBIT_EL[id];
        n.orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(aeroOrbitPoints(n.el)),
            new THREE.LineBasicMaterial({ color: new THREE.Color(entry.color).lerp(new THREE.Color(0x0e4a6e), 0.6), transparent: true, opacity: 0.26, depthWrite: false }));
        n.orbitLine.frustumCulled = false;
        solarScene.add(n.orbitLine);
        solarScene.add(n.anchor);
    }
    n.moonHub = new THREE.Group();
    n.anchor.add(n.moonHub);
    n.orbitClass = aeroOrbitClass(id);
    n.orbitLine.visible = solarShowOrbits && n.orbitClass !== 'minor';
    solarOrbitLines.push({ line: n.orbitLine, bodyData: entry, node: n });
    AX.nodes[id] = n;
    aeroApplyScale(n);
    solarBodiesMap[id] = { data: entry, group: n.anchor, mesh: n.mesh, angle: 0, node: n };
    return n;
}
function aeroApplyScale(n) {
    const r = aeroDispR(n.id);
    n.dispR = r;
    n.root.scale.setScalar(r);
    if (n.label) n.label.position.set(0, r * 1.05, 0);
    if (n.parentId) n.orbitLine.scale.setScalar(aeroMoonDist(n.id));
    else if (n.el) { n.orbitLine.geometry.dispose(); n.orbitLine.geometry = new THREE.BufferGeometry().setFromPoints(aeroOrbitPoints(n.el)); }
    if (n.tails) n.tailScale = AX.mode === 'scientific' ? AERO_AU_UNITS * 0.6 : 6.0;
}
function ensureMoonSystem(parentId, extended) {
    const g = AERO_MOON_GROUPS[parentId];
    if (!g || !solarScene) return;
    aeroBuildBody(parentId);
    g[0].forEach(aeroBuildBody);
    if (extended) g[1].forEach(aeroBuildBody);
}
function aeroBuildEuropaInterior(n) {
    const grp = new THREE.Group();
    grp.visible = false;
    const mk = (r, c, e, rough, metal) => { const m = new THREE.Mesh(aeroSphere(48), new THREE.MeshStandardMaterial({ color: c, emissive: e || 0x000000, emissiveIntensity: e ? 0.35 : 0, roughness: rough, metalness: metal || 0 })); m.scale.setScalar(r); return m; };
    // Educational cross-section (layer thicknesses illustrative): ice shell → liquid-water ocean → rocky mantle → metallic core
    grp.add(mk(0.93, 0x0e6fb0, 0x075985, 0.25), mk(0.72, 0x6b5e52, 0, 0.9), mk(0.36, 0xb7791f, 0x7c2d12, 0.5, 0.7));
    n.spin.add(grp);
    n.interior = grp;
    n.cutGeo = new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 1.52, 0, Math.PI);
}
function aeroBuildPlumes(n) {
    const N = 360, pos = new Float32Array(N * 3), seeds = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { seeds[i * 3] = Math.random(); seeds[i * 3 + 1] = Math.random() * Math.PI * 2; seeds[i * 3 + 2] = Math.floor(Math.random() * 4); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdbeafe, size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    n.spin.add(pts);
    n.plumes = { pts, seeds, N };
}
function aeroUpdatePlumes(n, t) {
    const P = n.plumes, a = P.pts.geometry.attributes.position;
    // "Tiger stripe" source longitudes near the south pole (illustrative positions)
    for (let i = 0; i < P.N; i++) {
        const s = P.seeds, h = ((t * 0.18 + s[i * 3]) % 1);
        const src = s[i * 3 + 2] * 0.5 - 0.75, spread = 0.06 + h * 0.55;
        const x = Math.sin(src) * 0.18 + Math.cos(s[i * 3 + 1]) * spread;
        const z = Math.cos(src) * 0.10 + Math.sin(s[i * 3 + 1]) * spread;
        a.setXYZ(i, x, -1.0 - h * 1.6, z);
    }
    a.needsUpdate = true;
    P.pts.material.opacity = 0.5;
}
function aeroBuildCometTails(n) {
    const mk = (N, color, size) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
        const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
        p.frustumCulled = false;
        return p;
    };
    n.tails = { ion: mk(420, 0x7fb4ff, 1.6), dust: mk(520, 0xfff1cf, 2.0), seeds: Array.from({ length: 520 }, () => [Math.random(), Math.random() * 2 - 1, Math.random() * 2 - 1]) };
    n.anchor.add(n.tails.ion, n.tails.dust);
    const cm = new THREE.SpriteMaterial({ map: aeroDotTex(), color: 0xdff1ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false });
    n.coma = new THREE.Sprite(cm);
    n.coma.scale.set(0.03, 0.03, 1);
    n.anchor.add(n.coma);
}
function aeroDotTex() { aeroDot('#ffffff'); return AX._dotTex; }
const _comV = { prev: null, vel: null, anti: null, tmp: null };
function aeroUpdateComet(n, rAU) {
    const T = n.tails;
    // Activity rises steeply inside ~5 AU (illustrative brightness model, not photometry)
    const act = AX.layers.comets ? Math.max(0, Math.min(1.4, Math.pow(3.2 / Math.max(rAU, 0.3), 2) - 0.35)) : 0;
    T.ion.visible = T.dust.visible = n.coma.visible = act > 0.01;
    if (!T.ion.visible) return;
    if (!_comV.prev) { _comV.prev = new THREE.Vector3(); _comV.vel = new THREE.Vector3(); _comV.anti = new THREE.Vector3(); _comV.tmp = new THREE.Vector3(); }
    aeroHelioScene(n.el, AX.simDays - 2, 0, _comV.prev);
    _comV.vel.copy(n.anchor.position).sub(_comV.prev).normalize();
    _comV.anti.copy(n.anchor.position).normalize();
    const L = n.tailScale * Math.min(1, act);
    const ia = T.ion.geometry.attributes.position, da = T.dust.geometry.attributes.position;
    for (let i = 0; i < 520; i++) {
        const s = T.seeds[i], u = s[0];
        if (i < 420) {
            const w = 0.012 * L * u;
            ia.setXYZ(i, _comV.anti.x * L * u * 1.2 + s[1] * w, _comV.anti.y * L * u * 1.2 + s[2] * w, _comV.anti.z * L * u * 1.2 + (s[1] - s[2]) * w * 0.5);
        }
        const w2 = 0.05 * L * u, c = 0.35 * L * u * u;
        da.setXYZ(i, _comV.anti.x * L * u * 0.8 - _comV.vel.x * c + s[1] * w2, _comV.anti.y * L * u * 0.8 - _comV.vel.y * c + s[2] * w2, _comV.anti.z * L * u * 0.8 - _comV.vel.z * c + (s[1] + s[2]) * w2 * 0.5);
    }
    ia.needsUpdate = da.needsUpdate = true;
    T.ion.material.opacity = 0.55 * Math.min(1, act);
    T.dust.material.opacity = 0.45 * Math.min(1, act);
    n.coma.material.opacity = 0.7 * Math.min(1, act);
    const cs = 0.012 + 0.03 * Math.min(1, act);
    n.coma.scale.set(cs, cs, 1);
}

/* ---------------- The Sun ---------------- */
function aeroBuildSun() {
    const entry = exEntry('sun');
    const s = { id: 'sun', p: BODY_PHYS.sun, kind: 'star' };
    s.anchor = new THREE.Group(); s.root = new THREE.Group(); s.spin = new THREE.Group();
    s.anchor.add(s.root); s.root.add(s.spin);
    s.root.rotation.z = exDeg(7.25);
    if (!AERO_SAFE && threeRenderer && !webglFallbackMode) {   // light shader: on in standard quality too
        s.mat = aeroShaderMaterial('sunVertex', 'sunFragment', { uTime: { value: 0 }, uFlare: { value: new THREE.Vector4(0, 0, 1, 0) } });
        s.glowMat = aeroShaderMaterial('glowVertex', 'glowFragment', {
            uCenter: { value: new THREE.Vector3() }, uCore: { value: 1 }, uTime: { value: 0 }, uCorona: { value: 1.5 }, uChromo: { value: 1 }
        }, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
    } else {
        s.mat = new THREE.MeshBasicMaterial({ map: getSolarBodyProceduralTexture('sun') });
    }
    s.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), s.mat);
    s.mesh.userData.bodyId = 'sun';
    s.spin.add(s.mesh);
    if (s.glowMat) {
        s.glow = new THREE.Mesh(new THREE.SphereGeometry(3.0, 48, 24), s.glowMat);
        s.root.add(s.glow);
    }
    // Prominences: magnetic loops of plasma at the limb (illustrative placement)
    s.proms = new THREE.Group();
    const D = Math.PI / 180;
    [[18, 30, 0.10], [-24, 150, 0.14], [8, 250, 0.08], [-12, 320, 0.11], [32, 200, 0.07], [-35, 80, 0.09]].forEach(([lat, lon, h], k) => {
        const dir = (la, lo) => new THREE.Vector3(Math.cos(la * D) * Math.cos(lo * D), Math.sin(la * D), -Math.cos(la * D) * Math.sin(lo * D));
        const a = dir(lat, lon - 3), b = dir(lat + 1.5, lon + 3), mid = a.clone().add(b).normalize().multiplyScalar(1 + h * 1.6);
        const curve = new THREE.QuadraticBezierCurve3(a.multiplyScalar(0.995), mid, b.multiplyScalar(0.995));
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.010 + h * 0.06, 8, false),
            new THREE.MeshBasicMaterial({ color: 0xff5b3a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.userData.phase = k * 1.7;
        s.proms.add(m);
    });
    s.spin.add(s.proms);
    s.label = aeroLabel('THE SUN', entry.color);
    s.anchor.add(s.label);
    solarScene.add(s.anchor);
    AX.sun = s;
    AX.nodes.sun = s;
    s.apply = () => { s.dispR = aeroDispR('sun'); s.root.scale.setScalar(s.dispR); s.label.position.set(0, s.dispR * 1.05, 0); };
    s.apply();
    solarBodiesMap.sun = { data: entry, group: s.anchor, mesh: s.mesh, angle: 0, node: s };
}
function triggerSolarFlare() {
    SoundFX.click();
    if (!AX.sun || !AX.sun.mat.uniforms) { noteExplorer('Solar flares need WebGL — not available in the 2D fallback view.'); return; }
    const th = Math.random() * Math.PI * 2, la = (Math.random() * 30 - 15) * Math.PI / 180;
    AX.flare = { t: 0, dir: new THREE.Vector3(Math.cos(la) * Math.cos(th), Math.sin(la) * 0.6 + 0.2, Math.cos(la) * Math.sin(th)).normalize() };
    noteExplorer('Illustrative solar flare: a sudden brightening in an active region. Real flares are seen in X-ray/UV by SDO and GOES; this animation is not live solar data.');
}

/* ---------------- Belts & stars ---------------- */
function aeroBuildBelts() {
    if (!PlanetBaker.available()) return;
    const D = Math.PI / 180, list = [];
    const rnd = Math.random;
    const add = (a, e, i, node, M0, w, col) => list.push([a, e, i * D, node * D, M0 * D, w * D, col]);
    // Main belt (2.1–3.3 AU) with Kirkwood gaps at the 3:1, 5:2, 7:3 and 2:1 resonances with Jupiter
    const gaps = [[2.50, 0.035], [2.82, 0.03], [2.95, 0.02], [3.27, 0.04]];
    let k = 0;
    while (k < 5200) {
        const a = 2.1 + Math.pow(rnd(), 0.9) * 1.25;
        if (gaps.some(([g, w]) => Math.abs(a - g) < w)) continue;
        const c = 0.42 + rnd() * 0.25;
        add(a, rnd() * 0.22, Math.abs((rnd() + rnd() + rnd() - 1.5) * 13), rnd() * 360, rnd() * 360, rnd() * 360, [c, c * 0.93, c * 0.84]);
        k++;
    }
    // Jupiter trojans around L4/L5 (±60° from Jupiter's mean longitude)
    const LJ = 34.40 + 0.0830853 * AX.simDays * 0;
    for (let j = 0; j < 900; j++) {
        const node = rnd() * 360, w = rnd() * 360, L = LJ + (j % 2 ? 60 : -60) + (rnd() - 0.5) * 32;
        const c = 0.36 + rnd() * 0.18;
        add(5.2 + (rnd() - 0.5) * 0.15, rnd() * 0.08, rnd() * 25, node, L - node - w, w, [c * 1.05, c * 0.9, c * 0.8]);
    }
    // Kuiper Belt: plutinos (3:2 with Neptune), cold classical belt, scattered disc
    for (let j = 0; j < 4200; j++) {
        const t = rnd(); let a, e, i;
        if (t < 0.22) { a = 39.4 + (rnd() - 0.5) * 0.6; e = 0.1 + rnd() * 0.2; i = rnd() * 20; }
        else if (t < 0.8) { a = 42 + rnd() * 5.5; e = rnd() * 0.1; i = rnd() * 5; }
        else { a = 50 + rnd() * 60; e = 0.3 + rnd() * 0.35; i = rnd() * 30; }
        const c = 0.42 + rnd() * 0.2;
        add(a, e, i, rnd() * 360, rnd() * 360, rnd() * 360, [c * 1.08, c * 0.9, c * 0.82]);
    }
    const N = list.length;
    const orb = new Float32Array(N * 4), ph = new Float32Array(N * 2), col = new Float32Array(N * 3);
    list.forEach((b, q) => { orb.set([b[0], b[1], b[2], b[3]], q * 4); ph.set([b[4], b[5]], q * 2); col.set(b[6], q * 3); });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aOrbit', new THREE.BufferAttribute(orb, 4));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 2));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.ShaderMaterial({
        vertexShader: AERO_GLSL.beltVertex, fragmentShader: AERO_GLSL.beltFragment,
        uniforms: { uDays: { value: 0 }, uScientific: { value: 0 }, uAuUnits: { value: AERO_AU_UNITS }, uSize: { value: 1.0 }, uPixelRatio: { value: threeRenderer.getPixelRatio() }, uOpacity: { value: 0.8 } },
        transparent: true, depthWrite: false
    });
    AX.belts = new THREE.Points(g, mat);
    AX.belts.frustumCulled = false;
    solarScene.add(AX.belts);
}
function aeroBuildStars() {
    const N = 7000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    // Galactic plane: tilted ~60° to the ecliptic; ~35% of stars concentrated toward it
    const gp = new THREE.Vector3(0.0, Math.cos(exDeg(60)), Math.sin(exDeg(60)));
    const v = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
        v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
        if (i % 3 === 0) { const d = v.dot(gp); v.addScaledVector(gp, -d * 0.86).normalize(); }
        pos.set([v.x, v.y, v.z], i * 3);
        const t = Math.random(), b = 0.35 + Math.pow(Math.random(), 3) * 0.65;
        const c = t < 0.12 ? [0.7, 0.8, 1.0] : (t < 0.75 ? [1.0, 0.98, 0.94] : (t < 0.93 ? [1.0, 0.86, 0.66] : [1.0, 0.7, 0.55]));
        col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    AX.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    AX.stars.frustumCulled = false;
    AX.stars.renderOrder = -10;
    solarScene.add(AX.stars);
}

/* ---------------- Scene initialisation ---------------- */
function initSolarSystemExplorerScene() {
    if (solarScene) return;
    solarScene = new THREE.Scene();
    solarCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 4000);
    _ax.v1 = new THREE.Vector3(); _ax.v2 = new THREE.Vector3(); _ax.v3 = new THREE.Vector3();
    AX.trans.from = new THREE.Vector3();
    // Same light colours and intensities as the Play Game scene, so the explorer Earth instance is lit identically.
    solarScene.add(new THREE.HemisphereLight(0xdbeafe, 0x030712, 0.38));
    const sunLight = new THREE.PointLight(0xfffbeb, 2.05, 0, 0);
    solarScene.add(sunLight);
    AX.lastT = performance.now();
    PlanetBaker.init();
    try { aeroBuildStars(); } catch (err) { aeroReportError('build stars', err); }
    try { aeroBuildSun(); } catch (err) { aeroReportError('build sun', err); }
    Object.keys(BODY_PHYS).forEach(id => { const p = BODY_PHYS[id]; if (!p.parent && id !== 'sun') { try { aeroBuildBody(id); } catch (err) { aeroReportError('build ' + id, err); } } });
    try { ensureMoonSystem('earth'); ensureMoonSystem('jupiter'); } catch (err) { aeroReportError('build moons', err); }
    if (!AERO_SAFE) { try { aeroBuildBelts(); } catch (err) { aeroReportError('build belts', err); } }
    AX.built = true;
    aeroUpdatePositions();

    // Pointer interaction on the full-screen menu stage mount (rotate · pan · zoom · click-select)
    const mount = document.getElementById('solarSystemCanvasMount');
    if (mount) {
        mount.addEventListener('contextmenu', e => e.preventDefault());
        mount.addEventListener('mousedown', e => {
            solarIsDragging = true; solarIsPanning = (e.button === 2 || e.shiftKey); solarDragMoved = false;
            solarPrevMouse = { x: e.clientX, y: e.clientY };
        });
        mount.addEventListener('wheel', e => { e.preventDefault(); aeroZoomBy(e.deltaY); }, { passive: false });
    }
    window.addEventListener('mouseup', e => {
        if (solarIsDragging && !solarDragMoved && !solarIsPanning && appExperienceMode === 'explore') handleSolarSystemCanvasClick(e);
        solarIsDragging = false; solarIsPanning = false;
    });
    window.addEventListener('mousemove', e => {
        if (!solarIsDragging) return;
        const dx = e.clientX - solarPrevMouse.x, dy = e.clientY - solarPrevMouse.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) solarDragMoved = true;
        solarPrevMouse = { x: e.clientX, y: e.clientY };
        if (solarIsPanning || e.shiftKey) {
            const panScale = solarCamSpherical.radius * 0.0013;
            solarPanOffset.x -= dx * panScale * Math.cos(solarTargetSpherical.theta);
            solarPanOffset.z += dx * panScale * Math.sin(solarTargetSpherical.theta);
            solarPanOffset.y += dy * panScale;
        } else {
            solarTargetSpherical.theta -= dx * 0.0075;
            solarTargetSpherical.phi = Math.max(0.12, Math.min(Math.PI - 0.12, solarTargetSpherical.phi - dy * 0.0075));
        }
        if (solarDragMoved && appExperienceMode === 'explore') explorerUI.cameraLabel = solarIsPanning ? 'Free pan' : 'Free orbit (user)';
    });
}
function aeroZoomBy(deltaY) {
    const f = Math.exp(Math.max(-60, Math.min(60, deltaY)) * 0.0028);
    solarTargetSpherical.radius = aeroClampRadius(solarTargetSpherical.radius * f);
    explorerUI.cameraLabel = 'Free zoom';
}
function aeroClampRadius(r) {
    const n = AX.nodes[AX.focusId];
    const min = (AX.view === 'system' || !n) ? (AX.mode === 'scientific' ? 0.5 : 2) : n.dispR * 1.12;
    const max = AX.mode === 'scientific' ? 90000 : 700;
    return Math.max(min, Math.min(max, r));
}

/* ---------------- Per-frame updates ---------------- */
function aeroUpdatePositions() {
    const days = AX.simDays;
    Object.values(AX.nodes).forEach(n => {
        if (n.kind === 'star') return;
        if (n.parentId) {
            n.angle = n.phase0 + n.dir * Math.PI * 2 * AX.moonClock / n.dispPeriod;
            const d = aeroMoonDist(n.id);
            n.anchor.position.set(Math.cos(n.angle) * d, 0, -Math.sin(n.angle) * d);
        } else if (n.el) {
            n.rAU = aeroHelioScene(n.el, days, n.phase0 * 57.29578, n.anchor.position);
        }
    });
}
function aeroSpinRate(rotH) { // rad per second of display time (separate from orbital motion)
    if (!rotH) return 0;
    return Math.sign(rotH) * Math.PI * 2 / (8 * Math.pow(Math.abs(rotH) / 24, 0.35));
}
function aeroUpdateSpins(dt) {
    Object.values(AX.nodes).forEach(n => {
        const p = n.p;
        if (n.kind === 'star') { n.spin.rotation.y += aeroSpinRate(p.rotH) * dt; return; }
        if (n.earth) { n.earth.surface.rotation.y += aeroSpinRate(p.rotH) * dt; return; }
        if (p.rotH === 'sync') n.spin.rotation.y = n.angle + Math.PI;
        else if (p.rotH === 0) { n.spin.rotation.y += 0.21 * dt; n.spin.rotation.x += 0.13 * dt; }
        else n.spin.rotation.y += aeroSpinRate(p.rotH) * dt;
        if (n.upper) n.upper.rotation.y -= 0.35 * dt; // Venus cloud-top super-rotation (retrograde, display-compressed)
    });
}
function aeroFocusPoint(out) {
    const n = AX.nodes[AX.focusId];
    out.set(0, 0, 0);
    if (appExperienceMode === 'menu') return out;
    if (AX.view === 'system' || AX.view === 'belt' || AX.view === 'kuiper' || !n) return out;
    if (AX.view === 'orbit') {
        if (n.parentId) AX.nodes[n.parentId].anchor.getWorldPosition(out);
        return out;
    }
    if (AX.view === 'pair' && n.parentId) {
        AX.nodes[n.parentId].anchor.getWorldPosition(out);
        n.anchor.getWorldPosition(_ax.v3);
        return out.add(_ax.v3).multiplyScalar(0.5);
    }
    return n.anchor.getWorldPosition(out);
}
function aeroViewRadius(view, id) {
    const n = AX.nodes[id], sci = AX.mode === 'scientific';
    if (view === 'system') return sci ? 11500 : 120;
    if (view === 'belt') return sci ? 1300 : 78;
    if (view === 'kuiper') return sci ? 17000 : 175;
    if (!n) return sci ? 11500 : 120;
    const R = n.dispR, ringed = !!n.ring && n.id === 'saturn';
    if (view === 'close') return R * (ringed ? 3.3 : 2.25);
    if (view === 'orbit') {
        if (n.parentId) return aeroMoonDist(n.id) * 2.7;
        if (n.el) { const a = n.el[0] * (1 + n.el[1]); return (sci ? a * AERO_AU_UNITS : auToCin(a)) * 2.5; }
        return R * 10;
    }
    if (view === 'pair' && n.parentId) return Math.max(aeroMoonDist(n.id) * 1.9, AX.nodes[n.parentId].dispR * 5);
    if (view === 'moons') {
        const g = AERO_MOON_GROUPS[id];
        if (g) {
            const ids = g[0].concat(AX.extOpen[id] ? g[1] : []);
            const maxD = Math.max(...ids.map(m => aeroMoonDist(m)));
            return Math.max(maxD * 2.3, R * 6);
        }
    }
    return R * (ringed ? 6.2 : 4.4);
}
function aeroSetView(view, opts) {
    AX.view = view;
    AX.trans.t = 0;
    AX.trans.from.copy(solarLookAtCurrent);
    solarPanOffset.set(0, 0, 0);
    solarTargetSpherical.radius = aeroClampRadius(aeroViewRadius(view, AX.focusId));
    solarTargetSpherical.phi = (opts && opts.phi) || ({ system: 1.08, orbit: 0.62, belt: 0.95, kuiper: 1.0, close: 1.32, moons: 1.15, pair: 1.2 }[view] || 1.22);
    const labels = { system: 'System overview', body: 'Focus orbit', close: 'Close-up', orbit: 'Orbital view', pair: 'Parent + moon', moons: 'Moon system', belt: 'Asteroid Belt', kuiper: 'Kuiper Belt' };
    explorerUI.cameraLabel = labels[view] || 'Focus orbit';
    renderExplorerCameraButtons();
}
function aeroUpdateCamera(dt) {
    aeroFocusPoint(solarLookAtTarget);
    solarLookAtTarget.add(solarPanOffset);
    if (AX.trans.t < 1) {
        AX.trans.t = Math.min(1, AX.trans.t + dt / 1.1);
        const k = AX.trans.t * AX.trans.t * (3 - 2 * AX.trans.t);
        solarLookAtCurrent.copy(AX.trans.from).lerp(solarLookAtTarget, k);
    } else {
        solarLookAtCurrent.copy(solarLookAtTarget);
    }
    const kz = 1 - Math.exp(-dt * 4.2);
    const lr = Math.log(Math.max(1e-6, solarCamSpherical.radius)), lt = Math.log(Math.max(1e-6, solarTargetSpherical.radius));
    solarCamSpherical.radius = Math.exp(lr + (lt - lr) * kz);
    solarCamSpherical.theta += (solarTargetSpherical.theta - solarCamSpherical.theta) * Math.min(1, kz * 1.3);
    solarCamSpherical.phi += (solarTargetSpherical.phi - solarCamSpherical.phi) * Math.min(1, kz * 1.3);
    const r = solarCamSpherical.radius;
    solarCamera.position.set(
        solarLookAtCurrent.x + r * Math.sin(solarCamSpherical.phi) * Math.sin(solarCamSpherical.theta),
        solarLookAtCurrent.y + r * Math.cos(solarCamSpherical.phi),
        solarLookAtCurrent.z + r * Math.sin(solarCamSpherical.phi) * Math.cos(solarCamSpherical.theta));
    solarCamera.lookAt(solarLookAtCurrent);
}
// LOD, texture tiers, label/marker/moon-system visibility, dynamic near/far planes
function aeroUpdateVisibility() {
    const cam = solarCamera.position;
    const H = (threeRenderer && threeRenderer.domElement.clientHeight) || window.innerHeight;
    const pxPerRad = (H / 2) / Math.tan(exDeg(solarCamera.fov) / 2);
    let nearest = Infinity;
    const sel = AX.nodes[solarSelectedBodyId], selSys = sel ? (sel.parentId || sel.id) : null;
    AX.pickList.length = 0;
    Object.values(AX.nodes).forEach(n => {
        n.anchor.getWorldPosition(_ax.v1);
        const dist = Math.max(1e-9, _ax.v1.distanceTo(cam));
        n.pixR = n.dispR / dist * pxPerRad;
        nearest = Math.min(nearest, dist - n.dispR * (n.ring ? 2.5 : 1.1));
        n.camDist = dist;
        if (n.kind === 'star') return;
        // Moon systems: shown when their planet is in focus or close enough to resolve the moons
        if (n.moonHub && AERO_MOON_GROUPS[n.id]) {
            const g = AERO_MOON_GROUPS[n.id], firstD = aeroMoonDist(g[0][0]);
            const sysPx = firstD / dist * pxPerRad;
            n.moonHub.visible = selSys === n.id || sysPx > 18;
            if (n.moonHub.visible && !n.moonsBuilt) { ensureMoonSystem(n.id, AX.extOpen[n.id]); n.moonsBuilt = true; }
        }
        if (!n.mesh) return;
        if (!n.irregular && !n.earth && n.mesh.geometry !== n.cutGeo) {
            const seg = n.pixR > 320 ? 160 : (n.pixR > 110 ? 96 : (n.pixR > 25 ? 48 : 24));
            const g = aeroSphere(seg);
            if (n.mesh.geometry !== g) n.mesh.geometry = g;
        }
        if (n.binding) PlanetBaker.setWant(n.binding, n.pixR > 230 ? 'hi' : (n.pixR > 48 ? 'lo' : 'xs'));
        const isMoon = !!n.parentId;
        const sysVisible = !isMoon || (AX.nodes[n.parentId] && AX.nodes[n.parentId].moonHub.visible);
        n.label.visible = solarShowLabels && sysVisible && (!isMoon || selSys === n.parentId || n.id === solarSelectedBodyId);
        n.marker.visible = sysVisible && n.pixR < 2.2;
        // Path graphics only: positions/motion are computed for every body regardless of this rule.
        if (n.orbitLine) n.orbitLine.visible = solarShowOrbits && (n.orbitClass === 'planet' || (n.orbitClass === 'majorMoon' && AX.layers.moonOrbits && sysVisible));
        if (sysVisible && n.anchor.visible !== false) AX.pickList.push(n);
    });
    if (AX.sun) { AX.pickList.push(AX.sun); AX.sun.label.visible = solarShowLabels; }
    const near = Math.min(AX.mode === 'scientific' ? 5 : 0.5, Math.max(AX.mode === 'scientific' ? 1e-5 : 0.004, nearest * 0.3));
    const far = AX.mode === 'scientific' ? 3.0e5 : 5000;
    if (Math.abs(near - solarCamera.near) / solarCamera.near > 0.08 || solarCamera.far !== far) {
        solarCamera.near = near; solarCamera.far = far; solarCamera.updateProjectionMatrix();
    }
}
function aeroUpdateFx(dt) {
    const s = AX.sun;
    if (s && s.mat.uniforms) {
        s.mat.uniforms.uTime.value = AX.time;
        if (s.glowMat) { s.glowMat.uniforms.uTime.value = AX.time; s.glowMat.uniforms.uCore.value = s.dispR; }
        if (AX.flare.t >= 0) {
            AX.flare.t += dt;
            const k = AX.flare.t < 0.6 ? AX.flare.t / 0.6 : Math.max(0, 1 - (AX.flare.t - 0.6) / 3.2);
            s.mat.uniforms.uFlare.value.set(AX.flare.dir.x, AX.flare.dir.y, AX.flare.dir.z, k);
            if (k <= 0 && AX.flare.t > 1) AX.flare.t = -1;
        }
    }
    if (s) {
        s.proms.visible = AX.layers.prominences;
        s.proms.children.forEach(m => { m.material.opacity = 0.38 + 0.2 * Math.sin(AX.time * 0.7 + m.userData.phase); });
    }
    Object.values(AX.nodes).forEach(n => {
        if (n.kind === 'star') return;
        if (n.haze) n.haze.material.uniforms.uSunPos.value.set(0, 0, 0);
        if (n.ring && n.ring.visible) {
            const u = n.ring.material.uniforms;
            n.anchor.getWorldPosition(u.uPlanetCenter.value);
            u.uPlanetRadius.value = n.dispR * (n.p.flat ? 1 - n.p.flat * 0.5 : 1);
            u.uSunPos.value.set(0, 0, 0);
        }
        if (n.plumes && AX.nodes[n.parentId].moonHub.visible) aeroUpdatePlumes(n, AX.time);
        if (n.tails) aeroUpdateComet(n, n.rAU || 99);
    });
    if (AX.belts) {
        AX.belts.visible = AX.layers.belts;
        const u = AX.belts.material.uniforms;
        u.uDays.value = AX.simDays; u.uScientific.value = AX.mode === 'scientific' ? 1 : 0;
        u.uSize.value = AX.mode === 'scientific' ? 260 : 1.0;
    }
    if (AX.stars) { AX.stars.position.copy(solarCamera.position); AX.stars.scale.setScalar(solarCamera.far * 0.8); }
}

function updateAndRenderSolarSystemExplorer() {
    if (!solarScene || !solarCamera) return;
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - (AX.lastT || now)) / 1000));
    AX.lastT = now;
    AX.time += dt;
    const run = solarOrbitsPaused ? 0 : solarOrbitSpeedMult;
    AX.simDays += dt * AX.daysPerSec * run;
    AX.moonClock += dt * run;
    if (appExperienceMode === 'menu') solarTargetSpherical.theta += 0.0008;

    if (threeRenderer && !webglFallbackMode) {
        // Quality governor: if frames stay slow, render the explorer/menu at 1× pixel ratio (restored for Play Game)
        const ms = dt * 1000;
        AX.ema = AX.ema ? AX.ema * 0.95 + ms * 0.05 : ms;
        if (!AX.lowRes && AX.time > 4 && AX.ema > 34 && threeRenderer.getPixelRatio() > 1) {
            AX.lowRes = true; AX.savedPR = threeRenderer.getPixelRatio();
            threeRenderer.setPixelRatio(1); resizeSolarSystemViewport();
        }
        try {
            aeroUpdatePositions();
            aeroUpdateSpins(dt);
            explorerEarthFrameSync();
            aeroUpdateCamera(dt);
            aeroUpdateVisibility();
            if (!AERO_SAFE) aeroUpdateFx(dt);
        } catch (err) { aeroReportError('explorer update', err); }
        try { threeRenderer.render(solarScene, solarCamera); } catch (err) { aeroReportError('explorer render', err); }
    } else if (fallbackCtx2D && fallbackCanvas2D) {
        aeroDrawFallback2D();
    }
}

// 2D fallback (no WebGL): heliocentric map using the same orbital elements and the cinematic distance mapping
function aeroDrawFallback2D() {
    const ctx = fallbackCtx2D, w = fallbackCanvas2D.width || window.innerWidth, h = fallbackCanvas2D.height || window.innerHeight;
    ctx.fillStyle = '#02050B'; ctx.fillRect(0, 0, w, h);
    const ox = w * 0.5, oy = h * 0.5, sc = Math.min(w, h) / 2 / 82;
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(ox, oy, 7, 0, Math.PI * 2); ctx.fill();
    AX.fallbackPick = [];
    Object.keys(AERO_ORBIT_EL).forEach(id => {
        const el = AERO_ORBIT_EL[id], b = exEntry(id);
        if (!b) return;
        if (solarShowOrbits && aeroOrbitClass(id) === 'planet') {
            ctx.strokeStyle = 'rgba(56,189,248,0.18)'; ctx.beginPath();
            for (let k = 0; k <= 96; k++) {
                const E = k / 96 * Math.PI * 2, a = el[0], e = el[1];
                const xv = a * (Math.cos(E) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(E), r = Math.hypot(xv, yv), ang = Math.atan2(yv, xv) + exDeg(el[4]);
                const rr = auToCin(r) * sc, X = ox + Math.cos(ang) * rr, Y = oy - Math.sin(ang) * rr * 0.62;
                k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
            }
            ctx.stroke();
        }
        const k = aeroKepler(el, AX.simDays, 0), rr = auToCin(k.r) * sc, ang = Math.atan2(k.y, k.x);
        const X = ox + Math.cos(ang) * rr, Y = oy - Math.sin(ang) * rr * 0.62;
        ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(X, Y, Math.max(2.5, (BODY_PHYS[id].r3D || 0.3) * 3.2), 0, Math.PI * 2); ctx.fill();
        AX.fallbackPick.push([id, X, Y]);
        if (solarShowLabels && BODY_PHYS[id].kind !== 'asteroid') { ctx.fillStyle = '#cbd5e1'; ctx.font = '10px monospace'; ctx.fillText(shortBodyName(b), X + 6, Y - 6); }
    });
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px monospace';
    ctx.fillText('2D fallback (WebGL unavailable) · heliocentric positions from orbital elements · distances not to scale', 12, h - 12);
}

/* ---------------- Picking (screen space; works for tiny bodies in scientific scale) ---------------- */
function handleSolarSystemCanvasClick(e) {
    const el = (threeRenderer && threeRenderer.domElement) || fallbackCanvas2D;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (webglFallbackMode || !threeRenderer) {
        let best = null, bd = 16;
        (AX.fallbackPick || []).forEach(([id, X, Y]) => { const d = Math.hypot(X - mx, Y - my); if (d < bd) { bd = d; best = id; } });
        if (best) selectSolarBody(best);
        return;
    }
    if (!solarCamera) return;
    let best = null, bestScore = Infinity;
    AX.pickList.forEach(n => {
        n.anchor.getWorldPosition(_ax.v1);
        _ax.v2.copy(_ax.v1).project(solarCamera);
        if (_ax.v2.z > 1 || _ax.v2.z < -1) return;
        const sx = (_ax.v2.x * 0.5 + 0.5) * rect.width, sy = (-_ax.v2.y * 0.5 + 0.5) * rect.height;
        const d = Math.hypot(sx - mx, sy - my), hit = Math.max(13, (n.pixR || 0) * 1.02);
        if (d <= hit) {
            const score = (n.pixR > 13 ? 0 : d) + n.camDist * 1e-6;
            if (score < bestScore) { bestScore = score; best = n.id; }
        }
    });
    if (best && exEntry(best)) selectSolarBody(best);
}

/* ---------------- Selection & camera views ---------------- */
function selectSolarBody(bodyId) {
    SoundFX.click();
    if (bodyId !== 'solar_system' && !exEntry(bodyId)) bodyId = 'solar_system';
    solarSelectedBodyId = bodyId;
    timelineCurrentIndex = 0;
    const p = BODY_PHYS[bodyId];
    if (p && p.parent && solarScene) { ensureMoonSystem(p.parent, !p.major); if (!p.major) AX.extOpen[p.parent] = true; }
    if (p && AERO_MOON_GROUPS[bodyId] && solarScene) ensureMoonSystem(bodyId, AX.extOpen[bodyId]);
    AX.focusId = bodyId;
    if (solarScene) aeroSetView(bodyId === 'solar_system' ? 'system' : 'body');
    const entry = exEntry(bodyId) || SOLAR_SYSTEM_DATABASE[0];
    if (entry.nexiQuote) { nexiState.lastCustomAnswer = entry.nexiQuote; updateNexiContextualGuidance(); }
    renderSolarBodyList();
    renderSolarDossierPanel(entry);
    renderHistoryTimelineForBody(entry);
    renderExplorerMoonStrip();
    if (AX.catalogOpen) renderExplorerCatalog();
    refreshExplorerStatusPanel();
}
function zoomCloseToSelectedSolarBody() {
    SoundFX.click();
    if (solarSelectedBodyId === 'solar_system') { selectSolarBody('earth'); return; }
    aeroSetView('close');
    refreshExplorerStatusPanel();
}
function focusSelectedSolarOrbit() {
    SoundFX.click();
    if (solarSelectedBodyId === 'solar_system') { selectSolarBody('earth'); return; }
    aeroSetView('body');
    refreshExplorerStatusPanel();
}
function exCameraView(view) {
    SoundFX.click();
    if (view === 'belt' || view === 'kuiper') {
        if (!AX.layers.belts) toggleExplorerLayer('belts');
        AX.focusId = 'solar_system';
        aeroSetView(view);
        noteExplorer(view === 'belt'
            ? 'Main asteroid belt (2.1–3.3 AU) with Kirkwood gaps at Jupiter resonances, plus Jupiter trojans near L4/L5. Particles are a statistical illustration, not a catalogue of real asteroids.'
            : 'Kuiper Belt: plutinos in 3:2 resonance with Neptune (~39.4 AU), the cold classical belt (~42–48 AU) and part of the scattered disc. Statistical illustration.');
        return;
    }
    if (solarSelectedBodyId === 'solar_system') { selectSolarBody('earth'); }
    const n = AX.nodes[solarSelectedBodyId];
    if (view === 'moons' && n && n.parentId) { selectSolarBody(n.parentId); }
    aeroSetView(view);
    refreshExplorerStatusPanel();
}
function renderExplorerCameraButtons() {
    const map = { 'System overview': 'overview', 'Focus orbit': 'focus', 'Close-up': 'close', 'Orbital view': 'orbit', 'Parent + moon': 'pair', 'Moon system': 'pair' };
    const active = map[explorerUI.cameraLabel];
    ['overview', 'focus', 'close', 'orbit', 'pair'].forEach(k => {
        const b = document.getElementById(`exCamBtn-${k}`);
        if (b) b.classList.toggle('is-active', k === active);
    });
    const pair = document.getElementById('exCamBtn-pair');
    if (pair) {
        const p = BODY_PHYS[solarSelectedBodyId];
        const show = p && (p.parent || AERO_MOON_GROUPS[solarSelectedBodyId]);
        pair.classList.toggle('hidden', !show);
        const lbl = pair.querySelector('span');
        if (lbl) lbl.textContent = p && p.parent ? 'Parent + Moon' : 'Moon System';
        pair.setAttribute('onclick', p && p.parent ? "exCameraView('pair')" : "exCameraView('moons')");
    }
}

/* ---------------- Toggles ---------------- */
function aeroHudBtn(id, on, text) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.textContent = text;
    btn.className = 'ex-hud-btn' + (on ? ' is-on' : '');
}
function toggleSolarOrbitPaths() {
    SoundFX.click();
    solarShowOrbits = !solarShowOrbits;
    aeroHudBtn('solarPathsToggleBtn', solarShowOrbits, `Orbit Paths: ${solarShowOrbits ? "ON" : "OFF"}`);
    refreshExplorerStatusPanel();
}
function toggleSolarLabels() {
    SoundFX.click();
    solarShowLabels = !solarShowLabels;
    aeroHudBtn('solarLabelsToggleBtn', solarShowLabels, `Labels: ${solarShowLabels ? 'ON' : 'OFF'}`);
    refreshExplorerStatusPanel();
}
function toggleSolarScalePreset() {
    SoundFX.click();
    AX.mode = AX.mode === 'cinematic' ? 'scientific' : 'cinematic';
    solarWideSpacing = AX.mode === 'scientific';
    Object.values(AX.nodes).forEach(n => { if (n.kind === 'star') n.apply(); else aeroApplyScale(n); });
    // Re-frame the current view in the new units (radius jumps directly; no animated zoom across 3 orders of magnitude)
    aeroSetView(AX.view);
    solarCamSpherical.radius = solarTargetSpherical.radius;
    aeroSyncScaleUI();
    noteExplorer(AX.mode === 'scientific'
        ? 'Scientific scale: true relative sizes AND distances (1 scene unit = 1 million km). Planets become tiny dots — coloured markers show where they are. Moon orbits are still time-compressed separately.'
        : 'Cinematic scale: sizes enlarged and distances compressed (logarithmic) so every world is visible. NOT to scale.');
    refreshExplorerStatusPanel();
}
function aeroSyncScaleUI() {
    const sci = AX.mode === 'scientific';
    aeroHudBtn('solarScaleToggleBtn', sci, `Scale: ${sci ? 'Scientific' : 'Cinematic'}`);
    const badge = document.getElementById('solarScaleModeBadge');
    if (badge) { badge.textContent = sci ? 'Scientific Scale' : 'Cinematic Scale'; badge.title = sci ? 'True relative sizes and distances (1 unit = 1 million km)' : 'Sizes enlarged and distances compressed for viewing'; }
    const pill = document.getElementById('exScaleNotice');
    if (pill) {
        pill.textContent = sci ? 'TRUE RELATIVE SCALE · 1 UNIT = 10⁶ KM' : 'CINEMATIC · SIZES & DISTANCES NOT TO SCALE';
        pill.className = 'px-1.5 py-0.5 rounded border ' + (sci ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-purple-500/15 text-purple-300 border-purple-500/30');
    }
}
function toggleSolarEuropaCutaway() {
    SoundFX.click();
    solarEuropaCutawayActive = !solarEuropaCutawayActive;
    const n = AX.nodes.europa;
    if (n && n.mesh && n.cutGeo) {
        n.mesh.geometry = solarEuropaCutawayActive ? n.cutGeo : aeroSphere(96);
        n.mesh.material.side = solarEuropaCutawayActive ? THREE.DoubleSide : THREE.FrontSide;
        n.mesh.material.needsUpdate = true;
        n.interior.visible = solarEuropaCutawayActive;
    }
    const entry = exEntry(solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    renderSolarDossierPanel(entry);
    renderExplorerChrome();
}
function toggleExplorerLayer(key) {
    SoundFX.click();
    AX.layers[key] = !AX.layers[key];
    if (key === 'venusRadar') aeroApplyVenusRadar();
    if (key === 'titanHaze') { const t = AX.nodes.titan; if (t && t.haze) t.haze.visible = AX.layers.titanHaze; }
    renderExplorerLayerPanel();
    const entry = exEntry(solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    renderSolarDossierPanel(entry);
    refreshExplorerStatusPanel();
}
function aeroApplyVenusRadar() {
    const v = AX.nodes.venus;
    if (!v || !v.mesh) return;
    const radar = AX.layers.venusRadar;
    if (v.binding) { v.binding.material = null; }
    if (PlanetBaker.available()) v.binding = PlanetBaker.bind(v.mesh.material, radar ? 'venus_surface' : 'venus_clouds', 'lo', { normal: true });
    else { v.mesh.material.map = aeroCanvasRecipeTexture(radar ? 'venus_surface' : 'venus_clouds'); v.mesh.material.needsUpdate = true; }
    if (v.upper) v.upper.visible = !radar;
    if (v.haze) v.haze.visible = !radar;
    noteExplorer(radar ? 'Venus radar view: the cloud layers are hidden to show a radar-inspired surface RECONSTRUCTION (Maxwell Montes, Aphrodite Terra, Ishtar Terra positions approximate). It is not Magellan radar imagery.' : 'Venus in visible light: a featureless sulfuric-acid cloud deck that super-rotates in ~4 days.');
}
function cometJumpToPerihelion(id) {
    SoundFX.click();
    const el = AERO_ORBIT_EL[id];
    if (!el || !el[6]) return;
    AX.simDays = aeroDaysSinceJ2000(new Date(el[6] + 'T00:00:00Z')) - 25;
    noteExplorer(`Simulated date moved to ~25 days before ${shortBodyName(exEntry(id))}'s perihelion (${el[6]}). Planets move to their approximate positions for that date. Tail lengths are illustrative.`);
    refreshExplorerStatusPanel();
}
function explorerResetSimDate() {
    SoundFX.click();
    AX.simDays = aeroDaysSinceJ2000();
    noteExplorer('Simulated date reset to today. Planet positions use mean orbital elements (approximate, ±1–2° for planets).');
    refreshExplorerStatusPanel();
}
function noteExplorer(msg) {
    nexiState.lastCustomAnswer = msg;
    updateNexiContextualGuidance();
}
function enhanceExplorerPlanetMaterials() { /* superseded: surfaces come from PlanetBaker */ }

/* ---------------- Viewport handlers (explorer mount) ---------------- */
function attachExplorerViewportHandlers() {
    if (explorerUI.mountHandlersAttached) return;
    const mount = document.getElementById('explorerViewportMount');
    if (!mount) return;
    explorerUI.mountHandlersAttached = true;
    mount.addEventListener('contextmenu', e => e.preventDefault());
    mount.addEventListener('mousedown', e => {
        solarIsDragging = true; solarIsPanning = (e.button === 2 || e.shiftKey); solarDragMoved = false;
        solarPrevMouse = { x: e.clientX, y: e.clientY };
    });
    mount.addEventListener('wheel', e => { e.preventDefault(); aeroZoomBy(e.deltaY); }, { passive: false });
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (appExperienceMode === 'explore') resizeSolarSystemViewport(); }).observe(mount);
}

/* ---------------- Rail, catalog, moon strip, layers ---------------- */
function renderSolarBodyList() {
    const listEl = document.getElementById('solarBodyListContainer');
    if (!listEl) return;
    const btn = (key, label, inner, onclick, active) =>
        `<button class="ops-rail-btn ex-rail-btn ${active ? 'is-active' : ''}" data-rail="${key}" data-label="${opsEsc(label)}" aria-label="${opsEsc(label)}" onclick="${onclick}">${inner}</button>`;
    const dotSize = { sun: 15, jupiter: 14, saturn: 13, uranus: 11, neptune: 11, earth: 10, venus: 10, mars: 9, mercury: 8, moon: 7, europa: 7 };
    let html = '';
    AERO_ORIGINAL_RAIL.forEach(id => {
        const b = exEntry(id);
        if (!b) return;
        const active = b.id === solarSelectedBodyId;
        if (b.id === 'solar_system') {
            html += btn('solar_system', 'System Overview', '<i class="ph ph-planet"></i>', "selectSolarBody('solar_system')", active);
            html += '<span class="ops-rail-sep"></span>';
            return;
        }
        const s = dotSize[b.id] || 9;
        const glyph = `<span class="ex-rail-dot ${b.id === 'saturn' ? 'has-ring' : ''}" style="width:${s}px;height:${s}px;--c:${b.color}"></span>${b.isMoonOf ? '<span class="ex-rail-moon-tag">moon</span>' : ''}`;
        html += btn(b.id, shortBodyName(b) + (b.isMoonOf ? ` (moon of ${b.isMoonOf === 'earth' ? 'Earth' : 'Jupiter'})` : ''), glyph, `selectSolarBody('${b.id}')`, active);
    });
    html += '<span class="ops-rail-sep"></span>';
    const inCatalog = !AERO_ORIGINAL_RAIL.includes(solarSelectedBodyId);
    html += btn('catalog', 'Catalog: all moons, dwarf planets, asteroids & comets', '<i class="ph ph-list-magnifying-glass"></i>', 'toggleExplorerCatalog()', AX.catalogOpen || inCatalog);
    html += btn('cosmic', 'Cosmic History', '<i class="ph ph-clock-counter-clockwise"></i>', 'focusCosmicHistoryTimeline()', false);
    html += btn('missions', 'Exploration Missions', '<i class="ph ph-rocket"></i>', "setSolarInfoTab('missions')", explorerUI.infoTab === 'missions');
    listEl.innerHTML = html;
}
function toggleExplorerCatalog(force) {
    SoundFX.click();
    AX.catalogOpen = typeof force === 'boolean' ? force : !AX.catalogOpen;
    if (AX.catalogOpen) AX.layerOpen = false;
    renderExplorerCatalog();
    renderExplorerLayerPanel();
    renderSolarBodyList();
}
function toggleCatalogMoons(parent) {
    SoundFX.click();
    AX.extOpen[parent] = !AX.extOpen[parent];
    if (AX.extOpen[parent] && solarScene) ensureMoonSystem(parent, true);
    renderExplorerCatalog();
    renderExplorerMoonStrip();
}
function renderExplorerCatalog() {
    const el = document.getElementById('exCatalogPanel');
    if (!el) return;
    el.classList.toggle('hidden', !AX.catalogOpen);
    if (!AX.catalogOpen) return;
    const chip = id => {
        const b = exEntry(id); if (!b) return '';
        return `<button class="ex-cat-btn ${id === solarSelectedBodyId ? 'is-active' : ''}" onclick="selectSolarBody('${id}')" title="${opsEsc(b.classification)}"><span class="ex-cat-dot" style="--c:${b.color}"></span>${opsEsc(shortBodyName(b))}</button>`;
    };
    let h = `<div class="ex-cat-head"><b>Solar System Catalog</b><button class="ex-hud-btn" onclick="toggleExplorerCatalog(false)" title="Close catalog"><i class="ph ph-x"></i></button></div>`;
    h += `<div class="ex-cat-group"><div class="ex-cat-title">Star & planets</div>${['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map(chip).join('')}</div>`;
    h += '<div class="ex-cat-group"><div class="ex-cat-title">Moons (major · expandable)</div>';
    Object.keys(AERO_MOON_GROUPS).forEach(par => {
        const [maj, ext] = AERO_MOON_GROUPS[par];
        h += `<div class="ex-cat-moonrow"><span class="ex-cat-parent">${opsEsc(shortBodyName(exEntry(par)))}</span>${maj.map(chip).join('')}${AX.extOpen[par] ? ext.map(chip).join('') : ''}${ext.length ? `<button class="ex-cat-more" onclick="toggleCatalogMoons('${par}')">${AX.extOpen[par] ? '− fewer' : `+${ext.length} more`}</button>` : ''}</div>`;
    });
    h += '</div>';
    h += `<div class="ex-cat-group"><div class="ex-cat-title">Dwarf planets</div>${['ceres', 'pluto', 'haumea', 'makemake', 'eris'].map(chip).join('')}</div>`;
    h += `<div class="ex-cat-group"><div class="ex-cat-title">Asteroids & comets</div>${['vesta', 'pallas', 'halley', 'hale_bopp'].map(chip).join('')}
        <button class="ex-cat-btn" onclick="exCameraView('belt')"><i class="ph ph-dots-nine"></i>Asteroid Belt view</button>
        <button class="ex-cat-btn" onclick="exCameraView('kuiper')"><i class="ph ph-dots-nine"></i>Kuiper Belt view</button></div>`;
    h += `<div class="ex-cat-note">Moon counts keep growing; this catalog shows the major moons plus a selection of smaller ones. Surfaces are procedural reconstructions guided by spacecraft maps — not photographs.</div>`;
    el.innerHTML = h;
    aeroLayoutFloating();
}
function renderExplorerMoonStrip() {
    const el = document.getElementById('exMoonStrip');
    if (!el) return;
    const p = BODY_PHYS[solarSelectedBodyId];
    const par = p ? (p.parent || (AERO_MOON_GROUPS[solarSelectedBodyId] ? solarSelectedBodyId : null)) : null;
    if (!par) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    const [maj, ext] = AERO_MOON_GROUPS[par];
    const ids = maj.concat(AX.extOpen[par] ? ext : []);
    const chip = id => { const b = exEntry(id); return b ? `<button class="ex-chip ${id === solarSelectedBodyId ? 'is-active' : ''}" onclick="selectSolarBody('${id}')"><span class="ex-cat-dot" style="--c:${b.color}"></span>${opsEsc(shortBodyName(b))}</button>` : ''; };
    el.classList.remove('hidden');
    el.innerHTML = `<span class="ex-strip-k">${opsEsc(shortBodyName(exEntry(par)))} system</span>${chip(par)}<span class="ex-strip-sep"></span>${ids.map(chip).join('')}${ext.length ? `<button class="ex-chip ex-chip-more" onclick="toggleCatalogMoons('${par}')">${AX.extOpen[par] ? '−' : `+${ext.length}`}</button>` : ''}`;
    aeroLayoutFloating();
}
function toggleExplorerLayerPanel() {
    SoundFX.click();
    AX.layerOpen = !AX.layerOpen;
    if (AX.layerOpen) AX.catalogOpen = false;
    renderExplorerLayerPanel();
    renderExplorerCatalog();
}
function renderExplorerLayerPanel() {
    const el = document.getElementById('exLayerPanel');
    if (!el) return;
    el.classList.toggle('hidden', !AX.layerOpen);
    const row = (k, label, note) => `<button class="ex-layer-row ${AX.layers[k] ? 'is-on' : ''}" onclick="toggleExplorerLayer('${k}')"><i class="ph ${AX.layers[k] ? 'ph-check-square' : 'ph-square'}"></i><span>${label}${note ? `<small>${note}</small>` : ''}</span></button>`;
    el.innerHTML = `<div class="ex-cat-head"><b>Display layers</b><button class="ex-hud-btn" onclick="toggleExplorerLayerPanel()"><i class="ph ph-x"></i></button></div>`
        + row('belts', 'Asteroid & Kuiper belts', 'statistical particles')
        + row('comets', 'Comet comae & tails', 'illustrative activity')
        + row('prominences', 'Solar prominences', 'illustrative')
        + row('moonOrbits', 'Major-moon orbit paths', 'planets\' major moons only')
        + row('venusRadar', 'Venus radar surface', 'reconstruction, not imagery')
        + row('titanHaze', 'Titan haze layer')
        + `<button class="ex-layer-row ${AERO_ULTRA ? 'is-on' : ''}" onclick="aeroSetQuality('${AERO_ULTRA ? 'standard' : 'ultra'}')"><i class="ph ${AERO_ULTRA ? 'ph-check-square' : 'ph-square'}"></i><span>Ultra-detail surfaces<small>GPU-intensive · reloads the page · ${AERO_SAFE ? 'off in safe mode' : (AERO_ULTRA ? 'ON' : 'OFF (standard)')}</small></span></button>`
        + `<button class="ex-layer-row ${AERO_HQ ? 'is-on' : ''}" onclick="toggleAeroHQ()"><i class="ph ${AERO_HQ ? 'ph-check-square' : 'ph-square'}"></i><span>High-quality GPU surfaces<small>experimental · may crash some GPUs · reloads page</small></span></button>`
        + `<div class="ex-cat-note">Simulated date: ${aeroSimDateText()} · <button class="underline" onclick="explorerResetSimDate()">reset to today</button></div>`;
    aeroLayoutFloating();
}
function aeroSimDateText() {
    const d = new Date(AERO_J2000_MS + AX.simDays * 86400000);
    return isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}


// Keep the floating panels clear of the top/bottom HUD rows (they wrap at narrow widths)
function aeroLayoutFloating() {
    const vp = document.getElementById('explorerViewportPanel');
    if (!vp || appExperienceMode !== 'explore') return;
    const vr = vp.getBoundingClientRect();
    const topHud = document.getElementById('explorerViewportTitle');
    const camRow = document.getElementById('exCamBtn-overview');
    const botHud = document.getElementById('solarPathsToggleBtn');
    let top = 66, bottom = 46;
    if (topHud && camRow) top = Math.max(topHud.closest('.hud-floating-glass').getBoundingClientRect().bottom, camRow.closest('.hud-floating-glass').getBoundingClientRect().bottom) - vr.top + 8;
    if (botHud) bottom = vr.bottom - botHud.closest('.hud-floating-glass').getBoundingClientRect().top + 6;
    const strip = document.getElementById('exMoonStrip');
    if (strip) strip.style.bottom = bottom + 'px';
    const stripH = strip && !strip.classList.contains('hidden') ? strip.offsetHeight + 6 : 0;
    ['exCatalogPanel', 'exLayerPanel'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.top = top + 'px';
        el.style.maxHeight = Math.max(120, vr.height - top - bottom - stripH - 6) + 'px';
    });
}

/* ---------------- Info panel additions (body-specific options) ---------------- */
const _aeroRenderDossier = renderSolarDossierPanel;
renderSolarDossierPanel = function (entry, tabChanged) {
    _aeroRenderDossier(entry, tabChanged);
    const actions = document.getElementById('exInfoActions');
    if (!actions || !entry) return;
    const id = entry.id, opt = [];
    const b = (fn, icon, text, on) => `<button onclick="${fn}" class="ops-ghost-btn justify-center ${on ? 'is-on' : ''}"><i class="ph ${icon}"></i><span>${text}</span></button>`;
    if (BODY_PHYS[id] && id !== 'sun') opt.push(b("exCameraView('orbit')", 'ph-circle-dashed', 'Orbital view'));
    if (BODY_PHYS[id] && BODY_PHYS[id].parent) opt.push(b("exCameraView('pair')", 'ph-arrows-in-line-horizontal', 'Parent + moon'));
    if (AERO_MOON_GROUPS[id]) opt.push(b("exCameraView('moons')", 'ph-planet', 'Moon system'));
    if (id === 'sun') { opt.push(b('triggerSolarFlare()', 'ph-lightning', 'Solar flare (illustrative)')); opt.push(b("toggleExplorerLayer('prominences')", 'ph-wave-sine', `Prominences: ${AX.layers.prominences ? 'ON' : 'OFF'}`, AX.layers.prominences)); }
    if (id === 'venus') opt.push(b("toggleExplorerLayer('venusRadar')", 'ph-broadcast', AX.layers.venusRadar ? 'Radar surface: ON (reconstruction)' : 'Show radar surface (reconstruction)', AX.layers.venusRadar));
    if (id === 'titan') opt.push(b("toggleExplorerLayer('titanHaze')", 'ph-cloud', `Haze: ${AX.layers.titanHaze ? 'ON' : 'OFF (surface reconstruction)'}`, AX.layers.titanHaze));
    if (BODY_PHYS[id] && BODY_PHYS[id].kind === 'comet') { opt.push(b(`cometJumpToPerihelion('${id}')`, 'ph-sun-horizon', 'Jump to perihelion')); opt.push(b('explorerResetSimDate()', 'ph-calendar', 'Back to today')); }
    if (AERO_RING_SPECS[id]) opt.push(`<div class="ops-note" style="grid-column:1/-1">Rings: ${opsEsc(AERO_RING_SPECS[id].note)}</div>`);
    const R = BODY_PHYS[id] && AERO_RECIPES[BODY_PHYS[id].recipe];
    if (R && R.basis) opt.push(`<div class="ops-note" style="grid-column:1/-1"><b>Surface:</b> ${opsEsc(R.basis)}</div>`);
    if (id === 'earth') opt.push('<div class="ops-note" style="grid-column:1/-1"><b>Surface:</b> same textures, materials and shaders as the Play Game Earth (separate instance).</div>');
    if (opt.length) actions.insertAdjacentHTML('beforeend', `<div class="grid grid-cols-2 gap-1.5 mt-1.5">${opt.join('')}</div>`);
};

const _aeroRefreshStatus = refreshExplorerStatusPanel;
refreshExplorerStatusPanel = function () {
    _aeroRefreshStatus();
    if (appExperienceMode !== 'explore') return;
    const setT = (id, v) => { const el = document.getElementById(id); if (el) { el.textContent = v; el.title = v; } };
    setT('exStatRotation', `${solarOrbitsPaused ? 'Orbits paused' : 'Orbits playing'} · ${solarOrbitSpeedMult}x · ${aeroSimDateText()} · spin separate`);
    const entry = exEntry(solarSelectedBodyId) || SOLAR_SYSTEM_DATABASE[0];
    const extra = [AX.mode === 'scientific' ? 'Scientific scale' : 'Cinematic scale', solarShowLabels ? 'Labels' : null, solarShowOrbits ? 'Orbits' : null,
        AX.layers.belts ? 'Belts' : null, (entry.id === 'europa' && solarEuropaCutawayActive) ? 'Ocean cutaway' : null,
        (entry.id === 'venus' && AX.layers.venusRadar) ? 'Radar reconstruction' : null].filter(Boolean);
    setT('exStatLayer', `${entry.id === 'venus' && AX.layers.venusRadar ? 'Radar' : 'Natural colour'} · ${extra.join(' · ')}`);
    if (AX.layerOpen) { const n = document.querySelector('#exLayerPanel .ex-cat-note'); if (n) n.firstChild.textContent = `Simulated date: ${aeroSimDateText()} · `; }
    aeroLayoutFloating();
};

// Mode switching hooks: keep the explorer camera/scale UI consistent when entering the menu or LET'S EXPLORE
const _aeroSwitchAppExperience = switchAppExperience;
switchAppExperience = function (targetMode) {
    _aeroSwitchAppExperience(targetMode);
    if (threeRenderer && AX.lowRes) {
        threeRenderer.setPixelRatio(targetMode === 'game' ? AX.savedPR : 1);
        if (targetMode === 'game') resizeThreeViewport(); else resizeSolarSystemViewport();
    }
    if (!solarScene || !AX.trans.from) return;
    if (targetMode === 'menu') {
        AX.focusId = 'solar_system'; AX.view = 'system';
        AX.trans.t = 0; AX.trans.from.copy(solarLookAtCurrent); solarPanOffset.set(0, 0, 0);
        if (AX.mode === 'scientific') solarTargetSpherical.radius = 7000;
    } else if (targetMode === 'explore') {
        aeroSyncScaleUI();
        renderExplorerMoonStrip();
        renderExplorerLayerPanel();
        renderExplorerCatalog();
    }
};

// Time-sliced texture baking runs once per frame from the single master loop (menu, explorer and Play Game)
const _aeroAnimateThreeLoop = animateThreeLoop;
animateThreeLoop = function () {
    try {
        PlanetBaker.pump();
        if (AX.canvasQueue && AX.canvasQueue.length) AX.canvasQueue.shift()();
    } catch (err) { aeroReportError('texture queue', err); }
    _aeroAnimateThreeLoop();
};

function toggleAeroHQ() {
    try { localStorage.setItem('aeroHQ', AERO_HQ ? '0' : '1'); } catch (e) {}
    const u = new URL(location.href); u.searchParams.delete('hq'); location.href = u.toString();
}

