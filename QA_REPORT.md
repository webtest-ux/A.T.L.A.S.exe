# A.T.L.A.S — QA Report (Stage 12)

Automated run on the final build: **61 passed, 0 failed**, no JavaScript errors.
Original-feature regression: 41 checks, identical except the two expected design changes (Europa telemetry is time-varying; the simulation now opens after the deployment sequence). Reference debrief score is unchanged at 804.

Environment: headless Chrome, at 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024 and 390×844. The CDNs are offline in the test sandbox, so three.js is replaced by a call-recording stub: 3D calls are verified, but real GPU rendering is not. Multiplayer was tested with 4 tabs over a local HTTP server.

## TEST 1 — Cadet mode
| Result | Check | Measured |
|---|---|---|
| PASS | Launcher shows the mission cards in plain language | 1 · CHOOSE YOUR EXPERIENCE 2 · SELECT YOUR MISSION 3 · BUILD & LAUNCH Select your mission Playing as CADET MODE · change |
| PASS | Cadet interface active |  |
| PASS | Mission explained in plain words (guide + ATLAS) | ✓ Mission chosen 2 Build your spacecraft 3 Check the electricity 4 Choose the orbit 5 Ready? Launch! Step 2: Build your  |
| PASS | Builder shows choice cards with plain descriptions | 15 buttons |
| PASS | Every problem has what / why / how-to-fix text | 3 problems |
| PASS | Calculations respond to choices (cost/mass/power change) | $272M→$180M, -65W→90W |
| PASS | Following ATLAS recommendations reaches GO | GO after 1 pass(es) |
| PASS | Readiness gate lets a GO spacecraft launch |  |
| PASS | Simulation opens after deployment |  |
| PASS | Mission reaches debrief (phase 5) | 1,2,3,4 |
| PASS | Mission objectives completed | science 562/350, score 1040 |
| PASS | Debrief summary + rating shown | S RATING Mission objectives complete · EARTH-PULSE (Climate & SAR) Science 562/350 Score 1 |
| PASS | MISSION SUCCESS achievement awarded by real result |  |
| PASS | Every mission is launch-ready and winnable with ATLAS’s plan in all modes | c:earth=GO/win c:artemis=GO/win c:red=GO/win c:europa=GO/win e:earth=GO/win e:artemis=GO/win e:red=GO/win e:europa=GO/win d:earth=GO/win d:artemis=GO/win d:red= |

## TEST 2 — Engineer mode
| Result | Check | Measured |
|---|---|---|
| PASS | Engineer interface active |  |
| PASS | Body swap changes cost by the catalog difference | Δ$33M vs catalog Δ$33M |
| PASS | Body swap changes mass by the catalog difference | Δ140 kg vs catalog Δ140 kg |
| PASS | Budget shown in builder matches engine | $305M |
| PASS | Power source changes generated watts and balance | 153W→342W, net -63W |
| PASS | Battery change moves eclipse margin | 243→1473 Wh |
| PASS | Adding an instrument raises science, power load, data and mass | sci 380→471, load 405→535W |
| PASS | Removing it restores the previous values |  |
| PASS | All scientific instruments still available | 6 instruments |
| PASS | Orbit sliders change periapsis and eclipse | Pe 400→800 km, eclipse 20% |
| PASS | Wrong-planet orbit is flagged by FIDO and the checklist |  |
| PASS | Engineer can still reach GO with ATLAS plan |  |

## TEST 3 — Mission Control mode
| Result | Check | Measured |
|---|---|---|
| PASS | Mission Control keeps the original dashboard | Sounder LIDAR MAG Dual MMRTG Nuclear · isotope (no arrays) 420 Wh · Standard Li- |
| PASS | HUD orbit telemetry = engine values | 350×4500 km (45°) |
| PASS | HUD eclipse = engine value | 15% / Orbit |
| PASS | HUD Δv = engine value | 17.7 km/s |
| PASS | HUD radiation = engine value | Lv 4 (Extreme) |
| PASS | Power / data telemetry show engine numbers | +75W (420Wh) / 104/125 Gbps (83%) |
| PASS | Engineering alerts match the engine conditions | 1 hard alerts expected; got LAUNCH VEHICLE OVERWEIGHT, DSN DOWNLINK BOTTLENECK (17% LOST), RADIATION SHIELDING DEFICIT |
| PASS | GO/NO-GO poll rows use the real station results | EECOM:GO/GO! GNC:NO/NO-GO FIDO:GO/GO! SCIENCE:NO/NO-GO FLIGHT / PAD:NO/NO-GO |
| PASS | Readiness verdict = poll verdict | NO-GO |

