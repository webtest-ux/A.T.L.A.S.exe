/* A.T.L.A.S · section 16T — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16T. PAD 3A9 — EARTH-TO-SPACE FLIGHT VIEW
 *      Builds on the EXISTING pad camera, rocket stack, staging and
 *      ascent engine (state.ascent). Adds: Earth as the launch
 *      environment (curved globe + launch complex), a continuous
 *      atmosphere-to-space transition driven by the engine's own
 *      altitude, smoke / flame / vibration, five camera views,
 *      pause / resume / restart / return-to-pad, a free-flight launch
 *      (no mission, no score) and launch audio through AtlasAudio.
 *      Hooks: padFlightDt() (ascent clock) and padFlightFrame(m)
 *      (called by animateThreeLoop just before rendering).
 ***********************************************************************/
const PX = {
    ready: false, broken: false, on: false,
    cam: 'track', blend: 1, free: false, orbit: false, paused: false, speed: 1, lastKind: null,
    flightT: 0, theta: 0, dt: 0.016, lastT: 0, R: 8000, stackH: 9, stackRef: null,
    q: (typeof AERO_SAFE !== 'undefined' && AERO_SAFE) ? 0 : (typeof AERO_ULTRA !== 'undefined' && AERO_ULTRA) ? 2 : 1,
    shakeOk: !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    smoke: [], smokeI: 0, spawnAcc: 0, trailAcc: 0, sig: ''
};
const PADX_CAMS = [
    ['pad', 'Launch pad', 'ph-binoculars', 'Watch from the ground beside the pad'],
    ['track', 'Tracking', 'ph-crosshair', 'Follow the rocket — drag to orbit around it'],
    ['fp', 'First-person', 'ph-eye', 'Ride on the nose of the rocket — drag to look around'],
    ['earth', 'Earth view', 'ph-globe-hemisphere-west', 'Look straight down at Earth past the rocket'],
    ['space', 'Space view', 'ph-shooting-star', 'Wide view of the rocket against Earth and the stars']
];

/* ---------- Pure helpers (no 3D objects) ---------- */
const padxSmooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const padxLerp = (a, b, t) => a + (b - a) * t;
// Engine altitude (km) → scene height. True scale near the pad (rocket ≈ 70 m ≈ 8 units), compressed higher up.
function padxVisualH(altKm) { return altKm <= 1 ? 114 * Math.max(0, altKm) : 114 + 566 * Math.log(1 + (altKm - 1) / 4.965); }
// Gravity-turn pitch (radians from vertical)
function padxPitch(altKm) { return 1.15 * padxSmooth((altKm - 2) / 170); }
const PADX_SKY = [[0, 0.36, 0.62, 0.93], [4, 0.24, 0.47, 0.84], [12, 0.10, 0.22, 0.52], [30, 0.03, 0.07, 0.22], [60, 0.008, 0.016, 0.06], [100, 0, 0, 0.012]];
function padxSky(altKm) {
    const S = PADX_SKY;
    if (altKm <= 0) return S[0].slice(1);
    for (let i = 1; i < S.length; i++) if (altKm <= S[i][0]) {
        const t = (altKm - S[i - 1][0]) / (S[i][0] - S[i - 1][0]);
        return [1, 2, 3].map(k => padxLerp(S[i - 1][k], S[i][k], t));
    }
    return S[S.length - 1].slice(1);
}
function padxLayerName(altKm, flying) {
    if (!flying) return 'On the pad · sea level';
    if (altKm < 12) return 'Troposphere · weather and clouds';
    if (altKm < 50) return 'Stratosphere · sky turning dark';
    if (altKm < 85) return 'Mesosphere · almost no air';
    if (altKm < 100) return 'Thermosphere · edge of space';
    return 'Space · above the 100 km Kármán line';
}

/* ---------- Ascent clock: time-based, slow lift-off that builds speed ---------- */
function padFlightDt() {
    if (PX.broken || !PX.on) return 0.025;            // legacy step when the flight view is unavailable
    if (PX.paused) return 0;
    const d = PX.dt * PX.speed;
    PX.flightT += d;
    return (0.045 + 0.155 * padxSmooth(PX.flightT / 9)) * d;
}

