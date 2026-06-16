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
import { TaskCard, TaskForm } from '../components/tasks/index';
import { Button, EmptyState, LoadingOverlay } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';
import type { Task, TaskInput, TaskStatus } from '../types';

type FilterTab = 'all' | 'todo' | 'in_progress' | 'done';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'todo', label: 'À faire' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'done', label: 'Terminées' },
];

export function TasksScreen() {
  const {
    tasks,
    loadingTasks,
    refreshTasks,
    addTask,
    editTask,
    archiveTask,
  } = useApp();

  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = tasks;
    if (tab !== 'all') list = list.filter((t) => t.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q),
      );
    }
    // Sort: high priority first, then by date
    return [...list].sort((a, b) => {
      const pp = { high: 0, medium: 1, low: 2 };
      if (pp[a.priority] !== pp[b.priority]) return pp[a.priority] - pp[b.priority];
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, tab, search]);

  const counts = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }), [tasks]);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshTasks();
    setRefreshing(false);
  }

  async function handleSave(input: TaskInput) {
    if (editingTask) {
      await editTask(editingTask.id, input);
    } else {
      await addTask(input);
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingTask(null);
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    await editTask(id, { status });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tâches</Text>
          <Text style={styles.subtitle}>
            {tasks.length} tâche{tasks.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Button
          label="+ Nouvelle"
          onPress={() => setShowForm(true)}
          size="sm"
        />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher une tâche…"
          placeholderTextColor={COLORS.textLight}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsWrap}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          contentContainerStyle={{ paddingHorizontal: SPACING.xl, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, tab === item.key && styles.tabActive]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
                {item.label}
              </Text>
              <View style={[styles.tabCount, tab === item.key && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, tab === item.key && { color: '#fff' }]}>
                  {counts[item.key]}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={search ? '🔍' : tab === 'done' ? '🎉' : '📋'}
            title={
              search
                ? 'Aucun résultat'
                : tab === 'done'
                ? 'Aucune tâche terminée'
                : 'Aucune tâche'
            }
            subtitle={
              search
                ? `Aucune tâche ne correspond à « ${search} »`
                : tab === 'all'
                ? 'Créez votre première tâche pour commencer.'
                : undefined
            }
            action={
              !search && tab === 'all'
                ? { label: '+ Créer une tâche', onPress: () => setShowForm(true) }
                : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onEdit={handleEdit}
            onArchive={archiveTask}
            onStatusChange={handleStatusChange}
          />
        )}
      />

      {/* Form modal */}
      <TaskForm
        visible={showForm}
        onClose={handleCloseForm}
        onSave={handleSave}
        initialValues={editingTask ?? undefined}
      />

      {loadingTasks && !refreshing && <LoadingOverlay />}
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
    ...SHADOW.sm,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10 },
  tabsWrap: { marginBottom: SPACING.md },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive: { color: '#fff', fontWeight: '700' },
  tabCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  list: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 100,
  },
});
