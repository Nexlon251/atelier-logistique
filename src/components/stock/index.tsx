import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW } from '../ui/theme';
import { Button, Badge, Modal, Input, Select, ConfirmDialog } from '../ui/index';
import type { Part, PartInput, StockMovement, MovementType } from '../../types';

// ─── PartCard ─────────────────────────────────────────────────────────────────

interface PartCardProps {
  part: Part;
  movements: StockMovement[];
  onEdit: (part: Part) => void;
  onArchive: (id: string) => void;
  onMovement: (part: Part) => void;
}

export function PartCard({ part, movements, onEdit, onArchive, onMovement }: PartCardProps) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const isAlert = part.quantity <= part.alert_threshold;
  const isOut = part.quantity === 0;

  const recent = movements
    .filter((m) => m.part_id === part.id)
    .slice(0, 3);

  return (
    <>
      <View style={[cardStyles.card, SHADOW.sm, isAlert && cardStyles.cardAlert]}>
        {/* Alert strip */}
        {isAlert && (
          <View style={[cardStyles.alertStrip, { backgroundColor: isOut ? COLORS.danger : COLORS.warning }]} />
        )}

        <View style={cardStyles.body}>
          <View style={cardStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={cardStyles.name} numberOfLines={2}>{part.name}</Text>
              {part.reference && (
                <Text style={cardStyles.ref}>Réf: {part.reference}</Text>
              )}
              {part.location && (
                <Text style={cardStyles.location}>📍 {part.location}</Text>
              )}
            </View>

            {/* Quantity bubble */}
            <View style={[
              cardStyles.qtyBubble,
              { backgroundColor: isOut ? COLORS.dangerLight : isAlert ? COLORS.warningLight : COLORS.primaryLight },
            ]}>
              <Text style={[
                cardStyles.qty,
                { color: isOut ? COLORS.danger : isAlert ? COLORS.warning : COLORS.primary },
              ]}>
                {part.quantity}
              </Text>
              {part.unit && <Text style={cardStyles.unit}>{part.unit}</Text>}
            </View>
          </View>

          {/* Alert message */}
          {isAlert && (
            <View style={cardStyles.alertBanner}>
              <Text style={[cardStyles.alertText, { color: isOut ? COLORS.danger : COLORS.warning }]}>
                {isOut ? '🚨 Rupture de stock' : `⚠️ Stock bas — seuil : ${part.alert_threshold}`}
              </Text>
            </View>
          )}

          {/* Recent movements */}
          {recent.length > 0 && (
            <View style={cardStyles.movements}>
              {recent.map((m) => (
                <View key={m.id} style={cardStyles.movRow}>
                  <Text style={[
                    cardStyles.movType,
                    { color: m.type === 'in' ? COLORS.success : m.type === 'out' ? COLORS.danger : COLORS.warning },
                  ]}>
                    {m.type === 'in' ? '▲' : m.type === 'out' ? '▼' : '↔'} {m.quantity}
                  </Text>
                  {m.reason && (
                    <Text style={cardStyles.movReason} numberOfLines={1}>{m.reason}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={cardStyles.actions}>
            <Button
              label="Mouvement"
              variant="primary"
              size="sm"
              onPress={() => onMovement(part)}
              style={{ flex: 1 }}
            />
            <Button
              label="✎"
              variant="secondary"
              size="sm"
              onPress={() => onEdit(part)}
            />
            <Button
              label="⋯"
              variant="ghost"
              size="sm"
              onPress={() => setConfirmArchive(true)}
            />
          </View>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmArchive}
        title="Archiver la pièce"
        message={`« ${part.name} » sera archivée. Le stock et l'historique sont conservés.`}
        confirmLabel="Archiver"
        confirmVariant="danger"
        onConfirm={() => { setConfirmArchive(false); onArchive(part.id); }}
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
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardAlert: { borderColor: COLORS.warning },
  alertStrip: { width: 4 },
  body: { flex: 1, padding: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  ref: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  location: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  qtyBubble: {
    minWidth: 56,
    height: 56,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qty: { fontSize: 22, fontWeight: '800' },
  unit: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  alertBanner: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.sm,
    padding: 6,
    marginBottom: SPACING.sm,
  },
  alertText: { fontSize: 12, fontWeight: '600' },
  movements: { marginBottom: SPACING.sm, gap: 2 },
  movRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  movType: { fontSize: 12, fontWeight: '700', minWidth: 32 },
  movReason: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  actions: { flexDirection: 'row', gap: 6 },
});

// ─── MovementModal ────────────────────────────────────────────────────────────

interface MovementModalProps {
  visible: boolean;
  part: Part | null;
  onClose: () => void;
  onRecord: (
    partId: string,
    type: MovementType,
    quantity: number,
    reason?: string,
  ) => Promise<void>;
}

const MOVEMENT_OPTIONS = [
  { label: '▲ Entrée en stock', value: 'in' },
  { label: '▼ Sortie de stock', value: 'out' },
  { label: '↔ Ajustement (nouvelle valeur absolue)', value: 'adjustment' },
];

export function MovementModal({ visible, part, onClose, onRecord }: MovementModalProps) {
  const [type, setType] = useState<MovementType>('in');
  const [quantityStr, setQuantityStr] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleRecord() {
    const qty = parseInt(quantityStr, 10);
    if (!quantityStr || isNaN(qty) || qty <= 0) {
      setError('Quantité invalide (nombre entier positif)');
      return;
    }
    if (type === 'out' && part && qty > part.quantity) {
      setError(`Stock insuffisant : ${part.quantity} ${part.unit ?? ''} disponible(s)`);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onRecord(part!.id, type, qty, reason.trim() || undefined);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setType('in');
    setQuantityStr('');
    setReason('');
    setError('');
    onClose();
  }

  if (!part) return null;

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={`Mouvement — ${part.name}`}
      footer={
        <>
          <Button label="Annuler" variant="secondary" onPress={handleClose} style={{ flex: 1 }} />
          <Button
            label="Enregistrer"
            onPress={handleRecord}
            loading={saving}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      {/* Current stock display */}
      <View style={movStyles.stockInfo}>
        <Text style={movStyles.stockLabel}>Stock actuel</Text>
        <Text style={movStyles.stockQty}>
          {part.quantity} {part.unit ?? ''}
        </Text>
      </View>

      {error ? <Text style={movStyles.error}>{error}</Text> : null}

      <Select
        label="Type de mouvement"
        value={type}
        options={MOVEMENT_OPTIONS}
        onChange={(v) => setType(v as MovementType)}
      />
      <Input
        label={type === 'adjustment' ? 'Nouvelle quantité totale *' : 'Quantité *'}
        value={quantityStr}
        onChangeText={setQuantityStr}
        placeholder="Ex: 5"
        keyboardType="number-pad"
        hint={type === 'adjustment'
          ? `La quantité sera ajustée à cette valeur (actuellement ${part.quantity})`
          : type === 'out'
          ? `Maximum ${part.quantity} ${part.unit ?? ''}`
          : undefined}
      />
      <Input
        label="Motif"
        value={reason}
        onChangeText={setReason}
        placeholder="Ex: Révision Renault Clio, Réapprovisionnement…"
      />
    </Modal>
  );
}

const movStyles = StyleSheet.create({
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  stockLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  stockQty: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  error: {
    backgroundColor: COLORS.dangerLight,
    color: COLORS.danger,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
});

// ─── PartForm ─────────────────────────────────────────────────────────────────

interface PartFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (input: PartInput) => Promise<void>;
  initialValues?: Partial<Part>;
}

export function PartForm({ visible, onClose, onSave, initialValues }: PartFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [reference, setReference] = useState(initialValues?.reference ?? '');
  const [quantityStr, setQuantityStr] = useState(String(initialValues?.quantity ?? ''));
  const [alertStr, setAlertStr] = useState(String(initialValues?.alert_threshold ?? '2'));
  const [unit, setUnit] = useState(initialValues?.unit ?? '');
  const [location, setLocation] = useState(initialValues?.location ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialValues?.id;

  async function handleSave() {
    if (!name.trim()) { setError('Le nom est obligatoire'); return; }
    const qty = parseInt(quantityStr, 10);
    const alert = parseInt(alertStr, 10);
    if (isNaN(qty) || qty < 0) { setError('Quantité invalide'); return; }
    if (isNaN(alert) || alert < 0) { setError('Seuil d\'alerte invalide'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        reference: reference.trim() || undefined,
        quantity: qty,
        alert_threshold: alert,
        unit: unit.trim() || undefined,
        location: location.trim() || undefined,
      });
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setName(initialValues?.name ?? '');
    setReference(initialValues?.reference ?? '');
    setQuantityStr(String(initialValues?.quantity ?? ''));
    setAlertStr(String(initialValues?.alert_threshold ?? '2'));
    setUnit(initialValues?.unit ?? '');
    setLocation(initialValues?.location ?? '');
    setError('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={isEdit ? 'Modifier la pièce' : 'Nouvelle pièce'}
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
      {error ? <Text style={movStyles.error}>{error}</Text> : null}
      <Input label="Nom *" value={name} onChangeText={setName} placeholder="Ex: Filtre à huile Mann W712/95" />
      <Input label="Référence" value={reference} onChangeText={setReference} placeholder="Ex: W712/95" />
      <Input
        label="Quantité initiale *"
        value={quantityStr}
        onChangeText={setQuantityStr}
        keyboardType="number-pad"
        placeholder="0"
        hint={isEdit ? "Utilisez un mouvement de stock pour modifier la quantité" : undefined}
        editable={!isEdit}
      />
      <Input
        label="Seuil d'alerte *"
        value={alertStr}
        onChangeText={setAlertStr}
        keyboardType="number-pad"
        placeholder="2"
        hint="Alerte affichée quand le stock est inférieur ou égal à ce seuil"
      />
      <Input label="Unité" value={unit} onChangeText={setUnit} placeholder="pièce, litre, jeu…" />
      <Input label="Emplacement" value={location} onChangeText={setLocation} placeholder="Ex: Étagère A1" />
    </Modal>
  );
}
