import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { PartCard, MovementModal, PartForm } from '../components/stock/index';
import { Button, EmptyState, LoadingOverlay } from '../components/ui/index';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';
import type { Part, PartInput, MovementType } from '../types';

// expo-camera : disponible uniquement sur native (iOS / Android)
// Sur web, le bouton scan est désactivé et la saisie manuelle prend le relais.
let CameraView: React.ComponentType<any> | null = null;
let useCameraPermissions: (() => [any, () => Promise<any>]) | null = null;
if (Platform.OS !== 'web') {
  try {
    const cam = require('expo-camera');
    CameraView = cam.CameraView;
    useCameraPermissions = cam.useCameraPermissions;
  } catch {
    // expo-camera non dispo — fallback silencieux
  }
}

type FilterTab = 'all' | 'alert' | 'ok';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tout le stock' },
  { key: 'alert', label: '⚠️ Alertes' },
  { key: 'ok', label: '✅ OK' },
];

// ─── Hook permissions caméra (no-op sur web) ──────────────────────────────────
function useScanPermission() {
  if (useCameraPermissions) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useCameraPermissions();
  }
  return [null, async () => {}] as const;
}

// ─── Composant scanner ────────────────────────────────────────────────────────
interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}

function ScannerModal({ visible, onClose, onScanned }: ScannerModalProps) {
  const [permission, requestPermission] = useScanPermission();
  const [scanned, setScanned] = useState(false);

  // Réinitialiser l'état scanned à chaque ouverture
  React.useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  if (!CameraView) return null;

  function handleBarcode({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
    onClose();
  }

  const content = () => {
    if (!permission) {
      return (
        <View style={scanStyles.center}>
          <Text style={scanStyles.text}>Vérification des permissions…</Text>
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={scanStyles.center}>
          <Text style={scanStyles.title}>Accès caméra requis</Text>
          <Text style={scanStyles.text}>
            L'application a besoin de la caméra pour scanner les codes-barres.
          </Text>
          <TouchableOpacity style={scanStyles.btn} onPress={requestPermission}>
            <Text style={scanStyles.btnText}>Autoriser la caméra</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[scanStyles.btn, scanStyles.btnSecondary]} onPress={onClose}>
            <Text style={[scanStyles.btnText, { color: COLORS.textMuted }]}>Annuler</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'qr', 'code39'] }}
          onBarcodeScanned={scanned ? undefined : handleBarcode}
        />
        {/* Viseur */}
        <View style={scanStyles.overlay}>
          <View style={scanStyles.viewfinder} />
          <Text style={scanStyles.hint}>
            {scanned ? '✅ Code détecté…' : 'Pointez sur un code-barres ou QR code'}
          </Text>
        </View>
        {/* Bouton fermer */}
        <SafeAreaView style={scanStyles.closeWrap}>
          <TouchableOpacity style={scanStyles.closeBtn} onPress={onClose}>
            <Text style={scanStyles.closeBtnText}>✕ Fermer</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {content()}
      </View>
    </Modal>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export function StockScreen() {
  const {
    parts,
    movements,
    loadingStock,
    refreshStock,
    addPart,
    editPart,
    archivePart,
    recordMovement,
  } = useApp();

  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [movementPart, setMovementPart] = useState<Part | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const filtered = useMemo(() => {
    let list = parts;
    if (tab === 'alert') list = list.filter((p) => p.quantity <= p.alert_threshold);
    if (tab === 'ok') list = list.filter((p) => p.quantity > p.alert_threshold);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.reference ?? '').toLowerCase().includes(q) ||
          (p.location ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const aAlert = a.quantity <= a.alert_threshold ? 0 : 1;
      const bAlert = b.quantity <= b.alert_threshold ? 0 : 1;
      if (aAlert !== bAlert) return aAlert - bAlert;
      return a.name.localeCompare(b.name);
    });
  }, [parts, tab, search]);

  const alertCount = parts.filter((p) => p.quantity <= p.alert_threshold).length;
  const outCount = parts.filter((p) => p.quantity === 0).length;

  async function handleRefresh() {
    setRefreshing(true);
    await refreshStock();
    setRefreshing(false);
  }

  async function handleSavePart(input: PartInput) {
    if (editingPart) {
      await editPart(editingPart.id, input);
    } else {
      await addPart(input);
    }
  }

  async function handleRecordMovement(
    partId: string,
    type: MovementType,
    quantity: number,
    reason?: string,
  ) {
    await recordMovement(partId, type, quantity, reason);
  }

  function handleEditPart(part: Part) {
    setEditingPart(part);
    setShowPartForm(true);
  }

  function handleClosePartForm() {
    setShowPartForm(false);
    setEditingPart(null);
  }

  function handleScanned(code: string) {
    setSearch(code);
    setTab('all');
  }

  const canScan = Platform.OS !== 'web' && CameraView !== null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Stock</Text>
          <Text style={styles.subtitle}>
            {parts.length} référence{parts.length !== 1 ? 's' : ''}
            {alertCount > 0 ? ` · ${alertCount} alerte${alertCount > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
        <Button label="+ Pièce" size="sm" onPress={() => setShowPartForm(true)} />
      </View>

      {/* Stat bar */}
      {(alertCount > 0 || outCount > 0) && (
        <View style={styles.statBar}>
          {outCount > 0 && (
            <View style={[styles.statChip, { backgroundColor: COLORS.dangerLight }]}>
              <Text style={[styles.statChipText, { color: COLORS.danger }]}>
                🚨 {outCount} rupture{outCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {alertCount > outCount && (
            <View style={[styles.statChip, { backgroundColor: COLORS.warningLight }]}>
              <Text style={[styles.statChipText, { color: COLORS.warning }]}>
                ⚠️ {alertCount - outCount} stock{alertCount - outCount > 1 ? 's' : ''} bas
              </Text>
            </View>
          )}
          <View style={[styles.statChip, { backgroundColor: COLORS.successLight }]}>
            <Text style={[styles.statChipText, { color: COLORS.success }]}>
              ✅ {parts.length - alertCount} OK
            </Text>
          </View>
        </View>
      )}

      {/* Search + bouton scan */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, référence, emplacement…"
          placeholderTextColor={COLORS.textLight}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          style={[styles.scanBtn, !canScan && styles.scanBtnDisabled]}
          onPress={canScan ? () => setShowScanner(true) : undefined}
          activeOpacity={canScan ? 0.7 : 1}
          accessibilityLabel="Scanner un code-barres"
          accessibilityHint={canScan ? 'Ouvre la caméra pour scanner' : 'Scan disponible sur mobile uniquement'}
        >
          <Text style={[styles.scanBtnIcon, !canScan && styles.scanBtnIconDisabled]}>
            📷
          </Text>
        </TouchableOpacity>
      </View>

      {/* Indicateur scan actif */}
      {search.length > 0 && (
        <View style={styles.scanBadgeRow}>
          <View style={styles.scanBadge}>
            <Text style={styles.scanBadgeText}>🔎 Recherche : "{search}"</Text>
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.scanBadgeClear}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => {
          const count =
            t.key === 'all'
              ? parts.length
              : t.key === 'alert'
              ? alertCount
              : parts.length - alertCount;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabCount, tab === t.key && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, tab === t.key && { color: '#fff' }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={search ? '🔍' : tab === 'alert' ? '✅' : '📦'}
            title={
              search
                ? 'Aucun résultat'
                : tab === 'alert'
                ? 'Aucune alerte stock'
                : 'Aucune pièce en stock'
            }
            subtitle={
              search
                ? 'Aucune pièce ne correspond à ce code ou cette référence.'
                : tab === 'all'
                ? 'Ajoutez vos premières pièces pour suivre votre stock.'
                : tab === 'alert'
                ? "Tous vos stocks sont au-dessus du seuil d'alerte."
                : undefined
            }
            action={
              !search && tab === 'all'
                ? { label: '+ Ajouter une pièce', onPress: () => setShowPartForm(true) }
                : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <PartCard
            part={item}
            movements={movements}
            onEdit={handleEditPart}
            onArchive={archivePart}
            onMovement={(p) => setMovementPart(p)}
          />
        )}
      />

      {/* Modals */}
      <PartForm
        visible={showPartForm}
        onClose={handleClosePartForm}
        onSave={handleSavePart}
        initialValues={editingPart ?? undefined}
      />

      <MovementModal
        visible={!!movementPart}
        part={movementPart}
        onClose={() => setMovementPart(null)}
        onRecord={handleRecordMovement}
      />

      <ScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleScanned}
      />

      {loadingStock && !refreshing && <LoadingOverlay />}
    </View>
  );
}

// ─── Styles écran principal ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  statBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  statChipText: { fontSize: 12, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10 },
  scanBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginLeft: 4,
  },
  scanBtnDisabled: { opacity: 0.3 },
  scanBtnIcon: { fontSize: 20 },
  scanBtnIconDisabled: {},
  scanBadgeRow: {
    paddingHorizontal: SPACING.xl,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight ?? COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scanBadgeText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  scanBadgeClear: { fontSize: 12, color: COLORS.textMuted, paddingLeft: 8 },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive: { color: '#fff', fontWeight: '700' },
  tabCount: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
});

// ─── Styles scanner modal ─────────────────────────────────────────────────────
const scanStyles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#111',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 12, textAlign: 'center' },
  text: { fontSize: 15, color: '#aaa', textAlign: 'center', marginBottom: 24 },
  btn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  btnSecondary: { backgroundColor: '#222' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 260,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  hint: {
    marginTop: 20,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 32,
  },
  closeBtn: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
