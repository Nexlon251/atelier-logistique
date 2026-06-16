import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { PartCard, MovementModal, PartForm } from '../components/stock/index';
import { Button, EmptyState, LoadingOverlay } from '../components/ui/index';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';
import type { Part, PartInput, MovementType } from '../types';

type FilterTab = 'all' | 'alert' | 'ok';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tout le stock' },
  { key: 'alert', label: '⚠️ Alertes' },
  { key: 'ok', label: '✅ OK' },
];

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
      // Alerts first
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

      {/* Search */}
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
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => {
          const count = t.key === 'all'
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
                ? undefined
                : tab === 'all'
                ? 'Ajoutez vos premières pièces pour suivre votre stock.'
                : tab === 'alert'
                ? 'Tous vos stocks sont au-dessus du seuil d\'alerte.'
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

      {loadingStock && !refreshing && <LoadingOverlay />}
    </View>
  );
}

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
  statChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
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
