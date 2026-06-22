import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { Download, Trash2, Check, Cpu, CircleStop } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { llamaService, MODELS, type ModelMeta, type DownloadState } from '../lib/llamaService';

/**
 * On-device model manager. Lets the user download a GGUF model and activate it
 * so the assistant runs a real LLM fully offline. Native (Android/iOS) only —
 * on web it explains that the installed app is required.
 */
export default function ModelManager() {
  const [downloaded, setDownloaded] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(llamaService.getLoadedModelId());
  const [dl, setDl] = useState<DownloadState | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setDownloaded(await llamaService.getDownloadedModels());
    setActiveId(llamaService.getLoadedModelId());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isNativeReady = llamaService.isAvailable();

  const onDownload = (m: ModelMeta) => {
    setBusy(m.id);
    llamaService.downloadModel(
      m,
      (state) => setDl(state),
      async () => { setDl(null); setBusy(null); await refresh(); },
      (msg) => { setDl(null); setBusy(null); Alert.alert('Download', msg); }
    );
  };

  const onCancel = async () => {
    await llamaService.cancelDownload();
    setDl(null);
    setBusy(null);
  };

  const onActivate = async (m: ModelMeta) => {
    setLoadingId(m.id);
    try {
      await llamaService.load(m);
      setActiveId(m.id);
    } catch (e: any) {
      Alert.alert('Activate model', e?.message ?? 'Could not load model');
    } finally {
      setLoadingId(null);
    }
  };

  const onDelete = (m: ModelMeta) => {
    Alert.alert('Delete model', `Remove ${m.name} (${m.sizeMB} MB) from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await llamaService.deleteModel(m);
          await refresh();
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Cpu color={Colors.secondary} size={16} />
        <Text style={styles.title}>On-Device AI Model</Text>
      </View>
      <Text style={styles.subtitle}>
        Download a model once, then it runs 100% offline & private on your phone — no internet, no cloud.
      </Text>

      {Platform.OS === 'web' && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            On-device AI needs the installed Android app. Build the APK (see README) — it won't run in this web preview.
          </Text>
        </View>
      )}
      {Platform.OS !== 'web' && !isNativeReady && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            The on-device engine (llama.rn) isn't in this build. Run an EAS build with the native module to enable it.
          </Text>
        </View>
      )}

      {MODELS.map((m) => {
        const isDownloaded = downloaded.includes(m.id);
        const isActive = activeId === m.id;
        const isThisDownloading = dl?.modelId === m.id;
        const isThisLoading = loadingId === m.id;
        return (
          <View key={m.id} style={[styles.card, isActive && styles.cardActive]}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{m.name}</Text>
                  <View style={[styles.tier, { backgroundColor: m.tierColor + '22', borderColor: m.tierColor }]}>
                    <Text style={[styles.tierText, { color: m.tierColor }]}>{m.tier}</Text>
                  </View>
                </View>
                <Text style={styles.sub}>{m.subtitle} · {m.sizeMB >= 1000 ? (m.sizeMB / 1000).toFixed(1) + ' GB' : m.sizeMB + ' MB'}</Text>
              </View>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Check color={Colors.secondary} size={14} />
                  <Text style={styles.activeText}>Active</Text>
                </View>
              )}
            </View>

            {isThisDownloading ? (
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.round((dl?.progress ?? 0) * 100)}%` }]} />
                </View>
                <Text style={styles.progressText}>{dl?.downloadedMB}/{dl?.totalMB} MB</Text>
                <TouchableOpacity onPress={onCancel} style={styles.iconBtn}>
                  <CircleStop color={Colors.error} size={18} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actions}>
                {!isDownloaded ? (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
                    disabled={!!busy}
                    onPress={() => onDownload(m)}
                  >
                    <Download color="#fff" size={15} />
                    <Text style={styles.btnText}>Download</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.btn, isActive ? styles.btnGhost : styles.btnPrimary]}
                      disabled={isActive || isThisLoading}
                      onPress={() => onActivate(m)}
                    >
                      {isThisLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.btnText, isActive && { color: Colors.textSecondary }]}>
                          {isActive ? 'In use' : 'Activate'}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => onDelete(m)}>
                      <Trash2 color={Colors.textTertiary} size={18} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSizes.sm, marginBottom: Spacing.md, lineHeight: 18 },
  notice: { backgroundColor: Colors.accent + '15', borderColor: Colors.accent, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  noticeText: { color: Colors.accentLight, fontSize: FontSizes.sm, lineHeight: 18 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  cardActive: { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '10' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '600' },
  tier: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, borderWidth: 1 },
  tierText: { fontSize: FontSizes.xs, fontWeight: '700' },
  sub: { color: Colors.textTertiary, fontSize: FontSizes.sm, marginTop: 2 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeText: { color: Colors.secondary, fontSize: FontSizes.xs, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, flex: 1 },
  btnPrimary: { backgroundColor: Colors.primary },
  btnGhost: { backgroundColor: Colors.surfaceLight },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '600' },
  iconBtn: { padding: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceLight },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  progressBar: { flex: 1, height: 8, backgroundColor: Colors.backgroundTertiary, borderRadius: BorderRadius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: BorderRadius.full },
  progressText: { color: Colors.textSecondary, fontSize: FontSizes.xs, minWidth: 70, textAlign: 'right' },
});
