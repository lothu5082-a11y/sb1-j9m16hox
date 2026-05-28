import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  ChevronLeft, Phone, PhoneOff, PhoneIncoming, Volume2,
  MicOff, MessageSquare, Clock, User, Bell,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useRouter } from 'expo-router';

export default function CallingScreen() {
  const router = useRouter();
  const [autoAnswer, setAutoAnswer] = useState(false);
  const [callerAnnounce, setCallerAnnounce] = useState(true);
  const [voiceReject, setVoiceReject] = useState(true);
  const [speakerAuto, setSpeakerAuto] = useState(false);
  const [busyMessage, setBusyMessage] = useState(true);
  const [demoMode, setDemoMode] = useState<'idle' | 'incoming' | 'active'>('idle');

  const voiceCommands = [
    { command: '"Hey Vexora, answer the call"', action: 'Answers the incoming call' },
    { command: '"Hey Vexora, reject the call"', action: 'Rejects and sends busy message' },
    { command: '"Hey Vexora, end the call"', action: 'Ends the active call' },
    { command: '"Hey Vexora, speakerphone"', action: 'Toggles speaker on/off' },
    { command: '"Hey Vexora, mute"', action: 'Mutes/unmutes microphone' },
    { command: '"Hey Vexora, who is calling?"', action: 'Announces caller name and number' },
  ];

  const recentCalls = [
    { name: 'Ahmed Hassan', number: '+971 50 123 4567', type: 'incoming', time: '10 min ago', duration: '4:32' },
    { name: 'Unknown', number: '+1 800 555 0199', type: 'rejected', time: '1 hour ago', duration: '-' },
    { name: 'Mom', number: '+971 52 987 6543', type: 'outgoing', time: 'Yesterday', duration: '12:05' },
  ];

  const callTypeColors = { incoming: Colors.success, rejected: Colors.error, outgoing: Colors.primary };
  const callTypeIcons = { incoming: PhoneIncoming, rejected: PhoneOff, outgoing: Phone };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
            <Phone color={Colors.success} size={28} />
            <Text style={styles.headerTitle}>Call Assistant</Text>
          </Animated.View>

          {demoMode === 'idle' && (
            <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.demoSection}>
              <TouchableOpacity
                onPress={() => setDemoMode('incoming')}
                style={styles.demoCard}
                activeOpacity={0.8}
              >
                <PhoneIncoming color={Colors.success} size={32} />
                <Text style={styles.demoTitle}>Simulate Incoming Call</Text>
                <Text style={styles.demoDesc}>See how Vexora handles calls</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {demoMode === 'incoming' && (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.callCard}>
              <View style={styles.callerInfo}>
                <View style={styles.callerAvatar}>
                  <User color={Colors.primary} size={32} />
                </View>
                <Text style={styles.callerName}>Ahmed Hassan</Text>
                <Text style={styles.callerNumber}>+971 50 123 4567</Text>
                <Text style={styles.callerStatus}>Incoming call...</Text>
              </View>
              <View style={styles.callActions}>
                <TouchableOpacity
                  onPress={() => setDemoMode('idle')}
                  style={[styles.callActionBtn, styles.rejectBtn]}
                >
                  <PhoneOff color={Colors.text} size={24} />
                  <Text style={styles.callActionText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDemoMode('active')}
                  style={[styles.callActionBtn, styles.answerBtn]}
                >
                  <Phone color={Colors.background} size={24} />
                  <Text style={[styles.callActionText, { color: Colors.background }]}>Answer</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.vexoraHint}>Say "Hey Vexora, answer the call"</Text>
            </Animated.View>
          )}

          {demoMode === 'active' && (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.callCard}>
              <View style={styles.callerInfo}>
                <View style={[styles.callerAvatar, { borderColor: Colors.success }]}>
                  <User color={Colors.success} size={32} />
                </View>
                <Text style={styles.callerName}>Ahmed Hassan</Text>
                <Text style={[styles.callerStatus, { color: Colors.success }]}>On call • 0:32</Text>
              </View>
              <View style={styles.callControls}>
                {[
                  { icon: MicOff, label: 'Mute' },
                  { icon: Volume2, label: 'Speaker' },
                  { icon: MessageSquare, label: 'Message' },
                ].map((ctrl) => {
                  const CtrlIcon = ctrl.icon;
                  return (
                    <TouchableOpacity key={ctrl.label} style={styles.controlBtn}>
                      <CtrlIcon color={Colors.text} size={20} />
                      <Text style={styles.controlLabel}>{ctrl.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={() => setDemoMode('idle')}
                style={styles.endCallBtn}
              >
                <PhoneOff color={Colors.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.vexoraHint}>Say "Hey Vexora, end the call"</Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Call Settings</Text>
            <View style={styles.settingsList}>
              {[
                { icon: Phone, label: 'Auto Answer', desc: 'Vexora answers when you\'re busy', value: autoAnswer, onChange: setAutoAnswer, color: Colors.success },
                { icon: Bell, label: 'Caller Announce', desc: 'Vexora says who is calling aloud', value: callerAnnounce, onChange: setCallerAnnounce, color: Colors.primary },
                { icon: PhoneOff, label: 'Voice Reject', desc: 'Reject calls with voice command', value: voiceReject, onChange: setVoiceReject, color: Colors.error },
                { icon: Volume2, label: 'Auto Speakerphone', desc: 'Enable speaker on answer', value: speakerAuto, onChange: setSpeakerAuto, color: Colors.secondary },
                { icon: MessageSquare, label: 'Busy Message', desc: 'Send auto reply when rejected', value: busyMessage, onChange: setBusyMessage, color: Colors.warning },
              ].map((setting) => {
                const SettingIcon = setting.icon;
                return (
                  <View key={setting.label} style={styles.settingRow}>
                    <View style={[styles.settingIcon, { borderColor: setting.value ? setting.color : Colors.border }]}>
                      <SettingIcon color={setting.value ? setting.color : Colors.textTertiary} size={20} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={styles.settingLabel}>{setting.label}</Text>
                      <Text style={styles.settingDesc}>{setting.desc}</Text>
                    </View>
                    <Switch
                      value={setting.value}
                      onValueChange={setting.onChange}
                      trackColor={{ false: Colors.surface, true: setting.color + '40' }}
                      thumbColor={setting.value ? setting.color : Colors.textTertiary}
                    />
                  </View>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Voice Commands</Text>
            <View style={styles.commandsList}>
              {voiceCommands.map((cmd, i) => (
                <View key={i} style={styles.commandRow}>
                  <Text style={styles.commandText}>{cmd.command}</Text>
                  <Text style={styles.commandAction}>{cmd.action}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Calls</Text>
            <View style={styles.callList}>
              {recentCalls.map((call, i) => {
                const CallIcon = callTypeIcons[call.type as keyof typeof callTypeIcons];
                const callColor = callTypeColors[call.type as keyof typeof callTypeColors];
                return (
                  <View key={i} style={styles.callItem}>
                    <View style={[styles.callIcon, { backgroundColor: callColor + '15' }]}>
                      <CallIcon color={callColor} size={18} />
                    </View>
                    <View style={styles.callContent}>
                      <Text style={styles.callName}>{call.name}</Text>
                      <Text style={styles.callNumber}>{call.number}</Text>
                    </View>
                    <View style={styles.callMeta}>
                      <View style={styles.callTime}>
                        <Clock color={Colors.textTertiary} size={12} />
                        <Text style={styles.callTimeText}>{call.time}</Text>
                      </View>
                      <Text style={styles.callDuration}>{call.duration}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.xl, gap: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  demoSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  demoCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.success + '40',
    padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md,
  },
  demoTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  demoDesc: { fontSize: FontSizes.sm, color: Colors.textTertiary },
  callCard: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, borderWidth: 1.5,
    borderColor: Colors.success + '50', padding: Spacing.xl,
    marginBottom: Spacing.xl, alignItems: 'center', gap: Spacing.lg,
  },
  callerInfo: { alignItems: 'center', gap: Spacing.sm },
  callerAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,229,255,0.08)', borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  callerName: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  callerNumber: { fontSize: FontSizes.sm, color: Colors.textTertiary },
  callerStatus: { fontSize: FontSizes.md, color: Colors.textSecondary, fontWeight: '500' },
  callActions: { flexDirection: 'row', gap: Spacing.xl },
  callActionBtn: { alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: BorderRadius.full },
  rejectBtn: { backgroundColor: Colors.error },
  answerBtn: { backgroundColor: Colors.success },
  callActionText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text },
  vexoraHint: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '500', fontStyle: 'italic' },
  callControls: { flexDirection: 'row', gap: Spacing.xl },
  controlBtn: { alignItems: 'center', gap: Spacing.xs },
  controlLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
  endCallBtn: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md,
  },
  settingsList: { gap: Spacing.md },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  settingIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundTertiary, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  settingText: { flex: 1 },
  settingLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  settingDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  commandsList: { gap: Spacing.sm },
  commandRow: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  commandText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary, marginBottom: 2 },
  commandAction: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  callList: { gap: Spacing.md },
  callItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md,
  },
  callIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  callContent: { flex: 1 },
  callName: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  callNumber: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  callMeta: { alignItems: 'flex-end' },
  callTime: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  callTimeText: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  callDuration: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontWeight: '600' },
});
