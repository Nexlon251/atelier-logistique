# ================================================================
# Atelier Logistique — Script de migration vers la nouvelle version
# USAGE : Placer ce fichier dans C:\Users\matti\atelier-logistique
#         Puis : .\migrate.ps1
# ================================================================

$root = $PSScriptRoot
Write-Host ""
Write-Host "=== Migration Atelier Logistique ===" -ForegroundColor Cyan
Write-Host "Dossier cible : $root"
Write-Host ""

New-Item -ItemType Directory -Force -Path "$root\src" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\cache" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\components" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\components\documents" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\components\stock" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\components\tasks" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\components\ui" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\context" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\lib" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\repository" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\screens" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\shell" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\src\types" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\supabase" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\supabase\functions" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\supabase\functions\stripe-checkout" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\supabase\functions\stripe-portal" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\supabase\functions\stripe-webhook" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\tests" | Out-Null

Write-Host "Dossiers créés ✓" -ForegroundColor Green

# --- src/types/index.ts ---
$content = @"
// ─── Auth & User ────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string;
  full_name?: string;
}

// ─── Organisation & Multi-tenant ────────────────────────────────────────────

export type BillingStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'none';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  billing_status: BillingStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  trial_ends_at?: string;
  created_at: string;
}

export type Role = 'owner' | 'admin' | 'member';

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  user?: {
    email: string;
    full_name?: string;
  };
}

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: Role;
  status: InviteStatus;
  token: string;
  expires_at: string;
  created_at: string;
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assigned_to?: string;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskInput = Omit<
  Task,
  'id' | 'organization_id' | 'archived_at' | 'created_at' | 'updated_at'
>;

// ─── Documents ──────────────────────────────────────────────────────────────

export type DocumentCategory =
  | 'invoice'
  | 'receipt'
  | 'part'
  | 'manual'
  | 'delivery'
  | 'other';

export interface Document {
  id: string;
  organization_id: string;
  title: string;
  category: DocumentCategory;
  photo_url?: string;
  photo_path?: string;
  notes?: string;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentInput = Omit<
  Document,
  | 'id'
  | 'organization_id'
  | 'photo_url'
  | 'photo_path'
  | 'archived_at'
  | 'created_at'
  | 'updated_at'
>;

// ─── Stock ──────────────────────────────────────────────────────────────────

export type MovementType = 'in' | 'out' | 'adjustment';

export interface Part {
  id: string;
  organization_id: string;
  name: string;
  reference?: string;
  quantity: number;
  alert_threshold: number;
  unit?: string;
  location?: string;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type PartInput = Omit<
  Part,
  'id' | 'organization_id' | 'archived_at' | 'created_at' | 'updated_at'
>;

export interface StockMovement {
  id: string;
  organization_id: string;
  part_id: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  created_by?: string;
  created_at: string;
}

// ─── App State ──────────────────────────────────────────────────────────────

export type AppScreen =
  | 'login'
  | 'onboarding'
  | 'home'
  | 'tasks'
  | 'documents'
  | 'stock'
  | 'organization'
  | 'subscription';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface OrgSnapshot {
  tasks: Task[];
  documents: Document[];
  parts: Part[];
  movements: StockMovement[];
  fetchedAt: string;
}

"@
[System.IO.File]::WriteAllText("$root\src\types\index.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/types/index.ts"

# --- src/lib/supabase.ts ---
$content = @"
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 20;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase non configuré — mode démo actif.');
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});

"@
[System.IO.File]::WriteAllText("$root\src\lib\supabase.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/lib/supabase.ts"

# --- src/lib/demoData.ts ---
$content = @"
import type { Task, Document, Part, StockMovement, Organization, Membership } from '../types';

const NOW = new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 86400000).toISOString();
const NEXT_WEEK = new Date(Date.now() + 7 * 86400000).toISOString();
const NEXT_MONTH = new Date(Date.now() + 30 * 86400000).toISOString();

export const DEMO_ORG: Organization = {
  id: 'demo-org-001',
  name: 'Garage Dupont & Fils',
  slug: 'garage-dupont',
  billing_status: 'active',
  created_at: YESTERDAY,
};

export const DEMO_MEMBERSHIP: Membership = {
  id: 'demo-member-001',
  organization_id: 'demo-org-001',
  user_id: 'demo-user-001',
  role: 'owner',
  created_at: YESTERDAY,
};

export const DEMO_TASKS: Task[] = [
  {
    id: 'task-001',
    organization_id: 'demo-org-001',
    title: 'Révision 15 000 km — Renault Clio IV',
    description: 'Vidange moteur, filtre à huile, filtre habitacle, filtre à air. Vérification niveaux.',
    status: 'in_progress',
    priority: 'high',
    due_date: NEXT_WEEK,
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: NOW,
  },
  {
    id: 'task-002',
    organization_id: 'demo-org-001',
    title: 'Changement plaquettes avant — BMW 320d',
    description: 'Plaquettes Ferodo DS3000. Vérifier disques.',
    status: 'todo',
    priority: 'medium',
    due_date: NEXT_WEEK,
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: YESTERDAY,
  },
  {
    id: 'task-003',
    organization_id: 'demo-org-001',
    title: 'Diagnostic voyant moteur — Peugeot 3008',
    description: 'Lecture défauts OBD2. Client signale perte de puissance.',
    status: 'todo',
    priority: 'high',
    due_date: NOW,
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: YESTERDAY,
  },
  {
    id: 'task-004',
    organization_id: 'demo-org-001',
    title: 'Vidange + filtre — Toyota Yaris',
    description: 'Huile moteur 5W30 — 3.5L. Filtre mann.',
    status: 'done',
    priority: 'low',
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: NOW,
  },
  {
    id: 'task-005',
    organization_id: 'demo-org-001',
    title: 'Remplacement courroie distribution — Citroën C5',
    description: 'Kit complet Gates. Pompe à eau à vérifier.',
    status: 'todo',
    priority: 'high',
    due_date: NEXT_MONTH,
    archived_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_DOCUMENTS: Document[] = [
  {
    id: 'doc-001',
    organization_id: 'demo-org-001',
    title: 'Facture fournitures Novembre',
    category: 'invoice',
    notes: 'Fournisseur Auto Distribution. Ref: FAC-2024-1187.',
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: YESTERDAY,
  },
  {
    id: 'doc-002',
    organization_id: 'demo-org-001',
    title: 'Bon commande pièces Bosch',
    category: 'receipt',
    notes: 'Bougies, filtres, liquide de frein.',
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: YESTERDAY,
  },
  {
    id: 'doc-003',
    organization_id: 'demo-org-001',
    title: 'Manuel technique Renault Clio IV',
    category: 'manual',
    notes: 'Chapitre moteur 1.5 dCi 90ch.',
    archived_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'doc-004',
    organization_id: 'demo-org-001',
    title: 'Bon de livraison TotalEnergies',
    category: 'delivery',
    notes: 'Huile moteur 5W30, 20L × 3 bidons.',
    archived_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
];

export const DEMO_PARTS: Part[] = [
  {
    id: 'part-001',
    organization_id: 'demo-org-001',
    name: 'Filtre à huile Mann W712/95',
    reference: 'W712/95',
    quantity: 12,
    alert_threshold: 3,
    unit: 'pièce',
    location: 'Étagère A1',
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: YESTERDAY,
  },
  {
    id: 'part-002',
    organization_id: 'demo-org-001',
    name: 'Plaquettes avant Ferodo DS3000',
    reference: 'FCP1664H',
    quantity: 2,
    alert_threshold: 2,
    unit: 'jeu',
    location: 'Étagère B2',
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: NOW,
  },
  {
    id: 'part-003',
    organization_id: 'demo-org-001',
    name: 'Liquide de frein DOT 4 — 1L',
    reference: 'DOT4-1L',
    quantity: 6,
    alert_threshold: 2,
    unit: 'bouteille',
    location: 'Étagère C3',
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: YESTERDAY,
  },
  {
    id: 'part-004',
    organization_id: 'demo-org-001',
    name: 'Bougies NGK BKR6E',
    reference: 'BKR6E',
    quantity: 20,
    alert_threshold: 8,
    unit: 'pièce',
    location: 'Étagère A3',
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: YESTERDAY,
  },
  {
    id: 'part-005',
    organization_id: 'demo-org-001',
    name: 'Courroie distribution Gates',
    reference: 'K015483XS',
    quantity: 1,
    alert_threshold: 1,
    unit: 'pièce',
    location: 'Étagère D1',
    archived_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'part-006',
    organization_id: 'demo-org-001',
    name: 'Huile moteur 5W30 TotalEnergies',
    reference: '5W30-5L',
    quantity: 8,
    alert_threshold: 3,
    unit: 'bidon 5L',
    location: 'Sol zone fluides',
    archived_at: null,
    created_at: YESTERDAY,
    updated_at: YESTERDAY,
  },
];

export const DEMO_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-001',
    organization_id: 'demo-org-001',
    part_id: 'part-001',
    type: 'in',
    quantity: 5,
    reason: 'Réapprovisionnement commande Bosch',
    created_at: YESTERDAY,
  },
  {
    id: 'mov-002',
    organization_id: 'demo-org-001',
    part_id: 'part-001',
    type: 'out',
    quantity: 1,
    reason: 'Révision Toyota Yaris',
    created_at: NOW,
  },
  {
    id: 'mov-003',
    organization_id: 'demo-org-001',
    part_id: 'part-002',
    type: 'out',
    quantity: 2,
    reason: 'BMW 320d — plaquettes avant',
    created_at: NOW,
  },
];

"@
[System.IO.File]::WriteAllText("$root\src\lib\demoData.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/lib/demoData.ts"

# --- src/lib/sentry.ts ---
$content = @"
/**
 * Sentry wrapper — installe @sentry/react-native puis active le DSN.
 * Sans DSN configuré, toutes les fonctions sont des no-ops silencieux.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

let _initialized = false;

async function init() {
  if (_initialized || !DSN) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: DSN,
      tracesSampleRate: 0.2,
      environment: __DEV__ ? 'development' : 'production',
    });
    _initialized = true;
  } catch {
    /* package not installed — no-op */
  }
}

export async function captureException(err: unknown, ctx?: Record<string, unknown>) {
  await init();
  if (!_initialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    Sentry.captureException(err, { extra: ctx });
  } catch {
    /* no-op */
  }
}

export async function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
  await init();
  if (!_initialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    Sentry.captureMessage(msg, level);
  } catch {
    /* no-op */
  }
}

export async function setUser(user: { id: string; email?: string } | null) {
  await init();
  if (!_initialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    Sentry.setUser(user);
  } catch {
    /* no-op */
  }
}

"@
[System.IO.File]::WriteAllText("$root\src\lib\sentry.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/lib/sentry.ts"

# --- src/cache/localCache.ts ---
$content = @"
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OrgSnapshot } from '../types';

const PREFIX = 'al_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function key(orgId: string): string {
  return ```${PREFIX}:`${orgId}``;
}

/** Persist a full org snapshot to AsyncStorage */
export async function saveSnapshot(orgId: string, snapshot: OrgSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(key(orgId), JSON.stringify(snapshot));
  } catch (err) {
    console.warn('[cache] saveSnapshot failed', err);
  }
}

/** Load a cached snapshot. Returns null if missing or expired. */
export async function loadSnapshot(orgId: string, allowStale = false): Promise<OrgSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(key(orgId));
    if (!raw) return null;
    const snapshot: OrgSnapshot = JSON.parse(raw);
    if (!allowStale) {
      const age = Date.now() - new Date(snapshot.fetchedAt).getTime();
      if (age > CACHE_TTL_MS) return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}

/** Delete the cache for an org (e.g. on logout) */
export async function clearSnapshot(orgId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(orgId));
  } catch {
    /* no-op */
  }
}

/** Clear all org caches */
export async function clearAllSnapshots(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  } catch {
    /* no-op */
  }
}

// ─── Demo persistence ────────────────────────────────────────────────────────

const DEMO_KEY = ```${PREFIX}:demo``;

export async function loadDemoState(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveDemoState(state: Record<string, unknown>): Promise<void> {
  try {
    await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(state));
  } catch {
    /* no-op */
  }
}

export async function clearDemoState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEMO_KEY);
  } catch {
    /* no-op */
  }
}

"@
[System.IO.File]::WriteAllText("$root\src\cache\localCache.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/cache/localCache.ts"

# --- src/repository/tasks.ts ---
$content = @"
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

"@
[System.IO.File]::WriteAllText("$root\src\repository\tasks.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/repository/tasks.ts"

# --- src/repository/documents.ts ---
$content = @"
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
  const path = ```${orgId}/`${Date.now()}.`${ext}``;

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

