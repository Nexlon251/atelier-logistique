import { getSupabase } from '../lib/supabase';
import type { Document, DocumentInput, DocumentCategory } from '../types';

function toDoc(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    title: row.title as string,
    category: row.category as DocumentCategory,
    photo_url: (row.photo_url as string | undefined) ?? undefined,
    photo_path: (row.photo_path as string | undefined) ?? undefined,
    notes: (row.notes as string | undefined) ?? undefined,
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchDocuments(orgId: string): Promise<Document[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('documents')
    .select('*')
    .eq('organization_id', orgId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toDoc(r as Record<string, unknown>));
}

/**
 * Upload a photo to Supabase Storage.
 * Returns { path, url } or throws.
 */
export async function uploadDocumentPhoto(
  orgId: string,
  localUri: string,
  mimeType?: string,
): Promise<{ path: string; url: string }> {
  const sb = getSupabase();
  const ext = localUri.split('.').pop() ?? 'jpg';
  const path = `${orgId}/${Date.now()}.${ext}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await sb.storage
    .from('documents')
    .upload(path, blob, { contentType: mimeType ?? 'image/jpeg', upsert: false });

  if (error) throw new Error(error.message);

  const { data: urlData } = sb.storage.from('documents').getPublicUrl(path);
  return { path, url: urlData.publicUrl };
}

export async function createDocument(
  orgId: string,
  input: DocumentInput,
  photo?: { uri: string; mimeType?: string },
): Promise<Document> {
  const sb = getSupabase();
  let photo_url: string | undefined;
  let photo_path: string | undefined;

  if (photo) {
    const uploaded = await uploadDocumentPhoto(orgId, photo.uri, photo.mimeType);
    photo_url = uploaded.url;
    photo_path = uploaded.path;
  }

  const { data, error } = await sb
    .from('documents')
    .insert({ ...input, organization_id: orgId, photo_url, photo_path })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Création document échouée');
  return toDoc(data as Record<string, unknown>);
}

export async function updateDocument(
  id: string,
  updates: Partial<DocumentInput>,
): Promise<Document> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Mise à jour document échouée');
  return toDoc(data as Record<string, unknown>);
}

export async function archiveDocument(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('documents')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDocument(id: string, photoPath?: string): Promise<void> {
  const sb = getSupabase();
  if (photoPath) {
    await sb.storage.from('documents').remove([photoPath]);
  }
  const { error } = await sb.from('documents').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
