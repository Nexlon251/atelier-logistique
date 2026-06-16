import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useApp } from '../context/AppContext';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  ConfirmDialog,
  LoadingOverlay,
} from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';
import * as orgRepo from '../repository/organizations';
import type { Membership, Invitation, Role } from '../types';

const ROLE_LABELS: Record<Role, string> = {
  owner: '👑 Propriétaire',
  admin: '🛡️ Admin',
  member: '👤 Membre',
};

const ROLE_OPTIONS: { label: string; value: string }[] = [
  { label: '🛡️ Admin', value: 'admin' },
  { label: '👤 Membre', value: 'member' },
];

const BILLING_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '✅ Actif', color: COLORS.success, bg: COLORS.successLight },
  trialing: { label: '🎁 Essai gratuit', color: '#7C3AED', bg: '#EDE9FE' },
  past_due: { label: '⚠️ Paiement en retard', color: COLORS.warning, bg: COLORS.warningLight },
  canceled: { label: '❌ Annulé', color: COLORS.danger, bg: COLORS.dangerLight },
  none: { label: '— Aucun abonnement', color: COLORS.textMuted, bg: COLORS.surfaceElevated },
};

export function OrganizationScreen() {
 const { user, organization, membership, isDemo, signOut, refreshOrganization, showToast, setScreen } =
    useApp();
  const [members, setMembers] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('member');
  const [inviting, setInviting] = useState(false);

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [removingMember, setRemovingMember] = useState<Membership | null>(null);

  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin' || isOwner;

  const billingInfo = BILLING_LABELS[organization?.billing_status ?? 'none'];

  const loadTeam = useCallback(async () => {
    if (isDemo || !organization) return;
    setLoadingMembers(true);
    try {
      const [m, i] = await Promise.all([
        orgRepo.fetchMembers(organization.id),
        orgRepo.fetchInvitations(organization.id),
      ]);
      setMembers(m);
      setInvitations(i);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }, [isDemo, organization]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    if (!inviteEmail.includes('@')) {
      showToast('error', 'Adresse email invalide');
      return;
    }
    if (!organization) return;
    setInviting(true);
    try {
      const inv = await orgRepo.inviteMember(organization.id, inviteEmail.trim(), inviteRole);
      setInvitations((prev) => [inv, ...prev]);
      setInviteEmail('');
      // Envoyer l'email via Edge Function
      try {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
        const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
        await fetch(`${supabaseUrl}/functions/v1/send-invitation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ invitation_id: inv.id }),
        });
        showToast('success', `Email d'invitation envoyé à ${inviteEmail}`);
      } catch {
        showToast('warning', `Invitation créée mais email non envoyé`);
      }
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erreur d\'invitation');
    } finally {
      setInviting(false);
    }
  }

  async function handleRevokeInvite(id: string) {
    try {
      await orgRepo.revokeInvitation(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      showToast('info', 'Invitation annulée');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleRemoveMember(m: Membership) {
    try {
      await orgRepo.removeMember(m.id);
      setMembers((prev) => prev.filter((mem) => mem.id !== m.id));
      showToast('info', 'Membre retiré');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erreur');
    } finally {
      setRemovingMember(null);
    }
  }

  async function handleUpdateRole(m: Membership, role: Role) {
    try {
      await orgRepo.updateMemberRole(m.id, role);
      setMembers((prev) =>
        prev.map((mem) => (mem.id === m.id ? { ...mem, role } : mem)),
      );
      showToast('success', 'Rôle mis à jour');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function handleOpenBillingPortal() {
    if (isDemo) {
      showToast('info', 'Gestion de l\'abonnement indisponible en mode démo');
      return;
    }
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const url = `${supabaseUrl}/functions/v1/stripe-portal`;
     try {
        const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({ organization_id: organization?.id }),
        });
        const data = await res.json();
       Alert.alert('DEBUG', JSON.stringify(data));
        if (data.url) {
          await Linking.openURL(data.url);
        } else {
          showToast('error', data.error ?? 'Erreur Stripe');
        }
      } catch (err) {
        Alert.alert('DEBUG CATCH', String(err));
        showToast('error', 'Impossible de contacter le serveur');
        console.error('[handleSubscribe]', err);
      showToast('error', 'Impossible d\'accéder au portail de facturation');
    }
  }
  async function handleSubscribe() {
    if (isDemo) { showToast('info', 'Abonnement indisponible en mode demo'); return; }
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const url = supabaseUrl + '/functions/v1/stripe-checkout';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + anonKey, 'apikey': anonKey },
        body: JSON.stringify({ organization_id: organization?.id }),
      });
      const data = await res.json();
      if (data.url) { await Linking.openURL(data.url); }
      else { showToast('error', data.error ?? 'Erreur Stripe'); }
    } catch (err) {
      showToast('error', 'Impossible de contacter le serveur');
    }
  }


  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Organisation</Text>
        <Text style={styles.subtitle}>{organization?.name}</Text>
      </View>

      {isDemo && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>
            🚀 Mode démo — la gestion d'équipe et la facturation sont désactivées.
          </Text>
        </View>
      )}

      {/* Org info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <Card>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Atelier</Text>
            <Text style={styles.infoValue}>{organization?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mon rôle</Text>
            <Text style={styles.infoValue}>{ROLE_LABELS[membership?.role ?? 'member']}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          {user?.full_name && (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{user.full_name}</Text>
            </View>
          )}
        </Card>
      </View>

      {/* Billing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Abonnement</Text>
        <Card>
          <View style={styles.billingRow}>
            <View>
              <Text style={styles.billingStatus}>Statut</Text>
              <Badge
                label={billingInfo.label}
                bg={billingInfo.bg}
                color={billingInfo.color}
              />
            </View>
            {organization?.trial_ends_at && organization.billing_status === 'trialing' && (
              <View>
                <Text style={styles.billingStatus}>Fin essai</Text>
                <Text style={styles.billingDate}>
                  {new Date(organization.trial_ends_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                  })}
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: SPACING.md }} />

          {organization?.billing_status === 'active' || organization?.billing_status === 'past_due' ? (
            <Button
              label="Gérer l'abonnement →"
              variant="secondary"
              onPress={handleOpenBillingPortal}
              fullWidth
            />
          ) : (
            <Button
              label="🚀 S'abonner — 29€/mois"
              onPress={handleSubscribe}
              fullWidth
            />
          )}

          <Text style={styles.billingNote}>
            Paiement sécurisé via Stripe · Annulable à tout moment
          </Text>
        </Card>
      </View>

      {/* Team - only for admin+ */}
      {isAdmin && !isDemo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Équipe ({members.length})</Text>

          {/* Members list */}
          {members.map((m) => (
            <View key={m.id} style={[styles.memberRow, SHADOW.sm]}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {(m.user?.full_name ?? m.user?.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {m.user?.full_name ?? m.user?.email}
                </Text>
                <Text style={styles.memberEmail}>{m.user?.email}</Text>
              </View>
              {isOwner && m.user_id !== user?.id ? (
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  <Select
                    value={m.role}
                    options={ROLE_OPTIONS}
                    onChange={(v) => handleUpdateRole(m, v as Role)}
                    containerStyle={{ marginBottom: 0 }}
                  />
                  <Button
                    label="Retirer"
                    variant="ghost"
                    size="sm"
                    onPress={() => setRemovingMember(m)}
                  />
                </View>
              ) : (
                <Badge
                  label={ROLE_LABELS[m.role]}
                  bg={m.role === 'owner' ? '#FEF3C7' : COLORS.surfaceElevated}
                  color={m.role === 'owner' ? '#92400E' : COLORS.textMuted}
                  size="sm"
                />
              )}
            </View>
          ))}

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <View style={{ marginTop: SPACING.md }}>
              <Text style={styles.invitesSectionLabel}>
                Invitations en attente ({invitations.length})
              </Text>
              {invitations.map((inv) => (
                <View key={inv.id} style={[styles.inviteRow, SHADOW.sm]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inviteEmail}>{inv.email}</Text>
                    <Text style={styles.inviteRole}>{ROLE_LABELS[inv.role]} · En attente</Text>
                  </View>
                  <Button
                    label="Annuler"
                    variant="ghost"
                    size="sm"
                    onPress={() => handleRevokeInvite(inv.id)}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Invite form */}
          <View style={[styles.inviteCard, SHADOW.sm]}>
            <Text style={styles.inviteTitle}>Inviter un collaborateur</Text>
            <Input
              label="Email"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="collaborateur@atelier.fr"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Select
              label="Rôle"
              value={inviteRole}
              options={ROLE_OPTIONS}
              onChange={(v) => setInviteRole(v as Role)}
            />
            <Button
              label="Envoyer l'invitation"
              onPress={handleInvite}
              loading={inviting}
              fullWidth
            />
          </View>
        </View>
      )}

      {/* Danger zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <Card>
          <Button
            label="Se déconnecter"
            variant="danger"
            onPress={() => setConfirmSignOut(true)}
            fullWidth
          />
        </Card>
      </View>

      {/* App version */}
      <Text style={styles.version}>Atelier Logistique v1.0.0</Text>

      {/* Confirm sign out */}
      <ConfirmDialog
        visible={confirmSignOut}
        title="Se déconnecter"
        message="Vous serez redirigé vers l'écran de connexion."
        confirmLabel="Déconnecter"
        confirmVariant="danger"
        onConfirm={() => { setConfirmSignOut(false); signOut(); }}
        onCancel={() => setConfirmSignOut(false)}
      />

      {/* Confirm remove member */}
      <ConfirmDialog
        visible={!!removingMember}
        title="Retirer ce membre"
        message={`${removingMember?.user?.full_name ?? removingMember?.user?.email} n'aura plus accès à votre atelier.`}
        confirmLabel="Retirer"
        confirmVariant="danger"
        onConfirm={() => removingMember && handleRemoveMember(removingMember)}
        onCancel={() => setRemovingMember(null)}
      />

      {loadingMembers && <LoadingOverlay />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  demoBanner: {
    backgroundColor: COLORS.warningLight,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  demoBannerText: { fontSize: 13, color: COLORS.warning, fontWeight: '500' },
  section: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xl },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabel: { fontSize: 14, color: COLORS.textMuted },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billingStatus: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  billingDate: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  billingNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  memberName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  memberEmail: { fontSize: 12, color: COLORS.textMuted },
  invitesSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning,
    gap: 8,
  },
  inviteEmail: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  inviteRole: { fontSize: 12, color: COLORS.textMuted },
  inviteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
});
