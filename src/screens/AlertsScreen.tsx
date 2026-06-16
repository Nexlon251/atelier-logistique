import React, { useMemo, useRef } from 'react';
import {
  Animated,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { AppButton, AppCard } from '../components/primitives';
import { Badge } from '../components/ui/index';
import { COLORS, SPACING } from '../components/ui/theme';
import type { AppAlert } from '../types';

const severityLabel: Record<string, string> = {
  critical: 'Critique',
  attention: 'Attention',
  info: 'Info',
};

const severityColor: Record<string, string> = {
  critical: COLORS.danger,
  attention: COLORS.warning,
  info: COLORS.primary,
};

function SwipeableAlertRow({ alert, onMarkRead, onOpen }: { alert: AppAlert; onMarkRead: (id: string) => void; onOpen: () => void; }) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          translateX.setValue(Math.max(-120, gesture.dx));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const nextValue = gesture.dx < -60 ? -120 : 0;
        Animated.spring(translateX, {
          toValue: nextValue,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeAction}> 
        <AppButton
          label={alert.read_at ? 'Lue' : 'Marquer lu'}
          variant={alert.read_at ? 'secondary' : 'danger'}
          onPress={() => onMarkRead(alert.id)}
          disabled={!!alert.read_at}
          compact
        />
      </View>
      <Animated.View
        style={[styles.alertRow, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={onOpen} activeOpacity={0.75}>
          <AppCard style={[styles.card, alert.read_at ? styles.cardRead : null]}>
            <View style={styles.rowTop}>
              <Text style={styles.alertTitle}>{severityLabel[alert.severity] ?? 'Alerte'}</Text>
              <Badge
                label={alert.severity === 'critical' ? 'Critique' : alert.severity === 'attention' ? 'Attention' : 'Info'}
                bg={severityColor[alert.severity]}
                color={COLORS.white}
                size="sm"
              />
            </View>
            <Text style={[styles.alertMessage, alert.read_at ? styles.alertMessageRead : null]}> {alert.message}</Text>
            <Text style={styles.alertMeta}>
              {alert.entity_id ? `ID entité ${alert.entity_id}` : 'Sans entité'} · {new Date(alert.created_at).toLocaleString('fr-FR')}
            </Text>
          </AppCard>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export function AlertsScreen() {
  const { alerts, markAlertRead, setScreen } = useApp();

  const sortedAlerts = useMemo(() => [...alerts].sort((a, b) => {
    const order = { critical: 0, attention: 1, info: 2 };
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [alerts]);

  const unreadCount = alerts.filter((alert) => !alert.read_at).length;

  const navigateToEntity = (alert: AppAlert) => {
    if (alert.type === 'task_overdue') {
      setScreen('tasks');
    } else if (alert.type === 'stock_low') {
      setScreen('stock');
    } else if (alert.type === 'movement_anomaly') {
      setScreen('stock');
    } else {
      setScreen('home');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Alertes intelligentes</Text>
          <Text style={styles.subtitle}>{unreadCount} alerte{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}</Text>
        </View>
        <AppButton label="Marquer tout lu" variant="secondary" onPress={() => { alerts.filter((a) => !a.read_at).forEach((a) => markAlertRead(a.id)); }} disabled={!unreadCount} compact />
      </View>

      {sortedAlerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucune alerte pour le moment. Le système surveille votre stock, vos tâches et vos mouvements.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedAlerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SwipeableAlertRow
              alert={item}
              onMarkRead={markAlertRead}
              onOpen={() => navigateToEntity(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  header: {
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  list: { paddingBottom: 24 },
  separator: { height: 12 },
  swipeContainer: { marginBottom: 8 },
  swipeAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertRow: {
    overflow: 'hidden',
  },
  card: {
    padding: SPACING.md,
  },
  cardRead: {
    opacity: 0.7,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  alertMessage: { fontSize: 15, color: COLORS.text, marginBottom: 10 },
  alertMessageRead: { color: COLORS.textMuted },
  alertMeta: { fontSize: 12, color: COLORS.textMuted },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
