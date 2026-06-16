import { getSupabase } from '../lib/supabase';
import type { Task, TaskInput, TaskStatus, TaskPriority } from '../types';

function toTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    title: row.title as string,
    description: (row.description as string | undefined) ?? undefined,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    due_date: (row.due_date as string | undefined) ?? undefined,
    assigned_to: (row.assigned_to as string | undefined) ?? undefined,
    archived_at: (row.archived_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchTasks(orgId: string): Promise<Task[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .eq('organization_id', orgId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toTask(r as Record<string, unknown>));
}

export async function createTask(orgId: string, input: TaskInput): Promise<Task> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tasks')
    .insert({ ...input, organization_id: orgId })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Création tâche échouée');
  return toTask(data as Record<string, unknown>);
}

export async function updateTask(id: string, updates: Partial<TaskInput>): Promise<Task> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Mise à jour tâche échouée');
  return toTask(data as Record<string, unknown>);
}

export async function archiveTask(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTask(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
