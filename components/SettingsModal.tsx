import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, Check, Eye, EyeOff, Wifi, WifiOff, Brain, Key, Server,
  Volume2, Mic, Trash2, Plus, ChevronDown, ChevronUp, Zap,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import {
  saveApiKey, loadApiKeys, getOllamaConfig, saveOllamaConfig,
  testOllamaConnection, getMemory, addMemory, deleteMemory, MemoryItem,
} from '../lib/ai';
import { storage } from '../lib/storage';

const MODELS = [
  { id: 'free', label: 'Free AI', desc: 'No key needed — Pollinations.ai', color: Colors.success },
  { id: 'ollama', label: 'Ollama', desc: 'Local AI on your PC over Wi-Fi', color: Colors.primary },
  { id: 'gemini', label: 'Gemini', desc: 'Google Gemini 1.5 Flash', color: '#4285F4' },
  { id: 'groq', label: 'Groq', desc: 'Llama 3.1 70B — ultra fast', color: '#F59E0B' },
  { id: 'openai', label: 'OpenAI', desc: 'GPT-4o Mini', color: '#10B981' },
  { id: 'claude', label: 'Claude', desc: 'Claude Haiku — Anthropic', color: '#CC785C' },
];

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  voiceEnabled: boolean;
  onVoiceToggle: (v: boolean) => void;
  activeTab?: 'general' | 'api' | 'voice' | 'memory';
}

