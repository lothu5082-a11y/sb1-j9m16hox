import React, { useReducer, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  GameState,
  Card,
  Enemy,
  Player,
  applyCard,
  resolveEnemyTurn,
  createNewGame,
  advanceToNextFloor,
  getCurrentIntent,
  getIntentLabel,
} from '../utils/nexusEngine';

// ─── Theme ────────────────────────────────────────────────────────────────────

const C = {
  void:     '#000000',
  bg:       '#060606',
  surface:  '#0d0d0d',
  border:   '#1a1a1a',
  violet:   '#8A2BE2',
  violetDim:'#4a1878',
  emerald:  '#00FF7F',
  emeraldDim:'#006633',
  danger:   '#FF4D6D',
  dangerDim:'#7a1530',
  amber:    '#FFB347',
  amberDim: '#6b4700',
  dim:      '#333333',
  muted:    '#555555',
  text:     '#cccccc',
  white:    '#ffffff',
};

const MONO: string =
  Platform.OS === 'ios' ? 'Menlo' :
  Platform.OS === 'android' ? 'monospace' : 'monospace';

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'START_GAME' }
  | { type: 'PLAY_CARD'; uid: string }
  | { type: 'END_TURN' }
  | { type: 'RESOLVE_ENEMY' }
  | { type: 'PICK_REWARD'; card: Card }
  | { type: 'SKIP_REWARD' }
  | { type: 'RESTART' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME':
    case 'RESTART':
      return createNewGame();

    case 'PLAY_CARD':
      if (state.isEnemyTurn || state.phase !== 'combat') return state;
      return applyCard(state, action.uid);

    case 'END_TURN':
      if (state.isEnemyTurn || state.phase !== 'combat') return state;
      return { ...state, isEnemyTurn: true };

    case 'RESOLVE_ENEMY':
      return resolveEnemyTurn(state);

    case 'PICK_REWARD':
      return advanceToNextFloor(state, action.card);

    case 'SKIP_REWARD':
      return advanceToNextFloor(state, null);

    default:
      return state;
  }
}

// ─── Hp Bar ───────────────────────────────────────────────────────────────────

function HpBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(1, current / max));
  return (
    <View style={styles.hpBarTrack}>
      <View style={[styles.hpBarFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

const CARD_COLORS: Record<string, string> = {
  attack:  C.violet,
  defense: C.emerald,
  hack:    C.amber,
};

function CardView({
  card,
  canAfford,
  onPlay,
  disabled,
}: {
  card: Card;
  canAfford: boolean;
  onPlay: (uid: string) => void;
  disabled: boolean;
}) {
  const borderColor = canAfford ? CARD_COLORS[card.type] : C.dim;
  const rarityDot = card.rarity === 'rare' ? '★' : card.rarity === 'uncommon' ? '◆' : '·';

  let mainIcon = '⚔';
  if (card.type === 'defense') mainIcon = '🛡';
  else if (card.type === 'hack') mainIcon = '⚡';

  let mainValue = '';
  if (card.damage !== undefined) mainValue = card.hits ? `${card.damage}×${card.hits}` : `${card.damage}`;
  else if (card.block !== undefined) mainValue = `${card.block}`;
  else if (card.draw !== undefined) mainValue = `+${card.draw}`;
  else if (card.gainEnergy !== undefined) mainValue = `+${card.gainEnergy}⚡`;
  else if (card.applyWeak) mainValue = 'WEAK';
  else if (card.mirror) mainValue = '×2';
  else if (card.dotDamage) mainValue = `${card.dotDamage}×${card.dotTurns}`;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor },
        !canAfford && styles.cardDisabled,
      ]}
      onPress={() => !disabled && canAfford && onPlay(card.uid)}
      activeOpacity={0.7}
    >
      {/* Cost pip */}
      <View style={[styles.cardCost, { borderColor }]}>
        <Text style={[styles.cardCostText, { color: borderColor }]}>{card.cost}</Text>
      </View>

      {/* Rarity */}
      <Text style={[styles.cardRarity, { color: borderColor }]}>{rarityDot}</Text>

      {/* Name */}
      <Text style={[styles.cardName, { color: canAfford ? C.white : C.muted }]} numberOfLines={1}>
        {card.name}
      </Text>

      {/* Icon + value */}
      <Text style={[styles.cardIcon, { color: borderColor }]}>{mainIcon}</Text>
      <Text style={[styles.cardValue, { color: canAfford ? C.white : C.muted }]}>{mainValue}</Text>

      {/* Desc */}
      <Text style={[styles.cardDesc, { color: C.muted }]} numberOfLines={2}>{card.desc}</Text>
    </TouchableOpacity>
  );
}

