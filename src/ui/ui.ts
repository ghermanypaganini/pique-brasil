import { BALANCE } from '../data/balance';
import { FEATURES } from '../services/config';
import type { Board, BoardData, SubmitOutcome } from '../services/ranking';
import type { Language, SaveData } from '../services/save';
import { checkName, NAME_MAX } from '../shared/names';
import type { Game } from '../systems/game';
import type { Action, Character } from '../systems/types';
import { language, t, type TextKey } from './i18n';

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

export type Volume = 'musicVolume' | 'sfxVolume' | 'crowdVolume';
export type Flag = 'reduceShake' | 'reduceFlashes' | 'touchButtons' | 'analytics';

export interface UiHandlers {
  start(character: Character): void;
  pause(): void;
  resume(): void;
  quit(): void;
  continueRun(): void;
  giveUp(): void;
  again(): void;
  acceptSatire(): void;
  openRanking(): void;
  openSettings(): void;
  back(): void; // fecha ranking/configurações/apelido e volta à tela anterior
  loadBoard(board: Board): Promise<BoardData | null>;
  saveNickname(name: string): void;
  skipNickname(): void;
  askNickname(): void;
  setLanguage(lang: Language): void;
  setVolume(kind: Volume, value: number): void;
  setFlag(flag: Flag, on: boolean): void;
  touch(action: Action): void;
  click(): void; // som de clique
}

export type Screen = 'menu' | 'hud' | 'pause' | 'continue' | 'over' | 'satire' | 'ranking' | 'settings' | 'nickname';

const BOARDS: { id: Board; label: () => string }[] = [
  { id: 'week', label: () => t('boardWeek') },
  { id: 'all', label: () => t('boardAll') },
  { id: 'lule', label: () => t('lule') },
  { id: 'bolsonero', label: () => t('bolsonero') },
];

export class Ui {
  private root: HTMLElement;
  private hud: Record<'score' | 'coins' | 'meter' | 'warn' | 'powers' | 'toast' | 'touch', HTMLElement>;
  private toastTimer = 0;
  private selected: Character = 'lule';
  private board: Board = 'week';
  private boardRequest = 0;

