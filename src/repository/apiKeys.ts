import { getSupabase } from '../lib/supabase';

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scope: 'read' | 'write' | 'admin';
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `al_live_${hex}`;
}

async function hashKey(plain: string): Promise<string> {
  const buf = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function listApiKeys(organizationId: string): Promise<ApiKey[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createApiKey(params: {
  organizationId: string;
  name: string;
  scope: 'read' | 'write' | 'admin';
  plainKey: string;
}): Promise<ApiKey> {
  const supabase = getSupabase();
  const hash = await hashKey(params.plainKey);
  const prefix = params.plainKey.slice(0, 14);
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      organization_id: params.organizationId,
      name: params.name,
      scope: params.scope,
      key_hash: hash,
      key_prefix: prefix,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function revokeApiKey(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
