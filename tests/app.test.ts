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
    title: 'Revision Toyota',
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
