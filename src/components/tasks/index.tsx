import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW } from '../ui/theme';
import {
  Button,
  Badge,
  Modal,
  Input,
  Select,
  ConfirmDialog,
} from '../ui/index';
import type { Task, TaskInput, TaskStatus, TaskPriority } from '../../types';

// ─── Labels ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
};

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  todo: { bg: '#F1F5F9', text: COLORS.textMuted },
  in_progress: { bg: COLORS.primaryLight, text: COLORS.primary },
  done: { bg: COLORS.successLight, text: COLORS.success },
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  low: { bg: '#F8FAFC', text: COLORS.textLight },
  medium: { bg: COLORS.warningLight, text: COLORS.warning },
  high: { bg: COLORS.dangerLight, text: COLORS.danger },
};

export function priorityDot(priority: TaskPriority) {
  const colors = { low: COLORS.textLight, medium: COLORS.warning, high: COLORS.danger };
  return colors[priority];
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onArchive: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export function TaskCard({ task, onEdit, onArchive, onStatusChange }: TaskCardProps) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const statusStyle = STATUS_COLORS[task.status];
  const priorityStyle = PRIORITY_COLORS[task.priority];

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done';

  function formatDate(iso?: string) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  }

  const nextStatus: TaskStatus | null =
    task.status === 'todo'
      ? 'in_progress'
      : task.status === 'in_progress'
      ? 'done'
      : null;

  return (
    <>
      <View style={[cardStyles.card, SHADOW.sm]}>
        {/* Priority bar */}
        <View style={[cardStyles.priorityBar, { backgroundColor: priorityDot(task.priority) }]} />

        <View style={cardStyles.body}>
          {/* Header */}
          <View style={cardStyles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={cardStyles.title} numberOfLines={2}>
                {task.title}
              </Text>
              {task.description && (
                <Text style={cardStyles.desc} numberOfLines={1}>
                  {task.description}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => onEdit(task)} style={cardStyles.editBtn}>
              <Text style={cardStyles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          {/* Meta */}
          <View style={cardStyles.meta}>
            <Badge
              label={STATUS_LABELS[task.status]}
              bg={statusStyle.bg}
              color={statusStyle.text}
              size="sm"
            />
            <Badge
              label={PRIORITY_LABELS[task.priority]}
              bg={priorityStyle.bg}
              color={priorityStyle.text}
              size="sm"
            />
            {task.due_date && (
              <Badge
                label={formatDate(task.due_date) ?? ''}
                bg={isOverdue ? COLORS.dangerLight : COLORS.surfaceElevated}
                color={isOverdue ? COLORS.danger : COLORS.textMuted}
                size="sm"
              />
            )}
          </View>

          {/* Actions */}
          <View style={cardStyles.actions}>
            {nextStatus && (
              <Button
                label={nextStatus === 'in_progress' ? '▶ Démarrer' : '✓ Terminer'}
                variant={nextStatus === 'done' ? 'success' : 'primary'}
                size="sm"
                onPress={() => onStatusChange(task.id, nextStatus)}
              />
            )}
            <Button
              label="Archiver"
              variant="ghost"
              size="sm"
              onPress={() => setConfirmArchive(true)}
            />
          </View>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmArchive}
        title="Archiver la tâche"
        message={`« ${task.title} » sera archivée. Vous pourrez la retrouver dans les archives.`}
        confirmLabel="Archiver"
        confirmVariant="danger"
        onConfirm={() => { setConfirmArchive(false); onArchive(task.id); }}
        onCancel={() => setConfirmArchive(false)}
      />
    </>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priorityBar: { width: 4 },
  body: { flex: 1, padding: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: { color: COLORS.textMuted, fontSize: 16 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: SPACING.sm },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});

// ─── TaskForm ─────────────────────────────────────────────────────────────────

interface TaskFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (input: TaskInput) => Promise<void>;
  initialValues?: Partial<Task>;
}

const STATUS_OPTIONS = [
  { label: 'À faire', value: 'todo' },
  { label: 'En cours', value: 'in_progress' },
  { label: 'Terminé', value: 'done' },
];

const PRIORITY_OPTIONS = [
  { label: '🟢 Basse', value: 'low' },
  { label: '🟡 Moyenne', value: 'medium' },
  { label: '🔴 Haute', value: 'high' },
];

export function TaskForm({ visible, onClose, onSave, initialValues }: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(initialValues?.status ?? 'todo');
  const [priority, setPriority] = useState<TaskPriority>(initialValues?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initialValues?.due_date?.slice(0, 10) ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialValues?.id;

  async function handleSave() {
    if (!title.trim()) { setError('Le titre est obligatoire'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setTitle(initialValues?.title ?? '');
    setDescription(initialValues?.description ?? '');
    setStatus(initialValues?.status ?? 'todo');
    setPriority(initialValues?.priority ?? 'medium');
    setDueDate(initialValues?.due_date?.slice(0, 10) ?? '');
    setError('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
      footer={
        <>
          <Button label="Annuler" variant="secondary" onPress={handleClose} style={{ flex: 1 }} />
          <Button
            label={isEdit ? 'Sauvegarder' : 'Créer'}
            onPress={handleSave}
            loading={saving}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
      <Input
        label="Titre *"
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Révision 15 000 km — Renault Clio"
        returnKeyType="next"
      />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Détails, notes, matériaux nécessaires…"
        multiline
        numberOfLines={3}
      />
      <Select
        label="Statut"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(v) => setStatus(v as TaskStatus)}
      />
      <Select
        label="Priorité"
        value={priority}
        options={PRIORITY_OPTIONS}
        onChange={(v) => setPriority(v as TaskPriority)}
      />
      <Input
        label="Échéance (AAAA-MM-JJ)"
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="2024-12-31"
        keyboardType="numbers-and-punctuation"
      />
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  error: {
    backgroundColor: COLORS.dangerLight,
    color: COLORS.danger,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
});
