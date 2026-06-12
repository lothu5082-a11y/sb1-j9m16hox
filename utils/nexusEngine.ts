// NEXUS BREACH — Cyberpunk Card Roguelike Engine

export type CardType = 'attack' | 'defense' | 'hack';
export type CardRarity = 'common' | 'uncommon' | 'rare';
export type GamePhase = 'menu' | 'combat' | 'reward' | 'victory' | 'game_over';
export type IntentType = 'attack' | 'multi_attack' | 'block' | 'charge' | 'debuff';

export interface Card {
  uid: string;
  id: string;
  name: string;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  damage?: number;
  hits?: number;
  block?: number;
  draw?: number;
  gainEnergy?: number;
  dotDamage?: number;
  dotTurns?: number;
  thorns?: number;
  applyWeak?: boolean;
  mirror?: boolean;
  conditionalDamage?: number;
  desc: string;
}

export interface Intent {
  type: IntentType;
  value?: number;
  hits?: number;
  dotDamage?: number;
  dotTurns?: number;
}

export interface PlayerStatus {
  weakTurns: number;
  thorns: number;
  virusDamage: number;
  virusTurns: number;
}

export interface EnemyStatus {
  weakTurns: number;
  virusDamage: number;
  virusTurns: number;
}

export interface Player {
  maxHp: number;
  currentHp: number;
  block: number;
  energy: number;
  maxEnergy: number;
  status: PlayerStatus;
}

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  block: number;
  status: EnemyStatus;
  intents: Intent[];
  intentIndex: number;
}

export interface GameState {
  phase: GamePhase;
  player: Player;
  enemy: Enemy | null;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  floor: number;
  log: string[];
  isEnemyTurn: boolean;
  rewardChoices: Card[];
  score: number;
  mirrorActive: boolean;
}

// ─── UID generation ───────────────────────────────────────────────────────────

let _uid = 0;
function uid(): string {
  return `c${++_uid}_${Math.random().toString(36).slice(2, 5)}`;
}

// ─── Card templates ───────────────────────────────────────────────────────────

type CardTemplate = Omit<Card, 'uid'>;

const T: Record<string, CardTemplate> = {
  // COMMON
  strike:        { id: 'strike',        name: 'STRIKE',         type: 'attack',  rarity: 'common',   cost: 1, damage: 6,                          desc: 'Deal 6 damage' },
  defend:        { id: 'defend',        name: 'DEFEND',         type: 'defense', rarity: 'common',   cost: 1,              block: 5,               desc: 'Gain 5 block' },
  slash:         { id: 'slash',         name: 'SLASH',          type: 'attack',  rarity: 'common',   cost: 1, damage: 7,                          desc: 'Deal 7 damage' },
  bulwark:       { id: 'bulwark',       name: 'BULWARK',        type: 'defense', rarity: 'common',   cost: 2,              block: 14,              desc: 'Gain 14 block' },
  quick_hack:    { id: 'quick_hack',    name: 'QUICK HACK',     type: 'hack',    rarity: 'common',   cost: 1, applyWeak: true,                    desc: 'Apply WEAK (50% dmg) for 2 turns' },
  // UNCOMMON
  heavy_strike:  { id: 'heavy_strike',  name: 'HEAVY STRIKE',   type: 'attack',  rarity: 'uncommon', cost: 2, damage: 14,                         desc: 'Deal 14 damage' },
  dual_strike:   { id: 'dual_strike',   name: 'DUAL STRIKE',    type: 'attack',  rarity: 'uncommon', cost: 1, damage: 4, hits: 2,                 desc: 'Deal 4×2 damage' },
  firewall:      { id: 'firewall',      name: 'FIREWALL',       type: 'defense', rarity: 'uncommon', cost: 1,              block: 4,  thorns: 3,   desc: 'Gain 4 block + 3 thorns' },
  dodge:         { id: 'dodge',         name: 'DODGE',          type: 'defense', rarity: 'uncommon', cost: 1,              block: 9,               desc: 'Gain 9 block' },
  virus_inject:  { id: 'virus_inject',  name: 'VIRUS INJECT',   type: 'hack',    rarity: 'uncommon', cost: 2, dotDamage: 4, dotTurns: 3,          desc: 'Apply VIRUS: 4 dmg/turn for 3 turns' },
  overclock:     { id: 'overclock',     name: 'OVERCLOCK',      type: 'hack',    rarity: 'uncommon', cost: 1, draw: 2,                            desc: 'Draw 2 cards' },
  crit_scan:     { id: 'crit_scan',     name: 'CRIT SCAN',      type: 'attack',  rarity: 'uncommon', cost: 1, damage: 9, conditionalDamage: 14,   desc: 'Deal 9 dmg (14 if enemy WEAK)' },
  mirror_hack:   { id: 'mirror_hack',   name: 'MIRROR HACK',    type: 'hack',    rarity: 'uncommon', cost: 1, mirror: true,                       desc: 'Next attack deals double damage' },
  // RARE
  overload:      { id: 'overload',      name: 'OVERLOAD',       type: 'attack',  rarity: 'rare',     cost: 3, damage: 22,                         desc: 'Deal 22 damage' },
  rapid_fire:    { id: 'rapid_fire',    name: 'RAPID FIRE',     type: 'attack',  rarity: 'rare',     cost: 2, damage: 3, hits: 4,                 desc: 'Deal 3×4 damage' },
  reactor_shield:{ id: 'reactor_shield',name: 'REACTOR SHIELD', type: 'defense', rarity: 'rare',     cost: 2,              block: 15,              desc: 'Gain 15 block' },
  jailbreak:     { id: 'jailbreak',     name: 'JAILBREAK',      type: 'hack',    rarity: 'rare',     cost: 0, gainEnergy: 2,                      desc: 'Gain 2 energy' },
  data_siphon:   { id: 'data_siphon',   name: 'DATA SIPHON',    type: 'hack',    rarity: 'rare',     cost: 1, draw: 3,                            desc: 'Draw 3 cards' },
};

