import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import TochiCharacter, { TouchZone } from './TochiCharacter';
import TochiSpeechBubble from './TochiSpeechBubble';
import { tochiClient, TochiMood } from '../lib/tochiClient';
import { TochiColors } from '../constants/tochiTheme';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Floating particle (heart / star emoji, floats up and fades) ─────────────
interface ParticleData { id: number; emoji: string; x: number; y: number }

function FloatingParticle({ data, onDone }: { data: ParticleData; onDone: (id: number) => void }) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    opacity.value = withTiming(0, { duration: 1200 });
    translateY.value = withTiming(-90, { duration: 1200 });
    scale.value = withSequence(withSpring(1.3, { damping: 6 }), withTiming(0.9, { duration: 900 }));
    const t = setTimeout(() => runOnJS(onDone)(data.id), 1250);
    return () => clearTimeout(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.particle, { left: data.x, top: data.y }, style]}>
      {data.emoji}
    </Animated.Text>
  );
}

// ─── Mini-game star ───────────────────────────────────────────────────────────
interface StarData { id: number; x: number; y: number }

function GameStar({ data, onTap, onExpire }: { data: StarData; onTap: (id: number) => void; onExpire: (id: number) => void }) {
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 7 });
    spin.value = withRepeat(withTiming(360, { duration: 1200 }), -1, false);
    const t = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
      setTimeout(() => runOnJS(onExpire)(data.id), 320);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${spin.value}deg` }],
  }));

  return (
    <Pressable
      style={[styles.gameStar, { left: data.x, top: data.y }]}
      onPress={() => {
        opacity.value = withTiming(0, { duration: 150 });
        scale.value = withSpring(1.8, { damping: 4 });
        setTimeout(() => onTap(data.id), 160);
      }}
    >
      <Animated.Text style={[styles.gameStarText, style]}>⭐</Animated.Text>
    </Pressable>
  );
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, color, emoji }: { label: string; value: number; color: string; emoji: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{emoji}</Text>
      <View style={styles.statTrack}>
        <View style={[styles.statFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Decorative cloud ─────────────────────────────────────────────────────────
function Cloud({ top, left, width }: { top: number; left: number; width: number }) {
  const h = width * 0.42;
  return (
    <View style={[styles.cloudWrap, { top, left, width, height: h }]} pointerEvents="none">
      <View style={[styles.cloudBall, { width: h, height: h, left: width * 0.08, top: 0 }]} />
      <View style={[styles.cloudBall, { width: h * 1.1, height: h * 1.1, left: width * 0.28, top: -h * 0.18 }]} />
      <View style={[styles.cloudBall, { width: h * 0.85, height: h * 0.85, left: width * 0.55, top: 0 }]} />
      <View style={[styles.cloudBase, { height: h * 0.55, left: 0, right: 0, bottom: 0 }]} />
    </View>
  );
}

// ─── Touch response banks ─────────────────────────────────────────────────────
const TOUCH_RESPONSES: Record<TouchZone, { texts: string[]; mood: TochiMood; emoji: string }> = {
  head: {
    texts: ['Nyaa~ headpats feel so good! 💛', 'Purrr... Tochu loves this! 😊', 'More more more! ✨', 'You are Tochu\'s favorite! 🧡'],
    mood: 'happy',
    emoji: '💛',
  },
  belly: {
    texts: ['Hehe! Stop it, Tochu is ticklish! 😂', 'Kyaaa! Tochu can\'t take it! 🤣', 'HAHAHAHA! 😆'],
    mood: 'surprised',
    emoji: '😂',
  },
  tail: {
    texts: ['Eek! That\'s Tochu\'s tail! 😱', 'Nyaa! Don\'t pull! 😤', 'Waaah! So mean! 😮'],
    mood: 'surprised',
    emoji: '😲',
  },
};

const ACTION_RESPONSES: Record<string, { texts: string[]; mood: TochiMood; emoji: string }> = {
  feed: {
    texts: ['Nom nom nom! Yummy! 🍎', 'Tochu was SO hungry! Thank you! 😋', 'Mmm! The best food ever! 🌟', 'Nom nom... full tummy! 🍽️'],
    mood: 'eating',
    emoji: '🍎',
  },
  pet: {
    texts: ['Purrrr... Tochu loves you! 💕', 'You are the best friend ever! 💛', 'So warm and cozy! Nyaa! 🧡'],
    mood: 'happy',
    emoji: '💕',
  },
  sleep: {
    texts: ['Zzzzz... Tochu is tired... 😴', 'Just 5 more minutes... Zzz... 💤', 'Sweet dreams... Nyaa... 😌'],
    mood: 'sleeping',
    emoji: '💤',
  },
};

// ─── Main game component ──────────────────────────────────────────────────────
export default function TochiGame() {
  const insets = useSafeAreaInsets();

  const [mood, setMood] = useState<TochiMood>('idle');
  const [isTalking, setIsTalking] = useState(false);
  const [speechText, setSpeechText] = useState('Nyaa! Tochu is here! Tap me! 🧡');
  const [speechVisible, setSpeechVisible] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [happiness, setHappiness] = useState(78);
  const [hunger, setHunger] = useState(62);
  const [energy, setEnergy] = useState(88);
  const [score, setScore] = useState(0);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [miniGame, setMiniGame] = useState(false);
  const [gameStars, setGameStars] = useState<StarData[]>([]);
  const [gameScore, setGameScore] = useState(0);
  const [gameTimeLeft, setGameTimeLeft] = useState(10);

  const speechHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const talkRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particleIdRef = useRef(0);
  const starIdRef = useRef(0);
  const miniGameRef = useRef(false);

  // Stat decay over time
  useEffect(() => {
    const interval = setInterval(() => {
      setHappiness(h => Math.max(0, h - 1));
      setHunger(v => Math.max(0, v - 1.5));
      setEnergy(e => Math.max(0, e - 0.5));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Update mood based on low stats
  useEffect(() => {
    if (hunger < 15 && mood === 'idle') setMood('sad');
    if (happiness < 15 && mood === 'idle') setMood('sad');
  }, [hunger, happiness]);

  // ── Speak helper ─────────────────────────────────────────────────────────────
  const speak = useCallback((text: string, m: TochiMood, duration = 4000) => {
    if (speechHideRef.current) clearTimeout(speechHideRef.current);
    if (talkRef.current) clearTimeout(talkRef.current);
    setMood(m);
    setSpeechText(text);
    setSpeechVisible(true);
    setIsTalking(true);
    talkRef.current = setTimeout(() => setIsTalking(false), Math.min(duration * 0.8, 3000));
    speechHideRef.current = setTimeout(() => {
      setSpeechVisible(false);
      setMood('idle');
    }, duration);
  }, []);

  // ── Particle spawn ────────────────────────────────────────────────────────────
  const spawnParticle = useCallback((emoji: string, cx?: number, cy?: number) => {
    const id = ++particleIdRef.current;
    const x = (cx ?? SW / 2 - 10) + (Math.random() - 0.5) * 60;
    const y = cy ?? SH * 0.35;
    setParticles(prev => [...prev, { id, emoji, x, y }]);
  }, []);

  const removeParticle = useCallback((id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Touch zone handler ───────────────────────────────────────────────────────
  const handleTouch = useCallback((zone: TouchZone) => {
    const bank = TOUCH_RESPONSES[zone];
    const text = bank.texts[Math.floor(Math.random() * bank.texts.length)];
    speak(text, bank.mood, 3500);
    for (let i = 0; i < 5; i++) setTimeout(() => spawnParticle(bank.emoji), i * 120);
    if (zone === 'head') setHappiness(h => Math.min(100, h + 6));
    if (zone === 'belly') setHappiness(h => Math.min(100, h + 3));
  }, [speak, spawnParticle]);

  // ── Action buttons ───────────────────────────────────────────────────────────
  const handleFeed = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const bank = ACTION_RESPONSES.feed;
    const text = bank.texts[Math.floor(Math.random() * bank.texts.length)];
    speak(text, bank.mood, 4000);
    setHunger(h => Math.min(100, h + 22));
    setHappiness(h => Math.min(100, h + 5));
    for (let i = 0; i < 6; i++) setTimeout(() => spawnParticle('🍎'), i * 150);
  }, [speak, spawnParticle]);

  const handlePet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const bank = ACTION_RESPONSES.pet;
    const text = bank.texts[Math.floor(Math.random() * bank.texts.length)];
    speak(text, bank.mood, 3500);
    setHappiness(h => Math.min(100, h + 18));
    for (let i = 0; i < 8; i++) setTimeout(() => spawnParticle(i % 2 === 0 ? '💕' : '💛'), i * 100);
  }, [speak, spawnParticle]);

  const handleSleep = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const bank = ACTION_RESPONSES.sleep;
    const text = bank.texts[Math.floor(Math.random() * bank.texts.length)];
    speak(text, bank.mood, 5000);
    setEnergy(e => Math.min(100, e + 25));
    for (let i = 0; i < 4; i++) setTimeout(() => spawnParticle('💤'), i * 350);
  }, [speak, spawnParticle]);

  // ── Mini-game ─────────────────────────────────────────────────────────────────
  const startMiniGame = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setMiniGame(true);
    miniGameRef.current = true;
    setGameScore(0);
    setGameStars([]);
    setGameTimeLeft(10);
    speak('Yay! Catch the stars! Tap tap tap! ⭐', 'happy', 2000);

    // Spawn stars
    const spawnInterval = setInterval(() => {
      if (!miniGameRef.current) { clearInterval(spawnInterval); return; }
      const id = ++starIdRef.current;
      const x = 30 + Math.random() * (SW - 100);
      const y = 80 + Math.random() * (SH * 0.35);
      setGameStars(prev => [...prev, { id, x, y }]);
    }, 700);

    // Countdown
    let remaining = 10;
    const countInterval = setInterval(() => {
      remaining -= 1;
      setGameTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(countInterval);
        clearInterval(spawnInterval);
        miniGameRef.current = false;
        setMiniGame(false);
        setGameStars([]);
        setGameScore(gs => {
          const finalScore = gs;
          setScore(s => s + finalScore);
          setHappiness(h => Math.min(100, h + Math.min(finalScore * 3, 30)));
          setEnergy(e => Math.max(0, e - 8));
          const msg = finalScore >= 8
            ? `Wowie! ${finalScore} stars! Tochu is SO happy! 🎉`
            : finalScore >= 4
            ? `Yay! ${finalScore} stars! Good job! ⭐`
            : `Aww, only ${finalScore} stars... Let's try again! 🥺`;
          speak(msg, finalScore >= 4 ? 'happy' : 'sad', 4000);
          if (finalScore >= 4) {
            for (let i = 0; i < 10; i++) setTimeout(() => spawnParticle('⭐'), i * 80);
          }
          return finalScore;
        });
      }
    }, 1000);
  }, [speak, spawnParticle]);

  const handleStarTap = useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGameStars(prev => prev.filter(s => s.id !== id));
    setGameScore(s => s + 1);
    spawnParticle('✨', undefined, SH * 0.3);
  }, [spawnParticle]);

  const handleStarExpire = useCallback((id: number) => {
    setGameStars(prev => prev.filter(s => s.id !== id));
  }, []);

  // ── AI chat ────────────────────────────────────────────────────────────────────
  const handleSendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isThinking) return;
    setChatInput('');
    setIsThinking(true);
    speak('Hmm... Tochu is thinking... 🤔', 'thinking', 30000);

    try {
      const resp = await tochiClient.chat(text);
      setIsThinking(false);
      speak(resp.text, resp.mood, 5000);
      if (resp.mood === 'happy') {
        setHappiness(h => Math.min(100, h + 5));
        for (let i = 0; i < 4; i++) setTimeout(() => spawnParticle('💛'), i * 150);
      }
      if (resp.mood === 'eating') {
        setHunger(h => Math.min(100, h + 3));
      }
    } catch {
      setIsThinking(false);
      speak('Nyaa! Tochu got confused for a moment! 😅', 'surprised', 3000);
    }
  }, [chatInput, isThinking, speak, spawnParticle]);

  // ── Scene dimensions ──────────────────────────────────────────────────────────
  const sceneH = SH * 0.52;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─ Sky scene ─ */}
      <LinearGradient
        colors={['#4FC3F7', '#81D4FA', '#E1F5FE']}
        style={[styles.scene, { height: sceneH }]}
      >
        {/* Sun */}
        <View style={styles.sun} pointerEvents="none">
          <Text style={styles.sunEmoji}>☀️</Text>
        </View>

        {/* Clouds */}
        <Cloud top={28} left={-20} width={110} />
        <Cloud top={55} left={SW * 0.55} width={85} />
        <Cloud top={16} left={SW * 0.32} width={68} />

        {/* Score badge */}
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>⭐ {score}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsPanel}>
          <StatBar label="Happy" value={happiness} color={TochiColors.happyStat} emoji="😊" />
          <StatBar label="Hunger" value={hunger} color={TochiColors.hungerStat} emoji="🍎" />
          <StatBar label="Energy" value={energy} color={TochiColors.energyStat} emoji="⚡" />
        </View>

        {/* Character + bubble, anchored to bottom of scene */}
        <View style={styles.characterArea}>
          <TochiSpeechBubble text={speechText} mood={mood} visible={speechVisible} />
          <View style={styles.charSpacer} />
          <TochiCharacter mood={mood} isTalking={isTalking} onTouch={handleTouch} />
        </View>

        {/* Particles overlay */}
        {particles.map(p => (
          <FloatingParticle key={p.id} data={p} onDone={removeParticle} />
        ))}

        {/* Mini-game overlay */}
        {miniGame && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={styles.gameHud} pointerEvents="none">
              <Text style={styles.gameTimer}>⏱ {gameTimeLeft}s</Text>
              <Text style={styles.gameScoreText}>⭐ {gameScore}</Text>
            </View>
            {gameStars.map(s => (
              <GameStar key={s.id} data={s} onTap={handleStarTap} onExpire={handleStarExpire} />
            ))}
          </View>
        )}
      </LinearGradient>

      {/* ─ Ground strip ─ */}
      <View style={styles.ground}>
        <View style={styles.groundTop} />
        <Text style={styles.groundDecor}>🌿🌸🌿🌱🌿🌸🌿🌱🌿🌸🌿</Text>
      </View>

      {/* ─ HUD panel ─ */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.hud}
      >
        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: TochiColors.btnFeed }]} onPress={handleFeed} activeOpacity={0.8}>
            <Text style={styles.actionBtnEmoji}>🍎</Text>
            <Text style={styles.actionBtnLabel}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: TochiColors.btnPet }]} onPress={handlePet} activeOpacity={0.8}>
            <Text style={styles.actionBtnEmoji}>💕</Text>
            <Text style={styles.actionBtnLabel}>Pet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: miniGame ? '#888' : TochiColors.btnPlay }]}
            onPress={miniGame ? undefined : startMiniGame}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnEmoji}>{miniGame ? `${gameTimeLeft}s` : '🎮'}</Text>
            <Text style={styles.actionBtnLabel}>{miniGame ? 'Playing' : 'Play'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: TochiColors.btnSleep }]} onPress={handleSleep} activeOpacity={0.8}>
            <Text style={styles.actionBtnEmoji}>😴</Text>
            <Text style={styles.actionBtnLabel}>Sleep</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Chat input */}
        <View style={[styles.chatRow, { paddingBottom: insets.bottom + 6 }]}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder={isThinking ? 'Tochu is thinking... 🤔' : 'Talk to Tochu...'}
            placeholderTextColor={TochiColors.placeholder}
            onSubmitEditing={handleSendChat}
            returnKeyType="send"
            editable={!isThinking}
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendBtn, isThinking && styles.sendBtnDisabled]}
            onPress={handleSendChat}
            disabled={isThinking}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>{isThinking ? '...' : '▶'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TochiColors.groundDark },

  scene: { width: SW, position: 'relative', overflow: 'hidden' },

  sun: { position: 'absolute', top: 16, right: 20 },
  sunEmoji: { fontSize: 36 },

  cloudWrap: { position: 'absolute' },
  cloudBall: { position: 'absolute', borderRadius: 999, backgroundColor: TochiColors.cloud },
  cloudBase: { position: 'absolute', borderRadius: 8, backgroundColor: TochiColors.cloud },

  scoreBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: TochiColors.star,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  scoreText: { color: TochiColors.dark, fontWeight: '700', fontSize: 14 },

  statsPanel: {
    position: 'absolute',
    top: 50,
    left: 14,
    gap: 5,
    width: 130,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { fontSize: 13, width: 18 },
  statTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statFill: { height: '100%', borderRadius: 4 },

  characterArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 0,
  },
  charSpacer: { height: 10 },

  particle: {
    position: 'absolute',
    fontSize: 22,
    zIndex: 50,
  },

  gameHud: {
    position: 'absolute',
    top: 12,
    right: 14,
    alignItems: 'flex-end',
    gap: 4,
  },
  gameTimer: { fontSize: 18, fontWeight: '800', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  gameScoreText: { fontSize: 18, fontWeight: '800', color: '#FFD700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  gameStar: { position: 'absolute', width: 50, height: 50, alignItems: 'center', justifyContent: 'center', zIndex: 40 },
  gameStarText: { fontSize: 34 },

  ground: {
    height: 40,
    backgroundColor: TochiColors.ground,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  groundTop: { height: 5, backgroundColor: TochiColors.groundDark, position: 'absolute', top: 0, left: 0, right: 0 },
  groundDecor: { fontSize: 14, letterSpacing: -2, paddingBottom: 2 },

  hud: {
    flex: 1,
    backgroundColor: TochiColors.panelBg,
    borderTopWidth: 1,
    borderTopColor: TochiColors.panelBorder,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnEmoji: { fontSize: 22, marginBottom: 2 },
  actionBtnLabel: { color: TochiColors.white, fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: TochiColors.panelBorder, marginHorizontal: 14, opacity: 0.3 },

  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 10,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: TochiColors.inputBg,
    borderWidth: 2,
    borderColor: TochiColors.inputBorder,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: TochiColors.inputText,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: TochiColors.btnSend,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TochiColors.btnSend,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 5,
  },
  sendBtnDisabled: { backgroundColor: '#CCC', shadowOpacity: 0 },
  sendBtnText: { color: TochiColors.white, fontSize: 16, fontWeight: '800' },
});
