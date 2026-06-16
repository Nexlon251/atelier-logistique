import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppButton, AppCard, Badge } from '../components/primitives';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';

interface Stop {
  id: string;
  address: string;
  status: 'à livrer' | 'livré' | 'absent';
  notes?: string;
  arrived_at?: string;
}

interface Route {
  id: string;
  name: string;
  date: string;
  driver: string;
  vehicle: string;
  status: 'prévue' | 'en cours' | 'terminée';
  stops: Stop[];
}

const INITIAL_ROUTES: Route[] = [
  {
    id: 'r1',
    name: 'Tournée centre-ville',
    date: '2026-06-17',
    driver: 'Sophie',
    vehicle: 'AB-123-CD',
    status: 'en cours',
    stops: [
      { id: 's1', address: '10 rue du Marché', status: 'livré', arrived_at: '2026-06-17T09:10:00Z' },
      { id: 's2', address: '24 avenue des Fleurs', status: 'à livrer' },
      { id: 's3', address: '5 place du Chef', status: 'absent' },
    ],
  },
];

export function TransportScreen() {
  const [routes, setRoutes] = useState<Route[]>(INITIAL_ROUTES);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('r1');

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];

  const stats = useMemo(() => {
    const todayRoutes = routes.filter((route) => route.date === selectedRoute.date);
    const delivered = todayRoutes.flatMap((route) => route.stops).filter((stop) => stop.status === 'livré').length;
    const total = todayRoutes.flatMap((route) => route.stops).length || 1;
    return { delivered, total, rate: Math.round((delivered / total) * 100) };
  }, [routes, selectedRoute.date]);

  function markDelivered(stopId: string) {
    setRoutes((prev) =>
      prev.map((route) =>
        route.id !== selectedRoute.id
          ? route
          : {
              ...route,
              stops: route.stops.map((stop) =>
                stop.id === stopId
                  ? { ...stop, status: 'livré', arrived_at: new Date().toISOString() }
                  : stop,
              ),
            },
      ),
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tournées</Text>
      <View style={styles.routeRow}>
        {routes.map((route) => (
          <TouchableOpacity key={route.id} onPress={() => setSelectedRouteId(route.id)} style={[styles.routeTab, selectedRouteId === route.id && styles.routeTabActive]}>
            <Text style={[styles.routeTabLabel, selectedRouteId === route.id && styles.routeTabLabelActive]}>{route.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <AppCard style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>{selectedRoute.name}</Text>
        <Text style={styles.sectionSubtitle}>{selectedRoute.date} · {selectedRoute.driver} · {selectedRoute.vehicle}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.delivered}</Text>
            <Text style={styles.statLabel}>Livrées</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Arrêts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.rate}%</Text>
            <Text style={styles.statLabel}>Compl.</Text>
          </View>
        </View>
      </AppCard>

      {selectedRoute.stops.map((stop) => (
        <AppCard key={stop.id} style={styles.stopCard}>
          <View style={styles.stopHeader}>
            <Text style={styles.stopAddress}>{stop.address}</Text>
            <Badge label={stop.status} tone={stop.status === 'livré' ? 'success' : stop.status === 'absent' ? 'danger' : 'warning'} />
          </View>
          <Text style={styles.stopMeta}>{stop.notes ?? 'Pas de note'}</Text>
          {stop.status !== 'livré' && (
            <AppButton label="Marquer livré" onPress={() => markDelivered(stop.id)} compact />
          )}
        </AppCard>
      ))}

      <AppCard style={styles.mapCard}>
        <Text style={styles.sectionTitle}>Carte simple</Text>
        <Text style={styles.mapText}>Visualisation des arrêts sur carte non disponible sans bibliothèque dédiée.</Text>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: SPACING.lg, paddingBottom: SPACING['4xl'] },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  routeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  routeTab: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  routeTabActive: { backgroundColor: COLORS.primary },
  routeTabLabel: { color: COLORS.textSecondary, fontWeight: '700' },
  routeTabLabelActive: { color: COLORS.white },
  summaryCard: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  sectionSubtitle: { color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },
  stopCard: { marginBottom: SPACING.sm },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stopAddress: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  stopMeta: { color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.sm },
  mapCard: { paddingVertical: SPACING.lg },
  mapText: { color: COLORS.textSecondary, marginTop: SPACING.sm },
});