function card(id: string): Card {
  return { ...T[id], uid: uid() };
}

// ─── Enemy definitions ────────────────────────────────────────────────────────

type EnemyDef = Omit<Enemy, 'currentHp' | 'block' | 'status' | 'intentIndex'>;

const ENEMIES: EnemyDef[] = [
  {
    id: 'scout_drone', name: 'SCOUT DRONE', maxHp: 30,
    intents: [
      { type: 'attack', value: 5 },
      { type: 'attack', value: 5 },
      { type: 'block',  value: 4 },
    ],
  },
  {
    id: 'net_spider', name: 'NET SPIDER', maxHp: 38,
    intents: [
      { type: 'attack', value: 4 },
      { type: 'debuff' },
      { type: 'attack', value: 4 },
      { type: 'attack', value: 8 },
    ],
  },
  {
    id: 'security_bot', name: 'SECURITY BOT', maxHp: 50,
    intents: [
      { type: 'attack', value: 8 },
      { type: 'block',  value: 8 },
      { type: 'attack', value: 8 },
      { type: 'attack', value: 13 },
    ],
  },
  {
    id: 'cyber_hound', name: 'CYBER HOUND', maxHp: 60,
    intents: [
      { type: 'attack', value: 10 },
      { type: 'attack', value: 10 },
      { type: 'charge' },
      { type: 'attack', value: 24 },
    ],
  },
  {
    id: 'elite_guard', name: 'ELITE GUARD', maxHp: 72,
    intents: [
      { type: 'attack',       value: 12 },
      { type: 'block',        value: 10 },
      { type: 'multi_attack', value: 7, hits: 2 },
      { type: 'attack',       value: 17 },
    ],
  },
  // BOSS — floor 6
  {
    id: 'nexus_core', name: 'NEXUS CORE', maxHp: 170,
    intents: [
      { type: 'attack',       value: 10 },
      { type: 'block',        value: 15 },
      { type: 'debuff' },
      { type: 'charge' },
      { type: 'attack',       value: 40 },
      { type: 'multi_attack', value: 9, hits: 3 },
    ],
  },
];

// ─── Public helpers ───────────────────────────────────────────────────────────

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getIntentLabel(intent: Intent): string {
  switch (intent.type) {
    case 'attack':       return `⚔ ${intent.value} DMG`;
    case 'multi_attack': return `⚔ ${intent.value}×${intent.hits} DMG`;
    case 'block':        return `🛡 ${intent.value} BLOCK`;
    case 'charge':       return `⚡ CHARGING…`;
    case 'debuff':       return `☠ CORRUPTING`;
  }
}

