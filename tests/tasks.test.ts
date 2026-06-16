import { describe, expect, it } from 'vitest';

import type { Task } from '../src/types/models';
import { countOverdueTasks, isTaskInWindow } from '../src/utils/tasks';

const now = new Date('2026-04-21T10:00:00.000Z');

function buildTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-test',
    title: 'Test',
    description: '',
    dueDate: '2026-04-22T10:00:00.000Z',
    frequency: 'ponctuelle',
    priority: 'moyenne',
    status: 'a_faire',
    assignedTo: 'usr-test',
    createdAt: '2026-04-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('task window helpers', () => {
  it('keeps a weekly task visible when due in less than 7 days', () => {
    const task = buildTask({ dueDate: '2026-04-24T10:00:00.000Z' });
    expect(isTaskInWindow(task, 'semaine', now)).toBe(true);
  });

  it('keeps overdue unfinished tasks visible for follow-up', () => {
    const task = buildTask({ dueDate: '2026-04-18T10:00:00.000Z', status: 'en_cours' });
    expect(isTaskInWindow(task, 'semaine', now)).toBe(true);
  });

  it('counts only unfinished overdue tasks', () => {
    const tasks = [
      buildTask({ dueDate: '2026-04-18T10:00:00.000Z', status: 'a_faire' }),
      buildTask({ id: '2', dueDate: '2026-04-19T10:00:00.000Z', status: 'en_cours' }),
      buildTask({ id: '3', dueDate: '2026-04-19T10:00:00.000Z', status: 'terminee' }),
    ];

    expect(countOverdueTasks(tasks, now)).toBe(2);
  });
});
