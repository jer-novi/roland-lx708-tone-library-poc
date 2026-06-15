/**
 * Minimale scheduler-worker voor de MIDI-speler. Draait enkel een interval-timer
 * en post `"tick"` terug naar de main thread. Een timer in een Web Worker wordt
 * door de browser veel minder hard geknepen wanneer het tabblad op de achtergrond
 * staat dan een `setInterval` op de main thread — zo blíjft de speler de
 * MIDI-wachtrij vooruit vullen en speelt een track door (bv. met een DAW ernaast).
 *
 * Berichten:
 *   { type: "start", interval } — start/herstart de timer (ms).
 *   { type: "stop" }            — stopt de timer.
 */

type SchedulerMessage =
  | { type: "start"; interval?: number }
  | { type: "stop" };

// `self` is hier de worker-global. We typen 'm los van de DOM-`Window` (waarvan
// postMessage een target-origin eist) zodat dit zonder de "webworker"-lib compileert.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<SchedulerMessage>) => void) | null;
  postMessage: (message: unknown) => void;
};

let timer: ReturnType<typeof setInterval> | null = null;

ctx.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "start") {
    if (timer != null) clearInterval(timer);
    timer = setInterval(() => ctx.postMessage("tick"), msg.interval ?? 25);
  } else if (msg.type === "stop") {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  }
};

export {};