// ─── Enemy panel ──────────────────────────────────────────────────────────────

function EnemyPanel({ enemy, floor }: { enemy: Enemy; floor: number }) {
  const intent = getCurrentIntent(enemy);
  const isBoss = floor >= 6;

  let intentColor = C.danger;
  if (intent.type === 'block') intentColor = C.emerald;
  else if (intent.type === 'charge') intentColor = C.amber;
  else if (intent.type === 'debuff') intentColor = C.amber;

  return (
    <View style={styles.enemyPanel}>
      {/* Header */}
      <View style={styles.enemyHeader}>
        <Text style={[styles.enemyName, isBoss && styles.enemyNameBoss]}>{enemy.name}</Text>
        <Text style={styles.floorBadge}>FLOOR {floor}{isBoss ? ' ☠' : ''}</Text>
      </View>

      {/* HP */}
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>HP</Text>
        <HpBar current={enemy.currentHp} max={enemy.maxHp} color={isBoss ? C.danger : C.emerald} />
        <Text style={styles.statValue}>{enemy.currentHp}/{enemy.maxHp}</Text>
      </View>

      {/* Block + Status */}
      <View style={styles.tagRow}>
        {enemy.block > 0 && (
          <View style={styles.tag}>
            <Text style={[styles.tagText, { color: C.emerald }]}>🛡 {enemy.block}</Text>
          </View>
        )}
        {enemy.status.weakTurns > 0 && (
          <View style={styles.tag}>
            <Text style={[styles.tagText, { color: C.amber }]}>WEAK {enemy.status.weakTurns}</Text>
          </View>
        )}
        {enemy.status.virusTurns > 0 && (
          <View style={styles.tag}>
            <Text style={[styles.tagText, { color: C.danger }]}>☠ VIRUS {enemy.status.virusTurns}</Text>
          </View>
        )}
      </View>

      {/* Intent */}
      <View style={[styles.intentBox, { borderColor: intentColor }]}>
        <Text style={styles.intentLabel}>NEXT ACTION</Text>
        <Text style={[styles.intentText, { color: intentColor }]}>{getIntentLabel(intent)}</Text>
      </View>
    </View>
  );
}

// ─── Player panel ─────────────────────────────────────────────────────────────

