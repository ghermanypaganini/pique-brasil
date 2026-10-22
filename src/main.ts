import './style.css';
import { bindInput } from './core/input';
import { startLoop } from './core/loop';
import { renderPortraits } from './render/portrait';
import { SceneRenderer } from './render/scene';
import { audio, type Sfx } from './services/audio';
import { initPortal, portalGameplay, portalLoadingFinished } from './services/portal';
import { fetchBoard, flushQueue, requestRunToken, submitRun, type RunResult } from './services/ranking';
import { loadSave, writeSave } from './services/save';
import { cleanName, makeTag, memberOf } from './shared/names';
import { Game } from './systems/game';
import type { Character, GameEvent } from './systems/types';
import { isMoney } from './systems/types';
import { language, setLanguage, t } from './ui/i18n';
import { runLoadingScreen } from './ui/loading';
import { Ui, type Screen } from './ui/ui';

const frame = document.getElementById('game')!;
const canvas = document.getElementById('view') as HTMLCanvasElement;
document.getElementById('rotate')!.textContent = t('rotate');
document.title = t('title');

const save = loadSave();
const renderer = new SceneRenderer(canvas);
const portalReady = initPortal();

let screen: Screen = 'menu';
let finished = false; // dinheiro e recorde da partida atual já foram salvos
let resumeTo: Screen = 'hud'; // tela para onde a pausa volta (HUD ou contagem do Continuar)
let backTo: Screen = 'menu'; // tela para onde ranking/configurações/apelido voltam
// Ranking: token assinado no início da partida e resultado aguardando envio.
let runToken: Promise<string | null> = Promise.resolve(null);
let pendingResult: { token: Promise<string | null>; result: RunResult } | null = null;
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
  giveUp: () => game.giveUp(),
  again: () => startRun(game.character),
  acceptSatire: () => {
    save.satireAccepted = true;
    writeSave(save);
    setScreen('menu');
  },
  openRanking: () => openOverlay('ranking'),
  openSettings: () => openOverlay('settings'),
  back: () => setScreen(backTo),
  loadBoard: (board) => fetchBoard(board, save.nickname ? memberOf(save.nickname, save.tag!) : null),
  askNickname: () => {
    ui.setNicknameValue(save.nickname ?? '');
    openOverlay('nickname');
  },
  saveNickname: (name) => {
    save.nickname = cleanName(name);
    save.tag ??= makeTag();
    save.nicknameAsked = true;
    writeSave(save);
    ui.applySettings(save);
    setScreen(backTo);
    void submitPending();
  },
  skipNickname: () => {
    save.nicknameAsked = true;
    writeSave(save);
    setScreen(backTo);
  },
  setLanguage: (lang) => {
    if (lang !== language) setLanguage(lang);
  },
  setVolume: (kind, value) => {
    save[kind] = value;
    writeSave(save);
    audio.setVolumes(save.musicVolume, save.sfxVolume, save.crowdVolume);
  },
  setFlag: (flag, on) => {
    save[flag] = on;
    writeSave(save);
    ui.applySettings(save);
  },
  touch: (a) => {
    if (screen === 'hud') game.input(a);
  },
  click: () => audio.play('click'),
});
ui.selectCharacter(save.character);
ui.applySettings(save);
audio.setVolumes(save.musicVolume, save.sfxVolume, save.crowdVolume);
try {
  ui.setPortraits(renderPortraits());
} catch {
  // Sem WebGL extra disponível: ficam os círculos de cor.
}

function setScreen(s: Screen) {
  screen = s;
  ui.show(s);
  if (s === 'menu') ui.setMenuStats(save.best, save.bank);
  portalGameplay(s === 'hud');
  if (s === 'pause') audio.suspend();
  else audio.resume();
}

function openOverlay(s: 'ranking' | 'settings' | 'nickname') {
  if (screen !== 'ranking' && screen !== 'settings' && screen !== 'nickname') backTo = screen;
  setScreen(s);
}