export function getCurrentIntent(enemy: Enemy): Intent {
  return enemy.intents[enemy.intentIndex % enemy.intents.length];
}

export function createStartingDeck(): Card[] {
  return shuffleArray([
    card('strike'), card('strike'), card('strike'), card('strike'),
    card('defend'), card('defend'), card('defend'), card('defend'),
    card('quick_hack'),
    card('overclock'),
  ]);
}

export function getEnemyForFloor(floor: number): Enemy {
  const def = ENEMIES[Math.min(floor - 1, ENEMIES.length - 1)];
  return {
    ...def,
    currentHp: def.maxHp,
    block: 0,
    status: { weakTurns: 0, virusDamage: 0, virusTurns: 0 },
    intentIndex: 0,
  };
}

export function getRewardChoices(): Card[] {
  const pool = Object.values(T)
    .filter(t => t.id !== 'strike' && t.id !== 'defend');
  return shuffleArray(pool).slice(0, 3).map(t => ({ ...t, uid: uid() }));
}

// ─── Draw helper ──────────────────────────────────────────────────────────────

interface DrawResult {
  deck: Card[];
  discard: Card[];
  hand: Card[];
  drawn: number;
}

export function drawCards(
  deck: Card[],
  discard: Card[],
  hand: Card[],
  count: number,
): DrawResult {
  let d = [...deck];
  let disc = [...discard];
  const h = [...hand];
  let drawn = 0;

  for (let i = 0; i < count; i++) {
    if (d.length === 0) {
      if (disc.length === 0) break;
      d = shuffleArray(disc);
      disc = [];
    }
    h.push(d.shift()!);
    drawn++;
  }
  return { deck: d, discard: disc, hand: h, drawn };
}

// ─── Damage calculation ───────────────────────────────────────────────────────

function calcCardDamage(c: Card, enemy: Enemy, mirror: boolean): number {
  const base = c.conditionalDamage && enemy.status.weakTurns > 0
    ? c.conditionalDamage
    : (c.damage ?? 0);
  const multiplier = mirror ? 2 : 1;
  return base * multiplier;
}

function applyDamageToEnemy(enemy: Enemy, dmg: number): Enemy {
  const blocked = Math.min(enemy.block, dmg);
  return {
    ...enemy,
    block: enemy.block - blocked,
    currentHp: Math.max(0, enemy.currentHp - (dmg - blocked)),
  };
}

function applyDamageToPlayer(player: Player, dmg: number): Player {
  if (dmg <= 0) return player;
  const weakened = player.status.weakTurns > 0 ? 0 : 0; // player isn't weakened in this design
  const net = Math.max(0, dmg - player.block);
  return {
    ...player,
    block: Math.max(0, player.block - dmg),
    currentHp: Math.max(0, player.currentHp - net),
  };
}

function addLog(log: string[], msg: string): string[] {
  return [...log.slice(-8), msg]; // keep last 9 entries
}

// ─── Card application ─────────────────────────────────────────────────────────

