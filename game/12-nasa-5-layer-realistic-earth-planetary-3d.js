/* A.T.L.A.S · section 10 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 10. NASA 5-LAYER REALISTIC EARTH & PLANETARY 3D RENDERING SYSTEM
 ***********************************************************************/
let threeScene, threeCamera, threeRenderer, viewportResizeObserver;
let spacecraftGroup, planetGroup, padGroup, launchStackGroup, starField, cleanroomPedestalGroup, sunBeaconGroup;
let planetTiltGroup, planetSurfaceMesh, planetCloudMesh, earthNightMesh, earthInnerAtmoMesh, earthOuterAtmoMesh, radiationTorusMesh;
let ambientLightRef, sunLightRef, rimLightRef, jupiterBackdropGroup, destinationOverlayGroup, europaCutawayGroup;
let orbitLineMesh, umbraConeMesh, sensorSwathMesh, dsnBeamLine, scThrusterPlume;
let groundTrackLine = null, subSatMarker = null;
let rocketStage1Group, rocketSrbLeft, rocketSrbRight, rocketStage2Group, fairingLeftGroup, fairingRightGroup;
let maxQShockCone, stage1PlumeMesh, stage2PlumeMesh, padExhaustParticles, engineLight;
let cameraMode = 'spacecraft';
let isDragging = false, prevMouse = { x: 0, y: 0 };

let camSpherical = { radius: 6.4, theta: 0.65, phi: 1.15 };
let targetSpherical = { radius: 6.4, theta: 0.65, phi: 1.15 };
let smoothedCamPos = new THREE.Vector3(4, 3, 5);
let smoothedLookAt = new THREE.Vector3(0, 0, 0);
let smoothedExploded = 0;
let smoothedDeploy = 1;

let orbitAngle = 0.6;
let lastBuiltSignature = '';
const planetTextureCache = {};
const planetBumpCache = {};
const planetRoughnessCache = {};
const cloudTextureCache = {};
let jupiterTextureCache = null;
let earthLayeredTextures = null;
let sharedSolarTexture = null;

const sharedSunDirUniform = { value: new THREE.Vector3(26, 9, 0).normalize() };

function getSolarCellTexture() {
    if (sharedSolarTexture) return sharedSolarTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#042f4b';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
    }
    for (let y = 0; y <= 128; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
    sharedSolarTexture = new THREE.CanvasTexture(canvas);
    return sharedSolarTexture;
}