/* ---------- Launch audio (through the audio manager) ---------- */
const PadAudio = {
    n: null,
    start() {
        if (this.n || !AtlasAudio.on()) return;
        const sfx = AtlasAudio.bus('sfx'), amb = AtlasAudio.bus('ambient');
        if (!sfx || !amb) return;
        const ctx = AtlasAudio.ctx;
        try {
            if (ctx.state === 'suspended') ctx.resume();
            const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
            let last = 0;
            for (let i = 0; i < len; i++) { last = (last + 0.03 * (Math.random() * 2 - 1)) / 1.03; d[i] = last * 3.2; }   // brown noise
            const mk = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; };
            const roarSrc = mk(), lp = ctx.createBiquadFilter(), roar = ctx.createGain();
            lp.type = 'lowpass'; lp.frequency.value = 300; roar.gain.value = 0;
            roarSrc.connect(lp); lp.connect(roar); roar.connect(sfx);
            const windSrc = mk(), bp = ctx.createBiquadFilter(), wind = ctx.createGain();
            bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 0.5; wind.gain.value = 0;
            windSrc.connect(bp); bp.connect(wind); wind.connect(sfx);
            const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), drone = ctx.createGain();
            o1.type = 'sine'; o1.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 82.6; drone.gain.value = 0;
            o1.connect(drone); o2.connect(drone); drone.connect(amb);
            [roarSrc, windSrc, o1, o2].forEach(x => x.start());
            this.n = { ctx, src: [roarSrc, windSrc, o1, o2], lp, roar, wind, drone };
        } catch (e) { this.n = null; }
    },
    set(roar, wind, drone, lpHz) {
        const n = this.n; if (!n) return;
        const t = n.ctx.currentTime;
        n.roar.gain.setTargetAtTime(roar, t, 0.12); n.wind.gain.setTargetAtTime(wind, t, 0.2);
        n.drone.gain.setTargetAtTime(drone, t, 0.6); n.lp.frequency.setTargetAtTime(lpHz, t, 0.2);
    },
    stop() {
        const n = this.n; if (!n) return;
        this.n = null;
        try {
            const t = n.ctx.currentTime;
            [n.roar, n.wind, n.drone].forEach(g => g.gain.setTargetAtTime(0, t, 0.08));
            setTimeout(() => n.src.forEach(s => { try { s.stop(); } catch (e) { /* already stopped */ } }), 500);
        } catch (e) { /* context closed */ }
    },
    update(ignition, flying, altKm) {
        const burning = ignition || (flying && !PX.orbit);
        if (!ignition && !flying) { this.stop(); return; }
        this.start();
        if (PX.paused) { this.set(0, 0, 0, 200); return; }
        const roar = ignition ? 0.26 : burning ? 0.07 + 0.5 * Math.exp(-altKm / 22) : 0;
        const wind = flying ? 0.28 * Math.exp(-Math.pow((altKm - 11) / 9, 2)) : 0;
        const drone = 0.14 * padxSmooth((altKm - 60) / 60);
        this.set(roar, wind, drone, 110 + 320 * Math.exp(-altKm / 30));
    }
};
function padxSay(text) {
    const v = AtlasAudio.level('sfx');
    if (v <= 0 || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
        const u = new SpeechSynthesisUtterance(text);
        u.volume = Math.min(1, v * 1.2); u.rate = 1.05; u.pitch = 0.9;
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
}
// Called once per countdown second by both the mission countdown and the free-flight countdown
function padxCountdownTick(t) {
    padxSay(t === 0 ? 'Liftoff' : t === 3 ? 'Three. Ignition.' : String(t));
    if (t === 3) { try { SoundFX.rumble(2.6); } catch (e) { /* no audio */ } }
    padxRenderControls();
}

/* ---------- Scene construction (once) ---------- */
function padxCanvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function padxBuild() {
    const R = PX.R, q = PX.q;
    const root = new THREE.Group(); root.visible = false; threeScene.add(root);
    const pivot = new THREE.Group(); root.add(pivot);               // Earth centre; rotates for down-range travel
    const local = new THREE.Group(); local.position.set(0, R, 0); pivot.add(local);   // launch site on top of the globe
    const maps = getEarthLayeredTextures();
    const seg = q === 0 ? 64 : 128;

    // The globe: launch site (≈ 28.5° N, 80.6° W) turned to the top
    const site = new THREE.Vector3(0.1435, 0.4772, 0.867).normalize(), up = new THREE.Vector3(0, 1, 0);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(R, seg, seg / 2), new THREE.MeshStandardMaterial({ map: maps.albedo, roughness: 0.92, metalness: 0 }));
    earth.quaternion.setFromUnitVectors(site, up);
    pivot.add(earth);
    const cloudShell = new THREE.Mesh(new THREE.SphereGeometry(R * 1.0075, seg, seg / 2), new THREE.MeshStandardMaterial({
        map: maps.clouds, alphaMap: maps.clouds, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, roughness: 1, metalness: 0 }));
    cloudShell.quaternion.copy(earth.quaternion);
    pivot.add(cloudShell);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, seg, seg / 2), new THREE.MeshBasicMaterial({
        color: 0x5aa8ff, transparent: true, opacity: 0, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    pivot.add(halo);

    // Near-field ground: coast, launch complex apron, crawlerway (canvas px → world: x = (px/1024-0.5)*700, z = (py/1024-0.5)*700)
    const S = 700, groundTex = new THREE.CanvasTexture(padxCanvas(1024, 1024, (g, w, h) => {
        const px = u => (u / S + 0.5) * w;
        g.fillStyle = '#42683a'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) {                                   // scrub / marsh mottling
            g.fillStyle = ['rgba(52,88,48,.5)', 'rgba(74,110,60,.45)', 'rgba(96,112,70,.35)', 'rgba(40,74,52,.5)'][i % 4];
            const r = 6 + Math.random() * 26; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, r, r * (0.5 + Math.random() * 0.6), Math.random() * 3, 0, 6.283); g.fill();
        }
        // ocean to the east with a sandy shoreline
        const shore = y => px(150) + Math.sin(y / 90) * 22 + Math.sin(y / 31) * 7;
        g.fillStyle = '#d9c79a'; g.beginPath(); g.moveTo(w, 0); for (let y = 0; y <= h; y += 8) g.lineTo(shore(y) - 12, y); g.lineTo(w, h); g.fill();
        const sea = g.createLinearGradient(px(150), 0, w, 0); sea.addColorStop(0, '#2f7f9a'); sea.addColorStop(1, '#14466e');
        g.fillStyle = sea; g.beginPath(); g.moveTo(w, 0); for (let y = 0; y <= h; y += 8) g.lineTo(shore(y), y); g.lineTo(w, h); g.fill();
        // lagoon
        g.fillStyle = '#2b6f86'; g.beginPath(); g.ellipse(px(-70), px(140), 60, 34, 0.4, 0, 6.283); g.fill();
        // crawlerway from the assembly building to the pad, and a service road
        g.strokeStyle = '#b9ab8a'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(px(-150), px(-110)); g.lineTo(px(-60), px(-30)); g.lineTo(px(0), px(0)); g.stroke();
        g.strokeStyle = '#8f8572'; g.lineWidth = 3; g.beginPath(); g.moveTo(px(-150), px(-110)); g.lineTo(px(-60), px(-30)); g.lineTo(px(0), px(0)); g.stroke();
        g.strokeStyle = '#6b7280'; g.lineWidth = 5; g.beginPath(); g.moveTo(px(-340), px(60)); g.lineTo(px(-40), px(40)); g.lineTo(px(120), px(70)); g.stroke();
        // concrete apron + flame trench
        g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(px(0), px(0), 42, 0, 6.283); g.fill();
        g.fillStyle = '#7b8088'; g.beginPath(); g.arc(px(0), px(0), 26, 0, 6.283); g.fill();
        g.fillStyle = '#2a2d33'; g.fillRect(px(0) - 7, px(0) - 34, 14, 68);
        g.fillStyle = '#8d939a'; g.fillRect(px(-168), px(-128), 52, 40);     // assembly-building apron
        // fade the rim into the globe
        const fade = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.5);
        fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalCompositeOperation = 'destination-in'; g.fillStyle = fade; g.fillRect(0, 0, w, h);
    }));
    const groundGeo = new THREE.PlaneGeometry(S, S, 40, 40); groundGeo.rotateX(-Math.PI / 2);
    const gp = groundGeo.attributes.position;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i); gp.setY(i, Math.sqrt(R * R - x * x - z * z) - R + 0.6); }
    gp.needsUpdate = true; groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, transparent: true, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    local.add(ground);

    // Launch facilities (simple solids; positions match the painted ground)
    const fac = new THREE.Group(); local.add(fac);
    const gy = (x, z) => Math.sqrt(R * R - x * x - z * z) - R + 0.6;
    const std = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0.1 }, extra || {}));
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, gy(x, z) + y, z); fac.add(m); return m; };
    add(new THREE.BoxGeometry(26, 34, 22), std(0xdfe4ea), -150, 17, -110);                 // vehicle assembly building
    add(new THREE.BoxGeometry(8, 30, 0.6), std(0x475569), -150, 15, -98.7);               // its tall door
    add(new THREE.BoxGeometry(18, 6, 10), std(0xc7ccd4), -126, 3, -118);                  // launch control centre
    [[9, 30], [9, 150], [9, 270]].forEach(([r, deg]) => {                                 // lightning towers
        const a = deg * Math.PI / 180, x = Math.cos(a) * r, z = Math.sin(a) * r;
        add(new THREE.CylinderGeometry(0.06, 0.18, 17, 6), std(0x94a3b8, { metalness: 0.6 }), x, 8.5 - 0.6, z);
    });
    add(new THREE.CylinderGeometry(0.35, 0.5, 9, 8), std(0xcbd5e1), 17, 4.5 - 0.6, -13);   // water tower
    add(new THREE.SphereGeometry(1.7, 16, 12), std(0xf1f5f9), 17, 9.6 - 0.6, -13);
    add(new THREE.SphereGeometry(3, 20, 14), std(0xf8fafc), 28, 2.6, 27);                 // propellant spheres
    add(new THREE.SphereGeometry(3, 20, 14), std(0xf8fafc), -28, 2.6, 27);
    add(new THREE.BoxGeometry(5, 0.5, 20), std(0x1f2937), 0, -0.2, 0);                    // flame trench

    // Cloud deck the rocket climbs through
    const cloudTex = new THREE.CanvasTexture(padxCanvas(256, 256, (g) => {
        for (let i = 0; i < 9; i++) {
            const x = 70 + Math.random() * 116, y = 90 + Math.random() * 76, r = 40 + Math.random() * 46;
            const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
        }
    }));
    const clouds = [];
    for (let i = 0, n = [8, 20, 36][q]; i < n; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false }));
        const a = Math.random() * 6.283, r = 130 + Math.random() * 800, s = 90 + Math.random() * 130;
        sp.position.set(Math.cos(a) * r, 110 + Math.random() * 160, Math.sin(a) * r); sp.scale.set(s, s * 0.55, 1);
        local.add(sp); clouds.push(sp);
    }

    // Smoke / exhaust pool (in ground coordinates so the trail is left behind)
    const puffTex = new THREE.CanvasTexture(padxCanvas(128, 128, (g) => {
        const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }));
    PX.smoke = [];
    for (let i = 0, n = [60, 110, 160][q]; i < n; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0, depthWrite: false }));
        sp.visible = false; local.add(sp);
        PX.smoke.push({ s: sp, alive: false, life: 0, max: 1, vx: 0, vy: 0, vz: 0, billow: false });
    }
    // Engine glow (scene coordinates)
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xffb347, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    root.add(glow);
    // Daylight for the launch site
    root.add(new THREE.HemisphereLight(0xdfefff, 0x4a5a48, 0.8));
    const sun = new THREE.DirectionalLight(0xfff4e0, 0.7); sun.position.set(30, 40, 18); root.add(sun);

    Object.assign(PX, {
        root, pivot, local, earth, cloudShell, halo, ground, groundMat, fac, clouds, glow,
        sky: new THREE.Color(0x5c9eed), fog: new THREE.Fog(0x9cc4ee, 60, 700),
        pos: new THREE.Vector3(), look: new THREE.Vector3(), fromPos: new THREE.Vector3(), fromLook: new THREE.Vector3(),
        dpos: new THREE.Vector3(), dlook: new THREE.Vector3(), v1: new THREE.Vector3(), v2: new THREE.Vector3(), v3: new THREE.Vector3(), box: new THREE.Box3(),
        ready: true
    });
}

