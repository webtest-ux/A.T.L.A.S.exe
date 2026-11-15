/* A.T.L.A.S · section 16G — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16G. PLAY GAME — REALISTIC MISSION SURFACES WITHOUT GPU BAKING
 *      Moon · Mars · Europa albedo + relief maps generated on the CPU
 *      inside a Web Worker (no frame stalls, no GPU timeouts), from the
 *      same per-body recipes. Delivered 1024×512 first, then 2048×1024.
 ***********************************************************************/
const AERO_CPU_WORKER_SRC = `
const D = Math.PI / 180;
function hash(n){ const s = Math.sin(n) * 43758.5453123; return s - Math.floor(s); }
function noise3(x, y, z){
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy), uz = fz*fz*(3-2*fz);
  const h = (a,b,c) => hash((ix+a)*157 + (iy+b)*113 + (iz+c)*271);
  const l = (a,b,t) => a + (b-a)*t;
  return l(l(l(h(0,0,0),h(1,0,0),ux), l(h(0,1,0),h(1,1,0),ux), uy), l(l(h(0,0,1),h(1,0,1),ux), l(h(0,1,1),h(1,1,1),ux), uy), uz)*2-1;
}
function fbm(x,y,z,oct){ let n=0,a=0.5,f=1; for(let o=0;o<oct;o++){ n+=a*noise3(x*f,y*f,z*f); a*=0.5; f*=2.03; } return n; }
function rng(seed){ let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function vec(lat, lon){ return [Math.cos(lat*D)*Math.cos(lon*D), Math.sin(lat*D), -Math.cos(lat*D)*Math.sin(lon*D)]; }
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function build(R, body, W, H){
  const rand = rng(R.seed * 7 + 3);
  // ---- statistical crater population (power-law sizes) ----
  const craters = [];
  const N = Math.round(16000 * R.craterDensity);
  for (let i = 0; i < N; i++) {
    const u = rand(), lat = Math.asin(rand()*2-1)/D, lon = rand()*360-180;
    let r = 0.16 * Math.pow(1/Math.max(u,0.002), 1/1.55); if (r > 9) r = 9 * (0.6 + 0.4*rand());
    if (body === 'mars' && lat > 0 && rand() < 0.65) continue;           // smoother northern lowlands
    craters.push({ c: vec(lat, lon), r: r*D, fresh: rand() < 0.12, peak: r > 1.4 && rand() < 0.6, depth: 0.5 + 0.5*rand() });
  }
  // spatial grid 6°×6°
  const G = 6, GW = 60, GH = 30, grid = Array.from({length: GW*GH}, () => []);
  craters.forEach((k, idx) => {
    const lat = Math.asin(k.c[1])/D, lon = Math.atan2(-k.c[2], k.c[0])/D, reach = k.r/D*2.4 + 0.5;
    const la0 = Math.max(-90, lat-reach), la1 = Math.min(90, lat+reach);
    const dl = Math.min(180, reach / Math.max(0.05, Math.cos(Math.min(89, Math.abs(lat)+reach)*D)));
    for (let gy = Math.floor((la0+90)/G); gy <= Math.min(GH-1, Math.floor((la1+90)/G)); gy++) {
      if (dl >= 180) { for (let gx=0; gx<GW; gx++) grid[gy*GW+gx].push(idx); continue; }
      for (let lo = lon-dl; lo <= lon+dl+G; lo += G) { const gx = ((Math.floor((lo+180)/G) % GW) + GW) % GW; const cell = grid[gy*GW+gx]; if (cell[cell.length-1] !== idx) cell.push(idx); }
    }
  });
  const feats = R.feats.map(f => ({ f, c: vec(f[0], f[1]), c2: f[3]===4 ? vec(f[4], f[5]) : null, R: f[2]*D }));
  const lineae = [];
  if (R.fracture > 0) for (let i = 0; i < 40; i++) { const n = vec(Math.asin(rand()*2-1)/D, rand()*360-180); lineae.push({ n, w: (0.0025 + 0.004*rand()), dark: rand() < 0.7 }); }
  const alb = new Uint8ClampedArray(W*H*4), hgt = new Uint8ClampedArray(W*H*4);
  const hraw = new Float32Array(W*H);
  let hmin = 1e9, hmax = -1e9;
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y+0.5)/H*180, sl = Math.sin(lat*D), cl = Math.cos(lat*D);
    for (let x = 0; x < W; x++) {
      const lon = (x+0.5)/W*360-180;
      const p = [cl*Math.cos(lon*D), sl, -cl*Math.sin(lon*D)];
      const s = R.noiseScale, sx = p[0]*s+R.seed, sy = p[1]*s, sz = p[2]*s-R.seed;
      const n = fbm(sx, sy, sz, 6), n2 = fbm(sx*3.1+5, sy*3.1, sz*3.1, 3);
      let t = Math.min(1, Math.max(0, 0.5 + n*R.mottle*1.7));
      let col = [0,1,2].map(k => R.colA[k] + (R.colB[k]-R.colA[k])*t);
      col = col.map((v,k) => v + (R.colC[k]-v) * Math.max(0, n2) * 0.35);
      let h = R.relief * (0.10*n + 0.03*n2);
      if (R.dichotomy > 0) { const south = Math.min(1, Math.max(0, (8 - lat + 14*n)/22)); col = col.map(v => v*(1 - 0.16*R.dichotomy*south*(0.6+0.4*Math.max(0,-n2)))); h += 0.05*R.dichotomy*south; }
      // features
      for (const q of feats) {
const ty = q.f[3];
if (ty === 4) {
  const nrm = [q.c[1]*q.c2[2]-q.c[2]*q.c2[1], q.c[2]*q.c2[0]-q.c[0]*q.c2[2], q.c[0]*q.c2[1]-q.c[1]*q.c2[0]];
  const nl = Math.hypot(...nrm); const off = Math.abs(Math.asin(dot(p,nrm)/nl)) / (q.R*2.2);
  const a1 = Math.acos(Math.min(1,dot(p,q.c))), a2 = Math.acos(Math.min(1,dot(p,q.c2))), a12 = Math.acos(Math.min(1,dot(q.c,q.c2)));
  const ex = (a1+a2-a12)/q.R;
  if (ex < 2 && off < 1.6) { const wob = 1 + 0.3*noise3(p[0]*25,p[1]*25,p[2]*25); const cv = (1 - Math.min(1,Math.max(0,(off-0.35*wob)/(0.65*wob)))) * (1 - Math.min(1, Math.max(0,(ex-0.6)/1.4)));
    h -= q.f[6]*cv*3; col = col.map(v => v*(1-0.18*cv)); }
  continue;
}
const cd = dot(p, q.c); if (cd < Math.cos(Math.min(Math.PI, q.R*3.2))) continue;
const d = Math.acos(Math.min(1, cd)) / q.R;
const irr = (ty === 2 || ty === 0) ? 0.62 : 0.12;   // ragged mare / province / basin outlines
const de = d * (1 + irr*fbm(p[0]*2.6+ty*1.7, p[1]*2.6+q.f[0]*0.05, p[2]*2.6, 5));
const m = 1 - Math.min(1, Math.max(0, (de-0.65)/0.35));
if (ty === 0) { h += -q.f[4]*3*(1-Math.min(1,Math.max(0,(de-0.45)/0.55))) + q.f[5]*3*Math.exp(-1*((de-1)/0.09)**2); col = col.map(v => v*(1+q.f[7]*m*0.35)); }
else if (ty === 1) { const ang = Math.atan2(p[1]-q.c[1], p[0]-q.c[0]+p[2]-q.c[2]); const ray = Math.max(0, Math.sin(ang*13+q.f[0])*0.6 + Math.sin(ang*31)*0.4); const fall = Math.exp(-Math.max(de-1,0)/Math.max(q.f[5],0.1));
  col = col.map((v,k) => v + (R.colB[k]*1.2+0.06 - v) * Math.min(1, (de>1 ? ray*ray*fall*0.6 : 0) + Math.exp(-1*((de-1)/0.25)**2)*0.5)); h += q.f[2]*0.01*((de<1 ? (de*de-1) : 0) + 0.5*Math.exp(-1*((de-1)/0.15)**2)); }
else if (ty === 2) { col = q.f[7] > 0.5 ? col.map((v,k) => v + (R.colD[k]-v)*m*Math.abs(q.f[4])*0.8) : col.map(v => v*(1+q.f[4]*m)); h += q.f[5]*m*3; }
else if (ty === 3) { const sh = Math.exp(-de*de*2.2); h += q.f[4]*sh*3; const cal = q.f[5] > 0.01 ? 1 - Math.min(1,Math.max(0,(de-q.f[5]*0.7)/(q.f[5]*0.3))) : 0; h -= q.f[4]*0.5*cal; col = col.map(v => v*(1-0.1*cal+0.05*sh)); }
else if (ty === 5 || ty === 11) col = col.map(v => v + (0.95-v)*m*(q.f[4]||0.8));
else if (ty === 6) { const raft = hash(Math.floor(p[0]*140+3*noise3(p[0]*40,p[1]*40,p[2]*40))*13 + Math.floor(p[1]*140)*71 + Math.floor(p[2]*140)*37) > 0.45 ? 1 : 0;
  col = col.map((v,k) => v + ((raft ? R.colB[k] : R.fractureCol[k]*0.9) - v)*m*q.f[4]); h += m*q.f[4]*(raft*0.03-0.01); }
else if (ty === 7) { const rings = 0.5+0.5*Math.cos(de*q.f[4]*2*Math.PI), env = 1-Math.min(1,Math.max(0,(de-0.85)/0.15)); h += q.f[5]*3*env*(rings-0.5)*0.4 - q.f[5]*0.9*(1-Math.min(1,de/0.25)); col = col.map(v => v*(1+0.1*env*(rings-0.5)+q.f[7]*(1-Math.min(1,de/0.3)))); }
else if (ty === 12) { const dn = Math.sin(p[0]*310+p[1]*40+p[2]*190 + noise3(p[0]*30,p[1]*30,p[2]*30)*2); col = col.map(v => v*(1-m*q.f[4]*(0.25+0.15*dn))); }
      }
      // craters
      const gy = Math.min(GH-1, Math.floor((lat+90)/G)), gx = Math.min(GW-1, Math.floor((lon+180)/G));
      for (const idx of grid[gy*GW+gx]) {
const k = craters[idx]; const cd = dot(p, k.c); if (cd < Math.cos(k.r*2.4)) continue;
const d = Math.acos(Math.min(1, cd)) / k.r;
const rr = k.r / D;
const bowl = d < 1 ? (d*d-1)*0.55*k.depth : 0, rim = 0.22*Math.exp(-1*((d-1)/0.13)**2), ej = d > 1 ? 0.07*Math.exp(-(d-1)*2.6) : 0;
const peak = k.peak ? 0.25*Math.exp(-1*((d/0.17)**2)) : 0;
h += R.craterAmp * 0.06 * Math.pow(rr, 0.8) * (bowl + rim + ej + peak);
if (k.fresh) { const br = (d < 1.0 ? 0.12*(1-d*d) : 0) + 0.10*Math.exp(-1*(((d-1)/0.12)**2)) + (d > 1 ? 0.16*Math.exp(-(d-1)*1.6)*R.craterRays : 0); col = col.map((v,kk) => v + (R.colB[kk]*1.15 - v)*Math.min(1, br)); }
else if (d < 1) col = col.map(v => v*(0.97 - 0.04*(1-d)));
      }
      // Europa lineae (double ridges: dark reddish band with a bright centre line) + fine fracture network
      if (lineae.length) {
for (const L of lineae) { const o = Math.abs(dot(p, L.n) + 0.004*noise3(p[0]*20,p[1]*20,p[2]*20)); if (o > L.w*1.6) continue; if (noise3(p[0]*2.2+L.n[0]*9, p[1]*2.2+L.n[1]*9, p[2]*2.2) < -0.15) continue; const band = 1 - o/(L.w*1.6), centre = Math.exp(-1*((o/(L.w*0.25))**2));
  col = col.map((v,k) => v + (R.fractureCol[k] - v)*band*(L.dark ? 0.85 : 0.5)); col = col.map(v => v + (0.9 - v)*centre*0.35); h += band*0.02 + centre*0.015; }
const fr = 1 - Math.abs(noise3(p[0]*R.fractureScale*9+1, p[1]*R.fractureScale*9, p[2]*R.fractureScale*9));
const line = Math.pow(Math.max(0, (fr-0.9)/0.1), 2);
col = col.map((v,k) => v + (R.fractureCol[k]*1.1 - v)*line*0.55*R.fracture);
      }
      // polar caps
      if (R.polar[2] > 0) {
const wob = 2.5*noise3(p[0]*6, p[1]*6, p[2]*6);
const capN = Math.min(1, Math.max(0, (lat - R.polar[0] - wob + 2)/4)), capS = Math.min(1, Math.max(0, (-lat - R.polar[1] - wob + 2)/4));
const cap = Math.max(capN, capS)*R.polar[2];
col = col.map((v,k) => v + (R.polarCol[k] - v)*cap); h += cap*R.polar[3]*3;
      }
      const o = (y*W+x)*4;
      alb[o] = col[0]*255; alb[o+1] = col[1]*255; alb[o+2] = col[2]*255; alb[o+3] = 255;
      hraw[y*W+x] = h; if (h < hmin) hmin = h; if (h > hmax) hmax = h;
    }
  }
  const sc = 255/Math.max(1e-6, hmax-hmin);
  for (let i = 0; i < W*H; i++) { const v = (hraw[i]-hmin)*sc; hgt[i*4] = hgt[i*4+1] = hgt[i*4+2] = v; hgt[i*4+3] = 255; }
  return { alb, hgt };
}
onmessage = e => { const { R, body, W, H, id } = e.data; const r = build(R, body, W, H); postMessage({ id, W, H, alb: r.alb, hgt: r.hgt }, [r.alb.buffer, r.hgt.buffer]); };
`;
const AERO_CPU_SURF = {};   // key body|W -> { albedo, height } CanvasTextures
let _aeroCpuWorker = null, _aeroCpuSeq = 0;
const _aeroCpuPending = {};
function aeroCpuWorker() {
    if (_aeroCpuWorker !== null) return _aeroCpuWorker;
    try {
        const url = URL.createObjectURL(new Blob([AERO_CPU_WORKER_SRC], { type: 'text/javascript' }));
        _aeroCpuWorker = new Worker(url);
        _aeroCpuWorker.onmessage = e => { const cb = _aeroCpuPending[e.data.id]; delete _aeroCpuPending[e.data.id]; if (cb) cb(e.data); };
        _aeroCpuWorker.onerror = err => { aeroReportError('surface worker', err.message || err); };
    } catch (err) { _aeroCpuWorker = false; }
    return _aeroCpuWorker;
}
function aeroCpuToTextures(d) {
    const mk = (arr) => {
        const c = document.createElement('canvas'); c.width = d.W; c.height = d.H;
        c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(arr.buffer || arr), d.W, d.H), 0, 0);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = THREE.RepeatWrapping;
        t.anisotropy = threeRenderer ? Math.min(8, threeRenderer.capabilities.getMaxAnisotropy()) : 1;
        return t;
    };
    return { albedo: mk(d.alb), height: mk(d.hgt), W: d.W };
}
// cb(textures) is called for 1024×512 and again for 2048×1024.
// One job at a time in the worker; the body currently on screen and the 1024 tier always go first.
const _aeroCpuQueue = [];
let _aeroCpuBusy = false;
function _aeroCpuNext() {
    if (_aeroCpuBusy || !_aeroCpuQueue.length) return;
    const cur = planetSurfaceMesh && planetSurfaceMesh.userData.body;
    _aeroCpuQueue.sort((a, b) => ((b.body === cur) - (a.body === cur)) * 10 + (a.W - b.W) / 1024);
    const job = _aeroCpuQueue.shift();
    const w = aeroCpuWorker();
    _aeroCpuBusy = true;
    const finish = d => { _aeroCpuBusy = false; job.done(d); _aeroCpuNext(); };
    if (w) { const id = ++_aeroCpuSeq; _aeroCpuPending[id] = finish; w.postMessage({ R: job.R, body: job.body, W: job.W, H: job.W / 2, id }); }
    else if (job.W === 1024) {
        // No worker support: generate a small version on the main thread
        setTimeout(() => { const f = new Function(AERO_CPU_WORKER_SRC.replace(/onmessage[\s\S]*$/, '') + '; return build;')(); const r = f(job.R, job.body, 512, 256); finish({ W: 512, H: 256, alb: r.alb, hgt: r.hgt }); }, 200);
    } else { _aeroCpuBusy = false; }
}
function aeroCpuSurface(body, cb) {
    const R = Object.assign({}, AERO_RECIPE_DEFAULTS, AERO_RECIPES[body]);
    [1024, 2048].forEach(W => {
        const key = body + '|' + W;
        if (AERO_CPU_SURF[key]) { if (AERO_CPU_SURF[key].albedo) cb(AERO_CPU_SURF[key]); else AERO_CPU_SURF[key].cbs.push(cb); return; }
        AERO_CPU_SURF[key] = { cbs: [cb] };
        const done = d => { const tex = aeroCpuToTextures(d); const cbs = AERO_CPU_SURF[key].cbs; AERO_CPU_SURF[key] = tex; cbs.forEach(f => { try { f(tex); } catch (err) { aeroReportError('surface apply', err); } }); };
        _aeroCpuQueue.push({ body, W, R, done });
    });
    _aeroCpuNext();
}