function getEarthLayeredTextures() {
    if (earthLayeredTextures) return earthLayeredTextures;

    const W = 2048, H = 1024;
    const albedoCanvas = document.createElement('canvas');
    albedoCanvas.width = W; albedoCanvas.height = H;
    const aCtx = albedoCanvas.getContext('2d');

    const specCanvas = document.createElement('canvas');
    specCanvas.width = W; specCanvas.height = H;
    const sCtx = specCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = W; bumpCanvas.height = H;
    const bCtx = bumpCanvas.getContext('2d');

    const nightCanvas = document.createElement('canvas');
    nightCanvas.width = W; nightCanvas.height = H;
    const nCtx = nightCanvas.getContext('2d');

    const oceanGrad = aCtx.createLinearGradient(0, 0, 0, H);
    oceanGrad.addColorStop(0.0, '#0a2246');
    oceanGrad.addColorStop(0.2, '#061a3a');
    oceanGrad.addColorStop(0.5, '#041531');
    oceanGrad.addColorStop(0.8, '#061a3a');
    oceanGrad.addColorStop(1.0, '#0a2246');
    aCtx.fillStyle = oceanGrad;
    aCtx.fillRect(0, 0, W, H);

    sCtx.fillStyle = '#242424';
    sCtx.fillRect(0, 0, W, H);

    bCtx.fillStyle = '#000000';
    bCtx.fillRect(0, 0, W, H);

    nCtx.fillStyle = '#000000';
    nCtx.fillRect(0, 0, W, H);

    const lonLatToXY = (lon, lat) => [
        ((lon + 180) / 360) * W,
        ((90 - lat) / 180) * H
    ];

    function drawContinentPolygon(coords, baseColor, mountainRanges = [], desertZones = []) {
        if (!coords.length) return;
        aCtx.save();
        aCtx.beginPath();
        coords.forEach(([lon, lat], i) => {
            const [x, y] = lonLatToXY(lon, lat);
            if (i === 0) aCtx.moveTo(x, y);
            else aCtx.lineTo(x, y);
        });
        aCtx.closePath();
        aCtx.lineJoin = 'round';
        aCtx.lineWidth = 18;
        aCtx.strokeStyle = 'rgba(14, 116, 144, 0.32)';
        aCtx.stroke();
        aCtx.lineWidth = 8;
        aCtx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
        aCtx.stroke();

        aCtx.fillStyle = baseColor;
        aCtx.fill();
        aCtx.clip();

        const latGrad = aCtx.createLinearGradient(0, 0, 0, H);
        latGrad.addColorStop(0.0, '#e2e8f0');
        latGrad.addColorStop(0.16, '#365314');
        latGrad.addColorStop(0.32, '#3f6212');
        latGrad.addColorStop(0.43, '#a16207');
        latGrad.addColorStop(0.50, '#14532d');
        latGrad.addColorStop(0.58, '#a16207');
        latGrad.addColorStop(0.75, '#365314');
        latGrad.addColorStop(1.0, '#f8fafc');
        aCtx.globalAlpha = 0.65;
        aCtx.fillStyle = latGrad;
        aCtx.fillRect(0, 0, W, H);
        aCtx.globalAlpha = 1.0;

        desertZones.forEach(([dlon, dlat, drx, dry, rot]) => {
            const [dx, dy] = lonLatToXY(dlon, dlat);
            const rx = (drx / 360) * W;
            const ry = (dry / 180) * H;
            const dGrad = aCtx.createRadialGradient(dx, dy, rx * 0.1, dx, dy, Math.max(rx, ry));
            dGrad.addColorStop(0, 'rgba(217, 160, 91, 0.92)');
            dGrad.addColorStop(0.6, 'rgba(180, 120, 60, 0.65)');
            dGrad.addColorStop(1, 'rgba(180, 120, 60, 0)');
            aCtx.save();
            aCtx.translate(dx, dy);
            aCtx.rotate(rot || 0);
            aCtx.fillStyle = dGrad;
            aCtx.beginPath();
            aCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            aCtx.fill();
            aCtx.restore();
        });

        mountainRanges.forEach(([lon1, lat1, lon2, lat2, widthDeg]) => {
            const [x1, y1] = lonLatToXY(lon1, lat1);
            const [x2, y2] = lonLatToXY(lon2, lat2);
            const wPx = (widthDeg / 360) * W;
            aCtx.strokeStyle = 'rgba(120, 113, 108, 0.65)';
            aCtx.lineWidth = wPx;
            aCtx.lineCap = 'round';
            aCtx.beginPath();
            aCtx.moveTo(x1, y1);
            aCtx.lineTo(x2, y2);
            aCtx.stroke();

            aCtx.strokeStyle = 'rgba(241, 245, 249, 0.35)';
            aCtx.lineWidth = wPx * 0.35;
            aCtx.stroke();
        });

        aCtx.restore();

        sCtx.save();
        sCtx.beginPath();
        coords.forEach(([lon, lat], i) => {
            const [x, y] = lonLatToXY(lon, lat);
            if (i === 0) sCtx.moveTo(x, y);
            else sCtx.lineTo(x, y);
        });
        sCtx.closePath();
        sCtx.fillStyle = '#d8d8d8';
        sCtx.fill();
        sCtx.restore();

        bCtx.save();
        bCtx.beginPath();
        coords.forEach(([lon, lat], i) => {
            const [x, y] = lonLatToXY(lon, lat);
            if (i === 0) bCtx.moveTo(x, y);
            else bCtx.lineTo(x, y);
        });
        bCtx.closePath();
        bCtx.fillStyle = '#555555';
        bCtx.fill();
        mountainRanges.forEach(([lon1, lat1, lon2, lat2, widthDeg]) => {
            const [x1, y1] = lonLatToXY(lon1, lat1);
            const [x2, y2] = lonLatToXY(lon2, lat2);
            const wPx = (widthDeg / 360) * W;
            bCtx.strokeStyle = '#ffffff';
            bCtx.lineWidth = wPx;
            bCtx.lineCap = 'round';
            bCtx.beginPath();
            bCtx.moveTo(x1, y1);
            bCtx.lineTo(x2, y2);
            bCtx.stroke();
        });
        bCtx.restore();
    }

    drawContinentPolygon(
        [[-168,66],[-162,71],[-140,70],[-125,72],[-95,74],[-80,70],[-62,60],[-53,47],[-66,44],[-75,35],[-81,25],[-83,29],[-90,29],[-97,26],[-96,19],[-88,21],[-84,10],[-78,8],[-82,8],[-92,15],[-105,20],[-112,31],[-117,32],[-124,40],[-125,49],[-135,58],[-152,60],[-162,55]],
        '#2d4c1e',
        [[-145,62,-105,25,6], [-82,35,-70,45,3.5]],
        [[-112,34,10,7,0.3]]
    );
    drawContinentPolygon([[-72,78],[-55,82],[-22,82],[-18,72],[-25,68],[-43,60],[-52,64],[-58,74]], '#f1f5f9', [[-45,64,-35,78,5]], []);
    drawContinentPolygon(
        [[-78,9],[-72,11],[-62,10],[-50,1],[-35,-6],[-38,-14],[-40,-22],[-48,-28],[-54,-34],[-62,-40],[-67,-50],[-69,-55],[-74,-52],[-73,-40],[-71,-30],[-70,-18],[-76,-12],[-81,-5],[-79,2]],
        '#164e26',
        [[-76,5,-70,-18,4.5], [-70,-18,-71,-52,4.5]],
        [[-68,-24,5,8,0.1]]
    );
    drawContinentPolygon(
        [[-9,37],[-9,43],[-2,43],[-4,48],[2,51],[8,54],[8,58],[5,62],[14,68],[28,71],[32,68],[28,60],[22,55],[15,54],[29,46],[28,41],[23,37],[18,40],[16,38],[12,42],[9,44],[5,43],[3,42],[0,38],[-5,36]],
        '#365314',
        [[6,45,16,47,3.5], [10,60,20,69,3.5]],
        []
    );
    drawContinentPolygon([[-6,50],[-5,55],[-2,58],[1,53],[1,51]], '#365314', [], []);
    drawContinentPolygon(
        [[-17,15],[-16,22],[-9,30],[-5,36],[10,37],[12,33],[25,32],[33,31],[38,22],[43,12],[51,12],[49,4],[41,-3],[40,-11],[35,-19],[35,-25],[28,-33],[18,-34],[15,-26],[12,-17],[13,-8],[9,-1],[9,4],[3,6],[-8,4],[-13,8]],
        '#3f6212',
        [[-6,32,8,36,3.5], [36,8,34,-15,4.5]],
        [[12,24,26,9,0.05], [22,-23,7,6,0]]
    );
    drawContinentPolygon([[44,-16],[49,-13],[50,-18],[47,-25],[43,-24]], '#2d4c1e', [], []);
    drawContinentPolygon(
        [[28,41],[40,42],[50,40],[55,46],[65,55],[70,68],[90,74],[115,73],[140,72],[170,68],[178,65],[162,58],[156,51],[142,53],[135,45],[128,39],[122,40],[118,38],[122,31],[118,24],[109,20],[108,12],[103,2],[98,10],[96,16],[90,22],[80,15],[77,8],[72,18],[67,24],[58,25],[51,28],[59,22],[55,16],[44,12],[39,21],[34,29],[36,37],[27,38]],
        '#38541b',
        [[44,38,68,36,4.5], [72,36,102,28,8.5], [95,35,120,45,5.0]],
        [[45,23,9,7,-0.4], [62,30,10,6,0.1], [102,42,16,7,0.15]]
    );
    drawContinentPolygon([[95,5],[105,-5],[106,-7],[100,-2]], '#155e32', [], []);
    drawContinentPolygon([[109,2],[117,6],[117,-3],[111,-3]], '#155e32', [], []);
    drawContinentPolygon([[120,18],[122,14],[125,7],[122,6]], '#155e32', [], []);
    drawContinentPolygon([[130,31],[136,35],[141,41],[144,44],[140,38],[132,33]], '#2d4c1e', [], []);
    drawContinentPolygon([[132,-2],[141,-3],[150,-9],[146,-9],[136,-5]], '#155e32', [], []);
    drawContinentPolygon(
        [[114,-22],[122,-16],[131,-12],[136,-14],[142,-11],[146,-18],[153,-26],[150,-37],[140,-38],[135,-34],[128,-32],[118,-35],[114,-30]],
        '#7c4a1e',
        [[146,-16,149,-37,3.5]],
        [[128,-25,14,8,0.05]]
    );
    drawContinentPolygon([[167,-45],[173,-41],[178,-37],[175,-42],[169,-46]], '#2d4c1e', [], []);
    drawContinentPolygon(
        [[-180,-72],[-130,-74],[-80,-70],[-60,-64],[-30,-72],[10,-70],[50,-67],[90,-66],[140,-67],[170,-72],[180,-75],[180,-90],[-180,-90]],
        '#f8fafc',
        [[0,-76,120,-82,8]],
        []
    );

    const cityHubs = [
        [-74,40.7,28],[-71,42.3,18],[-77,38.9,22],[-80,25.8,16],[-84,33.7,18],[-87.6,41.8,24],[-79.4,43.6,18],
        [-95.3,29.7,20],[-96.8,32.7,20],[-118.2,34.0,26],[-122.4,37.7,20],[-122.3,47.6,15],[-99.1,19.4,24],
        [-46.6,-23.5,26],[-43.2,-22.9,20],[-58.4,-34.6,24],[-70.6,-33.4,16],[-74.0,4.7,16],[-77.0,-12.0,15],
        [-0.1,51.5,28],[2.3,48.8,26],[4.9,52.3,24],[7.0,51.4,26],[-3.7,40.4,20],[2.1,41.4,18],[9.2,45.4,24],
        [12.5,41.9,18],[13.4,52.5,20],[16.3,48.2,16],[21.0,52.2,16],[37.6,55.7,28],[30.3,59.9,18],
        [31.2,30.0,26],[29.0,41.0,22],[35.2,32.0,16],[55.3,25.2,20],[46.7,24.7,18],[3.4,6.5,20],[28.0,-26.2,20],
        [77.2,28.6,30],[72.8,19.0,26],[88.3,22.5,24],[77.6,12.9,20],[80.2,13.0,18],[67.0,24.8,18],
        [116.4,39.9,30],[121.4,31.2,32],[113.2,23.1,30],[114.1,22.3,24],[126.9,37.5,26],[139.7,35.7,34],
        [135.5,34.7,24],[121.0,14.6,20],[100.5,13.7,22],[103.8,1.3,20],[106.8,-6.2,26],
        [151.2,-33.8,18],[144.9,-37.8,16],[153.0,-27.4,14]
    ];

    cityHubs.forEach(([lon, lat, spread]) => {
        const [cx, cy] = lonLatToXY(lon, lat);
        const grad = nCtx.createRadialGradient(cx, cy, 1, cx, cy, spread * 1.4);
        grad.addColorStop(0, 'rgba(255, 243, 196, 0.95)');
        grad.addColorStop(0.35, 'rgba(251, 191, 36, 0.65)');
        grad.addColorStop(0.7, 'rgba(217, 119, 6, 0.22)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        nCtx.fillStyle = grad;
        nCtx.beginPath();
        nCtx.arc(cx, cy, spread * 1.4, 0, Math.PI * 2);
        nCtx.fill();

        for (let k = 0; k < 28; k++) {
            const ang = (k * 137.5) * (Math.PI / 180);
            const dist = Math.sqrt(k / 28) * spread * 1.3;
            const px = cx + Math.cos(ang) * dist;
            const py = cy + Math.sin(ang) * dist * 0.75;
            nCtx.fillStyle = k % 3 === 0 ? '#fef08a' : '#f59e0b';
            nCtx.fillRect(px, py, 1.8, 1.8);
        }
    });

    const albedoTex = new THREE.CanvasTexture(albedoCanvas);
    const roughnessTex = new THREE.CanvasTexture(specCanvas);
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    const nightTex = new THREE.CanvasTexture(nightCanvas);
    const cloudsTex = getProceduralCloudTexture('earth');

    if (threeRenderer) {
        const maxAniso = threeRenderer.capabilities.getMaxAnisotropy();
        [albedoTex, roughnessTex, bumpTex, nightTex, cloudsTex].forEach(t => {
            t.anisotropy = maxAniso;
        });
    }

    earthLayeredTextures = {
        albedo: albedoTex,
        roughness: roughnessTex,
        bump: bumpTex,
        night: nightTex,
        clouds: cloudsTex
    };

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const baseRepo = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/';
    loader.load(baseRepo + 'earth_atmos_2048.jpg', (tex) => {
        if (threeRenderer) tex.anisotropy = threeRenderer.capabilities.getMaxAnisotropy();
        earthLayeredTextures.albedo = tex;
        if (planetSurfaceMesh && planetSurfaceMesh.userData.body === 'earth') {
            planetSurfaceMesh.material.map = tex;
            planetSurfaceMesh.material.needsUpdate = true;
        }
    }, undefined, () => {});

    loader.load(baseRepo + 'earth_normal_2048.jpg', (tex) => {
        if (threeRenderer) tex.anisotropy = threeRenderer.capabilities.getMaxAnisotropy();
        earthLayeredTextures.normal = tex;
        if (planetSurfaceMesh && planetSurfaceMesh.userData.body === 'earth') {
            planetSurfaceMesh.material.normalMap = tex;
            planetSurfaceMesh.material.normalScale = new THREE.Vector2(0.85, 0.85);
            planetSurfaceMesh.material.needsUpdate = true;
        }
    }, undefined, () => {});

    loader.load(baseRepo + 'earth_clouds_1024.png', (tex) => {
        if (threeRenderer) tex.anisotropy = threeRenderer.capabilities.getMaxAnisotropy();
        earthLayeredTextures.clouds = tex;
        if (planetCloudMesh && planetCloudMesh.userData.body === 'earth') {
            planetCloudMesh.material.map = tex;
            planetCloudMesh.material.alphaMap = tex;
            planetCloudMesh.material.needsUpdate = true;
        }
    }, undefined, () => {});

    loader.load(baseRepo + 'earth_lights_2048.png', (tex) => {
        if (threeRenderer) tex.anisotropy = threeRenderer.capabilities.getMaxAnisotropy();
        earthLayeredTextures.night = tex;
        if (earthNightMesh && earthNightMesh.material && earthNightMesh.material.uniforms) {
            earthNightMesh.material.uniforms.uNightMap.value = tex;
        }
    }, undefined, () => {});

    return earthLayeredTextures;
}

/**
 * High-Resolution (2048x1024) Scientifically Inspired Procedural Planetary Maps
 * for ARTEMIS (Moon), RED HORIZON (Mars), and EUROPA (Icy Moon + Jupiter),
 * supporting scientific observation overlays and topographic bump/roughness maps.
 */
function getDestinationLayeredMaps(body, layerId = 'natural', dustStorm = false) {
    const cacheKey = `${body}_${layerId}_${dustStorm ? 'storm' : 'nom'}`;
    if (planetTextureCache[cacheKey]) {
        return {
            albedo: planetTextureCache[cacheKey],
            bump: planetBumpCache[body],
            roughness: planetRoughnessCache[body]
        };
    }

    const W = 2048, H = 1024;
    const aCanvas = document.createElement('canvas');
    aCanvas.width = W; aCanvas.height = H;
    const aCtx = aCanvas.getContext('2d');

    let bumpTex = planetBumpCache[body];
    let roughTex = planetRoughnessCache[body];
    let bCtx = null, rCtx = null, bCanvas = null, rCanvas = null;

    if (!bumpTex || !roughTex) {
        bCanvas = document.createElement('canvas');
        bCanvas.width = W; bCanvas.height = H;
        bCtx = bCanvas.getContext('2d');
        bCtx.fillStyle = '#808080';
        bCtx.fillRect(0, 0, W, H);

        rCanvas = document.createElement('canvas');
        rCanvas.width = W; rCanvas.height = H;
        rCtx = rCanvas.getContext('2d');
        rCtx.fillStyle = body === 'europa' ? '#505050' : '#d8d8d8';
        rCtx.fillRect(0, 0, W, H);
    }

    const lonLatToXY = (lon, lat) => [
        ((lon + 180) / 360) * W,
        ((90 - lat) / 180) * H
    ];

    // =========================================================================
    // DESTINATION 1: ARTEMIS LUNAR SOUTH POLE (targetBody: 'moon')
    // =========================================================================
    if (body === 'moon') {
        // Base Lunar Highlands & Regolith Albedo
        const baseGrad = aCtx.createLinearGradient(0, 0, 0, H);
        baseGrad.addColorStop(0.0, '#787e87');
        baseGrad.addColorStop(0.25, '#8c929b');
        baseGrad.addColorStop(0.5, '#828891');
        baseGrad.addColorStop(0.82, '#757b84');
        baseGrad.addColorStop(0.93, '#555b64'); // Rugged South Polar Aitken & Highland rim
        baseGrad.addColorStop(1.0, '#2a2e35');  // Deep South Pole low-angle shadow zone
        aCtx.fillStyle = baseGrad;
        aCtx.fillRect(0, 0, W, H);

        // Ancient Dark Basaltic Lunar Maria Basins (Imbrium, Serenitatis, Tranquillitatis, Procellarum, SPA)
        const mariaBasins = [
            [-20, 32, 32, 22, 'rgba(56, 61, 69, 0.78)'],
            [18, 26, 22, 16, 'rgba(52, 57, 65, 0.82)'],
            [30, 10, 26, 18, 'rgba(58, 63, 72, 0.76)'],
            [-48, 18, 42, 30, 'rgba(60, 65, 74, 0.72)'],
            [58, 16, 16, 12, 'rgba(48, 53, 62, 0.84)'],
            [-15, -18, 25, 16, 'rgba(62, 67, 75, 0.70)'],
            [170, -56, 48, 32, 'rgba(44, 48, 56, 0.76)'], // South Pole-Aitken Basin
            [-170, -56, 45, 30, 'rgba(44, 48, 56, 0.76)']
        ];
        mariaBasins.forEach(([lon, lat, rxDeg, ryDeg, col]) => {
            const [x, y] = lonLatToXY(lon, lat);
            const rx = (rxDeg / 360) * W;
            const ry = (ryDeg / 180) * H;
            const g = aCtx.createRadialGradient(x, y, rx * 0.1, x, y, Math.max(rx, ry));
            g.addColorStop(0, col);
            g.addColorStop(0.7, col);
            g.addColorStop(1, 'rgba(120,126,135,0)');
            aCtx.fillStyle = g;
            aCtx.beginPath();
            aCtx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
            aCtx.fill();
            if (bCtx) {
                bCtx.fillStyle = '#505050';
                bCtx.beginPath();
                bCtx.ellipse(x, y, rx * 0.85, ry * 0.85, 0, 0, Math.PI * 2);
                bCtx.fill();
            }
        });

        // Thousands of Multi-Scale Impact Craters with Ejecta Rays, Bright Rims & Shadowed Floors
        for (let i = 0; i < 950; i++) {
            const cx = ((Math.sin(i * 127.1 + 1.3) * 0.5 + 0.5) * W);
            // Weight more craters toward the southern highlands and polar region
            const latFactor = Math.pow((i % 100) / 100, 0.82);
            const cy = (i % 5 === 0) ? (H * 0.82 + (Math.cos(i * 43.7) * 0.5 + 0.5) * H * 0.175) : (latFactor * H);
            const r = (i % 19 === 0) ? (16 + (i % 28)) : (2.2 + (i % 11));
            const latScale = Math.min(2.6, 1 / Math.max(0.25, Math.sin((cy / H) * Math.PI)));

            // Bright Ejecta Rim
            aCtx.strokeStyle = i % 11 === 0 ? 'rgba(226, 232, 240, 0.55)' : 'rgba(182, 190, 201, 0.42)';
            aCtx.lineWidth = Math.max(1.2, r * 0.18);
            aCtx.beginPath();
            aCtx.ellipse(cx, cy, r * latScale, r, 0, 0, Math.PI * 2);
            aCtx.stroke();

            // Depressed Crater Floor (darker near poles)
            const isPolar = cy > H * 0.86;
            aCtx.fillStyle = isPolar ? 'rgba(15, 20, 28, 0.82)' : 'rgba(68, 74, 82, 0.65)';
            aCtx.beginPath();
            aCtx.ellipse(cx, cy, r * 0.78 * latScale, r * 0.78, 0, 0, Math.PI * 2);
            aCtx.fill();

            if (bCtx) {
                bCtx.strokeStyle = '#ffffff';
                bCtx.lineWidth = Math.max(1.5, r * 0.22);
                bCtx.beginPath();
                bCtx.ellipse(cx, cy, r * latScale, r, 0, 0, Math.PI * 2);
                bCtx.stroke();
                bCtx.fillStyle = '#1e1e1e';
                bCtx.beginPath();
                bCtx.ellipse(cx, cy, r * 0.72 * latScale, r * 0.72, 0, 0, Math.PI * 2);
                bCtx.fill();
            }
        }

        // Dedicated Lunar South Pole (Shackleton, Shoemaker, Haworth, Faustini PSR Craters & Sunlit Massifs)
        for (let px = 0; px < W; px += 38) {
            const rimY = H - 24 - Math.sin(px * 0.025) * 10;
            // Sunlit elevated polar mountain ridge (Mons Malapert / Leibnitz Beta)
            aCtx.fillStyle = 'rgba(226, 232, 240, 0.75)';
            aCtx.fillRect(px, rimY - 5, 24, 5);
            // Permanently Shadowed Crater Interior (PSR)
            aCtx.fillStyle = '#090d14';
            aCtx.beginPath();
            aCtx.ellipse(px + 14, H - 12, 22, 10, 0, 0, Math.PI * 2);
            aCtx.fill();
            if (bCtx) {
                bCtx.fillStyle = '#ffffff';
                bCtx.fillRect(px, rimY - 6, 26, 6);
                bCtx.fillStyle = '#050505';
                bCtx.beginPath();
                bCtx.ellipse(px + 14, H - 12, 20, 9, 0, 0, Math.PI * 2);
                bCtx.fill();
            }
        }

        // Optional Scientific Observation Overlays for Artemis
        if (layerId === 'elevation') {
            // LOLA Polar Topographic Hypsometric Tint near South Pole
            const elevGrad = aCtx.createLinearGradient(0, H * 0.68, 0, H);
            elevGrad.addColorStop(0.0, 'rgba(16, 185, 129, 0.0)');
            elevGrad.addColorStop(0.4, 'rgba(234, 179, 8, 0.35)');
            elevGrad.addColorStop(0.75, 'rgba(249, 115, 22, 0.45)');
            elevGrad.addColorStop(0.92, 'rgba(168, 85, 247, 0.55)');
            elevGrad.addColorStop(1.0, 'rgba(59, 130, 246, 0.65)');
            aCtx.fillStyle = elevGrad;
            aCtx.fillRect(0, H * 0.68, W, H * 0.32);
        } else if (layerId === 'psr') {
            // Highlight Permanently Shadowed Regions (PSRs) in subtle amber/indigo telemetry outline
            for (let px = 20; px < W; px += 85) {
                aCtx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
                aCtx.lineWidth = 2.5;
                aCtx.beginPath();
                aCtx.ellipse(px, H - 18 - (px % 14), 32, 11, 0, 0, Math.PI * 2);
                aCtx.stroke();
            }
        } else if (layerId === 'ice_zones') {
            // Subtle Scientific Investigation Target Zones (Modeled Neutron/Radar Data, not raw glowing ice)
            for (let px = 25; px < W; px += 95) {
                const iy = H - 16 - (px % 12);
                aCtx.strokeStyle = 'rgba(56, 189, 248, 0.88)';
                aCtx.lineWidth = 2;
                aCtx.setLineDash([6, 4]);
                aCtx.beginPath();
                aCtx.ellipse(px, iy, 28, 10, 0, 0, Math.PI * 2);
                aCtx.stroke();
                aCtx.setLineDash([]);
                aCtx.fillStyle = 'rgba(14, 165, 233, 0.28)';
                aCtx.fill();
            }
        }
    }
    // =========================================================================
    // DESTINATION 2: RED HORIZON MARS ORBITER (targetBody: 'mars')
    // =========================================================================
    else if (body === 'mars') {
        // Rusty-red, ochre, and iron-oxide global latitudinal terrain
        const marsGrad = aCtx.createLinearGradient(0, 0, 0, H);
        marsGrad.addColorStop(0.0, '#f8fafc');  // North Polar Water/CO2 Ice Cap (Planum Boreum)
        marsGrad.addColorStop(0.05, '#d97706');
        marsGrad.addColorStop(0.22, '#b45309'); // Northern lowlands (Vastitas Borealis)
        marsGrad.addColorStop(0.48, '#c2410c'); // Equatorial rusty ochre highlands
        marsGrad.addColorStop(0.68, '#9a3412'); // Southern cratered highlands
        marsGrad.addColorStop(0.95, '#7c2d12');
        marsGrad.addColorStop(1.0, '#f1f5f9');  // South Polar Ice Cap (Planum Australe)
        aCtx.fillStyle = marsGrad;
        aCtx.fillRect(0, 0, W, H);

        // Dark Basaltic Albedo Regions (Syrtis Major, Acidalia Planitia, Sinus Meridiani)
        const basaltRegions = [
            [68, 10, 22, 28, 'rgba(67, 24, 12, 0.68)'],   // Syrtis Major
            [-30, 46, 38, 22, 'rgba(75, 32, 18, 0.58)'],  // Acidalia Planitia
            [-10, -5, 32, 14, 'rgba(68, 26, 14, 0.62)'],  // Sinus Sabaeus / Meridiani
            [115, -22, 30, 18, 'rgba(72, 28, 15, 0.56)']  // Mare Tyrrhenum
        ];
        basaltRegions.forEach(([lon, lat, rxD, ryD, col]) => {
            const [x, y] = lonLatToXY(lon, lat);
            const rx = (rxD / 360) * W, ry = (ryD / 180) * H;
            const g = aCtx.createRadialGradient(x, y, rx * 0.1, x, y, Math.max(rx, ry));
            g.addColorStop(0, col);
            g.addColorStop(1, 'rgba(154,52,18,0)');
            aCtx.fillStyle = g;
            aCtx.beginPath();
            aCtx.ellipse(x, y, rx, ry, 0.25, 0, Math.PI * 2);
            aCtx.fill();
        });

        // 1. Tharsis Volcanic Bulge & Olympus Mons (18.6°N, 133.8°W) + Tharsis Montes
        const volcanoes = [
            [-133.8, 18.6, 14], // Olympus Mons
            [-104.5, 11.2, 8.5], // Ascraeus Mons
            [-112.9, 0.8, 8.5],  // Pavonis Mons
            [-120.1, -9.2, 9.0], // Arsia Mons
            [147.2, 25.0, 8.0]   // Elysium Mons
        ];
        volcanoes.forEach(([vlon, vlat, radDeg]) => {
            const [vx, vy] = lonLatToXY(vlon, vlat);
            const vr = (radDeg / 360) * W;
            const vg = aCtx.createRadialGradient(vx, vy, vr * 0.08, vx, vy, vr);
            vg.addColorStop(0, '#451a03'); // Summit caldera
            vg.addColorStop(0.18, '#ea580c');
            vg.addColorStop(0.55, '#9a3412');
            vg.addColorStop(1, 'rgba(154, 52, 18, 0)');
            aCtx.fillStyle = vg;
            aCtx.beginPath();
            aCtx.arc(vx, vy, vr, 0, Math.PI * 2);
            aCtx.fill();

            if (bCtx) {
                const bg = bCtx.createRadialGradient(vx, vy, vr * 0.1, vx, vy, vr);
                bg.addColorStop(0, '#101010');
                bg.addColorStop(0.2, '#ffffff');
                bg.addColorStop(1, '#808080');
                bCtx.fillStyle = bg;
                bCtx.beginPath();
                bCtx.arc(vx, vy, vr, 0, Math.PI * 2);
                bCtx.fill();
            }
        });

        // 2. Valles Marineris Grand Canyon System (-14°S, -95°W to -35°W)
        const [vmX1, vmY1] = lonLatToXY(-96, -11);
        const [vmX2, vmY2] = lonLatToXY(-36, -15);
        aCtx.save();
        aCtx.strokeStyle = '#3b1106';
        aCtx.lineWidth = 16;
        aCtx.lineCap = 'round';
        aCtx.beginPath();
        aCtx.moveTo(vmX1, vmY1);
        aCtx.bezierCurveTo(vmX1 + 110, vmY1 + 14, vmX2 - 110, vmY2 - 8, vmX2, vmY2);
        aCtx.stroke();
        aCtx.strokeStyle = '#f59e0b';
        aCtx.lineWidth = 3;
        aCtx.stroke();
        aCtx.restore();

        if (bCtx) {
            bCtx.strokeStyle = '#080808';
            bCtx.lineWidth = 18;
            bCtx.beginPath();
            bCtx.moveTo(vmX1, vmY1);
            bCtx.bezierCurveTo(vmX1 + 110, vmY1 + 14, vmX2 - 110, vmY2 - 8, vmX2, vmY2);
            bCtx.stroke();
        }

        // 3. Hellas Planitia & Argyre Ancient Impact Basins
        const [hx, hy] = lonLatToXY(70.5, -42.4);
        const hRx = (26 / 360) * W, hRy = (19 / 180) * H;
        const hGrad = aCtx.createRadialGradient(hx, hy, hRx * 0.1, hx, hy, hRx);
        hGrad.addColorStop(0, 'rgba(217, 119, 6, 0.85)');
        hGrad.addColorStop(0.75, 'rgba(124, 45, 18, 0.75)');
        hGrad.addColorStop(1, 'rgba(124, 45, 18, 0)');
        aCtx.fillStyle = hGrad;
        aCtx.beginPath();
        aCtx.ellipse(hx, hy, hRx, hRy, 0, 0, Math.PI * 2);
        aCtx.fill();

        // Martian Southern Highland Craters & Aeolian Sand Dunes
        for (let i = 0; i < 420; i++) {
            const cx = (Math.sin(i * 89.3) * 0.5 + 0.5) * W;
            const cy = H * 0.35 + (Math.cos(i * 53.1) * 0.5 + 0.5) * H * 0.55;
            const r = 4 + (i % 18);
            aCtx.strokeStyle = 'rgba(251, 146, 60, 0.32)';
            aCtx.lineWidth = 1.6;
            aCtx.beginPath();
            aCtx.ellipse(cx, cy, r * 1.2, r, 0, 0, Math.PI * 2);
            aCtx.stroke();
            aCtx.fillStyle = 'rgba(67, 20, 7, 0.42)';
            aCtx.fill();
        }

        // Optional Mars Scientific Observation Overlays (Simulated Mission Telemetry)
        if (layerId === 'atmo_zones') {
            // Simulated Trace-Gas / Methane Plume Research Target Zones (Nili Fossae, Gale, Valles Marineris)
            [[76.8, 22.0, 22], [-59.0, -14.0, 28], [137.4, -5.4, 20]].forEach(([lon, lat, deg]) => {
                const [zx, zy] = lonLatToXY(lon, lat);
                const zr = (deg / 360) * W;
                aCtx.strokeStyle = 'rgba(52, 211, 153, 0.9)';
                aCtx.lineWidth = 3;
                aCtx.setLineDash([8, 5]);
                aCtx.beginPath();
                aCtx.arc(zx, zy, zr, 0, Math.PI * 2);
                aCtx.stroke();
                aCtx.setLineDash([]);
                aCtx.fillStyle = 'rgba(16, 185, 129, 0.22)';
                aCtx.fill();
            });
        } else if (layerId === 'subsurface_ice') {
            // Mid-latitude Buried Glacier & Lobate Debris Apron Targets (Deuteronilus Mensae, Hellas rim, Utopia)
            aCtx.fillStyle = 'rgba(56, 189, 248, 0.28)';
            aCtx.fillRect(0, H * 0.16, W, H * 0.14);
            aCtx.fillRect(0, H * 0.70, W, H * 0.14);
            aCtx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            aCtx.lineWidth = 2.5;
            aCtx.strokeRect(0, H * 0.16, W, H * 0.14);
            aCtx.strokeRect(0, H * 0.70, W, H * 0.14);
        } else if (layerId === 'polar_ice') {
            // Highlight North & South Layered Polar Ice Caps
            aCtx.fillStyle = 'rgba(186, 230, 253, 0.75)';
            aCtx.fillRect(0, 0, W, H * 0.10);
            aCtx.fillRect(0, H * 0.90, W, H * 0.10);
        } else if (layerId === 'elevation') {
            // MOLA Topographic Hypsometric Color Overlay
            const mola = aCtx.createLinearGradient(0, 0, 0, H);
            mola.addColorStop(0.0, 'rgba(59, 130, 246, 0.48)'); // Low northern plains
            mola.addColorStop(0.35, 'rgba(16, 185, 129, 0.38)');
            mola.addColorStop(0.55, 'rgba(234, 179, 8, 0.42)');
            mola.addColorStop(0.85, 'rgba(239, 68, 68, 0.45)'); // High southern highlands
            mola.addColorStop(1.0, 'rgba(255, 255, 255, 0.5)');
            aCtx.fillStyle = mola;
            aCtx.fillRect(0, 0, W, H);
        } else if (layerId === 'dust_cond' || dustStorm) {
            aCtx.fillStyle = 'rgba(245, 158, 11, 0.42)';
            aCtx.fillRect(0, 0, W, H);
        }
    }
    // =========================================================================
    // DESTINATION 3: EUROPA OCEAN RECON (targetBody: 'europa')
    // =========================================================================
    else if (body === 'europa') {
        // Bright Frozen Water-Ice Shell with subtle bluish-gray & pale cream cryosphere regions
        const iceGrad = aCtx.createLinearGradient(0, 0, 0, H);
        iceGrad.addColorStop(0.0, '#d8e4ee');
        iceGrad.addColorStop(0.25, '#f1f5f9');
        iceGrad.addColorStop(0.5, '#e6eef6');
        iceGrad.addColorStop(0.75, '#f1f5f9');
        iceGrad.addColorStop(1.0, '#d8e4ee');
        aCtx.fillStyle = iceGrad;
        aCtx.fillRect(0, 0, W, H);

        // Subtle regional non-ice hydrated salt/sulfuric acid discoloration patches (Trailing hemisphere)
        const saltPatches = [
            [-95, 8, 55, 38, 'rgba(180, 130, 95, 0.28)'],
            [-165, -22, 48, 32, 'rgba(165, 110, 80, 0.26)'],
            [45, 15, 42, 28, 'rgba(186, 215, 235, 0.35)']
        ];
        saltPatches.forEach(([lon, lat, rxD, ryD, col]) => {
            const [x, y] = lonLatToXY(lon, lat);
            const rx = (rxD / 360) * W, ry = (ryD / 180) * H;
            const g = aCtx.createRadialGradient(x, y, rx * 0.1, x, y, Math.max(rx, ry));
            g.addColorStop(0, col);
            g.addColorStop(1, 'rgba(241,245,249,0)');
            aCtx.fillStyle = g;
            aCtx.beginPath();
            aCtx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
            aCtx.fill();
        });

        // Intersecting Geological Lineae (Dark Reddish-Brown Double Ridges, Cycloids & Dilational Bands)
        for (let j = 0; j < 95; j++) {
            const x0 = ((j * 79) % W);
            const y0 = 60 + ((j * 43) % (H - 120));
            const x1 = (x0 + 380 + (j % 5) * 140) % W;
            const y1 = Math.max(50, Math.min(H - 50, y0 + ((j % 2 === 0 ? 1 : -1) * (90 + (j % 180)))));
            const cx1 = (x0 + x1) * 0.5 + Math.sin(j) * 140;
            const cy1 = (y0 + y1) * 0.5 + Math.cos(j) * 90;

            // Outer reddish-brown hydrated salt band
            const isMajorBand = j % 6 === 0;
            aCtx.strokeStyle = isMajorBand ? 'rgba(133, 62, 35, 0.62)' : 'rgba(161, 92, 58, 0.42)';
            aCtx.lineWidth = isMajorBand ? 5.5 : 2.2;
            aCtx.beginPath();
            aCtx.moveTo(x0, y0);
            aCtx.quadraticCurveTo(cx1, cy1, x1, y1);
            aCtx.stroke();

            // Central bright ice trough inside double ridge
            if (isMajorBand) {
                aCtx.strokeStyle = 'rgba(248, 250, 252, 0.72)';
                aCtx.lineWidth = 1.4;
                aCtx.stroke();
            }

            if (bCtx) {
                bCtx.strokeStyle = '#ffffff';
                bCtx.lineWidth = isMajorBand ? 6 : 2.5;
                bCtx.beginPath();
                bCtx.moveTo(x0, y0);
                bCtx.quadraticCurveTo(cx1, cy1, x1, y1);
                bCtx.stroke();
            }
        }

        // Chaos Terrain Formations (Conamara Chaos, Thera Macula, Murias Chaos) - Disrupted Ice Matrix
        const chaosRegions = [
            [-87.2, 9.7, 16, 14],
            [-181.2, -46.7, 18, 14],
            [-88.6, -25.2, 12, 12] // Pwyll crater & bright rays
        ];
        chaosRegions.forEach(([lon, lat, rxD, ryD], idx) => {
            const [cx, cy] = lonLatToXY(lon, lat);
            const rx = (rxD / 360) * W, ry = (ryD / 180) * H;
            aCtx.fillStyle = idx === 2 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(142, 76, 46, 0.58)';
            aCtx.beginPath();
            aCtx.ellipse(cx, cy, rx, ry, 0.3, 0, Math.PI * 2);
            aCtx.fill();

            // Polygon ice rafts inside chaos matrix
            for (let b = 0; b < 14; b++) {
                const bx = cx + Math.cos(b * 2.1) * rx * 0.55;
                const by = cy + Math.sin(b * 1.7) * ry * 0.55;
                aCtx.fillStyle = '#f8fafc';
                aCtx.fillRect(bx, by, 7, 5);
            }
        });

        // Optional Scientific Overlays for Europa
        if (layerId === 'fractures') {
            // Highlight active tidal-flexing lineae & double ridges
            aCtx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
            aCtx.lineWidth = 3;
            for (let k = 0; k < 18; k++) {
                aCtx.beginPath();
                aCtx.moveTo((k * 120) % W, H * 0.25);
                aCtx.bezierCurveTo(W * 0.3, H * 0.5, W * 0.7, H * 0.5, ((k * 120) + 500) % W, H * 0.75);
                aCtx.stroke();
            }
        } else if (layerId === 'chaos_terrain') {
            chaosRegions.forEach(([lon, lat, rxD]) => {
                const [cx, cy] = lonLatToXY(lon, lat);
                const r = (rxD / 360) * W * 1.35;
                aCtx.strokeStyle = 'rgba(56, 189, 248, 0.92)';
                aCtx.lineWidth = 3.5;
                aCtx.setLineDash([8, 4]);
                aCtx.beginPath();
                aCtx.arc(cx, cy, r, 0, Math.PI * 2);
                aCtx.stroke();
                aCtx.setLineDash([]);
            });
        } else if (layerId === 'radiation_env') {
            const radGrad = aCtx.createLinearGradient(0, 0, W, 0);
            radGrad.addColorStop(0.0, 'rgba(244, 63, 94, 0.28)');
            radGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.05)');
            radGrad.addColorStop(1.0, 'rgba(244, 63, 94, 0.32)');
            aCtx.fillStyle = radGrad;
            aCtx.fillRect(0, 0, W, H);
        }
    }

    const albedoTex = new THREE.CanvasTexture(aCanvas);
    if (bCanvas && rCanvas) {
        bumpTex = new THREE.CanvasTexture(bCanvas);
        roughTex = new THREE.CanvasTexture(rCanvas);
        planetBumpCache[body] = bumpTex;
        planetRoughnessCache[body] = roughTex;
    }
    if (threeRenderer) {
        const aniso = threeRenderer.capabilities.getMaxAnisotropy();
        albedoTex.anisotropy = aniso;
        if (bumpTex) bumpTex.anisotropy = aniso;
    }

    // Attempt asynchronous upgrade for Moon from official Three.js planetary texture repo if in natural mode
    if (body === 'moon' && layerId === 'natural') {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        const moonUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/moon_1024.jpg';
        loader.load(moonUrl, (loadedTex) => {
            if (threeRenderer) loadedTex.anisotropy = threeRenderer.capabilities.getMaxAnisotropy();
            planetTextureCache[cacheKey] = loadedTex;
            if (planetSurfaceMesh && planetSurfaceMesh.userData.body === 'moon' && state.planetScienceLayer === 'natural') {
                planetSurfaceMesh.material.map = loadedTex;
                planetSurfaceMesh.material.needsUpdate = true;
            }
        }, undefined, () => {});
    }

    planetTextureCache[cacheKey] = albedoTex;
    return { albedo: albedoTex, bump: bumpTex, roughness: roughTex };
}

