import { describe, expect, it } from 'vitest';
import { FpsMeter, track } from './telemetry';

describe('telemetria', () => {
  it('FPS médio e dos piores quadros', () => {
    const m = new FpsMeter();
    expect(m.summary()).toEqual({ fps_avg: null, fps_low: null }); // poucos quadros
    for (let i = 0; i < 95; i++) m.add(1 / 60);
    for (let i = 0; i < 5; i++) m.add(1 / 20); // travadas
    const s = m.summary();
    expect(s.fps_avg).toBeGreaterThan(50);
    expect(s.fps_avg).toBeLessThan(60);
    expect(s.fps_low).toBe(20);
  });

  it('partidas longas contam inteiras (travadas no fim aparecem)', () => {
    const m = new FpsMeter();
    for (let i = 0; i < 30000; i++) m.add(1 / 144); // ~3,5 min a 144 Hz
    for (let i = 0; i < 2000; i++) m.add(1 / 25); // fim pesado
    expect(m.summary().fps_low).toBe(25);
    m.reset();
    expect(m.summary().fps_avg).toBeNull();
  });

  it('sem iniciar (ou sem chaves) não faz nada', () => {
    expect(() => track('run_start', { character: 'lule' })).not.toThrow();
  });
});
