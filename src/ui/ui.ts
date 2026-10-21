import { BALANCE } from '../data/balance';
import type { Game } from '../systems/game';
import type { Character } from '../systems/types';
import { t } from './i18n';

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

export interface UiHandlers {
  start(character: Character): void;
  pause(): void;
  resume(): void;
  quit(): void;
  continueRun(): void;
  giveUp(): void;
  again(): void;
  acceptSatire(): void;
  toggleShake(on: boolean): void;
}

export type Screen = 'menu' | 'hud' | 'pause' | 'continue' | 'over' | 'satire';

export class Ui {
  private root: HTMLElement;
  private hud: Record<'score' | 'coins' | 'meter' | 'warn' | 'powers' | 'toast', HTMLElement>;
  private toastTimer = 0;
  private selected: Character = 'lule';

  constructor(root: HTMLElement, h: UiHandlers) {
    this.root = root;
    root.innerHTML = `
      <div class="screen" data-screen="satire">
        <div class="card">
          <h2>${t('satireTitle')}</h2>
          <p>${t('satire')}</p>
          <button class="btn primary" data-act="satire-ok">${t('understood')}</button>
        </div>
      </div>

      <div class="screen" data-screen="menu">
        <h1 class="logo">${t('title')}</h1>
        <p class="sub">${t('choose')}</p>
        <div class="chars">
          <button class="char lule" data-char="lule"><span class="swatch"></span>${t('lule')}</button>
          <button class="char bolsonero" data-char="bolsonero"><span class="swatch"></span>${t('bolsonero')}</button>
        </div>
        <button class="btn primary big" data-act="play">${t('play')}</button>
        <p class="stats"><span data-k="best"></span> · <span data-k="bank"></span></p>
        <p class="hint">${t('howTo')}<br><small>${t('howToKeys')}</small></p>
        <label class="toggle"><input type="checkbox" data-act="shake"> ${t('reduceShake')}</label>
      </div>

      <div class="screen hud" data-screen="hud">
        <div class="hud-top">
          <div class="hud-left"><div class="score" data-k="score">0</div><div class="coins">🪙 <span data-k="coins">0</span></div></div>
          <button class="pause-btn" data-act="pause" aria-label="${t('paused')}">❚❚</button>
        </div>
        <div class="meter" aria-hidden="true"><div class="meter-fill" data-k="meter"></div><span class="meter-crowd">📣</span><span class="meter-runner">🏃</span></div>
        <div class="warn" data-k="warn">${t('lungeWarning')}</div>
        <div class="powers" data-k="powers">
          <div class="power" data-p="immunity"><span class="pi">🚘</span><span class="bar"><i></i></span></div>
          <div class="power" data-p="habeas"><span class="pi">📜</span></div>
          <div class="power" data-p="saci"><span class="pi">🌪️</span><span class="bar"><i></i></span></div>
        </div>
        <div class="toast" data-k="toast"></div>
      </div>

      <div class="screen" data-screen="pause">
        <div class="card">
          <h2>${t('paused')}</h2>
          <button class="btn primary" data-act="resume">${t('resume')}</button>
          <button class="btn" data-act="quit">${t('quit')}</button>
        </div>
      </div>

      <div class="screen" data-screen="continue">
        <div class="card">
          <h2>${t('caught')}</h2>
          <div class="countdown" data-k="countdown">5</div>
          <button class="btn primary" data-act="continue"></button>
          <p class="missing" data-k="missing"></p>
          <button class="btn" data-act="giveup">${t('giveUp')}</button>
        </div>
      </div>

      <div class="screen" data-screen="over">
        <div class="card">
          <h2>${t('gameOver')}</h2>
          <p class="newbest" data-k="newbest">${t('newBest')}</p>
          <dl class="results">
            <dt>${t('score')}</dt><dd data-k="r-score"></dd>
            <dt>${t('distance')}</dt><dd data-k="r-dist"></dd>
            <dt>${t('money')}</dt><dd data-k="r-money"></dd>
          </dl>
          <button class="btn primary" data-act="again">${t('again')}</button>
          <button class="btn" data-act="menu">${t('menu')}</button>
        </div>
      </div>`;

    this.hud = {
      score: $('[data-k="score"]', root),
      coins: $('[data-k="coins"]', root),
      meter: $('[data-k="meter"]', root),
      warn: $('[data-k="warn"]', root),
      powers: $('[data-k="powers"]', root),
      toast: $('[data-k="toast"]', root),
    };

    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-char]');
      if (!el) return;
      if (el.dataset.char) {
        this.selectCharacter(el.dataset.char as Character);
        return;
      }
      switch (el.dataset.act) {
        case 'satire-ok': return h.acceptSatire();
        case 'play': return h.start(this.selected);
        case 'pause': return h.pause();
        case 'resume': return h.resume();
        case 'quit': return h.quit();
        case 'continue': return h.continueRun();
        case 'giveup': return h.giveUp();
        case 'again': return h.again();
        case 'menu': return h.quit();
      }
    });
    $<HTMLInputElement>('[data-act="shake"]', root).addEventListener('change', (e) =>
      h.toggleShake((e.target as HTMLInputElement).checked),
    );
    // Toques no HUD não devem virar swipe nos botões, e vice-versa.
    $('[data-act="pause"]', root).addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  selectCharacter(c: Character): void {
    this.selected = c;
    this.root.querySelectorAll<HTMLElement>('[data-char]').forEach((b) => b.classList.toggle('selected', b.dataset.char === c));
  }

  /** Troca os círculos de cor pelos retratos 3D (data URLs). */
  setPortraits(images: Record<Character, string>): void {
    for (const c of ['lule', 'bolsonero'] as Character[]) {
      const sw = this.root.querySelector<HTMLElement>(`[data-char="${c}"] .swatch`)!;
      sw.style.backgroundImage = `url(${images[c]})`;
      sw.classList.add('portrait');
    }
  }

  setShake(on: boolean): void {
    $<HTMLInputElement>('[data-act="shake"]', this.root).checked = on;
  }

  show(screen: Screen): void {
    this.root.querySelectorAll<HTMLElement>('.screen').forEach((s) => {
      const name = s.dataset.screen as Screen;
      // O HUD continua visível atrás das telas de pausa e continuar.
      const visible = name === screen || (name === 'hud' && (screen === 'pause' || screen === 'continue'));
      s.classList.toggle('visible', visible);
    });
  }

  setMenuStats(best: number, bank: number): void {
    $('[data-k="best"]', this.root).textContent = `${t('best')}: ${best}`;
    $('[data-k="bank"]', this.root).textContent = `${t('bank')}: 🪙 ${bank}`;
  }

  updateHud(game: Game): void {
    this.hud.score.textContent = String(game.score);
    this.hud.coins.textContent = String(game.coins);
    const pct = Math.max(0, Math.min(100, game.chase));
    this.hud.meter.style.width = `${100 - pct}%`;
    this.hud.meter.classList.toggle('danger', pct < 25);
    this.hud.warn.classList.toggle('visible', game.lungeWarning > 0 || game.lungeActive > 0);
    const pw = game.player.powers;
    const BAL = BALANCE.powerups;
    this.setPower('immunity', pw.immunity > 0, pw.immunity / BAL.immunity.duration);
    this.setPower('habeas', pw.habeas, 1);
    this.setPower('saci', pw.saci > 0, pw.saci / BAL.saci.duration);
  }

  private setPower(name: string, on: boolean, fraction: number): void {
    const el = this.hud.powers.querySelector<HTMLElement>(`[data-p="${name}"]`)!;
    el.classList.toggle('on', on);
    const bar = el.querySelector<HTMLElement>('i');
    if (bar) bar.style.width = `${Math.round(fraction * 100)}%`;
  }

  /** Aviso rápido no meio da tela (power-up pego, evento). */
  toast(text: string): void {
    const el = this.hud.toast;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth; // reinicia a animação
    el.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 1600);
  }

  updateContinue(game: Game): void {
    $('[data-k="countdown"]', this.root).textContent = String(Math.ceil(game.continueTimer));
    const cost = game.continueCost ?? 0;
    const btn = $<HTMLButtonElement>('[data-act="continue"]', this.root);
    btn.textContent = `${t('continueFor')} 🪙 ${cost}`;
    btn.disabled = !game.canAffordContinue;
    $('[data-k="missing"]', this.root).textContent = game.canAffordContinue
      ? ''
      : `${t('missing')} 🪙 ${cost - game.wallet}`;
  }

  showResults(game: Game, newBest: boolean): void {
    $('[data-k="r-score"]', this.root).textContent = String(game.score);
    $('[data-k="r-dist"]', this.root).textContent = `${Math.floor(game.distance)} m`;
    $('[data-k="r-money"]', this.root).textContent = `🪙 ${game.collected}`;
    $('[data-k="newbest"]', this.root).style.display = newBest ? '' : 'none';
  }
}