function getProceduralPlanetTexture(body) {
    if (body === 'earth') return getEarthLayeredTextures().albedo;
    return getDestinationLayeredMaps(body, state.planetScienceLayer, state.marsDustStormActive).albedo;
}

function getJupiterBackdropTexture() {
    if (jupiterTextureCache) return jupiterTextureCache;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const bands = [
        [0.00, '#6b5344'], [0.08, '#c29b78'], [0.15, '#9a6b48'], [0.22, '#e6cdb5'],
        [0.30, '#b5734c'], [0.38, '#f1e4d3'], [0.46, '#c88455'], [0.54, '#e2c4a6'],
        [0.63, '#8c5233'], [0.71, '#ebd9c8'], [0.80, '#b87b52'], [0.90, '#9c7860'], [1.00, '#5c4738']
    ];
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bands.forEach(([stop, col]) => grad.addColorStop(stop, col));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 180; i++) {
        const x = (i * 47) % canvas.width;
        const y = (Math.sin(i * 19.7) * 0.5 + 0.5) * canvas.height;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,247,237,0.16)' : 'rgba(124,45,18,0.16)';
        ctx.beginPath();
        ctx.ellipse(x, y, 45 + (i % 60), 4 + (i % 7), 0, 0, Math.PI * 2);
        ctx.fill();
    }

    const grsX = 620, grsY = 335;
    const grsGrad = ctx.createRadialGradient(grsX, grsY, 6, grsX, grsY, 58);
    grsGrad.addColorStop(0, '#b91c1c');
    grsGrad.addColorStop(0.55, '#c2410c');
    grsGrad.addColorStop(0.85, '#fed7aa');
    grsGrad.addColorStop(1, 'rgba(254,215,170,0)');
    ctx.fillStyle = grsGrad;
    ctx.beginPath();
    ctx.ellipse(grsX, grsY, 58, 34, -0.08, 0, Math.PI * 2);
    ctx.fill();

    jupiterTextureCache = new THREE.CanvasTexture(canvas);
    return jupiterTextureCache;
}

