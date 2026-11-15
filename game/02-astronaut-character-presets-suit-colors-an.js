/* A.T.L.A.S · section 2 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 2. ASTRONAUT CHARACTER PRESETS, SUIT COLORS & ANIMATED SVG RENDERER
 ***********************************************************************/
const SUIT_COLORS = [
    { id: 'nasa_cyan', name: 'Deep Space Cyan', primary: '#0284c7', secondary: '#38bdf8', trim: '#e0f2fe' },
    { id: 'orion_orange', name: 'Orion Entry Orange', primary: '#ea580c', secondary: '#fb923c', trim: '#ffedd5' },
    { id: 'artemis_white', name: 'Artemis EVA White', primary: '#cbd5e1', secondary: '#f8fafc', trim: '#38bdf8' },
    { id: 'eecom_gold', name: 'Solar Gold Trim', primary: '#b45309', secondary: '#fbbf24', trim: '#fef3c7' },
    { id: 'science_emerald', name: 'Astrobiology Emerald', primary: '#047857', secondary: '#34d399', trim: '#d1fae5' },
    { id: 'fido_indigo', name: 'Orbital Vector Indigo', primary: '#4338ca', secondary: '#818cf8', trim: '#e0e7ff' }
];

const CHARACTER_PRESETS = [
    {
        id: 'vance',
        name: 'Cmdr. Aria Vance',
        defaultCallsign: 'CMDR. VANCE',
        specialty: 'FLIGHT DIRECTOR',
        deptBadge: 'FLIGHT',
        skin: '#f1c27d',
        hairColor: '#1e293b',
        hairStyle: 'bun',
        visorStyle: 'clear',
        defaultSuit: 'nasa_cyan',
        bio: 'Veteran JPL Flight Director specializing in flagship interplanetary mission command.'
    },
    {
        id: 'thorne',
        name: 'Dr. Marcus Thorne',
        defaultCallsign: 'EECOM THORNE',
        specialty: 'EECOM SYSTEMS',
        deptBadge: 'EECOM',
        skin: '#8d5524',
        hairColor: '#0f172a',
        hairStyle: 'short',
        visorStyle: 'hud',
        defaultSuit: 'eecom_gold',
        bio: 'Spacecraft electrical power bus, MMRTG nuclear systems, and battery thermal architect.'
    },
    {
        id: 'lin',
        name: 'Dr. Mei-Ling Chen',
        defaultCallsign: 'SCI CHEN',
        specialty: 'LEAD SCIENTIST',
        deptBadge: 'SCIENCE',
        skin: '#ffdbac',
        hairColor: '#18181b',
        hairStyle: 'bob',
        visorStyle: 'clear',
        defaultSuit: 'science_emerald',
        bio: 'Principal Investigator for synthetic aperture radar and icy moon subsurface sounding.'
    },
    {
        id: 'kovacs',
        name: 'Capt. Mateo Kovacs',
        defaultCallsign: 'FIDO KOVACS',
        specialty: 'FLIGHT DYNAMICS',
        deptBadge: 'FIDO',
        skin: '#e0ac69',
        hairColor: '#3f2e21',
        hairStyle: 'crest',
        visorStyle: 'tinted',
        defaultSuit: 'fido_indigo',
        bio: 'Keplerian orbital mechanics navigator, launch vehicle staging & Delta-V specialist.'
    },
    {
        id: 'al_mansoor',
        name: 'Lt. Zara Al-Mansoor',
        defaultCallsign: 'CAPT. ZARA',
        specialty: 'DEEP SPACE OPS',
        deptBadge: 'FLIGHT',
        skin: '#c68642',
        hairColor: '#1e1b4b',
        hairStyle: 'hijab',
        visorStyle: 'hud',
        defaultSuit: 'artemis_white',
        bio: 'Cislunar navigation commander and Lunar South Pole communications architecture lead.'
    },
    {
        id: 'ostrowski',
        name: 'Eng. Viktor Ostrowski',
        defaultCallsign: 'ENG. VIKTOR',
        specialty: 'RADIATION & GNC',
        deptBadge: 'EECOM',
        skin: '#f5d0b5',
        hairColor: '#94a3b8',
        hairStyle: 'short',
        visorStyle: 'clear',
        defaultSuit: 'orion_orange',
        bio: 'Jovian radiation vault shielding and fault-tolerant spacecraft attitude control engineer.'
    },
    {
        id: 'okafor',
        name: 'Dr. Amara Okafor',
        defaultCallsign: 'DR. OKAFOR',
        specialty: 'ASTROBIOLOGY PI',
        deptBadge: 'SCIENCE',
        skin: '#5c3818',
        hairColor: '#090d16',
        hairStyle: 'curls',
        visorStyle: 'clear',
        defaultSuit: 'science_emerald',
        bio: 'Exosphere mass spectrometry and planetary biosignature payload integration lead.'
    },
    {
        id: 'nakamura',
        name: 'Spec. Kenji Nakamura',
        defaultCallsign: 'FIDO KENJI',
        specialty: 'PAD 3A9 & ASCENT',
        deptBadge: 'FIDO',
        skin: '#f3cfb3',
        hairColor: '#111827',
        hairStyle: 'crest',
        visorStyle: 'hud',
        defaultSuit: 'nasa_cyan',
        bio: 'Launch Pad 3A9 booster integration, Max-Q aerodynamics, and optical lasercomm specialist.'
    }
];

