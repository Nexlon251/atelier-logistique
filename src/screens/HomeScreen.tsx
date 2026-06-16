import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Card, Badge } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';

function StatCard({
  label,
  value,
  emoji,
  color,
  bg,
  onPress,
}: {
  label: string;
  value: number | string;
  emoji: string;
  color: string;
  bg: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[statStyles.card, SHADOW.sm, { flex: 1 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={[statStyles.iconWrap, { backgroundColor: bg }]}>
        <Text style={statStyles.emoji}>{emoji}</Text>
      </View>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: { fontSize: 22 },
  value: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', fontWeight: '500' },
});

export function HomeScreen() {
  const { user, organization, membership, isDemo, tasks, documents, parts, movements, setScreen } = useApp();

  const now = new Date();

  // Task stats
  const tasksTodo = tasks.filter((t) => t.status === 'todo').length;
  const tasksInProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const tasksOverdue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'done',
  ).length;

  // Stock alerts
  const alertParts = parts.filter((p) => p.quantity <= p.alert_threshold).length;
  const outOfStock = parts.filter((p) => p.quantity === 0).length;

  // Recent tasks (3)
  const recentTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      // urgent first
      const ap = a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2;
      const bp = b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2;
      return ap - bp;
    })
    .slice(0, 3);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const displayName = user?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'vous';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}, {displayName} 👋</Text>
          <Text style={styles.orgName}>{organization?.name}</Text>
          {isDemo && (
            <Badge label="Mode démo" bg="#FEF3C7" color="#92400E" />
          )}
        </View>
        <TouchableOpacity
          style={styles.orgBtn}
          onPress={() => setScreen('organization')}
        >
          <Text style={styles.orgBtnText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts banner */}
      {(tasksOverdue > 0 || alertParts > 0) && (
        <View style={styles.alertBanner}>
          {tasksOverdue > 0 && (
            <Text style={styles.alertText}>
              🔴 {tasksOverdue} tâche{tasksOverdue > 1 ? 's' : ''} en retard
            </Text>
          )}
          {outOfStock > 0 && (
            <Text style={styles.alertText}>
              🚨 {outOfStock} rupture{outOfStock > 1 ? 's' : ''} de stock
            </Text>
          )}
          {alertParts > 0 && outOfStock === 0 && (
            <Text style={styles.alertText}>
              ⚠️ {alertParts} pièce{alertParts > 1 ? 's' : ''} en stock bas
            </Text>
          )}
        </View>
      )}

      {/* Stats row */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tableau de bord</Text>
        <View style={styles.statsRow}>
          <StatCard
            label="À faire"
            value={tasksTodo}
            emoji="📋"
            color={COLORS.primary}
            bg={COLORS.primaryLight}
            onPress={() => setScreen('tasks')}
          />
          <StatCard
            label="En cours"
            value={tasksInProgress}
            emoji="⚙️"
            color={COLORS.warning}
            bg={COLORS.warningLight}
            onPress={() => setScreen('tasks')}
          />
          <StatCard
            label="Terminées"
            value={tasksDone}
            emoji="✅"
            color={COLORS.success}
            bg={COLORS.successLight}
            onPress={() => setScreen('tasks')}
          />
          <StatCard
            label="Alertes"
            value={alertParts}
            emoji="📦"
            color={alertParts > 0 ? COLORS.danger : COLORS.textMuted}
            bg={alertParts > 0 ? COLORS.dangerLight : COLORS.surfaceElevated}
            onPress={() => setScreen('stock')}
          />
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accès rapide</Text>
        <View style={styles.actionsGrid}>
         {[
            { emoji: '📋', label: 'Tâches',        screen: 'tasks',    color: COLORS.primaryLight },
            { emoji: '📅', label: 'Agenda',         screen: 'calendar', color: '#EDE9FE' },
            { emoji: '📦', label: 'Stock',           screen: 'stock',    color: COLORS.successLight },
            { emoji: '📊', label: 'Statistiques',   screen: 'stats',    color: COLORS.warningLight },
          ].map((action) => (
            <TouchableOpacity
              key={action.screen}
              style={[styles.actionCard, SHADOW.sm, { backgroundColor: action.color }]}
              onPress={() => setScreen(action.screen as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionEmoji}>{action.emoji}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Urgent tasks */}
      {recentTasks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tâches prioritaires</Text>
            <TouchableOpacity onPress={() => setScreen('tasks')}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          {recentTasks.map((task) => {
            const priorityColor = { low: COLORS.textLight, medium: COLORS.warning, high: COLORS.danger }[task.priority];
            const isOverdue = task.due_date && new Date(task.due_date) < now;
            return (
              <View key={task.id} style={[styles.taskRow, SHADOW.sm]}>
                <View style={[styles.taskDot, { backgroundColor: priorityColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                  {task.due_date && (
                    <Text style={[styles.taskDate, isOverdue && { color: COLORS.danger }]}>
                      {isOverdue ? '🔴 ' : '📅 '}
                      {new Date(task.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </Text>
                  )}
                </View>
                <Badge
                  label={task.status === 'todo' ? 'À faire' : 'En cours'}
                  bg={task.status === 'todo' ? COLORS.surfaceElevated : COLORS.primaryLight}
                  color={task.status === 'todo' ? COLORS.textMuted : COLORS.primary}
                  size="sm"
                />
              </View>
            );
          })}
        </View>
      )}

      {/* Stock alerts section */}
      {alertParts > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alertes stock</Text>
            <TouchableOpacity onPress={() => setScreen('stock')}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          {parts
            .filter((p) => p.quantity <= p.alert_threshold)
            .slice(0, 3)
            .map((part) => (
              <View key={part.id} style={[styles.taskRow, SHADOW.sm]}>
                <View
                  style={[
                    styles.taskDot,
                    { backgroundColor: part.quantity === 0 ? COLORS.danger : COLORS.warning },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{part.name}</Text>
                  {part.reference && (
                    <Text style={styles.taskDate}>Réf: {part.reference}</Text>
                  )}
                </View>
                <Badge
                  label={`${part.quantity} ${part.unit ?? ''}`}
                  bg={part.quantity === 0 ? COLORS.dangerLight : COLORS.warningLight}
                  color={part.quantity === 0 ? COLORS.danger : COLORS.warning}
                  size="sm"
                />
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  orgName: { fontSize: 14, color: COLORS.textMuted, marginTop: 2, marginBottom: 6 },
  orgBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgBtnText: { fontSize: 20 },
  alertBanner: {
    backgroundColor: COLORS.dangerLight,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  alertText: { fontSize: 13, color: COLORS.danger, fontWeight: '600' },
  section: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginTop: SPACING.sm },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  actionCard: {
    width: '47%',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'flex-start',
    ...SHADOW.sm,
  },
  actionEmoji: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  taskDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
