import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import {
  listApiKeys, createApiKey, revokeApiKey, generateApiKey, type ApiKey,
} from '../repository/apiKeys';

const C = theme.colors;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function maskKey(prefix: string): string { return `${prefix}••••••••••••••••`; }

export function APIKeyScreen() {
  const { organization, setScreen } = useApp();
  const organizationId = organization?.id ?? null;

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState<'read' | 'write' | 'admin'>('read');
  const [revealedKey, setRevealedKey] = useState<{ name: string; key: string } | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try { const data = await listApiKeys(organizationId); setKeys(data); }
    catch { Alert.alert('Erreur', 'Impossible de charger les clés API.'); }
    finally { setLoading(false); }
  }, [organizationId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) { Alert.alert('Nom requis', 'Donnez un nom à cette clé.'); return; }
    if (!organizationId) return;
    setCreating(true);
    try {
      const plain = generateApiKey();
      await createApiKey({ organizationId, name: newKeyName.trim(), scope: newKeyScope, plainKey: plain });
      setRevealedKey({ name: newKeyName.trim(), key: plain });
      setShowForm(false); setNewKeyName(''); setNewKeyScope('read');
      load();
    } catch { Alert.alert('Erreur', 'Impossible de créer la clé.'); }
    finally { setCreating(false); }
  };

  const handleRevoke = (key: ApiKey) => {
    Alert.alert('Révoquer la clé ?', `"${key.name}" sera immédiatement invalidée.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Révoquer', style: 'destructive', onPress: async () => {
        try { await revokeApiKey(key.id); load(); }
        catch { Alert.alert('Erreur', 'Impossible de révoquer.'); }
      }},
    ]);
  };

  const copyToClipboard = (value: string) => {
    if (Platform.OS === 'web') { navigator.clipboard?.writeText(value); }
    Alert.alert('Copié !', 'La clé a été copiée dans le presse-papiers.');
  };

  const scopeStyle = (scope: string) => {
    switch (scope) {
      case 'admin': return { bg: '#FEE2E2', color: '#DC2626' };
      case 'write': return { bg: '#FEF3C7', color: '#D97706' };
      default:      return { bg: '#DCFCE7', color: '#16A34A' };
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <View style={s.header}>
        <TouchableOpacity onPress={() => setScreen('organization')} style={s.backBtn}>
          <Text style={s.backText}>‹ Organisation</Text>
        </TouchableOpacity>
        <Text style={s.title}>Clés API</Text>
        <Text style={s.subtitle}>Accédez à vos données via l'API REST. Gardez vos clés secrètes.</Text>
      </View>

      {revealedKey && (
        <View style={s.revealBanner}>
          <Text style={s.revealTitle}>🔑 Clé créée — copiez-la maintenant</Text>
          <Text style={s.revealSub}>Elle ne sera plus affichée après fermeture.</Text>
          <View style={s.revealRow}>
            <Text style={s.revealKey} selectable numberOfLines={1}>{revealedKey.key}</Text>
            <TouchableOpacity style={s.copyBtn} onPress={() => copyToClipboard(revealedKey.key)}>
              <Text style={s.copyBtnText}>Copier</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setRevealedKey(null)}>
            <Text style={s.revealDismiss}>Fermer</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showForm ? (
        <TouchableOpacity style={s.createBtn} onPress={() => setShowForm(true)}>
          <Text style={s.createBtnText}>+ Nouvelle clé API</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.form}>
          <Text style={s.label}>Nom de la clé</Text>
          <TextInput
            style={s.input} placeholder="ex : Intégration ERP…"
            placeholderTextColor={C.textMuted} value={newKeyName}
            onChangeText={setNewKeyName} autoFocus
          />
          <Text style={s.label}>Portée</Text>
          <View style={s.scopeRow}>
            {(['read', 'write', 'admin'] as const).map((sc) => (
              <TouchableOpacity key={sc}
                style={[s.chip, newKeyScope === sc && s.chipActive]}
                onPress={() => setNewKeyScope(sc)}>
                <Text style={[s.chipText, newKeyScope === sc && s.chipTextActive]}>{sc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn}
              onPress={() => { setShowForm(false); setNewKeyName(''); setNewKeyScope('read'); }}>
              <Text style={s.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={handleCreate} disabled={creating}>
              {creating ? <ActivityIndicator color={C.white} size="small" />
                        : <Text style={s.confirmText}>Créer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} />
      ) : keys.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🔐</Text>
          <Text style={s.emptyText}>Aucune clé API pour le moment.</Text>
        </View>
      ) : keys.map((key) => {
        const badge = scopeStyle(key.scope);
        return (
          <View key={key.id} style={[s.card, !!key.revoked_at && s.cardRevoked]}>
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.keyName}>{key.name}</Text>
                <Text style={s.keyMask}>{maskKey(key.key_prefix)}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: badge.bg }]}>
                <Text style={[s.badgeText, { color: badge.color }]}>{key.scope}</Text>
              </View>
            </View>
            <View style={s.cardBottom}>
              <Text style={s.meta}>
                Créée le {formatDate(key.created_at)}
                {key.last_used_at ? `  ·  Utilisée ${formatDate(key.last_used_at)}` : '  ·  Jamais utilisée'}
              </Text>
              {key.revoked_at
                ? <Text style={s.revokedLabel}>Révoquée</Text>
                : <TouchableOpacity onPress={() => handleRevoke(key)}><Text style={s.revokeBtn}>Révoquer</Text></TouchableOpacity>}
            </View>
          </View>
        );
      })}

      <View style={s.note}>
        <Text style={s.noteText}>
          🔒  Les clés sont hachées (SHA-256) avant stockage. En cas de compromission, révoquez immédiatement.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content:   { padding: 16, paddingBottom: 40 },
  header:    { marginBottom: 20 },
  backBtn:   { marginBottom: 8 },
  backText:  { fontSize: 14, color: C.primary, fontWeight: '600' },
  title:     { fontSize: 24, fontWeight: '700', color: C.text, marginBottom: 4 },
  subtitle:  { fontSize: 14, color: C.textMuted, lineHeight: 20 },
  revealBanner: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 12, padding: 16, marginBottom: 16 },
  revealTitle: { fontSize: 15, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  revealSub:   { fontSize: 13, color: '#B45309', marginBottom: 12 },
  revealRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  revealKey:   { flex: 1, fontSize: 11, fontFamily: 'monospace', color: '#1C1917', backgroundColor: '#FEF3C7', padding: 8, borderRadius: 6 },
  copyBtn:     { backgroundColor: '#F59E0B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  copyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  revealDismiss: { fontSize: 13, color: '#B45309', textAlign: 'right' },
  createBtn:     { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  createBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },
  form: { backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  label: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text, backgroundColor: C.white },
  scopeRow:       { flexDirection: 'row', gap: 8 },
  chip:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  chipActive:     { backgroundColor: C.primary, borderColor: C.primary },
  chipText:       { fontSize: 13, color: C.text, fontWeight: '500' },
  chipTextActive: { color: C.white },
  formActions:  { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:    { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  cancelText:   { color: C.text, fontWeight: '600' },
  confirmBtn:   { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center' },
  confirmText:  { color: C.white, fontWeight: '700' },
  card:         { backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  cardRevoked:  { opacity: 0.5 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  keyName:      { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  keyMask:      { fontSize: 12, fontFamily: 'monospace', color: C.textMuted },
  badge:        { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText:    { fontSize: 12, fontWeight: '600' },
  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta:         { fontSize: 12, color: C.textMuted, flex: 1, marginRight: 8 },
  revokeBtn:    { fontSize: 13, fontWeight: '600', color: C.danger },
  revokedLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  empty:        { alignItems: 'center', paddingTop: 60 },
  emptyIcon:    { fontSize: 40, marginBottom: 12 },
  emptyText:    { fontSize: 15, color: C.textMuted },
  note:         { marginTop: 24, backgroundColor: C.primarySoft, borderRadius: 10, padding: 14 },
  noteText:     { fontSize: 12, color: C.textMuted, lineHeight: 18 },
});