function padxEnter() {
    PX.saved = { near: threeCamera.near, far: threeCamera.far, fov: threeCamera.fov, bg: threeScene.background, fog: threeScene.fog, star: starField ? starField.material.opacity : 0.9 };
    threeCamera.near = 0.3; threeCamera.far = 30000; threeCamera.updateProjectionMatrix();
    PX.root.visible = true;
    PX.pos.copy(threeCamera.position); PX.look.copy(smoothedLookAt); PX.blend = 1;
    PX.on = true;
    padxRenderControls();
}
function padxTeardown() {
    PX.on = false;
    PadAudio.stop();
    if (PX.free) padxEndFree(true);
    if (!PX.ready || !PX.saved) return;
    const s = PX.saved;
    threeCamera.near = s.near; threeCamera.far = s.far; threeCamera.fov = s.fov; threeCamera.updateProjectionMatrix();
    threeScene.background = s.bg; threeScene.fog = s.fog;
    if (starField) starField.material.opacity = s.star;
    PX.root.visible = false;
    if (planetGroup) planetGroup.visible = true;
    if (padGroup) padGroup.children.forEach(c => { if (c.userData && c.userData.pxBaseY !== undefined) { c.position.y = c.userData.pxBaseY; c.visible = true; } });
}

/* ---------- Smoke ---------- */
function padxSpawn(billow, x, y, z) {
    const p = PX.smoke[PX.smokeI++ % PX.smoke.length];
    p.alive = true; p.billow = billow; p.life = 0; p.max = billow ? 5 + Math.random() * 2 : 3.2 + Math.random();
    const a = Math.random() * 6.283, sp = billow ? 3 + Math.random() * 4.5 : 0.5;
    p.vx = Math.cos(a) * sp; p.vz = Math.sin(a) * sp; p.vy = billow ? 0.4 + Math.random() * 1.1 : -2 - Math.random() * 2;
    p.s.position.set(x, y, z); p.s.visible = true;
}
function padxSmokeStep(dt) {
    for (let i = 0; i < PX.smoke.length; i++) {
        const p = PX.smoke[i]; if (!p.alive) continue;
        p.life += dt;
        const f = p.life / p.max;
        if (f >= 1) { p.alive = false; p.s.visible = false; continue; }
        const damp = p.billow ? Math.max(0.2, 1 - f) : 1;
        p.s.position.x += p.vx * damp * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * damp * dt;
        if (p.billow && p.s.position.y < 0.8) p.s.position.y = 0.8;
        const sc = p.billow ? 3 + f * 11 : 1.3 + f * 6.5;
        p.s.scale.set(sc, sc, 1);
        p.s.material.opacity = (1 - f) * (p.billow ? 0.5 : 0.42);
        const warm = p.billow ? 0 : Math.max(0, 1 - f * 5);
        p.s.material.color.setRGB(0.86 + 0.14 * warm, 0.86 - 0.16 * warm + 0.0, 0.88 - 0.5 * warm);
    }
}
function padxClearSmoke() { PX.smoke.forEach(p => { p.alive = false; p.s.visible = false; }); }

