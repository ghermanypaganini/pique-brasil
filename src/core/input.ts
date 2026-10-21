import type { Action } from '../systems/types';

const KEYS: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ArrowDown: 'roll',
  KeyS: 'roll',
};

const SWIPE_MIN_PX = 28;

export interface InputHandlers {
  action(a: Action): void;
  pause(): void;
}

/** Teclado + swipe. Um swipe gera uma ação assim que passa do limite, sem esperar soltar o dedo. */
export function bindInput(surface: HTMLElement, h: InputHandlers): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      h.pause();
      return;
    }
    const a = KEYS[e.code];
    if (a) {
      e.preventDefault();
      h.action(a);
    }
  };

  let start: { x: number; y: number; id: number } | null = null;
  const onDown = (e: PointerEvent) => {
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onMove = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) h.action(dx < 0 ? 'left' : 'right');
    else h.action(dy < 0 ? 'jump' : 'roll');
    start = null; // um gesto = uma ação
  };
  const onUp = () => {
    start = null;
  };

  window.addEventListener('keydown', onKey);
  surface.addEventListener('pointerdown', onDown);
  surface.addEventListener('pointermove', onMove);
  surface.addEventListener('pointerup', onUp);
  surface.addEventListener('pointercancel', onUp);
  return () => {
    window.removeEventListener('keydown', onKey);
    surface.removeEventListener('pointerdown', onDown);
    surface.removeEventListener('pointermove', onMove);
    surface.removeEventListener('pointerup', onUp);
    surface.removeEventListener('pointercancel', onUp);
  };
}
