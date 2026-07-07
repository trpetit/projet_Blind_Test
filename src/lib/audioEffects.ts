// Dynamic synthesizer sound effects using Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playBuzzSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Buzz sound: Sawtooth wave dropping from 200Hz to 100Hz
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);
    
    // Add second detuned oscillator for thickness
    osc2.type = "square";
    osc2.frequency.setValueAtTime(223, now);
    osc2.frequency.exponentialRampToValueAtTime(111, now + 0.4);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Could not play sound effect", e);
  }
}

export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode1 = ctx.createGain();
    const gainNode2 = ctx.createGain();

    // High energetic double beep chime (major third chord)
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(523.25, now + 0.1);
    gainNode1.gain.setValueAtTime(0.1, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
    gainNode2.gain.setValueAtTime(0.1, now + 0.12);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc1.connect(gainNode1);
    gainNode1.connect(ctx.destination);

    osc2.connect(gainNode2);
    gainNode2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn("Could not play sound effect", e);
  }
}

export function playFailSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Low "sad trombone" or mistake buzz
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.35);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    console.warn("Could not play sound effect", e);
  }
}

export function playClickSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn("Could not play sound effect", e);
  }
}