/* ---------- Per-frame update (before render) ---------- */
function padFlightFrame(m) {
    if (PX.broken) return;
    try { padxFrame(m); }
    catch (e) {
        PX.broken = true; window.__padxError = String((e && e.stack) || e);
        console.error('[ATLAS] Pad 3A9 flight view disabled after an error:', e);
        try { padxTeardown(); } catch (_) { /* best effort */ }
        padxRenderControls();
    }
}
function padxFrame(m) {
    const now = performance.now();
    PX.dt = Math.min(0.1, Math.max(0.001, (now - (PX.lastT || now)) / 1000)); PX.lastT = now;
    if (cameraMode !== 'pad') { if (PX.on) padxTeardown(); return; }
    if (!PX.ready) padxBuild();
    if (!PX.on) padxEnter();

    const asc = state.ascent, flying = !!asc.active;
    const ignition = !!LX.cdTimer && LX.count != null && LX.count <= 3;
    const dt = PX.paused ? 0 : PX.dt * PX.speed;
    if (!flying) { PX.flightT = 0; PX.theta = 0; PX.orbit = false; PX.paused = false; }
    if (!PX.free && (flying || LX.cdTimer)) PX.lastKind = 'mission';
    // Free flight with Manual Staging on: the player may stage by hand, but the flight never gets stuck waiting
    if (flying && PX.free && state.manualStagingMode && !PX.paused) {
        const due = asc.stageIndex === 2 ? 5.7 : asc.stageIndex === 3 ? 8.0 : asc.stageIndex === 4 ? 10.5 : Infinity;
        if (asc.timer > due) handleAscentPrimaryAction();
    }
    const alt = flying ? asc.altitudeKm : 0;
    const h = padxVisualH(alt), R = PX.R, Y0 = -4.0 - h, GY = Y0 - 1.2;   // GY = ground level (bottom of the pad base)
    const pitch = flying ? padxPitch(alt) : 0;
    PX.altKm = alt; PX.h = h;

    // Earth and launch site fall away beneath the rocket; later the ground also slides down-range
    PX.theta += dt * 0.012 * Math.sin(pitch) * Math.min(1, alt / 150);
    PX.pivot.position.set(0, GY - R, 0);
    PX.pivot.rotation.z = PX.theta;
    PX.cloudShell.rotation.y += dt * 0.0006;
    if (planetGroup) planetGroup.visible = false;
    for (let i = 0; i < padGroup.children.length; i++) {
        const c = padGroup.children[i];
        if (c === launchStackGroup || c === padExhaustParticles) continue;
        if (c.userData.pxBaseY === undefined) c.userData.pxBaseY = c.position.y;
        c.position.y = c.userData.pxBaseY - h; c.visible = h < 1000;
    }

    // Rocket: measure the stack once per rebuild, gravity turn, ignition shudder
    if (PX.stackRef !== launchStackGroup && !flying) {
        PX.stackRef = launchStackGroup;
        launchStackGroup.updateMatrixWorld(true);
        PX.box.setFromObject(launchStackGroup);
        const H = PX.box.max.y - launchStackGroup.position.y;
        PX.stackH = (H > 3 && H < 40) ? H : 9;
    }
    if (flying) launchStackGroup.rotation.z = -Math.max(pitch, Math.min(0.32, asc.timer * 0.03) * (1 - padxSmooth(alt / 40)));
    launchStackGroup.position.x = (ignition && !PX.paused && PX.shakeOk) ? (Math.random() - 0.5) * 0.035 : 0;
    const tilt = -launchStackGroup.rotation.z;
    const up = PX.v2.set(Math.sin(tilt), Math.cos(tilt), 0);
    launchStackGroup.updateMatrixWorld(true);
    rocketStage2Group.getWorldPosition(PX.v1);
    spacecraftGroup.position.copy(PX.v1).addScaledVector(up, 2.3);
    spacecraftGroup.rotation.copy(launchStackGroup.rotation);

    // Engines: ignition build-up, vacuum plume, cut-off in orbit
    const stage1 = asc.stageIndex <= 2;
    if (ignition) {
        const k = Math.min(1, (3.2 - LX.count) / 3);
        stage1PlumeMesh.material.opacity = (0.3 + Math.random() * 0.35) * (0.5 + 0.5 * k);
        stage1PlumeMesh.scale.y = 0.5 + 0.4 * k + Math.random() * 0.2;
        engineLight.intensity = 1.2 + k; engineLight.position.set(0, -4.6, 1);
    }
    if (flying && !stage1) { const w = 1 + 1.2 * padxSmooth((alt - 40) / 80); stage2PlumeMesh.scale.x = w; stage2PlumeMesh.scale.z = w; }
    if (PX.orbit) { stage2PlumeMesh.material.opacity = 0; engineLight.intensity = 0; }
    const burning = ignition || (flying && !PX.orbit);
    const g = PX.glow;
    if (burning) {
        if (flying && !stage1) g.position.copy(PX.v1).addScaledVector(up, -0.5); else g.position.copy(launchStackGroup.position).addScaledVector(up, -0.5);
        const gs = (stage1 ? 4.2 : 3) + Math.random() * 0.9;
        g.scale.set(gs, gs, 1); g.material.opacity = PX.paused ? 0.6 : 0.65 + Math.random() * 0.3;
        g.material.color.setHex(stage1 || !flying ? 0xffb347 : 0x9fd0ff);
    } else g.material.opacity = 0;

    // Smoke: pad billow at ignition and lift-off, exhaust trail through the lower atmosphere
    const perf = PX.dt > 0.04 ? 0.5 : 1, rate = [0.5, 1, 1.5][PX.q] * perf;
    if (dt > 0) {
        if (ignition || (flying && h < 30)) {
            PX.spawnAcc += dt * 16 * rate;
            while (PX.spawnAcc >= 1) { PX.spawnAcc -= 1; padxSpawn(true, (Math.random() - 0.5) * 2.4, 0.8, (Math.random() - 0.5) * 2.4); }
        }
        if (flying && stage1 && alt < 45) {
            PX.trailAcc += dt * 11 * rate;
            const ey = launchStackGroup.position.y - 0.8 - GY;
            while (PX.trailAcc >= 1) { PX.trailAcc -= 1; padxSpawn(false, (Math.random() - 0.5) * 0.5, ey - Math.random() * 1.5, (Math.random() - 0.5) * 0.5); }
        }
        padxSmokeStep(dt);
    }

    // Atmosphere: sky colour, horizon haze, stars, limb glow, cloud deck — all continuous in altitude
    const c = padxSky(alt), hz = Math.max(0, 1 - alt / 14) * 0.55;
    PX.sky.setRGB(c[0], c[1], c[2]);
    threeScene.background = PX.sky;
    PX.fog.color.setRGB(padxLerp(c[0], 0.78, hz), padxLerp(c[1], 0.86, hz), padxLerp(c[2], 0.95, hz));
    PX.fog.near = 60 + h * 0.5; PX.fog.far = 700 + h * 6 + alt * alt * 40 + (alt > 45 ? (alt - 45) * 1e5 : 0);
    threeScene.fog = PX.fog;
    if (starField) starField.material.opacity = PX.saved.star * padxSmooth((alt - 12) / 45);
    PX.halo.material.opacity = 0.32 * padxSmooth((h - 250) / 600);
    PX.cloudShell.material.opacity = 0.45 + 0.4 * padxSmooth((h - 60) / 300);
    const near = 1 - padxSmooth((h - 300) / 700);
    PX.groundMat.opacity = near; PX.ground.visible = near > 0.01;
    PX.fac.visible = h < 1400;
    const cl = 0.85 * (1 - padxSmooth((h - 900) / 800));
    for (let i = 0; i < PX.clouds.length; i++) { PX.clouds[i].material.opacity = cl; PX.clouds[i].visible = cl > 0.01; }

    // Camera views (smooth 1.2 s blend when the view changes)
    const base = launchStackGroup.position, C = PX.v3.copy(base).addScaledVector(up, PX.stackH * 0.5);
    const dp = PX.dpos, dl = PX.dlook;
    if (PX.cam === 'pad') { dp.set(13, GY + 1.8, 16); dl.copy(C); }
    else if (PX.cam === 'fp') {
        dp.copy(base).addScaledVector(up, PX.stackH + 0.5);
        const sp = camSpherical;
        dl.set(-Math.sin(sp.phi) * Math.sin(sp.theta), -Math.cos(sp.phi), -Math.sin(sp.phi) * Math.cos(sp.theta)).multiplyScalar(60).add(dp);
    }
    else if (PX.cam === 'earth') { dp.copy(C); dp.y += 17; dp.z += 0.6; dl.copy(C); dl.y -= 60; }
    else if (PX.cam === 'space') { dp.copy(C); dp.x -= 12; dp.y += 5; dp.z += 36; dl.copy(C); }
    else { dp.copy(threeCamera.position); dl.copy(smoothedLookAt); }
    if (PX.blend < 1) {
        PX.blend = Math.min(1, PX.blend + PX.dt / 1.2);
        const e = padxSmooth(PX.blend);
        PX.pos.copy(PX.fromPos).lerp(dp, e); PX.look.copy(PX.fromLook).lerp(dl, e);
    } else { PX.pos.copy(dp); PX.look.copy(dl); }
    threeCamera.position.copy(PX.pos);
    const shake = (!PX.shakeOk || PX.paused) ? 0 : ignition ? 0.035 : (flying && !PX.orbit) ? 0.07 * Math.exp(-alt / 9) + 0.008 : 0;
    if (shake > 0) {
        const k = PX.cam === 'pad' ? 0.5 : 1;
        threeCamera.position.x += (Math.random() - 0.5) * shake * k; threeCamera.position.y += (Math.random() - 0.5) * shake * k;
    }
    threeCamera.lookAt(PX.look);
    const fov = PX.cam === 'fp' ? 62 : PX.saved.fov;
    if (Math.abs(threeCamera.fov - fov) > 0.05) { threeCamera.fov += (fov - threeCamera.fov) * 0.1; threeCamera.updateProjectionMatrix(); }

    PadAudio.update(ignition, flying, alt);
    padxSyncHud(flying, ignition);
}

