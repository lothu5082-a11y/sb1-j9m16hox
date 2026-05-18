import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Mic, X, MessageSquare, Sparkles } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '../constants/theme';

const BUBBLE_SIZE = 56;

export default function FloatingBubble() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(withSequence(withTiming(1.1, { duration: 500 }), withTiming(1, { duration: 500 })), -1, false);
    } else {
      scale.value = withSpring(1);
    }
  }, [isListening]);

  React.useEffect(() => {
    pulseScale.value = withRepeat(withSequence(withTiming(1.3, { duration: 2000 }), withTiming(1, { duration: 0 })), -1, false);
  }, []);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 0.3 - (pulseScale.value - 1) * 0.5,
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      {isExpanded && (
        <View style={styles.expandedMenu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setIsListening(!isListening)}>
            <View style={[styles.menuIcon, isListening && styles.menuIconActive]}>
              <Mic color={isListening ? Colors.background : Colors.primary} size={20} />
            </View>
            <Text style={styles.menuLabel}>{isListening ? 'Stop' : 'Voice'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <MessageSquare color={Colors.secondary} size={20} />
            </View>
            <Text style={styles.menuLabel}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Sparkles color={Colors.accent} size={20} />
            </View>
            <Text style={styles.menuLabel}>AI</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
        style={styles.bubbleTouchable}
      >
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
        <Animated.View style={[styles.bubble, bubbleStyle]}>
          {isExpanded ? (
            <X color={Colors.background} size={24} />
          ) : (
            <Sparkles color={Colors.background} size={24} />
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
  bubbleTouchable: {
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.primary,
    top: 0,
    left: 0,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  expandedMenu: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    minWidth: 80,
  },
  menuItem: {
    alignItems: 'center',
    gap: 4,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconActive: {
    backgroundColor: Colors.primary,
  },
  menuLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
