/**
 * ActionConsole
 * --------------------------------------------------------------------------
 * Inline terminal "execution console" block for an intercepted local action.
 * Rendered between conversational streams in the chat, it shows a live status
 * line as the action is dispatched and settles into a success / failure state.
 *
 * State → accent color:
 *   • running → neon violet  (#8A2BE2)  + pulsing indicator + live "EXEC" code
 *   • ok      → neon emerald (#00FF7F)  + "200"
 *   • error   → amber        (#FFB347)  + "500"
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import {
  VexsoraColors as C,
  VexsoraSpacing as S,
  VexsoraRadius as R,
  VexsoraGlow,
  MonoFont,
} from '../constants/vexsoraTheme';

export type ActionStatus = 'running' | 'ok' | 'error';

interface ActionConsoleProps {
  /** Action identifier, e.g. "create_file". */
  name: string;
  status: ActionStatus;
  /** Result detail line, shown once the action settles. */
  detail?: string;
}

const STATE: Record<ActionStatus, { color: string; code: string; glow: object }> = {
  running: { color: C.violet, code: 'EXEC', glow: VexsoraGlow.violet },
  ok: { color: C.emerald, code: '200', glow: VexsoraGlow.emerald },
  error: { color: C.amber, code: '500', glow: VexsoraGlow.danger },
};

export default function ActionConsole({ name, status, detail }: ActionConsoleProps) {
  const running = status === 'running';
  const s = STATE[status];
  const cmd = name.toUpperCase();

  // Live-updating ellipsis while the action runs.
  const [dots, setDots] = useState('');
  useEffect(() => {
    if (!running) {
      setDots('');
      return;
    }
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 350);
    return () => clearInterval(id);
  }, [running]);

  // Pulsing status indicator while the action runs.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!running) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [running, pulse]);

  const statusLine = running
    ? `EXECUTING ${cmd}${dots}`
    : status === 'ok'
    ? `${cmd} — COMPLETE`
    : `${cmd} — FAILED`;

  return (
    <View style={[styles.console, { borderColor: s.color + '66' }, s.glow, styles.glowTune]}>
      <View style={styles.bar}>
        <View style={styles.left}>
          <Animated.View
            style={[
              styles.indicator,
              { backgroundColor: s.color, shadowColor: s.color, opacity: running ? pulse : 1 },
            ]}
          />
          <Text style={[styles.title, { color: s.color }]} numberOfLines={1}>
            SYSTEM :: {statusLine}
          </Text>
        </View>
        <View style={[styles.codeChip, { borderColor: s.color + '55' }]}>
          <Text style={[styles.code, { color: s.color }]}>{s.code}</Text>
        </View>
      </View>
      {!running && !!detail && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  console: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm + 2,
    gap: 6,
  },
  // Soften the shared neon glow for this inline block.
  glowTune: { shadowOpacity: 0.3, shadowRadius: 12 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: S.sm, flex: 1 },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: MonoFont,
    flexShrink: 1,
  },
  codeChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: R.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  code: { fontSize: 10, fontWeight: '800', letterSpacing: 1, fontFamily: MonoFont },
  detail: {
    color: C.textDim,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: MonoFont,
  },
});
