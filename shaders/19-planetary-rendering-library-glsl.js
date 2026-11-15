/* A.T.L.A.S · section 16 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16. PLANETARY RENDERING LIBRARY — GLSL
 *     GPU "bake" shaders that turn a per-body recipe into equirectangular
 *     albedo / normal / elevation maps (2048×1024 or 1024×512), plus the
 *     Sun photosphere, ring and atmospheric-haze shaders.
 *     3D simplex noise: Ashima Arts / Stefan Gustavson (MIT licence).
 *     These maps are PROCEDURAL SCIENTIFIC RECONSTRUCTIONS — feature
 *     positions follow published coordinates, but pixels are generated,
 *     not satellite imagery.
 ***********************************************************************/
const AERO_GLSL = {};

AERO_GLSL.noise = `
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float sq(float x){ return x * x; }
float fbm(vec3 p, int oct){
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * snoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    return s;
}
float ridgedFbm(vec3 p, int oct){
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 6; i++) { if (i >= oct) break; float n = 1.0 - abs(snoise(p)); s += a * n * n; p = p * 2.07 + vec3(4.1, 1.3, 7.7); a *= 0.5; }
    return s;
}
`;

AERO_GLSL.bakeVertex = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

AERO_GLSL.bakeFragment = `
varying vec2 vUv;
uniform int uPass;          // 0 height (packed RG) · 1 albedo · 2 normal · 3 elevation ramp · 4 fracture mask · 5 normal-from-image
uniform int uStyle;         // 0 terrain · 1 gas giant · 2 Io volcanic · 3 cloud deck
uniform float uSeed;
uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform vec3 uColD;
uniform float uNoiseScale; uniform float uMottle; uniform float uRelief; uniform float uRidge;
uniform float uCraterDensity; uniform float uCraterAmp; uniform float uCraterMinScale; uniform float uCraterOctaves; uniform float uCraterRays;
uniform float uFracture; uniform float uFractureScale; uniform vec3 uFractureCol;
uniform float uGroove; uniform float uTwoTone; uniform float uTwoToneLon;
uniform vec4 uPolar; uniform vec3 uPolarCol;
uniform float uDichotomy; uniform float uSpots;
uniform vec4 uBands[16]; uniform int uBandN; uniform float uTurb; uniform float uStreaks;
uniform vec4 uFeatA[28]; uniform vec4 uFeatB[28]; uniform int uFeatN;
uniform sampler2D uHeightTex; uniform vec2 uTexel; uniform float uNormalStrength;
uniform float uAlphaMode;

const float PI = 3.14159265358979;
${'$'}{NOISE}

vec3 uvToP(vec2 uv){ float phi = uv.x * 2.0 * PI; float th = (1.0 - uv.y) * PI; return vec3(-cos(phi) * sin(th), cos(th), sin(phi) * sin(th)); }
vec3 llToP(float lat, float lon){ float phi = radians(lon + 180.0); float th = radians(90.0 - lat); return vec3(-cos(phi) * sin(th), cos(th), sin(phi) * sin(th)); }
float angDist(vec3 a, vec3 b){ return acos(clamp(dot(a, b), -1.0, 1.0)); }
vec3 hash3(vec3 p){
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p + uSeed * 0.731) * 43758.5453);
}
float lonOf(vec3 p){ float phi = atan(p.z, -p.x); if (phi < 0.0) phi += 2.0 * PI; return degrees(phi) - 180.0; }
float wrapDeg(float d){ return d - 360.0 * floor((d + 180.0) / 360.0); }

// Crater field: x height, y fresh-ray brightness, z floor mask, w rim mask
vec4 craterLayer(vec3 p, float scale, float density, float salt){
    vec3 q = p * scale;
    vec3 ip = floor(q);
    vec4 acc = vec4(0.0);
    for (int z = -1; z <= 1; z++)
    for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
vec3 cell = ip + vec3(float(x), float(y), float(z));
// cheap exact pre-reject: a crater centre lies within 0.70 of the cell centre, and must lie within 0.55 of the sphere shell
if (abs(length(cell + 0.5) - scale) > 1.26) continue;
vec3 r = hash3(cell + salt);
if (r.x > density) continue;
vec3 rp = cell + 0.1 + 0.8 * hash3(cell * 1.71 + salt + 3.1);
if (abs(length(rp) - scale) > 0.55) continue;
vec3 c = normalize(rp) * scale;
float rad = mix(0.16, 0.5, r.y * r.y);
vec3 n = normalize(c);
vec3 dv = q - c; dv -= n * dot(dv, n);
float d = length(dv) / rad;
if (d > 3.2) continue;
float bowl = d < 1.0 ? (d * d - 1.0) * 0.55 : 0.0;
float rim = 0.22 * exp(-sq((d - 1.0) / 0.13));
float ejecta = d > 1.0 ? 0.07 * exp(-(d - 1.0) * 2.6) : 0.0;
float peak = (r.z < 0.45 && rad > 0.34) ? 0.24 * exp(-sq(d / 0.17)) : 0.0;
acc.x += rad * (bowl + rim + ejecta + peak);
acc.z = max(acc.z, 1.0 - smoothstep(0.6, 1.0, d));
acc.w = max(acc.w, exp(-sq((d - 1.0) / 0.12)));
if (r.z < 0.12 && d > 0.9) {
    vec3 t1 = normalize(cross(n, vec3(0.0, 1.0, 0.31)));
    vec3 t2 = cross(n, t1);
    float ang = atan(dot(dv, t2), dot(dv, t1));
    float streak = pow(max(0.0, sin(ang * 9.0 + r.y * 40.0) * 0.5 + 0.5 * sin(ang * 23.0 + r.x * 50.0)), 3.0);
    acc.y = max(acc.y, streak * exp(-(d - 1.0) * 0.9));
}
    }
    return acc;
}

struct Surf { float h; vec3 col; float line; float alpha; };

vec3 bandColor(float lat){
    vec3 col = uBands[0].yzw;
    for (int i = 1; i < 16; i++) {
if (i >= uBandN) break;
float t = smoothstep(uBands[i].x - 2.2, uBands[i].x + 2.2, lat);
col = mix(col, uBands[i].yzw, t);
    }
    return col;
}

Surf evalSurface(vec3 p){
    Surf s; s.h = 0.0; s.line = 0.0; s.alpha = 1.0;
    vec3 sp = p + vec3(uSeed * 1.37, uSeed * 0.53, -uSeed * 0.91);
    float lat = degrees(asin(clamp(p.y, -1.0, 1.0)));
    float lon = lonOf(p);

    // ---------- GAS GIANTS ----------
    if (uStyle == 1) {
float warp = fbm(vec3(sp.x * 2.0, sp.y * 7.0, sp.z * 2.0), 5);
float eddy = fbm(sp * 6.0 + vec3(0.0, warp * 2.0, 0.0), 4);
float latW = lat + uTurb * (warp * 6.0 + eddy * 2.5);
vec3 col = bandColor(latW);
float streak = snoise(vec3(sp.x * 3.0, sp.y * 70.0 + warp * 3.0, sp.z * 3.0));
col *= 1.0 + uStreaks * streak * 0.6;
col *= 1.0 + 0.10 * eddy * min(uTurb * 1.6, 1.0);
float h = 0.02 * eddy + 0.01 * streak;
for (int i = 0; i < 28; i++) {
    if (i >= uFeatN) break;
    vec4 A = uFeatA[i]; vec4 B = uFeatB[i];
    if (int(A.w + 0.5) != 10) continue;
    float dlat = (lat - A.x) / A.z;
    float dlon = wrapDeg(lon - A.y) * cos(radians(A.x)) / (A.z * B.y);
    float e = sqrt(dlat * dlat + dlon * dlon);
    float swirl = snoise(vec3(dlat * 3.0, dlon * 3.0, B.z * 7.0 + e * 4.0));
    vec3 sc = B.x < 0.5 ? vec3(0.73, 0.34, 0.20) : (B.x < 1.5 ? vec3(0.95, 0.93, 0.88) : (B.x < 2.5 ? vec3(0.10, 0.16, 0.36) : vec3(0.97, 0.98, 1.0)));
    float core = 1.0 - smoothstep(0.55, 1.0, e + swirl * 0.12);
    float ring = exp(-sq((e - 1.0) / 0.15));
    col = mix(col, sc, core * 0.92);
    col = mix(col, col * 1.12 + 0.05, ring * 0.45);
    h += core * 0.03;
}
// Saturn-style polar hexagon
if (uSpots > 0.5 && lat > 70.0) {
    float a = radians(lon) ;
    float hexR = cos(PI / 6.0) / cos(mod(a, PI / 3.0) - PI / 6.0);
    float r = (90.0 - lat) / 13.5;
    float inside = 1.0 - smoothstep(0.92, 1.05, r / hexR);
    col = mix(col, vec3(0.50, 0.55, 0.58), inside * 0.55);
}
s.col = col; s.h = 0.5 + h; return s;
    }

    // ---------- CLOUD DECKS (Venus) ----------
    if (uStyle == 3) {
float w = fbm(vec3(sp.x * 1.6, sp.y * 4.5, sp.z * 1.6), 5);
float chevron = snoise(vec3(sp.x * 2.0 + abs(p.y) * 3.5, sp.y * 1.5, sp.z * 2.0 + abs(p.y) * 3.5) + w);
float dens = 0.55 + 0.35 * w + 0.25 * chevron;
vec3 col = mix(uColA, uColB, clamp(dens, 0.0, 1.0));
col = mix(col, uColC, smoothstep(0.35, 0.9, fbm(sp * 5.0, 3) + 0.4) * 0.25);
s.col = col; s.h = 0.5 + 0.02 * w;
s.alpha = uAlphaMode > 0.5 ? clamp(0.25 + 0.75 * smoothstep(0.35, 0.95, dens), 0.0, 1.0) : 1.0;
return s;
    }

    // ---------- TERRAIN (rocky & icy) + Io ----------
    float n1 = fbm(sp * uNoiseScale, 6);
    float n2 = fbm(sp * uNoiseScale * 3.3 + 11.0, 5);
    float h = uRelief * (0.022 * n1 + 0.006 * n2);
    if (uRidge > 0.0) h += uRidge * 0.02 * (ridgedFbm(sp * uNoiseScale * 1.5, 5) - 0.35);
    h -= uDichotomy * 0.06 * smoothstep(-15.0, 35.0, lat + 18.0 * n1);

    // Craters
    float ray = 0.0, floorM = 0.0, rimM = 0.0;
    for (int k = 0; k < 5; k++) {
if (float(k) >= uCraterOctaves) break;
float sc = uCraterMinScale * pow(2.35, float(k));
float dens = uCraterDensity * (0.55 + 0.12 * float(k));
vec4 c = craterLayer(p, sc, dens, float(k) * 7.31);
float northSmooth = 1.0 - 0.65 * uDichotomy * smoothstep(-5.0, 30.0, lat + 18.0 * n1);
h += uCraterAmp * c.x / sc * (1.0 + 0.4 * float(k)) * northSmooth;
ray = max(ray, c.y * (k < 3 ? 1.0 : 0.6));
floorM = max(floorM, c.z * (1.0 - 0.18 * float(k)));
rimM = max(rimM, c.w);
    }

    vec3 col = mix(uColA, uColB, clamp(0.5 + uMottle * (n1 * 0.9 + n2 * 0.4), 0.0, 1.0));
    col = mix(col, uColC, smoothstep(0.15, 0.75, fbm(sp * uNoiseScale * 0.6 + 4.0, 4) + 0.15) * 0.35);
    if (uDichotomy > 0.0) {
float band = exp(-sq((lat + 15.0) / 20.0)) * 0.42 + exp(-sq((lat - 48.0) / 10.0)) * 0.22;
float prov = smoothstep(0.08, 0.5, fbm(sp * 1.7 + 2.0, 5) * 0.8 + band - 0.12);
col = mix(col, uColD, prov * 0.75 * uDichotomy);
    }
    col *= 1.0 + rimM * 0.10 - floorM * 0.06;
    col = mix(col, uColB * 1.18 + 0.04, clamp(ray * uCraterRays, 0.0, 1.0) * 0.55);

    // Fractures / lineae (icy moons): crisscrossing great-circle bands + fine fracture network
    if (uFracture > 0.0) {
float L = 0.0;
vec3 warp = 0.018 * vec3(snoise(sp * 4.0), snoise(sp * 4.0 + 5.0), snoise(sp * 4.0 + 9.0));
for (int k = 0; k < 26; k++) {
    vec3 nk = normalize(hash3(vec3(float(k) * 3.7, 1.3, uSeed)) * 2.0 - 1.0);
    float d = abs(dot(p + warp * (1.0 + mod(float(k), 3.0)), nk));
    float w = mix(0.004, 0.016, hash3(vec3(float(k), 7.1, 2.0)).x) * uFractureScale / 3.0;
    float seg = smoothstep(-0.15, 0.25, snoise(p * 1.2 + float(k) * 4.1));
    float band = (1.0 - smoothstep(w * 0.55, w, d)) * seg;
    float trough = (1.0 - smoothstep(0.0, w * 0.28, d)) * seg;
    L = max(L, band);
    h += uFracture * 0.006 * (band - trough * 1.2);
    col = mix(col, uFractureCol, band * uFracture * 0.8);
    col = mix(col, uColB * 1.03, trough * uFracture * 0.5);
}
for (int k = 0; k < 2; k++) {
    vec3 q = sp * uFractureScale * (2.5 + float(k) * 2.0) + vec3(float(k) * 5.1);
    float nv = abs(snoise(q + 0.3 * vec3(snoise(q * 0.5), snoise(q * 0.5 + 7.0), snoise(q * 0.5 + 13.0))));
    float band = (1.0 - smoothstep(0.012, 0.05, nv)) * smoothstep(-0.1, 0.5, snoise(q * 0.2 + 30.0));
    col = mix(col, mix(uFractureCol, uColA, 0.5), band * uFracture * 0.45);
    L = max(L, band * 0.6);
}
s.line = L;
    }
    // Grooved bright terrain (Ganymede)
    if (uGroove > 0.0) {
float region = smoothstep(0.0, 0.25, fbm(sp * 1.4 + 20.0, 4));
vec3 dir = normalize(vec3(snoise(sp * 0.8), snoise(sp * 0.8 + 3.0), snoise(sp * 0.8 + 6.0)) + 0.001);
float g = sin(dot(p, dir) * 260.0 + snoise(sp * 9.0) * 3.0);
col = mix(col, uColD, region * uGroove);
h += region * uGroove * (0.004 * g + 0.012);
col *= 1.0 + region * uGroove * 0.06 * g;
    }
    // Io: sulfur mottling, paterae, plume deposits
    if (uStyle == 2) {
float m = fbm(sp * 3.0, 6);
col = mix(uColA, uColB, smoothstep(-0.45, 0.45, m));
col = mix(col, uColC, smoothstep(0.25, 0.7, fbm(sp * 7.0 + 3.0, 4)) * 0.5);
col = mix(col, vec3(0.93, 0.92, 0.80), smoothstep(0.35, 0.75, fbm(sp * 2.2 + 9.0, 4)) * 0.55);
col = mix(col, uColD, smoothstep(55.0, 80.0, abs(lat) + 10.0 * m) * 0.75);
vec3 q = p * 14.0; vec3 ip = floor(q);
for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 cell = ip + vec3(float(x), float(y), float(z));
    vec3 r = hash3(cell + 91.0);
    if (r.x > uSpots) continue;
    vec3 rp = cell + 0.2 + 0.6 * hash3(cell * 2.3 + 5.0);
    if (abs(length(rp) - 14.0) > 0.6) continue;
    vec3 c = normalize(rp) * 14.0; vec3 n = normalize(c);
    vec3 dv = q - c; dv -= n * dot(dv, n);
    float d = length(dv) / mix(0.10, 0.26, r.y) * (1.0 + 0.35 * snoise(dv * 6.0 + cell));
    vec3 pat = r.z < 0.3 ? vec3(0.10, 0.08, 0.06) : (r.z < 0.6 ? vec3(0.26, 0.20, 0.13) : vec3(0.36, 0.30, 0.18));
    col = mix(col, pat, 1.0 - smoothstep(0.7, 1.0, d));
    col = mix(col, r.y < 0.35 ? vec3(0.66, 0.32, 0.16) : (r.y < 0.7 ? vec3(0.82, 0.62, 0.30) : vec3(0.88, 0.88, 0.80)), exp(-sq((d - 1.7) / 0.7)) * 0.35);
    h -= 0.01 * (1.0 - smoothstep(0.7, 1.0, d));
}
    }

    // Named features (published coordinates)
    for (int i = 0; i < 28; i++) {
if (i >= uFeatN) break;
vec4 A = uFeatA[i]; vec4 B = uFeatB[i];
int type = int(A.w + 0.5);
if (type == 10) continue;
vec3 c = llToP(A.x, A.y);
float R = radians(A.z);
float d = angDist(p, c) / R;
if (type == 4) {
    vec3 c2 = llToP(B.x, B.y);
    vec3 nrm = normalize(cross(c, c2));
    float off = abs(asin(clamp(dot(p, nrm), -1.0, 1.0))) / R;
    float excess = (angDist(p, c) + angDist(p, c2) - angDist(c, c2)) / R;
    if (excess < 2.0) {
        float wob = 1.0 + 0.35 * snoise(p * 25.0 + float(i));
        float cv = (1.0 - smoothstep(0.35 * wob, 1.0 * wob, off)) * (1.0 - smoothstep(0.6, 2.0, excess));
        h -= B.z * cv; s.line = max(s.line, cv);
        col *= 1.0 - 0.16 * cv * step(0.0, B.z);
        col = mix(col, col * vec3(1.05, 0.95, 0.9), exp(-sq((off - 1.05) / 0.25)) * 0.3);
    }
    continue;
}
if (d > 7.0 * (1.0 + 0.65 * abs(B.z))) continue;   // exact pre-reject before the two noise calls
float edge = 1.0 + B.z * (0.45 * snoise(p * 3.0 + float(i) * 3.3) + 0.2 * snoise(p * 9.0 + float(i) * 1.7));
float de = d / edge;
if (de > 7.0) continue;
if (type == 0) {               // impact basin / depression
    h += -B.x * (1.0 - smoothstep(0.45, 1.0, de)) + B.y * exp(-sq((de - 1.0) / 0.09));
    col *= 1.0 + B.w * (1.0 - smoothstep(0.6, 1.0, de));
} else if (type == 1) {        // fresh crater + ray system
    h += A.z * 0.003 * ((de < 1.0 ? (de * de - 1.0) * 1.2 : 0.0) + 0.5 * exp(-sq((de - 1.0) / 0.15)));
    vec3 n = c; vec3 t1 = normalize(cross(n, vec3(0.0, 1.0, 0.27))); vec3 t2 = cross(n, t1);
    vec3 dv = p - c;
    float ang = atan(dot(dv, t2), dot(dv, t1));
    float rays = sq(max(0.0, 0.6 * sin(ang * 13.0 + float(i)) + 0.5 * sin(ang * 31.0 + 2.0) + 0.3 * snoise(vec3(ang * 3.0, de * 0.4, float(i)))));
    float fall = exp(-max(de - 1.0, 0.0) / max(B.y, 0.1));
    col = mix(col, uColB * 1.22 + 0.06, clamp(rays * fall * (de > 1.0 ? 1.0 : 0.0), 0.0, 1.0) * 0.6);
    col = mix(col, uColB * 1.25 + 0.08, exp(-sq((de - 1.0) / 0.25)) * 0.55);
} else if (type == 2) {        // albedo province (maria, dark/bright regions)
    float m = 1.0 - smoothstep(0.65, 1.0, de);
    col = B.w > 0.5 ? mix(col, uColD, m * abs(B.x)) : col * (1.0 + B.x * m);
    h += B.y * m;
} else if (type == 3) {        // shield volcano with caldera
    float shield = exp(-sq(de) * 2.2);
    h += B.x * shield;
    float cal = B.y > 0.01 ? 1.0 - smoothstep(B.y * 0.7, B.y, de) : 0.0;
    h -= B.x * 0.18 * cal;
    float scarp = exp(-sq((de - 1.05) / 0.05));
    h -= B.x * 0.08 * scarp * step(0.5, B.w);
    col *= 1.0 - 0.10 * cal + 0.04 * shield;
} else if (type == 5) {        // bright spot / frost deposit
    col = mix(col, vec3(0.97, 0.97, 0.95), (1.0 - smoothstep(0.3, 1.0, de)) * B.x);
} else if (type == 6) {        // chaos terrain: disrupted rafts in a darker matrix
    float m = 1.0 - smoothstep(0.75, 1.0, de);
    vec3 q = p * 140.0;
    float raft = step(0.45, fract(sin(dot(floor(q + 0.4 * snoise(p * 40.0)), vec3(12.9, 78.2, 37.7))) * 4375.85));
    col = mix(col, mix(uFractureCol * 0.9, uColB, raft), m * B.x);
    h += m * B.x * (raft * 0.012 - 0.004);
    s.line = max(s.line, m * (1.0 - raft) * 0.7);
} else if (type == 7) {        // multi-ring basin
    float rings = 0.5 + 0.5 * cos(de * B.x * 2.0 * PI);
    float env = 1.0 - smoothstep(0.85, 1.0, de);
    h += B.y * env * (rings - 0.5) * 0.4 - B.y * 0.3 * (1.0 - smoothstep(0.0, 0.25, de));
    col *= 1.0 + 0.10 * env * (rings - 0.5) + B.w * (1.0 - smoothstep(0.0, 0.3, de));
} else if (type == 9) {        // parallel fractures (tiger stripes, wispy terrain, coronae)
    float m = 1.0 - smoothstep(0.7, 1.0, de);
    vec3 t1 = normalize(cross(c, vec3(0.2, 1.0, 0.1)));
    float st = abs(sin(dot(p, t1) * B.x * 6.0 + snoise(p * 8.0 + float(i)) * 1.2));
    float line = (1.0 - smoothstep(0.0, 0.18, st)) * m;
    col = mix(col, B.w > 0.5 ? uColD : uFractureCol, line * B.y);
    h += line * 0.008 * B.y;
    s.line = max(s.line, line);
} else if (type == 11) {       // smooth convective ice plain (Sputnik Planitia)
    float m = 1.0 - smoothstep(0.8, 1.0, de);
    vec3 q = p * 60.0; vec3 f = fract(q) - 0.5;
    float cellEdge = smoothstep(0.38, 0.5, max(abs(f.x), max(abs(f.y), abs(f.z))));
    col = mix(col, vec3(0.94, 0.90, 0.84) * (1.0 - 0.08 * cellEdge), m * B.x);
    h = mix(h, -0.01 + 0.002 * cellEdge, m);
} else if (type == 13) {       // volcanic plume deposit ring (Io: Pele, Prometheus)
    col = mix(col, vec3(0.70, 0.26, 0.11), exp(-sq((de - 1.0) / 0.22)) * B.x);
    col = mix(col, vec3(0.08, 0.06, 0.05), 1.0 - smoothstep(0.08, 0.16, de));
} else if (type == 12) {       // dune field
    float m = 1.0 - smoothstep(0.6, 1.0, de);
    float dn = sin(dot(p, vec3(310.0, 40.0, 190.0)) + snoise(p * 30.0) * 2.0);
    col *= 1.0 - m * B.x * (0.25 + 0.15 * dn);
    h += m * 0.003 * dn;
}
    }

    // Two-tone hemispheres (Iapetus)
    if (uTwoTone > 0.0) {
float dl = abs(wrapDeg(lon - uTwoToneLon));
float dark = 1.0 - smoothstep(70.0, 105.0, dl + 18.0 * fbm(sp * 3.0, 4) + abs(lat) * 0.55);
col = mix(col, uColD, dark * uTwoTone);
    }
    // Polar caps
    if (uPolar.z > 0.0) {
float pn = smoothstep(uPolar.x - 3.0, uPolar.x + 3.0, lat + 4.0 * fbm(sp * 4.0, 4));
float ps = smoothstep(uPolar.y - 3.0, uPolar.y + 3.0, -lat + 4.0 * fbm(sp * 4.0 + 5.0, 4));
float cap = max(pn, ps);
col = mix(col, uPolarCol, cap * uPolar.z);
h += cap * uPolar.w;
    }
    s.col = clamp(col, 0.0, 1.0);
    s.h = 0.5 + h;
    return s;
}

float decodeH(vec2 uv){
    vec4 t = texture2D(uHeightTex, vec2(fract(uv.x), clamp(uv.y, 0.0, 1.0)));
    return (t.r * 255.0 + t.g) / 255.0;
}

void main(){
    vec3 p = uvToP(vUv);
    if (uPass == 0) {
Surf s = evalSurface(p);
float v = clamp(s.h, 0.0, 1.0) * 255.0;
gl_FragColor = vec4(floor(v) / 255.0, fract(v), 0.0, 1.0);
    } else if (uPass == 1) {
Surf s = evalSurface(p);
gl_FragColor = vec4(s.col, s.alpha);
    } else if (uPass == 2 || uPass == 5) {
float hl, hr, hd, hu;
if (uPass == 2) {
    hl = decodeH(vUv - vec2(uTexel.x, 0.0)); hr = decodeH(vUv + vec2(uTexel.x, 0.0));
    hd = decodeH(vUv - vec2(0.0, uTexel.y)); hu = decodeH(vUv + vec2(0.0, uTexel.y));
} else {
    vec3 w = vec3(0.299, 0.587, 0.114);
    hl = dot(texture2D(uHeightTex, vUv - vec2(uTexel.x, 0.0)).rgb, w); hr = dot(texture2D(uHeightTex, vUv + vec2(uTexel.x, 0.0)).rgb, w);
    hd = dot(texture2D(uHeightTex, vUv - vec2(0.0, uTexel.y)).rgb, w); hu = dot(texture2D(uHeightTex, vUv + vec2(0.0, uTexel.y)).rgb, w);
}
float sinT = max(sin((1.0 - vUv.y) * PI), 0.05);
float gx = (hr - hl) / (2.0 * uTexel.x * 2.0 * PI * sinT);
float gy = (hu - hd) / (2.0 * uTexel.y * PI);
vec3 n = normalize(vec3(-gx * uNormalStrength * 0.05, -gy * uNormalStrength * 0.05, 1.0));
gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
    } else if (uPass == 3) {
float h = decodeH(vUv);
float t = clamp((h - 0.5) * 4.0 + 0.5, 0.0, 1.0);
vec3 c = t < 0.25 ? mix(vec3(0.15, 0.25, 0.75), vec3(0.15, 0.65, 0.85), t / 0.25)
       : t < 0.5 ? mix(vec3(0.15, 0.65, 0.85), vec3(0.25, 0.75, 0.35), (t - 0.25) / 0.25)
       : t < 0.75 ? mix(vec3(0.25, 0.75, 0.35), vec3(0.92, 0.78, 0.25), (t - 0.5) / 0.25)
       : mix(vec3(0.92, 0.78, 0.25), vec3(0.85, 0.25, 0.20), (t - 0.75) / 0.25);
gl_FragColor = vec4(c, 0.62);
    } else {
Surf s = evalSurface(p);
gl_FragColor = vec4(0.98, 0.70, 0.18, clamp(s.line, 0.0, 1.0) * 0.9);
    }
}
`;