function renderAstronautSVG(presetId, suitColorId, animState = 'idle', badgeText = 'NASA') {
    const preset = CHARACTER_PRESETS.find(c => c.id === presetId) || CHARACTER_PRESETS[0];
    const suit = SUIT_COLORS.find(s => s.id === (suitColorId || preset.defaultSuit)) || SUIT_COLORS[0];

    const stateClass = {
        idle: 'char-state-idle',
        typing: 'char-state-typing',
        talking: 'char-state-talking',
        celebrate: 'char-state-celebrate',
        alert: 'char-state-alert'
    }[animState] || 'char-state-idle';

    let hairSvg = '';
    if (preset.hairStyle === 'bun') {
        hairSvg = `<circle cx="50" cy="17" r="8" fill="${preset.hairColor}"/><path d="M31 36 C31 21 69 21 69 36 C65 28 35 28 31 36 Z" fill="${preset.hairColor}"/>`;
    } else if (preset.hairStyle === 'bob') {
        hairSvg = `<path d="M29 44 C28 21 72 21 71 44 C70 33 66 27 50 27 C34 27 30 33 29 44 Z" fill="${preset.hairColor}"/>`;
    } else if (preset.hairStyle === 'crest') {
        hairSvg = `<path d="M32 35 C33 19 67 19 68 35 C62 26 38 26 32 35 Z" fill="${preset.hairColor}"/><path d="M45 18 L50 13 L56 19 Z" fill="${preset.hairColor}"/>`;
    } else if (preset.hairStyle === 'hijab') {
        hairSvg = `<path d="M27 42 C27 19 73 19 73 42 C73 55 64 60 50 60 C36 60 27 55 27 42 Z" fill="${suit.primary}" stroke="${suit.trim}" stroke-width="1.5"/>`;
    } else if (preset.hairStyle === 'curls') {
        hairSvg = `<circle cx="33" cy="28" r="7" fill="${preset.hairColor}"/><circle cx="67" cy="28" r="7" fill="${preset.hairColor}"/><circle cx="50" cy="21" r="8" fill="${preset.hairColor}"/>`;
    } else {
        hairSvg = `<path d="M32 34 C32 21 68 21 68 34 C63 27 37 27 32 34 Z" fill="${preset.hairColor}"/>`;
    }

    let mouthSvg = `<path class="char-mouth" d="M44 50 Q50 54 56 50" stroke="#472415" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    let browOffset = 0;
    if (animState === 'alert') {
        mouthSvg = `<ellipse class="char-mouth" cx="50" cy="51" rx="4.5" ry="2.5" fill="#472415"/>`;
        browOffset = -2;
    } else if (animState === 'celebrate') {
        mouthSvg = `<path class="char-mouth" d="M43 48 Q50 57 57 48 Z" fill="#ffffff" stroke="#472415" stroke-width="1.5"/>`;
    } else if (animState === 'talking') {
        mouthSvg = `<ellipse class="char-mouth" cx="50" cy="50.5" rx="4.5" ry="3.2" fill="#7c2d12"/>`;
    }

    let visorSvg = '';
    if (preset.visorStyle === 'hud') {
        visorSvg = `<rect x="34" y="34" width="32" height="10" rx="4" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" stroke-width="1.2"/>`;
    } else if (preset.visorStyle === 'tinted') {
        visorSvg = `<rect x="34" y="34" width="32" height="10" rx="4" fill="rgba(15, 23, 42, 0.55)" stroke="#94a3b8" stroke-width="1.2"/>`;
    }

    return `
        <svg viewBox="0 0 100 100" class="w-full h-full select-none ${stateClass}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="bgGlow_${preset.id}_${suit.id}" cx="50%" cy="45%" r="55%">
                    <stop offset="0%" stop-color="${suit.secondary}" stop-opacity="0.28"/>
                    <stop offset="100%" stop-color="#020617" stop-opacity="0.95"/>
                </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#bgGlow_${preset.id}_${suit.id})"/>
            <g class="char-breathe">
                <path d="M14 98 C14 73 27 65 50 65 C73 65 86 73 86 98 Z" fill="${suit.primary}" stroke="${suit.trim}" stroke-width="2"/>
                <rect x="35" y="75" width="30" height="18" rx="3" fill="#0f172a" stroke="${suit.secondary}" stroke-width="1.4"/>
                <circle cx="42" cy="82" r="2.2" fill="#38bdf8"/>
                <circle cx="50" cy="82" r="2.2" fill="#34d399"/>
                <rect x="40" y="87" width="20" height="2.5" rx="1" fill="${suit.secondary}"/>
                <ellipse cx="50" cy="64" rx="19" ry="5" fill="#475569" stroke="${suit.trim}" stroke-width="1.5"/>
                <rect x="19" y="78" width="12" height="7" rx="1.5" fill="${suit.secondary}"/>
                <text x="25" y="83" font-family="JetBrains Mono, monospace" font-size="4.2" font-weight="bold" fill="#020617" text-anchor="middle">${badgeText.slice(0,6)}</text>
                <g class="char-head">
                    <circle cx="50" cy="41" r="24" fill="rgba(224, 242, 254, 0.08)" stroke="${suit.trim}" stroke-width="2.2"/>
                    <path d="M32 25 A20 20 0 0 1 66 23" stroke="rgba(255,255,255,0.45)" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <circle cx="29" cy="42" r="3.5" fill="#334155" stroke="${suit.secondary}" stroke-width="1.2"/>
                    <circle cx="71" cy="42" r="3.5" fill="#334155" stroke="${suit.secondary}" stroke-width="1.2"/>
                    <ellipse cx="50" cy="42" rx="17" ry="18.5" fill="${preset.skin}"/>
                    ${hairSvg}
                    <path d="M39 ${35 + browOffset} Q43 ${33 + browOffset} 46 ${35 + browOffset}" stroke="${preset.hairColor}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                    <path d="M54 ${35 + browOffset} Q57 ${33 + browOffset} 61 ${35 + browOffset}" stroke="${preset.hairColor}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                    <g class="char-eyes">
                        <circle cx="42.5" cy="40" r="2.3" fill="#0f172a"/>
                        <circle cx="57.5" cy="40" r="2.3" fill="#0f172a"/>
                        <circle cx="43.2" cy="39.3" r="0.7" fill="#ffffff"/>
                        <circle cx="58.2" cy="39.3" r="0.7" fill="#ffffff"/>
                    </g>
                    ${visorSvg}
                    ${mouthSvg}
                    <path d="M30 44 Q36 53 45 52" stroke="#94a3b8" stroke-width="1.4" fill="none"/>
                    <circle cx="45.5" cy="52" r="1.5" fill="#38bdf8"/>
                </g>
                <g class="char-hand">
                    <circle cx="28" cy="93" r="4.5" fill="${suit.trim}"/>
                    <circle cx="72" cy="93" r="4.5" fill="${suit.trim}"/>
                </g>
            </g>
        </svg>
    `;
}

