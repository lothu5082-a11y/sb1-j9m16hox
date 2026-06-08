import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Path,
  G,
  Defs,
  LinearGradient as SvgLG,
  RadialGradient as SvgRG,
  Stop,
  Line,
  Rect,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TochiMood } from '../lib/tochiClient';
import { TochiColors } from '../constants/tochiTheme';

export type TouchZone = 'head' | 'belly' | 'tail';

interface Props {
  mood: TochiMood;
  isTalking: boolean;
  onTouch: (zone: TouchZone) => void;
}

const TAIL_PATHS = [
  'M 150 192 C 174 172 186 150 164 124',
  'M 150 192 C 180 165 196 142 178 112',
  'M 150 192 C 185 158 202 132 190 102',
];

function Eyes({ mood, blinking }: { mood: TochiMood; blinking: boolean }) {
  if (blinking || mood === 'sleeping') {
    return (
      <G>
        <Path d="M 60 88 Q 72 80 84 88" fill="none" stroke={TochiColors.eyePupil} strokeWidth={3.5} strokeLinecap="round" />
        <Path d="M 116 88 Q 128 80 140 88" fill="none" stroke={TochiColors.eyePupil} strokeWidth={3.5} strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'happy') {
    return (
      <G>
        <Path d="M 58 90 Q 72 74 86 90" fill="none" stroke={TochiColors.eyePupil} strokeWidth={4} strokeLinecap="round" />
        <Path d="M 114 90 Q 128 74 142 90" fill="none" stroke={TochiColors.eyePupil} strokeWidth={4} strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'surprised') {
    return (
      <G>
        <Circle cx={72} cy={88} r={16} fill={TochiColors.eyeWhite} />
        <Circle cx={72} cy={90} r={9} fill={TochiColors.eyeIris} />
        <Circle cx={72} cy={90} r={6.5} fill={TochiColors.eyePupil} />
        <Circle cx={76} cy={85} r={2.5} fill={TochiColors.eyeShine} />
        <Circle cx={128} cy={88} r={16} fill={TochiColors.eyeWhite} />
        <Circle cx={128} cy={90} r={9} fill={TochiColors.eyeIris} />
        <Circle cx={128} cy={90} r={6.5} fill={TochiColors.eyePupil} />
        <Circle cx={132} cy={85} r={2.5} fill={TochiColors.eyeShine} />
      </G>
    );
  }
  if (mood === 'sad') {
    return (
      <G>
        <Circle cx={72} cy={90} r={13} fill={TochiColors.eyeWhite} />
        <Circle cx={72} cy={93} r={7.5} fill={TochiColors.eyeIris} />
        <Circle cx={72} cy={93} r={5} fill={TochiColors.eyePupil} />
        <Circle cx={75} cy={89} r={2} fill={TochiColors.eyeShine} />
        <Path d="M 60 80 Q 66 75 76 78" fill="none" stroke={TochiColors.mouthLine} strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={128} cy={90} r={13} fill={TochiColors.eyeWhite} />
        <Circle cx={128} cy={93} r={7.5} fill={TochiColors.eyeIris} />
        <Circle cx={128} cy={93} r={5} fill={TochiColors.eyePupil} />
        <Circle cx={131} cy={89} r={2} fill={TochiColors.eyeShine} />
        <Path d="M 124 78 Q 134 75 140 80" fill="none" stroke={TochiColors.mouthLine} strokeWidth={2.5} strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'thinking') {
    return (
      <G>
        <Circle cx={72} cy={88} r={13} fill={TochiColors.eyeWhite} />
        <Circle cx={69} cy={84} r={7} fill={TochiColors.eyeIris} />
        <Circle cx={69} cy={84} r={5} fill={TochiColors.eyePupil} />
        <Circle cx={71} cy={81} r={2} fill={TochiColors.eyeShine} />
        <Circle cx={128} cy={88} r={13} fill={TochiColors.eyeWhite} />
        <Circle cx={125} cy={84} r={7} fill={TochiColors.eyeIris} />
        <Circle cx={125} cy={84} r={5} fill={TochiColors.eyePupil} />
        <Circle cx={127} cy={81} r={2} fill={TochiColors.eyeShine} />
      </G>
    );
  }
  // idle / default
  return (
    <G>
      <Circle cx={72} cy={88} r={14} fill={TochiColors.eyeWhite} />
      <Circle cx={72} cy={90} r={8} fill={TochiColors.eyeIris} />
      <Circle cx={72} cy={90} r={5.5} fill={TochiColors.eyePupil} />
      <Circle cx={76} cy={86} r={2.5} fill={TochiColors.eyeShine} />
      <Circle cx={128} cy={88} r={14} fill={TochiColors.eyeWhite} />
      <Circle cx={128} cy={90} r={8} fill={TochiColors.eyeIris} />
      <Circle cx={128} cy={90} r={5.5} fill={TochiColors.eyePupil} />
      <Circle cx={132} cy={86} r={2.5} fill={TochiColors.eyeShine} />
    </G>
  );
}

function Mouth({ mood, mouthOpen }: { mood: TochiMood; mouthOpen: boolean }) {
  if (mood === 'sleeping') {
    return <Path d="M 90 118 Q 100 122 110 118" fill="none" stroke={TochiColors.mouthLine} strokeWidth={2.5} strokeLinecap="round" />;
  }
  if (mood === 'happy') {
    return (
      <G>
        <Path d="M 82 118 Q 100 136 118 118" fill={TochiColors.tongue} />
        <Path d="M 82 118 Q 100 136 118 118" fill="none" stroke={TochiColors.mouthLine} strokeWidth={3} strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'surprised') {
    return (
      <G>
        <Ellipse cx={100} cy={122} rx={12} ry={14} fill={TochiColors.eyePupil} />
        <Ellipse cx={100} cy={127} rx={7} ry={8} fill={TochiColors.tongue} />
      </G>
    );
  }
  if (mood === 'sad') {
    return <Path d="M 84 126 Q 100 114 116 126" fill="none" stroke={TochiColors.mouthLine} strokeWidth={3} strokeLinecap="round" />;
  }
  if (mood === 'eating') {
    return (
      <G>
        <Ellipse cx={100} cy={122} rx={18} ry={14} fill={TochiColors.eyePupil} />
        <Ellipse cx={100} cy={127} rx={11} ry={7} fill={TochiColors.tongue} />
        <Rect x={89} y={114} width={8} height={6} rx={1} fill={TochiColors.eyeWhite} />
        <Rect x={100} y={114} width={8} height={6} rx={1} fill={TochiColors.eyeWhite} />
      </G>
    );
  }
  if (mood === 'talking' || isTalkingMouth(mood, mouthOpen)) {
    return mouthOpen ? (
      <G>
        <Path d="M 86 117 Q 100 132 114 117" fill={TochiColors.eyePupil} />
        <Ellipse cx={100} cy={126} rx={8} ry={5} fill={TochiColors.tongue} />
        <Path d="M 86 117 Q 100 132 114 117" fill="none" stroke={TochiColors.mouthLine} strokeWidth={3} strokeLinecap="round" />
      </G>
    ) : (
      <Path d="M 88 120 Q 100 128 112 120" fill="none" stroke={TochiColors.mouthLine} strokeWidth={3} strokeLinecap="round" />
    );
  }
  return <Path d="M 88 119 Q 100 128 112 119" fill="none" stroke={TochiColors.mouthLine} strokeWidth={3} strokeLinecap="round" />;
}

function isTalkingMouth(mood: TochiMood, mouthOpen: boolean): boolean {
  return mouthOpen;
}

export default function TochiCharacter({ mood, isTalking, onTouch }: Props) {
  const [blinking, setBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [tailIdx, setTailIdx] = useState(1);

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);

  // Idle bob
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(withTiming(-6, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
      false
    );
    return () => cancelAnimation(translateY);
  }, []);

  // Periodic blink
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      timeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => { setBlinking(false); scheduleBlink(); }, 160);
      }, 2200 + Math.random() * 2800);
    };
    scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Mouth toggle while talking
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTalking) {
      interval = setInterval(() => setMouthOpen(v => !v), 230);
    } else {
      setMouthOpen(false);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTalking]);

  // Tail wag when happy / eating
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (mood === 'happy' || mood === 'eating') {
      interval = setInterval(() => setTailIdx(i => (i + 1) % 3), 280);
    } else {
      setTailIdx(1);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [mood]);

  // Mood animations
  useEffect(() => {
    cancelAnimation(translateY);
    cancelAnimation(scale);
    cancelAnimation(rotateZ);
    if (mood === 'happy') {
      translateY.value = withRepeat(
        withSequence(withSpring(-22, { damping: 6 }), withSpring(0, { damping: 8 })),
        3,
        false
      );
      setTimeout(() => {
        translateY.value = withRepeat(
          withSequence(withTiming(-6, { duration: 900 }), withTiming(0, { duration: 900 })),
          -1,
          false
        );
      }, 1800);
    } else if (mood === 'surprised') {
      rotateZ.value = withSequence(
        withTiming(-7, { duration: 55 }),
        withTiming(7, { duration: 55 }),
        withTiming(-5, { duration: 55 }),
        withTiming(5, { duration: 55 }),
        withTiming(0, { duration: 55 })
      );
      translateY.value = withRepeat(
        withSequence(withTiming(-6, { duration: 900 }), withTiming(0, { duration: 900 })),
        -1,
        false
      );
    } else if (mood === 'sleeping') {
      translateY.value = withRepeat(
        withSequence(withTiming(-2, { duration: 1400 }), withTiming(2, { duration: 1400 })),
        -1,
        false
      );
    } else {
      translateY.value = withRepeat(
        withSequence(withTiming(-6, { duration: 900 }), withTiming(0, { duration: 900 })),
        -1,
        false
      );
    }
  }, [mood]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotateZ.value}deg` },
    ],
  }));

  const handlePress = (zone: TouchZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(withSpring(0.92, { damping: 5 }), withSpring(1.0, { damping: 8 }));
    onTouch(zone);
  };

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Svg width={200} height={240} viewBox="0 0 200 240">
        <Defs>
          <SvgLG id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F8B480" />
            <Stop offset="0.6" stopColor={TochiColors.body} />
            <Stop offset="1" stopColor={TochiColors.bodyShade} />
          </SvgLG>
          <SvgLG id="bellyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF4E0" />
            <Stop offset="1" stopColor={TochiColors.belly} />
          </SvgLG>
          <SvgLG id="headGrad" x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor="#FAC08A" />
            <Stop offset="0.65" stopColor={TochiColors.body} />
            <Stop offset="1" stopColor={TochiColors.bodyShade} />
          </SvgLG>
          <SvgRG id="cheekRG" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="rgba(255,110,110,0.52)" />
            <Stop offset="1" stopColor="rgba(255,110,110,0)" />
          </SvgRG>
        </Defs>

        {/* Drop shadow */}
        <Ellipse cx={100} cy={235} rx={60} ry={7} fill="rgba(0,0,0,0.13)" />

        {/* Tail (behind body) */}
        <Path d={TAIL_PATHS[tailIdx]} fill="none" stroke={TochiColors.bodyShade} strokeWidth={20} strokeLinecap="round" />
        <Path d={TAIL_PATHS[tailIdx]} fill="none" stroke={TochiColors.tailTip} strokeWidth={8} strokeLinecap="round" />

        {/* Body */}
        <G onPress={() => handlePress('belly')}>
          <Ellipse cx={100} cy={185} rx={57} ry={51} fill="url(#bodyGrad)" />
          <Ellipse cx={100} cy={192} rx={30} ry={27} fill="url(#bellyGrad)" />
          {/* Body sheen */}
          <Ellipse cx={80} cy={163} rx={11} ry={7} fill="rgba(255,255,255,0.16)" />
          {/* Belly button dot */}
          <Circle cx={100} cy={206} r={2.5} fill="rgba(200,120,60,0.35)" />
        </G>

        {/* Paws */}
        <Ellipse cx={58} cy={225} rx={22} ry={10} fill={TochiColors.bodyShade} />
        <Ellipse cx={58} cy={222} rx={20} ry={9} fill={TochiColors.body} />
        <Circle cx={52} cy={225} r={4} fill="rgba(200,90,50,0.38)" />
        <Circle cx={60} cy={226} r={3.5} fill="rgba(200,90,50,0.38)" />
        <Circle cx={68} cy={225} r={4} fill="rgba(200,90,50,0.38)" />
        <Ellipse cx={142} cy={225} rx={22} ry={10} fill={TochiColors.bodyShade} />
        <Ellipse cx={142} cy={222} rx={20} ry={9} fill={TochiColors.body} />
        <Circle cx={136} cy={225} r={4} fill="rgba(200,90,50,0.38)" />
        <Circle cx={144} cy={226} r={3.5} fill="rgba(200,90,50,0.38)" />
        <Circle cx={152} cy={225} r={4} fill="rgba(200,90,50,0.38)" />

        {/* HEAD */}
        <G onPress={() => handlePress('head')}>
          {/* Ears behind head */}
          <Path d="M 40 54 L 60 16 L 80 50 Z" fill={TochiColors.earOuter} />
          <Path d="M 47 52 L 60 24 L 74 49 Z" fill={TochiColors.earInner} />
          <Path d="M 120 50 L 140 16 L 160 54 Z" fill={TochiColors.earOuter} />
          <Path d="M 126 49 L 140 24 L 153 52 Z" fill={TochiColors.earInner} />

          {/* Head */}
          <Circle cx={100} cy={95} r={70} fill="url(#headGrad)" />
          {/* Head sheen */}
          <Ellipse cx={74} cy={56} rx={20} ry={12} fill="rgba(255,255,255,0.14)" />

          {/* Cheek blushes */}
          <Ellipse cx={50} cy={108} rx={15} ry={10} fill="url(#cheekRG)" />
          <Ellipse cx={150} cy={108} rx={15} ry={10} fill="url(#cheekRG)" />

          {/* Whiskers */}
          <Line x1={44} y1={108} x2={80} y2={112} stroke={TochiColors.whisker} strokeWidth={1.5} />
          <Line x1={42} y1={114} x2={80} y2={114} stroke={TochiColors.whisker} strokeWidth={1.5} />
          <Line x1={44} y1={120} x2={80} y2={116} stroke={TochiColors.whisker} strokeWidth={1.5} />
          <Line x1={120} y1={112} x2={156} y2={108} stroke={TochiColors.whisker} strokeWidth={1.5} />
          <Line x1={120} y1={114} x2={158} y2={114} stroke={TochiColors.whisker} strokeWidth={1.5} />
          <Line x1={120} y1={116} x2={156} y2={120} stroke={TochiColors.whisker} strokeWidth={1.5} />

          {/* Eyes */}
          <Eyes mood={mood} blinking={blinking} />

          {/* Nose */}
          <Ellipse cx={100} cy={107} rx={7} ry={5} fill={TochiColors.nose} />
          <Ellipse cx={100} cy={106} rx={4} ry={2.5} fill={TochiColors.noseDark} />
          <Ellipse cx={102} cy={105} rx={1.5} ry={1} fill="rgba(255,255,255,0.5)" />

          {/* Mouth */}
          <Mouth mood={mood} mouthOpen={mouthOpen} />
        </G>

        {/* Invisible tail hit zone */}
        <Ellipse cx={170} cy={148} rx={30} ry={42} fill="transparent" onPress={() => handlePress('tail')} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 240,
  },
});