export function applyCard(state: GameState, cardUid: string): GameState {
  const c = state.hand.find(h => h.uid === cardUid);
  if (!c) return state;
  if (c.cost > state.player.energy) return state;
  if (!state.enemy) return state;

  let { player, enemy, hand, discard, deck, log, mirrorActive, score } = state;

  // Remove from hand, add to discard
  hand = hand.filter(h => h.uid !== cardUid);
  discard = [...discard, c];
  player = { ...player, energy: player.energy - c.cost };

  // --- Attack cards ---
  if (c.type === 'attack' && c.damage !== undefined) {
    const hits = c.hits ?? 1;
    const dmgPerHit = calcCardDamage(c, enemy, mirrorActive);
    for (let i = 0; i < hits; i++) {
      enemy = applyDamageToEnemy(enemy, dmgPerHit);
      // Thorns reflect
      if (player.status.thorns > 0) {
        // thorns don't apply to enemy attacking here — this is player attacking enemy
        // actually thorns are player's — when enemy attacks player, reflect. skip here.
      }
    }
    const totalDmg = dmgPerHit * hits;
    const hitStr = hits > 1 ? `${dmgPerHit}×${hits}` : `${totalDmg}`;
    log = addLog(log, mirrorActive ? `MIRROR: dealt ${totalDmg} (×2)` : `Dealt ${hitStr} damage`);
    mirrorActive = false;
    score += totalDmg;
  }

  // --- Defense cards ---
  if (c.type === 'defense' && c.block !== undefined) {
    player = { ...player, block: player.block + c.block };
    log = addLog(log, `Gained ${c.block} block`);
    if (c.thorns) {
      player = { ...player, status: { ...player.status, thorns: player.status.thorns + c.thorns } };
      log = addLog(log, `+${c.thorns} thorns`);
    }
  }

  // --- Hack cards ---
  if (c.type === 'hack') {
    if (c.applyWeak) {
      enemy = { ...enemy, status: { ...enemy.status, weakTurns: enemy.status.weakTurns + 2 } };
      log = addLog(log, 'Applied WEAK (2 turns)');
    }
    if (c.dotDamage && c.dotTurns) {
      enemy = {
        ...enemy,
        status: { ...enemy.status, virusDamage: c.dotDamage, virusTurns: c.dotTurns },
      };
      log = addLog(log, `VIRUS: ${c.dotDamage} dmg/turn × ${c.dotTurns}`);
    }
    if (c.draw) {
      const result = drawCards(deck, discard, hand, c.draw);
      deck = result.deck;
      discard = result.discard;
      hand = result.hand;
      log = addLog(log, `Drew ${result.drawn} card${result.drawn !== 1 ? 's' : ''}`);
    }
    if (c.gainEnergy) {
      player = { ...player, energy: player.energy + c.gainEnergy };
      log = addLog(log, `+${c.gainEnergy} energy`);
    }
    if (c.mirror) {
      mirrorActive = true;
      log = addLog(log, 'MIRROR active — next attack ×2');
    }
  }

  // Check enemy dead
  let phase = state.phase;
  let rewardChoices = state.rewardChoices;
  if (enemy.currentHp <= 0) {
    const isBoss = state.floor >= 6;
    phase = isBoss ? 'victory' : 'reward';
    rewardChoices = getRewardChoices();
    log = addLog(log, isBoss ? '✓ NEXUS CORE DESTROYED — BREACH COMPLETE' : `✓ ${enemy.name} eliminated`);
  }

  return { ...state, player, enemy, hand, discard, deck, log, mirrorActive, score, phase, rewardChoices };
}

// ─── Enemy turn resolution ────────────────────────────────────────────────────

