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
  | 'home'
  | 'tasks'
  | 'calendar'
  | 'stock'
  | 'stats'
  | 'documents'
  | 'organization'
  | 'subscription'
  | 'onboarding'
  | 'enterprise'
  | 'apikeys';


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
