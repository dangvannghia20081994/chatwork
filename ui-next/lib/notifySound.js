// Short notification beeps via the Web Audio API — no asset file needed. Used by AgentConsole to
// signal when a long AI run finishes (done) or fails (error). Ported from elearning/notify-sound.ts.
let ctx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // The browser may keep the context suspended until a user gesture — the user clicked Send, so
    // resuming here is allowed.
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq, startAt, dur, peak = 0.15) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t0 = c.currentTime + startAt;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

// Cheerful "ting-ting" on completion.
export function playDoneSound() {
  beep(659.25, 0, 0.18); // E5
  beep(987.77, 0.16, 0.32); // B5
}

// Two low descending notes on error.
export function playErrorSound() {
  beep(311.13, 0, 0.26, 0.18); // Eb4
  beep(233.08, 0.18, 0.36, 0.18); // Bb3
}