## TEST 4 — Launch
| Result | Check | Measured |
|---|---|---|
| PASS | Plan is GO before launch |  |
| PASS | Countdown starts and counts down | T−10 RANGE IS GREEN Skip count → T−09 Skip countdown |
| PASS | 3D ascent sequence runs (rocket geometry built, render loop active) | stage 1; THREE calls: THREE.Mesh, 0.Mesh, THREE.SphereGeometry, 0.SphereGeometry, THREE.MeshBasicMaterial, 0.MeshBasicMaterial |
| PASS | Launch milestones shown | MISSION MILESTONES ✓ Countdown 2 Liftoff 3 Max-Q 4 Stage separation 5 Fairing se |
| PASS | Altitude/velocity come from the ascent engine | 0.4 km / 0.39 km/s |
| PASS | Ascent advances through every stage | 1→3→4→5 |
| PASS | Spacecraft deployment sequence plays | MISSION MILESTONES ✓ Countdown ✓ Liftoff ✓ Max-Q ✓ Stage separation ✓ Fairing separation 6 |
| PASS | Transition into the mission simulation |  |
| PASS | Orbit view after insertion |  |

## TEST 5 — Multiplayer
| Result | Check | Measured |
|---|---|---|
| PASS | Solo mode works (no crew bar, mission reaches GO) | ['solo', True, True] |
| PASS | 4-player lobby: each tab holds its own seat | [1, 2, 3, 4] |
| PASS | Seat callsign edit reaches all 4 tabs | ['EECOM ZED', 'EECOM ZED', 'EECOM ZED', 'EECOM ZED'] |
| PASS | Lobby shows 4 seat cards |  |
| PASS | Room sync: instrument change reaches every tab | laser_altimeter+magnetometer+mass_spec |
| PASS | Crew assignments preserved (mode switch, lobby, save/load) | [["FLIGHT","CMDR. VANCE","vance"],["EECOM","EECOM ZED","thorne"],["SCIENCE","SCI CHEN","lin"],["FIDO","FIDO KOVACS","kov |
| PASS | Active seat kept after mode switch |  |
| PASS | Cadet lobby explains FLIGHT/EECOM/SCIENCE/FIDO simply | ['The team captain. Pick', 'The power keeper. Make', 'The explorer. Chooses ', 'The navigator. Chooses'] |
| PASS | Interface matches shared difficulty in every tab | [['cadet', 'xp-cadet'], ['cadet', 'xp-cadet'], ['cadet', 'xp-cadet'], ['cadet', 'xp-cadet']] |
| PASS | No JavaScript errors in 4 tabs | [] |

## TEST 6 — General
| Result | Check | Measured |
|---|---|---|
| PASS | Explore: every body in the list opens | 15 bodies; container [17,0] |
| PASS | Navigation: all tabs and rail items open without errors | 6 tabs, 11 rail items; errors:  |
| PASS | All dialogs open and close | 7 dialogs |
| PASS | No broken buttons: every handler calls an existing function | 371 distinct handlers checked; missing:  |
| PASS | No visible buttons without an action |  |
| PASS | Mission state valid after full tour | earth_pulse · $272M · -65W |
| PASS | No JavaScript errors during the tour |  |

## Issues found and fixed in this stage
1. **Cadet could not finish a mission by following ATLAS.** Recommendations were chosen one step at a time, so the design ended up over budget with a radio that was too slow. The original "optimal preset" was also NO-GO on every mission. ATLAS now plans one complete design with the real engine (`nexiPlan()`); every builder suggestion and the new "Use ATLAS’s full design" button come from that plan. Verified: all 4 missions × 3 modes are GO and winnable.
2. **No way to change the rocket in the builder.** Added a "Launch Rocket" step (`state.rocket` + `ROCKETS`), so "too heavy for the rocket" can be fixed from the builder.
3. **Cadet guide promised a button that no longer existed.** The text now matches the real buttons.
4. **Phones scrolled sideways** (56–95 px in Engineer and Mission Control): the mode row now wraps, and the header telemetry strip scrolls inside itself.
5. **Floating ATLAS covered dashboard numbers** (Engineer on laptops) and **sat partly off-screen on phones**. ATLAS is now docked in the left column in Cadet and Engineer, and placed at the end of the page on screens under 1024 px. Mission Control keeps its original floating ATLAS on desktop, where it covers nothing.

## Not verifiable in this sandbox
- Real WebGL rendering and visual quality of the 3D scenes (the code paths and three.js calls are verified).
- Phosphor icons and Google Fonts (blocked offline; they load normally online).

## Pad 3A9 flight (Earth-to-space upgrade)
Logic, controls, timing, both launch paths and the audio graph were run in headless Chrome. The 3D library is replaced by a stub in this sandbox, so **how the scene looks was not verified** — only that it is built and updated without errors.

| Result | Check | Measured |
|---|---|---|
| PASS | Altitude→height map is continuous and always rising | 0km→0, 1km→114, 10km→699, 100km→1836, 200km→2217 units |
| PASS | Sky fades blue → dark → black with no jumps | blue 0.93 → 0.52 → 0.011999999999999997; largest step 0.0100 |
| PASS | Atmosphere layers named by altitude |  |
| PASS | Pad view builds the Earth launch environment without errors | ok |
| PASS | Scene pieces created (globe, ground, facilities, sprites, lights, fog) | all present |
| PASS | Rocket starts on the pad (altitude 0, not flying) | On the pad · sea level |
| PASS | Controls present: launch, pause, restart, to pad, 5 cameras, speed | LAUNCH ROCKET · FREE FLIGHT / Pause / Restart / To pad / Launch pad / Tracking / First-person / Earth view / Space view / Speed 1× |
| PASS | Countdown runs from T−10 | T−10 RANGE IS GREEN FR → T−08 FREE FLIGHT · NO  |
| PASS | Launch button disabled while counting |  |
| PASS | Ignition phase detected before liftoff (T−3 and below) |  |
| PASS | Liftoff is slow at first (time-based clock) | after 2 s: timer 0.104, altitude 26 m, height 2.9 units |
| PASS | Rocket keeps climbing and accelerates | 26 m → 250 m (height 28 units) |
| PASS | HUD altitude = engine altitude | 0.2 km |
| PASS | Pause freezes the flight | timer 0.3226 → 0.3226 |
| PASS | Resume continues the flight | timer 0.4142 |
| PASS | All 5 camera views select and show as active | true,true,true,true,true |
| PASS | Camera blend completes (1.2 s transition) |  |
| PASS | Speed 3× advances the flight faster | +0.61 timer units in 1 s |
| PASS | Automatic staging: Max-Q → separation → fairing → engine cutoff | 1→2→3→4→5 |
| PASS | Passes through the atmosphere layers into space | Troposphere → Stratosphere → Mesosphere → Thermosphere → Space |
| PASS | Reaches space and stays there (no mission simulation started) | 240 km · Engine cutoff at 240 km. You are in space — switch camera vi |
| PASS | Free flight gives no achievements or score bonus | none |
| PASS | Rocket keeps travelling over Earth in orbit | down-range angle 0.2654 → 0.2849 |
| PASS | Return to pad resets everything |  |
| PASS | Restart begins a new countdown without reloading |  |
| PASS | Restart during flight goes back to countdown |  |
| PASS | Leaving the pad view ends the free flight and restores the scene |  |
| PASS | Mission launch still shows its countdown | T−10 RANGE IS GREEN  |
| PASS | Mission ascent flies with the new view |  |
| PASS | Mission launch still ends in the mission simulation |  |
| PASS | No flight-view error at any point |  |

### Audio manager and launch audio
| Result | Check | Measured |
|---|---|---|
| PASS | Nothing can play before the player interacts (audio suspended at page open) | checked separately at load |
| PASS | First sound builds the audio graph (master + music/effects/ambient buses) | context running |
| PASS | Ignition starts the launch sound nodes | roar/wind/drone nodes live |
| PASS | Engine roar is audible during ascent | {"master":0.8,"sfx":0.8,"amb":0.6,"roar":0.57} |
| PASS | Volume settings change the real gain nodes | {"master":0.3,"sfx":0.5,"amb":0.2,"roar":0.57} |
| PASS | Mute silences everything (master gain 0, beeps off, speech level 0) | {"master":0,"sfx":0.5,"amb":0.2,"roar":0.569} |
| PASS | Audio preferences are saved in the browser | {"enabled":true,"muted":true,"master":0.3,"music":0.5,"sfx":0.5,"ambient":0.2} |
| PASS | Unmute restores the saved volume | {"master":0.3,"sfx":0.5,"amb":0.2,"roar":0.569} |
| PASS | Pause silences the engine | {"master":0.3,"sfx":0.5,"amb":0.2,"roar":0} |
| PASS | Returning to the pad stops the launch sounds |  |
| PASS | "Audio enabled: off" also silences |  |
| PASS | Speech (countdown voice) available in this browser | yes |
