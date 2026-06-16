import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { theme } from '../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ghostLight' | 'danger';
type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  compact?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  compact = false,
  disabled = false,
  loading = false,
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor = {
    primary: theme.colors.white,
    secondary: theme.colors.primary,
    ghost: theme.colors.text,
    ghostLight: theme.colors.white,
    danger: theme.colors.danger,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        compact ? styles.buttonCompact : styles.buttonRegular,
        buttonVariantStyles[variant],
        isDisabled ? styles.buttonDisabled : null,
        pressed ? styles.buttonPressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.buttonLabel, buttonLabelStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function AppCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface AppFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export function AppField({ label, hint, error, style, ...inputProps }: AppFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize="sentences"
        autoCorrect={false}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.fieldInput, error ? styles.fieldInputError : null, style]}
        {...inputProps}
      />
      {error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        selected ? styles.choiceChipSelected : null,
        pressed ? styles.choiceChipPressed : null,
      ]}
    >
      <Text style={[styles.choiceChipLabel, selected ? styles.choiceChipLabelSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  return (
    <View style={[styles.badge, badgeStyles[tone]]}>
      <Text style={[styles.badgeLabel, badgeLabelStyles[tone]]}>{label}</Text>
    </View>
  );
}

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <AppCard style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHelper}>{helper}</Text>
    </AppCard>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <AppCard style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </AppCard>
  );
}

const buttonVariantStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.primarySoft,
  },
  ghost: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghostLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  danger: {
    backgroundColor: '#F7E1DC',
  },
});

const buttonLabelStyles = StyleSheet.create({
  primary: {
    color: theme.colors.white,
  },
  secondary: {
    color: theme.colors.primary,
  },
  ghost: {
    color: theme.colors.text,
  },
  ghostLight: {
    color: theme.colors.white,
  },
  danger: {
    color: theme.colors.danger,
  },
});

const badgeStyles = StyleSheet.create({
  neutral: {
    backgroundColor: theme.colors.mutedSurface,
  },
  info: {
    backgroundColor: theme.colors.primarySoft,
  },
  warning: {
    backgroundColor: '#F6E2CF',
  },
  success: {
    backgroundColor: '#DCEADF',
  },
  danger: {
    backgroundColor: '#F6E0DB',
  },
});

const badgeLabelStyles = StyleSheet.create({
  neutral: {
    color: theme.colors.text,
  },
  info: {
    color: theme.colors.primary,
  },
  warning: {
    color: theme.colors.warning,
  },
  success: {
    color: theme.colors.success,
  },
  danger: {
    color: theme.colors.danger,
  },
});

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRegular: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
  },
  buttonCompact: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    fontSize: 14,
    fontFamily: theme.typography.headingFont,
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing[5],
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  fieldGroup: {
    gap: theme.spacing[2],
  },
  fieldLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: theme.typography.headingFont,
  },
  fieldInput: {
    backgroundColor: '#F9F4EC',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    fontSize: 15,
    fontFamily: theme.typography.bodyFont,
  },
  fieldInputError: {
    borderColor: theme.colors.danger,
  },
  fieldHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.typography.bodyFont,
  },
  fieldError: {
    color: theme.colors.danger,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.typography.bodyFont,
  },
  choiceChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FBF7EF',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  choiceChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  choiceChipPressed: {
    opacity: 0.88,
  },
  choiceChipLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontFamily: theme.typography.headingFont,
  },
  choiceChipLabelSelected: {
    color: theme.colors.white,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  badgeLabel: {
    fontSize: 12,
    fontFamily: theme.typography.headingFont,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.spacing[2],
    fontFamily: theme.typography.bodyFont,
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 30,
    marginBottom: theme.spacing[2],
    fontFamily: theme.typography.headingFont,
  },
  metricHelper: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: theme.typography.bodyFont,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing[4],
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: theme.spacing[1],
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontFamily: theme.typography.headingFont,
  },
  sectionSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: theme.typography.bodyFont,
  },
  emptyCard: {
    alignItems: 'flex-start',
    gap: theme.spacing[2],
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.typography.headingFont,
  },
  emptyDescription: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.typography.bodyFont,
  },
});