"@
[System.IO.File]::WriteAllText("$root\src\repository\documents.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/repository/documents.ts"

# --- src/repository/stock.ts ---
$content = @"
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

"@
[System.IO.File]::WriteAllText("$root\src\repository\stock.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/repository/stock.ts"

# --- src/repository/organizations.ts ---
$content = @"
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
    .replace(/^-|-`$/g, '');

  const { data: org, error: orgErr } = await sb
    .from('organizations')
    .insert({ name, slug, billing_status: 'trialing' })
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

"@
[System.IO.File]::WriteAllText("$root\src\repository\organizations.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/repository/organizations.ts"

# --- src/context/AppContext.tsx ---
$content = @"
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { setUser as setSentryUser } from '../lib/sentry';
import { saveSnapshot, loadSnapshot, clearAllSnapshots } from '../cache/localCache';
import {
  DEMO_ORG,
  DEMO_MEMBERSHIP,
  DEMO_TASKS,
  DEMO_DOCUMENTS,
  DEMO_PARTS,
  DEMO_MOVEMENTS,
} from '../lib/demoData';
import * as taskRepo from '../repository/tasks';
import * as docRepo from '../repository/documents';
import * as stockRepo from '../repository/stock';
import * as orgRepo from '../repository/organizations';
import type {
  AppUser,
  Organization,
  Membership,
  Task,
  TaskInput,
  Document,
  DocumentInput,
  DocumentCategory,
  Part,
  PartInput,
  StockMovement,
  MovementType,
  ToastMessage,
  AppScreen,
  Role,
} from '../types';

// ─── Context shape ───────────────────────────────────────────────────────────

interface AppContextValue {
  // Navigation
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;

  // Auth
  user: AppUser | null;
  organization: Organization | null;
  membership: Membership | null;
  isDemo: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterDemoMode: () => Promise<void>;

  // Toast
  toasts: ToastMessage[];
  showToast: (type: ToastMessage['type'], message: string) => void;

  // Tasks
  tasks: Task[];
  loadingTasks: boolean;
  refreshTasks: () => Promise<void>;
  addTask: (input: TaskInput) => Promise<void>;
  editTask: (id: string, updates: Partial<TaskInput>) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;

  // Documents
  documents: Document[];
  loadingDocuments: boolean;
  refreshDocuments: () => Promise<void>;
  addDocument: (
    input: DocumentInput,
    photo?: { uri: string; mimeType?: string },
  ) => Promise<void>;
  editDocument: (id: string, updates: Partial<DocumentInput>) => Promise<void>;
  archiveDocument: (id: string) => Promise<void>;

  // Stock
  parts: Part[];
  movements: StockMovement[];
  loadingStock: boolean;
  refreshStock: () => Promise<void>;
  addPart: (input: PartInput) => Promise<void>;
  editPart: (id: string, updates: Partial<PartInput>) => Promise<void>;
  archivePart: (id: string) => Promise<void>;
  recordMovement: (
    partId: string,
    type: MovementType,
    quantity: number,
    reason?: string,
  ) => Promise<void>;

  // Org admin
  refreshOrganization: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ─── Demo state helpers ───────────────────────────────────────────────────────

const DEMO_KEY = 'al_demo_state_v1';

async function loadDemoPersistedData() {
  try {
    const raw = await AsyncStorage.getItem(DEMO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveDemoPersistedData(data: {
  tasks: Task[];
  documents: Document[];
  parts: Part[];
  movements: StockMovement[];
}) {
  try {
    await AsyncStorage.setItem(DEMO_KEY, JSON.stringify(data));
  } catch { /* no-op */ }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [user, setUser] = useState<AppUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = String(Date.now());
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ── Boot ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        // Check demo mode
        const demoActive = await AsyncStorage.getItem('al_demo_mode');
        if (demoActive === 'true') {
          await bootstrapDemo();
          return;
        }

        if (!isSupabaseConfigured) {
          // No Supabase AND no demo → show login with demo option
          setIsLoading(false);
          return;
        }

        const sb = getSupabase();
        const { data: { session } } = await sb.auth.getSession();

        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const u: AppUser = {
          id: session.user.id,
          email: session.user.email ?? '',
          full_name: session.user.user_metadata?.full_name,
        };
        setUser(u);
        setSentryUser(u);

        const result = await orgRepo.fetchUserOrganization(u.id);
        if (result) {
          setOrganization(result.organization);
          setMembership(result.membership);
          setScreen('home');
          await loadAllData(result.organization.id);
        } else {
          setScreen('onboarding');
        }
      } catch (err) {
        console.error('[boot]', err);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrapDemo() {
    setIsDemo(true);
    setUser({ id: 'demo-user-001', email: 'demo@atelierlogistique.fr', full_name: 'Mode Démo' });
    setOrganization(DEMO_ORG);
    setMembership(DEMO_MEMBERSHIP);

    const persisted = await loadDemoPersistedData();
    if (persisted) {
      setTasks(persisted.tasks ?? DEMO_TASKS);
      setDocuments(persisted.documents ?? DEMO_DOCUMENTS);
      setParts(persisted.parts ?? DEMO_PARTS);
      setMovements(persisted.movements ?? DEMO_MOVEMENTS);
    } else {
      setTasks(DEMO_TASKS);
      setDocuments(DEMO_DOCUMENTS);
      setParts(DEMO_PARTS);
      setMovements(DEMO_MOVEMENTS);
    }
    setScreen('home');
    setIsLoading(false);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase non configuré.');
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Connexion échouée');

    const u: AppUser = {
      id: data.user.id,
      email: data.user.email ?? '',
      full_name: data.user.user_metadata?.full_name,
    };
    setUser(u);
    setSentryUser(u);

    const result = await orgRepo.fetchUserOrganization(u.id);
    if (result) {
      setOrganization(result.organization);
      setMembership(result.membership);
      setScreen('home');
      await loadAllData(result.organization.id);
    } else {
      setScreen('onboarding');
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase non configuré.');
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Inscription échouée');

    const u: AppUser = {
      id: data.user.id,
      email: data.user.email ?? '',
      full_name: fullName,
    };
    setUser(u);
    setScreen('onboarding');
  }

  async function signOut() {
    await AsyncStorage.removeItem('al_demo_mode');
    await clearAllSnapshots();
    if (!isDemo && isSupabaseConfigured) {
      await getSupabase().auth.signOut();
    }
    setUser(null);
    setOrganization(null);
    setMembership(null);
    setIsDemo(false);
    setTasks([]);
    setDocuments([]);
    setParts([]);
    setMovements([]);
    setScreen('login');
    setSentryUser(null);
  }

  async function enterDemoMode() {
    await AsyncStorage.setItem('al_demo_mode', 'true');
    setIsLoading(true);
    await bootstrapDemo();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadAllData(orgId: string) {
    // Try cache first
    const cached = await loadSnapshot(orgId);
    if (cached) {
      setTasks(cached.tasks);
      setDocuments(cached.documents);
      setParts(cached.parts);
      setMovements(cached.movements);
    }
    // Always refresh from network
    await Promise.all([
      refreshTasksFor(orgId),
      refreshDocumentsFor(orgId),
      refreshStockFor(orgId),
    ]);
  }

  async function refreshTasksFor(orgId: string) {
    setLoadingTasks(true);
    try {
      const data = await taskRepo.fetchTasks(orgId);
      setTasks(data);
    } finally {
      setLoadingTasks(false);
    }
  }

  async function refreshDocumentsFor(orgId: string) {
    setLoadingDocuments(true);
    try {
      const data = await docRepo.fetchDocuments(orgId);
      setDocuments(data);
    } finally {
      setLoadingDocuments(false);
    }
  }

  async function refreshStockFor(orgId: string) {
    setLoadingStock(true);
    try {
      const [p, m] = await Promise.all([
        stockRepo.fetchParts(orgId),
        stockRepo.fetchMovements(orgId),
      ]);
      setParts(p);
      setMovements(m);
    } finally {
      setLoadingStock(false);
    }
  }

  // Persist cache after data changes
  useEffect(() => {
    if (!organization || isDemo) return;
    saveSnapshot(organization.id, {
      tasks,
      documents,
      parts,
      movements,
      fetchedAt: new Date().toISOString(),
    });
  }, [tasks, documents, parts, movements, organization, isDemo]);

  // Persist demo state
  useEffect(() => {
    if (!isDemo) return;
    saveDemoPersistedData({ tasks, documents, parts, movements });
  }, [tasks, documents, parts, movements, isDemo]);

  // ── Public refresh functions ──────────────────────────────────────────────

  const refreshTasks = useCallback(async () => {
    if (isDemo || !organization) return;
    await refreshTasksFor(organization.id);
  }, [isDemo, organization]);

  const refreshDocuments = useCallback(async () => {
    if (isDemo || !organization) return;
    await refreshDocumentsFor(organization.id);
  }, [isDemo, organization]);

  const refreshStock = useCallback(async () => {
    if (isDemo || !organization) return;
    await refreshStockFor(organization.id);
  }, [isDemo, organization]);

  const refreshOrganization = useCallback(async () => {
    if (isDemo || !organization) return;
    try {
      const updated = await orgRepo.refreshBillingStatus(organization.id);
      setOrganization(updated);
    } catch (err) {
      console.error('[refreshOrg]', err);
    }
  }, [isDemo, organization]);

  // ── Task mutations ────────────────────────────────────────────────────────

  function uuid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  const addTask = useCallback(async (input: TaskInput) => {
    if (isDemo) {
      const now = new Date().toISOString();
      const t: Task = {
        ...input,
        id: uuid(),
        organization_id: 'demo-org-001',
        archived_at: null,
        created_at: now,
        updated_at: now,
      };
      setTasks((prev) => [t, ...prev]);
      showToast('success', 'Tâche créée');
      return;
    }
    if (!organization) throw new Error('Pas d\'organisation');
    const t = await taskRepo.createTask(organization.id, input);
    setTasks((prev) => [t, ...prev]);
    showToast('success', 'Tâche créée');
  }, [isDemo, organization, showToast]);

  const editTask = useCallback(async (id: string, updates: Partial<TaskInput>) => {
    if (isDemo) {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: now } : t)),
      );
      showToast('success', 'Tâche modifiée');
      return;
    }
    const updated = await taskRepo.updateTask(id, updates);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    showToast('success', 'Tâche modifiée');
  }, [isDemo, showToast]);

  const archiveTask = useCallback(async (id: string) => {
    if (isDemo) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      showToast('info', 'Tâche archivée');
      return;
    }
    await taskRepo.archiveTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('info', 'Tâche archivée');
  }, [isDemo, showToast]);

  // ── Document mutations ────────────────────────────────────────────────────

  const addDocument = useCallback(
    async (input: DocumentInput, photo?: { uri: string; mimeType?: string }) => {
      if (isDemo) {
        const now = new Date().toISOString();
        const d: Document = {
          ...input,
          id: uuid(),
          organization_id: 'demo-org-001',
          photo_url: photo?.uri,
          archived_at: null,
          created_at: now,
          updated_at: now,
        };
        setDocuments((prev) => [d, ...prev]);
        showToast('success', 'Document ajouté');
        return;
      }
      if (!organization) throw new Error('Pas d\'organisation');
      const d = await docRepo.createDocument(organization.id, input, photo);
      setDocuments((prev) => [d, ...prev]);
      showToast('success', 'Document ajouté');
    },
    [isDemo, organization, showToast],
  );

  const editDocument = useCallback(async (id: string, updates: Partial<DocumentInput>) => {
    if (isDemo) {
      const now = new Date().toISOString();
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates, updated_at: now } : d)),
      );
      showToast('success', 'Document modifié');
      return;
    }
    const updated = await docRepo.updateDocument(id, updates);
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
    showToast('success', 'Document modifié');
  }, [isDemo, showToast]);

  const archiveDocument = useCallback(async (id: string) => {
    if (isDemo) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      showToast('info', 'Document archivé');
      return;
    }
    await docRepo.archiveDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast('info', 'Document archivé');
  }, [isDemo, showToast]);

  // ── Stock mutations ───────────────────────────────────────────────────────

  const addPart = useCallback(async (input: PartInput) => {
    if (isDemo) {
      const now = new Date().toISOString();
      const p: Part = {
        ...input,
        id: uuid(),
        organization_id: 'demo-org-001',
        archived_at: null,
        created_at: now,
        updated_at: now,
      };
      setParts((prev) => [...prev, p]);
      showToast('success', 'Pièce ajoutée');
      return;
    }
    if (!organization) throw new Error('Pas d\'organisation');
    const p = await stockRepo.createPart(organization.id, input);
    setParts((prev) => [...prev, p]);
    showToast('success', 'Pièce ajoutée');
  }, [isDemo, organization, showToast]);

  const editPart = useCallback(async (id: string, updates: Partial<PartInput>) => {
    if (isDemo) {
      const now = new Date().toISOString();
      setParts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: now } : p)),
      );
      showToast('success', 'Pièce modifiée');
      return;
    }
    const updated = await stockRepo.updatePart(id, updates);
    setParts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    showToast('success', 'Pièce modifiée');
  }, [isDemo, showToast]);

  const archivePart = useCallback(async (id: string) => {
    if (isDemo) {
      setParts((prev) => prev.filter((p) => p.id !== id));
      showToast('info', 'Pièce archivée');
      return;
    }
    await stockRepo.archivePart(id);
    setParts((prev) => prev.filter((p) => p.id !== id));
    showToast('info', 'Pièce archivée');
  }, [isDemo, showToast]);

  const recordMovement = useCallback(
    async (partId: string, type: MovementType, quantity: number, reason?: string) => {
      if (isDemo) {
        const now = new Date().toISOString();
        const mov: StockMovement = {
          id: uuid(),
          organization_id: 'demo-org-001',
          part_id: partId,
          type,
          quantity,
          reason,
          created_at: now,
        };
        setParts((prev) =>
          prev.map((p) => {
            if (p.id !== partId) return p;
            const newQty =
              type === 'in'
                ? p.quantity + quantity
                : type === 'out'
                ? Math.max(0, p.quantity - quantity)
                : quantity;
            return { ...p, quantity: newQty, updated_at: now };
          }),
        );
        setMovements((prev) => [mov, ...prev]);
        showToast('success', type === 'in' ? 'Entrée enregistrée' : type === 'out' ? 'Sortie enregistrée' : 'Ajustement enregistré');
        return;
      }
      if (!organization || !user) throw new Error('Pas d\'organisation');
      const { part, movement } = await stockRepo.recordMovement(
        organization.id,
        partId,
        type,
        quantity,
        reason,
        user.id,
      );
      setParts((prev) => prev.map((p) => (p.id === partId ? part : p)));
      setMovements((prev) => [movement, ...prev]);
      showToast('success', type === 'in' ? 'Entrée enregistrée' : type === 'out' ? 'Sortie enregistrée' : 'Ajustement enregistré');
    },
    [isDemo, organization, user, showToast],
  );

  // ─────────────────────────────────────────────────────────────────────────

  const value: AppContextValue = {
    screen,
    setScreen,
    user,
    organization,
    membership,
    isDemo,
    isLoading,
    signIn,
    signUp,
    signOut,
    enterDemoMode,
    toasts,
    showToast,
    tasks,
    loadingTasks,
    refreshTasks,
    addTask,
    editTask,
    archiveTask,
    documents,
    loadingDocuments,
    refreshDocuments,
    addDocument,
    editDocument,
    archiveDocument,
    parts,
    movements,
    loadingStock,
    refreshStock,
    addPart,
    editPart,
    archivePart,
    recordMovement,
    refreshOrganization,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

"@
[System.IO.File]::WriteAllText("$root\src\context\AppContext.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/context/AppContext.tsx"

# --- src/components/ui/theme.ts ---
$content = @"
import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',
  primaryMuted: '#EFF6FF',

  success: '#10B981',
  successLight: '#D1FAE5',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  info: '#6366F1',
  infoLight: '#EDE9FE',

  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textDisabled: '#CBD5E1',

  white: '#FFFFFF',
  black: '#000000',

  // Status chips
  todo: '#64748B',
  in_progress: '#2563EB',
  done: '#10B981',

  // Priority
  low: '#94A3B8',
  medium: '#F59E0B',
  high: '#EF4444',

  // Tab bar
  tabActive: '#2563EB',
  tabInactive: '#94A3B8',
  tabBg: '#FFFFFF',
} as const;

export const FONTS = {
  regular: undefined,
  medium: undefined,
  semiBold: undefined,
  bold: undefined,
} as const;

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const globalStyles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row' },
  center: { alignItems: 'center', justifyContent: 'center' },
  screenBg: { flex: 1, backgroundColor: COLORS.bg },
});

"@
[System.IO.File]::WriteAllText("$root\src\components\ui\theme.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/components/ui/theme.ts"

# --- src/components/ui/index.tsx ---
$content = @"
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal as RNModal,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Animated,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW } from './theme';

// ─── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const bg = {
    primary: COLORS.primary,
    secondary: COLORS.surface,
    danger: COLORS.danger,
    ghost: 'transparent',
    success: COLORS.success,
  }[variant];

  const textColor = {
    primary: COLORS.white,
    secondary: COLORS.text,
    danger: COLORS.white,
    ghost: COLORS.primary,
    success: COLORS.white,
  }[variant];

  const borderColor = variant === 'secondary' ? COLORS.border : 'transparent';

  const paddingV = { sm: 8, md: 12, lg: 16 }[size];
  const paddingH = { sm: 12, md: 16, lg: 20 }[size];
  const fontSize = { sm: 13, md: 15, lg: 16 }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        btnStyles.base,
        {
          backgroundColor: disabled ? COLORS.border : bg,
          borderColor,
          borderWidth: variant === 'secondary' ? 1 : 0,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          alignSelf: fullWidth ? undefined : 'flex-start',
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size=`"small`" />
      ) : (
        <View style={btnStyles.row}>
          {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
          <Text
            style={[
              btnStyles.label,
              { color: disabled ? COLORS.textMuted : textColor, fontSize },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  base: { borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontWeight: '600' },
});

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
}

export function Card({ children, style, onPress, elevated }: CardProps) {
  const content = (
    <View
      style={[
        cardStyles.base,
        elevated ? SHADOW.md : SHADOW.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

// ─── Badge ───────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, color, bg, size = 'md' }: BadgeProps) {
  const fontSize = size === 'sm' ? 10 : 12;
  return (
    <View
      style={[
        badgeStyles.base,
        { backgroundColor: bg ?? COLORS.primaryLight, paddingHorizontal: size === 'sm' ? 6 : 8 },
      ]}
    >
      <Text style={[badgeStyles.label, { color: color ?? COLORS.primary, fontSize }]}>
        {label}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: { borderRadius: RADIUS.full, paddingVertical: 2, alignSelf: 'flex-start' },
  label: { fontWeight: '600' },
});

// ─── Input ───────────────────────────────────────────────────────────────────

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  multiline?: boolean;
  numberOfLines?: number;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  multiline,
  numberOfLines,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[inputStyles.container, containerStyle]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <TextInput
        style={[
          inputStyles.input,
          focused && inputStyles.focused,
          error ? inputStyles.errored : null,
          multiline && { height: (numberOfLines ?? 3) * 22, textAlignVertical: 'top' },
        ]}
        placeholderTextColor={COLORS.textLight}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline={multiline}
        numberOfLines={numberOfLines}
        {...props}
      />
      {error && <Text style={inputStyles.errorText}>{error}</Text>}
      {hint && !error && <Text style={inputStyles.hint}>{hint}</Text>}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  focused: { borderColor: COLORS.primary },
  errored: { borderColor: COLORS.danger },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
});

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectOption { label: string; value: string }

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  containerStyle?: ViewStyle;
}

export function Select({ label, value, options, onChange, containerStyle }: SelectProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={[inputStyles.container, containerStyle]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      <TouchableOpacity
        style={[inputStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={{ color: current ? COLORS.text : COLORS.textLight, fontSize: 15 }}>
          {current?.label ?? 'Sélectionner…'}
        </Text>
        <Text style={{ color: COLORS.textMuted }}>▾</Text>
      </TouchableOpacity>

      <RNModal visible={open} transparent animationType=`"fade`" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={selectStyles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={selectStyles.sheet}>
            {label && <Text style={selectStyles.title}>{label}</Text>}
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    selectStyles.option,
                    opt.value === value && selectStyles.optionActive,
                  ]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Text
                    style={[
                      selectStyles.optionLabel,
                      opt.value === value && { color: COLORS.primary, fontWeight: '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.value === value && <Text style={{ color: COLORS.primary }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}

const selectStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    maxHeight: '60%',
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  optionActive: { backgroundColor: COLORS.primaryMuted },
  optionLabel: { fontSize: 15, color: COLORS.text },
});

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ visible, onClose, title, children, footer }: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType=`"slide`" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          {title && (
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                <Text style={modalStyles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: SPACING.lg }}
            keyboardShouldPersistTaps=`"handled`"
          >
            {children}
          </ScrollView>
          {footer && <View style={modalStyles.footer}>{footer}</View>}
        </View>
      </View>
    </RNModal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    gap: 8,
  },
});

// ─── Loading Overlay ─────────────────────────────────────────────────────────

export function LoadingOverlay({ message = 'Chargement…' }: { message?: string }) {
  return (
    <View style={loaderStyles.overlay}>
      <View style={loaderStyles.box}>
        <ActivityIndicator color={COLORS.primary} size=`"large`" />
        <Text style={loaderStyles.text}>{message}</Text>
      </View>
    </View>
  );
}

const loaderStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  box: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING['3xl'],
    alignItems: 'center',
    gap: 12,
    ...SHADOW.lg,
  },
  text: { color: COLORS.textMuted, fontSize: 15, marginTop: 4 },
});

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      {icon && <Text style={emptyStyles.icon}>{icon}</Text>}
      <Text style={emptyStyles.title}>{title}</Text>
      {subtitle && <Text style={emptyStyles.subtitle}>{subtitle}</Text>}
      {action && (
        <Button label={action.label} onPress={action.onPress} style={{ marginTop: SPACING.lg }} />
      )}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING['3xl'] },
  icon: { fontSize: 48, marginBottom: SPACING.lg },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
});

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastBarProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export function ToastBar({ type, message }: ToastBarProps) {
  const bg = {
    success: COLORS.success,
    error: COLORS.danger,
    info: COLORS.primary,
    warning: COLORS.warning,
  }[type];

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

  return (
    <View style={[toastStyles.bar, { backgroundColor: bg }]}>
      <Text style={toastStyles.icon}>{icons[type]}</Text>
      <Text style={toastStyles.message} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    marginHorizontal: SPACING.lg,
    marginBottom: 8,
    gap: 10,
    ...SHADOW.md,
  },
  icon: { color: '#fff', fontSize: 14, fontWeight: '700' },
  message: { color: '#fff', fontSize: 14, flex: 1 },
});

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={shStyles.row}>
      <Text style={shStyles.title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={shStyles.action}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const shStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  action: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
}

