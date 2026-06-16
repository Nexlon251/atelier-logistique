import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { AppButton, AppCard, AppField, Badge } from '../components/primitives';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  last_service_date: string;
  next_service_km: number;
  archived_at?: string | null;
}

interface Intervention {
  id: string;
  vehicle_id: string;
  type: string;
  description: string;
  date: string;
  cost: number;
  parts_used: string[];
  status: 'devis' | 'en cours' | 'terminé' | 'livré';
}

const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    plate: 'AB-123-CD',
    brand: 'Peugeot',
    model: '208',
    year: 2020,
    km: 48200,
    last_service_date: '2026-02-10',
    next_service_km: 50000,
  },
  {
    id: 'v2',
    plate: 'EF-456-GH',
    brand: 'Renault',
    model: 'Clio',
    year: 2019,
    km: 62000,
    last_service_date: '2025-11-20',
    next_service_km: 65000,
  },
];

const INITIAL_INTERVENTIONS: Intervention[] = [
  {
    id: 'i1',
    vehicle_id: 'v1',
    type: 'Révision',
    description: 'Vidange et filtre',
    date: '2026-05-20',
    cost: 120,
    parts_used: ['Filtre huile', 'Huile 5W30'],
    status: 'terminé',
  },
];

export function GarageScreen() {
  const { parts } = useApp();
  const [vehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [interventions, setInterventions] = useState<Intervention[]>(INITIAL_INTERVENTIONS);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('v1');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('Entretien');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('0');
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [status, setStatus] = useState<'devis' | 'en cours' | 'terminé' | 'livré'>('devis');

  const filteredVehicles = useMemo(() => {
    const query = search.toLowerCase();
    return vehicles.filter(
      (vehicle) =>
        vehicle.plate.toLowerCase().includes(query) ||
        vehicle.brand.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query),
    );
  }, [search, vehicles]);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0];
  const vehicleInterventions = interventions.filter((intervention) => intervention.vehicle_id === selectedVehicle.id);

  function togglePart(partId: string) {
    setSelectedParts((prev) =>
      prev.includes(partId) ? prev.filter((id) => id !== partId) : [...prev, partId],
    );
  }

  function addIntervention() {
    if (!description.trim() || !selectedVehicle) return;
    const next: Intervention = {
      id: `int-${Date.now()}`,
      vehicle_id: selectedVehicle.id,
      type,
      description: description.trim(),
      date: new Date().toISOString().slice(0, 10),
      cost: Number(cost) || 0,
      parts_used: selectedParts.map((id) => parts.find((part) => part.id === id)?.name ?? id),
      status,
    };
    setInterventions((prev) => [next, ...prev]);
    setDescription('');
    setCost('0');
    setSelectedParts([]);
    setStatus('devis');
    setShowForm(false);
  }

  const overdue = selectedVehicle
    ? selectedVehicle.km >= selectedVehicle.next_service_km || new Date(selectedVehicle.last_service_date) < new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    : false;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Garage</Text>
      <AppField label="Recherche" value={search} onChangeText={setSearch} placeholder="Plaque, marque, modèle…" />
      <View style={styles.list}> 
        {filteredVehicles.map((vehicle) => {
          const alert = vehicle.km >= vehicle.next_service_km;
          return (
            <TouchableOpacity key={vehicle.id} onPress={() => setSelectedVehicleId(vehicle.id)}>
              <AppCard style={[styles.vehicleCard, selectedVehicle?.id === vehicle.id ? styles.vehicleActive : null]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.vehicleTitle}>{vehicle.plate}</Text>
                    <Text style={styles.vehicleSub}>{vehicle.brand} {vehicle.model}</Text>
                  </View>
                  <Badge label={alert ? 'Alerte' : 'OK'} tone={alert ? 'danger' : 'success'} />
                </View>
                <Text style={styles.vehicleMeta}>Kilométrage {vehicle.km} km · Prochaine révision {vehicle.next_service_km} km</Text>
              </AppCard>
            </TouchableOpacity>
          );
        })}
      </View>

      <AppCard style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.sectionTitle}>Historique interventions</Text>
          <AppButton label={showForm ? 'Fermer' : 'Nouvelle intervention'} onPress={() => setShowForm((val) => !val)} compact />
        </View>
        {showForm ? (
          <View>
            <AppField label="Type" value={type} onChangeText={setType} />
            <AppField label="Description" value={description} onChangeText={setDescription} />
            <AppField label="Coût" value={cost} onChangeText={setCost} keyboardType="numeric" />
            <Text style={styles.smallLabel}>Pièces utilisées</Text>
            <View style={styles.partsRow}>
              {parts.slice(0, 4).map((part) => (
                <TouchableOpacity
                  key={part.id}
                  style={[styles.partChip, selectedParts.includes(part.id) && styles.partChipSelected]}
                  onPress={() => togglePart(part.id)}
                >
                  <Text style={[styles.partChipLabel, selectedParts.includes(part.id) && styles.partChipLabelSelected]}>{part.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <AppField label="Statut" value={status} onChangeText={(value) => setStatus(value as Intervention['status'])} />
            <AppButton label="Ajouter" onPress={addIntervention} />
          </View>
        ) : (
          vehicleInterventions.map((item) => (
            <View key={item.id} style={styles.interventionRow}>
              <View style={styles.interventionHeader}>
                <Text style={styles.interventionTitle}>{item.type}</Text>
                <Badge label={item.status} tone={item.status === 'terminé' || item.status === 'livré' ? 'success' : item.status === 'en cours' ? 'info' : 'warning'} />
              </View>
              <Text style={styles.interventionMeta}>{item.description}</Text>
              <Text style={styles.interventionMeta}>Coût {item.cost}€ · {item.date}</Text>
            </View>
          ))
        )}
        <Text style={styles.noteText}>{overdue ? 'Véhicule en révision ou service dépassé.' : 'Aucun service critique détecté.'}</Text>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, paddingBottom: SPACING['4xl'] },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  list: { marginBottom: SPACING.md },
  vehicleCard: { marginBottom: SPACING.sm },
  vehicleActive: { borderColor: COLORS.primary, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicleTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  vehicleSub: { color: COLORS.textSecondary, marginTop: SPACING.xs },
  vehicleMeta: { marginTop: SPACING.xs, color: COLORS.textSecondary },
  detailCard: { padding: SPACING.lg },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  smallLabel: { marginTop: SPACING.sm, marginBottom: SPACING.xs, color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  partsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  partChip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.xs, marginBottom: SPACING.xs },
  partChipSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  partChipLabel: { color: COLORS.text, fontSize: 12 },
  partChipLabelSelected: { color: COLORS.primary },
  interventionRow: { marginBottom: SPACING.sm },
  interventionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  interventionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  interventionMeta: { color: COLORS.textSecondary, fontSize: 12 },
  noteText: { marginTop: SPACING.md, color: COLORS.textSecondary, fontSize: 13 },
});
