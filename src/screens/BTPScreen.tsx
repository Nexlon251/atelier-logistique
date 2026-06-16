import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AppButton, AppCard, AppField, Badge } from '../components/primitives';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';
import { GanttBar } from '../components/GanttBar';
import type { SectorType } from '../types';

interface WorksiteTask {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'planifié' | 'terminé' | 'en retard';
}

interface Worksite {
  id: string;
  name: string;
  address: string;
  start_date: string;
  end_date: string;
  status: 'en cours' | 'terminé' | 'en retard';
  budget: number;
  spent: number;
  tasks: WorksiteTask[];
}

const INITIAL_WORKSITES: Worksite[] = [
  {
    id: 'w1',
    name: 'Extension atelier',
    address: '12 rue des Artisans',
    start_date: '2026-06-01',
    end_date: '2026-07-15',
    status: 'en cours',
    budget: 12000,
    spent: 6200,
    tasks: [
      { id: 't1', name: 'Terrassement', start_date: '2026-06-01', end_date: '2026-06-08', status: 'terminé' },
      { id: 't2', name: 'Fondations', start_date: '2026-06-09', end_date: '2026-06-20', status: 'en retard' },
      { id: 't3', name: 'Charpente', start_date: '2026-06-21', end_date: '2026-07-05', status: 'planifié' },
    ],
  },
];

export function BTPScreen() {
  const [worksites, setWorksites] = useState<Worksite[]>(INITIAL_WORKSITES);
  const [selectedId, setSelectedId] = useState<string | null>('w1');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-31');
  const [budget, setBudget] = useState('0');
  const [showForm, setShowForm] = useState(false);

  const selectedWorksite = worksiteById(worksites, selectedId);
  const activeWorksites = worksites.filter((worksite) => worksite.status !== 'terminé');

  function worksiteById(items: Worksite[], id: string | null) {
    return items.find((item) => item.id === id) ?? items[0] ?? null;
  }

  const progress = useMemo(() => {
    if (!selectedWorksite) return 0;
    const completed = selectedWorksite.tasks.filter((task) => task.status === 'terminé').length;
    return selectedWorksite.tasks.length ? Math.round((completed / selectedWorksite.tasks.length) * 100) : 0;
  }, [selectedWorksite]);

  function addWorksite() {
    if (!name.trim() || !address.trim()) return;
    const nextWorksite: Worksite = {
      id: `w-${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      start_date: startDate,
      end_date: endDate,
      status: 'en cours',
      budget: Number(budget) || 0,
      spent: 0,
      tasks: [],
    };
    setWorksites((prev) => [nextWorksite, ...prev]);
    setName('');
    setAddress('');
    setBudget('0');
    setShowForm(false);
    setSelectedId(nextWorksite.id);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Chantiers</Text>
        <AppButton label="Nouveau chantier" onPress={() => setShowForm((value) => !value)} compact />
      </View>

      {showForm && (
        <AppCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Nouveau chantier</Text>
          <AppField label="Nom" value={name} onChangeText={setName} />
          <AppField label="Adresse" value={address} onChangeText={setAddress} />
          <AppField label="Début" value={startDate} onChangeText={setStartDate} />
          <AppField label="Fin" value={endDate} onChangeText={setEndDate} />
          <AppField label="Budget" value={budget} onChangeText={setBudget} keyboardType="numeric" />
          <AppButton label="Créer" onPress={addWorksite} />
        </AppCard>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chantiers actifs</Text>
        {activeWorksites.map((worksite) => (
          <TouchableOpacity key={worksite.id} onPress={() => setSelectedId(worksite.id)}>
            <AppCard style={[styles.worksiteCard, selectedWorksite?.id === worksite.id ? styles.worksiteActive : null]}>
              <View style={styles.worksiteHeader}>
                <Text style={styles.worksiteName}>{worksite.name}</Text>
                <Badge label={worksite.status} tone={worksite.status === 'terminé' ? 'success' : worksite.status === 'en retard' ? 'danger' : 'warning'} />
              </View>
              <Text style={styles.worksiteMeta}>{worksite.address}</Text>
              <Text style={styles.worksiteMeta}>Budget utilisé {worksite.spent}€ / {worksite.budget}€</Text>
            </AppCard>
          </TouchableOpacity>
        ))}
      </View>

      {selectedWorksite && (
        <AppCard style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selectedWorksite.name}</Text>
          <Text style={styles.detailMeta}>{selectedWorksite.address}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Progression</Text>
            <Text style={styles.detailValue}>{progress}%</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Période</Text>
            <Text style={styles.detailValue}>{selectedWorksite.start_date} → {selectedWorksite.end_date}</Text>
          </View>
          <View style={styles.ganttWrapper}>
            {selectedWorksite.tasks.map((task) => (
              <GanttBar
                key={task.id}
                label={task.name}
                startDate={task.start_date}
                endDate={task.end_date}
                timelineStart={selectedWorksite.start_date}
                timelineEnd={selectedWorksite.end_date}
                status={task.status}
              />
            ))}
          </View>
        </AppCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, paddingBottom: SPACING['4xl'] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  formCard: { marginBottom: SPACING.md },
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: SPACING.sm, color: COLORS.text },
  worksiteCard: { marginBottom: SPACING.sm },
  worksiteActive: { borderColor: COLORS.primary, borderWidth: 1 },
  worksiteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  worksiteName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  worksiteMeta: { color: COLORS.textSecondary, marginTop: SPACING.xs },
  detailCard: { marginBottom: SPACING.md },
  detailTitle: { fontSize: 18, fontWeight: '800', marginBottom: SPACING.xs, color: COLORS.text },
  detailMeta: { color: COLORS.textSecondary, marginBottom: SPACING.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  detailLabel: { color: COLORS.textSecondary, fontSize: 13 },
  detailValue: { color: COLORS.text, fontWeight: '600' },
  ganttWrapper: { marginTop: SPACING.sm },
});