function PlayerPanel({ player }: { player: Player }) {
  const pips = Array.from({ length: player.maxEnergy }, (_, i) => i < player.energy);
  return (
    <View style={styles.playerPanel}>
      {/* HP */}
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>HP</Text>
        <HpBar
          current={player.currentHp}
          max={player.maxHp}
          color={player.currentHp < player.maxHp * 0.3 ? C.danger : C.emerald}
        />
        <Text style={styles.statValue}>{player.currentHp}/{player.maxHp}</Text>
      </View>

      {/* Block + Status + Energy */}
      <View style={styles.playerStatusRow}>
        <View style={styles.tagRow}>
          {player.block > 0 && (
            <View style={styles.tag}>
              <Text style={[styles.tagText, { color: C.emerald }]}>🛡 {player.block}</Text>
            </View>
          )}
          {player.status.weakTurns > 0 && (
            <View style={styles.tag}>
              <Text style={[styles.tagText, { color: C.amber }]}>WEAK {player.status.weakTurns}</Text>
            </View>
          )}
          {player.status.thorns > 0 && (
            <View style={styles.tag}>
              <Text style={[styles.tagText, { color: C.violet }]}>⚡ {player.status.thorns} THORNS</Text>
            </View>
          )}
        </View>

        {/* Energy pips */}
        <View style={styles.energyRow}>
          {pips.map((filled, i) => (
            <View key={i} style={[styles.pip, filled ? styles.pipFilled : styles.pipEmpty]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Combat log ───────────────────────────────────────────────────────────────

function LogPanel({ log }: { log: string[] }) {
  const recent = log.slice(-4);
  return (
    <View style={styles.logPanel}>
      {recent.map((line, i) => (
        <Text key={i} style={[styles.logLine, i === recent.length - 1 && styles.logLineLast]}>
          {'> '}{line}
        </Text>
      ))}
    </View>
  );
}

// ─── Combat screen ────────────────────────────────────────────────────────────

function CombatScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}) {
  const { player, enemy, hand, deck, discard, isEnemyTurn } = state;
  if (!enemy) return null;

  return (
    <View style={styles.combatContainer}>
      <EnemyPanel enemy={enemy} floor={state.floor} />
      <LogPanel log={state.log} />
      <PlayerPanel player={player} />

      {/* Hand */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.handContent}
        style={styles.handScroll}
      >
        {hand.map(c => (
          <CardView
            key={c.uid}
            card={c}
            canAfford={c.cost <= player.energy}
            onPlay={uid => dispatch({ type: 'PLAY_CARD', uid })}
            disabled={isEnemyTurn}
          />
        ))}
        {hand.length === 0 && (
          <View style={styles.emptyHand}>
            <Text style={styles.emptyHandText}>No cards — end your turn</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.deckInfo}>DECK {deck.length} | DISC {discard.length}</Text>
        <TouchableOpacity
          style={[styles.endTurnBtn, isEnemyTurn && styles.endTurnBtnDisabled]}
          onPress={() => !isEnemyTurn && dispatch({ type: 'END_TURN' })}
          activeOpacity={0.8}
        >
          <Text style={styles.endTurnText}>
            {isEnemyTurn ? 'ENEMY TURN…' : 'END TURN ▶'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Reward screen ────────────────────────────────────────────────────────────

function RewardScreen({
  choices,
  floor,
  dispatch,
}: {
  choices: Card[];
  floor: number;
  dispatch: React.Dispatch<Action>;
}) {
  return (
    <View style={styles.fullScreen}>
      <Text style={styles.screenTitle}>UPGRADE ACQUIRED</Text>
      <Text style={styles.screenSub}>Floor {floor} cleared — add a card to your deck</Text>

      <View style={styles.rewardCards}>
        {choices.map(c => (
          <TouchableOpacity
            key={c.uid}
            style={[styles.rewardCard, { borderColor: CARD_COLORS[c.type] }]}
            onPress={() => dispatch({ type: 'PICK_REWARD', card: c })}
            activeOpacity={0.8}
          >
            <Text style={[styles.rewardCardType, { color: CARD_COLORS[c.type] }]}>
              {c.type.toUpperCase()} · {c.rarity.toUpperCase()}
            </Text>
            <Text style={styles.rewardCardName}>{c.name}</Text>
            <Text style={styles.rewardCardDesc}>{c.desc}</Text>
            <Text style={[styles.rewardCardCost, { color: CARD_COLORS[c.type] }]}>
              COST: {c.cost}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={() => dispatch({ type: 'SKIP_REWARD' })}
        activeOpacity={0.8}
      >
        <Text style={styles.skipBtnText}>SKIP — proceed without upgrade</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Menu screen ─────────────────────────────────────────────────────────────

function MenuScreen({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  return (
    <View style={styles.fullScreen}>
      <View style={styles.titleBlock}>
        <Text style={styles.titlePre}>// CLASSIFIED</Text>
        <Text style={styles.titleMain}>NEXUS</Text>
        <Text style={styles.titleMain}>BREACH</Text>
        <Text style={styles.titleSub}>CYBERPUNK CARD ROGUELIKE</Text>
      </View>

      <View style={styles.howToBlock}>
        <Text style={styles.howToTitle}>// HOW TO PLAY</Text>
        <Text style={styles.howToLine}>· Play cards to attack, block, and hack</Text>
        <Text style={styles.howToLine}>· 3 energy per turn — spend it wisely</Text>
        <Text style={styles.howToLine}>· Enemy shows its next move — plan ahead</Text>
        <Text style={styles.howToLine}>· After each floor, upgrade your deck</Text>
        <Text style={styles.howToLine}>· Defeat the NEXUS CORE on floor 6 to win</Text>
      </View>

      <View style={styles.cardLegend}>
        <Text style={styles.howToTitle}>// CARD TYPES</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: C.violet }]} />
          <Text style={styles.legendText}>ATTACK — deal damage</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: C.emerald }]} />
          <Text style={styles.legendText}>DEFENSE — gain block (absorbs damage)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: C.amber }]} />
          <Text style={styles.legendText}>HACK — status effects &amp; utility</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.startBtn}
        onPress={() => dispatch({ type: 'START_GAME' })}
        activeOpacity={0.8}
      >
        <Text style={styles.startBtnText}>INITIATE RUN ▶</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Victory screen ───────────────────────────────────────────────────────────

function VictoryScreen({ score, dispatch }: { score: number; dispatch: React.Dispatch<Action> }) {
  return (
    <View style={styles.fullScreen}>
      <Text style={[styles.screenTitle, { color: C.emerald }]}>BREACH COMPLETE</Text>
      <Text style={styles.screenSub}>NEXUS CORE has been destroyed</Text>
      <Text style={styles.bigScore}>{score}</Text>
      <Text style={styles.bigScoreLabel}>DAMAGE DEALT</Text>
      <TouchableOpacity style={styles.startBtn} onPress={() => dispatch({ type: 'RESTART' })} activeOpacity={0.8}>
        <Text style={styles.startBtnText}>NEW RUN ▶</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Game over screen ─────────────────────────────────────────────────────────

function GameOverScreen({ score, floor, dispatch }: { score: number; floor: number; dispatch: React.Dispatch<Action> }) {
  return (
    <View style={styles.fullScreen}>
      <Text style={[styles.screenTitle, { color: C.danger }]}>OPERATIVE DOWN</Text>
      <Text style={styles.screenSub}>Reached floor {floor}</Text>
      <Text style={[styles.bigScore, { color: C.danger }]}>{score}</Text>
      <Text style={styles.bigScoreLabel}>DAMAGE DEALT</Text>
      <TouchableOpacity style={[styles.startBtn, { borderColor: C.danger }]} onPress={() => dispatch({ type: 'RESTART' })} activeOpacity={0.8}>
        <Text style={[styles.startBtnText, { color: C.danger }]}>TRY AGAIN ▶</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NexusBreach({ onExit }: { onExit: () => void }) {
  const initialState: GameState = {
    phase: 'menu',
    floor: 1,
    score: 0,
    mirrorActive: false,
    isEnemyTurn: false,
    rewardChoices: [],
    log: [],
    player: {
      maxHp: 50, currentHp: 50, block: 0, energy: 3, maxEnergy: 3,
      status: { weakTurns: 0, thorns: 0, virusDamage: 0, virusTurns: 0 },
    },
    enemy: null,
    deck: [],
    hand: [],
    discard: [],
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // Trigger enemy turn resolution after a short delay
  useEffect(() => {
    if (!state.isEnemyTurn) return;
    const t = setTimeout(() => dispatch({ type: 'RESOLVE_ENEMY' }), 900);
    return () => clearTimeout(t);
  }, [state.isEnemyTurn]);

  const { phase } = state;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.void} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NEXUS BREACH</Text>
        <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
          <Text style={styles.exitBtnText}>EXIT</Text>
        </TouchableOpacity>
      </View>

      {/* Screens */}
      {phase === 'menu' && <MenuScreen dispatch={dispatch} />}
      {phase === 'combat' && <CombatScreen state={state} dispatch={dispatch} />}
      {phase === 'reward' && (
        <RewardScreen choices={state.rewardChoices} floor={state.floor} dispatch={dispatch} />
      )}
      {phase === 'victory' && <VictoryScreen score={state.score} dispatch={dispatch} />}
      {phase === 'game_over' && (
        <GameOverScreen score={state.score} floor={state.floor} dispatch={dispatch} />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get('window');
const CARD_W = Math.min(140, SW * 0.36);
const CARD_H = 188;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.void,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    color: C.violet,
    letterSpacing: 3,
  },
  exitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.muted,
    borderRadius: 4,
  },
  exitBtnText: {
    fontFamily: MONO,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },

  // ── Combat ──
  combatContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },

  // Enemy panel
  enemyPanel: {
    marginTop: 10,
    padding: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
  },
  enemyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  enemyName: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 2,
  },
  enemyNameBoss: {
    color: C.danger,
  },
  floorBadge: {
    fontFamily: MONO,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
  },

  // Stat rows
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  statLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: C.muted,
    width: 22,
    letterSpacing: 1,
  },
  statValue: {
    fontFamily: MONO,
    fontSize: 10,
    color: C.text,
    width: 58,
    textAlign: 'right',
  },
  hpBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.dim,
    borderRadius: 3,
    backgroundColor: C.bg,
  },
  tagText: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
  },

  intentBox: {
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: C.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  intentLabel: {
    fontFamily: MONO,
    fontSize: 8,
    color: C.muted,
    letterSpacing: 1,
  },
  intentText: {
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Log
  logPanel: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 6,
    minHeight: 56,
    justifyContent: 'flex-end',
  },
  logLine: {
    fontFamily: MONO,
    fontSize: 9,
    color: C.muted,
    lineHeight: 13,
  },
  logLineLast: {
    color: C.text,
  },

  // Player panel
  playerPanel: {
    padding: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    marginBottom: 6,
  },
  playerStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  energyRow: {
    flexDirection: 'row',
    gap: 5,
  },
  pip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  pipFilled: {
    backgroundColor: C.violet,
    borderColor: C.violet,
  },
  pipEmpty: {
    backgroundColor: 'transparent',
    borderColor: C.dim,
  },

  // Hand
  handScroll: {
    maxHeight: CARD_H + 12,
    marginBottom: 4,
  },
  handContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
    alignItems: 'flex-start',
  },
  emptyHand: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: CARD_H,
    paddingHorizontal: 20,
  },
  emptyHandText: {
    fontFamily: MONO,
    fontSize: 10,
    color: C.muted,
  },

  // Cards
  card: {
    width: CARD_W,
    height: CARD_H,
    borderWidth: 1.5,
    borderRadius: 6,
    backgroundColor: C.surface,
    padding: 9,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cardDisabled: {
    opacity: 0.4,
  },
  cardCost: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCostText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
  },
  cardRarity: {
    fontFamily: MONO,
    fontSize: 9,
    position: 'absolute',
    top: 8,
    left: 8,
  },
  cardName: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 14,
  },
  cardIcon: {
    fontSize: 22,
    textAlign: 'center',
    marginVertical: 4,
  },
  cardValue: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
  },
  cardDesc: {
    fontFamily: MONO,
    fontSize: 8,
    lineHeight: 11,
    textAlign: 'center',
    marginTop: 4,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    paddingTop: 4,
  },
  deckInfo: {
    fontFamily: MONO,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 1,
  },
  endTurnBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: C.violet,
    borderRadius: 5,
    backgroundColor: C.violetDim,
  },
  endTurnBtnDisabled: {
    borderColor: C.dim,
    backgroundColor: 'transparent',
  },
  endTurnText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 1,
  },

  // Full-screen layouts (menu / reward / victory / game_over)
  fullScreen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },

  // Menu
  titleBlock: {
    marginBottom: 24,
  },
  titlePre: {
    fontFamily: MONO,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  titleMain: {
    fontFamily: MONO,
    fontSize: 38,
    fontWeight: '700',
    color: C.violet,
    letterSpacing: 6,
    lineHeight: 44,
    textShadowColor: C.violet,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  titleSub: {
    fontFamily: MONO,
    fontSize: 10,
    color: C.emerald,
    letterSpacing: 3,
    marginTop: 6,
  },
  howToBlock: {
    marginBottom: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 5,
    backgroundColor: C.surface,
  },
  howToTitle: {
    fontFamily: MONO,
    fontSize: 9,
    color: C.violet,
    letterSpacing: 2,
    marginBottom: 6,
  },
  howToLine: {
    fontFamily: MONO,
    fontSize: 11,
    color: C.text,
    lineHeight: 18,
  },
  cardLegend: {
    marginBottom: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 5,
    backgroundColor: C.surface,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: MONO,
    fontSize: 11,
    color: C.text,
  },
  startBtn: {
    marginTop: 'auto',
    borderWidth: 1.5,
    borderColor: C.emerald,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: C.emeraldDim,
  },
  startBtnText: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '700',
    color: C.emerald,
    letterSpacing: 3,
  },

  // Reward
  screenTitle: {
    fontFamily: MONO,
    fontSize: 22,
    fontWeight: '700',
    color: C.violet,
    letterSpacing: 4,
    marginBottom: 6,
  },
  screenSub: {
    fontFamily: MONO,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
    marginBottom: 20,
  },
  rewardCards: {
    flex: 1,
    gap: 12,
  },
  rewardCard: {
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 6,
    backgroundColor: C.surface,
  },
  rewardCardType: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 4,
  },
  rewardCardName: {
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 2,
    marginBottom: 5,
  },
  rewardCardDesc: {
    fontFamily: MONO,
    fontSize: 11,
    color: C.text,
    marginBottom: 8,
  },
  rewardCardCost: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1,
  },
  skipBtn: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.dim,
    borderRadius: 5,
  },
  skipBtnText: {
    fontFamily: MONO,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
  },

  // Victory / Game Over
  bigScore: {
    fontFamily: MONO,
    fontSize: 64,
    fontWeight: '700',
    color: C.emerald,
    textAlign: 'center',
    marginTop: 30,
    textShadowColor: C.emerald,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  bigScoreLabel: {
    fontFamily: MONO,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 30,
  },
});