function createMarsAtmosphereMaterial(dustStorm = false) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uSunDir: sharedSunDirUniform,
            uPower: { value: dustStorm ? 1.85 : 2.95 },
            uIntensity: { value: dustStorm ? 0.68 : 0.42 },
            uColor: { value: new THREE.Color(dustStorm ? 0xd97706 : 0xea580c) }
        },
        vertexShader: [
            'varying vec3 vWorldNormal;',
            'varying vec3 vViewDir;',
            'void main() {',
            '    vec4 worldPos = modelMatrix * vec4(position, 1.0);',
            '    vWorldNormal = normalize(mat3(modelMatrix) * normal);',
            '    vViewDir = normalize(cameraPosition - worldPos.xyz);',
            '    gl_Position = projectionMatrix * viewMatrix * worldPos;',
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform vec3 uSunDir;',
            'uniform float uPower;',
            'uniform float uIntensity;',
            'uniform vec3 uColor;',
            'varying vec3 vWorldNormal;',
            'varying vec3 vViewDir;',
            'void main() {',
            '    vec3 normal = normalize(vWorldNormal);',
            '    vec3 viewDir = normalize(vViewDir);',
            '    float viewDot = clamp(dot(normal, viewDir), 0.0, 1.0);',
            '    float fresnel = pow(1.0 - viewDot, uPower);',
            '    float sunDot = dot(normal, normalize(uSunDir));',
            '    float daySide = smoothstep(-0.32, 0.45, sunDot);',
            '    vec3 butterscotch = mix(uColor, vec3(0.98, 0.78, 0.52), 0.35);',
            '    float alpha = fresnel * daySide * uIntensity;',
            '    gl_FragColor = vec4(butterscotch, clamp(alpha, 0.0, 0.78));',
            '}'
        ].join('\n'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        depthWrite: false
    });
}

function createLabelSprite(text, borderColor = '#38bdf8') {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 72;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(2, 6, 23, 0.86)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(6, 8, 372, 56, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 36);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.85, 0.35, 1);
    return sprite;
}

