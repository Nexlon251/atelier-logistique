import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Badge } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';
import type { Task } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Day-of-week, Mon=0 … Sun=6
function firstDayOfWeek(year: number, month: number) {
  const dow = new Date(year, month, 1).getDay(); // 0=Sun
  return (dow + 6) % 7; // shift so Mon=0
}

function priorityColor(p: Task['priority']) {
  return p === 'high' ? COLORS.danger : p === 'medium' ? COLORS.warning : COLORS.primary;
}

function statusLabel(s: Task['status']) {
  return s === 'todo' ? 'À faire' : s === 'in_progress' ? 'En cours' : 'Terminée';
}

function statusBg(s: Task['status']) {
  return s === 'todo' ? COLORS.surfaceElevated : s === 'in_progress' ? COLORS.primaryLight : COLORS.successLight;
}

function statusColor(s: Task['status']) {
  return s === 'todo' ? COLORS.textMuted : s === 'in_progress' ? COLORS.primary : COLORS.success;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function CalendarScreen() {
  const { tasks, setScreen } = useApp();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(
    isoDate(now.getFullYear(), now.getMonth(), now.getDate()),
  );

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  // Tasks indexed by due_date (YYYY-MM-DD)
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      const day = t.due_date.slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(t);
    }
    return map;
  }, [tasks]);

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = firstDayOfWeek(year, month);
  const todayIso = isoDate(now.getFullYear(), now.getMonth(), now.getDate());

  // All cells: null = padding, number = day
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedTasks = selectedDay ? (tasksByDay[selectedDay] ?? []) : [];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={st.header}>
        <Text style={st.title}>Calendrier</Text>
        <Text style={st.subtitle}>Tâches par échéance</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigator */}
        <View style={st.monthNav}>
          <TouchableOpacity style={st.navBtn} onPress={prevMonth}>
            <Text style={st.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={st.monthLabel}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity style={st.navBtn} onPress={nextMonth}>
            <Text style={st.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={st.dayHeaders}>
          {DAY_NAMES.map((d) => (
            <Text key={d} style={st.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={st.grid}>
          {cells.map((day, i) => {
            if (day === null) {
              return <View key={`pad-${i}`} style={st.cell} />;
            }
            const iso = isoDate(year, month, day);
            const dayTasks = tasksByDay[iso] ?? [];
            const isToday = iso === todayIso;
            const isSelected = iso === selectedDay;
            const hasOverdue = dayTasks.some(
              (t) => t.status !== 'done' && new Date(iso) < now,
            );

            // Up to 3 priority dots
            const dots = dayTasks.slice(0, 3);

            return (
              <TouchableOpacity
                key={iso}
                style={[
                  st.cell,
                  isToday && st.cellToday,
                  isSelected && st.cellSelected,
                ]}
                onPress={() => setSelectedDay(iso === selectedDay ? null : iso)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    st.cellDay,
                    isToday && st.cellDayToday,
                    isSelected && st.cellDaySelected,
                    hasOverdue && !isSelected && st.cellDayOverdue,
                  ]}
                >
                  {day}
                </Text>
                {dots.length > 0 && (
                  <View style={st.dots}>
                    {dots.map((t, di) => (
                      <View
                        key={di}
                        style={[st.dot, { backgroundColor: priorityColor(t.priority) }]}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <Text style={st.dotMore}>+{dayTasks.length - 3}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={st.legend}>
          {[
            { color: COLORS.danger, label: 'Haute priorité' },
            { color: COLORS.warning, label: 'Moyenne' },
            { color: COLORS.primary, label: 'Basse' },
          ].map(({ color, label }) => (
            <View key={label} style={st.legendItem}>
              <View style={[st.legendDot, { backgroundColor: color }]} />
              <Text style={st.legendText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Selected day tasks */}
        {selectedDay && (
          <View style={st.dayDetail}>
            <Text style={st.dayDetailTitle}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>

            {selectedTasks.length === 0 ? (
              <View style={[st.emptyDay, SHADOW.sm]}>
                <Text style={st.emptyDayIcon}>📅</Text>
                <Text style={st.emptyDayText}>Aucune tâche ce jour</Text>
              </View>
            ) : (
              selectedTasks.map((task) => {
                const isOverdue = task.status !== 'done' && new Date(selectedDay) < now;
                return (
                  <View key={task.id} style={[st.taskRow, SHADOW.sm]}>
                    <View style={[st.taskPrioDot, { backgroundColor: priorityColor(task.priority) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[st.taskTitle, task.status === 'done' && st.taskTitleDone]}>
                        {task.title}
                      </Text>
                      {task.description ? (
                        <Text style={st.taskDesc} numberOfLines={2}>
                          {task.description}
                        </Text>
                      ) : null}
                      {isOverdue && (
                        <Text style={st.overdueLabel}>🔴 En retard</Text>
                      )}
                    </View>
                    <Badge
                      label={statusLabel(task.status)}
                      bg={statusBg(task.status)}
                      color={statusColor(task.status)}
                      size="sm"
                    />
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Monthly summary */}
        <View style={st.summary}>
          <Text style={st.summaryTitle}>Ce mois</Text>
          <View style={st.summaryRow}>
            {(() => {
              const monthTasks = tasks.filter((t) => {
                if (!t.due_date) return false;
                const d = new Date(t.due_date);
                return d.getFullYear() === year && d.getMonth() === month;
              });
              const counts = {
                todo: monthTasks.filter((t) => t.status === 'todo').length,
                in_progress: monthTasks.filter((t) => t.status === 'in_progress').length,
                done: monthTasks.filter((t) => t.status === 'done').length,
              };
              return [
                { label: 'À faire', count: counts.todo, color: COLORS.primary, bg: COLORS.primaryLight },
                { label: 'En cours', count: counts.in_progress, color: COLORS.warning, bg: COLORS.warningLight },
                { label: 'Terminées', count: counts.done, color: COLORS.success, bg: COLORS.successLight },
              ].map(({ label, count, color, bg }) => (
                <View key={label} style={[st.summaryChip, { backgroundColor: bg }]}>
                  <Text style={[st.summaryCount, { color }]}>{count}</Text>
                  <Text style={[st.summaryLabel, { color }]}>{label}</Text>
                </View>
              ));
            })()}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CELL_SIZE = 46;

const st = StyleSheet.create({
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { fontSize: 22, color: COLORS.text, lineHeight: 26 },
  monthLabel: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    marginBottom: 4,
  },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.textLight, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    gap: 2,
  },
  cell: {
    width: `${100 / 7}%` as any,
    minHeight: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  cellToday: { backgroundColor: COLORS.primaryLight },
  cellSelected: { backgroundColor: COLORS.primary },
  cellDay: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cellDayToday: { color: COLORS.primary },
  cellDaySelected: { color: '#fff' },
  cellDayOverdue: { color: COLORS.danger },
  dots: { flexDirection: 'row', gap: 2, marginTop: 3, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotMore: { fontSize: 8, color: COLORS.textLight },
  legend: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textLight },
  dayDetail: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },
  dayDetailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textTransform: 'capitalize',
  },
  emptyDay: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyDayIcon: { fontSize: 28, marginBottom: 8 },
  emptyDayText: { fontSize: 14, color: COLORS.textMuted },
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
  taskPrioDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  taskTitleDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  taskDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  overdueLabel: { fontSize: 11, color: COLORS.danger, marginTop: 2, fontWeight: '600' },
  summary: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', gap: SPACING.sm },
  summaryChip: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  summaryCount: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});

