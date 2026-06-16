import { getSupabase } from '../lib/supabase';
import type { AppAlert } from '../types';

export async function fetchAlerts(organizationId: string): Promise<AppAlert[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('alerts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AppAlert[];
}

export async function markAlertRead(id: string): Promise<AppAlert> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('alerts')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Impossible de marquer l’alerte comme lue');
  return data as AppAlert;
}