  constructor(root: HTMLElement, private h: UiHandlers) {
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
        <div class="menu-row">
          <button class="btn small" data-act="ranking">🏆 ${t('ranking')}</button>
          <button class="btn small" data-act="settings">⚙️ ${t('settings')}</button>
        </div>
        <p class="hint">${t('howTo')}<br><small>${t('howToKeys')}</small></p>
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
          <div class="power" data-p="cafe"><span class="pi">☕</span><span class="bar"><i></i></span></div>
          <div class="power" data-p="sandal"><span class="pi">🩴</span><span class="bar"><i></i></span></div>
          <div class="power" data-p="pix"><span class="pi">💸</span><span class="bar"><i></i></span></div>
          <div class="power" data-p="saci"><span class="pi">🌪️</span><span class="bar"><i></i></span></div>
        </div>
        <div class="toast" data-k="toast" role="status" aria-live="polite"></div>
        <div class="touch-pad" data-k="touch">
          <button data-touch="left" aria-label="${t('left')}">◀</button>
          <div class="touch-mid">
            <button data-touch="jump" aria-label="${t('jump')}">▲</button>
            <button data-touch="roll" aria-label="${t('roll')}">▼</button>
          </div>
          <button data-touch="right" aria-label="${t('right')}">▶</button>
        </div>
      </div>

      <div class="screen" data-screen="pause">
        <div class="card">
          <h2>${t('paused')}</h2>
          <button class="btn primary" data-act="resume">${t('resume')}</button>
          <button class="btn" data-act="settings">⚙️ ${t('settings')}</button>
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
          <p class="rank-status" data-k="rank-status"></p>
          <button class="btn primary" data-act="again">${t('again')}</button>
          <div class="menu-row">
            <button class="btn small" data-act="ranking">🏆 ${t('ranking')}</button>
            <button class="btn small" data-act="join">${t('joinRanking')}</button>
            <button class="btn small" data-act="menu">${t('menu')}</button>
          </div>
        </div>
      </div>

      <div class="screen" data-screen="ranking">
        <div class="card wide">
          <h2>🏆 ${t('ranking')}</h2>
          <div class="tabs" role="tablist">
            ${BOARDS.map((b) => `<button role="tab" data-board="${b.id}">${b.label()}</button>`).join('')}
          </div>
          <ol class="board" data-k="board"></ol>
          <p class="board-msg" data-k="board-msg"></p>
          <div class="me-row" data-k="me-row"></div>
          <div class="placar">
            <h3>${t('placar')}</h3>
            <div class="placar-bar"><span class="pl lule" data-k="pl-lule"></span><span class="pl bolsonero" data-k="pl-bolsonero"></span></div>
            <div class="placar-legend"><span>🔴 ${t('teamLule')} <b data-k="pl-lule-n"></b></span><span><b data-k="pl-bolsonero-n"></b> ${t('teamBolsonero')} 🟡</span></div>
            <p class="small-note">${t('placarNote')}</p>
          </div>
          <button class="btn" data-act="back">${t('close')}</button>
        </div>
      </div>

      <div class="screen" data-screen="nickname">
        <div class="card">
          <h2>${t('nickTitle')}</h2>
          <input class="nick-input" data-k="nick" maxlength="${NAME_MAX}" autocomplete="off" autocapitalize="words" spellcheck="false" />
          <p class="small-note">${t('nickHint')}</p>
          <p class="error" data-k="nick-err" role="alert"></p>
          <button class="btn primary" data-act="nick-save">${t('save')}</button>
          <button class="btn" data-act="nick-skip">${t('skip')}</button>
          <p class="small-note">${t('nickPrivacy')}</p>
        </div>
      </div>

      <div class="screen" data-screen="settings">
        <div class="card wide">
          <h2>⚙️ ${t('settings')}</h2>
          <label class="field">${t('language')}
            <select data-k="lang">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English</option>
            </select>
          </label>
          <label class="field">🎵 ${t('music')} <input type="range" min="0" max="100" data-vol="musicVolume" /></label>
          <label class="field">🔊 ${t('effects')} <input type="range" min="0" max="100" data-vol="sfxVolume" /></label>
          <label class="field">📣 ${t('crowdVolume')} <input type="range" min="0" max="100" data-vol="crowdVolume" /></label>
          <label class="toggle dark"><input type="checkbox" data-flag="reduceShake" /> ${t('reduceShake')}</label>
          <label class="toggle dark"><input type="checkbox" data-flag="reduceFlashes" /> ${t('reduceFlashes')}</label>
          <label class="toggle dark"><input type="checkbox" data-flag="touchButtons" /> ${t('touchButtons')}</label>
          ${FEATURES.analytics ? `<label class="toggle dark"><input type="checkbox" data-flag="analytics" /> ${t('analytics')}</label><p class="small-note">${t('analyticsNote')}</p>` : ''}
          <div class="field">${t('nickname')}: <b data-k="nick-current"></b> <button class="btn tiny" data-act="nick-change">${t('change')}</button></div>
          <details class="about"><summary>${t('about')}</summary><p>${t('satire')}</p></details>
          <button class="btn primary" data-act="back">${t('close')}</button>
        </div>
      </div>`;

    this.hud = {
      score: $('[data-k="score"]', root),
      coins: $('[data-k="coins"]', root),
      meter: $('[data-k="meter"]', root),
      warn: $('[data-k="warn"]', root),
      powers: $('[data-k="powers"]', root),
      toast: $('[data-k="toast"]', root),
      touch: $('[data-k="touch"]', root),
    };

    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-char],[data-board]');
      if (!el) return;
      h.click();
      if (el.dataset.char) return this.selectCharacter(el.dataset.char as Character);
      if (el.dataset.board) return void this.showBoard(el.dataset.board as Board);
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
        case 'ranking': return h.openRanking();
        case 'settings': return h.openSettings();
        case 'back': return h.back();
        case 'join':
        case 'nick-change': return h.askNickname();
        case 'nick-save': return this.trySaveNickname();
        case 'nick-skip': return h.skipNickname();
      }
    });

    const nick = $<HTMLInputElement>('[data-k="nick"]', root);
    nick.addEventListener('keydown', (e) => {
      e.stopPropagation(); // não deixa as setas/WASD virarem comandos do jogo
      if (e.key === 'Enter') this.trySaveNickname();
    });

    $<HTMLSelectElement>('[data-k="lang"]', root).addEventListener('change', (e) =>
      h.setLanguage((e.target as HTMLSelectElement).value as Language),
    );
    root.querySelectorAll<HTMLInputElement>('[data-vol]').forEach((el) =>
      el.addEventListener('input', () => h.setVolume(el.dataset.vol as Volume, Number(el.value) / 100)),
    );
    root.querySelectorAll<HTMLInputElement>('[data-flag]').forEach((el) =>
      el.addEventListener('change', () => h.setFlag(el.dataset.flag as Flag, el.checked)),
    );

    // Botões na tela: disparam no toque (sem esperar o clique) e não viram swipe.
    root.querySelectorAll<HTMLButtonElement>('[data-touch]').forEach((b) =>
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        h.touch(b.dataset.touch as Action);
      }),
    );
    for (const el of [$('[data-act="pause"]', root), this.hud.touch]) el.addEventListener('pointerdown', (e) => e.stopPropagation());
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

  /** Preenche a tela de configurações com os valores salvos. */
  applySettings(save: SaveData): void {
    $<HTMLSelectElement>('[data-k="lang"]', this.root).value = language;
    for (const v of ['musicVolume', 'sfxVolume', 'crowdVolume'] as Volume[]) {
      $<HTMLInputElement>(`[data-vol="${v}"]`, this.root).value = String(Math.round(save[v] * 100));
    }
    for (const f of ['reduceShake', 'reduceFlashes', 'touchButtons', 'analytics'] as Flag[]) {
      const box = this.root.querySelector<HTMLInputElement>(`[data-flag="${f}"]`);
      if (box) box.checked = save[f];
    }
    $('[data-k="nick-current"]', this.root).textContent = save.nickname ? `${save.nickname}#${save.tag}` : t('none');
    this.hud.touch.classList.toggle('on', save.touchButtons);
    document.body.classList.toggle('reduce-flashes', save.reduceFlashes);
    this.root.querySelectorAll<HTMLElement>('[data-act="join"]').forEach((b) => (b.style.display = save.nickname ? 'none' : ''));
  }