/* ---------- Free flight: the same ascent with no mission attached ---------- */
function padxFreeLaunch() {
    if (LX.cdTimer || state.ascent.active) return;
    try { SoundFX.click(); } catch (e) { /* no audio */ }
    if (cameraMode !== 'pad') setCameraViewMode('pad');
    resetPadAscentState();
    padxClearSmoke();
    PX.free = true; PX.orbit = false; PX.paused = false; PX.lastKind = 'free';
    LX.showing = true;
    launchSetMilestone('countdown');
    const calls = { 10: 'Range is green', 7: 'Flight computer in startup', 5: 'Propellant tanks pressurised', 3: 'Engine ignition sequence start', 1: 'Hold-down clamps armed', 0: 'LIFTOFF!' };
    let t = 10;
    const tick = () => {
        LX.count = t; padxCountdownTick(t);
        launchOverlay(`<div class="lx-cd"><span>T−</span>${String(t).padStart(2, '0')}</div><div class="lx-call">${calls[t] || ''}</div>
            <div class="lx-call" style="opacity:.7">Free flight · no mission or score</div>
            <button class="lx-skip" onclick="padxFreeLiftoff()">Skip countdown</button>`, 'lx-countdown');
        if (t <= 3 && t > 0) SoundFX.beep(660, 0.09, 'square', 0.05);
        if (t === 0) { padxFreeLiftoff(); return; }
        t--;
    };
    tick();
    LX.cdTimer = setInterval(tick, 1000);
    padxRenderControls();
}
function padxFreeLiftoff() {
    if (!PX.free) return;
    if (LX.cdTimer) { clearInterval(LX.cdTimer); LX.cdTimer = null; }
    LX.count = null;
    launchOverlay('');
    launchSetMilestone('liftoff');
    state.ascent.active = true; state.ascent.stageIndex = 1;
    try { SoundFX.rumble(1.2); SoundFX.quindar(); } catch (e) { /* no audio */ }
    updateAscentHUD();
    padxRenderControls();
}
function padxEndFree(keepCamera) {
    if (LX.cdTimer && PX.free) { clearInterval(LX.cdTimer); LX.cdTimer = null; LX.count = null; }
    PX.free = false; PX.orbit = false; PX.paused = false;
    launchOverlay('');
    LX.showing = false; renderLaunchMilestones();
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* no speech */ }
    state.ascent.active = false;
    resetPadAscentState();
    padxClearSmoke();
    if (!keepCamera) padxRenderControls();
}
// SECO: a free flight stays in space to look around; a mission continues into deployment as before
const _pxComplete = completeAscentIntoOrbit;
completeAscentIntoOrbit = function () {
    if (PX.free) {
        PX.orbit = true;
        state.ascent.stageIndex = 5; state.ascent.manualStageBonus = 0;
        launchSetMilestone('seco');
        try { SoundFX.success(); } catch (e) { /* no audio */ }
        padxSay('Engine cutoff. Welcome to space.');
        padxRenderControls();
        return;
    }
    return _pxComplete.apply(this, arguments);
};

