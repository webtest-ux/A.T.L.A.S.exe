/* A.T.L.A.S · section 16D — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16D. PLANET ENGINE CORE — GPU texture baker (lazy, cached, LOD tiers,
 *      LRU eviction, disposal), shared geometry cache, ring profiles,
 *      CPU noise for irregular shapes, small-body point shaders.
 ***********************************************************************/
/* ---------- Diagnostics & safe mode ----------
 * Any runtime error is shown in a small on-screen banner (once per source) instead of failing silently.
 * Add ?safe=1 to the URL to disable GPU texture baking, belts and shader effects. */
const AERO_SAFE = /[?&]safe=1/.test(location.search);
// Quality: 'standard' (default) uses light canvas textures; 'ultra' enables the GPU texture baker.
// The baker's shader is large; some GPU drivers (notably ANGLE/Direct3D on Windows laptops) can hang or reset
// while compiling or running it, so it is opt-in.
const AERO_ULTRA = !AERO_SAFE && (/[?&]quality=ultra/.test(location.search) || (() => { try { return localStorage.getItem('aeroQuality') === 'ultra'; } catch (e) { return false; } })());
function aeroSetQuality(q) {
    try { localStorage.setItem('aeroQuality', q); } catch (e) { /* storage blocked */ }
    location.href = location.pathname + (q === 'ultra' ? '?quality=ultra' : '');
}
const _aeroErrSeen = {};
function aeroReportError(where, err) {
    const msg = String((err && (err.stack || err.message)) || err);
    if (_aeroErrSeen[where]) return;
    _aeroErrSeen[where] = true;
    console.error('[ATLAS] ' + where + ':', err);
    let el = document.getElementById('aeroErrorBanner');
    if (!el) {
        el = document.createElement('div');
        el.id = 'aeroErrorBanner';
        el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;max-width:min(560px,calc(100% - 24px));max-height:40vh;overflow:auto;padding:10px 12px;border-radius:10px;background:rgba(127,29,29,.94);color:#fee2e2;font:12px/1.4 ui-monospace,monospace;box-shadow:0 8px 30px rgba(0,0,0,.5);white-space:pre-wrap';
        el.innerHTML = '<b>Something went wrong.</b> The app is still running, but a feature may not respond. Try again, or ' + '<a href="?safe=1" style="color:#fde68a;text-decoration:underline">reload in safe mode</a> (lighter 3D). Details for reporting are below. · <a href="#" onclick="this.parentNode.remove();return false" style="color:#fde68a">dismiss</a>\n';
        document.body.appendChild(el);
    }
    el.appendChild(document.createTextNode('\n[' + where + '] ' + msg.split('\n').slice(0, 4).join('\n')));
}
window.addEventListener('error', e => aeroReportError('script ' + (e.lineno || ''), e.error || e.message));
window.addEventListener('unhandledrejection', e => aeroReportError('promise', e.reason));

const AERO_TIERS = { xs: [512, 256], lo: [1024, 512], hi: [2048, 1024] };
const AERO_TIER_RANK = { xs: 0, lo: 1, hi: 2 };