function getProceduralCloudTexture(body) {
    if (cloudTextureCache[body]) return cloudTextureCache[body];
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (body === 'earth') {
        for (let i = 0; i < 340; i++) {
            const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * canvas.width;
            const bandBias = (i % 3 === 0) ? 0.5 : (i % 3 === 1 ? 0.28 : 0.72);
            const y = (bandBias + (Math.cos(i * 37.3) * 0.16)) * canvas.height;
            const rx = 22 + (i % 68);
            const ry = 5 + (i % 16);
            const angle = Math.sin(y / canvas.height * Math.PI * 2) * 0.35;

            const cGrad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
            cGrad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
            cGrad.addColorStop(0.5, 'rgba(248, 250, 252, 0.38)');
            cGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.scale(1, ry / rx);
            ctx.fillStyle = cGrad;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    } else {
        const color = body === 'mars' ? 'rgba(253, 186, 116, 0.24)' : 'rgba(255, 255, 255, 0.42)';
        ctx.fillStyle = color;
        for (let i = 0; i < 110; i++) {
            const x = (i * 53) % canvas.width;
            const y = (Math.sin(i * 19.3) * 0.5 + 0.5) * canvas.height;
            const w = 32 + (i % 55);
            const h = 6 + (i % 14);
            ctx.beginPath();
            ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    cloudTextureCache[body] = tex;
    return tex;
}

function createEarthNightLightsMaterial(nightTex) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uNightMap: { value: nightTex },
            uSunDir: sharedSunDirUniform
        },
        vertexShader: [
            'varying vec2 vUv;',
            'varying vec3 vWorldNormal;',
            'void main() {',
            '    vUv = uv;',
            '    vWorldNormal = normalize(mat3(modelMatrix) * normal);',
            '    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform sampler2D uNightMap;',
            'uniform vec3 uSunDir;',
            'varying vec2 vUv;',
            'varying vec3 vWorldNormal;',
            'void main() {',
            '    float sunDot = dot(normalize(vWorldNormal), normalize(uSunDir));',
            '    float nightFactor = 1.0 - smoothstep(-0.14, 0.12, sunDot);',
            '    vec4 lights = texture2D(uNightMap, vUv);',
            '    vec3 warmGlow = lights.rgb * vec3(1.0, 0.88, 0.62) * 1.65 * nightFactor;',
            '    float alpha = clamp(max(lights.r, max(lights.g, lights.b)) * nightFactor * 1.4, 0.0, 1.0);',
            '    gl_FragColor = vec4(warmGlow, alpha);',
            '}'
        ].join('\n'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
}

function createEarthAtmosphereMaterial(isOuterShell = false) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uSunDir: sharedSunDirUniform,
            uPower: { value: isOuterShell ? 3.8 : 2.35 },
            uIntensity: { value: isOuterShell ? 0.65 : 0.78 }
        },
        vertexShader: [
            'varying vec3 vWorldNormal;',
            'varying vec3 vViewDir;',
            'void main() {',
            '    vec4 worldPos = modelMatrix * vec4(position, 1.0);',
            '    vWorldNormal = normalize(mat3(modelMatrix) * normal);',
            '    vViewDir = normalize(cameraPosition - worldPos.xyz);',
            '    gl_Position = projectionMatrix * viewMatrix * worldPos;',
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform vec3 uSunDir;',
            'uniform float uPower;',
            'uniform float uIntensity;',
            'varying vec3 vWorldNormal;',
            'varying vec3 vViewDir;',
            'void main() {',
            '    vec3 normal = normalize(vWorldNormal);',
            '    vec3 viewDir = normalize(vViewDir);',
            '    float viewDot = clamp(dot(normal, viewDir), 0.0, 1.0);',
            '    float fresnel = pow(1.0 - viewDot, uPower);',
            '    float sunDot = dot(normal, normalize(uSunDir));',
            '    float daySide = smoothstep(-0.35, 0.45, sunDot);',
            '    float twilight = smoothstep(-0.28, 0.05, sunDot) * (1.0 - smoothstep(0.05, 0.38, sunDot));',
            '    vec3 rayleighBlue = vec3(0.20, 0.62, 1.0);',
            '    vec3 sunsetTint = vec3(0.95, 0.52, 0.25);',
            '    vec3 scatterColor = mix(rayleighBlue, sunsetTint, twilight * 0.35);',
            '    float alpha = fresnel * daySide * uIntensity;',
            '    gl_FragColor = vec4(scatterColor, clamp(alpha, 0.0, 0.92));',
            '}'
        ].join('\n'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: isOuterShell ? THREE.BackSide : THREE.FrontSide,
        depthWrite: false
    });
}

function disposeObject3D(obj) {
    if (!obj) return;
    obj.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose && m.dispose());
            } else if (child.material.dispose) {
                child.material.dispose();
            }
        }
    });
}

function resizeThreeViewport() {
    // The renderer is shared with the Solar System stage; only size it to the game viewport while in Play Game.
    if (typeof appExperienceMode !== 'undefined' && appExperienceMode !== 'game') return;
    const container = document.getElementById('threeCanvasContainer');
    if (!threeCamera || !container) return;
    const nw = Math.max(100, container.clientWidth);
    const nh = Math.max(100, container.clientHeight);
    threeCamera.aspect = nw / nh;
    threeCamera.updateProjectionMatrix();
    if (threeRenderer) {
        threeRenderer.setSize(nw, nh);
    }
    if (fallbackCanvas2D) {
        fallbackCanvas2D.width = nw;
        fallbackCanvas2D.height = nh;
    }
}

let webglFallbackMode = false;
let fallbackCanvas2D = null;
let fallbackCtx2D = null;

/**
 * Safely attempts to create a THREE.WebGLRenderer using progressive fallback profiles.
 * If all WebGL context creation attempts fail (e.g. GPU context limit reached or disabled),
 * returns null so the 2D Canvas Orbital Digital Twin renderer takes over without throwing.
 */
function createSafeWebGLRenderer(w, h) {
    const profiles = [
        { antialias: true, alpha: true, powerPreference: 'high-performance' },
        { antialias: false, alpha: true, powerPreference: 'default' },
        { antialias: false, alpha: false, precision: 'mediump', failIfMajorPerformanceCaveat: false },
        {}
    ];
    for (let i = 0; i < profiles.length; i++) {
        try {
            const renderer = new THREE.WebGLRenderer(profiles[i]);
            renderer.setSize(w, h);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            return renderer;
        } catch (err) {
            // Try next profile
        }
    }
    return null;
}

function initFallback2DCanvas(container, w, h) {
    webglFallbackMode = true;
    fallbackCanvas2D = document.createElement('canvas');
    fallbackCanvas2D.width = w;
    fallbackCanvas2D.height = h;
    fallbackCanvas2D.className = 'w-full h-full block';
    container.innerHTML = '';
    container.appendChild(fallbackCanvas2D);
    fallbackCtx2D = fallbackCanvas2D.getContext('2d');
    return fallbackCanvas2D;
}

function renderFallback2DViewport(m) {
    if (!fallbackCtx2D || !fallbackCanvas2D) return;
    const ctx = fallbackCtx2D;
    const w = fallbackCanvas2D.width || 720;
    const h = fallbackCanvas2D.height || 600;
    const cx = w * 0.5;
    const cy = h * 0.5;

    ctx.clearRect(0, 0, w, h);

    // Deep Space Gradient Backdrop
    const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.75);
    bg.addColorStop(0, '#071226');
    bg.addColorStop(0.6, '#030814');
    bg.addColorStop(1, '#010308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Starfield
    for (let i = 0; i < 120; i++) {
        const sx = ((Math.sin(i * 91.3 + camSpherical.theta * 0.2) * 0.5 + 0.5) * w);
        const sy = ((Math.cos(i * 47.7 + camSpherical.phi * 0.2) * 0.5 + 0.5) * h);
        ctx.fillStyle = i % 4 === 0 ? 'rgba(56, 189, 248, 0.75)' : 'rgba(248, 250, 252, 0.65)';
        ctx.fillRect(sx, sy, i % 5 === 0 ? 2 : 1.2, i % 5 === 0 ? 2 : 1.2);
    }

    const zoomScale = Math.max(0.45, Math.min(2.2, 11.0 / Math.max(3.5, camSpherical.radius)));
    const body = m.orbit.body;

    // Distant Jupiter Backdrop when Europa is active
    if (body === 'europa' && cameraMode !== 'pad') {
        const jx = cx - 180 * zoomScale;
        const jy = cy - 95 * zoomScale;
        const jr = 64 * zoomScale;
        const jGrad = ctx.createLinearGradient(jx, jy - jr, jx, jy + jr);
        jGrad.addColorStop(0, '#9a6b48');
        jGrad.addColorStop(0.3, '#f1e4d3');
        jGrad.addColorStop(0.55, '#c88455');
        jGrad.addColorStop(0.8, '#e2c4a6');
        jGrad.addColorStop(1, '#6b5344');
        ctx.fillStyle = jGrad;
        ctx.beginPath();
        ctx.arc(jx, jy, jr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.ellipse(jx + jr * 0.25, jy + jr * 0.22, jr * 0.22, jr * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Planet Rendering
    const planetR = (cameraMode === 'spacecraft' ? 75 : 118) * zoomScale;
    const px = cameraMode === 'spacecraft' ? cx - 155 : cx;
    const py = cameraMode === 'spacecraft' ? cy + 75 : cy;

    if (cameraMode !== 'pad') {
        // Atmosphere / Rim Glow (Earth & Mars only; Moon has vacuum sharp edge)
        if (body === 'earth' || body === 'mars') {
            const atmoCol = body === 'earth' ? 'rgba(56, 189, 248, 0.32)' : 'rgba(234, 88, 12, 0.26)';
            const halo = ctx.createRadialGradient(px, py, planetR * 0.92, px, py, planetR * 1.18);
            halo.addColorStop(0, atmoCol);
            halo.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(px, py, planetR * 1.18, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, planetR, 0, Math.PI * 2);
        ctx.clip();

        const pColors = {
            earth: ['#0a2246', '#041531', '#155e32'],
            moon: ['#8c929b', '#555b64', '#1e242d'],
            mars: ['#d97706', '#c2410c', '#7c2d12'],
            europa: ['#f1f5f9', '#d8e4ee', '#9a3412']
        }[body] || ['#0a2246', '#041531', '#155e32'];

        const surfGrad = ctx.createRadialGradient(px + planetR * 0.3, py - planetR * 0.2, planetR * 0.1, px, py, planetR);
        surfGrad.addColorStop(0, pColors[0]);
        surfGrad.addColorStop(0.7, pColors[1]);
        surfGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = surfGrad;
        ctx.fillRect(px - planetR, py - planetR, planetR * 2, planetR * 2);

        // Europa Subsurface Ocean Cutaway in 2D Fallback
        if (body === 'europa' && state.europaOceanCutaway) {
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.arc(px, py, planetR * 0.92, -0.4, 1.2);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#57534e';
            ctx.beginPath();
            ctx.arc(px, py, planetR * 0.65, -0.4, 1.2);
            ctx.lineTo(px, py);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.arc(px, py, planetR * 0.32, 0, Math.PI * 2);
            ctx.fill();
        }

        // Day/Night Terminator Shadow
        const termGrad = ctx.createLinearGradient(px - planetR, py, px + planetR, py);
        termGrad.addColorStop(0, 'rgba(2, 6, 23, 0.86)');
        termGrad.addColorStop(0.48, 'rgba(2, 6, 23, 0.25)');
        termGrad.addColorStop(0.65, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = termGrad;
        ctx.fillRect(px - planetR, py - planetR, planetR * 2, planetR * 2);
        ctx.restore();

        // Keplerian Orbit Ellipse
        const rxOrbit = planetR * (1.35 + (m.ap / 6000) * 0.45);
        const ryOrbit = planetR * (1.12 + (m.pe / 6000) * 0.35);
        const incTilt = THREE.MathUtils.degToRad(state.inclinationDeg * 0.45);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-incTilt);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.ellipse(0, 0, rxOrbit, ryOrbit, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const scX = Math.cos(orbitAngle) * rxOrbit;
        const scY = Math.sin(orbitAngle) * ryOrbit;

        if (cameraMode !== 'spacecraft') {
            // Draw Spacecraft along Orbit
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(scX - 22, scY - 4, 15, 8);
            ctx.fillRect(scX + 7, scY - 4, 15, 8);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(scX - 7, scY - 7, 14, 14);
        }
        ctx.restore();
    }

    // Cleanroom VAB or Pad 3A9 Foreground Spacecraft / Stack
    if (cameraMode === 'spacecraft') {
        const exp = (state.explodedFactor || 0) * 42;
        const wingW = (state.power === 'solar_roas' ? 95 : 68) * (state.arraysDeployed ? 1 : 0.22);
        ctx.save();
        ctx.translate(cx, cy);
        // Solar Wings / RTG
        ctx.fillStyle = state.power === 'mmrtg' ? '#f97316' : '#0284c7';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-36 - wingW - exp, -14, wingW, 28);
        ctx.strokeRect(-36 - wingW - exp, -14, wingW, 28);
        ctx.fillRect(36 + exp, -14, wingW, 28);
        ctx.strokeRect(36 + exp, -14, wingW, 28);
        // Spacecraft Bus
        ctx.fillStyle = state.shield === 'rad_vault' ? '#334155' : '#f59e0b';
        ctx.fillRect(-32, -38, 64, 76);
        ctx.strokeRect(-32, -38, 64, 76);
        // Antenna Dish
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(0, -48 - exp * 0.7, 22, Math.PI, 0);
        ctx.fill();
        ctx.restore();
    } else if (cameraMode === 'pad') {
        const liftOffset = state.ascent.active ? Math.min(180, state.ascent.timer * 24) : 0;
        ctx.save();
        ctx.translate(cx, cy + 90 - liftOffset);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-16, -110, 32, 110);
        ctx.beginPath();
        ctx.moveTo(-18, -110);
        ctx.lineTo(0, -148);
        ctx.lineTo(18, -110);
        ctx.closePath();
        ctx.fill();
        if (state.ascent.active) {
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(-14, 0);
            ctx.lineTo(0, 55 + (Math.random() * 20));
            ctx.lineTo(14, 0);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

function initThreeViewport() {
    const container = document.getElementById('threeCanvasContainer');
    const w = container.clientWidth || 720;
    const h = container.clientHeight || 600;

    threeScene = new THREE.Scene();
    threeCamera = new THREE.PerspectiveCamera(42, w / h, 0.1, 1000);

    threeRenderer = createSafeWebGLRenderer(w, h);
    let dom;
    if (threeRenderer) {
        webglFallbackMode = false;
        container.innerHTML = '';
        container.appendChild(threeRenderer.domElement);
        dom = threeRenderer.domElement;
    } else {
        dom = initFallback2DCanvas(container, w, h);
    }

    const ambientLight = new THREE.HemisphereLight(0xdbeafe, 0x030712, 0.38);
    ambientLightRef = ambientLight;
    threeScene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.05);
    sunLight.position.set(26, 9, 0);
    sunLightRef = sunLight;
    threeScene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.32);
    rimLight.position.set(-16, -10, -12);
    rimLightRef = rimLight;
    threeScene.add(rimLight);

    engineLight = new THREE.PointLight(0xf97316, 0, 22);
    threeScene.add(engineLight);

    sunBeaconGroup = new THREE.Group();
    sunBeaconGroup.position.set(68, 18, 0);
    const sunCore = new THREE.Mesh(
        new THREE.SphereGeometry(2.6, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    const sunHalo = new THREE.Mesh(
        new THREE.SphereGeometry(5.2, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.22, side: THREE.BackSide })
    );
    sunBeaconGroup.add(sunCore, sunHalo);
    threeScene.add(sunBeaconGroup);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    const starCols = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 260;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 260;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 260;
        const tint = Math.random();
        starCols[i * 3] = tint > 0.7 ? 0.75 : 0.95;
        starCols[i * 3 + 1] = tint > 0.4 ? 0.88 : 0.95;
        starCols[i * 3 + 2] = 1.0;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.32, vertexColors: true, transparent: true, opacity: 0.9 });
    starField = new THREE.Points(starGeo, starMat);
    threeScene.add(starField);

    cleanroomPedestalGroup = new THREE.Group();
    const ring1 = new THREE.Mesh(
        new THREE.RingGeometry(2.2, 2.32, 64),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = -2.0;

    const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.35, 48),
        new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    );
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -2.02;

    const gridHelper = new THREE.PolarGridHelper(2.8, 12, 6, 48, 0x1e293b, 0x0e7490);
    gridHelper.position.y = -2.04;
    cleanroomPedestalGroup.add(ring1, ring2, gridHelper);
    threeScene.add(cleanroomPedestalGroup);

    planetGroup = new THREE.Group();
    threeScene.add(planetGroup);

    spacecraftGroup = new THREE.Group();
    threeScene.add(spacecraftGroup);

    padGroup = new THREE.Group();
    padGroup.visible = false;
    threeScene.add(padGroup);

    dom.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        prevMouse = { x: e.clientX, y: e.clientY };
        targetSpherical.theta -= dx * 0.0085;
        targetSpherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, targetSpherical.phi - dy * 0.0085));
    });

    dom.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            isDragging = true;
            prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: true });
    window.addEventListener('touchend', () => { isDragging = false; });
    window.addEventListener('touchmove', e => {
        if (!isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - prevMouse.x;
        const dy = e.touches[0].clientY - prevMouse.y;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        targetSpherical.theta -= dx * 0.0085;
        targetSpherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, targetSpherical.phi - dy * 0.0085));
    }, { passive: true });

    dom.addEventListener('wheel', e => {
        e.preventDefault();
        targetSpherical.radius = Math.max(3.0, Math.min(30, targetSpherical.radius + e.deltaY * 0.008));
    }, { passive: false });

    window.addEventListener('resize', resizeThreeViewport);

    if ('ResizeObserver' in window) {
        viewportResizeObserver = new ResizeObserver(() => {
            resizeThreeViewport();
        });
        viewportResizeObserver.observe(container);
    }
}