function renderNexiRobotSVG(mood = 'nominal') {
    const eyeColor = mood === 'alert' ? '#fb7185' : (mood === 'celebrate' ? '#34d399' : '#38bdf8');
    return `
        <svg viewBox="0 0 100 100" class="w-full h-full select-none nexi-float" xmlns="http://www.w3.org/2000/svg">
            <g class="nexi-ring">
                <circle cx="50" cy="50" r="44" fill="none" stroke="${eyeColor}" stroke-width="1.5" stroke-dasharray="10 6" opacity="0.55"/>
                <circle cx="50" cy="6" r="2.5" fill="${eyeColor}"/>
            </g>
            <ellipse cx="50" cy="86" rx="18" ry="4" fill="${eyeColor}" opacity="0.25"/>
            <rect x="24" y="24" width="52" height="44" rx="20" fill="#e2e8f0" stroke="#38bdf8" stroke-width="2.2"/>
            <path d="M30 28 Q50 20 70 28" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <rect x="17" y="39" width="6" height="16" rx="3" fill="#0284c7"/>
            <rect x="77" y="39" width="6" height="16" rx="3" fill="#0284c7"/>
            <line x1="50" y1="24" x2="50" y2="14" stroke="#94a3b8" stroke-width="2.5"/>
            <circle cx="50" cy="13" r="3.5" fill="${eyeColor}"/>
            <rect x="30" y="32" width="40" height="26" rx="11" fill="#020617" stroke="#1e293b" stroke-width="1.5"/>
            <g class="char-eyes">
                <ellipse cx="41" cy="44" rx="5.2" ry="6" fill="${eyeColor}"/>
                <ellipse cx="59" cy="44" rx="5.2" ry="6" fill="${eyeColor}"/>
                <circle cx="42.5" cy="42" r="1.6" fill="#ffffff"/>
                <circle cx="60.5" cy="42" r="1.6" fill="#ffffff"/>
            </g>
            <path d="M43 52 Q50 56 57 52" stroke="${eyeColor}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <path d="M37 68 L63 68 L56 77 L44 77 Z" fill="#334155" stroke="${eyeColor}" stroke-width="1.2"/>
        </svg>
    `;
}