  show(screen: Screen): void {
    this.root.querySelectorAll<HTMLElement>('.screen').forEach((s) => {
      const name = s.dataset.screen as Screen;
      // O HUD continua visível atrás das telas de pausa e continuar.
      const visible = name === screen || (name === 'hud' && (screen === 'pause' || screen === 'continue'));
      s.classList.toggle('visible', visible);
    });
    if (screen === 'nickname') {
      const input = $<HTMLInputElement>('[data-k="nick"]', this.root);
      $('[data-k="nick-err"]', this.root).textContent = '';
      setTimeout(() => input.focus(), 50);
    }
    if (screen === 'ranking') void this.showBoard(this.board);
  }

  setNicknameValue(value: string): void {
    $<HTMLInputElement>('[data-k="nick"]', this.root).value = value;
  }

  private trySaveNickname(): void {
    const value = $<HTMLInputElement>('[data-k="nick"]', this.root).value;
    const problem = checkName(value);
    if (problem) {
      $('[data-k="nick-err"]', this.root).textContent = t(`nickErr_${problem}` as TextKey);
      return;
    }
    this.h.saveNickname(value);
  }

  setMenuStats(best: number, bank: number): void {
    $('[data-k="best"]', this.root).textContent = `${t('best')}: ${best}`;
    $('[data-k="bank"]', this.root).textContent = `${t('bank')}: 🪙 ${bank}`;
  }

  // ── Ranking ─────────────────────────────────────────────────────

