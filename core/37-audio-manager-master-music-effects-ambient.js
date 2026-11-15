/* A.T.L.A.S · section 16S — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 16S. AUDIO MANAGER — master / music / effects / ambient buses
 *      One Web Audio graph for the whole app: every sound goes through
 *      a category bus and the master gain, so volume and mute settings
 *      change what is actually heard. Preferences are saved in the
 *      browser. Nothing plays until the player interacts with the page.
 *      The existing SoundFX beeps are routed through the effects bus.
 ***********************************************************************/
const AtlasAudio = {
    KEY: 'atlas_audio_v1',
    prefs: { enabled: true, muted: false, master: 0.8, music: 0.5, sfx: 0.8, ambient: 0.6 },
    ctx: null, master: null, buses: {}, _building: false,
    load() {
        try {
            const d = JSON.parse(localStorage.getItem(this.KEY) || 'null');
            if (d && typeof d === 'object') Object.keys(this.prefs).forEach(k => { if (typeof d[k] === typeof this.prefs[k]) this.prefs[k] = d[k]; });
        } catch (e) { /* storage blocked: defaults for this visit */ }
    },
    save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.prefs)); } catch (e) { /* not persisted */ } },
    on() { return this.prefs.enabled && !this.prefs.muted; },
    // Effective 0–1 level for a category (used for speech, which has no audio node)
    level(cat) { return this.on() ? this.prefs.master * (this.prefs[cat] === undefined ? 1 : this.prefs[cat]) : 0; },
    ensure() {
        if (this.master) return true;
        if (this._building) return false;
        this._building = true;
        try {
            SoundFX.init();
            const ctx = SoundFX.ctx;
            if (!ctx) return false;
            this.ctx = ctx;
            this.master = ctx.createGain();
            this.master.connect(ctx.destination);
            ['music', 'sfx', 'ambient'].forEach(n => { const g = ctx.createGain(); g.connect(this.master); this.buses[n] = g; });
            SoundFX.out = this.buses.sfx;
            this.apply(true);
            return true;
        } catch (e) { return false; } finally { this._building = false; }
    },
    bus(name) { return this.ensure() ? this.buses[name] : null; },
    apply(instant) {
        SoundFX.muted = !this.on();
        if (!this.master) return;
        const t = this.ctx.currentTime, tc = instant ? 0.001 : 0.03;
        this.master.gain.setTargetAtTime(this.on() ? this.prefs.master : 0, t, tc);
        Object.keys(this.buses).forEach(n => this.buses[n].gain.setTargetAtTime(this.prefs[n], t, tc));
        if (!this.on()) { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* no speech */ } }
    },
    // key: 'enabled' | 'muted' (boolean) or 'master' | 'music' | 'sfx' | 'ambient' (0–1)
    set(key, value) {
        if (!(key in this.prefs)) return;
        this.prefs[key] = typeof this.prefs[key] === 'boolean' ? !!value : Math.max(0, Math.min(1, Number(value) || 0));
        this.save(); this.apply();
    }
};
AtlasAudio.load();
// Build the graph the first time any sound is made (i.e. after a user gesture)
(() => {
    const _init = SoundFX.init;
    SoundFX.init = function () {
        _init.apply(this, arguments);
        if (!this.ctx) return;
        // Browsers keep audio suspended until the player interacts; resume as soon as that is allowed
        if (this.ctx.state === 'suspended') { try { this.ctx.resume().catch(() => { }); } catch (e) { /* not allowed yet */ } }
        if (!AtlasAudio.master) AtlasAudio.ensure();
    };
})();
// The existing mute buttons stay the mute control; they now drive (and persist through) the manager
const _audioToggleMute = toggleAudioMute;
toggleAudioMute = function () {
    _audioToggleMute.apply(this, arguments);
    AtlasAudio.prefs.muted = SoundFX.muted;
    if (!SoundFX.muted) AtlasAudio.prefs.enabled = true;
    AtlasAudio.save(); AtlasAudio.apply();
};
// Restore a saved mute (updates the button labels through the existing function; makes no sound)
if (!AtlasAudio.on()) { SoundFX.muted = false; try { _audioToggleMute(); } catch (e) { SoundFX.muted = true; } AtlasAudio.apply(); }

