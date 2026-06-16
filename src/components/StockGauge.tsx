import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Badge } from './ui/index';
import { COLORS, RADIUS, SPACING } from './ui/theme';

type StockGaugeProps = {
  daysRemaining: number | null;
  urgency: 'rupture' | 'critique' | 'attention' | 'stable';
};

const GAUGE_MAX_DAYS = 30;

function getGaugeColor(urgency: StockGaugeProps['urgency']) {
  switch (urgency) {
    case 'rupture':
    case 'critique':
      return COLORS.danger;
    case 'attention':
      return COLORS.warning;
    default:
      return COLORS.success;
  }
}

function getBadgeProps(urgency: StockGaugeProps['urgency']) {
  switch (urgency) {
    case 'rupture':
      return { label: 'Rupture', color: COLORS.danger, bg: COLORS.dangerLight };
    case 'critique':
      return { label: 'Urgent', color: COLORS.danger, bg: COLORS.dangerLight };
    case 'attention':
      return { label: 'Attention', color: COLORS.warning, bg: COLORS.warningLight };
    default:
      return { label: 'Stable', color: COLORS.success, bg: COLORS.successLight };
  }
}

export function StockGauge({ daysRemaining, urgency }: StockGaugeProps) {
  const fillRatio = daysRemaining === null ? 0.2 : Math.max(0, Math.min(1, daysRemaining / GAUGE_MAX_DAYS));
  const color = getGaugeColor(urgency);
  const label = daysRemaining === null ? 'Pas assez de données' : `${Math.max(0, Math.round(daysRemaining))} j restants`;
  const caption = daysRemaining === null ? 'Aucune consommation récente' : 'Prévision basée sur les 30 derniers jours';

  return (
    <View style={styles.root}>
      <View style={styles.barRow}>
        <Badge {...getBadgeProps(urgency)} size="sm" />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${Math.max(12, fillRatio * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  barBackground: {
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  caption: {
    color: COLORS.textLight,
    fontSize: 11,
  },
});