function setCameraViewMode(mode) {
    SoundFX.click();
    cameraMode = mode;
    const modes = ['spacecraft', 'pad', 'orbit', 'chase', 'nadir'];
    modes.forEach(m => {
        const btn = document.getElementById(`camBtn-${m}`);
        if (btn) {
            btn.className = m === mode
                ? 'px-2.5 py-1 rounded-lg text-[11px] font-mono bg-cyan-500/25 text-cyan-200 border border-cyan-400/55 font-bold shadow-sm flex items-center gap-1'
                : 'px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800/70 flex items-center gap-1';
        }
    });

    const titles = {
        spacecraft: '3D CLEANROOM VAB // DIGITAL TWIN',
        pad: 'LAUNCH PAD 3A9 // MULTI-STAGE ASCENT CAM',
        orbit: 'KEPLERIAN 3D ORBIT // NASA 5-LAYER EARTH',
        chase: 'DYNAMIC FLIGHT CHASE CAM // ORBITAL OPS',
        nadir: 'NADIR INSTRUMENT FOOTPRINT // SURFACE SWATH'
    };
    document.getElementById('viewportModeTitle').textContent = titles[mode] || titles.spacecraft;

    const cadWrapper = document.getElementById('cadControlsWrapper');
    const ascentOverlay = document.getElementById('ascentControlOverlay');
    const attitudeOverlay = document.getElementById('flightAttitudeOverlay');

    if (mode === 'pad') {
        targetSpherical.radius = 11.4;
        targetSpherical.phi = 1.24;
        if (cadWrapper) cadWrapper.classList.add('hidden');
        ascentOverlay.classList.remove('hidden');
        attitudeOverlay.classList.add('hidden');
        if (!state.ascent.active) resetPadAscentState();
    } else {
        ascentOverlay.classList.add('hidden');
        attitudeOverlay.classList.remove('hidden');
        if (cadWrapper) cadWrapper.classList.remove('hidden');
        if (mode === 'spacecraft') {
            targetSpherical.radius = 6.2;
            targetSpherical.phi = 1.15;
        } else if (mode === 'orbit') {
            targetSpherical.radius = 12.2;
            targetSpherical.phi = 1.08;
        }
    }
}

function buildProceduralSpacecraftParts(m) {
    while (spacecraftGroup.children.length > 0) {
        spacecraftGroup.remove(spacecraftGroup.children[0]);
    }

    const goldFoilMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.82, roughness: 0.22 });
    const titaniumMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.25 });
    const darkVaultMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.88, roughness: 0.18 });
    const bodyMat = state.shield === 'rad_vault' ? darkVaultMat : goldFoilMat;

    let busMesh;
    if (state.chassis === 'cubesat') {
        busMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.95), bodyMat);
    } else if (state.chassis === 'microsat') {
        busMesh = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.55, 1.35), bodyMat);
    } else if (state.chassis === 'hexbus') {
        busMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.75, 6), bodyMat);
    } else {
        busMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 2.15, 8), bodyMat);
    }
    busMesh.userData = { basePos: new THREE.Vector3(0, 0, 0), explodeDir: new THREE.Vector3(0, 0, 0) };
    spacecraftGroup.add(busMesh);

    const coreAvionics = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.58, 0.95, 16),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.25, metalness: 0.65, roughness: 0.25 })
    );
    coreAvionics.userData = { basePos: new THREE.Vector3(0, 0.1, 0), explodeDir: new THREE.Vector3(0, 1.05, 0) };
    spacecraftGroup.add(coreAvionics);

    const starTracker = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 12), titaniumMat);
    starTracker.rotation.z = -Math.PI / 3;
    starTracker.userData = { basePos: new THREE.Vector3(0.75, 0.4, 0.55), explodeDir: new THREE.Vector3(1.1, 0.6, 0.8) };
    spacecraftGroup.add(starTracker);

    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.7, 20), titaniumMat);
    nozzle.userData = { basePos: new THREE.Vector3(0, -1.12, 0), explodeDir: new THREE.Vector3(0, -1.45, 0) };
    spacecraftGroup.add(nozzle);

    scThrusterPlume = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 1.9, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 })
    );
    scThrusterPlume.rotation.x = Math.PI;
    scThrusterPlume.userData = { basePos: new THREE.Vector3(0, -2.15, 0), explodeDir: new THREE.Vector3(0, -1.9, 0) };
    spacecraftGroup.add(scThrusterPlume);

    if (state.power === 'solar_gaas' || state.power === 'solar_roas') {
        const wingSpan = state.power === 'solar_roas' ? 4.0 : 2.75;
        const wingWidth = state.power === 'solar_roas' ? 1.0 : 0.74;
        const solarMat = new THREE.MeshStandardMaterial({
            map: getSolarCellTexture(),
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.32,
            metalness: 0.75,
            roughness: 0.18
        });
        const leftWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.06, wingWidth), solarMat);
        leftWing.userData = {
            basePos: new THREE.Vector3(-(wingSpan / 2 + 0.85), 0, 0),
            stowedPos: new THREE.Vector3(-0.76, 0, 0),
            explodeDir: new THREE.Vector3(-1.9, 0, 0),
            isSolarWing: 'left'
        };
        const rightWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.06, wingWidth), solarMat);
        rightWing.userData = {
            basePos: new THREE.Vector3(wingSpan / 2 + 0.85, 0, 0),
            stowedPos: new THREE.Vector3(0.76, 0, 0),
            explodeDir: new THREE.Vector3(1.9, 0, 0),
            isSolarWing: 'right'
        };
        spacecraftGroup.add(leftWing, rightWing);
    } else if (state.power === 'mmrtg') {
        const rtgMat = new THREE.MeshStandardMaterial({ color: 0x475569, emissive: 0xf97316, emissiveIntensity: 0.42, metalness: 0.7 });
        const rtg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.65, 16), rtgMat);
        rtg1.rotation.z = Math.PI / 2.5;
        rtg1.userData = { basePos: new THREE.Vector3(-1.28, -0.2, 0), explodeDir: new THREE.Vector3(-1.55, -0.35, 0) };
        const rtg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.65, 16), rtgMat);
        rtg2.rotation.z = -Math.PI / 2.5;
        rtg2.userData = { basePos: new THREE.Vector3(1.28, -0.2, 0), explodeDir: new THREE.Vector3(1.55, -0.35, 0) };
        spacecraftGroup.add(rtg1, rtg2);
    }

    if (state.comms === 'ka_dish') {
        const dishGroup = new THREE.Group();
        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.98, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), titaniumMat);
        dish.material.side = THREE.DoubleSide;
        dish.rotation.x = Math.PI;
        const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.65, 12), darkVaultMat);
        feedHorn.position.y = -0.25;
        dishGroup.add(dish, feedHorn);
        dishGroup.userData = { basePos: new THREE.Vector3(0, 1.4, 0), explodeDir: new THREE.Vector3(0, 1.85, 0) };
        spacecraftGroup.add(dishGroup);
    } else if (state.comms === 'lasercomm') {
        const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.65, 20), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.35, metalness: 0.9, roughness: 0.1 }));
        turret.userData = { basePos: new THREE.Vector3(0, 1.18, 0), explodeDir: new THREE.Vector3(0, 1.65, 0) };
        spacecraftGroup.add(turret);
    } else {
        const patch = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.65), titaniumMat);
        patch.userData = { basePos: new THREE.Vector3(0, 1.02, 0), explodeDir: new THREE.Vector3(0, 1.45, 0) };
        spacecraftGroup.add(patch);
    }

    dsnBeamLine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.35, 9.0, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
    );
    dsnBeamLine.userData = { basePos: new THREE.Vector3(0, 5.8, 0), explodeDir: new THREE.Vector3(0, 1.5, 0) };
    spacecraftGroup.add(dsnBeamLine);

    if (state.payloads.includes('sar_radar')) {
        const sarBar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 2.9), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.6, roughness: 0.2 }));
        sarBar.userData = { basePos: new THREE.Vector3(0, -0.58, 0.98), explodeDir: new THREE.Vector3(0, -0.45, 1.65) };
        spacecraftGroup.add(sarBar);
    }
    if (state.payloads.includes('ice_sounder')) {
        const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 4.4), titaniumMat);
        boom.rotation.x = Math.PI / 2;
        boom.userData = { basePos: new THREE.Vector3(0, 0.32, 0), explodeDir: new THREE.Vector3(0, 0.55, -1.7) };
        spacecraftGroup.add(boom);
    }
    if (state.payloads.includes('magnetometer')) {
        const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.3), goldFoilMat);
        mag.userData = { basePos: new THREE.Vector3(0.62, 1.35, -0.62), explodeDir: new THREE.Vector3(1.15, 1.45, -1.15) };
        spacecraftGroup.add(mag);
    }

    const swathGeo = new THREE.ConeGeometry(1.45, 3.8, 28, 1, true);
    const swathMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.24 });
    sensorSwathMesh = new THREE.Mesh(swathGeo, swathMat);
    sensorSwathMesh.position.set(0, -2.7, 0);
    sensorSwathMesh.userData = { basePos: new THREE.Vector3(0, -2.7, 0), explodeDir: new THREE.Vector3(0, 0, 0) };
    spacecraftGroup.add(sensorSwathMesh);

    applyExplodedAndArticulationTransforms(smoothedExploded, smoothedDeploy);
}

