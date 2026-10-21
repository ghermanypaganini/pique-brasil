// Textos do jogo. O dia 3 move isto para data/i18n/*.json; a interface já usa t() desde o início.

const pt = {
  title: 'Pique-Brasil',
  choose: 'Escolha seu personagem',
  play: 'Correr!',
  lule: 'Lule',
  bolsonero: 'Bolsonero',
  best: 'Recorde',
  bank: 'Saldo',
  paused: 'Pausado',
  resume: 'Continuar',
  quit: 'Sair',
  caught: 'A multidão te pegou!',
  continueFor: 'Continuar por',
  giveUp: 'Desistir',
  missing: 'Faltam',
  gameOver: 'Fim de jogo',
  score: 'Pontos',
  distance: 'Distância',
  money: 'Dinheiro',
  newBest: 'Novo recorde!',
  again: 'Correr de novo',
  menu: 'Menu',
  lungeWarning: 'A multidão vai avançar!',
  satireTitle: 'Aviso',
  satire:
    'Este jogo é uma obra de sátira e paródia, feita para humor. Os personagens são caricaturas fictícias e não têm vínculo com pessoas reais, partidos ou campanhas. Nenhum lado é apoiado ou atacado.',
  understood: 'Entendi',
  howTo: 'Deslize para os lados para trocar de faixa, para cima para pular e para baixo para rolar.',
  howToKeys: 'Setas ou WASD · Espaço pula · Esc pausa',
  rotate: 'Gire o celular para a posição vertical',
  reduceShake: 'Reduzir tremor de tela',
};

type Dict = typeof pt;

const en: Dict = {
  title: 'Run Brazil',
  choose: 'Choose your character',
  play: 'Run!',
  lule: 'Lule',
  bolsonero: 'Bolsonero',
  best: 'Best',
  bank: 'Balance',
  paused: 'Paused',
  resume: 'Resume',
  quit: 'Quit',
  caught: 'The crowd caught you!',
  continueFor: 'Continue for',
  giveUp: 'Give up',
  missing: 'Missing',
  gameOver: 'Game over',
  score: 'Score',
  distance: 'Distance',
  money: 'Money',
  newBest: 'New record!',
  again: 'Run again',
  menu: 'Menu',
  lungeWarning: 'The crowd is charging!',
  satireTitle: 'Notice',
  satire:
    'This game is a work of satire and parody, made for humor. The characters are fictional caricatures with no connection to real people, parties or campaigns. No side is endorsed or attacked.',
  understood: 'Got it',
  howTo: 'Swipe sideways to change lanes, up to jump and down to roll.',
  howToKeys: 'Arrows or WASD · Space jumps · Esc pauses',
  rotate: 'Rotate your phone to portrait',
  reduceShake: 'Reduce screen shake',
};

const lang: Dict = navigator.language?.toLowerCase().startsWith('pt') ? pt : en;

export const t = (key: keyof Dict): string => lang[key];