function startRun(character: Character) {
  save.character = character;
  writeSave(save);
  game = new Game({ character, bank: save.bank });
  finished = false;
  pendingResult = null;
  runToken = requestRunToken(character);
  void flushQueue();
  renderer.setCharacter(game);
  audio.startMusic();
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

/** Envia ao ranking o resultado da última partida (quando já há apelido). */
async function submitPending(): Promise<void> {
  if (!pendingResult || !save.nickname || !save.tag) return;
  const { token, result } = pendingResult;
  pendingResult = null;
  const tok = await token;
  if (!tok) return ui.setRankStatus({ status: 'rejected', error: 'token' });
  ui.setRankStatus('sending');
  ui.setRankStatus(await submitRun(tok, save.nickname, save.tag, result));
}

function gameOver() {
  const newBest = finishRun();
  ui.showResults(game, newBest);
  pendingResult = { token: runToken, result: { score: game.score, distance: game.distance, coins: game.collected } };
  setScreen('over');
  if (save.nickname) void submitPending();
  else if (!save.nicknameAsked && game.score > 0) {
    backTo = 'over';
    ui.setNicknameValue('');
    setScreen('nickname');
  }
}

const SFX: Partial<Record<GameEvent['type'], Sfx>> = {
  jump: 'jump',
  roll: 'roll',
  shieldUsed: 'shield',
  lungeWarning: 'cuca',
  vorcano: 'vorcano',
  martelada: 'gavel',
  caught: 'caught',
  continued: 'continue',
};

function handleEvent(e: GameEvent) {
  if (e.type === 'pickup') {
    if (isMoney(e.kind)) audio.play(e.kind);
    else {
      audio.play('power');
      ui.toast(t(e.kind));
    }
  } else if (e.type === 'stumble') {
    audio.play(e.kind === 'strong' ? 'stumbleStrong' : 'stumbleLight');
    if (navigator.vibrate && !save.reduceShake) navigator.vibrate(e.kind === 'strong' ? 80 : 30);
  } else {
    const sfx = SFX[e.type];
    if (sfx) audio.play(sfx);
    if (e.type === 'caught' && game.phase === 'continue') setScreen('continue');
    if (e.type === 'shieldUsed') ui.toast(t('habeasUsed'));
    if (e.type === 'vorcano') ui.toast(t('vorcano'));
    if (e.type === 'martelada') ui.toast(t('martelada'));
  }
}

bindInput(frame, {
  action: (a) => {
    if (screen === 'hud') game.input(a);
  },
  pause: () => (screen === 'pause' ? resume() : pause()),
});

// Navegadores só liberam o áudio depois de um gesto do usuário.
const unlockAudio = () => {
  audio.unlock();
  audio.startMusic();
};
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    audio.suspend();
  } else if (screen !== 'pause') audio.resume();
});

function resize() {
  renderer.resize(frame.clientWidth, frame.clientHeight);
  // Celular deitado: pausa (a mensagem "gire o celular" aparece via CSS).
  if (window.matchMedia('(orientation: landscape) and (pointer: coarse)').matches) pause();
}
window.addEventListener('resize', resize);
resize();

startLoop(
  (dt) => {
    if (screen !== 'hud' && screen !== 'continue') return;
    game.update(dt);
    for (const e of game.drainEvents()) handleEvent(e);
    if (game.phase === 'over') gameOver();
  },
  (frameDt) => {
    renderer.render(game, frameDt, frame.clientWidth, {
      reduceShake: save.reduceShake,
      reduceFlashes: save.reduceFlashes,
      active: screen === 'hud',
    });
    if (screen === 'hud' || screen === 'pause') ui.updateHud(game);
    if (screen === 'continue') ui.updateContinue(game);
    // A multidão fica mais alta (e a música mais intensa) quanto mais perto ela estiver.
    audio.setCrowd(screen === 'hud' ? 1 - game.chase / 45 : 0);
  },
);

setScreen(save.satireAccepted ? 'menu' : 'satire');
void flushQueue();

// Tela de carregamento (patrocínio, mínimo 4 s) por cima do menu até o jogo estar pronto.
void runLoadingScreen(language, portalReady).then(() => portalLoadingFinished());

// Acesso para testes automatizados (só no modo de desenvolvimento).
if (import.meta.env.DEV) {
  (window as unknown as { __pb: object }).__pb = {
    get game() {
      return game;
    },
    get screen() {
      return screen;
    },
    /** Posição do jogador na tela (0..1, esquerda→direita). */
    playerScreenX() {
      const p = game.player;
      return renderer.screenX(p.x, p.y + 1, p.z);
    },
  };
}