// Safe mode by default: the large GPU texture-baking shader can crash the GPU process on some
// Windows/ANGLE drivers (white 3D view + sad-face icon). Opt in with ?hq=1 or the Layers panel toggle.
const AERO_HQ = (() => { try { return /[?&]hq=1/.test(location.search) || localStorage.getItem('aeroHQ') === '1'; } catch (e) { return false; } })();
const PlanetBaker = (function () {
    let ready = false, scene = null, cam = null, mat = null, quad = null, lost = false;
    const cache = {};          // key "recipe|tier" -> { albedo, normal, height, elev, mask, tier, recipe, used, done, pinned }
    const bindings = new Set(); // { material, recipe, want, normal, alphaOnly, onUpgrade, shown }
    const jobs = [];            // time-sliced bake jobs (a few hundred rows per frame at most)
    const MAX_HI = 5;
    // Pixel budget per frame adapts to the measured frame time, so baking never stalls the GPU
    // (a full 2048×1024 bake in one draw call can exceed the driver's GPU-timeout on laptops).
    let budget = 24576, lastPumpT = 0, recipeKey = '';
    let bakesDone = 0, rowsDone = 0, lastError = '';
    // Finer crater octaves are invisible at small sizes — cap them per tier (cuts the shader cost)
    const OCT_CAP = { xs: 3, lo: 4, hi: 6 };

    function available() {
        return !!(AERO_HQ && threeRenderer && !webglFallbackMode && !lost && typeof AERO_GLSL !== 'undefined');
    }
    function init() {
        if (ready || !available()) return ready;
        try {
            const prog = AERO_GLSL.build(AERO_GLSL.bakeVertex, AERO_GLSL.bakeFragment);
            mat = new THREE.ShaderMaterial({
                vertexShader: prog.vertexShader, fragmentShader: prog.fragmentShader,
                uniforms: {
                    uPass: { value: 1 }, uStyle: { value: 0 }, uSeed: { value: 1 },
                    uColA: { value: new THREE.Vector3() }, uColB: { value: new THREE.Vector3() }, uColC: { value: new THREE.Vector3() }, uColD: { value: new THREE.Vector3() },
                    uNoiseScale: { value: 2.5 }, uMottle: { value: 0.4 }, uRelief: { value: 1 }, uRidge: { value: 0 },
                    uCraterDensity: { value: 0.5 }, uCraterAmp: { value: 1 }, uCraterMinScale: { value: 4 }, uCraterOctaves: { value: 4 }, uCraterRays: { value: 0.6 },
                    uFracture: { value: 0 }, uFractureScale: { value: 3 }, uFractureCol: { value: new THREE.Vector3() },
                    uGroove: { value: 0 }, uTwoTone: { value: 0 }, uTwoToneLon: { value: 0 },
                    uPolar: { value: new THREE.Vector4(95, 95, 0, 0) }, uPolarCol: { value: new THREE.Vector3(0.92, 0.92, 0.92) },
                    uDichotomy: { value: 0 }, uSpots: { value: 0 },
                    uBands: { value: new Float32Array(64) }, uBandN: { value: 0 }, uTurb: { value: 0 }, uStreaks: { value: 0 },
                    uFeatA: { value: new Float32Array(112) }, uFeatB: { value: new Float32Array(112) }, uFeatN: { value: 0 },
                    uHeightTex: { value: null }, uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 512) },
                    uNormalStrength: { value: 10 }, uAlphaMode: { value: 0 }
                },
                depthTest: false, depthWrite: false
            });
            quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
            quad.frustumCulled = false;
            scene = new THREE.Scene();
            scene.add(quad);
            cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            const cv = threeRenderer.domElement;
            if (cv && cv.addEventListener) {
                cv.addEventListener('webglcontextlost', () => { lost = true; jobs.length = 0; aeroReportError('webgl', 'WebGL context lost (GPU reset). The page will try to recover; if it repeats, use safe mode.'); });
                cv.addEventListener('webglcontextrestored', () => { lost = false; resetAfterContextLoss(); });
            }
            ready = true;
        } catch (e) { lastError = String(e && e.message || e); ready = false; }
        return ready;
    }
    function setRecipe(name, W, H, tier) {
        const R = Object.assign({}, AERO_RECIPE_DEFAULTS, AERO_RECIPES[name] || AERO_RECIPES.generic_gray);
        const u = mat.uniforms;
        u.uStyle.value = R.style; u.uSeed.value = R.seed;
        u.uColA.value.fromArray(R.colA); u.uColB.value.fromArray(R.colB); u.uColC.value.fromArray(R.colC); u.uColD.value.fromArray(R.colD);
        u.uNoiseScale.value = R.noiseScale; u.uMottle.value = R.mottle; u.uRelief.value = R.relief; u.uRidge.value = R.ridge;
        u.uCraterDensity.value = R.craterDensity; u.uCraterAmp.value = R.craterAmp; u.uCraterMinScale.value = R.craterMinScale;
        u.uCraterOctaves.value = Math.min(R.craterOctaves, OCT_CAP[tier] || 4); u.uCraterRays.value = R.craterRays;
        u.uFracture.value = R.fracture; u.uFractureScale.value = R.fractureScale; u.uFractureCol.value.fromArray(R.fractureCol);
        u.uGroove.value = R.groove; u.uTwoTone.value = R.twoTone; u.uTwoToneLon.value = R.twoToneLon;
        u.uPolar.value.fromArray(R.polar); u.uPolarCol.value.fromArray(R.polarCol);
        u.uDichotomy.value = R.dichotomy; u.uSpots.value = R.spots;
        const bands = new Float32Array(64); R.bands.slice(0, 16).forEach((b, i) => bands.set(b, i * 4));
        u.uBands.value = bands; u.uBandN.value = Math.min(16, R.bands.length);
        u.uTurb.value = R.turb; u.uStreaks.value = R.streaks;
        const fa = new Float32Array(112), fb = new Float32Array(112);
        R.feats.slice(0, 28).forEach((f, i) => { fa.set(f.slice(0, 4), i * 4); fb.set(f.slice(4, 8), i * 4); });
        u.uFeatA.value = fa; u.uFeatB.value = fb; u.uFeatN.value = Math.min(28, R.feats.length);
        u.uTexel.value.set(1 / W, 1 / H);
        u.uNormalStrength.value = R.normalStrength; u.uAlphaMode.value = R.alphaMode;
    }
    function makeRT(W, H, nearest, mips) {
        const rt = new THREE.WebGLRenderTarget(W, H, {
            minFilter: nearest ? THREE.NearestFilter : (mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter),
            magFilter: nearest ? THREE.NearestFilter : THREE.LinearFilter,
            wrapS: THREE.RepeatWrapping, wrapT: THREE.ClampToEdgeWrapping,
            format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
            depthBuffer: false, stencilBuffer: false
        });
        rt.texture.generateMipmaps = false;          // switched on for the final strip only
        rt.userData = { mips: !!mips && !nearest };
        if (!nearest && threeRenderer) rt.texture.anisotropy = Math.min(8, threeRenderer.capabilities.getMaxAnisotropy());
        return rt;
    }
    const STAGE = { h: ['height', 0, true], a: ['albedo', 1, false], n: ['normal', 2, false], elev: ['elev', 3, false], mask: ['mask', 4, false] };

    // Queue a bake. opts: { extras: ['elev'|'mask'], pin, cb(entry) }. Completed entries call cb immediately.
    function request(recipe, tier, urgent, opts) {
        opts = opts || {};
        const key = recipe + '|' + tier, extras = opts.extras || [];
        const e = cache[key];
        if (e && e.done && extras.every(x => e[x])) {
            e.used = performance.now();
            if (opts.pin) e.pinned = true;
            if (opts.cb) opts.cb(e);
            return;
        }
        let j = jobs.find(q => q.key === key);
        if (!j) {
            j = { key, recipe, tier, extras: [], pin: false, cbs: [], si: 0, row: 0, stages: null };
            if (urgent) jobs.unshift(j); else jobs.push(j);
        } else if (urgent && jobs[0] !== j) {
            jobs.splice(jobs.indexOf(j), 1); jobs.unshift(j);
        }
        extras.forEach(x => { if (!j.extras.includes(x)) { j.extras.push(x); if (j.stages) j.stages.push(x); } });
        if (opts.pin) j.pin = true;
        if (opts.cb) j.cbs.push(opts.cb);
    }
    function startJob(j) {
        const [W, H] = AERO_TIERS[j.tier] || AERO_TIERS.lo;
        j.W = W; j.H = H;
        let e = cache[j.key];
        if (!e) { e = { recipe: j.recipe, tier: j.tier, used: performance.now(), done: false }; cache[j.key] = e; }
        j.e = e;
        j.stages = (e.done ? [] : ['h', 'a', 'n']).concat(j.extras.filter(x => !e[x]));
    }
    function finishJob(j) {
        const e = j.e;
        e.done = true; e.used = performance.now();
        if (j.pin) e.pinned = true;
        bakesDone++;
        bindings.forEach(b => {
            if (b.recipe !== j.recipe) return;
            if (AERO_TIER_RANK[j.tier] > AERO_TIER_RANK[b.want]) return;
            if (!b.shown || AERO_TIER_RANK[j.tier] > AERO_TIER_RANK[b.shown]) apply(b, e);
        });
        j.cbs.forEach(cb => { try { cb(e); } catch (err) { lastError = String(err && err.message || err); } });
        if (j.tier === 'hi') evict();
    }
    // Render at most `budget` pixels of pending bake work (horizontal strips via the render-target scissor).
    function pump() {
        const now = performance.now();
        const dt = lastPumpT ? now - lastPumpT : 16;
        lastPumpT = now;
        if (!jobs.length || !available() || !init()) return;
        if (dt > 45) budget = Math.max(8192, budget * 0.5);
        else if (dt < 22) budget = Math.min(196608, budget * 1.2);
        if (dt > 120) return;                      // a long frame: give the GPU a break this frame
        let left = budget;
        const prevRT = threeRenderer.getRenderTarget();
        const prevAutoClear = threeRenderer.autoClear;
        threeRenderer.autoClear = false;
        try {
            while (left > 0 && jobs.length) {
                const j = jobs[0];
                if (!j.stages) startJob(j);
                if (j.si >= j.stages.length) { jobs.shift(); finishJob(j); continue; }
                const st = j.stages[j.si], [field, passId, nearest] = STAGE[st];
                const e = j.e;
                if (!e[field]) e[field] = makeRT(j.W, j.H, nearest, !nearest);
                const rk = j.key;
                if (recipeKey !== rk) { setRecipe(j.recipe, j.W, j.H, j.tier); recipeKey = rk; }
                mat.uniforms.uHeightTex.value = st === 'h' ? null : e.height.texture;
                mat.uniforms.uPass.value = passId;
                const rows = Math.max(4, Math.min(j.H - j.row, Math.floor(left / j.W)));
                const rt = e[field];
                rt.scissor.set(0, j.row, j.W, rows);
                rt.scissorTest = true;
                rt.texture.generateMipmaps = rt.userData.mips && (j.row + rows >= j.H);
                threeRenderer.setRenderTarget(rt);
                threeRenderer.render(scene, cam);
                rt.texture.generateMipmaps = false;
                rt.scissorTest = false;
                j.row += rows; left -= rows * j.W; rowsDone += rows;
                if (j.row >= j.H) { j.si++; j.row = 0; }
            }
        } catch (err) {
            lastError = String(err && err.message || err);
            aeroReportError('texture baker', err);
            jobs.shift();
        } finally {
            mat.uniforms.uHeightTex.value = null;
            threeRenderer.setRenderTarget(prevRT);
            threeRenderer.autoClear = prevAutoClear;
        }
    }
    function disposeEntry(e) {
        ['height', 'albedo', 'normal', 'elev', 'mask'].forEach(k => { if (e[k]) { e[k].dispose(); e[k] = null; } });
    }
    function evict() {
        const his = Object.values(cache).filter(e => e.tier === 'hi' && e.done && !e.pinned).sort((a, b) => a.used - b.used);
        while (his.length > MAX_HI) { // Play Game destination maps are pinned and never evicted
            const old = his.shift();
            bindings.forEach(b => { if (b.recipe === old.recipe && b.shown === 'hi') { b.shown = null; apply(b, best(old.recipe, 'lo')); } });
            disposeEntry(old);
            delete cache[old.recipe + '|hi'];
        }
    }
    function resetAfterContextLoss() {
        // Render-target contents do not survive a lost context: drop them and re-bake what is bound.
        Object.keys(cache).forEach(k => { disposeEntry(cache[k]); delete cache[k]; });
        jobs.length = 0; recipeKey = '';
        bindings.forEach(b => { b.shown = null; request(b.recipe, 'xs', true); if (b.want !== 'xs') request(b.recipe, b.want); });
    }
    function best(recipe, maxTier) {
        const order = ['hi', 'lo', 'xs'].filter(t => AERO_TIER_RANK[t] <= AERO_TIER_RANK[maxTier || 'hi']);
        for (const t of order) { const e = cache[recipe + '|' + t]; if (e && e.done && e.albedo) return e; }
        return null;
    }
    function apply(b, e) {
        if (!e || !b.material) return;
        const m = b.material;
        if (b.alphaOnly) { m.alphaMap = e.albedo.texture; m.map = e.albedo.texture; }
        else { m.map = e.albedo.texture; if (b.normal !== false) { m.normalMap = e.normal.texture; } }
        m.needsUpdate = true;
        b.shown = e.tier;
        e.used = performance.now();
        if (b.onUpgrade) b.onUpgrade(e);
    }
    // Bind a material to a recipe: shows the best finished tier now and upgrades as better tiers finish.
    function bind(material, recipe, want, opts) {
        opts = opts || {};
        const b = { material, recipe, want: want || 'lo', normal: opts.normal, alphaOnly: !!opts.alphaOnly, onUpgrade: opts.onUpgrade, shown: null };
        bindings.add(b);
        if (material && material.addEventListener) material.addEventListener('dispose', () => bindings.delete(b));
        const now = best(recipe, b.want);
        if (now) apply(b, now);
        if (!now) request(recipe, 'xs', false);
        if (b.want !== 'xs' && (!now || now.tier !== b.want)) request(recipe, b.want, false);
        return b;
    }
    function setWant(b, want) {
        if (!b || b.want === want) return;
        b.want = want;
        const e = best(b.recipe, want);
        if (e && e.tier !== b.shown) apply(b, e);
        if (!e || e.tier !== want) request(b.recipe, want, true);   // the body the viewer is approaching goes first
    }
    function stats() {
        const tiers = { xs: 0, lo: 0, hi: 0 };
        Object.values(cache).forEach(e => { if (e.done) tiers[e.tier]++; });
        return { ready, bakes: bakesDone, rows: rowsDone, budgetPx: Math.round(budget), cached: tiers, queued: jobs.length, bindings: bindings.size, error: lastError, contextLost: lost };
    }
    return { available, init, request, bind, setWant, pump, stats, best };
})();