// A mission launch always replaces a free flight (so a free flight can never reach the mission simulation)
const _pxStart = start3DPadAscentSequence;
start3DPadAscentSequence = function () { if (PX.free) padxEndFree(true); return _pxStart.apply(this, arguments); };

/* ---------- Controls ---------- */
function padxTogglePause() {
    if (!state.ascent.active) return;
    PX.paused = !PX.paused;
    try { SoundFX.click(); } catch (e) { /* no audio */ }
    padxRenderControls();
}
function padxAbort() {
    const missionCountdown = LX.cdTimer && !PX.free;
    if (missionCountdown) { clearInterval(LX.cdTimer); LX.cdTimer = null; LX.count = null; }
    padxEndFree();                       // also resets the pad, rocket, milestones and overlay
}
function padxRestart() {
    const kind = PX.free ? 'free' : (state.ascent.active || LX.cdTimer) ? 'mission' : (PX.lastKind || 'free');
    padxAbort();
    if (kind === 'mission') start3DPadAscentSequence(); else padxFreeLaunch();
}
function padxReturnToPad() {
    try { SoundFX.click(); } catch (e) { /* no audio */ }
    padxAbort();
    padxSetCam('track');
}
function padxSetCam(id) {
    if (!PADX_CAMS.some(c => c[0] === id)) return;
    if (PX.ready && PX.on) { PX.fromPos.copy(PX.pos); PX.fromLook.copy(PX.look); PX.blend = 0; }
    PX.cam = id;
    try { SoundFX.click(); } catch (e) { /* no audio */ }
    padxRenderControls();
}
function padxToggleSpeed() { PX.speed = PX.speed === 1 ? 3 : 1; padxRenderControls(); }

