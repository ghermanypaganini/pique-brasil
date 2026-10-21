import './style.css';
import { bindInput } from './core/input';
import { startLoop } from './core/loop';
import { SceneRenderer } from './render/scene';
import { loadSave, writeSave } from './services/save';
import { Game } from './systems/game';
import type { Character } from './systems/types';
import { t } from './ui/i18n';
import { Ui, type Screen } from './ui/ui';

const frame = document.getElementById('game')!;
const canvas = document.getElementById('view') as HTMLCanvasElement;
document.getElementById('rotate')!.textContent = t('rotate');
document.title = t('title');

const save = loadSave();
const renderer = new SceneRenderer(canvas);

let screen: Screen = 'menu';
let finished = false; // dinheiro e recorde da partida atual já foram salvos
let resumeTo: Screen = 'hud'; // tela para onde a pausa volta (HUD ou contagem do Continuar)
// No menu, uma partida "de vitrine" parada serve de fundo.
let game = new Game({ character: save.character, bank: save.bank });
renderer.setCharacter(game);

const ui = new Ui(document.getElementById('ui')!, {
  start: (c) => startRun(c),
  pause: () => pause(),
  resume: () => resume(),
  quit: () => toMenu(),
  continueRun: () => {
    if (game.continueRun()) setScreen('hud');
  },
  giveUp: () => {
    game.giveUp();
  },
  again: () => startRun(game.character),
  acceptSatire: () => {
    save.satireAccepted = true;
    writeSave(save);
    setScreen('menu');
  },
  toggleShake: (on) => {
    save.reduceShake = on;
    writeSave(save);
  },
});
ui.selectCharacter(save.character);
ui.setShake(save.reduceShake);

function setScreen(s: Screen) {
  screen = s;
  ui.show(s);
  if (s === 'menu') ui.setMenuStats(save.best, save.bank);
}

function startRun(character: Character) {
  save.character = character;
  writeSave(save);
  game = new Game({ character, bank: save.bank });
  finished = false;
  renderer.setCharacter(game);
  setScreen('hud');
}

/** Pausa a corrida ou a contagem do Continuar (que também não pode correr com a tela coberta). */
function pause() {
  if (screen !== 'hud' && screen !== 'continue') return;
  resumeTo = screen;
  game.clearInput();
  setScreen('pause');
}

function resume() {
  if (screen !== 'pause') return;
  game.clearInput();
  setScreen(resumeTo);
}

function toMenu() {
  if (game.time > 0) finishRun(); // sair no meio da partida guarda o dinheiro
  game = new Game({ character: save.character, bank: save.bank });
  renderer.setCharacter(game);
  setScreen('menu');
}

function finishRun(): boolean {
  if (finished) return false;
  finished = true;
  save.bank = game.bank + game.coins;
  const newBest = game.score > save.best;
  if (newBest) save.best = game.score;
  writeSave(save);
  return newBest;
}

bindInput(frame, {
  action: (a) => {
    if (screen === 'hud') game.input(a);
  },
  pause: () => (screen === 'pause' ? resume() : pause()),
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

function resize() {
  const w = frame.clientWidth;
  const h = frame.clientHeight;
  renderer.resize(w, h);
  // Celular deitado: pausa (a mensagem "gire o celular" aparece via CSS).
  if (window.matchMedia('(orientation: landscape) and (pointer: coarse)').matches) pause();
}
window.addEventListener('resize', resize);
resize();

startLoop(
  (dt) => {
    if (screen !== 'hud' && screen !== 'continue') return;
    game.update(dt);
    for (const e of game.drainEvents()) {
      if (e.type === 'caught' && game.phase === 'continue') setScreen('continue');
    }
    if (game.phase === 'over') {
      const newBest = finishRun();
      ui.showResults(game, newBest);
      setScreen('over');
    }
  },
  (frameDt) => {
    renderer.render(game, frameDt, frame.clientWidth, { reduceShake: save.reduceShake, active: screen === 'hud' });
    if (screen === 'hud' || screen === 'pause') ui.updateHud(game);
    if (screen === 'continue') ui.updateContinue(game);
  },
);

setScreen(save.satireAccepted ? 'menu' : 'satire');

// Acesso para testes automatizados (só no modo de desenvolvimento).
if (import.meta.env.DEV) {
  (window as unknown as { __pb: object }).__pb = {
    get game() {
      return game;
    },
    get screen() {
      return screen;
    },
  };
}
