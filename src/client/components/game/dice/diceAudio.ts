/**
 * Casino-Grade 3D Dice Procedural Audio Synthesizer
 * Built using the Web Audio API for zero-latency, asset-free, frame-synchronized audio.
 *
 * Implements:
 * 1. Rolling sounds: Aerodynamic whoosh & continuous tumble hum
 * 2. Cube tumble sounds: High-frequency acrylic/ivory clacks as faces and edges spin
 * 3. Table impacts: Deep wooden/felt table thud + surface bounce clicks (Bounce 1 & Bounce 2)
 * 4. Final landing impact: Authoritative flat table settlement snap + body resonance
 * 5. Success sound: Radiant ascending casino chime / bell shimmer as the result appears
 */

class DiceAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.85;
  private rollingNode: {
    source: AudioBufferSourceNode;
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null = null;

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopRollingSound();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Helper to create a brief buffer of pink/white noise for physical friction & transient snaps
   */
  private createNoiseBuffer(duration = 0.5): AudioBuffer | null {
    const ctx = this.getAudioContext();
    if (!ctx) return null;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.3;
    }
    return buffer;
  }

  /**
   * 1. Continuous Rolling & Aerodynamic Tumble Sound
   * Runs during mid-air flight and rapid angular velocity (0.0s - 1.85s)
   */
  public startRollingSound(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stopRollingSound();

    try {
      const noiseBuffer = this.createNoiseBuffer(2.5);
      if (!noiseBuffer) return;

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      // Dynamic Bandpass Filter simulating air friction & rolling frequency
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(850, ctx.currentTime + 0.45);
      filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 1.4);
      filter.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 1.85);
      filter.Q.value = 3.0;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18 * this.masterVolume, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.18 * this.masterVolume, ctx.currentTime + 1.35);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.85);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      this.rollingNode = { source, filter, gain };
    } catch {
      // Graceful fallback if Web Audio is restricted
    }
  }

  public stopRollingSound(): void {
    if (this.rollingNode) {
      try {
        this.rollingNode.gain.gain.setValueAtTime(this.rollingNode.gain.gain.value, this.ctx?.currentTime || 0);
        this.rollingNode.gain.gain.linearRampToValueAtTime(0.0001, (this.ctx?.currentTime || 0) + 0.05);
        this.rollingNode.source.stop((this.ctx?.currentTime || 0) + 0.05);
      } catch {}
      this.rollingNode = null;
    }
  }

  /**
   * 2. Cube Tumble Sound (Transient Ivory/Acrylic Edge Clack)
   * Plays sharp micro-clacks as the dice tumbles through the air
   */
  public playCubeTumbleSound(variation = 1.0): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Layer A: Micro-resonant ivory edge ping
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const baseFreq = 540 * variation + (Math.random() * 80 - 40);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.04);

      oscGain.gain.setValueAtTime(0.22 * this.masterVolume, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);

      // Layer B: High-frequency snap click
      const clickBuffer = this.createNoiseBuffer(0.04);
      if (clickBuffer) {
        const clickSource = ctx.createBufferSource();
        clickSource.buffer = clickBuffer;

        const clickFilter = ctx.createBiquadFilter();
        clickFilter.type = 'bandpass';
        clickFilter.frequency.setValueAtTime(2200 * variation, now);
        clickFilter.Q.value = 6.0;

        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0.18 * this.masterVolume, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        clickSource.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickSource.start(now);
        clickSource.stop(now + 0.04);
      }
    } catch {}
  }

  /**
   * 3. Table Impact Sound (Table Felt & Pedestal Bounce)
   * Impact 1 (t = 1.85s) or Impact 2 (t = 1.98s)
   */
  public playTableImpact(bounceIndex: 1 | 2 = 1): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const intensity = bounceIndex === 1 ? 1.0 : 0.48;

      // Layer A: Low-frequency wooden/felt table body thump
      const thumpOsc = ctx.createOscillator();
      const thumpGain = ctx.createGain();
      thumpOsc.type = 'triangle';
      thumpOsc.frequency.setValueAtTime(bounceIndex === 1 ? 145 : 175, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(45, now + 0.09);

      thumpGain.gain.setValueAtTime(0.45 * intensity * this.masterVolume, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      thumpOsc.connect(thumpGain);
      thumpGain.connect(ctx.destination);
      thumpOsc.start(now);
      thumpOsc.stop(now + 0.12);

      // Layer B: Hard ivory surface contact click
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(bounceIndex === 1 ? 880 : 1100, now);
      snapOsc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

      snapGain.gain.setValueAtTime(0.35 * intensity * this.masterVolume, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.05);

      // Layer C: Table felt acoustic noise texture
      const feltBuffer = this.createNoiseBuffer(0.06);
      if (feltBuffer) {
        const feltSource = ctx.createBufferSource();
        feltSource.buffer = feltBuffer;
        const feltFilter = ctx.createBiquadFilter();
        feltFilter.type = 'bandpass';
        feltFilter.frequency.setValueAtTime(1600, now);
        feltFilter.Q.value = 4.0;

        const feltGain = ctx.createGain();
        feltGain.gain.setValueAtTime(0.25 * intensity * this.masterVolume, now);
        feltGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

        feltSource.connect(feltFilter);
        feltFilter.connect(feltGain);
        feltGain.connect(ctx.destination);
        feltSource.start(now);
        feltSource.stop(now + 0.06);
      }
    } catch {}
  }

  /**
   * 4. Final Landing Impact Sound
   * Authoritative solid landing on the table at t = 2.08s
   */
  public playFinalLandingImpact(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stopRollingSound();

    try {
      const now = ctx.currentTime;

      // Deep solid table settle thump
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(115, now);
      subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.14);

      subGain.gain.setValueAtTime(0.55 * this.masterVolume, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.16);

      // Sharp resin / ivory landing lock click
      const lockOsc = ctx.createOscillator();
      const lockGain = ctx.createGain();
      lockOsc.type = 'triangle';
      lockOsc.frequency.setValueAtTime(1420, now);
      lockOsc.frequency.exponentialRampToValueAtTime(420, now + 0.045);

      lockGain.gain.setValueAtTime(0.38 * this.masterVolume, now);
      lockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      lockOsc.connect(lockGain);
      lockGain.connect(ctx.destination);
      lockOsc.start(now);
      lockOsc.stop(now + 0.055);
    } catch {}
  }

  /**
   * 5. Success Sound (Radiant Casino Victory Chime)
   * Plays sparkling harmonic chimes as the result glow illuminates (t = 2.12s - 2.20s)
   */
  public playResultSuccessSound(rollResult = 6): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Ascending pentatonic bell frequencies: E6, G6, B6, E7
      // Extra brilliance overtone for high rolls (5 or 6)
      const frequencies = rollResult >= 5
        ? [1318.51, 1567.98, 1975.53, 2637.02, 3135.96] // E6, G6, B6, E7, G7
        : [1046.50, 1318.51, 1567.98, 2093.00]; // C6, E6, G6, C7

      const noteDuration = 0.45;

      frequencies.forEach((freq, index) => {
        const noteTime = now + index * 0.045; // Fast sparkling arpeggio cascade

        // Oscillator with warm bell harmonic
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        // Gentle sparkle envelope with natural decay
        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(0.28 * this.masterVolume, noteTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + noteDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + noteDuration + 0.05);
      });
    } catch {}
  }

  /**
   * 6. HD Space Pop-Out UI Feedback
   * Produces a clean acoustic holographic aperture snap and frequency chord
   */
  public playHDPopOutSound(toneIndex = 0): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const baseFreq = 520 + (toneIndex % 12) * 35;

      // Soft aerodynamic snap
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(baseFreq * 1.5, now);
      snapOsc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.08);

      snapGain.gain.setValueAtTime(0.001, now);
      snapGain.gain.linearRampToValueAtTime(0.18 * this.masterVolume, now + 0.01);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now);
      snapOsc.stop(now + 0.13);

      // Resonant harmonic shimmer
      const chordOsc = ctx.createOscillator();
      const chordGain = ctx.createGain();
      chordOsc.type = 'triangle';
      chordOsc.frequency.setValueAtTime(baseFreq * 2, now + 0.02);

      chordGain.gain.setValueAtTime(0.001, now + 0.02);
      chordGain.gain.linearRampToValueAtTime(0.12 * this.masterVolume, now + 0.035);
      chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      chordOsc.connect(chordGain);
      chordGain.connect(ctx.destination);
      chordOsc.start(now + 0.02);
      chordOsc.stop(now + 0.24);
    } catch {}
  }

  /**
   * 7. Tactile UI Button Click
   */
  public playClick(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      gain.gain.setValueAtTime(0.15 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } catch {}
  }
}

export const diceAudio = new DiceAudioEngine();
