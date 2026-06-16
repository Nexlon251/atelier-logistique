import { getSupabase } from '../lib/supabase';
import type { Organization, Membership, Invitation, Role } from '../types';

// ─── Organizations ────────────────────────────────────────────────────────────

export async function fetchUserOrganization(
  userId: string,
): Promise<{ organization: Organization; membership: Membership } | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('memberships')
    .select('*, organizations(*)')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    membership: {
      id: data.id,
      organization_id: data.organization_id,
      user_id: data.user_id,
      role: data.role as Role,
      created_at: data.created_at,
    },
    organization: data.organizations as Organization,
  };
}

export async function createOrganization(
  userId: string,
  name: string,
): Promise<{ organization: Organization; membership: Membership }> {
  const sb = getSupabase();
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const { data: org, error: orgErr } = await sb
    .from('organizations')
    .insert({ name, slug, billing_status: 'trialing', created_by: userId })
    .select()
    .single();

  if (orgErr || !org) throw new Error(orgErr?.message ?? 'Création organisation échouée');

  const { data: membership, error: memErr } = await sb
    .from('memberships')
    .insert({ organization_id: org.id, user_id: userId, role: 'owner' })
    .select()
    .single();

  if (memErr || !membership) throw new Error(memErr?.message ?? 'Création membre échouée');

  return { organization: org as Organization, membership: membership as Membership };
}

export async function updateOrganization(
  orgId: string,
  updates: Partial<Pick<Organization, 'name'>>,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('organizations').update(updates).eq('id', orgId);
  if (error) throw new Error(error.message);
}

// ─── Memberships ─────────────────────────────────────────────────────────────

export async function fetchMembers(orgId: string): Promise<Membership[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('memberships')
    .select('*, profiles(email, full_name)')
    .eq('organization_id', orgId)
    .order('created_at');

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role as Role,
    created_at: row.created_at,
    user: row.profiles
      ? { email: row.profiles.email, full_name: row.profiles.full_name }
      : undefined,
  }));
}

export async function updateMemberRole(
  membershipId: string,
  role: Role,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('memberships')
    .update({ role })
    .eq('id', membershipId);
  if (error) throw new Error(error.message);
}

export async function removeMember(membershipId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('memberships').delete().eq('id', membershipId);
  if (error) throw new Error(error.message);
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export async function fetchInvitations(orgId: string): Promise<Invitation[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('invitations')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Invitation[];
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: Role,
): Promise<Invitation> {
  const sb = getSupabase();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const { data, error } = await sb
    .from('invitations')
    .insert({ organization_id: orgId, email, role, status: 'pending', expires_at: expiresAt })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Invitation échouée');
  return data as Invitation;
}

export async function revokeInvitation(inviteId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('invitations').delete().eq('id', inviteId);
  if (error) throw new Error(error.message);
}

export async function acceptInvitation(token: string, userId: string): Promise<void> {
  const sb = getSupabase();
  const { data: invite, error: invErr } = await sb
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (invErr || !invite) throw new Error('Invitation introuvable ou expirée');

  if (new Date(invite.expires_at) < new Date()) {
    await sb.from('invitations').update({ status: 'expired' }).eq('id', invite.id);
    throw new Error('Cette invitation a expiré');
  }

  await sb
    .from('memberships')
    .insert({ organization_id: invite.organization_id, user_id: userId, role: invite.role });

  await sb.from('invitations').update({ status: 'accepted' }).eq('id', invite.id);
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export async function refreshBillingStatus(orgId: string): Promise<Organization> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Organisation introuvable');
  return data as Organization;
}