function applyExplodedAndArticulationTransforms(ef = smoothedExploded, deployVal = smoothedDeploy) {
    if (!spacecraftGroup) return;
    spacecraftGroup.children.forEach(mesh => {
        if (!mesh.userData || !mesh.userData.basePos) return;
        const stowed = mesh.userData.stowedPos || mesh.userData.basePos;
        const deployed = mesh.userData.basePos;
        const base = new THREE.Vector3().lerpVectors(stowed, deployed, deployVal);
        const exp = mesh.userData.explodeDir || new THREE.Vector3();
        mesh.position.set(
            base.x + exp.x * ef,
            base.y + exp.y * ef,
            base.z + exp.z * ef
        );
        if (mesh.userData.isSolarWing) {
            const maxFoldAngle = mesh.userData.isSolarWing === 'left' ? Math.PI / 2.05 : -Math.PI / 2.05;
            mesh.rotation.z = maxFoldAngle * (1 - deployVal);
        }
    });
}

function buildLaunchPadAndVehicleStack(m) {
    while (padGroup.children.length > 0) {
        padGroup.remove(padGroup.children[0]);
    }

    const padBase = new THREE.Mesh(
        new THREE.BoxGeometry(8, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
    );
    padBase.position.set(0, -4.6, 0);
    padGroup.add(padBase);

    const towerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4, wireframe: true });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.8, 1.2), towerMat);
    tower.position.set(-2.3, 0.2, 0);
    padGroup.add(tower);

    const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.12, 2.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
    );
    mast.position.set(-2.3, 5.6, 0);
    padGroup.add(mast);

    const swingArm = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.22, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5 })
    );
    swingArm.position.set(-1.2, 1.6, 0);
    swingArm.name = 'swingArm';
    padGroup.add(swingArm);

    launchStackGroup = new THREE.Group();
    launchStackGroup.position.set(0, -4.0, 0);
    padGroup.add(launchStackGroup);

    const r = m.rocket;
    const stage1Mat = new THREE.MeshStandardMaterial({ color: r.color, metalness: 0.45, roughness: 0.35 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.35, roughness: 0.4 });
    const darkNozzleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

    rocketStage1Group = new THREE.Group();
    const s1Body = new THREE.Mesh(new THREE.CylinderGeometry(r.radius, r.radius, r.height, 24), stage1Mat);
    s1Body.position.y = r.height / 2;
    rocketStage1Group.add(s1Body);

    const s1Nozzle = new THREE.Mesh(new THREE.ConeGeometry(r.radius * 0.75, 0.7, 16), darkNozzleMat);
    s1Nozzle.position.y = -0.2;
    rocketStage1Group.add(s1Nozzle);

    if (r.id === 'falcon_med') {
        for (let g = 0; g < 4; g++) {
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.06), darkNozzleMat);
            const ang = (g * Math.PI) / 2;
            fin.position.set(Math.cos(ang) * (r.radius + 0.14), r.height - 0.35, Math.sin(ang) * (r.radius + 0.14));
            fin.rotation.y = -ang;
            rocketStage1Group.add(fin);
        }
    }

    stage1PlumeMesh = new THREE.Mesh(
        new THREE.ConeGeometry(r.radius * 1.15, 3.8, 16),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.0 })
    );
    stage1PlumeMesh.rotation.x = Math.PI;
    stage1PlumeMesh.position.y = -2.1;
    rocketStage1Group.add(stage1PlumeMesh);

    launchStackGroup.add(rocketStage1Group);

    rocketSrbLeft = new THREE.Group();
    rocketSrbRight = new THREE.Group();
    if (r.srbCount > 0) {
        const srbH = r.height * 0.78;
        const srbR = r.radius * 0.42;
        [rocketSrbLeft, rocketSrbRight].forEach((srbGrp, idx) => {
            const sign = idx === 0 ? -1 : 1;
            const cyl = new THREE.Mesh(new THREE.CylinderGeometry(srbR, srbR, srbH, 16), whiteMat);
            cyl.position.y = srbH / 2;
            const cone = new THREE.Mesh(new THREE.ConeGeometry(srbR, 0.65, 16), whiteMat);
            cone.position.y = srbH + 0.32;
            srbGrp.add(cyl, cone);
            srbGrp.position.set(sign * (r.radius + srbR + 0.06), 0, 0);
            launchStackGroup.add(srbGrp);
        });
    }

    rocketStage2Group = new THREE.Group();
    rocketStage2Group.position.y = r.height;
    const s2H = 1.65;
    const s2Cyl = new THREE.Mesh(new THREE.CylinderGeometry(r.radius * 0.92, r.radius * 0.95, s2H, 24), whiteMat);
    s2Cyl.position.y = s2H / 2;
    rocketStage2Group.add(s2Cyl);

    stage2PlumeMesh = new THREE.Mesh(
        new THREE.ConeGeometry(r.radius * 1.1, 2.8, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 })
    );
    stage2PlumeMesh.rotation.x = Math.PI;
    stage2PlumeMesh.position.y = -1.3;
    rocketStage2Group.add(stage2PlumeMesh);

    const fairingRadius = r.radius * 1.08;
    const fairingHeight = 2.4;
    const fairingMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        metalness: 0.3,
        roughness: 0.35,
        side: THREE.DoubleSide
    });

    fairingLeftGroup = new THREE.Group();
    fairingLeftGroup.position.set(0, s2H, 0);
    const leftShell = new THREE.Mesh(
        new THREE.CylinderGeometry(fairingRadius * 0.35, fairingRadius, fairingHeight, 16, 1, false, 0, Math.PI),
        fairingMat
    );
    leftShell.position.y = fairingHeight / 2;
    fairingLeftGroup.add(leftShell);

    fairingRightGroup = new THREE.Group();
    fairingRightGroup.position.set(0, s2H, 0);
    const rightShell = new THREE.Mesh(
        new THREE.CylinderGeometry(fairingRadius * 0.35, fairingRadius, fairingHeight, 16, 1, false, Math.PI, Math.PI),
        fairingMat
    );
    rightShell.position.y = fairingHeight / 2;
    fairingRightGroup.add(rightShell);

    rocketStage2Group.add(fairingLeftGroup, fairingRightGroup);

    maxQShockCone = new THREE.Mesh(
        new THREE.ConeGeometry(fairingRadius * 2.5, 2.8, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
    );
    maxQShockCone.position.set(0, s2H + fairingHeight * 0.55, 0);
    rocketStage2Group.add(maxQShockCone);

    launchStackGroup.add(rocketStage2Group);

    const pCount = 90;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 2.5;
        pPos[i * 3 + 1] = -4.2 - Math.random() * 1.5;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    padExhaustParticles = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({ color: 0xfde047, size: 0.45, transparent: true, opacity: 0.0 })
    );
    padGroup.add(padExhaustParticles);
}

