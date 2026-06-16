import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SPACING, SHADOW } from '../ui/theme';
import { Button, Badge, Modal, Input, Select, ConfirmDialog } from '../ui/index';
import type { Document, DocumentInput, DocumentCategory } from '../../types';

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_LABELS: Record<DocumentCategory, string> = {
  invoice: 'Facture',
  receipt: 'Reçu / Bon',
  part: 'Pièce',
  manual: 'Manuel',
  delivery: 'Livraison',
  other: 'Autre',
};

const CAT_COLORS: Record<DocumentCategory, { bg: string; text: string }> = {
  invoice: { bg: COLORS.primaryLight, text: COLORS.primary },
  receipt: { bg: COLORS.successLight, text: COLORS.success },
  part: { bg: COLORS.warningLight, text: COLORS.warning },
  manual: { bg: '#EDE9FE', text: '#7C3AED' },
  delivery: { bg: '#FEF9C3', text: '#A16207' },
  other: { bg: COLORS.surfaceElevated, text: COLORS.textMuted },
};

const CATEGORY_OPTIONS = (Object.keys(CAT_LABELS) as DocumentCategory[]).map((k) => ({
  label: CAT_LABELS[k],
  value: k,
}));

// ─── DocumentCard ─────────────────────────────────────────────────────────────

interface DocumentCardProps {
  doc: Document;
  onEdit: (doc: Document) => void;
  onArchive: (id: string) => void;
}

export function DocumentCard({ doc, onEdit, onArchive }: DocumentCardProps) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const catStyle = CAT_COLORS[doc.category];

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <>
      <View style={[cardStyles.card, SHADOW.sm]}>
        {doc.photo_url ? (
          <Image source={{ uri: doc.photo_url }} style={cardStyles.thumb} resizeMode="cover" />
        ) : (
          <View style={[cardStyles.thumb, cardStyles.thumbPlaceholder]}>
            <Text style={cardStyles.thumbIcon}>📄</Text>
          </View>
        )}

        <View style={cardStyles.body}>
          <View style={cardStyles.header}>
            <Text style={cardStyles.title} numberOfLines={2}>
              {doc.title}
            </Text>
            <TouchableOpacity onPress={() => onEdit(doc)} style={cardStyles.editBtn}>
              <Text style={{ color: COLORS.textMuted }}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            <Badge label={CAT_LABELS[doc.category]} bg={catStyle.bg} color={catStyle.text} size="sm" />
            <Badge label={formatDate(doc.created_at)} bg={COLORS.surfaceElevated} color={COLORS.textMuted} size="sm" />
          </View>

          {doc.notes && (
            <Text style={cardStyles.notes} numberOfLines={2}>
              {doc.notes}
            </Text>
          )}

          <Button
            label="Archiver"
            variant="ghost"
            size="sm"
            onPress={() => setConfirmArchive(true)}
            style={{ marginTop: 8, alignSelf: 'flex-start' }}
          />
        </View>
      </View>

      <ConfirmDialog
        visible={confirmArchive}
        title="Archiver le document"
        message={`« ${doc.title} » sera archivé.`}
        confirmLabel="Archiver"
        confirmVariant="danger"
        onConfirm={() => { setConfirmArchive(false); onArchive(doc.id); }}
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
  thumb: { width: 80, height: 100 },
  thumbPlaceholder: {
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: { fontSize: 28 },
  body: { flex: 1, padding: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 6 },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
});

// ─── DocumentForm ─────────────────────────────────────────────────────────────

interface DocumentFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    input: DocumentInput,
    photo?: { uri: string; mimeType?: string },
  ) => Promise<void>;
  initialValues?: Partial<Document>;
}

export function DocumentForm({ visible, onClose, onSave, initialValues }: DocumentFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [category, setCategory] = useState<DocumentCategory>(
    initialValues?.category ?? 'other',
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [photo, setPhoto] = useState<{ uri: string; mimeType?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialValues?.id;

  async function pickPhoto(source: 'camera' | 'gallery') {
    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à l\'appareil photo est nécessaire.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à la galerie est nécessaire.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
    }
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Le titre est obligatoire'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave(
        { title: title.trim(), category, notes: notes.trim() || undefined },
        photo ?? undefined,
      );
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setTitle(initialValues?.title ?? '');
    setCategory(initialValues?.category ?? 'other');
    setNotes(initialValues?.notes ?? '');
    setPhoto(null);
    setError('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={isEdit ? 'Modifier le document' : 'Nouveau document'}
      footer={
        <>
          <Button label="Annuler" variant="secondary" onPress={handleClose} style={{ flex: 1 }} />
          <Button
            label={isEdit ? 'Sauvegarder' : 'Ajouter'}
            onPress={handleSave}
            loading={saving}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      {error ? (
        <Text style={formStyles.error}>{error}</Text>
      ) : null}

      <Input
        label="Titre *"
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Facture fournitures Novembre"
      />
      <Select
        label="Catégorie"
        value={category}
        options={CATEGORY_OPTIONS}
        onChange={(v) => setCategory(v as DocumentCategory)}
      />
      <Input
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Références, remarques…"
        multiline
        numberOfLines={2}
      />

      {/* Photo picker */}
      <Text style={formStyles.photoLabel}>Photo du document</Text>
      {photo || initialValues?.photo_url ? (
        <View style={{ marginBottom: SPACING.md }}>
          <Image
            source={{ uri: photo?.uri ?? initialValues?.photo_url }}
            style={formStyles.preview}
            resizeMode="contain"
          />
          {photo && (
            <Button
              label="Changer la photo"
              variant="ghost"
              size="sm"
              onPress={() => setPhoto(null)}
            />
          )}
        </View>
      ) : (
        <View style={formStyles.photoRow}>
          <Button
            label="📷 Appareil photo"
            variant="secondary"
            size="sm"
            onPress={() => pickPhoto('camera')}
            style={{ flex: 1 }}
          />
          <Button
            label="🖼 Galerie"
            variant="secondary"
            size="sm"
            onPress={() => pickPhoto('gallery')}
            style={{ flex: 1 }}
          />
        </View>
      )}
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
  photoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    marginBottom: SPACING.sm,
  },
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
});