export default function SettingsModal({
  visible, onClose, selectedModel, onModelChange,
  voiceEnabled, onVoiceToggle, activeTab = 'general',
}: SettingsModalProps) {
  const [tab, setTab] = useState<'general' | 'api' | 'voice' | 'memory'>(activeTab);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [ollamaUrl, setOllamaUrl] = useState('http://192.168.1.100:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaTesting, setOllamaTesting] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState('');
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemVal, setNewMemVal] = useState('');
  const [addingMem, setAddingMem] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(true);

  useEffect(() => {
    if (visible) {
      setTab(activeTab);
      loadApiKeys().then(setApiKeys);
      getOllamaConfig().then(cfg => { setOllamaUrl(cfg.url); setOllamaModel(cfg.model); });
      getMemory().then(setMemory);
      storage.getJSON<boolean>('vexora:auto_switch', true).then(v => setAutoSwitch(v));
    }
  }, [visible, activeTab]);

  const saveKey = async (model: string) => {
    setSaving(p => ({ ...p, [model]: true }));
    await saveApiKey(model, apiKeys[model] ?? '');
    setSaving(p => ({ ...p, [model]: false }));
    setSaved(p => ({ ...p, [model]: true }));
    setTimeout(() => setSaved(p => ({ ...p, [model]: false })), 2000);
  };

  const testOllama = async () => {
    setOllamaTesting(true);
    setOllamaStatus('');
    try {
      await saveOllamaConfig(ollamaUrl, ollamaModel);
      const models = await testOllamaConnection(ollamaUrl);
      setOllamaModels(models);
      setOllamaStatus(`Connected! ${models.length} model${models.length !== 1 ? 's' : ''} found.`);
    } catch (e: any) {
      setOllamaStatus(`Error: ${e.message}`);
    } finally {
      setOllamaTesting(false);
    }
  };

  const saveAutoSwitch = async (v: boolean) => {
    setAutoSwitch(v);
    await storage.setJSON('vexora:auto_switch', v);
  };

  const addMem = async () => {
    if (!newMemKey.trim() || !newMemVal.trim()) return;
    await addMemory(newMemKey.trim(), newMemVal.trim());
    setNewMemKey('');
    setNewMemVal('');
    setAddingMem(false);
    setMemory(await getMemory());
  };

  const deleteMem = async (id: string) => {
    await deleteMemory(id);
    setMemory(await getMemory());
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'api', label: 'AI Keys' },
    { id: 'voice', label: 'Voice' },
    { id: 'memory', label: 'Memory' },
  ] as const;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, tab === t.id && styles.tabActive]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* GENERAL */}
          {tab === 'general' && (
            <View style={styles.section}>
              <SectionTitle title="AI Model" icon={<Zap color={Colors.primary} size={16} />} />
              {MODELS.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modelRow, selectedModel === m.id && styles.modelRowActive]}
                  onPress={() => onModelChange(m.id)}
                >
                  <View style={[styles.modelDot, { backgroundColor: m.color }]} />
                  <View style={styles.modelInfo}>
                    <Text style={[styles.modelLabel, selectedModel === m.id && { color: Colors.primary }]}>
                      {m.label}
                    </Text>
                    <Text style={styles.modelDesc}>{m.desc}</Text>
                  </View>
                  {selectedModel === m.id && <Check color={Colors.primary} size={16} />}
                </TouchableOpacity>
              ))}

              <SectionTitle title="Smart Switching" icon={<Wifi color={Colors.primary} size={16} />} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Auto offline/online switching</Text>
                  <Text style={styles.toggleDesc}>Automatically uses offline AI when no internet is available</Text>
                </View>
                <Switch
                  value={autoSwitch}
                  onValueChange={saveAutoSwitch}
                  trackColor={{ false: Colors.border, true: 'rgba(0,212,255,0.4)' }}
                  thumbColor={autoSwitch ? Colors.primary : Colors.textTertiary}
                />
              </View>
            </View>
          )}

          {/* API KEYS */}
          {tab === 'api' && (
            <View style={styles.section}>
              <SectionTitle title="API Keys" icon={<Key color={Colors.primary} size={16} />} />
              <Text style={styles.hint}>Keys are stored securely on your device only.</Text>

              {/* Ollama */}
              <View style={styles.keyCard}>
                <View style={styles.keyCardHeader}>
                  <Server color={Colors.primary} size={18} />
                  <Text style={styles.keyCardTitle}>Ollama (Local AI)</Text>
                </View>
                <Text style={styles.keyCardDesc}>Connect to a local Ollama server on your PC over Wi-Fi</Text>
                <TextInput
                  style={styles.input}
                  value={ollamaUrl}
                  onChangeText={setOllamaUrl}
                  placeholder="http://192.168.1.100:11434"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  value={ollamaModel}
                  onChangeText={setOllamaModel}
                  placeholder="Model name (e.g. llama3.2)"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {ollamaModels.length > 0 && (
                  <View style={styles.modelChips}>
                    {ollamaModels.map(m => (
                      <TouchableOpacity key={m} style={styles.modelChip} onPress={() => setOllamaModel(m)}>
                        <Text style={styles.modelChipText}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {ollamaStatus ? (
                  <Text style={[styles.statusText, ollamaStatus.startsWith('Error') ? styles.errorText : styles.successText]}>
                    {ollamaStatus}
                  </Text>
                ) : null}
                <TouchableOpacity style={styles.testBtn} onPress={testOllama} disabled={ollamaTesting}>
                  {ollamaTesting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.testBtnText}>Test & Connect</Text>}
                </TouchableOpacity>
              </View>

              {/* Per-model keys */}
              {MODELS.filter(m => !['free', 'ollama'].includes(m.id)).map(m => (
                <View key={m.id} style={styles.keyCard}>
                  <View style={styles.keyCardHeader}>
                    <View style={[styles.modelDot, { backgroundColor: m.color }]} />
                    <Text style={styles.keyCardTitle}>{m.label}</Text>
                  </View>
                  <View style={styles.keyInputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      value={apiKeys[m.id] ?? ''}
                      onChangeText={v => setApiKeys(p => ({ ...p, [m.id]: v }))}
                      placeholder={`Enter ${m.label} API key`}
                      placeholderTextColor={Colors.textTertiary}
                      secureTextEntry={!shown[m.id]}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShown(p => ({ ...p, [m.id]: !p[m.id] }))}
                    >
                      {shown[m.id]
                        ? <Eye color={Colors.textTertiary} size={18} />
                        : <EyeOff color={Colors.textTertiary} size={18} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, saved[m.id] && styles.saveBtnDone]}
                      onPress={() => saveKey(m.id)}
                      disabled={saving[m.id]}
                    >
                      {saving[m.id]
                        ? <ActivityIndicator color="#fff" size="small" />
                        : saved[m.id]
                          ? <Check color="#fff" size={16} />
                          : <Text style={styles.saveBtnText}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* VOICE */}
          {tab === 'voice' && (
            <View style={styles.section}>
              <SectionTitle title="Voice Settings" icon={<Mic color={Colors.primary} size={16} />} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Voice output (TTS)</Text>
                  <Text style={styles.toggleDesc}>Vexora speaks AI responses aloud</Text>
                </View>
                <Switch
                  value={voiceEnabled}
                  onValueChange={onVoiceToggle}
                  trackColor={{ false: Colors.border, true: 'rgba(0,212,255,0.4)' }}
                  thumbColor={voiceEnabled ? Colors.primary : Colors.textTertiary}
                />
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Voice input (speech-to-text) is available via the microphone button in the chat. Tap and speak — Vexora transcribes and sends your message automatically.
                </Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  🔒 Voice is processed on-device using Android's built-in speech recognition. Your voice data is not sent to our servers.
                </Text>
              </View>
            </View>
          )}

          {/* MEMORY */}
          {tab === 'memory' && (
            <View style={styles.section}>
              <SectionTitle title="Smart Memory" icon={<Brain color={Colors.primary} size={16} />} />
              <Text style={styles.hint}>
                Memory lets Vexora remember things about you across all conversations.
              </Text>

              {memory.map(item => (
                <View key={item.id} style={styles.memItem}>
                  <View style={styles.memContent}>
                    <Text style={styles.memKey}>{item.key}</Text>
                    <Text style={styles.memVal}>{item.value}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteMem(item.id)} style={styles.memDelete}>
                    <Trash2 color={Colors.error} size={16} />
                  </TouchableOpacity>
                </View>
              ))}

              {memory.length === 0 && !addingMem && (
                <View style={styles.emptyMem}>
                  <Brain color={Colors.textTertiary} size={28} />
                  <Text style={styles.emptyMemText}>No memories yet</Text>
                </View>
              )}

              {addingMem ? (
                <View style={styles.addMemForm}>
                  <TextInput
                    style={styles.input}
                    value={newMemKey}
                    onChangeText={setNewMemKey}
                    placeholder="Category (e.g. Name, Language, Job)"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <TextInput
                    style={styles.input}
                    value={newMemVal}
                    onChangeText={setNewMemVal}
                    placeholder="Value (e.g. Alex, Python developer)"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity style={[styles.testBtn, { flex: 1, backgroundColor: Colors.surface }]} onPress={() => setAddingMem(false)}>
                      <Text style={[styles.testBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.testBtn, { flex: 1 }]} onPress={addMem}>
                      <Text style={styles.testBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.addMemBtn} onPress={() => setAddingMem(true)}>
                  <Plus color={Colors.primary} size={16} />
                  <Text style={styles.addMemText}>Add memory</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      {icon}
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08080F' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg + 4, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, marginRight: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSizes.sm, color: Colors.textTertiary, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  section: { padding: Spacing.lg, gap: Spacing.sm },
  sectionTitle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: 4, marginTop: Spacing.sm,
  },
  sectionTitleText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  hint: { fontSize: FontSizes.sm, color: Colors.textTertiary, lineHeight: 20 },

  // Model list
  modelRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 4,
  },
  modelRowActive: { borderColor: 'rgba(0,212,255,0.35)', backgroundColor: 'rgba(0,212,255,0.06)' },
  modelDot: { width: 10, height: 10, borderRadius: 5 },
  modelInfo: { flex: 1 },
  modelLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  modelDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  toggleLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  toggleDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },

  // Key cards
  keyCard: {
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  keyCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  keyCardTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  keyCardDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  input: {
    backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    color: Colors.text, fontSize: FontSizes.sm, marginBottom: 4,
  },
  keyInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  eyeBtn: {
    width: 40, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: {
    height: 44, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    minWidth: 60,
  },
  saveBtnDone: { backgroundColor: Colors.success },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: FontSizes.sm },
  modelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modelChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    backgroundColor: 'rgba(0,212,255,0.1)', borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)',
  },
  modelChipText: { fontSize: FontSizes.xs, color: Colors.primary },
  testBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
  },
  testBtnText: { color: '#000', fontWeight: '700', fontSize: FontSizes.sm },
  statusText: { fontSize: FontSizes.sm, marginTop: 2 },
  successText: { color: Colors.success },
  errorText: { color: Colors.error },

  // Info
  infoBox: {
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,212,255,0.04)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.12)',
  },
  infoText: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },

  // Memory
  memItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 6,
  },
  memContent: { flex: 1 },
  memKey: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  memVal: { fontSize: FontSizes.sm, color: Colors.text, marginTop: 2 },
  memDelete: { padding: 4 },
  emptyMem: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyMemText: { color: Colors.textTertiary, fontSize: FontSizes.md },
  addMemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', borderStyle: 'dashed',
    justifyContent: 'center',
  },
  addMemText: { color: Colors.primary, fontWeight: '600', fontSize: FontSizes.sm },
  addMemForm: { gap: Spacing.sm },
});
