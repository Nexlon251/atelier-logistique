import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from './ui/theme';

interface GanttBarProps {
  label: string;
  startDate: string;
  endDate: string;
  timelineStart: string;
  timelineEnd: string;
  status: 'planifié' | 'terminé' | 'en retard';
}

function toDay(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getStatusColor(status: GanttBarProps['status']) {
  switch (status) {
    case 'terminé':
      return COLORS.success;
    case 'en retard':
      return COLORS.danger;
    default:
      return COLORS.primary;
  }
}

export function GanttBar({
  label,
  startDate,
  endDate,
  timelineStart,
  timelineEnd,
  status,
}: GanttBarProps) {
  const startTime = toDay(startDate);
  const endTime = Math.max(startTime + 1, toDay(endDate));
  const minTime = toDay(timelineStart);
  const maxTime = Math.max(minTime + 1, toDay(timelineEnd));
  const totalSpan = Math.max(1, maxTime - minTime);
  const left = Math.max(0, Math.min(100, ((startTime - minTime) / totalSpan) * 100));
  const width = Math.max(8, Math.min(100, ((endTime - startTime) / totalSpan) * 100));

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.bar, { left: `${left}%`, width: `${width}%`, backgroundColor: getStatusColor(status) }]} />
      </View>
      <Text style={styles.dates}>
        {new Date(startDate).toLocaleDateString('fr-FR')} — {new Date(endDate).toLocaleDateString('fr-FR')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: SPACING.sm },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  track: {
    position: 'relative',
    height: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: RADIUS.full,
  },
  dates: { fontSize: 11, color: COLORS.textLight },
});
