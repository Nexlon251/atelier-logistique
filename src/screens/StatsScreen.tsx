import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function KpiCard({
  emoji,
  label,
  value,
  sub,
  color,
  bg,
}: {
  emoji: string;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[s.kpiCard, SHADOW.sm]}>
      <View style={[s.kpiIcon, { backgroundColor: bg }]}>
        <Text style={s.kpiEmoji}>{emoji}</Text>
      </View>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function BarRow({
  label,
  value,
  total,
  color,
  bg,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  bg: string;
}) {
  const ratio = total > 0 ? value / total : 0;
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { flex: ratio, backgroundColor: color, minWidth: value > 0 ? 4 : 0 }]} />
        <View style={{ flex: 1 - ratio }} />
      </View>
      <Text style={[s.barCount, { color }]}>{value}</Text>
    </View>
  );
}

function PeriodToggle({
  value,
  onChange,
}: {
  value: '7j' | '30j' | 'tout';
  onChange: (v: '7j' | '30j' | 'tout') => void;
}) {
  const opts: Array<'7j' | '30j' | 'tout'> = ['7j', '30j', 'tout'];
  return (
    <View style={s.toggle}>
      {opts.map((o) => (
        <TouchableOpacity
          key={o}
          style={[s.toggleBtn, value === o && s.toggleBtnActive]}
          onPress={() => onChange(o)}
        >
          <Text style={[s.toggleText, value === o && s.toggleTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export function StatsScreen() {
  const { tasks, parts, movements, documents } = useApp();
  const [movPeriod, setMovPeriod] = useState<'7j' | '30j' | 'tout'>('7j');

  const now = new Date();

  // ── Tâches ──
  const totalTasks = tasks.length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'done',
  ).length;
  const high = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length;
  const completionRate = pct(done, totalTasks);

  // ── Stock ──
  const totalParts = parts.length;
  const alertParts = parts.filter((p) => p.quantity <= p.alert_threshold).length;
  const outParts = parts.filter((p) => p.quantity === 0).length;
  const stockHealth = pct(totalParts - alertParts, totalParts);

  // ── Mouvements filtrés ──
  const filteredMovements = useMemo(() => {
    if (movPeriod === 'tout') return movements;
    const days = movPeriod === '7j' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return movements.filter((m) => new Date(m.created_at) >= cutoff);
  }, [movements, movPeriod]);

  const movIn = filteredMovements.filter((m) => m.type === 'in').length;
  const movOut = filteredMovements.filter((m) => m.type === 'out').length;
  const movAdj = filteredMovements.filter((m) => m.type === 'adjustment').length;

  // ── Mouvements sur 7 jours (mini bar chart) ──
  const days7 = last7Days();
  const movByDay = useMemo(() => {
    return days7.map((day) => {
      const dayMovs = movements.filter((m) => m.created_at.slice(0, 10) === day);
      return {
        day,
        in: dayMovs.filter((m) => m.type === 'in').length,
        out: dayMovs.filter((m) => m.type === 'out').length,
      };
    });
  }, [movements, days7]);
  const maxDayMov = Math.max(...movByDay.map((d) => d.in + d.out), 1);

  // ── Documents ──
  const totalDocs = documents.length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Statistiques</Text>
        <Text style={s.subtitle}>Vue d'ensemble de l'activité</Text>
      </View>

      {/* KPI Cards */}
      <View style={s.section}>
        <SectionTitle>Résumé</SectionTitle>
        <View style={s.kpiGrid}>
          <KpiCard
            emoji="📋"
            label="Tâches actives"
            value={todo + inProgress}
            sub={`${completionRate}% terminées`}
            color={COLORS.primary}
            bg={COLORS.primaryLight}
          />
          <KpiCard
            emoji="🔴"
            label="En retard"
            value={overdue}
            sub={high > 0 ? `${high} haute priorité` : undefined}
            color={overdue > 0 ? COLORS.danger : COLORS.textMuted}
            bg={overdue > 0 ? COLORS.dangerLight : COLORS.surfaceElevated}
          />
          <KpiCard
            emoji="📦"
            label="Stock santé"
            value={`${stockHealth}%`}
            sub={alertParts > 0 ? `${alertParts} alerte${alertParts > 1 ? 's' : ''}` : 'Tout OK'}
            color={stockHealth >= 80 ? COLORS.success : stockHealth >= 50 ? COLORS.warning : COLORS.danger}
            bg={stockHealth >= 80 ? COLORS.successLight : stockHealth >= 50 ? COLORS.warningLight : COLORS.dangerLight}
          />
          <KpiCard
            emoji="📄"
            label="Documents"
            value={totalDocs}
            color={COLORS.textMuted}
            bg={COLORS.surfaceElevated}
          />
        </View>
      </View>

      {/* Tâches par statut */}
      <View style={s.section}>
        <SectionTitle>Tâches par statut</SectionTitle>
        <View style={[s.card, SHADOW.sm]}>
          <BarRow label="À faire" value={todo} total={totalTasks} color={COLORS.primary} bg={COLORS.primaryLight} />
          <BarRow label="En cours" value={inProgress} total={totalTasks} color={COLORS.warning} bg={COLORS.warningLight} />
          <BarRow label="Terminées" value={done} total={totalTasks} color={COLORS.success} bg={COLORS.successLight} />
          {overdue > 0 && (
            <BarRow label="En retard" value={overdue} total={totalTasks} color={COLORS.danger} bg={COLORS.dangerLight} />
          )}
          <View style={s.divider} />
          <View style={s.cardFooter}>
            <Text style={s.footerText}>Total : {totalTasks} tâche{totalTasks !== 1 ? 's' : ''}</Text>
            <Text style={[s.footerText, { color: COLORS.success, fontWeight: '700' }]}>
              ✅ {completionRate}% complétées
            </Text>
          </View>
        </View>
      </View>

      {/* Stock */}
      <View style={s.section}>
        <SectionTitle>État du stock</SectionTitle>
        <View style={[s.card, SHADOW.sm]}>
          <BarRow label="Stock OK" value={totalParts - alertParts} total={totalParts} color={COLORS.success} bg={COLORS.successLight} />
          <BarRow label="Stock bas" value={alertParts - outParts} total={totalParts} color={COLORS.warning} bg={COLORS.warningLight} />
          <BarRow label="Rupture" value={outParts} total={totalParts} color={COLORS.danger} bg={COLORS.dangerLight} />
          <View style={s.divider} />
          <View style={s.cardFooter}>
            <Text style={s.footerText}>{totalParts} référence{totalParts !== 1 ? 's' : ''}</Text>
            <Text style={[s.footerText, { color: outParts > 0 ? COLORS.danger : COLORS.success, fontWeight: '700' }]}>
              {outParts > 0 ? `🚨 ${outParts} rupture${outParts > 1 ? 's' : ''}` : '✅ Aucune rupture'}
            </Text>
          </View>
        </View>
      </View>

      {/* Mouvements */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <SectionTitle>Mouvements de stock</SectionTitle>
          <PeriodToggle value={movPeriod} onChange={setMovPeriod} />
        </View>
        <View style={[s.card, SHADOW.sm]}>
          <View style={s.movRow}>
            <View style={[s.movChip, { backgroundColor: COLORS.successLight }]}>
              <Text style={[s.movChipVal, { color: COLORS.success }]}>{movIn}</Text>
              <Text style={s.movChipLabel}>Entrées</Text>
            </View>
            <View style={[s.movChip, { backgroundColor: COLORS.dangerLight }]}>
              <Text style={[s.movChipVal, { color: COLORS.danger }]}>{movOut}</Text>
              <Text style={s.movChipLabel}>Sorties</Text>
            </View>
            <View style={[s.movChip, { backgroundColor: COLORS.warningLight }]}>
              <Text style={[s.movChipVal, { color: COLORS.warning }]}>{movAdj}</Text>
              <Text style={s.movChipLabel}>Ajust.</Text>
            </View>
            <View style={[s.movChip, { backgroundColor: COLORS.surfaceElevated }]}>
              <Text style={[s.movChipVal, { color: COLORS.text }]}>{filteredMovements.length}</Text>
              <Text style={s.movChipLabel}>Total</Text>
            </View>
          </View>

          {/* Mini bar chart 7 jours */}
          <View style={s.divider} />
          <Text style={s.chartTitle}>7 derniers jours</Text>
          <View style={s.barChart}>
            {movByDay.map((d) => {
              const total = d.in + d.out;
              const heightPct = total / maxDayMov;
              const dayLabel = DAY_SHORT[new Date(d.day + 'T12:00:00').getDay()];
              return (
                <View key={d.day} style={s.barChartCol}>
                  <View style={s.barChartTrack}>
                    {total > 0 ? (
                      <View style={{ width: '100%', height: `${Math.max(heightPct * 100, 8)}%` as any }}>
                        <View style={{ flex: d.in, backgroundColor: COLORS.success, borderRadius: 2 }} />
                        <View style={{ flex: d.out, backgroundColor: COLORS.danger, borderRadius: 2 }} />
                      </View>
                    ) : (
                      <View style={s.barChartEmpty} />
                    )}
                  </View>
                  <Text style={s.barChartLabel}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={s.legendText}>Entrées</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: COLORS.danger }]} />
              <Text style={s.legendText}>Sorties</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  section: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  kpiCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiIcon: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiEmoji: { fontSize: 22 },
  kpiValue: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },
  kpiSub: { fontSize: 10, color: COLORS.textLight, textAlign: 'center', marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 80, fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: COLORS.surfaceElevated, flexDirection: 'row', overflow: 'hidden', marginHorizontal: SPACING.sm },
  barFill: { borderRadius: 5 },
  barCount: { width: 30, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: COLORS.textMuted },
  movRow: { flexDirection: 'row', gap: SPACING.sm },
  movChip: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center' },
  movChipVal: { fontSize: 22, fontWeight: '800' },
  movChipLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  chartTitle: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginBottom: SPACING.sm },
  barChart: { flexDirection: 'row', height: 80, gap: 4, alignItems: 'flex-end' },
  barChartCol: { flex: 1, alignItems: 'center', height: '100%' },
  barChartTrack: { flex: 1, width: '80%', justifyContent: 'flex-end', overflow: 'hidden' },
  barChartEmpty: { width: '80%', height: 3, backgroundColor: COLORS.border, borderRadius: 2 },
  barChartLabel: { fontSize: 9, color: COLORS.textLight, marginTop: 4 },
  legend: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textMuted },
  toggle: { flexDirection: 'row', backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.full, padding: 2 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
});
