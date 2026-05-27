import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus, MessageSquare, Star, Settings, Mic, Brain,
  Trash2, HelpCircle, ChevronRight, Sparkles, Clock,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  starred: boolean;
  model: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onStarConversation: (id: string) => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
  onOpenVoiceSettings: () => void;
  onClose: () => void;
}

const { height } = Dimensions.get('window');

function groupConversations(convs: Conversation[]) {
  const now = Date.now();
  const day = 86400000;
  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'This week': [],
    Older: [],
  };
  convs.forEach(c => {
    const age = now - c.updatedAt;
    if (age < day) groups.Today.push(c);
    else if (age < 2 * day) groups.Yesterday.push(c);
    else if (age < 7 * day) groups['This week'].push(c);
    else groups.Older.push(c);
  });
  return groups;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onStarConversation,
  onOpenSettings,
  onOpenMemory,
  onOpenVoiceSettings,
  onClose,
}: SidebarProps) {
  const starred = conversations.filter(c => c.starred);
  const unstarred = conversations.filter(c => !c.starred);
  const groups = groupConversations(unstarred);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(0,212,255,0.12)', 'transparent']}
        style={styles.header}
      >
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Sparkles color={Colors.primary} size={16} />
          </View>
          <Text style={styles.logoText}>Vexora</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.newChatBtn} onPress={() => { onNewChat(); onClose(); }}>
          <LinearGradient
            colors={[Colors.primary, Colors.purple]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.newChatGradient}
          >
            <Plus color="#fff" size={16} />
            <Text style={styles.newChatText}>New Chat</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Conversations */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Starred */}
        {starred.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star color={Colors.warning} size={12} fill={Colors.warning} />
              <Text style={styles.sectionTitle}>Starred</Text>
            </View>
            {starred.map(c => (
              <ConvItem
                key={c.id}
                conv={c}
                isActive={c.id === activeId}
                onSelect={() => { onSelectConversation(c.id); onClose(); }}
                onDelete={() => onDeleteConversation(c.id)}
                onStar={() => onStarConversation(c.id)}
              />
            ))}
          </View>
        )}

        {/* Recent groups */}
        {Object.entries(groups).map(([group, convs]) => {
          if (!convs.length) return null;
          return (
            <View key={group} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock color={Colors.textTertiary} size={12} />
                <Text style={styles.sectionTitle}>{group}</Text>
              </View>
              {convs.map(c => (
                <ConvItem
                  key={c.id}
                  conv={c}
                  isActive={c.id === activeId}
                  onSelect={() => { onSelectConversation(c.id); onClose(); }}
                  onDelete={() => onDeleteConversation(c.id)}
                  onStar={() => onStarConversation(c.id)}
                />
              ))}
            </View>
          );
        })}

        {conversations.length === 0 && (
          <View style={styles.emptyState}>
            <MessageSquare color={Colors.textTertiary} size={32} />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Start chatting to see your history here</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom menu */}
      <View style={styles.bottomMenu}>
        <BottomItem icon={<Brain color={Colors.primary} size={18} />} label="Memory" onPress={onOpenMemory} />
        <BottomItem icon={<Mic color={Colors.purple} size={18} />} label="Voice" onPress={onOpenVoiceSettings} />
        <BottomItem icon={<Settings color={Colors.textSecondary} size={18} />} label="Settings" onPress={onOpenSettings} />
        <BottomItem icon={<HelpCircle color={Colors.textTertiary} size={18} />} label="Help" onPress={() => {}} />
      </View>
    </View>
  );
}

function ConvItem({
  conv, isActive, onSelect, onDelete, onStar,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onStar: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.convItem, isActive && styles.convItemActive]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <MessageSquare
        color={isActive ? Colors.primary : Colors.textTertiary}
        size={14}
        style={{ marginTop: 1 }}
      />
      <View style={styles.convInfo}>
        <Text style={[styles.convTitle, isActive && styles.convTitleActive]} numberOfLines={1}>
          {conv.title}
        </Text>
        <Text style={styles.convPreview} numberOfLines={1}>{conv.preview}</Text>
      </View>
      <View style={styles.convActions}>
        <TouchableOpacity onPress={onStar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}>
          <Star
            color={conv.starred ? Colors.warning : Colors.textTertiary}
            size={12}
            fill={conv.starred ? Colors.warning : 'none'}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
          <Trash2 color={Colors.textTertiary} size={12} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function BottomItem({
  icon, label, onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.bottomItem} onPress={onPress} activeOpacity={0.7}>
      {icon}
      <Text style={styles.bottomLabel}>{label}</Text>
      <ChevronRight color={Colors.textTertiary} size={14} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08080F',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  logoIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,212,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)',
  },
  logoText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: 'Orbitron-Bold',
  },
  badge: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: FontSizes.xs, color: Colors.purpleLight, fontWeight: '700' },
  newChatBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
  newChatGradient: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  newChatText: { color: '#fff', fontWeight: '700', fontSize: FontSizes.sm },
  scroll: { flex: 1 },
  section: { marginTop: Spacing.sm, paddingHorizontal: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  sectionTitle: { fontSize: FontSizes.xs, color: Colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 10,
    borderRadius: BorderRadius.md, marginBottom: 2,
  },
  convItemActive: { backgroundColor: 'rgba(0,212,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)' },
  convInfo: { flex: 1, minWidth: 0 },
  convTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textSecondary },
  convTitleActive: { color: Colors.primary },
  convPreview: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 1 },
  convActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '600' },
  emptySubtext: { color: Colors.textTertiary, fontSize: FontSizes.sm, textAlign: 'center', paddingHorizontal: Spacing.lg },
  bottomMenu: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingBottom: Spacing.lg + 4,
    paddingTop: Spacing.xs,
  },
  bottomItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 13,
  },
  bottomLabel: { fontSize: FontSizes.md, color: Colors.textSecondary, fontWeight: '500' },
});
