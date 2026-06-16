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
import { DocumentCard, DocumentForm } from '../components/documents/index';
import { Button, EmptyState, LoadingOverlay } from '../components/ui/index';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';
import type { Document, DocumentInput, DocumentCategory } from '../types';

type FilterTab = 'all' | DocumentCategory;

const TABS: { key: FilterTab; label: string; emoji: string }[] = [
  { key: 'all', label: 'Tous', emoji: '📁' },
  { key: 'invoice', label: 'Factures', emoji: '🧾' },
  { key: 'receipt', label: 'Reçus', emoji: '🏷️' },
  { key: 'delivery', label: 'Livraisons', emoji: '🚚' },
  { key: 'manual', label: 'Manuels', emoji: '📖' },
  { key: 'part', label: 'Pièces', emoji: '🔩' },
  { key: 'other', label: 'Autres', emoji: '📄' },
];

export function DocumentsScreen() {
  const {
    documents,
    loadingDocuments,
    refreshDocuments,
    addDocument,
    editDocument,
    archiveDocument,
  } = useApp();

  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = documents;
    if (tab !== 'all') list = list.filter((d) => d.category === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.notes ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [documents, tab, search]);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshDocuments();
    setRefreshing(false);
  }

  async function handleSave(
    input: DocumentInput,
    photo?: { uri: string; mimeType?: string },
  ) {
    if (editingDoc) {
      await editDocument(editingDoc.id, input);
    } else {
      await addDocument(input, photo);
    }
  }

  function handleEdit(doc: Document) {
    setEditingDoc(doc);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditingDoc(null);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="📷" variant="secondary" size="sm" onPress={() => setShowForm(true)} />
          <Button label="+ Ajouter" size="sm" onPress={() => setShowForm(true)} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un document…"
          placeholderTextColor={COLORS.textLight}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category tabs */}
      <View style={{ marginBottom: SPACING.md }}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          contentContainerStyle={{ paddingHorizontal: SPACING.xl, gap: 8 }}
          renderItem={({ item }) => {
            const count = item.key === 'all'
              ? documents.length
              : documents.filter((d) => d.category === item.key).length;
            return (
              <TouchableOpacity
                style={[styles.tab, tab === item.key && styles.tabActive]}
                onPress={() => setTab(item.key)}
              >
                <Text style={{ fontSize: 14 }}>{item.emoji}</Text>
                <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabCount, tab === item.key && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, tab === item.key && { color: '#fff' }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
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
            icon={search ? '🔍' : '📄'}
            title={search ? 'Aucun résultat' : 'Aucun document'}
            subtitle={
              search
                ? `Aucun document ne correspond à « ${search} »`
                : 'Ajoutez votre premier document en photographiant ou important une image.'
            }
            action={
              !search
                ? { label: '+ Ajouter un document', onPress: () => setShowForm(true) }
                : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <DocumentCard
            doc={item}
            onEdit={handleEdit}
            onArchive={archiveDocument}
          />
        )}
      />

      <DocumentForm
        visible={showForm}
        onClose={handleClose}
        onSave={handleSave}
        initialValues={editingDoc ?? undefined}
      />

      {loadingDocuments && !refreshing && <LoadingOverlay />}
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
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
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