// ---------- The Sun: animated photosphere ----------
AERO_GLSL.sunVertex = `
varying vec3 vObj;
varying vec3 vN;
varying vec3 vView;
void main(){
    vObj = normalize(position);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
AERO_GLSL.sunFragment = `
varying vec3 vObj;
varying vec3 vN;
varying vec3 vView;
uniform float uTime;
uniform vec4 uFlare;
${'$'}{NOISE}
// Realistic photosphere in the style of SDO/AIA-filtered imagery: orange-red granulated plasma,
// bright white-gold active regions (plage/faculae), magnetic "filigree", and a thin red limb.
void main(){
    vec3 p = vObj;
    float t = uTime;
    // Domain-warped flow so the plasma slowly churns
    vec3 w = p * 3.0 + vec3(snoise(p * 2.0 + t * 0.01), snoise(p * 2.0 + 7.3 - t * 0.012), snoise(p * 2.0 + 3.1 + t * 0.009)) * 0.6;
    // Granulation: bright cell interiors separated by dark lanes (two scales)
    float g1 = 1.0 - abs(snoise(w * 14.0 + vec3(0.0, t * 0.06, 0.0)));
    float g2 = 1.0 - abs(snoise(w * 38.0 - vec3(t * 0.05, 0.0, t * 0.04)));
    float gran = g1 * g1 * 0.65 + g2 * g2 * g2 * 0.55;
    // Active regions: large bright patches with filamentary structure
    float act = snoise(p * 1.7 + vec3(0.0, t * 0.004, 0.0)) * 0.65 + snoise(p * 4.2 - t * 0.003) * 0.35;
    float region = smoothstep(0.12, 0.7, act);
    float mott = snoise(w * 2.6 + 5.0);
    float fil = 1.0 - abs(snoise(w * 9.0 + 11.0));
    float plage = region * (0.55 + 0.45 * fil * fil);
    // Colour ramp: deep red-orange → orange → gold → near-white
    float heat = clamp(0.16 + 0.5 * gran + 0.12 * mott + 0.85 * plage, 0.0, 1.35);
    vec3 col = mix(vec3(0.62, 0.13, 0.02), vec3(1.00, 0.42, 0.08), smoothstep(0.0, 0.45, heat));
    col = mix(col, vec3(1.00, 0.72, 0.30), smoothstep(0.40, 0.85, heat));
    col = mix(col, vec3(1.00, 0.96, 0.86), smoothstep(0.85, 1.30, heat));
    // Limb: mild darkening, then a thin red rim at the very edge
    float mu = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
    col *= 0.78 + 0.22 * smoothstep(0.0, 0.6, mu);
    col = mix(vec3(0.95, 0.22, 0.05), col, smoothstep(0.02, 0.16, mu));
    if (uFlare.w > 0.0) {
float d = distance(p, normalize(uFlare.xyz));
col += uFlare.w * exp(-d * d / 0.0025) * vec3(1.0, 0.95, 0.85) * 2.2;
    }
    gl_FragColor = vec4(col * 1.08, 1.0);
}
`;

// ---------- Rings: radial profile, planet shadow, lit/unlit side ----------
AERO_GLSL.ringVertex = `
varying vec3 vWorld;
varying float vR;
varying vec3 vWN;
void main(){
    vR = length(position.xy);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vWN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); // camera-relative (precise far from the origin)
}
`;
AERO_GLSL.ringFragment = `
varying vec3 vWorld;
varying float vR;
varying vec3 vWN;
uniform sampler2D uProfile;
uniform float uInner;
uniform float uOuter;
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;
uniform vec3 uSunPos;
uniform float uOpacity;
void main(){
    float t = (vR - uInner) / (uOuter - uInner);
    if (t < 0.0 || t > 1.0) discard;
    vec4 prof = texture2D(uProfile, vec2(t, 0.5));
    vec3 L = normalize(uSunPos - vWorld);
    vec3 oc = vWorld - uPlanetCenter;
    float b = dot(oc, L);
    float c = dot(oc, oc) - uPlanetRadius * uPlanetRadius;
    float disc = b * b - c;
    float shadow = (disc > 0.0 && b < 0.0) ? 1.0 : 0.0;
    vec3 V = normalize(cameraPosition - vWorld);
    float sameSide = sign(dot(vWN, L)) * sign(dot(vWN, V));
    float lit = sameSide > 0.0 ? 1.0 : 0.38 + 0.3 * (1.0 - prof.a);
    vec3 col = prof.rgb * lit * mix(1.0, 0.05, shadow);
    gl_FragColor = vec4(col, prof.a * uOpacity);
}
`;

// ---------- Thin atmospheric haze (Mars, Venus, Titan, Neptune...) ----------
AERO_GLSL.hazeVertex = `
varying vec3 vWN;
varying vec3 vView;
varying vec3 vWorld;
void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vWN = normalize(mat3(modelMatrix) * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz) * mat3(viewMatrix); // view-space → world (transpose of the rotation)
    gl_Position = projectionMatrix * mv; // camera-relative (precise far from the origin)
}
`;
AERO_GLSL.hazeFragment = `
varying vec3 vWN;
varying vec3 vView;
varying vec3 vWorld;
uniform vec3 uColor;
uniform vec3 uSunPos;
uniform float uPower;
uniform float uIntensity;
uniform float uBase;
void main(){
    vec3 n = normalize(vWN);
    float viewDot = clamp(dot(n, normalize(vView)), 0.0, 1.0);
    float fres = pow(1.0 - viewDot, uPower);
    float sunDot = dot(n, normalize(uSunPos - vWorld));
    float day = smoothstep(-0.25, 0.4, sunDot);
    float a = (fres * uIntensity + uBase) * day;
    gl_FragColor = vec4(uColor * day, clamp(a, 0.0, 0.95));
}
`;

// ---------- Sun chromosphere + corona shell (additive, view-ray impact parameter) ----------
AERO_GLSL.glowVertex = `
varying vec3 vWorld;
void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
AERO_GLSL.glowFragment = `
varying vec3 vWorld;
uniform vec3 uCenter;
uniform float uCore;
uniform float uTime;
uniform float uCorona;
uniform float uChromo;
${'$'}{NOISE}
// Limb glow: spicule "fringe" and small prominences just outside the edge, plus a warm halo.
void main(){
    vec3 rd = normalize(vWorld - cameraPosition);
    vec3 oc = uCenter - cameraPosition;
    float tc = dot(oc, rd);
    vec3 off = cameraPosition + rd * max(tc, 0.0) - uCenter;
    float r = length(off) / uCore;
    if (tc < 0.0) r = 9.0;
    vec3 dir = normalize(off + vec3(1e-5));
    float edge = max(r - 1.0, 0.0);
    float rim = smoothstep(0.985, 1.0, r);
    // Spicules: thin radial spikes (high angular frequency, low radial)
    float spk = snoise(dir * 55.0 + vec3(uTime * 0.15));
    float spikes = pow(max(spk, 0.0), 2.0) * exp(-edge / 0.035);
    // Prominences: occasional larger tufts
    float pr = smoothstep(0.55, 0.9, snoise(dir * 7.0 + vec3(uTime * 0.01))) * (0.6 + 0.4 * snoise(dir * 30.0 + uTime * 0.05));
    float prom = pr * exp(-edge / 0.07);
    float chromo = exp(-edge / 0.012) * uChromo;
    float halo = (0.55 * exp(-edge / 0.10) + 0.25 * exp(-edge / 0.35) + 0.06 * exp(-edge / 1.2)) * uCorona;
    vec3 col = rim * (vec3(1.0, 0.45, 0.12) * chromo * 1.2 + vec3(1.0, 0.78, 0.45) * spikes * 1.6 + vec3(1.0, 0.55, 0.22) * prom * 1.3)
     + vec3(1.0, 0.55, 0.18) * halo * smoothstep(0.97, 1.01, r);
    gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
}
`;
AERO_GLSL.build = function (vs, fs) {
    return { vertexShader: vs, fragmentShader: fs.split('${NOISE}').join(AERO_GLSL.noise) };
};