export function resolveEnemyTurn(state: GameState): GameState {
  if (!state.enemy) return { ...state, isEnemyTurn: false };

  let { player, enemy, log, score } = state;
  const intent = getCurrentIntent(enemy);

  // Tick enemy virus BEFORE they attack
  if (enemy.status.virusTurns > 0) {
    enemy = {
      ...enemy,
      currentHp: Math.max(0, enemy.currentHp - enemy.status.virusDamage),
      status: {
        ...enemy.status,
        virusTurns: enemy.status.virusTurns - 1,
      },
    };
    log = addLog(log, `VIRUS burned ${enemy.status.virusDamage} (${enemy.status.virusTurns + 1} → ${enemy.status.virusTurns})`);
    score += enemy.status.virusDamage;
  }

  // Check enemy dead from virus
  if (enemy.currentHp <= 0) {
    const isBoss = state.floor >= 6;
    return {
      ...state, player, enemy, log, score,
      phase: isBoss ? 'victory' : 'reward',
      rewardChoices: getRewardChoices(),
      isEnemyTurn: false,
    };
  }

  // Apply enemy block (from block intent)
  switch (intent.type) {
    case 'attack': {
      let dmg = intent.value ?? 0;
      if (enemy.status.weakTurns > 0) dmg = Math.floor(dmg * 0.5);
      const netDmg = Math.max(0, dmg - player.block);
      player = {
        ...player,
        block: Math.max(0, player.block - dmg),
        currentHp: Math.max(0, player.currentHp - netDmg),
      };
      log = addLog(log, `Enemy attacked: ${dmg} dmg (${netDmg} through)`);
      // Thorns
      if (player.status.thorns > 0) {
        enemy = applyDamageToEnemy(enemy, player.status.thorns);
        log = addLog(log, `Thorns: ${player.status.thorns} reflected`);
      }
      break;
    }
    case 'multi_attack': {
      const hits = intent.hits ?? 1;
      let hitDmg = intent.value ?? 0;
      if (enemy.status.weakTurns > 0) hitDmg = Math.floor(hitDmg * 0.5);
      for (let i = 0; i < hits; i++) {
        const netDmg = Math.max(0, hitDmg - player.block);
        player = {
          ...player,
          block: Math.max(0, player.block - hitDmg),
          currentHp: Math.max(0, player.currentHp - netDmg),
        };
        if (player.status.thorns > 0) {
          enemy = applyDamageToEnemy(enemy, player.status.thorns);
        }
      }
      log = addLog(log, `Enemy hit ${hits}×${hitDmg}`);
      break;
    }
    case 'block': {
      enemy = { ...enemy, block: enemy.block + (intent.value ?? 0) };
      log = addLog(log, `Enemy gained ${intent.value} block`);
      break;
    }
    case 'debuff': {
      player = {
        ...player,
        status: { ...player.status, weakTurns: player.status.weakTurns + 2 },
      };
      log = addLog(log, 'Enemy applied CORRUPT: player WEAK 2 turns');
      break;
    }
    case 'charge': {
      log = addLog(log, 'Enemy CHARGING — brace for impact!');
      break;
    }
  }

  // Advance enemy intent
  enemy = {
    ...enemy,
    intentIndex: (enemy.intentIndex + 1) % enemy.intents.length,
    status: {
      ...enemy.status,
      weakTurns: Math.max(0, enemy.status.weakTurns - 1),
    },
  };

  // Tick player status
  player = {
    ...player,
    status: {
      ...player.status,
      weakTurns: Math.max(0, player.status.weakTurns - 1),
    },
  };

  // Check player dead
  if (player.currentHp <= 0) {
    return { ...state, player, enemy, log, score, phase: 'game_over', isEnemyTurn: false };
  }

  // Start new player turn: reset blocks, refill energy, draw cards
  player = { ...player, block: 0, energy: player.maxEnergy };
  enemy = { ...enemy, block: 0 }; // enemy block resets each round too (except when explicitly set)

  const drawn = drawCards(state.deck, [...state.discard, ...state.hand], [], 4);

  return {
    ...state,
    player,
    enemy,
    log,
    score,
    deck: drawn.deck,
    discard: drawn.discard,
    hand: drawn.hand,
    isEnemyTurn: false,
  };
}

// ─── New game / floor setup ───────────────────────────────────────────────────

export function createNewGame(): GameState {
  const startDeck = createStartingDeck();
  const drawn = drawCards(startDeck, [], [], 4);
  const enemy = getEnemyForFloor(1);

  return {
    phase: 'combat',
    floor: 1,
    score: 0,
    mirrorActive: false,
    isEnemyTurn: false,
    rewardChoices: [],
    log: ['RUN INITIATED — floor 1: ' + enemy.name],
    player: {
      maxHp: 50,
      currentHp: 50,
      block: 0,
      energy: 3,
      maxEnergy: 3,
      status: { weakTurns: 0, thorns: 0, virusDamage: 0, virusTurns: 0 },
    },
    enemy,
    deck: drawn.deck,
    discard: drawn.discard,
    hand: drawn.hand,
  };
}

export function advanceToNextFloor(state: GameState, pickedCard: Card | null): GameState {
  const nextFloor = state.floor + 1;
  const allCards = [...state.deck, ...state.discard, ...state.hand];
  const newDeck = shuffleArray(pickedCard ? [...allCards, pickedCard] : allCards);
  const drawn = drawCards(newDeck, [], [], 4);
  const enemy = getEnemyForFloor(nextFloor);

  return {
    ...state,
    phase: 'combat',
    floor: nextFloor,
    isEnemyTurn: false,
    mirrorActive: false,
    rewardChoices: [],
    log: [`Floor ${nextFloor}: ${enemy.name}`],
    player: {
      ...state.player,
      block: 0,
      energy: state.player.maxEnergy,
      status: { weakTurns: 0, thorns: 0, virusDamage: 0, virusTurns: 0 },
    },
    enemy,
    deck: drawn.deck,
    discard: drawn.discard,
    hand: drawn.hand,
  };
}