export function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmer',
  confirmVariant = 'primary',
}: ConfirmDialogProps) {
  return (
    <RNModal visible={visible} transparent animationType=`"fade`" onRequestClose={onCancel}>
      <View style={cdStyles.backdrop}>
        <View style={cdStyles.dialog}>
          <Text style={cdStyles.title}>{title}</Text>
          <Text style={cdStyles.message}>{message}</Text>
          <View style={cdStyles.actions}>
            <Button label=`"Annuler`" variant=`"secondary`" onPress={onCancel} style={{ flex: 1 }} />
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const cdStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING['2xl'],
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    width: '100%',
    ...SHADOW.lg,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  message: { fontSize: 15, color: COLORS.textMuted, marginBottom: SPACING.xl },
  actions: { flexDirection: 'row', gap: 8 },
});

"@
[System.IO.File]::WriteAllText("$root\src\components\ui\index.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/components/ui/index.tsx"

# --- src/components/tasks/index.tsx ---
$content = @"
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW } from '../ui/theme';
import {
  Button,
  Badge,
  Modal,
  Input,
  Select,
  ConfirmDialog,
} from '../ui/index';
import type { Task, TaskInput, TaskStatus, TaskPriority } from '../../types';

// ─── Labels ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
};

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  todo: { bg: '#F1F5F9', text: COLORS.textMuted },
  in_progress: { bg: COLORS.primaryLight, text: COLORS.primary },
  done: { bg: COLORS.successLight, text: COLORS.success },
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  low: { bg: '#F8FAFC', text: COLORS.textLight },
  medium: { bg: COLORS.warningLight, text: COLORS.warning },
  high: { bg: COLORS.dangerLight, text: COLORS.danger },
};

export function priorityDot(priority: TaskPriority) {
  const colors = { low: COLORS.textLight, medium: COLORS.warning, high: COLORS.danger };
  return colors[priority];
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onArchive: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export function TaskCard({ task, onEdit, onArchive, onStatusChange }: TaskCardProps) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const statusStyle = STATUS_COLORS[task.status];
  const priorityStyle = PRIORITY_COLORS[task.priority];

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done';

  function formatDate(iso?: string) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  }

  const nextStatus: TaskStatus | null =
    task.status === 'todo'
      ? 'in_progress'
      : task.status === 'in_progress'
      ? 'done'
      : null;

  return (
    <>
      <View style={[cardStyles.card, SHADOW.sm]}>
        {/* Priority bar */}
        <View style={[cardStyles.priorityBar, { backgroundColor: priorityDot(task.priority) }]} />

        <View style={cardStyles.body}>
          {/* Header */}
          <View style={cardStyles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={cardStyles.title} numberOfLines={2}>
                {task.title}
              </Text>
              {task.description && (
                <Text style={cardStyles.desc} numberOfLines={1}>
                  {task.description}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => onEdit(task)} style={cardStyles.editBtn}>
              <Text style={cardStyles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          {/* Meta */}
          <View style={cardStyles.meta}>
            <Badge
              label={STATUS_LABELS[task.status]}
              bg={statusStyle.bg}
              color={statusStyle.text}
              size=`"sm`"
            />
            <Badge
              label={PRIORITY_LABELS[task.priority]}
              bg={priorityStyle.bg}
              color={priorityStyle.text}
              size=`"sm`"
            />
            {task.due_date && (
              <Badge
                label={formatDate(task.due_date) ?? ''}
                bg={isOverdue ? COLORS.dangerLight : COLORS.surfaceElevated}
                color={isOverdue ? COLORS.danger : COLORS.textMuted}
                size=`"sm`"
              />
            )}
          </View>

          {/* Actions */}
          <View style={cardStyles.actions}>
            {nextStatus && (
              <Button
                label={nextStatus === 'in_progress' ? '▶ Démarrer' : '✓ Terminer'}
                variant={nextStatus === 'done' ? 'success' : 'primary'}
                size=`"sm`"
                onPress={() => onStatusChange(task.id, nextStatus)}
              />
            )}
            <Button
              label=`"Archiver`"
              variant=`"ghost`"
              size=`"sm`"
              onPress={() => setConfirmArchive(true)}
            />
          </View>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmArchive}
        title=`"Archiver la tâche`"
        message={``« `${task.title} » sera archivée. Vous pourrez la retrouver dans les archives.``}
        confirmLabel=`"Archiver`"
        confirmVariant=`"danger`"
        onConfirm={() => { setConfirmArchive(false); onArchive(task.id); }}
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priorityBar: { width: 4 },
  body: { flex: 1, padding: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: { color: COLORS.textMuted, fontSize: 16 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: SPACING.sm },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});

// ─── TaskForm ─────────────────────────────────────────────────────────────────

interface TaskFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (input: TaskInput) => Promise<void>;
  initialValues?: Partial<Task>;
}

const STATUS_OPTIONS = [
  { label: 'À faire', value: 'todo' },
  { label: 'En cours', value: 'in_progress' },
  { label: 'Terminé', value: 'done' },
];

const PRIORITY_OPTIONS = [
  { label: '🟢 Basse', value: 'low' },
  { label: '🟡 Moyenne', value: 'medium' },
  { label: '🔴 Haute', value: 'high' },
];

