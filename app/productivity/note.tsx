import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Pin, Trash2, Tag, Check } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNotes, NOTE_COLORS } from '../../hooks/useNotes';
import { Note } from '../../types/data';
import { formatShortDate } from '../../lib/dateUtils';

export default function NoteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { notes, addNote, updateNote, deleteNote, togglePin } = useNotes();

  const existing: Note | undefined = params.id ? notes.find((n) => n.id === params.id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [content, setContent] = useState(existing?.content ?? '');
  const [color, setColor] = useState(existing?.color ?? NOTE_COLORS[0]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noteId, setNoteId] = useState<string | undefined>(existing?.id);

  const isDirty = title !== (existing?.title ?? '') || content !== (existing?.content ?? '');

  const save = useCallback(() => {
    if (!title.trim() && !content.trim()) return;
    if (noteId) {
      updateNote(noteId, { title, content, color, tags });
    } else {
      const note = addNote(title, content, color, tags);
      setNoteId(note.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }, [noteId, title, content, color, tags, addNote, updateNote]);

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(save, 1000);
    return () => clearTimeout(timer);
  }, [title, content, color, tags]);

  const handleDelete = () => {
    Alert.alert('Delete Note', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (noteId) deleteNote(noteId);
          router.back();
        },
      },
    ]);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const colorLabels: Record<string, string> = {
    [NOTE_COLORS[0]]: 'Default',
    [NOTE_COLORS[1]]: 'Ocean',
    [NOTE_COLORS[2]]: 'Forest',
    [NOTE_COLORS[3]]: 'Berry',
    [NOTE_COLORS[4]]: 'Violet',
    [NOTE_COLORS[5]]: 'Gold',
  };

  return (
    <View style={[styles.container, { backgroundColor: color }]}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => { save(); router.back(); }} style={styles.toolbarBtn}>
            <ChevronLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <View style={styles.toolbarCenter}>
            {saved && (
              <View style={styles.savedBadge}>
                <Check color={Colors.success} size={12} />
                <Text style={styles.savedText}>Saved</Text>
              </View>
            )}
            {existing && (
              <Text style={styles.updatedAt}>
                {formatShortDate(existing.updatedAt)}
              </Text>
            )}
          </View>
          <View style={styles.toolbarActions}>
            <TouchableOpacity onPress={() => setShowColorPicker((v) => !v)} style={styles.toolbarBtn}>
              <View style={[styles.colorDot, { backgroundColor: color === NOTE_COLORS[0] ? Colors.primary : color }]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTagInput((v) => !v)} style={styles.toolbarBtn}>
              <Tag color={Colors.textSecondary} size={18} />
            </TouchableOpacity>
            {noteId && (
              <TouchableOpacity onPress={() => { togglePin(noteId); }} style={styles.toolbarBtn}>
                <Pin
                  color={existing?.pinned ? Colors.primary : Colors.textSecondary}
                  size={18}
                />
              </TouchableOpacity>
            )}
            {noteId && (
              <TouchableOpacity onPress={handleDelete} style={styles.toolbarBtn}>
                <Trash2 color={Colors.error} size={18} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {showColorPicker && (
          <View style={styles.colorPicker}>
            {NOTE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => { setColor(c); setShowColorPicker(false); }}
                style={[
                  styles.colorOption,
                  { backgroundColor: c === NOTE_COLORS[0] ? Colors.surface : c },
                  color === c && styles.colorOptionSelected,
                ]}
              >
                {color === c && <Check color={Colors.text} size={14} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showTagInput && (
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder="Add tag..."
              placeholderTextColor={Colors.textTertiary}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={addTag} style={styles.tagAddBtn}>
              <Check color={Colors.background} size={16} />
            </TouchableOpacity>
          </View>
        )}

        {tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}
            contentContainerStyle={styles.tagRow}>
            {tags.map((tag) => (
              <TouchableOpacity key={tag} onPress={() => removeTag(tag)} style={styles.tagChip}>
                <Text style={styles.tagChipText}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <ScrollView style={styles.editor} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.titleInput}
            placeholder="Title"
            placeholderTextColor={Colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            multiline={false}
            returnKeyType="next"
          />
          <TextInput
            style={styles.contentInput}
            placeholder="Start writing..."
            placeholderTextColor={Colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxxl + Spacing.sm,
    paddingBottom: Spacing.md,
  },
  toolbarBtn: { padding: Spacing.sm },
  toolbarCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedText: { fontSize: FontSizes.xs, color: Colors.success, fontWeight: '600' },
  updatedAt: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  toolbarActions: { flexDirection: 'row', gap: Spacing.xs },
  colorDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  colorPicker: {
    flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  colorOption: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  colorOptionSelected: { borderColor: Colors.text },
  tagInputRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm,
  },
  tagInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, fontSize: FontSizes.sm, color: Colors.text,
  },
  tagAddBtn: {
    width: 36, height: 36, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  tagScroll: { maxHeight: 36 },
  tagRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  tagChip: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tagChipText: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '600' },
  editor: { flex: 1, paddingHorizontal: Spacing.lg },
  titleInput: {
    fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text,
    marginBottom: Spacing.lg, paddingVertical: Spacing.sm,
  },
  contentInput: {
    fontSize: FontSizes.md, color: Colors.textSecondary, lineHeight: 26,
    minHeight: 400, paddingBottom: Spacing.xxxl,
  },
});
