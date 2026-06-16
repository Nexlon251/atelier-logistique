import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppButton, AppCard, AppField, Badge } from '../components/primitives';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';

interface Machine {
  id: string;
  name: string;
  reference: string;
  location: string;
  install_date: string;
  last_maintenance: string;
  next_maintenance: string;
  status: 'opérationnel' | 'en panne' | 'maintenance';
}

interface MaintenanceLog {
  id: string;
  machine_id: string;
  type: 'préventive' | 'corrective';
  description: string;
  technician: string;
  duration_minutes: number;
  parts_used: string[];
  date: string;
}

const INITIAL_MACHINES: Machine[] = [
  {
    id: 'm1',
    name: 'Presse hydraulique',
    reference: 'PH-200',
    location: 'Atelier 1',
    install_date: '2022-08-01',
    last_maintenance: '2026-05-10',
    next_maintenance: '2026-06-20',
    status: 'opérationnel',
  },
  {
    id: 'm2',
    name: 'Convoyeur',
    reference: 'CV-12',
    location: 'Atelier 2',
    install_date: '2023-01-15',
    last_maintenance: '2026-04-01',
    next_maintenance: '2026-05-30',
    status: 'en panne',
  },
];

const INITIAL_LOGS: MaintenanceLog[] = [
  {
    id: 'log1',
    machine_id: 'm1',
    type: 'préventive',
    description: 'Contrôle des pistons',
    technician: 'Anna',
    duration_minutes: 45,
    parts_used: ['Joint', 'Huile'],
    date: '2026-05-10',
  },
];

export function IndustrieScreen() {
  const [machines] = useState<Machine[]>(INITIAL_MACHINES);
  const [logs, setLogs] = useState<MaintenanceLog[]>(INITIAL_LOGS);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('m1');
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [technician, setTechnician] = useState('');
  const [duration, setDuration] = useState('0');
  const [partsUsed, setPartsUsed] = useState('');

  const selectedMachine = machines.find((machine) => machine.id === selectedMachineId) ?? machines[0];

  const overdue = new Date(selectedMachine.next_maintenance) < new Date();

  const mtbf = useMemo(() => {
    const failures = logs.filter((log) => log.machine_id === selectedMachine.id && log.type === 'corrective').length;
    return failures ? Math.round(365 / failures) : 365;
  }, [logs, selectedMachine.id]);

  const availability = overdue ? 82 : 98;

  function addLog() {
    if (!description.trim() || !technician.trim()) return;
    const next: MaintenanceLog = {
      id: `log-${Date.now()}`,
      machine_id: selectedMachine.id,
      type: 'préventive',
      description: description.trim(),
      technician: technician.trim(),
      duration_minutes: Number(duration) || 0,
      parts_used: partsUsed.split(',').map((item) => item.trim()).filter(Boolean),
      date: new Date().toISOString().slice(0, 10),
    };
    setLogs((prev) => [next, ...prev]);
    setDescription('');
    setTechnician('');
    setDuration('0');
    setPartsUsed('');
    setShowForm(false);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Machines</Text>
      <View style={styles.indicatorRow}>
        <AppCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>MTBF</Text>
          <Text style={styles.metricValue}>{mtbf} jours</Text>
        </AppCard>
        <AppCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>Disponibilité</Text>
          <Text style={styles.metricValue}>{availability}%</Text>
        </AppCard>
      </View>

      {machines.map((machine) => (
        <TouchableOpacity key={machine.id} onPress={() => setSelectedMachineId(machine.id)}>
          <AppCard style={[styles.machineCard, selectedMachineId === machine.id ? styles.machineActive : null]}>
            <View style={styles.machineHeader}>
              <Text style={styles.machineName}>{machine.name}</Text>
              <Badge label={machine.status} tone={machine.status === 'opérationnel' ? 'success' : machine.status === 'en panne' ? 'danger' : 'warning'} />
            </View>
            <Text style={styles.machineMeta}>{machine.reference} · {machine.location}</Text>
          </AppCard>
        </TouchableOpacity>
      ))}

      <AppCard style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.sectionTitle}>{selectedMachine.name}</Text>
          <AppButton label={showForm ? 'Annuler' : 'Nouvel entretien'} onPress={() => setShowForm((value) => !value)} compact />
        </View>
        <Text style={styles.detailMeta}>Prochaine maintenance {selectedMachine.next_maintenance}</Text>
        <Text style={[styles.detailMeta, overdue ? styles.overdueText : null]}>
          {overdue ? 'Maintenance dépassée' : 'Maintenance planifiée'}
        </Text>

        {showForm ? (
          <View>
            <AppField label="Description" value={description} onChangeText={setDescription} />
            <AppField label="Technicien" value={technician} onChangeText={setTechnician} />
            <AppField label="Durée (min)" value={duration} onChangeText={setDuration} keyboardType="numeric" />
            <AppField label="Pièces utilisées" value={partsUsed} onChangeText={setPartsUsed} placeholder="Séparer par des virgules" />
            <AppButton label="Enregistrer" onPress={addLog} />
          </View>
        ) : (
          logs.filter((log) => log.machine_id === selectedMachine.id).map((log) => (
            <AppCard key={log.id} style={styles.logCard}>
              <Text style={styles.logTitle}>{log.type} · {log.date}</Text>
              <Text style={styles.logMeta}>{log.description}</Text>
              <Text style={styles.logMeta}>Technicien {log.technician} · {log.duration_minutes} min</Text>
            </AppCard>
          ))
        )}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, paddingBottom: SPACING['4xl'] },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  indicatorRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  metricCard: { flex: 1, padding: SPACING.md },
  metricLabel: { color: COLORS.textSecondary, marginBottom: SPACING.xs },
  metricValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  machineCard: { marginBottom: SPACING.sm },
  machineActive: { borderColor: COLORS.primary, borderWidth: 1 },
  machineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  machineName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  machineMeta: { color: COLORS.textSecondary, marginTop: SPACING.xs },
  detailCard: { marginTop: SPACING.md, padding: SPACING.lg },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  detailMeta: { color: COLORS.textSecondary, marginBottom: SPACING.xs },
  overdueText: { color: COLORS.danger },
  logCard: { marginBottom: SPACING.sm, backgroundColor: COLORS.surface, padding: SPACING.md },
  logTitle: { fontWeight: '700', color: COLORS.text },
  logMeta: { color: COLORS.textSecondary, marginTop: SPACING.xs },
});
