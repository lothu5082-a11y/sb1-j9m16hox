import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator,
} from 'react-native';
import {
  Search, X, MessageSquare, FileText, Target, Lightbulb, CheckCircle2,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { universalSearch, SearchResult } from '../lib/productivity';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
}

const TYPE_ICONS: Record<SearchResult['type'], React.ReactNode> = {
  conversation: <MessageSquare size={14} color={Colors.primary} />,
  note: <FileText size={14} color={Colors.purple} />,
  goal: <Target size={14} color={Colors.warning} />,
  idea: <Lightbulb size={14} color={Colors.warning} />,
  task: <CheckCircle2 size={14} color={Colors.success} />,
};

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  conversation: 'Chat', note: 'Note', goal: 'Goal', idea: 'Idea', task: 'Task',
};

const TYPE_COLORS: Record<SearchResult['type'], string> = {
  conversation: Colors.primary,
  note: Colors.purple,
  goal: Colors.warning,
  idea: Colors.warning,
  task: Colors.success,
};

export default function SearchModal({ visible, onClose, onSelectConversation }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await universalSearch(q);
      setResults(res);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  useEffect(() => {
    if (!visible) { setQuery(''); setResults([]); }
  }, [visible]);

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'conversation') {
      onSelectConversation(result.id);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.searchBar}>
            <Search color={Colors.textTertiary} size={18} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search everything..."
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X color={Colors.textTertiary} size={16} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {searching && (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <View style={styles.center}>
              <Search color={Colors.textTertiary} size={32} />
              <Text style={styles.emptyText}>No results for "{query}"</Text>
              <Text style={styles.emptySubtext}>Try different keywords</Text>
            </View>
          )}

          {!searching && !query.trim() && (
            <View style={styles.center}>
              <Search color={Colors.textTertiary} size={40} />
              <Text style={styles.emptyText}>Search across everything</Text>
              <Text style={styles.emptySubtext}>Chats · Notes · Goals · Tasks · Ideas</Text>
            </View>
          )}

          {Object.entries(grouped).map(([type, items]) => (
            <View key={type} style={styles.group}>
              <View style={styles.groupHeader}>
                {TYPE_ICONS[type as SearchResult['type']]}
                <Text style={[styles.groupTitle, { color: TYPE_COLORS[type as SearchResult['type']] }]}>
                  {TYPE_LABELS[type as SearchResult['type']]}s
                </Text>
                <Text style={styles.groupCount}>({items.length})</Text>
              </View>
              {items.map(result => (
                <TouchableOpacity
                  key={result.id}
                  style={styles.resultCard}
                  onPress={() => handleSelect(result)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[result.type] }]} />
                  <View style={styles.resultText}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{result.title}</Text>
                    {result.preview ? (
                      <Text style={styles.resultPreview} numberOfLines={1}>{result.preview}</Text>
                    ) : null}
                  </View>
                  {result.type === 'conversation' && (
                    <MessageSquare color={Colors.textTertiary} size={14} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080F' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg + 4, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, height: 44,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md },
  cancelBtn: { paddingHorizontal: Spacing.sm },
  cancelText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '600' },
  scroll: { flex: 1 },
  center: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '600' },
  emptySubtext: { color: Colors.textTertiary, fontSize: FontSizes.sm },
  group: { paddingHorizontal: Spacing.md, marginTop: Spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  groupTitle: { fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  groupCount: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  typeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  resultText: { flex: 1 },
  resultTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  resultPreview: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
});