/* ---------- Shared unit-sphere geometries (LOD) ---------- */
const AERO_GEO = {};
function aeroSphere(seg) {
    const k = 's' + seg;
    if (!AERO_GEO[k]) AERO_GEO[k] = new THREE.SphereGeometry(1, seg, Math.max(8, seg >> 1));
    return AERO_GEO[k];
}
const AERO_LOD_SEGS = [24, 48, 96, 160];

/* ---------- Small deterministic CPU noise (irregular moons, belts) ---------- */
function aeroHash(n) { const s = Math.sin(n) * 43758.5453123; return s - Math.floor(s); }
function aeroNoise3(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const h = (a, b, c) => aeroHash((ix + a) * 157.0 + (iy + b) * 113.0 + (iz + c) * 271.0);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(0, 0, 0), h(1, 0, 0), ux), l(h(0, 1, 0), h(1, 1, 0), ux), uy),
             l(l(h(0, 0, 1), h(1, 0, 1), ux), l(h(0, 1, 1), h(1, 1, 1), ux), uy), uz) * 2 - 1;
}
// Irregular body: unit sphere scaled to its tri-axial shape (from published semi-axes) plus low-amplitude noise relief.
function aeroIrregularGeometry(id, axes, R, rough) {
    const g = new THREE.SphereGeometry(1, 64, 32);
    const p = g.attributes.position;
    const ax = axes ? [axes[0] / R, axes[2] / R, axes[1] / R] : [1, 1, 1];
    const seed = id.length * 3.17;
    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        let n = 0, a = 1, f = 1.6;
        for (let o = 0; o < 4; o++) { n += a * aeroNoise3(x * f + seed, y * f - seed, z * f + seed * 0.5); a *= 0.5; f *= 2.1; }
        const s = 1 + (rough || 0.12) * n;
        p.setXYZ(i, x * ax[0] * s, y * ax[1] * s, z * ax[2] * s);
    }
    g.computeVertexNormals();
    return g;
}

