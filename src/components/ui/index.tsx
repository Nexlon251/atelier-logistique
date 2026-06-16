import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal as RNModal,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Animated,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW } from './theme';

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const bg = {
    primary: COLORS.primary,
    secondary: COLORS.surface,
    danger: COLORS.danger,
    ghost: 'transparent',
    success: COLORS.success,
  }[variant];

  const textColor = {
    primary: COLORS.white,
    secondary: COLORS.text,
    danger: COLORS.white,
    ghost: COLORS.primary,
    success: COLORS.white,
  }[variant];

  const borderColor = variant === 'secondary' ? COLORS.border : 'transparent';

  const paddingV = { sm: 8, md: 12, lg: 16 }[size];
  const paddingH = { sm: 12, md: 16, lg: 20 }[size];
  const fontSize = { sm: 13, md: 15, lg: 16 }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        btnStyles.base,
        {
          backgroundColor: disabled ? COLORS.border : bg,
          borderColor,
          borderWidth: variant === 'secondary' ? 1 : 0,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          alignSelf: fullWidth ? undefined : 'flex-start',
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={btnStyles.row}>
          {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
          <Text
            style={[
              btnStyles.label,
              { color: disabled ? COLORS.textMuted : textColor, fontSize },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  base: { borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontWeight: '600' },
});

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
}

export function Card({ children, style, onPress, elevated }: CardProps) {
  const content = (
    <View
      style={[
        cardStyles.base,
        elevated ? SHADOW.md : SHADOW.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

// ─── Badge ───────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, color, bg, size = 'md' }: BadgeProps) {
  const fontSize = size === 'sm' ? 10 : 12;
  return (
    <View
      style={[
        badgeStyles.base,
        { backgroundColor: bg ?? COLORS.primaryLight, paddingHorizontal: size === 'sm' ? 6 : 8 },
      ]}
    >
      <Text style={[badgeStyles.label, { color: color ?? COLORS.primary, fontSize }]}>
        {label}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: { borderRadius: RADIUS.full, paddingVertical: 2, alignSelf: 'flex-start' },
  label: { fontWeight: '600' },
});

// ─── Input ───────────────────────────────────────────────────────────────────

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  style?: TextStyle;
  multiline?: boolean;
  numberOfLines?: number;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  multiline,
  numberOfLines,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[inputStyles.container, containerStyle]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <TextInput
        style={[
          inputStyles.input,
          focused && inputStyles.focused,
          error ? inputStyles.errored : null,
          multiline && { height: (numberOfLines ?? 3) * 22, textAlignVertical: 'top' },
        ]}
        placeholderTextColor={COLORS.textLight}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline={multiline}
        numberOfLines={numberOfLines}
        {...props}
      />
      {error && <Text style={inputStyles.errorText}>{error}</Text>}
      {hint && !error && <Text style={inputStyles.hint}>{hint}</Text>}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  focused: { borderColor: COLORS.primary },
  errored: { borderColor: COLORS.danger },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
});

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectOption { label: string; value: string }

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  containerStyle?: ViewStyle;
}

export function Select({ label, value, options, onChange, containerStyle }: SelectProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={[inputStyles.container, containerStyle]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <TouchableOpacity
        style={[inputStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={{ color: current ? COLORS.text : COLORS.textLight, fontSize: 15 }}>
          {current?.label ?? 'Sélectionner…'}
        </Text>
        <Text style={{ color: COLORS.textMuted }}>▾</Text>
      </TouchableOpacity>

      <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={selectStyles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={selectStyles.sheet}>
            {label && <Text style={selectStyles.title}>{label}</Text>}
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    selectStyles.option,
                    opt.value === value && selectStyles.optionActive,
                  ]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Text
                    style={[
                      selectStyles.optionLabel,
                      opt.value === value && { color: COLORS.primary, fontWeight: '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.value === value && <Text style={{ color: COLORS.primary }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}

const selectStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    maxHeight: '60%',
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  optionActive: { backgroundColor: COLORS.primaryMuted },
  optionLabel: { fontSize: 15, color: COLORS.text },
});

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ visible, onClose, title, children, footer }: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          {title && (
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                <Text style={modalStyles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: SPACING.lg }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer && <View style={modalStyles.footer}>{footer}</View>}
        </View>
      </View>
    </RNModal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    gap: 8,
  },
});

// ─── Loading Overlay ─────────────────────────────────────────────────────────

export function LoadingOverlay({ message = 'Chargement…' }: { message?: string }) {
  return (
    <View style={loaderStyles.overlay}>
      <View style={loaderStyles.box}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={loaderStyles.text}>{message}</Text>
      </View>
    </View>
  );
}

const loaderStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  box: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING['3xl'],
    alignItems: 'center',
    gap: 12,
    ...SHADOW.lg,
  },
  text: { color: COLORS.textMuted, fontSize: 15, marginTop: 4 },
});

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      {icon && <Text style={emptyStyles.icon}>{icon}</Text>}
      <Text style={emptyStyles.title}>{title}</Text>
      {subtitle && <Text style={emptyStyles.subtitle}>{subtitle}</Text>}
      {action && (
        <Button label={action.label} onPress={action.onPress} style={{ marginTop: SPACING.lg }} />
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING['3xl'] },
  icon: { fontSize: 48, marginBottom: SPACING.lg },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
});

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastBarProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export function ToastBar({ type, message }: ToastBarProps) {
  const bg = {
    success: COLORS.success,
    error: COLORS.danger,
    info: COLORS.primary,
    warning: COLORS.warning,
  }[type];

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

  return (
    <View style={[toastStyles.bar, { backgroundColor: bg }]}>
      <Text style={toastStyles.icon}>{icons[type]}</Text>
      <Text style={toastStyles.message} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    marginHorizontal: SPACING.lg,
    marginBottom: 8,
    gap: 10,
    ...SHADOW.md,
  },
  icon: { color: '#fff', fontSize: 14, fontWeight: '700' },
  message: { color: '#fff', fontSize: 14, flex: 1 },
});

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={shStyles.row}>
      <Text style={shStyles.title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={shStyles.action}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const shStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  action: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
}

export function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmer',
  confirmVariant = 'primary',
}: ConfirmDialogProps) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={cdStyles.backdrop}>
        <View style={cdStyles.dialog}>
          <Text style={cdStyles.title}>{title}</Text>
          <Text style={cdStyles.message}>{message}</Text>
          <View style={cdStyles.actions}>
            <Button label="Annuler" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const cdStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['2xl'],
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    width: '100%',
    ...SHADOW.lg,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  message: { fontSize: 15, color: COLORS.textMuted, marginBottom: SPACING.xl },
  actions: { flexDirection: 'row', gap: 8 },
});
