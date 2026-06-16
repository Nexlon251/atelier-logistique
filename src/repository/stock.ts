import { getSupabase } from '../lib/supabase';
import type { Part, PartInput, StockMovement, MovementType } from '../types';

function toPart(row: Record<string, unknown>): Part {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    name: row.name as string,
    reference: (row.reference as string | undefined) ?? undefined,
    quantity: row.quantity as number,
    alert_threshold: row.alert_threshold as number,
    unit: (row.unit as string | undefined) ?? undefined,
    location: (row.location as string | undefined) ?? undefined,
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// ─── Parts ───────────────────────────────────────────────────────────────────

export async function fetchParts(orgId: string): Promise<Part[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('parts')
    .select('*')
    .eq('organization_id', orgId)
    .is('archived_at', null)
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toPart(r as Record<string, unknown>));
}

export async function createPart(orgId: string, input: PartInput): Promise<Part> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('parts')
    .insert({ ...input, organization_id: orgId })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Création pièce échouée');
  return toPart(data as Record<string, unknown>);
}

export async function updatePart(id: string, updates: Partial<PartInput>): Promise<Part> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('parts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Mise à jour pièce échouée');
  return toPart(data as Record<string, unknown>);
}

export async function archivePart(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('parts')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Stock Movements (append-only) ───────────────────────────────────────────

export async function fetchMovements(
  orgId: string,
  partId?: string,
  limit = 50,
): Promise<StockMovement[]> {
  const sb = getSupabase();
  let query = sb
    .from('stock_movements')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (partId) query = query.eq('part_id', partId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as StockMovement[];
}

/**
 * Record a stock movement and update the part quantity.
 * Movements are append-only — corrections go through 'adjustment'.
 */
export async function recordMovement(
  orgId: string,
  partId: string,
  type: MovementType,
  quantity: number,
  reason?: string,
  createdBy?: string,
): Promise<{ part: Part; movement: StockMovement }> {
  const sb = getSupabase();

  // Get current part
  const { data: partRow, error: partErr } = await sb
    .from('parts')
    .select('*')
    .eq('id', partId)
    .single();

  if (partErr || !partRow) throw new Error('Pièce introuvable');
  const current = toPart(partRow as Record<string, unknown>);

  // Calculate new quantity
  let newQty: number;
  if (type === 'in') newQty = current.quantity + quantity;
  else if (type === 'out') {
    if (quantity > current.quantity) throw new Error('Quantité insuffisante en stock');
    newQty = current.quantity - quantity;
  } else {
    // adjustment — quantity is the absolute new value
    newQty = quantity;
  }

  // Insert movement (append-only)
  const { data: mov, error: movErr } = await sb
    .from('stock_movements')
    .insert({
      organization_id: orgId,
      part_id: partId,
      type,
      quantity,
      reason,
      created_by: createdBy,
    })
    .select()
    .single();

  if (movErr || !mov) throw new Error(movErr?.message ?? 'Mouvement échoué');

  // Update part quantity
  const { data: updated, error: upErr } = await sb
    .from('parts')
    .update({ quantity: newQty, updated_at: new Date().toISOString() })
    .eq('id', partId)
    .select()
    .single();

  if (upErr || !updated) throw new Error(upErr?.message ?? 'Mise à jour stock échouée');

  return { part: toPart(updated as Record<string, unknown>), movement: mov as StockMovement };
}
