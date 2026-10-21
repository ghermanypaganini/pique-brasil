const STEP = 1 / 60;
const MAX_STEPS = 5; // evita "espiral da morte" após travadas

/** Lógica em passo fixo de 60 Hz; renderização a cada quadro. */
export function startLoop(update: (dt: number) => void, render: (frameDt: number) => void): () => void {
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const frameDt = Math.min(0.25, Math.max(0, (now - last) / 1000));
    last = now;
    acc += frameDt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS) {
      update(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) acc = 0;
    render(frameDt);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