/* ---------- Ring radial profiles (published ring radii; opacity values approximate) ---------- */
const AERO_RING_SPECS = {
    // radii in km; [r0, r1, opacity, r, g, b]
    saturn: { R: 58232, inner: 74658, outer: 140400, faint: false, zones: [
        [74658, 92000, 0.16, .52, .47, .42], [92000, 117580, 0.92, .86, .79, .66], [117580, 122170, 0.07, .40, .37, .33],
        [122170, 133423, 0.62, .78, .72, .62], [133423, 133745, 0.02, .3, .3, .3], [133745, 136488, 0.55, .74, .69, .60],
        [136488, 136530, 0.02, .3, .3, .3], [136530, 136775, 0.5, .72, .67, .58], [139900, 140400, 0.30, .85, .82, .76]],
      note: 'C, B (bright), Cassini Division, A ring with Encke & Keeler gaps, narrow F ring. Radii from NASA Saturn ring fact sheet; opacity approximate.' },
    uranus: { R: 25362, inner: 38000, outer: 51600, faint: true, zones: [
        [41837, 41840, 0.6, .4, .4, .42], [42234, 42236, 0.6, .4, .4, .42], [42571, 42573, 0.6, .4, .4, .42],
        [44718, 44726, 0.65, .42, .42, .44], [45661, 45671, 0.65, .42, .42, .44], [47176, 47178, 0.5, .4, .4, .42],
        [47627, 47628, 0.5, .4, .4, .42], [48300, 48303, 0.6, .42, .42, .44], [50023, 50025, 0.3, .4, .4, .42], [51120, 51180, 0.85, .5, .5, .52]],
      note: 'Narrow dark rings 6, 5, 4, α, β, η, γ, δ, λ and the bright ε ring (Voyager 2 / ground occultations). Widths exaggerated for visibility.' },
    neptune: { R: 24622, inner: 40000, outer: 63100, faint: true, zones: [
        [40900, 42900, 0.10, .45, .40, .38], [53150, 53250, 0.35, .45, .40, .38], [53250, 57200, 0.05, .45, .40, .38],
        [57150, 57250, 0.20, .45, .40, .38], [62880, 62990, 0.45, .5, .45, .42]],
      note: 'Galle, Le Verrier, Lassell, Arago and Adams rings (Voyager 2). Adams-ring arcs are not drawn. Very faint in reality.' },
    jupiter: { R: 69911, inner: 92000, outer: 129500, faint: true, zones: [
        [92000, 122500, 0.05, .55, .45, .38], [122500, 129000, 0.22, .62, .50, .40]],
      note: 'Halo and main ring (Voyager / Galileo / Juno). The outer gossamer rings are not drawn. Extremely faint in reality; brightened here for visibility.' }
};
const AERO_RING_TEX = {};
function aeroRingProfileTexture(id) {
    if (AERO_RING_TEX[id]) return AERO_RING_TEX[id];
    const spec = AERO_RING_SPECS[id];
    const N = 2048;
    const c = document.createElement('canvas'); c.width = N; c.height = 4;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(N, 4);
    const span = spec.outer - spec.inner;
    for (let i = 0; i < N; i++) {
        const rkm = spec.inner + (i + 0.5) / N * span;
        let a = 0, col = [0, 0, 0];
        const pxKm = span / N;
        spec.zones.forEach(z => {
            // Narrow rings are widened to at least ~1.4 texels so they stay visible.
            const half = Math.max((z[1] - z[0]) / 2, pxKm * 0.7), mid = (z[0] + z[1]) / 2;
            if (Math.abs(rkm - mid) <= half) { a = Math.max(a, z[2]); col = [z[3], z[4], z[5]]; }
        });
        if (id === 'saturn' && a > 0.1) {
            const ringlet = 0.82 + 0.18 * Math.sin(rkm * 0.0021) * Math.sin(rkm * 0.00057 + 1.3) + 0.08 * aeroNoise3(rkm * 0.004, 0.5, 1.5);
            a = Math.min(1, a * ringlet);
            col = col.map(v => v * (0.9 + 0.12 * ringlet));
        }
        for (let row = 0; row < 4; row++) {
            const o = (row * N + i) * 4;
            img.data[o] = Math.min(255, col[0] * 255); img.data[o + 1] = Math.min(255, col[1] * 255); img.data[o + 2] = Math.min(255, col[2] * 255);
            img.data[o + 3] = Math.min(255, a * 255);
        }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    AERO_RING_TEX[id] = t;
    return t;
}
function aeroRingMesh(id) {
    const spec = AERO_RING_SPECS[id];
    const inner = spec.inner / spec.R, outer = spec.outer / spec.R;
    const g = new THREE.RingGeometry(inner, outer, 256, 1);
    const prog = AERO_GLSL.build(AERO_GLSL.ringVertex, AERO_GLSL.ringFragment);
    const mat = new THREE.ShaderMaterial({
        vertexShader: prog.vertexShader, fragmentShader: prog.fragmentShader,
        uniforms: {
            uProfile: { value: aeroRingProfileTexture(id) }, uInner: { value: inner }, uOuter: { value: outer },
            uPlanetCenter: { value: new THREE.Vector3() }, uPlanetRadius: { value: 1 }, uSunPos: { value: new THREE.Vector3() },
            uOpacity: { value: spec.faint ? 1.0 : 1.0 }
        },
        transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = -Math.PI / 2;
    m.userData.ringId = id;
    return m;
}

/* ---------- Shader materials: Sun, glow, haze ---------- */
function aeroShaderMaterial(vKey, fKey, uniforms, extra) {
    const prog = AERO_GLSL.build(AERO_GLSL[vKey], AERO_GLSL[fKey]);
    return new THREE.ShaderMaterial(Object.assign({ vertexShader: prog.vertexShader, fragmentShader: prog.fragmentShader, uniforms }, extra || {}));
}
function aeroHazeMaterial(color, power, intensity, base) {
    return aeroShaderMaterial('hazeVertex', 'hazeFragment', {
        uColor: { value: new THREE.Color(color) }, uSunPos: { value: new THREE.Vector3() },
        uPower: { value: power }, uIntensity: { value: intensity }, uBase: { value: base || 0 }
    }, { transparent: true, depthWrite: false, side: THREE.FrontSide });
}

/* ---------- Small-body belts: Keplerian motion computed in the vertex shader ---------- */
AERO_GLSL.beltVertex = `
attribute vec4 aOrbit;   // a (AU), e, inclination (rad), node (rad)
attribute vec2 aPhase;   // mean anomaly at epoch (rad), argument of perihelion (rad)
attribute vec3 aColor;
uniform float uDays;
uniform float uScientific;
uniform float uAuUnits;
uniform float uSize;
uniform float uPixelRatio;
varying vec3 vColor;
float auToCin(float r){
    float lr = log(max(r, 0.05));
    // piecewise-log mapping anchored on the cinematic planet distances (Mercury … Neptune)
    if (lr < -0.949) return 9.2 * exp((lr + 0.949) * 0.6);
    if (lr < -0.324) return mix(9.2, 13.5, (lr + 0.949) / 0.625);
    if (lr < 0.0) return mix(13.5, 18.8, (lr + 0.324) / 0.324);
    if (lr < 0.421) return mix(18.8, 24.5, lr / 0.421);
    if (lr < 1.649) return mix(24.5, 34.5, (lr - 0.421) / 1.228);
    if (lr < 2.260) return mix(34.5, 45.5, (lr - 1.649) / 0.611);
    if (lr < 2.954) return mix(45.5, 55.5, (lr - 2.260) / 0.694);
    if (lr < 3.404) return mix(55.5, 64.5, (lr - 2.954) / 0.450);
    return 64.5 + (lr - 3.404) * 20.0;
}
void main(){
    float a = aOrbit.x, e = aOrbit.y;
    float n = 0.01720209895 / (a * sqrt(a));
    float M = aPhase.x + n * uDays;
    float E = M;
    for (int k = 0; k < 4; k++) { E = E - (E - e * sin(E) - M) / (1.0 - e * cos(E)); }
    float xv = a * (cos(E) - e);
    float yv = a * sqrt(1.0 - e * e) * sin(E);
    float v = atan(yv, xv);
    float r = length(vec2(xv, yv));
    float u = v + aPhase.y;
    float cO = cos(aOrbit.w), sO = sin(aOrbit.w), ci = cos(aOrbit.z), si = sin(aOrbit.z);
    vec3 ecl = vec3(cO * cos(u) - sO * sin(u) * ci, sO * cos(u) + cO * sin(u) * ci, sin(u) * si);
    float rr = uScientific > 0.5 ? r * uAuUnits : auToCin(r);
    vec3 p = vec3(ecl.x, ecl.z, -ecl.y) * rr;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vColor = aColor;
    gl_PointSize = clamp(uSize * uPixelRatio * 60.0 / -mv.z, 1.0, 2.6 * uPixelRatio);
    gl_Position = projectionMatrix * mv;
}
`;
AERO_GLSL.beltFragment = `
varying vec3 vColor;
uniform float uOpacity;
void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    gl_FragColor = vec4(vColor, uOpacity * (1.0 - d * 3.0));
}
`;
// Same mapping on the CPU (used for planets, dwarfs, comets, orbit lines).
const AERO_CIN_ANCHORS = [[-0.949, 9.2], [-0.324, 13.5], [0.0, 18.8], [0.421, 24.5], [1.649, 34.5], [2.260, 45.5], [2.954, 55.5], [3.404, 64.5]];
function auToCin(r) {
    const lr = Math.log(Math.max(r, 0.05));
    const A = AERO_CIN_ANCHORS;
    if (lr < A[0][0]) return 9.2 * Math.exp((lr - A[0][0]) * 0.6);
    for (let i = 1; i < A.length; i++) if (lr < A[i][0]) return A[i - 1][1] + (A[i][1] - A[i - 1][1]) * (lr - A[i - 1][0]) / (A[i][0] - A[i - 1][0]);
    return 64.5 + (lr - 3.404) * 20.0;
}

// Orbital elements (J2000, approximate): [a AU, e, i°, Ω°, ϖ° (long. of perihelion), L0° (mean longitude at J2000) or null]
// Planets/Pluto: JPL "Approximate Positions of the Planets" (Standish). Others: JPL Small-Body Database, rounded.
const AERO_ORBIT_EL = {
    mercury: [0.38710, 0.20563, 7.005, 48.33, 77.46, 252.25],
    venus:   [0.72333, 0.00677, 3.395, 76.68, 131.60, 181.98],
    earth:   [1.00000, 0.01671, 0.000, 0.00, 102.94, 100.46],
    mars:    [1.52371, 0.09339, 1.850, 49.56, 336.06, 355.45],
    jupiter: [5.20289, 0.04839, 1.304, 100.47, 14.73, 34.40],
    saturn:  [9.53668, 0.05386, 2.486, 113.66, 92.60, 49.95],
    uranus:  [19.18916, 0.04726, 0.773, 74.02, 170.95, 313.24],
    neptune: [30.06992, 0.00859, 1.770, 131.78, 44.96, 304.88],
    pluto:   [39.48212, 0.24882, 17.14, 110.30, 224.07, 238.93],
    ceres:   [2.7675, 0.0758, 10.59, 80.27, 153.9, null],
    vesta:   [2.3615, 0.0887, 7.14, 103.8, 255.0, null],
    pallas:  [2.7725, 0.2302, 34.84, 173.0, 123.0, null],
    haumea:  [43.13, 0.1913, 28.2, 122.2, 361.2, null],
    makemake:[45.43, 0.1610, 29.0, 79.6, 376.6, null],
    eris:    [67.86, 0.4361, 44.04, 35.95, 187.4, null],
    // comets: perihelion date sets the phase
    halley:  [17.834, 0.96714, 162.26, 58.42, 169.75, null, '1986-02-09'],
    hale_bopp:[186.0, 0.9951, 89.43, 282.47, 53.06, null, '1997-04-01']
};
const AERO_J2000_MS = Date.UTC(2000, 0, 1, 12);
function aeroDaysSinceJ2000(date) { return ((date || new Date()).getTime() - AERO_J2000_MS) / 86400000; }
// Heliocentric ecliptic position (AU) → returns {x,y,z (ecliptic), r}
function aeroKepler(el, days, phaseDeg) {
    const [a, e, iDeg, OmDeg, wbarDeg, L0, peri] = el;
    const D = Math.PI / 180;
    const n = 0.9856076686 / Math.pow(a, 1.5); // deg/day
    let M;
    if (peri) M = n * (days - aeroDaysSinceJ2000(new Date(peri + 'T00:00:00Z')));
    else if (L0 !== null && L0 !== undefined) M = L0 - wbarDeg + n * days;
    else M = (phaseDeg || 0) + n * days;
    M = ((M % 360) + 360) % 360 * D;
    let E = e < 0.8 ? M : Math.PI;
    for (let k = 0; k < 30; k++) { const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= dE; if (Math.abs(dE) < 1e-9) break; }
    const xv = a * (Math.cos(E) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const v = Math.atan2(yv, xv), r = Math.hypot(xv, yv);
    const Om = OmDeg * D, w = (wbarDeg - OmDeg) * D, i = iDeg * D, u = v + w;
    return {
        x: r * (Math.cos(Om) * Math.cos(u) - Math.sin(Om) * Math.sin(u) * Math.cos(i)),
        y: r * (Math.sin(Om) * Math.cos(u) + Math.cos(Om) * Math.sin(u) * Math.cos(i)),
        z: r * Math.sin(u) * Math.sin(i), r
    };
}

/* ---------- Standard-quality surfaces: small CPU canvas textures from the same recipes ---------- */
const AERO_CANVAS_TEX = {};
const AERO_CANVAS_SRC = {};
function aeroCanvasRecipeTexture(name) {
    if (AERO_CANVAS_TEX[name]) return AERO_CANVAS_TEX[name];
    const tex = new THREE.CanvasTexture(aeroCanvasRecipeCanvas(name));
    tex.wrapS = THREE.RepeatWrapping;
    AERO_CANVAS_TEX[name] = tex;
    return tex;
}
function aeroCanvasRecipeCanvas(name) {
    if (AERO_CANVAS_SRC[name]) return AERO_CANVAS_SRC[name];
    const R = Object.assign({}, AERO_RECIPE_DEFAULTS, AERO_RECIPES[name] || AERO_RECIPES.generic_gray);
    const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), D = Math.PI / 180;
    const feats = R.feats.filter(f => f[3] !== 4).map(f => ({ f, sl: Math.sin(f[0] * D), cl: Math.cos(f[0] * D), lo: f[1] * D }));
    const bandAt = lat => { let col = R.bands.length ? R.bands[0].slice(1) : R.colA; for (let i = 1; i < R.bands.length; i++) { const b = R.bands[i]; const t = Math.min(1, Math.max(0, (lat - b[0] + 2.2) / 4.4)); col = col.map((v, k) => v + (b[k + 1] - v) * t); } return col; };
    for (let y = 0; y < H; y++) {
        const lat = 90 - (y + 0.5) / H * 180, la = lat * D, sl = Math.sin(la), cl = Math.cos(la);
        for (let x = 0; x < W; x++) {
            const lon = (x + 0.5) / W * 360 - 180, lo = lon * D;
            const px = cl * Math.cos(lo), py = sl, pz = -cl * Math.sin(lo);
            let col;
            if (R.style === 1) {
                const w = aeroNoise3(px * 2 + R.seed, py * 7, pz * 2);
                col = bandAt(lat + R.turb * w * 6).map(v => v * (1 + 0.06 * aeroNoise3(px * 6, py * 40, pz * 6)));
            } else {
                let n = 0, a = 0.5, f = R.noiseScale;
                for (let o = 0; o < 3; o++) { n += a * aeroNoise3(px * f + R.seed, py * f, pz * f - R.seed); a *= 0.5; f *= 2.2; }
                const t = Math.min(1, Math.max(0, 0.5 + n * R.mottle * 1.6));
                col = R.colA.map((v, k) => v + (R.colB[k] - v) * t);
                for (const q of feats) {
                    const d = Math.acos(Math.max(-1, Math.min(1, q.sl * sl + q.cl * cl * Math.cos(lo - q.lo)))) / D / q.f[2];
                    if (d > 1.2) continue;
                    const m = 1 - Math.min(1, Math.max(0, (d - 0.65) / 0.45)), ty = q.f[3];
                    if (ty === 2) col = q.f[7] > 0.5 ? col.map((v, k) => v + (R.colD[k] - v) * m * Math.abs(q.f[4])) : col.map(v => v * (1 + q.f[4] * m));
                    else if (ty === 5 || ty === 11) col = col.map(v => v + (0.95 - v) * m * (q.f[4] || 0.8));
                    else if (ty === 1) col = col.map(v => v + (0.9 - v) * m * 0.35);
                    else if (ty === 10) col = col.map(v => v * (1 - 0.25 * m));
                    else col = col.map(v => v * (1 - 0.08 * m));
                }
                if (R.polar[2] > 0 && (lat > R.polar[0] || lat < -R.polar[1])) col = R.polarCol.slice();
            }
            const o = (y * W + x) * 4;
            img.data[o] = Math.min(255, col[0] * 255); img.data[o + 1] = Math.min(255, col[1] * 255); img.data[o + 2] = Math.min(255, col[2] * 255);
            img.data[o + 3] = R.alphaMode ? Math.min(255, (0.35 + 0.5 * (col[0] + col[1] + col[2]) / 3) * 255) : 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    AERO_CANVAS_SRC[name] = c;
    return c;
}

