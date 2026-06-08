import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TochiColors } from '../constants/tochiTheme';
import { TochiMood } from '../lib/tochiClient';

interface Props {
  text: string;
  mood: TochiMood;
  visible: boolean;
}

const MOOD_BORDER: Record<TochiMood, string> = {
  happy: '#FFD700',
  surprised: '#FF8C00',
  sad: '#64B5F6',
  thinking: '#CE93D8',
  talking: TochiColors.bubbleBorder,
  eating: '#A5D6A7',
  sleeping: '#B0BEC5',
  idle: TochiColors.bubbleBorder,
};

export default function TochiSpeechBubble({ text, mood, visible }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const translateY = useSharedValue(8);

  useEffect(() => {
    if (visible && text.length > 0) {
      opacity.value = withSpring(1, { damping: 14 });
      scale.value = withSpring(1, { damping: 12 });
      translateY.value = withSpring(0, { damping: 14 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 180 });
      translateY.value = withTiming(6, { duration: 180 });
    }
  }, [visible, text]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const borderColor = MOOD_BORDER[mood] ?? TochiColors.bubbleBorder;

  return (
    <Animated.View style={[styles.container, style]}>
      <View style={[styles.bubble, { borderColor }]}>
        <Text style={styles.text}>{text}</Text>
      </View>
      {/* Bubble tail pointing down toward Tochu */}
      <View style={[styles.tailOuter, { borderTopColor: borderColor }]} />
      <View style={styles.tailInner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    maxWidth: 260,
    alignSelf: 'center',
  },
  bubble: {
    backgroundColor: TochiColors.bubble,
    borderRadius: 20,
    borderWidth: 2.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: TochiColors.bubbleShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  text: {
    color: TochiColors.bubbleText,
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
  },
  tailOuter: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  tailInner: {
    position: 'absolute',
    bottom: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: TochiColors.bubble,
  },
});