function padxRenderControls() {
    const host = document.getElementById('ascentControlOverlay'); if (!host) return;
    let el = document.getElementById('padxControls');
    if (!el) { el = document.createElement('div'); el.id = 'padxControls'; el.className = 'no-terms'; host.appendChild(el); }
    const view3d = !PX.broken && typeof webglFallbackMode !== 'undefined' && !webglFallbackMode && !!threeRenderer;
    if (!view3d) {
        el.innerHTML = `<p class="px-note"><i class="ph-fill ph-warning"></i> The 3D flight view is not available on this device, so the launch plays in the simplified view.</p>`;
        return;
    }
    const asc = state.ascent, flying = !!asc.active, counting = !!LX.cdTimer, busy = flying || counting;
    const dis = b => b ? '' : 'disabled';
    el.innerHTML = `
        <div class="px-layer"><span>ATMOSPHERE</span><b id="padxLayer">${padxLayerName(PX.altKm || 0, flying)}</b></div>
        <button id="padxFreeBtn" class="px-launch" onclick="padxFreeLaunch()" ${dis(!busy)} title="Fly from the pad to space without starting a mission">
            <i class="ph-fill ph-rocket-launch"></i> ${PX.orbit ? 'In orbit — free flight' : PX.free && busy ? 'Free flight in progress' : 'Launch rocket · free flight'}</button>
        <div class="px-row3">
            <button onclick="padxTogglePause()" ${dis(flying)} aria-pressed="${PX.paused}"><i class="ph-fill ${PX.paused ? 'ph-play' : 'ph-pause'}"></i> ${PX.paused ? 'Resume' : 'Pause'}</button>
            <button onclick="padxRestart()" ${dis(busy || !!PX.lastKind)}><i class="ph-bold ph-arrow-counter-clockwise"></i> Restart</button>
            <button onclick="padxReturnToPad()" ${dis(busy)}><i class="ph-bold ph-arrow-u-down-left"></i> To pad</button>
        </div>
        <div class="px-k">CAMERA VIEW</div>
        <div class="px-cams">${PADX_CAMS.map(c => `<button onclick="padxSetCam('${c[0]}')" class="${PX.cam === c[0] ? 'on' : ''}" aria-pressed="${PX.cam === c[0]}" title="${c[3]}"><i class="ph ${c[2]}"></i> ${c[1]}</button>`).join('')}</div>
        <div class="px-foot"><button onclick="padxToggleSpeed()" title="Flight speed" aria-pressed="${PX.speed !== 1}"><i class="ph-bold ph-fast-forward"></i> Speed ${PX.speed}×</button>
            <span>${PX.cam === 'fp' ? 'Drag to look around' : PX.cam === 'track' ? 'Drag to orbit · scroll to zoom' : PADX_CAMS.find(c => c[0] === PX.cam)[3]}</span></div>`;
    const main = document.getElementById('ascentActionBtn'), banner = document.getElementById('ascentStatusBanner');
    if (main) main.style.display = (PX.free && (counting || PX.orbit)) ? 'none' : '';
    if (PX.orbit && banner) banner.textContent = `Engine cutoff at ${asc.altitudeKm.toFixed(0)} km. You are in space — switch camera views to look around, then return to the pad.`;
    else if (PX.free && flying && banner && asc.stageIndex === 1 && asc.timer < 0.3) banner.textContent = 'LIFTOFF! Free flight — staging runs automatically unless Manual Staging is on.';
}
// Cheap per-frame HUD sync: only touches the DOM when something changed
function padxSyncHud(flying, ignition) {
    const sig = [flying, !!LX.cdTimer, PX.orbit, PX.paused, PX.free, PX.cam, PX.speed, state.ascent.stageIndex].join('|');
    if (sig !== PX.sig) { PX.sig = sig; padxRenderControls(); }
    const name = ignition ? 'On the pad · engines igniting' : padxLayerName(PX.altKm || 0, flying);
    if (name !== PX.layerName) { PX.layerName = name; const l = document.getElementById('padxLayer'); if (l) l.textContent = name; }
}

/* ---------- Leaving the pad view or PLAY GAME ends a free flight and silences launch audio ---------- */
const _pxSetCam = setCameraViewMode;
setCameraViewMode = function (mode) {
    if (mode !== 'pad' && PX.free) padxEndFree(true);
    const r = _pxSetCam.apply(this, arguments);
    if (mode === 'pad') padxRenderControls(); else PadAudio.stop();
    return r;
};
const _pxSwitchApp = switchAppExperience;
switchAppExperience = function (t) {
    if (t !== 'game') { if (PX.free) padxEndFree(true); PadAudio.stop(); try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* no speech */ } }
    return _pxSwitchApp.apply(this, arguments);
};
setTimeout(padxRenderControls, 0);

