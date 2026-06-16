import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { theme } from '../constants/theme';
import type { Membership, Invitation, Role } from '../types';
import {
  fetchMembers,
  fetchInvitations,
  inviteMember,
  updateMemberRole,
  removeMember,
  revokeInvitation,
} from '../repository/organizations';

const C = theme.colors;

const ROLES: Role[] = ['owner', 'admin', 'member'];
const ROLE_LABELS: Record<string, string> = { owner: 'Propriétaire', admin: 'Admin', member: 'Membre' };
const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: '#FEF3C7', text: '#D97706' },
  admin: { bg: '#EDE9FE', text: '#7C3AED' },
  member: { bg: '#F0FDF4', text: '#16A34A' },
};

function initials(name?: string, email?: string): string {
  const src = name ?? email ?? '?';
  return src.split(/[\s@]/)[0].slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function EnterpriseScreen() {
  const { organization, membership, setScreen } = useApp();
  const orgId = organization?.id ?? null;
  const myRole = membership?.role ?? 'member';
  const canManage = myRole === 'owner' || myRole === 'admin';

  const [members, setMembers] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('member');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [m, i] = await Promise.all([fetchMembers(orgId), fetchInvitations(orgId)]);
      setMembers(m);
      setInvitations(i);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les membres.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // ── Invite ────────────────────────────────────────────────────────────────

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !orgId) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      Alert.alert('Email invalide', 'Vérifiez l\'adresse email saisie.');
      return;
    }
    setInviting(true);
    try {
      await inviteMember(orgId, inviteEmail.trim().toLowerCase(), inviteRole);
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRole('member');
      load();
      Alert.alert('Invitation envoyée', `Un email a été envoyé à ${inviteEmail.trim()}.`);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'invitation.');
    } finally {
      setInviting(false);
    }
  };

  // ── Role change ───────────────────────────────────────────────────────────

  const handleRoleChange = (m: Membership) => {
    if (!canManage || m.role === 'owner') return;
    const options = ROLES.filter(r => r !== 'owner' && r !== m.role);
    Alert.alert(
      'Changer le rôle',
      `Membre : ${m.user?.full_name ?? m.user?.email ?? 'Inconnu'}`,
      [
        ...options.map(r => ({
          text: ROLE_LABELS[r],
          onPress: async () => {
            try { await updateMemberRole(m.id, r); load(); }
            catch { Alert.alert('Erreur', 'Impossible de modifier le rôle.'); }
          },
        })),
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  // ── Remove member ─────────────────────────────────────────────────────────

  const handleRemove = (m: Membership) => {
    if (!canManage || m.role === 'owner') return;
    const label = m.user?.full_name ?? m.user?.email ?? 'ce membre';
    Alert.alert(
      'Retirer le membre ?',
      `${label} perdra l'accès à l'organisation.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Retirer', style: 'destructive', onPress: async () => {
          try { await removeMember(m.id); load(); }
          catch { Alert.alert('Erreur', 'Impossible de retirer le membre.'); }
        }},
      ]
    );
  };

  // ── Revoke invitation ─────────────────────────────────────────────────────

  const handleRevokeInvite = (inv: Invitation) => {
    Alert.alert(
      'Annuler l\'invitation ?',
      `L'invitation pour ${inv.email} sera révoquée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Révoquer', style: 'destructive', onPress: async () => {
          try { await revokeInvitation(inv.id); load(); }
          catch { Alert.alert('Erreur', 'Impossible de révoquer l\'invitation.'); }
        }},
      ]
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => setScreen('organization')} style={s.backBtn}>
          <Text style={s.backText}>‹ Organisation</Text>
        </TouchableOpacity>
        <Text style={s.title}>Équipe</Text>
        <Text style={s.subtitle}>
          {organization?.name ?? 'Organisation'} · {members.length} membre{members.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Invite button / form */}
      {canManage && !showInviteForm && (
        <TouchableOpacity style={s.inviteBtn} onPress={() => setShowInviteForm(true)}>
          <Text style={s.inviteBtnText}>+ Inviter un membre</Text>
        </TouchableOpacity>
      )}

      {showInviteForm && (
        <View style={s.form}>
          <Text style={s.formTitle}>Nouvelle invitation</Text>

          <Text style={s.label}>Adresse email</Text>
          <TextInput
            style={s.input}
            placeholder="prenom.nom@exemple.com"
            placeholderTextColor={C.textMuted}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />

          <Text style={s.label}>Rôle</Text>
          <View style={s.roleRow}>
            {(['member', 'admin'] as Role[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.roleChip, inviteRole === r && s.roleChipActive]}
                onPress={() => setInviteRole(r)}
              >
                <Text style={[s.roleChipText, inviteRole === r && s.roleChipTextActive]}>
                  {ROLE_LABELS[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.formActions}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => { setShowInviteForm(false); setInviteEmail(''); setInviteRole('member'); }}
            >
              <Text style={s.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={handleInvite} disabled={inviting}>
              {inviting
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={s.confirmText}>Envoyer</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.primary} />
      ) : (
        <>
          {/* Members list */}
          <Text style={s.sectionTitle}>Membres actifs</Text>
          {members.map((m) => {
            const badge = ROLE_COLORS[m.role] ?? ROLE_COLORS.member;
            const name = m.user?.full_name;
            const email = m.user?.email;
            const isOwner = m.role === 'owner';
            return (
              <View key={m.id} style={s.memberCard}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials(name, email)}</Text>
                </View>
                <View style={s.memberInfo}>
                  {name && <Text style={s.memberName}>{name}</Text>}
                  <Text style={s.memberEmail}>{email ?? '—'}</Text>
                  <Text style={s.memberDate}>Depuis le {formatDate(m.created_at)}</Text>
                </View>
                <View style={s.memberRight}>
                  <View style={[s.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.badgeText, { color: badge.text }]}>{ROLE_LABELS[m.role] ?? m.role}</Text>
                  </View>
                  {canManage && !isOwner && (
                    <View style={s.memberActions}>
                      <TouchableOpacity onPress={() => handleRoleChange(m)} style={s.actionBtn}>
                        <Text style={s.actionEdit}>Rôle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleRemove(m)} style={s.actionBtn}>
                        <Text style={s.actionRemove}>Retirer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Invitations en attente</Text>
              {invitations.map((inv) => {
                const badge = ROLE_COLORS[inv.role] ?? ROLE_COLORS.member;
                return (
                  <View key={inv.id} style={s.inviteCard}>
                    <View style={[s.avatar, s.avatarPending]}>
                      <Text style={s.avatarText}>{inv.email.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={s.memberInfo}>
                      <Text style={s.memberEmail}>{inv.email}</Text>
                      <Text style={s.memberDate}>Expire le {formatDate(inv.expires_at)}</Text>
                    </View>
                    <View style={s.memberRight}>
                      <View style={[s.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[s.badgeText, { color: badge.text }]}>{ROLE_LABELS[inv.role] ?? inv.role}</Text>
                      </View>
                      {canManage && (
                        <TouchableOpacity onPress={() => handleRevokeInvite(inv)} style={s.actionBtn}>
                          <Text style={s.actionRemove}>Annuler</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  content:   { padding: 16, paddingBottom: 40 },

  header:   { marginBottom: 20 },
  backBtn:  { marginBottom: 8 },
  backText: { fontSize: 14, color: C.primary, fontWeight: '600' },
  title:    { fontSize: 24, fontWeight: '700', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: C.textMuted },

  inviteBtn:     { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  inviteBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },

  form:      { backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  formTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  label:     { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 6, marginTop: 10 },
  input:     { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text, backgroundColor: C.white },
  roleRow:        { flexDirection: 'row', gap: 8 },
  roleChip:       { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  roleChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  roleChipText:       { fontSize: 13, color: C.text, fontWeight: '500' },
  roleChipTextActive: { color: C.white },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:   { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  cancelText:  { color: C.text, fontWeight: '600' },
  confirmBtn:  { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center' },
  confirmText: { color: C.white, fontWeight: '700' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },

  memberCard:  { backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  inviteCard:  { backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },

  avatar:        { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarPending: { backgroundColor: C.mutedSurface },
  avatarText:    { fontSize: 14, fontWeight: '700', color: C.primary },

  memberInfo:  { flex: 1 },
  memberName:  { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 1 },
  memberEmail: { fontSize: 13, color: C.textMuted },
  memberDate:  { fontSize: 11, color: C.textMuted, marginTop: 2 },

  memberRight:   { alignItems: 'flex-end', gap: 6 },
  badge:         { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText:     { fontSize: 12, fontWeight: '600' },
  memberActions: { flexDirection: 'row', gap: 10 },
  actionBtn:     {},
  actionEdit:    { fontSize: 12, color: C.primary, fontWeight: '600' },
  actionRemove:  { fontSize: 12, color: C.danger, fontWeight: '600' },
});
