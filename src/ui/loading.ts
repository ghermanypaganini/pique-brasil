import { FEATURES } from '../services/config';
import { trackSponsor } from '../services/ranking';
import type { Language } from '../services/save';
import { activeSponsors, loadSponsorConfig, pickSponsors, sponsorLink, validContact, type Sponsor } from '../services/sponsors';
import { t } from './i18n';

// Tela de carregamento com patrocínio (PRD 10.1): visível por no mínimo 4 s desde a abertura,
// com a etiqueta "Patrocínio" (transparência, CONAR). Sem patrocinador ativo: card "ANUNCIE AQUI".

export const MIN_LOADING_MS = 4000;
const ROTATE_MS = 2000;

function sponsorCard(s: Sponsor): HTMLElement {
  const a = document.createElement('a');
  a.className = 'sp-card';
  a.href = sponsorLink(s);
  a.target = '_blank';
  a.rel = 'noopener sponsored';
  const label = document.createElement('span');
  label.className = 'sp-label';
  label.textContent = t('sponsorLabel');
  const img = document.createElement('img');
  img.src = s.image;
  img.alt = s.name;
  img.decoding = 'async';
  a.append(label, img);
  a.addEventListener('click', () => trackSponsor(s.id, 'click'));
  return a;
}

function advertiseCard(contact: string | null): HTMLElement {
  const div = document.createElement('div');
  div.className = 'sp-card sp-ad';
  const title = document.createElement('strong');
  title.textContent = t('adHere');
  const sub = document.createElement('span');
  sub.textContent = t('adHereSub');
  div.append(title, sub);
  if (contact) {
    const a = document.createElement('a');
    a.className = 'btn primary';
    a.href = `mailto:${contact}?subject=${encodeURIComponent('Anunciar no Pique-Brasil')}`;
    a.textContent = `✉️ ${t('adContact')}`;
    div.append(a);
  }
  return div;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

/**
 * Mostra a tela de carregamento até o jogo estar pronto E o tempo mínimo ter passado.
 * Retorna em quantos ms o jogo ficou pronto para jogar, sem contar o mínimo (métricas).
 */
export async function runLoadingScreen(lang: Language, ready: Promise<void>): Promise<number> {
  let readyAt = 0;
  const gameReady = ready.then(() => {
    readyAt = performance.now();
  });
  const el = document.getElementById('loading');
  if (!el) {
    await gameReady;
    return Math.round(readyAt);
  }
  const spot = el.querySelector<HTMLElement>('.ld-spot')!;
  el.querySelector<HTMLElement>('.ld-text')!.textContent = t('loading');
  el.querySelector<HTMLElement>('.ld-logo')!.textContent = t('title');

  let rotate: number | undefined;
  if (FEATURES.sponsors) {
    const cfg = await loadSponsorConfig();
    const sponsorsAt = performance.now();
    const chosen = pickSponsors(activeSponsors(cfg, lang), 2);
    const cards = chosen.length ? chosen.map(sponsorCard) : [advertiseCard(validContact(cfg.contact))];
    const shown = new Set<string>();
    const show = (i: number) => {
      spot.replaceChildren(cards[i]);
      const s = chosen[i];
      if (s && !shown.has(s.id)) {
        shown.add(s.id);
        trackSponsor(s.id, 'impression');
      }
    };
    show(0);
    if (cards.length > 1) {
      let i = 0;
      rotate = window.setInterval(() => show((i = (i + 1) % cards.length)), ROTATE_MS);
    }
    // O mínimo conta desde a abertura da página (performance.now() começa na navegação).
    await Promise.all([gameReady, wait(MIN_LOADING_MS - performance.now())]);
    readyAt = Math.max(readyAt, sponsorsAt);
  } else {
    await gameReady;
  }

  window.clearInterval(rotate);
  el.classList.add('done');
  setTimeout(() => el.remove(), 400);
  return Math.round(readyAt);
}