function update3DSpacecraftAndOrbit(m) {
    if (!threeScene) return;
    const sig = `${state.chassis}-${state.power}-${state.battery}-${state.shield}-${state.payloads.join(',')}-${state.orbit}-${state.comms}-${state.rocket}-${m.pe}-${m.ap}-${state.inclinationDeg}-${state.planetScienceLayer}-${state.marsDustStormActive}-${state.europaOceanCutaway}`;
    if (sig === lastBuiltSignature) return;
    lastBuiltSignature = sig;

    while (planetGroup.children.length > 0) {
        const child = planetGroup.children[0];
        planetGroup.remove(child);
        disposeObject3D(child);
    }
    planetSurfaceMesh = null;
    planetCloudMesh = null;
    earthNightMesh = null;
    earthInnerAtmoMesh = null;
    earthOuterAtmoMesh = null;
    jupiterBackdropGroup = null;
    destinationOverlayGroup = null;
    europaCutawayGroup = null;

    const body = m.orbit.body;

    // Update Destination-Specific Environmental Lighting & Sun Direction
    if (ambientLightRef && sunLightRef && rimLightRef) {
        if (body === 'moon') {
            // Vacuum Lunar South Pole illumination: near-zero ambient fill, sharp directional low-angle sunlight
            ambientLightRef.intensity = 0.07;
            ambientLightRef.color.setHex(0xcbd5e1);
            sunLightRef.intensity = 2.45;
            sunLightRef.color.setHex(0xffffff);
            sunLightRef.position.set(28, 1.4, 2); // Grazing solar elevation at Lunar South Pole
            rimLightRef.intensity = 0.08;
            rimLightRef.color.setHex(0x94a3b8);
        } else if (body === 'mars') {
            // Warm butterscotch-red solar & atmospheric bounce illumination
            ambientLightRef.intensity = state.marsDustStormActive ? 0.55 : 0.34;
            ambientLightRef.color.setHex(0xfdba74);
            sunLightRef.intensity = state.marsDustStormActive ? 1.55 : 2.05;
            sunLightRef.color.setHex(0xffedd5);
            sunLightRef.position.set(26, 7, 0);
            rimLightRef.intensity = 0.32;
            rimLightRef.color.setHex(0xf97316);
        } else if (body === 'europa') {
            // Crisp outer-solar-system sunlight + subtle warm Jovian reflected light from Jupiter
            ambientLightRef.intensity = 0.26;
            ambientLightRef.color.setHex(0xe0f2fe);
            sunLightRef.intensity = 1.95;
            sunLightRef.color.setHex(0xf8fafc);
            sunLightRef.position.set(26, 5, 4);
            rimLightRef.intensity = 0.38;
            rimLightRef.color.setHex(0xf59e0b); // Reflected Jovian shine
        } else {
            // Earth orbital illumination
            ambientLightRef.intensity = 0.38;
            ambientLightRef.color.setHex(0xdbeafe);
            sunLightRef.intensity = 2.05;
            sunLightRef.color.setHex(0xfffbeb);
            sunLightRef.position.set(26, 9, 0);
            rimLightRef.intensity = 0.32;
            rimLightRef.color.setHex(0x38bdf8);
        }
        sharedSunDirUniform.value.copy(sunLightRef.position).normalize();
    }

    planetTiltGroup = new THREE.Group();
    const tiltDeg = body === 'earth' ? 23.44 : (body === 'mars' ? 25.19 : (body === 'moon' ? 1.54 : 0.1));
    planetTiltGroup.rotation.z = THREE.MathUtils.degToRad(tiltDeg);
    planetGroup.add(planetTiltGroup);

    if (body === 'earth') {
        const earthMaps = getEarthLayeredTextures();
        const earthGeo = new THREE.SphereGeometry(3.2, 64, 64);
        const earthMat = new THREE.MeshStandardMaterial({
            map: earthMaps.albedo,
            roughnessMap: earthMaps.roughness,
            bumpMap: earthMaps.bump,
            bumpScale: 0.045,
            roughness: 0.72,
            metalness: 0.12
        });
        if (earthMaps.normal) {
            earthMat.normalMap = earthMaps.normal;
            earthMat.normalScale = new THREE.Vector2(0.85, 0.85);
        }
        planetSurfaceMesh = new THREE.Mesh(earthGeo, earthMat);
        planetSurfaceMesh.userData.body = 'earth';
        planetTiltGroup.add(planetSurfaceMesh);

        const nightGeo = new THREE.SphereGeometry(3.208, 64, 64);
        const nightMat = createEarthNightLightsMaterial(earthMaps.night);
        earthNightMesh = new THREE.Mesh(nightGeo, nightMat);
        planetTiltGroup.add(earthNightMesh);

        const cloudGeo = new THREE.SphereGeometry(3.245, 64, 64);
        const cloudMat = new THREE.MeshStandardMaterial({
            map: earthMaps.clouds,
            alphaMap: earthMaps.clouds,
            transparent: true,
            opacity: 0.84,
            roughness: 0.9,
            metalness: 0.0,
            depthWrite: false
        });
        planetCloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
        planetCloudMesh.userData.body = 'earth';
        planetTiltGroup.add(planetCloudMesh);

        const innerAtmoGeo = new THREE.SphereGeometry(3.29, 64, 64);
        earthInnerAtmoMesh = new THREE.Mesh(innerAtmoGeo, createEarthAtmosphereMaterial(false));
        planetGroup.add(earthInnerAtmoMesh);

        const outerAtmoGeo = new THREE.SphereGeometry(3.48, 64, 64);
        earthOuterAtmoMesh = new THREE.Mesh(outerAtmoGeo, createEarthAtmosphereMaterial(true));
        planetGroup.add(earthOuterAtmoMesh);
    } else if (body === 'moon') {
        // ===============================================================
        // PART 2: ARTEMIS LUNAR SOUTH POLE ENVIRONMENT (NO ATMOSPHERE/CLOUDS)
        // ===============================================================
        const moonMaps = getDestinationLayeredMaps('moon', state.planetScienceLayer, false);
        const moonGeo = new THREE.SphereGeometry(3.2, 64, 64);
        const moonMat = new THREE.MeshStandardMaterial({
            map: moonMaps.albedo,
            bumpMap: moonMaps.bump,
            bumpScale: 0.095,
            roughness: 0.94,
            metalness: 0.04
        });
        planetSurfaceMesh = new THREE.Mesh(moonGeo, moonMat);
        planetSurfaceMesh.userData.body = 'moon';
        planetTiltGroup.add(planetSurfaceMesh);
        try { aeroUpgradeMissionSurface('moon', moonMat, moonMaps); } catch (aeroErr) { aeroReportError('moon surface', aeroErr); }

        // Dedicated Lunar South Pole Target Ring (Shackleton Rim & Artemis Exploration Zone)
        const southPoleRing = new THREE.Mesh(
            new THREE.RingGeometry(0.28, 0.58, 48),
            new THREE.MeshBasicMaterial({
                color: state.planetScienceLayer === 'psr' ? 0xfbbf24 : 0x38bdf8,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.65
            })
        );
        southPoleRing.rotation.x = Math.PI / 2;
        southPoleRing.position.set(0, -3.19, 0);
        planetTiltGroup.add(southPoleRing);
    } else if (body === 'mars') {
        // ===============================================================
        // PART 3: RED HORIZON MARS ORBITER ENVIRONMENT
        // ===============================================================
        const marsMaps = getDestinationLayeredMaps('mars', state.planetScienceLayer, state.marsDustStormActive);
        const marsGeo = new THREE.SphereGeometry(3.2, 64, 64);
        const marsMat = new THREE.MeshStandardMaterial({
            map: marsMaps.albedo,
            bumpMap: marsMaps.bump,
            bumpScale: 0.085,
            roughness: 0.86,
            metalness: 0.08
        });
        planetSurfaceMesh = new THREE.Mesh(marsGeo, marsMat);
        planetSurfaceMesh.userData.body = 'mars';
        planetTiltGroup.add(planetSurfaceMesh);
        try { aeroUpgradeMissionSurface('mars', marsMat, marsMaps); } catch (aeroErr) { aeroReportError('mars surface', aeroErr); }

        // Sparse high-altitude Martian CO2 / dust cloud layer
        const marsCloudGeo = new THREE.SphereGeometry(3.235, 48, 48);
        const marsCloudMat = new THREE.MeshStandardMaterial({
            map: getProceduralCloudTexture('mars'),
            transparent: true,
            opacity: state.marsDustStormActive ? 0.68 : 0.34,
            color: state.marsDustStormActive ? 0xf59e0b : 0xfed7aa,
            depthWrite: false
        });
        planetCloudMesh = new THREE.Mesh(marsCloudGeo, marsCloudMat);
        planetCloudMesh.userData.body = 'mars';
        planetTiltGroup.add(planetCloudMesh);

        // Thin Butterscotch/Reddish Martian Atmospheric Haze Shell (No thick Earth blue)
        const marsAtmoGeo = new THREE.SphereGeometry(3.31, 64, 64);
        const marsAtmoMesh = new THREE.Mesh(marsAtmoGeo, createMarsAtmosphereMaterial(state.marsDustStormActive));
        planetGroup.add(marsAtmoMesh);
    } else if (body === 'europa') {
        // ===============================================================
        // PART 4: EUROPA OCEAN RECON + SUBSURFACE CUTAWAY + JUPITER BACKDROP
        // ===============================================================
        const europaMaps = getDestinationLayeredMaps('europa', state.planetScienceLayer, false);
        const isCutaway = Boolean(state.europaOceanCutaway);

        // Outer Fractured Ice Shell (Full sphere or 270° cutaway shell revealing interior)
        const phiLen = isCutaway ? Math.PI * 1.55 : Math.PI * 2;
        const europaGeo = new THREE.SphereGeometry(3.2, 64, 64, 0, phiLen, 0, Math.PI);
        const europaMat = new THREE.MeshStandardMaterial({
            map: europaMaps.albedo,
            bumpMap: europaMaps.bump,
            bumpScale: 0.065,
            roughness: 0.42,
            metalness: 0.18,
            side: THREE.DoubleSide
        });
        planetSurfaceMesh = new THREE.Mesh(europaGeo, europaMat);
        planetSurfaceMesh.userData.body = 'europa';
        planetTiltGroup.add(planetSurfaceMesh);
        try { aeroUpgradeMissionSurface('europa', europaMat, europaMaps); } catch (aeroErr) { aeroReportError('europa surface', aeroErr); }

        // Educational Subsurface Liquid-Water Ocean & Rocky Mantle/Core Cutaway
        if (isCutaway) {
            europaCutawayGroup = new THREE.Group();
            // 1. Subsurface Liquid Water Ocean (~100 km deep, deep marine blue)
            const oceanSphere = new THREE.Mesh(
                new THREE.SphereGeometry(3.04, 48, 48),
                new THREE.MeshStandardMaterial({
                    color: 0x0284c7,
                    emissive: 0x0369a1,
                    emissiveIntensity: 0.35,
                    roughness: 0.25,
                    metalness: 0.3
                })
            );
            // 2. Silicate Rocky Mantle Interior
            const mantleSphere = new THREE.Mesh(
                new THREE.SphereGeometry(2.35, 40, 40),
                new THREE.MeshStandardMaterial({
                    color: 0x57534e,
                    roughness: 0.85,
                    metalness: 0.2
                })
            );
            // 3. Metallic Core
            const coreSphere = new THREE.Mesh(
                new THREE.SphereGeometry(1.15, 32, 32),
                new THREE.MeshStandardMaterial({
                    color: 0xd97706,
                    emissive: 0xb45309,
                    emissiveIntensity: 0.4,
                    metalness: 0.8,
                    roughness: 0.3
                })
            );
            const oceanLabel = createLabelSprite('SUBSURFACE LIQUID OCEAN (~100 KM)', '#38bdf8');
            oceanLabel.position.set(1.8, 0.9, 2.2);
            const crustLabel = createLabelSprite('OUTER ICE SHELL (15-25 KM)', '#e2e8f0');
            crustLabel.position.set(2.1, 2.1, 1.8);
            const coreLabel = createLabelSprite('ROCKY MANTLE & IRON CORE', '#f59e0b');
            coreLabel.position.set(1.2, -0.8, 1.8);

            europaCutawayGroup.add(oceanSphere, mantleSphere, coreSphere, oceanLabel, crustLabel, coreLabel);
            planetTiltGroup.add(europaCutawayGroup);
        }

        // Distant Jupiter Gas Giant Backdrop (Cloud bands + Great Red Spot)
        jupiterBackdropGroup = new THREE.Group();
        jupiterBackdropGroup.position.set(-28, 6.5, -34);
        const jupMesh = new THREE.Mesh(
            new THREE.SphereGeometry(9.4, 48, 48),
            new THREE.MeshStandardMaterial({
                map: getJupiterBackdropTexture(),
                roughness: 0.78,
                metalness: 0.05
            })
        );
        jupMesh.rotation.z = THREE.MathUtils.degToRad(3.1);
        const jupAtmo = new THREE.Mesh(
            new THREE.SphereGeometry(9.75, 40, 40),
            new THREE.MeshBasicMaterial({ color: 0xfdba74, transparent: true, opacity: 0.12, side: THREE.BackSide })
        );
        const jupLabel = createLabelSprite('JUPITER (GAS GIANT BACKDROP)', '#fbbf24');
        jupLabel.scale.set(5.5, 1.05, 1);
        jupLabel.position.set(0, -11.2, 0);
        jupiterBackdropGroup.add(jupMesh, jupAtmo, jupLabel);
        planetGroup.add(jupiterBackdropGroup);

        // Jupiter-centred magnetic field lines (radiation layer only) + Europa's orbit; legacy arcs kept only for the 2D/no-baker fallback
        let aeroJupOk = false; try { aeroJupOk = aeroUpgradeJupiterBackdrop(); } catch (aeroErr) { aeroReportError('jupiter backdrop', aeroErr); }
        if (!aeroJupOk) {
            // Restrained Scientific Jovian Magnetospheric Field-Line Arcs (Not physical rings attached to Europa)
            const fieldLineMat = new THREE.LineBasicMaterial({
                color: state.planetScienceLayer === 'radiation_env' ? 0xf43f5e : 0x38bdf8,
                transparent: true,
                opacity: state.planetScienceLayer === 'radiation_env' ? 0.52 : 0.22
            });
            for (let f = 0; f < 6; f++) {
                const fAng = (f / 6) * Math.PI * 2;
                const fPts = [];
                for (let step = -20; step <= 20; step++) {
                    const t = step / 20;
                    const r = 4.6 + Math.cos(t * Math.PI * 0.5) * 1.4;
                    const fx = Math.cos(fAng) * r;
                    const fz = Math.sin(fAng) * r;
                    const fy = Math.sin(t * Math.PI * 0.5) * 4.2;
                    fPts.push(new THREE.Vector3(fx, fy, fz));
                }
                const fLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(fPts), fieldLineMat);
                planetGroup.add(fLine);
            }
        }
    }

    // Add 3D Geographic & Scientific Target Markers on the Planet Surface
    destinationOverlayGroup = new THREE.Group();
    const landmarks = PLANET_LANDMARKS_3D[body] || [];
    landmarks.forEach(lm => {
        const latRad = THREE.MathUtils.degToRad(lm.lat);
        const lonRad = THREE.MathUtils.degToRad(lm.lon);
        const rSurf = 3.24;
        const lonSign = body === 'earth' ? -1 : 1; // three.js sphere UV: +x = 0° E, −z = 90° E (Earth markers left as they were)
        const lx = lonSign * rSurf * Math.cos(latRad) * Math.cos(lonRad);
        const ly = rSurf * Math.sin(latRad);
        const lz = -lonSign * rSurf * Math.cos(latRad) * Math.sin(lonRad);

        const pinMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.065, 12, 12),
            new THREE.MeshBasicMaterial({ color: lm.color })
        );
        pinMesh.position.set(lx, ly, lz);
        destinationOverlayGroup.add(pinMesh);

        const sprite = createLabelSprite(lm.name, '#' + lm.color.toString(16).padStart(6, '0'));
        sprite.position.set(lx * 1.14, ly * 1.14, lz * 1.14);
        destinationOverlayGroup.add(sprite);
    });
    planetTiltGroup.add(destinationOverlayGroup);

    const umbraGeo = new THREE.CylinderGeometry(3.18, 3.18, 12, 32, 1, true);
    const umbraMat = new THREE.MeshBasicMaterial({
        color: 0x020617,
        transparent: true,
        opacity: body === 'moon' ? 0.52 : 0.36,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    umbraConeMesh = new THREE.Mesh(umbraGeo, umbraMat);
    umbraConeMesh.rotation.z = Math.PI / 2;
    umbraConeMesh.position.set(-6.0, 0, 0);
    planetGroup.add(umbraConeMesh);

    const rPe3D = 3.2 * (1 + m.pe / 2200);
    const rAp3D = 3.2 * (1 + m.ap / 2200);
    const a = (rPe3D + rAp3D) / 2;
    const c = (rAp3D - rPe3D) / 2;
    const b = Math.sqrt(Math.max(1, a * a - c * c));
    const incRad = THREE.MathUtils.degToRad(state.inclinationDeg * 0.65);

    const pts = [];
    for (let i = 0; i <= 120; i++) {
        const ang = (i / 120) * Math.PI * 2;
        const ox = Math.cos(ang) * a - c;
        const oz = Math.sin(ang) * b;
        const y = oz * Math.sin(incRad);
        const z = oz * Math.cos(incRad);
        pts.push(new THREE.Vector3(ox, y, z));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    orbitLineMesh = new THREE.Line(orbitGeo, orbitMat);
    planetGroup.add(orbitLineMesh);

    const peNode = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
    peNode.position.copy(pts[0]);
    const apNode = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), new THREE.MeshBasicMaterial({ color: 0xc084fc }));
    apNode.position.copy(pts[60]);
    planetGroup.add(peNode, apNode);

    // Ground-track visualization: sub-spacecraft path projected onto the planet surface (inertial frame)
    const trackPts = pts.map(p => p.clone().normalize().multiplyScalar(3.235));
    groundTrackLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(trackPts),
        new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.55, depthWrite: false })
    );
    planetGroup.add(groundTrackLine);
    subSatMarker = new THREE.Group();
    const subDot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({ color: 0x5eead4 }));
    const subRing = new THREE.Mesh(
        new THREE.RingGeometry(0.13, 0.17, 28),
        new THREE.MeshBasicMaterial({ color: 0x2dd4bf, side: THREE.DoubleSide, transparent: true, opacity: 0.8, depthWrite: false })
    );
    subSatMarker.add(subDot, subRing);
    subSatMarker.userData.ring = subRing;
    planetGroup.add(subSatMarker);

    buildProceduralSpacecraftParts(m);
    buildLaunchPadAndVehicleStack(m);
}

