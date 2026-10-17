// lib/sound.js - Generador de alerta sonora tipo Kiosco POS con Web Audio API
export function playChimeSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Doble tono armónico tipo "ding-dong" de recepción de orden
    const now = ctx.currentTime;

    // Tono 1: Frecuencia 880Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Tono 2: Frecuencia 1174Hz (D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1174.66, now + 0.15);
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.7);
  } catch (e) {
    console.warn("No se pudo reproducir audio con Web Audio API:", e);
  }
}
