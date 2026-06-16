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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheStale(fetchedAt: string): boolean {
  return Date.now() - new Date(fetchedAt).getTime() > CACHE_TTL_MS;
}

function buildCacheKey(orgId: string): string {
  return `al_cache_v1:${orgId}`;
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
    .replace(/^-|-$/g, '');
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