  private async showBoard(board: Board): Promise<void> {
    this.board = board;
    this.root.querySelectorAll<HTMLElement>('[data-board]').forEach((b) => {
      b.classList.toggle('active', b.dataset.board === board);
      b.setAttribute('aria-selected', String(b.dataset.board === board));
    });
    const list = $('[data-k="board"]', this.root);
    const msg = $('[data-k="board-msg"]', this.root);
    const meRow = $('[data-k="me-row"]', this.root);
    list.replaceChildren();
    meRow.replaceChildren();
    msg.textContent = t('rankingLoading');
    const req = ++this.boardRequest;
    const data = await this.h.loadBoard(board);
    if (req !== this.boardRequest) return; // o jogador trocou de aba no meio
    if (!data) {
      msg.textContent = t('rankingOffline');
      this.renderPlacar(null);
      return;
    }
    msg.textContent = data.top.length ? '' : t('rankingEmpty');
    const mine = data.me ? `${data.me.name}#${data.me.tag}` : null;
    for (const e of data.top) {
      const li = document.createElement('li');
      if (mine === `${e.name}#${e.tag}`) li.classList.add('mine');
      li.append(span('pos', `${e.rank}`), span('name', e.name), span('tag', `#${e.tag}`), span('pts', e.score.toLocaleString(language)));
      list.append(li);
    }
    // Posição do jogador sempre visível, mesmo fora do top 100.
    if (data.me && data.me.rank > data.top.length) {
      meRow.append(span('pos', `${data.me.rank}`), span('name', `${t('you')}: ${data.me.name}`), span('pts', data.me.score.toLocaleString(language)));
    }
    this.renderPlacar(data.placar);
  }

  private renderPlacar(placar: Record<Character, number> | null): void {
    const l = placar?.lule ?? 0;
    const b = placar?.bolsonero ?? 0;
    const total = l + b;
    const pl = total ? (l / total) * 100 : 50;
    $('[data-k="pl-lule"]', this.root).style.width = `${pl}%`;
    $('[data-k="pl-bolsonero"]', this.root).style.width = `${100 - pl}%`;
    const km = (m: number) => `${(m / 1000).toLocaleString(language, { maximumFractionDigits: 1 })} km`;
    $('[data-k="pl-lule-n"]', this.root).textContent = km(l);
    $('[data-k="pl-bolsonero-n"]', this.root).textContent = km(b);
  }

  // ── HUD ────────────────────────────────────────────────────────

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
    for (const k of ['saci', 'cafe', 'sandal', 'pix'] as const) this.setPower(k, pw[k] > 0, pw[k] / BAL[k].duration);
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
    $('[data-k="missing"]', this.root).textContent = game.canAffordContinue ? '' : `${t('missing')} 🪙 ${cost - game.wallet}`;
  }

  showResults(game: Game, newBest: boolean): void {
    $('[data-k="r-score"]', this.root).textContent = String(game.score);
    $('[data-k="r-dist"]', this.root).textContent = `${Math.floor(game.distance)} m`;
    $('[data-k="r-money"]', this.root).textContent = `🪙 ${game.collected}`;
    $('[data-k="newbest"]', this.root).style.display = newBest ? '' : 'none';
    this.setRankStatus(null);
  }

  /** Linha de status do envio ao ranking na tela de fim de jogo. */
  setRankStatus(outcome: SubmitOutcome | 'sending' | null): void {
    const el = $('[data-k="rank-status"]', this.root);
    if (!outcome) el.textContent = '';
    else if (outcome === 'sending') el.textContent = t('sending');
    else if (outcome.status === 'queued') el.textContent = t('queued');
    else if (outcome.status === 'rejected') el.textContent = t('rejected');
    else {
      const parts = [];
      if (outcome.ranks.week) parts.push(t('rankWeekPos', { n: outcome.ranks.week }));
      if (outcome.ranks.all) parts.push(t('rankAllPos', { n: outcome.ranks.all }));
      el.textContent = `🏆 ${parts.join(' · ')}`;
    }
  }
}

function span(cls: string, text: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text; // texto puro: apelidos vêm de outros jogadores
  return s;
}