export function TaskForm({ visible, onClose, onSave, initialValues }: TaskFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(initialValues?.status ?? 'todo');
  const [priority, setPriority] = useState<TaskPriority>(initialValues?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initialValues?.due_date?.slice(0, 10) ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialValues?.id;

  async function handleSave() {
    if (!title.trim()) { setError('Le titre est obligatoire'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setTitle(initialValues?.title ?? '');
    setDescription(initialValues?.description ?? '');
    setStatus(initialValues?.status ?? 'todo');
    setPriority(initialValues?.priority ?? 'medium');
    setDueDate(initialValues?.due_date?.slice(0, 10) ?? '');
    setError('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
      footer={
        <>
          <Button label=`"Annuler`" variant=`"secondary`" onPress={handleClose} style={{ flex: 1 }} />
          <Button
            label={isEdit ? 'Sauvegarder' : 'Créer'}
            onPress={handleSave}
            loading={saving}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
      <Input
        label=`"Titre *`"
        value={title}
        onChangeText={setTitle}
        placeholder=`"Ex: Révision 15 000 km — Renault Clio`"
        returnKeyType=`"next`"
      />
      <Input
        label=`"Description`"
        value={description}
        onChangeText={setDescription}
        placeholder=`"Détails, notes, matériaux nécessaires…`"
        multiline
        numberOfLines={3}
      />
      <Select
        label=`"Statut`"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(v) => setStatus(v as TaskStatus)}
      />
      <Select
        label=`"Priorité`"
        value={priority}
        options={PRIORITY_OPTIONS}
        onChange={(v) => setPriority(v as TaskPriority)}
      />
      <Input
        label=`"Échéance (AAAA-MM-JJ)`"
        value={dueDate}
        onChangeText={setDueDate}
        placeholder=`"2024-12-31`"
        keyboardType=`"numbers-and-punctuation`"
      />
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  error: {
    backgroundColor: COLORS.dangerLight,
    color: COLORS.danger,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
});

"@
[System.IO.File]::WriteAllText("$root\src\components\tasks\index.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/components/tasks/index.tsx"

# --- src/components/documents/index.tsx ---
$content = @"
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SPACING, SHADOW } from '../ui/theme';
import { Button, Badge, Modal, Input, Select, ConfirmDialog } from '../ui/index';
import type { Document, DocumentInput, DocumentCategory } from '../../types';

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_LABELS: Record<DocumentCategory, string> = {
  invoice: 'Facture',
  receipt: 'Reçu / Bon',
  part: 'Pièce',
  manual: 'Manuel',
  delivery: 'Livraison',
  other: 'Autre',
};

const CAT_COLORS: Record<DocumentCategory, { bg: string; text: string }> = {
  invoice: { bg: COLORS.primaryLight, text: COLORS.primary },
  receipt: { bg: COLORS.successLight, text: COLORS.success },
  part: { bg: COLORS.warningLight, text: COLORS.warning },
  manual: { bg: '#EDE9FE', text: '#7C3AED' },
  delivery: { bg: '#FEF9C3', text: '#A16207' },
  other: { bg: COLORS.surfaceElevated, text: COLORS.textMuted },
};

const CATEGORY_OPTIONS = (Object.keys(CAT_LABELS) as DocumentCategory[]).map((k) => ({
  label: CAT_LABELS[k],
  value: k,
}));

// ─── DocumentCard ─────────────────────────────────────────────────────────────

interface DocumentCardProps {
  doc: Document;
  onEdit: (doc: Document) => void;
  onArchive: (id: string) => void;
}

export function DocumentCard({ doc, onEdit, onArchive }: DocumentCardProps) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const catStyle = CAT_COLORS[doc.category];

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <>
      <View style={[cardStyles.card, SHADOW.sm]}>
        {doc.photo_url ? (
          <Image source={{ uri: doc.photo_url }} style={cardStyles.thumb} resizeMode=`"cover`" />
        ) : (
          <View style={[cardStyles.thumb, cardStyles.thumbPlaceholder]}>
            <Text style={cardStyles.thumbIcon}>📄</Text>
          </View>
        )}

        <View style={cardStyles.body}>
          <View style={cardStyles.header}>
            <Text style={cardStyles.title} numberOfLines={2}>
              {doc.title}
            </Text>
            <TouchableOpacity onPress={() => onEdit(doc)} style={cardStyles.editBtn}>
              <Text style={{ color: COLORS.textMuted }}>✎</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            <Badge label={CAT_LABELS[doc.category]} bg={catStyle.bg} color={catStyle.text} size=`"sm`" />
            <Badge label={formatDate(doc.created_at)} bg={COLORS.surfaceElevated} color={COLORS.textMuted} size=`"sm`" />
          </View>

          {doc.notes && (
            <Text style={cardStyles.notes} numberOfLines={2}>
              {doc.notes}
            </Text>
          )}

          <Button
            label=`"Archiver`"
            variant=`"ghost`"
            size=`"sm`"
            onPress={() => setConfirmArchive(true)}
            style={{ marginTop: 8, alignSelf: 'flex-start' }}
          />
        </View>
      </View>

      <ConfirmDialog
        visible={confirmArchive}
        title=`"Archiver le document`"
        message={``« `${doc.title} » sera archivé.``}
        confirmLabel=`"Archiver`"
        confirmVariant=`"danger`"
        onConfirm={() => { setConfirmArchive(false); onArchive(doc.id); }}
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: { width: 80, height: 100 },
  thumbPlaceholder: {
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: { fontSize: 28 },
  body: { flex: 1, padding: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 6 },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
});

// ─── DocumentForm ─────────────────────────────────────────────────────────────

interface DocumentFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    input: DocumentInput,
    photo?: { uri: string; mimeType?: string },
  ) => Promise<void>;
  initialValues?: Partial<Document>;
}

export function DocumentForm({ visible, onClose, onSave, initialValues }: DocumentFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [category, setCategory] = useState<DocumentCategory>(
    initialValues?.category ?? 'other',
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [photo, setPhoto] = useState<{ uri: string; mimeType?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialValues?.id;

  async function pickPhoto(source: 'camera' | 'gallery') {
    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à l\'appareil photo est nécessaire.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à la galerie est nécessaire.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
    }
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError('Le titre est obligatoire'); return; }
    setError('');
    setSaving(true);
    try {
      await onSave(
        { title: title.trim(), category, notes: notes.trim() || undefined },
        photo ?? undefined,
      );
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setTitle(initialValues?.title ?? '');
    setCategory(initialValues?.category ?? 'other');
    setNotes(initialValues?.notes ?? '');
    setPhoto(null);
    setError('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={isEdit ? 'Modifier le document' : 'Nouveau document'}
      footer={
        <>
          <Button label=`"Annuler`" variant=`"secondary`" onPress={handleClose} style={{ flex: 1 }} />
          <Button
            label={isEdit ? 'Sauvegarder' : 'Ajouter'}
            onPress={handleSave}
            loading={saving}
            style={{ flex: 1 }}
          />
        </>
      }
    >
      {error ? (
        <Text style={formStyles.error}>{error}</Text>
      ) : null}

      <Input
        label=`"Titre *`"
        value={title}
        onChangeText={setTitle}
        placeholder=`"Ex: Facture fournitures Novembre`"
      />
      <Select
        label=`"Catégorie`"
        value={category}
        options={CATEGORY_OPTIONS}
        onChange={(v) => setCategory(v as DocumentCategory)}
      />
      <Input
        label=`"Notes`"
        value={notes}
        onChangeText={setNotes}
        placeholder=`"Références, remarques…`"
        multiline
        numberOfLines={2}
      />

      {/* Photo picker */}
      <Text style={formStyles.photoLabel}>Photo du document</Text>
      {photo || initialValues?.photo_url ? (
        <View style={{ marginBottom: SPACING.md }}>
          <Image
            source={{ uri: photo?.uri ?? initialValues?.photo_url }}
            style={formStyles.preview}
            resizeMode=`"contain`"
          />
          {photo && (
            <Button
              label=`"Changer la photo`"
              variant=`"ghost`"
              size=`"sm`"
              onPress={() => setPhoto(null)}
            />
          )}
        </View>
      ) : (
        <View style={formStyles.photoRow}>
          <Button
            label=`"📷 Appareil photo`"
            variant=`"secondary`"
            size=`"sm`"
            onPress={() => pickPhoto('camera')}
            style={{ flex: 1 }}
          />
          <Button
            label=`"🖼 Galerie`"
            variant=`"secondary`"
            size=`"sm`"
            onPress={() => pickPhoto('gallery')}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  error: {
    backgroundColor: COLORS.dangerLight,
    color: COLORS.danger,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  preview: {
    width: '100%',
    height: 160,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    marginBottom: SPACING.sm,
  },
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
});

"@
[System.IO.File]::WriteAllText("$root\src\components\documents\index.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/components/documents/index.tsx"

# --- src/components/stock/index.tsx ---
$content = @"
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
                {isOut ? '🚨 Rupture de stock' : ``⚠️ Stock bas — seuil : `${part.alert_threshold}``}
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
              label=`"Mouvement`"
              variant=`"primary`"
              size=`"sm`"
              onPress={() => onMovement(part)}
              style={{ flex: 1 }}
            />
            <Button
              label=`"✎`"
              variant=`"secondary`"
              size=`"sm`"
              onPress={() => onEdit(part)}
            />
            <Button
              label=`"⋯`"
              variant=`"ghost`"
              size=`"sm`"
              onPress={() => setConfirmArchive(true)}
            />
          </View>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmArchive}
        title=`"Archiver la pièce`"
        message={``« `${part.name} » sera archivée. Le stock et l'historique sont conservés.``}
        confirmLabel=`"Archiver`"
        confirmVariant=`"danger`"
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
      setError(``Stock insuffisant : `${part.quantity} `${part.unit ?? ''} disponible(s)``);
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
      title={``Mouvement — `${part.name}``}
      footer={
        <>
          <Button label=`"Annuler`" variant=`"secondary`" onPress={handleClose} style={{ flex: 1 }} />
          <Button
            label=`"Enregistrer`"
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
        label=`"Type de mouvement`"
        value={type}
        options={MOVEMENT_OPTIONS}
        onChange={(v) => setType(v as MovementType)}
      />
      <Input
        label={type === 'adjustment' ? 'Nouvelle quantité totale *' : 'Quantité *'}
        value={quantityStr}
        onChangeText={setQuantityStr}
        placeholder=`"Ex: 5`"
        keyboardType=`"number-pad`"
        hint={type === 'adjustment'
          ? ``La quantité sera ajustée à cette valeur (actuellement `${part.quantity})``
          : type === 'out'
          ? ``Maximum `${part.quantity} `${part.unit ?? ''}``
          : undefined}
      />
      <Input
        label=`"Motif`"
        value={reason}
        onChangeText={setReason}
        placeholder=`"Ex: Révision Renault Clio, Réapprovisionnement…`"
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
          <Button label=`"Annuler`" variant=`"secondary`" onPress={handleClose} style={{ flex: 1 }} />
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
      <Input label=`"Nom *`" value={name} onChangeText={setName} placeholder=`"Ex: Filtre à huile Mann W712/95`" />
      <Input label=`"Référence`" value={reference} onChangeText={setReference} placeholder=`"Ex: W712/95`" />
      <Input
        label=`"Quantité initiale *`"
        value={quantityStr}
        onChangeText={setQuantityStr}
        keyboardType=`"number-pad`"
        placeholder=`"0`"
        hint={isEdit ? `"Utilisez un mouvement de stock pour modifier la quantité`" : undefined}
        editable={!isEdit}
      />
      <Input
        label=`"Seuil d'alerte *`"
        value={alertStr}
        onChangeText={setAlertStr}
        keyboardType=`"number-pad`"
        placeholder=`"2`"
        hint=`"Alerte affichée quand le stock est inférieur ou égal à ce seuil`"
      />
      <Input label=`"Unité`" value={unit} onChangeText={setUnit} placeholder=`"pièce, litre, jeu…`" />
      <Input label=`"Emplacement`" value={location} onChangeText={setLocation} placeholder=`"Ex: Étagère A1`" />
    </Modal>
  );
}

"@
[System.IO.File]::WriteAllText("$root\src\components\stock\index.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/components/stock/index.tsx"

# --- src/screens/LoginScreen.tsx ---
$content = @"
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { Button, Input } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';
import { isSupabaseConfigured } from '../lib/supabase';

type Mode = 'login' | 'signup';

export function LoginScreen() {
  const { signIn, signUp, enterDemoMode } = useApp();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const supabaseReady = isSupabaseConfigured;

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError('Votre nom complet est requis.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, fullName.trim());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setDemoLoading(true);
    try {
      await enterDemoMode();
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#1D4ED8', '#2563EB', '#3B82F6']}
        style={styles.gradient}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>🔧</Text>
          </View>
          <Text style={styles.brand}>Atelier Logistique</Text>
          <Text style={styles.tagline}>Gérez votre atelier. Partout.</Text>
        </View>

        {/* Card */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps=`"handled`"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, SHADOW.lg]}>
            {/* Tabs */}
            {supabaseReady && (
              <View style={styles.tabs}>
                {(['login', 'signup'] as Mode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.tab, mode === m && styles.tabActive]}
                    onPress={() => { setMode(m); setError(''); }}
                  >
                    <Text style={[styles.tabLabel, mode === m && styles.tabLabelActive]}>
                      {m === 'login' ? 'Connexion' : 'Inscription'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!supabaseReady && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Supabase non configuré — mode démo uniquement.
                </Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {supabaseReady && (
              <>
                {mode === 'signup' && (
                  <Input
                    label=`"Nom complet`"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder=`"Jean Dupont`"
                    autoCapitalize=`"words`"
                    returnKeyType=`"next`"
                  />
                )}
                <Input
                  label=`"Email`"
                  value={email}
                  onChangeText={setEmail}
                  placeholder=`"contact@atelier.fr`"
                  keyboardType=`"email-address`"
                  autoCapitalize=`"none`"
                  autoCorrect={false}
                  returnKeyType=`"next`"
                />
                <Input
                  label=`"Mot de passe`"
                  value={password}
                  onChangeText={setPassword}
                  placeholder=`"••••••••`"
                  secureTextEntry
                  returnKeyType=`"done`"
                  onSubmitEditing={handleSubmit}
                />

                <Button
                  label={mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  onPress={handleSubmit}
                  loading={loading}
                  fullWidth
                  style={{ marginBottom: SPACING.md }}
                />
              </>
            )}

            {/* Demo separator */}
            <View style={styles.separator}>
              <View style={styles.sepLine} />
              <Text style={styles.sepText}>ou</Text>
              <View style={styles.sepLine} />
            </View>

            <Button
              label=`"🚀 Essayer en mode démo`"
              variant=`"secondary`"
              onPress={handleDemo}
              loading={demoLoading}
              fullWidth
            />

            <Text style={styles.demoNote}>
              Données fictives — aucune inscription requise. Idéal pour découvrir l'application.
            </Text>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            © {new Date().getFullYear()} Atelier Logistique · Tous droits réservés
          </Text>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 64, paddingBottom: 32 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 36 },
  brand: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  scroll: { flexGrow: 1, padding: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.surface, ...SHADOW.sm },
  tabLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive: { color: COLORS.text, fontWeight: '700' },
  warningBox: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  warningText: { color: COLORS.warning, fontSize: 13, fontWeight: '500' },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorText: { color: COLORS.danger, fontSize: 14 },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.lg,
  },
  sepLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  sepText: { fontSize: 13, color: COLORS.textMuted },
  demoNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});

"@
[System.IO.File]::WriteAllText("$root\src\screens\LoginScreen.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/screens/LoginScreen.tsx"

# --- src/screens/HomeScreen.tsx ---
$content = @"
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Card, Badge } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';

function StatCard({
  label,
  value,
  emoji,
  color,
  bg,
  onPress,
}: {
  label: string;
  value: number | string;
  emoji: string;
  color: string;
  bg: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[statStyles.card, SHADOW.sm, { flex: 1 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={[statStyles.iconWrap, { backgroundColor: bg }]}>
        <Text style={statStyles.emoji}>{emoji}</Text>
      </View>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: { fontSize: 22 },
  value: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', fontWeight: '500' },
});

export function HomeScreen() {
  const { user, organization, membership, isDemo, tasks, documents, parts, movements, setScreen } = useApp();

  const now = new Date();

  // Task stats
  const tasksTodo = tasks.filter((t) => t.status === 'todo').length;
  const tasksInProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const tasksDone = tasks.filter((t) => t.status === 'done').length;
  const tasksOverdue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'done',
  ).length;

  // Stock alerts
  const alertParts = parts.filter((p) => p.quantity <= p.alert_threshold).length;
  const outOfStock = parts.filter((p) => p.quantity === 0).length;

  // Recent tasks (3)
  const recentTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      // urgent first
      const ap = a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2;
      const bp = b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2;
      return ap - bp;
    })
    .slice(0, 3);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const displayName = user?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'vous';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}, {displayName} 👋</Text>
          <Text style={styles.orgName}>{organization?.name}</Text>
          {isDemo && (
            <Badge label=`"Mode démo`" bg=`"#FEF3C7`" color=`"#92400E`" />
          )}
        </View>
        <TouchableOpacity
          style={styles.orgBtn}
          onPress={() => setScreen('organization')}
        >
          <Text style={styles.orgBtnText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts banner */}
      {(tasksOverdue > 0 || alertParts > 0) && (
        <View style={styles.alertBanner}>
          {tasksOverdue > 0 && (
            <Text style={styles.alertText}>
              🔴 {tasksOverdue} tâche{tasksOverdue > 1 ? 's' : ''} en retard
            </Text>
          )}
          {outOfStock > 0 && (
            <Text style={styles.alertText}>
              🚨 {outOfStock} rupture{outOfStock > 1 ? 's' : ''} de stock
            </Text>
          )}
          {alertParts > 0 && outOfStock === 0 && (
            <Text style={styles.alertText}>
              ⚠️ {alertParts} pièce{alertParts > 1 ? 's' : ''} en stock bas
            </Text>
          )}
        </View>
      )}

      {/* Stats row */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tableau de bord</Text>
        <View style={styles.statsRow}>
          <StatCard
            label=`"À faire`"
            value={tasksTodo}
            emoji=`"📋`"
            color={COLORS.primary}
            bg={COLORS.primaryLight}
            onPress={() => setScreen('tasks')}
          />
          <StatCard
            label=`"En cours`"
            value={tasksInProgress}
            emoji=`"⚙️`"
            color={COLORS.warning}
            bg={COLORS.warningLight}
            onPress={() => setScreen('tasks')}
          />
          <StatCard
            label=`"Terminées`"
            value={tasksDone}
            emoji=`"✅`"
            color={COLORS.success}
            bg={COLORS.successLight}
            onPress={() => setScreen('tasks')}
          />
          <StatCard
            label=`"Alertes`"
            value={alertParts}
            emoji=`"📦`"
            color={alertParts > 0 ? COLORS.danger : COLORS.textMuted}
            bg={alertParts > 0 ? COLORS.dangerLight : COLORS.surfaceElevated}
            onPress={() => setScreen('stock')}
          />
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accès rapide</Text>
        <View style={styles.actionsGrid}>
          {[
            { emoji: '📋', label: 'Tâches', screen: 'tasks', color: COLORS.primaryLight },
            { emoji: '📄', label: 'Documents', screen: 'documents', color: '#EDE9FE' },
            { emoji: '📦', label: 'Stock', screen: 'stock', color: COLORS.successLight },
            { emoji: '👥', label: 'Organisation', screen: 'organization', color: COLORS.warningLight },
          ].map((action) => (
            <TouchableOpacity
              key={action.screen}
              style={[styles.actionCard, SHADOW.sm, { backgroundColor: action.color }]}
              onPress={() => setScreen(action.screen as never)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionEmoji}>{action.emoji}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Urgent tasks */}
      {recentTasks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tâches prioritaires</Text>
            <TouchableOpacity onPress={() => setScreen('tasks')}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          {recentTasks.map((task) => {
            const priorityColor = { low: COLORS.textLight, medium: COLORS.warning, high: COLORS.danger }[task.priority];
            const isOverdue = task.due_date && new Date(task.due_date) < now;
            return (
              <View key={task.id} style={[styles.taskRow, SHADOW.sm]}>
                <View style={[styles.taskDot, { backgroundColor: priorityColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                  {task.due_date && (
                    <Text style={[styles.taskDate, isOverdue && { color: COLORS.danger }]}>
                      {isOverdue ? '🔴 ' : '📅 '}
                      {new Date(task.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </Text>
                  )}
                </View>
                <Badge
                  label={task.status === 'todo' ? 'À faire' : 'En cours'}
                  bg={task.status === 'todo' ? COLORS.surfaceElevated : COLORS.primaryLight}
                  color={task.status === 'todo' ? COLORS.textMuted : COLORS.primary}
                  size=`"sm`"
                />
              </View>
            );
          })}
        </View>
      )}

      {/* Stock alerts section */}
      {alertParts > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alertes stock</Text>
            <TouchableOpacity onPress={() => setScreen('stock')}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          {parts
            .filter((p) => p.quantity <= p.alert_threshold)
            .slice(0, 3)
            .map((part) => (
              <View key={part.id} style={[styles.taskRow, SHADOW.sm]}>
                <View
                  style={[
                    styles.taskDot,
                    { backgroundColor: part.quantity === 0 ? COLORS.danger : COLORS.warning },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{part.name}</Text>
                  {part.reference && (
                    <Text style={styles.taskDate}>Réf: {part.reference}</Text>
                  )}
                </View>
                <Badge
                  label={```${part.quantity} `${part.unit ?? ''}``}
                  bg={part.quantity === 0 ? COLORS.dangerLight : COLORS.warningLight}
                  color={part.quantity === 0 ? COLORS.danger : COLORS.warning}
                  size=`"sm`"
                />
              </View>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  orgName: { fontSize: 14, color: COLORS.textMuted, marginTop: 2, marginBottom: 6 },
  orgBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgBtnText: { fontSize: 20 },
  alertBanner: {
    backgroundColor: COLORS.dangerLight,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  alertText: { fontSize: 13, color: COLORS.danger, fontWeight: '600' },
  section: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginTop: SPACING.sm },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  actionCard: {
    width: '47%',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'flex-start',
    ...SHADOW.sm,
  },
  actionEmoji: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  taskDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});

"@
[System.IO.File]::WriteAllText("$root\src\screens\HomeScreen.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/screens/HomeScreen.tsx"

# --- src/screens/OnboardingScreen.tsx ---
$content = @"
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { Button, Input } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';
import * as orgRepo from '../repository/organizations';

const STEPS = [
  {
    emoji: '🏭',
    title: 'Bienvenue !',
    subtitle: 'Créez votre espace de travail pour commencer à gérer votre atelier.',
  },
  {
    emoji: '✅',
    title: 'Tout est prêt.',
    subtitle: 'Votre atelier est configuré. Vous pouvez maintenant gérer vos tâches, documents et stock.',
  },
];

export function OnboardingScreen() {
  const { user, setScreen, showToast } = useApp();
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleCreate() {
    if (!orgName.trim()) {
      setError('Le nom de l\'atelier est requis');
      return;
    }
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      await orgRepo.createOrganization(user.id, orgName.trim());
      setDone(true);
      showToast('success', ``Atelier « `${orgName.trim()} » créé !``);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue() {
    setScreen('home');
  }

  const step = done ? STEPS[1] : STEPS[0];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#1D4ED8', '#2563EB', '#60A5FA']} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps=`"handled`"
        >
          {/* Steps indicator */}
          <View style={styles.stepsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  (done ? i <= 1 : i === 0) && styles.stepDotActive,
                ]}
              />
            ))}
          </View>

          {/* Emoji */}
          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{step.emoji}</Text>
          </View>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.subtitle}>{step.subtitle}</Text>

          {/* Card */}
          <View style={[styles.card, SHADOW.lg]}>
            {!done ? (
              <>
                <Text style={styles.cardTitle}>Nom de votre atelier</Text>
                <Text style={styles.cardSub}>
                  Ce nom sera visible de tous vos collaborateurs.
                </Text>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Input
                  label=`"Nom de l'atelier *`"
                  value={orgName}
                  onChangeText={setOrgName}
                  placeholder=`"Ex: Garage Dupont & Fils`"
                  returnKeyType=`"done`"
                  onSubmitEditing={handleCreate}
                  autoFocus
                />

                <Button
                  label=`"Créer mon atelier`"
                  onPress={handleCreate}
                  loading={loading}
                  fullWidth
                  size=`"lg`"
                />
              </>
            ) : (
              <>
                {/* Features list */}
                {[
                  { icon: '📋', label: 'Gestion des tâches atelier' },
                  { icon: '📄', label: 'Classement des documents' },
                  { icon: '📦', label: 'Suivi du stock pièces' },
                  { icon: '👥', label: 'Collaborateurs & rôles' },
                ].map((f) => (
                  <View key={f.label} style={styles.featureRow}>
                    <Text style={styles.featureIcon}>{f.icon}</Text>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                    <Text style={styles.featureCheck}>✓</Text>
                  </View>
                ))}

                <View style={{ height: SPACING.xl }} />
                <Button
                  label=`"Accéder à mon atelier →`"
                  onPress={handleContinue}
                  fullWidth
                  size=`"lg`"
                />
              </>
            )}
          </View>

          {/* Trial info */}
          {!done && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialText}>
                🎁 Essai gratuit 14 jours · Aucune carte bancaire requise
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    padding: SPACING.xl,
    paddingTop: 64,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING['3xl'],
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: { backgroundColor: '#fff', width: 24 },
  emojiWrap: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: SPACING['3xl'],
    paddingHorizontal: SPACING.lg,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSub: { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.xl },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: 14 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  featureIcon: { fontSize: 20, marginRight: 12 },
  featureLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  featureCheck: { color: COLORS.success, fontWeight: '700', fontSize: 16 },
  trialBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  trialText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' },
});

"@
[System.IO.File]::WriteAllText("$root\src\screens\OnboardingScreen.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/screens/OnboardingScreen.tsx"

# --- src/screens/TasksScreen.tsx ---
$content = @"
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { TaskCard, TaskForm } from '../components/tasks/index';
import { Button, EmptyState, LoadingOverlay } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';
import type { Task, TaskInput, TaskStatus } from '../types';

type FilterTab = 'all' | 'todo' | 'in_progress' | 'done';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'todo', label: 'À faire' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'done', label: 'Terminées' },
];

export function TasksScreen() {
  const {
    tasks,
    loadingTasks,
    refreshTasks,
    addTask,
    editTask,
    archiveTask,
  } = useApp();

  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = tasks;
    if (tab !== 'all') list = list.filter((t) => t.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q),
      );
    }
    // Sort: high priority first, then by date
    return [...list].sort((a, b) => {
      const pp = { high: 0, medium: 1, low: 2 };
      if (pp[a.priority] !== pp[b.priority]) return pp[a.priority] - pp[b.priority];
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tasks, tab, search]);

  const counts = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }), [tasks]);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshTasks();
    setRefreshing(false);
  }

  async function handleSave(input: TaskInput) {
    if (editingTask) {
      await editTask(editingTask.id, input);
    } else {
      await addTask(input);
    }
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingTask(null);
  }

  async function handleStatusChange(id: string, status: TaskStatus) {
    await editTask(id, { status });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tâches</Text>
          <Text style={styles.subtitle}>
            {tasks.length} tâche{tasks.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Button
          label=`"+ Nouvelle`"
          onPress={() => setShowForm(true)}
          size=`"sm`"
        />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder=`"Rechercher une tâche…`"
          placeholderTextColor={COLORS.textLight}
          clearButtonMode=`"while-editing`"
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsWrap}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          contentContainerStyle={{ paddingHorizontal: SPACING.xl, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, tab === item.key && styles.tabActive]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
                {item.label}
              </Text>
              <View style={[styles.tabCount, tab === item.key && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, tab === item.key && { color: '#fff' }]}>
                  {counts[item.key]}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={search ? '🔍' : tab === 'done' ? '🎉' : '📋'}
            title={
              search
                ? 'Aucun résultat'
                : tab === 'done'
                ? 'Aucune tâche terminée'
                : 'Aucune tâche'
            }
            subtitle={
              search
                ? ``Aucune tâche ne correspond à « `${search} »``
                : tab === 'all'
                ? 'Créez votre première tâche pour commencer.'
                : undefined
            }
            action={
              !search && tab === 'all'
                ? { label: '+ Créer une tâche', onPress: () => setShowForm(true) }
                : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onEdit={handleEdit}
            onArchive={archiveTask}
            onStatusChange={handleStatusChange}
          />
        )}
      />

      {/* Form modal */}
      <TaskForm
        visible={showForm}
        onClose={handleCloseForm}
        onSave={handleSave}
        initialValues={editingTask ?? undefined}
      />

      {loadingTasks && !refreshing && <LoadingOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    ...SHADOW.sm,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10 },
  tabsWrap: { marginBottom: SPACING.md },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive: { color: '#fff', fontWeight: '700' },
  tabCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  list: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 100,
  },
});

"@
[System.IO.File]::WriteAllText("$root\src\screens\TasksScreen.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/screens/TasksScreen.tsx"

# --- src/screens/DocumentsScreen.tsx ---
$content = @"
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { DocumentCard, DocumentForm } from '../components/documents/index';
import { Button, EmptyState, LoadingOverlay } from '../components/ui/index';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';
import type { Document, DocumentInput, DocumentCategory } from '../types';

type FilterTab = 'all' | DocumentCategory;

const TABS: { key: FilterTab; label: string; emoji: string }[] = [
  { key: 'all', label: 'Tous', emoji: '📁' },
  { key: 'invoice', label: 'Factures', emoji: '🧾' },
  { key: 'receipt', label: 'Reçus', emoji: '🏷️' },
  { key: 'delivery', label: 'Livraisons', emoji: '🚚' },
  { key: 'manual', label: 'Manuels', emoji: '📖' },
  { key: 'part', label: 'Pièces', emoji: '🔩' },
  { key: 'other', label: 'Autres', emoji: '📄' },
];

export function DocumentsScreen() {
  const {
    documents,
    loadingDocuments,
    refreshDocuments,
    addDocument,
    editDocument,
    archiveDocument,
  } = useApp();

  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = documents;
    if (tab !== 'all') list = list.filter((d) => d.category === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.notes ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [documents, tab, search]);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshDocuments();
    setRefreshing(false);
  }

  async function handleSave(
    input: DocumentInput,
    photo?: { uri: string; mimeType?: string },
  ) {
    if (editingDoc) {
      await editDocument(editingDoc.id, input);
    } else {
      await addDocument(input, photo);
    }
  }

  function handleEdit(doc: Document) {
    setEditingDoc(doc);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditingDoc(null);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label=`"📷`" variant=`"secondary`" size=`"sm`" onPress={() => setShowForm(true)} />
          <Button label=`"+ Ajouter`" size=`"sm`" onPress={() => setShowForm(true)} />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder=`"Rechercher un document…`"
          placeholderTextColor={COLORS.textLight}
          clearButtonMode=`"while-editing`"
        />
      </View>

      {/* Category tabs */}
      <View style={{ marginBottom: SPACING.md }}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          contentContainerStyle={{ paddingHorizontal: SPACING.xl, gap: 8 }}
          renderItem={({ item }) => {
            const count = item.key === 'all'
              ? documents.length
              : documents.filter((d) => d.category === item.key).length;
            return (
              <TouchableOpacity
                style={[styles.tab, tab === item.key && styles.tabActive]}
                onPress={() => setTab(item.key)}
              >
                <Text style={{ fontSize: 14 }}>{item.emoji}</Text>
                <Text style={[styles.tabLabel, tab === item.key && styles.tabLabelActive]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabCount, tab === item.key && styles.tabCountActive]}>
                    <Text style={[styles.tabCountText, tab === item.key && { color: '#fff' }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={search ? '🔍' : '📄'}
            title={search ? 'Aucun résultat' : 'Aucun document'}
            subtitle={
              search
                ? ``Aucun document ne correspond à « `${search} »``
                : 'Ajoutez votre premier document en photographiant ou important une image.'
            }
            action={
              !search
                ? { label: '+ Ajouter un document', onPress: () => setShowForm(true) }
                : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <DocumentCard
            doc={item}
            onEdit={handleEdit}
            onArchive={archiveDocument}
          />
        )}
      />

      <DocumentForm
        visible={showForm}
        onClose={handleClose}
        onSave={handleSave}
        initialValues={editingDoc ?? undefined}
      />

      {loadingDocuments && !refreshing && <LoadingOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive: { color: '#fff', fontWeight: '700' },
  tabCount: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
});

"@
[System.IO.File]::WriteAllText("$root\src\screens\DocumentsScreen.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/screens/DocumentsScreen.tsx"

# --- src/screens/StockScreen.tsx ---
$content = @"
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { PartCard, MovementModal, PartForm } from '../components/stock/index';
import { Button, EmptyState, LoadingOverlay } from '../components/ui/index';
import { COLORS, RADIUS, SPACING } from '../components/ui/theme';
import type { Part, PartInput, MovementType } from '../types';

type FilterTab = 'all' | 'alert' | 'ok';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tout le stock' },
  { key: 'alert', label: '⚠️ Alertes' },
  { key: 'ok', label: '✅ OK' },
];

export function StockScreen() {
  const {
    parts,
    movements,
    loadingStock,
    refreshStock,
    addPart,
    editPart,
    archivePart,
    recordMovement,
  } = useApp();

  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [movementPart, setMovementPart] = useState<Part | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = parts;
    if (tab === 'alert') list = list.filter((p) => p.quantity <= p.alert_threshold);
    if (tab === 'ok') list = list.filter((p) => p.quantity > p.alert_threshold);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.reference ?? '').toLowerCase().includes(q) ||
          (p.location ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      // Alerts first
      const aAlert = a.quantity <= a.alert_threshold ? 0 : 1;
      const bAlert = b.quantity <= b.alert_threshold ? 0 : 1;
      if (aAlert !== bAlert) return aAlert - bAlert;
      return a.name.localeCompare(b.name);
    });
  }, [parts, tab, search]);

  const alertCount = parts.filter((p) => p.quantity <= p.alert_threshold).length;
  const outCount = parts.filter((p) => p.quantity === 0).length;

  async function handleRefresh() {
    setRefreshing(true);
    await refreshStock();
    setRefreshing(false);
  }

  async function handleSavePart(input: PartInput) {
    if (editingPart) {
      await editPart(editingPart.id, input);
    } else {
      await addPart(input);
    }
  }

  async function handleRecordMovement(
    partId: string,
    type: MovementType,
    quantity: number,
    reason?: string,
  ) {
    await recordMovement(partId, type, quantity, reason);
  }

  function handleEditPart(part: Part) {
    setEditingPart(part);
    setShowPartForm(true);
  }

  function handleClosePartForm() {
    setShowPartForm(false);
    setEditingPart(null);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Stock</Text>
          <Text style={styles.subtitle}>
            {parts.length} référence{parts.length !== 1 ? 's' : ''}
            {alertCount > 0 ? `` · `${alertCount} alerte`${alertCount > 1 ? 's' : ''}`` : ''}
          </Text>
        </View>
        <Button label=`"+ Pièce`" size=`"sm`" onPress={() => setShowPartForm(true)} />
      </View>

      {/* Stat bar */}
      {(alertCount > 0 || outCount > 0) && (
        <View style={styles.statBar}>
          {outCount > 0 && (
            <View style={[styles.statChip, { backgroundColor: COLORS.dangerLight }]}>
              <Text style={[styles.statChipText, { color: COLORS.danger }]}>
                🚨 {outCount} rupture{outCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {alertCount > outCount && (
            <View style={[styles.statChip, { backgroundColor: COLORS.warningLight }]}>
              <Text style={[styles.statChipText, { color: COLORS.warning }]}>
                ⚠️ {alertCount - outCount} stock{alertCount - outCount > 1 ? 's' : ''} bas
              </Text>
            </View>
          )}
          <View style={[styles.statChip, { backgroundColor: COLORS.successLight }]}>
            <Text style={[styles.statChipText, { color: COLORS.success }]}>
              ✅ {parts.length - alertCount} OK
            </Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder=`"Nom, référence, emplacement…`"
          placeholderTextColor={COLORS.textLight}
          clearButtonMode=`"while-editing`"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => {
          const count = t.key === 'all'
            ? parts.length
            : t.key === 'alert'
            ? alertCount
            : parts.length - alertCount;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabCount, tab === t.key && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, tab === t.key && { color: '#fff' }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={search ? '🔍' : tab === 'alert' ? '✅' : '📦'}
            title={
              search
                ? 'Aucun résultat'
                : tab === 'alert'
                ? 'Aucune alerte stock'
                : 'Aucune pièce en stock'
            }
            subtitle={
              search
                ? undefined
                : tab === 'all'
                ? 'Ajoutez vos premières pièces pour suivre votre stock.'
                : tab === 'alert'
                ? 'Tous vos stocks sont au-dessus du seuil d\'alerte.'
                : undefined
            }
            action={
              !search && tab === 'all'
                ? { label: '+ Ajouter une pièce', onPress: () => setShowPartForm(true) }
                : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <PartCard
            part={item}
            movements={movements}
            onEdit={handleEditPart}
            onArchive={archivePart}
            onMovement={(p) => setMovementPart(p)}
          />
        )}
      />

      {/* Modals */}
      <PartForm
        visible={showPartForm}
        onClose={handleClosePartForm}
        onSave={handleSavePart}
        initialValues={editingPart ?? undefined}
      />

      <MovementModal
        visible={!!movementPart}
        part={movementPart}
        onClose={() => setMovementPart(null)}
        onRecord={handleRecordMovement}
      />

      {loadingStock && !refreshing && <LoadingOverlay />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  statBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statChipText: { fontSize: 12, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10 },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive: { color: '#fff', fontWeight: '700' },
  tabCount: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
});

"@
[System.IO.File]::WriteAllText("$root\src\screens\StockScreen.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/screens/StockScreen.tsx"

# --- src/screens/OrganizationScreen.tsx ---
$content = @"
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
  const { user, organization, membership, isDemo, signOut, refreshOrganization, showToast } =
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
      showToast('success', ``Invitation envoyée à `${inviteEmail}``);
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
    const url = ```${supabaseUrl}/functions/v1/stripe-portal``;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organization?.id }),
      });
      const data = await res.json();
      if (data.url) await Linking.openURL(data.url);
    } catch {
      showToast('error', 'Impossible d\'accéder au portail de facturation');
    }
  }

  async function handleSubscribe() {
    if (isDemo) {
      showToast('info', 'Abonnement indisponible en mode démo');
      return;
    }
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const url = ```${supabaseUrl}/functions/v1/stripe-checkout``;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organization?.id }),
      });
      const data = await res.json();
      if (data.url) await Linking.openURL(data.url);
    } catch {
      showToast('error', 'Impossible d\'accéder au paiement');
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
              label=`"Gérer l'abonnement →`"
              variant=`"secondary`"
              onPress={handleOpenBillingPortal}
              fullWidth
            />
          ) : (
            <Button
              label=`"🚀 S'abonner — 29€/mois`"
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
                    label=`"Retirer`"
                    variant=`"ghost`"
                    size=`"sm`"
                    onPress={() => setRemovingMember(m)}
                  />
                </View>
              ) : (
                <Badge
                  label={ROLE_LABELS[m.role]}
                  bg={m.role === 'owner' ? '#FEF3C7' : COLORS.surfaceElevated}
                  color={m.role === 'owner' ? '#92400E' : COLORS.textMuted}
                  size=`"sm`"
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
                    label=`"Annuler`"
                    variant=`"ghost`"
                    size=`"sm`"
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
              label=`"Email`"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder=`"collaborateur@atelier.fr`"
              keyboardType=`"email-address`"
              autoCapitalize=`"none`"
            />
            <Select
              label=`"Rôle`"
              value={inviteRole}
              options={ROLE_OPTIONS}
              onChange={(v) => setInviteRole(v as Role)}
            />
            <Button
              label=`"Envoyer l'invitation`"
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
            label=`"Se déconnecter`"
            variant=`"danger`"
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
        title=`"Se déconnecter`"
        message=`"Vous serez redirigé vers l'écran de connexion.`"
        confirmLabel=`"Déconnecter`"
        confirmVariant=`"danger`"
        onConfirm={() => { setConfirmSignOut(false); signOut(); }}
        onCancel={() => setConfirmSignOut(false)}
      />

      {/* Confirm remove member */}
      <ConfirmDialog
        visible={!!removingMember}
        title=`"Retirer ce membre`"
        message={```${removingMember?.user?.full_name ?? removingMember?.user?.email} n'aura plus accès à votre atelier.``}
        confirmLabel=`"Retirer`"
        confirmVariant=`"danger`"
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

"@
[System.IO.File]::WriteAllText("$root\src\screens\OrganizationScreen.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/screens/OrganizationScreen.tsx"

# --- src/screens/SubscriptionScreen.tsx ---
$content = @"
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/index';
import { COLORS, RADIUS, SPACING, SHADOW } from '../components/ui/theme';

const FEATURES = [
  { emoji: '📋', label: 'Gestion des tâches atelier sans limite' },
  { emoji: '📄', label: 'Classement photos de documents' },
  { emoji: '📦', label: 'Suivi stock & alertes de rupture' },
  { emoji: '👥', label: 'Équipe jusqu\'à 10 collaborateurs' },
  { emoji: '🔔', label: 'Alertes et notifications' },
  { emoji: '☁️', label: 'Synchronisation multi-appareils' },
  { emoji: '🛡️', label: 'Sécurité & isolation des données' },
  { emoji: '📱', label: 'iOS, Android & Web' },
];

export function SubscriptionScreen() {
  const { organization, signOut } = useApp();
  const [loading, setLoading] = useState(false);

  const isCanceled = organization?.billing_status === 'canceled';
  const isPastDue = organization?.billing_status === 'past_due';

  async function handleSubscribe() {
    setLoading(true);
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    try {
      const res = await fetch(```${supabaseUrl}/functions/v1/stripe-checkout``, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organization?.id }),
      });
      const data = await res.json();
      if (data.url) await Linking.openURL(data.url);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    try {
      const res = await fetch(```${supabaseUrl}/functions/v1/stripe-portal``, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organization?.id }),
      });
      const data = await res.json();
      if (data.url) await Linking.openURL(data.url);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <LinearGradient
        colors={['#1D4ED8', '#2563EB']}
        style={styles.header}
      >
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.headerTitle}>
          {isPastDue ? 'Paiement en retard' : 'Abonnement requis'}
        </Text>
        <Text style={styles.headerSub}>
          {isPastDue
            ? 'Votre paiement n\'a pas pu être traité. Mettez à jour votre moyen de paiement pour continuer.'
            : isCanceled
            ? 'Votre abonnement a été annulé. Réabonnez-vous pour accéder à votre atelier.'
            : 'Votre essai gratuit est terminé. Passez à un abonnement pour continuer.'}
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Price card */}
        <View style={[styles.priceCard, SHADOW.lg]}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>29€</Text>
            <View>
              <Text style={styles.pricePer}>/mois</Text>
              <Text style={styles.priceSub}>par organisation</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresList}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureCheck}>✓</Text>
              </View>
            ))}
          </View>

          <View style={{ height: SPACING.xl }} />

          {isPastDue ? (
            <Button
              label=`"Mettre à jour le paiement →`"
              onPress={handleManage}
              loading={loading}
              fullWidth
              size=`"lg`"
            />
          ) : (
            <Button
              label=`"S'abonner maintenant →`"
              onPress={handleSubscribe}
              loading={loading}
              fullWidth
              size=`"lg`"
            />
          )}

          <Text style={styles.guarantee}>
            🔒 Paiement sécurisé via Stripe · Annulable à tout moment · Sans engagement
          </Text>
        </View>

        {/* Sign out option */}
        <Button
          label=`"Se déconnecter`"
          variant=`"ghost`"
          onPress={signOut}
          style={{ marginTop: SPACING.lg, alignSelf: 'center' }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 64,
    paddingBottom: SPACING['3xl'],
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  emoji: { fontSize: 48, marginBottom: SPACING.md },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: 60,
  },
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginTop: -SPACING['2xl'],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  price: { fontSize: 48, fontWeight: '800', color: COLORS.primary },
  pricePer: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  priceSub: { fontSize: 13, color: COLORS.textMuted },
  featuresList: { gap: 2 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  featureEmoji: { fontSize: 18, marginRight: 12, width: 28 },
  featureLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  featureCheck: { color: COLORS.success, fontWeight: '700', fontSize: 16 },
  guarantee: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
});

"@
[System.IO.File]::WriteAllText("$root\src\screens\SubscriptionScreen.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/screens/SubscriptionScreen.tsx"

# --- src/shell/AppShell.tsx ---
$content = @"
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useApp } from '../context/AppContext';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { StockScreen } from '../screens/StockScreen';
import { OrganizationScreen } from '../screens/OrganizationScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { LoadingOverlay, ToastBar } from '../components/ui/index';
import { COLORS, SHADOW, RADIUS, SPACING } from '../components/ui/theme';
import type { AppScreen } from '../types';

type Tab = {
  key: Extract<AppScreen, 'home' | 'tasks' | 'documents' | 'stock' | 'organization'>;
  label: string;
  icon: string;
  activeIcon: string;
};

const TABS: Tab[] = [
  { key: 'home', label: 'Accueil', icon: '🏠', activeIcon: '🏠' },
  { key: 'tasks', label: 'Tâches', icon: '📋', activeIcon: '📋' },
  { key: 'documents', label: 'Documents', icon: '📄', activeIcon: '📄' },
  { key: 'stock', label: 'Stock', icon: '📦', activeIcon: '📦' },
  { key: 'organization', label: 'Org.', icon: '⚙️', activeIcon: '⚙️' },
];

const MAIN_SCREENS = TABS.map((t) => t.key) as AppScreen[];

export function AppShell() {
  const { screen, setScreen, isLoading, toasts, tasks, parts, organization, isDemo } = useApp();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <LoadingOverlay message=`"Démarrage…`" />
      </View>
    );
  }

  // Billing gate: block main screens when subscription expired (not demo, not org screen)
  const billingBlocked =
    !isDemo &&
    !!organization &&
    (organization.billing_status === 'canceled' ||
      organization.billing_status === 'past_due') &&
    screen !== 'organization';

  const showTabs = MAIN_SCREENS.includes(screen) && !billingBlocked;

  // Badge counts for tab bar
  const tasksBadge = tasks.filter((t) => t.status !== 'done').length;
  const stockBadge = parts.filter((p) => p.quantity <= p.alert_threshold).length;

  function getBadge(key: Tab['key']): number {
    if (key === 'tasks') return tasksBadge;
    if (key === 'stock') return stockBadge;
    return 0;
  }

  return (
    <View style={styles.root}>
      <StatusBar style=`"auto`" />

      {/* Screen content */}
      <View style={styles.content}>
        {screen === 'login' && <LoginScreen />}
        {screen === 'onboarding' && <OnboardingScreen />}
        {screen === 'home' && <HomeScreen />}
        {screen === 'tasks' && <TasksScreen />}
        {screen === 'documents' && <DocumentsScreen />}
        {screen === 'stock' && <StockScreen />}
        {screen === 'organization' && <OrganizationScreen />}
        {billingBlocked && <SubscriptionScreen />}
      </View>

      {/* Toast stack */}
      <View style={styles.toastStack} pointerEvents=`"none`">
        {toasts.map((t) => (
          <ToastBar key={t.id} type={t.type} message={t.message} />
        ))}
      </View>

      {/* Tab bar */}
      {showTabs && (
        <SafeAreaView style={styles.tabBarSafe}>
          <View style={[styles.tabBar, SHADOW.lg]}>
            {TABS.map((tab) => {
              const active = screen === tab.key;
              const badge = getBadge(tab.key);
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => setScreen(tab.key)}
                  activeOpacity={0.7}
                >
                  {/* Active indicator */}
                  {active && <View style={styles.activeIndicator} />}

                  {/* Icon with badge */}
                  <View style={styles.iconWrap}>
                    <Text style={[styles.tabIcon, active && styles.tabIconActive]}>
                      {tab.icon}
                    </Text>
                    {badge > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {badge > 9 ? '9+' : badge}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1 },
  toastStack: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  tabBarSafe: {
    backgroundColor: COLORS.tabBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.tabBg,
    paddingVertical: Platform.OS === 'ios' ? 2 : 6,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -1,
    width: 28,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  iconWrap: { position: 'relative', marginBottom: 2 },
  tabIcon: { fontSize: 22, opacity: 0.4 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: COLORS.tabInactive, fontWeight: '500' },
  tabLabelActive: { color: COLORS.tabActive, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});

"@
[System.IO.File]::WriteAllText("$root\src\shell\AppShell.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ src/shell/AppShell.tsx"

# --- supabase/schema.sql ---
$content = @"
-- ============================================================
-- Atelier Logistique — Supabase Schema v1.0
-- Multi-tenant SaaS with RLS isolation
-- ============================================================

-- Enable UUID extension
create extension if not exists `"pgcrypto`";

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Mirror of auth.users with public fields
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz default now()
);

-- Sync profiles on user creation
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as `$`$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
`$`$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
create policy `"Users see own profile`"
  on public.profiles for select using (auth.uid() = id);
create policy `"Users update own profile`"
  on public.profiles for update using (auth.uid() = id);

-- ─── Organizations ────────────────────────────────────────────────────────────

create table if not exists public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text not null unique,
  billing_status         text not null default 'trialing'
                           check (billing_status in ('active','trialing','past_due','canceled','none')),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  trial_ends_at          timestamptz default (now() + interval '14 days'),
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

alter table public.organizations enable row level security;

-- Members can read their organization
create policy `"Members read org`"
  on public.organizations for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = id and m.user_id = auth.uid()
    )
  );

-- Only owners/admins can update
create policy `"Owners update org`"
  on public.organizations for update
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

-- Users can create organizations
create policy `"Users create org`"
  on public.organizations for insert with check (true);

-- ─── Memberships ─────────────────────────────────────────────────────────────

create table if not exists public.memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'member'
                    check (role in ('owner','admin','member')),
  created_at      timestamptz default now(),
  unique (organization_id, user_id)
);

alter table public.memberships enable row level security;

create policy `"Members read memberships`"
  on public.memberships for select
  using (
    exists (
      select 1 from public.memberships m2
      where m2.organization_id = organization_id and m2.user_id = auth.uid()
    )
  );

create policy `"Users insert own membership`"
  on public.memberships for insert with check (user_id = auth.uid());

create policy `"Owners manage memberships`"
  on public.memberships for all
  using (
    exists (
      select 1 from public.memberships m2
      where m2.organization_id = organization_id
        and m2.user_id = auth.uid()
        and m2.role in ('owner','admin')
    )
  );

-- ─── Invitations ─────────────────────────────────────────────────────────────

create table if not exists public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null,
  role            text not null default 'member'
                    check (role in ('admin','member')),
  status          text not null default 'pending'
                    check (status in ('pending','accepted','expired')),
  token           text not null default encode(gen_random_bytes(32), 'hex') unique,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  created_at      timestamptz default now()
);

alter table public.invitations enable row level security;

create policy `"Admins manage invitations`"
  on public.invitations for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

-- Anyone can read invitation by token (for accept flow)
create policy `"Anyone read by token`"
  on public.invitations for select
  using (true);

-- ─── Tasks ───────────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  description     text,
  status          text not null default 'todo'
                    check (status in ('todo','in_progress','done')),
  priority        text not null default 'medium'
                    check (priority in ('low','medium','high')),
  due_date        timestamptz,
  assigned_to     uuid references auth.users(id) on delete set null,
  archived_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index on public.tasks (organization_id, archived_at, status);
create index on public.tasks (organization_id, due_date);

alter table public.tasks enable row level security;

create policy `"Members read tasks`"
  on public.tasks for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy `"Members write tasks`"
  on public.tasks for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as `$`$
begin
  new.updated_at = now();
  return new;
end;
`$`$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ─── Documents ───────────────────────────────────────────────────────────────

create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  category        text not null default 'other'
                    check (category in ('invoice','receipt','part','manual','delivery','other')),
  photo_url       text,
  photo_path      text,
  notes           text,
  archived_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index on public.documents (organization_id, archived_at, category);

alter table public.documents enable row level security;

create policy `"Members read documents`"
  on public.documents for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy `"Members write documents`"
  on public.documents for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ─── Parts ───────────────────────────────────────────────────────────────────

create table if not exists public.parts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  reference       text,
  quantity        integer not null default 0 check (quantity >= 0),
  alert_threshold integer not null default 2 check (alert_threshold >= 0),
  unit            text,
  location        text,
  archived_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index on public.parts (organization_id, archived_at);

alter table public.parts enable row level security;

create policy `"Members read parts`"
  on public.parts for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy `"Members write parts`"
  on public.parts for all
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create trigger parts_updated_at
  before update on public.parts
  for each row execute function public.set_updated_at();

-- ─── Stock Movements (append-only) ───────────────────────────────────────────

create table if not exists public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  part_id         uuid not null references public.parts(id) on delete cascade,
  type            text not null check (type in ('in','out','adjustment')),
  quantity        integer not null check (quantity > 0),
  reason          text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz default now()
  -- No updated_at: append-only log
);

create index on public.stock_movements (organization_id, part_id, created_at desc);

alter table public.stock_movements enable row level security;

create policy `"Members read movements`"
  on public.stock_movements for select
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

create policy `"Members insert movements`"
  on public.stock_movements for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.organization_id = organization_id and m.user_id = auth.uid()
    )
  );

-- No UPDATE/DELETE on movements — append-only

-- ─── Storage Bucket ──────────────────────────────────────────────────────────
-- Run this in Supabase Dashboard > Storage > New bucket
-- Name: documents, Public: true (or false + signed URLs)

-- Storage policies (add in Dashboard > Storage > Policies)
-- INSERT: auth.role() = 'authenticated'
-- SELECT: true (public) or auth.role() = 'authenticated'

-- ─── Useful views ────────────────────────────────────────────────────────────

-- Tasks with assignee info
create or replace view public.tasks_with_assignee as
  select t.*, p.email as assignee_email, p.full_name as assignee_name
  from public.tasks t
  left join public.profiles p on p.id = t.assigned_to
  where t.archived_at is null;

-- Stock alert view
create or replace view public.stock_alerts as
  select p.*, o.name as organization_name
  from public.parts p
  join public.organizations o on o.id = p.organization_id
  where p.archived_at is null
    and p.quantity <= p.alert_threshold;

-- ─── Seed test data (optional — comment out in production) ───────────────────
-- INSERT INTO organizations (name, slug) VALUES ('Test Garage', 'test-garage');

"@
[System.IO.File]::WriteAllText("$root\supabase\schema.sql", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ supabase/schema.sql"

# --- supabase/functions/stripe-checkout/index.ts ---
$content = @"
// supabase/functions/stripe-checkout/index.ts
// Deploy: supabase functions deploy stripe-checkout

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id requis' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organization_id)
      .single();

    if (orgErr || !org) {
      return new Response(JSON.stringify({ error: 'Organisation introuvable' }), {
        status: 404,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    let customerId = org.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organization_id, supabase_org_id: organization_id },
      });
      customerId = customer.id;

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organization_id);
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'https://atelierlogistique.fr';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: Deno.env.get('STRIPE_PRICE_ID') ?? '',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: ```${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}``,
      cancel_url: ```${appUrl}/subscription/cancel``,
      subscription_data: {
        metadata: { organization_id },
        trial_period_days: 0,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stripe-checkout]', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

"@
[System.IO.File]::WriteAllText("$root\supabase\functions\stripe-checkout\index.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ supabase/functions/stripe-checkout/index.ts"

# --- supabase/functions/stripe-portal/index.ts ---
$content = @"
// supabase/functions/stripe-portal/index.ts
// Deploy: supabase functions deploy stripe-portal

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { organization_id } = await req.json();

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, name')
      .eq('id', organization_id)
      .single();

    if (!org?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'Aucun abonnement trouvé' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'https://atelierlogistique.fr';

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: ```${appUrl}/organization``,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stripe-portal]', err);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

"@
[System.IO.File]::WriteAllText("$root\supabase\functions\stripe-portal\index.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ supabase/functions/stripe-portal/index.ts"

# --- supabase/functions/stripe-webhook/index.ts ---
$content = @"
// supabase/functions/stripe-webhook/index.ts
// Deploy: supabase functions deploy stripe-webhook
// Register webhook in Stripe Dashboard pointing to:
// https://<project>.supabase.co/functions/v1/stripe-webhook
//
// Events to listen: checkout.session.completed, customer.subscription.updated,
//                   customer.subscription.deleted, invoice.payment_failed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

async function updateOrgBilling(
  customerId: string,
  updates: {
    billing_status?: string;
    stripe_subscription_id?: string;
  },
) {
  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('stripe_customer_id', customerId);

  if (error) console.error('[webhook] updateOrgBilling error', error);
}

serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature invalid', err);
    return new Response('Webhook signature invalid', { status: 400 });
  }

  console.log('[webhook]', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.customer && session.subscription) {
          await updateOrgBilling(session.customer as string, {
            billing_status: 'active',
            stripe_subscription_id: session.subscription as string,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const statusMap: Record<string, string> = {
          active: 'active',
          trialing: 'trialing',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid: 'past_due',
          incomplete: 'past_due',
          incomplete_expired: 'canceled',
          paused: 'canceled',
        };
        await updateOrgBilling(sub.customer as string, {
          billing_status: statusMap[sub.status] ?? 'none',
          stripe_subscription_id: sub.id,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await updateOrgBilling(sub.customer as string, {
          billing_status: 'canceled',
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await updateOrgBilling(invoice.customer as string, {
            billing_status: 'past_due',
          });
        }
        break;
      }

      default:
        // Unhandled event — ignore
        break;
    }
  } catch (err) {
    console.error('[webhook] handler error', err);
    return new Response('Internal error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

"@
[System.IO.File]::WriteAllText("$root\supabase\functions\stripe-webhook\index.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ supabase/functions/stripe-webhook/index.ts"

# --- tests/app.test.ts ---
$content = @"
import { describe, it, expect } from 'vitest';
import type { Task, Part, StockMovement, TaskPriority, TaskStatus, MovementType } from '../src/types';

// ─── Helpers (mirror of production logic) ────────────────────────────────────

function filterTasks(tasks: Task[], status?: TaskStatus, search?: string): Task[] {
  let list = tasks;
  if (status) list = list.filter((t) => t.status === status);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
    );
  }
  return list;
}

function sortTasksByPriority(tasks: Task[]): Task[] {
  const order: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
}

function isOverdue(task: Task): boolean {
  return (
    !!task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done'
  );
}

function applyMovement(part: Part, type: MovementType, quantity: number): number {
  if (type === 'in') return part.quantity + quantity;
  if (type === 'out') return Math.max(0, part.quantity - quantity);
  return quantity; // adjustment
}

function isStockAlert(part: Part): boolean {
  return part.quantity <= part.alert_threshold;
}

function hasRole(
  memberships: { user_id: string; role: string }[],
  userId: string,
  allowed: string[],
): boolean {
  const m = memberships.find((m) => m.user_id === userId);
  return !!m && allowed.includes(m.role);
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();
const PAST = new Date(Date.now() - 86400000).toISOString();
const FUTURE = new Date(Date.now() + 86400000).toISOString();

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    organization_id: 'org-1',
    title: 'Révision Clio',
    description: 'Vidange et filtres',
    status: 'todo',
    priority: 'high',
    due_date: FUTURE,
    archived_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: '2',
    organization_id: 'org-1',
    title: 'Plaquettes BMW',
    status: 'in_progress',
    priority: 'medium',
    due_date: PAST,
    archived_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: '3',
    organization_id: 'org-1',
    title: 'Vidange Toyota',
    status: 'done',
    priority: 'low',
    archived_at: null,
    created_at: NOW,
    updated_at: NOW,
  },
];

const MOCK_PART: Part = {
  id: 'p-1',
  organization_id: 'org-1',
  name: 'Filtre huile Mann',
  reference: 'W712',
  quantity: 5,
  alert_threshold: 3,
  unit: 'pièce',
  archived_at: null,
  created_at: NOW,
  updated_at: NOW,
};

// ─── Task tests ───────────────────────────────────────────────────────────────

describe('Task filtering', () => {
  it('returns all tasks when no filter', () => {
    expect(filterTasks(MOCK_TASKS)).toHaveLength(3);
  });

  it('filters by status todo', () => {
    const result = filterTasks(MOCK_TASKS, 'todo');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by status done', () => {
    const result = filterTasks(MOCK_TASKS, 'done');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('done');
  });

  it('filters by search string (title)', () => {
    const result = filterTasks(MOCK_TASKS, undefined, 'clio');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by search string (description)', () => {
    const result = filterTasks(MOCK_TASKS, undefined, 'vidange');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty array when no match', () => {
    expect(filterTasks(MOCK_TASKS, undefined, 'zzznomatch')).toHaveLength(0);
  });

  it('combines status and search filters', () => {
    const result = filterTasks(MOCK_TASKS, 'in_progress', 'bmw');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});

describe('Task priority sorting', () => {
  it('sorts high before medium before low', () => {
    const sorted = sortTasksByPriority(MOCK_TASKS);
    expect(sorted[0].priority).toBe('high');
    expect(sorted[1].priority).toBe('medium');
    expect(sorted[2].priority).toBe('low');
  });
});

describe('Task overdue detection', () => {
  it('detects overdue tasks (past due, not done)', () => {
    expect(isOverdue(MOCK_TASKS[1])).toBe(true); // BMW, in_progress, past due
  });

  it('non-overdue: future due date', () => {
    expect(isOverdue(MOCK_TASKS[0])).toBe(false);
  });

  it('non-overdue: done status even if past due', () => {
    const done: Task = {
      ...MOCK_TASKS[1],
      status: 'done',
    };
    expect(isOverdue(done)).toBe(false);
  });

  it('non-overdue: no due date', () => {
    expect(isOverdue(MOCK_TASKS[2])).toBe(false);
  });
});

// ─── Stock tests ──────────────────────────────────────────────────────────────

describe('Stock movements', () => {
  it('entry increases quantity', () => {
    expect(applyMovement(MOCK_PART, 'in', 3)).toBe(8);
  });

  it('exit decreases quantity', () => {
    expect(applyMovement(MOCK_PART, 'out', 2)).toBe(3);
  });

  it('exit cannot go below zero', () => {
    expect(applyMovement(MOCK_PART, 'out', 100)).toBe(0);
  });

  it('adjustment sets absolute value', () => {
    expect(applyMovement(MOCK_PART, 'adjustment', 10)).toBe(10);
  });

  it('adjustment to zero', () => {
    expect(applyMovement(MOCK_PART, 'adjustment', 0)).toBe(0);
  });
});

describe('Stock alerts', () => {
  it('triggers alert when quantity equals threshold', () => {
    const part = { ...MOCK_PART, quantity: 3 }; // equals threshold
    expect(isStockAlert(part)).toBe(true);
  });

  it('triggers alert when quantity below threshold', () => {
    const part = { ...MOCK_PART, quantity: 1 };
    expect(isStockAlert(part)).toBe(true);
  });

  it('no alert when quantity above threshold', () => {
    const part = { ...MOCK_PART, quantity: 10 };
    expect(isStockAlert(part)).toBe(false);
  });

  it('alert when out of stock', () => {
    const part = { ...MOCK_PART, quantity: 0 };
    expect(isStockAlert(part)).toBe(true);
  });
});

// ─── Organization / role tests ────────────────────────────────────────────────

describe('Organization roles', () => {
  const memberships = [
    { user_id: 'u-owner', role: 'owner' },
    { user_id: 'u-admin', role: 'admin' },
    { user_id: 'u-member', role: 'member' },
  ];

  it('owner has owner access', () => {
    expect(hasRole(memberships, 'u-owner', ['owner'])).toBe(true);
  });

  it('admin has owner+admin access', () => {
    expect(hasRole(memberships, 'u-admin', ['owner', 'admin'])).toBe(true);
  });

  it('member does not have owner+admin access', () => {
    expect(hasRole(memberships, 'u-member', ['owner', 'admin'])).toBe(false);
  });

  it('unknown user has no access', () => {
    expect(hasRole(memberships, 'u-unknown', ['owner'])).toBe(false);
  });

  it('all members have member-level access', () => {
    for (const m of memberships) {
      expect(hasRole(memberships, m.user_id, ['owner', 'admin', 'member'])).toBe(true);
    }
  });
});

// ─── Date helpers ─────────────────────────────────────────────────────────────

describe('Date formatting', () => {
  it('formats ISO date to French locale', () => {
    const formatted = new Date('2024-12-25').toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
    expect(formatted).toMatch(/25/);
    expect(formatted.toLowerCase()).toMatch(/déc/);
  });

  it('detects past dates correctly', () => {
    const past = new Date(Date.now() - 10000).toISOString();
    expect(new Date(past) < new Date()).toBe(true);
  });

  it('detects future dates correctly', () => {
    const future = new Date(Date.now() + 10000).toISOString();
    expect(new Date(future) > new Date()).toBe(true);
  });
});

"@
[System.IO.File]::WriteAllText("$root\tests\app.test.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ tests/app.test.ts"

# --- tests/extra.test.ts ---
$content = @"
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Organization, BillingStatus, Task, Part } from '../src/types';

// ─── Billing status helpers ────────────────────────────────────────────────────

function isBillingActive(status: BillingStatus): boolean {
  return status === 'active' || status === 'trialing';
}

function isBillingBlocked(status: BillingStatus): boolean {
  return status === 'canceled' || status === 'past_due';
}

function billingLabel(status: BillingStatus): string {
  const map: Record<BillingStatus, string> = {
    active: 'Actif',
    trialing: 'Essai gratuit',
    past_due: 'Paiement en retard',
    canceled: 'Annulé',
    none: 'Aucun abonnement',
  };
  return map[status];
}

// ─── Invitation helpers ────────────────────────────────────────────────────────

function isInvitationExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+`$/.test(email);
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheStale(fetchedAt: string): boolean {
  return Date.now() - new Date(fetchedAt).getTime() > CACHE_TTL_MS;
}

function buildCacheKey(orgId: string): string {
  return ``al_cache_v1:`${orgId}``;
}

// ─── Demo data helpers ────────────────────────────────────────────────────────

function isUrgentTask(task: Task): boolean {
  return task.priority === 'high' && task.status !== 'done';
}

function getAlertParts(parts: Part[]): Part[] {
  return parts.filter((p) => p.quantity <= p.alert_threshold && !p.archived_at);
}

function getOutOfStockParts(parts: Part[]): Part[] {
  return parts.filter((p) => p.quantity === 0 && !p.archived_at);
}

// ─── Slug generation ─────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-`$/g, '');
}

// ─── Tests: Billing ────────────────────────────────────────────────────────────

describe('Billing status', () => {
  it('active is billing active', () => {
    expect(isBillingActive('active')).toBe(true);
  });

  it('trialing is billing active', () => {
    expect(isBillingActive('trialing')).toBe(true);
  });

  it('past_due is billing blocked', () => {
    expect(isBillingBlocked('past_due')).toBe(true);
  });

  it('canceled is billing blocked', () => {
    expect(isBillingBlocked('canceled')).toBe(true);
  });

  it('none is NOT billing active', () => {
    expect(isBillingActive('none')).toBe(false);
  });

  it('none is NOT billing blocked (trialing period)', () => {
    expect(isBillingBlocked('none')).toBe(false);
  });

  it('returns correct label for each status', () => {
    expect(billingLabel('active')).toBe('Actif');
    expect(billingLabel('trialing')).toBe('Essai gratuit');
    expect(billingLabel('past_due')).toBe('Paiement en retard');
    expect(billingLabel('canceled')).toBe('Annulé');
    expect(billingLabel('none')).toBe('Aucun abonnement');
  });
});

// ─── Tests: Invitations ────────────────────────────────────────────────────────

describe('Invitation validation', () => {
  it('detects expired invitation', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isInvitationExpired(past)).toBe(true);
  });

  it('detects valid (non-expired) invitation', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isInvitationExpired(future)).toBe(false);
  });

  it('validates correct email formats', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user+tag@sub.domain.fr')).toBe(true);
    expect(isValidEmail('contact@atelier.fr')).toBe(true);
  });

  it('rejects invalid email formats', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('has spaces@domain.com')).toBe(false);
  });
});

// ─── Tests: Cache ─────────────────────────────────────────────────────────────

describe('Local cache TTL', () => {
  it('fresh cache is NOT stale', () => {
    const now = new Date().toISOString();
    expect(isCacheStale(now)).toBe(false);
  });

  it('4-minute-old cache is NOT stale', () => {
    const recent = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    expect(isCacheStale(recent)).toBe(false);
  });

  it('6-minute-old cache IS stale', () => {
    const old = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    expect(isCacheStale(old)).toBe(true);
  });

  it('builds correct cache key', () => {
    expect(buildCacheKey('org-abc')).toBe('al_cache_v1:org-abc');
    expect(buildCacheKey('demo-org-001')).toBe('al_cache_v1:demo-org-001');
  });

  it('different orgs have different cache keys', () => {
    const k1 = buildCacheKey('org-1');
    const k2 = buildCacheKey('org-2');
    expect(k1).not.toBe(k2);
  });
});

// ─── Tests: Dashboard stats ───────────────────────────────────────────────────

const NOW = new Date().toISOString();

const PARTS: Part[] = [
  {
    id: 'p1', organization_id: 'o1', name: 'Filtre', quantity: 5,
    alert_threshold: 3, archived_at: null, created_at: NOW, updated_at: NOW,
  },
  {
    id: 'p2', organization_id: 'o1', name: 'Plaquettes', quantity: 1,
    alert_threshold: 2, archived_at: null, created_at: NOW, updated_at: NOW,
  },
  {
    id: 'p3', organization_id: 'o1', name: 'Huile', quantity: 0,
    alert_threshold: 1, archived_at: null, created_at: NOW, updated_at: NOW,
  },
  {
    id: 'p4', organization_id: 'o1', name: 'Archived', quantity: 0,
    alert_threshold: 1, archived_at: NOW, created_at: NOW, updated_at: NOW,
  },
];

const TASKS: Task[] = [
  {
    id: 't1', organization_id: 'o1', title: 'Urgent', status: 'todo',
    priority: 'high', archived_at: null, created_at: NOW, updated_at: NOW,
  },
  {
    id: 't2', organization_id: 'o1', title: 'Done urgent', status: 'done',
    priority: 'high', archived_at: null, created_at: NOW, updated_at: NOW,
  },
  {
    id: 't3', organization_id: 'o1', title: 'Normal', status: 'in_progress',
    priority: 'medium', archived_at: null, created_at: NOW, updated_at: NOW,
  },
];

describe('Dashboard stats', () => {
  it('counts alert parts correctly (excludes archived)', () => {
    expect(getAlertParts(PARTS)).toHaveLength(2); // p2 (qty1≤threshold2) + p3 (qty0≤threshold1), not p4 (archived)
  });

  it('counts out-of-stock parts (excludes archived)', () => {
    expect(getOutOfStockParts(PARTS)).toHaveLength(1); // only p3, p4 is archived
  });

  it('identifies urgent (high priority, not done) tasks', () => {
    const urgent = TASKS.filter(isUrgentTask);
    expect(urgent).toHaveLength(1); // t1 only, t2 is done
  });

  it('non-urgent: medium priority is not urgent', () => {
    expect(isUrgentTask(TASKS[2])).toBe(false);
  });
});

// ─── Tests: Slug generation ───────────────────────────────────────────────────

describe('Organization slug generation', () => {
  it('converts to lowercase', () => {
    expect(generateSlug('GARAGE')).toBe('garage');
  });

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('Garage Dupont')).toBe('garage-dupont');
  });

  it('removes French accents', () => {
    expect(generateSlug('Atelier Mécanique')).toBe('atelier-mecanique');
    expect(generateSlug('Réparation Générale')).toBe('reparation-generale');
  });

  it('handles special characters', () => {
    expect(generateSlug('Dupont & Fils')).toBe('dupont-fils');
  });

  it('removes leading/trailing hyphens', () => {
    expect(generateSlug('  Garage  ')).toBe('garage');
  });

  it('collapses multiple separators', () => {
    expect(generateSlug('Garage -- Dupont')).toBe('garage-dupont');
  });

  it('handles numbers', () => {
    expect(generateSlug('Garage 123')).toBe('garage-123');
  });
});

"@
[System.IO.File]::WriteAllText("$root\tests\extra.test.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ tests/extra.test.ts"

# --- vitest.config.ts ---
$content = @"
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'threads',
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/lib/demoData.ts'],
    },
  },
});

"@
[System.IO.File]::WriteAllText("$root\vitest.config.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ vitest.config.ts"

# --- .env.example ---
$content = @"
# ─── Supabase ─────────────────────────────────────────────────────────────────
# Copie ce fichier en .env et renseigne tes valeurs.
# Sans Supabase configuré, l'app fonctionne en mode démo local.

EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── Stripe (côté Edge Functions uniquement — jamais exposé côté client) ───────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── Sentry (optionnel — crash reporting) ─────────────────────────────────────
EXPO_PUBLIC_SENTRY_DSN=https://xxx@oxxxx.ingest.sentry.io/xxxxx

# ─── App URL (utilisée par les Edge Functions pour les redirections Stripe) ────
APP_URL=https://atelierlogistique.fr

"@
[System.IO.File]::WriteAllText("$root\.env.example", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ .env.example"

# --- App.tsx ---
$content = @"
import { AppShell } from './src/shell/AppShell';
import { AppProvider } from './src/context/AppContext';

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

"@
[System.IO.File]::WriteAllText("$root\App.tsx", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ App.tsx"

# --- index.ts ---
$content = @"
import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

"@
[System.IO.File]::WriteAllText("$root\index.ts", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ index.ts"

# --- package.json ---
$content = @"
{
  `"name`": `"atelier-logistique-mobile`",
  `"version`": `"1.0.0`",
  `"main`": `"index.ts`",
  `"scripts`": {
    `"start`": `"expo start`",
    `"android`": `"expo start --android`",
    `"ios`": `"expo start --ios`",
    `"web`": `"expo start --web`",
    `"build:web`": `"npx expo export --platform web --output-dir dist-web --max-workers 1`",
    `"preview:web`": `"python -m http.server 4173 -d dist-web`",
    `"typecheck`": `"tsc --noEmit`",
    `"test`": `"vitest run --environment node --pool threads tests`",
    `"test:watch`": `"vitest --environment node --pool threads tests`",
    `"eas:init`": `"npx eas-cli init`",
    `"build:android:preview`": `"npx eas-cli build --platform android --profile preview`",
    `"build:android:production`": `"npx eas-cli build --platform android --profile production`",
    `"build:ios:preview`": `"npx eas-cli build --platform ios --profile preview`",
    `"build:ios:production`": `"npx eas-cli build --platform ios --profile production`",
    `"deploy:functions`": `"supabase functions deploy stripe-checkout && supabase functions deploy stripe-portal && supabase functions deploy stripe-webhook`"
  },
  `"dependencies`": {
    `"@expo/metro-runtime`": `"~6.1.2`",
    `"@react-native-async-storage/async-storage`": `"2.2.0`",
    `"@supabase/supabase-js`": `"^2.104.0`",
    `"expo`": `"~54.0.33`",
    `"expo-image-picker`": `"~17.0.10`",
    `"expo-linear-gradient`": `"~15.0.8`",
    `"expo-status-bar`": `"~3.0.9`",
    `"react`": `"19.1.0`",
    `"react-dom`": `"19.1.0`",
    `"react-native`": `"0.81.5`",
    `"react-native-url-polyfill`": `"^3.0.0`",
    `"react-native-web`": `"^0.21.0`"
  },
  `"devDependencies`": {
    `"@types/node`": `"^25.6.0`",
    `"@types/react`": `"~19.1.0`",
    `"typescript`": `"~5.9.2`",
    `"vitest`": `"^4.1.5`"
  },
  `"private`": true
}

"@
[System.IO.File]::WriteAllText("$root\package.json", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ package.json"

# --- tsconfig.json ---
$content = @"
{
  `"extends`": `"expo/tsconfig.base`",
  `"compilerOptions`": {
    `"strict`": true,
    `"baseUrl`": `".`",
    `"paths`": {
      `"@/*`": [`"src/*`"]
    }
  },
  `"include`": [
    `"**/*.ts`",
    `"**/*.tsx`",
    `".expo/types/**/*.d.ts`",
    `"expo-env.d.ts`"
  ],
  `"exclude`": [
    `"node_modules`",
    `"dist`",
    `"dist-web`",
    `"supabase/functions`"
  ]
}

"@
[System.IO.File]::WriteAllText("$root\tsconfig.json", $content, [System.Text.Encoding]::UTF8)
Write-Host "  ✓ tsconfig.json"

Write-Host ""
Write-Host "=== Migration terminée ===" -ForegroundColor Green
Write-Host "36 fichiers créés/mis à jour"
Write-Host ""
Write-Host "Prochaines étapes :" -ForegroundColor Yellow
Write-Host "  1. npm install"
Write-Host "  2. npm run typecheck"
Write-Host "  3. npm run test"
Write-Host "  4. npm run start"
Write-Host ""