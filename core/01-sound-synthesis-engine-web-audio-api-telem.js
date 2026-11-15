/* A.T.L.A.S · section 1 — loaded as a classic script; shares the global scope with the other files. */
/***********************************************************************
 * 1. SOUND SYNTHESIS ENGINE (Web Audio API - Telemetry, Thrusters & ATLAS)
 ***********************************************************************/
const SoundFX = {
    ctx: null,
    muted: false,
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
    },
    beep(freq = 620, duration = 0.06, type = 'sine', vol = 0.06) {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.out || this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    },
    click() { this.beep(780, 0.04, 'triangle', 0.05); },
    quindar() { this.beep(2525, 0.18, 'sine', 0.06); },
    nexiChime() {
        this.beep(987.77, 0.06, 'sine', 0.04);
        setTimeout(() => this.beep(1318.5, 0.09, 'sine', 0.045), 65);
    },
    success() {
        this.beep(523.25, 0.09, 'sine', 0.07);
        setTimeout(() => this.beep(659.25, 0.09, 'sine', 0.07), 80);
        setTimeout(() => this.beep(783.99, 0.16, 'sine', 0.08), 160);
    },
    alert() {
        this.beep(260, 0.14, 'sawtooth', 0.07);
        setTimeout(() => this.beep(210, 0.18, 'sawtooth', 0.07), 130);
    },
    rumble(duration = 0.7) {
        if (this.muted) return;
        try {
            this.init();
            if (!this.ctx) return;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.6));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 145;
            const gain = this.ctx.createGain();
            gain.gain.value = 0.16;
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.out || this.ctx.destination);
            noise.start();
        } catch (e) {}
    }
};

